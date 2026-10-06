"""Live PCM loopback check on the unused 16-channel cable, no physical output."""
import threading
import time
import numpy as np
from sound_manager.backend import Backend
from sound_manager.channels import LAYOUTS, device_roles
from sound_manager.windows_format import configure_cable, restore_cable
from sound_manager.playback import open_player, open_recorder
from sound_manager.engine import audio_thread, RATE

backend = Backend()
device = next(d for d in backend.sc.all_speakers() if '16ch' in d.name and 'VB-Audio' in d.name)
defaults = backend.defaults()
for name in ('Mono', '5.1', '7.1', '7.1.4'):
    roles = LAYOUTS['Stereo'] if name=='Mono' else LAYOUTS[name]
    backup = configure_cable(device.id, roles)
    time.sleep(.3)  # Allow the audio service to rebuild its endpoint graph.
    stop, ready = threading.Event(), threading.Event()
    blocks, errors = [], []
    def capture():
        try:
            with audio_thread():
                microphone = backend.sc.get_microphone(device.id, include_loopback=True)
                with open_recorder(microphone, roles) as recorder:
                    ready.set()
                    while not stop.is_set():
                        blocks.append(recorder.record(numframes=None))
        except Exception as exc:
            errors.append(str(exc))
            ready.set()
    thread = threading.Thread(target=capture, daemon=True)
    try:
        assert device_roles(backend.sc.get_speaker(device.id)) == roles
        thread.start()
        if not ready.wait(5) or errors:
            raise RuntimeError(errors or 'Capture startup timed out')
        frequencies = 300+np.arange(len(roles))*200
        data = (.01*np.sin(np.arange(RATE)[:, None]*2*np.pi*frequencies[None, :]/RATE)).astype(np.float32)
        with open_player(backend.sc.get_speaker(device.id), roles=roles, samplerate=RATE, blocksize=1920) as player:
            for offset in range(0, len(data), 480):
                player.play(data[offset:offset+480])
        time.sleep(.15)
        stop.set()
        thread.join(timeout=2)
        if errors:
            raise RuntimeError(errors)
        captured = np.concatenate(blocks)
        energetic = np.flatnonzero(np.max(abs(captured), axis=1)>.002)
        if len(energetic)<RATE//2:
            raise RuntimeError('Insufficient captured PCM audio')
        offset = energetic[0]+RATE//10
        segment = captured[offset:offset+RATE//2]
        spectrum = abs(np.fft.rfft(segment, axis=0))
        measured = np.argmax(spectrum, axis=0)*RATE/len(segment)
        if not np.all(abs(measured-frequencies)<5):
            raise RuntimeError(f'Channel routing mismatch: {measured} != {frequencies}')
        print(f'{name}: {len(roles)} channels, positions preserved, PCM loopback PASS', flush=True)
    finally:
        stop.set()
        try:
            if thread.ident is not None:
                thread.join(timeout=2)
        finally:
            restore_cable(backup)
assert backend.defaults() == defaults
print('Original cable format and system defaults preserved.')
