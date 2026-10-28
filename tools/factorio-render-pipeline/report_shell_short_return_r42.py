"""Compare R42 candidate to REAL R40 baseline, never to synthetic reference."""
import argparse,json
from pathlib import Path
from PIL import Image,ImageDraw
ROI=(55,410,208,455)
def stat(path):
    with Image.open(path) as im:
        if im.size!=(264,542):raise RuntimeError("R42 native camera dimensions changed")
        pixels=list(im.convert("RGBA").crop(ROI).getdata())
    vals=[(.2126*r+.7152*g+.0722*b)/255. for r,g,b,a in pixels if a>=128]
    return round(sum(vals)/max(1,len(vals)),6)
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--artifact-root",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    src=a.artifact_root.resolve()/"capture-output/test-04-vanilla-approx/nozzle-layer-isolation-r40/full_engine.png"
    candidate=a.output.resolve()/"r42_candidate_native.png"
    before=stat(src);after=stat(candidate)
    panels=[]
    for path in (src,candidate):
        with Image.open(path) as im:
            bg=Image.new("RGBA",(264,542),(39,44,48,255))
            bg.alpha_composite(im.convert("RGBA"))
            panels.append(bg.convert("RGB"))
    contact=Image.new("RGB",(528,567),(30,35,39))
    for i,im in enumerate(panels):contact.paste(im,(264*i,0))
    labels=ImageDraw.Draw(contact)
    labels.text((4,545),"R40 true original Blender",fill="white")
    labels.text((269,545),"R42 same original camera",fill="white")
    contact.save(a.output.resolve()/"r40_vs_r42_native.png")
    results={"original_rgba_source_target_upper_luma":.069579,
             "r40_original_blender_upper_luma":before,
             "r42_same_camera_candidate_upper_luma":after,
             "luma_absolute_target_error_pre":round(abs(.069579-before),6),
             "luma_absolute_target_error_candidate":round(abs(.069579-after),6),
             "source_blend_modified":False,"render_only":True}
    (a.output.resolve()/"r42-source-relative-qa.json").write_text(json.dumps(results,indent=2)+"\n")
    print("R42_REAL_SAME_CAMERA_A_B",json.dumps(results),flush=True)
if __name__=="__main__":main()
