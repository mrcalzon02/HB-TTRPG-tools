import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const fail=message=>{throw new Error(message);};
const roadmapPath=path.join(root,'exo-vessel-system-roadmap.json');
const roadmap=JSON.parse(await fs.readFile(roadmapPath,'utf8'));

if(roadmap.projectId!=='blacklight-exo-vessel-design-system')fail(`Unexpected projectId ${roadmap.projectId}.`);
if(roadmap.version!==1)fail(`Expected roadmap version 1; found ${roadmap.version}.`);
if(roadmap.status!=='active')fail(`Expected active roadmap after VESSEL-00; found ${roadmap.status}.`);
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
const completed=phases.find(phase=>phase.id==='VESSEL-00');
if(completed?.status!=='complete')fail('VESSEL-00 must be complete.');
if(!Array.isArray(completed.completionEvidence)||completed.completionEvidence.length<8)fail('VESSEL-00 lacks completion evidence.');
for(const file of completed.completionEvidence)await fs.access(path.join(root,file));
if(phases.filter(phase=>phase.status==='next').length!==1||phases.find(phase=>phase.status==='next')?.id!=='VESSEL-01')fail('VESSEL-01 must be the sole next phase.');

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/vessel-contract-registry.json'),'utf8'));
if(registry.activeSchemaVersion!=='1.0.0')fail('VESSEL-00 contract registry is not active at 1.0.0.');
if(JSON.stringify(registry.technologyBands.map(item=>item.key))!==JSON.stringify(expectedBands))fail('Roadmap and contract technology bands disagree.');
if(JSON.stringify(registry.withinBandVariants.map(item=>({key:item.key,offset:item.offset})))!==JSON.stringify(variants))fail('Roadmap and contract variant tables disagree.');

const guide=await fs.readFile(path.join(root,roadmap.governingGuide),'utf8');
for(const heading of ['## 8. Crude three-dimensional voxel assembler','## 9. Vessel service doctrine and condition state','## 11. Sensor, tracking, and light-lag model','## 13. Weapon-family interpretations','## 18. Phased implementation roadmap'])if(!guide.includes(heading))fail(`Governing guide is missing ${heading}.`);
for(const term of ['Internals-first','EVA-first','fractional-c','Missiles','100%','semantic module graph'])if(!guide.includes(term))fail(`Governing guide is missing required concept ${term}.`);

console.log('EXO vessel phased roadmap validation passed.');
console.log(`Validated completed VESSEL-00 evidence, next-phase VESSEL-01, ${phases.length} ordered acyclic phases, ${actualBands.length} technology bands, ${variants.length} within-band variants, and the governing guide.`);
