"""Exact-frame WASAPI writes, avoiding SoundCard's short-block over-release.

SoundCard 0.4.6 reserves every available render frame even when the supplied
block is shorter. Only reserve/release frames we actually fill. Linux keeps
the public PulseAudio player unchanged.
"""
import sys
import time
import numpy as np
from .channels import device_roles, stream_channels

def native_context(device, roles, samplerate, blocksize, capture=False):
    """Initialize with a correctly packed format and the real speaker mask."""
    from soundcard.mediafoundation import _Player, _Recorder, _ffi, _com
    from .windows_format import packed_format
    base = _Recorder if capture else _Player
    class NativeContext(base):
        def __init__(self):
            self._ptr = device._audio_client()
            self.channelmap = list(range(len(roles)))
            self.samplerate = samplerate
            self._idle_start_time = None
            raw = _ffi.new('char[]', packed_format(roles, samplerate))
            flags = 0x00100000 | 0x80000000 | 0x08000000 | 0x00080000
            if capture and getattr(device, 'isloopback', False):
                flags |= 0x00020000
            result = self._ptr[0][0].lpVtbl.Initialize(self._ptr[0], 0, flags, round(blocksize/samplerate*10000000), 0, _ffi.cast('WAVEFORMATEXTENSIBLE*', raw), _ffi.NULL)
            try:
                _com.check_error(result)
            except Exception:
                _com.release(self._ptr)
                raise
    return NativeContext()

def capture_latency(recorder):
    if sys.platform == 'win32' and hasattr(recorder, '_ptr'):
        from soundcard.mediafoundation import _ffi
        value = _ffi.new('REFERENCE_TIME*')
        result = recorder._ptr[0][0].lpVtbl.GetStreamLatency(recorder._ptr[0], value)
        if result != 0:
            raise RuntimeError('Capture driver did not report latency')
        return value[0]/10000000
    return recorder.latency

class WasapiPlayer:
    def __init__(self, player, stop_event=None, ffi=None):
        self.player, self.stop_event = player, stop_event
        if ffi is None:
            from soundcard.mediafoundation import _ffi
            ffi = _ffi
        self.ffi = ffi

    def __enter__(self):
        self.player.__enter__()
        return self

    def __exit__(self, *args):
        return self.player.__exit__(*args)

    @property
    def latency(self):
        value = self.ffi.new('REFERENCE_TIME*')
        result = self.player._ptr[0][0].lpVtbl.GetStreamLatency(self.player._ptr[0], value)
        if result != 0:
            raise RuntimeError('The audio driver did not report latency')
        return value[0]/10000000 + self.player.currentpadding/self.player.samplerate

    def play(self, samples):
        data = np.asarray(samples, dtype=np.float32, order='C')
        if data.ndim == 1:
            data = data[:, None]
        channelmap = self.player.channelmap
        if data.ndim != 2 or data.shape[1] != len(channelmap):
            raise ValueError('Playback channel count does not match the device')
        data = data[:, sorted(range(len(channelmap)), key=lambda k: channelmap[k])]
        offset = 0
        progress = time.monotonic()
        while offset < len(data):
            if self.stop_event and self.stop_event.is_set():
                return
            available = self.player._render_available_frames()
            count = min(available, len(data)-offset)
            if count <= 0:
                if time.monotonic()-progress > 2:
                    raise RuntimeError('Audio device stopped accepting samples')
                time.sleep(.001)
                continue
            buffer = self.player._render_buffer(count)
            payload = data[offset:offset+count].tobytes()
            self.ffi.memmove(buffer[0], payload, len(payload))
            self.player._render_release(count)
            offset += count
            progress = time.monotonic()

def open_player(speaker, stop_event=None, roles=None, **kwargs):
    if sys.platform == 'win32' and hasattr(speaker, '_audio_client'):
        roles = roles or device_roles(speaker)
        context = native_context(speaker, roles, kwargs['samplerate'], kwargs.get('blocksize', 1920))
    else:
        if roles:
            kwargs['channels'] = stream_channels(roles)
        context = speaker.player(**kwargs)
    if sys.platform == 'win32' and hasattr(context, '_render_available_frames'):
        return WasapiPlayer(context, stop_event)
    return context

def open_recorder(device, roles, samplerate=48000, blocksize=1920):
    if sys.platform == 'win32' and hasattr(device, '_audio_client'):
        return native_context(device, roles, samplerate, blocksize, capture=True)
    return device.recorder(samplerate=samplerate, channels=stream_channels(roles), blocksize=blocksize)
