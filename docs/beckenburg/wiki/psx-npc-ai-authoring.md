# NPC / AI Authoring and Automation — Canonical Ghost Rule Inspector

**Architecture checkpoint: 2026-10-30.** This is a reusable Java 17 **editor AI module**, separate from the gameplay ghost engine. Source inspiration: the supplied 17-page *PSX NPC-AI-1.pdf*, the existing [AI adoption analysis](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/ai/PSX_NPC_AI_ADOPTION.md), and the game's **actual executable ghost rule classes**. Historical PS1 RAM/GTE/MIPS limitations are stylistic references, not runtime specifications.

## What the working module reads

The editor's **NPC / AI** button opens `GhostAiRuleLab`. It uses the dedicated portable package `org.beckenburg.editor.ai`:

- `NpcRuleBook`: typed, immutable species definitions; stable IDs and base/variant relationships; labels for locomotion, traversal, visibility, energy charging, preferred action, frenzy thresholds, and candidate evidence. It rejects duplicate/invalid rule IDs, explains rules in readable terms, and emits advisory structural findings.
- `NpcDecisionWorkbench`: read-only legality explanations, safe candidate proposals, explicitly **host-verified spatial-victim** guard for physical strikes, portal-exit validity, and bounded 512-observation deterministic replay. It only uses already-filtered coarse observations. **It never dispatches actions.**

The **game adapter**, `GhostAiRuleAdapter`, reads all `GhostIdentity.Type.values()` from **actual runtime source**, including Ancient and Elder variants:

| Runtime owner | Values interpreted in editor |
| --- | --- |
| `GhostIdentity` | stable species/base/variant, assigned rite, described archetype |
| `GhostTraits` | WALK/FLOAT, DOORS/WALLS, VISIBLE/CAMERA_ONLY/ORBS, energy charge condition and period, movement multiplier, UV and solitary-hunt constraint |
| `GhostBehavior` | favored event, per-species AI bias period, event tell |
| `GhostFrenzy` | energy entrance cost, earliest tick, permitted CLAW/DREAD attack families |
| `GhostEvidenceMatrix` | **possible** EMF, temperature, writing, UV, camera and additional sensor evidence; no evidence is confirmed by this table |
| `GhostDomain.observe()` | **host-approved** legal action list, current room, exits, coarse hearing, energy and manifestation; sole legality authority |

No duplicate handwritten species matrix was introduced: changes to the canonical Java rules are reflected the next time the editor opens the rulebook.

## Manual test workflow

1. Open the level editor → **NPC / AI**, choose one of the actual ghost species.
2. Read the species contract and distinguish *inherited base mechanics* from Ancient/Elder variant identity. Confirm camera-only ghosts and wall-travel restrictions in the actual source.
3. Pick an isolated **10 Hz** test tick and a **synthetic host hearing** condition. The tool builds a fresh `GhostDomain(new HouseMap(), ...)` and advances it one simulation tick at a time, **without touching the running investigation**.
4. Click **SIMULATE LEGAL ACTIONS**. The right pane displays real `observe()` energy, room, portal exits, manifestation, and legal actions. It then explains each proposed or rejected action using `NpcDecisionWorkbench`.
5. The **host-verified spatial victim** checkbox is explicitly labeled as a sandbox precondition. An audible hunter **does not** prove physical strike contact. The editor cannot grant a strike or reveal exact player coordinates.

The preview is deliberately not a production ghost AI. It does **not** reproduce stochastic haunting roll deadlines, real active-room acoustics/weather, physical pursuit, joint geometry, or measured in-game hunter contact. Any results must not be interpreted as proof of gameplay acceptance without real host tests.

## Architecture invariants

- **One authority**: real `GhostDomain.dispatch` applies action energy/cooldowns/fear/harm, and `LanGhostPursuit`, `LanAcoustics`, `LanGhostSpatial`, `HouseMap`, the host clock and collision keep their existing authority. The editor must never reimplement these systems to shortcut a behavior preview.
- **Perception security**: NPC decision input must be derived from **legitimately delivered events and coarse room/portal information**, not hunter health, exact body position, gear, private journal, hidden identity or extraction-van state. No wall-phase is granted except for species/paths the actual host permits.
- **Presentation vs gameplay**: AI staggering, caching and visualization can reduce overhead but never skip immediate sound, strike telegraphs, movement/collision, ritual/hunt, and multiplayer safety conditions.
- **Portable interface**: new NPC types (hunter allies, guards, wildlife) use a distinct adapter that supplies an explicit `NpcRuleBook.Rule` and filtered `NpcDecisionWorkbench.Observation`; they must not be passed fabricated ghost species attributes.
- **Performance**: bounded editor previews are on a SwingWorker, not the paint/EDT loop. Production AI scheduling must be measured on real maps; no full A* over every actor each frame, no unvalidated teleport recovery, no arbitrary 8-character cap.
- **Testing and release**: portable rulebook/replay tests run in **Modular Level Editor Standalone**; canonical roster and isolated `GhostDomain` behavior are checked in **Focused Castle Repair Checks** as non-blocking diagnostics. Only objective build/launch/essential game or required multiplayer failures may block a release.

## What is implemented versus next

**Implemented source:** `src/main/java/org/beckenburg/editor/ai/NpcRuleBook.java`, `NpcDecisionWorkbench.java`, `src/main/java/org/beckenburg/GhostAiRuleAdapter.java`, `GhostAiRuleLab.java`, developer-editor button, explicit package compilation in Windows game and standalone editor kit. Tests: `NpcRuleWorkbenchTest` and `GhostAiRuleAdapterTest` (test results must be read from GitHub Actions).

**Next priorities:**

1. **Host telemetry adapter**: count and time actual AI decisions, hearing, route lookups, collision, game tick and garbage collection without disclosing private hunter data to the ghost; snapshots read-only and exportable. p50/p95/p99 and bounded history.
2. **Nav/trigger automation**: author/visualize room, stair/portal and door links from real game maps; warn on unreachable patrol anchors, invalid pursuit routes, extraction-van violations and impossible species traversal.
3. **Scenario test runner**: configurable seeded simulations of legal action/deadline/frenzy changes, shelter/door state, hearing expiry and multiple actors. Assert *actual* host and AI/human parity; tests report observable rule failures, not quality judgments.
4. **Behavior editing with safety**: editable proposed parameters in a sandbox with diff/review; **never mutate canonical rules** without an explicit approved patch. Limit output to schema-validated suggestions; do not execute arbitrary AI-generated scripts.
5. **Other NPC adapters**: connect the existing hunter/ally/companion controllers via filtered observations and their *own* factual rule domains. Retain original pathing and simulation rather than flattening every actor into ghost behavior.
6. **Live-playtest debug**: attach to a developer-owned live scene to visualize authorized state transitions and profiler counters, with strict client/host access controls and no position leaks.

This is a true first step toward an NPC/AI tool suite, **not a declaration that all NPC behavior authoring or automated AI gameplay has been implemented**.
