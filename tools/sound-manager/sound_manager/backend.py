"""OS endpoint controls. No shell-built commands or driver registry edits."""
from dataclasses import dataclass
import json
import subprocess
import sys
import time
from .channels import LAYOUTS, device_roles, PULSE_ROLES, PULSE_NAMES

BUS = "simple_sound_manager"

@dataclass
class Device:
    id: str
    name: str
    kind: str
    volume: float = 1
    muted: bool = False
    default: bool = False
    virtual: bool = False
    channels: tuple = ('FL', 'FR')

def command(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=10).strip()

class Backend:
    def __init__(self):
        if sys.platform == "win32":
            # Initialize COM before SoundCard (Qt and pycaw use STA here).
            import comtypes
        import soundcard as sc
        self.sc = sc
        self.windows = sys.platform == "win32"
        self.module = None
        self.format_restore = None
        self.capture_roles = LAYOUTS['Stereo']

    def defaults(self):
        if self.windows:
            from pycaw.pycaw import AudioUtilities
            from pycaw.constants import EDataFlow, ERole
            enumerator = AudioUtilities.GetDeviceEnumerator()
            result = {}
            for kind, flow in (("output", EDataFlow.eRender), ("input", EDataFlow.eCapture)):
                for role in (ERole.eConsole, ERole.eMultimedia, ERole.eCommunications):
                    try:
                        result[f"{kind}:{role.value}"] = enumerator.GetDefaultAudioEndpoint(flow.value, role.value).GetId()
                    except Exception:
                        pass
            return result
        return {"output": command("pactl", "get-default-sink"), "input": command("pactl", "get-default-source")}

    def set_default(self, identifier, kind, role=None):
        if self.windows:
            from pycaw.pycaw import AudioUtilities
            from pycaw.constants import ERole
            roles = (ERole.eConsole, ERole.eMultimedia, ERole.eCommunications) if role is None else (ERole(int(role)),)
            for item in roles:
                AudioUtilities.SetDefaultDevice(identifier, [item])
        else:
            command("pactl", "set-default-sink" if kind == "output" else "set-default-source", identifier)

    def restore_defaults(self, snapshot, bus_id):
        current = self.defaults()
        if self.windows:
            available = [d.id for d in self.sc.all_speakers() if d.id != bus_id]
        else:
            available = [d["name"] for d in json.loads(command("pactl", "--format=json", "list", "sinks")) if d["name"] != bus_id]
        for key, identifier in snapshot.items():
            # Respect a default changed by the user while routing was active.
            if key.startswith("output") and current.get(key) == bus_id:
                if identifier not in available:
                    if not available:
                        raise RuntimeError("Reconnect an output device to restore system audio.")
                    identifier = available[0]
                kind, _, role = key.partition(":")
                self.set_default(identifier, kind, role or None)
        if not self.windows:
            target = self.defaults().get("output")
            if target and target != bus_id:
                self.move_streams(bus_id, target)

    def devices(self):
        defaults = self.defaults()
        result = []
        if self.windows:
            from pycaw.pycaw import AudioUtilities
            endpoints = {d.id: d for d in AudioUtilities.GetAllDevices()}
            for kind, devices in (("output", self.sc.all_speakers()), ("input", self.sc.all_microphones())):
                for d in devices:
                    endpoint = endpoints.get(d.id)
                    volume, muted = 1.0, False
                    if endpoint:
                        control = endpoint.EndpointVolume
                        volume, muted = control.GetMasterVolumeLevelScalar(), bool(control.GetMute())
                    result.append(Device(d.id, d.name, kind, volume, muted,
                                         d.id == defaults.get(f"{kind}:1"),
                                         "vb-audio virtual cable" in d.name.lower(), device_roles(d)))
        else:
            for kind, collection in (("output", "sinks"), ("input", "sources")):
                for d in json.loads(command("pactl", "--format=json", "list", collection)):
                    if kind == "input" and (d.get("monitor_of_sink_name") or d["name"].endswith(".monitor")):
                        continue
                    values = [v.get("value", 65536)/65536 for v in d.get("volume", {}).values()]
                    result.append(Device(d["name"], d.get("description", d["name"]), kind,
                                         min(1, sum(values)/len(values)) if values else 1,
                                         d.get("mute", False), d["name"] == defaults[kind], d["name"] == BUS,
                                         tuple(PULSE_ROLES.get(name, f'AUX{i}') for i, name in enumerate(d.get('channel_map', 'front-left,front-right').split(',')))))
        return result

    def endpoint(self, identifier):
        from pycaw.pycaw import AudioUtilities
        return next(d for d in AudioUtilities.GetAllDevices() if d.id == identifier).EndpointVolume

    def volume(self, device, value):
        value = max(0, min(1, value))
        if self.windows:
            self.endpoint(device.id).SetMasterVolumeLevelScalar(value, None)
        else:
            command("pactl", f"set-{'sink' if device.kind == 'output' else 'source'}-volume", device.id, f"{round(value*100)}%")

    def mute(self, device, value):
        if self.windows:
            self.endpoint(device.id).SetMute(bool(value), None)
        else:
            command("pactl", f"set-{'sink' if device.kind == 'output' else 'source'}-mute", device.id, "1" if value else "0")

    def prepare_bus(self, layout='Stereo'):
        roles = LAYOUTS[layout]
        if self.windows and len(roles)==1:
            roles = LAYOUTS['Stereo']
        self.capture_roles = roles
        if self.windows:
            candidates = [d for d in self.sc.all_speakers() if 'vb-audio virtual cable' in d.name.lower() and ('16ch' in d.name.lower() if len(roles)>2 else 'cable input' in d.name.lower())]
            if not candidates:
                raise RuntimeError("Windows needs VB-CABLE installed once. Click Windows audio setup, install the driver, then restart Windows.")
            bus = candidates[0]
            if device_roles(bus) != roles:
                from .windows_format import configure_cable
                self.format_restore = configure_cable(bus.id, roles)
                time.sleep(.3)
            self.endpoint(bus.id).SetMute(False, None)
            self.endpoint(bus.id).SetMasterVolumeLevelScalar(1, None)
            return bus.id, bus.id
        sinks = json.loads(command("pactl", "--format=json", "list", "sinks"))
        if not any(d["name"] == BUS for d in sinks):
            self.module = command("pactl", "load-module", "module-null-sink", f"sink_name={BUS}",
                                  "rate=48000", f"channels={len(roles)}", 'channel_map='+','.join(PULSE_NAMES[role] for role in roles), "sink_properties=device.description=Simple-Sound-Manager")
        command("pactl", "set-sink-volume", BUS, "100%")
        command("pactl", "set-sink-mute", BUS, "0")
        return BUS, BUS+".monitor"

    def move_streams(self, old, new):
        if self.windows:
            return
        sinks = json.loads(command("pactl", "--format=json", "list", "sinks"))
        index = next((d["index"] for d in sinks if d["name"] == old), None)
        if index is None:
            return
        for stream in json.loads(command("pactl", "--format=json", "list", "sink-inputs")):
            if stream["sink"] == index:
                command("pactl", "move-sink-input", str(stream["index"]), new)

    def release_bus(self):
        if self.windows and self.format_restore:
            from .windows_format import restore_cable
            restore_cable(self.format_restore)
            self.format_restore = None
        if not self.windows:
            sinks = json.loads(command("pactl", "--format=json", "list", "sinks"))
            bus = next((d for d in sinks if d["name"] == BUS), None)
            # Resolve its current owner: module IDs can change after a restart.
            if bus and bus.get("owner_module") is not None:
                command("pactl", "unload-module", str(bus["owner_module"]))
            self.module = None
