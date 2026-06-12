# Kaysender Tool Extraction Framework

This document turns the uploaded Kaysender setting manuscript into a build plan for HB TTRPG Tools.

The immediate goal is not to copy the manuscript into the web app. The immediate goal is to extract the campaign-running structures that can become wiki pages, generators, trackers, and Hypertext d20-compatible utilities.

## Conversion goal

Kaysender is currently framed as a fifth-edition fantasy expansion and setting. The project should migrate toward an open d20 / Hypertext d20-compatible presentation.

That means the tool suite should separate:

1. Original Kaysender lore, names, factions, places, conflicts, and world assumptions.
2. Open d20-compatible mechanical structures.
3. Legacy fifth-edition phrasing that needs conversion before public reusable release.

## Compatibility cleanup targets

Legacy terms and structures that need attention during conversion:

- Fifth-edition branding references.
- Background feature formatting.
- Advantage / disadvantage language.
- Proficiency bonus scaling.
- Bonus action and reaction phrasing.
- Long rest and short rest recharge language.
- Channel Divinity language.
- Subclass / domain progressions written in fifth-edition style.
- Armor Class formulas copied from fifth-edition assumptions.
- Any text that directly relies on protected rulebook expression instead of open d20 rules language.

Suggested open d20 replacements:

- Advantage / disadvantage -> typed bonuses, typed penalties, reroll clauses, or circumstance modifiers.
- Proficiency bonus -> class level, character level, skill ranks, base attack bonus, caster level, or fixed scaling tables.
- Bonus action -> swift action, immediate action, move action, standard action, full-round action, free action, or attack of opportunity timing as appropriate.
- Long rest / short rest -> daily uses, per-encounter uses, hourly recovery, rest period recovery, or prepared-resource recovery.
- Backgrounds -> origins, regional traits, occupations, or campaign traits.
- Domains -> domains, mystery paths, prestige paths, or class feature trees depending on final rules target.

## Extracted wiki information families

These are the lore areas that should become searchable hypertext pages.

### World overview

- Kaysender as a sky realm of floating continents, islands, airships, dragons, pirates, and unstable geography.
- The eternal abyss and unknown lower world.
- Floating ecology: sheffels, Grays, skywhales, sky predators, magical plants, buoyant oils, feathers, levitation fluids, and arcane atmospheric life.
- Scarcity principles: food, water, stable land, safe routes, and reliable shelter.

### Peoples and cultures

- Dwager.
- Dragon Kin.
- Lizzzefaire.
- Hume.
- Fae.
- Halflings.
- Gezistack.

Each people needs a wiki page with culture, historic conflicts, settlement patterns, political assumptions, crafting strengths, favored ships, and conversion-safe player-facing traits.

### Continents, nations, and capitals

Messara is the first major campaign continent and should become a top-level wiki node.

Primary nations and capitals:

- Valeria - Valthorn.
- Faelenor - Mirathen.
- Teralon - Vorrik.
- Silvalis - Neylithar.
- Vornak - Grimhold.
- Rylune - Falyris.
- Zarovar - Kalthor.
- Eldrath - Druun.
- Imbria - Solaar.

Each nation page should track economy, culture, religion, government, military, status, export goods, trade pressures, social tensions, and generator tags.

### Factions and organizations

Faction pages should be extracted for:

- Dragon Lords and tribute networks.
- The Black Fleet.
- Surveyor's Guild.
- Whisper Web.
- Skyweaver Consortium.
- Aetherbound Company.
- Ember Guild.
- Mercenary companies.
- Merchant guilds.
- Black Chain Consortium.
- Rusted Compass Company.
- Crimson Fog Cartel.
- Bonehold Syndicate.
- Broken Coin Guild.
- Sable Tide.
- Chainwing Exchange.
- Tarnished Veil.
- Free Sky Brotherhood.

Each faction should eventually support a generator profile: purpose, public face, hidden operations, ship types, leader type, territory, cargo, reputation, enemies, allies, hooks, and encounter behavior.

## Extracted tool and utility list

### 1. Kaysender Hypertext Wiki Utility

A utility tab containing an internal wiki browser for setting pages.

Needed features:

- Search box.
- Category filters: World, Peoples, Nations, Cities, Factions, Ships, Creatures, Equipment, Rules, GM Tools.
- Crosslinks between places, factions, tools, and generators.
- SRD-safe rules references separated from original setting prose.
- Legacy conversion notes hidden from player-facing view.

### 2. License and Rules Compatibility Scanner

A tool for scanning imported text for conversion risk.

Inputs:

- Pasted source text.
- Imported markdown entry.
- Optional JSON lore entry.

Outputs:

- Legacy fifth-edition terms found.
- Suggested open d20 replacement language.
- Whether the entry is lore-only, rules-linked, or mechanics-heavy.
- Public-readiness status.

### 3. Floating Island Generator

Generates islands, drifting settlements, ruins, and wilderness locations.

Core fields:

- Island size.
- Stability.
- Altitude band.
- Drift behavior.
- Terrain.
- Water availability.
- Food availability.
- Skybeast pressure.
- Pirate risk.
- Dragon Lord influence.
- Resource nodes.
- Settlement potential.
- Current crisis.

### 4. World Map and Route Generator

Produces abstract map data for floating regions rather than a fixed continental map.

Core fields:

- Region name.
- Island clusters.
- Trade winds.
- Safe routes.
- Dangerous routes.
- Storm belts.
- Abyss exposure.
- Dragon-controlled airspace.
- Pirate hunting grounds.
- Trade hubs.
- Water sources.
- Current route disruption.

### 5. Settlement Generator

Creates villages, towns, fortified outposts, farming islands, skyports, slums, and company holdings.

Core fields:

- Settlement type.
- Population.
- Primary ancestry mix.
- Government.
- Defense quality.
- Food status.
- Water status.
- Trade dependency.
- Major employer.
- Dominant faction.
- Local market type.
- Nearby hazard.
- Current political stress.
- Adventure hook.

### 6. City Center and District Generator

Creates district-level content for major capitals and large settlements.

District types:

- Royal district.
- Dockyard.
- Skyship yard.
- Market district.
- Grand bazaar.
- Temple district.
- Foundry district.
- Academy district.
- Slum.
- Guild quarter.
- Military quarter.
- Noble terrace.
- Water cistern district.
- Industrial smoke quarter.
- Caravanserai / airship hostel.

Outputs:

- District name.
- Dominant architecture.
- Wealth level.
- Security level.
- Goods available.
- Common NPCs.
- Local rumor.
- Faction pressure.
- Hidden danger.

### 7. Population Generator

Generates a living population profile for islands, ships, towns, and districts.

Core fields:

- Total population.
- Ancestry proportions.
- Age spread.
- Occupation spread.
- Class pressure.
- Poverty level.
- Specialist availability.
- Militia count.
- Clergy count.
- Skilled craft workers.
- Airship personnel.
- Refugee or migrant pressure.
- Disease or hunger risk.

### 8. Shop and Market Stall Generator

Creates shops, stalls, illegal dealers, guild vendors, and traveling merchants.

Core fields:

- Merchant type.
- Legitimacy.
- Goods category.
- Price pressure.
- Scarcity modifier.
- Regional flavor.
- Quality level.
- Counterfeit risk.
- Black market access.
- Owner personality.
- Guarded secret.
- Current supply problem.

Market categories:

- Water sellers.
- Food and skygrain.
- Sheffel wool and textiles.
- Airship parts.
- Alchemical supplies.
- Potions.
- Arcane devices.
- Weapons and armor.
- Salvage.
- Relics.
- Maps and route intelligence.
- Livestock and skybeasts.

### 9. Airship and Vessel Generator

Creates ships and encountered vessels.

Core fields:

- Hull type.
- Size class.
- Construction culture.
- Primary core.
- Propulsion method.
- Crew size.
- Cargo role.
- Armament.
- Armor / hull integrity.
- Maneuverability.
- Condition.
- Legal status.
- Captain profile.
- Current cargo.
- Hidden cargo.
- Current damage.
- Current mission.

Supported vessel families:

- Dwarven heavy craft.
- Elven living / attuned craft.
- Dragon Kin elemental warcraft.
- Gnomish mechanical-arcane hybrid craft.
- Human mixed steam-and-magic craft.
- Pirate vessels.
- Prison ships.
- Survey ships.
- Merchant ships.
- Smuggling ships.
- Creature-containment vessels.

### 10. Airship Core and Construction Framework

A crafting framework for airship cores and major ship systems.

Core fields:

- Core type.
- Required materials.
- Required skills.
- Workshop requirements.
- Manufacture time.
- Base cost.
- Operating risk.
- Maintenance schedule.
- Failure table.
- Compatible hulls.
- Cultural restrictions.
- Upgrade slots.

Core families:

- Dwarven core.
- Elven core.
- Dragonborn / Dragon Kin core.
- Gnomish core.
- Human hybrid core.

### 11. Crafting, Gadget, and Equipment Creator

A generic creator for Kaysender custom gear.

Supported recipes:

- Potions.
- Alchemical oils.
- Weather gear.
- Air sailor gear.
- Boarding gear.
- Communication devices.
- Tracking devices.
- Ship gadgets.
- Weapon enhancements.
- Armor enhancements.
- Survival devices.
- Workshop devices.

Recipe fields:

- Item name.
- Item category.
- Required material tags.
- Required facility.
- Required skill.
- Craft difficulty.
- Cost.
- Time.
- Risk.
- Mechanical output.
- Open d20 conversion note.
- Lore flavor.

### 12. Supply, Water, and Survival Planner

Tracks Kaysender's central scarcity loop.

Core fields:

- Party size.
- Crew size.
- Animals / skybeasts.
- Water stores.
- Food stores.
- Days of travel.
- Climate / altitude.
- Spoilage risk.
- Trade route access.
- Rain capture chance.
- Purification access.
- Emergency shortage table.

### 13. Faction and Guild Generator

Creates organizations that feel native to Kaysender.

Core fields:

- Public purpose.
- Hidden purpose.
- Territory.
- Fleet details.
- Leader type.
- Rank structure.
- Resources.
- Rivalries.
- Lawfulness.
- Reputation.
- Adventure hook.
- Encounter behavior.

### 14. Black Market and Piracy Generator

Creates criminal operations and skyborne threats.

Core fields:

- Criminal type.
- Cover identity.
- Ship profile.
- Contraband.
- Victim profile.
- Hideout location.
- Bribe network.
- Enforcement method.
- Rival gang.
- Moral complication.
- Evidence trail.

### 15. Encounter Generator

Creates campaign events by location type.

Encounter zones:

- Safe trade lane.
- Contested trade lane.
- Outer island.
- Major city.
- Skyport.
- Dragon dominion.
- Abyss edge.
- Storm belt.
- Ruined island.
- Pirate-controlled zone.

Outputs:

- Encounter type.
- Participants.
- Stakes.
- Environmental condition.
- Tactical complication.
- Negotiation option.
- Reward.
- Escalation if ignored.

### 16. Sky Ecology and Bestiary Generator

Creates creatures, herds, migrations, diseases, and ecological hazards.

Core fields:

- Creature type.
- Altitude band.
- Herd / solitary behavior.
- Diet.
- Valuable materials.
- Predators.
- Symbiotic organisms.
- Disease risk.
- Conservation status.
- Hunting pressure.
- Encounter attitude.

Creature families:

- Sheffels.
- Grays.
- Skywhales.
- Floating insects.
- Buoyant birds.
- Abyssal predators.
- Draconic sky hunters.
- Fungal infections and airborne disease vectors.

### 17. NPC and Crew Generator

Creates player-facing and GM-facing characters.

Core fields:

- Name.
- Ancestry.
- Home region.
- Occupation.
- Faction tie.
- Ship role.
- Secret.
- Need.
- Fear.
- Loyalty.
- Open d20 stat stub.
- Current problem.

Crew roles:

- Captain.
- Navigator.
- Engineer.
- Enchanter.
- Deckhand.
- Gunner.
- Cook.
- Medic.
- Signal mage.
- Cartographer.
- Beast handler.
- Security officer.

### 18. Job Board and Campaign Hook Generator

Creates actionable quests.

Job types:

- Escort.
- Salvage.
- Rescue.
- Survey.
- Smuggling.
- Pirate hunt.
- Monster hunt.
- Water delivery.
- Tithe resistance.
- Trade negotiation.
- Faction espionage.
- Ruin exploration.
- Disease outbreak.
- Ship repair.

### 19. Draconic Tithe and Settlement Crisis Generator

Focused on Dragon Lord pressure over isolated communities.

Core fields:

- Dragon Lord.
- Tithe demand.
- Enforcer fleet.
- Local leadership.
- Remaining food.
- Remaining coin.
- Hostage risk.
- Resistance faction.
- Collaborator faction.
- Time until collapse.
- Player intervention options.

### 20. Organization Operations Tracker

A management minigame for guilds, settlements, airship companies, and factions.

Core fields:

- Finance.
- Morale.
- Logistics.
- Security.
- Compliance / law pressure.
- Innovation.
- Crisis handling.
- Reputation.
- Staff capability.
- Supply chain.
- Current event.

## First implementation priority

Recommended build order:

1. Kaysender wiki framework and static data model.
2. License / conversion scanner.
3. Floating island generator.
4. Settlement generator.
5. Shop / market stall generator.
6. Airship / vessel generator.
7. Crafting / gadget / potion creator.
8. Supply and water planner.
9. Faction / guild generator.
10. Encounter generator.

## Data model direction

Use static JSON files first. Avoid a database until the toolset grows.

Suggested folders:

- `data/kaysender/wiki/`
- `data/kaysender/generators/`
- `data/kaysender/tables/`
- `data/kaysender/rules/`
- `data/kaysender/conversion/`

Suggested schema families:

- `wikiEntry`.
- `generatorDefinition`.
- `rollTable`.
- `rulesConversionNote`.
- `factionProfile`.
- `settlementProfile`.
- `vesselProfile`.
- `itemRecipe`.
- `encounterProfile`.

## Immediate next task

Create a Kaysender utility page inside the existing site that reads a module registry JSON file and displays:

- Kaysender Wiki.
- Compatibility Scanner.
- Floating Island Generator.
- Settlement Generator.
- Market Stall Generator.
- Airship Generator.
- Crafting Creator.
- Supply Planner.

Each module should start as a placeholder card with the schema visible, then become interactive one at a time.
