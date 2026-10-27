"""Synthetic regressions for source-to-3D animation comparison."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
from source_vs_native_capture_r34 import SIZE,FRAMES,compare

class SourceNativeR34(unittest.TestCase):
    def fake_frames(self):
        original=[];model=[]
        for i in range(FRAMES):
            a=Image.new("RGBA",SIZE,(0,0,0,0))
            b=Image.new("RGBA",SIZE,(0,0,0,0))
            ImageDraw.Draw(a).rectangle((15,350,50,485+i%3),fill=(200,190,150,255))
            ImageDraw.Draw(b).rectangle((15,350,50,493+i%3),fill=(200,190,150,255))
            original.append(a);model.append(b)
        return original,model

    def test_original_rgba_guard_ends_and_complete_cycle(self):
        a,b=self.fake_frames()
        with tempfile.TemporaryDirectory() as tmp:
            data=compare(a,b,"original_rgba_atlas",None,Path(tmp))
            self.assertEqual(len(data["frames"]),64)
            self.assertEqual(data["frames"][0]["source_guards"]["port_guard"]["last_row"],485)
            self.assertEqual(data["frames"][0]["candidate_guards"]["port_guard"]["last_row"],493)
            self.assertLess(data["mean_unaligned_silhouette_iou"],1)
            self.assertIsNotNone(data["mean_source_changed_mask_pixels"])
            self.assertTrue((Path(tmp)/"eight-frame-source-blender-pairs.png").is_file())
            self.assertTrue((Path(tmp)/"source-vs-blender-alpha-motion-heatmap.png").is_file())
            self.assertIn("lower_lips_and_guard_tips",data["source_motion_band_counts"])

    def test_lossy_gif_cannot_fake_source_motion_alpha(self):
        a,b=self.fake_frames()
        bg=(39,44,48)
        faux=[]
        for frame in a:
            canvas=Image.new("RGBA",SIZE,bg+(255,))
            canvas.alpha_composite(frame)
            faux.append(canvas.convert("RGB"))
        with tempfile.TemporaryDirectory() as tmp:
            data=compare(faux,b,"lossy_mattegray_gif_preview",bg,Path(tmp))
            self.assertIsNone(data["mean_source_changed_mask_pixels"])
            self.assertIsNone(data["mean_unaligned_silhouette_iou"])
            self.assertIsNotNone(data["preview_only_unreliable_iou"])
            self.assertIn("lossy",data["source_reference_caveat"].lower())
            self.assertFalse((Path(tmp)/"source-vs-blender-alpha-motion-heatmap.png").exists())

    def test_partial_animation_rejected(self):
        a,b=self.fake_frames()
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError,"64 indexed"):
                compare(a[:-1],b,"original_rgba_atlas",None,Path(tmp))

if __name__=="__main__":unittest.main()
