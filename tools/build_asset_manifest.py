#!/usr/bin/env python3
"""Convenience runner for the local asset manifest builder.

Run from the repository root:

    python tools/build_asset_manifest.py --root . --assets assets --out asset-manifest.json --markdown asset-manifest.md --js-out asset-manifest.js
"""

from __future__ import annotations

import sys
from pathlib import Path

PACKAGE_SRC = Path(__file__).resolve().parent / "asset_manifest_builder" / "src"
sys.path.insert(0, str(PACKAGE_SRC))

from asset_manifest_builder.cli import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
