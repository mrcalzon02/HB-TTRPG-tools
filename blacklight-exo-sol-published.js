(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SOL_SEED = 'EXAMPLE:system:1';
  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII'];
  const originalProjectionNote = document.querySelector('.exo-projection-note')?.textContent || '';
  let active = false;
  let applying = false;
  let visuals = new Map();
  let selectedId = 'star';

  const star = {
    id:'star', kind:'star', name:'Sun', class:'G2V', label:'Yellow dwarf', mass:1,
    luminosity:1, temperature:5772, age:4.568, hzInner:0.95, hzOuter:1.67,
    color:'#ffd86b',
    summary:'The Sun is the measured G2V primary of the Solar System. Values shown here are reference values rather than procedural EXO generation.',
    resources:['continuous fusion output','solar-wind plasma','heliospheric magnetic field','primary gravitational reference mass']
  };

  const planetData = [
    ['Mercury','Barren terrestrial',0.3871,87.969,1407.6,0.0553,0.383,0.378,440,'Trace sodium–potassium exosphere',0,0,false,0.2056,7.00,'#9b8a72'],
    ['Venus','Greenhouse terrestrial',0.7233,224.701,-5832.5,0.815,0.949,0.907,737,'Carbon dioxide and nitrogen',0,0,false,0.0068,3.39,'#d69d5f'],
    ['Earth','Temperate ocean terrestrial',1.0000,365.256,23.934,1,1,1,288,'Nitrogen and oxygen',71,1,false,0.0167,0.00,'#4d8fd1'],
    ['Mars','Cold desert terrestrial',1.5237,686.980,24.623,0.1074,0.532,0.379,210,'Thin carbon dioxide, nitrogen, and argon',0,2,false,0.0934,1.85,'#c66a47'],
    ['Jupiter','Gas giant',5.2028,4332.59,9.925,317.83,11.21,2.528,165,'Hydrogen and helium',0,115,true,0.0489,1.30,'#d6a86c'],
    ['Saturn','Gas giant',9.5388,10759.22,10.656,95.16,9.45,1.065,134,'Hydrogen and helium',0,292,true,0.0565,2.49,'#d8bd82'],
    ['Uranus','Ice giant',19.1914,30688.5,-17.24,14.536,4.01,0.886,76,'Hydrogen, helium, and methane',0,29,true,0.0463,0.77,'#78c6cf'],
    ['Neptune','Ice giant',30.0611,60182,16.11,17.147,3.88,1.14,72,'Hydrogen, helium, and methane',0,16,true,0.0097,1.77,'#4f78d1']
  ];

  const planets = planetData.map((item, index) => {
    const [name,type,distance,periodDays,dayHours,mass,radius,gravity,temperature,atmosphere,hydrosphere,moonCount,rings,eccentricity,inclination,color] = item;
    const earth = name === 'Earth';
    return {
      id:`planet-${index + 1}`, kind:'planet', orbit:index + 1, name, type, distance,
      periodDays, dayHours, mass, radius, gravity, temperature, atmosphere,
      hydrosphere, moonCount, moons:[], rings, eccentricity, inclination,
      phase:hashUnit(`${name}:published-phase`) * Math.PI * 2, color,
      habitability:earth ? 100 : name === 'Mars' ? 12 : 0,
      biosphere:earth ? 'Complex global biosphere' : 'No confirmed biosphere',
      civilization:earth ? 'Spacefaring industrial civilization' : 'No confirmed civilization',
      resources:planetResources(name),
      hazards:planetHazards(name),
      summary:planetSummary(name, type, distance)
    };
  });

  const majorMoons = [
    moon('Earth','Moon',384400,27.3217,0.01230,0.2727,0.1654,220,'Trace exosphere','#c7c3b8'),
    moon('Mars','Phobos',9376,0.31891,1.79e-9,0.00177,0.00058,233,'None','#8d8377'),
    moon('Mars','Deimos',23463,1.26244,2.48e-10,0.000973,0.00031,233,'None','#9b9185'),
    moon('Jupiter','Io',421700,1.769,0.01495,0.286,0.183,130,'Sulfur dioxide','#e0c15b','Volcanic moon'),
    moon('Jupiter','Europa',671100,3.551,0.00804,0.245,0.134,102,'Trace oxygen','#b6a98c','Ice moon'),
    moon('Jupiter','Ganymede',1070400,7.155,0.02480,0.413,0.146,110,'Trace oxygen','#a89c88','Ice moon'),
    moon('Jupiter','Callisto',1882700,16.689,0.01800,0.378,0.126,134,'Trace carbon dioxide','#736b62','Ice moon'),
    moon('Saturn','Mimas',185539,0.942,0.0000063,0.0311,0.0065,64,'None','#c9c8c2','Ice moon'),
    moon('Saturn','Enceladus',238042,1.370,0.0000180,0.0395,0.0113,75,'Water-vapor plume exosphere','#e5edf1','Ocean moon'),
    moon('Saturn','Tethys',294619,1.888,0.000103,0.0834,0.0148,86,'None','#d9d9d4','Ice moon'),
    moon('Saturn','Dione',377396,2.737,0.000183,0.0882,0.0237,87,'Trace oxygen','#c4c4c0','Ice moon'),
    moon('Saturn','Rhea',527108,4.518,0.000386,0.1199,0.0269,76,'Trace oxygen and carbon dioxide','#c1c0ba','Ice moon'),
    moon('Saturn','Titan',1221870,15.945,0.02250,0.404,0.138,94,'Dense nitrogen and methane','#d3a14c','Ocean moon'),
    moon('Saturn','Iapetus',3560820,79.3215,0.000301,0.115,0.0224,90,'None','#9a8e78','Ice moon'),
    moon('Uranus','Miranda',129390,1.413,0.0000110,0.0369,0.0081,60,'None','#c5c8c6','Ice moon'),
    moon('Uranus','Ariel',190900,2.520,0.000226,0.0908,0.027,58,'Trace carbon dioxide','#d3d8d7','Ice moon'),
    moon('Uranus','Umbriel',266000,4.144,0.000196,0.0919,0.023,75,'Trace carbon dioxide','#777a78','Ice moon'),
    moon('Uranus','Titania',436300,8.706,0.000590,0.124,0.038,70,'Trace carbon dioxide','#b5b4ad','Ice moon'),
    moon('Uranus','Oberon',583500,13.463,0.000505,0.119,0.035,75,'Trace carbon dioxide','#8f8980','Ice moon'),
    moon('Neptune','Proteus',117647,1.122,0.0000073,0.033,0.007,51,'None','#77736d','Rocky moon'),
    moon('Neptune','Triton',354759,5.877,0.00359,0.212,0.0796,38,'Thin nitrogen','#b3b7ad','Ice moon'),
    moon('Neptune','Nereid',5513818,360.14,0.0000050,0.0266,0.007,50,'None','#8d8982','Ice moon')
  ];

  for (const item of majorMoons) {
    const parent = planets.find(planet => planet.name === item.parentName);
    if (!parent) continue;
    item.parentId = parent.id;
    item.orbit = `${parent.orbit}.${parent.moons.length + 1}`;
    item.id = `${parent.id}-moon-${parent.moons.length + 1}`;
    item.phase = hashUnit(`${item.name}:published-phase`) * Math.PI * 2;
    parent.moons.push(item);
  }

  const belts = [
    {
      id:'belt-1',kind:'belt',orbit:'B1',name:'Main Asteroid Belt',type:'Asteroid belt',distance:2.70,
      periodDays:1620,widthAu:1.35,estimatedMass:0.04,density:'distributed with major families',
      composition:'C-type carbonaceous, S-type silicate, and M-type metallic bodies',
      resources:['iron-nickel mass','silicates','carbonaceous material','platinum-group metals','water-bearing minerals'],
      operations:'observed natural small-body population',hazards:['high-velocity collision risk','resonance gaps and family concentrations'],
      summary:'The main asteroid belt occupies the broad region between Mars and Jupiter.'
    },
    {
      id:'belt-2',kind:'belt',orbit:'B2',name:'Kuiper Belt',type:'Trans-Neptunian belt',distance:43,
      periodDays:102000,widthAu:20,estimatedMass:0.8,density:'broad and dynamically structured',
      composition:'water, methane, and ammonia ices mixed with rock and complex organics',
      resources:['water ice','methane ice','ammonia','complex organics','silicates'],
      operations:'observed trans-Neptunian small-body population',hazards:['extreme distance','long-period navigation uncertainty','resonant object populations'],
      summary:'The Kuiper Belt is a broad icy population beyond Neptune; its displayed center and width are schematic.'
    }
  ];

  const objects = new Map([[star.id,star]]);
  for (const planet of planets) {
    objects.set(planet.id,planet);
    for (const item of planet.moons) objects.set(item.id,item);
  }
  for (const belt of belts) objects.set(belt.id,belt);

  function moon(parentName,name,orbitalDistanceKm,periodDays,mass,radius,gravity,temperature,atmosphere,color,type='Rocky moon') {
    return {
      kind:'moon',parentName,name,type,orbitalDistanceKm,periodDays,mass,radius,gravity,temperature,atmosphere,
      hydrosphere:/Ocean|Europa|Ganymede|Enceladus|Titan/i.test(`${type} ${name}`) ? 45 : 0,
      habitability:name === 'Europa' || name === 'Enceladus' ? 35 : 0,
      color,resources:moonResources(type,name),hazards:['radiation, tidal, or vacuum exposure'],
      biosphere:'No confirmed biosphere',civilization:'No confirmed civilization',
      summary:`${name} is a major natural satellite of ${parentName}; only major moons are rendered in the orbital view.`
    };
  }

  function planetSummary(name,type,distance) {
    if (name === 'Earth') return 'Earth is the measured inhabited third planet of the Solar System and the only world presently known to support life.';
    return `${name} is a measured ${type.toLowerCase()} at a mean orbital distance of ${distance} AU.`;
  }

  function planetResources(name) {
    const data = {
      Mercury:['iron-rich core','silicate crust','polar water-ice deposits'],
      Venus:['basaltic surface','carbon dioxide atmosphere','sulfur compounds'],
      Earth:['liquid water','silicates and metals','complex biosphere','industrial civilization'],
      Mars:['iron oxides','water ice','silicates','carbon dioxide atmosphere'],
      Jupiter:['hydrogen','helium','ammonia','complex magnetosphere'],
      Saturn:['hydrogen','helium','ring ice','ammonia'],
      Uranus:['hydrogen','helium','methane','water–ammonia interior components'],
      Neptune:['hydrogen','helium','methane','water–ammonia interior components']
    };
    return data[name] || [];
  }

  function planetHazards(name) {
    const data = {
      Mercury:['extreme temperature cycle','solar radiation'],Venus:['runaway greenhouse','crushing pressure','sulfuric-acid clouds'],
      Earth:['tectonic and meteorological hazards'],Mars:['radiation exposure','dust storms','low pressure'],
      Jupiter:['extreme radiation belts','deep gravity well','violent storms'],Saturn:['deep gravity well','violent storms','ring debris'],
      Uranus:['cryogenic atmosphere','deep gravity well'],Neptune:['extreme winds','cryogenic atmosphere','deep gravity well']
    };
    return data[name] || [];
  }

  function moonResources(type,name) {
    if (/Ocean|Europa|Ganymede|Enceladus/i.test(`${type} ${name}`)) return ['water ice','possible subsurface ocean','silicates','complex chemistry'];
    if (/Ice/i.test(type)) return ['water ice','silicates','cryogenic volatiles'];
    if (/Volcanic/i.test(type)) return ['silicates','sulfur compounds','geothermal energy'];
    return ['silicates','iron-bearing minerals','regolith'];
  }

  function isSol() {
    return $('exo-seed-input')?.value.trim().toUpperCase() === SOL_SEED;
  }

  function scheduleApply() {
    setTimeout(() => {
      if (isSol()) applySol();
      else deactivate();
      cleanSolCard();
    }, 0);
  }

  function applySol() {
    if (applying) return;
    applying = true;
    active = true;
    document.body.classList.add('exo-published-sol');
    try {
      setText($('exo-summary-name'),'Sol');
      setText($('exo-summary-star'),'G2V · Sun');
      setText($('exo-summary-planets'),'8');
      setText($('exo-summary-seed'),SOL_SEED);
      setText($('exo-orbit-title'),'Solar System published orbital projection');
      setText($('exo-selection-name'),'Sun');
      const svgTitle = $('exo-orbit-svg-title');
      const svgDesc = $('exo-orbit-svg-desc');
      setText(svgTitle,'Published Solar System orbital display');
      setText(svgDesc,'A selectable logarithmically compressed reference projection of the Sun, eight planets, major moons, and principal small-body belts. Orbital phase is schematic.');
      const note = document.querySelector('.exo-projection-note');
      if (note) note.textContent = 'Mean distances, periods, masses, radii, and orbital ordering use published Solar System reference values. Planet and moon sizes are enlarged, distances are logarithmically compressed, only major moons are drawn, and displayed orbital phase is schematic rather than a live ephemeris.';
      renderTable();
      renderProfile();
      renderSvg();
      selectObject('star');
      setPopulationSummary();
      disableDossierHandoff();
      cleanSolCard();
      document.dispatchEvent(new CustomEvent('blacklight:published-sol-rendered'));
    } finally {
      applying = false;
    }
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.body.classList.remove('exo-published-sol');
    const note = document.querySelector('.exo-projection-note');
    if (note && originalProjectionNote) note.textContent = originalProjectionNote;
  }

  function renderTable() {
    const body = $('exo-orbital-table-body');
    if (!body) return;
    const fragment = document.createDocumentFragment();
    for (const planet of planets) {
      fragment.append(tableRow(planet,[
        planet.orbit,planet.name,planet.type,`${planet.distance.toFixed(4)} AU`,period(planet.periodDays),planet.moonCount,
        habitabilityCell(planet.habitability)
      ]));
      for (const item of planet.moons) {
        fragment.append(tableRow(item,[
          item.orbit,`↳ ${item.name}`,item.type,`${item.orbitalDistanceKm.toLocaleString()} km from ${planet.name}`,
          period(item.periodDays),'—',habitabilityCell(item.habitability)
        ]));
      }
    }
    for (const belt of belts) {
      fragment.append(tableRow(belt,[belt.orbit,belt.name,belt.type,`${belt.distance} AU`,period(belt.periodDays),'—','—']));
    }
    body.replaceChildren(fragment);
  }

  function tableRow(object,cells) {
    const row = document.createElement('tr');
    row.dataset.objectId = object.id;
    row.setAttribute('aria-selected','false');
    cells.forEach((value,index) => {
      const cell = document.createElement('td');
      if (index === 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = value;
        button.addEventListener('click',event => {event.stopPropagation();selectObject(object.id);});
        cell.append(button);
      } else if (value instanceof Node) cell.append(value);
      else cell.textContent = String(value);
      row.append(cell);
    });
    row.addEventListener('click',event => {
      if (!(event.target instanceof Element) || !event.target.closest('button')) selectObject(object.id);
    });
    return row;
  }

  function habitabilityCell(value) {
    const span = document.createElement('span');
    span.className = `exo-habitability ${value >= 65 ? 'high' : value >= 35 ? 'medium' : 'low'}`;
    span.textContent = `${value}%`;
    return span;
  }

  function renderProfile() {
    const grid = $('exo-resource-index');
    if (grid) {
      const values = [
        [8,'Metal-rich planetary bodies'],[7,'Volatile-bearing worlds'],[4,'Giant-planet fuel sources'],
        [1,'Confirmed biosphere'],[1,'Habitable inhabited world'],[8,'Mapped principal planets']
      ];
      grid.replaceChildren(...values.map(([value,label]) => {
        const card = document.createElement('div');
        card.className = 'exo-resource-item';
        const strong = document.createElement('strong');
        const span = document.createElement('span');
        strong.textContent = value;
        span.textContent = label;
        card.append(strong,span);
        return card;
      }));
    }
    const features = $('exo-system-features');
    if (features) {
      const items = [
        'Published Solar System reference replaces procedural generation for EXAMPLE:system:1.',
        'Eight planets are displayed with measured mean orbital and physical values.',
        `${majorMoons.length} major moons are rendered; catalog totals are shown on their parent planets.`,
        'The main asteroid belt and Kuiper Belt are shown as compressed reference regions.',
        'Earth is the only confirmed populated and biosphere-bearing world.',
        'Orbital phase is schematic and is not a date-specific ephemeris.'
      ];
      features.replaceChildren(...items.map(text => {const li=document.createElement('li');li.textContent=text;return li;}));
    }
  }

  function renderSvg() {
    const background = $('exo-orbit-background');
    const layer = $('exo-orbit-objects');
    const empty = $('exo-orbit-empty');
    if (!background || !layer) return;
    background.replaceChildren();
    layer.replaceChildren();
    if (empty) empty.hidden = true;
    visuals = new Map();

    const distances = [...planets.map(planet => planet.distance),...belts.map(belt => belt.distance),star.hzInner,star.hzOuter];
    const min = Math.min(...distances);
    const max = Math.max(...distances);
    const hz1 = orbitRadius(star.hzInner,min,max);
    const hz2 = orbitRadius(star.hzOuter,min,max);
    background.append(svg('ellipse',{cx:500,cy:500,rx:(hz1+hz2)/2,ry:(hz1+hz2)/2*.72,class:'exo-habitable-zone','stroke-width':Math.max(12,hz2-hz1)}));

    for (const belt of belts) {
      const radius = orbitRadius(belt.distance,min,max);
      background.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-path'}));
      const group = svg('g',{class:'exo-belt-target',tabindex:'0',role:'button','aria-label':`Select ${belt.name}`});
      group.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-hit'}),svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-selection'}));
      const label=svg('text',{x:Math.min(960,500+radius),y:495,class:'exo-object-label'});label.textContent=belt.orbit;group.append(label);
      bindSvgSelection(group,belt.id);
      layer.append(group);
      visuals.set(belt.id,{kind:'belt',group});
    }

    for (const planet of planets) {
      const radius = orbitRadius(planet.distance,min,max);
      background.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-orbit-path'}));
      const carrier = svg('g',{class:'exo-planet-carrier'});
      const group = svg('g',{class:'exo-planet-target',tabindex:'0',role:'button','aria-label':`Select ${planet.name}`});
      const size = /Gas giant/.test(planet.type) ? 15 : /Ice giant/.test(planet.type) ? 12 : Math.max(5.5,Math.min(10,planet.radius*3.1));
      group.append(svg('circle',{r:size+7,class:'exo-selection-ring'}),svg('circle',{r:size,fill:planet.color,class:'exo-planet-body'}));
      const label=svg('text',{x:size+10,y:5,class:'exo-object-label'});label.textContent=ROMAN[planet.orbit-1];group.append(label);
      bindSvgSelection(group,planet.id);
      carrier.append(group);
      visuals.set(planet.id,{kind:'planet',group,carrier,radius,period:planet.periodDays,phase:planet.phase});

      planet.moons.forEach((item,index) => {
        const moonOrbit = 24 + Math.min(index,10)*5;
        carrier.prepend(svg('ellipse',{cx:0,cy:0,rx:moonOrbit,ry:moonOrbit*.66,class:'exo-moon-orbit'}));
        const moonGroup=svg('g',{class:'exo-moon-target',tabindex:'0',role:'button','aria-label':`Select ${item.name}`});
        const moonSize=Math.max(2.1,Math.min(4.5,item.radius*8));
        moonGroup.append(svg('circle',{r:moonSize+4,class:'exo-selection-ring'}),svg('circle',{r:moonSize,fill:item.color,class:'exo-moon-body'}));
        bindSvgSelection(moonGroup,item.id);
        carrier.append(moonGroup);
        visuals.set(item.id,{kind:'moon',group:moonGroup,radius:moonOrbit,period:item.periodDays,phase:item.phase,parentId:planet.id});
      });
      layer.append(carrier);
    }

    const sun = svg('g',{class:'exo-star-target',tabindex:'0',role:'button','aria-label':'Select the Sun'});
    sun.append(svg('circle',{cx:500,cy:500,r:66,class:'exo-star-halo'}),svg('circle',{cx:500,cy:500,r:31,fill:star.color,class:'exo-star-core'}),svg('circle',{cx:500,cy:500,r:44,class:'exo-selection-ring'}));
    bindSvgSelection(sun,'star');
    layer.append(sun);
    visuals.set('star',{kind:'star',group:sun});
  }

  function bindSvgSelection(element,id) {
    element.addEventListener('click',event => {event.stopPropagation();selectObject(id);});
    element.addEventListener('keydown',event => {
      if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();selectObject(id);}
    });
  }

  function selectObject(id) {
    if (!active) return;
    const object = objects.get(id);
    if (!object) return;
    selectedId = id;
    for (const [key,visual] of visuals) visual.group.classList.toggle('exo-selected',key===id);
    document.querySelectorAll('#exo-orbital-table-body tr').forEach(row => row.setAttribute('aria-selected',String(row.dataset.objectId===id)));
    inspect(object);
  }

  function inspect(object) {
    setText($('exo-inspector-title'),object.name);
    setText($('exo-inspector-summary'),object.summary);
    setText($('exo-selection-name'),object.name);
    const badges=$('exo-inspector-badges');
    const data=$('exo-inspector-data');
    const resources=$('exo-inspector-resources');
    badges?.replaceChildren();data?.replaceChildren();resources?.replaceChildren();
    const badgeValues = object.kind === 'star' ? ['Published reference','G2V primary','4.568 Gyr']
      : object.kind === 'planet' ? [object.type,`Orbit ${object.orbit}`,`${object.moonCount} recognized moons`]
        : object.kind === 'moon' ? [object.type,`Moon of ${object.parentName}`,'Major moon displayed']
          : [object.type,object.density,object.orbit];
    for (const text of badgeValues) {const span=document.createElement('span');span.textContent=text;badges?.append(span);}

    if (object.kind === 'star') {
      addData(data,'Classification','G2V · Yellow dwarf');addData(data,'Mass','1.000 M☉');addData(data,'Luminosity','1.000 L☉');
      addData(data,'Effective temperature','5,772 K');addData(data,'Habitable zone','0.95–1.67 AU');addData(data,'Estimated age','4.568 billion years');
    } else if (object.kind === 'planet') {
      addData(data,'Planet class',object.type);addData(data,'Mean orbital distance',`${object.distance.toFixed(4)} AU`);addData(data,'Sidereal orbital period',period(object.periodDays));
      addData(data,'Sidereal rotation',`${object.dayHours < 0 ? 'retrograde · ' : ''}${Math.abs(object.dayHours).toLocaleString()} hours`);addData(data,'Mass',`${object.mass} Earth masses`);
      addData(data,'Mean radius',`${object.radius} Earth radii`);addData(data,'Surface/cloud gravity',`${object.gravity} g`);addData(data,'Mean/reference temperature',`${object.temperature} K`);
      addData(data,'Atmosphere',object.atmosphere);addData(data,'Orbital eccentricity',object.eccentricity);addData(data,'Orbital inclination',`${object.inclination}°`);
      addData(data,'Recognized moons',object.moonCount.toLocaleString());addData(data,'Major moons displayed',object.moons.length);addData(data,'Rings',object.rings?'Present':'No major ring system');
      addData(data,'Biosphere',object.biosphere);addData(data,'Civilization',object.civilization);
    } else if (object.kind === 'moon') {
      addData(data,'Moon class',object.type);addData(data,'Parent world',object.parentName);addData(data,'Mean orbital radius',`${object.orbitalDistanceKm.toLocaleString()} km`);
      addData(data,'Orbital period',period(object.periodDays));addData(data,'Mass',`${formatSmall(object.mass)} Earth masses`);addData(data,'Radius',`${formatSmall(object.radius)} Earth radii`);
      addData(data,'Surface gravity',`${formatSmall(object.gravity)} g`);addData(data,'Reference temperature',`${object.temperature} K`);addData(data,'Atmosphere',object.atmosphere);
    } else {
      addData(data,'Belt class',object.type);addData(data,'Displayed central distance',`${object.distance} AU`);addData(data,'Displayed width',`${object.widthAu} AU`);
      addData(data,'Estimated mass',`${object.estimatedMass} lunar masses`);addData(data,'Density',object.density);addData(data,'Composition',object.composition);addData(data,'Status',object.operations);
    }
    for (const item of [...(object.hazards||[]),...(object.resources||[])]) {const li=document.createElement('li');li.textContent=item;resources?.append(li);}
  }

  function setPopulationSummary() {
    const population=$('exo-summary-population');
    setText(population,'Populated · Earth');
    population?.classList.add('is-populated');population?.classList.remove('is-unpopulated');
    setText($('exo-summary-hz-bodies'),'2');
  }

  function disableDossierHandoff() {
    const button=$('exo-develop-world');
    if (button) button.hidden=true;
    const note=button?.nextElementSibling;
    if (note) note.textContent='Published Solar System reference mode. Procedural dossier handoff is disabled so measured reference data is not replaced by a generated world.';
  }

  function cleanSolCard() {
    const card=[...document.querySelectorAll('#exo-cluster-grid .exo-cluster-card')]
      .find(item => (item.dataset.catalogName || item.querySelector('h3')?.textContent.trim()) === 'Sol');
    if (!card) return;
    card.querySelector('.exo-real-reference-facts')?.remove();
    const note=card.querySelector('.exo-real-neighborhood-note');
    if (note) note.textContent='Published Solar System reference. Detailed orbital phase is schematic.';
    const open=card.querySelector('.exo-cluster-open');
    if (open) {setText(open,'Open Published Solar System');open.title='Loads the fixed published Solar System reference rather than a procedural EXO system.';}
  }

  function animate() {
    if (active) {
      const days=Number.parseFloat(($('exo-epoch')?.textContent||'').replace(/[^\d.-]/g,''))||0;
      for (const visual of visuals.values()) {
        if (visual.kind === 'planet') {
          const angle=visual.phase+days/visual.period*Math.PI*2;
          const x=500+Math.cos(angle)*visual.radius;
          const y=500+Math.sin(angle)*visual.radius*.72;
          visual.carrier.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        } else if (visual.kind === 'moon') {
          const angle=visual.phase+days/visual.period*Math.PI*2;
          visual.group.setAttribute('transform',`translate(${(Math.cos(angle)*visual.radius).toFixed(2)} ${(Math.sin(angle)*visual.radius*.66).toFixed(2)})`);
        }
      }
    }
    requestAnimationFrame(animate);
  }

  function exportSol(event) {
    if (!active) return;
    event.preventDefault();event.stopImmediatePropagation();
    const payload={version:1,seed:SOL_SEED,name:'Sol',referenceMode:'published-solar-system',phase:'schematic',star,planets,belts,referenceReviewed:'2026-07-13'};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='sol-published-reference.json';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  function addData(container,label,value) {if(!container)return;const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;container.append(dt,dd);}
  function setText(node,value) {if(node&&node.textContent!==String(value))node.textContent=String(value);}
  function svg(tag,attrs={}) {const node=document.createElementNS(SVG_NS,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
  function orbitRadius(distance,min,max) {const low=Math.log10(Math.max(.01,min));const high=Math.log10(Math.max(.02,max));return 100+Math.max(0,Math.min(1,(Math.log10(Math.max(.01,distance))-low)/(high-low)))*350;}
  function period(days) {if(days<2)return`${days.toFixed(3)} days`;if(days<730)return`${days.toFixed(2)} days`;return`${(days/365.25).toFixed(2)} years`;}
  function formatSmall(value) {return Math.abs(value)<.001?Number(value).toExponential(3):String(value);}
  function hashUnit(value) {let hash=2166136261;for(const character of String(value)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}return(hash>>>0)/4294967295;}

  function initialize() {
    const generate=$('exo-generate-system');
    const grid=$('exo-cluster-grid');
    if (!generate || !grid || !$('exo-orbit-svg')) {requestAnimationFrame(initialize);return;}
    generate.addEventListener('click',scheduleApply);
    $('exo-seed-input')?.addEventListener('change',scheduleApply);
    $('exo-export-system')?.addEventListener('click',exportSol,true);
    new MutationObserver(() => {cleanSolCard();if(isSol())scheduleApply();}).observe(grid,{childList:true});
    document.addEventListener('blacklight:example-reference-applied',cleanSolCard);
    scheduleApply();
    animate();
  }

  initialize();
})();
