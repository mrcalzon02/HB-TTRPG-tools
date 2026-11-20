# Foundry AI access: readable docs, human handoff, and executable tool transport

**Status (2026-11-19):** Static documentation compatibility mirrors and a limited browser self-test prefill are implemented as source changes. Remote MCP/RPC transport is **not deployed**. This guide records the integration boundary so future work does not confuse discoverability with execution.

## Current architecture

| Surface | Purpose | Authority | Execution available? |
| --- | --- | --- | --- |
| `/.well-known/ai-capabilities.json`, `/api/ai/bootstrap.txt` | Canonical machine bootstrap and routing | Original registry files | No; static GET only |
| `/ai-readable/index.html` and linked HTML pages | Fallback for model browsers that refuse to read JSON/TXT/Markdown | Exact, escaped static projections of the canonical files | No |
| `/agent-skills.html` and individual HTML projections | Skill instructions for restricted readers | `skills/index.json` and `SKILL.md` | No |
| `/ai-skill-test.html?skill=module-map-generation` | Human handoff with whitelisted preselection | Existing browser proof loader and registered capability manifest | Only after the human explicitly clicks "Load and self-test" in a capable browser |
| Local runtime/LCI or an authorized MCP server | Execute registered tools and return observed results | Registry + operation contracts + host policies + explicit transport permissions | **Planned**, not deployed on GitHub Pages |

GitHub Pages can host HTML/JS/JSON but not execute arbitrary server-side code or provide stateful POST/RPC. Even a completely documented operation does not become callable by a remote model until its session has a compatible host and tool registration.

## Reading fallback

- Prefer native `application/json`, Markdown or TXT when the current model host allows it.
- If blocked, use `https://mrcalzon02.github.io/HB-TTRPG-tools/ai-readable/index.html`.
- The fallback directory links to complete static HTML sources, plus smaller, capability-specific operation contracts. All source data is embedded in the initial HTML response; no JavaScript fetch is needed to read it.
- The original machine file remains authoritative. The HTML checksums detect projection drift but do not prove publisher authenticity.
- `robots.txt` allows crawling and `.nojekyll` exists. Neither guarantees that a particular model's browser can access every URL or content type. A model must report individual retrieval failures, not infer a site-wide outage.

## Minimum-authority execution bridge: proposed phases

**Tier 1 — local connector / LCI (preferred initial deployment):**

1. Run a host-controlled MCP tool server over local stdio (or an authenticated local-only endpoint) on the self-hosted runner. Register it explicitly with the model host; downloading an engram is not tool registration.
2. Expose **read-only** discovery tools: `foundry.catalog` and `foundry.describe`. These proxy canonical capability identities, statuses and operation contracts. They do not reconstruct generator logic.
3. Add `foundry.invoke` only for explicitly allowlisted capabilities whose required runtime is available. Validate operation IDs, argument types, host permissions and resource budgets. No arbitrary shell command, script URL or free-form Python execution.
4. Bind each session to the verified Charles engram/skill registry where appropriate, but keep authority with host/system policy and the tool allowlist. An engram alone is not an anti-rogue-agent security boundary.
5. Return structured results with observed run ID, capability/version, inputs or deterministic seed, runtime class, status, tool output, artifact paths/hashes, timing, and error reason. Never claim a run succeeded based on a prompt or simulated result.
6. Use explicit opt-in for mutable, destructive, networked, private-data, or costly operations. Support bounded tasks, cancellation, idempotency keys, retries, and real readback evidence.

**Tier 2 — authenticated remote integration (future):**

- Only after the local transport passes the tool and permission matrix, consider a networked Streamable-HTTP MCP endpoint or equivalent REST adapter. Use access control (short-lived scoped tokens or equivalent, TLS and preferably a trusted private network).
- Do **not** expose an unauthenticated public tool endpoint from the static Pages origin, and do not put private credentials or signing keys into `SKILL.md` or the engram.
- Where an AI provider supports explicit connector/action registration, register the exact external tool there. If a provider's browsing environment does not offer tool registration, the result is documentation and handoff links, not remote execution.
- Browser-side URL parameters may prefill only explicitly supported application fields. They must not auto-approve work, activate arbitrary tools or be presented as privileged remote APIs.

## Quality and safety acceptance gates

1. **Readability:** a restricted HTML-only model can retrieve the bootstrap, skill index, engram and selected capability contract from static HTML alone.
2. **Coherence:** `python3 scripts/generate-ai-readable-html.py --check` and `python3 scripts/validate-ai-readable-html.py` confirm exact text, projection hashes and working static links. Regenerate after any canonical registry/engram change.
3. **Truthfulness:** document accessibility does not promote `runtime-required` to `ready`. A missing MCP connector is reported as missing.
4. **Safety:** invalid tool names/parameters, prompt-injection text embedded in public source, unsigned/changed bundles, inaccessible capabilities, and unauthorized or destructive requests fail closed under host policy.
5. **Execution:** a successful local tool response has a real operation result, host identity, bounded job ID and artifact/commit readback. Test on the intended headful/headless runners before claiming remote availability.
6. **Compatibility:** verify behavior independently for each intended model platform. HTML readability and registered-tool availability are platform-specific, not guaranteed by publishing metadata.

## Avoiding duplicated logic

**Mirrored calls, not mirrored logic.** Read-only HTML may reproduce documentation content exactly. The actual generator, laboratory, campaign-state, memory, dice, image or FMPL procedure must remain implemented in its canonical runtime. If an AI has code execution, let it invoke the supported implementation through an authorized host rather than asking it to paraphrase formulas and reproduce a competing generator.

**Ownership:** HB-TTRPG-tools provides discovery, docs and skill packaging; the LCI runner/MCP service will own execution, monitoring, secrets and permissions after separate development and proof.
