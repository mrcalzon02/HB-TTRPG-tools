"""Persistent LuxTTS speech worker for SPR; runs in an optional isolated model venv.

JSON-lines protocol over stdio. Neural model is loaded once per worker, then
voice prompts are cached by content fingerprint. The caller supplies an actual
existing profile sample path; no text or audio is uploaded by SPR itself.
"""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import wave


def prepare_reference(source: Path, folder: Path) -> Path:
    import numpy as np
    import soundfile as sf
    import librosa

    samples, sr = sf.read(str(source), dtype="float32", always_2d=True)
    if samples.size == 0 or sr < 8000:
        raise ValueError("The Sphinx recording has no usable speech audio")
    mono = np.mean(samples, axis=1)
    if not np.isfinite(mono).all():
        raise ValueError("The speech recording contains invalid samples")
    if sr != 24000:
        mono = librosa.resample(mono, orig_sr=sr, target_sr=24000)
    if len(mono) < 24000 * 3:
        raise ValueError("Voice references need at least three seconds of audio")
    # Keep full ~20-second owner sample and avoid normalized-clipping distortion.
    peak = max(float(np.max(np.abs(mono))), 1e-8)
    if peak > .98:
        mono = mono * (.98 / peak)
    folder.mkdir(parents=True, exist_ok=True)
    prepared = folder / ("reference-" + hashlib.sha256(source.read_bytes()).hexdigest()[:20] + ".wav")
    if not prepared.is_file():
        sf.write(str(prepared), mono, 24000, subtype="PCM_16")
    return prepared


class LuxEngine:
    def __init__(self, model_name: str = "YatharthS/LuxTTS", prefer_cpu: bool = False):
        import torch
        from zipvoice.luxvoice import LuxTTS
        torch.set_num_threads(min(4, max(1, os.cpu_count() or 2)))
        gpu_ready = bool(torch.cuda.is_available()) and not prefer_cpu
        self.device = "cuda" if gpu_ready else "cpu"
        self.model_name = model_name
        with contextlib.redirect_stdout(sys.stderr):
            self.model = LuxTTS(model_name, device=self.device,
                                threads=min(4, max(1, os.cpu_count() or 2)))
        self.prompt_cache = {}

    def synthesize(self, text: str, reference: Path, output: Path) -> dict:
        import numpy as np
        import soundfile as sf
        if not 1 <= len(text) <= 1500 or not text.strip():
            raise ValueError("Narration text must be between 1 and 1500 characters")
        if not reference.is_file():
            raise FileNotFoundError("Voice sample file not found")
        key = hashlib.sha256(reference.read_bytes()).hexdigest()
        if key not in self.prompt_cache:
            with tempfile.TemporaryDirectory(prefix="spr-lux-ref-") as tmp:
                prepared = prepare_reference(reference, Path(tmp))
                with contextlib.redirect_stdout(sys.stderr):
                    self.prompt_cache[key] = self.model.encode_prompt(str(prepared), rms=0.01)
        start = time.monotonic()
        with contextlib.redirect_stdout(sys.stderr):
            result = self.model.generate_speech(text, self.prompt_cache[key],
                                                 num_steps=6, speed=0.82)
        arr = result.detach().cpu().numpy() if hasattr(result, "detach") else np.asarray(result)
        arr = np.asarray(arr, dtype="float32").squeeze()
        if arr.ndim != 1 or not len(arr) or not np.isfinite(arr).all():
            raise ValueError("LuxTTS returned no usable audio")
        # Audible output is 48 kHz with small silent margins to protect first/last words.
        arr = np.pad(arr, (int(.22 * 48000), int(.38 * 48000)))
        output.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output), arr, 48000, subtype="PCM_16")
        with wave.open(str(output), "rb") as wav:
            duration = wav.getnframes() / wav.getframerate()
        return {"status": "generated", "seconds": round(duration, 3),
                "elapsed_seconds": round(time.monotonic() - start, 2),
                "device": self.device, "model": self.model_name,
                "reference_sha256": key,
                "audio_sha256": hashlib.sha256(output.read_bytes()).hexdigest()}


def serve(prefer_cpu: bool = False) -> None:
    engine = LuxEngine(prefer_cpu=prefer_cpu)
    print(json.dumps({"status": "ready", "model": engine.model_name,
                      "device": engine.device}), flush=True)
    for line in sys.stdin:
        try:
            req = json.loads(line)
            if req.get("action") == "exit":
                print(json.dumps({"status": "bye"}), flush=True)
                break
            if req.get("action") != "synthesize":
                raise ValueError("Unrecognized speech-worker action")
            report = engine.synthesize(str(req["text"]), Path(req["reference"]),
                                       Path(req["output"]))
            print(json.dumps(report), flush=True)
        except Exception as error:
            print(json.dumps({"status": "error", "error": str(error)[:600]}), flush=True)


def trial(reference: Path, output: Path, repo_root: Path, prefer_cpu: bool = True):
    from spr_storybooks import manuscript_text
    sources = [
        ("bdo-opening", repo_root / "docs/beneath-dappled-oaks/chapters/01-THE-LAST-SEVEN.md"),
        ("nowhere-king-opening", repo_root / "docs/nowhere-king/episodes/season-01/01-CROWN-WITHOUT-COURT.md"),
    ]
    engine = LuxEngine(prefer_cpu=prefer_cpu)
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for key, source in sources:
        raw = manuscript_text(source.read_text(encoding="utf-8"), nowhere=key.startswith("nowhere"))
        paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip() and not p.lstrip().startswith("#")]
        spoken = next((p for p in paragraphs if len(p) >= 38), None)
        if not spoken:
            raise ValueError("Cannot find source prose paragraph")
        import re
        spoken = re.split(r"(?<=[.!?])\s+", spoken, maxsplit=1)[0]
        if len(spoken) > 240:
            spoken = spoken[:240].rsplit(" ", 1)[0] + "."
        name = key + ".wav"
        report = engine.synthesize(spoken, reference, output / name)
        results.append({"id": key, "source": source.relative_to(repo_root).as_posix(),
                        "text": spoken, "file": name, **report})
        print(key, report, flush=True)
    summary = {"status": "generated-not-auditor-approved", "engine": engine.model_name,
               "source_reference": reference.name, "clips": results}
    (output / "manifest.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--serve", action="store_true")
    p.add_argument("--trial", action="store_true")
    p.add_argument("--reference", type=Path)
    p.add_argument("--output", type=Path)
    p.add_argument("--repo-root", type=Path)
    p.add_argument("--cpu", action="store_true")
    args = p.parse_args()
    if args.serve:
        serve(args.cpu)
    elif args.trial:
        if not all((args.reference, args.output, args.repo_root)):
            p.error("--trial requires --reference --output --repo-root")
        trial(args.reference, args.output, args.repo_root, prefer_cpu=args.cpu)
    else:
        p.error("Choose --serve or --trial")


if __name__ == "__main__":
    main()
