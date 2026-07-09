(() => {
  'use strict';

  const oppositionProfiles = {
    'Blood Courts': { category: 'vampire-remainder', role: 'court envoy', power: '7', environment: 'court-controlled hotel' },
    'Fae Courts': { category: 'otherworldly-entity', role: 'court envoy', power: '8', environment: 'night market' },
    'Gaian Spirits': { category: 'otherworldly-entity', role: 'guardian', power: '7', environment: 'rural territory boundary' },
    'Gaian Packs': { category: 'shapechanger', role: 'guardian', power: '6', environment: 'rural territory boundary' },
    'Machine Saints': { category: 'machine-intelligence', role: 'black-box problem', power: '7', environment: 'server farm' },
    'Charles-adjacent Systems': { category: 'machine-intelligence', role: 'black-box problem', power: '8', environment: 'client facility using Faux Charles' },
    'Dream Cartels': { category: 'otherworldly-entity', role: 'hidden patron', power: '7', environment: 'night market' },
    'Hunter Orders': { category: 'human-vigil', role: 'rival', power: '5', environment: 'old church archive' },
    'Industrial Witches': { category: 'technomancer', role: 'ritual evidence source', power: '6', environment: 'resource extraction front' },
    'Memory Parasites': { category: 'eldritch-cognitohazard', role: 'cognitohazard carrier', power: '7', environment: 'sealed noospheric archive' },
    'Mirror Polities': { category: 'otherworldly-entity', role: 'court envoy', power: '7', environment: 'court-controlled hotel' },
    'Oracle Houses': { category: 'eldritch-bound', role: 'hidden patron', power: '6', environment: 'old church archive' },
    'Hollow Choir': { category: 'eldritch-cognitohazard', role: 'cognitohazard carrier', power: '7', environment: 'signal-contaminated broadcast site' },
    'Black Archive Custodians': { category: 'corporate-staff', role: 'restricted containment hazard', power: '5', environment: 'sealed noospheric archive' },
    'Corporate Necromancers': { category: 'technomancer', role: 'cult cell operator', power: '6', environment: 'ritual evidence room' },
    'Blacklight Continuity': { category: 'operative', role: 'rival', power: '6', environment: 'Blacklight O-shaped office complex' },
    'Unknown Rival Faction': { category: 'random', role: 'rival', power: 'random', environment: 'random' }
  };

  function slugish(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'opposition';
  }

  function readText(id) {
    return document.getElementById(id)?.textContent?.trim() || '';
  }

  function clientNameOnly(value) {
    return String(value || '').split('·')[0].trim();
  }

  function buildUrl() {
    const opposition = readText('supernatural-opposition') || 'Unknown Rival Faction';
    const client = clientNameOnly(readText('supernatural-client')) || 'Unknown client';
    const caseCode = readText('supernatural-code') || 'MISSION';
    const rivalry = readText('supernatural-rivalry') || '';
    const profile = oppositionProfiles[opposition] || oppositionProfiles['Unknown Rival Faction'];
    const seed = `${slugish(caseCode)}-${slugish(opposition)}-entity`;
    const params = new URLSearchParams({
      source: 'mission-opposition',
      opposition,
      client,
      case: caseCode,
      rivalry,
      category: profile.category,
      role: profile.role,
      environment: profile.environment,
      power: profile.power,
      seed
    });
    return `blacklight-npc-generator.html?${params.toString()}`;
  }

  function ensureLink() {
    const links = document.querySelector('.supernatural-links');
    if (!links) return null;
    let link = document.getElementById('supernatural-open-rival-entity');
    if (!link) {
      link = document.createElement('a');
      link.id = 'supernatural-open-rival-entity';
      link.href = 'blacklight-npc-generator.html';
      link.textContent = 'Open rival in entity generator';
      links.prepend(link);
    }
    return link;
  }

  function updateLink() {
    const link = ensureLink();
    if (!link) return;
    const opposition = readText('supernatural-opposition');
    if (!opposition || opposition === '—') {
      link.href = 'blacklight-npc-generator.html';
      link.textContent = 'Open entity generator';
      return;
    }
    link.href = buildUrl();
    link.textContent = `Generate ${opposition} entity`;
  }

  function initialize() {
    updateLink();
    const target = document.getElementById('supernatural-mission-panel');
    if (!target) return;
    const observer = new MutationObserver(updateLink);
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    target.addEventListener('click', event => {
      if (event.target?.id === 'supernatural-generate') window.setTimeout(updateLink, 0);
    });
  }

  function waitForPanel() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (document.getElementById('supernatural-mission-panel') || attempts > 80) {
        window.clearInterval(timer);
        initialize();
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForPanel, { once: true });
  else waitForPanel();
})();
