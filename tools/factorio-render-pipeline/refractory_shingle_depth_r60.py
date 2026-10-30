"""R60: reveal original R19 physically formed nozzle scales through R11 liner.

R59 saved-camera first-hit raycast proved original R42 exterior shell is
NOT the dominant obstruction in the source-shaped lower nozzle ROI: 26/~
1400 sampled rays shell vs 346 original R11 liner and 442 existing R19
physical scales. Radial changes to R42 intermediate rings changed only
2-6 shell hits, zero R19 hits. Do not pursue a false shell reprofile.

The original source has staggered exposed overlapping refractory shingle
surfaces at the near-mouth + mid-bell area. Physically LIFT the existing
80 original R19 24-vertex thick plate meshes a little outward from their
current recessed R11 location, preserving all four original R19 material
families, curved 40 strakes, existing fluted R11 mesh, 3 mounted fins,
2 central lugs, 64-frame lower animation, calibrated camera and actual
source lighting. This is a reversible sweep, not a finished asset.
Original Factorio bitmap is not included in any public output.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json,math
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mount_occlusion_diagnostic_r51 import NATIVE,camera_ray,render
from hanging_fin_candidate_r58 import REVISION as R58_REV,verify
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION

REVISION="R60_source_refractory_shingle_exposure_geometry"
COLLECTION="R19_EDITABLE_OPEN_CONE_INTERIOR"
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT"
AXIS_Z=-.43
ROI=(48,218,395,512)
# near and mid offsets relative to the persisted R58 3D tile positions.
PAIRS=((0.,0.),(.04,.04),(.08,.06),(.12,.09),(.16,.12),(.20,.15),
       (.08,.14),(.14,.04))
ROW_RELIEF=(.88,1.00,1.00,.92)

def original_tiles(scene):
    col=bpy.data.collections.get(COLLECTION)
    if col is None or len(col.objects)!=160:raise RuntimeError("R60 original R19 160 part anatomy missing")
    result={};mats={}
    for kind,prefix in (("near","R19_NEAR_MOUTH_TILE_"),("mid","R19_MID_STAGGERED_TILE_")):
        for i in range(40):
            name=prefix+f"{i:02d}"
            obj=col.objects.get(name)
            if obj is None or obj.type!="MESH" or len(obj.data.vertices)!=24 or len(obj.data.materials)!=1 or obj.data.shape_keys:
                raise RuntimeError("R60 original R19 24-vertex shingle missing: "+name)
            result[name]=(obj,kind,tuple(tuple(v.co) for v in obj.data.vertices))
            mats[name]=obj.data.materials[0].name
    if len(result)!=80:raise RuntimeError("R60 must preserve exactly 80 physical shingles")
    return result,mats

def shift_tiles(tiles,near,mid):
    for name,(obj,kind,points) in tiles.items():
        offset=near if kind=="near" else mid
        for v,(x,y,z) in zip(obj.data.vertices,points):
            radial=math.hypot(x,z-AXIS_Z)
            row=(v.index%12)//3
            angle=math.atan2(z-AXIS_Z,x)
            raised=radial+offset*ROW_RELIEF[row]
            if raised>=1.96 or raised<.15:
                raise RuntimeError("R60 cannot bridge or close original open throat")
            v.co=(raised*math.cos(angle),y,
                  AXIS_Z+raised*math.sin(angle))
        obj.data.update()

def actual_first_hits(scene):
    scene.view_layers[0].update()
    dg=bpy.context.evaluated_depsgraph_get()
    x0,x1,y0,y1=ROI
    counts=Counter();rowsets={}
    for row_y in range(y0,y1,16):
        hits=Counter()
        for y in range(row_y,min(row_y+16,y1),4):
            for x in range(x0,x1,4):
                origin,direction=camera_ray(scene.camera,scene,x,y)
                hit,point,normal,face,obj,matrix=scene.ray_cast(
                    dg,origin,direction,distance=300.)
                hits[obj.name if hit else "<NO_HIT>"]+=1
        for k,v in hits.items():counts[k]+=v
        rowsets[str(row_y)]={"R19_tile_hits":sum(v for k,v in hits.items()
                                                  if k.startswith("R19_NEAR_MOUTH_TILE_") or k.startswith("R19_MID_STAGGERED_TILE_")),
                             "R11_liner_hits":hits[LINER],
                             "samples":sum(hits.values())}
    near=sum(v for k,v in counts.items() if k.startswith("R19_NEAR_MOUTH_TILE_"))
    mid=sum(v for k,v in counts.items() if k.startswith("R19_MID_STAGGERED_TILE_"))
    return {"sample_size":sum(counts.values()),"ROI":list(ROI),
            "physical_near_tile_first_hits":near,
            "physical_mid_tile_first_hits":mid,
            "R11_liner_first_hits":counts[LINER],
            "per_native_y_band":rowsets,
            "mesh_hit_histogram":dict(counts.most_common(35))}

def run(out):
    src=out/"test-04-vanilla-approx"/"physically-connected-fin-r58"/"source_connected_hanging_fins_r58.blend"
    if not src.is_file():raise RuntimeError("R60 requires saved and reopened R58 .blend")
    baseline_sha=sha256(src.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene
    if scene.get("fsc_r58_revision")!=R58_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R60 source-connected scene not R58")
    oldcamera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    verify(scene,oldcamera)
    liner=bpy.data.objects.get(LINER)
    if liner is None or not liner.get("R11_open_no_endcaps") or len(liner.data.polygons)!=480:
        raise RuntimeError("R60 R11 actual fluted open liner missing")
    tiles,materials=original_tiles(scene)
    before_names={x.name for x in scene.objects}
    original=(scene.render.resolution_x,scene.render.resolution_y,
              scene.render.resolution_percentage,scene.render.filepath,
              scene.render.image_settings.file_format,
              scene.render.image_settings.color_mode,
              scene.cycles.samples,scene.frame_current)
    dest=out/"test-04-vanilla-approx"/"original-refractory-shingles-r60"
    dest.mkdir(parents=True,exist_ok=True)
    data={"revision":REVISION,"original_r58_blend_sha256":baseline_sha,
          "source_original_rgba_exported":False,
          "original_tile_meshes_not_replaced":True,"saved_scene_unchanged":True,
          "two_tile_rows":80,"native_size":list(NATIVE),"variants":[]}
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        for near,mid in PAIRS:
            shift_tiles(tiles,near,mid)
            scene.view_layers[0].update()
            stats=actual_first_hits(scene)
            filename=f"near_{near:.2f}_mid_{mid:.2f}".replace(".","_")+".png"
            render(scene,dest/filename)
            data["variants"].append({"near_tile_outward_tiles":near,
                                     "mid_tile_outward_tiles":mid,
                                     "native_png":filename,
                                     "actual_first_hits":stats})
            print("R60_SOURCE_TILE_EXPOSURE",near,mid,
                  stats["physical_near_tile_first_hits"],
                  stats["physical_mid_tile_first_hits"],
                  stats["R11_liner_first_hits"],flush=True)
    finally:
        for name,(obj,kind,pts) in tiles.items():
            for v,pt in zip(obj.data.vertices,pts):v.co=pt
            obj.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=original
        scene.frame_set(frame)
        scene.view_layers[0].update()
    data["restored_original_geometry"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                for v,pt in zip(obj.data.vertices,pts))
            for name,(obj,kind,pts) in tiles.items())
        and all(tiles[name][0].data.materials[0].name==mat for name,mat in materials.items())
        and all(joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                                bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])<=MAX_ROOT_CONNECTION
                for i in MAIN)
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==oldcamera
        and {o.name for o in scene.objects}==before_names
        and sha256(src.read_bytes()).hexdigest()==baseline_sha)
    if not data["restored_original_geometry"]:
        raise RuntimeError("R60 damaged original saved nozzle or mount")
    (dest/"original-shingle-depth-sweep.json").write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
    print("R60_SOURCE_EDITABLE_SCENE_RESTORED",len(data["variants"]),flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
