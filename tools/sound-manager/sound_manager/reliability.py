"""Bounded recovery policies. Polling alone never reopens a failed stream."""
from collections import deque
import time

class DeviceReturnTracker:
    def __init__(self, settle=6, cooldown=30, max_attempts=3, window=300):
        self.settle, self.cooldown, self.max_attempts, self.window = settle, cooldown, max_attempts, window
        self.states = {}

    def note_attempt(self, identifier, now=None):
        now = time.monotonic() if now is None else now
        state = self.states.setdefault(identifier, dict(present=False, missing=False, since=now, attempts=deque()))
        state['attempts'].append(now)
        state['missing'] = False

    def expect_missing(self, identifier, now=None):
        now = time.monotonic() if now is None else now
        self.states.setdefault(identifier, dict(present=False, missing=True, since=now, attempts=deque()))

    def settling(self, identifier):
        state = self.states.get(identifier)
        return bool(state and state['missing'])

    def observe(self, identifiers, now=None):
        now = time.monotonic() if now is None else now
        identifiers = set(identifiers)
        returned = []
        for identifier in identifiers:
            if identifier not in self.states:
                self.states[identifier] = dict(present=True, missing=False, since=now, attempts=deque())
        for identifier, state in self.states.items():
            present = identifier in identifiers
            if not present:
                state['missing'] = True
                state['present'] = False
                state['since'] = now
                continue
            if not state['present']:
                state['since'] = now
                state['present'] = True
            attempts = state['attempts']
            while attempts and now-attempts[0]>self.window:
                attempts.popleft()
            last = attempts[-1] if attempts else -float('inf')
            if state['missing'] and now-state['since']>=self.settle and now-last>=self.cooldown and len(attempts)<self.max_attempts:
                returned.append(identifier)
                self.note_attempt(identifier, now)
        return returned

class RetryBudget:
    def __init__(self, delays=(5, 15, 30)):
        self.delays = delays
        self.reset()

    def reset(self):
        self.attempts, self.next_time = 0, None

    def failed(self, now=None):
        now = time.monotonic() if now is None else now
        if self.attempts>=len(self.delays):
            self.next_time = None
            return False
        self.next_time = now+self.delays[self.attempts]
        self.attempts += 1
        return True

    def due(self, now=None):
        now = time.monotonic() if now is None else now
        return self.next_time is not None and now>=self.next_time
