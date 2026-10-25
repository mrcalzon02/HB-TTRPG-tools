#!/usr/bin/env python3
"""Single-window Windows/Linux wrapper around the existing local archive server.

The HTTP listener is a thread in this GUI process, not a detached daemon.
Closing the window ends the listener, the optional managed voice backend, and
any outstanding local generation work.
"""
from __future__ import annotations

import argparse
import os
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from server import HubState, handler_factory

DEFAULT_PORT = 17861


def default_workspace() -> Path:
    if os.name == "nt":
        home = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
        return home / "HB-TTRPG-tools" / "voicebox-production"
    home = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    return home / "hb-ttrpg-tools" / "voicebox-production"


class DesktopRuntime:
    """Own exactly one loopback listener for the lifetime of one native window."""

    def __init__(self, root: Path, private: Path, voicebox: Path | None = None,
                 port: int = DEFAULT_PORT):
        if not 1024 <= port <= 65535:
            raise ValueError("Choose a localhost port between 1024 and 65535")
        self.root = Path(root)
        self.private = Path(private)
        self.voicebox = Path(voicebox) if voicebox else None
        self.port = port
        self.state: HubState | None = None
        self.server: ThreadingHTTPServer | None = None
        self.thread: threading.Thread | None = None
        self._lock = threading.RLock()
        self._stopped = False
        self._started = False
        self.interrupted_jobs = False

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}/__local/"

    def start(self) -> str:
        with self._lock:
            if self._started or self._stopped:
                raise RuntimeError("A desktop runtime can only be started once")
            state = HubState(self.root, self.private, self.voicebox)
            try:
                # Binding before opening the GUI is also the single-instance guard.
                server = ThreadingHTTPServer(("127.0.0.1", self.port),
                                             handler_factory(state))
            except BaseException:
                state.close()
                raise
            self.state, self.server = state, server
            self.thread = threading.Thread(target=server.serve_forever,
                                           kwargs={"poll_interval": 0.2},
                                           name="HB-TTRPG-local-http", daemon=True)
            try:
                self.thread.start()
            except BaseException:
                server.server_close()
                state.close()
                self.server = None
                self.state = None
                raise
            self._started = True
            return self.url

    def stop(self) -> None:
        # Called both when the native window closes and in run()'s finally.
        with self._lock:
            if self._stopped:
                return
            self._stopped = True
            state, server, thread = self.state, self.server, self.thread
            if state is not None:
                with state.lock:
                    self.interrupted_jobs = any(
                        record.get("status") not in ("completed", "failed")
                        for record in state.jobs.values()
                    )
        try:
            if server is not None:
                server.shutdown()
                server.server_close()
                if thread is not None and thread is not threading.current_thread():
                    thread.join(timeout=3)
        finally:
            if state is not None:
                state.close()

    def run(self, webview_module=None) -> None:
        if webview_module is None:
            try:
                import webview as webview_module
            except ImportError as error:
                raise RuntimeError(
                    "Desktop GUI is not installed. Run the Windows or Linux installer "
                    "from tools/local-hub, which installs pywebview."
                ) from error

        url = self.start()
        try:
            window = webview_module.create_window(
                "HB-TTRPG Local Workbench", url=url, width=1280, height=820,
                min_size=(800, 540), background_color="#101721",
            )
            # The event handles native X/close, not browser unload heuristics.
            window.events.closed += self.stop
            webview_module.start(gui="gtk" if sys.platform.startswith("linux") else None)
        finally:
            self.stop()
            # ThreadPoolExecutor jobs currently doing voice inference can block
            # Python exit for many minutes. The owned Voicebox process and HTTP
            # socket have already been stopped; end in-flight work with the GUI.
            if self.interrupted_jobs:
                os._exit(0)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path,
                        default=Path(__file__).resolve().parents[2])
    parser.add_argument("--private", type=Path, default=default_workspace() / "private")
    parser.add_argument("--voicebox", type=Path,
                        default=default_workspace() / "source" / "voicebox")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args(argv)
    try:
        DesktopRuntime(args.root, args.private, args.voicebox, args.port).run()
        return 0
    except (OSError, RuntimeError, ValueError) as error:
        message = (
            f"HB-TTRPG Local Workbench could not start: {error}\n"
            "If another local workbench is already open, close it before retrying."
        )
        if os.name == "nt":
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(None, message,
                                                  "HB-TTRPG Local Workbench", 0x10)
            except (AttributeError, OSError):
                print(message, file=sys.stderr)
        else:
            print(message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
