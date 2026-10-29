"""R50 six reversible native-screen-free physical geometry hypotheses."""
import ast,math,unittest
from pathlib import Path
FILE=Path(__file__).with_name("fin_mount_geometry_sweep_r50.py")
class Sweep(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=FILE.read_text("utf8")
        ast.parse(cls.source)
    def test_source_mechanical_variants_restore_scene(self):
        for need in ("R49_BESPOKE_CAST_MOUNT_","R11_SUSPENDED_AFTERBURNER_VANE_",
                     "original_mesh_vertices_restored","saved_scene_unmodified",
                     "original_camera_unchanged","CAMERA_SIZE=(264,542)",
                     "scene.frame_set(1)","PRESETS="):
            self.assertIn(need,self.source)
        for forbid in ("bpy.ops.wm.save_as_mainfile","bpy.data.objects.new(",
                       "bpy.data.materials.new(","keyframe_insert(",
                       "camera_add(","light_add(","image.load("):
            self.assertNotIn(forbid,self.source)
    def test_hypotheses_are_distinct(self):
        nodes=ast.parse(self.source)
        variable=next(n for n in nodes.body if isinstance(n,ast.Assign)
                      and n.targets[0].id=="PRESETS")
        entries=ast.literal_eval(variable.value)
        self.assertEqual(len(entries),6)
        self.assertEqual(entries[0][1:],(0.,0.,0.))
        self.assertEqual(len(set(x[1:] for x in entries)),6)
        self.assertTrue(all(entries[i][1]<entries[i-1][1] for i in range(2,6)))
if __name__=="__main__":unittest.main()
