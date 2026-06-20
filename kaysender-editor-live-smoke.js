(() => {
  'use strict';

  const removeLegacyPrimerSourceButton = () => {
    const card = document.querySelector('[data-module-id="barotrauma-crewmans-primer"]');
    const actions = card?.querySelector('.module-actions');
    const buttons = actions ? [...actions.querySelectorAll('button')] : [];
    buttons.slice(1).forEach(button => button.remove());
  };

  const loadRpgWikiAction = () => {
    if (document.querySelector('script[data-barotrauma-rpg-entry]')) return;
    const script = document.createElement('script');
    script.src = 'barotrauma-rpg-entry.js?v=exact-19';
    script.dataset.barotraumaRpgEntry = 'true';
    document.body.appendChild(script);
  };

  const grid = document.getElementById('barotrauma-overview-grid');
  if (!grid) return;

  new MutationObserver(removeLegacyPrimerSourceButton).observe(grid, {
    childList: true,
    subtree: true
  });

  removeLegacyPrimerSourceButton();
  loadRpgWikiAction();
})();
