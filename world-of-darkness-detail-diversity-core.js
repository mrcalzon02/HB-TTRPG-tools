((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODDetailDiversityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const STATUS_ORDER = ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'];
  const STATUS_COUNTS = [12, 6, 2, 1];
  const FALLBACK_PROTOTYPES = {
    restaurant: [6, 2, 5], bar: [6, 2, 5], night_club: [6, 5, 2],
    book_store: [6, 4, 2], library: [4, 6, 10], hospital: [4, 5, 9], pharmacy: [6, 4, 2],
    cemetery: [10, 7, 4], park: [7, 10, 5], store: [6, 2, 8], lodging: [4, 5, 6],
    church: [10, 7, 4], transit_station: [3, 1, 9], government: [4, 5, 1], office: [4, 5, 1],
    industrial: [8, 9, 5], natural_feature: [7, 10, 9], road: [1, 3, 9], education: [4, 7, 6],
    historic: [10, 4, 7], fitness: [5, 7, 6], sports: [5, 7, 2], other: [4, 6, 1]
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const capitalize = value => {
    const text = String(value || '');
    return text ? text[0].toUpperCase() + text.slice(1) : text;
  };
  const humanize = value => String(value || '').replace(/[_:]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

  function hash32(input) {
    let hash = 2166136261;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function gcd(left, right) {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function strideFor(seed, length) {
    if (length <= 1) return 1;
    let stride = (seed % (length - 1)) + 1;
    while (gcd(stride, length) !== 1) stride = stride % length + 1;
    return stride;
  }

  function neighborhoodKey(location, cellDegrees = 0.015) {
    const lat = Number(location?.lat || 0);
    const lng = Number(location?.lng || 0);
    return `${Math.floor(lat / cellDegrees)}:${Math.floor(lng / cellDegrees)}`;
  }

  function inventoryStatusFromSeed(seed) {
    const slot = Number(seed >>> 0) % 21;
    let cursor = 0;
    for (let index = 0; index < STATUS_ORDER.length; index += 1) {
      cursor += STATUS_COUNTS[index];
      if (slot < cursor) return STATUS_ORDER[index];
    }
    return 'MUNDANE';
  }

  function allContexts(baseLocations, contextExpansion) {
    return [
      ...(baseLocations?.contextVariants || []),
      ...(contextExpansion?.contextVariants || [])
    ];
  }

  function applicabilityScore(app, location, line) {
    if (!app) return 0;
    let score = 0;
    const category = normalize(location.category).replaceAll(' ', '_');
    const featureText = `${normalize(location.featureLabel)} ${Object.entries(location.sourceTags || {}).map(([key, value]) => `${normalize(key)} ${normalize(value)}`).join(' ')}`;
    const categories = (app.categories || app.categoryHooks || []).map(value => normalize(value).replaceAll(' ', '_'));
    if (categories.includes(category)) score += 12;
    else if (categories.includes('all')) score += 3;
    const gameLines = app.gameLines || [];
    if (gameLines.includes(line)) score += 10;
    else if (gameLines.includes('all')) score += 4;
    for (const hook of app.featureHooks || []) if (featureText.includes(normalize(hook))) score += 4;
    for (const [key, allowed] of Object.entries(app.tagHooks || {})) {
      const actual = location.sourceTags?.[key];
      if (actual == null) continue;
      const values = Array.isArray(allowed) ? allowed.map(normalize) : [normalize(allowed)];
      if (values.includes('*') || values.includes(normalize(actual))) score += 8;
    }
    return score;
  }

  function createSession(data) {
    const pools = data?.pools || {};
    const cellDegrees = Number(data?.neighborhoodCellDegrees || 0.015);
    const used = new Map();

    function usageSet(location, line, field) {
      const key = `${neighborhoodKey(location, cellDegrees)}|${line}|${field}`;
      if (!used.has(key)) used.set(key, new Set());
      return used.get(key);
    }

    function pick(field, list, location, line, salt = '', options = {}) {
      const values = Array.isArray(list) ? list : [];
      if (!values.length) return null;
      const region = neighborhoodKey(location, cellDegrees);
      if (options.sharedRegional) return values[hash32(`${region}|${line}|${field}`) % values.length];
      const set = usageSet(location, line, field);
      const startSeed = hash32(`${location.entryKey || location.osmId}|${line}|${field}|${salt}`);
      const start = startSeed % values.length;
      const stride = strideFor(hash32(`${field}|${salt}|stride`), values.length);
      let index = start;
      for (let attempt = 0; attempt < values.length; attempt += 1) {
        const fingerprint = typeof values[index] === 'object' ? values[index].id || JSON.stringify(values[index]) : String(values[index]);
        if (!set.has(fingerprint)) {
          set.add(fingerprint);
          return values[index];
        }
        index = (index + stride) % values.length;
      }
      return values[(start + Math.floor(set.size / values.length)) % values.length];
    }

    function pickScored(field, candidates, location, line, salt, scoreFn) {
      if (!candidates.length) return null;
      const ranked = candidates.map(candidate => ({
        candidate,
        score: scoreFn(candidate) + hash32(`${location.entryKey}|${line}|${field}|${candidate.id || candidate.sourcePrototype || candidate.title}`) / 0xffffffff
      })).sort((left, right) => right.score - left.score);
      const bestScore = ranked[0].score;
      const shortlist = ranked.filter(item => item.score >= bestScore - 4).map(item => item.candidate);
      return pick(field, shortlist, location, line, salt);
    }

    function themeFor(location, line) {
      const list = pools.regionalThemes?.[line] || pools.regionalThemes?.unified || [];
      return pick('regional-theme', list, location, line, '', { sharedRegional: true }) || {
        id: 'unclassified-region', label: 'Unclassified Regional Pressure', faction: 'unknown', description: 'No stable regional supernatural pattern has been identified.'
      };
    }

    function chooseContext(location, line, status, baseLocations, contextExpansion) {
      const candidates = allContexts(baseLocations, contextExpansion).filter(context => context.inventoryStatus === status);
      return pickScored('context', candidates, location, line, status, context => applicabilityScore({
        gameLines: context.gameLines,
        categories: context.categoryHooks,
        featureHooks: context.featureHooks,
        tagHooks: context.tagHooks
      }, location, line));
    }

    function choosePrototype(location, line, baseLocations, contextExpansion) {
      const prototypes = baseLocations?.prototypes || [];
      const affinities = contextExpansion?.prototypeAffinity || [];
      const fallback = FALLBACK_PROTOTYPES[location.category] || FALLBACK_PROTOTYPES.other;
      return pickScored('prototype', prototypes, location, line, location.category, prototype => {
        const affinity = affinities.find(item => item.sourcePrototype === prototype.sourcePrototype);
        let score = applicabilityScore(affinity, location, line);
        const fallbackIndex = fallback.indexOf(prototype.sourcePrototype);
        if (fallbackIndex >= 0) score += 9 - fallbackIndex * 2;
        return score;
      });
    }

    function interpolate(text, location) {
      return String(text || '')
        .replaceAll('{category}', normalize(location.categoryLabel || humanize(location.category) || 'named location'))
        .replaceAll('{feature}', normalize(location.featureLabel || 'named map feature'));
    }

    function generate(input) {
      const location = input.location;
      const line = input.line || 'unified';
      const status = input.inventoryStatus || inventoryStatusFromSeed(input.seed || 0);
      const theme = themeFor(location, line);
      const context = chooseContext(location, line, status, input.baseLocations, input.contextExpansion) || {
        id: 'unclassified-context', title: 'Unclassified Context', effect: 'No stable context was selected.', mechanicalSeed: 'Treat the first interpretation as provisional.', inventoryStatus: status
      };
      const prototype = choosePrototype(location, line, input.baseLocations, input.contextExpansion) || input.baseLocations?.prototypes?.[0] || { sourcePrototype: 1 };
      const contexts = allContexts(input.baseLocations, input.contextExpansion);
      const prototypeIndex = Math.max(0, (input.baseLocations?.prototypes || []).findIndex(item => item.sourcePrototype === prototype.sourcePrototype));
      const contextIndex = Math.max(0, contexts.findIndex(item => item.id === context.id));
      const variant = prototypeIndex * Math.max(1, contexts.length) + contextIndex + 1;

      const facade = interpolate(pick('facade-opener', pools.publicFacadeOpeners, location, line, status), location);
      const facadeDetail = pick('facade-detail', pools.facadeDetails, location, line, status);
      const pressure = pick('operational-pressure', pools.operationalPressures, location, line, status);
      const statusManifestation = pick(`status-${status}`, pools.statusManifestations?.[status], location, line, context.id);
      const lineManifestation = pick(`line-${line}`, pools.lineManifestations?.[line] || pools.lineManifestations?.unified, location, line, context.id);
      const complication = pick('mechanical-complication', pools.mechanicalComplications, location, line, context.id);

      let hiddenFunction;
      if (status === 'MUNDANE') hiddenFunction = `No confirmed supernatural function. ${statusManifestation} The wider ${theme.label} may shape local speculation, but no evidence assigns this location an occult role.`;
      else if (status === 'TANGENTIAL') hiddenFunction = `${statusManifestation} Regional theme: ${theme.label} — ${theme.description} ${lineManifestation} The trace does not establish ownership or permanent occupation.`;
      else if (status === 'ACTIVE_UNREGISTERED') hiddenFunction = `${statusManifestation} Regional theme: ${theme.label} — ${theme.description} ${lineManifestation}`;
      else hiddenFunction = `${statusManifestation} Regional theme: ${theme.label} — ${theme.description} ${lineManifestation}`;

      const supernatural = status !== 'MUNDANE';
      const alignments = pools.characterAlignments?.[line] || pools.characterAlignments?.unified || [];
      const alignment = pick('character-alignment', alignments, location, line, theme.id);
      const tenure = pick('character-tenure', pools.tenures, location, line, theme.id);
      const aesthetic = pick('character-aesthetic', pools.aestheticProfiles, location, line, alignment);
      const tell = pick('character-tell', pools.behavioralTells, location, line, alignment);
      const temporalObject = pick('temporal-object', pools.temporalObjects, location, line, alignment);
      const anchorBehavior = pick('anchor-behavior', pools.anchorBehaviors, location, line, temporalObject);
      const trauma = pick('trauma', pools.traumaEvents, location, line, alignment);
      const secret = pick('secret-operation', pools.secretOperations, location, line, theme.id);
      const vulnerability = pick('vulnerability', pools.vulnerabilities, location, line, alignment);
      const sensoryCondition = pick('sensory-condition', pools.sensoryConditions, location, line, status);
      const sensoryConsequence = pick('sensory-consequence', pools.sensoryConsequences, location, line, sensoryCondition);
      const mediaSource = pick('media-source', pools.mediaSources, location, line, status);
      const mediaEvent = pick('media-event', pools.mediaEvents, location, line, mediaSource);
      const mediaInstruction = pick('media-instruction', pools.mediaInstructions, location, line, mediaEvent);
      const rumorSource = pick('rumor-source', pools.rumorSources, location, line, status);
      const rumorClaim = pick('rumor-claim', pools.rumorClaims, location, line, rumorSource);
      const rumorConsequence = pick('rumor-consequence', pools.rumorConsequences, location, line, rumorClaim);

      const publicFacade = `${location.name} ${facade}. ${facadeDetail} ${pressure}`;
      const contextEffect = `${context.effect} ${statusManifestation}`;
      const mechanicalSeed = `${context.mechanicalSeed} ${complication}`;
      const embeddedCharacter = supernatural ? `${alignment}; ${tenure} — ${aesthetic}. ${tell}` : 'No supernatural custodian is assigned.';
      const temporalAnchor = supernatural ? `${capitalize(temporalObject)}. ${anchorBehavior}` : 'No occult temporal anchor is recorded.';
      const traumaticCatalyst = supernatural ? `They ${trauma}.` : 'No supernatural catalyst is documented.';
      const operationalSecret = supernatural ? `They are ${secret}.` : 'No active supernatural plot is confirmed.';
      const characterVulnerability = supernatural ? `They ${vulnerability}.` : 'Ordinary commercial, civic, operational, and structural vulnerabilities only.';
      const sensoryAnchor = `${capitalize(sensoryCondition)}. ${sensoryConsequence}`;
      const mediaFeed = `“${capitalize(mediaSource)}: ${capitalize(mediaEvent)}. ${mediaInstruction}”`;
      const rumor = `${capitalize(rumorSource)} say ${rumorClaim}. ${rumorConsequence}`;

      return {
        status,
        context,
        prototype,
        variant,
        effectiveVariantCount: Math.max(1, (input.baseLocations?.prototypes || []).length) * Math.max(1, contexts.length),
        regionalTheme: clone(theme),
        publicFacade,
        hiddenFunction,
        contextTitle: context.title,
        contextEffect,
        mechanicalSeed,
        embeddedCharacter,
        temporalAnchor,
        traumaticCatalyst,
        operationalSecret,
        vulnerability: characterVulnerability,
        sensoryAnchor,
        mediaFeed,
        rumor,
        diversitySignature: hash32([facade, facadeDetail, pressure, statusManifestation, lineManifestation, alignment, tenure, aesthetic, tell, temporalObject, trauma, secret, vulnerability, sensoryCondition, sensoryConsequence, mediaSource, mediaEvent, mediaInstruction, rumorSource, rumorClaim, rumorConsequence].join('|')).toString(16).padStart(8, '0')
      };
    }

    return Object.freeze({ generate, pick, themeFor, neighborhoodKey: location => neighborhoodKey(location, cellDegrees), used });
  }

  return Object.freeze({ hash32, inventoryStatusFromSeed, neighborhoodKey, createSession });
});
