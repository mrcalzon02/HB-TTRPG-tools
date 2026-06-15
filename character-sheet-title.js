(() => {
  const STORAGE_KEY = 'hb-ttrpg-tools-character-sheet-v1';
  const OLD_TITLES = new Set([
    'D&D 3.5-Compatible Character Sheet',
    'D&D 3.5-compatible character sheet PDF creator'
  ]);
  const NEW_TITLE = 'AD and D 3.5 - Hypertext D20 compatible character sheet';

  function shouldReplace(value) {
    return !value || OLD_TITLES.has(value.trim());
  }

  function migrateStoredTitle() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (shouldReplace(data.title)) {
        data.title = NEW_TITLE;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (_) {
      // Leave unreadable local storage alone.
    }
  }

  function syncPrintTitle() {
    const input = document.getElementById('sheet-title');
    const printTitle = document.getElementById('print-title');
    if (!input || !printTitle) return;
    printTitle.textContent = input.value || NEW_TITLE;
  }

  function applyTitle() {
    migrateStoredTitle();
    const input = document.getElementById('sheet-title');
    const printTitle = document.getElementById('print-title');
    if (input && shouldReplace(input.value)) input.value = NEW_TITLE;
    if (printTitle && shouldReplace(printTitle.textContent)) printTitle.textContent = input?.value || NEW_TITLE;
    input?.addEventListener('input', syncPrintTitle);
  }

  function loadScriptOnce(src, attributeName, datasetKey) {
    if (document.querySelector(`script[${attributeName}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset[datasetKey] = 'true';
    document.body.appendChild(script);
  }

  function loadSupplementalGenerators() {
    loadScriptOnce('spell-generators.js', 'data-spell-generators', 'spellGenerators');
    loadScriptOnce('kaysender-npc-generator.js', 'data-npc-generator', 'npcGenerator');
    loadScriptOnce('kaysender-crafting-generator.js', 'data-crafting-generator', 'craftingGenerator');
  }

  applyTitle();
  loadSupplementalGenerators();
  document.addEventListener('DOMContentLoaded', () => {
    applyTitle();
    loadSupplementalGenerators();
  });
})();
