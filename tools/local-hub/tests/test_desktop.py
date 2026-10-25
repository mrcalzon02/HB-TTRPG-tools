"""Headless GUI lifecycle regression tests; no display or speech model needed."""
import socket
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import desktop


def free_port():
    with socket.socket() as connection:
        connection.bind(("127.0.0.1", 0))
        return connection.getsockname()[1]


class Event:
    def __init__(self):
        self.callbacks = []

    def __iadd__(self, callback):
        self.callbacks.append(callback)
        return self

    def emit(self):
        for callback in self.callbacks:
            callback()


class FakeWebview:
    def __init__(self, fail=False):
        self.window = None
        self.fail = fail
        self.url = None

    def create_window(self, title, url, **options):
        self.url = url
        self.window = type("Window", (), {})()
        self.window.events = type("Events", (), {})()
        self.window.events.closed = Event()
        return self.window

    def start(self, **kwargs):
        with urllib.request.urlopen(self.url, timeout=4) as response:
            assert response.status == 200
            assert b"Narration studio" in response.read()
        if self.fail:
            raise RuntimeError("GUI failed after server started")
        self.window.events.closed.emit()


class DesktopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name)
        self.root = base / "site"
        self.root.mkdir()
        (self.root / "index.html").write_text("<title>Archive</title>")
        self.private = base / "state"
        self.port = free_port()

    def new_runtime(self):
        return desktop.DesktopRuntime(self.root, self.private, port=self.port)

    def test_one_window_close_shuts_down_http_and_allows_relaunch(self):
        for attempt in range(2):
            runner = self.new_runtime()
            gui = FakeWebview()
            runner.run(gui)
            self.assertEqual(gui.url, runner.url)
            self.assertTrue(runner._stopped)
            self.assertFalse(runner.thread.is_alive())
            with socket.socket() as connection:
                self.assertNotEqual(connection.connect_ex(("127.0.0.1", self.port)), 0)
            # Next iteration must be able to bind the same port immediately.

    def test_duplicate_launch_rejected_without_killing_first(self):
        first, second = self.new_runtime(), self.new_runtime()
        first.start()
        try:
            with self.assertRaises(OSError):
                second.start()
            self.assertTrue(second._stopped is False)
            with urllib.request.urlopen(first.url, timeout=4) as response:
                self.assertEqual(response.status, 200)
        finally:
            second.stop()
            first.stop()
            first.stop()

    def test_gui_crash_releases_listener(self):
        runner = self.new_runtime()
        with self.assertRaisesRegex(RuntimeError, "GUI failed"):
            runner.run(FakeWebview(fail=True))
        self.assertTrue(runner._stopped)
        replacement = self.new_runtime()
        replacement.start()
        replacement.stop()

    def test_closing_active_job_forces_exit_after_cleanup(self):
        runner = self.new_runtime()
        gui = FakeWebview()
        original_start = gui.start

        def close_with_job(**kwargs):
            with runner.state.lock:
                runner.state.jobs["fake"] = {"status": "generating"}
            return original_start(**kwargs)

        gui.start = close_with_job
        with mock.patch.object(desktop.os, "_exit") as hard_exit:
            runner.run(gui)
        hard_exit.assert_called_once_with(0)
        self.assertTrue(runner._stopped)
        self.assertFalse(runner.thread.is_alive())

    def test_private_directory_cannot_be_inside_checkout(self):
        runner = desktop.DesktopRuntime(self.root, self.root / "private",
                                        port=self.port)
        with self.assertRaisesRegex(ValueError, "private output"):
            runner.start()



class BackendShutdownTests(unittest.TestCase):
    def test_optional_backend_gets_killed_after_terminate_timeout(self):
        import subprocess
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            root = base / "archive"
            root.mkdir()
            state = desktop.HubState(root, base / "output")
            process = mock.Mock()
            process.poll.return_value = None
            process.wait.side_effect = [subprocess.TimeoutExpired("voicebox", 3), 0]
            state.backend_process = process
            state.close()
            process.terminate.assert_called_once()
            process.kill.assert_called_once()
            self.assertIsNone(state.backend_process)

if __name__ == "__main__":
    unittest.main()
