#!/usr/bin/env node
'use strict';

const adapter = require('./binary-cube-node-adapter.js');
const validator = require('./binary-cube-three-state-validator.js');
const strengthAnalysis = require('./binary-cube-strength-analysis.js');
const testPackages = require('./skills/binary-cube-laboratory/test-packages.json');
const toolProjection = require('./skills/binary-cube-laboratory/tool-projection.json');

const MODULES = Object.freeze({
  'binary-cube-node-adapter.js': adapter,
  'binary-cube-strength-analysis.js': strengthAnalysis
});
const TOOL_BY_METHOD = new Map((toolProjection.tools || []).map(tool => [tool.binding && tool.binding.method, tool]));

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  return value;
}

function equal(left, right) {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function bindingTarget(tool) {
  const moduleName = tool?.binding?.module || 'binary-cube-node-adapter.js';
  const target = MODULES[moduleName];
  if (!target) throw new Error(`Tool projection references unapproved local module ${moduleName}.`);
  return { moduleName, target };
}

function toolCall(method, input) {
  const tool = TOOL_BY_METHOD.get(method);
  if (!tool) throw new Error(`Tool projection does not expose method ${method}.`);
  const { moduleName, target } = bindingTarget(tool);
  const fn = target[method];
  if (typeof fn !== 'function') throw new Error(`Projected module ${moduleName} does not export method ${method}.`);
  if (tool.binding.requestObject) return fn(input || {});
  if (Array.isArray(tool.binding.arguments)) return fn(...tool.binding.arguments.map(name => (input || {})[name]));
  return fn();
}

function runParity(options = {}) {
  const bits = String(options.bits || '010011000110000101100010').replace(/\s+/g, '');
  const keyOptions = options.keyOptions || {
    gridSize: 4,
    seed: 'parity-runner-v3',
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0,
    maskDensity: 0.75
  };
  const maskOptions = options.maskOptions || {
    method: 'white-noise',
    seed: 'parity-runner-mask-v1',
    fieldWidth: 8,
    intensity: 0.5
  };
  const checks = [];
  const record = (id, passed, detail) => checks.push({ id, passed: Boolean(passed), detail });

  const selfTest = adapter.runSelfTest();
  record('node-self-test', selfTest.ok, `${selfTest.passedCount}/${selfTest.testCount} deterministic cube tests passed`);

  const maskSelfTest = adapter.runPreEntryMaskSelfTest();
  record('pre-entry-mask-self-test', maskSelfTest.ok, `${maskSelfTest.passedCount}/${maskSelfTest.testCount} reversible mask methods passed`);

  const described = adapter.describe();
  record('tool-describe-parity', equal(described, toolCall('describe')), 'Tool projection describe matches direct adapter describe');

  const operations = adapter.listOperations();
  record('tool-operation-list-parity', equal(operations, toolCall('listOperations')), `${operations.length} operation contracts match`);

  const maskMethods = adapter.listPreEntryMaskMethods();
  record('tool-mask-list-parity', equal(maskMethods, toolCall('listPreEntryMaskMethods')), `${maskMethods.length} pre-entry mask methods match`);

  const missingContracts = described.allowedOperations.filter(name => {
    try { adapter.operationContract(name); return false; } catch (_) { return true; }
  });
  record('operation-contract-coverage', missingContracts.length === 0, missingContracts.length ? `Missing: ${missingContracts.join(', ')}` : 'Every allowed cube operation has a canonical contract');

  const directEncrypt = adapter.encryptWorkflow({ bits, keyOptions });
  const toolEncrypt = toolCall('encryptWorkflow', { bits, key: directEncrypt.key });
  record('encrypt-workflow-parity', equal(directEncrypt.package, toolEncrypt.package), 'Direct adapter and structured-tool binding produced the same package with the same key');

  const directDecrypt = adapter.decryptWorkflow({ package: directEncrypt.package, key: directEncrypt.key });
  const toolDecrypt = toolCall('decryptWorkflow', { package: directEncrypt.package, key: directEncrypt.key });
  record('decrypt-workflow-parity', directDecrypt.bits === bits && toolDecrypt.bits === bits && directDecrypt.bits === toolDecrypt.bits, 'Direct adapter and structured-tool binding recovered identical input bits');

  const directMasked = adapter.maskedEncryptWorkflow({ bits, keyOptions, maskOptions });
  const toolMasked = toolCall('maskedEncryptWorkflow', { bits, key: directMasked.key, maskOptions });
  record('masked-encrypt-workflow-parity', equal(directMasked.package, toolMasked.package) && equal(directMasked.preEntryMask, toolMasked.preEntryMask), 'Direct adapter and structured-tool binding produced identical masked package and recovery descriptor');

  const directMaskedDecrypt = adapter.maskedDecryptWorkflow({ package: directMasked.package, key: directMasked.key, preEntryMask: directMasked.preEntryMask });
  const toolMaskedDecrypt = toolCall('maskedDecryptWorkflow', { package: directMasked.package, key: directMasked.key, preEntryMask: directMasked.preEntryMask });
  record('masked-decrypt-workflow-parity', directMaskedDecrypt.bits === bits && toolMaskedDecrypt.bits === bits, 'Direct adapter and structured-tool binding recovered identical original bits after cube decrypt and unmask');

  const threeState = validator.runSuite(testPackages);
  record('three-state-validation-suite', threeState.ok, `${threeState.positivePassed}/${threeState.positiveCaseCount} positive packages and ${threeState.negativePassed}/${threeState.negativeCaseCount} validator-error packages passed; ${threeState.weaknessCount} scrambling warnings observed`);

  const strengthRequest = { bits, keyOptions, maxPlaintextBitFlips: Math.min(8, bits.length) };
  const directStrength = strengthAnalysis.runPerturbationAnalysis(strengthRequest);
  const toolStrength = toolCall('runPerturbationAnalysis', strengthRequest);
  record('strength-analysis-tool-parity', equal(directStrength, toolStrength), 'Strength-analysis tool binding matches direct analysis module output');

  const projectedBindings = (toolProjection.tools || []).map(tool => {
    try {
      const { moduleName, target } = bindingTarget(tool);
      return { tool: tool.name, module: moduleName, method: tool.binding?.method, resolved: typeof target[tool.binding?.method] === 'function' };
    } catch (error) {
      return { tool: tool.name, module: tool.binding?.module || null, method: tool.binding?.method || null, resolved: false, error: error.message };
    }
  });
  const missingBindings = projectedBindings.filter(binding => !binding.resolved);
  record('tool-binding-coverage', missingBindings.length === 0, missingBindings.length ? `Unresolved: ${missingBindings.map(item => `${item.module}:${item.method}`).join(', ')}` : `${projectedBindings.length} projected tool bindings resolve to approved local modules`);

  const failed = checks.filter(check => !check.passed);
  return {
    ok: failed.length === 0,
    schemaVersion: '1.2.0',
    capabilityId: adapter.CAPABILITY_ID,
    runtime: 'node-commonjs',
    surfaces: ['canonical-engine-via-adapter', 'node-api', 'structured-tool-projection', 'pre-entry-mask-layer', 'three-state-validation-protocol', 'strength-analysis'],
    browserParity: {
      status: 'runtime-required',
      reason: 'This headless runner verifies shared contracts and Node/tool execution. Browser UI parity requires execution of the same modules in a browser host.'
    },
    inputBits: bits.length,
    checkCount: checks.length,
    passedCount: checks.length - failed.length,
    failedCount: failed.length,
    checks,
    projectedBindings,
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
