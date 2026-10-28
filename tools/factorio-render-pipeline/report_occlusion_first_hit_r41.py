"""R41 summarize actual Blender camera first-hit and reversible A/B images."""
from pathlib import Path
import json,argparse
from PIL import Image,ImageDraw
def summarize(folder):
    data=json.loads((folder/"raycast-first-hit.json").read_text())
    if not data.get("temporary_visibility_restored"):
        raise RuntimeError("R41 source scene visibility was not restored")
    n=sum(data["original_scene_mesh_first_hit_histogram"].values())
    if n<100:
        raise RuntimeError("R41 insufficient actual Blender camera rays")
    filenames=["baseline.png"]
    if data.get("dominant_non_r19_non_liner_mesh"):
        filenames.append("dominant_first_hit_hidden.png")
    canvas=Image.new("RGB",(264*len(filenames),542+28),(31,36,40))
    draw=ImageDraw.Draw(canvas)
    lumas={}
    for i,filename in enumerate(filenames):
        with Image.open(folder/filename) as src:
            if src.size!=(264,542):
                raise RuntimeError("R41 rendered wrong original native dimensions")
            img=src.convert("RGBA")
        crop=img.crop((55,410,208,455))
        vals=[(.2126*r+.7152*g+.0722*b)/255. for r,g,b,a in crop.getdata() if a>=128]
        lumas[filename]=round(sum(vals)/max(1,len(vals)),6)
        background=Image.new("RGBA",(264,542),(39,44,48,255))
        background.alpha_composite(img)
        canvas.paste(background.convert("RGB"),(i*264,0))
        draw.text((i*264+2,546),filename.replace(".png",""),fill="white")
    canvas.save(folder/"dominant-occluder-original-camera-A-B.png")
    summary={"first_hit_total_rays":n,
             "dominant_occluder":data.get("dominant_non_r19_non_liner_mesh"),
             "upper_region_means":lumas,
             "diagnostic_only":True}
    (folder/"readback.json").write_text(json.dumps(summary,indent=2)+"\n")
    print("R41_FIRST_HIT_READBACK_PASS",json.dumps(summary),flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,required=True)
    summarize(p.parse_args().output.resolve())
