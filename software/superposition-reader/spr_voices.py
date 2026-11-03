"""Private user-authorized voice-reference archive for SuperPosition Reader.

Archiving/reference storage is NOT voice cloning, inference, or model training.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import uuid
import zipfile

from spr_core import default_data_dir, _write_json_atomic

AUDIO_EXTS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
MAX_SAMPLE = 45 * 1024 * 1024
MAX_BUNDLE = 100 * 1024 * 1024
MAX_ITEMS = 200
ID_PATTERN = re.compile(r"^[a-f0-9]{32}$")


class VoiceLibrary:
    def __init__(self, root=None):
        self.root = Path(root) if root is not None else default_data_dir() / "voices"
        self.root.mkdir(parents=True, exist_ok=True)

    def folder(self, profile_id):
        if not ID_PATTERN.fullmatch(profile_id):
            raise ValueError("Invalid voice profile identifier")
        return self.root / profile_id

    def create(self, name: str, style: str = "natural"):
        name = " ".join(str(name).split())[:100]
        style = " ".join(str(style).split())[:60]
        if not name:
            raise ValueError("Voice name cannot be blank")
        profile_id = uuid.uuid4().hex
        folder = self.folder(profile_id)
        (folder / "samples").mkdir(parents=True)
        info = {"id": profile_id, "name": name, "style": style,
                "status": "references-only", "samples": [], "schema": 1}
        _write_json_atomic(folder / "profile.json", info)
        return info

    def get(self, profile_id):
        return json.loads((self.folder(profile_id) / "profile.json").read_text(encoding="utf-8"))

    def list(self):
        output = []
        for path in self.root.glob("*/profile.json"):
            try:
                p = json.loads(path.read_text(encoding="utf-8"))
                output.append({"id": p["id"], "name": p["name"], "style": p["style"],
                               "status": p["status"], "samples": len(p["samples"])})
            except (ValueError, KeyError, OSError):
                continue
        return sorted(output, key=lambda x: x["name"].lower())

    def add_sample(self, profile_id: str, name: str, data: bytes, transcript: str = ""):
        suffix = PurePosixPath(name.replace("\\", "/")).suffix.lower()
        if suffix not in AUDIO_EXTS:
            raise ValueError("Only WAV, MP3, FLAC, OGG and M4A samples are accepted")
        if not 1 <= len(data) <= MAX_SAMPLE:
            raise ValueError("Voice sample must be between 1 byte and 45 MiB")
        profile = self.get(profile_id)
        fingerprint = hashlib.sha256(data).hexdigest()
        duplicate = next((s for s in profile["samples"] if s["sha256"] == fingerprint), None)
        if duplicate:
            return duplicate
        file_name = fingerprint[:24] + suffix
        folder = self.folder(profile_id)
        target = folder / "samples" / file_name
        target.write_bytes(data)
        entry = {
            "name": PurePosixPath(name.replace("\\", "/")).name[:160],
            "file": file_name, "sha256": fingerprint, "bytes": len(data),
            "transcript": str(transcript)[:10000],
        }
        profile["samples"].append(entry)
        _write_json_atomic(folder / "profile.json", profile)
        return entry

    def import_zip(self, profile_id: str, data: bytes):
        if not 1 <= len(data) <= MAX_BUNDLE:
            raise ValueError("Voice pack ZIP exceeds 100 MiB")
        with zipfile.ZipFile(io.BytesIO(data)) as bundle:
            names = bundle.namelist()
            if len(names) > MAX_ITEMS:
                raise ValueError("Voice pack has too many archive entries")
            candidates = []
            total = 0
            for item in bundle.infolist():
                if item.is_dir():
                    continue
                total += item.file_size
                if total > MAX_BUNDLE:
                    raise ValueError("Voice pack extracts beyond 100 MiB")
                path = PurePosixPath(item.filename.replace("\\", "/"))
                if path.is_absolute() or ".." in path.parts:
                    raise ValueError("Unsafe path in voice pack")
                if path.suffix.lower() in AUDIO_EXTS:
                    if item.file_size > MAX_SAMPLE:
                        raise ValueError("A voice sample exceeds 45 MiB")
                    candidates.append(item.filename)
            # Reference pack v2 includes original source and shortened processed clips.
            prepared = [n for n in candidates if PurePosixPath(n).name.startswith("personal_voice_")]
            selected = prepared if prepared else candidates
            if not selected:
                raise ValueError("ZIP contains no supported voice recordings")
            added = 0
            for name in selected:
                previous = len(self.get(profile_id)["samples"])
                self.add_sample(profile_id, name, bundle.read(name))
                if len(self.get(profile_id)["samples"]) > previous:
                    added += 1
        return {"added": added, "considered": len(selected), "profile_id": profile_id}
