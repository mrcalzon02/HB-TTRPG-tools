#!/usr/bin/env python3
"""Offline acceptance tests for AI-readable static machine-documentation mirrors.

Checks exact generator output, canonical source text, checksums, safe navigation
and execution-boundary statements. Never uses the network or runs browser code.
Run from the repository root:
    python3 scripts/validate-ai-readable-html.py
"""
from __future__ import annotations

import hashlib
import html
import importlib.util
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
GENERATE = ROOT / "scripts/generate-ai-readable-html.py"
DIR = ROOT / "ai-readable"
PATTERN = re.compile(
    r'<pre id="canonical-source" data-projection-sha256="([a-f0-9]{64})">'
    r'([\s\S]*?)</pre>'
)


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[ai-readable] " + message)


def load_generator():
    spec = importlib.util.spec_from_file_location("hb_ai_readable_generator", GENERATE)
    ensure(spec is not None and spec.loader is not None, "generator not importable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    gen = load_generator()
    outputs = gen.generate()
    ensure(len(outputs) >= 25, "missing required initial source mirrors or contract slices")
    actual = {x.relative_to(DIR).as_posix() for x in DIR.rglob("*.html")}
    ensure(actual == set(outputs), "HTML mirror inventory does not match generator")
    for relative, expected in outputs.items():
        path = DIR / relative
        ensure(path.read_text(encoding="utf-8") == expected, "stale or altered mirror: " + relative)
        ensure("<script" not in expected.lower(), "initial HTML mirror contains active JavaScript: " + relative)
        ensure("remote MCP or RPC runtime" in expected or
               "remote execution" in expected or
               "<strong>Execution boundary:</strong>" in expected or
               "no deployed remote MCP or RPC" in expected or
               "No remote execution endpoint" in expected or
               "reading versus executing" in expected,
               "page lacks execution boundary notice: " + relative)

        # Check local links resolve as committed files, not as imagined services.
        for href in re.findall(r'<a href="([^"]+)"', expected):
            url = urlsplit(href)
            if url.scheme or url.netloc or href.startswith("#"):
                continue
            target = (path.parent / url.path).resolve()
            ensure(target.is_relative_to(ROOT.resolve()), "link escapes repo: " + relative + " -> " + href)
            ensure(target.is_file(), "broken local link: " + relative + " -> " + href)

    index = (DIR / "index.html").read_text(encoding="utf-8")
    ensure("ai-skill-test.html?skill=module-map-generation" in index, "human handoff missing")
    for slug, *_ in gen.AUTHORITIES:
        ensure(f'href="{slug}.html"' in index, "source not discoverable: " + slug)

    contract_registry = json.loads((ROOT / "api/operation-contracts.json").read_text(encoding="utf-8"))
    expected_contracts = contract_registry["capabilities"]
    contracts_index = (DIR / "contracts-index.html").read_text(encoding="utf-8")
    for capability_id, contract in expected_contracts.items():
        slug = gen.contract_slug(capability_id)
        expected_name = f"contracts/{slug}.html"
        ensure(f'href="{expected_name}"' in contracts_index, "unreachable contract page: " + capability_id)
        payload = json.dumps(
            {"source": "api/operation-contracts.json", "capabilityId": capability_id, "contract": contract},
            ensure_ascii=False, indent=2,
        ) + "\n"
        check_projection(expected_name, payload)

    for slug, _title, source, _desc in gen.AUTHORITIES:
        payload = (ROOT / source).read_text(encoding="utf-8")
        check_projection(slug + ".html", payload)

    print(f"PASS [ai-readable] {len(outputs)} static HTML pages, full payloads, SHA-256 hashes, local links and execution boundaries")


def check_projection(relative: str, source: str) -> None:
    page = (DIR / relative).read_text(encoding="utf-8")
    match = PATTERN.search(page)
    ensure(match is not None, "missing initial HTML source projection: " + relative)
    expected_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
    ensure(match.group(1) == expected_hash, "incorrect displayed projection SHA-256: " + relative)
    ensure(html.unescape(match.group(2)) == source, "incomplete or altered source projection: " + relative)
    ensure(f'<meta name="hb-projection-sha256" content="{expected_hash}">' in page,
           "page metadata digest mismatch: " + relative)


if __name__ == "__main__":
    main()
