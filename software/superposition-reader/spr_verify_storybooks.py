"""End-to-end offline EPUB snapshot -> SPR reader archive acceptance test.

On Actions this reads the real canonical manuscript tree and verifies all four
assembled ebooks, import and narration cache behavior without fake prose.
Voice generation is separately verified using a synthetic WAV engine; neural
voice similarity requires a GPU/model test and cannot be inferred from this test.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import wave

from spr_core import Archive
from spr_epub import extract_epub
from spr_storybooks import NAMES, ROOT, build_all


class TestVoice:
    engine_id = "integration-synthetic-wav-1"

    def synthesize(self, text: str, path: Path, voice: str = "", rate: int = 0) -> None:
        with wave.open(str(path), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(16000)
            output.writeframes(b"\0\0" * 1600)


def verify(directory: Path, repo_root: Path = ROOT, snapshot: str = "local") -> dict:
    manifest = build_all(directory, repo_root, snapshot)
    if len(manifest["books"]) != len(NAMES):
        raise AssertionError("Not all series/season books were built")
    receipts = []
    with tempfile.TemporaryDirectory(prefix="spr-real-books-") as tmp:
        archive = Archive(Path(tmp))
        for entry in manifest["books"]:
            path = directory / entry["file"]
            if not path.exists():
                raise AssertionError("Missing built ebook " + entry["file"])
            data = path.read_bytes()
            if hashlib.sha256(data).hexdigest() != entry["epub_sha256"]:
                raise AssertionError("EPUB hash mismatch")
            contents = extract_epub(data)
            source_files = entry["source_files"]
            if len(source_files) != entry["chapters"]:
                raise AssertionError("Missing chapter provenance")
            # A full canonical volume must be real prose, not a structural placeholder.
            if len(contents) < len(source_files) * 1000:
                raise AssertionError("Too little prose in " + entry["id"])
            for source in source_files:
                file = repo_root / source["path"]
                if hashlib.sha256(file.read_bytes()).hexdigest() != source["sha256"]:
                    raise AssertionError("Manuscript changed during ebook snapshot")
            imported = archive.import_document(entry["title"] + ".epub", data)
            if len(imported["chunks"]) < entry["chapters"] * 5:
                raise AssertionError("Narration chunk count implausibly low")
            # Test beginning/end of every volume and resumable actual document archive.
            indices = sorted(set([0, len(imported["chunks"]) // 2, len(imported["chunks"]) - 1]))
            engine = TestVoice()
            for index in indices:
                assert archive.generate_chunk(imported["id"], index, engine, voice="Test")
                assert not archive.generate_chunk(imported["id"], index, engine, voice="Test")
                with wave.open(str(archive.audio_file(imported["id"], index)), "rb") as wav:
                    assert wav.getnframes() > 0
            archive.save_position(imported["id"], indices[-1], 0.25)
            reopened = Archive(Path(tmp))
            assert reopened.read_position(imported["id"])["index"] == indices[-1]
            assert len(reopened.load(imported["id"])["audio"]) == len(indices)
            receipts.append({"id": entry["id"], "chapters": entry["chapters"],
                             "narration_chunks": len(imported["chunks"]),
                             "characters": len(contents), "epub_bytes": len(data),
                             "epub_sha256": entry["epub_sha256"],
                             "sampled_audio_indices": indices})
    (directory / "integration-receipt.json").write_text(json.dumps(
        {"status": "passed", "snapshot": snapshot, "books": receipts,
         "neural_voice_test": "not_run", "real_sapi_test": "not_run"},
        indent=2), encoding="utf-8")
    return {"status": "passed", "books": receipts}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--snapshot", default="local")
    args = parser.parse_args()
    result = verify(args.output, args.repo_root, args.snapshot)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
