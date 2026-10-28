"""R39 real radial grooves, open-end invariants and preserved source refs."""
import ast
from pathlib import Path
import math
import unittest

PATH=Path(__file__).with_name("vanilla_open_liner_flutes_r39.py")
def procedure():
    tree=ast.parse(PATH.read_text(encoding="utf-8"))
    constants={"SIDES","RINGS","AXIS_Z","CHANNEL_DEPTH",
               "AXIAL_PROFILE","FLUTE_COUNT"}
    nodes=[n for n in tree.body if
           isinstance(n,ast.Assign) and any(
               isinstance(t,ast.Name) and t.id in constants for t in n.targets)
           or isinstance(n,ast.FunctionDef) and n.name=="shaped_point"]
    data={"math":math}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(PATH),"exec"),data)
    return data

class OriginalOpenLinerFlutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.g=procedure()
    def test_20_real_longitudinal_channels_not_painted_lines(self):
        p=self.g
        source=(.9,-2.52,p["AXIS_Z"]+.4)
        changed=p["shaped_point"](source,5,0)
        untouched=p["shaped_point"](source,5,1)
        rad=lambda x:math.hypot(x[0],x[2]-p["AXIS_Z"])
        self.assertAlmostEqual(rad(source)-rad(changed),p["CHANNEL_DEPTH"])
        self.assertAlmostEqual(rad(source),rad(untouched))
        self.assertEqual(changed[1],source[1])
        self.assertEqual(p["FLUTE_COUNT"],20)
        self.assertEqual((p["RINGS"],p["SIDES"]),(13,40))

    def test_bore_open_and_mouth_not_changed(self):
        p=self.g
        source=(1.38,-3.27,p["AXIS_Z"])
        for ring in (0,1,10,11,12):
            self.assertEqual(tuple(p["shaped_point"](source,ring,0)),source)
        self.assertEqual(len(p["AXIAL_PROFILE"]),13)
        self.assertLess(p["CHANNEL_DEPTH"],.09)
        self.assertGreater(p["CHANNEL_DEPTH"],.04)
        with self.assertRaises(IndexError):
            p["shaped_point"](source,13,0)

    def test_no_hidden_new_parts_or_shader_stickers(self):
        s=PATH.read_text(encoding="utf-8")
        for forbidden in ("bpy.data.objects.new","bpy.data.meshes.new",
                          "bpy.data.materials.new","primitive_cube_add",
                          "shape_key_add","keyframe_insert","Emission Strength"):
            self.assertNotIn(forbidden,s)
        for marker in ("fsc_r39_original_face_count",
                       "fsc_r39_reused_original_mesh_and_R13_shader",
                       "fsc_r39_no_new_geometry_or_glow"):
            self.assertIn(marker,s)
if __name__=="__main__":unittest.main()
