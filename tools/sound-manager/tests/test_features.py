import copy
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from scipy.signal import sosfreqz
from sound_manager.dsp import biquad, filter_chain, Equalizer, FILTER_TYPES
from sound_manager.settings import Settings, validate_profile, eq_profile
from sound_manager.timing import DelayLine, alignment_delays
from sound_manager import startup
from sound_manager.waveform import WaveHistory
from sound_manager.dsp import CLASSIC_FREQUENCIES

class FeatureTests(unittest.TestCase):
    def test_classic_tone_controls_change_bass_mid_and_treble(self):
        for index, frequency in enumerate((40, 1000, 16000)):
            tones = [0, 0, 0]
            tones[index] = 6
            _, response = sosfreqz(filter_chain(dict(tones=tones)), worN=[frequency], fs=48000)
            self.assertGreater(20*np.log10(abs(response[0])), 5.5)
        gains = [0]*len(CLASSIC_FREQUENCIES)
        gains[8] = -6
        _, response = sosfreqz(filter_chain(dict(classic_gains=gains)), worN=[1000], fs=48000)
        self.assertAlmostEqual(20*np.log10(abs(response[0])), -6, places=4)

    def test_waveform_three_seconds_is_bounded_and_preserves_stereo_peaks(self):
        history = WaveHistory()
        with patch('sound_manager.waveform.time.monotonic', return_value=10):
            history.append(np.column_stack((np.ones(144000)*.5, np.ones(144000)*-.5)))
        points = history.snapshot(now=10)
        self.assertEqual(len(points), 600)
        self.assertEqual(points[0][1:], (-.5, .5))
        self.assertAlmostEqual(points[0][0], 0)
        self.assertFalse(history.snapshot(now=14))

    def test_tiny_audio_blocks_still_retain_full_waveform_window(self):
        history = WaveHistory()
        with patch('sound_manager.waveform.time.monotonic', return_value=10):
            for _ in range(1000):
                history.append(np.zeros((48, 2)))
        self.assertEqual(len(history.bins), 200)

    def test_parametric_peak_frequency_and_gain(self):
        _, response = sosfreqz([biquad('Peak', 1500, -9, 4)], worN=[100, 1500, 15000], fs=48000)
        self.assertAlmostEqual(20*np.log10(abs(response[1])), -9, places=5)
        self.assertLess(abs(20*np.log10(abs(response[0]))), .1)

    def test_shelves_passes_and_notch(self):
        for kind in FILTER_TYPES:
            sos = [biquad(kind, 1000, 6, .707)]
            _, response = sosfreqz(sos, worN=[20, 1000, 20000], fs=48000)
            self.assertTrue(np.isfinite(response).all())
            poles = np.roots(sos[0][3:])
            self.assertTrue((abs(poles)<1).all())
            if kind == 'Low shelf':
                self.assertAlmostEqual(20*np.log10(abs(response[0])), 6, places=1)
            if kind == 'High shelf':
                self.assertAlmostEqual(20*np.log10(abs(response[-1])), 6, places=1)
            if kind == 'High pass':
                self.assertLess(abs(response[0]), .01)
            if kind == 'Low pass':
                self.assertLess(abs(response[-1]), .01)
            if kind == 'Notch':
                self.assertLess(abs(response[1]), 1e-6)

    def test_preamp_balance_and_dynamic_filter_count(self):
        eq = Equalizer()
        samples = np.full((960, 2), .01)
        out = eq.process(samples, [0]*10, preamp=-6, balance=100)
        self.assertEqual(abs(out[:, 0]).max(), 0)
        np.testing.assert_allclose(out[240:, 1], .01*10**(-6/20), atol=1e-7)
        for filters in ([dict(type='Peak', frequency=500, gain=3, q=2)], []):
            self.assertTrue(np.isfinite(eq.process(samples, [0]*10, filters=filters)).all())

    def test_delay_preserves_samples_across_blocks(self):
        delay = DelayLine(rate=1000, channels=1)
        signal = np.arange(20, dtype=np.float32).reshape(-1, 1)
        result = np.concatenate([delay.process(chunk, 5) for chunk in np.split(signal, 4)])
        np.testing.assert_array_equal(result[:5], 0)
        np.testing.assert_array_equal(result[5:], signal[:-5])
        self.assertEqual(delay.process(signal[:2], 0)[0, 0], 0)

    def test_auto_align_uses_slowest_valid_device(self):
        self.assertEqual(alignment_delays({'wired':20, 'Bluetooth':240, 'unknown':None}), {'wired':220, 'Bluetooth':0})
        with self.assertRaises(ValueError):
            alignment_delays({'only':None})

    def test_profiles_validate_without_changing_selection_or_delay(self):
        config = dict(eq=True, gains=[.5]*10, preamp=-2, balance=20, protect=True, filters=[dict(type='Peak', frequency=400, gain=-3, q=2)], selected=True, delay_ms=250)
        profile = validate_profile(json.loads(json.dumps(eq_profile(config))))
        self.assertNotIn('selected', profile)
        self.assertNotIn('delay_ms', profile)
        with self.assertRaises(ValueError):
            validate_profile(dict(filters=[dict(frequency=99999)]))
        with self.assertRaises(ValueError):
            validate_profile(dict(filters=[{}]*25))

    def test_auto_routing_defaults_on_and_existing_eq_survives(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'settings.json'
            path.write_text(json.dumps({'outputs':{'old':{'selected':True,'gains':[2]*10}}}))
            settings = Settings(path)
            self.assertTrue(settings.data['auto_start'])
            self.assertEqual(settings.output('old')['gains'], [2]*10)
            self.assertFalse(settings.input('microphone')['monitor'])

    def test_linux_login_entry_is_reversible_and_quotes_paths(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {'XDG_CONFIG_HOME':folder}), patch.object(startup.sys, 'platform', 'linux'), patch.object(startup, 'launch_args', return_value=['/path with spaces/python', '/path/run.py', '--tray']):
            startup.set_enabled(True)
            self.assertTrue(startup.is_enabled())
            self.assertIn('Exec="/path with spaces/python"', startup.desktop_path().read_text())
            startup.set_enabled(False)
            self.assertFalse(startup.is_enabled())

    def test_windows_login_registration_is_reversible(self):
        class Registry:
            HKEY_CURRENT_USER, REG_SZ = 1, 1
            values = {}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def CreateKey(self, *args): return self
            def OpenKey(self, *args): return self
            def SetValueEx(self, key, name, unused, kind, value): self.values[name]=value
            def QueryValueEx(self, key, name):
                if name not in self.values: raise FileNotFoundError()
                return self.values[name], 1
            def DeleteValue(self, key, name):
                if name not in self.values: raise FileNotFoundError()
                self.values.pop(name)
        registry = Registry()
        with patch.dict(sys.modules, {'winreg':registry}), patch.object(startup.sys, 'platform', 'win32'), patch.object(startup, 'launch_args', return_value=[r'C:\Program Files\Sound\app.exe','--tray']):
            startup.set_enabled(True)
            self.assertIn('--tray', registry.values[startup.NAME])
            self.assertTrue(startup.is_enabled())
            startup.set_enabled(False)
            self.assertFalse(startup.is_enabled())
