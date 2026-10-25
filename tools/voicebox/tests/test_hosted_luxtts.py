"""Offline tests for the GitHub-hosted encrypted owner-voice pipeline."""
import sys
import tempfile
import unittest
import wave
import zipfile
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import remote_luxtts_nutbuster as remote

class HostedVoiceTests(unittest.TestCase):
    def test_composition_produces_review_zip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            clips=root/"clips"
            clips.mkdir()
            events=[]
            for key in ("intro","outro"):
                p=clips/(key+".wav")
                with wave.open(str(p),"wb") as wav:
                    wav.setnchannels(1)
                    wav.setsampwidth(2)
                    wav.setframerate(48000)
                    wav.writeframes(b"\x00\x00"*4800)
                events.append({"key":key,"file":p.name,"text":key,"sha256":remote.sha(p)})
            out=root/"review.zip"
            remote.package(clips,events,out)
            with zipfile.ZipFile(out) as z:
                for name in ("intro.wav","outro.wav","audition.wav","manifest.json"):
                    self.assertIn(name,z.namelist())
                manifest=json.loads(z.read("manifest.json"))
                self.assertEqual(manifest["lineCount"],2)
                self.assertFalse(manifest["cloudUploadPlaintext"])
    def test_no_user_pc_install_and_encrypted_only_artifact(self):
        path=ROOT.parents[1]/".github/workflows/nutbuster-remote-voice.yml"
        flow=path.read_text(encoding="utf-8")
        for phrase in ("runs-on: ubuntu-24.04","workflow_dispatch:",
                       "VOICEBOX_REFERENCE_URL","VOICEBOX_EXPORT_PASSPHRASE",
                       "gpg --batch","upload-artifact@v4","nutbuster-voice-review.zip.gpg"):
            self.assertIn(phrase,flow)
        self.assertLess(flow.index("Encrypt review ZIP before any upload"),
                        flow.index("Upload encrypted-only audio artifact"))
        self.assertNotIn("runs-on: [self-hosted",flow)
        self.assertNotIn("rclone",flow)
