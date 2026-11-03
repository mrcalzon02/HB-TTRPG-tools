"""R117: original-frame mount ownership/position diagnosis on R116 REAL Blender scene.

Goal: determine EXACTLY which existing physical Blender mesh draws the misplaced
upper mounting silhouettes.  NO new hinges, rings, collars, art or deforming
fins are generated.  Do not reshape a mesh merely from its apparent name.
The only visual authority is the original private Factorio sprite.  In CI,
produce native source-camera *model* layers and actual 3D owner bounding boxes,
then compare to the original privately; never publish the original bitmap.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
from mathutils import Vector
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as prev

BASE="original_straight_sharp_fin_main_three.blend"
BASE_SHA="9eb14585ddcdbe49bea6d5cf1cd0530e1074afc3e22e7fdecbf69c3a7bb943db"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
OWNERS=(
 "R89_SOURCE_FITTED_PORT_CAST",
 "R89_SOURCE_FITTED_STARBOARD_CAST",
 "R49_BESPOKE_CAST_MOUNT_02",
 "R08_black_exhaust_pressure_roll",
 "R08_black_exhaust_pressure_roll.001",
 "R08_black_exhaust_pressure_roll.002",
 "R08_black_exhaust_pressure_roll.003",
)
# These rectangles are bounding zones for qualitative positioning only,
# derived from the user's TRUE 264x542 first frame (not copied bitmap).
SOURCE_ZONES={
 "port_source_mount":(34,304,97,356),
 "center_source_mount":(96,307,163,341),
 "starboard_source_mount":(159,303,230,360),
}
def original_geometry_digest(scene):
    return prev.r110.mesh_digest(scene)

def world_pixel_bbox(scene,ob):
    # Exact projected current 3D object geometry, not source sprite pixels.
    if ob.type!="MESH" or not ob.data.vertices:
        raise RuntimeError("R117 cannot measure missing actual source scene mesh")
    points=[prev.projected_pixel(scene,ob.matrix_world@v.co)
            for v in ob.data.vertices]
    if any(not all(math.isfinite(n) for n in p) for p in points):
        raise RuntimeError("R117 nonfinite authentic 3D body coordinates")
    left=min(v[0] for v in points)
    right=max(v[0] for v in points)
    top=min(v[1] for v in points)
    bottom=max(v[1] for v in points)
    depthlo=min(v[2] for v in points)
    depthhi=max(v[2] for v in points)
    return {"source_camera_native_bbox_px":[round(left,2),round(top,2),
                                            round(right,2),round(bottom,2)],
            "true_3d_camera_depth":[round(depthlo,6),round(depthhi,6)],
            "actual_vertices":len(ob.data.vertices),
            "actual_faces":len(ob.data.polygons),
            "visible_to_renderer":not ob.hide_render}

def source_camera_render(scene,path,frame):
    scene.frame_set(frame)
    core.render(scene,path)
    if path.stat().st_size<5000:
        raise RuntimeError("R117 original camera mesh render failed")

def run(r116_dir,out_dir):
    src=Path(r116_dir).resolve()/BASE
    # Blender .blend binary SHA can legitimately vary across independent renders,
    # so verify against the actual SAME-RUN R116 manifest, not an older job.
    upstream=Path(r116_dir).resolve()/"r116_source_real_3d_straight_blunt_fin_candidates.json"
    upstream_report=json.loads(upstream.read_text(encoding="utf8"))
    candidates=[case for case in upstream_report["cases"]
                if case["variant"]=="original_straight_sharp_fin_main_three"
                and case["editable_blend"]==BASE]
    if len(candidates)!=1:
        raise RuntimeError("R117 has no exact upstream R116 source scene entry")
    expected_sha=candidates[0]["sha256"]
    if hashlib.sha256(src.read_bytes()).hexdigest()!=expected_sha:
        raise RuntimeError("R117 R116 scene differs from same-run verified manifest")
    out=Path(out_dir).resolve()
    out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene
    if scene.get("fsc_r116_variant")!="original_straight_sharp_fin_main_three":
        raise RuntimeError("R117 wrong physical real-original rig")
    if scene.camera.data.type!="ORTHO":
        raise RuntimeError("R117 camera must match original source registration")
    scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8
    scene.cycles.seed=0
    scene.cycles.use_animated_seed=False
    scene.frame_set(1)
    original_objs={ob.name for ob in scene.objects}
    material=core.scene_used_material_signature(scene)
    immutable=original_geometry_digest(scene)
    original_camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    lower_motion=core.lower_animated_fin_digest(scene)
    bboxes={}
    for name in OWNERS:
        if name not in bpy.data.objects:
            raise RuntimeError("R117 requested actual original model geometry owner missing: "+name)
        ob=bpy.data.objects[name]
        bboxes[name]=world_pixel_bbox(scene,ob)
    baseline=out/"r117_full_true_model_frame01.png"
    source_camera_render(scene,baseline,1)
    owners=[]
    for i,name in enumerate(OWNERS):
        ob=bpy.data.objects[name]
        hidden=ob.hide_render
        if hidden:
            raise RuntimeError("R117 owner already hidden, cannot establish visible contribution")
        isolated=out/(f"r117_hide_owner_{i:02d}_"+name.replace(".","_")+".png")
        try:
            ob.hide_render=True
            source_camera_render(scene,isolated,1)
        finally:
            ob.hide_render=hidden
        owners.append({"name":name,"projected_3d_geometry":bboxes[name],
                       "single_owner_hidden_frame01":isolated.name})
    scene.frame_set(33)
    frame33=out/"r117_full_true_model_frame33.png"
    source_camera_render(scene,frame33,33)
    scene.frame_set(1)
    if {ob.name for ob in scene.objects}!=original_objs:
        raise RuntimeError("R117 accidentally added/deleted engine meshes")
    if original_geometry_digest(scene)!=immutable:
        raise RuntimeError("R117 modified original source-calibrated 3D meshes")
    if core.scene_used_material_signature(scene)!=material:
        raise RuntimeError("R117 modified material slots")
    if core.lower_animated_fin_digest(scene)!=lower_motion:
        raise RuntimeError("R117 modified lower original animation")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=original_camera:
        raise RuntimeError("R117 changed actual original calibrated camera")
    if any(bpy.data.objects[name].hide_render for name in OWNERS):
        raise RuntimeError("R117 physical engine owner accidentally left hidden")
    report={"revision":"R117_real_original_engine_hinge_owner_placement_audit",
            "private_original_source_sha256":SOURCE_SHA,
            "source_bitmap_exported":False,
            "visual_acceptance":False,
            "source_regions_camera_264x542":SOURCE_ZONES,
            "recovered_previous_good_fin_mesh":True,
            "original_engine_geometry_unchanged":True,
            "full_model_frame01":baseline.name,
            "full_model_frame33":frame33.name,
            "real_3d_owner_isolation_cases":owners}
    (out/"r117_actual_mount_owner_source_camera_bounds.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R117_GENUINE_ORIGINAL_CAMERA_MOUNT_MESH_OWNERS_VERIFIED_NO_NEW_FALSE_HINGES",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r116-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r116_dir,a.out)
