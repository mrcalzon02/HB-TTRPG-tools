import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const rel=value=>path.join(root,value);
export const read=value=>fs.readFileSync(rel(value),'utf8');
export const json=value=>JSON.parse(read(value));

for(const file of[
  'npc-profile-generator-random.js',
  'npc-profile-generator-rules-core.js',
  'npc-profile-generator-rules-validation.js',
  'npc-generator-foundation.js',
  'npc-generator-compose.js',
  'npc-generator-mechanics.js',
  'npc-profile-generator-core.js'
])vm.runInThisContext(read(file),{filename:file});

export const Rules=globalThis.NpcProfileRules;
export const Foundation=globalThis.NpcProfileGeneratorFoundation;
export const Mechanics=globalThis.NpcProfileGeneratorMechanics;
export const Core=globalThis.NpcProfileGeneratorCore;
export const fixture=json('data/npc-generator/fixtures/phase-9-mechanics-matrix.json');
export const policies=json('data/npc-generator/archetypes/wave-a-policies.json');
export const ledger=json('data/npc-generator/phase-status.json');
const names=json('data/npc-generator/names/core-fantasy-names.json');
const ancestries=json('data/npc-generator/ancestries/core-fantasy.json');
const coreTables=json('data/npc-generator/tables/core-profile-tables.json');
const operational=json('data/npc-generator/tables/wave-a-operational-tables.json');
const mechanicsCore=json('data/npc-generator/mechanics/open-d20-core.json');
const packageManifest=json('data/npc-generator/mechanics/archetype-packages.json');

export const pack={
  packId:'generic-fantasy-core',version:'0.1.0',tables:{},
  sectionFields:coreTables.sectionFields||{},ageRanges:ancestries.ageRanges||{},
  mechanicsCore,mechanicalPackages:{},mechanicalLevelGuidance:{}
};
for(const source of[names.tables,ancestries.tables,coreTables.tables,operational.tables])
  for(const[id,entries]of Object.entries(source||{}))pack.tables[id]=entries;
for(const name of packageManifest.componentFiles){
  const component=json(`data/npc-generator/mechanics/${name}`);
  Object.assign(pack.mechanicalPackages,component.packages||{});
  Object.assign(pack.mechanicalLevelGuidance,component.levelGuidance||{});
}

export const packageCount=packageManifest.packageCount;
export const clone=value=>JSON.parse(JSON.stringify(value));
export const mechanicsData=profile=>profile.sections?.mechanics?.data||null;
export function withoutMechanics(profile){const sections=clone(profile.sections||{});delete sections.mechanics;return sections;}
export function generate(archetype,seed,mechanicalMode,mechanicalOptions={},extra={}){
  return Core.generateProfile({
    seed,archetype,pack,mode:'standard',mechanicalMode,
    mechanicalOptions:{mode:mechanicalMode,levelMode:'appropriate',...mechanicalOptions},
    timestamp:fixture.timestamp,...extra
  });
}
