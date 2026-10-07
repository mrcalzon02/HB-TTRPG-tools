"""Validated audio-only scenes. No drivers, recovery records or login settings."""
import copy
import math
from .channels import LAYOUTS
from .settings import eq_profile, validate_profile

def number(value, low, high, label):
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Invalid scene '+label)
    return value

def validate_scene(value):
    if not isinstance(value, dict) or value.get('schema') != 'simple-sound-manager-scene' or type(value.get('version')) is not int or value.get('version') != 1:
        raise ValueError('Expected a Simple Sound Manager audio scene')
    devices = value.get('devices')
    if not isinstance(devices, dict) or len(devices) > 256:
        raise ValueError('Invalid scene device list')
    result = dict(schema=value['schema'], version=1, devices={})
    for identifier, device in devices.items():
        if not isinstance(identifier, str) or not 1 <= len(identifier) <= 1024 or not isinstance(device, dict):
            raise ValueError('Invalid scene device')
        kind, name, config = device.get('kind'), device.get('name'), device.get('config')
        if kind not in ('input', 'output') or not isinstance(name, str) or len(name)>1024 or not isinstance(config, dict):
            raise ValueError('Invalid scene device description')
        audio = validate_profile(config)
        audio['delay_ms'] = number(config.get('delay_ms', 0), 0, 2000, 'device delay')
        flags = ('selected',) if kind == 'output' else ('monitor', 'meter')
        for key in flags:
            audio[key] = config.get(key, False)
            if type(audio[key]) is not bool:
                raise ValueError('Invalid scene '+key)
        if kind == 'output':
            audio['mode'] = config.get('mode', 'Auto')
            if audio['mode'] not in ('Auto', *LAYOUTS):
                raise ValueError('Invalid scene output layout')
        volume, muted = device.get('volume'), device.get('muted')
        if volume is not None:
            number(volume, 0, 1, 'volume')
        if muted is not None and type(muted) is not bool:
            raise ValueError('Invalid scene mute')
        result['devices'][identifier] = dict(name=name, kind=kind, config=audio, volume=volume, muted=muted)
    result['layout'] = value.get('layout', 'Auto')
    if result['layout'] not in ('Auto', *LAYOUTS):
        raise ValueError('Invalid scene system layout')
    result['system_delay_ms'] = number(value.get('system_delay_ms', 0), 0, 2000, 'system delay')
    result['bypass_eq'] = value.get('bypass_eq', False)
    if type(result['bypass_eq']) is not bool:
        raise ValueError('Invalid scene EQ bypass')
    result['fallback_id'] = value.get('fallback_id')
    if result['fallback_id'] is not None and (not isinstance(result['fallback_id'], str) or len(result['fallback_id'])>1024):
        raise ValueError('Invalid scene backup output')
    return result

def capture_scene(settings, devices, mutes=None):
    available = {d.id: d for d in devices if not d.virtual}
    scene = dict(schema='simple-sound-manager-scene', version=1, devices={},
                 layout=settings.data.get('layout', 'Auto'), system_delay_ms=settings.data.get('system_delay_ms', 0),
                 bypass_eq=settings.data.get('bypass_eq', False), fallback_id=settings.data.get('fallback_id'))
    for kind, bucket in (('output', 'outputs'), ('input', 'inputs')):
        identifiers = set(settings.data[bucket]) | {d.id for d in available.values() if d.kind == kind}
        for identifier in identifiers:
            device = available.get(identifier)
            config = settings.output(identifier) if kind == 'output' else settings.input(identifier)
            audio = eq_profile(config)
            audio['delay_ms'] = config.get('delay_ms', 0)
            for key in (('selected', 'mode') if kind == 'output' else ('monitor', 'meter')):
                audio[key] = copy.deepcopy(config[key])
            muted = bool(device.muted) if device else None
            if device and mutes and mutes.active(kind):
                muted = mutes.state[kind]['before'].get(identifier, muted)
            scene['devices'][identifier] = dict(name=device.name if device else identifier, kind=kind,
                                               config=audio, volume=device.volume if device else None, muted=muted)
    return validate_scene(scene)

def apply_scene_settings(settings, scene, restore_inputs=False):
    """Only whitelisted sound fields change; callers apply native endpoint levels."""
    scene = validate_scene(scene)
    for config in settings.data['outputs'].values():
        config['selected'] = False
    for identifier, item in scene['devices'].items():
        target = settings.output(identifier) if item['kind'] == 'output' else settings.input(identifier)
        audio = copy.deepcopy(item['config'])
        if item['kind'] == 'input' and not restore_inputs:
            audio.pop('monitor')
            audio.pop('meter')
        target.update(audio)
    for key in ('layout', 'system_delay_ms', 'bypass_eq', 'fallback_id'):
        settings.data[key] = scene[key]
    return scene
