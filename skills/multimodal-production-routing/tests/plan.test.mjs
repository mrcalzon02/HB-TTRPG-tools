import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const script = join(skillRoot, 'scripts/plan.mjs');
const catalog = join(skillRoot, 'catalog.json');
const stages = ['image.generate', 'mesh.author', 'mesh.render', 'visual.proof'];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'hb-production-route-'));
  const paths = [
    'skills/index.json', 'docs/blacklight/charles-personality-engram.json',
    'skills/multimodal-production-routing/scripts/plan.mjs',
    'skills/multimodal-production-routing/catalog.json', 'request.json', 'inventory.json'
  ];
  for (const path of paths) mkdirSync(dirname(join(dir,path)), {recursive:true});
  copyFileSync(script, join(dir, paths[2]));
  copyFileSync(catalog, join(dir, paths[3]));
  const engram = {
    engram_id:'blacklight.charles', personality_version:'CE1.1', passive:true,
    skill_registry:{registry_path:'skills/index.json', binding:'bidirectional-required', tool_authority:'host-controlled'},
    capability_boundary:{grants_tools:false, grants_network_access:false, grants_credentials:false,
      grants_provider_access:false, grants_persistent_storage:false, tool_claims_require_host_result:true}
  };
  function writeEngram(data) {
    const raw = JSON.stringify(data);
    writeFileSync(join(dir,paths[1]),raw);
    const digest = createHash('sha256').update(raw).digest('hex');
    const index = {defaultPersonality:{engramId:'blacklight.charles', authorityPath:paths[1], reciprocalRegistryPath:paths[0],
      required:true, integrity:{algorithm:'sha256', digest}}, skills:[{name:'multimodal-production-routing',path:'skills/multimodal-production-routing/SKILL.md',personalityEngramIds:['blacklight.charles']}]};
    writeFileSync(join(dir,paths[0]), JSON.stringify(index));
    return digest;
  }
  const digest = writeEngram(engram);
  const request = {format:'hb-production-request/1',goal:'Generate and verify art',needs:stages};
  const inventory = {format:'hb-host-inventory/1',tools:[]};
  const set = (name, value) => writeFileSync(join(dir,name+'.json'), JSON.stringify(value));
  const run = (args=[]) => spawnSync(process.execPath,[join(dir,paths[2]),join(dir,'request.json'),join(dir,'inventory.json'),...args],{encoding:'utf8'});
  set('request',request);set('inventory',inventory);
  return {dir,engram,digest,request,inventory,set,run,writeEngram,close:()=>rmSync(dir,{recursive:true,force:true})};
}

function withFixture(fn) {const f=fixture();try {fn(f);} finally{f.close();}}

test('missing host tools yield explicit blockers without execution',()=>withFixture(f=>{
  const result=f.run();assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.equal(report.missingOrBlocked,4);
  assert.equal(report.readyForExecution,false);
  assert.equal(report.hostCapabilitiesIndependentlyVerified,false);
  assert.equal(report.executionPerformed,false);
  assert.deepEqual(report.steps.map(step=>step.status),Array(4).fill('adapter-not-declared'));
}));

test('positive host declarations are candidates, never verified readiness',()=>withFixture(f=>{
  f.inventory.tools=[{capabilityId:'image.generate',adapterId:'image-gen',installed:true,authorized:true,selfTest:'passed',evidenceRef:'local-test-001'}];
  f.set('inventory',f.inventory);
  const result=f.run();assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.equal(report.declaredCandidates,1);
  assert.equal(report.steps[0].status,'host-declared-candidate-unverified');
  assert.equal(report.toolsActivated,false);
  assert.equal(report.readyForExecution,false);
}));

test('authorization and self-test failures remain blocked',()=>withFixture(f=>{
  f.inventory.tools=[
    {capabilityId:'image.generate',adapterId:'img',installed:false,authorized:true,selfTest:'passed'},
    {capabilityId:'mesh.author',adapterId:'mesh',installed:true,authorized:false,selfTest:'passed'},
    {capabilityId:'mesh.render',adapterId:'renderer',installed:true,authorized:true,selfTest:'failed'},
    {capabilityId:'visual.proof',adapterId:'preview',installed:true,authorized:true,selfTest:'passed'}
  ];f.set('inventory',f.inventory);
  const r=f.run();assert.equal(r.status,0,r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).steps.map(x=>x.status),['not-installed','not-authorized','self-test-failed','no-test-evidence']);
}));

test('unknown capabilities and duplicate requests are rejected',()=>withFixture(f=>{
  f.request.needs=['private.runner.dispatch'];f.set('request',f.request);
  assert.notEqual(f.run().status,0);
  f.request.needs=['image.generate','image.generate'];f.set('request',f.request);
  assert.notEqual(f.run().status,0);
}));

test('inventory cannot smuggle endpoint, token, command or unregistered adapter',()=>withFixture(f=>{
  const good={capabilityId:'image.generate',adapterId:'img',installed:true,authorized:true,selfTest:'passed',evidenceRef:'test'};
  for(const bad of [{...good,endpoint:'http://127.0.0.1:1234'}, {...good,token:'secret'}, {...good,command:'rm -rf .'}, {...good,capabilityId:'runner.dispatch'}]) {
    f.inventory.tools=[bad];f.set('inventory',f.inventory);assert.notEqual(f.run().status,0);
  }
}));

test('tampered engram or consistent privilege escalation fails closed',()=>withFixture(f=>{
  writeFileSync(join(f.dir,'docs/blacklight/charles-personality-engram.json'),'{}');
  assert.notEqual(f.run().status,0);
  f.engram.capability_boundary.grants_tools=true;
  f.writeEngram(f.engram);
  assert.match(f.run().stderr,/boundary failed/);
}));

test('missing companion and incorrect externally trusted pin fail closed',()=>withFixture(f=>{
  assert.equal(f.run(['--trusted-engram-sha256',f.digest]).status,0);
  assert.notEqual(f.run(['--trusted-engram-sha256','0'.repeat(64)]).status,0);
  rmSync(join(f.dir,'skills/index.json'));
  assert.notEqual(f.run().status,0);
}));

test('malformed inventory, evidence and request cannot become tool authority',()=>withFixture(f=>{
  f.inventory.tools=[{capabilityId:'image.generate',adapterId:'img',installed:true,authorized:true,selfTest:'passed',evidenceRef:'https://remote'}];
  f.set('inventory',f.inventory);assert.notEqual(f.run().status,0);
  f.inventory.tools=[];f.inventory.dispatch=true;f.set('inventory',f.inventory);assert.notEqual(f.run().status,0);
  f.inventory={format:'hb-host-inventory/1',tools:[]};f.set('inventory',f.inventory);
  f.request.needs=[];f.set('request',f.request);assert.notEqual(f.run().status,0);
}));
