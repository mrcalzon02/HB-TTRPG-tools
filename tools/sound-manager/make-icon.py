"""Create Windows icon resources from the app's existing code-drawn icon."""
import os
from pathlib import Path
import struct
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from PySide6.QtCore import QBuffer, QByteArray, QIODevice, Qt
from PySide6.QtWidgets import QApplication
from sound_manager.ui import icon
app = QApplication([])
frames = []
for size in (16, 24, 32, 48, 64, 128, 256):
    pixmap = icon(size).pixmap(size, size)
    data = QByteArray()
    buffer = QBuffer(data)
    buffer.open(QIODevice.OpenModeFlag.WriteOnly)
    if not pixmap.save(buffer, 'PNG'):
        raise RuntimeError('Could not encode application icon')
    frames.append((size, bytes(data)))
offset = 6+16*len(frames)
header = struct.pack('<HHH', 0, 1, len(frames))
payload = b''
for size, data in frames:
    header += struct.pack('<BBBBHHII', size if size<256 else 0, size if size<256 else 0, 0, 0, 1, 32, len(data), offset)
    payload += data
    offset += len(data)
Path(__file__).with_name('app.ico').write_bytes(header+payload)
print('Created matching app/launcher icon in seven sizes')
