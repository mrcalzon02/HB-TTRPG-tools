(() => {
  const STORAGE_KEY = 'hb-ttrpg-tools-character-sheet-v1';
  const OLD_TITLES = new Set([
    'D&D 3.5-Compatible Character Sheet',
    'D&D 3.5-compatible character sheet PDF creator'
  ]);
  const NEW_TITLE = 'AD and D 3.5 - Hypertext D20 compatible character sheet';
  const PRIMER_CARD_SELECTOR = '[data-module-id="barotrauma-crewmans-primer"]';
  const PRIMER_DESTINATIONS = new Map([
    ["Open Crewman's Primer Wiki", 'barotrauma-primer.html?mode=wiki'],
    ['Open Source Document Viewer', 'barotrauma-primer.html?mode=source']
  ]);

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
        localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
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
    input?.addEventListener('input',syncPrintTitle);
  }

  function loadScriptOnce(src,attributeName,datasetKey) {
    if (document.querySelector(`script[${attributeName}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset[datasetKey] = 'true';
    document.body.appendChild(script);
  }

  function loadSupplementalGenerators() {
    loadScriptOnce('spell-creator-entry.js','data-spell-creator-entry','spellCreatorEntry');
    loadScriptOnce('eccentric-spell-entry.js','data-eccentric-spell-entry','eccentricSpellEntry');
    loadScriptOnce('arcane-academic-entry.js','data-arcane-academic-entry','arcaneAcademicEntry');
    loadScriptOnce('malefic-academic-entry.js','data-malefic-academic-entry','maleficAcademicEntry');
    loadScriptOnce('magical-library-entry.js','data-magical-library-entry','magicalLibraryEntry');
    loadScriptOnce('elemental-realms-entry.js','data-elemental-realms-entry','elementalRealmsEntry');
    loadScriptOnce('solanum-umbra-entry.js','data-solanum-umbra-entry','solanumUmbraEntry');
    loadScriptOnce('world-of-darkness-entry.js','data-world-of-darkness-entry','worldOfDarknessEntry');
    loadScriptOnce('shadowrun-entry.js','data-shadowrun-entry','shadowrunEntry');
    loadScriptOnce('npc-profile-generator-entry.js','data-npc-profile-generator-entry','npcProfileGeneratorEntry');
    loadScriptOnce('kaysender-npc-generator.js','data-npc-generator','npcGenerator');
    loadScriptOnce('kaysender-crafting-generator.js','data-crafting-generator','craftingGenerator');
    loadScriptOnce('kaysender-settlement-inheritance-guard.js','data-settlement-inheritance-guard','settlementInheritanceGuard');
  }

  function primerDestinationFor(element) {
    const control = element?.closest?.(`${PRIMER_CARD_SELECTOR} button, ${PRIMER_CARD_SELECTOR} a`);
    if (!control) return null;
    return PRIMER_DESTINATIONS.get(control.textContent.trim()) || null;
  }

  function forcePrimerNavigation(event) {
    const destination = primerDestinationFor(event.target);
    if (!destination) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(destination);
  }

  function upgradePrimerButtons() {
    const card = document.querySelector(PRIMER_CARD_SELECTOR);
    if (!card) return false;

    PRIMER_DESTINATIONS.forEach((href,label) => {
      const existing = [...card.querySelectorAll('button,a')].find(control => control.textContent.trim() === label);
      if (!existing || (existing.tagName === 'A' && existing.getAttribute('href') === href)) return;

      const link = document.createElement('a');
      link.href = href;
      link.className = existing.className;
      link.textContent = label;
      link.dataset.primerNativeLink = href.includes('mode=source') ? 'source' : 'wiki';
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.justifyContent = 'center';
      link.style.textDecoration = 'none';
      existing.replaceWith(link);
    });

    return true;
  }

  function installPrimerNavigation() {
    document.addEventListener('click',forcePrimerNavigation,true);
    const observer = new MutationObserver(upgradePrimerButtons);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    upgradePrimerButtons();
    window.setTimeout(upgradePrimerButtons,50);
    window.setTimeout(upgradePrimerButtons,250);
    window.setTimeout(upgradePrimerButtons,1000);
  }

  applyTitle();
  loadSupplementalGenerators();
  installPrimerNavigation();
  document.addEventListener('DOMContentLoaded',() => {
    applyTitle();
    loadSupplementalGenerators();
    upgradePrimerButtons();
  });
})();
