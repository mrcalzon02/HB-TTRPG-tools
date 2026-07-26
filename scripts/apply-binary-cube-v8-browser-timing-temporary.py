#!/usr/bin/env python3

from pathlib import Path

path = Path('scripts/validate-binary-cube-visualizer-sequencing-browser.mjs')
source = path.read_text(encoding='utf-8')
old = 'await new Promise(resolve => setTimeout(resolve, 140));'
new = 'await new Promise(resolve => setTimeout(resolve, 500));'
count = source.count(old)
if count != 4:
    raise SystemExit(f'Expected four V8 playback timing assertions, found {count}.')
path.write_text(source.replace(old, new), encoding='utf-8')
