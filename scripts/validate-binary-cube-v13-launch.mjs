#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const entry = read('shadowrun-entry.js');
const mounts = read('app-lite-view-mounts.js');
const visualizer = read('shadowrun-binary-cube-visualizer.js');
const scientificTools = read('scientific-tools-entry.js');
const blacklight = read('blacklight-continuum-entry.js');
const v12 = read('docs/binary-cube-v12-runtime-failure-report.md');
const userGuide = read('docs/binary-cube-visualizer-user-guide.md');
const architecture = read('docs/binary-cube-visualizer-architecture.md');
const launchReport = read('docs/binary-cube-v13-launch-report.md');

function requireMatch(label, source, pattern, detail) {
  assert.match(source, pattern, `${label}: ${detail}`);
  return label;
}
function requireIncludes(label, source, values, detail) {
  for (const value of values) assert.ok(source.includes(value), `${label}: missing ${JSON.stringify(value)}. ${detail}`);
  return label;
}

assert.doesNotThrow(() => new Function(scientificTools), 'Scientific Tools entry must remain valid JavaScript.');
assert.doesNotThrow(() => new Function(blacklight), 'Black Light Continuum entry must remain valid JavaScript.');

const checks = [];
checks.push(requireMatch(
  'V12 prerequisite is accepted',
  v12,
  /- State: accepted[\s\S]*?V12 is accepted\./,
  'V13 promotion must not precede V12 acceptance.'
));
checks.push(requireMatch(
  'Binary Cube asset token remains explicitly versioned after V13 promotion',
  entry,
  /const ASSET_VERSION = '20260809-v\d+-(?:binary-cube-[a-z0-9-]+|contextual-help)';/i,
  'the Shadowrun entry must force browsers to request the current Binary Cube runtime or accepted shared contextual-help route while retaining the V13 launcher.'
));
checks.push(requireMatch(
  'Laboratory card remains available',
  entry,
  /\['tools','Binary Cube Encryption Laboratory',[\s\S]*?'shadowrun-binary-cube-encryption','available','Open Laboratory'\]/,
  'the laboratory must remain a separate available launch target inside Shadowrun.'
));
checks.push(requireMatch(
  'Visualizer card is available',
  entry,
  /\['tools','Binary Cube Encoder Visualizer',[\s\S]*?'shadowrun-binary-cube-visualizer','available','Open Visualizer'\]/,
  'the visualizer must remain a separate available launch target inside Shadowrun.'
));
checks.push(requireMatch(
  'Visualizer loader preserves the complete dependency chain',
  entry,
  /function loadCubeVisualizer\(\)[\s\S]*?loadStyle\('binary-cube-visualizer\.css'\)[\s\S]*?loadScript\('shadowrun-binary-cube-engine\.js'[\s\S]*?loadScript\('binary-cube-worker-client\.js'[\s\S]*?loadScript\('shadowrun-binary-cube-auth\.js'[\s\S]*?loadScript\('shadowrun-binary-cube-secure-export\.js'[\s\S]*?loadScript\('binary-cube-visualizer-renderer\.js'[\s\S]*?loadScript\('shadowrun-binary-cube-visualizer\.js'/,
  'the promoted launcher must retain canonical engine, freeze-safe shared executor/reseed source, protected transport, renderer, controller, and stylesheet loading.'
));
checks.push(requireMatch(
  'Landing page lazy-loads refreshed Shadowrun entry',
  mounts,
  /if\s*\(\s*viewId\s*===\s*'shadowrun'\s*\)[\s\S]*?loadScript\('shadowrun-entry\.js(?:\?v=[^']+)?'\)[\s\S]*?activateHashView/,
  'explicit and direct-hash activation must both reach the Shadowrun workspace with the current cache-busting entry URL.'
));
checks.push(requireIncludes(
  'Scientific Tools owns the shared Binary Cube launch surface',
  scientificTools,
  [
    'loadBinaryCubeVisualizer',
    'loadBinaryCubeLaboratory',
    'openBinaryCubeVisualizer',
    'openBinaryCubeLaboratory',
    'shadowrun-binary-cube-engine.js',
    'shadowrun-binary-cube-auth.js',
    'shadowrun-binary-cube-secure-export.js',
    'binary-cube-visualizer-renderer.js',
    'shadowrun-binary-cube-visualizer.js',
    'one shared ShadowrunBinaryCubeVisualizer instance'
  ],
  'Scientific Tools must launch the accepted Shadowrun implementation rather than introducing another encoder or renderer.'
));
checks.push(requireIncludes(
  'Black Light delegates to centralized Scientific Tools',
  blacklight,
  [
    'data-blacklight-systems-tab="science"',
    'Binary Cube Encoder Visualizer',
    "prepareView('scientific-tools')",
    "openSharedScientificTool('openBinaryCubeVisualizer'",
    "openSharedScientificTool('openBinaryCubeLaboratory'"
  ],
  'Black Light must be a shared launcher and may not maintain a separate Binary Cube implementation.'
));
checks.push(requireMatch(
  'Scientific Tools entry is cache-refreshed',
  mounts,
  /loadScript\('scientific-tools-entry\.js\?v=\d{8}-[a-z0-9-]+'\)/i,
  'the centralized launch surface must use an explicit current cache-busting token without constraining unrelated Scientific Tools evolution.'
));
checks.push(requireIncludes(
  'User guide covers the transformation and controls',
  userGuide,
  [
    '## The real transformation model',
    '### Input and output faces',
    '### Orientation',
    '### Point identity and keyed depth',
    '### Mask and filler',
    '### Block framing',
    '## Trace phases',
    '## Rendering tiers',
    '## Package and transport formats',
    '## Laboratory handoff',
    '## Accessibility',
    '## Persistence and recovery',
    'experimental reversible obfuscation'
  ],
  'all V13 user-facing concepts and the warning must be documented.'
));
checks.push(requireIncludes(
  'Architecture guide preserves implementation boundaries',
  architecture,
  [
    '## System boundary',
    '## Runtime modules',
    '## Canonical data flow',
    '## Rendering tiers',
    '## Asynchronous invalidation',
    '## Lifecycle and resource ownership',
    '## Accessibility architecture',
    '## Transport provenance',
    '## Persistence',
    '## Desktop integration',
    '## Deployment architecture',
    '## Validation architecture',
    '## Change rules'
  ],
  'the developer architecture must document authority, lifecycle, security, deployment, and regression rules.'
));
checks.push(requireIncludes(
  'Visualizer retains the ten canonical phases',
  visualizer,
  [
    "'source-ready'",
    "'block-framed'",
    "'mask-applied'",
    "'input-face-staged'",
    "'point-assignment'",
    "'point-field-loaded'",
    "'output-projection-selected'",
    "'output-face-staged'",
    "'encrypted-block-emitted'",
    "'block-complete'"
  ],
  'promotion must not remove the canonical transformation explanation.'
));
checks.push(requireMatch(
  'Visualizer retains the experimental warning',
  visualizer,
  /Experimental obfuscation research:[\s\S]*?not cryptographic authentication/,
  'the promoted tool must continue to disclose its security boundary.'
));
checks.push(requireIncludes(
  'Launch report records accepted promotion evidence',
  launchReport,
  [
    'V13 — Shadowrun Workspace Launch and Documentation',
    '- State: accepted',
    'Both cards are promoted from `prototype` to `available`',
    'docs/binary-cube-visualizer-user-guide.md',
    'docs/binary-cube-visualizer-architecture.md',
    'the complete 24-check V0–V12 aggregate',
    'the promoted mobile launch remains within the viewport',
    'V13 is accepted.'
  ],
  'the accepted promotion report must identify artifacts, complete regression evidence, public mobile evidence, and final acceptance.'
));

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v13-launch-contract-receipt',
  schemaVersion: '0.2.3',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));