#!/usr/bin/env python3
"""Local positive/negative public discovery checks; no runners or GitHub actions."""
from __future__ import annotations
import copy
import importlib.util
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / "scripts" / "validate-public-ai-boundary.py"
spec = importlib.util.spec_from_file_location("public_boundary", MODULE)
assert spec and spec.loader
boundary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boundary)
BASE = "https://mrcalzon02.github.io/HB-TTRPG-tools/"


def fixture():
    return {
        ".well-known/ai-capabilities.json": {
            "executionModel": {"origin": "github-pages-static", "remoteMcpAvailable": False, "remoteRpcAvailable": False},
            "entrypoints": {"aiIndex": BASE + "api/ai/index.json"},
            "transportStatus": [
                {"id": "static-get", "kind": "resource", "status": "ready"},
                {"id": "remote-mcp", "kind": "tool-transport", "deployed": False},
                {"id": "remote-rpc", "kind": "tool-transport", "deployed": False},
            ],
        },
        "api/ai/index.json": {
            "transport": {"remoteMcp": {"status": "not-deployed", "endpoint": None},
                          "remoteRpc": {"status": "not-deployed", "endpoint": None}},
            "absoluteAuthorities": {"skills": BASE + "skills/index.json"},
            "discovery": {"bootstrap": BASE + "api/ai/bootstrap.txt"},
            "authority": {"skills": "../../skills/index.json"},
        },
        "api/ai/openapi.json": {
            "servers": [{"url": BASE.rstrip("/")}],
            "x-hb-execution-model": {"remoteMcp": "not-deployed", "remoteRpc": "not-deployed"},
            "paths": {"/skills/index.json": {"get": {"operationId": "getSkills"}}},
        },
        "api/ai/skill-onboarding.json": {"safetyAndIntegrity": {
            "declarativeInstructionsOnly": True, "credentialsInSkillFiles": False,
            "credentialsExposedToModel": False,
        }},
        "skills/index.json": {"defaultPersonality": {"engramId": "blacklight.charles", "required": True},
                              "skills": [{"name": "foundry-discovery", "path": "skills/foundry-discovery/SKILL.md"}]},
        "api/ai/bootstrap.txt": "GitHub Pages is a static origin. OpenAPI is discovery, not a remote backend.",
    }


class PublicBoundaryTests(unittest.TestCase):
    def test_unprivileged_discovery_passes(self):
        self.assertEqual(boundary.validate_documents(fixture()), [])

    def test_block_unauthorized_public_execution(self):
        mutations = [
            ("MCP-enabled", lambda d: d[".well-known/ai-capabilities.json"]["executionModel"].update(remoteMcpAvailable=True)),
            ("RPC-enabled", lambda d: d[".well-known/ai-capabilities.json"]["executionModel"].update(remoteRpcAvailable=True)),
            ("remote-transport-deployed", lambda d: d[".well-known/ai-capabilities.json"]["transportStatus"][1].update(deployed=True)),
            ("extra-tool-transport", lambda d: d[".well-known/ai-capabilities.json"]["transportStatus"].append({"id": "remote-shell", "kind": "tool-transport", "deployed": False})),
            ("runner-discovery-entrypoint", lambda d: d[".well-known/ai-capabilities.json"]["entrypoints"].update(runnerDispatch=BASE + "api/ai/dispatch.json")),
            ("localhost-entrypoint", lambda d: d[".well-known/ai-capabilities.json"]["entrypoints"].update(aiIndex="http://localhost:9999/call")),
            ("query-token-entrypoint", lambda d: d[".well-known/ai-capabilities.json"]["entrypoints"].update(aiIndex=BASE + "api/ai/index.json?token=secret")),
            ("external-entrypoint", lambda d: d[".well-known/ai-capabilities.json"]["entrypoints"].update(aiIndex="https://other.example/index.json")),
            ("active-mcp-endpoint", lambda d: d["api/ai/index.json"]["transport"]["remoteMcp"].update(endpoint="http://192.168.1.50:8000/execute")),
            ("contradictory-mcp-deployment", lambda d: d["api/ai/index.json"]["transport"]["remoteMcp"].update(deployed=True)),
            ("encoded-url-escape", lambda d: d[".well-known/ai-capabilities.json"]["entrypoints"].update(aiIndex=BASE + "%2e%2e/private")),
            ("active-rpc-status", lambda d: d["api/ai/index.json"]["transport"]["remoteRpc"].update(status="ready")),
            ("private-transport-key", lambda d: d["api/ai/index.json"]["transport"].update(runnerDispatch={"endpoint": "private"})),
            ("relative-path-traversal", lambda d: d["api/ai/index.json"]["authority"].update(skills="../../../secrets")),
            ("remote-openapi-server", lambda d: d["api/ai/openapi.json"]["servers"].append({"url": "https://runner.example"})),
            ("public-POST", lambda d: d["api/ai/openapi.json"]["paths"]["/skills/index.json"].update(post={})),
            ("public-callback", lambda d: d["api/ai/openapi.json"]["paths"]["/skills/index.json"]["get"].update(callbacks={})),
            ("remote-openapi-advertisement", lambda d: d["api/ai/openapi.json"]["x-hb-execution-model"].update(remoteMcp="ready")),
            ("credentials-in-skills", lambda d: d["api/ai/skill-onboarding.json"]["safetyAndIntegrity"].update(credentialsInSkillFiles=True)),
            ("skill-execution-endpoint", lambda d: d["skills/index.json"]["skills"][0].update(executionEndpoint="https://runner.example/jobs")),
            ("missing-static-bootstrap", lambda d: d.update({"api/ai/bootstrap.txt": "Now has a backend!"})),
        ]
        for name, mutation in mutations:
            with self.subTest(name=name):
                value = copy.deepcopy(fixture())
                mutation(value)
                reasons = boundary.validate_documents(value)
                self.assertTrue(reasons, f"{name}: boundary violation was accepted")


if __name__ == "__main__":
    unittest.main(verbosity=2)
