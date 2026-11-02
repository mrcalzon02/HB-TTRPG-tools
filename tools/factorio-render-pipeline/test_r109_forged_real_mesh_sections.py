"""Verify R109 reshapes actual R108 Blender-style vertex sections, not pixels.

This fast source-contract test extracts real production geometry functions.
R109's full Blender save/reopen, shader, motion and manifold checks remain in
the separate native Blender workflow.
"""
import ast
import math
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
from test_r108_true_3d_petal_geometry import FormedFin,production_function

SOURCE=Path(__file__).resolve().parent/"source_flared_real_forged_petals_r109.py"

def real_shell_former():
    tree=ast.parse(SOURCE.read_text(encoding="utf-8"),filename=str(SOURCE))
    names=("section_measure","reshape_real_shell")
    methods=[node for node in tree.body if isinstance(node,ast.FunctionDef)
             and node.name in names]
    if len(methods)!=len(names):raise AssertionError("Missing real R109 3D form functions")
    profiles=next(ast.literal_eval(node.value) for node in tree.body
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name)
              and t.id=="ROOT_PROFILE" for t in node.targets))
    env={"math":math,"ROOT_PROFILE":profiles,"NCOL":11,"NROW":9,"NSKIN":99,
         "prior":NS(manifold_edges=lambda mesh:(True,400))}
    exec(compile(ast.Module(body=methods,type_ignores=[]),str(SOURCE),"exec"),env)
    return env["reshape_real_shell"],env["section_measure"],profiles

class RealForgedPetalGeometryTests(unittest.TestCase):
    def test_each_petal_flares_with_bespoke_shoulder_and_real_folds(self):
        form_r108,_=production_function()
        form_r109,sections,profiles=real_shell_former()
        self.assertEqual(set(profiles),set(range(5)))
        self.assertEqual(len(set(profiles.values())),5)
        witnesses=[]
        for i in range(5):
            with self.subTest(real_petal=i):
                obj=FormedFin(i)
                form_r108(obj,i,1.25)
                old=sections(obj.data)
                r=form_r109(obj,i,1.02)
                new=r["actual_cross_sections"]
                self.assertTrue(obj["R109_true_flared_edges"])
                self.assertTrue(obj["R109_flanged_folded_sides"])
                self.assertTrue(obj["R109_unequal_shoulder_cutouts"])
                self.assertEqual(r["real_198_vertices"],198)
                self.assertEqual(len(new),6)
                self.assertGreater(r["max_real_vertex_move"],.015)
                self.assertGreater(new[-1]["full_side_to_side_chord"],
                                   old[-1]["full_side_to_side_chord"]+.008)
                self.assertGreater(new[-2]["raised_side_flange_over_pressed_center"],
                                   old[-2]["raised_side_flange_over_pressed_center"]+.012)
                self.assertGreater(abs(new[0]["unequal_ends_y"][0]-
                                       new[0]["unequal_ends_y"][1]),.007)
                for row in range(9):
                    for col in (0,5,10):
                        a=obj.data.vertices[row*11+col].co
                        b=obj.data.vertices[99+row*11+col].co
                        self.assertAlmostEqual(abs(math.hypot(a.x,a.z+.43)-
                            math.hypot(b.x,b.z+.43)),.024,places=5)
                witnesses.append(tuple(s["full_side_to_side_chord"] for s in new))
        self.assertEqual(len(set(witnesses)),5)

if __name__=="__main__":
    unittest.main()
