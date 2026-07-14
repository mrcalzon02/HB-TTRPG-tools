(() => {
  'use strict';

  const SOL_SEED = 'EXAMPLE:system:1';
  const radians = degrees => degrees * Math.PI / 180;

  const star = {
    id:'star', kind:'star', name:'Sun', class:'G2V', label:'Yellow dwarf',
    mass:1, luminosity:1, temperature:5772, age:4.568,
    hzInner:0.95, hzOuter:1.67, color:'#ffd86b', provenance:'published',
    resources:['continuous fusion output','solar-wind plasma','heliospheric magnetic field','primary gravitational reference mass'],
    hazards:['solar radiation','coronal mass ejections'],
    summary:'The Sun is the measured G2V primary of the Solar System.'
  };

  const rawPlanets = [
    ['Mercury','Barren terrestrial',0.3871,87.969,1407.6,0.0553,0.383,0.378,440,'Trace sodium–potassium exosphere',0,0,false,0.2056,7.00,252.25084,'#9b8a72'],
    ['Venus','Greenhouse terrestrial',0.7233,224.701,-5832.5,0.815,0.949,0.907,737,'Carbon dioxide and nitrogen',0,0,false,0.0068,3.39,181.97973,'#d69d5f'],
    ['Earth','Temperate ocean terrestrial',1.0000,365.256,23.934,1,1,1,288,'Nitrogen and oxygen',71,1,false,0.0167,0.00,100.46435,'#4d8fd1'],
    ['Mars','Cold desert terrestrial',1.5237,686.980,24.623,0.1074,0.532,0.379,210,'Thin carbon dioxide, nitrogen, and argon',0,2,false,0.0934,1.85,355.45332,'#c66a47'],
    ['Jupiter','Gas giant',5.2028,4332.59,9.925,317.83,11.21,2.528,165,'Hydrogen and helium',0,115,true,0.0489,1.30,34.40438,'#d6a86c'],
    ['Saturn','Gas giant',9.5388,10759.22,10.656,95.16,9.45,1.065,134,'Hydrogen and helium',0,292,true,0.0565,2.49,49.94432,'#d8bd82'],
    ['Uranus','Ice giant',19.1914,30688.5,-17.24,14.536,4.01,0.886,76,'Hydrogen, helium, and methane',0,29,true,0.0463,0.77,313.23218,'#78c6cf'],
    ['Neptune','Ice giant',30.0611,60182,16.11,17.147,3.88,1.14,72,'Hydrogen, helium, and methane',0,16,true,0.0097,1.77,304.88003,'#4f78d1']
  ];

  const planets = rawPlanets.map((row,index) => {
    const [name,type,distance,periodDays,dayHours,mass,radius,gravity,temperature,atmosphere,hydrosphere,moonCount,rings,eccentricity,inclination,longitude,color] = row;
    const earth = name === 'Earth';
    return {
      id:`planet-${index + 1}`, kind:'planet', orbit:index + 1, name, type,
      distance, periodDays, dayHours, mass, radius, gravity, temperature,
      atmosphere, hydrosphere, moonCount, moons:[], rings, eccentricity,
      inclination, phase:radians(longitude), color, provenance:'published',
      habitability:earth ? 100 : name === 'Mars' ? 12 : 0,
      biosphere:earth ? 'Complex global biosphere' : 'No confirmed biosphere',
      civilization:earth ? 'Spacefaring industrial civilization' : 'No confirmed civilization',
      resources:planetResources(name), hazards:planetHazards(name),
      summary:earth
        ? 'Earth is the measured inhabited third planet of the Solar System and the only world presently known to support life.'
        : `${name} is a measured ${type.toLowerCase()} at a mean orbital distance of ${distance} AU.`
    };
  });

  const moonRows = [
    ['Earth','Moon',384400,27.3217,0.01230,0.2727,0.1654,220,'Trace exosphere','#c7c3b8','Rocky moon'],
    ['Mars','Phobos',9376,0.31891,1.79e-9,0.00177,0.00058,233,'None','#8d8377','Captured asteroid'],
    ['Mars','Deimos',23463,1.26244,2.48e-10,0.000973,0.00031,233,'None','#9b9185','Captured asteroid'],
    ['Jupiter','Io',421700,1.769,0.01495,0.286,0.183,130,'Sulfur dioxide','#e0c15b','Volcanic moon'],
    ['Jupiter','Europa',671100,3.551,0.00804,0.245,0.134,102,'Trace oxygen','#b6a98c','Ice moon'],
    ['Jupiter','Ganymede',1070400,7.155,0.02480,0.413,0.146,110,'Trace oxygen','#a89c88','Ice moon'],
    ['Jupiter','Callisto',1882700,16.689,0.01800,0.378,0.126,134,'Trace carbon dioxide','#736b62','Ice moon'],
    ['Saturn','Mimas',185539,0.942,0.0000063,0.0311,0.0065,64,'None','#c9c8c2','Ice moon'],
    ['Saturn','Enceladus',238042,1.370,0.0000180,0.0395,0.0113,75,'Water-vapor plume exosphere','#e5edf1','Ocean moon'],
    ['Saturn','Tethys',294619,1.888,0.000103,0.0834,0.0148,86,'None','#d9d9d4','Ice moon'],
    ['Saturn','Dione',377396,2.737,0.000183,0.0882,0.0237,87,'Trace oxygen','#c4c4c0','Ice moon'],
    ['Saturn','Rhea',527108,4.518,0.000386,0.1199,0.0269,76,'Trace oxygen and carbon dioxide','#c1c0ba','Ice moon'],
    ['Saturn','Titan',1221870,15.945,0.02250,0.404,0.138,94,'Dense nitrogen and methane','#d3a14c','Ocean moon'],
    ['Saturn','Iapetus',3560820,79.3215,0.000301,0.115,0.0224,90,'None','#9a8e78','Ice moon'],
    ['Uranus','Miranda',129390,1.413,0.0000110,0.0369,0.0081,60,'None','#c5c8c6','Ice moon'],
    ['Uranus','Ariel',190900,2.520,0.000226,0.0908,0.027,58,'Trace carbon dioxide','#d3d8d7','Ice moon'],
    ['Uranus','Umbriel',266000,4.144,0.000196,0.0919,0.023,75,'Trace carbon dioxide','#777a78','Ice moon'],
    ['Uranus','Titania',436300,8.706,0.000590,0.124,0.038,70,'Trace carbon dioxide','#b5b4ad','Ice moon'],
    ['Uranus','Oberon',583500,13.463,0.000505,0.119,0.035,75,'Trace carbon dioxide','#8f8980','Ice moon'],
    ['Neptune','Proteus',117647,1.122,0.0000073,0.033,0.007,51,'None','#77736d','Rocky moon'],
    ['Neptune','Triton',354759,5.877,0.00359,0.212,0.0796,38,'Thin nitrogen','#b3b7ad','Ice moon'],
    ['Neptune','Nereid',5513818,360.14,0.0000050,0.0266,0.007,50,'None','#8d8982','Ice moon']
  ];

  for (const row of moonRows) {
    const [parentName,name,orbitalDistanceKm,periodDays,mass,radius,gravity,temperature,atmosphere,color,type] = row;
    const parent = planets.find(item => item.name === parentName);
    if (!parent) continue;
    const index = parent.moons.length;
    parent.moons.push({
      id:`${parent.id}-moon-${index + 1}`, kind:'moon', parentId:parent.id,
      parentName, orbit:`${parent.orbit}.${index + 1}`, name, type,
      orbitalDistanceKm, periodDays, mass, radius, gravity, temperature,
      atmosphere, hydrosphere:/Ocean|Europa|Ganymede|Enceladus|Titan/i.test(`${type} ${name}`) ? 45 : 0,
      habitability:name === 'Europa' || name === 'Enceladus' ? 35 : 0,
      phase:radians((index * 67 + parent.orbit * 31) % 360), color,
      provenance:'published', biosphere:'No confirmed biosphere',
      civilization:'No confirmed civilization', resources:moonResources(type,name),
      hazards:['radiation, tidal, vacuum, or cryogenic exposure'],
      summary:`${name} is a major natural satellite of ${parentName}. Only selected major moons are drawn; the parent record retains the recognized total.`
    });
  }

  const belts = [
    {
      id:'belt-1',kind:'belt',orbit:'B1',name:'Main Asteroid Belt',type:'Asteroid belt',distance:2.70,
      periodDays:1620,widthAu:1.35,estimatedMass:0.04,density:'distributed with major families',
      composition:'C-type carbonaceous, S-type silicate, and M-type metallic bodies',
      resources:['iron-nickel mass','silicates','carbonaceous material','platinum-group metals','water-bearing minerals'],
      operations:'observed natural small-body population',hazards:['high-velocity collision risk','resonance gaps and family concentrations'],
      habitability:0,provenance:'published',summary:'The main asteroid belt occupies the broad region between Mars and Jupiter.'
    },
    {
      id:'belt-2',kind:'belt',orbit:'B2',name:'Kuiper Belt',type:'Trans-Neptunian belt',distance:43,
      periodDays:102000,widthAu:20,estimatedMass:0.8,density:'broad and dynamically structured',
      composition:'water, methane, and ammonia ices mixed with rock and complex organics',
      resources:['water ice','methane ice','ammonia','complex organics','silicates'],
      operations:'observed trans-Neptunian small-body population',hazards:['extreme distance','long-period navigation uncertainty','resonant object populations'],
      habitability:0,provenance:'published',summary:'The Kuiper Belt is a broad icy population beyond Neptune; its displayed center and width are schematic.'
    }
  ];

  const SOL = {
    version:3, seed:SOL_SEED, sourceMode:'published-fixed', provenance:'published',
    name:'Sol System', generatedAt:null, star, snowLine:2.7, planets, belts,
    resourceTotals:{metals:8,volatiles:7,fuel:4,biospheres:1,habitable:1,industrial:8},
    features:[
      'Fixed published Solar System record; procedural generation is not used for this seed.',
      'Eight planets use stored names, mean orbital distances, periods, masses, radii, eccentricities, and inclinations.',
      `${moonRows.length} major moons are displayed while recognized parent-system totals remain in the planet records.`,
      'The main asteroid belt and Kuiper Belt are stored reference regions.',
      'Earth is the only confirmed populated and biosphere-bearing world.',
      'Displayed phase uses stored J2000 reference longitudes advanced by the selected projection epoch.'
    ]
  };

  function planetResources(name) {
    return ({
      Mercury:['iron-rich core','silicate crust','polar water-ice deposits'],
      Venus:['basaltic surface','carbon dioxide atmosphere','sulfur compounds'],
      Earth:['liquid water','silicates and metals','complex biosphere','industrial civilization'],
      Mars:['iron oxides','water ice','silicates','carbon dioxide atmosphere'],
      Jupiter:['hydrogen','helium','ammonia','complex magnetosphere'],
      Saturn:['hydrogen','helium','ring ice','ammonia'],
      Uranus:['hydrogen','helium','methane','water–ammonia interior components'],
      Neptune:['hydrogen','helium','methane','water–ammonia interior components']
    })[name] || [];
  }

  function planetHazards(name) {
    return ({
      Mercury:['extreme temperature cycle','solar radiation'],
      Venus:['runaway greenhouse','crushing pressure','sulfuric-acid clouds'],
      Earth:['tectonic and meteorological hazards'],
      Mars:['radiation exposure','dust storms','low pressure'],
      Jupiter:['extreme radiation belts','deep gravity well','violent storms'],
      Saturn:['deep gravity well','violent storms','ring debris'],
      Uranus:['cryogenic atmosphere','deep gravity well'],
      Neptune:['extreme winds','cryogenic atmosphere','deep gravity well']
    })[name] || [];
  }

  function moonResources(type,name) {
    if (/Ocean|Europa|Ganymede|Enceladus/i.test(`${type} ${name}`)) return ['water ice','possible subsurface ocean','silicates','complex chemistry'];
    if (/Ice/i.test(type)) return ['water ice','silicates','cryogenic volatiles'];
    if (/Volcanic/i.test(type)) return ['silicates','sulfur compounds','geothermal energy'];
    return ['silicates','iron-bearing minerals','regolith'];
  }

  const clone = value => JSON.parse(JSON.stringify(value));
  globalThis.BlacklightExoFixedSystems = Object.freeze({
    version:'2026.07.14',
    has(seed) { return String(seed || '').trim().toUpperCase() === SOL_SEED.toUpperCase(); },
    resolve(seed) { return this.has(seed) ? clone(SOL) : null; }
  });
})();
