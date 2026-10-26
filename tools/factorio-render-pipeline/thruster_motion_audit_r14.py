#!/usr/bin/env python3
"""Audit 64-frame vanilla thruster motion without inferring invisible mechanisms.

The Factorio sprite ZIP is private operator input. Do NOT commit original game
images, derived contact sheets, or per-pixel heatmaps to the public repository.
RGB/luminance changes do NOT prove physical articulation; motion interpretation
requires visual tracking in the independent source body layer.
"""
import argparse
import json
from pathlib import Path
import zipfile

from PIL import Image, ImageChops, ImageDraw
from audit_vanilla_atlas import read_atlas

FRAME_COUNT = 64
ALPHA_DELTA = 10
OPAQUE_THRESHOLD = 128
COLOR_DELTA = 12
ALPHA_LOOKUP = [255 if x > ALPHA_DELTA else 0 for x in range(256)]
COLOR_LOOKUP = [255 if x > COLOR_DELTA else 0 for x in range(256)]
OPAQUE_LOOKUP = [255 if x >= OPAQUE_THRESHOLD else 0 for x in range(256)]


def pixel_count(mask):
    return mask.histogram()[255]


def regions(height):
    """R12 empirically chosen Y bands; fractions support generated fixtures."""
    if height == 542:
        return {"upper_housing": (0, 340),
                "aft_hardware": (340, 410),
                "bell_afterburner": (410, 542)}
    a = max(1, min(height-2, int(height * 340 / 542)))
    b = max(a+1, min(height-1, int(height * 410 / 542)))
    return {"upper_housing": (0, a),
            "aft_hardware": (a, b),
            "bell_afterburner": (b, height)}


def frame_pair_metrics(first, second, zones):
    if first.size != second.size:
        raise ValueError("Reference frames have different canvas dimensions")
    pa, pb = first.getchannel("A"), second.getchannel("A")
    alpha_change = ImageChops.difference(pa, pb).point(ALPHA_LOOKUP)
    shape_a, shape_b = pa.point(OPAQUE_LOOKUP), pb.point(OPAQUE_LOOKUP)
    shape_xor = ImageChops.difference(shape_a, shape_b)
    opaque_intersection = ImageChops.multiply(shape_a, shape_b)
    luma_diff = ImageChops.difference(first.convert("L"),
                                     second.convert("L")).point(COLOR_LOOKUP)
    color_change = ImageChops.multiply(luma_diff, opaque_intersection)
    w = first.width
    per_zone = {}
    for name, (lo, hi) in zones.items():
        bounds = (0, lo, w, hi)
        per_zone[name] = {
            "alpha_delta_pixels": pixel_count(alpha_change.crop(bounds)),
            "silhouette_crossing_pixels": pixel_count(shape_xor.crop(bounds)),
            "opaque_luminance_delta_pixels": pixel_count(color_change.crop(bounds)),
        }
    return {
        "alpha_delta_pixels": pixel_count(alpha_change),
        "silhouette_crossing_pixels": pixel_count(shape_xor),
        "opaque_luminance_delta_pixels": pixel_count(color_change),
        "alpha_delta_bbox": list(alpha_change.getbbox()) if alpha_change.getbbox() else None,
        "regions": per_zone,
    }, alpha_change


def light_frame_delta(a, b):
    # The light atlases' appearance is NOT geometry information.
    diff = ImageChops.difference(a.convert("L"), b.convert("L"))
    return pixel_count(diff.point(COLOR_LOOKUP))


def mean(values):
    return round(sum(values)/len(values), 3) if values else 0.0


def contact(frames, output):
    # PRIVATE contact sheet; source art must not be published to GitHub.
    indices = list(range(0, len(frames), 4))
    columns, rows, thumb_width, thumb_height = 8, 2, 150, 325
    board = Image.new("RGB", (columns*thumb_width, rows*(thumb_height+22)),
                      (32, 35, 39))
    draw = ImageDraw.Draw(board)
    for position, index in enumerate(indices):
        img = frames[index].copy()
        img.thumbnail((thumb_width-8, thumb_height-8), Image.Resampling.LANCZOS)
        x = (position % columns)*thumb_width + (thumb_width-img.width)//2
        y = (position // columns)*(thumb_height+22)
        background = Image.new("RGBA", img.size, (50, 54, 58, 255))
        background.alpha_composite(img)
        board.paste(background.convert("RGB"), (x, y))
        draw.text(((position % columns)*thumb_width+6, y+thumb_height+2),
                  f"frame {index:02d}", fill=(225, 225, 220))
    board.save(output)


def analyze_frames(body_frames, light_frames, output=None):
    if len(body_frames) != FRAME_COUNT or len(light_frames) != FRAME_COUNT:
        raise ValueError("A valid 64-frame body AND 64-frame light atlas are required")
    if len({frame.size for frame in body_frames}) != 1:
        raise ValueError("Body reference frames do not share dimensions")
    if len({frame.size for frame in light_frames}) != 1:
        raise ValueError("Lighting reference frames do not share dimensions")
    w, h = body_frames[0].size
    bands = regions(h)
    cumulative = [0] * (w*h)
    results = []
    light_changes = []
    for i in range(FRAME_COUNT):
        j = (i+1) % FRAME_COUNT  # Capture the previously untested 63 -> 0 wrap.
        record, mask = frame_pair_metrics(body_frames[i], body_frames[j], bands)
        record.update({
            "from_frame": i, "to_frame": j,
            "light_atlas_luminance_delta_pixels":
                light_frame_delta(light_frames[i], light_frames[j])
        })
        results.append(record)
        light_changes.append(record["light_atlas_luminance_delta_pixels"])
        for pos, value in enumerate(mask.tobytes()):
            if value:
                cumulative[pos] += 1
    areas = {}
    for name, (start, stop) in bands.items():
        series = [r["regions"][name] for r in results]
        areas[name] = {
            "rows": [start, stop],
            "mean_changed_alpha_pixels_per_transition":
                mean([x["alpha_delta_pixels"] for x in series]),
            "mean_silhouette_crossings_per_transition":
                mean([x["silhouette_crossing_pixels"] for x in series]),
            "mean_opaque_luminance_changes_per_transition":
                mean([x["opaque_luminance_delta_pixels"] for x in series]),
            "total_changed_alpha_pixels":
                sum(x["alpha_delta_pixels"] for x in series)
        }
    total = sum(x["total_changed_alpha_pixels"] for x in areas.values())
    for region in areas.values():
        region["share_of_alpha_change"] = (
            round(region["total_changed_alpha_pixels"]/total, 5) if total else None
        )
    offset_probe = {}
    for offset in (1, 2, 4, 8, 16, 32):
        values = []
        for i in range(FRAME_COUNT):
            pair, _ = frame_pair_metrics(
                body_frames[i], body_frames[(i+offset) % FRAME_COUNT], bands)
            values.append(pair["alpha_delta_pixels"])
        offset_probe[str(offset)] = {
            "mean_alpha_change": mean(values),
            "max_alpha_change": max(values)
        }
    report = {
        "schema_version": 1,
        "reference": "locally supplied original Factorio thruster atlas",
        "body_frames": FRAME_COUNT,
        "light_frames": FRAME_COUNT,
        "frame_size": [w, h],
        "cyclic_transitions": FRAME_COUNT,
        "wrap_transition": {
            "from": 63, "to": 0,
            "alpha_delta_pixels": results[-1]["alpha_delta_pixels"]
        },
        "alpha_change_threshold": ALPHA_DELTA,
        "silhouette_alpha_threshold": OPAQUE_THRESHOLD,
        "opaque_luminance_change_threshold": COLOR_DELTA,
        "regions": areas,
        "mean_changed_alpha_pixels_per_transition":
            mean([r["alpha_delta_pixels"] for r in results]),
        "mean_light_atlas_luminance_changed_pixels": mean(light_changes),
        "pairwise_phase_offsets": offset_probe,
        "transitions": results,
        "mechanical_interpretation":
            "REQUIRES HUMAN FRAME TRACKING: pixel differences cannot prove pivot, piston or rotation",
        "original_frame_bytes_embedded_in_report": False,
        "do_not_commit_private_output_images": True,
    }
    if output is not None:
        output = Path(output)
        output.mkdir(parents=True, exist_ok=True)
        (output/"thruster_motion_r14.json").write_text(
            json.dumps(report, indent=2)+"\n", encoding="utf-8")
        thermal = Image.new("L", (w, h))
        thermal.putdata([round(255*min(v, FRAME_COUNT)/FRAME_COUNT) for v in cumulative])
        thermal.save(output/"alpha_motion_frequency_private.png")
        contact(body_frames, output/"original_body_frames_private.png")
    return report


def analyze_zip(path, output):
    with zipfile.ZipFile(path) as archive:
        descriptors = [n for n in archive.namelist()
                       if n.endswith("/thruster.lua")]
        if len(descriptors) != 1:
            raise ValueError("One original thruster.lua descriptor required")
        folder = descriptors[0][:-len("thruster.lua")]
        body_meta, body = read_atlas(archive, folder, "thruster")
        light_meta, light = read_atlas(archive, folder, "thruster-light")
    report = analyze_frames(body, light, output)
    report["body_atlas"] = body_meta
    report["light_atlas"] = light_meta
    report["source_privacy"] = "original ZIP stays local and is not included in output"
    output = Path(output)
    (output/"thruster_motion_r14.json").write_text(
        json.dumps(report, indent=2)+"\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("installed_thruster_zip", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    r = analyze_zip(args.installed_thruster_zip, args.output)
    print("THRUSTER_MOTION_R14_PASS", "body", r["body_frames"],
          "light", r["light_frames"], "cyclic_pairs", r["cyclic_transitions"],
          "changed_alpha_mean", r["mean_changed_alpha_pixels_per_transition"],
          flush=True)


if __name__ == "__main__":
    main()
