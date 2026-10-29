"""R57 preserves all fin-to-casting source mechanical contact with long hang."""
import ast,unittest
from pathlib import Path
FILE=Path(__file__).with_name("hanging_fin_profile_r57.py")
class HangingFinSource(unittest.TestCase):
    def test_no_radial_curved_arch(self):
        s=FILE.read_text("utf8");ast.parse(s)
        for needed in ("LATERAL=(.12,.25,.38)","AFT_EXTENSION=(.25,.55,.85)",
                       "front=s*s*(3.-2.*s)","new_r=radius+lateral*front",
                       "y-extension*down","mount_joint_gaps_tiles",
                       "source_facing_first_hits","original_3D_candidate_restored",
                       "R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS"):
            self.assertIn(needed,s)
        for forbidden in ("save_as_mainfile","bpy.data.materials.new(",
                          "bpy.data.meshes.new(","hide_render=True",
                          "bpy.data.images.load("):
            self.assertNotIn(forbidden,s)
if __name__=="__main__":unittest.main()
