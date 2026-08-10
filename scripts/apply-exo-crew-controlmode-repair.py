#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'blacklight-exo-crew-operations.js'
text = path.read_text(encoding='utf-8')

EXPECTED_BLOB = 'd97572c3cb79eb5056175090bd67a0abef550b75'

def git_blob_sha(data: bytes) -> str:
    header = f'blob {len(data)}\0'.encode()
    return hashlib.sha1(header + data).hexdigest()

actual = git_blob_sha(text.encode())
if actual != EXPECTED_BLOB:
    raise SystemExit(f'Crew JS changed concurrently: expected {EXPECTED_BLOB}, found {actual}')

anchor = '  const GESTURE_KINDS=new Set(["selector","rotary","wheel","yoke","thumbwheel","lever","knife-switch","toggle","guard","dual-slider"]);\n'
repair = anchor + '  function controlMode(station,ctrl){if(MOMENTARY_KINDS.has(ctrl.kind))return "momentary";if(RESET_AFTER_EXECUTE[station]?.[ctrl.id]!==undefined)return "reset-execute";return "latched";}\n'

if 'function controlMode(station,ctrl)' in text:
    raise SystemExit('controlMode already present; refusing duplicate repair')
if text.count(anchor) != 1:
    raise SystemExit(f'Expected one gesture-kind anchor, found {text.count(anchor)}')

text = text.replace(anchor, repair, 1)

required = [
    'function controlMode(station,ctrl)',
    'controlMode(activeStation,ctrl)',
    'controlMode(station,hit.ctrl)',
    'window.EXO_CONTROL_AUDIO'
]
for token in required:
    if token not in text:
        raise SystemExit(f'Missing required Crew runtime token after repair: {token}')

path.write_text(text, encoding='utf-8')
print('Restored Crew controlMode state-model dependency.')
