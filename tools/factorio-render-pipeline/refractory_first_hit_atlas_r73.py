"""R73 model-only native-pixel first-hit atlas of real R66/R71 refractory geometry.

No original sprite content, no inferred geometry, no altered Blender scene.
The first-hit maps are artificial diagnostic colors, never art references.
"""
import argparse,json,sys
from collections import Counter
from hashlib import sha256
from pathlib import Path
root=str(Path(__file__).resolve().parent)
if root not in sys.path:sys.path.insert(0,root)
import bpy
from mount_occlusion_diagnostic_r51 import camera_ray
from refractory_shingle_depth_r60 import LINER,NATIVE
from physical_stamped_refractory_candidate_r71 import REVISION as R71_REV,SOURCE_R66_SHA

ROI=(48,218,395,512)
PALETTE={
    "near":(.12,.82,.70,1),"mid":(.32,.55,.98,1),
    "liner":(.63,.63,.63,1),"baffle":(.98,.53,.16,1),
    "vane":(.80,.36,.75,1),"lip":(.94,.84,.26,1),
    "other":(.64,.20,.20,1),"none":(.03,.03,.04,1),
}
def category(name):
    if name.startswith("R19_NEAR_MOUTH_TILE_"):return "near"
    if name.startswith("R19_MID_STAGGERED_TILE_"):return "mid"
    if name==LINER:return "liner"
    if name.startswith("R11_recessed_internal_pressure_baffle_"):return "baffle"
    if name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_"):return "vane"
    if "rolled_lip" in name:return "lip"
    if name=="<NO_HIT>":return "none"
    return "other"

def capture(blend,label,out):
    path=Path(blend).resolve()
    original_sha=sha256(path.read_bytes()).hexdigest()
    if label=="baseline" and original_sha!=SOURCE_R66_SHA:
        raise RuntimeError("Incorrect R66 original persisted geometry")
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    if scene.camera is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("Expected calibrated Blender orthographic source camera")
    if label!="baseline" and (scene.get("fsc_r71_revision")!=R71_REV or
                               scene.get("fsc_r71_original_sprite_approved")!=False):
        raise RuntimeError("R71 model candidate revision/approval invalid")
    scene.frame_set(1)
    scene.render.resolution_x,scene.render.resolution_y=NATIVE
    scene.render.resolution_percentage=100
    bpy.context.view_layer.update()
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    scale=float(scene.camera.data.ortho_scale)
    names={ob.name for ob in scene.objects}
    dg=bpy.context.evaluated_depsgraph_get()
    x0,x1,y0,y1=ROI
    width,height=x1-x0,y1-y0
    pixels=[0.]*(width*height*4)
    ids=[]
    counts=Counter()
    bands={}
    for y in range(y0,y1):
        row=Counter()
        for x in range(x0,x1):
            orig,direction=camera_ray(scene.camera,scene,x,y)
            hit,point,normal,face,obj,matrix=scene.ray_cast(
                dg,orig,direction,distance=300.)
            name=obj.name if hit else "<NO_HIT>"
            ids.append(name)
            counts[name]+=1
            group=category(name)
            row[group]+=1
            i=((height-1-(y-y0))*width+(x-x0))*4
            pixels[i:i+4]=PALETTE[group]
        key=str(y0+((y-y0)//16)*16)
        if key not in bands:bands[key]=Counter()
        bands[key].update(row)
    image=bpy.data.images.new("R73_"+label,width=width,height=height,alpha=True)
    image.pixels.foreach_set(pixels)
    image.file_format="PNG"
    png=out/("MODEL_ONLY_native_first_hit_"+label+".png")
    image.filepath_raw=str(png)
    image.save()
    bpy.data.images.remove(image)
    if sum(counts.values())!=width*height or len(ids)!=width*height:
        raise RuntimeError("Native pixel first-hit capture incomplete")
    if (tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera or
        float(scene.camera.data.ortho_scale)!=scale or
        {ob.name for ob in scene.objects}!=names or
        sha256(path.read_bytes()).hexdigest()!=original_sha):
        raise RuntimeError("Diagnostic damaged original editable 3D scene")
    family=Counter()
    for name,n in counts.items():family[category(name)]+=n
    return {"variant":label,"original_model_sha256":original_sha,
        "source_model_unmodified":True,"original_camera_matrix":camera,
        "original_camera_ortho_scale":scale,"native_size":NATIVE,
        "native_roi_xyxy":(x0,y0,x1,y1),
        "rays":len(ids),"native_object_id_png":png.name,
        "first_hit_group_counts":dict(family),
        "first_hit_mesh_counts":dict(counts.most_common()),
        "group_per_16px_native_y":{k:dict(v) for k,v in bands.items()},
        "original_factorio_sprite_in_output":False},ids

def changes(a,b):
    c=Counter((category(x),category(y)) for x,y in zip(a,b) if x!=y)
    return {"changed_first_hit_mesh_pixels":sum(c.values()),
            "changes_by_mesh_group":{x+" => "+y:n for (x,y),n in c.most_common()},
            "new_R19_exposure_from_R11_liner":sum(
                n for (x,y),n in c.items()
                if x=="liner" and y in ("near","mid")),
            "new_R19_exposure_from_R11_baffle":sum(
                n for (x,y),n in c.items()
                if x=="baffle" and y in ("near","mid"))}

def run(a,b,c,out):
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    records=[];maps=[]
    for path,label in ((a,"baseline"),(b,"emboss_042"),(c,"emboss_075")):
        r,m=capture(path,label,out);records.append(r);maps.append(m)
    cameras={(tuple(r["original_camera_matrix"]),
              r["original_camera_ortho_scale"]) for r in records}
    if len(cameras)!=1:raise RuntimeError("Inconsistent native source-camera rig")
    result={"revision":"R73_real_native_model_only_occlusion",
        "genuine_original_sprite_available":False,
        "art_fidelity_or_geometry_approved":False,
        "zero_source_art_exported":True,
        "variants":records,
        "baseline_to_042":changes(maps[0],maps[1]),
        "baseline_to_075":changes(maps[0],maps[2])}
    (out/"MODEL_ONLY_R73_real_occlusion.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R73_NATIVE_FIRST_HIT_THREE_REAL_SCENES_PASS",
          [(r["variant"],r["first_hit_group_counts"]) for r in records],flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--baseline",type=Path,required=True)
    p.add_argument("--emboss-042",type=Path,required=True)
    p.add_argument("--emboss-075",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    x=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(x.baseline,x.emboss_042,x.emboss_075,x.out)
