"""The optional setup phrase can only be removed using recognized word timestamps."""
import sys,unittest
import numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from remote_luxtts_nutbuster import trim_intro_marker
class IntroMarkerTests(unittest.TestCase):
 def test_aligns_known_marker_and_preserves_complete_line(self):
  audio=np.full(48000*3,.2,dtype=np.float32)
  asr={"text":"If okay locks off let those nuts move",
       "chunks":[{"text":"If","timestamp":(.22,.34)},
                 {"text":"Okay","timestamp":(.34,.72)},
                 {"text":"Locks","timestamp":(.79,1.1)},
                 {"text":"off","timestamp":(1.1,1.3)}]}
  result=trim_intro_marker(audio,"LOCKS OFF! LET THOSE NUTS MOVE!",asr)
  self.assertIsNotNone(result)
  self.assertTrue(.4<result[1]<.6)
 def test_never_removes_unidentified_prefix(self):
  audio=np.full(48000*3,.2,dtype=np.float32)
  self.assertIsNone(trim_intro_marker(audio,"LOCKS OFF!",
       {"text":"If locks off","chunks":[{"text":"If","timestamp":(.2,.3)}]}))
 def test_missing_final_word_must_fail(self):
  audio=np.full(48000*3,.2,dtype=np.float32)
  self.assertIsNone(trim_intro_marker(audio,"LOCKS OFF! LET THOSE NUTS MOVE!",
       {"text":"Okay locks off","chunks":[{"text":"Okay","timestamp":(.2,.4)},
                                      {"text":"locks","timestamp":(.5,.6)}]}))
