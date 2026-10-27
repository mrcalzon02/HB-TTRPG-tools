"""Source-neutral contract checks, no Blender dependency or copied frames."""
import ast
from pathlib import Path
import unittest

SOURCE=Path(__file__).with_name("vanilla_distal_motion_r18.py")

class ActualSourceR18Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree=ast.parse(SOURCE.read_text(encoding="utf-8"))
        cls.constants={}
        for node in tree.body:
            if isinstance(node,ast.Assign) and len(node.targets)==1:
                key=node.targets[0]
                if isinstance(key,ast.Name) and key.id in (
                    "SAMPLES","SOURCE_RECTS","ANGULAR_TO_OBSERVED","SOURCE_SHA256"
                ):
                    cls.constants[key.id]=ast.literal_eval(node.value)

    def test_actual_source_cyclic_64(self):
        curves=self.constants["SAMPLES"]
        self.assertEqual(set(curves),
            {"port_inner","port_outer","starboard_outer","starboard_inner"})
        self.assertTrue(all(len(v)==64 for v in curves.values()))
        self.assertEqual(self.constants["SOURCE_SHA256"],
            "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791")

    def test_measured_inner_lip_motion_exceeds_outer(self):
        v=self.constants["SAMPLES"]
        self.assertEqual(max(v["port_inner"])-min(v["port_inner"]),17)
        self.assertEqual(max(v["starboard_inner"])-min(v["starboard_inner"]),19)
        self.assertEqual(max(v["port_outer"])-min(v["port_outer"]),3)
        self.assertEqual(max(v["starboard_outer"])-min(v["starboard_outer"]),6)

    def test_four_measured_lower_rois_on_twelve_slot_ring(self):
        mapping=self.constants["ANGULAR_TO_OBSERVED"]
        self.assertEqual(set(mapping),{6,7,8,9})
        self.assertNotIn(0,mapping)
        self.assertNotIn(5,mapping)
        self.assertNotIn(11,mapping)
        self.assertEqual(set(mapping.values()),set(self.constants["SAMPLES"]))

    def test_measured_regions_are_in_lower_nozzle(self):
        rects=self.constants["SOURCE_RECTS"]
        self.assertTrue(all(y0>=475 and y1==542 and x0<x1
                            for x0,y0,x1,y1 in rects.values()))

if __name__=="__main__":unittest.main()
