import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import numpy as np
from sound_manager.app_mixer import AppMixer
from sound_manager.backend import Device
from sound_manager.hotkeys import parse_key, DesktopHotkeys
from sound_manager.timing import click_train

class EverydayTests(unittest.TestCase):
    def test_sync_clicks_have_consistent_phase_across_blocks_and_bounded_level(self):
        entire=click_train(96000,0)
        split=np.concatenate([click_train(480,i) for i in range(0,96000,480)])
        np.testing.assert_array_equal(entire,split)
        self.assertLessEqual(abs(entire).max(),.08001)
        self.assertGreater(abs(entire[:384]).max(),.07)
        self.assertEqual(abs(entire[384:48000]).max(),0)

    def test_hotkeys_validate_before_replacing_existing_registration(self):
        native=object.__new__(DesktopHotkeys)
        with patch.object(native,'close') as close:
            with self.assertRaises(ValueError):
                native.configure({'mute-outputs':'Ctrl+Alt+P','mute-mics':'Alt+Ctrl+P'})
            close.assert_not_called()
        for key in ('P','Shift+P','Ctrl+F12','Super+A','Ctrl+!'):
            with self.assertRaises(ValueError):
                parse_key(key)

    def linux_mixer(self):
        return AppMixer(SimpleNamespace(windows=False))

    def test_linux_sessions_group_and_native_controls_apply_to_all_streams(self):
        mixer=self.linux_mixer()
        streams=[dict(index=i,sink=2,mute=False,volume={'front-left':{'value':32768}},properties={'application.process.binary':'player','application.name':'Player'}) for i in (10,11)]
        with patch('sound_manager.app_mixer.command',return_value=json.dumps(streams)):
            self.assertEqual(mixer.enumerate()[0]['volume'],.5)
        with patch('sound_manager.app_mixer.command') as command:
            mixer.volume('player',.7)
            mixer.mute('player',True)
            mixer.route('player','headphones')
            self.assertEqual(command.call_count,6)
            command.assert_any_call('pactl','move-sink-input','10','headphones')

    def test_failed_saved_routes_retry_only_when_requested_or_new_stream_appears(self):
        mixer=self.linux_mixer()
        mixer.items={'player':dict(pids=set(),handles=[10])}
        settings=SimpleNamespace(data={'app_routes':{'player':'speaker'}})
        devices=[Device('speaker','Speaker','output')]
        with patch.object(mixer,'route',side_effect=RuntimeError('Unavailable')) as route:
            mixer.saved_routes(settings,None,devices)
            mixer.saved_routes(settings,None,devices)
            self.assertEqual(route.call_count,1)
            self.assertIn('Unavailable',mixer.route_errors['player'])
            mixer.items['player']['handles']=[11]
            mixer.saved_routes(settings,None,devices)
            self.assertEqual(route.call_count,2)
            self.assertEqual(len(mixer.attempted),1)

    def test_manager_destination_waits_for_running_bus_without_native_changes(self):
        mixer=self.linux_mixer()
        mixer.items={'player':dict(pids=set(),handles=[10])}
        settings=SimpleNamespace(data={'app_routes':{'player':'__manager__'}})
        with patch.object(mixer,'route') as route:
            mixer.saved_routes(settings,None,[])
            route.assert_not_called()
            mixer.saved_routes(settings,'manager-bus',[])
            route.assert_called_once_with('player','manager-bus')

    def test_health_reports_capture_failure_and_offline_saved_devices(self):
        from sound_manager.health import report
        settings=SimpleNamespace(data={'outputs':{'gone':{}},'inputs':{}},output=lambda _: {})
        engine=SimpleNamespace(peak=0,error='capture unavailable',workers={},inputs={},test_click_end=0)
        window=SimpleNamespace(settings=settings,engine=engine,devices=[],running=True,mutes=SimpleNamespace(active=lambda _:False))
        text=report(window)
        self.assertIn('Source capture failed: capture unavailable',text)
        self.assertIn('Disconnected',text)
        self.assertIn('not acoustic',text)
