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
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt'
  ];
  const catalogIndexUrl = 'data/barotrauma/tools/catalog/catalog-index.json';
  const submarineRosterUrl = 'data/barotrauma/tools/submarines/submarine-roster.json';
  const customContentSchemaUrl = 'data/barotrauma/tools/custom/custom-content-schema.json';

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

  async function load() {
    const [catalog, submarineRoster, customContentSchema, sourceParts] = await Promise.all([
      loadCatalog(),
      fetchJson(submarineRosterUrl),
      fetchJson(customContentSchemaUrl),
      Promise.all(runtimeParts.map(fetchText))
    ]);
    window.BAROTRAUMA_WIKI_CATALOG = catalog;
    window.BAROTRAUMA_SUBMARINE_ROSTER = submarineRoster;
    window.BAROTRAUMA_CUSTOM_CONTENT_SCHEMA = customContentSchema;
    const source = sourceParts.join('');
    new Function(`${source}\n//# sourceURL=barotrauma-rpg-tools.runtime.js`)();
  }

  load().catch(error => {
    const root = document.getElementById('ops-root');
    if (root) root.innerHTML = `<div class="notice"><strong>The Barotrauma RPG tools could not be loaded.</strong><br>${String(error.message || error)}</div>`;
    console.error(error);
  });
})();
