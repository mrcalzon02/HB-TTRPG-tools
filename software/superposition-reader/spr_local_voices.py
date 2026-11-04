"""Optional local Kokoro/Piper voices for SPR's existing WAV cache and chapter queue.

No model files are distributed with SPR. Only whitelisted, installed voices
are selectable. Heavy third-party packages run in a separate local venv/worker.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import queue
import re
import subprocess
import threading

KOKORO_VOICES = {
    "bm_george": "George · British male",
    "bm_fable": "Fable · British male",
    "bm_lewis": "Lewis · British male",
    "bm_daniel": "Daniel · British male",
    "bf_emma": "Emma · British female",
    "bf_isabella": "Isabella · British female",
    "bf_alice": "Alice · British female",
    "bf_lily": "Lily · British female",
}
PIPER_MODELS = {
    "en_GB-alan-low": "Alan · British male · low",
    "en_GB-alan-medium": "Alan · British male · medium",
    "en_GB-northern_english_male-medium": "Northern English male · medium",
    "en_GB-alba-medium": "Alba · British female · medium",
    "en_GB-cori-medium": "Cori · British female · medium",
    "en_GB-cori-high": "Cori · British female · high",
    "en_GB-jenny_dioco-medium": "Jenny Dioco · British female · medium",
    "en_GB-southern_english_female-low": "Southern English female · low",
    "en_GB-aru-medium": "Aru · multiple speakers · medium",
    "en_GB-semaine-medium": "Semaine · multiple speakers · medium",
    "en_GB-vctk-medium": "VCTK · multiple speakers · medium",
}
VOICE_ID_RE = re.compile(r"^en_GB-[a-z_]+-(?:low|medium|high)(?:#[0-9]{1,3})?$")


def catalog():
    """Installer options; downloaded weights remain private to each user."""
    return ([{"engine": "kokoro", "id": "kokoro-british", "name": "Kokoro · eight British voices",
              "license": "Kokoro model Apache-2.0; ONNX runtime MIT"}]
            + [{"engine": "piper", "id": key, "name": label,
                "license": "Check each downloaded MODEL_CARD"}
               for key, label in PIPER_MODELS.items()])


class LocalVoiceEngine:
    """Persistent stdio speech process; no exposed port or cloud API."""
    def __init__(self, app_root: Path, family: str, script: Path | None = None):
        if family not in {"kokoro", "piper"}:
            raise ValueError("Unknown SPR local voice engine")
        self.family = family
        self.engine_id = "spr-" + family + "-local-v1"
        self.root = Path(app_root) / "local-voices"
        self.python = self.root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        self.script = Path(script or Path(__file__).with_name("spr_local_voice_worker.py"))
        self._lock = threading.RLock()
        self._process = None
        self._log = None
        self._responses = queue.Queue()

    def profiles(self):
        if self.family == "kokoro":
            if not ((self.root / "models/kokoro/kokoro-v1.0.int8.onnx").is_file()
                    and (self.root / "models/kokoro/voices-v1.0.bin").is_file()):
                return []
            return [{"id": key, "name": value} for key, value in KOKORO_VOICES.items()]
        found = []
        for voice, label in PIPER_MODELS.items():
            model = self.root / "models/piper" / (voice + ".onnx")
            config = self.root / "models/piper" / (voice + ".onnx.json")
            if not model.is_file() or not config.is_file():
                continue
            try:
                data = json.loads(config.read_text(encoding="utf-8"))
                speakers = data.get("num_speakers", 1)
                if type(speakers) is not int or not 1 <= speakers <= 128:
                    continue
                speaker_names = {num: name for name, num in
                                 data.get("speaker_id_map", {}).items()
                                 if type(num) is int}
                for number in range(speakers):
                    vid = voice if speakers == 1 else voice + "#" + str(number)
                    name = label if speakers == 1 else (
                        label + " · " + str(speaker_names.get(number, "Speaker " + str(number))))
                    found.append({"id": vid, "name": name})
            except (OSError, ValueError, AttributeError, TypeError):
                continue
        return found

    def available(self):
        return self.python.is_file() and self.script.is_file() and bool(self.profiles())

    def _pump(self, stream):
        try:
            for line in stream:
                try:
                    self._responses.put(json.loads(line))
                except json.JSONDecodeError:
                    self._responses.put({"status": "error", "error": "Unrecognized voice worker output"})
        finally:
            self._responses.put({"status": "error", "error": "Local voice worker exited"})

    def _shutdown(self):
        proc = self._process
        self._process = None
        if proc is not None:
            try:
                if proc.poll() is None:
                    proc.terminate()
                    proc.wait(timeout=8)
            except (OSError, subprocess.TimeoutExpired):
                proc.kill()
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
            raise RuntimeError("Install the selected local voice engine and model before narration")
        log_dir = self.root / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        self._log = (log_dir / (self.family + "-worker.log")).open("ab")
        env = dict(os.environ)
        env["PYTHONNOUSERSITE"] = "1"
        env["HF_HUB_OFFLINE"] = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        self._responses = queue.Queue()
        self._process = subprocess.Popen(
            [str(self.python), "-u", str(self.script), "--serve",
             "--engine", self.family, "--root", str(self.root)],
            cwd=str(self.root), env=env, stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=self._log, text=True, encoding="utf-8",
            bufsize=1,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        threading.Thread(target=self._pump, args=(self._process.stdout,),
                         name="SPR-" + self.family + "-WorkerReader", daemon=True).start()
        try:
            message = self._responses.get(timeout=120)
        except queue.Empty as exc:
            self._shutdown()
            raise RuntimeError("Local voice worker startup timed out") from exc
        if message.get("status") != "ready":
            self._shutdown()
            raise RuntimeError("Local voice engine failed to initialize: "
                               + str(message.get("error", "unknown error")))

    def synthesize(self, text: str, target: Path, voice: str = "", rate: int = 0):
        if rate != 0:
            raise ValueError("Use playback speed for local neural voices")
        if not voice or voice not in {v["id"] for v in self.profiles()}:
            raise ValueError("Select an installed local " + self.family + " voice")
        with self._lock:
            self._start()
            payload = {"action": "synthesize", "text": text, "voice": voice,
                       "output": str(Path(target).resolve())}
            try:
                self._process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
                self._process.stdin.flush()
                result = self._responses.get(timeout=900)
            except (OSError, queue.Empty) as exc:
                self._shutdown()
                raise RuntimeError("Local speech worker stopped or timed out") from exc
            if result.get("status") != "generated":
                self._shutdown()
                raise RuntimeError("Local speech synthesis failed: " + str(result.get("error", "unknown")))
            if not target.is_file() or target.stat().st_size <= 44:
                raise RuntimeError("Local voice worker returned no usable WAV")
            return result


class LocalVoiceSetup:
    """Explicit per-engine/voice installer; reported asynchronously in the UI."""
    def __init__(self, app_root: Path, installer: Path, engines: dict,
                 on_ready=None, platform: str | None = None):
        self.app_root = Path(app_root)
        self.installer = Path(installer)
        self.engines = engines
        self.on_ready = on_ready
        self.platform = platform or os.name
        self._lock = threading.Lock()
        self._state = {"active": False, "stage": "idle", "error": "", "selection": ""}
        self.log_path = self.app_root / "local-voices" / "logs" / "setup.log"

    def status(self):
        with self._lock:
            snapshot = self._state.copy()
        installed = {family: [p["id"] for p in engine.profiles()]
                     for family, engine in self.engines.items()}
        activity = ""
        if snapshot["active"] and self.log_path.is_file():
            try:
                with self.log_path.open("rb") as handle:
                    handle.seek(0, os.SEEK_END)
                    handle.seek(max(0, handle.tell() - 3000))
                    lines = [line.strip() for line in handle.read().decode(
                        "utf-8", errors="replace").splitlines() if line.strip()]
                    activity = lines[-1][:180] if lines else ""
            except OSError:
                pass
        return {**snapshot, "supported": self.platform == "nt",
                "installed": installed, "last_activity": activity,
                "log_path": str(self.log_path)}

    def start(self, selection: str):
        options = {item["id"]: item["engine"] for item in catalog()}
        if selection not in options:
            raise ValueError("Unknown or unapproved local voice download")
        if self.platform != "nt":
            raise RuntimeError("Integrated voice installer currently requires Windows")
        if not self.installer.is_file():
            raise RuntimeError("Bundled local voice installer is missing")
        with self._lock:
            if self._state["active"]:
                raise RuntimeError("Local voice installation is already running")
            self._state = {"active": True, "stage": "installing",
                           "error": "", "selection": selection}
        threading.Thread(target=self._run, args=(options[selection], selection),
                         name="SPR-LocalVoice-Install", daemon=True).start()
        return self.status()

    def _run(self, family, selection):
        error = ""
        try:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            args = ["powershell.exe", "-NoProfile", "-NonInteractive",
                    "-ExecutionPolicy", "Bypass", "-File", str(self.installer),
                    "-DataDir", str(self.app_root), "-Engine", family, "-Voice", selection]
            with self.log_path.open("ab") as log:
                log.write(("\n--- Install local voice " + selection + " ---\n").encode("utf-8"))
                log.flush()
                proc = subprocess.Popen(
                    args, cwd=str(self.installer.parent), stdin=subprocess.DEVNULL,
                    stdout=log, stderr=subprocess.STDOUT,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                code = proc.wait()
            if code:
                error = f"Local voice installation failed (exit {code}); inspect setup.log"
            elif not self.engines[family].available():
                error = "Installer completed but no usable voice was detected"
            elif self.on_ready:
                self.on_ready(family)
        except Exception as exc:
            error = str(exc)
        with self._lock:
            self._state = {"active": False, "stage": "failed" if error else "ready",
                           "error": error, "selection": selection}
