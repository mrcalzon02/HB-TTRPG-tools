"""Prepare versioned GitHub Release assets after build.ps1; no automatic upload."""
import hashlib
import json
from pathlib import Path
import shutil
import zipfile
from sound_manager import __version__ as version

root = Path(__file__).resolve().parent
target = root/'dist'/'SimpleSoundManager'
if (target/'version.txt').read_text().strip() != version:
    raise SystemExit('Build version does not match source; run build.ps1 first')
out = root/'build'/('release-'+version)
out.mkdir(parents=True, exist_ok=True)
windows = f'SimpleSoundManager-{version}-Windows-x64.zip'
source = f'SimpleSoundManager-{version}-Source.zip'
shutil.copy2(target/'source.zip', out/source)
with zipfile.ZipFile(out/windows, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in ('Install.cmd', 'install-windows.ps1', 'README.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md'):
        archive.write(root/name, 'SimpleSoundManager/'+name)
    for file in target.rglob('*'):
        if file.is_file():
            archive.write(file, 'SimpleSoundManager/'+file.relative_to(root).as_posix())
    launcher = root/'dist'/'launcher'/'SimpleSoundManagerLauncher.exe'
    archive.write(launcher, 'SimpleSoundManager/dist/launcher/'+launcher.name)
tag = 'simple-sound-manager-v'+version
manifest = dict(version=version, tag=tag, assets=[])
for name in (windows, source):
    file = out/name
    with file.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    manifest['assets'].append(dict(name=name, bytes=file.stat().st_size, sha256=digest,
        url=f'https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/{tag}/{name}'))
(out/'SHA256SUMS.txt').write_text(''.join(f"{a['sha256']}  {a['name']}\n" for a in manifest['assets']))
(out/'release.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest, indent=2))
