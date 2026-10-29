"""R50: same-camera physical root-and-tip sweep on real R49 Blender meshes.

R49 corrected the SOURCE HIERARCHY of mounts above throat band, but the exact
64-frame source comparison shows upper fin full-aperture color error worsened.
Do not treat R49 successful scene validation as visual success.

Render six candidates using the SAME actual saved orthographic camera and
studio lamps. Temporarily deform ONLY the existing five R21 upper fin meshes
and their three unique R49 mounting castings; all are restored in memory.
This measures whether the upper roots, radial relief or free end Y placements
are causing the source mismatch before another committed geometry revision.
The proprietary original RGBA atlas stays private and is not used in CI.
NEVER write a modified .blend or alter original lower 64-frame motion.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy

REVISION="R50_original_camera_bespoke_mount_fin_position_sweep"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Variant: unique name, source-root Y aft displacement, tip Y forward
# recovery, and root/casting radial inset. All are physical model-space
# transformations, NEVER screen pixel shifts or generated color overlays.
PRESETS=(
  ("R49_baseline", 0.,0.,0.),
  ("source_A_mild",-.35,.45,-.10),
  ("source_B_intermediate",-.55,.68,-.18),
  ("source_C_balanced",-.75,.88,-.26),
  ("source_D_compact",-.92,1.08,-.34),
  ("source_E_further_aft",-1.08,1.20,-.41),
)
CAMERA_SIZE=(264,542)
FIN_PREFIX="R11_SUSPENDED_AFTERBURNER_VANE_"
MOUNT_PREFIX="R49_BESPOKE_CAST_MOUNT_"
MAIN=(1,2,3)
UPPER=(0,1,2,3,4)
AXIS_Z=-.43
ROOT_FACTOR={0:.78,1:1.,2:1.,3:1.,4:.83}
TIP_FACTOR={0:.70,1:1.,2:1.,3:1.,4:.75}

def candidate_point(point,root_y,tip_y,root_shift,tip_shift,radial_inset,index):
    x,y,z=point
    denom=root_y-tip_y
    if denom<1.:
        raise ValueError("R50 expects the actual long R49 original upper sheet")
    u=max(0.,min(1.,(root_y-y)/denom))
    new_y=y+root_shift*ROOT_FACTOR[index]*(1.-u)+tip_shift*TIP_FACTOR[index]*u
    radial=math.hypot(x,z-AXIS_Z)
    if radial<.1:
        raise ValueError("R50 may not fold source fin into axis")
    theta=math.atan2(z-AXIS_Z,x)
    new_r=radial+radial_inset*ROOT_FACTOR[index]*(1.-u)
    if new_r<.6:
        raise ValueError("R50 would cross combustion axis")
    return (new_r*math.cos(theta),new_y,
            AXIS_Z+new_r*math.sin(theta))

def run(out):
    if not out.exists():
        raise RuntimeError("R50 output directory missing")
    source=out/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():
        raise RuntimeError("R50 must read actual previously verified saved Blender scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    from vanilla_bespoke_fin_mounts_r49 import (
        REVISION as R49_REV,UPPER_FIN_PROFILES as R49_PROFILES,
        CAST_COLLECTION as R49_CAST_GROUP)
    if (scene.get("fsc_r49_revision")!=R49_REV or
        scene.get("fsc_r49_distinct_source_mount_count")!=3 or
        scene.get("fsc_r49_five_original_upper_sheets_reanchored")!=5 or
        bpy.data.collections.get(R49_CAST_GROUP) is None):
        raise RuntimeError("R50 requires successful R49 source-root hierarchy")
    if scene.camera is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R50 refuses an uncalibrated camera")
    original_camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    original_ortho=float(scene.camera.data.ortho_scale)
    original=(scene.render.resolution_x,scene.render.resolution_y,
              scene.render.resolution_percentage,scene.render.filepath,
              scene.cycles.samples,scene.frame_current)
    original_objects={ob.name for ob in scene.objects}
    originals={}
    fin_params={}
    for i in UPPER:
        ob=bpy.data.objects.get(f"{FIN_PREFIX}{i:02d}")
        if ob is None or ob.type!="MESH" or ob.data.shape_keys is not None:
            raise RuntimeError("R50 cannot work around source physical upper fin mesh")
        fin_params[i]=(R49_PROFILES[i][0],ob.data.vertices[99].co.y)
        originals[ob.name]=tuple(tuple(v.co) for v in ob.data.vertices)
    for i in MAIN:
        ob=bpy.data.objects.get(f"{MOUNT_PREFIX}{i:02d}")
        if ob is None or ob.type!="MESH":
            raise RuntimeError("R50 cannot test invisible unsupported mounts")
        originals[ob.name]=tuple(tuple(v.co) for v in ob.data.vertices)
    dest=out/"test-04-vanilla-approx"/"fin-mount-geometry-sweep-r50"
    dest.mkdir(parents=True,exist_ok=True)
    results=[]
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=CAMERA_SIZE
        scene.render.resolution_percentage=100
        scene.cycles.samples=8
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        for preset,root_shift,tip_shift,radial_inset in PRESETS:
            for i in UPPER:
                ob=bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]
                root_y,tip_y=fin_params[i]
                for vert,original_point in zip(ob.data.vertices,originals[ob.name]):
                    vert.co=candidate_point(original_point,root_y,tip_y,
                                            root_shift,tip_shift,radial_inset,i)
                ob.data.update()
            for i in MAIN:
                ob=bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"]
                for v,original_point in zip(ob.data.vertices,originals[ob.name]):
                    x,y,z=original_point
                    r=math.hypot(x,z-AXIS_Z)
                    a=math.atan2(z-AXIS_Z,x)
                    new_r=r+radial_inset
                    v.co=(new_r*math.cos(a),y+root_shift,
                          AXIS_Z+new_r*math.sin(a))
                ob.data.update()
            scene.view_layers[0].update()
            image=dest/(preset+".png")
            scene.render.filepath=str(image)
            bpy.ops.render.render(write_still=True)
            if not image.exists() or image.stat().st_size<500:
                raise RuntimeError("R50 physically rendered native diagnostic absent")
            results.append({"name":preset,"file":image.name,
                            "mount_root_y_displacement":root_shift,
                            "fin_distal_y_recovery":tip_shift,
                            "mount_radial_inset":radial_inset})
            print("R50_ORIGINAL_SAVED_CAMERA_MOUNT_GEOMETRY",preset,flush=True)
    finally:
        for label,pts in originals.items():
            ob=bpy.data.objects[label]
            for v,pt in zip(ob.data.vertices,pts):v.co=pt
            ob.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.cycles.samples,frame)=original
        scene.frame_set(frame)
        scene.view_layers[0].update()
    verified=(original_objects=={ob.name for ob in scene.objects} and
              tuple(float(v) for row in scene.camera.matrix_world for v in row)==original_camera and
              abs(float(scene.camera.data.ortho_scale)-original_ortho)<1.e-6 and
              all(all(max(abs(a-b) for a,b in zip(tuple(v.co),pt))<1.e-6
                      for v,pt in zip(bpy.data.objects[label].data.vertices,pts))
                  for label,pts in originals.items()))
    if not verified:
        raise RuntimeError("R50 failed to restore unchanged native geometry/camera")
    record={"revision":REVISION,"original_source_sha256":SOURCE_SHA256,
            "native_size":list(CAMERA_SIZE),"original_camera_unchanged":True,
            "original_mesh_vertices_restored":True,"saved_scene_unmodified":True,
            "has_no_private_source_pixels":True,"variants":results}
    (dest/"fin-mount-candidates.json").write_text(json.dumps(record,indent=2)+"\n")
    print("R50_SAVED_SCENE_AND_ORIGINAL_MOUNT_MESHES_RESTORED",len(results),flush=True)
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    d=str(Path(__file__).resolve().parent)
    if d not in sys.path:sys.path.insert(0,d)
    run(args.output.resolve())
if __name__=="__main__":main()
