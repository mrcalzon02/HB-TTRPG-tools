(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const controls = {
    generate: $('exo-species-generate'), export: $('exo-species-export'), seed: $('exo-species-seed'),
    environment: $('exo-species-environment'), reach: $('exo-species-reach'), technology: $('exo-species-technology'),
    state: $('exo-species-system-state'), life: $('exo-species-life-status')
  };
  if (!controls.generate || !controls.seed) return;

  const ui = {
    summaryName: $('exo-species-summary-name'), summaryWorld: $('exo-species-summary-world'),
    summaryGovernment: $('exo-species-summary-government'), summaryReach: $('exo-species-summary-reach'),
    name: $('exo-species-name'), formSummary: $('exo-species-form-summary'), glyph: $('exo-species-glyph'),
    badges: $('exo-species-badges'), contactRating: $('exo-contact-rating'), contactSummary: $('exo-contact-summary'),
    contactMeter: $('exo-contact-meter-fill'), contactData: $('exo-contact-data'),
    systemGrid: $('exo-system-state-grid'), infrastructureGrid: $('exo-infrastructure-grid'),
    resourceGrid: $('exo-system-resource-grid'), collapseGrid: $('exo-collapse-grid'),
    biologyGrid: $('exo-biology-grid'), cultureGrid: $('exo-culture-grid'), civilizationGrid: $('exo-civilization-grid'),
    factionGrid: $('exo-faction-grid'), protocol: $('exo-contact-protocol'), misunderstandings: $('exo-misunderstandings'),
    opportunities: $('exo-opportunities'), hazards: $('exo-operational-hazards')
  };

  const SYSTEM_STATES = [
    { key:'pristine', label:'Pristine lifeless system', weight:14, development:[0,3], life:['none'], population:[0,0] },
    { key:'resource', label:'Unoccupied resource system', weight:12, development:[1,8], life:['none','microbial'], population:[0,0] },
    { key:'survey', label:'Surveyed frontier system', weight:9, development:[8,22], life:['none','microbial','native'], population:[100,500000] },
    { key:'extraction', label:'Active extraction system', weight:14, development:[24,48], life:['none','microbial','occupied'], population:[10000,250000000] },
    { key:'settled', label:'Settled inhabited system', weight:13, development:[45,70], life:['living','occupied'], population:[5000000,90000000000] },
    { key:'hub', label:'Dense interstellar hub system', weight:8, development:[72,100], life:['living','multispecies'], population:[1000000000,9000000000000] },
    { key:'contested', label:'Contested militarized system', weight:7, development:[52,88], life:['living','multispecies','occupied'], population:[10000000,1300000000000] },
    { key:'abandoned', label:'Abandoned system', weight:7, development:[25,82], life:['extinct','departed'], population:[0,0] },
    { key:'ruin', label:'Extinguished civilization system', weight:10, development:[40,100], life:['extinct'], population:[0,0] },
    { key:'sterilized', label:'Sterilized dead system', weight:6, development:[15,95], life:['extinct','none'], population:[0,0] }
  ];

  const PREFIX = ['Aster','Cael','Drax','Eri','Galen','Helio','Ilyr','Kest','Lumen','Mira','Nex','Orin','Prax','Quell','Rhea','Soren','Talon','Umbra','Vey','Warden','Xan','Yara','Zorin'];
  const SUFFIX = [' Reach',' Verge',' Crown',' Deep',' Expanse',' Gate',' Ascendant',' Minor',' Major',' Cluster',' Haven',' Null',' Array'];
  const ENVIRONMENTS = ['temperate terrestrial','global ocean','arid desert','icebound cryosphere','high-gravity terrestrial','low-gravity archipelago','toxic-atmosphere world','gas-giant aerostat ecology','artificial habitat network','subsurface ocean world','tidally locked twilight zone'];
  const BODY_PLANS = ['bilateral hexapod','radial pentapod','segmented crawler','buoyant gas-sack organism','amphibious quadruped','distributed colonial organism','silicon-shelled arthropod analogue','photosynthetic mobile lattice','cephalopodal manipulator','modular symbiotic collective'];
  const CHEMISTRIES = ['carbon-water biochemistry','carbon-ammonia biochemistry','silicon-organic hybrid chemistry','hydrocarbon solvent biology','sulfur-driven metabolism','engineered synthetic biochemistry','electrochemical mineral metabolism'];
  const SENSES = ['broad-spectrum vision','polarized-light vision','thermal imaging','active echolocation','electromagnetic field sensing','chemical gradient mapping','vibration webs','neutrino-assisted instrumentation','shared symbiont perception'];
  const COGNITIONS = ['individual minds with social learning','distributed consensus cognition','episodic hive linkage','ancestral memory inheritance','parallel task-specialized consciousness','slow contemplative cognition','rapid predictive cognition','machine-mediated collective memory'];
  const COMMUNICATION = ['layered vocal language','chromatic skin signaling','electromagnetic pulse language','chemical-symbolic exchange','tactile harmonic contact','shared augmented-reality glyphs','ultrasonic chord structures','ritualized motion grammar'];
  const REPRODUCTION = ['paired sexual reproduction','seasonal spawning','clonal budding with gene exchange','three-parent genetic assembly','larval caste differentiation','manufactured gestation','symbiotic host transfer','memory-seeded artificial bodies'];
  const GOVERNMENTS = ['federal planetary compact','hereditary technocratic court','distributed machine consensus','corporate concession authority','ritual meritocracy','military stewardship council','clan confederation','bureaucratic republic','ecological custodianship network','post-scarcity deliberative assembly','theocratic archive state'];
  const ECONOMIES = ['belt-mining export economy','closed-loop post-scarcity provisioning','state-directed heavy industry','competitive corporate concession economy','ritual gift and obligation economy','energy-credit market','biological fabrication economy','salvage and relic recovery economy','interstellar transit-service economy'];
  const VALUES = ['continuity of memory','personal autonomy','collective survival','ecological balance','precision and proof','honor through service','controlled expansion','ritual obligation','commercial reputation','technological transcendence','ancestral territory'];
  const TECH = [
    { key:'preindustrial', label:'Pre-industrial', rank:1 }, { key:'industrial', label:'Industrial', rank:2 },
    { key:'orbital', label:'Orbital-capable', rank:3 }, { key:'system', label:'System-capable', rank:4 },
    { key:'interstellar', label:'Interstellar', rank:5 }, { key:'advanced', label:'Advanced interstellar', rank:6 },
    { key:'postmaterial', label:'Post-material', rank:7 }
  ];
  const REACH = [
    { key:'world', label:'Single world', rank:1 }, { key:'planetary', label:'Multi-world planetary system', rank:2 },
    { key:'system', label:'Full solar system', rank:3 }, { key:'cluster', label:'Local star cluster', rank:4 },
    { key:'multi-cluster', label:'Multiple star clusters', rank:5 }, { key:'network', label:'Distributed interstellar network', rank:6 }
  ];

  const COLLAPSES = [
    { cause:'Society-wide contagion', mechanism:'A rapidly adapting pathogen crossed every habitat through commercial transit before quarantine standards converged. Medical systems produced partial treatments but no universal cure before the reproductive population collapsed.', aftermath:'Sealed hospitals, automated quarantine cordons, drifting relief ships, and genomic archives remain. Dormant spores or preserved samples may still be viable.', hazard:'biological containment failure' },
    { cause:'Rogue compact-star passage', mechanism:'A rogue black star or compact stellar remnant passed close enough to alter the local orbital geometry. Small changes compounded over centuries, destabilizing climate bands, moon resonances, asteroid belts, and the narrow surface conditions required by native life.', aftermath:'Former habitable worlds now occupy hostile thermal cycles. Broken orbital infrastructure marks obsolete trajectories, while planetary defense networks continue tracking a threat that has already passed.', hazard:'unstable orbital geometry and extreme tidal events' },
    { cause:'Orbital devastation war', mechanism:'Competing powers destroyed elevators, habitats, fuel depots, and planetary defenses until cascading debris impacts made every major orbit unusable. Surface bombardment and interrupted climate infrastructure completed the collapse.', aftermath:'Kessler belts, shattered fleet yards, cratered cities, and autonomous weapons remain throughout the system.', hazard:'active weapons, debris storms, and unexploded strategic devices' },
    { cause:'Machine-governance failure', mechanism:'A system-wide administrative intelligence optimized logistics beyond the tolerances of biological society, then treated resistance as infrastructure damage. Emergency shutdown attempts fragmented the machine network into hostile custodial enclaves.', aftermath:'Factories and habitats still operate, but no longer for their original population. Maintenance drones preserve empty cities according to obsolete directives.', hazard:'hostile autonomous infrastructure' },
    { cause:'Biosphere cascade collapse', mechanism:'Industrial alteration removed several low-visibility keystone organisms. Atmospheric chemistry, soil cycles, and ocean productivity failed faster than planetary engineering could compensate.', aftermath:'Arcologies remain sealed above dead landscapes. Seed vaults and ecological restoration arrays are present but unfinished.', hazard:'toxic dust, unstable atmosphere, and failed terraforming machinery' },
    { cause:'FTL experiment catastrophe', mechanism:'A transit experiment produced persistent gravitational shear across the inner system. Habitats were displaced, planetary rotation changed, and navigation became impossible without pre-collapse reference solutions.', aftermath:'Warped orbital stations and time-desynchronized ruins remain around the test site.', hazard:'localized metric instability' },
    { cause:'Resource-exhaustion civil collapse', mechanism:'The civilization built its survival economy around a limited catalyst or isotope. When accessible reserves failed, transport, agriculture, and habitat maintenance collapsed together while factions fought over remaining stockpiles.', aftermath:'Fortified depots, abandoned refinery moons, and encrypted claims records cover the system.', hazard:'booby-trapped reserves and desperate successor enclaves' },
    { cause:'Stellar radiation event', mechanism:'A flare sequence or nearby high-energy stellar event stripped atmospheres, sterilized exposed surfaces, and destroyed unshielded orbital infrastructure faster than evacuation capacity could respond.', aftermath:'Subsurface shelters and deep-space arks may contain the last records or survivors.', hazard:'persistent radiation and damaged reactor fields' }
  ];

  const FACILITIES = [
    ['Commercial communication satellites','orbital commerce and traffic control'],
    ['Automated mineral extraction platforms','asteroid and moon resource recovery'],
    ['Orbital refinery clusters','volatile cracking and fuel manufacture'],
    ['Moon-scale smelting arrays','bulk metal processing using captured minor bodies'],
    ['Civilian docking habitats','passenger, freight, and customs operations'],
    ['Fleet yards','military construction, repair, and logistics'],
    ['Commercial shipyards','merchant hull assembly and refit'],
    ['Solar collector swarms','system-scale power generation'],
    ['Fuel depots and tanker stations','cryogenic propellant storage'],
    ['Belt traffic-control stations','mining claim and collision management'],
    ['Research observatories','stellar, biological, and gravitational science'],
    ['Defense platforms','orbital denial and system security'],
    ['Habitat cylinders','permanent off-world population centers'],
    ['Gate anchors and navigation beacons','interstellar transit infrastructure'],
    ['Agricultural orbital rings','food production independent of planetary surfaces']
  ];

  const RESOURCES = ['iron-nickel mass','platinum-group metals','rare-earth elements','radioactive isotopes','water ice','ammonia and methane volatiles','deuterium','helium-3','carbon feedstock','silicate construction mass','complex organics','fusion catalyst isotopes'];
  const WORLD_TYPES = ['barren terrestrial','volcanic world','temperate terrestrial','ocean world','super-Earth','gas giant','ice giant','frozen dwarf','metal-rich airless world','captured rogue planet'];
  const WORLD_ROLES = ['unoccupied reserve','automated survey site','active extraction world','industrial processing world','agricultural colony','dense inhabited world','administrative capital','military fortress world','quarantine world','archaeological ruin world','abandoned colony'];

  let dossier = null;

  function rngFor(seed) {
    let state = 2166136261;
    for (const char of seed) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
    return () => { state += 0x6D2B79F5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
  }
  const integer = (rng,min,max) => Math.floor(min + rng() * (max-min+1));
  const pick = (rng,list) => list[Math.floor(rng()*list.length)];
  const number = (rng,min,max,digits=2) => Number((min + (max-min)*rng()).toFixed(digits));
  const unique = (rng,list,count) => { const pool=[...list], out=[]; while(pool.length&&out.length<count) out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]); return out; };
  function randomSeed() { if (globalThis.crypto?.getRandomValues) { const a=new Uint32Array(2); crypto.getRandomValues(a); return `${a[0].toString(36)}-${a[1].toString(36)}`; } return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
  function weightedState(rng) { const total=SYSTEM_STATES.reduce((s,x)=>s+x.weight,0); let roll=rng()*total; for(const state of SYSTEM_STATES){roll-=state.weight;if(roll<=0)return state;} return SYSTEM_STATES[0]; }
  function stateByKey(key) { return SYSTEM_STATES.find(item=>item.key===key); }
  function formatPopulation(value) { if(!value) return '0'; if(value>=1e12)return `${(value/1e12).toFixed(2)} trillion`; if(value>=1e9)return `${(value/1e9).toFixed(2)} billion`; if(value>=1e6)return `${(value/1e6).toFixed(2)} million`; if(value>=1e3)return `${(value/1e3).toFixed(1)} thousand`; return value.toLocaleString(); }
  function chooseTech(rng,state) {
    if (controls.technology?.value && controls.technology.value!=='random') return TECH.find(x=>x.key===controls.technology.value);
    const max = state.key==='hub'?7:state.key==='settled'||state.key==='contested'?6:state.key==='extraction'?5:state.key==='survey'?4:state.key==='pristine'||state.key==='resource'?1:7;
    return TECH[Math.max(0,integer(rng,1,max)-1)];
  }
  function chooseReach(rng,state,tech) {
    if (controls.reach?.value && controls.reach.value!=='random') return REACH.find(x=>x.key===controls.reach.value);
    const max=Math.max(1,Math.min(6,tech.rank-1+(state.key==='hub'?2:0)));
    return REACH[Math.max(0,integer(rng,1,max)-1)];
  }
  function chooseLife(rng,state) {
    const forced=controls.life?.value;
    if(forced&&forced!=='random') return forced;
    return pick(rng,state.life);
  }
  function makeSpecies(rng,environment,extinct=false) {
    const root=`${pick(rng,['Va','Th','Khe','Or','Sa','Iri','Nul','Pha','Xel','Dra','Uru','Qin'])}${pick(rng,['ran','lith','esh','ori','ax','uun','ek','ari','oth','ien'])}`;
    return {
      name:`${root} ${pick(rng,['Clades','Continuum','People','Concord','Lineages','Assemblies','Collective'])}`,
      commonName:root,
      environment, bodyPlan:pick(rng,BODY_PLANS), chemistry:pick(rng,CHEMISTRIES), senses:unique(rng,SENSES,integer(rng,2,4)),
      cognition:pick(rng,COGNITIONS), communication:pick(rng,COMMUNICATION), reproduction:pick(rng,REPRODUCTION),
      lifespan:`${integer(rng,18,420)} local years`, size:`${number(rng,.18,6.8,2)} m typical adult span`,
      adaptation:pick(rng,['pressure-tolerant tissues','radiation-repair enzymes','seasonal metabolic dormancy','distributed respiratory organs','rapid scarless regeneration','mineralized structural tissues','temperature-switching biochemistry','symbiotic internal microbiome']),
      extinct
    };
  }
  function makeWorlds(rng,state,development,count) {
    const occupiedTarget = state.key==='hub'?Math.max(3,Math.round(count*.78)):state.key==='settled'||state.key==='contested'?Math.max(2,Math.round(count*.52)):state.key==='extraction'?Math.max(1,Math.round(count*.38)):state.key==='survey'?Math.max(1,Math.round(count*.18)):state.key==='abandoned'||state.key==='ruin'||state.key==='sterilized'?Math.max(1,Math.round(count*.48)):0;
    const worlds=[];
    for(let i=0;i<count;i+=1){
      let role='unoccupied reserve';
      if(i<occupiedTarget){
        if(['abandoned','ruin','sterilized'].includes(state.key)) role=pick(rng,['archaeological ruin world','abandoned colony','quarantine world']);
        else if(state.key==='hub') role=pick(rng,['dense inhabited world','administrative capital','industrial processing world','agricultural colony','military fortress world']);
        else role=pick(rng,WORLD_ROLES.slice(1,9));
      } else if(development>5&&rng()<.25) role='automated survey site';
      worlds.push({
        name:`World ${i+1}`, type:pick(rng,WORLD_TYPES), role,
        resources:unique(rng,RESOURCES,integer(rng,2,5)),
        status:role.includes('ruin')||role.includes('abandoned')?'nonfunctional remains':role.includes('quarantine')?'sealed and restricted':role==='unoccupied reserve'?'no permanent presence':'active',
        population:role.includes('inhabited')||role.includes('capital')?integer(rng,1000000,9000000000):role.includes('colony')||role.includes('industrial')?integer(rng,10000,90000000):0
      });
    }
    return worlds;
  }
  function makeInfrastructure(rng,state,development) {
    if(development<=3) return [];
    const count=Math.max(1,Math.min(FACILITIES.length,Math.round(development/8)+integer(rng,0,3)));
    return unique(rng,FACILITIES,count).map(([name,purpose])=>{
      const scale=development>85?pick(rng,['system-dominating','moon-scale','massive distributed']):development>55?pick(rng,['major','industrial-scale','multi-station']):pick(rng,['limited','automated','regional']);
      const condition=['abandoned','ruin','sterilized'].includes(state.key)?pick(rng,['destroyed','derelict','partially functioning','sealed','autonomous but ownerless']):'operational';
      return {name,purpose,scale,condition,count:development>70?integer(rng,4,80):integer(rng,1,18)};
    });
  }
  function makeFactions(rng,dossier) {
    if(!dossier.civilization) return [];
    const bases=['Navigation Directorate','Resource Combine','Archive Custodians','Frontier Fleet','Habitat League','Traditional Continuity Bloc','Expansion Office','Ecological Restoration Council','Independent Yard Syndicates','Machine Rights Assembly'];
    return unique(rng,bases,integer(rng,3,5)).map((name,index)=>({
      name:`${dossier.species?.commonName||dossier.system.name} ${name}`,
      power:pick(rng,['dominant','major','regional','specialized','dissident']),
      objective:pick(rng,['expand controlled territory','preserve the old system order','monopolize transit infrastructure','limit ecological damage','secure strategic resources','recover pre-collapse technology','prevent foreign settlement','open the system to commerce']),
      pressure:index===0?'central authority competitor':pick(rng,['resource conflict','ideological dispute','succession struggle','border tension','technology-access dispute','labor and habitat autonomy'])
    }));
  }

  function generateDossier(seed) {
    const rng=rngFor(seed);
    const forcedState=controls.state?.value&&controls.state.value!=='random'?stateByKey(controls.state.value):null;
    const state=forcedState||weightedState(rng);
    const life=chooseLife(rng,state);
    const development=integer(rng,state.development[0],state.development[1]);
    const tech=chooseTech(rng,state), reach=chooseReach(rng,state,tech);
    const name=`${pick(rng,PREFIX)}${pick(rng,SUFFIX)}`;
    const environment=controls.environment?.value&&controls.environment.value!=='random'?controls.environment.value:pick(rng,ENVIRONMENTS);
    const worldCount=integer(rng,3,13), beltCount=integer(rng,0,4);
    const activeCivilization=['living','multispecies','occupied'].includes(life);
    const extinctCivilization=['extinct','departed'].includes(life)||['abandoned','ruin','sterilized'].includes(state.key);
    const species=(activeCivilization||extinctCivilization)?makeSpecies(rng,environment,extinctCivilization&&!activeCivilization):null;
    const population=activeCivilization?Math.round(number(rng,Math.max(1,state.population[0]),Math.max(2,state.population[1]),0)):0;
    const formerPopulation=extinctCivilization?Math.round(number(rng,1000000,9000000000000,0)):0;
    const worlds=makeWorlds(rng,state,development,worldCount);
    const infrastructure=makeInfrastructure(rng,state,development);
    const collapse=extinctCivilization?pick(rng,COLLAPSES):null;
    const government=activeCivilization?pick(rng,GOVERNMENTS):extinctCivilization?`Former ${pick(rng,GOVERNMENTS)}`:'No government';
    const civilization=activeCivilization||extinctCivilization?{
      status:activeCivilization?'active':'extinct', government, economy:pick(rng,ECONOMIES), technology:tech.label, reach:reach.label,
      values:unique(rng,VALUES,3), law:pick(rng,['precedent-based civil code','algorithmic regulation','ritual oath law','local habitat autonomy','central decree and licensed exceptions','consensus arbitration']),
      warfare:pick(rng,['professional expeditionary fleets','defensive orbital denial','distributed militia flotillas','autonomous drone warfare','limited ritualized conflict','mass industrial fleet doctrine'])
    }:null;
    const occupiedWorlds=worlds.filter(w=>w.status==='active').length;
    const extractionSites=worlds.filter(w=>/extraction|industrial|survey/.test(w.role)).length + Math.round(development/12);
    const economy=state.key==='pristine'?'No economy':state.key==='resource'?'Unclaimed resource potential':civilization?.economy||'Automated extractive economy';
    const resources=unique(rng,RESOURCES,integer(rng,5,9)).map(item=>({name:item,abundance:pick(rng,['trace','limited','commercial','abundant','exceptional']),access:pick(rng,['surface-accessible','deep crustal','asteroid-belt concentrated','gas-giant atmospheric','cryogenic outer-system','requires advanced refining'])}));
    const system={name,state:state.label,stateKey:state.key,development,life,worldCount,beltCount,occupiedWorlds,extractionSites,population,formerPopulation,economy,worlds,infrastructure,resources,traffic:development>80?'continuous interstellar traffic':development>50?'heavy scheduled traffic':development>20?'limited commercial traffic':development>5?'occasional survey traffic':'none detected'};
    const dossier={version:1,seed,generatedAt:new Date().toISOString(),system,species,civilization,collapse,tech,reach};
    dossier.factions=makeFactions(rng,dossier);
    let risk=integer(rng,8,35)+Math.round(development*.35);
    if(state.key==='contested')risk+=25;if(collapse)risk+=20;if(state.key==='pristine')risk-=12;
    dossier.risk=Math.max(3,Math.min(100,risk));
    dossier.protocol=activeCivilization?[
      `Establish contact through ${pick(rng,['commercial traffic control','a neutral habitat authority','the recognized diplomatic service','a low-risk scientific exchange channel'])}.`,
      `Do not approach strategic infrastructure without explicit clearance from the ${government}.`,
      `Lead with evidence of respect for ${civilization.values[0]} and ${civilization.values[1]}.`
    ]:collapse?[
      'Treat all ruins as active hazard sites until power, weapons, biological agents, and autonomous systems are cleared.',
      `Preserve orbital evidence related to ${collapse.cause.toLowerCase()} before salvage begins.`,
      'Use sealed teams and independent navigation references; do not trust surviving local beacons.'
    ]:[
      'No contact protocol is required; conduct remote survey before inserting personnel.',
      'Register resource claims only after confirming the absence of dormant habitats or machine custodians.',
      'Protect pristine scientific sites from contamination.'
    ];
    dossier.misunderstandings=species?[
      `Their ${species.communication} may be mistaken for noise or aggression.`,
      `${species.cognition} makes human-style individual accountability unreliable.`,
      `Their emphasis on ${civilization?.values?.[0]||'survival'} may override ordinary commercial expectations.`
    ]:['Resource abundance may be mistaken for practical accessibility.','Silence does not prove the absence of autonomous systems.','Natural orbital instability may resemble deliberate engineering.'];
    dossier.opportunities=[
      `${resources.filter(r=>['abundant','exceptional'].includes(r.abundance)).length} high-value resource classes are available for further assessment.`,
      infrastructure.length?`${infrastructure.filter(f=>f.condition==='operational').length} infrastructure classes may support logistics or salvage.`:'The system offers uncontaminated scientific baselines.',
      activeCivilization?'Diplomatic, commercial, and technological exchange may be possible.':collapse?'Archive recovery may reveal lost technology and historical intelligence.':'Long-term development could proceed without displacing an existing population.'
    ];
    dossier.hazards=collapse?[collapse.hazard,'unmapped debris fields','unreliable historical navigation data']:state.key==='contested'?['weapons-lock incidents','competing jurisdiction claims','military traffic corridors']:state.key==='pristine'?['unknown natural hazards','communications isolation','no rescue infrastructure']:['industrial traffic','claim disputes','reactor and refinery hazards'];
    return dossier;
  }

  function card(label,title,text) {
    const article=document.createElement('article'); article.className='exo-dossier-card';
    const small=document.createElement('small'); small.textContent=label;
    const h=document.createElement('h3'); h.textContent=title;
    const p=document.createElement('p'); p.textContent=text;
    article.append(small,h,p); return article;
  }
  function renderCards(container,items) { if(!container)return; container.replaceChildren(...items.map(item=>card(item[0],item[1],item[2]))); }
  function renderList(container,items) { if(!container)return; container.replaceChildren(); for(const item of items){const li=document.createElement('li');li.textContent=item;container.append(li);} }
  function addData(label,value) { const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;ui.contactData.append(dt,dd); }
  function drawGlyph() {
    if(!ui.glyph)return; ui.glyph.replaceChildren(); const ns='http://www.w3.org/2000/svg'; const make=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
    for(let r=70;r<=180;r+=55)ui.glyph.append(make('ellipse',{cx:300,cy:220,rx:r,ry:r*.55,class:'exo-glyph-aura'}));
    if(!dossier.species){
      for(let i=0;i<7;i+=1){const a=i/7*Math.PI*2,rr=80+i*15;ui.glyph.append(make('circle',{cx:300+Math.cos(a)*rr,cy:220+Math.sin(a)*rr*.55,r:5+i%3,class:'exo-glyph-joint'}));}
      return;
    }
    const limbCount=integer(rngFor(dossier.seed+'glyph'),4,10); ui.glyph.append(make('ellipse',{cx:300,cy:220,rx:72,ry:105,class:'exo-glyph-core'}));
    for(let i=0;i<limbCount;i+=1){const a=i/limbCount*Math.PI*2-Math.PI/2,x=300+Math.cos(a)*145,y=220+Math.sin(a)*145*.72;ui.glyph.append(make('line',{x1:300,y1:220,x2:x,y2:y,class:'exo-glyph-limb'}),make('circle',{cx:x,cy:y,r:10,class:'exo-glyph-joint'}));}
    ui.glyph.append(make('circle',{cx:278,cy:185,r:9,class:'exo-glyph-sense'}),make('circle',{cx:322,cy:185,r:9,class:'exo-glyph-sense'}),make('circle',{cx:300,cy:245,r:18,class:'exo-glyph-organ'}));
  }
  function renderInfrastructure() {
    if(!ui.infrastructureGrid)return; ui.infrastructureGrid.replaceChildren();
    if(!dossier.system.infrastructure.length){ui.infrastructureGrid.append(card('Infrastructure','None detected','No permanent orbital or industrial infrastructure was generated.'));return;}
    for(const facility of dossier.system.infrastructure) ui.infrastructureGrid.append(card(`${facility.condition} · ${facility.scale}`,`${facility.count} × ${facility.name}`,facility.purpose));
  }
  function renderFactions() {
    if(!ui.factionGrid)return;ui.factionGrid.replaceChildren();
    if(!dossier.factions.length){ui.factionGrid.append(card('Power map','No active factions','No surviving organized political actors were generated for this system.'));return;}
    for(const faction of dossier.factions){const article=document.createElement('article');article.className='exo-faction-card';article.innerHTML=`<h3>${faction.name}</h3><p>${faction.objective}</p><div class="exo-faction-meta"><span>${faction.power}</span><span>${faction.pressure}</span></div>`;ui.factionGrid.append(article);}
  }
  function render() {
    const {system,species,civilization,collapse}=dossier;
    ui.summaryName.textContent=system.name; ui.summaryWorld.textContent=system.state; ui.summaryGovernment.textContent=civilization?.government||'None'; ui.summaryReach.textContent=civilization?.reach||'Unoccupied';
    ui.name.textContent=species?.name||system.name; ui.formSummary.textContent=species?`${species.bodyPlan} adapted to a ${species.environment}.`:`${system.state}. No sapient species dossier applies.`;
    ui.badges.replaceChildren(); for(const value of [system.state,system.life,civilization?.technology||'no civilization']){const span=document.createElement('span');span.textContent=value;ui.badges.append(span);}
    drawGlyph();
    const risk=dossier.risk; const riskLabel=risk>=80?'Severe':risk>=58?'High':risk>=32?'Moderate':'Low'; ui.contactRating.textContent=`${riskLabel} operational risk`; ui.contactRating.className=`exo-risk-${riskLabel.toLowerCase()}`; ui.contactSummary.textContent=collapse?`${collapse.cause}: ${collapse.aftermath}`:civilization?`${civilization.government} controlling a ${civilization.reach.toLowerCase()} polity.`:`No active civilization detected. The system is primarily a survey and resource-assessment problem.`; ui.contactMeter.style.width=`${risk}%`;
    ui.contactData.replaceChildren(); addData('System state',system.state); addData('Development index',`${system.development}/100`); addData('Current population',formatPopulation(system.population)); if(system.formerPopulation)addData('Former population',formatPopulation(system.formerPopulation)); addData('Occupied worlds',`${system.occupiedWorlds}/${system.worldCount}`); addData('Traffic',system.traffic);
    renderCards(ui.systemGrid,[
      ['System condition',system.state,`${system.worldCount} major worlds, ${system.beltCount} significant belts, and ${system.occupiedWorlds} currently active worlds.`],
      ['Population','Current and former settlement',system.population?`${formatPopulation(system.population)} current residents.`:system.formerPopulation?`No confirmed survivors; former population estimated at ${formatPopulation(system.formerPopulation)}.`:'No permanent population detected.'],
      ['Economy',system.economy,`${system.extractionSites} extraction or industrial sites and ${system.infrastructure.length} infrastructure classes.`],
      ['Traffic environment',system.traffic,system.development>50?'Dense orbital scheduling and jurisdictional control are expected.':'Navigation support may be sparse or absent.'],
      ['World occupation',`${system.occupiedWorlds} active worlds`,system.worlds.map(w=>`${w.name}: ${w.role}`).join(' · ')],
      ['Resource geometry',`${system.resources.length} major resource classes`,`${system.beltCount} belts and system-wide planetary deposits define the local extraction economy.`]
    ]);
    renderInfrastructure();
    renderCards(ui.resourceGrid,system.resources.map(resource=>['System resource',resource.name,`${resource.abundance} concentration; ${resource.access}.`]));
    renderCards(ui.collapseGrid,collapse?[
      ['Extinction event',collapse.cause,collapse.mechanism],['Visible aftermath','System remains',collapse.aftermath],['Primary hazard',collapse.hazard,'EXO teams must assume the original failure mode remains operational until disproven.']
    ]:[['Historical condition','No terminal collapse generated',civilization?'The system currently supports an active civilization or occupation network.':'No evidence of a prior system-wide civilization was generated.']]);
    if(species){
      renderCards(ui.biologyGrid,[['Body plan',species.bodyPlan,`${species.size}; ${species.adaptation}.`],['Biochemistry',species.chemistry,`Native to a ${species.environment}.`],['Senses',species.senses.join(', '),'Perception is distributed across several nonhuman channels.'],['Lifecycle',species.reproduction,`Typical lifespan: ${species.lifespan}.`],['Cognition',species.cognition,'Individual identity and responsibility may not map cleanly onto human assumptions.'],['Communication',species.communication,'Translation requires both linguistic and behavioral modeling.']]);
      renderCards(ui.cultureGrid,[['Identity',civilization?.values?.[0]||'survival continuity',`Primary social emphasis shared by the ${species.commonName}.`],['Memory',species.cognition,'Historical authority follows from the species’ memory model.'],['Language',species.communication,'Diplomatic signaling may involve channels invisible to unaided humans.'],['Reproduction',species.reproduction,'Family, inheritance, and citizenship follow from biological lifecycle.'],['Core values',civilization?.values?.join(', ')||'unknown','These priorities shape law, diplomacy, and acceptable sacrifice.'],['Environmental worldview',species.environment,'Native conditions define their assumptions about safety, abundance, and habitable space.']]);
    } else {
      renderCards(ui.biologyGrid,[['Life survey','No sapient biology','No primary intelligent species was generated for this system.'],['Biosphere','Absent or microbial only',system.life==='microbial'?'Microbial life may exist in isolated environments.':'No confirmed native life.'],['Contamination rule','Preserve baseline conditions','Any introduced organism could permanently alter scientific value.']]);
      renderCards(ui.cultureGrid,[['Cultural record','Not applicable','No living culture is present.'],['Archaeological status',collapse?'Extensive':'None confirmed',collapse?collapse.aftermath:'No prior civilization is known.'],['Interpretation risk','High uncertainty','Natural structures and automated processes must not be misidentified as cultural artifacts.']]);
    }
    if(civilization){
      renderCards(ui.civilizationGrid,[['Government',civilization.government,civilization.status==='extinct'?'Historical authority reconstructed from surviving records.':'Current political structure.'],['Economy',civilization.economy,system.economy],['Technology',civilization.technology,`${civilization.reach} territorial reach.`],['Law',civilization.law,'Defines property, personhood, transit, and foreign access.'],['Warfare',civilization.warfare,'Primary doctrine governing system defense and external conflict.'],['Values',civilization.values.join(', '),'These priorities constrain government decisions.']]);
    } else renderCards(ui.civilizationGrid,[['Government','None','No system-wide political authority exists.'],['Economy',system.economy,'Resources exist independently of organized ownership.'],['Technology','No indigenous technological base','Survey teams must supply all life support and transport.']]);
    renderFactions(); renderList(ui.protocol,dossier.protocol); renderList(ui.misunderstandings,dossier.misunderstandings); renderList(ui.opportunities,dossier.opportunities); renderList(ui.hazards,dossier.hazards);
    document.querySelectorAll('.exo-dossier-card,.exo-faction-card').forEach(node=>{node.classList.remove('exo-fade-in');void node.offsetWidth;node.classList.add('exo-fade-in');});
  }
  function generate() { const seed=controls.seed.value.trim()||randomSeed();controls.seed.value=seed;dossier=generateDossier(seed);render(); }
  function exportJson() { if(!dossier)return;const blob=new Blob([JSON.stringify(dossier,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${dossier.system.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-exo-dossier.json`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url); }
  controls.generate.addEventListener('click',generate);controls.export.addEventListener('click',exportJson);controls.seed.addEventListener('keydown',event=>{if(event.key==='Enter')generate();});
  generate();
})();