"""R92 independently combine source-fitted left/right REAL 3D hinge contours.

The original Factorio body sprite is the sole geometry/appearance authority.
R91 measured raised 3D profile best overall and on port, tight on starboard.
Test asymmetric mix by replacing ONLY the genuine R89 finite-volume side
mesh vertex coordinates with those from verified saved R91 scenes. This is
not texture mixing, not a 2D overlay and not a fabricated hinge mechanism.
All original fin roots/hull stays and animation, non-source 3D geometry,
camera/materials and source R08 knee visibility remain unchanged.

Read exact original 264x542 source RGBA privately after CI run, never add
proprietary Wube art to public GitHub Actions or source code.
"""
import argparse,hashlib,json,math,sys,struct
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render,NATIVE

REVISION="R92_source_specific_independent_3d_hinge_contour_mix"
USER_SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SOURCES={
 "raised":("raised_hidden.blend","e410c19cecf5bedeacd52252e81f68e3375cb11c3a3f77fc72cd87c8d80dc67d"),
 "tight":("tight_hidden.blend","7dec84ce6420a96781025d92949249670354934047fb3402a36a3075586f54bf")
}
PORT="R89_SOURCE_FITTED_PORT_CAST"
RIGHT="R89_SOURCE_FITTED_STARBOARD_CAST"
SOURCE_OBS=(PORT,RIGHT)
PROFILE_COMBINATIONS=(("raised","raised"),("raised","tight"),
                      ("tight","raised"),("tight","tight"))
def protected_mesh(scene):
    h=hashlib.sha256()
    for obj in sorted(scene.objects,key=lambda ob:ob.name):
        if obj.type!="MESH" or obj.name in SOURCE_OBS:continue
        h.update(obj.name.encode())
        h.update(struct.pack("<II",len(obj.data.vertices),len(obj.data.polygons)))
        for v in obj.data.vertices:h.update(struct.pack("<fff",*v.co))
    return h.hexdigest()
def scene_valid(scene):
    if (scene.camera is None or scene.camera.data.type!="ORTHO" or
        scene.get("fsc_r91_revision") is None or
        scene.get("fsc_r89_revision") is None):
        raise RuntimeError("R92 actual source-traced native-camera hinged model required")
    if any(not bpy.data.objects.get(n) or
           bpy.data.objects[n].type!="MESH" for n in SOURCE_OBS):
        raise RuntimeError("R92 missing source-fitted real layered original hinge shell")
    if not all(bpy.data.objects[n].hide_render for n in
       ("R08_knee_guard","R08_knee_guard.001")):
        raise RuntimeError("R92 requires prior source-proven obsolete knee guards hidden")
    for i in MAIN:
        if joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                          bpy.data.objects[FIN_PREFIX+f"{i:02d}"])>.003:
            raise RuntimeError("R92 source 3D fin root detached from original cast")
def get_mesh_state(ob):
    return {"coords":[tuple(v.co) for v in ob.data.vertices],
            "matrix":tuple(float(v) for row in ob.matrix_world for v in row),
            "faces":len(ob.data.polygons),"materials":[mat.name for mat in ob.data.materials]}
def apply_geo(ob,stored):
    if len(ob.data.vertices)!=len(stored["coords"]) or len(ob.data.polygons)!=stored["faces"]:
        raise RuntimeError("R92 original source-fed 3D topology differs across candidates")
    mat=list(mat.name for mat in ob.data.materials)
    if mat!=stored["materials"]:
        raise RuntimeError("R92 different materials would invalidate only-shape source comparison")
    before=tuple(float(v) for row in ob.matrix_world for v in row)
    if any(abs(a-b)>1e-5 for a,b in zip(before,stored["matrix"])):
        raise RuntimeError("R92 source camera/local 3D object transformation inconsistent")
    for v,p in zip(ob.data.vertices,stored["coords"]):
        v.co=p
    ob.data.update()
    if any(face.area<1e-10 for face in ob.data.polygons):
        raise RuntimeError("R92 produced degenerate actual original cast metal surface")
    return {"real_3d_layered_vertices":len(ob.data.vertices),
            "real_3d_layered_faces":len(ob.data.polygons),
            "distinct_source_casting_identity":ob.name}
def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    states={};baseline=None
    for family,(filename,sha) in SOURCES.items():
        path=source/filename
        if hashlib.sha256(path.read_bytes()).hexdigest()!=sha:
            raise RuntimeError("R92 must load precisely saved and verified real R91 models")
        bpy.ops.wm.open_mainfile(filepath=str(path))
        scene=bpy.context.scene;scene.frame_set(1)
        scene_valid(scene)
        protected=protected_mesh(scene)
        cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        materials={x.name:(tuple(x.diffuse_color),len(x.node_tree.nodes) if x.use_nodes else -1)
                   for x in bpy.data.materials}
        keys=fin_digest_all_frames(scene)
        names={o.name for o in scene.objects}
        if baseline is None:
            baseline={"protected":protected,"camera":cam,"materials":materials,
                      "motion":keys,"objects":names}
        elif any((baseline["protected"]!=protected,baseline["camera"]!=cam,
                  baseline["materials"]!=materials,baseline["motion"]!=keys,
                  baseline["objects"]!=names)):
            raise RuntimeError("R92 model inputs differ outside original 3D source hinge shape")
        states[family]={n:get_mesh_state(bpy.data.objects[n]) for n in SOURCE_OBS}
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_user_sprite_SHA256":USER_SOURCE_SHA,
       "original_source_images_in_artifact":False,
       "source_visual_fidelity_approved":False,
       "unmodified_production_model":True,
       "combinations":[]}
    for left,right in PROFILE_COMBINATIONS:
        # Reset native original R91 raised Blender candidate each time.
        raised_file=source/SOURCES["raised"][0]
        bpy.ops.wm.open_mainfile(filepath=str(raised_file))
        scene=bpy.context.scene;scene.frame_set(1)
        scene_valid(scene)
        records={
            PORT:apply_geo(bpy.data.objects[PORT],states[left][PORT]),
            RIGHT:apply_geo(bpy.data.objects[RIGHT],states[right][RIGHT])
        }
        bpy.context.view_layer.update()
        if (protected_mesh(scene)!=baseline["protected"] or
            tuple(float(v) for row in scene.camera.matrix_world for v in row)!=baseline["camera"] or
            fin_digest_all_frames(scene)!=baseline["motion"] or
            {o.name for o in scene.objects}!=baseline["objects"]):
            raise RuntimeError("R92 changed model features beyond source cast geometry")
        if {x.name:(tuple(x.diffuse_color),len(x.node_tree.nodes) if x.use_nodes else -1)
             for x in bpy.data.materials}!=baseline["materials"]:
            raise RuntimeError("R92 silently changed original material instead of original geometry")
        name=f"port_{left}_starboard_{right}"
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1);render(scene,out/(name+"_frame01.png"))
        scene.frame_set(33);render(scene,out/(name+"_frame33.png"))
        saved=None
        if left!=right:
            scene.frame_set(1)
            scene["fsc_r92_revision"]=REVISION
            scene["fsc_r92_source_port"]=left
            scene["fsc_r92_source_starboard"]=right
            scene["fsc_r92_original_sprite_fidelity_approved"]=False
            saved=out/(name+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R92 failed to save editable original 3D source case")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            scene_valid(scene)
            if (protected_mesh(scene)!=baseline["protected"] or
                 fin_digest_all_frames(scene)!=baseline["motion"]):
                raise RuntimeError("R92 original 64-frame motion/unchanged 3D mesh lost after save/reopen")
            for obj_name,family in ((PORT,left),(RIGHT,right)):
                now=bpy.data.objects[obj_name]
                earlier=states[family][obj_name]["coords"]
                if any((v.co-Vector(p)).length>1e-5
                       for v,p in zip(now.data.vertices,earlier)):
                    raise RuntimeError("R92 actual source-specific edited mesh did not persist")
        report["combinations"].append({
          "name":name,"port_original_source_profile":left,
          "starboard_original_source_profile":right,
          "actual_separate_nonidentical_3d_cast_meshes":records,
          "native_frame01":name+"_frame01.png",
          "native_frame33":name+"_frame33.png",
          "saved_reopened_editable_blend":saved.name if saved else None,
          "saved_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
          "original_fin_contacts_and_64_frame_motion_retained":True})
    for family,(filename,sha) in SOURCES.items():
        if hashlib.sha256((source/filename).read_bytes()).hexdigest()!=sha:
            raise RuntimeError("R92 original working R91 editable Blender candidate changed")
    (out/"r92_original_source_independent_cast_contours.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R92_REAL_3D_SOURCE_SIDE_SPECIFIC_CAST_MIX_SAVED_REOPENED_VERIFIED",flush=True)
    print("R92_EXACT_ORIGINAL_RGBA_PRIVATELY_COMPARE_BEFORE_APPROVAL",flush=True)
if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    a=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_dir,a.out)
