"""Full-sized book passage acceptance test for the installed SPR LuxTTS engine.

Import actual canonical EPUBs through the same Archive code as the desktop UI.
Select source-authentic 280-420 character passage(s), synthesize through the
Sphinx voice, and require independent English first-word verification. Any
failure persists diagnostics, not a falsely "successful" narration file.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import time

from spr_core import Archive
from spr_luxtts_worker import LuxEngine

CASES = (
    ("bdo-long-passage", "bdo-current.epub"),
    ("nowhere-long-passage", "nowhere-s1.epub"),
)


def run(input_dir: Path, output_dir: Path, reference: Path, cpu: bool = False) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory(prefix="spr-canonical-passages-") as workspace:
        archive = Archive(Path(workspace))
        engine = LuxEngine(prefer_cpu=cpu)
        for case_id, filename in CASES:
            source = input_dir / filename
            if not source.is_file():
                raise FileNotFoundError("Missing canonical EPUB: " + str(source))
            book = archive.import_document(filename, source.read_bytes())
            # Choose a full-sized passage, not a sentence cherry-picked for success.
            candidates = [chunk for chunk in book["chunks"]
                          if 280 <= len(chunk["text"]) <= 420
                          and not chunk["text"].lstrip().startswith("#")]
            if not candidates:
                raise ValueError("No full-sized source passage in " + filename)
            selected = candidates[0]
            target = output_dir / (case_id + ".wav")
            start = time.monotonic()
            try:
                info = engine.synthesize(selected["text"], reference, target)
                qa = info.get("qa") or {}
                if not qa.get("first_words_preserved") or qa.get("match", 0) < .76:
                    raise AssertionError("Neural passage failed independent text verification")
                if qa.get("boundary", {}).get("first_word_pre_roll_ms", 0) < 60:
                    raise AssertionError("Neural first-word onset was not preserved")
                record = {"id": case_id, "book": filename, "book_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                          "chunk_index": selected["index"], "source_chars": len(selected["text"]),
                          "source_text": selected["text"], "audio": target.name,
                          "elapsed_seconds": round(time.monotonic() - start, 2),
                          "audio_sha256": info["audio_sha256"], "qa": qa, "status": "passed"}
                results.append(record)
                print(case_id, "passed", len(selected["text"]), "characters", flush=True)
            except Exception as error:
                results.append({"id": case_id, "book": filename, "source_text": selected["text"],
                                "source_chars": len(selected["text"]), "status": "failed",
                                "error": str(error)})
                (output_dir / "long-passage-report.json").write_text(
                    json.dumps({"status": "failed", "cases": results}, indent=2,
                               ensure_ascii=False), encoding="utf-8")
                raise
    report = {"status": "passed", "cases": results, "subjective_voice_approval": "pending"}
    (output_dir / "long-passage-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--epub-dir", type=Path, required=True)
    p.add_argument("--reference", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--cpu", action="store_true")
    args = p.parse_args()
    result = run(args.epub_dir, args.output, args.reference, args.cpu)
    print(json.dumps({"status": result["status"],
                      "verified_cases": len(result["cases"])}, indent=2))


if __name__ == "__main__":
    main()
