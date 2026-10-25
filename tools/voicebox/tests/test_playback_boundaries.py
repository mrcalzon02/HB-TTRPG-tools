"""Regression: no LuxTTS WAV may start/end abruptly at sample boundaries."""
import sys, unittest, wave, io
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from remote_luxtts_nutbuster import playback_safe_waveform

class BoundaryMarginTests(unittest.TestCase):
    def test_margins_are_silent_even_for_nonzero_input_edges(self):
        import numpy as np
        rate=48000
        raw=np.full(rate,dtype=np.float64,fill_value=0.3)
        fixed=playback_safe_waveform(raw,sample_rate=rate)
        self.assertEqual(len(fixed),len(raw)+round(rate*.220)+round(rate*.380))
        self.assertTrue(np.all(fixed[:round(rate*.220)] == 0))
        self.assertTrue(np.all(fixed[-round(rate*.380):] == 0))
        self.assertGreater(float(np.max(np.abs(fixed[round(rate*.220):round(rate*1.220)]))),0.25)
        self.assertAlmostEqual(float(fixed[round(rate*.220)]),0,places=7)
        self.assertAlmostEqual(float(fixed[-round(rate*.380)-1]),0,places=7)
    def test_invalid_waveform_rejected(self):
        import numpy as np
        for raw in (np.zeros(20), np.array([float("nan")]*48000)):
            with self.assertRaises(ValueError):
                playback_safe_waveform(raw)
    def test_repaired_wav_has_zero_playback_edges(self):
        import numpy as np
        from tempfile import TemporaryDirectory
        rate=48000
        signal=np.random.default_rng(22).uniform(-.1,.1,rate//2)
        data=playback_safe_waveform(signal)
        with TemporaryDirectory() as temp:
            target=Path(temp)/"take.wav"
            pcm=(np.clip(data,-1,1)*32767).astype("<i2")
            with wave.open(str(target),"wb") as output:
                output.setnchannels(1);output.setsampwidth(2);output.setframerate(rate)
                output.writeframes(pcm.tobytes())
            with wave.open(str(target),"rb") as readback:
                values=np.frombuffer(readback.readframes(readback.getnframes()),dtype="<i2")
            self.assertFalse(np.any(values[:round(rate*.220)]))
            self.assertFalse(np.any(values[-round(rate*.380):]))
