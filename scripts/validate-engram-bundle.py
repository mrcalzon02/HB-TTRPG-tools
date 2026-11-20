#!/usr/bin/env python3
"""Offline package and negative-test campaign for reciprocal engram bundles.

This test uses the real zipfile and SHA-256 implementations, no network,
and no external dependencies. Run from repository root.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "scripts" / "agent-skill-bundle.py"
spec = importlib.util.spec_from_file_location("engram_bundle", source)
assert spec is not None and spec.loader is not None
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def must_reject(label: str, action) -> None:
    try:
        action()
    except (ValueError, KeyError, TypeError):
        print(f"PASS [bundle] rejected {label}")
    else:
        raise AssertionError(f"FAIL [bundle] accepted {label}")


def remix(original: Path, destination: Path, *, updates=None, remove=(), add=None) -> None:
    updates = updates or {}
    add = add or {}
    with ZipFile(original) as current:
        stored = [(item, current.read(item.filename)) for item in current.infolist() if item.filename not in remove]
    with ZipFile(destination, "w", ZIP_DEFLATED) as target:
        for info, data in stored:
            target.writestr(info, updates.get(info.filename, data))
        for name, (data, mode) in add.items():
            extra = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            extra.compress_type = ZIP_DEFLATED
            extra.external_attr = mode << 16
            target.writestr(extra, data)


def main() -> None:
    index_raw = (ROOT / mod.INDEX).read_bytes()
    index = json.loads(index_raw)
    pin = index["defaultPersonality"]["integrity"]["digest"]
    index_pin = digest(index_raw)
    with TemporaryDirectory(prefix="hb-engram-check-") as td:
        tmp = Path(td)
        one = tmp / "one.zip"
        two = tmp / "two.zip"
        mod.package(["foundry-discovery"], one)
        mod.package(["foundry-discovery"], two)
        assert one.read_bytes() == two.read_bytes(), "Bundle not reproducible"
        print("PASS [bundle] byte-identical deterministic exports")
        must_reject("output overwrite", lambda: mod.package(["foundry-discovery"], one))
        assert mod.safe_skill_member("skills/environment-production/.gitattributes")
        assert mod.safe_skill_member("skills/environment-production/.gitignore")
        for bad in ("skills/foundry-discovery/.env", "skills/foundry-discovery/id_ed25519",
                    "skills/foundry-discovery/credentials.json", "skills/foundry-discovery/publisher.pem",
                    "skills/foundry-discovery/.ssh/key", "skills/foundry-discovery/.env.production"):
            assert not mod.safe_skill_member(bad), f"Secret file should not be packageable: {bad}"
        print("PASS [bundle] secret-file and signing-key exclusions")

        full = tmp / "all.zip"
        mod.package([entry["name"] for entry in index["skills"]], full)
        mod.verify(full, pin, trusted_registry_sha=index_pin, trusted_bundle_sha=digest(full.read_bytes()))
        print(f"PASS [bundle] complete {len(index['skills'])}-skill registry export and pinned verification")

        mod.verify(one, pin, trusted_registry_sha=index_pin, trusted_bundle_sha=digest(one.read_bytes()))
        print("PASS [bundle] selected skill with all independently pinned hashes")

        must_reject("wrong engram trust pin", lambda: mod.verify(one, "0" * 64))
        must_reject("wrong registry trust pin", lambda: mod.verify(one, pin, trusted_registry_sha="0" * 64))
        must_reject("wrong archive trust pin", lambda: mod.verify(one, pin, trusted_bundle_sha="0" * 64))
        must_reject("malformed trust pin", lambda: mod.verify(one, "invalid"))
        must_reject("missing engram", lambda: mod.verify(remix_check(one, tmp, "no-engram", remove={mod.ENGRAM}), pin))
        must_reject("missing registry", lambda: mod.verify(remix_check(one, tmp, "no-registry", remove={mod.INDEX}), pin))
        must_reject("corrupted skill", lambda: mod.verify(remix_check(one, tmp, "corrupt-skill",
            updates={"skills/foundry-discovery/SKILL.md": b"---\ninvalid: true\n---\n"}), pin))
        must_reject("corrupted engram", lambda: mod.verify(remix_check(one, tmp, "corrupt-engram",
            updates={mod.ENGRAM: (ROOT / mod.ENGRAM).read_bytes() + b"\n"}), pin))
        must_reject("unlisted archive member", lambda: mod.verify(remix_check(one, tmp, "unlisted",
            add={"unlisted.js": (b"attack", 0o100644)}), pin))
        must_reject("archive traversal path", lambda: mod.verify(remix_check(one, tmp, "traversal",
            add={"../escape.txt": (b"attack", 0o100644)}), pin))
        must_reject("archive symlink", lambda: mod.verify(remix_check(one, tmp, "symlink",
            add={"skills/foundry-discovery/link": (b"/etc/passwd", 0o120777)}), pin))
        must_reject("archive non-canonical path", lambda: mod.verify(remix_check(one, tmp, "noncanonical",
            add={"skills//rogue": (b"attack", 0o100644)}), pin))
        # Even a correctly re-hashed and inventoried secret must be rejected.
        with ZipFile(one) as original:
            locked = json.loads(original.read(mod.LOCK))
        secret = b"DO_NOT_INCLUDE_PRIVATE_MATERIAL"
        secret_path = "skills/foundry-discovery/.env"
        locked["files"][secret_path] = {"sha256": digest(secret), "bytes": len(secret)}
        forged_lock = (json.dumps(locked, indent=2, sort_keys=True) + "\n").encode()
        forged = remix_check(one, tmp, "inventoried-secret",
                             updates={mod.LOCK: forged_lock},
                             add={secret_path: (secret, 0o100644)})
        must_reject("inventoried secret in otherwise coherent bundle",
                    lambda: mod.verify(forged, pin))

        old = (ROOT / "skills/foundry-discovery/SKILL.md").read_bytes()
        record = next(record for record in index["skills"] if record["name"] == "foundry-discovery")
        must_reject("unbound standalone skill", lambda: mod.validate_skill(record,
            old.replace(b"required-personality-engram: blacklight.charles",
                        b"required-personality-engram: rogue")))
        mutated = json.loads(index_raw)
        mutated["defaultPersonality"]["required"] = False
        must_reject("registry drops required engram", lambda: mod.validate_pair(mutated, (ROOT / mod.ENGRAM).read_bytes()))

    print("PASS [bundle] all offline packaging, tamper and safety checks passed")


def remix_check(original: Path, tmp: Path, name: str, **kwargs) -> Path:
    result = tmp / f"{name}.zip"
    remix(original, result, **kwargs)
    return result


if __name__ == "__main__":
    main()
