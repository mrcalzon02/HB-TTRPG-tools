(() => {
  'use strict';

  const SOL_SEED = 'EXAMPLE:system:1';
  const EARTH_RADIUS_KM = 6371.0;
  const radians = degrees => Number(degrees || 0) * Math.PI / 180;
  const clone = value => JSON.parse(JSON.stringify(value));

  const star = {
    id:'star', kind:'star', name:'Sun', class:'G2V', label:'Yellow dwarf',
    mass:1, luminosity:1, temperature:5772, age:4.568,
    hzInner:0.95, hzOuter:1.67, color:'#ffd86b', provenance:'published',
    resources:['continuous fusion output','solar-wind plasma','heliospheric magnetic field','primary gravitational reference mass'],
    hazards:['solar radiation','coronal mass ejections'],
    summary:'The Sun is the measured G2V primary of the Solar System.'
  };

  const rawBodies = [
    ['Mercury','major-planet','Barren terrestrial',0.3871,87.969,1407.6,0.0553,0.383,0.378,440,'Trace sodium–potassium exosphere',0,false,0.2056,7.00,252.25084,'#9b8a72','1'],
    ['Venus','major-planet','Greenhouse terrestrial',0.7233,224.701,-5832.5,0.815,0.949,0.907,737,'Carbon dioxide and nitrogen',0,false,0.0068,3.39,181.97973,'#d69d5f','2'],
    ['Earth','major-planet','Temperate ocean terrestrial',1.0000,365.256,23.934,1,1,1,288,'Nitrogen and oxygen',71,false,0.0167,0.00,100.46435,'#4d8fd1','3'],
    ['Mars','major-planet','Cold desert terrestrial',1.5237,686.980,24.623,0.1074,0.532,0.379,210,'Thin carbon dioxide, nitrogen, and argon',0,false,0.0934,1.85,355.45332,'#c66a47','4'],
    ['Ceres','dwarf-planet','Dwarf planet · carbonaceous and icy',2.7675,1680.5,9.074,0.000157,0.0742,0.029,168,'Transient water-vapor exosphere reported',0,false,0.0758,10.59,80.305,'#9a948a','5'],
    ['Jupiter','major-planet','Gas giant',5.2028,4332.59,9.925,317.83,11.21,2.528,165,'Hydrogen and helium',0,true,0.0489,1.30,34.40438,'#d6a86c','6'],
    ['Saturn','major-planet','Gas giant',9.5388,10759.22,10.656,95.16,9.45,1.065,134,'Hydrogen and helium',0,true,0.0565,2.49,49.94432,'#d8bd82','7'],
    ['Uranus','major-planet','Ice giant',19.1914,30688.5,-17.24,14.536,4.01,0.886,76,'Hydrogen, helium, and methane',0,true,0.0463,0.77,313.23218,'#78c6cf','8'],
    ['Neptune','major-planet','Ice giant',30.0611,60182,16.11,17.147,3.88,1.14,72,'Hydrogen, helium, and methane',0,true,0.0097,1.77,304.88003,'#4f78d1','9'],
    ['Pluto','dwarf-planet','Dwarf planet · volatile-rich trans-Neptunian world',39.482,90560,-153.2928,0.00218,0.1868,0.063,44,'Nitrogen, methane, and carbon monoxide',0,false,0.2488,17.16,238.929,'#b79b85','10'],
    ['Haumea','dwarf-planet','Dwarf planet · rapidly rotating elongated icy world',43.218,103774,3.9155,0.00067,0.125,0.044,50,'No confirmed substantial atmosphere',0,true,0.191,28.2,205.8,'#c8c2b8','11'],
    ['Makemake','dwarf-planet','Dwarf planet · methane-rich trans-Neptunian world',45.715,111845,22.826,0.00052,0.112,0.05,37,'Possible extremely tenuous methane/nitrogen atmosphere',0,false,0.159,29.0,79.6,'#b98b6d','12'],
    ['Eris','dwarf-planet','Dwarf planet · distant scattered-disc world',67.781,203830,25.9,0.00278,0.182,0.084,30,'Possible collapsed nitrogen/methane atmosphere near aphelion',0,false,0.44,44.04,35.95,'#d6d3ce','13']
  ];

  const planets = rawBodies.map((row,index) => {
    const [name,classification,type,distance,periodDays,dayHours,mass,radius,gravity,temperature,atmosphere,hydrosphere,rings,eccentricity,inclination,longitude,color,orbit] = row;
    const earth = name === 'Earth';
    return {
      id:`planet-${index + 1}`, kind:classification === 'dwarf-planet' ? 'dwarf-planet' : 'planet',
      classification, orbit, name, type, distance, periodDays, dayHours, mass, radius,
      gravity, temperature, atmosphere, hydrosphere, moonCount:0, moons:[], rings,
      eccentricity, inclination, phase:radians(longitude), color, provenance:'published',
      habitability:earth ? 100 : name === 'Mars' ? 12 : 0,
      biosphere:earth ? 'Complex global biosphere' : 'No confirmed biosphere',
      civilization:earth ? 'Spacefaring industrial civilization' : 'No confirmed civilization',
      resources:bodyResources(name), hazards:bodyHazards(name),
      summary:earth
        ? 'Earth is the measured inhabited third planet of the Solar System and the only world presently known to support life.'
        : `${name} is a published ${type.toLowerCase()} at a mean heliocentric distance of ${distance} AU.`
    };
  });

  const detailedMoonRows = [
    ['Earth','Moon',384400,27.3217,0.01230,1737.4,0.1654,220,'Trace exosphere','#c7c3b8','Rocky moon'],
    ['Mars','Phobos',9376,0.31891,1.79e-9,11.08,0.00058,233,'None','#8d8377','Captured asteroid'],
    ['Mars','Deimos',23463,1.26244,2.48e-10,6.2,0.00031,233,'None','#9b9185','Captured asteroid'],
    ['Jupiter','Io',421700,1.769,0.01495,1821.49,0.183,130,'Sulfur dioxide','#e0c15b','Volcanic moon'],
    ['Jupiter','Europa',671100,3.551,0.00804,1560.8,0.134,102,'Trace oxygen','#b6a98c','Ice moon'],
    ['Jupiter','Ganymede',1070400,7.155,0.02480,2631.2,0.146,110,'Trace oxygen','#a89c88','Ice moon'],
    ['Jupiter','Callisto',1882700,16.689,0.01800,2410.3,0.126,134,'Trace carbon dioxide','#736b62','Ice moon'],
    ['Saturn','Mimas',185539,0.942,0.0000063,198.2,0.0065,64,'None','#c9c8c2','Ice moon'],
    ['Saturn','Enceladus',238042,1.370,0.0000180,252.1,0.0113,75,'Water-vapor plume exosphere','#e5edf1','Ocean moon'],
    ['Saturn','Tethys',294619,1.888,0.000103,531.1,0.0148,86,'None','#d9d9d4','Ice moon'],
    ['Saturn','Dione',377396,2.737,0.000183,561.4,0.0237,87,'Trace oxygen','#c4c4c0','Ice moon'],
    ['Saturn','Rhea',527108,4.518,0.000386,763.8,0.0269,76,'Trace oxygen and carbon dioxide','#c1c0ba','Ice moon'],
    ['Saturn','Titan',1221870,15.945,0.02250,2574.7,0.138,94,'Dense nitrogen and methane','#d3a14c','Ocean moon'],
    ['Saturn','Iapetus',3560820,79.3215,0.000301,734.5,0.0224,90,'None','#9a8e78','Ice moon'],
    ['Uranus','Miranda',129390,1.413,0.0000110,235.8,0.0081,60,'None','#c5c8c6','Ice moon'],
    ['Uranus','Ariel',190900,2.520,0.000226,578.9,0.027,58,'Trace carbon dioxide','#d3d8d7','Ice moon'],
    ['Uranus','Umbriel',266000,4.144,0.000196,584.7,0.023,75,'Trace carbon dioxide','#777a78','Ice moon'],
    ['Uranus','Titania',436300,8.706,0.000590,788.9,0.038,70,'Trace carbon dioxide','#b5b4ad','Ice moon'],
    ['Uranus','Oberon',583500,13.463,0.000505,761.4,0.035,75,'Trace carbon dioxide','#8f8980','Ice moon'],
    ['Neptune','Proteus',117647,1.122,0.0000073,210,0.007,51,'None','#77736d','Rocky moon'],
    ['Neptune','Triton',354759,5.877,0.00359,1353.4,0.0796,38,'Thin nitrogen','#b3b7ad','Ice moon'],
    ['Neptune','Nereid',5513818,360.14,0.0000050,170,0.007,50,'None','#8d8982','Ice moon'],
    ['Pluto','Charon',19596,6.38722,0.000254,606,0.029,53,'No substantial atmosphere','#a8a49e','Major moon']
  ];
  const detailedMoonMap = new Map(detailedMoonRows.map(row => [`${row[0]}::${row[1]}`, row]));

  const manualDwarfMoons = {
    Haumea:[
      {name:'Namaka',a_km:25657,period_d:18.2783,ecc:0.249,incl:13.4,mean_anomaly_deg:0,radius_km:85,estimated_radius:true},
      {name:'Hiʻiaka',a_km:49880,period_d:49.462,ecc:0.0513,incl:2.0,mean_anomaly_deg:180,radius_km:160,estimated_radius:true}
    ],
    Makemake:[
      {name:'S/2015 (136472) 1 (MK2)',a_km:21000,period_d:null,ecc:null,incl:null,mean_anomaly_deg:90,radius_km:87.5,estimated_radius:true}
    ],
    Eris:[
      {name:'Dysnomia',a_km:37273,period_d:15.7859,ecc:0.0062,incl:0.0,mean_anomaly_deg:270,radius_km:350,estimated_radius:true}
    ]
  };

  const belts = [
    {id:'belt-1',kind:'belt',orbit:'B1',name:'Main Asteroid Belt',type:'Asteroid belt',distance:2.70,periodDays:1620,widthAu:1.35,estimatedMass:0.04,density:'distributed with major families',composition:'C-type carbonaceous, S-type silicate, and M-type metallic bodies',resources:['iron-nickel mass','silicates','carbonaceous material','platinum-group metals','water-bearing minerals'],operations:'observed natural small-body population',hazards:['high-velocity collision risk','resonance gaps and family concentrations'],habitability:0,provenance:'published',summary:'The main asteroid belt occupies the broad region between Mars and Jupiter.'},
    {id:'belt-2',kind:'belt',orbit:'B2',name:'Kuiper Belt',type:'Trans-Neptunian belt',distance:43,periodDays:102000,widthAu:20,estimatedMass:0.8,density:'broad and dynamically structured',composition:'water, methane, and ammonia ices mixed with rock and complex organics',resources:['water ice','methane ice','ammonia','complex organics','silicates'],operations:'observed trans-Neptunian small-body population',hazards:['extreme distance','long-period navigation uncertainty','resonant object populations'],habitability:0,provenance:'published',summary:'The Kuiper Belt is a broad icy population beyond Neptune; its displayed center and width are schematic.'}
  ];

  const state = {
    catalogStatus:'pending',
    catalogSource:'JPL Solar System Dynamics planetary satellite mean elements and physical parameters',
    catalogVersion:'2026-06-12',
    catalogError:null
  };

  function classifyMoon(raw) {
    if ((raw.radius_km || 0) >= 500) return 'Major moon';
    if ((raw.incl || 0) > 90 || (raw.ecc || 0) >= 0.1) return 'Irregular moon';
    if ((raw.radius_km || 0) < 10) return 'Small natural satellite';
    return 'Natural satellite';
  }

  function moonFromCatalog(parent, raw, index) {
    const detail = detailedMoonMap.get(`${parent.name}::${raw.name}`);
    const radiusKm = Number(raw.radius_km) || detail?.[5] || null;
    const massEarth = detail?.[4] ?? null;
    const gravity = detail?.[6] ?? null;
    const temperature = detail?.[7] ?? null;
    const atmosphere = detail?.[8] ?? 'No atmosphere measurement stored in the bundled catalogue';
    const color = detail?.[9] ?? (parent.kind === 'dwarf-planet' ? '#b9b4ab' : '#a7adb2');
    const type = detail?.[10] ?? classifyMoon(raw);
    return {
      id:`${parent.id}-moon-${raw.jpl_code || index + 1}`,
      kind:'moon', parentId:parent.id, parentName:parent.name,
      orbit:`${parent.orbit}.${index + 1}`, name:raw.name, type,
      orbitalDistanceKm:Number(raw.a_km) || null,
      periodDays:Number.isFinite(Number(raw.period_d)) ? Number(raw.period_d) : null,
      mass:massEarth,
      radius:radiusKm ? radiusKm / EARTH_RADIUS_KM : null,
      radiusKm,
      gravity,
      temperature,
      atmosphere,
      hydrosphere:/Ocean|Europa|Ganymede|Enceladus|Titan/i.test(`${type} ${raw.name}`) ? 45 : 0,
      habitability:raw.name === 'Europa' || raw.name === 'Enceladus' ? 35 : 0,
      phase:radians(raw.mean_anomaly_deg),
      eccentricity:numberOrNull(raw.ecc),
      inclination:numberOrNull(raw.incl),
      ascendingNode:numberOrNull(raw.node_deg),
      argumentOfPeriapsis:numberOrNull(raw.arg_peri_deg),
      ephemeris:raw.ephemeris || null,
      referenceFrame:raw.frame || null,
      epochJd:numberOrNull(raw.epoch_jd),
      jplCode:raw.jpl_code || null,
      estimatedRadius:Boolean(raw.estimated_radius),
      color,
      provenance:'published-jpl',
      biosphere:'No confirmed biosphere',
      civilization:'No confirmed civilization',
      resources:moonResources(type,raw.name),
      hazards:['vacuum, radiation, tidal, collision, or cryogenic exposure'],
      summary:`${raw.name} is a catalogued natural satellite of ${parent.name}. Orbital elements are sourced from the JPL planetary satellite tables${raw.estimated_radius ? '; its displayed radius is flagged as estimated' : ''}.`
    };
  }

  function installMoonCatalog(catalog, metadata = {}) {
    for (const parent of planets) {
      const raw = catalog?.[parent.name] || manualDwarfMoons[parent.name] || [];
      parent.moons = raw.map((moon,index) => moonFromCatalog(parent,moon,index));
      parent.moonCount = parent.moons.length;
    }
    state.catalogStatus = 'ready';
    state.catalogError = null;
    if (metadata.source) state.catalogSource = metadata.source;
    if (metadata.version) state.catalogVersion = metadata.version;
    return getCatalogSummary();
  }

  function markCatalogFailure(error) {
    for (const parent of planets) {
      const fallback = detailedMoonRows
        .filter(row => row[0] === parent.name)
        .map((row,index) => ({
          name:row[1],a_km:row[2],period_d:row[3],radius_km:row[5],mean_anomaly_deg:index * 67,
          ecc:0,incl:0,jpl_code:`fallback-${parent.name}-${index + 1}`
        }));
      const raw = fallback.length ? fallback : (manualDwarfMoons[parent.name] || []);
      parent.moons = raw.map((moon,index) => moonFromCatalog(parent,moon,index));
      parent.moonCount = parent.moons.length;
    }
    state.catalogStatus = 'error';
    state.catalogError = String(error?.message || error || 'Unknown catalogue error');
  }

  function getCatalogSummary() {
    const majorPlanets = planets.filter(body => body.classification === 'major-planet').length;
    const dwarfPlanets = planets.filter(body => body.classification === 'dwarf-planet').length;
    const moons = planets.reduce((total,body) => total + body.moons.length,0);
    return {majorPlanets,dwarfPlanets,moons,status:state.catalogStatus,source:state.catalogSource,version:state.catalogVersion,error:state.catalogError};
  }

  function buildSol() {
    const summary = getCatalogSummary();
    return {
      version:4, seed:SOL_SEED, sourceMode:'published-fixed', provenance:'published',
      name:'Sol System', generatedAt:null, star, snowLine:2.7, planets, belts,
      majorPlanetCount:summary.majorPlanets, dwarfPlanetCount:summary.dwarfPlanets,
      moonCount:summary.moons, catalogue:clone(state),
      resourceTotals:{metals:13,volatiles:12,fuel:4,biospheres:1,habitable:1,industrial:13},
      features:[
        'Fixed published Solar System record; procedural generation is not used for this seed.',
        `${summary.majorPlanets} major planets and ${summary.dwarfPlanets} IAU-recognized dwarf planets are included as selectable orbital bodies.`,
        `${summary.moons} catalogued moons are included without a display-count truncation.`,
        `Planetary satellite orbital elements use the ${state.catalogSource} snapshot reviewed ${state.catalogVersion}.`,
        'The main asteroid belt and Kuiper Belt are stored reference regions.',
        'Earth is the only confirmed populated and biosphere-bearing world.'
      ]
    };
  }

  function bodyResources(name) {
    return ({
      Mercury:['iron-rich core','silicate crust','polar water-ice deposits'], Venus:['basaltic surface','carbon dioxide atmosphere','sulfur compounds'],
      Earth:['liquid water','silicates and metals','complex biosphere','industrial civilization'], Mars:['iron oxides','water ice','silicates','carbon dioxide atmosphere'],
      Ceres:['water ice','hydrated minerals','carbonates','salts'], Jupiter:['hydrogen','helium','ammonia','complex magnetosphere'],
      Saturn:['hydrogen','helium','ring ice','ammonia'], Uranus:['hydrogen','helium','methane','water–ammonia interior components'],
      Neptune:['hydrogen','helium','methane','water–ammonia interior components'], Pluto:['nitrogen ice','methane ice','carbon monoxide ice','water-ice crust'],
      Haumea:['crystalline water ice','rocky interior','ring material'], Makemake:['methane ice','ethane','nitrogen traces','dark organic material'],
      Eris:['methane ice','nitrogen ice candidates','rock and ice interior']
    })[name] || [];
  }

  function bodyHazards(name) {
    return ({
      Mercury:['extreme temperature cycle','solar radiation'], Venus:['runaway greenhouse','crushing pressure','sulfuric-acid clouds'],
      Earth:['tectonic and meteorological hazards'], Mars:['radiation exposure','dust storms','low pressure'], Ceres:['microgravity','vacuum','impact exposure'],
      Jupiter:['extreme radiation belts','deep gravity well','violent storms'], Saturn:['deep gravity well','violent storms','ring debris'],
      Uranus:['cryogenic atmosphere','deep gravity well'], Neptune:['extreme winds','cryogenic atmosphere'], Pluto:['cryogenic surface','extreme distance','tenuous atmosphere'],
      Haumea:['extreme rotation','cryogenic surface','distant navigation'], Makemake:['cryogenic surface','extreme distance'], Eris:['extreme distance','cryogenic surface','long orbital period']
    })[name] || [];
  }

  function moonResources(type,name) {
    if (/Ocean|Europa|Ganymede|Enceladus/i.test(`${type} ${name}`)) return ['water ice','possible subsurface ocean','silicates','complex chemistry'];
    if (/Ice|Major/i.test(type)) return ['water ice','silicates','cryogenic volatiles'];
    if (/Volcanic/i.test(type)) return ['silicates','sulfur compounds','geothermal energy'];
    return ['silicates','iron-bearing minerals','regolith'];
  }

  function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  globalThis.BlacklightExoFixedSystems = Object.freeze({
    version:'2026.07.14-complete-sol-catalog',
    has(seed) { return String(seed || '').trim().toUpperCase() === SOL_SEED.toUpperCase(); },
    resolve(seed) { return this.has(seed) ? clone(buildSol()) : null; },
    installMoonCatalog,
    markCatalogFailure,
    getCatalogSummary
  });
})();
