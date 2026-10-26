"""Validate R09 camera experiments and produce side-by-side comparison."""
import argparse
import json
from pathlib import Path
from PIL import Image,ImageDraw
from capture_analysis import capture_metrics

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    root=args.output/"test-04-vanilla-approx"/"camera-sweep"
    meta=root/"camera-sweep-manifest.json"
    if not meta.is_file():raise RuntimeError("R09 camera sweep manifest missing")
    info=json.loads(meta.read_text())
    if len(info.get("captures",[]))!=3:raise RuntimeError("Three calibrated camera captures required")
    canv=Image.new("RGB",(3*280,410),(21,24,28))
    draw=ImageDraw.Draw(canv)
    for i,rec in enumerate(info["captures"]):
        p=root/rec["file"]
        if not p.is_file():raise RuntimeError("Missing camera capture "+str(p))
        with Image.open(p) as src:
            rgba=src.convert("RGBA")
        width,height=rgba.size
        measured=capture_metrics(p,(width,height))
        rec["alpha_bbox"]=measured["alpha_bbox"]
        rec["alpha_coverage"]=measured["alpha_coverage"]
        rec["clipping_risk"]=measured["touches_frame_edge"]
        alpha=rgba.getchannel("A")
        bbox=alpha.getbbox()
        # For comparison, this sheet deliberately normalizes object size.
        padding=max(4,int(max(bbox[2]-bbox[0],bbox[3]-bbox[1])*.08))
        box=(max(0,bbox[0]-padding),max(0,bbox[1]-padding),
             min(width,bbox[2]+padding),min(height,bbox[3]+padding))
        close=rgba.crop(box)
        maxw,maxh=265,350
        ratio=min(maxw/close.width,maxh/close.height)
        close=close.resize((max(1,round(close.width*ratio)),
                            max(1,round(close.height*ratio))),Image.Resampling.LANCZOS)
        x=i*280+(280-close.width)//2;y=32+(350-close.height)//2
        back=Image.new("RGBA",(close.width,close.height),(36,42,48,255))
        back.alpha_composite(close)
        canv.paste(back.convert("RGB"),(x,y))
        draw.text((i*280+12,10),rec["preset"],fill=(236,235,217))
        draw.text((i*280+10,392),"clip? "+str(measured["touches_frame_edge"]),fill=(255,185,112))
    canv.save(root/"three-angle-contact-sheet.png")
    info["comparison"]="three-angle-contact-sheet.png"
    info["selection_policy"]="human qualitative match to vanilla game reference, not computed pixel score"
    meta.write_text(json.dumps(info,indent=2)+"\n")
    print("CAMERA_SWEEP_QA",[(x["preset"],x["clipping_risk"]) for x in info["captures"]])

if __name__=="__main__":main()
