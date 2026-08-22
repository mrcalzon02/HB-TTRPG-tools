'use strict';
const assert=require('assert');
const moduleMap=require('../module-map-generator.js');

const dwarfGoblin=moduleMap.resolveSiteProfile({seed:'history-dwarf-goblin',locationArchetype:'fortress',culturalInfluence:'dwarf',currentController:'goblin',occupancyState:'active',condition:'maintained',ecology:'subterranean',magicTech:'runic'});
assert.strictEqual(dwarfGoblin.axes.controller,'goblin-clan','controller aliases must resolve cultural occupiers explicitly');
for(const roleName of ['fortress-gate','forge-workshop','stone-service-tunnel','inherited-builder-mechanism','occupier-crawl-bypass'])assert.ok(dwarfGoblin.roles.some(r=>r.role===roleName),`dwarven/goblin historical adaptation missing ${roleName}`);
const adaptedForge=dwarfGoblin.roles.find(r=>r.role==='forge-workshop');assert.strictEqual(adaptedForge.metadata.originalRole,'forge-workshop');assert.match(adaptedForge.metadata.currentUse,/scrap workshop/);assert.ok(adaptedForge.metadata.interactionIds.includes('dwarven-infrastructure-repurposed'));
const adaptedGate=dwarfGoblin.roles.find(r=>r.role==='fortress-gate');assert.match(adaptedGate.metadata.currentUse,/barricaded occupation zone/);assert.ok(adaptedGate.metadata.currentUseOverlays.includes('partially understood inherited system'),'later technical interaction must layer onto, not overwrite, occupier use');
assert.ok(dwarfGoblin.interactions.some(x=>x.id==='dwarven-small-occupant-bypass'),'cross-layer interaction provenance must be structured');

const dwarfContinuity=moduleMap.resolveSiteProfile({seed:'history-dwarf-continuity',locationArchetype:'fortress',culturalInfluence:'dwarf',currentController:'dwarves',occupancyState:'active',condition:'maintained',ecology:'sterile',magicTech:'runic'});
assert.ok(dwarfContinuity.interactions.some(x=>x.id==='cultural-continuity'),'same-culture occupation must preserve cultural continuity');
assert.strictEqual(dwarfContinuity.roles.find(r=>r.role==='forge-workshop').metadata.currentUse,'continued intended use');
assert.ok(!dwarfContinuity.roles.some(r=>r.role==='occupier-crawl-bypass'),'continuity must not fabricate mismatch adaptations');

const elfOccupation=moduleMap.resolveSiteProfile({seed:'history-elf-occupation',locationArchetype:'mansion',culturalInfluence:'elf',currentController:'military',occupancyState:'occupied',condition:'maintained',ecology:'managed-garden'});
assert.match(elfOccupation.roles.find(r=>r.role==='living-grove').metadata.currentUse,/muster/);assert.match(elfOccupation.roles.find(r=>r.role==='open-gallery').metadata.currentUse,/firing walk/);assert.ok(elfOccupation.interactions.some(x=>x.id==='elven-space-militarized'));

const fungalRuin=moduleMap.resolveSiteProfile({seed:'history-fungal-ruin',locationArchetype:'mansion',culturalInfluence:'human',currentController:'abandoned',occupancyState:'long-abandoned',condition:'weathered',ecology:'fungal',waterState:'damp',creatureFamilies:['fungus']});
assert.ok(fungalRuin.interactions.some(x=>x.id==='ecological-succession'));assert.ok(fungalRuin.roles.some(r=>r.role==='ecology-breach'),'ecological succession must create non-original traversal');assert.ok(fungalRuin.roles.some(r=>r.metadata?.currentUse?.includes('ecological colony')),'ecology must repurpose inherited rooms rather than only adding a den');

const floodedIndustry=moduleMap.resolveSiteProfile({seed:'history-flooded-industry',locationArchetype:'industrial_facility',culturalInfluence:'human',currentController:'salvagers',occupancyState:'partially-flooded',condition:'damaged',waterState:'flooded',ecology:'aquatic'});
assert.ok(floodedIndustry.interactions.some(x=>x.id==='flooded-circulation'));assert.ok(floodedIndustry.roles.some(r=>r.role==='high-water-bypass'),'flooding must alter circulation with alternate routes');assert.ok(floodedIndustry.decks>=2,'flooded circulation should force vertical organization when needed');

const historicalGenerated=moduleMap.generate({seed:'history-content',locationArchetype:'fortress',culturalInfluence:'dwarf',currentController:'goblin',occupancyState:'active',condition:'maintained',ecology:'subterranean',magicTech:'runic',creatureFamilies:['humanoid'],hazardFamilies:['mechanical'],width:96,height:72});
assert.strictEqual(historicalGenerated.spatialLayout.validation.ok,true,historicalGenerated.spatialLayout.validation.errors.join('\n'));
const forgeContent=historicalGenerated.content.rooms.find(r=>r.role==='forge-workshop');assert.match(forgeContent.historicalUse.currentUse,/scrap workshop/);assert.ok(forgeContent.environmentalDetails.some(x=>x.includes('inherited function')),'content population must expose original/current room relationship');assert.ok(forgeContent.evidence.some(x=>x.includes('cross-layer history')),'physical evidence must expose interaction provenance');
const gateContent=historicalGenerated.content.rooms.find(r=>r.role==='fortress-gate');assert.match(gateContent.historicalUse.currentUse,/barricaded occupation zone/);assert.ok(gateContent.historicalUse.currentUseOverlays.includes('partially understood inherited system'),'content must retain multiple layered effects on one inherited room');
console.log('site-history interactions: PASS');
console.log(JSON.stringify({interactions:dwarfGoblin.interactions.length,adaptedRooms:dwarfGoblin.roles.filter(r=>r.metadata?.currentUse).length,floodedDecks:floodedIndustry.decks,generatedRooms:historicalGenerated.spatialLayout.rooms.length},null,2));
