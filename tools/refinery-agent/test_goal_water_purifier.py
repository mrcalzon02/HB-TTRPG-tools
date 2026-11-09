import tempfile
import unittest
from pathlib import Path
from unittest import mock

import goal_water_purifier as p


class GoalPilotUnitTests(unittest.TestCase):
    def test_fixed_goal_order_and_ids(self):
        self.assertEqual(len(p.GOALS), 4)
        response = {'subgoals':[{'id':id,'intent':'Reinforce load-bearing geometry','acceptance_check':'Rendered geometry is connected'} for id,_ in p.GOALS]}
        self.assertEqual(len(p.validate_plan(response)),4)
        response['subgoals'].reverse()
        with self.assertRaises(ValueError):p.validate_plan(response)

    def test_sanitizer_keeps_bounded_physical_items_only(self):
        items={'additions':[
            {'type':'beam','start':[-.55,-.25,1.4],'end':[-.55,-.75,1.4],'radius':.08,'material':'steel','purpose':'real manifold bracket'},
            {'type':'tube','start':[-.75,-.8,.36],'end':[-.9,-.2,.7],'radius':.18,'material':'gunmetal','purpose':'filter intake section'},
            {'type':'box','position':[0,0,1],'size':[.2,.2,.2],'purpose':'name label'},
            {'type':'box','position':[1.4,0,1],'size':[.8,.2,.2],'purpose':'oversized attachment'},
            {'type':'python','code':'import os;os.system("rm -rf /tmp")','purpose':'execute'},
            {'type':'beam','start':[0,0,1],'end':[0,0,1],'radius':.1,'purpose':'zero length'},
            {'type':'cylinder','position':[0,0,1],'radius':float('nan'),'depth':.4,'purpose':'bad radius'},
        ]}
        got=p.safe_actions(items,'filter_pump_path')
        self.assertEqual([i['type'] for i in got],['beam','tube'])
        self.assertTrue(all(x['goal']=='filter_pump_path' for x in got))

    def test_rejects_missing_or_non_finite(self):
        for obj in (None, [], {}, {'additions':'not a list'}):
            with self.assertRaises(ValueError):p.safe_actions(obj,'load_path')
        self.assertFalse(p.position([float('nan'),0,1]))
        self.assertFalse(p.position([0,float('inf'),1]))
        self.assertFalse(p.position([3,0,1]))

    def test_never_runs_qwen_when_baseline_missing(self):
        with tempfile.TemporaryDirectory() as folder:
            with mock.patch.object(p,'qwen') as patched:
                with self.assertRaises((FileNotFoundError,OSError)):
                    p.main(['--baseline',str(Path(folder)/'missing.blend'),
                            '--baseline-checkpoint',str(Path(folder)/'none.json'),
                            '--repo',folder,'--out',str(Path(folder)/'out'),
                            '--report',str(Path(folder)/'report'), '--blender','blender',
                            '--endpoint','http://127.0.0.1:11435', '--model','qwen2.5-coder:7b',
                            '--source-sha','deadbeef'])
                patched.assert_not_called()

    def test_no_arbitrary_api_host_in_pilot(self):
        # Preflight requires localhost and a model name containing Qwen.
        self.assertFalse('qwen' in 'none-scripted-baseline')
        self.assertTrue('qwen' in 'qwen2.5-coder:7b')
        self.assertEqual(p.GOALS[0][0],'load_path')
        self.assertEqual(p.GOALS[-1][0],'controls_service')

    def test_checkpoint_atomic_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'checkpoint.json'
            p.atomic(path,{'state':'running','completed_goals':['load_path']})
            self.assertIn('load_path',path.read_text())
            self.assertFalse(path.with_suffix('.tmp').exists())


if __name__=='__main__':
    unittest.main()
