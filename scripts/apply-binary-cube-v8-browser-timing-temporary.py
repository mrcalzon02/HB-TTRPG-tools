#!/usr/bin/env python3

from pathlib import Path

path = Path('scripts/validate-binary-cube-visualizer-sequencing-browser.mjs')
source = path.read_text(encoding='utf-8')
old_delay = 'await new Promise(resolve => setTimeout(resolve, 140));'
new_delay = 'await new Promise(resolve => setTimeout(resolve, 500));'
delay_count = source.count(old_delay)
if delay_count != 4:
    raise SystemExit(f'Expected four V8 playback timing assertions, found {delay_count}.')
source = source.replace(old_delay, new_delay)
old_error = "throw new Error('Automatic reverse block sequencing failed.');"
new_error = "throw new Error('Automatic reverse block sequencing failed: ' + JSON.stringify(reverse));"
if source.count(old_error) != 1:
    raise SystemExit('Expected one reverse sequencing assertion.')
path.write_text(source.replace(old_error, new_error, 1), encoding='utf-8')
