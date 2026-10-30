"""R60 strictly restores all R19 physical shingle meshes after depth A/B."""
import ast,unittest
from pathlib import Path
FILE=Path(__file__).with_name("refractory_shingle_depth_r60.py")
class ShingleDepth(unittest.TestCase):
    def test_native_original_3d_mesh_no_rerender_art_cheat(self):
        c=FILE.read_text("utf8");ast.parse(c)
        for required in ("COLLECTION=\"R19_EDITABLE_OPEN_CONE_INTERIOR\"",
                         "R19_NEAR_MOUTH_TILE_","R19_MID_STAGGERED_TILE_",
                         "physical_near_tile_first_hits",
                         "physical_mid_tile_first_hits",
                         "restored_original_geometry",
                         "original_r58_blend_sha256",
                         "ROW_RELIEF=(.88,1.00,1.00,.92)",
                         "joint_gap_world(",
                         "scene.ray_cast("):
            self.assertIn(required,c)
        for forbidden in ("bpy.ops.wm.save_as_mainfile","bpy.data.objects.new(",
                          "bpy.data.meshes.new(","bpy.data.materials.new(",
                          "bpy.data.images.load("):
            self.assertNotIn(forbidden,c)
if __name__=="__main__":unittest.main()
