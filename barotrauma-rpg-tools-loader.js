(() => {
  'use strict';

  const runtimeParts = [
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-00.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-01.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-03.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-04.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-05.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-catalog.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-submarines.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-custom-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-custom-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-custom-patch.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-character-inventory.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-crew-management.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-crew-patch.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-item-compatibility.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-cargo-commerce.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-commerce-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-suitability-patch.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-state.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-scale-patch.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-commerce-patch.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-faction-seeding.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-faction-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-location-levels.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-location-level-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-location-level-polish.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-research-validation.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-research-patch.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-crossing-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-crossing-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-crossing-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-creature-encounters-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-creature-encounters-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-creature-encounters-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-core-00.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-core-01.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-core-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-lethality-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-lethality-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-general-encounters-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-integration-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-map-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-integration-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-integration-fix.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-group-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-standalone-module-captures.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-active-submarine-dashboard-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-active-submarine-dashboard-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-active-submarine-transit-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-active-submarine-transit-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-active-submarine-transit-polish.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-active-submarine-transit-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-dashboard-boundaries-core.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-dashboard-boundaries-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-dashboard-boundaries-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-dashboard-commissioning.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-dashboard-commissioning-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-core-00.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-core-01.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-core-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-ui-polish.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-stability-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-event-resolution-stability-03.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-core-00.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-core-01.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-core-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-commerce-00.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-commerce-01.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-scheduler.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-stability-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-ui.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-ui-stability.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-commissioning.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-economy-stability-03.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt'
  ];
  const catalogIndexUrl = 'data/barotrauma/tools/catalog/catalog-index.json';
  const submarineRosterUrl = 'data/barotrauma/tools/submarines/submarine-roster.json';
  const customContentSchemaUrl = 'data/barotrauma/tools/custom/custom-content-schema.json';
  const itemFunctionalityUrl = 'data/barotrauma/tools/items/item-functionality.json';
  const worldStateSchemaUrl = 'data/barotrauma/tools/world/world-state-schema.json';
  const factionRegistryUrl = 'data/barotrauma/tools/factions/faction-registry.json';
  const locationLevelRegistryUrl = 'data/barotrauma/tools/locations/location-level-registry.json';
  const creatureRegistryUrl = 'data/barotrauma/tools/creatures/creature-registry.json';
  const encounterRegistryIndexUrl = 'data/barotrauma/tools/encounters/encounter-index.json';

  async function fetchText(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return response.text();
  }

  async function fetchJson(path) {
    return JSON.parse(await fetchText(path));
  }

  async function loadCatalog() {
    const index = await fetchJson(catalogIndexUrl);
    const parts = await Promise.all((index.parts || []).map(fetchJson));
    const items = parts.flatMap(part => part.items || []);
    const submarineWeapons = parts.flatMap(part => part.submarineWeapons || []);
    const duplicateItemIds = items.filter((item, position) => items.findIndex(other => other.id === item.id) !== position).map(item => item.id);
    const duplicateWeaponIds = submarineWeapons.filter((item, position) => submarineWeapons.findIndex(other => other.id === item.id) !== position).map(item => item.id);
    if (duplicateItemIds.length || duplicateWeaponIds.length) throw new Error(`Duplicate catalogue identifiers: ${[...duplicateItemIds, ...duplicateWeaponIds].join(', ')}`);
    return { ...index, items, submarineWeapons };
  }

  async function loadEncounterRegistry() {
    const index = await fetchJson(encounterRegistryIndexUrl);
    const [parts, lethalityParts] = await Promise.all([
      Promise.all((index.parts || []).map(fetchJson)),
      Promise.all((index.lethalityParts || []).map(fetchJson))
    ]);
    const templates = parts.flatMap(part => part.templates || []);
    const profiles = lethalityParts.flatMap(part => part.profiles || []);
    const duplicateTemplateIds = templates.filter((template, position) => templates.findIndex(other => other.id === template.id) !== position).map(template => template.id);
    const duplicateProfileIds = profiles.filter((profile, position) => profiles.findIndex(other => other.id === profile.id) !== position).map(profile => profile.id);
    if (duplicateTemplateIds.length) throw new Error(`Duplicate encounter template identifiers: ${[...new Set(duplicateTemplateIds)].join(', ')}`);
    if (duplicateProfileIds.length) throw new Error(`Duplicate encounter lethality identifiers: ${[...new Set(duplicateProfileIds)].join(', ')}`);
    const profileIds = new Set(profiles.map(profile => profile.id));
    const missingProfiles = templates.filter(template => !profileIds.has(template.id)).map(template => template.id);
    const orphanProfiles = profiles.filter(profile => !templates.some(template => template.id === profile.id)).map(profile => profile.id);
    if (missingProfiles.length || orphanProfiles.length) throw new Error(`Encounter lethality registry mismatch. Missing: ${missingProfiles.join(', ') || 'none'}. Orphaned: ${orphanProfiles.join(', ') || 'none'}.`);
    return { ...index, templates, lethality: { schemaVersion: index.schemaVersion, profiles } };
  }

  async function load() {
    const [catalog, submarineRoster, customContentSchema, itemFunctionality, worldStateSchema, factionRegistry, locationLevelRegistry, creatureRegistry, encounterRegistry, sourceParts] = await Promise.all([
      loadCatalog(),
      fetchJson(submarineRosterUrl),
      fetchJson(customContentSchemaUrl),
      fetchJson(itemFunctionalityUrl),
      fetchJson(worldStateSchemaUrl),
      fetchJson(factionRegistryUrl),
      fetchJson(locationLevelRegistryUrl),
      fetchJson(creatureRegistryUrl),
      loadEncounterRegistry(),
      Promise.all(runtimeParts.map(fetchText))
    ]);
    window.BAROTRAUMA_WIKI_CATALOG = catalog;
    window.BAROTRAUMA_SUBMARINE_ROSTER = submarineRoster;
    window.BAROTRAUMA_CUSTOM_CONTENT_SCHEMA = customContentSchema;
    window.BAROTRAUMA_ITEM_FUNCTIONALITY = itemFunctionality;
    window.BAROTRAUMA_WORLD_STATE_SCHEMA = worldStateSchema;
    window.BAROTRAUMA_FACTION_REGISTRY = factionRegistry;
    window.BAROTRAUMA_LOCATION_LEVEL_REGISTRY = locationLevelRegistry;
    window.BAROTRAUMA_CREATURE_REGISTRY = creatureRegistry;
    window.BAROTRAUMA_ENCOUNTER_REGISTRY = encounterRegistry;
    window.BAROTRAUMA_ENCOUNTER_LETHALITY = encounterRegistry.lethality;
    const source = sourceParts.join('');
    new Function(`${source}\n//# sourceURL=barotrauma-rpg-tools.runtime.js`)();
  }

  load().catch(error => {
    const root = document.getElementById('ops-root');
    if (root) root.innerHTML = `<div class="notice"><strong>The Barotrauma RPG tools could not be loaded.</strong><br>${String(error.message || error)}</div>`;
    console.error(error);
  });
})();
