import tempfile
from pathlib import Path
import unittest
from unittest.mock import Mock
import numpy as np
from sound_manager.backend import Device
from sound_manager.controls import MuteController, EqHistory
from sound_manager.settings import Settings
from sound_manager.waveform import WaveHistory
from sound_manager.dsp import Equalizer

class ControlsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.settings = Settings(Path(self.directory.name)/'settings.json')
        self.controls = MuteController(self.settings)

    def tearDown(self):
        self.directory.cleanup()

    def test_group_mute_restores_only_original_states(self):
        devices = [Device('a','A','output',muted=False), Device('b','B','output',muted=True), Device('mic','Mic','input')]
        change = Mock()
        self.controls.set('output', True, devices, change)
        change.assert_called_once_with(devices[0], True)
        self.assertTrue(devices[0].muted)
        self.assertFalse(devices[2].muted)
        change.reset_mock()
        self.controls.set('output', False, devices, change)
        self.assertFalse(devices[0].muted)
        self.assertTrue(devices[1].muted)
        self.assertFalse(self.controls.active('output'))

    def test_mute_covers_reconnected_devices_and_persists(self):
        first = Device('a','A','input')
        change = Mock()
        self.controls.set('input', True, [first], change)
        second = Device('new','New microphone','input')
        self.controls.sync([first, second], change)
        self.assertTrue(second.muted)
        reloaded = MuteController(Settings(self.settings.path))
        self.assertTrue(reloaded.active('input'))
        reloaded.set('input', False, [first, second], change)
        self.assertFalse(first.muted)
        self.assertFalse(second.muted)

    def test_failed_mute_is_reported_and_does_not_stop_other_devices(self):
        devices = [Device('bad','Bad','output'), Device('good','Good','output')]
        def change(device, value):
            if device.id=='bad': raise RuntimeError('Unavailable')
        errors = self.controls.set('output', True, devices, change)
        self.assertEqual(len(errors), 1)
        self.assertTrue(devices[1].muted)
        self.assertTrue(self.controls.active('output'))

    def test_eq_undo_coalesces_gesture_and_discards_redo_after_edit(self):
        history = EqHistory({'gain':0})
        history.record({'gain':1}, group='slider', now=1)
        history.record({'gain':2}, group='slider', now=1.1)
        self.assertEqual(len(history.items), 2)
        self.assertEqual(history.undo(), {'gain':0})
        self.assertEqual(history.redo(), {'gain':2})
        history.undo()
        history.record({'gain':5}, now=2)
        self.assertEqual(history.redo(), {'gain':5})

    def test_editing_history_is_bounded_and_isolated(self):
        history = EqHistory({'gain':[0]}, limit=3)
        for i in range(1, 10): history.record({'gain':[i]})
        self.assertEqual(len(history.items), 3)
        current = history.current
        current['gain'][0] = 99
        self.assertEqual(history.current, {'gain':[9]})

    def test_real_clip_count_peak_and_rms_reset(self):
        eq = Equalizer()
        samples = np.ones((4800, 2))*.5
        output = eq.process(samples, [0]*10, preamp=12, protect=False)
        self.assertGreater(eq.clipped_samples, 0)
        history = WaveHistory()
        history.append(output, clipped=eq.clipped_samples)
        peak, rms, clipped = history.levels()
        self.assertAlmostEqual(peak, .99, places=5)
        self.assertGreater(rms, 0)
        self.assertEqual(clipped, eq.clipped_samples)
        history.reset_levels()
        self.assertEqual(history.levels()[0], 0)
        self.assertEqual(history.levels()[2], 0)
