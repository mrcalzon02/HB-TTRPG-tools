"""R123 isolate true curvature: remove inherited flat-sheet weighted normals,
inspect ONE master curved metal fin at genuine 3D close-up with Blender,
and keep all actual central fin source geometry, ten fin motion and bell.

Old R21 flat slotted sheet added WEIGHTED_NORMAL; the real R121 round shell
inherited the modifier. On native 264x542 camera, actual R122 embossed
vertex movement did not resolve distinct centerline shading. Never keep
sculpting blind. Compare untouched prior against corrected normals using
a temporary studio inspection camera that makes actual FIN fill viewport.
Never publish original proprietary source bitmap or pretend this is it.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
from mathutils import Matrix,Vector,Quaternion
import bpy
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as coord
import central_true_curved_master_fin_r121 as master_script

MASTER=core.FIN_PREFIX+"02"
PRIOR_REPORT="r122_real_master_source_cylinder_spine_cases.json"
CASES=(
 ("r122_strong_pressed_spine_legacy_normals","round_master_narrow_pressed_spine_055m",False),
 ("r123_strong_pressed_spine_real_smooth_curved_normals","round_master_narrow_pressed_spine_055m",True),
 ("r123_dark_center_spine_real_smooth_curved_normals","round_master_pressed_spine_035m_darker_metal",True)
)
def fin_sig(scene):
    return master_script.physical_signature(scene,(2,))
def bell_sig(scene):
    return master_script.physical_bell_signature(scene)
def normals_repair(fin):
    if not fin.get("R121_one_true_rounded_master_with_zero_fake_slots"):
        raise RuntimeError("R123 cannot inspect non-round or old punched through-slot model")
    mods=[(m.name,m.type) for m in fin.modifiers]
    remove=[m for m in fin.modifiers if m.type=="WEIGHTED_NORMAL"]
    for m in remove:fin.modifiers.remove(m)
    mesh=fin.data
    if len(mesh.vertices)!=306 or not core.manifold_edges(mesh)[0]:
        raise RuntimeError("R123 actual round master metal mesh invalid")
    # R121 faces were created as alternating true front/back cross-section
    # quads, then edge walls. Smooth only the real rounded broad skins.
    for n,p in enumerate(mesh.polygons):
        p.use_smooth=(n<2*8*16)
    mesh.update()
    fin["R123_pre_round_master_weighted_normals_removed"]=True
    fin["R123_round_master_real_smooth_surface_normals"]=True
    return {"before_modifier_types":mods,
      "weighted_normal_removed":len(remove),
      "remaining_modifier_types":[m.type for m in fin.modifiers],
      "real_curved_front_back_quads_smoothed":2*8*16,
      "closed_volume_after":core.manifold_edges(mesh)[0]}
def inspect_true_one_fin(scene,out,angle):
    main=bpy.data.objects[MASTER]
    if len(main.data.vertices)!=306:raise RuntimeError("R123 no true rounded real 3D master")
    original_camera=scene.camera
    old_hidden={o.name:o.hide_render for o in scene.objects if o.type in {"MESH","CURVE"}}
    original_render=(scene.render.resolution_x,scene.render.resolution_y,
                     scene.render.resolution_percentage,scene.cycles.samples,
                     scene.render.film_transparent)
    camdata=original_camera.data.copy()
    if camdata.type!="ORTHO":raise RuntimeError("R123 requires original ortho source camera")
    camdata.ortho_scale=1.55 # Fin is about 0.88m tall in original camera world.
    ob=bpy.data.objects.new("R123_TEMP_REAL_FIN_MACRO_CAMERA",camdata)
    scene.collection.objects.link(ob)
    original_rot=original_camera.matrix_world.to_quaternion()
    orbit=Quaternion(Vector((0,1,0)),math.radians(angle))
    rot=orbit@original_rot
    world=[main.matrix_world@v.co for v in main.data.vertices]
    center=sum(world,Vector())/len(world)
    ob.matrix_world=Matrix.Translation(center+rot@Vector((0,0,5.0)))@rot.to_matrix().to_4x4()
    lightdata=bpy.data.lights.new("R123_TEMP_SHAPE_REVEAL_AREA","AREA")
    lightdata.energy=165.0
    lightdata.shape="DISK";lightdata.size=2.5
    light=bpy.data.objects.new("R123_TEMP_SHAPE_REVEAL_AREA",lightdata)
    scene.collection.objects.link(light)
    light.location=center+rot@Vector((-.6,1.1,1.7))
    light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    try:
        for name,hidden in old_hidden.items():
            bpy.data.objects[name].hide_render=hidden or name!=MASTER
        scene.camera=ob
        scene.render.resolution_x=640
        scene.render.resolution_y=640
        scene.render.resolution_percentage=100
        scene.cycles.samples=24
        scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        scene.render.film_transparent=True
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.render.filepath=str(out)
        bpy.ops.render.render(write_still=True)
        if not out.exists() or out.stat().st_size<5000:
            raise RuntimeError("R123 actual 3D independent fin geometry macro failed")
    finally:
        scene.camera=original_camera
        for name,hidden in old_hidden.items():
            bpy.data.objects[name].hide_render=hidden
        bpy.data.objects.remove(light,do_unlink=True)
        bpy.data.lights.remove(lightdata)
        bpy.data.objects.remove(ob,do_unlink=True)
        bpy.data.cameras.remove(camdata)
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.cycles.samples,
         scene.render.film_transparent)=original_render
        bpy.context.view_layer.update()
def render_native(scene,path):
    scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
    scene.render.resolution_percentage=100
    scene.cycles.samples=8
    scene.cycles.seed=0;scene.cycles.use_animated_seed=False
    core.render(scene,path)
    if not path.exists() or path.stat().st_size<4000:
        raise RuntimeError("R123 native original camera 3D screenshot missing")
def run(indir,outdir):
    root=Path(indir).resolve()
    upstream=json.loads((root/PRIOR_REPORT).read_text())
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":"R123",
      "original_source_sha256":master_script.SRC_SHA,
      "source_sprite_published":False,"source_visual_approval":False,
      "focus":"true original central round fin normals and actual isolated Blender 3D geometry",
      "scenes":[]}
    for tag,prior_tag,fix in CASES:
        source=root/(prior_tag+".blend")
        matched=[c for c in upstream["cases"] if c["variant"]==prior_tag]
        if len(matched)!=1 or hashlib.sha256(source.read_bytes()).hexdigest()!=matched[0]["sha256"]:
            raise RuntimeError("R123 requires EXACT prior R122 one-round-master saved form")
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene;scene.frame_set(1)
        oldcamera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        oldobjs={o.name for o in scene.objects}
        other=fin_sig(scene);bell=bell_sig(scene)
        motion=core.lower_animated_fin_digest(scene)
        fin=bpy.data.objects[MASTER]
        before=tuple(tuple(v.co) for v in fin.data.vertices)
        stats=normals_repair(fin) if fix else {
          "before_modifier_types":[(m.name,m.type) for m in fin.modifiers],
          "weighted_normal_removed":0,"remaining_modifier_types":[m.type for m in fin.modifiers],
          "real_curved_front_back_quads_smoothed":None,
          "closed_volume_after":core.manifold_edges(fin.data)[0]}
        if tuple(tuple(v.co) for v in fin.data.vertices)!=before:
            raise RuntimeError("R123 illegally modified actual source fin geometry to fake normals")
        if fin_sig(scene)!=other or bell_sig(scene)!=bell:
            raise RuntimeError("R123 changed bell or rest of metal fins")
        if core.lower_animated_fin_digest(scene)!=motion:
            raise RuntimeError("R123 lower 64-frame fin animation changed")
        photos={}
        for frame in (1,33):
            scene.frame_set(frame)
            file=tag+f"_native_frame{frame:02d}.png"
            render_native(scene,out/file);photos[str(frame)]=file
        scene.frame_set(1)
        macros={}
        for angle in (0,35,65):
            name=tag+f"_ISOLATED_REAL_3D_FIN_{angle:02d}DEG.png"
            inspect_true_one_fin(scene,out/name,angle)
            macros[str(angle)]=name
        if {o.name for o in scene.objects}!=oldobjs or fin_sig(scene)!=other or bell_sig(scene)!=bell:
            raise RuntimeError("R123 temporary inspection accidentally destroyed scene")
        if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=oldcamera:
            raise RuntimeError("R123 original source camera altered")
        scene["fsc_r123_single_curved_fin_normals_test"]=tag
        scene["fsc_r123_original_source_approved"]=False
        saved=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        if scene.get("fsc_r123_single_curved_fin_normals_test")!=tag:
            raise RuntimeError("R123 actual Blender file lost round source fin state")
        if fin_sig(scene)!=other or bell_sig(scene)!=bell or core.lower_animated_fin_digest(scene)!=motion:
            raise RuntimeError("R123 source bell or lower motion altered on save")
        report["scenes"].append({"variant":tag,
            "normal_profile":stats,"real_3d_geometry_unchanged":True,
            "native_camera_frames":photos,
            "isolated_3d_fin_inspection_views":macros,
            "source_match_not_yet_approved":True,
            "editable_blend":saved.name,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest()})
        (out/"r123_actual_round_master_normals_and_isolated_3d.json").write_text(
            json.dumps(report,indent=2)+"\n")
        print("R123_ACTUAL_CYLINDRICAL_FIN_NORMALS_ISOLATED_VIEWS_SAVED",tag,flush=True)
    print("R123_3D_CYLINDRICAL_FIN_ISOLATION_PASS_NO_FAKE_REFERENCE_STILL_NEEDS_ORIGINAL_SPRITE_REVIEW",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r122-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r122_dir,a.out)
