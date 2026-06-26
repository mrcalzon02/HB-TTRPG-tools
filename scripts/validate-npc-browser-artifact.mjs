import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath=fileURLToPath(import.meta.url);
const root=path.resolve(path.dirname(scriptPath),'..');
const artifactPath=path.resolve(root,process.argv[2]||'artifacts/npc-browser-verification.json');
const matrix=JSON.parse(fs.readFileSync(path.join(root,'data/npc-generator/fixtures/phase-14-browser-matrix.json'),'utf8'));
const artifact=JSON.parse(fs.readFileSync(artifactPath,'utf8'));
const failures=[];

if(artifact.artifactType!=='npcBrowserVerification'||artifact.schemaVersion!=='1.0.0')failures.push('Browser artifact type or schema version is invalid.');
if(artifact.phaseId!=='phase-14-automated-validation-browser-testing')failures.push('Browser artifact phase ID is incorrect.');
if(artifact.valid!==true)failures.push('Browser artifact is not marked valid.');
if(!Array.isArray(artifact.failures)||artifact.failures.length)failures.push(`Browser artifact contains failures: ${(artifact.failures||[]).join(' | ')}`);
if(artifact.browser!=='chromium'||artifact.headless!==true)failures.push('Browser artifact does not record headless Chromium.');
const expected=matrix.scenarioIds;
const scenarios=Array.isArray(artifact.scenarios)?artifact.scenarios:[];
const ids=scenarios.map(item=>item.id);
for(const id of expected){
  const matching=scenarios.filter(item=>item.id===id);
  if(matching.length!==1)failures.push(`${id} appears ${matching.length} times; expected exactly once.`);
  else if(matching[0].status!=='passed')failures.push(`${id} did not pass.`);
}
for(const id of ids)if(!expected.includes(id))failures.push(`Unexpected browser scenario ${id}.`);
if(JSON.stringify(artifact.requiredScenarioIds)!==JSON.stringify(expected))failures.push('Artifact required-scenario list does not match the matrix.');
for(const viewport of['desktop','mobile']){
  const actual=artifact.viewportMatrix?.[viewport],required=matrix.viewports[viewport];
  if(actual?.width!==required.width||actual?.height!==required.height)failures.push(`${viewport} viewport does not match the matrix.`);
}
if(!artifact.generatedAt||Number.isNaN(Date.parse(artifact.generatedAt)))failures.push('Browser artifact generatedAt is invalid.');

if(failures.length){
  console.error('NPC browser artifact validation failed:');
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}
console.log('NPC browser artifact validation passed.');
console.log(`Browser scenarios verified: ${scenarios.length}`);
console.log(`Artifact: ${path.relative(root,artifactPath)}`);
