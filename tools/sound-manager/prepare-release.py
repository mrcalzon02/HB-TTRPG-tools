"""Prepare versioned GitHub Release assets after build.ps1; no automatic upload."""
import hashlib
import json
from pathlib import Path
import shutil
import os
import subprocess
import sys
import zipfile
from sound_manager import __version__ as version

root = Path(__file__).resolve().parent
target = root/'dist'/'SimpleSoundManager'
if (target/'version.txt').read_text().strip() != version:
    raise SystemExit('Build version does not match source; run build.ps1 first')
out = root/'build'/('release-'+version)
out.mkdir(parents=True, exist_ok=True)
if sys.platform != 'win32':
    raise SystemExit('Windows installer compilation requires Windows with Inno Setup 6.')
compiler = os.environ.get('INNO_SETUP_COMPILER') or shutil.which('ISCC.exe')
if not compiler:
    for prefix in (os.environ.get('ProgramFiles(x86)'), os.environ.get('ProgramFiles')):
        if prefix and (Path(prefix)/'Inno Setup 6'/'ISCC.exe').is_file():
            compiler = str(Path(prefix)/'Inno Setup 6'/'ISCC.exe')
            break
if not compiler or not Path(compiler).is_file():
    raise SystemExit('Inno Setup 6 ISCC.exe was not found. Install it or set INNO_SETUP_COMPILER.')
installer_name = f'SimpleSoundManager-{version}-Setup.exe'
subprocess.run([str(compiler), str(root/'installer.iss')], cwd=root,
               env=dict(os.environ, SOUND_MANAGER_VERSION=version), check=True)
if not (out/installer_name).is_file():
    raise SystemExit('Installer build did not produce the expected Setup.exe.')
windows = f'SimpleSoundManager-{version}-Windows-x64.zip'
source = f'SimpleSoundManager-{version}-Source.zip'
shutil.copy2(target/'source.zip', out/source)
with zipfile.ZipFile(out/windows, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in ('Install.cmd', 'install-windows.ps1', 'shortcut-identity.ps1', 'README.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md'):
        archive.write(root/name, 'SimpleSoundManager/'+name)
    for file in target.rglob('*'):
        if file.is_file():
            archive.write(file, 'SimpleSoundManager/'+file.relative_to(root).as_posix())
    launcher = root/'dist'/'launcher'/'SimpleSoundManagerLauncher.exe'
    archive.write(launcher, 'SimpleSoundManager/dist/launcher/'+launcher.name)
tag = 'simple-sound-manager-v'+version
manifest = dict(version=version, tag=tag, assets=[])
for name in (installer_name, windows, source):
    file = out/name
    with file.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    manifest['assets'].append(dict(name=name, bytes=file.stat().st_size, sha256=digest,
        url=f'https://github.com/mrcalzon02/HB-TTRPG-tools/releases/download/{tag}/{name}'))
(out/'SHA256SUMS.txt').write_text(''.join(f"{a['sha256']}  {a['name']}\n" for a in manifest['assets']))
(out/'release.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest, indent=2))
