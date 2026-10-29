"""R51 native saved-camera occlusion and original-mesh restoration contracts."""
import ast
from pathlib import Path
import unittest

FILE=Path(__file__).with_name("mount_occlusion_diagnostic_r51.py")
class MountOcclusion(unittest.TestCase):
    def test_diagnostic_is_noop_on_persisted_scene(self):
        source=FILE.read_text(encoding="utf8")
        ast.parse(source)
        for required in ("world_to_camera_view","scene.ray_cast(",
                         "R49_mount_bounds","candidate_D_mount_bounds",
                         "temporary_AB_hidden_object","verified_restore",
                         "sha256(path.read_bytes())","R50_D_is_visual_hypothesis_not_accepted_asset",
                         "camera_identical_for_both_cases",
                         "upper_nozzle_non_fin_hit_candidates",
                         "from fin_mount_geometry_sweep_r50 import"):
            self.assertIn(required,source)
        for forbidden in ("bpy.ops.wm.save_as_mainfile","bpy.data.meshes.new(",
                          "bpy.data.objects.new(","bpy.data.materials.new(",
                          "keyframe_insert(","bpy.ops.object.delete(",
                          "source_image", "image.load("):
            self.assertNotIn(forbidden,source)
    def test_camera_measurements_and_unique_mounts(self):
        code=FILE.read_text(encoding="utf8")
        self.assertIn("NATIVE=(264,542)",code)
        self.assertIn("for i in MAIN",code)
        self.assertIn("for i in UPPER",code)
        self.assertIn("occluder.hide_render=hide_before",code)
        self.assertIn("vertex.co=original",code)
if __name__=="__main__":unittest.main()
