"""R29: actual circumferential wrap and UNBURNT beige skid material."""
import ast
from collections import Counter
from pathlib import Path
import math
import unittest

SOURCE=Path(__file__).with_name("vanilla_beige_radial_skids_r29.py")
def pure_mesh():
    tree=ast.parse(SOURCE.read_text(encoding="utf-8"))
    keep=[]
    for n in tree.body:
        if isinstance(n,ast.Assign) and any(
            isinstance(t,ast.Name) and t.id in (
                "STATIONS","CIRCUMFERENCE_SAMPLES",
                "SHEET_THICKNESS","BELLCENTER_Z","OUTER_LIP_FLARE")
            for t in n.targets):
            keep.append(n)
        if isinstance(n,ast.FunctionDef) and n.name in ("point","mesh_data"):
            keep.append(n)
    ns={"math":math}
    exec(compile(ast.Module(body=keep,type_ignores=[]),
                 str(SOURCE),"exec"),ns)
    return ns

class R29RadialSkids(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=pure_mesh()
        cls.text=SOURCE.read_text(encoding="utf-8")

    def test_real_circumferential_normal_not_global_level(self):
        for side in (-1,1):
            st=self.g["STATIONS"][3]
            out=self.g["point"](st,0,side,-1)
            mid=self.g["point"](st,.5,side,-1)
            inside=self.g["point"](st,1,side,-1)
            # Real X and Z change together as we round the bell.
            self.assertGreater(abs(out[0]-inside[0]),.60)
            self.assertGreater(abs(out[2]-inside[2]),.60)
            self.assertTrue(min(out[0],inside[0])<mid[0]<max(out[0],inside[0]))
            self.assertTrue(min(out[2],inside[2])<mid[2]<max(out[2],inside[2]))
            r=lambda q: math.hypot(q[0],q[2]-self.g["BELLCENTER_Z"])
            self.assertGreater(r(out),r(mid))
            self.assertGreater(r(mid),r(inside))
            self.assertGreater(abs(out[0]),1.90)
            self.assertLess(abs(inside[0]),.90)

    def test_real_thin_closed_3d_mesh_both_sides(self):
        for side in (-1,1):
            vertices,faces=self.g["mesh_data"](side)
            self.assertEqual(len(vertices),144)
            self.assertEqual(len(faces),142)
            counts=Counter()
            for f in faces:
                self.assertEqual(len(f),4)
                self.assertEqual(len(set(f)),4)
                for a,b in zip(f,f[1:]+f[:1]):
                    counts[tuple(sorted((a,b)))]+=1
            self.assertEqual(set(counts.values()),{2})
            self.assertLess(max(x[2] for x in vertices),-1.1)

    def test_outward_lighting_normals_on_both_beige_outer_skins(self):
        # A mirror through X flips polygon winding. Verify actual 3D
        # face normals for both skins before trusting visible beige hue.
        for side in (-1,1):
            xyz,polys=self.g["mesh_data"](side)
            face=polys[1]  # first OUTER skin face
            a,b,c=[xyz[i] for i in face[:3]]
            ab=[b[i]-a[i] for i in range(3)]
            ac=[c[i]-a[i] for i in range(3)]
            n=[ab[1]*ac[2]-ab[2]*ac[1],
               ab[2]*ac[0]-ab[0]*ac[2],
               ab[0]*ac[1]-ab[1]*ac[0]]
            radial=(a[0],0.,a[2]-self.g["BELLCENTER_Z"])
            self.assertGreater(sum(x*y for x,y in zip(n,radial)),0,
                "Outer beige shell normal points inward on mirrored side")

    def test_both_covers_beige_same_as_attachment_not_burnt(self):
        self.assertIn('SOURCE_MATERIAL_NAME="R16_oxidized_load_bearing_clevis"',self.text)
        self.assertIn("material=ref.copy()",self.text)
        self.assertIn('mat',self.text)
        self.assertIn("R29_no_outer_heat_damage",self.text)
        self.assertIn("R29_beige_weathering_not_thermal_oxide",self.text)
        self.assertNotIn("purple=",self.text)
        self.assertNotIn("blue=",self.text)
        self.assertNotIn("heat_patina",self.text)
        self.assertNotIn("Emission Strength",self.text)

    def test_keep_source_geometry_and_motion_no_new_bits(self):
        self.assertIn("R25_OUTER_SKID_UNDERSIDE_",self.text)
        self.assertIn("R27_underside_support_evidence",self.text)
        self.assertIn("fsc_r29_inner_fins_unchanged",self.text)
        self.assertIn("fsc_r29_no_added_geometry",self.text)
        self.assertNotIn("primitive_cube_add",self.text)
        self.assertNotIn("primitive_cylinder_add",self.text)
        self.assertNotIn("keyframe_insert",self.text)
        self.assertNotIn("shape_key_add",self.text)

if __name__=="__main__":
    unittest.main()
