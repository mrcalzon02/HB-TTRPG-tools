import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath=fileURLToPath(import.meta.url);
const root=path.resolve(path.dirname(scriptPath),'..');
const VALIDATORS=[
  {sequence:1,path:'scripts/validate-npc-phase-1.mjs'},
  {sequence:2,path:'scripts/validate-npc-phase-2.mjs'},
  {sequence:3,path:'scripts/validate-npc-phase-3.mjs'},
  {sequence:4,path:'data/npc-generator/validate-phase-4.mjs'},
  {sequence:5,path:'scripts/validate-npc-phase-5.mjs'},
  {sequence:6,path:'scripts/validate-npc-phase-6.mjs'},
  {sequence:7,path:'scripts/validate-npc-phase-7.mjs'},
  {sequence:8,path:'scripts/validate-npc-phase-8.mjs'},
  {sequence:9,path:'scripts/validate-npc-phase-9.mjs'},
  {sequence:10,path:'scripts/validate-npc-phase-10.mjs'},
  {sequence:11,path:'scripts/validate-npc-phase-11.mjs'},
  {sequence:12,path:'scripts/validate-npc-phase-12.mjs'},
  {sequence:13,path:'scripts/validate-npc-phase-13.mjs'}
];

function clone(value){return JSON.parse(JSON.stringify(value));}
function syntheticLedger(current,sequence){
  const ledger=clone(current),phase=ledger.phases.find(item=>item.sequence===sequence),previous=ledger.phases.find(item=>item.sequence===sequence-1);
  if(!phase||!previous)throw new Error(`Ledger does not contain phase sequence ${sequence}.`);
  ledger.activePhaseId=phase.id;
  ledger.lastCompletedPhaseId=previous.id;
  ledger.runtimeStatus=`regression-validation-${phase.id}`;
  ledger.phases=ledger.phases.map(item=>({...item,status:item.sequence<sequence?'gate-passed':item.sequence===sequence?'active':'queued'}));
  return ledger;
}
function copyRepository(destination){
  fs.cpSync(root,destination,{recursive:true,filter:source=>{
    const relative=path.relative(root,source);
    if(!relative)return true;
    const first=relative.split(path.sep)[0];
    return !['.git','node_modules','artifacts'].includes(first);
  }});
}
function tail(value,count=12){return String(value||'').trim().split('\n').filter(Boolean).slice(-count);}

export function runAllPhases(){
  const current=JSON.parse(fs.readFileSync(path.join(root,'data/npc-generator/phase-status.json'),'utf8'));
  const failures=[],results=[];
  if(current.activeBranch!=='main')failures.push('Current ledger does not retain main as the only active branch.');
  if(current.activePhaseId!=='phase-14-automated-validation-browser-testing')failures.push('Phase 14 must be active before running the consolidated regression suite.');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'npc-phase-regression-'));
  try{
    copyRepository(temporary);
    for(const validator of VALIDATORS){
      const phase=current.phases.find(item=>item.sequence===validator.sequence);
      const ledger=syntheticLedger(current,validator.sequence);
      fs.writeFileSync(path.join(temporary,'data/npc-generator/phase-status.json'),`${JSON.stringify(ledger)}\n`);
      const result=spawnSync(process.execPath,[validator.path],{cwd:temporary,encoding:'utf8',env:{...process.env,NPC_REGRESSION_MODE:'1'},maxBuffer:32*1024*1024});
      const record={phaseId:phase.id,sequence:validator.sequence,validator:validator.path,exitCode:result.status??1,stdout:tail(result.stdout),stderr:tail(result.stderr)};
      results.push(record);
      if(record.exitCode!==0)failures.push(`${phase.id} failed with exit code ${record.exitCode}: ${[...record.stderr,...record.stdout].slice(-6).join(' | ')}`);
    }
  }finally{
    fs.rmSync(temporary,{recursive:true,force:true});
  }
  const live=fs.readFileSync(path.join(root,'data/npc-generator/phase-status.json'),'utf8');
  const liveLedger=JSON.parse(live);
  if(liveLedger.activePhaseId!==current.activePhaseId||liveLedger.lastCompletedPhaseId!==current.lastCompletedPhaseId)failures.push('Live phase ledger changed during regression validation.');
  return{valid:failures.length===0,failures,results,validatorsRun:results.length};
}

if(path.resolve(process.argv[1]||'')===scriptPath){
  const result=runAllPhases();
  if(!result.valid){
    console.error('Consolidated NPC regression validation failed:');
    result.failures.forEach(message=>console.error(`- ${message}`));
    process.exit(1);
  }
  console.log('Consolidated NPC regression validation passed.');
  console.log(`Historical phase validators passed: ${result.validatorsRun}`);
  result.results.forEach(item=>console.log(`- ${item.phaseId}: ${item.validator}`));
}
