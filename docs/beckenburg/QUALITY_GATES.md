# Beckenburg — Iteration Windows, Quality Thresholds, and Acceptance Evidence
Version 1.0 · 2026-10-15. Companion to [Production Plan](RELEASE_PRODUCTION_PLAN.md) and authoritative [stage ledger](stage-ledger.json).

**Mandatory guidance references:** [Game Development QoL & Design Philosophy](GAME_DEVELOPMENT_QOL_AND_PHILOSOPHY_STANDARD.md) and [Hardware, Accessibility, Graphics & Menu Options](HARDWARE_ACCESSIBILITY_GRAPHICS_AND_OPTIONS_STANDARD.md). Their applicable CORE, CONDITIONAL and capability-gated options require actual functional evidence. A written requirement or shader option in a catalogue is not a completed feature. Every shipped setting must change actual behavior, persist where promised, have fallback/recovery, and pass the accessibility/performance paths relevant to it.

## Gate enforcement
A source-code commit is not a passing stage. Each *completed* microstep must have a tested result and remote proof. Every release promotion requires both all prerequisite stages' exits and the cross-domain gates below. Test results should be linked from `stage-ledger.json` rather than duplicated into unsynchronized status spreadsheets or additional trackers. `stage-ledger.json` is initially conservative: remote code and the image archive must be reconciled before implementation claims advance.

### Five iteration windows (repeat for every 1–3 microsteps)
| Window | Required evidence and decision | Stop/rework condition |
| --- | --- | --- |
| W0 · Baseline | Record current authoritative main SHA, paths/line counts/hash for large files, relevant design IDs, observed defect, reproduce script or screenshots, and dependency status. | The failure is inferred rather than reproduced; branch is stale or source authority unclear. |
| W1 · Functional | Make one bounded real feature change, include a minimal end-to-end interaction, update content schema/tests as needed. | Implementation is a dummy action, dead menu, rendering-only simulation, or bypass of simulation authority. |
| W2 · Adversarial | Exercise invalid roles, duplicate packets, null/unknown data, bad saves, blocked doors, disconnection, ghost abuse, signal contamination, dangerous repeated action. | One legal action causes corrupt state or a client can override authoritative damage/evidence/inventory. |
| W3 · Improvement | Fix measured misbehavior in UI density, legibility, animation, latency, frame time, equipment affordance and fairness. Compare before/after. | Cosmetic update obscures clues, masks failures, breaks accessible input or severely regresses performance. |
| W4 · Closeout | Execute fresh tests, record commands and evidence, compare file integrity, commit to main without force, fetch HEAD and changed files/blobs back, update ledger ID status. | Tool write accepted but read-back doesn't match, required Windows test missing, or actual change is only in a local scratch folder. |

Use meaningful vertical improvements, not a giant speculative code rewrite. An independent workstream may prepare future specifications, but **prerequisite stage completion cannot be skipped**. When a GitHub connector call times out, first inspect remote state for acceptance, retry transient failure with bounded delay/reconcile head, and report persistent auth/permissions/conflicts; never blind force-push. No GitHub Actions unless expressly requested.

## Multiplayer comparison acceptance addendum
The [researched multiplayer complaints and reliability contract](network/MULTIPLAYER_COMPLAINTS_AND_RELIABILITY_CONTRACT_2026.md) governs host/server authority, editable local saves, direct LAN, connected-seat recovery, ghost AI takeover, role-filtered snapshots, independent voice recovery, lobby flow and measured latency/hit validation. The N-G01–N-G15 scenarios are proposed acceptance checks, **not passed tests**. Until they pass, reconnect, host migration, secure WAN and other deferred features are not advertised as supported. Local save editing is explicitly allowed; multiplayer authority and packet validation still apply. Reference each result in the existing stage-ledger.json, with no independent progress tracker.

## Cross-domain quality thresholds
Some numbers below are explicit **provisional release targets**, not claims of observed performance; minimum/recommended hardware must be selected by P01 and measured again in P27. Changing a threshold requires an explicit recorded engineering decision and a repeated independent validation, not silent relaxation during a failing test.

| Domain | Alpha threshold | Beta threshold | Gold threshold / stop rule |
| --- | --- | --- | --- |
| Compile & startup | `javac --release 17` from clean checkout and headless suite pass; Windows GUI smoke logged separately | Start reliably from nondeveloper Windows install; no crash on menu/game transitions | Bundled-runtime install on supported Windows systems; 100% required install/start/uninstall matrix green |
| Functional feature coverage | One full solo case and 4-seat 3v1 vertical slice | Entire launch scope implemented: 3 roles, 13 ghosts, 9 site families, castle, tools, evidence, rituals | No release-scope item in “placeholder”, “designed only”, or “asset missing”; all stage gates green |
| Ghost parity | Same state/command produces same host events for AI/human Spirit | All 13 types' legal commands/cooldowns/costs/damage/telegraphs have automated parity comparisons | 0 source-of-controller advantage; human difficulty arises only from control/perception, not altered power rules |
| Evidence logic | Simulator-driven readings, at least 3 independent signal classes | Every ghost has >=3 defensible avenues of identification and >=2 fair counterplay choices | No mandatory ghost type requires a unique role; no untraceable random evidence masquerading as truth |
| Network seats & state | 4 independently connected clients, >=20 full matches, >=5 human ghost | Connect/disconnect/reconnect/lobby/full mission and 0–150ms injected jitter/loss test green | 0 duplicate damage, payouts, room states, ghost command bypass or P0 desync; stable direct IP with no external service |
| Map & escape | 1 house validated | >=1 playable full map in each of 9 requested site categories | 100% shipped rooms/anchors/doors/evidence sockets connected and accessible; 0 reproducible irreversible entrapment |
| Combat & danger | Fresh hunter survives typical first hostile event; documented escalation warnings | All 13 hunt types have avoidable/defensible counterplay | 0 unavoidable opening kill, infinite stun loop, unreadable severe-hunt warning or instant lethal first touch |
| UI & accessibility | Mission goals, controls and equipment readable on working GUI | Keyboard access, remap, text scale, visual evidence for key audio and non-color-only status | 100% critical navigation and decision cues accessible; 0 dead primary control; no modal trapping mouse |
| Saves/economy | Stable single-mission payout ID and manual local profile | Reopen/migrate profiles, survive crash midpurchase/mission | 0 data-loss P0, duplicate payout, irreversible save migration or unaffordable-only progression dead end |
| Art & sound provenance | Approved original image archive remotely committed + art references appear on site | All shipping assets derived from acknowledged original/legally licensed sources | 100% shipping image/audio provenance traceable; real usable models/rigs/textures, not only concept posters |
| Runtime resource usage | Baseline captured on tested PCs and at least 30-minute play | 2-hour four-client session and 30 load/unload cycles | No growing resource leaks; measured >=30 FPS minimum-spec floor and >=60 FPS recommended target or documented alternative user-approved performance spec |
| Crash-free session stability | No crash in required seeded smoke paths | Intended target >=99% 30-minute session completions in measured beta sample, excluding expected user aborts | 0 reproducible P0/P1; repeated clean-game full sessions from installer with failure reports linked |
| Release provenance | Source commit/SHA and exact test environment logged | Stable versioning, content manifest, attribution and consistent hashes | Published Windows installer downloaded again, size and SHA-256 match, tested clean-machine LAN match observed |

A missing measurement is **UNVERIFIED**, never a pass. If test sample size is insufficient to estimate win rates or crash frequency, label it insufficient and continue playtesting. Do not claim statistical fairness from only a handful of games.

## Test matrix and run signatures
### Unit/property tests
- Core simulation: fixed-step equivalence, deterministic seed + event transcript, reversible HUD state not authoritative world state, idempotent journal and profile transitions.
- Ghost controller parity: for **every action ID and each archetype**, identical initial state + command must generate identical accepted/rejected status, damage, costs, cooldowns, world transforms, clue event and telegraph. AI and human receive only their respective legal filtered view of the same hidden world. Test selection decisions separately from dispatched effects.
- Room/zone graph: unique stable names and IDs, floor and portal topology, legal ghost spectral edges, finite camera/player/prop transforms, no unreachable ghost anchor, extraction or cleansing socket.
- Evidence: instrument/ghost/ambient cause mappings, positive and negative checks, out-of-range readings, provenance, calibration, decoy and longitudinal contradiction.
- Ritual: valid, invalid, wrong-ghost, wrong-room, interrupt, retry, team leader loss, ghost counteraction, victory transition, rejoin midrite.
- Save/network: untrusted packets, duplicate inventory transfers, double credits, bad schema, crash during transaction, reconnect right before mission result, event replay and cleanup.

### Integration pairwise then exhaustive
- Every site × every ghost × three hunter roles is **9 × 13 × 3 = 351** required scenario *configurations*; each must have a completion path (not necessarily full-length manual playthrough at every config). Repeat controller-parity critical checks with both AI and human ghost interface; implement property/automated simulation tests and manually sample high-risk matrix corners.
- Full two-controller duplication means up to **702 ghost-controller configuration cases** when doing AI/human pairwise matrix checks. Do not declare all 702 hands-on playtested; automated checks and manual coverage must be distinguished.
- Manual tours: every site, every ghost, all 3 hunter disciplines, all objectives, all settings/menu flows, 4-seat LAN on at least 2 physical PCs, clean Windows installer. Introduce alternating Ghost human/AI takeover only where authorized by state machine.
- Jitter: simulate 0ms/50ms/150ms extra latency, 0/2% packet loss, reorder, duplicate commands and fast reconnect. These are repeatable test injections and **not** promised network operating envelopes for arbitrary public WAN use.

## Severity and release blocking
**P0:** exploit permits remote authoritative mutation/crash or data loss, invalid payout/inventory duplication, reproducible unbeatable mandatory loop, broken installer/host/join, irreversible save corruption, unavoidable first-spawn death, unsanctioned asset licensing risk. Any open P0 blocks alpha and release.

**P1:** frequent focus/input failure, room soft-lock, missing role/ghost/site feature, untrusted ghost power mismatch, major performance violation on target hardware, broken readable evidence path, important accessibility/navigation blocker, disconnected client unable to rejoin in supported cases. Any open P1 blocks beta, RC and Gold.

**P2:** recoverable noncritical UI glitches, avoidable cosmetic anomalies, isolated nonbreaking audio, noncritical balance outliers; track to fix, defer with approved release notes only when not affecting contracts.

## Gate record protocol and stage status fields
For each Pxx microstep keep: requirement ID, implementation commit, observed platform/JDK version, command/test case, evidence path/capture, pass/fail, next corrective microstep, reviewer sign-off, and remote fetched blob/commit SHA. `stage-ledger.json` stores links rather than huge embedded screenshots. Allowed statuses: `not_started`, `active`, `blocked`, `verification`, `complete`. Do not transition to complete before all eight substeps are complete and hard gate plus cross-gates pass. A stage labeled `verification` is not a completed production feature.

## Definition of milestone promotion
M0 requires original images and game source on main plus actual web gallery proof; M1 requires solo gameplay and Windows graphical proof; M2 requires **networked** full session proof; M3 requires **implemented** roster/maps not merely art; M4 requires no P0/P1 plus complete regression and measurement; M5 requires the published downloadable artifact plus independent clean installation and LAN play. A successful code commit alone can never fulfill Gold.
