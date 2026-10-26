#!/usr/bin/env python3
"""Audit user-supplied Factorio Space Age thruster sprite ZIP locally.

Reads original installed-game sprite sheets and their .lua atlas descriptors.
Exports numeric metadata, visual contact sheets, and animation change evidence.
DO NOT commit copyrighted game sprite bytes or derived contact sheets to GitHub.
Only this tool and source-neutral validation data belong in the public repo.
"""
import argparse
import io
import json
import math
from pathlib import Path
import re
import zipfile

from PIL import Image, ImageChops, ImageDraw


def int_field(lua, field):
    match = re.search(r"\b" + re.escape(field) + r"\s*=\s*(\d+)", lua)
    if not match:
        raise ValueError("Missing atlas field: " + field)
    return int(match.group(1))


def read_atlas(archive, folder, stem):
    lua = archive.read(folder + stem + ".lua").decode("utf-8")
    cols = int_field(lua, "line_length")
    width = int_field(lua, "width")
    height = int_field(lua, "height")
    rows = int_field(lua, "lines_per_file")
    suffixes = re.findall(r'"(-\d+\.png)"', lua)
    if not suffixes:
        suffixes = [".png"]
        rows = 1
    frames = []
    for suffix in suffixes:
        name = folder + stem + suffix
        with Image.open(io.BytesIO(archive.read(name))) as png:
            actual = png.size
            expected = (width * cols, height * rows)
            if actual != expected:
                raise ValueError("%s expected %s got %s" % (name, expected, actual))
            for row in range(rows):
                for col in range(cols):
                    x, y = col * width, row * height
                    frames.append(png.crop((x, y, x + width, y + height)).convert("RGBA"))
    return {"stem": stem, "cell_width": width, "cell_height": height,
            "line_length": cols, "lines_per_file": rows,
            "atlas_files": [stem + x for x in suffixes]}, frames


def alpha_count(mask):
    return mask.histogram()[255]


def contact_sheet(frames, out):
    picks = sorted(set([0, 1, 2, 3, 4, 8, 12, 16, 24, 32, 40, 48, 56, len(frames)-1]))
    cell_w, cell_h = 156, 338
    columns = 7
    rows = math.ceil(len(picks)/columns)
    board = Image.new("RGB", (columns*cell_w, rows*cell_h), (28, 31, 35))
    draw = ImageDraw.Draw(board)
    for n, idx in enumerate(picks):
        img = frames[idx].copy()
        img.thumbnail((cell_w-10, cell_h-28), Image.Resampling.LANCZOS)
        background = Image.new("RGBA", img.size, (53, 55, 59, 255))
        background.alpha_composite(img)
        left = (n % columns)*cell_w + (cell_w-img.width)//2
        top = (n // columns)*cell_h
        board.paste(background.convert("RGB"), (left, top))
        draw.text(((n % columns)*cell_w+7, top+cell_h-19),
                  "Frame %02d" % idx, fill=(228, 230, 214))
    board.save(out)


def audit(zip_path, output):
    zip_path = Path(zip_path)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        entries = set(archive.namelist())
        names = [n for n in entries if n.endswith("/thruster.lua")]
        if len(names) != 1:
            raise ValueError("Expected one vanilla thruster.lua descriptor")
        folder = names[0][:-len("thruster.lua")]
        atlas, frames = read_atlas(archive, folder, "thruster")
        light, light_frames = read_atlas(archive, folder, "thruster-light")
        background_lua = archive.read(folder + "thruster-bckg.lua").decode("utf-8")
        background = {
            "width": int_field(background_lua, "width"),
            "height": int_field(background_lua, "height"),
            "file": "thruster-bckg.png",
        }
        layers = {}
        for layer in ("thruster-bckg.png", "thruster-flame.png",
                      "thruster-smoke.png", "thruster-smoke-glow.png",
                      "thruster-pipe-connection-1.png",
                      "thruster-pipe-connection-2.png",
                      "thruster-pipe-connection-3.png",
                      "thruster-pipe-connection-4.png",
                      "thruster-remnants.png"):
            if folder + layer not in entries:
                raise ValueError("Required layer missing: " + layer)
            with Image.open(io.BytesIO(archive.read(folder + layer))) as im:
                layers[layer] = {"width": im.width, "height": im.height,
                                 "pixel_mode": im.mode}
    if len(frames) != 64:
        raise ValueError("Vanilla body reference must contain 64 frames, got %d" % len(frames))
    if len(light_frames) != 64:
        raise ValueError("Vanilla light reference must contain 64 frames")
    # Difference metrics intentionally distinguish shape changes from color
    # and lighting changes. Motion proof is not automatic 3D rig recovery.
    bands = [(0, 100), (100, 200), (200, 280), (280, 340),
             (340, 410), (410, 470), (470, 542)]
    if frames[0].height != 542:
        # Keep experimental atlas sizes supported without wrong hard-coded ROI.
        step = frames[0].height / len(bands)
        bands = [(round(i*step),round((i+1)*step)) for i in range(len(bands))]
    alpha_changes = []
    color_changes = []
    per_band = {str(a) + "-" + str(b): [] for a, b in bands}
    for previous, current in zip(frames[:-1], frames[1:]):
        pa, ca = previous.getchannel("A"), current.getchannel("A")
        am = ImageChops.difference(pa, ca).point(lambda x: 255 if x > 10 else 0)
        alpha_changes.append(alpha_count(am))
        for a, b in bands:
            per_band[str(a)+"-"+str(b)].append(alpha_count(am.crop((0, a, am.width, b))))
        # Mean per-pixel RGB differences are not sufficient evidence of moving
        # parts; these include changing illumination and color animation.
        color_changes.append(ImageChops.difference(
            previous.convert("RGB"), current.convert("RGB")).getbbox() is not None)
    report = {
        "schema_version": 1,
        "source": "user-provided installed Factorio Space Age thruster graphics",
        "source_version": "check installed game; source atlas alone has no version tag",
        "atlas": atlas,
        "body_frame_count": len(frames),
        "light_atlas": light,
        "light_frame_count": len(light_frames),
        "integration_patch": background,
        "separate_layers": layers,
        "alpha_change_threshold": 10,
        "consecutive_transitions": len(alpha_changes),
        "mean_changed_alpha_pixels_per_transition": round(sum(alpha_changes)/len(alpha_changes), 2),
        "alpha_changes_per_transition": alpha_changes,
        "alpha_changes_by_vertical_band": {
            label: {
                "mean_per_transition": round(sum(values)/len(values), 2),
                "peak": max(values)
            }
            for label, values in per_band.items()
        },
        "capture_requirements": [
            "model upper housing as largely fixed silhouette",
            "isolate nozzle/afterburner motions from overlay lighting",
            "keep floor integration, four conditional pipes, light, flame and smoke as separate channels",
            "do not infer three-dimensional topology uniquely from 2D sprites"
        ],
        "images_are_not_embedded_in_this_json": True
    }
    (output/"vanilla_thruster_atlas_audit.json").write_text(json.dumps(report, indent=2)+"\n")
    contact_sheet(frames, output/"thruster_frame_contact_sheet.png")
    frames[0].save(output/"frame_00_local_reference.png")
    frames[32].save(output/"frame_32_local_reference.png")
    # User's local inspection artifact only, NOT for public source repository.
    rgb = frames[0].convert("RGB")
    alpha = frames[0].getchannel("A")
    rgb.save(output/"frame_00_on_black.png")
    print("AUDIT_PASS body=%d light=%d shape_change_avg=%s" % (
        len(frames), len(light_frames), report["mean_changed_alpha_pixels_per_transition"]))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("installed_game_thruster_zip", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    a = parser.parse_args()
    audit(a.installed_game_thruster_zip, a.output)
