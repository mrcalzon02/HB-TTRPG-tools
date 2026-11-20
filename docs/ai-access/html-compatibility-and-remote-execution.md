# Foundry AI access: readable docs, human handoff, and executable tool transport

**Status (2026-11-19):** Static documentation compatibility mirrors and a limited browser self-test prefill are implemented as source changes. Remote MCP/RPC transport is **not deployed**. This guide records the integration boundary so future work does not confuse discoverability with execution.

## Current architecture

| Surface | Purpose | Authority | Execution available? |
| --- | --- | --- | --- |
| `/.well-known/ai-capabilities.json`, `/api/ai/bootstrap.txt` | Canonical machine bootstrap and routing | Original registry files | No; static GET only |
| `/ai-readable/index.html` and linked HTML pages | Fallback for model browsers that refuse to read JSON/TXT/Markdown | Exact, escaped static projections of the canonical files | No |
| `/agent-skills.html` and individual HTML projections | Skill instructions for restricted readers | `skills/index.json` and `SKILL.md` | No |
| `/ai-skill-test.html?skill=module-map-generation` | Human handoff with whitelisted preselection | Existing browser proof loader and registered capability manifest | Only after the human explicitly clicks "Load and self-test" in a capable browser |
| Separate private control system | Privileged work, if authorized there, is managed independently | Private trust boundary; not exposed through Foundry public manifests | **Not callable by public skills or web readers** |

GitHub Pages can host HTML/JS/JSON but not execute arbitrary server-side code or provide stateful POST/RPC. Even a completely documented operation does not become callable by a remote model until its session has a compatible host and tool registration.

## Reading fallback

- Prefer native `application/json`, Markdown or TXT when the current model host allows it.
- If blocked, use `https://mrcalzon02.github.io/HB-TTRPG-tools/ai-readable/index.html`.
- The fallback directory links to complete static HTML sources, plus smaller, capability-specific operation contracts. All source data is embedded in the initial HTML response; no JavaScript fetch is needed to read it.
- The original machine file remains authoritative. The HTML checksums detect projection drift but do not prove publisher authenticity.
- `robots.txt` allows crawling and `.nojekyll` exists. Neither guarantees that a particular model's browser can access every URL or content type. A model must report individual retrieval failures, not infer a site-wide outage.

## Non-negotiable boundary: public discovery is not private execution

The private runner-control infrastructure is deliberately separated from this public Foundry repository. **There is no authorized bridge from public Agent Skills, GitHub Pages, model browsers, arbitrary chat sessions, or public GitHub events to the private home machines.** Merely reading or installing `SKILL.md`, the Charles engram, a manifest or an HTML mirror never confers runner access.

The following are prohibited for this public project without a separate, explicit security-architecture review and user authorization:

- Publishing a URL, MCP server, action/connector endpoint, webhook, command queue, credential, or `repository_dispatch` path that can trigger a private runner
- Treating signed skill bundles, GitHub repository membership, a model personality, a URL query parameter, or a GitHub Pages page as runner authorization
- Adding a public OpenAPI `POST`/`PUT`/`PATCH`/`DELETE` operation, executable callback, or tool-transport readiness claim
- Routing public tool requests through the separate private runner-control repository, even indirectly via a public GitHub Action

This prohibition is architectural, not a missing implementation step to be filled in automatically. If private automation is pursued in the future, it is designed, authenticated, operated and audited **inside the separate private environment** and does not inherit permission from this public repository. This document deliberately publishes no private topology, host addresses or dispatch instructions.

## Public-side regression safeguards

Run the following locally against the public checkout:

`python3 scripts/validate-public-ai-boundary.py`

`python3 tests/test_public_ai_boundary.py`

The first command checks the actual public discovery manifests, OpenAPI methods, transport status and skill registry for public execution exposure. The second uses synthetic fixtures to ensure expected denial of attempted endpoint publication, public runner-dispatch records, wrong origins, POST methods and credential-bearing declarations. These checks also run in the **existing manually dispatched** static Pages validation job. They do not contact, start, configure or scan private runners.

Static manifest checks cannot prove that a real network is isolated, detect all possible malicious JavaScript, or inspect access controls in a separate repository. Private host/network security must be audited independently, within its own authorized boundary.

## Quality and safety acceptance gates

1. **Readability:** a restricted HTML-only model can retrieve the bootstrap, skill index, engram and selected capability contract from static HTML alone.
2. **Coherence:** `python3 scripts/generate-ai-readable-html.py --check` and `python3 scripts/validate-ai-readable-html.py` confirm exact text, projection hashes and working static links. Regenerate after any canonical registry/engram change.
3. **Truthfulness:** document accessibility does not promote `runtime-required` to `ready`. A missing MCP connector is reported as missing.
4. **Safety:** invalid tool names/parameters, prompt-injection text embedded in public source, unsigned/changed bundles, inaccessible capabilities, and unauthorized or destructive requests fail closed under host policy.
5. **Private execution:** any privileged operation belongs to the separate private control system. No public discovery or skill activation may dispatch runner work, regardless of whether the private system is available.
6. **Compatibility:** verify behavior independently for each intended model platform. HTML readability and registered-tool availability are platform-specific, not guaranteed by publishing metadata.

## Avoiding duplicated logic

**Mirrored calls, not mirrored logic.** Read-only HTML may reproduce documentation content exactly. The actual generator, laboratory, campaign-state, memory, dice, image or FMPL procedure must remain implemented in its canonical runtime. If an AI has code execution, let it invoke the supported implementation through an authorized host rather than asking it to paraphrase formulas and reproduce a competing generator.

**Ownership:** HB-TTRPG-tools provides public discovery, documentation and skill packaging only. Private execution, monitoring, credentials and authorization remain out of scope and outside this repository.
