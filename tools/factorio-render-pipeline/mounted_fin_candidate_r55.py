"""R55 — NEW SAVED, EDITABLE source-directed mounting connection candidate.

R54 A/B found .14 tile real inward recess of two historical black pressure
rolls materially exposes three different source casting positions. R55 applies
that measured recess, R50-D existing fin shape and unique R52 source bboxes to
a SEPARATE candidate .blend; the authoritative R49 baseline .blend remains
bit-for-bit untouched. Fins 1/2/3 genuinely contact the appropriate cast
surface in 3D, not merely match the same pixels. The central bridge receives
two visible finite-thickness descending integral locking ears.

This remains a source-comparison CANDIDATE; no original proprietary texture
is bundled, no 64-frame animation is retimed, no nozzle bell is hidden,
removed or sealed, and no camera or studio light is replaced.
"""
import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

ROOT_SOURCE=str(Path(__file__).resolve().parent)
if ROOT_SOURCE not in sys.path:sys.path.insert(0,ROOT_SOURCE)
import bpy
from mathutils import Vector

from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,UPPER,MAIN,AXIS_Z
from mount_occlusion_diagnostic_r51 import NATIVE,deform_r50_d,render,projected_bounds
from mount_shape_fit_r52 import MOUNT_TARGETS,PALE_EXISTING_CAST,fit_projected_cast,joint_gap_world
from mount_radial_visibility_r53 import radial_casting,per_mount_visibility
from rim_clearance_r54 import ROLLS,move_original_ring_inward

REVISION="R55_first_physically_connected_bespoke_cast_mount_candidate"
ROOT_RADIAL_BY_MOUNT={1:.48,2:.72,3:.48}
RIM_RECESS=.14
MAX_ROOT_CONNECTION=.003
REQUIRED_LUG_COUNT=2

def attach_fin_to_cast_nearest_vertex(mount,fin):
    """Deform only first three original R21 grid rows, keep distal hot end.

    Use same parent-object mesh coordinate convention. The nearest contact
    among both two-sided shell root lips and all casting vertices becomes
    an exact spatial connection on the actual retained meshes. Moving whole
    proximal row by the same 3D delta preserves the formed width/slots.
    """
    if fin.data.shape_keys or len(fin.data.vertices)!=220:
        raise RuntimeError("R55 may not modify source-animated lower panels")
    if fin.parent!=mount.parent:
        raise RuntimeError("R55 refuses incompatible source model frames")
    indices=list(range(11))+list(range(110,121))
    closest=None
    for v_idx in indices:
        pt=fin.data.vertices[v_idx].co
        for mv in mount.data.vertices:
            delta=mv.co-pt
            d2=delta.length_squared
            if closest is None or d2<closest[0]:
                closest=(d2,v_idx,tuple(delta))
    if closest is None:raise RuntimeError("R55 found no 3D mechanical contact")
    before=math.sqrt(closest[0])
    correction=Vector(closest[2])
    if before>1.:
        raise RuntimeError("R55 cannot pretend to join >1 tile apart meshes")
    # Original mesh = 10 stations * 11 across * 2 source skins.
    for v in fin.data.vertices:
        row=(v.index%110)//11
        if row<3:
            weight=(1.,.55,.15)[row]
            v.co+=correction*weight
    fin.data.update()
    after=joint_gap_world(mount,fin)
    if after>MAX_ROOT_CONNECTION:
        raise RuntimeError("R55 root did not physically touch casting")
    return {"before_tiles":round(before,5),
            "after_tiles":round(after,7),
            "fin_contact_vertex":closest[1],
            "real_3d_vertex_contacts":True}

def add_bridge_lug(mount,root,collection,side,material):
    """Two STRONGLY DISTINCT short center-bridge locking tabs in cast metal."""
    if side not in (-1,1):
        raise RuntimeError("R55 source central bridge has only two visible ears")
    # The center casting is the only six-station R49 mesh: 6*5*2=60.
    if len(mount.data.vertices)!=60:
        raise RuntimeError("R55 expected retained original unique central casting")
    idx=55+(1 if side==-1 else 3)
    point=mount.data.vertices[idx].co.copy()
    angle=math.atan2(point.z-AXIS_Z,point.x)
    tangent=Vector((-math.sin(angle),0.,math.cos(angle)))
    radial=Vector((math.cos(angle),0.,math.sin(angle)))
    # Pair of nonidentical sheared cast lugs, not ornamental duplicated rods.
    length=.145 if side==-1 else .190
    width=.062 if side==-1 else .070
    pts=[]
    for y in (point.y+.07,point.y-length):
        for thickness in (-.045,.045):
            for tang in (-width,width):
                p=point+Vector((0.,y-point.y,0.))+radial*thickness+tangent*tang
                pts.append(tuple(p))
    faces=((0,2,3,1),(4,5,7,6),(0,1,5,4),
           (2,6,7,3),(0,4,6,2),(1,3,7,5))
    mesh=bpy.data.meshes.new(f"R55_CENTER_BRIDGE_LOCK_EAR_{side:+d}_mesh")
    mesh.from_pydata(pts,[],faces);mesh.update()
    mesh.materials.append(material)
    ob=bpy.data.objects.new(f"R55_CENTER_BRIDGE_LOCK_EAR_{'port' if side==-1 else 'starboard'}",mesh)
    collection.objects.link(ob)
    ob.parent=root
    bevel=ob.modifiers.new("cast edge wear","BEVEL")
    bevel.width=.012;bevel.segments=2
    return ob

def source_integrity(scene,objects):
    from vanilla_bespoke_fin_mounts_r49 import REVISION as R49_REV
    if scene.get("fsc_r49_revision")!=R49_REV:
        raise RuntimeError("R55 must retain source-discriminating R49 ancestry")
    for i in range(10):
        fin=bpy.data.objects.get(f"{FIN_PREFIX}{i:02d}")
        if fin is None or fin.data.color_attributes.get("R21_heat_tint") is None:
            raise RuntimeError("R55 damaged original heat-color slotted fin")
        if len(fin.data.vertices)!=220:raise RuntimeError("R55 changed original fin topology")
        if i in (6,7,8,9) and (not fin.data.shape_keys or
                               len(fin.data.shape_keys.key_blocks)<2):
            raise RuntimeError("R55 erased original lower animated fin")
    for i in MAIN:
        ob=bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"]
        if ob.data.materials[0].name!=PALE_EXISTING_CAST:
            raise RuntimeError("R55 cast has no source pale casting material")
    liner=bpy.data.objects["R11_OPEN_DEEP_REFRACTORY_THROAT"]
    if not liner.get("R11_open_no_endcaps") or len(liner.data.polygons)!=480:
        raise RuntimeError("R55 closed physical refractory")
    for name in ("vanilla_reference_bell_bronzed_rolled_bell",
                 "vanilla_reference_bell_rolled_lip")+ROLLS:
        ob=bpy.data.objects.get(name)
        if ob is None or ob.hide_render:
            raise RuntimeError("R55 is forbidden to hide/remove original bell hardware")
    if len(bpy.data.collections["R49_SOURCE_OBSERVED_THREE_UPPER_CAST_MOUNTS"].objects)!=3:
        raise RuntimeError("R55 must not replace bespoke mounts with a duplicate set")

def run(output):
    orig=output/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not orig.exists():raise RuntimeError("R55 needs verified native R49 saved scene")
    source_hash=sha256(orig.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(orig))
    scene=bpy.context.scene
    if not scene.camera or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R55 requires exactly the source camera")
    camera_before=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    orig_objects={ob.name for ob in scene.objects}
    params={};originals={};objects={}
    for i in UPPER:
        ob=bpy.data.objects.get(f"{FIN_PREFIX}{i:02d}")
        if ob is None or ob.data.shape_keys:raise RuntimeError("R55 fin stage changed")
        objects[ob.name]=ob
        originals[ob.name]=tuple(tuple(v.co) for v in ob.data.vertices)
        params[i]=(ob.data.vertices[0].co.y,ob.data.vertices[99].co.y)
    for i in MAIN:
        ob=bpy.data.objects.get(f"{MOUNT_PREFIX}{i:02d}")
        if ob is None:raise RuntimeError("R55 original cast lost")
        objects[ob.name]=ob
        originals[ob.name]=tuple(tuple(v.co) for v in ob.data.vertices)
    material=bpy.data.materials.get(PALE_EXISTING_CAST)
    if material is None:raise RuntimeError("R55 original pale cast shader absent")
    root=bpy.data.objects.get("CAPTURE_ROOT_UNROTATED_NORTH")
    if root is None:raise RuntimeError("R55 lost original model root")
    if scene.get("fsc_r49_distinct_source_mount_count")!=3:
        raise RuntimeError("R55 source R49 mount count invalid")
    output_dir=output/"test-04-vanilla-approx"/"mounted-fin-candidate-r55"
    output_dir.mkdir(parents=True,exist_ok=True)
    record={"revision":REVISION,"original_blend_sha256":source_hash,
            "original_source_pixels_embedded":False,
            "saved_candidate_separately":True,
            "source_bbox_targets_manual_approximate":True,
            "not_approved_as_pixel_perfect_vanilla":True}
    deform_r50_d(objects,originals,params)
    for name in ROLLS:
        ob=bpy.data.objects.get(name)
        if ob is None:raise RuntimeError("R55 R08 original rim object missing")
        move_original_ring_inward(ob,tuple(tuple(v.co) for v in ob.data.vertices),RIM_RECESS)
    for i in MAIN:
        name=f"{MOUNT_PREFIX}{i:02d}"
        mount=objects[name]
        for vert,(x,y,z) in zip(mount.data.vertices,originals[name]):
            r=math.hypot(x,z-AXIS_Z)-.34
            angle=math.atan2(z-AXIS_Z,x)
            vert.co=(r*math.cos(angle),y-.92,AXIS_Z+r*math.sin(angle))
        mount.data.update()
        radial_casting(mount,ROOT_RADIAL_BY_MOUNT[i])
        fit_projected_cast(scene,mount,MOUNT_TARGETS[i])
        mount.data.materials[0]=material
    bpy.context.view_layer.update()
    before={str(i):round(joint_gap_world(
        objects[f"{MOUNT_PREFIX}{i:02d}"],
        objects[f"{FIN_PREFIX}{i:02d}"]),5) for i in MAIN}
    record["contact_fit"]={}
    for i in MAIN:
        record["contact_fit"][str(i)]=attach_fin_to_cast_nearest_vertex(
            objects[f"{MOUNT_PREFIX}{i:02d}"],
            objects[f"{FIN_PREFIX}{i:02d}"])
    collection=bpy.data.collections.new("R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS")
    scene.collection.children.link(collection)
    for side in (-1,1):
        add_bridge_lug(objects[f"{MOUNT_PREFIX}02"],root,collection,side,material)
    if len(collection.objects)!=REQUIRED_LUG_COUNT:
        raise RuntimeError("R55 omitted source observed center lugs")
    record["mount_root_gap_before"]=before
    record["mount_root_gap_after"]={str(i):round(joint_gap_world(
        objects[f"{MOUNT_PREFIX}{i:02d}"],
        objects[f"{FIN_PREFIX}{i:02d}"]),6) for i in MAIN}
    record["mount_projection"]={str(i):projected_bounds(
        scene,f"{MOUNT_PREFIX}{i:02d}") for i in MAIN}
    record["cast_first_hit"]=per_mount_visibility(scene)
    source_integrity(scene,objects)
    scene["fsc_r55_revision"]=REVISION
    scene["fsc_r55_source_casting_count"]=3
    scene["fsc_r55_center_pair_lug_count"]=2
    scene["fsc_r55_fin_root_connections"]=3
    scene["fsc_r55_recess_existing_r08_rings"]=RIM_RECESS
    scene["fsc_r55_visual_fidelity_status"]="CANDIDATE_PENDING_SOURCE_PIXEL_COMPARISON"
    scene["fsc_r55_does_not_replace_original_R49_blend"]=True
    (scene.render.resolution_x,scene.render.resolution_y) = NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=12
    saved=output_dir/"three_mounts_connected_candidate.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(saved))
    if not saved.is_file() or saved.stat().st_size<100000:
        raise RuntimeError("R55 editable Blender model candidate was not saved")
    record["candidate_scene_sha256"]=sha256(saved.read_bytes()).hexdigest()
    record["candidate_scene_bytes"]=saved.stat().st_size
    for f in (1,17,33,49):
        scene.frame_set(f)
        render(scene,output_dir/f"body_{f:02d}.png")
    # Independently open real persisted candidate to verify mechanical
    # attachments, actual R08 rim positions, lower fin shape keys and lugs.
    bpy.ops.wm.open_mainfile(filepath=str(saved))
    persisted=bpy.context.scene
    source_integrity(persisted,{})
    if (persisted.get("fsc_r55_revision")!=REVISION or
        len(bpy.data.collections["R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS"].objects)!=2 or
        any(joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                           bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])>MAX_ROOT_CONNECTION
            for i in MAIN)):
        raise RuntimeError("R55 saved file lost actual fin-to-mount connection")
    if tuple(float(v) for row in persisted.camera.matrix_world for v in row)!=camera_before:
        raise RuntimeError("R55 changed source calibrated Blender camera")
    if sha256(orig.read_bytes()).hexdigest()!=source_hash:
        raise RuntimeError("R55 changed verified source baseline .blend")
    record["reopened_saved_candidate_verified"]=True
    record["baseline_saved_scene_unchanged"]=True
    (output_dir/"three-mounts-report.json").write_text(
        json.dumps(record,indent=2)+"\n",encoding="utf8")
    print("R55_FIN_TO_BESPOKE_CAST_ROOTS_JOINED",
          json.dumps(record["mount_root_gap_after"]),flush=True)
    print("R55_SAVED_REOPENED_REAL_EDITABLE_SCENE",saved.name,flush=True)
    print("R55_CALIBRATED_SOURCE_CAMERA_PRESERVED",flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
