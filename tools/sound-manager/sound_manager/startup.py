"""Per-user login startup, with no administrator privileges or service."""
import os
from pathlib import Path
import subprocess
import sys

NAME = 'SimpleSoundManager'
KEY = r'Software\Microsoft\Windows\CurrentVersion\Run'

def launch_args():
    if getattr(sys, 'frozen', False):
        executable = Path(sys.executable)
        canonical = executable.parent.parent.parent/'SimpleSoundManager.exe'
        if executable.parent.parent.name=='releases' and canonical.exists():
            executable = canonical
        return [str(executable), '--tray']
    return [sys.executable, str(Path(__file__).resolve().parent.parent/'run.py'), '--tray']

def desktop_quote(value):
    for old, new in (('\\', '\\\\'), ('"', '\\"'), ('`', '\\`'), ('$', '\\$'), ('%', '%%')):
        value = value.replace(old, new)
    return '"'+value+'"'

def desktop_path():
    return Path(os.environ.get('XDG_CONFIG_HOME', Path.home()/'.config'))/'autostart'/'simple-sound-manager.desktop'

def is_enabled():
    if sys.platform == 'win32':
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY) as key:
                winreg.QueryValueEx(key, NAME)
            return True
        except FileNotFoundError:
            return False
    return desktop_path().exists()

def set_enabled(enabled):
    if sys.platform == 'win32':
        import winreg
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, KEY) as key:
            if enabled:
                winreg.SetValueEx(key, NAME, 0, winreg.REG_SZ, subprocess.list2cmdline(launch_args()))
            else:
                try:
                    winreg.DeleteValue(key, NAME)
                except FileNotFoundError:
                    pass
    else:
        path = desktop_path()
        if enabled:
            path.parent.mkdir(parents=True, exist_ok=True)
            command = ' '.join(desktop_quote(arg) for arg in launch_args())
            path.write_text('[Desktop Entry]\nType=Application\nName=Simple Sound Manager\nExec='+command+'\nTerminal=false\nX-GNOME-Autostart-enabled=true\n', encoding='utf-8')
        else:
            path.unlink(missing_ok=True)
