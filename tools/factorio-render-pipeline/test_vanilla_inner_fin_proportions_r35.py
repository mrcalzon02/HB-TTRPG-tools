"""R35 inner-fin proportional regression, executable without Blender."""
import ast
import math
import unittest
from pathlib import Path

FILENAME=Path(__file__).with_name("vanilla_inner_fin_proportions_r35.py")

def geometry():
    tree=ast.parse(FILENAME.read_text(encoding="utf-8"))
    constants={"ROOT_Y","BELL_CENTRE_Z","BASE_TIP_Y","ROOT_WIDTH_GAIN",
               "TIP_WIDTH_GAIN","AXIAL_LENGTH_GAIN","SOURCE_VISIBLE_UPPER_GROUP_COUNT"}
    nodes=[node for node in tree.body
           if isinstance(node,ast.Assign) and any(
               isinstance(k,ast.Name) and k.id in constants for k in node.targets)
           or isinstance(node,ast.FunctionDef) and node.name=="resize_vertex"]
    context={"math":math}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),
                 str(FILENAME),"exec"),context)
    return context

class R35FinProportions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=geometry()
        cls.text=FILENAME.read_text(encoding="utf-8")

    def test_tips_are_substantially_broader_and_somewhat_longer(self):
        g=self.g
        theta=math.pi*.5
        def pt(y,delta):
            return (1.383*math.cos(theta+delta),y,
                    g["BELL_CENTRE_Z"]+1.383*math.sin(theta+delta))
        for y,half,gain in ((g["ROOT_Y"],.062,g["ROOT_WIDTH_GAIN"]),
                            (g["BASE_TIP_Y"],.121,g["TIP_WIDTH_GAIN"])):
            a=g["resize_vertex"](pt(y,-half),theta)
            b=g["resize_vertex"](pt(y,half),theta)
            aa=math.atan2(a[2]-g["BELL_CENTRE_Z"],a[0])
            bb=math.atan2(b[2]-g["BELL_CENTRE_Z"],b[0])
            self.assertAlmostEqual((bb-aa)/2,half*gain,places=6)
            self.assertAlmostEqual(a[1],b[1],places=6)
        self.assertGreater(g["TIP_WIDTH_GAIN"],1.25)
        self.assertGreater(g["ROOT_WIDTH_GAIN"],1.10)
        self.assertLess(g["ROOT_WIDTH_GAIN"],g["TIP_WIDTH_GAIN"])
        self.assertLess(g["AXIAL_LENGTH_GAIN"],1.16)
        self.assertEqual(g["SOURCE_VISIBLE_UPPER_GROUP_COUNT"],3)
        self.assertAlmostEqual(g["resize_vertex"](pt(g["ROOT_Y"],0),theta)[1],
                               g["ROOT_Y"])
        self.assertAlmostEqual(g["resize_vertex"](pt(g["BASE_TIP_Y"],0),theta)[1],
                               -3.583)

    def test_punched_slots_and_center_spine_are_not_replaced(self):
        for banned in ("primitive_cube_add","primitive_cylinder_add",
                       "mesh.from_pydata","keyframe_insert","shape_key_add"):
            self.assertNotIn(banned,self.text)
        self.assertIn("R21_integral_centerline_ridge",self.text)
        self.assertIn("R35_original_hidden_fin_population_unverified",self.text)
        self.assertIn("fsc_r35_no_outer_cup_edits",self.text)
        self.assertIn("fsc_r35_64_key_animation_preserved_by_pre_r18_order",self.text)

if __name__=="__main__":unittest.main()
