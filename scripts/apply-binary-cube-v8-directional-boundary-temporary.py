#!/usr/bin/env python3

from pathlib import Path

path = Path('shadowrun-binary-cube-visualizer.js')
source = path.read_text(encoding='utf-8')
old = '    const reachedBoundary = nextTime <= 0 || nextTime >= 1;'
new = '    const reachedBoundary = playbackDirection > 0 ? nextTime >= 1 : nextTime <= 0;'
if source.count(old) != 1:
    raise SystemExit(f'Expected one direction-neutral playback boundary, found {source.count(old)}.')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
