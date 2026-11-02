"""R84: empirical source-aligned mounting CASTING geometry sensitivity sweep.

Test source-driven speculative edits in 3D, not image planes:
  - independently per SOURCE-OBSERVED port/center/starboard casting
  - signed translation, scaling and tilt in the unchanged native camera
  - anchor endpoints on original FIN and upper HULL are EXACTLY locked
  - all other real 3D mesh, fin/taper, shade, 64-frame motion untouched
Save 2 genuinely rendered native Blender RGBA images per hypothesis, not a
collection of fabricated pixels. The original proprietary 64-frame image is
compared PRIVATELY after download; DO NOT commit it to GitHub Actions.
Visual score = objective for ranking, not automatic acceptance or release gate.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,projected_bounds,NATIVE
from real_source_correct_fin_taper_r80 import rest_geometry_digest
from upper_hull_loadpath_candidate_r64 import COLLECTION as WEB_COLLECTION
from source_fin_mount_ears_r77 import ORIGINAL_SPRITE_SHA

REVISION="R84_true_mount_3d_alignment_scale_shear_experimental"
SOURCE_SHA="0a8de6ccfe693726f71af8b5cfa4bfb44d5c7044d83607c20ba9019af58a803d"
# width/height scaling around each existing nonidentical 3D casting's
# original projected center; all vertex screen displacements are converted
# back into world coordinates at the SAME 3D camera depth.
PROBES={
  3:(("left_xminus",(-7,0,1,1,0)),("left_xplus",(7,0,1,1,0)),
     ("left_lean_minus",(0,0,1,1,-.16)),
     ("left_lean_plus",(0,0,1,1,.16)),
     ("left_narrow",(0,0,.87,1,0)),
     ("left_wide",(0,0,1.13,1,0))),
  2:(("center_xminus",(-6,0,1,1,0)),("center_xplus",(6,0,1,1,0)),
     ("center_up",(0,-6,1,1,0)),("center_down",(0,6,1,1,0)),
     ("center_short",(0,0,1,.82,0)),("center_tall",(0,0,1,1.18,0))),
  1:(("right_xminus",(-7,0,1,1,0)),("right_xplus",(7,0,1,1,0)),
     ("right_lean_minus",(0,0,1,1,-.16)),
     ("right_lean_plus",(0,0,1,1,.16)),
     ("right_narrow",(0,0,.87,1,0)),
     ("right_wide",(0,0,1.13,1,0))),
}
def cast_lock_indices(mount,fin,stay):
    root_vertices=list(fin.data.vertices[:11])+list(fin.data.vertices[110:121])
    locked=set()
    for v in mount.data.vertices:
        dist=min(((mount.matrix_world@v.co)-(fin.matrix_world@f.co)).length for f in root_vertices)
        if dist<=.00301:locked.add(v.index)
    # exact original R64 web-to-cast mechanical support
    locked.add(int(stay["R64_real_cast_vertex_index"]))
    if not locked or not any(idx!=int(stay["R64_real_cast_vertex_index"]) for idx in locked):
        raise RuntimeError("R84 original fin-and-hull cast anchor identification failed")
    return locked

def verify_mechanical(mount,fin,stay,locked,orig,joint):
    if len(mount.data.vertices)!=len(orig):raise RuntimeError("R84 mesh topology altered")
    for idx in locked:
        if (mount.data.vertices[idx].co-Vector(orig[idx])).length>1e-6:
            raise RuntimeError("R84 moved original hinge or hull load path contact vertex")
    current=joint_gap_world(mount,fin)
    if abs(current-joint)>1e-6 or current>.003:
        raise RuntimeError("R84 detached one of three genuine fin roots")
    # original R64 web cap touches this original CAST vertex, so preservation
    # of that vertex preserves its finite-volume hull contact independently.
    if any(p.area<1e-9 for p in mount.data.polygons):
        raise RuntimeError("R84 collapsed physical casting surface")
    return {"source_root_contact_tiles":round(current,8),
            "original_locked_fin_and_hull_vertex_indices":sorted(locked),
            "real_3d_mesh_faces_preserved":len(mount.data.polygons)}

def transform_original_3d_cast(scene,mount,orig,locked,probe):
    dx,dy,sx,sy,shear=probe
    camera=scene.camera
    frame=camera.data.view_frame(scene=scene)
    unit_x=(max(v.x for v in frame)-min(v.x for v in frame))/NATIVE[0]
    unit_y=(max(v.y for v in frame)-min(v.y for v in frame))/NATIVE[1]
    bounds=projected_bounds(scene,mount.name)
    cx=(bounds[0]+bounds[2])*.5
    cy=(bounds[1]+bounds[3])*.5
    inv=mount.matrix_world.inverted_safe()
    for idx,vertex in enumerate(mount.data.vertices):
        if idx in locked:continue
        world=mount.matrix_world@Vector(orig[idx])
        camera_pt=world_to_camera_view(scene,camera,world)
        x=camera_pt.x*NATIVE[0]
        y=(1.-camera_pt.y)*NATIVE[1]
        # The correction modifies the existing 3D CAST mesh only.
        desired_x=cx+(x-cx)*sx+dx+(y-cy)*shear
        desired_y=cy+(y-cy)*sy+dy
        delta=Vector(((desired_x-x)*unit_x,-(desired_y-y)*unit_y,0))
        changed=world+camera.matrix_world.to_quaternion()@delta
        vertex.co=inv@changed
    mount.data.update()
    return {"old_source_camera_bbox_xyxy":list(bounds),
            "new_source_camera_bbox_xyxy":list(projected_bounds(scene,mount.name)),
            "actual_changed_vertex_count":len(orig)-len(locked)}

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R84 must use exact saved R81 model, never invented current scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.camera.data.type!="ORTHO" or scene.get("fsc_r81_revision") is None:
        raise RuntimeError("R84 requires native source-calibrated fin-mounted R81 rig")
    original_cam=tuple(float(x) for row in scene.camera.matrix_world for x in row)
    original_mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
                   for m in bpy.data.materials}
    names={x.name for x in scene.objects}
    original_motion=None
    from save_connected_cast_candidate_r66 import fin_digest_all_frames
    original_motion=fin_digest_all_frames(scene)
    webs=bpy.data.collections.get(WEB_COLLECTION)
    if webs is None:raise RuntimeError("R84 lacks original actual hull load-path geometry")
    protected={}
    for obj in sorted(scene.objects,key=lambda ob:ob.name):
        if obj.type!="MESH" or obj.name.startswith(MOUNT_PREFIX):continue
        # Fin and shell geometry is never touched.
        protected[obj.name]=tuple(tuple(v.co) for v in obj.data.vertices)
    orig={};locks={};stays={};roots={}
    for i in MAIN:
        mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        stay=next(s for s in webs.objects if s.get("anchored_to_exact_existing_cast")==mount.name)
        orig[i]=tuple(tuple(v.co) for v in mount.data.vertices)
        locks[i]=cast_lock_indices(mount,fin,stay)
        stays[i]=stay
        roots[i]=joint_gap_world(mount,fin)
        if roots[i]>.003:raise RuntimeError("R84 original joint disconnected")
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_sprite_zip_SHA256":ORIGINAL_SPRITE_SHA,
        "original_sprite_images_uploaded":False,"source_visual_approved":False,
        "baseline_sha256":SOURCE_SHA,
        "real_original_3d_hinge_joint_before":{str(k):v for k,v in roots.items()},
        "experiments":[]}
    runs=[(None,"baseline",(0,0,1,1,0))]
    for i in MAIN:
        runs.extend((i,name,params) for name,params in PROBES[i])
    for mount_id,name,params in runs:
        for i in MAIN:
            ob=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            for v,point in zip(ob.data.vertices,orig[i]):v.co=point
            ob.data.update()
        scene.frame_set(1)
        correction=None
        if mount_id is not None:
            cast=bpy.data.objects[MOUNT_PREFIX+f"{mount_id:02d}"]
            correction=transform_original_3d_cast(scene,cast,orig[mount_id],locks[mount_id],params)
        bpy.context.view_layer.update()
        mechanical={}
        for i in MAIN:
            ob=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            mechanical[str(i)]=verify_mechanical(ob,fin,stays[i],locks[i],orig[i],roots[i])
        if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=original_cam:
            raise RuntimeError("R84 camera moved")
        if {x.name for x in scene.objects}!=names:
            raise RuntimeError("R84 created new speculative non-original hardware")
        if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
            for m in bpy.data.materials}!=original_mats:
            raise RuntimeError("R84 material changed rather than geometric alignment")
        if fin_digest_all_frames(scene)!=original_motion:
            raise RuntimeError("R84 changed source original 64-frame fin rig")
        # 3D mesh state for every original fin, liner, support web, cup, etc.
        if any(tuple(tuple(v.co) for v in bpy.data.objects[obname].data.vertices)!=pts
               for obname,pts in protected.items()):
            raise RuntimeError("R84 changed unrelated source geometry")
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(name+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(name+"_frame33.png"))
        report["experiments"].append({
            "name":name,"single_original_mount_index":mount_id,
            "native_screen_space_proposal":list(params),
            "true_source_camera_projected_3d_cast_transformation":correction,
            "both_frames_rendered":[name+"_frame01.png",name+"_frame33.png"],
            "original_3d_mount_and_hull_contacts_after":mechanical,
            "individual_original_fin_meshes_stay_put":True})
        print("R84_CAST_PROBE_REAL_BLENDER",name,flush=True)
    for i in MAIN:
        ob=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        for v,p in zip(ob.data.vertices,orig[i]):v.co=p
        ob.data.update()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R84 original R81 persisted baseline modified")
    (out/"r84_real_cast_parameter_sweep.json").write_text(json.dumps(report,indent=2)+"\n")
    print("R84_SOURCE_CAMERA_REAL_3D_CAST_ALIGNMENT_SWEEP_19x2_DONE")
    print("R84_PRIVATE_ORIGINAL_PNG_SCORE_REQUIRED_FOR_SELECTION")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
