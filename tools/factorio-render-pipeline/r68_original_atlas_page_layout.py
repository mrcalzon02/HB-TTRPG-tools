"""R68: reconstruct ORIGINAL Factorio two-page 8x4 body atlas layout.

Input is the actual R67 64-frame RGBA reconstruction captured from the saved
R66 mesh. The user's ORIGINAL Factorio 2.0.77 sprite consists of TWO 8x4
2112x2168 atlas pages, each with thirty-two 264x542 body frames.
No rescaling or new art. This script packs only the model's 64 frames into
that same exact layout to enable private original-to-candidate comparison.

NEVER treat reconstructed pages as original Wube art. The public CI workflow
must NOT import the original proprietary atlas, GIF, official STL samples,
or images retrieved from the web.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

SOURCE_REFERENCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
CELL=(264,542)
PAGE_SIZE=(2112,2168)
PAGE_COUNT=2
FRAMES_PER_PAGE=32
FRAME_COUNT=64
R67_REV="R67_real_full_64_frame_native_cycle_from_connected_R66"

def sha_bytes(data):
    return sha256(data).hexdigest()

def pack(input_dir,out):
    input_dir=Path(input_dir).resolve()
    out=Path(out).resolve()
    manifest=json.loads((input_dir/"capture-manifest.json").read_text(encoding="utf-8"))
    report=json.loads((input_dir/"r67-native-cycle-report.json").read_text(encoding="utf-8"))
    if manifest.get("revision")!=R67_REV or manifest.get("frame_count")!=64:
        raise RuntimeError("R68 requires actual completed R67 full 64-frame capture")
    if manifest.get("original_private_sprite_sha256_reference_only")!=SOURCE_REFERENCE_SHA:
        raise RuntimeError("R68 missing source-specific original sprite provenance")
    if (manifest.get("original_private_sprite_pixels_loaded") is not False
        or report.get("source_sprite_visual_fidelity_approved") is not False
        or report.get("source_sprite_private_bytes_in_artifacts") is not False):
        raise RuntimeError("R68 refuses leaked source artwork or unearned visual approval")
    if (report.get("frame_count_verified")!=FRAME_COUNT or
        report.get("atlas_dimensions")!=[CELL[0]*8,CELL[1]*8] or
        report.get("all_64_atlas_cells_verified_bit_identical_to_real_blender_frames") is not True):
        raise RuntimeError("R68 requires a proven bit-for-bit complete R67 sheet")
    model_frames=manifest.get("frames")
    if len(model_frames)!=FRAME_COUNT or [e["source_index"] for e in model_frames]!=list(range(64)):
        raise RuntimeError("R68 refuses missing/reordered reconstructed source-indexed frames")
    if len(report["cells"])!=FRAME_COUNT:
        raise RuntimeError("R68 missing independent pixel digests for all actual Blender frames")
    out.mkdir(parents=True,exist_ok=True)
    output_pages=[]
    for page_number in range(PAGE_COUNT):
        image=Image.new("RGBA",PAGE_SIZE,(0,0,0,0))
        entries=[]
        for local_index in range(FRAMES_PER_PAGE):
            global_index=page_number*FRAMES_PER_PAGE+local_index
            frame_info=model_frames[global_index]
            record=report["cells"][global_index]
            if record["source_index"]!=global_index:
                raise RuntimeError("R68 R67 image digest frame index mismatch")
            with Image.open(input_dir/frame_info["name"]) as src:
                if src.mode!="RGBA" or src.size!=CELL:
                    raise RuntimeError("R68 received nonnative Blender candidate frame")
                rgba=src.tobytes()
                if sha_bytes(rgba)!=record["pixel_sha256"]:
                    raise RuntimeError("R68 original rendered frame is no longer pixel identical")
                col=local_index%8
                row=local_index//8
                if not src.getchannel("A").getbbox():
                    raise RuntimeError("R68 source-indexed Blender frame entirely transparent")
                image.paste(src,(col*CELL[0],row*CELL[1]))
                entries.append({"source_index":global_index,"candidate_png":frame_info["name"],
                                "page_cell_column":col,"page_cell_row":row,
                                "original_rendered_rgba_sha256":record["pixel_sha256"]})
        name="R68_CANDIDATE_NOT_ORIGINAL_thruster_body_page_%d.png"%(page_number+1)
        path=out/name
        image.save(path,optimize=True)
        with Image.open(path) as stored:
            if stored.size!=PAGE_SIZE or stored.mode!="RGBA":
                raise RuntimeError("R68 no native 8x4 two-page Atlas RGBA output")
            for e in entries:
                x=e["page_cell_column"]*CELL[0]
                y=e["page_cell_row"]*CELL[1]
                pixel=stored.crop((x,y,x+CELL[0],y+CELL[1])).tobytes()
                if sha_bytes(pixel)!=e["original_rendered_rgba_sha256"]:
                    raise RuntimeError("R68 frame moved, rescaled or lost pixels")
        output_pages.append({"name":name,"page":page_number+1,
                             "native_page_size":list(PAGE_SIZE),
                             "model_indices":[page_number*32,page_number*32+31],
                             "sha256":sha_bytes(path.read_bytes()),"frames":entries})
        print("R68_EXACT_ORIGINAL_ATLAS_PAGE_FORMAT_RECONSTRUCTED",
              page_number+1,"frames",entries[0]["source_index"],"through",
              entries[-1]["source_index"],flush=True)
    summary={
        "revision":"R68_original_layout_only_reconstruction_candidate",
        "status":"PASS_COMPLETE_R66_RECONSTRUCTION_TWO_NATIVE_8X4_ATLAS_PAGES",
        "source_sprite_reference_sha256_only":SOURCE_REFERENCE_SHA,
        "real_private_original_sprite_compared":False,
        "visual_fidelity_approved":False,
        "original_wube_source_pixels_included":False,
        "internet_images_or_3d_printable_meshes_used":False,
        "source_original_frame_dimensions":list(CELL),
        "original_per_page_dimensions":list(PAGE_SIZE),
        "page_count":PAGE_COUNT,"model_frames":FRAME_COUNT,
        "frame_order":"0..31 page1, 32..63 page2; left-right then top-bottom",
        "no_reframe_rescale_color_transform_or_new_art":True,
        "each_of_64_original_rendered_candidate_pixels_verified":True,
        "pages":output_pages,
    }
    (out/"r68-page-layout-manifest.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
    return summary

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-r67",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    pack(args.source_r67,args.out)

if __name__=="__main__":
    main()
