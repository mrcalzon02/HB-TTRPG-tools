"""Load verified bundled story examples and an authorized default voice reference.

User-owned book library is never reset or overwritten on repeat launches.
This is an initial content import, not a neural voice model installation.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from spr_core import Archive
from spr_voices import VoiceLibrary

BUNDLED_DIR = "spr_examples"
VOICE_FILE = "sphinx-reference.ogg"
VOICE_NAME = "Sphinx — Personal Narrator"


def seed_examples(archive: Archive, package_root: Path) -> dict:
    folder = Path(package_root) / BUNDLED_DIR
    summary = {"books_imported": [], "voice_profile_id": None, "voice_samples": 0,
               "books_skipped": [], "warnings": []}
    manifest_file = folder / "manifest.json"
    if not manifest_file.is_file():
        return summary
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    for entry in manifest.get("books", []):
        filename = entry.get("file", "")
        if Path(filename).name != filename or not filename.endswith(".epub"):
            raise ValueError("Unsafe bundled story path")
        source = folder / filename
        if not source.is_file():
            summary["warnings"].append("Missing bundled EPUB: " + filename)
            continue
        data = source.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry.get("epub_sha256"):
            raise ValueError("Bundled EPUB checksum failure: " + filename)
        existing_id = hashlib.sha256(data).hexdigest()[:16]
        if (archive.folder(existing_id) / "manifest.json").is_file():
            summary["books_skipped"].append(entry.get("id"))
            continue
        imported = archive.import_document(entry["title"] + ".epub", data)
        summary["books_imported"].append({"id": imported["id"], "title": imported["title"]})

    audio = folder / VOICE_FILE
    if audio.is_file():
        voice_bytes = audio.read_bytes()
        if hashlib.sha256(voice_bytes).hexdigest() != manifest.get("voice_sha256"):
            raise ValueError("Bundled Sphinx recording checksum failure")
        voices = VoiceLibrary(archive.root / "voices")
        profile = next((v for v in voices.list()
                        if v["name"] == VOICE_NAME and v["style"] == "dramatic"), None)
        if profile is None:
            profile = voices.create(VOICE_NAME, "dramatic")
        result = voices.add_sample(profile["id"], VOICE_FILE, voice_bytes,
                                   manifest.get("voice_transcript", ""))
        summary["voice_profile_id"] = profile["id"]
        summary["voice_samples"] = len(voices.get(profile["id"])["samples"])
    return summary
