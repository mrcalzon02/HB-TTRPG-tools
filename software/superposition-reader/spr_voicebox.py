"""Optional SPR adapter for an already-running local Voicebox speech backend.

This is a transitional integration, not an installation or external cloud connection.
Endpoint and JSON payload match tools/voicebox/narration_batch.py.
"""
from __future__ import annotations

import json
from pathlib import Path
import urllib.error
import urllib.request

API = "http://127.0.0.1:17493"
MODELS = {"luxtts", "qwen", "chatterbox", "chatterbox_turbo", "tada"}
MAX_WAV_BYTES = 100 * 1024 * 1024


def _local_request(request, timeout):
    # Never use an environment-configured HTTP proxy for private narration.
    # Requests to the local Voicebox service must stay on loopback.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    return opener.open(request, timeout=timeout)


class VoiceboxEngine:
    def __init__(self, model: str = "qwen"):
        if model not in MODELS:
            raise ValueError("Unrecognized local Voicebox model")
        self.model = model
        self.engine_id = "voicebox-" + model + "-v1"

    def profiles(self) -> list[dict]:
        req = urllib.request.Request(API + "/profiles", headers={"Accept": "application/json"})
        try:
            with _local_request(req, timeout=2) as response:
                result = json.loads(response.read(1024 * 1024))
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            raise RuntimeError("Local Voicebox is not responding on 127.0.0.1:17493") from exc
        if isinstance(result, dict):
            result = result.get("profiles", result.get("items", result.get("data", [])))
        if not isinstance(result, list):
            raise RuntimeError("Unrecognized Voicebox profile list")
        profiles = []
        for item in result:
            if not isinstance(item, dict):
                continue
            voice_id = item.get("id", item.get("profile_id", item.get("voice_id")))
            display = item.get("name", item.get("label", voice_id))
            if isinstance(voice_id, str) and 1 <= len(voice_id) <= 128:
                profiles.append({"id": voice_id, "name": str(display)[:120]})
        return profiles

    def synthesize(self, text: str, target: Path, voice: str = "", rate: int = 0) -> None:
        if not voice or len(voice) > 128 or any(ord(c) < 32 for c in voice):
            raise ValueError("Select an existing local Voicebox profile")
        if rate != 0:
            raise ValueError("Voicebox synthesis rate must be zero; adjust reader playback speed")
        payload = json.dumps({
            "model": self.model, "voice": voice, "input": text,
            "response_format": "wav"
        }).encode("utf-8")
        req = urllib.request.Request(
            API + "/v1/audio/speech", data=payload,
            headers={"Content-Type": "application/json", "Accept": "audio/wav"}, method="POST")
        try:
            with _local_request(req, timeout=900) as response:
                if "audio/" not in response.headers.get("Content-Type", "").lower():
                    raise RuntimeError("Voicebox returned a non-audio response")
                output = response.read(MAX_WAV_BYTES + 1)
        except urllib.error.HTTPError as exc:
            raise RuntimeError("Local Voicebox returned HTTP " + str(exc.code)) from exc
        except urllib.error.URLError as exc:
            raise RuntimeError("Local Voicebox speech backend is offline") from exc
        if len(output) > MAX_WAV_BYTES:
            raise ValueError("Voicebox WAV exceeds the 100 MiB per-chunk limit")
        if len(output) < 44 or output[:4] != b"RIFF" or output[8:12] != b"WAVE":
            raise ValueError("Voicebox did not produce a valid RIFF WAV")
        target.write_bytes(output)
