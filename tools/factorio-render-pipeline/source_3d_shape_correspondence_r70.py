"""R70: ORIGINAL Factorio sprite vs real 3D rendering SHAPE correspondence.

NOT a motion-footprint or feature-count score. Compare the actual form,
length, width, position, contour, openings and apparent surface color of
the 3D candidate with the USER'S ORIGINAL full-resolution 64-frame RGBA
thruster sprite. Use only two original local atlas pages, NEVER web
references, guessed images, or model-vs-model comparisons.

Part ROIs are merely feature localization from the previously documented
original sprite; overlapping source-colored pixels can be other geometry.
A silhouette match is NOT sufficient to prove the correct 3D physical shape.
Review actual original/candidate pixel pairs, then edit corresponding
physical mesh topology, not the camera or the frame to disguise mismatch.

Private local execution ONLY. Source/candidate comparison images must NEVER
be uploaded into public GitHub Actions artifacts or committed.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from statistics import mean
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter
from source_vs_native_capture_r34 import SIZE, FRAMES, source_rgba_frames, candidate_frames

ORIGINAL_ZIP_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Regions and pixel ranges were measured from the actual user-provided
# original sprite and recorded in SOURCE_VISIBLE_GEOMETRY_R27.md and
# MOUNT_CALIBRATION_R51_R52.md. These boxes are NOT 3D topology solutions.
FEATURES={
    "left_corrugated_upper_bellows":(50,0,97,57),
    "right_corrugated_upper_bellows":(155,0,199,60),
    "upper_engine_chassis_pipes":(61,172,201,339),
    "left_bespoke_sloped_cream_cast":(27,314,90,358),
    "center_bespoke_two_ear_bridge":(95,311,163,339),
    "right_bespoke_offset_cream_cast":(166,313,220,356),
    "independent_hanging_heat_stained_fins":(39,340,224,438),
    "large_deep_fluted_bell_and_throat":(29,395,235,523),
    "left_cupped_lower_guard_underside":(8,374,66,520),
    "right_cupped_lower_guard_underside":(197,374,258,520),
}
# ImageL value 0|255 threshold. Same alpha convention as original R34.
ALPHA_THRESHOLD=128
EDGE_TOLERANCE_PIXELS=2
SELECTED=(0,8,16,24,32,40,48,56)

def threshold_alpha(im):
    return im.getchannel("A").point(
       [255 if i>=ALPHA_THRESHOLD else 0 for i in range(256)])

def foreground_set(mask):
    return sum(p!=0 for p in mask.tobytes())

def boundary(mask):
    # 1px 8-neighbour silhouette edge, not photometric 'lighting' edges.
    # Cropping to a fixed ROI can create boundary edges; the same treatment
    # is applied to original and candidate, with no shifting or alignment.
    dilated=mask.filter(ImageFilter.MaxFilter(3))
    eroded=mask.filter(ImageFilter.MinFilter(3))
    return ImageChops.difference(dilated,eroded)

def intersection(a,b):
    return foreground_set(ImageChops.multiply(a,b))

def centroid_and_profile(mask):
    bounds=mask.getbbox()
    if bounds is None:
        return {"bbox_local":None,"centroid_local":None,
                "width_by_native_8px_row":[],"filled":0}
    w,h=mask.size
    pix=mask.tobytes()
    xs=ys=count=0
    profile=[]
    for y in range(h):
        row=pix[y*w:(y+1)*w]
        selected=[x for x,p in enumerate(row) if p]
        for x in selected:xs+=x;ys+=y
        count+=len(selected)
        if y%8==0:
            profile.append({"y_local":y,"width":(
                max(selected)-min(selected)+1 if selected else 0),
                "coverage":len(selected)})
    return {"bbox_local":list(bounds),
            "centroid_local":[round(xs/count,2),round(ys/count,2)] if count else None,
            "width_by_native_8px_row":profile,"filled":count}

def region_shape_stats(original,candidate,rect):
    if original.size!=SIZE or candidate.size!=SIZE:
        raise ValueError("Only original 264x542 native body frames supported")
    sr=original.crop(rect)
    cr=candidate.crop(rect)
    s=threshold_alpha(sr)
    c=threshold_alpha(cr)
    ns=foreground_set(s)
    nc=foreground_set(c)
    both=intersection(s,c)
    union=ns+nc-both
    # Edge accuracy measured without translation optimization, allowing
    # two native pixels tolerance for antialiasing.
    se=boundary(s)
    ce=boundary(c)
    s_edge=foreground_set(se)
    c_edge=foreground_set(ce)
    allowed_c=ce.filter(ImageFilter.MaxFilter(EDGE_TOLERANCE_PIXELS*2+1))
    allowed_s=se.filter(ImageFilter.MaxFilter(EDGE_TOLERANCE_PIXELS*2+1))
    edge_recall=intersection(se,allowed_c)/s_edge if s_edge else None
    edge_precision=intersection(ce,allowed_s)/c_edge if c_edge else None
    source_profile=centroid_and_profile(s)
    model_profile=centroid_and_profile(c)
    # True RGB disagreement for both-opaque native pixels only. This is
    # surface color/shading evidence, NOT a 3D topology proof.
    pxs=sr.convert("RGBA").tobytes()
    pxc=cr.convert("RGBA").tobytes()
    sm=s.tobytes();cm=c.tobytes()
    overlap_rgb=[abs(pxs[i*4+k]-pxc[i*4+k])
                 for i in range(len(sm)) if sm[i] and cm[i]
                 for k in range(3)]
    color_error=round(mean(overlap_rgb),3) if overlap_rgb else None
    # Every eight native rows: source and candidate actual silhouette widths.
    original_widths=source_profile["width_by_native_8px_row"]
    candidate_widths=model_profile["width_by_native_8px_row"]
    widths=[{"y_local":o["y_local"],"source_width":o["width"],
             "candidate_width":m["width"],
             "signed_candidate_minus_source":m["width"]-o["width"]}
            for o,m in zip(original_widths,candidate_widths)]
    return {
        "region_native_xyxy":list(rect),
        "source_foreground_pixels":ns,
        "candidate_foreground_pixels":nc,
        "silhouette_overlap_iou":round(both/union,5) if union else None,
        "candidate_foreground_precision":round(both/nc,5) if nc else None,
        "source_shape_recall":round(both/ns,5) if ns else None,
        "source_boundary_coverage_within_2px":round(edge_recall,5) if edge_recall is not None else None,
        "candidate_boundary_precision_within_2px":round(edge_precision,5) if edge_precision is not None else None,
        "mean_absolute_rgb_error_on_mutual_foreground":color_error,
        "source_shape":source_profile,
        "candidate_shape":model_profile,
        "silhouette_width_by_original_native_y":widths,
    }

def make_private_contact_page(original,candidate,regions,frame_number,path):
    # Actual original source on LEFT and actual Blender candidate on RIGHT.
    # No rescale, no fake official/artwork, no replacement internet photos.
    width=SIZE[0]*2
    panel_height=max(r[3]-r[1] for r in regions.values())
    line_height=28
    canvas=Image.new("RGB",(width,(panel_height+line_height)*len(regions)),(20,24,28))
    draw=ImageDraw.Draw(canvas)
    for n,(name,box) in enumerate(regions.items()):
        y=n*(panel_height+line_height)
        src=original.crop(box).convert("RGBA")
        cand=candidate.crop(box).convert("RGBA")
        for side,img in enumerate((src,cand)):
            backdrop=Image.new("RGBA",img.size,(39,44,48,255))
            backdrop.alpha_composite(img)
            canvas.paste(backdrop.convert("RGB"),(side*SIZE[0],y))
        draw.text((4,y+panel_height+3),
                  "ORIGINAL "+name+" frame "+str(frame_number),fill=(240,230,195))
        draw.text((SIZE[0]+4,y+panel_height+3),
                  "3D CANDIDATE (NOT APPROVED)",fill=(240,230,195))
    path.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(path)

def compare(source_pages,cycle,out,source_zip=None):
    original,kind,backdrop=source_rgba_frames(source_pages)
    if kind!="original_rgba_atlas" or backdrop is not None or len(original)!=FRAMES:
        raise RuntimeError("Source must be two TRUE original 8x4 RGBA sprite pages")
    candidate=candidate_frames(Path(cycle))
    if source_zip:
        digest=sha256(Path(source_zip).read_bytes()).hexdigest()
        if digest!=ORIGINAL_ZIP_SHA256:
            raise RuntimeError("Source archive is not the authenticated original thruster.zip")
        archive_verified=True
    else:
        archive_verified=False
    out=Path(out).resolve()
    out.mkdir(parents=True,exist_ok=True)
    totals={key:[] for key in FEATURES}
    selected={}
    for frame in range(FRAMES):
        for name,rect in FEATURES.items():
            measurements=region_shape_stats(original[frame],candidate[frame],rect)
            totals[name].append(measurements)
            if frame in SELECTED:
                selected.setdefault(str(frame),{})[name]=measurements
        if frame in SELECTED:
            # Original source imagery is PRIVATE and cannot enter public CI.
            make_private_contact_page(original[frame],candidate[frame],
                                      FEATURES,frame,out/("PRIVATE_original_3D_shapes_%02d.png"%frame))
    overview={}
    def measured_mean(rows,key):
        values=[s[key] for s in rows if s[key] is not None]
        return round(mean(values),5) if values else None
    for name,stats in totals.items():
        overview[name]={
            "source_measured_region":list(FEATURES[name]),
            "mean_original_silhouette_iou":measured_mean(stats,"silhouette_overlap_iou"),
            "mean_source_shape_recall":measured_mean(stats,"source_shape_recall"),
            "mean_boundary_coverage_2px":measured_mean(stats,"source_boundary_coverage_within_2px"),
            "mean_rgb_difference_shared_material_pixels":(
                round(mean(s["mean_absolute_rgb_error_on_mutual_foreground"]
                           for s in stats
                           if s["mean_absolute_rgb_error_on_mutual_foreground"] is not None),3)
                if any(s["mean_absolute_rgb_error_on_mutual_foreground"] is not None for s in stats)
                else None),
        }
    result={
        "status":"PRIVATE_ORIGINAL_SPRITE_TO_ACTUAL_3D_APPEARANCE_DIAGNOSTIC",
        "original_64_rgba_frames_compared":True,
        "original_sprite_zip_sha_verified":archive_verified,
        "only_original_user_supplied_sprite_used":True,
        "external_internet_reference_images_used":False,
        "three_dimensional_mesh_geometry_automatically_approved":False,
        "candidate_frame_count":64,
        "source_original_frame_dimensions":list(SIZE),
        "no_auto_camera_cropping_scaling_or_translation":True,
        "all_regions":overview,
        "eight_source_indexed_detailed_3d_shape_comparisons":selected,
        "source_rgb_is_not_the_glow_layer":True,
        "original_private_source_comparisons_must_never_be_published":True,
    }
    (out/"PRIVATE_original_3D_shape_correspondence.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R70_REAL_ORIGINAL_3D_SHAPE_AND_MATERIAL_CORRESPONDENCE_AVAILABLE",
          "64 frames",len(FEATURES),"source regions",flush=True)
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-atlases",nargs=2,type=Path,required=True)
    p.add_argument("--source-archive",type=Path)
    p.add_argument("--candidate-cycle",type=Path,required=True)
    p.add_argument("--private-output",type=Path,required=True)
    a=p.parse_args()
    compare(a.source_atlases,a.candidate_cycle,a.private_output,a.source_archive)

if __name__=="__main__":
    main()
