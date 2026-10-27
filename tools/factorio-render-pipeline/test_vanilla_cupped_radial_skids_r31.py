"""Source-based geometric regressions for R31 returned clamshell skirts."""
import ast
import math
import unittest
from pathlib import Path

BASE=Path(__file__).with_name("vanilla_beige_radial_skids_r29.py")
NEW=Path(__file__).with_name("vanilla_cupped_radial_skids_r31.py")

def pure_geometry():
    namespace={"math":math}
    def extract(path,names,functions):
        tree=ast.parse(path.read_text(encoding="utf-8"))
        keep=[n for n in tree.body if
              (isinstance(n,ast.Assign) and any(
                  isinstance(t,ast.Name) and t.id in names
                  for t in n.targets)) or
              (isinstance(n,ast.FunctionDef) and n.name in functions)]
        exec(compile(ast.Module(body=keep,type_ignores=[]),
                     str(path),"exec"),namespace)
    extract(BASE,{"STATIONS","CIRCUMFERENCE_SAMPLES","BELLCENTER_Z",
                  "SHEET_THICKNESS","OUTER_LIP_FLARE"},set())
    extract(NEW,{"CUP_RADIAL_BULGE","INNER_RIM_RETURN",
                 "TAIL_INSET","TAIL_FORWARD","TAIL_ROLL"},{"point"})
    return namespace

class R31SourceCups(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=pure_geometry()
        cls.text=NEW.read_text(encoding="utf-8")

    def test_both_covers_have_real_bowl_depth_not_shallow_flat_chord(self):
        g=self.g
        self.assertEqual(len(g["STATIONS"]),8)
        for side in (-1,1):
            for row in (1,2,3,4,5,6,7):
                st=g["STATIONS"][row]
                outer,belly,inner=[
                    g["point"](st,u,side,1,row) for u in (0,.5,1)]
                self.assertLess(
                    belly[2], min(outer[2],inner[2])-.10,
                    "outer/inner edges are above middle of source cupped cover")
                self.assertGreater(abs(outer[0])-abs(inner[0]),.75)
                self.assertTrue(all(q[2]<-1.1 for q in (outer,belly,inner)))
                self.assertEqual(outer[1],inner[1])

    def test_shorter_returned_rear_end_shaped_under_nozzle(self):
        g=self.g
        last=g["point"](g["STATIONS"][-1],.5,1,1,7)
        prior=g["point"](g["STATIONS"][-2],.5,1,1,6)
        self.assertGreater(last[1],-3.5)
        self.assertLess(last[1],prior[1])
        self.assertGreater(g["TAIL_ROLL"][-1],g["TAIL_ROLL"][-2])
        self.assertGreater(g["TAIL_INSET"][-1],g["TAIL_INSET"][-2])

    def test_mirrored_material_and_original_animation_separate(self):
        g=self.g
        for row in range(8):
            for u in g["CIRCUMFERENCE_SAMPLES"]:
                a=g["point"](g["STATIONS"][row],u,-1,1,row)
                b=g["point"](g["STATIONS"][row],u,1,1,row)
                self.assertAlmostEqual(a[0],-b[0])
                self.assertAlmostEqual(a[1],b[1])
                self.assertAlmostEqual(a[2],b[2])
        for forbidden in ("primitive_cube_add","primitive_cylinder_add",
                          "keyframe_insert","shape_key_add","heat_patina"):
            self.assertNotIn(forbidden,self.text)
        self.assertIn("fsc_r31_preserves_r18_64_frame_fin_motion",self.text)
        self.assertIn("R25_OUTER_SKID_UNDERSIDE_",self.text)
        self.assertIn("R31_beige_material_preserved",self.text)
if __name__=="__main__":
    unittest.main()
