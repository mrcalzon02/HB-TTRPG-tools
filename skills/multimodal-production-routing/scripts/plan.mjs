#!/usr/bin/env node
/** Offline diagnostic only. No network, write, adapter invocation or runner access. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const source = new URL('../', import.meta.url);
const root = new URL('../../../', import.meta.url);
const read = url => fs.readFileSync(url, 'utf8');
const json = url => JSON.parse(read(url));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const shape = (value, allowed, label) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert(Object.keys(value).every(key => allowed.includes(key)), `${label} contains an unexpected field`);
};
const idPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const checkId = (id, label) => assert(typeof id === 'string' && id.length <= 64 && idPattern.test(id), `${label} has invalid ID`);

function verifyCompanions(trustedDigest) {
  const index = json(new URL('skills/index.json', root));
  const rawEngram = read(new URL('docs/blacklight/charles-personality-engram.json', root));
  const engram = JSON.parse(rawEngram);
  const digest = createHash('sha256').update(rawEngram).digest('hex');
  const binding = index.defaultPersonality;
  assert(binding?.engramId === 'blacklight.charles' && binding?.authorityPath === 'docs/blacklight/charles-personality-engram.json' && binding?.reciprocalRegistryPath === 'skills/index.json' && binding?.required === true && binding?.integrity?.algorithm === 'sha256' && binding?.integrity?.digest === digest, 'mandatory engram/index digest binding failed');
  assert(engram.engram_id === 'blacklight.charles' && engram.personality_version === 'CE1.1' && engram.passive === true && engram.skill_registry?.registry_path === 'skills/index.json' && engram.skill_registry?.binding === 'bidirectional-required' && engram.skill_registry?.tool_authority === 'host-controlled', 'engram reciprocity failed');
  const boundary = engram.capability_boundary;
  assert(boundary?.grants_tools === false && boundary?.grants_network_access === false && boundary?.grants_credentials === false && boundary?.grants_provider_access === false && boundary?.grants_persistent_storage === false && boundary?.tool_claims_require_host_result === true, 'engram capability boundary failed');
  assert(index.skills?.some(item => item.name === 'multimodal-production-routing' && item.path === 'skills/multimodal-production-routing/SKILL.md' && item.personalityEngramIds?.includes('blacklight.charles')), 'routing skill missing from paired index');
  if (trustedDigest !== null) assert(/^[a-f0-9]{64}$/.test(trustedDigest) && trustedDigest === digest, 'externally trusted engram SHA-256 mismatch');
}

function plan(request, inventory, catalog) {
  shape(request, ['format', 'goal', 'needs'], 'request');
  shape(inventory, ['format', 'tools'], 'inventory');
  shape(catalog, ['format', 'authority', 'scope', 'capabilities'], 'catalog');
  assert(request.format === 'hb-production-request/1' && typeof request.goal === 'string' && request.goal.trim().length > 0 && request.goal.length <= 300, 'invalid request header');
  assert(inventory.format === 'hb-host-inventory/1' && Array.isArray(inventory.tools) && inventory.tools.length <= 64, 'invalid inventory');
  assert(catalog.format === 'hb-production-capabilities/1' && catalog.scope === 'offline-discovery-only' && Array.isArray(catalog.capabilities), 'invalid catalog');
  const supported = new Map();
  for (const cap of catalog.capabilities) {
    shape(cap, ['id','modality','deliverable','qualityGate'], 'catalog capability');
    checkId(cap.id, 'catalog capability');
    assert(!supported.has(cap.id), 'duplicate catalog capability');
    supported.set(cap.id, cap);
  }
  assert(Array.isArray(request.needs) && request.needs.length > 0 && request.needs.length <= 16, 'request needs 1-16 stages');
  assert(request.needs.every(id => typeof id === 'string' && supported.has(id)) && new Set(request.needs).size === request.needs.length, 'unknown or duplicate requested capability');
  const observations = new Map();
  for (const tool of inventory.tools) {
    shape(tool, ['capabilityId','adapterId','installed','authorized','selfTest','evidenceRef'], 'host tool');
    checkId(tool.capabilityId, 'host capability');
    checkId(tool.adapterId, 'host adapter');
    assert(supported.has(tool.capabilityId) && !observations.has(tool.capabilityId), 'unknown or duplicate host capability');
    assert(typeof tool.installed === 'boolean' && typeof tool.authorized === 'boolean', 'host tool requires explicit booleans');
    assert(['passed','failed','not-run'].includes(tool.selfTest), 'invalid host selfTest status');
    if (tool.evidenceRef !== undefined) assert(typeof tool.evidenceRef === 'string' && /^[a-zA-Z0-9._-]{1,120}$/.test(tool.evidenceRef), 'invalid evidence reference');
    observations.set(tool.capabilityId, tool);
  }
  const steps = request.needs.map(id => {
    const cap = supported.get(id);
    const host = observations.get(id);
    let status = 'adapter-not-declared';
    let nextAction = 'Find a compatible host adapter and confirm its permission boundary.';
    if (host) {
      if (!host.installed) { status = 'not-installed'; nextAction = 'Install or connect a permitted adapter through the separate host.'; }
      else if (!host.authorized) { status = 'not-authorized'; nextAction = 'Obtain host authorization for this operation and project scope.'; }
      else if (host.selfTest !== 'passed') { status = host.selfTest === 'failed' ? 'self-test-failed' : 'self-test-not-run'; nextAction = 'Run the host-specific safe self-test and verify the real result.'; }
      else if (!host.evidenceRef) { status = 'no-test-evidence'; nextAction = 'Record and independently verify the host self-test evidence.'; }
      else { status = 'host-declared-candidate-unverified'; nextAction = 'Independently verify adapter identity, test evidence and authorization in the host before invoking.'; }
    }
    return { capabilityId: id, modality: cap.modality, deliverable: cap.deliverable, qualityGate: cap.qualityGate, ...(host ? {adapterId:host.adapterId} : {}), status, nextAction };
  });
  return {
    format: 'hb-production-plan/1', goal: request.goal, scope: 'offline-diagnostic',
    executionPerformed: false, toolsActivated: false, readyForExecution: false,
    hostCapabilitiesIndependentlyVerified: false,
    declaredCandidates: steps.filter(step => step.status === 'host-declared-candidate-unverified').length,
    missingOrBlocked: steps.filter(step => step.status !== 'host-declared-candidate-unverified').length,
    steps
  };
}

try {
  const [requestPath, inventoryPath, flag, digest, ...extra] = process.argv.slice(2);
  assert(requestPath && inventoryPath && extra.length === 0 && (flag === undefined || flag === '--trusted-engram-sha256') && (flag === undefined ? digest === undefined : !!digest), 'usage: plan.mjs request.json host-inventory.json [--trusted-engram-sha256 SHA]');
  verifyCompanions(flag ? digest : null);
  const report = plan(json(requestPath), json(inventoryPath), json(new URL('catalog.json', source)));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} catch (error) {
  process.stderr.write(`[production-routing] ${error.message}\n`);
  process.exitCode = 1;
}
