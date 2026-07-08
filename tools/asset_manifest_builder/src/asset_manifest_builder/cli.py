from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .scanner import build_manifest, write_json_manifest, write_js_manifest, write_markdown_manifest


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="asset-manifest",
        description="Index local repo assets and write JSON, Markdown, and optional JavaScript manifests.",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Repo root to scan. Default: current directory.",
    )
    parser.add_argument(
        "--assets",
        action="append",
        default=None,
        help="Asset root to scan, relative to --root. Can be passed multiple times. Default: assets",
    )
    parser.add_argument(
        "--scan-all",
        action="store_true",
        help="Scan the whole repo instead of only the configured asset roots.",
    )
    parser.add_argument(
        "--out",
        default="asset-manifest.json",
        help="JSON manifest output path. Default: asset-manifest.json",
    )
    parser.add_argument(
        "--markdown",
        default=None,
        help="Optional Markdown inventory output path.",
    )
    parser.add_argument(
        "--js-out",
        default=None,
        help="Optional JavaScript manifest output path.",
    )
    parser.add_argument(
        "--js-global",
        default="REPO_ASSET_MANIFEST",
        help="Global name used by --js-out. Default: REPO_ASSET_MANIFEST",
    )
    parser.add_argument(
        "--include-hashes",
        action="store_true",
        help="Include SHA-256 hashes for each file. Slower, but useful for dedupe and verification.",
    )
    parser.add_argument(
        "--query",
        default=None,
        help="Only include paths containing all query tokens. Example: --query blacklight_homepage_promotional_images",
    )
    parser.add_argument(
        "--print-summary",
        action="store_true",
        help="Print a short summary after writing files.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root = Path(args.root).resolve()
    asset_roots = args.assets or ["assets"]

    manifest = build_manifest(
        root=root,
        asset_roots=asset_roots,
        include_hashes=args.include_hashes,
        scan_all=args.scan_all,
        query=args.query,
    )

    json_path = write_json_manifest(manifest, args.out)
    markdown_path = write_markdown_manifest(manifest, args.markdown) if args.markdown else None
    js_path = write_js_manifest(manifest, args.js_out, args.js_global) if args.js_out else None

    if args.print_summary:
        print(json.dumps(manifest["counts"], indent=2, ensure_ascii=False))

    print(f"Wrote JSON manifest: {json_path}")
    if markdown_path:
        print(f"Wrote Markdown manifest: {markdown_path}")
    if js_path:
        print(f"Wrote JavaScript manifest: {js_path}")
    if manifest.get("missing_targets"):
        print(f"Warning: missing scan targets: {', '.join(manifest['missing_targets'])}", file=sys.stderr)
    print(f"Indexed {manifest['counts']['files']} files; {manifest['counts']['images']} images.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
