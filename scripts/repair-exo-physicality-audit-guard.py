#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'scripts/apply-exo-control-physicality-audit.py'
text = path.read_text(encoding='utf-8')
old = "for required in ('physical-spring-transmit-key','physical-coolant-handwheel','physical-weapon-bank-selector','physical-carrier-path-selector','physical-pump-selector'):"
new = "for required in ('mech-transmit-key','physical-coolant-handwheel','physical-weapon-bank-selector','physical-carrier-path-selector','physical-pump-selector'):"
if text.count(old) != 1:
    raise SystemExit(f'Expected one audit guard anchor, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Corrected transmit-key audit guard token.')
