"""R85: combine source-ranked speculative TRUE casting edits onto R83 fins.

Source: real 3D R83 60% angular straightening candidate (better than R81
in exact private original 2-frame comparison). Reuse original R84 source
camera / 3D vertex transform and preserve all existing source root and
hull stay anchor vertices. Build independent real 3D candidate files:
baseline, narrowed two outer casts only, center up, center compressed,
center conservative mixed up/short, center down for edge counterexample.
Always compare exact ORIGINAL Factorio sprite privately before approving.
"""
import argparse,hashlib,json,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,NATIVE
from upper_hull_loadpath_candidate_r64 import COLLECTION as WEB_COLLECTION
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from speculative_real_cast_alignment_r84 import (cast_lock_indices,verify_mechanical,
                                                    transform_original_3d_cast)
from source_fin_mount_ears_r77 import ORIGINAL_SPRITE_SHA
REVISION="R85_real_combined_source_ranked_3d_cast_geometry"
R83_SHA="2767ca27f6eebeca6d7336362a669db554015205a43c9306ce763f6390e4c645"
NARROW=(0.,0.,.87,1.,0.)
CENTER={
 "outer_only":None,
 "center_up":(0.,-6.,1.,1.,0.),
 "center_short":(0.,0.,1.,.82,0.),
 "center_mixed":(0.,-3.,1.,.91,0.),
 "center_down_control":(0.,6.,1.,1.,0.),
}
VARIANTS=("baseline",)+tuple(CENTER)

def fingerprint_other(scene):
    h=hashlib.sha256()
    for o in sorted(scene.objects,key=lambda ob:ob.name):
        if o.type!="MESH" or o.name.startswith(MOUNT_PREFIX):continue
        h.update(o.name.encode())
        for v in o.data.vertices:
            h.update(repr((float(v.co.x),float(v.co.y),float(v.co.z))).encode())
        if o.data.shape_keys:
            for block in o.data.shape_keys.key_blocks:
                h.update(block.name.encode())
                for v in block.data:h.update(repr(tuple(v.co)).encode())
    return h.hexdigest()

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R83_SHA:
        raise RuntimeError("R85 needs exactly real saved source-verified R83 60% fins")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r83_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R85 requires real original camera and R83 mounted geometry")
    original_cam=tuple(float(x) for row in scene.camera.matrix_world for x in row)
    names={o.name for o in scene.objects}
    material={x.name:(tuple(x.diffuse_color),len(x.node_tree.nodes) if x.use_nodes else -1)
              for x in bpy.data.materials}
    original_mesh=fingerprint_other(scene)
    original_motion=fin_digest_all_frames(scene)
    webs=bpy.data.collections.get(WEB_COLLECTION)
    if webs is None:raise RuntimeError("R85 source 3D hull cast support webs missing")
    original={};locks={};stays={};joints={}
    for i in MAIN:
        mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        stay=next(s for s in webs.objects if s.get("anchored_to_exact_existing_cast")==mount.name)
        original[i]=tuple(tuple(v.co) for v in mount.data.vertices)
        locks[i]=cast_lock_indices(mount,fin,stay)
        stays[i]=stay
        joints[i]=joint_gap_world(mount,fin)
        if joints[i]>.003:raise RuntimeError("R85 original fin/mount root broken")
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_source_zip_sha256":ORIGINAL_SPRITE_SHA,
       "proprietary_original_rgba_uploaded":False,
       "official_visual_source_approved":False,"base_R83_sha256":R83_SHA,
       "saved_editable_true_3d_candidates":[]}
    for label in VARIANTS:
        for i in MAIN:
            mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            for v,pos in zip(mount.data.vertices,original[i]):v.co=pos
            mount.data.update()
        scene.frame_set(1)
        transforms={}
        if label!="baseline":
            for i in (3,1):
                mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
                transforms[str(i)]=transform_original_3d_cast(scene,mount,original[i],locks[i],NARROW)
            if CENTER[label] is not None:
                mount=bpy.data.objects[MOUNT_PREFIX+"02"]
                transforms["2"]=transform_original_3d_cast(
                    scene,mount,original[2],locks[2],CENTER[label])
        bpy.context.view_layer.update()
        contacts={}
        for i in MAIN:
            mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            contacts[str(i)]=verify_mechanical(
                mount,fin,stays[i],locks[i],original[i],joints[i])
        if fingerprint_other(scene)!=original_mesh:
            raise RuntimeError("R85 changed original R83 actual fins or other geometry")
        if {o.name for o in scene.objects}!=names:
            raise RuntimeError("R85 invented new hardware or removed original model")
        if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=original_cam:
            raise RuntimeError("R85 source camera moved")
        if {x.name:(tuple(x.diffuse_color),len(x.node_tree.nodes) if x.use_nodes else -1)
           for x in bpy.data.materials}!=material:
            raise RuntimeError("R85 changed original shaders to fake a geometric match")
        if fin_digest_all_frames(scene)!=original_motion:
            raise RuntimeError("R85 modified original 64-frame source animation")
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1);render(scene,out/(label+"_frame01.png"))
        scene.frame_set(33);render(scene,out/(label+"_frame33.png"))
        saved=None
        if label!="baseline":
            scene.frame_set(1)
            scene["fsc_r85_revision"]=REVISION
            scene["fsc_r85_original_source_visual_approved"]=False
            scene["fsc_r85_3d_speculative_cast_combination"]=label
            saved=out/(label+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:raise RuntimeError("R85 editable 3D not saved")
            bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
            if fingerprint_other(scene)!=original_mesh or fin_digest_all_frames(scene)!=original_motion:
                raise RuntimeError("R85 saved/reopened changed original finite-volume fins or motion")
            if {o.name for o in scene.objects}!=names:
                raise RuntimeError("R85 lost original object identity on saved/reopened scene")
            for i in MAIN:
                mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
                fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
                verify_mechanical(mount,fin,stays[i],locks[i],original[i],joints[i])
        report["saved_editable_true_3d_candidates"].append({
            "name":label,
            "outer_casts_narrow_13pct":label!="baseline",
            "center_cast_camera_space_proposal":list(CENTER[label]) if label in CENTER and CENTER[label] else None,
            "changed_real_cast_projected_bounds":transforms,
            "unchanged_source_hinge_and_hull_web_contacts":contacts,
            "native_frame1":label+"_frame01.png",
            "native_frame33":label+"_frame33.png",
            "saved_reopened_blend":saved.name if saved else None,
            "saved_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "same_real_fins_source_camera_original_64_frame_animation":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R83_SHA:
        raise RuntimeError("R85 changed original R83 scene on disk")
    (out/"r85_combined_source_cast_hypotheses.json").write_text(
        json.dumps(report,indent=2)+"\n")
    print("R85_REAL_3D_COMBINED_SOURCE_RANKED_MOUNTS_ALL_SAVED_REOPENED")
    print("R85_ORIGINAL_ATLAS_PRIVATE_TWO_FRAME_COMPARISON_REQUIRED")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
