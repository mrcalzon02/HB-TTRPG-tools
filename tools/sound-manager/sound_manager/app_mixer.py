"""Per-app native volume/mute and persisted destination preferences."""
import json
import os
from .backend import command

class AppMixer:
    def __init__(self, backend):
        self.backend=backend
        self.items={}
        self.route_errors={}
        self.attempted=set()
        self.enumeration_errors=[]

    def enumerate(self):
        groups={}
        self.enumeration_errors=[]
        if self.backend.windows:
            from pycaw.utils import AudioUtilities, AudioSession
            from pycaw.api.audiopolicy import IAudioSessionControl2
            from pycaw.api.mmdeviceapi import IMMEndpoint
            for endpoint in AudioUtilities.GetAllDevices():
                try:
                    if endpoint.state.value!=1:
                        continue
                    if endpoint._dev.QueryInterface(IMMEndpoint).GetDataFlow()!=0:
                        continue
                    enumerator=endpoint.AudioSessionManager.GetSessionEnumerator()
                    for index in range(enumerator.GetCount()):
                        session=AudioSession(enumerator.GetSession(index).QueryInterface(IAudioSessionControl2))
                        if session.ProcessId==os.getpid() or session.State==2:
                            continue
                        process=session.Process
                        if process and process.name().casefold()=='simplesoundmanager.exe':
                            continue
                        key=process.exe().casefold() if process else '__system_sounds__'
                        name=process.name() if process else 'System sounds'
                        item=groups.setdefault(key,dict(key=key,name=name,handles=[],pids=set(),volume=0,muted=True,outputs=set()))
                        item['handles'].append(session.SimpleAudioVolume)
                        if session.ProcessId:
                            item['pids'].add(session.ProcessId)
                        item['outputs'].add(endpoint.FriendlyName)
                except Exception as exc:
                    self.enumeration_errors.append(f'{endpoint.FriendlyName}: {exc}')
                    continue
            for item in groups.values():
                item['volume']=sum(h.GetMasterVolume() for h in item['handles'])/len(item['handles'])
                item['muted']=all(bool(h.GetMute()) for h in item['handles'])
        else:
            for stream in json.loads(command('pactl','--format=json','list','sink-inputs')):
                props=stream.get('properties',{})
                if str(props.get('application.process.id'))==str(os.getpid()):
                    continue
                key=props.get('application.process.binary') or props.get('application.name') or 'stream-'+str(stream['index'])
                item=groups.setdefault(key,dict(key=key,name=props.get('application.name',key),handles=[],pids=set(),volume=0,muted=True,outputs=set()))
                values=[v.get('value',65536)/65536 for v in stream.get('volume',{}).values()]
                item['handles'].append(stream['index'])
                item['volume'] += min(1,sum(values)/len(values)) if values else 1
                item['muted'] &= bool(stream.get('mute',False))
                item['outputs'].add(str(stream['sink']))
            for item in groups.values():
                item['volume'] /= len(item['handles'])
        self.items=groups
        return list(groups.values())

    def volume(self,key,value):
        item=self.items[key]
        for handle in item['handles']:
            if self.backend.windows:
                handle.SetMasterVolume(max(0,min(1,value)),None)
            else:
                command('pactl','set-sink-input-volume',str(handle),f'{round(max(0,min(1,value))*100)}%')

    def mute(self,key,value):
        for handle in self.items[key]['handles']:
            if self.backend.windows:
                handle.SetMute(bool(value),None)
            else:
                command('pactl','set-sink-input-mute',str(handle),'1' if value else '0')

    def route(self,key,target):
        item=self.items[key]
        if self.backend.windows:
            if not item['pids']:
                raise RuntimeError('System sounds has no app process to route')
            import psutil
            pids=set(item['pids'])
            for process in psutil.process_iter(['pid','exe']):
                if process.info['exe'] and process.info['exe'].casefold()==key:
                    pids.add(process.info['pid'])
            from .app_routing import WindowsAppRouting
            policy=WindowsAppRouting()
            try:
                for pid in pids:
                    policy.set(pid,target)
            finally:
                policy.close()
        else:
            target=target or command('pactl','get-default-sink')
            for handle in item['handles']:
                command('pactl','move-sink-input',str(handle),target)

    def saved_routes(self, settings, bus, devices):
        available={d.id for d in devices if d.kind=='output'}
        if bus:
            available.add(bus)
        for key,item in self.items.items():
            if key not in settings.data.get('app_routes',{}):
                continue
            saved=settings.data['app_routes'][key]
            target=bus if saved=='__manager__' else saved
            token=(key,tuple(sorted(item['pids'] if self.backend.windows else item['handles'])),target)
            if token in self.attempted:
                continue
            if saved=='__manager__' and not bus or target is not None and target not in available:
                self.route_errors[key]='Saved destination is unavailable'
                continue
            self.attempted.add(token)
            try:
                self.route(key,target)
                self.route_errors.pop(key,None)
            except Exception as exc:
                self.route_errors[key]=str(exc)
        # Bound history to live sessions; exited processes cannot grow it forever.
        live=set(self.items)
        self.attempted={token for token in self.attempted if token[0] in live}
        self.route_errors={key:value for key,value in self.route_errors.items() if key in live}
