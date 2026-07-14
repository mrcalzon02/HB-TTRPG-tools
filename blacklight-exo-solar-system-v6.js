(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const MAX_SPEED = .25;
  const HANDOFF_KEY = 'blacklight-exo-selected-world-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const Layout = globalThis.BlacklightExoOrbitalLayout;

  const controls = {
    generate:$('exo-generate-system'), toggle:$('exo-toggle-orbits'), export:$('exo-export-system'),
    seed:$('exo-seed-input'), speed:$('exo-speed-select'), develop:$('exo-develop-world')
  };
  const ui = {
    name:$('exo-summary-name'), star:$('exo-summary-star'), planets:$('exo-summary-planets'), seed:$('exo-summary-seed'),
    epoch:$('exo-epoch'), selection:$('exo-selection-name'), title:$('exo-orbit-title'), background:$('exo-orbit-background'),
    objects:$('exo-orbit-objects'), empty:$('exo-orbit-empty'), inspectorTitle:$('exo-inspector-title'),
    inspectorSummary:$('exo-inspector-summary'), badges:$('exo-inspector-badges'), data:$('exo-inspector-data'),
    resources:$('exo-inspector-resources'), table:$('exo-orbital-table-body'), resourceIndex:$('exo-resource-index'),
    features:$('exo-system-features')
  };
  if (!controls.generate || !$('exo-orbit-svg') || !Layout) return;

  let system = null;
  let layout = null;
  let visuals = new Map();
  let selectedId = 'star';
  let simulationDays = 0;
  let running = true;
  let previousFrame = performance.now();
  let previousMoonFrame = 0;
  let imageryRequest = 0;

  const COLORS = {Scorched:'#d36a3f',Volcanic:'#c64d2b',Barren:'#9b8a72',Temperate:'#5ea77b',Ocean:'#4d8fd1','Super-Earth':'#8eb397','Mini-Neptune':'#72a5b8','Gas giant':'#d6a86c','Ice giant':'#79a9d5',Frozen:'#b8d3de',Dwarf:'#a89d90'};
  const PREFIX = ['Aster','Cael','Drax','Eri','Galen','Helio','Ilyr','Kest','Lumen','Mira','Nex','Orin','Prax','Quell','Rhea','Soren','Talon','Umbra','Vey','Warden','Xan','Yara','Zorin'];
  const SUFFIX = ['ion','ara','os','ea','is','on',' Prime',' Reach',' Expanse',' Verge',' Ascendant',' Minor',' Major',' Gate'];

  function rngFor(seed) {
    let state = 2166136261;
    for (const char of String(seed)) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
    return () => { state += 0x6D2B79F5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
  }
  const randomNumber = (rng, min, max, digits = 2) => Number((min + (max - min) * rng()).toFixed(digits));
  const integer = (rng, min, max) => Math.floor(min + rng() * (max - min + 1));
  const pick = (rng, values) => values[Math.floor(rng() * values.length)];

  function resolveSystem(seed) {
    return globalThis.BlacklightExoFixedSystems?.resolve(seed) || generateProceduralSystem(seed);
  }

  function generateProceduralSystem(seed) {
    const rng = rngFor(seed);
    const name = `${pick(rng, PREFIX)}${pick(rng, SUFFIX)}`.replace(/\s+/g, ' ').trim();
    const starClass = pick(rng, [
      {class:'M',label:'Red dwarf',mass:[.12,.55],luminosity:[.003,.09],temperature:[2400,3900],color:'#ff7c5f'},
      {class:'K',label:'Orange dwarf',mass:[.55,.82],luminosity:[.10,.40],temperature:[3900,5200],color:'#ffad6d'},
      {class:'G',label:'Yellow dwarf',mass:[.82,1.15],luminosity:[.45,1.65],temperature:[5200,6100],color:'#ffd979'},
      {class:'F',label:'Yellow-white star',mass:[1.15,1.55],luminosity:[1.6,5.2],temperature:[6100,7500],color:'#fff0bd'}
    ]);
    const star = {id:'star',kind:'star',name,class:starClass.class,label:starClass.label,mass:randomNumber(rng,...starClass.mass,3),luminosity:randomNumber(rng,...starClass.luminosity,4),temperature:integer(rng,...starClass.temperature),color:starClass.color,age:randomNumber(rng,.1,11.8,2),resources:['continuous fusion output','stellar-wind collection'],hazards:['stellar radiation'],provenance:'rng'};
    star.hzInner=Number((Math.sqrt(Math.max(star.luminosity,.001))*.95).toFixed(3));
    star.hzOuter=Number((Math.sqrt(Math.max(star.luminosity,.001))*1.67).toFixed(3));
    star.summary=`${star.label} primary with ${star.mass} solar masses.`;
    const count=integer(rng,5,11), planets=[];
    let distance=Math.max(.04,Math.sqrt(star.luminosity)*randomNumber(rng,.14,.32,3));
    for(let index=0;index<count;index+=1){
      if(index)distance*=randomNumber(rng,1.55,2.12,3);
      const beyondSnow=distance>2.7*Math.sqrt(Math.max(.01,star.luminosity));
      const type=beyondSnow?(rng()<.58?'Gas giant':'Ice giant'):(distance>=star.hzInner*.8&&distance<=star.hzOuter*1.2?(rng()<.45?'Temperate':'Super-Earth'):(rng()<.25?'Volcanic':'Barren'));
      const mass=type==='Gas giant'?randomNumber(rng,40,700,2):type==='Ice giant'?randomNumber(rng,10,60,2):type==='Super-Earth'?randomNumber(rng,2,8,2):randomNumber(rng,.08,2.2,3);
      const radius=type==='Gas giant'?randomNumber(rng,8,14):type==='Ice giant'?randomNumber(rng,3.5,6):Math.max(.25,Number(Math.pow(mass,.28).toFixed(3)));
      const moonCount=/giant/i.test(type)?integer(rng,5,28):rng()<.45?integer(rng,1,3):0;
      const planet={id:`planet-${index+1}`,kind:'planet',classification:'major-planet',orbit:String(index+1),name:`${name} ${index+1}`,type,distance:Number(distance.toFixed(4)),mass,radius,gravity:Number((mass/(radius*radius)).toFixed(3)),temperature:Math.round(278*Math.pow(star.luminosity,.25)/Math.sqrt(distance)),atmosphere:/giant/i.test(type)?'Hydrogen, helium, and trace volatiles':type==='Temperate'?'Nitrogen-bearing atmosphere':'Thin or unknown atmosphere',hydrosphere:type==='Temperate'?integer(rng,15,75):0,habitability:type==='Temperate'?integer(rng,60,88):0,periodDays:Number((Math.sqrt(distance**3/star.mass)*365.25).toFixed(3)),dayHours:randomNumber(rng,8,90,2),eccentricity:randomNumber(rng,.001,.16,4),inclination:randomNumber(rng,0,8,3),ascendingNode:randomNumber(rng,0,360,3),argumentOfPeriapsis:randomNumber(rng,0,360,3),phase:randomNumber(rng,0,TAU,5),moonCount,moons:[],rings:/giant/i.test(type)&&rng()<.55,color:COLORS[type]||'#9b8a72',resources:['silicates','metals'],biosphere:type==='Temperate'&&rng()<.25?'Candidate biosphere':'No confirmed biosphere',civilization:type==='Temperate'&&rng()<.08?'Industrial civilization':'No confirmed civilization',hazards:['environmental exposure'],provenance:'rng',summary:`${type} world at ${distance.toFixed(3)} AU.`};
      planet.moons=Array.from({length:moonCount},(_,moonIndex)=>makeProceduralMoon(rng,planet,moonIndex));
      planets.push(planet);
    }
    const belts=[];
    if(planets.length>3)belts.push({id:'belt-1',kind:'belt',orbit:'B1',name:'Primary debris belt',type:'Asteroid belt',distance:Number(((planets[2].distance+planets[3].distance)/2).toFixed(3)),periodDays:1200,widthAu:.3,estimatedMass:.04,density:'moderate',composition:'metallic, silicate, and carbonaceous bodies',resources:['iron-nickel mass','silicates'],operations:'unclaimed survey volume',hazards:['collision risk'],habitability:0,provenance:'rng',summary:'Generated debris belt.'});
    const moons=planets.flatMap(body=>body.moons);
    return {version:6,seed,sourceMode:'procedural',provenance:'rng',name,star,planets,belts,facilities:[],majorPlanetCount:planets.length,dwarfPlanetCount:0,moonCount:moons.length,resourceTotals:{metals:planets.length+belts.length,volatiles:planets.filter(body=>/giant|frozen/i.test(body.type)).length,fuel:planets.filter(body=>/giant/i.test(body.type)).length,biospheres:planets.filter(body=>!/No confirmed/.test(body.biosphere)).length,habitable:planets.filter(body=>body.habitability>=65).length,industrial:planets.length+belts.length},features:[`${moons.length} individually charted moons.`,`${belts.length} selectable debris fields charted.`]};
  }

  function makeProceduralMoon(rng,planet,index){
    const distance=integer(rng,50000+index*12000,160000+index*70000),mass=randomNumber(rng,.000001,.05,7),radiusKm=integer(rng,18,2200);
    return{id:`${planet.id}-moon-${index+1}`,kind:'moon',parentId:planet.id,parentName:planet.name,orbit:`${planet.orbit}.${index+1}`,name:`${planet.name}-${index+1}`,type:radiusKm>900?'Major moon':'Minor moon',orbitalDistanceKm:distance,periodDays:randomNumber(rng,.2,80,4),mass,radius:radiusKm/6371,radiusKm,gravity:Number((mass/Math.max(.00001,(radiusKm/6371)**2)).toFixed(4)),temperature:planet.temperature,atmosphere:'None detected',hydrosphere:0,habitability:0,phase:randomNumber(rng,0,TAU,5),eccentricity:randomNumber(rng,0,.25,4),inclination:randomNumber(rng,0,160,3),ascendingNode:randomNumber(rng,0,360,3),argumentOfPeriapsis:randomNumber(rng,0,360,3),color:'#a7adb2',resources:['silicates'],biosphere:'No confirmed biosphere',civilization:'No confirmed civilization',hazards:['vacuum exposure'],provenance:'rng',summary:`Moon orbiting ${planet.name}.`};
  }

  function currentZoomPercent(){return clamp(finite($('exo-exclusive-zoom')?.value,100),10,50000);}
  function localFacilities(parentId){return (system?.facilities||[]).filter(item=>item.anchorType==='body-orbit'&&item.parentId===parentId);}
  function heliocentricFacilities(){return (system?.facilities||[]).filter(item=>item.anchorType==='heliocentric');}

  function localFacilityRadius(facility,parent){
    const parentLayout=layout?.bodyLayouts.get(parent.id);
    const envelope=Math.max(6,parentLayout?.satelliteEnvelope||12);
    const objects=[...(parent.moons||[]),...localFacilities(parent.id)]
      .filter(item=>finite(item.orbitalDistanceKm,-1)>0)
      .sort((a,b)=>finite(a.orbitalDistanceKm)-finite(b.orbitalDistanceKm));
    const values=objects.map(item=>finite(item.orbitalDistanceKm)).filter(value=>value>0);
    const min=Math.min(...values,1),max=Math.max(...values,1);
    const value=Math.max(1,finite(facility.orbitalDistanceKm,1));
    const normalized=max>min?(Math.log(value)-Math.log(min))/(Math.log(max)-Math.log(min)):.5;
    return 3.4+Math.pow(clamp(normalized,0,1),.76)*Math.max(0,envelope-3.4);
  }

  function loadSystem(seed){
    system=resolveSystem(seed);selectedId='star';simulationDays=0;globalThis.BlacklightExoProjectionEpochDays=0;
    renderAll();globalThis.BlacklightExoActiveSystem=system;
    document.dispatchEvent(new CustomEvent('blacklight:system-rendered',{detail:{seed:system.seed,sourceMode:system.sourceMode,name:system.name}}));
  }

  function renderAll(){
    document.body.classList.toggle('exo-published-sol',system.sourceMode==='published-fixed');
    setText(ui.name,system.name);setText(ui.star,`${system.star.class} · ${system.star.label}`);
    setText(ui.planets,system.sourceMode==='published-fixed'?`${system.majorPlanetCount} major + ${system.dwarfPlanetCount} dwarf`:system.planets.length);
    setText(ui.seed,system.seed);setText(ui.epoch,'Day 0.000');setText(ui.title,`${system.name} orbital projection`);
    setText($('exo-orbit-svg-title'),`${system.name} orbital display`);
    setText($('exo-orbit-svg-desc'),`Corridor-separated orbital projection with ${system.planets.length} heliocentric bodies, ${system.moonCount||0} individually selectable moons, and ${(system.facilities||[]).length} campaign infrastructure records.`);
    drawOrbits();renderTable();renderResources();renderFeatures();select('star',false);
  }

  function drawOrbits(){
    visuals=new Map();ui.background.replaceChildren();ui.objects.replaceChildren();if(ui.empty)ui.empty.hidden=true;
    layout=Layout.compute(system,{zoomPercent:currentZoomPercent(),focusedId:selectedId});
    globalThis.BlacklightExoActiveLayout=layout;
    const hzInner=layout.mapDistance(system.star.hzInner),hzOuter=layout.mapDistance(system.star.hzOuter);
    const hz=svg('ellipse',{cx:500,cy:500,rx:(hzInner+hzOuter)/2,ry:(hzInner+hzOuter)/2*.72,class:'exo-habitable-zone','stroke-width':Math.max(8,hzOuter-hzInner)});
    ui.background.append(hz);visuals.set('habitable-zone',{kind:'overlay',group:hz});

    for(const belt of system.belts||[]){
      const radius=layout.mapDistance(belt.distance),path=svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-path'});
      ui.background.append(path);
      const group=svg('g',{class:'exo-belt-target',tabindex:'0',role:'button','aria-label':`Select ${belt.name}`,'data-object-id':belt.id});
      group.append(svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-hit'}),svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:'exo-belt-selection'}));
      const label=svg('text',{x:Math.min(965,500+radius),y:495,class:'exo-object-label'});label.textContent=belt.name;group.append(label);
      bindSelection(group,belt.id);ui.objects.append(group);visuals.set(belt.id,{kind:'belt',group,path,distance:belt.distance});
    }

    for(const body of system.planets){
      const radius=layout.bodyRadii.get(body.id),orbitPath=svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:`exo-orbit-path ${body.kind==='dwarf-planet'?'exo-dwarf-orbit':''}`});
      ui.background.append(orbitPath);
      const carrier=svg('g',{class:`exo-planet-carrier ${body.kind==='dwarf-planet'?'exo-dwarf-carrier':''}`});
      const target=svg('g',{class:`exo-planet-target ${body.kind==='dwarf-planet'?'exo-dwarf-target':''}`,tabindex:'0',role:'button','aria-label':`Select ${body.name}`,'data-object-id':body.id});
      const size=/Gas giant/.test(body.type)?13:/Ice giant/.test(body.type)?10:body.kind==='dwarf-planet'?4.5:Math.max(5.5,Math.min(9,finite(body.radius,1)*3));
      target.append(svg('circle',{r:size+7,class:'exo-selection-ring'}),svg('circle',{r:size,fill:body.color||'#9b8a72',class:'exo-planet-body'}));
      const label=svg('text',{x:size+9,y:4,class:'exo-object-label'});label.textContent=body.name;target.append(label);bindSelection(target,body.id);carrier.append(target);
      const bodyLayout=layout.bodyLayouts.get(body.id);
      let band=null;
      if(bodyLayout?.dense){band=svg('ellipse',{cx:0,cy:0,rx:bodyLayout.satelliteEnvelope,ry:bodyLayout.satelliteEnvelope*.66,class:'exo-satellite-band'});carrier.prepend(band);}
      visuals.set(body.id,{kind:body.kind,body,group:target,carrier,orbitPath,band,targetRadius:radius,displayRadius:radius,period:finite(body.periodDays,1),phase:finite(body.phase),displayAngle:finite(body.phase)});

      for(const moon of body.moons||[]){
        const moonLayout=layout.moonLayouts.get(moon.id),moonOrbit=moonLayout?.displayRadius||5;
        const orbit=svg('ellipse',{cx:0,cy:0,rx:moonOrbit,ry:moonOrbit*.66,class:`exo-moon-orbit ${finite(moon.inclination)>90||finite(moon.eccentricity)>=.1?'exo-irregular-moon-orbit':''}`});
        carrier.prepend(orbit);
        const moonGroup=svg('g',{class:'exo-moon-target',tabindex:'0',role:'button','aria-label':`Select ${moon.name}`,'data-object-id':moon.id});
        const moonSize=Math.max(1.1,Math.min(3.6,finite(moon.radiusKm,finite(moon.radius)*6371)/700));
        moonGroup.append(svg('circle',{r:Math.max(4.5,moonSize+3.5),class:'exo-moon-hit'}),svg('circle',{r:moonSize+3,class:'exo-selection-ring'}),svg('circle',{r:moonSize,fill:moon.color||'#a7adb2',class:'exo-moon-body'}));
        const moonLabel=svg('text',{x:moonSize+5,y:3,class:'exo-moon-name'});moonLabel.textContent=moon.name;moonGroup.append(moonLabel);
        bindSelection(moonGroup,moon.id);carrier.append(moonGroup);
        visuals.set(moon.id,{kind:'moon',body:moon,group:moonGroup,orbit,label:moonLabel,parentId:body.id,targetRadius:moonOrbit,displayRadius:moonOrbit,period:finite(moon.periodDays,1),phase:finite(moon.phase),displayAngle:finite(moon.phase)});
      }

      for(const facility of localFacilities(body.id)){
        const facilityOrbit=localFacilityRadius(facility,body);
        const orbit=svg('ellipse',{cx:0,cy:0,rx:facilityOrbit,ry:facilityOrbit*.66,class:'exo-facility-orbit exo-facility-local-orbit'});
        carrier.prepend(orbit);
        const group=facilityTarget(facility);
        carrier.append(group);
        visuals.set(facility.id,{kind:'facility-local',body:facility,group,orbit,parentId:body.id,targetRadius:facilityOrbit,displayRadius:facilityOrbit,period:finite(facility.periodDays,1),phase:finite(facility.phase),displayAngle:finite(facility.phase)});
      }
      ui.objects.append(carrier);
    }

    for(const facility of heliocentricFacilities()){
      const radius=layout.mapDistance(facility.distance),elements=`exo-facility-orbit ${facility.status==='Under construction'?'is-construction':''}`;
      const orbitPath=svg('ellipse',{cx:500,cy:500,rx:radius,ry:radius*.72,class:elements});ui.background.append(orbitPath);
      const carrier=svg('g',{class:'exo-facility-carrier'}),group=facilityTarget(facility);carrier.append(group);ui.objects.append(carrier);
      visuals.set(facility.id,{kind:'facility-heliocentric',body:facility,group,carrier,orbitPath,targetRadius:radius,displayRadius:radius,period:finite(facility.periodDays,1),phase:finite(facility.phase),displayAngle:finite(facility.phase)});
    }

    const star=svg('g',{class:'exo-star-target',tabindex:'0',role:'button','aria-label':`Select ${system.star.name}`,'data-object-id':'star'});
    star.append(svg('circle',{cx:500,cy:500,r:25,class:'exo-star-halo'}),svg('circle',{cx:500,cy:500,r:10,fill:system.star.color,class:'exo-star-core'}),svg('circle',{cx:500,cy:500,r:18,class:'exo-selection-ring'}));
    bindSelection(star,'star');ui.objects.append(star);visuals.set('star',{kind:'star',group:star});
    applyLayout(true);updatePositions(1,true,true);
  }

  function facilityTarget(facility){
    const group=svg('g',{class:`exo-facility-target ${facility.status==='Under construction'?'is-construction':''}`,tabindex:'0',role:'button','aria-label':`Select ${facility.name}`,'data-object-id':facility.id});
    group.append(svg('circle',{r:10,class:'exo-facility-hit'}),svg('circle',{r:8,class:'exo-selection-ring'}),svg('path',{d:'M 0 -5 L 5 0 L 0 5 L -5 0 Z',fill:facility.color||'#61d8d0',class:'exo-facility-body'}));
    const label=svg('text',{x:8,y:4,class:'exo-facility-name'});label.textContent=facility.shortName||facility.name;group.append(label);bindSelection(group,facility.id);return group;
  }

  function applyLayout(force=false){
    if(!system)return;
    layout=Layout.compute(system,{zoomPercent:currentZoomPercent(),focusedId:selectedId});globalThis.BlacklightExoActiveLayout=layout;
    for(const body of system.planets){
      const visual=visuals.get(body.id),bodyLayout=layout.bodyLayouts.get(body.id);if(!visual||!bodyLayout)continue;
      visual.targetRadius=bodyLayout.radius;if(force)visual.displayRadius=bodyLayout.radius;
      visual.orbitPath.setAttribute('rx',bodyLayout.radius);visual.orbitPath.setAttribute('ry',bodyLayout.radius*.72);
      if(visual.band){visual.band.setAttribute('rx',bodyLayout.satelliteEnvelope);visual.band.setAttribute('ry',bodyLayout.satelliteEnvelope*.66);visual.band.classList.toggle('is-expanded',bodyLayout.parentFocused);}
      for(const moon of body.moons||[]){const moonVisual=visuals.get(moon.id),moonLayout=layout.moonLayouts.get(moon.id);if(!moonVisual||!moonLayout)continue;moonVisual.targetRadius=moonLayout.displayRadius;if(force)moonVisual.displayRadius=moonLayout.displayRadius;moonVisual.orbit.classList.toggle('is-orbit-visible',moonLayout.orbitVisible);moonVisual.label.classList.toggle('is-label-visible',moonLayout.labelVisible);moonVisual.group.classList.toggle('is-major-moon',moonLayout.major);moonVisual.group.style.opacity=String(moonLayout.pointOpacity);}
      for(const facility of localFacilities(body.id)){const v=visuals.get(facility.id);if(!v)continue;const radius=localFacilityRadius(facility,body);v.targetRadius=radius;if(force)v.displayRadius=radius;v.orbit.setAttribute('rx',radius);v.orbit.setAttribute('ry',radius*.66);}
    }
    for(const belt of system.belts||[]){const visual=visuals.get(belt.id),radius=layout.mapDistance(belt.distance);if(!visual)continue;visual.path.setAttribute('rx',radius);visual.path.setAttribute('ry',radius*.72);for(const ellipse of visual.group.querySelectorAll('ellipse')){ellipse.setAttribute('rx',radius);ellipse.setAttribute('ry',radius*.72);}}
    for(const facility of heliocentricFacilities()){const visual=visuals.get(facility.id);if(!visual)continue;const radius=layout.mapDistance(facility.distance);visual.targetRadius=radius;if(force)visual.displayRadius=radius;visual.orbitPath.setAttribute('rx',radius);visual.orbitPath.setAttribute('ry',radius*.72);}
    document.body.dataset.orbitalLod=layout.focusedParentId?'focused':currentZoomPercent()>=800?'detailed':'overview';
    document.dispatchEvent(new CustomEvent('blacklight:orbital-layout-changed',{detail:layout.snapshot}));
  }

  function bindSelection(element,id){element.addEventListener('click',event=>{event.stopPropagation();select(id);});element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(id);}});}
  function svg(tag,attrs={}){const node=document.createElementNS(SVG,tag);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;}

  function renderTable(){
    ui.table.replaceChildren();
    for(const body of system.planets){appendRow(body,[body.orbit,body.name,body.type,`${body.distance} AU`,formatPeriod(body.periodDays),body.moons?.length||0,`${body.habitability||0}%`]);for(const moon of body.moons||[])appendRow(moon,[moon.orbit,`↳ ${moon.name}`,moon.type,formatDistanceKm(moon.orbitalDistanceKm,body.name),formatPeriod(moon.periodDays),'—',`${moon.habitability||0}%`]);}
    for(const belt of system.belts||[])appendRow(belt,[belt.orbit,belt.name,belt.type,`${belt.distance} AU`,formatPeriod(belt.periodDays),'—','—']);
    for(const facility of system.facilities||[])appendRow(facility,[facility.orbit,facility.name,facility.type,facility.anchorType==='body-orbit'?formatDistanceKm(facility.orbitalDistanceKm,facility.parentName):`${facility.distance.toLocaleString()} AU`,formatPeriod(facility.periodDays),'—',facility.status]);
  }

  function appendRow(object,cells){
    const row=document.createElement('tr');row.dataset.objectId=object.id;row.dataset.bodyKind=object.kind;row.dataset.parentId=object.parentId||'';row.dataset.anchorType=object.anchorType||'';row.dataset.provenance=object.provenance||system.provenance||'unknown';
    for(const[key,value]of Object.entries({distanceAu:object.distance,orbitalDistanceKm:object.orbitalDistanceKm,periodDays:object.periodDays,eccentricity:object.eccentricity,inclination:object.inclination,phase:object.phase,ascendingNode:object.ascendingNode,argumentOfPeriapsis:object.argumentOfPeriapsis,radiusEarth:object.radius})){if(Number.isFinite(Number(value)))row.dataset[key]=String(value);}row.dataset.bodyColor=object.color||'';row.setAttribute('aria-selected','false');
    cells.forEach((value,index)=>{const cell=document.createElement('td');if(index===1){const button=document.createElement('button');button.type='button';button.textContent=value;button.addEventListener('click',event=>{event.stopPropagation();select(object.id);});cell.append(button);}else cell.textContent=String(value);row.append(cell);});row.addEventListener('click',event=>{if(!event.target.closest('button'))select(object.id);});ui.table.append(row);
  }

  function objectById(id){if(id==='star')return system.star;for(const body of system.planets){if(body.id===id)return body;const moon=(body.moons||[]).find(item=>item.id===id);if(moon)return moon;}return[...(system.belts||[]),...(system.facilities||[])].find(item=>item.id===id)||null;}
  function select(id){const object=objectById(id);if(!object)return;selectedId=id;for(const[key,visual]of visuals)visual.group?.classList.toggle('exo-selected',key===id);for(const row of ui.table.querySelectorAll('tr'))row.setAttribute('aria-selected',String(row.dataset.objectId===id));applyLayout();inspect(object);document.dispatchEvent(new CustomEvent('blacklight:object-selected',{detail:{id,kind:object.kind,parentId:object.parentId||null,anchorType:object.anchorType||null}}));}

  function inspect(object){
    setText(ui.inspectorTitle,object.name);setText(ui.inspectorSummary,object.summary||`${object.type||object.kind} record.`);setText(ui.selection,object.name);ui.badges.replaceChildren();ui.data.replaceChildren();ui.resources.replaceChildren();
    if(controls.develop)controls.develop.hidden=system.sourceMode==='published-fixed'||!['planet','dwarf-planet','moon'].includes(object.kind)||finite(object.habitability)<65;
    const published=String(object.provenance||'').startsWith('published');
    let badges;
    if(object.kind==='star')badges=[`${object.class} class`,object.label,`${object.age} Gyr`];
    else if(object.kind==='belt')badges=[object.type,object.density,object.orbit];
    else if(object.kind==='facility')badges=[object.status,object.operator,object.anchorType==='body-orbit'?object.location||`Orbiting ${object.parentName}`:object.location||`${object.distance} AU`,published?'Published + campaign':'Campaign fixed'];
    else badges=[object.type,object.kind==='moon'?`Moon of ${object.parentName}`:`Orbit ${object.orbit}`,`${object.habitability||0}% habitability`,published?'Published':'Generated'];
    for(const value of badges){const span=document.createElement('span');span.textContent=value;ui.badges.append(span);}
    if(object.kind==='star'){addData('Classification',`${object.class} · ${object.label}`);addData('Mass',`${object.mass} M☉`);addData('Luminosity',`${object.luminosity} L☉`);addData('Temperature',`${finite(object.temperature).toLocaleString()} K`);addData('Habitable zone',`${object.hzInner}–${object.hzOuter} AU`);addData('Estimated age',`${object.age} billion years`);}
    else if(['planet','dwarf-planet'].includes(object.kind)){addData('Body class',object.type);addData('IAU category',object.kind==='dwarf-planet'?'Dwarf planet':'Major planet');addData('Mean orbital distance',`${object.distance} AU`);addData('Orbital period',formatPeriod(object.periodDays));addData('Rotation',formatRotation(object.dayHours));addData('Mass',formatKnown(object.mass,' Earth masses'));addData('Radius',formatKnown(object.radius,' Earth radii'));addData('Surface gravity',formatKnown(object.gravity,' g'));addData('Atmosphere',object.atmosphere||'Unknown');addData('Catalogued moons',object.moons?.length||0);addData('Orbital eccentricity',formatKnown(object.eccentricity));addData('Orbital inclination',formatKnown(object.inclination,'°'));addData('Biosphere',object.biosphere||'Unknown');addData('Civilization',object.civilization||'Unknown');}
    else if(object.kind==='moon'){addData('Moon class',object.type);addData('Parent world',object.parentName);addData('Mean orbital radius',formatKnown(object.orbitalDistanceKm,' km',true));addData('Orbital period',formatPeriod(object.periodDays));addData('Mass',formatKnown(object.mass,' Earth masses'));addData('Radius',object.radiusKm?`${finite(object.radiusKm).toLocaleString()} km${object.estimatedRadius?' · estimated':''}`:'Unknown');addData('Surface gravity',formatKnown(object.gravity,' g'));addData('Atmosphere',object.atmosphere||'Unknown');addData('Orbital eccentricity',formatKnown(object.eccentricity));addData('Orbital inclination',formatKnown(object.inclination,'°'));addData('JPL code',object.jplCode||'Not assigned');addData('Ephemeris',object.ephemeris||'Published orbit record');}
    else if(object.kind==='facility'){addData('Facility class',object.type);addData('Operator',object.operator||'Unknown');addData('Control authority',object.control||object.operator||'Unknown');addData('Operational status',object.status||'Unknown');addData('Campaign classification',object.campaignClassification||'Campaign record');addData('Location',object.location||object.parentName||`${object.distance} AU`);if(object.anchorType==='body-orbit'){addData('Parent body',object.parentName);addData('Reference orbital radius',formatKnown(object.orbitalDistanceKm,' km',true));if(object.altitudeKm!=null)addData('Reference altitude',formatKnown(object.altitudeKm,' km',true));}else addData('Reference heliocentric distance',`${finite(object.distance).toLocaleString()} AU`);addData('Reference period',formatPeriod(object.periodDays));addData('Orbital inclination',formatKnown(object.inclination,'°'));if(object.constructionProgress)addData('Construction phase',object.constructionProgress);}
    else{addData('Belt class',object.type);addData('Central distance',`${object.distance} AU`);addData('Approximate width',`${object.widthAu} AU`);addData('Estimated mass',`${object.estimatedMass} lunar masses`);addData('Density',object.density);addData('Composition',object.composition);addData('Status',object.operations);}
    for(const item of[...(object.hazards||[]),...(object.resources||[])]){const li=document.createElement('li');li.textContent=item;ui.resources.append(li);}renderImagery(object);
  }

  async function renderImagery(object){ensureImageryFigure();const figure=$('exo-inspector-image-figure'),image=$('exo-inspector-image'),caption=$('exo-inspector-image-caption'),link=$('exo-inspector-image-link');if(!figure||!image||!caption||!link)return;const request=++imageryRequest;figure.hidden=false;image.removeAttribute('src');caption.textContent='Locating published NASA/JPL imagery…';link.hidden=true;try{const result=await globalThis.BlacklightExoImagery?.resolve(object,system);if(request!==imageryRequest||!result)return;image.src=result.url;image.alt=result.alt||`${object.name} reference image`;caption.textContent=result.caption;if(result.sourceUrl){link.href=result.sourceUrl;link.textContent=result.approximate?'Artistic approximation details':'Open NASA/JPL source record';link.hidden=false;}figure.dataset.provenance=result.approximate?'artistic-approximation':'published-image';}catch(error){if(request!==imageryRequest)return;caption.textContent=`Image unavailable: ${error.message}`;}}
  function ensureImageryFigure(){if($('exo-inspector-image-figure'))return;const badges=$('exo-inspector-badges');if(!badges)return;const figure=document.createElement('figure');figure.id='exo-inspector-image-figure';figure.className='exo-inspector-image';figure.hidden=true;figure.innerHTML='<img id="exo-inspector-image" alt="" loading="lazy" decoding="async"><figcaption><span id="exo-inspector-image-caption"></span><a id="exo-inspector-image-link" href="#" target="_blank" rel="noopener noreferrer" hidden></a></figcaption>';badges.insertAdjacentElement('afterend',figure);}
  function renderResources(){const totals=system.resourceTotals||{};const values=[[totals.metals||0,'Metal-rich bodies'],[totals.volatiles||0,'Volatile-bearing worlds'],[totals.fuel||0,'Fuel-source bodies'],[totals.biospheres||0,'Confirmed/candidate biospheres'],[totals.habitable||0,'Habitable worlds'],[totals.industrial||0,'Operationally accessible bodies']];ui.resourceIndex.replaceChildren(...values.map(([value,label])=>{const card=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');card.className='exo-resource-item';strong.textContent=value;span.textContent=label;card.append(strong,span);return card;}));}
  function renderFeatures(){ui.features.replaceChildren(...(system.features||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
  function addData(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);ui.data.append(dt,dd);}

  function updatePositions(alpha,force=false,includeMoons=true){
    for(const visual of visuals.values()){
      if(['planet','dwarf-planet','facility-heliocentric'].includes(visual.kind)){
        visual.displayRadius=force?visual.targetRadius:visual.displayRadius+(visual.targetRadius-visual.displayRadius)*alpha;
        const target=visual.phase+simulationDays/Math.max(.01,visual.period)*TAU;visual.displayAngle=force?target:visual.displayAngle+shortestAngleDelta(visual.displayAngle,target)*alpha;
        visual.carrier.setAttribute('transform',`translate(${(500+Math.cos(visual.displayAngle)*visual.displayRadius).toFixed(3)} ${(500+Math.sin(visual.displayAngle)*visual.displayRadius*.72).toFixed(3)})`);
      }else if(includeMoons&&['moon','facility-local'].includes(visual.kind)){
        visual.displayRadius=force?visual.targetRadius:visual.displayRadius+(visual.targetRadius-visual.displayRadius)*alpha;
        visual.orbit.setAttribute('rx',visual.displayRadius);visual.orbit.setAttribute('ry',visual.displayRadius*.66);
        const target=visual.phase+simulationDays/Math.max(.01,visual.period)*TAU;visual.displayAngle=force?target:visual.displayAngle+shortestAngleDelta(visual.displayAngle,target)*alpha;
        visual.group.setAttribute('transform',`translate(${(Math.cos(visual.displayAngle)*visual.displayRadius).toFixed(3)} ${(Math.sin(visual.displayAngle)*visual.displayRadius*.66).toFixed(3)})`);
      }
    }
  }

  function animate(timestamp){const elapsed=Math.min(.1,Math.max(0,(timestamp-previousFrame)/1000));previousFrame=timestamp;if(running&&system)simulationDays+=elapsed*clamp(finite(controls.speed?.value),0,MAX_SPEED);globalThis.BlacklightExoProjectionEpochDays=simulationDays;setText(ui.epoch,`Day ${simulationDays.toFixed(3)}`);const alpha=1-Math.exp(-elapsed*11);const moons=timestamp-previousMoonFrame>=50;if(moons)previousMoonFrame=timestamp;updatePositions(alpha,false,moons);requestAnimationFrame(animate);}
  function shortestAngleDelta(current,target){let delta=(target-current)%TAU;if(delta>Math.PI)delta-=TAU;if(delta<-Math.PI)delta+=TAU;return delta;}
  function exportSystem(){if(!system)return;const blob=new Blob([JSON.stringify(system,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${system.seed.replace(/[^a-z0-9_-]+/gi,'-')}.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  function developSelected(){const object=objectById(selectedId);if(!object||!['planet','dwarf-planet','moon'].includes(object.kind)||finite(object.habitability)<65||system.sourceMode==='published-fixed')return;localStorage.setItem(HANDOFF_KEY,JSON.stringify({system:clone(system),world:clone(object)}));location.href='blacklight-exo-world-dossier.html';}
  function formatPeriod(value){const parsed=finite(value,NaN);if(!Number.isFinite(parsed))return'Unknown';if(parsed<2)return`${parsed.toFixed(3)} days`;if(parsed<730)return`${parsed.toFixed(2)} days`;if(parsed<365250)return`${(parsed/365.25).toFixed(2)} years`;return`${Math.round(parsed/365.25).toLocaleString()} years`;}
  function formatDistanceKm(value,parent){const parsed=finite(value,NaN);return Number.isFinite(parsed)?`${parsed.toLocaleString()} km from ${parent}`:`Unknown distance from ${parent}`;}
  function formatRotation(value){const parsed=finite(value,NaN);return Number.isFinite(parsed)?`${parsed<0?'retrograde · ':''}${Math.abs(parsed).toLocaleString()} hours`:'Unknown';}
  function formatKnown(value,suffix='',locale=false){const parsed=finite(value,NaN);return Number.isFinite(parsed)?`${locale?parsed.toLocaleString():parsed}${suffix}`:'Unknown';}
  function setText(node,value){if(node&&node.textContent!==String(value))node.textContent=String(value);}

  controls.generate.addEventListener('click',()=>loadSystem(controls.seed.value.trim()||'EXO-DEFAULT'));
  controls.seed?.addEventListener('keydown',event=>{if(event.key==='Enter')loadSystem(controls.seed.value.trim()||'EXO-DEFAULT');});
  controls.toggle?.addEventListener('click',()=>{running=!running;controls.toggle.setAttribute('aria-pressed',String(!running));controls.toggle.textContent=running?'Pause Projection':'Resume Projection';});
  controls.export?.addEventListener('click',exportSystem);controls.develop?.addEventListener('click',developSelected);
  document.addEventListener('input',event=>{if(event.target?.id==='exo-exclusive-zoom')applyLayout();});

  globalThis.BlacklightExoResolveSystem=seed=>clone(resolveSystem(seed));
  globalThis.BlacklightExoGetActiveSystem=()=>system;
  globalThis.BlacklightExoGetActiveLayout=()=>layout;
  globalThis.BlacklightExoGetProjectionEpochDays=()=>simulationDays;
  globalThis.BlacklightExoSelectObject=id=>select(id);

  controls.generate.disabled=false;
  loadSystem(controls.seed?.value.trim()||'EXO-DEFAULT');
  requestAnimationFrame(animate);
})();
