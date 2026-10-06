import json
import os
import sys
import math
import copy
from pathlib import Path

def data_dir():
    if os.environ.get("SOUND_MANAGER_DATA"):
        return Path(os.environ["SOUND_MANAGER_DATA"])
    base = Path(os.environ.get("LOCALAPPDATA", Path.home())) if sys.platform == "win32" else Path(os.environ.get("XDG_CONFIG_HOME", Path.home()/".config"))
    return base / "SimpleSoundManager"

class Settings:
    def __init__(self, path=None):
        self.path = Path(path) if path else data_dir()/"settings.json"
        self.data = {"outputs": {}, "inputs": {}, "restore": None, "auto_start": True, "profiles": {}}
        self.warning = ""
        if self.path.exists():
            try:
                parsed = json.loads(self.path.read_text(encoding="utf-8"))
                if not isinstance(parsed, dict) or not isinstance(parsed.get("outputs", {}), dict):
                    raise ValueError("Invalid settings format")
                self.data.update(parsed)
                for name in ('inputs', 'profiles'):
                    if not isinstance(self.data[name], dict):
                        self.data[name] = {}
            except (ValueError, OSError) as exc:
                self.warning = f"Could not read saved settings: {exc}"

    def output(self, identifier, selected=False):
        item = self.data["outputs"].setdefault(identifier, {})
        if not isinstance(item, dict):
            item = self.data["outputs"][identifier] = {}
        item.setdefault("selected", selected)
        item.setdefault("eq", True)
        gains = item.get("gains", [0]*10)
        if not isinstance(gains, list) or len(gains) != 10:
            gains = [0]*10
        item["gains"] = [float(g) if isinstance(g, (int, float)) and math.isfinite(g) and abs(g) <= 24 else 0 for g in gains]
        for key, low, high in (('preamp', -24, 12), ('balance', -100, 100)):
            value = item.get(key, 0)
            item[key] = float(value) if isinstance(value, (int, float)) and math.isfinite(value) and low <= value <= high else 0
        item.setdefault('protect', True)
        item.setdefault('filters', [])
        item.setdefault('delay_ms', 0)
        item.setdefault('classic_gains', [0]*15)
        item.setdefault('tones', [0, 0, 0])
        item.setdefault('mode', 'Auto')
        return item

    def input(self, identifier):
        item = self.data['inputs'].setdefault(identifier, {})
        if not isinstance(item, dict):
            item = self.data['inputs'][identifier] = {}
        item.setdefault('monitor', False)
        item.setdefault('delay_ms', 0)
        item.setdefault('meter', False)
        defaults = dict(eq=True, gains=[0]*10, classic_gains=[0]*15, tones=[0, 0, 0], preamp=0, balance=0, protect=True, filters=[])
        for key, value in defaults.items():
            item.setdefault(key, value)
        return item

    def device(self, device):
        return self.output(device.id) if device.kind == 'output' else self.input(device.id)

    def preference(self, identifier):
        item = self.data.setdefault('device_preferences', {}).setdefault(identifier, {})
        item.setdefault('alias', '')
        item.setdefault('favorite', False)
        return item

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = self.path.with_suffix(".tmp")
        temp.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
        temp.replace(self.path)

EQ_KEYS = ('eq', 'gains', 'classic_gains', 'tones', 'preamp', 'balance', 'protect', 'filters')

def eq_profile(config):
    return copy.deepcopy({key: config.get(key, {'preamp': 0, 'balance': 0, 'protect': True, 'filters': [], 'classic_gains': [0]*15, 'tones': [0, 0, 0]}.get(key)) for key in EQ_KEYS})

def validate_profile(profile):
    from .dsp import filter_chain
    if not isinstance(profile, dict):
        raise ValueError('Expected an EQ profile object')
    config = dict(eq=True, gains=[0]*10, classic_gains=[0]*15, tones=[0, 0, 0], preamp=0, balance=0, protect=True, filters=[])
    config.update({key: copy.deepcopy(profile[key]) for key in EQ_KEYS if key in profile})
    filter_chain(config)
    for key, low, high in (('preamp', -24, 12), ('balance', -100, 100)):
        if not isinstance(config[key], (int, float)) or not math.isfinite(config[key]) or not low <= config[key] <= high:
            raise ValueError(f'Invalid {key}')
    if not isinstance(config['eq'], bool) or not isinstance(config['protect'], bool):
        raise ValueError('EQ and headroom switches must be true or false')
    return config
