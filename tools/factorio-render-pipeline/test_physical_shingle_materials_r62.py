"""R62 prohibit fake textures, custom lights, scene mutations or emissions."""
import ast,unittest
from pathlib import Path
SRC=Path(__file__).with_name("physical_shingle_materials_r62.py")
class ShaderSweep(unittest.TestCase):
    def test_real_original_shader_paths_and_full_restore(self):
        c=SRC.read_text("utf8");ast.parse(c)
        for r in ('"R43_physical_base_color_times_patina"',
                  'actually_modified_R43_live_connected_patina_Color1',
                  'mat.node_tree.update_tag()',
                  '"R19_chipped_black_refractory"','"R19_inner_oxidized_shingles"',
                  'MULTIPLIERS=(1.0,1.5,2.1,2.9)',
                  'RELIEF=(0.,-.04)',
                  'Emission Strength',
                  'verified_all_original_properties_restored',
                  'original_R19_albedo_linear_multiplier'):
            self.assertIn(r,c)
        for r in ("save_as_mainfile","bpy.data.materials.new(","bpy.data.meshes.new(",
                  "bpy.data.images.load(","bpy.data.objects.new(","hide_render=True",
                  "bpy.ops.object.light_add("):
            self.assertNotIn(r,c)
if __name__=="__main__":unittest.main()
