"""R90: combined real source-contour R89 hinges with scaled-down old R08 knees.

R88 private original-sprite audit proves the original R08 knee guards are
mistaken for part of the bespoke hinge network. Hiding their real geometry
improved two-frame original ROI error, whereas hiding the aft shroud wings
worsened it. R89 genuine 3D traced cast sideforms independently improved
the source match. Test whether those improvements COMBINE and whether a
smaller finite-volume old guard still reads closer to the original.

This workflow uses the R89 source_trace.blend SAVED by the previous failed
R89 iteration; that failure was only stale Blender RNA in the next loop.
It has already been saved as real .blend and rendered in frames 1/33. Test
its exact SHA. No speculative extra pivots, no image-plane sprite cards,
no new parts, no private Wube pixels in the public runner.
"""
import argparse,hashlib,json,math,sys,struct
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render,NATIVE
from fin_mount_geometry_sweep_r50 import MOUNT_PREFIX,FIN_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world

REVISION="R90_3d_original_side_mounts_without_imagined_knee_guard_bulk"
R89_SOURCE_SHA="cd21a733321eaf8db876eb84645c1182904178944c4dcc68f709ab8ccd66f6b5"
USER_SPRITE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
KNEES=("R08_knee_guard","R08_knee_guard.001")
# Preserve separate left and right original R08 identities, no forced symmetry.
PROFILES=(
 ("baseline",1.,1.),
 ("port_070",.70,1.),
 ("right_070",1.,.70),
 ("both_070",.70,.70),
 ("port_040",.40,1.),
 ("right_040",1.,.40),
 ("both_040",.40,.40),
 ("both_hidden",0.,0.),
)
def mesh_fingerprint(scene):
    h=hashlib.sha256()
    for obj in sorted(scene.objects,key=lambda x:x.name):
        if obj.type!="MESH" or obj.name in KNEES:continue
        h.update(obj.name.encode())
        h.update(struct.pack("<II",len(obj.data.vertices),len(obj.data.polygons)))
        for v in obj.data.vertices:h.update(struct.pack("<fff",*v.co))
    return h.hexdigest()
def change_actual_knee(obj,verts,factor):
    if obj.type!="MESH" or len(obj.data.vertices)!=len(verts):
        raise RuntimeError("R90 original R08 real knee source topology changed")
    obj.hide_render=(factor==0.)
    if factor==0.:
        # Do not delete physical mesh, original geometry is preserved
        return {"real_3d_mesh_faces":len(obj.data.polygons),
                "temporarily_hidden_for_source_diagnostic":True,
                "geometric_scale":0}
    center=sum((Vector(v) for v in verts),Vector((0,0,0)))/len(verts)
    for v,p in zip(obj.data.vertices,verts):
        v.co=center+(Vector(p)-center)*factor
    obj.data.update()
    if any(p.area<1e-10 for p in obj.data.polygons):
        raise RuntimeError("R90 compressed source knee polygon to zero 3D area")
    return {"real_3d_mesh_faces":len(obj.data.polygons),
            "temporarily_hidden_for_source_diagnostic":False,
            "geometric_scale":factor}
def capture(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R89_SOURCE_SHA:
        raise RuntimeError("R90 requires exact genuine R89 source_trace.blend, not a fictional newer source")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r89_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R90 requires real R89 source-observed solid native camera geometry")
    original_names={o.name for o in scene.objects}
    other=mesh_fingerprint(scene)
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    material={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
              for m in bpy.data.materials}
    motion=fin_digest_all_frames(scene)
    orig={}
    hidden={}
    for name in KNEES:
        obj=bpy.data.objects.get(name)
        if obj is None or obj.type!="MESH":
            raise RuntimeError("R90 original R08 knee guard object missing: "+name)
        orig[name]=tuple(tuple(v.co) for v in obj.data.vertices)
        hidden[name]=bool(obj.hide_render)
    joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                        bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    if any(g>.003 for g in joints.values()):
        raise RuntimeError("R90 upstream R89 true source fin-to-cast root disconnected")
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_user_sprite_SHA256":USER_SPRITE_SHA,
            "original_sprite_in_public_artifacts":False,
            "source_visual_fidelity_approved":False,
            "genuine_saved_R89_blend_SHA256":R89_SOURCE_SHA,
            "hypotheses":[]}
    for label,p,r in PROFILES:
        # Rebind objects after each open_mainfile; do not cache invalid RNA.
        for objname,factor in zip(KNEES,(p,r)):
            obj=bpy.data.objects[objname]
            for v,coord in zip(obj.data.vertices,orig[objname]):v.co=coord
            obj.hide_render=hidden[objname]
            obj.data.update()
        measurements={}
        for objname,factor in zip(KNEES,(p,r)):
            measurements[objname]=change_actual_knee(bpy.data.objects[objname],orig[objname],factor)
        bpy.context.view_layer.update();scene.frame_set(1)
        if mesh_fingerprint(scene)!=other or {o.name for o in scene.objects}!=original_names:
            raise RuntimeError("R90 modified actual source fins/hinges/supports/liner or added fake parts")
        if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
            raise RuntimeError("R90 changed original camera")
        if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
           for m in bpy.data.materials}!=material:
            raise RuntimeError("R90 modified source art material rather than physical knee")
        if fin_digest_all_frames(scene)!=motion:
            raise RuntimeError("R90 original 64-frame animations changed")
        for i in MAIN:
            gap=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                      bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
            if abs(gap-joints[str(i)])>1e-6:
                raise RuntimeError("R90 altered source fin root contact")
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(label+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(label+"_frame33.png"))
        saved=None
        if label!="baseline":
            scene.frame_set(1)
            scene["fsc_r90_revision"]=REVISION
            scene["fsc_r90_knee_profile"]=label
            scene["fsc_r90_original_sprite_fidelity_approved"]=False
            saved=out/(label+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R90 real editable 3D model was not saved")
            bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
            if mesh_fingerprint(scene)!=other or fin_digest_all_frames(scene)!=motion:
                raise RuntimeError("R90 reopened candidate altered protected original 3D models")
            for objname,factor in zip(KNEES,(p,r)):
                obj=bpy.data.objects[objname]
                if bool(obj.hide_render)!=(factor==0):
                    raise RuntimeError("R90 reloaded 3D knee isolation did not persist")
                if factor:
                    c=sum((Vector(v) for v in orig[objname]),Vector((0,0,0)))/len(orig[objname])
                    for v,initial in zip(obj.data.vertices,orig[objname]):
                        target=c+(Vector(initial)-c)*factor
                        if (v.co-target).length>1e-5:
                            raise RuntimeError("R90 actual physical size correction did not persist")
        report["hypotheses"].append({
            "name":label,"actual_original_knee_geometry":measurements,
            "native_frame1":label+"_frame01.png",
            "native_frame33":label+"_frame33.png",
            "saved_reopened_editable_blend":saved.name if saved else None,
            "saved_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "all_original_3d_fins_mounted_liner_shrouds_camera_materials_motion_unchanged":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R89_SOURCE_SHA:
        raise RuntimeError("R90 changed original R89 saved candidate file")
    (out/"r90_true_source_3d_knee_guard_size_sweep.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R90_REAL_3D_SOURCE_TRACED_CAST_AND_KNEE_SIZE_SWEEP_SAVED_REOPENED_PASS",flush=True)
    print("R90_SOURCE_ORIGINAL_PRIVATE_IMAGE_SCORE_REQUIRED",flush=True)
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source-blend",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    capture(args.source_blend,args.out)
