"""R61 specifically corrects actual R60 original shingle occlusion direction."""
import ast,unittest
from pathlib import Path
F=Path(__file__).with_name("inward_refractory_shingles_r61.py")
class InwardSourceTiles(unittest.TestCase):
    def test_only_original_reversible_tile_meshes(self):
        s=F.read_text("utf8");ast.parse(s)
        for required in ("PAIRS=((-0.02,-0.02)","shift_tiles(tiles,near,mid)",
                         "original_liner=","actual_first_hits(scene)",
                         "R60_wrong_outward_depth_rejected","original_blend_full_restore",
                         "joint_gap_world(","source_R58_blend_sha256"):
            self.assertIn(required,s)
        for bad in ("save_as_mainfile","bpy.data.objects.new(","bpy.data.meshes.new(",
                    "bpy.data.materials.new(","bpy.data.images.load("):
            self.assertNotIn(bad,s)
if __name__=="__main__":unittest.main()
