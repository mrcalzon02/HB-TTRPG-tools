import sys,unittest,json,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from drive_refinery import bounded_additions,ORDER,qwen_refine

class TestDesignLimits(unittest.TestCase):
 def test_seven_order(self):
  self.assertEqual(len(ORDER),7)
  self.assertEqual(ORDER[0],'water-purifier')
 def test_rejects_port_or_screen_text(self):
  x=bounded_additions({'additions':[
   {'type':'pipe','start':[0,0,.5],'end':[1,0,.5]},
   {'type':'box','position':[0,0,1],'size':[.2,.2,.2],'material':'steel','purpose':'label plaque'},
   {'type':'beam','start':[-1,0,1],'end':[0,0,1],'radius':.09,'purpose':'actual support'}
   ]},[3,3])
  self.assertEqual(len(x),1)
  self.assertEqual(x[0]['type'],'beam')
 def test_rejects_outside_and_massive(self):
  x=bounded_additions({'additions':[
   {'type':'box','position':[1.45,0,2],'size':[.4,.4,.3]},
   {'type':'box','position':[0,0,2],'size':[4,4,2]},
   {'type':'box','position':[0,0,2],'size':[.3,.3,.4]}
   ]},[3,3])
  self.assertEqual(len(x),1)
 def test_no_qwen_mode_does_not_fabricate_inference(self):
  with tempfile.TemporaryDirectory() as temp:
   additions,state=qwen_refine('none','none-scripted-baseline',{'name':'Water Purifier','id':'water-purifier'}, {}, [],temp)
   self.assertEqual(additions,[])
   self.assertEqual(state,'unavailable')
   from pathlib import Path
   receipt=json.loads((Path(temp)/'inference_receipt.json').read_text())
   self.assertEqual(receipt['state'],'unavailable')
 def test_rejects_non_json(self):
  with self.assertRaises(ValueError):bounded_additions([1,2],[3,3])

if __name__=='__main__':unittest.main()
