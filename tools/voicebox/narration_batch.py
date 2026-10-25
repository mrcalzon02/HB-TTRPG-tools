#!/usr/bin/env python3
"""Reusable localhost-only Voicebox narration batch tool; never uploads files."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import tempfile
import urllib.error
import urllib.request
import wave
import zipfile
from pathlib import Path

SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
ENGINES = {"luxtts", "qwen", "chatterbox", "chatterbox_turbo", "tada"}
MAX_LINES = 300
API = "http://127.0.0.1:17493"

def validate_manifest(source: dict) -> dict:
    if not isinstance(source, dict):
        raise ValueError("Batch manifest must be a JSON object")
    project = source.get("project", "narration")
    voice = source.get("voice")
    engine = source.get("engine", "luxtts")
    lines = source.get("lines")
    if not isinstance(project, str) or not SAFE_ID.fullmatch(project):
        raise ValueError("Project needs a safe filename identifier")
    if not isinstance(voice, str) or not 1 <= len(voice) <= 128 or any(ord(c) < 32 for c in voice):
        raise ValueError("Select an existing local Voicebox voice profile")
    if engine not in ENGINES:
        raise ValueError("Unsupported voice engine")
    if not isinstance(lines, list) or not 1 <= len(lines) <= MAX_LINES:
        raise ValueError("Provide 1 to 300 narration lines")
    result, seen, total = [], set(), 0
    for item in lines:
        if not isinstance(item, dict):
            raise ValueError("Each line needs an id and text")
        key, phrase = item.get("id"), item.get("text")
        if not isinstance(key, str) or not SAFE_ID.fullmatch(key) or key in seen:
            raise ValueError("Every line needs a unique filename-safe id")
        if not isinstance(phrase, str) or not 1 <= len(phrase.strip()) <= 10000:
            raise ValueError("Each line needs 1 to 10000 characters")
        total += len(phrase)
        if total > 100000:
            raise ValueError("Maximum batch text length exceeded")
        result.append({"id": key, "text": phrase.strip()})
        seen.add(key)
    return {"project": project, "voice": voice, "engine": engine, "lines": result}

def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

def synthesize(base: str, voice: str, engine: str, phrase: str) -> bytes:
    req = urllib.request.Request(
        base.rstrip("/") + "/v1/audio/speech",
        data=json.dumps({"model": engine, "voice": voice, "input": phrase,
                         "response_format": "wav"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=900) as response:
            if "audio/" not in response.headers.get("Content-Type", ""):
                raise RuntimeError("Voicebox response is not audio")
            audio = response.read(100 * 1024 * 1024 + 1)
            if len(audio) > 100 * 1024 * 1024:
                raise RuntimeError("Voicebox audio exceeded 100 MB")
            return audio
    except urllib.error.HTTPError as error:
        raise RuntimeError("Voicebox HTTP %s: %s" % (
            error.code, error.read(800).decode("utf-8", "replace"))) from error
    except urllib.error.URLError as error:
        raise RuntimeError("Local Voicebox server is not responding at 127.0.0.1:17493") from error

def render(source: dict, destination: Path, *, api_url=API, progress=None, synth=synthesize) -> dict:
    data = validate_manifest(source)
    destination = Path(destination).expanduser().resolve()
    if destination.exists():
        raise FileExistsError("A batch already exists at " + str(destination))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".voicebox-render-", dir=str(destination.parent)) as temp:
        stage = Path(temp) / "complete"
        clips = stage / "clips"
        clips.mkdir(parents=True)
        results = []
        with wave.open(str(stage / "audition.wav"), "wb") as audition:
            format_set = False
            for index, item in enumerate(data["lines"]):
                audio = synth(api_url, data["voice"], data["engine"], item["text"])
                if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
                    raise RuntimeError("Invalid WAV returned for " + item["id"])
                clip = clips / (item["id"] + ".wav")
                clip.write_bytes(audio)
                with wave.open(str(clip), "rb") as wav:
                    if not wav.getnframes():
                        raise RuntimeError("Voicebox generated zero audio frames")
                    fmt = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate())
                    if not format_set:
                        audition.setnchannels(fmt[0])
                        audition.setsampwidth(fmt[1])
                        audition.setframerate(fmt[2])
                        format_set = True
                    if fmt != (audition.getnchannels(), audition.getsampwidth(), audition.getframerate()):
                        raise RuntimeError("Generated WAV formats differ; cannot compose an audition reel")
                    while chunk := wav.readframes(wav.getframerate()):
                        audition.writeframesraw(chunk)
                    if index != len(data["lines"]) - 1:
                        silence = int(wav.getframerate() * 0.35) * wav.getnchannels() * wav.getsampwidth()
                        audition.writeframesraw(b"\0" * silence)
                    seconds = round(wav.getnframes() / wav.getframerate(), 3)
                results.append({"id": item["id"], "text": item["text"], "file": "clips/" + clip.name,
                                "durationSeconds": seconds, "sha256": sha256(clip),
                                "bytes": clip.stat().st_size})
                if progress:
                    progress(index + 1, len(data["lines"]))
        manifest = {"schema": 1, "project": data["project"], "voice": data["voice"],
                    "engine": data["engine"], "status": "needs-auditory-review",
                    "approved": False, "published": False, "cloudUpload": False,
                    "lineCount": len(results), "clips": results,
                    "audition": {"file": "audition.wav", "sha256": sha256(stage / "audition.wav")}}
        (stage / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        with zipfile.ZipFile(stage / "review-pack.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(stage.rglob("*")):
                if path.is_file() and path.name != "review-pack.zip":
                    archive.write(path, path.relative_to(stage).as_posix())
        stage.rename(destination)
        return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    output = args.output.resolve()
    if output == root or root in output.parents:
        raise ValueError("Private narration output cannot be inside this public checkout")
    result = render(json.loads(args.manifest.read_text(encoding="utf-8")), output)
    print("Saved %s private WAV clips, audition.wav, manifest.json, review-pack.zip under %s" %
          (result["lineCount"], output))

if __name__ == "__main__":
    main()
