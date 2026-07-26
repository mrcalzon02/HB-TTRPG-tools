(() => {
  'use strict';

  const card = document.querySelector('[data-module-id="barotrauma-rpg-rules-wiki"]');
  if (!card) return;

  const canonicalAction = card.querySelector(':scope > .module-actions a[href="barotrauma-rpg.html"]');
  if (canonicalAction) return;

  const actions = document.createElement('div');
  actions.className = 'module-actions';

  const link = document.createElement('a');
  link.href = 'barotrauma-rpg.html';
  link.className = 'primary-action barotrauma-action';
  link.dataset.rpgWikiAction = 'true';
  link.textContent = 'Open Barotrauma RPG Wiki';

  actions.appendChild(link);
  card.appendChild(actions);
})();