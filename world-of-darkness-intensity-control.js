(() => {
  'use strict';

  const STORAGE_KEY = 'hb-wod-supernatural-intensity-v1';
  const GAME_LINES = new Set(['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);
  const state = { installed: false, values: {}, refreshTimer: 0, annotationFrame: 0 };
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function clamp(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
  }

  function formatPercent(value) {
    const number = clamp(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function readValues() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeValues() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.values));
      return true;
    } catch (_) {
      return false;
    }
  }

  function activeLine() {
    const value = document.getElementById('wod-spatial-line')?.value || 'unified';
    return GAME_LINES.has(value) ? value : 'unified';
  }

  function defaultFor(line = activeLine()) {
    const api = window.WODDetailDiversityCore;
    const counts = api?.statusProfile?.(line) || (line === 'unified' ? [5, 8, 5, 3] : [12, 6, 2, 1]);
    const total = counts.reduce((sum, count) => sum + Number(count || 0), 0) || 1;
    const supernatural = counts.slice(1).reduce((sum, count) => sum + Number(count || 0), 0);
    return Number((supernatural / total * 100).toFixed(2));
  }

  function getValue(line = activeLine()) {
    const stored = Number(state.values[line]);
    return Number.isFinite(stored) ? clamp(stored) : defaultFor(line);
  }

  function setValue(line, value, persist = true) {
    const resolvedLine = GAME_LINES.has(line) ? line : activeLine();
    state.values[resolvedLine] = clamp(value);
    if (persist) writeValues();
    syncControl(resolvedLine);
    return state.values[resolvedLine];
  }

  function intensityStatus(seed, line = activeLine(), intensity = getValue(line)) {
    const api = window.WODDetailDiversityCore;
    const resolvedLine = GAME_LINES.has(line) ? line : activeLine();
    const percent = clamp(intensity);
    const profileDefault = defaultFor(resolvedLine);
    if (Math.abs(percent - profileDefault) < 0.005) {
      return api.__originalInventoryStatusFromSeed(seed, resolvedLine);
    }
    if (percent <= 0) return 'MUNDANE';
    const occurrenceRoll = api.hash32(`${Number(seed) >>> 0}|${resolvedLine}|supernatural-occurrence-v1`) % 1000000 / 10000;
    if (occurrenceRoll >= percent) return 'MUNDANE';
    const counts = api.statusProfile(resolvedLine).slice(1).map(value => Math.max(0, Number(value || 0)));
    const statuses = ['TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'];
    const total = counts.reduce((sum, count) => sum + count, 0) || 1;
    const slot = api.hash32(`${Number(seed) >>> 0}|${resolvedLine}|supernatural-status-v1`) % total;
    let cursor = 0;
    for (let index = 0; index < statuses.length; index += 1) {
      cursor += counts[index];
      if (slot < cursor) return statuses[index];
    }
    return 'TANGENTIAL';
  }

  function wrapCore() {
    const original = window.WODDetailDiversityCore;
    if (!original || original.__intensityWrapped) return Boolean(original);
    const wrapped = {
      ...original,
      __intensityWrapped: true,
      __originalInventoryStatusFromSeed: original.inventoryStatusFromSeed.bind(original),
      inventoryStatusFromSeed(seed, line = activeLine(), intensity = getValue(line)) {
        return intensityStatus(seed, line, intensity);
      },
      supernaturalIntensityDefault: defaultFor,
      supernaturalIntensityStatus: intensityStatus
    };
    window.WODDetailDiversityCore = Object.freeze(wrapped);
    return true;
  }

  function injectStyles() {
    if (document.getElementById('wod-intensity-control-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-intensity-control-style';
    style.textContent = `
      .wod-intensity-control{display:grid;gap:6px;margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#10131a}
      .wod-intensity-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;color:var(--ink);font-size:.8rem;font-weight:800}
      .wod-intensity-output{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent);font-size:.9rem}
      .wod-intensity-control input[type="range"]{width:100%;padding:0;accent-color:var(--accent)}
      .wod-intensity-note{color:var(--muted);font-size:.72rem;line-height:1.35}
    `;
    document.head.appendChild(style);
  }

  function buildControl() {
    const line = document.getElementById('wod-spatial-line');
    const card = line?.closest('.wod-inventory-card,.wod-fast-card,.wod-pane-card');
    if (!line || !card) return false;
    if (document.getElementById('wod-supernatural-intensity')) return true;
    injectStyles();
    const control = document.createElement('div');
    control.className = 'wod-intensity-control';
    control.innerHTML = `
      <div class="wod-intensity-heading"><span>Supernatural occurrence frequency</span><output id="wod-supernatural-intensity-output" class="wod-intensity-output"></output></div>
      <input id="wod-supernatural-intensity" type="range" min="0" max="100" step="0.01" aria-label="Supernatural occurrence frequency percentage">
      <div id="wod-supernatural-intensity-note" class="wod-intensity-note"></div>`;
    card.appendChild(control);
    const slider = control.querySelector('#wod-supernatural-intensity');
    slider.addEventListener('input', () => updateOutput(slider.value));
    slider.addEventListener('change', () => {
      setValue(activeLine(), slider.value);
      scheduleRegeneration();
    });
    line.addEventListener('change', event => {
      if (event.detail?.wodIntensityOnly) return;
      syncControl(activeLine());
    }, true);
    syncControl(activeLine());
    return true;
  }

  function updateOutput(value = getValue()) {
    const output = document.getElementById('wod-supernatural-intensity-output');
    const note = document.getElementById('wod-supernatural-intensity-note');
    if (output) output.textContent = `${formatPercent(value)}%`;
    if (note) note.textContent = `Profile default: ${formatPercent(defaultFor(activeLine()))}%. This controls how often generated locations contain a supernatural or supernatural-adjacent occurrence.`;
    scheduleSelectedRecordAnnotation();
  }

  function syncControl(line = activeLine()) {
    const slider = document.getElementById('wod-supernatural-intensity');
    if (!slider) return;
    const value = getValue(line);
    slider.value = String(value);
    updateOutput(value);
  }

  function scheduleRegeneration() {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => {
      const line = document.getElementById('wod-spatial-line');
      line?.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { wodIntensityOnly: true } }));
      document.dispatchEvent(new CustomEvent('wod:supernatural-intensity-changed', {
        detail: { line: activeLine(), percent: getValue() }
      }));
    }, 180);
  }

  function scheduleSelectedRecordAnnotation() {
    if (state.annotationFrame) return;
    const schedule = window.requestAnimationFrame || (callback => window.setTimeout(callback, 0));
    state.annotationFrame = schedule(() => {
      state.annotationFrame = 0;
      annotateSelectedRecord();
    });
  }

  function annotateSelectedRecord() {
    const grid = document.querySelector('#wod-display-matrix .wod-inventory-grid');
    if (!grid) return;
    let field = grid.querySelector('[data-wod-intensity-field]');
    if (!field) {
      field = document.createElement('div');
      field.className = 'wod-inventory-field';
      field.dataset.wodIntensityField = 'true';
      const label = document.createElement('strong');
      label.textContent = 'Supernatural occurrence frequency';
      const value = document.createElement('span');
      value.dataset.wodIntensityValue = 'true';
      field.append(label, value);
      grid.prepend(field);
    }
    const value = field.querySelector('[data-wod-intensity-value]');
    const nextText = `${formatPercent(getValue())}% for the ${activeLine()} profile`;
    if (value && value.textContent !== nextText) value.textContent = nextText;
  }

  function handleSelectionEvent(event) {
    if (event.detail?.record) {
      event.detail.record.supernaturalIntensityPercent = getValue();
      event.detail.record.supernaturalIntensityProfile = activeLine();
    }
    scheduleSelectedRecordAnnotation();
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    state.values = readValues();
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (wrapCore() && buildControl()) return;
      await wait(50);
    }
  }

  document.addEventListener('wod:radial-location-selected', handleSelectionEvent, true);
  document.addEventListener('wod:spatial-map-ready', () => { void install(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.WODSupernaturalIntensity = Object.freeze({
    defaults: Object.freeze({
      unified: 76.19,
      vampire: 42.86,
      werewolf: 42.86,
      breeds: 42.86,
      hunter: 42.86,
      changeling: 42.86,
      mage: 42.86
    }),
    getValue,
    setValue,
    defaultFor,
    inventoryStatusFromSeed: intensityStatus
  });
})();
