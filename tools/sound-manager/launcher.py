"""Stable Windows entry point: always open the installed current release."""
import os
from pathlib import Path
import re
import subprocess
import sys

VERSION = re.compile(r'^\d+\.\d+\.\d+$')

def resolve_release(root):
    root = Path(root).resolve()
    marker = root/'current_release.txt'
    if marker.exists():
        version = marker.read_text(encoding='utf-8').strip()
        if not VERSION.fullmatch(version):
            raise ValueError('Invalid current release marker')
    else:
        versions = [p.name for p in (root/'releases').iterdir() if p.is_dir() and VERSION.fullmatch(p.name) and (p/'SimpleSoundManager.exe').is_file()]
        if not versions:
            raise FileNotFoundError('No installed Sound Manager release was found')
        version = max(versions, key=lambda v: tuple(map(int, v.split('.'))))
    target = (root/'releases'/version/'SimpleSoundManager.exe').resolve()
    if not target.is_relative_to(root/'releases') or not target.is_file():
        raise FileNotFoundError('The current Sound Manager release is missing')
    return target

def main():
    try:
        from sound_manager.windows_identity import set_process_identity
        set_process_identity()
        root = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).parent
        target = resolve_release(root)
        env = dict(os.environ, PYINSTALLER_RESET_ENVIRONMENT='1')
        if sys.platform=='win32':
            import ctypes
            ctypes.windll.kernel32.SetDllDirectoryW(None)
        subprocess.Popen([str(target), *sys.argv[1:]], cwd=target.parent, env=env)
    except Exception as exc:
        if sys.platform=='win32':
            import ctypes
            ctypes.windll.user32.MessageBoxW(None, f'Could not open the installed manager:\n{exc}\nRun Install.cmd to repair the installation.', 'Simple Sound Manager launcher', 0x10)
        else:
            raise

if __name__=='__main__':
    main()
