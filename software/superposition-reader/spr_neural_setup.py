"""User-initiated neural setup for the single-window offline SPR application.

Only a fixed script bundled with SPR may run. Dependencies and diagnostic logs
remain in the private per-user application folder, never the Git checkout.
"""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import threading


class NeuralSetup:
    def __init__(self, app_data: Path, installer: Path, engine, on_ready=None,
                 platform: str | None = None):
        self.app_data = Path(app_data)
        self.installer = Path(installer)
        self.engine = engine
        self.on_ready = on_ready
        self.platform = platform or os.name
        self._lock = threading.Lock()
        self._state = {"active": False, "stage": "idle", "error": "", "cpu_only": False}
        self.log_path = self.app_data / "neural" / "logs" / "setup.log"

    def status(self) -> dict:
        with self._lock:
            snapshot = dict(self._state)
        activity = ""
        if snapshot["active"]:
            try:
                with self.log_path.open("rb") as log:
                    log.seek(0, os.SEEK_END)
                    log.seek(max(0, log.tell() - 4096))
                    lines = [line.strip() for line in log.read().decode(
                        "utf-8", errors="replace").splitlines() if line.strip()]
                    if lines:
                        activity = lines[-1][:180]
            except OSError:
                pass
        return {**snapshot, "supported": self.platform == "nt",
                "installed": bool(self.engine.available()),
                "log_path": str(self.log_path), "last_activity": activity}

    def start(self, cpu_only: bool = False) -> dict:
        if type(cpu_only) is not bool:
            raise ValueError("CPU-only selection must be a boolean")
        if self.platform != "nt":
            raise RuntimeError("SPR neural installation currently requires Windows")
        if not self.installer.is_file():
            raise RuntimeError("Bundled SPR neural installer is missing")
        with self._lock:
            if self._state["active"]:
                raise RuntimeError("SPR neural installation is already running")
            self._state = {"active": True, "stage": "installing", "error": "",
                           "cpu_only": cpu_only}
        threading.Thread(target=self._run, args=(cpu_only,), daemon=True,
                         name="SPR-Neural-Install").start()
        return self.status()

    def _run(self, cpu_only: bool):
        error = ""
        try:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            args = ["powershell.exe", "-NoProfile", "-NonInteractive",
                    "-ExecutionPolicy", "Bypass", "-File", str(self.installer),
                    "-SkipPreview"]
            if cpu_only:
                args.append("-CpuOnly")
            with self.log_path.open("ab") as log:
                log.write(b"\n--- User-requested SPR neural setup ---\n")
                log.flush()
                process = subprocess.Popen(
                    args, cwd=str(self.installer.parent), stdin=subprocess.DEVNULL,
                    stdout=log, stderr=subprocess.STDOUT,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                code = process.wait()
            if code != 0:
                error = f"Neural setup failed (exit {code}). See local setup.log."
            elif not self.engine.available():
                error = "Neural setup finished without an installed Python runtime"
            elif self.on_ready:
                self.on_ready()
        except Exception as exc:
            # Never leave the setup gate permanently "active" if an
            # unexpected subprocess/activation error occurs.
            error = str(exc)
        with self._lock:
            self._state = {"active": False, "stage": "failed" if error else "ready",
                           "error": error, "cpu_only": cpu_only}
