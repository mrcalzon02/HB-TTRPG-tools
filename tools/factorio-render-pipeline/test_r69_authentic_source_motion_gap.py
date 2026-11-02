"""R69 regression tests: genuine native-frame motion accounting, synthetic art."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from test_r67_full_native_cycle import TestR67NativeCycle
import r67_full_native_cycle as r67
import r69_authentic_source_motion_gap as r69

class MotionEvidence(unittest.TestCase):
    def prepare(self,root):
        TestR67NativeCycle().create(root)
        r67.assemble(root)

    def test_all_sixty_four_source_indexed_actual_motion_regions(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);self.prepare(root)
            out=root/"r69.json"
            result=r69.analyze(root,out)
            self.assertTrue(out.is_file())
            self.assertEqual(result["total_frames"],64)
            self.assertEqual(result["original_64_transition_changed_pixel_total"],31334)
            self.assertEqual(sum(result["candidate_changed_pixel_counts_by_vertical_band"].values()),
                             result["candidate_64_transition_changed_pixel_total"])
            self.assertGreater(result["candidate_64_transition_changed_pixel_total"],0)
            self.assertFalse(result["original_sprite_pixels_loaded"])
            self.assertFalse(result["visual_art_acceptance"])

    def test_missing_real_indexed_frame_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);self.prepare(root)
            (root/"body-07.png").unlink()
            with self.assertRaisesRegex(RuntimeError,"missing true saved"):
                r69.analyze(root,root/"r69.json")

if __name__=="__main__":unittest.main()
