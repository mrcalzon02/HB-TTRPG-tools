"""R56 preserve real connected fins and source assembly under physical sweep."""
import ast
from pathlib import Path
import unittest
SOURCE=Path(__file__).with_name("fin_exposure_r56.py")
class VaneExposure(unittest.TestCase):
    def test_cupped_source_deflection_retains_clamped_root(self):
        s=SOURCE.read_text("utf8");ast.parse(s)
        for expect in ("OFFSETS=(0.,.20,.40,.60,.80)",
                       "row=(v.index%110)//11",
                       "weight=t*t*(3.-2.*t)","root_contact_gaps",
                       "first_hit_fin_visibility","original_vertices",
                       "scene.ray_cast(","source_3D_scene_restored",
                       "R55_mount_castings_and_lugs_unchanged"):
            self.assertIn(expect,s)
        for forbidden in ("save_as_mainfile","bpy.data.meshes.new(",
                          "bpy.data.objects.new(","bpy.data.materials.new(",
                          "image.load("):
            self.assertNotIn(forbidden,s)
if __name__=="__main__":unittest.main()
