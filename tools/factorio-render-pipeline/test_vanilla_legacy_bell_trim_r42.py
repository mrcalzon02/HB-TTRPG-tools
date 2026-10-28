"""R42 source-root geometry/procedure tests, no Blender needed."""
import ast
import unittest
from pathlib import Path
FILE=Path(__file__).with_name("vanilla_legacy_bell_trim_r42.py")
def pure():
    tree=ast.parse(FILE.read_text(encoding="utf-8"))
    names={"SEGMENTS","ORIGINAL_RINGS","EXTERIOR_RINGS",
           "ORIGINAL_FACES","EXTERIOR_FACES","OLD_FIRST_HIT","OLD_RAYS"}
    body=[x for x in tree.body if
          (isinstance(x,ast.Assign) and any(
              getattr(t,"id",None) in names for t in x.targets))
          or isinstance(x,ast.FunctionDef) and x.name=="retained_quads"]
    ns={}
    exec(compile(ast.Module(body=body,type_ignores=[]),str(FILE),"exec"),ns)
    return ns
class BellReturnCorrection(unittest.TestCase):
    def test_preserves_only_original_8_ring_exterior(self):
        d=pure()
        quads=[(r*40+i,r*40+(i+1)%40,(r+1)*40+(i+1)%40,(r+1)*40+i)
               for r in range(11) for i in range(40)]
        self.assertEqual(d["retained_quads"](quads),quads[:280])
        self.assertEqual(d["ORIGINAL_RINGS"]-d["EXTERIOR_RINGS"],4)
        self.assertGreater(d["OLD_FIRST_HIT"]/d["OLD_RAYS"],.8)
    def test_actual_mesh_replacement_not_appearance_hide(self):
        s=FILE.read_text(encoding="utf-8")
        for bad in ("hide_render=True","hide_viewport=True","Emission Strength",
                    "bpy.data.objects.remove(","bpy.ops.object.delete",
                    "keyframe_insert","source_atlas"):
            self.assertNotIn(bad,s)
        self.assertIn("new.from_pydata(vertices,[],faces)",s)
        self.assertIn("R13_oxidized_rough_nozzle_shell",s)
if __name__=="__main__":unittest.main()
