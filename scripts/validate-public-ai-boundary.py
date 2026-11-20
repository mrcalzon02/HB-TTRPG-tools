#!/usr/bin/env python3
"""Fail closed when PUBLIC Foundry AI discovery advertises privileged execution.

Scope: the published discovery contract, NOT private runner configuration.
This check cannot prove a remote runner is isolated: audit its separate trust
boundary independently. No external services, credentials or runners are used.
"""
from __future__ import annotations

import json
from pathlib import Path
import posixpath
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_SITE = "https://mrcalzon02.github.io"
PUBLIC_PREFIX = "/HB-TTRPG-tools/"
JSON_FILES = (
    ".well-known/ai-capabilities.json",
    "api/ai/index.json",
    "api/ai/openapi.json",
    "api/ai/skill-onboarding.json",
    "skills/index.json",
)
BOOTSTRAP = "api/ai/bootstrap.txt"


def load_documents(root: Path = ROOT) -> dict:
    result = {}
    for path in JSON_FILES:
        result[path] = json.loads((root / path).read_text(encoding="utf-8"))
    result[BOOTSTRAP] = (root / BOOTSTRAP).read_text(encoding="utf-8")
    return result


def validate_documents(docs: dict) -> list[str]:
    errors: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    def public_url(value: object, label: str) -> None:
        if not isinstance(value, str):
            require(False, f"{label}: expected a public static HTTPS URL")
            return
        parsed = urlsplit(value)
        normalized = posixpath.normpath(unquote(parsed.path))
        require(
            parsed.scheme == "https"
            and parsed.netloc == "mrcalzon02.github.io"
            and parsed.username is None
            and parsed.password is None
            and parsed.path.startswith(PUBLIC_PREFIX)
            and normalized.startswith(PUBLIC_PREFIX)
            and "\\" not in parsed.path
            and not parsed.query and not parsed.fragment,
            f"{label}: must reference a static path on the published Foundry origin",
        )

    def no_transport_record(value: object, label: str) -> None:
        require(isinstance(value, dict), f"{label}: missing explicit disabled transport")
        if not isinstance(value, dict):
            return
        require(value.get("status") in (None, "not-deployed")
                and value.get("deployed", False) is False,
                f"{label}: public execution transport must remain undeployed")
        require(value.get("endpoint") is None, f"{label}: must not publish an execution endpoint")
        for field in ("url", "uri", "server", "command", "dispatch", "rpcUrl", "mcpUrl", "runnerUrl"):
            require(field not in value, f"{label}: prohibited executable transport field {field}")

    discovery = docs.get(".well-known/ai-capabilities.json")
    require(isinstance(discovery, dict), "discovery manifest missing")
    if isinstance(discovery, dict):
        exec_model = discovery.get("executionModel", {})
        require(isinstance(exec_model, dict), "discovery.executionModel missing")
        if isinstance(exec_model, dict):
            require(exec_model.get("origin") == "github-pages-static", "discovery must declare static origin")
            require(exec_model.get("remoteMcpAvailable") is False, "public remoteMcpAvailable must be false")
            require(exec_model.get("remoteRpcAvailable") is False, "public remoteRpcAvailable must be false")
        entrypoints = discovery.get("entrypoints")
        require(isinstance(entrypoints, dict) and bool(entrypoints), "discovery entrypoints missing")
        if isinstance(entrypoints, dict):
            for key, value in entrypoints.items():
                public_url(value, f"discovery.entrypoints.{key}")
            require(not any("runner" in k.lower() or "dispatch" in k.lower() for k in entrypoints),
                    "discovery must not list private runner or dispatch entrypoints")
        transports = discovery.get("transportStatus")
        require(isinstance(transports, list), "discovery transportStatus missing")
        if isinstance(transports, list):
            ids = [x.get("id") for x in transports if isinstance(x, dict)]
            require(len(ids) == len(set(ids)), "discovery transport IDs must be unique")
            for remote_id in ("remote-mcp", "remote-rpc"):
                matches = [x for x in transports if isinstance(x, dict) and x.get("id") == remote_id]
                require(len(matches) == 1, f"discovery must declare exactly one disabled {remote_id}")
                if matches:
                    require(matches[0].get("deployed") is False,
                            f"{remote_id}: deployed must be explicitly false")
                    no_transport_record(matches[0], f"discovery.transportStatus.{remote_id}")
            for item in transports:
                if isinstance(item, dict) and item.get("kind") == "tool-transport":
                    require(item.get("id") in ("remote-mcp", "remote-rpc"),
                            "unreviewed public tool transport advertised")
                    require(item.get("deployed") is False,
                            "public tool transport cannot be deployed")

    ai = docs.get("api/ai/index.json")
    require(isinstance(ai, dict), "AI index missing")
    if isinstance(ai, dict):
        transport = ai.get("transport", {})
        require(isinstance(transport, dict), "AI index transport missing")
        if isinstance(transport, dict):
            for key in ("remoteMcp", "remoteRpc"):
                no_transport_record(transport.get(key), f"AI index transport.{key}")
            for key in transport:
                require(key not in ("privateRunner", "runnerDispatch", "remoteShell"),
                        "private runner capability must not appear in public transport")
        for section in ("absoluteAuthorities", "discovery"):
            values = ai.get(section)
            require(isinstance(values, dict), f"AI index {section} missing")
            if isinstance(values, dict):
                for key, value in values.items():
                    public_url(value, f"AI index {section}.{key}")
        relatives = ai.get("authority", {})
        require(isinstance(relatives, dict), "AI index relative authorities missing")
        if isinstance(relatives, dict):
            for key, value in relatives.items():
                if not isinstance(value, str):
                    require(False, f"AI index authority.{key} must be a relative file")
                    continue
                parsed = urlsplit(value)
                target = posixpath.normpath(posixpath.join("api/ai", value))
                require(not parsed.scheme and not parsed.netloc and not parsed.query
                        and not parsed.fragment and not target.startswith("../")
                        and not target.startswith("/") and target != ".",
                        f"AI index authority.{key} escapes static repository")

    openapi = docs.get("api/ai/openapi.json")
    require(isinstance(openapi, dict), "OpenAPI discovery missing")
    if isinstance(openapi, dict):
        servers = openapi.get("servers")
        require(servers == [{"url": "https://mrcalzon02.github.io/HB-TTRPG-tools"}],
                "OpenAPI servers must list only static GitHub Pages origin")
        state = openapi.get("x-hb-execution-model", {})
        require(isinstance(state, dict), "OpenAPI execution-model declaration missing")
        if isinstance(state, dict):
            require(state.get("remoteRpc") == "not-deployed", "OpenAPI remoteRpc must remain undeployed")
            require(state.get("remoteMcp") == "not-deployed", "OpenAPI remoteMcp must remain undeployed")
        paths = openapi.get("paths")
        require(isinstance(paths, dict) and bool(paths), "OpenAPI GET discovery paths missing")
        if isinstance(paths, dict):
            for route, operations in paths.items():
                require(isinstance(route, str) and route.startswith("/")
                        and not any(token in route.lower() for token in ("runner", "dispatch", "exec", "shell", "workflow")),
                        "prohibited public execution route in OpenAPI")
                require(isinstance(operations, dict) and set(operations) == {"get"},
                        f"OpenAPI route {route} must be GET-only")
                if isinstance(operations, dict) and isinstance(operations.get("get"), dict):
                    get = operations["get"]
                    require("requestBody" not in get and "callbacks" not in get,
                            f"OpenAPI {route} cannot declare executable request bodies/callbacks")

    onboarding = docs.get("api/ai/skill-onboarding.json")
    require(isinstance(onboarding, dict), "Agent Skill onboarding missing")
    if isinstance(onboarding, dict):
        safety = onboarding.get("safetyAndIntegrity", {})
        require(isinstance(safety, dict), "onboarding safety contract missing")
        if isinstance(safety, dict):
            require(safety.get("declarativeInstructionsOnly") is True,
                    "skills must stay declarative")
            require(safety.get("credentialsInSkillFiles") is False,
                    "skill files cannot contain credentials")
            require(safety.get("credentialsExposedToModel") is False,
                    "onboarding cannot expose host credentials")

    skills = docs.get("skills/index.json")
    require(isinstance(skills, dict), "skill index missing")
    if isinstance(skills, dict):
        binding = skills.get("defaultPersonality", {})
        require(isinstance(binding, dict) and binding.get("engramId") == "blacklight.charles"
                and binding.get("required") is True, "registered skills require canonical engram")
        entries = skills.get("skills")
        require(isinstance(entries, list) and bool(entries), "skill registry has no entries")
        if isinstance(entries, list):
            for skill in entries:
                if not isinstance(skill, dict):
                    require(False, "invalid registry skill entry")
                    continue
                require(not any(key in skill for key in ("runnerDispatch", "executionEndpoint", "privateRunner",
                                                          "remoteMcp", "remoteRpc", "shellCommand")),
                        f"skill {skill.get('name')} attempts to advertise privileged transport")

    bootstrap = docs.get(BOOTSTRAP)
    require(isinstance(bootstrap, str) and "GitHub Pages is a static origin" in bootstrap
            and "OpenAPI is discovery" in bootstrap,
            "bootstrap must preserve static-origin and no-execution language")
    return errors


def main() -> None:
    problems = validate_documents(load_documents())
    if problems:
        for problem in problems:
            print("FAIL [public-ai-boundary] " + problem, file=sys.stderr)
        raise SystemExit(f"[public-ai-boundary] {len(problems)} public execution-boundary violation(s)")
    print("PASS [public-ai-boundary] static GET discovery only; no remote MCP/RPC or public runner dispatch")


if __name__ == "__main__":
    main()
