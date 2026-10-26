"""Pure standard-library regression checks for the one-command bootstrap."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile
import tarfile
from unittest import mock

MODULE_PATH = Path(__file__).with_name("bootstrap.py")
spec = importlib.util.spec_from_file_location("factorio_pipeline_bootstrap", MODULE_PATH)
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)


class BootstrapTests(unittest.TestCase):
    def test_official_checksum_uses_exact_archive(self):
        expected = "a" * 64
        manifest = "bad line\n" + expected + "  " + bootstrap.ARCHIVE + "\n"
        self.assertEqual(bootstrap.checksum_manifest(manifest), expected)

    def test_wrong_archive_checksum_is_rejected(self):
        manifest = "b" * 64 + "  something-else.zip\n"
        with self.assertRaises(ValueError):
            bootstrap.checksum_manifest(manifest)

    def test_zip_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            archive = tmp / "evil.zip"
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("../outside.txt", "no")
            with self.assertRaises(ValueError):
                bootstrap.unpack_safely(archive, tmp / "unpack")
            self.assertFalse((tmp / "outside.txt").exists())

    def test_tar_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            tmp = Path(temp)
            archive = tmp / "evil.tar.xz"
            with tarfile.open(archive, "w:xz") as tar:
                info = tarfile.TarInfo("../outside.txt")
                info.size = 0
                tar.addfile(info)
            with self.assertRaises(ValueError):
                bootstrap.unpack_safely(archive, tmp / "unpack")

    def test_linux_windows_binary_paths_are_predictable(self):
        self.assertIn("blender-4.5.15", str(bootstrap.managed_blender()))
        self.assertTrue(bootstrap.managed_blender().name in {"blender", "blender.exe"})

    def test_blender_version_rejects_non_45(self):
        with tempfile.TemporaryDirectory() as temp:
            executable = Path(temp) / "fake-blender"
            executable.write_text("fake executable")
            with mock.patch.object(bootstrap.subprocess, "run") as run:
                run.return_value.stdout = "Blender 5.0.0\n"
                with self.assertRaises(RuntimeError):
                    bootstrap.check_blender(executable)


if __name__ == "__main__":
    unittest.main()
