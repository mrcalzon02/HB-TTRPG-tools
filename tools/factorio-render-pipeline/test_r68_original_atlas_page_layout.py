"""R68 synthetic-only verification of the exact original two-page layout."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

import r67_full_native_cycle as r67
import r68_original_atlas_page_layout as r68
from test_r67_full_native_cycle import TestR67NativeCycle

class Original8x4PageFormat(unittest.TestCase):
    def prepare(self,root):
        TestR67NativeCycle().create(root)
        manifest_path=root/"capture-manifest.json"
        manifest=json.loads(manifest_path.read_text())
        manifest["original_private_sprite_sha256_reference_only"]=r68.SOURCE_REFERENCE_SHA
        manifest_path.write_text(json.dumps(manifest),encoding="utf-8")
        r67.assemble(root)

    def test_two_pages_exact_rgba_cell_order_no_resampling(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            self.prepare(root)
            pages=root/"pages"
            report=r68.pack(root,pages)
            self.assertEqual(report["page_count"],2)
            self.assertFalse(report["real_private_original_sprite_compared"])
            self.assertEqual([e["model_indices"] for e in report["pages"]],
                             [[0,31],[32,63]])
            for item in report["pages"]:
                with Image.open(pages/item["name"]) as im:
                    self.assertEqual(im.size,(2112,2168))
                    self.assertEqual(im.mode,"RGBA")
            with Image.open(pages/report["pages"][0]["name"]) as a,\
                 Image.open(pages/report["pages"][1]["name"]) as b:
                self.assertEqual(a.getpixel((2,10)),(30,100,50,255))
                self.assertEqual(a.getpixel((7*264+13,3*542+41)),
                                 (30+31*3%255,100+31*2%255,50,255))
                self.assertEqual(b.getpixel((2+32%20,10+32)),
                                 (30+32*3%255,100+32*2%255,50,255))
                self.assertEqual(b.getpixel((7*264+5,3*542+73)),
                                 (30+63*3%255,100+63*2%255,50,255))

    def test_unverified_original_claim_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            self.prepare(root)
            path=root/"r67-native-cycle-report.json"
            report=json.loads(path.read_text())
            report["source_sprite_visual_fidelity_approved"]=True
            path.write_text(json.dumps(report))
            with self.assertRaisesRegex(RuntimeError,"leaked source artwork"):
                r68.pack(root,root/"pages")

if __name__=="__main__":
    unittest.main()
