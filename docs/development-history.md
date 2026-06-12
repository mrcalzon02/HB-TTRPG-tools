# Development History

## 2026-06-12 - Initial static site scaffold

Created the first version of HB TTRPG Tools as a plain HTML, CSS, and JavaScript static site.

Included:

- Main Tools / Utilities / Generators navigation.
- D&D 3.5-compatible browser-editable character sheet.
- Modular 2-panel, 3-panel, and 4-panel layout system.
- Browser print-to-PDF workflow.
- Local autosave and character JSON import/export.
- GitHub Pages workflow scaffold.

## 2026-06-12 - Kaysender extraction framework

Added the first Kaysender extraction framework for moving the setting manuscript toward a Hypertext d20-compatible campaign operations suite.

Included:

- `docs/kaysender-tool-extraction.md`
- `data/kaysender-tools-registry.json`
- Initial registry modules for wiki, island generation, route generation, settlement generation, markets, airships, crafting, supply planning, factions, encounters, ecology, NPCs, jobs, tithe crises, and organization operations.

## 2026-06-12 - Kaysender dashboard and alpha tools

Added a Kaysender dashboard tab and registry-driven cards.

Added alpha tools:

- Floating Island Generator
- Settlement Generator
- Shop and Market Stall Generator
- Airship and Vessel Generator
- Supply, Water, and Survival Planner

Added deployment guide:

- `docs/deployment.md`

## 2026-06-12 - Hypertext wiki and cross-link layer

Added the first Kaysender wiki data and cross-linking system.

Included:

- `data/kaysender/wiki/entries.json`
- `data/kaysender/schemas/wiki-entry.schema.json`
- `data/kaysender/crosslinks/module-entry-map.json`
- `kaysender-wiki.js`
- `docs/cross-linking-plan.md`

The Kaysender Hypertext Wiki is now marked alpha. Registry cards receive wiki chips, wiki entries can link to related entries, and wiki entries can push the dashboard search toward related tools and generators.

## 2026-06-12 - Sequential editor staging and Floating Island editor-alpha

Added the staged editor plan and the first deeper source-derived editor.

Included:

- `docs/kaysender-editor-staging-plan.md`
- `data/kaysender/editors/floating-island-editor.json`
- `data/kaysender/schemas/floating-island-profile.schema.json`
- `kaysender-editors.js`

The Floating Island Generator is now marked `editor-alpha` and launches a detailed Skyland Editor. This editor exposes controls for island role, size, altitude, stability, drift, anchor status, terrain, water, food, resource, ecology, settlement footprint, faction pressure, cultural adaptation, route access, and threat clock.

The editor derives habitability, route value, conflict pressure, collapse risk, and GM complexity scores. It outputs GM notes, settlement hooks, route hooks, market hooks, encounter hooks, draft wiki-entry JSON, and full profile JSON.

## 2026-06-12 - Settlement / Skyport editor-alpha

Added the second staged editor.

Included:

- `data/kaysender/editors/settlement-editor.json`
- `data/kaysender/schemas/settlement-profile.schema.json`
- `kaysender-settlement-editor.js`
- `docs/stage-2-settlement-editor.md`
- `docs/stage-2-smoke-test.md`

The Settlement Generator is now marked `editor-alpha` and launches a detailed Settlement / Skyport Editor. This editor exposes controls for settlement type, population scale, government, defense posture, economy, water status, food status, trade access, faction presence, social stress, civic assets, local secrets, and crisis clocks.

The editor can optionally consume pasted Floating Island profile JSON to inherit island pressure. It derives survivability, trade value, defense readiness, unrest risk, adventure density, and island dependency scores. It outputs GM notes, leadership hooks, market hooks, faction hooks, defense hooks, job hooks, draft wiki-entry JSON, and full settlement profile JSON.

## 2026-06-12 - Character sheet layout polish

Adjusted the character sheet page before continuing staged editor development.

Included:

- `character-sheet-layout.css`
- `character-sheet-title.js`

The sheet is now labeled **AD and D 3.5 - Hypertext D20 compatible character sheet**. The Character Information panel is promoted to a full-width top panel, while Stats/Saves/Combat Basics, Skills, and Weapons/Armor/Equipment sit in a wider three-column row beneath it.

The layout polish adds wider site width, more internal field spacing, broader Character Information columns, more readable Initiative/Speed and combat fields, safer table spacing, and horizontal overflow protection for dense weapon rows. A title migration script updates older local autosave titles from the previous D&D 3.5 wording to the new Hypertext D20-compatible label.

## 2026-06-12 - Airship / Vessel editor-alpha

Added the third staged editor with extra depth.

Included:

- `data/kaysender/editors/airship-editor.json`
- `data/kaysender/schemas/airship-profile.schema.json`
- `kaysender-airship-editor.js`
- `docs/stage-3-airship-editor.md`
- `docs/stage-3-smoke-test.md`

The Airship and Vessel module is now marked `editor-alpha` and launches a detailed Airship / Vessel Editor. This editor exposes controls for vessel class, hull culture, core type, purpose, legal status, crew quality, crew scale, captain style, cargo, armament, defenses, condition, maintenance pressure, route compatibility, route mandate, faction entanglement, hidden problems, current mission, morale, fuel, and port of call.

The editor can optionally consume pasted Floating Island profile JSON and Settlement profile JSON to inherit route, cargo, port, faction, crisis, and hazard pressure. It derives airworthiness, cargo value, combat threat, maintenance risk, legal risk, crew morale, adventure density, and route compatibility scores. It outputs technical notes, crew hooks, cargo hooks, route hooks, faction hooks, maintenance hooks, encounter hooks, draft wiki-entry JSON, and full airship profile JSON.

## 2026-06-12 - Wiki depth pass 1

Expanded the Kaysender wiki from short seed entries into multi-pack, source-derived lore packs.

Included:

- `data/kaysender/wiki/wiki-index.json`
- `data/kaysender/wiki/world-depth.json`
- `data/kaysender/wiki/peoples-depth.json`
- `data/kaysender/wiki/messara-nations-depth.json`
- `data/kaysender/wiki/factions-economy-depth.json`
- `data/kaysender/wiki/airships-depth.json`
- Updated `data/kaysender/schemas/wiki-entry.schema.json`
- Updated `kaysender-wiki.js`
- `docs/wiki-depth-pass-1.md`
- `docs/wiki-depth-smoke-test.md`

The wiki runtime now loads multiple data packs, merges entries by stable ID, searches body and section text, renders titled sections, and converts `[[entry-id|visible text]]` markup into clickable internal wiki hotlinks. The first deep pass adds expanded entries for world systems, peoples, Messaran nations, factions/economy, Dunhallow Roost, and airship core traditions.

## 2026-06-12 - Remove Open d20 Compatibility Scanner

Removed the Open d20 Compatibility Scanner as an active module.

Included:

- Removed `kaysender-compatibility-scanner` from `data/kaysender-tools-registry.json`.
- Removed the scanner launcher, keyword rules, and scanner rendering code from `kaysender-tools.js`.
- Removed scanner references from `README.md` and `docs/deployment.md`.

Compatibility cleanup remains documented as an editorial conversion responsibility, but it is no longer exposed as a dashboard utility.

## 2026-06-12 - Wiki source-lore correction pass 1

Corrected the visible wiki direction after the first wiki-depth pass leaned too heavily toward editor-support text.

Included:

- `data/kaysender/wiki/source-lore-pass-1.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- `docs/wiki-source-lore-correction-pass-1.md`

The new source-lore pack loads last so it overrides earlier editor-support entries by stable ID. The first correction pass replaces visible entries for Kaysender overview, floating islands, sky ecology, sheffels, Grays, peoples, Dwager, Dragon Kin, Lizzzefaire, Hume, Fae, Halflings, Gezistack, Messara, Valeria, and the Black Fleet with reader-facing lore based on the source manuscript.

## 2026-06-12 - Wiki hard-reference policy

Added the hard-reference architecture that makes the wiki the canonical source corpus for the project.

Included:

- `docs/wiki-hard-reference-policy.md`
- `data/kaysender/wiki/source-ingestion-manifest.json`
- Updated `data/kaysender/schemas/wiki-entry.schema.json`
- `scripts/extract-kaysender-outline.py`

The wiki schema now supports `sourceStatus`, `sourceRefs`, and `sourceChunkIds`. The source ingestion manifest records the core PDF as a 392-page source with hundreds of outline entries and establishes that every source section should become a wiki hard-reference entry or indexed source chunk before downstream generators derive from it.

## 2026-06-12 - Wiki source-lore pass 2: Messara nations and survival conditions

Imported the next source-backed wiki pack.

Included:

- `data/kaysender/wiki/source-lore-pass-2-messara.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-2-messara.md`

This pass imports Faelenor/Mirathen, Teralon/Vorrik, Silvalis/Neylithar, Vornak/Grimhold, Rylune/Falyris, Zarovar/Kalthor, Eldrath/Druun, Imbria/Solaar, and The Grim Realities of Survival in Kaysender. Entries are marked `source-faithful`, include `sourceRefs`, carry `sourceChunkIds`, and use wiki hotlinks to connect Messara, sheffels, scarcity, water trade, Black Fleet, and related nation/city nodes.

## 2026-06-12 - Wiki source-lore pass 3: pirates and dragon powers

Imported the Black Fleet and Dragon Lord source block.

Included:

- `data/kaysender/wiki/source-lore-pass-3-pirates-dragons.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-3-pirates-dragons.md`

This pass imports the Black Fleet, Verek Drakemoor, Abyss Harbinger, Shadow Gale, Emberclaw, Spire the Hellrod, Dragon Lords, Trazintharix, Skyhold Citadel, High Lords of Flame, Wildlands, notable Dragon Lords, dragon tithes, Tithe Fleet, and Floating Vaults as source-faithful wiki nodes with source references and hotlinks.

## 2026-06-12 - Wiki source-lore pass 4: merchant fleets and communication networks

Imported the merchant and communication infrastructure source block.

Included:

- `data/kaysender/wiki/source-lore-pass-4-merchant-communications.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-4-merchant-communications.md`

This pass imports Merchant Fleets and Organizations of Kaysender, Surveyor's Guild, Whisper Web, Skyweaver Consortium, Aetherbound Company, Free Flotilla, Ember Guild, Gilded Current, World Whispering Web, Resonant Concord, Locator Glyphs, and Tracker's Beacon. Tracker's Beacon preserves source mechanics as a `mechanics-legacy` section for later Hypertext d20 conversion.

## 2026-06-12 - Wiki source-lore pass 5: criminal trade, slavery, and abolition

Imported the unsavory trade and bondage source block.

Included:

- `data/kaysender/wiki/source-lore-pass-5-criminal-trade-slavery.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-5-criminal-trade-slavery.md`

This pass imports Unsavory Trade in Kaysender, Black Chain Consortium, Rusted Compass Company, Crimson Fog Cartel, Bonehold Syndicate, Broken Coin Guild, Sable Tide, Chainwing Exchange, Tarnished Veil, Indentured Servitude, Slavery in Kaysender, and Abolition and Sanctuary Movements as source-faithful wiki nodes with hotlinks to Dragon Lords, Black Fleet, Free Sky Brotherhood, Aetherbound Company, skybeasts, and related criminal-trade structures.

## 2026-06-12 - Wiki source-lore pass 6: potions, mercenaries, safety gear, emergency equipment, and cargo

Imported the next equipment-and-services source block.

Included:

- `data/kaysender/wiki/source-lore-pass-6-potions-mercenaries-gear.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-6-potions-mercenaries-gear.md`

This pass imports Potion Guilds, Mercenary Companies, Fall-Prevention Gear and Abyss Safety, Emergency Signaling Equipment, and Cargo Loads and Airship Shipping Standards. Potion and fall-prevention legacy mechanics are preserved in `mechanics-legacy` sections for later Hypertext d20 conversion.

## 2026-06-12 - Wiki source-lore pass 7: foodways, tavern fare, agriculture, husbandry, and preservation

Imported the food and agriculture source block.

Included:

- `data/kaysender/wiki/source-lore-pass-7-food-agriculture.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-7-food-agriculture.md`

This pass imports Foodways of Kaysender, Tavern Fare of Kaysender, Dwarven Agriculture and Husbandry, Elven Agriculture and Husbandry, Human Agriculture and Husbandry, Gnomish Agriculture and Husbandry, Orcish Agriculture and Husbandry, Halfling Agriculture and Husbandry, and Dragonborn Agriculture and Husbandry. It preserves culture-specific crops, livestock, preservation methods, and tavern dishes as source-faithful wiki nodes for settlement, supply, market, tavern, and cargo generators.

## 2026-06-12 - Wiki source-lore pass 8: water in the skies

Imported the water scarcity and water logistics source block.

Included:

- `data/kaysender/wiki/source-lore-pass-8-water-in-the-skies.json`
- Updated `data/kaysender/wiki/wiki-index.json`
- Updated `data/kaysender/wiki/source-ingestion-manifest.json`
- `docs/wiki-source-lore-pass-8-water-in-the-skies.md`

This pass imports Water in the Skies of Kaysender, Aerial Geography and Water Scarcity, Rain-Catching Apparatus, Cloud Dew Harvesting, Water Storage and Transportation, Water Trade and Water Politics, Magical Water Storage, and Weather Gear for Sky Travel. Legacy item details are preserved in mechanics-legacy notes where needed for later Hypertext d20 conversion.
