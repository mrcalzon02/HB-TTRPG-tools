"""Private audit of official Factorio 3D-print reference STL files.

Standard-library only; does NOT redistribute, download, convert, or upload
copyrighted Wube model files. Produces a local JSON inventory with original
file hash, source filename and native STL-unit bounds for later calibration.

Do not mistake STL print units for Factorio gameplay tiles or assume
printable meshes equal the original game-engine production source geometry.
"""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path

_MAX_FACES = 10_000_000
_FLOAT = struct.Struct("<12fH")
_VERTEX_RE = re.compile(
    r"^\s*vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s*$",
    re.IGNORECASE | re.MULTILINE,
)

def inspect_stl(path):
    """Return native STL bounds; no Blender or external dependency needed."""
    path = Path(path)
    size = path.stat().st_size
    low = [float("inf")] * 3
    high = [float("-inf")] * 3
    count = 0
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        header = fh.read(84)
        if len(header) < 84:
            raise ValueError("STL too short: " + path.name)
        claimed = struct.unpack_from("<I", header, 80)[0]
        # Compare exact size: an ASCII STL may start with "solid"; do not
        # infer format from the first few bytes, which can be deceptive.
        binary = 0 < claimed <= _MAX_FACES and size == 84 + claimed * 50
        fh.seek(0)
        if binary:
            for chunk in iter(lambda: fh.read(1024 * 1024), b""):
                digest.update(chunk)
            fh.seek(84)
            for _ in range(claimed):
                record = fh.read(50)
                if len(record) != 50:
                    raise ValueError("Truncated binary STL")
                vals = _FLOAT.unpack(record)
                for offset in (3, 6, 9):
                    for axis in range(3):
                        val = float(vals[offset+axis])
                        if not -1.e12 < val < 1.e12:
                            raise ValueError("STL has invalid or nonfinite vertex")
                        low[axis] = min(low[axis], val)
                        high[axis] = max(high[axis], val)
            count = claimed
        else:
            # ASCII STL: read as text; treat three 'vertex' lines per face
            # with no attempt to heal malformed printer geometry.
            raw = fh.read()
            digest.update(raw)
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ValueError("STL neither exact binary nor valid ASCII") from exc
            if "facet" not in text.lower():
                raise ValueError("STL contains no facets")
            for m in _VERTEX_RE.finditer(text):
                for axis in range(3):
                    val = float(m.group(axis+1))
                    if not -1.e12 < val < 1.e12:
                        raise ValueError("STL has invalid or nonfinite vertex")
                    low[axis] = min(low[axis], val)
                    high[axis] = max(high[axis], val)
                count += 1
            if count == 0 or count % 3:
                raise ValueError("ASCII STL must have three vertices per triangle")
            count //= 3
            if count > _MAX_FACES:
                raise ValueError("Too many triangles for audit")
    if count == 0:
        raise ValueError("No STL triangles")
    extent = [high[i] - low[i] for i in range(3)]
    max_extent = max(extent)
    return {
        "file": path.name,
        "sha256": digest.hexdigest(),
        "format": "binary" if binary else "ascii",
        "triangle_count": count,
        "byte_count": size,
        "bounds_native_stl_units": {"min": low, "max": high},
        "dimensions_native_stl_units": extent,
        "aspect_ratios_vs_longest_axis": [
            round(d / max_extent, 6) if max_extent else 0.0 for d in extent
        ],
        "note": "STL coordinates are NOT Factorio tiles; verify physical print scale/axis first",
    }

def run(root, out, includes=()):
    root = Path(root).resolve()
    out = Path(out).resolve()
    if not root.is_dir():
        raise ValueError("Provide a private directory of downloaded STL models")
    files = sorted(p for p in root.rglob("*") if p.is_file() and
                   p.suffix.lower() == ".stl" and
                   (not includes or p.name in includes))
    if not files:
        raise ValueError("No authentic downloaded STL references found")
    items = []
    for path in files:
        item = inspect_stl(path)
        item["relative_source_path"] = str(path.relative_to(root))
        items.append(item)
    result = {
        "source": "User-provided, privately downloaded official Wube Printables STL files",
        "license_warning": "Model files may be CC BY-NC; do not commit or redistribute",
        "source_collection_url": "https://www.printables.com/@WubeSoftware/models",
        "asset_bytes_in_result": False,
        "item_count": len(items),
        "models": items,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--stl-dir", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--include", action="append", default=[])
    args = p.parse_args()
    data = run(args.stl_dir, args.out, args.include)
    print("OFFICIAL_STL_PRIVATE_GEOMETRY_AUDIT", data["item_count"], "files", flush=True)
