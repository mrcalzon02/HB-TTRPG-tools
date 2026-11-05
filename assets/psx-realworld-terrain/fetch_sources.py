#!/usr/bin/env python3
"""Download the canonical Drive source PNGs referenced by manifest.json.

Needs an authenticated Google OAuth access token with Drive file-read scope
provided in GOOGLE_DRIVE_ACCESS_TOKEN; refuses inaccessible or corrupt files.
Never treats presentation tiles as runtime-ready assets.
"""
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
TOKEN = os.environ.get("GOOGLE_DRIVE_ACCESS_TOKEN", "").strip()
if not TOKEN:
    sys.exit("GOOGLE_DRIVE_ACCESS_TOKEN is required to download these private Drive originals.")

output = HERE / "source_sheets"
output.mkdir(exist_ok=True)
errors = []
for asset in MANIFEST["assets"]:
    dest = output / asset["filename"]
    if dest.is_file() and hashlib.sha256(dest.read_bytes()).hexdigest() == asset["sha256"]:
        print(f"VERIFIED cached {dest.name}")
        continue
    ident = urllib.parse.quote(asset["drive_file_id"], safe="")
    url = f"https://www.googleapis.com/drive/v3/files/{ident}?alt=media"
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + TOKEN})
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            data = response.read()
        actual = hashlib.sha256(data).hexdigest()
        if actual != asset["sha256"]:
            raise ValueError(f"sha256 mismatch: expected {asset['sha256']}, got {actual}")
        temporary = dest.with_suffix(dest.suffix + ".partial")
        temporary.write_bytes(data)
        temporary.replace(dest)
        print(f"VERIFIED downloaded {dest.name} ({len(data)} bytes)")
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, ValueError) as exc:
        errors.append((asset["id"], str(exc)))
        print(f"ERROR {asset['id']}: {exc}", file=sys.stderr)
if errors:
    sys.exit(f"Download incomplete: {len(errors)} source(s) failed.")
print(f"SUCCESS: {len(MANIFEST['assets'])} original sheets downloaded and SHA-256 verified.")
