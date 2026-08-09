#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-strong-key-identity.py')
text = path.read_text()
old = '''replace_once(engine,
"""      keyId: key.keyId,\n      gridSize: key.gridSize,\n""",
"""      keyId: key.keyId,\n      keyDigestType: key.keyDigestType,\n      keyDigest: key.keyDigest,\n      gridSize: key.gridSize,\n""",
'package encryption digest fields')'''
new = '''replace_once(engine,
"""    const payload = {\n      format: PACKAGE_FORMAT,\n      schemaVersion: SCHEMA_VERSION,\n      algorithm: ALGORITHM,\n      securityClassification: SECURITY_CLASSIFICATION,\n      keyId: key.keyId,\n      gridSize: key.gridSize,\n""",
"""    const payload = {\n      format: PACKAGE_FORMAT,\n      schemaVersion: SCHEMA_VERSION,\n      algorithm: ALGORITHM,\n      securityClassification: SECURITY_CLASSIFICATION,\n      keyId: key.keyId,\n      keyDigestType: key.keyDigestType,\n      keyDigest: key.keyDigest,\n      gridSize: key.gridSize,\n""",
'package encryption digest fields')'''
if new in text and old not in text:
    print('Migration anchor already tightened.')
elif text.count(old) == 1:
    path.write_text(text.replace(old, new, 1))
    print('Migration anchor tightened.')
else:
    raise SystemExit(f'Expected exactly one migration-script anchor, found {text.count(old)}')
