"""Import privately acquired Wube STL references into an ISOLATED Blender library.

The reconstructed production scene stays untouched. Printable STLs are NOT the
original Factorio production geometry. No source images or third-party meshes
are shipped with this tool; this script never downloads or publishes them.

Use Blender 4.5 LTS:
  blender -b --python official_reference_library.py -- \
      --source-blend /private/R58.blend --stl-root /private/wube \
      --out-blend /private/factorio-reference-library.blend \
      --report /private/reference-library.json \
      [--community-blend /private/factorio_basic.blend]
For inventory without Blender: python official_reference_library.py --stl-root ... --plan-only
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Blender --python does not guarantee the script folder is on sys.path.
SCRIPT_DIRECTORY = str(Path(__file__).resolve().parent)
if SCRIPT_DIRECTORY not in sys.path:
    sys.path.insert(0, SCRIPT_DIRECTORY)

from audit_official_stl_references import inspect_stl

CATALOG = (
    "assembling-machine", "belt-items", "biter", "biter-spawner",
    "chests", "electric-mining-drill", "inserters", "player-character",
    "small-electric-pole", "spitter", "steel-furnace", "stone-furnace",
    "transport-belts", "walls", "worm",
)
MAX_FILES = 1000
MAX_BYTES_PER_FILE = 512 * 1024 * 1024


def safe_slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")


def inventory(root, require_all=False):
    """Require each source STL to reside under an explicit official-set folder.

    No guess based on file names: printer variants and multipart models are
    deliberately NOT automatically assembled or mapped to Factorio tile units.
    """
    root = Path(root).resolve()
    if not root.is_dir():
        raise ValueError("A private --stl-root folder is required")
    entries = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() != ".stl":
            continue
        relative = path.relative_to(root)
        if len(relative.parts) < 2:
            raise ValueError("Place each STL inside its official set folder: " + path.name)
        group = safe_slug(relative.parts[0])
        if group not in CATALOG:
            raise ValueError("Unknown Wube set folder " + relative.parts[0])
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError("Refusing linked/out-of-root reference: " + str(path))
        if path.stat().st_size > MAX_BYTES_PER_FILE:
            raise ValueError("Oversized STL file " + path.name)
        record = inspect_stl(path)
        record["set"] = group
        record["relative_path"] = relative.as_posix()
        entries.append(record)
        if len(entries) > MAX_FILES:
            raise ValueError("Too many individual STL variants")
    if not entries:
        raise ValueError("No authentic privately supplied STL files; cannot load a reference library")
    present = {e["set"] for e in entries}
    missing = sorted(set(CATALOG) - present)
    if require_all and missing:
        raise ValueError("Incomplete 15-set catalogue: " + ", ".join(missing))
    return {
        "status": "UNASSEMBLED_PRIVATE_REFERENCE_ONLY",
        "catalogue_publisher": "Wube Software",
        "input_provenance_verified": False,
        "input_provenance_note": "Folder names are user declarations; file SHA256 is not an authenticated Wube checksum. Verify each original download and license.",
        "source": "https://www.printables.com/@WubeSoftware/models",
        "catalogue_sets": list(CATALOG),
        "present_sets": sorted(present),
        "missing_sets": missing,
        "stl_count": len(entries),
        "entries": entries,
        "warnings": [
            "Official 3D-print variants are not original production meshes",
            "STL mm/print scale is not a Factorio tile calibration",
            "Multipart STL fragments are NOT automatically assembled",
            "No source art, Wube meshes, or community blend may be committed",
        ],
    }


def native_scene_state(scene):
    camera = scene.camera
    return {
        "scene": scene.name,
        "objects": sorted(o.name for o in scene.objects),
        "camera": camera.name if camera else None,
        "camera_matrix": [list(row) for row in camera.matrix_world] if camera else None,
        "camera_ortho": camera.data.ortho_scale if camera and camera.type == "CAMERA" else None,
        "width": scene.render.resolution_x,
        "height": scene.render.resolution_y,
        "film_transparent": bool(scene.render.film_transparent),
        "lights": sorted(o.name for o in scene.objects if o.type == "LIGHT"),
    }


def link_camera_and_lights(source, target, bpy):
    """Copy the real rig into a distinct scene. Never point the original at STLs."""
    for obj in source.objects:
        if obj.type not in {"CAMERA", "LIGHT"}:
            continue
        # A copied Blender object retains its original parenting, constraints,
        # drivers and actions by default. Those can reevaluate on reopening a
        # *different scene* and silently move the copied reference camera.
        # Snapshot the source's evaluated world transform and make the copy
        # strictly standalone. The source object is never touched.
        matrix = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.copy()
        replica = obj.copy()
        replica.data = obj.data.copy()
        replica.parent = None
        for constraint in list(replica.constraints):
            replica.constraints.remove(constraint)
        replica.animation_data_clear()
        target.collection.objects.link(replica)
        replica.matrix_world = matrix
        if obj == source.camera:
            target.camera = replica
    target.world = source.world.copy() if source.world else None
    target.render.engine = source.render.engine
    target.render.resolution_x = source.render.resolution_x
    target.render.resolution_y = source.render.resolution_y
    target.render.resolution_percentage = source.render.resolution_percentage
    target.render.film_transparent = source.render.film_transparent
    target.view_settings.view_transform = source.view_settings.view_transform


def append_community_scene(path, bpy):
    """Append to an isolated reference scene; no community camera is activated."""
    scene = bpy.data.scenes.new("COMMUNITY_BASE_UNVERIFIED")
    collection = bpy.data.collections.new("COMMUNITY_BASE_APPENDED_OBJECTS")
    scene.collection.children.link(collection)
    with bpy.data.libraries.load(str(path), link=False) as (src, dst):
        dst.objects = list(src.objects)
    for obj in dst.objects:
        if obj is not None:
            collection.objects.link(obj)
    scene["authority"] = "COMMUNITY_EXAMPLE_NOT_WUBE_NOT_CAMERA_AUTHORITY"
    scene["source_file"] = str(path)
    return len(collection.objects)


def build(source, root, output, report, community=None, require_all=False):
    import bpy
    source = Path(source).resolve()
    output = Path(output).resolve()
    report = Path(report).resolve()
    if not source.is_file():
        raise ValueError("Must supply an actual saved, editable calibration .blend")
    if output == source:
        raise ValueError("Refuse to overwrite original calibration scene")
    if community is not None:
        community = Path(community).resolve()
        if not community.is_file():
            raise ValueError("Community base .blend not found")
        if community == source or community == output:
            raise ValueError("The community base must be a distinct input file")
    plan = inventory(root, require_all=require_all)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    original = bpy.context.scene
    original_state = native_scene_state(original)
    if original.camera is None or original.camera.data.type != "ORTHO":
        raise ValueError("Source scene needs an actual saved orthographic camera")
    reference = bpy.data.scenes.new("WUBE_OFFICIAL_UNASSEMBLED_STL")
    link_camera_and_lights(original, reference, bpy)
    reference["authority"] = "PUBLIC_PRINTABLE_GEOMETRY_REFERENCE_NOT_SOURCE_CAD"
    reference["mesh_status"] = "UNASSEMBLED_IN_NATIVE_STL_UNITS"
    reference["tile_scale_calibrated"] = False

    groups = {}
    for set_name in CATALOG:
        group = bpy.data.collections.new("WUBE_SET_" + set_name)
        reference.collection.children.link(group)
        groups[set_name] = group
    current = bpy.context.window.scene if bpy.context.window else original
    try:
        # Operator runs in the explicit reference scene only.
        if bpy.context.window:
            bpy.context.window.scene = reference
        for index, entry in enumerate(plan["entries"]):
            path = Path(root).resolve() / entry["relative_path"]
            if bpy.context.window:
                bpy.context.window.scene = reference
            bpy.ops.object.select_all(action="DESELECT")
            bpy.ops.wm.stl_import(filepath=str(path), global_scale=1.0)
            imported = list(bpy.context.selected_objects)
            if not imported:
                raise RuntimeError("Blender produced no editable mesh for " + str(path))
            part = bpy.data.collections.new("STL_PART_%04d" % (index + 1))
            groups[entry["set"]].children.link(part)
            for obj in imported:
                if obj.type != "MESH" or len(obj.data.vertices) == 0:
                    raise RuntimeError("Imported STL has no actual mesh vertices: " + str(path))
                for old in list(obj.users_collection):
                    old.objects.unlink(obj)
                part.objects.link(obj)
                obj.name = "OFFICIAL_STL_%04d_%s" % (index + 1, safe_slug(path.stem)[:32])
                obj["source_relative_path"] = entry["relative_path"]
                obj["source_sha256"] = entry["sha256"]
                obj["catalogue_set_claim"] = entry["set"]
                obj["source_authenticity_verified"] = False
                obj["print_unit_to_tile_scale"] = "UNKNOWN"
                obj["unassembled_print_part"] = True
            entry["imported_blender_objects"] = len(imported)
    finally:
        if bpy.context.window:
            bpy.context.window.scene = current

    if community is not None:
        plan["community_reference_object_count"] = append_community_scene(community, bpy)
        plan["community_base_file"] = str(community)
        plan["community_base_role"] = "isolation only; not camera/lighting authority"
    else:
        plan["community_base_role"] = "not supplied; scene has not been compared"

    if native_scene_state(original) != original_state:
        raise RuntimeError("Original reconstruction scene, camera or lights changed: refusing save")
    # Preserve the reconstruction as the default scene on file reopen.
    if bpy.context.window:
        bpy.context.window.scene = original
    plan["reconstruction_scene_preserved"] = True
    plan["reconstruction_camera"] = original.camera.name
    plan["reconstruction_scene"] = original.name
    plan["reference_scene"] = reference.name
    plan["reference_camera"] = reference.camera.name if reference.camera else None
    plan["source_blend"] = str(source)
    plan["output_blend"] = str(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    print("BLENDER_REFERENCE_IMPORT_OK", len(plan["entries"]),
          "native STL variants; 15 catalogue slots; source camera unchanged", flush=True)
    return plan


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stl-root", type=Path, required=True)
    parser.add_argument("--plan-only", action="store_true")
    parser.add_argument("--require-all-15", action="store_true")
    parser.add_argument("--source-blend", type=Path)
    parser.add_argument("--community-blend", type=Path)
    parser.add_argument("--out-blend", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args(argv)
    if args.plan_only:
        result = inventory(args.stl_root, require_all=args.require_all_15)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print("REFERENCE_PLAN_OK", result["stl_count"], "parts",
              len(result["present_sets"]), "sets", flush=True)
        return
    if not args.source_blend or not args.out_blend or not args.report:
        parser.error("Blender mode requires --source-blend, --out-blend and --report")
    build(args.source_blend, args.stl_root, args.out_blend, args.report,
          community=args.community_blend, require_all=args.require_all_15)


if __name__ == "__main__":
    main()
