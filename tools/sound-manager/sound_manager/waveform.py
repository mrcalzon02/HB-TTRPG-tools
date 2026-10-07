"""Bounded in-memory three-second peak envelope; never records to disk."""
from collections import deque
import threading
import time
import math
import numpy as np
from PySide6.QtCore import QTimer, QPointF
from PySide6.QtGui import QColor, QPainter, QPen
from PySide6.QtWidgets import QWidget

class WaveHistory:
    def __init__(self, rate=48000, seconds=3):
        self.rate, self.seconds = rate, seconds
        self.bins = deque(maxlen=600)
        self.lock = threading.Lock()
        self.end = None
        self.pending = None
        self.pending_start = None
        self.power, self.peak_hold, self.clip_samples = 0.0, 0.0, 0

    def append(self, samples, clipped=0):
        if not len(samples):
            return
        samples = np.asarray(samples)
        if samples.ndim == 1:
            samples = samples[:, None]
        now = time.monotonic()
        with self.lock:
            alpha = math.exp(-len(samples)/self.rate/.3)
            self.power = alpha*self.power+(1-alpha)*float(np.mean(samples.astype(np.float64)**2))
            self.peak_hold = max(self.peak_hold, float(np.max(abs(samples))))
            self.clip_samples += int(clipped)
            start = max(now-len(samples)/self.rate, self.end or -float('inf'))
            if self.pending is None or not len(self.pending):
                self.pending_start = start
                self.pending = samples.copy()
            else:
                self.pending = np.concatenate((self.pending, samples))
            size = max(1, self.rate//200)
            count = len(self.pending)//size*size
            for offset in range(0, count, size):
                block = self.pending[offset:offset+size]
                self.bins.append((self.pending_start+offset/self.rate, float(np.min(block)), float(np.max(block))))
            self.pending = self.pending[count:].copy()
            self.pending_start += count/self.rate
            self.end = start+len(samples)/self.rate

    def levels(self):
        with self.lock:
            rms = math.sqrt(self.power) if self.end and time.monotonic()-self.end<3 else 0
            return self.peak_hold, rms, self.clip_samples

    def reset_levels(self):
        with self.lock:
            self.peak_hold, self.clip_samples = 0.0, 0

    def snapshot(self, now=None):
        now = time.monotonic() if now is None else now
        with self.lock:
            return [(max(0, min(1, (stamp-(now-self.seconds))/self.seconds)), low, high) for stamp, low, high in self.bins if stamp >= now-self.seconds]

class WaveformWidget(QWidget):
    def __init__(self, window, device):
        super().__init__()
        self.window, self.device = window, device
        self.setMinimumHeight(65)
        self.setToolTip('Processed audio, peak hold, and RMS level. Visual scaling does not change volume. Double-click to reset peak/clip hold.')
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update)
        if not window.settings.device(device).get('waveform', True):
            self.hide()

    def set_display_enabled(self, enabled):
        self.setVisible(enabled)
        if enabled and self.isVisible():
            self.timer.start(50)
        else:
            self.timer.stop()

    def showEvent(self, event):
        self.timer.start(50)
        super().showEvent(event)

    def hideEvent(self, event):
        self.timer.stop()
        super().hideEvent(event)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor('#111620'))
        center = self.height()/2
        painter.setPen(QPen(QColor('#344258'), 1))
        painter.drawLine(QPointF(0, center), QPointF(self.width(), center))
        painter.setPen(QColor('#9baac0'))
        painter.drawText(6, 14, 'Waveform · last 3 seconds')
        history = self.window.engine.history(self.device.id)
        if history is None:
            label = 'Enable Meter or Listen for this input' if self.device.kind == 'input' else 'No routed audio'
            painter.drawText(6, self.height()-6, label)
            return
        peak, rms, clipped = history.levels()
        def db(value):
            return f'{20*math.log10(value):.1f}' if value>1e-8 else '−∞'
        painter.setPen(QColor('#ff8e8e' if clipped else '#a7b2c5'))
        painter.drawText(max(220, self.width()-380), 14, f'Peak {db(peak)} · RMS {db(rms)} dBFS · Clip {clipped}')
        painter.setPen(QPen(QColor('#65c5f5'), 1))
        points = history.snapshot()
        peak = max((max(abs(low), abs(high)) for _, low, high in points), default=0)
        scale = min(20, 1/max(.05, peak*1.2))
        for position, low, high in points:
            x = position*self.width()
            painter.drawLine(QPointF(x, center-low*scale*(center-16)), QPointF(x, center-high*scale*(center-16)))

    def mouseDoubleClickEvent(self, event):
        history = self.window.engine.history(self.device.id)
        if history:
            history.reset_levels()
        self.update()
