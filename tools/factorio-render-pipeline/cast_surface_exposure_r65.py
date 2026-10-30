"""R65: isolate the original cream casting's *front metal*, not a ring.

R64 verified real cast-to-upper-hull stays, but R64's first-hit samples showed
the original three source-specific castings are STILL substantially hidden.
Do a REVERSIBLE physical surface-only sweep on the existing R49 cast shell
vertices, rather than enlarging blue fins, adding a fake picture/duplicate
collar, changing camera, or inventing mounts for all ten slots.

Move only interior rows of the R49 outer cast skin. The forward support-stay
anchor vertex and rear R55 fin root NEVER move. Existing R64 model is read
from a saved real .blend; source R58, lower motion, R19, liner remain intact.
Publish renders + measured original-source-region first-hit counts. No
source image packed in output. This is NOT a visual-approval mechanism.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import MAIN,MOUNT_PREFIX,FIN_PREFIX,AXIS_Z
from mount_shape_fit_r52 import joint_gap_world,MOUNT_TARGETS
from mount_radial_visibility_r53 import per_mount_visibility
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION
from mount_occlusion_diagnostic_r51 import render,NATIVE
from upper_hull_loadpath_candidate_r64 import (
    REVISION as R64_REV, COLLECTION, untouched_digest, verify_candidate
)

REVISION="R65_original_cast_3d_visible_cheek_surface_sweep"
SURFACE_DELTA=(0.,.08,.16,.24)
INDIVIDUAL_RELIEF={1:.85,2:1.,3:.9}

def move_front_cheek(mount,points,index,amplitude):
    n=len(points)
    if n not in (50,60) or len(mount.data.vertices)!=n:
        raise RuntimeError("R65 must use original finite-volume R49 5/6-row casts")
    rows=n//10
    half=rows*5
    if mount.data.shape_keys:
        raise RuntimeError("Cannot deform source-animated mount as static")
    changed=0
    for vi,old in enumerate(points):
        if vi<half: continue    # Inner cast skin unchanged.
        row=(vi-half)//5
        col=(vi-half)%5
        if row==0 or row==rows-1 or col in (0,4):
            continue          # Lock real support anchors and rim walls.
        weight=math.sin(math.pi*row/(rows-1))*math.sin(math.pi*col/4)
        distance=amplitude*INDIVIDUAL_RELIEF[index]*weight
        x,y,z=old
        radius=math.hypot(x,z-AXIS_Z)
        if radius<.15:raise RuntimeError("Invalid source casing radial orientation")
        mount.data.vertices[vi].co=(x*(1.+distance/radius),y,
                                    AXIS_Z+(z-AXIS_Z)*(1.+distance/radius))
        changed+=1
    mount.data.update()
    if changed < 3:
        raise RuntimeError("R65 did not modify physical existing R49 cast interior")
    return changed

def real_visible(scene):
    result=per_mount_visibility(scene)
    return {str(i):{"first_hits_cast":result[str(i)]["first_hits_cast"],
                    "native_sample_count":result[str(i)]["native_sample_count"],
                    "cast_visible_fraction":result[str(i)]["cast_visible_fraction"],
                    "top_first_hits":result[str(i)]["top_first_hits"][:8]}
            for i in MAIN}

def run(source,out):
    source=source.resolve()
    initial_sha=hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if (scene.get("fsc_r64_revision")!=R64_REV or not scene.camera
        or scene.camera.data.type!="ORTHO"):
        raise RuntimeError("R65 requires physically connected R64 saved .blend")
    scene.frame_set(1)
    original_digest=untouched_digest(scene)
    verify_candidate(scene,original_digest)
    before={};objects={}
    for i in MAIN:
        ob=bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"]
        objects[i]=ob
        before[i]=tuple(tuple(v.co) for v in ob.data.vertices)
    report={"revision":REVISION,"input_r64_sha256":initial_sha,
            "source_native_cell":[264,542],
            "source_cast_manual_roi_targets":{str(i):list(MOUNT_TARGETS[i]) for i in MAIN},
            "still_source_unapproved":True,
            "no_original_sprite_or_printable_STL_in_artifact":True,
            "only_original_front_cast_shell_interior_modified":True,
            "all_three_fin_root_vertices_frozen":True,
            "all_three_upper_hull_loadpath_anchors_frozen":True,
            "all_source_64frame_fin_keys_frozen":True,
            "variants":[]}
    original_render=(scene.render.resolution_x,scene.render.resolution_y,
                     scene.render.resolution_percentage,scene.render.filepath,
                     scene.render.image_settings.file_format,
                     scene.render.image_settings.color_mode,
                     scene.cycles.samples,scene.frame_current)
    out=out.resolve()
    out.mkdir(parents=True,exist_ok=True)
    try:
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        for delta in SURFACE_DELTA:
            for i,ob in objects.items():
                # Restore original coordinates BEFORE applying each sweep,
                # including the 0.0 baseline.
                for v,p in zip(ob.data.vertices,before[i]):v.co=p
                ob.data.update()
                move_front_cheek(ob,before[i],i,delta)
            bpy.context.view_layer.update()
            gaps={str(i):joint_gap_world(
                objects[i],bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])
                for i in MAIN}
            if any(gap>MAX_ROOT_CONNECTION for gap in gaps.values()):
                raise RuntimeError("R65 detached existing actual R55 fin root")
            for i in MAIN:
                stay=next(o for o in bpy.data.collections[COLLECTION].objects
                          if o.get("anchored_to_exact_existing_cast")==objects[i].name)
                v_index=int(stay["R64_real_cast_vertex_index"])
                joint_a=objects[i].matrix_world@objects[i].data.vertices[v_index].co
                joint_b=stay.matrix_world@stay.data.vertices[-2].co
                if (joint_a-joint_b).length>.0001:
                    raise RuntimeError("R65 severed original 3D upper hull support anchor")
            count=real_visible(scene)
            tag="front_cheek_relief_%03d"%(round(delta*100))
            render(scene,out/(tag+".png"))
            report["variants"].append({
                "original_outer_skin_camber_tiles":delta,
                "first_hits":count,"actual_camera_native_png":tag+".png",
                "all_fin_root_gaps":{k:round(v,7) for k,v in gaps.items()},
                "upper_hull_anchor_untouched":True})
            print("R65_REAL_CAST_FACE_SOURCE_ROI_FIRST_HITS",delta,
                  {k:(v["first_hits_cast"],v["native_sample_count"])
                   for k,v in count.items()},flush=True)
    finally:
        for i,ob in objects.items():
            for v,p in zip(ob.data.vertices,before[i]):v.co=p
            ob.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=original_render
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    report["original_R64_scene_restored_in_memory"]=(untouched_digest(scene)==original_digest)
    if not report["original_R64_scene_restored_in_memory"]:
        raise RuntimeError("R65 failed to restore source 3D cast geometry and motion")
    verify_candidate(scene,original_digest)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=initial_sha:
        raise RuntimeError("R65 changed source saved .blend")
    report["original_R64_saved_file_unchanged"]=True
    (out/"r65-measured-cast-cheeks.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R65_REAL_NATIVE_CAST_FACE_VARIANTS_SOURCE_SCENE_UNCHANGED",
          len(report["variants"]),flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.source_blend,args.out)
