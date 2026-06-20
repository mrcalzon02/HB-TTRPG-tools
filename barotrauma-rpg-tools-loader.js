(() => {
  'use strict';

  const parts = [
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-00.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-01.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-02.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-03.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-04.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-05.txt',
    'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt'
  ];

  async function load() {
    const responses = await Promise.all(parts.map(async path => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      return response.text();
    }));
    const source = responses.join('');
    new Function(`${source}\n//# sourceURL=barotrauma-rpg-tools.runtime.js`)();
  }

  load().catch(error => {
    const root = document.getElementById('ops-root');
    if (root) root.innerHTML = `<div class="notice"><strong>The Barotrauma RPG tools could not be loaded.</strong><br>${String(error.message || error)}</div>`;
    console.error(error);
  });
})();
