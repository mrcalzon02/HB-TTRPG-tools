"""SPR-owned optional offline LuxTTS adapter.

The heavy model runs in a dedicated per-user venv as a persistent child process,
not within the packaged pywebview app and not through Voicebox. No network
endpoint is exposed; only an owned stdio worker is used.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import queue
import subprocess
import threading

from spr_core import default_data_dir
from spr_voices import VoiceLibrary
from spr_bootstrap import VOICE_NAME


class SprLuxEngine:
    engine_id = "spr-luxtts-yatharths-base-v1"

    def __init__(self, app_dir: Path | None = None, python_executable: Path | None = None,
                 worker_script: Path | None = None):
        self.app_dir = Path(app_dir or default_data_dir())
        self.python = Path(python_executable or (
            self.app_dir / "neural" / ".venv" / "Scripts" / "python.exe"
            if os.name == "nt"
            else self.app_dir / "neural" / ".venv" / "bin" / "python"))
        self.script = Path(worker_script or Path(__file__).with_name("spr_luxtts_worker.py"))
        self.voices = VoiceLibrary(self.app_dir / "voices")
        self._process = None
        self._reader = None
        self._responses = queue.Queue()
        self._lock = threading.RLock()
        self._log = None

    def available(self) -> bool:
        return self.python.is_file() and self.script.is_file()

    def profiles(self) -> list[dict]:
        return [{"id": v["id"], "name": v["name"]}
                for v in self.voices.list() if v["samples"] > 0]

    def default_voice(self) -> str:
        for voice in self.voices.list():
            if voice["name"] == VOICE_NAME and voice["samples"]:
                return voice["id"]
        return ""

    def _sample(self, voice: str) -> Path:
        if not voice:
            voice = self.default_voice()
        if not voice:
            raise ValueError("No prepared SPR voice profile was selected")
        info = self.voices.get(voice)
        if not info["samples"]:
            raise ValueError("Voice profile has no recorded samples")
        source = info["samples"][0]["file"]
        if not isinstance(source, str) or Path(source).name != source:
            raise ValueError("Invalid voice reference path")
        path = self.voices.folder(voice) / "samples" / source
        if not path.is_file():
            raise FileNotFoundError("Voice reference was removed from the local archive")
        return path

    def _pump(self, stream):
        try:
            for line in stream:
                try:
                    self._responses.put(json.loads(line))
                except json.JSONDecodeError:
                    self._responses.put({"status": "error", "error": "Invalid neural-worker response"})
        finally:
            self._responses.put({"status": "error", "error": "Neural speech worker exited"})

    def _shutdown(self):
        process = self._process
        self._process = None
        if process is not None:
            try:
                if process.poll() is None:
                    process.terminate()
                    process.wait(timeout=8)
            except (OSError, subprocess.TimeoutExpired):
                process.kill()
        if self._log:
            self._log.close()
            self._log = None

    def close(self):
        with self._lock:
            self._shutdown()

    def _start(self):
        if self._process is not None and self._process.poll() is None:
            return
        self._shutdown()
        if not self.available():
            raise RuntimeError("SPR neural speech runtime is not installed")
        log_dir = self.app_dir / "neural" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        self._log = (log_dir / "worker.log").open("ab")
        env = dict(os.environ)
        env["HF_HOME"] = str(self.app_dir / "neural" / "models")
        env["PYTHONNOUSERSITE"] = "1"
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        self._responses = queue.Queue()
        command = [str(self.python), "-u", str(self.script), "--serve"]
        if (self.app_dir / "neural" / "force-cpu.txt").is_file():
            command.append("--cpu")
        self._process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self._log,
            cwd=str(self.app_dir), env=env, text=True, encoding="utf-8",
            bufsize=1, creationflags=flags)
        self._reader = threading.Thread(target=self._pump, args=(self._process.stdout,),
                                        name="SPR-Neural-Worker-Reader", daemon=True)
        self._reader.start()
        try:
            message = self._responses.get(timeout=900)
            if message.get("status") != "ready":
                raise RuntimeError("Neural worker failed to initialize: " + message.get("error", "unknown"))
        except queue.Empty as error:
            self._shutdown()
            raise RuntimeError("Neural worker startup timed out") from error

    def synthesize(self, text: str, target: Path, voice: str = "", rate: int = 0):
        if rate != 0:
            raise ValueError("Neural synthesis speed is fixed; use playback speed controls")
        with self._lock:
            reference = self._sample(voice)
            self._start()
            payload = {"action": "synthesize", "text": text,
                       "reference": str(reference.resolve()), "output": str(target.resolve())}
            try:
                self._process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
                self._process.stdin.flush()
                result = self._responses.get(timeout=900)
            except (OSError, queue.Empty) as error:
                self._shutdown()
                raise RuntimeError("Neural speech worker stopped or timed out") from error
            if result.get("status") != "generated":
                raise RuntimeError("Neural synthesis failed: " + result.get("error", "unknown error"))
            if not target.is_file() or target.stat().st_size < 44:
                raise RuntimeError("Neural worker returned no WAV recording")
