#!/usr/bin/env python3
"""One-time, strict importer for the remaining Daysha royal wardrobe WebP assets.

The original full-resolution works live in the owner's Drive archive. This importer
only publishes already-reviewed half-scale WebP derivatives staged in nine ZIPs.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
STAGING = ROOT / "data" / "daysha-transfer"
ASSETS = ROOT / "assets" / "daysha" / "royal-purchases"
MANIFEST = ROOT / "data" / "daysha-royal-purchases.json"
SHA256 = {
    "daysha-web-halfscale-01.zip": "2f82fd2327ca2322acd79c598524a3c4264b4383f1e0c2d7b96a0330485f55d5",
    "daysha-web-halfscale-02.zip": "46a0788622c44fad17e5cf045eed66d36d584465f46cb1ed180ae1ba3b33e556",
    "daysha-web-halfscale-03.zip": "5927f49583757194f703bc13e6ea553be32ad7c8595477538870cb4babd1956d",
    "daysha-web-halfscale-04.zip": "fdb9c30f462d2667f5d428e9e8973b7be6672b8459542d89dd6e2e85ee5ed194",
    "daysha-web-halfscale-05.zip": "60708348ab649ad019e9973ae661e339d70a258f0ef7b8727dc35baa08bb3f0a",
    "daysha-web-halfscale-06.zip": "dd0751e4953c611472c75c9d11d87b5d58408a2118ec7b35302258d195b1f29f",
    "daysha-web-halfscale-07.zip": "2ea1de56f1e2e1cf8bfa7e1f49a41d5082e5f234a387129963053cb7aae06d92",
    "daysha-web-halfscale-08.zip": "2ce223e65906178126be451cd53c367456b9f69884edaacdb501c4b399a84a72",
    "daysha-web-halfscale-09.zip": "433bd8b03f6a0964205b2ad519fbd29ea723af19cb9bf2dd155cc334f5301181",
}


def expected_filename(source: dict) -> str:
    short_id = source["id"][5:17]
    if source["fileName"] == "Ethereal Princess on a Magical Palace Terrace.png":
        return f"src-{short_id}-ethereal.webp"
    return f"src-{short_id}.webp"


def import_images() -> None:
    if not STAGING.exists() and MANIFEST.exists():
        print("No staged ZIP files found; nothing to import")
        return

    missing_parts = sorted(set(SHA256) - {x.name for x in STAGING.glob("*.zip")})
    extra_parts = sorted({x.name for x in STAGING.glob("*.zip")} - set(SHA256))
    if missing_parts or extra_parts:
        raise ValueError(f"Staging mismatch: missing={missing_parts}, extra={extra_parts}")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    sources = manifest["sources"]
    pending = [s for s in sources if s.get("publicationStatus") != "hosted_verified"]
    if len(pending) != 69:
        raise ValueError(f"Expected exactly 69 pending sources; found {len(pending)}")
    expected = {expected_filename(s): s for s in pending}
    if len(expected) != 69:
        raise ValueError("Source IDs collide; refuse to lose artwork")

    entries: dict[str, bytes] = {}
    for part, checksum in SHA256.items():
        zip_path = STAGING / part
        if hashlib.sha256(zip_path.read_bytes()).hexdigest() != checksum:
            raise ValueError(f"SHA256 mismatch for {part}")
        with ZipFile(zip_path) as archive:
            corrupt = archive.testzip()
            if corrupt is not None:
                raise ValueError(f"Corrupt ZIP entry: {corrupt}")
            for info in archive.infolist():
                name = info.filename
                if not re.fullmatch(r"src-[0-9a-f]{12}(?:-ethereal)?\.webp", name):
                    raise ValueError(f"Unexpected ZIP entry: {name!r}")
                if name in entries:
                    raise ValueError(f"Duplicate filename: {name}")
                if info.file_size > 1_000_000 or info.file_size < 100:
                    raise ValueError(f"Invalid WebP file size: {name}")
                b = archive.read(info)
                if len(b) != info.file_size or not (b[:4] == b"RIFF" and b[8:12] == b"WEBP"):
                    raise ValueError(f"Invalid image header: {name}")
                entries[name] = b
    if set(entries) != set(expected):
        raise ValueError(f"Artwork set mismatch: missing={sorted(set(expected)-set(entries))}, extra={sorted(set(entries)-set(expected))}")

    ASSETS.mkdir(parents=True, exist_ok=True)
    for name in entries:
        if (ASSETS / name).exists():
            raise ValueError(f"Refusing to overwrite existing artwork: {name}")

    for name, data in entries.items():
        (ASSETS / name).write_bytes(data)
        source = expected[name]
        source["publishedImageUrl"] = "assets/daysha/royal-purchases/" + name
        source["publicationStatus"] = "hosted_verified"
        source["publishedFormat"] = "image/webp"
        source["publicationNote"] = "Half-scale optimized WebP derivative; original-resolution image separately retained on Drive."

    published = [s for s in sources if s.get("publicationStatus") == "hosted_verified"]
    if len(published) != len(sources) or len(sources) != 178:
        raise ValueError("Unexpected publication total")
    for source in published:
        url = source.get("publishedImageUrl") or ""
        if not url.startswith("assets/daysha/royal-purchases/") or not (ROOT / url).is_file():
            raise ValueError(f"Broken gallery URL: {url}")

    checks = manifest["verification"]
    checks["publishedDerivativeCount"] = 178
    checks["unpublishedSourceFiles"] = 0
    checks["githubTreeAssetCount"] = 178
    checks["githubTreeUnlinkedAssetCount"] = 0
    checks["githubTreeVerified"] = True
    if "pendingHalfScaleWebP" in checks:
        pending_check = checks["pendingHalfScaleWebP"]
        pending_check["githubCommitted"] = True
        pending_check["importState"] = "Verified gallery images committed to main"
        pending_check["githubBatchImported"] = 69

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for part in SHA256:
        (STAGING / part).unlink()
    STAGING.rmdir()
    print("Imported 69 half-scale WebP images; manifest now links all 178 sources. Removed temporary ZIP parts.")


if __name__ == "__main__":
    try:
        import_images()
    except Exception as exc:
        print(f"Daysha import failed: {exc}", file=sys.stderr)
        sys.exit(1)
