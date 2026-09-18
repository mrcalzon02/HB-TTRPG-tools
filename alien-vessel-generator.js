(function (root, factory) {
  const engine = root && root.HBSemanticSpatialEngine ? root.HBSemanticSpatialEngine : (typeof require === 'function' ? require('./semantic-spatial-engine.js') : null);
  const condition = root && root.HBVesselConditionModel ? root.HBVesselConditionModel : (typeof require === 'function' ? require('./vessel-condition-model.js') : null);
  const hull = root && root.HBVesselHullEnvelope ? root.HBVesselHullEnvelope : (typeof require === 'function' ? require('./vessel-hull-envelope.js') : null);
  const api = factory(engine, condition, hull);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.generator = root.generator || {};
    root.generator.alien_vessel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine, conditionModel, hull) {
  'use strict';
  if (!engine) throw new Error('alien-vessel-generator requires HBSemanticSpatialEngine.');
  if (!conditionModel) throw new Error('alien-vessel-generator requires HBVesselConditionModel.');
  if (!hull) throw new Error('alien-vessel-generator requires HBVesselHullEnvelope.');

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const role = (id,roleName,label,deck,pressureZone,tags,extra) => ({id,role:roleName,label,deck,pressureZone,tags:tags || [],...(extra||{})});
  const PROFILES = Object.freeze({
    recon:{
      vesselType:'short-range reconnaissance vessel',
      roles:[
        role('bridge','command','Bridge / Command',0,'COMMAND',['critical','fore']),
        role('sensor-suite','sensors','Sensor / Recon Suite',0,'COMMAND',['critical','mission']),
        role('bio-printer','bio-printer-lab','Bio-Printer Laboratory',0,'SERVICE',['science','mission']),
        role('habitation','habitation','Crew Dormitory',1,'HABITAT',['crew']),
        role('recreation','recreation','Recreation Compartment',1,'HABITAT',['crew']),
        role('grow-lab','grow-lab','Grow Laboratory',1,'SERVICE',['life-support','science']),
        role('cargo','cargo','Cargo / Stores',1,'CARGO',['logistics']),
        role('engineering','engineering','Engineering / Reactor',2,'MACHINERY',['critical','aft']),
        role('mechanical','mechanical','Mechanical Systems',2,'MACHINERY',['service']),
        role('atmosphere','atmosphere','Atmosphere & Water Systems',2,'MACHINERY',['life-support','critical'])
      ],
      adjacency:[['command','sensors'],['command','bio-printer-lab'],['habitation','recreation'],['habitation','grow-lab'],['grow-lab','cargo'],['engineering','mechanical'],['engineering','atmosphere']]
    },
    science:{
      vesselType:'alien scientific survey vessel',
      roles:[
        role('bridge','command','Command / Survey Control',0,'COMMAND',['critical']),
        role('sensor-suite','sensors','Long-Baseline Survey Sensors',0,'COMMAND',['critical','mission']),
        role('analysis','analysis-lab','Analysis Laboratory',0,'SERVICE',['science','mission']),
        role('sample-lock','sample-lock','Sample Isolation Lock',1,'SERVICE',['science','quarantine']),
        role('wet-lab','wet-lab','Environmental Laboratory',1,'SERVICE',['science']),
        role('archive','data-archive','Mission Archive / Computation',1,'COMMAND',['data','mission']),
        role('habitation','habitation','Crew Habitat',2,'HABITAT',['crew']),
        role('medical','medical','Medical / Xenobiology',2,'HABITAT',['crew','science']),
        role('cargo','cargo','Scientific Stores',2,'CARGO',['logistics']),
        role('engineering','engineering','Engineering / Reactor',3,'MACHINERY',['critical','aft']),
        role('life-support','atmosphere','Life Support Plant',3,'MACHINERY',['life-support','critical']),
        role('maintenance','maintenance','Fabrication / Maintenance',3,'SERVICE',['service'])
      ],
      adjacency:[['command','sensors'],['sensors','analysis-lab'],['analysis-lab','sample-lock'],['sample-lock','wet-lab'],['analysis-lab','data-archive'],['habitation','medical'],['engineering','atmosphere'],['engineering','maintenance']]
    },
    freighter:{
      vesselType:'alien interstellar freighter',
      roles:[
        role('bridge','command','Bridge / Traffic Control',0,'COMMAND',['critical']),
        role('navigation','navigation','Navigation / Sensor Control',0,'COMMAND',['critical']),
        role('crew','habitation','Crew Habitat',1,'HABITAT',['crew']),
        role('galley','recreation','Crew Commons',1,'HABITAT',['crew']),
        role('cargo-a','cargo','Primary Cargo Hold',2,'CARGO',['logistics'],{count:2}),
        role('cargo-control','cargo-control','Cargo Control / Customs',2,'SERVICE',['logistics']),
        role('docking','docking','Docking / Transfer Control',2,'SERVICE',['external-access']),
        role('engineering','engineering','Engineering / Main Plant',3,'MACHINERY',['critical','aft']),
        role('fuel','fuel-management','Fuel / Reaction Mass Management',3,'MACHINERY',['critical']),
        role('maintenance','maintenance','Maintenance Shop',3,'SERVICE',['service']),
        role('atmosphere','atmosphere','Life Support Plant',3,'MACHINERY',['life-support','critical'])
      ],
      adjacency:[['command','navigation'],['habitation','recreation'],['cargo','cargo-control'],['cargo-control','docking'],['engineering','fuel-management'],['engineering','maintenance'],['engineering','atmosphere']]
    },
    command_cruiser:{
      vesselType:'alien command cruiser',
      extraEdgeChance:.18,
      roles:[
        role('bridge','command','Primary Command Nexus',0,'COMMAND',['critical','fore']),
        role('combat-information','combat-information','Combat Information / Fleet Direction',0,'COMMAND',['critical','combat']),
        role('strategic-sensors','sensors','Strategic Sensor Lattice Control',0,'COMMAND',['critical','mission']),
        role('faction-command','faction-command','Internal Faction Command Enclave',0,'COMMAND',['command','political'],{count:2}),
        role('fighter-control','fighter-control','External Fighter Control',1,'COMBAT',['combat','flight-operations']),
        role('fighter-service','fighter-service','External Craft Service Galleries',1,'SERVICE',['flight-operations','external-access'],{count:2}),
        role('weapons-control','fire-control','Weapons / Fire Control',1,'COMBAT',['critical','combat']),
        role('magazine','magazine','Isolated Ordnance / Energy Stores',1,'MAGAZINE',['combat','hazard']),
        role('marine-ready','troop-ready','Boarding / Security Ready Area',2,'COMBAT',['security','crew']),
        role('medical','medical','Trauma / Recovery Ward',2,'HABITAT',['crew','medical']),
        role('habitation','habitation','Crew Habitat',2,'HABITAT',['crew'],{count:2}),
        role('commons','recreation','Crew Commons',2,'HABITAT',['crew']),
        role('cargo','cargo','Fleet Stores / Cargo',3,'CARGO',['logistics']),
        role('maintenance','maintenance','Fleet Maintenance / Fabrication',3,'SERVICE',['service','industrial']),
        role('damage-control','damage-control','Damage Control Coordination',3,'SERVICE',['critical','emergency']),
        role('engineering','engineering','Main Engineering / Reactor',4,'MACHINERY',['critical','aft']),
        role('drive','drive-control','Transit / Drive Control',4,'MACHINERY',['critical','ftl']),
        role('power','power-distribution','Primary Power Distribution',4,'MACHINERY',['critical']),
        role('atmosphere','atmosphere','Atmosphere / Environmental Plant',4,'MACHINERY',['life-support','critical'])
      ],
      adjacency:[['command','combat-information'],['command','sensors'],['combat-information','fire-control'],['combat-information','faction-command'],['fighter-control','fighter-service'],['fighter-control','fire-control'],['fire-control','magazine'],['troop-ready','medical'],['habitation','recreation'],['cargo','maintenance'],['maintenance','damage-control'],['damage-control','engineering'],['engineering','drive-control'],['engineering','power-distribution'],['engineering','atmosphere']]
    },
    carrier:{
      vesselType:'alien external-dock carrier',
      extraEdgeChance:.2,
      roles:[
        role('bridge','command','Carrier Command',0,'COMMAND',['critical']),
        role('operations','combat-information','Flight Operations',0,'COMMAND',['critical','combat']),
        role('sensors','sensors','Fleet Sensor Control',0,'COMMAND',['critical']),
        role('fighter-control','fighter-control','External Craft Control',1,'COMBAT',['flight-operations','critical']),
        role('berth-control','docking-control','External Berth Control',1,'SERVICE',['flight-operations','external-access'],{count:3}),
        role('craft-service','fighter-service','Craft Service / Reload Gallery',2,'SERVICE',['flight-operations','industrial'],{count:2}),
        role('stores','cargo','Flight Stores',2,'CARGO',['logistics']),
        role('crew','habitation','Crew Habitat',3,'HABITAT',['crew'],{count:2}),
        role('medical','medical','Medical',3,'HABITAT',['crew']),
        role('damage-control','damage-control','Damage Control',3,'SERVICE',['critical']),
        role('engineering','engineering','Engineering / Reactor',4,'MACHINERY',['critical']),
        role('power','power-distribution','Power Distribution',4,'MACHINERY',['critical']),
        role('atmosphere','atmosphere','Environmental Plant',4,'MACHINERY',['critical','life-support'])
      ],
      adjacency:[['command','combat-information'],['combat-information','sensors'],['combat-information','fighter-control'],['fighter-control','docking-control'],['docking-control','fighter-service'],['fighter-service','cargo'],['habitation','medical'],['damage-control','engineering'],['engineering','power-distribution'],['engineering','atmosphere']]
    }
  });
  const PROFILE_ALIASES = Object.freeze({damaged_recon:'recon',command:'command_cruiser',cruiser:'command_cruiser'});

  function resolveProfileKey(name) {
    const requested=String(name||'recon');
    const key=PROFILE_ALIASES[requested]||requested;
    return PROFILES[key] ? key : 'recon';
  }

  function profile(name) {
    const key=resolveProfileKey(name);
    const raw=PROFILES[key];
    return {key,vesselType:raw.vesselType,roles:raw.roles.map(clone),adjacency:raw.adjacency.map(clone),layout:clone(raw.layout||{}),extraEdgeChance:raw.extraEdgeChance};
  }

  function normalizeContext(raw,fallbackName) {
    if (raw && typeof raw === 'object') return clone(raw);
    return {name:String(raw||fallbackName||'Unknown'),requiredRoles:[],adjacency:[],architectureTags:[],layout:{}};
  }

  function enrichRoles(roles,species,technology,civilization) {
    const tags=[...(species.architectureTags||[]),...(technology.architectureTags||[]),...(civilization.architectureTags||[])];
    return roles.map(item=>({...item,tags:[...new Set([...(item.tags||[]),...tags])],metadata:{...(item.metadata||{}),species:species.name||species.id||null,bodyPlan:species.bodyPlan||null,technologyBasis:technology.name||technology.basis||null,civilization:civilization.name||civilization.id||null}}));
  }

  function normalizeSourceLayout(source,strict) {
    const layout=clone(source);
    layout.rooms=Array.isArray(layout.rooms)?layout.rooms:[];
    layout.nodes=Array.isArray(layout.nodes)?layout.nodes:layout.rooms.map(room=>({id:room.nodeId||room.id,role:room.role,label:room.label,deck:room.deck,tags:room.tags||[],pressureZone:room.pressureZone||null,metadata:room.metadata||{}}));
    layout.edges=Array.isArray(layout.edges)?layout.edges:[];
    layout.corridors=Array.isArray(layout.corridors)?layout.corridors:[];
    layout.doors=Array.isArray(layout.doors)?layout.doors:[];
    layout.connectors=Array.isArray(layout.connectors)?layout.connectors:[];
    layout.deckCount=Math.max(1,Number(layout.deckCount)||Math.max(0,...layout.rooms.map(room=>Number(room.deck)||0))+1);
    if(!layout.bounds)layout.bounds={width:Math.max(30,...layout.rooms.map(room=>(Number(room.x)||0)+(Number(room.width)||1)+2)),height:Math.max(30,...layout.rooms.map(room=>(Number(room.y)||0)+(Number(room.height)||1)+2))};
    layout.seed=String(layout.seed||'imported-vessel-layout');
    layout.schemaVersion=layout.schemaVersion||'1.0.0';
    layout.engine=layout.engine||'hb-semantic-spatial-engine/imported-reference';
    layout.validation=engine.validate(layout);
    if(strict!==false&&!layout.validation.ok)throw new Error('Imported vessel layout failed validation: '+layout.validation.errors.join(' | '));
    return layout;
  }

  function legacyDamage(condition) {
    return condition.roomStates.filter(state=>state.damagePercent>0||state.effects.length||state.installationState!=='INSTALLED').map(state=>({
      roomId:state.roomId,deck:state.deck,state:state.installationState==='DESTROYED'?'destroyed':state.installationState==='REMOVED'?'removed':state.damagePercent>=50?'compromised':state.damagePercent>0?'degraded':state.serviceState.toLowerCase(),
      effect:state.effects[0]||state.failureModes[0]||'condition-change',
      damagePercent:state.damagePercent,
      installationState:state.installationState,
      serviceState:state.serviceState
    }));
  }

  function generate(input) {
    const options={...(input||{})};
    const requestedProfile=String(options.profile||'recon');
    const selected=profile(requestedProfile);
    const species=normalizeContext(options.speciesProfile,options.species||options.faction||'Unknown species');
    const technology=normalizeContext(options.technologyProfile,options.technologyBasis||'Unspecified technology basis');
    const civilization=normalizeContext(options.civilizationProfile,options.faction||'Unknown faction');
    const contextualRoles=[...(species.requiredRoles||[]),...(technology.requiredRoles||[]),...(civilization.requiredRoles||[])];
    const roles=enrichRoles(selected.roles.concat(contextualRoles,Array.isArray(options.additionalRoles)?options.additionalRoles:[]),species,technology,civilization);
    const adjacency=selected.adjacency.concat(species.adjacency||[],technology.adjacency||[],civilization.adjacency||[],Array.isArray(options.adjacency)?options.adjacency:[]);
    const deckCount=Math.max(1,Number(options.decks)||Math.max(...roles.map(item=>Number.isInteger(item.deck)?item.deck:0))+1);
    const seed=String(options.seed||('alien-vessel:'+requestedProfile));
    const layoutOptions={gridWidth:options.width||84,gridHeight:options.height||60,minRoomWidth:6,maxRoomWidth:13,minRoomHeight:5,maxRoomHeight:11,...(selected.layout||{}),...(species.layout||{}),...(technology.layout||{}),...(civilization.layout||{}),...(options.layout||{})};
    const edgeChance=Number.isFinite(options.extraEdgeChance)?options.extraEdgeChance:Number.isFinite(civilization.extraEdgeChance)?civilization.extraEdgeChance:Number.isFinite(species.extraEdgeChance)?species.extraEdgeChance:Number.isFinite(selected.extraEdgeChance)?selected.extraEdgeChance:.12;
    const referenceLayout=options.sourceLayout?normalizeSourceLayout(options.sourceLayout,options.strict):engine.generate({seed,decks:deckCount,roles,adjacency,layout:layoutOptions,extraEdgeChance:edgeChance,pruneDeadEnds:options.pruneDeadEnds!==false,strict:options.strict});
    const hullEnvelope=options.sourceHull?clone(options.sourceHull):hull.wrap(referenceLayout,{shape:options.hullShape||options.shape||'connected-skin',tightness:options.hullTightness==null?(options.tightness==null?'standard':options.tightness):options.hullTightness});
    if(options.strict!==false&&hullEnvelope.validation&&!hullEnvelope.validation.ok)throw new Error('Vessel hull generation failed validation: '+(hullEnvelope.validation.errors||[]).join(' | '));

    const legacyTemplate=requestedProfile==='damaged_recon'&&!options.conditionTemplate&&!options.condition?'DAMAGED':undefined;
    const conditionRequest={
      ...options,
      seed:referenceLayout.seed,
      conditionTemplate:options.conditionTemplate||options.condition||legacyTemplate,
      conditionAxes:options.conditionAxes
    };
    const applied=conditionModel.apply(referenceLayout,conditionRequest);
    const currentLayout=applied.spatialLayout;
    const summary=currentLayout.rooms.map(room=>({id:room.nodeId,role:room.role,label:room.label,deck:room.deck,pressureZone:room.pressureZone,tags:room.tags,condition:room.condition}));
    const referenceSummary=referenceLayout.rooms.map(room=>({id:room.nodeId,role:room.role,label:room.label,deck:room.deck,pressureZone:room.pressureZone,tags:room.tags}));
    const conditionHistory={schemaVersion:applied.schemaVersion,model:applied.model,template:applied.template,axes:clone(applied.axes),coherentVesselGraph:applied.coherentVesselGraph,events:clone(applied.events),roomStates:clone(applied.roomStates),corridorStates:clone(applied.corridorStates),connectorStates:clone(applied.connectorStates),salvageCandidates:clone(applied.salvageCandidates),survivingGraph:clone(applied.survivingGraph),validation:clone(applied.validation)};
    const hullOk=hullEnvelope.validation?hullEnvelope.validation.ok!==false:true;
    const spatialOk=referenceLayout.validation?referenceLayout.validation.ok!==false:true;
    const validation={ok:spatialOk&&hullOk&&applied.validation.ok,spatial:clone(referenceLayout.validation),hull:clone(hullEnvelope.validation||{ok:true,errors:[],warnings:[]}),condition:clone(applied.validation)};
    return {
      schemaVersion:'2.0.0',
      generator:'generator.alien_vessel',
      vesselType:options.vesselType||selected.vesselType,
      faction:options.faction||civilization.name||'Unknown faction',
      species:species.name||species.id||null,
      technologyBasis:technology.name||technology.basis||null,
      profile:requestedProfile,
      referenceProfile:selected.key,
      seed:referenceLayout.seed,
      deckCount:referenceLayout.deckCount,
      architecture:{species,civilization,technology,layoutPreserved:Boolean(options.sourceLayout)},
      referenceVessel:{authority:'INTACT_REFERENCE',profile:selected.key,semanticSummary:referenceSummary,spatialLayout:clone(referenceLayout),hull:clone(hullEnvelope)},
      condition:{template:applied.template,axes:clone(applied.axes),coherentVesselGraph:applied.coherentVesselGraph,survivingGraph:clone(applied.survivingGraph),salvageCandidates:clone(applied.salvageCandidates),validation:clone(applied.validation)},
      conditionHistory,
      semanticSummary:summary,
      hull:hullEnvelope,
      damage:legacyDamage(applied),
      spatialLayout:currentLayout,
      provenance:{topologyAuthority:'HBSemanticSpatialEngine',hullAuthority:'HBVesselHullEnvelope',conditionAuthority:'HBVesselConditionModel',referenceLayoutPreserved:true,conditionAppliedAfterReference:true},
      validation
    };
  }

  return Object.freeze({PROFILES,PROFILE_ALIASES,CONDITION_TEMPLATES:conditionModel.CONDITION_TEMPLATES,profile,generate});
});