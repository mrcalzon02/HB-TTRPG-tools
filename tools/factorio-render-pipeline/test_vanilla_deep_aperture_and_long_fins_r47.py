"""R47 ratio/physical aperture invariants before Blender scene verification."""
import ast,math,unittest
from pathlib import Path
PATH=Path(__file__).with_name("vanilla_deep_aperture_and_long_fins_r47.py")
class TestSourceAperture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src=PATH.read_text(encoding="utf8")
        ast.parse(cls.src)
        import vanilla_deep_aperture_and_long_fins_r47 as m
        cls.m=m
    def test_source_ratios_and_open_mouth(self):
        m=self.m
        self.assertGreaterEqual(m.UPPER_LENGTH_MULTIPLIER,1.85)
        self.assertLessEqual(m.UPPER_LENGTH_MULTIPLIER,2.1)
        self.assertAlmostEqual(m.deeper_fin_y(m.FIN_ROOT_Y),m.FIN_ROOT_Y)
        self.assertLess(m.deeper_fin_y(-3.4474),-4.3)
        self.assertLess(m.BEVELED_EXTERIOR_LAST_Y,m.ORIGINAL_EXTERIOR_LAST_Y-.35)
        self.assertLess(m.BEVELED_LINER_MOUTH_Y,m.ORIGINAL_LINER_MOUTH_Y-.20)
        self.assertLess(m.BEVELED_LINER_MOUTH_Y,m.BEVELED_LINER_SECOND_Y)
        self.assertEqual(m.deeper_lip_profile(-2.74,4),-2.74)
        self.assertGreater(m.ROLLED_LIP_NEW_CENTER_Y-m.BEVELED_LINER_MOUTH_Y,0.)
        self.assertLess(m.BAFFLE_NEW_CENTER_Y,m.BAFFLE_OLD_CENTER_Y)
    def test_rings_repositioned_not_replaced(self):
        m=self.m
        x,z=m.shift_torus_major(1.52,-.43,1.5,1.42)
        self.assertAlmostEqual(x,1.44,places=5)
        self.assertAlmostEqual(z,-.43)
        for s in ("R11_OPEN_DEEP_REFRACTORY_THROAT",
                  "vanilla_reference_bell_bronzed_rolled_bell",
                  "vanilla_reference_bell_rolled_lip",
                  "R11_recessed_internal_pressure_baffle_01",
                  "fsc_r47_no_new_rings_meshes_cameras_lights_or_effects"):
            self.assertIn(s,self.src)
        for bad in ("bpy.data.objects.new(","bpy.data.meshes.new(",
                    "bpy.data.materials.new(","primitive_cube_add(",
                    "hide_render=True","camera_add(","light_add(",
                    "keyframe_insert(","image.load("):
            self.assertNotIn(bad,self.src)
if __name__=="__main__":unittest.main()
