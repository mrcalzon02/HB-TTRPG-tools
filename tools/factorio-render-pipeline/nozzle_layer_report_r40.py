"""R40 reads REAL fixed-camera Blender layer images; does not fake scenes."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

NAMES=("full_engine","open_liner_only","liner_plus_R19","liner_R19_and_reaction_drum")
ROI=(55,410,208,455)

def summarize(directory):
    meta=json.loads((directory/"layer-manifest.json").read_text())
    if not meta.get("restored_every_original_visibility_flag") or (
        len(meta.get("rendered_layers",[]))!=4):
        raise RuntimeError("R40 must restore and render all original source layers")
    frames=[]
    metrics={}
    for name in NAMES:
        with Image.open(directory/(name+".png")) as original:
            if original.size!=(264,542):
                raise RuntimeError("R40 must use original native source canvas")
            im=original.convert("RGBA")
        crop=im.crop(ROI)
        alpha=list(crop.getchannel("A").getdata())
        pixels=list(crop.getdata())
        visible=[c for c,a in zip(pixels,alpha) if a>=128]
        if not visible:
            raise RuntimeError("R40 original liner diagnostic yielded no visible geometry")
        mean=sum((.2126*v[0]+.7152*v[1]+.0722*v[2])/255.
                 for v in visible)/len(visible)
        metrics[name]={"mean_luma_visible":round(mean,6),
                       "opaque_pixels":len(visible)}
        frames.append(im)
    sheet=Image.new("RGB",(264*4,542+26),(32,36,40))
    draw=ImageDraw.Draw(sheet)
    for i,(name,im) in enumerate(zip(NAMES,frames)):
        backdrop=Image.new("RGBA",im.size,(39,44,48,255))
        backdrop.alpha_composite(im)
        sheet.paste(backdrop.convert("RGB"),(i*264,0))
        draw.text((i*264+3,545),name,fill="white")
    sheet.save(directory/"four-layer-native-camera-comparison.png")
    results={"revision":meta["revision"],
             "roi_xyxy":list(ROI),"per_layer":metrics,
             "source_sprite_not_included":True,
             "acceptance":"visibility diagnosis only, not likeness match"}
    (directory/"layer-qa.json").write_text(json.dumps(results,indent=2)+"\n")
    print("R40_VERIFIED_LAYER_VISIBILITY_MEASUREMENTS",json.dumps(metrics),flush=True)
    return results

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    summarize(args.output.resolve()/"test-04-vanilla-approx"/"nozzle-layer-isolation-r40")
if __name__=="__main__":main()
