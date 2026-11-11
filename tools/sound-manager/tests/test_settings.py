"""Verify waveform history defaults and one-time upgrade behavior."""
import json
import tempfile
from pathlib import Path
import unittest

from sound_manager.settings import Settings


class WaveformSettingsTests(unittest.TestCase):
    def test_new_input_and_output_devices_default_off(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'settings.json'
            settings = Settings(path)
            self.assertFalse(settings.output('speakers')['waveform'])
            self.assertFalse(settings.input('microphone')['waveform'])
            settings.save()
            reopened = Settings(path)
            self.assertFalse(reopened.output('speakers')['waveform'])
            self.assertFalse(reopened.input('microphone')['waveform'])

    def test_old_automatic_waveforms_are_reset_once_then_explicit_choices_persist(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'settings.json'
            path.write_text(json.dumps({
                'outputs': {'speakers': {'waveform': True, 'selected': True, 'preamp': -3}},
                'inputs': {'microphone': {'waveform': True, 'monitor': False, 'meter': False}},
                'auto_start': False
            }), encoding='utf-8')
            upgraded = Settings(path)
            self.assertFalse(upgraded.output('speakers')['waveform'])
            self.assertFalse(upgraded.input('microphone')['waveform'])
            self.assertEqual(upgraded.output('speakers')['preamp'], -3)
            self.assertTrue(upgraded.output('speakers')['selected'])
            self.assertFalse(upgraded.data['auto_start'])
            self.assertTrue(json.loads(path.read_text(encoding='utf-8'))['waveform_opt_in_v1'])
            upgraded.output('speakers')['waveform'] = True
            upgraded.input('microphone')['waveform'] = True
            upgraded.save()
            reopened = Settings(path)
            self.assertTrue(reopened.output('speakers')['waveform'])
            self.assertTrue(reopened.input('microphone')['waveform'])
