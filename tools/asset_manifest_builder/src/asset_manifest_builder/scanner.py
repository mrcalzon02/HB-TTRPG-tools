from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import re
import struct
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"
}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".mid", ".midi"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"}
FONT_EXTENSIONS = {".woff", ".woff2", ".ttf", ".otf", ".eot"}
DOCUMENT_EXTENSIONS = {".pdf", ".txt", ".md", ".rtf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".json", ".xml", ".yaml", ".yml"}
ARCHIVE_EXTENSIONS = {".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz"}
CODE_EXTENSIONS = {".html", ".css", ".js", ".mjs", ".ts", ".py", ".sh", ".bat", ".ps1"}

IGNORED_DIR_NAMES = {
    ".git", ".hg", ".svn", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    ".venv", "venv", "env", "node_modules", "dist", "build", ".idea", ".vscode"
}

TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


@dataclass(frozen=True)
class ScanTarget:
    label: str
    path: Path


def posix(path: Path) -> str:
    return path.as_posix()


def repo_relative(path: Path, root: Path) -> str:
    return posix(path.resolve().relative_to(root.resolve()))


def classify_asset(extension: str) -> str:
    ext = extension.lower()
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    if ext in VIDEO_EXTENSIONS:
        return "video"
    if ext in FONT_EXTENSIONS:
        return "font"
    if ext in DOCUMENT_EXTENSIONS:
        return "document"
    if ext in ARCHIVE_EXTENSIONS:
        return "archive"
    if ext in CODE_EXTENSIONS:
        return "code"
    return "other"


def tokenise_path(path_text: str) -> list[str]:
    tokens = {match.group(0).lower() for match in TOKEN_RE.finditer(path_text)}
    return sorted(tokens)


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_dimensions(path: Path) -> dict[str, int] | None:
    ext = path.suffix.lower()
    try:
        if ext == ".png":
            return _png_dimensions(path)
        if ext in {".jpg", ".jpeg"}:
            return _jpeg_dimensions(path)
        if ext == ".gif":
            return _gif_dimensions(path)
        if ext == ".webp":
            return _webp_dimensions(path)
        if ext == ".svg":
            return _svg_dimensions(path)
    except (OSError, ValueError, struct.error, UnicodeDecodeError):
        return None
    return None


def _png_dimensions(path: Path) -> dict[str, int] | None:
    with path.open("rb") as handle:
        header = handle.read(24)
    if not header.startswith(b"\x89PNG\r\n\x1a\n") or header[12:16] != b"IHDR":
        return None
    width, height = struct.unpack(">II", header[16:24])
    return {"width": int(width), "height": int(height)}


def _gif_dimensions(path: Path) -> dict[str, int] | None:
    with path.open("rb") as handle:
        header = handle.read(10)
    if not (header.startswith(b"GIF87a") or header.startswith(b"GIF89a")):
        return None
    width, height = struct.unpack("<HH", header[6:10])
    return {"width": int(width), "height": int(height)}


def _jpeg_dimensions(path: Path) -> dict[str, int] | None:
    with path.open("rb") as handle:
        if handle.read(2) != b"\xff\xd8":
            return None
        while True:
            marker_start = handle.read(1)
            if not marker_start:
                return None
            if marker_start != b"\xff":
                continue
            marker = handle.read(1)
            while marker == b"\xff":
                marker = handle.read(1)
            if marker in {b"\xd8", b"\xd9"}:
                continue
            length_bytes = handle.read(2)
            if len(length_bytes) != 2:
                return None
            length = struct.unpack(">H", length_bytes)[0]
            if length < 2:
                return None
            if marker and marker[0] in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                data = handle.read(length - 2)
                if len(data) < 5:
                    return None
                height, width = struct.unpack(">HH", data[1:5])
                return {"width": int(width), "height": int(height)}
            handle.seek(length - 2, os.SEEK_CUR)


def _webp_dimensions(path: Path) -> dict[str, int] | None:
    data = path.read_bytes()[:64]
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return {"width": width, "height": height}
    if chunk == b"VP8L" and len(data) >= 25:
        b0, b1, b2, b3 = data[21], data[22], data[23], data[24]
        width = 1 + (((b1 & 0x3F) << 8) | b0)
        height = 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
        return {"width": width, "height": height}
    if chunk == b"VP8 " and len(data) >= 30:
        width = struct.unpack("<H", data[26:28])[0] & 0x3FFF
        height = struct.unpack("<H", data[28:30])[0] & 0x3FFF
        return {"width": int(width), "height": int(height)}
    return None


def _svg_dimensions(path: Path) -> dict[str, int] | None:
    text = path.read_text(encoding="utf-8", errors="ignore")[:2048]
    width_match = re.search(r'\bwidth=["\']([0-9.]+)', text)
    height_match = re.search(r'\bheight=["\']([0-9.]+)', text)
    if width_match and height_match:
        return {"width": int(float(width_match.group(1))), "height": int(float(height_match.group(1)))}
    viewbox_match = re.search(r'\bviewBox=["\']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)', text)
    if viewbox_match:
        return {"width": int(float(viewbox_match.group(1))), "height": int(float(viewbox_match.group(2)))}
    return None


def iter_files(targets: Iterable[ScanTarget]) -> Iterable[Path]:
    seen: set[Path] = set()
    for target in targets:
        if not target.path.exists():
            continue
        if target.path.is_file():
            resolved = target.path.resolve()
            if resolved not in seen:
                seen.add(resolved)
                yield target.path
            continue
        for current_root, dir_names, file_names in os.walk(target.path):
            dir_names[:] = [name for name in dir_names if name not in IGNORED_DIR_NAMES]
            current = Path(current_root)
            for file_name in file_names:
                path = current / file_name
                resolved = path.resolve()
                if resolved in seen:
                    continue
                seen.add(resolved)
                yield path


def resolve_targets(root: Path, asset_roots: list[str], scan_all: bool) -> list[ScanTarget]:
    if scan_all:
        return [ScanTarget("repo", root)]
    targets: list[ScanTarget] = []
    for raw in asset_roots:
        path = (root / raw).resolve()
        targets.append(ScanTarget(raw, path))
    return targets


def build_manifest(
    root: str | Path = ".",
    asset_roots: list[str] | None = None,
    *,
    include_hashes: bool = False,
    scan_all: bool = False,
    query: str | None = None,
) -> dict[str, Any]:
    repo_root = Path(root).resolve()
    roots = asset_roots or ["assets"]
    targets = resolve_targets(repo_root, roots, scan_all)
    query_tokens = tokenise_path(query or "")

    files: list[dict[str, Any]] = []
    missing_targets = [target.label for target in targets if not target.path.exists()]

    for path in iter_files(targets):
        if not path.is_file():
            continue
        try:
            repo_path = repo_relative(path, repo_root)
        except ValueError:
            continue
        searchable_text = repo_path.lower()
        if query_tokens and not all(token in searchable_text for token in query_tokens):
            continue

        stat = path.stat()
        extension = path.suffix.lower()
        kind = classify_asset(extension)
        folder = posix(Path(repo_path).parent)
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        entry: dict[str, Any] = {
            "repo_path": repo_path,
            "public_path": repo_path,
            "folder": folder,
            "name": path.name,
            "stem": path.stem,
            "extension": extension,
            "kind": kind,
            "mime_type": mime_type,
            "size_bytes": stat.st_size,
            "modified_time": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            "tokens": tokenise_path(repo_path),
        }
        dimensions = image_dimensions(path) if kind == "image" else None
        if dimensions:
            entry["dimensions"] = dimensions
        if include_hashes:
            entry["sha256"] = sha256_file(path)
        files.append(entry)

    files.sort(key=lambda item: item["repo_path"])

    by_kind = Counter(item["kind"] for item in files)
    by_extension = Counter(item["extension"] or "[no extension]" for item in files)
    by_folder = Counter(item["folder"] for item in files)
    image_files = [item for item in files if item["kind"] == "image"]

    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "root": posix(repo_root),
        "asset_roots": [target.label for target in targets],
        "missing_targets": missing_targets,
        "scan_all": scan_all,
        "query": query or "",
        "counts": {
            "files": len(files),
            "images": len(image_files),
            "by_kind": dict(sorted(by_kind.items())),
            "by_extension": dict(sorted(by_extension.items())),
            "by_folder": dict(sorted(by_folder.items())),
        },
        "files": files,
    }


def write_json_manifest(manifest: dict[str, Any], output_path: str | Path) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def write_js_manifest(manifest: dict[str, Any], output_path: str | Path, global_name: str = "REPO_ASSET_MANIFEST") -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(manifest, indent=2, ensure_ascii=False)
    path.write_text(f"window.{global_name} = {payload};\n", encoding="utf-8")
    return path


def write_markdown_manifest(manifest: dict[str, Any], output_path: str | Path) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    files = manifest["files"]
    by_folder: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in files:
        by_folder[item["folder"]].append(item)

    lines: list[str] = []
    lines.append("# Asset Manifest")
    lines.append("")
    lines.append(f"Generated: `{manifest['generated_at']}`")
    lines.append(f"Root: `{manifest['root']}`")
    lines.append(f"Asset roots: `{', '.join(manifest['asset_roots'])}`")
    if manifest.get("missing_targets"):
        lines.append(f"Missing targets: `{', '.join(manifest['missing_targets'])}`")
    if manifest.get("query"):
        lines.append(f"Query filter: `{manifest['query']}`")
    lines.append("")
    lines.append("## Counts")
    lines.append("")
    lines.append(f"Total files: **{manifest['counts']['files']}**")
    lines.append(f"Image files: **{manifest['counts']['images']}**")
    lines.append("")
    lines.append("### By kind")
    lines.append("")
    lines.append("| Kind | Count |")
    lines.append("|---|---:|")
    for kind, count in manifest["counts"]["by_kind"].items():
        lines.append(f"| {kind} | {count} |")
    lines.append("")
    lines.append("### By extension")
    lines.append("")
    lines.append("| Extension | Count |")
    lines.append("|---|---:|")
    for extension, count in manifest["counts"]["by_extension"].items():
        lines.append(f"| `{extension}` | {count} |")
    lines.append("")
    lines.append("## Folders")
    lines.append("")
    lines.append("| Folder | Count |")
    lines.append("|---|---:|")
    for folder, count in manifest["counts"]["by_folder"].items():
        lines.append(f"| `{folder}` | {count} |")
    lines.append("")
    lines.append("## Asset inventory")
    lines.append("")
    for folder in sorted(by_folder):
        lines.append(f"### `{folder}`")
        lines.append("")
        lines.append("| Kind | File | Size | Dimensions | Public path |")
        lines.append("|---|---|---:|---|---|")
        for item in sorted(by_folder[folder], key=lambda value: value["name"]):
            dimensions = item.get("dimensions")
            dimensions_text = ""
            if dimensions:
                dimensions_text = f"{dimensions['width']}×{dimensions['height']}"
            lines.append(
                f"| {item['kind']} | `{item['name']}` | {item['size_bytes']} | {dimensions_text} | `{item['public_path']}` |"
            )
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path
