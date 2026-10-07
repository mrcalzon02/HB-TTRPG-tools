import copy
from pathlib import Path
import tempfile
import unittest
from sound_manager.backend import Device
from sound_manager.settings import Settings
from sound_manager.controls import MuteController
from sound_manager.scenes import capture_scene, validate_scene, apply_scene_settings

class SceneTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.settings = Settings(Path(self.folder.name)/'settings.json')
        self.devices = [Device('speaker', 'Desk speaker', 'output', volume=.4, muted=True),
                        Device('mic', 'Desk mic', 'input', volume=.7, muted=False)]
        self.settings.output('speaker', True).update(tones=[3, -1, 2], delay_ms=230)
        self.settings.input('mic').update(meter=True, delay_ms=40)

    def test_scene_captures_deep_audio_snapshot_without_volatile_or_display_settings(self):
        self.settings.data.update(restore={'bus':'private'}, driver_setup={'input':'mic'}, auto_start=False)
        self.settings.output('speaker').update(waveform=False, eq_view='Live waveform')
        scene = capture_scene(self.settings, self.devices)
        self.assertEqual(scene['devices']['speaker']['volume'], .4)
        self.assertTrue(scene['devices']['speaker']['muted'])
        self.assertEqual(scene['devices']['speaker']['config']['delay_ms'], 230)
        self.settings.output('speaker')['tones'][0] = 9
        self.assertEqual(scene['devices']['speaker']['config']['tones'][0], 3)
        for key in ('restore', 'driver_setup', 'auto_start', 'waveform', 'eq_view'):
            self.assertNotIn(key, scene)
            self.assertNotIn(key, scene['devices']['speaker']['config'])

    def test_recall_restores_audio_but_microphone_capture_is_opt_in(self):
        scene = capture_scene(self.settings, self.devices)
        self.settings.input('mic')['meter'] = False
        self.settings.output('new-device', True)
        self.settings.output('speaker').update(tones=[0,0,0], waveform=False)
        apply_scene_settings(self.settings, scene)
        self.assertFalse(self.settings.input('mic')['meter'])
        self.assertFalse(self.settings.output('new-device')['selected'])
        self.assertFalse(self.settings.output('speaker')['waveform'])
        self.assertEqual(self.settings.output('speaker')['tones'], [3,-1,2])
        apply_scene_settings(self.settings, scene, restore_inputs=True)
        self.assertTrue(self.settings.input('mic')['meter'])

    def test_disconnected_profiles_are_retained_without_inventing_native_levels(self):
        self.settings.output('missing-headset').update(selected=True, delay_ms=180)
        scene = capture_scene(self.settings, self.devices)
        item = scene['devices']['missing-headset']
        self.assertIsNone(item['volume'])
        self.assertIsNone(item['muted'])
        self.assertTrue(item['config']['selected'])
        self.settings.output('missing-headset')['delay_ms'] = 0
        apply_scene_settings(self.settings, scene)
        self.assertEqual(self.settings.output('missing-headset')['delay_ms'], 180)

    def test_scene_saved_under_panic_retains_underlying_mute_intent(self):
        mutes = MuteController(self.settings)
        mutes.state['output'].update(active=True, before={'speaker':False})
        scene = capture_scene(self.settings, self.devices, mutes)
        self.assertFalse(scene['devices']['speaker']['muted'])
        self.assertNotIn('group_mute', scene)

    def test_invalid_import_is_rejected_before_any_settings_change(self):
        scene = capture_scene(self.settings, self.devices)
        before = copy.deepcopy(self.settings.data)
        for key, value in (('volume', float('nan')), ('muted', 'yes')):
            bad = copy.deepcopy(scene)
            bad['devices']['speaker'][key] = value
            with self.assertRaises(ValueError):
                apply_scene_settings(self.settings, bad)
            self.assertEqual(self.settings.data, before)
        bad = copy.deepcopy(scene)
        bad['devices']['speaker']['config']['delay_ms'] = -1
        with self.assertRaises(ValueError):
            validate_scene(bad)

    def test_unknown_keys_cannot_import_startup_or_capture_commands(self):
        scene = capture_scene(self.settings, self.devices)
        scene.update(restore={'bus':'attacker'}, auto_start=True, startup_command='run me')
        scene['devices']['speaker']['config']['waveform'] = False
        safe = validate_scene(scene)
        self.assertNotIn('restore', safe)
        self.assertNotIn('startup_command', safe)
        self.assertNotIn('waveform', safe['devices']['speaker']['config'])
