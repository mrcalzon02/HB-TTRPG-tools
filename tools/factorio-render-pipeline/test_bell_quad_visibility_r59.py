"""R59 never delete original R42 exterior or permit optical fakes."""
import ast,unittest
from pathlib import Path
F=Path(__file__).with_name("bell_quad_visibility_r59.py")
class FirstHit(unittest.TestCase):
    def test_original_eight_ring_quad_mapping(self):
        c=F.read_text("utf8")
        ast.parse(c)
        for keyword in ("SHELL=\"vanilla_reference_bell_bronzed_rolled_bell\"",
                        "CONTOUR_SHIFTS=","EXTERIOR_RINGS=8","SEGMENTS=40",
                        "bell_ring_pair_first_hits","scene.ray_cast(",
                        "real_contour_cases","verified_original_scene_unchanged",
                        "save_as_mainfile"): 
            if keyword=="save_as_mainfile":self.assertNotIn(keyword,c)
            else:self.assertIn(keyword,c)
        for no in ("bpy.data.meshes.new(","bpy.data.objects.new(",
                   "bpy.data.materials.new(","image.load("):
            self.assertNotIn(no,c)
if __name__=="__main__":unittest.main()
