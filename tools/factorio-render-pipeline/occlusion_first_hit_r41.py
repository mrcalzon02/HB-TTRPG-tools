"""R41 — first-hit ray diagnosis of the actual R40 saved vanilla Blender scene.

R40 proved full body darkens upper bore by 0.032 versus liner/R19/drum
isolated. R41 determines what OTHER physical geometry the saved orthographic
camera rays first hit. Uses only native body frame coordinates, original
rendered scene and source lighting. No modifications are saved to .blend.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys
import bpy
from mathutils import Vector

REVISION="R41_saved_camera_first_hit_occlusion_root_cause"
R40_RUN_ID=40618557151
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
RANGE=(55,208,410,455)
SOURCE_SIZE=(264,542)
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT"
DRUM="R08_aft_internal_reaction_drum"

def camera_ray(camera,scene,pixel_x,pixel_y):
    if camera.data.type!="ORTHO":
        raise RuntimeError("R41 requires the original orthographic game camera")
    frame=camera.data.view_frame(scene=scene)
    xmin=min(v.x for v in frame);xmax=max(v.x for v in frame)
    ymin=min(v.y for v in frame);ymax=max(v.y for v in frame)
    # Render pixel centers, frame origin top left. Offsets are NOT optimized.
    u=(pixel_x+.5)/SOURCE_SIZE[0]
    v=(pixel_y+.5)/SOURCE_SIZE[1]
    local=Vector((xmin+u*(xmax-xmin),ymax-v*(ymax-ymin),0.))
    return (camera.matrix_world@local,
            camera.matrix_world.to_quaternion()@Vector((0.,0.,-1.)))

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    source=args.source.resolve()
    if not source.exists():
        raise RuntimeError("R41 cannot find actual R40 saved Blender scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if (scene.get("fsc_r39_revision")!=
        "R39_physically_fluted_original_open_refractory_liner" or
        scene.get("fsc_r39_original_sha256")!=SOURCE_SHA256):
        raise RuntimeError("R41 requires existing fully source-traced R39")
    cam=scene.camera
    if cam is None or cam.data.type!="ORTHO":
        raise RuntimeError("R41 lost original Factorio camera")
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    samples=[]
    counts=Counter()
    row_counts={}
    for y in range(RANGE[2],RANGE[3],5):
        row=Counter()
        for x in range(RANGE[0],RANGE[1],6):
            origin,direction=camera_ray(cam,scene,x,y)
            hit,where,normal,index,obj,matrix=scene.ray_cast(
                dg,origin,direction,distance=300.)
            name=obj.name if hit else "<NO_MESH_HIT>"
            row[name]+=1
            counts[name]+=1
            samples.append({"x":x,"y":y,"first_hit":name,
                            "distance":round(float((where-origin).length),4) if hit else None})
        row_counts[str(y)]=dict(row)
    if not samples or sum(counts.values())!=len(samples):
        raise RuntimeError("R41 original-camera ray population incomplete")
    out=args.output.resolve()
    out.mkdir(parents=True,exist_ok=True)
    # Select the dominant *non-liner* first-hit physical mesh for a
    # temporary A/B render. The missing source detail may have multiple
    # obstructions; report the entire hit histogram, not only the winner.
    candidates=[(name,count) for name,count in counts.most_common()
                if name not in (LINER,DRUM,"<NO_MESH_HIT>")
                and not name.startswith("R19_")]
    target=candidates[0][0] if candidates else None
    record={
        "revision":REVISION,
        "source_workflow_run_id":R40_RUN_ID,
        "camera_name":cam.name,
        "orthographic_scale":float(cam.data.ortho_scale),
        "source_sha256":SOURCE_SHA256,
        "sample_rect_xyxy":list(RANGE),
        "native_size":list(SOURCE_SIZE),
        "original_scene_mesh_first_hit_histogram":dict(counts.most_common()),
        "row_hit_histograms":row_counts,
        "samples":samples,
        "dominant_non_r19_non_liner_mesh":target,
        "diagnostic_only":True,
        "blender_saved_scene_untouched":True,
        "limitations":"Blender scene ray_cast may omit beveled curves; visibility occlusion may include multiple physical layers."
    }
    # A/B tests ONLY the dominant object by temporary hide_render,
    # preserving same saved camera, studio lights, source-facing materials.
    original=(scene.render.resolution_x,scene.render.resolution_y,
              scene.render.resolution_percentage,scene.render.filepath,
              scene.cycles.samples,cam,scene.frame_current)
    hide_before=None
    ob=bpy.data.objects.get(target) if target else None
    try:
        scene.frame_set(1)
        scene.render.resolution_x=SOURCE_SIZE[0]
        scene.render.resolution_y=SOURCE_SIZE[1]
        scene.render.resolution_percentage=100
        scene.cycles.samples=8
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.render.filepath=str(out/"baseline.png")
        bpy.ops.render.render(write_still=True)
        if ob:
            hide_before=ob.hide_render
            ob.hide_render=True
            bpy.context.view_layer.update()
            scene.render.filepath=str(out/"dominant_first_hit_hidden.png")
            bpy.ops.render.render(write_still=True)
    finally:
        if ob and hide_before is not None:
            ob.hide_render=hide_before
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.cycles.samples,scene.camera,oldframe)=original
        scene.frame_set(oldframe)
    record["reversible_isolation_target"]=target
    record["temporary_visibility_restored"]=(
        True if ob is None else ob.hide_render==hide_before)
    if not record["temporary_visibility_restored"]:
        raise RuntimeError("R41 failed to restore source Blender scene")
    (out/"raycast-first-hit.json").write_text(json.dumps(record,indent=2)+"\n")
    print("R41_ACTUAL_SAVED_CAMERA_FIRST_HITS",counts.most_common(12),flush=True)
    print("R41_DOMINANT_OCCLUDER",target,flush=True)
    print("R41_SAVED_SCENE_NOT_EDITED_PASS",flush=True)

if __name__=="__main__":main()
