(() => {
  'use strict';

  const DATA_URL = 'data/blacklight-continuum/rules/archetype-transition-profiles.json';
  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
  let transitionData = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function injectStyles() {
    if (document.getElementById('blacklight-transition-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-transition-style';
    style.textContent = `
      .blacklight-transition-profile{display:grid;gap:14px}
      .blacklight-transition-hero{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:linear-gradient(120deg,rgba(89,42,122,.16),rgba(200,138,53,.08))}
      .blacklight-transition-hero h3{margin:0 0 6px}.blacklight-transition-hero p{color:var(--muted);line-height:1.55}
      .blacklight-transition-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .blacklight-transition-box{border:1px solid var(--line);border-radius:14px;padding:13px;background:rgba(255,255,255,.025)}
      .blacklight-transition-box h3,.blacklight-transition-box h4{margin:0 0 8px;color:var(--accent)}
      .blacklight-transition-box p,.blacklight-transition-box li{color:var(--muted);line-height:1.5}
      .blacklight-transition-box ul{margin:0;padding-left:19px}
      .blacklight-derivative-grid{display:grid;gap:10px}
      .blacklight-derivative{border-left:3px solid var(--accent);padding:11px 12px;background:rgba(200,138,53,.07)}
      .blacklight-derivative h4{margin:0 0 7px}.blacklight-derivative p{margin:6px 0;color:var(--muted);line-height:1.48}
      .blacklight-stage-track{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
      .blacklight-stage{border:1px solid var(--line);border-radius:11px;padding:9px;background:rgba(255,255,255,.025)}
      .blacklight-stage strong{display:block;color:var(--accent);font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
      .blacklight-stage span{color:var(--muted);font-size:.82rem;line-height:1.35}
      .blacklight-transition-rules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .blacklight-transition-rules article{border:1px solid var(--line);border-radius:12px;padding:11px;background:rgba(255,255,255,.025)}
      .blacklight-transition-rules h4{margin:0 0 6px;color:var(--accent)}
      .blacklight-transition-rules p{margin:0;color:var(--muted);line-height:1.45;font-size:.88rem}
      @media(max-width:900px){.blacklight-transition-columns,.blacklight-transition-rules{grid-template-columns:1fr}.blacklight-stage-track{grid-template-columns:1fr}}
      @media print{.blacklight-transition-hero,.blacklight-transition-box,.blacklight-derivative,.blacklight-stage,.blacklight-transition-rules article{background:#fff!important;border-color:#555!important}.blacklight-transition-hero p,.blacklight-transition-box p,.blacklight-transition-box li,.blacklight-derivative p,.blacklight-stage span,.blacklight-transition-rules p{color:#222!important}.blacklight-transition-box h3,.blacklight-transition-box h4,.blacklight-derivative h4,.blacklight-stage strong,.blacklight-transition-rules h4{color:#000!important}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = document.getElementById('blacklight-transition-panel');
    if (panel) return panel;
    const archetypePanel = document.querySelector('.blacklight-archetype-panel');
    if (!archetypePanel) return null;

    panel = document.createElement('section');
    panel.id = 'blacklight-transition-panel';
    panel.className = 'blacklight-sheet-panel';
    panel.innerHTML = `
      <div class="blacklight-section-heading">
        <div><p class="eyebrow">Old world to Continuum</p><h2>Archetype Translation and Adaptation</h2></div>
        <span class="blacklight-panel-code">TRANSITION</span>
      </div>
      <div id="blacklight-transition-profile" class="blacklight-transition-profile">
        <p class="helper-note">Select an archetype to load its old-world identity, printed interpretation, losses, memory fractures, power derivatives, and five-stage adaptation path.</p>
      </div>
      <div class="blacklight-field-grid blacklight-grid-2">
        <label>Old-World Identity<textarea name="oldWorldIdentity" rows="4" placeholder="Who were you, and what did this Archetype mean before Q-MAP?"></textarea></label>
        <label>Old Rule That No Longer Holds<textarea name="brokenOldRule" rows="4" placeholder="Which certainty about your condition has already failed here?"></textarea></label>
        <label>First Translation Scar<textarea name="firstTranslationScar" rows="4" placeholder="What did the body do wrong the first time an old power returned?"></textarea></label>
        <label>Current Continuum Derivative<textarea name="currentDerivative" rows="4" placeholder="How has one power changed into something native to the new body and universe?"></textarea></label>
        <label>Fragmented Legacy Memory<textarea name="legacyMemoryFragment" rows="4" placeholder="What old-world memory guides a power even though its context is missing?"></textarea></label>
        <label>Adaptation Marks and Discoveries<textarea name="adaptationMarks" rows="4" placeholder="Record family marks, local couplings, new tells, replaced limitations, and derivative traits."></textarea></label>
      </div>`;

    archetypePanel.insertAdjacentElement('afterend', panel);
    restoreInjectedFields(panel);
    return panel;
  }

  function restoreInjectedFields(panel) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const fields = data?.fields || {};
      panel.querySelectorAll('[name]').forEach(field => {
        if (Object.prototype.hasOwnProperty.call(fields, field.name)) field.value = fields[field.name] ?? '';
      });
    } catch (_) {
      // The main sheet owns persistence; this restoration only covers fields injected after its initial load.
    }
  }

  function list(items) {
    return `<ul>${(items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function renderUniversal(target) {
    const universal = transitionData?.universalTransition;
    if (!universal) return;
    target.innerHTML = `
      <div class="blacklight-transition-hero">
        <h3>Power Does Not Arrive Intact</h3>
        <p>${escapeHtml(universal.premise)}</p>
      </div>
      <div class="blacklight-transition-rules">
        <article><h4>Translation Test</h4><p><strong>${escapeHtml(universal.translationTest.pool)}</strong>. Difficulty 2 for ranks 1–2, 3 for ranks 3–4, and 4 for rank 5.</p></article>
        <article><h4>Memory Echo</h4><p>${escapeHtml(universal.memoryEcho)}</p></article>
        <article><h4>Translation Scar</h4><p>${escapeHtml(universal.translationTest.complication)}</p></article>
      </div>
      <div class="blacklight-stage-track">${(universal.adaptationStages || []).map(stage => `<div class="blacklight-stage"><strong>Rating ${escapeHtml(stage.rating)} · ${escapeHtml(stage.name)}</strong><span>${escapeHtml(stage.meaning)}</span></div>`).join('')}</div>
      <p class="helper-note">Select an archetype above to load the specific old-world and printed-body transition profile.</p>`;
  }

  function renderProfile() {
    const target = document.getElementById('blacklight-transition-profile');
    const archetypeId = document.getElementById('blacklight-archetype')?.value;
    if (!target || !transitionData) return;
    const profile = transitionData.profiles?.find(item => item.archetypeId === archetypeId);
    if (!profile) {
      renderUniversal(target);
      return;
    }

    const universalStages = transitionData.universalTransition?.adaptationStages || [];
    target.innerHTML = `
      <div class="blacklight-transition-hero">
        <p class="eyebrow">${escapeHtml(profile.name)} transition</p>
        <h3>${escapeHtml(profile.transitionTitle)}</h3>
        ${(profile.newWorldExpression || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      <div class="blacklight-transition-columns">
        <article class="blacklight-transition-box"><h3>What You Were</h3>${(profile.oldWorldIdentity || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</article>
        <article class="blacklight-transition-box"><h3>What Q-MAP Preserved</h3>${list(profile.qmapCaptured)}</article>
        <article class="blacklight-transition-box"><h3>What the Printer Built</h3>${(profile.printerInterpretation || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</article>
        <article class="blacklight-transition-box"><h3>What Was Lost</h3>${list(profile.whatWasLost)}</article>
      </div>
      <article class="blacklight-transition-box">
        <h3>Power Family Derivatives</h3>
        <div class="blacklight-derivative-grid">${(profile.powerDerivatives || []).map(derivative => `
          <section class="blacklight-derivative">
            <h4>${escapeHtml(derivative.family)}</h4>
            <p><strong>Old world:</strong> ${escapeHtml(derivative.oldWorld)}</p>
            <p><strong>Printed translation:</strong> ${escapeHtml(derivative.printedTranslation)}</p>
            <p><strong>Continuum derivative:</strong> ${escapeHtml(derivative.continuumDerivative)}</p>
            <p><strong>Failure signs:</strong> ${(derivative.failureSigns || []).map(escapeHtml).join(' · ')}</p>
          </section>`).join('')}</div>
      </article>
      <div class="blacklight-transition-columns">
        <article class="blacklight-transition-box"><h3>Fragmented Memory Prompts</h3>${list(profile.memoryFractures)}</article>
        <article class="blacklight-transition-box"><h3>Character Questions</h3>${list(profile.characterQuestions)}</article>
      </div>
      <article class="blacklight-transition-box">
        <h3>Five-Stage Adaptation Path</h3>
        <div class="blacklight-stage-track">${(profile.stageNames || []).map((stageName, index) => {
          const universal = universalStages[index] || {};
          return `<div class="blacklight-stage"><strong>Rating ${index + 1} · ${escapeHtml(stageName)}</strong><span>${escapeHtml(universal.meaning || '')}</span></div>`;
        }).join('')}</div>
      </article>`;
  }

  async function initialize() {
    injectStyles();
    const panel = ensurePanel();
    if (!panel) return;

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Transition profile request failed with status ${response.status}.`);
      transitionData = await response.json();
      renderProfile();

      const select = document.getElementById('blacklight-archetype');
      select?.addEventListener('change', () => renderProfile());
      document.addEventListener('change', event => {
        if (event.target?.id === 'blacklight-archetype') renderProfile();
      });
    } catch (error) {
      const target = document.getElementById('blacklight-transition-profile');
      if (target) target.innerHTML = `<p class="helper-note">Transition profiles could not be loaded: ${escapeHtml(error.message)}</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();