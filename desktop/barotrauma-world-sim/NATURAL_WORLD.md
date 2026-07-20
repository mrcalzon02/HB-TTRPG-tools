# Fleet Response Transit, Natural World, and Resource Extraction

The desktop Barotrauma world database is now at schema 026. Its natural-world and fleet-response behavior begins in schemas 010 through 014; schemas 015 and 016 add observation state and conserved NPC population accounting; schemas 017 through 025 add measured station causality, authoritative population state, allocation-backed faction defense, exact command provenance, and enforced explanation coverage. Schema 026 separates NPC elapsed travel from incident generation with persisted player-equivalent schedules and observer evidence.

## Fleet response phase machine

Disabled NPC vessels create durable rescue or towing operations. Besieged stations create reinforcement operations. The response queue supports rescue, towing, repair, refuel, rearm, and reinforcement categories.

Qualified Salvage, Patrol, and Courier vessels receive priority for active response operations. A vessel already assigned to an active fleet response is protected from ordinary mission assignment.

Each operation now moves through explicit phases:

- `WAITING` — no responder is assigned.
- `OUTBOUND` — a responder is preparing or travelling to the casualty or target station.
- `ON_SCENE` — the responder has arrived and material-gated work may advance.
- `RETURNING` — on-scene work is finished and the responder is returning or towing a casualty home.
- `COMPLETE` — the return leg arrived and the casualty or station outcome was finalized.
- `FAILED` or `CANCELLED` — the operation ended without ordinary completion.

Assignment creates an outbound `fleet_response_transit_leg`. The responder enters the same `PREPARING` and `IN_TRANSIT` states used by ordinary NPC voyages. The existing deterministic transit resolver supplies hazards, outcomes, hull loss, supplies loss, delay, disabling, and loss. Every applicable `world_encounter` is linked to the active response leg.

Fleet progress cannot advance while a responder is merely outbound. Arrival changes the operation to `ON_SCENE` and leaves the responder at the target location while work is performed.

## Material-gated on-scene work

The origin station must retain the required fabricated steel, fuel, ammunition, and medical inventory. An undersupplied station cannot complete recovery by simulation fiat. Once the responder is on scene and the declared material exists, Passive Mode advances the work.

Materials are committed once. The operation records `materials_committed` before beginning its return leg. If the responder is later disabled or lost, the request returns to the queue with its completed on-scene work intact. A replacement responder can retrieve the casualty without charging the station a second time.

Reinforcement effects are applied on scene. Rescue, towing, repair, refuel, and rearm casualties remain unresolved until the return or towing leg reaches home.

## Return and towing transit

On-scene completion does not teleport a casualty home. It creates a second transit leg and places the responder back into departure preparation.

The return leg uses the responder's current location, home station, route length, vessel statistics, deterministic seed, and the shared transit challenge engine. Transit encounters are durable evidence linked to the operation and leg.

Only when the return leg reaches the responder's home location does the operation become `COMPLETE`. At that point a distressed vessel is moved to its own home station, restored to a serviceable hull and supply state, and returned to `DOCKED`. The responder also returns to `DOCKED` and becomes eligible for ordinary missions or another response.

A responder disabled or lost during either leg creates a failed leg record and returns the original operation to `WAITING`. Its attempt number increases when a replacement responder is assigned, preserving every outbound and return attempt rather than overwriting history.

## Transit evidence

Schema 014 adds:

- `fleet_response_transit_leg` — outbound and return attempts, endpoints, route length, status, and timing.
- `fleet_response_transit_encounter` — links shared world encounters to the operation and exact response leg.
- Response phase, attempt number, material commitment, departure, arrival, return-start, and responder-return timestamps on each operation.

The transit ledger distinguishes departure preparation, active transit, arrival, failure, and cancellation. A response can therefore be reconstructed from assignment through every hazard and retry to final recovery.

## Ecological cycle

Every normalized world location receives persistent ecological state:

- Primary producers and microbial productivity.
- Algal bloom activity.
- Herbivore biomass.
- Predator biomass and feeding-ground migration pressure.
- Scavenger biomass.
- Biological accumulator mass.
- Nutrient load.
- Habitat integrity.

Producer and algal growth support herbivore expansion. Herbivore concentrations support predator expansion. Predator pressure can spread toward richer feeding grounds and feed fauna-clearing work back into the mission system. Scavengers and nutrient recycling influence habitat recovery and future producer growth.

Biological accumulation can expose renewable Bioactive Accumulator sites. Large blooms can expose renewable Algae Harvest sites.

Harvesting is not ecologically free. Algae extraction reduces primary producers and bloom mass. Bioactive extraction reduces accumulated biological material. Both can lower local habitat integrity, which in turn slows later renewable recovery.

## Geological cycle

Every location also receives persistent geological state:

- Tectonic stress.
- Hydrothermal activity.
- Mineral exposure.
- Cave instability.
- Sediment flux.

Hydrothermal events and rockfalls can expose ore veins, rare-mineral deposits, and hydrothermal deposits. Geological change can close old passages, expose new terrain, alter resource accessibility, and affect habitat integrity.

Mineral extraction reduces exposed material and increases cave instability. A rich deposit therefore becomes less productive and potentially more dangerous as it is worked.

## Finite resource sites

Each natural-resource site records:

- Remaining harvestable units.
- Carrying capacity.
- Current richness and accessibility.
- Per-mission harvesting rate.
- Renewable or nonrenewable classification.
- Recovery progress and dormant-until tick.
- Extraction count and last-harvest tick.

Nonrenewable ore veins, rare minerals, and hydrothermal deposits remain depleted when their reserve reaches zero. The older behavior that could reopen an exhausted mineral site as dormant is explicitly blocked.

Renewable algae and bioactive sites enter `DORMANT` status when exhausted. After their dormancy interval, recovery advances according to local habitat integrity. At full recovery they restore a bounded fraction of carrying capacity, return to `SURVEYED`, and generate another mission opportunity.

Renewable sites can also regain one unit gradually while exposed or surveyed, but never above carrying capacity.

## Extraction batches

A completed resource-linked mission creates one immutable `resource_extraction_batch`. The batch records:

- Site, mission, station, vessel, and freight identities.
- Tick sequence and resource type.
- Catalogue item and measured quantity.
- Reserve and richness before and after extraction.
- Ecological or geological impact.
- Calculated cargo value.
- Pre-mission station and vessel state used to remove the old generic reward safely.

The quantity is bounded by the site's remaining reserve, harvesting rate, a maximum batch size, and the assigned vessel's relevant mining, research, or engineering capability.

Schema 013 preserves compatibility with the existing Java mission executor. The executor still applies its historical generic mining, research, or salvage reward, but the extraction batch snapshots the exact pre-mission values. When the vessel begins its return voyage, those generic changes are restored exactly—even when industry or threat reached a clamp. Only the measured freight remains as the economic result.

## Freight and station settlement

Extraction creates a typed in-transit freight lot:

- Ore Vein → Raw Europan Ore.
- Rare Minerals → Rare Europan Minerals.
- Hydrothermal Deposit → Hydrothermal Compounds.
- Bioactive Accumulator → Bioactive Compounds.
- Algae Harvest → Algae Biomass.

The old passive rule that granted every functioning station free ore each cycle has been removed. Stations must receive ore through deliveries, ordinary mission systems, imports, or future player-directed harvesting.

When the assigned NPC vessel docks, the existing freight pipeline:

1. Marks the lot delivered.
2. Adds the typed item to station inventory.
3. Credits the station at catalogue value.
4. Writes treasury evidence.

Schema 013 then updates the abstract station state according to resource type and reclassifies the treasury row as Mining, Research, or Trade while preserving the originating resource-site identity.

## Mission feedback

Natural activity remains connected to the existing NPC mission queue.

- Ore veins and rare minerals create Mining opportunities.
- Hydrothermal and bioactive sites create Research opportunities.
- Algal harvest sites create Salvage opportunities.
- Predator-range expansion creates Fauna Clearing opportunities.

Resource-linked missions are tracked separately from generic missions. A site cannot create another harvesting mission while one of its linked missions is available, assigned, or active. Partial extraction returns the site to `SURVEYED`; the next passive cycle can create a new UUID-safe mission. Failed or cancelled missions release the site without consuming its reserve.

## Atomicity

All extraction and response effects remain inside existing SQLite writer boundaries.

A passive cycle can include:

- Clock receipt and checkpoint.
- Response assignment or phase change.
- NPC transit resolution and linked encounter evidence.
- On-scene progress and one-time material commitment.
- Return or towing departure.
- Mission completion.
- Extraction-batch evidence.
- Site depletion and status transition.
- Ecological or geological impact.
- Freight creation.

A failure rolls the entire passive cycle back. No resource can be removed without its extraction batch and freight lot. No response can advance, consume materials, or change phase without its vessel and transit evidence committing in the same cycle.

NPC docking and freight delivery use the exclusive world writer and settle inventory, station state, credits, and treasury evidence together.

## Desktop console

Run the live read-only console with:

```text
toolbox.cmd natural-world
```

The console exposes:

- Fleet response status, phase, attempt, material commitment, responder state, and timing.
- Outbound and return transit legs.
- Response-linked hazards and deterministic outcomes.
- Fleet response logs.
- Ecological biomass and migration pressure.
- Geological stress and exposed resources.
- Site reserves, capacity, rate, recovery, dormancy, and extraction history.
- A typed extraction ledger with before-and-after reserve evidence.
- Natural events.

The console shares the process-wide selected desktop world and refreshes while Passive Mode is active.

## Verification

The complete verification task includes schema-014 fleet transit, natural-world activity, and schema-013 harvesting:

```text
toolbox.cmd verify
```

The fleet transit contract verifies:

- Immediate dispatch into an outbound phase.
- Shared deterministic transit before on-scene progress.
- Response-linked transit encounters.
- Material gating only after arrival.
- One-time material commitment.
- A second return or towing leg.
- No casualty restoration before return arrival.
- Final responder and casualty docking.
- Retry-safe operation state after transit failure.

The harvesting contract verifies:

- Fresh, legacy, and pre-renumber local-development migration through schema 026.
- Removal of passive free-ore generation.
- Finite reserve initialization.
- Bounded capability-sensitive extraction.
- Exact restoration of historical generic rewards.
- Typed freight creation and NPC delivery.
- Item-level inventory settlement.
- Abstract station-economy support.
- Treasury classification and site provenance.
- Geological extraction impact.
- Renewable dormancy, recovery, and mission regeneration.
- Permanent nonrenewable depletion.
