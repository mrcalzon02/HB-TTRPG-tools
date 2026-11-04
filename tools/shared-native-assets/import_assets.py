#!/usr/bin/env python3
"""Selectively stage immutable native-game assets from a local ReverieVR checkout.

No network, runtime fetching, symlinks, destructive overwrite or external library.
Imports only the nine IDs explicitly listed in the pinned HB catalog.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile

MANIFEST = Path(__file__).resolve().parents[2] / "data/shared-native-assets/reverievr-v1.json"

def git_blob_hash(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + bytes([0]) + data).hexdigest()


def safe_under(root: Path, relative: str) -> Path:
    rel = Path(relative)
    if not relative or rel.is_absolute() or ".." in rel.parts or chr(92) in relative:
        raise ValueError("nonportable or unsafe asset path")
    root = root.resolve()
    output = (root / rel).resolve()
    if not output.is_relative_to(root):
        raise ValueError("asset escapes its authorized root")
    return output


def check_source(source_root: Path, entry: dict) -> bytes:
    source = safe_under(source_root, entry["source_path"])
    raw = source.read_bytes()
    if len(raw) != entry["size_bytes"] or git_blob_hash(raw) != entry["git_blob_sha1"]:
        raise ValueError(f"content changed or corrupted: {entry['id']}")
    if entry.get("sha256") and hashlib.sha256(raw).hexdigest() != entry["sha256"]:
        raise ValueError(f"SHA-256 mismatch: {entry['id']}")
    return raw


def prepare(ids: list[str], source_root: Path, dest_root: Path,
            allow_restricted: bool) -> list[tuple[str, Path, bytes, str]]:
    catalog = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if catalog["schema"] != "hb.internal-native-assets/1":
        raise ValueError("unsupported manifest schema")
    by_id = {entry["id"]: entry for entry in catalog["assets"]}
    if len(by_id) != len(catalog["assets"]):
        raise ValueError("duplicate manifest ID")
    result = []
    for asset_id in dict.fromkeys(ids):
        entry = by_id.get(asset_id)
        if entry is None:
            raise ValueError("unknown shared asset: " + asset_id)
        if entry["license_gate"] == "owner_confirmation_required" and not allow_restricted:
            raise ValueError("owner authorization required for: " + asset_id +
                             " (rerun with --allow-restricted after rights review)")
        runtime = entry["runtime_path"]
        if not runtime.startswith("native/shared/v1/"):
            raise ValueError("non-shared destination")
        raw = check_source(source_root, entry)
        target = safe_under(dest_root, runtime)
        # Never clobber an unrelated/corrupted/revised local asset.
        status = "already present" if target.exists() and target.read_bytes() == raw else (
            "new" if not target.exists() else "CONFLICT")
        if status == "CONFLICT":
            raise ValueError("destination differs: " + str(target))
        result.append((asset_id, target, raw, status))
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source-root", type=Path, required=True,
                    help="existing local checkout of pinned source repository")
    ap.add_argument("--dest-assets", type=Path, required=True,
                    help="target game's assets root (for example app/src/main/assets)")
    ap.add_argument("--id", dest="ids", required=True, action="append",
                    help="manifest asset ID; repeat to select multiple")
    ap.add_argument("--allow-restricted", action="store_true",
                    help="explicit rights review for owner-authorized third-party model conversions")
    ap.add_argument("--apply", action="store_true",
                    help="otherwise only validate and print intended imports")
    args = ap.parse_args()
    try:
        steps = prepare(args.ids, args.source_root, args.dest_assets,
                        args.allow_restricted)
        for name, target, raw, status in steps:
            print(f"{name}: {status}, {len(raw)} bytes, {target}")
        if not args.apply:
            print("DRY RUN: no files written (add --apply to stage approved imports)")
            return 0
        for name, target, raw, status in steps:
            if status != "new":
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            fd, tmp = tempfile.mkstemp(prefix=".shared-asset-", dir=target.parent)
            try:
                with os.fdopen(fd, "wb") as stream:
                    stream.write(raw)
                    stream.flush()
                    os.fsync(stream.fileno())
                # Refuse to overwrite newly appeared target when possible.
                if target.exists():
                    raise FileExistsError(str(target))
                os.replace(tmp, target)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)
            print(f"staged: {name}")
        return 0
    except (OSError, ValueError) as exc:
        ap.exit(2, f"Shared native asset import refused: {exc}" + chr(10))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
