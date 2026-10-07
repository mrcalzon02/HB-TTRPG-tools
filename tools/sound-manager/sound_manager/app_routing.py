"""Independent WinRT ABI binding, researched from EarTrumpet's MIT interface declarations.

https://github.com/File-New-Project/EarTrumpet/tree/master/EarTrumpet/Interop/MMDeviceAPI
Windows' internal policy API may change; HRESULT failures are surfaced, not hidden.
"""
import ctypes
import sys
import uuid

def endpoint_path(identifier):
    if identifier is None:
        return None
    return r'\\?\SWD#MMDEVAPI#'+identifier+'#{e6327cad-dcec-4949-ae8a-991e976a79d2}'

class WindowsAppRouting:
    def __init__(self):
        self.api=ctypes.WinDLL('combase')
        self.api.WindowsCreateString.argtypes=[ctypes.c_wchar_p,ctypes.c_uint32,ctypes.POINTER(ctypes.c_void_p)]
        self.api.WindowsDeleteString.argtypes=[ctypes.c_void_p]
        self.api.WindowsGetStringRawBuffer.argtypes=[ctypes.c_void_p,ctypes.POINTER(ctypes.c_uint32)]
        self.api.WindowsGetStringRawBuffer.restype=ctypes.c_void_p
        self.api.RoGetActivationFactory.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.POINTER(ctypes.c_void_p)]
        self.factory=ctypes.c_void_p()
        self.initialized=self.api.RoInitialize(0) in (0,1)
        try:
            text=self.string('Windows.Media.Internal.AudioPolicyConfig')
            try:
                guid='ab3d4648-e242-459f-b02f-541c70306324' if sys.getwindowsversion().build>=22000 else '2a59116d-6c4f-45e0-a74f-707e3fef9258'
                iid=ctypes.create_string_buffer(uuid.UUID(guid).bytes_le)
                self.check(self.api.RoGetActivationFactory(text,iid,ctypes.byref(self.factory)))
            finally:
                self.api.WindowsDeleteString(text)
        except Exception:
            if self.initialized:
                self.api.RoUninitialize()
                self.initialized=False
            raise
        table=ctypes.cast(self.factory,ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
        self.setter=ctypes.WINFUNCTYPE(ctypes.c_long,ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_int,ctypes.c_void_p)(table[25])
        self.getter=ctypes.WINFUNCTYPE(ctypes.c_long,ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_int,ctypes.POINTER(ctypes.c_void_p))(table[26])
        self.release=ctypes.WINFUNCTYPE(ctypes.c_ulong,ctypes.c_void_p)(table[2])

    @staticmethod
    def check(result):
        if result<0:
            raise OSError(f'Windows app-routing policy failed: 0x{result & 0xffffffff:08x}')

    def string(self,value):
        result=ctypes.c_void_p()
        self.check(self.api.WindowsCreateString(value,len(value),ctypes.byref(result)))
        return result

    def set(self,pid,identifier):
        handle=self.string(endpoint_path(identifier)) if identifier else ctypes.c_void_p()
        try:
            for role in (0,1,2):
                self.check(self.setter(self.factory,pid,0,role,handle))
        finally:
            self.api.WindowsDeleteString(handle)

    def get(self,pid):
        handle=ctypes.c_void_p()
        self.check(self.getter(self.factory,pid,0,1,ctypes.byref(handle)))
        try:
            length=ctypes.c_uint32()
            pointer=self.api.WindowsGetStringRawBuffer(handle,ctypes.byref(length))
            return ctypes.wstring_at(pointer,length.value) if pointer else ''
        finally:
            self.api.WindowsDeleteString(handle)

    def close(self):
        if self.factory:
            self.release(self.factory)
            self.factory=ctypes.c_void_p()
        if self.initialized:
            self.api.RoUninitialize()
            self.initialized=False
