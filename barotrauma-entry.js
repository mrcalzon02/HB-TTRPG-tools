(() => {
  'use strict';

  const ownerScript = document.currentScript;
  if (ownerScript) ownerScript.dataset.hbLoaded = 'true';

  const state = {
    initialized: false,
    activeFilter: 'all'
  };

  function cards() {
    return [...document.querySelectorAll('#barotrauma-overview-grid > [data-module-id]')];
  }

  function render() {
    const query = (document.getElementById('barotrauma-search')?.value || '').trim().toLowerCase();
    const modules = cards();
    let visible = 0;

    modules.forEach(card => {
      const sectionMatches = state.activeFilter === 'all' || card.dataset.section === state.activeFilter;
      const searchMatches = !query || card.textContent.toLowerCase().includes(query);
      const shown = sectionMatches && searchMatches;
      card.hidden = !shown;
      if (shown) visible += 1;
    });

    const status = document.getElementById('barotrauma-status');
    if (status) {
      status.textContent = `${visible} of ${modules.length} modules shown · foundation registry with source-faithful Markdown wikis and operational RPG tools`;
    }
  }

  function initialize() {
    if (state.initialized) {
      render();
      return;
    }
    state.initialized = true;

    document.getElementById('barotrauma-search')?.addEventListener('input', render);
    document.querySelectorAll('[data-barotrauma-filter]').forEach(button => {
      button.addEventListener('click', () => {
        state.activeFilter = button.dataset.barotraumaFilter || 'all';
        document.querySelectorAll('[data-barotrauma-filter]').forEach(item => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        render();
      });
    });

    render();
  }

  window.BarotraumaWorkspace = Object.freeze({ initialize, render });
})();
