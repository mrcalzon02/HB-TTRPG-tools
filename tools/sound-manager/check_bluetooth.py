"""Isolated live Sony routing check; does not change Windows default devices."""
import json
import threading
import time
import numpy as np
from sound_manager.backend import Backend
from sound_manager.engine import Engine, RATE, audio_thread
from sound_manager.playback import open_player

backend = Backend()
devices = backend.devices()
headphones = next(d for d in devices if d.kind == 'output' and 'WF-1000XM5' in d.name)
speakers = next(d for d in devices if d.kind == 'output' and d.default and not d.virtual)
snapshot = backend.defaults()
bus, source = backend.prepare_bus()
engine = Engine(backend.sc)
configs = {d.id: {'selected': True, 'eq': True, 'gains': [0]*10} for d in (speakers, headphones)}
stop = threading.Event()
ready = threading.Event()
rms_values, errors = [], []
def measure():
    try:
        with audio_thread():
            loopback = backend.sc.get_microphone(headphones.id, include_loopback=True)
            with loopback.recorder(samplerate=RATE, channels=2, blocksize=1920) as recorder:
                ready.set()
                while not stop.is_set():
                    block = recorder.record(numframes=None)
                    if len(block):
                        rms_values.append(float(np.sqrt(np.mean(block*block))))
    except Exception as exc:
        errors.append(str(exc))
        ready.set()
thread = threading.Thread(target=measure, daemon=True)
try:
    engine.start(source, configs)
    thread.start()
    if not ready.wait(5):
        raise RuntimeError('Bluetooth loopback did not open')
    if errors:
        raise RuntimeError(errors[0])
    # A quiet continuous signal makes missing render blocks measurable.
    signal = (.008*np.sin(np.arange(RATE*10)*2*np.pi*1000/RATE)).astype(np.float32)
    signal[:480] *= np.linspace(0, 1, 480)
    signal[-480:] *= np.linspace(1, 0, 480)
    with open_player(backend.sc.get_speaker(bus), samplerate=RATE, channels=2, blocksize=1920) as player:
        for offset in range(0, len(signal), 480):
            block = signal[offset:offset+480]
            player.play(np.column_stack((block, block)))
    time.sleep(.5)
    worker = engine.workers[headphones.id]
    if worker.error or engine.error or errors:
        raise RuntimeError(worker.error or engine.error or errors[0])
    levels = np.asarray(rms_values)
    audible = np.flatnonzero(levels > .001)
    if len(audible) == 0:
        raise RuntimeError('Windows Bluetooth loopback received no audio')
    interior = levels[audible[0]:audible[-1]+1]
    coverage = float(np.mean(interior > .001))
    if coverage < .95:
        raise RuntimeError(f'Bluetooth audio contains gaps: coverage={coverage}')
    if backend.defaults() != snapshot:
        raise RuntimeError('Audio defaults changed during isolated check')
    print(json.dumps({'headphones': headphones.name, 'loopback_rms_median': float(np.median(interior)), 'signal_coverage': coverage, 'dropped_blocks': worker.drops, 'samples_measured': len(levels), 'device_error': worker.error, 'default_devices_unchanged': True}, indent=2))
finally:
    stop.set()
    thread.join(timeout=2)
    engine.stop()
    backend.release_bus()
