"""Regression coverage for Windows pyopenjtalk dependency repair policy.

Static source checks run anywhere; runtime Japanese G2P verification happens
on the owner's Windows environment during installation.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class WindowsDependencyPolicy(unittest.TestCase):
    def test_shared_installer_preserves_japanese(self):
        script = (ROOT / "install-windows-requirements.ps1").read_text(encoding="utf-8")
        override = (ROOT / "windows-pyopenjtalk-overrides.txt").read_text(encoding="utf-8")
        self.assertIn("pyopenjtalk-plus==0.4.1.post10", script)
        self.assertIn("--override $overrides", script)
        self.assertIn("pyopenjtalk.g2p", script)
        self.assertIn('sys_platform != "win32"', override)
        self.assertIn("--python $Python", script)
        self.assertNotIn("Remove-Item -Recurse", script)
        self.assertNotIn("rclone", script)

    def test_both_entrypoints_use_single_windows_dependency_source(self):
        setup = (ROOT / "run-nutbuster-local.ps1").read_text(encoding="utf-8")
        repair = (ROOT / "repair-local-backend.ps1").read_text(encoding="utf-8")
        for script in (setup, repair):
            self.assertIn("install-windows-requirements.ps1", script)
            self.assertNotIn("install --verbose -r $requirements", script)
            self.assertNotIn("pip --log $log install --verbose -r $requirements", script)
