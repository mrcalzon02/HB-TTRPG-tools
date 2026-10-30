"""R63: measure actual original upper cast -> chassis mechanical load paths.

The three distinct source-observed mounts support fins 1/2/3 ABOVE the
recessed throat ring. R55/R58 proved mount-to-fin vertex contact, but not that
the opposite end is mechanically supported by a legitimate chassis surface.

Read only the original R58 saved editable scene. Query Blender BVH of every
other real mesh within the source model (excluding the three mounts and ten
fins); report exactly which surfaces are near each mount. Label annular rings,
outer nozzle/bell, and pressure rolls as forbidden mounting anchors so a
nearby wrong ring can never silently pass as an upper-chassis connection.
No new meshes, image masks, source bitmaps or fake joints.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from fin_mount_geometry_sweep_r50 import MAIN, FIN_PREFIX, MOUNT_PREFIX, AXIS_Z
from mount_shape_fit_r52 import joint_gap_world
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION
from hanging_fin_candidate_r58 import REVISION as R58_REV
from mount_radial_visibility_r53 import per_mount_visibility

REVISION="R63_actual_finite_3D_mount_to_chassis_load_path_audit"
LIMIT=20
DISTANCE_TOLERANCE=.003

def type_of(ob):
    name=ob.name.casefold()
    if name.startswith("r49_bespoke_cast_mount") or name.startswith("r11_suspended_afterburner_vane"):
        return "excluded fin or mount"
    if any(k in name for k in ("rolled_bell","bell_","nozzle","throat",
                                 "refractory","exhaust_pressure_roll",
                                 "pressure_baffle","lip","annul","collar",
                                 "shingle","skid","turbine","vane","fin_")):
        return "forbidden nozzle/bell/fin/ring anchor"
    if any(k in name for k in ("chassis","frame","bulkhead","engine",
                                 "housing","hull","platform","body","main_case",
                                 "forward_","upper_","injector","spine")):
        return "candidate upper structural part (name only, not proof)"
    return "unclassified physical mesh; inspect"

def build_bvhs(scene):
    depsgraph=bpy.context.evaluated_depsgraph_get()
    result=[]
    for ob in scene.objects:
        if ob.type!="MESH" or ob.hide_render:
            continue
        if type_of(ob)=="excluded fin or mount":
            continue
        if len(ob.data.vertices)==0 or len(ob.data.polygons)==0:
            continue
        try:
            tree=BVHTree.FromObject(ob,depsgraph,epsilon=0.0)
        except (ValueError,RuntimeError):
            continue
        result.append((ob,tree,ob.matrix_world.inverted_safe(),
                       type_of(ob)))
    if len(result)<10:
        raise RuntimeError("R63 no real scene meshes found for 3D load-path audit")
    return result

def gap_to(mesh, target):
    """Actual 3D mount vertex to evaluated target *surface*, not bbox gap."""
    ob,bvh,inv,group=target
    nearest=None
    for vertex in mesh.data.vertices:
        point_world=mesh.matrix_world @ vertex.co
        point_local=inv @ point_world
        result=bvh.find_nearest(point_local)
        if result is None or result[0] is None:
            continue
        near_world=ob.matrix_world @ result[0]
        d=(near_world-point_world).length
        if nearest is None or d<nearest["gap_tiles"]:
            nearest={"gap_tiles":round(d,7),
                     "mount_vertex_index":vertex.index,
                     "mount_point_world":[round(float(v),6) for v in point_world],
                     "target_point_world":[round(float(v),6) for v in near_world],
                     "target_face":result[2]}
    return nearest

def inspect(scene):
    scene.frame_set(1)
    bpy.context.view_layer.update()
    targets=build_bvhs(scene)
    data={"revision":REVISION,"source_r58_revision":R58_REV,
          "source_native_cell":[264,542],"source_artwork_present":False,
          "mechanical_joint_is_vertex_proximity_not_boolean_union":True,
          "mount_indices":list(MAIN),"max_allowed_contact_gap":DISTANCE_TOLERANCE,
          "anchor_classification_is_conservative_name_heuristic":True,
          "total_mesh_candidate_surfaces":len(targets),
          "mounts":{}}
    for i in MAIN:
        mount=bpy.data.objects.get(f"{MOUNT_PREFIX}{i:02d}")
        fin=bpy.data.objects.get(f"{FIN_PREFIX}{i:02d}")
        if mount is None or fin is None:
            raise RuntimeError("Missing authentic R55/R58 specific casting or fin")
        contact=joint_gap_world(mount,fin)
        if contact>MAX_ROOT_CONNECTION:
            raise RuntimeError("Original R58 fin-to-mount contact failed")
        neighbors=[]
        for target in targets:
            result=gap_to(mount,target)
            if result is None:continue
            result.update({"object":target[0].name,"role":target[3],
                           "real_mesh_surface":True})
            neighbors.append(result)
        neighbors.sort(key=lambda e:e["gap_tiles"])
        if not neighbors:raise RuntimeError("No mesh candidates for "+mount.name)
        admissible=[e for e in neighbors if e["role"]!="forbidden nozzle/bell/fin/ring anchor"]
        struct=[e for e in admissible if e["role"].startswith("candidate upper")]
        data["mounts"][str(i)]={
            "mount":mount.name,"fin":fin.name,
            "fin_root_vertex_to_cast_gap_tiles":round(contact,7),
            "actual_closest_any_mesh":neighbors[0],
            "actual_closest_non_ring_mesh":admissible[0] if admissible else None,
            "actual_closest_named_chassis_mesh":struct[0] if struct else None,
            "existing_legitimate_chassis_contact_confirmed":bool(
                struct and struct[0]["gap_tiles"]<=DISTANCE_TOLERANCE),
            "nearest_real_meshes":neighbors[:LIMIT],
            "top_non_ring_candidates":admissible[:LIMIT],
            "no_automatic_mount_extension_authorized":True}
        print("R63_MOUNT_REAL_CHASSIS_GAP",i,
              "fin_contact",round(contact,6),
              "any",neighbors[0]["object"],neighbors[0]["gap_tiles"],
              "nonring",admissible[0]["object"] if admissible else "NONE",
              admissible[0]["gap_tiles"] if admissible else "N/A",
              "named_chassis",struct[0]["object"] if struct else "NONE",
              struct[0]["gap_tiles"] if struct else "N/A",flush=True)
    data["existing_named_chassis_contacts"]=sum(
        int(e["existing_legitimate_chassis_contact_confirmed"])
        for e in data["mounts"].values())
    print("R63_PHYSICAL_MOUNT_SUPPORT_INVENTORY",data["existing_named_chassis_contacts"],
          "of 3 named structural load paths already touching",flush=True)
    return data

def run(source,out):
    source=source.resolve()
    if not source.is_file():raise RuntimeError("R63 needs actual previously saved R58 scene")
    original_sha=hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if (scene.get("fsc_r58_revision")!=R58_REV or not scene.camera
        or scene.camera.data.type!="ORTHO"):
        raise RuntimeError("R63 can audit only the authoritative original R58 Blender candidate")
    data=inspect(scene)
    data["r58_file_sha256"]=original_sha
    if hashlib.sha256(source.read_bytes()).hexdigest()!=original_sha:
        raise RuntimeError("R63 mutated source baseline saved .blend")
    out=out.resolve()
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
    print("R63_REAL_BLENDER_MOUNT_LOAD_PATH_AUDIT_COMPLETED",len(data["mounts"]),flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path,required=True)
    p.add_argument("--report",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.source_blend,args.report)
