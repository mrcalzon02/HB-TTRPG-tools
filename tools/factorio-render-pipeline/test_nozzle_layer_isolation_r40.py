"""R40 static contract and image-read tests without Blender dependency."""
import ast
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).parent
SCRIPT=(ROOT/"nozzle_layer_isolation_r40.py").read_text(encoding="utf-8")

class R40LayerTest(unittest.TestCase):
    def test_all_four_layer_isolation_modes_and_restoration(self):
        tree=ast.parse(SCRIPT)
        assignments=[n for n in tree.body if isinstance(n,ast.Assign) and
                     any(getattr(x,"id",None) in {"LINER","DRUM","NAMES"} for x in n.targets)]
        ns={}
        exec(compile(ast.Module(body=assignments,type_ignores=[]),"r40","exec"),ns)
        self.assertEqual(len(ns["NAMES"]),4)
        self.assertIn("R11_OPEN_DEEP_REFRACTORY_THROAT",ns["LINER"])
        self.assertIn("R08_aft_internal_reaction_drum",ns["DRUM"])
        self.assertIn("finally:",SCRIPT)
        self.assertIn("hide_render=flag",SCRIPT)
        self.assertNotIn("bpy.ops.wm.save_as_mainfile",SCRIPT)
        self.assertNotIn("bpy.data.objects.new",SCRIPT)
        self.assertNotIn("bpy.data.materials.new",SCRIPT)
        self.assertIn("scene.camera=camera",SCRIPT)

    def test_report_reads_four_real_rgba_264x542_images(self):
        from nozzle_layer_report_r40 import summarize,NAMES
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d)
            data={"revision":"R40_test","restored_every_original_visibility_flag":True,
                  "rendered_layers":[{"name":name} for name in NAMES]}
            (folder/"layer-manifest.json").write_text(json.dumps(data))
            for i,name in enumerate(NAMES):
                Image.new("RGBA",(264,542),(20+i*15,30,40,255)).save(folder/(name+".png"))
            result=summarize(folder)
            self.assertEqual(len(result["per_layer"]),4)
            self.assertTrue((folder/"four-layer-native-camera-comparison.png").exists())

if __name__=="__main__":unittest.main()
