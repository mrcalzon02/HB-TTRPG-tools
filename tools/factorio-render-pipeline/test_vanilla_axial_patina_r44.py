"""Static preflight for physically local R44 axial patina."""
import ast
import unittest
from pathlib import Path
PATH=Path(__file__).with_name("vanilla_axial_patina_r44.py")
class AxialPatina(unittest.TestCase):
    def test_only_original_shingles_and_shader(self):
        source=PATH.read_text(encoding="utf-8")
        ast.parse(source)
        for needle in ('R19_NEAR_MOUTH_TILE_', 'R19_MID_STAGGERED_TILE_',
                       'ShaderNodeTexCoord','ShaderNodeSeparateXYZ',
                       'ShaderNodeMapRange','ShaderNodeMixRGB',
                       'coord.outputs["Generated"]','axis.outputs["Y"]',
                       'fsc_r44_same_R43_original_object_colors'):
            self.assertIn(needle,source)
        for banned in ("bpy.data.objects.new","bpy.data.materials.new",
                       "primitive_cube_add","keyframe_insert","hide_render=True",
                       "camera_add","image.load("):
            self.assertNotIn(banned,source)
    def test_axial_only_and_mid_white_invariance(self):
        import vanilla_axial_patina_r44 as r
        self.assertEqual(r.expected_tint(.64,.0),.64)
        self.assertEqual(r.expected_tint(.64,.50),.64)
        self.assertAlmostEqual(r.expected_tint(.64,.71),.82)
        self.assertEqual(r.expected_tint(.64,.92),1.)
        self.assertEqual(r.expected_tint(.64,1.),1.)
        for fraction in (0.,.50,.71,.92,1.):
            self.assertEqual(r.expected_tint(1.,fraction),1.)
if __name__=="__main__":unittest.main()
