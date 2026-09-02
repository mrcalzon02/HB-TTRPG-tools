#!/usr/bin/env node
'use strict';

const adapter = require('./binary-cube-node-adapter.js');
const validator = require('./binary-cube-three-state-validator.js');
const testPackages = require('./skills/binary-cube-laboratory/test-packages.json');
const toolProjection = require('./skills/binary-cube-laboratory/tool-projection.json');

const TOOL_BY_METHOD = new Map((toolProjection.tools || []).map(tool => [tool.binding && tool.binding.method, tool]));

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  return value;
}

function equal(left, right) {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function toolCall(method, input) {
  const tool = TOOL_BY_METHOD.get(method);
  if (!tool) throw new Error(`Tool projection does not expose adapter method ${method}.`);
  const fn = adapter[method];
  if (typeof fn !== 'function') throw new Error(`Adapter does not export projected method ${method}.`);
  if (tool.binding.requestObject) return fn(input || {});
  if (Array.isArray(tool.binding.arguments)) return fn(...tool.binding.arguments.map(name => (input || {})[name]));
  return fn();
}

function runParity(options = {}) {
  const bits = String(options.bits || '010011000110000101100010').replace(/\s+/g, '');
  const keyOptions = options.keyOptions || {
    gridSize: 4,
    seed: 'parity-runner-v2',
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0,
    maskDensity: 0.75
  };
  const checks = [];
  const record = (id, passed, detail) => checks.push({ id, passed: Boolean(passed), detail });

  const selfTest = adapter.runSelfTest();
  record('node-self-test', selfTest.ok, `${selfTest.passedCount}/${selfTest.testCount} deterministic tests passed`);

  const described = adapter.describe();
  record('tool-describe-parity', equal(described, toolCall('describe')), 'Tool projection describe matches direct adapter describe');

  const operations = adapter.listOperations();
  record('tool-operation-list-parity', equal(operations, toolCall('listOperations')), `${operations.length} operation contracts match`);

  const missingContracts = described.allowedOperations.filter(name => {
    try { adapter.operationContract(name); return false; } catch (_) { return true; }
  });
  record('operation-contract-coverage', missingContracts.length === 0, missingContracts.length ? `Missing: ${missingContracts.join(', ')}` : 'Every allowed operation has a canonical contract');

  const directEncrypt = adapter.encryptWorkflow({ bits, keyOptions });
  const toolEncrypt = toolCall('encryptWorkflow', { bits, key: directEncrypt.key });
  record('encrypt-workflow-parity', equal(directEncrypt.package, toolEncrypt.package), 'Direct adapter and structured-tool binding produced the same package with the same key');

  const directDecrypt = adapter.decryptWorkflow({ package: directEncrypt.package, key: directEncrypt.key });
  const toolDecrypt = toolCall('decryptWorkflow', { package: directEncrypt.package, key: directEncrypt.key });
  record('decrypt-workflow-parity', directDecrypt.bits === bits && toolDecrypt.bits === bits && directDecrypt.bits === toolDecrypt.bits, 'Direct adapter and structured-tool binding recovered identical input bits');

  const threeState = validator.runSuite(testPackages);
  record('three-state-validation-suite', threeState.ok, `${threeState.positivePassed}/${threeState.positiveCaseCount} positive packages and ${threeState.negativePassed}/${threeState.negativeCaseCount} validator-error packages passed; ${threeState.weaknessCount} scrambling warnings observed`);

  const projectedMethods = (toolProjection.tools || []).map(tool => tool.binding && tool.binding.method).filter(Boolean);
  const missingBindings = projectedMethods.filter(method => typeof adapter[method] !== 'function');
  record('tool-binding-coverage', missingBindings.length === 0, missingBindings.length ? `Missing adapter exports: ${missingBindings.join(', ')}` : `${projectedMethods.length} projected methods resolve to adapter exports`);

  const failed = checks.filter(check => !check.passed);
  return {
    ok: failed.length === 0,
    schemaVersion: '1.1.0',
    capabilityId: adapter.CAPABILITY_ID,
    runtime: 'node-commonjs',
    surfaces: ['canonical-engine-via-adapter', 'node-api', 'structured-tool-projection', 'three-state-validation-protocol'],
    browserParity: {
      status: 'runtime-required',
      reason: 'This headless runner verifies shared contracts and Node/tool execution. Browser UI parity requires execution of the same validator in a browser host.'
    },
    inputBits: bits.length,
    checkCount: checks.length,
    passedCount: checks.length - failed.length,
    failedCount: failed.length,
    checks,
    threeStateSummary: {
      ok: threeState.ok,
      positiveCaseCount: threeState.positiveCaseCount,
      positivePassed: threeState.positivePassed,
      negativeCaseCount: threeState.negativeCaseCount,
      negativePassed: threeState.negativePassed,
      weaknessCount: threeState.weaknessCount,
      weaknessFindings: threeState.weaknessFindings
    }
  };
}

function main() {
  const report = runParity();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.ok ? 0 : 1;
}

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: { name: error.name, message: error.message } }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({ runParity });
