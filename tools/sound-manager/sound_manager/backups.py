"""Portable, validated setup backups with explicit device remapping."""
import copy
from .scenes import capture_scene, validate_scene
from .settings import validate_profile

MAX_FILE_BYTES = 16*1024*1024
PREFERENCES = dict(auto_start=True, reconnect=True, advanced_visible=False, check_updates=True, scene_restore_inputs=False)

def named_objects(value, validator, limit, label):
    if not isinstance(value, dict) or len(value)>limit:
        raise ValueError('Invalid backup '+label)
    result = {}
    for name, item in value.items():
        if not isinstance(name, str) or not name.strip() or len(name)>256:
            raise ValueError('Invalid backup '+label+' name')
        result[name] = validator(item)
    return result

def identities_for(current, scenes):
    result = {}
    for scene in [current, *scenes.values()]:
        for identifier, device in scene['devices'].items():
            existing = result.get(identifier)
            if existing and existing['kind'] != device['kind']:
                raise ValueError('A saved device ID is used as both input and output')
            if existing is None or existing['name'] == identifier:
                result[identifier] = dict(name=device['name'], kind=device['kind'])
        backup_id = scene['fallback_id']
        if backup_id:
            existing = result.setdefault(backup_id, dict(name=backup_id, kind='output'))
            if existing['kind'] != 'output':
                raise ValueError('Backup output refers to an input device')
    return result

def validate_backup(value):
    if not isinstance(value, dict) or value.get('schema') != 'simple-sound-manager-backup' or type(value.get('version')) is not int or value.get('version') != 1:
        raise ValueError('Expected a Simple Sound Manager setup backup')
    current = validate_scene(value.get('current'))
    scenes = named_objects(value.get('scenes', {}), validate_scene, 64, 'scenes')
    profiles = named_objects(value.get('profiles', {}), validate_profile, 256, 'EQ profiles')
    identities = identities_for(current, scenes)
    if len(identities)>512:
        raise ValueError('Backup exceeds the 512-device limit')
    display = value.get('display', {})
    if not isinstance(display, dict) or any(key not in identities for key in display):
        raise ValueError('Invalid backup display device')
    safe_display = {}
    for identifier, item in display.items():
        if not isinstance(item, dict):
            raise ValueError('Invalid backup device display settings')
        alias, favorite, waveform, view = item.get('alias', ''), item.get('favorite', False), item.get('waveform', True), item.get('eq_view', 'EQ controls')
        if not isinstance(alias, str) or len(alias)>100 or type(favorite) is not bool or type(waveform) is not bool or view not in ('EQ controls', 'Live waveform'):
            raise ValueError('Invalid backup label or waveform preference')
        hidden, order = item.get('hidden',False), item.get('order',100000)
        if type(hidden) is not bool or type(order) is not int or not 0<=order<=100000:
            raise ValueError('Invalid backup visibility or device order')
        safe_display[identifier] = dict(alias=alias, favorite=favorite, waveform=waveform, eq_view=view, hidden=hidden, order=order)
    prefs = value.get('preferences', {})
    if not isinstance(prefs, dict):
        raise ValueError('Invalid backup preferences')
    safe_prefs = {}
    for key, default in PREFERENCES.items():
        safe_prefs[key] = prefs.get(key, default)
        if type(safe_prefs[key]) is not bool:
            raise ValueError('Invalid backup '+key)
    return dict(schema='simple-sound-manager-backup', version=1, current=current, scenes=scenes,
                profiles=profiles, display=safe_display, preferences=safe_prefs)

def capture_backup(settings, devices, mutes=None):
    current = capture_scene(settings, devices, mutes)
    scenes = copy.deepcopy(settings.data.get('scenes', {}))
    profiles = copy.deepcopy(settings.data.get('profiles', {}))
    display = {}
    for identifier, description in identities_for(current, scenes).items():
        config = settings.data['outputs' if description['kind']=='output' else 'inputs'].get(identifier, {})
        pref = settings.data.get('device_preferences', {}).get(identifier, dict(alias='', favorite=False))
        display[identifier] = dict(alias=pref['alias'], favorite=pref['favorite'], waveform=config.get('waveform', True), eq_view=config.get('eq_view', 'EQ controls'), hidden=pref.get('hidden',False), order=pref.get('order',100000))
    return validate_backup(dict(schema='simple-sound-manager-backup', version=1, current=current, scenes=scenes,
                                profiles=profiles, display=display,
                                preferences={key:settings.data.get(key, default) for key, default in PREFERENCES.items()}))

def suggest_mapping(backup, devices):
    backup = validate_backup(backup)
    available = {d.id:d for d in devices if not d.virtual}
    result = {}
    for identifier, item in identities_for(backup['current'], backup['scenes']).items():
        if identifier in available and available[identifier].kind == item['kind']:
            result[identifier] = identifier
        else:
            matches = [d.id for d in available.values() if d.kind==item['kind'] and d.name==item['name']]
            result[identifier] = matches[0] if len(matches)==1 else None
    # Never silently collapse two old devices into one endpoint.
    for target in {v for v in result.values() if v is not None}:
        sources = [key for key, value in result.items() if value==target]
        if len(sources)>1:
            for key in sources:
                if key != target:
                    result[key] = None
    return result

def remap_backup(value, mapping, devices):
    backup = validate_backup(value)
    identities = identities_for(backup['current'], backup['scenes'])
    if not isinstance(mapping, dict) or set(mapping) != set(identities):
        raise ValueError('Choose a mapping for every saved device')
    available = {d.id:d for d in devices if not d.virtual}
    used = set()
    for identifier, target in mapping.items():
        if target is None:
            continue
        if not isinstance(target, str) or (target not in available and target != identifier):
            raise ValueError('Mapping must select current hardware, keep the saved ID, or skip')
        if target in available and available[target].kind != identities[identifier]['kind']:
            raise ValueError('Input/output device mapping types must match')
        if target in used:
            raise ValueError('Two saved devices cannot use the same destination')
        used.add(target)
    def scene_map(scene):
        result = copy.deepcopy(scene)
        result['devices'] = {}
        for identifier, item in scene['devices'].items():
            target = mapping[identifier]
            if target is not None:
                result['devices'][target] = copy.deepcopy(item)
                if target in available:
                    result['devices'][target]['name'] = available[target].name
        result['fallback_id'] = mapping.get(scene['fallback_id']) if scene['fallback_id'] else None
        return validate_scene(result)
    backup['current'] = scene_map(backup['current'])
    backup['scenes'] = {name:scene_map(scene) for name, scene in backup['scenes'].items()}
    backup['display'] = {mapping[key]:copy.deepcopy(item) for key,item in backup['display'].items() if mapping[key] is not None}
    return backup
