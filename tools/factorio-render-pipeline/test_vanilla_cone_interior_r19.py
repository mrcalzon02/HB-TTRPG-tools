"""R19 validation independent of Blender and proprietary game-source PNGs."""
import ast
from pathlib import Path
import unittest
FILE=Path(__file__).with_name("vanilla_cone_interior_r19.py")
class R19GeometryContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.code=FILE.read_text(encoding="utf-8")
        cls.tree=ast.parse(cls.code)
    def test_interior_heat_scales_come_from_real_open_cone(self):
        values=[ast.literal_eval(n.value) for n in self.tree.body
                if isinstance(n,ast.Assign) and len(n.targets)==1 and
                isinstance(n.targets[0],ast.Name) and n.targets[0].id=="COUNT"]
        self.assertEqual(values,[40])
        for text in ("R19_NEAR_MOUTH_TILE_","R19_MID_STAGGERED_TILE_",
                     "R19_DEEP_COMBUSTOR_STRAKE_","R19_ANNULAR_PRESSURE_RECESS_"):
            self.assertIn(text,self.code)
    def test_keep_deep_throat_open_and_uncapped(self):
        self.assertIn("R11_OPEN_DEEP_REFRACTORY_THROAT",self.code)
        self.assertIn("R11_open_no_endcaps",self.code)
        self.assertNotIn("close_ends=True",self.code)
        self.assertNotIn("primitive_cone_add",self.code)
    def test_only_static_root_geometry_never_replace_r18_keys(self):
        self.assertIn("R16_support_graph",self.code)
        self.assertIn("R19_FIN_ROOT_BACK_RIB_",self.code)
        self.assertNotIn("shape_key_add",self.code)
        self.assertNotIn("keyframe_insert",self.code)
    def test_reference_glow_is_not_baked_geometry(self):
        self.assertNotIn("bpy.data.images.load",self.code)
        self.assertNotIn("thruster-light-1.png",self.code)
        self.assertIn("fsc_r19_glow_layer_policy",self.code)
if __name__=="__main__":
    unittest.main()
