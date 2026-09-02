#!/usr/bin/env python3
"""Minimal CSV-backed tabletop battlespace engine and Pillow renderer.

Canonical spatial state is stored in CSV. PNG output is a diagnostic projection,
with 1 pixel == 1 grid cell as the minimum supported rendering mode.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import tempfile
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Pillow is required for render operations: pip install pillow") from exc

MAP_FIELDS = [
    "map_id", "name", "encounter_id", "width_cells", "height_cells",
    "feet_per_cell", "distance_rule", "origin", "notes", "updated_at",
]
TOKEN_FIELDS = [
    "map_id", "token_id", "entity_id", "name", "faction", "x", "y",
    "width_cells", "height_cells", "z_cells", "color", "status", "notes", "updated_at",
]
TERRAIN_FIELDS = [
    "map_id", "cell_x", "cell_y", "terrain_code", "passable", "movement_cost",
    "cover", "blocks_los", "color", "notes", "updated_at",
]
EFFECT_FIELDS = [
    "map_id", "effect_id", "source_token_id", "shape", "origin_x", "origin_y",
    "target_x", "target_y", "radius_cells", "length_cells", "width_cells",
    "cells", "color", "status", "notes", "updated_at",
]

DEFAULT_PALETTE = {
    "empty": "#F2F2F2",
    "terrain": "#808080",
    "effect": "#FFD54F",
    "player": "#2979FF",
    "ally": "#00A86B",
    "neutral": "#9E9E9E",
    "hostile": "#D32F2F",
    "unknown": "#7B1FA2",
    "collision": "#000000",
}


def _hex_rgb(value: str) -> Tuple[int, int, int]:
    value = (value or "").strip()
    if not value:
        raise ValueError("empty color")
    if value.startswith("#"):
        value = value[1:]
    if len(value) != 6 or any(c not in "0123456789abcdefABCDEF" for c in value):
        raise ValueError(f"invalid RGB color: {value!r}")
    return tuple(int(value[i:i+2], 16) for i in (0, 2, 4))


def _int(value, default=0) -> int:
    if value in (None, ""):
        return default
    return int(value)


def _float(value, default=0.0) -> float:
    if value in (None, ""):
        return default
    return float(value)


def _read_csv(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def _atomic_write_csv(path: Path, fields: List[str], rows: Iterable[Dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow({field: row.get(field, "") for field in fields})
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


def init_state(root: Path) -> None:
    tables = [
        ("battlefield_maps.csv", MAP_FIELDS),
        ("battlefield_tokens.csv", TOKEN_FIELDS),
        ("battlefield_terrain.csv", TERRAIN_FIELDS),
        ("battlefield_effects.csv", EFFECT_FIELDS),
    ]
    root.mkdir(parents=True, exist_ok=True)
    for filename, fields in tables:
        path = root / filename
        if not path.exists():
            _atomic_write_csv(path, fields, [])


def load_map(root: Path, map_id: str) -> Dict[str, str]:
    matches = [r for r in _read_csv(root / "battlefield_maps.csv") if r.get("map_id") == map_id]
    if not matches:
        raise ValueError(f"unknown map_id {map_id!r}")
    if len(matches) > 1:
        raise ValueError(f"duplicate map_id {map_id!r}")
    return matches[0]


def upsert_row(path: Path, fields: List[str], key_fields: List[str], row: Dict[str, object]) -> None:
    rows = _read_csv(path)
    key = tuple(str(row.get(k, "")) for k in key_fields)
    replaced = False
    out = []
    for existing in rows:
        existing_key = tuple(str(existing.get(k, "")) for k in key_fields)
        if existing_key == key:
            merged = dict(existing)
            merged.update({k: str(v) for k, v in row.items()})
            out.append(merged)
            replaced = True
        else:
            out.append(existing)
    if not replaced:
        out.append({k: str(v) for k, v in row.items()})
    _atomic_write_csv(path, fields, out)


def validate_token_bounds(map_row: Dict[str, str], token: Dict[str, object]) -> None:
    width = _int(map_row["width_cells"])
    height = _int(map_row["height_cells"])
    x, y = _int(token["x"]), _int(token["y"])
    tw, th = max(1, _int(token.get("width_cells"), 1)), max(1, _int(token.get("height_cells"), 1))
    if x < 0 or y < 0 or x + tw > width or y + th > height:
        raise ValueError(f"token footprint ({x},{y}) {tw}x{th} is outside {width}x{height} map")


def token_cells(token: Dict[str, str]) -> List[Tuple[int, int]]:
    x, y = _int(token["x"]), _int(token["y"])
    tw, th = max(1, _int(token.get("width_cells"), 1)), max(1, _int(token.get("height_cells"), 1))
    return [(cx, cy) for cy in range(y, y + th) for cx in range(x, x + tw)]


def parse_cells(value: str) -> List[Tuple[int, int]]:
    result = []
    for item in (value or "").split(";"):
        item = item.strip()
        if not item:
            continue
        x, y = item.split(",", 1)
        result.append((int(x), int(y)))
    return result


def effect_cells(effect: Dict[str, str], map_width: int, map_height: int) -> List[Tuple[int, int]]:
    explicit = parse_cells(effect.get("cells", ""))
    if explicit:
        return [(x, y) for x, y in explicit if 0 <= x < map_width and 0 <= y < map_height]

    shape = (effect.get("shape") or "").strip().lower()
    ox, oy = _int(effect.get("origin_x")), _int(effect.get("origin_y"))
    radius = max(0, _int(effect.get("radius_cells"), 0))
    length = max(0, _int(effect.get("length_cells"), 0))
    width = max(1, _int(effect.get("width_cells"), 1))
    tx, ty = _int(effect.get("target_x"), ox), _int(effect.get("target_y"), oy)
    cells: List[Tuple[int, int]] = []

    if shape in {"square", "box"}:
        half = radius
        cells = [(x, y) for y in range(oy-half, oy+half+1) for x in range(ox-half, ox+half+1)]
    elif shape in {"circle", "radius"}:
        for y in range(oy-radius, oy+radius+1):
            for x in range(ox-radius, ox+radius+1):
                if math.hypot(x - ox, y - oy) <= radius + 1e-9:
                    cells.append((x, y))
    elif shape == "line":
        dx, dy = tx - ox, ty - oy
        steps = max(abs(dx), abs(dy), length, 1)
        if length > 0 and (dx or dy):
            scale = length / max(abs(dx), abs(dy))
            tx = round(ox + dx * scale)
            ty = round(oy + dy * scale)
            dx, dy = tx - ox, ty - oy
            steps = max(abs(dx), abs(dy), 1)
        seen = set()
        for i in range(steps + 1):
            x = round(ox + dx * i / steps)
            y = round(oy + dy * i / steps)
            for yy in range(y - (width-1)//2, y + width//2 + 1):
                for xx in range(x - (width-1)//2, x + width//2 + 1):
                    seen.add((xx, yy))
        cells = sorted(seen)
    elif shape in {"rectangle", "rect"}:
        min_x, max_x = sorted((ox, tx))
        min_y, max_y = sorted((oy, ty))
        cells = [(x, y) for y in range(min_y, max_y+1) for x in range(min_x, max_x+1)]
    else:
        return []

    return [(x, y) for x, y in cells if 0 <= x < map_width and 0 <= y < map_height]


def distance_cells(a: Dict[str, str], b: Dict[str, str], rule: str) -> float:
    # Measure from the nearest occupied grid cells so large tokens do not gain
    # artificial range from center-to-center measurement. Elevation remains an
    # integer cell offset. This is geometric state, not a replacement for a
    # ruleset-specific reach or targeting rule.
    az = _int(a.get("z_cells"), 0)
    bz = _int(b.get("z_cells"), 0)
    dz = abs(az - bz)
    rule = (rule or "grid-chebyshev").lower()
    best = None
    for ax, ay in token_cells(a):
        for bx, by in token_cells(b):
            dx, dy = abs(ax - bx), abs(ay - by)
            if rule in {"grid-chebyshev", "chebyshev", "grid"}:
                value = max(dx, dy, dz)
            elif rule in {"manhattan", "taxicab"}:
                value = dx + dy + dz
            elif rule in {"euclidean", "straight-line"}:
                value = math.sqrt(dx*dx + dy*dy + dz*dz)
            else:
                raise ValueError(f"unsupported distance_rule {rule!r}")
            if best is None or value < best:
                best = value
    return float(best or 0.0)


def find_token(root: Path, map_id: str, token_id: str) -> Dict[str, str]:
    matches = [r for r in _read_csv(root / "battlefield_tokens.csv") if r.get("map_id") == map_id and r.get("token_id") == token_id]
    if not matches:
        raise ValueError(f"unknown token {token_id!r} on map {map_id!r}")
    if len(matches) > 1:
        raise ValueError(f"duplicate token {token_id!r} on map {map_id!r}")
    return matches[0]


def render(root: Path, map_id: str, output: Path, cell_pixels: int = 1, layer: str = "composite") -> Dict[str, object]:
    if cell_pixels < 1:
        raise ValueError("cell_pixels must be >= 1; 1 pixel == 1 cell is the minimum canonical mode")
    map_row = load_map(root, map_id)
    width, height = _int(map_row["width_cells"]), _int(map_row["height_cells"])
    if width < 1 or height < 1:
        raise ValueError("map dimensions must be positive")

    bg = _hex_rgb(DEFAULT_PALETTE["empty"])
    img = Image.new("RGB", (width, height), bg)
    pix = img.load()

    terrain = [r for r in _read_csv(root / "battlefield_terrain.csv") if r.get("map_id") == map_id]
    effects = [r for r in _read_csv(root / "battlefield_effects.csv") if r.get("map_id") == map_id and (r.get("status") or "active").lower() != "inactive"]
    tokens = [r for r in _read_csv(root / "battlefield_tokens.csv") if r.get("map_id") == map_id and (r.get("status") or "active").lower() not in {"removed", "inactive"}]

    collisions: Dict[str, List[str]] = {}
    occupancy: Dict[Tuple[int, int], List[str]] = {}

    if layer in {"composite", "terrain"}:
        for row in terrain:
            x, y = _int(row.get("cell_x")), _int(row.get("cell_y"))
            if 0 <= x < width and 0 <= y < height:
                color = row.get("color") or DEFAULT_PALETTE["terrain"]
                pix[x, y] = _hex_rgb(color)

    if layer in {"composite", "effects"}:
        for row in effects:
            color = row.get("color") or DEFAULT_PALETTE["effect"]
            for x, y in effect_cells(row, width, height):
                pix[x, y] = _hex_rgb(color)

    if layer in {"composite", "occupancy"}:
        for token in tokens:
            validate_token_bounds(map_row, token)
            faction = (token.get("faction") or "unknown").strip().lower()
            color = token.get("color") or DEFAULT_PALETTE.get(faction, DEFAULT_PALETTE["unknown"])
            for cell in token_cells(token):
                occupancy.setdefault(cell, []).append(token["token_id"])
                pix[cell[0], cell[1]] = _hex_rgb(color)
        for cell, ids in occupancy.items():
            if len(ids) > 1:
                pix[cell[0], cell[1]] = _hex_rgb(DEFAULT_PALETTE["collision"])
                collisions[f"{cell[0]},{cell[1]}"] = ids

    raw_size = img.size
    if cell_pixels > 1:
        img = img.resize((width * cell_pixels, height * cell_pixels), Image.Resampling.NEAREST)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, format="PNG", optimize=False)

    legend_path = output.with_suffix(".legend.csv")
    legend_rows = []
    for token in tokens:
        faction = (token.get("faction") or "unknown").strip().lower()
        color = token.get("color") or DEFAULT_PALETTE.get(faction, DEFAULT_PALETTE["unknown"])
        legend_rows.append({
            "token_id": token.get("token_id", ""), "entity_id": token.get("entity_id", ""),
            "name": token.get("name", ""), "faction": token.get("faction", ""),
            "x": token.get("x", ""), "y": token.get("y", ""),
            "width_cells": token.get("width_cells", "1"), "height_cells": token.get("height_cells", "1"),
            "z_cells": token.get("z_cells", "0"), "color": color,
        })
    _atomic_write_csv(legend_path,
                      ["token_id","entity_id","name","faction","x","y","width_cells","height_cells","z_cells","color"],
                      legend_rows)

    return {
        "map_id": map_id,
        "layer": layer,
        "grid_size_cells": [width, height],
        "cell_pixels": cell_pixels,
        "raw_raster_size": list(raw_size),
        "output_size_pixels": list(img.size),
        "output": str(output),
        "legend": str(legend_path),
        "collisions": collisions,
    }


def cmd_init(args):
    root = Path(args.root)
    init_state(root)
    print(json.dumps({"root": str(root), "initialized": True}, indent=2))


def cmd_upsert_map(args):
    root = Path(args.root); init_state(root)
    row = {
        "map_id": args.map_id, "name": args.name or args.map_id, "encounter_id": args.encounter_id or "",
        "width_cells": args.width, "height_cells": args.height, "feet_per_cell": args.feet_per_cell,
        "distance_rule": args.distance_rule, "origin": "top-left;x-east;y-south", "notes": args.notes or "", "updated_at": "",
    }
    upsert_row(root / "battlefield_maps.csv", MAP_FIELDS, ["map_id"], row)
    print(json.dumps(row, indent=2))


def cmd_place(args):
    root = Path(args.root); init_state(root)
    map_row = load_map(root, args.map_id)
    row = {
        "map_id": args.map_id, "token_id": args.token_id, "entity_id": args.entity_id or args.token_id,
        "name": args.name or args.token_id, "faction": args.faction, "x": args.x, "y": args.y,
        "width_cells": args.width, "height_cells": args.height, "z_cells": args.z,
        "color": args.color or "", "status": args.status, "notes": args.notes or "", "updated_at": "",
    }
    validate_token_bounds(map_row, row)
    upsert_row(root / "battlefield_tokens.csv", TOKEN_FIELDS, ["map_id", "token_id"], row)
    print(json.dumps(row, indent=2))


def cmd_move(args):
    root = Path(args.root)
    map_row = load_map(root, args.map_id)
    token = find_token(root, args.map_id, args.token_id)
    old = {"x": _int(token["x"]), "y": _int(token["y"]), "z_cells": _int(token.get("z_cells"), 0)}
    if args.x is not None:
        token["x"] = str(args.x)
    else:
        token["x"] = str(old["x"] + args.dx)
    if args.y is not None:
        token["y"] = str(args.y)
    else:
        token["y"] = str(old["y"] + args.dy)
    if args.z is not None:
        token["z_cells"] = str(args.z)
    elif args.dz:
        token["z_cells"] = str(old["z_cells"] + args.dz)
    validate_token_bounds(map_row, token)
    upsert_row(root / "battlefield_tokens.csv", TOKEN_FIELDS, ["map_id", "token_id"], token)
    print(json.dumps({"token_id": args.token_id, "old": old, "new": {"x": _int(token["x"]), "y": _int(token["y"]), "z_cells": _int(token.get("z_cells"), 0)}}, indent=2))


def cmd_distance(args):
    root = Path(args.root)
    map_row = load_map(root, args.map_id)
    a = find_token(root, args.map_id, args.a)
    b = find_token(root, args.map_id, args.b)
    rule = args.rule or map_row.get("distance_rule") or "grid-chebyshev"
    cells = distance_cells(a, b, rule)
    feet = cells * _float(map_row.get("feet_per_cell"), 5.0)
    print(json.dumps({"map_id": args.map_id, "a": args.a, "b": args.b, "distance_rule": rule, "cells": cells, "feet": feet}, indent=2))


def cmd_within(args):
    root = Path(args.root)
    map_row = load_map(root, args.map_id)
    source = find_token(root, args.map_id, args.source)
    rule = args.rule or map_row.get("distance_rule") or "grid-chebyshev"
    feet_per_cell = _float(map_row.get("feet_per_cell"), 5.0)
    limit_cells = args.feet / feet_per_cell
    matches = []
    for token in _read_csv(root / "battlefield_tokens.csv"):
        if token.get("map_id") != args.map_id or token.get("token_id") == args.source:
            continue
        d = distance_cells(source, token, rule)
        if d <= limit_cells + 1e-9:
            matches.append({"token_id": token.get("token_id"), "name": token.get("name"), "cells": d, "feet": d * feet_per_cell})
    matches.sort(key=lambda x: (x["cells"], x["token_id"] or ""))
    print(json.dumps({"source": args.source, "within_feet": args.feet, "distance_rule": rule, "matches": matches}, indent=2))


def cmd_affected(args):
    root = Path(args.root)
    map_row = load_map(root, args.map_id)
    width, height = _int(map_row["width_cells"]), _int(map_row["height_cells"])
    effects = [r for r in _read_csv(root / "battlefield_effects.csv") if r.get("map_id") == args.map_id and r.get("effect_id") == args.effect_id]
    if not effects:
        raise ValueError(f"unknown effect_id {args.effect_id!r}")
    cells = set(effect_cells(effects[0], width, height))
    affected = []
    for token in _read_csv(root / "battlefield_tokens.csv"):
        if token.get("map_id") != args.map_id:
            continue
        overlap = sorted(cells.intersection(token_cells(token)))
        if overlap:
            affected.append({"token_id": token.get("token_id"), "name": token.get("name"), "overlap_cells": [[x,y] for x,y in overlap]})
    print(json.dumps({"map_id": args.map_id, "effect_id": args.effect_id, "affected": affected}, indent=2))


def cmd_render(args):
    result = render(Path(args.root), args.map_id, Path(args.output), args.cell_pixels, args.layer)
    print(json.dumps(result, indent=2))


def build_parser():
    p = argparse.ArgumentParser(description="Minimal CSV-backed 5-foot-grid battlespace engine")
    p.add_argument("--root", default="/mnt/data/ttrpg_state", help="State directory")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("init"); s.set_defaults(func=cmd_init)

    s = sub.add_parser("upsert-map")
    s.add_argument("--map-id", required=True); s.add_argument("--name")
    s.add_argument("--encounter-id"); s.add_argument("--width", required=True, type=int); s.add_argument("--height", required=True, type=int)
    s.add_argument("--feet-per-cell", default=5.0, type=float); s.add_argument("--distance-rule", default="grid-chebyshev", choices=["grid-chebyshev","manhattan","euclidean"]); s.add_argument("--notes")
    s.set_defaults(func=cmd_upsert_map)

    s = sub.add_parser("place")
    s.add_argument("--map-id", required=True); s.add_argument("--token-id", required=True); s.add_argument("--entity-id"); s.add_argument("--name")
    s.add_argument("--faction", default="unknown"); s.add_argument("--x", required=True, type=int); s.add_argument("--y", required=True, type=int)
    s.add_argument("--width", default=1, type=int); s.add_argument("--height", default=1, type=int); s.add_argument("--z", default=0, type=int)
    s.add_argument("--color"); s.add_argument("--status", default="active"); s.add_argument("--notes")
    s.set_defaults(func=cmd_place)

    s = sub.add_parser("move")
    s.add_argument("--map-id", required=True); s.add_argument("--token-id", required=True)
    s.add_argument("--x", type=int); s.add_argument("--y", type=int); s.add_argument("--z", type=int)
    s.add_argument("--dx", default=0, type=int); s.add_argument("--dy", default=0, type=int); s.add_argument("--dz", default=0, type=int)
    s.set_defaults(func=cmd_move)

    s = sub.add_parser("distance")
    s.add_argument("--map-id", required=True); s.add_argument("--a", required=True); s.add_argument("--b", required=True)
    s.add_argument("--rule", choices=["grid-chebyshev","manhattan","euclidean"]); s.set_defaults(func=cmd_distance)

    s = sub.add_parser("within")
    s.add_argument("--map-id", required=True); s.add_argument("--source", required=True); s.add_argument("--feet", required=True, type=float)
    s.add_argument("--rule", choices=["grid-chebyshev","manhattan","euclidean"]); s.set_defaults(func=cmd_within)

    s = sub.add_parser("affected")
    s.add_argument("--map-id", required=True); s.add_argument("--effect-id", required=True); s.set_defaults(func=cmd_affected)

    s = sub.add_parser("render")
    s.add_argument("--map-id", required=True); s.add_argument("--output", required=True)
    s.add_argument("--cell-pixels", default=1, type=int); s.add_argument("--layer", default="composite", choices=["composite","terrain","effects","occupancy"])
    s.set_defaults(func=cmd_render)
    return p


def main():
    args = build_parser().parse_args()
    try:
        args.func(args)
    except Exception as exc:
        raise SystemExit(f"ERROR: {exc}") from exc


if __name__ == "__main__":
    main()
