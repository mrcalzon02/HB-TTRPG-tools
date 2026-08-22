import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const exists = file => fs.existsSync(path.join(root, file));
const fail = message => { throw new Error(`[foundry-api] ${message}`); };

const manifest = readJson('api/foundry-capabilities.json');
const collections = readJson('api/resource-collections.json');

if (manifest?.architecture?.rule !== 'Mirrored calls, not mirrored logic.') fail('architecture doctrine changed or is missing.');
if (!exists('foundry-api.js')) fail('foundry-api.js is missing.');
if (!exists('llms.txt')) fail('llms.txt is missing.');
if (!fs.readFileSync(path.join(root, 'llms.txt'), 'utf8').includes('api/foundry-capabilities.json')) fail('llms.txt does not advertise the capability manifest.');

function uniqueIds(entries, label) {
  const seen = new Set();
  for (const entry of entries || []) {
    if (!entry?.id) fail(`${label} contains an entry without id.`);
    if (seen.has(entry.id)) fail(`${label} contains duplicate id ${entry.id}.`);
    seen.add(entry.id);
  }
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

for (const capability of manifest.capabilities || []) {
  for (const file of capability.runtime?.scripts || []) if (!exists(file)) fail(`${capability.id} runtime script does not exist: ${file}`);
  for (const file of capability.source || []) if (!exists(file)) fail(`${capability.id} source does not exist: ${file}`);
  if (capability.page && !exists(capability.page)) fail(`${capability.id} page does not exist: ${capability.page}`);
  if (capability.mode === 'browser-js' && !capability.invocation) fail(`${capability.id} is browser-js but has no invocation descriptor.`);
}

const merged = new Map();
for (const entry of manifest.resources || []) merged.set(entry.id, entry);
for (const entry of collections.resources || []) merged.set(entry.id, { ...(merged.get(entry.id) || {}), ...entry });

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

console.log(`[foundry-api] validated ${manifest.capabilities.length} capabilities, ${manifest.laboratories.length} laboratories, ${merged.size} top-level resources, and all expandable index children.`);
