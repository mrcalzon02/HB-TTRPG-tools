"""R75 native-camera ACTUAL MESH shadow/occlusion render isolation.

Real persisted R71 .blend, baseline vs temporarily hiding ONLY named
existing geometry groups, never changing topology or materials. This
diagnoses what contributes to the dark, apparently smooth throat.
There are NO original proprietary Factorio source pixels in this runner.
Isolation images are NOT evidence of the canonical source appearance.
"""
from pathlib import Path
from hashlib import sha256
import argparse,json,sys
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mount_occlusion_diagnostic_r51 import render
from refractory_shingle_depth_r60 import NATIVE,LINER
from physical_stamped_refractory_candidate_r71 import REVISION as R71_REV
from physical_staggered_refractory_lap_r74 import SOURCE_SHA

REVISION="R75_real_native_existing_nozzle_part_occlusion_isolation"
BAFFLES=("R11_recessed_internal_pressure_baffle_00",
         "R11_recessed_internal_pressure_baffle_01")

def diagnose(source,out):
    source=Path(source).resolve()
    digest=sha256(source.read_bytes()).hexdigest()
    if digest!=SOURCE_SHA:
        raise RuntimeError("R75 requires exact verified original R71 +.075 saved scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r71_revision")!=R71_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R75 must use same source-calibrated real 3D camera")
    scene.frame_set(1)
    oldcamera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    oldortho=float(scene.camera.data.ortho_scale)
    old_names={ob.name for ob in scene.objects}
    old_visibility={o.name:o.hide_render for o in scene.objects}
    original=(scene.render.resolution_x,scene.render.resolution_y,
        scene.render.resolution_percentage,scene.render.filepath,
        scene.render.image_settings.file_format,scene.render.image_settings.color_mode,
        scene.cycles.samples,scene.cycles.seed,scene.cycles.use_animated_seed,
        scene.frame_current)
    groups={
        "without_R11_fluted_liner":[LINER],
        "without_R11_baffle_00":[BAFFLES[0]],
        "without_R11_baffle_01":[BAFFLES[1]],
        "without_R19_near_40":[f"R19_NEAR_MOUTH_TILE_{i:02d}" for i in range(40)],
        "without_R19_mid_40":[f"R19_MID_STAGGERED_TILE_{i:02d}" for i in range(40)],
        "without_all_R19_80":[f"R19_NEAR_MOUTH_TILE_{i:02d}" for i in range(40)]+
                            [f"R19_MID_STAGGERED_TILE_{i:02d}" for i in range(40)],
    }
    for group,names in groups.items():
        if any(n not in bpy.data.objects for n in names):
            raise RuntimeError("R75 missing actual nozzle object from "+group)
        if any(old_visibility[n] for n in names):
            raise RuntimeError("R75 cannot infer base visible layer from already hidden objects")
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"saved_original_r71_blend_sha256":SOURCE_SHA,
            "private_original_factorio_sprite_present":False,
            "geometry_edit_or_material_edit_performed":False,
            "original_scene_altered_on_disk":False,
            "native_size":NATIVE,
            "native_source_camera_unchanged":True,
            "groups":[]}
    try:
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        render(scene,out/"model_only_baseline.png")
        for title,names in groups.items():
            for obname in names:
                bpy.data.objects[obname].hide_render=True
            bpy.context.view_layer.update()
            path=out/("model_only_"+title+".png")
            render(scene,path)
            report["groups"].append({"group":title,"objects_temporarily_hidden":len(names),
                                    "render":path.name,"temporary_visibility_only":True})
            for obname in names:
                bpy.data.objects[obname].hide_render=old_visibility[obname]
            bpy.context.view_layer.update()
        render(scene,out/"model_only_restored.png")
    finally:
        for obname,hidden in old_visibility.items():
            bpy.data.objects[obname].hide_render=hidden
        (scene.render.resolution_x,scene.render.resolution_y,
            scene.render.resolution_percentage,scene.render.filepath,
            scene.render.image_settings.file_format,scene.render.image_settings.color_mode,
            scene.cycles.samples,scene.cycles.seed,scene.cycles.use_animated_seed,
            frame)=original
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    if ({ob.name for ob in scene.objects}!=old_names or
        {ob.name:ob.hide_render for ob in scene.objects}!=old_visibility or
        tuple(float(v) for row in scene.camera.matrix_world for v in row)!=oldcamera or
        float(scene.camera.data.ortho_scale)!=oldortho or
        sha256(source.read_bytes()).hexdigest()!=digest):
        raise RuntimeError("R75 actual persisted Blender geometry/visibility changed")
    report["original_scene_altered_on_disk"]=False
    report["saved_scene_geometry_and_visibility_restored"]=True
    (out/"R75_MODEL_ONLY_TEMPORARY_ISOLATION.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R75_REAL_BLENDER_R11_R19_NATIVE_ISOLATION_PASS",flush=True)
    print("R75_NO_AUTHENTIC_ORIGINAL_PIXEL_COMPARISON_PERFORMED",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    diagnose(a.source_blend,a.out)
