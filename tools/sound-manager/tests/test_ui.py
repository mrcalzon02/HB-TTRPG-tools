"""Integrated window checks using read-only enumeration of this Windows machine.

Native endpoint mutation is mocked; routing engine tests use fake endpoints.
"""
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

@unittest.skipUnless(sys.platform == 'win32', 'This UI inventory check requires Windows endpoints')
class WindowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['QT_QPA_PLATFORM'] = 'offscreen'
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'SOUND_MANAGER_DATA': self.folder.name})
        self.env.start()
        from sound_manager.ui import Window
        self.window = Window(screenshot=True)
        self.window.timer.stop()

    def tearDown(self):
        self.window.close()
        self.window.deleteLater()
        self.app.processEvents()
        self.env.stop()
        self.folder.cleanup()

    def test_eq_preset_persists_and_input_controls_target_real_device(self):
        from sound_manager.ui import EqDialog
        from sound_manager.dsp import PRESETS
        output = next(d for d in self.window.devices if d.kind == 'output')
        dialog = EqDialog(self.window, output)
        dialog.preset('Voice')
        self.assertEqual(self.window.settings.output(output.id)['classic_gains'][8], 3)
        self.assertTrue(Path(self.folder.name, 'settings.json').exists())
        self.window.tabs.setCurrentIndex(1)
        microphone = next(d for d in self.window.devices if d.kind == 'input')
        card = self.window.cards[microphone.id]
        with patch.object(self.window.backend, 'mute') as change:
            card.mute.click()
            change.assert_called_once_with(microphone, not microphone.muted)
        dialog.close()

    def test_start_failure_restores_defaults_and_clears_recovery_record(self):
        backend = self.window.backend
        initial = backend.defaults()
        self.window.settings.output(next(d.id for d in self.window.devices if d.kind == 'output'))['selected'] = True
        with patch.object(backend, 'prepare_bus', return_value=('bus', 'source')), patch.object(backend, 'mute'), patch.object(backend, 'restore_defaults') as restore, patch.object(backend, 'release_bus'), patch.object(self.window.engine, 'start', side_effect=RuntimeError('Device lost')):
            with self.assertRaisesRegex(RuntimeError, 'Device lost'):
                self.window.toggle()
            restore.assert_called_once_with(initial, 'bus')
            self.assertIsNone(self.window.settings.data['restore'])
            self.assertFalse(self.window.running)

    def test_driver_restore_includes_original_microphone(self):
        backend = self.window.backend
        from sound_manager.backend import Device
        self.window.setup_defaults = {'output:0': 'speakers', 'input:0': 'microphone'}
        self.window.settings.data['driver_setup'] = self.window.setup_defaults
        with patch.object(backend, 'defaults', return_value={'output:0': 'cable-out', 'input:0': 'cable-in'}), patch.object(backend, 'devices', return_value=[Device('cable-out', 'Cable', 'output', virtual=True), Device('cable-in', 'Cable', 'input', virtual=True)]), patch.object(backend, 'set_default') as restore:
            self.window.restore_after_setup()
            self.assertEqual(restore.call_count, 2)
            restore.assert_any_call('microphone', 'input', '0')
            self.assertIsNone(self.window.settings.data['driver_setup'])

    def test_auto_start_runs_once_and_can_be_disabled(self):
        self.window.screenshot = False
        with patch.object(self.window, 'toggle', side_effect=lambda: setattr(self.window, 'running', True)) as start:
            self.window.auto_start()
            self.window.auto_start()
            start.assert_called_once()
        self.window.running = False
        self.window.settings.data['auto_start'] = False
        with patch.object(self.window, 'toggle') as start:
            self.window.auto_start()
            start.assert_not_called()
        self.window.screenshot = True

    def test_precision_parametric_eq_and_copy_preserve_routing(self):
        from sound_manager.ui import EqDialog
        outputs = [d for d in self.window.devices if d.kind == 'output']
        dialog = EqDialog(self.window, outputs[0])
        dialog.values[5].setValue(2.5)
        dialog.preamp.setValue(-3)
        dialog.add_filter(dict(type='Notch', frequency=1500, gain=0, q=4))
        config = self.window.settings.output(outputs[0].id)
        self.assertEqual(config['gains'][5], 2.5)
        self.assertEqual(config['filters'][0]['type'], 'Notch')
        if len(outputs)>1:
            destination = self.window.settings.output(outputs[1].id)
            destination.update(selected=False, delay_ms=140)
            dialog.destination.setCurrentIndex(next(i for i in range(dialog.destination.count()) if dialog.destination.itemData(i) and dialog.destination.itemData(i).id==outputs[1].id))
            dialog.copy_to_output()
            self.assertEqual(destination['preamp'], -3)
            self.assertEqual(destination['delay_ms'], 140)
            self.assertFalse(destination['selected'])
        dialog.close()

    def test_sync_button_updates_live_delays(self):
        outputs = [d for d in self.window.devices if d.kind == 'output']
        if len(outputs)<2:
            self.skipTest('Needs two enumerated outputs')
        self.window.running = True
        with patch.object(self.window.engine, 'latencies', return_value={outputs[0].id:20, outputs[1].id:220}), patch.object(self.window, 'save_and_apply') as apply:
            self.window.auto_sync()
            apply.assert_called_once()
            self.assertEqual(self.window.settings.output(outputs[0].id)['delay_ms'], 200)
            self.assertEqual(self.window.settings.output(outputs[1].id)['delay_ms'], 0)
        self.window.running = False

    def test_input_classic_eq_is_saved_separately_from_output_eq(self):
        from sound_manager.ui import EqDialog
        device = next(d for d in self.window.devices if d.kind=='input')
        dialog = EqDialog(self.window, device)
        dialog.tone_values[0].setValue(5)
        dialog.classic_values[8].setValue(-2)
        config = self.window.settings.input(device.id)
        self.assertEqual(config['tones'], [5, 0, 0])
        self.assertEqual(config['classic_gains'][8], -2)
        self.assertFalse(config['monitor'])
        self.assertFalse(config['meter'])
        dialog.close()

    def test_eq_undo_and_redo_restore_classic_tones(self):
        from sound_manager.ui import EqDialog
        device = next(d for d in self.window.devices if d.kind=='output')
        dialog = EqDialog(self.window, device)
        dialog.tone_values[0].setValue(5)
        dialog.undo()
        self.assertEqual(self.window.settings.output(device.id)['tones'][0], 0)
        dialog.redo()
        self.assertEqual(self.window.settings.output(device.id)['tones'][0], 5)
        dialog.close()

    def test_alias_favorite_and_search_keep_native_identity(self):
        device = next(d for d in self.window.devices if d.kind=='output')
        self.window.settings.preference(device.id)['alias'] = 'My desk sound'
        self.window.favorite(device.id, True)
        self.assertEqual(self.window.devices[0].id, device.id)
        self.assertEqual(self.window.display_name(device), 'My desk sound')
        self.window.search.setText('desk sound')
        self.assertFalse(self.window.cards[device.id].isHidden())
        for identifier, card in self.window.cards.items():
            if identifier!=device.id: self.assertTrue(card.isHidden())

    def test_stop_cleans_streams_even_when_default_restore_fails(self):
        self.window.audio_intent = True
        with patch.object(self.window, 'recover', side_effect=RuntimeError('Service stopped')), patch.object(self.window.engine, 'stop') as close, patch.object(self.window, 'refresh'):
            with self.assertRaisesRegex(RuntimeError, 'cleanup pending'):
                self.window.stop()
            close.assert_called_once()
            self.assertFalse(self.window.audio_intent)
            self.assertFalse(self.window.running)

    def test_backup_does_not_change_saved_output_selection(self):
        device = next(d for d in self.window.devices if d.kind=='output')
        self.window.settings.output(device.id)['selected'] = False
        self.window.settings.data['fallback_id'] = device.id
        with patch.object(self.window.backend, 'mute'):
            self.assertTrue(self.window.start_fallback())
            self.assertTrue(self.window.selected(device))
            self.assertFalse(self.window.settings.output(device.id)['selected'])
            self.window.release_fallback()
            self.assertFalse(self.window.selected(device))

    def test_short_lived_restart_does_not_reset_failure_budget(self):
        self.window.audio_intent = True
        self.window.retry_budget.failed(now=0)
        with patch.object(self.window, 'toggle', side_effect=lambda: setattr(self.window, 'running', True)):
            self.window.attempt_start()
        self.assertEqual(self.window.retry_budget.attempts, 1)
        self.assertIsNone(self.window.retry_budget.next_time)
        self.window.running = False

    def test_manual_cancel_prevents_automatic_resume(self):
        self.window.audio_intent = True
        self.window.retry_budget.failed(now=0)
        self.window.cancel_recovery()
        self.assertFalse(self.window.audio_intent)
        self.assertIsNone(self.window.retry_budget.next_time)
        with patch.object(self.window, 'toggle') as restart:
            self.window.attempt_start()
            restart.assert_not_called()
