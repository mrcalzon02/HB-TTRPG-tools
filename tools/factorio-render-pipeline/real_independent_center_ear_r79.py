"""R79: test physically DISTINCT two center locking-ear lengths, not cloned hinges.

Original real private source is two 2112x2168 RGBA atlases with 64 frames.
The center bridge has two short, unequal stamped/cast tab ends. R77 found
uniform .45 shortening modestly improves source-pixel accuracy in frames
1 and 33. This test selectively shortens ONLY one or both existing 3D
R55 ear meshes; source art remains local and absent from GitHub Actions.
Never animate a pivot unsupported by original physical sprite motion.
"""
import argparse,hashlib,json,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_shape_fit_r52 import joint_gap_world
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from physical_stamped_refractory_candidate_r71 import REVISION as R71_REV
from source_fin_mount_ears_r77 import (shorten_real_lug, fingerprint,
                                       SOURCE_SCENE_SHA,ORIGINAL_SPRITE_SHA,EARS)
from mount_occlusion_diagnostic_r51 import render,projected_bounds,NATIVE

REVISION="R79_two_bespoke_center_ears_independent_source_hypotheses"
# Both source-observed metal lugs remain fully 3D and attached; shapes are
# distinct; no new cylinders, axes, pivots or duplicate structural objects.
# left source index = R55_CENTER_BRIDGE_LOCK_EAR_port.
PAIR_PROFILES=((.45,.45),(.36,.45),(.45,.36),(.36,.36))

def check_protected(scene,originals,nonhinge,camera,motion,material,names,gaps):
    if {o.name for o in scene.objects}!=names:raise RuntimeError("R79 modified original model population")
    if fingerprint(scene)!=nonhinge:raise RuntimeError("R79 changed non-ear original true 3D mesh")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
        raise RuntimeError("R79 altered calibrated source camera")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
         for m in bpy.data.materials}!=material:
        raise RuntimeError("R79 changed original shader/material")
    if fin_digest_all_frames(scene)!=motion:
        raise RuntimeError("R79 changed original 64-frame fin or outer arm motion")
    for i in MAIN:
        gap=joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                             bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])
        if abs(gap-gaps[str(i)])>1e-6 or gap>.003:
            raise RuntimeError("R79 source-defined fin root is no longer attached")
    for name in EARS:
        ob=bpy.data.objects[name]
        if any((ob.data.vertices[j].co-Vector(originals[name][j])).length>1e-7
               for j in range(4)):
            raise RuntimeError("R79 moved original center bridge loaded mount surface")
    return True

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SCENE_SHA:
        raise RuntimeError("R79 requires exact saved unchanged R71 original camera model")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r71_revision")!=R71_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R79 requires source-calibrated actual R71 Blender")
    originals={name:tuple(tuple(v.co) for v in bpy.data.objects[name].data.vertices)
               for name in EARS}
    names={o.name for o in scene.objects}
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    motion=fin_digest_all_frames(scene)
    material={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
              for m in bpy.data.materials}
    nonhinge=fingerprint(scene)
    gaps={str(i):joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                       bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]) for i in MAIN}
    out.mkdir(parents=True,exist_ok=True)
    result={"revision":REVISION,"original_source_zip_sha256":ORIGINAL_SPRITE_SHA,
            "private_original_sprite_embedded":False,
            "source_visual_fidelity_approved":False,
            "saved_reference_original_sha256":SOURCE_SCENE_SHA,
            "three_bespoke_hull_mount_and_fin_root_contacts_preserved":True,
            "unrelated_geometry_material_camera_animation_unchanged":True,
            "candidates":[]}
    for left,right in PAIR_PROFILES:
        for obname,scale in zip(EARS,(left,right)):
            shorten_real_lug(bpy.data.objects[obname],originals[obname],scale)
        bpy.context.view_layer.update()
        scene.frame_set(1)
        check_protected(scene,originals,nonhinge,camera,motion,material,names,gaps)
        token="left_%03d_right_%03d"%(round(left*100),round(right*100))
        boxes={name:list(projected_bounds(scene,name)) for name in EARS}
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(token+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(token+"_frame33.png"))
        scene.frame_set(1)
        scene["fsc_r79_revision"]=REVISION
        scene["fsc_r79_original_fidelity_approved"]=False
        scene["fsc_r79_left_ear_scale"]=left
        scene["fsc_r79_right_ear_scale"]=right
        saved=out/(token+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        if saved.stat().st_size<100000:
            raise RuntimeError("R79 failed actual editable Blender scene save")
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        check_protected(scene,originals,nonhinge,camera,motion,material,names,gaps)
        for obname,scale in zip(EARS,(left,right)):
            ob=bpy.data.objects[obname]
            for i in range(8):
                target=(Vector(originals[obname][i]) if i<4 else
                        Vector(originals[obname][i-4])+
                        (Vector(originals[obname][i])-Vector(originals[obname][i-4]))*scale)
                if (ob.data.vertices[i].co-target).length>1e-5:
                    raise RuntimeError("R79 saved real side-specific ear deformation did not persist")
        result["candidates"].append({
            "left_original_ear_fraction":left,
            "right_original_ear_fraction":right,
            "actual_existing_3d_original_geometry_retained":True,
            "original_source_camera_projection_lug_boxes":boxes,
            "native_frame_1":token+"_frame01.png",
            "native_frame_33":token+"_frame33.png",
            "saved_reopened_editable_blend":saved.name,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest(),
            "original_64_frame_motion_and_three_mount_contacts_preserved":True})
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene
        scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SCENE_SHA:
        raise RuntimeError("R79 mutated original persisted model")
    (out/"r79_independent_center_ear_geometry.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R79_REAL_SAVED_REOPENED_ASYMMETRIC_SOURCE_HINGE_CANDIDATES_PASS")
    print("R79_SOURCE_PRIVATE_RGBA_COMPARISON_STILL_REQUIRED_TO_SELECT")
if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-blend",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(args.source_blend,args.out)
