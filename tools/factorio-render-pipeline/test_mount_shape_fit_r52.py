"""R52 mount-first, physical 3D cast inverse-projection verification."""
import ast
from pathlib import Path
import unittest
F=Path(__file__).with_name("mount_shape_fit_r52.py")
class SourceCast(unittest.TestCase):
    def test_three_bespoke_targets_are_different(self):
        s=F.read_text()
        ast.parse(s)
        tree=ast.parse(s)
        assignment=next(x for x in tree.body if isinstance(x,ast.Assign)
                        and len(x.targets)==1 and isinstance(x.targets[0],ast.Name)
                        and x.targets[0].id=="MOUNT_TARGETS")
        boxes=ast.literal_eval(assignment.value)
        self.assertEqual(set(boxes),{1,2,3})
        self.assertEqual(len(set(boxes.values())),3)
        self.assertEqual(len({(b[2]-b[0],b[3]-b[1]) for b in boxes.values()}),3)
        self.assertIn("joint_clearance_after",s)
        self.assertIn("world_inv@translated",s)
        self.assertIn("camera.matrix_world.to_quaternion()",s)
        self.assertIn("original_blend_sha256",s)
        self.assertIn("verified_restore",s)
        for forbidden in ("save_as_mainfile","bpy.data.objects.new(","bpy.data.meshes.new(",
                          "bpy.data.materials.new(","bpy.ops.mesh.primitive",
                          "bpy.ops.object.delete("):
            self.assertNotIn(forbidden,s)
if __name__=="__main__":unittest.main()
