"""Static guardrails for the read-only Windows map runner.

Run locally with python -m unittest discover -s tools/local-worker -p 'test_dir_map_contract.py'.
The real filesystem probe is performed only on OLD-CORE30 through the workflow.
"""
import pathlib
import unittest

HERE = pathlib.Path(__file__).resolve().parent

class DirMapContract(unittest.TestCase):
    def test_read_only_and_explicit_roots(self):
        data = (HERE / 'run_dir_map.ps1').read_text(encoding='utf-8')
        for value in ('D:\\Runner\\actions-runner', 'D:\\AI-Relocation\\Ollama', 'D:\\GITS', 'C:\\GITS'):
            self.assertIn(value, data)
        for token in ('Start-Process','Stop-Process','Remove-Item','Set-ItemProperty','New-Service','git clone','ollama pull','Invoke-Expression'):
            self.assertNotIn(token, data)
        self.assertIn('HB_MODE -ne \'map\'', data)
        self.assertIn('directory-map-public.json', data)
        self.assertIn('path-registry-private.json', data)
        self.assertIn('manifest_paths', data)
        self.assertIn('Clean-Path', data)
        self.assertIn('11434', data)
        self.assertIn('11435', data)

    def test_readme_is_explicit_about_private_paths(self):
        readme = (HERE / 'dir-map-README.md').read_text(encoding='utf-8') if (HERE / 'dir-map-README.md').exists() else (HERE / 'README.md').read_text(encoding='utf-8')
        self.assertIn('never belongs in a GitHub artifact', readme)
        self.assertIn('read-only', readme)
        self.assertIn('three folder levels', readme)

if __name__ == '__main__':
    unittest.main()
