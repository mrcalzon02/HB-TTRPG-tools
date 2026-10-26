"""Motion diagnostic contract tests: generated sprites, no original game art."""
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw
from test_atlas_audit import generate_fixture
from thruster_motion_audit_r14 import (
    analyze_frames, analyze_zip, frame_pair_metrics, regions
)


class FullCycleMotionTests(unittest.TestCase):
    def test_original_style_archive_has_64_including_wrap(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory)/"fake.zip"
            generate_fixture(archive)
            output = Path(directory)/"evidence"
            report = analyze_zip(archive, output)
            self.assertEqual(report["cyclic_transitions"], 64)
            self.assertEqual(len(report["transitions"]), 64)
            self.assertEqual(report["transitions"][-1]["from_frame"], 63)
            self.assertEqual(report["transitions"][-1]["to_frame"], 0)
            self.assertEqual(report["frame_size"], [8, 12])
            self.assertGreater(
                report["regions"]["bell_afterburner"]["total_changed_alpha_pixels"], 0)
            self.assertTrue((output/"thruster_motion_r14.json").is_file())
            self.assertTrue((output/"alpha_motion_frequency_private.png").is_file())
            self.assertTrue((output/"original_body_frames_private.png").is_file())
            self.assertNotIn("raw_original_image", report)

    def test_color_changes_are_not_falsely_called_geometry(self):
        first = Image.new("RGBA", (12, 20), (50, 50, 50, 255))
        second = Image.new("RGBA", (12, 20), (80, 80, 80, 255))
        result, _ = frame_pair_metrics(first, second, regions(20))
        self.assertEqual(result["silhouette_crossing_pixels"], 0)
        self.assertEqual(result["alpha_delta_pixels"], 0)
        self.assertEqual(result["opaque_luminance_delta_pixels"], 240)

    def test_moving_lower_part_not_automatically_upper_motion(self):
        frames = []
        for i in range(64):
            im = Image.new("RGBA", (30, 60), (0, 0, 0, 0))
            draw = ImageDraw.Draw(im)
            draw.rectangle((5, 2, 25, 30), fill=(91, 91, 91, 255))
            draw.rectangle((10+i%3, 51, 12+i%3, 56),
                           fill=(91, 91, 91, 255))
            frames.append(im)
        result = analyze_frames(frames, frames)
        self.assertEqual(
            result["regions"]["upper_housing"]["total_changed_alpha_pixels"], 0)
        self.assertGreater(
            result["regions"]["bell_afterburner"]["total_changed_alpha_pixels"], 0)

    def test_fails_on_missing_frames(self):
        im = Image.new("RGBA", (12, 20))
        with self.assertRaisesRegex(ValueError, "64-frame"):
            analyze_frames([im]*63, [im]*64)


if __name__ == "__main__":
    unittest.main()
