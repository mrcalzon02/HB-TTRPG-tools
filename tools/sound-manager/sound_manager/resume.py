"""Listen for resume notifications; never alter power or privacy settings."""
import sys
import time
from PySide6.QtCore import QAbstractNativeEventFilter, QTimer, QObject, Slot, SLOT

class ResumeEvents:
    def __init__(self, app, callback):
        self.last = -float('inf')
        self.callback = callback
        self.listener = None
        self.available = False
        def resumed():
            now = time.monotonic()
            if now-self.last<30:
                return
            self.last = now
            QTimer.singleShot(1500, self.callback)
        if sys.platform=='win32':
            from ctypes.wintypes import MSG
            class PowerFilter(QAbstractNativeEventFilter):
                def nativeEventFilter(self, event_type, message):
                    msg = MSG.from_address(int(message))
                    if msg.message==0x0218 and msg.wParam in (0x0007, 0x0012):
                        resumed()
                    return False, 0
            self.listener = PowerFilter()
            app.installNativeEventFilter(self.listener)
            self.available = True
        else:
            try:
                from PySide6.QtDBus import QDBusConnection
                class SleepListener(QObject):
                    @Slot(bool)
                    def sleeping(self, value):
                        if not value:
                            resumed()
                self.listener = SleepListener()
                self.available = QDBusConnection.systemBus().connect('org.freedesktop.login1', '/org/freedesktop/login1', 'org.freedesktop.login1.Manager', 'PrepareForSleep', self.listener, SLOT('sleeping(bool)'))
            except ImportError:
                pass
