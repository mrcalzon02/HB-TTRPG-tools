"""Sample-accurate delay lines and conservative driver-latency alignment."""
import numpy as np

class DelayLine:
    def __init__(self, rate=48000, channels=2):
        self.rate, self.channels = rate, channels
        self.frames = 0
        self.buffer = np.zeros((0, channels), dtype=np.float32)

    def process(self, samples, milliseconds):
        frames = round(max(0, min(2000, milliseconds))*self.rate/1000)
        if frames != self.frames:
            # Preserve recent history; prepend silence only for additional delay.
            if frames > self.frames:
                self.buffer = np.concatenate((np.zeros((frames-self.frames, self.channels), dtype=np.float32), self.buffer))
            else:
                self.buffer = self.buffer[self.frames-frames:]
            self.frames = frames
        if not frames:
            return samples
        data = np.concatenate((self.buffer, samples))
        result, self.buffer = data[:len(samples)], data[len(samples):]
        return result

def alignment_delays(latencies):
    valid = {key: max(0, float(value)) for key, value in latencies.items() if value is not None and np.isfinite(value)}
    if len(valid) < 2:
        raise ValueError('At least two active outputs must report latency for Auto sync.')
    slowest = max(valid.values())
    return {key: round(min(2000, slowest-value)) for key, value in valid.items()}
