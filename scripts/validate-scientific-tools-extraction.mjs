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

checks.push(includes('Shadowrun retains the definitive Binary Cube launch targets', shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'",
  "['tools','Binary Cube Encoder Visualizer'",
  "const ASSET_VERSION = '20260809-v13-binary-cube-unified';",
  'function loadCubeTool()',
  'function loadCubeVisualizer()',
  "loadScript('shadowrun-binary-cube-engine.js'",
  "loadScript('shadowrun-binary-cube-visualizer.js'"
]));
checks.push(excludes('ISM is not implemented inside Shadowrun', shadowrun, [
  'Interstellar Media Collisions Lab',
  'interstellar-media-collisions-lab.js',
  "['science','Scientific Tools']"
]));

checks.push(includes('Black Light exposes Scientific Tools through shared launchers', blacklight, [
  'data-blacklight-systems-tab="science"',
  'Binary Cube Encoder Visualizer',
  'Interstellar Media Collisions Lab',
  "prepareView('scientific-tools')",
  "openSharedScientificTool('openBinaryCubeVisualizer'",
  "openSharedScientificTool('openBinaryCubeLaboratory'",
  "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not implement its own Binary Cube or ISM runtime', blacklight, [
  'interstellar-media-collisions-lab.js',
  'shadowrun-binary-cube-engine.js',
  'binary-cube-visualizer-renderer.js',
  'shadowrun-binary-cube-visualizer.js'
]));

checks.push(includes('Main menu exposes Scientific Tools as a top-level view', mounts, [
  "button.dataset.view = 'scientific-tools'",
  "button.textContent = 'Scientific Tools'",
  "card.dataset.scientificToolsCard = 'true'",
  "button.textContent = 'Open Scientific Tools'",
  "if (viewId === 'scientific-tools')",
  "loadScript('scientific-tools-entry.js?v=20260809-binary-cube-unified')",
  "loadScript('shadowrun-entry.js?v=20260809-binary-cube-unified')",
  'ensureScientificToolsView();'
]));
assert.equal(count(mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'The main menu must own exactly one Scientific Tools card.');
checks.push('Main menu owns one Scientific Tools destination');

checks.push(includes('Scientific Tools owns the shared Binary Cube launch surface', workspace, [
  'data-scientific-tools-tab="binary-cube"',
  'Binary Cube Laboratory and Encoder Visualizer',
  'id="scientific-tools-open-binary-cube-visualizer"',
  'id="scientific-tools-open-binary-cube-laboratory"',
  'loadBinaryCubeVisualizer',
  'loadBinaryCubeLaboratory',
  'openBinaryCubeVisualizer',
  'openBinaryCubeLaboratory',
  "loadScript('shadowrun-binary-cube-engine.js'",
  "loadScript('binary-cube-visualizer-renderer.js'",
  "loadScript('shadowrun-binary-cube-visualizer.js'",
  'one shared ShadowrunBinaryCubeVisualizer instance'
]));
assert.equal(count(workspace, 'data-scientific-tools-tab="binary-cube"'), 1, 'Scientific Tools must expose exactly one Binary Cube setting tab.');
checks.push('Binary Cube is a Scientific Tools setting tab backed by the definitive Shadowrun runtime');

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
checks.push(excludes('Shared ISM runtime remains independent of setting workspaces and Binary Cube implementation', lab, [
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
  schemaVersion: '0.3.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));