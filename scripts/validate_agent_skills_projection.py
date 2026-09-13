#!/usr/bin/env python3
"""Validate that agent-skills.html exactly projects skills/index.json.

The JSON registry is authoritative. This validator is intentionally read-only and
stdlib-only so drift can be detected during development without adding runtime
JavaScript or another source of truth.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "skills" / "index.json"
PROJECTION_PATH = ROOT / "agent-skills.html"

SKILL_LINK_RE = re.compile(
    r'href=["\']agent-skills/([^/"\']+)\.html["\']',
    re.IGNORECASE,
)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)


def main() -> int:
    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read authoritative registry {REGISTRY_PATH}: {exc}")
        return 2

    try:
        projection = PROJECTION_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        fail(f"cannot read compatibility projection {PROJECTION_PATH}: {exc}")
        return 2

    skills = registry.get("skills")
    if not isinstance(skills, list):
        fail("skills/index.json must contain a top-level 'skills' array")
        return 2

    registry_names: list[str] = []
    malformed_entries: list[str] = []
    for index, skill in enumerate(skills):
        if not isinstance(skill, dict):
            malformed_entries.append(f"skills[{index}] is not an object")
            continue
        name = skill.get("name")
        path = skill.get("path")
        if not isinstance(name, str) or not name.strip():
            malformed_entries.append(f"skills[{index}] has no valid name")
            continue
        registry_names.append(name)
        expected_path = f"skills/{name}/SKILL.md"
        if path != expected_path:
            malformed_entries.append(
                f"{name}: path is {path!r}, expected {expected_path!r}"
            )

    registry_counts = Counter(registry_names)
    registry_duplicates = sorted(
        name for name, count in registry_counts.items() if count > 1
    )

    projected_names = SKILL_LINK_RE.findall(projection)
    projection_counts = Counter(projected_names)
    projection_duplicates = sorted(
        name for name, count in projection_counts.items() if count > 1
    )

    registry_set = set(registry_names)
    projection_set = set(projected_names)
    missing = sorted(registry_set - projection_set)
    extra = sorted(projection_set - registry_set)

    problems = False
    for entry in malformed_entries:
        fail(entry)
        problems = True
    if registry_duplicates:
        fail("duplicate registry skill names: " + ", ".join(registry_duplicates))
        problems = True
    if projection_duplicates:
        fail("duplicate projected skill links: " + ", ".join(projection_duplicates))
        problems = True
    if missing:
        fail("skills missing from agent-skills.html: " + ", ".join(missing))
        problems = True
    if extra:
        fail("agent-skills.html contains unregistered skills: " + ", ".join(extra))
        problems = True

    if problems:
        return 1

    print(
        "OK: agent-skills.html projects all "
        f"{len(registry_names)} registered Agent Skills exactly once."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
