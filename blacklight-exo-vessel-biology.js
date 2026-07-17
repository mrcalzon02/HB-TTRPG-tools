(() => {
  'use strict';
  const D = globalThis.BlacklightExoVesselDefinitions;
  if (!D || globalThis.BlacklightExoVesselBiology) return;
  const map = Object.fromEntries(D.biology.map(item => [item.key,item]));
  const clone = value => value == null ? value : structuredClone(value);
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

  function parseSpan(species) {
    const match = String(species?.size || '').match(/[\d.]+/);
    return match ? clamp(Number(match[0]),.12,12) : 1.8;
  }

  function inferProfile(dossier) {
    const species = dossier?.species || null;
    const life = String(dossier?.system?.life || '').toLowerCase();
    if (!species) return {key:'human-standard',reason:'No inherited biological record was supplied; the vessel defaults to a terrestrial oxygen-water reference crew.'};
    const text = [species.environment,species.bodyPlan,species.chemistry,species.adaptation,life].join(' ').toLowerCase();
    let key = 'human-standard';
    if (/multi-species|multispecies/.test(text)) key = 'multispecies';
    else if (/ammonia/.test(text)) key = 'ammonia';
    else if (/hydrocarbon|methane/.test(text)) key = 'hydrocarbon';
    else if (/global ocean|aquatic|amphibious|gas-sack/.test(text)) key = 'aquatic';
    else if (/high-gravity/.test(text)) key = 'high-gravity';
    else if (/low-gravity/.test(text)) key = 'low-gravity';
    else if (/toxic|sulfur|corrosive/.test(text)) key = 'toxic-atmosphere';
    else if (/synthetic|mineral metabolism|silicon-organic|electrochemical/.test(text)) key = 'synthetic';
    return {key,reason:`The ${key} engineering profile was inferred from ${species.environment}, ${species.chemistry}, ${species.bodyPlan}, and ${species.adaptation}.`};
  }

  function resolve(input = {}, source = null) {
    const dossier = source?.dossier || source?.biology || null;
    const inferred = inferProfile(dossier);
    const key = input.biologyProfile && input.biologyProfile !== 'inherit' ? input.biologyProfile : inferred.key;
    const base = clone(map[key] || map['human-standard']);
    const species = dossier?.species || null;
    const spanM = parseSpan(species);
    const sizeFactor = clamp((spanM / 1.8) ** 1.35,.18,6.5);
    const adaptation = String(species?.adaptation || '').toLowerCase();
    const radiationFactor = /radiation-repair/.test(adaptation) ? .72 : 1;
    const dormancyFactor = /dormancy/.test(adaptation) ? .78 : 1;
    const regenerationFactor = /regeneration/.test(adaptation) ? 1.18 : 1;
    return {
      ...base,
      sourceSpecies:species?.name || null,
      sourceEnvironment:species?.environment || dossier?.system?.selectedWorld?.physical?.atmosphere || null,
      sourceChemistry:species?.chemistry || null,
      sourceBodyPlan:species?.bodyPlan || null,
      adultSpanM:spanM,
      sizeFactor,
      radiationFactor,
      dormancyFactor,
      regenerationFactor,
      inferenceReason:input.biologyProfile && input.biologyProfile !== 'inherit' ? `The ${base.label} profile was selected explicitly.` : inferred.reason,
      confidencePercent:species ? 64 : 78,
      confidenceNote:species ? 'This converts descriptive xenology into conservative engineering requirements; it is not a laboratory measurement of the species.' : 'The terrestrial reference profile uses an explicit engineering baseline rather than inferred alien physiology.'
    };
  }

  globalThis.BlacklightExoVesselBiology = Object.freeze({profiles:D.biology,inferProfile,resolve});
})();
