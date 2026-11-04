"""Real-model optional CI diagnostic: synthesize, export and inspect actual PCM audio.

Requires the user-initiated local voice setup to have completed; never installs
or downloads dependencies itself. The source archive and voice files stay private.
"""
from __future__ import annotations

import argparse
from array import array
import hashlib
import json
from pathlib import Path
import shutil
import sys
import wave

from spr_core import Archive
from spr_local_voices import LocalVoiceEngine

SAMPLE = ("The evening light settled over the quiet countryside, and beyond "
          "the distant hills a new adventure was beginning, where the old "
          "stories would finally be heard again.")


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--engine", choices=("kokoro", "piper"), required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)

    engine = LocalVoiceEngine(args.data_dir, args.engine)
    if not engine.available():
        raise RuntimeError("Real local voice runtime and model are not installed")
    if args.voice not in {entry["id"] for entry in engine.profiles()}:
        raise ValueError("Requested real voice is not among installed models")
    archive = Archive(args.data_dir)
    book = archive.import_document("spr-british-voice-test.txt", SAMPLE.encode("utf-8"))
    try:
        for index in range(len(book["chunks"])):
            archive.generate_chunk(book["id"], index, engine, voice=args.voice)
        output = archive.export_wav(book["id"])
        with wave.open(str(output), "rb") as handle:
            rate = handle.getframerate()
            frames = handle.getnframes()
            channels = handle.getnchannels()
            width = handle.getsampwidth()
            content = handle.readframes(frames)
        if channels != 1 or width != 2 or frames <= rate // 2:
            raise RuntimeError("Real model did not generate usable mono 16-bit narration")
        samples = array("h")
        samples.frombytes(content)
        peak = max((abs(sample) for sample in samples), default=0)
        if peak < 128:
            raise RuntimeError("Real model generated near-silent audio")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output, args.output)
        print(json.dumps({"engine": args.engine, "voice": args.voice,
                          "sample_rate": rate, "duration_seconds": round(frames / rate, 3),
                          "peak_amplitude": peak,
                          "sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
                          "output": str(args.output)}, indent=2))
        return 0
    finally:
        engine.close()


if __name__ == "__main__":
    raise SystemExit(main())
