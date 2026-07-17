(() => {
  'use strict';

  const VERSION = 1;
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function rngFor(seed) {
    let state = 2166136261;
    for (const char of String(seed || 'EXO-ECOLOGY')) {
      state ^= char.charCodeAt(0);
      state = Math.imul(state, 16777619);
    }
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  const integer = (rng, min, max) => Math.floor(min + rng() * (max - min + 1));
  const number = (rng, min, max, digits = 2) => Number((min + (max - min) * rng()).toFixed(digits));
  const pick = (rng, values) => values[Math.floor(rng() * values.length)];
  function unique(rng, values, count) {
    const pool = [...values], out = [];
    while (pool.length && out.length < count) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  }
  function weighted(rng, entries) {
    const valid = entries.filter(entry => entry.weight > 0);
    const total = valid.reduce((sum, entry) => sum + entry.weight, 0);
    if (!valid.length || total <= 0) return entries[0]?.value;
    let roll = rng() * total;
    for (const entry of valid) {
      roll -= entry.weight;
      if (roll <= 0) return entry.value;
    }
    return valid.at(-1).value;
  }

  const NATIVE_LABELS = {
    barren: 'Barren world',
    chemical: 'Chemically active world',
    pseudo: 'Pseudo-life world',
    living: 'Living world'
  };
  const OVERLAY_LABELS = {
    unpopulated: 'No permanent population',
    populated: 'Populated world',
    ruined: 'Ruined world'
  };
  const FINAL_LABELS = {...NATIVE_LABELS, populated: 'Populated world', ruined: 'Ruined world'};

  const ENVIRONMENTS = [
    {key:'airless-surface',label:'Airless irradiated surface',domains:['crater fields','regolith fractures','lava tubes'],solvents:['none','transient brines'],pressure:'vacuum'},
    {key:'temperate-terrestrial',label:'Temperate terrestrial biosphere',domains:['continental margins','river basins','shallow seas','subsurface aquifers'],solvents:['liquid water'],pressure:'moderate atmosphere'},
    {key:'global-ocean',label:'Global ocean and abyssal ecology',domains:['sunlit surface ocean','pelagic water column','abyssal plains','hydrothermal vents'],solvents:['liquid water','supercritical water'],pressure:'oceanic pressure gradient'},
    {key:'arid-desert',label:'Arid desert and episodic brine ecology',domains:['salt flats','shadowed canyons','deep aquifers','dust seas'],solvents:['concentrated brines','water vapor films'],pressure:'thin atmosphere'},
    {key:'icebound',label:'Icebound cryosphere and subsurface sea',domains:['ice fractures','subglacial ocean','cryovolcanic vents','dark brine pockets'],solvents:['water-ammonia brine','liquid water'],pressure:'ice-confined pressure'},
    {key:'toxic-atmosphere',label:'Reactive toxic-atmosphere world',domains:['acid cloud decks','mineral plains','storm cells','sheltered caverns'],solvents:['sulfuric acid aerosols','supercritical carbon dioxide','molten sulfur'],pressure:'dense reactive atmosphere'},
    {key:'hydrocarbon',label:'Cryogenic hydrocarbon world',domains:['methane lakes','organic dunes','cryovolcanic deltas','subsurface ammonia layers'],solvents:['liquid methane','liquid ethane','ammonia-water slush'],pressure:'cold reducing atmosphere'},
    {key:'volcanic',label:'Volcanic sulfur and molten-salt world',domains:['lava margins','sulfur plains','fumarole networks','mineral caverns'],solvents:['molten salts','liquid sulfur','superheated brines'],pressure:'variable volcanic atmosphere'},
    {key:'gas-cloud',label:'Gas-giant cloud-layer ecology',domains:['temperate cloud decks','convective updrafts','storm boundaries','aerosol reef bands'],solvents:['water-ammonia droplets','hydrocarbon aerosols'],pressure:'floating pressure bands'},
    {key:'high-gravity',label:'High-gravity dense-atmosphere ecology',domains:['lowland pressure basins','dense forests or mats','shallow seas','mountain refugia'],solvents:['liquid water','supercritical carbon dioxide'],pressure:'high-pressure atmosphere'},
    {key:'tidal-twilight',label:'Tidally locked twilight ecology',domains:['substellar storm basin','terminator wetlands','dark-side ice cap','atmospheric return flow'],solvents:['liquid water','concentrated brines'],pressure:'strong atmospheric circulation'},
    {key:'artificial',label:'Artificial habitat network ecology',domains:['habitat interiors','recycling biomes','maintenance voids','industrial nutrient loops'],solvents:['engineered water systems','synthetic carrier fluids'],pressure:'regulated habitat pressure'},
    {key:'plasma-magnetosphere',label:'Magnetospheric plasma ecology',domains:['radiation belts','auroral current sheets','magnetic reconnection zones','charged dust rings'],solvents:['ionized plasma','electromagnetic field structures'],pressure:'nonmaterial confinement'}
  ];

  const CHEMISTRIES = {
    barren: [
      ['No biochemistry','none','abiotic mineral sorting','no hereditary substrate'],
      ['Photochemical organic haze','hydrocarbon aerosol','ultraviolet polymerization','nonhereditary molecular films']
    ],
    chemical: [
      ['Carbon-rich prebiotic chemistry','water or brine','redox cycling','catalytic polymer networks'],
      ['Sulfur-mineral reaction network','liquid sulfur or acid aerosol','sulfur oxidation and reduction','repeating catalytic surfaces'],
      ['Silicate electrochemistry','molten salts','charge-separated mineral cycling','crystal defect propagation'],
      ['Hydrocarbon tholin chemistry','methane and ethane','photochemical radical exchange','self-assembling organic membranes'],
      ['Metal-organic vent chemistry','supercritical water','geothermal redox gradients','porous mineral templates']
    ],
    pseudo: [
      ['Mineral-lattice pseudo-biology','brine films','electrochemical growth','heritable crystal defects'],
      ['Autocatalytic hydrocarbon colonies','liquid methane or ethane','radical-chain metabolism','templated polymer droplets'],
      ['Plasma-vortex pseudo-life','ionized plasma','magnetic induction','field-pattern inheritance'],
      ['Silicon-organic replicator chemistry','molten salt or hot solvent','thermoelectric metabolism','modular silicate coding chains'],
      ['Aerosol membrane pseudo-cells','acid or ammonia droplets','atmospheric redox cycling','droplet-to-droplet catalytic transfer']
    ],
    living: [
      ['Carbon-water biochemistry','liquid water','redox metabolism','nucleic-acid analogue'],
      ['Carbon-ammonia biochemistry','ammonia-water solvent','low-temperature redox metabolism','protein-like coding polymers'],
      ['Hydrocarbon membrane biology','liquid methane or ethane','hydrogen-acetylene metabolism','slow polymeric heredity'],
      ['Sulfur-driven carbon biology','acidic water or sulfur solvent','sulfur redox metabolism','high-temperature genetic polymers'],
      ['Silicon-organic hybrid biology','molten salt or supercritical fluid','thermoelectric metabolism','mineral-organic coding lattice'],
      ['Engineered synthetic biochemistry','regulated carrier fluid','programmable catalytic metabolism','redundant manufactured genome']
    ]
  };

  const ENERGY_SOURCES = [
    'stellar-spectrum photosynthesis','infrared photosynthesis','ultraviolet photochemistry','chemical redox gradients','hydrothermal geothermal output',
    'radiotrophy from crustal isotopes','electrotrophy across mineral seams','tidal flexing and friction','atmospheric lightning capture',
    'magnetic induction','charged-particle flux','thermal-gradient harvesting','pressure-cycle metabolism','synthetic reactor-fed nutrient loops'
  ];

  const PROCESS_BANK = {
    barren: ['mineral weathering','atmospheric escape','radiolytic molecule formation','seasonal sublimation','electrostatic dust sorting','impact-driven chemical resetting'],
    chemical: ['autocatalytic polymer formation','cyclic oxidation fronts','mineral membrane growth','photochemical haze production','solvent-driven molecular sorting','catalytic vent circulation'],
    pseudo: ['colony replication without cells','field-pattern inheritance','crystal-garden propagation','competitive catalytic exclusion','dormant spore-like mineral phases','resource-seeking growth fronts'],
    living: ['primary production','consumer grazing','predation','decomposition','nutrient remineralization','symbiotic exchange','seasonal migration','ecosystem engineering']
  };

  const ROLES = ['primary converter','filter feeder','grazer','detritivore','decomposer','ambush predator','pursuit predator','parasite','mutualist','ecosystem engineer','aerial or buoyant drifter','burrowing recycler','megafaunal browser'];
  const FORMS = ['membranous sheet','segmented crawler','radial grazer','colonial reef lattice','buoyant gas sac','mineral-shelled burrower','branching photosynthetic tower','cephalopodal swimmer','armored hexapod','ribbon-like filter organism','modular symbiotic colony','electromagnetic filament swarm'];
  const DEFENSES = ['mineral armor','toxic secretions','rapid burrowing','electrical discharge','chromatic threat display','detachable decoy tissue','pressure-wave signaling','collective swarming','metabolic dormancy','radiation-hard cysts'];
  const BEHAVIORS = ['territorial clustering','seasonal migration','slow reef expansion','cooperative hunting','solitary ambush behavior','distributed colony coordination','storm-following drift','vent-to-vent dispersal','light-cycle dormancy','resource-front tracking'];

  function inferPhysical(world = {}) {
    const type = String(world.type || world.classification || '').toLowerCase();
    const atmosphere = String(world.atmosphere || '').toLowerCase();
    const temperature = finite(world.temperature, 260);
    const hydrosphere = finite(world.hydrosphere, 0);
    const gravity = finite(world.gravity, 1);
    const habitability = finite(world.habitability, 0);
    return {
      type, atmosphere, temperature, hydrosphere, gravity, habitability,
      giant:/gas giant|ice giant|mini-neptune/.test(type),
      ocean:/ocean/.test(type) || hydrosphere >= 70,
      frozen:/frozen|ice|cryogenic/.test(type) || temperature < 190,
      volcanic:/volcanic|lava|magma/.test(type) || temperature > 520,
      airless:/none detected|none|vacuum|airless/.test(atmosphere) || (!atmosphere && hydrosphere === 0),
      toxic:/toxic|sulfur|acid|carbon dioxide|chlorine|ammonia|methane/.test(atmosphere),
      artificial:/artificial|habitat|station/.test(type),
      tidallyLocked:Boolean(world.tidallyLocked) || /tidally locked/.test(String(world.summary || '').toLowerCase())
    };
  }

  function existingSignals(world = {}, context = {}) {
    const biosphere = String(world.biosphere || '').trim();
    const civilization = String(world.civilization || '').trim();
    const role = String(world.role || context.worldRole || '').toLowerCase();
    const state = String(context.systemState || context.stateKey || '').toLowerCase();
    const hasBiosphere = Boolean(biosphere && !/^(no|none|unknown|not detected)/i.test(biosphere));
    const hasCivilization = Boolean(civilization && !/^(no|none|unknown|not detected)/i.test(civilization));
    const ruined = /ruin|extinct|abandoned|sterilized|dead system|nonfunctional remains/.test(`${role} ${state} ${civilization.toLowerCase()}`);
    return {biosphere,civilization,hasBiosphere,hasCivilization,ruined};
  }

  function chooseEnvironment(rng, physical, override = 'random') {
    if (override && override !== 'random') return ENVIRONMENTS.find(item => item.key === override) || ENVIRONMENTS[0];
    let key;
    if (physical.artificial) key = 'artificial';
    else if (physical.giant) key = physical.temperature > 900 ? 'plasma-magnetosphere' : 'gas-cloud';
    else if (physical.ocean) key = 'global-ocean';
    else if (physical.frozen) key = 'icebound';
    else if (physical.volcanic) key = 'volcanic';
    else if (physical.airless) key = physical.habitability > 5 ? 'arid-desert' : 'airless-surface';
    else if (physical.toxic) key = rng() < .35 ? 'hydrocarbon' : 'toxic-atmosphere';
    else if (physical.gravity > 1.45) key = 'high-gravity';
    else if (physical.tidallyLocked) key = 'tidal-twilight';
    else key = physical.hydrosphere < 15 ? 'arid-desert' : 'temperate-terrestrial';
    return ENVIRONMENTS.find(item => item.key === key) || ENVIRONMENTS[0];
  }

  function chooseNativeClass(rng, physical, existing, override = 'random') {
    if (['barren','chemical','pseudo','living'].includes(override)) return override;
    if (existing.hasBiosphere) {
      if (/candidate|primitive|microbial|ambiguous|pseudo/i.test(existing.biosphere)) return rng() < .55 ? 'pseudo' : 'living';
      return 'living';
    }
    const extreme = physical.temperature < 80 || physical.temperature > 900;
    const weights = [
      {value:'barren',weight:32 + (physical.airless ? 26 : 0) + (extreme ? 30 : 0) - physical.habitability * .28},
      {value:'chemical',weight:30 + (physical.toxic || physical.volcanic || physical.giant ? 18 : 0) + Math.min(20, physical.hydrosphere * .12)},
      {value:'pseudo',weight:12 + physical.habitability * .22 + (physical.toxic || physical.frozen || physical.giant ? 8 : 0)},
      {value:'living',weight:3 + physical.habitability * .55 + (physical.hydrosphere > 10 ? 10 : 0) - (physical.airless ? 20 : 0) - (extreme ? 25 : 0)}
    ];
    return weighted(rng, weights);
  }

  function chooseOverlay(existing, override = 'random', finalOverride = 'random') {
    if (existing.ruined) return 'ruined';
    if (existing.hasCivilization) return 'populated';
    if (finalOverride === 'ruined' || override === 'ruined') return 'ruined';
    if (finalOverride === 'populated' || override === 'populated') return 'populated';
    if (['unpopulated','populated','ruined'].includes(override)) return override;
    return 'unpopulated';
  }

  function selectChemistry(rng, nativeClass, override = 'random') {
    const list = CHEMISTRIES[nativeClass] || CHEMISTRIES.barren;
    let selected = pick(rng, list);
    if (override && override !== 'random') {
      const all = Object.values(CHEMISTRIES).flat();
      selected = all.find(item => item[0].toLowerCase().includes(override.toLowerCase())) || selected;
    }
    return {foundation:selected[0],solvent:selected[1],metabolism:selected[2],heredity:selected[3]};
  }

  function makeOrganismName(rng, role) {
    const roots = ['Aero','Brine','Cinder','Dusk','Echo','Ferro','Glass','Halo','Iridescent','Kelp','Lattice','Mire','Nacre','Ocher','Pulse','Quill','Rift','Sable','Thorn','Umbral','Vapor','Whorl','Xeno'];
    const endings = role.includes('predator') ? ['stalker','razor','hunter','maw'] : role.includes('decomposer') || role.includes('recycler') ? ['rot','mold','reclaimer','dissolver'] : role.includes('converter') ? ['bloom','mat','spire','fan'] : ['grazer','drifter','crawler','weaver','shell'];
    return `${pick(rng, roots)} ${pick(rng, endings)}`;
  }

  function makeOrganisms(rng, nativeClass, chemistry, environment, complexity, overlay) {
    if (nativeClass === 'barren' || nativeClass === 'chemical') return [];
    const count = nativeClass === 'pseudo' ? integer(rng, 2, 5) : clamp(Math.round(complexity / 14) + integer(rng, 2, 4), 4, 11);
    const roles = nativeClass === 'pseudo'
      ? ['primary converter','resource-front replicator','catalytic scavenger','colony competitor','dormant dispersal phase']
      : ROLES;
    const organisms = unique(rng, roles, Math.min(count, roles.length)).map(role => ({
      name:makeOrganismName(rng, role),
      role,
      scale:pick(rng, ['microscopic','millimetric','hand-sized','human-scale','vehicle-scale','megafaunal']),
      form:pick(rng, FORMS),
      metabolism:chemistry.metabolism,
      defense:pick(rng, DEFENSES),
      behavior:pick(rng, BEHAVIORS),
      domains:unique(rng, environment.domains, Math.min(environment.domains.length, integer(rng, 1, 2))),
      status:overlay === 'ruined' && rng() < .35 ? 'collapse survivor or feral remnant' : overlay === 'populated' && rng() < .3 ? 'domesticated, introduced, or managed population' : 'native'
    }));
    return organisms;
  }

  function generate(input = {}) {
    const world = clone(input.world || {});
    const system = clone(input.system || {});
    const overrides = input.overrides || {};
    const seed = String(input.seed || `${system.seed || 'EXO'}:ecology:${world.id || world.name || 'world'}`);
    const rng = rngFor(seed);
    const physical = inferPhysical(world);
    const existing = existingSignals(world, input.context || {});
    const requestedFinal = overrides.classification || 'random';
    const nativeOverride = ['barren','chemical','pseudo','living'].includes(requestedFinal) ? requestedFinal : overrides.nativeClass || 'random';
    const nativeClass = chooseNativeClass(rng, physical, existing, nativeOverride);
    const overlay = chooseOverlay(existing, overrides.occupancy || 'random', requestedFinal);
    const finalState = overlay === 'unpopulated' ? nativeClass : overlay;
    const environment = chooseEnvironment(rng, physical, overrides.environment || 'random');
    const chemistry = selectChemistry(rng, nativeClass, overrides.chemistry || 'random');
    const complexityBase = nativeClass === 'barren' ? integer(rng, 0, 5) : nativeClass === 'chemical' ? integer(rng, 6, 22) : nativeClass === 'pseudo' ? integer(rng, 20, 48) : integer(rng, 42, 96);
    const complexity = overrides.complexity && overrides.complexity !== 'random'
      ? {simple:18,moderate:46,complex:72,planetary:94}[overrides.complexity] || complexityBase
      : clamp(complexityBase + Math.round(physical.habitability * .08), 0, 100);
    const stage = nativeClass === 'barren' ? 'No persistent ecology' : nativeClass === 'chemical' ? 'Abiotic reaction ecology' : nativeClass === 'pseudo' ? 'Self-organizing replicator ecology' : complexity >= 82 ? 'Planet-spanning complex biosphere' : complexity >= 58 ? 'Multicellular regional biosphere' : 'Microbial or simple multicellular biosphere';
    const trophicLevels = nativeClass === 'living' ? clamp(Math.round(complexity / 18), 2, 6) : nativeClass === 'pseudo' ? clamp(Math.round(complexity / 20), 1, 3) : 0;
    const energy = unique(rng, ENERGY_SOURCES, nativeClass === 'barren' ? 1 : nativeClass === 'chemical' ? 2 : 3);
    const processes = unique(rng, PROCESS_BANK[nativeClass], nativeClass === 'barren' ? 3 : 5);
    const organisms = makeOrganisms(rng, nativeClass, chemistry, environment, complexity, overlay);
    const niches = environment.domains.map((domain, index) => ({
      domain,
      activity:nativeClass === 'barren' ? pick(rng, ['sterile','transient chemistry only','periodically reset']) : nativeClass === 'chemical' ? pick(rng, ['active reaction zone','molecular concentration basin','catalytic boundary']) : pick(rng, ['productive biome','seasonal refuge','specialized habitat','migration corridor']),
      productivity:nativeClass === 'living' ? pick(rng, ['low','moderate','high','exceptional']) : nativeClass === 'pseudo' ? pick(rng, ['trace','low','moderate']) : 'none',
      dominantProcess:processes[index % processes.length]
    }));
    const foodWeb = nativeClass === 'living' ? [
      `${energy[0]} supports primary converters across ${environment.domains[0]}.`,
      `${trophicLevels} broad trophic levels connect producers, consumers, predators, and decomposers.`,
      `${pick(rng, ['Seasonal collapse and recovery','Continuous nutrient recycling','Migration between pressure bands','Patchy boom-and-bust productivity'])} controls population density.`
    ] : nativeClass === 'pseudo' ? [
      `${energy[0]} drives self-propagating catalytic colonies.`,
      'Competition occurs through substrate capture, catalytic poisoning, and pattern overwriting rather than ordinary predation.',
      'Dormant phases preserve replicator patterns through hostile environmental cycles.'
    ] : [];
    const symbioses = nativeClass === 'living' ? unique(rng, [
      'obligate internal microbiome','reef-builder and mobile grazer exchange','predator-cleaner mutualism','fungal or lattice nutrient network','pollinator analogue and sessile producer','host-transfer reproductive symbiosis','atmospheric drifter and mineral-seeding partnership'
    ], integer(rng, 2, 4)) : nativeClass === 'pseudo' ? ['Catalytic colonies exchange or steal template fragments at shared boundaries.'] : [];

    const hazards = [];
    if (physical.airless) hazards.push('vacuum exposure and unshielded radiation');
    if (physical.toxic) hazards.push('reactive atmospheric chemistry');
    if (physical.volcanic) hazards.push('extreme heat, eruptions, and unstable crust');
    if (physical.frozen) hazards.push('cryogenic exposure and hidden subsurface voids');
    if (nativeClass === 'chemical') hazards.push('abiotic chemistry may mimic biological signatures and contaminate instruments');
    if (nativeClass === 'pseudo') hazards.push('self-propagating pseudo-life may colonize machinery without fitting biological containment models');
    if (nativeClass === 'living') hazards.push(pick(rng, ['aggressive immune analogues','airborne reproductive particles','bioelectric territorial signaling','rapid invasive adaptation','toxic metabolic byproducts']));
    if (overlay === 'populated') hazards.push('ecological access is controlled by an active population or designated alien authority');
    if (overlay === 'ruined') hazards.push('collapse residues, feral engineered organisms, and damaged environmental controls');

    const history = [];
    if (nativeClass === 'barren') history.push('No stable self-propagating ecology is detected; physical and chemical cycles repeatedly reset emerging complexity.');
    if (nativeClass === 'chemical') history.push('Complex chemistry persists in recurring environmental gradients but has not crossed into confirmed self-replication.');
    if (nativeClass === 'pseudo') history.push('Self-organizing patterns reproduce and compete, but their status as life remains operationally and philosophically disputed.');
    if (nativeClass === 'living') history.push(`The biosphere expanded from ${pick(rng, environment.domains)} into a ${stage.toLowerCase()}.`);
    if (overlay === 'populated') history.push(existing.hasCivilization ? `The preassigned civilization record—${existing.civilization}—remains authoritative over generated ecological supplements.` : 'A permanent population has altered native nutrient cycles through settlement, agriculture, industry, or ecological management.');
    if (overlay === 'ruined') history.push('Former settlement or civilization has collapsed; surviving ecology now occupies damaged infrastructure, abandoned managed biomes, and disturbed wilderness.');

    const protocols = [
      nativeClass === 'barren' ? 'Use sterilized survey packages to protect rare chemical baselines.' : 'Establish quarantine boundaries before collecting or releasing any material.',
      nativeClass === 'chemical' ? 'Do not classify repeating chemistry as life until heredity, metabolism, and open-ended evolution are separately demonstrated.' : nativeClass === 'pseudo' ? 'Apply both biological and materials-contamination controls; ordinary sterilization may spread viable patterns.' : 'Model trophic dependencies before removing specimens or suppressing hazardous species.',
      overlay === 'populated' ? 'Treat ecological sampling as a sovereignty and first-contact issue, not merely a scientific operation.' : overlay === 'ruined' ? 'Assume restoration systems, seed vaults, and engineered organisms may still execute obsolete directives.' : 'Confirm the absence of dormant populations or custodial machines before declaring the world unoccupied.'
    ];

    const basis = [
      `${world.type || world.kind || 'world'} physical class`,
      `${Math.round(physical.temperature)} K reference temperature`,
      `${Math.round(physical.habitability)}% inherited habitability`,
      existing.hasBiosphere ? `preserved biosphere signal: ${existing.biosphere}` : 'no authoritative biosphere record',
      existing.hasCivilization ? `preserved civilization signal: ${existing.civilization}` : existing.ruined ? 'preserved ruin-state signal' : 'no authoritative population record'
    ];

    return {
      version:VERSION,
      seed,
      generatedAt:new Date().toISOString(),
      source:{systemSeed:system.seed || input.systemSeed || null,worldId:world.id || null,worldName:world.name || 'Unnamed world',provenance:world.provenance || system.provenance || 'generated'},
      classification:{nativeClass,nativeLabel:NATIVE_LABELS[nativeClass],overlay,overlayLabel:OVERLAY_LABELS[overlay],finalState,finalLabel:FINAL_LABELS[finalState],confidence:clamp(integer(rng, 58, 94) + (existing.hasBiosphere || existing.hasCivilization || existing.ruined ? 5 : 0), 0, 99),basis},
      physicalContext:{type:world.type || world.kind || 'unknown',temperatureK:physical.temperature,gravityG:physical.gravity,atmosphere:world.atmosphere || 'Unknown',hydrospherePercent:physical.hydrosphere,habitabilityPercent:physical.habitability},
      environment:{key:environment.key,label:environment.label,pressure:environment.pressure,solvents:environment.solvents,domains:environment.domains},
      chemistry,
      energy:{primary:energy[0],secondary:energy.slice(1),processes},
      complexity:{index:complexity,stage,trophicLevels,biomass:nativeClass === 'living' ? pick(rng, ['sparse','regional','dense','planetary']) : nativeClass === 'pseudo' ? pick(rng, ['trace','patchy','regional']) : 'none',diversity:nativeClass === 'living' ? pick(rng, ['low-specialized','moderate','high','extreme']) : nativeClass === 'pseudo' ? 'limited pattern families' : 'none'},
      niches,
      organisms,
      foodWeb,
      symbioses,
      hazards:unique(rng, hazards, hazards.length),
      history,
      operationalProtocols:protocols,
      populationContext:{active:overlay === 'populated',ruined:overlay === 'ruined',lockedBySource:existing.hasCivilization || existing.ruined,designatedRecord:existing.civilization || null},
      summary:`${FINAL_LABELS[finalState]} with ${NATIVE_LABELS[nativeClass].toLowerCase()} foundations, ${environment.label.toLowerCase()}, and ${stage.toLowerCase()}.`
    };
  }

  function candidateBodies(system = {}) {
    const bodies = [];
    for (const planet of system.planets || []) {
      bodies.push(planet);
      for (const moon of planet.moons || []) {
        if (finite(moon.radiusKm, finite(moon.radius) * 6371) >= 450 || finite(moon.habitability) > 0 || !/^(none detected|none|unknown)?$/i.test(String(moon.atmosphere || ''))) bodies.push(moon);
      }
    }
    return bodies;
  }

  function summarizeSystem(system = {}, options = {}) {
    const counts = {barren:0,chemical:0,pseudo:0,living:0,populated:0,ruined:0,total:0,activeEcology:0};
    for (const body of candidateBodies(system)) {
      const ecology = body.ecology || generate({seed:`${options.seed || system.seed || 'EXO'}:ecology:${body.id || body.name}`,world:body,system,context:options.context});
      counts.total += 1;
      counts[ecology.classification.finalState] = (counts[ecology.classification.finalState] || 0) + 1;
      if (ecology.classification.overlay !== 'unpopulated') counts[ecology.classification.nativeClass] += 1;
      if (['pseudo','living'].includes(ecology.classification.nativeClass)) counts.activeEcology += 1;
    }
    return counts;
  }

  function enrichSystem(system = {}, options = {}) {
    if (!system || !Array.isArray(system.planets)) return system;
    for (const body of candidateBodies(system)) {
      if (!body.ecology || options.force) body.ecology = generate({seed:`${options.seed || system.seed || 'EXO'}:ecology:${body.id || body.name}`,world:body,system,context:options.context});
      body.ecologyClass = body.ecology.classification.finalState;
      body.ecologySummary = body.ecology.summary;
      if (system.sourceMode !== 'published-fixed') {
        if (!body.biosphere || /^(no confirmed|unknown|none)/i.test(String(body.biosphere))) {
          body.biosphere = body.ecology.classification.nativeClass === 'living' ? 'Generated native biosphere' : body.ecology.classification.nativeClass === 'pseudo' ? 'Generated pseudo-life signature' : body.ecology.classification.nativeClass === 'chemical' ? 'Complex abiotic chemistry' : 'No persistent biosphere';
        }
        if ((!body.civilization || /^(no confirmed|unknown|none)/i.test(String(body.civilization))) && body.ecology.classification.overlay === 'populated') body.civilization = 'Generated populated-world designation';
        if (body.ecology.classification.overlay === 'ruined') body.civilization = 'Extinct or ruined civilization record';
      }
    }
    system.ecologySummary = summarizeSystem(system, options);
    system.resourceTotals ||= {};
    system.resourceTotals.ecology = system.ecologySummary.activeEcology;
    system.resourceTotals.biospheres = system.ecologySummary.living + system.ecologySummary.populated + system.ecologySummary.ruined;
    return system;
  }

  globalThis.BlacklightExoEcology = Object.freeze({
    version:VERSION,
    labels:Object.freeze({native:NATIVE_LABELS,overlay:OVERLAY_LABELS,final:FINAL_LABELS}),
    environments:clone(ENVIRONMENTS),
    generate,
    enrichSystem,
    summarizeSystem,
    candidateBodies
  });
})();