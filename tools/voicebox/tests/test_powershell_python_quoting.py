"""Prevent Windows PowerShell 5.1 from stripping embedded double quotes in python -c.

The previous broken repair produced SyntaxError: '(' was never closed and
NameError: name 'Windows' is not defined before dependency resolution began.
"""
import ast
import pathlib
import re
import shutil
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = ("repair-local-backend.ps1", "install-windows-requirements.ps1", "run-nutbuster-local.ps1")
CASES = {
    "repair-local-backend.ps1": [
        "import sys; assert sys.version_info[:2] == (3,12)",
        "from backend.main import app",
    ],
    "install-windows-requirements.ps1": [
        "import sys,platform; assert sys.version_info[:2] == (3,12); assert platform.system() == 'Windows'",
        "from misaki import en",
        "import uvicorn,fastapi,sqlalchemy,torch,zipvoice",
    ],
    "run-nutbuster-local.ps1": [
        "import sys; print(sys.version_info.major, sys.version_info.minor, sep=chr(46))",
    ],
}

class PowershellPythonQuotingTests(unittest.TestCase):
    def test_repaired_code_is_valid_python_and_present_in_launchers(self):
        for name, scripts in CASES.items():
            contents = (ROOT / name).read_text(encoding="utf-8")
            for code in scripts:
                with self.subTest(file=name, python=code):
                    ast.parse(code, mode="exec")
                    self.assertIn(code, contents)

    def test_known_broken_argument_forms_are_absent(self):
        all_sources = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in FILES)
        self.assertNotIn('print("Voicebox app import OK")', all_sources)
        self.assertNotIn('platform.system() == "Windows"', all_sources)
        self.assertNotIn('print("Misaki English G2P imported successfully")', all_sources)
        self.assertNotIn('print("Voicebox backend imported successfully")', all_sources)

    @unittest.skipUnless(sys.platform == "win32" and shutil.which("powershell.exe"),
                         "Actual Windows PowerShell 5.1 argument forwarding requires Windows")
    def test_python_c_argument_survives_native_windows_powershell(self):
        # Real OS-specific regression test, independent of Voicebox installations.
        python = str(pathlib.Path(sys.executable).resolve()).replace("'", "''")
        commands = (
            f"$python = '{python}'; "
            '& $python -c "import sys; assert sys.platform == \'win32\'"; '
            "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; "
            "& $python -c 'import sys; print(sys.version_info.major, sys.version_info.minor, sep=chr(46))'; "
            "exit $LASTEXITCODE"
        )
        result = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive",
                                 "-Command", commands], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
        self.assertRegex(result.stdout, r"\d+\.\d+")

if __name__ == "__main__":
    unittest.main()
