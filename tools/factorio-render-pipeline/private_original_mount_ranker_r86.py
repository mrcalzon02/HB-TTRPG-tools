"""Privately score speculative REAL Blender 3D mountings against ORIGINAL Wube sprite.

No source artwork in public CI: run this on a private workstation with the
user's exact thruster.zip. Read output of R84 and R85 render workflows.
Scores are analytical hints, not an art approval or game release gate.

Example:
  python private_original_mount_ranker_r86.py \
    --source-zip /private/thruster.zip \
    --render-dir /private/r84/output/r84 \
    --out /private/r84-source-scores.json
"""
import argparse,hashlib,io,json,zipfile
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter

SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ROIS={"port":(27,314,90,358),"center":(95,311,163,339),
      "starboard":(166,313,220,356),
      "all_mounts":(26,298,225,420),"three_fins":(40,336,225,444)}
INDEX_TO_ROI={3:"port",2:"center",1:"starboard"}

def source_atlas_cell(z,frame):
    j=frame-1
    with z.open("thruster/thruster-%d.png"%(j//32+1)) as stream:
        atlas=Image.open(io.BytesIO(stream.read())).convert("RGBA")
    if atlas.size!=(2112,2168):
        raise RuntimeError("Source atlas is not original 8x4 264x542 body frames")
    j%=32
    x=j%8*264;y=j//8*542
    return atlas.crop((x,y,x+264,y+542))

def premul(image):
    rgba=np.asarray(image,dtype=np.float32)
    if rgba.shape!=(542,264,4):
        raise RuntimeError("The render is not exact original native 264x542 RGBA")
    return rgba[:,:,:3]*(rgba[:,:,3:4]/255.)

def edge_mask(rgb):
    lum=np.clip(rgb[:,:,0]*.21+rgb[:,:,1]*.72+rgb[:,:,2]*.07,0,255)
    rows=np.abs(lum[2:,:]-lum[:-2,:])
    cols=np.abs(lum[:,2:]-lum[:,:-2])
    mask=np.zeros(lum.shape,dtype=np.uint8)
    mask[1:-1,1:-1]=255*((rows[:,1:-1]>29)|(cols[1:-1,:]>29))
    return Image.fromarray(mask)

def score_pair(source,candidate,bbox):
    x,y,X,Y=bbox
    a=source[y:Y,x:X];b=candidate[y:Y,x:X]
    mae=float(np.abs(a-b).mean()/255.)
    se=edge_mask(a);ce=edge_mask(b)
    sm=np.asarray(se)>0;cm=np.asarray(ce)>0
    sb=np.asarray(se.filter(ImageFilter.MaxFilter(5)))>0
    cb=np.asarray(ce.filter(ImageFilter.MaxFilter(5)))>0
    recall=float((sm&cb).sum()/sm.sum()) if sm.any() else None
    precision=float((cm&sb).sum()/cm.sum()) if cm.any() else None
    return {"original_rgb_mae":round(mae,7),
            "original_internal_edge_recall_2px":round(recall,6) if recall is not None else None,
            "candidate_internal_edge_precision_2px":round(precision,6) if precision is not None else None,
            "color_or_shadow_edges_not_unique_proof_of_3d_geometry":True}

def rank(source_zip,render_dir,out):
    path=Path(source_zip)
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest!=SOURCE_SHA:
        raise RuntimeError("Require exact user original thruster.zip, no substitute")
    directory=Path(render_dir)
    r84=directory/"r84_real_cast_parameter_sweep.json"
    r85=directory/"r85_combined_source_cast_hypotheses.json"
    if r84.exists():
        report=json.loads(r84.read_text())
        entries=[{"name":x["name"],"mount":x["single_original_mount_index"],
                  "render_1":x["both_frames_rendered"][0],
                  "render_33":x["both_frames_rendered"][1],
                  "parameters":x["native_screen_space_proposal"]}
                 for x in report["experiments"]]
    elif r85.exists():
        report=json.loads(r85.read_text())
        entries=[{"name":x["name"],"mount":None,
                  "render_1":x["native_frame1"],"render_33":x["native_frame33"],
                  "parameters":x["center_cast_camera_space_proposal"]}
                 for x in report["saved_editable_true_3d_candidates"]]
    else:
        raise RuntimeError("Need R84 or R85 real Blender numeric manifest")
    if report.get("original_sprite_images_uploaded",False) or report.get("proprietary_original_rgba_uploaded",False):
        raise RuntimeError("Original private image appears in public artifact")
    if not any(e["name"]=="baseline" for e in entries):
        raise RuntimeError("Must compare unmodified same-camera baseline")
    with zipfile.ZipFile(path) as z:
        originals={frame:premul(source_atlas_cell(z,frame)) for frame in (1,33)}
    result={"verified_source_archive_SHA256":digest,
            "real_3d_original_camera_renders":True,
            "source_pixels_embedded_in_report":False,
            "only_2_of_64_frames_scored":True,
            "not_original_geometry_approval":True,
            "candidate_scores":[]}
    for e in entries:
        score={}
        for frame in (1,33):
            filename=e["render_1"] if frame==1 else e["render_33"]
            if "/" in filename or ".." in filename:
                raise RuntimeError("Unexpected render path in model manifest")
            with Image.open(directory/filename) as image:
                candidate=premul(image.convert("RGBA"))
            score[str(frame)]={roi:score_pair(originals[frame],candidate,bounds)
                               for roi,bounds in ROIS.items()}
        average={roi:{"mean_RGB_MAE":round(sum(score[str(frame)][roi]["original_rgb_mae"]
                                           for frame in (1,33))/2,7),
                      "mean_source_internal_edge_recall":round(sum(
                          score[str(frame)][roi]["original_internal_edge_recall_2px"] or 0
                          for frame in (1,33))/2,6)}
                 for roi in ROIS}
        result["candidate_scores"].append({**e,"two_frame_scores":score,"averages":average})
    baseline=next(x for x in result["candidate_scores"] if x["name"]=="baseline")
    for e in result["candidate_scores"]:
        e["deltas_RGB_mae_vs_baseline"]={
            roi:round(e["averages"][roi]["mean_RGB_MAE"]-baseline["averages"][roi]["mean_RGB_MAE"],7)
            for roi in ROIS}
    if r84.exists():
        result["rankings_per_original_bespoke_cast"]={}
        for index,roi in INDEX_TO_ROI.items():
            ranked=[x for x in result["candidate_scores"] if x["mount"] in (index,None)]
            ranked.sort(key=lambda e:e["averages"][roi]["mean_RGB_MAE"])
            result["rankings_per_original_bespoke_cast"][roi]=[{
                "name":x["name"],"original_RGB_mae":x["averages"][roi]["mean_RGB_MAE"],
                "original_edge_recall":x["averages"][roi]["mean_source_internal_edge_recall"],
                "real_3d_parameters":x["parameters"]}
                for x in ranked]
    else:
        result["ranked_combination_names_by_mount_error"]=[
            x["name"] for x in sorted(result["candidate_scores"],
              key=lambda e:e["averages"]["all_mounts"]["mean_RGB_MAE"])]
    target=Path(out);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("PRIVATE_ORIGINAL_SPRITE_SHA_VERIFIED",digest)
    print("SOURCE_BASED_COMPARE_EXPERIMENTS",len(entries))
    print("NO_PRIVATE_ORIGINAL_IMAGES_EXPORTED")
    return result

if __name__=="__main__":
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source-zip",required=True,type=Path)
    ap.add_argument("--render-dir",required=True,type=Path)
    ap.add_argument("--out",required=True,type=Path)
    args=ap.parse_args()
    rank(args.source_zip,args.render_dir,args.out)
