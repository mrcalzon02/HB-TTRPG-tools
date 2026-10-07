import copy
from pathlib import Path
import tempfile
import unittest
from sound_manager.backend import Device
from sound_manager.settings import Settings
from sound_manager.scenes import capture_scene
from sound_manager.backups import capture_backup, validate_backup, identities_for, suggest_mapping, remap_backup

class BackupTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.settings = Settings(Path(self.folder.name)/'settings.json')
        self.devices = [Device('old-speaker', 'USB speakers', 'output', volume=.6), Device('old-mic', 'USB microphone', 'input', volume=.4)]
        self.settings.output('old-speaker', True).update(delay_ms=240, waveform=False, eq_view='Live waveform', tones=[3,0,-2])
        self.settings.input('old-mic').update(monitor=True, meter=True)
        self.settings.preference('old-speaker').update(alias='Desk', favorite=True)
        self.settings.data['scenes'] = {'Gaming':capture_scene(self.settings, self.devices)}
        self.settings.data['fallback_id'] = 'old-speaker'
        self.value = capture_backup(self.settings, self.devices)

    def test_roundtrip_contains_audio_scenes_labels_and_display_without_operational_state(self):
        self.settings.data.update(restore={'bus':'live'}, driver_setup={'secret':'current'}, group_mute={'input':{'active':True}}, update_checked_at=123, startup_command='command')
        backup = capture_backup(self.settings, self.devices)
        self.assertEqual(validate_backup(backup), backup)
        self.assertEqual(backup['display']['old-speaker']['alias'], 'Desk')
        self.assertFalse(backup['display']['old-speaker']['waveform'])
        self.assertIn('Gaming', backup['scenes'])
        for key in ('restore','driver_setup','group_mute','update_checked_at','startup_command'):
            self.assertNotIn(key, backup)
            self.assertNotIn(key, backup['preferences'])

    def test_unique_name_and_kind_suggest_new_computer_device_ids(self):
        devices = [Device('new-speaker','USB speakers','output'), Device('new-mic','USB microphone','input')]
        self.assertEqual(suggest_mapping(self.value, devices), {'old-speaker':'new-speaker','old-mic':'new-mic'})

    def test_ambiguous_names_do_not_pick_an_arbitrary_device(self):
        devices = [Device('speaker-a','USB speakers','output'), Device('speaker-b','USB speakers','output')]
        self.assertIsNone(suggest_mapping(self.value, devices)['old-speaker'])

    def test_remap_updates_current_scenes_display_and_backup_output(self):
        devices = [Device('new-speaker','New desk speakers','output'), Device('new-mic','New mic','input')]
        mapped = remap_backup(self.value, {'old-speaker':'new-speaker','old-mic':'new-mic'}, devices)
        self.assertIn('new-speaker', mapped['current']['devices'])
        self.assertEqual(mapped['current']['fallback_id'], 'new-speaker')
        self.assertIn('new-speaker', mapped['scenes']['Gaming']['devices'])
        self.assertEqual(mapped['display']['new-speaker']['alias'], 'Desk')
        self.assertIn('old-speaker', self.value['current']['devices'])

    def test_skip_and_keep_offline_are_explicit_and_consistent_in_scenes(self):
        mapped = remap_backup(self.value, {'old-speaker':'old-speaker','old-mic':None}, [])
        self.assertIn('old-speaker', mapped['current']['devices'])
        self.assertNotIn('old-mic', mapped['current']['devices'])
        self.assertNotIn('old-mic', mapped['scenes']['Gaming']['devices'])

    def test_wrong_type_and_duplicate_destination_are_rejected(self):
        devices = [Device('target','Replacement','output')]
        with self.assertRaises(ValueError):
            remap_backup(self.value, {'old-speaker':'target','old-mic':'target'}, devices)
        value = copy.deepcopy(self.value)
        value['current']['devices']['second-speaker'] = copy.deepcopy(value['current']['devices']['old-speaker'])
        with self.assertRaisesRegex(ValueError,'same destination'):
            remap_backup(value, {'old-speaker':'target','old-mic':None,'second-speaker':'target'}, devices)

    def test_missing_mapping_cannot_silently_drop_a_saved_device(self):
        with self.assertRaisesRegex(ValueError, 'every saved device'):
            remap_backup(self.value, {}, self.devices)

    def test_unknown_operational_keys_are_stripped_and_invalid_profile_is_rejected(self):
        value = copy.deepcopy(self.value)
        value['preferences'].update(group_mute={'input':False}, login_startup=True)
        value['restore'] = {'bus':'foreign'}
        safe = validate_backup(value)
        self.assertNotIn('restore', safe)
        self.assertNotIn('login_startup', safe['preferences'])
        value['profiles'] = {'bad':{'preamp':float('nan')}}
        with self.assertRaises(ValueError):
            validate_backup(value)

    def test_export_does_not_create_current_profiles_for_scene_only_devices(self):
        extra = copy.deepcopy(self.value['scenes']['Gaming']['devices']['old-speaker'])
        self.settings.data['scenes']['Gaming']['devices']['scene-only'] = extra
        capture_backup(self.settings, self.devices)
        self.assertNotIn('scene-only', self.settings.data['outputs'])
