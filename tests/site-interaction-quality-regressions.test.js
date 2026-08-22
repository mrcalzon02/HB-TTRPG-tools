'use strict';
const assert=require('assert');
const moduleMap=require('../module-map-generator.js');

const cases=[
  {
    id:'elven-outlaw-manor',
    input:{seed:'quality-elven-outlaw-manor',locationArchetype:'manor',siteScale:'sprawling',culturalInfluence:'elven',currentController:'outlaws',occupancyState:'repurposed',biome:'temperate-forest',ecology:'overgrown',condition:'weathered',maintenance:'deferred',magicTech:'druidic',secretDensity:'very-high'},
    interaction:'mansion-irregular-occupation',
    roles:['receiving-hall','study','private-chambers','estate-office','formal-garden']
  },
  {
    id:'halfling-quarantine-bunkhouse',
    input:{seed:'quality-halfling-quarantine-bunkhouse',locationArchetype:'bunkhouse_compound',siteScale:'campus',culturalInfluence:'halfling',currentController:'plague-survivors',occupancyState:'quarantined',biome:'grassland',ecology:'plague',condition:'patched',maintenance:'jury-rigged',contamination:'disease',resourceProfile:'medical'},
    interaction:'bunkhouse-quarantine-reoccupation',
    roles:['assembly-yard','bunkhouse','washhouse','sergeant-office','communal-pantry']
  },
  {
    id:'goblinoid-outlaw-hideout',
    input:{seed:'quality-goblinoid-outlaw-hideout',locationArchetype:'hideout',siteScale:'small',culturalInfluence:'goblinoid',currentController:'outlaws',occupancyState:'active',biome:'boreal-forest',ecology:'woodland',condition:'patched',maintenance:'jury-rigged',secretDensity:'very-high'},
    interaction:'hideout-irregular-occupation',
    roles:['concealed-entry','watch-post','planning-room','hidden-cache','utility-crawlway']
  },
  {
    id:'rebel-civic-building',
    input:{seed:'quality-rebel-civic-building',locationArchetype:'civic_building',siteScale:'large',culturalInfluence:'mixed-cosmopolitan',currentController:'rebels',occupancyState:'occupied',biome:'ruined-city',ecology:'urban-vermin',condition:'damaged',maintenance:'poor',magicTech:'mixed-tech',resourceProfile:'weapons',secretDensity:'high'},
    interaction:'civic-rebel-occupation',
    roles:['public-lobby','council-chamber','public-records','secure-office','civic-service']
  }
];

for(const scenario of cases){
  const profile=moduleMap.resolveSiteProfile(scenario.input);
  assert.ok(profile.interactions.some(x=>x.id===scenario.interaction),`${scenario.id} missing ${scenario.interaction}`);
  assert.ok(profile.interactions.length>=4,`${scenario.id} still has thin interaction history`);
  let adapted=0;
  for(const role of scenario.roles){
    const room=profile.roles.find(r=>r.role===role);
    assert.ok(room,`${scenario.id} missing inherited role ${role}`);
    assert.strictEqual(room.metadata.originalRole,role,`${scenario.id} must preserve original role ${role}`);
    assert.ok(room.metadata.currentUse,`${scenario.id} must assign current use to ${role}`);
    assert.ok(room.metadata.adaptations.length,`${scenario.id} must record adaptation for ${role}`);
    adapted++;
  }
  assert.ok(adapted>=5,`${scenario.id} needs broad inherited-space adaptation`);
  const generated=moduleMap.generate({...scenario.input,rulesTarget:'open_d20'});
  assert.strictEqual(generated.spatialLayout.validation.ok,true,generated.spatialLayout.validation.errors.join('\n'));
  assert.ok(generated.siteProfile.interactions.some(x=>x.id===scenario.interaction),`${scenario.id} generated artifact lost interaction provenance`);
  assert.ok(generated.content.provenance.siteLayers.includes('cross-layer-interactions'),`${scenario.id} content provenance lost interaction layer`);
}

console.log('site interaction quality regressions: PASS');
console.log(JSON.stringify({cases:cases.length,minimumInteractions:4,minimumAdaptedTemplates:5},null,2));
