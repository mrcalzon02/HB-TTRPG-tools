"""Release gate for the specific two real Sphinx narration demonstration WAVs.

SHA-256 values were read from the passing independent faster-whisper English
word-boundary QA trial (GitHub Actions 41745821792) and verified against the
downloaded WAV bytes. Any changes to these files require a NEW real neural trial
and an explicit update of these expected hashes; synthetic WAV tests alone do
not authorize new preview recordings.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import wave

VERIFIED_CI_RUN = "41745821792"
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
