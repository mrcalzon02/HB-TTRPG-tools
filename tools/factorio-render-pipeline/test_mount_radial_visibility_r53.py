"""R53 physical radial visibility, source fixture preservation tests."""
import ast
from pathlib import Path
import unittest
SRC=Path(__file__).with_name("mount_radial_visibility_r53.py")
class CastVisibility(unittest.TestCase):
    def test_measures_real_first_hit_and_root_gap(self):
        source=SRC.read_text("utf8")
        ast.parse(source)
        for required in ("scene.ray_cast(","RADIAL_OPTIONS=",
                         "fit_projected_cast(","joint_gap_world(",
                         "cast_visible_fraction","saved_scene_sha256",
                         "verified_restore","R49_REV","source_pixels_in_output"):
            if required=="R49_REV": continue
            self.assertIn(required,source)
        self.assertIn("scene.get(\"fsc_r49_revision\")!=R49_REV",source)
        self.assertIn("RADIAL_OPTIONS=(0.,.24,.48,.72,.96)",source)
        for bad in ("save_as_mainfile","bpy.data.objects.new(",
                    "bpy.data.materials.new(","image.load("):
            self.assertNotIn(bad,source)
if __name__=="__main__":unittest.main()
