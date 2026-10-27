"""R32: inspect/assemble actual 64 native-resolution Blender body captures.

This QA does NOT assert Wube sprite pixel matching; original private
source sprites are intentionally unavailable in public GitHub Actions.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image,ImageDraw

def validate(folder):
    manifest=json.loads((folder/"cycle-manifest.json").read_text())
    if manifest["source_frame_count"]!=64:
        raise RuntimeError("R32 must cover full 64 source frame slots")
    if manifest["candidate_dimensions"]!=[264,542]:
        raise RuntimeError("R32 must render original native body dimensions")
    names=manifest["body_frame_files"]
    if names!=[f"body-{i:02d}.png" for i in range(64)]:
        raise RuntimeError("R32 source-to-model frames misindexed")
    frames=[]
    hashes=set()
    boxes=[]
    for n in names:
        path=folder/n
        with Image.open(path) as src:
            if src.size!=(264,542):
                raise RuntimeError("R32 rendered incorrect native frame dimensions")
            img=src.convert("RGBA")
        bbox=img.getchannel("A").getbbox()
        if bbox is None:
            raise RuntimeError("R32 rendered transparent blank frame")
        if bbox[0]==0 or bbox[1]==0 or bbox[2]==264 or bbox[3]==542:
            raise RuntimeError("R32 actual native frame touches preview border")
        boxes.append(list(bbox))
        hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
        frames.append(img)
    # Only R18's four lower source-silhouette-proxy tips currently animate.
    # Never claim 64 unique images unless actual hashes prove it.
    if len(hashes)<8:
        raise RuntimeError("R32 native animated Blender cycle appears static")
    sheet=Image.new("RGB",(264*4,542*2),(30,34,39))
    for index,frameid in enumerate(range(0,64,8)):
        back=Image.new("RGBA",(264,542),(35,39,44,255))
        back.alpha_composite(frames[frameid])
        sheet.paste(back.convert("RGB"),((index%4)*264,(index//4)*542))
    sheet.save(folder/"eight-source-spaced-body-frames.png")
    frames[0].save(folder/"frame00-native.png")
    # Short GIF is a visual QA aid; independent 64 lossless PNGs remain
    # the authoritative rendered evidence.
    frames[0].save(folder/"animated-64-body-preview.gif",save_all=True,
                   append_images=frames[1:],duration=100,loop=0,disposal=2)
    result={"status":"REAL_64_FRAME_EDITABLE_BLENDER_BODY_NOT_SOURCE_PIXEL_MATCH",
            "rendered_native_frames":len(frames),
            "distinct_actual_frame_hashes":len(hashes),
            "all_native_frame_bboxes":boxes,
            "source_frame_offset":1,
            "original_source_asset_private":True,
            "visual_preview":"animated-64-body-preview.gif"}
    (folder/"cycle-qa.json").write_text(json.dumps(result,indent=2)+"\n")
    print("R32_NATIVE_64_FRAME_QA_PASS",len(frames),"distinct",len(hashes))
    return result

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    validate(args.output.resolve()/"test-04-vanilla-approx"/"native-source-cycle-r32")

if __name__=="__main__":
    main()
