# Europa Economy, Population, Ownership, and Expansion Milestones

**Status:** steering specification accepted 2026-07-19
**Source:** user-supplied procedural economy blueprint
**Scope:** generated Europa campaign worlds and explicit enrichment of imported topologies. Source station identities are retained and are never resized or reassigned silently.

## Design target

The generated economy must turn a world population of 1.5 to 2.0 million people across 80 to 120 principal habitats into station-level residents, workers, owners, occupations, production duties, imports, exports, and expansion plans. A station loss must propagate through named input dependencies and create explainable production, population, faction, and logistics consequences.

Those population and principal-habitat ranges are generated-world invariants only. Imported worlds preserve their supplied topology and headcounts even when they have fewer than 80 nodes, more than 120 nodes, or insufficient capacity for 1.5 million residents. An import receives an explicit enrichment/feasibility result; the system does not invent or delete stations or people to force it inside generated bounds.

Population capacity remains a structural limit. It is not a substitute for resident history. Schema 022 therefore labels its source-derived starting headcount as `IMPORTED_ESTIMATE`; all later resident and workforce movement must be backed by population events.

## Fixed generation profile

- Generated total population: 1,500,000 through 2,000,000.
- Principal habitat count: 80 through 120. Additional source-map station records are classified as auxiliary installations rather than silently treated as full demographic habitats.
- Geography target: 40% seafloor vents, 20% mid-water hubs, and 40% ice-ceiling stations, with deterministic remainder allocation.
- Essential local-operations burden: 35% of registered station residents is the required essential-worker target and is unavailable for export production because it maintains life support, hydroponics, water, and station structure. If the working population cannot fill that target, the unfilled posts become an explicit essential-services deficit rather than borrowed or double-counted workers.
- Life-support danger threshold: fewer than 5% of residents assigned to plumbing and life support creates an explained infrastructure-decay event; after `n` unresolved cycles, eligible production uses multiplier `0.9^n`.

The faction ranges are final demographic-share constraints, not independent percentages that may be stored without reconciliation:

| Faction | Generated demographic range | Ownership and economic tendency |
|---|---:|---|
| Europa Coalition | 60–65% | Mid-water administration, shipyards, heavy industry, nuclear engineering, security, quotas, and controlled supply lines |
| Jovian Separatists | 25–30% | Vent and fringe extraction, smelting, improvised engineering, decentralized trade, smuggling, and strike risk |
| Church of the Husk | 5–7% | Isolated biological production, aquaculture, medicine, genetic synthesis, and restricted reputation-gated trade |
| Children of the Honkmother | 2–3% | Embedded logistics and entertainment cells, warehouse influence, misinformation, and discoverable sabotage capability |

The deterministic apportionment begins at every faction minimum, distributes the remaining percentage points without exceeding any maximum, and finishes at exactly 100%. Stable seeded priorities and faction-key tie breaking allocate each remainder. Final shares therefore remain inside the displayed ranges. The generator retains priorities, final shares, and allocated people so replay can be audited.

The profile must pass a feasibility solver before generation. Not every population/station-count combination can satisfy every archetype minimum: at the supplied minimums, 120 principal habitats may exceed a 1.5-million-person envelope depending on the 40/20/40 mix. The solver chooses a compatible principal count or reports the exact unsatisfied constraint; it does not overfill capacity or invent people. A larger existing topology may retain all nodes while deterministically selecting a compatible principal subset.

## Ownership is separate from population

Every station requires distinct records for:

- one or more resident demographic allocations whose people sum to the station demographic total;
- non-exclusive institutional presence;
- legal or military owner;
- de facto operational controller and governing/administrative faction;
- faction resident headcounts and shares;
- fortified enclaves or minority institutions;
- contested-control score and claim history;
- local reputation and trade-access rules;
- ownership transitions with the responsible battle, coup, treaty, evacuation, purchase, or abandonment event.

A demographic majority does not automatically transfer ownership or operational control. Minor factions may be present without owning a station. Existing unions, corporations, independents, and criminal groups remain eligible institutional presences or controllers rather than being discarded by the four-bloc demographic model. Ownership changes require a faction plan, committed resources, a consequence event, and a dedicated categorical transition containing old/new owner, controller, and governor IDs. Numeric contested-control or influence changes remain arithmetic-checked `station_change` records linked to that transition.

## Station archetypes

### Seafloor vent outpost

- Typical generated population: 8,000–15,000.
- Demographic tendency: Separatist majority.
- Owner/controller tendency: Separatist local authority or contested Separatist/Coalition control.
- Institutional tendency: fortified Coalition administrative enclave may be present.
- Export labor affinity: mining, smelting, geothermal maintenance, and logistics.
- Required imports: agricultural polymers, water-ice, and hull sealants.
- Exports: refined heavy metals, copper, isotopes, and thermal power cells.

### Mid-water industrial hub

- Typical generated population: 50,000–120,000.
- Demographic tendency: strong Coalition majority.
- Owner/controller tendency: Coalition ownership and administration.
- Institutional tendency: shipyard, fleet, industrial, and civil-order organizations.
- Export labor affinity: precision manufacturing, fleet drydock work, civil administration, and specialist hydroponics.
- Required imports: raw metals, sulfurous ore, and organic fertilizers.
- Exports: industrial fasteners, machinery, hull sections, polymers, and pigments.

### Ice-ceiling station

- Typical generated population: 5,000–12,000.
- Demographic tendency: mixed faction allocations.
- Owner/controller tendency: generated independently from demographic majority and local claims.
- Institutional tendency: cross-faction farming, filtration, logistics, and docking presence.
- Export labor affinity: cryo-mining, water filtration, farming, logistics, and docking.
- Required imports: precision tools, replacement parts, and heavy machinery.
- Exports: water, oxygen, organic textiles, and agricultural chemicals.

Archetype job percentages apply only after the essential local-operations burden is reserved. Jobs that appear in both lists must be assigned to one cohort and cannot be counted twice.

## Submarine, training, and dockside staffing contract

The game's three-to-nine-person crew is a playable skeleton abstraction, not the normal demographic cost of operating a submarine continuously. Population and labor planning must budget a workload-derived complement for each hull and mission. The staffing rule profile must account for hull size, systems and weapon complexity, mission duration, cargo workload, continuous watch coverage, damage-control demand, and the number of relief shifts. It must not hide the difference inside a generic workforce modifier.

Every commissioned submarine therefore has explicit billets for:

- captain, executive officer, watch/shift officers, department heads, and the required command chain;
- navigation, sonar, communications, security, weapons, and damage-control watches;
- mechanical, electrical, reactor, fabrication, and routine maintenance personnel;
- doctors plus nursing/corps support appropriate to the complement and mission duration;
- cooks, food service, sanitation, stores, administration, and general logistics support;
- shipboard cargo handlers and relief personnel needed to keep the vessel operating while others sleep, eat, recover, or train.

Billets belong to named watch groups and duty periods. A player-operated vessel may sail with the catalogue's listed skeleton crew because player crews follow the game abstraction. An NPC-operated vessel may not commission or begin a normal voyage below its full versioned 24-hour complement. If casualties later make an NPC crew understrength, the vessel enters `EMERGENCY_RETURN` or another explicitly authorized emergency state with recorded watch gaps, fatigue, maintenance, medical, cargo, and readiness consequences. The three-to-nine-person game range is therefore a player allowance and an NPC crew-nucleus threshold; it is not the normal NPC complement.

Submariner qualification is a pipeline, not an instant profession change. Candidates must already hold the prerequisite technical field--for example mechanical, electrical, security, medical, logistics, or command experience--and then occupy a trainee billet. Every course persists its nominal duration, permitted early/late variance, hard bounds, deterministic seed key, sampled duration, enrollment time, and planned completion. The shared rule is `planned_duration = clamp(hard_min, hard_max, nominal + seeded_triangular(-early_variance, 0, +late_variance))`. The initial duration-policy default is a symmetric plus-or-minus 20% variance, drawn once and clamped to the course's canonical 30-through-180-day bounds. It is never rerolled on later ticks. Instructor loss, supply interruption, facility damage, strikes, injury, or exceptional funded acceleration change the schedule through separate causal adjustment records rather than hidden random drift. Courses consume instructor time, berths, equipment, supplies, and training capacity. Trainees and instructors are unavailable for conflicting assignments. Graduation, failure, injury, attrition, and reassignment are population/labor events; qualified crew cannot appear merely because a new submarine was built.

Embarked crew remain registered to a home station but are not physically present station labor. Deployment transfers named worker cohorts from station availability into vessel billets and return restores them. Death, desertion, capture, evacuation, hospitalization, and rescue alter those cohorts through explicit events. No person may be simultaneously counted as station-essential labor, deployable station labor, a trainee, an instructor, and an embarked crewmember.

Stations also require explicit dock organizations. Dockmasters, traffic control, tug/berthing teams, cargo handlers, hazardous-material specialists, stores clerks, customs/security, maintenance teams, and medical response staff determine safe docking and cargo throughput. Freight settlement requires compatible shipboard cargo labor, station dock labor, handling equipment, storage space, and elapsed transfer time. A manifest cannot teleport between inventories merely because a vessel reached the station.

## NPC hull origin, crew congregation, and commissioning contract

A physical hull, its legal owner, its operational controller, its sponsoring faction, and the crew organization operating it are separate records. A crew becoming ready does not create a free submarine, and a completed hull does not create trained people.

New hull identities may enter the world only through:

- a generated opening-fleet allocation or an imported baseline with source provenance;
- completion of a speculative shipyard build placed into sale/lease inventory;
- completion of a faction build order; or
- completion of a lawful crew-cooperative/company build order with funded financing; or
- completion of a resource-backed `FALLBACK_SCRAP_ASSEMBLY` after nonavailability certification.

Open-market sale, lease or charter, faction assignment, reserve-fleet transfer, decommissioned-hull reactivation, derelict salvage/refit, capture, seizure, and defection transfer or reactivate an existing hull identity; they do not manufacture another hull. Every path retains build/import origin, model definition, condition, location, legal owner, controller, operator, acquisition price or obligation, and causal transfer history.

Existing compatibility behavior is not sufficient for this model. The legacy web economy adds a fixed 25 construction points per successful shipyard cycle and therefore finishes every hull after exactly four productive cycles; it also assigns available hulls to an abstract NPC freight guild without a crew ledger. The desktop simulator's first-cycle bootstrap creates 4–24 abstract NPC vessels with aggregate skill scores but no model, tier, ownership, or crew roster. Those records may be imported once as `LEGACY_ABSTRACT_FLEET` or replaced by a generated opening-fleet allocation, but neither mechanism may remain a source of free future vessels.

Every shipyard build order persists model/class/tier, required capability, berth or construction slot, bill of materials, assigned yard labor, power, nominal build duration, early/late variance, hard duration bounds, deterministic seed, sampled active-build duration, queue entry, planned completion, sea-trial period, and schedule adjustments. The initial duration-policy default is a symmetric plus-or-minus 20% triangular sample drawn exactly once. Hull complexity and tier define the nominal duration; shipyard tooling, size, licenses, labor, and supported class/tier determine whether that yard is capable of accepting the order. Material shortages, sabotage, strikes, damage, power loss, and rework pause or extend construction through named events rather than resampling the original duration.

The catalogue's published maximum crew is the NPC crew-nucleus and acquisition-search base. The full NPC requirement is:

`required_npc_complement = max(ceil(catalogue_crew_max * npc_complement_multiplier), required command/watch/technical/medical/logistics billets)`

The multiplier and billet profile are versioned by hull, mission, faction regulation, and labor agreement. Reaching the nucleus gate allows a role-valid group to organize, reserve prospective billets, and begin searching; it does not permit NPC commissioning. All multiplied billets and mandatory roles must be filled before normal departure.

Official Tier-1 examples anchor the initial acquisition fixtures:

| Hull | Catalogue role | Player skeleton range | NPC nucleus base | NPC commissioning requirement |
|---|---|---:|---:|---|
| [Orca](https://barotraumagame.com/wiki/Orca) | Tier-1 Scout | 3–6 | 6 compatible people | `max(6 * multiplier, Scout billet total)` |
| [Camel](https://barotraumagame.com/wiki/Camel) | Tier-1 Transport | 4–6 | 6 compatible people | `max(6 * multiplier, Transport billet total)` |

Six arbitrary graduates are not an operable nucleus: the group must cover the captain/command gate and the hull's required technical, security, medical, logistics, and mission roles. Player crews remain governed by the published skeleton range and are exempt from the NPC multiplier. The official links document the anchors; runtime decisions use the version-pinned local submarine catalogue so a later wiki edit cannot rewrite an active campaign.

NPC crew organizations arise through two backed paths:

- a faction commission identifies a fleet need, allocates wages and acquisition funds, recruits or trains named people on the open market, and assigns or acquires a compatible hull; or
- an organic crew cooperative/company forms from qualified unassigned residents, pools lawful capital, recruits missing roles, and obtains a purchase, loan, lease, charter, faction contract, or funded build order.

“Passive crew generation” means training graduations, released assignments, and conserved reassignment of existing residents. It never creates population. A role-valid nucleus enters `NUCLEUS_IDENTIFIED`, reserves its members, and moves through `CONGREGATING`, `CORE_READY`, and `SEEKING_HULL`. Hull resolution then follows one of these paths:

- `LOCAL_HULL_RESERVED` for a compatible local sale, lease, reserve transfer, or faction assignment;
- `TRANSPORT_RESERVED -> IN_TRANSIT -> ARRIVED_AT_HULL` for a compatible remote hull; or
- `WAITING_AT_SHIPYARD -> BUILD_RESERVED -> UNDER_CONSTRUCTION -> SEA_TRIALS` for a queued or new build.

All paths continue through `FULL_COMPLEMENT_RECRUITING`, `COMMISSION_READY`, and `COMMISSIONED`. `BLOCKED`, `STRANDED`, `DISSOLVED`, and `EMERGENCY_RETURN` retain the cause and release or preserve reservations according to policy. Crew congregation and travel use real passenger capacity, fares or faction transport allocation, departure/arrival ticks, route hazards, and paired station-presence transfers. Members cannot work elsewhere while reserved or traveling.

Acquisition strongly prefers a mission-compatible Tier-1 hull. After capability, pressure-safety, role, and affordability gates, rank candidates by compatible Tier 1, local existing hull, reachable reserved hull, compatible shipyard order, earliest ready time, total cost, and stable asset ID. A higher tier requires a recorded mission need or proof that no Tier-1 path is feasible within the policy's maximum wait. Local availability beats transport, and reachable inventory beats waiting for a new build when other factors are equivalent. Concurrent formations cannot reserve the same person, hull, transport seat, shipyard berth, inventory lot, or escrow balance.

## Time-gated NPC voyage parity and observer contract

NPC travel advances through canonical elapsed time; generating or resolving an incident is not what moves the vessel. Schema 026 establishes the first executable contract. At the start of each outbound or return leg, the shared route estimator calculates the same two-to-24 challenge budget that the equivalent player route would require. Policy `npc-time-gated-player-parity-v1` then assigns three elapsed NPC ticks per player-equivalent challenge and persists one ordered incident slot at each deterministic stratified midpoint. The leg owns its route identity, origin, destination, departure tick, elapsed progress, base duration, original arrival estimate, cumulative delay, revised arrival estimate, incident budget, resolved count, and policy version. A refresh, restart, catch-up cycle, or later delay cannot reroll those identities.

Ordinary elapsed ticks advance progress without creating encounters. When a slot becomes due, the NPC auto-resolves it exactly once through the same deterministic hazard eligibility and consequence engine used by player travel. The slot retains its ordinal, stable resolver sequence, due tick, encounter, voyage-log entry, and added delay. Player delay semantics are shared: `added_delay = max(0, resolution_delay - 1)`. Added delay accumulates, moves the revised arrival estimate and every unresolved due slot by the same amount, and does not manufacture another incident. Catch-up resolves overdue slots in due-time and ordinal order. Arrival requires both elapsed progress reaching the revised duration and every planned slot being resolved. Disablement or loss closes the leg and cancels unresolved slots. E6 must make a diversion close the old leg with an explicit reason before creating a new persisted plan.

The live NPC-voyage observer exposes route progress, remaining elapsed ticks, original and revised arrival ticks, accumulated delay, resolved/planned incidents, the next due incident, hull, supplies, destination, mission, and last update. Durable reports are bounded to voyage planning, 25/50/75-percent progress bands, every incident, every arrival-estimate revision, disablement, loss, and arrival rather than inventing a story every passive tick. Incident evidence reconciles the schedule slot, shared resolver result, hull/supply deltas, and revised arrival. Fleet-response outbound and return legs use the same schedule and remain linked to their recovery operation.

Schema 026 is an aggregate vessel-condition foundation. E3 and E6 must extend the same incident rows to named watches, fatigue, injuries, deaths, medical treatment, flooding, fire, reactor or subsystem damage, cargo loss, repairs, and readiness. Those consequences must be applied to actual state, not narrative alone. E8 adds history pagination, replay and alert filters, incident drill-through, and clear `OBSERVED`, `INFERRED`, and omniscient-hidden labels so an observer view does not grant ordinary factions or crews knowledge they did not acquire.

## Barsuk fallback, crew split, and shipyard-health contract

The [official Barsuk catalogue entry](https://barotraumagame.com/wiki/Barsuk) identifies it as a 3,999-mark Tier-1 Attack submarine for one to three game crewmembers, exceptionally slow, built with recycled destroyed-hull materials, and lacking onboard fabricators. This project treats those traits as the basis for a least-viable fallback hull. A Barsuk is not an ordinary success of the Tier-1 preference and is excluded from the normal preferred-hull ranking until fallback eligibility is proved.

When a formation enters `SEEKING_HULL`, persist a versioned `preferred_hull_search_deadline` and `capable_yard_nonproduction_deadline` once. Before both gates expire, it continues seeking, traveling to, reserving, financing, or awaiting a feasible non-Barsuk hull unless a recorded emergency override applies. Each checkpoint stores the candidate snapshot and exact rejection--absent, already reserved, unaffordable, unreachable, unsafe at required pressure, mission-incompatible, unsupported by a reachable yard, or forecast after the accepted horizon. A listing that was never genuinely reservable does not reset patience. Timeout alone never spawns a hull.

The backed fallback lifecycle begins `WAITING_FOR_PREFERRED -> FALLBACK_REVIEW_DUE -> NONAVAILABILITY_CERTIFIED -> BARSUK_FALLBACK_APPROVED`, then resolves to `BARSUK_RESERVED`, `FALLBACK_SCRAP_ASSEMBLY_RESERVED`, or `FALLBACK_BLOCKED`. If a full complement already exists, the atomic `FALLBACK_CREW_SPLIT` may lead directly to `COMMISSION_READY`; if the selected child is understrength, `FULL_COMPLEMENT_RECRUITING` occurs before the conserved split and commissioning gate. Both successful branches end at `COMMISSIONED_FALLBACK`. A fallback may reserve, buy, lease, transfer, capture, reactivate, or refit one existing identified Barsuk. A new `FALLBACK_SCRAP_ASSEMBLY` identity is distinct from ordinary shipyard production and requires a real junkyard/repair bay, named salvage and spare-part lots, pressure-hull material, labor, tools, power, credits, a once-sampled assembly duration, inspection, and a recorded initial condition. Existing-hull salvage or refit preserves identity. Neither path recreates the legacy free docked Barsuk.

If the assembled formation is larger than the Barsuk requirement, the split is one atomic conserved transaction. A deterministic billet solver selects exactly one full multiplied NPC complement by mandatory command, watch, technical, security, medical, logistics, and mission coverage, then qualification, readiness, watch balance, and stable person ID. That child reserves the Barsuk. Every remaining named person stays physically at the split station, keeps home registration and qualifications, and either forms a linked successor nucleus or returns to the qualified recruiting pool. Parent/child lineage and personnel, escrow, wages, contracts, equipment, supplies, passenger bookings, and other hull reservations are partitioned or released without duplication. An understrength formation remains recruiting before the split; only a player-operated Barsuk may use the catalogue skeleton exception.

Barsuk abundance is useful industrial evidence only when provenance is retained. Track rolling active-NPC Barsuk share, recent certified fallback commissions, fallback scrap assemblies, expired preferred searches, missed capable-yard forecasts, queue lateness, material/labor/power shortfalls, and successful non-Barsuk completions. Imported, captured, player-owned, or opening-fleet Barsuks remain visible but do not by themselves prove present shipyard failure. Versioned thresholds over recent production-attributed fallback dependence create an explained `FALLBACK_FLEET_SATURATION`, `SHIPYARD_DEGRADATION`, or recovery event and steer factions toward capacity repair, investment, imports, refits, salvage, or revised commissions--not more free hull generation.

## Sequential implementation milestones

### E1 — Economy generation/enrichment profile and invariant solver

Persist the generation seed, selected total population, principal-habitat target, auxiliary-node count, geography totals, faction priorities, constrained allocations, feasibility result, the 35%-of-residents labor-burden rule, and versioned vessel/dock staffing, NPC complement, training/build-duration variance, Tier-1 preference, opening-fleet, profile/defaults for schema-026 time-gated voyage scheduling, Barsuk fallback-deadline, crew-split, and shipyard-health rules. The feasibility budget must include residents assigned to active fleets, relief complements, training pipelines, crew congregation, and dock operations; those people may not also satisfy station production vacancies. Reject a generated profile whose faction totals, habitat totals, archetype minimums, capacities, fleet-support demand, opening hull provenance, or population totals do not reconcile exactly. Exact generated station allocations seed schema-022-compatible state with `GENERATED_ALLOCATION` provenance; they are not mislabeled as `IMPORTED_ESTIMATE` or replayed as giant immigration events. Imported worlds receive an `IMPORTED_ENRICHMENT` profile, retain every source node and supplied headcount, may remain outside generated bounds, and classify surplus nodes as auxiliary only when a feasible principal subset exists.

### E2 — Station archetype, capacity, ownership, and faction domain

Add geography and economic archetype definitions, principal/auxiliary role, station structural capacity, owner/controller/governor records, faction resident allocations, institutional presence, enclave/minority presence, contested claims, and ownership history. Add hull provenance/ownership/operator records, fallback/opening/imported/captured origin, exclusive market or faction reservations, and normal shipyard plus junkyard/repair-bay capabilities covering berth count, supported hull size/class/tier, tooling, licenses, labor, and power. Existing source `station_type`, biome, ring, and level remain source evidence. Verify world faction headcounts equal the macro allocation and every resident belongs to exactly one station and demographic faction.

### E3 — Population cohorts and professional labor ledger

Track separate conserved stocks rather than forcing every person into `resident_count`:

- registered residents: physically present residents plus embarked/deployed, missing, hospitalized elsewhere, or temporarily evacuated residents who retain that station as home;
- physically present population: present residents plus present refugees/transients who are not registered residents;
- station workforce: physically present registered residents capable of work;
- essential workers, deployable/export workers, trainees, instructors, dock workers, and unavailable workers: disjoint station-labor assignments;
- embarked workforce: registered residents assigned to vessel billets and watches, represented separately from station workforce;
- refugees/transients: separately registered present non-residents;
- missing, hospitalized, and evacuated/off-station residents: registered but neither present station labor nor available vessel crew.

For schema-022 compatibility, `resident_count` means registered residents and `workforce_count` means present work-capable registered residents. Add profession, qualification, billet, watch, home-station, training-course, crew-formation membership and lineage, prospective billet reservation, recruitment offer, and vacancy assignments. The essential-worker target equals 35% of registered residents; faction plans may reserve only deployable/export labor. A versioned crew-complement calculator derives normal and skeleton staffing from each hull and mission, and a sampled 30-to-180-day training ledger converts only prerequisite-qualified technical personnel into submariners. Qualified unassigned people may form role-valid nuclei, recruit on the open market, congregate through real passenger travel, wait at shipyards, perform an exactly conserved Barsuk fallback split, or dissolve with reservations released. Named watch condition, fatigue, injury, death, medical care, and availability feed the shared transit incident resolver. Birth, death, external arrival, and final external departure legitimately change the world total. Embarkation, return, congregation, inter-station migration, training, and crew splitting are conserved transfers rather than population creation. Inter-station movement uses paired origin departure and destination arrival records in one transaction and does not change the world total. Accidents, disease, refugees, recruitment/conscription, reassignment, missing persons, evacuation, hospitalization, and rescue returns are explicit cohort transfers with conserved arithmetic.

### E4 — Essential-services and infrastructure-decay consequences

Reserve the 35%-of-registered-residents essential-worker target, track the plumbing/life-support specialty explicitly, and enforce the 5%-of-residents safety threshold. For `n` consecutive unresolved cycles, eligible manufacturing output uses multiplier `0.9^n`; rounding, any safety floor, and recovery behavior belong to the versioned rule profile. A threshold breach must create one infrastructure story per affected cycle, identify the missing profession, and create repair, recruitment, evacuation, or relief work. Filling the threshold records recovery and resets or unwinds the multiplier exactly as that profile declares.

### E5 — Station input/output dependency graph

Map archetype imports and exports onto item definitions, recipes, throughput, storage, freight lanes, supplier priority, fallback supplier, delivery windows, and substitution rules. Production uses delivered inputs and assigned labor rather than archetype fiat. Docking and freight transfer additionally require matched vessel cargo billets, available dock shifts, handling equipment, storage capacity, and transfer time. Ship construction consumes a model-specific bill of materials, capable-yard labor, power, and one exclusive berth over its once-sampled duration; input or labor shortfalls create explicit queue/progress delays. `FALLBACK_SCRAP_ASSEMBLY` uses a separate Barsuk salvage/parts/tooling bill and objective capable-yard nonproduction evidence. Completion creates a hull in owned, assigned, or sale/lease inventory rather than an automatically active NPC vessel. A supplier loss creates downstream shortfall records that name the failed station, route, item, affected production run, workforce idling, price response, and faction reaction. Add many-to-many event-cause edges because a single `cause_type/cause_id` cannot explain a multi-input cascade.

### E6 — Resource-backed ownership, fleet creation, and expansion plans

Keep three meanings separate: `frontier_position` is the local civilian perimeter, station expansion adds habitation/industrial capacity, and faction expansion creates claims/control/new outposts. Station, faction, and fleet expansion become funded project families rather than passive frontier drift. A plan must identify sponsor, target site or hull, claim, construction/acquisition phase, resident/worker or crew transfer, vessels, credits, building materials, life-support equipment, security, route access, due ticks, and failure/recovery outcomes. NPC fleet plans cover construction, market purchase, lease/charter, faction assignment, transfer, refit, crew recruitment, congregation transport, sea trials, commissioning, certified Barsuk fallback reservation or scrap assembly, and conserved crew splitting. Extend schema 026 legs so shared incidents apply named crew/watch, cargo, subsystem, repair, and readiness consequences while preserving the time gate and fixed challenge budget. A newly built NPC vessel cannot commission until its full multiplied billets, command chain, training lead time, relief plan, medical coverage, supplies, ownership/control, and dock support are funded and staffed. A new outpost separately requires its declared station-operations cohort and life-support staffing. Player vessels retain the explicit skeleton exception. Founding a habitat or commissioning a fleet consumes real resources and moves named population cohorts. Cancellation, abandonment, or conquest releases, refunds, loses, captures, evacuates, or strands those people and resources explicitly.

### E7 — Strategic faction behavior and minority disruption

Use faction ownership, shortages, claims, prices, population pressure, fleet demand, qualified labor, hull inventory, shipyard queues, fallback saturation, and supply dependencies to choose investments, crew commissions, open-market hiring, hull transfers/purchases/build orders, strikes, smuggling, blockades, propaganda, recruitment, sabotage, relief, coups, and counter-plans. Organic crews independently evaluate cooperative capital, loans, leases, charters, local/remote hull stock, passenger travel, shipyard wait time, both persisted fallback deadlines, and a Barsuk split only after nonavailability certification. Tier 1 is a strong scored preference, not an excuse to ignore mission suitability, affordability, pressure limits, role composition, or actual availability. Shipyard degradation and recovery use provenance-backed rolling evidence and steer investment rather than free generation. Hidden activity remains undiscovered until evidence exists; it may not appear as a random inventory delta without an actor plan and later discovery trail.

### E8 — Economy and expansion interface

Expose macro totals, station residents/cohorts, ownership, faction presence, labor burden, vacancies, crew qualification and sampled training completion, forming crews, missing roles, recruitment offers, congregation routes/ETAs, hull stock/reservations, shipyard capabilities/queues/build forecasts/delays, vessel billet/watch coverage, commission blockers, player skeleton exceptions, dock throughput, input/output dependencies, cascading shortfalls, active claims, and expansion plans. Extend the schema-026 observer with paginated voyage replay, named crew/cargo/system consequence drill-through, alerts and knowledge labels. Add `Why Barsuk?` and shipyard-health views showing both expired gates, rejected alternatives, hull provenance, crew split/remainder, assembly inputs, missed forecasts, and fallback-saturation evidence. Every trend and plan must link to the existing station story, command provenance, resource allocation, and explanation-coverage records.

## Verification gates

- Identical seed and rules produce identical station, faction, population, job, ownership, and dependency allocations.
- Global population, station allocations, faction allocations, and station cohorts reconcile without rounding loss.
- Essential and export labor cohorts never double-count a person.
- Fleet crews, station workers, trainees, instructors, and unavailable residents reconcile to named people/cohorts without double-booking.
- Training and ship-construction durations are sampled exactly once from versioned bounds; identical seed and inputs reproduce the sample, while later delays require separate cause records.
- Submariner qualification cannot complete before its persisted 30-to-180-day sampled course duration or without prerequisite experience, instructors, and training capacity.
- Crew formation, recruitment, reservation, and passenger travel conserve population; nobody teleports or works in two places.
- An NPC cannot commission or begin a normal voyage until its multiplied full complement and every required billet/watch are filled; a player-operated vessel remains eligible for the catalogue skeleton range.
- An understrength NPC created by casualties enters an explained emergency state rather than silently starting another normal mission.
- Six compatible core personnel prefer a feasible Orca/Camel-class six-maximum Tier-1 path over a higher-tier candidate, while incompatible roles or mission needs produce an explained alternative.
- A shipyard cannot accept or advance an unsupported hull model/class/tier, and construction cannot progress without its exclusive berth, labor, power, and consumed inputs.
- No person, hull, transport seat, shipyard slot, inventory unit, or escrow balance may be reserved by two formations or plans.
- Hull sale, lease, assignment, salvage, capture, and refit transfer one existing identity; only opening provenance, completed ordinary construction, or completed certified fallback scrap assembly introduces a hull identity.
- Freight transfer cannot settle without both shipboard cargo capacity and station dock labor/equipment over an elapsed handling interval.
- Structural capacity is never exceeded without an explicit overcrowding state and consequence.
- Ownership and demographic majority are queryable independently.
- No ownership transfer, population movement, production penalty, or expansion phase can commit without a causal event.
- Expansion cannot create free people, credits, vessels, equipment, or building materials.
- Supplier loss produces deterministic downstream shortfalls rather than a generic economy modifier.
- Imported worlds keep source station identity and topology unless the user explicitly starts a generated campaign.
- Equivalent player and NPC routes produce the same player-challenge budget; NPC elapsed progress advances on quiet ticks, each persisted slot resolves at most once through the shared resolver, and catch-up order matches single-tick replay.
- Incident slots, encounters, voyage logs, hull/supply consequences, accumulated delay, shifted pending due times, and revised arrival reconcile exactly; arrival requires the elapsed-time and incident-completion gates.
- A Barsuk cannot be selected before both persisted fallback gates expire without an emergency override, and timeout without an existing hull or funded scrap assembly produces `FALLBACK_BLOCKED` rather than a vessel.
- A Barsuk split conserves every named person and reservation, staffs one full NPC complement, leaves the remainder at the actual station, and never applies the player skeleton exception to an NPC operator.
- Scrap assembly consumes its physical bill, bay, labor, power, credits, and sampled time to create exactly one identity; raw imported or player Barsuk counts cannot falsely trigger a current shipyard-failure story.
