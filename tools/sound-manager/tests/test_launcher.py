from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile
import time
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

    @unittest.skipUnless(sys.platform == 'win32', 'Windows launcher integration')
    def test_compiled_launcher_selects_release_and_forwards_commands(self):
        binary = Path(__file__).resolve().parent.parent/'dist'/'launcher'/'SimpleSoundManagerLauncher.exe'
        if not binary.is_file():
            self.skipTest('Native launcher must be compiled first')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            shutil.copy2(binary, root/'SimpleSoundManager.exe')
            target = root/'releases'/'0.10.1'/'SimpleSoundManager.exe'
            target.parent.mkdir(parents=True)
            shutil.copy2(Path(os.environ['WINDIR'])/'System32'/'cmd.exe', target)
            (root/'current_release.txt').write_text('0.10.1')
            subprocess.run([str(root/'SimpleSoundManager.exe'), '/c', 'echo native-launch-ok>forwarded.txt'], check=True, timeout=10)
            output = target.parent/'forwarded.txt'
            deadline = time.monotonic()+10
            while not output.exists() and time.monotonic()<deadline:
                time.sleep(.1)
            self.assertEqual(output.read_text().strip(), 'native-launch-ok')
