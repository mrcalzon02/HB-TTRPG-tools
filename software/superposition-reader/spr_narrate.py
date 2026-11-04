"""Headless resumable offline narration for imported SPR books.

Uses the same private audio cache as the desktop reader. No cloud speech calls.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from spr_core import Archive, WindowsSapiEngine
from spr_luxtts_engine import SprLuxEngine
from spr_local_voices import LocalVoiceEngine
from spr_voices import VoiceLibrary


def chapter_plan(archive: Archive, book_id: str, first: int = 1,
                 last: int | None = None) -> dict:
    record = archive.load(book_id)
    chapters = record.get("chapters") or [{
        "title": "Complete document", "start": 0,
        "end": len(record["chunks"])}]
    last = len(chapters) if last is None else last
    if not 1 <= first <= last <= len(chapters):
        raise ValueError(f"Chapter selection must be within 1..{len(chapters)}")
    cursor = 0
    for chapter in chapters:
        if chapter["start"] != cursor or chapter["end"] <= cursor:
            raise ValueError("Invalid chapter offsets in imported book")
        cursor = chapter["end"]
    if cursor != len(record["chunks"]):
        raise ValueError("Chapter map omits narration segments")
    return {"book_id": book_id, "title": record["title"],
            "chapter_from": first, "chapter_through": last,
            "chapter_total": len(chapters),
            "chunk_from": chapters[first - 1]["start"],
            "chunk_through": chapters[last - 1]["end"],
            "total_chunks": len(record["chunks"])}


def render_selection(archive: Archive, book_id: str, engine,
                     voice: str = "", rate: int = 0, first: int = 1,
                     last: int | None = None, announce=None) -> dict:
    plan = chapter_plan(archive, book_id, first, last)
    generated = reused = 0
    total = plan["chunk_through"] - plan["chunk_from"]
    for offset, index in enumerate(range(plan["chunk_from"], plan["chunk_through"]), 1):
        created = archive.generate_chunk(book_id, index, engine, voice=voice, rate=rate)
        generated += bool(created)
        reused += not created
        if announce:
            announce({"event": "chunk_done", "chunk": index + 1,
                      "selected_done": offset, "selected_total": total,
                      "generated": generated, "reused": reused})
    record = archive.load(book_id)
    complete = all(
        record["audio"].get(str(index), {}).get("key") ==
        archive.cache_key(chunk["text"], engine.engine_id, voice, rate)
        for index, chunk in enumerate(record["chunks"]))
    return {"status": "selected_chunks_complete", "book_id": book_id,
            "chapter_from": plan["chapter_from"],
            "chapter_through": plan["chapter_through"],
            "generated": generated, "reused": reused,
            "selected_chunks": total,
            "whole_book_ready_for_selected_voice": complete}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SPR resumable offline audiobook worker")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--list", action="store_true", help="List imported books and voice profiles")
    action.add_argument("--book-id", help="Previously imported book ID")
    action.add_argument("--import-file", type=Path, help="Import a local EPUB/TXT/PDF/DOCX/MD")
    parser.add_argument("--data-dir", type=Path, help="Private SPR archive folder")
    parser.add_argument("--engine", choices=("spr-lux", "sapi", "kokoro", "piper"), default="spr-lux")
    parser.add_argument("--voice-id", default="", help="Existing authorized voice profile ID")
    parser.add_argument("--rate", type=int, default=0, help="Windows SAPI speech rate")
    parser.add_argument("--chapter-from", type=int, default=1)
    parser.add_argument("--chapter-through", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--export-chapters", action="store_true")
    args = parser.parse_args(argv)
    archive = Archive(args.data_dir)
    if args.list:
        print(json.dumps({"books": archive.library(),
                          "voices": VoiceLibrary(archive.root / "voices").list(),
                          "local_voices": {family: LocalVoiceEngine(archive.root, family).profiles()
                                           for family in ("kokoro", "piper")}},
                         ensure_ascii=False, indent=2))
        return 0
    if args.import_file:
        source = args.import_file.expanduser()
        book_id = archive.import_document(source.name, source.read_bytes())["id"]
    else:
        book_id = args.book_id
    plan = chapter_plan(archive, book_id, args.chapter_from, args.chapter_through)
    if args.dry_run:
        print(json.dumps({"status": "planned_only", **plan}, ensure_ascii=False, indent=2))
        return 0
    if args.engine == "sapi":
        engine = WindowsSapiEngine()
        voice = args.voice_id
    elif args.engine in ("kokoro", "piper"):
        engine = LocalVoiceEngine(archive.root, args.engine)
        if not engine.available():
            raise RuntimeError("Install the offline " + args.engine + " engine and voices first")
        voice = args.voice_id or engine.profiles()[0]["id"]
        if voice not in {entry["id"] for entry in engine.profiles()}:
            raise ValueError("Selected local voice has not been installed")
        if args.rate:
            raise ValueError("Neural voice generation rate must be zero; adjust playback speed")
    else:
        engine = SprLuxEngine(archive.root)
        if not engine.available():
            raise RuntimeError("SPR neural runtime is not installed: run Setup-Sphinx-Neural-Voice.cmd")
        voice = args.voice_id or engine.default_voice()
        if not voice:
            raise RuntimeError("No authorized voice profile with samples is available")
        if args.rate:
            raise ValueError("Neural generation rate is fixed; use playback-speed control")
    try:
        summary = render_selection(archive, book_id, engine, voice=voice,
                                   rate=args.rate, first=args.chapter_from,
                                   last=args.chapter_through,
                                   announce=lambda event: print(json.dumps(event), flush=True))
        if args.export_chapters:
            summary["chapter_zip"] = str(archive.export_chapters_zip(book_id))
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    finally:
        close = getattr(engine, "close", None)
        if callable(close):
            close()


if __name__ == "__main__":
    raise SystemExit(main())
