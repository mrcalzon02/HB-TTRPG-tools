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
const doubleSlit = read('double-slit-lab.js');
const doubleSlitCss = read('double-slit-lab.css');

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
checks.push(excludes('Scientific simulation implementations are not embedded inside Shadowrun', shadowrun, [
  'Interstellar Media Collisions Lab',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'DoubleSlitExperimentLab',
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
checks.push(excludes('Black Light does not implement its own Binary Cube, ISM, or double-slit runtime', blacklight, [
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'DoubleSlitExperimentLab',
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
  "loadScript('scientific-tools-entry.js?v=20260809-double-slit-3d-1')",
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
  'quantum-foam sensitivity model',
  'Quantum-foam angular jitter is a phenomenological hypothesis/sensitivity layer'
]));
assert.equal(count(workspace, 'data-scientific-tools-tab="ism-media-simulation"'), 1, 'Scientific Tools must expose exactly one ISM Media Simulation setting tab.');
checks.push('ISM Media Simulation is a Scientific Tools setting tab');

checks.push(includes('Scientific Tools owns the separate double-slit experiment tab', workspace, [
  'data-scientific-tools-tab="double-slit"',
  '>Double Slit Experiment</button>',
  'data-scientific-tools-panel="double-slit"',
  'id="scientific-tools-open-double-slit"',
  "loadStyle('double-slit-lab.css')",
  "loadScript('double-slit-lab.js'",
  'loadDoubleSlitLab',
  'openDoubleSlitLab',
  'quantum mode does not draw a definite post-barrier trajectory'
]));
assert.equal(count(workspace, 'data-scientific-tools-tab="double-slit"'), 1, 'Scientific Tools must expose exactly one Double Slit Experiment setting tab.');
checks.push('Double Slit Experiment is an independent Scientific Tools runtime');

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
checks.push(includes('Quantum foam remains an explicit hypothesis layer with a separate deterministic seed', lab, [
  'const PLANCK_LENGTH = 1.616255e-35;',
  'const FOAM_MODELS = Object.freeze({',
  'Quantum-foam hypothesis layer',
  'spacetime foam has no established proton-force law',
  'δℓ ≈ ℓ^(1−α)ℓP^α',
  'function quantumFoamPhysics(config, side, density)',
  'function applyFoamKick(direction, random, rmsAngle)',
  'foamSeed:',
  'baselineDensityDeltaRms',
  'not evidence that dark energy couples to baryonic density'
]));
checks.push(excludes('Shared ISM runtime remains independent of setting workspaces, Binary Cube, and double-slit implementation', lab, [
  'ShadowrunBinaryCubeEngine',
  'ShadowrunBinaryCubeEncryption',
  'ShadowrunBinaryCubeVisualizer',
  'DoubleSlitExperimentLab',
  'BlacklightContinuumWorkspace'
]));

checks.push(includes('Double-slit runtime preserves accepted baseline and hypothesis separation', doubleSlit, [
  "const PANEL_ID = 'double-slit-lab';",
  'function electronWavelength(kineticEv)',
  'function coherentIntensityAtX(x, physics, config)',
  'const envelope = Math.pow(sinc(beta), 2);',
  '1 + physics.visibility * Math.cos(phase)',
  "config.mode === 'classical'",
  'function buildDistribution(config, physics, sampleCount = 1200)',
  'Which-path information available',
  'does not draw a definite post-barrier particle trajectory',
  'function registerHypothesisLayer(definition)',
  'window.DoubleSlitExperimentLab = Object.freeze'
]));
checks.push(excludes('Double-slit runtime does not absorb unrelated ISM, Shadow, or Binary Cube systems', doubleSlit, [
  'InterstellarMediaCollisionsLab',
  'ShadowrunBinaryCubeEngine',
  'Shadow impact reflectivity',
  'PLANCK_LENGTH',
  'LAMBDA_COEFFICIENT'
]));

assert.ok(css.includes('.ism-lab-panel'), 'ISM stylesheet must retain the authoritative panel styling.');
assert.ok(css.includes('.ism-face-chart'), 'ISM stylesheet must retain concurrent face-chart styling.');
checks.push('ISM stylesheet remains authoritative');
assert.ok(doubleSlitCss.includes('.dsl-panel'), 'Double-slit stylesheet must retain the authoritative panel styling.');
assert.ok(doubleSlitCss.includes('.dsl-viewport'), 'Double-slit stylesheet must retain the 3D viewport styling.');
assert.ok(doubleSlitCss.includes('.dsl-chart'), 'Double-slit stylesheet must retain detector cross-section styling.');
checks.push('Double-slit stylesheet remains authoritative');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.5.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));