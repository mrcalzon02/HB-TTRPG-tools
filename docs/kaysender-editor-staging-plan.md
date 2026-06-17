# Kaysender Main-Line Editor Production Plan

This plan establishes the dependency-safe order for promoting the existing alpha demonstrators into complete campaign-operation editors and for constructing every remaining main-line editor.

The machine-readable source of truth is `data/kaysender/editors/editor-roadmap.json`.

## Governing rule

Only one main-line editor may be the active implementation target at a time. Later editors may receive schema notes, fixtures, and dependency tests, but they should not receive competing runtime implementations until the active editor clears its exit gate.

The project continues to use the single active GitHub branch `main`.

A generator is not a finished editor. A complete editor must support deliberate manual construction, safe inheritance, persistent records, validation, revision, export, and downstream use. Randomization is an accelerator inside the editor rather than the editor’s defining feature.

## Why the production order differs from the alpha order

The original alpha sequence was:

1. Floating Island / Skyland.
2. Settlement / Skyport.
3. Airship / Vessel.

That was appropriate for proving the concept, but the demonstrators exposed an integration problem. The Island profile exports nested structures such as geometry, hydrology, access, ecology, insertion capacity, and derived scores. The Settlement and Airship alpha importers retained compatibility assumptions for older flat fields such as `waterProfile`, `routeAccess`, `factionPressure`, and `threatClock`.

Continuing to add separate editor infrastructure would multiply this mismatch. Production construction therefore begins with a shared editor kernel and canonical profile contract before the individual editors are expanded.

## Definition of a production editor

Every production editor must provide all of the following:

- A dedicated **New blank record** action.
- Manual controls for deliberate design.
- Selective randomization that does not overwrite locked fields.
- Stable record IDs and schema versions.
- Import validation and schema migration.
- Local draft saving and recovery.
- Clone or duplicate record support.
- Canonical JSON export.
- Wiki-draft export where applicable.
- A visible provenance and inheritance ledger.
- Clear separation of player-facing, GM-only, lore, and rules-facing fields.
- Diagnostics that explain malformed imports, incompatible profiles, impossible totals, and broken references.
- Responsive layout, keyboard access, readable labels, and safe error recovery.
- A schema, runtime, registry integration, wiki links, smoke tests, and development-history entry.

No editor is considered complete merely because it can generate a plausible card.

# Production order

## P0 — Shared Editor Kernel and Profile Contract

**Current state:** framework implementation complete; final integrated live-browser gate pending.

P0 does not create one central domain editor. The Floating Island, Settlement, and Airship editors remain separate editors. P0 supplies the shared infrastructure and profile contract they use through registered adapters.

The implemented framework provides:

- A generic adapter-driven shell and common toolbar.
- New, load/import, validate, local-draft, recover, clone, selective-randomize, canonical-export, and wiki-export actions.
- A canonical profile envelope with stable profile IDs, revisions, schema versions, timestamps, provenance, inheritance, locks, diagnostics, and domain data.
- Explicit current adapter schemas: Island `2.0.0`, Settlement `1.0.0`, and Airship `1.0.0`.
- Adapter-owned nested and flat field mapping.
- A versioned migration registry, including legacy flat Island migration into Island schema `2.0.0`.
- Actionable diagnostics for malformed JSON, wrong profile types, invalid schema strings, unsupported old schemas, and unsupported future schemas.
- Shared dirty-state tracking, autosave recovery drafts, unsaved-change protection, and explicit blank-record draft clearing.
- Persistent multi-record browser storage, explicit deletion confirmation, and record-index repair.
- Visible profile ID, type, schema version, revision, and saved state.
- Separate **Update Existing Record** and **Save as New Clone** actions so identity cannot be replaced accidentally.
- Pinned-revision inheritance. Downstream records retain the exact inherited parent revision until the user deliberately refreshes it.
- Direct saved-parent selection for Settlement and Airship without manual JSON copy and paste.
- Current, stale, unavailable, and locally older parent-reference states plus **Refresh to Latest Parent** and **Clear Parent Link** actions.
- Shared provenance, inheritance, diagnostics, field locking, selective randomization, canonical JSON, and wiki-draft output.
- Recoverable runtime error reporting and responsive, keyboard-accessible shared controls.

P0 validation covers the kernel, roadmap policy, schema declarations, migrations, adapter integration, pinned inheritance, runtime structure, script ordering, and the Island → Settlement → Airship browser chain.

**Exit gate:** a GitHub Actions run on `main` must pass every static and functional validator, complete the integrated Island → Settlement → Airship smoke path in Playwright Chromium, produce a receipt accepted by `scripts/validate-p0-browser-verification.mjs`, and reach GitHub Pages deployment successfully.

Until that gate passes:

- `shared-editor-kernel` remains the sole `required-next` stage.
- P0 remains `framework-implementation-complete-pending-runtime-gate`.
- P1 remains closed.
- No Floating Island P1 runtime implementation may begin.

## P1 — Promote Floating Island / Skyland Editor

The skyland remains the root world object.

The production editor must add deliberate map-cell editing, stable site and resource IDs, hydrology, food capacity, altitude and drift timelines, fracture behavior, landing zones, route-node exports, ecology envelopes, and settlement capacity.

**Primary downstream consumers:** Population, Settlement, Ecology, Route, Market, Faction, Crisis, Encounter.

**Exit gate:** all geometry, acreage, water, population capacity, drift, fracture, sites, resources, and map references validate and round-trip without data loss.

## P2 — Population and Demographics Editor

Population must become a reusable record rather than a single settlement number.

It must model ancestry, age cohorts, households, occupations, class distribution, poverty, specialists, militia, clergy, healers, airship labor, refugees, disease, hunger, and migration.

**Primary downstream consumers:** Settlement, District, NPC/Crew, Market, Faction, Organization.

**Exit gate:** percentages and head counts reconcile exactly, and the NPC generator can consume the resulting population-band weights.

## P3 — Promote Settlement / Skyport Editor

The settlement editor converts island capacity and population into a functioning civic hub.

It must add land use, infrastructure, offices, laws, taxes, stocks, production, consumption, docks, defenses, emergency plans, district capacity, faction slots, market demand, and crisis clocks.

**Primary downstream consumers:** District, NPC/Crew, Airship, Route, Market, Faction, Tithe, Encounter, Job.

**Exit gate:** settlement population, land use, water, food, production, consumption, defenses, and dock capacity reconcile with the imported island and population records.

## P4 — City District, Civic Site, and Facility Editor

Large settlements need persistent internal locations before markets, factions, crimes, encounters, and missions can be anchored.

It must support districts, civic sites, facilities, population assignments, wealth, security, architecture, services, docks, temples, guild halls, foundries, cisterns, military sites, slums, rumors, hazards, and hidden locations.

**Primary downstream consumers:** Market, Faction, Black Market, Encounter, Job.

**Exit gate:** district population and footprint reconcile with the parent settlement, and every major civic asset can be referenced by stable district or site ID.

## P5 — Crafting, Equipment, Ship Module, and Production Editor

The current crafting generator is a strong data foundation, but a production editor must permit deliberate recipe editing and production management.

It must add editable recipes, suppliers, materials, facilities, teams, work schedules, prototype testing, certification, batch production, inventory records, upgrade histories, and ship-module installation records.

**Primary downstream consumers:** Airship, Market, Organization, NPC equipment, Job rewards.

**Exit gate:** generated projects can be edited without losing template provenance, exported items validate, ship modules expose mass, slot, power, crew, maintenance, and compatibility fields, and airship fixtures can install them.

## P6 — NPC, Crew, Household, and Roster Editor

The NPC generator must be promoted from disposable outputs into persistent people and teams.

It must add relationships, households, crew roles, shifts, skills, class levels, pay, loyalty, morale, injuries, availability, equipment assignments, employers, factions, secrets, and roster exports.

**Primary downstream consumers:** Airship, Faction, Organization, Black Market, Encounter, Job.

**Exit gate:** generated NPCs can be promoted into persistent records, crew requirements can be compared with qualified personnel, and other profiles can reference stable NPC and roster IDs.

## P7 — Promote Airship / Vessel Editor

A complete vessel must be assembled from quantitative hull, core, module, cargo, crew, damage, maintenance, and legal records.

It must add hull zones, dimensions, mass, payload, module slots, installed systems, power generation and draw, lift, speed, range, maneuverability, altitude limits, weather limits, crew stations, cargo holds, weapons, defenses, damage states, repair states, ownership, registration, and route capability exports.

**Primary downstream consumers:** Route, Market, Faction fleets, Organization assets, Piracy, Tithe, Encounter, Job.

**Exit gate:** mass, payload, slots, power, crew, cargo, damage, maintenance, and installed-module calculations reconcile.

## P8 — Sky Ecology, Creature, Herd, and Disease Editor

Ecology must become persistent world state tied to real terrain and altitude.

It must support species, habitats, herd populations, migration, diet, predators, diseases, harvestable materials, reproduction, depletion, hunting pressure, conservation, and encounter behavior.

**Primary downstream consumers:** Route, Market, Settlement, Encounter, Job.

**Exit gate:** ecological records occupy island cells and route segments, harvested materials feed markets and crafting, and creature records reference converted stat blocks or explicit stat stubs.

## P9 — World Region, Route, and Airspace Editor

Routes must connect real islands and ports and test actual vessel capabilities.

It must add regions, node graphs, route segments, distances, travel time, altitude bands, winds, weather, resupply points, water access, ecological hazards, survey confidence, closures, route capacity, vessel compatibility, disruptions, and territorial overlay slots.

**Primary downstream consumers:** Market, Faction, Organization, Piracy, Tithe, Encounter, Job.

**Exit gate:** every route connects stable node IDs, imported vessels can calculate travel time and supply use, and hazards and closures attach to specific route segments.

## P10 — Market, Supply Chain, Inventory, and Production Editor

Markets should emerge from production, demand, inventory, transport, legality, and scarcity rather than isolated random prices.

This editor absorbs the current Shop/Market alpha and Supply/Water planner into one economic operations surface.

It must add goods catalogs, stock, producers, consumers, prices, quality, scarcity, suppliers, shipping contracts, water and food ledgers, restock schedules, legal access, black-market access, and shortage events.

**Primary downstream consumers:** Faction, Organization, Piracy, Tithe, Encounter, Job.

**Exit gate:** goods can be traced from producer through route and vessel to inventory, settlement stocks reconcile with market records, and prices react to measurable conditions.

## P11 — Faction, Guild, Government, and Fleet Editor

Factions require concrete leaders, members, holdings, fleets, markets, claims, clients, and rivals.

It must add purposes, secrets, ranks, agents, territory, facilities, ships, finance, supply, obligations, reputation, influence, goals, and conflict clocks.

**Primary downstream consumers:** Organization, Piracy, Tithe, Encounter, Job.

**Exit gate:** every claimed asset references a real profile, faction finance and logistics derive from holdings, and influence can be attached to settlements, districts, routes, and regions.

## P12 — Organization Operations, Finance, Logistics, and Project Editor

This is the time-based management layer for guilds, companies, settlements, factions, and player organizations.

It must track periods, cash flow, payroll, inventory, logistics, staff assignments, asset availability, maintenance queues, crafting and research projects, security, law pressure, morale, reputation, crises, and history.

**Primary downstream consumers:** Piracy, Tithe, Encounter, Job.

**Exit gate:** every resource change has a recorded cause, unavailable people or assets cannot be assigned, and advancing time updates finance, maintenance, supply, projects, and crises consistently.

## P13 — Black Market, Piracy, Smuggling, and Criminal Network Editor

Criminal systems must overlay legitimate markets, routes, ships, officials, and factions.

It must add criminal cells, cover businesses, contraband chains, suppliers, buyers, ships, hideouts, bribes, protection, victims, rivals, evidence, heat, law pressure, moral complications, and planned operations.

**Primary downstream consumers:** Encounter, Job, Organization pressure, Market disruption.

**Exit gate:** contraband moves through real supply chains and routes, bribed officials reference persistent records, and evidence and heat can escalate into world-state changes.

## P14 — Draconic Tithe, Settlement Crisis, and Intervention Editor

Major crises must consume real food, water, money, labor, transport, leadership, and time.

It must add demands, legal authority, collection schedules, enforcers, remaining stocks, hostages, collaborators, resistance, public response, countdowns, intervention choices, consequences, and recovery.

**Primary downstream consumers:** Encounter and Job.

**Exit gate:** demands deduct from real ledgers, countdown transitions have explicit triggers, and interventions update settlement, market, faction, organization, route, and fleet state.

## P15 — Encounter, Hazard, Chase, and Conflict Editor

Encounters should assemble persistent locations, participants, hazards, ships, factions, creatures, motives, and consequences.

It must add objectives, zones, participants, morale, tactics, negotiation, hazards, reinforcements, retreat conditions, rewards, evidence, escalation, and explicit resolution effects.

**Primary downstream consumer:** Job/Mission Editor.

**Exit gate:** participants and locations reference persistent records, difficulty can be adjusted without rebuilding the scene, and outcomes export world-state changes.

## P16 — Job Board, Mission Packet, and Campaign Hook Editor

This is the capstone composer.

It must draw patrons, locations, routes, cargo, rewards, clocks, opposition, encounters, expenses, legal effects, faction effects, failure outcomes, and follow-up hooks from completed systems.

It must produce both a player-facing handout and a GM packet.

**Exit gate:** mission records reference existing world objects rather than copying disconnected text, rewards and expenses reconcile with economic ledgers, and success or failure exports explicit campaign-state changes.

# Construction workflow for every stage

Each editor follows the same order of operations:

1. Audit upstream schemas and actual exported examples.
2. Define the canonical input and output contract.
3. Add or revise the JSON schema.
4. Build migration adapters for older alpha records.
5. Create representative valid, edge-case, and invalid fixtures.
6. Implement the editor through the shared kernel.
7. Add manual controls before random generation.
8. Add derived calculations and reconciliation warnings.
9. Add selective randomization and presets.
10. Add canonical JSON, wiki, and downstream exports.
11. Add accessibility, mobile layout, and keyboard review.
12. Add automated validation and smoke tests.
13. Test imports into the next two downstream editor fixtures.
14. Update registry status, wiki links, README, and development history.
15. Mark the editor complete only after its exit gate passes.

# Work that should not begin early

The following should remain schema notes or fixtures until their dependencies are complete:

- Route simulation before quantitative vessels and ecological hazards exist.
- Market economics before settlement demand, production, transport, and inventory exist.
- Faction operations before assets, routes, markets, fleets, and personnel are persistent records.
- Piracy before legitimate routes, markets, ships, and law pressure exist.
- Tithe simulation before settlement and market ledgers exist.
- Encounter packets before persistent participants and locations exist.
