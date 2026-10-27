"""R33 independently tests the tapered source cupped shell, no bpy required."""
import ast
import math
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def mesh_sampler():
    ns={"math":math}
    for file,variables,fn,save in [
        ("vanilla_beige_radial_skids_r29.py",
         {"STATIONS","CIRCUMFERENCE_SAMPLES","BELLCENTER_Z",
          "SHEET_THICKNESS","OUTER_LIP_FLARE"},None,None),
        ("vanilla_cupped_radial_skids_r31.py",
         {"CUP_RADIAL_BULGE","INNER_RIM_RETURN","TAIL_INSET",
          "TAIL_FORWARD","TAIL_ROLL"},"point","r31_point"),
        ("vanilla_source_tail_profile_r33.py",
         {"AFT_Y_RELIEF","AFT_OUTER_TUCK","AFT_INNER_ANGLE_DEG",
          "BELL_CENTER_Z","AFT_TIP_EDGE_ROUND"},"point","point")]:
        tree=ast.parse((ROOT/file).read_text(encoding="utf-8"))
        keep=[n for n in tree.body
              if (isinstance(n,ast.Assign) and any(
                      isinstance(t,ast.Name) and t.id in variables for t in n.targets))
              or (isinstance(n,ast.FunctionDef) and n.name==fn)]
        exec(compile(ast.Module(body=keep,type_ignores=[]),file,"exec"),ns)
        if save:ns[save]=ns["point"]
    return ns

class SourceTaperR33(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=mesh_sampler()
        cls.text=(ROOT/"vanilla_source_tail_profile_r33.py").read_text()

    def test_source_silhouette_rear_guard_shorter_than_r31(self):
        g=self.g
        for side in (-1,1):
            for row in (5,6,7):
                a=g["point"](g["STATIONS"][row],.5,side,1,row)
                old=g["r31_point"](g["STATIONS"][row],.5,side,1,row)
                self.assertGreater(a[1],old[1])
            self.assertGreater(g["point"](g["STATIONS"][-1],.5,side,1,7)[1],-3.34)

    def test_r33_guard_remains_cupped_both_sides(self):
        g=self.g
        for side in (-1,1):
            for row in range(8):
                station=g["STATIONS"][row]
                l,m,r=[g["point"](station,u,side,1,row)
                       for u in (0,.5,1.)]
                self.assertLess(m[2],min(l[2],r[2])-.10)
                self.assertGreater(abs(l[0])-abs(r[0]),.55 if row==7 else .75)

    def test_curved_not_sliced_square_terminal_face(self):
        g=self.g
        for side in (-1,1):
            st=g["STATIONS"][-1]
            outer=g["point"](st,0.,side,1,7)
            mid=g["point"](st,.5,side,1,7)
            inside=g["point"](st,1.,side,1,7)
            self.assertGreater(outer[1]-mid[1],.04)
            self.assertGreater(inside[1]-mid[1],.04)
            self.assertLess(mid[1],g["point"](g["STATIONS"][-2],.5,side,1,6)[1])

    def test_mirrored_and_source_cad_uncertain(self):
        g=self.g
        for row in range(8):
            for u in g["CIRCUMFERENCE_SAMPLES"]:
                a=g["point"](g["STATIONS"][row],u,-1,1,row)
                b=g["point"](g["STATIONS"][row],u,1,1,row)
                self.assertAlmostEqual(a[0],-b[0])
                self.assertAlmostEqual(a[1],b[1])
                self.assertAlmostEqual(a[2],b[2])
        for absent in ("primitive_cube_add","primitive_cylinder_add",
                       "keyframe_insert","shape_key_add"):
            self.assertNotIn(absent,self.text)
        self.assertIn("fsc_r33_inner_64_frame_motion_preserved",self.text)

if __name__=="__main__":
    unittest.main()
