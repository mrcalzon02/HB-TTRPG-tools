(() => {
  'use strict';

  const URLS = Object.freeze({
    identity: 'data/npc-generator/tables/deep-identity-tables.json',
    appearance: 'data/npc-generator/tables/deep-appearance-tables.json',
    personality: 'data/npc-generator/tables/deep-personality-tables.json',
    motivation: 'data/npc-generator/tables/deep-motivation-tables.json',
    background: 'data/npc-generator/tables/deep-background-tables.json'
  });

  function loadJson(url) {
    return fetch(url, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
      return response.json();
    });
  }

  function mergeTables(pack, components) {
    components.forEach(component => {
      Object.entries(component?.tables || {}).forEach(([id, entries]) => {
        pack.tables[id] = entries;
      });
      Object.entries(component?.sectionFields || {}).forEach(([sectionId, fields]) => {
        const existing = new Map((pack.sectionFields[sectionId] || []).map(field => [field.id, field]));
        (fields || []).forEach(field => existing.set(field.id, field));
        pack.sectionFields[sectionId] = [...existing.values()];
      });
    });
    return pack;
  }

  async function enrich(workspace) {
    if (!workspace?.pack || workspace.depthDataLoaded) return workspace;
    workspace.setStatus?.('Loading deep identity and characterization data…');
    const components = await Promise.all(Object.values(URLS).map(loadJson));
    mergeTables(workspace.pack, components);
    workspace.depthDataLoaded = true;
    workspace.generate?.('depth-data-loaded');
    return workspace;
  }

  globalThis.NpcProfileGeneratorDepthData = Object.freeze({ URLS, mergeTables, enrich });
})();
