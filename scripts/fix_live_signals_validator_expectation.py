#!/usr/bin/env python3
# Deterministic one-shot trigger for the canonical Live Signals validation rerun.
from pathlib import Path

path=Path('scripts/validate-live-signals-laboratory.mjs')
text=path.read_text(encoding='utf-8')
old='/local instrument authorized/'
new='/Hardware \\/ regulatory gate/'
count=text.count(old)
if count!=1:
    raise SystemExit(f'expected one obsolete local-instrument UI expectation, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Aligned Live Signals validator with the canonical hardware/regulatory gate status surface.')