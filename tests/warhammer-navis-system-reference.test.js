'use strict';

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'warhammer-40k-workspace-v8.js'), 'utf8');

// Parse the authoritative workspace without executing browser-only code.
new Function(source);

if (source.includes('buildVigilPanel')) {
  throw new Error('Legacy duplicate Passive Vigil panel builder is still present.');
}
if (source.includes("'wh-vigil-panel'") || source.includes('"wh-vigil-panel"')) {
  throw new Error('Workspace still creates the legacy overlapping wh-vigil-panel.');
}
if (!source.includes("panel.id='wh-system-reference'")) {
  throw new Error('Unified system-detail reference panel is missing.');
}
if (!source.includes('showSystemReference(node,records')) {
  throw new Error('System selection is not routed through the unified reference renderer.');
}
if (!source.includes('function showVigilNode(node,records,dwell){showSystemReference(node,records,dwell,true);}')) {
  throw new Error('Passive Vigil is not routed through the unified reference renderer.');
}
if (!source.includes("showSystemReference(node,records,0,false)")) {
  throw new Error('Ceasing Passive Vigil does not preserve the manual system-detail reference.');
}

console.log('Unified Navis system-detail reference integrity passed.');
