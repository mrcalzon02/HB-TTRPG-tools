"""Measure native Factorio calibration rig against community example, without replacing it.

Run inside Blender on the private isolated-reference .blend:
  blender -b /private/reference-library.blend --python reference_rig_diagnostics.py \
    -- --out /private/reference-rig-comparison.json

Captures metadata ONLY, not licensed model or texture bytes.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def triplet(vec):
    return [round(float(x), 6) for x in vec]


def measured_matrix(obj):
    # R58 round-trip proved the saved reference camera had correct local
    # channels and matrix_basis, while its inactive-scene matrix_world was
    # misleadingly an identity. On a standalone unparented/unconstrained
    # rig object the stored matrix_basis IS its physical world transform.
    if obj.parent is None and len(obj.constraints) == 0:
        return obj.matrix_basis.copy()
    return obj.matrix_world.copy()


def camera_data(obj):
    matrix = measured_matrix(obj)
    rotation = matrix.to_quaternion()
    direction = rotation @ Vector((0, 0, -1))
    elev = math.degrees(math.asin(max(-1, min(1, float(direction.z)))))
    azimuth = math.degrees(math.atan2(float(direction.y), float(direction.x)))
    return {
        "name": obj.name,
        "type": obj.data.type,
        "location": triplet(matrix.translation),
        "view_vector": triplet(direction),
        "azimuth_degrees": round(azimuth, 4),
        "elevation_degrees": round(elev, 4),
        "ortho_scale": (float(obj.data.ortho_scale)
                        if obj.data.type == "ORTHO" else None),
        "lens_mm": float(obj.data.lens),
    }


def lamp_data(obj):
    matrix = measured_matrix(obj)
    return {
        "name": obj.name,
        "type": obj.data.type,
        "location": triplet(matrix.translation),
        "color": triplet(obj.data.color),
        "energy": round(float(obj.data.energy), 5),
        "size": (float(obj.data.size)
                 if obj.data.type in {"AREA", "POINT"} else None),
    }


def analyze(reconstruction, official, community):
    original = bpy.data.scenes.get(reconstruction)
    reference = bpy.data.scenes.get(official)
    if original is None or reference is None:
        raise RuntimeError("Saved original + Wube reference scenes both required")
    if original.camera is None or original.camera.data.type != "ORTHO":
        raise RuntimeError("Original calibrated Factorio camera was lost")
    if reference.camera is original.camera:
        raise RuntimeError("Reference camera must be a distinct copied object")
    # Blender returns an IDENTITY/stale matrix_world for objects in an
    # inactive scene until that scene's depsgraph has been evaluated. This
    # happened in the real CI run: reference camera read as [0,0,0] despite
    # its stored local location. Activate each scene before measuring.
    if bpy.context.window is None:
        raise RuntimeError("Cannot evaluate per-scene camera without Blender window context")
    previous_scene = bpy.context.window.scene

    def read_rig(scene):
        bpy.context.window.scene = scene
        bpy.context.view_layer.update()
        cameras = [camera_data(o) for o in scene.objects if o.type == "CAMERA"]
        lamps = sorted(
            [lamp_data(o) for o in scene.objects if o.type == "LIGHT"],
            key=lambda x: (x["type"], x["location"], x["energy"]))
        return cameras, lamps

    try:
        src_cameras, src_lamps = read_rig(original)
        ref_cameras, ref_lamps = read_rig(reference)
        if len(src_cameras) < 1 or len(ref_cameras) < 1:
            raise RuntimeError("Reference or source camera unavailable after scene evaluation")
        orig_c = next(c for c in src_cameras if c["name"] == original.camera.name)
        copy_c = next(c for c in ref_cameras if c["name"] == reference.camera.name)
        if community:
            community_scene = bpy.data.scenes.get(community)
            if community_scene is None:
                raise RuntimeError("Expected community scene missing")
            community_cameras, community_lamps = read_rig(community_scene)
        else:
            community_cameras, community_lamps = [], []
    finally:
        bpy.context.window.scene = previous_scene
        bpy.context.view_layer.update()
    # Names change when Blender duplicates objects, but intrinsic projection
    # and world-space transforms must be strictly identical.
    for key in ("type", "location", "view_vector", "ortho_scale", "lens_mm"):
        if orig_c[key] != copy_c[key]:
            raise RuntimeError("Reconstruction camera drifted during STL import: " + key
                               + " source=" + repr(orig_c[key])
                               + " reference=" + repr(copy_c[key])
                               + " source_local=" + repr(list(original.camera.location))
                               + " copy_local=" + repr(list(reference.camera.location))
                               + " source_delta=" + repr(list(original.camera.delta_location))
                               + " copy_delta=" + repr(list(reference.camera.delta_location))
                               + " source_basis=" + repr(list(original.camera.matrix_basis.translation))
                               + " copy_basis=" + repr(list(reference.camera.matrix_basis.translation))
                               + " source_constraints=" + repr(len(original.camera.constraints))
                               + " copy_constraints=" + repr(len(reference.camera.constraints))
                               + " source_parent=" + repr(original.camera.parent.name if original.camera.parent else None)
                               + " reference_parent=" + repr(reference.camera.parent.name if reference.camera.parent else None))
    if len(src_lamps) != len(ref_lamps):
        raise RuntimeError("Lighting count drifted during STL import")
    for a, b in zip(src_lamps, ref_lamps):
        for key in ("type", "location", "color", "energy", "size"):
            if a[key] != b[key]:
                raise RuntimeError("Reference lighting drift: " + key)
    report = {
        "status": "MEASURED_ONLY_SOURCE_CAMERA_UNCHANGED",
        "production_baseline": {
            "scene": original.name,
            "camera": orig_c,
            "lamps": src_lamps,
            "resolution": [original.render.resolution_x,
                           original.render.resolution_y],
            "render_engine": original.render.engine,
            "view_transform": original.view_settings.view_transform,
            "film_transparent": bool(original.render.film_transparent),
        },
        "official_reference": {
            "scene": reference.name,
            "camera": copy_c,
            "lamp_count": len(ref_lamps),
            "mesh_count": len([o for o in reference.objects if o.type == "MESH"]),
            "units_not_tiles": True,
        },
        "community_source": "https://github.com/lawlessc/factorio_base_model",
        "community_is_NOT_official": True,
        "camera_or_lighting_adjustment_applied": False,
    }
    if community:
        scene = bpy.data.scenes.get(community)
        if scene is None:
            raise RuntimeError("Expected real community base scene was not appended")
        cameras = community_cameras
        lamps = community_lamps
        report["community_base"] = {
            "scene": community,
            "cameras": cameras,
            "lights": lamps,
            "model_count": len([o for o in scene.objects if o.type == "MESH"]),
            "note": "Appended objects only; scene/world/renderer defaults are NOT authoritative",
            "license_warning": "No verified reuse grant; inspect only",
        }
        if cameras:
            cam = cameras[0]
            report["community_camera_difference"] = {
                "azimuth_delta_degrees": round(cam["azimuth_degrees"] -
                                                orig_c["azimuth_degrees"], 4),
                "elevation_delta_degrees": round(cam["elevation_degrees"] -
                                                  orig_c["elevation_degrees"], 4),
                "projection_same": orig_c["type"] == cam["type"],
                "ortho_scale_ratio": (round(cam["ortho_scale"] /
                                             orig_c["ortho_scale"], 6)
                                      if cam["ortho_scale"] is not None else None),
            }
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    original = next((s for s in bpy.data.scenes
                     if s.get("fsc_status") == "CALIBRATION_ONLY_NOT_FACTORIO_APPROVED"), None)
    if original is None:
        raise RuntimeError("No authentic saved Factorio reconstruction scene")
    report = analyze(original.name, "WUBE_OFFICIAL_UNASSEMBLED_STL",
                     "COMMUNITY_BASE_UNVERIFIED" if
                     bpy.data.scenes.get("COMMUNITY_BASE_UNVERIFIED") else None)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("MEASURED_BOTH_FACT_ORIG_AND_COMMUNITY_RIGS", len(report.get(
        "community_base", {}).get("cameras", [])), "community cameras", flush=True)


if __name__ == "__main__":
    main()
