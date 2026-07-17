# EXO Vessel Design System — Phased Design Philosophy and Implementation Guide

**Document authority:** Charles-authored Blacklight EXO engineering framework  
**Status:** Governing design guide for the vessel engineering, voxel assembly, condition, combat, and gameplay-stat systems  
**Primary objective:** Produce deterministic, coherent vessels whose physical layouts, engineering statistics, weapons, damage states, and gameplay actions all derive from the same species, manufacturer, technology, mission, transit, and condition records.

---

## 1. Purpose and governing principle

The vessel system must not begin with a silhouette and invent statistics afterward. It must begin with the machinery, living requirements, mission, construction culture, available technology, and operating state that must physically coexist.

The existing vessel engineering kernel already establishes a defensible first-order mass and power ledger from:

- FTL apparatus mass and installed volume;
- drive integration structure and service access;
- continuous and peak power requirements;
- active fuel, containment, transfer, and reserve systems;
- coolant, heat stores, radiators, and thermal debt;
- species-specific atmosphere, pressure, temperature, gravity, solvent, nutrition, and medical requirements;
- shielding, navigation, sensors, conventional propulsion, maintenance, payload, and design margin;
- Internals-first, EVA-first, or hybrid construction philosophy.

The next system must preserve that engineering record and germinate four additional layers from it:

1. **A coherent three-dimensional vessel layout.**
2. **A physical protection, sensor, maneuver, and weapons model.**
3. **A continuous vessel condition and damage state.**
4. **Readable RPG statistics and actions derived from the same physical model.**

The system therefore has one non-negotiable rule:

> Every gameplay value must be traceable to a physical, technological, organizational, biological, architectural, or condition input. Every physical record must remain readable even when it is compressed into gameplay statistics.

---

## 2. Scope boundary

This framework is intended to generate:

- civilian utility craft;
- merchant vessels and tankers;
- passenger and colony transports;
- survey and scientific vessels;
- naval and paramilitary ships;
- fixed or semi-mobile transit installations;
- alien vessels built around nonhuman environmental requirements;
- new, used, incomplete, damaged, abandoned, salvaged, wrecked, and destroyed vessel instances;
- deterministic voxel representations suitable for inspection, gameplay abstraction, and later visual refinement.

This framework is not intended to become a real-world spacecraft or weapons construction manual. Weapon and protection behavior is represented at the level required for internally coherent fiction and tabletop or computer-game resolution.

---

## 3. Core system architecture

The complete vessel record should be treated as a sequence of immutable source layers and derived layers.

### 3.1 Immutable or source-authoritative layers

These records are inherited or selected before layout generation:

- `speciesProfile`
- `organizationProfile`
- `manufacturerProfile`
- `technologyBand`
- `missionRole`
- `operatingDoctrine`
- `transitArchitecture`
- `biologyRequirements`
- `constructionPhilosophy`
- `initialConditionState`
- `generationSeedHierarchy`

### 3.2 Derived engineering layers

These records are computed from the source layers:

- `engineeringBaseline`
- `architectureAdjustedMassLedger`
- `powerAndThermalLedger`
- `armorAndProtectionLedger`
- `sensorAndNavigationLedger`
- `maneuverAndDeltaVLedger`
- `weaponInventory`
- `countermeasureInventory`
- `moduleGraph`
- `voxelLayout`
- `damageTopology`
- `combatEnvelope`
- `gameplayStatBlock`
- `actionSet`

### 3.3 Audit requirement

Every derived record must retain:

- the source values used;
- the equation or rule applied;
- the resulting value;
- the confidence or abstraction level;
- the gameplay interpretation;
- any value that was clamped, floored, or imposed by design policy.

---

## 4. Deterministic seed hierarchy

The procedural system should use nested seeds so that a species can produce multiple recognizable manufacturers and each manufacturer can produce multiple recognizable vessel families.

```text
speciesSeed
  └─ organizationSeed
       └─ manufacturerSeed
            └─ hullFamilySeed
                 └─ vesselInstanceSeed
                      ├─ layoutSeed
                      ├─ equipmentSeed
                      ├─ conditionSeed
                      └─ historySeed
```

### 4.1 Seed responsibilities

| Seed | Governs |
| --- | --- |
| `speciesSeed` | Biology, sensory priorities, body scale, native gravity, atmosphere, cognition, broad material culture. |
| `organizationSeed` | Civilian, commercial, military, religious, scientific, state, clan, or corporate operating doctrine. |
| `manufacturerSeed` | Structural material, internal/EVA bias, standardization, repair doctrine, preferred topology, naming, tolerances, production style. |
| `hullFamilySeed` | Repeating class identity, module proportions, silhouette grammar, standard hardpoints, expected role variants. |
| `vesselInstanceSeed` | Serial-level differences, installed options, construction defects, refits, wear, damage, salvage, and local modifications. |

A vessel regenerated with the same complete seed chain and the same inputs must reproduce the same engineering record, module graph, voxel layout, weapon selection, and condition state.

---

## 5. Technology-band discipline

A vessel must belong to one principal technology band. It may contain minor variation within that band, but it should not randomly combine a primitive hull with systems several complete Path levels ahead.

### 5.1 Technology scale

| Band | Interpretation |
| --- | --- |
| `T-1` | Sub-P0 technology broadly comparable to early twenty-first-century Earth principles, materials, computation, chemical propulsion, industrial robotics, and conventional weapons. |
| `P0` | First experimental exosolar or transit-era technology. Extremely large, inefficient, labor-intensive, fragile, and infrastructure-dependent. |
| `P1` | Repeatable experimental technology with limited standardization and improved diagnostics. |
| `P2` | Early industrial implementation, still installation-heavy and maintenance-intensive. |
| `P3` | Capital-scale mobile prototypes and limited operational service. |
| `P4` | Fleet-operational standard with mature industrial support. |
| `P5` | Compact, highly automated, modular, predictive-maintenance technology. |
| `P6` | Advanced adaptive systems with extreme miniaturization, autonomous repair, and continuous metrology. |

### 5.2 Variant grades within one band

Each subsystem receives a local variant grade without changing the vessel’s principal Path level.

| Variant | Numeric offset | Meaning |
| --- | ---: | --- |
| `LEGACY` | `-0.30` | Older but compatible machinery, often heavier or less efficient. |
| `STANDARD` | `0.00` | Normal technology for the vessel’s Path level. |
| `REFINED` | `+0.12` | Better manufacturing, calibration, software, or materials within the same band. |
| `ADVANCED` | `+0.22` | High-end implementation near the top of the band. |
| `PROTOTYPE` | `+0.30` | Unusually capable but expensive, unreliable, difficult to maintain, or poorly standardized. |

### 5.3 Variation restrictions

- No normal subsystem may exceed `±0.30` of the vessel’s principal Path level.
- A `P0` vessel may include `T-1`-derived conventional systems, but those systems must be explicitly labeled as legacy or adapted technology.
- A higher-Path vessel may retain obsolete equipment through refit history, scarcity, doctrine, or cultural preference.
- Prototype variation increases maintenance, cost, calibration burden, and failure uncertainty rather than granting free performance.
- Manufacturer profiles define the probability distribution of `LEGACY`, `STANDARD`, `REFINED`, `ADVANCED`, and `PROTOTYPE` equipment.

---

## 6. Species and manufacturer profiles

The current four architectural archetypes remain useful templates, but the finished system must generate persistent manufacturers specific to each species and organization.

### 6.1 Species-derived manufacturing pressures

Species records should influence:

- occupied deck height and corridor width;
- pressure-vault strength;
- preferred gravity orientation;
- liquid, gas, cryogenic, toxic, vacuum, or mixed habitat requirements;
- manipulator reach and service access dimensions;
- visual and nonvisual sensor placement;
- tolerance for radiation, acceleration, heat, contamination, vibration, and isolation;
- whether routine EVA is biologically ordinary, difficult, or impossible;
- whether the species considers a machine room habitable, hostile, sacred, disposable, or autonomous.

### 6.2 Organization-derived pressures

Organizations influence:

- civilian safety margin;
- commercial standardization;
- military redundancy;
- prestige construction;
- planned service life;
- crew versus automation doctrine;
- acceptable casualty risk;
- salvage and field-repair doctrine;
- weapons restrictions;
- inspection and certification burden;
- preferred suppliers and incompatible proprietary interfaces.

### 6.3 Manufacturer profile schema

Each generated manufacturer should contain at least:

```json
{
  "manufacturerId": "species-org-manufacturer",
  "name": "Generated manufacturer name",
  "speciesId": "source species",
  "organizationId": "source organization",
  "baseTechnologyBand": "P4",
  "internalsBias": 0.42,
  "evaBias": 0.58,
  "topologyWeights": {
    "monocoque": 0.20,
    "spine": 0.35,
    "cluster": 0.35,
    "ring": 0.10
  },
  "standardization": 0.90,
  "modularity": 0.76,
  "armorDoctrine": "distributed-spaced",
  "repairDoctrine": "line-replaceable-external",
  "redundancyDoctrine": "dual-critical-triple-command",
  "preferredMaterials": [],
  "preferredWeapons": [],
  "forbiddenWeapons": [],
  "variantDistribution": {},
  "namingGrammar": {},
  "visualGrammar": {},
  "serviceLifeYears": 80,
  "refitIntervalYears": 12,
  "allowedDeviationVariance": 0.10
}
```

### 6.4 Manufacturer continuity

Once generated, a manufacturer profile should be reusable across multiple vessel generations. Ships from the same manufacturer should be recognizable through:

- recurring structural proportions;
- standard module dimensions;
- repeated hardpoint spacing;
- common sensor arrangements;
- characteristic radiator placement;
- shared armor layering;
- preferred weapon families;
- naming patterns;
- maintenance practices;
- predictable strengths and weaknesses.

---

## 7. Construction philosophy and topology

Internals-first and EVA-first remain the primary architectural philosophies. They are not identical to physical topology.

A vessel may be:

- Internals-first monocoque;
- Internals-first clustered citadel;
- EVA-first spine;
- EVA-first cluster;
- hybrid monocoque-and-rail;
- hybrid protected spine;
- ring habitat around an internal or external machinery core.

### 7.1 Topology classes

| Topology | Core concept | Typical strengths | Typical weaknesses |
| --- | --- | --- | --- |
| `MONOCOQUE` | One dominant pressure and structural shell. | Strong global armor, compact routing, good acceleration load paths. | Heavy, difficult internal replacement, cascading damage. |
| `SPINE` | Long structural keel with modules attached along it. | Clear thrust path, modular growth, external service access. | Vulnerable keel, long routing, high visible area. |
| `CLUSTER` | Multiple pods connected around a hub or short truss network. | Damage isolation, mixed environments, easy specialization. | Complex control, docking loads, duplicated interfaces. |
| `RING` | Rotating or circular habitat around a central spine or hub. | Gravity support, large habitation volume, distributed access. | Bearing and balance burden, large target profile, dynamic loads. |
| `CITADEL_AND_RAIL` | Armored internal crew and command core with exposed replaceable systems. | Strong hybrid doctrine, good survivability and modularity. | Interface complexity, split maintenance methods. |

### 7.2 Structural-spine requirement

Every mobile vessel must produce a continuous load path connecting:

- primary conventional thrust;
- FTL foundations or field-coverage anchors;
- major fuel and reaction-mass loads;
- docking or landing loads;
- habitat acceleration support;
- weapon recoil or launch forces;
- major external modules.

A generated layout that lacks a continuous load path is invalid even if all modules fit geometrically.

---

## 8. Crude three-dimensional voxel assembler

The first voxel system should be intentionally crude but semantically rigorous. It should generate coherent occupied volumes, access paths, structural connections, and external hardpoints before attempting detailed art.

### 8.1 Adaptive voxel resolution

| Vessel characteristic | Suggested voxel edge |
| --- | ---: |
| Small craft below 40 m | `0.5–1 m` |
| Ordinary ships 40–300 m | `2 m` |
| Large ships 300–2,000 m | `5–10 m` |
| Megastructures and P0–P2 installations | `20–100 m` aggregate cells |

The assembler should cap total voxel count and increase cell size automatically for enormous installations.

### 8.2 Semantic voxel types

The layout should not begin as anonymous solid blocks. Each occupied cell should carry a semantic type such as:

- `STRUCTURE`
- `PRESSURE_HULL`
- `VACUUM_TRUSS`
- `CORRIDOR`
- `LADDER_OR_LIFT`
- `ATMOSPHERE_MANIFOLD`
- `POWER_TRUNK`
- `DATA_TRUNK`
- `COOLANT_TRUNK`
- `FUEL_LINE`
- `DRIVE_APPARATUS`
- `REACTOR`
- `ENERGY_STORAGE`
- `FUEL_TANK`
- `COOLANT_TANK`
- `HABITAT`
- `LIFE_SUPPORT`
- `MEDICAL`
- `COMMAND`
- `SENSOR`
- `RADIATOR`
- `MANEUVER_ENGINE`
- `MAIN_ENGINE`
- `WEAPON`
- `MAGAZINE`
- `COUNTERMEASURE`
- `CARGO`
- `MAINTENANCE`
- `AIRLOCK`
- `DOCKING`
- `ARMOR`
- `VOID`
- `DESTROYED`

### 8.3 Generation sequence

1. **Select topology.** Use manufacturer, mission, construction philosophy, drive shape, and species requirements.
2. **Create principal load path.** Generate the keel, shell, ring, hub, or clustered truss.
3. **Reserve immutable machinery volumes.** Place the drive apparatus, fuel contents, coolant, environmental medium, and other physically fixed inventory.
4. **Place catastrophic-risk modules.** Reactor, antimatter, singularity, high-energy storage, magazines, and toxic or cryogenic systems require segregation rules.
5. **Place habitat and command.** Protect from radiation, thermal sources, magazines, and engine plume while maintaining escape and service access.
6. **Place navigation and sensors.** Preserve clear baselines, line of sight, and physical separation from high-noise machinery.
7. **Place propulsion and radiators.** Preserve thrust alignment, plume clearance, radiator view factor, and deployment space.
8. **Place cargo and mission systems.** Respect loading access, center of mass, and role priorities.
9. **Route utilities.** Generate atmosphere, power, data, coolant, and fuel graphs.
10. **Generate access.** Internal routes require corridors, locks, lifts, and service galleries. EVA routes require hardpoints, handrails, manipulators, drones, and remote disconnects.
11. **Apply armor and shielding.** Armor follows threat arcs, criticality, doctrine, and mass limit.
12. **Place weapons and countermeasures.** Verify arcs, recoil paths, magazine segregation, exhaust, and sensor interference.
13. **Validate connectivity and load paths.** Reject or repair impossible layouts.
14. **Apply condition state.** Remove, damage, expose, contaminate, or destroy voxels and recalculate connectivity.

### 8.4 Placement constraints

Examples of mandatory logical constraints:

- An `INTERNAL` module must attach beneath an `ATMOSPHERE_MANIFOLD` or an explicitly unpressurized internal service volume.
- An `EVA` module must attach to a `VACUUM_EXPOSED` structural hardpoint.
- A crew-dependent module cannot be placed in vacuum without a pressure shell or explicit remote-operation doctrine.
- A radiator must have a clear radiative field and cannot be completely enclosed by armor while deployed.
- A main engine requires an unobstructed exhaust corridor.
- A weapon requires a valid firing arc and cannot fire through the vessel’s own structure.
- A magazine must be connected to its weapon while remaining isolated from primary habitat and command volumes.
- A reactor or dangerous energy plant requires shielding or separation appropriate to its technology.
- A sensor baseline must not collapse into one point merely because a compact hull is visually convenient.
- Every inhabited compartment must reach an evacuation, refuge, or rescue route unless the vessel state explicitly records that the route has been destroyed.

### 8.5 Layout outputs

The assembler should output:

- voxel grid or compressed sparse voxel graph;
- module bounding boxes;
- structural graph;
- pressure-zone graph;
- utility-routing graphs;
- service-access graph;
- weapon firing arcs;
- sensor baselines and occlusion zones;
- armor coverage map;
- damage-propagation graph;
- evacuation graph;
- center of mass and principal axes;
- invalid or compromised connections.

---

## 9. Vessel service doctrine and condition state

Mission role, ownership, readiness, construction completeness, physical damage, salvage, and destruction must be separate axes.

A merchant ship can be brand new, abandoned, partially dismantled, or seventy-five percent destroyed. A military vessel can be intact but unfueled, fully fueled but not commissioned, or structurally complete but missing its sensor suite.

### 9.1 Service doctrine

Recommended values:

- `CIVILIAN`
- `MERCHANT`
- `PASSENGER`
- `INDUSTRIAL`
- `SCIENTIFIC`
- `COLONIAL`
- `GOVERNMENT`
- `PARAMILITARY`
- `MILITARY`
- `PIRATE_OR_IRREGULAR`
- `ABANDONED_OR_UNKNOWN`

### 9.2 Lifecycle and condition axes

```json
{
  "constructionCompletionPercent": 100,
  "commissioningCompletionPercent": 100,
  "operationalReadinessPercent": 92,
  "structuralDamagePercent": 8,
  "systemDamagePercent": 12,
  "salvageRemovalPercent": 0,
  "decommissioningPercent": 0,
  "maintenanceDebtPercent": 18,
  "fuelLoadPercent": 74,
  "coolantLoadPercent": 89,
  "atmosphereIntegrityPercent": 100,
  "contaminationPercent": 0,
  "crewAvailabilityPercent": 100,
  "dataIntegrityPercent": 97
}
```

### 9.3 Named condition templates

| Template | Typical axis behavior |
| --- | --- |
| `NEWLY_MANUFACTURED` | Complete, low damage, low maintenance debt, may be uncommissioned or partially fueled. |
| `PARTIALLY_COMPLETED` | Construction below 100%; missing modules are absent, not damaged. |
| `COMMISSIONING` | Structurally complete but calibration, trials, software, stores, or certification are incomplete. |
| `OPERATIONAL` | Mission-capable with ordinary wear and load state. |
| `WORN_SERVICE` | High maintenance debt and reduced reliability without major structural destruction. |
| `PARTIALLY_TORN_DOWN` | Deliberate decommissioning or refit; removed systems remain identifiable as planned removals. |
| `MOTHBALLED` | Intact but drained, inhibited, sealed, and not immediately operational. |
| `ABANDONED` | Crew absent; physical condition can range from pristine to ruined. |
| `PARTIALLY_SALVAGED` | Valuable modules and materials removed according to salvage priorities. |
| `DAMAGED` | Localized structural and system losses with remaining mission capability. |
| `CRIPPLED` | Major propulsion, power, command, or pressure failure; limited survival or combat capability. |
| `WRECKED` | Coherent hull remains, but ordinary operation is impossible. |
| `DESTROYED` | Catastrophic loss; distinguish partial wreckage from complete dispersal. |

### 9.4 Destruction percentage interpretation

| Destruction | Interpretation |
| ---: | --- |
| `0%` | No destruction. Wear and maintenance debt may still exist. |
| `1–10%` | Local damage, cosmetic loss, isolated disabled systems. |
| `11–25%` | Noticeable mission impairment; one or more local zones lost. |
| `26–49%` | Severe damage; multiple systems disconnected or exposed. |
| `50–74%` | Crippled; major functions lost, but the vessel remains a coherent object. |
| `75–89%` | Wrecked; large surviving sections remain salvageable or occupiable. |
| `90–99%` | Catastrophic remnants; only isolated fragments or heavily damaged core sections remain. |
| `100%` | Total loss of the vessel as a coherent structure. Material may remain as debris, but no vessel graph survives. |

A seventy-five-percent destroyed ship must still preserve surviving compartments, modules, data, hazards, salvage, and recognizable structure. A one-hundred-percent destroyed ship must not retain an intact functional hull hidden behind a label.

### 9.5 Condition application order

Condition generation should occur after the intact layout is complete:

1. Generate the intact reference vessel.
2. Apply missing construction work.
3. Apply deliberate refit or teardown removals.
4. Apply wear and maintenance debt.
5. Apply damage events.
6. Apply fire, decompression, contamination, heat, and secondary propagation.
7. Apply salvage removals.
8. Recalculate connectivity, pressure, power, cooling, sensors, propulsion, weapons, and gameplay statistics.

This preserves the difference between “never installed,” “removed intentionally,” “destroyed,” and “salvaged.”

---

## 10. Armor, shielding, and protection-to-mass model

Armor must be budgeted as physical area, thickness or areal density, material behavior, coverage, and architecture—not as a free abstract number.

### 10.1 Basic armor mass relationship

```text
armor mass = protected surface area × areal density × coverage fraction
```

The existing vessel surface-area estimate can provide the first-order envelope. The voxel layout later supplies local surface areas and actual coverage.

### 10.2 Protection layers

A vessel may combine:

- Whipple or spaced debris shields;
- sacrificial bumper layers;
- structural armor;
- thermal and laser ablatives;
- radiation shielding;
- electromagnetic or plasma-assisted protection;
- local shadow shields around reactors and habitats;
- armored citadels;
- disposable external pods;
- active interceptors and point defense;
- maneuver and signature control.

### 10.3 Protection doctrine

Armor allocation should consider:

- crew survival priority;
- command and navigation criticality;
- drive and reactor catastrophic-failure risk;
- expected threat direction;
- whether the module is replaceable;
- whether the module is internal or EVA-mounted;
- whether a hit is more likely to penetrate, ablate, heat, spall, fragment, contaminate, or disconnect the target.

### 10.4 Armor efficiency and architecture

Internals-first vessels receive better global coverage efficiency because one armor belt protects many systems. EVA-first vessels require localized protection for each pod and exposed conduit. EVA-first systems compensate through isolation, replacement, dispersion, and the ability to sacrifice modules without losing the inhabited core.

### 10.5 Relativistic protection boundary

At sufficiently high impact velocity, passive armor cannot be treated as a conventional hit-point wall. Kinetic energy rises rapidly, and near-relativistic impacts produce radiation, plasma, fragmentation, and catastrophic local energy deposition.

The game model should therefore transition from:

- `armor absorption`

toward:

- `avoidance`,
- `interception`,
- `deflection`,
- `dispersion`,
- `sacrificial separation`,
- `damage localization`,
- `survival of critical graphs`.

A vessel may survive because the incoming object misses, is intercepted, strikes an expendable pod, or fails to sever the critical structural and utility network—not because a thin armor statistic subtracts a fractional-c impact without consequence.

---

## 11. Sensor, tracking, and light-lag model

Space combat is fundamentally constrained by information age.

### 11.1 Information delay

For range `R`:

```text
one-way observation age = R / c
closed-loop command or confirmation age ≈ 2R / c
```

The target seen by the firing vessel is already somewhere else by the time its light arrives. A weapon fired from that observation reaches the target later still.

### 11.2 Track state

Every target track should record:

- last observation time;
- observation age;
- position uncertainty;
- velocity uncertainty;
- acceleration or maneuver uncertainty;
- signature confidence;
- identity confidence;
- sensor-source agreement;
- deception or decoy probability;
- predicted maneuver envelope.

### 11.3 Maneuver uncertainty envelope

A first-order target displacement envelope can use:

```text
uncertainty radius ≈ position error
                   + velocity error × time of flight
                   + 0.5 × possible lateral acceleration × time of flight²
```

The target’s available combat delta-v limits how long it can continue to maneuver aggressively, but even modest lateral acceleration can move a ship far outside a narrow projectile or beam footprint over a long engagement time.

### 11.4 Practical combat consequence

Many weapons become “knife-fight” weapons not because they stop existing at long range, but because the target’s possible position becomes much larger than the weapon’s lethal footprint.

A weapon’s useful range is therefore not one fixed number. It is an engagement envelope derived from:

- target track quality;
- time of flight;
- target acceleration;
- remaining target delta-v;
- weapon guidance;
- beam divergence or projectile dispersion;
- target size;
- lethal footprint;
- countermeasures;
- willingness to waste ammunition or energy.

---

## 12. Weapon realism framework

Every weapon family should expose four ranges rather than one:

1. **Point-defense range:** high confidence against incoming weapons or nearby craft.
2. **Practical combat range:** reasonable probability of meaningful effect against the modeled target.
3. **Harassment or area-denial range:** low direct-hit confidence but useful for forcing maneuvers, denying corridors, or attacking predictable paths.
4. **Theoretical reach:** the projectile or beam can physically travel this far, but a hit is not operationally credible without special conditions.

### 12.1 Shared weapon record

```json
{
  "weaponFamily": "MISSILE",
  "technologyBand": "P4",
  "mountMassTonnes": 18,
  "supportMassTonnes": 32,
  "magazineMassTonnes": 140,
  "peakPowerW": 0,
  "continuousPowerW": 800000,
  "heatPerShotJ": 0,
  "projectileVelocityMps": 0,
  "guidance": true,
  "terminalDeltaVMps": 0,
  "lethalFootprintM": 0,
  "dispersionModel": {},
  "sensorDependency": {},
  "countermeasureVulnerabilities": [],
  "preferredTargets": [],
  "engagementEnvelope": {}
}
```

---

## 13. Weapon-family interpretations

### 13.1 Chemical ballistic weapons

**Examples:** conventional cannon, autocannon, chemically launched defensive rounds.

**Strengths**

- simple and inexpensive;
- low electrical demand;
- useful for close defense, debris clearing, boarding support, and low-technology vessels;
- ammunition can carry specialized payloads.

**Limitations**

- low muzzle velocity compared with electromagnetic systems;
- long time of flight at meaningful space ranges;
- substantial ammunition mass;
- recoil and barrel wear;
- poor hit probability against maneuvering ships outside close range.

**Gameplay role:** cheap close-range or point-defense weapons, especially at `T-1`, `P0`, and low industrial maturity.

### 13.2 Rail guns

**Interpretation:** conductive projectiles accelerated along rails.

**Strengths**

- high projectile velocity relative to chemical guns;
- excellent kinetic effect against predictable targets;
- useful for station defense, corridor denial, and large slow targets;
- ammunition can be comparatively simple.

**Limitations**

- rail erosion, heat, switching, recoil, and power demand;
- unguided rounds become avoidable over long flight time;
- firing reveals position and intent;
- ammunition still consumes mass and magazine volume.

**Gameplay role:** high-damage direct fire within a track-quality-limited practical envelope; long-range area denial against predictable trajectories.

### 13.3 Coil guns

**Interpretation:** staged electromagnetic acceleration without direct rail contact.

**Strengths**

- potentially lower barrel wear;
- flexible projectile forms;
- good compatibility with guided or course-correcting rounds at higher technology;
- scalable from point defense to heavy spinal mounts.

**Limitations**

- complex switching and synchronization;
- long accelerator structures for extreme velocity;
- power and cooling burden;
- unguided rounds retain the same light-lag and maneuver problem as rail projectiles.

**Gameplay role:** versatile kinetic family whose effectiveness depends heavily on projectile guidance and target maneuver authority.

### 13.4 Brute mass throwers

**Interpretation:** very large masses launched at modest or high velocity.

**Strengths**

- extreme total momentum and structural damage;
- useful against stations, moons, fixed infrastructure, disabled ships, or predictable orbital targets;
- difficult to stop once committed.

**Limitations**

- enormous launcher, ammunition, and recoil burden;
- slow rate of fire;
- conspicuous preparation;
- poor utility against agile ships unless the target is constrained;
- strategic and political consequences.

**Gameplay role:** siege, interdiction, and strategic infrastructure attack rather than ordinary ship dueling.

### 13.5 Sand guns and particulate weapons

**Interpretation:** clouds of pellets, dust, fragments, ablative particles, or shaped debris.

**Strengths**

- produces a broad lethal or hazardous footprint;
- useful against missiles, predictable transit corridors, radiators, sensors, and lightly protected external systems;
- can force maneuver without requiring a precise direct hit.

**Limitations**

- cloud density falls as it expands;
- particles become indiscriminate navigation hazards;
- limited range before dispersion makes the cloud ineffective;
- may threaten friendly traffic and future operations;
- high-speed impacts can create further debris.

**Gameplay role:** close defense, area denial, anti-missile screens, and attacks on exposed EVA-first systems.

### 13.6 Lasers

**Strengths**

- propagation at light speed;
- no projectile flight correction required after firing;
- excellent point defense and sensor damage capability;
- ammunition limited primarily by power, cooling, optics, and component life.

**Limitations**

- target information is still stale by one-way light time;
- beam divergence expands the spot with range;
- pointing jitter and target maneuver reduce dwell time;
- energy density falls as the illuminated area grows;
- mirrors, ablatives, rotation, plasma, dust, sacrificial layers, and thermal capacity can reduce effect;
- the firing vessel must reject substantial waste heat.

A first-order diffraction relationship may be recorded as:

```text
angular divergence ≈ 1.22 × wavelength / aperture diameter
spot radius ≈ divergence × range
```

**Gameplay role:** strong point defense, sensor suppression, radiator attacks, and close-to-medium direct engagement; increasingly dependent on aperture, wavelength, track quality, and dwell time at long range.

### 13.7 Charged-particle or C-beam weapons

For this system, `C-beam` should be treated as a configurable charged or neutral particle-beam family rather than an undefined magical ray.

**Strengths**

- very high particle velocity;
- strong surface heating, radiation, charge, and material disruption;
- potentially useful against electronics, sensors, radiators, and exposed modules.

**Limitations**

- charged beams diverge and can be deflected by magnetic fields;
- neutral beams require neutralization and can be difficult to focus;
- beam quality, space-charge effects, pointing, and source power limit range;
- interaction with plasma, dust, and fields may reduce coherence;
- substantial accelerator and cooling mass.

**Gameplay role:** high-technology direct-energy weapon with strong subsystem effects but severe power, heat, aperture, and range-quality constraints.

### 13.8 Fractional-c kinetic weapons

**Strengths**

- extreme impact energy;
- potentially catastrophic against fixed, constrained, surprised, or poorly maneuvering targets;
- small projectiles can carry enormous kinetic consequence.

**Limitations**

- launch energy and thermal burden are immense;
- accelerator size, recoil, field control, and projectile integrity are severe engineering problems;
- a shot based on stale position data can still miss if the target changes vector;
- unguided fractional-c rounds cannot correct after launch;
- defensive maneuver does not need to outrun the projectile—it only needs to move the target outside the projectile’s narrow intercept volume before arrival;
- misses remain dangerous to distant traffic and infrastructure.

**Gameplay role:** rare strategic or ambush weapons, highly effective against constrained targets but not automatic long-range hits.

### 13.9 Missiles

Missiles are expected to remain among the most reliable long-range ship-kill systems because they carry their own guidance, sensors, maneuver budget, and terminal decision logic.

**Strengths**

- can receive midcourse updates;
- can refine the target track during flight;
- can maneuver toward the target’s actual rather than predicted position;
- can carry kinetic, explosive, nuclear, shaped, electromagnetic, fragmentation, sensor-kill, decoy, or interception payloads;
- can approach from multiple vectors and coordinate salvos.

**Limitations**

- magazine mass and finite ammunition;
- visible launch and propulsion signatures;
- terminal delta-v limits;
- vulnerable to interceptors, lasers, sand, electronic attack, spoofing, decoys, and evasive burns;
- must reserve maneuver authority for terminal correction;
- long-range missiles may become small autonomous spacecraft with substantial cost.

**Gameplay role:** principal long-range guided weapon family, balanced by cost, magazine depth, interception, target defense, and terminal maneuver competition.

### 13.10 Countermeasure missiles and interceptors

**Functions**

- hard-kill interception;
- decoy deployment;
- sensor spoofing;
- chaff, dust, plasma, or fragment screens;
- illumination and track confirmation;
- remote jamming;
- sacrificial collision;
- escort of offensive missile salvos.

**Gameplay role:** contested missile-defense layer that creates salvo and resource decisions rather than a single passive defense number.

---

## 14. Practical delta-v and combat evasion

A vessel’s combat maneuverability is not its total theoretical mission delta-v alone.

### 14.1 Delta-v categories

- `strategicDeltaV`: total propulsive mission budget.
- `combatReserveDeltaV`: amount reserved for immediate threat response.
- `lateralCombatAcceleration`: acceleration available perpendicular to current trajectory.
- `sustainedCombatDuration`: how long the vessel can continue high-output maneuver.
- `crewAccelerationLimit`: biological or structural limit.
- `thermalManeuverLimit`: heat accumulated by propulsion and power systems.
- `propellantFlowLimit`: maximum practical burn rate.

### 14.2 Evasion consequence

A vessel does not need extraordinary speed to invalidate an unguided long-range shot. It must only create enough lateral displacement during the weapon’s flight time to exceed:

- projectile radius;
- weapon dispersion;
- predicted intercept error;
- lethal fragment or beam footprint.

This is why practical delta-v and acceleration can nullify large portions of conventional long-range fire even when the weapon itself is extremely fast.

### 14.3 Combat maneuver tradeoffs

Evasion consumes:

- propellant;
- reaction mass;
- heat capacity;
- structural margin;
- crew tolerance;
- navigation certainty;
- formation coherence;
- FTL spool or route-solution stability;
- weapon accuracy while maneuvering.

The game model should therefore make evasion effective but not free.

---

## 15. Combat engagement-solution model

Every attack should evaluate the following sequence:

1. **Detect:** establish that an object exists.
2. **Classify:** estimate what the object is.
3. **Track:** reduce position and velocity uncertainty.
4. **Predict:** calculate the target’s possible maneuver envelope.
5. **Authorize:** decide whether the target solution and rules of engagement permit fire.
6. **Launch or fire:** create a projectile, beam, or missile event.
7. **Update:** guided weapons and firing platforms may refine the solution.
8. **Defend:** target may evade, intercept, jam, decoy, cool, rotate, or alter signature.
9. **Resolve intercept:** compare weapon lethal footprint with the target probability volume.
10. **Apply local effect:** determine struck voxels, armor, heat, fragmentation, radiation, disconnection, and secondary damage.
11. **Recalculate vessel graphs:** update power, pressure, cooling, control, propulsion, sensors, weapons, and crew access.

### 15.1 Hit-probability inputs

- range;
- observation age;
- weapon time of flight;
- target acceleration envelope;
- target combat delta-v;
- target size and orientation;
- sensor quality;
- track quality;
- fire-control computation;
- firing-platform vibration and maneuver;
- projectile dispersion or beam divergence;
- missile guidance quality;
- countermeasure effectiveness;
- weapon lethal footprint.

### 15.2 Knife-fight threshold

The system should calculate, not manually assign, the range at which:

```text
weapon lethal footprint ≥ target position-and-maneuver uncertainty envelope
```

Inside that threshold, direct weapons become credible. Outside it, unguided weapons primarily force maneuvers, attack predictable trajectories, or waste ammunition unless the target is constrained.

---

## 16. RPG statistic translation

The physical model should generate both detailed engineering values and a smaller gameplay stat block.

### 16.1 Recommended primary vessel statistics

| Statistic | Derived from |
| --- | --- |
| `Hull Integrity` | Structural voxel graph, material, load-path redundancy, damage state. |
| `Armor` | Local areal density, coverage, armor efficiency, protection type, facing. |
| `Compartmentation` | Pressure zones, isolation doors, utility segmentation, cascading-risk doctrine. |
| `Power` | Continuous generation, peak storage, reserve, damaged power routes. |
| `Thermal Capacity` | Heat stores, coolant, radiators, current thermal load. |
| `Maneuver` | Lateral acceleration, thrust-to-mass ratio, combat delta-v, crew limits. |
| `Strategic Endurance` | Fuel, reaction mass, life support, coolant, spares, carried cycles. |
| `Sensors` | Aperture, baseline, spectrum coverage, processing, occlusion, damage. |
| `Signature` | Waste heat, radiator exposure, drive state, emissions control, architecture. |
| `Targeting` | Sensor track, fire control, stabilization, weapon integration, crew or AI. |
| `Electronic Warfare` | Jamming, deception, cyber, decoys, counter-countermeasures. |
| `Point Defense` | Interceptors, lasers, sand, autocannon, tracking channels, ammunition. |
| `Damage Control` | Access graph, repair philosophy, automation, crew, spares, compartmentation. |
| `Crew Efficiency` | Training, fatigue, biology, automation, command integrity. |
| `FTL Readiness` | Spool state, calibration, power reserve, navigation solution, damage. |

### 16.2 Stat-scale policy

The system should retain full numerical values internally and present normalized gameplay ratings, for example `0–100`, `1–20`, or dice-pool values.

Normalization must be contextual. A `60` in a P0 campaign and a `60` in a P6 campaign may represent different absolute physical capability but equivalent relative competence within the selected play environment.

### 16.3 Facing and locality

Armor and damage should not be one global pool. At minimum, the gameplay layer should preserve:

- forward;
- aft;
- port;
- starboard;
- dorsal;
- ventral;
- internal citadel;
- exposed truss or pods.

Detailed voxel resolution can later determine the exact local module struck.

---

## 17. Vessel actions

### 17.1 Navigation actions

- Plot strategic course.
- Establish local navigation solution.
- Match orbit or vector.
- Burn for intercept.
- Brake or reverse relative motion.
- Dock, undock, land, or depart.
- Enter emissions-control navigation.
- Reserve combat delta-v.
- Begin FTL spool.
- Refresh route solution.
- Abort FTL commitment.

### 17.2 Sensor and targeting actions

- Passive search.
- Active scan.
- Classify contact.
- Build track.
- Share track.
- Challenge decoy.
- Focus aperture.
- Establish firing solution.
- Maintain missile uplink.
- Jam, spoof, or blind.
- Illuminate for allied weapons.

### 17.3 Offensive actions

- Fire direct kinetic weapon.
- Fire laser or particle weapon.
- Launch missile salvo.
- Launch area-denial cloud.
- Coordinate multi-vector attack.
- Fire on a predicted corridor.
- Target subsystem, radiator, sensor, engine, magazine, or habitat.
- Commit strategic mass weapon.

### 17.4 Defensive actions

- Evasive burn.
- Rotate armor facing.
- Deploy radiator or retract radiator.
- Launch interceptor.
- Deploy decoy.
- Deploy sand or fragment screen.
- Jam missile seeker.
- Break sensor track.
- Shut down emissions.
- Sacrifice or detach module.
- Seal compartments.
- Dump heat, fuel, or damaged equipment.

### 17.5 Engineering and damage-control actions

- Reroute power.
- Reroute coolant.
- Isolate atmosphere.
- Patch pressure zone.
- Restore sensor baseline.
- Recalibrate drive.
- Repair weapon or launcher.
- Reload magazine.
- Replace EVA module.
- Conduct internal repair.
- Fight fire or contamination.
- Recover crew.
- Stabilize structural load path.

---

## 18. Phased implementation roadmap

The implementation should proceed in dependency order. Later phases must consume the records produced by earlier phases rather than re-deriving contradictory values.

### Phase 0 — Governing schemas and technology discipline

**Purpose:** Establish stable data contracts before more generators depend on informal object shapes.

**Deliverables**

- Vessel source and derived-record schemas.
- Technology-band and within-band variant definitions.
- Seed hierarchy.
- Species, organization, manufacturer, hull-family, and vessel-instance identifiers.
- Condition-state axes.
- Versioning and migration policy.

**Acceptance criteria**

- Every existing vessel output can be wrapped in the new schema without losing information.
- P0–P6 and `T-1` values are explicit.
- No subsystem silently jumps more than one permitted within-band variant.
- Repeated generation is deterministic outside timestamps.

### Phase 1 — Species-specific manufacturer generator

**Purpose:** Replace four generic templates as final identities with persistent manufacturers derived from species and organizations.

**Deliverables**

- Manufacturer-generation algorithm.
- Manufacturer profile storage and export.
- Topology weights.
- Technology-variant distribution.
- Structural materials, standardization, modularity, repair doctrine, weapon preference, and naming grammar.

**Acceptance criteria**

- Two manufacturers from one species remain culturally related but mechanically distinct.
- Repeated ships from one manufacturer share recognizable design language.
- Manufacturer data meaningfully changes layout, mass, maintenance, and equipment selection.

### Phase 2 — Engineering ledger expansion

**Purpose:** Complete the intact vessel’s physical budgets before spatial assembly.

**Deliverables**

- Conventional propulsion and combat delta-v model.
- Armor and shielding mass ledger.
- Sensor and fire-control mass, power, and aperture ledger.
- Weapon support, magazine, recoil, cooling, and crew burden.
- Countermeasure ledger.
- Local technology variants by subsystem.

**Acceptance criteria**

- All system masses sum to loaded mass.
- Armor is derived from area and areal density.
- Weapons include mounts, support, ammunition or power, cooling, and access.
- Combat delta-v is separated from strategic delta-v.

### Phase 3 — Semantic module graph

**Purpose:** Convert the mass ledger into modules and hardpoints before attempting voxels.

**Deliverables**

- Module inventory.
- Parent-child attachment graph.
- Pressure-zone graph.
- Structural load graph.
- Utility dependency graph.
- Weapon arcs and sensor-line requirements.

**Acceptance criteria**

- Every INTERNAL module has a valid internal parent and access route.
- Every EVA module has a valid vacuum hardpoint and service method.
- Critical systems have valid power, cooling, command, and structural dependencies.
- Invalid module graphs are rejected or repaired visibly.

### Phase 4 — Crude 3D voxel assembler

**Purpose:** Produce coherent inspectable layouts from aggregate engineering records.

**Deliverables**

- Adaptive voxel scale.
- Monocoque, spine, cluster, ring, and hybrid layout algorithms.
- Module packing.
- Utility routing.
- Crew access and EVA service paths.
- Armor shell and exposed-module representation.
- Basic 3D viewer and section inspection.

**Acceptance criteria**

- All module volumes fit.
- Load paths, thrust clearance, radiator visibility, sensor baselines, weapon arcs, and access are valid.
- The same seed reproduces the same layout.
- Species scale and environment visibly affect the arrangement.

### Phase 5 — Condition, history, salvage, and destruction

**Purpose:** Generate vessel instances that are not all pristine completed ships.

**Deliverables**

- Construction completion.
- Commissioning state.
- Wear and maintenance debt.
- Damage-event generation.
- Fire, decompression, contamination, heat, and secondary damage propagation.
- Teardown, mothballing, abandonment, salvage removal, wreck, and total destruction.
- Historical event log explaining the present state.

**Acceptance criteria**

- Missing, removed, damaged, and salvaged modules remain distinguishable.
- A 75% destroyed ship retains coherent surviving wreckage.
- A 100% destroyed ship no longer retains a coherent vessel graph.
- Stats recalculate from surviving modules and connectivity.

### Phase 6 — Sensors, tracks, and combat geometry

**Purpose:** Establish the information model before balancing weapons.

**Deliverables**

- Observation age and light-lag calculations.
- Track uncertainty.
- Target maneuver envelope.
- Sensor confidence and deception.
- Fire-control solutions.
- Combat delta-v and acceleration model.

**Acceptance criteria**

- Target uncertainty grows with observation age and time of flight.
- Evasion changes intercept probability through displacement, not arbitrary defense points.
- Sensor quality, range, signature, and active emissions all matter.
- Shared and conflicting tracks are representable.

### Phase 7 — Weapon-family engineering and engagement envelopes

**Purpose:** Implement weapon behavior after the sensor and maneuver model exists.

**Deliverables**

- Chemical ballistic weapons.
- Rail guns.
- Coil guns.
- Brute mass throwers.
- Sand and particulate weapons.
- Lasers.
- Charged or neutral particle/C-beams.
- Fractional-c kinetic weapons.
- Missiles.
- Countermeasure missiles and interceptors.
- Weapon-specific support, heat, ammunition, guidance, and failure records.

**Acceptance criteria**

- Every weapon reports point-defense, practical, harassment, and theoretical range.
- Unguided hit probability degrades with maneuver uncertainty.
- Beam effect degrades with divergence, dwell, and target response.
- Missiles can update in flight but consume terminal delta-v and face active defenses.
- Weapon installations occupy real voxels and have valid arcs, magazines, power, cooling, and access.

### Phase 8 — Local damage and combat resolution

**Purpose:** Connect weapon effects to the voxel and dependency graphs.

**Deliverables**

- Intercept resolution.
- Armor penetration, ablation, heating, fragmentation, radiation, and impulse effects.
- Local voxel destruction.
- Secondary damage propagation.
- Utility severance.
- Crew and habitat consequences.
- Detachable and sacrificial modules.

**Acceptance criteria**

- Hits affect actual local systems and routes.
- Similar damage can have different consequences on Internals-first and EVA-first ships.
- Armor, compartmentation, isolation, and repair access influence survival differently.
- Destroyed modules disappear from usable statistics.

### Phase 9 — RPG stat block and action economy

**Purpose:** Make the engineering model usable at the table or in a game interface.

**Deliverables**

- Normalized vessel statistics.
- Action list.
- Turn, impulse, or event timing model.
- Crew, automation, command, and damage-control contributions.
- Resource tracking for power, heat, delta-v, ammunition, missiles, coolant, and FTL readiness.

**Acceptance criteria**

- Players can navigate, detect, target, fire, evade, intercept, and repair without reading the full engineering dossier.
- Every normalized stat links back to its physical source.
- Detailed and simplified resolution produce compatible outcomes.

### Phase 10 — Integrated UI, exports, and campaign persistence

**Purpose:** Turn the system into a reusable toolchain.

**Deliverables**

- Manufacturer library.
- Hull-family library.
- Vessel generator UI.
- 3D voxel viewer.
- Damage-state editor.
- Combat stat card.
- JSON export and import.
- Cluster-route, species, government, FTL, and vessel-history handoffs.
- Campaign persistence and version migration.

**Acceptance criteria**

- A cluster route can produce a drive requirement, vessel, manufacturer, layout, combat record, and persistent damaged instance.
- Exported records reload without losing provenance.
- Schema migrations preserve earlier generated vessels.

### Phase 11 — Validation and balance matrix

**Purpose:** Prevent physically coherent generation from becoming mechanically unusable or dominated by one strategy.

**Deliverables**

- Cross-product test matrix across Path levels, manufacturers, biology, roles, topology, weapons, and condition states.
- Monte Carlo engagement simulations.
- Mass and volume closure tests.
- Connectivity and pathfinding validation.
- Weapon-envelope regression tests.
- Damage-state invariants.
- Gameplay balance reports.

**Acceptance criteria**

- All nine FTL families and seven Path levels remain generatable.
- Every manufacturer and topology can produce valid ships.
- No weapon receives universal dominance at every range and target state.
- Missiles remain strong at long range but face credible cost and defense constraints.
- Direct weapons dominate only where track quality and time of flight justify it.
- Condition percentages produce distinct, coherent states.

---

## 19. Immediate implementation order

The next code should be developed in this order:

1. Create the vessel-system schema and technology-variant tables.
2. Generate species-specific manufacturer profiles.
3. Expand the engineering ledger with armor, propulsion, sensors, weapons support, ammunition, and countermeasures.
4. Build the semantic module graph.
5. Build the crude voxel assembler.
6. Add intact-vessel validation.
7. Add condition and destruction transforms.
8. Add sensor tracks and light-lag.
9. Add weapon engagement envelopes.
10. Add local damage and RPG actions.

The voxel assembler should not be built directly against the current aggregate mass table without the semantic module graph. The weapon system should not be balanced before sensor uncertainty and target maneuver envelopes exist. The damage system should not be written before the intact vessel’s structural and utility graphs can explain what a hit disconnected.

---

## 20. Design rules that must remain visible to the user

1. **The vessel’s Path level governs the complete technology context.** Minor within-band variation is permitted; unexplained full-level mismatches are not.
2. **Species and organizations produce manufacturers.** The four current archetypes are templates, not the final limit of cultural design diversity.
3. **Internals-first and EVA-first are tradeoffs, not quality tiers.**
4. **Armor is mass and coverage.** It cannot be a free number detached from surface area and architecture.
5. **A weapon’s practical range is an intercept probability envelope.** Physical reach is not the same as useful combat range.
6. **Light-speed propagation does not eliminate stale targeting information.**
7. **Fractional-c weapons can miss.** The target only needs to leave the intercept volume before arrival.
8. **Missiles are strong because they update and maneuver.** They remain finite, detectable, interceptable, and expensive.
9. **Combat delta-v is a resource.** Evasion is effective but consumes mission capability, heat, propellant, and readiness.
10. **Damage is local and graph-based.** A ship survives or fails according to which structures, utilities, compartments, and modules remain connected.
11. **Condition is multi-axis.** Incomplete, dismantled, damaged, abandoned, salvaged, wrecked, and destroyed are not synonyms.
12. **A 100% destroyed ship is no longer a coherent ship.**
13. **The detailed engineering record and the simplified game record must coexist.** Neither should erase the other.

---

## 21. Charles’s implementation finding

I would not begin the next pass by drawing random cubes and calling the result a ship. I would first create the semantic module graph and technology discipline described above. Once the generator knows what each volume is, what it must touch, what it must avoid, how it is serviced, what it consumes, and what happens when it is disconnected, a crude voxel hull becomes useful engineering evidence rather than decoration.

Likewise, I would not assign a rail gun a range of “ten thousand kilometres” and a missile a range of “one million kilometres” as static facts. I would generate an engagement envelope from information age, weapon flight time, target maneuver authority, guidance, dispersion, beam divergence, lethal footprint, and countermeasures. This produces the intended strategic result without abandoning physical reasoning: missiles remain the most credible long-range pursuit weapons, direct energy and kinetic systems dominate where the target solution is sufficiently current, and extremely powerful unguided weapons can still fail because the target moved.

This guide should therefore govern the next implementation slices and be amended when the code reveals a missing dependency. It should not be bypassed by adding isolated statistics that cannot be traced back into the vessel’s construction, layout, condition, and operating doctrine.
