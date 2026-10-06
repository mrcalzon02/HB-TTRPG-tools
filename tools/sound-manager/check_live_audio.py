"""Opt-in hardware check. Plays a quiet short tone through two chosen outputs.

Only run while developing/testing; this is not imported by the application.
"""
import json
import threading
import time
import numpy as np
from sound_manager.backend import Backend
from sound_manager.engine import Engine, RATE, audio_thread
from sound_manager.playback import open_player

backend = Backend()
devices = backend.devices()
physical = [d for d in devices if d.kind == 'output' and not d.virtual]
if len(physical) < 2:
    raise SystemExit('Connect at least two outputs for the live check')
# Prefer the normal speakers and the Yeti headphone jack; avoid a loud monitor.
chosen = sorted(physical, key=lambda d: (not d.default, 'Yeti' not in d.name))[:2]
snapshot = backend.defaults()
bus, source = backend.prepare_bus()
engine = Engine(backend.sc)
configs = {d.id: {'selected': True, 'eq': True, 'gains': [0]*10} for d in chosen}
configs[chosen[1].id]['gains'][5] = -6
original_sc = backend.sc

class MeterPlayer:
    def __init__(self, owner, context):
        self.owner, self.context = owner, context
    def __enter__(self):
        self.player = self.context.__enter__()
        return self
    def __exit__(self, *args):
        return self.context.__exit__(*args)
    def play(self, data):
        self.owner.peaks.append(float(abs(data).max()))
        if len(data) >= 100:
            self.owner.rms.append(float(np.sqrt(np.mean(data*data))))
        self.player.play(data)

class MeterSpeaker:
    def __init__(self, device):
        self.device = device
        self.channels = device.channels
        self.peaks, self.rms = [], []
    def player(self, **kwargs):
        return MeterPlayer(self, open_player(self.device, **kwargs))

class MeterCard:
    def __init__(self):
        self.outputs = {}
    def get_speaker(self, identifier):
        device = MeterSpeaker(original_sc.get_speaker(identifier))
        self.outputs[identifier] = device
        return device
    def get_microphone(self, identifier, **kwargs):
        return original_sc.get_microphone(identifier, **kwargs)

meter = MeterCard()
engine.sc = meter
try:
    engine.start(source, configs)
    tone = (np.sin(np.arange(RATE)*2*np.pi*1000/RATE)*.025).astype(np.float32)
    # Short fades avoid loud test clicks; maximum tone is -32 dBFS.
    tone[:480] *= np.linspace(0, 1, 480)
    tone[-480:] *= np.linspace(1, 0, 480)
    with open_player(original_sc.get_speaker(bus), samplerate=RATE, channels=2, blocksize=1920) as player:
        for offset in range(0, len(tone), 480):
            block = tone[offset:offset+480]
            player.play(np.column_stack((block, block)))
    time.sleep(.3)
    if engine.error:
        raise RuntimeError(engine.error)
    result = []
    for device in chosen:
        worker = engine.workers[device.id]
        output = meter.outputs[device.id]
        if worker.error:
            raise RuntimeError(worker.error)
        peak = max(output.peaks, default=0)
        if peak < .001:
            raise RuntimeError('No audio reached '+device.name)
        rms = float(np.quantile(output.rms, .9))
        result.append({'device': device.name, 'peak': peak, 'rms': rms, 'dropped_blocks': worker.drops})
    ratio = result[1]['rms']/result[0]['rms']
    print(json.dumps({'outputs': result, 'eq_rms_ratio': ratio}, indent=2))
    if not .35 < ratio < .7:
        raise RuntimeError(f'Per-output -6 dB EQ did not measure correctly: ratio={ratio}')
finally:
    backend.restore_defaults(snapshot, bus)
    engine.stop()
    backend.release_bus()
