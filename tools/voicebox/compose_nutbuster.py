#!/usr/bin/env python3
"""Validate and compose owner-authorized Voicebox renders into a private audition pack."""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from nutbuster_batch import PREVIEW, original_lines

RATE = 44100

def checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()

def private_path(path, nutbuster):
    path = Path(path).expanduser().resolve()
    for repo in (Path(__file__).resolve().parents[2], nutbuster.resolve()):
        if path == repo or repo in path.parents:
            raise ValueError("Private voice data cannot be written/read inside a public repository: " + str(path))
    return path

def probe(path, max_seconds=45):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a:0",
         "-show_entries", "stream=codec_name,sample_rate,channels:format=duration",
         "-of", "json", str(path)], check=True, text=True, capture_output=True
    )
    data = json.loads(result.stdout)
    stream = (data.get("streams") or [None])[0]
    length = float(data.get("format", {}).get("duration") or 0)
    if not stream or not 0.35 <= length <= max_seconds:
        raise ValueError("Undecodable or out-of-bounds audio: " + path.name)
    return dict(seconds=round(length, 3), codec=stream.get("codec_name"),
                sampleRate=int(stream["sample_rate"]), channels=int(stream["channels"]))

def inputs(nutbuster, render_dir, scope):
    expected = original_lines(nutbuster)
    keys = list(PREVIEW) if scope == "preview" else list(expected)
    manifest_path = render_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if (manifest.get("schema"), manifest.get("scope"), manifest.get("profile"),
        manifest.get("source_project"), manifest.get("reference_audio_uploaded")) != (
            1, scope, "owner-authorized-original", "mrcalzon02/NUTBUSTER-R", False):
        raise ValueError("Unexpected renderer manifest, scope, profile, or reference policy")
    records = manifest.get("files")
    if not isinstance(records, list) or len(records) != len(keys):
        raise ValueError("Renderer manifest does not cover expected event keys")
    found = {}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("Malformed renderer record")
        key = record.get("key")
        if key not in keys or key in found:
            raise ValueError("Unexpected or duplicate event key: " + str(key))
        name = key + ".mp3"
        if record.get("file") != name or record.get("text") != expected[key]:
            raise ValueError("Event text or filename drift: " + key)
        audio = render_dir / name
        if not audio.is_file() or audio.is_symlink():
            raise ValueError("Missing or symlinked rendered file: " + name)
        if record.get("sha256") != checksum(audio) or record.get("bytes") != audio.stat().st_size:
            raise ValueError("Original rendered clip hash/size mismatch: " + name)
        probe(audio)
        found[key] = (record, audio)
    if set(found) != set(keys):
        raise ValueError("Missing rendered event keys")
    return manifest, [(key, expected[key], *found[key]) for key in keys]

def compose(nutbuster, rendered, destination, scope):
    nutbuster = Path(nutbuster).resolve()
    rendered = private_path(rendered, nutbuster)
    destination = private_path(destination, nutbuster)
    if destination == rendered or rendered in destination.parents or destination in rendered.parents:
        raise ValueError("Composition destination must be separate from the original renders")
    if destination.exists():
        raise FileExistsError("Refusing to overwrite a previous take: " + str(destination))
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg and ffprobe must be installed")
    source_manifest, records = inputs(nutbuster, rendered, scope)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".voicebox-compose-", dir=str(destination.parent)) as workspace:
        stage = Path(workspace) / "pack"
        pcm_dir = Path(workspace) / "pcm"
        (stage / "clips").mkdir(parents=True)
        pcm_dir.mkdir()
        report = []
        with wave.open(str(stage / "_audition.wav"), "wb") as reel:
            reel.setnchannels(1)
            reel.setsampwidth(2)
            reel.setframerate(RATE)
            for n, (key, phrase, record, audio) in enumerate(records):
                pcm = pcm_dir / (key + ".wav")
                final = stage / "clips" / (key + ".mp3")
                subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(audio), "-af", "highpass=f=70,loudnorm=I=-17:TP=-2:LRA=11",
                    "-ar", str(RATE), "-ac", "1", "-c:a", "pcm_s16le", str(pcm)], check=True)
                subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(pcm), "-c:a", "libmp3lame", "-b:a", "128k", str(final)], check=True)
                with wave.open(str(pcm), "rb") as src:
                    if (src.getframerate(), src.getnchannels(), src.getsampwidth()) != (RATE, 1, 2):
                        raise ValueError("Incorrect composition intermediate format")
                    while chunk := src.readframes(RATE):
                        reel.writeframesraw(chunk)
                if n != len(records) - 1:
                    reel.writeframesraw(b"\0\0" * int(RATE * 0.45))
                info = probe(final)
                if (info["codec"], info["sampleRate"], info["channels"]) != ("mp3", RATE, 1):
                    raise ValueError("Invalid output encoding for " + key)
                report.append(dict(key=key, text=phrase, file="clips/" + key + ".mp3",
                    sourceSha256=record["sha256"], sha256=checksum(final),
                    bytes=final.stat().st_size, **info))
        audition = stage / "audition.mp3"
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(stage / "_audition.wav"), "-c:a", "libmp3lame", "-b:a", "128k",
            str(audition)], check=True)
        (stage / "_audition.wav").unlink()
        reel_length = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
            "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
            str(audition)], check=True, capture_output=True, text=True)
        manifest = dict(schema=1, project="mrcalzon02/NUTBUSTER-R",
            status="needs-auditory-review", approved=False, playbackTested=False,
            referenceAudioIncluded=False, existingGameAudioModified=False,
            scope=scope, engine=source_manifest.get("engine"), lineCount=len(report),
            sourceManifestSha256=checksum(rendered / "manifest.json"),
            output=dict(sampleRate=RATE, channels=1, bitrate="128k",
                loudnessTarget=dict(LUFS=-17, truePeakDbTP=-2, LRA=11)),
            clips=report,
            audition=dict(file="audition.mp3", sha256=checksum(audition),
                bytes=audition.stat().st_size, seconds=round(float(reel_length.stdout.strip()), 3)))
        (stage / "composition.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        stage.rename(destination)
        return manifest

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--nutbuster", required=True, type=Path)
    p.add_argument("--rendered", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--scope", choices=("preview", "all"), required=True)
    a = p.parse_args()
    result = compose(a.nutbuster, a.rendered, a.output, a.scope)
    print("COMPOSED: %d unapproved voice clips and private audition reel: %s" % (result["lineCount"], a.output))

if __name__ == "__main__":
    main()
