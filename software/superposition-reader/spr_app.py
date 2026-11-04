"""SuperPosition Reader prototype desktop host and loopback-only narration API.

Windows voice output uses SAPI; custom neural profiles will be plugged in later.
"""
from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import os
import threading
import tempfile
from urllib.parse import urlsplit
import webbrowser
import wave
import zipfile

from spr_voices import VoiceLibrary
from spr_voicebox import VoiceboxEngine
from spr_bootstrap import seed_examples
from spr_luxtts_engine import SprLuxEngine
from spr_local_voices import LocalVoiceEngine, LocalVoiceSetup, catalog as local_voice_catalog
from spr_neural_setup import NeuralSetup
from spr_narrate import chapter_plan
from spr_voice_assets import verify_previews

from spr_core import Archive, MAX_DOCUMENT_BYTES, WindowsSapiEngine

ROOT = Path(__file__).resolve().parent
MAX_JSON_BYTES = (100 * 1024 * 1024 * 4 // 3) + 8192


class ReaderState:
    def __init__(self, archive: Archive, engine=None, additional_engines=None,
                 bootstrap=None):
        self.archive = archive
        self.bootstrap = bootstrap or {"books_imported": [], "books_skipped": [],
                                       "warnings": [], "voice_profile_id": None}
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
        self.neural_setup = None
        self.local_voice_setup = None
        self._audition_lock = threading.Lock()

    def start_generation(self, book_id: str, indices: list[int], voice: str, rate: int,
                         priority: bool = False, engine_key: str = "sapi") -> dict:
        """Queue book chunks; allow read-ahead clicks to interrupt queue ORDER, not synthesis."""
        if self.neural_setup and self.neural_setup.status()["active"]:
            raise RuntimeError("Neural setup is running; finish installation before narration")
        if self.local_voice_setup and self.local_voice_setup.status()["active"]:
            raise RuntimeError("Local voice installation is running; finish installation before narration")
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
                if segments == ["api", "bootstrap"]:
                    return self._json(state.bootstrap)
                if len(segments) == 3 and segments[:2] == ["api", "voice-preview"]:
                    name = {
                        "bdo": "sphinx-bdo-opening.wav",
                        "nowhere": "sphinx-nowhere-opening.wav",
                        "bdo-long": "sphinx-bdo-full-passage.wav",
                        "nowhere-long": "sphinx-nowhere-full-passage.wav"
                    }.get(segments[2])
                    if name is None:
                        return self._json({"error": "Unknown preview"}, 404)
                    return self._file(ROOT / "assets" / "voice" / name, "audio/wav")
                if segments == ["api", "voice-profiles"]:
                    return self._json(state.voices.list())
                if segments == ["api", "voices"]:
                    return self._json({"voices": state.engine.voices() if state.engine else [],
                                       "engine": state.engine.engine_id if state.engine else "unavailable"})
                if segments == ["api", "local-voices"]:
                    options = []
                    for item in local_voice_catalog():
                        engine = state.local_voice_setup.engines.get(item["engine"]) if state.local_voice_setup else None
                        installed = bool(engine and engine.available() and (
                            item["engine"] == "kokoro" or any(
                                profile["id"].split("#")[0] == item["id"]
                                for profile in engine.profiles())))
                        options.append({**item, "installed": installed})
                    return self._json(options)
                if segments == ["api", "local-voice-setup"]:
                    return self._json(state.local_voice_setup.status() if state.local_voice_setup
                                      else {"active": False, "supported": False,
                                            "stage": "unavailable", "error": ""})
                if len(segments) == 3 and segments[:2] == ["api", "local-voice-preview"]:
                    digest = segments[2]
                    if len(digest) != 24 or any(c not in "0123456789abcdef" for c in digest):
                        raise ValueError("Invalid voice audition identifier")
                    return self._file(state.archive.root / "local-voices" / "previews" /
                                      (digest + ".wav"), "audio/wav")
                if segments == ["api", "voice-engines"]:
                    local = [{"key": "sapi", "label": "Windows SAPI 5", "engine_id": state.engine.engine_id}] if state.engine else []
                    own = state.engines.get("spr-lux")
                    if own:
                        local.insert(0, {"key": "spr-lux", "label": "SPR Neural — LuxTTS (offline)",
                                         "engine_id": own.engine_id, "profiles": own.profiles(),
                                         "default_voice": own.default_voice(), "online": True})
                    for family, label in (("kokoro", "Kokoro 82M"), ("piper", "Piper")):
                        instance = state.engines.get(family)
                        if instance:
                            local.append({"key": family, "label": label + " — British voices (offline)",
                                          "engine_id": instance.engine_id,
                                          "profiles": instance.profiles(), "online": True})
                    voicebox = state.engines.get("voicebox-qwen")
                    if voicebox:
                        try:
                            profiles = voicebox.profiles()
                            online = True
                        except RuntimeError:
                            profiles = []
                            online = False
                        for key, instance in state.engines.items():
                            if key.startswith("voicebox-"):
                                local.append({"key": key, "label": "Voicebox — " + instance.model,
                                              "engine_id": instance.engine_id, "profiles": profiles,
                                              "online": online})
                    return self._json(local)
                if segments == ["api", "job"]:
                    return self._json(state.status())
                if segments == ["api", "neural-setup"]:
                    return self._json(state.neural_setup.status() if state.neural_setup
                                      else {"active": False, "supported": False,
                                            "installed": False, "stage": "unavailable", "error": ""})
                if len(segments) == 3 and segments[:2] == ["api", "book"]:
                    record = state.archive.load(segments[2])
                    record["position"] = state.archive.read_position(segments[2])
                    return self._json(record)
                if len(segments) == 4 and segments[:2] == ["api", "audio"]:
                    return self._file(state.archive.audio_file(segments[2], int(segments[3])), "audio/wav")
                if len(segments) == 3 and segments[:2] == ["api", "export"]:
                    return self._file(state.archive.export_wav(segments[2]), "audio/wav", "superposition-narration.wav")
                if len(segments) == 3 and segments[:2] == ["api", "export-chapters"]:
                    return self._file(state.archive.export_chapters_zip(segments[2]), "application/zip", "superposition-chapters.zip")
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
                    if request.get("index") is not None:
                        if "chapter_from" in request or "chapter_through" in request:
                            raise ValueError("Choose one passage or a chapter range, not both")
                        indices = [int(request["index"])]
                    else:
                        plan = chapter_plan(
                            state.archive, book_id,
                            first=int(request.get("chapter_from", 1)),
                            last=(int(request["chapter_through"])
                                  if request.get("chapter_through") is not None else None))
                        indices = list(range(plan["chunk_from"], plan["chunk_through"]))
                    voice = str(request.get("voice", ""))[:180]
                    rate = int(request.get("rate", 0))
                    if not -10 <= rate <= 10:
                        raise ValueError("SAPI rate must be -10..10")
                    return self._json(state.start_generation(
                        book_id, indices, voice, rate, priority=bool(request.get("priority", False)),
                        engine_key=str(request.get("engine_key", "sapi"))), 202)
                if path == "/api/local-voice-setup":
                    if state.local_voice_setup is None:
                        raise RuntimeError("Local voice installer is unavailable")
                    if state.status()["active"] or (state.neural_setup and state.neural_setup.status()["active"]):
                        raise RuntimeError("Finish narration or neural setup before installing voices")
                    return self._json(state.local_voice_setup.start(str(request["selection"])), 202)
                if path == "/api/local-voice-audition":
                    family = str(request.get("engine_key", ""))
                    voice = str(request.get("voice", ""))
                    if family not in ("kokoro", "piper"):
                        raise ValueError("Auditions are supported for Kokoro and Piper")
                    engine = state.engines.get(family)
                    if not engine or voice not in {p["id"] for p in engine.profiles()}:
                        raise ValueError("Select an installed voice before auditioning")
                    if state.status()["active"]:
                        raise RuntimeError("Finish narration before auditioning another voice")
                    digest = hashlib.sha256((engine.engine_id + ":" + voice).encode()).hexdigest()[:24]
                    target = state.archive.root / "local-voices" / "previews" / (digest + ".wav")
                    with state._audition_lock:
                        if not target.is_file():
                            target.parent.mkdir(parents=True, exist_ok=True)
                            temp = target.with_suffix(".partial.wav")
                            try:
                                engine.synthesize("The evening light settled over the quiet countryside. "
                                                  "Beyond the distant hills, a new adventure was beginning.",
                                                  temp, voice=voice)
                                with wave.open(str(temp), "rb") as wav:
                                    if wav.getnframes() <= 0:
                                        raise ValueError("Voice generated empty audition audio")
                                os.replace(temp, target)
                            finally:
                                temp.unlink(missing_ok=True)
                    return self._json({"url": "/api/local-voice-preview/" + digest})
                if path == "/api/neural-setup":
                    if state.neural_setup is None:
                        raise RuntimeError("Neural setup is unavailable in this host")
                    if state.status()["active"]:
                        raise RuntimeError("Finish or cancel narration before installing neural dependencies")
                    return self._json(state.neural_setup.start(
                        cpu_only=request.get("cpu_only", False)), 202)
                if path == "/api/cancel":
                    state.cancel.set()
                    return self._json({"cancel_requested": True})
                return self._json({"error": "Not found"}, 404)
            except (ValueError, TypeError, KeyError, IndexError, OSError, binascii.Error,
                    RuntimeError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
                self._json({"error": str(exc)}, 400)

    return Handler


def self_check(report_path: str = "", require_examples: bool = False) -> int:
    """Source/portable-package smoke test; does not assert audible Windows playback."""
    reader_path = ROOT / "reader.html"
    html = reader_path.read_text(encoding="utf-8") if reader_path.is_file() else ""
    checks = {"reader_html": reader_path.is_file(),
              "sapi_script": (ROOT / "sapi_synthesize.ps1").is_file(),
              "integrated_neural_setup": (ROOT / "install-neural-windows.ps1").is_file(),
              "local_voice_worker": (ROOT / "spr_local_voice_worker.py").is_file(),
              "local_voice_installer": (ROOT / "install-local-voices-windows.ps1").is_file(),
              "local_voice_controls": all('id="' + name + '"' in html for name in
                                          ("localVoiceChoice", "localVoiceInstall", "localVoiceAudition")),
              "unified_gui_controls": all(
                  'id="' + name + '"' in html for name in
                  ("neuralInstall", "neuralInstallMode", "chapterFrom",
                   "chapterThrough", "generate", "exportChapters"))}
    error = ""
    try:
        import fitz  # noqa: F401 - verifies bundled optional PDF parser
        import docx  # noqa: F401 - verifies bundled optional DOCX parser
        import webview  # noqa: F401 - verifies bundled desktop UI package
        with tempfile.TemporaryDirectory() as folder:
            archive = Archive(Path(folder))
            record = archive.import_document("smoke.txt", b"Hello from the SuperPosition Reader.")
            checks["private_archive"] = len(archive.load(record["id"])["chunks"]) == 1
            plan = chapter_plan(archive, record["id"])
            checks["unified_chapter_planner"] = plan["chunk_from"] == 0 and plan["chunk_through"] == 1
            archive.save_position(record["id"], 0, 0.5)
            checks["position_roundtrip"] = archive.read_position(record["id"])["fraction"] == 0.5
            if require_examples:
                bootstrap = seed_examples(archive, ROOT)
                checks["bundled_books"] = len(bootstrap["books_imported"]) == 4
                checks["sphinx_sample"] = bootstrap["voice_samples"] >= 1
                checks.update({"verified_" + name: valid
                               for name, valid in verify_previews(ROOT).items()})
                if bootstrap["warnings"]:
                    raise RuntimeError("Bundled examples: " + "; ".join(bootstrap["warnings"]))
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
    parser.add_argument("--require-examples", action="store_true", help="Require all default books and Sphinx recording")
    args = parser.parse_args()
    if args.self_check:
        raise SystemExit(self_check(args.report, require_examples=args.require_examples))
    archive = Archive()
    try:
        bootstrap = seed_examples(archive, ROOT)
    except (ValueError, OSError, KeyError, RuntimeError) as error:
        bootstrap = {"books_imported": [], "books_skipped": [],
                     "warnings": [str(error)], "voice_profile_id": None}
    try:
        engine = WindowsSapiEngine() if os.name == "nt" else None
    except RuntimeError:
        engine = None
    voicebox = {("voicebox-" + model): VoiceboxEngine(model)
                for model in ("qwen", "luxtts", "chatterbox")}
    own_lux = SprLuxEngine(archive.root)
    if own_lux.available():
        voicebox["spr-lux"] = own_lux
    local_engines = {family: LocalVoiceEngine(archive.root, family)
                     for family in ("kokoro", "piper")}
    voicebox.update({family: candidate for family, candidate in local_engines.items()
                     if candidate.available()})
    state = ReaderState(archive, engine, additional_engines=voicebox,
                        bootstrap=bootstrap)
    state.local_voice_setup = LocalVoiceSetup(
        archive.root, ROOT / "install-local-voices-windows.ps1", local_engines,
        on_ready=lambda family: state.engines.__setitem__(family, local_engines[family]))
    state.neural_setup = NeuralSetup(
        archive.root, ROOT / "install-neural-windows.ps1", own_lux,
        on_ready=lambda: state.engines.__setitem__("spr-lux", own_lux))
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
        if own_lux.available():
            own_lux.close()
        for candidate in local_engines.values():
            candidate.close()


if __name__ == "__main__":
    launch()
