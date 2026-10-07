"""Collect license texts and a source archive for a distributable app folder."""
from importlib.metadata import distributions
from pathlib import Path
import shutil
import zipfile
from sound_manager import __version__

root = Path(__file__).resolve().parent
target = root/'dist'/'SimpleSoundManager'
if not (target/'SimpleSoundManager.exe').exists():
    raise SystemExit('Build the application first')
# Recent Qt uses Windows' ICU forwarding DLLs. PyInstaller can mistakenly
# collect a different ICU build from PATH (e.g. a Poppler tools directory).
# Leave these system dependencies to Windows; never ship another tool's ICU.
icu_files = [target/'_internal'/name for name in ('icuuc.dll', 'icuin.dll', 'icu.dll')]
icu_files.extend((target/'_internal').glob('icudt*.dll'))
for candidate in icu_files:
    if candidate.resolve().is_relative_to(target.resolve()) and candidate.exists():
        candidate.unlink()
for name in ('README.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md', 'FEATURE_BACKLOG.md', 'app.ico', 'app-icon.svg'):
    shutil.copy2(root/name, target/name)
(target/'version.txt').write_text(__version__, encoding='utf-8')
for dist in distributions():
    name = dist.metadata['Name']
    for file in dist.files or []:
        lower = str(file).lower()
        if 'license' in lower or 'copying' in lower or 'copyright' in lower:
            source = Path(dist.locate_file(file))
            if source.is_file():
                # Preserve nested notices and avoid filenames escaping the package.
                relative = Path(*[p for p in file.parts if p not in ('..', '.')])
                destination = target/'licenses'/name/relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
with zipfile.ZipFile(target/'source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ('run.py', 'launcher.py', 'app.ico', 'app-icon.svg', 'make-icon.py', 'requirements.txt', 'build.ps1', 'install-windows.ps1', 'shortcut-identity.ps1', 'windows-audio-setup.ps1', 'update-handoff.ps1', 'update-handoff.sh', 'Install.cmd', 'install-linux.sh', 'package.py', 'prepare-release.py', 'check_live_audio.py', 'check_bluetooth.py', 'check_multichannel.py', 'VALIDATION.md', 'FEATURE_BACKLOG.md', 'README.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md'):
        archive.write(root/name, 'sound-manager/'+name)
    for folder in ('sound_manager', 'tests'):
        for file in (root/folder).glob('*.py'):
            archive.write(file, 'sound-manager/'+str(file.relative_to(root)))
print('Collected dependency notices and source.zip')
