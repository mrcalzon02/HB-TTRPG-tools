"""R128: refine the genuine finite-thickness R127 fin's metal edges.

Small diagnostic corner radii and symmetric physical two-skin bevels.
Do not invent mounts or approve appearance without the PRIVATE original.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as coords
import inspect_real_round_center_normals_r123 as visual
import remove_axial_curl_real_3d_square_master_r127 as r127

MASTER = core.FIN_PREFIX + "02"
SRC = "r127_square_plate_no_axial_curl.blend"
UPSTREAM = "r127_squarish_fin_true_3d_axial_curl_repair.json"
ROWS, COLS = 9, 17
PER_SKIN = ROWS * COLS
CASES = (
    ("r127_square_plate_no_axial_curl_control", 0.0, 0.0),
    ("r128_small_corner_and_forged_edge", 0.4, 0.08),
    ("r128_rounder_corner_and_forged_edge", 0.8, 0.14),
)


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def points(scene, fin):
    return [coords.projected_pixel(scene, fin.matrix_world @ v.co)
            for v in fin.data.vertices]


def edge_row_depths(samples):
    return [sum(samples[s * PER_SKIN + r * COLS + c][2]
                for s in (0, 1) for c in (0, COLS - 1)) / 4.0
            for r in range(ROWS)]


def refine_one_real_fin(scene, fin, corner_extra_px, bevel_fraction):
    mesh = fin.data
    if (not fin.get("R127_original_cross_section_curvature_preserved") or
            len(mesh.vertices) != 306 or mesh.shape_keys or
            not core.manifold_edges(mesh)[0]):
        raise RuntimeError("R128 needs intact R127 real two-skin metal master")
    if not (0.0 < corner_extra_px <= 1.0 and 0.0 < bevel_fraction <= 0.2):
        raise ValueError("R128 shape changes must remain small and inspectable")

    before = points(scene, fin)
    previous_means = edge_row_depths(before)
    original_root = [tuple(mesh.vertices[s * PER_SKIN + c].co)
                     for s in (0, 1) for c in range(COLS)]
    inverse = fin.matrix_world.inverted_safe()
    max_move = 0.0
    thickness_ratios = []
    for row in range(ROWS):
        t = row / (ROWS - 1)
        axial_gate = smoothstep((t - 0.125) / 0.375)
        distal_gate = smoothstep((t - 0.75) / 0.25)
        for col in range(COLS):
            u = 2 * col / (COLS - 1) - 1.0
            lateral_edge = abs(u) ** 12
            idx0, idx1 = row * COLS + col, PER_SKIN + row * COLS + col
            old0, old1 = before[idx0], before[idx1]
            thickness = abs(old0[2] - old1[2])
            if thickness < 1e-5:
                raise RuntimeError("R128 cannot bevel zero-thickness source fin")
            bevel = thickness * bevel_fraction * axial_gate * (
                0.45 * lateral_edge + 0.55 * distal_gate)
            pixel_dy = -corner_extra_px * lateral_edge * distal_gate
            toward_inside = 1.0 if old0[2] < old1[2] else -1.0
            for skin, index, original in ((0, idx0, old0), (1, idx1, old1)):
                x, y, depth = original
                new_depth = depth + (toward_inside if skin == 0 else -toward_inside) * bevel
                destination = inverse @ coords.source_pixel_world(
                    scene, x, y + pixel_dy, new_depth)
                if not all(math.isfinite(value) for value in destination):
                    raise RuntimeError("R128 nonfinite metal geometry")
                old_co = tuple(mesh.vertices[index].co)
                max_move = max(max_move, math.dist(old_co, tuple(destination)))
                mesh.vertices[index].co = destination
            thickness_ratios.append(1.0 - 2.0 * bevel / thickness)

    mesh.update()
    if not core.manifold_edges(mesh)[0] or any(face.area < 1e-11 for face in mesh.polygons):
        raise RuntimeError("R128 bevel opened or collapsed metal mesh")
    if any(math.dist(tuple(mesh.vertices[s * PER_SKIN + c].co), original_root[s * COLS + c]) > 1e-7
           for s in (0, 1) for c in range(COLS)):
        raise RuntimeError("R128 moved original fin root")
    after = points(scene, fin)
    silhouette_delta = max(math.dist(a[:2], b[:2]) for a, b in zip(before, after))
    if silhouette_delta > corner_extra_px + 0.001:
        raise RuntimeError("R128 exceeded small source-camera corner tolerance")
    if min(thickness_ratios) < 0.70:
        raise RuntimeError("R128 excessive material thinning")
    if max(abs(a - b) for a, b in zip(previous_means, edge_row_depths(after))) > 1e-4:
        raise RuntimeError("R128 reintroduced nonlinear axial curl")
    if max_move < 1e-5:
        raise RuntimeError("R128 made no real metal geometry improvement")

    fin["R128_forged_two_skin_edge_bevel"] = True
    fin["R128_private_original_sprite_approval_pending"] = True
    return {
        "vertices": len(mesh.vertices),
        "faces": len(mesh.polygons),
        "true_two_skin_edge_bevel": True,
        "metal_min_remaining_thickness_fraction": round(min(thickness_ratios), 5),
        "largest_actual_world_vertex_displacement_m": round(max_move, 6),
        "largest_source_camera_silhouette_shift_px": round(silhouette_delta, 6),
        "root_unchanged": True,
        "axial_depth_centerline_unchanged": True,
        "new_mesh_object_added": False,
        "private_original_sprite_visually_approved": False,
    }


def run(indir, outdir):
    source_dir = Path(indir).resolve()
    prior = json.loads((source_dir / UPSTREAM).read_text(encoding="utf-8"))
    matching = [c for c in prior["cases"] if c["name"] == "r127_square_plate_no_axial_curl"]
    source = source_dir / SRC
    if len(matching) != 1 or hashlib.sha256(source.read_bytes()).hexdigest() != matching[0]["sha256"]:
        raise RuntimeError("R128 requires exact verified R127 no-curl Blender master")
    out = Path(outdir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    report = {
        "revision": "R128",
        "private_original_source_sha256": prior["private_original_source_sha256"],
        "private_original_bitmap_published": False,
        "original_sprite_comparison_pending": True,
        "only_existing_central_master_fin_modified": True,
        "cases": [],
    }
    for name, corner, bevel in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene = bpy.context.scene
        scene.frame_set(1)
        baseline = r127.signatures(scene)
        fin = bpy.data.objects[MASTER]
        result = refine_one_real_fin(scene, fin, corner, bevel) if bevel else None
        if r127.signatures(scene) != baseline:
            raise RuntimeError("R128 damaged protected bell/fins/camera/motion")
        frames = {}
        for frame in (1, 33):
            scene.frame_set(frame)
            file = f"{name}_original_camera_frame{frame:02d}.png"
            visual.render_native(scene, out / file)
            frames[str(frame)] = file
        scene.frame_set(1)
        angles = {}
        for angle in (0, 35, 65):
            file = f"{name}_real_3d_edge_{angle:02d}deg.png"
            visual.inspect_true_one_fin(scene, out / file, angle)
            angles[str(angle)] = file
        if r127.signatures(scene) != baseline:
            raise RuntimeError("R128 changed other geometry during render")
        scene["fsc_r128_master_fin_candidate"] = name
        scene["fsc_r128_private_original_visually_approved"] = False
        saved = out / (name + ".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene = bpy.context.scene
        if r127.signatures(scene) != baseline:
            raise RuntimeError("R128 save/reopen changed protected engine")
        if scene.get("fsc_r128_master_fin_candidate") != name:
            raise RuntimeError("R128 save/reopen lost candidate identity")
        if not core.manifold_edges(bpy.data.objects[MASTER].data)[0]:
            raise RuntimeError("R128 saved mesh is not closed 3D metal")
        report["cases"].append({
            "name": name,
            "actual_refined_mesh": result,
            "source_camera_frames": frames,
            "true_3d_edge_inspection_angles": angles,
            "editable_blender_scene": saved.name,
            "sha256": hashlib.sha256(saved.read_bytes()).hexdigest(),
            "bell_other_fins_original_camera_and_motion_preserved": True,
            "visual_acceptance_pending": True,
        })
        (out / "r128_actual_forged_master_edges.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print("R128_REFINED_REAL_FIN_SAVED", name, flush=True)
    print("R128_GENUINE_MESH_EDGE_VARIANTS_SAVED_ORIGINAL_SPRITE_REVIEW_PENDING", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--r127-dir", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:]
                                 if "--" in sys.argv else sys.argv[1:])
    run(args.r127_dir, args.out)
