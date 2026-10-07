import json
from pathlib import Path
import queue
import tempfile
import time
import unittest
from unittest.mock import patch
import numpy as np
from scipy.signal import sosfreqz
from sound_manager.dsp import Equalizer, coefficients
from sound_manager.engine import Engine, OutputWorker, InputWorker
from sound_manager.settings import Settings
from sound_manager.backend import Backend, BUS
from sound_manager.playback import WasapiPlayer

class DspTests(unittest.TestCase):
    def test_flat_and_streaming_state(self):
        samples = np.random.default_rng(4).normal(0, .02, (4800, 2))
        full = Equalizer().process(samples, [0]*10)
        eq = Equalizer()
        chunks = np.concatenate([eq.process(block, [0]*10) for block in np.split(samples, 10)])
        np.testing.assert_allclose(full, chunks, atol=1e-6)
        np.testing.assert_allclose(chunks[240:], samples[240:], atol=1e-6)

    def test_each_band_and_stability(self):
        gains = [0]*10
        gains[5] = 6
        _, response = sosfreqz(coefficients(gains), worN=[100, 1000, 10000], fs=48000)
        db = 20*np.log10(abs(response))
        self.assertAlmostEqual(db[1], 6, places=5)
        self.assertLess(abs(db[0]), .1)
        self.assertLess(abs(db[2]), .1)
        for gain in (-12, 12):
            eq = Equalizer()
            signal = np.ones((48000, 2))*.9
            result = eq.process(signal, [gain]*10)
            self.assertTrue(np.isfinite(result).all())
            self.assertLessEqual(abs(result).max(), .99001)

    def test_stateful_filter_and_bypass(self):
        signal = np.random.default_rng(8).normal(0, .01, (4800, 2))
        gains = [0, 0, 0, 0, 0, 6, 0, 0, 0, 0]
        full = Equalizer().process(signal, gains)
        eq = Equalizer()
        stream = np.concatenate([eq.process(block, gains) for block in np.split(signal, 10)])
        np.testing.assert_allclose(full, stream, atol=1e-6)
        bypass = Equalizer().process(signal, gains, enabled=False)
        np.testing.assert_allclose(bypass[240:], signal[240:], atol=1e-6)

    def test_muting_and_invalid_gain(self):
        eq = Equalizer()
        eq.process(np.ones((480, 2))*.1, [0]*10)
        muted = eq.process(np.ones((480, 2))*.1, [0]*10, level=0)
        self.assertEqual(abs(muted[240:]).max(), 0)
        with self.assertRaises(ValueError):
            coefficients([float('nan')]*10)

class FakeSpeaker:
    channels = 2
    def __init__(self, owner, identifier):
        self.owner, self.identifier = owner, identifier
    def player(self, **kwargs):
        return self
    def __enter__(self):
        if self.identifier == 'bad':
            raise RuntimeError('Disconnected')
        return self
    def __exit__(self, *args):
        pass
    def play(self, samples):
        self.owner.played.setdefault(self.identifier, []).append(samples.copy())
        time.sleep(.002)

class FakeRecorder:
    def recorder(self, **kwargs):
        return self
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def record(self, **kwargs):
        time.sleep(.01)
        return np.ones((480, 2), dtype=np.float32)*.01

class FakeCard:
    def __init__(self):
        self.played = {}
        self.opens = {}
    def get_speaker(self, identifier):
        self.opens[identifier] = self.opens.get(identifier, 0)+1
        return FakeSpeaker(self, identifier)
    def get_microphone(self, identifier, **kwargs):
        return FakeRecorder()

def config(selected=True):
    return {'selected': selected, 'gains': [0]*10, 'eq': True}

class RoutingTests(unittest.TestCase):
    def test_solo_silences_only_other_managed_stream_and_can_be_released(self):
        card=FakeCard()
        engine=Engine(card)
        engine.start('bus',{'a':config(),'b':dict(config(),_solo_silenced=True)})
        try:
            time.sleep(.08)
            self.assertGreater(abs(card.played['a'][-1]).max(),0)
            self.assertEqual(abs(card.played['b'][-1]).max(),0)
            self.assertGreater(engine.workers['a'].process_ms,0)
            engine.configure({'a':config(),'b':config()})
            time.sleep(.08)
            self.assertGreater(abs(card.played['b'][-1]).max(),0)
            self.assertEqual(card.opens['b'],1)
        finally:
            engine.stop()
    def test_failed_primary_starts_unselected_backup_without_second_primary_open(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'bad':config(), 'backup':config(False)}, fallback_id='backup')
        try:
            time.sleep(.05)
            self.assertEqual(engine.fallback_active, 'backup')
            self.assertEqual(card.opens['bad'], 1)
            self.assertTrue(card.played['backup'])
        finally:
            engine.stop()

    def test_explicit_retry_keeps_healthy_stream_open(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'a':config(), 'bad':config()})
        try:
            self.assertEqual(engine.retry_outputs(['bad'], {'a':config(), 'bad':config()}), ['bad'])
            time.sleep(.05)
            self.assertEqual(card.opens['bad'], 2)
            self.assertEqual(card.opens['a'], 1)
        finally:
            engine.stop()
    def test_panic_silences_routing_without_reopening_output(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'a': config()})
        try:
            time.sleep(.08)
            muted = config()
            muted['_panic'] = True
            engine.configure({'a': muted})
            time.sleep(.08)
            self.assertEqual(abs(card.played['a'][-1]).max(), 0)
            self.assertEqual(card.opens['a'], 1)
            engine.configure({'a': config()})
            time.sleep(.08)
            self.assertGreater(abs(card.played['a'][-1]).max(), 0)
        finally:
            engine.stop()

    def test_monitored_input_is_mixed_and_stopped_with_router(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'a': config()})
        try:
            time.sleep(.08)
            baseline = float(card.played['a'][-1].mean())
            engine.configure_inputs({'mic':{'monitor':True,'delay_ms':0}})
            start_index = len(card.played['a'])
            deadline = time.monotonic()+1
            mixed = False
            while time.monotonic() < deadline:
                mixed = any(float(block.mean()) > baseline*1.5 for block in card.played['a'][start_index:])
                if mixed:
                    break
                time.sleep(.01)
            self.assertTrue(mixed, 'Monitored input never reached the routed output')
            engine.configure_inputs({'mic':{'monitor':False,'delay_ms':0}})
            time.sleep(.15)
            self.assertLess(float(card.played['a'][-1].mean()), baseline*1.1)
        finally:
            engine.stop()
        self.assertFalse(engine.inputs)

    def test_fanout_toggle_and_cleanup(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'a': config(), 'b': config()})
        try:
            time.sleep(.15)
            self.assertTrue(card.played['a'])
            self.assertTrue(card.played['b'])
            engine.configure({'a': config(False), 'b': config()})
            time.sleep(.15)
            self.assertEqual(abs(card.played['a'][-1]).max(), 0)
            self.assertGreater(abs(card.played['b'][-1]).max(), 0)
        finally:
            engine.stop()
        self.assertFalse(engine.workers)

    def test_one_failed_output_does_not_stop_others(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'a': config()})
        try:
            engine.configure({'a': config(), 'bad': config()})
            time.sleep(.15)
            self.assertTrue(card.played['a'])
            self.assertFalse(engine.stop_event.is_set())
            self.assertIn('Disconnected', engine.messages.get_nowait())
        finally:
            engine.stop()

    def test_refresh_never_reopens_failed_bluetooth_output(self):
        card = FakeCard()
        engine = Engine(card)
        engine.start('bus', {'a': config(), 'bad': config()})
        try:
            for _ in range(10):
                engine.configure({'a': config(), 'bad': config()})
                time.sleep(.005)
            self.assertEqual(card.opens['bad'], 1)
            engine.configure({'a': config()})  # Disappears from device inventory.
            engine.configure({'a': config(), 'bad': config()})
            self.assertEqual(card.opens['bad'], 1)
            engine.configure({'a': config(), 'bad': config(False)})
            engine.configure({'a': config(), 'bad': config()})
            time.sleep(.05)
            self.assertEqual(card.opens['bad'], 2)
        finally:
            engine.stop()

class PlaybackTests(unittest.TestCase):
    def test_short_blocks_only_release_initialized_frames(self):
        class Raw:
            channelmap = [0, 1]
            def __init__(self):
                self.requests, self.releases = [], []
            def _render_available_frames(self):
                return 1920
            def _render_buffer(self, n):
                self.requests.append(n)
                return [bytearray(n*8)]
            def _render_release(self, n):
                self.releases.append(n)
        class Ffi:
            def memmove(self, dest, source, n):
                if len(dest) != n:
                    raise AssertionError('Reserved frames exceed initialized frames')
                dest[:] = source
        raw = Raw()
        WasapiPlayer(raw, ffi=Ffi()).play(np.ones((480, 2), dtype=np.float32)*.01)
        self.assertEqual(raw.requests, [480])
        self.assertEqual(raw.releases, [480])

    def test_large_blocks_preserve_every_frame(self):
        class Raw:
            channelmap = [0, 1]
            def __init__(self):
                self.samples = []
            def _render_available_frames(self):
                return 100
            def _render_buffer(self, n):
                self.buffer = bytearray(n*8)
                return [self.buffer]
            def _render_release(self, n):
                self.samples.extend(np.frombuffer(self.buffer, dtype=np.float32).reshape(-1, 2).copy())
        class Ffi:
            def memmove(self, dest, source, n):
                dest[:] = source
        data = np.random.default_rng(9).normal(0, .01, (480, 2)).astype(np.float32)
        raw = Raw()
        WasapiPlayer(raw, ffi=Ffi()).play(data)
        np.testing.assert_array_equal(raw.samples, data)

    def test_bounded_queue_discards_stale_audio(self):
        worker = OutputWorker(FakeCard(), 'a', config(), lambda _: None)
        for value in range(100):
            worker.push(value)
        self.assertEqual(worker.queue.qsize(), 8)
        self.assertEqual(worker.queue.get_nowait(), 92)

    def test_feedback_and_start_failure(self):
        engine = Engine(FakeCard())
        with self.assertRaises(ValueError):
            engine.start('bus', {'bus': config()})
        with self.assertRaises(RuntimeError):
            engine.start('bus', {'bad': config()})
        self.assertFalse(engine.workers)

class PersistenceTests(unittest.TestCase):
    def test_roundtrip_and_corrupt_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'settings.json'
            settings = Settings(path)
            settings.output('device')['gains'][5] = 4
            settings.save()
            self.assertEqual(Settings(path).output('device')['gains'][5], 4)
            path.write_text('broken')
            self.assertTrue(Settings(path).warning)

    def test_restore_only_defaults_owned_by_app(self):
        backend = Backend.__new__(Backend)
        backend.windows = True
        backend.sc = type('SC', (), {'all_speakers': lambda self: [type('Speaker', (), {'id': 'old'})()]})()
        with patch.object(backend, 'defaults', return_value={'output:0': 'bus', 'output:1': 'user-choice'}), patch.object(backend, 'set_default') as change:
            backend.restore_defaults({'output:0': 'old', 'output:1': 'old'}, 'bus')
            change.assert_called_once_with('old', 'output', '0')

    def test_linux_null_sink_setup_and_stable_ids(self):
        backend = Backend.__new__(Backend)
        backend.windows, backend.module = False, None
        with patch('sound_manager.backend.command', side_effect=['[]', '42', '', '']) as call:
            self.assertEqual(backend.prepare_bus(), (BUS, BUS+'.monitor'))
            self.assertEqual(backend.module, '42')
            self.assertEqual(call.call_args_list[1].args[:3], ('pactl', 'load-module', 'module-null-sink'))

if __name__ == '__main__':
    unittest.main()
