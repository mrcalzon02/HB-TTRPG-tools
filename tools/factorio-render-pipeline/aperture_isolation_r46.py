"""R46 isolate the original R11 aperture collar in the actual R45.1 .blend.

Diagnostic only, not a geometry fix: strict same saved camera, saved
lights, material, viewport, no meshes or opacity tricks. All original
object visibility flags restored and no Blender scene is overwritten.
Use the full-engine source-native R40 diagnostic as an observation, and
render a same-scene A/B pair with only R11 baffle visibility toggled.
Original proprietary Factorio pixels are NEVER needed in GitHub CI.
"""
import argparse
from pathlib import Path
from collections import Counter
import json
import sys
import bpy

REVISION="R46_reversible_saved_scene_aperture_baffle_first_hit"
TARGET="R11_recessed_internal_pressure_baffle_01"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SIZE=(264,542)
ROI=(52,360,212,495)

def image_samples(filename):
    im=bpy.data.images.load(str(filename),check_existing=False)
    try:
        if tuple(im.size)!=SIZE:
            raise RuntimeError("R46 cannot resize/misregister source-native viewport")
        return list(im.pixels[:])
    finally:
        bpy.data.images.remove(im)

def differences(a,b):
    if len(a)!=SIZE[0]*SIZE[1]*4 or len(b)!=len(a):
        raise RuntimeError("R46 invalid original 264x542 alpha buffers")
    change=0
    strength=0.
    for y in range(ROI[1],ROI[3]):
        for x in range(ROI[0],ROI[2]):
            idx=((SIZE[1]-1-y)*SIZE[0]+x)*4
            diff=max(abs(a[idx+k]-b[idx+k]) for k in range(4))
            strength+=diff
            if diff>1./255.:change+=1
    return {"roi_native_xyxy":list(ROI),
            "changed_pixels":change,
            "mean_max_rgba_change":round(strength/((ROI[2]-ROI[0])*(ROI[3]-ROI[1])),7)}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    args=parser.parse_args(argv)
    source=args.output.resolve()/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():raise RuntimeError("R46 actual saved R45 scene is missing")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    from vanilla_throat_mounts_r45 import REVISION as R45_REV
    if scene.get("fsc_r45_revision")!=R45_REV or scene.get("fsc_r45_source_sha256")!=SOURCE_SHA256:
        raise RuntimeError("R46 requires original geometry R45 edit")
    target=bpy.data.objects.get(TARGET)
    if not target or not target.get("R45_existing_castellated_baffle") or target.hide_render:
        raise RuntimeError("R46 original source baffle missing/previously hidden")
    cam=scene.camera
    if not cam or cam.data.type!="ORTHO" or not scene.render.film_transparent:
        raise RuntimeError("R46 cannot fake aperture view/camera")
    camera_before=tuple(float(x) for row in cam.matrix_world for x in row)
    render_before=(scene.render.resolution_x,scene.render.resolution_y,
                   scene.render.resolution_percentage,scene.cycles.samples,
                   scene.render.filepath,scene.frame_current)
    old={ob.name:ob.hide_render for ob in scene.objects if ob.type in {"MESH","CURVE"}}
    directory=args.output.resolve()/"test-04-vanilla-approx"/"aperture-isolation-r46"
    directory.mkdir(parents=True,exist_ok=True)
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=SIZE
        scene.render.resolution_percentage=100
        scene.cycles.samples=8
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.render.filepath=str(directory/"complete.png")
        bpy.ops.render.render(write_still=True)
        original=image_samples(directory/"complete.png")
        target.hide_render=True
        scene.view_layers[0].update()
        scene.render.filepath=str(directory/"baffle-hidden.png")
        bpy.ops.render.render(write_still=True)
        hidden=image_samples(directory/"baffle-hidden.png")
        observed=differences(original,hidden)
        for name,was in old.items():
            bpy.data.objects[name].hide_render=was or name!=TARGET
        scene.view_layers[0].update()
        scene.render.filepath=str(directory/"baffle-alone.png")
        bpy.ops.render.render(write_still=True)
        solo=image_samples(directory/"baffle-alone.png")
        bbox=None;coverage=0
        for y in range(SIZE[1]):
            for x in range(SIZE[0]):
                idx=((SIZE[1]-1-y)*SIZE[0]+x)*4
                if solo[idx+3]>=.5:
                    coverage+=1
                    if bbox is None:bbox=[x,y,x+1,y+1]
                    else:
                        bbox[0]=min(x,bbox[0]);bbox[1]=min(y,bbox[1])
                        bbox[2]=max(x+1,bbox[2]);bbox[3]=max(y+1,bbox[3])
        record={"revision":REVISION,"source_sha256":SOURCE_SHA256,
                "original_baffle_object":TARGET,"same_camera":True,
                "source_native_size":list(SIZE),
                "camera_matrix_before":list(camera_before),
                "baffle_alone_alpha_bbox":bbox,
                "baffle_alone_opaque_pixels":coverage,
                "complete_minus_hidden":observed,
                "diagnostic_only":True,"no_scene_saved":True}
    finally:
        for name,was in old.items():bpy.data.objects[name].hide_render=was
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.cycles.samples,
         scene.render.filepath,oldframe)=render_before
        scene.frame_set(oldframe)
    record["source_visibility_restored"]=all(
        bpy.data.objects[name].hide_render==was for name,was in old.items())
    record["camera_preserved"]=tuple(float(x) for row in cam.matrix_world for x in row)==camera_before
    if not record["source_visibility_restored"] or not record["camera_preserved"]:
        raise RuntimeError("R46 altered authoritative original scene during diagnostic")
    (directory/"aperture-isolation.json").write_text(json.dumps(record,indent=2)+"\n")
    print("R46_SOURCE_APERTURE_FIRST_HIT_SAVED_SCENE",json.dumps(observed),flush=True)
    print("R46_SOURCE_BAFFLE_ONLY_BBOX",bbox,coverage,flush=True)
    print("R46_DIAGNOSTIC_NO_SCENE_MUTATION_PASS",flush=True)
if __name__=="__main__":main()
