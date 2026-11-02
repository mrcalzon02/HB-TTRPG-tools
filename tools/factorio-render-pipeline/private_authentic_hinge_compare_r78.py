#!/usr/bin/env python3
"""R78: PRIVATE actual original sprite vs Blender native hinge/pivot ROI review.

Source zip is read LOCAL ONLY. Output is numeric JSON with no image pixels.
Usage:
  python tools/factorio-render-pipeline/private_authentic_hinge_compare_r78.py \
    --source-zip /private/thruster.zip \
    --baseline f1=/path/R71_01.png --baseline f33=/path/R71_33.png \
    --candidate label:f1=/path/edited_01.png \
    --candidate label:f33=/path/edited_33.png --out /private/hinge_compare.json

No approval threshold or CI release gate. A candidate can improve average
RGB error while being mechanically implausible. Inspect actual 3D and source.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile
import numpy as np
from PIL import Image

ORIGINAL_ZIP_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ATLAS_SIZE=(2112,2168)
NATIVE=(264,542)
REGIONS={
    "port_bespoke_cast":(27,314,90,358),
    "center_bridge":(95,311,163,339),
    "starboard_bespoke_cast":(166,313,220,356),
    "center_two_short_lock_ears_and_root":(96,328,164,385),
    "port_root":(38,340,99,401),
    "starboard_root":(164,340,223,402),
    "all_three_real_mounts":(27,300,225,396),
}
FRAMES={"f1":1,"f33":33}

def parse_assignment(raw,prefix):
    if "=" not in raw:
        raise ValueError(f"{prefix} requires name=/path/file.png, received {raw!r}")
    k,v=raw.split("=",1)
    if not v.strip():
        raise ValueError(f"{prefix} path empty")
    return k.strip(),Path(v).expanduser()

def original_frame(zipfile,frame):
    if frame not in (1,33):
        raise ValueError("Only original frames 1 and 33 are supported by this compare contract")
    atlas=(frame-1)//32+1
    n=(frame-1)%32
    with zipfile.open(f"thruster/thruster-{atlas}.png") as fd:
        im=Image.open(io.BytesIO(fd.read())).convert("RGBA")
    if im.size!=ATLAS_SIZE:
        raise RuntimeError(f"Unexpected original body atlas dimensions: {im.size}")
    return np.asarray(im.crop(((n%8)*264,(n//8)*542,
                               ((n%8)+1)*264,((n//8)+1)*542)),dtype=np.float32)

def native_image(path):
    im=Image.open(path).convert("RGBA")
    if im.size!=NATIVE:
        raise RuntimeError(f"Not registered to original native 264x542: {path} {im.size}")
    return np.asarray(im,dtype=np.float32)

def region_metrics(real,model,box):
    x0,y0,x1,y1=box
    a=real[y0:y1,x0:x1]
    b=model[y0:y1,x0:x1]
    # Source and Blender are RGBA. RGB is premultiplied to black so invisible
    # RGB behind transparent pixels cannot dominate comparisons.
    src=a[:,:,:3]*(a[:,:,3:4]/255.)
    mdl=b[:,:,:3]*(b[:,:,3:4]/255.)
    delta=np.abs(src-mdl)
    return {
        "premultiplied_rgb_mae_normalized":round(float(delta.mean()/255.),6),
        "alpha_mae_normalized":round(float(np.abs(a[:,:,3]-b[:,:,3]).mean()/255.),6),
        "mean_original_rgb_luminance":round(float(
            (src[:,:,0]*.21+src[:,:,1]*.72+src[:,:,2]*.07).mean()/255.),6),
        "mean_blender_rgb_luminance":round(float(
            (mdl[:,:,0]*.21+mdl[:,:,1]*.72+mdl[:,:,2]*.07).mean()/255.),6),
        "roi_native_pixel_area":int((x1-x0)*(y1-y0)),
    }

def score(zip_path,baseline,candidates):
    archive=Path(zip_path).expanduser()
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest!=ORIGINAL_ZIP_SHA256:
        raise RuntimeError("Refusing source substitute: exact user original ZIP hash mismatch")
    if set(baseline)!=set(FRAMES):
        raise RuntimeError("Both original-matched baseline frames f1 and f33 required")
    for label,imgs in candidates.items():
        if set(imgs)!=set(FRAMES):
            raise RuntimeError(f"Candidate {label!r} must specify BOTH f1 and f33")
    report={"revision":"R78_source_private_true_pixel_hinge_comparison",
            "verified_original_zip_SHA256":digest,
            "private_original_images_or_pixel_arrays_emitted":False,
            "not_an_art_release_gate":True,
            "source_frame_numbers":FRAMES,
            "regions_native_xyxy":REGIONS,
            "baseline":{},
            "candidates":{}}
    with ZipFile(archive) as zipfile:
        for token,frame in FRAMES.items():
            original=original_frame(zipfile,frame)
            b=native_image(baseline[token])
            report["baseline"][token]={label:region_metrics(original,b,box)
                      for label,box in REGIONS.items()}
            for name,images in candidates.items():
                candidate=native_image(images[token])
                entry=report["candidates"].setdefault(name,{})
                entry[token]={}
                for label,box in REGIONS.items():
                    metrics=region_metrics(original,candidate,box)
                    metrics["source_rgb_mae_change_vs_baseline"]=round(
                        metrics["premultiplied_rgb_mae_normalized"]-
                        report["baseline"][token][label]["premultiplied_rgb_mae_normalized"],6)
                    entry[token][label]=metrics
    return report

def run():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source-zip",required=True,type=Path)
    ap.add_argument("--baseline",action="append",required=True,help="f1=path or f33=path")
    ap.add_argument("--candidate",action="append",default=[],
                    help="name:f1=path or name:f33=path")
    ap.add_argument("--out",required=True,type=Path)
    args=ap.parse_args()
    base={}
    for raw in args.baseline:
        key,path=parse_assignment(raw,"baseline")
        if key in base:raise ValueError("Duplicate baseline "+key)
        base[key]=path
    candidates={}
    for raw in args.candidate:
        if ":" not in raw:raise ValueError("candidate name:frame=path required")
        label,assignment=raw.split(":",1)
        frame,path=parse_assignment(assignment,"candidate")
        if frame in candidates.setdefault(label,{}):
            raise ValueError(f"Duplicate candidate {label} {frame}")
        candidates[label][frame]=path
    result=score(args.source_zip,base,candidates)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R78_REAL_PRIVATE_ORIGINAL_SPRITE_HASH_VERIFIED")
    print("R78_COMPARISON_JSON_NUMBERS_ONLY",args.out)
if __name__=="__main__":
    run()
