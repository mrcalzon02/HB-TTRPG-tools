(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const controls = { generate: $('exo-generate-system'), toggle: $('exo-toggle-orbits'), export: $('exo-export-system'), seed: $('exo-seed-input'), speed: $('exo-speed-select') };
  if (!controls.generate || !$('exo-orbit-svg')) return;

  const ui = {
    name: $('exo-summary-name'), star: $('exo-summary-star'), planets: $('exo-summary-planets'), seed: $('exo-summary-seed'),
    epoch: $('exo-epoch'), selection: $('exo-selection-name'), title: $('exo-orbit-title'), background: $('exo-orbit-background'),
    objects: $('exo-orbit-objects'), empty: $('exo-orbit-empty'), inspectorTitle: $('exo-inspector-title'),
    inspectorSummary: $('exo-inspector-summary'), badges: $('exo-inspector-badges'), data: $('exo-inspector-data'),
    resources: $('exo-inspector-resources'), table: $('exo-orbital-table-body'), resourceIndex: $('exo-resource-index'),
    features: $('exo-system-features')
  };

  const STARS = [
    ['M','Red dwarf',48,.12,.55,.003,.09,2400,3900,'#ff7c5f'],
    ['K','Orange dwarf',23,.55,.82,.10,.40,3900,5200,'#ffad6d'],
    ['G','Yellow dwarf',14,.82,1.15,.45,1.65,5200,6100,'#ffd979'],
    ['F','Yellow-white star',7,1.15,1.55,1.6,5.2,6100,7500,'#fff0bd'],
    ['A','White star',3,1.55,2.5,5,45,7500,10000,'#eaf3ff'],
    ['B','Blue-white star',1,2.5,8,50,3500,10000,26000,'#b9d5ff'],
    ['WD','White dwarf',3,.48,1.15,.0002,.03,5000,28000,'#dcecff'],
    ['SG','Evolved subgiant',2,.9,2.2,2,28,4200,6500,'#ffd18e']
  ];
  const PREFIX = ['Aster','Cael','Drax','Eri','Galen','Helio','Ilyr','Kest','Lumen','Mira','Nex','Orin','Prax','Quell','Rhea','Soren','Talon','Umbra','Vey','Warden','Xan','Yara','Zorin'];
  const SUFFIX = ['ion','ara','os','ea','is','on',' Prime',' Reach',' Expanse',' Verge',' Ascendant',' Minor',' Major',' Gate'];
  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV'];
  const COLORS = { Scorched:'#d36a3f', Volcanic:'#c64d2b', Barren:'#9b8a72', Temperate:'#5ea77b', Ocean:'#4d8fd1', 'Super-Earth':'#8eb397', 'Mini-Neptune':'#72a5b8', 'Gas giant':'#d6a86c', 'Ice giant':'#79a9d5', Frozen:'#b8d3de', Dwarf:'#a89d90' };
  const ATMOS = {
    Scorched:['None','Trace sodium vapor','Carbon dioxide and sulfur'], Volcanic:['Dense carbon dioxide','Sulfur dioxide and ash'],
    Barren:['None','Trace carbon dioxide','Thin nitrogen and argon'], Temperate:['Nitrogen and oxygen','Nitrogen, carbon dioxide, water vapor'],
    Ocean:['Nitrogen, oxygen, water vapor','Dense steam and nitrogen'], 'Super-Earth':['Dense nitrogen and carbon dioxide','High-pressure nitrogen and oxygen'],
    'Mini-Neptune':['Hydrogen, helium, methane','Hydrogen and water vapor'], 'Gas giant':['Hydrogen and helium','Hydrogen, helium, methane'],
    'Ice giant':['Hydrogen, helium, methane','Methane and hydrogen'], Frozen:['Thin nitrogen','Carbon dioxide frost atmosphere'], Dwarf:['None','Trace nitrogen']
  };
  const RESOURCE_POOLS = {
    rock:['iron-nickel deposits','silicates','radioactives','rare-earth elements','subsurface volatiles','platinum-group metals'],
    life:['accessible water','biosphere compounds','agricultural land','geothermal energy','complex organics'],
    gas:['helium-3','hydrogen fuel','deuterium','ammonia','methane feedstock'],
    ice:['water ice','methane ice','ammonia','deuterium','cryogenic volatiles']
  };

  let system = null;
  let visuals = new Map();
  let running = true;
  let days = 0;
  let previousFrame = performance.now();

  function rngFor(seed) {
    let state = 2166136261;
    for (const char of seed) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
    return () => { state += 0x6D2B79F5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
  }
  const number = (rng, min, max, digits = 2) => Number((min + (max - min) * rng()).toFixed(digits));
  const integer = (rng, min, max) => Math.floor(min + rng() * (max - min + 1));
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
  function unique(rng, list, count) { const pool = [...list], out = []; while (pool.length && out.length < count) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]); return out; }
  function weightedStar(rng) { const total = STARS.reduce((sum, item) => sum + item[2], 0); let roll = rng() * total; for (const item of STARS) { roll -= item[2]; if (roll <= 0) return item; } return STARS[0]; }
  function randomSeed() { if (globalThis.crypto?.getRandomValues) { const values = new Uint32Array(2); crypto.getRandomValues(values); return `${values[0].toString(36)}-${values[1].toString(36)}`; } return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }

  function planetType(rng, distance, temp, snow, hzInner, hzOuter, rollMass) {
    if (distance < .18 || temp > 620) return rng() < .5 ? 'Scorched' : 'Volcanic';
    if (distance < snow * .75) {
      if (distance >= hzInner * .82 && distance <= hzOuter * 1.12) return rollMass > 2.8 ? 'Super-Earth' : rng() < .34 ? 'Ocean' : 'Temperate';
      return rollMass > 3.2 && rng() < .3 ? 'Super-Earth' : 'Barren';
    }
    if (rollMass > 20) return rng() < .68 ? 'Gas giant' : 'Ice giant';
    if (rollMass > 5) return rng() < .58 ? 'Mini-Neptune' : 'Ice giant';
    return rng() < .78 ? 'Frozen' : 'Dwarf';
  }

  function typeMass(rng, type) {
    const ranges = { Scorched:[.08,2.2], Volcanic:[.3,3.8], Barren:[.05,2.5], Temperate:[.45,2.5], Ocean:[.6,3.8], 'Super-Earth':[2.5,9], 'Mini-Neptune':[5,18], 'Gas giant':[35,950], 'Ice giant':[12,80], Frozen:[.08,2.8], Dwarf:[.002,.12] };
    const [min,max] = ranges[type]; return number(rng,min,max,max > 100 ? 1 : 2);
  }

  function typeRadius(rng, type, mass) {
    if (type === 'Gas giant') return number(rng,7.5,15.8); if (type === 'Ice giant') return number(rng,3.2,6.8);
    if (type === 'Mini-Neptune') return number(rng,2.1,4.6); if (type === 'Dwarf') return number(rng,.12,.52);
    return Number(Math.max(.3, Math.pow(mass,.27) * number(rng,.88,1.12,3)).toFixed(2));
  }

  function planetResources(rng, type) {
    let pool = RESOURCE_POOLS.rock;
    if (['Temperate','Ocean','Super-Earth'].includes(type)) pool = [...RESOURCE_POOLS.rock,...RESOURCE_POOLS.life];
    if (['Gas giant','Mini-Neptune'].includes(type)) pool = RESOURCE_POOLS.gas;
    if (['Ice giant','Frozen','Dwarf'].includes(type)) pool = [...RESOURCE_POOLS.ice,...RESOURCE_POOLS.rock];
    return unique(rng,pool,integer(rng,3,5));
  }

  function makePlanet(rng, systemName, index, distance, star, snow) {
    const rollMass = distance > snow ? number(rng,1,800) : number(rng,.05,8);
    const temperature = Math.max(20, Math.round(278 * Math.pow(Math.max(star.luminosity,.001),.25) / Math.sqrt(distance) * number(rng,.91,1.22,3)));
    const type = planetType(rng,distance,temperature,snow,star.hzInner,star.hzOuter,rollMass);
    const mass = typeMass(rng,type), radius = typeRadius(rng,type,mass), gravity = Number((mass / Math.max(.04,radius * radius)).toFixed(2));
    const giant = ['Gas giant','Ice giant','Mini-Neptune'].includes(type);
    const periodDays = Number((Math.sqrt(distance ** 3 / Math.max(.08,star.mass)) * 365.25).toFixed(2));
    const hydrosphere = type === 'Ocean' ? integer(rng,78,100) : type === 'Temperate' ? integer(rng,18,82) : type === 'Frozen' ? integer(rng,12,64) : 0;
    let habitability = 0;
    if (temperature >= 245 && temperature <= 320) habitability += 42; else if (temperature >= 210 && temperature <= 360) habitability += 20;
    if (['Temperate','Ocean'].includes(type)) habitability += 30; if (type === 'Super-Earth') habitability += 15;
    const atmosphere = pick(rng,ATMOS[type]); if (/oxygen/i.test(atmosphere)) habitability += 18; if (gravity >= .65 && gravity <= 1.45) habitability += 10;
    habitability = Math.min(100,habitability);
    const moonMax = type === 'Gas giant' ? 22 : type === 'Ice giant' ? 14 : giant ? 8 : mass > 2 ? 4 : 2;
    return {
      id:`planet-${index+1}`, kind:'planet', orbit:index+1, name:`${systemName} ${ROMAN[index] || index+1}`, type,
      distance:Number(distance.toFixed(3)), mass, radius, gravity, temperature, atmosphere, hydrosphere, habitability,
      periodDays, dayHours:number(rng,giant?7:9,giant?22:96,1), eccentricity:number(rng,.002,.19,3), inclination:number(rng,0,11,1),
      moons:giant?integer(rng,2,moonMax):rng()<Math.min(.75,.16+mass*.17)?integer(rng,1,moonMax):0,
      rings:giant?rng()<.58:rng()<.04, phase:number(rng,0,Math.PI*2,4), color:COLORS[type], resources:planetResources(rng,type),
      biosphere:habitability >= 70 && rng()<.58 ? pick(rng,['Complex native biosphere','Microbial-to-complex biosphere','Engineered biosphere signature']) : habitability >=45 && rng()<.4 ? 'Microbial biosphere candidate' : 'No confirmed biosphere',
      civilization:habitability >=65 && rng()<.16 ? pick(rng,['Pre-industrial sapient culture','Industrial civilization','Orbital-capable civilization','Interstellar civilization holding']) : rng()<.025 ? 'Artificial or non-biological activity' : 'No confirmed civilization',
      hazards:unique(rng,['extreme radiation','corrosive atmosphere','violent storms','tectonic instability','high-velocity debris','cryogenic surface','toxic chemistry','magnetic anomalies','severe gravity well'],integer(rng,1,3)),
      summary:`${type} world at ${distance.toFixed(2)} AU with an estimated mean temperature of ${temperature} K.`
    };
  }

  function generateSystem(seed) {
    const rng = rngFor(seed), name = `${pick(rng,PREFIX)}${pick(rng,SUFFIX)}`.replace(/\s+/g,' ').trim(), type = weightedStar(rng);
    const star = { id:'star', kind:'star', name, class:type[0], label:type[1], mass:number(rng,type[3],type[4],3), luminosity:number(rng,type[5],type[6],4), temperature:integer(rng,type[7],type[8]), color:type[9], age:number(rng,.05,type[0]==='B'?.08:type[0]==='A'?1.5:12), resources:['continuous fusion output','stellar-wind collection','magnetosphere research','gravitational reference mass'] };
    star.hzInner = Number((Math.sqrt(Math.max(star.luminosity,.001))*.95).toFixed(2)); star.hzOuter = Number((Math.sqrt(Math.max(star.luminosity,.001))*1.67).toFixed(2)); star.summary = `${star.label} primary with ${star.mass} solar masses and ${star.luminosity} solar luminosities.`;
    const count = integer(rng,type[0]==='B'?2:4,type[0]==='B'?6:12), snow = Math.max(.7,2.7*Math.sqrt(Math.max(star.luminosity,.002))), planets = [];
    let distance = Math.max(.05,Math.sqrt(Math.max(star.luminosity,.002))*number(rng,.16,.42,3));
    for (let i=0;i<count;i+=1) { if (i) distance *= number(rng,1.42,2.05,3); planets.push(makePlanet(rng,name,i,distance,star,snow)); }
    const belts = [];
    const inside = planets.filter(p=>p.distance<snow), outside = planets.filter(p=>p.distance>=snow);
    if (inside.length && outside.length && rng()<.82) belts.push({name:'Primary debris belt',distance:Number(((inside.at(-1).distance+outside[0].distance)/2).toFixed(2))});
    if (rng()<.48) belts.push({name:'Outer cometary belt',distance:Number((planets.at(-1).distance*number(rng,1.45,2.7)).toFixed(2))});
    const totals = { metals:planets.filter(p=>p.resources.some(r=>/iron|metal|rare|platinum/i.test(r))).length+belts.length*2, volatiles:planets.filter(p=>p.resources.some(r=>/water|volatile|methane|ammonia/i.test(r))).length+belts.length, fuel:planets.filter(p=>p.resources.some(r=>/helium|hydrogen|deuterium/i.test(r))).length, biospheres:planets.filter(p=>!p.biosphere.startsWith('No')).length, habitable:planets.filter(p=>p.habitability>=65).length, industrial:planets.filter(p=>p.gravity<2.2).length+belts.length };
    const features = [`${belts.length} debris field${belts.length===1?'':'s'} charted.`,`${totals.habitable} world${totals.habitable===1?'':'s'} meet the EXO habitability threshold.`];
    if (planets.some(p=>!p.civilization.startsWith('No'))) features.push('Non-natural activity or civilization signature requires review.');
    if (['B','A'].includes(star.class)) features.push('Short-lived luminous primary compresses the biological-development window.');
    return { version:1, seed, name, generatedAt:new Date().toISOString(), star, snowLine:Number(snow.toFixed(2)), planets, belts, resourceTotals:totals, features };
  }

  function svg(tag, attrs={}) { const node=document.createElementNS(SVG,tag); for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value)); return node; }
  function orbitRadius(distance,min,max) { if (max<=min) return 230; const low=Math.log10(Math.max(.01,min)), high=Math.log10(Math.max(.02,max)); return 100+Math.max(0,Math.min(1,(Math.log10(Math.max(.01,distance))-low)/(high-low)))*350; }
  function period(daysValue) { return daysValue<2?`${daysValue.toFixed(2)} days`:daysValue<730?`${daysValue.toFixed(1)} days`:`${(daysValue/365.25).toFixed(2)} years`; }
  function addData(label,value) { const dt=document.createElement('dt'),dd=document.createElement('dd'); dt.textContent=label; dd.textContent=value; ui.data.append(dt,dd); }

  function inspect(object) {
    ui.inspectorTitle.textContent=object.name; ui.inspectorSummary.textContent=object.summary; ui.selection.textContent=object.name;
    ui.badges.replaceChildren(); ui.data.replaceChildren(); ui.resources.replaceChildren();
    const badges=object.kind==='star'?[`${object.class} class`,object.label,`${object.age} Gyr`]:[object.type,`Orbit ${object.orbit}`,`${object.habitability}% habitability`];
    for (const label of badges) { const span=document.createElement('span'); span.textContent=label; ui.badges.append(span); }
    if (object.kind==='star') {
      addData('Classification',`${object.class} · ${object.label}`); addData('Mass',`${object.mass} M☉`); addData('Luminosity',`${object.luminosity} L☉`); addData('Temperature',`${object.temperature.toLocaleString()} K`); addData('Habitable zone',`${object.hzInner}–${object.hzOuter} AU`); addData('Estimated age',`${object.age} billion years`);
    } else {
      addData('Planet class',object.type); addData('Orbital distance',`${object.distance} AU`); addData('Orbital period',period(object.periodDays)); addData('Day length',`${object.dayHours} hours`); addData('Mass',`${object.mass} Earth masses`); addData('Radius',`${object.radius} Earth radii`); addData('Surface gravity',`${object.gravity} g`); addData('Mean temperature',`${object.temperature} K`); addData('Atmosphere',object.atmosphere); addData('Hydrosphere',`${object.hydrosphere}%`); addData('Moons / rings',`${object.moons} moon${object.moons===1?'':'s'} · ${object.rings?'rings present':'no major rings'}`); addData('Biosphere',object.biosphere); addData('Civilization',object.civilization);
      for (const hazard of object.hazards) { const li=document.createElement('li'); li.textContent=`Hazard: ${hazard}`; ui.resources.append(li); }
    }
    for (const resource of object.resources) { const li=document.createElement('li'); li.textContent=resource; ui.resources.append(li); }
  }

  function select(id) {
    const object=id==='star'?system.star:system.planets.find(p=>p.id===id); if (!object) return;
    for (const [key,visual] of visuals) visual.group.classList.toggle('exo-selected',key===id);
    document.querySelectorAll('#exo-orbital-table-body tr').forEach(row=>row.setAttribute('aria-selected',String(row.dataset.objectId===id)));
    inspect(object);
  }

  function drawOrbits() {
    visuals=new Map(); ui.background.replaceChildren(); ui.objects.replaceChildren(); ui.empty.hidden=true;
    const distances=[...system.planets.map(p=>p.distance),...system.belts.map(b=>b.distance),system.star.hzInner,system.star.hzOuter], min=Math.min(...distances), max=Math.max(...distances);
    const hz1=orbitRadius(system.star.hzInner,min,max),hz2=orbitRadius(system.star.hzOuter,min,max),hz=(hz1+hz2)/2;
    ui.background.append(svg('ellipse',{cx:500,cy:500,rx:hz,ry:hz*.72,class:'exo-habitable-zone','stroke-width':Math.max(12,hz2-hz1)}));
    for (const belt of system.belts) { const r=orbitRadius(belt.distance,min,max); ui.background.append(svg('ellipse',{cx:500,cy:500,rx:r,ry:r*.72,class:'exo-belt-path'})); }
    for (const planet of system.planets) {
      const r=orbitRadius(planet.distance,min,max); ui.background.append(svg('ellipse',{cx:500,cy:500,rx:r,ry:r*.72,class:'exo-orbit-path'}));
      const group=svg('g',{class:'exo-planet-target',tabindex:'0',role:'button','aria-label':`Select ${planet.name}`}), size=planet.type==='Gas giant'?15:planet.type==='Ice giant'?12:planet.type==='Mini-Neptune'?10:planet.type==='Dwarf'?5:Math.max(6,Math.min(10,planet.radius*3.4));
      group.append(svg('circle',{r:size+7,class:'exo-selection-ring'}),svg('circle',{r:size,fill:planet.color,class:'exo-planet-body'})); const label=svg('text',{x:size+10,y:5,class:'exo-object-label'}); label.textContent=ROMAN[planet.orbit-1]; group.append(label);
      group.addEventListener('click',()=>select(planet.id)); group.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();select(planet.id);}}); ui.objects.append(group); visuals.set(planet.id,{group,radius:r,period:planet.periodDays,phase:planet.phase});
    }
    const star=svg('g',{class:'exo-star-target',tabindex:'0',role:'button','aria-label':`Select star ${system.star.name}`}); star.append(svg('circle',{cx:500,cy:500,r:66,class:'exo-star-halo'}),svg('circle',{cx:500,cy:500,r:31,fill:system.star.color,class:'exo-star-core'}),svg('circle',{cx:500,cy:500,r:44,class:'exo-selection-ring'})); star.addEventListener('click',()=>select('star')); star.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();select('star');}}); ui.objects.append(star); visuals.set('star',{group:star});
  }

  function renderTable() {
    ui.table.replaceChildren();
    for (const planet of system.planets) { const row=document.createElement('tr'); row.dataset.objectId=planet.id; row.setAttribute('aria-selected','false'); const level=planet.habitability>=65?'high':planet.habitability>=35?'medium':'low'; row.innerHTML=`<td>${planet.orbit}</td><td><button type="button">${planet.name}</button></td><td>${planet.type}</td><td>${planet.distance} AU</td><td>${period(planet.periodDays)}</td><td>${planet.moons}</td><td><span class="exo-habitability ${level}">${planet.habitability}%</span></td>`; row.querySelector('button').addEventListener('click',()=>select(planet.id)); row.addEventListener('click',event=>{if(event.target.tagName!=='BUTTON')select(planet.id);}); ui.table.append(row); }
  }

  function renderProfile() {
    ui.resourceIndex.replaceChildren(); const labels={metals:'Metal-rich sites',volatiles:'Volatile sources',fuel:'Fuel-giant sources',biospheres:'Biosphere candidates',habitable:'Habitable worlds',industrial:'Industrial footholds'};
    for (const [key,value] of Object.entries(system.resourceTotals)) { const card=document.createElement('div'); card.className='exo-resource-item'; card.innerHTML=`<strong>${value}</strong><span>${labels[key]}</span>`; ui.resourceIndex.append(card); }
    ui.features.replaceChildren(); for (const feature of system.features) { const li=document.createElement('li'); li.textContent=feature; ui.features.append(li); }
  }

  function render() { ui.name.textContent=system.name; ui.star.textContent=`${system.star.class} · ${system.star.label}`; ui.planets.textContent=system.planets.length; ui.seed.textContent=system.seed; ui.title.textContent=`${system.name} orbital projection`; drawOrbits(); renderTable(); renderProfile(); select('star'); }
  function generate() { const seed=controls.seed.value.trim()||randomSeed(); controls.seed.value=seed; system=generateSystem(seed); days=0; running=true; controls.toggle.textContent='Pause Projection'; controls.toggle.setAttribute('aria-pressed','false'); render(); }
  function exportJson() { if(!system)return; const blob=new Blob([JSON.stringify(system,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a'); link.href=url; link.download=`${system.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-exo-system.json`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }

  controls.generate.addEventListener('click',generate); controls.toggle.addEventListener('click',()=>{running=!running;controls.toggle.textContent=running?'Pause Projection':'Resume Projection';controls.toggle.setAttribute('aria-pressed',String(!running));}); controls.export.addEventListener('click',exportJson); controls.seed.addEventListener('keydown',event=>{if(event.key==='Enter')generate();});
  function animate(now) { const delta=Math.min(.1,Math.max(0,(now-previousFrame)/1000)); previousFrame=now; if(system&&running)days+=delta*Number(controls.speed.value||100); if(system){for(const [id,visual] of visuals){if(id==='star')continue;const angle=visual.phase+days/visual.period*Math.PI*2,x=500+Math.cos(angle)*visual.radius,y=500+Math.sin(angle)*visual.radius*.72;visual.group.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);}ui.epoch.textContent=`Day ${days.toLocaleString(undefined,{maximumFractionDigits:1})}`;}requestAnimationFrame(animate);}
  generate(); requestAnimationFrame(animate);
})();
