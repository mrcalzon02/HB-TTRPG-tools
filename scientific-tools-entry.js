(() => {
  'use strict';

  const VIEW_ID = 'scientific-tools';
  const ASSET_VERSION = '20260808-ism-main-menu-1';
  let labPromise = null;
  let initialized = false;

  function injectStyle() {
    if (document.getElementById('scientific-tools-workspace-style')) return;
    const style = document.createElement('style');
    style.id = 'scientific-tools-workspace-style';
    style.textContent = `
      #scientific-tools .scientific-tools-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
      #scientific-tools .scientific-tools-tab{border:1px solid var(--line);border-radius:999px;padding:9px 14px;background:#ffffff08;color:var(--muted);font-weight:800;cursor:pointer}
      #scientific-tools .scientific-tools-tab.active,#scientific-tools .scientific-tools-tab:hover{border-color:var(--accent);color:var(--ink)}
      #scientific-tools .scientific-tools-panel[hidden]{display:none}
      #scientific-tools .scientific-tools-panel{border:1px solid var(--line);border-radius:20px;padding:20px;background:rgba(255,255,255,.025)}
      #scientific-tools .scientific-tools-panel h3{margin-top:0}
      #scientific-tools .scientific-tools-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
      #scientific-tools .scientific-tools-boundary{margin-top:16px;padding:11px 13px;border-left:3px solid var(--accent);background:rgba(255,255,255,.035);color:var(--muted);line-height:1.55}
    `;
    document.head.appendChild(style);
  }

  function resolvedScriptSource(value) {
    return new URL(String(value || ''), document.baseURI).href;
  }

  function loadScript(src, ready = () => false) {
    if (ready()) return Promise.resolve();
    const resolved = resolvedScriptSource(src);
    const existing = [...document.scripts].find(script => resolvedScriptSource(script.getAttribute('src')) === resolved);
    return new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (!ready()) return reject(new Error(`${src} loaded without exposing its expected API.`));
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
        script.src = `${src}?v=${ASSET_VERSION}`;
        script.async = false;
        document.body.appendChild(script);
      } else if (ready()) finish();
    });
  }

  function loadLab() {
    if (window.InterstellarMediaCollisionsLab) return Promise.resolve(window.InterstellarMediaCollisionsLab);
    if (labPromise) return labPromise;
    labPromise = loadScript('interstellar-media-collisions-lab.js', () => Boolean(window.InterstellarMediaCollisionsLab))
      .then(() => window.InterstellarMediaCollisionsLab);
    labPromise.catch(() => { labPromise = null; });
    return labPromise;
  }

  async function openIsmSimulation(button) {
    const original = button?.textContent || 'Open ISM Media Simulation';
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Loading Simulation…';
    }
    try {
      const api = await loadLab();
      if (!api?.openPanel) throw new Error('The ISM Media Simulation loaded without an open-panel interface.');
      api.openPanel({ setting: 'scientific-tools' });
    } catch (error) {
      alert(error.message);
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = original;
      }
    }
  }

  function selectTab(tabId) {
    document.querySelectorAll('#scientific-tools [data-scientific-tools-tab]').forEach(button => {
      const active = button.dataset.scientificToolsTab === tabId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#scientific-tools [data-scientific-tools-panel]').forEach(panel => {
      panel.hidden = panel.dataset.scientificToolsPanel !== tabId;
    });
  }

  function buildWorkspace() {
    const view = document.getElementById(VIEW_ID);
    if (!view) return null;
    view.setAttribute('aria-labelledby', 'scientific-tools-title');
    view.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Scientific Tools</p>
        <h2 id="scientific-tools-title">Scientific Simulation Workspace</h2>
        <p>Setting-neutral experimental and physics-adjacent tools live here rather than inside individual campaign settings.</p>
      </div>
      <div class="scientific-tools-tabs no-print" role="tablist" aria-label="Scientific Tools settings">
        <button type="button" class="scientific-tools-tab active" data-scientific-tools-tab="ism-media-simulation" role="tab" aria-selected="true">ISM Media Simulation</button>
      </div>
      <section class="scientific-tools-panel no-print" data-scientific-tools-panel="ism-media-simulation">
        <p class="eyebrow">Interstellar medium collision model</p>
        <h3>ISM Media Simulation</h3>
        <p>Cast phase-light vectors through literal 1:1 interstellar-medium particles, retain the physically bounded cosmological-constant term, apply the separate deterministic Shadow-key scattering operator, and collect all non-input cube faces concurrently.</p>
        <div class="scientific-tools-actions">
          <button id="scientific-tools-open-ism" type="button" class="primary-action">Open ISM Media Simulation</button>
        </div>
        <div class="scientific-tools-boundary"><strong>Model boundary:</strong> particle density, physical cube scale, light transit, and Λ calculations remain physical-model quantities. Shadow-key coupling remains an explicitly separate experimental scattering/obfuscation layer.</div>
      </section>`;

    view.querySelectorAll('[data-scientific-tools-tab]').forEach(button => {
      button.addEventListener('click', () => selectTab(button.dataset.scientificToolsTab));
    });
    view.querySelector('#scientific-tools-open-ism')?.addEventListener('click', event => void openIsmSimulation(event.currentTarget));
    selectTab('ism-media-simulation');
    return view;
  }

  function initialize() {
    injectStyle();
    if (!initialized) {
      buildWorkspace();
      initialized = true;
    }
    return document.getElementById(VIEW_ID);
  }

  initialize();
  window.ScientificToolsWorkspace = Object.freeze({ initialize, selectTab, openIsmSimulation, loadLab });
})();
