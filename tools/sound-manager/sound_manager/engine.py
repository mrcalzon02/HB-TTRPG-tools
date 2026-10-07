"""One capture stream, independent bounded output queues and EQ workers."""
import queue
import threading
import time
import sys
import copy
from contextlib import contextmanager
import numpy as np
from .dsp import Equalizer
from .playback import open_player, open_recorder, capture_latency
from .channels import device_roles, LAYOUTS, convert
from .timing import DelayLine, click_train
from .waveform import WaveHistory

RATE, BLOCK = 48000, 480

@contextmanager
def audio_thread():
    if sys.platform == "win32":
        import ctypes
        result = ctypes.windll.ole32.CoInitializeEx(None, 0)
        if result not in (0, 1):
            raise OSError(f"Could not initialize audio worker COM: {result}")
    try:
        yield
    finally:
        if sys.platform == "win32":
            ctypes.windll.ole32.CoUninitialize()

class OutputWorker(threading.Thread):
    def __init__(self, sc, identifier, config, report):
        super().__init__(daemon=True, name="output:"+identifier)
        self.sc, self.identifier, self.config, self.report = sc, identifier, config, report
        self.queue = queue.Queue(maxsize=8)
        self.stop_event = threading.Event()
        self.ready = threading.Event()
        self.error = None
        self.drops = 0
        self.process_ms = 0
        self.device_name = identifier
        self.latency_ms = None
        self.wave = WaveHistory()
        self.lock = threading.Lock()

    def configure(self, config):
        with self.lock:
            self.config = copy.deepcopy(config)

    def push(self, data):
        if self.queue.full():
            try:
                self.queue.get_nowait()
                self.drops += 1
            except queue.Empty:
                pass
        try:
            self.queue.put_nowait(data)
        except queue.Full:
            pass

    def run(self):
        try:
            with audio_thread():
                self._run()
        except Exception as exc:
            self.error = str(exc)
            self.report(f"Output paused: {self.device_name}: {exc}. Turn Play here off and on to retry.")
            self.ready.set()

    def _run(self):
        try:
            speaker = self.sc.get_speaker(self.identifier)
            self.device_name = getattr(speaker, 'name', self.identifier)
            roles = tuple(self.config.get('_native_roles') or device_roles(speaker))
            count = len(roles)
            eq = Equalizer(channels=count)
            delay = DelayLine(channels=count)
            with open_player(speaker, self.stop_event, roles=roles, samplerate=RATE, channels=count, blocksize=1920) as player:
                self.ready.set()
                while not self.stop_event.is_set():
                    try:
                        block = self.queue.get(timeout=.1)
                    except queue.Empty:
                        continue
                    with self.lock:
                        config = self.config
                    processing_started = time.perf_counter()
                    source_roles = tuple(config.get('_source_roles', LAYOUTS['Stereo']))
                    mode = config.get('mode', 'Auto')
                    if mode == 'Mono':
                        block = convert(block, source_roles, roles, mono=True)
                    elif mode != 'Auto' and mode in LAYOUTS and len(LAYOUTS[mode])<=count:
                        chosen = LAYOUTS[mode]
                        block = convert(convert(block, source_roles, chosen), chosen, roles)
                    else:
                        block = convert(block, source_roles, roles)
                    block = delay.process(block, config.get('delay_ms', 0))
                    processed = eq.process(block, config["gains"], config["eq"], 1 if config["selected"] and not config.get('_panic', False) else 0,
                                           filters=config.get('filters', []), preamp=config.get('preamp', 0),
                                           balance=config.get('balance', 0), protect=config.get('protect', True),
                                           classic_gains=config.get('classic_gains'), tones=config.get('tones'))
                    if config.get('_solo_silenced',False):
                        processed *= 0
                    self.process_ms = (time.perf_counter()-processing_started)*1000
                    player.play(processed)
                    self.wave.append(processed, clipped=eq.clipped_samples)
                    try:
                        self.latency_ms = player.latency*1000
                    except (AttributeError, RuntimeError):
                        pass
        except Exception as exc:
            self.error = str(exc)
            self.report(f"Output paused: {self.device_name}: {exc}. Turn Play here off and on to retry.")
        finally:
            self.ready.set()

class Engine:
    def __init__(self, sc):
        self.sc = sc
        self.stop_event = threading.Event()
        self.workers = {}
        self.lock = threading.Lock()
        self.messages = queue.Queue()
        self.capture = None
        self.ready = threading.Event()
        self.error = None
        self.peak = 0
        self.inputs = {}
        self.system_delay_ms = 0
        self.capture_latency_ms = None
        self.source_roles = LAYOUTS['Stereo']
        self.capture_roles = LAYOUTS['Stereo']
        self.fallback_active = None
        self.test_click_end = 0
        self.test_click_cursor = 0

    def configure(self, configs):
        with self.lock:
            for identifier, config in configs.items():
                config = dict(config, _source_roles=self.source_roles)
                worker = self.workers.get(identifier)
                # Polling must never reopen a failed Bluetooth stream. A new
                # attempt requires an explicit off/on selection or Start.
                if worker and worker.ready.is_set() and not worker.is_alive() and config["selected"] and not worker.config["selected"]:
                    del self.workers[identifier]
                    worker = None
                if worker:
                    worker.configure(config)
                elif config["selected"]:
                    worker = OutputWorker(self.sc, identifier, config, self.messages.put)
                    self.workers[identifier] = worker
                    worker.start()
            for identifier in list(self.workers):
                if identifier not in configs:
                    worker = self.workers[identifier]
                    worker.stop_event.set()
                    # Retain a tombstone, so device flapping cannot trigger an
                    # automatic reopen when the same endpoint reappears.

    def start(self, source, configs, source_roles=None, capture_roles=None, fallback_id=None):
        if source in configs:
            raise ValueError("The capture bus cannot also be an output (feedback loop)")
        if self.capture is not None or self.workers:
            raise RuntimeError("Previous audio streams are still open. Quit and reopen the manager.")
        self.stop_event.clear()
        self.source_roles = tuple(source_roles or LAYOUTS['Stereo'])
        self.capture_roles = tuple(capture_roles or self.source_roles)
        self.ready.clear()
        self.error = None
        self.fallback_active = None
        self.configure(configs)
        opened = []
        for worker in list(self.workers.values()):
            if worker.ready.wait(5) and not worker.error:
                opened.append(worker)
            else:
                worker.stop_event.set()
        if not opened and fallback_id in configs and not configs[fallback_id]['selected']:
            config = dict(configs[fallback_id], selected=True, _source_roles=self.source_roles)
            previous = self.workers.get(fallback_id)
            if previous is None or not previous.is_alive():
                worker = OutputWorker(self.sc, fallback_id, config, self.messages.put)
                self.workers[fallback_id] = worker
                worker.start()
                if worker.ready.wait(5) and not worker.error:
                    opened.append(worker)
                    self.fallback_active = fallback_id
        if not opened:
            errors = '; '.join(w.error or 'Output did not open in time' for w in self.workers.values())
            self.stop()
            raise RuntimeError(errors or 'No output could be opened')
        self.capture = threading.Thread(target=self._capture, args=(source,), daemon=True, name="system-capture")
        self.capture.start()
        if not self.ready.wait(5) or self.error:
            self.stop()
            raise RuntimeError(self.error or "Capture did not open in time")

    def retry_outputs(self, identifiers, configs):
        retried = []
        for identifier in identifiers:
            if identifier not in configs or not configs[identifier]['selected']:
                continue
            with self.lock:
                worker = self.workers.get(identifier)
            if worker and worker.is_alive():
                if not worker.stop_event.is_set():
                    continue
                worker.join(timeout=.1)
                if worker.is_alive():
                    continue
            with self.lock:
                self.workers.pop(identifier, None)
            self.configure({**configs})
            retried.append(identifier)
        return retried

    def retry_inputs(self, identifiers, configs):
        for identifier in identifiers:
            if identifier not in configs or not (configs[identifier]['monitor'] or configs[identifier].get('meter', False)):
                continue
            with self.lock:
                worker = self.inputs.get(identifier)
            if worker and worker.is_alive():
                continue
            with self.lock:
                self.inputs.pop(identifier, None)
        self.configure_inputs(configs)

    def configure_inputs(self, configs):
        with self.lock:
            for identifier, config in configs.items():
                worker = self.inputs.get(identifier)
                enabled = config['monitor'] or config.get('meter', False)
                if enabled and worker is None:
                    worker = InputWorker(self.sc, identifier, config, self.messages.put)
                    self.inputs[identifier] = worker
                    worker.start()
                elif worker:
                    worker.config = copy.deepcopy(config)
                    if not enabled:
                        worker.stop_event.set()
                        if not worker.is_alive():
                            self.inputs.pop(identifier)
            for identifier, worker in list(self.inputs.items()):
                if identifier not in configs:
                    worker.stop_event.set()

    def latencies(self):
        with self.lock:
            return {key: worker.latency_ms for key, worker in self.workers.items() if worker.is_alive() and worker.config['selected']}

    def history(self, identifier):
        with self.lock:
            worker = self.workers.get(identifier) or self.inputs.get(identifier)
            return worker.wave if worker else None

    def _capture(self, source):
        try:
            with audio_thread():
                self._capture_audio(source)
        except Exception as exc:
            self.error = str(exc)
            self.messages.put(f"System capture stopped: {exc}")
            self.stop_event.set()
            self.ready.set()

    def _capture_audio(self, source):
        try:
            microphone = self.sc.get_microphone(source, include_loopback=True)
            # Two channels avoid the WASAPI single-channel capture bug.
            with open_recorder(microphone, self.capture_roles, samplerate=RATE, blocksize=1920) as recorder:
                delay = DelayLine(channels=len(self.source_roles))
                try:
                    self.capture_latency_ms = capture_latency(recorder)*1000
                except (AttributeError, RuntimeError):
                    pass
                self.ready.set()
                while not self.stop_event.is_set():
                    data = recorder.record(numframes=None)
                    if len(data) == 0:
                        self.stop_event.wait(.002)
                        continue
                    self.peak = float(np.max(np.abs(data)))
                    data = convert(data, self.capture_roles, self.source_roles)
                    # Split bursts so queue capacity is measured in audio time.
                    for offset in range(0, len(data), BLOCK):
                        block = delay.process(data[offset:offset+BLOCK].copy(), self.system_delay_ms)
                        with self.lock:
                            workers = list(self.workers.values())
                            inputs = list(self.inputs.values())
                        for microphone in inputs:
                            if microphone.config['monitor'] and not microphone.stop_event.is_set():
                                block += convert(microphone.take(len(block)), LAYOUTS['Stereo'], self.source_roles)
                        if time.monotonic() < self.test_click_end:
                            pulse=click_train(len(block), self.test_click_cursor)
                            self.test_click_cursor += len(block)
                            block[:,0] += pulse
                            if block.shape[1]>1:
                                block[:,1] += pulse
                        np.clip(block, -.99, .99, out=block)
                        for worker in workers:
                            worker.push(block)
        except Exception as exc:
            self.error = str(exc)
            self.messages.put(f"System capture stopped: {exc}")
            self.stop_event.set()
        finally:
            self.ready.set()

    def stop(self):
        self.test_click_end = 0
        self.stop_event.set()
        with self.lock:
            workers = list(self.workers.values()) + list(self.inputs.values())
            for worker in workers:
                worker.stop_event.set()
        if self.capture:
            self.capture.join(timeout=2)
        for worker in workers:
            worker.join(timeout=2)
        if (self.capture and self.capture.is_alive()) or any(w.is_alive() for w in workers):
            raise RuntimeError("An audio driver has not released its stream. Quit the app before starting again.")
        self.workers.clear()
        self.inputs.clear()
        self.capture = None

class InputWorker(threading.Thread):
    def __init__(self, sc, identifier, config, report):
        super().__init__(daemon=True, name='microphone:'+identifier)
        self.sc, self.identifier, self.config, self.report = sc, identifier, dict(config), report
        self.stop_event = threading.Event()
        self.queue = queue.Queue(maxsize=8)
        self.pending = np.zeros((0, 2), dtype=np.float32)
        self.latency_ms = None
        self.wave = WaveHistory()
        self.error = None
        self.drops = 0
        self.process_ms = 0

    def run(self):
        try:
            with audio_thread():
                microphone = self.sc.get_microphone(self.identifier)
                count = 2 if sys.platform == 'win32' else min(2, microphone.channels)
                delay = DelayLine()
                eq = Equalizer()
                roles = LAYOUTS['Stereo'] if count==2 else LAYOUTS['Mono']
                with open_recorder(microphone, roles, samplerate=RATE, blocksize=1920) as recorder:
                    try:
                        self.latency_ms = capture_latency(recorder)*1000
                    except (AttributeError, RuntimeError):
                        pass
                    while not self.stop_event.is_set():
                        block = recorder.record(numframes=BLOCK)
                        processing_started = time.perf_counter()
                        if block.shape[1] == 1:
                            block = np.repeat(block, 2, axis=1)
                        block = delay.process(block, self.config.get('delay_ms', 0))
                        config = self.config
                        block = eq.process(block, config.get('gains', [0]*10), config.get('eq', True), 0 if config.get('_muted', False) else 1,
                                           filters=config.get('filters', []), preamp=config.get('preamp', 0),
                                           balance=config.get('balance', 0), protect=config.get('protect', True),
                                           classic_gains=config.get('classic_gains'), tones=config.get('tones'))
                        self.process_ms = (time.perf_counter()-processing_started)*1000
                        self.wave.append(block, clipped=eq.clipped_samples)
                        if self.queue.full():
                            try:
                                self.queue.get_nowait()
                                self.drops += 1
                            except queue.Empty:
                                pass
                        self.queue.put_nowait(block)
        except Exception as exc:
            self.error = str(exc)
            self.report(f'Microphone monitoring paused: {exc}. Turn Listen off and on to retry.')

    def take(self, frames):
        while len(self.pending) < frames:
            try:
                self.pending = np.concatenate((self.pending, self.queue.get_nowait()))
            except queue.Empty:
                break
        result = np.zeros((frames, 2), dtype=np.float32)
        count = min(frames, len(self.pending))
        result[:count] = self.pending[:count]
        self.pending = self.pending[count:]
        return result
