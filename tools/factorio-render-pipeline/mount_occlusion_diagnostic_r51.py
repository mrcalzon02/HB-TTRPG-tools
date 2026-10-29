"""R51 — identify the mounting projection and grey upper-throat occluder.

Load the actually saved R49 native Blender scene. Compare R49 to the R50-D
physical fin+mount candidate, via SAME camera projection and first-hit rays.
Project the THREE distinct castings and FIVE original slotted fins back into
source-frame pixel coordinates; group first hits by actual Blender object.
A/B-hide ONLY the discovered foremost non-fin, non-mount obstruction; never
save edited .blend nor include proprietary source pixels in GitHub output.
This is a diagnostic to establish the correct mounts BEFORE sizing fins.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

# Blender --python does not guarantee the project script folder is on sys.path.
# Import the already-validated R50 deformation without relying on CWD.
ROOT_SOURCE=str(Path(__file__).resolve().parent)
if ROOT_SOURCE not in sys.path:
    sys.path.insert(0,ROOT_SOURCE)

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from fin_mount_geometry_sweep_r50 import (
    AXIS_Z, FIN_PREFIX, MOUNT_PREFIX, MAIN, UPPER, candidate_point,
)

REVISION="R51_mount_projections_and_actual_grey_occluder"
NATIVE=(264,542)
# Measured source-region coordinates. All represent the original 264x542
# cell; their contents are NOT copied into any public artifact.
REGIONS={
    "mount_roots":(35,225,275,373),
    "hanging_fins":(35,225,350,430),
    "upper_nozzle":(40,224,385,470),
    "lower_nozzle":(40,224,440,515),
}
SWEEP_D=(-.92,1.08,-.34)

def camera_ray(camera,scene,x,y):
    if camera.data.type!="ORTHO":
        raise RuntimeError("R51 requires saved orthographic source camera")
    frame=camera.data.view_frame(scene=scene)
    xmin=min(v.x for v in frame);xmax=max(v.x for v in frame)
    ymin=min(v.y for v in frame);ymax=max(v.y for v in frame)
    u=(x+.5)/NATIVE[0];v=(y+.5)/NATIVE[1]
    local=Vector((xmin+u*(xmax-xmin),ymax-v*(ymax-ymin),0.))
    return (camera.matrix_world@local,
            camera.matrix_world.to_quaternion()@Vector((0.,0.,-1.)))

def projected_bounds(scene,label):
    obj=bpy.data.objects[label]
    points=[]
    for vertex in obj.data.vertices:
        ndc=world_to_camera_view(scene,scene.camera,obj.matrix_world@vertex.co)
        points.append((float(ndc.x)*NATIVE[0],
                       (1.-float(ndc.y))*NATIVE[1]))
    if not points:
        raise RuntimeError("R51 mount has no projecting geometry: "+label)
    return [round(min(x for x,y in points),2),
            round(min(y for x,y in points),2),
            round(max(x for x,y in points),2),
            round(max(y for x,y in points),2)]

def sample_first_hits(scene):
    bpy.context.view_layer.update()
    depsgraph=bpy.context.evaluated_depsgraph_get()
    counts={}
    examples={}
    for region,(x0,x1,y0,y1) in REGIONS.items():
        count=Counter();samples=[]
        for y in range(y0,y1,6):
            for x in range(x0,x1,6):
                origin,direction=camera_ray(scene.camera,scene,x,y)
                hit,point,normal,idx,obj,matrix=scene.ray_cast(
                    depsgraph,origin,direction,distance=300.)
                name=obj.name if hit else "<NO_HIT>"
                count[name]+=1
                if x%24<6 and y%24<6:
                    samples.append({"x":x,"y":y,"first_hit":name,
                                    "distance":round(float((point-origin).length),3)
                                    if hit else None})
        counts[region]=dict(count.most_common())
        examples[region]=samples
    return counts,examples

def deform_r50_d(objects,originals,parameters):
    root_shift,tip_shift,radial_inset=SWEEP_D
    for i in UPPER:
        obj=objects[f"{FIN_PREFIX}{i:02d}"]
        root_y,tip_y=parameters[i]
        for v,orig in zip(obj.data.vertices,originals[obj.name]):
            v.co=candidate_point(orig,root_y,tip_y,root_shift,
                                 tip_shift,radial_inset,i)
        obj.data.update()
    for i in MAIN:
        obj=objects[f"{MOUNT_PREFIX}{i:02d}"]
        for v,(x,y,z) in zip(obj.data.vertices,originals[obj.name]):
            radius=math.hypot(x,z-AXIS_Z)
            angle=math.atan2(z-AXIS_Z,x)
            r=radius+radial_inset
            v.co=(r*math.cos(angle),y+root_shift,
                  AXIS_Z+r*math.sin(angle))
        obj.data.update()
    bpy.context.view_layer.update()

def render(scene,path):
    scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)
    if not path.is_file() or path.stat().st_size<500:
        raise RuntimeError("R51 missing actual Blender PNG: "+str(path))

def run(output):
    path=output/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not path.is_file():
        raise RuntimeError("R51 needs the actually saved R49 scene")
    original_disk_sha=sha256(path.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    from vanilla_bespoke_fin_mounts_r49 import REVISION as R49_REV
    if (scene.get("fsc_r49_revision")!=R49_REV or
        scene.get("fsc_r49_distinct_source_mount_count")!=3 or
        scene.camera is None or scene.camera.data.type!="ORTHO"):
        raise RuntimeError("R51 lost the R49 source-visible mounting contract")
    scene.frame_set(1)
    camera_before=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    scale_before=float(scene.camera.data.ortho_scale)
    names_before={obj.name for obj in scene.objects}
    objects={}
    originals={}
    parameters={}
    for i in UPPER:
        label=f"{FIN_PREFIX}{i:02d}"
        obj=bpy.data.objects.get(label)
        if obj is None or obj.type!="MESH" or obj.data.shape_keys:
            raise RuntimeError("R51 cannot project source-original upper fin "+label)
        objects[label]=obj
        originals[label]=tuple(tuple(v.co) for v in obj.data.vertices)
        parameters[i]=(float(obj.data.vertices[0].co.y),
                       float(obj.data.vertices[99].co.y))
    for i in MAIN:
        label=f"{MOUNT_PREFIX}{i:02d}"
        obj=bpy.data.objects.get(label)
        if obj is None or obj.type!="MESH":
            raise RuntimeError("R51 cannot project source-specific mount "+label)
        objects[label]=obj
        originals[label]=tuple(tuple(v.co) for v in obj.data.vertices)
    old_render=(scene.render.resolution_x,scene.render.resolution_y,
                scene.render.resolution_percentage,scene.render.filepath,
                scene.render.image_settings.file_format,
                scene.render.image_settings.color_mode,
                scene.cycles.samples,scene.frame_current)
    out=output/"test-04-vanilla-approx"/"mount-and-occlusion-r51"
    out.mkdir(parents=True,exist_ok=True)
    occluder=None
    hide_before=None
    record={"revision":REVISION,"source_size":list(NATIVE),
            "original_scene_sha256":original_disk_sha,
            "source_sprite_committed":False,"saved_scene_unmodified":True,
            "R50_D_is_visual_hypothesis_not_accepted_asset":True,
            "camera_identical_for_both_cases":True}
    try:
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.cycles.samples=8
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        record["R49_mount_bounds"]={
            str(i):projected_bounds(scene,f"{MOUNT_PREFIX}{i:02d}")
            for i in MAIN}
        record["R49_fin_bounds"]={
            str(i):projected_bounds(scene,f"{FIN_PREFIX}{i:02d}")
            for i in UPPER}
        record["R49_first_hits"],record["R49_first_hit_examples"]=sample_first_hits(scene)
        render(scene,out/"R49_baseline.png")
        deform_r50_d(objects,originals,parameters)
        record["candidate_D_mount_bounds"]={
            str(i):projected_bounds(scene,f"{MOUNT_PREFIX}{i:02d}")
            for i in MAIN}
        record["candidate_D_fin_bounds"]={
            str(i):projected_bounds(scene,f"{FIN_PREFIX}{i:02d}")
            for i in UPPER}
        hits,examples=sample_first_hits(scene)
        record["candidate_D_first_hits"]=hits
        record["candidate_D_first_hit_examples"]=examples
        render(scene,out/"R50_D_with_actual_throat.png")
        # The smooth grey surface is the foremost broad NON-fin physical
        # object in the failing upper nozzle region. Report ALL candidates;
        # the strongest is only hidden for a reversible diagnostic, never
        # deleted or accepted as art.
        ranking=Counter(hits["upper_nozzle"])
        eligible=[(label,n) for label,n in ranking.most_common()
                  if label!="<NO_HIT>"
                  and not label.startswith(FIN_PREFIX)
                  and not label.startswith(MOUNT_PREFIX)
                  and not label.startswith("R19_")]
        record["upper_nozzle_non_fin_hit_candidates"]=eligible
        if eligible:
            occluder=bpy.data.objects.get(eligible[0][0])
            if occluder is None:
                raise RuntimeError("R51 first-hit name missing from scene")
            hide_before=occluder.hide_render
            occluder.hide_render=True
            bpy.context.view_layer.update()
            render(scene,out/"R50_D_foremost_nonfin_hidden_AB_only.png")
            record["temporary_AB_hidden_object"]=occluder.name
        else:
            record["temporary_AB_hidden_object"]=None
    finally:
        if occluder is not None:
            occluder.hide_render=hide_before
        for name,points in originals.items():
            obj=objects[name]
            for vertex,original in zip(obj.data.vertices,points):
                vertex.co=original
            obj.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=old_render
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    record["verified_restore"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                for v,pt in zip(objects[name].data.vertices,points))
            for name,points in originals.items())
        and (occluder is None or occluder.hide_render==hide_before)
        and {obj.name for obj in scene.objects}==names_before
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==camera_before
        and abs(float(scene.camera.data.ortho_scale)-scale_before)<1e-8
        and sha256(path.read_bytes()).hexdigest()==original_disk_sha
    )
    if not record["verified_restore"]:
        raise RuntimeError("R51 failed original physical mesh/scene restoration")
    (out/"first-hit-mount-projection.json").write_text(
        json.dumps(record,indent=2)+"\n",encoding="utf8")
    print("R51_SOURCE_FRAME_MOUNT_PROJECTION",
          json.dumps(record["candidate_D_mount_bounds"]),flush=True)
    print("R51_FIRST_HIT_UPPER_NOZZLE",
          json.dumps(list(Counter(record["candidate_D_first_hits"]["upper_nozzle"]).most_common(10))),
          flush=True)
    print("R51_A_B_FOREMOST_NONFIN",record["temporary_AB_hidden_object"],flush=True)
    print("R51_SAVED_SCENE_UNCHANGED",record["verified_restore"],flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    source=str(Path(__file__).resolve().parent)
    if source not in sys.path:sys.path.insert(0,source)
    run(args.output.resolve())
