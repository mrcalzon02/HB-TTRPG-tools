# The Beckenburg Project — Acceptance Matrix and First Backlog
Updated: 2026-10-15. Historical acceptance reference, **not** an independent implementation-status tracker. Current Java solo-game source **is committed** at [0a1f8a0dd3ae56f233d50f70a0d6a0fccd237f0f](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/0a1f8a0dd3ae56f233d50f70a0d6a0fccd237f0f), and passed headless and Linux virtual-display checks. This does not establish Windows compatibility. The original generated PNG binary archive and matching website gallery remain absent: **P00 remains blocked**. See [RELEASE_PRODUCTION_PLAN.md](RELEASE_PRODUCTION_PLAN.md), [QUALITY_GATES.md](QUALITY_GATES.md) and sole [stage-ledger.json](stage-ledger.json).

## Current state
New current-state snapshot: the actual first solo case gameplay exists in source on main. Older S1 notes below describe the preceding prototype and are historical. Still missing: the finished 3v1 mode, player ghost, content roster, original image gallery and verified Windows build.\n\nDesign initialized in HB-TTRPG-tools Software section. **S1 work in progress:** a dependency-free Java 17 Swing + software 3D test-house renderer and deterministic headless smoke test are in `software/beckenburg`; local `javac --release 17` compilation and `SmokeTest` passed on a Java 21 runtime targeting Java 17 class files. Windows GUI/installer, renderer finalization, real-time sound and input/fullscreen acceptance remain UNVERIFIED. LAN transport: NOT STARTED. AI or human ghost control: NOT STARTED. Hunter gameplay: NOT STARTED. The test house is a **visual/interaction prototype**, not a complete mission map. Ghost archetypes: SPECIFIED, NOT IMPLEMENTED. Castle: SPECIFIED, NOT IMPLEMENTED. Game Windows release: NOT STARTED. Two editable SVG concept studies and art budgets exist; no production 3D character meshes or gear models are implemented.

## Traceable acceptance cases
| ID | Requirement | Verification | Stage |
| --- | --- | --- | --- |
| AT-01 | Swing launcher starts packaged 3D view and returns to menu | clean Windows machine, alt-tab/fullscreen/focus test | S1 |
| AT-02 | first-person look, collision, doors, pickups behave properly | test-house traversal with logs | S1/S4 |
| AT-03 | fixed-step host rules independent of render FPS | same seed/event transcript at 30/60/144 render FPS | S2 |
| AT-04 | 3 hunter + 1 ghost LAN join and AI substitute | four-machine LAN direct-IP and reconnect tests | S3 |
| AT-05 | valid/invalid remote commands constrained by host | forged damage, role mismatch and rapid commands rejected | S3 |
| AT-06 | room boundaries, zones and anchors are valid | map graph validator plus ground-truth walk | S4 |
| AT-07 | Observer, Cleric and Demonologist bring distinct useful actions | three role-specific mission scenarios with overlap fallback | S5 |
| AT-08 | readings come from real simulation events | seeded baseline and correlated multiplayer capture | S5/S8 |
| AT-09 | AI/human ghost commands have identical world effects | action-golden comparison for every available archetype | S6 |
| AT-10 | all 13 ghost types have distinctive tells and counters | exhaustive type-by-tool and type-by-site test matrix | S6/S9 |
| AT-11 | early encounters injure/terrify rather than instant kill | simulation trace with fresh character and escalation | S7 |
| AT-12 | ghost hunting is telegraphed and escapable | novice exercise and no soft-lock physics test | S7 |
| AT-13 | séance, ward and banishment respond to world-state predicates | right/wrong anchor and interrupted rite tests | S8 |
| AT-14 | each included site supports evidence and ritual success | map x class x ghost compatibility audit | S9 |
| AT-15 | castle payouts, purchases, recovery and XP persist | mission success/retreat/restart/reconnect tests | S10 |
| AT-16 | accessibility and audiovisual information equivalence | text scale, color, hearing alternative and remap tests | S11 |
| AT-17 | distributed Windows package runs without developer toolchain | clean install, launch, multiplayer, clean uninstall | S12 |
| AT-18 | game content is original and licenses documented | review asset and dependency manifest | S0/S12 |

## Initial implementation backlog (dependency order)
B-001 Pick project code location/structure, build tool, Java 17 vendor and version lock. Acceptance: source tree and local documented build.
B-002 Spike Swing/3D engine interop, first-person movement and focus. Acceptance: AT-01/02 subset.
B-003 Define simulation entity IDs, room graph DTOs, GhostCommand schema and host action validation. Acceptance: AT-03 seed replay and schemas.
B-004 Stand up LAN host/direct-IP join, seat contract, content version handshake and AI ghost seat fallback. Acceptance: AT-04/05.
B-005 Graybox small house including annotated zones, doors, physical props, one ritual socket and ghost adjacency graph. Acceptance: AT-06.
B-006 Build class input/inventory/UI and basic tools with event-driven signals. Acceptance: AT-07/08.
B-007 Implement baseline Spirit + Poltergeist + Wraith with shared AI/human command engine. Acceptance: AT-09, targeted AT-10.
B-008 Escalation/attrition/telegraphed hunt and counterplay tutorial. Acceptance: AT-11/12.
B-009 Seance, ward and banish with interrupted ritual and spatial requirements. Acceptance: AT-13.
B-010 One end-to-end LAN mission and castle payout/inventory persistence. Acceptance: AT-14/15 subset.
B-011 Expand ghosts and authored sites only after B-010 passes. Acceptance: remaining AT-10/14.
B-012 Windows packaging, UX and regression matrix. Acceptance: AT-16/17/18.

## Stage audit ritual
Record stage/requirement ID, authoritative commit SHA, date, test command/machine, saved logs or capture, pass/fail and unresolved issues. Marked COMPLETE requires observed functioning result, not a docs-only checklist. Failures from connector commits or publishing are errors: classify, retry safely, reconcile authoritative branch head and prove accepted files. Do not force push over unrelated work.

## Decisions still requiring prototype evidence
Engine and window embedding viability; render/API minimum; exact network transport/snapshot cadence; physics implementation; room tag schema final form; replay format; ghost resource and win-rate tuning; character stats/economy prices; art direction and animation budget; launch site count; distribution/license terms. Defaults in design documents are hypotheses to validate, never silent binding commitments.
## S1 preliminary local verification — 2026-10-15
- `javac --release 17 -d build/classes src/main/java/org/beckenburg/BeckenburgPrototype.java src/test/java/org/beckenburg/SmokeTest.java` — PASS on OpenJDK 21 with Java 17 language/class target (class file major 61).
- `java -Djava.awt.headless=true -cp build/classes org.beckenburg.SmokeTest` — PASS: map rectangularity, spawn/collision, door open/close/range, raster color variation, depth-buffer finite values, alternate view and lighting.
- `sh build.sh` — PASS; produces JAR with Main-Class manifest.
- `art/profiles/cleric-01.svg` and `equipment-01.svg` — valid XML (parse test). Concept art only, not models or game assets.
- Outstanding: Windows 10/11 launch, GUI manual input, render performance, packaging and LAN. These PASS notes are local authoring checks; independent GitHub read-back of committed source is recorded separately.
