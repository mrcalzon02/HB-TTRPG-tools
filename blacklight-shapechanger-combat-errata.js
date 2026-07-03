(() => {
  'use strict';

  const SOAK_TEXT = 'Living Soak is a transformed-body soak permission. In social form, use ordinary mortal rules: roll Resilience + eligible Armor against Non-Lethal/Bashing damage, Armor only against Lethal damage, and no soak against Aggravated damage. In hunting or war form, roll Resilience + eligible Armor + Archetype Rating against Non-Lethal/Bashing or Lethal damage. Each result of 6+ cancels one damage success. Aggravated damage bypasses Living Soak unless a separate ability explicitly grants immunity or resistance to that exact damage.';
  const FRAME_TEXT = 'Cost: 1 Fury. Become Large for the scene. Add 2 damage dice to melee damage rolls, gain two dice to grapple or break barriers, and increase Carry by 3. You cannot benefit from human-sized cover, cannot pass through human-width openings without forcing them, and lose two dice from Stealth.';
  const VAMPIRE_SOAK_TEXT = 'Against Non-Lethal/Bashing, roll Resilience + eligible Armor + Fortitude, then halve remaining damage and round down. Against Lethal, roll Resilience + eligible Armor + Fortitude. Aggravated bypasses Resilience, Armor, Fortitude, and Undead Soak unless a separate ability explicitly grants immunity or resistance to that exact damage. Ordinary gunfire normally deals Non-Lethal/Bashing to Vampires.';

  function replaceText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const value = node.nodeValue || '';
      if (value.includes('Massive Shift')) node.nodeValue = value.replaceAll('Massive Shift', 'Titanic Frame');
      if (value.includes('Add Archetype Rating to Force or Resilience for a scene')) node.nodeValue = FRAME_TEXT;
      if (value.includes('make one Soak Test for each damaging hit')) node.nodeValue = SOAK_TEXT;
      if (value.includes('Living Soak changes your single Protection value')) node.nodeValue = SOAK_TEXT;
      if (value.includes('Living Soak is a transformed-body soak permission')) node.nodeValue = SOAK_TEXT;
      if (value.includes('Wounded and other penalties to Resilience tests reduce the Soak pool')) node.nodeValue = SOAK_TEXT;
    });
  }

  function setLabelText(label, text) {
    if (!label) return;
    const textNode = Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = text;
    else label.insertBefore(document.createTextNode(text), label.firstChild);
  }

  function selectedFortitude() {
    const archetype = document.getElementById('blacklight-archetype')?.value;
    if (archetype !== 'vampire') return 0;
    let highest = 0;
    document.querySelectorAll('#blacklight-power-list input[data-power-id]:checked').forEach(input => {
      const parts = String(input.dataset.powerId || '').split('::');
      if (parts[0] !== 'vampire' || parts[1] !== 'deathless-resilience') return;
      const rank = Number(parts[2]);
      if (Number.isFinite(rank)) highest = Math.max(highest, rank);
    });
    return highest;
  }

  function installSheetSoakFields() {
    const form = document.getElementById('blacklight-character-form');
    const protection = document.getElementById('blacklight-protection');
    if (!form || !protection) return;

    const protectionLabel = protection.closest('label');
    setLabelText(protectionLabel, 'Base Non-Lethal Soak Dice');

    const armor = form.elements.armorRating;
    if (armor) setLabelText(armor.closest('label'), 'Armor Rating / Lethal Soak Dice');

    if (!form.elements.fortitudeRating && protectionLabel) {
      const fortitudeLabel = document.createElement('label');
      fortitudeLabel.dataset.blacklightFortitudeField = 'true';
      fortitudeLabel.innerHTML = 'Fortitude Rating (Vampire)<input name="fortitudeRating" type="number" min="0" max="5" value="0" readonly>';
      protectionLabel.insertAdjacentElement('afterend', fortitudeLabel);
    }
    if (form.elements.fortitudeRating) form.elements.fortitudeRating.value = String(selectedFortitude());

    const derivedGrid = protection.closest('.blacklight-derived-grid');
    if (derivedGrid && !derivedGrid.parentElement?.querySelector('[data-blacklight-soak-note]')) {
      const note = document.createElement('p');
      note.className = 'helper-note';
      note.dataset.blacklightSoakNote = 'true';
      note.textContent = 'Mortals roll Resilience + eligible Armor against Non-Lethal/Bashing damage and Armor only against Lethal damage. Supernatural characters use only soak explicitly granted by their recorded Archetype or abilities. Aggravated damage bypasses all ordinary soak unless a specific ability names an exact immunity or resistance.';
      derivedGrid.insertAdjacentElement('afterend', note);
    }

    const impact = form.elements.impactDamage;
    if (impact) {
      setLabelText(impact.closest('label'), 'Non-Lethal / Bashing Damage');
      impact.placeholder = 'Bruising, blunt force, falls, exhaustion';
    }

    const trauma = form.elements.traumaDamage;
    if (trauma) {
      setLabelText(trauma.closest('label'), 'Lethal Damage');
      trauma.placeholder = 'Cuts, gunfire, burns, crushing, severe injury';
    }

    const disruption = form.elements.disruptionDamage;
    if (disruption) setLabelText(disruption.closest('label'), 'Disruption Damage');

    const damageGrid = impact?.closest('.blacklight-damage-grid');
    if (damageGrid && !form.elements.aggravatedDamage) {
      const aggravated = document.createElement('label');
      aggravated.dataset.blacklightAggravatedField = 'true';
      aggravated.innerHTML = 'Aggravated Damage<textarea name="aggravatedDamage" rows="2" placeholder="Bypasses ordinary soak; only exact immunity or resistance applies"></textarea>';
      trauma?.closest('label')?.insertAdjacentElement('afterend', aggravated);
    }
  }

  function installQuickRule() {
    const quickRules = document.querySelector('.blacklight-quick-rules');
    if (!quickRules) return;
    let rule = quickRules.querySelector('[data-simple-combat-rule]');
    if (!rule) {
      rule = document.createElement('p');
      rule.dataset.simpleCombatRule = 'true';
      quickRules.appendChild(rule);
    }
    rule.innerHTML = '<strong>Combat and Soak:</strong> Roll the attack, then damage on a hit. Mortals roll Resilience + Armor against Non-Lethal/Bashing and Armor only against Lethal. Supernatural characters use printed supernatural soak. Aggravated bypasses Resilience, Armor, Fortitude, Living Soak, and generic supernatural soak unless an exact ability says otherwise.';
  }

  function installVampireReminder() {
    const summary = document.getElementById('blacklight-archetype-summary');
    if (!summary) return;
    const heading = summary.querySelector('h3')?.textContent?.trim();
    const existing = summary.querySelector('[data-vampire-soak-reminder]');
    if (heading !== 'Vampire') {
      existing?.remove();
      return;
    }
    if (!existing) {
      const reminder = document.createElement('div');
      reminder.className = 'blacklight-weakness-box';
      reminder.dataset.vampireSoakReminder = 'true';
      reminder.innerHTML = `<strong>Undead Soak:</strong> ${VAMPIRE_SOAK_TEXT}`;
      summary.appendChild(reminder);
    }
  }

  function apply() {
    replaceText(document.getElementById('blacklight-power-list'));
    replaceText(document.getElementById('blacklight-archetype-summary'));
    replaceText(document.querySelector('#blacklight-browser #blacklight-entry'));
    installSheetSoakFields();
    installQuickRule();
    installVampireReminder();
  }

  function initialize() {
    apply();
    document.addEventListener('change', apply);
    document.addEventListener('input', apply);
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
