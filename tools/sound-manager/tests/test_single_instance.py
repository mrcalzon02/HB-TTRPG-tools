import os
from pathlib import Path
import subprocess
import sys
import time
import unittest
import uuid

class SingleInstanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['QT_QPA_PLATFORM'] = 'offscreen'
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def test_second_process_requests_existing_window_without_tray(self):
        from sound_manager.single_instance import InstanceServer
        opened = []
        name = 'sound-manager-test-'+uuid.uuid4().hex
        server = InstanceServer(lambda: opened.append(True), name=name)
        command = "import sys; from PySide6.QtCore import QCoreApplication; from sound_manager.single_instance import reopen_existing; app=QCoreApplication([]); sys.exit(0 if reopen_existing(sys.argv[1]) else 1)"
        child = subprocess.Popen([sys.executable, '-c', command, name], cwd=Path(__file__).resolve().parents[1])
        deadline = time.monotonic()+10
        while child.poll() is None and time.monotonic() < deadline:
            self.app.processEvents()
            time.sleep(.01)
        if child.poll() is None:
            child.kill()
        self.assertEqual(child.wait(), 0)
        self.assertEqual(opened, [True])
        server.server.close()
        server.deleteLater()
        self.app.processEvents()

    def test_missing_reopen_channel_is_reported_as_unavailable(self):
        from sound_manager.single_instance import reopen_existing
        self.assertFalse(reopen_existing('sound-manager-missing-'+uuid.uuid4().hex))
