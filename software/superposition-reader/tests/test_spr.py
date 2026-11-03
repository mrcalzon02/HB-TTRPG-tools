"""Headless functional checks for SPR's real archive, audio cache and local API.

No network services, Microsoft voices or personal recordings are required.
"""
import base64
import http.client
import json
import pathlib
import sys
import tempfile
import threading
import unittest
import wave

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from spr_core import Archive, sentence_chunks, extract_text
from spr_app import ReaderState, make_handler
from http.server import ThreadingHTTPServer


class FakeEngine:
    engine_id = "fake-voice-1"

    def __init__(self):
        self.calls = []

    def synthesize(self, text, target, voice="", rate=0):
        self.calls.append((text, voice, rate))
        with wave.open(str(target), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(8000)
            output.writeframes(b"\x00\x00" * 800)

    def voices(self):
        return ["Test Voice"]


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.archive = Archive(pathlib.Path(self.tmp.name))
        self.engine = FakeEngine()

    def test_plain_text_import_and_private_source_copy(self):
        manifest = self.archive.import_document("chapter.txt", b"First sentence. Second sentence!")
        self.assertEqual(len(manifest["chunks"]), 2)
        self.assertTrue((self.archive.folder(manifest["id"]) / "source.txt").is_file())
        self.assertEqual(len(self.archive.library()), 1)
        self.assertEqual(self.archive.import_document("chapter.txt", b"First sentence. Second sentence!")["id"], manifest["id"])

    def test_markup_and_long_sentence_chunking(self):
        self.assertEqual(extract_text("file.md", b"A paragraph."), "A paragraph.")
        parts = sentence_chunks("word " * 150, max_chars=110)
        self.assertGreater(len(parts), 2)
        self.assertTrue(all(len(piece) <= 110 for piece in parts))
        self.assertEqual(" ".join(parts), ("word " * 150).strip())

    def test_audio_cache_resume_and_voice_change(self):
        book = self.archive.import_document("test.txt", b"One. Two.")
        book_id = book["id"]
        self.assertTrue(self.archive.generate_chunk(book_id, 0, self.engine, "A"))
        self.assertFalse(self.archive.generate_chunk(book_id, 0, self.engine, "A"))
        self.assertEqual(len(self.engine.calls), 1)
        self.assertTrue(self.archive.generate_chunk(book_id, 0, self.engine, "B"))
        self.assertEqual(len(self.engine.calls), 2)
        self.assertTrue(self.archive.audio_file(book_id, 0).is_file())

    def test_complete_book_wav_assembly(self):
        book = self.archive.import_document("story.txt", b"One. Two. Three.")
        for i in range(3):
            self.archive.generate_chunk(book["id"], i, self.engine)
        output = self.archive.export_wav(book["id"])
        with wave.open(str(output), "rb") as wav:
            self.assertEqual(wav.getframerate(), 8000)
            self.assertEqual(wav.getnframes(), 2400)

    def test_export_refuses_incomplete_narration(self):
        book = self.archive.import_document("story.txt", b"One. Two.")
        self.archive.generate_chunk(book["id"], 0, self.engine)
        with self.assertRaisesRegex(ValueError, "Finish generating"):
            self.archive.export_wav(book["id"])

    def test_rejects_bad_paths_and_empty_documents(self):
        with self.assertRaises(ValueError):
            self.archive.folder("../../secrets")
        with self.assertRaises(ValueError):
            self.archive.import_document("../book.exe", b"malware")
        with self.assertRaises(ValueError):
            self.archive.import_document("empty.txt", b" \n ")


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        state = ReaderState(Archive(pathlib.Path(self.tmp.name)), FakeEngine())
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(state))
        self.server.daemon_threads = True
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.port = self.server.server_port

    def req(self, method, path, payload=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        headers = {"Host": "127.0.0.1:" + str(self.port), **(headers or {})}
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        if data is not None:
            headers["Content-Type"] = "application/json"
        conn.request(method, path, body=data, headers=headers)
        reply = conn.getresponse()
        content = reply.read()
        status = reply.status
        conn.close()
        return status, json.loads(content) if "json" in reply.getheader("Content-Type", "") else content

    def test_import_list_generate_and_export(self):
        code, item = self.req("POST", "/api/import",
                             {"name": "short.txt", "base64": base64.b64encode(b"Hello world.").decode()})
        self.assertEqual(code, 201)
        book_id = item["id"]
        self.assertEqual(self.req("GET", "/api/library")[0], 200)
        code, response = self.req("POST", "/api/generate", {"book_id": book_id, "index": 0})
        self.assertEqual(code, 202)
        import time
        for _ in range(100):
            _, job = self.req("GET", "/api/job")
            if not job["active"]:
                break
            time.sleep(0.02)
        self.assertEqual(job["error"], "")
        self.assertEqual(self.req("GET", "/api/audio/" + book_id + "/0")[0], 200)
        self.assertEqual(self.req("GET", "/api/export/" + book_id)[0], 200)

    def test_rejects_foreign_origin_and_host(self):
        self.assertEqual(self.req("GET", "/api/library", headers={"Host": "evil.example"})[0], 403)
        self.assertEqual(self.req("POST", "/api/cancel", {}, headers={"Origin": "https://evil.example"})[0], 403)


if __name__ == "__main__":
    unittest.main()
