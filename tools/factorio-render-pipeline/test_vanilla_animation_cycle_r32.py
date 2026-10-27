"""R32 native cycle reporting checks using synthetic PNG data."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw

from vanilla_animation_cycle_report_r32 import validate

class TestNativeCycle(unittest.TestCase):
    def test_full_native_rgba_and_distinct_animation(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            files=[f"body-{i:02d}.png" for i in range(64)]
            for i,n in enumerate(files):
                im=Image.new("RGBA",(264,542),(0,0,0,0))
                draw=ImageDraw.Draw(im)
                draw.rectangle((20+i%16,25,160,500),fill=(150,130,112,255))
                im.save(root/n)
            (root/"cycle-manifest.json").write_text(json.dumps({
                "source_frame_count":64,"candidate_dimensions":[264,542],
                "body_frame_files":files}))
            result=validate(root)
            self.assertEqual(result["rendered_native_frames"],64)
            self.assertGreaterEqual(result["distinct_actual_frame_hashes"],8)
            self.assertTrue((root/"animated-64-body-preview.gif").exists())
            self.assertTrue((root/"eight-source-spaced-body-frames.png").exists())
if __name__=="__main__":
    unittest.main()
