"""R87: NONUNIFORM bespoke left/right mounting casting 3D shape sweep.

R84/R85 uniform scaling was source-measurably useful, but the original
Factorio hinge has a stepped left bracket and an offset layered right
housing, NOT two scaled copies of generic R49 curved planar strips.
Deform the EXISTING outer and inner casting mesh row-by-row/column-by-column:
  - port cast index 3: pitched upper flange vs lower locking heel
  - starboard cast index 1: stepped offset elbow and an outer-shell ridge
These are actual 3D mesh vertex edits in fixed Blender camera coordinates;
projected offsets are converted back into world 3D, then optionally a
separate finite-radial-depth step on existing front shell. Original top
pressure-hull connection and bottom fin-root locked vertex positions are
exact. No invented piston, pin, new metal panel, texture or image overlay.
Original user Wube atlas is compared privately only, not in GitHub Actions.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN,AXIS_Z
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,projected_bounds,NATIVE
from upper_hull_loadpath_candidate_r64 import COLLECTION as WEB_COLLECTION
from speculative_real_cast_alignment_r84 import cast_lock_indices,verify_mechanical
from combined_original_mount_geometry_r85 import fingerprint_other
from save_connected_cast_candidate_r66 import fin_digest_all_frames

REVISION="R87_source_bespoke_left_right_hinge_cast_contour"
R85_SHA="4343640f04b179c3b08ec2bdce1de77582e21cc45e195f173816603b709c36b7"
ORIGINAL_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Both sides actually use 5 longitudinal rows/5 lateral columns/two real
# physical skins from R49. Do not apply the same profile to both sides.
# variant, left upper flange slope, left lower heel offset,
# right elbow angular offset, right two-level physical relief
# Units: native camera pixels for first 3; tile depth for last.
PROBES=(
 ("baseline",0,0,0,0),
 ("port_flange_rise", 1,0,0,0),
 ("port_flange_fall",-1,0,0,0),
 ("port_heel_out",0,1,0,0),
 ("port_heel_in",0,-1,0,0),
 ("starboard_elbow_out",0,0,1,0),
 ("starboard_elbow_in",0,0,-1,0),
 ("starboard_ridge_high",0,0,0,1),
 ("starboard_ridge_low",0,0,0,-1),
 ("source_independent_combination",1,1,1,1),
 ("opposite_combination",-1,-1,-1,-1),
)
PORT=3
STARBOARD=1
# Fin frame R85 remains unchanged, as does center bridge/coupled lugs.
ROW=5
COL=5
HALF=25

def original_grid(pts):
    if len(pts)!=50:
        raise RuntimeError("R87 expected original R49 5x5x2 physically layered side casting")
    return True

def deform_port(mount,points,locks,slope,heel,scene):
    original_grid(points)
    cam=scene.camera
    plane=cam.data.view_frame(scene=scene)
    px_to_u=(max(v.x for v in plane)-min(v.x for v in plane))/NATIVE[0]
    px_to_v=(max(v.y for v in plane)-min(v.y for v in plane))/NATIVE[1]
    inv=mount.matrix_world.inverted_safe()
    # Upper cheek leans up/down to form actual sloped cast profile,
    # downstream lower heel is deliberately NOT a copy of the top cheek.
    upper_weight=(1.0,.83,.44,.08,0)
    heel_weight=(0,.12,.35,.85,1)
    moved=0
    for v,orig in zip(mount.data.vertices,points):
        if v.index in locks:continue
        skin=v.index//HALF
        row=(v.index%HALF)//COL
        col=v.index%COL
        lateral=(col-2)/2.
        # y: bend upper cast brim in source camera, up at one end/down
        # at the other. The opposing heel is shorter and shifts laterally.
        dy=-4.0*slope*lateral*upper_weight[row]
        dx=5.0*heel*heel_weight[row]*(0.40+0.60*abs(lateral))
        # Asymmetric forged lower bevel: step outward on FREE heel edge,
        # not at original clamp contact or hull anchor.
        dy+=2.0*heel*heel_weight[row]*(.2+.8*max(0,lateral))
        displacement=Vector((dx*px_to_u,-dy*px_to_v,0))
        world=mount.matrix_world@Vector(orig)
        newworld=world+(cam.matrix_world.to_quaternion()@displacement)
        v.co=inv@newworld
        if (Vector(orig)-v.co).length>1e-7:moved+=1
    mount.data.update()
    return moved

def deform_starboard(mount,points,locks,elbow,ridge,scene):
    original_grid(points)
    cam=scene.camera
    plane=cam.data.view_frame(scene=scene)
    px_to_u=(max(v.x for v in plane)-min(v.x for v in plane))/NATIVE[0]
    px_to_v=(max(v.y for v in plane)-min(v.y for v in plane))/NATIVE[1]
    inv=mount.matrix_world.inverted_safe()
    elbow_weight=(.12,.45,1.,.90,.22)
    front_weight=(0,.30,.96,.78,0)
    moved=0
    for v,orig in zip(mount.data.vertices,points):
        if v.index in locks:continue
        skin=v.index//HALF
        row=(v.index%HALF)//COL
        col=v.index%COL
        lateral=(col-2)/2.
        # Right source: the elbow offsets an upper folded cover relative to
        # its lower heel. Don't simply shearfold the whole strip.
        dx=6.0*elbow*elbow_weight[row]*(.55+.45*lateral)
        dy=2.4*elbow*elbow_weight[row]*(.25+.75*abs(lateral))
        world=mount.matrix_world@Vector(orig)
        newworld=world+(cam.matrix_world.to_quaternion()@Vector(
            (dx*px_to_u,-dy*px_to_v,0)))
        # Raised/recessed *physical outer front shell*, not painted seam.
        if skin==1:
            r=math.hypot(newworld.x,newworld.z-AXIS_Z)
            if r<.2:raise RuntimeError("R87 invalid original starboard radial shell")
            radial_step= .045*ridge*front_weight[row]*(1.-abs(lateral)*.60)
            newworld=Vector((newworld.x*(r+radial_step)/r,newworld.y,
                AXIS_Z+(newworld.z-AXIS_Z)*(r+radial_step)/r))
        v.co=inv@newworld
        if (Vector(orig)-v.co).length>1e-7:moved+=1
    mount.data.update()
    return moved

def original_rgb_camera_uv(scene,obj):
    return list(projected_bounds(scene,obj.name))

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R85_SHA:
        raise RuntimeError("R87 requires exact original-source-ranked R85 Blender candidate")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.camera.data.type!="ORTHO" or scene.get("fsc_r85_revision") is None:
        raise RuntimeError("R87 needs R85 physical original-camera 3D assembly")
    cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    noncast=fingerprint_other(scene)
    fin_cycle=fin_digest_all_frames(scene)
    names={ob.name for ob in scene.objects}
    webs=bpy.data.collections.get(WEB_COLLECTION)
    if webs is None:raise RuntimeError("R87 missing source-routed three hull webs")
    original={};locks={};stays={};joints={}
    for i in MAIN:
        mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        stay=next(o for o in webs.objects if o.get("anchored_to_exact_existing_cast")==mount.name)
        original[i]=[tuple(v.co) for v in mount.data.vertices]
        locks[i]=cast_lock_indices(mount,fin,stay)
        stays[i]=stay
        joints[i]=joint_gap_world(mount,fin)
        if i in (PORT,STARBOARD):original_grid(original[i])
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"original_art_sha256":ORIGINAL_SHA,
       "private_original_art_included":False,
       "source_visual_approval":False,
       "unmodified_R85_editable_SHA256":R85_SHA,
       "probes":[]}
    for tag,port_slope,port_heel,right_elbow,right_ridge in PROBES:
        for i in MAIN:
            ob=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            for v,old in zip(ob.data.vertices,original[i]):v.co=old
            ob.data.update()
        scene.frame_set(1)
        left=bpy.data.objects[MOUNT_PREFIX+f"{PORT:02d}"]
        right=bpy.data.objects[MOUNT_PREFIX+f"{STARBOARD:02d}"]
        changed={
            "port":deform_port(left,original[PORT],locks[PORT],port_slope,port_heel,scene),
            "starboard":deform_starboard(right,original[STARBOARD],locks[STARBOARD],right_elbow,right_ridge,scene)}
        bpy.context.view_layer.update()
        if fingerprint_other(scene)!=noncast:
            raise RuntimeError("R87 changed original heat fins, center cast, hull webs, cups or bell")
        if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
            raise RuntimeError("R87 moved calibrated source camera")
        if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
            for m in bpy.data.materials}!=mats:
            raise RuntimeError("R87 changed original art materials")
        if fin_digest_all_frames(scene)!=fin_cycle or {ob.name for ob in scene.objects}!=names:
            raise RuntimeError("R87 modified original animation or invented objects")
        anchors={}
        for i in MAIN:
            ob=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            f=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            anchors[str(i)]=verify_mechanical(ob,f,stays[i],locks[i],original[i],joints[i])
        bounds={"port":original_rgb_camera_uv(scene,left),
                "starboard":original_rgb_camera_uv(scene,right)}
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(tag+"_frame33.png"))
        saved=None
        if tag!="baseline":
            scene.frame_set(1)
            scene["fsc_r87_revision"]=REVISION
            scene["fsc_r87_experimental_shape_tag"]=tag
            scene["fsc_r87_original_source_approved"]=False
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R87 could not save editable true 3D shell")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            if fingerprint_other(scene)!=noncast or fin_digest_all_frames(scene)!=fin_cycle:
                raise RuntimeError("R87 save/reopen changed untouched original objects")
            for i in MAIN:
                ob=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
                fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
                verify_mechanical(ob,fin,stays[i],locks[i],original[i],joints[i])
        report["probes"].append({
          "name":tag,"port_flange_slope":port_slope,"port_lower_heel":port_heel,
          "starboard_elbow_offset":right_elbow,"starboard_outer_shell_relief":right_ridge,
          "actual_existing_3d_cast_vertices_moved":changed,
          "source_camera_cast_bounds_xyxy":bounds,
          "three_original_fin_joint_and_hull_stay_anchors":anchors,
          "native_frame01":tag+"_frame01.png","native_frame33":tag+"_frame33.png",
          "editable_saved_reopened_blend":saved.name if saved else None,
          "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R85_SHA:
        raise RuntimeError("R87 original R85 real scene modified!")
    (out/"r87_bespoke_left_right_cast_contours.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R87_REAL_DISTINCT_3D_SIDE_HINGE_SHAPES_SAVED_REOPENED")
    print("R87_PRIVATE_EXACT_ORIGINAL_SOURCE_FRAME_RANKING_REQUIRED")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
