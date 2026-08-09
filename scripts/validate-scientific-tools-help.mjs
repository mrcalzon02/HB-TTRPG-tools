#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Help = require(path.join(root, 'scientific-tools-help.js'));
const source = fs.readFileSync(path.join(root, 'scientific-tools-help.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'scientific-tools-help.css'), 'utf8');

assert.equal(Help.version, '0.1.0');
const requiredPanels = [
  'shadowrun-binary-cube-lab',
  'shadowrun-binary-cube-visualizer',
  'binary-cube-key-generation-visualizer',
  'binary-cube-decryption-dashboard',
  'binary-cube-cryptanalytic-test-lab',
  'binary-cube-information-analysis-suite',
  'binary-cube-communication-capacity-analyzer',
  'binary-cube-media-forensics-suite',
  'binary-cube-steganalysis-lab',
  'binary-cube-diagnostic-pipeline-panel',
  'binary-cube-cubic-decryptor',
  'signals-laboratory'
];
for (const panelId of requiredPanels) {
  assert.ok(Help.guides[panelId], `Shared help registry is missing ${panelId}.`);
  assert.ok(Help.guides[panelId].summary.length > 120, `${panelId} guide summary is too shallow.`);
  assert.ok(Help.guides[panelId].workflow.length >= 5, `${panelId} guide needs a complete workflow.`);
  assert.ok(Help.guides[panelId].outputs.length >= 4, `${panelId} guide needs output interpretation.`);
  assert.ok(Help.guides[panelId].boundary.length > 80, `${panelId} guide needs an evidence boundary.`);
}

for (const required of [
  'Help · How this tool works',
  'Recommended workflow',
  'What the outputs mean',
  'Evidence boundary',
  'role="tooltip"',
  'aria-describedby',
  'MutationObserver',
  'decorateSections(',
  'decorateControls(',
  'sth-section-callout',
  'WebGPU acceleration',
  'CPU-equivalent path',
  'Plan ID',
  'RS steganalysis',
  'Sample Pair Analysis',
  'bit-plane',
  'known-plaintext',
  'calibration provenance'
]) assert.ok(source.includes(required), `Shared help runtime is missing ${JSON.stringify(required)}.`);

assert.match(Help.helpForText('WebGPU acceleration'), /parity|CPU/i);
assert.match(Help.helpForText('Parallel workers'), /deterministic ordinal/i);
assert.match(Help.helpForText('RS'), /regular\/singular|LSB/i);
assert.match(Help.helpForText('Sample Pair Analysis'), /LSB embedding rate/i);
assert.match(Help.helpForText('Attempt budget'), /checkpoint/i);
assert.match(Help.sectionHelpFor('Known plaintext / crib pruning'), /conditional|correct/i);
assert.match(Help.sectionHelpFor('Batch / Evaluation'), /ground truth|ROC/i);

for (const required of [
  '.sth-tool-guide',
  '.sth-tooltip-bubble',
  '.sth-section-callout',
  ':focus',
  '@media (max-width:900px)',
  'prefers-reduced-motion'
]) assert.ok(css.includes(required), `Shared help stylesheet is missing ${required}.`);
assert.ok(css.length > 2500, 'Shared help stylesheet is unexpectedly small.');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-help-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  toolGuideCount: requiredPanels.length,
  accessibility: ['keyboard focus', 'aria-describedby', 'role=tooltip', 'click-to-pin section callouts'],
  coverage: requiredPanels
}, null, 2));
