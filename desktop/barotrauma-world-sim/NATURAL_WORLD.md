# Passive Fleet Recovery, Natural World, and Resource Extraction

The desktop Barotrauma world database uses schema 013 for fleet recovery, ecological activity, geological activity, natural-resource exposure, finite extraction, freight settlement, and renewable recovery.

## Fleet response

Disabled NPC vessels create durable rescue or towing operations. Besieged stations create reinforcement operations. The response queue supports rescue, towing, repair, refuel, rearm, and reinforcement categories.

Qualified Salvage, Patrol, and Courier vessels receive priority for active response operations. A vessel already assigned to an active fleet response is protected from ordinary mission assignment.

Response progress is material-gated. The origin station must retain the required fabricated steel, fuel, ammunition, and medical inventory. An undersupplied station cannot complete recovery by simulation fiat. Once the required material is available, Passive Mode advances the response until the casualty is recovered or the station is reinforced.

Current recovery completion restores a disabled NPC vessel to its home station, clears its failed route and mission state, restores a serviceable amount of hull and supplies, consumes the declared station inventory, and writes response-history evidence.

The present recovery movement is abstracted at the operation level. A later refinement will represent the responder's outbound and towing voyage through the shared transit resolver rather than only through operation progress.

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

Harvesting is no longer ecologically free. Algae extraction reduces primary producers and bloom mass. Bioactive extraction reduces accumulated biological material. Both can lower local habitat integrity, which in turn slows later renewable recovery.

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

Each natural-resource site now records:

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

The old passive rule that granted every functioning station free ore each cycle has been removed. Stations must now receive ore through deliveries, ordinary mission systems, imports, or future player-directed harvesting.

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

All extraction effects occur inside the existing passive-cycle SQLite transaction when a resource mission completes:

- Mission completion.
- Extraction-batch evidence.
- Site depletion and status transition.
- Ecological or geological impact.
- Freight creation.
- Clock receipt, checkpoint, and passive-cycle evidence.

A failure rolls the entire passive cycle back. No resource can be removed without its extraction batch and freight lot being committed with it.

NPC docking and freight delivery use the existing exclusive world writer and settle inventory, station state, credits, and treasury evidence together.

## Desktop console

Run the live read-only console with:

```text
gradle runNaturalWorld
```

The console exposes:

- Fleet response operations and response logs.
- Ecological biomass and migration pressure.
- Geological stress and exposed resources.
- Site reserves, capacity, rate, recovery, dormancy, and extraction history.
- A typed extraction ledger with before-and-after reserve evidence.
- Natural events.

The console shares the process-wide selected desktop world and refreshes while Passive Mode is active.

## Verification

The complete verification task includes fleet recovery, natural-world activity, and schema-013 harvesting:

```text
gradle verifyWorldStore
```

The harvesting contract verifies:

- Fresh and legacy migration to schema 013.
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
