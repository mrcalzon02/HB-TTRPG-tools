(() => {
  'use strict';

  const DATA_URL = 'data/blacklight-continuum/generators/mission-generator-content.json';
  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-mission-generator-v1';

  const state = {
    data: null,
    mission: null,
    seed: '',
    counters: { contract: 0, site: 0, truth: 0, cast: 0 }
  };

  const ui = {};

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function slug(value) {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function titleCase(value) {
    return String(value ?? '').replace(/(^|[-_\s]+)([a-z])/g, (_, gap, letter) => `${gap ? ' ' : ''}${letter.toUpperCase()}`).trim();
  }

  function hashSeed(text) {
    let hash = 2166136261;
    for (const character of String(text)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function random() {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function controlsSignature() {
    return [
      ui.pattern.value, ui.operation.value, ui.layer.value, ui.threat.value,
      ui.team.value, ui.visibility.value,
      ui.forceCompromised.checked ? 'compromised' : 'ordinary',
      ui.forcePublic.checked ? 'public' : 'contained',
      ui.forceCharles.checked ? 'charles' : 'no-charles'
    ].join('|');
  }

  function rngFor(section) {
    const counter = state.counters[section] || 0;
    return mulberry32(hashSeed(`${state.seed}|${controlsSignature()}|${section}|${counter}`));
  }

  function pick(items, rng) {
    if (!Array.isArray(items) || !items.length) return null;
    return items[Math.floor(rng() * items.length)];
  }

  function uniquePicks(items, count, rng) {
    const pool = [...items];
    const result = [];
    while (pool.length && result.length < count) {
      result.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return result;
  }

  function weightedPick(items, weightFor, rng) {
    if (!items.length) return null;
    const weighted = items.map(item => ({ item, weight: Math.max(0.01, Number(weightFor(item)) || 0.01) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
  }

  function findById(items, id) {
    return (items || []).find(item => item.id === id) || null;
  }

  function selectedOrRandom(select, items, rng, randomWeights = null) {
    const selected = select.value;
    if (selected && selected !== 'random') return findById(items, selected) || items[0];
    if (randomWeights) return weightedPick(items.filter(item => item.id !== 'random'), randomWeights, rng);
    return pick(items.filter(item => item.id !== 'random'), rng);
  }

  function layerCompatible(item, layer) {
    return !Array.isArray(item.layers) || item.layers.includes(layer);
  }

  function createSeed() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID().split('-').slice(0, 2).join('-');
    return `mission-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function populateSelect(select, items, includeRandom = false, labelKey = 'label') {
    const initial = includeRandom ? '<option value="random">Random</option>' : '';
    select.innerHTML = initial + items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item[labelKey] || item.id)}</option>`).join('');
  }

  function initializeControls() {
    ui.pattern.innerHTML = '<option value="random">Random Legacy Pattern</option>' + state.data.legacyPatterns.map(pattern => `<option value="${escapeHtml(pattern.id)}">${escapeHtml(pattern.label)}</option>`).join('');
    ui.operation.innerHTML = '<option value="random">Random Operation Type</option>' + state.data.operationTypes.map(operation => `<option value="${escapeHtml(operation.id)}">${escapeHtml(operation.label)}</option>`).join('');
    populateSelect(ui.layer, state.data.controls.layers);
    populateSelect(ui.threat, state.data.controls.threatTiers);
    populateSelect(ui.team, state.data.controls.teamScales);
    populateSelect(ui.visibility, state.data.controls.visibilityDoctrines);
    ui.layer.value = 'random';
    ui.threat.value = 'random';
    ui.team.value = 'random';
    ui.visibility.value = 'random';
  }

  function choosePattern(rng) {
    if (ui.pattern.value !== 'random') return findById(state.data.legacyPatterns, ui.pattern.value);
    return pick(state.data.legacyPatterns, rng);
  }

  function chooseOperation(pattern, rng) {
    if (ui.operation.value !== 'random') return findById(state.data.operationTypes, ui.operation.value);
    const ids = pattern?.operationTypes || state.data.operationTypes.map(item => item.id);
    return findById(state.data.operationTypes, pick(ids, rng));
  }

  function chooseLayer(rng) {
    return selectedOrRandom(ui.layer, state.data.controls.layers, rng, layer => ({ mundane: 4, adjacent: 3, mixed: 4, supernatural: 2 }[layer.id] || 1));
  }

  function chooseThreat(rng) {
    return selectedOrRandom(ui.threat, state.data.controls.threatTiers, rng, threat => ({ controlled: 2, serious: 5, severe: 4, critical: 2 }[threat.id] || 1));
  }

  function chooseTeam(rng) {
    return selectedOrRandom(ui.team, state.data.controls.teamScales, rng, team => ({ solo: 1, pair: 2, team: 5, split: 2 }[team.id] || 1));
  }

  function chooseVisibility(layer, rng) {
    if (ui.visibility.value !== 'random') return findById(state.data.controls.visibilityDoctrines, ui.visibility.value);
    const allowed = state.data.controls.visibilityDoctrines.filter(item => item.id !== 'random');
    return weightedPick(allowed, doctrine => {
      if (layer.id === 'mundane') return ({ mundane: 6, plausible: 4, witnessed: 1, unrestricted: 1 }[doctrine.id] || 1);
      if (layer.id === 'supernatural') return ({ mundane: 1, plausible: 3, witnessed: 4, unrestricted: 3 }[doctrine.id] || 1);
      return ({ mundane: 2, plausible: 5, witnessed: 3, unrestricted: 2 }[doctrine.id] || 1);
    }, rng);
  }

  function buildContract() {
    const rng = rngFor('contract');
    const pattern = choosePattern(rng);
    const operation = chooseOperation(pattern, rng);
    const layer = chooseLayer(rng);
    const threat = chooseThreat(rng);
    const team = chooseTeam(rng);
    const visibility = chooseVisibility(layer, rng);

    const clients = state.data.clients.filter(client => layerCompatible(client, layer.id));
    const client = pick(clients, rng) || state.data.clients[0];
    const targets = state.data.targetProfiles.filter(target => layerCompatible(target, layer.id) && target.operationTypes.includes(operation.id));
    const target = pick(targets.length ? targets : state.data.targetProfiles.filter(item => layerCompatible(item, layer.id)), rng) || state.data.targetProfiles[0];
    const asset = pick(target.assets, rng);
    const objectiveVerb = pick(operation.verbs, rng);
    const codename = `Operation ${pick(state.data.codewords.adjectives, rng)} ${pick(state.data.codewords.nouns, rng)}`;
    const codeNumber = String((hashSeed(`${state.seed}|code`) % 9000) + 1000).padStart(4, '0');

    return {
      pattern,
      operation,
      layer,
      threat,
      team,
      visibility,
      client,
      target,
      asset,
      objectiveVerb,
      codename,
      missionCode: `BL-${codeNumber}`,
      objective: `${titleCase(objectiveVerb)} the ${asset} associated with the target site.`,
      successCondition: operation.success
    };
  }

  function chooseLocation(target, rng) {
    return weightedPick(state.data.locations, location => {
      const overlap = (location.siteBias || []).filter(site => target.sites.includes(site)).length;
      return 1 + overlap * 6;
    }, rng);
  }

  function compatibleChallenges(layer) {
    if (layer.id === 'mundane') return state.data.challenges.filter(challenge => !['supernatural-wards'].includes(challenge.id));
    return state.data.challenges;
  }

  function buildSite(contract) {
    const rng = rngFor('site');
    const location = chooseLocation(contract.target, rng);
    const matchingSites = contract.target.sites.filter(site => (location.siteBias || []).includes(site));
    const siteName = pick(matchingSites.length ? matchingSites : contract.target.sites, rng);
    const oppositionPool = state.data.opposition.filter(item => layerCompatible(item, contract.layer.id));
    const opposition = pick(oppositionPool, rng) || state.data.opposition[0];

    const challengePool = compatibleChallenges(contract.layer);
    const preferred = (contract.pattern.preferredChallenges || []).map(id => findById(challengePool, id)).filter(Boolean);
    const firstChallenge = pick(preferred.length ? preferred : challengePool, rng);
    const remaining = challengePool.filter(item => item.id !== firstChallenge?.id);
    const challenges = [firstChallenge, ...uniquePicks(remaining, 2, rng)].filter(Boolean);

    const preferredDeadlines = (contract.pattern.preferredDeadlines || []).map(id => findById(state.data.deadlines, id)).filter(Boolean);
    const deadline = pick(preferredDeadlines.length ? preferredDeadlines : state.data.deadlines, rng);

    return {
      location,
      siteName,
      opposition,
      challenges,
      deadline,
      insertion: pick(state.data.insertions, rng),
      extraction: pick(state.data.extractions, rng),
      support: pick(state.data.supportPackages, rng)
    };
  }

  function twistAllowed(twist, layer) {
    const overtSupernatural = new Set(['warded-redundancy', 'targeted-bioweapon', 'authenticity-is-person']);
    return layer.id !== 'mundane' || !overtSupernatural.has(twist.id);
  }

  function buildTruth(contract) {
    const rng = rngFor('truth');
    let candidates = state.data.twists.filter(twist => twistAllowed(twist, contract.layer));
    if (ui.forceCompromised.checked) {
      const compromised = new Set(['bad-intel', 'asset-relocated', 'cover-compromised', 'counterintelligence-trap', 'controlled-leak', 'client-misrepresented-asset', 'asset-is-fake']);
      candidates = candidates.filter(twist => compromised.has(twist.id));
    }
    const preferred = (contract.pattern.preferredTwists || []).map(id => findById(candidates, id)).filter(Boolean);
    const twist = pick(preferred.length && rng() < 0.72 ? preferred : candidates, rng) || state.data.twists[0];
    const publicExposure = ui.forcePublic.checked || rng() < 0.42 ? pick(state.data.publicExposure, rng) : 'No additional public event is scheduled, but ordinary witnesses and digital records remain possible.';
    const hiddenAgenda = ui.forceCharles.checked || rng() < 0.62 ? pick(state.data.hiddenAgendas, rng) : 'Charles has no additional concealed objective beyond completing the disclosed contract and learning from the result.';

    return {
      twist,
      publicExposure,
      hiddenAgenda,
      complication: pick(state.data.complications, rng),
      reward: pick(state.data.rewards, rng),
      aftermath: pick(state.data.aftermath, rng)
    };
  }

  function generateUniqueNames(count, rng) {
    const names = [];
    let attempts = 0;
    while (names.length < count && attempts < 100) {
      attempts += 1;
      const name = `${pick(state.data.names.first, rng)} ${pick(state.data.names.last, rng)}`;
      if (!names.includes(name)) names.push(name);
    }
    return names;
  }

  function buildCast(contract, site, truth) {
    const rng = rngFor('cast');
    const names = generateUniqueNames(5, rng);
    return [
      { role: 'Client Representative', name: names[0], function: contract.client.publicFace, motive: 'Deliver the stated result without exposing the client’s full authority chain.', pressure: contract.client.pressure },
      { role: 'Site Authority', name: names[1], function: `Controls access to the ${site.siteName}`, motive: 'Preserve the institution, site, and personal position before protecting the hidden truth.', pressure: site.opposition.behavior },
      { role: 'Civilian Complication', name: names[2], function: 'A worker, guest, patient, contractor, or dependent caught inside the operation', motive: 'Survive, protect someone else, and avoid being treated as expendable evidence.', pressure: contract.target.civilians },
      { role: 'Opposition Specialist', name: names[3], function: site.opposition.label, motive: 'Identify who sent the team and control the route by which the mission leaves the site.', pressure: site.opposition.reinforcement },
      { role: 'Uncertain Third Party', name: names[4], function: 'Insider, rival operative, curator, protected witness, or local fixer', motive: 'Use the operation to produce an outcome neither the client nor target requested.', pressure: truth.complication }
    ];
  }

  function visibilityConstraint(visibility) {
    return {
      mundane: 'Both client and target are expected to perceive mundane or conventionally explainable methods. Visible supernatural effects count as immediate Exposure.',
      plausible: 'Exceptional abilities may be used only when their effects remain plausibly deniable to ordinary witnesses and recording systems.',
      witnessed: 'The client may witness exceptional abilities, but uninvolved personnel and the public must not receive clear proof.',
      unrestricted: 'No concealment requirement applies beyond ordinary mission safety and the protection of unrelated people.'
    }[visibility.id] || visibility.label;
  }

  function deriveDisclosure(contract, site, truth) {
    const challengeIds = new Set(site.challenges.map(item => item.id));
    const identityRisk = challengeIds.has('identity-screening') || challengeIds.has('authorized-presence') || ['cover-compromised', 'security-is-interview'].includes(truth.twist.id)
      ? 'Identity continuity is an active mission risk. Credentials may be compared with behavior, memory, prior access, or a living authorized person.'
      : 'No unusual identity or memory alteration is known, but cover identities can still be exposed through ordinary investigation.';
    const supernaturalRisk = contract.layer.id === 'mundane'
      ? 'No known supernatural obligation is required by the disclosed plan.'
      : 'Supernatural jurisdiction, wards, identity rules, or entity claims may apply. No oath, invitation, feeding act, attunement, or binding is authorized without renewed consent.';
    const noReturnRisk = site.location.regions.includes('Off-World') || site.insertion.label === 'Anomalous Threshold Transit'
      ? 'A no-return condition is possible if the transit anchor, platform, or extraction window fails. This risk is known before acceptance.'
      : 'No known irreversible transit is required. Emergency extraction is not guaranteed if the site enters full lockdown.';
    const redactions = [
      'The exact origin of one intelligence source is withheld to protect an active person or network. Category and risk were reviewed by Company leadership.',
      truth.hiddenAgenda.includes('no additional concealed objective')
        ? 'No additional strategic redaction is declared.'
        : 'A strategic-interest redaction exists. It does not authorize a second objective and must be disclosed before the team is asked to act on it.'
    ];
    const knownUnknowns = [
      'The current completeness of the client’s site intelligence has not been independently verified.',
      'The full reinforcement schedule and every emergency exit are unknown.',
      'The opposition’s response to partial success or voluntary withdrawal is unknown.'
    ];

    return {
      targetCategory: `${contract.target.label}; ${contract.layer.label}`,
      locationDuration: `${site.location.label}. The operation must resolve before ${site.deadline.label.toLowerCase()} (${site.deadline.clock}).`,
      jurisdiction: `${contract.client.type} client authority intersects with local, corporate, diplomatic, military, court, or sovereign claims at the target site. Exposure may create consequences beyond ordinary trespass.`,
      identityRisk,
      supernaturalRisk,
      noReturnRisk,
      civilianExposure: `${contract.target.civilians} ${truth.publicExposure}`,
      supportExtraction: `${site.support.label}: ${site.support.items.join(', ')}. Limitation: ${site.support.limit} Extraction: ${site.extraction.label} — ${site.extraction.detail}`,
      knownUnknowns,
      redactions
    };
  }

  function buildClues(contract, site, truth) {
    return [
      { label: 'Twist Warning', clue: truth.twist.warning, reveals: `Points toward ${truth.twist.label.toLowerCase()} without proving it.` },
      { label: 'Site Inconsistency', clue: `${site.location.environment} One detail of the ${site.siteName} does not fit the client's expected pattern.`, reveals: 'The site has changed, the intelligence is stale, or a second authority is operating inside it.' },
      { label: 'Client Contradiction', clue: `${contract.client.ethicalConcern} The support package and requested limits reveal what the client fears losing.`, reveals: 'The stated objective is not the client’s only concern.' }
    ];
  }

  function buildScenes(contract, site, truth, cast) {
    return [
      {
        number: 1,
        title: 'Disclosure and Acceptance',
        purpose: `The client representative ${cast[0].name} presents the contract and declared redactions.`,
        beats: ['Players may ask what is unknown versus withheld.', 'Record acceptance, requested changes, or refusal.', `Establish the ${site.deadline.label.toLowerCase()} clock.`]
      },
      {
        number: 2,
        title: 'Approach and Reconnaissance',
        purpose: `${site.insertion.label} brings the team toward the ${site.siteName} at ${site.location.label}.`,
        beats: ['Show the first mismatch between the briefing and site reality.', `Introduce ${cast[4].name}, the uncertain third party, or evidence of their activity.`, 'Allow the team to change its route before committing to the perimeter.']
      },
      {
        number: 3,
        title: 'The First Barrier',
        purpose: `${site.challenges[0].label} blocks ordinary access.`,
        beats: site.challenges[0].approaches.map(approach => `Possible approach: ${approach}.`)
      },
      {
        number: 4,
        title: 'Inside the Operating System',
        purpose: `${site.opposition.label} reacts while ${site.challenges[1].label.toLowerCase()} complicates progress.`,
        beats: [`The opposition behaves according to: ${site.opposition.behavior}`, `Place ${cast[2].name}, the civilian complication, where force would be costly.`, `Advance Exposure if the ${contract.visibility.label.toLowerCase()} doctrine is violated.`]
      },
      {
        number: 5,
        title: 'Objective Contact',
        purpose: `The team reaches the ${contract.asset}, but ${site.challenges[2].label.toLowerCase()} prevents simple possession or destruction.`,
        beats: ['Confirm what success actually requires.', 'Offer evidence sufficient to recognize that the mission file is incomplete.', `Give ${cast[1].name}, the site authority, a chance to bargain or intervene.`]
      },
      {
        number: 6,
        title: 'The Truth Changes the Job',
        purpose: `${truth.twist.label}: ${truth.twist.reveal}`,
        beats: [truth.twist.change, 'State which original assumptions are no longer true.', 'Require renewed consent before accepting a new objective, delivery condition, supernatural obligation, or no-return risk.']
      },
      {
        number: 7,
        title: 'Extraction and Aftermath',
        purpose: `${site.extraction.label} must occur while the deadline and Exposure clocks continue to move.`,
        beats: [site.extraction.detail, truth.publicExposure, `Initial aftermath: ${truth.aftermath}`]
      }
    ];
  }

  function buildClocks(contract, site) {
    const exposureSegments = Math.max(4, 7 - Number(contract.threat.rating || 2));
    return [
      {
        title: `${site.deadline.label} Clock`,
        segments: Math.max(4, Math.min(8, Number(String(site.deadline.clock).match(/\d+/)?.[0] || 6))),
        advance: 'Advance after major delay, loud failure, extended argument under time pressure, or a scene transition that consumes the operating window.',
        full: `${site.deadline.event} Consequence: ${site.deadline.miss}`
      },
      {
        title: 'Exposure and Response Clock',
        segments: exposureSegments,
        advance: 'Advance when witnesses receive clear proof, identities fail, alarms persist, visible force escalates, or the team repeats a detected method.',
        full: `The site enters full response posture. ${site.opposition.reinforcement}`
      }
    ];
  }

  function buildResolution(contract, site, truth) {
    return [
      { level: 'Full Success', result: `${contract.successCondition} The team exits through ${site.extraction.label.toLowerCase()} before either clock fills and preserves the declared civilian and visibility limits.` },
      { level: 'Compromised Success', result: `The primary objective is achieved, but Exposure, client manipulation, lost evidence, injury, or a broken support promise creates ${truth.aftermath.toLowerCase()}` },
      { level: 'Partial Success', result: 'The team preserves people, proof, or strategic denial but does not deliver the exact asset or effect requested by the client.' },
      { level: 'Principled Refusal', result: 'After the hidden truth emerges, the team refuses an unaccepted second objective, secures what protection it can, and returns with evidence of why the original consent no longer applied.' },
      { level: 'Failure with Continuity', result: `The objective is lost or the deadline fills, but surviving operatives, witnesses, and records establish the next mission rather than ending play. ${site.deadline.miss}` }
    ];
  }

  function buildMission() {
    const contract = buildContract();
    const site = buildSite(contract);
    const truth = buildTruth(contract);
    const cast = buildCast(contract, site, truth);
    const disclosure = deriveDisclosure(contract, site, truth);
    const clues = buildClues(contract, site, truth);
    const scenes = buildScenes(contract, site, truth, cast);
    const clocks = buildClocks(contract, site);
    const resolution = buildResolution(contract, site, truth);

    return {
      schema: 'blacklight-continuum-mission',
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      seed: state.seed,
      counters: { ...state.counters },
      title: contract.codename,
      missionCode: contract.missionCode,
      contract,
      site,
      truth,
      cast,
      disclosure,
      clues,
      scenes,
      clocks,
      resolution,
      playerConstraints: [
        visibilityConstraint(contract.visibility),
        'The declared objective does not authorize unrelated theft, killing, coercion, memory alteration, supernatural binding, or destruction.',
        `Civilian baseline: ${contract.target.civilians}`,
        `Support limitation: ${site.support.limit}`,
        'If the target, location, client motive, identity risk, supernatural obligation, or return path changes materially, pause and renew consent.'
      ],
      followUps: [
        truth.aftermath,
        `The client’s unresolved ethical concern remains: ${contract.client.ethicalConcern}`,
        `${site.opposition.label} adapts its procedures after the mission.`,
        truth.hiddenAgenda
      ]
    };
  }

  function table(headers, rows) {
    return `<div class="mission-table-wrap"><table class="mission-table"><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function list(items) {
    return `<ul class="mission-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function cards(records) {
    return `<div class="mission-grid">${records.map(record => `<article class="mission-card ${record.className || ''}"><h3>${escapeHtml(record.label)}</h3><p>${escapeHtml(record.value)}</p></article>`).join('')}</div>`;
  }

  function renderHero(mission) {
    const { contract, site } = mission;
    return `<header class="mission-hero">
      <p class="eyebrow">${escapeHtml(mission.missionCode)} · Generated operational contract</p>
      <h2>${escapeHtml(mission.title)}</h2>
      <p><strong>${escapeHtml(contract.client.name)}</strong> requests that the team ${escapeHtml(contract.objective.toLowerCase())} The operation takes place at a <strong>${escapeHtml(site.siteName)}</strong> in <strong>${escapeHtml(site.location.label)}</strong>.</p>
      <div class="mission-badges">
        <span>${escapeHtml(contract.pattern.label)}</span><span>${escapeHtml(contract.operation.label)}</span><span>${escapeHtml(contract.layer.label)}</span><span>${escapeHtml(contract.threat.label)}</span><span>${escapeHtml(contract.team.label)}</span><span>${escapeHtml(contract.visibility.label)}</span><span>Seed ${escapeHtml(mission.seed)}</span>
      </div>
    </header>`;
  }

  function renderPlayerBriefing(mission) {
    const { contract, site, disclosure } = mission;
    return `<section class="mission-section player-section">
      <div class="mission-section-head"><div><h2>Player Briefing and Mission Disclosure</h2><p>This is the information BlackLight supplies before the team accepts the operation. Declared unknowns and redactions are part of the briefing rather than hidden from the players.</p></div></div>
      ${cards([
        { label: 'Client', value: `${contract.client.name}. Contact presents as ${contract.client.publicFace}.` },
        { label: 'Objective', value: contract.objective },
        { label: 'Success Condition', value: contract.successCondition },
        { label: 'Target', value: `${contract.target.label}: ${contract.asset}.` },
        { label: 'Location', value: `${site.siteName}, ${site.location.label}. ${site.location.environment}` },
        { label: 'Deadline', value: `${site.deadline.label} — ${site.deadline.clock}. ${site.deadline.event}` },
        { label: 'Known Opposition', value: `${site.opposition.label}. ${site.opposition.capability}` },
        { label: 'Team Scale', value: contract.team.label },
        { label: 'Visibility Doctrine', value: visibilityConstraint(contract.visibility) }
      ])}
      <h3>Mandatory Risk Disclosure</h3>
      ${table(['Disclosure Category', 'Known Information'], [
        ['Objective', contract.objective],
        ['Target category', disclosure.targetCategory],
        ['Location and operating window', disclosure.locationDuration],
        ['Jurisdiction', disclosure.jurisdiction],
        ['Identity or memory risk', disclosure.identityRisk],
        ['Supernatural obligation', disclosure.supernaturalRisk],
        ['No-return risk', disclosure.noReturnRisk],
        ['Civilian exposure', disclosure.civilianExposure],
        ['Support and extraction', disclosure.supportExtraction],
        ['Known unknowns', disclosure.knownUnknowns.join(' ')],
        ['Declared redactions', disclosure.redactions.join(' ')]
      ])}
      <h3>Insertion, Support, and Extraction</h3>
      ${cards([
        { label: 'Insertion', value: `${site.insertion.label}: ${site.insertion.detail}` },
        { label: 'Support Package', value: `${site.support.label}: ${site.support.items.join(', ')}. Limitation: ${site.support.limit}` },
        { label: 'Extraction', value: `${site.extraction.label}: ${site.extraction.detail}` }
      ])}
      <h3>Known Operational Barriers</h3>
      ${table(['Barrier', 'What It Means', 'Recognized Approaches'], site.challenges.map(challenge => [challenge.label, challenge.detail, challenge.approaches.join(', ')]))}
      <h3>Acceptance Conditions</h3>
      ${list(mission.playerConstraints)}
      <div class="mission-callout"><strong>Renewed consent trigger:</strong> The team is entitled to stop and reassess if the real target, location, client motive, identity risk, supernatural obligation, civilian exposure, or return path differs materially from this disclosure.</div>
    </section>`;
  }

  function renderModeratorTruth(mission) {
    const { contract, site, truth } = mission;
    return `<section class="mission-section gm-only">
      <div class="mission-section-head"><div><h2>Truth Behind the Contract</h2><p>Do not reveal this entire section at the briefing. Reveal clues through play and reopen consent when the truth changes the accepted job.</p></div></div>
      ${cards([
        { label: 'Legacy Mission DNA', value: `${contract.pattern.label} — ${contract.pattern.signature}` },
        { label: 'Client’s Actual Need', value: contract.client.actualNeed },
        { label: 'Client Pressure', value: contract.client.pressure },
        { label: 'Ethical Concern', value: contract.client.ethicalConcern },
        { label: 'Primary Twist', value: `${truth.twist.label}: ${truth.twist.reveal}` },
        { label: 'How the Twist Changes Play', value: truth.twist.change },
        { label: 'Charles or Strategic Interest', value: truth.hiddenAgenda },
        { label: 'Additional Complication', value: truth.complication },
        { label: 'Public Exposure Event', value: truth.publicExposure },
        { label: 'Potential Reward', value: truth.reward },
        { label: 'Likely Aftermath', value: truth.aftermath, className: 'wide' }
      ])}
    </section>`;
  }

  function renderCast(mission) {
    return `<section class="mission-section gm-only"><div class="mission-section-head"><div><h2>Key Personnel</h2><p>Each person has a reason to act beyond merely helping or opposing the team.</p></div></div><div class="npc-grid">${mission.cast.map(person => `<article class="npc-card"><span>${escapeHtml(person.role)}</span><h3>${escapeHtml(person.name)}</h3><p><strong>Function:</strong> ${escapeHtml(person.function)}<br><strong>Motive:</strong> ${escapeHtml(person.motive)}<br><strong>Pressure:</strong> ${escapeHtml(person.pressure)}</p></article>`).join('')}</div></section>`;
  }

  function renderClues(mission) {
    return `<section class="mission-section gm-only"><div class="mission-section-head"><div><h2>Clue Structure</h2><p>The twist has warning signs. Players should be able to recognize that the briefing is incomplete before the reveal becomes unavoidable.</p></div></div>${table(['Clue', 'What the Team Can Discover', 'What It Suggests'], mission.clues.map(clue => [clue.label, clue.clue, clue.reveals]))}</section>`;
  }

  function renderScenes(mission) {
    return `<section class="mission-section gm-only"><div class="mission-section-head"><div><h2>Seven-Scene Mission Framework</h2><p>The scenes are functional stages, not a railroad. Move, combine, or skip them according to player choices.</p></div></div><div class="scene-track">${mission.scenes.map(scene => `<article class="scene-card"><span>Scene ${scene.number}</span><h3>${escapeHtml(scene.title)}</h3><p>${escapeHtml(scene.purpose)}</p><ul>${scene.beats.map(beat => `<li>${escapeHtml(beat)}</li>`).join('')}</ul></article>`).join('')}</div></section>`;
  }

  function renderClocks(mission) {
    return `<section class="mission-section gm-only"><div class="mission-section-head"><div><h2>Mission Clocks</h2><p>Clocks advance because time, visibility, and opposition change—not because the Moderator wants to punish discussion.</p></div></div><div class="clock-grid">${mission.clocks.map(clock => `<article class="clock-card"><h3>${escapeHtml(clock.title)}</h3><p><strong>Advance:</strong> ${escapeHtml(clock.advance)}<br><strong>When full:</strong> ${escapeHtml(clock.full)}</p><div class="clock-segments">${Array.from({ length: clock.segments }, () => '<i></i>').join('')}</div></article>`).join('')}</div></section>`;
  }

  function renderResolution(mission) {
    return `<section class="mission-section gm-only"><div class="mission-section-head"><div><h2>Resolution, Consequences, and Continuation</h2><p>The mission can produce useful play without requiring perfect acquisition or unquestioning obedience to the client.</p></div></div>${table(['Outcome', 'Result'], mission.resolution.map(entry => [entry.level, entry.result]))}<h3>Follow-Up Hooks</h3>${list(mission.followUps)}</section>`;
  }

  function renderAudit(mission) {
    return `<section class="mission-section"><div class="mission-section-head"><div><h2>Generation Audit</h2><p>The mission includes all required contract and play structures.</p></div></div><div class="audit-row"><span>Client defined</span><span>Target defined</span><span>Objective defined</span><span>Location defined</span><span>Opposition defined</span><span>3 barriers</span><span>Deadline clock</span><span>Exposure clock</span><span>Twist with warning clue</span><span>Mandatory disclosure</span><span>Renewed consent trigger</span><span>Extraction</span><span>5 NPCs</span><span>7 scenes</span><span>5 resolution levels</span></div><p class="mission-status">Seed ${escapeHtml(mission.seed)} · Contract rerolls ${mission.counters.contract} · Site rerolls ${mission.counters.site} · Hidden-truth rerolls ${mission.counters.truth} · Cast rerolls ${mission.counters.cast}</p></section>`;
  }

  function renderMission() {
    if (!state.mission) return;
    ui.output.innerHTML = [
      renderHero(state.mission),
      renderPlayerBriefing(state.mission),
      renderModeratorTruth(state.mission),
      renderCast(state.mission),
      renderClues(state.mission),
      renderScenes(state.mission),
      renderClocks(state.mission),
      renderResolution(state.mission),
      renderAudit(state.mission)
    ].join('');
    enableOutputActions(true);
    ui.status.textContent = `${state.mission.title} generated from ${state.mission.contract.pattern.label}. Player disclosure and Moderator dossier are ready.`;
    persist();
  }

  function playerBriefingText(mission) {
    const { contract, site, disclosure } = mission;
    const lines = [
      `${mission.missionCode} — ${mission.title}`,
      '',
      `CLIENT: ${contract.client.name} — ${contract.client.publicFace}`,
      `OBJECTIVE: ${contract.objective}`,
      `SUCCESS: ${contract.successCondition}`,
      `TARGET: ${contract.target.label}; ${contract.asset}`,
      `LOCATION: ${site.siteName}, ${site.location.label}`,
      `DEADLINE: ${site.deadline.label} — ${site.deadline.clock}. ${site.deadline.event}`,
      `KNOWN OPPOSITION: ${site.opposition.label}. ${site.opposition.capability}`,
      `TEAM SCALE: ${contract.team.label}`,
      `VISIBILITY: ${visibilityConstraint(contract.visibility)}`,
      '',
      'MANDATORY DISCLOSURE',
      `Target category: ${disclosure.targetCategory}`,
      `Location and duration: ${disclosure.locationDuration}`,
      `Jurisdiction: ${disclosure.jurisdiction}`,
      `Identity or memory risk: ${disclosure.identityRisk}`,
      `Supernatural obligation: ${disclosure.supernaturalRisk}`,
      `No-return risk: ${disclosure.noReturnRisk}`,
      `Civilian exposure: ${disclosure.civilianExposure}`,
      `Support and extraction: ${disclosure.supportExtraction}`,
      `Known unknowns: ${disclosure.knownUnknowns.join(' ')}`,
      `Declared redactions: ${disclosure.redactions.join(' ')}`,
      '',
      `INSERTION: ${site.insertion.label} — ${site.insertion.detail}`,
      `SUPPORT: ${site.support.label} — ${site.support.items.join(', ')}. ${site.support.limit}`,
      `EXTRACTION: ${site.extraction.label} — ${site.extraction.detail}`,
      '',
      'KNOWN BARRIERS',
      ...site.challenges.map(challenge => `- ${challenge.label}: ${challenge.detail}`),
      '',
      'ACCEPTANCE CONDITIONS',
      ...mission.playerConstraints.map(item => `- ${item}`)
    ];
    return lines.join('\n');
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        seed: state.seed,
        counters: state.counters,
        controls: {
          pattern: ui.pattern.value,
          operation: ui.operation.value,
          layer: ui.layer.value,
          threat: ui.threat.value,
          team: ui.team.value,
          visibility: ui.visibility.value,
          forceCompromised: ui.forceCompromised.checked,
          forcePublic: ui.forcePublic.checked,
          forceCharles: ui.forceCharles.checked
        },
        mission: state.mission
      }));
    } catch (_) {
      // Generation remains available without storage.
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return false;
      state.seed = saved.seed || '';
      state.counters = { contract: 0, site: 0, truth: 0, cast: 0, ...(saved.counters || {}) };
      const controls = saved.controls || {};
      for (const [key, element] of Object.entries({ pattern: ui.pattern, operation: ui.operation, layer: ui.layer, threat: ui.threat, team: ui.team, visibility: ui.visibility })) {
        if (controls[key] && [...element.options].some(option => option.value === controls[key])) element.value = controls[key];
      }
      ui.forceCompromised.checked = Boolean(controls.forceCompromised);
      ui.forcePublic.checked = Boolean(controls.forcePublic);
      ui.forceCharles.checked = Boolean(controls.forceCharles);
      ui.seed.value = state.seed;
      state.mission = saved.mission || null;
      return Boolean(state.mission);
    } catch (_) {
      return false;
    }
  }

  function enableOutputActions(enabled) {
    [ui.rerollContract, ui.rerollSite, ui.rerollTruth, ui.rerollCast, ui.copy, ui.export, ui.printPlayer, ui.printFull].forEach(button => { button.disabled = !enabled; });
  }

  function generateComplete() {
    state.seed = ui.seed.value.trim() || createSeed();
    ui.seed.value = state.seed;
    state.counters = { contract: 0, site: 0, truth: 0, cast: 0 };
    state.mission = buildMission();
    renderMission();
  }

  function reroll(section) {
    if (!state.mission) return;
    state.counters[section] += 1;
    if (section === 'contract') {
      state.counters.site = 0;
      state.counters.truth = 0;
      state.counters.cast = 0;
      state.mission = buildMission();
    } else if (section === 'site') {
      const contract = state.mission.contract;
      const site = buildSite(contract);
      const truth = buildTruth(contract);
      const cast = buildCast(contract, site, truth);
      state.mission = {
        ...state.mission,
        generatedAt: new Date().toISOString(),
        counters: { ...state.counters },
        site,
        truth,
        cast,
        disclosure: deriveDisclosure(contract, site, truth),
        clues: buildClues(contract, site, truth),
        scenes: buildScenes(contract, site, truth, cast),
        clocks: buildClocks(contract, site),
        resolution: buildResolution(contract, site, truth),
        followUps: [truth.aftermath, `The client’s unresolved ethical concern remains: ${contract.client.ethicalConcern}`, `${site.opposition.label} adapts its procedures after the mission.`, truth.hiddenAgenda]
      };
    } else if (section === 'truth') {
      const contract = state.mission.contract;
      const site = state.mission.site;
      const truth = buildTruth(contract);
      const cast = buildCast(contract, site, truth);
      state.mission = {
        ...state.mission,
        generatedAt: new Date().toISOString(),
        counters: { ...state.counters },
        truth,
        cast,
        disclosure: deriveDisclosure(contract, site, truth),
        clues: buildClues(contract, site, truth),
        scenes: buildScenes(contract, site, truth, cast),
        resolution: buildResolution(contract, site, truth),
        followUps: [truth.aftermath, `The client’s unresolved ethical concern remains: ${contract.client.ethicalConcern}`, `${site.opposition.label} adapts its procedures after the mission.`, truth.hiddenAgenda]
      };
    } else if (section === 'cast') {
      const cast = buildCast(state.mission.contract, state.mission.site, state.mission.truth);
      state.mission = { ...state.mission, generatedAt: new Date().toISOString(), counters: { ...state.counters }, cast, scenes: buildScenes(state.mission.contract, state.mission.site, state.mission.truth, cast) };
    }
    renderMission();
  }

  async function copyBriefing() {
    if (!state.mission) return;
    const text = playerBriefingText(state.mission);
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const field = document.createElement('textarea');
      field.value = text;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    ui.status.textContent = 'Player briefing copied without Moderator-only truths.';
  }

  function exportMission() {
    if (!state.mission) return;
    const blob = new Blob([JSON.stringify(state.mission, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug(state.mission.missionCode)}-${slug(state.mission.title)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printMission(playerOnly) {
    if (!state.mission) return;
    document.body.classList.toggle('print-player', playerOnly);
    const clear = () => document.body.classList.remove('print-player');
    window.addEventListener('afterprint', clear, { once: true });
    window.print();
    setTimeout(clear, 1200);
  }

  async function initialize() {
    Object.assign(ui, {
      pattern: document.getElementById('mission-pattern'),
      operation: document.getElementById('mission-operation'),
      layer: document.getElementById('mission-layer'),
      threat: document.getElementById('mission-threat'),
      team: document.getElementById('mission-team'),
      visibility: document.getElementById('mission-visibility'),
      seed: document.getElementById('mission-seed'),
      forceCompromised: document.getElementById('mission-force-compromised'),
      forcePublic: document.getElementById('mission-force-public'),
      forceCharles: document.getElementById('mission-force-charles'),
      generate: document.getElementById('mission-generate'),
      rerollContract: document.getElementById('mission-reroll-contract'),
      rerollSite: document.getElementById('mission-reroll-site'),
      rerollTruth: document.getElementById('mission-reroll-truth'),
      rerollCast: document.getElementById('mission-reroll-cast'),
      copy: document.getElementById('mission-copy'),
      export: document.getElementById('mission-export'),
      printPlayer: document.getElementById('mission-print-player'),
      printFull: document.getElementById('mission-print-full'),
      status: document.getElementById('mission-status'),
      output: document.getElementById('mission-output')
    });

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Mission library request failed with status ${response.status}.`);
      state.data = await response.json();
      initializeControls();
      const restored = restore();
      if (restored) renderMission();
      else {
        enableOutputActions(false);
        ui.status.textContent = 'Mission library loaded. Choose parameters or leave them random, then generate a complete operation.';
      }

      ui.generate.addEventListener('click', generateComplete);
      ui.rerollContract.addEventListener('click', () => reroll('contract'));
      ui.rerollSite.addEventListener('click', () => reroll('site'));
      ui.rerollTruth.addEventListener('click', () => reroll('truth'));
      ui.rerollCast.addEventListener('click', () => reroll('cast'));
      ui.copy.addEventListener('click', copyBriefing);
      ui.export.addEventListener('click', exportMission);
      ui.printPlayer.addEventListener('click', () => printMission(true));
      ui.printFull.addEventListener('click', () => printMission(false));
    } catch (error) {
      enableOutputActions(false);
      ui.status.textContent = `The mission generator could not be loaded: ${error.message}`;
      ui.output.innerHTML = `<div class="mission-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
