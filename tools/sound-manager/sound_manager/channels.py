"""Named PCM layouts and explicit channel conversion; no Dolby codec encoder."""
import sys
import struct
import numpy as np

LAYOUTS = {
    'Mono': ('M',),
    'Stereo': ('FL', 'FR'),
    'Quad': ('FL', 'FR', 'BL', 'BR'),
    '5.1': ('FL', 'FR', 'FC', 'LFE', 'BL', 'BR'),
    '7.1': ('FL', 'FR', 'FC', 'LFE', 'BL', 'BR', 'SL', 'SR'),
    '7.1.4': ('FL', 'FR', 'FC', 'LFE', 'BL', 'BR', 'SL', 'SR', 'TFL', 'TFR', 'TBL', 'TBR'),
}
WINDOWS_ORDER = ('FL', 'FR', 'FC', 'LFE', 'BL', 'BR', 'FLC', 'FRC', 'BC', 'SL', 'SR', 'TC', 'TFL', 'TFC', 'TFR', 'TBL', 'TBC', 'TBR')
PULSE_NAMES = dict(M='mono', FL='front-left', FR='front-right', FC='front-center', LFE='lfe', BL='rear-left', BR='rear-right', SL='side-left', SR='side-right', FLC='front-left-of-center', FRC='front-right-of-center', BC='rear-center', TC='top-center', TFL='top-front-left', TFR='top-front-right', TFC='top-front-center', TBL='top-rear-left', TBR='top-rear-right', TBC='top-rear-center')
PULSE_ROLES = {name: role for role, name in PULSE_NAMES.items()}

def inferred_roles(count):
    for roles in LAYOUTS.values():
        if len(roles) == count:
            return roles
    return tuple(f'AUX{i}' for i in range(count))

def device_roles(device):
    """Read the native Windows speaker mask without opening an audio stream."""
    count = device.channels
    count = count if isinstance(count, int) else len(count)
    if sys.platform != 'win32' or not hasattr(device, '_device_ptr'):
        return inferred_roles(count)
    from soundcard.mediafoundation import _ffi, _com, _PropVariant
    store = _ffi.new('IPropertyStore**')
    pointer = device._device_ptr()
    try:
        _com.check_error(pointer[0][0].lpVtbl.OpenPropertyStore(pointer[0], 0, store))
    finally:
        _com.release(pointer)
    try:
        key = _ffi.new('PROPERTYKEY*', [[0xf19f064d, 0x82c, 0x4e27, [0xbc, 0x73, 0x68, 0x82, 0xa1, 0xbb, 0x8e, 0x4c]], 0])
        value = _PropVariant()
        _com.check_error(store[0][0].lpVtbl.GetValue(store[0], key, value.ptr))
        blob = _ffi.cast('BLOB_PROPVARIANT*', value.ptr)
        if value.ptr[0].vt != 65 or blob[0].blob.cbSize < 40:
            return inferred_roles(count)
        # WAVEFORMATEX is packed to 18 bytes on Windows. CFFI's dependency
        # declaration uses default alignment, so read the native blob offsets.
        raw = bytes(_ffi.buffer(blob[0].blob.pBlobData, 40))
        mask = struct.unpack_from('<I', raw, 20)[0]
        roles = tuple(role for bit, role in enumerate(WINDOWS_ORDER) if mask & (1<<bit))
        if count == 1:
            return ('M',)
        return roles if len(roles) == count else inferred_roles(count)
    finally:
        _com.release(store)

def stream_channels(roles):
    return len(roles) if sys.platform == 'win32' else [PULSE_NAMES.get(role, f'aux{i}') for i, role in enumerate(roles)]

def convert(samples, source, destination, mono=False):
    """Preserve named channels; fold missing center/surround into stereo.

    Stereo sources keep their original L/R. Additional speakers stay silent;
    this is channel preservation/downmixing, not an artificial surround effect.
    """
    samples = np.asarray(samples, dtype=np.float32)
    source, destination = tuple(source), tuple(destination)
    if samples.ndim != 2 or samples.shape[1] != len(source):
        raise ValueError('Source channel labels do not match the audio block')
    if source == destination and not mono:
        return samples
    if source == ('M',):
        result = np.zeros((len(samples), len(destination)), dtype=np.float32)
        for i, role in enumerate(destination):
            if role in (('FC',) if 'FC' in destination else ('M', 'FL', 'FR')):
                result[:, i] = samples[:, 0]
        return result
    stereo_target = destination in (('FL', 'FR'), ('M',)) or mono
    if stereo_target:
        matrix = np.zeros((len(source), 2), dtype=np.float32)
        for i, role in enumerate(source):
            if role == 'FL': matrix[i, 0] = 1
            elif role == 'FR': matrix[i, 1] = 1
            elif role in ('FC', 'BC', 'TC', 'TFC', 'TBC'): matrix[i, :] = .70710678
            elif role in ('BL', 'SL', 'FLC', 'TFL', 'TBL'): matrix[i, 0] = .70710678
            elif role in ('BR', 'SR', 'FRC', 'TFR', 'TBR'): matrix[i, 1] = .70710678
            elif role.startswith('AUX') and i<2: matrix[i, i] = 1
            # LFE is intentionally omitted from full-range downmixes.
        stereo = samples @ matrix
        if len(source)>2:
            stereo /= max(1, float(np.max(np.sum(abs(matrix), axis=0))))
        if destination == ('M',) or mono:
            summed = stereo.mean(axis=1)
            return convert(summed[:, None], ('M',), destination)
        return stereo
    result = np.zeros((len(samples), len(destination)), dtype=np.float32)
    for index, role in enumerate(destination):
        if role in source:
            result[:, index] = samples[:, source.index(role)]
        elif role in ('BL', 'BR') and role.replace('B', 'S') in source and role.replace('B', 'S') not in destination:
            result[:, index] = samples[:, source.index(role.replace('B', 'S'))]
        elif role in ('SL', 'SR') and role.replace('S', 'B') in source and role.replace('S', 'B') not in destination:
            result[:, index] = samples[:, source.index(role.replace('S', 'B'))]
        elif role.startswith('AUX') and index<len(source):
            result[:, index] = samples[:, index]
    if 'FC' in source and 'FC' not in destination:
        for role in ('FL', 'FR'):
            if role in destination:
                result[:, destination.index(role)] += samples[:, source.index('FC')]*.70710678
    folded = 'FC' in source and 'FC' not in destination
    for role, target in (('TFL', 'FL'), ('TFR', 'FR'), ('TBL', 'BL'), ('TBR', 'BR'), ('SL', 'BL'), ('SR', 'BR')):
        if role in source and role not in destination and target in destination and target in source:
            result[:, destination.index(target)] += samples[:, source.index(role)]*.70710678
            folded = True
    if folded:
        # Conservative extra room for the folded center/surround/height mix.
        result *= .5
    return result
