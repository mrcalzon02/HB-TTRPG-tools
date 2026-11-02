"""R67 contract tests use ONLY self-authored synthetic frames, not Wube art."""
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import r67_full_native_cycle as r67

class TestR67NativeCycle(unittest.TestCase):
    def create(self,root):
        records=[]
        for i in range(r67.FRAMES):
            name="body-%02d.png"%i
            path=root/name
            frame=Image.new("RGBA",r67.CELL,(0,0,0,0))
            frame.putpixel((2+(i%20),10+i),(30+i*3%255,100+i*2%255,50,255))
            frame.save(path)
            records.append({
                "source_index":i,"blender_frame":i+1,"name":name,
                "png_sha256":r67.digest(path),
                "lower_fin_key_values":[[float(i)/64.]]
            })
        manifest={
            "revision":r67.REVISION,"source_candidate_revision":r67.R66_REV,
            "source_reconstruction_blend_sha256":r67.R66_SHA256,
            "frame_count":r67.FRAMES,"frame_size":list(r67.CELL),
            "visual_fidelity_approved":False,
            "original_private_sprite_pixels_loaded":False,
            "frames":records,
        }
        (root/"capture-manifest.json").write_text(json.dumps(manifest),encoding="utf-8")
        return manifest

    def test_exact_64_frame_zero_based_rgba_atlas_and_order(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            self.create(root)
            report=r67.assemble(root)
            self.assertEqual(report["frame_count_verified"],64)
            self.assertEqual(report["unique_rgba_frames"],64)
            self.assertEqual(report["atlas_dimensions"],[2112,4336])
            with Image.open(root/"r67-reconstruction-candidate-8x8-64.png") as sheet:
                self.assertEqual(sheet.getpixel((2,10)),(30,100,50,255))
                self.assertEqual(sheet.getpixel((7*264+9,10+7)),(51,114,50,255))
                self.assertEqual(sheet.getpixel((7*264+5,7*542+73)),
                                 (30+63*3%255,100+63*2%255,50,255))

    def test_missing_frame_fails_loudly(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            self.create(root)
            (root/"body-19.png").unlink()
            with self.assertRaisesRegex(RuntimeError,"absent/modified"):
                r67.assemble(root)

    def test_wrong_frame_order_fails(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            m=self.create(root)
            m["frames"][0],m["frames"][1]=m["frames"][1],m["frames"][0]
            (root/"capture-manifest.json").write_text(json.dumps(m),encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError,"frame order"):
                r67.assemble(root)

    def test_original_source_atlas_never_approves_candidate(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            m=self.create(root)
            m["visual_fidelity_approved"]=True
            (root/"capture-manifest.json").write_text(json.dumps(m),encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError,"provenance"):
                r67.assemble(root)

if __name__=="__main__":
    unittest.main()
