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

    def test_delay_controls_survive_compact_view_and_refresh(self):
        self.window.set_advanced(False)
        for card in self.window.cards.values():
            self.assertFalse(card.delay.isHidden())
            self.assertFalse(card.delay_value.isHidden())
        self.assertFalse(self.window.system_timing_panel.isHidden())
        device = next(d for d in self.window.devices if d.kind == 'output')
        with patch.object(self.window, 'save_and_apply'):
            self.window.set_delay(device, 175)
        self.window.refresh(True)
        self.assertEqual(self.window.cards[device.id].delay_value.value(), 175)
        self.assertFalse(self.window.cards[device.id].delay.isHidden())

    def test_update_handoff_requires_successful_audio_cleanup(self):
        from sound_manager import updates
        from pathlib import Path
        self.window.updater.staged = Path('fixture')
        self.window.running = True
        with patch.object(self.window, 'stop', side_effect=RuntimeError('Audio cleanup failed')), patch.object(updates, 'handoff') as handoff:
            self.window.updater.install()
            handoff.assert_not_called()
            self.assertIn('Audio cleanup failed', self.window.updater.message)
        self.window.running = False

    def test_waveform_toggle_is_per_device_persistent_and_does_not_capture_audio(self):
        from sound_manager.settings import Settings
        from sound_manager.ui import EqDialog
        microphone = next(d for d in self.window.devices if d.kind == 'input')
        other = next(d for d in self.window.devices if d.kind == 'output')
        with patch.object(self.window.engine, 'configure_inputs') as capture:
            self.window.cards[microphone.id].waveform_toggle.setChecked(False)
            capture.assert_not_called()
        card = self.window.cards[microphone.id]
        self.assertTrue(card.waveform.isHidden())
        self.assertFalse(card.waveform.timer.isActive())
        self.assertFalse(self.window.settings.input(microphone.id)['meter'])
        self.assertFalse(self.window.settings.input(microphone.id)['monitor'])
        self.assertTrue(self.window.settings.output(other.id)['waveform'])
        self.assertFalse(Settings(Path(self.folder.name)/'settings.json').input(microphone.id)['waveform'])
        dialog = EqDialog(self.window, microphone)
        from sound_manager.waveform import WaveformWidget
        self.assertTrue(dialog.findChild(WaveformWidget).isHidden())
        dialog.close()
        self.window.refresh(True)
        self.assertFalse(self.window.cards[microphone.id].waveform_toggle.isChecked())

    def test_global_eq_bypass_preserves_profiles_and_device_bypass_flags(self):
        output = next(d for d in self.window.devices if d.kind == 'output')
        microphone = next(d for d in self.window.devices if d.kind == 'input')
        self.window.settings.output(output.id).update(eq=True, preamp=-5, delay_ms=125)
        self.window.settings.input(microphone.id)['eq'] = False
        with patch.object(self.window, 'save_and_apply'):
            self.window.set_eq_bypass(True)
            self.assertFalse(self.window.configurations()[output.id]['eq'])
            self.assertEqual(self.window.configurations()[output.id]['preamp'], 0)
            self.assertFalse(self.window.configurations()[output.id]['protect'])
            self.assertTrue(self.window.settings.output(output.id)['eq'])
            self.assertEqual(self.window.settings.output(output.id)['delay_ms'], 125)
            self.window.set_eq_bypass(False)
            self.assertTrue(self.window.configurations()[output.id]['eq'])
            self.assertFalse(self.window.input_configurations()[microphone.id]['eq'])
            self.assertEqual(self.window.settings.output(output.id)['preamp'], -5)

    def test_reset_all_delays_keeps_eq_and_resets_disconnected_devices(self):
        self.window.settings.output('disconnected').update(delay_ms=400, preamp=-4)
        self.window.settings.input('missing-mic').update(delay_ms=120, monitor=False)
        self.window.system_delay.setValue(80)
        with patch.object(self.window, 'save_and_apply'):
            self.window.reset_all_delays()
        self.assertEqual(self.window.settings.output('disconnected')['delay_ms'], 0)
        self.assertEqual(self.window.settings.input('missing-mic')['delay_ms'], 0)
        self.assertEqual(self.window.system_delay.value(), 0)
        self.assertEqual(self.window.settings.data['system_delay_ms'], 0)
        self.assertEqual(self.window.settings.output('disconnected')['preamp'], -4)

    def test_equalizer_display_switch_remembers_device_and_does_not_start_monitoring(self):
        from sound_manager.ui import EqDialog
        device = next(d for d in self.window.devices if d.kind == 'input')
        config = self.window.settings.input(device.id)
        config['tones'] = [2, -1, 3]
        dialog = EqDialog(self.window, device)
        self.assertFalse(dialog.compact_waveform.isHidden())
        with patch.object(self.window.engine, 'configure_inputs') as capture:
            dialog.display_mode.setCurrentIndex(1)
            self.assertEqual(dialog.display_stack.currentIndex(), 1)
            self.assertTrue(dialog.compact_waveform.isHidden())
            self.assertTrue(dialog.curve.isHidden())
            dialog.waveform_switch.setChecked(False)
            self.assertTrue(dialog.live_waveform.isHidden())
            dialog.waveform_switch.setChecked(True)
            capture.assert_not_called()
        self.assertEqual(config['tones'], [2, -1, 3])
        self.assertFalse(config['monitor'])
        self.assertFalse(config['meter'])
        dialog.close()
        reopened = EqDialog(self.window, device)
        self.assertEqual(reopened.display_mode.currentText(), 'Live waveform')
        reopened.display_mode.setCurrentIndex(0)
        self.assertFalse(reopened.curve.isHidden())
        self.assertFalse(reopened.compact_waveform.isHidden())
        reopened.close()

    def test_waveform_checked_shows_compact_trace_alongside_eq_controls(self):
        from sound_manager.ui import EqDialog
        device = next(d for d in self.window.devices if d.kind == 'output')
        dialog = EqDialog(self.window, device)
        dialog.display_mode.setCurrentIndex(0)
        dialog.show()
        self.app.processEvents()
        self.assertTrue(dialog.compact_waveform.isVisible())
        self.assertTrue(dialog.compact_waveform.timer.isActive())
        dialog.waveform_switch.setChecked(False)
        self.assertTrue(dialog.compact_waveform.isHidden())
        self.assertFalse(dialog.compact_waveform.timer.isActive())
        dialog.waveform_switch.setChecked(True)
        self.assertTrue(dialog.compact_waveform.isVisible())
        dialog.display_mode.setCurrentIndex(1)
        self.assertFalse(dialog.compact_waveform.timer.isActive())
        self.assertTrue(dialog.live_waveform.isVisible())
        self.assertTrue(dialog.live_waveform.timer.isActive())
        dialog.close()

    def test_freeze_holds_shared_waveform_snapshot_without_changing_audio(self):
        import numpy as np
        from sound_manager.waveform import WaveHistory
        from sound_manager.ui import EqDialog
        device = next(d for d in self.window.devices if d.kind == 'output')
        history = WaveHistory()
        history.append(np.full((960, 2), .1, dtype=np.float32), clipped=3)
        with patch.object(self.window.engine, 'history', return_value=history), patch.object(self.window.engine, 'configure') as configure:
            self.window.set_waveform_frozen(device, True)
            frozen = self.window.waveform_freezes[device.id]
            before = list(frozen['points'])
            history.append(np.full((960, 2), .7, dtype=np.float32), clipped=5)
            self.assertEqual(frozen['points'], before)
            self.assertEqual(frozen['levels'][2], 3)
            self.assertFalse(self.window.cards[device.id].waveform.timer.isActive())
            dialog = EqDialog(self.window, device)
            self.assertTrue(dialog.freeze_switch.isChecked())
            dialog.show()
            self.app.processEvents()
            self.assertFalse(dialog.compact_waveform.timer.isActive())
            self.window.reset_meter_holds(device.id)
            self.assertEqual(history.levels()[2], 0)
            self.assertEqual(frozen['levels'][2], 0)
            self.assertEqual(frozen['points'], before)
            self.window.set_waveform_frozen(device, False)
            self.assertNotIn(device.id, self.window.waveform_freezes)
            self.assertFalse(dialog.freeze_switch.isChecked())
            self.assertTrue(dialog.compact_waveform.timer.isActive())
            configure.assert_not_called()
            dialog.close()

    def test_freeze_before_audio_does_not_enable_input_capture_or_save_samples(self):
        device = next(d for d in self.window.devices if d.kind == 'input')
        with patch.object(self.window.engine, 'history', return_value=None), patch.object(self.window.engine, 'configure_inputs') as capture:
            self.window.set_waveform_frozen(device, True)
            capture.assert_not_called()
            self.assertFalse(self.window.waveform_freezes[device.id]['signal'])
        self.window.settings.save()
        self.assertNotIn('waveform_freezes', self.window.settings.data)
        self.assertFalse(self.window.settings.input(device.id)['meter'])
        self.assertFalse(self.window.settings.input(device.id)['monitor'])

    def test_scene_recall_native_controls_and_previous_mix_preserve_mute_guards(self):
        controller = self.window.scenes
        device = next(d for d in self.window.devices if d.kind == 'output')
        original = controller.capture()
        desired = __import__('copy').deepcopy(original)
        desired['devices'][device.id]['config']['delay_ms'] = 180
        desired['devices'][device.id]['volume'] = .35
        desired['devices'][device.id]['muted'] = False
        controller.store('Desk', desired)
        self.window.mutes.state['output']['active'] = True
        with patch.object(self.window.backend, 'volume') as volume, patch.object(self.window.backend, 'mute') as mute:
            controller.apply('Desk')
            self.assertEqual(self.window.settings.output(device.id)['delay_ms'], 180)
            volume.assert_any_call(device, .35)
            mute.assert_any_call(device, True)
            self.assertTrue(self.window.mutes.active('output'))
            self.assertFalse(self.window.mutes.state['output']['before'][device.id])
            controller.restore_previous()
        self.assertEqual(self.window.settings.output(device.id)['delay_ms'], original['devices'][device.id]['config']['delay_ms'])

    def test_scene_does_not_restart_running_audio_for_same_capture_layout(self):
        scene = self.window.scenes.capture()
        device = next(d for d in self.window.devices if d.kind == 'output')
        scene['devices'][device.id]['config']['delay_ms'] = 120
        self.window.scenes.store('Gaming', scene)
        self.window.running = True
        with patch.object(self.window.backend, 'volume'), patch.object(self.window.backend, 'mute'), patch.object(self.window, 'stop') as stop, patch.object(self.window, 'toggle') as start, patch.object(self.window.engine, 'retry_outputs'), patch.object(self.window.engine, 'configure'), patch.object(self.window.engine, 'configure_inputs'):
            self.window.scenes.apply('Gaming')
            stop.assert_not_called()
            start.assert_not_called()
        self.window.running = False

    def test_scene_names_are_persisted_and_visible_in_tray(self):
        self.window.scenes.store('Movies', self.window.scenes.capture())
        self.window.tray_menu()
        actions = self.window.tray.contextMenu().actions()
        scene_menu = next(a.menu() for a in actions if a.text() == 'Audio scenes')
        self.assertIn('Movies', [a.text() for a in scene_menu.actions()])
        from sound_manager.settings import Settings
        self.assertIn('Movies', Settings(Path(self.folder.name)/'settings.json').data['scenes'])

    def test_scene_source_layout_change_restarts_only_if_already_running(self):
        scene = self.window.scenes.capture()
        scene['layout'] = 'Mono' if self.window.capture_layout() != 'Mono' else 'Stereo'
        self.window.scenes.store('Alternate layout', scene)
        self.window.running = True
        with patch.object(self.window.backend, 'volume'), patch.object(self.window.backend, 'mute'), patch.object(self.window, 'stop') as stop, patch.object(self.window, 'toggle') as start, patch.object(self.window.engine, 'configure'), patch.object(self.window.engine, 'configure_inputs'):
            self.window.scenes.apply('Alternate layout')
            stop.assert_called_once()
            start.assert_called_once()
        self.window.running = False
        scene['layout'] = 'Stereo'
        with patch.object(self.window.backend, 'volume'), patch.object(self.window.backend, 'mute'), patch.object(self.window, 'stop') as stop, patch.object(self.window, 'toggle') as start:
            self.window.scenes.apply(value=scene)
            stop.assert_not_called()
            start.assert_not_called()

    def test_scene_hardware_kind_mismatch_does_not_change_settings(self):
        import copy
        scene = self.window.scenes.capture()
        device = next(d for d in self.window.devices if d.kind == 'output')
        scene['devices'][device.id]['kind'] = 'input'
        scene['devices'][device.id]['config'].update(monitor=False, meter=False)
        before = copy.deepcopy(self.window.settings.data)
        with self.assertRaises(ValueError):
            self.window.scenes.apply(value=scene)
        self.assertEqual(before, self.window.settings.data)

    def test_backup_restore_preserves_recovery_mute_guards_and_saves_old_setup(self):
        from sound_manager.backups import identities_for
        controller = self.window.backups
        value = controller.capture()
        device = next(d for d in self.window.devices if d.kind=='output')
        value['display'][device.id].update(alias='Restored label', favorite=True, waveform=False)
        value['current']['devices'][device.id]['config']['delay_ms'] = 190
        value['preferences'].update(advanced_visible=True, check_updates=False, scene_restore_inputs=True)
        self.window.settings.data['restore'] = {'bus':'owned bus'}
        self.window.mutes.state['input']['active'] = True
        mapping = {key:key for key in identities_for(value['current'], value['scenes'])}
        with patch.object(self.window.backend, 'volume'), patch.object(self.window.backend, 'mute'):
            path = controller.restore(value, mapping)
        self.assertTrue(path.is_file())
        self.assertEqual(self.window.settings.data['restore'], {'bus':'owned bus'})
        self.assertTrue(self.window.mutes.active('input'))
        self.assertFalse(self.window.settings.data['scene_restore_inputs'])
        self.assertEqual(self.window.settings.preference(device.id)['alias'], 'Restored label')
        self.assertFalse(self.window.settings.output(device.id)['waveform'])
        self.assertEqual(self.window.settings.output(device.id)['delay_ms'], 190)
        self.assertTrue(self.window.advanced_button.isChecked())
        import json
        original = json.loads(path.read_text())
        self.assertNotEqual(original['display'][device.id]['alias'], 'Restored label')
        from sound_manager.backups_ui import BackupController
        self.assertEqual(BackupController(self.window).last_safety, path)

    def test_backup_load_preview_does_not_mutate_or_open_input_capture(self):
        from sound_manager.backups_ui import write_backup
        self.window.backups.show()
        dialog = self.window.backups.dialog
        value = self.window.backups.capture()
        file = Path(self.folder.name)/'portable.json'
        write_backup(file, value)
        import copy
        before = copy.deepcopy(self.window.settings.data)
        with patch.object(self.window.engine, 'configure_inputs') as capture:
            dialog.load_path(file)
            capture.assert_not_called()
        self.assertEqual(before, self.window.settings.data)
        self.assertTrue(dialog.restore_button.isEnabled())
        self.assertFalse(dialog.microphones.isChecked())
        file.write_text('{invalid', encoding='utf-8')
        dialog.load_path(file)
        self.assertFalse(dialog.restore_button.isEnabled())
        self.assertIsNone(dialog.loaded)
        dialog.close()

    def test_backup_invalid_mapping_does_not_change_settings_or_write_safety_file(self):
        import copy
        value = self.window.backups.capture()
        before = copy.deepcopy(self.window.settings.data)
        with self.assertRaises(ValueError):
            self.window.backups.restore(value, {})
        self.assertEqual(before, self.window.settings.data)
        self.assertIsNone(self.window.backups.last_safety)

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

    def test_solo_preserves_device_selections_and_panic_mute(self):
        outputs=[d for d in self.window.devices if d.kind=='output']
        self.assertGreaterEqual(len(outputs),2)
        for device in outputs:
            self.window.settings.output(device.id)['selected']=True
        with patch.object(self.window.backend,'mute') as mute:
            self.window.set_solo(outputs[0].id)
            configurations=self.window.configurations()
            self.assertFalse(configurations[outputs[0].id]['_solo_silenced'])
            self.assertTrue(configurations[outputs[1].id]['_solo_silenced'])
            self.assertTrue(all(self.window.settings.output(d.id)['selected'] for d in outputs))
            mute.assert_not_called()
            self.window.mutes.state['output']['active']=True
            self.assertTrue(self.window.configurations()[outputs[0].id]['_panic'])
            self.window.set_solo(None)
            self.assertFalse(any(c['_solo_silenced'] for c in self.window.configurations().values()))

    def test_hidden_devices_remain_routed_and_can_be_restored_in_organization(self):
        from sound_manager.everyday import EverydayDialog
        output=next(d for d in self.window.devices if d.kind=='output')
        self.window.settings.output(output.id)['selected']=True
        dialog=EverydayDialog(self.window)
        dialog.list.setCurrentRow(dialog.ids.index(output.id))
        dialog.hide_device()
        self.assertTrue(self.window.settings.preference(output.id)['hidden'])
        self.assertTrue(self.window.configurations()[output.id]['selected'])
        self.assertTrue(self.window.cards[output.id].isHidden())
        dialog.hide_device()
        self.assertFalse(self.window.settings.preference(output.id)['hidden'])
        dialog.close()

    def test_saved_order_and_delay_nudges_survive_rebuild_and_clamp(self):
        original=[d.id for d in self.window.devices]
        self.window.move_device(original[1],-1)
        self.assertEqual(self.window.devices[0].id,original[1])
        self.window.refresh(True)
        self.assertEqual(self.window.devices[0].id,original[1])
        device=self.window.devices[0]
        from PySide6.QtWidgets import QPushButton
        card=self.window.cards[device.id]
        plus=next(b for b in card.findChildren(QPushButton) if b.text()=='+5 ms')
        minus=next(b for b in card.findChildren(QPushButton) if b.text()=='-10 ms')
        self.window.set_delay(device,1998)
        plus.click()
        self.assertEqual(self.window.settings.device(device)['delay_ms'],2000)
        self.window.set_delay(device,3)
        minus.click()
        self.assertEqual(self.window.settings.device(device)['delay_ms'],0)

    def test_cycle_outputs_respects_favorites_and_privacy_mute(self):
        outputs=[d for d in self.window.devices if d.kind=='output']
        self.window.settings.preference(outputs[0].id)['favorite']=True
        self.window.settings.preference(outputs[1].id)['favorite']=True
        for d in outputs:
            self.window.settings.output(d.id)['selected']=d.id==outputs[0].id
        self.window.mutes.state['output']['active']=True
        with patch.object(self.window.backend,'mute') as mute:
            self.window.dispatch_action('cycle-output')
            self.assertTrue(self.window.settings.output(outputs[1].id)['selected'])
            self.assertEqual(sum(c['selected'] for c in self.window.settings.data['outputs'].values()),1)
            mute.assert_called_once_with(outputs[1],True)
