"""Reconcile the strict Java allowlist with the delivered equipment manifest.

Default: verify assignments and every referenced GLB's SHA-256. --write refreshes
only the two explicit Java tables, then performs the same verification.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    game = Path(__file__).resolve().parents[2]
    manifest = json.loads((game / "development/assets/equipment-catalog/equipment-assets.json").read_text(encoding="utf-8"))
    target = game / "src/main/java/org/beckenburg/EquipmentModelCatalog.java"
    text = target.read_text(encoding="utf-8")
    stages, variants, files = [], [], {}
    tiers = {1: "I", 2: "II", 3: "III"}
    for item in manifest["items"]:
        equipment = item["id"]
        assert re.fullmatch(r"[A-Z_]+", equipment), equipment
        for stage in item["stages"]:
            tier = tiers[stage["tier"]]
            name = Path(stage["model"]).stem
            assert re.fullmatch(r"[a-z0-9_]+", name), name
            original = str(stage.get("existing_unchanged", False)).lower()
            stages.append(f'        new Stage("{equipment}", EquipmentTiers.Tier.{tier}, "{name}", {original})')
            files[stage["model"]] = stage["sha256"]
            for state, variant in stage.get("variants", {}).items():
                assert re.fullmatch(r"[a-z_]+", state), state
                model = Path(variant["model"]).stem
                variants.append(f'        new Variant("{equipment}", EquipmentTiers.Tier.{tier}, "{state}", "{model}")')
                files[variant["model"]] = variant["sha256"]
    updated = text
    for kind, rows in (("Stage", stages), ("Variant", variants)):
        name = "SOURCE_STAGES" if kind == "Stage" else "SOURCE_VARIANTS"
        pattern = rf"(private static final {kind}\[\] {name} = \{{).*?(\n    \}};)"
        updated, count = re.subn(pattern, lambda match: match[1] + "\n" + ",\n".join(rows) + match[2], updated, count=1, flags=re.S)
        assert count == 1, f"Explicit {kind} table not found"
    if args.write:
        target.write_text(updated, encoding="utf-8", newline="\n")
    elif updated != text:
        raise SystemExit("FAIL: Java equipment assignments differ from equipment-assets.json; run this script with --write")
    for relative, digest in files.items():
        path = game / relative
        assert path.is_file(), f"Referenced runtime model missing: {relative}"
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest, f"Delivered model changed: {relative}"
    print(f"PASS equipment manifest: {len(stages)} stage aliases, {len(variants)} state aliases, {len(files)} existing hash-matched GLBs")


if __name__ == "__main__":
    main()
