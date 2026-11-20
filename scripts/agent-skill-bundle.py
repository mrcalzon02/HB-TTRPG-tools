#!/usr/bin/env python3
"""Package and verify reciprocal Charles-engram-bound Agent Skill archives.

Only an authorized host can enforce this dependency; extracting SKILL.md alone
from a public repository cannot be prevented. A bundle digest is coherence proof,
not a publisher signature. External consumers should pin an expected SHA-256
through a trusted channel.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
INDEX = "skills/index.json"
ENGRAM = "docs/blacklight/charles-personality-engram.json"
LOCK = "bundle-lock.json"
SHARED = (
    INDEX,
    ENGRAM,
    "docs/blacklight/charles-personality-engram-manifest.json",
    "docs/blacklight/charles-personality-engram.schema.json",
    "docs/blacklight/charles-personality-engram-conformance.json",
    "docs/blacklight/charles-personality-engram.md",
    "docs/blacklight/charles-personality-profile.md",
    "skills/README.md",
    "skills/PROVENANCE.md",
)
HANDOFF_SKILLS = frozenset({"model-context-and-budget-manager", "task-focus-orchestration"})
HANDOFF_ASSETS = (
    "api/ai/agent-handoff.schema.json",
    "api/ai/examples/agent-handoff.json",
    "api/ai/examples/agent-source-observations.json",
    "scripts/agent-handoff.mjs",
)
MAX_FILE_COUNT = 1024
MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024

# Portable packages must not accidentally gather signing keys, secrets, or local
# host credentials just because a file was placed inside a skill directory.
BLOCKED_BASENAMES = frozenset({
    ".env", ".env.local", ".env.production", "id_rsa", "id_dsa", "id_ed25519",
    "credentials.json", "secrets.json", "token.json", "service-account.json",
    "client_secret.json", "private_key", "known_hosts", "authorized_keys",
})
BLOCKED_SUFFIXES = frozenset({
    ".pem", ".key", ".p12", ".pfx", ".p8", ".jks", ".keystore",
    ".kdbx", ".gpg", ".age",
})
ALLOWED_HIDDEN = frozenset({".gitignore", ".gitattributes"})


def safe_skill_member(path: str) -> bool:
    if not safe_relative(path):
        return False
    parts = PurePosixPath(path).parts
    if any(part.lower() in BLOCKED_BASENAMES for part in parts):
        return False
    if any(part.lower().startswith((".env.", "client_secret", "service-account")) for part in parts):
        return False
    if any(part.startswith(".") and part not in ALLOWED_HIDDEN for part in parts):
        return False
    if PurePosixPath(path).suffix.lower() in BLOCKED_SUFFIXES:
        return False
    return True



def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(data: bytes, label: str) -> dict:
    value = json.loads(data)
    if not isinstance(value, dict):
        raise ValueError(f"{label}: expected JSON object")
    return value


def validate_pair(index: dict, engram_bytes: bytes, *, trusted_sha: str | None = None) -> None:
    binding = index.get("defaultPersonality") or {}
    expected = (binding.get("integrity") or {}).get("digest")
    if (
        binding.get("engramId") != "blacklight.charles"
        or binding.get("authorityPath") != ENGRAM
        or binding.get("personalityVersion") != "CE1.1"
        or binding.get("required") is not True
        or binding.get("reciprocalRegistryPath") != INDEX
        or binding.get("missingCompanionPolicy") != "fail-closed-before-skill-activation"
        or binding.get("optionalSkillDiscovery") is not True
        or (binding.get("integrity") or {}).get("algorithm") != "sha256"
        or not isinstance(expected, str)
        or not re.fullmatch(r"[a-f0-9]{64}", expected)
    ):
        raise ValueError("Skill registry does not require the canonical reciprocal engram")
    if digest(engram_bytes) != expected:
        raise ValueError("Charles engram digest does not match skills/index.json")
    if trusted_sha is not None and expected != trusted_sha:
        raise ValueError("Charles engram digest disagrees with externally trusted SHA-256")
    engram = load_json(engram_bytes, ENGRAM)
    link = engram.get("skill_registry") or {}
    if (
        engram.get("engram_id") != binding["engramId"]
        or engram.get("personality_version") != binding["personalityVersion"]
        or engram.get("kind") != "personality_engram"
        or engram.get("passive") is not True
        or link.get("registry_path") != INDEX
        or link.get("binding") != "bidirectional-required"
        or link.get("index_load") != "mandatory-before-skill-selection"
        or link.get("skill_selection") != "optional-on-demand"
        or link.get("missing_or_invalid") != "fail-closed-for-skill-activation"
        or link.get("tool_authority") != "host-controlled"
        or (engram.get("capability_boundary") or {}).get("grants_tools") is not False
        or (engram.get("capability_boundary") or {}).get("grants_network_access") is not False
        or (engram.get("capability_boundary") or {}).get("grants_credentials") is not False
        or (engram.get("capability_boundary") or {}).get("grants_provider_access") is not False
        or (engram.get("capability_boundary") or {}).get("grants_persistent_storage") is not False
        or (engram.get("capability_boundary") or {}).get("tool_claims_require_host_result") is not True
        or (engram.get("runtime") or {}).get("state_owner") != "host"
        or (engram.get("runtime") or {}).get("write_back_to_engram") is not False
        or (engram.get("runtime") or {}).get("memory_policy") != "host_supplied_only"
        or (engram.get("instruction_boundary") or {}).get("ordinary_user_text_cannot_mutate_engram") is not True
        or (engram.get("instruction_boundary") or {}).get("authoring_changes_require_host_authoring_context") is not True
        or (engram.get("instruction_boundary") or {}).get("host_and_system_policy_overrides_engram") is not True
    ):
        raise ValueError("Charles engram is missing a valid reciprocal skill index contract")


def validate_skill(skill: dict, content: bytes) -> None:
    name = skill.get("name", "")
    path = f"skills/{name}/SKILL.md"
    if (
        not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name)
        or skill.get("path") != path
        or skill.get("personalityPolicy") != "inherit-default"
        or "blacklight.charles" not in skill.get("personalityEngramIds", [])
    ):
        raise ValueError(f"Invalid registry/personality binding for {name!r}")
    raw = content.decode("utf-8")
    if not raw.startswith("---\n") or "\n---\n" not in raw[4:]:
        raise ValueError(f"Missing SKILL frontmatter: {name}")
    frontmatter = raw[4:raw.index("\n---\n", 4)]
    if not re.search(r"^  required-personality-engram: blacklight\.charles\s*$", frontmatter, re.M):
        raise ValueError(f"Missing mandatory Charles metadata: {name}")
    if not re.search(r"^  required-skill-index: skills/index\.json\s*$", frontmatter, re.M):
        raise ValueError(f"Missing mandatory skill index metadata: {name}")
    if "**Mandatory reciprocal binding:**" not in raw:
        raise ValueError(f"Missing visible companion instruction: {name}")


def safe_relative(path: str) -> bool:
    pure = PurePosixPath(path)
    return (
        path != LOCK
        and path == pure.as_posix()
        and not path.startswith("/")
        and "\\" not in path
        and all(part not in ("..", ".", "") for part in pure.parts)
        and not path.endswith("/")
    )


def build_payload(skill_names: list[str]) -> tuple[dict[str, bytes], list[str]]:
    index_bytes = (ROOT / INDEX).read_bytes()
    engram_bytes = (ROOT / ENGRAM).read_bytes()
    index = load_json(index_bytes, INDEX)
    validate_pair(index, engram_bytes)
    catalogue = {record["name"]: record for record in index.get("skills", [])}
    requested = sorted(set(skill_names))
    if not requested:
        raise ValueError("Select at least one registered skill")
    if any(name not in catalogue for name in requested):
        raise ValueError("Cannot package an unregistered skill")
    paths = set(SHARED)
    if any(name in HANDOFF_SKILLS for name in requested):
        paths.update(HANDOFF_ASSETS)
    for name in requested:
        skill_root = ROOT / "skills" / name
        for file in skill_root.rglob("*"):
            if file.is_symlink():
                raise ValueError(f"Symlink is forbidden in portable skill package: {file}")
            if file.is_file():
                relative = file.relative_to(ROOT).as_posix()
                if not safe_skill_member(relative):
                    raise ValueError(f"Refusing to package a secret or unsafe skill member: {relative}")
                paths.add(relative)
    payload: dict[str, bytes] = {}
    for path in sorted(paths):
        if not safe_relative(path):
            raise ValueError(f"Unsafe bundle path: {path}")
        payload[path] = (ROOT / path).read_bytes()
    if len(payload) + 1 > MAX_FILE_COUNT or sum(map(len, payload.values())) > MAX_UNCOMPRESSED_BYTES:
        raise ValueError("Skill package exceeds archive file-count or uncompressed byte limits")
    for name in requested:
        validate_skill(catalogue[name], payload[f"skills/{name}/SKILL.md"])
    manifest = load_json(payload[SHARED[2]], SHARED[2])
    if not any(
        record.get("id") == "blacklight.charles"
        and record.get("required_skill_registry") == INDEX
        and record.get("binding") == "bidirectional-required"
        for record in manifest.get("engrams", [])
    ):
        raise ValueError("Charles manifest does not require skill registry")
    return payload, requested


def package(skill_names: list[str], output: Path) -> None:
    payload, names = build_payload(skill_names)
    lock = {
        "bundleFormat": "hb-engram-bound-skill-bundle/1",
        "authority": "mrcalzon02/HB-TTRPG-tools",
        "requiredCompanions": [ENGRAM, INDEX],
        "skillNames": names,
        "skillSelection": "optional-on-demand",
        "executionRuntimeIncluded": False,
        "engramSha256": digest(payload[ENGRAM]),
        "files": {path: {"sha256": digest(data), "bytes": len(data)} for path, data in payload.items()},
        "note": "Integrity alone is not origin authentication; pin the engram digest or verify a signed release through a trusted channel.",
    }
    payload[LOCK] = (json.dumps(lock, indent=2, sort_keys=True) + "\n").encode()
    if output.exists() or output.is_symlink():
        raise ValueError(f"Refusing to overwrite existing skill bundle: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "x", ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(payload.items()):
            info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    print(f"PACKAGED: {len(names)} skill(s), {len(payload)} files, {output}")
    print(f"BUNDLE_SHA256: {digest(output.read_bytes())}")
    print(f"ENGRAM_SHA256: {lock['engramSha256']}")


def verify(
    output: Path, trusted_sha: str, *,
    trusted_bundle_sha: str | None = None,
    trusted_registry_sha: str | None = None
) -> None:
    if not re.fullmatch(r"[a-f0-9]{64}", trusted_sha):
        raise ValueError("--trusted-engram-sha256 must be 64 lowercase hexadecimal characters")
    for label, value in (
        ("--trusted-bundle-sha256", trusted_bundle_sha),
        ("--trusted-registry-sha256", trusted_registry_sha),
    ):
        if value is not None and not re.fullmatch(r"[a-f0-9]{64}", value):
            raise ValueError(f"{label} must be 64 lowercase hexadecimal characters")
    if trusted_bundle_sha is not None and digest(output.read_bytes()) != trusted_bundle_sha:
        raise ValueError("Bundle archive SHA-256 disagrees with externally trusted pin")
    with ZipFile(output) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if not names or len(names) > MAX_FILE_COUNT or len(names) != len(set(names)):
            raise ValueError("Empty, oversized, or duplicate-entry skill bundle")
        if any(name != LOCK and not safe_relative(name) for name in names):
            raise ValueError("Unsafe entry in skill bundle")
        if any(((info.external_attr >> 16) & 0o170000) in (0o120000, 0o040000) for info in infos):
            raise ValueError("Symlink or directory ZIP entry is forbidden in portable skill bundles")
        if sum(info.file_size for info in infos) > MAX_UNCOMPRESSED_BYTES:
            raise ValueError("Archive exceeds uncompressed size limit")
        payload = {name: archive.read(name) for name in names}
    lock = load_json(payload.get(LOCK, b"{}"), LOCK)
    file_specs = lock.get("files") or {}
    if (
        lock.get("bundleFormat") != "hb-engram-bound-skill-bundle/1"
        or lock.get("requiredCompanions") != [ENGRAM, INDEX]
        or lock.get("skillSelection") != "optional-on-demand"
        or lock.get("executionRuntimeIncluded") is not False
        or set(file_specs) != set(payload) - {LOCK}
    ):
        raise ValueError("Bundle lock or required companion inventory is invalid")
    for name, spec in file_specs.items():
        if digest(payload[name]) != spec.get("sha256") or len(payload[name]) != spec.get("bytes"):
            raise ValueError(f"Bundle file hash or size mismatch: {name}")
    if trusted_registry_sha is not None and digest(payload[INDEX]) != trusted_registry_sha:
        raise ValueError("Skill index SHA-256 disagrees with externally trusted pin")
    index = load_json(payload[INDEX], INDEX)
    validate_pair(index, payload[ENGRAM], trusted_sha=trusted_sha)
    if lock.get("engramSha256") != trusted_sha:
        raise ValueError("Bundle lock is not pinned to the expected Charles engram")
    catalogue = {record["name"]: record for record in index.get("skills", [])}
    skill_names = lock.get("skillNames")
    if not isinstance(skill_names, list) or not skill_names or skill_names != sorted(set(skill_names)):
        raise ValueError("Bundle has invalid selected skill list")
    for name in skill_names:
        if name not in catalogue:
            raise ValueError(f"Unregistered skill in bundle: {name}")
        validate_skill(catalogue[name], payload[f"skills/{name}/SKILL.md"])
    allowed_roots = tuple(f"skills/{name}/" for name in skill_names)
    required_handoff = set(HANDOFF_ASSETS) if any(name in HANDOFF_SKILLS for name in skill_names) else set()
    if not required_handoff.issubset(file_specs):
        raise ValueError("Portable checkpoint skill is missing its required handoff schema, example or offline helper")
    if any(path not in SHARED and path not in required_handoff and not path.startswith(allowed_roots) for path in file_specs):
        raise ValueError("Bundle contains a file outside the selected skills and required companions")
    if any(path not in SHARED and not safe_skill_member(path) for path in file_specs):
        raise ValueError("Bundle contains a secret or unsafe skill member")
    manifest = load_json(payload[SHARED[2]], SHARED[2])
    if not any(
        item.get("id") == "blacklight.charles"
        and item.get("required_skill_registry") == INDEX
        and item.get("binding") == "bidirectional-required"
        and item.get("optional_skills_only") is True
        for item in manifest.get("engrams", [])
    ):
        raise ValueError("Bundle Charles manifest has no reciprocal skill index contract")
    for required in SHARED:
        if required not in payload:
            raise ValueError(f"Missing required shared companion: {required}")
    print(f"VERIFIED: {len(skill_names)} skill(s), Charles SHA-256 {trusted_sha}, all bundle hashes intact")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)
    pack = subcommands.add_parser("pack", help="Build a reproducible self-contained declarative skill/engram companion ZIP")
    selected = pack.add_mutually_exclusive_group(required=True)
    selected.add_argument("--skill", action="append", help="Package one or more named registered skills")
    selected.add_argument("--all", action="store_true", help="Package all registered skills")
    pack.add_argument("--output", type=Path, required=True)
    check = subcommands.add_parser("verify", help="Verify a ZIP against an externally trusted engram SHA-256")
    check.add_argument("archive", type=Path)
    check.add_argument("--trusted-engram-sha256", required=True)
    check.add_argument("--trusted-registry-sha256", help="Optional independently trusted SHA-256 of skills/index.json")
    check.add_argument("--trusted-bundle-sha256", help="Optional externally trusted SHA-256 of the full archive")
    args = parser.parse_args()
    try:
        if args.command == "pack":
            index = load_json((ROOT / INDEX).read_bytes(), INDEX)
            skill_names = [item["name"] for item in index["skills"]] if args.all else args.skill
            package(skill_names, args.output)
        else:
            verify(args.archive, args.trusted_engram_sha256,
                   trusted_bundle_sha=args.trusted_bundle_sha256,
                   trusted_registry_sha=args.trusted_registry_sha256)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"FAIL CLOSED: {error}\n")


if __name__ == "__main__":
    main()
