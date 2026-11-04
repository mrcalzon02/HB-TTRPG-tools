"""Headless functional checks for SPR's real archive, audio cache and local API.

No network services, Microsoft voices or personal recordings are required.
"""
import base64
import io
import zipfile
import http.client
import json
import pathlib
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import wave

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from spr_core import Archive, sentence_chunks, passage_chunks, extract_text
from spr_app import ReaderState, make_handler
from spr_voices import VoiceLibrary
from spr_voicebox import VoiceboxEngine
from spr_neural_alignment import is_complete, trim_guarded_audio
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

    def test_long_book_passages_preserve_all_spoken_words(self):
        source = ("The old castle was quiet. The wind moved along the stone. " * 500
                  + "\n\n"
                  + "A new chapter begins. No voice should skip a word. " * 300)
        expected = " ".join(source.split())
        passages = passage_chunks(source, max_chars=420)
        self.assertGreater(len(passages), 20)
        self.assertTrue(all(0 < len(part) <= 420 for part in passages))
        self.assertEqual(" ".join(passages), expected)
        with tempfile.TemporaryDirectory() as folder:
            archive = Archive(pathlib.Path(folder))
            doc = archive.import_document("long-novel.txt", source.encode())
            self.assertEqual(doc["segment_mode"], "passage")
            self.assertLess(len(doc["chunks"]), 300)
            self.assertGreater(len(doc["chunks"]), 20)

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

    def test_deleted_cached_audio_is_detected_and_regenerated(self):
        book = self.archive.import_document("lost.txt", b"One. Two.")
        self.archive.generate_chunk(book["id"], 0, self.engine, "A")
        audio_path = self.archive.audio_file(book["id"], 0)
        audio_path.unlink()
        self.assertNotIn("0", self.archive.load(book["id"])["audio"])
        self.assertEqual(self.archive.library()[0]["ready"], 0)
        self.assertTrue(self.archive.generate_chunk(book["id"], 0, self.engine, "A"))
        self.assertEqual(len(self.engine.calls), 2)

    def test_export_rejects_mixed_voice_profiles(self):
        book = self.archive.import_document("two.txt", b"One. Two.")
        book_id = book["id"]
        self.archive.generate_chunk(book_id, 0, self.engine, "Voice A")
        self.archive.generate_chunk(book_id, 1, self.engine, "Voice B")
        with self.assertRaisesRegex(ValueError, "different voices or rates"):
            self.archive.export_wav(book_id)
        self.archive.generate_chunk(book_id, 1, self.engine, "Voice A")
        self.assertTrue(self.archive.export_wav(book_id).is_file())

    def test_position_survives_restart_and_rejects_invalid(self):
        book = self.archive.import_document("three.txt", b"One. Two. Three.")
        self.archive.save_position(book["id"], 1, 0.35)
        reopened = Archive(self.archive.root)
        self.assertEqual(reopened.read_position(book["id"]), {"index": 1, "fraction": 0.35})
        with self.assertRaisesRegex(ValueError, "outside document"):
            reopened.save_position(book["id"], 90, 0.0)

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


class EpubImportTests(unittest.TestCase):
    @staticmethod
    def sample_epub(encrypted=False):
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as book:
            book.writestr("mimetype", "application/epub+zip")
            book.writestr("META-INF/container.xml",
                '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>'
                '<rootfile full-path="OPS/package.opf"/></rootfiles></container>')
            book.writestr("OPS/package.opf",
                '<package xmlns="http://www.idpf.org/2007/opf"><manifest>'
                '<item id="first" href="first.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="second" href="second.xhtml" media-type="application/xhtml+xml"/>'
                '</manifest><spine><itemref idref="second"/>'
                '<itemref idref="first"/></spine></package>')
            book.writestr("OPS/first.xhtml",
                '<html><head><title>Invisible header</title></head>'
                '<body><p>First chapter appears later.</p></body></html>')
            book.writestr("OPS/second.xhtml",
                '<html><body><h1>Second chapter goes first.</h1>'
                '<p>Two &amp; three.</p><script>Never narrate this.</script></body></html>')
            if encrypted:
                book.writestr("META-INF/encryption.xml", "<encryption/>")
        return output.getvalue()

    def test_epub_spine_order_and_readable_text(self):
        document = extract_text("novel.epub", self.sample_epub())
        self.assertLess(document.index("Second chapter"), document.index("First chapter"))
        self.assertIn("Two & three.", document)
        self.assertNotIn("Invisible header", document)
        self.assertNotIn("Never narrate this.", document)
        with tempfile.TemporaryDirectory() as folder:
            archive = Archive(pathlib.Path(folder))
            book = archive.import_document("novel.epub", self.sample_epub())
            self.assertGreater(len(book["chunks"]), 1)

    def test_epub_rejects_drm_and_invalid_zip(self):
        with self.assertRaisesRegex(ValueError, "Encrypted"):
            extract_text("protected.epub", self.sample_epub(encrypted=True))
        with self.assertRaisesRegex(ValueError, "EPUB ZIP"):
            extract_text("broken.epub", b"not an archive")


class VoiceLibraryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.voices = VoiceLibrary(pathlib.Path(self.tmp.name) / "private-voices")
        self.profile = self.voices.create("My dramatic narrator")

    def sample(self):
        memory = io.BytesIO()
        with wave.open(memory, "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(8000)
            audio.writeframes(b"\0\0" * 240)
        return memory.getvalue()

    def test_voice_samples_private_and_duplicate_safe(self):
        data = self.sample()
        result = self.voices.add_sample(self.profile["id"], "Sphinx.wav", data)
        self.assertEqual(result["name"], "Sphinx.wav")
        self.assertEqual(self.voices.add_sample(self.profile["id"], "Sphinx.wav", data)["sha256"], result["sha256"])
        self.assertEqual(len(self.voices.get(self.profile["id"])["samples"]), 1)
        self.assertTrue((self.voices.folder(self.profile["id"]) / "samples" / result["file"]).is_file())
        self.assertEqual(self.voices.list()[0]["status"], "references-only")

    def test_voice_zip_prefers_prepared_clips_and_blocks_traversal(self):
        data = self.sample()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("personal_voice_01.wav", data)
            archive.writestr("original/long-source.wav", data)
            archive.writestr("transcripts/personal_voice_01.txt", "Sphinx of black quartz, judge my vow.")
            archive.writestr("manifest.json", json.dumps({"samples": [
                {"file": "personal_voice_01.wav",
                 "transcript_file": "transcripts/personal_voice_01.txt"}
            ]}))
        result = self.voices.import_zip(self.profile["id"], buffer.getvalue())
        self.assertEqual(result["considered"], 1)
        self.assertEqual(result["added"], 1)
        imported = self.voices.get(self.profile["id"])["samples"][0]
        self.assertEqual(imported["transcript"], "Sphinx of black quartz, judge my vow.")
        invalid = io.BytesIO()
        with zipfile.ZipFile(invalid, "w") as archive:
            archive.writestr("../outside.wav", data)
        with self.assertRaisesRegex(ValueError, "Unsafe path"):
            self.voices.import_zip(self.profile["id"], invalid.getvalue())

    def test_rejects_fake_audio_header(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            self.voices.add_sample(self.profile["id"], "fake.wav", b"definitely not a recording")


class NeuralOpeningTests(unittest.TestCase):
    def test_exact_first_words_required_even_when_rest_matches(self):
        expected = "There should have been forty-three of them."
        self.assertTrue(is_complete(expected, expected)[0])
        self.assertFalse(is_complete(expected, "Should have been forty-three of them.")[0])
        self.assertFalse(is_complete(expected, "Okay. Okay. Should have been forty-three of them.",
                                     guarded=True)[0])
        self.assertTrue(is_complete(expected, "Okay. Okay. " + expected, guarded=True)[0])

    def test_measured_guard_trim_preserves_onset_and_no_hardcoded_crop(self):
        expected = "There should have been forty-three of them."
        chunk_words = ["Okay.", "Okay.", "There", "should", "have", "been", "forty-three", "of", "them."]
        times = [(0.30, 0.52), (0.60, 0.96), (1.15, 1.40), (1.42, 1.63),
                 (1.65, 1.85), (1.9, 2.12), (2.15, 2.5), (2.53, 2.7), (2.75, 2.9)]
        recognition = {"text": "Okay. Okay. " + expected,
                       "chunks": [{"text": w, "timestamp": [a, b]}
                                  for w, (a, b) in zip(chunk_words, times)]}
        # A synthetic array is sufficient to validate exact boundary logic;
        # it is NOT evidence that the model pronounced the words.
        sample_rate = 1000
        audio = [0.02] * (4000)
        out, info = trim_guarded_audio(audio, sample_rate, expected, recognition)
        self.assertEqual(info["guard_count"], 2)
        self.assertEqual(info["first_words_verified"], ["there", "should", "have"])
        self.assertAlmostEqual(info["removed_seconds"], 0.98)
        self.assertGreaterEqual(info["first_word_pre_roll_ms"], 100)
        self.assertEqual(len(out), 3020)

    def test_distinct_natural_guard_after_repetition_failure(self):
        expected = "There should have been forty-three of them."
        preamble = "The story begins."
        self.assertTrue(is_complete(expected, preamble + " " + expected,
                                    guarded=True, guard_phrase=preamble)[0])
        self.assertFalse(is_complete(expected, "That's it, that's it, that's it.",
                                     guarded=True, guard_phrase=preamble)[0])
        recognition = {"text": preamble + " " + expected,
                       "chunks": [
                           {"text": "The", "timestamp": [0.28, 0.49]},
                           {"text": "story", "timestamp": [0.51, 0.74]},
                           {"text": "begins", "timestamp": [0.76, 1.1]},
                           {"text": "There", "timestamp": [1.27, 1.58]},
                           {"text": "should", "timestamp": [1.61, 1.79]},
                           {"text": "have", "timestamp": [1.82, 2.0]},
                           {"text": "been", "timestamp": [2.04, 2.17]},
                           {"text": "forty-three", "timestamp": [2.2, 2.45]},
                           {"text": "of", "timestamp": [2.48, 2.55]},
                           {"text": "them", "timestamp": [2.58, 2.83]}]}
        audio, summary = trim_guarded_audio(
            [0.01] * 3800, 1000, expected, recognition, guard_phrase=preamble)
        self.assertEqual(summary["guard_word"], "begins")
        self.assertAlmostEqual(summary["removed_seconds"], 1.12)
        self.assertGreaterEqual(summary["first_word_pre_roll_ms"], 100)
        self.assertEqual(len(audio), 2680)


    def test_without_word_boundary_never_guesses_trim(self):
        expected = "There should have been forty-three of them."
        with self.assertRaisesRegex(ValueError, "word-timed"):
            trim_guarded_audio([0.0] * 4000, 1000, expected,
                               {"text": "Okay. Okay. " + expected, "chunks": []})
        bad = {"text": "Okay. Okay. " + expected,
               "chunks": [{"text": w, "timestamp": t}
                          for w, t in [("Okay", [.3, .6]), ("Okay", [.7, 1.01]),
                                       ("There", [1.045, 1.2]), ("should", [1.3, 1.4]),
                                       ("have", [1.5, 1.6])]]}
        with self.assertRaisesRegex(ValueError, "too close"):
            trim_guarded_audio([0.0] * 4000, 1000, expected, bad)


class VoiceboxAdapterTests(unittest.TestCase):
    def wav_bytes(self):
        buf = io.BytesIO()
        with wave.open(buf, "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(8000)
            audio.writeframes(b"\0\0" * 200)
        return buf.getvalue()

    def test_local_voicebox_profiles_and_wav_synthesis(self):
        import urllib.request

        class Response:
            def __init__(self, body, content_type):
                self.body = body
                self.headers = {"Content-Type": content_type}
            def __enter__(self):
                return self
            def __exit__(self, *_):
                return False
            def read(self, length=0):
                return self.body[:length] if length else self.body

        calls = []
        def local_api(request, timeout=0):
            url = request.full_url
            calls.append(url)
            self.assertTrue(url.startswith("http://127.0.0.1:17493/"))
            if url.endswith("/profiles"):
                return Response(json.dumps({"profiles": [{"id": "local-owner", "name": "Owner"}]}).encode(), "application/json")
            if url.endswith("/v1/audio/speech"):
                payload = json.loads(request.data)
                self.assertEqual(payload["model"], "qwen")
                self.assertEqual(payload["voice"], "local-owner")
                self.assertEqual(payload["input"], "This is a reading test.")
                return Response(self.wav_bytes(), "audio/wav")
            raise AssertionError("Unexpected local endpoint")

        engine = VoiceboxEngine("qwen")
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory) / "test.wav"
            with patch("spr_voicebox._local_request", side_effect=local_api):
                self.assertEqual(engine.profiles(), [{"id": "local-owner", "name": "Owner"}])
                engine.synthesize("This is a reading test.", target, voice="local-owner")
            with wave.open(str(target), "rb") as audio:
                self.assertEqual(audio.getnframes(), 200)
        self.assertEqual(len(calls), 2)

    def test_voicebox_rejects_invalid_configuration(self):
        with self.assertRaises(ValueError):
            VoiceboxEngine("unknown-model")
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "test.wav"
            with self.assertRaisesRegex(ValueError, "Select an existing"):
                VoiceboxEngine("qwen").synthesize("Test", path, voice="")
            with self.assertRaisesRegex(ValueError, "rate must be zero"):
                VoiceboxEngine("qwen").synthesize("Test", path, voice="authorized", rate=1)


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

    def test_committed_sphinx_audition_routes(self):
        for name in ("bdo", "nowhere"):
            code, raw = self.req("GET", "/api/voice-preview/" + name)
            self.assertEqual(code, 200)
            self.assertEqual(raw[:4], b"RIFF")
            self.assertEqual(raw[8:12], b"WAVE")
            self.assertGreater(len(raw), 10000)
        self.assertEqual(self.req("GET", "/api/voice-preview/../secrets")[0], 404)

    def test_voice_profile_api_archives_audio(self):
        code, profile = self.req("POST", "/api/voice-profile", {"name": "Local narrator"})
        self.assertEqual(code, 201)
        data = io.BytesIO()
        with wave.open(data, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(8000)
            wav.writeframes(b"\0\0" * 80)
        code, entry = self.req("POST", "/api/voice-sample", {
            "profile_id": profile["id"], "name": "mine.wav",
            "base64": base64.b64encode(data.getvalue()).decode()
        })
        self.assertEqual(code, 201)
        self.assertEqual(entry["name"], "mine.wav")
        code, profiles = self.req("GET", "/api/voice-profiles")
        self.assertEqual(code, 200)
        self.assertEqual(profiles[0]["samples"], 1)

    def test_position_http_api(self):
        code, book = self.req("POST", "/api/import",
            {"name": "progress.txt", "base64": base64.b64encode(b"First. Second.").decode()})
        self.assertEqual(code, 201)
        code, saved = self.req("POST", "/api/position",
            {"book_id": book["id"], "index": 1, "fraction": 0.42})
        self.assertEqual(code, 200)
        code, manifest = self.req("GET", "/api/book/" + book["id"])
        self.assertEqual(code, 200)
        self.assertEqual(manifest["position"], {"index": 1, "fraction": 0.42})

    def test_generation_priority_does_not_start_parallel_engine(self):
        class GateEngine(FakeEngine):
            def __init__(self):
                super().__init__()
                self.started = threading.Event()
                self.release = threading.Event()
            def synthesize(self, text, target, voice="", rate=0):
                if not self.calls:
                    self.started.set()
                    self.release.wait(3)
                super().synthesize(text, target, voice, rate)
        engine = GateEngine()
        state = ReaderState(Archive(pathlib.Path(self.tmp.name) / "queue"), engine)
        book = state.archive.import_document("queue.txt", b"First. Second. Third. Fourth.")
        book_id = book["id"]
        state.start_generation(book_id, list(range(4)), "A", 0)
        self.assertTrue(engine.started.wait(2), "First synthesis did not start")
        try:
            state.start_generation(book_id, [3], "A", 0, priority=True)
            with self.assertRaisesRegex(RuntimeError, "Finish or cancel"):
                state.start_generation(book_id, [1], "B", 0, priority=True)
        finally:
            engine.release.set()
        for _ in range(200):
            if not state.status()["active"]:
                break
            time.sleep(0.01)
        self.assertFalse(state.status()["active"], "Narration did not finish")
        self.assertEqual(state.status()["error"], "")
        self.assertEqual([call[0] for call in engine.calls], ["First.", "Fourth.", "Second.", "Third."])

    def test_rejects_foreign_origin_and_host(self):
        self.assertEqual(self.req("GET", "/api/library", headers={"Host": "evil.example"})[0], 403)
        self.assertEqual(self.req("POST", "/api/cancel", {}, headers={"Origin": "https://evil.example"})[0], 403)


if __name__ == "__main__":
    unittest.main()
