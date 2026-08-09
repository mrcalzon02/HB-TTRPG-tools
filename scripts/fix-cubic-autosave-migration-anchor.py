#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-indexeddb-autosave.py')
text = path.read_text()
old = "  function stopHeartbeat() {\n\"\"\"," 
new = "  function stopHeartbeat() { if (heartbeat) window.clearInterval(heartbeat); heartbeat = 0; }\n\"\"\"," 
count = text.count(old)
if count == 0 and text.count(new) >= 2:
    print('Cubic autosave migration anchor already matches the authoritative one-line stopHeartbeat implementation.')
elif count == 2:
    path.write_text(text.replace(old, new))
    print('Cubic autosave migration anchor tightened for the authoritative one-line stopHeartbeat implementation.')
else:
    raise SystemExit(f'Expected two multiline stopHeartbeat migration anchors, found {count}')
