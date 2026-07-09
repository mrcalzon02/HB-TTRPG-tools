(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('source') !== 'mission-opposition') return;

  const handoff = {
    opposition: params.get('opposition') || 'Mission opposition',
    client: params.get('client') || 'Unknown client',
    caseCode: params.get('case') || 'Uncoded case',
    rivalry: params.get('rivalry') || '',
    category: params.get('category') || 'random',
    role: params.get('role') || 'rival',
    environment: params.get('environment') || 'random',
    power: params.get('power') || 'random',
    seed: params.get('seed') || ''
  };

  function setWhenPresent(select, value) {
    if (!select || !value) return;
    const wanted = String(value);
    if ([...select.options].some(option => option.value === wanted)) select.value = wanted;
  }

  function controlsReady() {
    const category = document.getElementById('npc-category');
    const role = document.getElementById('npc-role');
    const environment = document.getElementById('npc-environment');
    const power = document.getElementById('npc-power');
    const generate = document.getElementById('npc-generate');
    return category && role && environment && power && generate && category.options.length > 1 && role.options.length > 1 && environment.options.length > 1 && power.options.length > 1;
  }

  function injectStyles() {
    if (document.getElementById('blacklight-npc-handoff-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-npc-handoff-style';
    style.textContent = `
      .npc-handoff-panel{border:1px solid rgba(217,168,79,.35);border-radius:20px;background:linear-gradient(135deg,rgba(18,16,13,.96),rgba(4,4,4,.98));box-shadow:0 18px 44px rgba(0,0,0,.32);padding:16px;margin:0 0 18px;display:grid;gap:10px}.npc-handoff-panel h2{margin:0;color:#f4efe5}.npc-handoff-panel p{margin:0;color:#bdb4a4;line-height:1.55}.npc-handoff-panel strong{color:#d9a84f}.npc-handoff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.npc-handoff-chip{border:1px solid rgba(217,168,79,.2);border-radius:14px;background:rgba(0,0,0,.2);padding:10px}.npc-handoff-chip span{display:block;color:#d9a84f;text-transform:uppercase;letter-spacing:.08em;font-size:.7rem;font-weight:900;margin-bottom:4px}.npc-handoff-chip b{color:#f4efe5;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function installHandoffPanel() {
    if (document.getElementById('npc-handoff-panel')) return;
    const controls = document.querySelector('.npc-controls') || document.querySelector('.npc-shell') || document.body;
    const panel = document.createElement('section');
    panel.id = 'npc-handoff-panel';
    panel.className = 'npc-handoff-panel no-print';
    panel.innerHTML = `
      <div>
        <p class="eyebrow">Mission opposition handoff</p>
        <h2>Generating entity profile for ${escapeHtml(handoff.opposition)}.</h2>
        <p>This entity was opened from the mission generator so the rival faction can become a usable Blacklight bestiary/entity profile instead of remaining only a mission label.</p>
      </div>
      <div class="npc-handoff-grid">
        <div class="npc-handoff-chip"><span>Case</span><b>${escapeHtml(handoff.caseCode)}</b></div>
        <div class="npc-handoff-chip"><span>Client</span><b>${escapeHtml(handoff.client)}</b></div>
        <div class="npc-handoff-chip"><span>Opposition</span><b>${escapeHtml(handoff.opposition)}</b></div>
        <div class="npc-handoff-chip"><span>Rivalry</span><b>${escapeHtml(handoff.rivalry || 'Rivalry pressure carried from mission generator.')}</b></div>
      </div>
    `;
    controls.insertAdjacentElement('beforebegin', panel);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function applyHandoff() {
    if (!controlsReady()) return false;
    const category = document.getElementById('npc-category');
    const role = document.getElementById('npc-role');
    const environment = document.getElementById('npc-environment');
    const power = document.getElementById('npc-power');
    const seed = document.getElementById('npc-seed');
    const generate = document.getElementById('npc-generate');

    setWhenPresent(category, handoff.category);
    setWhenPresent(role, handoff.role);
    setWhenPresent(environment, handoff.environment);
    setWhenPresent(power, handoff.power);
    if (seed && handoff.seed) seed.value = handoff.seed;

    injectStyles();
    installHandoffPanel();
    generate.click();
    return true;
  }

  function waitAndApply() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (applyHandoff() || attempts > 80) window.clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitAndApply, { once: true });
  else waitAndApply();
})();
