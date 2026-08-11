#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const logDirectory = path.join(repositoryRoot, 'binary-cube-v12-complete-logs');
fs.mkdirSync(logDirectory, { recursive: true });

const checks = Object.freeze([
  ['v0-baseline', 'node', ['scripts/validate-binary-cube-baseline.mjs']],
  ['v2-trace', 'node', ['scripts/validate-binary-cube-trace.mjs']],
  ['v4-shell', 'node', ['scripts/validate-binary-cube-visualizer-shell.mjs']],
  ['v4-browser', 'node', ['scripts/validate-binary-cube-visualizer-browser.mjs']],
  ['v5-static', 'node', ['scripts/validate-binary-cube-visualizer-step.mjs']],
  ['v5-browser', 'node', ['scripts/validate-binary-cube-visualizer-step-browser.mjs']],
  ['v6-static', 'node', ['scripts/validate-binary-cube-visualizer-animation.mjs']],
  ['serial-demonstration', 'node', ['scripts/validate-binary-cube-serial-demonstration.mjs']],
  ['serial-demonstration-browser', 'node', ['scripts/validate-binary-cube-serial-demonstration-browser.mjs']],
  ['v6-browser', 'node', ['scripts/validate-binary-cube-visualizer-animation-browser.mjs']],
  ['v7-static', 'node', ['scripts/validate-binary-cube-visualizer-encoder.mjs']],
  ['v7-browser', 'node', ['scripts/validate-binary-cube-visualizer-encoder-browser.mjs']],
  ['v8-static', 'node', ['scripts/validate-binary-cube-visualizer-sequencing.mjs']],
  ['v8-browser', 'node', ['scripts/validate-binary-cube-visualizer-sequencing-browser.mjs']],
  ['v9-static', 'node', ['scripts/validate-binary-cube-visualizer-performance.mjs']],
  ['v9-measurements', 'node', ['scripts/measure-binary-cube-visualizer-performance.mjs']],
  ['v9-browser', 'node', ['scripts/validate-binary-cube-visualizer-performance-browser.mjs']],
  ['v10-static', 'node', ['scripts/validate-binary-cube-visualizer-accessibility.mjs']],
  ['v10-browser-and-fallback', 'node', ['scripts/validate-binary-cube-visualizer-accessibility-browser.mjs']],
  ['v11-static', 'node', ['scripts/validate-binary-cube-visualizer-compatibility.mjs']],
  ['v11-browser', 'node', ['scripts/validate-binary-cube-visualizer-compatibility-browser.mjs']],
  ['desktop-smoke', 'node', ['desktop/binary-cube/tests/smoke.cjs']],
  ['v12-lifecycle-contracts', 'node', ['scripts/validate-binary-cube-visualizer-lifecycle.mjs']],
  ['v12-failure-paths', 'node', ['scripts/validate-binary-cube-visualizer-failure-paths.mjs']],
  ['v12-lifecycle-browser', 'node', ['scripts/validate-binary-cube-visualizer-lifecycle-browser.mjs']],
  ['v12-stale-work-browser', 'node', ['scripts/validate-binary-cube-visualizer-stale-work-browser.mjs']]
]);

function pause(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

const startedAt = Date.now();
const results = [];
for (const [id, command, args] of checks) {
  const checkStartedAt = Date.now();
  const maximumAttempts = id.includes('browser') ? 2 : 1;
  let result = null;
  let output = '';
  let attempts = 0;
  console.log(`\n===== ${id} =====`);
  while (attempts < maximumAttempts) {
    attempts += 1;
    if (maximumAttempts > 1) console.log(`--- ${id} attempt ${attempts}/${maximumAttempts} ---`);
    result = spawnSync(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    });
    const attemptOutput = `${result.stdout || ''}${result.stderr || ''}`;
    output += `${maximumAttempts > 1 ? `--- attempt ${attempts} ---\n` : ''}${attemptOutput}`;
    process.stdout.write(attemptOutput);
    if (result.status === 0 || attempts >= maximumAttempts) break;
    console.warn(`${id} attempt ${attempts} failed; retrying once in a fresh process.`);
    pause(750);
  }
  fs.writeFileSync(path.join(logDirectory, `${id}.log`), output || '(no output)\n');
  results.push(Object.freeze({
    id,
    command: [command, ...args].join(' '),
    attempts,
    status: result?.status ?? 1,
    signal: result?.signal || null,
    milliseconds: Date.now() - checkStartedAt,
    passed: result?.status === 0
  }));
}

const failures = results.filter(result => !result.passed);
const receipt = Object.freeze({
  format: 'hb-ttrpg-shadowrun-binary-cube-v12-complete-milestone-receipt',
  schemaVersion: '0.1.0',
  pass: failures.length === 0,
  checkCount: results.length,
  passedCount: results.length - failures.length,
  failedCount: failures.length,
  retriedCheckCount: results.filter(result => result.attempts > 1).length,
  milliseconds: Date.now() - startedAt,
  results
});
fs.writeFileSync(path.join(logDirectory, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`\n${JSON.stringify(receipt, null, 2)}`);

if (failures.length) {
  console.error(`Binary Cube V12 complete milestone failures: ${failures.map(result => result.id).join(', ')}`);
  process.exitCode = 1;
}
