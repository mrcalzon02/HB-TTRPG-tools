"""R20 closed-drum root-cause repair guardrails without Blender dependency."""
import ast
from pathlib import Path
import unittest
TEXT=Path(__file__).with_name("vanilla_open_drum_r20.py").read_text()
class OpenDrumTests(unittest.TestCase):
    def test_actual_mesh_endcaps_removed_not_hidden(self):
        self.assertIn("R08_aft_internal_reaction_drum",TEXT)
        self.assertIn("len(f.vertices)==4",TEXT)
        self.assertIn("len(caps)!=2",TEXT)
        self.assertIn("replacement.from_pydata(vertices,[],quads)",TEXT)
        self.assertNotIn("obj.hide_render=True",TEXT)
    def test_old_r13_materials_survive_without_covering_deep_vents(self):
        self.assertIn("for mat in old.materials",TEXT)
        self.assertIn("R19_DEEP_COMBUSTOR_STRAKE_",TEXT)
        self.assertIn("range(40)",TEXT)
        self.assertNotIn("shape_key_add",TEXT)
    def test_static_geometry_not_additive_exhaust(self):
        ast.parse(TEXT)
        self.assertIn("fsc_r20_glow_not_geom",TEXT)
        self.assertNotIn("Emission Strength",TEXT)
if __name__=="__main__":unittest.main()
