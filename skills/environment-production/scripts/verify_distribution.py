#!/usr/bin/env python3
"""Verify distribution bytes, relative links and standalone extracted execution."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []

    def handle_starttag(self, tag, attrs):
        self.values += [value for key, value in attrs if key == 'href' and value]


def main():
    index = json.loads((ROOT / 'source-index.json').read_text(encoding='utf-8'))
    for record in index['sources']:
        if 'bundled_copy' in record:
            data = (ROOT / record['bundled_copy']).read_bytes()
            assert hashlib.sha256(data).hexdigest() == record['sha256'], record['path']
    parser = Links()
    parser.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
    for link in parser.values:
        url = urlsplit(link)
        if not url.scheme and url.path:
            assert (ROOT / unquote(url.path)).is_file(), link
    archive = ROOT / 'environment-production.zip'
    expected = (ROOT / 'environment-production.zip.sha256').read_text().split()[0]
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected
    with tempfile.TemporaryDirectory() as folder, zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        for name in bundle.namelist():
            assert name.startswith('environment-production/') and '..' not in Path(name).parts
        bundle.extractall(folder)
        extracted = Path(folder) / 'environment-production'
        for name in ('SKILL.md', 'manifest.json', 'PROVENANCE.md', 'TERMS-OF-SERVICE.md',
                     'index.html', 'scripts/production.py', 'examples/validate-environment.yml'):
            assert (extracted / name).is_file(), name
        subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-q'],
                       cwd=extracted, check=True)
        packet = Path(folder) / 'standalone-map'
        subprocess.run([sys.executable, str(extracted / 'scripts/production.py'), 'init',
                        str(packet), '--map-id', 'standalone-demo'], check=True)
        failed = subprocess.run([sys.executable, str(extracted / 'scripts/production.py'),
                                 'validate', str(packet / 'packet.json')], capture_output=True)
        assert failed.returncode == 1, 'unconfigured input revision should fail'
        doc = json.loads((packet / 'packet.json').read_text())
        doc['input_revision'] = 'a' * 40
        (packet / 'packet.json').write_text(json.dumps(doc), encoding='utf-8')
        passed = subprocess.run([sys.executable, str(extracted / 'scripts/production.py'),
                                 'validate', str(packet / 'packet.json')], capture_output=True)
        assert passed.returncode == 0, passed.stdout.decode()
        complete = subprocess.run([sys.executable, str(extracted / 'scripts/production.py'),
                                   'validate', str(packet / 'packet.json'), '--require-complete'],
                                  capture_output=True)
        assert complete.returncode == 1, 'open gates should fail completion'
    print('Historical hashes, HTML links, archive integrity and standalone execution passed.')


if __name__ == '__main__':
    main()
