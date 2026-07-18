import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const roadmapPath=path.join(root,'exo-vessel-system-roadmap.json');
const legacyValidator=path.join(root,'scripts/validate-exo-vessel-roadmap.mjs');
const fail=message=>{throw new Error(message);};
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const json=async filename=>JSON.parse(await read(filename));

const currentText=await fs.readFile(roadmapPath,'utf8');
const current=JSON.parse(currentText);
const legacy=structuredClone(current);
for(const phase of legacy.phases||[]){
  if(phase.id==='VESSEL-08'){phase.status='next';delete phase.completionEvidence;}
  if(phase.id==='VESSEL-09')phase.status='planned';
}
try{
  await fs.writeFile(roadmapPath,`${JSON.stringify(legacy,null,2)}\n`,'utf8');
  const result=spawnSync(process.execPath,[legacyValidator],{cwd:root,encoding:'utf8'});
  if(result.status!==0)fail(`Legacy VESSEL-00 through VESSEL-07 roadmap validation failed.\n${result.stdout||''}\n${result.stderr||''}`);
  if(result.stdout)process.stdout.write(result.stdout);
}finally{
  await fs.writeFile(roadmapPath,currentText,'utf8');
}

const roadmap=JSON.parse(currentText),phases=roadmap.phases||[],map=new Map(phases.map(phase=>[phase.id,phase]));
for(const term of ['immutable authority','separate post-impact state'])if(!roadmap.principles?.some(principle=>principle.toLowerCase().includes(term)))fail(`Roadmap principles do not preserve VESSEL-08 concept: ${term}.`);
for(const phaseId of ['VESSEL-00','VESSEL-01','VESSEL-02','VESSEL-03','VESSEL-04','VESSEL-05','VESSEL-06','VESSEL-07','VESSEL-08']){
  const phase=map.get(phaseId);if(phase?.status!=='complete'||!Array.isArray(phase.completionEvidence)||phase.completionEvidence.length<5)fail(`${phaseId} is not complete with evidence.`);
  for(const filename of phase.completionEvidence)await fs.access(path.join(root,filename));
}
if(phases.filter(phase=>phase.status==='next').length!==1||map.get('VESSEL-09')?.status!=='next')fail('VESSEL-09 must be the sole next phase.');
if(!map.get('VESSEL-10')?.deliverables?.some(item=>item.toLowerCase().includes('diegetic interface'))||!map.get('VESSEL-10')?.acceptance?.some(item=>item.toLowerCase().includes('generic browser form fields')))fail('VESSEL-10 does not preserve the final diegetic-control revision.');

const recordSchema=await json('data/schemas/exo-vessel-record.schema.json');
if(recordSchema.properties?.combatResolutionModel?.$ref!=='exo-vessel-combat-resolution.schema.json')fail('Canonical vessel schema does not expose VESSEL-08 combat resolution authority.');
const registry=await json('data/exo-vessel/combat-resolution-registry.json'),schema=await json('data/schemas/exo-vessel-combat-resolution.schema.json');
if(registry.phase!=='VESSEL-08'||registry.registryVersion!=='1.0.0'||registry.facings?.length!==6||registry.interceptOutcomes?.length!==5||registry.localEffectTypes?.length!==6||registry.statePolicy?.preImpactConditionMutable!==false||registry.statePolicy?.postImpactStateSeparate!==true||registry.deferredSystems?.gameplayStatisticsAndActions!=='VESSEL-09')fail('VESSEL-08 combat-resolution registry is incomplete.');
for(const field of ['referenceAuthority','scenario','interceptResolution','approachFacing','protectionResolution','localEffects','postImpactState','referenceSnapshots','repairLog','deferredSystems','validation'])if(!schema.required?.includes(field))fail(`Combat-resolution schema does not require ${field}.`);
if(schema.properties?.schemaVersion?.const!=='1.0.0'||schema.properties?.phase?.const!=='VESSEL-08')fail('Combat-resolution schema identity is incorrect.');

const definitions=await read('blacklight-exo-vessel-damage-definitions.js');
for(const term of ['NO_SOLUTION','INTERCEPTED','NEAR_MISS','IMPACT','PENETRATION','ABLATION','HEATING','FRAGMENTATION','RADIATION','IMPULSE','VESSEL-09'])if(!definitions.includes(term))fail(`Damage definitions lack ${term}.`);
const core=await read('blacklight-exo-vessel-damage-core.js');
for(const term of ['resolveIntercept','chooseImpact','surfaceDistance','protection','resolveLocalEffects','routeEffects','zoneEffects','crewEffects','postImpactState','VESSEL-05_IMMUTABLE_PRE_IMPACT'])if(!core.includes(term))fail(`Damage core lacks ${term}.`);
const runtime=await read('blacklight-exo-vessel-damage-runtime.js');
for(const term of ['combatResolutionModel','3.8.0','combatResolutionVersion','combatResolutionSchema','VESSEL-08 local combat resolution','VESSEL-09'])if(!runtime.includes(term))fail(`Damage runtime lacks ${term}.`);
const contracts=await read('blacklight-exo-vessel-damage-contracts.js');
for(const term of ['combatResolutionRegistryPath','combatResolutionSchema','combatResolutionContractVersion','immutable VESSEL-05','VESSEL-07 weapon engagement authority'])if(!contracts.includes(term))fail(`Damage contracts lack ${term}.`);
const ui=await read('blacklight-exo-vessel-damage-ui.js');
for(const term of ['exo-vessel-damage-mode','exo-vessel-damage-weapon','exo-vessel-export-damage','exo-vessel-damage-section','exo-vessel-damage-module-body','exo-vessel-damage-route-body','exo-vessel-damage-zone-body'])if(!ui.includes(term))fail(`Damage UI lacks ${term}.`);
const validator=await read('scripts/validate-exo-vessel-damage.mjs');
for(const term of ['deterministic intercept outcomes','directional protection surfaces','occupied-placement impact','immutable VESSEL-05 authority','separate post-impact graphs','strict mode'])if(!validator.includes(term))fail(`Damage validator lacks ${term}.`);

const workflow=await read('.github/workflows/pages.yml');
for(const marker of ['node scripts/validate-exo-vessel-damage.mjs','node scripts/validate-exo-vessel-roadmap-v2.mjs'])if(!workflow.includes(marker))fail(`Pages workflow does not gate ${marker}.`);
const page=await read('blacklight-exo-vessel.html');
const loaderOrder=['blacklight-exo-vessel-weapon-contracts.js','blacklight-exo-vessel-damage-definitions.js','blacklight-exo-vessel-damage-core.js','blacklight-exo-vessel-damage-runtime.js','blacklight-exo-vessel-damage-contracts.js','blacklight-exo-vessel-weapon-ui.js','blacklight-exo-vessel-damage-ui.js','blacklight-exo-vessel-contract-ui.js'];let prior=-1;
for(const marker of loaderOrder){const index=page.indexOf(marker);if(index<0||index<=prior)fail(`Vessel page does not load ${marker} in order.`);prior=index;}
console.log('EXO vessel phased roadmap V2 validation passed.');
console.log('Validated legacy VESSEL-00 through VESSEL-07 guarantees, completed VESSEL-08 local combat resolution, immutable pre-impact authority, separate post-impact graphs, next-phase VESSEL-09, and the final VESSEL-10 diegetic-control revision.');
