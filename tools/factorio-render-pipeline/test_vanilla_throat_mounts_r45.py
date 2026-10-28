"""R45 source-facing physical aperture and mount QA preflight."""
import ast
import math
import unittest
from pathlib import Path
PATH=Path(__file__).with_name("vanilla_throat_mounts_r45.py")
class ThroatMount(unittest.TestCase):
    def test_existing_source_classes_only(self):
        code=PATH.read_text(encoding="utf8")
        ast.parse(code)
        for needle in ("R11_recessed_internal_pressure_baffle_01",
                       "R15_bellows_end_collar_port_1",
                       "R15_bellows_end_collar_starboard_1",
                       "R11_OPEN_DEEP_REFRACTORY_THROAT",
                       "R45_existing_castellated_baffle",
                       "fsc_r45_original_mount_geometry_not_added"):
            self.assertIn(needle,code)
        for banned in ("bpy.data.objects.new(","bpy.data.materials.new(",
                       "bpy.data.meshes.new(","keyframe_insert(","hide_render=True",
                       "image.load(","camera_add(","light_add("):
            self.assertNotIn(banned,code)
    def test_square_corner_and_collar_alternation(self):
        import vanilla_throat_mounts_r45 as mod
        self.assertGreater(mod.squared_radius_factor(math.pi/4),
                           mod.squared_radius_factor(0.))
        self.assertGreater(mod.squared_radius_factor(0.),1.)
        self.assertGreater(mod.throat_sector_offset(0),mod.throat_sector_offset(1))
        self.assertEqual(mod.throat_sector_offset(0),mod.throat_sector_offset(2))
        self.assertLess(mod.THROAT_ALTERNATING_RELIEF,.06)
        self.assertEqual(mod.SIDES*mod.PROFILE_SAMPLES,320)
if __name__=="__main__":
    unittest.main()
