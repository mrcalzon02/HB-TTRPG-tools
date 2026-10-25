"""Offline regression tests for HB-TTRPG local archive and private narration."""
import importlib.util
import io
import json
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import wave
import zipfile
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE.parent / "voicebox"))
spec = importlib.util.spec_from_file_location("local_hub", BASE / "server.py")
hub = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hub)
import narration_batch as voice


def fake_wav(rate=24000):
    out = io.BytesIO()
    with wave.open(out, "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(rate)
        file.writeframes(b"\0\0" * int(rate * .5))
    return out.getvalue()


class VoiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_reject_duplicate_or_unsafe_names(self):
        source = {"project": "private", "voice": "mine", "lines": [
            {"id": "intro", "text": "Hi."}, {"id": "intro", "text": "Again."}]}
        with self.assertRaisesRegex(ValueError, "unique"):
            voice.validate_manifest(source)
        source["lines"][1]["id"] = "../escape"
        with self.assertRaisesRegex(ValueError, "safe"):
            voice.validate_manifest(source)

    def test_creates_private_review_zip_without_upload(self):
        source = {"project": "local", "voice": "mine", "lines": [
            {"id": "first", "text": "First."}, {"id": "second", "text": "Second."}]}
        output = self.root / "private" / "test-run"
        count = []
        receipt = voice.render(source, output, synth=lambda *x: (count.append(x), fake_wav())[1])
        self.assertEqual(receipt["lineCount"], 2)
        self.assertFalse(receipt["cloudUpload"])
        self.assertFalse(receipt["approved"])
        self.assertEqual(len(count), 2)
        with zipfile.ZipFile(output / "review-pack.zip") as archive:
            self.assertIn("audition.wav", archive.namelist())
            self.assertIn("clips/first.wav", archive.namelist())
        with self.assertRaises(FileExistsError):
            voice.render(source, output, synth=lambda *x: fake_wav())

    def test_reject_audio_format_drift_and_leaves_no_final_pack(self):
        source = {"voice": "mine", "lines": [{"id": "a", "text": "a"}, {"id": "b", "text": "b"}]}
        wavs = iter([fake_wav(24000), fake_wav(22050)])
        output = self.root / "private" / "invalid"
        with self.assertRaisesRegex(RuntimeError, "formats differ"):
            voice.render(source, output, synth=lambda *x: next(wavs))
        self.assertFalse(output.exists())


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name) / "site"
        root.mkdir()
        (root / "index.html").write_text("<title>Home</title>Home content")
        (root / "tool.html").write_text("<title>Tool</title>Tool content")
        (root / ".env").write_text("SECRET")
        (root / "private").mkdir()
        (root / "private" / "hidden.html").write_text("SECRET")
        self.state = hub.HubState(root, Path(self.tmp.name) / "private")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), hub.handler_factory(self.state))
        self.port = self.server.server_port
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.state.close()

    def request(self, path, data=None, origin=True):
        headers = {"Host": "127.0.0.1:%s" % self.port}
        if origin:
            headers["Origin"] = "http://127.0.0.1:%s" % self.port
        if data is not None:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request("http://127.0.0.1:%s%s" % (self.port, path),
            data=json.dumps(data).encode() if data is not None else None,
            headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    def test_archive_pages_and_local_ui(self):
        for route, phrase in [("/", b"Home content"), ("/tool.html", b"Tool content"),
                              ("/__local/", b"Narration studio"), ("/__local/app.js", b"parseLines")]:
            status, body = self.request(route)
            self.assertEqual(status, 200, route)
            self.assertIn(phrase, body, route)
        status, body = self.request("/__local/api/catalog")
        self.assertEqual(status, 200)
        self.assertEqual(len(json.loads(body)["pages"]), 2)

    def test_secrets_and_traversal_are_not_served(self):
        for route in ["/.env", "/private/hidden.html", "/%2e%2e/%2e%2e/etc/passwd",
                      "/tools/local-hub/server.py", "/__local/unsupported"]:
            status, body = self.request(route)
            self.assertNotEqual(status, 200, route)
            self.assertNotIn(b"SECRET", body)

    def test_same_origin_post_required(self):
        payload = {"project": "narration", "voice": "mine", "lines": [{"id": "a", "text": "Hi"}]}
        status, _ = self.request("/__local/api/jobs", data=payload, origin=False)
        self.assertEqual(status, 403)
        status, _ = self.request("/__local/api/jobs", data={**payload, "project": "../wrong"})
        self.assertEqual(status, 400)

    def test_job_completion_and_download(self):
        payload = {"project": "narration", "voice": "mine", "lines": [{"id": "a", "text": "Hi"}]}
        real = voice.render
        with mock.patch.object(hub, "render", side_effect=lambda doc, path, progress: real(
                doc, path, progress=progress, synth=lambda *args: fake_wav())):
            status, body = self.request("/__local/api/jobs", data=payload)
            self.assertEqual(status, 202)
            job = json.loads(body)["id"]
            for _ in range(50):
                status, info = self.request("/__local/api/jobs/" + job)
                if json.loads(info)["status"] == "completed":
                    break
                time.sleep(.03)
            self.assertEqual(json.loads(info)["status"], "completed")
            status, raw = self.request("/__local/outputs/" + job + "/review-pack.zip")
            self.assertEqual(status, 200)
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                self.assertIn("clips/a.wav", archive.namelist())


    def test_optional_voicebox_launch_crash_does_not_kill_archive(self):
        import os
        root = Path(self.tmp.name) / "fake-voicebox"
        exe = root / "backend" / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        exe.parent.mkdir(parents=True)
        exe.write_text("mock only")
        (root / "backend" / "main.py").write_text("mock only")
        self.state.voicebox = root
        with mock.patch.object(self.state, "backend_ready", return_value=False):
            with mock.patch.object(hub.subprocess, "run", return_value=hub.subprocess.CompletedProcess(["python"], 0, stdout="", stderr="")):
                with mock.patch.object(hub.subprocess, "Popen", side_effect=OSError("engine unavailable")):
                    self.state.start_backend_if_installed()
        self.assertIn("engine unavailable", self.state.backend_start_error)
        status, body = self.request("/__local/")
        self.assertEqual(status, 200)
        self.assertIn(b"Narration studio", body)
        status, body = self.request("/__local/api/profiles")
        self.assertEqual(status, 503)
        self.assertIn(b"engine unavailable", body)


    def test_status_poll_is_successful_and_exposes_job_phase_time(self):
        status, body = self.request("/__local/api/jobs")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["jobs"], [])
        payload = {"project": "narration", "voice": "mine", "lines": [{"id": "a", "text": "Hello."}]}
        # Pausing the worker lets us inspect the queued record without inference.
        with mock.patch.object(self.state.executor, "submit") as submit:
            status, body = self.request("/__local/api/jobs", data=payload)
            self.assertEqual(status, 202)
            submit.assert_called_once()
        status, body = self.request("/__local/api/jobs")
        self.assertEqual(status, 200)
        job = json.loads(body)["jobs"][0]
        self.assertEqual(job["status"], "queued")
        self.assertIn("createdAt", job)
        self.assertIn("statusSince", job)

    def test_missing_uvicorn_reports_repair_and_preserves_archive(self):
        import os
        root = Path(self.tmp.name) / "incomplete-voicebox"
        exe = root / "backend" / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        exe.parent.mkdir(parents=True)
        exe.write_text("placeholder")
        (root / "backend" / "main.py").write_text("placeholder")
        self.state.voicebox = root
        with mock.patch.object(self.state, "backend_ready", return_value=False):
            with mock.patch.object(hub.subprocess, "run",
                                   return_value=hub.subprocess.CompletedProcess(
                                       ["python"], 1, stdout="uvicorn", stderr="")):
                with mock.patch.object(hub.subprocess, "Popen") as process:
                    self.state.start_backend_if_installed()
                    process.assert_not_called()
        self.assertIn("uvicorn", self.state.backend_start_error)
        self.assertIn("repair-local-backend.ps1", self.state.backend_start_error)
        status, body = self.request("/__local/")
        self.assertEqual(status, 200)
        self.assertIn(b"Narration studio", body)

if __name__ == "__main__":
    unittest.main()
