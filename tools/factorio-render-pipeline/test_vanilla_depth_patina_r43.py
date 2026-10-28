"""R43 source-local physical material modulation static validation."""
import ast
import unittest
from pathlib import Path
PATH=Path(__file__).with_name("vanilla_depth_patina_r43.py")
class DepthPatina(unittest.TestCase):
    def test_only_original_lower_tiles_are_tinted(self):
        text=PATH.read_text(encoding="utf-8")
        ast.parse(text)
        self.assertIn('f"R19_NEAR_MOUTH_TILE_{n:02d}"',text)
        self.assertIn('f"R19_MID_STAGGERED_TILE_{n:02d}"',text)
        self.assertIn('ShaderNodeObjectInfo',text)
        self.assertIn('ShaderNodeMixRGB',text)
        self.assertIn('blend_type="MULTIPLY"',text)
        self.assertIn('fsc_r43_mid_and_upper_refractory_unchanged',text)
        self.assertIn('fsc_r43_unmodified_R13_shared_shader',text)
        for banned in ("bpy.data.objects.new","bpy.data.materials.new",
                       "primitive_cube_add","keyframe_insert","image.load(",
                       "Emission Strength\"].default_value=1"):
            self.assertNotIn(banned,text)
    def test_source_derived_luma_and_physical_tint_bounds(self):
        tree=ast.parse(PATH.read_text(encoding="utf-8"))
        ns={}
        constants={"ORIGINAL_LOWER_LUMA","R42_LOWER_LUMA","NEAR_OBJECT_TINT","TILE_COUNT"}
        body=[n for n in tree.body if isinstance(n,ast.Assign) and any(
            getattr(t,"id",None) in constants for t in n.targets)]
        exec(compile(ast.Module(body=body,type_ignores=[]),str(PATH),"exec"),ns)
        self.assertLess(ns["ORIGINAL_LOWER_LUMA"],ns["R42_LOWER_LUMA"])
        self.assertTrue(.5<ns["NEAR_OBJECT_TINT"]<.9)
        self.assertEqual(ns["TILE_COUNT"],40)
if __name__=="__main__":unittest.main()
