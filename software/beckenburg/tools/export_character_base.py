#!/usr/bin/env python3
"""Blender batch conversion of CC0 Beckenburg rigged sources to GLB.

Run *inside Blender*, never ordinary Python:
  blender -b --python software/beckenburg/tools/export_character_base.py -- --blend input.blend --out output.glb

Checks that the native Blender scene really contains a rigged mesh and records
its actual data. This is an authoring export, not a runtime Java model loader.
"""
import argparse
import hashlib
import json
import pathlib
import sys

def main():
    import bpy
    split = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
    args = argparse.ArgumentParser()
    args.add_argument("--blend", required=True)
    args.add_argument("--out", required=True)
    opts = args.parse_args(sys.argv[split:])
    source = pathlib.Path(opts.blend).expanduser().resolve()
    target = pathlib.Path(opts.out).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != ".blend":
        raise RuntimeError("A real extracted .blend source file is required: " + str(source))
    if target.suffix.lower() != ".glb":
        raise RuntimeError("Output must have the .glb extension")
    if source == target:
        raise RuntimeError("Never overwrite the original source asset")

    bpy.ops.wm.open_mainfile(filepath=str(source))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if not meshes:
        raise RuntimeError("No mesh data in the original Blender project")
    if not armatures:
        raise RuntimeError("No armature found: cannot silently claim this base is rigged")
    mesh_details = []
    total_triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles = len(obj.data.loop_triangles)
        total_triangles += triangles
        mesh_details.append({
            "object": obj.name, "vertices": len(obj.data.vertices),
            "triangles": triangles, "materials": [m.name if m else None for m in obj.data.materials],
            "has_armature_modifier": any(m.type == "ARMATURE" for m in obj.modifiers),
            "vertex_groups": len(obj.vertex_groups),
        })
    if total_triangles == 0:
        raise RuntimeError("Zero actual mesh triangles")
    bones = {a.name: [bone.name for bone in a.data.bones] for a in armatures}
    if not any(bones.values()):
        raise RuntimeError("Rig found but no bones")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes + armatures:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armatures[0]
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target), export_format="GLB", use_selection=True,
        export_animations=True, export_skins=True, export_yup=True,
    )
    if not target.is_file() or target.stat().st_size < 256:
        raise RuntimeError("Blender did not produce a valid-sized GLB")
    with target.open("rb") as f:
        magic = f.read(4)
    if magic != b"glTF":
        raise RuntimeError("Result is not a binary glTF model")
    report = {
        "source": source.name,
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "export": target.name,
        "export_sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "blender": bpy.app.version_string,
        "total_triangles": total_triangles, "meshes": mesh_details,
        "rig_bones": bones,
        "actions_found": sorted(action.name for action in bpy.data.actions),
    }
    (target.with_suffix(".json")).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
