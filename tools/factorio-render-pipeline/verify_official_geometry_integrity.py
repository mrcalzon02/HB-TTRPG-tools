"""Physical STL import, source-mesh and 64-frame integrity audit in real Blender.

Never publish Wube meshes or proprietary source atlases. Works on actual
privately imported official STL specimens and the saved R58 .blend. Measures
native mesh coordinates (not estimated Factorio tiles). Fails on geometry
damage, nonmatching imported file provenance or source animation regressions.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector


def digest_scene(scene, source_frames=64):
    """Hash ALL original scene geometry/material assignments + sampled animation.

    Use saved local channels/matrix_basis: Blender can leave matrix_world stale
    for a scene that is not active in background rendering.
    """
    objects=sorted(scene.objects,key=lambda obj:obj.name)
    h=hashlib.sha256()
    mesh_count=0
    shape_count=0
    object_count=len(objects)
    for ob in objects:
        h.update(repr((ob.name,ob.type,ob.hide_render,
                        tuple(ob.location), tuple(ob.scale),
                        ob.rotation_mode,tuple(ob.rotation_euler),
                        tuple(ob.rotation_quaternion),
                        ob.parent.name if ob.parent else None)).encode())
        if ob.type=="MESH":
            mesh_count+=1
            mesh=ob.data
            h.update(repr((len(mesh.vertices),len(mesh.polygons),
                           tuple(mat.name if mat else None
                                 for mat in mesh.materials))).encode())
            coords=array("f",[0.0])*(3*len(mesh.vertices))
            mesh.vertices.foreach_get("co",coords)
            h.update(coords.tobytes())
            indices=array("i",[0])*len(mesh.loops)
            mesh.loops.foreach_get("vertex_index",indices)
            h.update(indices.tobytes())
            if mesh.shape_keys:
                for key in mesh.shape_keys.key_blocks:
                    shape_count+=1
                    h.update(repr((ob.name,key.name,
                                   len(key.data),key.slider_min,
                                   key.slider_max)).encode())
                    coords=array("f",[0.0])*(3*len(key.data))
                    key.data.foreach_get("co",coords)
                    h.update(coords.tobytes())
        elif ob.type in {"CAMERA","LIGHT"}:
            h.update(repr(tuple(ob.matrix_basis[row][col]
                                for row in range(4) for col in range(4))).encode())
            if ob.type=="CAMERA":
                h.update(repr((ob.data.type,ob.data.ortho_scale,
                               ob.data.lens)).encode())
            else:
                h.update(repr((ob.data.type,ob.data.energy,
                               tuple(ob.data.color))).encode())
    # The original source scene uses original keyed lower clamshells/fin shape
    # families; assert time-domain data survives importing isolated STL objects.
    motion=hashlib.sha256()
    original_frame=scene.frame_current
    try:
        if bpy.context.window:
            bpy.context.window.scene=scene
        for frame in range(1,source_frames+1):
            scene.frame_set(frame)
            for ob in objects:
                motion.update(repr((frame,ob.name,tuple(ob.location),
                                    tuple(ob.scale),tuple(ob.rotation_euler),
                                    tuple(ob.rotation_quaternion),
                                    bool(ob.hide_render))).encode())
                if ob.type=="MESH" and ob.data.shape_keys:
                    motion.update(repr(tuple((key.name,float(key.value))
                                for key in ob.data.shape_keys.key_blocks)).encode())
    finally:
        scene.frame_set(original_frame)
    return {
        "object_count":object_count,
        "mesh_count":mesh_count,
        "shape_key_blocks":shape_count,
        "original_static_geometry_sha256":h.hexdigest(),
        "original_64_frame_state_sha256":motion.hexdigest(),
    }


def imported_bounds(ob):
    """World/native units with Blender's stored object basis, no extra scaling."""
    xs=[float("inf")]*3
    ys=[float("-inf")]*3
    basis=ob.matrix_basis.copy()
    for v in ob.data.vertices:
        co=basis@v.co
        for i in range(3):
            xs[i]=min(xs[i],co[i])
            ys[i]=max(ys[i],co[i])
    return xs,ys


def verify_imported(reference, inventory, acquisition, max_error=0.003):
    if reference.camera is None or reference.camera.data.type!="ORTHO":
        raise RuntimeError("Lost calibrated source orthographic reference camera")
    meshes=[o for o in reference.objects if o.type=="MESH"]
    if len(meshes)!=inventory["stl_count"]:
        raise RuntimeError("Imported mesh count differs from audited STL count")
    imported_by_path={}
    for ob in meshes:
        path=ob.get("source_relative_path")
        if not path or path in imported_by_path:
            raise RuntimeError("Missing or duplicated imported source path")
        imported_by_path[path]=ob
    source_hash_by_group={item["set"]:item["sha256"] for item in
                          acquisition.get("files",[])}
    records=[]
    for entry in inventory["entries"]:
        ob=imported_by_path.get(entry["relative_path"])
        if ob is None:
            raise RuntimeError("Saved reference missing mesh for "+entry["relative_path"])
        if (ob.get("source_sha256")!=entry["sha256"] or
            ob.get("catalogue_set_claim")!=entry["set"] or
            not ob.get("unassembled_print_part") or
            ob.get("print_unit_to_tile_scale")!="UNKNOWN"):
            raise RuntimeError("Source/units metadata altered: "+entry["set"])
        if source_hash_by_group and source_hash_by_group.get(entry["set"])!=entry["sha256"]:
            raise RuntimeError("Downloaded official STL SHA differs from Blender object: "+entry["set"])
        low,high=imported_bounds(ob)
        want=entry["bounds_native_stl_units"]
        diffs=[abs(low[i]-want["min"][i]) for i in range(3)]
        diffs += [abs(high[i]-want["max"][i]) for i in range(3)]
        abs_error=max(diffs)
        # Blender imports 32-bit native STL; allowable difference is numeric
        # roundoff, NOT arbitrary geometry scaling, rotation or clipping.
        extent=max(entry["dimensions_native_stl_units"])
        tolerance=max(max_error,extent*3.e-6)
        if not math.isfinite(abs_error) or abs_error>tolerance:
            raise RuntimeError("STL native-space coordinates not preserved in "+
                               entry["set"]+": max_error="+str(abs_error)+
                               " tolerance="+str(tolerance))
        records.append({
            "set":entry["set"],"triangles_from_stl":entry["triangle_count"],
            "imported_mesh_vertices":len(ob.data.vertices),
            "imported_mesh_triangles":sum(len(p.vertices)-2 for p in ob.data.polygons),
            "native_dimensions":entry["dimensions_native_stl_units"],
            "original_stl_bounds_match_import":True,
            "max_native_coordinate_error":round(abs_error,7),
            "source_sha256":entry["sha256"],
            "not_assembled_or_tile_scaled":True,
        })
        print("OFFICIAL_NATIVE_BOUNDS_VERIFIED",entry["set"],
              "triangles",entry["triangle_count"],
              "max_error",round(abs_error,7),flush=True)
    return records


def run(baseline, merged, inventory_path, provenance_path, report_path):
    original_bytes=hashlib.sha256(baseline.read_bytes()).hexdigest()
    imported_bytes=hashlib.sha256(merged.read_bytes()).hexdigest()
    inventory=json.loads(inventory_path.read_text())
    provenance=json.loads(provenance_path.read_text())
    bpy.ops.wm.open_mainfile(filepath=str(baseline))
    original_scene=bpy.context.scene
    if original_scene.get("fsc_status")!="CALIBRATION_ONLY_NOT_FACTORIO_APPROVED":
        raise RuntimeError("Not the original accepted R58 comparison source scene")
    before=digest_scene(original_scene)
    bpy.ops.wm.open_mainfile(filepath=str(merged))
    result_scenes=[s for s in bpy.data.scenes if
                   s.get("fsc_status")=="CALIBRATION_ONLY_NOT_FACTORIO_APPROVED"]
    if len(result_scenes)!=1:
        raise RuntimeError("Original scene lost or duplicated during reference import")
    combined=digest_scene(result_scenes[0])
    if before!=combined:
        raise RuntimeError("Original mesh, cast mounting, camera or 64-frame "+
                           "animation was modified by reference import: "+
                           repr({k:(before[k],combined[k]) for k in before
                                 if before[k]!=combined[k]}))
    ref=bpy.data.scenes.get("WUBE_OFFICIAL_UNASSEMBLED_STL")
    if ref is None:raise RuntimeError("No Wube reference scene saved")
    samples=verify_imported(ref,inventory,provenance)
    if hashlib.sha256(baseline.read_bytes()).hexdigest()!=original_bytes:
        raise RuntimeError("Original source .blend modified on disk")
    if hashlib.sha256(merged.read_bytes()).hexdigest()!=imported_bytes:
        raise RuntimeError("Combined .blend modified during read-only verification")
    report={
        "result":"PASS_NATIVE_STL_GEOMETRY_AND_64_FRAME_SOURCE_INTEGRITY",
        "source_blend_sha256":original_bytes,
        "merged_blend_sha256":imported_bytes,
        "baseline_scene":before,
        "merged_original_scene":combined,
        "original_64_frame_motion_preserved":True,
        "original_geometry_mesh_materials_preserved":True,
        "imported_set_count":len(samples),
        "all_imported_native_bounds_preserved":True,
        "units_to_game_tiles_calibrated":False,
        "does_not_prove_original_sprite_fidelity":True,
        "samples":samples,
    }
    report_path.parent.mkdir(parents=True,exist_ok=True)
    report_path.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("ALL_NATIVE_STL_AND_SOURCE_INTEGRITY_PASSED",
          len(samples),"set samples 64 original frames",flush=True)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for opt in ("baseline","merged","inventory","provenance","report"):
        p.add_argument("--"+opt,type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(*(getattr(args,opt).resolve() for opt in
          ("baseline","merged","inventory","provenance","report")))


if __name__=="__main__":main()
