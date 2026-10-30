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


def camera_data(obj):
    rotation = obj.matrix_world.to_quaternion()
    direction = rotation @ Vector((0, 0, -1))
    elev = math.degrees(math.asin(max(-1, min(1, float(direction.z)))))
    azimuth = math.degrees(math.atan2(float(direction.y), float(direction.x)))
    return {
        "name": obj.name,
        "type": obj.data.type,
        "location": triplet(obj.matrix_world.translation),
        "view_vector": triplet(direction),
        "azimuth_degrees": round(azimuth, 4),
        "elevation_degrees": round(elev, 4),
        "ortho_scale": (float(obj.data.ortho_scale)
                        if obj.data.type == "ORTHO" else None),
        "lens_mm": float(obj.data.lens),
    }


def lamp_data(obj):
    return {
        "name": obj.name,
        "type": obj.data.type,
        "location": triplet(obj.matrix_world.translation),
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
    orig_c = camera_data(original.camera)
    copy_c = camera_data(reference.camera)
    # Names change when Blender duplicates objects, but intrinsic projection
    # and world-space transforms must be strictly identical.
    for key in ("type", "location", "view_vector", "ortho_scale", "lens_mm"):
        if orig_c[key] != copy_c[key]:
            raise RuntimeError("Reconstruction camera drifted during STL import: " + key)
    src_lamps = sorted([lamp_data(o) for o in original.objects if o.type == "LIGHT"],
                       key=lambda x: (x["type"], x["location"], x["energy"]))
    ref_lamps = sorted([lamp_data(o) for o in reference.objects if o.type == "LIGHT"],
                       key=lambda x: (x["type"], x["location"], x["energy"]))
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
        cameras = [camera_data(o) for o in scene.objects if o.type == "CAMERA"]
        lamps = [lamp_data(o) for o in scene.objects if o.type == "LIGHT"]
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
