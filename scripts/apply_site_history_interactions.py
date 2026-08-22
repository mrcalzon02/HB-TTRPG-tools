#!/usr/bin/env python3
"""One-shot transporter for the validated historical site-interaction sources.

This script exists only to move an already-validated compressed payload through the
repository connector.  It refuses unexpected concurrent edits to the authoritative
spatial files and is removed by the workflow that invokes it.
"""
from __future__ import annotations

import base64
import hashlib
import subprocess
import tarfile
from pathlib import Path

CHUNKS = [Path(f"scripts/.site-history-payload-{i:02d}") for i in range(4)]
B64_SHA256 = "11775b4b561de80d77bd14f8be7f4e9d33c4657768f1ad607cb758582d4b1956"
ARCHIVE_SHA256 = "30e5405b56434ec86a7ad56481b193c5a207373b05e67674e167328bacef6ed5"

BASELINE = {
    "module-map-generator.js": "573da717bb0cb31e07c68910ec98784cebd78614",
    "semantic-content-populator.js": "cc5018308b15131457acbf9cc9fd55269bb58a54",
    "SEMANTIC_SITE_PROFILE_LAYERS.md": "fd3dc9010b76b01e1764d9957518c3278fb5fb7f",
}
CANDIDATE = {
    "module-map-generator.js": "3c569374b8bfd3be4d640832e7d877a39eff85d5",
    "semantic-content-populator.js": "d21050da045fc1f7ccc9cda534e1c3786e43ef89",
    "SEMANTIC_SITE_PROFILE_LAYERS.md": "3752001f1888ea638b31d65b3871798b2aea3502",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(path: str) -> str:
    return subprocess.check_output(["git", "hash-object", path], text=True).strip()


def main() -> None:
    missing = [str(path) for path in CHUNKS if not path.is_file()]
    if missing:
        raise SystemExit(f"missing payload chunks: {', '.join(missing)}")

    encoded = b"".join(path.read_bytes() for path in CHUNKS)
    if sha256(encoded) != B64_SHA256:
        raise SystemExit("payload base64 checksum mismatch")

    archive_bytes = base64.b64decode(encoded, validate=True)
    if sha256(archive_bytes) != ARCHIVE_SHA256:
        raise SystemExit("payload archive checksum mismatch")

    for path, expected in BASELINE.items():
        actual = git_blob(path)
        if actual != expected:
            if actual == CANDIDATE[path]:
                continue
            raise SystemExit(
                f"refusing unexpected concurrent edit to {path}: {actual} != {expected}"
            )

    archive = Path("/tmp/site-history-payload.tar.xz")
    archive.write_bytes(archive_bytes)
    allowed_members = set(CANDIDATE)
    with tarfile.open(archive, "r:xz") as payload:
        members = payload.getmembers()
        names = {member.name for member in members}
        if names != allowed_members or any(not member.isfile() for member in members):
            raise SystemExit(f"unexpected payload members: {sorted(names)}")
        for member in members:
            target = Path(member.name)
            source = payload.extractfile(member)
            if source is None:
                raise SystemExit(f"unable to read payload member {member.name}")
            target.write_bytes(source.read())

    errors = []
    for path, expected in CANDIDATE.items():
        actual = git_blob(path)
        if actual != expected:
            errors.append(f"{path}: {actual} != {expected}")
    if errors:
        raise SystemExit("candidate verification failed:\n" + "\n".join(errors))

    print("site-history authoritative payload applied and verified")
    for path, blob in CANDIDATE.items():
        print(f"  {path}: {blob}")


if __name__ == "__main__":
    main()

# Push-trigger marker: workflow already exists on main.
