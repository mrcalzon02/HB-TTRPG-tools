"""Reversible group mute and bounded EQ editing history."""
import copy
import time

class MuteController:
    def __init__(self, settings):
        self.settings = settings
        self.state = settings.data.setdefault('group_mute', {})
        for kind in ('output', 'input'):
            self.state.setdefault(kind, dict(active=False, before={}))

    def active(self, kind):
        return self.state[kind]['active']

    def set(self, kind, active, devices, mute):
        state = self.state[kind]
        state['active'] = bool(active)
        relevant = [d for d in devices if d.kind==kind]
        if active:
            for device in relevant:
                state['before'].setdefault(device.id, bool(device.muted))
        self.settings.save()  # Save ownership before changing endpoints.
        return self.sync(devices, mute)

    def sync(self, devices, mute):
        errors, changed = [], False
        for device in devices:
            state = self.state[device.kind]
            if state['active']:
                if device.id not in state['before']:
                    state['before'][device.id] = bool(device.muted)
                    changed = True
                if not device.muted:
                    try:
                        mute(device, True)
                        device.muted = True
                    except Exception as exc:
                        errors.append(f'{device.name}: {exc}')
            elif device.id in state['before']:
                try:
                    # Preserve a device unmuted outside the manager.
                    if device.muted:
                        mute(device, state['before'][device.id])
                        device.muted = state['before'][device.id]
                    state['before'].pop(device.id)
                    changed = True
                except Exception as exc:
                    errors.append(f'{device.name}: {exc}')
        if changed:
            self.settings.save()
        return errors

class EqHistory:
    def __init__(self, profile, limit=50):
        self.items = [copy.deepcopy(profile)]
        self.index, self.limit = 0, limit
        self.last_group, self.last_time = None, -1

    @property
    def current(self):
        return copy.deepcopy(self.items[self.index])

    def record(self, profile, group=None, now=None):
        now = time.monotonic() if now is None else now
        if profile == self.items[self.index]:
            return
        at_end = self.index == len(self.items)-1
        self.items = self.items[:self.index+1]
        if group is not None and group==self.last_group and now-self.last_time<.35 and self.index>0 and at_end:
            self.items[self.index] = copy.deepcopy(profile)
        else:
            self.items.append(copy.deepcopy(profile))
            self.items = self.items[-self.limit:]
            self.index = len(self.items)-1
        self.last_group, self.last_time = group, now

    def undo(self):
        self.index = max(0, self.index-1)
        self.last_group = None
        return self.current

    def redo(self):
        self.index = min(len(self.items)-1, self.index+1)
        self.last_group = None
        return self.current
