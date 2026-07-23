(() => {
  'use strict';

  const STORAGE_KEY = 'hb-ttrpg-tools-character-sheet-v1';
  const OLD_TITLES = new Set([
    'D&D 3.5-Compatible Character Sheet',
    'D&D 3.5-compatible character sheet PDF creator'
  ]);
  const NEW_TITLE = 'AD and D 3.5 - Hypertext D20 compatible character sheet';
  const loadedScripts = new Map();
  const loadedBundles = new Map();

  const BUNDLES = Object.freeze({
    modules: ['module-viewer.js'],
    barotrauma: ['barotrauma-entry.js', 'barotrauma-rpg-entry.js'],
    'solanum-umbra': ['solanum-umbra-entry.js'],
    shadowrun: ['shadowrun-entry.js'],
    kaysender: [
      'kaysender-wiki.js',
      'kaysender-editor-kernel.js',
      'kaysender-editor-field-mapping.js',
      'kaysender-editor-adapter-registry.js',
      'kaysender-editor-builtins.js',
      'kaysender-editor-migrations.js',
      'kaysender-editor-kernel-adapters.js',
      'kaysender-editor-lifecycle.js',
      'kaysender-editor-repository.js',
      'kaysender-editors.js',
      'kaysender-settlement-editor.js',
      'kaysender-airship-editor.js',
      'kaysender-editor-production.js',
      'kaysender-editor-record-library.js',
      'kaysender-editor-error-boundary.js',
      'kaysender-settlement-inheritance-guard.js',
      'kaysender-tools.js'
    ],
    'world-of-darkness': [
      'world-of-darkness-entry.js',
      'world-of-darkness-spatial-loader.js'
    ]
  });

  const GENERATOR_MODULES = Object.freeze([
    {
      id: 'spell-creator',
      title: 'Spell Creator',
      description: 'Load the standard Hypertext d20-compatible spell creation workspace.',
      script: 'spell-creator-entry.js'
    },
    {
      id: 'eccentric-spells',
      title: 'Eccentric Spell Generator',
      description: 'Load the eccentric and unusual spell-generation module.',
      script: 'eccentric-spell-entry.js'
    },
    {
      id: 'arcane-academic',
      title: 'Arcane Academic Generator',
      description: 'Load the arcane academic institution and scholar generator.',
      script: 'arcane-academic-entry.js'
    },
    {
      id: 'malefic-academic',
      title: 'Malefic Academic Generator',
      description: 'Load the darker academic institution and practitioner generator.',
      script: 'malefic-academic-entry.js'
    },
    {
      id: 'magical-library',
      title: 'Magical Library Generator',
      description: 'Load the magical archive, collection, and library generator.',
      script: 'magical-library-entry.js'
    },
    {
      id: 'elemental-realms',
      title: 'Elemental Realms Generator',
      description: 'Load the elemental realm and planar environment generator.',
      script: 'elemental-realms-entry.js'
    },
    {
      id: 'universal-npc',
      title: 'Universal NPC Profile Generator',
      description: 'Load the complete role-aware NPC profile workspace only when it is needed.',
      script: 'npc-profile-generator-entry.js'
    },
    {
      id: 'kaysender-npc',
      title: 'Kaysender NPC Generator',
      description: 'Load the Kaysender-specific NPC generation module.',
      script: 'kaysender-npc-generator.js'
    },
    {
      id: 'kaysender-crafting',
      title: 'Kaysender Crafting Generator',
      description: 'Load the Kaysender crafting generation module.',
      script: 'kaysender-crafting-generator.js'
    }
  ]);

  const WORKSPACES = [
    {
      id: 'world-of-darkness',
      label: 'World of Darkness',
      title: 'World of Darkness Workspace',
      description: 'Locations, political domains, named-place generation, world seeds, supernatural inventories, and Chronicle overlays.',
      cardAttribute: 'wodCard'
    },
    {
      id: 'shadowrun',
      label: 'Shadowrun',
      title: 'Shadowrun Workspace',
      description: 'Sprawls, runs, Johnsons, contacts, Matrix hosts, facilities, magic, equipment, heat, and consequences.',
      cardAttribute: 'shadowrunCard'
    },
    {
      id: 'solanum-umbra',
      label: 'Solanum Umbra',
      title: 'Solanum Umbra Workspace',
      description: 'Native-system wiki for characters, professions, cybernetics, crafting, equipment, combat, enemies, and entities.',
      cardAttribute: 'solanumCard'
    }
  ];

  function shouldReplace(value) {
    return !value || OLD_TITLES.has(String(value).trim());
  }

  function migrateStoredTitle() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (shouldReplace(data.title)) {
        data.title = NEW_TITLE;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (_) {
      // Optional browser storage must not block startup.
    }
  }

  function applyTitle() {
    migrateStoredTitle();
    const input = document.getElementById('sheet-title');
    const printTitle = document.getElementById('print-title');
    if (input && shouldReplace(input.value)) input.value = NEW_TITLE;
    if (printTitle && shouldReplace(printTitle.textContent)) printTitle.textContent = input?.value || NEW_TITLE;
  }

  function ensureStatus() {
    let status = document.getElementById('hb-workspace-load-status');
    if (status) return status;
    status = document.createElement('div');
    status.id = 'hb-workspace-load-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    status.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:10000;max-width:min(420px,calc(100vw - 28px));padding:10px 13px;border:1px solid var(--line);border-radius:10px;background:#10131a;color:var(--ink);box-shadow:0 8px 28px #0008;font-size:.82rem';
    document.body.appendChild(status);
    return status;
  }

  function setStatus(message, error = false) {
    const status = ensureStatus();
    status.hidden = !message;
    status.textContent = message || '';
    status.style.borderColor = error ? '#8b0000' : 'var(--line)';
    status.style.color = error ? '#ffb3b3' : 'var(--ink)';
  }

  function existingScript(src) {
    return [...document.scripts].find(script => {
      const value = (script.getAttribute('src') || '').split('?')[0];
      return value === src || value.endsWith(`/${src}`);
    });
  }

  function loadScript(src) {
    if (loadedScripts.has(src)) return loadedScripts.get(src);
    const existing = existingScript(src);
    if (existing?.dataset.hbLoaded === 'true') return Promise.resolve();

    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        script.dataset.hbLoaded = 'true';
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error(`${src} could not be loaded.`));
      };
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.dataset.hbLazyWorkspace = 'true';
        document.body.appendChild(script);
      } else if (script.dataset.hbLoaded === 'true') {
        finish();
      }
    });
    loadedScripts.set(src, promise);
    promise.catch(() => {
      if (loadedScripts.get(src) === promise) loadedScripts.delete(src);
    });
    return promise;
  }

  async function loadBundle(viewId) {
    if (!BUNDLES[viewId]) return;
    if (loadedBundles.has(viewId)) return loadedBundles.get(viewId);

    const promise = (async () => {
      const scripts = BUNDLES[viewId];
      for (let index = 0; index < scripts.length; index += 1) {
        setStatus(`Loading ${viewLabel(viewId)} · ${index + 1} of ${scripts.length}`);
        await loadScript(scripts[index]);
      }
      if (viewId === 'kaysender') {
        const internalSmoke = new URLSearchParams(location.search).get('p0-smoke') === '1' || navigator.webdriver === true;
        if (internalSmoke) await loadScript('kaysender-editor-live-smoke.js');
      }
      if (viewId === 'barotrauma') installPrimerUpgrade();
    })();

    loadedBundles.set(viewId, promise);
    try {
      await promise;
    } catch (error) {
      loadedBundles.delete(viewId);
      throw error;
    }
  }

  function viewLabel(viewId) {
    return WORKSPACES.find(workspace => workspace.id === viewId)?.label
      || viewId.replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
  }

  function activateView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
    history.replaceState(null, '', `${location.pathname}${location.search}#${encodeURIComponent(viewId)}`);
    document.dispatchEvent(new CustomEvent('hb:view-activated', { detail: { viewId } }));
  }

  function generatorCard(module) {
    const article = document.createElement('article');
    article.className = 'module-card generator-loader-card';
    article.dataset.generatorLoader = module.id;
    article.innerHTML = `
      <div class="module-meta">
        <span class="badge section-generators">generator</span>
        <span class="badge status-active">on demand</span>
      </div>
      <h3>${module.title}</h3>
      <p>${module.description}</p>
      <button type="button" class="primary-action" data-load-generator="${module.id}">Load ${module.title}</button>
    `;
    const button = article.querySelector('[data-load-generator]');
    button?.addEventListener('click', async () => {
      if (button.dataset.loaded === 'true') return;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      setStatus(`Loading ${module.title}…`);
      try {
        await loadScript(module.script);
        button.dataset.loaded = 'true';
        button.textContent = `${module.title} loaded`;
        setStatus('');
      } catch (error) {
        button.disabled = false;
        setStatus(`${module.title} failed to load: ${error.message}`, true);
      } finally {
        button.removeAttribute('aria-busy');
      }
    });
    return article;
  }

  function ensureGeneratorLaunchers() {
    const panel = document.getElementById('generator-library-panel');
    const registryGrid = document.getElementById('kaysender-generators-grid');
    if (!panel || !registryGrid || document.getElementById('on-demand-generator-library')) return;

    const section = document.createElement('section');
    section.id = 'on-demand-generator-library';
    section.className = 'registry-section no-print';
    section.setAttribute('aria-labelledby', 'on-demand-generator-library-title');
    section.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">On-demand generator library</p>
        <h2 id="on-demand-generator-library-title">Load one generator at a time</h2>
        <p>Opening the Generator Bench no longer initializes every generator. Select only the generator needed for the current task.</p>
      </div>
      <div id="on-demand-generator-grid" class="module-grid"></div>
    `;
    const grid = section.querySelector('#on-demand-generator-grid');
    GENERATOR_MODULES.forEach(module => grid?.appendChild(generatorCard(module)));
    registryGrid.before(section);
  }

  async function openView(viewId) {
    const safeViewId = window.CSS?.escape ? CSS.escape(viewId) : viewId.replace(/[^a-z0-9_-]/gi, '');
    const controls = [...document.querySelectorAll(`[data-view="${safeViewId}"]`)];
    controls.forEach(control => {
      control.disabled = true;
      control.setAttribute('aria-busy', 'true');
    });
    try {
      if (viewId === 'generators') ensureGeneratorLaunchers();
      await loadBundle(viewId);
      await window.HBTTRPGApp?.prepareView?.(viewId);
      activateView(viewId);
      setStatus('');
    } catch (error) {
      setStatus(`${viewLabel(viewId)} failed to load: ${error.message}`, true);
    } finally {
      controls.forEach(control => {
        control.disabled = false;
        control.removeAttribute('aria-busy');
      });
    }
  }

  function ensureWorkspaceLaunchers() {
    const nav = document.querySelector('.top-nav');
    const menu = document.querySelector('#tools .menu-grid');
    for (const workspace of WORKSPACES) {
      if (nav && !nav.querySelector(`[data-view="${workspace.id}"]`)) {
        const button = document.createElement('button');
        button.className = 'nav-button';
        button.dataset.view = workspace.id;
        button.textContent = workspace.label;
        nav.appendChild(button);
      }
      const attribute = `data-${workspace.cardAttribute.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`;
      if (menu && !menu.querySelector(`[${attribute}]`)) {
        const card = document.createElement('article');
        card.className = 'menu-card';
        card.setAttribute(attribute, 'true');
        card.innerHTML = `<h3>${workspace.title}</h3><p>${workspace.description}</p><button class="link-button" data-view="${workspace.id}">Open ${workspace.label}</button>`;
        menu.appendChild(card);
      }
    }
  }

  function upgradePrimerButtons() {
    const card = document.querySelector('[data-module-id="barotrauma-crewmans-primer"]');
    if (!card) return;
    const destinations = new Map([
      ["Open Crewman's Primer Wiki", 'barotrauma-primer.html?mode=wiki'],
      ['Open Source Document Viewer', 'barotrauma-primer.html?mode=source']
    ]);
    for (const [label, href] of destinations) {
      const existing = [...card.querySelectorAll('button,a')].find(control => control.textContent.trim() === label);
      if (!existing || (existing.tagName === 'A' && existing.getAttribute('href') === href)) continue;
      const link = document.createElement('a');
      link.href = href;
      link.className = existing.className;
      link.textContent = label;
      link.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;text-decoration:none';
      existing.replaceWith(link);
    }
  }

  function installPrimerUpgrade() {
    const grid = document.getElementById('barotrauma-overview-grid');
    if (!grid || grid.dataset.primerObserver === 'true') return;
    grid.dataset.primerObserver = 'true';
    new MutationObserver(upgradePrimerButtons).observe(grid, { childList: true, subtree: true });
    upgradePrimerButtons();
  }

  function installNavigation() {
    document.addEventListener('click', event => {
      const control = event.target.closest('[data-view]');
      if (!control) return;
      const viewId = control.dataset.view;
      if (!viewId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void openView(viewId);
    }, true);
  }

  function initialView() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(location.search).get('view');
    return query || hash || 'tools';
  }

  function init() {
    applyTitle();
    ensureWorkspaceLaunchers();
    ensureGeneratorLaunchers();
    installNavigation();
    const requested = initialView();
    if (requested !== 'tools') void openView(requested);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.HBWorkspaceLoader = Object.freeze({
    openView,
    loadBundle,
    loadGenerator: id => {
      const module = GENERATOR_MODULES.find(candidate => candidate.id === id);
      return module ? loadScript(module.script) : Promise.reject(new Error(`Unknown generator: ${id}`));
    },
    loadedScripts,
    loadedBundles
  });
})();