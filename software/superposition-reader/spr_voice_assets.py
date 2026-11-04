"""Release gate for four real Sphinx narration demonstrations.

SHA-256 values are from passing independent English word-boundary neural QA
trials (GitHub Actions 41745821792 and 41747503023). Both source-stored and
portable-built bytes must match. Changes require a NEW real neural trial
and an explicit update of these expected hashes; synthetic WAV tests alone do
not authorize new preview recordings.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import wave

VERIFIED_CI_RUNS = ("41745821792", "41747503023")
VERIFIED_PREVIEWS = {
    "sphinx-bdo-opening.wav": {
        "sha256": "cb48505adbbd2694dd7f3b0bbaa46a3f14d1df914c88a105e3fee93d8a2bb8d8",
        "first_words": "There should have",
        "duration_seconds": 4.921,
    },
    "sphinx-nowhere-opening.wav": {
        "sha256": "158b61e78f39f01a4cc1648820fbb21ac5b9f56e19fa798cbb53073d2e9bfea2",
        "first_words": "The first report",
        "duration_seconds": 6.981,
    },
    "sphinx-bdo-full-passage.wav": {
        "sha256": "ff1cdca99f913dc7183605d27b94cda3334028062c81bcf62d616dac13ccf039",
        "first_words": "The arch had",
        "duration_seconds": 30.333,
    },
    "sphinx-nowhere-full-passage.wav": {
        "sha256": "e72d1fbfb968d0f13ab701514416a6ac79560f94420b99667d5c68307fdb833f",
        "first_words": "He had broken",
        "duration_seconds": 36.199,
    },
}


def verify_previews(package_root: Path) -> dict[str, bool]:
    root = Path(package_root) / "assets" / "voice"
    results = {}
    for name, expected in VERIFIED_PREVIEWS.items():
        file = root / name
        try:
            data = file.read_bytes()
            valid_digest = hashlib.sha256(data).hexdigest() == expected["sha256"]
            with wave.open(str(file), "rb") as recording:
                duration = recording.getnframes() / recording.getframerate()
                audio_ok = (
                    recording.getnchannels() == 1
                    and recording.getframerate() == 48000
                    and recording.getsampwidth() == 2
                    and abs(duration - expected["duration_seconds"]) <= 0.002
                )
            results[name] = valid_digest and audio_ok
        except (OSError, EOFError, ValueError, wave.Error, ZeroDivisionError):
            results[name] = False
    return results
