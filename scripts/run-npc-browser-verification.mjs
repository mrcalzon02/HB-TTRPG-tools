import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStaticServer,closeServer } from './npc-browser-server.mjs';
import { createRecorder,installPageMonitoring,writeArtifact } from './npc-browser-test-helpers.mjs';
import { runWorkspaceScenarios } from './npc-browser-workspace-scenarios.mjs';
import { runExtensionScenarios } from './npc-browser-extension-scenarios.mjs';

const scriptPath=fileURLToPath(import.meta.url);
const root=path.resolve(path.dirname(scriptPath),'..');
const matrix=JSON.parse(fs.readFileSync(path.join(root,'data/npc-generator/fixtures/phase-14-browser-matrix.json'),'utf8'));
const outputPath=process.argv[2]||'artifacts/npc-browser-verification.json';
const origin=`http://127.0.0.1:${matrix.port}`;
const recorder=createRecorder();
let server,browser;

try{
  server=await startStaticServer(root,matrix.port);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:matrix.viewports.desktop,acceptDownloads:true});
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await context.addInitScript(keys=>{try{for(const key of keys)localStorage.removeItem(key);}catch(_){/* Opaque startup documents do not expose storage. */}},Object.values(matrix.storageKeys));
  const page=await context.newPage();
  page.setDefaultTimeout(matrix.timeouts.action);
  const monitoring=installPageMonitoring(page,origin,'NPC workspace');

  await runWorkspaceScenarios({page,context,matrix,root,origin,recorder});
  await runExtensionScenarios({page,context,matrix,root,origin,recorder});
  await recorder.check('console-network-clean',async()=>monitoring.assertClean());

  const recorded=new Set(recorder.scenarios.map(item=>item.id));
  for(const id of matrix.scenarioIds)if(!recorded.has(id))recorder.fail(id,'Scenario was not executed.');
  const duplicates=matrix.scenarioIds.filter((id,index,all)=>all.indexOf(id)!==index);
  if(duplicates.length)recorder.fail('matrix-integrity',`Duplicate scenario IDs: ${[...new Set(duplicates)].join(', ')}`);

  const artifact={
    artifactType:'npcBrowserVerification',schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),
    projectId:'universal-npc-profile-generator',phaseId:'phase-14-automated-validation-browser-testing',
    entryUrl:`${origin}${matrix.entryPath}`,browser:'chromium',headless:true,
    viewportMatrix:matrix.viewports,valid:recorder.failures.length===0,
    requiredScenarioIds:matrix.scenarioIds,scenarios:recorder.scenarios,failures:recorder.failures
  };
  const artifactPath=writeArtifact(root,outputPath,artifact);
  console.log(`NPC browser verification ${artifact.valid?'passed':'failed'}.`);
  console.log(`Scenarios passed: ${artifact.scenarios.filter(item=>item.status==='passed').length}/${matrix.scenarioIds.length}`);
  console.log(`Artifact: ${path.relative(root,artifactPath)}`);
  if(!artifact.valid){artifact.failures.forEach(message=>console.error(`- ${message}`));process.exitCode=1;}
  await context.close();
}catch(error){
  recorder.fail('runner-failure',error?.stack||error?.message||String(error));
  const artifact={artifactType:'npcBrowserVerification',schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),projectId:'universal-npc-profile-generator',phaseId:'phase-14-automated-validation-browser-testing',entryUrl:`${origin}${matrix.entryPath}`,browser:'chromium',headless:true,viewportMatrix:matrix.viewports,valid:false,requiredScenarioIds:matrix.scenarioIds,scenarios:recorder.scenarios,failures:recorder.failures};
  writeArtifact(root,outputPath,artifact);
  console.error(`NPC browser verification failed before completion: ${error?.stack||error}`);
  process.exitCode=1;
}finally{
  if(browser)await browser.close();
  await closeServer(server);
}
