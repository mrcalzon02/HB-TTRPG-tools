"""R88: actual 3D first-hit ownership of LEFT and RIGHT source hinge regions.

Before sculpting the wrong mesh, ray-cast exact original-camera native rays
against the verified R85 .blend and identify the frontmost actual mesh
owners. Also make reversible A/B hide-render probes for three preexisting
families (R49 bespoke casts, R64 hull stays, R21 pressed clevis hardware).
No physical model edits, no unrelated pictures, no source Wube atlas
publishing. The original user source is compared privately after capture.
"""
import argparse,hashlib,json,sys
from pathlib import Path
from collections import Counter
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mount_occlusion_diagnostic_r51 import camera_ray,render,NATIVE
from save_connected_cast_candidate_r66 import fin_digest_all_frames
REVISION="R88_actual_bespoke_hinge_visible_mesh_ownership"
MODEL_SHA="4343640f04b179c3b08ec2bdce1de77582e21cc45e195f173816603b709c36b7"
ROI={"port_hinge":(20,300,101,393),
     "starboard_hinge":(157,300,232,393),
     "center_hinge":(91,305,170,381)}
FAMILIES={
 "R49_casts":lambda n:n.startswith("R49_BESPOKE_CAST_MOUNT_"),
 "R64_hull_stays":lambda n:n.startswith("R64_"),
 "R21_clevis_hardware":lambda n:n.startswith(("R21_CLEVIS_TRANSVERSE_PIN_","R21_PINNED_CLEVIS_EAR_")),
}
def family(name):
    for group,match in FAMILIES.items():
        if match(name):return group
    if name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_"):return "real_fin"
    if name.startswith("R55_CENTER_BRIDGE_LOCK_EAR_"):return "center_tabs"
    if name=="<NO_HIT>":return "no_hit"
    return "other_original_geometry"

def capture_hit_stats(scene):
    scene.frame_set(1)
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    result={}
    for region,(x0,y0,x1,y1) in ROI.items():
        counts=Counter()
        groups=Counter()
        for yy in range(y0,y1,2):
            for xx in range(x0,x1,2):
                origin,direction=camera_ray(scene.camera,scene,xx,yy)
                hit,p,n,face,ob,mtx=scene.ray_cast(dg,origin,direction,distance=300.)
                name=ob.name if hit else "<NO_HIT>"
                counts[name]+=1
                groups[family(name)]+=1
        result[region]={"native_original_image_roi_xyxy":[x0,y0,x1,y1],
          "real_camera_raycast_sample_spacing_pixels":2,
          "sample_count":sum(counts.values()),
          "first_hit_meshes":dict(counts.most_common()),
          "first_hit_families":dict(groups.most_common())}
    return result

def main(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=MODEL_SHA:
        raise RuntimeError("R88 requires exact verified R85 Blender candidate")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.camera.data.type!="ORTHO" or scene.get("fsc_r85_revision") is None:
        raise RuntimeError("R88 has wrong original camera or prior calibrated model")
    names={o.name for o in scene.objects}
    hidden={o.name:bool(o.hide_render) for o in scene.objects}
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    motion=fin_digest_all_frames(scene)
    saved_original=(scene.render.resolution_x,scene.render.resolution_y,
       scene.render.resolution_percentage,scene.render.filepath,
       scene.render.image_settings.file_format,scene.render.image_settings.color_mode,
       scene.cycles.samples,scene.cycles.seed,scene.cycles.use_animated_seed)
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_user_source_included":False,
            "true_mesh_ownership_not_source_sprite_shape_acceptance":True,
            "source_model_sha256":MODEL_SHA,
            "native_hinge_occlusion":capture_hit_stats(scene),
            "isolations":[]}
    try:
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        for family_name in ("all_baseline",)+tuple(FAMILIES):
            for o in scene.objects:o.hide_render=hidden[o.name]
            hidden_count=0
            if family_name in FAMILIES:
                predicate=FAMILIES[family_name]
                for ob in scene.objects:
                    if predicate(ob.name) and not hidden[ob.name]:
                        ob.hide_render=True;hidden_count+=1
                if hidden_count==0:raise RuntimeError("R88 diagnostic family absent: "+family_name)
            scene.frame_set(1)
            render(scene,out/(family_name+"_frame01.png"))
            scene.frame_set(33)
            render(scene,out/(family_name+"_frame33.png"))
            report["isolations"].append({"family_hidden":family_name,
              "physical_existing_meshes_hidden_temporarily":hidden_count,
              "actual_frame1":family_name+"_frame01.png",
              "actual_frame33":family_name+"_frame33.png"})
    finally:
        for o in scene.objects:o.hide_render=hidden[o.name]
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,scene.render.image_settings.color_mode,
         scene.cycles.samples,scene.cycles.seed,scene.cycles.use_animated_seed)=saved_original
        scene.frame_set(1)
    if (names!={o.name for o in scene.objects} or
        hidden!={o.name:bool(o.hide_render) for o in scene.objects} or
        camera!=tuple(float(v) for row in scene.camera.matrix_world for v in row) or
        motion!=fin_digest_all_frames(scene) or
        hashlib.sha256(source.read_bytes()).hexdigest()!=MODEL_SHA):
        raise RuntimeError("R88 failed restore of original R85 Blender rig")
    report["all_original_render_flags_camera_motion_and_saved_model_restored"]=True
    (out/"r88_actual_3d_hinge_mesh_ownership.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R88_ACTUAL_ORIGINAL_CAMERA_HINGE_MESH_FIRST_HIT_OWNERSHIP_PASS")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    main(a.source_blend,a.out)
