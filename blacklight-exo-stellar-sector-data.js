(() => {
  'use strict';
  if(globalThis.BlacklightExoStellarSectorData)return;
  const seed='EXAMPLE:SECTOR:HELIOS-VALE:001';
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function rngFor(value){let s=hash(value)||1;return()=>{s+=0x6D2B79F5;let v=s;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};}
  const rng=rngFor(seed),pick=list=>list[Math.floor(rng()*list.length)],integer=(a,b)=>Math.floor(a+rng()*(b-a+1)),number=(a,b,d=2)=>Number((a+(b-a)*rng()).toFixed(d));
  const clusterRoots=['Sol','Aster','Caelum','Demeris','Eidolon','Fallow','Galen','Hesper','Ilyr','Juno','Kestrel','Lumen','Meridian','Nacre','Orpheus','Prax','Quillon','Rhea','Sable','Talon','Umbra','Vesper','Warden','Xanthe','Yarrow','Zephyr','Aurelia','Brimstone','Cinder','Dawn','Ebon','Frost','Gloam','Harrow','Ivory','Jade'];
  const suffixes=['Reach','Crown','March','Deep','Assembly','Verge','Expanse','Concord','Vault','Crossing','Basin','Drift'];
  const hazards=['dust veils','binary shear','Q-phase turbulence','rogue planets','magnetar weather','ancient minefields','gravitic reefs','dark-mass uncertainty'];
  const clusters=clusterRoots.map((root,index)=>{
    const systemCount=integer(4,20);
    return{clusterId:`cluster-${String(index+1).padStart(2,'0')}`,name:index===0?'Sol Local Cluster':`${root} ${suffixes[(index*5+3)%suffixes.length]}`,coordinatesLy:{x:number(-400,400),y:number(-310,310),z:number(-190,190)},systemCount,chartedSystemCount:systemCount-integer(0,2),habitableWorldCount:integer(0,8),industrialWorldCount:integer(1,14),ruinWorldCount:integer(0,6),strategicValue:pick(['low','moderate','high','critical']),navigationHazards:[pick(hazards),pick(hazards)],status:'active',controllingPolityIds:[],controlledPlanetCount:0,controlState:'unclaimed-or-dead'};
  });
  const roots=['Human','Avarin','Khelt','Orryx','Velari','Myr','Suthren','Talass','Irix','Brannic','Zha','Elynd','Korr','Sael','Vant','Chorai','Nym','Threx','Pell','Urd','Cyran','Malk','Qirin','Drae','Ossian','Ruun','Selkai','Tir','Narak','Ysil','Vor','Kaith'];
  const dispositions=[
    ['stately-senatorial','friendly','patient constitutional diplomacy, ceremonial law, and coalition legitimacy'],
    ['peaceful','friendly','conflict avoidance, mediation, humanitarian convoying, and defensive deterrence'],
    ['wise-custodial','friendly','long-horizon stewardship, archival memory, and carefully bounded intervention'],
    ['neutral-commercial','neutral','contract enforcement, route access, insurance, and profit without ideological alignment'],
    ['scientifically-distracted','neutral','research priorities routinely eclipse diplomacy, territorial signaling, and ordinary commerce'],
    ['disinterested','neutral','minimal external engagement beyond navigation warnings and resource-boundary enforcement'],
    ['greedy-extractive','wary','aggressive concession seeking, debt leverage, and resource monopolization'],
    ['conniving','wary','proxy influence, deniable operations, misinformation, and factional manipulation'],
    ['aggressive','hostile','coercive border testing, punitive raids, and escalation for bargaining advantage'],
    ['warlike','war','expansion through conquest, prestige warfare, and permanent mobilization'],
    ['blatantly-declining','wary','shrinking territory, failing institutions, dangerous legacy arsenals, and reactionary politics']
  ];
  const biologies=[
    ['oxygen-carbon endotherm','bipedal omnivore','1.0 g','temperate nitrogen-oxygen'],
    ['ammonia-carbon cryophile','radial hexapod','0.62 g','cold ammonia-rich'],
    ['silicon-carbon lithovore','armored crawler','1.45 g','hot reducing'],
    ['methane-carbon colony organism','distributed colonial','0.38 g','cryogenic methane'],
    ['aquatic oxygen-carbon','fin-limbed aquatic','1.12 g','saline ocean'],
    ['photosynthetic symbiote','tripodal grazer-intellect','0.83 g','bright oxygenated'],
    ['synthetic-descended machine','modular chassis collective','variable','vacuum-compatible'],
    ['sulfur-metabolizing extremophile','segmented burrower','1.72 g','sulfurous high-pressure']
  ];
  const technologies=[
    ['P3','corridor-dependent FTL','fusion and antimatter','fractional inertia dampening','mature kinetics and laser defense'],
    ['P4','operational interstellar FTL','antimatter and vacuum cells','Q-lock reference anchoring','balanced beam, missile, and field defense'],
    ['P5','strategic 150–175 AU/hour FTL','Q-condensate and singularity','hybrid Q-gravitic lattice','deep-range sensor warfare and layered interception'],
    ['P2','station-scale transit','fusion pulse','reaction-tensor counterfield','defensive monitors and fixed batteries'],
    ['P4','gravitational-plane transit','singularity','gravitational-effect suppression','precision rail and interceptor doctrine']
  ];
  const scales=['single-system state','compact cluster polity','multi-cluster regional power','sector-spanning great power','declining remnant empire'];
  const governments=['senatorial republic','civic compact','archival custodianship','corporate trade dominion','research consensus','isolation mandate','extractive charter empire','oligarchic directorate','military protectorate','war-council hegemony','hereditary remnant court'];
  const doctrineKeys=['distributed-screen','fortress-convoy','long-range-analysis','commerce-raider','decapitation','mass-assault','relic-deterrent'];
  const doctrineText=['escort screens, sensor pickets, layered interceptors, and reserve battle groups','heavily protected logistics, mobile repair yards, and deliberate route denial','deep sensors, autonomous probes, precision stand-off fire, and avoidance of close battle','fast cruisers, privateers, electronic deception, and attacks on insurance-critical logistics','stealth reconnaissance, high-speed strike groups, command disruption, and rapid withdrawal','dense battle lines, attritional missile salvos, boarding forces, and occupation transports','few irreplaceable capital ships, ancient superweapons, and defensive mobilization'];
  const loadouts=[
    ['beam-defense frigates','missile destroyers','sensor tenders','fleet oilers'],
    ['armored cruisers','carrier barges','repair arks','escort corvettes'],
    ['science cruisers','drone clouds','precision particle lances','Q-sensor buoys'],
    ['raiding cutters','stealth tenders','boarding frigates','commerce interdiction mines'],
    ['fast battlecruisers','phase torpedo boats','electronic-warfare ships','command cutters'],
    ['dreadnought lines','assault carriers','troop transports','siege monitors'],
    ['relic battleship','museum arsenals','planetary monitors','salvaged escorts']
  ];
  const specialties=['biotechnology','Q-field mathematics','gravitic engineering','synthetic cognition','ecological restoration','materials science','planetary engineering','information warfare','archaeotechnology'];
  const species=[],polities=[],fleetCommands=[],organizations=[];
  roots.forEach((root,index)=>{
    const disposition=dispositions[index%dispositions.length],biology=biologies[index*3%biologies.length],technology=technologies[(index*2+1)%technologies.length],empireScale=scales[(index*3+1)%scales.length],government=governments[index%governments.length];
    const polityId=`polity-${String(index+1).padStart(2,'0')}`,speciesId=`species-${String(index+1).padStart(2,'0')}`,homeClusterId=clusters[index%clusters.length].clusterId;
    const territoryCount={'single-system state':1,'compact cluster polity':1,'multi-cluster regional power':2,'sector-spanning great power':4,'declining remnant empire':3}[empireScale];
    const controlledClusterIds=[...new Set(Array.from({length:territoryCount},(_,step)=>clusters[(index+step*7)%clusters.length].clusterId))];
    const name=index===0?'Terran Concord Humanity':`${root} ${pick(['Assemblies','Concord','Continuum','Clades','People','Kin','Collective','Lineages'])}`;
    const polityName=index===0?'Terran Concord':`${root} ${pick(['Republic','Compact','Dominion','Consensus','Mandate','Hegemony','Custodianship','Directorate','Court'])}`;
    species.push({speciesId,name,status:'extant',polityId,homeClusterId,dispositionArchetype:disposition[0],sectorStance:disposition[1],behavioralSummary:disposition[2],biology:{metabolism:biology[0],bodyPlan:biology[1],nativeGravity:biology[2],nativeEnvironment:biology[3],lifespanYears:integer(35,620),reproduction:pick(['sexual pair-bonded','communal spawning','budding caste lines','clonal broods','fabricated successors','seasonal polyparental'])},technology:{principalBand:technology[0],transit:technology[1],energy:technology[2],inertialControl:technology[3],combat:technology[4],specialties:[pick(specialties),pick(specialties),pick(specialties)]},bestiaryTags:[pick(['megafauna','aerial predators','subsurface colonies','vacuum-adapted symbiotes']),pick(['engineered war organisms','planktonic intellects','crystalline parasites','machine fauna'])],controlledClusterIds});
    const controlledPlanetCount=integer(2,18)*controlledClusterIds.length;
    polities.push({polityId,name:polityName,speciesIds:[speciesId],government,empireScale,capitalClusterId:homeClusterId,controlledClusterIds,controlledPlanetCount,populationBillions:number(.4,950)*controlledClusterIds.length,diplomaticPosture:disposition[0],sectorStance:disposition[1],lawAndCulture:[pick(['formal treaty law','honor arbitration','corporate charter law','ecological personhood','machine consensus protocols']),pick(['hereditary privilege','military emergency codes','open scientific commons','ritual senatorial debate'])],strategicObjectives:[pick(['secure transit corridors','recover precursor archives','contain hostile expansion','open commercial concessions','preserve biospheres']),pick(['reverse demographic decline','expand buffer zones','isolate dangerous ruins','maintain senate coalition','monopolize Q-condensate'])]});
    controlledClusterIds.forEach(id=>clusters.find(c=>c.clusterId===id).controllingPolityIds.push(polityId));
    fleetCommands.push({fleetId:`fleet-${String(index+1).padStart(2,'0')}`,polityId,name:`${polityName} ${pick(['Strategic Fleet','Void Command','Transit Guard','Expeditionary Navy','Defense Assembly'])}`,doctrineKey:doctrineKeys[index%doctrineKeys.length],doctrine:doctrineText[index%doctrineText.length],readiness:pick(['reserve','peacetime','elevated','mobilized','degraded']),capitalShips:integer(0,18),cruisers:integer(4,90),escorts:integer(12,420),logisticsHullCount:integer(8,260),loadoutFamilies:loadouts[index%loadouts.length],technologyBand:technology[0],operationalLimitations:[pick(['fuel-chain fragility','limited trained crews','slow gate access','political command interference']),pick(['aging hulls','weak point defense','poor long-range sensors','overreliance on autonomous systems'])]});
    organizations.push(
      {organizationId:`org-${String(index+1).padStart(2,'0')}-mil`,polityId,speciesId,name:`${polityName} ${pick(['Defense Secretariat','Fleet Ministry','Strategic Guard','War College'])}`,organizationType:'military',scope:'polity-wide',functions:['fleet command','mobilization','doctrine','military procurement']},
      {organizationId:`org-${String(index+1).padStart(2,'0')}-civ`,polityId,speciesId,name:`${root} ${pick(['Civic Relief Union','Planetary Assembly','Scientific Forum','Habitat Cooperative'])}`,organizationType:'civilian',scope:'multi-system',functions:['education','public health','scientific research']},
      {organizationId:`org-${String(index+1).padStart(2,'0')}-com`,polityId,speciesId,name:`${root} ${pick(['Transit Combine','Resource Exchange','Merchant League','Industrial Syndicate'])}`,organizationType:'commercial',scope:'interstellar',functions:['shipping','shipbuilding','mining','insurance']}
    );
  });
  clusters.forEach(cluster=>{cluster.controlState=cluster.controllingPolityIds.length===0?'unclaimed-or-dead':cluster.controllingPolityIds.length===1?'controlled':'contested';cluster.controlledPlanetCount=polities.filter(p=>cluster.controllingPolityIds.includes(p.polityId)).reduce((sum,p)=>sum+Math.floor(p.controlledPlanetCount/p.controlledClusterIds.length),0);});
  const extinctRoots=['Ithari','Mourn','Caldrin','Esh','Vaul','Prism','Hadrak','Lys'];
  const extinctSpecies=extinctRoots.map((root,index)=>({speciesId:`extinct-${String(index+1).padStart(2,'0')}`,name:`${root} ${pick(['Ascendancy','Builders','Choir','Dynasts','Continuum','Species'])}`,status:'extinct',lastKnownClusterId:clusters[(index*5+4)%clusters.length].clusterId,estimatedExtinctionYearsAgo:integer(1200,2400000),probableCause:pick(['self-replicating war','stellar engineering failure','biosphere collapse','Q-field catastrophe','slow demographic exhaustion','unknown disappearance','predatory machine outbreak','inter-polity extermination']),remainingEvidence:['dead cities',pick(['sealed archives','derelict fleets','genetic fragments']),pick(['automated beacons','forbidden weapons','terraforming scars','buried habitats'])],technologyBandAtExtinction:pick(['P2','P3','P4','P5','unknown']),archiveConfidence:pick(['fragmentary','contested','moderate','high'])}));
  const relationStates={friendly:['allied','cooperative','friendly'],neutral:['neutral','commercial','distant'],wary:['wary','competitive','cold'],hostile:['hostile','sanctioned','border-conflict'],war:['at-war','total-war','ceasefire-broken']},order=['friendly','neutral','wary','hostile','war'],relations=[];
  polities.forEach((p,index)=>[1,3,7].forEach(step=>{const q=polities[(index+step)%polities.length];if(p.polityId<q.polityId){const severity=Math.max(order.indexOf(p.sectorStance),order.indexOf(q.sectorStance)),base=order[severity];relations.push({relationId:`rel-${String(relations.length+1).padStart(3,'0')}`,aPolityId:p.polityId,bPolityId:q.polityId,state:pick(relationStates[base]),tension:severity*20+integer(0,19),drivers:[pick(['border claims','trade access','historic grievance','scientific exchange','shared enemy']),pick(['resource competition','religious conflict','refugee movement','precursor ruins','gate control'])]});}}));
  const creatureNames=['Void Lantern','Glassback Grazer','Red Choir Swarm','Q-Mite','Gravitic Leviathan','Ash Burrower','Halo Ray','Mimic Spore','Iron Reef Colony','Cryo-Worm','Signal Eater','Pale Orchard','Magnetosphere Kite','Hull Louse','Ocean Cathedral','Dust Stalker','Phase Jackal','Radiant Medusa','Vacuum Shepherd','Archive Mold'];
  const bestiary=creatureNames.map((name,index)=>({creatureId:`creature-${String(index+1).padStart(2,'0')}`,name,nativeClusterId:clusters[(index*11+2)%clusters.length].clusterId,ecologyClass:pick(['predator','grazer','parasite','colony organism','engineered weapon','machine fauna','spaceborne filter feeder','pseudo-life']),threatClass:pick(['benign','caution','dangerous','military','existential-local']),environment:pick(['vacuum','gas giant atmosphere','subsurface ocean','desert world','derelict hulls','Q-disturbed space','ice moon','dense forest world']),notes:pick(['commonly domesticated','protected by treaty','harvested commercially','associated with ruins','used as a weapon','poorly understood','migratory across systems','known to attack active sensors'])}));
  const sector={recordType:'blacklightExoStellarSector',schemaVersion:'1.0.0',sectorId:'sector-helios-vale-example',seed,name:'Helios Vale Strategic Sector',recordStatus:'fixed-deterministic-example',authority:'Blacklight Intelligence EXO Sector Archive',generatedAt:null,dimensionsLy:{x:820,y:640,z:410},summary:{clusterCount:clusters.length,activeSpeciesCount:species.length,extinctSpeciesCount:extinctSpecies.length,polityCount:polities.length,fleetCommandCount:fleetCommands.length,organizationCount:organizations.length,bestiaryRecordCount:bestiary.length},clusters,species,extinctSpecies,polities,fleetCommands,organizations,relations,bestiary,archivePolicy:{immutableExample:true,exportFormat:'versioned JSON',incrementalRender:true,recordingRule:'User snapshots preserve the complete deterministic record plus a timestamp and optional note.',sourceAuthorityRule:'This fixed fictional sector is authoritative for the example campaign. Later procedural sectors must never overwrite it.'}};
  globalThis.BlacklightExoStellarSectorData=Object.freeze({version:1,seed,build:()=>structuredClone(sector),sector});
})();