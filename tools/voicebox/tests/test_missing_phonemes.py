"""Regression for words missing at the beginning/end of LuxTTS output."""
import sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from remote_luxtts_nutbuster import score_transcript, spoken_text, normalized_words

class OmittedWordTests(unittest.TestCase):
    def test_rejects_user_supplied_bad_rod_take(self):
        target="YOUR ROD'S LOOKING ROUGH!"
        self.assertFalse(score_transcript(target, "If your rod", 0.576)[0])
    def test_accepts_complete_rod_take(self):
        self.assertTrue(score_transcript("YOUR ROD'S LOOKING ROUGH!",
                    "Your rod's looking rough.", 1.5)[0])
        self.assertTrue(score_transcript("YOUR ROD'S LOOKING ROUGH!",
                    "Your rods looking rough.", 1.5)[0])
    def test_rejects_missing_first_word(self):
        self.assertFalse(score_transcript("YOUR ROD'S LOOKING ROUGH!",
                         "Rod is looking rough", 1.5)[0])
    def test_rejects_missing_final_word(self):
        self.assertFalse(score_transcript("YOUR ROD'S LOOKING ROUGH!",
                         "Your rod's looking", 1.5)[0])
    def test_rejects_impossibly_short_duration(self):
        self.assertFalse(score_transcript("YOUR ROD'S LOOKING ROUGH!",
                         "Your rod's looking rough", 0.576)[0])
    def test_prompt_is_sentence_case(self):
        self.assertEqual(spoken_text("YOUR ROD'S LOOKING ROUGH!"),"Your rod's looking rough!")
