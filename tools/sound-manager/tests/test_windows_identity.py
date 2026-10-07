import ctypes
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from sound_manager.windows_identity import APP_ID, set_process_identity

class IdentityTests(unittest.TestCase):
    def test_installer_and_process_share_version_independent_id(self):
        script = (Path(__file__).resolve().parents[1]/'shortcut-identity.ps1').read_text()
        self.assertIn("$soundTaskbarAppId = '"+APP_ID+"'", script)
        self.assertNotIn('0.7', APP_ID)

    def test_linux_identity_is_no_op(self):
        with patch('sound_manager.windows_identity.sys.platform', 'linux'):
            set_process_identity()

    @unittest.skipUnless(sys.platform == 'win32', 'Windows API check')
    def test_real_process_identity_is_retrievable(self):
        set_process_identity()
        pointer = ctypes.c_void_p()
        getter = ctypes.windll.shell32.GetCurrentProcessExplicitAppUserModelID
        getter.argtypes = [ctypes.POINTER(ctypes.c_void_p)]
        getter.restype = ctypes.c_long
        self.assertEqual(getter(ctypes.byref(pointer)), 0)
        try:
            self.assertEqual(ctypes.wstring_at(pointer.value), APP_ID)
        finally:
            free = ctypes.windll.ole32.CoTaskMemFree
            free.argtypes = [ctypes.c_void_p]
            free(pointer)
