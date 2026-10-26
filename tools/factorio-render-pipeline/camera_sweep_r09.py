"""R09 Blender native camera calibration sweep on saved vanilla benchmark.

Renders the SAME saved model from three camera geometries. This is a
non-production diagnostic; it does not modify source .blend or body atlases.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

VIEWS={
    "previous_shallow":(1.0,-6.8,6.88),
    "centered_high":(.18,-6.8,10.0),
    "steep_overhead":(0.0,-4.8,11.5),
}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    out=args.output.resolve()
    source=out/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():raise RuntimeError("Missing saved benchmark Blender scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_reference_visual_pass")!="R08_blackened_segmented_furnace_with_supported_side_machinery":
        raise RuntimeError("Camera sweep requires reconstructed R08 benchmark")
    if scene.get("fsc_nozzle_throat_revision")!="R09_deep_refractory_liner_without_front_turbine_disc":
        raise RuntimeError("Deep throat revision is absent from saved model")

    camera=scene.camera
    if camera is None or camera.data.type!="ORTHO":raise RuntimeError("Must use Blender orthographic camera")
    original_loc=camera.location.copy()
    original_rot=camera.rotation_euler.copy()
    original_path=scene.render.filepath
    scene.frame_set(1)
    dest=out/"test-04-vanilla-approx"/"camera-sweep"
    dest.mkdir(parents=True,exist_ok=True)
    report={"source_blend":str(source.relative_to(out)),
            "status":"visual camera diagnostic only; not Factorio-approved",
            "captures":[]}
    try:
        for name,xyz in VIEWS.items():
            camera.location=xyz
            camera.rotation_euler=(Vector((0,0,.56))-camera.location).to_track_quat("-Z","Y").to_euler()
            filepath=dest/(name+".png")
            scene.render.filepath=str(filepath)
            bpy.ops.render.render(write_still=True)
            if not filepath.is_file():raise RuntimeError("Missing "+str(filepath))
            report["captures"].append({"preset":name,"file":str(filepath.relative_to(dest)),
                                       "camera_location":list(xyz),
                                       "ortho_scale":camera.data.ortho_scale})
            print("CAMERA_SWEEP_RENDER",name,flush=True)
    finally:
        camera.location=original_loc
        camera.rotation_euler=original_rot
        scene.render.filepath=original_path
    (dest/"camera-sweep-manifest.json").write_text(json.dumps(report,indent=2)+"\n")
    print("CAMERA_SWEEP_COMPLETE",len(report["captures"]),flush=True)

if __name__=="__main__":main()
