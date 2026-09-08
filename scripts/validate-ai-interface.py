#!/usr/bin/env python3
"""Validate the Foundry machine-discovery and Agent Skills authority chain.

Run from anywhere in the repository checkout:
    python scripts/validate-ai-interface.py

This is intentionally local/static validation. It does not require or create
GitHub Actions and it does not claim that GitHub Pages has deployed a commit.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_BASE = "https://mrcalzon02.github.io/HB-TTRPG-tools/"

ERRORS: list[str] = []
WARNINGS: list[str] = []


def error(message: str) -> None:
    ERRORS.append(message)


def warn(message: str) -> None:
    WARNINGS.append(message)


def load_json(relative: str):
    path = ROOT / relative
    if not path.is_file():
        error(f"missing required JSON file: {relative}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - validator should report all parse failures
        error(f"invalid JSON {relative}: {exc}")
        return {}


def require_file(relative: str, context: str) -> None:
    if not relative or relative.startswith(("http://", "https://")):
        return
    clean = relative.lstrip("./")
    if not (ROOT / clean).is_file():
        error(f"{context} references missing file: {relative}")


def local_path_from_public_url(value: str) -> str | None:
    if not isinstance(value, str) or not value.startswith(PUBLIC_BASE):
        return None
    return urlparse(value).path.split("/HB-TTRPG-tools/", 1)[-1]


def unique_ids(records, field: str, label: str) -> set[str]:
    seen: set[str] = set()
    for record in records if isinstance(records, list) else []:
        value = record.get(field) if isinstance(record, dict) else None
        if not isinstance(value, str) or not value:
            error(f"{label} has missing/invalid {field}: {record!r}")
            continue
        if value in seen:
            error(f"duplicate {label} {field}: {value}")
        seen.add(value)
    return seen


def main() -> int:
    status_doc = load_json("api/ai/status-vocabulary.json")
    skills_doc = load_json("skills/index.json")
    caps_doc = load_json("api/foundry-capabilities.json")
    contracts_doc = load_json("api/operation-contracts.json")
    resources_doc = load_json("api/resource-collections.json")
    manifest = load_json(".well-known/ai-capabilities.json")
    ai_index = load_json("api/ai/index.json")

    statuses = set((status_doc.get("statuses") or {}).keys())
    if not statuses:
        error("status vocabulary contains no statuses")

    recommended = status_doc.get("recommendedStaticStatusByRuntimeClass") or {}
    for runtime_class in (
        "static-resource",
        "browser-js",
        "host-sandbox",
        "browser-page-context",
        "browser-ui",
        "live-sensor-browser-context",
    ):
        token = recommended.get(runtime_class)
        if token not in statuses:
            error(f"runtime class {runtime_class} has missing/invalid recommended status: {token!r}")

    skills = skills_doc.get("skills") or []
    skill_names = unique_ids(skills, "name", "skill")
    if not skill_names:
        error("skills/index.json contains no registered skills")

    capabilities = caps_doc.get("capabilities") or []
    capability_ids = unique_ids(capabilities, "id", "capability")

    resources = resources_doc.get("resources") or []
    resource_ids = unique_ids(resources, "id", "resource")

    contract_caps = contracts_doc.get("capabilities") or {}
    if not isinstance(contract_caps, dict):
        error("api/operation-contracts.json capabilities must be an object keyed by capability id")
        contract_caps = {}

    default_personality = skills_doc.get("defaultPersonality") or {}
    if default_personality.get("engramId") != "blacklight.charles":
        error("skills/index.json defaultPersonality.engramId must be blacklight.charles")
    require_file(default_personality.get("authorityPath", ""), "default Charles personality")

    for skill in skills:
        if not isinstance(skill, dict):
            continue
        name = skill.get("name", "<unnamed-skill>")
        require_file(skill.get("path", ""), f"skill {name}")
        status = skill.get("status")
        if status not in statuses:
            error(f"skill {name} uses undefined status token: {status!r}")
        for capability_id in skill.get("capabilityIds") or []:
            if capability_id not in capability_ids:
                error(f"skill {name} references missing capability: {capability_id}")
        for resource_id in skill.get("resourceIds") or []:
            if resource_id not in resource_ids:
                error(f"skill {name} references missing resource: {resource_id}")
        manifest_path = skill.get("manifestPath")
        if manifest_path:
            require_file(manifest_path, f"skill {name} companion manifest")

    for resource in resources:
        if not isinstance(resource, dict):
            continue
        path = resource.get("path")
        if isinstance(path, str) and path and not path.startswith(("http://", "https://")):
            require_file(path, f"resource {resource.get('id', '<unnamed-resource>')}")

    for capability in capabilities:
        if not isinstance(capability, dict):
            continue
        cid = capability.get("id", "<unnamed-capability>")
        mode = capability.get("mode")
        status = capability.get("status")
        if status not in statuses:
            error(f"capability {cid} uses undefined status token: {status!r}")
        expected = recommended.get(mode)
        if expected and status != expected:
            warn(f"capability {cid} mode {mode} normally maps to {expected}, found {status}")

        runtime = capability.get("runtime") or {}
        for script in runtime.get("scripts") or []:
            require_file(script, f"capability {cid} runtime")
        for source in capability.get("source") or []:
            require_file(source, f"capability {cid} source")

        invocation = capability.get("invocation") or {}
        if mode == "browser-js" or invocation.get("type") in {"global-method", "global-dispatch"}:
            if cid not in contract_caps:
                error(f"executable capability lacks operation contract: {cid}")

    entrypoints = manifest.get("entrypoints") or {}
    bootstrap_url = entrypoints.get("bootstrap")
    if bootstrap_url != PUBLIC_BASE + "api/ai/bootstrap.txt":
        error(f"manifest bootstrap entrypoint is missing or unexpected: {bootstrap_url!r}")
    for name, value in entrypoints.items():
        local = local_path_from_public_url(value) if isinstance(value, str) else None
        if local:
            require_file(local, f"manifest entrypoint {name}")

    execution_model = manifest.get("executionModel") or {}
    if execution_model.get("remoteRpcAvailable") is not False:
        error("manifest must not advertise remote RPC before deployment")
    if execution_model.get("remoteMcpAvailable") is not False:
        error("manifest must not advertise remote MCP before deployment")

    discovery = ai_index.get("discovery") or {}
    if discovery.get("bootstrap") != PUBLIC_BASE + "api/ai/bootstrap.txt":
        error("api/ai/index.json does not expose the canonical bootstrap URL")

    transport = ai_index.get("transport") or {}
    if (transport.get("hostSandbox") or {}).get("status") != "runtime-required":
        error("AI index hostSandbox transport must use canonical runtime-required status")
    for remote_key in ("remoteMcp", "remoteRpc"):
        remote = transport.get(remote_key) or {}
        if remote.get("status") != "not-deployed" or remote.get("endpoint") is not None:
            error(f"AI index {remote_key} must remain not-deployed with null endpoint until verified")

    quick_start = ai_index.get("quickStart") or []
    steps = [item.get("step") for item in quick_start if isinstance(item, dict)]
    if steps != list(range(1, 12)):
        error(f"AI index quickStart must contain canonical steps 1..11; found {steps}")

    bootstrap_path = ROOT / "api/ai/bootstrap.txt"
    if not bootstrap_path.is_file():
        error("api/ai/bootstrap.txt is missing")
    else:
        bootstrap = bootstrap_path.read_text(encoding="utf-8")
        required_phrases = (
            "Mirrored calls, not mirrored logic.",
            "referenced current machine authority governs",
            "Do not translate or independently recreate its algorithm in Python",
            "OpenAPI is a discovery interface",
        )
        for phrase in required_phrases:
            if phrase not in bootstrap:
                error(f"bootstrap is missing required contract phrase: {phrase}")

    ai_access = ROOT / "ai-access.html"
    if ai_access.is_file():
        text = ai_access.read_text(encoding="utf-8")
        if re.search(r"\b\d+\s+(?:exact\s+)?registered\s+Agent Skills\b", text, re.I):
            error("ai-access.html contains a hard-coded registered Agent Skills count")
        if "api/ai/bootstrap.txt" not in text:
            error("ai-access.html does not expose the bootstrap contract")

    llms = ROOT / "llms.txt"
    if llms.is_file():
        text = llms.read_text(encoding="utf-8")
        match = re.search(r"Current registered skills \((\d+)\):", text)
        if match and int(match.group(1)) != len(skill_names):
            error(
                f"llms.txt skill count {match.group(1)} disagrees with registry count {len(skill_names)}"
            )

    print(f"AI interface validation: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s)")
    for message in ERRORS:
        print(f"ERROR: {message}")
    for message in WARNINGS:
        print(f"WARN: {message}")
    if not ERRORS:
        print(
            f"PASS: {len(skill_names)} skills, {len(capability_ids)} capabilities, "
            f"{len(resource_ids)} resources checked."
        )
    return 1 if ERRORS else 0


if __name__ == "__main__":
    sys.exit(main())
