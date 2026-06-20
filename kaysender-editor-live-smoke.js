(() => {
  'use strict';

  // The old Primer card still generates a legacy source-viewer action.
  // Remove that action whenever the Barotrauma registry renders or re-renders.
  const removeLegacyPrimerSourceButton = () => {
    const card = document.querySelector('[data-module-id="barotrauma-crewmans-primer"]');
    const actions = card?.querySelector('.module-actions');
    const buttons = actions ? [...actions.querySelectorAll('button')] : [];
    buttons.slice(1).forEach(button => button.remove());
  };

  const grid = document.getElementById('barotrauma-overview-grid');
  if (!grid) return;

  new MutationObserver(removeLegacyPrimerSourceButton).observe(grid, {
    childList: true,
    subtree: true
  });

  removeLegacyPrimerSourceButton();
})();
