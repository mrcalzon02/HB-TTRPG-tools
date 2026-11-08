#!/usr/bin/env python3
"""Build only the reviewed blank Work Shift Guide distributable (stdlib only)."""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile


VERSION = "1.0.0"
APP_DIR = Path(__file__).resolve().parents[1] / "software" / "work-shift-guide"
STANDALONE = "Work-Shift-Guide-Blank.html"
ARCHIVE = f"Work-Shift-Guide-Blank-v{VERSION}.zip"
ZIP_DATE = (2026, 11, 8, 0, 0, 0)
SOURCES = (
    "index.html",
    "styles.css",
    "app.js",
    "position.js",
    "manifest.webmanifest",
    "service-worker.js",
    "position-template.json",
    "icons/icon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "README.md",
    "LICENSE.txt",
)
EMPTY_POSITION = {
    "format": "work-shift-guide.position",
    "schemaVersion": 1,
    "position": {
        "jobTitle": "",
        "department": "",
        "guideName": "",
        "site": "",
        "timeZone": "",
        "siteRequirements": "",
        "shelterPlan": "",
    },
    "route": [],
    "references": [],
    "knowledgeCheck": [],
    "intakeNotes": "",
}


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    replaced, count = re.subn(pattern, lambda _match: replacement, text, flags=re.I)
    if count != 1:
        raise ValueError(f"Expected one {label}; found {count}.")
    return replaced


def inline_download(html: str, filename: str, payload: bytes, mime: str) -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    pattern = rf'<a\b([^>]*?)\bhref=([\"\'])(?:\./)?{re.escape(filename)}\2([^>]*)>'

    def replace(match: re.Match[str]) -> str:
        before, after = match.group(1), match.group(3)
        download = "" if re.search(r"\bdownload(?:\s|=|$)", before + after) else f' download="{filename}"'
        return f'<a {before}href="data:{mime};base64,{encoded}"{after}{download}>'

    return re.sub(pattern, replace, html, flags=re.I)


def standalone(files: dict[str, bytes]) -> bytes:
    html = files["index.html"].decode("utf-8")
    if re.search(r"<!--\s*POSITION_[A-Z_]+\s*-->", html):
        raise ValueError("Position UI placeholders are unresolved; finish the app before packaging.")
    html = replace_once(
        html, r'<link\s+rel="stylesheet"\s+href="styles\.css"\s*/?>',
        "<style>\n" + files["styles.css"].decode("utf-8") + "\n</style>", "stylesheet link",
    )
    html = replace_once(html, r'<link\s+rel="manifest"\s+href="manifest\.webmanifest"\s*/?>', "", "manifest link")
    icon = base64.b64encode(files["icons/icon.svg"]).decode("ascii")
    html = replace_once(
        html, r'<link\s+rel="icon"\s+href="icons/icon\.svg"\s+type="image/svg\+xml"\s*/?>',
        f'<link rel="icon" href="data:image/svg+xml;base64,{icon}" type="image/svg+xml">', "icon link",
    )
    scripts = ["<script>window.WORK_SHIFT_GUIDE_STANDALONE = true;</script>"]
    for filename in ("app.js", "position.js"):
        html = replace_once(
            html, rf'<script\s+defer\s+src="{re.escape(filename)}"\s*>\s*</script>',
            "", f"{filename} script",
        )
        source = re.sub(r"</script", r"<\\/script", files[filename].decode("utf-8"), flags=re.I)
        scripts.append(f"<script>\n{source}\n</script>")
    html = replace_once(html, r"</body>", "\n".join(scripts) + "\n</body>", "body end")
    html = html.replace(
        'href="../../software.html#work-shift-guide"',
        'href="https://mrcalzon02.github.io/HB-TTRPG-tools/software.html#work-shift-guide"',
    )
    html = inline_download(html, "position-template.json", files["position-template.json"], "application/json")
    html = inline_download(html, "LICENSE.txt", files["LICENSE.txt"], "text/plain;charset=utf-8")
    return html.encode("utf-8")


def build_outputs() -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    for name in SOURCES:
        path = APP_DIR / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Package input must be a regular reviewed file: {name}")
        files[name] = path.read_bytes()
    if json.loads(files["position-template.json"]) != EMPTY_POSITION:
        raise ValueError("The distributed position template must remain completely blank.")
    if not re.search(rb"const\s+DEFAULT_ROUTE\s*=\s*\[\s*\]\s*;", files["app.js"]):
        raise ValueError("The distributed app must have an empty DEFAULT_ROUTE.")

    fingerprint = hashlib.sha256()
    for name in sorted(name for name in files if name != "service-worker.js"):
        fingerprint.update(name.encode("utf-8") + b"\0" + files[name] + b"\0")
    worker = replace_once(
        files["service-worker.js"].decode("utf-8"),
        r'const CACHE_VERSION = "[^"\r\n]*";',
        f'const CACHE_VERSION = "{VERSION}-{fingerprint.hexdigest()[:16]}";',
        "service-worker cache version",
    ).encode("utf-8")
    files["service-worker.js"] = worker
    files[STANDALONE] = standalone(files)
    checksums = "".join(
        f"{hashlib.sha256(files[name]).hexdigest()}  {name}\n" for name in sorted(files)
    ).encode("utf-8")
    files["SHA256SUMS.txt"] = checksums

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(files):
            entry = zipfile.ZipInfo(f"work-shift-guide/{name}", date_time=ZIP_DATE)
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, files[name], compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    zipped = buffer.getvalue()
    return {
        "service-worker.js": worker,
        STANDALONE: files[STANDALONE],
        "SHA256SUMS.txt": checksums,
        ARCHIVE: zipped,
        f"{ARCHIVE}.sha256": f"{hashlib.sha256(zipped).hexdigest()}  {ARCHIVE}\n".encode("ascii"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check generated files without writing them.")
    args = parser.parse_args()
    try:
        outputs = build_outputs()
        if args.check:
            mismatches = [
                name for name, content in outputs.items()
                if not (APP_DIR / name).is_file() or (APP_DIR / name).read_bytes() != content
            ]
            if mismatches:
                raise ValueError("Generated files are missing or stale: " + ", ".join(mismatches))
            print(f"Verified {len(outputs)} deterministic outputs for Work Shift Guide {VERSION}.")
        else:
            for name, content in outputs.items():
                path = APP_DIR / name
                if not path.is_file() or path.read_bytes() != content:
                    path.write_bytes(content)
                print(f"{path.relative_to(APP_DIR.parent.parent)} ({len(content):,} bytes)")
        print(f"ZIP SHA-256: {hashlib.sha256(outputs[ARCHIVE]).hexdigest()}")
        return 0
    except (OSError, ValueError, UnicodeError) as error:
        print(f"Work Shift Guide package failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
