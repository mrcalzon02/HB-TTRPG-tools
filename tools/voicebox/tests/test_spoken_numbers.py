"""Speech recognition normalization does not confuse numerals with omitted words."""
import sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from remote_luxtts_nutbuster import normalized_words, score_transcript

class WordEquivalenceTests(unittest.TestCase):
    def test_number_words_are_equivalent_to_digits(self):
        self.assertEqual(normalized_words("FIVE IN A ROW"),normalized_words("5 in a row"))
        self.assertTrue(score_transcript("FIVE IN A ROW! RAINBOW NUT INCOMING!",
                      "Five in a row rainbow nut incoming", 4.0)[0])
    def test_brand_spacing_and_prefix(self):
        self.assertEqual(normalized_words("Nut Buster"),normalized_words("NUTBUSTER"))
        self.assertEqual(normalized_words("Nut Tastic"),normalized_words("NUT-TASTIC"))
        self.assertEqual(normalized_words("in coming"),normalized_words("INCOMING"))
    def test_refuses_missing_rod_ending_despite_similar_prefix(self):
        self.assertFalse(score_transcript("YOUR ROD'S LOOKING ROUGH!",
                         "If your rod", 2.0)[0])
