"""R70 source-only 3D appearance regression using SELF-GENERATED synthetic art.

Synthetic drawings are programming test fixtures, NOT Factorio references or
substitutes for the original user-supplied 64-frame atlas.
"""
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw
from source_3d_shape_correspondence_r70 import (
    FEATURES,SIZE,region_shape_stats,compare
)

class TestActualOriginal3DAppearanceContract(unittest.TestCase):
    def make_rectangle(self,box,color=(180,130,60,255)):
        image=Image.new("RGBA",SIZE,(0,0,0,0))
        ImageDraw.Draw(image).rectangle(box,fill=color)
        return image

    def test_same_shape_and_color_full_outline_match(self):
        original=self.make_rectangle((42,347,170,425))
        candidate=original.copy()
        s=region_shape_stats(original,candidate,FEATURES["independent_hanging_heat_stained_fins"])
        self.assertEqual(s["silhouette_overlap_iou"],1)
        self.assertEqual(s["source_boundary_coverage_within_2px"],1)
        self.assertEqual(s["mean_absolute_rgb_error_on_mutual_foreground"],0)
        self.assertEqual(s["candidate_shape"]["bbox_local"],s["source_shape"]["bbox_local"])

    def test_reposition_and_wrong_width_actually_reported(self):
        src=self.make_rectangle((47,347,80,418))
        cand=self.make_rectangle((58,347,106,418))
        s=region_shape_stats(src,cand,FEATURES["independent_hanging_heat_stained_fins"])
        self.assertLess(s["silhouette_overlap_iou"],1)
        self.assertNotEqual(s["candidate_shape"]["bbox_local"],s["source_shape"]["bbox_local"])
        self.assertTrue(any(row["signed_candidate_minus_source"]>0
                            for row in s["silhouette_width_by_original_native_y"]))

    def test_material_discrepancy_not_collapsed_to_same_silhouette(self):
        source=self.make_rectangle((99,312,155,335),(220,195,143,255))
        model=self.make_rectangle((99,312,155,335),(70,73,78,255))
        s=region_shape_stats(source,model,FEATURES["center_bespoke_two_ear_bridge"])
        self.assertEqual(s["silhouette_overlap_iou"],1)
        self.assertGreater(s["mean_absolute_rgb_error_on_mutual_foreground"],80)

    def test_source_missing_rejected_no_internet_substitute(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            with self.assertRaises((OSError,FileNotFoundError)):
                compare([root/"original1.png",root/"original2.png"],
                        root/"candidate",root/"private")
        self.assertEqual(len(FEATURES),10)

if __name__=="__main__":
    unittest.main()
