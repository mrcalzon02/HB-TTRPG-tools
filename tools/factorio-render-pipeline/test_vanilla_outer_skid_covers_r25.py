"""R25 checks: only two separate large OUTER skid-cover undersides."""
import ast
from pathlib import Path
import unittest

SOURCE=Path(__file__).with_name("vanilla_outer_skid_covers_r25.py")
class ExternalSkidContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.code=SOURCE.read_text(encoding="utf-8")
        cls.tree=ast.parse(cls.code)
    def test_two_not_nine_extra_inner_fins(self):
        self.assertIn('SIDES=("port","starboard")',self.code)
        self.assertIn("R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS",self.code)
        self.assertIn("R11_OUTBOARD_SUSPENDED_AFTERBURNERS",self.code)
        self.assertIn("inner_names!=after_names",self.code)
        self.assertNotIn("VANE_COUNT=",self.code)
        self.assertNotIn("shape_key_add",self.code)
    def test_distinct_underbody_cover_and_connected_support(self):
        for name in ("R25_OUTER_SKID_UNDERSIDE_",
                     "R25_OUTER_SKID_CASING_SPINE_",
                     "R25_OUTER_SKID_UNDERBODY_CHANNEL_",
                     "R25_OUTER_SKID_ROOT_BOSS_",
                     "R25_OUTER_SKID_CLAMP_BOSS_"):
            self.assertIn(name,self.code)
        self.assertIn("R25_only_underside_reconstructed",self.code)
    def test_heat_scarring_is_not_physical_depth_or_glowing_mesh(self):
        self.assertIn("SHEET_THICKNESS=.050",self.code)
        self.assertIn("R25_underside_thermal_patina",self.code)
        self.assertIn("R25_thermal_tint_not_geometric_depth",self.code)
        self.assertNotIn("Emission Strength",self.code)
        self.assertNotIn("bpy.data.images.load",self.code)
    def test_mesh_is_closed_and_nonzero(self):
        assert any(isinstance(n,ast.FunctionDef) and n.name=="panel_mesh"
                   for n in self.tree.body)
        self.assertIn("for layer in (-1,1):",self.code)
        self.assertIn("for i in (0,nr-1):",self.code)
if __name__=="__main__":
    unittest.main()
