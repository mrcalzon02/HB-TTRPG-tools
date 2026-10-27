"""R28: measurable underside cup profile; no Blender dependency or source PNGs."""
import ast
from collections import Counter
import math
from pathlib import Path
import unittest

PATH=Path(__file__).with_name("vanilla_underslung_clamshell_r28.py")

def pure_geometry():
    src=ast.parse(PATH.read_text(encoding="utf-8"))
    constants={"STATIONS","CROSS_SECTION","SHEET_THICKNESS"}
    keep=[]
    for node in src.body:
        if isinstance(node,ast.Assign) and any(
                isinstance(t,ast.Name) and t.id in constants
                for t in node.targets):
            keep.append(node)
        if isinstance(node,ast.FunctionDef) and node.name in (
                "shaped_station","mesh_data"):
            keep.append(node)
    ns={"math":math}
    exec(compile(ast.Module(body=keep,type_ignores=[]),str(PATH),"exec"),ns)
    return ns

class R28SourceUndersideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=pure_geometry()
        cls.src=PATH.read_text(encoding="utf-8")

    def test_inner_curved_lip_inside_outer_shroud_not_wings(self):
        st=self.g["STATIONS"]
        self.assertEqual(len(st),8)
        self.assertTrue(all(
            0.9<=inside<outside<=2.10 for _,inside,outside,_,_,_ in st))
        for i in range(1,6):
            row=st[i]
            edge_inner=self.g["shaped_station"](row,0,1,-1)
            edge_outer=self.g["shaped_station"](row,1,1,-1)
            mid=self.g["shaped_station"](row,.5,1,-1)
            self.assertGreater(mid[0],edge_inner[0])
            self.assertLess(mid[0],edge_outer[0])
            # Physically CUPPED, center of UNDERFACE hangs below BOTH lips.
            self.assertLess(mid[2],min(edge_inner[2],edge_outer[2])-.05)

    def test_both_mirrored_undersides_are_manifold(self):
        for sign in (-1,1):
            vertices,faces=self.g["mesh_data"](sign)
            self.assertEqual(len(vertices),2*8*9)
            counts=Counter()
            for f in faces:
                self.assertEqual(len(f),4)
                self.assertEqual(len(set(f)),4)
                for a,b in zip(f,f[1:]+f[:1]):
                    counts[tuple(sorted((a,b)))]+=1
            self.assertEqual(set(counts.values()),{2})
            self.assertLess(max(p[2] for p in vertices),-1.1)
            self.assertLess(min(p[2] for p in vertices),-1.8)
            self.assertGreater(max(abs(p[0]) for p in vertices),1.95)
            self.assertLess(max(abs(p[0]) for p in vertices),2.10)

    def test_shell_shorter_and_more_conformal_than_r26_dangling_panel(self):
        stations=self.g["STATIONS"]
        self.assertGreater(stations[-1][0],-3.95)
        self.assertLessEqual(stations[-1][0],-3.5)
        self.assertLess(self.g["SHEET_THICKNESS"],.05)

    def test_source_only_no_fanciful_mechanisms_or_other_mesh_mutations(self):
        for prohibited in ("primitive_cube_add","primitive_cylinder_add",
                           "keyframe_insert","shape_key_add",
                           "R25_OUTER_SKID_CASING_SPINE_"):
            self.assertNotIn(prohibited,self.src)
        for required in ("R27_underside_support_evidence",
                         "fsc_r28_inner_fin_signatures_preserved",
                         "fsc_r28_no_new_objects",
                         "SOURCE_ARCHIVE_SHA256",
                         "R25_OUTER_SKID_UNDERSIDE_"):
            self.assertIn(required,self.src)

if __name__=="__main__":
    unittest.main()
