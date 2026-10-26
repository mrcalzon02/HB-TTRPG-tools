#!/usr/bin/env python3
"""Make a visibly labeled, UNREGISTERED vanilla-thruster comparison board.

Inputs: benchmark captures + official Factorio Wiki entity animation.
Reference is fetched at run time, never checked into source control.
Do not report numerical pixel similarity: wiki GIF includes in-game background,
different zoom/lighting and a 2-frame preview, not the 64-frame raw sprite.
"""
import argparse
from io import BytesIO
import json
from pathlib import Path
from PIL import Image,ImageDraw
import urllib.request

URL="https://wiki.factorio.com/images/Thruster_entity_anim.gif"

def load_reference(path=None):
    if path:
        content=Path(path).read_bytes()
        url=str(path)
    else:
        with urllib.request.urlopen(
            urllib.request.Request(URL,headers={"User-Agent":"Factorio-Art-Calibrator/0.7"}),
            timeout=25
        ) as response:
            if not response.url.startswith("https://wiki.factorio.com/"):
                raise RuntimeError("Official wiki image redirected outside trusted host")
            content=response.read(3_000_000)
        url=URL
    if len(content)<250 or len(content)>3_000_000:
        raise RuntimeError("Unexpected reference image byte length")
    src=Image.open(BytesIO(content))
    frames=[]
    for idx in range(min(getattr(src,"n_frames",1),2)):
        src.seek(idx)
        frames.append(src.convert("RGBA").copy())
    return frames,url

def crop_art(src):
    rgba=src.convert("RGBA")
    bbox=rgba.getchannel("A").getbbox()
    if not bbox:raise RuntimeError("Benchmark art has no alpha silhouette")
    delta=max(5,int(max(bbox[2]-bbox[0],bbox[3]-bbox[1])*.07))
    return rgba.crop((max(0,bbox[0]-delta),max(0,bbox[1]-delta),
                     min(rgba.width,bbox[2]+delta),min(rgba.height,bbox[3]+delta))),list(bbox)

def fit_center(source,outer=(300,300),checker=False):
    im=source.convert("RGBA")
    im.thumbnail((outer[0]-14,outer[1]-14),Image.Resampling.LANCZOS)
    dest=Image.new("RGBA",outer,(26,30,34,255))
    if checker:
        draw=ImageDraw.Draw(dest)
        for x in range(0,outer[0],20):
            for y in range(0,outer[1],20):
                if (x//20+y//20)%2:draw.rectangle((x,y,x+19,y+19),fill=(39,43,49,255))
    dest.alpha_composite(im,((outer[0]-im.width)//2,(outer[1]-im.height)//2))
    return dest.convert("RGB")

def compare(root,reference=None):
    root=Path(root)
    srcbody=root/"frames"/"direction-00"/"idle"/"001.png"
    srcrun=root/"frames"/"direction-00"/"run"/"001.png"
    srcflame=root/"effects"/"flame"/"001.png"
    if any(not p.is_file() for p in (srcbody,srcrun,srcflame)):
        raise RuntimeError("R07 needs separate body idle/run and flame pass")
    report={"schema_version":1,"reference_url":URL,"type":"unregistered_visual_comparison",
            "no_pixel_similarity_score":True,
            "limitations":"Official wiki 300x300 animated gameplay GIF, not registered raw game sprite. Visual inspection only."}
    try:
        refs,url=load_reference(reference)
        report["reference_status"]="loaded"
        report["reference_source"]=url
        report["reference_frame_count"]=len(refs)
    except Exception as exc:
        report["reference_status"]="unavailable"
        report["reference_error"]=str(exc)
        (root/"reference-comparison-status.json").write_text(json.dumps(report,indent=2)+"\n")
        print("REFERENCE_UNAVAILABLE",str(exc),flush=True)
        return False
    with Image.open(srcbody) as f: idle,bbox=crop_art(f)
    with Image.open(srcrun) as f: running,bbox2=crop_art(f)
    with Image.open(srcflame) as fx:
        with Image.open(srcrun) as full:
            composite=full.convert("RGBA")
        composite.alpha_composite(fx.convert("RGBA"))
    fullbbox=composite.getchannel("A").getbbox()
    if not fullbbox:raise RuntimeError("No composite bbox")
    composite=composite.crop(fullbbox)
    layout=Image.new("RGB",(1200,660),(17,20,25))
    image_sections=[refs[0],refs[-1],idle,composite]
    for i,img in enumerate(image_sections):
        x=i*300
        target=fit_center(img,checker=(i>=2))
        layout.paste(target,(x,38))
    labels=["OFFICIAL WIKI — FRAME 1","OFFICIAL WIKI — FRAME 2",
            "BLENDER CANDIDATE — IDLE","BLENDER CANDIDATE — RUN + FLAME"]
    draw=ImageDraw.Draw(layout)
    for i,label in enumerate(labels):
        draw.text((i*300+12,13),label,fill=(238,241,220))
    draw.text((20,356),"REFERENCE IS GAMEPLAY GIF, NOT RAW SPRITE. CROPS/ZOOMS NOT REGISTERED.",fill=(255,199,102))
    draw.text((20,379),"Use for human inspection of silhouette, engine proportions, integration, palette and exhaust.",fill=(219,221,220))
    draw.text((20,407),"Source: "+URL,fill=(144,183,227))
    draw.text((20,435),"Factorio 2.0.77 prototype: 64-frame animation, separate floor patch/pipe/glow/flame.",fill=(219,221,220))
    # Include larger candidate visuals for inspecting metalwork.
    # Two 300px panels are not a substitute for in-game verified matching.
    for i,img in enumerate((running,composite)):
        view=fit_center(img,(280,175),checker=True)
        layout.paste(view,(75+i*560,473))
    draw.text((20,645),"Candidate art generated independently; original game image shown solely as reference.",fill=(172,175,175))
    path=root/"reference-comparison-preview.png"
    layout.save(path)
    report["reference_comparison_file"]=path.name
    report["candidate_idle_alpha_bbox"]=bbox
    report["candidate_run_alpha_bbox"]=bbox2
    report["source_frame_dimensions"]=[Image.open(srcbody).width,Image.open(srcbody).height]
    (root/"reference-comparison-status.json").write_text(json.dumps(report,indent=2)+"\n")
    print("REFERENCE_COMPARISON_READY",str(path),flush=True)
    return True

if __name__=="__main__":
    a=argparse.ArgumentParser()
    a.add_argument("--candidate",type=Path,required=True)
    a.add_argument("--reference",type=Path)
    args=a.parse_args()
    compare(args.candidate,args.reference)
