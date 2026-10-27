"""R22 verified structural count and angular geometry without Blender."""
import importlib.util
from pathlib import Path
import math
import unittest
MOD=Path(__file__).with_name("vane_layout_r22.py")
spec=importlib.util.spec_from_file_location("r22_layout",MOD)
layout=importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
class RingLayoutTests(unittest.TestCase):
    def test_three_visible_upper_tabs_require_more_than_eight_total(self):
        self.assertEqual(layout.SOURCE_VISIBLE_UPPER_TAB_GROUPS,3)
        self.assertEqual(layout.VANE_COUNT,10)
        self.assertFalse(layout.SOURCE_HIDDEN_TOTAL_VERIFIED)
    def test_uniform_angle_and_half_slot_phase(self):
        angles=[layout.angle(i) for i in range(layout.VANE_COUNT)]
        self.assertAlmostEqual(angles[0],math.pi/10)
        self.assertTrue(all(math.isclose((b-a),math.tau/10)
                 for a,b in zip(angles,angles[1:])))
        self.assertAlmostEqual(angles[-1],19*math.pi/10)
        with self.assertRaises(ValueError):layout.angle(10)
    def test_lower_measured_roi_fin_indices(self):
        # Four measured lower regions map to inner two and outer two.
        self.assertEqual({i for i in range(layout.VANE_COUNT)
                          if math.sin(layout.angle(i))<0},{5,6,7,8,9})
        self.assertEqual({6,7,8,9}.issubset(set(range(layout.VANE_COUNT))),True)
if __name__=="__main__":unittest.main()
