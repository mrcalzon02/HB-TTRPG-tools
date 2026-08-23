from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8')
old='<script src="app-lite-view-mounts.js?v=21"></script>'
new='<script src="app-lite-view-mounts.js?v=22-modules-spatial-suite"></script>'
if new not in text:
    if old not in text:
        raise SystemExit('Expected app-lite-view-mounts v21 reference not found')
    p.write_text(text.replace(old,new,1),encoding='utf-8')
print('Modules loader cache key is current.')
