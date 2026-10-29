"""R48 original-geometry source contract before Blender rendering."""
import ast,math,unittest
from pathlib import Path
PATH=Path(__file__).with_name("vanilla_broader_fins_rearward_collar_r48.py")
class TestBroadTabs(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s=PATH.read_text("utf8")
        ast.parse(cls.s)
        import vanilla_broader_fins_rearward_collar_r48 as m
        cls.m=m
    def test_no_fabricated_bell_or_animation(self):
        for needle in (
            "R11_recessed_internal_pressure_baffle_00",
            "R11_OPEN_DEEP_REFRACTORY_THROAT",
            "R21_heat_tint",
            "fsc_r48_original_64_frame_cycle_retained",
            "fsc_r48_no_added_models_materials_cameras_lights_or_effects"):
            self.assertIn(needle,self.s)
        for forbidden in ("bpy.data.objects.new(","bpy.data.materials.new(",
                          "bpy.data.meshes.new(","primitive_cube_add(",
                          "keyframe_insert(","hide_render=True",
                          "camera_add(","light_add(","image.load("):
            self.assertNotIn(forbidden,self.s)
    def test_fin_root_fixed_and_tip_spread_fits_ten_slots(self):
        m=self.m
        self.assertAlmostEqual(m.width_multiplier(0.,2),1.)
        self.assertAlmostEqual(m.width_multiplier(1.,2),1.47)
        self.assertAlmostEqual(m.width_multiplier(1.,4),1.22)
        theta=math.pi/2
        point=lambda y,half:(1.38*math.cos(theta+half),y,
                             -.43+1.38*math.sin(theta+half))
        root=m.widen_existing_point(point(m.FIN_ROOT_Y,.07),theta,2,-4.44)
        self.assertAlmostEqual(root[0],point(m.FIN_ROOT_Y,.07)[0])
        tip=m.widen_existing_point(point(-4.44,.20),theta,2,-4.44)
        self.assertAlmostEqual(tip[1],-4.44)
        self.assertAlmostEqual(
            abs(math.atan2(tip[2]+.43,tip[0])-theta),.20*1.47,places=6)
        self.assertLess(.20*m.MAIN_FIN_TIP_WIDTH_MULTIPLIER,m.MAX_FIN_HALF_ANGLE)
        with self.assertRaises(ValueError):
            m.width_multiplier(1.,8)
    def test_forward_ring_brought_back_not_deleted(self):
        m=self.m
        self.assertLess(m.COLLAR_NEW_Y,m.COLLAR_OLD_Y-.5)
        self.assertTrue(-3.9<m.COLLAR_NEW_Y<-3.3)
        self.assertTrue(1.2<m.COLLAR_NEW_MAJOR_R<1.5)
if __name__=="__main__":unittest.main()
