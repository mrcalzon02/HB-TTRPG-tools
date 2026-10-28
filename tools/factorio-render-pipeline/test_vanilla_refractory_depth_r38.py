"""R38 original interior stratification without Blender dependencies."""
import ast
import math
import unittest
from pathlib import Path

SOURCE=Path(__file__).with_name("vanilla_refractory_depth_r38.py")
CONSTANTS={"AXIS_Z","STRAKE_OLD_END_Y","STRAKE_NEW_END_Y",
           "STRAKE_BEVEL","MID_ROW_INSET","NEAR_RADIAL_RETURN",
           "NEAR_AGED_INDICES","MID_AGED_REMAINDERS","STRAKE_END_INSET"}
FUNCTIONS={"shifted_radius","extended_strake_endpoint"}

def geometry():
    source=ast.parse(SOURCE.read_text(encoding="utf-8"))
    body=[n for n in source.body if
          (isinstance(n,ast.Assign) and any(
              isinstance(a,ast.Name) and a.id in CONSTANTS for a in n.targets))
          or isinstance(n,ast.FunctionDef) and n.name in FUNCTIONS]
    ns={"math":math}
    exec(compile(ast.Module(body=body,type_ignores=[]),str(SOURCE),"exec"),ns)
    return ns

class R38OriginalInterior(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.g=geometry()

    def test_true_radial_not_fake_flat_brightness_patch(self):
        g=self.g
        p=(.8,-2.5,g["AXIS_Z"]+1.2)
        near=g["shifted_radius"](p,g["NEAR_RADIAL_RETURN"])
        mid=g["shifted_radius"](p,-g["MID_ROW_INSET"][-1])
        radial=lambda q:math.hypot(q[0],q[2]-g["AXIS_Z"])
        self.assertGreater(radial(near),radial(p))
        self.assertLess(radial(mid),radial(p))
        self.assertEqual(near[1],p[1])
        self.assertEqual(mid[1],p[1])
        self.assertEqual(len(g["MID_ROW_INSET"]),4)
        self.assertLess(g["MID_ROW_INSET"][-1],.03)
        with self.assertRaises(ValueError):
            g["shifted_radius"]((.1,-2.5,-.43),-.15)

    def test_extends_existing_longitudinal_ribs_not_new_ones(self):
        g=self.g
        self.assertGreater(g["STRAKE_NEW_END_Y"],g["STRAKE_OLD_END_Y"]+.20)
        self.assertLess(g["STRAKE_NEW_END_Y"],-.91)
        self.assertLess(g["STRAKE_BEVEL"],.03)
        new=g["extended_strake_endpoint"](math.pi/4,.20)
        self.assertAlmostEqual(new[1],g["STRAKE_NEW_END_Y"])
        self.assertAlmostEqual(math.hypot(new[0],new[2]+.43),.20)

    def test_materials_reused_but_layer_populations_differ(self):
        g=self.g
        near=len(g["NEAR_AGED_INDICES"])
        mid=sum(i%5 in g["MID_AGED_REMAINDERS"] for i in range(40))
        self.assertEqual((near,mid),(4,16))
        s=SOURCE.read_text(encoding="utf-8")
        for forbidden in ("primitive_cube_add","bpy.data.objects.new",
                          "bpy.data.materials.new","keyframe_insert",
                          "shape_key_add","Emission Strength"):
            self.assertNotIn(forbidden,s)
        for must in ("fsc_r38_no_camera_or_light_changes",
                     "fsc_r38_original_open_bore_and_shared_material",
                     "R19_DEEP_COMBUSTOR_STRAKE_"):
            self.assertIn(must,s)

if __name__=="__main__":unittest.main()
