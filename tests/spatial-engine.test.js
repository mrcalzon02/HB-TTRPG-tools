'use strict';
const assert = require('assert');
const engine = require('../semantic-spatial-engine.js');
const content = require('../semantic-content-populator.js');
const moduleMap = require('../module-map-generator.js');
const hull = require('../vessel-hull-envelope.js');
const vessel = require('../alien-vessel-generator.js');
const kaysender = require('../kaysender-airship-generator.js');

function reachable(layout) {
  if (!layout.rooms.length) return true;
  const links = new Map(layout.rooms.map(room => [room.nodeId, []]));
  layout.edges.forEach(edge => { links.get(edge.a)?.push(edge.b); links.get(edge.b)?.push(edge.a); });
  const seen = new Set([layout.rooms[0].nodeId]), queue = [layout.rooms[0].nodeId];
  while (queue.length) for (const next of links.get(queue.shift()) || []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  return seen.size === layout.rooms.length;
}
function roleSet(layout) { return new Set(layout.rooms.map(room => room.role)); }
function assertNoOverlap(layout) {
  for (let i = 0; i < layout.rooms.length; i += 1) for (let j = i + 1; j < layout.rooms.length; j += 1) {
    if (layout.rooms[i].deck === layout.rooms[j].deck) assert.strictEqual(engine.rectsOverlap(layout.rooms[i], layout.rooms[j], 0), false, `${layout.rooms[i].nodeId} overlaps ${layout.rooms[j].nodeId}`);
  }
}
function assertCorridorsAndDoors(layout) {
  layout.corridors.forEach(corridor => {
    const doors = layout.doors.filter(door => door.corridorId === corridor.id);
    assert.strictEqual(doors.length, 2, `${corridor.id} must terminate in exactly two doors`);
    assert.ok(corridor.points.length > 0, `${corridor.id} must contain routed cells`);
    doors.forEach(door => assert.strictEqual(door.deck, corridor.deck, 'door/corridor deck mismatch'));
  });
}
function assertPairedConnectors(layout) {
  const pairs = new Map();
  layout.connectors.forEach(connector => { if (!pairs.has(connector.pairId)) pairs.set(connector.pairId, []); pairs.get(connector.pairId).push(connector); });
  pairs.forEach((items, pairId) => {
    assert.strictEqual(items.length, 2, `${pairId} must contain two connector endpoints`);
    assert.strictEqual(items[0].x, items[1].x, `${pairId} x coordinate mismatch`);
    assert.strictEqual(items[0].y, items[1].y, `${pairId} y coordinate mismatch`);
    assert.notStrictEqual(items[0].deck, items[1].deck, `${pairId} must connect different decks`);
  });
}

const spec = {
  seed:'acceptance-42', decks:2,
  roles:[{id:'entry',role:'entry',deck:0,tags:['entrance']},{id:'lab',role:'lab',deck:0},{id:'objective',role:'objective',deck:1}],
  adjacency:[['entry','lab'],['lab','objective']], layout:{gridWidth:50,gridHeight:40}
};
const a = engine.generate(spec), b = engine.generate(spec);
assert.strictEqual(engine.fingerprint(a), engine.fingerprint(b), 'same seed/spec must produce identical topology');
assert.strictEqual(a.validation.ok, true, a.validation.errors.join('\n'));
assert.deepStrictEqual(new Set(a.rooms.map(room => room.nodeId)), new Set(['entry','lab','objective']), 'all required rooms must be present');
assert.strictEqual(reachable(a), true, 'semantic graph must be connected across decks');
assertNoOverlap(a);
assertCorridorsAndDoors(a);
assert.ok(a.connectors.length >= 2 && a.connectors.length % 2 === 0, 'multi-deck layout must contain paired connectors');
assertPairedConnectors(a);

const pruned = engine.generate({ seed:'prune-safe', roles:[
  {id:'entry',role:'entry',tags:['entrance'],protected:true},
  {id:'required',role:'objective',protected:true},
  {id:'optional',role:'side-room',protected:false}
], adjacency:[['entry','objective']], extraEdgeChance:0.45, pruneDeadEnds:true, layout:{gridWidth:45,gridHeight:35} });
assert.strictEqual(pruned.validation.ok, true, pruned.validation.errors.join('\n'));
assert.ok(pruned.rooms.some(room => room.nodeId === 'required'), 'pruning must preserve required/protected rooms');
assert.strictEqual(reachable(pruned), true, 'pruning must preserve reachability');

const map = moduleMap.generate({seed:'module-1',width:64,height:48,locationArchetype:'mansion'});
assert.strictEqual(map.tool,'module-map-editor');
assert.ok(Array.isArray(map.cells) && map.cells.length===48 && map.cells[0].length===64, 'module adapter must preserve {width,height,cells} tile schema');
assert.strictEqual(map.spatialLayout.validation.ok,true);
assert.strictEqual(map.locationArchetype,'mansion');
assert.strictEqual(map.semanticProgram.source,'site-archetype-defaults');
const custom = moduleMap.generate({seed:'custom-roles',width:48,height:36,locationArchetype:'tomb',roles:[
  {id:'custom-entry',role:'custom-entry',label:'Custom Entry',tags:['entrance']},
  {id:'custom-goal',role:'custom-goal',label:'Custom Goal',tags:['objective']}
],adjacency:[['custom-entry','custom-goal']]});
assert.deepStrictEqual(custom.spatialLayout.rooms.map(room=>room.role).sort(),['custom-entry','custom-goal']);
assert.strictEqual(custom.semanticProgram.source,'explicit-custom-roles','explicit roles must override archetype defaults without disabling archetype context');

const archetypes = {};
for (const kind of ['mansion','tomb','sewer','fortress','school','arcane_university','bunkhouse_compound']) {
  archetypes[kind] = moduleMap.generate({seed:'same-site-seed',locationArchetype:kind,width:88,height:66});
  assert.strictEqual(archetypes[kind].spatialLayout.validation.ok,true,`${kind} layout invalid`);
  assert.strictEqual(reachable(archetypes[kind].spatialLayout),true,`${kind} must be reachable`);
  assertNoOverlap(archetypes[kind].spatialLayout);
}
assert.ok(roleSet(archetypes.mansion.spatialLayout).has('private-chambers'),'mansion must contain private owner/family space');
assert.ok(roleSet(archetypes.tomb.spatialLayout).has('sealed-vault'),'tomb must contain a sealed vault');
assert.ok(roleSet(archetypes.sewer.spatialLayout).has('cistern'),'sewer must contain infrastructure cistern space');
assert.ok(roleSet(archetypes.fortress.spatialLayout).has('fortress-gate'),'fortress must contain a defensive gatehouse');
assert.ok(roleSet(archetypes.arcane_university.spatialLayout).has('ritual-chamber'),'Arcane University must contain ritual space');
assert.ok(roleSet(archetypes.bunkhouse_compound.spatialLayout).has('bunkhouse'),'bunkhouse compound must contain actual bunkhouses');
for (const pair of [['mansion','tomb'],['mansion','sewer'],['tomb','fortress'],['sewer','fortress'],['school','arcane_university']]) {
  assert.notStrictEqual(engine.fingerprint(archetypes[pair[0]].spatialLayout),engine.fingerprint(archetypes[pair[1]].spatialLayout),`${pair.join(' vs ')} must materially change topology`);
}

const mansionContentA = moduleMap.generate({seed:'content-site',locationArchetype:'mansion',rulesTarget:'world_of_darkness',dangerLevel:7,faction:'House retainers',adventurePurpose:'investigation'});
const mansionContentB = moduleMap.generate({seed:'content-site',locationArchetype:'mansion',rulesTarget:'world_of_darkness',dangerLevel:7,faction:'House retainers',adventurePurpose:'investigation'});
assert.deepStrictEqual(mansionContentA.content,mansionContentB.content,'content population must be deterministic for a seed/context');
assert.strictEqual(mansionContentA.content.compatibility.id,'world_of_darkness');
assert.strictEqual(mansionContentA.content.compatibility.mechanicalDetailsAreSettingScoped,true);
assert.strictEqual(mansionContentA.content.provenance.locationArchetype,'mansion');
assert.ok(mansionContentA.content.rooms.some(room => room.evidence.length || room.security.length || room.socialEncounters.length),'content layer must populate semantic categories');
for (const target of ['open_d20','world_of_darkness','blacklight_continuum','kaysender']) assert.strictEqual(content.compatibilityTarget(target).id,target,`${target} compatibility target missing`);

const shapes = ['connected-skin','oval','capsule','rectangle','square','circle','cube','skin'];
for (const shape of shapes) {
  const wrapped = hull.wrap(a, { shape, tightness:'tight' });
  assert.strictEqual(wrapped.validation.ok, true, `${shape}: ${wrapped.validation.errors.join('\n')}`);
  assert.strictEqual(wrapped.surface.connectedAcrossDecks, true, `${shape} hull must remain vertically connected`);
  assert.ok(wrapped.shellCells.length > 0, `${shape} hull must have an outer shell`);
}
assert.strictEqual(hull.normalizeShape('cube'),'square');
assert.strictEqual(hull.normalizeShape('skin'),'connected-skin');
assert.ok(hull.normalizeTightness('loose').clearance > hull.normalizeTightness('tight').clearance,'loose hull must create more clearance than tight hull');

const recon = vessel.generate({seed:'ship-9',profile:'recon',hullShape:'oval',hullTightness:'tight'});
const damaged = vessel.generate({seed:'ship-9',profile:'damaged_recon',hullShape:'connected-skin',hullTightness:'standard'});
assert.strictEqual(recon.validation.ok,true);
assert.strictEqual(damaged.validation.ok,true);
assert.ok(recon.deckCount >= 3,'recon vessel should be multi-deck');
assert.ok(recon.spatialLayout.connectors.length >= 4,'recon vessel should have interdeck reachability');
assert.notStrictEqual(engine.fingerprint(recon.spatialLayout),engine.fingerprint(damaged.spatialLayout),'alien semantic profile changes must alter topology');
assert.ok(damaged.damage.length > 0,'damaged profile must carry deterministic damage state');
assert.strictEqual(recon.hull.shape,'oval');
assert.strictEqual(damaged.hull.shape,'connected-skin');
assert.strictEqual(recon.hull.validation.ok,true);
assert.strictEqual(damaged.hull.validation.ok,true);

const kayBase = {
  seed:'kaysender-acceptance', vesselClass:'frigate patrol craft', hullCulture:'human hybrid practical hull',
  coreType:'human hybrid steam-arcane core', purpose:'escort and patrol', crewScale:'standard crew 12-25', cargoProfile:'mixed trade goods',
  armament:'light cannon and swivel guns', defenseSystem:'reinforced hull braces', condition:'worn but serviceable', legalStatus:'licensed merchant vessel', factionEntanglement:'local merchant backers'
};
const kayHuman = kaysender.generate(kayBase);
const kayHuman2 = kaysender.generate(kayBase);
assert.strictEqual(kayHuman.generator,'generator.kaysender_airship');
assert.strictEqual(kayHuman.validation.ok,true);
assert.strictEqual(kayHuman.compatibility.id,'kaysender');
assert.strictEqual(engine.fingerprint(kayHuman.spatialLayout),engine.fingerprint(kayHuman2.spatialLayout),'Kaysender same seed/profile must be deterministic');
assert.deepStrictEqual(kayHuman.content,kayHuman2.content,'Kaysender content must be deterministic');
assert.ok(kayHuman.spatialLayout.engine==='hb-semantic-spatial-engine','Kaysender must use shared spatial engine output');

const kayDwarf = kaysender.generate({...kayBase,hullCulture:'dwarven reinforced ironwood hull'});
const kayElf = kaysender.generate({...kayBase,hullCulture:'elven living-lattice hull'});
assert.notStrictEqual(engine.fingerprint(kayDwarf.spatialLayout),engine.fingerprint(kayElf.spatialLayout),'hull culture must materially alter vessel semantic topology');
assert.ok(roleSet(kayDwarf.spatialLayout).has('forge-workshop'),'dwarven hull must include engineering-heavy forge space');
assert.ok(roleSet(kayElf.spatialLayout).has('living-grove'),'elven hull must include living/ritual space');
assert.notStrictEqual(kayDwarf.hull.shape,kayElf.hull.shape,'hull culture should influence physical envelope defaults');

const kayScout = kaysender.generate({...kayBase,vesselClass:'scout cutter'});
const kayDreadnought = kaysender.generate({...kayBase,vesselClass:'dreadnought fortress vessel',crewScale:'floating garrison 120+',armament:'heavy cannon battery',defenseSystem:'military compartment bulkheads'});
assert.notStrictEqual(engine.fingerprint(kayScout.spatialLayout),engine.fingerprint(kayDreadnought.spatialLayout),'vessel class/crew/armament/defense inputs must materially change semantic topology');
assert.ok(kayDreadnought.deckCount > kayScout.deckCount,'larger Kaysender class should increase vertical organization');

const kayCoreA = kaysender.generate({...kayBase,coreType:'gnomish crystal-gear hybrid core'});
const kayCoreB = kaysender.generate({...kayBase,coreType:'elven attuned weave core'});
assert.notStrictEqual(engine.fingerprint(kayCoreA.spatialLayout),engine.fingerprint(kayCoreB.spatialLayout),'core technology must materially change semantic topology');
assert.ok(roleSet(kayCoreA.spatialLayout).has('core-calibration-lab'));
assert.ok(roleSet(kayCoreB.spatialLayout).has('core-ritual-chamber'));

const kayOperational = kaysender.generate({...kayBase,cargoProfile:'contraband under false manifest',condition:'storm damaged',legalStatus:'forged papers',factionEntanglement:"Surveyor's Guild contract"});
const operationalRoles = roleSet(kayOperational.spatialLayout);
assert.ok(operationalRoles.has('concealed-cargo-locker'),'cargo profile must alter semantic organization');
assert.ok(operationalRoles.has('damage-control'),'condition must alter semantic organization');
assert.ok(operationalRoles.has('concealed-registry-cache'),'legal status must alter semantic organization');
assert.ok(operationalRoles.has('faction-liaison'),'faction entanglement must alter semantic organization');
assert.strictEqual(kayOperational.hull.validation.ok,true);
assert.strictEqual(reachable(kayOperational.spatialLayout),true);
assertPairedConnectors(kayOperational.spatialLayout);

console.log('spatial-engine acceptance: PASS');
console.log(JSON.stringify({
  engine:engine.VERSION, content:content.VERSION, hull:hull.VERSION, moduleArchetypes:Object.keys(moduleMap.SITE_ARCHETYPES).length,
  moduleRooms:map.spatialLayout.rooms.length, alienReconRooms:recon.spatialLayout.rooms.length,
  kaysenderRooms:kayOperational.spatialLayout.rooms.length, kaysenderCultureProfiles:Object.keys(kaysender.CULTURES).length, hullShapes:shapes.length
},null,2));
