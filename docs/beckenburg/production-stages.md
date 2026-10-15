# The Beckenburg Project — Dependency-Ordered Production Stages
Status: historical high-level **S0–S13 design** sequence, not an implementation completion claim. Execution now uses [RELEASE_PRODUCTION_PLAN.md](RELEASE_PRODUCTION_PLAN.md) (P00–P31, 256 microsteps), [QUALITY_GATES.md](QUALITY_GATES.md) and sole active status source [stage-ledger.json](stage-ledger.json). This file remains valuable for original requirements and mapping but does not override P-stage gates.

## Common stage protocol
For every stage: (1) confirm preceding contracts and baseline, (2) implement minimal end-to-end vertical functionality, (3) run repeatable test cases and capture evidence, (4) inspect integration regressions, (5) update design decisions/backlog, (6) commit with read-back verification. A demo that only renders a mock menu does not complete a network/gameplay stage. Do not add GitHub Actions by default. Use small targeted source edits, no stubs or no-op acceptance substitutes.

## S0 — Game contract, scope and original identity
Dependencies: none. Objective: freeze what the first playable slice must demonstrate.
- S0.1 Record player roles (three human hunters, human or AI ghost), mission phases, ghost and hunter success/failure/retreat conditions. Define how partial success pays.
- S0.2 Establish independent art/audio/lore direction: ruined-modern haunted settlements and reclaimed castle; no copied named UI and no borrowed proprietary art.
- S0.3 Create traceable feature requirements IDs, design assumptions, tuning registers and a deliberately small first-slice content budget.
- S0.4 Specify input map (keyboard/mouse, remapping, low-sensitivity/comfort), resolution and Windows install minimums as *targets requiring benchmark*.
- S0.5 Draft comparative benchmark: host + two hunter clients + ghost client on LAN and solo three AI hunter agents only if later intentionally scoped (initial solo may be one hunter with supporting agents; do not claim full solo parity without design).
Gate: master document signed off as internally consistent; no contradictory hunter-count, class/ghost names, powers or victory conditions; launch scope explicitly divided from stretch scope.

## S1 — Runtime/engine and desktop integration proof
**Work underway:** dependency-free Java 17 software 3D spike with Swing, doors, movement, camera pitch/yaw, polygon depth buffer and headless tests has been built and locally verified (2026-10-15). The full stage remains **IN PROGRESS**: actual Windows desktop tests, sound, engine candidate comparison, runtime packaging and performance gates are still open. This prototype is intentionally not the final engine.

Dependencies: S0.
- S1.1 Scaffold Java 17 build and dependency locking; reproducible local build on Windows with a documented one-command build.
- S1.2 Time-box 3D Java engine feasibility (jMonkeyEngine candidate) with a Swing launcher/menu, reentrant play/session lifecycle and focus safe transition between Swing and 3D canvas/window.
- S1.3 Render one furnished test room, working camera yaw/pitch, WASD, collisions, shadow/light change and real-time sound source.
- S1.4 Verify resize, alt-tab, multi-monitor, high-DPI, fullscreen/windowed, mouse capture release and exit-to-launcher under Windows.
- S1.5 Prototype Windows application image via jpackage or approved packaging route; test a clean machine missing development tools.
- S1.6 Profile low/mid hardware; document actual measured frame time, memory and input latency; choose an engine only after tests.
Gate: independently launched install runs, no stuck mouse/focus/ghost frames, no hidden JDK prerequisite, functional 3D and graphics setting selection.

## S2 — Host-authoritative world and data model
Dependencies: S1.
- S2.1 Establish fixed simulation timestep independent of rendering FPS; a simulation clock and monotonic event ordering.
- S2.2 Implement typed entities: player, ghost, interaction target, movable object, door, evidence emitter, ritual anchor and zone.
- S2.3 Centralize authority for movement validation, collision, physics impulses, health/status updates and ghost resources; clients may predict visualization, never authoritative damage.
- S2.4 Deterministic map and ghost seeds; event journal/replay facility for QA.
- S2.5 Data-driven definitions with schema validation, schema version and graceful errors for invalid ghost/site/equipment definitions.
Gate: same seed/action transcript reproduces legal outcomes in headless simulation; malformed data cannot corrupt persistent saves.

## S3 — Four-slot LAN host and session lifecycle
Dependencies: S2 (basic ghost/hunter avatars may be placeholders only during *network* prototype).
- S3.1 Host creates an advertised/discoverable local session or supports direct-IP join, with explicit local interface and port configuration.
- S3.2 Four seats: three hunter, one ghost. Host selects AI ghost when no human ghost occupies the seat. Prevent double booking/invalid class combinations.
- S3.3 Client handshake negotiates protocol version, content hashes, player seat and reconnect identity. Reject version mismatch with actionable message.
- S3.4 Sync authoritative entity snapshots, timestamped actions, doors, prop displacement, ghost manifestations, equipment effects, ritual and injuries. Bound commands and rate limits.
- S3.5 Handle disconnect, late join policy, timeout, AI-ghost takeover/reversion (only if safe), host exit and mission cancellation without save corruption.
- S3.6 Test four Windows clients on actual LAN, packet jitter, 0–250ms injected latency, lost/reordered packets when applicable and rapid reconnect.
Gate: no double damage, desync or lost objective progression across clients; host and all three joiners see equivalent states; LAN mode works without external services.

## S4 — First-person hunter embodiment and room navigation
Dependencies: S2, basic S3.
- S4.1 Physically consistent first-person movement, gravity, stance, sprint, obstruction, camera controls and optional motion accessibility.
- S4.2 Ray or volume interaction for doors, pickups, switches, equipment placement and dropped objects with distance/LOS verification on host.
- S4.3 Implement room-zone membership, floors and stair portals, occlusion and zone-linked noise/light and temperature.
- S4.4 Build initial compact **test house**: entry, hall, living room, kitchen, bedroom, bathroom, basement and exterior service point with valid graph, sightlines, circuits and collision.
- S4.5 Stress test door blocking, narrow corridors, stairs, object stacking and exiting/returning to staging area.
Gate: all three hunters traverse site simultaneously without clipping, interaction range exploits or unintelligible room labels.

## S5 — Hunter classes, equipment inventory and evidence instruments
Dependencies: S4.
- S5.1 Define data-based Cleric/Observer/Demonologist classes with starting kit, specialties, risks and upgrade contract.
- S5.2 Implement slot/weight or capacity inventory, carry/drop/transfer, consumables and recoverable kit at mission resolution.
- S5.3 First three independently testable tools: electromagnetic anomaly sensor, temperature tracker and audio recorder/spirit receiver; each must generate actual readings from world simulation.
- S5.4 Add camera/recording, motion detectors, spectral residues, writing or automatic marks, sanctioned relics and evidence notebook with source/time/zone/confidence.
- S5.5 Make every reading reproducible with seeded events, environment baseline and measurement limits; implement environmental false positives deliberately.
Gate: three-player team can locate, timestamp, compare and save multiple clue classes; gear readings never arise from unrelated UI animations.

## S6 — Ghost domain and command parity
Dependencies: S2–S5.
- S6.1 Define state machine Dormant/Investigating/Agitated/Manifesting/Hunting/Recovering with explicit transition rules and telemetry.
- S6.2 Shared ghost action catalogue: move/phase through legal passages, haunt/whisper, manipulate/toss prop, possess, interfere with light/power, relocate anchor, produce signature evidence, manifest, strike, pursue, disengage and obstruct ritual.
- S6.3 All actions validated with costs, range, zone, eligibility, cast time, cooldown, tells, defenses and host-side damage.
- S6.4 AI and human ghost each submit identical GhostCommand objects to same dispatcher; no direct mutation bypass. AI uses only legitimate observations and memories.
- S6.5 Make visible ghost-player controls, cooldown clocks, resource gauge and contextual hints; ensure no universal vision hack.
- S6.6 Add archetype presets incrementally, starting Spirit, Poltergeist and Wraith before all thirteen; parity regression for each.
Gate: recorded command sequence from AI or human produces equivalent authoritative effects; automated tests prohibit controller-based power differences.

## S7 — Attrition, haunting pressure and hunts
Dependencies: S6.
- S7.1 Introduce physical injury, stress/fear, corruption/possession, exhaustion and incapacitation; define persistence and recovery.
- S7.2 Build escalation pressure curve and nonlethal early interactions; warning events precede severe attacks except documented, discoverable special cases.
- S7.3 Telegraphed hunt start, pursuit senses, cover/escape/ward response and cooldown recovery, no instant chain-kills.
- S7.4 Tune individual ghost damage patterns, attack exposure, repeated vulnerability stacking and revive/extraction timing.
- S7.5 Explicit loss of investigation opportunity if players repeatedly ignore tells, with non-griefing safeguards for ghost actor.
Gate: fresh players can learn counterplay after first encounter; no initial-spawn kills, infinite stuns, impossible door seals or uninterruptible damage loops in required scenarios.

## S8 — Investigation, inference and rituals
Dependencies: S5–S7.
- S8.1 Implement data-driven evidence families with intensity, confidence, trigger conditions, persistence, contamination and false-positive provenance.
- S8.2 Notebook compares evidence with possible ghost types but does not replace observation or reveal hidden truth.
- S8.3 Create provocation action system; risk/benefit: specific prayers, names, questions, relic activation, lights-off vigils, bait objects and controlled séances.
- S8.4 Ritual pipeline: discover anchor -> prepare zone -> arrange required objects -> perform timed actions -> defend interruptions -> verify containment/banishment/cleansing.
- S8.5 Validate rituals against room tags, range, formation, role and ghost states. Wrong rites may partially work, provoke or fail with readable feedback.
- S8.6 Include uncertainty and multiple win paths: identify only, repel, cleanse/banish; surviving hunters must be able to retreat.
Gate: players solve one Spirit and one disruptive ghost using different clue families; ritual success is attributable to correct world state, not timed scripted cutscene.

## S9 — Catalogue expansion and authored locations
Dependencies: S8. Complete content implementation after proven vertical slice.
- S9.1 Add remaining ghost presets with distinct identity, tell, strength, weakness, evidence, movement and AI weighting. Complete thirteen-entry QA matrix.
- S9.2 Define level kit standards: zone semantics, navigation graph, anchor placement, legal ritual surfaces, interactable quotas, lights/fuses, spawn safety, ambient acoustic occlusion and hand-authored routes.
- S9.3 Develop mansion/farmhouse, school/academy/college, church, prison/asylum in content batches; do not extrapolate map readiness from test-house success.
- S9.4 Every level receives ghost navigation and prop reach audit, evidence device applicability, ritual point accessibility and performance bake/check.
- S9.5 Incorporate lore, discoverable records and site-after-cleansing changes without obstructing multiplayer flow.
Gate: each shipping location passes 3v1 traversal/LOS/evidence/ritual/nav/object-budget performance test; unready sites remain excluded from release manifest.

## S10 — Beckenburg Castle and progression/economy
Dependencies: S8.
- S10.1 Create a navigable castle hub with case board, briefing, armory, workshop, archive, infirmary, ritual study and trophy/reclamation gallery.
- S10.2 Define mission grading for evidence quality, survivors, optional objectives, ritual outcome, territorial reclamation and ghost role fair-play.
- S10.3 Persist player XP, hunter disciplines, earned currency, inventory durability, unlocks, site-state and ghost-player progression subject to host/session identity.
- S10.4 Implement purchases, loadout budgets, repair/insurance, injury recovery and non-pay-to-win pacing.
- S10.5 Validate economy with simulated 20-mission cohorts including losses, partial victories and ghost players; avoid unwinnable equipment poverty spirals.
Gate: a completed run changes tangible saved state; recovered inventory and purchased goods survive restart; save migrations are tested.

## S11 — UX, audio, accessibility and atmosphere
Dependencies: playable S8 and S10.
- S11.1 Diegetic and out-of-world UI distinctions: mission board, local map, evidence notebook, gear readouts, health, role abilities, ghost HUD and summary.
- S11.2 Build sound propagation tied to zones/doors and reliable positional cueing; dynamic atmospheric beds cannot drown critical evidence.
- S11.3 Maintain per-client graphics/audio/input settings, text size, high-contrast clue feedback, hearing-accessibility alternatives and non-color-only semantics.
- S11.4 Provide onboarding tutorials for each hunter class and player ghost; expose readable ability rules and fair counters.
- S11.5 Localize strings through resource keys; build automated missing-string tests and accessibility navigation checks.
Gate: novice completes onboarding without external guide; critical cues are perceivable by visual and auditory paths; no mouse capture trap.

## S12 — Verification, balancing and Windows shipping
Dependencies: S1–S11 readiness.
- S12.1 Regression suite for every ghost identity, all roles, rituals, item interactions, AI vs human parity, varied tick rates and network jitter.
- S12.2 Security review: validate malicious client packets, action spam, corrupted save/config, version mismatch and insecure public exposure.
- S12.3 Test performance on target Windows hardware; 1–4 clients, long sessions, repeated scene resets, low memory and corrupted assets.
- S12.4 Packaging: signed build if authorized, version numbers and update process, Windows installer/ZIP, clean-machine test and uninstall rollback. Do not publish a release merely because an artifact was built.
- S12.5 Playtest, tune, log known issues, mark blocker/high/normal, create release manifest and reproduce final package read-back hash.
Gate: required green acceptance matrix with traceable evidence and clean-machine install, LAN game and save recovery demonstration. No false completion claims.

## S13 — Post-release expansion (not part of minimum viable slice)
Additional content routes, optional specialized hunters, bespoke castle facilities, scenario modifiers, replay/reconstruction, modder support, large-location optimizations and dedicated server feasibility. Every addition inherits all S2–S12 contracts and ships only with verification.

## Parallel work tracks and dependency discipline
Art kit, lore and ambient music may progress in parallel with S1; do not count them toward runtime progress. Ghost profiles and data schema may be authored while S2/S3 is underway, but *in-game* ghosts require shared dispatcher before implementation. Site blockouts can be drafted during S3 but must not multiply before S4 room/zone graph validation. Castle art can begin before economy implementation, but castle progression cannot be marked live before S10 save integration.

## Definition of stage completion
A stage is COMPLETE only when its gate has passing reproducible evidence, relevant code/assets on the authoritative default branch, integrated downstream smoke tests, and a verified commit. Design document existence establishes DESIGN COMPLETE only. Failed GitHub writes require diagnostics, retry of transient failures and read-back; never report remote commit success from a local-only file or unstaged candidate.