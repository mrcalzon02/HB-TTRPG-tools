"""SuperPosition Reader prototype desktop host and loopback-only narration API.

Windows voice output uses SAPI; custom neural profiles will be plugged in later.
"""
from __future__ import annotations

import argparse
import base64
import binascii
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import os
import threading
import tempfile
from urllib.parse import urlsplit
import webbrowser
import zipfile

from spr_voices import VoiceLibrary
from spr_voicebox import VoiceboxEngine

from spr_core import Archive, MAX_DOCUMENT_BYTES, WindowsSapiEngine

ROOT = Path(__file__).resolve().parent
MAX_JSON_BYTES = (100 * 1024 * 1024 * 4 // 3) + 8192


class ReaderState:
    def __init__(self, archive: Archive, engine=None, additional_engines=None):
        self.archive = archive
        self.engine = engine
        self.engines = {"sapi": engine} if engine is not None else {}
        if additional_engines:
            self.engines.update(additional_engines)
        self.voices = VoiceLibrary(archive.root / "voices")
        self.lock = threading.Lock()
        self.cancel = threading.Event()
        self.job = {"active": False, "done": 0, "total": 0, "error": "", "cancelled": False}
        self.pending = []
        self.working_index = None

    def start_generation(self, book_id: str, indices: list[int], voice: str, rate: int,
                         priority: bool = False, engine_key: str = "sapi") -> dict:
        """Queue book chunks; allow read-ahead clicks to interrupt queue ORDER, not synthesis."""
        engine = self.engines.get(engine_key)
        if engine is None:
            raise RuntimeError("Selected offline voice engine is not available")
        manifest = self.archive.load(book_id)
        if not indices or any(i < 0 or i >= len(manifest["chunks"]) for i in indices):
            raise ValueError("Invalid narration chunk selection")
        indices = list(dict.fromkeys(indices))
        settings = {"book_id": book_id, "voice": voice, "rate": rate,
                    "engine": engine.engine_id}
        with self.lock:
            if self.job["active"]:
                if any(self.job.get(k) != v for k, v in settings.items()):
                    raise RuntimeError("Finish or cancel the current book/voice before changing settings")
                for i in reversed(indices) if priority else indices:
                    if i == self.working_index:
                        continue
                    if i in self.pending:
                        if priority:
                            self.pending.remove(i)
                            self.pending.insert(0, i)
                    elif priority:
                        self.pending.insert(0, i)
                    else:
                        self.pending.append(i)
                self.job["total"] = max(self.job["total"],
                                        self.job["done"] + len(self.pending) +
                                        int(self.working_index is not None))
                return self.job.copy()
            self.cancel.clear()
            self.pending = indices[:]
            self.working_index = None
            self.job = {"active": True, "done": 0, "total": len(self.pending),
                        "error": "", "cancelled": False, **settings}

        def worker():
            try:
                while True:
                    with self.lock:
                        if self.cancel.is_set() or not self.pending:
                            break
                        current = self.pending.pop(0)
                        self.working_index = current
                    self.archive.generate_chunk(book_id, current, engine, voice=voice, rate=rate)
                    with self.lock:
                        self.job["done"] += 1
                        self.working_index = None
            except Exception as exc:
                with self.lock:
                    self.job["error"] = str(exc)
            finally:
                with self.lock:
                    self.working_index = None
                    self.pending.clear()
                    self.job["cancelled"] = self.cancel.is_set()
                    self.job["active"] = False

        threading.Thread(target=worker, name="SPR-Narration", daemon=True).start()
        return self.status()

    def status(self) -> dict:
        with self.lock:
            return {**self.job, "queued": len(self.pending),
                    "working_index": self.working_index}


def make_handler(state: ReaderState):
    class Handler(BaseHTTPRequestHandler):
        server_version = "SPR/0.1"

        def log_message(self, format, *args):
            # Avoid leaking local private document titles or text to server logs.
            return

        def _json(self, payload, status=200):
            content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)

        def _file(self, path: Path, content_type="application/octet-stream", filename=None):
            if not path.is_file():
                self._json({"error": "Not found"}, 404)
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(path.stat().st_size))
            self.send_header("Cache-Control", "no-store")
            if filename:
                self.send_header("Content-Disposition", "attachment; filename=" + filename)
            self.end_headers()
            with path.open("rb") as f:
                while data := f.read(65536):
                    self.wfile.write(data)

        def _safe_origin(self):
            host = self.headers.get("Host", "")
            if host != f"127.0.0.1:{self.server.server_port}":
                return False
            origin = self.headers.get("Origin")
            return origin is None or origin == f"http://127.0.0.1:{self.server.server_port}"

        def do_GET(self):
            if not self._safe_origin():
                self._json({"error": "Only the local SPR window may access this server"}, 403)
                return
            segments = urlsplit(self.path).path.strip("/").split("/")
            try:
                if segments == [""] or segments == ["index.html"]:
                    return self._file(ROOT / "reader.html", "text/html; charset=utf-8")
                if segments == ["api", "library"]:
                    return self._json(state.archive.library())
                if segments == ["api", "voice-profiles"]:
                    return self._json(state.voices.list())
                if segments == ["api", "voices"]:
                    return self._json({"voices": state.engine.voices() if state.engine else [],
                                       "engine": state.engine.engine_id if state.engine else "unavailable"})
                if segments == ["api", "voice-engines"]:
                    local = [{"key": "sapi", "label": "Windows SAPI 5", "engine_id": state.engine.engine_id}] if state.engine else []
                    voicebox = state.engines.get("voicebox-qwen")
                    if voicebox:
                        try:
                            profiles = voicebox.profiles()
                        except RuntimeError:
                            profiles = None
                        if profiles is not None:
                            for key, instance in state.engines.items():
                                if key.startswith("voicebox-"):
                                    local.append({"key": key, "label": "Voicebox — " + instance.model,
                                                  "engine_id": instance.engine_id, "profiles": profiles})
                    return self._json(local)
                if segments == ["api", "job"]:
                    return self._json(state.status())
                if len(segments) == 3 and segments[:2] == ["api", "book"]:
                    record = state.archive.load(segments[2])
                    record["position"] = state.archive.read_position(segments[2])
                    return self._json(record)
                if len(segments) == 4 and segments[:2] == ["api", "audio"]:
                    return self._file(state.archive.audio_file(segments[2], int(segments[3])), "audio/wav")
                if len(segments) == 3 and segments[:2] == ["api", "export"]:
                    return self._file(state.archive.export_wav(segments[2]), "audio/wav", "superposition-narration.wav")
                self._json({"error": "Not found"}, 404)
            except (ValueError, IndexError, FileNotFoundError, OSError, json.JSONDecodeError) as exc:
                self._json({"error": str(exc)}, 400)

        def do_POST(self):
            if not self._safe_origin():
                self._json({"error": "Invalid Host or Origin"}, 403)
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 1 <= size <= MAX_JSON_BYTES:
                    raise ValueError("Invalid request size")
                if "application/json" not in self.headers.get("Content-Type", ""):
                    raise ValueError("Only JSON requests are supported")
                request = json.loads(self.rfile.read(size))
                path = urlsplit(self.path).path
                if path == "/api/voice-profile":
                    info = state.voices.create(request["name"], request.get("style", "natural"))
                    return self._json({"id": info["id"], "name": info["name"], "status": info["status"]}, 201)
                if path == "/api/voice-sample":
                    data = base64.b64decode(request["base64"], validate=True)
                    profile_id = request["profile_id"]
                    filename = str(request["name"])
                    if filename.lower().endswith(".zip"):
                        return self._json(state.voices.import_zip(profile_id, data), 201)
                    entry = state.voices.add_sample(profile_id, filename, data, request.get("transcript", ""))
                    return self._json({"name": entry["name"], "bytes": entry["bytes"]}, 201)
                if path == "/api/position":
                    return self._json(state.archive.save_position(
                        request["book_id"], int(request["index"]),
                        float(request.get("fraction", 0.0))))
                if path == "/api/import":
                    data = base64.b64decode(request["base64"], validate=True)
                    record = state.archive.import_document(request["name"], data)
                    return self._json({"id": record["id"], "chunks": len(record["chunks"])}, 201)
                if path == "/api/generate":
                    book_id = request["book_id"]
                    manifest = state.archive.load(book_id)
                    indices = (list(range(len(manifest["chunks"]))) if request.get("index") is None
                               else [int(request["index"])])
                    voice = str(request.get("voice", ""))[:180]
                    rate = int(request.get("rate", 0))
                    if not -10 <= rate <= 10:
                        raise ValueError("SAPI rate must be -10..10")
                    return self._json(state.start_generation(
                        book_id, indices, voice, rate, priority=bool(request.get("priority", False)),
                        engine_key=str(request.get("engine_key", "sapi"))), 202)
                if path == "/api/cancel":
                    state.cancel.set()
                    return self._json({"cancel_requested": True})
                return self._json({"error": "Not found"}, 404)
            except (ValueError, TypeError, KeyError, IndexError, OSError, binascii.Error,
                    RuntimeError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
                self._json({"error": str(exc)}, 400)

    return Handler


def self_check(report_path: str = "") -> int:
    """Source/portable-package smoke test; does not assert audible Windows playback."""
    checks = {"reader_html": (ROOT / "reader.html").is_file(),
              "sapi_script": (ROOT / "sapi_synthesize.ps1").is_file()}
    error = ""
    try:
        import fitz  # noqa: F401 - verifies bundled optional PDF parser
        import docx  # noqa: F401 - verifies bundled optional DOCX parser
        import webview  # noqa: F401 - verifies bundled desktop UI package
        with tempfile.TemporaryDirectory() as folder:
            archive = Archive(Path(folder))
            record = archive.import_document("smoke.txt", b"Hello from the SuperPosition Reader.")
            checks["private_archive"] = len(archive.load(record["id"])["chunks"]) == 1
            archive.save_position(record["id"], 0, 0.5)
            checks["position_roundtrip"] = archive.read_position(record["id"])["fraction"] == 0.5
    except Exception as exc:
        error = str(exc)
    result = {"ok": all(checks.values()) and not error, "checks": checks, "error": error,
              "windows_sapi_voices": WindowsSapiEngine().voices() if os.name == "nt" else []}
    if report_path:
        Path(report_path).write_text(json.dumps(result, indent=2), encoding="utf-8")
    else:
        print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 1


def launch():
    parser = argparse.ArgumentParser(description="SuperPosition Reader offline desktop prototype")
    parser.add_argument("--browser", action="store_true", help="Use system browser instead of native window")
    parser.add_argument("--port", type=int, default=0, help="Loopback port (0 chooses an available port)")
    parser.add_argument("--self-check", action="store_true", help="Verify bundled parser, UI, SAPI script and archive")
    parser.add_argument("--report", type=str, default="", help="Write --self-check results as JSON to this path")
    args = parser.parse_args()
    if args.self_check:
        raise SystemExit(self_check(args.report))
    archive = Archive()
    try:
        engine = WindowsSapiEngine() if os.name == "nt" else None
    except RuntimeError:
        engine = None
    voicebox = {("voicebox-" + model): VoiceboxEngine(model)
                for model in ("qwen", "luxtts", "chatterbox")}
    state = ReaderState(archive, engine, additional_engines=voicebox)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(state))
    server.daemon_threads = True
    url = f"http://127.0.0.1:{server.server_port}/"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        if args.browser:
            webbrowser.open(url)
            input("SPR is running locally. Press Enter to shut it down.\n")
        else:
            try:
                import webview
            except ImportError as exc:
                raise SystemExit("Native window requires pywebview; run install-windows.ps1") from exc
            webview.create_window("SuperPosition Reader — SPR", url, width=1180, height=820, min_size=(780, 580))
            webview.start()
    finally:
        state.cancel.set()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    launch()
