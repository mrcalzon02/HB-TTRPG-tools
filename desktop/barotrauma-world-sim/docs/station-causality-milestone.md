# Station Causality, Story Events, and Change History Milestone

## Goal

Station statistics must describe a world with causes, actors, plans, and consequences. Integrity, security, industry, population, civilization strength, supply, inventory, treasury, threat, production, and consumption may not drift as unexplained numbers. A meaningful change must point to what happened, why it happened, who or what caused it, and which values changed.

Routine deterministic variation may still exist inside a bounded process, but the committed result must be attributed to a concrete process such as resident consumption, a production run, spoilage, delivery, migration, an attack, or a faction operation. Large or unusual changes require a story event rather than a generic fluctuation label.

## Required causal model

Schemas 015 and 016 provide observation state and conserved NPC population accounting. Schema 017 introduced four related station-causality evidence families, extended by schemas 018 through 025.

### Station event

A durable event records:

- world, station, canonical time, and committed tick sequence;
- event type, severity, headline, and human-readable narrative;
- initiating actor or system;
- direct cause type and cause record ID where available;
- deterministic event seed or source evidence where randomness participated;
- visibility and discovery state for future hidden faction activity;
- creation transaction and audit correlation ID.

### Typed station change

Every event can own multiple changes:

- statistic or resource key;
- previous value;
- signed delta;
- resulting value;
- unit and value type;
- reason code;
- affected population, inventory lot, production run, faction, vessel, mission, or facility when applicable.

The database must enforce that `previous + delta = resulting` within the declared numeric precision. A typed change cannot exist without its event.

### Population event

Population changes require an explicit category:

- births and household formation;
- ordinary deaths;
- accident or disaster casualties;
- attack casualties;
- disease and recovery;
- immigration and refugee arrival;
- emigration and evacuation;
- recruitment, conscription, desertion, or reassignment;
- missing persons and rescue returns.

Population capacity remains a limit, not a substitute for an actual population history.

The generated-economy continuation is specified in `europa-economy-population-ownership-expansion.md`. It fixes the target scale at 1.5–2.0 million generated residents across a feasible 80–120 principal habitats, separates station ownership/control from demographic and institutional presence, reserves an essential-worker target equal to 35% of registered residents, and requires expansion to transfer real cohorts and consume faction-plan resources. It also treats ship crews and dock workers as conserved population assignments: prerequisite-qualified technical personnel receive a persisted, once-sampled 30–180-day submariner course; normal NPC 24-hour complements include command/watch/technical/medical/support/cargo billets; and the game's listed crew range remains a player skeleton exception and NPC formation nucleus rather than permission for crewless commissioning. Qualified people congregate through real transport, hulls retain origin/ownership, capable yards receive model-specific sampled schedules, and faction or organic crews must acquire, await, crew, and commission one physical hull. Schema 026 makes NPC movement elapsed-time gated with a persisted player-equivalent incident budget and observer evidence. The continuation additionally treats a Barsuk as a certified last-resort fallback: both nonavailability gates must expire unless a separately funded and authorized recorded emergency override applies; a physical hull or scrap assembly, a conserved full-complement crew split, and production-attributed shipyard-health evidence are still required. These bounds apply to generated campaigns; imported worlds keep their source topology and headcounts, may remain outside the bounds, and receive explicit enrichment/feasibility profiles.

### Faction plan

Factions need durable intentions rather than instantaneous random modifiers. A plan records:

- sponsor and target faction or station;
- objective and current phase;
- preparation, execution, discovery, success, failure, and consequence states;
- required money, personnel, equipment, influence, and time;
- resources reserved and consumed;
- linked missions, agents, vessels, facilities, and station events;
- cancellation, compromise, retaliation, and recovery outcomes.

## Story-event families

The first implementation must cover:

- scheduled resident and industrial consumption;
- completed, delayed, under-supplied, failed, or sabotaged production;
- inventory spoilage, theft, smuggling, seizure, and accidental loss;
- freight arrival, short delivery, damaged cargo, and trade windfall;
- rationing, shortages, black markets, unrest, strikes, and work slowdowns;
- reactor, machinery, hull, fire, flooding, contamination, and medical incidents;
- fauna attack, pirate action, faction raid, blockade, and security response;
- births, deaths, disease, migration, refugees, evacuation, and workforce change;
- crew training and sampled completion, role-valid nucleus formation, recruitment, congregation travel, hull search/reservation/acquisition, shipyard construction/delay, sea trials, commissioning, embarkation, return, watch gaps, fatigue, medical/support shortfalls, and dockside cargo handling;
- time-gated route planning, fixed player-equivalent incident budgets, bounded voyage progress, scheduled transit incidents, cumulative delay and arrival revision, diversion, disablement, loss, rescue, arrival, and exact crew/cargo/subsystem consequences;
- preferred-hull search and capable-yard nonproduction checks, Barsuk fallback certification, conserved crew split/remainder, physical scrap assembly, fallback commissioning, saturation, shipyard degradation, and recovery;
- faction investment, propaganda, recruitment, espionage, sabotage, coup preparation, and relief planning;
- research success, setback, accident, theft, and technology adoption;
- repair, reinforcement, reconstruction, recovery, and renewed expansion.

## Statistical significance rule

The simulation may aggregate routine high-frequency actions into one per-tick event, such as “resident consumption for tick 14,203.” It must not create thousands of trivial rows solely to narrate each consumed unit.

A dedicated story event is mandatory when any of these applies:

- a configured absolute or percentage threshold is crossed;
- a station state or frontier state changes;
- production fails, is delayed, or produces less than its declared plan;
- population changes for a non-routine reason;
- a faction plan advances phase or consumes reserved resources;
- sabotage, crime, combat, accident, disease, or environmental pressure participates;
- the change creates, completes, fails, or materially alters a mission;
- the change would be visible in a dashboard trend or materially affect later simulation choices.

Thresholds must be centralized policy, versioned with simulation rules, and tested. They may suppress a separate headline, but never erase the causal link behind a committed statistic.

## Transaction and determinism rules

- Events, changes, resource consumption, and resulting station values commit in one SQLite transaction.
- A rollback leaves none of them behind.
- Replaying the same world seed, source state, commands, and tick sequence produces identical event types, changes, and narratives.
- Narrative text is rendered from stable event facts; it does not consume a separate uncontrolled random stream.
- Existing audit records remain technical/world-operation evidence. Station story events are queryable domain history and do not replace the audit journal.
- Imported historical values may use an explicit `IMPORTED_BASELINE` event when no finer source causality exists.

## Interface requirements

Each station surface must provide:

- a chronological story/history feed;
- filters for economy, production, population, faction, security, environment, research, and logistics;
- a “Why did this change?” action from major statistics and trend points;
- before/delta/after details;
- links to the responsible production run, delivery, mission, faction plan, encounter, vessel, or population event;
- clear distinction between observed events, inferred causes, and hidden/undiscovered causes.

The companion vessel observer must provide:

- current route, origin/destination, elapsed and remaining time, base and revised arrival, and last update;
- resolved/planned incident slots, the next due incident, current hull/supplies/readiness, and crew/watch condition;
- bounded progress reports plus durable incident, delay, diversion, disablement, loss, rescue, and arrival entries;
- drill-through from each incident to its schedule slot, encounter, exact state deltas, and resulting arrival estimate;
- paginated replay, alerts and filters, with omniscient facts labeled so ordinary actors gain no unearned knowledge.

## Implementation sequence

1. **Complete:** Audit every station mutation in passive ticks, deliveries, production, attacks, frontier transitions, extraction settlement, research, and fleet response.
2. **Complete:** Define reason codes, event types, significance policy, and domain records.
3. **Complete:** Add schema 017 with foreign keys and change arithmetic safeguards.
4. **Complete:** Add the transaction-scoped causal-event collector and baseline cleanup contract.
5. **Complete:** Convert routine consumption and shortages into bounded stories with typed ration, supply, shortage-streak, and surplus-streak changes.
6. **Complete:** Convert production inputs, outputs, credit costs, success, failure, sabotage, and shortfalls.
7. **Complete:** Deliveries, measured attacks, recovery, expansion, contraction, and single-entry abandonment are covered through schemas 020 and 021.
8. **Complete (schema 022 foundation):** Add an explicitly estimated imported population baseline, authoritative resident/workforce state, and exact immigration, emigration, measured attack-casualty, and evacuation events. The remaining cohort/event families continue under economy milestone E3.
9. **Complete (schema 023 defense slice):** Add allocation-backed faction defense plans, real credit/workforce/ammunition reservations, preparation and consequence phases, and honest unfunded or legacy-unbacked states.
10. **Complete (schema 024):** Link passive station stories to the exact originating command, command tick, and canonical time without falsely attributing direct transactions.
11. **Complete for resident/workforce state (schema 025):** Reject a passive commit when an enforced population mutation lacks matching typed changes; extend enforcement statistic-by-statistic after each mutation family is audited.
12. **Complete (schema 026 foundation):** Separate NPC elapsed progress from incident generation; persist the shared player-equivalent challenge budget, deterministic due slots, cumulative delays, revised arrivals, fleet-response links, bounded progress/incident/terminal logs, and live Observer Mode fields.
13. **Next:** Implement economy milestone E1 for generated/enriched macro profiles, feasibility, principal/auxiliary classification, constrained faction shares, explicit generated/imported population provenance, NPC complement and vessel/dock staffing budgets, once-sampled training/build variance, opening-fleet provenance, and versioned Barsuk fallback/industrial-health thresholds.
14. Implement economy milestones E2–E7 for ownership/control; hull/fallback provenance and capable normal/scrap yards; conserved station/embarked cohorts; professional and essential labor; sampled 30–180-day crew training; role-valid faction/organic crew congregation; full NPC complements and conserved Barsuk splits; local/remote hull acquisition; physical fallback assembly; named transit consequences; infrastructure decay; dependency cascades; and resource-, cohort-, and trained-crew-backed strategy.
15. Implement economy milestone E8 station and vessel explanation UI using completed history and command-provenance queries, including paginated voyage replay, named incident consequences, crew formation/travel, hull reservations, sampled forecasts, shipyard queues, `Why Barsuk?`, shipyard health, commission blockers, qualification, watch coverage, and dock throughput.

## Initial mutation audit

The first repository audit identified these production mutation families. Schema 017 conversion must treat them as an explicit checklist rather than relying on a broad search-and-replace:

| Source | Current responsibility | Required causal coverage |
|---|---|---|
| `PassiveWorldSchema` | Baseline station state, passive production, research, missions, vessels, and encounters | Baseline/import events plus passive operational causes |
| `PassiveWorldSchemaHardening` | Mission, research, and NPC workflow corrections | Corrective and completion events without duplicate stories |
| `PassiveWorldTickTransaction` | Transaction boundary and cycle coordination | One correlation context shared by all events in the tick |
| `StationLogisticsSchema` | Inventory, production runs, prices, freight, credits, and treasury | Inputs consumed, outputs produced, shortfalls, delivery evidence, and price causes |
| `StationLogisticsHardening` | Freight settlement and logistics corrections | Settlement cause chains and idempotent delivery stories |
| `PlayerFreightTransaction` | Player loading and delivery | Player/vessel/lot attribution and station recovery effects |
| `StationConsumptionAndFrontierSchema` | Resident consumption, shortages, degradation, attacks, and frontier state | Consumption summaries, shortage causes, attack narratives, and before/delta/after values |
| `StationFrontierHardening` | Defense, recovery, and expansion mission creation | State-transition stories linked to resulting missions |
| `FleetRecoveryAndNaturalWorldSchema` | Threat, reinforcement, resource exposure, and earlier fleet completion | Environmental pressure and response consequences |
| `FleetResponseTransitSchema` | Current response phases and material-gated reinforcement | Reserved/consumed materials and final station reinforcement changes |
| `NpcTransitObserverSchema` / `PassiveWorldTickTransaction` | Time-gated legs, incident schedules, aggregate transit consequences, and observer reports | Named crew/watch, cargo, subsystem, rescue/diversion, and knowledge-scoped causal coverage |
| `NaturalResourceHarvestingSchema` | Extraction, freight, environmental effects, and renewable recovery | Site, mission, batch, freight, and destination-station attribution |

Verification-only direct updates in the corresponding `*Verification` classes are fixtures, not production mutation paths. They must be updated to assert causal records after each production workflow is converted.

## Exit gate

This milestone is complete only when:

- every covered station mutation has exactly one traceable cause chain;
- aggregate station values reconcile with their typed changes;
- no event or change survives a rolled-back tick;
- deterministic replay produces the same history;
- significant changes generate useful human-readable stories;
- routine events remain bounded in volume;
- faction plans consume real resources and cannot act for free;
- population changes reconcile with births, deaths, arrivals, departures, and transfers;
- the station interface can answer why a displayed value changed;
- migration, backup, recovery, and legacy-world tests pass.
