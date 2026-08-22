'use strict';
const assert = require('assert');
const engine = require('../semantic-spatial-engine.js');
const moduleMap = require('../module-map-generator.js');
const vessel = require('../alien-vessel-generator.js');

function reachable(layout) {
  if (!layout.rooms.length) return true;
  const edges = new Map(layout.rooms.map(r => [r.nodeId, []]));
  layout.edges.forEach(e => { edges.get(e.a)?.push(e.b); edges.get(e.b)?.push(e.a); });
  const seen = new Set([layout.rooms[0].nodeId]), queue = [layout.rooms[0].nodeId];
  while (queue.length) for (const n of edges.get(queue.shift()) || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  return seen.size === layout.rooms.length;
}

const spec = { seed:'acceptance-42', decks:2, roles:[{id:'entry',role:'entry',deck:0},{id:'lab',role:'lab',deck:0},{id:'objective',role:'objective',deck:1}], adjacency:[['entry','lab'],['lab','objective']], layout:{gridWidth:50,gridHeight:40} };
const a = engine.generate(spec), b = engine.generate(spec);
assert.strictEqual(engine.fingerprint(a), engine.fingerprint(b), 'same seed/spec must be deterministic');
assert.strictEqual(a.validation.ok, true, a.validation.errors.join('\n'));
assert.strictEqual(reachable(a), true, 'semantic graph must be connected');
assert.ok(a.connectors.length >= 2 && a.connectors.length % 2 === 0, 'multi-deck layout must contain paired connectors');
for (let i=0;i<a.rooms.length;i++) for (let j=i+1;j<a.rooms.length;j++) if (a.rooms[i].deck===a.rooms[j].deck) assert.strictEqual(engine.rectsOverlap(a.rooms[i],a.rooms[j],0), false, 'rooms must not overlap');

const map = moduleMap.generate({seed:'module-1',width:64,height:48});
assert.strictEqual(map.tool,'module-map-editor');
assert.ok(Array.isArray(map.cells) && map.cells.length===48 && map.cells[0].length===64, 'module adapter must preserve tile schema');
assert.strictEqual(map.spatialLayout.validation.ok,true);

const recon = vessel.generate({seed:'ship-9',profile:'recon'});
const damaged = vessel.generate({seed:'ship-9',profile:'damaged_recon'});
assert.strictEqual(recon.validation.ok,true);
assert.strictEqual(damaged.validation.ok,true);
assert.ok(recon.deckCount >= 3, 'recon vessel should be multi-deck');
assert.ok(recon.spatialLayout.connectors.length >= 4, 'recon vessel should have interdeck reachability');
assert.notStrictEqual(engine.fingerprint(recon.spatialLayout), engine.fingerprint(damaged.spatialLayout), 'semantic profile changes must alter topology');
assert.ok(damaged.damage.length > 0, 'damaged profile must carry deterministic damage state');

console.log('spatial-engine acceptance: PASS');
console.log(JSON.stringify({engine:engine.VERSION,moduleRooms:map.spatialLayout.rooms.length,reconRooms:recon.spatialLayout.rooms.length,damagedRooms:damaged.spatialLayout.rooms.length,connectors:recon.spatialLayout.connectors.length},null,2));
