"""R36 original-RGBA body outer contour animation contract without bpy."""
import ast
import math
from pathlib import Path
import unittest

SOURCE=Path(__file__).with_name("vanilla_source_guard_motion_r36.py")

def sample_contract():
    tree=ast.parse(SOURCE.read_text(encoding="utf8"))
    names={"SOURCE_EDGE_SAMPLES","MAX_ABS_SOURCE_DELTA_PX",
           "MODEL_LATERAL_TRAVEL_TILES","WEIGHT_BY_AXIAL_STATION",
           "SAMPLING_Y","ORIGINAL_SHA256"}
    keep=[node for node in tree.body if
          (isinstance(node,ast.Assign) and any(
           isinstance(t,ast.Name) and t.id in names for t in node.targets)) or
          isinstance(node,ast.FunctionDef) and node.name=="normalized_values"]
    ns={}
    exec(compile(ast.Module(body=keep,type_ignores=[]),str(SOURCE),"exec"),ns)
    return ns

class TestOriginalBodyGuardMotion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d=sample_contract()
        cls.source=SOURCE.read_text(encoding="utf8")

    def test_real_source_frames_and_independent_mirrored_outline(self):
        samples=self.d["SOURCE_EDGE_SAMPLES"]
        self.assertEqual(set(samples),{"port","starboard"})
        self.assertEqual(self.d["SAMPLING_Y"],(405,475))
        self.assertEqual(self.d["ORIGINAL_SHA256"],
            "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791")
        for side,values in samples.items():
            self.assertEqual(len(values),64)
            self.assertGreaterEqual(len(set(values)),5)
            self.assertEqual(self.d["normalized_values"](values)[0],0)
            self.assertEqual(max(abs(x) for x in self.d["normalized_values"](values)),1)
            if side=="port":
                self.assertEqual((values[0],min(values),max(values)),(5,2,7))
            else:
                self.assertEqual((values[0],min(values),max(values)),(252,250,255))
        self.assertNotEqual(samples["port"],samples["starboard"])

    def test_fixed_roots_cupped_shape_and_no_hidden_mechanisms(self):
        weights=self.d["WEIGHT_BY_AXIAL_STATION"]
        self.assertEqual(len(weights),8)
        self.assertEqual(weights[:2],(0.,0.))
        self.assertTrue(all(a<=b for a,b in zip(weights,weights[1:])))
        self.assertGreater(weights[-1],.9)
        self.assertLess(self.d["MODEL_LATERAL_TRAVEL_TILES"],.06)
        for unsupported in ("primitive_cube_add","primitive_cylinder_add",
                            "primitive_uv_sphere_add","objects.new(",
                            "keyframe_insert(data_path=\"location\""):
            self.assertNotIn(unsupported,self.source)
        for required in ("shape_key_add(","R36_no_pivot_or_actuator_inferred",
                         "fsc_r36_keeps_r35_1_inner_fin_proportions",
                         "R36_original_64_edge_samples"):
            self.assertIn(required,self.source)

    def test_source_64_frames_required(self):
        with self.assertRaisesRegex(ValueError,"64 original"):
            self.d["normalized_values"]((0,)*63)
        with self.assertRaisesRegex(ValueError,"envelope"):
            self.d["normalized_values"]((0,)*63+(9,))

if __name__=="__main__":
    unittest.main()
