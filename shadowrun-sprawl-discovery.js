(() => {
  'use strict';

  const STORAGE_KEY = 'hb-shadowrun-sprawl-discovery-v1';
  const DEFAULT_INPUT = Object.freeze({
    seed: 'pioneer-square-sprawl-watch',
    label: 'Seattle - Pioneer Square',
    lat: 47.6016,
    lng: -122.3334,
    radiusMeters: 900,
    count: 8,
    focus: 'balanced',
    threat: 'standard'
  });

  const state = {
    installed: false,
    currentPackage: null,
    selectedSiteKey: null
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function engine() {
    if (!window.ShadowrunSprawlDiscoveryEngine) {
      throw new Error('The Shadowrun sprawl discovery engine is not loaded.');
    }
    return window.ShadowrunSprawlDiscoveryEngine;
  }

  function injectStyles() {
    if (document.getElementById('shadowrun-sprawl-discovery-style')) return;
    const style = document.createElement('style');
    style.id = 'shadowrun-sprawl-discovery-style';
    style.textContent = `
      .sr-discovery-shell{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#0c1015;margin:18px 0 24px}
      .sr-discovery-header{display:flex;justify-content:space-between;gap:16px;align-items:start;padding:18px 20px;border-bottom:1px solid var(--line);background:#111722}
      .sr-discovery-header h2{margin:.1rem 0 .4rem;font-size:1.55rem}
      .sr-discovery-header p{margin:0;color:var(--muted);max-width:860px}
      .sr-discovery-layout{display:grid;grid-template-columns:minmax(320px,390px) minmax(0,1fr) minmax(330px,430px);min-height:720px}
      .sr-discovery-controls,.sr-discovery-detail{padding:14px;overflow:auto;max-height:820px;background:#10151d}
      .sr-discovery-controls{border-right:1px solid var(--line)}.sr-discovery-detail{border-left:1px solid var(--line)}
      .sr-discovery-map-column{display:grid;grid-template-rows:auto minmax(360px,1fr) auto;min-width:0;background:#151922}
      .sr-discovery-map-toolbar{display:grid;grid-template-columns:minmax(200px,1fr) auto;gap:8px;padding:11px;border-bottom:1px solid var(--line)}
      .sr-discovery-map{width:100%;height:100%;min-height:360px;border:0;background:#171c26}
      .sr-discovery-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:9px;padding:12px;border-top:1px solid var(--line);max-height:330px;overflow:auto}
      .sr-discovery-card{width:100%;text-align:left;border:1px solid var(--line);border-left:4px solid #61b6d9;border-radius:10px;padding:10px;background:#111822;color:var(--ink);display:grid;gap:6px;min-height:150px}
      .sr-discovery-card:hover,.sr-discovery-card.active{border-color:var(--accent);background:#1a202b}
      .sr-discovery-card h4{margin:0;color:var(--ink);text-transform:none;letter-spacing:0;font-size:.95rem}
      .sr-discovery-card p{margin:0;color:var(--muted);font-size:.78rem;line-height:1.35}
      .sr-discovery-card[data-category="Corporate"]{border-left-color:#7ba7ff}.sr-discovery-card[data-category="Matrix"]{border-left-color:#6fe2c0}
      .sr-discovery-card[data-category="Awakened"]{border-left-color:#c48af0}.sr-discovery-card[data-category="Security"]{border-left-color:#f0bf5a}
      .sr-discovery-card[data-category="Criminal"],.sr-discovery-card[data-category="Smuggling"]{border-left-color:#e06d6d}
      .sr-discovery-form{display:grid;gap:9px}.sr-discovery-form label,.sr-discovery-detail label{display:grid;gap:5px;color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.06em}
      .sr-discovery-form input,.sr-discovery-form select,.sr-discovery-form textarea,.sr-discovery-map-toolbar input{width:100%;box-sizing:border-box;background:#111722;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .sr-discovery-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sr-discovery-actions{display:grid;gap:8px;margin-top:4px}
      .sr-discovery-status{border:1px solid var(--line);border-radius:9px;padding:9px;background:#0c1118;color:var(--muted);font-size:.8rem;line-height:1.35}
      .sr-discovery-status.error{border-color:#9b3f3f;color:#ffb3b3}.sr-discovery-status.success{border-color:#4c9a75;color:#b9f5dc}
      .sr-discovery-field{border-left:3px solid var(--accent);padding:8px 10px;background:#111722;margin-bottom:8px}
      .sr-discovery-field strong{display:block;margin-bottom:3px}.sr-discovery-field span{color:var(--muted);line-height:1.35}
      .sr-discovery-pills{display:flex;flex-wrap:wrap;gap:5px}.sr-discovery-pill{border:1px solid var(--line);border-radius:999px;padding:3px 7px;color:#dce8f5;background:#ffffff08;font-size:.68rem;font-weight:800;text-transform:uppercase}
      .sr-discovery-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      .sr-discovery-links a{text-decoration:none}
      .sr-discovery-footer{padding:9px 12px;border-top:1px solid var(--line);color:var(--muted);font-size:.78rem}
      @media(max-width:1320px){.sr-discovery-layout{grid-template-columns:minmax(320px,390px) minmax(0,1fr)}.sr-discovery-detail{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);max-height:none}.sr-discovery-list{max-height:440px}}
      @media(max-width:860px){.sr-discovery-layout{grid-template-columns:1fr}.sr-discovery-controls,.sr-discovery-detail{max-height:none;border:0;border-bottom:1px solid var(--line)}.sr-discovery-map-toolbar,.sr-discovery-two,.sr-discovery-links{grid-template-columns:1fr}.sr-discovery-map-column{grid-template-rows:auto 360px auto}}
    `;
    document.head.appendChild(style);
  }

  function focusOptions() {
    return Object.entries(engine().focusProfiles)
      .map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`)
      .join('');
  }

  function threatOptions() {
    return Object.entries(engine().threatProfiles)
      .map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`)
      .join('');
  }

  function buildPanel() {
    const view = document.getElementById('shadowrun');
    if (!view) return false;
    if (document.getElementById('shadowrun-sprawl-discovery-panel')) return true;

    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'shadowrun-sprawl-discovery-panel';
    panel.className = 'sr-discovery-shell no-print';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'sr-discovery-title');
    panel.innerHTML = `
      <header class="sr-discovery-header">
        <div>
          <p class="eyebrow">Shadowrun spatial tool</p>
          <h2 id="sr-discovery-title">Street View Sprawl Discovery</h2>
          <p>Generate nearby Shadowrun-ready sites from one real-world origin. The same seed and coordinates always rebuild the same package.</p>
        </div>
        <button type="button" class="secondary-action" data-sr-discovery-close>Hide</button>
      </header>
      <div class="sr-discovery-layout">
        <aside class="sr-discovery-controls">
          <div class="sr-discovery-form">
            <label>Package seed<input id="sr-discovery-seed" value="${escapeHtml(DEFAULT_INPUT.seed)}"></label>
            <label>Origin label<input id="sr-discovery-label" value="${escapeHtml(DEFAULT_INPUT.label)}"></label>
            <label>Maps or Street View URL<textarea id="sr-discovery-url" rows="3" placeholder="Paste a Google Maps or Street View link"></textarea></label>
            <button type="button" class="secondary-action" data-sr-discovery-read-link>Read Coordinates from Link</button>
            <div class="sr-discovery-two">
              <label>Latitude<input id="sr-discovery-lat" type="number" step="0.000001" value="${DEFAULT_INPUT.lat}"></label>
              <label>Longitude<input id="sr-discovery-lng" type="number" step="0.000001" value="${DEFAULT_INPUT.lng}"></label>
            </div>
            <div class="sr-discovery-two">
              <label>Radius meters<input id="sr-discovery-radius" type="number" min="120" max="5000" step="10" value="${DEFAULT_INPUT.radiusMeters}"></label>
              <label>Site count<input id="sr-discovery-count" type="number" min="1" max="18" step="1" value="${DEFAULT_INPUT.count}"></label>
            </div>
            <label>Discovery focus<select id="sr-discovery-focus">${focusOptions()}</select></label>
            <label>Threat profile<select id="sr-discovery-threat">${threatOptions()}</select></label>
            <div class="sr-discovery-actions">
              <button type="button" class="primary-action" data-sr-discovery-generate>Generate Nearby Sites</button>
              <button type="button" class="secondary-action" data-sr-discovery-use-browser>Use Browser Location</button>
            </div>
            <div id="sr-discovery-status" class="sr-discovery-status" role="status" aria-live="polite">Ready.</div>
            <div class="sr-discovery-actions">
              <button type="button" class="secondary-action" data-sr-discovery-copy disabled>Copy JSON</button>
              <button type="button" class="secondary-action" data-sr-discovery-download-json disabled>Download JSON</button>
              <button type="button" class="secondary-action" data-sr-discovery-download-geojson disabled>Download GeoJSON</button>
              <button type="button" class="secondary-action" data-sr-discovery-download-kml disabled>Download KML</button>
            </div>
          </div>
        </aside>
        <section class="sr-discovery-map-column">
          <div class="sr-discovery-map-toolbar">
            <input id="sr-discovery-map-query" type="search" value="${escapeHtml(DEFAULT_INPUT.label)}" aria-label="Map query">
            <button type="button" class="secondary-action" data-sr-discovery-open-map>Open Maps</button>
          </div>
          <iframe id="sr-discovery-map" class="sr-discovery-map" title="Shadowrun discovery map preview" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          <div id="sr-discovery-list" class="sr-discovery-list"></div>
          <div class="sr-discovery-footer">Outbound map links are convenience links; generation itself is local and deterministic.</div>
        </section>
        <aside id="sr-discovery-detail" class="sr-discovery-detail">
          <section class="sr-discovery-status">No site selected.</section>
        </aside>
      </div>`;

    const controls = view.querySelector('.setting-workspace-controls');
    if (controls) controls.before(panel);
    else view.appendChild(panel);
    bindPanel(panel);
    restore();
    updateMap(DEFAULT_INPUT.lat, DEFAULT_INPUT.lng);
    return true;
  }

  function bindPanel(panel) {
    panel.querySelector('[data-sr-discovery-close]').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelector('[data-sr-discovery-generate]').addEventListener('click', generate);
    panel.querySelector('[data-sr-discovery-read-link]').addEventListener('click', readCoordinatesFromLink);
    panel.querySelector('[data-sr-discovery-use-browser]').addEventListener('click', useBrowserLocation);
    panel.querySelector('[data-sr-discovery-copy]').addEventListener('click', copyJson);
    panel.querySelector('[data-sr-discovery-download-json]').addEventListener('click', () => downloadJson('json'));
    panel.querySelector('[data-sr-discovery-download-geojson]').addEventListener('click', () => downloadJson('geojson'));
    panel.querySelector('[data-sr-discovery-download-kml]').addEventListener('click', () => downloadJson('kml'));
    panel.querySelector('[data-sr-discovery-open-map]').addEventListener('click', openMap);
    panel.querySelector('#sr-discovery-map-query').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        openMap();
      }
    });
    panel.querySelector('#sr-discovery-list').addEventListener('click', event => {
      const card = event.target.closest('[data-sr-site-key]');
      if (card) selectSite(card.dataset.srSiteKey);
    });
  }

  function currentInput() {
    return {
      seed: document.getElementById('sr-discovery-seed').value.trim(),
      label: document.getElementById('sr-discovery-label').value.trim(),
      lat: Number(document.getElementById('sr-discovery-lat').value),
      lng: Number(document.getElementById('sr-discovery-lng').value),
      radiusMeters: Number(document.getElementById('sr-discovery-radius').value),
      count: Number(document.getElementById('sr-discovery-count').value),
      focus: document.getElementById('sr-discovery-focus').value,
      threat: document.getElementById('sr-discovery-threat').value
    };
  }

  function writeStatus(message, type = '') {
    const target = document.getElementById('sr-discovery-status');
    if (!target) return;
    target.textContent = message;
    target.className = `sr-discovery-status ${type}`.trim();
  }

  function generate() {
    try {
      state.currentPackage = engine().generateSprawlDiscovery(currentInput());
      state.selectedSiteKey = state.currentPackage.sites[0]?.siteKey || null;
      persist();
      renderPackage();
      const first = state.currentPackage.sites[0];
      if (first) updateMap(first.coordinates.lat, first.coordinates.lng);
      writeStatus(`${state.currentPackage.summary.siteCount} nearby sites generated. Package ${state.currentPackage.packageKey}.`, 'success');
      setExportState(false);
    } catch (error) {
      writeStatus(error.message, 'error');
    }
  }

  function setExportState(disabled) {
    document.querySelectorAll('[data-sr-discovery-copy], [data-sr-discovery-download-json], [data-sr-discovery-download-geojson], [data-sr-discovery-download-kml]')
      .forEach(button => { button.disabled = disabled; });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        input: currentInput(),
        currentPackage: state.currentPackage,
        selectedSiteKey: state.selectedSiteKey
      }));
    } catch (_) {
      // Optional browser storage must not block use.
    }
  }

  function restore() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored) return;
      const input = stored.input || {};
      const values = {
        'sr-discovery-seed': input.seed,
        'sr-discovery-label': input.label,
        'sr-discovery-lat': input.lat,
        'sr-discovery-lng': input.lng,
        'sr-discovery-radius': input.radiusMeters,
        'sr-discovery-count': input.count,
        'sr-discovery-focus': input.focus,
        'sr-discovery-threat': input.threat
      };
      for (const [id, value] of Object.entries(values)) {
        const element = document.getElementById(id);
        if (element && value != null) element.value = value;
      }
      if (stored.currentPackage) {
        state.currentPackage = stored.currentPackage;
        state.selectedSiteKey = stored.selectedSiteKey || stored.currentPackage.sites?.[0]?.siteKey || null;
        renderPackage();
        setExportState(false);
      }
    } catch (_) {
      // Bad storage should not block a fresh package.
    }
  }

  function readCoordinatesFromLink() {
    const link = document.getElementById('sr-discovery-url').value.trim();
    const coordinates = engine().parseCoordinates(link);
    if (!coordinates) {
      writeStatus('No coordinates were found in that link.', 'error');
      return;
    }
    document.getElementById('sr-discovery-lat').value = coordinates.lat.toFixed(6);
    document.getElementById('sr-discovery-lng').value = coordinates.lng.toFixed(6);
    document.getElementById('sr-discovery-map-query').value = `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(6)}`;
    updateMap(coordinates.lat, coordinates.lng);
    writeStatus('Coordinates loaded from the map link.', 'success');
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      writeStatus('Browser geolocation is unavailable.', 'error');
      return;
    }
    writeStatus('Requesting browser location.');
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      document.getElementById('sr-discovery-lat').value = lat.toFixed(6);
      document.getElementById('sr-discovery-lng').value = lng.toFixed(6);
      document.getElementById('sr-discovery-label').value = `Browser location ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      document.getElementById('sr-discovery-map-query').value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      updateMap(lat, lng);
      writeStatus('Browser coordinates loaded.', 'success');
    }, error => writeStatus(`Browser location failed: ${error.message || 'permission denied'}.`, 'error'), {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    });
  }

  function renderPackage() {
    const list = document.getElementById('sr-discovery-list');
    if (!list || !state.currentPackage) return;
    list.innerHTML = state.currentPackage.sites.map(site => `
      <button type="button" class="sr-discovery-card ${site.siteKey === state.selectedSiteKey ? 'active' : ''}" data-sr-site-key="${escapeHtml(site.siteKey)}" data-category="${escapeHtml(site.category)}">
        <div class="sr-discovery-pills">
          <span class="sr-discovery-pill">${escapeHtml(site.category)}</span>
          <span class="sr-discovery-pill">${escapeHtml(site.distanceMeters)} m</span>
        </div>
        <h4>${escapeHtml(site.name)}</h4>
        <p>${escapeHtml(site.shadowUse)}</p>
        <p>${escapeHtml(site.complication)}</p>
      </button>
    `).join('');
    renderDetail(selectedSite());
  }

  function selectedSite() {
    if (!state.currentPackage) return null;
    return state.currentPackage.sites.find(site => site.siteKey === state.selectedSiteKey)
      || state.currentPackage.sites[0]
      || null;
  }

  function field(label, value) {
    return `<div class="sr-discovery-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
  }

  function renderDetail(site) {
    const target = document.getElementById('sr-discovery-detail');
    if (!target) return;
    if (!site || !state.currentPackage) {
      target.innerHTML = '<section class="sr-discovery-status">No site selected.</section>';
      return;
    }
    const related = (site.relatedSites || []).map(item => `${item.name} (${item.reason})`).join('; ');
    target.innerHTML = `
      <p class="eyebrow">Selected site</p>
      <h3>${escapeHtml(site.name)}</h3>
      <div class="sr-discovery-pills">
        <span class="sr-discovery-pill">${escapeHtml(site.siteKey)}</span>
        <span class="sr-discovery-pill">${escapeHtml(state.currentPackage.focusLabel)}</span>
        <span class="sr-discovery-pill">${escapeHtml(state.currentPackage.threatLabel)}</span>
      </div>
      ${field('Public facade', site.publicFacade)}
      ${field('Shadow use', site.shadowUse)}
      ${field('Access vector', site.accessVector)}
      ${field('Security posture', site.security)}
      ${field('Matrix surface', site.matrix)}
      ${field('Magical surface', site.magical)}
      ${field('Clues', site.clues.join(' | '))}
      ${field('Complication', site.complication)}
      ${field('Legwork', site.legwork.join(' | '))}
      ${field('Related nearby sites', related || 'No nearby relation generated.')}
      ${field('Coordinates', `${site.coordinates.lat}, ${site.coordinates.lng}`)}
      <div class="sr-discovery-links">
        <a class="primary-action" target="_blank" rel="noopener" href="${escapeHtml(site.mapsUrl)}">Open Maps</a>
        <a class="secondary-action" target="_blank" rel="noopener" href="${escapeHtml(site.streetViewUrl)}">Open Street View</a>
      </div>`;
  }

  function selectSite(siteKey) {
    state.selectedSiteKey = siteKey;
    persist();
    renderPackage();
    const site = selectedSite();
    if (site) updateMap(site.coordinates.lat, site.coordinates.lng);
  }

  function updateMap(lat, lng) {
    const frame = document.getElementById('sr-discovery-map');
    if (!frame) return;
    frame.src = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=17&output=embed`;
  }

  function openMap() {
    const query = document.getElementById('sr-discovery-map-query')?.value.trim()
      || `${document.getElementById('sr-discovery-lat').value},${document.getElementById('sr-discovery-lng').value}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener');
  }

  async function copyJson() {
    if (!state.currentPackage) return;
    const text = JSON.stringify(state.currentPackage, null, 2);
    try {
      await navigator.clipboard?.writeText(text);
      writeStatus('Discovery package copied as JSON.', 'success');
    } catch (_) {
      writeStatus('Clipboard access was not available; use the download controls instead.', 'error');
    }
  }

  function safeFileName(value) {
    return String(value || 'shadowrun-sprawl-discovery').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
  }

  function download(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(kind) {
    if (!state.currentPackage) return;
    const base = safeFileName(state.currentPackage.packageKey);
    if (kind === 'geojson') {
      download(`${base}.geojson`, 'application/geo+json', JSON.stringify(engine().buildGeoJson(state.currentPackage), null, 2));
      return;
    }
    if (kind === 'kml') {
      download(`${base}.kml`, 'application/vnd.google-earth.kml+xml', engine().buildKml(state.currentPackage));
      return;
    }
    download(`${base}.json`, 'application/json', JSON.stringify(state.currentPackage, null, 2));
  }

  function openPanel() {
    if (!buildPanel()) throw new Error('The Shadowrun workspace is not ready yet.');
    const panel = document.getElementById('shadowrun-sprawl-discovery-panel');
    panel.hidden = false;
    if (!state.currentPackage) generate();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return state.currentPackage;
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    buildPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.ShadowrunSprawlDiscovery = Object.freeze({
    openPanel,
    generate,
    getCurrentPackage: () => state.currentPackage,
    getSelectedSite: selectedSite
  });
})();
