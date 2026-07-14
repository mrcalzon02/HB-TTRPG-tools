(() => {
  'use strict';

  const PRESET = 'EXAMPLE';
  const AU_PER_LIGHT_YEAR = 63241.077084;
  const EARTHS_PER_SOLAR_MASS = 332946.0487;
  const VERSION = '2026.07.14';

  const SOURCES = {
    CNS5: {
      label:'Fifth Catalogue of Nearby Stars (CNS5)',
      role:'nearby-system census and astrometry',
      citation:'Golovin et al. 2023, A&A 670, A19'
    },
    TEN_PC: {
      label:'The 10 parsec sample in the Gaia era',
      role:'nearby stellar-system cross-check',
      citation:'Reylé et al. 2021, A&A 650, A201'
    },
    SIMBAD: {
      label:'SIMBAD Astronomical Database',
      role:'object identification, coordinates, classifications, and bibliography',
      citation:'CDS Strasbourg'
    },
    NASA_EXO: {
      label:'NASA Exoplanet Archive',
      role:'confirmed exoplanet inventory and published parameter cross-reference',
      citation:'NASA Exoplanet Science Institute / Caltech IPAC'
    },
    NASA_SOLAR: {
      label:'NASA Solar System Exploration and Planetary Fact Sheets',
      role:'Solar System physical and orbital reference values',
      citation:'NASA/JPL'
    },
    JPL_SSD: {
      label:'JPL Solar System Dynamics',
      role:'Solar System orbital and satellite records',
      citation:'NASA Jet Propulsion Laboratory'
    },
    PROXIMA_2025: {
      label:'NIRPS Proxima planetary-system analysis',
      role:'Proxima b and d confirmation and minimum masses',
      citation:'Suárez Mascareño et al. 2025, arXiv:2507.21751'
    },
    BARNARD_2025: {
      label:'Four sub-Earth planets orbiting Barnard’s Star',
      role:'four-planet confirmation, periods, and minimum-mass range',
      citation:'Basant et al. 2025, ApJL / arXiv:2503.08095'
    },
    GJ887_2020: {
      label:'GJ 887 compact super-Earth system',
      role:'GJ 887 b and c discovery parameters',
      citation:'Jeffers et al. 2020, Science 368, 1477'
    },
    EPS_ERI_2025: {
      label:'Revised mass and orbit of Epsilon Eridani b',
      role:'joint astrometry and radial-velocity mass and orbit',
      citation:'Thompson et al. 2025, arXiv:2502.20561'
    },
    EPS_IND_2026: {
      label:'Second JWST visit to Epsilon Indi Ab',
      role:'updated mass, eccentricity, ammonia, and water-cloud interpretation',
      citation:'Matthews et al. 2026, arXiv:2603.08780'
    }
  };

  const system = (index, record) => ({
    index,
    seed:`${PRESET}:system:${index}`,
    authorityMode:'published-first',
    supplementPolicy:'RNG may fill only fields explicitly marked unknown; generated values must be labeled hypothetical.',
    sources:['CNS5','TEN_PC','SIMBAD'],
    candidates:[],
    confirmedPlanets:[],
    confirmedPlanetCount:0,
    confirmedOrbitingMassEarth:0,
    confirmedHzPlanetCount:0,
    confirmedHzBodyCount:0,
    knownLifeWorlds:0,
    populated:false,
    ...record
  });

  const SYSTEMS = [
    system(1, {
      name:'Sol', aliases:['Solar System'], star:'G2V yellow dwarf',
      astrometry:{raDeg:0,decDeg:0,distanceLy:0,frame:'heliocentric origin'},
      stellarMassSolar:1, confirmedPlanetCount:8, confirmedOrbitingMassEarth:446.7,
      confirmedHzPlanetCount:1, confirmedHzBodyCount:2, knownLifeWorlds:1, populated:true,
      populationRecord:'Earth is the only world presently known to support life and technological civilization.',
      detailProvider:'published-sol', sources:['NASA_SOLAR','JPL_SSD'],
      composition:'Rock–iron terrestrial worlds; carbonaceous, silicate, and metallic small bodies; hydrogen–helium giants; volatile-rich outer icy populations.'
    }),
    system(2, {
      name:'Alpha Centauri', aliases:['Rigil Kentaurus','Proxima Centauri system'],
      star:'G2V + K1V + M5.5V triple', astrometry:{raDeg:219.9021,decDeg:-60.8339,distanceLy:4.367,frame:'approximate J2000'},
      stellarMassSolar:2.17, confirmedPlanetCount:2, confirmedOrbitingMassEarth:1.315,
      confirmedHzPlanetCount:1, confirmedHzBodyCount:1,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO','PROXIMA_2025'],
      confirmedPlanets:[
        {name:'Proxima Centauri d',host:'Proxima Centauri',periodDays:5.12,semiMajorAu:0.0289,massEarth:0.260,massType:'minimum',hz:false,status:'confirmed',sources:['PROXIMA_2025']},
        {name:'Proxima Centauri b',host:'Proxima Centauri',periodDays:11.19,semiMajorAu:0.0486,massEarth:1.055,massType:'minimum',hz:true,status:'confirmed',sources:['PROXIMA_2025']}
      ],
      candidates:[{name:'Proxima Centauri c',status:'inconclusive/disputed',treatment:'excluded from confirmed count and gravity mass'}],
      composition:'The low minimum masses support rocky-world models, but no surface mineralogy has been directly measured.'
    }),
    system(3, {
      name:"Barnard's Star", aliases:['GJ 699'], star:'M4V red dwarf',
      astrometry:{raDeg:269.4521,decDeg:4.6934,distanceLy:5.963,frame:'approximate J2000'},
      stellarMassSolar:0.162, confirmedPlanetCount:4, confirmedOrbitingMassEarth:1.09,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO','BARNARD_2025'],
      confirmedPlanets:[
        {name:"Barnard's Star d",periodDays:2.340,massEarth:0.22,massType:'minimum approximate',hz:false,status:'confirmed',sources:['BARNARD_2025']},
        {name:"Barnard's Star b",periodDays:3.154,semiMajorAu:0.0229,massEarth:0.34,massType:'minimum approximate',hz:false,status:'confirmed',sources:['BARNARD_2025']},
        {name:"Barnard's Star c",periodDays:4.124,massEarth:0.31,massType:'minimum approximate',hz:false,status:'confirmed',sources:['BARNARD_2025']},
        {name:"Barnard's Star e",periodDays:6.739,massEarth:0.19,massType:'minimum approximate',hz:false,status:'confirmed',sources:['BARNARD_2025']}
      ],
      composition:'Sub-Earth masses favor rocky interiors. Host-star abundance models are inferential and are not direct mineral samples.'
    }),
    system(4, {
      name:'Luhman 16', aliases:['WISE 1049−5319'], star:'L7.5 + T0.5 brown-dwarf binary',
      astrometry:{raDeg:162.3281,decDeg:-53.3195,distanceLy:6.503,frame:'approximate J2000'},
      stellarMassSolar:0.060, composition:'Observed substellar cloud chemistry; no confirmed planetary mineral inventory.'
    }),
    system(5, {
      name:'Wolf 359', aliases:['CN Leonis','GJ 406'], star:'M6V red dwarf',
      astrometry:{raDeg:164.1205,decDeg:7.0147,distanceLy:7.856,frame:'approximate J2000'},
      stellarMassSolar:0.090, candidates:[{name:'Wolf 359 planetary claims',status:'disputed',treatment:'excluded'}],
      composition:'No confirmed planet or resolved debris mineral inventory.'
    }),
    system(6, {
      name:'Lalande 21185', aliases:['GJ 411','HD 95735'], star:'M2V red dwarf',
      astrometry:{raDeg:165.8342,decDeg:35.9699,distanceLy:8.307,frame:'approximate J2000'},
      stellarMassSolar:0.389, confirmedPlanetCount:2, confirmedOrbitingMassEarth:2.99,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO'],
      confirmedPlanets:[
        {name:'GJ 411 b',periodDays:12.95,semiMajorAu:0.079,massEarth:2.99,massType:'minimum',hz:false,status:'confirmed',sources:['NASA_EXO']},
        {name:'GJ 411 c',periodDays:null,semiMajorAu:null,massEarth:null,massType:'published parameters remain solution-dependent',hz:null,status:'confirmed inventory / incomplete parameter authority',sources:['NASA_EXO']}
      ],
      candidates:[{name:'additional long-period signal',status:'candidate',treatment:'listed but excluded from mass unless confirmed'}],
      composition:'No directly measured planet mineralogy.'
    }),
    system(7, {
      name:'Sirius', aliases:['Alpha Canis Majoris'], star:'A1V + DA2 white-dwarf binary',
      astrometry:{raDeg:101.2872,decDeg:-16.7161,distanceLy:8.60,frame:'approximate J2000'},
      stellarMassSolar:3.08, composition:'No confirmed planetary inventory; stellar and white-dwarf masses dominate the published system gravity.'
    }),
    system(8, {
      name:'Luyten 726-8', aliases:['BL/UV Ceti','GJ 65'], star:'M5.5V + M6V binary',
      astrometry:{raDeg:24.7554,decDeg:-17.9503,distanceLy:8.73,frame:'approximate J2000'},
      stellarMassSolar:0.20, composition:'No confirmed planetary or resolved debris mineral inventory.'
    }),
    system(9, {
      name:'Ross 154', aliases:['V1216 Sagittarii','GJ 729'], star:'M3.5V red dwarf',
      astrometry:{raDeg:282.4558,decDeg:-23.8361,distanceLy:9.69,frame:'approximate J2000'},
      stellarMassSolar:0.17, composition:'No confirmed planetary or resolved debris mineral inventory.'
    }),
    system(10, {
      name:'Ross 248', aliases:['HH Andromedae','GJ 905'], star:'M6V red dwarf',
      astrometry:{raDeg:355.4779,decDeg:44.1767,distanceLy:10.32,frame:'approximate J2000'},
      stellarMassSolar:0.12, composition:'No confirmed planetary or resolved debris mineral inventory.'
    }),
    system(11, {
      name:'Epsilon Eridani', aliases:['Ran'], star:'K2V orange dwarf',
      astrometry:{raDeg:53.2327,decDeg:-9.4583,distanceLy:10.48,frame:'approximate J2000'},
      stellarMassSolar:0.82, confirmedPlanetCount:1, confirmedOrbitingMassEarth:311.4,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO','EPS_ERI_2025'],
      confirmedPlanets:[{name:'Epsilon Eridani b',periodDays:2670,semiMajorAu:3.5,massEarth:311.4,massType:'true mass estimate',hz:false,status:'confirmed',eccentricity:'near-circular',sources:['EPS_ERI_2025']}],
      composition:'Observed warm silicate dust and a broad outer debris/planetesimal belt; debris bulk mass is not invented when unmeasured.'
    }),
    system(12, {
      name:'Lacaille 9352', aliases:['GJ 887'], star:'M0.5V red dwarf',
      astrometry:{raDeg:346.4668,decDeg:-35.8531,distanceLy:10.72,frame:'approximate J2000'},
      stellarMassSolar:0.49, confirmedPlanetCount:2, confirmedOrbitingMassEarth:11.8,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO','GJ887_2020'],
      confirmedPlanets:[
        {name:'GJ 887 b',periodDays:9.3,massEarth:4.2,massType:'minimum approximate',hz:false,status:'confirmed',sources:['GJ887_2020']},
        {name:'GJ 887 c',periodDays:21.8,massEarth:7.6,massType:'minimum approximate',hz:'near inner edge',status:'confirmed',sources:['GJ887_2020']}
      ],
      candidates:[{name:'GJ 887 d',periodDays:50,status:'unconfirmed signal',treatment:'excluded'}],
      composition:'Masses allow rocky or volatile-rich super-Earth models; no direct mineral measurement.'
    }),
    system(13, {
      name:'Ross 128', aliases:['FI Virginis','GJ 447'], star:'M4V red dwarf',
      astrometry:{raDeg:176.9350,decDeg:0.8040,distanceLy:11.03,frame:'approximate J2000'},
      stellarMassSolar:0.17, confirmedPlanetCount:1, confirmedOrbitingMassEarth:1.35,
      confirmedHzPlanetCount:1, confirmedHzBodyCount:1,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO'],
      confirmedPlanets:[{name:'Ross 128 b',periodDays:9.86,semiMajorAu:0.0496,massEarth:1.35,massType:'minimum',hz:true,status:'confirmed',sources:['NASA_EXO']}],
      composition:'Rock-and-iron interior models use host-star elemental abundances; this is an inference, not a sampled surface composition.'
    }),
    system(14, {
      name:'EZ Aquarii', aliases:['Luyten 789-6','GJ 866'], star:'M-dwarf triple system',
      astrometry:{raDeg:339.6380,decDeg:-15.3000,distanceLy:11.11,frame:'approximate J2000'},
      stellarMassSolar:0.33, composition:'No confirmed planetary or resolved debris mineral inventory.'
    }),
    system(15, {
      name:'61 Cygni', aliases:['Bessel’s Star'], star:'K5V + K7V binary',
      astrometry:{raDeg:316.7248,decDeg:38.7494,distanceLy:11.40,frame:'approximate J2000'},
      stellarMassSolar:1.33, composition:'No confirmed planet inventory; binary stellar mass is authoritative.'
    }),
    system(16, {
      name:'Procyon', aliases:['Alpha Canis Minoris'], star:'F5IV-V + DQZ white-dwarf binary',
      astrometry:{raDeg:114.8255,decDeg:5.2250,distanceLy:11.46,frame:'approximate J2000'},
      stellarMassSolar:2.10, composition:'No confirmed planet inventory; primary and white-dwarf companion dominate the published system mass.'
    }),
    system(17, {
      name:'Struve 2398', aliases:['GJ 725'], star:'M3V + M3.5V binary',
      astrometry:{raDeg:280.6958,decDeg:59.6300,distanceLy:11.52,frame:'approximate J2000'},
      stellarMassSolar:0.60, composition:'No confirmed planetary or resolved debris mineral inventory.'
    }),
    system(18, {
      name:'Groombridge 34', aliases:['GJ 15','GX/GQ Andromedae'], star:'M1.5V + M3.5V binary',
      astrometry:{raDeg:4.5954,decDeg:44.0228,distanceLy:11.62,frame:'approximate J2000'},
      stellarMassSolar:0.58, confirmedPlanetCount:2, confirmedOrbitingMassEarth:39.03,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO'],
      confirmedPlanets:[
        {name:'GJ 15 Ab',periodDays:11.44,semiMajorAu:0.072,massEarth:3.03,massType:'minimum',hz:false,status:'confirmed',sources:['NASA_EXO']},
        {name:'GJ 15 Ac',periodDays:7600,semiMajorAu:null,massEarth:36,massType:'minimum approximate',hz:false,status:'confirmed',sources:['NASA_EXO']}
      ],
      composition:'Dynamical masses distinguish a super-Earth and a long-period Neptune-mass planet; direct mineralogy is unavailable.'
    }),
    system(19, {
      name:'Epsilon Indi', aliases:['Eps Indi A/Ba/Bb'], star:'K5V + brown-dwarf pair',
      astrometry:{raDeg:330.8408,decDeg:-56.7859,distanceLy:11.87,frame:'approximate J2000'},
      stellarMassSolar:0.8927, confirmedPlanetCount:1, confirmedOrbitingMassEarth:2415.5,
      sources:['CNS5','TEN_PC','SIMBAD','NASA_EXO','EPS_IND_2026'],
      confirmedPlanets:[{name:'Epsilon Indi Ab',periodDays:null,semiMajorAu:null,massEarth:2415.5,massType:'7.6 ± 0.7 Jupiter masses',hz:false,status:'confirmed',eccentricity:0.24,sources:['EPS_IND_2026']}],
      composition:'JWST confirms atmospheric ammonia; thick water-ice clouds are the favored explanation, with low metallicity or nitrogen depletion retained as alternatives.'
    }),
    system(20, {
      name:'Tau Ceti', aliases:['HD 10700'], star:'G8V yellow dwarf',
      astrometry:{raDeg:26.0170,decDeg:-15.9375,distanceLy:11.91,frame:'approximate J2000'},
      stellarMassSolar:0.78,
      candidates:[{name:'Tau Ceti candidate system',status:'debated/candidate',treatment:'shown as candidate evidence only; excluded from confirmed planet count and gravity mass'}],
      composition:'A resolved broad cold debris disk is published; detailed mineral fractions and candidate-planet properties remain uncertain.'
    })
  ];

  const bySeed = new Map(SYSTEMS.map(item => [item.seed.toUpperCase(), item]));
  const byName = new Map(SYSTEMS.flatMap(item => [item.name, ...(item.aliases || [])].map(name => [name.toUpperCase(), item])));

  function clone(value) {
    return value == null ? value : structuredClone(value);
  }

  function getSystem(identifier) {
    const key = String(identifier || '').trim().toUpperCase();
    return clone(bySeed.get(key) || byName.get(key) || null);
  }

  function getExampleSystems() {
    return SYSTEMS.map(item => clone(item));
  }

  function getExampleClusterEntries() {
    return SYSTEMS.map(item => ({
      seed:item.seed,
      clusterIndex:item.index,
      name:item.name,
      star:item.star,
      planetCount:item.confirmedPlanetCount,
      confirmedPlanetCount:item.confirmedPlanetCount,
      populated:item.populated,
      hzPlanetCount:item.confirmedHzPlanetCount,
      hzBodyCount:item.confirmedHzBodyCount,
      habitableWorlds:item.knownLifeWorlds,
      publishedReference:true,
      authorityMode:item.authorityMode,
      distanceLy:item.astrometry.distanceLy,
      raDeg:item.astrometry.raDeg,
      decDeg:item.astrometry.decDeg,
      stellarMassSolar:item.stellarMassSolar,
      orbitingMassEarth:item.confirmedOrbitingMassEarth,
      orbitingMassSolar:item.confirmedOrbitingMassEarth / EARTHS_PER_SOLAR_MASS,
      totalMassSolar:item.stellarMassSolar + item.confirmedOrbitingMassEarth / EARTHS_PER_SOLAR_MASS,
      confirmedPlanets:clone(item.confirmedPlanets),
      candidates:clone(item.candidates),
      composition:item.composition,
      sourceIds:[...item.sources],
      supplementPolicy:item.supplementPolicy,
      detailProvider:item.detailProvider || 'published-star-rng-supplement'
    }));
  }

  function resolveField(publishedValue, generatedValue, fieldName = 'field') {
    const publishedAvailable = publishedValue !== undefined && publishedValue !== null && publishedValue !== '';
    if (publishedAvailable) {
      return {value:clone(publishedValue), provenance:'published', authority:'BlacklightExoAuthority', fieldName};
    }
    return {value:clone(generatedValue), provenance:'rng-supplement', authority:'BlacklightExoAuthority', fieldName};
  }

  function equatorialPosition(astrometry) {
    if (!astrometry?.distanceLy) return {x:0,y:0,z:0};
    const ra = astrometry.raDeg * Math.PI / 180;
    const dec = astrometry.decDeg * Math.PI / 180;
    const distance = astrometry.distanceLy * AU_PER_LIGHT_YEAR;
    return {
      x:distance * Math.cos(dec) * Math.cos(ra),
      y:distance * Math.cos(dec) * Math.sin(ra),
      z:distance * Math.sin(dec)
    };
  }

  const authority = {
    version:VERSION,
    presetSeed:PRESET,
    precedence:['published','published-lower-bound','candidate/disputed','rng-supplement'],
    rules:Object.freeze({
      publishedWins:true,
      candidatesAreNotConfirmed:true,
      rngMustBeLabeled:true,
      rngMayReplacePublished:false,
      unknownRemainsUnknownUnlessSupplementRequested:true
    }),
    sources:Object.freeze(clone(SOURCES)),
    systems:Object.freeze(getExampleSystems()),
    isExampleSeed:value => String(value || '').trim().toUpperCase() === PRESET,
    isExampleSystemSeed:value => bySeed.has(String(value || '').trim().toUpperCase()),
    getSystem,
    getExampleSystems,
    getExampleClusterEntries,
    resolveField,
    equatorialPosition,
    describeProvenance(record) {
      if (!record) return 'No authority record';
      return `${record.name}: published-first record from ${record.sources.map(id => SOURCES[id]?.label || id).join('; ')}. RNG is permitted only for unknown supplemental fields.`;
    }
  };

  globalThis.BlacklightExoAuthority = Object.freeze(authority);
  document.dispatchEvent(new CustomEvent('blacklight:source-authority-ready', {detail:{version:VERSION,preset:PRESET}}));
})();