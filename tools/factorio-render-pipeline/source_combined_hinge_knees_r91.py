"""R91: combine independent source-traced true 3D casting profiles with R08 knee fixes.

Source authority is the real user Factorio 64-frame body sprite. Two R89
actual volume variants (source_tight / source_raise) are compared across
different old R08 knee mesh scales, keeping the actual correct R08 aft shroud
wings, R11/R19 deep throat, original camera/shader, all five real R81/R83
heat fins, separate R49-to-fin contacts and all R64 chassis web contacts.

This is speculative real Blender geometry, not an invented mechanical design.
No original protected source atlas appears in the CI environment.
"""
import argparse,hashlib,json,sys,math
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from source_knee_guard_size_sweep_r90 import KNEES,change_actual_knee,mesh_fingerprint
from mount_occlusion_diagnostic_r51 import render,NATIVE
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames

REVISION="R91_true_original_source_combined_side_mount_and_knee_size"
ORIGINAL_ARCHIVE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SOURCE_SCENES={
 "tight":("source_tight.blend","21ec963ddacbdd9005abd4c415da63fb44c6a104f044bdf7c7d0a8816615c179"),
 "raised":("source_raise.blend","713ed881336ad8c4918df70c89150b9e81554aea87473accc1dd94764c08a087")
}
GUARD_PAIRS=(
 ("original",1.,1.),
 ("separate_70_40",.70,.40),
 ("both_40",.40,.40),
 ("hidden",0.,0.))
def render_real_native(scene,out,label):
    scene.render.resolution_x,scene.render.resolution_y=NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8
    scene.cycles.seed=0;scene.cycles.use_animated_seed=False
    scene.frame_set(1);render(scene,out/(label+"_frame01.png"))
    scene.frame_set(33);render(scene,out/(label+"_frame33.png"))
def run(base,out):
    base=Path(base).resolve();out=Path(out).resolve()
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"private_source_original_archive_sha256":ORIGINAL_ARCHIVE_SHA,
            "original_source_images_in_artifact":False,
            "original_source_fidelity_approved":False,
            "no_initial_source_scene_overwritten":True,
            "experiments":[]}
    for family,(file,sha) in SOURCE_SCENES.items():
        src=base/file
        if hashlib.sha256(src.read_bytes()).hexdigest()!=sha:
            raise RuntimeError("R91 source not verified real R89 source-rendered .blend "+file)
        for tag,left,right in GUARD_PAIRS:
            # ALWAYS reload true original R89 scene for every candidate;
            # do not chain successive deformations or invalid RNA objects.
            bpy.ops.wm.open_mainfile(filepath=str(src))
            scene=bpy.context.scene
            scene.frame_set(1)
            if scene.get("fsc_r89_revision") is None or scene.camera.data.type!="ORTHO":
                raise RuntimeError("R91 requires saved real R89 source camera rig")
            names={o.name for o in scene.objects}
            camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
            mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
                  for m in bpy.data.materials}
            previous_motion=fin_digest_all_frames(scene)
            original_protected=mesh_fingerprint(scene)
            coords={n:[tuple(v.co) for v in bpy.data.objects[n].data.vertices]
                    for n in KNEES}
            baseline_roots={str(i):joint_gap_world(
                bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
                for i in MAIN}
            if any(d>.003 for d in baseline_roots.values()):
                raise RuntimeError("R91 has broken true original R49-to-fin root from R89")
            knees={}
            for name,factor in zip(KNEES,(left,right)):
                knees[name]=change_actual_knee(bpy.data.objects[name],coords[name],factor)
            bpy.context.view_layer.update()
            if mesh_fingerprint(scene)!=original_protected:
                raise RuntimeError("R91 altered actual genuine newly reconstructed hinge geometry")
            if {o.name for o in scene.objects}!=names:
                raise RuntimeError("R91 created source-unobserved 3D objects")
            if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
                raise RuntimeError("R91 moved native original calibration camera")
            if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
               for m in bpy.data.materials}!=mats:
                raise RuntimeError("R91 modified original source material rather than physical geometry")
            if fin_digest_all_frames(scene)!=previous_motion:
                raise RuntimeError("R91 broke original 64-frame animation")
            for i in MAIN:
                gap=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                      bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
                if abs(gap-baseline_roots[str(i)])>1.e-6:
                    raise RuntimeError("R91 detached real three fin-to-hull mounting roots")
            label=family+"_"+tag
            render_real_native(scene,out,label)
            saved=None
            if tag!="original":
                scene.frame_set(1)
                scene["fsc_r91_revision"]=REVISION
                scene["fsc_r91_source_profile"]=family
                scene["fsc_r91_real_knee_scale_left"]=left
                scene["fsc_r91_real_knee_scale_right"]=right
                scene["fsc_r91_original_sprite_fidelity_approved"]=False
                saved=out/(label+".blend")
                bpy.ops.wm.save_as_mainfile(filepath=str(saved))
                if saved.stat().st_size<100000:
                    raise RuntimeError("R91 failed real Blender editable save")
                bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
                if mesh_fingerprint(scene)!=original_protected:
                    raise RuntimeError("R91 lost protected actual source cast geometry on reopen")
                if fin_digest_all_frames(scene)!=previous_motion:
                    raise RuntimeError("R91 lost source animation after reopening")
                for name,factor in zip(KNEES,(left,right)):
                    obj=bpy.data.objects[name]
                    if obj.hide_render!=(factor==0):
                        raise RuntimeError("R91 hide_render knee state lost after Blender reopen")
                    if factor:
                        center=sum((Vector(v) for v in coords[name]),Vector((0.,0.,0.)))/len(coords[name])
                        for v,b in zip(obj.data.vertices,coords[name]):
                            if (v.co-(center+(Vector(b)-center)*factor)).length>1.e-5:
                                raise RuntimeError("R91 Blender did not retain physical knee size")
            report["experiments"].append({
                "name":label,"source_traced_cast_profile":family,
                "port_knee_real_3d_scale":left,
                "starboard_knee_real_3d_scale":right,
                "actual_existing_knee_mesh_status":knees,
                "original_r89_true_source_hinge_mesh_protected":True,
                "native_frame1":label+"_frame01.png",
                "native_frame33":label+"_frame33.png",
                "saved_reopened_editable_blend":saved.name if saved else None,
                "saved_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None})
        if hashlib.sha256(src.read_bytes()).hexdigest()!=sha:
            raise RuntimeError("R91 changed upstream verified R89 source model")
    (out/"r91_source_first_combined_hinge_knee_experiments.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R91_SOURCE_TRACED_CAST_AND_GENUINE_FIN_CONNECTED_3D_KNEE_CANDIDATES_PASS",flush=True)
    print("R91_PRIVATE_ORIGINAL_SOURCE_RGB_AND_CONTOUR_RANKING_REQUIRED",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_dir,a.out)
