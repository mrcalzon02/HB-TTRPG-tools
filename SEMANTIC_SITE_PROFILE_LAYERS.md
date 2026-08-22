# Layered Semantic Site Profiles

The layered site-profile compiler inside `module-map-generator.js` is the ordered semantic-composition authority used by `generator.module_map` between the base location-purpose program and the shared spatial engine. It is intentionally kept inside the canonical module generator so browser and Foundry API callers continue loading one authoritative module-map implementation rather than a second runtime branch.

It is **not** another topology or geometry engine. `semantic-spatial-engine.js` remains the only authority that builds connectivity and places geometry. The site-profile layer composes the semantic instructions that are handed to that engine.

## Why this layer is deliberately mutative

Most Foundry systems should avoid stacks of post-hoc mutators. Procedural places are the deliberate exception because one real location can carry several causal histories at once. A fortress may be dwarven-built, later captured by bandits, abandoned after a siege, partially flooded, colonized by fungus and undead, and currently entered during winter. Those facts should not be flattened into one theme or allowed to overwrite one another blindly.

The site-profile resolver therefore operates as an ordered composition stack. Every layer receives the accumulated state, can alter the same semantic program, and records what it changed. Later layers remain aware of earlier layers and preserve their provenance.

Current order:

1. relationship reconciliation
2. scale
3. original builder / cultural influence
4. current controller
5. occupancy state
6. environment and verticality
7. cross-layer historical adaptation
8. ecology and creature pressure
9. hazard ecology
10. security and defense doctrine
11. resources, wealth, magic and technology
12. age, maintenance, condition and contamination
13. narrative / social interpretation
14. spatial-capacity normalization

The base archetype still runs before all of these layers. The final output therefore remains:

`location purpose → layered site profile → connectivity requirements → shared spatial topology → geometry → layered content population → presentation`

## Breadth

The catalog currently exposes 28 axes containing 614 selectable values, plus scalar controls for creature density, hazard intensity, treasure density and social density. Important axes include scale, origin culture, controller, occupancy state, biome, climate, season, weather, ecology, creature families, hazard families, materials, wealth, security, age, condition, magic/technology, lighting, water state, verticality, secret density, traffic, social mode, resources, maintenance, contamination, defense doctrine and narrative tone.

The system intentionally separates **original builder culture** from **current controller**. A dwarven-built mansion occupied by bandits is not treated as a “bandit mansion” that erases the dwarven construction history. The dwarven layer can add reinforced stone service routes, forge/repair infrastructure, runic or industrial character and material preferences; the later bandit layer can add lookouts, loot caches, barricades and escape routes while retaining the earlier architecture.

Likewise, “abandoned” is an occupancy/history layer, not a replacement archetype. An abandoned barracks remains semantically a barracks, but maintenance, traffic, ecology, hazards, structural condition and current encounter population change around that inherited purpose.

## Relationship reconciliation

Random axes are not accepted blindly. A deterministic reconciliation pass conditions random choices on already-resolved information. Examples:

- tundra and glacier biomes bias toward subarctic/arctic climates and snow/cold weather;
- tropical, jungle and rainforest sites bias toward tropical/monsoon conditions and related ecology;
- long-abandoned sites bias toward empty/rare traffic, failed maintenance and degraded condition;
- bandit, outlaw, pirate and syndicate controllers bias toward improvised/hidden/paranoid security and criminal/communal social use;
- military controllers bias toward hardened/military/layered security;
- dwarven, elven, gnomish, dragonkin and other builder cultures bias compatible material and magic/technology traditions.

Explicit caller choices remain authoritative. The reconciliation pass does not silently “correct” an intentionally strange user-authored combination.

## Deterministic preferences

Each axis accepts preference filters through `sitePreferences` / `preferences`:

```js
sitePreferences: {
  creatureFamilies: {
    preferred: ['fungus', 'undead'],
    exclude: ['dragon', 'ooze']
  },
  hazardFamilies: {
    preferred: ['spores', 'structural', 'cold'],
    exclude: ['lava']
  },
  biome: {
    include: ['cavern', 'underdark', 'fungal-wilds']
  }
}
```

`include` restricts the random pool, `exclude` removes values, and `preferred` weights deterministic selection toward named values without making them mandatory. Callers can also supply explicit values such as `culturalInfluence`, `currentController`, `occupancyState`, `siteScale`, `biome`, `ecology`, `creatureFamilies` and `hazardFamilies`.

## Historical adaptation interactions

After culture, controller, occupation, and environment have been resolved, the compiler now performs a dedicated historical-adaptation pass. This is where later layers are allowed to reinterpret earlier spaces directly rather than merely placing adjacent themed rooms.

Each affected room preserves `metadata.originalRole` and `metadata.originalLabel`. The first materially active repurposing becomes `metadata.currentUse`; later overlapping influences are appended to `metadata.currentUseOverlays`, while `metadata.adaptations` explains the physical or functional change and `metadata.interactionIds` identifies the causal rules. This prevents a late hazard or technology layer from erasing the fact that, for example, a dwarven gatehouse is currently a goblin barricade.

Structured site-level interaction records are also retained in `siteProfile.interactions`. Each record contains the interaction id, the causal drivers, affected semantic targets, and effects. Examples currently implemented include:

- dwarven infrastructure repurposed by goblin, kobold, bandit, outlaw, or orc occupiers;
- small occupiers creating crawl bypasses and mezzanines inside monumental construction;
- elven living and ceremonial circulation militarized by occupying forces;
- gnomish machinery stripped and reused by irregular scavenging controllers;
- mansions converted into gang commons, planning rooms, bunk/hostage spaces, and loot sorting;
- fortresses converted into civilian/refugee settlements;
- schools and Arcane Universities converted to barracks, intelligence archives, and technical occupation facilities;
- temples overwritten by cultic or necromantic use;
- hospitals used as survivor screening/shelter infrastructure;
- prisons reversed into rebel or outlaw strongholds;
- warehouses subdivided into camps and contraband lanes;
- mines converted into checkpoints, ambush galleries, dens, and trapped stores;
- fungal/overgrown ecological succession opening routes through abandoned sites;
- flooding removing lower circulation and creating high-water bypasses;
- collapse blocking inherited routes and producing rubble breaches;
- haunt/undead layers forming around historically meaningful rooms;
- sophisticated inherited technology becoming partially understood under irregular occupation;
- same-culture controllers preserving intended use instead of fabricating mismatch damage.

Controller options now include cultural occupation identities such as dwarven holds, elven enclaves, gnomish workcrews, halfling caravans, orc warbands, goblin clans, kobold warrens, dragonkin hosts, fey courts, giant clans, mixed settlements, adventuring companies, druid circles, escaped prisoners, and plague survivors. Builder culture and current controller remain separate axes.

## Spatial capacity normalization

Layer composition can legitimately add rooms and increase room counts. A deterministic capacity-normalization step runs after semantic composition and enlarges the default canvas only when the accumulated room program would otherwise exceed safe placement capacity. It does **not** delete rooms, alter topology semantics, or override an explicit caller width/height. This exists to keep high-variety random generation mechanically valid as layers accumulate.

## Layer provenance

Every resolved site profile contains a `layers` array. Each layer records:

- execution order
- layer id
- resolved input
- concrete semantic changes

The content population layer receives the complete site profile and includes the contributing layer ids in its own provenance. Rooms can therefore distinguish original architectural identity, later repurposing, environmental succession and current encounter ecology rather than emitting generic room text.

## Custom semantic programs

Explicit `roles` and `adjacency` remain supported. By default an explicit custom semantic program is preserved exactly and the site profile is used as context for content/environment population. Set `applySiteLayersToCustomRoles: true` when the caller explicitly wants the full semantic mutation stack to add and alter spaces around custom roles.

## Validation

Run the normal spatial acceptance suite, the focused layered-profile suite, and the historical-interaction suite:

```sh
node tests/spatial-engine.test.js
node tests/site-profile-layers.test.js
node tests/site-history-interactions.test.js
```

The focused suites enforce catalog breadth, deterministic resolution, high seeded diversity, culture/controller layering, explicit-custom preservation, ecology/hazard preference filtering, historical current-use preservation, non-destructive interaction overlays, alternate traversal creation, content provenance, and culture/ecology-aware room population. A broad archetype/seed sweep should also be used when interaction rules change to ensure accumulated room programs still fit the generated spatial canvas.
