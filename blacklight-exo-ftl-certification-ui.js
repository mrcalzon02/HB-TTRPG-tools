(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SAFETY_SCRIPTS = [
    'blacklight-exo-ftl-safety-calibration-runtime.js',
    'blacklight-exo-ftl-safety-certification-runtime.js',
    'blacklight-exo-ftl-route-safety-runtime.js'
  ];
  const EMBODIMENT_SCRIPT = 'blacklight-exo-ftl-control-embodiment-runtime.js';
  const BLOCKING_STATES = new Set(['REJECTED', 'UNRESOLVED', 'CONFLICT']);
  const TECHNOLOGY_BASES = [
    ['', 'Not specified — preserve unresolved'],
    ['terrestrial-electromechanical', 'Terrestrial electromechanical / industrial'],
    ['aquatic-electrochemical-hydraulic', 'Aquatic electrochemical / hydraulic'],
    ['cryogenic-ammonia-halocarbon', 'Cryogenic ammonia / halocarbon'],
    ['gas-giant-fluidic-electrostatic', 'Gas-giant fluidic / electrostatic'],
    ['biological-symbiotic', 'Biological / symbiotic'],
    ['mineral-piezoelectric-photonic', 'Mineral piezoelectric / photonic'],
    ['field-mediated-adaptive', 'Field-mediated / adaptive']
  ];

  let safetyLoadPromise = null;
  let embodimentLoadPromise = null;
  let activeSafety = null;
  let activeEmbodiment = null;
  let activeRating = null;
  let generationToken = 0;
  let routeMatrixToken = 0;
  let embodimentToken = 0;
  let activeRouteMatrix = new Map();

  function anchor(id) {
    return $(id)?.closest('.bli-section') || $('exo-ftl-route-envelope')?.closest('.bli-section') || $('exo-ftl-reliability')?.closest('.bli-section');
  }

  function section(id, eyebrow, title, anchorId, className = 'exo-ftl-grid') {
    let box = $(id);
    if (box) return box;
    const a = anchor(anchorId);
    if (!a) return null;
    const s = document.createElement('section');
    s.className = 'bli-section exo-ftl-certification-section';
    const h = document.createElement('div');
    h.className = 'bli-section-head';
    const e = document.createElement('p');
    e.className = 'bli-eyebrow';
    e.textContent = eyebrow;
    const t = document.createElement('h2');
    t.textContent = title;
    box = document.createElement('div');
    box.id = id;
    box.className = className;
    h.append(e, t);
    s.append(h, box);
    a.after(s);
    return box;
  }

  function card(label, title, text, stateValue = '') {
    const a = document.createElement('article');
    a.className = 'exo-ftl-card exo-ftl-certification-card';
    if (stateValue) a.dataset.certificationState = stateValue;
    const s = document.createElement('small');
    const h = document.createElement('h3');
    const p = document.createElement('p');
    s.textContent = label;
    h.textContent = title;
    p.textContent = text;
    a.append(s, h, p);
    return a;
  }

  function list(title, items) {
    const a = document.createElement('article');
    a.className = 'exo-ftl-calculation-list';
    const h = document.createElement('h3');
    const ul = document.createElement('ul');
    h.textContent = title;
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.append(li);
    }
    a.append(h, ul);
    return a;
  }

  function calculation(item) {
    return card('Calculation and operational meaning', item.label, `${item.expression}. Values entered: ${item.substitution}. Result: ${item.resultText}. Charles's interpretation: ${item.meaning}`);
  }

  function state(value) {
    return value === 'refused' || value === 'restricted' || ['REJECTED', 'UNRESOLVED', 'CONFLICT', 'MARGINAL'].includes(value) ? 'warning' : value === 'authorized' || value === 'ADMISSIBLE' || value === 'READY' ? 'ok' : 'resolved';
  }

  function badge(a) {
    const b = $('exo-ftl-badges');
    if (!b) return;
    b.querySelector('[data-certification-audit-badge="true"]')?.remove();
    const s = document.createElement('span');
    s.dataset.certificationAuditBadge = 'true';
    s.textContent = `Charles authorization · ${a.status}`;
    b.append(s);
  }

  function safetyBadge(safety) {
    const b = $('exo-ftl-badges');
    if (!b) return;
    b.querySelector('[data-route-safety-badge="true"]')?.remove();
    if (!safety) return;
    const s = document.createElement('span');
    s.dataset.routeSafetyBadge = 'true';
    s.textContent = `Route certificate · ${safety.status}`;
    b.append(s);
  }

  function embodimentBadge(embodiment) {
    const b = $('exo-ftl-badges');
    if (!b) return;
    b.querySelector('[data-control-embodiment-badge="true"]')?.remove();
    if (!embodiment) return;
    const s = document.createElement('span');
    s.dataset.controlEmbodimentBadge = 'true';
    s.textContent = `Control embodiment · ${embodiment.status}`;
    b.append(s);
  }

  function overview(a) {
    const c = section('exo-ftl-certification-overview', 'Charles // authorization finding', 'What I would authorize, restrict, or refuse before anyone energizes the machine.', 'exo-ftl-calculation-consistency');
    if (!c) return;
    c.replaceChildren(
      card('Current dossier disposition', a.statusLabel, a.reason, state(a.status)),
      card('Authority limit', 'A dossier is not live clearance', a.standingLimit, 'warning'),
      card('Preservation record', 'Original operational records retained', a.preservationRecord.method),
      card('Route finding', a.route.status, a.route.standingFinding, state(a.route.status)),
      card('Reliability finding', a.reliability.status, a.reliability.standingFinding, state(a.reliability.status))
    );
  }

  function route(a) {
    const r = a.route;
    const c = section('exo-ftl-certification-route', 'Charles // route authorization', 'The route geometry, traffic burden, mass-map tolerance, and live evidence I require.', 'exo-ftl-route-envelope', 'exo-ftl-calculation-stack');
    if (!c) return;
    const top = document.createElement('div');
    top.className = 'exo-ftl-grid';
    top.append(
      card('Route-model confidence', r.confidenceText, 'Confidence describes the generated route model. Live clearance remains unestablished.'),
      card('Live route state', r.liveClearance, r.standingFinding, state(r.status)),
      card('Required evidence', `${r.liveDataRequired.length} live records`, r.liveDataRequired.join(' · '))
    );
    const assumptions = document.createElement('div');
    assumptions.className = 'exo-ftl-list-grid';
    assumptions.append(list('Assumptions I inherited', r.assumptions), list('Conditions that stop authorization', r.refusalConditions));
    const calculations = document.createElement('div');
    calculations.className = 'exo-ftl-grid';
    calculations.append(...r.calculations.map(calculation));
    c.replaceChildren(top, assumptions, calculations);
  }

  function reliability(a) {
    const r = a.reliability;
    const c = section('exo-ftl-certification-reliability', 'Charles // reliability authorization', 'The repeated-use risk, calibration burden, abort authority, and redundancy standard.', 'exo-ftl-reliability', 'exo-ftl-calculation-stack');
    if (!c) return;
    const top = document.createElement('div');
    top.className = 'exo-ftl-grid';
    top.append(
      card('Reliability disposition', r.status, r.standingFinding, state(r.status)),
      card('Installation policy', r.policy.class, `${r.policy.minimumSuccessText}. ${r.policy.note}`),
      card('Reliability-model confidence', r.confidenceText, 'This remains a generated engineering estimate rather than field-service statistics.')
    );
    const assumptions = document.createElement('div');
    assumptions.className = 'exo-ftl-list-grid';
    assumptions.append(list('Assumptions I inherited', r.assumptions), list('Conditions that stop certification', r.refusalConditions));
    const calculations = document.createElement('div');
    calculations.className = 'exo-ftl-grid';
    calculations.append(...r.calculations.map(calculation));
    c.replaceChildren(top, assumptions, calculations);
  }

  function scriptLoaded(src) {
    return [...document.scripts].some(node => node.getAttribute('src') === src || node.src.endsWith(`/${src}`));
  }

  function loadScript(src, datasetKey = 'routeSafetyRuntime') {
    if (scriptLoaded(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = src;
      node.async = false;
      node.dataset[datasetKey] = 'true';
      node.addEventListener('load', resolve, {once: true});
      node.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), {once: true});
      document.head.append(node);
    });
  }

  function ensureSafetyRuntime() {
    if (globalThis.BlacklightExoFTLRouteSafetyRuntime) return Promise.resolve(globalThis.BlacklightExoFTLRouteSafetyRuntime);
    if (!safetyLoadPromise) {
      safetyLoadPromise = SAFETY_SCRIPTS.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
        .then(() => {
          if (!globalThis.BlacklightExoFTLRouteSafetyRuntime) throw new Error('FTL route-safety runtime failed to initialize.');
          return globalThis.BlacklightExoFTLRouteSafetyRuntime;
        })
        .catch(error => {
          safetyLoadPromise = null;
          throw error;
        });
    }
    return safetyLoadPromise;
  }

  function ensureEmbodimentRuntime() {
    if (globalThis.BlacklightExoFTLControlEmbodiment) return Promise.resolve(globalThis.BlacklightExoFTLControlEmbodiment);
    if (!embodimentLoadPromise) {
      embodimentLoadPromise = loadScript(EMBODIMENT_SCRIPT, 'controlEmbodimentRuntime')
        .then(() => {
          if (!globalThis.BlacklightExoFTLControlEmbodiment) throw new Error('FTL control-embodiment runtime failed to initialize.');
          return globalThis.BlacklightExoFTLControlEmbodiment;
        })
        .catch(error => {
          embodimentLoadPromise = null;
          throw error;
        });
    }
    return embodimentLoadPromise;
  }

  function ensureTechnologyBasisControl() {
    let select = $('exo-ftl-technology-basis');
    if (select) return select;
    const grid = document.querySelector('.grid.controls');
    if (!grid) return null;
    const label = document.createElement('label');
    label.setAttribute('for', 'exo-ftl-technology-basis');
    label.append(document.createTextNode('Operative technology basis'));
    select = document.createElement('select');
    select.id = 'exo-ftl-technology-basis';
    for (const [value, text] of TECHNOLOGY_BASES) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    label.append(select);
    grid.append(label);
    return select;
  }

  function requestFromPage() {
    const selectedFamily = $('exo-ftl-family')?.value || null;
    return {
      family: selectedFamily && selectedFamily !== 'random' ? selectedFamily : null,
      route: $('exo-ftl-route')?.value || null
    };
  }

  function technologyBasisFromPage() {
    return $('exo-ftl-technology-basis')?.value || null;
  }

  function profileLabel(profileIdentity) {
    if (!profileIdentity) return 'unresolved';
    if (typeof profileIdentity === 'string') return profileIdentity;
    return [profileIdentity.profileId, profileIdentity.profileVersion].filter(Boolean).join('@') || 'unresolved';
  }

  function pct(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? `${(Math.max(0, Math.min(1, Number(value))) * 100).toFixed(1)}%` : 'unresolved';
  }

  function normalizedMargin(margin, reference) {
    if (![margin, reference].every(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) || Number(reference) <= 0) return null;
    return Math.max(0, Math.min(1, Number(margin) / Number(reference)));
  }

  function meterCard(label, title, value, explanation, stateValue = '') {
    const a = card(label, title, explanation, stateValue);
    const meter = document.createElement('meter');
    meter.min = 0;
    meter.max = 1;
    meter.low = 0.25;
    meter.high = 0.65;
    meter.optimum = 1;
    if (value !== null && value !== undefined && Number.isFinite(Number(value))) meter.value = Math.max(0, Math.min(1, Number(value)));
    meter.setAttribute('aria-label', `${label}: ${title}`);
    a.append(meter);
    return a;
  }

  function renderEngineeringEnvelope(certificate = {}, safety = {}) {
    const c = section('exo-ftl-route-safety-envelope', 'Charles // engineering safety envelope', 'Why this route remains usable, marginal, or impossible.', 'exo-ftl-route-safety-live');
    if (!c) return;
    const response = certificate.familyResponse || {};
    const lookahead = certificate.sensorLookahead || {};
    const recovery = certificate.recoveryReserve || {};
    const observability = certificate.hazardObservability || {};
    const requiredCount = Array.isArray(observability.required) ? observability.required.length : 0;
    const lostCount = Array.isArray(observability.lost) ? observability.lost.length : 0;
    const coverage = requiredCount ? Math.max(0, (requiredCount - lostCount) / requiredCount) : null;
    const lookaheadRatio = normalizedMargin(lookahead.margin, lookahead.predictionTime || lookahead.predictionDistance);
    const recoveryRatio = normalizedMargin(recovery.margin, recovery.protectedReserve);
    const severity = certificate.environmentSeverity || {};
    const status = safety.status || certificate.status || 'UNRESOLVED';

    c.replaceChildren(
      meterCard('Gravity retention', pct(response.gravityEfficiency), response.gravityEfficiency, 'Retained modeled route efficiency after family-specific gravitational/environmental penalty.', state(status)),
      meterCard('Calculation retention', pct(response.calculationEfficiency), response.calculationEfficiency, 'Retained solution quality after covariance and family-specific miscalculation amplification.', state(status)),
      meterCard('Actionable lookahead', lookaheadRatio === null ? 'unresolved' : pct(lookaheadRatio), lookaheadRatio, Number.isFinite(Number(lookahead.margin)) ? `Intervention margin ${Number(lookahead.margin).toFixed(2)} against a prediction horizon of ${Number(lookahead.predictionTime || lookahead.predictionDistance).toFixed(2)}.` : 'Prediction/intervention timing is unresolved.', state(lookahead.status)),
      meterCard('Recovery reserve', recoveryRatio === null ? 'unresolved' : pct(recoveryRatio), recoveryRatio, Number.isFinite(Number(recovery.margin)) ? `Protected recovery margin ${Number(recovery.margin).toFixed(2)} after the required recovery authority is escrowed.` : 'Protected recovery authority is unresolved.', state(recovery.status)),
      meterCard('Hazard observability', coverage === null ? 'unresolved' : pct(coverage), coverage, requiredCount ? `${requiredCount - lostCount} of ${requiredCount} required hazard channels remain directly observable or independently guarded.` : 'No bounded hazard set was returned.', state(observability.status)),
      card('Environment severity', Number.isFinite(Number(severity.value)) ? Number(severity.value).toFixed(3) : 'unresolved', 'Normalized severity is a versioned simulation/calibration quantity, not an astrophysical constant.', state(severity.status))
    );
  }

  function mergedReasons(safety) {
    return [...new Set([
      ...(Array.isArray(safety?.presentation?.reasons) ? safety.presentation.reasons : []),
      ...(Array.isArray(safety?.warnings) ? safety.warnings : [])
    ])];
  }

  function renderSafety(rating, safety) {
    activeSafety = safety;
    globalThis.BlacklightExoGetActiveFTLSafety = () => activeSafety;
    globalThis.BlacklightExoGetActiveFTLRouteMatrix = () => new Map(activeRouteMatrix);
    safetyBadge(safety);
    const c = section('exo-ftl-route-safety-live', 'Charles // modeled route safety certificate', 'Generated performance is not certification. This gate applies family-specific environment, uncertainty, observability, intervention, and recovery rules before a route is presented as usable.', 'exo-ftl-certification-route', 'exo-ftl-calculation-stack');
    if (c) {
      const reasons = mergedReasons(safety);
      const certificate = safety?.certificate || {};
      const response = certificate.familyResponse || {};
      const recovery = certificate.recoveryReserve || certificate.recovery || certificate.recoveryState || {};
      const calibration = safety?.calibration || {};
      const top = document.createElement('div');
      top.className = 'exo-ftl-grid';
      top.append(
        card('Route certificate', safety?.presentation?.label || safety?.status || 'UNRESOLVED', reasons.length ? reasons.join(' · ') : 'No blocking reason was returned by the modeled certificate.', state(safety?.status)),
        card('Family / route', `${safety?.family || 'unresolved'} · ${safety?.route || 'unresolved'}`, `Safety path ${safety?.path || 'unresolved'}. Generated architecture remains ${rating?.identity?.name || 'unnamed'}.`),
        card('Calibration provenance', profileLabel(calibration.profileIdentity), `Calibration status ${calibration.status || 'UNRESOLVED'}. Numerical profiles are simulation calibration, not setting constants.`, state(calibration.status)),
        card('Gravity efficiency', pct(response.gravityEfficiency), 'Family-specific route efficiency after modeled gravitational/environmental penalty.'),
        card('Calculation efficiency', pct(response.calculationEfficiency), 'Efficiency retained after uncertainty and family-specific miscalculation amplification.'),
        card('Recovery protection', Number.isFinite(Number(recovery.protectedReserve)) ? String(recovery.protectedReserve) : 'modeled by certificate', 'Protected recovery authority is not available for nominal performance optimization.')
      );
      const details = document.createElement('div');
      details.className = 'exo-ftl-list-grid';
      details.append(
        list('Certificate reasons / warnings', reasons.length ? reasons : ['No blocking warnings returned.']),
        list('Provenance', safety?.provenance?.length ? safety.provenance : ['No provenance roots returned.'])
      );
      c.replaceChildren(top, details);
      renderEngineeringEnvelope(certificate, safety);
    }

    const summary = $('exo-ftl-summary-speed');
    if (summary) {
      const blocked = safety?.presentation?.blocking;
      if (blocked) summary.textContent = safety.presentation.label;
      else if (safety?.status === 'MARGINAL') summary.textContent = `${rating?.performance?.cStatus?.label || 'Generated rate'} · MARGINAL`;
      else if (safety?.status === 'ADMISSIBLE') summary.textContent = `${rating?.performance?.cStatus?.label || 'Generated rate'} · CERTIFIED`;
      else summary.textContent = safety?.presentation?.label || 'Certification unresolved';
      summary.dataset.routeCertification = safety?.status || 'UNRESOLVED';
    }
  }

  function textItems(value) {
    if (Array.isArray(value)) return value.map(item => String(item));
    if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(', ') : String(item)}`);
    return value === null || value === undefined || value === '' ? [] : [String(value)];
  }

  function renderEmbodiment(rating, embodiment) {
    activeEmbodiment = embodiment;
    globalThis.BlacklightExoGetActiveFTLControlEmbodiment = () => activeEmbodiment;
    embodimentBadge(embodiment);
    const c = section('exo-ftl-control-embodiment-live', 'Charles // native control embodiment', 'The same transit physics, built and operated through this technology basis rather than a universal human dashboard.', 'exo-ftl-route-safety-envelope', 'exo-ftl-calculation-stack');
    if (!c) return;
    const basis = embodiment?.technologyBasis || technologyBasisFromPage() || 'unresolved';
    const warnings = textItems(embodiment?.canonWarnings);
    const top = document.createElement('div');
    top.className = 'exo-ftl-grid';
    top.append(
      card('Embodiment state', embodiment?.status || 'UNRESOLVED', embodiment?.status === 'READY' ? 'Technology-basis machinery is resolved for this generated dossier.' : 'The technology basis is unresolved or the embodiment runtime cannot safely resolve it.', state(embodiment?.status)),
      card('Technology basis', basis, `Basis class ${embodiment?.basisClass || 'unresolved'}; provenance ${embodiment?.provenanceClass || 'unresolved'}.`),
      card('Transit-family relationship', embodiment?.transitFamily || activeSafety?.family || rating?.identity?.family || 'unresolved', `Family provenance ${embodiment?.transitFamilyProvenance || 'unresolved'}. Control style never assigns an unresolved named-race FTL family.`),
      card('Human interoperability', embodiment?.humanInteroperability || 'unresolved', 'Translation/adaptation may expose native state, but it may not replace or silently normalize that state.'),
      card('Scale context', rating?.identity?.scale || 'unresolved', textItems(embodiment?.scaling).join(' · ') || 'No basis-specific scale guidance returned.'),
      card('Service environment', textItems(embodiment?.serviceEnvironment)[0] || 'unresolved', textItems(embodiment?.serviceEnvironment).slice(1).join(' · ') || 'No additional service-environment constraint returned.')
    );
    const details = document.createElement('div');
    details.className = 'exo-ftl-list-grid';
    details.append(
      list('Native navigation representation', textItems(embodiment?.navigationRepresentation).length ? textItems(embodiment.navigationRepresentation) : ['Unresolved.']),
      list('Sensor architecture', textItems(embodiment?.sensorArchitecture).length ? textItems(embodiment.sensorArchitecture) : ['Unresolved.']),
      list('Control architecture', textItems(embodiment?.controlArchitecture).length ? textItems(embodiment.controlArchitecture) : ['Unresolved.']),
      list('Abort embodiment', textItems(embodiment?.abortEmbodiment).length ? textItems(embodiment.abortEmbodiment) : ['Unresolved.']),
      list('Maintenance doctrine', textItems(embodiment?.maintenanceDoctrine).length ? textItems(embodiment.maintenanceDoctrine) : ['Unresolved.']),
      list('Failure signatures', textItems(embodiment?.failureSignatures).length ? textItems(embodiment.failureSignatures) : ['Unresolved.']),
      list('Infrastructure / service burden', textItems(embodiment?.infrastructure).length ? textItems(embodiment.infrastructure) : ['No additional infrastructure guidance returned.']),
      list('Canon safeguards', warnings.length ? warnings : ['No additional canon warning returned.'])
    );
    c.replaceChildren(top, details);
  }

  function resetRouteOption(option) {
    if (!option.dataset.routeSafetyBaseLabel) option.dataset.routeSafetyBaseLabel = option.textContent;
    option.textContent = option.dataset.routeSafetyBaseLabel;
    option.disabled = false;
    delete option.dataset.routeSafetyStatus;
    option.removeAttribute('aria-label');
  }

  function applyRouteMatrix(matrix) {
    const selector = $('exo-ftl-route');
    if (!selector) return;
    const current = selector.value;
    [...selector.options].forEach(option => {
      resetRouteOption(option);
      const result = matrix.get(option.value);
      if (!result) return;
      option.dataset.routeSafetyStatus = result.status;
      option.textContent = `${option.dataset.routeSafetyBaseLabel} · ${result.status}`;
      option.setAttribute('aria-label', `${option.dataset.routeSafetyBaseLabel}; modeled certificate ${result.status}`);
      if (BLOCKING_STATES.has(result.status) && option.value !== current) option.disabled = true;
    });
    selector.dataset.routeSafetyGuarded = 'true';
  }

  async function certifyRouteMatrix(rating, runtime, token) {
    const selector = $('exo-ftl-route');
    if (!selector) return;
    const family = requestFromPage().family;
    const routeIds = [...selector.options].map(option => option.value);
    const results = await Promise.all(routeIds.map(routeId => runtime.resolveGeneratedFTLRouteSafety({rating, request: {family, route: routeId}})));
    if (token !== routeMatrixToken || rating !== activeRating) return;
    activeRouteMatrix = new Map(routeIds.map((routeId, index) => [routeId, results[index]]));
    applyRouteMatrix(activeRouteMatrix);
  }

  async function resolveEmbodiment(rating, safety = activeSafety) {
    if (!rating) return;
    const token = ++embodimentToken;
    const technologyBasis = technologyBasisFromPage();
    if (!technologyBasis) {
      renderEmbodiment(rating, {
        status: 'UNRESOLVED',
        technologyBasis: null,
        transitFamily: safety?.family || rating?.identity?.family || null,
        transitFamilyProvenance: 'generated-family-preserved; technology-basis-unresolved',
        canonWarnings: ['No operative technology basis was selected. The dossier remains unresolved rather than defaulting to terrestrial machinery.']
      });
      return;
    }
    try {
      const runtime = await ensureEmbodimentRuntime();
      const result = await runtime.resolveFTLControlEmbodiment({
        technologyBasis,
        transitFamily: safety?.family || rating?.identity?.family || null,
        pathLevel: rating?.identity?.tierRank ?? null,
        vesselScale: rating?.identity?.scale || null,
        manufacturer: rating?.identity?.manufacturer || null,
        sourceContext: {
          source: 'blacklight-exo-ftl-certification-ui.js',
          generatedFamily: rating?.identity?.family || null,
          certifiedFamily: safety?.family || null,
          designIntentDocumentId: '1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y',
          designIntentRevisionId: 'ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0'
        }
      });
      if (token !== embodimentToken || rating !== activeRating) return;
      renderEmbodiment(rating, result);
    } catch (error) {
      if (token !== embodimentToken || rating !== activeRating) return;
      console.error('Unable to resolve FTL control embodiment.', error);
      renderEmbodiment(rating, {
        status: 'UNRESOLVED',
        technologyBasis,
        transitFamily: safety?.family || rating?.identity?.family || null,
        transitFamilyProvenance: 'runtime-unavailable',
        canonWarnings: [error.message]
      });
    }
  }

  async function certifyGeneratedRating(rating) {
    if (!rating) return;
    activeRating = rating;
    const token = ++generationToken;
    const matrixToken = ++routeMatrixToken;
    try {
      const runtime = await ensureSafetyRuntime();
      const safety = await runtime.resolveGeneratedFTLRouteSafety({rating, request: requestFromPage()});
      if (token !== generationToken || rating !== activeRating) return;
      renderSafety(rating, safety);
      resolveEmbodiment(rating, safety);
      certifyRouteMatrix(rating, runtime, matrixToken).catch(error => console.error('Unable to resolve FTL route safety matrix.', error));
    } catch (error) {
      if (token !== generationToken || rating !== activeRating) return;
      console.error('Unable to resolve FTL route safety certificate.', error);
      const unresolved = {status: 'UNRESOLVED', presentation: {label: 'Unresolved — certification runtime unavailable', blocking: true, reasons: [error.message]}, warnings: [error.message], provenance: []};
      renderSafety(rating, unresolved);
      resolveEmbodiment(rating, unresolved);
    }
  }

  function render(rating) {
    if (!rating) return;
    activeRating = rating;
    const a = rating.certificationAudit;
    if (a) {
      badge(a);
      overview(a);
      route(a);
      reliability(a);
    }
    certifyGeneratedRating(rating);
  }

  function exportCertifiedDossier(event) {
    const rating = globalThis.BlacklightExoGetActiveFTL?.();
    if (!rating || !activeSafety) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = {
      ...rating,
      routeSafetyCertificate: activeSafety,
      routeSafetyMatrix: Object.fromEntries(activeRouteMatrix),
      controlEmbodiment: activeEmbodiment,
      certificationExport: {
        schemaVersion: '1.2.0',
        generatedCapabilityIsNotRouteCertification: true,
        blocked: Boolean(activeSafety.presentation?.blocking),
        status: activeSafety.status,
        routeSelectorGuarded: $('exo-ftl-route')?.dataset.routeSafetyGuarded === 'true',
        technologyBasisExplicit: Boolean(technologyBasisFromPage()),
        controlEmbodimentStatus: activeEmbodiment?.status || 'UNRESOLVED',
        generatedFamilyPreserved: true,
        provenance: [...new Set([...(activeSafety.provenance || []), 'blacklight-exo-ftl-control-embodiment-runtime.js'])]
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = rating.fileName || 'blacklight-ftl-dossier.json';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function recertifyFromControls() {
    const rating = globalThis.BlacklightExoGetActiveFTL?.();
    if (rating) certifyGeneratedRating(rating);
  }

  function reembodyFromControl() {
    const rating = globalThis.BlacklightExoGetActiveFTL?.();
    if (rating) resolveEmbodiment(rating, activeSafety);
  }

  const technologyBasisControl = ensureTechnologyBasisControl();
  technologyBasisControl?.addEventListener('change', reembodyFromControl);
  document.addEventListener('blacklight:exo-ftl-generated', event => render(event.detail?.rating));
  $('exo-ftl-export')?.addEventListener('click', exportCertifiedDossier, true);
  $('exo-ftl-route')?.addEventListener('change', recertifyFromControls);
  $('exo-ftl-family')?.addEventListener('change', recertifyFromControls);
  queueMicrotask(() => render(globalThis.BlacklightExoGetActiveFTL?.()));
})();
