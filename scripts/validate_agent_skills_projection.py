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
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "skills" / "index.json"
PROJECTION_PATH = ROOT / "agent-skills.html"

SKILL_LINK_RE = re.compile(
    r'href=["\']agent-skills/([^/"\']+)\.html["\']', re.IGNORECASE,
)


class SkillProjectionParser(HTMLParser):
    """Extract the escaped SKILL.md payload from a compatibility page."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._capturing = False
        self._chunks: list[str] = []
        self.projections: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "pre" or self._capturing:
            return
        attr_map = dict(attrs)
        classes = (attr_map.get("class") or "").split()
        if "module-card" in classes:
            self._capturing = True
            self._chunks = []

    def handle_data(self, data: str) -> None:
        if self._capturing:
            self._chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "pre" and self._capturing:
            self.projections.append("".join(self._chunks))
            self._capturing = False
            self._chunks = []


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)


def exact_file_exists(relative_path: str) -> bool:
    """Require every path component to match repository casing exactly."""
    current = ROOT
    for part in Path(relative_path).parts:
        try:
            match = next((child for child in current.iterdir() if child.name == part), None)
        except OSError:
            return False
        if match is None:
            return False
        current = match
    return current.is_file()


def normalized_text(value: str) -> str:
    """Normalize transport line endings while ignoring presentation-only EOF newlines."""
    return value.replace("\r\n", "\n").replace("\r", "\n").rstrip("\n")


def skill_frontmatter_value(skill_text: str, field: str) -> str | None:
    """Read one top-level scalar from the simple Agent Skill YAML frontmatter."""
    if not skill_text.startswith("---\n"):
        return None
    end = skill_text.find("\n---\n", 4)
    if end < 0:
        return None
    frontmatter = skill_text[4:end]
    match = re.search(rf"^{re.escape(field)}:\s*(.+?)\s*$", frontmatter, re.MULTILINE)
    if match is None:
        return None
    return match.group(1).strip().strip('"\'')


def skill_frontmatter_version(skill_text: str) -> str | None:
    """Read metadata.version from Agent Skill frontmatter without a YAML dependency."""
    if not skill_text.startswith("---\n"):
        return None
    end = skill_text.find("\n---\n", 4)
    if end < 0:
        return None
    frontmatter = skill_text[4:end]
    match = re.search(r"^\s{2}version:\s*(.+?)\s*$", frontmatter, re.MULTILINE)
    if match is None:
        return None
    return match.group(1).strip().strip('"\'')


def projected_metadata_values(page: str, label: str) -> list[str] | None:
    """Read the ordered code values rendered for one compatibility metadata field."""
    match = re.search(
        rf"<p><strong>{re.escape(label)}:</strong>(.*?)</p>", page,
        re.IGNORECASE | re.DOTALL,
    )
    if match is None:
        return None
    return [unescape(value) for value in re.findall(r"<code>([^<]+)</code>", match.group(1))]


def projected_compatibility(page: str) -> str | None:
    """Read the rendered compatibility sentence from a compatibility page."""
    match = re.search(
        r"<p><strong>Compatibility:</strong>\s*(.*?)</p>", page,
        re.IGNORECASE | re.DOTALL,
    )
    if match is None:
        return None
    value = re.sub(r"<[^>]+>", "", match.group(1))
    return unescape(value).strip()


def compatibility_page_identity_error(name: str) -> str | None:
    """Return an error when a compatibility page does not identify its authority."""
    relative_page = f"agent-skills/{name}.html"
    try:
        page = (ROOT / relative_page).read_text(encoding="utf-8")
    except OSError as exc:
        return f"{relative_page}: cannot read page: {exc}"

    authority_href = f"../skills/{name}/SKILL.md"
    if not re.search(rf'href=["\']{re.escape(authority_href)}["\']', page, re.IGNORECASE):
        return f"{relative_page}: missing authoritative link {authority_href!r}"

    projected_name = re.search(
        r'<strong>Name:</strong>\s*<code>([^<]+)</code>', page, re.IGNORECASE
    )
    if projected_name is None:
        return f"{relative_page}: missing registered Name metadata"
    if projected_name.group(1) != name:
        return (
            f"{relative_page}: registered Name is {projected_name.group(1)!r}, "
            f"expected {name!r}"
        )
    return None


def compatibility_metadata_errors(name: str, registry_skill: dict[str, object]) -> list[str]:
    """Return errors when rendered routing/frontmatter metadata has drifted."""
    relative_page = f"agent-skills/{name}.html"
    skill_path = f"skills/{name}/SKILL.md"
    try:
        page = (ROOT / relative_page).read_text(encoding="utf-8")
        skill_text = (ROOT / skill_path).read_text(encoding="utf-8")
    except OSError as exc:
        return [f"{relative_page}: cannot compare integration metadata: {exc}"]

    errors: list[str] = []
    expected_status = registry_skill.get("status")
    status_match = re.search(
        r'<strong>Status:</strong>\s*<code>([^<]+)</code>', page, re.IGNORECASE
    )
    actual_status = unescape(status_match.group(1)) if status_match else None
    if actual_status != expected_status:
        errors.append(
            f"{relative_page}: rendered Status is {actual_status!r}, expected {expected_status!r}"
        )

    field_map = {
        "Capability IDs": "capabilityIds",
        "Resource IDs": "resourceIds",
        "Laboratory IDs": "laboratoryIds",
    }
    for label, registry_key in field_map.items():
        actual_values = projected_metadata_values(page, label)
        expected_values = registry_skill.get(registry_key)
        if actual_values is None:
            errors.append(f"{relative_page}: missing rendered {label}")
        elif actual_values != expected_values:
            errors.append(
                f"{relative_page}: rendered {label} are {actual_values!r}, "
                f"expected {expected_values!r}"
            )

    expected_version = skill_frontmatter_version(skill_text)
    version_match = re.search(
        r'<strong>Version:</strong>\s*<code>([^<]+)</code>', page, re.IGNORECASE
    )
    actual_version = unescape(version_match.group(1)) if version_match else None
    if actual_version != expected_version:
        errors.append(
            f"{relative_page}: rendered Version is {actual_version!r}, "
            f"expected {expected_version!r} from {skill_path}"
        )

    expected_compatibility = skill_frontmatter_value(skill_text, "compatibility")
    actual_compatibility = projected_compatibility(page)
    if actual_compatibility != expected_compatibility:
        errors.append(
            f"{relative_page}: rendered Compatibility is {actual_compatibility!r}, "
            f"expected {expected_compatibility!r} from {skill_path}"
        )
    return errors


def compatibility_projection_error(name: str) -> str | None:
    """Return an error when embedded SKILL.md text has drifted from its authority."""
    relative_page = f"agent-skills/{name}.html"
    skill_path = f"skills/{name}/SKILL.md"
    try:
        page = (ROOT / relative_page).read_text(encoding="utf-8")
        authoritative = (ROOT / skill_path).read_text(encoding="utf-8")
    except OSError as exc:
        return f"{relative_page}: cannot compare SKILL.md projection: {exc}"

    parser = SkillProjectionParser()
    parser.feed(page)
    parser.close()
    if len(parser.projections) != 1:
        return (
            f"{relative_page}: expected exactly one <pre class='module-card'> SKILL.md "
            f"projection, found {len(parser.projections)}"
        )
    if normalized_text(parser.projections[0]) != normalized_text(authoritative):
        return f"{relative_page}: embedded SKILL.md projection differs from {skill_path}"
    return None


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
    registry_by_name: dict[str, dict[str, object]] = {}
    malformed_entries: list[str] = []
    missing_skill_files: list[str] = []
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
        registry_by_name.setdefault(name, skill)
        expected_path = f"skills/{name}/SKILL.md"
        if path != expected_path:
            malformed_entries.append(f"{name}: path is {path!r}, expected {expected_path!r}")
            continue
        if not exact_file_exists(expected_path):
            missing_skill_files.append(expected_path)

    registry_counts = Counter(registry_names)
    registry_duplicates = sorted(name for name, count in registry_counts.items() if count > 1)

    projected_names = SKILL_LINK_RE.findall(projection)
    projection_counts = Counter(projected_names)
    projection_duplicates = sorted(name for name, count in projection_counts.items() if count > 1)
    missing_compatibility_pages = sorted(
        f"agent-skills/{name}.html" for name in set(projected_names)
        if not exact_file_exists(f"agent-skills/{name}.html")
    )
    existing_projected_names = sorted(
        name for name in set(projected_names)
        if exact_file_exists(f"agent-skills/{name}.html")
        and exact_file_exists(f"skills/{name}/SKILL.md")
    )
    compatibility_identity_errors = [
        error for name in existing_projected_names
        for error in [compatibility_page_identity_error(name)] if error is not None
    ]
    compatibility_metadata_error_list = [
        error for name in existing_projected_names if name in registry_by_name
        for error in compatibility_metadata_errors(name, registry_by_name[name])
    ]
    compatibility_projection_errors = [
        error for name in existing_projected_names
        for error in [compatibility_projection_error(name)] if error is not None
    ]

    registry_set = set(registry_names)
    projection_set = set(projected_names)
    missing = sorted(registry_set - projection_set)
    extra = sorted(projection_set - registry_set)

    problems = False
    for entry in malformed_entries:
        fail(entry); problems = True
    if missing_skill_files:
        fail("registered skill files missing or case-mismatched: " + ", ".join(sorted(missing_skill_files))); problems = True
    if registry_duplicates:
        fail("duplicate registry skill names: " + ", ".join(registry_duplicates)); problems = True
    if projection_duplicates:
        fail("duplicate projected skill links: " + ", ".join(projection_duplicates)); problems = True
    if missing_compatibility_pages:
        fail("projected compatibility pages missing or case-mismatched: " + ", ".join(missing_compatibility_pages)); problems = True
    for error in compatibility_identity_errors:
        fail(error); problems = True
    for error in compatibility_metadata_error_list:
        fail(error); problems = True
    for error in compatibility_projection_errors:
        fail(error); problems = True
    if missing:
        fail("skills missing from agent-skills.html: " + ", ".join(missing)); problems = True
    if extra:
        fail("agent-skills.html contains unregistered skills: " + ", ".join(extra)); problems = True

    if problems:
        return 1

    print(
        "OK: agent-skills.html projects all "
        f"{len(registry_names)} registered Agent Skills exactly once, every "
        "registered SKILL.md target exists with exact path casing, and every "
        "projected compatibility page exists with exact path casing, identifies "
        "and links its matching authoritative skill, mirrors current registry and "
        "frontmatter integration metadata, and embeds the current authoritative "
        "SKILL.md text."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
