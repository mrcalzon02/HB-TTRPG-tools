((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODContextAwareCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const POOLS = ['population', 'struggles', 'adventureHooks', 'locationSeeds', 'items'];
  const STATUS_LABELS = {
    MUNDANE: 'Mundane / No Known Connection',
    TANGENTIAL: 'Tangential / Peripheral Association',
    ACTIVE_UNREGISTERED: 'Active but Unregistered',
    INVENTORIED: 'Formally Inventoried'
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const humanize = value => String(value || '').replace(/[_:]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

  function hash32(input) {
    let hash = 2166136261;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function combinedContexts(baseLocations, contextExpansion) {
    return [
      ...(baseLocations?.contextVariants || []),
      ...(contextExpansion?.contextVariants || [])
    ];
  }

  function combinedPool(baseCrosslinks, crosslinkExpansion, poolName) {
    return [
      ...(baseCrosslinks?.[poolName] || []),
      ...(crosslinkExpansion?.[poolName] || [])
    ];
  }

  function signalsForPackage(pkg) {
    const location = pkg?.location || {};
    const spatial = location.spatialContext || {};
    const snapshot = location.contextSnapshot || {};
    const sourceTags = spatial.sourceTags || {};
    const featureLabel = String(spatial.featureLabel || snapshot.namedFeatureClass || 'Named Map Feature');
    const tagText = Object.entries(sourceTags)
      .map(([key, value]) => `${normalize(key)} ${normalize(value)}`)
      .join(' ');
    return {
      gameLine: pkg?.gameLine || 'unified',
      category: normalize(location.category || 'other').replaceAll(' ', '_'),
      featureLabel,
      featureText: `${normalize(featureLabel)} ${tagText}`,
      sourceTags,
      status: location.inventoryStatus || 'MUNDANE',
      locationKey: pkg?.locationKey || location.locationKey || '',
      worldSeedKey: pkg?.worldSeedKey || '',
      worldSeedLabel: pkg?.worldSeedLabel || '',
      name: location.name || 'Unnamed Location',
      address: location.address || ''
    };
  }

  function matchesTagHook(sourceTags, tagHooks = {}) {
    let score = 0;
    const matched = [];
    for (const [key, allowed] of Object.entries(tagHooks || {})) {
      const actual = sourceTags?.[key];
      if (actual == null) continue;
      const values = Array.isArray(allowed) ? allowed.map(normalize) : [normalize(allowed)];
      const normalizedActual = normalize(actual);
      if (values.includes('*') || values.includes(normalizedActual)) {
        score += 7;
        matched.push(`${key}=${actual}`);
      }
    }
    return { score, matched };
  }

  function scoreApplicability(applicability, signals, id) {
    const app = applicability || {};
    let score = 0;
    const matched = [];
    const gameLines = app.gameLines || [];
    if (!gameLines.length) score += 1;
    else if (gameLines.includes(signals.gameLine)) {
      score += 14;
      matched.push(`game:${signals.gameLine}`);
    } else if (gameLines.includes('all')) {
      score += 5;
      matched.push('game:all');
    } else if (signals.gameLine === 'unified' && gameLines.some(line => line !== 'all')) {
      score += 2;
    } else score -= 8;

    const categories = (app.categories || app.categoryHooks || []).map(value => normalize(value).replaceAll(' ', '_'));
    if (!categories.length) score += 1;
    else if (categories.includes(signals.category)) {
      score += 10;
      matched.push(`category:${signals.category}`);
    } else if (categories.includes('all')) {
      score += 3;
      matched.push('category:all');
    } else score -= 2;

    const featureHooks = app.featureHooks || [];
    for (const hook of featureHooks) {
      if (signals.featureText.includes(normalize(hook))) {
        score += 4;
        matched.push(`feature:${hook}`);
      }
    }

    const tagResult = matchesTagHook(signals.sourceTags, app.tagHooks);
    score += tagResult.score;
    matched.push(...tagResult.matched.map(value => `tag:${value}`));

    const jitter = hash32(`${signals.worldSeedKey}|${signals.locationKey}|${signals.gameLine}|${id}`) / 0xffffffff;
    return { score: score + jitter, matched };
  }

  function selectScored(candidates, signals, getApplicability = candidate => candidate.applicability || candidate) {
    if (!candidates.length) return { value: null, matched: [], score: -Infinity };
    const scored = candidates.map(candidate => {
      const result = scoreApplicability(getApplicability(candidate), signals, candidate.id || candidate.sourcePrototype || candidate.title);
      return { value: candidate, ...result };
    });
    scored.sort((a, b) => b.score - a.score || String(a.value.id || '').localeCompare(String(b.value.id || '')));
    return scored[0];
  }

  function selectPrototype(baseLocations, contextExpansion, signals) {
    const prototypes = baseLocations?.prototypes || [];
    const affinities = contextExpansion?.prototypeAffinity || [];
    if (!prototypes.length) return { prototype: null, matched: [], score: -Infinity };
    const candidates = prototypes.map(prototype => {
      const affinity = affinities.find(item => item.sourcePrototype === prototype.sourcePrototype) || {};
      const result = scoreApplicability(affinity, signals, `prototype-${prototype.sourcePrototype}`);
      return { prototype, ...result };
    });
    candidates.sort((a, b) => b.score - a.score || a.prototype.sourcePrototype - b.prototype.sourcePrototype);
    return candidates[0];
  }

  function settingInterpretation(prototype, context, frame, signals) {
    if (!prototype) return context.effect;
    const line = signals.gameLine;
    if (line === 'vampire') return prototype.kindredLayer;
    if (line === 'werewolf') return prototype.umbralLayer;
    if (line === 'breeds') return `${prototype.umbralLayer} A Changing Breed may interpret the same territory through species duty, migration, kinship, or ecological niche rather than Garou jurisdiction.`;
    if (line === 'mage') return prototype.awakenedVector;
    if (line === 'hunter') return `Hunter reading: the location's ordinary systems create evidence, access, and vulnerability. ${prototype.mundaneBase.description}`;
    if (line === 'changeling') return `Dreaming reflection: ${context.effect} The site's repeated human stories and emotional use determine whether wonder or Banality dominates.`;
    return `Kindred: ${prototype.kindredLayer} Garou and Fera: ${prototype.umbralLayer} Awakened: ${prototype.awakenedVector} Other systems must reconcile these readings through the location's real-world function.`;
  }

  function contextNarrative(status, context, interpretation, signals) {
    const base = `${context.effect} ${interpretation}`;
    if (status === 'MUNDANE') {
      return `No confirmed supernatural function. ${context.effect} The ${humanize(signals.gameLine)} frame should be used only to test assumptions, identify human consequences, and decide what evidence would actually justify escalation.`;
    }
    if (status === 'TANGENTIAL') {
      return `${base} The place is contextually relevant, but the trace does not establish ownership or permanent occupation.`;
    }
    if (status === 'ACTIVE_UNREGISTERED') {
      return `${base} The effect or operation is active but remains unofficial, disputed, temporary, or deliberately absent from formal ledgers.`;
    }
    return `${base} The site is formally recognized, monitored, claimed, or administratively governed within this world seed.`;
  }

  function evidenceConfidence(status) {
    if (status === 'MUNDANE') return 'No credible supernatural evidence; real-world operations explain the observed pattern.';
    if (status === 'TANGENTIAL') return 'Contextual evidence is credible, but control, ownership, and current occupation remain unproven.';
    if (status === 'ACTIVE_UNREGISTERED') return 'Repeatable supernatural activity is present without a stable public mandate or recognized custodian.';
    return 'The location has formal supernatural documentation, custodianship, monitoring, or recognized jurisdiction.';
  }

  function catalogueNote(status) {
    if (status === 'MUNDANE') return 'Not included in supernatural inventories; preserve the ordinary explanation unless new evidence changes the status.';
    if (status === 'TANGENTIAL') return 'Recorded only as a peripheral route, trace, witness site, resonance catchment, or contextual reference.';
    if (status === 'ACTIVE_UNREGISTERED') return 'Operationally significant but absent from, concealed from, or disputed within formal faction records.';
    return 'Formally inventoried under at least one supernatural authority, with possible overlapping jurisdiction.';
  }

  function chooseContext(baseLocations, contextExpansion, signals) {
    const contexts = combinedContexts(baseLocations, contextExpansion).filter(context => context.inventoryStatus === signals.status);
    return selectScored(contexts, signals, context => ({
      gameLines: context.gameLines,
      categories: context.categoryHooks,
      featureHooks: context.featureHooks,
      tagHooks: context.tagHooks
    }));
  }

  function chooseOutput(poolName, baseCrosslinks, crosslinkExpansion, signals) {
    const candidates = combinedPool(baseCrosslinks, crosslinkExpansion, poolName)
      .filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(signals.status));
    return selectScored(candidates, signals, entry => entry.applicability || {});
  }

  function enrichPackage(inputPackage, datasets, options = {}) {
    if (!inputPackage?.location) return clone(inputPackage);
    const pkg = clone(inputPackage);
    const baseLocations = datasets?.baseLocations || {};
    const contextExpansion = datasets?.contextExpansion || {};
    const baseCrosslinks = datasets?.baseCrosslinks || {};
    const crosslinkExpansion = datasets?.crosslinkExpansion || {};
    const signals = signalsForPackage(pkg);
    const contextSelection = chooseContext(baseLocations, contextExpansion, signals);
    const prototypeSelection = selectPrototype(baseLocations, contextExpansion, signals);
    const context = contextSelection.value;
    const prototype = prototypeSelection.prototype;
    if (!context || !prototype) return pkg;

    const contexts = combinedContexts(baseLocations, contextExpansion);
    const contextIndex = contexts.findIndex(item => item.id === context.id);
    const prototypeIndex = (baseLocations.prototypes || []).findIndex(item => item.sourcePrototype === prototype.sourcePrototype);
    const effectiveVariantCount = (baseLocations.prototypes || []).length * contexts.length;
    const variantIndex = prototypeIndex * contexts.length + contextIndex + 1;
    const frame = contextExpansion?.settingFrames?.[signals.gameLine] || contextExpansion?.settingFrames?.unified || {
      label: humanize(signals.gameLine),
      focus: 'Interpret the location through its real-world operation.',
      questions: []
    };
    const interpretation = settingInterpretation(prototype, context, frame, signals);
    const spatial = pkg.location.spatialContext || {};
    const featureLabel = spatial.featureLabel || pkg.location.contextSnapshot?.namedFeatureClass || 'Named Map Feature';
    const addressText = signals.address ? ` at ${signals.address}` : '';
    const matchedHooks = [...new Set([
      ...contextSelection.matched,
      ...prototypeSelection.matched
    ])];

    pkg.location.contextSnapshot ||= {};
    Object.assign(pkg.location.contextSnapshot, {
      inventoryLabel: STATUS_LABELS[signals.status] || signals.status,
      locationVariant: `${variantIndex} of ${effectiveVariantCount}`,
      archetype: prototype.mundaneBase.name,
      archetypeCategory: prototype.mundaneBase.category,
      contextTitle: context.title,
      contextEffect: context.effect,
      mechanicalSeed: context.mechanicalSeed,
      publicFacade: `${signals.name}${addressText} is a real-world ${featureLabel.toLowerCase()} categorized as ${humanize(signals.category)}. Its ordinary schedules, access rules, users, records, ecology, infrastructure, and institutional purpose remain the first source of truth. The Chronicle resolver aligns it with the ${prototype.mundaneBase.name} archetype without replacing the mapped place's actual identity.`,
      hiddenFunction: contextNarrative(signals.status, context, interpretation, signals),
      evidenceConfidence: evidenceConfidence(signals.status),
      catalogueNote: catalogueNote(signals.status),
      namedFeatureClass: featureLabel,
      contextAwareSetting: frame.label,
      contextAwareFocus: frame.focus,
      contextQuestions: clone(frame.questions || []),
      matchedContextHooks: matchedHooks
    });

    pkg.location.contextAwareness = {
      schemaVersion: '1.0.0',
      effectiveLocationVariants: effectiveVariantCount,
      baseContexts: baseLocations?.contextVariants?.length || 0,
      addedContexts: contextExpansion?.contextVariants?.length || 0,
      selectedContextId: context.id,
      selectedPrototype: prototype.sourcePrototype,
      settingLine: signals.gameLine,
      settingLabel: frame.label,
      realWorldCategory: signals.category,
      namedFeatureClass: featureLabel,
      sourceTags: clone(signals.sourceTags),
      matchedHooks,
      contextualQuestions: clone(frame.questions || [])
    };

    pkg.outputs ||= {};
    const outputSelections = {};
    for (const poolName of POOLS) {
      const selected = chooseOutput(poolName, baseCrosslinks, crosslinkExpansion, signals);
      if (selected.value) pkg.outputs[poolName === 'struggles' ? 'struggle' : poolName === 'adventureHooks' ? 'adventureHook' : poolName === 'locationSeeds' ? 'locationSeed' : poolName] = clone(selected.value);
      outputSelections[poolName] = {
        id: selected.value?.id || null,
        matchedHooks: selected.matched,
        effectivePoolSize: combinedPool(baseCrosslinks, crosslinkExpansion, poolName).length
      };
    }
    pkg.location.contextAwareness.outputSelections = outputSelections;

    pkg.source ||= {};
    pkg.source.generatorVersion = options.generatorVersion || 'context-aware-location-4.0.0';
    pkg.source.contextResolverVersion = '1.0.0';
    pkg.source.effectiveLocationVariants = effectiveVariantCount;
    pkg.source.effectiveEntriesPerOutputPool = 16;
    pkg.source.contextEnrichedAt = options.enrichedAt || new Date().toISOString();
    return pkg;
  }

  function summarizePackage(pkg) {
    const snapshot = pkg?.location?.contextSnapshot || {};
    const awareness = pkg?.location?.contextAwareness || {};
    return {
      location: pkg?.location?.name,
      gameLine: pkg?.gameLine,
      inventoryStatus: pkg?.location?.inventoryStatus,
      setting: awareness.settingLabel || snapshot.contextAwareSetting,
      featureClass: awareness.namedFeatureClass || snapshot.namedFeatureClass,
      context: snapshot.contextTitle,
      variant: snapshot.locationVariant,
      hooks: awareness.matchedHooks || [],
      questions: awareness.contextualQuestions || snapshot.contextQuestions || []
    };
  }

  return {
    POOLS,
    STATUS_LABELS,
    hash32,
    combinedContexts,
    combinedPool,
    signalsForPackage,
    enrichPackage,
    summarizePackage
  };
});
