(() => {
  'use strict';

  const preservedPrimerScript = document.createElement('script');
  preservedPrimerScript.src = 'barotrauma-primer-entry.js?v=preserved-20260620';
  preservedPrimerScript.async = false;

  const launchModules = [
    ['barotrauma-rpg-rules-wiki', 'barotrauma-rpg.html', 'Open Barotrauma RPG Wiki'],
    ['barotrauma-active-submarine-dashboard', 'barotrauma-rpg-tools.html#dashboard', 'Open Active Submarine Dashboard'],
    ['barotrauma-rpg-character-sheet', 'barotrauma-rpg-tools.html#character', 'Open Standalone Character Sheet'],
    ['barotrauma-submarine-manager', 'barotrauma-rpg-tools.html#submarine', 'Open Standalone Submarine Manager'],
    ['barotrauma-custom-content-workshop', 'barotrauma-rpg-tools.html#workshop', 'Open Standalone Custom Content Workshop'],
    ['barotrauma-encounter-planner', 'barotrauma-rpg-tools.html#encounters', 'Open Standalone Encounter Planner'],
    ['barotrauma-route-planner', 'barotrauma-rpg-tools.html#route', 'Open Standalone Route Planner'],
    ['barotrauma-world-map-generator', 'barotrauma-rpg-tools.html#world', 'Open Standalone World State']
  ];

  const dashboardModule = {
    id: 'barotrauma-active-submarine-dashboard',
    title: 'Active Submarine Management Dashboard',
    section: 'tools',
    status: 'available',
    description: 'The integrated live-campaign command view for one ID-linked submarine and crew. It coordinates At Station and In Route states, randomized world starting stations, immediately adjacent routes, current-station commerce, consequential event cards, casualties, rotating turns, and numerical initiative.',
    families: ['activeVesselState','crewTurnOrder','routeTransit','currentStationCommerce','randomizedStartingStation','consequentialEventSequence']
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function dashboardCardMatchesCurrentView() {
    const activeFilter = document.querySelector('[data-barotrauma-filter].active')?.dataset.barotraumaFilter || 'all';
    const query = (document.getElementById('barotrauma-search')?.value || '').trim().toLowerCase();
    const text = [dashboardModule.title, dashboardModule.section, dashboardModule.status, dashboardModule.description, ...dashboardModule.families].join(' ').toLowerCase();
    return (activeFilter === 'all' || activeFilter === dashboardModule.section) && (!query || text.includes(query));
  }

  function ensureDashboardCard() {
    const grid = document.getElementById('barotrauma-overview-grid');
    if (!grid) return false;
    const existing = grid.querySelector(`[data-module-id="${dashboardModule.id}"]`);
    if (!dashboardCardMatchesCurrentView()) {
      existing?.remove();
      return false;
    }
    if (existing) return true;
    const article = document.createElement('article');
    article.className = 'module-card active-submarine-dashboard-card';
    article.dataset.moduleId = dashboardModule.id;
    article.innerHTML = `
      <div class="module-meta"><span class="badge">Available</span><span class="badge section-tools">Tools</span><span class="badge">Integrated Campaign View</span></div>
      <h3>${escapeHtml(dashboardModule.title)}</h3>
      <p>${escapeHtml(dashboardModule.description)}</p>
      <div class="chip-list">${dashboardModule.families.map(family => `<span class="chip">${escapeHtml(family.replace(/([a-z])([A-Z])/g, '$1 $2'))}</span>`).join('')}</div>
    `;
    grid.prepend(article);
    return true;
  }

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
    ensureDashboardCard();
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
    document.getElementById('barotrauma-search')?.addEventListener('input', attachAllLaunchButtons);
    document.querySelectorAll('[data-barotrauma-filter]').forEach(button => button.addEventListener('click', () => requestAnimationFrame(attachAllLaunchButtons)));
  });

  preservedPrimerScript.addEventListener('error', () => {
    const status = document.getElementById('barotrauma-status');
    if (status) status.textContent = 'The Barotrauma interface script could not be loaded.';
  });

  document.head.appendChild(preservedPrimerScript);
})();
