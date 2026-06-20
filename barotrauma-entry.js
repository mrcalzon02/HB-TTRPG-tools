(() => {
  const preservedPrimerScript = document.createElement('script');
  preservedPrimerScript.src = 'barotrauma-primer-entry.js?v=preserved-20260620';
  preservedPrimerScript.async = false;

  function attachRpgLaunchButton() {
    const card = document.querySelector('[data-module-id="barotrauma-rpg-rules-wiki"]');
    if (!card || card.querySelector('[data-open-barotrauma-rpg]')) return Boolean(card);

    let actions = card.querySelector('.module-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'module-actions';
      card.appendChild(actions);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-action';
    button.dataset.openBarotraumaRpg = 'true';
    button.textContent = 'Open Barotrauma RPG Wiki';
    button.addEventListener('click', () => {
      window.location.href = 'barotrauma-rpg.html';
    });
    actions.appendChild(button);
    return true;
  }

  preservedPrimerScript.addEventListener('load', () => {
    const grid = document.getElementById('barotrauma-overview-grid');
    attachRpgLaunchButton();
    if (!grid) return;

    const observer = new MutationObserver(() => {
      attachRpgLaunchButton();
    });
    observer.observe(grid, { childList: true, subtree: true });
  });

  preservedPrimerScript.addEventListener('error', () => {
    const status = document.getElementById('barotrauma-status');
    if (status) status.textContent = 'The Barotrauma interface script could not be loaded.';
  });

  document.head.appendChild(preservedPrimerScript);
})();
