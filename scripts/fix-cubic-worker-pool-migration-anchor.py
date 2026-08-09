#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-worker-pool.py')
text = path.read_text()
label = "'Scientific ownership Cubic pool loader')"
end_start = text.find(label)
if end_start < 0:
    raise SystemExit('Cubic worker-pool ownership migration label was not found.')
start = text.rfind('replace_once(scientific_validator,', 0, end_start)
if start < 0:
    raise SystemExit('Cubic worker-pool ownership migration block start was not found.')
end = end_start + len(label)
replacement = '''replace_once(scientific_validator,
"\\\"loadScript('binary-cube-cubic-decryptor-engine.js'\\\", \\\"loadScript('binary-cube-steganalysis-evidence-profile.js'\\\"",
"\\\"loadScript('binary-cube-cubic-decryptor-engine.js'\\\", \\\"loadScript('binary-cube-cubic-decryptor-worker-pool.js'\\\", \\\"loadScript('binary-cube-steganalysis-evidence-profile.js'\\\"",
'Scientific ownership Cubic pool loader')'''
current = text[start:end]
if current == replacement:
    print('Cubic worker-pool migration ownership anchor already tightened.')
else:
    path.write_text(text[:start] + replacement + text[end:])
    print('Cubic worker-pool migration ownership anchor tightened structurally.')
