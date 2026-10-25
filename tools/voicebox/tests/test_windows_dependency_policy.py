"""English-only requirements: functional transformation and launcher regression checks."""
from pathlib import Path
import importlib.util
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("voicebox_english_requirements", ROOT / "prepare_english_requirements.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

SOURCE = """# Official upstream sample
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
torch>=2.5.0
kokoro>=0.9.4
misaki[en,ja,zh]>=0.9.4
# Japanese tokenizer requires a dictionary
unidic-lite>=1.0.8
# Chatterbox optional dependencies
pykakasi
Zipvoice @ git+https://github.com/ysharma3501/LuxTTS.git
"""

class EnglishOnlyRequirementsTests(unittest.TestCase):
    def test_derives_english_only_and_preserves_core_engines(self):
        result = module.derive_english_only(SOURCE)
        self.assertIn("misaki[en]>=0.9.4", result)
        for needed in ("fastapi>=0.109.0", "uvicorn[standard]>=0.27.0",
                       "torch>=2.5.0", "kokoro>=0.9.4", "Zipvoice @ git+"):
            self.assertIn(needed, result)
        for unwanted in ("misaki[en,ja,zh]", "unidic-lite>=", "pykakasi\n", "pyopenjtalk"):
            self.assertNotIn(unwanted, result)

    def test_fails_closed_on_changed_upstream_dependency(self):
        with self.assertRaisesRegex(ValueError, "exactly one misaki"):
            module.derive_english_only(SOURCE.replace("misaki[en,ja,zh]", "misaki[en]"))
        with self.assertRaisesRegex(ValueError, "exactly one unidic"):
            module.derive_english_only(SOURCE.replace("unidic-lite>=1.0.8", ""))
        with self.assertRaisesRegex(ValueError, "exactly one pykakasi"):
            module.derive_english_only(SOURCE.replace("\npykakasi\n", "\n"))

    def test_never_overwrites_source_or_existing_local_derivative(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before = root / "upstream.txt"
            before.write_text(SOURCE, encoding="utf-8")
            after = root / "english.txt"
            module_source = before.read_text(encoding="utf-8")
            after.write_text(module.derive_english_only(module_source), encoding="utf-8")
            self.assertEqual(before.read_text(encoding="utf-8"), SOURCE)
            self.assertNotEqual(after.read_text(encoding="utf-8"), SOURCE)

    def test_windows_install_and_repair_use_english_derivative(self):
        installer = (ROOT / "install-windows-requirements.ps1").read_text(encoding="utf-8")
        launch = (ROOT / "run-nutbuster-local.ps1").read_text(encoding="utf-8")
        repair = (ROOT / "repair-local-backend.ps1").read_text(encoding="utf-8")
        self.assertIn("prepare_english_requirements.py", installer)
        self.assertIn("misaki import en", installer)
        self.assertNotIn("pyopenjtalk-plus", installer)
        self.assertNotIn("--override", installer)
        self.assertNotIn("uv pip install", installer)
        self.assertIn("install-windows-requirements.ps1", launch)
        self.assertIn("install-windows-requirements.ps1", repair)
        self.assertNotIn("Remove-Item -Recurse", installer)
        self.assertNotIn("rclone", installer)

if __name__ == "__main__":
    unittest.main()
