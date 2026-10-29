"""R55 real editable candidate, three mounts and exact fin-root contact."""
import ast
import unittest
from pathlib import Path
FILE=Path(__file__).with_name("mounted_fin_candidate_r55.py")
class CastConnected(unittest.TestCase):
    def test_source_geometry_and_persisted_candidate(self):
        src=FILE.read_text("utf8");ast.parse(src)
        for phrase in ("attach_fin_to_cast_nearest_vertex",
                       "R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS",
                       "RIM_RECESS=.14","ROOT_RADIAL_BY_MOUNT={1:.48,2:.72,3:.48}",
                       "original_blend_sha256","baseline_saved_scene_unchanged",
                       "reopened_saved_candidate_verified",
                       "bpy.ops.wm.save_as_mainfile(","joint_gap_world(",
                       "source_integrity(","range(110,121)","fin.data.shape_keys",
                       "three_mounts_connected_candidate.blend"):
            self.assertIn(phrase,src)
        for forbidden in ("bpy.data.images.load(","scene.camera.location=",
                          "obj.hide_render=True","bpy.ops.object.delete("):
            self.assertNotIn(forbidden,src)
    def test_only_three_observed_mounted_fins(self):
        tree=ast.parse(FILE.read_text("utf8"))
        fn=next(x for x in tree.body if isinstance(x,ast.FunctionDef)
                and x.name=="attach_fin_to_cast_nearest_vertex")
        self.assertGreater(len(fn.body),5)
if __name__=="__main__":unittest.main()
