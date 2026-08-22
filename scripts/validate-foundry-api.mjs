import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const exists = file => fs.existsSync(path.join(root, file));
const fail = message => { throw new Error(`[foundry-api] ${message}`); };

const manifest = readJson('api/foundry-capabilities.json');
const collections = readJson('api/resource-collections.json');
const contracts = readJson('api/operation-contracts.json');

if (manifest?.architecture?.rule !== 'Mirrored calls, not mirrored logic.') fail('architecture doctrine changed or is missing.');
if (!exists('foundry-api.js')) fail('foundry-api.js is missing.');
if (!exists('llms.txt')) fail('llms.txt is missing.');
const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
if (!llms.includes('api/foundry-capabilities.json')) fail('llms.txt does not advertise the capability manifest.');
if (!llms.includes('api/operation-contracts.json')) fail('llms.txt does not advertise the operation-contract index.');

function uniqueIds(entries, label) {
  const seen = new Set();
  for (const entry of entries || []) {
    if (!entry?.id) fail(`${label} contains an entry without id.`);
    if (seen.has(entry.id)) fail(`${label} contains duplicate id ${entry.id}.`);
    seen.add(entry.id);
  }
}

function validateArgument(argument, label) {
  if (!argument || typeof argument !== 'object') fail(`${label} has an invalid argument descriptor.`);
  if (!argument.name) fail(`${label} has an argument without a name.`);
  if (!argument.type) fail(`${label}.${argument.name} has no type.`);
  if (argument.required === undefined) fail(`${label}.${argument.name} must declare required true/false.`);
}

function validateContract(capability, contract) {
  const label = `operation contract ${capability.id}`;
  if (!contract || typeof contract !== 'object') fail(`${label} is missing.`);
  if (!contract.callStyle) fail(`${label} has no callStyle.`);

  if (capability.invocation?.type === 'global-dispatch') {
    if (contract.callStyle !== 'dispatcher') fail(`${label} must use dispatcher callStyle.`);
    const documented = Object.keys(contract.operations || {});
    const allowed = capability.invocation.allowedOperations || [];
    const missing = allowed.filter(operation => !documented.includes(operation));
    const undeclared = documented.filter(operation => !allowed.includes(operation));
    if (missing.length) fail(`${label} is missing allowed operations: ${missing.join(', ')}`);
    if (undeclared.length) fail(`${label} documents operations not exposed by the manifest: ${undeclared.join(', ')}`);
    for (const operation of allowed) {
      const operationContract = contract.operations[operation];
      if (!Array.isArray(operationContract.arguments)) fail(`${label}.${operation} must contain an arguments array.`);
      operationContract.arguments.forEach(argument => validateArgument(argument, `${label}.${operation}`));
      if (!operationContract.returns) fail(`${label}.${operation} has no return description.`);
    }
    return;
  }

  if (capability.invocation?.type === 'global-method') {
    if (contract.callStyle !== 'single-object') fail(`${label} must use single-object callStyle.`);
    if (!Array.isArray(contract.arguments)) fail(`${label} must contain an arguments array.`);
    contract.arguments.forEach(argument => validateArgument(argument, label));
    if (!contract.returns) fail(`${label} has no return description.`);
    return;
  }

  if (!Array.isArray(contract.arguments)) fail(`${label} must contain an arguments array even when the capability is UI/resource-only.`);
  contract.arguments.forEach(argument => validateArgument(argument, label));
  if (!contract.returns) fail(`${label} has no return description.`);
}

uniqueIds(manifest.capabilities, 'capabilities');
uniqueIds(manifest.laboratories, 'laboratories');
uniqueIds(manifest.resources, 'manifest resources');
uniqueIds(collections.resources, 'collection resources');

const requiredCapabilities = [
  'spatial.module-map.generate',
  'spatial.alien-vessel.generate',
  'kaysender.airship.generate',
  'signals.configuration.analyze',
  'signals.utilities',
  'shadowrun.binary-cube',
  'blacklight.exo.jump.calculate',
  'blacklight.random-character'
];
for (const id of requiredCapabilities) if (!(manifest.capabilities || []).some(entry => entry.id === id)) fail(`required capability ${id} is missing.`);

const capabilityIds = new Set((manifest.capabilities || []).map(entry => entry.id));
for (const id of Object.keys(contracts.capabilities || {})) if (!capabilityIds.has(id)) fail(`operation contract references unknown capability ${id}.`);

for (const capability of manifest.capabilities || []) {
  for (const file of capability.runtime?.scripts || []) if (!exists(file)) fail(`${capability.id} runtime script does not exist: ${file}`);
  for (const file of capability.source || []) if (!exists(file)) fail(`${capability.id} source does not exist: ${file}`);
  if (capability.page && !exists(capability.page)) fail(`${capability.id} page does not exist: ${capability.page}`);
  if (capability.mode === 'browser-js' && !capability.invocation) fail(`${capability.id} is browser-js but has no invocation descriptor.`);
  validateContract(capability, contracts.capabilities?.[capability.id]);
}

const merged = new Map();
for (const entry of manifest.resources || []) merged.set(entry.id, entry);
for (const entry of collections.resources || []) merged.set(entry.id, { ...(merged.get(entry.id) || {}), ...entry });

if (!merged.has('foundry.operation-contracts')) fail('operation-contract index is not registered as a Foundry resource.');

for (const resource of merged.values()) {
  if (!resource.path || !exists(resource.path)) fail(`${resource.id} resource path does not exist: ${resource.path || '(missing)'}`);
  if (resource.format === 'json') readJson(resource.path);
  if (!resource.indexRules?.length) continue;
  const index = readJson(resource.path);
  for (const rule of resource.indexRules) {
    const values = index?.[rule.key];
    if (!Array.isArray(values)) fail(`${resource.id} index key ${rule.key} is not an array.`);
    for (const value of values) {
      const raw = typeof value === 'string' ? value : value?.path;
      if (!raw) fail(`${resource.id} index key ${rule.key} contains an entry without a path.`);
      const child = `${rule.base || ''}${raw}`.replace(/^\.\//, '');
      if (!exists(child)) fail(`${resource.id} indexed child does not exist: ${child}`);
      if (/\.json$/i.test(child)) readJson(child);
    }
  }
}

const dispatchOperationCount = (manifest.capabilities || []).reduce((sum, capability) => sum + (capability.invocation?.allowedOperations?.length || 0), 0);
console.log(`[foundry-api] validated ${manifest.capabilities.length} capabilities, ${dispatchOperationCount} documented dispatch operations, ${manifest.laboratories.length} laboratories, ${merged.size} top-level resources, and all expandable index children.`);
