#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const shadowrun = read('shadowrun-entry.js');
const blacklight = read('blacklight-continuum-entry.js');
const mounts = read('app-lite-view-mounts.js');
const workspace = read('scientific-tools-entry.js');
const lab = read('interstellar-media-collisions-lab.js');
const css = read('interstellar-media-collisions-lab.css');

function includes(label, source, values) {
  for (const value of values) assert.ok(source.includes(value), `${label}: missing ${JSON.stringify(value)}`);
  return label;
}
function excludes(label, source, values) {
  for (const value of values) assert.ok(!source.includes(value), `${label}: forbidden placement/coupling ${JSON.stringify(value)}`);
  return label;
}
function count(source, needle) { return source.split(needle).length - 1; }

const checks = [];

checks.push(includes('Shadowrun is restored to its setting-owned tool layout', shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'",
  "['tools','Binary Cube Encoder Visualizer'",
  "const ASSET_VERSION = '20260730-v13';"
]));
checks.push(excludes('ISM is not mounted inside Shadowrun', shadowrun, [
  'Interstellar Media Collisions Lab',
  'interstellar-media-collisions-lab.js',
  "['science','Scientific Tools']"
]));

checks.push(excludes('ISM is not mounted inside Blacklight', blacklight, [
  'Interstellar Media Collisions Lab',
  'interstellar-media-collisions-lab.js',
  'data-blacklight-systems-tab="science"'
]));

checks.push(includes('Main menu exposes Scientific Tools as a top-level view', mounts, [
  "button.dataset.view = 'scientific-tools'",
  "button.textContent = 'Scientific Tools'",
  "card.dataset.scientificToolsCard = 'true'",
  "button.textContent = 'Open Scientific Tools'",
  "if (viewId === 'scientific-tools')",
  "loadScript('scientific-tools-entry.js?v=1')",
  'ensureScientificToolsView();'
]));
assert.equal(count(mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'The main menu must own exactly one Scientific Tools card.');
checks.push('Main menu owns one Scientific Tools destination');

checks.push(includes('Scientific Tools owns the ISM setting tab', workspace, [
  'Scientific Simulation Workspace',
  'data-scientific-tools-tab="ism-media-simulation"',
  '>ISM Media Simulation</button>',
  'data-scientific-tools-panel="ism-media-simulation"',
  'id="scientific-tools-open-ism"',
  "loadScript('interstellar-media-collisions-lab.js'",
  "api.openPanel({ setting: 'scientific-tools' })"
]));
assert.equal(count(workspace, 'data-scientific-tools-tab="ism-media-simulation"'), 1, 'Scientific Tools must expose exactly one ISM Media Simulation setting tab.');
checks.push('ISM Media Simulation is a Scientific Tools setting tab');

checks.push(includes('Shared ISM simulation preserves the physical/scattering contract', lab, [
  "const LAMBDA = 1.097e-52;",
  "const FACE_ORDER = ['+Z', '+X', '-X', '+Y', '-Y'];",
  "galactic: { label: 'Galactic average · 1 H-equivalent / cm³', perM3: 1e6 }",
  "local: { label: 'Local interstellar neutral H · 0.127 / cm³', perM3: 1.27e5 }",
  "let activeSetting = 'scientific-tools';",
  '<strong id="ism-setting-label">Scientific Tools</strong>',
  'Shadow impact reflectivity randomness',
  'Input face: −Z. +Z, ±X, and ±Y are accumulated simultaneously',
  'window.InterstellarMediaCollisionsLab = Object.freeze'
]));
checks.push(excludes('Shared ISM runtime remains independent of setting workspaces', lab, [
  'ShadowrunBinaryCubeEngine',
  'ShadowrunBinaryCubeEncryption',
  'ShadowrunBinaryCubeVisualizer',
  'BlacklightContinuumWorkspace'
]));

assert.ok(css.includes('.ism-lab-panel'), 'ISM stylesheet must retain the authoritative panel styling.');
assert.ok(css.includes('.ism-face-chart'), 'ISM stylesheet must retain concurrent face-chart styling.');
checks.push('ISM stylesheet remains authoritative');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.2.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));
