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
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-manufacturer-definitions.js','blacklight-exo-vessel-manufacturer-runtime.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-engineering-definitions.js','blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-module-definitions.js','blacklight-exo-vessel-voxel-definitions.js','blacklight-exo-vessel-voxel-core.js','blacklight-exo-vessel-voxel-routing.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-module-runtime.js','blacklight-exo-vessel-voxel-runtime.js','blacklight-exo-vessel-voxel-contracts.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const left=finite(a,`${label} left`),right=finite(b,`${label} right`),error=Math.abs(left-right)/Math.max(1,Math.abs(right));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(9)}%.`);};
const clone=value=>structuredClone(value);
const pointInside=(point,grid)=>point.x>=0&&point.y>=0&&point.z>=0&&point.x<=grid.size.x-1&&point.y<=grid.size.y-1&&point.z<=grid.size.z-1;
const overlaps=(a,b)=>a.min.x<=b.max.x&&a.max.x>=b.min.x&&a.min.y<=b.max.y&&a.max.y>=b.min.y&&a.min.z<=b.max.z&&a.max.z>=b.min.z;
const stripTimes=value=>{const copy=clone(value);delete copy.generatedAt;if(copy.contract){delete copy.contract.createdAt;delete copy.contract.updatedAt;}return copy;};

globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel;
const definitions=globalThis.BlacklightExoVesselVoxelDefinitions;
if(!vessel||!definitions)fail('VESSEL-04 voxel assembler runtime did not initialize.');
if(vessel.version!==3||vessel.voxelLayoutVersion!==1||vessel.voxelContractVersion!==1||vessel.moduleGraphVersion!==1||vessel.engineeringLedgerVersion!==1||vessel.contractVersion!==1||vessel.manufacturerVersion!==1||vessel.philosophyVersion!==1)fail(`Unexpected vessel stack ${vessel.version}/${vessel.voxelLayoutVersion}/${vessel.voxelContractVersion}/${vessel.moduleGraphVersion}/${vessel.engineeringLedgerVersion}/${vessel.contractVersion}/${vessel.manufacturerVersion}/${vessel.philosophyVersion}.`);
if(definitions.schemaVersion!=='1.0.0'||definitions.layoutVersion!==1||definitions.maxEnvelopeCells!==120000)fail('Voxel definitions must expose schema 1.0.0, layout version 1, and the 120000-cell cap.');
if(Object.keys(definitions.topologyPolicies).sort().join(',')!==['CLUSTER','HYBRID','MONOCOQUE','RING','SPINE'].join(','))fail('Voxel definitions do not expose all five topology algorithms.');
if(definitions.suggestedResolution.map(item=>item.cellEdgeM).join(',')!=='1,2,5,10,20,50,100')fail('Adaptive voxel resolution table is incomplete.');

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/voxel-layout-registry.json'),'utf8'));
const voxelSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-voxel-layout.schema.json'),'utf8'));
const moduleSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-module.schema.json'),'utf8'));
if(registry.registryVersion!=='1.0.0'||registry.phase!=='VESSEL-04'||registry.maxEnvelopeCells!==120000||registry.representation!=='compressed-sparse-voxel-blocks')fail('Voxel layout registry identity or policy is incorrect.');
if(registry.topologies.sort().join(',')!==['CLUSTER','HYBRID','MONOCOQUE','RING','SPINE'].join(','))fail('Voxel layout registry does not contain all five topologies.');
if(voxelSchema.$schema!=='https://json-schema.org/draft/2020-12/schema'||voxelSchema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-voxel-layout.schema.json')fail('Voxel layout schema identity is incorrect.');
for(const key of ['recordType','schemaVersion','phase','vesselInstanceId','topology','resolution','validationMode','grid','infrastructureAnchors','infrastructureBlocks','modulePlacements','occupiedBlocks','utilityRoutes','accessRoutes','evacuationRoutes','armorSurfaces','evaHardpoints','weaponHardpointPlacements','engineExhaustClearances','radiatorClearances','repairLog','deferredSystems','validation'])if(!voxelSchema.required.includes(key))fail(`Voxel layout schema does not require ${key}.`);
if(!moduleSchema.properties.voxelBounds?.oneOf||!moduleSchema.$defs?.voxelBounds)fail('Semantic module schema does not define nullable structured voxel bounds.');

const source={type:'biology',dossier:{
  version:3,seed:'vesper-voxel-culture',generatedAt:'2026-07-17T00:00:00.000Z',
  system:{name:'Vesper Array',state:'Dense interstellar hub system',stateKey:'hub',development:91,life:'living',economy:'interstellar transit-service economy',traffic:'continuous interstellar traffic'},
  species:{name:'Vesper Assemblies',commonName:'Vesper',environment:'high-gravity artificial habitat network',bodyPlan:'distributed colonial organism',chemistry:'engineered synthetic biochemistry',senses:['broad-spectrum vision','electromagnetic field sensing'],cognition:'machine-mediated collective memory',communication:'shared augmented-reality glyphs',reproduction:'manufactured gestation',lifespan:'220 local years',size:'2.1 m typical adult span',adaptation:'radiation-repair enzymes',extinct:false},
  civilization:{status:'active',government:'bureaucratic republic',economy:'interstellar transit-service economy',technology:'Advanced interstellar',reach:'Distributed interstellar network',values:['precision and proof','collective survival','commercial reputation'],law:'algorithmic regulation',warfare:'professional expeditionary fleets'}
}};
const baseInput={family:'metric-envelope',pathLevel:'p4',role:'warship',biologyProfile:'inherit',defense:'naval',manufacturerProfile:'APEX_WARLORD',manufacturerIndex:2,designEnvelope:'AUTO',combatFit:'NAVAL',graphValidationMode:'REPAIR',voxelValidationMode:'REPAIR',crew:42,enduranceDays:220,reserveJumps:3,distanceLy:4,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};

function checkResult(result,label){
  const graph=result.moduleGraph,layout=result.voxelLayout;
  if(!layout||layout.recordType!=='exoVesselVoxelLayout'||layout.schemaVersion!=='1.0.0'||layout.phase!=='VESSEL-04')fail(`${label} lacks the canonical voxel layout.`);
  if(!layout.validation.valid)fail(`${label} voxel layout invalid: ${layout.validation.violations.join('; ')}`);
  if(!graph?.validation?.valid)fail(`${label} lost its valid semantic module graph.`);
  if(!result.contract?.validation?.valid)fail(`${label} contract invalid: ${result.contract?.validation?.violations?.join('; ')}`);
  if(result.contract.provenance.generatorVersion!=='3.4.0'||result.contract.provenance.voxelLayoutVersion!=='1.0.0'||result.contract.provenance.voxelLayoutRegistry!=='data/exo-vessel/voxel-layout-registry.json')fail(`${label} contract provenance does not identify VESSEL-04.`);
  if(result.contract.extensions.voxelLayoutSchema!=='data/schemas/exo-vessel-voxel-layout.schema.json')fail(`${label} contract does not expose the voxel layout schema.`);
  for(const key of ['engineeringBaseline','architectureAdjustedMassLedger','powerAndThermalLedger','armorAndProtectionLedger','sensorAndNavigationLedger','maneuverAndDeltaVLedger','weaponInventory','countermeasureInventory','moduleGraph','voxelLayout'])if(result.contract.derivedLayers.find(layer=>layer.key===key)?.status!=='generated')fail(`${label} did not generate derived layer ${key}.`);
  for(const key of ['damageTopology','combatEnvelope','gameplayStatBlock','actionSet'])if(result.contract.derivedLayers.find(layer=>layer.key===key)?.status!=='planned')fail(`${label} prematurely generated ${key}.`);
  if(layout.vesselInstanceId!==result.contract.identifiers.vesselInstanceId||layout.vesselInstanceId!==graph.vesselInstanceId)fail(`${label} voxel, graph, and contract vessel IDs disagree.`);
  if(layout.topology.key!==graph.topology.key)fail(`${label} voxel topology diverged from the VESSEL-03 manufacturer-authoritative topology.`);
  if(layout.resolution.compressedSparse!==true||layout.grid.envelopeCellCount>layout.resolution.maxEnvelopeCells||layout.grid.envelopeCellCount>definitions.maxEnvelopeCells)fail(`${label} violated compressed sparse or envelope-cap policy.`);
  if(layout.grid.envelopeCellCount!==layout.grid.size.x*layout.grid.size.y*layout.grid.size.z)fail(`${label} envelope cell count does not match grid dimensions.`);
  close(layout.grid.physicalSizeM.x,layout.grid.size.x*layout.grid.cellEdgeM,1e-12,`${label} physical x envelope`);
  close(layout.grid.physicalSizeM.y,layout.grid.size.y*layout.grid.cellEdgeM,1e-12,`${label} physical y envelope`);
  close(layout.grid.physicalSizeM.z,layout.grid.size.z*layout.grid.cellEdgeM,1e-12,`${label} physical z envelope`);
  if(layout.grid.physicalSizeM.x+1e-9<result.hull.lengthM||layout.grid.physicalSizeM.y+1e-9<result.hull.beamM||layout.grid.physicalSizeM.z+1e-9<result.hull.heightM)fail(`${label} voxel envelope is physically smaller than the mass-derived hull.`);
  if(layout.infrastructureAnchors.length!==9)fail(`${label} does not spatially anchor all nine infrastructure roots.`);

  const modules=graph.modules,moduleIds=new Set(modules.map(module=>module.moduleId)),placementIds=new Set();
  if(layout.modulePlacements.length!==modules.length||layout.occupiedBlocks.length!==modules.length)fail(`${label} does not have one placement and occupied block per persistent module.`);
  for(const placement of layout.modulePlacements){
    if(placementIds.has(placement.moduleId))fail(`${label} duplicates voxel placement for ${placement.moduleId}.`);placementIds.add(placement.moduleId);
    if(!moduleIds.has(placement.moduleId))fail(`${label} placement references unknown module ${placement.moduleId}.`);
    if(!pointInside(placement.bounds.min,layout.grid)||!pointInside(placement.bounds.max,layout.grid))fail(`${label}/${placement.moduleId} leaves the voxel grid.`);
    if(placement.capacityCells<placement.requiredCells||placement.representedVolumeM3+1e-9<placement.actualModuleVolumeM3||placement.packingUtilization<0||placement.packingUtilization>1+1e-12)fail(`${label}/${placement.moduleId} does not fit its voxel bounds.`);
    const module=modules.find(item=>item.moduleId===placement.moduleId);if(!module?.voxelBounds||JSON.stringify(module.voxelBounds)!==JSON.stringify(placement.bounds))fail(`${label}/${placement.moduleId} did not retain its exact canonical voxel bounds.`);
    if(module.state.applicationStatus!=='INTACT_REFERENCE'||module.state.damagePercent!==0||module.state.salvageRemovalPercent!==0)fail(`${label}/${placement.moduleId} prematurely applied condition or damage.`);
  }
  for(let i=0;i<layout.modulePlacements.length;i+=1)for(let j=i+1;j<layout.modulePlacements.length;j+=1)if(overlaps(layout.modulePlacements[i].bounds,layout.modulePlacements[j].bounds))fail(`${label} overlaps ${layout.modulePlacements[i].moduleId} and ${layout.modulePlacements[j].moduleId}.`);
  for(const moduleId of moduleIds)if(!placementIds.has(moduleId))fail(`${label} lacks placement for ${moduleId}.`);
  if(layout.validation.placedModuleCount!==modules.length||layout.validation.occupiedBlockCount!==layout.occupiedBlocks.length||layout.validation.envelopeCellCount!==layout.grid.envelopeCellCount)fail(`${label} validation summary diverges from the layout.`);

  const validNodes=new Set([...graph.infrastructureNodes.map(node=>node.nodeId),...moduleIds]);
  const graphNames=['structural','power','cooling','data','atmosphere','access','magazineFeed','sensorDependency'];
  for(const name of graphNames){
    const routes=layout.utilityRoutes[name];if(!Array.isArray(routes)||routes.length!==graph.graphs[name].edges.length)fail(`${label}/${name} spatial routes do not mirror the semantic graph.`);
    for(const route of routes){if(!validNodes.has(route.fromNodeId)||!validNodes.has(route.toNodeId)||route.points.length<2||route.points.some(point=>!pointInside(point,layout.grid)))fail(`${label}/${route.routeId} has invalid endpoints or leaves the grid.`);}
  }
  if(JSON.stringify(layout.accessRoutes)!==JSON.stringify(layout.utilityRoutes.access))fail(`${label} access-route alias diverges from the access network.`);
  for(const route of layout.evacuationRoutes)if(route.points.length<2||route.points.some(point=>!pointInside(point,layout.grid)))fail(`${label}/${route.routeId} has an invalid evacuation route.`);

  const engineModules=modules.filter(module=>module.semanticType==='MAIN_ENGINE'),enginePlacements=layout.modulePlacements.filter(item=>item.semanticType==='MAIN_ENGINE');
  if(layout.engineExhaustClearances.length!==engineModules.length||enginePlacements.length!==engineModules.length)fail(`${label} engine modules, placements, and exhaust clearances do not match.`);
  if(new Set(enginePlacements.map(item=>item.bounds.topologyLane)).size!==enginePlacements.length)fail(`${label} conventional engines do not occupy distinct aft lanes.`);
  for(const clearance of layout.engineExhaustClearances)if(!clearance.clear||clearance.direction!=='AFT'||!moduleIds.has(clearance.moduleId)||clearance.points.some(point=>!pointInside(point,layout.grid)))fail(`${label}/${clearance.clearanceId} has an invalid exhaust corridor.`);
  const thermalModules=modules.filter(module=>module.semanticType==='THERMAL_CONTROL');if(layout.radiatorClearances.length!==thermalModules.length)fail(`${label} radiator clearances do not match thermal-control modules.`);for(const clearance of layout.radiatorClearances)if(!clearance.clear||!moduleIds.has(clearance.moduleId)||clearance.points.some(point=>!pointInside(point,layout.grid)))fail(`${label}/${clearance.clearanceId} has an invalid radiator field.`);
  const armorModules=modules.filter(module=>module.semanticType==='ARMOR');if(layout.armorSurfaces.length!==armorModules.length||layout.armorSurfaces.some(surface=>!moduleIds.has(surface.moduleId)||surface.areaM2<=0))fail(`${label} armor surfaces do not map to physical armor modules.`);
  const evaModules=modules.filter(module=>module.envelope==='EVA');if(layout.evaHardpoints.length!==evaModules.length||layout.evaHardpoints.some(hardpoint=>!moduleIds.has(hardpoint.moduleId)||!hardpoint.valid))fail(`${label} EVA hardpoints do not map to EVA modules.`);
  const weaponModules=modules.filter(module=>module.semanticType==='WEAPON');if(layout.weaponHardpointPlacements.length!==weaponModules.length)fail(`${label} weapon sight lines do not match weapon modules.`);for(const hardpoint of layout.weaponHardpointPlacements)if(!hardpoint.valid||hardpoint.selfOccluded||!moduleIds.has(hardpoint.moduleId))fail(`${label}/${hardpoint.hardpointId} is self-occluded or invalid.`);
  if(layout.deferredSystems.conditionApplication!=='VESSEL-05'||layout.deferredSystems.trackAndCombatGeometry!=='VESSEL-06'||layout.deferredSystems.weaponEngagementEnvelopes!=='VESSEL-07'||layout.deferredSystems.localDamageResolution!=='VESSEL-08')fail(`${label} violated the phased implementation boundary.`);
}

const reference=vessel.generate('voxel-reference',baseInput,source);checkResult(reference,'reference vessel');
const replay=vessel.generate('voxel-reference',baseInput,source);if(JSON.stringify(stripTimes(reference))!==JSON.stringify(stripTimes(replay)))fail('Reference voxel generation is not deterministic outside timestamps.');

const repaired=vessel.generate('voxel-repair',{...baseInput,voxelLayoutFaults:['OVERLAP_FIRST_TWO','REMOVE_FIRST_PLACEMENT','BLOCK_FIRST_EXHAUST','BLOCK_FIRST_RADIATOR','OCCLUDE_FIRST_WEAPON'],voxelValidationMode:'REPAIR'},source);checkResult(repaired,'repaired vessel');
if(repaired.voxelLayout.repairLog.length!==5||!repaired.voxelLayout.validation.preRepairViolations?.length)fail('Voxel repair mode did not retain and deterministically repair all injected faults.');
let strictRejected=false;try{vessel.generate('voxel-strict',{...baseInput,voxelLayoutFaults:['OVERLAP_FIRST_TWO'],voxelValidationMode:'STRICT'},source);}catch(error){strictRejected=/Voxel layout rejected/.test(String(error.message));}if(!strictRejected)fail('STRICT voxel validation did not reject an overlap.');
let forcedRejected=false;try{vessel.generate('voxel-forced-too-fine',{...baseInput,voxelCellEdgeM:.001},source);}catch(error){forcedRejected=/maximum envelope cell budget/.test(String(error.message));}if(!forcedRejected)fail('A forced resolution exceeding the envelope cap was not rejected.');

const unarmed=vessel.generate('voxel-unarmed',{...baseInput,combatFit:'UNARMED'},source);checkResult(unarmed,'unarmed vessel');if(unarmed.voxelLayout.weaponHardpointPlacements.length||unarmed.voxelLayout.modulePlacements.some(item=>['WEAPON','WEAPON_SUPPORT','MAGAZINE','WEAPON_COOLING','COUNTERMEASURE'].includes(item.semanticType)))fail('UNARMED vessel retained combat voxel placements.');

const families=globalThis.BlacklightExoFTL.families||[],levels=globalThis.BlacklightExoFTL.pathLevels||[],archetypes=['VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'],fits=['UNARMED','CIVILIAN','DEFENSIVE','SECURITY','NAVAL'];
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length}/${levels.length}.`);
const observedTopologies=new Set();let cases=0;
for(const family of families)for(const level of levels)for(let manufacturerIndex=0;manufacturerIndex<4;manufacturerIndex+=1){
  const role=vessel.roles[(cases+manufacturerIndex)%vessel.roles.length],fit=fits[(cases+manufacturerIndex)%fits.length],input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:'inherit',defense:vessel.defenses[cases%vessel.defenses.length].key,manufacturerProfile:archetypes[manufacturerIndex],manufacturerIndex,designEnvelope:'AUTO',combatFit:fit,graphValidationMode:cases%2?'STRICT':'REPAIR',voxelValidationMode:cases%2?'REPAIR':'STRICT',crew:10+(cases%83),enduranceDays:30+(cases%12)*45,reserveJumps:1+(cases%4),distanceLy:.25+(cases%14)*1.25,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};
  const seed=`voxel-matrix:${family.key}:${level.key}:${manufacturerIndex}`,result=vessel.generate(seed,input,source),again=vessel.generate(seed,input,source);cases+=1;checkResult(result,`${family.key}/${level.key}/house-${manufacturerIndex}`);observedTopologies.add(result.voxelLayout.topology.key);
  if(result.voxelLayout.topology.key!==result.moduleGraph.topology.key||result.voxelLayout.topology.source!=='VESSEL-03 persistent module graph')fail(`${family.key}/${level.key}/house-${manufacturerIndex} lost topology authority.`);
  if(JSON.stringify(stripTimes(result))!==JSON.stringify(stripTimes(again)))fail(`${family.key}/${level.key}/house-${manufacturerIndex} voxel layout is not deterministic outside timestamps.`);
}
if(observedTopologies.size!==5)fail(`Cross-product matrix did not exercise all five topology algorithms: ${[...observedTopologies].join(', ')}.`);

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-module-definitions.js','blacklight-exo-vessel-voxel-definitions.js','blacklight-exo-vessel-voxel-core.js','blacklight-exo-vessel-voxel-routing.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-module-runtime.js','blacklight-exo-vessel-voxel-runtime.js','blacklight-exo-vessel-voxel-contracts.js','blacklight-exo-vessel-ui.js','blacklight-exo-vessel-module-ui.js','blacklight-exo-vessel-voxel-ui.js','blacklight-exo-vessel-contract-ui.js'];
let priorIndex=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=priorIndex)fail(`Vessel page loads ${marker} out of order.`);priorIndex=index;}
const ui=await fs.readFile(path.join(root,'blacklight-exo-vessel-voxel-ui.js'),'utf8');for(const marker of ['exo-vessel-voxel-section','exo-vessel-voxel-canvas','exo-vessel-voxel-grid','exo-vessel-voxel-body','exo-vessel-voxel-repair-log','exo-vessel-voxel-mode','exo-vessel-voxel-edge','exo-vessel-export-voxel-layout'])if(!ui.includes(marker))fail(`Voxel interface lacks ${marker}.`);

console.log('EXO vessel VESSEL-04 voxel assembler validation passed.');
console.log(`Validated ${cases} family/Path/manufacturer cases, all five topology algorithms, adaptive resolution and envelope caps, persistent module identity, physical hull dimensions, non-overlapping placement, eight routed networks, access and evacuation paths, armor surfaces, EVA hardpoints, engine exhaust, radiator fields, weapon sight lines, deterministic replay, deterministic repair, strict rejection, and page loader order.`);