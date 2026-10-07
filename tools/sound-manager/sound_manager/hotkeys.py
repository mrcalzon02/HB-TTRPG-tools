"""Opt-in native desktop hotkeys, not keyboard recording. Wayland uses --action bindings."""
import ctypes
import ctypes.util
import os
import sys
from PySide6.QtCore import QAbstractNativeEventFilter, QSocketNotifier

ACTIONS={'mute-outputs':'Ctrl+Alt+Shift+P','mute-mics':'Ctrl+Alt+Shift+M','cycle-output':'Ctrl+Alt+Shift+O','next-scene':'Ctrl+Alt+Shift+S'}

def parse_key(value):
    pieces=value.upper().split('+')
    if len(pieces)<2 or len(pieces[-1])!=1 or not pieces[-1].isalnum() or not pieces[-1].isascii():
        raise ValueError('Use Ctrl/Alt/Shift plus a single letter or digit')
    mods=set(pieces[:-1])
    if not mods<= {'CTRL','ALT','SHIFT'} or not mods & {'CTRL','ALT'}:
        raise ValueError('Use Ctrl or Alt; Shift is optional')
    return mods,pieces[-1]

class DesktopHotkeys:
    def __init__(self,app,callback):
        self.app,self.callback=app,callback
        self.registered={}
        self.listener=None
        self.display=None
        self.notifier=None
        self.errors=[]
        self.pressed=set()
        app.aboutToQuit.connect(self.close)

    def configure(self,bindings):
        if not bindings:
            self.close()
            self.errors=[]
            return []
        parsed={}
        for action,key in bindings.items():
            if action not in ACTIONS:
                raise ValueError('Unknown hotkey action')
            parsed[action]=parse_key(key)
        if len(set((tuple(sorted(m)),k) for m,k in parsed.values())) != len(parsed):
            raise ValueError('Shortcut combinations must be unique')
        self.close()
        self.errors=[]
        if sys.platform=='win32':
            from ctypes.wintypes import MSG
            owner=self
            class Filter(QAbstractNativeEventFilter):
                def nativeEventFilter(self,kind,message):
                    msg=MSG.from_address(int(message))
                    if msg.message==0x0312 and int(msg.wParam) in owner.registered:
                        owner.callback(owner.registered[int(msg.wParam)])
                        return True,0
                    return False,0
            self.listener=Filter()
            self.app.installNativeEventFilter(self.listener)
            for index,(action,(mods,key)) in enumerate(parsed.items(),0x5200):
                flags=0x4000 | sum({'CTRL':2,'ALT':1,'SHIFT':4}[m] for m in mods)
                if ctypes.windll.user32.RegisterHotKey(None,index,flags,ord(key)):
                    self.registered[index]=action
                else:
                    self.errors.append(action+': shortcut is already used or registration failed')
        elif os.environ.get('XDG_SESSION_TYPE')=='wayland' or not os.environ.get('DISPLAY'):
            self.errors.append('This desktop requires shortcuts configured in its own settings. Bind the documented --action commands; app-window shortcuts remain available.')
        else:
            self._x11(parsed)
        return self.errors

    def _x11(self,parsed):
        self.x=ctypes.CDLL(ctypes.util.find_library('X11') or 'libX11.so.6')
        self.x.XOpenDisplay.restype=ctypes.c_void_p
        self.x.XDefaultRootWindow.argtypes=[ctypes.c_void_p]
        self.x.XDefaultRootWindow.restype=ctypes.c_ulong
        self.x.XStringToKeysym.argtypes=[ctypes.c_char_p]
        self.x.XStringToKeysym.restype=ctypes.c_ulong
        self.x.XKeysymToKeycode.argtypes=[ctypes.c_void_p,ctypes.c_ulong]
        self.x.XKeysymToKeycode.restype=ctypes.c_uint
        self.x.XGrabKey.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_uint,ctypes.c_ulong,ctypes.c_int,ctypes.c_int,ctypes.c_int]
        self.x.XUngrabKey.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_uint,ctypes.c_ulong]
        self.x.XSync.argtypes=[ctypes.c_void_p,ctypes.c_int]
        self.x.XPending.argtypes=[ctypes.c_void_p]
        self.x.XConnectionNumber.argtypes=[ctypes.c_void_p]
        self.x.XCloseDisplay.argtypes=[ctypes.c_void_p]
        self.display=self.x.XOpenDisplay(None)
        if not self.display:
            self.errors.append('Could not connect to the X11 desktop')
            return
        self.root=self.x.XDefaultRootWindow(self.display)
        class KeyEvent(ctypes.Structure):
            _fields_=[('type',ctypes.c_int),('serial',ctypes.c_ulong),('send_event',ctypes.c_int),('display',ctypes.c_void_p),('window',ctypes.c_ulong),('root',ctypes.c_ulong),('subwindow',ctypes.c_ulong),('time',ctypes.c_ulong),('x',ctypes.c_int),('y',ctypes.c_int),('x_root',ctypes.c_int),('y_root',ctypes.c_int),('state',ctypes.c_uint),('keycode',ctypes.c_uint),('same_screen',ctypes.c_int)]
        class Event(ctypes.Union):
            _fields_=[('key',KeyEvent),('padding',ctypes.c_long*24)]
        self.Event=Event
        self.x.XNextEvent.argtypes=[ctypes.c_void_p,ctypes.POINTER(Event)]
        self.x.XPeekEvent.argtypes=[ctypes.c_void_p,ctypes.POINTER(Event)]
        self.xerror=False
        callback_type=ctypes.CFUNCTYPE(ctypes.c_int,ctypes.c_void_p,ctypes.c_void_p)
        self.error_callback=callback_type(lambda display,error:self.mark_error())
        self.x.XSetErrorHandler.argtypes=[ctypes.c_void_p]
        self.x.XSetErrorHandler.restype=ctypes.c_void_p
        old=self.x.XSetErrorHandler(ctypes.cast(self.error_callback,ctypes.c_void_p))
        try:
            for action,(mods,key) in parsed.items():
                code=self.x.XKeysymToKeycode(self.display,self.x.XStringToKeysym(key.lower().encode()))
                flags=sum({'CTRL':4,'ALT':8,'SHIFT':1}[m] for m in mods)
                self.xerror=False
                for locks in (0,2,16,18):
                    self.x.XGrabKey(self.display,code,flags|locks,self.root,0,1,1)
                self.x.XSync(self.display,0)
                if self.xerror:
                    for locks in (0,2,16,18):
                        self.x.XUngrabKey(self.display,code,flags|locks,self.root)
                    self.errors.append(action+': shortcut registration failed')
                else:
                    self.registered[(code,flags)]=action
        finally:
            self.x.XSetErrorHandler(old)
        self.notifier=QSocketNotifier(self.x.XConnectionNumber(self.display),QSocketNotifier.Type.Read)
        self.notifier.activated.connect(self.read_x11)

    def mark_error(self):
        self.xerror=True
        return 0

    def read_x11(self,*_):
        while self.display and self.x.XPending(self.display):
            event=self.Event()
            self.x.XNextEvent(self.display,ctypes.byref(event))
            if event.key.type==3:
                # X11 auto-repeat synthesizes release/press pairs with equal timestamps.
                if self.x.XPending(self.display):
                    following=self.Event()
                    self.x.XPeekEvent(self.display,ctypes.byref(following))
                    if following.key.type==2 and following.key.keycode==event.key.keycode and following.key.time==event.key.time:
                        continue
                self.pressed.discard(event.key.keycode)
            if event.key.type==2:
                action=self.registered.get((event.key.keycode,event.key.state & 13))
                if action and event.key.keycode not in self.pressed:
                    self.pressed.add(event.key.keycode)
                    self.callback(action)

    def close(self):
        if sys.platform=='win32':
            for identifier in self.registered:
                ctypes.windll.user32.UnregisterHotKey(None,identifier)
        if self.listener:
            self.app.removeNativeEventFilter(self.listener)
            self.listener=None
        if self.notifier:
            self.notifier.setEnabled(False)
            self.notifier.deleteLater()
            self.notifier=None
        if self.display:
            self.x.XCloseDisplay(self.display)
            self.display=None
        self.registered={}
        self.pressed.clear()
