(() => {
  'use strict';

  const SOAK_TEXT = 'Living Soak changes your single Protection value instead of creating another roll. In social form, add Archetype Rating to Protection against Impact only. In hunting or war form, add Archetype Rating to Protection against Impact and Trauma. Use that one Protection value against fixed damage. Living Soak can reduce physical damage to 0. It does not protect against Disruption, Pressure, Exposure, Death Marks, or effects that explicitly ignore Shapechanger Soak.';
  const FRAME_TEXT = 'Cost: 1 Fury. Become Large for the scene. Add 2 damage to melee attacks, gain two dice to grapple or break barriers, and increase Carry by 3. You cannot benefit from human-sized cover, cannot pass through human-width openings without forcing them, and lose two dice from Stealth.';

  function replaceText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const value = node.nodeValue || '';
      if (value.trim() === 'Massive Shift') node.nodeValue = value.replace('Massive Shift', 'Titanic Frame');
      if (value.includes('Add Archetype Rating to Force or Resilience for a scene')) node.nodeValue = FRAME_TEXT;
      if (value.includes('make one Soak Test for each damaging hit')) node.nodeValue = SOAK_TEXT;
      if (value.includes('Wounded and other penalties to Resilience tests reduce the Soak pool')) node.nodeValue = SOAK_TEXT;
    });
  }

  function apply() {
    replaceText(document.getElementById('blacklight-power-list'));
    replaceText(document.getElementById('blacklight-archetype-summary'));
    replaceText(document.querySelector('#blacklight-browser #blacklight-entry'));
  }

  function initialize() {
    apply();
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
