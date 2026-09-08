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
import subprocess
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


def derive_manifest_path(skill: dict) -> str | None:
    explicit = skill.get("manifestPath")
    if isinstance(explicit, str) and explicit:
        return explicit
    skill_path = skill.get("path")
    if not isinstance(skill_path, str) or "/" not in skill_path:
        return None
    return f"{skill_path.rsplit('/', 1)[0]}/manifest.json"


def git_blob_sha(relative: str) -> str | None:
    """Return the filtered Git blob SHA for the current worktree file when Git is available."""
    path = ROOT / relative
    if not path.is_file():
        return None
    try:
        completed = subprocess.run(
            ["git", "hash-object", f"--path={relative}", str(path)],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        warn(f"could not calculate Git blob SHA for {relative}: {exc}")
        return None
    value = completed.stdout.strip()
    return value or None


def validate_declared_blob(relative: str, expected_sha: str, context: str) -> None:
    require_file(relative, context)
    if not expected_sha:
        error(f"{context} is missing a declared blob SHA for {relative}")
        return
    actual = git_blob_sha(relative)
    if actual and actual != expected_sha:
        error(
            f"{context} blob SHA drift for {relative}: declared {expected_sha}, current {actual}"
        )


def validate_contract_provenance(capability_id: str, contract: dict) -> None:
    validated = contract.get("validatedAgainst") if isinstance(contract, dict) else None
    if not isinstance(validated, dict):
        return
    sources = validated.get("sources") or {}
    if not isinstance(sources, dict) or not sources:
        error(f"contract {capability_id} validatedAgainst must contain source blob SHAs")
        return
    for relative, expected_sha in sources.items():
        if isinstance(relative, str) and isinstance(expected_sha, str):
            validate_declared_blob(relative, expected_sha, f"contract {capability_id}")
        else:
            error(f"contract {capability_id} has invalid validatedAgainst source entry: {relative!r}")


def validate_self_test_operations(
    skill_name: str,
    self_test: dict,
    capability: dict,
    contract: dict,
) -> None:
    invocation = capability.get("invocation") or {}
    invocation_type = invocation.get("type")
    tests = self_test.get("tests") or []
    if not isinstance(tests, list) or not tests:
        error(f"portable package {skill_name} self-test contains no tests")
        return

    for test in tests:
        if not isinstance(test, dict):
            error(f"portable package {skill_name} has invalid self-test record: {test!r}")
            continue
        operation = test.get("operation")
        if not isinstance(operation, str) or not operation:
            error(f"portable package {skill_name} self-test has missing operation")
            continue
        if invocation_type == "global-method":
            expected = invocation.get("method") or contract.get("operation")
            if operation != expected:
                error(
                    f"portable package {skill_name} self-test operation {operation} "
                    f"does not match global method {expected}"
                )
            if contract.get("operation") and contract.get("operation") != operation:
                error(
                    f"portable package {skill_name} self-test operation {operation} "
                    f"does not match operation contract {contract.get('operation')}"
                )
        elif invocation_type == "global-dispatch":
            allowed = invocation.get("allowedOperations") or []
            operations = contract.get("operations") or {}
            if operation not in allowed:
                error(
                    f"portable package {skill_name} self-test operation is not capability-allow-listed: {operation}"
                )
            if operation not in operations:
                error(
                    f"portable package {skill_name} self-test operation lacks a canonical contract: {operation}"
                )
        else:
            error(
                f"portable package {skill_name} uses unsupported invocation type for self-test validation: "
                f"{invocation_type!r}"
            )


def validate_portable_package(skill: dict, capability: dict, contract: dict) -> None:
    skill_name = skill.get("name", "<unnamed-skill>")
    manifest_path = derive_manifest_path(skill)
    if not manifest_path:
        return
    manifest_file = ROOT / manifest_path
    if not manifest_file.is_file():
        if skill.get("manifestPath"):
            error(f"skill {skill_name} declares missing companion manifest: {manifest_path}")
        return

    manifest = load_json(manifest_path)
    if manifest.get("packageType") != "hb-agent-skill-companion":
        error(f"portable package {skill_name} has unsupported packageType")
    if (manifest.get("skill") or {}).get("name") != skill_name:
        error(f"portable package {skill_name} manifest skill name mismatch")

    capability_id = (manifest.get("skill") or {}).get("capabilityId")
    if capability_id != capability.get("id"):
        error(
            f"portable package {skill_name} capability mismatch: manifest {capability_id!r}, "
            f"resolved {capability.get('id')!r}"
        )

    runtime = manifest.get("runtime") or {}
    if runtime.get("family") != "javascript" or runtime.get("class") != "browser-js":
        error(f"portable browser package {skill_name} must declare javascript/browser-js runtime")
    if runtime.get("sameOriginOnly") is not True or runtime.get("crossOriginCodeAllowed") is not False:
        error(f"portable package {skill_name} must enforce same-origin-only runtime loading")

    package_scripts = runtime.get("scripts") or []
    capability_scripts = (capability.get("runtime") or {}).get("scripts") or []
    if package_scripts != capability_scripts:
        error(
            f"portable package {skill_name} runtime scripts/order differ from capability registry: "
            f"package={package_scripts!r}, capability={capability_scripts!r}"
        )
    if not package_scripts:
        error(f"portable package {skill_name} declares no runtime scripts")
    for script in package_scripts:
        require_file(script, f"portable package {skill_name} runtime")

    authoritative_path = runtime.get("authoritativePath")
    if authoritative_path not in package_scripts:
        error(
            f"portable package {skill_name} authoritativePath must be one of the canonical runtime scripts"
        )
    expected_global = runtime.get("expectedGlobal")
    if expected_global != (capability.get("invocation") or {}).get("global"):
        error(
            f"portable package {skill_name} expectedGlobal differs from capability invocation global"
        )

    self_test_path = (manifest.get("selfTest") or {}).get("path") or (manifest.get("authorities") or {}).get("selfTest")
    if not isinstance(self_test_path, str) or not self_test_path:
        error(f"portable package {skill_name} does not declare a self-test path")
        return
    require_file(self_test_path, f"portable package {skill_name} self-test")
    if not (ROOT / self_test_path).is_file():
        return

    self_test = load_json(self_test_path)
    if self_test.get("skill") not in (None, skill_name):
        error(f"portable package {skill_name} self-test skill mismatch")
    if self_test.get("capabilityId") != capability.get("id"):
        error(f"portable package {skill_name} self-test capability mismatch")

    self_scripts = self_test.get("runtimeScripts")
    if isinstance(self_scripts, list) and self_scripts:
        if self_scripts != package_scripts:
            error(f"portable package {skill_name} self-test runtimeScripts differ from package scripts/order")
    elif self_test.get("runtimePath"):
        if len(package_scripts) != 1 or self_test.get("runtimePath") != package_scripts[0]:
            error(f"portable package {skill_name} legacy self-test runtimePath does not match package runtime")
    else:
        error(f"portable package {skill_name} self-test declares no runtime path/script set")

    blob_map = self_test.get("runtimeBlobShas")
    if isinstance(blob_map, dict):
        for script in package_scripts:
            expected_sha = blob_map.get(script)
            if not isinstance(expected_sha, str):
                error(f"portable package {skill_name} self-test lacks blob SHA for {script}")
            else:
                validate_declared_blob(script, expected_sha, f"portable package {skill_name} self-test")
    elif isinstance(self_test.get("runtimeBlobSha"), str):
        if len(package_scripts) != 1:
            error(f"portable package {skill_name} single runtimeBlobSha cannot cover multiple runtime scripts")
        else:
            validate_declared_blob(
                package_scripts[0],
                self_test.get("runtimeBlobSha"),
                f"portable package {skill_name} self-test",
            )

    validate_self_test_operations(skill_name, self_test, capability, contract)


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
    capability_by_id = {
        item.get("id"): item
        for item in capabilities
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }

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

        browser_caps = [
            capability_by_id[cid]
            for cid in skill.get("capabilityIds") or []
            if cid in capability_by_id and capability_by_id[cid].get("mode") == "browser-js"
        ]
        derived_manifest = derive_manifest_path(skill)
        if browser_caps and derived_manifest and (ROOT / derived_manifest).is_file():
            if len(browser_caps) != 1:
                error(
                    f"portable package validator currently requires exactly one browser-js capability per package: {name}"
                )
            else:
                cid = browser_caps[0].get("id")
                validate_portable_package(skill, browser_caps[0], contract_caps.get(cid) or {})

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
            else:
                validate_contract_provenance(cid, contract_caps[cid])

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

    harness = ROOT / "ai-skill-test.html"
    if harness.is_file():
        text = harness.read_text(encoding="utf-8")
        options = set(re.findall(r'<option\s+value="([^"]+)"', text))
        for option in options:
            if option not in skill_names:
                error(f"ai-skill-test.html exposes an unregistered skill: {option}")
            skill = next((item for item in skills if isinstance(item, dict) and item.get("name") == option), None)
            if skill:
                manifest_path = derive_manifest_path(skill)
                if not manifest_path or not (ROOT / manifest_path).is_file():
                    error(f"ai-skill-test.html exposes skill without companion manifest: {option}")

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
