"""Compare the 64-frame Blender body cycle with private original source art.

No source images are stored in the repository or fetched remotely.
Original RGBA atlas pages are preferred. A GIF saved during an earlier
source comparison is supported as a visually useful but LOSSY reference.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

SIZE=(264,542)
ATLAS_SIZE=(2112,2168)
FRAMES=64
SOURCE_GIF_ROI=(6,6,270,548)
ROIS={"port_guard":(0,345,56,542),"starboard_guard":(208,345,264,542)}

def threshold(image, limit=128):
    return image.point([255 if i>=limit else 0 for i in range(256)])

def source_rgba_frames(atlases):
    if len(atlases)!=2:
        raise ValueError("Exactly two original RGBA atlas files are required")
    frames=[]
    for path in atlases:
        with Image.open(path) as source:
            source.load()
            if source.size!=ATLAS_SIZE:
                raise ValueError(f"Expected vanilla 2112x2168 atlas: {path}")
            img=source.convert("RGBA")
        for row in range(4):
            for col in range(8):
                frames.append(img.crop((col*SIZE[0],row*SIZE[1],
                                        (col+1)*SIZE[0],(row+1)*SIZE[1])))
    return frames,"original_rgba_atlas",None

def source_gif_frames(gif):
    # Generated side-by-side BODY + GLOW preview, not original RGBA alpha.
    frames=[]
    with Image.open(gif) as source:
        if source.n_frames!=FRAMES or source.size!=(550,588):
            raise ValueError("Expected 550x588, 64-frame private comparison GIF")
        for i in range(FRAMES):
            source.seek(i)
            frames.append(source.convert("RGB").crop(SOURCE_GIF_ROI))
    return frames,"lossy_mattegray_gif_preview",(39,44,48)

def alpha_masks(frames,bg=None):
    masks=[]
    for frame in frames:
        if bg is None:
            if frame.mode!="RGBA":
                raise ValueError("Original source frames must contain RGBA alpha")
            masks.append(threshold(frame.getchannel("A")))
        else:
            delta=ImageChops.difference(frame.convert("RGB"),
                  Image.new("RGB",SIZE,bg))
            # Use the strongest channel difference from the known
            # dark matte, not average luminance: the source's blue
            # ceramic/rim edges can be bright in only one channel.
            red,green,blue=delta.split()
            max_channel=ImageChops.lighter(ImageChops.lighter(red,green),blue)
            masks.append(threshold(max_channel,37))
    return masks

def candidate_frames(folder):
    out=[]
    for i in range(FRAMES):
        p=folder/f"body-{i:02d}.png"
        with Image.open(p) as img:
            if img.size!=SIZE:
                raise ValueError(f"Incorrect R32 native frame: {p}")
            out.append(img.convert("RGBA"))
    return out

def roi_measure(mask,rect):
    box=mask.crop(rect)
    bounds=box.getbbox()
    return {"last_row":None if bounds is None else int(rect[1]+bounds[3]-1),
            "foreground_pixels":sum(1 for n in box.tobytes() if n)}

def change_counts(masks):
    return [sum(1 for p in ImageChops.difference(masks[i],
             masks[(i+1)%FRAMES]).tobytes() if p) for i in range(FRAMES)]

def motion_map(masks):
    """Count, per native pixel, binary alpha edge changes over 64 transitions."""
    counts=[0]*(SIZE[0]*SIZE[1])
    for i in range(FRAMES):
        delta=ImageChops.difference(masks[i],masks[(i+1)%FRAMES]).tobytes()
        for pixel,value in enumerate(delta):
            if value:counts[pixel]+=1
    return counts

def spatial_motion_activity(counts):
    result={}
    w=SIZE[0]
    for label,start,stop in (("upper_machine",0,280),
                              ("attachment_roots",280,375),
                              ("bell_throat_and_side_guards",375,475),
                              ("lower_lips_and_guard_tips",475,542)):
        result[label]=sum(counts[start*w:stop*w])
    return result

def render_motion_overlay(frame,counts):
    base=Image.new("RGBA",SIZE,(39,44,48,255))
    base.alpha_composite(frame.convert("RGBA"))
    r,g,b=base.convert("RGB").split()
    peak=max(1,max(counts))
    heat=Image.frombytes("L",SIZE,bytes(min(255,round(x*255/peak)) for x in counts))
    red=ImageChops.lighter(r.point(lambda v:round(v*.45)),heat)
    green=ImageChops.lighter(g.point(lambda v:round(v*.45)),
                            heat.point(lambda v:round(v*.40)))
    blue=b.point(lambda v:round(v*.45))
    return Image.merge("RGB",(red,green,blue))

def compare(source,candidate,source_kind,source_bg,out):
    if len(source)!=FRAMES or len(candidate)!=FRAMES:
        raise ValueError("All 64 indexed frames required")
    out.mkdir(parents=True,exist_ok=True)
    source_masks=alpha_masks(source,source_bg)
    model_masks=alpha_masks(candidate)
    pairs=[]
    for i in range(FRAMES):
        src=source_masks[i];mod=model_masks[i]
        intersection=ImageChops.multiply(src,mod)
        union=ImageChops.lighter(src,mod)
        overlap=sum(1 for p in intersection.tobytes() if p)
        population=sum(1 for p in union.tobytes() if p)
        measured=round(overlap/max(1,population),5)
        pairs.append({"frame":i,
            "silhouette_iou":measured if source_bg is None else None,
            "preview_only_iou":measured if source_bg is not None else None,
            "source_guards":{k:roi_measure(src,v) for k,v in ROIS.items()},
            "candidate_guards":{k:roi_measure(mod,v) for k,v in ROIS.items()}})
    source_movement=change_counts(source_masks) if source_bg is None else None
    model_movement=change_counts(model_masks)
    meanscore=round(sum(
        q["silhouette_iou" if source_bg is None else "preview_only_iou"]
        for q in pairs)/64,5)
    source_map=motion_map(source_masks) if source_bg is None else None
    model_map=motion_map(model_masks)
    results={"status":"DIAGNOSTIC_ONLY_NO_3D_GEOMETRY_APPROVAL",
             "source_kind":source_kind,
             "source_registration":"original 264x542 cell and fixed Blender canvas; no translation optimization",
             "source_reference_caveat":(
                "GIF-derived reference is lossy, background-flattened and color-quantized. "
                "Motion/boundary stats are approximate. Supply two original RGBA atlases "
                "for strict alpha comparisons."
                if source_bg is not None else
                "Original RGBA alpha available; physical 3D remains ambiguous."),
             "frames":pairs,
             "mean_source_changed_mask_pixels":(
                 round(sum(source_movement)/64,3) if source_movement is not None else None),
             "mean_model_changed_mask_pixels":round(sum(model_movement)/64,3),
             "source_frame_mask_changes":source_movement,
             "model_frame_mask_changes":model_movement,
             "mean_unaligned_silhouette_iou":meanscore if source_bg is None else None,
             "preview_only_unreliable_iou":meanscore if source_bg is not None else None,
             "source_images_in_repo":False,
             "source_motion_band_counts":spatial_motion_activity(source_map) if source_map else None,
             "model_motion_band_counts":spatial_motion_activity(model_map)}
    selected=[0,8,16,24,32,40,48,56]
    w,h=SIZE
    contact=Image.new("RGB",(w*4,(h+20)*4),(24,29,34))
    d=ImageDraw.Draw(contact)
    for index,fid in enumerate(selected):
        x=(index%2)*w*2;y=(index//2)*(h+20)
        src=source[fid].convert("RGBA");dst=candidate[fid]
        for j,img in enumerate((src,dst)):
            canvas=Image.new("RGBA",SIZE,(39,44,48,255))
            if source_bg is not None and j==0:
                canvas=src
            else:
                canvas.alpha_composite(img)
            contact.paste(canvas.convert("RGB"),(x+j*w,y))
        d.text((x+8,y+h+3),f"source {fid:02d}",fill="white")
        d.text((x+w+8,y+h+3),f"Blender {fid:02d}",fill="white")
    contact.save(out/"eight-frame-source-blender-pairs.png")
    # A GIF preview has no trustworthy original RGBA alpha for motion.
    if source_map is not None:
        heat=Image.new("RGB",(SIZE[0]*2,SIZE[1]+22),(24,29,34))
        heat.paste(render_motion_overlay(source[0],source_map),(0,0))
        heat.paste(render_motion_overlay(candidate[0],model_map),(SIZE[0],0))
        labels=ImageDraw.Draw(heat)
        labels.text((5,SIZE[1]+4),"Original 64-frame alpha movement",fill="white")
        labels.text((SIZE[0]+5,SIZE[1]+4),"Editable Blender alpha movement",fill="white")
        heat.save(out/"source-vs-blender-alpha-motion-heatmap.png")
    (out/"source-vs-blender-motion.json").write_text(json.dumps(results,indent=2)+"\n")
    return results

def main():
    parser=argparse.ArgumentParser()
    basis=parser.add_mutually_exclusive_group(required=True)
    basis.add_argument("--source-gif",type=Path)
    basis.add_argument("--source-atlases",nargs=2,type=Path)
    parser.add_argument("--blender-cycle",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    source,kind,bg=(source_gif_frames(args.source_gif) if args.source_gif
                    else source_rgba_frames(args.source_atlases))
    report=compare(source,candidate_frames(args.blender_cycle),kind,bg,args.output)
    print("SOURCE_VS_BLENDER_R34",report["source_kind"],
          "intersection-over-union",report["mean_unaligned_silhouette_iou"],
          "avg_alpha_change",report["mean_source_changed_mask_pixels"],
          report["mean_model_changed_mask_pixels"])
if __name__=="__main__": main()
