(() => {
  const REGISTRY_URL = 'data/barotrauma-tools-registry.json';
  const searchInput = document.getElementById('barotrauma-search');
  const statusTarget = document.getElementById('barotrauma-status');
  const gridTarget = document.getElementById('barotrauma-overview-grid');
  const filterButtons = Array.from(document.querySelectorAll('[data-barotrauma-filter]'));
  let registry = null;
  let activeFilter = 'all';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function humanize(value) {
    return String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, character => character.toUpperCase());
  }

  function moduleSearchText(module) {
    return [
      module.title,
      module.section,
      module.status,
      module.description,
      ...(module.tags || []),
      ...(module.dataFamilies || [])
    ].join(' ').toLowerCase();
  }

  function createCard(module) {
    const article = document.createElement('article');
    article.className = 'module-card';
    article.dataset.moduleId = module.id;

    const meta = document.createElement('div');
    meta.className = 'module-meta';
    meta.innerHTML = `
      <span class="badge ${module.status === 'planned' ? 'status-planned' : ''}">${escapeHtml(humanize(module.status))}</span>
      <span class="badge section-${escapeHtml(module.section)}">${escapeHtml(humanize(module.section))}</span>
    `;

    const title = document.createElement('h3');
    title.textContent = module.title;

    const description = document.createElement('p');
    description.textContent = module.description;

    const chips = document.createElement('div');
    chips.className = 'chip-list';
    (module.dataFamilies || []).forEach(family => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = humanize(family);
      chips.appendChild(chip);
    });

    article.append(meta, title, description, chips);
    return article;
  }

  function render() {
    if (!registry || !gridTarget || !statusTarget) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const modules = [...(registry.modules || [])].sort((left, right) =>
      (left.priority || 999) - (right.priority || 999) || left.title.localeCompare(right.title)
    );
    const matches = modules.filter(module => {
      const matchesSection = activeFilter === 'all' || module.section === activeFilter;
      const matchesQuery = !query || moduleSearchText(module).includes(query);
      return matchesSection && matchesQuery;
    });

    gridTarget.innerHTML = '';
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'module-empty';
      empty.textContent = 'No Barotrauma modules match the current search and filter.';
      gridTarget.appendChild(empty);
    } else {
      matches.forEach(module => gridTarget.appendChild(createCard(module)));
    }

    statusTarget.textContent = `${matches.length} of ${modules.length} modules shown · ${registry.status}`;
  }

  async function loadRegistry() {
    if (!gridTarget || !statusTarget) return;
    try {
      const response = await fetch(REGISTRY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Registry request failed with status ${response.status}`);
      registry = await response.json();
      render();
    } catch (error) {
      statusTarget.textContent = 'The Barotrauma registry could not be loaded. Serve the project through GitHub Pages or a local web server.';
      gridTarget.innerHTML = '<div class="module-empty">Barotrauma module data is currently unavailable.</div>';
      console.error(error);
    }
  }

  searchInput?.addEventListener('input', render);
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.barotraumaFilter || 'all';
      filterButtons.forEach(item => item.classList.toggle('active', item === button));
      render();
    });
  });

  void loadRegistry();
})();
