# Engram-bound Agent Skills — expansion backlog

**Status:** planning only · **Authority:** HB-TTRPG-tools / Calzon Foundry · **Updated:** 2026-11-19

The canonical `blacklight.charles` engram now advertises the mandatory `skills/index.json` discovery index. All 49 currently registered Agent Skills declare the required engram and reciprocal index; individual skills remain optional selections. **Do not register the items below as onboardable or executable until the corresponding SKILL.md, capability contracts, test fixtures, and honest runtime status exist.**

## Candidate skill families, not yet accepted

| Candidate | Intended responsibility | Evidence needed before registration |
|---|---|---|
| `memory-state-management` | Host-owned memory lifecycle, provenance, scoped recall, reconciliation, conflict handling, minimization and retention controls | Read/write contract, testable deletion/expiry semantics, no invented persistence, privacy boundaries |
| `task-focus-orchestration` | Explicit objectives, bounded work budgets, prioritized queues, interruption/resumption, status/commit accountability | Observable progress ledger, cancellation and retry rules, timeout/resource tests |
| `fmpl-pipette-assembly` | Wires (2/4/8 bundles), rigid and flexible pipe variants, elbows/T/Y connectors, flange/tile alignment, slack and shared geometry parts | Real Blender source, Wube 45° export tests, visible proof, connector geometry acceptance matrix |
| `mcp-provider-bridging` | Protocol discovery, tool descriptors, authenticated transport checks, consent boundaries, capability allowlists and readback | Strict host auth boundary, least-privilege dry runs, provider errors, no accidental credential exposure |
| `runner-execution-and-evidence` | Self-hosted runner dispatching, headful/headless capability detection, bounded smoke tests and artifact provenance | Runner readiness/capability detection, no blind workflow enablement, signed/verified artifact references |
| `skill-release-and-integrity` | Offline mirror bundles, versioning, external trust anchors, publisher signatures, revocation and registry-lock compatibility | Detached Ed25519 signing tool and negative tests now exist; still requires trusted production key distribution, authorized signed-release proof, rotation and rollback acceptance |
| `model-context-and-budget-manager` | Budget-conscious dynamic context loading and result pruning without dropping mandatory authorities | Cache invalidation and stale-index tests, cost bounds, no silent authority loss |
| `agent-audit-and-safety-gates` | Permissions provenance, human approval scopes, prompt-injection isolation, six-check preflight and destructive-operation safeguards | Host-enforced decision gates, simulation of attempted bypasses, denied actions logged |

## Acceptance gates

1. Define specific host/platform compatibility, required tools, authority and security boundaries. A personality never grants capabilities.
2. Implement the `SKILL.md` and register it only when a working static workflow or executable contract exists; pin it to `blacklight.charles` and the reciprocal index.
3. Provide deterministic regression/negative tests and observed host readback. Distinguish runnable from discoverable.
4. Exercise optional skill selection, context budget, failure/retry, status reporting and cross-skill integration. Avoid creating competing implementations of the same engine.
5. Record actual working release/commit evidence; unverified or blocked features remain planned.

**No automatic skill activation.** The index is required for discovery; it is not an unrestricted tool invocation queue. Enforced by supported loaders, packagers and hosts, not by instructions in a public file alone.
