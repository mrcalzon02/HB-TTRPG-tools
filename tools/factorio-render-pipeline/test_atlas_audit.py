"""Tests for genuine sprite ZIP parsing, independent of copyrighted art."""
import io
from pathlib import Path
import tempfile
import unittest
import zipfile
from PIL import Image,ImageDraw
from audit_vanilla_atlas import audit, read_atlas


def png_bytes(image):
    out=io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def generate_fixture(file_name, wrong_size=False, omit_layer=None):
    with zipfile.ZipFile(file_name, "w") as archive:
        folder="thruster/"
        for prefix in ("thruster","thruster-light"):
            width=8 if prefix=="thruster" else 12
            height=12 if prefix=="thruster" else 16
            archive.writestr(folder+prefix+".lua",
                'return { width = %d, height = %d, shift = util.by_pixel(0, 0), '
                'line_length = 8, filenames = {"-1.png","-2.png"}, '
                'lines_per_file = 4 }\n' % (width,height))
            for file_id in (1,2):
                sheet=Image.new("RGBA", (width*8,height*4))
                draw=ImageDraw.Draw(sheet)
                for frame_idx in range(32):
                    col,row=frame_idx%8,frame_idx//8
                    offset=(file_id-1)*32+frame_idx
                    x,y=col*width,row*height
                    draw.rectangle((x+1,y+1,x+width-2,y+height-5),fill=(102,99,90,255))
                    draw.rectangle((x+2+(offset%3),y+height-4,
                                    x+3+(offset%3),y+height-2),
                                   fill=(150,70,60,255))
                if wrong_size and prefix=="thruster" and file_id==1:
                    sheet=sheet.crop((0,0,sheet.width-1,sheet.height))
                archive.writestr(folder+prefix+"-"+str(file_id)+".png",png_bytes(sheet))
        archive.writestr(folder+"thruster-bckg.lua",
                         "return { width=14, height=26, line_length=1 }\n")
        for part in ("thruster-bckg.png","thruster-flame.png",
                     "thruster-smoke.png","thruster-smoke-glow.png",
                     "thruster-pipe-connection-1.png",
                     "thruster-pipe-connection-2.png",
                     "thruster-pipe-connection-3.png",
                     "thruster-pipe-connection-4.png",
                     "thruster-remnants.png"):
            if part!=omit_layer:
                archive.writestr(folder+part,png_bytes(
                    Image.new("RGBA",(14,26),(40,30,60,200))))


class AtlasAuditTests(unittest.TestCase):
    def test_reconstruct_all_64_frames_in_two_sheets(self):
        with tempfile.TemporaryDirectory() as directory:
            archive=Path(directory)/"sample.zip"
            output=Path(directory)/"output"
            generate_fixture(archive)
            result=audit(archive,output)
            self.assertEqual(result["body_frame_count"],64)
            self.assertEqual(result["light_frame_count"],64)
            self.assertEqual(result["atlas"]["cell_width"],8)
            self.assertEqual(result["atlas"]["cell_height"],12)
            self.assertEqual(result["consecutive_transitions"],63)
            self.assertTrue((output/"thruster_frame_contact_sheet.png").is_file())
            self.assertTrue((output/"vanilla_thruster_atlas_audit.json").is_file())
            self.assertNotIn("copyrighted_png_bytes",result)

    def test_mismatched_cell_dimensions_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            archive=Path(directory)/"bad.zip"
            generate_fixture(archive,wrong_size=True)
            with self.assertRaisesRegex(ValueError,"expected"):
                audit(archive,Path(directory)/"out")

    def test_missing_named_overlay_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            archive=Path(directory)/"missing.zip"
            generate_fixture(archive,omit_layer="thruster-pipe-connection-4.png")
            with self.assertRaisesRegex(ValueError,"Required layer missing"):
                audit(archive,Path(directory)/"out")


if __name__=="__main__":
    unittest.main()
