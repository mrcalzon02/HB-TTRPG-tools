#!/usr/bin/env python3
"""Generate exact static HTML mirrors of Foundry AI machine-readable authorities.

Restrictive model browsers may read HTML but not raw JSON/Markdown/text. Mirror
canonical source bytes as escaped, visible text in initial HTML, without JavaScript,
API requests, or duplicated execution logic.

Usage:
  python3 scripts/generate-ai-readable-html.py
  python3 scripts/generate-ai-readable-html.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "ai-readable"
BASE = "https://mrcalzon02.github.io/HB-TTRPG-tools/"
AUTHORITIES = (
    ("llms", "LLM discovery and routing", "llms.txt", "Starting route and human-readable agent guidance"),
    ("bootstrap", "AI bootstrap contract", "api/ai/bootstrap.txt", "Mandatory discovery and execution boundaries"),
    ("discovery", "AI discovery manifest", ".well-known/ai-capabilities.json", "Top-level canonical machine entrypoints"),
    ("ai-index", "AI integration index", "api/ai/index.json", "AI routing, transport classes and declarations"),
    ("onboarding", "Agent Skill onboarding", "api/ai/skill-onboarding.json", "Onboarding and external-model compatibility guidance"),
    ("status", "Capability status vocabulary", "api/ai/status-vocabulary.json", "Meaning of discovery, compatibility and readiness statuses"),
    ("skills", "Registered Agent Skills index", "skills/index.json", "All registered optional skills, engram binding and requirements"),
    ("handoff-schema", "Agent checkpoint handoff schema", "api/ai/agent-handoff.schema.json", "Portable source-grounded task checkpoint contract; no privileges or persistence"),
    ("handoff-example", "Agent checkpoint handoff example", "api/ai/examples/agent-handoff.json", "Synthetic checkpoint example with no private data or execution authority"),
    ("handoff-observations", "Agent source revision observations", "api/ai/examples/agent-source-observations.json", "Caller-provided revision equality fixture; not authenticated source freshness"),
    ("reopening-request", "Completed-step reopening request", "api/ai/examples/agent-reopening-request.json", "Synthetic request to revisit completed work while preserving original evidence"),
    ("reviewed-reopening", "Self-declared reopening review claim", "api/ai/examples/agent-reviewed-reopening.json", "Synthetic review claim; never proof of real host authorization"),
    ("timed-review", "Time-bounded self-declared review", "api/ai/examples/agent-timed-review.json", "Synthetic review with an explicit UTC time window; never an authorization"),
    ("superseded-review", "Superseded review claim", "api/ai/examples/agent-superseded-review.json", "Synthetic append-only review invalidation requiring independent recheck"),
    ("capabilities", "Foundry capability registry", "api/foundry-capabilities.json", "Canonical capability identifiers and runtime details"),
    ("contracts", "Operation contracts", "api/operation-contracts.json", "Exact allowed operation signatures and constraints"),
    ("resources", "Resource collections", "api/resource-collections.json", "Canonical static and lore resource identities"),
    ("openapi", "Static OpenAPI discovery", "api/ai/openapi.json", "GET-only discovery, no remote execution server"),
    ("acceptance", "External-model acceptance tests", "api/ai/external-model-acceptance-tests.json", "Declared test cases, not evidence of execution"),
    ("charles", "Charles personality engram", "docs/blacklight/charles-personality-engram.json", "Canonical passive blacklight.charles engram"),
    ("charles-manifest", "Charles engram manifest", "docs/blacklight/charles-personality-engram-manifest.json", "Engram discovery and registry companion"),
    ("fmpl", "FMPL shared asset library", "api/ai/fmpl-library.json", "Canonical shared Factorio modeling resource index"),
)

STYLE = """body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55;
background:#11141a;color:#edf0f4;margin:0}main,header,footer{max-width:1120px;
margin:auto;padding:1rem 1.25rem}a{color:#9ac7ff}a:focus-visible{outline:2px solid #fff}
a:hover{text-decoration-thickness:2px}h1{font-size:1.55rem}h2{font-size:1.2rem}
p{max-width:82ch}.meta{color:#c9cdd5}pre{white-space:pre-wrap;overflow-wrap:anywhere;
background:#1c222c;color:#eef2f8;border:1px solid #4f6072;padding:1rem;
border-radius:.4rem;line-height:1.55;font-size:.86rem}
li{margin:.5rem 0}nav{display:flex;flex-wrap:wrap;gap:1rem}code{overflow-wrap:anywhere}"""


def digest(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def escape(value: str) -> str:
    return html.escape(value, quote=True)


def render_page(slug: str, title: str, source: str, description: str, payload: str) -> str:
    url = BASE + "ai-readable/" + slug + ".html"
    source_url = BASE + source
    source_digest = digest(payload)
    nested = slug.startswith("contracts/")
    home = "../../" if nested else "../"
    directory = "../index.html" if nested else "index.html"
    source_heading = "Canonical capability contract slice" if nested else "Complete canonical source projection"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<meta name="description" content="{escape(description)}">
<meta name="hb-projection-sha256" content="{source_digest}">
<meta name="hb-source-path" content="{escape(source)}">
<link rel="canonical" href="{escape(url)}">
<title>{escape(title)} — Foundry AI-readable mirror</title>
<style>{STYLE}</style>
</head>
<body>
<header>
<nav aria-label="AI documentation"><a href="{directory}">AI-readable directory</a><a href="{home}ai-access.html">AI Access</a><a href="{home}agent-skills.html">Agent Skills</a></nav>
<h1>{escape(title)}</h1>
<p>{escape(description)}</p>
</header>
<main>
<p><strong>Static HTML compatibility mirror.</strong> Canonical source: <a href="{escape(source_url)}"><code>{escape(source)}</code></a>. The content below is generated directly from that source, not reconstructed by an AI and not executed by this page. When discrepancies occur, the canonical source wins.</p>
<p class="meta"><strong>Displayed projection SHA-256:</strong> <code>{source_digest}</code>. The checksum detects projection drift; it is not independent publisher authentication.</p>
<p><strong>Execution boundary:</strong> GitHub Pages serves static resources. This document does not grant a model tools, credentials, permission to run software, or remote MCP/REST execution. Tool calls require an explicitly connected compatible host.</p>
<h2>{source_heading}</h2>
<pre id="canonical-source" data-projection-sha256="{source_digest}">{escape(payload)}</pre>
</main>
<footer><p>Mirrored data only · <a href="{directory}">Browse additional AI authorities</a> · <a href="{home}docs/engram-skill-bidirectional-binding.md">Engram/skill binding</a></p></footer>
</body>
</html>
"""


def render_index() -> str:
    rows = "\n".join(
        f'<li><a href="{slug}.html">{escape(title)}</a> — {escape(summary)} '
        f'(<code>{escape(source)}</code>)</li>'
        for slug, title, source, summary in AUTHORITIES
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<meta name="description" content="Static HTML mirrors of Foundry machine documentation for restrictive AI readers.">
<link rel="canonical" href="{BASE}ai-readable/index.html">
<title>AI-readable Foundry documentation</title>
<style>{STYLE}</style>
</head>
<body>
<header><nav aria-label="Foundry"><a href="../ai-access.html">AI Access</a><a href="../agent-skills.html">Agent Skills</a><a href="../index.html">Foundry home</a></nav>
<h1>Foundry AI-readable documentation</h1>
<p>Human- and model-readable <strong>initial HTML</strong> snapshots of authoritative machine files. No JavaScript is needed to read any page.</p></header>
<main>
<h2>Required distinction: reading versus executing</h2>
<p><strong>Reading:</strong> use these static pages when the receiving model cannot retrieve a raw JSON, Markdown or TXT document. Each page embeds the complete escaped source and a drift-detection checksum.</p>
<p><strong>Executing:</strong> this static origin has no deployed remote MCP or RPC runtime. A model must use an explicitly authorized local runner, registered MCP server, compatible browser JavaScript host or other approved tool. Never claim an operation ran because a contract is readable.</p>
<p><strong>Engram:</strong> registered skills require the reciprocal canonical Charles engram and skill registry. Neither grants tools or overrides host/system policy. Select individual skills only as needed.</p>
<h2>Canonical machine authorities — full static HTML mirrors</h2>
<ol>
{rows}
</ol>
<h2>Smaller operation-contract views</h2>
<p>For restrictive readers that truncate the full operation-contract registry, use the <a href="contracts-index.html">per-capability contract directory</a>. These are generated slices of the canonical registry, not separate operation definitions.</p>
<h2>Supported human handoff: portable browser self-test</h2>
<p>These links preselect one of the three registered browser-JavaScript proof packages. They never run a test automatically: <a href="../ai-skill-test.html?skill=module-map-generation">module map</a>, <a href="../ai-skill-test.html?skill=alien-vessel-generation">alien vessel</a>, or <a href="../ai-skill-test.html?skill=binary-cube-laboratory">Binary Cube laboratory</a>. The user must choose to run the self-test in a compatible browser.</p>
<h2>Handoff and limitations</h2>
<p>Browsers and models differ in which URL types they permit. A model may be able to read this HTML without having any permission to call an operation. For a human handoff, prefer an existing registered page or application link; query parameters are valid only where the real application explicitly supports them. No speculative remote execution links are published.</p>
<p>Machine clients that can consume native formats should prefer the original <a href="../.well-known/ai-capabilities.json">discovery JSON</a>, <a href="../api/ai/bootstrap.txt">bootstrap contract</a> and <a href="../skills/index.json">skill index</a>.</p>
</main>
<footer><p>Mirror generator: <code>scripts/generate-ai-readable-html.py</code>. Validate with <code>python3 scripts/generate-ai-readable-html.py --check</code>.</p></footer>
</body>
</html>
"""


def contract_slug(capability_id: str) -> str:
    name = capability_id.replace(".", "-")
    if not re.fullmatch(r"[a-z0-9-]+", name):
        raise ValueError("Unsafe operation contract ID: " + capability_id)
    return name


def contract_pages() -> dict[str, str]:
    registry = json.loads((ROOT / "api/operation-contracts.json").read_text(encoding="utf-8"))
    contracts = registry.get("capabilities")
    if not isinstance(contracts, dict) or not contracts:
        raise ValueError("Operation contract registry contains no capabilities")
    pages = {}
    rows = []
    for capability_id, contract in contracts.items():
        slug = contract_slug(capability_id)
        if slug in pages:
            raise ValueError("Contract slug collision: " + slug)
        payload = json.dumps(
            {"source": "api/operation-contracts.json", "capabilityId": capability_id, "contract": contract},
            ensure_ascii=False, indent=2
        ) + "\n"
        path = f"contracts/{slug}"
        pages[f"{path}.html"] = render_page(
            path, "Operation contract: " + capability_id, "api/operation-contracts.json",
            "Canonical contract slice for " + capability_id, payload
        )
        rows.append(f'<li><a href="contracts/{slug}.html"><code>{escape(capability_id)}</code></a></li>')
    pages["contracts-index.html"] = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{BASE}ai-readable/contracts-index.html">
<title>Foundry operation-contract slices</title><style>{STYLE}</style></head>
<body><header><nav><a href="index.html">AI-readable directory</a><a href="contracts.html">Full contracts</a></nav>
<h1>Operation contracts by registered capability</h1><p>Generated slices of <code>api/operation-contracts.json</code>. The complete canonical registry remains authoritative.</p></header>
<main><ol>{''.join(rows)}</ol>
<p>These documents describe operation signatures and constraints only. No remote execution endpoint is implied.</p></main></body></html>
"""
    return pages


def generate() -> dict[str, str]:
    outputs = {"index.html": render_index()}
    for slug, title, source_path, description in AUTHORITIES:
        content = (ROOT / source_path).read_text(encoding="utf-8")
        if source_path.endswith(".json"):
            json.loads(content)
        outputs[slug + ".html"] = render_page(slug, title, source_path, description, content)
    outputs.update(contract_pages())
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail when a committed HTML mirror is stale")
    args = parser.parse_args()
    outputs = generate()
    if args.check:
        problems = []
        for name, expected in outputs.items():
            path = OUTPUT / name
            if not path.is_file() or path.read_text(encoding="utf-8") != expected:
                problems.append(name)
        existing = {p.relative_to(OUTPUT).as_posix() for p in OUTPUT.rglob("*.html")}
        problems.extend(sorted(existing - set(outputs)))
        if problems:
            for item in problems:
                print("STALE [ai-readable] " + item, file=sys.stderr)
            raise SystemExit(f"[ai-readable] {len(problems)} missing, stale or unexpected mirror(s)")
        print(f"PASS [ai-readable] {len(outputs)} static HTML pages exactly match canonical sources")
        return
    for name, content in outputs.items():
        file = OUTPUT / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
    print(f"[ai-readable] generated {len(outputs)} static HTML documentation mirrors")


if __name__ == "__main__":
    main()
