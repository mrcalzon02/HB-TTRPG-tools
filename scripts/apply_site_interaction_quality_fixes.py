#!/usr/bin/env python3
from pathlib import Path

module_path = Path('module-map-generator.js')
test_path = Path('tests/site-interaction-quality-regressions.test.js')
text = module_path.read_text()

old = """if(archetype==='mansion'&&irregular.includes(controller)){\n mutate('mansion-irregular-occupation',['receiving-hall','salon'],'gang common / negotiation and feasting space','formal social rooms become public occupation centers',['repurposed-use','social']);\n mutate('mansion-irregular-occupation',['study'],'planning / ledger / intelligence room','private owner workspace becomes occupier command support',['evidence','objective']);\n mutate('mansion-irregular-occupation',['private-chambers'],'bunks, hostage room, or sorted-loot quarters','private household rooms are partitioned around occupier needs',['private','subdivided']);\n}\nif(archetype==='fortress'&&['refugees','squatters','civilian-residents','mixed-settlement'].includes(controller)){\n"""

new = """if(['mansion','manor'].includes(archetype)&&irregular.includes(controller)){\n mutate('mansion-irregular-occupation',['receiving-hall','salon'],'gang common / negotiation and feasting space','formal social rooms become public occupation centers',['repurposed-use','social']);\n mutate('mansion-irregular-occupation',['study'],'planning / ledger / intelligence room','private owner workspace becomes occupier command support',['evidence','objective']);\n mutate('mansion-irregular-occupation',['private-chambers'],'bunks, hostage room, or sorted-loot quarters','private household rooms are partitioned around occupier needs',['private','subdivided']);\n if(archetype==='manor'){\n  mutate('manor-irregular-estate-use',['estate-office'],'fence ledger / tribute and route office','estate administration is reused to track contraband, debts, patrols, and local pressure',['evidence','objective']);\n  mutate('manor-irregular-estate-use',['formal-garden','grounds-storage'],'concealed exchange yard / dispersed stash grounds','landscaped estate grounds become screened meeting, lookout, and distributed storage space',['secret','security','treasure']);\n }\n}\nif(archetype==='bunkhouse_compound'&&controller==='plague-survivors'&&['quarantined','occupied','overcrowded','reclaimed'].includes(a.occupancyState)){\n mutate('bunkhouse-quarantine-reoccupation',['assembly-yard'],'triage, exposure-screening, and controlled queue yard','open work ground is divided into intake lanes, symptom screening, clean/dirty routes, and guarded waiting areas',['quarantine','medical','controlled']);\n mutate('bunkhouse-quarantine-reoccupation',['bunkhouse'],'cohort isolation ward / household quarantine bunk','shared sleeping quarters are partitioned into exposure cohorts with improvised isolation boundaries',['quarantine','medical','subdivided']);\n mutate('bunkhouse-quarantine-reoccupation',['compound-mess','compound-kitchen'],'controlled relief kitchen / ration dispensary','communal food service becomes rationed low-contact distribution with clean-store separation',['service','medical','controlled']);\n mutate('bunkhouse-quarantine-reoccupation',['washhouse'],'decontamination and fever-wash station','wash infrastructure is intensified for clothing boil, body washing, and contaminated runoff handling',['medical','hazard','service']);\n mutate('bunkhouse-quarantine-reoccupation',['sergeant-office'],'quarantine registry / case tracking office','supervisory paperwork space becomes exposure registry, treatment log, and household movement control',['evidence','objective','medical']);\n mutate('bunkhouse-quarantine-reoccupation',['communal-pantry','great-hearth'],'protected clean provisions / distanced warming ward','halfling hospitality infrastructure survives but is reorganized around protected food and separated communal care',['cultural-continuity','medical','social']);\n}\nif(archetype==='hideout'&&irregular.includes(controller)){\n mutate('hideout-irregular-occupation',['concealed-entry','watch-post'],'layered countersurveillance and ambush choke','existing concealment is reinforced with rotating lookouts, challenge points, false approaches, and trap-ready observation',['security','secret','controlled']);\n mutate('hideout-irregular-occupation',['hideout-common'],'fence, negotiation, and crew common','shared refuge space becomes the social center for dividing proceeds, recruiting, and receiving trusted contacts',['social','criminal']);\n mutate('hideout-irregular-occupation',['planning-room'],'raid-route and intelligence table','planning space accumulates maps, patrol timings, debt records, targets, and fallback routes',['evidence','objective']);\n mutate('hideout-irregular-occupation',['hidden-cache'],'distributed contraband and emergency reserve','the original cache is reorganized into fast-grab stores and compartmentalized illicit stock',['treasure','secret']);\n mutate('hideout-irregular-occupation',['escape-route','utility-crawlway'],'mapped smuggling bypass / winter escape path','existing escape and service passages are actively maintained as concealed movement routes',['secret','exit','transit']);\n}\nif(archetype==='civic_building'&&controller==='rebels'){\n mutate('civic-rebel-occupation',['public-lobby','public-service'],'volunteer intake, aid distribution, and barricaded public commons','public-facing civic space becomes a defended contact point for civilians, couriers, supplies, and recruits',['public','social','security']);\n mutate('civic-rebel-occupation',['council-chamber'],'rebel assembly / command council','formal civic deliberation space is reused for operational planning, political debate, and local coordination',['objective','evidence','social']);\n mutate('civic-rebel-occupation',['administrative-office','public-records'],'intelligence, maps, and surviving civil-record archive','bureaucratic records are mined for routes, identities, infrastructure knowledge, sympathizers, and occupation evidence',['evidence','restricted']);\n mutate('civic-rebel-occupation',['secure-office'],'armory, secure communications, and courier safe room','preexisting secure office construction is reused for weapons, radios, codes, and trusted messengers',['security','treasure','restricted']);\n mutate('civic-rebel-occupation',['civic-service'],'generator, repair, and emergency logistics support','building service infrastructure is jury-rigged to keep power, water, fortifications, and field equipment functioning',['service','industrial','condition-degraded']);\n}\nif(archetype==='fortress'&&['refugees','squatters','civilian-residents','mixed-settlement'].includes(controller)){\n"""

if text.count(old) != 1:
    raise SystemExit(f'expected one interaction insertion target, found {text.count(old)}')
module_path.write_text(text.replace(old, new, 1))

quality_test = r"""'use strict';
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
"""

test_path.write_text(quality_test)
print('site interaction quality fixes applied')
