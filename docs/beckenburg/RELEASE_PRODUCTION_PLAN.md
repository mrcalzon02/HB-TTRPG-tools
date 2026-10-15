# The Beckenburg Project — Release Production Masterplan
Version 1.0, 2026-10-15. This file specifies required **future work**; it is not evidence of code completion.

## Current integration update — 2026-10-15
The solo investigation source is now committed and read back in `0a1f8a0dd3ae56f233d50f70a0d6a0fccd237f0f`: nine-room authoring/collision, Swing menu/field HUD, procedural 3D props, AI Spirit, evidence scanning, cleansing/warding/extraction and local profile payout. The prior local candidate's original source files were not mounted, so this was a newly authored, testable replacement slice rather than a byte-for-byte copy. The early audit paragraph below is retained as historical evidence, **not the current code status**. Remaining P00 blockers: verify all original generated PNGs as remote GitHub blobs, display the correct art gallery, and execute Windows graphical testing. Gate remains blocked; use `stage-ledger.json` for the sole live status.

## Audited starting point
At audit, GitHub `main` was `67b19334ec30ced7fe16f4a169192cd4012950dc`, holding the Java 17 Swing/Java2D software-rendered proof and its early smoke test, **not** the newer solo gameplay implementation. A separate local working folder contains a nine-room Java gameplay candidate with AI Spirit, three classes, three detectors, wards, rituals, extraction and rewards; `sh build.sh` passed locally using Java 21 `javac --release 17`. Neither a remote game commit nor a clean Windows test of that candidate was verified. The Beckenburg website shows two older SVG studies; generated full-resolution PNG boards are still not verified as real GitHub image blobs. Those source/art/website repairs form **P00**, and block milestone M0.

## Binding finished-product scope
Windows Java 17 desktop launch with bundled runtime, 3D first-person low-poly PlayStation-era art, three hunter classes (Cleric, Observer, Demonologist), 3 hunter + 1 AI-or-human ghost locally hosted LAN, thirteen unique ghost types with **identical** powers for AI/human controllers, real equipment readings and evidentiary deduction, incremental harm, ghost hunting and counterplay, room/zone-driven séances/wards/banishment/cleansing, nine playable site categories (at least one finished map each), permanent Beckenburg Castle hub, money, experience, purchases, repairs, saving, audio, accessibility, original/licensed assets and a production Windows release. Nothing in this list may be silently downgraded to a stretch goal. Any changed launch contract requires explicit scope approval.

## Release milestones
- **M0 Source and artwork baseline**: Both the gameplay source candidate and full-resolution concept-art originals verified on main; image gallery displays original PNGs. Mandatory stage exits: P00.
- **M1 Windows solo vertical slice**: Ten seeded solo runs with real validated evidence, haunts, victory/retreat, and hands-on Windows gameplay. Mandatory stage exits: P01, P02, P03, P04, P05, P06, P09, P11, P12, P13, P14, P15, P16, P17.
- **M2 LAN 3v1 alpha**: Four distinct clients finish 20 LAN matches, at least five with human ghost, without critical desync. Mandatory stage exits: P07, P08, P10, P18.
- **M3 Content complete**: 3 classes, 13 ghosts, 9 site categories, castle, equipment, original assets, audio and rituals in game. Mandatory stage exits: P19, P20, P21, P22, P23, P24, P25.
- **M4 Content-locked beta**: Balance, accessibility, authoritative network robustness and soak acceptance; zero P0/P1. Mandatory stage exits: P26, P27, P28, P29.
- **M5 Windows Gold**: Reproducible bundled-runtime installer, checked binary, verified download and clean-machine LAN play. Mandatory stage exits: P30, P31.

## Work windows and gates
For every microstep, execute a five-window loop: **W0 baseline** (main SHA, current behavior, failing tests); **W1 implementation** (minimal real user-visible function); **W2 adversarial** (bad input, retry, race, recovery, parity); **W3 usability/performance** (compact controls, visual fidelity, FPS, readability); **W4 verification and closeout** (re-run integration suite, gather evidence, commit to main, fetch remote file/blob, record results). These are bounded iteration windows, **not fictional guaranteed hours**; multi-map and whole-roster stages run multiple loops. Prefer one stage packet in active execution on each prerequisite path. Author concept work in parallel only when it does not claim gameplay acceptance. The stage ledger JSON is the *only status tracker*, and any changes must reconcile this plan and acceptance tests. Do not add GitHub Actions. Do not use bypasses/stubs/no-ops or force pushes; retry transient commit failures with remote branch-head reconciliation and report persistent blockers.

A microstep is only DONE with a real resulting file or executable behavior, passing test (or deliberately accepted documentation proof), and read-back-verified main commit. A stage is COMPLETE only when all eight steps, its hard exit threshold, applicable cross-gates and environment-specific validation have evidence. Checkboxes below describe unfinished work. See [QUALITY_GATES.md](QUALITY_GATES.md) and [RELEASE_ACCEPTANCE.md](RELEASE_ACCEPTANCE.md).

## Stage packets — 32 stages / 256 microsteps

### P00 — Repository reconciliation and original-art delivery
**Prerequisites:** none | **Workstream:** Foundation

**Required result:** Latest local nine-room gameplay build reviewed and integrated into main; real PNG files committed and displayed on the Beckenburg site.

- [ ] **P00.01** — Snapshot GitHub main SHA and file hashes, local candidate sources, tests, build products and existing asset inventory.
- [ ] **P00.02** — Diff the local nine-room GameSession and menus against the committed Java prototype; inspect conflicting changes before edit.
- [ ] **P00.03** — Rerun javac --release 17 and deterministic headless tests from the clean remote baseline and from the candidate.
- [ ] **P00.04** — Merge the gameplay candidate with minimal changes, add negative-path tests, and compile from a clean worktree.
- [ ] **P00.05** — Run a real Windows GUI and input/focus test; log observed failures instead of accepting headless results as GUI proof.
- [ ] **P00.06** — Commit verified Java changes without force and read back main, key file blobs, tests and the resulting source tree.
- [ ] **P00.07** — Import all existing full-resolution concept PNGs with unique names and SHA-256 manifest; preserve originals without thumbnail substitution.
- [ ] **P00.08** — Replace SVG-only gallery references with actual committed PNGs and verify their rendered page paths and image loading.

**Hard stage gate:** 100% intended sources and every gallery image remotely present and byte-verified; Windows runtime claims separately tested.

### P01 — Java runtime boundary and 3D engine choice
**Prerequisites:** P00 | **Workstream:** Engine

**Required result:** Chosen Java 17-compatible real-time 3D renderer with explicit Swing/renderer integration boundaries.

- [ ] **P01.01** — Separate simulation entities and state from Swing, Java2D renderer and UI event loop.
- [ ] **P01.02** — Benchmark existing perspective renderer, memory, frame time, resize and pitch/yaw consistency.
- [ ] **P01.03** — Prototype hardware rendering candidate and compare low-poly triangle, atlas texture and fog capabilities.
- [ ] **P01.04** — Implement a first-person walk-through test with one light, textured wall, doorway, prop and animated entity.
- [ ] **P01.05** — Test high DPI, fullscreen/windowed transitions, ALT-TAB, mouse release and swing EDT dispatch.
- [ ] **P01.06** — Declare supported GPU and Java runtime targets from observed results, not untested assumptions.
- [ ] **P01.07** — Implement engine adapter and no duplicate/hidden world-state ownership in renderer.
- [ ] **P01.08** — Validate lifecycle stress and fresh Windows startup; commit measurements and selected decision.

**Hard stage gate:** 50 menu/game cycles without fatal focus/resource failure; actual Windows driver/hardware proof and documented renderer decision.

### P02 — Desktop menus, profiles and lobby shell
**Prerequisites:** P01 | **Workstream:** UX

**Required result:** Real connected menu actions, ready seats and navigation, not a stack of decorative panels.

- [ ] **P02.01** — Implement compact Start/Continue/Host/Join/Settings/Exit menu with direct actions.
- [ ] **P02.02** — Provide local player profile creation/loading and explicit save folder.
- [ ] **P02.03** — Create role selection with Cleric, Observer and Demonologist and visible ability summaries.
- [ ] **P02.04** — Build mission board showing location, risk, contract objectives and available payout.
- [ ] **P02.05** — Build equipment loadout and shop screens with bounded capacity and current inventory.
- [ ] **P02.06** — Build four-seat LAN lobby interface with owner controls, ready signals and session state.
- [ ] **P02.07** — Add resolution, graphics, controls, accessibility and audio settings that actually persist.
- [ ] **P02.08** — Exercise mouse/keyboard navigation, back/escape and screen scaling at several sizes.

**Hard stage gate:** No dead prominent button, no keyboard trap, each disabled action gives a reason.

### P03 — Canonical room graph and first production house
**Prerequisites:** P01 | **Workstream:** Level

**Required result:** Fully navigable small test house with meaningful floor/room/zone identity and references.

- [ ] **P03.01** — Define room zone IDs, parent floors, physical volumes, thresholds and physical/spectral adjacency.
- [ ] **P03.02** — Define static authored JSON level schema, content hashes, required fields and migration rules.
- [ ] **P03.03** — Block out foyer, hall, living room, kitchen, bedroom, bathroom, utility, basement and exterior.
- [ ] **P03.04** — Create usable door frames, stairs, correct wall collisions and named floor map.
- [ ] **P03.05** — Wire independent electricity/light, temperature/ventilation and local acoustics zone components.
- [ ] **P03.06** — Place safe spawn/extraction, environmental hazard, object sockets, evidence sockets and ritual anchors.
- [ ] **P03.07** — Build validator for disconnected rooms, duplicate IDs, invalid circuits or unreachable anchor.
- [ ] **P03.08** — Run all role sizes and both hunter and spectral traversal through every zone.

**Hard stage gate:** Every room and door id validates; zero unreachable ritual anchor, clue socket or extraction point.

### P04 — First-person character movement and interaction
**Prerequisites:** P03 | **Workstream:** Player

**Required result:** Stable player locomotion and collision, clear use prompts, reach-constrained object interactions.

- [ ] **P04.01** — Implement independent mouse yaw/pitch plus rebindable keyboard/controller-compatible mapping.
- [ ] **P04.02** — Implement walk, sprint, crouch, stamina, acceleration and gravity with fixed-step reconciliation.
- [ ] **P04.03** — Implement validated interaction distance and line-of-sight and visible prompt suppression.
- [ ] **P04.04** — Implement opening/closing doors, breakers and light switches with appropriate animation.
- [ ] **P04.05** — Implement held and placed items, swap/drop/inspect and camera/hand pose.
- [ ] **P04.06** — Smoke-test stairwells, tight passages, sloped thresholds and collision corners.
- [ ] **P04.07** — Test pausing, focus loss, modal controls, escape-to-menu and pointer release.
- [ ] **P04.08** — Run replayed walk/interaction scripts across 30, 60 and 144 render FPS.

**Hard stage gate:** No collision escape, blocked exit or input/focus lock in the required test path.

### P05 — Object interaction, physics and environment state
**Prerequisites:** P04 | **Workstream:** World

**Required result:** Reliable interactive furnishings and stateful props suitable for supernatural manipulation.

- [ ] **P05.01** — Classify every prop static/interactable/throwable/breakable and assign mass plus transform limits.
- [ ] **P05.02** — Implement deterministic ghost/hunter push and item displacement event IDs.
- [ ] **P05.03** — Implement safe door/blocker response to jamming, stacking and repeated impulses.
- [ ] **P05.04** — Expose electricity, heat, light and switches as authoritative room-state components.
- [ ] **P05.05** — Build physical trace and surface-mark events that can legitimately produce evidence.
- [ ] **P05.06** — Implement sleep/deactivation and per-room active prop limits to bound CPU load.
- [ ] **P05.07** — Create impact/fragment events separated from render-only particle systems.
- [ ] **P05.08** — Stress test cluttered rooms, item spam and four nearby actors with frame profiles.

**Hard stage gate:** No unbounded impulses, permanently jammed mission routes, NaN transforms or prop-ownership exploits.

### P06 — Fixed-step simulation, commands and replay
**Prerequisites:** P01 | **Workstream:** Core

**Required result:** Deterministic host-reusable simulation with versioned commands and replay.

- [ ] **P06.01** — Implement simulation tick time independent of rendering and EDT.
- [ ] **P06.02** — Introduce stable entities, world event types, command IDs and sequence numbers.
- [ ] **P06.03** — Centralize authoritative health, location, cooldown, energy, inventory and ritual mutation.
- [ ] **P06.04** — Create schema validation, bounded input sizes and duplicate-command rejection.
- [ ] **P06.05** — Make RNG deterministic with owned seed/state and no hidden rendering random source.
- [ ] **P06.06** — Implement state snapshots, event journal, replay reader and actionable failure diffs.
- [ ] **P06.07** — Test invalid commands, duplicate events, missing asset schema and world version mismatch.
- [ ] **P06.08** — Validate identical state hashes at 30/60/144 simulated renderer schedules.

**Hard stage gate:** Same seed + ordered command transcript produces identical authoritative state across render-frame schedules.

### P07 — LAN host/join and four-seat lifecycle
**Prerequisites:** P02, P06 | **Workstream:** Network

**Required result:** Host three investigator slots and one ghost slot on LAN, with optional AI ghost fallback.

- [ ] **P07.01** — Choose protocol transport and document local port, IPv4/IPv6 and host interface options.
- [ ] **P07.02** — Implement direct-IP join plus optional LAN discovery with graceful disabled-network behavior.
- [ ] **P07.03** — Implement handshake for version, map pack hash, player identity and allowed seat.
- [ ] **P07.04** — Enforce 3 hunter seats plus 1 ghost seat, role and ready transitions.
- [ ] **P07.05** — Implement client/host session start, mission loading and lobby back-out.
- [ ] **P07.06** — Implement unoccupied ghost seat AI fallback with explicit ghost-player takeover policy.
- [ ] **P07.07** — Add disconnect, duplicate connection, timeout and clean host-exit behavior.
- [ ] **P07.08** — Test two physical Windows machines and four independent clients through launch and cancel.

**Hard stage gate:** Four clients ready and start a real session using direct local IP without a cloud account.

### P08 — Network authority, replication and reconnect
**Prerequisites:** P05, P07 | **Workstream:** Network

**Required result:** Consistent authoritative world state across all participants, with exploit rejection.

- [ ] **P08.01** — Choose snapshots and reliable event framing, with monotonic timestamps and ACKs.
- [ ] **P08.02** — Replicate hunters, equipment, doors, object impulses, light/temperature, ghost effects and rituals.
- [ ] **P08.03** — Implement client presentation interpolation without client-authoritative damage, evidence or payouts.
- [ ] **P08.04** — Reject wrong-role commands, fabricated position, impossible object transforms and action spam.
- [ ] **P08.05** — Implement reconnect tokens, catch-up snapshots, replay-guarded events and seat timeouts.
- [ ] **P08.06** — Inject latency, packet reordering, 2% loss and duplicate messages in reproducible harness.
- [ ] **P08.07** — Test event reordering around ritual completion, inventory transfer and player incapacitation.
- [ ] **P08.08** — Run repeated four-client join/play/leave cycles with replicated state hashes.

**Hard stage gate:** Critical event IDs converge on 4 clients, no duplicate damage or payment, and no permanent state desync.

### P09 — Shared ghost action and ability contracts
**Prerequisites:** P03, P06 | **Workstream:** Ghost

**Required result:** One legal ghost command library supports AI and human ghosts without privileged variants.

- [ ] **P09.01** — Define energy, influence, manifestation, roaming, agitation, hunt and recovery states.
- [ ] **P09.02** — Implement move/phase/sound/appearance/knock/throw/light disruption commands.
- [ ] **P09.03** — Implement possession, physical strike, evidence signature and ritual interruption commands.
- [ ] **P09.04** — Host-validate legal target, cooldown, energy, distance, zone and allowed ghost archetype.
- [ ] **P09.05** — Emit world events that create audio/video clues and deterministic telemetry.
- [ ] **P09.06** — Define ghost archetype data schema and per-command accessibility/telegraph expectations.
- [ ] **P09.07** — Create golden tests dispatching same command from human and AI in identical state.
- [ ] **P09.08** — Reject illegal command and demonstrate no hidden controller-only mutation path.

**Hard stage gate:** Every shipped command has identical cost/range/damage/cooldown/telegraph for AI and human controllers.

### P10 — Human ghost mode, controls and HUD
**Prerequisites:** P08, P09 | **Workstream:** Ghost

**Required result:** One player can take ghost seat, observe lawful world and use ghost powers.

- [ ] **P10.01** — Implement first-person spectral camera with legal walls, portals and anchored travel.
- [ ] **P10.02** — Implement human ghost perception limited to observed sounds, rooms and manifestations.
- [ ] **P10.03** — Display influence energy, agitation, cooldowns, target and state hints.
- [ ] **P10.04** — Implement focused control set for manifestations, object movement, phase and hunt.
- [ ] **P10.05** — Implement possession targeting and zone/prop legality feedback.
- [ ] **P10.06** — Implement ghost victory/loss, ritual counteraction and recovery/reposition states.
- [ ] **P10.07** — Test human ghost adversarial exploit attempts and denied private notebook/positions.
- [ ] **P10.08** — Compare human-controlled recorded commands to same AI-dispatched commands in replay.

**Hard stage gate:** All available AI ghost actions reachable through human UI with identical validation and no private hunter omniscience.

### P11 — AI ghost decisions without omniscience
**Prerequisites:** P09 | **Workstream:** Ghost AI

**Required result:** A Spirit AI capable of genuine missions through shared commands and imperfect observations.

- [ ] **P11.01** — Define filtered GhostObservation interface and last-known hunter position memory.
- [ ] **P11.02** — Implement seeded decision cadence, idle wandering and location/anchor preference.
- [ ] **P11.03** — Implement measured curiosity toward player noise and physical disturbance.
- [ ] **P11.04** — Generate physical evidence and ambient harassment from real command dispatcher.
- [ ] **P11.05** — Choose escalation/manifestation/hunt based on measured pressure and accessible signals.
- [ ] **P11.06** — Implement defensive response to wards, rites and failed attacks.
- [ ] **P11.07** — Prove AI code cannot read raw player inventory, journal or hidden position.
- [ ] **P11.08** — Run multiple seeded hunt/retreat cases and compare results to player ghost legal behavior.

**Hard stage gate:** AI has zero access to information beyond GhostObservation and can win/lose organically.

### P12 — Three investigator disciplines and loadout mechanics
**Prerequisites:** P02, P04, P06 | **Workstream:** Hunters

**Required result:** Cleric, Observer and Demonologist all function as differentiated roles.

- [ ] **P12.01** — Define class IDs, starting gear, cooldowns, specialties, passives and upgrade sockets.
- [ ] **P12.02** — Implement Cleric wards, stabilization, temporary safe zones and rite preparation.
- [ ] **P12.03** — Implement Observer sensor calibration, triangulation, map annotation and analysis boosts.
- [ ] **P12.04** — Implement Demonologist provocation, lore inference, séance interaction and pact risk.
- [ ] **P12.05** — Implement shared flashlight, inventory slots, status and fallback ritual participation.
- [ ] **P12.06** — Create equip/drop/trade and exhausted supplies behavior and host ownership checks.
- [ ] **P12.07** — Add clear and compact role activity HUD including costs and tooltips.
- [ ] **P12.08** — Test all three classes against the same Spirit mission with and without ideal equipment.

**Hard stage gate:** 3/3 classes complete baseline case; no class hard-lock on required universal objectives.

### P13 — Evidence tool integration and sensor simulation
**Prerequisites:** P05, P12 | **Workstream:** Evidence

**Required result:** Working world-state-driven EMF, temperature, spirit-box, camera and auxiliary gear.

- [ ] **P13.01** — Implement EMF intensity from supernatural events with falloff and calibrated baseline.
- [ ] **P13.02** — Implement thermometer readings from air/heating/ventilation and ghost cold effects.
- [ ] **P13.03** — Implement directional audio recorder/spirit-box with voice conditions and occlusion.
- [ ] **P13.04** — Implement image/video event capture with time, camera pose and visible ghost trace.
- [ ] **P13.05** — Implement UV/residue and motion sensors through common tool event interface.
- [ ] **P13.06** — Add charge, placement, retrieval and durability to every field instrument.
- [ ] **P13.07** — Provide captions/visual feedback for all actionable audio instrument readings.
- [ ] **P13.08** — Test cause/no-cause, environment interference, cross-client and multi-instrument readings.

**Hard stage gate:** Every required tool reading traceable to simulator cause and location, not decorative random UI.

### P14 — Notebook, evidence inference and deception
**Prerequisites:** P09, P13 | **Workstream:** Deduction

**Required result:** Journal supports meaningful multi-channel identification with uncertainty and counterfeits.

- [ ] **P14.01** — Define reading record schema: instrument, position, zone, time, severity, source and contamination.
- [ ] **P14.02** — Collect corroborating clues across repeated observations and assign confidence.
- [ ] **P14.03** — Implement hypothesis comparison, contradictory readings and negative tests.
- [ ] **P14.04** — Implement map heat and named zone markers without perfect ghost knowledge.
- [ ] **P14.05** — Share hunter notes to teammates while preventing ghost from seeing private entries.
- [ ] **P14.06** — Implement Mimic-compatible deliberately fake signals with falsifiable internal tells.
- [ ] **P14.07** — Prevent repeated single event from counting as independent evidence.
- [ ] **P14.08** — Run a blind test for Spirit/Poltergeist/Wraith identification and inspect misdiagnosis.

**Hard stage gate:** Each ghost has at least three distinguishable investigations; no hidden type auto-reveal in HUD.

### P15 — Haunting, injury, pursuit and escape
**Prerequisites:** P04, P09, P11 | **Workstream:** Hunts

**Required result:** Predictable escalation, dangerous but learnable ghost hunts, and recoverable injuries.

- [ ] **P15.01** — Implement escalation curve from quiet haunt to warn, manifest, hunt and exhaustion.
- [ ] **P15.02** — Implement incremental injury, stress, corruption, incapacitation and rescue.
- [ ] **P15.03** — Implement hunt route, imperfect target memory and bounded chase speed.
- [ ] **P15.04** — Emit discoverable warnings before full attack and provide reliable audio/visual alternatives.
- [ ] **P15.05** — Implement protective response to temporary wards, lighting and zone-specific counters.
- [ ] **P15.06** — Allow ally stabilization, recoverable fear and controlled extraction after injury.
- [ ] **P15.07** — Ensure cooldown, damage and movement obey host state across AI/human control.
- [ ] **P15.08** — Test fresh-player survivability, repeated attack loops, door traps and failure clarity.

**Hard stage gate:** Zero first-spawn unavoidable death, infinite stun chains or unescapable hunt traps in scripted matrix.

### P16 — Spatial rituals, séances and site cleansing
**Prerequisites:** P12, P14, P15 | **Workstream:** Rituals

**Required result:** Fully interactive rites with spatial anchors, ghost resistance and multiple outcomes.

- [ ] **P16.01** — Define ritual recipe/phase schema for zone tags, ingredients, anchors and objectives.
- [ ] **P16.02** — Implement chalk/salt/circle placement and temporary sanctified thresholds.
- [ ] **P16.03** — Implement séance with provocation, response, evidence and the ability to end safely.
- [ ] **P16.04** — Implement anchor detection, true-name/history inquiry and reagent preparation.
- [ ] **P16.05** — Implement multi-phase banishment with interruption, retry and ghost counteraction.
- [ ] **P16.06** — Implement wrong anchor, ghost or ingredient responses with recoverable consequences.
- [ ] **P16.07** — Implement final residual cleanse and mission completion on authoritative state.
- [ ] **P16.08** — Test no-anchor exploit, invalid placement, interrupted loop and human-ghost resistance.

**Hard stage gate:** 100% ritual success depends on validated world predicates, not animations; interrupted rites remain playable.

### P17 — Playable solo mission vertical slice
**Prerequisites:** P02, P03, P11, P16 | **Workstream:** Milestone

**Required result:** One fully reproducible solo mission from menu to AI ghost to extraction or defeat.

- [ ] **P17.01** — Connect mission board to room loading, selected class and equipment.
- [ ] **P17.02** — Implement Spirit haunting in the production test house with randomized legal anchor.
- [ ] **P17.03** — Require actual equipment measurements and a journal evidence conclusion.
- [ ] **P17.04** — Allow correct séance or ward/banishment attempt within active ghost counterplay.
- [ ] **P17.05** — Provide visible warning and hunt stage plus injury/retreat.
- [ ] **P17.06** — Allow successful cleansing and location extraction, including partial failure exit.
- [ ] **P17.07** — Finalize debrief, item losses and single transaction reward event.
- [ ] **P17.08** — Capture build SHA, 10 seeds, test logs and real graphical Windows playthrough.

**Hard stage gate:** 10/10 seeded cases have valid outcome with no blocking defect and a hands-on Windows test.

### P18 — End-to-end 3v1 LAN alpha
**Prerequisites:** P08, P10, P17 | **Workstream:** Milestone

**Required result:** Three hunters and human/AI Spirit complete real networked matches.

- [ ] **P18.01** — Wire four-role lobby selections and synchronized match start.
- [ ] **P18.02** — Spawn and display all three hunter avatars with individual tools and data.
- [ ] **P18.03** — Enable human ghost seat with full shared-command abilities or AI Spirit fallback.
- [ ] **P18.04** — Synchronize clues, item physics, rooms, injuries, warding and ritual state.
- [ ] **P18.05** — Implement ghost victory, hunter victory, extraction and failure per seat.
- [ ] **P18.06** — Handle reconnect, nonhost disconnect, match pause and host departure policies.
- [ ] **P18.07** — Test cheating client commands, ghost unfair sight and inventory duplication.
- [ ] **P18.08** — Capture multi-machine match records, packet replay and synchronized final outcomes.

**Hard stage gate:** 4 peers finish 20 test matches (>=5 human-ghost) with zero critical desync and single payouts.

### P19 — Beckenburg Castle and persistent campaign
**Prerequisites:** P02, P06, P17 | **Workstream:** Progression

**Required result:** Castle acts as persistent accessible hub and records actual expedition changes.

- [ ] **P19.01** — Author castle zones: board, armory, archive, workshop, infirmary, sanctuary and vault.
- [ ] **P19.02** — Provide direct fast-access operation menus with optional explorable hub navigation.
- [ ] **P19.03** — Implement versioned local player identities, XP and class progression.
- [ ] **P19.04** — Implement equipment purchase, sell, repair, stash and resupply transactions.
- [ ] **P19.05** — Persist site reclamation, unlocked options, discovered lore and injury recovery.
- [ ] **P19.06** — Add return-to-castle and next mission quick restart after any outcome.
- [ ] **P19.07** — Make all pay/recovery writes atomic and idempotent under reconnect.
- [ ] **P19.08** — Inject save corruption, migration and interrupted-write tests with safe backups.

**Hard stage gate:** No double reward/duplicate purchase; profile and reclaimed sites survive restart and migration.

### P20 — Complete economy, tools and role progression
**Prerequisites:** P14, P19 | **Workstream:** Equipment

**Required result:** All listed shipping field/ritual equipment purchasable and meaningful.

- [ ] **P20.01** — Finalize common sensor tools, protective objects and ritual reagents catalog.
- [ ] **P20.02** — Implement charges, wear, attachments, maintenance and salvage behavior.
- [ ] **P20.03** — Create class-specific upgrade paths focused on choices and sidegrades.
- [ ] **P20.04** — Balance loadout budget, purchases, starting currency and item durability.
- [ ] **P20.05** — Implement ghost-player XP or reputation without abuse incentives.
- [ ] **P20.06** — Run 20-case economic simulations including wrong IDs, deaths and retreat.
- [ ] **P20.07** — Check exploit resistance to trading, sale duplication, negative credits and reconnect.
- [ ] **P20.08** — Expose accurate costs/benefits in compact shop UI and field handbook.

**Hard stage gate:** No unwinnable bankruptcy spiral; all devices have actual gameplay events and ownership checks.

### P21 — Original art, models, textures and animation pipeline
**Prerequisites:** P01, P03 | **Workstream:** Art

**Required result:** Approved PlayStation-era concept styles become verified production assets.

- [ ] **P21.01** — Commit and validate all concept boards, current 19 PNG originals and historical variants; link gallery.
- [ ] **P21.02** — Lock silhouette, texture/pixel palette, UV atlas and poly-budget convention from approved board.
- [ ] **P21.03** — Build import converter for FBX/GLTF or selected mesh format and canonical unit scale.
- [ ] **P21.04** — Create low-poly player hunter bodies, hands, backpacks and three distinct role kits.
- [ ] **P21.05** — Create Spirit, Poltergeist and Wraith initial model/sprite sets and move/manifest poses.
- [ ] **P21.06** — Create door, furniture, ritual circle, detector, church/castle kit assets and animation hooks.
- [ ] **P21.07** — Capture low-res in-game screenshots alongside each approved sheet for visual audit.
- [ ] **P21.08** — Profile triangle counts, draw calls, texture sampling and LOD on reference hardware.

**Hard stage gate:** All shipping assets have committed originals, provenance, mesh/atlas budget and in-engine preview.

### P22 — All thirteen ghost types and fairness matrix
**Prerequisites:** P14, P18, P21 | **Workstream:** Ghost roster

**Required result:** Full diverse roster playable by AI and human with lore-consistent counterplay.

- [ ] **P22.01** — Finalize Spirit, Poltergeist and Wraith distinctive abilities and tutorial encounters.
- [ ] **P22.02** — Implement Shade, Specter and Banshee visual/acoustic darkness and decoy mechanisms.
- [ ] **P22.03** — Implement Hantu cold/heat interaction and associated environment coupling.
- [ ] **P22.04** — Implement Yokai sound/etiquette and Possessive object/owner-link behaviors.
- [ ] **P22.05** — Implement Demon corruption and Devil contract/bargain systems as different mechanics.
- [ ] **P22.06** — Implement Mimic copied evidence and time-separated contradiction clues.
- [ ] **P22.07** — Implement Twins dual manifestations with one shared actor resource and legal event budget.
- [ ] **P22.08** — Run all ghost types under human and AI input against legal actions, injuries and counter-rites.

**Hard stage gate:** 13/13 ghost types mechanically distinct, >=3 tell avenues and >=2 counters each; parity suite fully green.

### P23 — Nine finished location categories
**Prerequisites:** P03, P18, P21 | **Workstream:** Environments

**Required result:** At least one complete shippable map per requested location family.

- [ ] **P23.01** — Finish starter house with safe exits, lore and all location interactions.
- [ ] **P23.02** — Create farmhouse and mansion as distinct medium-complexity room graphs.
- [ ] **P23.03** — Create school and church with contextual signs, circuits, acoustic and ritual sites.
- [ ] **P23.04** — Create prison and asylum with gate/ward/cell areas and no hard-lock traps.
- [ ] **P23.05** — Create academy and college with large-but-bounded zone routes and course-related lore.
- [ ] **P23.06** — Assign floor maps, heat/occlusion, breakers, doors and evidence sockets for every location.
- [ ] **P23.07** — Validate ghost shortcuts, physical portals, spawning, roaming and chase escapes.
- [ ] **P23.08** — Run full match regression by level and record FPS, memory and content validity.

**Hard stage gate:** 9/9 maps clear traversal, evidence/ritual reachability, ghost action parity and reference frame budget.

### P24 — Audio, paranormal effects and atmosphere
**Prerequisites:** P15, P21 | **Workstream:** Sound

**Required result:** Readable haunted soundscape, efficient visual effects and cleared source rights.

- [ ] **P24.01** — Create cue taxonomy: footsteps, doors, equipment, rooms, ghost types, rituals and hunt warnings.
- [ ] **P24.02** — Source original/royalty-free sound with usage rights, attribution and format manifest.
- [ ] **P24.03** — Implement positional zone-aware occlusion, material-dependent footsteps and emitter priorities.
- [ ] **P24.04** — Implement all ghost voices, EVP, Banshee wails and Yokai auditory triggers.
- [ ] **P24.05** — Implement low-res particles, spectral trails, frost, ritual glyphs and dithered fog.
- [ ] **P24.06** — Add dynamic ambience, safe mixing, reverb and clipping control.
- [ ] **P24.07** — Implement captions or visual analyzers for every mandatory evidence and warning sound.
- [ ] **P24.08** — Profile 4-player simultaneous sound/effect scenarios against performance targets.

**Hard stage gate:** Every critical audio cue has visual equivalent; 100% audio provenance recorded; no game-critical unreadable darkness.

### P25 — User interfaces, controls and accessibility polish
**Prerequisites:** P02, P13, P18 | **Workstream:** UX

**Required result:** Usable compact UI with full onboarding, in-game map, ghost HUD and remapping.

- [ ] **P25.01** — Condense castle and lobby layouts into functional information-dense menus.
- [ ] **P25.02** — Polish held-equipment HUD, interaction prompts, health, evidence journal and objective tracking.
- [ ] **P25.03** — Build ghost HUD with state, legal ability range and clear cooldown feedback.
- [ ] **P25.04** — Build floor-aware readable map, marked named zones and uncertainty overlays.
- [ ] **P25.05** — Add beginner training for each role and the ghost-player position.
- [ ] **P25.06** — Provide readable text scaling, high contrast, colorblind-safe indicators and flashing options.
- [ ] **P25.07** — Provide control rebinds, input sensitivity, camera movement/motion accommodations and sound captions.
- [ ] **P25.08** — Conduct user tests with first-time players and no outside instructions.

**Hard stage gate:** 100% critical flows keyboard reachable and no key information encoded only by hearing or color.

### P26 — Progression tuning and multiplayer competitive balance
**Prerequisites:** P20, P22, P23 | **Workstream:** Balance

**Required result:** Ghost/hunter outcomes and economy tuned through evidence and replay, not hidden power disparities.

- [ ] **P26.01** — Define playtest observation data that stays local unless participants explicitly opt in.
- [ ] **P26.02** — Measure time-to-clue, ghost escalation, investigation length and ritual completion by site.
- [ ] **P26.03** — Measure injured/downed/rescued/extracted players and ghost/hunter match outcomes.
- [ ] **P26.04** — Triage dominant/unplayable archetypes with enough samples to interpret confidence.
- [ ] **P26.05** — Tune observer/cleric/demonologist cooperation and solo viability.
- [ ] **P26.06** — Tune gear prices, losses, rewards and XP curves after economic simulations.
- [ ] **P26.07** — Run AI/human parity replay after each ability or combat balance edit.
- [ ] **P26.08** — Review fairness complaints against actual events and adjust telegraphs/counters.

**Hard stage gate:** No statistically established unwinnable map/ghost/role matchup; 0 AI-versus-human powers divergences.

### P27 — Performance, LAN security and long-session reliability
**Prerequisites:** P24, P25, P26 | **Workstream:** Quality

**Required result:** Long-play stable client/server with safe saves and bounded resource use.

- [ ] **P27.01** — Define minimum and recommended Windows test machines, resolution and driver records.
- [ ] **P27.02** — Profile p95 frame time, 1% lows, CPU, memory and object/AI costs.
- [ ] **P27.03** — Optimize render draw calls, dynamic lights, occlusion, physics and audio work.
- [ ] **P27.04** — Soak four clients through two-hour missions and 30 repeated load/unload cycles.
- [ ] **P27.05** — Inject 0–150ms latency, 2% loss, message duplication and reconnect races.
- [ ] **P27.06** — Validate untrusted packets, limits, content IDs and save inputs; disallow unsafe deserialization.
- [ ] **P27.07** — Crash-inject during ritual, payout and local save flush and verify recovery.
- [ ] **P27.08** — Capture reproducible regression failures and root-cause fixes with post-fix proof.

**Hard stage gate:** No critical security or save defect; declared hardware reaches 30 FPS min/60 FPS target; soak tests green.

### P28 — Feature freeze and closed alpha acceptance
**Prerequisites:** P21, P22, P23, P27 | **Workstream:** Alpha

**Required result:** Closed alpha build contains entire agreed scope under testable feature manifest.

- [ ] **P28.01** — Freeze scope manifest with class, ghost, map, tools, hub, rituals and LAN feature IDs.
- [ ] **P28.02** — Inspect GitHub art binary commitments, in-engine image proof and rights records.
- [ ] **P28.03** — Run full mission flow on all nine sites and with every ghost controller.
- [ ] **P28.04** — Run four-client LAN sessions with late join, disconnect, ghost swap and retreat.
- [ ] **P28.05** — Execute novice onboarding and recoverable failure/bug reproduction sessions.
- [ ] **P28.06** — Triage P0/P1/P2 bugs with reproduction and root-cause ownership.
- [ ] **P28.07** — Rerun impacted tests following every correction in bounded repair windows.
- [ ] **P28.08** — Record signed closed-alpha completion decision with actual build and test evidence.

**Hard stage gate:** 0 missing release-scope systems and 0 P0; all unfinished art/models/maps remain blocking.

### P29 — Beta acceptance and regression closure
**Prerequisites:** P28 | **Workstream:** Beta

**Required result:** Content-locked game across classes/ghosts/maps is stable enough for release-candidate build.

- [ ] **P29.01** — Freeze content IDs, schemas and migration before public testing.
- [ ] **P29.02** — Run entire ghost-by-role-by-site compatibility matrix and mimic/twins edge cases.
- [ ] **P29.03** — Run clean-install Windows GUI, sound, input and graphics setting checks.
- [ ] **P29.04** — Run network reconnect, profile save and payment-once regression suite.
- [ ] **P29.05** — Fix every P0/P1 at source and verify impacted cross-feature paths.
- [ ] **P29.06** — Retest accessibility, captioning, quest map readability and tutorial completion.
- [ ] **P29.07** — Gather and interpret beta session stability, fairness and performance results.
- [ ] **P29.08** — Archive beta sign-off, trace captures, defects and regression evidence.

**Hard stage gate:** 0 open P0/P1, 100% mandatory regression rows pass with signed omissions only after approved scope change.

### P30 — Release candidate, Windows installer and support docs
**Prerequisites:** P29 | **Workstream:** Release

**Required result:** Clean-machine installable Windows product with complete documentation and executable evidence.

- [ ] **P30.01** — Build from clean main checkout with pinned Java 17 target and asset manifest.
- [ ] **P30.02** — Package bundled-runtime Windows installer/ZIP without requiring developer JDK.
- [ ] **P30.03** — Record commit/version/build ID, file size, content license list and SHA-256.
- [ ] **P30.04** — Install, start, host LAN, join ghost and three hunters, play and finish a mission on clean PCs.
- [ ] **P30.05** — Verify profile persistence, downgrade/reinstall behavior and clean uninstall.
- [ ] **P30.06** — Test graphics switching, focus handling, DPI, accessibility, missing-audio and corrupt config.
- [ ] **P30.07** — Publish complete key map, host/join instructions, troubleshooting and known issues.
- [ ] **P30.08** — Redownload RC candidate and compare hash, then sign release readiness.

**Hard stage gate:** 100% required clean-machine paths pass; 0 open P0/P1; exact installer hashes recorded and read back.

### P31 — Gold release and postrelease maintenance
**Prerequisites:** P30 | **Workstream:** Gold

**Required result:** Verified Windows production release, source/tag/assets and reproducible evidence.

- [ ] **P31.01** — Conduct formal go/no-go based on signed gates and product-scope requirements.
- [ ] **P31.02** — Create versioned release tag at verified default branch SHA.
- [ ] **P31.03** — Publish final Windows installer/ZIP and accurate system requirements, release notes and licensing.
- [ ] **P31.04** — Read back published asset, exact size and SHA-256 against source package.
- [ ] **P31.05** — Test downloaded product on a clean supported Windows machine, including LAN match and saves.
- [ ] **P31.06** — Publish known issues, crash-log instructions, accessibility notes and support contact.
- [ ] **P31.07** — Define emergency patch criteria, compatibility rules and main-branch-only recovery approach.
- [ ] **P31.08** — Keep archived release verification, artifacts and measured metrics for future maintenance.

**Hard stage gate:** Verified published binary and complete LAN clean-machine test with 0 P0/P1; no fake completion from successful commit alone.

## Parallel work and critical path
P00 is mandatory before claiming any newer gameplay or art as remote. Engine/simulation/zone contracts P01–P06 unlock LAN P07–P08 and ghost parity P09–P11; hunter evidence and rites P12–P17 produce the solo vertical slice; LAN validation and human ghost P10/P18 produce first full asymmetric match; content P19–P25 runs in measured, playable increments rather than nine unfinished maps and thirteen decorative NPCs. Ghost roster P22, sites P23 and artwork P21 converge before feature freeze. Beta and release can begin only after P26–P29 quality gates.

### Definition of 'production finished'
It is not a completed design document, concept image, test compile, screenshot or Git commit. It is an independently installed and **played** Windows release whose 3v1 LAN loop, all promised ghosts/maps/classes and progression work, whose assets are remotely present/licensed, whose performance and network/save safety pass the release gates, and whose published artifact was downloaded and verified against its release checksum.
