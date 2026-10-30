"""R64: actual upper-HULL load-path candidate for R58 three bespoke cast mounts.

R63 measured genuine ~0.56-0.70 tile gaps from the three attached R55
castings to HYDROGEN_curved_pressure_hull. Do NOT lengthen the fins or attach
castings to a nozzle ring to hide that structural gap. This *separate* saved
editable candidate adds only three DIFFERENT upstream cast stay meshes, using
BVH-derived points on the REAL upper pressure hull as end anchors and actual
existing R49 cast vertices as root anchors. End caps have physical 3D contact
vertices and finite-volume cross sections. Candidate art is NOT approved
without original proprietary 64-frame sprite review; leave R58 untouched.
"""
import argparse
from array import array
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from mount_radial_visibility_r53 import per_mount_visibility
from mount_occlusion_diagnostic_r51 import render,NATIVE
from hanging_fin_candidate_r58 import REVISION as R58_REV,verify
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION,source_integrity

REVISION="R64_unique_three_upper_pressure_hull_cast_stays"
HULL="HYDROGEN_curved_pressure_hull"
COLLECTION="R64_UPPER_PRESSURE_HULL_CAST_LOAD_PATHS"
SOURCE_FILE="source_connected_hanging_fins_r58.blend"
PROFILES={
    1:{"name":"offset_starboard_cast_stay","half_width":.072,
       "half_depth":.050,"side_bend":.038,"stations":5,"selection_col":3},
    2:{"name":"central_bridge_web","half_width":.120,
       "half_depth":.047,"side_bend":-.011,"stations":6,"selection_col":2},
    3:{"name":"swept_port_cover_web","half_width":.089,
       "half_depth":.042,"side_bend":-.049,"stations":5,"selection_col":1},
}
# The base mount and hull are deliberately not Boolean-unioned. The new
# finite-volume stay has exact cap *contact points* and extends 0.045 units
# into both surfaces. Only a visual source check can approve the joint form.
EMBED=.045

def untouched_digest(scene):
    """Compare old editable topology, shaders and keyed lower motion."""
    objs=sorted((o for o in scene.objects if not o.name.startswith("R64_")),
                key=lambda o:o.name)
    h=sha256()
    for ob in objs:
        h.update(repr((ob.name,ob.type,ob.hide_render,
                        tuple(ob.location),tuple(ob.rotation_euler),tuple(ob.scale),
                        tuple(m.name if m else None for m in
                              ob.data.materials) if ob.type=="MESH" else None)).encode())
        if ob.type=="MESH":
            a=array("f",[0])*(3*len(ob.data.vertices))
            ob.data.vertices.foreach_get("co",a)
            h.update(a.tobytes())
            h.update(repr((len(ob.data.polygons),len(ob.data.loops))).encode())
            if ob.data.shape_keys:
                for k in ob.data.shape_keys.key_blocks:
                    h.update(repr((ob.name,k.name,len(k.data))).encode())
                    a=array("f",[0])*(3*len(k.data))
                    k.data.foreach_get("co",a)
                    h.update(a.tobytes())
        if ob.type in {"CAMERA","LIGHT"}:
            h.update(repr(tuple(ob.matrix_basis[row][col]
                                for row in range(4) for col in range(4))).encode())
    original_frame=scene.frame_current
    try:
        for frame in range(1,65):
            scene.frame_set(frame)
            for ob in objs:
                h.update(repr((frame,ob.name,tuple(ob.location),
                               tuple(ob.rotation_euler),
                               tuple((key.name,float(key.value)) for key in
                                     ob.data.shape_keys.key_blocks)
                                 if ob.type=="MESH" and ob.data.shape_keys
                                 else None)).encode())
    finally:
        scene.frame_set(original_frame)
    return h.hexdigest()

def hull_point(hull,bvh,source_world):
    """Get nearest point ON evaluated physical hull, not bounding box."""
    local=hull.matrix_world.inverted_safe()@source_world
    hit=bvh.find_nearest(local)
    if not hit or hit[0] is None:
        raise RuntimeError("R64 cannot locate real pressure hull face")
    world=hull.matrix_world@hit[0]
    gap=(world-source_world).length
    if not (.15<gap<2.0):
        raise RuntimeError("R64 casting-to-hull bridge suspicious gap "+str(gap))
    return world,gap,int(hit[2])

def mount_end_anchor(mount,hull,bvh,profile):
    """Prefer SOURCE mounting's upstream face, never nozzle-facing aft edge."""
    rows=len(mount.data.vertices)//10
    outer=rows*5
    # Our casting's first 2 rows are the original upstream load end. Do not
    # pick nearest point on its aft lip or the attached lower fin root.
    choices=[]
    for row in (0,1):
        for col in (1,2,3):
            index=outer+row*5+col
            world=mount.matrix_world@mount.data.vertices[index].co
            end,gap,face=hull_point(hull,bvh,world)
            choices.append((gap,abs(col-profile["selection_col"]),row,index,world,end,face))
    choices.sort(key=lambda x:(x[0],x[1],x[2]))
    best=choices[0]
    return {"mount_vertex_index":best[3],
            "mount_point":best[4],"hull_point":best[5],
            "hull_face":best[6],"gap":best[0]}

def make_cast_stay(root,coll,mount,hull,bvh,index,material):
    profile=PROFILES[index]
    point=mount_end_anchor(mount,hull,bvh,profile)
    start=point["mount_point"]
    stop=point["hull_point"]
    delta=stop-start
    if delta.length<.15:raise RuntimeError("Unneeded R64 structural web")
    direction=delta.normalized()
    # Local orthogonal construction; support has real cross-section and no
    # hidden camera-facing plane. Lateral bend differs by individual cast.
    tangent=direction.cross(Vector((0,1,0)))
    if tangent.length<.03:
        tangent=direction.cross(Vector((0,0,1)))
    tangent.normalize()
    normal=direction.cross(tangent).normalized()
    t_values=(0.,.16,.39,.72,1.)
    widths=(.92,1.0,1.2,1.0,.85)
    verts=[]
    # Cap contact vertices at exact authentic mesh surface positions.
    # Geometry also extends into the volume at both ends.
    centers=[]
    for k,t in enumerate(t_values):
        bend=profile["side_bend"]*math.sin(math.pi*t)
        center=start+delta*t+tangent*bend
        if k==0:center-=direction*EMBED
        if k==len(t_values)-1:center+=direction*EMBED
        centers.append(center)
        for col in range(8):
            a=math.tau*col/8
            vertex=center+(
                tangent*math.cos(a)*profile["half_width"]+
                normal*math.sin(a)*profile["half_depth"])*widths[k]
            verts.append(tuple(root.matrix_world.inverted_safe()@vertex))
    faces=[]
    for ring in range(len(t_values)-1):
        for side in range(8):
            j=ring*8+side
            next_side=ring*8+(side+1)%8
            faces.append((j,next_side,next_side+8,j+8))
    # Two true cap centers from real source mesh points, not invisible
    # projected outline or arbitrary disconnected crown.
    verts.extend((tuple(root.matrix_world.inverted_safe()@start),
                  tuple(root.matrix_world.inverted_safe()@stop)))
    left=len(verts)-2;right=left+1
    for side in range(8):
        faces.append((left,(side+1)%8,side))
        last=(len(t_values)-1)*8
        faces.append((right,last+side,last+(side+1)%8))
    mesh=bpy.data.meshes.new("R64_"+profile["name"]+"_mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.materials.append(material)
    mesh.update()
    if len(mesh.polygons)!=8*(len(t_values)-1)+16:
        raise RuntimeError("R64 cast web topology incomplete")
    ob=bpy.data.objects.new("R64_"+profile["name"],mesh)
    coll.objects.link(ob)
    ob.parent=root
    ob["anchored_to_exact_existing_cast"]=mount.name
    ob["anchored_to_exact_upper_chassis"]=hull.name
    ob["source_fidelity_approved"]=False
    ob["nozzle_ring_is_NOT_anchor"]=True
    ob["R64_real_cast_vertex_index"]=point["mount_vertex_index"]
    ob["R64_real_hull_face_index"]=point["hull_face"]
    ob["R64_observed_upper_hull_gap_original"]=point["gap"]
    ob["R64_separate_finite_3D_printable_web"]=True
    bevel=ob.modifiers.new("Source candidate softened casting ridges","BEVEL")
    bevel.width=.012
    bevel.segments=2
    point["profile"]=profile["name"]
    point["start_world"]=[round(float(v),6) for v in start]
    point["end_world"]=[round(float(v),6) for v in stop]
    point["finite_volume_mesh_vertices"]=len(verts)
    point["source_joint_position_is_real_not_screen_proxy"]=True
    return ob,point

def verify_candidate(scene,original_digest):
    if scene.get("fsc_r64_revision")!=REVISION:
        raise RuntimeError("R64 candidate revision stamp absent")
    if untouched_digest(scene)!=original_digest:
        raise RuntimeError("Original R58 geometry, material, camera or motion changed")
    collection=bpy.data.collections.get(COLLECTION)
    if collection is None or len(collection.objects)!=3:
        raise RuntimeError("Not exactly 3 physically different new stays")
    original_fin_verts=[len(bpy.data.objects[f"{FIN_PREFIX}{i:02d}"].data.vertices)
                        for i in range(10)]
    if original_fin_verts!=[220]*10:
        raise RuntimeError("R64 altered fin mesh topology")
    source_integrity(scene,{})
    for index in MAIN:
        mount=bpy.data.objects[f"{MOUNT_PREFIX}{index:02d}"]
        fin=bpy.data.objects[f"{FIN_PREFIX}{index:02d}"]
        if joint_gap_world(mount,fin)>MAX_ROOT_CONNECTION:
            raise RuntimeError("R64 damaged actual mount-to-fin contact")
        stay=next((ob for ob in collection.objects
                   if ob.get("anchored_to_exact_existing_cast")==mount.name),None)
        if stay is None or stay.get("anchored_to_exact_upper_chassis")!=HULL:
            raise RuntimeError("R64 stay not anchored at pressure hull")
        if not stay.get("nozzle_ring_is_NOT_anchor"):
            raise RuntimeError("R64 reattached fin to ring")
        # End vertices of web are guaranteed original mount vertex and exact
        # evaluated hull polygon point; separate objects but real 3D coordinates.
        start=mount.matrix_world@mount.data.vertices[
            int(stay["R64_real_cast_vertex_index"])].co
        web_start=stay.matrix_world@stay.data.vertices[-2].co
        if (start-web_start).length>.0001:
            raise RuntimeError("R64 casting load path has no 3D end contact")
        hull=bpy.data.objects[HULL]
        dg=bpy.context.evaluated_depsgraph_get()
        bvh=BVHTree.FromObject(hull,dg,epsilon=0.0)
        web_end=stay.matrix_world@stay.data.vertices[-1].co
        projected=bvh.find_nearest(hull.matrix_world.inverted_safe()@web_end)
        if not projected or (hull.matrix_world@projected[0]-web_end).length>.0001:
            raise RuntimeError("R64 stay missed actual chassis surface in 3D")
    return True

def run(source,out):
    source=source.resolve()
    if not source.is_file():raise RuntimeError("Requires an actual persisted R58 .blend")
    original_bytes=sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if (scene.get("fsc_r58_revision")!=R58_REV or scene.camera is None or
        scene.camera.data.type!="ORTHO" or scene.get("fsc_r64_revision")):
        raise RuntimeError("Wrong saved R58 Blender source")
    original_camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    scene.frame_set(1)
    original_digest=untouched_digest(scene)
    before=per_mount_visibility(scene)
    hull=bpy.data.objects.get(HULL)
    root=bpy.data.objects.get("CAPTURE_ROOT_UNROTATED_NORTH")
    mat=bpy.data.materials.get("R15_weathered_centerline_injector_cast")
    if hull is None or hull.type!="MESH" or root is None or mat is None:
        raise RuntimeError("No authentic upper pressure hull, root or existing pale cast shader")
    dg=bpy.context.evaluated_depsgraph_get()
    bvh=BVHTree.FromObject(hull,dg,epsilon=0.)
    coll=bpy.data.collections.new(COLLECTION)
    scene.collection.children.link(coll)
    report={"revision":REVISION,"input_r58_sha256":original_bytes,
            "r58_untouched_geometry_motion_shader_digest":original_digest,
            "actual_upper_chassis_target":HULL,
            "ring_mounting_forbidden":True,
            "source_original_art_embedded":False,
            "source_visual_approved":False,
            "one_unassembled_new_bespoke_cast_web_per_observed_mount":True,
            "three_mounts":[]}
    for i in MAIN:
        ob,info=make_cast_stay(root,coll,bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                               hull,bvh,i,mat)
        report["three_mounts"].append({
            "index":i,"stay":ob.name,"profile":info["profile"],
            "old_pressure_hull_gap":round(info["gap"],7),
            "upper_hull_face_index":info["hull_face"],
            "source_cast_vertex":info["mount_vertex_index"],
            "start_world":info["start_world"],"end_world":info["end_world"],
            "3D_touch_vertices":True,
            "not_boolean_unioned_or_source_approved":True})
    scene["fsc_r64_revision"]=REVISION
    scene["fsc_r64_cast_stays_rooted_on_actual_upper_hull"]=3
    scene["fsc_r64_source_visual_approved"]=False
    scene["fsc_r64_real_source_64frame_animation_preserved"]=True
    verify_candidate(scene,original_digest)
    after=per_mount_visibility(scene)
    report["mount_visibility_before"]=before
    report["mount_visibility_after"]=after
    report["source_original_64_frame_motion_unchanged"]=True
    report["old_r58_saved_blend_untouched"]=True
    out=out.resolve()
    out.mkdir(parents=True,exist_ok=True)
    output=out/"upper_hull_loadpaths_candidate_r64.blend"
    scene.render.resolution_x,scene.render.resolution_y=NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    report["candidate_sha256"]=sha256(output.read_bytes()).hexdigest()
    report["candidate_bytes"]=output.stat().st_size
    for f in (1,17,33,49):
        scene.frame_set(f)
        render(scene,out/("R64_body_%02d.png"%f))
    bpy.ops.wm.open_mainfile(filepath=str(output))
    verify_candidate(bpy.context.scene,original_digest)
    if sha256(source.read_bytes()).hexdigest()!=original_bytes:
        raise RuntimeError("R64 modified the original saved R58 file")
    report["saved_reopened_64frame_source_and_chassis_contacts_verified"]=True
    (out/"r64-load-path-report.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R64_THREE_DISTINCT_UPPER_CHASSIS_STAYS_SAVED_REOPENED",
          [(e["index"],e["profile"],e["old_pressure_hull_gap"])
           for e in report["three_mounts"]],flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-blend",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.source_blend,args.out)
