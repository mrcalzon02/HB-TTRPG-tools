#!/usr/bin/env python3
"""Check published HTML skill projections without overwriting curated pages.

The HTML pages are compatibility mirrors: they must contain the exact, escaped
current SKILL.md plus the mandatory engram/index discovery note and links.
Run: python3 scripts/validate-agent-skill-projections.py
"""
from __future__ import annotations

from html import unescape
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
index = json.loads((ROOT / "skills/index.json").read_text(encoding="utf-8"))
errors = []
expected_names = {skill["name"] for skill in index.get("skills", [])}
pages = {file.stem for file in (ROOT / "agent-skills").glob("*.html")}

for missing in sorted(expected_names - pages):
    errors.append(f"Missing HTML projection: {missing}")
for orphan in sorted(pages - expected_names):
    errors.append(f"Unregistered HTML projection: {orphan}")

for skill in index.get("skills", []):
    name = skill["name"]
    page = ROOT / "agent-skills" / f"{name}.html"
    source = ROOT / skill["path"]
    if not page.is_file() or not source.is_file():
        continue
    html = page.read_text(encoding="utf-8")
    markdown = source.read_text(encoding="utf-8").rstrip() + "\n"
    matches = re.findall(r'<pre class="module-card">(.*?)</pre>', html, re.S)
    if len(matches) != 1:
        errors.append(f"{name}: expected exactly one complete SKILL.md projection")
    elif unescape(matches[0]) != markdown:
        errors.append(f"{name}: HTML SKILL.md content is stale or incomplete")
    if 'docs/blacklight/charles-personality-engram.json' not in html:
        errors.append(f"{name}: no mandatory engram link")
    if '../skills/index.json' not in html:
        errors.append(f"{name}: no reciprocal index link")
    if "MANDATORY COMPANION:" not in html:
        errors.append(f"{name}: no fail-closed companion notice")
    if "required-personality-engram: blacklight.charles" not in html:
        errors.append(f"{name}: companion metadata not visible in projection")
    if "required-skill-index: skills/index.json" not in html:
        errors.append(f"{name}: index metadata not visible in projection")

for problem in errors:
    print("FAIL [skill-html] " + problem, file=sys.stderr)
if errors:
    raise SystemExit(f"[skill-html] {len(errors)} projection discrepancies")
print(f"PASS [skill-html] {len(expected_names)} current, complete, reciprocal, linked skill projections")
