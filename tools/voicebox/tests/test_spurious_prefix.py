"""Regression for a model hallucinating 'If' before the actual narration."""
import sys, unittest
import numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from remote_luxtts_nutbuster import strip_verified_extra_opening, score_transcript

class ExtraneousOpeningTests(unittest.TestCase):
    def setUp(self):
        self.audio=np.full(48000*3,.2,dtype=np.float32)
        self.target="YOUR ROD'S LOOKING ROUGH!"
    def test_trim_only_timestamped_if_before_complete_phrase(self):
        asr={"text":"If your rod's looking rough.",
             "chunks":[
                 {"text":" If","timestamp":(0.22,0.46)},
                 {"text":" your","timestamp":(0.51,0.72)},
                 {"text":" rod's","timestamp":(0.72,1.1)},
                 {"text":" looking","timestamp":(1.1,1.6)},
                 {"text":" rough","timestamp":(1.6,2.0)}]}
        trimmed=strip_verified_extra_opening(self.audio,self.target,asr)
        self.assertIsNotNone(trimmed)
        cleaned, seconds=trimmed
        self.assertGreater(seconds,.15)
        self.assertLess(seconds,.35)
        self.assertEqual(len(cleaned), len(self.audio)-round(seconds*48000))
    def test_never_trims_missing_end_word(self):
        asr={"text":"If your rod",
             "chunks":[{"text":"If","timestamp":(.22,.43)},
                       {"text":"your","timestamp":(.45,.73)},
                       {"text":"rod","timestamp":(.73,1.0)}]}
        self.assertIsNone(strip_verified_extra_opening(self.audio,self.target,asr))
    def test_never_trims_unknown_first_word(self):
        asr={"text":"When your rod's looking rough",
             "chunks":[{"text":"When","timestamp":(.22,.43)},
                       {"text":"your","timestamp":(.5,.7)}]}
        self.assertIsNone(strip_verified_extra_opening(self.audio,self.target,asr))
    def test_requires_word_timestamps(self):
        asr={"text":"If your rod's looking rough"}
        self.assertIsNone(strip_verified_extra_opening(self.audio,self.target,asr))
