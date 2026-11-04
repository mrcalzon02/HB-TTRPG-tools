"""Owned stdio worker for optional, offline Kokoro and Piper synthesis.

Runs only in SPR's separate voice-runtime virtualenv. The stdout protocol is
JSON lines; stderr contains diagnostics. Models stay loaded between passages.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import wave


def emit(**fields):
    print(json.dumps(fields, ensure_ascii=False), flush=True)


def serve(family: str, root: Path):
    kokoro = None
    piper_cache = {}
    if family == "kokoro":
        from kokoro_onnx import Kokoro
        import soundfile as sf
        model_dir = root / "models" / "kokoro"
        kokoro = Kokoro(str(model_dir / "kokoro-v1.0.int8.onnx"),
                        str(model_dir / "voices-v1.0.bin"))
    elif family == "piper":
        from piper import PiperVoice, SynthesisConfig
    else:
        raise ValueError("Unsupported local speech engine")
    emit(status="ready")
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if request.get("action") != "synthesize":
                raise ValueError("Unsupported voice worker request")
            text = request["text"]
            voice = request["voice"]
            output = Path(request["output"])
            if not isinstance(text, str) or not text.strip() or len(text) > 12000:
                raise ValueError("Speech passage is empty or too long")
            if family == "kokoro":
                from spr_local_voices import KOKORO_VOICES
                if voice not in KOKORO_VOICES:
                    raise ValueError("Invalid Kokoro voice")
                samples, sample_rate = kokoro.create(text, voice=voice,
                                                     speed=1.0, lang="en-gb")
                sf.write(str(output), samples, sample_rate, subtype="PCM_16")
            else:
                from spr_local_voices import PIPER_MODELS
                model_id, sep, speaker = voice.partition("#")
                if model_id not in PIPER_MODELS or (sep and not speaker.isdecimal()):
                    raise ValueError("Invalid Piper model or speaker")
                model_path = root / "models" / "piper" / (model_id + ".onnx")
                if not model_path.is_file() or not model_path.with_suffix(".onnx.json").is_file():
                    raise ValueError("Piper model/config not installed")
                if model_id not in piper_cache:
                    piper_cache[model_id] = PiperVoice.load(str(model_path))
                model = piper_cache[model_id]
                selected = int(speaker) if sep else 0
                if selected < 0 or selected >= model.config.num_speakers:
                    raise ValueError("Speaker number exceeds installed model")
                config = SynthesisConfig(speaker_id=selected)
                with wave.open(str(output), "wb") as target:
                    model.synthesize_wav(text, target, syn_config=config)
            with wave.open(str(output), "rb") as generated:
                if generated.getnframes() <= 0:
                    raise ValueError("Model returned an empty recording")
            emit(status="generated")
        except Exception as exc:
            emit(status="error", error=str(exc))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--engine", choices=("kokoro", "piper"), required=True)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    if not args.serve:
        raise SystemExit("Local voice worker requires --serve")
    try:
        serve(args.engine, args.root)
    except Exception as exc:
        emit(status="error", error=str(exc))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
