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

const checks = [];
checks.push(requireMatch(
  'V12 prerequisite is accepted',
  v12,
  /- State: accepted[\s\S]*?V12 is accepted\./,
  'V13 promotion must not precede V12 acceptance.'
));
checks.push(requireMatch(
  'V13 asset token is refreshed for the unified Binary Cube renderer',
  entry,
  /const ASSET_VERSION = '20260809-v13-binary-cube-unified';/,
  'the Shadowrun entry must force browsers to request the current unified Binary Cube renderer while retaining the accepted V13 launcher.'
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
  /function loadCubeVisualizer\(\)[\s\S]*?loadStyle\('binary-cube-visualizer\.css'\)[\s\S]*?loadScript\('shadowrun-binary-cube-engine\.js'[\s\S]*?loadScript\('shadowrun-binary-cube-auth\.js'[\s\S]*?loadScript\('shadowrun-binary-cube-secure-export\.js'[\s\S]*?loadScript\('binary-cube-visualizer-renderer\.js'[\s\S]*?loadScript\('shadowrun-binary-cube-visualizer\.js'/,
  'the promoted launcher must retain canonical engine, protected transport, renderer, controller, and stylesheet loading.'
));
checks.push(requireMatch(
  'Landing page lazy-loads Shadowrun',
  mounts,
  /if\s*\(\s*viewId\s*===\s*'shadowrun'\s*\)[\s\S]*?loadScript\('shadowrun-entry\.js'\)[\s\S]*?activateHashView/,
  'explicit and direct-hash activation must both reach the Shadowrun workspace regardless of source formatting.'
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
  schemaVersion: '0.1.2',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));