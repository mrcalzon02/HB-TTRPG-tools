(() => {
  'use strict';

  const preservedPrimerScript = document.createElement('script');
  preservedPrimerScript.src = 'barotrauma-primer-entry.js?v=preserved-20260620';
  preservedPrimerScript.async = false;

  const launchModules = [
    ['barotrauma-rpg-rules-wiki', 'barotrauma-rpg.html', 'Open Barotrauma RPG Wiki'],
    ['barotrauma-rpg-character-sheet', 'barotrauma-rpg-tools.html#character', 'Open Character Sheet'],
    ['barotrauma-submarine-manager', 'barotrauma-rpg-tools.html#submarine', 'Open Submarine Manager'],
    ['barotrauma-custom-content-workshop', 'barotrauma-rpg-tools.html#workshop', 'Open Custom Content Workshop'],
    ['barotrauma-encounter-planner', 'barotrauma-rpg-tools.html#encounters', 'Open Encounter Planner'],
    ['barotrauma-route-planner', 'barotrauma-rpg-tools.html#route', 'Open Route Planner'],
    ['barotrauma-world-map-generator', 'barotrauma-rpg-tools.html#world', 'Open World Map Generator']
  ];

  function attachLaunchButton(moduleId, href, label) {
    const card = document.querySelector(`[data-module-id="${moduleId}"]`);
    if (!card || card.querySelector(`[data-open-module="${moduleId}"]`)) return Boolean(card);

    let actions = card.querySelector('.module-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'module-actions';
      card.appendChild(actions);
    }

    const anchor = document.createElement('a');
    anchor.className = 'primary-action';
    anchor.dataset.openModule = moduleId;
    anchor.href = href;
    anchor.textContent = label;
    anchor.style.textDecoration = 'none';
    actions.appendChild(anchor);
    return true;
  }

  function attachAllLaunchButtons() {
    let attached = 0;
    for (const module of launchModules) attached += attachLaunchButton(...module) ? 1 : 0;
    return attached;
  }

  preservedPrimerScript.addEventListener('load', () => {
    const grid = document.getElementById('barotrauma-overview-grid');
    attachAllLaunchButtons();
    if (!grid) return;

    const observer = new MutationObserver(() => {
      attachAllLaunchButtons();
    });
    observer.observe(grid, { childList: true, subtree: true });
  });

  preservedPrimerScript.addEventListener('error', () => {
    const status = document.getElementById('barotrauma-status');
    if (status) status.textContent = 'The Barotrauma interface script could not be loaded.';
  });

  document.head.appendChild(preservedPrimerScript);
})();
