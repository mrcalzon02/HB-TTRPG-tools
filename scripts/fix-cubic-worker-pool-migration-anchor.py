#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-worker-pool.py')
text = path.read_text()
old = '''replace_once(scientific_validator,
"""  'function loadCubicDecryptor()', 'id=\\"scientific-tools-open-diagnostic-pipeline\\"',""",
"""  'function loadCubicDecryptor()', \\"loadScript('binary-cube-cubic-decryptor-worker-pool.js'\\", 'id=\\"scientific-tools-open-diagnostic-pipeline\\"',""",
'Scientific ownership Cubic pool loader')'''
new = '''replace_once(scientific_validator,
"""  "loadScript('binary-cube-cubic-decryptor-engine.js'", "loadScript('binary-cube-steganalysis-evidence-profile.js'",""",
"""  "loadScript('binary-cube-cubic-decryptor-engine.js'", "loadScript('binary-cube-cubic-decryptor-worker-pool.js'", "loadScript('binary-cube-steganalysis-evidence-profile.js'",""",
'Scientific ownership Cubic pool loader')'''
if new in text and old not in text:
    print('Cubic worker-pool migration ownership anchor already tightened.')
elif text.count(old) == 1:
    path.write_text(text.replace(old, new, 1))
    print('Cubic worker-pool migration ownership anchor tightened.')
else:
    raise SystemExit(f'Expected exactly one stale worker-pool ownership anchor, found {text.count(old)}')
