"""An imperfect synthesis take must not discard previously verified narration."""
import json
import sys
import tempfile
import unittest
import wave
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import remote_luxtts_nutbuster as remote

class PartialProductionTests(unittest.TestCase):
    def example_wav(self, folder: Path, key="good"):
        clip=folder/(key+".wav")
        with wave.open(str(clip),"wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(48000)
            handle.writeframes(b"\0\0"*4800)
        return {"key":key,"text":"A good test","file":clip.name,
                "asrVerified":True,"sha256":remote.sha(clip)}
    def test_one_rejection_keeps_all_previous_verified_audio(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)/"clips"
            folder.mkdir()
            good=self.example_wav(folder)
            bad={"key":"deadlock-shuffle","expectedText":"TIME FOR A FRESH MIX!",
                 "reason":"Speech recognition did not verify the complete line",
                 "attemptCount":4,"attempts":[{"heard":"mix mix mix"}]}
            output=Path(d)/"review.zip"
            info=remote.package(folder,[good],output,failures=[bad],requested=2)
            self.assertEqual(info["status"],"PARTIAL_VERIFIED")
            self.assertEqual(info["verifiedCount"],1)
            self.assertEqual(info["failedCount"],1)
            with zipfile.ZipFile(output) as z:
                self.assertIn("good.wav",z.namelist())
                self.assertIn("audition.wav",z.namelist())
                self.assertIn("failed-takes.json",z.namelist())
                self.assertIn("retry-ids.txt",z.namelist())
                self.assertEqual(z.read("retry-ids.txt").decode(),"deadlock-shuffle\n")
                self.assertEqual(json.loads(z.read("manifest.json"))["failedTakes"][0]["key"],
                                 "deadlock-shuffle")
    def test_all_failed_still_produces_debug_artifact_and_no_fake_reel(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)/"clips"
            folder.mkdir()
            info=remote.package(folder,[],Path(d)/"review.zip",
                failures=[{"key":"bad","reason":"missing words"}],requested=1)
            self.assertEqual(info["status"],"NONE_VERIFIED")
            with zipfile.ZipFile(Path(d)/"review.zip") as z:
                self.assertIn("manifest.json",z.namelist())
                self.assertNotIn("audition.wav",z.namelist())
    def test_complete_production_unaffected(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)/"clips"
            folder.mkdir()
            info=remote.package(folder,[self.example_wav(folder)],Path(d)/"complete.zip")
            self.assertEqual(info["status"],"ALL_VERIFIED")
            self.assertTrue(info["verification"]["allPassed"])
    def test_inconsistent_outcome_count_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)/"clips"
            folder.mkdir()
            with self.assertRaises(ValueError):
                remote.package(folder,[self.example_wav(folder)],Path(d)/"invalid.zip",requested=74)
if __name__=="__main__":
    unittest.main()
