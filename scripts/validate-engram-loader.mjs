#!/usr/bin/env node
/**
 * Real WebCrypto + VM smoke and negative tests for the Foundry engram-bound
 * browser context and executable package loaders. No network or browser needed.
 * Run: node scripts/validate-engram-loader.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto, createHash } from 'node:crypto';
import vm from 'node:vm';

const ORIGIN = 'https://foundry.example/HB-TTRPG-tools/';
const fixturePaths = [
  'skills/index.json',
  'docs/blacklight/charles-personality-engram.json',
  'skills/foundry-discovery/SKILL.md',
  'skills/fmpl-asset-production/SKILL.md',
  'skills/module-map-generation/SKILL.md',
  'skills/module-map-generation/manifest.json',
  'skills/module-map-generation/self-test.json',
  'api/foundry-capabilities.json',
  'api/operation-contracts.json'
];
const fixtures = Object.fromEntries(fixturePaths.map(path => [path, readFileSync(path, 'utf8')]));
const index = JSON.parse(fixtures['skills/index.json']);
const rawEngram = fixtures['docs/blacklight/charles-personality-engram.json'];
const expectedEngram = createHash('sha256').update(rawEngram, 'utf8').digest('hex');
const expectedIndex = createHash('sha256').update(fixtures['skills/index.json'], 'utf8').digest('hex');
assert.equal(expectedEngram, index.defaultPersonality.integrity.digest, 'engram lock must be correct');

const contextSource = readFileSync('ai-skill-context-loader.js', 'utf8');
const executableSource = readFileSync('ai-skill-loader.js', 'utf8');
const tests = [];
async function check(name, action) {
  try {
    await action();
    tests.push({ name, passed: true });
  } catch (error) {
    tests.push({ name, passed: false, error: error.stack || String(error) });
  }
}
function makeHost(override = {}, withExecutable = false) {
  const source = { ...fixtures, ...override };
  let reads = [];
  const sandbox = {
    URL, TextEncoder, crypto: webcrypto,
    fetch: async url => {
      const name = new URL(url).pathname.replace('/HB-TTRPG-tools/', '');
      reads.push(name);
      if (!Object.hasOwn(source, name) || source[name] === null) {
        return { ok: false, status: 404 };
      }
      return {
        ok: true, status: 200,
        text: async () => source[name],
        json: async () => JSON.parse(source[name])
      };
    }
  };
  vm.runInNewContext(contextSource, sandbox, { filename: 'ai-skill-context-loader.js' });
  if (withExecutable) vm.runInNewContext(executableSource, sandbox, { filename: 'ai-skill-loader.js' });
  return { client: sandbox.HBFoundrySkillContextLoader, executable: sandbox.HBFoundrySkillLoader, reads, source };
}
const options = { baseUrl: ORIGIN, expectedEngramSha256: expectedEngram, expectedRegistrySha256: expectedIndex };

await check('both trusted pins and real SHA-256 verified', async () => {
  const h = makeHost();
  const r = await h.client.load('foundry-discovery', options);
  assert.equal(r.personality.engram_id, 'blacklight.charles');
  assert.equal(r.externalTrustPinned, true);
  assert.equal(r.engramSha256, expectedEngram);
  assert.equal(r.registrySha256, expectedIndex);
  assert.match(r.skillText, /required-personality-engram: blacklight\.charles/);
});
await check('shared personality object, not only shared fetch', async () => {
  const h = makeHost();
  const first = await h.client.load('foundry-discovery', options);
  const second = await h.client.loadMany(['foundry-discovery', 'fmpl-asset-production'], options);
  const discovery = await h.client.discover(options);
  assert.equal(second.personality, first.personality);
  assert.equal(discovery.personality, first.personality);
  assert.equal(second.skills.length, 2);
  assert.equal(discovery.skills.length, index.skills.length);
  assert.equal(h.reads.filter(name => name.endsWith('charles-personality-engram.json')).length, 1);
});
await check('parallel loads share a single in-flight engram', async () => {
  const h = makeHost();
  const [left, right] = await Promise.all([
    h.client.load('foundry-discovery', options), h.client.load('fmpl-asset-production', options)
  ]);
  assert.equal(left.personality, right.personality);
  assert.equal(h.reads.filter(name => name.endsWith('charles-personality-engram.json')).length, 1);
});
await check('explicit cache clear refreshes engram state', async () => {
  const h = makeHost();
  await h.client.load('foundry-discovery', options);
  h.source['docs/blacklight/charles-personality-engram.json'] = rawEngram + ' ';
  h.client.clearCache();
  await assert.rejects(h.client.load('foundry-discovery', options), /SHA-256 mismatch/);
});
await check('missing engram fails closed', async () => {
  const h = makeHost({ 'docs/blacklight/charles-personality-engram.json': null });
  await assert.rejects(h.client.load('foundry-discovery', options), /Failed to fetch/);
});
await check('tampered engram fails closed', async () => {
  const h = makeHost({ 'docs/blacklight/charles-personality-engram.json': rawEngram + '\n' });
  await assert.rejects(h.client.load('foundry-discovery', options), /SHA-256 mismatch/);
});
await check('wrong externally trusted engram digest fails closed', async () => {
  const h = makeHost();
  await assert.rejects(h.client.load('foundry-discovery', { ...options, expectedEngramSha256: '0'.repeat(64) }), /externally trusted pin/);
});
await check('wrong externally trusted registry digest fails closed', async () => {
  const h = makeHost();
  await assert.rejects(h.client.load('foundry-discovery', { ...options, expectedRegistrySha256: '0'.repeat(64) }), /externally trusted pin/);
  assert.equal(h.reads.some(name => name.endsWith('foundry-discovery/SKILL.md')), false);
});
await check('malformed trusted pin fails rather than being ignored', async () => {
  const h = makeHost();
  await assert.rejects(h.client.load('foundry-discovery', { ...options, expectedEngramSha256: 'not-a-sha' }), /must be an externally trusted/);
});
await check('registry that drops engram requirement fails closed', async () => {
  const broken = structuredClone(index);
  broken.defaultPersonality.required = false;
  const h = makeHost({ 'skills/index.json': JSON.stringify(broken) });
  await assert.rejects(h.client.load('foundry-discovery', { baseUrl: ORIGIN }), /mandatory reciprocal/);
});
await check('registered skill missing reciprocal metadata fails closed', async () => {
  const path = 'skills/foundry-discovery/SKILL.md';
  const h = makeHost({ [path]: fixtures[path].replace('required-skill-index: skills/index.json', 'required-skill-index: skills/evil.json') });
  await assert.rejects(h.client.load('foundry-discovery', options), /lacks mandatory reciprocal/);
});
await check('invalid registry JSON fails closed', async () => {
  const h = makeHost({ 'skills/index.json': 'invalid-json' });
  await assert.rejects(h.client.discover({ baseUrl: ORIGIN }), /registry is not valid JSON/);
});
await check('cross-origin and traversal attempts are rejected', async () => {
  const h = makeHost();
  assert.throws(() => h.client.resolveFirstPartyUrl('https://outside.example/skill', ORIGIN), /Cross-origin/);
  assert.throws(() => h.client.resolveFirstPartyUrl('../outside', ORIGIN), /escaped the Foundry/);
});
await check('executable inspector obeys trusted context before runtime', async () => {
  const h = makeHost({}, true);
  const inspected = await h.executable.inspect('module-map-generation', options);
  assert.equal(inspected.boundContext.externalTrustPinned, true);
  assert.equal(inspected.boundContext.engramSha256, expectedEngram);
  assert.equal(inspected.skill.name, 'module-map-generation');
  assert.equal(h.reads.filter(name => name === 'skills/index.json').length, 1, 'inspector must reuse one verified index, not refetch mutable index');
});
await check('executable loader refuses mismatched engram without loading scripts', async () => {
  const h = makeHost({ 'docs/blacklight/charles-personality-engram.json': rawEngram + ' ' }, true);
  const report = await h.executable.loadAndTest('module-map-generation', options);
  assert.equal(report.ready, false);
  assert.match(report.error, /SHA-256 mismatch/);
  assert.equal(h.reads.some(name => name.endsWith('module-map-generator.js')), false);
});

for (const test of tests) {
  console.log((test.passed ? 'PASS' : 'FAIL') + ' [engram-loader] ' + test.name);
  if (!test.passed) console.error(test.error);
}
if (tests.some(test => !test.passed)) process.exitCode = 1;
else console.log('[engram-loader] ' + tests.length + ' checks passed (real Node WebCrypto, no network or runtime simulation).');
