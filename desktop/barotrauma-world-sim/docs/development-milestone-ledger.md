# Barotrauma Desktop Development Milestone Ledger

**Last updated:** 2026-07-19 (Alaska)
**Purpose:** a short running tally of completed work, current work, and the next implementation order. Update this ledger whenever a milestone changes state. Detailed completed history remains in the main `README.md`.

## Completed

1. Desktop architecture, Swing shell, world session, and safe import boundaries.
2. Version-22 world import and duplicate-safe official save/submarine inspection.
3. SQLite migrations through schema 026 and normalized world persistence.
4. Deterministic clock, checkpoints, single-writer simulation, and Passive Mode.
5. Station economy, consumption, production, freight, markets, research, missions, routes, and encounters.
6. Civilization frontier, population capacity, fauna pressure, attacks, contraction, recovery, and expansion.
7. Player-vessel transit and freight plus NPC voyages and shared hazards.
8. Fleet rescue/towing response phases, material gates, outbound/return travel, and retries.
9. Ecology, geology, finite natural resources, extraction, depletion, freight settlement, and renewable recovery.
10. Local Barotrauma donor discovery and original packaged fallback artwork.
11. Read-only install scan: 3,189 files, 823 graphical candidates, and 2,003 categorized media candidates.
12. Secure local media catalog: official `Content` isolation, immutable entries, metadata fingerprint, safe retained-CSV parsing, user-content exclusion, changed/missing detection, and setup-window background indexing.
13. Schema-015 observation foundation: deterministic NPC and creature population seeds, territory and faction evidence, flows, snapshots, metrics, query-only history, and the desktop observation window.
14. Schema-016 conserved NPC population accounting and reconciliation with the established civilization frontier.
15. Schema-017 causal-history foundation: controlled event/reason vocabularies, versioned significance policy, arithmetic-checked changes, population reconciliation, resource-bounded faction plans, rollback contract, and station history queries.
16. Schema-018 consumption collector: transaction-scoped baselines, one bounded routine/shortage story per station tick, typed ration/supply/streak changes, arithmetic reconciliation, and no leaked baselines.
17. Gradle-free toolchain: JDK compilation and packaging, checksum-verified pinned SQLite runtime, one-command launchers, CI integration, and the complete verification chain.
18. Fleet-response casualty stabilization while responders are on scene or towing home, preventing passive drift from incorrectly turning a protected casualty into a lost vessel.
19. Schema-019 production causality: every due attempt records success, input shortfall, credit shortfall, equipment failure, or sabotage; successful effects and failure damage retain exact typed changes and one bounded story.
20. Schema-020 delivery causality: player and NPC freight share normalized transaction baselines, carrier-attributed stories, exact inventory/trade changes, station/civilization recovery changes, and baseline cleanup verification.
21. Schema-021 attack/frontier causality: measured mutation-boundary snapshots, fauna-attributed attacks, exact threat and damage deltas, direct recovery transitions, expansion/contraction stories, one-time abandonment, and strict baseline cleanup.
22. Schema-022 population state: explicitly labeled imported headcount estimates plus generated-allocation provenance, event-driven resident/workforce counts, proportional immigration and emigration, measured attack casualties, passive or direct abandonment evacuation, exact typed changes, and cumulative reconciliation.
23. Schema-023 faction-plan execution: actual-attack evidence, allocation-backed credit escrow, workforce assignment, ammunition reservation/consumption, one-tick defense preparation and consequence phases, honest unfunded/understaffed failures, terminal allocation settlement, and legacy-plan backing visibility.
24. Schema-024 command provenance: receipt-validated transaction-scoped passive command context, exact story-to-command/tick/canonical links, direct-action non-attribution, durable command history, and context cleanup before commit.
25. Schema-025 explanation enforcement: capture of every command-scoped resident/workforce mutation, explicit state-tick alignment, versioned enforce/report policy, explanation reconciliation, unexplained/misaligned diagnostics, and commit rejection for uncovered or stale-tick changes.
26. Schema-026 time-gated NPC voyage foundation: the shared player route estimator fixes a two-to-24 incident budget; a versioned three-elapsed-ticks-per-challenge policy persists stratified exactly-once slots; quiet ticks advance without encounters; shared-resolver incidents accumulate delay and shift remaining due times and ETA; arrival requires both time and incident gates; fleet-response legs remain linked; and Observer Mode shows live progress, remaining time, incident count, next incident, revised arrival, hull, supplies, bounded reports, and terminal logs.
27. Original distributable audio seed library: 20 project-owned effects and five project-owned music tracks retained separately from donor-install media for later opt-in playback integration.

## In progress

The E1 policy profile now also owns the Barsuk preferred-search deadline, capable-yard nonproduction deadline, fallback/split rule version, versioned defaults for schema-026 time-gated voyage scheduling, and provenance-backed industrial-health thresholds. Schema 026 supplies the per-leg voyage foundation; the macro invariant solver remains the active E1 deliverable.

1. Economy milestone E1: generated/enrichment profile for 1.5–2.0 million generated residents, a feasible deterministic subset of 80–120 generated principal habitats plus imported auxiliary installations, constrained faction shares, geography quotas, generated/imported population provenance, versioned NPC-complement and fleet/dock staffing budgets, one-time sampled training/build-time variance, opening-fleet provenance, Barsuk fallback deadlines and industrial-health thresholds, and an exact invariant solver.

## Next

1. Economy milestone E2: station geography/archetype, principal/auxiliary role, structural capacity, separate owner/controller/governor, faction demographics and institutions, contested claims, categorical ownership history, normal/fallback hull owner/operator/provenance, market reservations, normal shipyard capabilities, and junkyard/repair-bay support for physical Barsuk scrap assembly.
2. Economy milestone E3: conserved resident/presence/workforce cohorts, the 35%-of-residents essential-services target, deployable labor, professional assignments, paired station migration, once-sampled 30-to-180-day prerequisite-based submariner training, role-valid crew nuclei, organic/faction recruitment, congregation travel, normal NPC versus player-skeleton complements, command/watch/support billets, embarked and dock crews, named transit-condition effects, and conserved Barsuk child/remainder formation lineage.
3. Economy milestone E4: enforce the 5% plumbing/life-support threshold and explained `0.9^n` infrastructure decay/recovery consequences.
4. Economy milestone E5: station import/export dependency graph, many-to-many causes, cargo-transfer time gated by shipboard and dockside labor/equipment, model-specific hull bills, Barsuk scrap-assembly inputs, capable-yard build progress/delays, objective nonproduction evidence, and cascading supplier-loss shortfalls.
5. Economy milestones E6–E7: resource-, trained-crew-, and cohort-backed ownership/expansion plans; physical hull creation/transfer/refit and certified Barsuk fallback; local/remote acquisition, passenger travel, shipyard waiting, sea trials, full-complement NPC commissioning and crew split; named crew/cargo/subsystem effects on schema-026 voyages; then strategic faction/organic choices driven by fallback saturation and other causal evidence.
6. Economy milestone E8: station/vessel history, economy, ownership, expansion, crew formation/recruitment/travel, sampled forecasts, hull reservations, shipyard queues, commission blockers, qualification/watch coverage, dock throughput, paginated voyage replay, alerts, incident drill-through, knowledge labels, `Why Barsuk?`, shipyard health, and "Why did this change?" surfaces.
7. Add player-directed response/resource missions and mission settlement consequences.
8. Expand indexed graphics and opt-in music, ambience, UI, creature, and effects playback across desktop panels.

## Known compatibility debt

1. The legacy web economy advances every shipyard hull by a fixed 25 points per successful six-hour cycle, completing an uninterrupted build in exactly four cycles, and its active NPC expansion path can relocate a global hull without travel or create a docked Barsuk when none exists.
2. The desktop simulator seeds 4–24 abstract NPC vessels on its first passive cycle with aggregate skills but no hull definition, tier/class, owner, crew roster, or population provenance.
3. These behaviors remain import/bootstrap compatibility only. E1 records an opening-fleet origin; E2/E3/E5/E6 replace free creation, teleportation, anonymous construction, and crewless commissioning.
4. Schema 026 currently applies aggregate hull and supply effects. Named crew/watch, medical, cargo, subsystem, repair, readiness, diversion, and knowledge-visibility consequences remain E3/E6/E8 work.
5. The active Barsuk fallback, atomic crew split, physical scrap assembly, and provenance-backed shipyard-health decision system are specified but not yet implemented. Raw Barsuk stock is not proof of current yard failure.
6. Observer history remains globally bounded rather than paginated per voyage and does not yet provide replay controls, alert filters, or observed/inferred/hidden access labels.

## Later

1. Equipment-level cargo capacity derived from imported submarine structures.
2. Persistent recent-world reopening and rotating backups.
3. Packaging, clean-machine verification, release automation, and installer audits.

## Update rule

Every development pass must report:

- what became complete;
- what remains in progress;
- what moved into the next position;
- verification performed and any blocker;
- schema, compatibility, or recovery consequences.

Numerical simulation changes are not considered complete merely because aggregate tests pass. Any meaningful world-state movement must also have traceable causal evidence and a human-readable explanation.

Current steering additions: NPC travel is elapsed-time gated with a fixed player-equivalent incident budget; incident resolution never drives progress itself. A Barsuk is a certified last-resort fallback, not normal Tier-1 acquisition success. One full multiplied NPC complement may split into the fallback child only after both persisted nonavailability gates expire, unless a separately funded and authorized recorded emergency override applies; every remainder person stays at the actual station. Recent fallback provenance and missed capable-yard evidence, not raw Barsuk count, drive industrial-failure conclusions.

The accepted economy steering specification is `europa-economy-population-ownership-expansion.md`. Generated-world macro targets do not silently resize imported worlds; demographics, institutions, legal ownership, operational control, and government are distinct; the essential-worker target equals 35% of registered residents and cannot be double-counted as deployable labor; embarked crews remain registered people rather than disappearing from the population ledger; technical experience plus a persisted, once-sampled 30–180-day course is required before submariner qualification; build and training variance never reroll silently; qualified people congregate and travel rather than teleport; NPCs require the multiplied full complement while players retain the catalogue skeleton exception; dock and ship cargo labor gate transfers; and expansion must move actual cohorts and consume allocated resources.
