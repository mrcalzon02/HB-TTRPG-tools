(() => {
  'use strict';

  const COSTS = {
    skill: 2,
    attribute: 3,
    ability: 4
  };

  function number(form, name) {
    const value = Number(form?.elements[name]?.value || 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function installStyles() {
    if (document.getElementById('blacklight-experience-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-experience-style';
    style.textContent = `
      .blacklight-experience-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}
      .blacklight-experience-calculation{margin-top:13px;padding:12px;border:1px solid rgba(200,138,53,.32);border-radius:14px;background:rgba(200,138,53,.07)}
      .blacklight-experience-calculation p{margin:4px 0;color:var(--muted);line-height:1.45}
      .blacklight-experience-calculation strong{color:var(--ink)}
      .blacklight-experience-negative{color:var(--blacklight-danger)!important;font-weight:900}
      .blacklight-experience-rates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}
      .blacklight-experience-rate{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--blacklight-panel-soft);color:var(--muted);line-height:1.45}
      .blacklight-experience-rate strong{display:block;color:var(--accent);font-size:1.05rem}
      @media(max-width:1120px){.blacklight-experience-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:820px){.blacklight-experience-grid,.blacklight-experience-rates{grid-template-columns:1fr}}
      @media print{.blacklight-experience-calculation,.blacklight-experience-rate{background:#fff!important;border-color:#555!important;color:#222!important}.blacklight-experience-calculation p,.blacklight-experience-rate{color:#222!important}}
    `;
    document.head.appendChild(style);
  }

  function panelMarkup() {
    return `
      <div class="blacklight-section-heading">
        <div><p class="eyebrow">Session rewards and advancement exchange</p><h2>Experience and Advancement</h2></div>
        <span class="blacklight-panel-code">XP</span>
      </div>
      <p class="helper-note">A participating character should normally receive at least 1 Experience for a completed session. Each qualifying character may receive 1 additional Experience from each qualifying scene. Several different scenes may award Experience during the same session.</p>
      <div class="blacklight-experience-rates">
        <div class="blacklight-experience-rate"><strong>2 XP → 1 Skill Point</strong>Increase one Skill by 1, maximum 5.</div>
        <div class="blacklight-experience-rate"><strong>3 XP → 1 Attribute Point</strong>Increase one Attribute by 1, maximum 5, then recalculate affected traits.</div>
        <div class="blacklight-experience-rate"><strong>4 XP → 1 Ability Point</strong>Purchase one eligible power, rank, Depth, attainment, practice ability, lineage ability, or other one-point ability.</div>
      </div>
      <div class="blacklight-experience-grid">
        <label>Lifetime Experience Earned<input name="experienceLifetime" type="number" min="0" value="0"></label>
        <label>Current Unspent Experience<input name="experienceCurrent" type="number" min="0" value="0"></label>
        <label>Session Baseline Experience<input name="sessionBaseExperience" type="number" min="0" value="1"></label>
        <label>Session Scene-Bonus Experience<input name="sessionBonusExperience" type="number" min="0" value="0"></label>
        <label>Session Experience Total<input id="blacklight-session-experience-total" name="sessionExperienceTotal" readonly></label>
        <label>Planned Skill Points<input name="plannedSkillPoints" type="number" min="0" value="0"></label>
        <label>Planned Attribute Points<input name="plannedAttributePoints" type="number" min="0" value="0"></label>
        <label>Planned Power / Ability Points<input name="plannedAbilityPoints" type="number" min="0" value="0"></label>
        <label>Planned Experience Cost<input id="blacklight-planned-experience-cost" name="plannedExperienceCost" readonly></label>
        <label>Experience Remaining After Plan<input id="blacklight-experience-remaining" name="experienceRemainingAfterPlan" readonly></label>
      </div>
      <div id="blacklight-experience-calculation" class="blacklight-experience-calculation" aria-live="polite"></div>
      <label class="blacklight-wide-label">Experience Award Ledger<textarea name="experienceLedger" rows="5" placeholder="Session, baseline award, qualifying scene, criterion, bonus award, running total…"></textarea></label>
      <p class="helper-note">The calculator records a plan only. Pay the complete cost, record the purchase in Advancement Purchases, and then change the Skill, Attribute, or selected ability. It does not waive Archetype Rating gates or other prerequisites.</p>`;
  }

  function installPanel() {
    const form = document.getElementById('blacklight-character-form');
    if (!form) return null;
    let panel = document.getElementById('blacklight-experience-panel');
    if (panel) return panel;

    const powerList = document.getElementById('blacklight-power-list');
    const powerPanel = powerList?.closest('section');
    if (!powerPanel) return null;

    panel = document.createElement('section');
    panel.id = 'blacklight-experience-panel';
    panel.className = 'blacklight-sheet-panel';
    panel.innerHTML = panelMarkup();
    powerPanel.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function calculate() {
    const form = document.getElementById('blacklight-character-form');
    if (!form || !document.getElementById('blacklight-experience-panel')) return;

    const sessionTotal = number(form, 'sessionBaseExperience') + number(form, 'sessionBonusExperience');
    const skillPoints = number(form, 'plannedSkillPoints');
    const attributePoints = number(form, 'plannedAttributePoints');
    const abilityPoints = number(form, 'plannedAbilityPoints');
    const cost = skillPoints * COSTS.skill + attributePoints * COSTS.attribute + abilityPoints * COSTS.ability;
    const current = number(form, 'experienceCurrent');
    const remaining = current - cost;

    const sessionField = document.getElementById('blacklight-session-experience-total');
    const costField = document.getElementById('blacklight-planned-experience-cost');
    const remainingField = document.getElementById('blacklight-experience-remaining');
    const calculation = document.getElementById('blacklight-experience-calculation');

    if (sessionField) sessionField.value = String(sessionTotal);
    if (costField) costField.value = String(cost);
    if (remainingField) remainingField.value = String(remaining);
    if (calculation) {
      calculation.classList.toggle('blacklight-experience-negative', remaining < 0);
      calculation.innerHTML = remaining < 0
        ? `<p><strong>Insufficient Experience:</strong> This plan costs ${cost} XP, but the character has ${current} XP. Remove purchases worth at least ${Math.abs(remaining)} XP. Experience debt is not permitted.</p>`
        : `<p><strong>Purchase plan:</strong> ${skillPoints} Skill Point${skillPoints === 1 ? '' : 's'} (${skillPoints * COSTS.skill} XP) + ${attributePoints} Attribute Point${attributePoints === 1 ? '' : 's'} (${attributePoints * COSTS.attribute} XP) + ${abilityPoints} Ability Point${abilityPoints === 1 ? '' : 's'} (${abilityPoints * COSTS.ability} XP) = ${cost} XP.</p><p><strong>Remaining unspent Experience:</strong> ${remaining} XP.</p>`;
    }
  }

  function initialize() {
    installStyles();
    const panel = installPanel();
    const form = document.getElementById('blacklight-character-form');
    if (!panel || !form) return;
    form.addEventListener('input', calculate);
    form.addEventListener('change', calculate);
    form.addEventListener('reset', () => window.setTimeout(calculate, 0));
    calculate();
    window.setTimeout(calculate, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
