"""R49 source-visible distinct mounts and fin root reposition tests."""
import ast
import math
import unittest
from pathlib import Path
PATH=Path(__file__).with_name("vanilla_bespoke_fin_mounts_r49.py")
class BespokeRootMounts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src=PATH.read_text(encoding="utf8")
        ast.parse(cls.src)
        import vanilla_bespoke_fin_mounts_r49 as m
        cls.m=m
    def test_five_individually_modeled_upper_roots(self):
        m=self.m
        self.assertEqual(set(m.UPPER_FIN_PROFILES),set(range(5)))
        self.assertEqual(len(set(m.UPPER_FIN_PROFILES.values())),5)
        self.assertTrue(all(p[0]>m.OLD_ROOT_Y+.35 for p in m.UPPER_FIN_PROFILES.values()))
        # A sheet now begins above the source rim while its FREE END stays
        # at R47 depth, creating a longer actual mechanical span.
        theta=math.pi/2
        old_root=(1.74*math.cos(theta),m.OLD_ROOT_Y,
                  m.AXIS_Z+1.74*math.sin(theta))
        old_tip=(1.38*math.cos(theta),-4.447,
                 m.AXIS_Z+1.38*math.sin(theta))
        root=m.reposition_sheet_point(old_root,2,-4.447)
        tip=m.reposition_sheet_point(old_tip,2,-4.447)
        self.assertAlmostEqual(root[1],m.UPPER_FIN_PROFILES[2][0])
        self.assertAlmostEqual(tip[1],-4.447)
        self.assertGreater(root[1]-tip[1],m.OLD_ROOT_Y-(-4.447)+.7)
        with self.assertRaises(ValueError):
            m.reposition_sheet_point(old_root,7,-4.447)
    def test_three_distinct_source_observed_castings(self):
        m=self.m
        self.assertEqual(m.OBSERVED_MOUNTS,(1,2,3))
        self.assertEqual(len(m.MOUNT_STATIONS),3)
        self.assertNotEqual(m.MOUNT_STATIONS[1],m.MOUNT_STATIONS[2])
        self.assertNotEqual(m.MOUNT_STATIONS[2],m.MOUNT_STATIONS[3])
        self.assertEqual([len(m.casting_geometry(i)[0]) for i in (1,2,3)],
                         [50,60,50])
        for i in m.OBSERVED_MOUNTS:
            v,f=m.casting_geometry(i)
            self.assertGreater(len(f),30)
            self.assertGreater(max(x[1] for x in v),
                               m.UPPER_FIN_PROFILES[i][0]+.7)
    def test_no_unobservable_per_fin_pistons(self):
        for forbidden in ("primitive_cube_add","keyframe_insert",
                          "hide_render=True","camera_add(","light_add(",
                          "bpy.data.materials.new(","bpy.data.images.load("):
            self.assertNotIn(forbidden,self.src)
        self.assertIn("fsc_r49_ignores_unverified_hidden_circumferential_mounts",self.src)
if __name__=="__main__":
    unittest.main()
