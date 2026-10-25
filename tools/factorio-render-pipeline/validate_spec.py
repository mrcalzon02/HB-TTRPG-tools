#!/usr/bin/env python3
"""Static manifest validator: does not render and does not call Factorio."""
import argparse
import json
from pathlib import Path

DIRECTIONS = {"north", "east", "south", "west"}


def validate(data, strict=False):
    issues = []
    if not isinstance(data, dict):
        return ["root must be an object"]
    if data.get("schema_version") != 1:
        issues.append("schema_version must be 1")
    for field in ("asset_id", "source_repository", "factorio_version"):
        if not isinstance(data.get(field), str) or not data[field]:
            issues.append("missing " + field)
    if data.get("calibration_status") not in {"uncalibrated", "calibrated"}:
        issues.append("invalid calibration_status")
    states = data.get("states")
    if not isinstance(states, list) or not states:
        issues.append("states must be a nonempty list")
    else:
        names = set()
        for state in states:
            if not isinstance(state, dict) or not isinstance(state.get("name"), str):
                issues.append("invalid state")
                continue
            name = state["name"]
            if name in names:
                issues.append("duplicate state " + name)
            names.add(name)
            if strict and (type(state.get("frame_count")) is not int or state["frame_count"] <= 0):
                issues.append("positive frame_count required for " + name)
        if strict and not {"idle", "run"}.issubset(names):
            issues.append("idle and run states required")
    render = data.get("render")
    if not isinstance(render, dict):
        issues.append("render must be an object")
    if strict:
        if data.get("calibration_status") != "calibrated":
            issues.append("production requires calibrated status")
        for field in ("prototype_name", "prototype_type", "prototype_evidence", "source_commit", "source_blend"):
            if not isinstance(data.get(field), str) or not data[field].strip():
                issues.append("production requires source field " + field)
        footprint = data.get("footprint_tiles")
        if not isinstance(footprint, list) or len(footprint) != 2 or any(type(v) is not int or v <= 0 for v in footprint):
            issues.append("positive two-axis footprint required")
        for field in ("mount_anchor_tiles", "sprite_shift_tiles"):
            xy = data.get(field)
            if not isinstance(xy, list) or len(xy) != 2 or any(type(v) not in (int, float) for v in xy):
                issues.append("numeric XY pair required for " + field)
        for field in ("attachment_edge", "exhaust_direction"):
            if data.get(field) not in DIRECTIONS:
                issues.append("verified cardinal direction required for " + field)
        if isinstance(render, dict):
            for field in ("frame_width_px", "frame_height_px", "pixels_per_tile"):
                v = render.get(field)
                if type(v) not in (float, int) or v <= 0:
                    issues.append("positive rendering value required for " + field)
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", type=Path)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    try:
        data = json.loads(args.spec.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    issues = validate(data, strict=args.strict)
    if issues:
        for issue in issues:
            print("FAIL:", issue)
        raise SystemExit(1)
    print("PASS: manifest structurally valid; no Blender render or Factorio test occurred")


if __name__ == "__main__":
    main()