import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const fail=message=>{throw new Error(message);};
const roadmapPath=path.join(root,'exo-vessel-system-roadmap.json');
const roadmap=JSON.parse(await fs.readFile(roadmapPath,'utf8'));

if(roadmap.projectId!=='blacklight-exo-vessel-design-system')fail(`Unexpected projectId ${roadmap.projectId}.`);
if(roadmap.version!==1)fail(`Expected roadmap version 1; found ${roadmap.version}.`);
if(roadmap.status!=='active')fail(`Expected active roadmap after VESSEL-02; found ${roadmap.status}.`);
if(!roadmap.governingGuide)fail('Roadmap does not name a governing guide.');
await fs.access(path.join(root,roadmap.governingGuide));

const expectedBands=['T-1','P0','P1','P2','P3','P4','P5','P6'];
const actualBands=roadmap.technologyBands?.map(item=>item.key)||[];
if(JSON.stringify(actualBands)!==JSON.stringify(expectedBands))fail(`Technology bands must be ${expectedBands.join(', ')}; found ${actualBands.join(', ')}.`);
const variants=roadmap.withinBandVariants||[];
if(variants.length!==5)fail(`Expected 5 within-band variants; found ${variants.length}.`);
if(variants.some(item=>!Number.isFinite(item.offset)||Math.abs(item.offset)>.3))fail('Within-band variants must use finite offsets no greater than ±0.30.');

const phases=roadmap.phases||[];
if(phases.length!==12)fail(`Expected 12 implementation phases; found ${phases.length}.`);
const ids=new Set(),orders=new Set();
for(const phase of phases){
  if(!/^VESSEL-\d{2}$/.test(phase.id))fail(`Invalid phase id ${phase.id}.`);
  if(ids.has(phase.id))fail(`Duplicate phase id ${phase.id}.`);ids.add(phase.id);
  if(!Number.isInteger(phase.order)||orders.has(phase.order))fail(`Invalid or duplicate order for ${phase.id}.`);orders.add(phase.order);
  if(!phase.title||!phase.status)fail(`${phase.id} lacks title or status.`);
  if(!Array.isArray(phase.deliverables)||phase.deliverables.length<3)fail(`${phase.id} lacks sufficient deliverables.`);
  if(!Array.isArray(phase.acceptance)||phase.acceptance.length<3)fail(`${phase.id} lacks sufficient acceptance criteria.`);
}
for(let index=0;index<phases.length;index+=1)if(!orders.has(index))fail(`Missing phase order ${index}.`);
for(const phase of phases)for(const dependency of phase.dependsOn||[])if(!ids.has(dependency))fail(`${phase.id} depends on missing phase ${dependency}.`);

const visiting=new Set(),visited=new Set(),map=new Map(phases.map(phase=>[phase.id,phase]));
function visit(id){
  if(visiting.has(id))fail(`Roadmap dependency cycle detected at ${id}.`);
  if(visited.has(id))return;
  visiting.add(id);
  for(const dependency of map.get(id).dependsOn||[])visit(dependency);
  visiting.delete(id);visited.add(id);
}
for(const phase of phases)visit(phase.id);

const ordered=[...phases].sort((a,b)=>a.order-b.order).map(phase=>phase.id);
if(JSON.stringify(ordered)!==JSON.stringify(roadmap.immediateImplementationOrder))fail('immediateImplementationOrder does not match numeric phase order.');
for(const phaseId of ['VESSEL-00','VESSEL-01','VESSEL-02']){
  const completed=phases.find(phase=>phase.id===phaseId);
  if(completed?.status!=='complete')fail(`${phaseId} must be complete.`);
  if(!Array.isArray(completed.completionEvidence)||completed.completionEvidence.length<5)fail(`${phaseId} lacks completion evidence.`);
  for(const file of completed.completionEvidence)await fs.access(path.join(root,file));
}
if(phases.filter(phase=>phase.status==='next').length!==1||phases.find(phase=>phase.status==='next')?.id!=='VESSEL-03')fail('VESSEL-03 must be the sole next phase.');

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/vessel-contract-registry.json'),'utf8'));
if(registry.activeSchemaVersion!=='1.0.0')fail('VESSEL-00 contract registry is not active at 1.0.0.');
if(JSON.stringify(registry.technologyBands.map(item=>item.key))!==JSON.stringify(expectedBands))fail('Roadmap and contract technology bands disagree.');
if(JSON.stringify(registry.withinBandVariants.map(item=>({key:item.key,offset:item.offset})))!==JSON.stringify(variants))fail('Roadmap and contract variant tables disagree.');

const manufacturerSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-manufacturer.schema.json'),'utf8'));
for(const field of ['archetype','architecture','production','technologyVariantWeights','topologyWeights','materials','repairDoctrine','weaponPreferences','namingGrammar','visualGrammar','doctrine','signatureTraits','preferredRoles','provenance','validation'])if(!manufacturerSchema.required.includes(field))fail(`VESSEL-01 manufacturer schema does not require ${field}.`);
if(!manufacturerSchema.properties.realizedEngineering)fail('Manufacturer schema does not expose VESSEL-02 realization.');
const manufacturerDefinitions=await fs.readFile(path.join(root,'blacklight-exo-vessel-manufacturer-definitions.js'),'utf8');
for(const term of ['CONTINUITY','MODULAR','PRECISION','FRONTIER','VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'])if(!manufacturerDefinitions.includes(term))fail(`VESSEL-01 definitions are missing ${term}.`);
const manufacturerRuntime=await fs.readFile(path.join(root,'blacklight-exo-vessel-manufacturer-runtime.js'),'utf8');
for(const term of ['BlacklightExoVesselManufacturerGenerator','manufacturerCatalog','technologyVariantWeights','topologyWeights','namingGrammar','visualGrammar','blacklight-exo-manufacturer-library-v1'])if(!manufacturerRuntime.includes(term))fail(`VESSEL-01 runtime is missing ${term}.`);
const manufacturerUi=await fs.readFile(path.join(root,'blacklight-exo-vessel-manufacturer-ui.js'),'utf8');
for(const term of ['exo-vessel-manufacturer-index','exo-vessel-save-manufacturer','exo-vessel-export-manufacturer','exo-vessel-manufacturer-section'])if(!manufacturerUi.includes(term))fail(`VESSEL-01 interface is missing ${term}.`);

const engineeringRegistry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/engineering-registry.json'),'utf8'));
if(engineeringRegistry.phase!=='VESSEL-02'||engineeringRegistry.registryVersion!=='1.0.0')fail('VESSEL-02 engineering registry identity is incorrect.');
if(engineeringRegistry.technologyBands.length!==7||engineeringRegistry.weaponFamilies.length!==9||engineeringRegistry.countermeasureTypes.length!==4)fail('VESSEL-02 engineering registry is incomplete.');
const engineeringSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-engineering-ledger.schema.json'),'utf8'));
for(const field of ['propulsion','armor','sensors','weapons','countermeasures','massClosure','deferredSystems','validation'])if(!engineeringSchema.required.includes(field))fail(`VESSEL-02 engineering schema does not require ${field}.`);
const engineeringDefinitions=await fs.readFile(path.join(root,'blacklight-exo-vessel-engineering-definitions.js'),'utf8');
for(const term of ['PULSED_FISSION_THERMAL','FIELD_COUPLED_RELATIVISTIC_TORCH','UNARMED','NAVAL','CHEMICAL_BALLISTIC','FRACTIONAL_C','MISSILE','INTERCEPTOR'])if(!engineeringDefinitions.includes(term))fail(`VESSEL-02 definitions are missing ${term}.`);
const engineeringRuntime=await fs.readFile(path.join(root,'blacklight-exo-vessel-engineering-runtime.js'),'utf8');
for(const term of ['strategicDeltaVMps','combatReserveDeltaVMps','armorToMassPercent','physicalArealDensityKgM2','fireControlChannels','weapon-magazines','weapon-cooling','countermeasures','VESSEL-07'])if(!engineeringRuntime.includes(term))fail(`VESSEL-02 runtime is missing ${term}.`);
const engineeringUi=await fs.readFile(path.join(root,'blacklight-exo-vessel-engineering-ui.js'),'utf8');
for(const term of ['exo-vessel-combat-fit','exo-vessel-engineering-section','exo-vessel-armor-section','exo-vessel-combat-section','exo-vessel-weapon-body'])if(!engineeringUi.includes(term))fail(`VESSEL-02 interface is missing ${term}.`);

const guide=await fs.readFile(path.join(root,roadmap.governingGuide),'utf8');
for(const heading of ['## 8. Crude three-dimensional voxel assembler','## 9. Vessel service doctrine and condition state','## 10. Armor, shielding, and protection-to-mass model','## 11. Sensor, tracking, and light-lag model','## 13. Weapon-family interpretations','## 14. Practical delta-v and combat evasion','## 18. Phased implementation roadmap'])if(!guide.includes(heading))fail(`Governing guide is missing ${heading}.`);
for(const term of ['Internals-first','EVA-first','fractional-c','Missiles','100%','semantic module graph'])if(!guide.includes(term))fail(`Governing guide is missing required concept ${term}.`);

console.log('EXO vessel phased roadmap validation passed.');
console.log(`Validated completed VESSEL-00 through VESSEL-02 evidence, next-phase VESSEL-03, ${phases.length} ordered acyclic phases, ${actualBands.length} technology bands, ${variants.length} within-band variants, manufacturer contracts, engineering contracts, and the governing guide.`);
