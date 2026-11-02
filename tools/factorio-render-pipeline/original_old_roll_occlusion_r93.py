"""R93: identify remaining OLD invented roll/bell geometry hiding original hinges.

The only target is the user's real original Factorio sprite render.
R88 first-hit ownership exposed many original-camera hinge pixels claimed by
R08_black_exhaust_pressure_roll meshes and the old generic bronzed bell.
R90/R91 proved old R08 knee guards caused major source disagreement.
Reversibly hide ONLY preexisting real Blender structures one group at a time
to see whether the real source visual improves, BEFORE rebuilding them.

No new geometry, no saved changed scene, no web artwork, no original Wube
sprite in public artifacts. Art results are diagnostic, never release gates.
"""
import argparse,hashlib,json,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render,NATIVE

REVISION="R93_source_first_old_pressure_roll_vs_true_hinge_occlusion"
SOURCE_SHA="e410c19cecf5bedeacd52252e81f68e3375cb11c3a3f77fc72cd87c8d80dc67d"
USER_SPRITE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ROLL_PREFIX="R08_black_exhaust_pressure_roll"
BRONZE="vanilla_reference_bell_bronzed_rolled_bell"
BRACES=("vanilla_reference_bell_canted_brace_-1","vanilla_reference_bell_canted_brace_1")
GROUPS=(
 ("baseline",()),
 ("R08_pressure_rolls",("roll_all",)),
 ("R08_pressure_roll_0",(ROLL_PREFIX,)),
 ("R08_pressure_roll_1",(ROLL_PREFIX+".001",)),
 ("R08_pressure_roll_2",(ROLL_PREFIX+".002",)),
 ("R08_pressure_roll_3",(ROLL_PREFIX+".003",)),
 ("original_generic_rolled_bell",(BRONZE,)),
 ("R08_roll_and_generic_bell",("roll_all",BRONZE)),
 ("generic_canted_braces",BRACES),
)
def actual_members(scene,spec):
    names=[]
    if spec=="roll_all":
        names=[o.name for o in scene.objects if o.name.startswith(ROLL_PREFIX)]
    else:
        names=[spec] if scene.objects.get(spec) is not None else []
    if not names:raise RuntimeError("R93 expected specific actual original Blender shape missing: "+spec)
    return names
def run(src,out):
    src=Path(src).resolve();out=Path(out).resolve()
    if hashlib.sha256(src.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R93 requires genuine R91 best saved source-fitted Blender scene")
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r91_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R93 requires true source camera of physically remeshed hinges")
    before_flags={o.name:bool(o.hide_render) for o in scene.objects}
    before_names=set(before_flags)
    before_camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    before_motion=fin_digest_all_frames(scene)
    original_settings=(scene.render.resolution_x,scene.render.resolution_y,
                       scene.render.resolution_percentage,scene.render.filepath,
                       scene.render.image_settings.file_format,
                       scene.render.image_settings.color_mode,scene.cycles.samples,
                       scene.cycles.seed,scene.cycles.use_animated_seed)
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"verified_original_atlas_zip_sha256":USER_SPRITE_SHA,
       "original_artwork_published":False,"source_shape_approved":False,
       "real_existing_editable_blend_sha256":SOURCE_SHA,
       "original_source_camera_and_model_restored":False,
       "diagnostic_renders":[]}
    try:
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        for name,specs in GROUPS:
            for o in scene.objects:
                o.hide_render=before_flags[o.name]
            hidden=[]
            for spec in specs:
                for n in actual_members(scene,spec):
                    ob=scene.objects[n]
                    if not ob.hide_render:
                        ob.hide_render=True
                        hidden.append(n)
            if specs and not hidden:
                raise RuntimeError("R93 candidate does not toggle any actual old mesh visibility")
            scene.frame_set(1);render(scene,out/(name+"_frame01.png"))
            scene.frame_set(33);render(scene,out/(name+"_frame33.png"))
            report["diagnostic_renders"].append({
                "name":name,"original_existing_3d_meshes_hidden_temporarily":hidden,
                "true_native_frame1":name+"_frame01.png",
                "true_native_frame33":name+"_frame33.png",
                "original_source_64_frame_motion_unmodified":True})
    finally:
        for o in scene.objects:o.hide_render=before_flags[o.name]
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,scene.render.image_settings.color_mode,
         scene.cycles.samples,scene.cycles.seed,scene.cycles.use_animated_seed)=original_settings
        scene.frame_set(1)
    if ({o.name:bool(o.hide_render) for o in scene.objects}!=before_flags or
        {o.name for o in scene.objects}!=before_names or
        tuple(float(v) for row in scene.camera.matrix_world for v in row)!=before_camera or
        fin_digest_all_frames(scene)!=before_motion or
        hashlib.sha256(src.read_bytes()).hexdigest()!=SOURCE_SHA):
        raise RuntimeError("R93 failed to restore exact original native Blender model")
    report["original_source_camera_and_model_restored"]=True
    (out/"r93_actual_old_roll_bell_source_hinge_isolation.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R93_TRUE_ORIGINAL_CAMERA_OLD_HINGE_OCCLUDERS_ISOLATED_AND_RESTORED",flush=True)
    print("R93_PRIVATE_ORIGINAL_64_FRAME_ARTWORK_NOT_IN_PUBLIC_CI")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
