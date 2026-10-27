"""R21 tests reconstruct the fin-only geometry without importing Blender."""
import ast
from collections import Counter
from pathlib import Path
import math
import unittest

SOURCE=Path(__file__).with_name("vanilla_master_fin_r21.py")

def pure_master():
    tree=ast.parse(SOURCE.read_text(encoding="utf-8"))
    names={"STATIONS","LATERAL","RADIAL_THICKNESS","SLOTS"}
    selected=[]
    for node in tree.body:
        if isinstance(node,ast.Assign) and any(
            isinstance(t,ast.Name) and t.id in names for t in node.targets):
            selected.append(node)
        elif isinstance(node,ast.FunctionDef) and node.name in (
            "_point","mesh_data","_heat_rgb"):
            selected.append(node)
    ns={"math":math}
    exec(compile(ast.Module(body=selected,type_ignores=[]),
                 str(SOURCE),"exec"),ns)
    return ns

class MasterFinProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns=pure_master()
        cls.xyz,cls.faces,cls.mats=cls.ns["mesh_data"](math.pi/8)

    def test_slender_sheet_and_spade_profile(self):
        self.assertLessEqual(self.ns["RADIAL_THICKNESS"],.030)
        widths=[row[2] for row in self.ns["STATIONS"]]
        self.assertLess(widths[0],widths[-1])
        self.assertGreater(max(widths),widths[-1])
        self.assertGreater(len(self.xyz),150)
        self.assertGreater(len(self.faces),150)

    def test_punched_slots_are_real_manifold_holes(self):
        holes=self.ns["SLOTS"]
        self.assertEqual(len(holes),6)
        self.assertEqual(set(row for row,col in holes),{2,3,4})
        self.assertEqual(set(col for row,col in holes),{1,8})
        counts=Counter()
        for f in self.faces:
            self.assertEqual(len(f),4)
            self.assertEqual(len(set(f)),4)
            for a,b in zip(f,f[1:]+f[:1]):
                counts[tuple(sorted((a,b)))]+=1
        # Watertight, including inner walls of both side slots.
        self.assertTrue(counts)
        self.assertEqual(set(counts.values()),{2})

    def test_thin_raised_center_spine_is_not_bulk_thickness(self):
        stations=self.ns["STATIONS"]
        coords=self.ns["_point"]
        theta=math.pi/8
        y,r,half=stations[4]
        edge=coords(theta,r,y,1,half,1)
        center=coords(theta,r,y,0,half,1)
        radial=lambda p:math.hypot(p[0],p[2]+.43)
        self.assertGreater(radial(center)-radial(edge),.025)
        self.assertLess(radial(center)-radial(edge),.040)

    def test_blue_purple_is_gradual_material_only(self):
        samples=[self.ns["_heat_rgb"](y,0,.4) for y in
                 (-2.60,-3.05,-3.25,-3.47)]
        self.assertNotEqual(samples[0],samples[-1])
        self.assertGreater(samples[-1][2],samples[-1][0])
        self.assertTrue(all(0<=v<=1 for sample in samples for v in sample))
        code=SOURCE.read_text(encoding="utf-8")
        self.assertNotIn("shape_key_add",code)
        self.assertNotIn("keyframe_insert",code)
        self.assertIn("R21_CLEVIS_TRANSVERSE_PIN_",code)
        self.assertIn("R21_integral_centerline_ridge",code)

if __name__=="__main__":
    unittest.main()
