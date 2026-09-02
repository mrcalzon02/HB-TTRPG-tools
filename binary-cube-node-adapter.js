#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CAPABILITY_ID = 'shadowrun.binary-cube';
const SKILL_ID = 'binary-cube-laboratory';
const SECURITY_CLASSIFICATION = 'experimental-ttrpg-obfuscation-not-production-cryptography';

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

const engine = require(path.join(ROOT, 'shadowrun-binary-cube-engine.js'));
const capabilityRegistry = loadJson('api/foundry-capabilities.json');
const capability = (capabilityRegistry.capabilities || []).find(item => item && item.id === CAPABILITY_ID);
if (!capability) throw new Error(`Capability ${CAPABILITY_ID} is missing from api/foundry-capabilities.json.`);

const allowedOperations = Object.freeze([...(capability.invocation?.allowedOperations || [])]);
if (!allowedOperations.length) throw new Error(`Capability ${CAPABILITY_ID} declares no allowed operations.`);

function describe() {
  return {
    adapter: 'binary-cube-node-adapter',
    schemaVersion: '1.0.0',
    skill: SKILL_ID,
    capabilityId: CAPABILITY_ID,
    runtime: 'node-commonjs',
    enginePath: 'shadowrun-binary-cube-engine.js',
    contractAuthority: 'api/operation-contracts.json',
    capabilityAuthority: 'api/foundry-capabilities.json',
    securityClassification: SECURITY_CLASSIFICATION,
    productionCryptography: false,
    allowedOperations: [...allowedOperations],
    requestShape: { operation: 'string', args: 'array (optional; defaults to [])' },
    responseShape: { ok: 'boolean', capabilityId: CAPABILITY_ID, operation: 'string', result: 'canonical engine result' }
  };
}

function invoke(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new Error('A request object is required.');
  }
  const operation = String(request.operation || '');
  if (!allowedOperations.includes(operation)) {
    throw new Error(`Operation ${operation || '(missing)'} is not allowed for ${CAPABILITY_ID}.`);
  }
  const args = request.args === undefined ? [] : request.args;
  if (!Array.isArray(args)) throw new Error('request.args must be an array when provided.');
  const fn = engine[operation];
  if (typeof fn !== 'function') throw new Error(`Canonical engine does not export declared operation ${operation}.`);
  return { ok: true, capabilityId: CAPABILITY_ID, operation, result: fn(...args) };
}

function resolveFixture(value, fixtures) {
  if (Array.isArray(value)) return value.map(item => resolveFixture(item, fixtures));
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '$fixture')) {
      const name = String(value.$fixture);
      if (!Object.prototype.hasOwnProperty.call(fixtures, name)) throw new Error(`Unknown self-test fixture ${name}.`);
      return fixtures[name];
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveFixture(item, fixtures)]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(value);
}

function runSelfTest() {
  const spec = loadJson('skills/binary-cube-laboratory/self-test.json');
  if (spec.capabilityId !== CAPABILITY_ID) throw new Error(`Self-test capability mismatch: ${spec.capabilityId}.`);
  const fixtures = spec.fixtures || {};
  const results = [];

  for (const test of spec.tests || []) {
    const args = resolveFixture(test.args || [], fixtures);
    let actual;
    let thrown = null;
    try {
      actual = invoke({ operation: test.operation, args }).result;
    } catch (error) {
      thrown = error;
    }

    const expectation = test.expect || {};
    let passed = true;
    let reason = 'passed';
    if (expectation.throws) {
      passed = Boolean(thrown);
      if (passed && expectation.messageIncludes) passed = String(thrown.message).includes(expectation.messageIncludes);
      if (!passed) reason = thrown ? `unexpected error: ${thrown.message}` : 'expected operation to throw';
    } else if (thrown) {
      passed = false;
      reason = thrown.message;
    } else if (Object.prototype.hasOwnProperty.call(expectation, 'equals')) {
      passed = actual === expectation.equals;
      if (!passed) reason = 'value did not equal expected literal';
    } else if (expectation.equalsFixture) {
      passed = actual === fixtures[expectation.equalsFixture];
      if (!passed) reason = `value did not equal fixture ${expectation.equalsFixture}`;
    } else if (expectation.deepEqualsFixture) {
      passed = stableJson(actual) === stableJson(fixtures[expectation.deepEqualsFixture]);
      if (!passed) reason = `value did not deep-equal fixture ${expectation.deepEqualsFixture}`;
    }

    results.push({ id: test.id, operation: test.operation, passed, reason });
  }

  const passed = results.length > 0 && results.every(result => result.passed);
  return {
    ok: passed,
    capabilityId: CAPABILITY_ID,
    skill: SKILL_ID,
    runtime: 'node-commonjs',
    testCount: results.length,
    passedCount: results.filter(result => result.passed).length,
    failedCount: results.filter(result => !result.passed).length,
    results
  };
}

function readRequestArgument(argument) {
  if (argument) return argument;
  if (process.stdin.isTTY) throw new Error('Invoke requires a JSON request argument or JSON on stdin.');
  return fs.readFileSync(0, 'utf8');
}

function writeJson(value, stream = process.stdout) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'describe';
  if (command === 'describe' || command === '--describe' || command === '--help' || command === '-h') {
    writeJson(describe());
    return 0;
  }
  if (command === 'self-test' || command === '--self-test') {
    const report = runSelfTest();
    writeJson(report);
    return report.ok ? 0 : 1;
  }
  if (command === 'invoke') {
    const request = JSON.parse(readRequestArgument(argv[1]));
    writeJson(invoke(request));
    return 0;
  }
  throw new Error(`Unknown command ${command}. Use describe, self-test, or invoke.`);
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    writeJson({ ok: false, capabilityId: CAPABILITY_ID, error: { name: error.name, message: error.message } }, process.stderr);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  CAPABILITY_ID,
  SKILL_ID,
  describe,
  invoke,
  runSelfTest,
  engine
});
