"""R37 refractory geometry+shaders can be audited without Blender imports."""
import ast
import math
from pathlib import Path
import unittest

SOURCE=Path(__file__).with_name("vanilla_refractory_visibility_r37.py")

def procedure():
    data=ast.parse(SOURCE.read_text(encoding="utf-8"))
    constants={"SOURCE_LUMA_410_455","PRIOR_RENDER_LUMA_410_455",
               "RIDGE_INWARD_TILES","SHEET_ROW_TAPER","DARK_COLOR",
               "AGED_COLOR","STRAKE_COLOR","THROAT_COLOR","INNER_AXIS_Z"}
    nodes=[n for n in data.body if
           (isinstance(n,ast.Assign) and any(
               isinstance(t,ast.Name) and t.id in constants for t in n.targets))
           or isinstance(n,ast.FunctionDef) and n.name=="corrugate"]
    ns={"math":math}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(SOURCE),"exec"),ns)
    return ns

class R37RefractoryVisibility(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=procedure()
        cls.text=SOURCE.read_text(encoding="utf-8")

    def test_real_3d_ridge_sculpt_preserves_bore_and_axial_coordinates(self):
        g=self.g
        p=(1.34,-3.1,-.43)
        c=g["corrugate"](p,g["RIDGE_INWARD_TILES"])
        self.assertLess(math.hypot(c[0],c[2]+.43),1.32)
        self.assertAlmostEqual(c[1],p[1])
        self.assertEqual(len(g["SHEET_ROW_TAPER"]),4)
        self.assertAlmostEqual(g["SHEET_ROW_TAPER"][0],
                               g["SHEET_ROW_TAPER"][-1])
        self.assertGreater(g["RIDGE_INWARD_TILES"],.015)
        self.assertLess(g["RIDGE_INWARD_TILES"],.04)
        with self.assertRaises(ValueError):
            g["corrugate"]((.03,-3,-.43),.001)

    def test_source_contrast_derived_from_actual_rgba_not_glow(self):
        g=self.g
        self.assertGreater(g["SOURCE_LUMA_410_455"],.06)
        self.assertLess(g["PRIOR_RENDER_LUMA_410_455"],.04)
        self.assertGreater(g["SOURCE_LUMA_410_455"]/g["PRIOR_RENDER_LUMA_410_455"],2)
        def light(rgb):
            return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
        self.assertGreater(light(g["AGED_COLOR"]),light(g["DARK_COLOR"]))
        self.assertGreater(light(g["STRAKE_COLOR"]),light(g["DARK_COLOR"]))
        self.assertGreater(light(g["THROAT_COLOR"]),.07)
        for forbidden in ("primitive_cube_add","primitive_cylinder_add",
                          "primitive_uv_sphere_add","bpy.data.objects.new",
                          "keyframe_insert","shape_key_add"):
            self.assertNotIn(forbidden,self.text)
        self.assertIn("fsc_r37_no_original_sprite_texture_or_glow",self.text)
        self.assertIn("fsc_r37_open_bore_unsealed",self.text)
if __name__=="__main__":
    unittest.main()
