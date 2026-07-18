import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const fail=message=>{throw new Error(message);};
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const editorSource=await read('blacklight-exo-vessel-campaign-damage-editor.js');
const editorCss=await read('blacklight-exo-vessel-campaign-damage-editor.css');
const gameplayUi=await read('blacklight-exo-vessel-gameplay-ui.js');
const syncSource=await read('blacklight-exo-vessel-diegetic-sync.js');
const schema=JSON.parse(await read('data/schemas/exo-vessel-campaign-state-overlay.schema.json'));

for(const signature of ['VESSEL-05_IMMUTABLE','VESSEL-08_UNCHANGED','campaignEffectiveState','makeOverlay','effectiveState','applyOverlay','resetOverlay','overlayValidation','campaignStateOverlaySchema','blacklight:exo-vessel-activate'])if(!editorSource.includes(signature))fail(`Campaign damage editor lacks ${signature}.`);
for(const signature of ['exo-vessel-editor-axis-grid','exo-vessel-editor-detail-grid','exo-vessel-editor-summary','CAMPAIGN EFFECTIVE STATE'])if(!editorCss.includes(signature))fail(`Campaign damage editor stylesheet lacks ${signature}.`);
for(const signature of ['blacklight-exo-vessel-campaign-damage-editor.css','blacklight-exo-vessel-campaign-damage-editor.js','blacklight-exo-vessel-diegetic-sync.js'])if(!gameplayUi.includes(signature))fail(`Gameplay UI does not load campaign editor asset ${signature}.`);
if(!syncSource.includes('refreshAll')||!syncSource.includes('blacklight:exo-vessel-activate'))fail('Diegetic synchronization does not refresh the campaign damage editor.');
if(schema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-campaign-state-overlay.schema.json'||schema.properties.phase.const!=='VESSEL-10'||schema.properties.baseAuthority.properties.immutable.const!==true)fail('Campaign state overlay schema identity or immutability contract is invalid.');
for(const field of ['baseAuthority','axisOverrides','moduleOverrides','routeOverrides','zoneOverrides','overlayHash','validation'])if(!schema.required.includes(field))fail(`Campaign state overlay schema does not require ${field}.`);

let validator=await read('scripts/validate-exo-vessel-gameplay.mjs');
const marker="const operationalComparison=vessel.generate('gameplay-condition-comparison'";
if(!validator.includes(marker))fail('Could not instrument the VESSEL-09 gameplay validator for campaign damage testing.');
const injected=`
globalThis.document.readyState='loading';globalThis.document.addEventListener=()=>{};
const campaignEditorSource=await fs.readFile(path.join(root,'blacklight-exo-vessel-campaign-damage-editor.js'),'utf8');new vm.Script(campaignEditorSource,{filename:'blacklight-exo-vessel-campaign-damage-editor.js'}).runInThisContext();
const editor=globalThis.BlacklightExoVesselCampaignDamageEditor;if(!editor?.makeOverlay||!editor?.applyOverlay||!editor?.resetOverlay)fail('VESSEL-10 campaign damage editor API did not initialize.');
const conditionBefore=JSON.stringify(baseline.conditionHistory),combatBefore=JSON.stringify(baseline.combatResolutionModel),gameplayBefore=JSON.stringify(baseline.gameplayModel),baseReadiness=Number(baseline.gameplayModel.statistics.reduce((sum,item)=>sum+item.value,0)/baseline.gameplayModel.statistics.length),moduleState=baseline.combatResolutionModel?.postImpactState?.moduleStates?.[0]||baseline.conditionHistory?.moduleStates?.[0],routeState=baseline.combatResolutionModel?.postImpactState?.routeStates?.[0]||baseline.conditionHistory?.routeStates?.[0],zoneState=baseline.combatResolutionModel?.postImpactState?.zoneStates?.[0]||baseline.conditionHistory?.zoneStates?.[0];
if(!moduleState||!routeState||!zoneState)fail('Baseline vessel does not expose module, route, and zone authority for campaign editing.');
const overlay=editor.makeOverlay(baseline,{axisOverrides:{destructionPercent:82,crewAvailabilityPercent:28,atmosphereIntegrityPercent:35,fuelLoadPercent:24,coolantLoadPercent:31,dataIntegrityPercent:22,maintenanceDebtPercent:77},moduleOverrides:[{moduleId:moduleState.moduleId,damagePercent:100,operational:false,graphParticipation:'NONE',installationState:'DESTROYED'}],routeOverrides:[{routeId:routeState.routeId,functional:false,state:'SEVERED'}],zoneOverrides:[{zoneId:zoneState.zoneId,atmosphereIntegrityPercent:0,state:'DESTROYED'}],editorNote:'validation damage overlay'});
if(!overlay.validation.valid||overlay.baseAuthority.immutable!==true)fail('Campaign damage overlay is invalid before application.');
const edited=editor.applyOverlay(baseline,overlay);check(edited,'campaign-edited');
if(JSON.stringify(edited.conditionHistory)!==conditionBefore)fail('VESSEL-10 campaign editor mutated VESSEL-05 condition history.');
if(JSON.stringify(edited.combatResolutionModel)!==combatBefore)fail('VESSEL-10 campaign editor mutated VESSEL-08 combat authority.');
if(!edited.campaignEffectiveState||edited.campaignEffectiveState.recalculated.calculationAuthority!=='VESSEL-10_CAMPAIGN_OPERATIONAL_OVERLAY')fail('Campaign editor did not produce a separate effective state.');
const editedReadiness=Number(edited.gameplayModel.statistics.reduce((sum,item)=>sum+item.value,0)/edited.gameplayModel.statistics.length);if(editedReadiness>=baseReadiness)fail('Destructive campaign overlay did not reduce normalized gameplay readiness.');
if(JSON.stringify(edited.gameplayModel)===gameplayBefore)fail('Campaign overlay did not regenerate the VESSEL-09 action economy.');
const editedPaths=[...edited.gameplayModel.statistics.flatMap(item=>item.sourceLinks||[]),...edited.gameplayModel.resources.pools.flatMap(item=>item.sourceLinks||[]),...edited.gameplayModel.actions.flatMap(item=>item.sourceLinks||[])].map(item=>String(item.path||''));if(!editedPaths.some(item=>item.startsWith('campaignEffectiveState.')))fail('Campaign-edited gameplay does not cite campaignEffectiveState provenance.');
if(edited.contract.extensions.campaignStateOverlaySchema!=='data/schemas/exo-vessel-campaign-state-overlay.schema.json'||edited.contract.provenance.campaignStateVersion!=='1.0.0')fail('Campaign overlay is absent from canonical provenance and extensions.');
const invalidBase=structuredClone(baseline);invalidBase.conditionHistory.axes.wearPercent=99;if(editor.overlayValidation(invalidBase,overlay).valid)fail('Campaign overlay did not reject changed VESSEL-05 base authority.');
const reset=editor.resetOverlay(edited);check(reset,'campaign-reset');if(reset.campaignStateOverlay||reset.campaignEffectiveState)fail('Campaign reset retained overlay state.');if(JSON.stringify(reset.conditionHistory)!==conditionBefore||JSON.stringify(reset.combatResolutionModel)!==combatBefore)fail('Campaign reset failed to restore immutable source authority.');
`;
validator=validator.replace(marker,`${injected}\n${marker}`);
const temporary=path.join(os.tmpdir(),`validate-exo-vessel-campaign-damage-${process.pid}-${Date.now()}.mjs`);
try{
  await fs.writeFile(temporary,validator,'utf8');
  const result=spawnSync(process.execPath,[temporary],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
  if(result.status!==0)fail(`VESSEL-10 reversible campaign damage validation failed.\n${result.stdout||''}\n${result.stderr||''}`);
  if(result.stdout)process.stdout.write(result.stdout);
}finally{await fs.rm(temporary,{force:true});}

const workflow=await read('.github/workflows/pages.yml');if(!workflow.includes('node scripts/validate-exo-vessel-campaign-damage-editor.mjs'))fail('Pages workflow does not gate the VESSEL-10 campaign damage editor.');
console.log('EXO vessel VESSEL-10 reversible campaign damage editor validation passed.');
console.log('Validated immutable VESSEL-05 and VESSEL-08 authority, separate campaign-effective state, axis/module/route/zone overrides, regenerated VESSEL-09 actions, provenance rewriting, tamper rejection, and exact reset.');
