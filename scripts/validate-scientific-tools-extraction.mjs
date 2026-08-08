#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const shadowrun = read('shadowrun-entry.js');
const blacklight = read('blacklight-continuum-entry.js');
const lab = read('interstellar-media-collisions-lab.js');
const css = read('interstellar-media-collisions-lab.css');

function includes(label, source, values) {
  for (const value of values) assert.ok(source.includes(value), `${label}: missing ${JSON.stringify(value)}`);
  return label;
}

function excludes(label, source, values) {
  for (const value of values) assert.ok(!source.includes(value), `${label}: forbidden coupling ${JSON.stringify(value)}`);
  return label;
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

const checks = [];

checks.push(includes('Shadowrun exposes Scientific Tools', shadowrun, [
  "['science','Scientific Tools']",
  "['science','Binary Cube Encryption Laboratory'",
  "['science','Binary Cube Encoder Visualizer'",
  "['science','Interstellar Media Collisions Lab'",
  "loadScript('interstellar-media-collisions-lab.js'",
  "api.openPanel({ setting: 'shadowrun' })",
  "const ASSET_VERSION = '20260730-v13';",
  "'\"':'&quot;'"
]));
assert.equal(count(shadowrun, "['science','Interstellar Media Collisions Lab'"), 1, 'Shadowrun must expose exactly one collisions-lab module card.');
assert.equal(count(shadowrun, "['tools','Binary Cube Encryption Laboratory'"), 0, 'Binary Cube Laboratory must no longer remain in the old Shadowrun Tools category.');
assert.equal(count(shadowrun, "['tools','Binary Cube Encoder Visualizer'"), 0, 'Binary Cube Visualizer must no longer remain in the old Shadowrun Tools category.');
checks.push('Shadowrun owns one Scientific Tools launch path');

checks.push(includes('Blacklight exposes Scientific Tools', blacklight, [
  'data-blacklight-systems-tab="science"',
  'Scientific Tools',
  '<h3>Binary Cube Laboratory</h3>',
  '<h3>Interstellar Media Collisions Lab</h3>',
  "loadScript('interstellar-media-collisions-lab.js'",
  "api.openPanel({ setting: 'blacklight-continuum' })",
  'not falsely wired to the Shadowrun Binary Cube runtime'
]));
assert.equal(count(blacklight, '<h3>Interstellar Media Collisions Lab</h3>'), 1, 'Blacklight must expose exactly one collisions-lab card.');
checks.push('Blacklight keeps its Binary Cube adapter boundary explicit');

checks.push(includes('Shared collisions lab preserves physical and scattering contracts', lab, [
  "const LAMBDA = 1.097e-52;",
  "const FACE_ORDER = ['+Z', '+X', '-X', '+Y', '-Y'];",
  "galactic: { label: 'Galactic average · 1 H-equivalent / cm³', perM3: 1e6 }",
  "local: { label: 'Local interstellar neutral H · 0.127 / cm³', perM3: 1.27e5 }",
  'Phase light beam seed',
  'Secondary Shadow Key',
  'Shadow impact reflectivity randomness',
  'literal 1:1 interstellar-medium particles',
  'Input face: −Z. +Z, ±X, and ±Y are accumulated simultaneously',
  'Shadow coupling and keyed reflectivity are deliberate encryption/obfuscation operators',
  'window.InterstellarMediaCollisionsLab = Object.freeze'
]));
assert.equal(count(lab, 'window.InterstellarMediaCollisionsLab = Object.freeze'), 1, 'The shared collisions lab must have exactly one authoritative runtime export.');
checks.push(excludes('Shared collisions lab stays setting-neutral', lab, [
  'ShadowrunBinaryCubeEngine',
  'ShadowrunBinaryCubeEncryption',
  'ShadowrunBinaryCubeVisualizer',
  'BlacklightContinuumWorkspace'
]));

assert.ok(css.includes('.ism-lab-panel'), 'Collisions lab stylesheet must retain its authoritative panel styling.');
assert.ok(css.includes('.ism-face-chart'), 'Collisions lab stylesheet must retain concurrent face-chart styling.');
checks.push('Shared collisions lab stylesheet is present');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-extraction-contract-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));