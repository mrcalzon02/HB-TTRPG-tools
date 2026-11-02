"""R96: preserve source-traced, asymmetric R89 cast pieces; facet THEIR actual surfaces.

R95 replaced each complex three-part source casting with a smooth swept ribbon,
and every original-sprite ROI got worse. R96 instead modifies only separately
traced ORIGINAL-body/upper/heel polygons already present in the selected R94
Blender scene. Add one source-fitted inset planar ring to selected existing caps,
stitch that ring to the cap's original vertices, and recess/reshape ONLY the
selected source region. Keep R89's independent volumes and actual 3D anchors.

This is an experimental native-frame source-geometry sweep, not proof that a
given proposed facet is genuinely part of the proprietary original. Only the
user's exact PRIVATE thruster.zip may establish actual visual fidelity.
"""
import argparse
import hashlib
import json
import struct
import sys
from collections import Counter
from pathlib import Path

ROOT = str(Path(__file__).resolve().parent)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import bpy
from mathutils import Vector
from original_source_3d_hinge_remesh_r89 import PORT, STARBOARD
from fin_mount_geometry_sweep_r50 import FIN_PREFIX, MOUNT_PREFIX, MAIN
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render, NATIVE

REVISION = "R96_source_traced_discrete_3d_forging_facets"
BASE_SHA = "221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252"
ORIGINAL_SHA = "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
CASTS = {3: "R89_SOURCE_FITTED_PORT_CAST", 1: "R89_SOURCE_FITTED_STARBOARD_CAST"}
OUTLINES = {3: PORT, 1: STARBOARD}

# Every modification is an independently testable hypothesis ON the existing
# original-source-traced part, not a new symmetric or functional thruster part.
# Station offsets are ORIGINAL native-frame pixels (x right, y downward).
# The original traced outlines are the basis; the offsets and depths are NOT
# claimed to have been measured/approved from the user's private artwork.
CASES = (
    ("baseline", {}),
    ("port_upper_stepped", {3: {"upper": {
        "stations": {2: (-2, -1), 3: (-3, -1), 4: (-4, 1), 5: (-1, 2)},
        "inset": .63, "sink": .080}}}),
    ("port_heel_short_facet", {3: {"heel": {
        "stations": {0: (2, -2), 1: (1, -1), 5: (2, -1), 6: (3, -1)},
        "inset": .57, "sink": .065}}}),
    ("port_body_lower_cheek", {3: {"body": {
        "stations": {0: (2, -1), 1: (2, -2), 2: (1, -1), 9: (-1, 1), 10: (-1, 2)},
        "inset": .69, "sink": .092}}}),
    ("starboard_upper_stepped", {1: {"upper": {
        "stations": {0: (2, 0), 1: (2, -1), 2: (1, -2), 6: (-1, 1), 7: (-2, 1)},
        "inset": .61, "sink": .075}}}),
    ("starboard_body_recess", {1: {"body": {
        "stations": {4: (-2, -1), 5: (-1, -1), 6: (-1, 0), 9: (1, 0), 10: (1, 1)},
        "inset": .54, "sink": .145}}}),
    ("starboard_short_heel", {1: {"heel": {
        "stations": {0: (0, -2), 1: (-2, -2), 2: (-2, 0), 3: (-1, 0)},
        "inset": .59, "sink": .095}}}),
    ("both_distinct_upper_steps", {
        3: {"upper": {"stations": {2: (-2, -1), 3: (-3, -1), 4: (-4, 1), 5: (-1, 2)},
                      "inset": .63, "sink": .080}},
        1: {"upper": {"stations": {0: (2, 0), 1: (2, -1), 2: (1, -2), 6: (-1, 1), 7: (-2, 1)},
                      "inset": .61, "sink": .075}}}),
    ("both_lower_volume_relief", {
        3: {"heel": {"stations": {0: (2, -2), 1: (1, -1), 5: (2, -1), 6: (3, -1)},
                     "inset": .57, "sink": .065}},
        1: {"body": {"stations": {4: (-2, -1), 5: (-1, -1), 6: (-1, 0), 9: (1, 0), 10: (1, 1)},
                     "inset": .54, "sink": .145}}}),
)

def original_layout(outlines):
    """Recover R89 original vertex layout, including BOTH existing anchor webs."""
    body_n = len(outlines["body"])
    offsets = {
        "body": 0,
        "upper": 3 * body_n + 1 + 10,
        "heel": 3 * body_n + 1 + 10 + 3 * len(outlines["upper"]) + 1
    }
    expected = offsets["heel"] + 3 * len(outlines["heel"]) + 1
    return offsets, expected

def mesh_fingerprint(scene, exempt):
    h = hashlib.sha256()
    for obj in sorted(scene.objects, key=lambda o: o.name):
        if obj.type != "MESH" or obj.name in exempt:
            continue
        h.update(obj.name.encode())
        h.update(struct.pack("<II", len(obj.data.vertices), len(obj.data.polygons)))
        for v in obj.data.vertices:
            h.update(struct.pack("<fff", *v.co))
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                h.update(key.name.encode())
                for v in key.data:
                    h.update(struct.pack("<fff", *v.co))
    return h.hexdigest()

def make_cap_facet(obj, layer, outline, start, spec, scene, vertices, faces):
    """Replace just a traced polygon cap fan by welded angled planar facets.

    The untouched R89 back surface and original exact R49 hull/fin anchor pads
    remain the 3D mechanical connection; neither a planar screenshot nor a
    new surface floating over the 3D scene is created.
    """
    n = len(outline)
    inv = obj.matrix_world.inverted_safe()
    cam_inv = scene.camera.matrix_world.inverted_safe()
    view = scene.camera.data.view_frame(scene=scene)
    scale_x = (max(x.x for x in view) - min(x.x for x in view)) / NATIVE[0]
    scale_y = (max(x.y for x in view) - min(x.y for x in view)) / NATIVE[1]
    front = [start + 2*n + i for i in range(n)]
    center = start + 3*n
    old_center = cam_inv @ (obj.matrix_world @ Vector(vertices[center]))
    original_back = [tuple(vertices[start + i]) for i in range(n)]
    untouched_anchor_positions = [tuple(vertices[i]) for i in range(
        3*len(OUTLINES[3 if "PORT" in obj.name else 1]["body"])+1,
        3*len(OUTLINES[3 if "PORT" in obj.name else 1]["body"])+11)]

    # Deviations alter the actual visible 3D perimeter of one named casting,
    # not the whole side or its fin/hull contacts. Front/middle facets share
    # the original traced planar edges and keep the original fixed back ring.
    for j in range(n):
        dx, dy = spec["stations"].get(j, (0, 0))
        if abs(dx)>6 or abs(dy)>6:
            raise RuntimeError("R96 offset exceeds explicit source-local sweep")
        for ring, influence in ((1, .55), (2, 1.)):
            ix = start + ring*n + j
            cp = cam_inv @ (obj.matrix_world @ Vector(vertices[ix]))
            cp.x += dx * scale_x * influence
            cp.y -= dy * scale_y * influence
            vertices[ix] = tuple(inv @ (scene.camera.matrix_world @ cp))

    inset = spec["inset"]
    sink = spec["sink"]
    if not .35 <= inset <= .8 or not .025 <= sink <= .18:
        raise RuntimeError("R96 facet is outside physically bounded experiment")
    new_start = len(vertices)
    for j in range(n):
        cp = cam_inv @ (obj.matrix_world @ Vector(vertices[front[j]]))
        # An angular, depth-receded independent planar ring is sewn to the
        # existing formed casting contour. This physically forms a recessed
        # facet and locally shadowed crown WITHOUT painting dark image pixels.
        p = Vector((old_center.x + inset*(cp.x-old_center.x),
                    old_center.y + inset*(cp.y-old_center.y),
                    cp.z-sink))
        vertices.append(tuple(inv @ (scene.camera.matrix_world @ p)))

    # Recess the EXISTING central crown of just this casting beneath its
    # inner edge (camera positive Z is nearest). Do not puncture an invented
    # full-depth hole where the source only suggests a dark shallow recess.
    depth = min((cam_inv @ (obj.matrix_world @ Vector(vertices[front[j]]))).z - sink
                for j in range(n))
    old_center.z = min(old_center.z, depth-.026)
    vertices[center] = tuple(inv @ (scene.camera.matrix_world @ old_center))
    keys = {frozenset((front[j], front[(j+1)%n], center)):j for j in range(n)}
    count = 0
    rebuilt = []
    for f in faces:
        j = keys.get(frozenset(f)) if len(f)==3 else None
        if j is None:
            rebuilt.append(f)
            continue
        a,b = front[j],front[(j+1)%n]
        c,d = new_start+j, new_start+(j+1)%n
        rebuilt.extend(((a,b,d,c),(c,d,center)))
        count += 1
    if count != n:
        raise RuntimeError("R96 expected original per-station R89 3D cap triangle fans")
    faces[:] = rebuilt
    if [tuple(vertices[start+i]) for i in range(n)] != original_back:
        raise RuntimeError("R96 source casting rear plane unexpectedly moved")
    body_n = len(OUTLINES[3 if "PORT" in obj.name else 1]["body"])
    if [tuple(vertices[i]) for i in range(3*body_n+1,3*body_n+11)] != untouched_anchor_positions:
        raise RuntimeError("R96 modified existing real R49 hull/fin anchor points")

    # Check welded inner edges specifically (the untouched R89 anchor-web
    # topology is not silently claimed globally manifold).
    counts=Counter()
    for face in faces:
        for k,a in enumerate(face):
            b=face[(k+1)%len(face)]
            counts[tuple(sorted((a,b)))]+=1
    for j in range(n):
        edge=tuple(sorted((new_start+j,new_start+(j+1)%n)))
        if counts[edge]!=2:
            raise RuntimeError("R96 cap panels not stitched on the source inner ring")
    return {"source_part":layer, "original_trace_stations":n,
            "new_shared_planar_ring_vertices":n,
            "modified_front_facet_station_pixels":spec["stations"],
            "recess_depth_blender_units":sink,
            "source_fidelity_unapproved":True,
            "original_back_ring_and_real_anchor_unchanged":True,
            "all_new_inset_ring_edges_stitched":True}

def reprofile(scene, index, proposals):
    obj = bpy.data.objects[CASTS[index]]
    if obj.type!="MESH" or obj.hide_render or obj.data.shape_keys:
        raise RuntimeError("R96 source R89 separate real 3D cast body missing")
    outlines=OUTLINES[index]
    starts, expected=original_layout(outlines)
    if len(obj.data.vertices)!=expected or len(obj.data.materials)!=1:
        raise RuntimeError("R96 must be applied to the EXACT R89 source-fit three-part volume layout")
    old=obj.data
    verts=[tuple(v.co) for v in old.vertices]
    faces=[tuple(p.vertices) for p in old.polygons]
    geometry={}
    for layer in ("body","upper","heel"):
        if layer in proposals:
            geometry[layer]=make_cap_facet(
                obj,layer,outlines[layer],starts[layer],proposals[layer],
                scene,verts,faces)
    if len(verts)!=expected+sum(len(outlines[x]) for x in proposals):
        raise RuntimeError("R96 finite 3D facet vertex accounting mismatch")
    material=old.materials[0]
    mesh=bpy.data.meshes.new(obj.name+"_R96_individually_forged_facets")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    if len(mesh.polygons)!=len(old.polygons)+sum(len(outlines[x]) for x in proposals):
        raise RuntimeError("R96 physical facet face accounting mismatch")
    if any(f.area<1e-10 for f in mesh.polygons):
        raise RuntimeError("R96 formed casting contains collapsed 3D metal planes")
    mesh.materials.append(material)
    for p in mesh.polygons:p.use_smooth=False
    obj.data=mesh
    if old.users==0:bpy.data.meshes.remove(old)
    obj["R96_selected_source_cap_parts"]=list(proposals)
    return geometry

def validate(scene, names, other, camera, mats, motion, contacts):
    if {o.name for o in scene.objects}!=names or mesh_fingerprint(scene,set(CASTS.values()))!=other:
        raise RuntimeError("R96 altered original refractory/bell, guards, fins, chassis or R49 joints")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
        raise RuntimeError("R96 changed reference camera")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}!=mats:
        raise RuntimeError("R96 changed source material instead of geometry")
    if fin_digest_all_frames(scene)!=motion:
        raise RuntimeError("R96 changed original 64-frame fin animation")
    for index in MAIN:
        d=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{index:02d}"],
                          bpy.data.objects[FIN_PREFIX+f"{index:02d}"])
        if d>.003 or abs(d-contacts[str(index)])>1e-6:
            raise RuntimeError("R96 changed physical fin-to-cast contact")

def run(source, out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R96 must start from exact source-selected R94 untouched saved .blend")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R96 original R94 calibrated 3D scene missing")
    scene.frame_set(1)
    names={o.name for o in scene.objects}
    other=mesh_fingerprint(scene,set(CASTS.values()))
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    motion=fin_digest_all_frames(scene)
    contacts={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
               bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    for index,name in CASTS.items():
        if bpy.data.objects.get(name) is None:
            raise RuntimeError("R96 earlier asymmetric source-traced cast missing")
        _,expected=original_layout(OUTLINES[index])
        if len(bpy.data.objects[name].data.vertices)!=expected:
            raise RuntimeError("R96 expects unmodified original source-traced 3-piece casts")
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"baseline_blend_sha256":BASE_SHA,
            "original_private_factorio_archive_sha256":ORIGINAL_SHA,
            "original_wube_sprite_art_exported":False,
            "actual_original_sprite_comparison_done_in_ci":False,
            "source_fidelity_approved":False,"candidates":[]}
    for tag,proposals in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene;scene.frame_set(1)
        geom={}
        for index,parts in proposals.items():
            geom[str(index)]=reprofile(scene,index,parts)
        bpy.context.view_layer.update()
        validate(scene,names,other,camera,mats,motion,contacts)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        scene.frame_set(1);render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33);render(scene,out/(tag+"_frame33.png"))
        saved=None
        if proposals:
            scene.frame_set(1)
            scene["fsc_r96_revision"]=REVISION
            scene["fsc_r96_actual_source_fidelity_approved"]=False
            scene["fsc_r96_facet_variant"]=tag
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R96 actual editable 3D scene not saved")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            validate(scene,names,other,camera,mats,motion,contacts)
            for index,parts in proposals.items():
                obj=bpy.data.objects[CASTS[index]]
                _,expected=original_layout(OUTLINES[index])
                extra=sum(len(OUTLINES[index][layer]) for layer in parts)
                if len(obj.data.vertices)!=expected+extra or not obj.get("R96_selected_source_cap_parts"):
                    raise RuntimeError("R96 source-extracted discrete physical facets failed Blender reopen")
        report["candidates"].append({
            "tag":tag,"altered_original_source_parts":geom,
            "frame1":tag+"_frame01.png","frame33":tag+"_frame33.png",
            "editable_blend":saved.name if saved else None,
            "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "original_camera_materials_64_motion_and_anchors_unchanged":True})
        print("R96_SOURCE_TRACED_ACTUAL_FACET_CANDIDATE",tag,flush=True)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R96 modified original R94 working .blend")
    (out/"r96_source_discrete_3d_forging_facets.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R96_DISCRETE_ORIGINAL_SOURCE_CAST_GEOMETRY_SAVED_REOPENED_PASS",flush=True)
    print("R96_NO_SOURCE_ART_PRESENT_SPRITE_FIDELITY_REQUIRES_PRIVATE_COMPARISON",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
