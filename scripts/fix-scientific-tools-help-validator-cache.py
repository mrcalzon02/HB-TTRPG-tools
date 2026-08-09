#!/usr/bin/env python3
from pathlib import Path
import re

path = Path('scripts/validate-scientific-tools-extraction.mjs')
text = path.read_text()
new_version = '20260809-scientific-help-1'
pattern = r"loadScript\('scientific-tools-entry\.js\?v=[^']+'\)"
updated, count = re.subn(pattern, f"loadScript('scientific-tools-entry.js?v={new_version}')", text, count=1)
if count != 1:
    raise SystemExit(f'Expected exactly one Scientific Tools main-menu cache assertion, found {count}.')
path.write_text(updated)
print('Scientific Tools main-menu cache assertion aligned to shared-help asset seal.')
