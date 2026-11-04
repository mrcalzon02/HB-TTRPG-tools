"""Independent CTranslate2/faster-whisper validation of Sphinx audio samples.

English source reference is the control. Any ASR gate is untrustworthy if it
fails to recognize the actual authorized human recording.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from spr_neural_alignment import is_complete, words

SOURCE = ("Sphinx of black quartz, judge my vow. "
          "Through fire and shadow I have carried my secrets across forgotten kingdoms. "
          "I have witnessed empires crumble, kings fall, and gods abandon their thrones. "
          "Now beneath your ancient gaze, let truth decide my fate.")
TARGETS = {
    "sphinx-original": SOURCE,
    "bdo-opening": "There should have been forty-three of them.",
    "nowhere-king-opening": "The first report of the morning concerned what the king had eaten.",
    "sphinx-nowhere-opening": "The first report of the morning concerned what the king had eaten.",
}


def run(paths: list[Path], output: Path) -> dict:
    import numpy as np
    import scipy.signal
    import soundfile as sf
    from faster_whisper import WhisperModel
    model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=4)
    records = []
    for file in paths:
        target = next((t for marker, t in TARGETS.items() if marker in file.name), None)
        if target is None:
            continue
        signal, rate = sf.read(str(file), always_2d=True, dtype="float32")
        audio = signal.mean(axis=1)
        if rate != 16000:
            import math
            gcd = math.gcd(rate, 16000)
            audio = scipy.signal.resample_poly(audio, 16000 // gcd, rate // gcd)
        audio = np.asarray(audio, dtype="float32")
        segments, info = model.transcribe(
            audio, language="en", task="transcribe", beam_size=5,
            condition_on_previous_text=False, vad_filter=True,
            word_timestamps=True, no_speech_threshold=0.5,
            hallucination_silence_threshold=1.5,
            initial_prompt=None)
        parts = list(segments)
        transcript = " ".join(s.text.strip() for s in parts)
        marks = [{"word": w.word.strip(), "start": round(w.start, 3),
                  "end": round(w.end, 3)}
                 for s in parts for w in (s.words or [])]
        matched, score = is_complete(target, transcript)
        duration = len(signal) / rate
        record = {"file": file.name, "duration_seconds": round(duration, 3),
                  "reference_control": "sphinx-original" in file.name,
                  "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
                  "expected": target, "asr": transcript,
                  "first_words_match": words(transcript)[:3] == words(target)[:3],
                  "full_text_match": matched, "score": score,
                  "timed_words": marks[:130],
                  "timestamp_range_valid": all(w["end"] <= duration + 0.4
                                               for w in marks)}
        records.append(record)
        print(json.dumps({k: record[k] for k in (
            "file", "duration_seconds", "reference_control", "asr",
            "first_words_match", "score", "timestamp_range_valid")},
            ensure_ascii=False), flush=True)
    result = {"asr_engine": "faster-whisper base.en CPU int8",
              "reports": records,
              "human_reference_control_pass": any(
                  r["reference_control"] and r["first_words_match"]
                  for r in records)}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    if not result["human_reference_control_pass"]:
        print("WARNING: Control recording not recognized. No generated sample "
              "is approved by this ASR test.", flush=True)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    found = []
    for path in args.input:
        if path.is_dir():
            found.extend(sorted(path.rglob("*.wav")))
            found.extend(sorted(path.rglob("sphinx-original.mp3")))
        elif path.is_file():
            found.append(path)
    if not found:
        raise FileNotFoundError("No supplied speech recordings found")
    run(found, args.output)


if __name__ == "__main__":
    main()
