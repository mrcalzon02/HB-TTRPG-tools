(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const roman = index => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][index - 1] || String(index);
  const label = value => String(value || 'unresolved').replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

  function hash(value) {
    let state = 2166136261;
    for (const char of String(value || '')) {
      state ^= char.charCodeAt(0);
      state = Math.imul(state, 16777619);
    }
    return state >>> 0;
  }

  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function systemText(node, records) {
    return [node?.id, node?.name, ...(records || []).flatMap(record => [record.name, record.objectType, record.classification, record.environment])]
      .filter(Boolean).join('|');
  }

  function atmosphere(profile) {
    const template = String(profile?.template || '').toLowerCase();
    const pressure = clamp(profile?.atmosphere);
    if (profile?.bodyKind === 'gas') return template === 'ice-giant'
      ? 'Hydrogen-helium envelope; methane-rich upper atmosphere'
      : 'Hydrogen-helium envelope; deep convective cloud layers';
    let text = pressure < 0.04 ? 'Vacuum' : pressure < 0.18 ? 'Trace atmosphere' : pressure < 0.42 ? 'Thin atmosphere' : pressure < 0.78 ? 'Standard-pressure atmosphere' : pressure < 0.94 ? 'Dense atmosphere' : 'Crushing atmosphere';
    if (/greenhouse|toxic|sulfur|daemon|chthonic/.test(template)) text += '; chemically hostile';
    else if (/forge|hive|industrial|urban|armoury|naval/.test(template)) text += '; industrial pollutants recorded';
    else if (/brine/.test(template)) text += '; saline aerosols present';
    return text;
  }

  function biomes(profile) {
    const template = String(profile?.template || 'temperate').toLowerCase();
    const exact = {
      'gas-giant':['equatorial storm belts','ammonia-water cloud decks','polar vortex zones'],
      'ice-giant':['methane cirrus decks','cryogenic cloud belts','polar haze caps'],
      'moon-subsurface-ocean':['glacial shell','cryovolcanic fissures','subglacial brine ocean'],
      'moon-volcanic':['basaltic lava plains','sulfurous rift fields','volcanic calderas'],
      'moon-captured':['cratered highlands','regolith basins','impact-ejecta fields'],
      brine:['hypersaline seas','mineral littoral shelves','evaporite flats'],
      storm:['storm ocean','wind-scoured archipelagos','temperate littoral zones'],
      greenhouse:['basaltic uplands','acidic lowlands','superheated basin floors'],
      dust:['dune seas','dust-choked badlands','salt-flat depressions'],
      tundra:['permafrost steppe','glacial uplands','seasonal thaw basins']
    };
    if (exact[template]) return exact[template];
    if (template.startsWith('moon-')) return /ice/.test(template) ? ['glacial highlands','frozen regolith plains','impact-crater basins'] : ['cratered highlands','regolith maria','impact-ejecta fields'];
    if (/ocean|archipelago/.test(template)) return ['pelagic ocean','continental shelves','island highlands'];
    if (/jungle|forest|maiden|exodite|paradise|feral|swamp/.test(template)) return ['temperate forest','humid lowlands','rocky highlands'];
    if (/desert|savanna|sulfur/.test(template)) return ['dune or steppe belts','rocky uplands','dry basin floors'];
    if (/ice|alpine|rogue/.test(template)) return ['glacial plains','icebound highlands','cryogenic basins'];
    if (/volcanic|chthonic|ash/.test(template)) return ['basaltic plains','active rift zones','ash-choked highlands'];
    if (/forge|hive|industrial|urban|armoury|naval/.test(template)) return ['industrial plateaus','polluted basin zones','worked lithic highlands'];
    if (/barren|dead|crone|tomb|irradiated/.test(template)) return ['cratered wastes','regolith plains','exposed bedrock highlands'];
    return ['temperate lowlands','rocky uplands','seasonal drainage basins'];
  }

  function temperatures(profile, kind, name) {
    const rng = random(hash(`${profile?.seed || 0}|${kind}|${name}|temperature-survey`));
    const template = String(profile?.template || '').toLowerCase();
    const heat = clamp(profile?.temperature);
    const air = clamp(profile?.atmosphere);
    let mean = profile?.bodyKind === 'gas' ? -165 + heat * 115 : -80 + heat * 165;
    if (kind === 'moon') mean -= 8;
    if (template === 'greenhouse') mean += 35;
    if (/volcanic|chthonic|moon-volcanic/.test(template)) mean += 18;
    if (template === 'ice-giant') mean -= 24;
    const swing = profile?.bodyKind === 'gas' ? 10 + rng() * 18 : kind === 'moon' ? 24 + rng() * 52 * (1 - air * 0.45) : 14 + rng() * 44 * (1 - air * 0.68);
    return Object.freeze({
      meanC:Math.round(mean), meanK:Math.round(mean + 273.15),
      lowC:Math.round(mean - swing * (0.48 + rng() * 0.22)),
      highC:Math.round(mean + swing * (0.52 + rng() * 0.22)),
      polarC:Math.round(mean - swing * (0.24 + rng() * 0.18)),
      equatorialC:Math.round(mean + swing * (0.18 + rng() * 0.16))
    });
  }

  function biosphere(profile, kind, name) {
    const template = String(profile?.template || '').toLowerCase();
    const rng = random(hash(`${profile?.seed || 0}|${kind}|${name}|biosphere-survey`));
    const heat = clamp(profile?.temperature), moisture = clamp(profile?.moisture), air = clamp(profile?.atmosphere);
    const favorable = clamp(1 - Math.abs(heat - 0.52) * 1.9);
    const hostile = /dead|barren|forge|hive|industrial|urban|volcanic|chthonic|greenhouse|dust|irradiated|tomb|crone|daemon|rogue|moon-barren|moon-dead|moon-captured/.test(template);
    let index = Math.max(clamp(profile?.biosphereStrength), clamp(moisture * 0.52 + favorable * 0.34 + air * 0.14 - 0.34 - (hostile ? 0.42 : 0)));
    if (profile?.bodyKind === 'gas') index = 0;
    if (template === 'moon-subsurface-ocean') index = Math.max(index, 0.16 + rng() * 0.24);
    if (index < 0.08) return {index,status:'No indigenous macrofauna recorded',wildlife:[]};
    if (index < 0.22) return {index,status:'Microbial and extremophile biosphere recorded',wildlife:['microbial mats','extremophile colonies']};
    let pool = /ocean|brine|archipelago|storm/.test(template) ? ['reef filter-beasts','pelagic ribbon fauna','littoral shellbacks','deepwater leviathan-sign']
      : /jungle|forest|maiden|exodite|paradise|feral|swamp/.test(template) ? ['canopy hexapods','mossback grazers','ambush predators','carrion raptors']
      : /ice|tundra|alpine|moon-subsurface/.test(template) ? ['rimeback herd-beasts','ice burrowers','snow scavengers','subglacial filter fauna']
      : /desert|savanna|dust/.test(template) ? ['dune burrowers','salt-flat striders','glassback scavengers','carrion kites']
      : ['lowland herd-beasts','burrowing omnivores','aerial scavengers','territorial apex predators'];
    const count = Math.min(pool.length, 2 + Math.floor(rng() * 3)), wildlife = [];
    while (wildlife.length < count) { const candidate = pool[Math.floor(rng() * pool.length) % pool.length]; if (!wildlife.includes(candidate)) wildlife.push(candidate); }
    return {index,status:index > 0.62 ? 'Complex indigenous biosphere' : 'Established indigenous biosphere',wildlife};
  }

  function hazards(profile) {
    const template = String(profile?.template || '').toLowerCase(), list = [];
    if (profile?.bodyKind === 'gas') list.push('extreme pressure','violent atmospheric shear');
    if (/storm/.test(template)) list.push('planetary cyclonic systems');
    if (/greenhouse/.test(template)) list.push('runaway greenhouse heating','corrosive atmospheric chemistry');
    if (/toxic|sulfur/.test(template)) list.push('toxic atmospheric compounds');
    if (/volcanic|chthonic|moon-volcanic/.test(template)) list.push('active volcanism','seismic instability');
    if (/irradiated/.test(template)) list.push('surface radiation');
    if (/ice|tundra|alpine|rogue/.test(template)) list.push('cryogenic exposure');
    if (/desert|dust/.test(template)) list.push('abrasive dust storms');
    if (/ocean|brine|archipelago/.test(template)) list.push('marine weather exposure');
    if (/daemon/.test(template)) list.push('immaterial anomaly indicators');
    if (!list.length && clamp(profile?.atmosphere) < 0.08) list.push('vacuum exposure');
    return [...new Set(list)];
  }

  function bodySurvey(profile, kind, name) {
    const temp = temperatures(profile, kind, name), bio = biosphere(profile, kind, name), air = clamp(profile?.atmosphere);
    const habitability = profile?.bodyKind === 'gas' ? 'No conventional surface habitation' : air < 0.08 ? 'Pressure-sealed habitation required' : temp.meanC < -55 ? 'Cryogenic survival environment' : temp.meanC > 65 ? 'Extreme-heat survival environment' : bio.index > 0.42 && air > 0.38 ? 'Potentially habitable with local biosphere precautions' : 'Marginal habitation; environmental support advised';
    return Object.freeze({atmosphere:atmosphere(profile),biomes:Object.freeze(biomes(profile)),temperatures:temp,biosphereIndex:bio.index,biosphereStatus:bio.status,recordedWildlife:Object.freeze(bio.wildlife),hazards:Object.freeze(hazards(profile)),habitability});
  }

  function create(node, records = []) {
    const engine = window.CafarronPlanetProfileV1;
    if (!engine?.createProfile || !engine?.templateForBody || !engine?.templateForMoon) throw new Error('The planetary augur profile cogitator has failed to answer the Navis rite.');
    const text = systemText(node, records), rng = random(hash(text)), lower = text.toLowerCase();
    const systemTemplate = engine.templateFromText(lower), activityProfile = engine.createProfile(`${node.id}|system-registered-summary`, text, systemTemplate);
    const bodyCount = Math.max(3, Math.min(7, 3 + Math.floor(rng() * 5)));
    const registeredIndex = Math.min(bodyCount - 1, 1 + Math.floor(rng() * Math.max(1, bodyCount - 1)));
    const root = String(node.name || 'Surveyed System').replace(/\s+System$/i,'').trim() || 'Surveyed';
    const namedWorlds = records.filter(record => record.category === 'world' && record.name && !/\bsystem\b/i.test(record.name)).map(record => record.name);
    const namedStations = records.filter(record => record.category === 'station' && record.name).map(record => record.name);
    const stationCount = Math.max(0, Math.min(2, Math.max(namedStations.length, ['primary','guard-origin'].includes(node.layer) ? 1 : (rng() > 0.58 ? 1 : 0))));
    const anchorageCount = /fleet|navy|anchorage|battlefleet|militarum|guard/.test(lower) || node.layer === 'guard-origin' ? 1 : (rng() > 0.84 ? 1 : 0);
    const beltCount = 1 + (rng() > 0.72 ? 1 : 0);
    let orbit = 1.55; rng(); rng();

    const bodies = Array.from({length:bodyCount}, (_, index) => {
      const registered = index === registeredIndex, name = registered && namedWorlds[0] ? namedWorlds[0] : `${root} ${roman(index + 1)}`;
      const seed = `${node.id}|planet|${index}|${name}`, profileText = registered ? text : name;
      const template = engine.templateForBody(seed, profileText, index, bodyCount, registered), profile = engine.createProfile(seed, profileText, template), gas = profile.bodyKind === 'gas';
      const scale = gas ? 0.34 + rng() * 0.28 + (registered ? 0.05 : 0) : 0.12 + rng() * 0.18 + (registered ? 0.1 : 0);
      const radius = orbit + rng() * 0.18; orbit += gas ? 1.32 + scale * 1.55 : 0.92 + scale * 0.55;
      const spin = random(hash(`${seed}|axial-rotation`)), rotationPeriodHours = gas ? 7 + spin() * 17 : 8 + spin() * 72, rotationDirection = spin() < 0.08 ? -1 : 1;
      if (!gas) rng();
      const inclination = (rng() - 0.5) * (gas ? 0.10 : 0.18), phase = rng() * Math.PI * 2;
      const moonCount = gas ? 2 + Math.floor(rng() * 5) : registered ? Math.floor(rng() * 3) : (rng() > 0.82 ? 1 : 0);
      const rings = gas && rng() < profile.ringChance;
      const moons = Array.from({length:moonCount}, (_, moonIndex) => {
        const baseMoonName = `${name} · Moon ${roman(moonIndex + 1)}`, moonSeed = `${node.id}|planet|${index}|moon|${moonIndex}|${name}`;
        const moonTemplate = engine.templateForMoon(moonSeed, baseMoonName), moonProfile = engine.createProfile(moonSeed, baseMoonName, moonTemplate), moonSpin = random(hash(`${moonSeed}|spin`));
        const suffix = moonTemplate === 'moon-mining' ? ' · Mining Outpost' : moonTemplate === 'moon-archaeology' ? ' · Archaeological Site' : '';
        return Object.freeze({id:moonSeed,name:`${baseMoonName}${suffix}`,template:moonTemplate,profile:moonProfile,rotationPeriodHours:18 + moonSpin() * 180,orbitalPeriodHours:24 + moonIndex * 24 + moonSpin() * 96,survey:bodySurvey(moonProfile,'moon',baseMoonName)});
      });
      return Object.freeze({id:seed,name,registered,template,profile,radius,scale,inclination,phase,rotationPeriodHours,rotationDirection,orbitalPeriodHours:Math.max(18,Math.pow(radius,1.45)*9),rings,survey:bodySurvey(profile,'planet',name),moons:Object.freeze(moons)});
    });
    return Object.freeze({nodeId:node.id,name:node.name,seed:hash(text),template:systemTemplate,activityProfile,registeredIndex,beltCount,stationCount,anchorageCount,namedStations:Object.freeze(namedStations),bodies:Object.freeze(bodies)});
  }

  function addDef(dl, name, value) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
    const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = name; dd.textContent = Array.isArray(value) ? value.join(' · ') : String(value); dl.append(dt,dd);
  }

  function renderCensus(survey, options = {}) {
    const entry = Boolean(options.entry), section = document.createElement('section');
    section.className = entry ? 'wh-entry-section wh-system-survey-census' : 'wh-linked wh-system-survey-census';
    const heading = document.createElement(entry ? 'h2' : 'h4'), intro = document.createElement('p'), summary = document.createElement('dl');
    heading.textContent = 'Navis Cartographica Local-System Census'; intro.className = entry ? 'wh-entry-copy' : 'wh-small'; intro.textContent = 'This census is carried under one sealed Cartographica writ; the Navis docket and attached Administratum dossier answer to the same augur return.'; summary.className = entry ? 'wh-entry-ledger' : 'wh-definition';
    addDef(summary,'Cartographica survey class',label(survey.template)); addDef(summary,'Planetary bodies',survey.bodies.length); addDef(summary,'Natural satellites',survey.bodies.reduce((total,body)=>total+body.moons.length,0)); addDef(summary,'Asteroid belts',survey.beltCount); addDef(summary,'Orbital stations',survey.stationCount); addDef(summary,'Fleet anchorages',survey.anchorageCount); section.append(heading,intro,summary);
    survey.bodies.forEach((body,index)=>{
      const details=document.createElement('details'), title=document.createElement('summary'), dl=document.createElement('dl'); details.className='wh-system-survey-body'; details.open=body.registered||index===0; title.textContent=`${body.name}${body.registered?' · Primary registered world':''}`; dl.className=entry?'wh-entry-ledger':'wh-definition';
      addDef(dl,'World classification',label(body.template)); addDef(dl,'Atmosphere',body.survey.atmosphere); addDef(dl,'Dominant biomes',body.survey.biomes); addDef(dl,'Mean surface temperature',`${body.survey.temperatures.meanC} °C · ${body.survey.temperatures.meanK} K`); addDef(dl,'Observed temperature range',`${body.survey.temperatures.lowC} to ${body.survey.temperatures.highC} °C`); addDef(dl,'Equatorial augur temperature',`${body.survey.temperatures.equatorialC} °C`); addDef(dl,'Polar augur temperature',`${body.survey.temperatures.polarC} °C`); addDef(dl,'Xenobiologis vitality index',`${Math.round(body.survey.biosphereIndex*100)}%`); addDef(dl,'Biosphere standing',body.survey.biosphereStatus); addDef(dl,'Recorded wildlife',body.survey.recordedWildlife.length?body.survey.recordedWildlife:'No fauna entered under the present survey seal'); addDef(dl,'Environmental hazards',body.survey.hazards.length?body.survey.hazards:'No exceptional environmental hazard entered'); addDef(dl,'Habitation standing',body.survey.habitability); addDef(dl,'Axial period',`${body.rotationPeriodHours.toFixed(1)} hours`); addDef(dl,'Orbital period',`${body.orbitalPeriodHours.toFixed(1)} hours · Cartographica local scale`); addDef(dl,'Ring system',body.rings?'Confirmed':'None recorded'); details.append(title,dl);
      body.moons.forEach(moon=>{const box=document.createElement('section'), h=document.createElement(entry?'h4':'h5'), mdl=document.createElement('dl'); box.className='wh-system-survey-moon'; h.textContent=moon.name; mdl.className=entry?'wh-entry-ledger':'wh-definition'; addDef(mdl,'Satellite classification',label(moon.template)); addDef(mdl,'Atmosphere',moon.survey.atmosphere); addDef(mdl,'Dominant biomes',moon.survey.biomes); addDef(mdl,'Mean temperature',`${moon.survey.temperatures.meanC} °C · ${moon.survey.temperatures.meanK} K`); addDef(mdl,'Observed temperature range',`${moon.survey.temperatures.lowC} to ${moon.survey.temperatures.highC} °C`); addDef(mdl,'Biosphere standing',moon.survey.biosphereStatus); addDef(mdl,'Recorded wildlife',moon.survey.recordedWildlife.length?moon.survey.recordedWildlife:'No fauna entered under the present survey seal'); addDef(mdl,'Environmental hazards',moon.survey.hazards.length?moon.survey.hazards:'No exceptional environmental hazard entered'); addDef(mdl,'Axial period',`${moon.rotationPeriodHours.toFixed(1)} hours`); addDef(mdl,'Orbital period',`${moon.orbitalPeriodHours.toFixed(1)} hours · Cartographica local scale`); box.append(h,mdl); details.append(box);}); section.append(details);
    });
    return section;
  }

  window.CafarronSystemSurveyV1 = Object.freeze({create,renderCensus});
})();