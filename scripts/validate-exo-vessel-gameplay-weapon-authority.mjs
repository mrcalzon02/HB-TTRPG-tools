import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const validatorPath=path.join(root,'scripts/validate-exo-vessel-gameplay.mjs');
const fail=message=>{throw new Error(message);};
let source=await fs.readFile(validatorPath,'utf8');
const marker="const available=baseline.gameplayModel.actions.find(item=>item.available);";
if(!source.includes(marker))fail('Could not instrument the VESSEL-09 gameplay validator.');
const assertions=`
const ammunitionPool=baseline.gameplayModel.resources.pools.find(item=>item.key==='ammunition');
const operationalWeaponFamilies=Number(baseline.weaponEngagementModel?.summary?.operationalWeaponFamilies||0);
if(operationalWeaponFamilies>0&&!(ammunitionPool?.current>0))fail('Operational VESSEL-07 weapons produced no ready VESSEL-09 ammunition authority.');
if(operationalWeaponFamilies>0&&!baseline.gameplayModel.actions.some(item=>item.category==='OFFENSIVE'&&item.available))fail('Operational VESSEL-07 weapons produced no available VESSEL-09 offensive action.');
const gameplaySourcePaths=[...baseline.gameplayModel.statistics.flatMap(item=>item.sourceLinks||[]),...baseline.gameplayModel.resources.pools.flatMap(item=>item.sourceLinks||[]),...baseline.gameplayModel.actions.flatMap(item=>item.sourceLinks||[])].map(item=>String(item.path||''));
if(gameplaySourcePaths.some(item=>item.includes('.operational.')))fail('VESSEL-09 retained a noncanonical VESSEL-07 operational source path.');
if(operationalWeaponFamilies>0&&!gameplaySourcePaths.some(item=>item.includes('.operationalState.')))fail('VESSEL-09 does not expose canonical VESSEL-07 operationalState provenance.');
if(!baseline.gameplayModel.validation.warnings.some(item=>item.includes('canonical VESSEL-07 operationalState')))fail('VESSEL-09 did not record its canonical weapon-authority adapter.');
const operationalCountermeasures=Number(baseline.weaponEngagementModel?.summary?.operationalCountermeasureMissileFamilies||0);
if(operationalCountermeasures>0&&!baseline.gameplayModel.actions.some(item=>['DEFENSE_POINT_DEFENSE','DEFENSE_COUNTERMEASURE'].includes(item.actionId)&&item.available))fail('Operational VESSEL-07 countermeasures produced no available VESSEL-09 defensive action.');
`;
source=source.replace(marker,`${assertions}\n${marker}`);
const runtimeSource=await fs.readFile(path.join(root,'blacklight-exo-vessel-gameplay-runtime.js'),'utf8');
for(const signature of ['operationalState','weaponFamily','effectiveUnitCount','canonicalWeaponAuthority','canonicalizeSourceLinks'])if(!runtimeSource.includes(signature))fail(`VESSEL-09 runtime lacks canonical weapon bridge signature ${signature}.`);
const temporary=path.join(os.tmpdir(),`validate-exo-vessel-gameplay-weapon-${process.pid}-${Date.now()}.mjs`);
try{
  await fs.writeFile(temporary,source,'utf8');
  const result=spawnSync(process.execPath,[temporary],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
  if(result.status!==0)fail(`VESSEL-09 canonical weapon-authority validation failed.\n${result.stdout||''}\n${result.stderr||''}`);
  if(result.stdout)process.stdout.write(result.stdout);
}finally{
  await fs.rm(temporary,{force:true});
}
console.log('EXO vessel VESSEL-09 canonical weapon authority validation passed.');
console.log('Validated operationalState readiness, effective ammunition, offensive action availability, point-defense and countermeasure authority, and canonical source provenance.');
