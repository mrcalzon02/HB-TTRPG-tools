"""Regressions for optional British local voices; no model downloads required."""
from __future__ import annotations

import http.client
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from spr_core import Archive
from spr_app import ReaderState, make_handler
from spr_local_voices import LocalVoiceEngine, LocalVoiceSetup, catalog
from http.server import ThreadingHTTPServer


def write_wav(path):
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(22050)
        wav.writeframes(b"\x01\x00" * 2000)


class LocalVoiceTests(unittest.TestCase):
    def test_catalog_contains_published_british_voices(self):
        ids = {item["id"] for item in catalog()}
        for required in ("kokoro-british", "en_GB-alan-medium",
                         "en_GB-northern_english_male-medium", "en_GB-aru-medium"):
            self.assertIn(required, ids)
        self.assertEqual(len(ids), len(catalog()))

    def test_only_installed_models_are_selectable(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            kokoro = LocalVoiceEngine(root, "kokoro")
            piper = LocalVoiceEngine(root, "piper")
            self.assertEqual(kokoro.profiles(), [])
            self.assertEqual(piper.profiles(), [])
            self.assertFalse(kokoro.available())
            model = root / "local-voices" / "models" / "kokoro"
            model.mkdir(parents=True)
            (model / "kokoro-v1.0.int8.onnx").write_bytes(b"unit-test")
            (model / "voices-v1.0.bin").write_bytes(b"unit-test")
            self.assertEqual(len(kokoro.profiles()), 8)
            self.assertFalse(kokoro.available())  # No private runtime installed
            folder2 = root / "local-voices" / "models" / "piper"
            folder2.mkdir()
            name = "en_GB-aru-medium"
            (folder2 / (name + ".onnx")).write_bytes(b"unit-test")
            (folder2 / (name + ".onnx.json")).write_text(
                json.dumps({"num_speakers": 3, "speaker_id_map": {"Actor One": 1}}))
            self.assertEqual([p["id"] for p in piper.profiles()],
                             [name + "#0", name + "#1", name + "#2"])
            self.assertIn("Actor One", piper.profiles()[1]["name"])
            (folder2 / "en_GB-alan-medium.onnx").write_bytes(b"unit-test")
            self.assertEqual(len(piper.profiles()), 3)  # Missing config must not enable it
            with self.assertRaisesRegex(ValueError, "Select an installed"):
                piper.synthesize("Hello", root / "invalid.wav", voice="../evil")

    def test_piper_worker_writes_valid_pcm_wav(self):
        from spr_local_voice_worker import serve
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            model = root / "models" / "piper"
            model.mkdir(parents=True)
            (model / "en_GB-alan-medium.onnx").write_bytes(b"model")
            (model / "en_GB-alan-medium.onnx.json").write_text("{}")
            target = root / "sample.wav"
            command = json.dumps({"action": "synthesize", "text": "Good evening.",
                                  "voice": "en_GB-alan-medium", "output": str(target)})
            class FakeVoice:
                class config:
                    num_speakers = 1
                @staticmethod
                def load(model):
                    self.assertTrue(Path(model).is_file())
                    return FakeVoice()
                def synthesize_wav(self, text, output, syn_config):
                    if text != "Good evening." or syn_config.speaker_id != 0:
                        raise AssertionError("Unexpected worker synthesis arguments")
                    output.setnchannels(1)
                    output.setsampwidth(2)
                    output.setframerate(22050)
                    output.writeframes(b"\x01\x00" * 800)
            class Config:
                def __init__(self, speaker_id):
                    self.speaker_id = speaker_id
            fake_module = type(sys)("piper")
            fake_module.PiperVoice = FakeVoice
            fake_module.SynthesisConfig = Config
            with patch.dict(sys.modules, {"piper": fake_module}), \
                 patch("sys.stdin", io.StringIO(command + "\n")), \
                 patch("sys.stdout", new_callable=io.StringIO) as stdout:
                serve("piper", root)
            responses = [json.loads(line) for line in stdout.getvalue().splitlines()]
            self.assertEqual([r["status"] for r in responses], ["ready", "generated"])
            with wave.open(str(target)) as wav:
                self.assertEqual(wav.getnframes(), 800)

    def test_local_setup_requires_explicit_valid_selection(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            engines = {family: LocalVoiceEngine(root, family)
                       for family in ("kokoro", "piper")}
            setup = LocalVoiceSetup(root, root / "missing.ps1", engines, platform="posix")
            self.assertFalse(setup.status()["active"])
            self.assertFalse((root / "local-voices").exists())
            with self.assertRaisesRegex(ValueError, "unapproved"):
                setup.start("../not-a-voice")
            with self.assertRaisesRegex(RuntimeError, "requires Windows"):
                setup.start("kokoro-british")

    def test_audition_api_generates_cacheable_wav_for_selected_voice(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Archive(Path(folder))
            class FakeLocal:
                engine_id = "spr-kokoro-local-v1"
                def __init__(self):
                    self.calls = 0
                def profiles(self):
                    return [{"id": "bm_george", "name": "George"}]
                def synthesize(self, text, target, voice="", rate=0):
                    self.calls += 1
                    self_voice = voice
                    if self_voice != "bm_george" or not text.startswith("The evening"):
                        raise AssertionError("Unexpected audition configuration")
                    write_wav(target)
            fake = FakeLocal()
            state = ReaderState(archive, additional_engines={"kokoro": fake})
            server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(state))
            server.daemon_threads = True
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            self.addCleanup(server.server_close)
            self.addCleanup(server.shutdown)
            for n in range(2):
                payload = json.dumps({"engine_key": "kokoro", "voice": "bm_george"})
                conn = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=10)
                conn.request("POST", "/api/local-voice-audition", payload, {
                    "Content-Type": "application/json",
                    "Host": "127.0.0.1:" + str(server.server_port)})
                response = conn.getresponse()
                self.assertEqual(response.status, 200)
                url = json.loads(response.read())["url"]
                conn.close()
                self.assertTrue(url.startswith("/api/local-voice-preview/"))
            self.assertEqual(fake.calls, 1)  # Audition cached in private data
            conn = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=10)
            conn.request("GET", url, headers={"Host": "127.0.0.1:" + str(server.server_port)})
            response = conn.getresponse()
            self.assertEqual(response.status, 200)
            self.assertTrue(response.read().startswith(b"RIFF"))
            conn.close()
