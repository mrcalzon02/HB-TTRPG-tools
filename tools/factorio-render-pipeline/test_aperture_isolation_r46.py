"""R46 source-calibrated aperture isolation must remain reversible."""
import ast
import unittest
from pathlib import Path
FILE=Path(__file__).with_name("aperture_isolation_r46.py")
class ApertureIsolation(unittest.TestCase):
    def test_reversible_real_blender_saved_scene(self):
        src=FILE.read_text(encoding="utf-8")
        ast.parse(src)
        for required in ("source_visibility_restored","camera_preserved",
                         "baffle-hidden.png","baffle-alone.png","complete.png",
                         "R11_recessed_internal_pressure_baffle_01",
                         "scene.render.resolution_x,scene.render.resolution_y=SIZE"):
            self.assertIn(required,src)
        for forbidden in ("bpy.ops.wm.save_as_mainfile","bpy.data.objects.remove",
                          "bpy.data.objects.new","camera_add(","light_add(","image.save("):
            self.assertNotIn(forbidden,src)
if __name__=="__main__":unittest.main()
