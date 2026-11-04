"""Independent offline ASR audition of generated SPR narration examples.

Do not modify any source WAV. English-specific Whisper-base is used solely for
content diagnostics and candidate word boundaries. This is not a proof of
speaker identity or audio aesthetics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

EXPECTED = {
    "bdo-opening": "There should have been forty-three of them.",
    "nowhere-king-opening": "The first report of the morning concerned what the king had eaten.",
}

def read_pcm(source: Path):
    import soundfile as sf
    import numpy as np
    samples, sr = sf.read(str(source), dtype="float32", always_2d=True)
    if not samples.size or sr < 8000:
        raise ValueError(f"Invalid WAV: {source}")
    mono = np.mean(samples, axis=1)
    if not np.isfinite(mono).all():
        raise ValueError(f"Non-finite samples: {source}")
    return mono, sr

def diagnose_files(files: list[Path], out: Path) -> list[dict]:
    from transformers import pipeline
    from spr_neural_alignment import is_complete, words
    model = pipeline("automatic-speech-recognition",
                     model="openai/whisper-base.en", device="cpu")
    reports = []
    for source in files:
        audio, sr = read_pcm(source)
        name = source.name
        target = next((text for key, text in EXPECTED.items() if key in name), None)
        if target is None:
            continue
        try:
            recognized = model({"raw": audio, "sampling_rate": sr},
                               return_timestamps="word",
                               generate_kwargs={"max_new_tokens": 128})
        except Exception as error:
            recognized = {"error": str(error), "text": ""}
        transcript = recognized.get("text", "")
        passed, score = is_complete(target, transcript)
        record = {
            "file": name, "bytes": source.stat().st_size,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "duration_s": round(len(audio) / sr, 3),
            "expected": target, "recognized": transcript,
            "exact_first_words": words(transcript)[:3] == words(target)[:3],
            "full_text_passed": passed, "score": score,
            "timestamp_words": recognized.get("chunks", [])[:80],
            "asr_error": recognized.get("error")
        }
        reports.append(record)
        print(json.dumps({"file": name, "recognized": transcript[:500],
                          "exact_first_words": record["exact_first_words"],
                          "score": score}, ensure_ascii=False), flush=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"asr_model": "openai/whisper-base.en",
                               "reports": reports}, indent=2, ensure_ascii=False),
                   encoding="utf-8")
    if not reports:
        raise ValueError("No known Sphinx narration recordings were checked")
    return reports

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    found = []
    for entry in args.input:
        if entry.is_file() and entry.suffix.lower() == ".wav":
            found.append(entry)
        elif entry.is_dir():
            found.extend(sorted(entry.rglob("*.wav")))
    diagnose_files(found, args.output)

if __name__ == "__main__":
    main()
