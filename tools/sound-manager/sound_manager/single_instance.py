"""User-local reopen requests, so pinned shortcuts restore a hidden window."""
import os
import sys
from PySide6.QtCore import QObject, QTimer
from PySide6.QtNetwork import QLocalServer, QLocalSocket

SERVER_NAME = 'simple-sound-manager-window'

def reopen_existing(name=SERVER_NAME, action=None):
    socket = QLocalSocket()
    socket.connectToServer(name)
    if not socket.waitForConnected(1500):
        return False
    if not socket.bytesAvailable() and not socket.waitForReadyRead(1500):
        return False
    hello = bytes(socket.readLine()).strip()
    if not hello.isdigit():
        return False
    if sys.platform == 'win32':
        # The clicked process may grant its foreground permission to the owner.
        import ctypes
        ctypes.windll.user32.AllowSetForegroundWindow(int(hello))
    if action is not None:
        from .hotkeys import ACTIONS
        if action not in ACTIONS:
            raise ValueError('Unknown action')
    socket.write(('ACTION:'+action+'\n').encode() if action else b'OPEN\n')
    socket.flush()
    if not socket.bytesAvailable() and not socket.waitForReadyRead(2000):
        return False
    return bytes(socket.readLine()).strip() == b'OK'

class InstanceServer(QObject):
    def __init__(self, on_open, parent=None, name=SERVER_NAME, on_action=None):
        super().__init__(parent)
        self.on_open = on_open
        self.on_action = on_action
        self.clients = set()
        self.server = QLocalServer(self)
        self.server.setSocketOptions(QLocalServer.SocketOption.UserAccessOption)
        # Caller owns the single-instance lock before removing a stale socket.
        QLocalServer.removeServer(name)
        if not self.server.listen(name):
            raise RuntimeError('Cannot create the window reopen channel: '+self.server.errorString())
        self.server.newConnection.connect(self.accept)

    def accept(self):
        while self.server.hasPendingConnections():
            socket = self.server.nextPendingConnection()
            self.clients.add(socket)
            buffer = bytearray()
            timeout = QTimer(socket)
            timeout.setSingleShot(True)
            timeout.timeout.connect(socket.disconnectFromServer)
            timeout.start(5000)
            def read(socket=socket, buffer=buffer):
                buffer.extend(bytes(socket.readAll()))
                if len(buffer) > 32:
                    socket.disconnectFromServer()
                elif b'\n' in buffer:
                    if bytes(buffer) == b'OPEN\n':
                        self.on_open()
                        socket.write(b'OK\n')
                        socket.flush()
                    elif bytes(buffer).startswith(b'ACTION:') and self.on_action:
                        from .hotkeys import ACTIONS
                        action=bytes(buffer)[7:-1].decode('ascii',errors='replace')
                        if action in ACTIONS:
                            result=self.on_action(action)
                            socket.write(b'NOTREADY\n' if result is False else b'OK\n')
                            socket.flush()
                    socket.disconnectFromServer()
            def closed(socket=socket):
                self.clients.discard(socket)
                socket.deleteLater()
            socket.readyRead.connect(read)
            socket.disconnected.connect(closed)
            socket.write(f'{os.getpid()}\n'.encode('ascii'))
            socket.flush()
