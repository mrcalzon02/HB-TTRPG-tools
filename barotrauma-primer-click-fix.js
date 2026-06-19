(() => {
  const panelId = 'barotrauma-primer-browser';
  const moduleSelector = '[data-module-id="barotrauma-crewmans-primer"]';

  function placeAndRevealPanel() {
    const grid = document.getElementById('barotrauma-overview-grid');
    const panel = document.getElementById(panelId);
    if (!grid || !panel) return false;

    if (panel.parentNode !== grid.parentNode || panel.nextElementSibling !== grid) {
      grid.parentNode.insertBefore(panel, grid);
    }

    panel.hidden = false;
    panel.setAttribute('aria-live', 'polite');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest(`${moduleSelector} button`);
    if (!button) return;

    requestAnimationFrame(placeAndRevealPanel);
    window.setTimeout(placeAndRevealPanel, 40);
    window.setTimeout(placeAndRevealPanel, 200);
  }, true);

  const observer = new MutationObserver(() => {
    const panel = document.getElementById(panelId);
    const grid = document.getElementById('barotrauma-overview-grid');
    if (panel && grid && (panel.parentNode !== grid.parentNode || panel.nextElementSibling !== grid)) {
      grid.parentNode.insertBefore(panel, grid);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => {
    const panel = document.getElementById(panelId);
    const grid = document.getElementById('barotrauma-overview-grid');
    if (panel && grid && (panel.parentNode !== grid.parentNode || panel.nextElementSibling !== grid)) {
      grid.parentNode.insertBefore(panel, grid);
    }
  }, 0);
})();
