#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-indexeddb-autosave.py')
text = path.read_text()
old = "options.seedTemplates.join('\\n')"
new = "options.seedTemplates.join('\\\\n')"
count = text.count(old)
if count == 0 and new in text:
    print('Cubic autosave migration already emits a literal JavaScript newline escape.')
elif count == 1:
    path.write_text(text.replace(old, new, 1))
    print('Cubic autosave migration newline escape corrected.')
else:
    raise SystemExit(f'Expected one seed-template newline escape anchor, found {count}')
