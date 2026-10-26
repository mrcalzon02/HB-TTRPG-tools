"""Read real Blender captures, validate PNG/frames, pack sheets and report QA.

This verifier deliberately does not approve prototype alignment or Factorio load.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
    return h.hexdigest()

def rgba_bbox(image):
    return image.getchannel("A").getbbox()

def capture_metrics(path, expected):
    with Image.open(path) as src:
        img=src.convert("RGBA")
        if img.size!=tuple(expected):
            raise RuntimeError("Wrong frame dimensions: "+str(path)+" "+str(img.size))
        a=img.getchannel("A")
        bbox=a.getbbox()
        if not bbox:
            raise RuntimeError("Entirely transparent frame: "+str(path))
        histogram=a.histogram()
        count=sum(histogram[1:])
        pixels=img.width*img.height
        if count<12:
            raise RuntimeError("Nearly blank frame: "+str(path))
        # Cropping risk is a QA metric, not an automatic false game-art pass.
        touch=(bbox[0]==0 or bbox[1]==0 or bbox[2]==img.width or bbox[3]==img.height)
        return {"name":path.name,"sha256":digest(path),"alpha_bbox":list(bbox),
                "alpha_coverage":round(count/pixels,5),"touches_frame_edge":touch,
                "bytes":path.stat().st_size}

def montage(images, labels, output, cell, columns=4):
    cols=min(columns,len(images))
    rows=math.ceil(len(images)/cols)
    cw,ch=cell
    sheet=Image.new("RGB",(cw*cols,(ch+24)*rows),(24,30,38))
    draw=ImageDraw.Draw(sheet)
    for i,(src,label) in enumerate(zip(images,labels)):
        x=i%cols*cw;y=i//cols*(ch+24)
        with Image.open(src) as handle:
            frame=handle.convert("RGBA")
        backing=Image.new("RGBA",cell,(36,44,51,255))
        backing.alpha_composite(frame)
        sheet.paste(backing.convert("RGB"),(x,y))
        draw.text((x+6,y+ch+3),label[:38],fill=(235,236,220))
    output.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(output)
    return output

def detail_montage(paths, labels, output, size=(224, 224)):
    """Review-only close-up: crop to the UNION of alpha bounds (not sprite output).

    Never modify the fixed-canvas captures that feed Factorio sprite atlases.
    """
    union=None
    rendered=[]
    for path in paths:
        with Image.open(path) as source:
            im=source.convert("RGBA")
        bbox=im.getchannel("A").getbbox()
        if bbox is None:raise RuntimeError("Missing alpha in preview "+str(path))
        if union is None:union=bbox
        else:
            union=(min(union[0],bbox[0]),min(union[1],bbox[1]),
                   max(union[2],bbox[2]),max(union[3],bbox[3]))
        rendered.append(im)
    padding=max(4,int(max(union[2]-union[0],union[3]-union[1])*.06))
    bbox=(max(0,union[0]-padding),max(0,union[1]-padding),
          min(rendered[0].width,union[2]+padding),
          min(rendered[0].height,union[3]+padding))
    w,h=size
    sheet=Image.new("RGB",(w*len(rendered),h+28),(26,32,40))
    draw=ImageDraw.Draw(sheet)
    for i,(im,label) in enumerate(zip(rendered,labels)):
        crop=im.crop(bbox)
        crop.thumbnail((w-12,h-12),Image.Resampling.LANCZOS)
        back=Image.new("RGBA",size,(34,39,45,255))
        back.alpha_composite(crop,((w-crop.width)//2,(h-crop.height)//2))
        sheet.paste(back.convert("RGB"),(i*w,0))
        draw.text((i*w+7,h+5),label[:36],fill=(225,228,214))
    output.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(output)
    return output

def pack_state(paths, dest, cell):
    # Each direction/state atlas is one horizontal strip. Do not auto-crop.
    w,h=cell
    img=Image.new("RGBA",(w*len(paths),h))
    for i,path in enumerate(paths):
        with Image.open(path) as source:
            rgba=source.convert("RGBA")
            if rgba.size!=cell:raise ValueError("Atlas cell mismatch: "+str(path))
            img.paste(rgba,(i*w,0))
    dest.parent.mkdir(parents=True,exist_ok=True)
    img.save(dest)
    return dest

def analyze_asset(folder):
    manifest=json.loads((folder/"capture-manifest.json").read_text(encoding="utf-8"))
    cell=tuple(manifest["preview_cell"])
    files=[folder/p for p in manifest["frame_files"]]
    if not files or any(not p.is_file() for p in files):
        raise RuntimeError("Missing render frame(s) for "+manifest["asset"])
    all_metrics=[capture_metrics(p,cell) for p in files]
    groups={}
    for p in files:
        key=(p.parts[-3],p.parts[-2]) # direction-00 / idle or run
        groups.setdefault(key,[]).append(p)
    atlas_files=[]
    for (direction,state),paths in sorted(groups.items()):
        paths.sort()
        output=folder/"packed"/(direction+"-"+state+".png")
        pack_state(paths,output,cell)
        atlas_files.append(str(output.relative_to(folder)).replace("\\","/"))
    contact=folder/"contact-sheet.png"
    montage(files,[str(p.relative_to(folder/"frames")).replace("\\","/") for p in files],
            contact,cell,columns=4)
    closeup_paths=[]
    closeup_labels=[]
    for state in ("idle","run"):
        state_file=next((p for p in files if p.parts[-3]=="direction-00" and
                         p.parts[-2]==state),None)
        if state_file is not None:
            closeup_paths.append(state_file);closeup_labels.append(state)
    if closeup_paths:
        detail_montage(closeup_paths,closeup_labels,
                       folder/"detail-contact-sheet.png")
    # Stable registration: alpha bbox variation and source-frame corner coverage.
    box_centers=[((v["alpha_bbox"][0]+v["alpha_bbox"][2])/2,
                  (v["alpha_bbox"][1]+v["alpha_bbox"][3])/2) for v in all_metrics]
    spreads=[max(pt[k] for pt in box_centers)-min(pt[k] for pt in box_centers) for k in (0,1)]
    hashes={digest(p) for p in files}
    result={"asset":manifest["asset"],"frame_count":len(files),"states":len(groups),
            "directions":manifest["directions"],"cell_size":list(cell),
            "bbox_center_spread_px":[round(x,2) for x in spreads],
            "alpha_coverage_min":min(v["alpha_coverage"] for v in all_metrics),
            "alpha_coverage_max":max(v["alpha_coverage"] for v in all_metrics),
            "edge_clipping_suspected":any(v["touches_frame_edge"] for v in all_metrics),
            "distinct_png_hashes":len(hashes),"frames":all_metrics,
            "atlases":atlas_files,"contact_sheet":"contact-sheet.png",
            "candidate_not_game_approved":True}
    (folder/"qa-report.json").write_text(json.dumps(result,indent=2)+"\n")
    print("CAPTURE_QA",result["asset"],"frames",len(files),"unique",len(hashes),
          "bbox_spread",result["bbox_center_spread_px"],"clip_risk",result["edge_clipping_suspected"],flush=True)
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path,required=True)
    p.add_argument("--fail-on-edge",action="store_true",help="Treat alpha touching any frame boundary as a failed regression")
    args=p.parse_args()
    root=args.root.resolve()
    candidates=sorted(x for x in root.iterdir() if x.is_dir() and (x/"capture-manifest.json").is_file())
    if not candidates:raise RuntimeError("No capture manifests found in "+str(root))
    reports=[analyze_asset(x) for x in candidates]
    summary={"assets":len(reports),"rendered_frames":sum(x["frame_count"] for x in reports),
             "rendered_atlases":sum(len(x["atlases"]) for x in reports),
             "edge_risk_assets":[x["asset"] for x in reports if x["edge_clipping_suspected"]],
             "drift_px_by_asset":{x["asset"]:x["bbox_center_spread_px"] for x in reports},
             "status":"CAPTURE_EXPORTED_ONLY_NOT_FACTORIO_VERIFIED"}
    (root/"batch-qa-summary.json").write_text(json.dumps(summary,indent=2)+"\n")
    # A quick readable aggregate contact sheet of first idle, first run.
    examples=[];labels=[]
    for asset in candidates:
        for state in ("idle","run"):
            matches=sorted((asset/"frames"/"direction-00"/state).glob("*.png"))
            if matches:
                examples.append(matches[0]);labels.append(asset.name+" / "+state)
    # Normalize each preview to 192x288 to make the sheet comparable.
    w,h=192,288
    normalized=[]
    for i,path in enumerate(examples):
        with Image.open(path) as frame:
            im=frame.convert("RGBA"); im.thumbnail((w-8,h-8))
        thumb=Image.new("RGBA",(w,h),(0,0,0,0))
        thumb.alpha_composite(im,((w-im.width)//2,(h-im.height)//2))
        output=root/("_preview_%03d.png"%i)
        thumb.save(output);normalized.append(output)
    if normalized:
        montage(normalized,labels,root/"all-assets-contact-sheet.png",(w,h),columns=4)
        for p in normalized:p.unlink()
    md=["# Factorio Blender calibration batch — actual render evidence","",
        "This is a Blender/headless image-pipeline run, **not** Factorio game acceptance.","",
        "| Asset | Frames | Unique images | Alpha bbox drift X/Y (px) | Edge risk |",
        "| --- | ---: | ---: | --- | --- |"]
    for r in reports:
        md.append("| {} | {} | {} | {} | {} |".format(
            r["asset"],r["frame_count"],r["distinct_png_hashes"],
            ", ".join(str(x) for x in r["bbox_center_spread_px"]),
            "YES — inspect" if r["edge_clipping_suspected"] else "no"))
    md.extend(["","Candidate tuning questions: compare camera projection to Space Age,",
               "inspect edge risk, exhaust alignment, alpha, zoom-scale readability,",
               "and follow with Factorio 2.0.77 platform screenshots before integration.",""])
    (root/"CAPTURE_QA.md").write_text("\n".join(md))
    if args.fail_on_edge and summary["edge_risk_assets"]:
        raise RuntimeError("Frame clipping regression: "+", ".join(summary["edge_risk_assets"]))
    print("BATCH_QA_SUCCESS",json.dumps({k:v for k,v in summary.items() if k!="drift_px_by_asset"}),flush=True)

if __name__=="__main__":main()
