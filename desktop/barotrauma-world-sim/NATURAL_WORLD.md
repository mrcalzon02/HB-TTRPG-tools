# Passive Fleet Recovery and Natural World

The desktop Barotrauma world database currently uses schema 012 for fleet recovery, ecological activity, geological activity, natural resource exposure, and mission generation.

## Fleet response

Disabled NPC vessels create durable rescue or towing operations. Besieged stations create reinforcement operations. The response queue supports rescue, towing, repair, refuel, rearm, and reinforcement categories.

Qualified Salvage, Patrol, and Courier vessels receive priority for active response operations. A vessel already assigned to an active fleet response is protected from ordinary mission assignment.

Response progress is material-gated. The origin station must retain the required fabricated steel, fuel, ammunition, and medical inventory. An undersupplied station cannot complete recovery by simulation fiat. Once the required material is available, Passive Mode advances the response until the casualty is recovered or the station is reinforced.

Current recovery completion restores a disabled NPC vessel to its home station, clears its failed route and mission state, restores a serviceable amount of hull and supplies, consumes the declared station inventory, and writes response-history evidence.

The present recovery movement is abstracted at the operation level. The next refinement is to represent the responder's outbound and towing voyage through the shared transit resolver rather than only through operation progress.

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

## Geological cycle

Every location also receives persistent geological state:

- Tectonic stress.
- Hydrothermal activity.
- Mineral exposure.
- Cave instability.
- Sediment flux.

Hydrothermal events and rockfalls can expose ore veins, rare-mineral deposits, and hydrothermal deposits. Geological change can close old passages, expose new terrain, alter resource accessibility, and affect habitat integrity.

## Mission feedback

Natural activity is connected to the existing NPC mission queue.

- Ore veins and rare minerals create Mining opportunities.
- Hydrothermal and bioactive sites create Research opportunities.
- Algal harvest sites create Salvage opportunities.
- Predator-range expansion creates Fauna Clearing opportunities.

These missions use the existing world locations, station origins, role-aware assignment, transit resolver, voyage logs, and station reward effects.

## Desktop console

Run the read-only live console with:

```text
gradle runNaturalWorld
```

The console exposes:

- Fleet response operations and response logs.
- Ecological biomass and migration pressure.
- Geological stress and exposed resources.
- Natural events.
- Renewable and mineral resource sites.

The console shares the process-wide selected desktop world and refreshes while Passive Mode is active.

## Verification

The complete verification task includes the fleet recovery and natural-world contract:

```text
gradle verifyWorldStore
```

The contract verifies initialization, immediate response assignment, material-gated recovery, casualty restoration, ecological change, algal blooms, predator expansion, hydrothermal or rockfall events, renewable bioaccumulator sites, and current-schema persistence.
