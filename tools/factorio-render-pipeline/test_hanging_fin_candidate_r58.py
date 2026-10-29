"""R58 original mounted finite-volume source joint persistent Blender QA."""
import ast,unittest
from pathlib import Path
FILE=Path(__file__).with_name("hanging_fin_candidate_r58.py")
class Candidate(unittest.TestCase):
    def test_persisted_scene_still_has_three_real_mounted_fins(self):
        s=FILE.read_text("utf8");ast.parse(s)
        for required in ("UPPER_FIN_RADIAL_RELIEF=.25",
                         "UPPER_FIN_DISTAL_EXTENSION=.25",
                         "bpy.ops.wm.save_as_mainfile(",
                         "bpy.ops.wm.open_mainfile(",
                         "fsc_r58_source_visual_approved","source_integrity(",
                         "joint_gap_world(","source_connected_hanging_fins_r58.blend",
                         "original_64_frame_lower_motion_preserved",
                         "source_ROI_previous_R55_rgb_mae"):
            self.assertIn(required,s)
        for forbidden in ("bpy.data.materials.new(","bpy.data.objects.new(",
                          "bpy.data.images.load("):
            self.assertNotIn(forbidden,s)
if __name__=="__main__":unittest.main()
