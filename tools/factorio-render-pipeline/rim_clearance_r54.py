"""R54: physically recess obstructing old R08 pressure rolls; do NOT delete them.

R53 traced three source-observed cast brackets and found that old R08
round nozzle pressure rolls block the mounting surface. Test retracting
the two aft original annuli into the refractory structural transition
while leaving the 3D throat shell, R19 tiles, and 64-frame motion intact.
Each combination measures the physical first-hit visibility and the
unresolved 3D root contact gap. Nothing is saved to the editable scene.

A visually plausible layout requires later bespoke mount profile and
positive physical fin-root contact. Source sprites stay off GitHub.
"""
import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy

from fin_mount_geometry_sweep_r50 import AXIS_Z,FIN_PREFIX,MOUNT_PREFIX,UPPER,MAIN
from mount_occlusion_diagnostic_r51 import NATIVE,deform_r50_d,render
from mount_shape_fit_r52 import MOUNT_TARGETS,PALE_EXISTING_CAST,fit_projected_cast,joint_gap_world
from mount_radial_visibility_r53 import radial_casting,per_mount_visibility

REVISION="R54_source_bracket_clearance_by_recessing_existing_annular_rim"
CAST_RADIAL=(.24,.48,.72)
RING_INSET=(0.,.14,.28,.42)
ROLLS=("R08_black_exhaust_pressure_roll.002",
       "R08_black_exhaust_pressure_roll.003")

def move_original_ring_inward(ob,pts,inset):
    """Concentric cast annulus stays intact and positive-radius in 3D."""
    if not ob or ob.type!="MESH" or ob.data.shape_keys or ob.animation_data:
        raise RuntimeError("R54 cannot retract non-static original R08 ring")
    if len(pts)<40:
        raise RuntimeError("R54 cannot change primitive unknown ring topology")
    for v,(x,y,z) in zip(ob.data.vertices,pts):
        r=math.hypot(x,z-AXIS_Z)
        if r<=inset+.4:
            raise RuntimeError("R54 would collapse existing pressure rim")
        factor=(r-inset)/r
        v.co=(x*factor,y,AXIS_Z+(z-AXIS_Z)*factor)
    ob.data.update()

def run(output):
    path=output/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not path.exists():
        raise RuntimeError("R54 uses actual persisted saved native .blend")
    saved_hash=sha256(path.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    from vanilla_bespoke_fin_mounts_r49 import REVISION as R49_REV
    if scene.get("fsc_r49_revision")!=R49_REV or not scene.camera or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R54 must retain source-verified R49 scenario")
    scene.frame_set(1)
    camera_before=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    names_before={x.name for x in scene.objects}
    originals={};objs={};fin_parameters={};mount_mat={}
    for i in UPPER:
        name=f"{FIN_PREFIX}{i:02d}";obj=bpy.data.objects.get(name)
        if obj is None or obj.data.shape_keys:
            raise RuntimeError("R54 source upper fin unrecognized")
        objs[name]=obj
        originals[name]=tuple(tuple(v.co) for v in obj.data.vertices)
        fin_parameters[i]=(obj.data.vertices[0].co.y,obj.data.vertices[99].co.y)
    for i in MAIN:
        name=f"{MOUNT_PREFIX}{i:02d}";obj=bpy.data.objects.get(name)
        if obj is None or len(obj.data.materials)!=1:
            raise RuntimeError("R54 requires bespoke castings")
        objs[name]=obj
        originals[name]=tuple(tuple(v.co) for v in obj.data.vertices)
        mount_mat[name]=obj.data.materials[0]
    for name in ROLLS:
        obj=bpy.data.objects.get(name)
        if obj is None or obj.type!="MESH":
            raise RuntimeError("R54 required original protruding rim missing: "+name)
        objs[name]=obj
        originals[name]=tuple(tuple(v.co) for v in obj.data.vertices)
    existing_mat=bpy.data.materials.get(PALE_EXISTING_CAST)
    if not existing_mat:raise RuntimeError("R54 cast shader unavailable")
    old=(scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,scene.frame_current)
    out=output/"test-04-vanilla-approx"/"rim-clearance-r54"
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_scene_sha256":saved_hash,
            "native_size":list(NATIVE),"original_source_bitmap_redistributed":False,
            "reversible_only_no_new_rings":True,"variants":[]}
    try:
        deform_r50_d(objs,originals,fin_parameters)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        for cast_delta in CAST_RADIAL:
            for ring_inset in RING_INSET:
                for name in ROLLS:
                    move_original_ring_inward(objs[name],originals[name],ring_inset)
                for i in MAIN:
                    name=f"{MOUNT_PREFIX}{i:02d}"
                    obj=objs[name]
                    for v,(x,y,z) in zip(obj.data.vertices,originals[name]):
                        radial=math.hypot(x,z-AXIS_Z)
                        angle=math.atan2(z-AXIS_Z,x)
                        r=radial-.34
                        v.co=(r*math.cos(angle),y-.92,
                              AXIS_Z+r*math.sin(angle))
                    obj.data.update()
                    radial_casting(obj,cast_delta)
                    fit_projected_cast(scene,obj,MOUNT_TARGETS[i])
                    obj.data.materials[0]=existing_mat
                bpy.context.view_layer.update()
                visibility=per_mount_visibility(scene)
                for i in MAIN:
                    visibility[str(i)]["root_gap_tiles"]=round(joint_gap_world(
                        objs[f"{MOUNT_PREFIX}{i:02d}"],
                        objs[f"{FIN_PREFIX}{i:02d}"]),4)
                key=f"cast_{cast_delta:.2f}_rim_{ring_inset:.2f}".replace(".","_")
                render(scene,out/(key+".png"))
                report["variants"].append({"cast_radial_tiles":cast_delta,
                                           "roll_radial_recess_tiles":ring_inset,
                                           "by_mount":visibility,"file":key+".png"})
                print("R54_ANNULUS_MOUNT_PHYSICAL_RAYS",cast_delta,ring_inset,
                      json.dumps({k:v["cast_visible_fraction"] for k,v in visibility.items()}),
                      flush=True)
    finally:
        for name,pts in originals.items():
            obj=objs[name]
            for v,pt in zip(obj.data.vertices,pts):v.co=pt
            obj.data.update()
        for name,mat in mount_mat.items(): objs[name].data.materials[0]=mat
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=old
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    report["verified_restore"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                for v,pt in zip(objs[name].data.vertices,pts))
            for name,pts in originals.items())
        and all(objs[name].data.materials[0]==mat for name,mat in mount_mat.items())
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==camera_before
        and names_before=={o.name for o in scene.objects}
        and sha256(path.read_bytes()).hexdigest()==saved_hash)
    if not report["verified_restore"]:
        raise RuntimeError("R54 original ring, fins, castings or camera mutated")
    (out/"rim-clearance-variants.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R54_ORIGINAL_SAVED_SCENE_AND_RIM_RESTORED",len(report["variants"]),flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
