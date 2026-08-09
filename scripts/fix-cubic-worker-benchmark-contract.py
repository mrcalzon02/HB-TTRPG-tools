#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-worker-benchmark.py')
text = path.read_text()
old = "  'parallel efficiency'\n"
new = "  'Efficiency'\n"
count = text.count(old)
if count == 0 and new in text:
    print('Cubic worker benchmark validator contract already aligned.')
elif count == 1:
    path.write_text(text.replace(old, new, 1))
    print('Cubic worker benchmark validator contract aligned to the rendered Efficiency column.')
else:
    raise SystemExit(f'Expected one worker benchmark wording assertion, found {count}')
