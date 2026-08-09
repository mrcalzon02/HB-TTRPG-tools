#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-crib-search.py')
text = path.read_text()
old = "hex: bytesToHex(bytes, bytes.length), label:"
new = "hex: bytesToHex(bytes, bytes.length).replaceAll(' ', ''), label:"
count = text.count(old)
if count == 0 and text.count(new) >= 2:
    print('Crib migration already canonicalizes plan hex.')
elif count == 2:
    path.write_text(text.replace(old, new))
    print('Crib plan hex canonicalized.')
else:
    raise SystemExit(f'Expected two crib hex anchors, found {count}')
