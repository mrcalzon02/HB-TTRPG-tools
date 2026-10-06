"""Packed WASAPI formats and reversible format selection for the app's cable."""
import struct
import uuid
import ctypes
from .channels import WINDOWS_ORDER

def packed_format(roles, rate=48000, original=None):
    count = len(roles)
    raw = bytearray(original if original and len(original)>=40 else bytes(40))
    bits = struct.unpack_from('<H', raw, 14)[0] if original else 32
    bits = bits if bits in (16, 24, 32) else 32
    mask = sum(1<<WINDOWS_ORDER.index('FC' if role=='M' else role) for role in roles if role in WINDOWS_ORDER or role=='M')
    struct.pack_into('<HHIIHHH', raw, 0, 0xfffe, count, rate, rate*count*(bits//8), count*(bits//8), bits, 22)
    struct.pack_into('<HI', raw, 18, bits, mask)
    if not original:
        raw[24:40] = uuid.UUID('00000003-0000-0010-8000-00aa00389b71').bytes_le
    return bytes(raw[:40])

def policy():
    import comtypes
    from comtypes import COMMETHOD, GUID, IUnknown
    from ctypes.wintypes import LPCWSTR, BOOL
    from pycaw.constants import CLSID_CPolicyConfigClient
    class FormatPolicy(IUnknown):
        _iid_ = GUID('{f8679f50-850a-41cf-9c72-430f290290c8}')
        _methods_ = (
            COMMETHOD([], ctypes.HRESULT, 'GetMixFormat', (['in'], LPCWSTR, 'id'), (['out'], ctypes.POINTER(ctypes.c_void_p), 'format')),
            COMMETHOD([], ctypes.HRESULT, 'GetDeviceFormat', (['in'], LPCWSTR, 'id'), (['in'], BOOL, 'default'), (['out'], ctypes.POINTER(ctypes.c_void_p), 'format')),
            COMMETHOD([], ctypes.HRESULT, 'ResetDeviceFormat'),
            COMMETHOD([], ctypes.HRESULT, 'SetDeviceFormat', (['in'], LPCWSTR, 'id'), (['in'], ctypes.c_void_p, 'endpoint'), (['in'], ctypes.c_void_p, 'mix')),
        )
    return comtypes.CoCreateInstance(CLSID_CPolicyConfigClient, FormatPolicy, comtypes.CLSCTX_ALL)

def read_format(pointer):
    try:
        header = ctypes.string_at(pointer, 18)
        extra = struct.unpack_from('<H', header, 16)[0]
        return ctypes.string_at(pointer, 18+extra)
    finally:
        ctypes.windll.ole32.CoTaskMemFree.argtypes = [ctypes.c_void_p]
        ctypes.windll.ole32.CoTaskMemFree(pointer)

def set_raw(identifier, endpoint, mix):
    endpoint_buffer = ctypes.create_string_buffer(endpoint)
    mix_buffer = ctypes.create_string_buffer(mix)
    policy().SetDeviceFormat(identifier, ctypes.cast(endpoint_buffer, ctypes.c_void_p), ctypes.cast(mix_buffer, ctypes.c_void_p))

def configure_cable(identifier, roles):
    import base64
    controller = policy()
    endpoint = read_format(controller.GetDeviceFormat(identifier, False))
    mix = read_format(controller.GetMixFormat(identifier))
    desired_endpoint = packed_format(roles, original=endpoint)
    desired_mix = packed_format(roles)
    backup = dict(id=identifier, endpoint=base64.b64encode(endpoint).decode(), mix=base64.b64encode(mix).decode())
    set_raw(identifier, desired_endpoint, desired_mix)
    return backup

def restore_cable(backup):
    import base64
    set_raw(backup['id'], base64.b64decode(backup['endpoint']), base64.b64decode(backup['mix']))
