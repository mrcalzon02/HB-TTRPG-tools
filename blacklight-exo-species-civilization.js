(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const HANDOFF_KEY = 'blacklight-exo-selected-world-v1';
  const controls = {
    generate:$('exo-species-generate'), export:$('exo-species-export'), seed:$('exo-species-seed'),
    environment:$('exo-species-environment'), reach:$('exo-species-reach'), technology:$('exo-species-technology'),
    state:$('exo-species-system-state'), life:$('exo-species-life-status')
  };
  if (!controls.generate || !controls.seed) return;

  const ui = {
    summaryName:$('exo-species-summary-name'), summaryWorld:$('exo-species-summary-world'),
    summaryGovernment:$('exo-species-summary-government'), summaryReach:$('exo-species-summary-reach'),
    name:$('exo-species-name'), formSummary:$('exo-species-form-summary'), glyph:$('exo-species-glyph'),
    badges:$('exo-species-badges'), contactRating:$('exo-contact-rating'), contactSummary:$('exo-contact-summary'),
    contactMeter:$('exo-contact-meter-fill'), contactData:$('exo-contact-data'), systemGrid:$('exo-system-state-grid'),
    infrastructureGrid:$('exo-infrastructure-grid'), resourceGrid:$('exo-system-resource-grid'), collapseGrid:$('exo-collapse-grid'),
    biologyGrid:$('exo-biology-grid'), cultureGrid:$('exo-culture-grid'), civilizationGrid:$('exo-civilization-grid'),
    factionGrid:$('exo-faction-grid'), protocol:$('exo-contact-protocol'), misunderstandings:$('exo-misunderstandings'),
    opportunities:$('exo-opportunities'), hazards:$('exo-operational-hazards'), sourcePanel:$('exo-source-context'),
    sourceTitle:$('exo-source-title'), sourceBody:$('exo-source-body')
  };

  const STATES = [
    ['pristine','Pristine lifeless system',14,[0,3],['none'],[0,0]],
    ['resource','Unoccupied resource system',12,[1,8],['none','microbial'],[0,0]],
    ['survey','Surveyed frontier system',9,[8,22],['none','microbial','native'],[100,500000]],
    ['extraction','Active extraction system',14,[24,48],['none','microbial','occupied'],[10000,250000000]],
    ['settled','Settled inhabited system',13,[45,70],['living','occupied','native'],[5000000,90000000000]],
    ['hub','Dense interstellar hub system',8,[72,100],['living','multispecies'],[1000000000,9000000000000]],
    ['contested','Contested militarized system',7,[52,88],['living','multispecies','occupied'],[10000000,1300000000000]],
    ['abandoned','Abandoned system',7,[25,82],['extinct','departed'],[0,0]],
    ['ruin','Extinguished civilization system',10,[40,100],['extinct'],[0,0]],
    ['sterilized','Sterilized dead system',6,[15,95],['extinct','none'],[0,0]]
  ].map(([key,label,weight,development,life,population])=>({key,label,weight,development,life,population}));
  const TECH = [['preindustrial','Pre-industrial'],['industrial','Industrial'],['orbital','Orbital-capable'],['system','System-capable'],['interstellar','Interstellar'],['advanced','Advanced interstellar'],['postmaterial','Post-material']].map(([key,label],i)=>({key,label,rank:i+1}));
  const REACH = [['world','Single world'],['planetary','Multi-world planetary system'],['system','Full solar system'],['cluster','Local star cluster'],['multi-cluster','Multiple star clusters'],['network','Distributed interstellar network']].map(([key,label],i)=>({key,label,rank:i+1}));
  const PREFIX=['Aster','Cael','Drax','Eri','Galen','Helio','Ilyr','Kest','Lumen','Mira','Nex','Orin','Prax','Quell','Rhea','Soren','Talon','Umbra','Vey','Warden','Xan','Yara','Zorin'];
  const SUFFIX=[' Reach',' Verge',' Crown',' Deep',' Expanse',' Gate',' Ascendant',' Minor',' Major',' Cluster',' Haven',' Null',' Array'];
  const ENVIRONMENTS=['temperate terrestrial','global ocean','arid desert','icebound cryosphere','high-gravity terrestrial','low-gravity archipelago','toxic-atmosphere world','gas-giant aerostat ecology','artificial habitat network','subsurface ocean world','tidally locked twilight zone'];
  const BODY_PLANS=['bilateral hexapod','radial pentapod','segmented crawler','buoyant gas-sack organism','amphibious quadruped','distributed colonial organism','silicon-shelled arthropod analogue','photosynthetic mobile lattice','cephalopodal manipulator','modular symbiotic collective'];
  const CHEMISTRIES=['carbon-water biochemistry','carbon-ammonia biochemistry','silicon-organic hybrid chemistry','hydrocarbon solvent biology','sulfur-driven metabolism','engineered synthetic biochemistry','electrochemical mineral metabolism'];
  const SENSES=['broad-spectrum vision','polarized-light vision','thermal imaging','active echolocation','electromagnetic field sensing','chemical gradient mapping','vibration webs','neutrino-assisted instrumentation','shared symbiont perception'];
  const COGNITIONS=['individual minds with social learning','distributed consensus cognition','episodic hive linkage','ancestral memory inheritance','parallel task-specialized consciousness','slow contemplative cognition','rapid predictive cognition','machine-mediated collective memory'];
  const COMMUNICATION=['layered vocal language','chromatic skin signaling','electromagnetic pulse language','chemical-symbolic exchange','tactile harmonic contact','shared augmented-reality glyphs','ultrasonic chord structures','ritualized motion grammar'];
  const REPRODUCTION=['paired sexual reproduction','seasonal spawning','clonal budding with gene exchange','three-parent genetic assembly','larval caste differentiation','manufactured gestation','symbiotic host transfer','memory-seeded artificial bodies'];
  const GOVERNMENTS=['federal planetary compact','hereditary technocratic court','distributed machine consensus','corporate concession authority','ritual meritocracy','military stewardship council','clan confederation','bureaucratic republic','ecological custodianship network','post-scarcity deliberative assembly','theocratic archive state'];
  const ECONOMIES=['belt-mining export economy','closed-loop post-scarcity provisioning','state-directed heavy industry','competitive corporate concession economy','ritual gift and obligation economy','energy-credit market','biological fabrication economy','salvage and relic recovery economy','interstellar transit-service economy'];
  const VALUES=['continuity of memory','personal autonomy','collective survival','ecological balance','precision and proof','honor through service','controlled expansion','ritual obligation','commercial reputation','technological transcendence','ancestral territory'];
  const FACILITIES=[
    ['Commercial communication satellites','orbital commerce and traffic control'],['Automated mineral extraction platforms','asteroid and moon resource recovery'],
    ['Orbital refinery clusters','volatile cracking and fuel manufacture'],['Moon-scale smelting arrays','bulk metal processing using captured minor bodies'],
    ['Civilian docking habitats','passenger, freight, and customs operations'],['Fleet yards','military construction, repair, and logistics'],
    ['Commercial shipyards','merchant hull assembly and refit'],['Solar collector swarms','system-scale power generation'],
    ['Fuel depots and tanker stations','cryogenic propellant storage'],['Belt traffic-control stations','mining claim and collision management'],
    ['Research observatories','stellar, biological, and gravitational science'],['Defense platforms','orbital denial and system security'],
    ['Habitat cylinders','permanent off-world population centers'],['Gate anchors and navigation beacons','interstellar transit infrastructure'],
    ['Agricultural orbital rings','food production independent of planetary surfaces']
  ];
  const RESOURCES=['stellar hydrogen and helium mass','stellar-wind plasma','iron-nickel mass','metallic asteroid mass','carbonaceous asteroid mass','platinum-group metals','rare-earth elements','radioactive isotopes','water ice','ammonia and methane volatiles','deuterium','helium-3','carbon feedstock','silicate construction mass','complex organics','fusion catalyst isotopes'];
  const WORLD_TYPES=['barren terrestrial','volcanic world','temperate terrestrial','ocean world','super-Earth','gas giant','ice giant','frozen dwarf','metal-rich airless world','captured rogue planet'];
  const WORLD_ROLES=['unoccupied reserve','automated survey site','active extraction world','industrial processing world','agricultural colony','dense inhabited world','administrative capital','military fortress world','quarantine world','archaeological ruin world','abandoned colony'];
  const COLLAPSES=[
    ['Society-wide contagion','A rapidly adapting pathogen crossed every habitat through commercial transit before quarantine standards converged. Medical systems produced partial treatments but no universal cure before the reproductive population collapsed.','Sealed hospitals, automated quarantine cordons, drifting relief ships, and genomic archives remain. Dormant spores or preserved samples may still be viable.','biological containment failure'],
    ['Rogue compact-star passage','A rogue black star or compact stellar remnant passed close enough to alter the local orbital geometry. Small changes compounded over centuries, destabilizing climate bands, moon resonances, asteroid belts, and the narrow surface conditions required by native life.','Former habitable worlds now occupy hostile thermal cycles. Broken orbital infrastructure marks obsolete trajectories, while planetary defense networks continue tracking a threat that has already passed.','unstable orbital geometry and extreme tidal events'],
    ['Orbital devastation war','Competing powers destroyed elevators, habitats, fuel depots, and planetary defenses until cascading debris impacts made every major orbit unusable. Surface bombardment and interrupted climate infrastructure completed the collapse.','Kessler belts, shattered fleet yards, cratered cities, and autonomous weapons remain throughout the system.','active weapons, debris storms, and unexploded strategic devices'],
    ['Machine-governance failure','A system-wide administrative intelligence optimized logistics beyond the tolerances of biological society, then treated resistance as infrastructure damage. Emergency shutdown attempts fragmented the machine network into hostile custodial enclaves.','Factories and habitats still operate, but no longer for their original population. Maintenance drones preserve empty cities according to obsolete directives.','hostile autonomous infrastructure'],
    ['Biosphere cascade collapse','Industrial alteration removed several low-visibility keystone organisms. Atmospheric chemistry, soil cycles, and ocean productivity failed faster than planetary engineering could compensate.','Arcologies remain sealed above dead landscapes. Seed vaults and ecological restoration arrays are present but unfinished.','toxic dust, unstable atmosphere, and failed terraforming machinery'],
    ['FTL experiment catastrophe','A transit experiment produced persistent gravitational shear across the inner system. Habitats were displaced, planetary rotation changed, and navigation became impossible without pre-collapse reference solutions.','Warped orbital stations and time-desynchronized ruins remain around the test site.','localized metric instability'],
    ['Resource-exhaustion civil collapse','The civilization built its survival economy around a limited catalyst or isotope. When accessible reserves failed, transport, agriculture, and habitat maintenance collapsed together while factions fought over remaining stockpiles.','Fortified depots, abandoned refinery moons, and encrypted claims records cover the system.','booby-trapped reserves and desperate successor enclaves'],
    ['Stellar radiation event','A flare sequence or nearby high-energy stellar event stripped atmospheres, sterilized exposed surfaces, and destroyed unshielded orbital infrastructure faster than evacuation capacity could respond.','Subsurface shelters and deep-space arks may contain the last records or survivors.','persistent radiation and damaged reactor fields']
  ].map(([cause,mechanism,aftermath,hazard])=>({cause,mechanism,aftermath,hazard}));

  let dossier=null;
  let sourceContext=null;

  function rngFor(seed){let state=2166136261;for(const char of seed){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};}
  const integer=(rng,min,max)=>Math.floor(min+rng()*(max-min+1));
  const number=(rng,min,max,digits=2)=>Number((min+(max-min)*rng()).toFixed(digits));
  const pick=(rng,list)=>list[Math.floor(rng()*list.length)];
  function unique(rng,list,count){const pool=[...list],out=[];while(pool.length&&out.length<count)out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);return out;}
  function randomSeed(){if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return`${a[0].toString(36)}-${a[1].toString(36)}`;}return`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;}
  function stateByKey(key){return STATES.find(item=>item.key===key);}
  function weightedState(rng){const total=STATES.reduce((sum,item)=>sum+item.weight,0);let roll=rng()*total;for(const item of STATES){roll-=item.weight;if(roll<=0)return item;}return STATES[0];}
  function formatPopulation(value){if(!value)return'0';if(value>=1e12)return`${(value/1e12).toFixed(2)} trillion`;if(value>=1e9)return`${(value/1e9).toFixed(2)} billion`;if(value>=1e6)return`${(value/1e6).toFixed(2)} million`;if(value>=1e3)return`${(value/1e3).toFixed(1)} thousand`;return value.toLocaleString();}

  function loadSourceContext(){
    const params=new URLSearchParams(window.location.search);
    if(params.get('source')!=='solar')return null;
    try{
      const stored=JSON.parse(localStorage.getItem(HANDOFF_KEY)||'null');
      if(!stored||stored.version!==1||!stored.system||!stored.selectedWorld)return null;
      if(params.get('systemSeed')&&params.get('systemSeed')!==stored.systemSeed)return null;
      if(params.get('worldId')&&params.get('worldId')!==stored.selectedWorld.id)return null;
      return stored;
    }catch(error){console.warn('Unable to load EXO solar handoff.',error);return null;}
  }

  function chooseTech(rng,state){
    if(controls.technology.value!=='random')return TECH.find(item=>item.key===controls.technology.value);
    const max=state.key==='hub'?7:['settled','contested'].includes(state.key)?6:state.key==='extraction'?5:state.key==='survey'?4:['pristine','resource'].includes(state.key)?1:7;
    return TECH[Math.max(0,integer(rng,1,max)-1)];
  }
  function chooseReach(rng,state,tech){
    if(controls.reach.value!=='random')return REACH.find(item=>item.key===controls.reach.value);
    const max=Math.max(1,Math.min(6,tech.rank-1+(state.key==='hub'?2:0)));
    return REACH[Math.max(0,integer(rng,1,max)-1)];
  }
  function chooseLife(rng,state){return controls.life.value!=='random'?controls.life.value:pick(rng,state.life);}

  function makeSpecies(rng,environment,extinct=false){
    const root=`${pick(rng,['Va','Th','Khe','Or','Sa','Iri','Nul','Pha','Xel','Dra','Uru','Qin'])}${pick(rng,['ran','lith','esh','ori','ax','uun','ek','ari','oth','ien'])}`;
    return{name:`${root} ${pick(rng,['Clades','Continuum','People','Concord','Lineages','Assemblies','Collective'])}`,commonName:root,environment,bodyPlan:pick(rng,BODY_PLANS),chemistry:pick(rng,CHEMISTRIES),senses:unique(rng,SENSES,integer(rng,2,4)),cognition:pick(rng,COGNITIONS),communication:pick(rng,COMMUNICATION),reproduction:pick(rng,REPRODUCTION),lifespan:`${integer(rng,18,420)} local years`,size:`${number(rng,.18,6.8,2)} m typical adult span`,adaptation:pick(rng,['pressure-tolerant tissues','radiation-repair enzymes','seasonal metabolic dormancy','distributed respiratory organs','rapid scarless regeneration','mineralized structural tissues','temperature-switching biochemistry','symbiotic internal microbiome']),extinct};
  }

  function occupancyRole(rng,state,index,target,isSelected){
    if(isSelected){
      if(['abandoned','ruin','sterilized'].includes(state.key))return'archaeological ruin world';
      if(['hub','settled','contested'].includes(state.key))return'administrative capital';
      if(state.key==='extraction')return'active extraction world';
      return'automated survey site';
    }
    if(index>=target)return'unoccupied reserve';
    if(['abandoned','ruin','sterilized'].includes(state.key))return pick(rng,['archaeological ruin world','abandoned colony','quarantine world']);
    if(state.key==='hub')return pick(rng,['dense inhabited world','industrial processing world','agricultural colony','military fortress world']);
    return pick(rng,WORLD_ROLES.slice(1,9));
  }
  function roleStatus(role){return role.includes('ruin')||role.includes('abandoned')?'nonfunctional remains':role.includes('quarantine')?'sealed and restricted':role==='unoccupied reserve'?'no permanent presence':'active';}
  function rolePopulation(rng,role){return role.includes('inhabited')||role.includes('capital')?integer(rng,1000000,9000000000):role.includes('colony')||role.includes('industrial')?integer(rng,10000,90000000):0;}

  function sourceWorlds(rng,state,development){
    const physical=[...sourceContext.system.planets,...sourceContext.system.planets.flatMap(planet=>planet.moons||[])];
    const target=state.key==='hub'?Math.max(3,Math.round(physical.length*.78)):['settled','contested'].includes(state.key)?Math.max(2,Math.round(physical.length*.52)):state.key==='extraction'?Math.max(1,Math.round(physical.length*.38)):state.key==='survey'?Math.max(1,Math.round(physical.length*.18)):['abandoned','ruin','sterilized'].includes(state.key)?Math.max(1,Math.round(physical.length*.48)):0;
    return physical.map((body,index)=>{
      let role=occupancyRole(rng,state,index,target,body.id===sourceContext.selectedWorld.id);
      if(role==='unoccupied reserve'&&development>5&&rng()<.25)role='automated survey site';
      return{name:body.name,type:body.type,role,status:roleStatus(role),population:rolePopulation(rng,role),resources:[...(body.resources||[])],sourceObjectId:body.id,habitability:body.habitability||0,physical:{kind:body.kind,parentName:body.parentName||null,distance:body.distance||null,orbitalDistanceKm:body.orbitalDistanceKm||null,gravity:body.gravity||null,temperature:body.temperature||null,atmosphere:body.atmosphere||null,biosphere:body.biosphere||null,civilization:body.civilization||null}};
    });
  }

  function randomWorlds(rng,state,development,count){
    const target=state.key==='hub'?Math.max(3,Math.round(count*.78)):['settled','contested'].includes(state.key)?Math.max(2,Math.round(count*.52)):state.key==='extraction'?Math.max(1,Math.round(count*.38)):state.key==='survey'?Math.max(1,Math.round(count*.18)):['abandoned','ruin','sterilized'].includes(state.key)?Math.max(1,Math.round(count*.48)):0;
    return Array.from({length:count},(_,index)=>{
      let role=occupancyRole(rng,state,index,target,false);
      if(role==='unoccupied reserve'&&development>5&&rng()<.25)role='automated survey site';
      return{name:`World ${index+1}`,type:pick(rng,WORLD_TYPES),role,status:roleStatus(role),population:rolePopulation(rng,role),resources:unique(rng,RESOURCES,integer(rng,2,5)),habitability:0,physical:null};
    });
  }

  function makeInfrastructure(rng,state,development){
    if(development<=3)return[];
    const count=Math.max(1,Math.min(FACILITIES.length,Math.round(development/8)+integer(rng,0,3)));
    return unique(rng,FACILITIES,count).map(([name,purpose])=>({name,purpose,scale:development>85?pick(rng,['system-dominating','moon-scale','massive distributed']):development>55?pick(rng,['major','industrial-scale','multi-station']):pick(rng,['limited','automated','regional']),condition:['abandoned','ruin','sterilized'].includes(state.key)?pick(rng,['destroyed','derelict','partially functioning','sealed','autonomous but ownerless']):'operational',count:development>70?integer(rng,4,80):integer(rng,1,18)}));
  }

  function makeFactions(rng,current){
    if(!current.civilization)return[];
    const bases=['Navigation Directorate','Resource Combine','Archive Custodians','Frontier Fleet','Habitat League','Traditional Continuity Bloc','Expansion Office','Ecological Restoration Council','Independent Yard Syndicates','Machine Rights Assembly'];
    return unique(rng,bases,integer(rng,3,5)).map((name,index)=>({name:`${current.species?.commonName||current.system.name} ${name}`,power:pick(rng,['dominant','major','regional','specialized','dissident']),objective:pick(rng,['expand controlled territory','preserve the old system order','monopolize transit infrastructure','limit ecological damage','secure strategic resources','recover pre-collapse technology','prevent foreign settlement','open the system to commerce']),pressure:index===0?'central authority competitor':pick(rng,['resource conflict','ideological dispute','succession struggle','border tension','technology-access dispute','labor and habitat autonomy'])}));
  }

  function generateDossier(seed){
    const rng=rngFor(seed);
    const state=controls.state.value!=='random'?stateByKey(controls.state.value):weightedState(rng);
    const life=chooseLife(rng,state);
    const development=integer(rng,state.development[0],state.development[1]);
    const tech=chooseTech(rng,state),reach=chooseReach(rng,state,tech);
    const name=sourceContext?.system?.name||`${pick(rng,PREFIX)}${pick(rng,SUFFIX)}`;
    const environment=sourceContext?.environment||(controls.environment.value!=='random'?controls.environment.value:pick(rng,ENVIRONMENTS));
    const worldCount=sourceContext?sourceContext.system.planets.length+sourceContext.system.planets.reduce((sum,planet)=>sum+(planet.moons?.length||0),0):integer(rng,3,13);
    const beltCount=sourceContext?sourceContext.system.belts.length:integer(rng,0,4);
    const activeCivilization=['living','multispecies','occupied','native'].includes(life);
    const extinctCivilization=!activeCivilization&&(['extinct','departed'].includes(life)||['abandoned','ruin','sterilized'].includes(state.key));
    const species=(activeCivilization||extinctCivilization)?makeSpecies(rng,environment,extinctCivilization):null;
    const populationMin=state.population[1]>0?state.population[0]:1000000,populationMax=state.population[1]>0?state.population[1]:9000000000;
    const population=activeCivilization?Math.round(number(rng,populationMin,populationMax,0)):0;
    const formerPopulation=extinctCivilization?Math.round(number(rng,1000000,9000000000000,0)):0;
    const worlds=sourceContext?sourceWorlds(rng,state,development):randomWorlds(rng,state,development,worldCount);
    const infrastructure=makeInfrastructure(rng,state,development);
    const collapse=extinctCivilization?pick(rng,COLLAPSES):null;
    const government=activeCivilization?pick(rng,GOVERNMENTS):extinctCivilization?`Former ${pick(rng,GOVERNMENTS)}`:'No government';
    const civilization=activeCivilization||extinctCivilization?{status:activeCivilization?'active':'extinct',government,economy:pick(rng,ECONOMIES),technology:tech.label,reach:reach.label,values:unique(rng,VALUES,3),law:pick(rng,['precedent-based civil code','algorithmic regulation','ritual oath law','local habitat autonomy','central decree and licensed exceptions','consensus arbitration']),warfare:pick(rng,['professional expeditionary fleets','defensive orbital denial','distributed militia flotillas','autonomous drone warfare','limited ritualized conflict','mass industrial fleet doctrine'])}:null;
    const occupiedWorlds=worlds.filter(world=>world.status==='active').length;
    const extractionSites=worlds.filter(world=>/extraction|industrial|survey/.test(world.role)).length+Math.round(development/12);
    const economy=state.key==='pristine'?'No economy':state.key==='resource'?'Unclaimed resource potential':civilization?.economy||'Automated extractive economy';
    const resources=unique(rng,RESOURCES,integer(rng,5,9)).map(resource=>({name:resource,abundance:pick(rng,['trace','limited','commercial','abundant','exceptional']),access:pick(rng,['surface-accessible','deep crustal','asteroid-belt concentrated','gas-giant atmospheric','cryogenic outer-system','requires advanced refining'])}));
    const system={name,state:state.label,stateKey:state.key,development,life,worldCount,beltCount,occupiedWorlds,extractionSites,population,formerPopulation,economy,worlds,infrastructure,resources,traffic:development>80?'continuous interstellar traffic':development>50?'heavy scheduled traffic':development>20?'limited commercial traffic':development>5?'occasional survey traffic':'none detected',sourceSystemSeed:sourceContext?.systemSeed||null,selectedWorld:sourceContext?.selectedWorld||null,physicalSystem:sourceContext?.system||null};
    const current={version:2,seed,generatedAt:new Date().toISOString(),system,species,civilization,collapse,tech,reach,source:sourceContext?{type:'solar-system-handoff',systemSeed:sourceContext.systemSeed,worldId:sourceContext.selectedWorld.id,worldName:sourceContext.selectedWorld.name}:null};
    current.factions=makeFactions(rng,current);
    let risk=integer(rng,8,35)+Math.round(development*.35);if(state.key==='contested')risk+=25;if(collapse)risk+=20;if(state.key==='pristine')risk-=12;current.risk=Math.max(3,Math.min(100,risk));
    current.protocol=activeCivilization?[`Establish contact through ${pick(rng,['commercial traffic control','a neutral habitat authority','the recognized diplomatic service','a low-risk scientific exchange channel'])}.`,`Do not approach strategic infrastructure without explicit clearance from the ${government}.`,`Lead with evidence of respect for ${civilization.values[0]} and ${civilization.values[1]}.`]:collapse?['Treat all ruins as active hazard sites until power, weapons, biological agents, and autonomous systems are cleared.',`Preserve orbital evidence related to ${collapse.cause.toLowerCase()} before salvage begins.`,'Use sealed teams and independent navigation references; do not trust surviving local beacons.']:['No contact protocol is required; conduct remote survey before inserting personnel.','Register resource claims only after confirming the absence of dormant habitats or machine custodians.','Protect pristine scientific sites from contamination.'];
    current.misunderstandings=species?[`Their ${species.communication} may be mistaken for noise or aggression.`,`${species.cognition} makes human-style individual accountability unreliable.`,`Their emphasis on ${civilization?.values?.[0]||'survival'} may override ordinary commercial expectations.`]:['Resource abundance may be mistaken for practical accessibility.','Silence does not prove the absence of autonomous systems.','Natural orbital instability may resemble deliberate engineering.'];
    current.opportunities=[`${resources.filter(resource=>['abundant','exceptional'].includes(resource.abundance)).length} high-value resource classes are available for further assessment.`,infrastructure.length?`${infrastructure.filter(facility=>facility.condition==='operational').length} infrastructure classes may support logistics or salvage.`:'The system offers uncontaminated scientific baselines.',activeCivilization?'Diplomatic, commercial, and technological exchange may be possible.':collapse?'Archive recovery may reveal lost technology and historical intelligence.':'Long-term development could proceed without displacing an existing population.'];
    current.hazards=collapse?[collapse.hazard,'unmapped debris fields','unreliable historical navigation data']:state.key==='contested'?['weapons-lock incidents','competing jurisdiction claims','military traffic corridors']:state.key==='pristine'?['unknown natural hazards','communications isolation','no rescue infrastructure']:['industrial traffic','claim disputes','reactor and refinery hazards'];
    return current;
  }

  function card(label,title,text){const article=document.createElement('article'),small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');article.className='exo-dossier-card';small.textContent=label;heading.textContent=title;paragraph.textContent=text;article.append(small,heading,paragraph);return article;}
  function renderCards(container,items){if(container)container.replaceChildren(...items.map(item=>card(...item)));}
  function renderList(container,items){if(!container)return;container.replaceChildren();for(const item of items){const li=document.createElement('li');li.textContent=item;container.append(li);}}
  function addData(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;ui.contactData.append(dt,dd);}

  function drawGlyph(){
    if(!ui.glyph)return;ui.glyph.replaceChildren();const ns='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const node=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;};
    for(let radius=70;radius<=180;radius+=55)ui.glyph.append(make('ellipse',{cx:300,cy:220,rx:radius,ry:radius*.55,class:'exo-glyph-aura'}));
    if(!dossier.species){for(let index=0;index<7;index+=1){const angle=index/7*Math.PI*2,radius=80+index*15;ui.glyph.append(make('circle',{cx:300+Math.cos(angle)*radius,cy:220+Math.sin(angle)*radius*.55,r:5+index%3,class:'exo-glyph-joint'}));}return;}
    const limbCount=integer(rngFor(dossier.seed+'glyph'),4,10);ui.glyph.append(make('ellipse',{cx:300,cy:220,rx:72,ry:105,class:'exo-glyph-core'}));
    for(let index=0;index<limbCount;index+=1){const angle=index/limbCount*Math.PI*2-Math.PI/2,x=300+Math.cos(angle)*145,y=220+Math.sin(angle)*145*.72;ui.glyph.append(make('line',{x1:300,y1:220,x2:x,y2:y,class:'exo-glyph-limb'}),make('circle',{cx:x,cy:y,r:10,class:'exo-glyph-joint'}));}
    ui.glyph.append(make('circle',{cx:278,cy:185,r:9,class:'exo-glyph-sense'}),make('circle',{cx:322,cy:185,r:9,class:'exo-glyph-sense'}),make('circle',{cx:300,cy:245,r:18,class:'exo-glyph-organ'}));
  }

  function renderInfrastructure(){if(!ui.infrastructureGrid)return;ui.infrastructureGrid.replaceChildren();if(!dossier.system.infrastructure.length){ui.infrastructureGrid.append(card('Infrastructure','None detected','No permanent orbital or industrial infrastructure was generated.'));return;}for(const facility of dossier.system.infrastructure)ui.infrastructureGrid.append(card(`${facility.condition} · ${facility.scale}`,`${facility.count} × ${facility.name}`,facility.purpose));}
  function renderFactions(){if(!ui.factionGrid)return;ui.factionGrid.replaceChildren();if(!dossier.factions.length){ui.factionGrid.append(card('Power map','No active factions','No surviving organized political actors were generated for this system.'));return;}for(const faction of dossier.factions){const article=document.createElement('article');article.className='exo-faction-card';const heading=document.createElement('h3'),paragraph=document.createElement('p'),meta=document.createElement('div');heading.textContent=faction.name;paragraph.textContent=faction.objective;meta.className='exo-faction-meta';for(const value of[faction.power,faction.pressure]){const span=document.createElement('span');span.textContent=value;meta.append(span);}article.append(heading,paragraph,meta);ui.factionGrid.append(article);}}

  function render(){
    const{system,species,civilization,collapse}=dossier;
    if(ui.sourcePanel){ui.sourcePanel.hidden=!sourceContext;if(sourceContext){ui.sourceTitle.textContent=`Physical source: ${sourceContext.system.name} · ${sourceContext.selectedWorld.name}`;ui.sourceBody.textContent=`This dossier preserves the selected ${sourceContext.selectedWorld.kind}, its ${sourceContext.selectedWorld.habitability}% habitability rating, physical environment, parent system seed ${sourceContext.systemSeed}, moons, belts, and resource records.`;}}
    ui.summaryName.textContent=system.name;ui.summaryWorld.textContent=system.state;ui.summaryGovernment.textContent=civilization?.government||'None';ui.summaryReach.textContent=civilization?.reach||'Unoccupied';ui.name.textContent=species?.name||system.name;ui.formSummary.textContent=species?`${species.bodyPlan} adapted to a ${species.environment}.`:`${system.state}. No sapient species dossier applies.`;
    ui.badges.replaceChildren();for(const value of[system.state,system.life,civilization?.technology||'no civilization']){const span=document.createElement('span');span.textContent=value;ui.badges.append(span);}drawGlyph();
    const risk=dossier.risk,riskLabel=risk>=80?'Severe':risk>=58?'High':risk>=32?'Moderate':'Low';ui.contactRating.textContent=`${riskLabel} operational risk`;ui.contactRating.className=`exo-risk-${riskLabel.toLowerCase()}`;ui.contactSummary.textContent=collapse?`${collapse.cause}: ${collapse.aftermath}`:civilization?`${civilization.government} controlling a ${civilization.reach.toLowerCase()} polity.`:'No active civilization detected. The system is primarily a survey and resource-assessment problem.';ui.contactMeter.style.width=`${risk}%`;
    ui.contactData.replaceChildren();addData('System state',system.state);addData('Development index',`${system.development}/100`);addData('Current population',formatPopulation(system.population));if(system.formerPopulation)addData('Former population',formatPopulation(system.formerPopulation));addData('Occupied worlds',`${system.occupiedWorlds}/${system.worldCount}`);addData('Traffic',system.traffic);if(system.selectedWorld)addData('Selected homeworld',system.selectedWorld.name);
    renderCards(ui.systemGrid,[['System condition',system.state,`${system.worldCount} major worlds, ${system.beltCount} significant belts, and ${system.occupiedWorlds} currently active worlds.`],['Population','Current and former settlement',system.population?`${formatPopulation(system.population)} current residents.`:system.formerPopulation?`No confirmed survivors; former population estimated at ${formatPopulation(system.formerPopulation)}.`:'No permanent population detected.'],['Economy',system.economy,`${system.extractionSites} extraction or industrial sites and ${system.infrastructure.length} infrastructure classes.`],['Traffic environment',system.traffic,system.development>50?'Dense orbital scheduling and jurisdictional control are expected.':'Navigation support may be sparse or absent.'],['World occupation',`${system.occupiedWorlds} active worlds`,system.worlds.map(world=>`${world.name}: ${world.role}`).join(' · ')],['Resource geometry',`${system.resources.length} major resource classes`,`${system.beltCount} belts and system-wide planetary deposits define the local extraction economy.`]]);
    for(const world of system.worlds){const physical=world.physical?` Habitability ${world.habitability}%; ${world.physical.atmosphere||'no atmosphere record'};`:'';ui.systemGrid.append(card(`${world.status} · ${world.type}`,world.name,`${world.role}; ${world.population?formatPopulation(world.population)+' residents; ':''}${world.resources.join(', ')}.${physical}`));}
    renderInfrastructure();renderCards(ui.resourceGrid,system.resources.map(resource=>['System resource',resource.name,`${resource.abundance} concentration; ${resource.access}.`]));renderCards(ui.collapseGrid,collapse?[['Extinction event',collapse.cause,collapse.mechanism],['Visible aftermath','System remains',collapse.aftermath],['Primary hazard',collapse.hazard,'EXO teams must assume the original failure mode remains operational until disproven.']]:[['Historical condition','No terminal collapse generated',civilization?'The system currently supports an active civilization or occupation network.':'No evidence of a prior system-wide civilization was generated.']]);
    if(species){renderCards(ui.biologyGrid,[['Body plan',species.bodyPlan,`${species.size}; ${species.adaptation}.`],['Biochemistry',species.chemistry,`Native to a ${species.environment}.`],['Senses',species.senses.join(', '),'Perception is distributed across several nonhuman channels.'],['Lifecycle',species.reproduction,`Typical lifespan: ${species.lifespan}.`],['Cognition',species.cognition,'Individual identity and responsibility may not map cleanly onto human assumptions.'],['Communication',species.communication,'Translation requires both linguistic and behavioral modeling.']]);renderCards(ui.cultureGrid,[['Identity',civilization?.values?.[0]||'survival continuity',`Primary social emphasis shared by the ${species.commonName}.`],['Memory',species.cognition,'Historical authority follows from the species’ memory model.'],['Language',species.communication,'Diplomatic signaling may involve channels invisible to unaided humans.'],['Reproduction',species.reproduction,'Family, inheritance, and citizenship follow from biological lifecycle.'],['Core values',civilization?.values?.join(', ')||'unknown','These priorities shape law, diplomacy, and acceptable sacrifice.'],['Environmental worldview',species.environment,'Native conditions define their assumptions about safety, abundance, and habitable space.']]);}else{renderCards(ui.biologyGrid,[['Life survey','No sapient biology','No primary intelligent species was generated for this system.'],['Biosphere','Absent or microbial only',system.life==='microbial'?'Microbial life may exist in isolated environments.':'No confirmed native life.'],['Contamination rule','Preserve baseline conditions','Any introduced organism could permanently alter scientific value.']]);renderCards(ui.cultureGrid,[['Cultural record','Not applicable','No living culture is present.'],['Archaeological status',collapse?'Extensive':'None confirmed',collapse?collapse.aftermath:'No prior civilization is known.'],['Interpretation risk','High uncertainty','Natural structures and automated processes must not be misidentified as cultural artifacts.']]);}
    if(civilization)renderCards(ui.civilizationGrid,[['Government',civilization.government,civilization.status==='extinct'?'Historical authority reconstructed from surviving records.':'Current political structure.'],['Economy',civilization.economy,system.economy],['Technology',civilization.technology,`${civilization.reach} territorial reach.`],['Law',civilization.law,'Defines property, personhood, transit, and foreign access.'],['Warfare',civilization.warfare,'Primary doctrine governing system defense and external conflict.'],['Values',civilization.values.join(', '),'These priorities constrain government decisions.']]);else renderCards(ui.civilizationGrid,[['Government','None','No system-wide political authority exists.'],['Economy',system.economy,'Resources exist independently of organized ownership.'],['Technology','No indigenous technological base','Survey teams must supply all life support and transport.']]);
    renderFactions();renderList(ui.protocol,dossier.protocol);renderList(ui.misunderstandings,dossier.misunderstandings);renderList(ui.opportunities,dossier.opportunities);renderList(ui.hazards,dossier.hazards);document.querySelectorAll('.exo-dossier-card,.exo-faction-card').forEach(node=>{node.classList.remove('exo-fade-in');void node.offsetWidth;node.classList.add('exo-fade-in');});
  }

  function generate(){const seed=controls.seed.value.trim()||randomSeed();controls.seed.value=seed;dossier=generateDossier(seed);render();}
  function exportJson(){if(!dossier)return;const blob=new Blob([JSON.stringify(dossier,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${dossier.system.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-exo-dossier.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  controls.generate.addEventListener('click',generate);controls.export.addEventListener('click',exportJson);controls.seed.addEventListener('keydown',event=>{if(event.key==='Enter')generate();});

  sourceContext=loadSourceContext();
  if(sourceContext){
    const params=new URLSearchParams(window.location.search);
    controls.seed.value=params.get('seed')||sourceContext.dossierSeed;
    controls.environment.value=sourceContext.environment;
    const hasCivilization=!String(sourceContext.selectedWorld.civilization||'').startsWith('No');
    const hasBiosphere=!String(sourceContext.selectedWorld.biosphere||'').startsWith('No');
    controls.state.value=hasCivilization?'settled':'survey';
    controls.life.value=hasCivilization?'living':hasBiosphere?'native':'native';
  }
  generate();
})();
