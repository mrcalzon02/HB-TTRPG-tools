#!/usr/bin/env python3
"""Extract a Kaysender PDF outline into a wiki ingestion manifest.

Usage:
    python scripts/extract-kaysender-outline.py "Kaysender_ 5th edition D&D campaign Info.pdf" > source-outline.json

The generated outline is intended to help track source-to-wiki coverage. It should not be treated as the wiki itself; it is an ingestion map showing which sections still need hard-reference entries or source chunks.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as exc:  # pragma: no cover - helper script only
    raise SystemExit("Install pypdf first: python -m pip install pypdf") from exc


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled"


def walk_outline(reader: PdfReader, items, depth: int = 0, out: list[dict] | None = None) -> list[dict]:
    if out is None:
        out = []
    for item in items:
        if isinstance(item, list):
            walk_outline(reader, item, depth + 1, out)
            continue
        title = str(getattr(item, "title", "") or item.get("/Title", "")).strip()
        if not title:
            continue
        try:
            page = reader.get_destination_page_number(item) + 1
        except Exception:
            page = None
        out.append(
            {
                "title": title,
                "entryIdCandidate": slugify(title),
                "page": page,
                "depth": depth,
                "status": "not-yet-ingested",
            }
        )
    return out


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: extract-kaysender-outline.py <path-to-kaysender-pdf>", file=sys.stderr)
        return 2

    pdf_path = Path(sys.argv[1])
    reader = PdfReader(str(pdf_path))
    outline = walk_outline(reader, reader.outline)
    manifest = {
        "sourceId": "kaysender-core-pdf-2025-01-20",
        "title": "Kaysender: 5th edition D&D campaign Info",
        "author": "Christopher Vardeman",
        "fileName": pdf_path.name,
        "pageCount": len(reader.pages),
        "outlineEntryCount": len(outline),
        "ingestionPrinciple": "Every source section should become a wiki hard-reference entry or an indexed source chunk before downstream generators derive from it.",
        "outline": outline,
    }
    print(json.dumps(manifest, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
