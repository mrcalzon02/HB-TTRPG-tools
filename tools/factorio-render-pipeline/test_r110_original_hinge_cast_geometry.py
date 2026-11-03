"""R110 no-Blender regression of existing bespoke hinge casting coordinates.

This is a structural geometry test, not a source-image pixel error test. It
runs the production R49 central-cast geometry and the R110 sculpt operation
through coordinate-compatible Blender test doubles. The real saved/reopened
source rig, two asymmetric R89 cast meshes and native renders are verified
separately on the Blender workflow.
"""
import ast,math,unittest
from pathlib import Path
from types import SimpleNamespace as NS
from test_r108_true_3d_petal_geometry import Point

HERE=Path(__file__).resolve().parent
SOURCE=HERE/"source_individual_hinge_casts_r110.py"
ORIGINAL=HERE/"original_source_3d_hinge_remesh_r89.py"
R49=HERE/"vanilla_bespoke_fin_mounts_r49.py"

def constant(path,name):
    tree=ast.parse(path.read_text(encoding="utf8"),filename=str(path))
    return next(ast.literal_eval(v.value) for v in tree.body
          if isinstance(v,ast.Assign) and any(
              isinstance(t,ast.Name) and t.id==name for t in v.targets))

def build_original_center():
    tree=ast.parse(R49.read_text(encoding="utf8"),filename=str(R49))
    fn=next(x for x in tree.body if isinstance(x,ast.FunctionDef)
            and x.name=="casting_geometry")
    env={"math":math,"MOUNT_STATIONS":constant(R49,"MOUNT_STATIONS"),
         "UPPER_FIN_PROFILES":constant(R49,"UPPER_FIN_PROFILES"),
         "AXIS_Z":-.43}
    exec(compile(ast.Module(body=[fn],type_ignores=[]),str(R49),"exec"),env)
    return env["casting_geometry"](2)

class Mesh:
    def __init__(self,positions,faces):
        self.vertices=[Point(co) for co in positions]
        self.polygons=[NS(area=1.0) for face in faces]
    def update(self):pass
class FakeObject(dict):
    def __init__(self,positions,faces):
        super().__init__()
        self.type="MESH"
        self.name="R49_BESPOKE_CAST_MOUNT_02"
        self.data=Mesh(positions,faces)
        self.data.shape_keys=None

def original_center_form():
    tree=ast.parse(SOURCE.read_text(encoding="utf8"),filename=str(SOURCE))
    fn=next(x for x in tree.body if isinstance(x,ast.FunctionDef)
            and x.name=="reshape_center_saddle")
    ob=FakeObject(*build_original_center())
    collection={"R49_BESPOKE_CAST_MOUNT_02":ob}
    env={"math":math,"CASTS":constant(SOURCE,"CASTS"),
         "bpy":NS(data=NS(objects=collection))}
    exec(compile(ast.Module(body=[fn],type_ignores=[]),str(SOURCE),"exec"),env)
    return ob,env["reshape_center_saddle"]

class DistinctSourceCastingShapeTests(unittest.TestCase):
    def test_original_port_and_right_cast_contours_are_not_mirrored(self):
        port=constant(ORIGINAL,"PORT")
        starboard=constant(ORIGINAL,"STARBOARD")
        profile=constant(SOURCE,"PROFILE")
        for tag,shapes in profile.items():
            with self.subTest(shape=tag):
                self.assertEqual(set(shapes),{1,3})
                for side,outline in ((3,port),(1,starboard)):
                    self.assertEqual(set(shapes[side]),{"upper","heel"})
                    for layer,offsets in shapes[side].items():
                        self.assertEqual(set(offsets),set(range(len(outline[layer]))))
                        self.assertTrue(any(dx or dy for dx,dy in offsets.values()))
                        self.assertLessEqual(max(max(abs(dx),abs(dy))
                            for dx,dy in offsets.values()),11)
                self.assertNotEqual(tuple(shapes[3]["upper"].values()),
                                    tuple(shapes[1]["upper"].values()))

    def test_real_central_saddle_reprofile_changes_middle_not_contacts(self):
        for variant in ("source_shoulder_steps","staggered_lower_heel"):
            with self.subTest(variant=variant):
                obj,reshape=original_center_form()
                old=[tuple(v.co) for v in obj.data.vertices]
                self.assertEqual(len(old),60)
                measurements=reshape(None,1.05,variant)
                self.assertTrue(obj["R110_independently_shaped_central_saddle"])
                self.assertEqual(measurements["real_3d_vertices"],60)
                self.assertGreater(measurements["max_local_vertex_displacement"],.01)
                for skin in range(2):
                    for row in (0,5):
                        for col in range(5):
                            i=skin*30+row*5+col
                            self.assertEqual(tuple(obj.data.vertices[i].co),old[i])
                self.assertTrue(any(tuple(obj.data.vertices[i].co)!=old[i]
                    for skin in range(2) for row in (1,2,3,4)
                    for i in [skin*30+row*5+2]))

if __name__=="__main__":unittest.main()
