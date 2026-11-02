"""Regression: reconstruct real R108 vertex sections without Blender import.

Exercise the production form_real_metal_petal() AST directly with geometric
test doubles representing the existing R107 cut/capped R21 fin mesh. Verify
distinct three-dimensional cross-sections, curved free ends and preserved
two-skin thickness; do not rank rendered pixel similarity as shape quality.
"""
import ast
import math
import unittest
from pathlib import Path
from types import SimpleNamespace as NS

HERE=Path(__file__).resolve().parent
SOURCE=HERE/"source_bespoke_cupped_petals_r108.py"
STATIONS=(
    (-2.45,1.719,.084),(-2.57,1.667,.112),
    (-2.70,1.620,.136),(-2.84,1.566,.149),
    (-2.98,1.509,.150),(-3.13,1.458,.144),
    (-3.29,1.414,.134),(-3.42,1.384,.123),
    (-3.47,1.383,.121),
)
LATERAL=(-1.,-.83,-.61,-.38,-.16,0.,.16,.38,.61,.83,1.)

class Vec3(tuple):
    """Minimal Blender mathutils.Vector-compatible XYZ sequence test double.

    Real Blender vertex.co supports both indexing/iteration AND .x/.y/.z.
    Returning plain tuples produced a test-only AttributeError unrelated to
    the production three-dimensional petal geometry.
    """
    def __new__(cls,xyz):
        return super().__new__(cls,tuple(float(n) for n in xyz))
    @property
    def x(self):return self[0]
    @property
    def y(self):return self[1]
    @property
    def z(self):return self[2]

class Point:
    def __init__(self,xyz):self._co=Vec3(xyz)
    @property
    def co(self):return self._co
    @co.setter
    def co(self,xyz):self._co=Vec3(xyz)
class Mesh:
    def __init__(self,theta):
        self.vertices=[]
        for skin in (-1,1):
            for y,radius,half in STATIONS:
                for u in LATERAL:
                    bead=.027*max(0.,1-abs(u)/.38)
                    r=radius+.0038*(1-abs(u))+bead+skin*.024/2
                    a=theta+u*half
                    self.vertices.append(Point((r*math.cos(a),y,-.43+r*math.sin(a))))
        self.polygons=[NS(area=.25)]
        self.color_attributes={"R21_heat_tint":object()}
        self.materials=[object() for _ in range(4)]
    def update(self):pass

class FormedFin(dict):
    def __init__(self,index):
        super().__init__(R107_actual_proximal_fin_sheet_chopped=True)
        self.data=Mesh(2*math.pi*(index+.5)/10)

def production_function():
    tree=ast.parse(SOURCE.read_text(encoding="utf-8"),filename=str(SOURCE))
    n=[x for x in tree.body if isinstance(x,ast.FunctionDef) and
       x.name in ("form_real_metal_petal","physical_dimensions")]
    if len(n)!=2:raise RuntimeError("R108 physical geometry functions absent")
    p=next(x.value for x in tree.body if isinstance(x,ast.Assign) and
           any(isinstance(t,ast.Name) and t.id=="PROFILES" for t in x.targets))
    profiles=ast.literal_eval(p)
    namespace={"math":math,"PROFILES":profiles,"LATERAL":LATERAL,
               "ROW":11,"ROWD":9,"SKIN":99,
               "base":NS(manifold_edges=lambda mesh:(True,400))}
    exec(compile(ast.Module(body=n,type_ignores=[]),str(SOURCE),"exec"),namespace)
    return namespace["form_real_metal_petal"],profiles

class True3DFormTests(unittest.TestCase):
    def test_five_distinct_actual_bespoke_3d_petals(self):
        form,profiles=production_function()
        self.assertEqual(set(profiles),set(range(5)))
        self.assertEqual(len(set(profiles.values())),5,"one repeated symmetric master shape")
        shapes=set()
        for index in range(5):
            with self.subTest(petal=index):
                fin=FormedFin(index)
                original=[v.co for v in fin.data.vertices]
                result=form(fin,index,1.25)
                self.assertTrue(fin["R108_real_cupped_shell"])
                self.assertTrue(fin["R108_real_rolled_free_edge"])
                self.assertGreater(result["max_actual_vertex_displacement_m"],.008)
                self.assertEqual(len(fin.data.vertices),198)
                self.assertEqual(len(fin.data.materials),4)
                sections=result["actual_3d_sections"]
                self.assertEqual(len(sections),5)
                # The centre spine/side curl form an actual 3D radial cup.
                middle=sections[2]
                self.assertGreater(middle["edge_to_center_radial_cup_m"],0.015)
                # Both skins must still have finite radial thickness.
                for row in range(9):
                    for col in (0,5,10):
                        a=fin.data.vertices[row*11+col].co
                        b=fin.data.vertices[99+row*11+col].co
                        ar=math.hypot(a[0],a[2]+.43)
                        br=math.hypot(b[0],b[2]+.43)
                        self.assertAlmostEqual(abs(br-ar),.024,places=5)
                # A geometrically scalloped toe, not a perfectly straight chop.
                toe=sections[-1]
                self.assertGreater(toe["left_end_y"]-toe["center_forward_y"],.025)
                self.assertGreater(toe["right_end_y"]-toe["center_forward_y"],.025)
                self.assertTrue(any(math.dist(a,b)>.008 for a,b in zip(
                    original,[v.co for v in fin.data.vertices])))
                shapes.add(tuple((s["actual_chord_m"],
                    s["edge_to_center_radial_cup_m"]) for s in sections))
        self.assertEqual(len(shapes),5)

if __name__=="__main__":
    unittest.main()
