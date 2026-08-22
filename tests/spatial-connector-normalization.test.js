'use strict';
const assert = require('assert');
const engine = require('../semantic-spatial-engine.js');

function nodeById(layout) { return new Map(layout.nodes.map(node => [node.id, node])); }
function connectorPairs(layout) { return new Set(layout.connectors.map(connector => connector.pairId)); }

const manyRoles = Array.from({ length: 24 }, (_, i) => ({ id:`room-${i+1}`, role:`room-${i+1}`, tags:i===0?['entrance']:i===23?['objective']:[] }));
const dense = engine.generate({
  seed:'connector-normalization-dense',
  decks:3,
  roles:manyRoles,
  extraEdgeChance:0.45,
  layout:{gridWidth:110,gridHeight:82}
});
assert.strictEqual(dense.validation.ok,true,dense.validation.errors.join('\n'));
assert.strictEqual(connectorPairs(dense).size,2,'three unconstrained decks should need exactly two adjacent-deck connector pairs');
assert.strictEqual(dense.connectors.length,4,'connector endpoints should be two per intentional pair, not random cross-deck edge inflation');

const sparseDecks = engine.generate({
  seed:'connector-normalization-empty-intermediate-deck',
  decks:4,
  roles:[
    {id:'deck-zero',role:'deck-zero',deck:0},
    {id:'deck-one',role:'deck-one',deck:1},
    {id:'deck-three-a',role:'deck-three-a',deck:3},
    {id:'deck-three-b',role:'deck-three-b',deck:3}
  ],
  adjacency:[['deck-zero','deck-one'],['deck-three-a','deck-three-b']],
  extraEdgeChance:0,
  layout:{gridWidth:58,gridHeight:42}
});
assert.strictEqual(sparseDecks.validation.ok,true,sparseDecks.validation.errors.join('\n'));
assert.strictEqual(connectorPairs(sparseDecks).size,2,'consecutive occupied decks must remain connected across an intentionally empty intermediate deck');
assert.strictEqual(sparseDecks.connectors.length,4,'empty numeric decks must not disconnect upper occupied decks or create connector inflation');
assert.ok(sparseDecks.edges.some(edge=>edge.kind==='interdeck'&&edge.metadata.skippedEmptyDecks===true),'bridge across empty intermediate deck must retain explicit provenance');
const nodes=nodeById(dense);
for(const edge of dense.edges){
  if(edge.kind==='backbone'||edge.kind==='redundant'){
    assert.strictEqual(nodes.get(edge.a).deck,nodes.get(edge.b).deck,`${edge.kind} edge ${edge.id} must remain within a deck after deck assignment`);
  }
}

const explicit = engine.generate({
  seed:'connector-normalization-explicit',
  decks:3,
  roles:[
    {id:'entry',role:'entry',deck:0},
    {id:'operations',role:'operations',deck:0},
    {id:'mid',role:'mid',deck:1},
    {id:'vault',role:'vault',deck:2},
    {id:'goal',role:'goal',deck:2}
  ],
  adjacency:[
    ['entry','operations'],
    {a:'operations',b:'vault',kind:'semantic',required:true},
    ['vault','goal']
  ],
  extraEdgeChance:0.45,
  layout:{gridWidth:64,gridHeight:48}
});
assert.strictEqual(explicit.validation.ok,true,explicit.validation.errors.join('\n'));
assert.ok(connectorPairs(explicit).size>=3,'explicit non-adjacent semantic access must be preserved in addition to adjacent-deck reachability');
assert.ok(connectorPairs(explicit).size<=4,'explicit semantic access must not reopen random connector inflation');

const repeat = engine.generate({seed:'connector-normalization-dense',decks:3,roles:manyRoles,extraEdgeChance:0.45,layout:{gridWidth:110,gridHeight:82}});
assert.strictEqual(engine.fingerprint(dense),engine.fingerprint(repeat),'connector normalization must remain deterministic');

console.log('spatial connector normalization: PASS');
console.log(JSON.stringify({engine:engine.VERSION,rooms:dense.rooms.length,decks:dense.deckCount,connectorPairs:connectorPairs(dense).size,connectorEndpoints:dense.connectors.length,edges:dense.edges.length},null,2));
