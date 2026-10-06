"""Streaming stereo graphic EQ. Filter state persists between audio blocks."""
import math
import numpy as np
from scipy.signal import sosfilt, sosfreqz

FREQUENCIES = (31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000)
CLASSIC_FREQUENCIES = (25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000)
PRESETS = {
    "Flat": [0] * 10,
    "Bass": [5, 4, 3, 1, 0, 0, 0, 0, 0, 0],
    "Voice": [-3, -3, -2, 0, 2, 3, 3, 2, 0, -2],
    "Bright": [-1, -1, 0, 0, 0, 1, 2, 3, 3, 2],
}

def coefficients(gains, rate=48000, frequencies=FREQUENCIES):
    if len(gains) != len(frequencies):
        raise ValueError("Expected ten EQ bands")
    rows = []
    for frequency, gain in zip(frequencies, gains):
        if not math.isfinite(gain) or not -24 <= gain <= 24:
            raise ValueError("EQ gains must be between -24 and +24 dB")
        a = 10 ** (gain / 40)
        w = 2 * math.pi * frequency / rate
        alpha = math.sin(w) / (2 * 1.4)
        c = math.cos(w)
        denominator = 1 + alpha / a
        rows.append(np.array([1 + alpha*a, -2*c, 1-alpha*a,
                              denominator, -2*c, 1-alpha/a]) / denominator)
    return np.asarray(rows)

FILTER_TYPES = ('Peak', 'Low shelf', 'High shelf', 'High pass', 'Low pass', 'Notch')

def biquad(kind, frequency, gain=0, q=1.4, rate=48000):
    """RBJ biquads: https://www.w3.org/TR/audio-eq-cookbook/."""
    if kind not in FILTER_TYPES or not all(math.isfinite(v) for v in (frequency, gain, q)):
        raise ValueError('Invalid parametric filter')
    if not 20 <= frequency <= min(20000, rate*.49) or not -24 <= gain <= 24 or not .1 <= q <= 20:
        raise ValueError('Filter frequency, gain, or Q is out of range')
    w = 2*math.pi*frequency/rate
    c, a = math.cos(w), math.sin(w)/(2*q)
    A = 10**(gain/40)
    denominator = [1+a, -2*c, 1-a]
    if kind == 'Peak':
        numerator, denominator = [1+a*A, -2*c, 1-a*A], [1+a/A, -2*c, 1-a/A]
    elif kind == 'High pass':
        numerator = [(1+c)/2, -(1+c), (1+c)/2]
    elif kind == 'Low pass':
        numerator = [(1-c)/2, 1-c, (1-c)/2]
    elif kind == 'Notch':
        numerator = [1, -2*c, 1]
    else:
        t = 2*math.sqrt(A)*a
        if kind == 'Low shelf':
            numerator = [A*((A+1)-(A-1)*c+t), 2*A*((A-1)-(A+1)*c), A*((A+1)-(A-1)*c-t)]
            denominator = [(A+1)+(A-1)*c+t, -2*((A-1)+(A+1)*c), (A+1)+(A-1)*c-t]
        else:
            numerator = [A*((A+1)+(A-1)*c+t), -2*A*((A-1)+(A+1)*c), A*((A+1)+(A-1)*c-t)]
            denominator = [(A+1)-(A-1)*c+t, 2*((A-1)-(A+1)*c), (A+1)-(A-1)*c-t]
    return np.asarray(numerator+denominator)/denominator[0]

def filter_chain(config, rate=48000):
    rows = list(coefficients(config.get('gains', [0]*10), rate))
    rows.extend(coefficients(config.get('classic_gains', [0]*len(CLASSIC_FREQUENCIES)), rate, CLASSIC_FREQUENCIES))
    tones = config.get('tones', [0, 0, 0])
    if not isinstance(tones, list) or len(tones) != 3:
        raise ValueError('Expected Bass, Mid, and Treble controls')
    for kind, frequency, gain in zip(('Low shelf', 'Peak', 'High shelf'), (150, 1000, 6000), tones):
        rows.append(biquad(kind, frequency, gain, .707, rate))
    filters = config.get('filters', [])
    if not isinstance(filters, list) or len(filters) > 24:
        raise ValueError('Use at most 24 parametric filters')
    for f in filters:
        if not isinstance(f, dict) or not isinstance(f.get('enabled', True), bool):
            raise ValueError('Invalid parametric filter entry')
        row = biquad(f.get('type', 'Peak'), f.get('frequency', 1000), f.get('gain', 0), f.get('q', 1.4), rate)
        if f.get('enabled', True):
            rows.append(row)
    return np.asarray(rows)

class Equalizer:
    def __init__(self, channels=2, rate=48000):
        self.channels, self.rate = channels, rate
        self.signature = None
        self.state = np.zeros((10, 2, channels))
        self.previous_gain = 0.0  # fade in, no initial click
        self.clipped_samples = 0

    def process(self, samples, gains, enabled=True, level=1.0, *, filters=None, preamp=0, balance=0, protect=True, classic_gains=None, tones=None):
        samples = np.asarray(samples, dtype=np.float64)
        filters = filters or []
        classic_gains = classic_gains or [0]*len(CLASSIC_FREQUENCIES)
        tones = tones or [0, 0, 0]
        signature = (tuple(gains), bool(enabled), tuple(tuple(sorted(f.items())) for f in filters), protect, preamp, tuple(classic_gains), tuple(tones))
        if signature != self.signature:
            self.sos = filter_chain(dict(gains=gains, filters=filters, classic_gains=classic_gains, tones=tones), self.rate) if enabled else coefficients([0]*10, self.rate)
            if len(self.state) != len(self.sos):
                self.state = np.zeros((len(self.sos), 2, self.channels))
            _, response = sosfreqz(self.sos, worN=8192)
            self.headroom = max(1.0, float(np.max(np.abs(response)))*max(1, 10**(preamp/20))) if protect else 1
            if self.headroom > 1.01:
                self.headroom *= 10 ** (1 / 20)
            self.signature = signature
        result, self.state = sosfilt(self.sos, samples, axis=0, zi=self.state)
        # Reserve headroom for the measured combined filter response.
        target = max(0, min(1, level)) * 10**(preamp/20) / self.headroom
        fade = np.full(len(samples), target)
        n = min(len(samples), 240)
        fade[:n] = np.linspace(self.previous_gain, target, n)
        self.previous_gain = target
        result *= fade[:, None]
        if self.channels >= 2:
            result[:, 0] *= 1-max(0, balance)/100
            result[:, 1] *= 1+min(0, balance)/100
        self.clipped_samples = int(np.count_nonzero((abs(result)>.99) | ~np.isfinite(result)))
        # Last-resort peak guard; also reject corrupt driver samples.
        return np.clip(np.nan_to_num(result), -.99, .99).astype(np.float32)
