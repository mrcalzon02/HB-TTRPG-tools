"""R77 actual original-source hinge correction: TWO existing center lug lengths.

Source authority is SHA-verified user private thruster.zip (not bundled here).
Original frame 1 shows two short cream integral ears BELOW the broad central
injection casting. The saved R71 reconstruction has U-shaped long bars that
project visibly further down the center heat sheet. Shorten ONLY the free
(lower) four vertices of EACH existing R55 ear, preserve the attached upper
four vertices in place; do not invent hinge pins, pistons or animations.

These are physical editable Blender models; comparison to the real source is
PRIVATE, separately performed, and a successful CI does not mean approval.
"""
import argparse,hashlib,json,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_shape_fit_r52 import joint_gap_world
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from physical_stamped_refractory_candidate_r71 import REVISION as R71_REV
from mount_occlusion_diagnostic_r51 import render,projected_bounds,NATIVE

REVISION="R77_source_observed_shorter_center_locking_ears"
SOURCE_SCENE_SHA="e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa"
ORIGINAL_SPRITE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
EARS=("R55_CENTER_BRIDGE_LOCK_EAR_port","R55_CENTER_BRIDGE_LOCK_EAR_starboard")
STRENGTH=(1.,.65,.45)

def fingerprint(scene):
    h=hashlib.sha256()
    for ob in sorted(scene.objects,key=lambda o:o.name):
        if ob.name in EARS or ob.type!="MESH":continue
        h.update(ob.name.encode())
        h.update(struct.pack("<II",len(ob.data.vertices),len(ob.data.polygons)))
        for v in ob.data.vertices:
            h.update(struct.pack("<fff",*v.co))
    return h.hexdigest()

def shorten_real_lug(ob,pts,f):
    if ob.type!="MESH" or len(ob.data.vertices)!=8 or len(ob.data.polygons)!=6:
        raise RuntimeError("R77 requires exact original R55 eight-vertex true solid ear")
    if ob.animation_data or ob.data.shape_keys or len(ob.data.materials)!=1:
        raise RuntimeError("R77 refuses modified source lug rig or material")
    if not .35<=f<=1:raise ValueError(f)
    for i,v in enumerate(ob.data.vertices):
        if i<4:
            v.co=pts[i]
        else:
            top=Vector(pts[i-4])
            end=Vector(pts[i])
            v.co=top+(end-top)*f
    ob.data.update()
    if any((ob.data.vertices[i].co-Vector(pts[i])).length>1e-7 for i in range(4)):
        raise RuntimeError("R77 moved the existing upper mount attaching vertices")
    if any(p.area<1e-9 for p in ob.data.polygons):
        raise RuntimeError("R77 collapsed original ear geometry")
    for i in range(4):
        if (ob.data.vertices[i+4].co-ob.data.vertices[i].co).length<.025:
            raise RuntimeError("R77 shortened ear to decorative zero-thickness pad")
    return {"eight_original_vertices_retained":8,"original_faces_retained":6,
            "upper_four_real_3d_attachment_vertices_preserved":True,
            "four_free_end_vertices_scaled":4}

def inspect(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SCENE_SHA:
        raise RuntimeError("R77 requires exact unedited saved R71+075 source scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r71_revision")!=R71_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R77 requires original Factorio calibration camera and real R71 model")
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    ortho=float(scene.camera.data.ortho_scale)
    mats={x.name:tuple(x.diffuse_color) for x in bpy.data.materials}
    objects={x.name for x in scene.objects}
    originals={}
    for name in EARS:
        o=bpy.data.objects.get(name)
        if o is None:raise RuntimeError("R77 original center locking ear absent")
        originals[name]=tuple(tuple(v.co) for v in o.data.vertices)
    motion=fin_digest_all_frames(scene)
    all_other=fingerprint(scene)
    contact={str(i):joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                     bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]) for i in MAIN}
    if any(v>.003 for v in contact.values()):
        raise RuntimeError("R77 source model had detached real fin roots")
    render_old=(scene.render.resolution_x,scene.render.resolution_y,
                scene.render.resolution_percentage,scene.render.filepath,
                scene.render.image_settings.file_format,
                scene.render.image_settings.color_mode,scene.cycles.samples,
                scene.cycles.seed,scene.cycles.use_animated_seed)
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,
       "verified_original_sprite_SHA256_for_private_comparison":ORIGINAL_SPRITE_SHA,
       "original_artwork_embedded_or_uploaded":False,
       "source_visual_fidelity_approved":False,
       "unchanged_original_scene_sha256":SOURCE_SCENE_SHA,
       "baseline_real_mesh_fin_root_contacts":contact,
       "candidates":[]}
    for f in STRENGTH:
        shape={}
        for name in EARS:
            shape[name]=shorten_real_lug(bpy.data.objects[name],originals[name],f)
        bpy.context.view_layer.update()
        if (fingerprint(scene)!=all_other or
            {o.name for o in scene.objects}!=objects or
            tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera or
            scene.camera.data.ortho_scale!=ortho or
            {x.name:tuple(x.diffuse_color) for x in bpy.data.materials}!=mats or
            fin_digest_all_frames(scene)!=motion):
            raise RuntimeError("R77 altered non-hinge geometry/camera/material/fin motion")
        post={str(i):joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                         bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]) for i in MAIN}
        if any(abs(post[k]-contact[k])>1e-6 for k in contact):
            raise RuntimeError("R77 detached source fin from its distinct physical casting")
        bboxes={name:list(projected_bounds(scene,name)) for name in EARS}
        label="hinge_ear_%03d"%round(f*100)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(label+"_01.png"))
        scene.frame_set(33)
        render(scene,out/(label+"_33.png"))
        saved=None
        if f<1.:
            scene["fsc_r77_revision"]=REVISION
            scene["fsc_r77_center_two_lug_free_end_scale"]=f
            scene["fsc_r77_original_source_visual_approved"]=False
            scene.frame_set(1)
            saved=out/(label+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:raise RuntimeError("R77 true Blender .blend not saved")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            if (fingerprint(scene)!=all_other or
                fin_digest_all_frames(scene)!=motion):
                raise RuntimeError("R77 saved/reopened model lost original geometry or 64-frame motion")
            for name in EARS:
                o=bpy.data.objects[name]
                for i in range(8):
                    target=(Vector(originals[name][i]) if i<4 else
                            Vector(originals[name][i-4])+
                            (Vector(originals[name][i])-Vector(originals[name][i-4]))*f)
                    if (o.data.vertices[i].co-target).length>1e-5:
                        raise RuntimeError("R77 saved/reopened physical fin hinge differs")
        report["candidates"].append({
            "existing_ear_free_length_scale":f,
            "existing_meshes_modified":list(EARS) if f<1 else [],
            "real_lug_protection":shape,
            "original_camera_projected_lug_bounding_boxes":bboxes,
            "native_blender_frame_1":label+"_01.png",
            "native_blender_frame_33":label+"_33.png",
            "editable_reopened_blend":saved.name if saved else None,
            "saved_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "three_individual_original_cast_fin_contacts_preserved":post,
            "unchanged_64_frame_original_fin_motion":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source))
            scene=bpy.context.scene
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SCENE_SHA:
        raise RuntimeError("R77 changed original R71 saved Blender on disk")
    (out/"r77_original_ear_candidate_analysis.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R77_REAL_CENTER_FIN_HINGE_ROOT_CANDIDATES_SAVED_REOPENED_PASS")
    print("R77_WAIT_FOR_PRIVATE_ACTUAL_64_FRAME_SOURCE_PIXEL_ACCEPTANCE")
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source-blend",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    inspect(args.source_blend,args.out)
