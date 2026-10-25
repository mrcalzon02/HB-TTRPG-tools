"""Ensure 16-cue retries never re-synthesize or corrupt the other 58."""
import io,json,sys,tempfile,unittest,wave,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import remote_luxtts_nutbuster as base
import retry_failed_nutbuster as retrier

class ResumeTests(unittest.TestCase):
 def test_recovery_verifies_68_and_targets_only_6(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder); wav=io.BytesIO()
   with wave.open(wav,"wb") as p:
    p.setnchannels(1);p.setsampwidth(2);p.setframerate(48000)
    p.writeframes(b"\0\0"*4800)
   data=wav.getvalue()
   digest=__import__("hashlib").sha256(data).hexdigest()
   expected={f"cue-{i:02d}":f"Test cue number {i}" for i in range(74)}
   good=[{"key":key,"file":key+".wav","text":expected[key],
          "bytes":len(data),"sha256":digest,"asrVerified":True} for key in list(expected)[:68]]
   bad=[{"key":key} for key in list(expected)[68:]]
   prior=root/"old.zip"
   with zipfile.ZipFile(prior,"w") as archive:
    archive.writestr("manifest.json",json.dumps({"requestedLineCount":74,
       "verifiedCount":68,"failedCount":6,"clips":good,"failedTakes":bad}))
    for c in good:archive.writestr(c["file"],data)
   approved,rejected=retrier.restore_previous(prior,root/"new",expected)
   self.assertEqual(len(approved),68)
   self.assertEqual(rejected,list(expected)[68:])
   self.assertEqual((root/"new"/good[0]["file"]).read_bytes(),data)
   self.assertEqual(len(list((root/"new").glob("*.wav"))),68)
 def test_corrupt_prior_rejected(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);p=root/"broken.zip"
   with zipfile.ZipFile(p,"w") as z:z.writestr("manifest.json",
      json.dumps({"requestedLineCount":74,"verifiedCount":57,"failedCount":17}))
   with self.assertRaises(ValueError):
    retrier.restore_previous(p,root/"result",{str(i):str(i) for i in range(74)})
