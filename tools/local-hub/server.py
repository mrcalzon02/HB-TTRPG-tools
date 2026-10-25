#!/usr/bin/env python3
"""Localhost-only HB-TTRPG static archive and private Voicebox narration console."""
from __future__ import annotations
import argparse
import json
import mimetypes
import os
import re
import secrets
import subprocess
import sys
import threading
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "voicebox"))
from narration_batch import render, validate_manifest
from voice_intake import multipart, document, lines as parse_voice_lines, convert_sample, profile as register_voice_profile

BASE = "/__local"
BLOCKED = {".git", ".github", ".venv", "venv", "node_modules", "__pycache__", "private",
           "secrets", "tools", "scripts", "tests"}
ALLOWED = {".html", ".css", ".js", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp",
           ".gif", ".ico", ".woff", ".woff2", ".ttf", ".wav", ".mp3", ".ogg",
           ".mp4", ".webm", ".pdf", ".txt", ".md", ".wasm", ".glb", ".gltf",
           ".bin", ".obj", ".mtl", ".csv", ".webmanifest", ".xml", ".avif"}

def catalog(root: Path):
    pages = []
    for file in sorted(root.rglob("*.html")):
        relative = file.relative_to(root)
        if any(part.startswith(".") or part.lower() in BLOCKED for part in relative.parts):
            continue
        try:
            markup = file.read_text(encoding="utf-8", errors="replace")[:10000]
        except OSError:
            continue
        match = re.search(r"<title[^>]*>(.*?)</title>", markup, re.I | re.S)
        title = (re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", match.group(1))).strip()
                 if match else relative.stem.replace("-", " ").title())
        pages.append({"name": title[:120], "path": "/" + relative.as_posix(),
                      "section": relative.parts[0] if len(relative.parts) > 1 else "Main archive"})
    return pages

class HubState:
    def __init__(self, root: Path, private: Path, voicebox: Path | None = None):
        self.root, self.private = Path(root).resolve(), Path(private).resolve()
        if self.private == self.root or self.root in self.private.parents:
            raise ValueError("The private output directory cannot be inside the public checkout")
        self.private.mkdir(parents=True, exist_ok=True)
        self.voicebox = Path(voicebox).resolve() if voicebox else None
        self.pages = catalog(self.root)
        self.jobs = {}
        self.lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="narration-local")
        self.backend_process = None
        self.backend_log = None
        self.backend_start_error = None

    def backend_ready(self):
        try:
            with urllib.request.urlopen("http://127.0.0.1:17493/profiles", timeout=2) as response:
                return response.status == 200
        except (OSError, urllib.error.URLError):
            return False

    def start_backend_if_installed(self):
        # A broken optional speech engine must not take down the archive host.
        if self.backend_ready() or self.backend_process is not None or self.backend_start_error or not self.voicebox:
            return
        interpreter = self.voicebox / "backend" / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        if not interpreter.is_file() or not (self.voicebox / "backend/main.py").is_file():
            self.backend_start_error = "Voicebox is not installed; archive browsing remains available."
            return
        # A missing API module is a repairable install problem, not a crash.
        # Use the already-created interpreter; never install from the web UI.
        try:
            probe = subprocess.run(
                [str(interpreter), "-c",
                 "import importlib.util,sys; names=('uvicorn','fastapi','sqlalchemy','torch','zipvoice'); "
                 "missing=[n for n in names if importlib.util.find_spec(n) is None]; "
                 "print(', '.join(missing)); sys.exit(bool(missing))"],
                cwd=self.voicebox, capture_output=True, text=True, timeout=20,
            )
            if probe.returncode:
                missing = probe.stdout.strip() or probe.stderr.strip() or "unknown module"
                self.backend_start_error = (
                    "Voicebox Python dependencies are incomplete: %s. "
                    "Run tools/voicebox/repair-local-backend.ps1 from the repository, "
                    "then restart the local workbench." % missing
                )
                return
        except (OSError, subprocess.TimeoutExpired) as error:
            self.backend_start_error = (
                "Cannot check local Voicebox dependencies: %s. "
                "The archive remains available." % error
            )
            return
        try:
            self.backend_log = (self.private / "voicebox-backend.log").open("ab")
            self.backend_process = subprocess.Popen(
                [str(interpreter), "-m", "backend.main", "--host", "127.0.0.1", "--port", "17493"],
                cwd=self.voicebox, stdout=self.backend_log, stderr=subprocess.STDOUT,
            )
        except (OSError, ValueError) as error:
            self.backend_start_error = "Voicebox could not start: %s. Archive browsing remains available." % error
            if self.backend_log is not None:
                self.backend_log.close()
                self.backend_log = None

    def profiles(self):
        self.start_backend_if_installed()
        if self.backend_process is not None and self.backend_process.poll() is not None:
            self.backend_start_error = "Voicebox exited with code %s; inspect %s" % (
                self.backend_process.returncode, self.private / "voicebox-backend.log")
            self.backend_process = None
        if self.backend_start_error:
            raise RuntimeError(self.backend_start_error)
        try:
            with urllib.request.urlopen("http://127.0.0.1:17493/profiles", timeout=3) as response:
                profiles = json.load(response)
            if not isinstance(profiles, list):
                raise ValueError("Voicebox returned invalid profile data")
            return [{"id": str(p["id"]), "name": str(p.get("name", "Unnamed")),
                     "samples": int(p.get("sample_count", 0))} for p in profiles]
        except (OSError, ValueError, urllib.error.URLError) as error:
            raise RuntimeError("Voicebox is not ready; finish installing the speech engine locally.") from error


    def stored_references(self):
        folder = self.private / "references"
        return [p for p in sorted(folder.glob("owner-primary-*.wav"))
                if p.is_file() and not p.is_symlink()][:3] if folder.is_dir() else []

    def submit_intake(self, fields, files):
        if fields.get("consent") != "yes":
            raise ValueError("Confirm that you own or are authorized to use the voice recording")
        script = fields.get("lines", "")
        if "document" in files:
            name, body = files["document"]
            script = script + "\n" + document(name, body)
        takes = parse_voice_lines(script)
        existing_id = fields.get("voice", "").strip()
        name = fields.get("profile_name", "My Voice").strip()
        if not existing_id and (not name or len(name) > 100):
            raise ValueError("Name your new voice profile")
        source = fields.get("source", "")
        if existing_id:
            available = self.profiles()
            if not any(p["id"] == existing_id and p["samples"] > 0 for p in available):
                raise ValueError("Select a local profile that already has reference samples")
        elif "audio" not in files and (source != "saved" or not self.stored_references()):
            raise ValueError("Drop a voice sample, or choose your saved private references")
        if "audio" in files and Path(files["audio"][0]).suffix.lower() not in {".wav", ".mp3", ".m4a", ".flac", ".ogg"}:
            raise ValueError("Voice reference must be WAV, MP3, M4A, FLAC or OGG")
        job_id = secrets.token_hex(10)
        with self.lock:
            self.jobs[job_id] = {"id": job_id, "status": "queued", "finished": 0,
                "total": len(takes), "project": fields.get("project", "narration"),
                "error": None}
        request = {"voice": existing_id, "profile_name": name, "takes": takes,
                   "source": source, "audio": files.get("audio"),
                   "reference_text": fields.get("reference_text", ""),
                   "project": fields.get("project", "narration")}
        self.executor.submit(self._run_intake, job_id, request)
        return {"id": job_id, "status": "queued"}

    def _run_intake(self, job_id, request):
        def update(**changes):
            with self.lock:
                self.jobs[job_id].update(changes)
        def progress(done, total):
            update(finished=done)
        try:
            update(status="preparing-reference")
            with tempfile.TemporaryDirectory(prefix="local-voice-", dir=self.private) as tmp:
                if request["voice"]:
                    pid = request["voice"]
                else:
                    if request["audio"]:
                        filename, audio = request["audio"]
                        samples = [convert_sample(filename, audio, Path(tmp))]
                    else:
                        samples = self.stored_references()
                        if not samples:
                            raise ValueError("Previously saved private voice samples were not found")
                    update(status="creating-profile")
                    pid = register_voice_profile(request["profile_name"], samples,
                                                 request["reference_text"])
                update(status="generating", voice=pid)
                manifest = render(
                    {"project": request["project"], "voice": pid,
                     "engine": "luxtts", "lines": request["takes"]},
                    self.private / "generated" / job_id, progress=progress)
                update(status="completed", output=str(self.private / "generated" / job_id),
                    manifest={"lineCount": manifest["lineCount"], "engine": "luxtts"},
                    download=BASE + "/outputs/" + job_id + "/review-pack.zip")
        except Exception as error:
            update(status="failed", error=str(error)[:500])

    def submit(self, source):
        data = validate_manifest(source)  # Caller cannot submit arbitrary filesystem paths.
        job_id = secrets.token_hex(10)
        with self.lock:
            self.jobs[job_id] = {"id": job_id, "status": "queued", "finished": 0,
                                 "total": len(data["lines"]), "project": data["project"], "error": None}
        self.executor.submit(self._run_job, job_id, data)
        return {"id": job_id, "status": "queued"}

    def _run_job(self, job_id, data):
        with self.lock:
            self.jobs[job_id]["status"] = "running"
        def progress(done, total):
            with self.lock:
                self.jobs[job_id]["finished"] = done
        try:
            output = self.private / "generated" / job_id
            result = render(data, output, progress=progress)
            with self.lock:
                self.jobs[job_id].update(status="completed", output=str(output),
                    manifest={"lineCount": result["lineCount"], "engine": result["engine"]},
                    download=BASE + "/outputs/" + job_id + "/review-pack.zip")
        except Exception as error:
            with self.lock:
                self.jobs[job_id].update(status="failed", error=str(error)[:400])

    def job(self, job_id):
        with self.lock:
            record = self.jobs.get(job_id)
            return dict(record) if record else None

    def close(self):
        self.executor.shutdown(wait=False, cancel_futures=True)
        if self.backend_process is not None and self.backend_process.poll() is None:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
            except (OSError, subprocess.TimeoutExpired):
                print("[local-hub] Optional Voicebox backend did not stop cleanly", file=sys.stderr)
        if self.backend_log is not None:
            self.backend_log.close()

def handler_factory(state: HubState):
    ui = Path(__file__).parent
    class Handler(BaseHTTPRequestHandler):
        server_version = "HBTTRPG-Local/1.0"

        def host_ok(self):
            port = self.server.server_port
            return self.headers.get("Host", "") in (f"localhost:{port}", f"127.0.0.1:{port}")

        def send_json(self, status, data):
            raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.end_headers()
            self.wfile.write(raw)

        def send_file(self, file: Path, download=False):
            if not file.is_file():
                return self.send_json(404, {"error": "File not found"})
            kind = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(file.stat().st_size))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store")
            if download:
                self.send_header("Content-Disposition", 'attachment; filename="review-pack.zip"')
            self.end_headers()
            with file.open("rb") as source:
                while block := source.read(1024 * 1024):
                    self.wfile.write(block)

        def do_GET(self):
            if not self.host_ok():
                return self.send_json(403, {"error": "Only localhost connections are allowed"})
            path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
            if path in (BASE, BASE + "/", BASE + "/index.html"):
                return self.send_file(ui / "index.html")
            if path in (BASE + "/app.css", BASE + "/app.js"):
                return self.send_file(ui / path.rsplit("/", 1)[-1])
            if path == BASE + "/api/catalog":
                return self.send_json(200, {"pages": state.pages})
            if path == BASE + "/api/reference-status":
                return self.send_json(200, {"savedSamples": len(state.stored_references())})
            if path == BASE + "/api/profiles":
                try:
                    return self.send_json(200, {"ready": True, "profiles": state.profiles()})
                except RuntimeError as exc:
                    return self.send_json(503, {"ready": False, "error": str(exc)})
            if path == BASE + "/api/jobs":
                with state.lock:
                    return self.send_json(200, {"jobs": [dict(item) for item in state.jobs.values()]})
            if path.startswith(BASE + "/api/jobs/"):
                job_id = path[len(BASE + "/api/jobs/"):]
                if not re.fullmatch(r"[a-f0-9]{20}", job_id):
                    return self.send_json(404, {"error": "Unknown job"})
                record = state.job(job_id)
                return self.send_json(200, record) if record else self.send_json(404, {"error": "Unknown job"})
            if path.startswith(BASE + "/outputs/"):
                parts = path[len(BASE + "/outputs/"):].split("/")
                if len(parts) != 2 or not re.fullmatch(r"[a-f0-9]{20}", parts[0]) or parts[1] != "review-pack.zip":
                    return self.send_json(404, {"error": "Unknown output"})
                record = state.job(parts[0])
                if not record or record["status"] != "completed":
                    return self.send_json(404, {"error": "Output not ready"})
                return self.send_file(state.private / "generated" / parts[0] / "review-pack.zip", download=True)
            if path.startswith(BASE + "/"):
                return self.send_json(404, {"error": "Unknown local route"})
            if path == "/":
                path = "/index.html"
            relative = Path(path.lstrip("/"))
            if (not relative.parts or
                    any(part.startswith(".") or part.lower() in BLOCKED for part in relative.parts) or
                    relative.suffix.lower() not in ALLOWED):
                return self.send_json(404, {"error": "Archive resource unavailable"})
            target = (state.root / relative).resolve()
            if not target.is_relative_to(state.root):
                return self.send_json(404, {"error": "Archive resource unavailable"})
            return self.send_file(target)

        def do_POST(self):
            if not self.host_ok():
                return self.send_json(403, {"error": "Only localhost requests are allowed"})
            port = self.server.server_port
            if self.headers.get("Origin") not in (f"http://localhost:{port}", f"http://127.0.0.1:{port}"):
                return self.send_json(403, {"error": "Same-origin request required"})
            path = urllib.parse.urlsplit(self.path).path
            if path not in (BASE + "/api/jobs", BASE + "/api/intake"):
                return self.send_json(404, {"error": "Unknown endpoint"})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                maximum = 52 * 1024 * 1024 if path == BASE + "/api/intake" else 150000
                if not 0 < size <= maximum:
                    return self.send_json(413, {"error": "Upload is empty or exceeds the local size limit"})
                content_type = self.headers.get("Content-Type", "")
                if path == BASE + "/api/intake":
                    fields, files = multipart(content_type, self.rfile.read(size))
                    outcome = state.submit_intake(fields, files)
                else:
                    if content_type.split(";", 1)[0] != "application/json":
                        return self.send_json(415, {"error": "JSON request required"})
                    outcome = state.submit(json.loads(self.rfile.read(size)))
            except (ValueError, KeyError, TypeError, UnicodeError) as exc:
                return self.send_json(400, {"error": str(exc)[:300]})
            except RuntimeError as exc:
                return self.send_json(503, {"error": str(exc)[:300]})
            return self.send_json(202, outcome)

        def log_message(self, fmt, *args):
            sys.stderr.write("[local-hub] " + (fmt % args) + "\n")
    return Handler

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--voicebox", type=Path)
    parser.add_argument("--port", type=int, default=17861)
    parser.add_argument("--open-browser", action="store_true")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        raise ValueError("Choose a localhost port between 1024 and 65535")
    state = HubState(args.root, args.private, args.voicebox)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler_factory(state))
    except OSError as error:
        state.close()
        raise SystemExit("Cannot bind localhost port %s: %s. Try -Port 17862." %
                         (args.port, error)) from error
    try:
        state.start_backend_if_installed()
        address = "http://127.0.0.1:%s/__local/" % args.port
        print("HB-TTRPG local archive: " + address, flush=True)
        if state.backend_start_error:
            print("Optional voice engine unavailable: " + state.backend_start_error, flush=True)
        if args.open_browser:
            webbrowser.open(address)
        server.serve_forever(poll_interval=.3)
    finally:
        server.server_close()
        state.close()

if __name__ == "__main__":
    main()
