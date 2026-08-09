#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-worker-pool.py')
text = path.read_text()
old = "  'candidate.cribMatch',\n  'ordinal',"
new = "  'rankedCandidate.cribMatch',\n  'ordinal',"
count = text.count(old)
if count == 0 and new in text:
    print('Cubic worker-pool validator contract already targets ranked candidates.')
elif count == 1:
    path.write_text(text.replace(old, new, 1))
    print('Cubic worker-pool validator contract aligned to ranked candidates.')
else:
    raise SystemExit(f'Expected exactly one pre-sharding crib assertion, found {count}')
