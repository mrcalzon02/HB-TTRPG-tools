# Engram-bound Agent Skills — expansion backlog

**Status:** two static workflows accepted; other candidates remain planning only · **Authority:** HB-TTRPG-tools / Calzon Foundry · **Updated:** 2026-11-20

The canonical `blacklight.charles` engram now advertises the mandatory `skills/index.json` discovery index. All 51 currently registered Agent Skills declare the required engram and reciprocal index; individual skills remain optional selections. **Do not register the items below as onboardable or executable until the corresponding SKILL.md, capability contracts, test fixtures, and honest runtime status exist.**

## Accepted public, declarative skill workflows

- `model-context-and-budget-manager` — registered, source-grounded context selection and deterministic optional-context pruning using `hb-agent-handoff/1`; preserves mandatory engram/index, host authority, evidence and task state. Optional `scripts/agent-handoff.mjs` runs locally with Node and performs **no writes, network calls, runner dispatch or automatic tasks**.
- `task-focus-orchestration` — registered task/checkpoint workflow with stable step IDs, evidence-linked completion declarations, blockers, and explicit next action. The shared format does not prove external results or grant persistent memory.
- Shared contract: `api/ai/agent-handoff.schema.json`; synthetic example: `api/ai/examples/agent-handoff.json`; local regression: `node --test tests/agent-handoff.test.mjs`.

The original `blacklight.charles` personality engram has **not** been modified or forked. Existing mandatory binding and digest stay authoritative.

## Candidate skill families, not yet accepted

| Candidate | Intended responsibility | Evidence needed before registration |
|---|---|---|
| `memory-state-management` | Host-owned memory lifecycle, provenance, scoped recall, reconciliation, conflict handling, minimization and retention controls | Read/write contract, testable deletion/expiry semantics, no invented persistence, privacy boundaries |
| `fmpl-pipette-assembly` | Wires (2/4/8 bundles), rigid and flexible pipe variants, elbows/T/Y connectors, flange/tile alignment, slack and shared geometry parts | Real Blender source, Wube 45° export tests, visible proof, connector geometry acceptance matrix |
| `mcp-provider-bridging` | Protocol discovery, tool descriptors, authenticated transport checks, consent boundaries, capability allowlists and readback | Strict host auth boundary, least-privilege dry runs, provider errors, no accidental credential exposure |
| `runner-execution-and-evidence` | Self-hosted runner dispatching, headful/headless capability detection, bounded smoke tests and artifact provenance | Runner readiness/capability detection, no blind workflow enablement, signed/verified artifact references |
| `skill-release-and-integrity` | Offline mirror bundles, versioning, external trust anchors, publisher signatures, revocation and registry-lock compatibility | Detached Ed25519 signing, manual trusted installation, read-only bound context resolution and verified rollback are implemented; production key enrollment, signed release evidence, automated key-rotation authority, anti-rollback sequencing, and runner acceptance remain outstanding |
| `agent-audit-and-safety-gates` | Permissions provenance, human approval scopes, prompt-injection isolation, six-check preflight and destructive-operation safeguards | Host-enforced decision gates, simulation of attempted bypasses, denied actions logged |

## Acceptance gates

1. Define specific host/platform compatibility, required tools, authority and security boundaries. A personality never grants capabilities.
2. Implement the `SKILL.md` and register it only when a working static workflow or executable contract exists; pin it to `blacklight.charles` and the reciprocal index.
3. Provide deterministic regression/negative tests and observed host readback. Distinguish runnable from discoverable.
4. Exercise optional skill selection, context budget, failure/retry, status reporting and cross-skill integration. Avoid creating competing implementations of the same engine.
5. Record actual working release/commit evidence; unverified or blocked features remain planned.

**No automatic skill activation.** The index is required for discovery; it is not an unrestricted tool invocation queue. Enforced by supported loaders, packagers and hosts, not by instructions in a public file alone.
