#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const CAPABILITY_ID = 'shadowrun.binary-cube';
const SKILL_ID = 'binary-cube-laboratory';
const SECURITY_CLASSIFICATION = 'experimental-ttrpg-obfuscation-not-production-cryptography';

function loadJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
const engine = require(path.join(ROOT, 'shadowrun-binary-cube-engine.js'));
const threeStateValidator = require(path.join(ROOT, 'binary-cube-three-state-validator.js'));
const capabilityRegistry = loadJson('api/foundry-capabilities.json');
const operationRegistry = loadJson('api/operation-contracts.json');
const testPackages = loadJson('skills/binary-cube-laboratory/test-packages.json');
const capability = (capabilityRegistry.capabilities || []).find(item => item && item.id === CAPABILITY_ID);
if (!capability) throw new Error(`Capability ${CAPABILITY_ID} is missing from api/foundry-capabilities.json.`);
const allowedOperations = Object.freeze([...(capability.invocation?.allowedOperations || [])]);
if (!allowedOperations.length) throw new Error(`Capability ${CAPABILITY_ID} declares no allowed operations.`);
const capabilityContracts = operationRegistry.capabilities?.[CAPABILITY_ID];
if (!capabilityContracts || capabilityContracts.callStyle !== 'dispatcher' || !capabilityContracts.operations) throw new Error(`Capability ${CAPABILITY_ID} is missing dispatcher contracts from api/operation-contracts.json.`);

function operationContract(operation) {
  const name = String(operation || '');
  if (!allowedOperations.includes(name)) throw new Error(`Operation ${name || '(missing)'} is not allowed for ${CAPABILITY_ID}.`);
  const contract = capabilityContracts.operations[name];
  if (!contract) throw new Error(`Operation ${name} is allowed but has no canonical operation contract.`);
  return deepClone({ operation: name, ...contract });
}
function listOperations() { return allowedOperations.map(operation => operationContract(operation)); }
function listTestPackages() {
  return {
    protocolId: testPackages.protocolId,
    positiveCases: (testPackages.positiveCases || []).map(testCase => ({ id: testCase.id, description: testCase.description, keyOptions: deepClone(testCase.keyOptions) })),
    negativeCases: (testPackages.negativeCases || []).map(testCase => ({ id: testCase.id, stage: testCase.stage, description: testCase.description, baseCaseId: testCase.baseCaseId || null, mutation: deepClone(testCase.mutation || null) }))
  };
}
function findPositiveTestCase(testId) {
  const testCase = (testPackages.positiveCases || []).find(item => item.id === testId);
  if (!testCase) throw new Error(`Unknown Binary Cube positive test package: ${testId}.`);
  return deepClone(testCase);
}
function runThreeStateValidation(request = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Three-state validation requires a request object.');
  if (request.case) return threeStateValidator.runCase(deepClone(request.case));
  if (request.testId) return threeStateValidator.runCase(findPositiveTestCase(String(request.testId)));
  return threeStateValidator.runSuite(testPackages);
}
function describe() {
  return {
    adapter: 'binary-cube-node-adapter', schemaVersion: '1.3.0', skill: SKILL_ID, capabilityId: CAPABILITY_ID,
    runtime: 'node-commonjs', enginePath: 'shadowrun-binary-cube-engine.js', contractAuthority: 'api/operation-contracts.json',
    capabilityAuthority: 'api/foundry-capabilities.json', securityClassification: SECURITY_CLASSIFICATION, productionCryptography: false,
    allowedOperations: [...allowedOperations],
    workflows: {
      encrypt: 'Create or accept a key and encrypt a binary payload in one call.',
      decrypt: 'Decrypt a canonical package with its separate key in one call.',
      threeStateValidation: 'Capture and validate pre-encryption, encrypted/scrambled, and recovered states; run positive and validator-error package suites.'
    },
    discovery: {
      listOperations: 'Returns every allowed operation with its canonical argument and return contract.',
      operationContract: 'Returns one canonical operation contract by name.',
      listTestPackages: 'Lists deterministic positive packages and negative validator-layer packages.'
    },
    validationProtocol: { id: testPackages.protocolId, packageCatalog: 'skills/binary-cube-laboratory/test-packages.json', validator: 'binary-cube-three-state-validator.js' },
    requestShape: { operation: 'string', args: 'array (optional; defaults to [])' },
    responseShape: { ok: 'boolean', capabilityId: CAPABILITY_ID, operation: 'string', result: 'canonical engine result' }
  };
}
function invoke(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('A request object is required.');
  const operation = String(request.operation || ''); operationContract(operation);
  const args = request.args === undefined ? [] : request.args;
  if (!Array.isArray(args)) throw new Error('request.args must be an array when provided.');
  const fn = engine[operation];
  if (typeof fn !== 'function') throw new Error(`Canonical engine does not export declared operation ${operation}.`);
  return { ok: true, capabilityId: CAPABILITY_ID, operation, result: fn(...args) };
}
function encryptWorkflow(request = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Encrypt workflow requires a request object.');
  const bits = String(request.bits ?? '').replace(/\s+/g, '');
  if (!/^[01]+$/.test(bits)) throw new Error('Encrypt workflow bits must contain only 0 and 1 after whitespace removal.');
  const key = request.key || invoke({ operation: 'createKey', args: [request.keyOptions || {}] }).result;
  invoke({ operation: 'validateKey', args: [key] });
  const packageObject = invoke({ operation: 'encryptBinary', args: [bits, key] }).result;
  invoke({ operation: 'validatePackage', args: [packageObject, key] });
  return { ok: true, workflow: 'encrypt', capabilityId: CAPABILITY_ID, key, package: packageObject, inputBits: bits.length };
}
function decryptWorkflow(request = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Decrypt workflow requires a request object.');
  if (!request.package || !request.key) throw new Error('Decrypt workflow requires package and key.');
  invoke({ operation: 'validateKey', args: [request.key] });
  invoke({ operation: 'validatePackage', args: [request.package, request.key] });
  const bits = invoke({ operation: 'decryptBinary', args: [request.package, request.key] }).result;
  return { ok: true, workflow: 'decrypt', capabilityId: CAPABILITY_ID, bits, outputBits: String(bits).length };
}
function resolveFixture(value, fixtures) {
  if (Array.isArray(value)) return value.map(item => resolveFixture(item, fixtures));
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '$fixture')) { const name = String(value.$fixture); if (!Object.prototype.hasOwnProperty.call(fixtures, name)) throw new Error(`Unknown self-test fixture ${name}.`); return fixtures[name]; }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveFixture(item, fixtures)]));
  }
  return value;
}
function stableJson(value) { return JSON.stringify(value); }
function runSelfTest() {
  const spec = loadJson('skills/binary-cube-laboratory/self-test.json');
  if (spec.capabilityId !== CAPABILITY_ID) throw new Error(`Self-test capability mismatch: ${spec.capabilityId}.`);
  const fixtures = spec.fixtures || {}; const results = [];
  for (const test of spec.tests || []) {
    const args = resolveFixture(test.args || [], fixtures); let actual; let thrown = null;
    try { actual = invoke({ operation: test.operation, args }).result; } catch (error) { thrown = error; }
    const expectation = test.expect || {}; let passed = true; let reason = 'passed';
    if (expectation.throws) { passed = Boolean(thrown); if (passed && expectation.messageIncludes) passed = String(thrown.message).includes(expectation.messageIncludes); if (!passed) reason = thrown ? `unexpected error: ${thrown.message}` : 'expected operation to throw'; }
    else if (thrown) { passed = false; reason = thrown.message; }
    else if (Object.prototype.hasOwnProperty.call(expectation, 'equals')) { passed = actual === expectation.equals; if (!passed) reason = 'value did not equal expected literal'; }
    else if (expectation.equalsFixture) { passed = actual === fixtures[expectation.equalsFixture]; if (!passed) reason = `value did not equal fixture ${expectation.equalsFixture}`; }
    else if (expectation.deepEqualsFixture) { passed = stableJson(actual) === stableJson(fixtures[expectation.deepEqualsFixture]); if (!passed) reason = `value did not deep-equal fixture ${expectation.deepEqualsFixture}`; }
    results.push({ id: test.id, operation: test.operation, passed, reason });
  }
  const passed = results.length > 0 && results.every(result => result.passed);
  return { ok: passed, capabilityId: CAPABILITY_ID, skill: SKILL_ID, runtime: 'node-commonjs', testCount: results.length, passedCount: results.filter(r => r.passed).length, failedCount: results.filter(r => !r.passed).length, results };
}
function readRequestArgument(argument) { if (argument) return argument; if (process.stdin.isTTY) throw new Error('Command requires a JSON request argument or JSON on stdin.'); return fs.readFileSync(0, 'utf8'); }
function writeJson(value, stream = process.stdout) { stream.write(`${JSON.stringify(value, null, 2)}\n`); }
function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'describe';
  if (command === 'describe' || command === '--describe' || command === '--help' || command === '-h') { writeJson(describe()); return 0; }
  if (command === 'operations' || command === 'list-operations') { writeJson({ capabilityId: CAPABILITY_ID, operations: listOperations() }); return 0; }
  if (command === 'contract') { writeJson(operationContract(argv[1])); return 0; }
  if (command === 'test-packages') { writeJson(listTestPackages()); return 0; }
  if (command === 'validation-suite') { const report = runThreeStateValidation({}); writeJson(report); return report.ok ? 0 : 1; }
  if (command === 'validate-test') { const request = argv[1] ? JSON.parse(argv[1]) : { testId: argv[2] }; const report = runThreeStateValidation(request); writeJson(report); return report.ok ? 0 : 1; }
  if (command === 'self-test' || command === '--self-test') { const report = runSelfTest(); writeJson(report); return report.ok ? 0 : 1; }
  if (command === 'invoke') { writeJson(invoke(JSON.parse(readRequestArgument(argv[1])))); return 0; }
  if (command === 'encrypt') { writeJson(encryptWorkflow(JSON.parse(readRequestArgument(argv[1])))); return 0; }
  if (command === 'decrypt') { writeJson(decryptWorkflow(JSON.parse(readRequestArgument(argv[1])))); return 0; }
  throw new Error(`Unknown command ${command}. Use describe, operations, contract <operation>, test-packages, validation-suite, validate-test, self-test, invoke, encrypt, or decrypt.`);
}
if (require.main === module) { try { process.exitCode = main(); } catch (error) { writeJson({ ok: false, capabilityId: CAPABILITY_ID, error: { name: error.name, message: error.message } }, process.stderr); process.exitCode = 1; } }
module.exports = Object.freeze({ CAPABILITY_ID, SKILL_ID, describe, listOperations, operationContract, listTestPackages, runThreeStateValidation, invoke, encryptWorkflow, decryptWorkflow, runSelfTest, engine, threeStateValidator });
