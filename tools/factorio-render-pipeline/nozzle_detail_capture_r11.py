"""Two real Blender close-up renders for R11 throat depth and cantilever supports.

The capture environment/source .blend is NOT saved over. Render-only diagnostic
camera and soft reveal lighting make the inside of the bell visible for QA.
This cannot establish Factorio production sprite compatibility.
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector

VIEWS={
    "aft_axis_deep_throat":((0,-7.5,.25),(0,-2.60,-.43),4.7),
    "aft_three_quarter_vanes":((2.9,-6.2,2.35),(0,-2.68,-.43),5.0),
}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    root=args.output.resolve()
    source=root/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():raise RuntimeError("No Blender benchmark .blend found")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_engineering_revision")!="R11_1_chassis_braced_dark_suspended_afterburners":
        raise RuntimeError("Cannot inspect missing R11 afterburner geometry")
    if float(scene.get("fsc_throat_far_y",0))-float(scene.get("fsc_throat_near_y",0))<2.2:
        raise RuntimeError("Cannot inspect shallow R11 throat")
    source_camera=scene.camera
    source_engine=scene.render.engine
    source_samples=scene.cycles.samples
    source_rx,source_ry=scene.render.resolution_x,scene.render.resolution_y
    previous_filepath=scene.render.filepath
    # Temporary preview camera is NOT a saved/game sprite camera.
    bpy.ops.object.camera_add(location=(0,-7.5,.25))
    inspection_camera=bpy.context.object
    inspection_camera.name="R11_PREVIEW_ONLY_DEEP_THROAT_CAMERA"
    inspection_camera.data.type="ORTHO"
    bpy.ops.object.light_add(type="AREA",location=(-1.2,-5.3,2.5))
    light=bpy.context.object
    light.name="R11_PREVIEW_ONLY_REVEAL_LIGHT"
    light.data.energy=375
    light.data.size=3.5
    scene.camera=inspection_camera
    scene.cycles.samples=12
    scene.render.resolution_x=448
    scene.render.resolution_y=448
    directory=root/"test-04-vanilla-approx"/"nozzle-detail-r11"
    directory.mkdir(parents=True,exist_ok=True)
    record={"source_blend":str(source.relative_to(root)),
            "camera_type":"orthographic","samples":12,
            "status":"inspection views only, NOT Factorio production images",
            "views":[]}
    try:
        scene.frame_set(1)
        for name,(loc,target,scale) in VIEWS.items():
            inspection_camera.location=loc
            inspection_camera.rotation_euler=(
                Vector(target)-inspection_camera.location).to_track_quat("-Z","Y").to_euler()
            inspection_camera.data.ortho_scale=scale
            output=directory/(name+".png")
            scene.render.filepath=str(output)
            bpy.ops.render.render(write_still=True)
            if not output.is_file() or output.stat().st_size<250:
                raise RuntimeError("Blender did not render "+str(output))
            record["views"].append({"name":name,"file":output.name,
                                    "camera_location":list(loc),
                                    "camera_target":list(target),
                                    "ortho_scale":scale})
            print("R11_INSPECTION_RENDER_PASS",name,output.stat().st_size,flush=True)
    finally:
        scene.camera=source_camera
        scene.cycles.samples=source_samples
        scene.render.engine=source_engine
        scene.render.resolution_x=source_rx
        scene.render.resolution_y=source_ry
        scene.render.filepath=previous_filepath
        bpy.data.objects.remove(light,do_unlink=True)
        bpy.data.objects.remove(inspection_camera,do_unlink=True)
    (directory/"inspection-manifest.json").write_text(json.dumps(record,indent=2)+"\n")
    print("R11_INSPECTION_SCENES_COMPLETE",len(record["views"]),flush=True)

if __name__=="__main__":
    main()
