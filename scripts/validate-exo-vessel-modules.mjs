import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const files=[
  'blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-operational-definitions.js','blacklight-exo-ftl-runtime.js','blacklight-exo-ftl-core.js','blacklight-exo-ftl-engineering-extension.js',
  'blacklight-exo-ftl-path-level-core.js','blacklight-exo-ftl-path-level-paths-physical.js','blacklight-exo-ftl-path-level-paths-dimensional.js','blacklight-exo-ftl-path-level-paths-discrete.js','blacklight-exo-ftl-path-level-runtime.js','blacklight-exo-ftl-path-level-engineering.js','blacklight-exo-ftl-path-level-controller.js',
  'blacklight-exo-ftl-mechanism-core.js','blacklight-exo-ftl-mechanism-path-inertial-torch.js','blacklight-exo-ftl-mechanism-path-metric-envelope.js','blacklight-exo-ftl-mechanism-path-gravitic-plane.js','blacklight-exo-ftl-mechanism-path-slipstream-shear.js','blacklight-exo-ftl-mechanism-path-q-lattice.js','blacklight-exo-ftl-mechanism-path-n-manifold.js','blacklight-exo-ftl-mechanism-path-fold-jump.js','blacklight-exo-ftl-mechanism-path-wormhole-gate.js','blacklight-exo-ftl-mechanism-path-phase-displacement.js','blacklight-exo-ftl-mechanism-runtime.js',
  'blacklight-exo-ftl-assembly-core.js','blacklight-exo-ftl-assembly-runtime.js','blacklight-exo-ftl-calculation-core.js','blacklight-exo-ftl-calculation-performance.js','blacklight-exo-ftl-calculation-energy.js','blacklight-exo-ftl-calculation-runtime.js','blacklight-exo-ftl-certification-core.js','blacklight-exo-ftl-certification-route.js','blacklight-exo-ftl-certification-reliability.js','blacklight-exo-ftl-certification-runtime.js',
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-manufacturer-definitions.js','blacklight-exo-vessel-manufacturer-runtime.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-engineering-definitions.js','blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-module-definitions.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-module-runtime.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const left=finite(a,`${label} left`),right=finite(b,`${label} right`),error=Math.abs(left-right)/Math.max(1,Math.abs(right));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(9)}%.`);};
const clone=value=>structuredClone(value);
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel;
const definitions=globalThis.BlacklightExoVesselModuleDefinitions;
if(!vessel||!definitions)fail('VESSEL-03 semantic module graph runtime did not initialize.');
if(vessel.version!==3||vessel.moduleGraphVersion!==1||vessel.engineeringLedgerVersion!==1||vessel.contractVersion!==1||vessel.manufacturerVersion!==1||vessel.philosophyVersion!==1)fail(`Unexpected vessel stack ${vessel.version}/${vessel.moduleGraphVersion}/${vessel.engineeringLedgerVersion}/${vessel.contractVersion}/${vessel.manufacturerVersion}/${vessel.philosophyVersion}.`);
if(definitions.schemaVersion!=='1.0.0'||definitions.graphVersion!==1)fail('Module definitions must expose schema 1.0.0 and graph version 1.');
if(definitions.infrastructure.length!==9||definitions.utilityGraphs.length!==8||definitions.repairableFaults.length!==7)fail('Module infrastructure, utility graph, or repair-fault definitions are incomplete.');

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/module-graph-registry.json'),'utf8'));
const moduleSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-module.schema.json'),'utf8'));
const graphSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-module-graph.schema.json'),'utf8'));
const manufacturerSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-manufacturer.schema.json'),'utf8'));
if(registry.registryVersion!=='1.0.0'||registry.phase!=='VESSEL-03')fail('Module graph registry identity is incorrect.');
if(registry.infrastructureNodes.length!==9||registry.utilityGraphs.length!==8||registry.validationModes.join(',')!=='REPAIR,STRICT')fail('Module graph registry contract counts are incomplete.');
if(moduleSchema.$schema!=='https://json-schema.org/draft/2020-12/schema'||graphSchema.$schema!=='https://json-schema.org/draft/2020-12/schema')fail('Module schemas are not draft 2020-12.');
for(const key of ['recordType','schemaVersion','moduleId','vesselInstanceId','subsystemKey','label','semanticType','envelope','pressureZoneId','criticality','serviceMode','massTonnes','volumeM3','technology','attachment','requirements','dependencies','hazards','functions','state','voxelBounds','provenance','extensions'])if(!moduleSchema.required.includes(key))fail(`Module schema does not require ${key}.`);
for(const key of ['recordType','schemaVersion','phase','vesselInstanceId','topology','validationMode','infrastructureNodes','modules','pressureZones','pressureZoneGraph','graphs','loadPaths','weaponHardpoints','sensorRequirements','repairLog','deferredSystems','validation'])if(!graphSchema.required.includes(key))fail(`Module graph schema does not require ${key}.`);
if(!manufacturerSchema.properties.realizedModuleGraph)fail('Manufacturer schema does not permit VESSEL-03 realization records.');

const source={type:'biology',dossier:{
  version:3,seed:'vesper-module-culture',generatedAt:'2026-07-17T00:00:00.000Z',
  system:{name:'Vesper Array',state:'Dense interstellar hub system',stateKey:'hub',development:91,life:'living',economy:'interstellar transit-service economy',traffic:'continuous interstellar traffic'},
  species:{name:'Vesper Assemblies',commonName:'Vesper',environment:'high-gravity artificial habitat network',bodyPlan:'distributed colonial organism',chemistry:'engineered synthetic biochemistry',senses:['broad-spectrum vision','electromagnetic field sensing'],cognition:'machine-mediated collective memory',communication:'shared augmented-reality glyphs',reproduction:'manufactured gestation',lifespan:'220 local years',size:'2.1 m typical adult span',adaptation:'radiation-repair enzymes',extinct:false},
  civilization:{status:'active',government:'bureaucratic republic',economy:'interstellar transit-service economy',technology:'Advanced interstellar',reach:'Distributed interstellar network',values:['precision and proof','collective survival','commercial reputation'],law:'algorithmic regulation',warfare:'professional expeditionary fleets'}
}};
const baseInput={family:'metric-envelope',pathLevel:'p4',role:'warship',biologyProfile:'inherit',defense:'naval',manufacturerProfile:'APEX_WARLORD',manufacturerIndex:2,designEnvelope:'AUTO',combatFit:'NAVAL',graphValidationMode:'REPAIR',crew:42,enduranceDays:220,reserveJumps:3,distanceLy:4,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};

function checkResult(result,label){
  const graph=result.moduleGraph;
  if(!graph||graph.recordType!=='exoVesselModuleGraph'||graph.schemaVersion!=='1.0.0'||graph.phase!=='VESSEL-03')fail(`${label} lacks the canonical module graph.`);
  if(!graph.validation.valid)fail(`${label} module graph invalid: ${graph.validation.violations.join('; ')}`);
  if(!result.contract?.validation?.valid)fail(`${label} contract invalid: ${result.contract?.validation?.violations?.join('; ')}`);
  if(result.contract.provenance.generatorVersion!=='3.3.0'||result.contract.provenance.moduleGraphVersion!=='1.0.0'||result.contract.provenance.moduleGraphRegistry!=='data/exo-vessel/module-graph-registry.json')fail(`${label} contract provenance does not identify VESSEL-03.`);
  if(result.contract.extensions.moduleGraphSchema!=='data/schemas/exo-vessel-module-graph.schema.json')fail(`${label} contract does not expose the module graph schema.`);
  if(result.contract.derivedLayers.find(layer=>layer.key==='moduleGraph')?.status!=='generated')fail(`${label} did not generate the moduleGraph layer.`);
  for(const key of ['voxelLayout','damageTopology','combatEnvelope','gameplayStatBlock','actionSet'])if(result.contract.derivedLayers.find(layer=>layer.key===key)?.status!=='planned')fail(`${label} prematurely generated ${key}.`);
  if(graph.vesselInstanceId!==result.contract.identifiers.vesselInstanceId)fail(`${label} graph and contract vessel IDs disagree.`);
  if(result.modules!==graph.modules&&JSON.stringify(result.modules)!==JSON.stringify(graph.modules))fail(`${label} top-level module alias diverged from the graph inventory.`);
  if(graph.infrastructureNodes.length!==9)fail(`${label} lacks nine massless infrastructure roots.`);
  if(!['MONOCOQUE','SPINE','CLUSTER','RING','HYBRID'].includes(graph.topology.key))fail(`${label} selected invalid topology ${graph.topology.key}.`);

  const moduleIds=new Set(),nodeIds=new Set(graph.infrastructureNodes.map(node=>node.nodeId));
  for(const module of graph.modules){
    if(moduleIds.has(module.moduleId))fail(`${label} duplicate module ID ${module.moduleId}.`);
    moduleIds.add(module.moduleId);nodeIds.add(module.moduleId);
    if(module.vesselInstanceId!==graph.vesselInstanceId)fail(`${label}/${module.moduleId} has the wrong vessel ID.`);
    if(!/^module-[a-z0-9][a-z0-9-]{5,95}$/.test(module.moduleId))fail(`${label} invalid module ID ${module.moduleId}.`);
    if(module.voxelBounds!==null)fail(`${label}/${module.moduleId} prematurely has voxel bounds.`);
    if(module.state.applicationStatus!=='INTACT_REFERENCE'||module.state.damagePercent!==0||module.state.salvageRemovalPercent!==0)fail(`${label}/${module.moduleId} prematurely applied condition or damage.`);
    if(Math.abs(module.technology.offset)>.300000001)fail(`${label}/${module.moduleId} exceeds its technology band.`);
    const row=result.hull.massBudget.find(item=>item.key===module.provenance.sourceEngineeringKey);
    if(!row)fail(`${label}/${module.moduleId} lacks a source engineering row.`);
    const variant=result.contract.technology.subsystemVariants.find(item=>item.subsystemKey===row.key);
    if(!variant||variant.principalBand!==module.technology.principalBand||variant.variant!==module.technology.variant)fail(`${label}/${module.moduleId} lost source-row technology authority.`);
    const parent=graph.infrastructureNodes.find(node=>node.nodeId===module.attachment.parentId);
    if(!parent||!parent.properties.includes(module.attachment.requiredProperty))fail(`${label}/${module.moduleId} has invalid attachment authority.`);
    if(module.envelope==='INTERNAL'&&(module.attachment.requiredProperty!=='ATMOSPHERE_MANIFOLD'||!module.pressureZoneId||module.serviceMode!=='INTERNAL_CORRIDOR'))fail(`${label}/${module.moduleId} violates INTERNAL attachment or pressure rules.`);
    if(module.envelope==='EVA'&&(module.attachment.requiredProperty!=='VACUUM_EXPOSED'||module.pressureZoneId!==null||module.serviceMode!=='EVA_OR_REMOTE'))fail(`${label}/${module.moduleId} violates EVA attachment or pressure rules.`);
  }
  close(graph.modules.reduce((total,module)=>total+module.massTonnes,0),result.hull.totalMassTonnes,1e-10,`${label} module mass closure`);
  close(graph.modules.reduce((total,module)=>total+module.volumeM3,0),result.hull.totalVolumeM3,1e-10,`${label} module volume closure`);
  close(graph.validation.moduleMassTonnes,result.hull.totalMassTonnes,1e-10,`${label} validation mass closure`);
  close(graph.validation.moduleVolumeM3,result.hull.totalVolumeM3,1e-10,`${label} validation volume closure`);

  for(const row of result.hull.massBudget){
    const derived=graph.modules.filter(module=>module.provenance.sourceEngineeringKey===row.key);
    if(!derived.length)fail(`${label}/${row.key} produced no physical modules.`);
    close(derived.reduce((total,module)=>total+module.massTonnes,0),row.massTonnes,1e-10,`${label}/${row.key} module mass`);
    close(derived.reduce((total,module)=>total+module.volumeM3,0),row.volumeM3,1e-10,`${label}/${row.key} module volume`);
  }

  for(const [name,network] of Object.entries(graph.graphs)){
    if(network.graphType!==name)fail(`${label}/${name} graph type mismatch.`);
    for(const edge of network.edges)if(!nodeIds.has(edge.from)||!nodeIds.has(edge.to))fail(`${label}/${name}/${edge.edgeId} references a missing node.`);
  }
  for(const module of graph.modules){
    if(!graph.graphs.structural.edges.some(edge=>edge.from===module.attachment.parentId&&edge.to===module.moduleId))fail(`${label}/${module.moduleId} is absent from the structural graph.`);
    for(const [name,required] of Object.entries({power:module.requirements.power,cooling:module.requirements.cooling,data:module.requirements.data,atmosphere:module.requirements.atmosphere,access:module.requirements.access}))if(required&&!graph.graphs[name].edges.some(edge=>edge.to===module.moduleId))fail(`${label}/${module.moduleId} lacks required ${name} connectivity.`);
  }

  const zoneIds=new Set(graph.pressureZones.map(zone=>zone.zoneId));
  for(const module of graph.modules)if(module.pressureZoneId&&!zoneIds.has(module.pressureZoneId))fail(`${label}/${module.moduleId} references a missing pressure zone.`);
  for(const zone of graph.pressureZones){
    for(const moduleId of zone.moduleIds)if(!moduleIds.has(moduleId))fail(`${label}/${zone.zoneId} contains a missing module.`);
    if(zone.key.startsWith('MAGAZINE-')&&(zone.inhabited||!zone.isolated))fail(`${label}/${zone.zoneId} magazine zone is not isolated.`);
  }
  for(const edge of graph.pressureZoneGraph.edges)if(!zoneIds.has(edge.from)||!zoneIds.has(edge.to))fail(`${label}/${edge.edgeId} references a missing pressure zone.`);

  for(const loadPath of graph.loadPaths){
    if(!loadPath.valid||!loadPath.continuous||loadPath.throughNodeIds[0]!==loadPath.fromNodeId||loadPath.throughNodeIds.at(-1)!==loadPath.toNodeId||loadPath.throughNodeIds.some(id=>!nodeIds.has(id)))fail(`${label}/${loadPath.loadPathId} is not continuous.`);
  }
  for(const hardpoint of graph.weaponHardpoints){
    if(!hardpoint.valid||!moduleIds.has(hardpoint.moduleId))fail(`${label}/${hardpoint.hardpointId} is invalid.`);
    if(!graph.loadPaths.some(path=>path.loadPathId===hardpoint.recoilPathId&&path.valid))fail(`${label}/${hardpoint.hardpointId} lacks a recoil path.`);
    if(!hardpoint.sensorModuleIds.length||!hardpoint.fireControlModuleIds.length)fail(`${label}/${hardpoint.hardpointId} lacks targeting authority.`);
    if(hardpoint.arc.horizontalArcDeg<=0||hardpoint.arc.horizontalArcDeg>360||hardpoint.arc.verticalArcDeg<=0||hardpoint.arc.verticalArcDeg>180)fail(`${label}/${hardpoint.hardpointId} has invalid arcs.`);
    const familyMagazines=graph.modules.filter(module=>module.semanticType==='MAGAZINE'&&module.extensions.weaponFamily===hardpoint.weaponFamily);
    if(familyMagazines.length&&!graph.graphs.magazineFeed.edges.some(edge=>hardpoint.magazineModuleIds.includes(edge.from)&&edge.to===hardpoint.moduleId))fail(`${label}/${hardpoint.hardpointId} lacks magazine feed.`);
  }
  for(const requirement of graph.sensorRequirements)if(!requirement.valid||!requirement.sourceModuleIds.length||!requirement.fireControlModuleIds.length)fail(`${label}/${requirement.requirementId} is unsatisfied.`);
  if(graph.modules.some(module=>module.semanticType==='WEAPON')&&graph.weaponHardpoints.length!==graph.modules.filter(module=>module.semanticType==='WEAPON').length)fail(`${label} weapon modules and hardpoints do not match.`);
  if(!result.manufacturer?.realizedModuleGraph||result.manufacturer.realizedModuleGraph.moduleCount!==graph.modules.length||result.manufacturer.realizedModuleGraph.topology!==graph.topology.key)fail(`${label} did not write graph realization to its manufacturer.`);
}

const reference=vessel.generate('module-reference',baseInput,source);
checkResult(reference,'reference vessel');
const replay=vessel.generate('module-reference',baseInput,source);
const left=clone(reference),right=clone(replay);delete left.generatedAt;delete right.generatedAt;delete left.contract.createdAt;delete right.contract.createdAt;delete left.contract.updatedAt;delete right.contract.updatedAt;
if(JSON.stringify(left)!==JSON.stringify(right))fail('Reference module graph generation is not deterministic outside timestamps.');

const repaired=vessel.generate('module-repair',{...baseInput,moduleGraphFaults:['INVALID_FIRST_ATTACHMENT','REMOVE_FIRST_POWER_EDGE','REMOVE_FIRST_COOLING_EDGE','REMOVE_FIRST_DATA_EDGE','REMOVE_FIRST_ACCESS_EDGE','REMOVE_FIRST_MAGAZINE_LINK','BREAK_FIRST_LOAD_PATH'],graphValidationMode:'REPAIR'},source);
checkResult(repaired,'repaired vessel');
if(repaired.moduleGraph.repairLog.length<6||!repaired.moduleGraph.validation.preRepairViolations?.length)fail('Repair mode did not retain and repair injected graph faults.');
let strictRejected=false;
try{vessel.generate('module-strict',{...baseInput,moduleGraphFaults:['INVALID_FIRST_ATTACHMENT'],graphValidationMode:'STRICT'},source);}catch(error){strictRejected=/Semantic module graph rejected/.test(String(error.message));}
if(!strictRejected)fail('STRICT graph validation did not reject an invalid attachment.');

const unarmed=vessel.generate('module-unarmed',{...baseInput,combatFit:'UNARMED'},source);
checkResult(unarmed,'unarmed vessel');
if(unarmed.moduleGraph.weaponHardpoints.length||unarmed.moduleGraph.sensorRequirements.length||unarmed.moduleGraph.modules.some(module=>['WEAPON','WEAPON_SUPPORT','MAGAZINE','WEAPON_COOLING','COUNTERMEASURE'].includes(module.semanticType)))fail('UNARMED vessel retained combat modules or hardpoints.');

const families=globalThis.BlacklightExoFTL.families||[],levels=globalThis.BlacklightExoFTL.pathLevels||[],archetypes=['VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'],fits=['UNARMED','CIVILIAN','DEFENSIVE','SECURITY','NAVAL'];
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length}/${levels.length}.`);
let cases=0;
for(const family of families)for(const level of levels)for(let manufacturerIndex=0;manufacturerIndex<4;manufacturerIndex+=1){
  const role=vessel.roles[(cases+manufacturerIndex)%vessel.roles.length],fit=fits[(cases+manufacturerIndex)%fits.length],input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:'inherit',defense:vessel.defenses[cases%vessel.defenses.length].key,manufacturerProfile:archetypes[manufacturerIndex],manufacturerIndex,designEnvelope:'AUTO',combatFit:fit,graphValidationMode:cases%2?'STRICT':'REPAIR',crew:10+(cases%83),enduranceDays:30+(cases%12)*45,reserveJumps:1+(cases%4),distanceLy:.25+(cases%14)*1.25,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};
  const seed=`module-matrix:${family.key}:${level.key}:${manufacturerIndex}`,result=vessel.generate(seed,input,source),again=vessel.generate(seed,input,source);cases+=1;
  checkResult(result,`${family.key}/${level.key}/house-${manufacturerIndex}`);
  if(result.moduleGraph.topology.source.indexOf(result.manufacturer.name)<0)fail(`${family.key}/${level.key}/house-${manufacturerIndex} topology lost manufacturer authority.`);
  const a=clone(result),b=clone(again);delete a.generatedAt;delete b.generatedAt;delete a.contract.createdAt;delete b.contract.createdAt;delete a.contract.updatedAt;delete b.contract.updatedAt;if(JSON.stringify(a)!==JSON.stringify(b))fail(`${family.key}/${level.key}/house-${manufacturerIndex} module graph is not deterministic outside timestamps.`);
}

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-module-definitions.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-module-runtime.js','blacklight-exo-vessel-ui.js','blacklight-exo-vessel-engineering-ui.js','blacklight-exo-vessel-module-ui.js','blacklight-exo-vessel-contract-ui.js'];
let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=prior)fail(`Vessel page loads ${marker} out of order.`);prior=index;}
const ui=await fs.readFile(path.join(root,'blacklight-exo-vessel-module-ui.js'),'utf8');
for(const marker of ['exo-vessel-graph-mode','exo-vessel-export-module-graph','exo-vessel-module-graph-section','exo-vessel-module-graph-grid','exo-vessel-graph-network-body','exo-vessel-module-body','exo-vessel-pressure-zone-body','exo-vessel-hardpoint-body','exo-vessel-module-repair-log'])if(!ui.includes(marker))fail(`Module graph UI lacks ${marker}.`);

console.log('EXO vessel VESSEL-03 semantic module graph validation passed.');
console.log(`Validated ${cases} family/Path/manufacturer cases, mass and volume closure, persistent module identity, INTERNAL and EVA attachment authority, pressure zones, eight utility graphs, structural load paths, weapon arcs, magazine and sensor dependencies, deterministic repair, strict rejection, deterministic replay, and page loader order.`);
