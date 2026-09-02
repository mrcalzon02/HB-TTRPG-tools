#!/usr/bin/env python3
"""Generate crawlable HTML compatibility projections for registered Agent Skills.

Authority remains skills/index.json and skills/<name>/SKILL.md.
This script mirrors discovery metadata and skill instructions into static HTML.
It does not copy or implement runtime logic.

Usage:
    python scripts/generate-agent-skill-html.py
"""

from __future__ import annotations

from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "skills" / "index.json"
OUTPUT_DIR = ROOT / "agent-skills"
DIRECTORY_PAGE = ROOT / "agent-skills.html"


def frontmatter_value(source: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.*)$", source, re.MULTILINE)
    return match.group(1).strip().strip('"') if match else ""


def version_value(source: str) -> str:
    match = re.search(r'^\s+version:\s*"?(.*?)"?\s*$', source, re.MULTILINE)
    return match.group(1) if match else ""


def title_value(source: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+)$", source, re.MULTILINE)
    return match.group(1).strip() if match else fallback


def code_list(values: list[str]) -> str:
    if not values:
        return '<span class="helper-note">None registered</span>'
    return ", ".join(f"<code>{html.escape(value)}</code>" for value in values)


def render_skill_page(record: dict, source: str) -> str:
    name = record["name"]
    title = title_value(source, name)
    description = frontmatter_value(source, "description")
    compatibility = frontmatter_value(source, "compatibility")
    version = version_value(source)
    skill_path = f"skills/{name}/SKILL.md"
    canonical = f"https://mrcalzon02.github.io/HB-TTRPG-tools/agent-skills/{name}.html"
    github_source = f"https://github.com/mrcalzon02/HB-TTRPG-tools/blob/main/{skill_path}"
    capability_ids = record.get("capabilityIds", [])
    resource_ids = record.get("resourceIds", [])
    laboratory_ids = record.get("laboratoryIds", [])
    status = record.get("status", "discoverable")
    escaped_source = html.escape(source.rstrip() + "\n")

    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} Agent Skill | Calzon’s TTRPG Foundry</title>
<meta name="description" content="{html.escape(description, quote=True)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{canonical}">
<link rel="alternate" type="text/markdown" href="../{skill_path}" title="Authoritative SKILL.md">
<link rel="alternate" type="application/json" href="../skills/index.json" title="Authoritative Agent Skills Registry">
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="../workspace-landing.css">
<style>pre{{white-space:pre-wrap;overflow-wrap:anywhere}}main{{max-width:1100px;margin:auto;padding:1rem}}</style>
</head>
<body>
<header class="site-header"><div><p class="eyebrow">Machine / AI Access · Agent Skill</p><h1>{html.escape(title)}</h1><p class="subtitle">{html.escape(description)}</p></div>
<nav class="top-nav"><a class="nav-button" href="../agent-skills.html">All Agent Skills</a><a class="nav-button" href="../ai-access.html">AI Access</a><a class="nav-button" href="../index.html">Foundry Home</a></nav></header>
<main>
<section class="hero-card">
<p><strong>HTML compatibility projection.</strong> Authority remains <code>{skill_path}</code> and <code>skills/index.json</code>. This page mirrors instructions and discovery metadata only; it does not duplicate runtime logic or create an execution transport.</p>
<p><a class="link-button primary-action" href="../{skill_path}">Authoritative SKILL.md</a> <a class="link-button" href="{github_source}">GitHub HTML source</a></p>
</section>
<section class="registry-section"><h2>Registered integration metadata</h2>
<p><strong>Name:</strong> <code>{html.escape(name)}</code> · <strong>Status:</strong> <code>{html.escape(status)}</code> · <strong>Version:</strong> <code>{html.escape(version)}</code></p>
<p><strong>Capability IDs:</strong> {code_list(capability_ids)}</p>
<p><strong>Resource IDs:</strong> {code_list(resource_ids)}</p>
<p><strong>Laboratory IDs:</strong> {code_list(laboratory_ids)}</p>
<p><strong>Compatibility:</strong> {html.escape(compatibility)}</p>
<p>Exact operation signatures remain authoritative in <a href="../api/operation-contracts.json">operation-contracts.json</a> and runtime/status declarations in <a href="../api/foundry-capabilities.json">foundry-capabilities.json</a>.</p>
</section>
<section class="registry-section"><h2>Complete SKILL.md projection</h2>
<p>The following is the complete current skill document escaped into ordinary HTML for restricted model browsers.</p>
<pre class="module-card">{escaped_source}</pre>
</section>
</main>
<footer class="site-footer"><p><a href="../agent-skills.html">Agent Skills directory</a> · <a href="../skills/index.json">Authoritative registry</a> · <a href="../.well-known/ai-capabilities.json">AI discovery</a></p></footer>
</body>
</html>
'''


def render_directory(records: list[dict]) -> str:
    items = []
    cards = []
    for position, record in enumerate(records, 1):
        name = record["name"]
        status = record.get("status", "discoverable")
        items.append({
            "@type": "ListItem",
            "position": position,
            "name": name,
            "url": f"https://mrcalzon02.github.io/HB-TTRPG-tools/agent-skills/{name}.html",
        })
        cards.append(
            f'      <article class="module-card" data-skill-name="{html.escape(name)}"><h3><a href="agent-skills/{html.escape(name)}.html"><code>{html.escape(name)}</code></a></h3><p><strong>Status:</strong> <code>{html.escape(status)}</code></p><p><a class="link-button primary-action" href="agent-skills/{html.escape(name)}.html">Open HTML Skill Projection</a> <a class="link-button" href="skills/{html.escape(name)}/SKILL.md">SKILL.md</a></p></article>'
        )

    structured = json.dumps({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Calzon's TTRPG Foundry Agent Skills",
        "numberOfItems": len(records),
        "itemListElement": items,
    }, separators=(",", ":"))

    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Skills Directory | Calzon’s TTRPG Foundry</title>
  <meta name="description" content="HTML compatibility directory for the {len(records)} authoritative Agent Skills registered by Calzon’s TTRPG Foundry.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://mrcalzon02.github.io/HB-TTRPG-tools/agent-skills.html">
  <link rel="alternate" type="application/json" href="skills/index.json" title="Authoritative Agent Skills Registry">
  <link rel="alternate" type="application/json" href=".well-known/ai-capabilities.json" title="Foundry AI Capability Discovery">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="workspace-landing.css">
  <script type="application/ld+json">{structured}</script>
</head>
<body>
<header class="site-header"><div><p class="eyebrow">Machine / AI Access</p><h1>Agent Skills Directory</h1><p class="subtitle">Crawlable HTML compatibility surfaces for restricted AI browsing environments.</p></div><nav class="top-nav" aria-label="Agent Skills navigation"><a class="nav-button" href="index.html">Foundry Home</a><a class="nav-button" href="ai-access.html">AI Access</a><a class="nav-button" href="skills/index.json">Authoritative JSON Registry</a><a class="nav-button" href="ai-skill-test.html">Portable Skill Test</a></nav></header>
<main class="workspace-shell">
  <section class="hero-card"><p class="eyebrow">Agent Skills standard · registry schema {html.escape(str(registry.get('schemaVersion', '')))}</p><h2>{len(records)} registered Agent Skills</h2><p><strong>Authority rule:</strong> <code>skills/index.json</code> and each <code>skills/&lt;name&gt;/SKILL.md</code> remain authoritative. These HTML pages are compatibility projections only. If a projection disagrees with its source, the authoritative source wins.</p><p><strong>Agent instruction:</strong> open the HTML projection when raw JSON or Markdown is unavailable. Each projection contains the complete escaped current <code>SKILL.md</code>, registered integration metadata, compatibility requirements, and links back to the authoritative sources. HTML availability does not imply runtime readiness.</p></section>
  <section class="registry-section"><div class="section-heading"><p class="eyebrow">Exact registry projection</p><h2>Registered skills</h2><p>No generator, calculator, laboratory, campaign, or encryption logic is duplicated here.</p></div><div class="module-grid">
{chr(10).join(cards)}
  </div></section>
</main>
<footer class="site-footer"><p><a href="ai-access.html">AI Access</a> · <a href="skills/index.json">Authoritative JSON registry</a> · <a href=".well-known/ai-capabilities.json">AI capability discovery</a></p></footer>
</body>
</html>
'''


def main() -> None:
    global registry
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    records = registry.get("skills", [])
    if not records:
        raise SystemExit("No skills found in skills/index.json")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for record in records:
        name = record["name"]
        source_path = ROOT / record["path"]
        source = source_path.read_text(encoding="utf-8")
        declared_name = frontmatter_value(source, "name")
        if declared_name != name:
            raise SystemExit(f"Registry/SKILL name mismatch: {name!r} vs {declared_name!r}")
        (OUTPUT_DIR / f"{name}.html").write_text(render_skill_page(record, source), encoding="utf-8")
    DIRECTORY_PAGE.write_text(render_directory(records), encoding="utf-8")
    print(f"Generated {len(records)} Agent Skill HTML projections and {DIRECTORY_PAGE.name}.")


if __name__ == "__main__":
    main()
