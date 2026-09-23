#!/usr/bin/env python3
"""Unify Beneath Dappled Oaks chapter continuation fragments into canonical chapter files.

Examples:
  python scripts/unify_beneath_dappled_oaks_chapters.py 5 6
  python scripts/unify_beneath_dappled_oaks_chapters.py 6 --delete-fragments

The canonical base file (NN-*.md) keeps its YAML front matter and H1. Continuation
files (NNA-*.md, NNB-*.md, ...) are appended in lexical suffix order. Their YAML
front matter and chapter H1 are removed, but their continuation title is retained
as an H2 scene heading. The operation is idempotent: generated content is bounded
by explicit markers and is replaced, not duplicated, on subsequent runs.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAPTER_DIR = ROOT / "docs" / "beneath-dappled-oaks" / "chapters"
BEGIN = "<!-- BEGIN AUTO-UNIFIED CONTINUATIONS -->"
END = "<!-- END AUTO-UNIFIED CONTINUATIONS -->"

FRONT_MATTER = re.compile(r"\A---\s*\n.*?\n---\s*\n", re.S)
H1 = re.compile(r"^#\s+.+?\s*$", re.M)
TITLE = re.compile(r'^title:\s*["\']?(.*?)["\']?\s*$', re.M)


def chapter_files(number: int):
    prefix = f"{number:02d}"
    base = sorted(CHAPTER_DIR.glob(f"{prefix}-*.md"))
    if len(base) != 1:
        raise SystemExit(f"Expected exactly one canonical {prefix}-*.md; found {len(base)}")
    fragments = sorted(
        p for p in CHAPTER_DIR.glob(f"{prefix}[A-Z]-*.md")
        if re.match(rf"^{prefix}[A-Z]-", p.name)
    )
    return base[0], fragments


def strip_existing_generated(text: str) -> str:
    if BEGIN not in text:
        return text.rstrip() + "\n"
    before, rest = text.split(BEGIN, 1)
    if END not in rest:
        raise SystemExit("Found BEGIN marker without END marker; refusing destructive rewrite.")
    _, after = rest.split(END, 1)
    return (before.rstrip() + "\n" + after.lstrip()).rstrip() + "\n"


def fragment_body(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    m = TITLE.search(raw)
    title = m.group(1).strip() if m else path.stem
    body = FRONT_MATTER.sub("", raw, count=1).lstrip()
    body = H1.sub("", body, count=1).strip()
    return f"## {title}\n\n{body}\n"


def unify(number: int, delete_fragments: bool, dry_run: bool) -> None:
    base, fragments = chapter_files(number)
    if not fragments:
        print(f"{base.name}: no continuation fragments; unchanged")
        return

    original = base.read_text(encoding="utf-8")
    clean = strip_existing_generated(original)
    joined = "\n---\n\n".join(fragment_body(p).rstrip() for p in fragments)
    result = (
        clean.rstrip()
        + "\n\n"
        + BEGIN
        + "\n\n"
        + joined
        + "\n\n"
        + END
        + "\n"
    )

    print(f"{base.name}: {len(fragments)} fragments -> {len(result):,} characters")
    for p in fragments:
        print(f"  + {p.name}")

    if dry_run:
        return

    tmp = base.with_suffix(".md.tmp")
    tmp.write_text(result, encoding="utf-8", newline="\n")
    tmp.replace(base)

    reread = base.read_text(encoding="utf-8")
    if reread != result or reread.count(BEGIN) != 1 or reread.count(END) != 1:
        raise SystemExit(f"Verification failed for {base}")

    if delete_fragments:
        for p in fragments:
            p.unlink()
        print(f"  deleted {len(fragments)} continuation fragments after verified write")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("chapters", nargs="+", type=int)
    ap.add_argument("--delete-fragments", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    for n in args.chapters:
        if not 1 <= n <= 40:
            raise SystemExit(f"Chapter {n} violates the 1..40 book chapter range.")
        unify(n, args.delete_fragments, args.dry_run)


if __name__ == "__main__":
    main()
