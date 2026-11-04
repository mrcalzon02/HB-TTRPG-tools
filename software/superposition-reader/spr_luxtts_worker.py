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
        from faster_whisper import WhisperModel
        # The LuxTTS-internal multilingual Whisper-tiny produced impossible
        # transcripts even for known-good narration. This separate English
        # CTranslate2 model passed an actual human Sphinx voice control.
        self.qa_model = WhisperModel("base.en", device="cpu", compute_type="int8",
                                     cpu_threads=min(4, max(1, os.cpu_count() or 2)))
        self.prompt_cache = {}

    def _recognize(self, signal, sample_rate: int = 48000):
        import math
        import numpy as np
        import scipy.signal
        values = np.asarray(signal, dtype="float32")
        if sample_rate != 16000:
            divisor = math.gcd(sample_rate, 16000)
            values = scipy.signal.resample_poly(values, 16000 // divisor,
                                                sample_rate // divisor).astype("float32")
        segments, _ = self.qa_model.transcribe(
            values, language="en", task="transcribe", beam_size=5,
            condition_on_previous_text=False, vad_filter=True,
            word_timestamps=True, no_speech_threshold=0.5,
            hallucination_silence_threshold=1.5, initial_prompt=None)
        segments = list(segments)
        return {"text": " ".join(part.text.strip() for part in segments),
                "chunks": [{"text": word.word,
                            "timestamp": [word.start, word.end]}
                           for part in segments for word in (part.words or [])]}

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
        from spr_neural_alignment import is_complete, trim_guarded_audio, verified_word_cues
        start = time.monotonic()
        # A sacrificial spoken pre-roll protects the wanted first phoneme. The
        # old implementation just padded a clipped waveform with silence.
        # Never publish an attempt unless independent ASR verifies the exact
        # first three words AND the expected ending after removal of pre-roll.
        # Two repeated "Okay" tokens caused catastrophic self-repetition in
        # the real CI audition. Use different, grammatical pre-roll sentences.
        variants = [
            ("The story begins.", 0.76, 6),
            ("Listen carefully.", 0.92, 8),
            ("Let us begin.", 0.73, 10),
        ]
        diagnostics = []
        accepted = None
        diagnostic_root = os.environ.get("SPR_NEURAL_QA_DIR")
        if diagnostic_root:
            Path(diagnostic_root).mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="spr-lux-onset-") as temporary:
            folder = Path(temporary)
            for attempt, (guard_phrase, speed, steps) in enumerate(variants, 1):
                spoken_prompt = guard_phrase + " " + text
                recognition = {}
                try:
                    with contextlib.redirect_stdout(sys.stderr):
                        result = self.model.generate_speech(
                            spoken_prompt, self.prompt_cache[key],
                            num_steps=steps, speed=speed)
                    raw = (result.detach().cpu().numpy()
                           if hasattr(result, "detach") else np.asarray(result))
                    raw = np.asarray(raw, dtype="float32").squeeze()
                    if raw.ndim != 1 or not len(raw) or not np.isfinite(raw).all():
                        raise ValueError("LuxTTS produced no finite mono audio")
                    padded = np.pad(raw, (int(.22 * 48000), int(.38 * 48000)))
                    candidate = folder / f"candidate-{attempt}.wav"
                    sf.write(str(candidate), padded, 48000, subtype="PCM_16")
                    if diagnostic_root:
                        import shutil
                        shutil.copyfile(candidate, Path(diagnostic_root) / (
                            output.stem + f"-REJECTED-CANDIDATE-{attempt}.wav"))
                    with contextlib.redirect_stdout(sys.stderr):
                        recognition = self._recognize(padded, 48000)
                    if not isinstance(recognition, dict):
                        raise ValueError("Independent speech recognition returned no word-aligned result")
                    trimmed, boundary = trim_guarded_audio(
                        padded.copy(), 48000, text, recognition,
                        guard_phrase=guard_phrase)
                    # Add genuine silence only AFTER the first word's onset is
                    # protected by the guarded generation and measured trim.
                    trimmed = np.pad(trimmed, (int(.15 * 48000), 0))
                    corrected = folder / f"corrected-{attempt}.wav"
                    sf.write(str(corrected), trimmed, 48000, subtype="PCM_16")
                    with contextlib.redirect_stdout(sys.stderr):
                        verified = self._recognize(trimmed, 48000)
                    final_heard = (verified.get("text", "") if isinstance(verified, dict)
                                   else str(verified))
                    passed, match = is_complete(text, final_heard, guarded=False)
                    diagnostics.append({
                        "attempt": attempt, "guard_prompt": guard_phrase,
                        "asr_engine": "faster-whisper-base.en",
                        "guard_transcript": recognition.get("text", "")[:220],
                        "post_trim_transcript": final_heard[:220],
                        "first_words_preserved": passed, "match": match,
                        "boundary": boundary,
                    })
                    if not passed:
                        continue
                    accepted = {"frames": len(trimmed), "array": trimmed,
                                "qa": diagnostics[-1],
                                "word_cues": verified_word_cues(
                                    text, verified, len(trimmed) / 48000)}
                    break
                except (ValueError, OSError, RuntimeError, TypeError, KeyError) as error:
                    diagnostics.append({
                        "attempt": attempt, "reason": str(error)[:260],
                        "expected": text[:260],
                        "recognized": (recognition.get("text", "")[:420]
                                       if isinstance(recognition, dict) else str(recognition)[:420]),
                        "word_timestamps": (recognition.get("chunks", [])[:12]
                                            if isinstance(recognition, dict) else [])
                    })
        if accepted is None:
            if diagnostic_root:
                (Path(diagnostic_root) / (output.stem + "-rejected.json")).write_text(
                    json.dumps({"expected": text, "attempts": diagnostics}, indent=2,
                               ensure_ascii=False), encoding="utf-8")
            # A missing or mangled opening is not merely a subjective voice
            # quality complaint; it is objectively incomplete book text.
            raise RuntimeError("Neural opening verification failed after "
                               + str(len(variants)) + " attempts: "
                               + json.dumps(diagnostics, ensure_ascii=False)[:3600])
        output.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output), accepted["array"], 48000, subtype="PCM_16")
        with wave.open(str(output), "rb") as wav:
            duration = wav.getnframes() / wav.getframerate()
        return {"status": "generated", "seconds": round(duration, 3),
                "elapsed_seconds": round(time.monotonic() - start, 2),
                "device": self.device, "model": self.model_name,
                "reference_sha256": key, "qa": accepted["qa"],
                "word_cues": accepted["word_cues"],
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
    sources = [
        ("bdo-opening", "docs/beneath-dappled-oaks/chapters/01-THE-LAST-SEVEN.md", "bdo-current.epub"),
        ("nowhere-king-opening", "docs/nowhere-king/episodes/season-01/01-CROWN-WITHOUT-COURT.md", "nowhere-s1.epub"),
    ]
    engine = LuxEngine(prefer_cpu=prefer_cpu)
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for key, source_name, epub_name in sources:
        source = repo_root / source_name
        if source.is_file():
            from spr_storybooks import manuscript_text
            raw = manuscript_text(source.read_text(encoding="utf-8"), nowhere=key.startswith("nowhere"))
            origin = source_name
        else:
            # Portable Windows builds ship validated EPUBs instead of the Git checkout.
            from spr_epub import extract_epub
            book = repo_root / "spr_examples" / epub_name
            if not book.is_file():
                raise FileNotFoundError("Missing bundled example book: " + str(book))
            raw = extract_epub(book.read_bytes())
            origin = "spr_examples/" + epub_name
        paragraphs = [p.strip() for p in raw.split("\n\n")
                      if p.strip() and not p.lstrip().startswith("#")]
        spoken = next((p for p in paragraphs if len(p) >= 38 and
                       not p.lower().startswith(("chapter one", "nowhere king", "season one"))), None)
        if not spoken:
            raise ValueError("Cannot find source prose paragraph")
        import re
        spoken = re.split(r"(?<=[.!?])\s+", spoken, maxsplit=1)[0]
        if len(spoken) > 240:
            spoken = spoken[:240].rsplit(" ", 1)[0] + "."
        name = key + ".wav"
        report = engine.synthesize(spoken, reference, output / name)
        results.append({"id": key, "source": origin,
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
