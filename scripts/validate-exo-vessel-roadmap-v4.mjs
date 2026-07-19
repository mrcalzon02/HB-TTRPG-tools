import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const fail=message=>{throw new Error(message);};
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const json=async filename=>JSON.parse(await read(filename));
const exists=filename=>fs.access(path.join(root,filename));

const prior=spawnSync(process.execPath,['scripts/validate-exo-vessel-roadmap-v3.mjs'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
if(prior.status!==0)fail(`VESSEL-00 through VESSEL-10 effective roadmap failed.\n${prior.stdout||''}\n${prior.stderr||''}`);
if(prior.stdout)process.stdout.write(prior.stdout);

const base=await json('exo-vessel-system-roadmap.json');
const v10=await json('data/exo-vessel/roadmap-transition-vessel-10.json');
const v11=await json('data/exo-vessel/roadmap-transition-vessel-11.json');
if(v11.recordType!=='blacklightExoVesselRoadmapTransition'||v11.schemaVersion!=='1.0.0'||v11.strategy!=='append-only-phase-transition')fail('VESSEL-11 transition identity is invalid.');
if(v11.projectId!==base.projectId||v11.baseRoadmap!=='exo-vessel-system-roadmap.json'||v11.baseRoadmapVersion!==base.version)fail('VESSEL-11 transition does not identify the canonical base roadmap.');
if(v11.priorTransition!=='data/exo-vessel/roadmap-transition-vessel-10.json'||v10.nextPhase!=='VESSEL-11')fail('VESSEL-11 transition does not follow the VESSEL-10 transition.');
if(v11.completedPhase!=='VESSEL-11'||v11.nextPhase!==null||v11.projectStatus!=='original-roadmap-complete')fail('VESSEL-11 transition does not close the original roadmap.');

const effective=structuredClone(base),phaseMap=new Map(effective.phases.map(phase=>[phase.id,phase]));
for(const transition of[v10,v11])for(const change of transition.changes||[]){const phase=phaseMap.get(change.phaseId);if(!phase)fail(`Transition references unknown phase ${change.phaseId}.`);if(phase.status!==change.fromStatus)fail(`${change.phaseId} transition expected ${change.fromStatus} but effective roadmap records ${phase.status}.`);phase.status=change.toStatus;if(change.completionEvidence)phase.completionEvidence=[...change.completionEvidence];}
for(const phaseId of Array.from({length:12},(_,index)=>`VESSEL-${String(index).padStart(2,'0')}`)){
  const phase=phaseMap.get(phaseId);if(!phase)fail(`Missing ${phaseId}.`);if(phase.status!=='complete')fail(`${phaseId} is not complete in the final effective roadmap.`);if(!Array.isArray(phase.completionEvidence)||phase.completionEvidence.length<5)fail(`${phaseId} lacks completion evidence.`);for(const filename of phase.completionEvidence)await exists(filename);
}
if(effective.phases.some(phase=>phase.status==='next'||phase.status==='planned'))fail('The final effective roadmap retains unfinished phases.');
if(effective.phases.length!==12)fail(`Expected 12 original roadmap phases, received ${effective.phases.length}.`);

const phase=phaseMap.get('VESSEL-11');
for(const deliverable of['Cross-product generation matrix','Monte Carlo engagement simulation','Mass and volume closure tests','Graph validation','Weapon-envelope regressions','Damage-state invariants','Balance reports'])if(!phase.deliverables.includes(deliverable))fail(`VESSEL-11 roadmap lost deliverable ${deliverable}.`);
for(const acceptance of['All nine FTL families and seven Path levels remain generatable','Every manufacturer and topology produces valid ships','No weapon dominates every range and target state','Condition percentages remain coherent and distinct'])if(!phase.acceptance.includes(acceptance))fail(`VESSEL-11 roadmap lost acceptance criterion ${acceptance}.`);
for(const key of['allFtlFamiliesAndPathLevels','manufacturerAndTopologyCoverage','massVolumeAndGraphClosure','weaponRegression','damageStateInvariants','noUniversalWeaponDominance','deterministicReplay','failureArtifacts'])if(!v11.acceptanceEvidence?.[key])fail(`VESSEL-11 transition lacks ${key} evidence.`);
for(const filename of v11.validationAuthority||[])await exists(filename);

const matrixRegistry=await json('data/exo-vessel/validation-matrix-registry.json');
if(matrixRegistry.schemaVersion!=='1.1.0'||matrixRegistry.matrixPolicy?.requiredManufacturerDoctrineCount!==4||matrixRegistry.matrixPolicy?.requiredTopologyPolicyCount!==5)fail('Final roadmap does not pin complete manufacturer and topology matrix authority.');
if(matrixRegistry.deferredAnalysis)fail('Final roadmap retains deferred VESSEL-11 analysis.');
const workflow=await read('.github/workflows/pages.yml');
for(const marker of['node scripts/validate-exo-vessel-roadmap-v4.mjs','node scripts/run-exo-vessel-balance-matrix.mjs artifacts/exo-vessel-balance-matrix.json','node scripts/run-exo-vessel-engagement-monte-carlo.mjs artifacts/exo-vessel-balance-matrix.json artifacts/exo-vessel-engagement-simulation.json'])if(!workflow.includes(marker))fail(`Pages workflow does not gate final roadmap authority ${marker}.`);

console.log('EXO vessel final phased roadmap validation passed.');
console.log('Validated all twelve original phases as complete, VESSEL-11 family, Path, manufacturer, topology, closure, graph, weapon, damage, deterministic replay, Monte Carlo, dominance, and report authority, with no invented successor phase.');
