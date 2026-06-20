(() => {
  'use strict';

  const attachRpgAction = () => {
    const card = document.querySelector('[data-module-id="barotrauma-rpg-rules-wiki"]');
    if (!card || card.querySelector('[data-rpg-wiki-action]')) return;

    const actions = document.createElement('div');
    actions.className = 'module-actions';

    const link = document.createElement('a');
    link.href = 'barotrauma-rpg.html';
    link.className = 'primary-action';
    link.dataset.rpgWikiAction = 'true';
    link.textContent = 'Open Barotrauma RPG Wiki';

    actions.appendChild(link);
    card.appendChild(actions);
  };

  const grid = document.getElementById('barotrauma-overview-grid');
  if (!grid) return;

  new MutationObserver(attachRpgAction).observe(grid, {
    childList: true,
    subtree: true
  });

  attachRpgAction();
})();
