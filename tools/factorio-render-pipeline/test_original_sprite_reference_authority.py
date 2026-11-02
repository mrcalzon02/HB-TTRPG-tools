"""Reference-authority regression: only user original 64-frame RGBA sprite pages.

No web images, no generated reference replacements and no cropped Wiki GIF
can enter the Factorio thruster visual calibration pipeline.
"""
import contextlib
import io
import inspect
import tempfile
import unittest
from pathlib import Path

from PIL import Image
import reference_compare_r07 as legacy
import run_calibration
from source_vs_native_capture_r34 import source_rgba_frames

class OriginalSpriteReferenceOnly(unittest.TestCase):
    def test_legacy_r07_no_network_fallback_and_exact_pages_required(self):
        self.assertNotIn("urlopen(",inspect.getsource(legacy))
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                legacy.main(["--candidate","not-a-user-sprite-dir"])
            with self.assertRaises(SystemExit):
                legacy.main(["--source-atlases","missing-1.png","missing-2.png",
                             "--blender-cycle","missing-frames","--output","unused"])

    def test_actual_workflow_never_invokes_wiki_gif_reference(self):
        body=inspect.getsource(run_calibration)
        self.assertNotIn('str(root/"reference_compare_r07.py")',body)
        self.assertIn('str(root/"source_vs_native_capture_r34.py")',body)
        self.assertIn('args.source_atlases is None',body)
        self.assertIn('source_fidelity_review_performed":False',body)

    def test_two_original_rgba_atlases_extract_exact_order(self):
        with tempfile.TemporaryDirectory() as d:
            paths=[]
            for page in (0,1):
                img=Image.new("RGBA",(2112,2168),(0,0,0,0))
                for local in range(32):
                    absolute=page*32+local
                    col=local%8
                    row=local//8
                    img.putpixel((col*264+7,row*542+9),(absolute,200,31,255))
                path=Path(d)/("original-%d.png"%page)
                img.save(path)
                paths.append(path)
            frames,kind,bg=source_rgba_frames(paths)
            self.assertEqual(kind,"original_rgba_atlas")
            self.assertIsNone(bg)
            self.assertEqual(len(frames),64)
            for fid in (0,7,8,31,32,56,63):
                self.assertEqual(frames[fid].size,(264,542))
                self.assertEqual(frames[fid].getpixel((7,9)),(fid,200,31,255))

if __name__=="__main__":unittest.main()
