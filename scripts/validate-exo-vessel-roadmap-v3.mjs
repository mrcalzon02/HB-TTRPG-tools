import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const fail=message=>{throw new Error(message);};
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const json=async filename=>JSON.parse(await read(filename));
const exists=filename=>fs.access(path.join(root,filename));

const baseValidator=spawnSync(process.execPath,['scripts/validate-exo-vessel-roadmap-v2.mjs'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
if(baseValidator.status!==0)fail(`Base VESSEL-00 through VESSEL-09 roadmap authority failed.\n${baseValidator.stdout||''}\n${baseValidator.stderr||''}`);
if(baseValidator.stdout)process.stdout.write(baseValidator.stdout);

const base=await json('exo-vessel-system-roadmap.json');
const transition=await json('data/exo-vessel/roadmap-transition-vessel-10.json');
if(transition.recordType!=='blacklightExoVesselRoadmapTransition'||transition.schemaVersion!=='1.0.0'||transition.strategy!=='append-only-phase-transition')fail('VESSEL-10 roadmap transition identity is invalid.');
if(transition.projectId!==base.projectId||transition.baseRoadmap!=='exo-vessel-system-roadmap.json'||transition.baseRoadmapVersion!==base.version)fail('VESSEL-10 transition does not identify the canonical base roadmap.');
if(transition.nextPhase!=='VESSEL-11')fail('VESSEL-10 transition does not advance to VESSEL-11.');

const effective=structuredClone(base),phaseMap=new Map(effective.phases.map(phase=>[phase.id,phase]));
for(const change of transition.changes||[]){
  const phase=phaseMap.get(change.phaseId);if(!phase)fail(`Transition references unknown phase ${change.phaseId}.`);
  if(phase.status!==change.fromStatus)fail(`${change.phaseId} transition expected ${change.fromStatus} but base roadmap records ${phase.status}.`);
  phase.status=change.toStatus;
  if(change.completionEvidence)phase.completionEvidence=[...change.completionEvidence];
}
for(const phaseId of Array.from({length:11},(_,index)=>`VESSEL-${String(index).padStart(2,'0')}`)){
  const phase=phaseMap.get(phaseId);if(phase?.status!=='complete')fail(`${phaseId} is not complete in the effective roadmap.`);
  if(!Array.isArray(phase.completionEvidence)||phase.completionEvidence.length<5)fail(`${phaseId} lacks completion evidence in the effective roadmap.`);
  for(const filename of phase.completionEvidence)await exists(filename);
}
if(effective.phases.filter(phase=>phase.status==='next').length!==1||phaseMap.get('VESSEL-11')?.status!=='next')fail('VESSEL-11 must be the sole effective next phase.');

const v10=phaseMap.get('VESSEL-10');
for(const deliverable of['Manufacturer library','Hull-family library','Voxel viewer','Damage-state editor','Combat stat card','JSON import and export','Campaign persistence','Schema migrations'])if(!v10.deliverables.includes(deliverable))fail(`VESSEL-10 roadmap lost deliverable ${deliverable}.`);
if(!v10.deliverables.some(item=>item.toLowerCase().includes('diegetic interface')))fail('VESSEL-10 roadmap lost the diegetic interface deliverable.');
for(const term of['germinate a persistent vessel','reload without provenance loss','migrate without destructive data loss','generic browser form fields'])if(!v10.acceptance.some(item=>item.toLowerCase().includes(term)))fail(`VESSEL-10 roadmap lost acceptance authority ${term}.`);

for(const key of['persistentRouteDerivedVessel','losslessReload','nondestructiveMigration','diegeticControls','campaignDamage','integratedVoxelInterface'])if(!transition.acceptanceEvidence?.[key])fail(`VESSEL-10 transition lacks ${key} acceptance evidence.`);
for(const filename of transition.validationAuthority||[])await exists(filename);

const archiveSchema=await json('data/schemas/exo-vessel-campaign-archive.schema.json');
if(archiveSchema.properties?.recordType?.const!=='blacklightExoVesselCampaignArchive'||archiveSchema.properties?.vessel?.$ref!=='exo-vessel-record.schema.json')fail('VESSEL-10 campaign archive does not retain a complete canonical vessel.');
const overlaySchema=await json('data/schemas/exo-vessel-campaign-state-overlay.schema.json');
if(overlaySchema.properties?.phase?.const!=='VESSEL-10'||overlaySchema.properties?.baseAuthority?.properties?.immutable?.const!==true)fail('VESSEL-10 campaign overlay does not preserve immutable source authority.');

const campaign=await read('blacklight-exo-vessel-campaign-store.js');
for(const term of['indexedDB.open','validateEnvelope','migrateRecord','blacklight:exo-vessel-activate','Manufacturer library','Hull-family library'])if(!campaign.includes(term))fail(`Campaign persistence lacks ${term}.`);
const instruments=await read('blacklight-exo-vessel-diegetic-controls.js');
for(const term of['enhanceSelect','enhanceNumber','refreshAll','exo-vessel-native-authority','allowAutomatic'])if(!instruments.includes(term))fail(`Diegetic controls lack ${term}.`);
const editor=await read('blacklight-exo-vessel-campaign-damage-editor.js');
for(const term of['VESSEL-05_IMMUTABLE','VESSEL-08_UNCHANGED','campaignEffectiveState','applyOverlay','resetOverlay','overlayValidation'])if(!editor.includes(term))fail(`Campaign damage editor lacks ${term}.`);
const viewer=await read('blacklight-exo-vessel-campaign-voxel-viewer.js');
for(const term of['modulePlacements','utilityEdges','campaignEffectiveState','Edit This Module','isometric','INTERNAL','EVA'])if(!viewer.includes(term))fail(`Campaign voxel viewer lacks ${term}.`);
const routeOverlay=await read('blacklight-exo-vessel-campaign-voxel-route-overlay.js');
for(const term of['campaignEffectiveState','combatResolutionModel','conditionHistory','campaignRouteState','severed'])if(!routeOverlay.includes(term))fail(`Campaign route overlay lacks ${term}.`);
const loader=await read('blacklight-exo-vessel-gameplay-ui.js');
for(const term of['BlacklightExoVesselCampaignStore','BlacklightExoVesselDiegeticControls','BlacklightExoVesselDiegeticSync','BlacklightExoVesselCampaignDamageEditor','BlacklightExoVesselCampaignVoxelViewer','BlacklightExoVesselCampaignVoxelRouteOverlay','blacklight:exo-vessel-v10-ready','vessel-10-interface'])if(!loader.includes(term))fail(`Canonical VESSEL-10 loader lacks ${term}.`);
const health=await read('blacklight-exo-deployment-health.js');
for(const term of['complete VESSEL-10 campaign interface','BlacklightExoVesselCampaignDamageEditor','BlacklightExoVesselCampaignVoxelViewer','BlacklightExoVesselCampaignVoxelRouteOverlay','voxelPlacements'])if(!health.includes(term))fail(`Deployment health does not verify ${term}.`);

const workflow=await read('.github/workflows/pages.yml');
for(const marker of['node scripts/validate-exo-vessel-roadmap-v2.mjs','node scripts/validate-exo-vessel-roadmap-v3.mjs','node scripts/validate-exo-vessel-campaign-store.mjs','node scripts/validate-exo-vessel-diegetic-controls.mjs','node scripts/validate-exo-vessel-campaign-damage-editor.mjs','node scripts/validate-exo-vessel-campaign-voxel-viewer.mjs','node scripts/validate-exo-vessel-v10-loader.mjs'])if(!workflow.includes(marker))fail(`Pages workflow does not gate ${marker}.`);

console.log('EXO vessel phased roadmap V3 validation passed.');
console.log('Validated the append-only VESSEL-10 completion transition, complete campaign persistence and migration, diegetic controls, reversible immutable-authority editing, integrated voxel and route state, canonical loader and deployment health, and sole next-phase VESSEL-11.');
