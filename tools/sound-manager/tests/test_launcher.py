from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from launcher import resolve_release
from sound_manager import startup

class LauncherTests(unittest.TestCase):
    def make_release(self, root, version):
        target = root/'releases'/version/'SimpleSoundManager.exe'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.touch()
        return target

    def test_stable_entry_obeys_current_marker(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            old = self.make_release(root, '0.1.0')
            latest = self.make_release(root, '0.6.0')
            (root/'current_release.txt').write_text('0.6.0')
            self.assertEqual(resolve_release(root), latest.resolve())

    def test_without_marker_uses_numeric_version_order(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.make_release(root, '0.9.0')
            expected = self.make_release(root, '0.10.0')
            self.assertEqual(resolve_release(root), expected.resolve())

    def test_invalid_or_missing_marker_cannot_launch_arbitrary_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'current_release.txt').write_text('../other')
            with self.assertRaises(ValueError): resolve_release(root)
            (root/'current_release.txt').write_text('0.6.0')
            with self.assertRaises(FileNotFoundError): resolve_release(root)

    def test_login_startup_targets_canonical_launcher(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            canonical = root/'SimpleSoundManager.exe'
            canonical.touch()
            release = self.make_release(root, '0.6.0')
            with patch.object(startup.sys, 'frozen', True, create=True), patch.object(startup.sys, 'executable', str(release)):
                self.assertEqual(startup.launch_args(), [str(canonical), '--tray'])
