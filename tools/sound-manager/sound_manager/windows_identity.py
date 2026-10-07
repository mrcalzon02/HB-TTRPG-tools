"""One version-independent Windows identity for launcher and GUI."""
import ctypes
import sys

APP_ID = 'Calzon.SimpleSoundManager'

def set_process_identity():
    if sys.platform != 'win32':
        return
    setter = ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID
    setter.argtypes = [ctypes.c_wchar_p]
    setter.restype = ctypes.c_long
    result = setter(APP_ID)
    if result < 0:
        raise OSError(f'Windows taskbar identity failed: 0x{result & 0xffffffff:08x}')
