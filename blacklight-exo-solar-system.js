(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const HANDOFF_KEY = 'blacklight-exo-selected-world-v1';

  const controls = {
    generate:$('exo-generate-system'), toggle:$('exo-toggle-orbits'),
    export:$('exo-export-system'), seed:$('exo-seed-input'),
    speed:$('exo-speed-select'), develop:$('exo-develop-world')
  };
  const ui = {
    name:$('exo-summary-name'), star:$('exo-summary-star'), planets:$('exo-summary-planets'),
    seed:$('exo-summary-seed'), epoch:$('exo-epoch'), selection:$('exo-selection-name'),
    title:$('exo-orbit-title'), background:$('exo-orbit-background'), objects:$('exo-orbit-objects'),
    empty:$('exo-orbit-empty'), inspectorTitle:$('exo-inspector-title'), inspectorSummary:$('exo-inspector-summary'),
    badges:$('exo-inspector-badges'), data:$('exo-inspector-data'), resources:$('exo-inspector-resources'),
    table:$('exo-orbital-table-body'), resourceIndex:$('exo-resource-index'), features:$('exo-system-features')
  };
  if (!controls.generate || !$('exo-orbit-svg')) return;

  const STAR_TYPES = [
    ['M','Red dwarf',48,.12,.55,.003,.09,2400,3900,'#ff7c5f'],
    ['K','Orange dwarf',23,.55,.82,.10,.40,3900,5200,'#ffad6d'],
    ['G','Yellow dwarf',14,.82,1.15,.45,1.65,5200,6100,'#ffd979'],
    ['F','Yellow-white star',7,1.15,1.55,1.6,5.2,6100,7500,'#fff0bd'],
    ['A','White star',3,1.55,2.5,5,45,7500,10000,'#eaf3ff'],
    ['B','Blue-white star',1,2.5,8,50,3500,10000,26000,'#b9d5ff'],
    ['WD','White dwarf',3,.48,1.15,.0002,.03,5000,28000,'#dcecff']
  ];
  const PREFIX = ['Aster','Cael','Drax','Eri','Galen','Helio','Ilyr','Kest','Lumen','Mira','Nex','Orin','Prax','Quell','Rhea','Soren','Talon','Umbra','Vey','Warden','Xan','Yara','Zorin'];
  const SUFFIX = ['ion','ara','os','ea','is','on',' Prime',' Reach',' Expanse',' Verge',' Ascendant',' Minor',' Major',' Gate'];
  const COLORS = {Scorched:'#d36a3f',Volcanic:'#c64d2b',Barren:'#9b8a72',Temperate:'#5ea77b',Ocean:'#4d8fd1','Super-Earth':'#8eb397','Mini-Neptune':'#72a5b8','Gas giant':'#d6a86c','Ice giant':'#79a9d5',Frozen:'#b8d3de',Dwarf:'#a89d90'};

  let system = null;
  let visuals = new Map();
  let running = true;
  let days = 0;
  let previousFrame = performance.now();
  let selectedObjectId = 'star';

  function rngFor(seed) {
    let state = 2166136261;
    for (const char of String(seed)) { state ^= char.charCodeAt(0); state = Math.imul(state,16777619); }
    return () => { state += 0x6D2B79F5; let value=state; value=Math.imul(value^value>>>15,value|1); value^=value+Math.imul(value^value>>>7,value|61); return ((value^value>>>14)>>>0)/4294967296; };
  }
  const number = (rng,min,max,digits=2) => Number((min+(max-min)*rng()).toFixed(digits));
  const integer = (rng,min,max) => Math.floor(min+rng()*(max-min+1));
  const pick = (rng,list) => list[Math.floor(rng()*list.length)];
  const clone = value => JSON.parse(JSON.stringify(value));

  function resolveSystem(seed) {
    const fixed = globalThis.BlacklightExoFixedSystems?.resolve(seed);
    if (fixed) return fixed;
    return generateProceduralSystem(seed);
  }

  function generateProceduralSystem(seed) {
    const rng = rngFor(seed);
    const name = `${pick(rng,PREFIX)}${pick(rng,SUFFIX)}`.replace(/\s+/g,' ').trim();
    const starType = weightedStar(rng);
    const star = {
      id:'star',kind:'star',name,class:starType[0],label:starType[1],
      mass:number(rng,starType[3],starType[4],3),luminosity:number(rng,starType[5],starType[6],4),
      temperature:integer(rng,starType[7],starType[8]),color:starType[9],age:number(rng,.05,12),
      resources:['continuous fusion output','stellar-wind collection','magnetosphere research','gravitational reference mass'],
      hazards:['stellar radiation','coronal activity'],provenance:'rng'
    };
    star.hzInner=Number((Math.sqrt(Math.max(star.luminosity,.001))*.95).toFixed(2));
    star.hzOuter=Number((Math.sqrt(Math.max(star.luminosity,.001))*1.67).toFixed(2));
    star.summary=`${star.label} primary with ${star.mass} solar masses and ${star.luminosity} solar luminosities.`;

    const count=integer(rng,4,12);
    const snowLine=Math.max(.7,2.7*Math.sqrt(Math.max(star.luminosity,.002)));
    const planets=[];
    let distance=Math.max(.05,Math.sqrt(Math.max(star.luminosity,.002))*number(rng,.16,.42,3));
    for(let index=0;index<count;index+=1){
      if(index) distance*=number(rng,1.42,2.05,3);
      const planet=makeProceduralPlanet(rng,name,index,distance,star,snowLine);
      planet.moons=Array.from({length:planet.moonCount},(_,moonIndex)=>makeProceduralMoon(rng,planet,moonIndex));
      planets.push(planet);
    }
    const belts=[];
    const inside=planets.filter(item=>item.distance<snowLine);
    const outside=planets.filter(item=>item.distance>=snowLine);
    if(inside.length&&outside.length&&rng()<.82) belts.push(makeProceduralBelt(rng,'Primary debris belt',(inside.at(-1).distance+outside[0].distance)/2,0,star,'Asteroid belt'));
    if(rng()<.48) belts.push(makeProceduralBelt(rng,'Outer cometary belt',planets.at(-1).distance*number(rng,1.45,2.7),belts.length,star,'Cometary belt'));
    const worlds=[...planets,...planets.flatMap(item=>item.moons)];
    const totals={
      metals:worlds.filter(item=>item.resources.some(value=>/iron|metal|rare|platinum/i.test(value))).length+belts.length,
      volatiles:worlds.filter(item=>item.resources.some(value=>/water|volatile|methane|ammonia/i.test(value))).length,
      fuel:worlds.filter(item=>item.resources.some(value=>/helium|hydrogen|deuterium/i.test(value))).length,
      biospheres:worlds.filter(item=>!item.biosphere.startsWith('No')).length,
      habitable:worlds.filter(item=>item.habitability>=65).length,
      industrial:worlds.filter(item=>item.gravity<2.2).length+belts.length
    };
    return {
      version:3,seed,sourceMode:'procedural',provenance:'rng',name,generatedAt:new Date().toISOString(),
      star,snowLine:Number(snowLine.toFixed(2)),planets,belts,resourceTotals:totals,
      features:[`${planets.flatMap(item=>item.moons).length} individually charted moons.`,`${belts.length} selectable debris fields charted.`,`${totals.habitable} worlds meet the EXO habitability threshold.`]
    };
  }

  function weightedStar(rng){const total=STAR_TYPES.reduce((sum,item)=>sum+item[2],0);let roll=rng()*total;for(const item of STAR_TYPES){roll-=item[2];if(roll<=0)return item;}return STAR_TYPES[0];}

  function makeProceduralPlanet(rng,systemName,index,distance,star,snowLine){
    const temperature=Math.max(20,Math.round(278*Math.pow(Math.max(star.luminosity,.001),.25)/Math.sqrt(distance)*number(rng,.91,1.22,3)));
    const rollMass=distance>snowLine?number(rng,1,800):number(rng,.05,8);
    let type;
    if(distance<.18||temperature>620)type=rng()<.5?'Scorched':'Volcanic';
    else if(distance<snowLine*.75){if(distance>=star.hzInner*.82&&distance<=star.hzOuter*1.12)type=rollMass>2.8?'Super-Earth':rng()<.34?'Ocean':'Temperate';else type=rollMass>3.2&&rng()<.3?'Super-Earth':'Barren';}
    else if(rollMass>20)type=rng()<.68?'Gas giant':'Ice giant';else if(rollMass>5)type=rng()<.58?'Mini-Neptune':'Ice giant';else type=rng()<.78?'Frozen':'Dwarf';
    const ranges={Scorched:[.08,2.2],Volcanic:[.3,3.8],Barren:[.05,2.5],Temperate:[.45,2.5],Ocean:[.6,3.8],'Super-Earth':[2.5,9],'Mini-Neptune':[5,18],'Gas giant':[35,950],'Ice giant':[12,80],Frozen:[.08,2.8],Dwarf:[.002,.12]};
    const mass=number(rng,...ranges[type],ranges[type][1]>100?1:2);
    const radius=type==='Gas giant'?number(rng,7.5,15.8):type==='Ice giant'?number(rng,3.2,6.8):type==='Mini-Neptune'?number(rng,2.1,4.6):type==='Dwarf'?number(rng,.12,.52):Number(Math.max(.3,Math.pow(mass,.27)*number(rng,.88,1.12,3)).toFixed(2));
    const gravity=Number((mass/Math.max(.04,radius*radius)).toFixed(2));
    const giant=['Gas giant','Ice giant','Mini-Neptune'].includes(type);
    const habitability=Math.min(100,(temperature>=245&&temperature<=320?42:temperature>=210&&temperature<=360?20:0)+(['Temperate','Ocean'].includes(type)?30:type==='Super-Earth'?15:0)+(gravity>=.65&&gravity<=1.45?10:0));
    const moonCount=giant?integer(rng,2,type==='Gas giant'?22:14):rng()<Math.min(.75,.16+mass*.17)?integer(rng,1,mass>2?4:2):0;
    return {
      id:`planet-${index+1}`,kind:'planet',orbit:index+1,name:`${systemName} ${index+1}`,type,
      distance:Number(distance.toFixed(3)),mass,radius,gravity,temperature,
      atmosphere:atmosphereFor(type),hydrosphere:type==='Ocean'?integer(rng,78,100):type==='Temperate'?integer(rng,18,82):type==='Frozen'?integer(rng,12,64):0,
      habitability,periodDays:Number((Math.sqrt(distance**3/Math.max(.08,star.mass))*365.25).toFixed(2)),
      dayHours:number(rng,giant?7:9,giant?22:96,1),eccentricity:number(rng,.002,.19,3),inclination:number(rng,0,11,1),
      moonCount,moons:[],rings:giant?rng()<.58:rng()<.04,phase:number(rng,0,Math.PI*2,4),color:COLORS[type],
      resources:resourcesFor(type),biosphere:habitability>=70&&rng()<.58?'Complex native biosphere':'No confirmed biosphere',
      civilization:habitability>=65&&rng()<.16?'Industrial civilization':'No confirmed civilization',hazards:['environmental exposure'],
      provenance:'rng',summary:`${type} world at ${distance.toFixed(2)} AU with an estimated mean temperature of ${temperature} K.`
    };
  }

  function makeProceduralMoon(rng,planet,index){
    const type=['Gas giant','Ice giant','Mini-Neptune','Frozen'].includes(planet.type)&&rng()<.58?'Ice moon':rng()<.12?'Volcanic moon':'Rocky moon';
    const mass=number(rng,.00001,.18,5),radius=number(rng,.015,.55,3);
    return {id:`${planet.id}-moon-${index+1}`,kind:'moon',parentId:planet.id,parentName:planet.name,orbit:`${planet.orbit}.${index+1}`,name:`${planet.name}-${String.fromCharCode(97+index)}`,type,
      orbitalDistanceKm:integer(rng,45000+index*18000,180000+index*95000),periodDays:number(rng,.18+index*.22,6+index*4.8,2),mass,radius,gravity:Number((mass/Math.max(.0004,radius*radius)).toFixed(3)),temperature:Math.max(18,Math.round(planet.temperature*number(rng,.82,1.08,3))),atmosphere:'None',hydrosphere:type==='Ice moon'?integer(rng,8,70):0,habitability:0,phase:number(rng,0,Math.PI*2,4),color:type==='Ice moon'?'#b7d4df':'#938878',resources:type==='Ice moon'?['water ice','silicates']:['silicates','iron-nickel mass'],biosphere:'No confirmed biosphere',civilization:'No confirmed civilization',hazards:['vacuum exposure'],provenance:'rng',summary:`${type} orbiting ${planet.name}.`};
  }

  function makeProceduralBelt(rng,name,distance,index,star,type){return{id:`belt-${index+1}`,kind:'belt',orbit:`B${index+1}`,name,type,distance:Number(distance.toFixed(3)),periodDays:Number((Math.sqrt(distance**3/Math.max(.08,star.mass))*365.25).toFixed(2)),widthAu:number(rng,Math.max(.02,distance*.035),Math.max(.08,distance*.22),3),estimatedMass:number(rng,.0002,.18,5),density:pick(rng,['diffuse','moderate','dense']),composition:type==='Cometary belt'?'water-rich comet nuclei':'metallic, silicate, and carbonaceous bodies',resources:type==='Cometary belt'?['water ice','methane ice','ammonia']:['iron-nickel mass','platinum-group metals','silicates'],operations:'unclaimed survey volume',hazards:['high-velocity collision risk'],habitability:0,provenance:'rng',summary:`${type} centered at ${distance.toFixed(2)} AU.`};}
  function atmosphereFor(type){return({Scorched:'Trace sodium vapor',Volcanic:'Dense carbon dioxide',Barren:'Thin nitrogen and argon',Temperate:'Nitrogen and oxygen',Ocean:'Nitrogen, oxygen, water vapor','Super-Earth':'Dense nitrogen and carbon dioxide','Mini-Neptune':'Hydrogen, helium, methane','Gas giant':'Hydrogen and helium','Ice giant':'Hydrogen, helium, methane',Frozen:'Thin nitrogen',Dwarf:'None'})[type]||'Unknown';}
  function resourcesFor(type){if(['Gas giant','Mini-Neptune'].includes(type))return['hydrogen fuel','helium-3','deuterium'];if(['Ice giant','Frozen','Dwarf'].includes(type))return['water ice','methane ice','silicates'];return['iron-nickel deposits','silicates','rare-earth elements'];}

  function loadSystem(seed){
    system=resolveSystem(seed);
    days=0;
    selectedObjectId='star';
    renderAll();
    globalThis.BlacklightExoActiveSystem=clone(system);
    document.dispatchEvent(new CustomEvent('blacklight:system-rendered',{detail:{seed:system.seed,sourceMode:system.sourceMode,name:system.name}}));
  }

  function renderAll(){
    document.body.classList.toggle('exo-published-sol',system.sourceMode==='published-fixed');
    setText(ui.name,system.name);setText(ui.star,`${system.star.class} · ${system.star.label}`);setText(ui.planets,system.planets.length);setText(ui.seed,system.seed);setText(ui.epoch,'Day 0.0');setText(ui.title,`${system.name} orbital projection`);
    const title=$('exo-orbit-svg-title'),desc=$('exo-orbit-svg-desc');
    setText(title,`${system.name} orbital display`);setText(desc,system.sourceMode==='published-fixed'?'Stored published Solar System model.':'Deterministic generated system model.');
    drawOrbits();renderTable();renderResources();renderFeatures();select('star');
  }

  function drawOrbits(){
    visuals=new Map();ui.background.replaceChildren();ui.objects.replaceChildren();if(ui.empty)ui.empty.hidden=true;
    const distances=[...system.planets.map(item=>item.distance),...system.belts.map(item=>item.distance),system.star.hzInner,system.star.hzOuter];
    const min=Math.min(...distances),max=Math.max(...distances),hz1=orbitRadius(system.star.hzInner,min,max),hz2=orbitRadius(system.star.hzOuter,min,max);
    ui.background.append(svg('ellipse',{cx:500,cy:500,rx:(hz1+hz2)/2,ry:(hz1+hz2)/2*.72,class:'exo-habitable-zone','stroke-width':Math.max(12,hz2-hz1)}));
    for(const belt of system.belts){const radius=orbitRadius(belt.distance,min,max);ui.background.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-path'}));const group=svg('g',{class:'exo-belt-target',tabindex:'0',role:'button','aria-label':`Select ${belt.name}`});group.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-hit'}),svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-selection'}));const label=svg('text',{x:Math.min(960,500+radius),y:495,class:'exo-object-label'});label.textContent=belt.name;group.append(label);bindSelection(group,belt.id);ui.objects.append(group);visuals.set(belt.id,{kind:'belt',group});}
    for(const planet of system.planets){const radius=orbitRadius(planet.distance,min,max);ui.background.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-orbit-path'}));const carrier=svg('g',{class:'exo-planet-carrier'});const group=svg('g',{class:'exo-planet-target',tabindex:'0',role:'button','aria-label':`Select ${planet.name}`});const size=/Gas giant/.test(planet.type)?15:/Ice giant/.test(planet.type)?12:/Mini-Neptune/.test(planet.type)?10:Math.max(6,Math.min(10,planet.radius*3.4));group.append(svg('circle',{r:size+7,class:'exo-selection-ring'}),svg('circle',{r:size,fill:planet.color,class:'exo-planet-body'}));const label=svg('text',{x:size+10,y:5,class:'exo-object-label'});label.textContent=planet.name;group.append(label);bindSelection(group,planet.id);carrier.append(group);visuals.set(planet.id,{kind:'planet',group,carrier,radius,period:planet.periodDays,phase:planet.phase});planet.moons.forEach((moon,index)=>{const moonOrbit=24+Math.min(index,10)*5;carrier.prepend(svg('ellipse',{cx:0,cy:0,rx:moonOrbit,ry:moonOrbit*.66,class:'exo-moon-orbit'}));const moonGroup=svg('g',{class:'exo-moon-target',tabindex:'0',role:'button','aria-label':`Select ${moon.name}`});const moonSize=Math.max(2.1,Math.min(4.5,moon.radius*8));moonGroup.append(svg('circle',{r:moonSize+4,class:'exo-selection-ring'}),svg('circle',{r:moonSize,fill:moon.color,class:'exo-moon-body'}));bindSelection(moonGroup,moon.id);carrier.append(moonGroup);visuals.set(moon.id,{kind:'moon',group:moonGroup,radius:moonOrbit,period:moon.periodDays,phase:moon.phase,parentId:planet.id});});ui.objects.append(carrier);}
    const starGroup=svg('g',{class:'exo-star-target',tabindex:'0',role:'button','aria-label':`Select ${system.star.name}`});starGroup.append(svg('circle',{cx:500,cy:500,r:66,class:'exo-star-halo'}),svg('circle',{cx:500,cy:500,r:31,fill:system.star.color,class:'exo-star-core'}),svg('circle',{cx:500,cy:500,r:44,class:'exo-selection-ring'}));bindSelection(starGroup,'star');ui.objects.append(starGroup);visuals.set('star',{kind:'star',group:starGroup});
  }

  function bindSelection(element,id){element.addEventListener('click',event=>{event.stopPropagation();select(id);});element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(id);}});}
  function svg(tag,attrs={}){const node=document.createElementNS(SVG,tag);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
  function orbitRadius(distance,min,max){if(max<=min)return 230;const low=Math.log10(Math.max(.01,min)),high=Math.log10(Math.max(.02,max));return 100+Math.max(0,Math.min(1,(Math.log10(Math.max(.01,distance))-low)/(high-low)))*350;}

  function renderTable(){ui.table.replaceChildren();for(const planet of system.planets){appendRow(planet,[planet.orbit,planet.name,planet.type,`${planet.distance} AU`,formatPeriod(planet.periodDays),planet.moonCount??planet.moons.length,`${planet.habitability}%`]);for(const moon of planet.moons)appendRow(moon,[moon.orbit,`↳ ${moon.name}`,moon.type,`${moon.orbitalDistanceKm.toLocaleString()} km from ${planet.name}`,formatPeriod(moon.periodDays),'—',`${moon.habitability}%`]);}for(const belt of system.belts)appendRow(belt,[belt.orbit,belt.name,belt.type,`${belt.distance} AU`,formatPeriod(belt.periodDays),'—','—']);}
  function appendRow(object,cells){const row=document.createElement('tr');row.dataset.objectId=object.id;row.dataset.provenance=object.provenance||system.provenance||'unknown';if(Number.isFinite(object.eccentricity))row.dataset.eccentricity=String(object.eccentricity);if(Number.isFinite(object.inclination))row.dataset.inclination=String(object.inclination);if(Number.isFinite(object.phase))row.dataset.phase=String(object.phase);row.setAttribute('aria-selected','false');cells.forEach((value,index)=>{const cell=document.createElement('td');if(index===1){const button=document.createElement('button');button.type='button';button.textContent=value;button.addEventListener('click',event=>{event.stopPropagation();select(object.id);});cell.append(button);}else cell.textContent=String(value);row.append(cell);});row.addEventListener('click',event=>{if(!event.target.closest('button'))select(object.id);});ui.table.append(row);}

  function objectById(id){if(id==='star')return system.star;for(const planet of system.planets){if(planet.id===id)return planet;const moon=planet.moons.find(item=>item.id===id);if(moon)return moon;}return system.belts.find(item=>item.id===id)||null;}
  function select(id){const object=objectById(id);if(!object)return;selectedObjectId=id;for(const[key,visual]of visuals)visual.group.classList.toggle('exo-selected',key===id);for(const row of ui.table.querySelectorAll('tr'))row.setAttribute('aria-selected',String(row.dataset.objectId===id));inspect(object);}
  function inspect(object){setText(ui.inspectorTitle,object.name);setText(ui.inspectorSummary,object.summary);setText(ui.selection,object.name);ui.badges.replaceChildren();ui.data.replaceChildren();ui.resources.replaceChildren();if(controls.develop)controls.develop.hidden=system.sourceMode==='published-fixed'||!['planet','moon'].includes(object.kind)||object.habitability<65;const badges=object.kind==='star'?[`${object.class} class`,object.label,`${object.age} Gyr`]:object.kind==='belt'?[object.type,object.density,object.orbit]:[object.type,object.kind==='moon'?`Moon of ${object.parentName}`:`Orbit ${object.orbit}`,`${object.habitability}% habitability`,object.provenance==='published'?'Published':'Generated'];for(const value of badges){const span=document.createElement('span');span.textContent=value;ui.badges.append(span);}if(object.kind==='star'){addData('Classification',`${object.class} · ${object.label}`);addData('Mass',`${object.mass} M☉`);addData('Luminosity',`${object.luminosity} L☉`);addData('Temperature',`${object.temperature.toLocaleString()} K`);addData('Habitable zone',`${object.hzInner}–${object.hzOuter} AU`);addData('Estimated age',`${object.age} billion years`);}else if(object.kind==='planet'){addData('Planet class',object.type);addData('Mean orbital distance',`${object.distance} AU`);addData('Orbital period',formatPeriod(object.periodDays));addData('Rotation',`${object.dayHours<0?'retrograde · ':''}${Math.abs(object.dayHours)} hours`);addData('Mass',`${object.mass} Earth masses`);addData('Radius',`${object.radius} Earth radii`);addData('Surface gravity',`${object.gravity} g`);addData('Reference temperature',`${object.temperature} K`);addData('Atmosphere',object.atmosphere);addData('Recognized moons',object.moonCount??object.moons.length);addData('Major moons displayed',object.moons.length);addData('Orbital eccentricity',object.eccentricity);addData('Orbital inclination',`${object.inclination}°`);addData('Biosphere',object.biosphere);addData('Civilization',object.civilization);}else if(object.kind==='moon'){addData('Moon class',object.type);addData('Parent world',object.parentName);addData('Mean orbital radius',`${object.orbitalDistanceKm.toLocaleString()} km`);addData('Orbital period',formatPeriod(object.periodDays));addData('Mass',`${object.mass} Earth masses`);addData('Radius',`${object.radius} Earth radii`);addData('Surface gravity',`${object.gravity} g`);addData('Atmosphere',object.atmosphere);}else{addData('Belt class',object.type);addData('Central distance',`${object.distance} AU`);addData('Approximate width',`${object.widthAu} AU`);addData('Estimated mass',`${object.estimatedMass} lunar masses`);addData('Density',object.density);addData('Composition',object.composition);addData('Status',object.operations);}for(const item of [...(object.hazards||[]),...(object.resources||[])]){const li=document.createElement('li');li.textContent=item;ui.resources.append(li);}}
  function addData(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);ui.data.append(dt,dd);}

  function renderResources(){const values=[[system.resourceTotals.metals,'Metal-rich bodies'],[system.resourceTotals.volatiles,'Volatile-bearing worlds'],[system.resourceTotals.fuel,'Fuel-source bodies'],[system.resourceTotals.biospheres,'Confirmed/candidate biospheres'],[system.resourceTotals.habitable,'Habitable worlds'],[system.resourceTotals.industrial,'Operationally accessible bodies']];ui.resourceIndex.replaceChildren(...values.map(([value,label])=>{const card=document.createElement('div');card.className='exo-resource-item';const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;card.append(strong,span);return card;}));}
  function renderFeatures(){ui.features.replaceChildren(...system.features.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
  function formatPeriod(value){if(value<2)return`${value.toFixed(3)} days`;if(value<730)return`${value.toFixed(2)} days`;return`${(value/365.25).toFixed(2)} years`;}
  function setText(node,value){if(node&&node.textContent!==String(value))node.textContent=String(value);}

  function animate(timestamp){const elapsed=Math.min(.1,(timestamp-previousFrame)/1000);previousFrame=timestamp;if(running&&system){days+=elapsed*Number(controls.speed?.value||1);setText(ui.epoch,`Day ${days.toFixed(1)}`);for(const visual of visuals.values()){if(visual.kind==='planet'){const angle=visual.phase+days/Math.max(.01,visual.period)*Math.PI*2;visual.carrier.setAttribute('transform',`translate(${(500+Math.cos(angle)*visual.radius).toFixed(2)} ${(500+Math.sin(angle)*visual.radius*.72).toFixed(2)})`);}else if(visual.kind==='moon'){const angle=visual.phase+days/Math.max(.01,visual.period)*Math.PI*2;visual.group.setAttribute('transform',`translate(${(Math.cos(angle)*visual.radius).toFixed(2)} ${(Math.sin(angle)*visual.radius*.66).toFixed(2)})`);}}}requestAnimationFrame(animate);}

  function exportSystem(){if(!system)return;const blob=new Blob([JSON.stringify(system,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${system.seed.replace(/[^a-z0-9_-]+/gi,'-')}.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  function developSelected(){const object=objectById(selectedObjectId);if(!object||!['planet','moon'].includes(object.kind)||object.habitability<65||system.sourceMode==='published-fixed')return;localStorage.setItem(HANDOFF_KEY,JSON.stringify({system:clone(system),world:clone(object)}));location.href='blacklight-exo-world-dossier.html';}

  controls.generate.addEventListener('click',()=>loadSystem(controls.seed.value.trim()||'EXO-DEFAULT'));
  controls.seed?.addEventListener('keydown',event=>{if(event.key==='Enter')loadSystem(controls.seed.value.trim()||'EXO-DEFAULT');});
  controls.toggle?.addEventListener('click',()=>{running=!running;controls.toggle.setAttribute('aria-pressed',String(!running));controls.toggle.textContent=running?'Pause Projection':'Resume Projection';});
  controls.export?.addEventListener('click',exportSystem);
  controls.develop?.addEventListener('click',developSelected);

  globalThis.BlacklightExoResolveSystem = seed => clone(resolveSystem(seed));
  globalThis.BlacklightExoGetActiveSystem = () => system ? clone(system) : null;

  loadSystem(controls.seed?.value.trim()||'EXO-DEFAULT');
  requestAnimationFrame(animate);
})();
