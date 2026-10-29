"""R54 historical R08 ring physical radial recess contract."""
import ast,unittest
from pathlib import Path
SOURCE=Path(__file__).with_name("rim_clearance_r54.py")
class RimClearance(unittest.TestCase):
    def test_preserve_original_ring_and_mount_geometry(self):
        s=SOURCE.read_text("utf8");ast.parse(s)
        for marker in ("move_original_ring_inward","R08_black_exhaust_pressure_roll.002",
                       "R08_black_exhaust_pressure_roll.003",
                       "per_mount_visibility(scene)","joint_gap_world(",
                       "original_scene_sha256","verified_restore",
                       "RING_INSET=(0.,.14,.28,.42)",
                       "CAST_RADIAL=(.24,.48,.72)"):
            self.assertIn(marker,s)
        for prohibited in ("save_as_mainfile","bpy.data.objects.new(",
                           "bpy.data.materials.new(","image.load("):
            self.assertNotIn(prohibited,s)
if __name__=="__main__":unittest.main()
