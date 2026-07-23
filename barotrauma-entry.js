(() => {
  'use strict';

  const REGISTRY_URL = 'data/barotrauma-tools-registry.json';
  const state = {
    initialized: false,
    controlsBound: false,
    registry: null,
    activeFilter: 'all'
  };

  function assets() {
    const value = window.BarotraumaPackagedAssets;
    if (!value) throw new Error('The static Barotrauma atlas factory is unavailable.');
    return value;
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

  function createBadge(label, className, iconRole) {
    const badge = document.createElement('span');
    badge.className = `badge barotrauma-badge ${className}`.trim();
    badge.append(assets().createIcon(iconRole, 'barotrauma-atlas-glyph'));
    const text = document.createElement('span');
    text.textContent = label;
    badge.appendChild(text);
    return badge;
  }

  function createActionContent(label, iconRole) {
    const fragment = document.createDocumentFragment();
    fragment.append(assets().createIcon(iconRole, 'barotrauma-atlas-glyph'));
    const text = document.createElement('span');
    text.textContent = label;
    fragment.appendChild(text);
    return fragment;
  }

  function createModuleActions(module) {
    const actions = document.createElement('div');
    actions.className = 'module-actions';

    if (module.launchTarget === 'crewmans-primer') {
      const wiki = document.createElement('button');
      wiki.type = 'button';
      wiki.className = 'primary-action barotrauma-action';
      wiki.append(createActionContent(module.actionLabel || 'Open Crewman’s Primer Wiki', module.presentation.icon));
      wiki.addEventListener('click', () => void window.BarotraumaPrimer?.open('wiki'));

      const source = document.createElement('button');
      source.type = 'button';
      source.className = 'secondary-action barotrauma-action';
      source.append(createActionContent(module.sourceActionLabel || 'Open Source Document Viewer', 'document'));
      source.addEventListener('click', () => void window.BarotraumaPrimer?.open('source'));
      actions.append(wiki, source);
      return actions;
    }

    if (!module.launchUrl) return null;
    const link = document.createElement('a');
    link.className = 'primary-action barotrauma-action';
    link.href = module.launchUrl;
    link.append(createActionContent(module.actionLabel || `Open ${module.title}`, module.presentation.icon));
    actions.appendChild(link);
    return actions;
  }

  function createModuleCard(module) {
    if (!module.presentation?.scene || !module.presentation?.icon) {
      throw new Error(`Barotrauma module ${module.id} has no authoritative presentation record.`);
    }

    const article = document.createElement('article');
    article.className = 'module-card barotrauma-atlas-surface';
    if (module.id === 'barotrauma-active-submarine-dashboard') {
      article.classList.add('active-submarine-dashboard-card');
    }
    article.dataset.moduleId = module.id;
    article.dataset.section = module.section;
    article.append(
      assets().createScene(module.presentation.scene),
      assets().createIcon(module.presentation.icon)
    );

    const meta = document.createElement('div');
    meta.className = 'module-meta';
    meta.append(
      createBadge(humanize(module.status), `status-${module.status}`, module.status === 'planned' ? 'planned' : 'available'),
      createBadge(humanize(module.section), `section-${module.section}`, module.presentation.icon)
    );
    if (module.id === 'barotrauma-active-submarine-dashboard') {
      meta.append(createBadge('Integrated Campaign View', 'status-integrated', 'notification'));
    }

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
    const actions = createModuleActions(module);
    if (actions) article.appendChild(actions);
    return article;
  }

  function visibleModules() {
    const query = (document.getElementById('barotrauma-search')?.value || '').trim().toLowerCase();
    return [...(state.registry?.modules || [])]
      .sort((left, right) => (left.priority ?? 999) - (right.priority ?? 999) || left.title.localeCompare(right.title))
      .filter(module => (state.activeFilter === 'all' || module.section === state.activeFilter)
        && (!query || moduleSearchText(module).includes(query)));
  }

  function render() {
    const grid = document.getElementById('barotrauma-overview-grid');
    const status = document.getElementById('barotrauma-status');
    if (!grid || !status || !state.registry) return;

    const modules = state.registry.modules || [];
    const visible = visibleModules();
    const fragment = document.createDocumentFragment();
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'module-empty';
      empty.textContent = 'No Barotrauma modules match the current search and filter.';
      fragment.appendChild(empty);
    } else {
      visible.forEach(module => fragment.appendChild(createModuleCard(module)));
    }
    grid.replaceChildren(fragment);
    status.textContent = `${visible.length} of ${modules.length} modules shown · ${state.registry.status}`;
  }

  function bindControls() {
    if (state.controlsBound) return;
    state.controlsBound = true;
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
  }

  async function initialize() {
    if (state.initialized) {
      render();
      return state.registry;
    }
    state.initialized = true;
    const status = document.getElementById('barotrauma-status');
    try {
      const [response] = await Promise.all([
        fetch(REGISTRY_URL, { cache: 'force-cache' }),
        assets().preload()
      ]);
      if (!response.ok) throw new Error(`Registry request failed with status ${response.status}.`);
      state.registry = await response.json();
      bindControls();
      render();
      return state.registry;
    } catch (error) {
      state.initialized = false;
      if (status) status.textContent = `The Barotrauma registry could not be loaded: ${error.message}`;
      const grid = document.getElementById('barotrauma-overview-grid');
      if (grid) grid.innerHTML = '<div class="module-empty">Barotrauma module data is currently unavailable.</div>';
      console.error(error);
      throw error;
    }
  }

  window.BarotraumaWorkspace = Object.freeze({ initialize, render });
})();