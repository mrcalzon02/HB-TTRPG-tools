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
  'npc-generator-household-core.js',
  'npc-generator-household-records.js',
  'npc-generator-relationship-records.js',
  'npc-generator-household.js',
  'npc-generator-operations.js',
  'npc-generator-mechanics.js',
  'npc-profile-generator-core.js',
  'npc-profile-generator-storage.js',
  'npc-profile-generator-export.js',
  'npc-profile-generator-depth-data.js',
  'npc-profile-generator-household-data.js',
  'npc-profile-generator-operation-data.js',
  'npc-profile-generator-mechanics-data.js'
])vm.runInThisContext(read(file),{filename:file});

export const Rules=globalThis.NpcProfileRules;
export const Core=globalThis.NpcProfileGeneratorCore;
export const Storage=globalThis.NpcProfileGeneratorStorage;
export const Exporter=globalThis.NpcProfileGeneratorExport;
export const DepthData=globalThis.NpcProfileGeneratorDepthData;
export const HouseholdData=globalThis.NpcProfileGeneratorHouseholdData;
export const OperationData=globalThis.NpcProfileGeneratorOperationData;
export const MechanicsData=globalThis.NpcProfileGeneratorMechanicsData;
export const fixture=json('data/npc-generator/fixtures/phase-10-round-trip-matrix.json');
export const policies=json('data/npc-generator/archetypes/wave-a-policies.json');
export const ledger=json('data/npc-generator/phase-status.json');

const manifest=json('data/npc-generator/packs/generic-fantasy-core.json');
const names=json('data/npc-generator/names/core-fantasy-names.json');
const ancestries=json('data/npc-generator/ancestries/core-fantasy.json');
const coreTables=json('data/npc-generator/tables/core-profile-tables.json');
const operational=json('data/npc-generator/tables/wave-a-operational-tables.json');

export const pack={
  packId:manifest.packId,version:manifest.version,tables:{},
  ageRanges:ancestries.ageRanges||{},sectionFields:{}
};
for(const source of[names.tables,ancestries.tables,coreTables.tables,operational.tables])
  for(const[id,entries]of Object.entries(source||{}))pack.tables[id]=entries;
for(const[id,fields]of Object.entries(coreTables.sectionFields||{}))pack.sectionFields[id]=[...fields];

DepthData.mergeTables(pack,[
  json('data/npc-generator/tables/deep-identity-tables.json'),
  json('data/npc-generator/tables/deep-appearance-tables.json'),
  json('data/npc-generator/tables/deep-personality-tables.json'),
  json('data/npc-generator/tables/deep-motivation-tables.json'),
  json('data/npc-generator/tables/deep-background-tables.json')
]);
HouseholdData.merge(pack,[
  json('data/npc-generator/tables/ancestry-household-rules.json'),
  json('data/npc-generator/tables/household-status-tables.json'),
  json('data/npc-generator/tables/household-obligation-tables.json'),
  json('data/npc-generator/tables/relationship-network-tables.json')
]);
OperationData.merge(pack,[
  json('data/npc-generator/operations/civilian-commercial.json'),
  json('data/npc-generator/operations/authority-military.json'),
  json('data/npc-generator/operations/criminal-marginalized.json'),
  json('data/npc-generator/operations/elite.json')
]);
MechanicsData.merge(pack,[
  json('data/npc-generator/mechanics/open-d20-core.json'),
  json('data/npc-generator/mechanics/archetype-packages.json'),
  json('data/npc-generator/mechanics/civilian-commercial-packages.json'),
  json('data/npc-generator/mechanics/authority-military-packages.json'),
  json('data/npc-generator/mechanics/street-elite-packages.json')
]);

export class MemoryStorage{
  constructor(){this.values=new Map();}
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
  clear(){this.values.clear();}
}
export const clone=value=>JSON.parse(JSON.stringify(value));
export const same=(left,right)=>Exporter.stable(left)===Exporter.stable(right);
export function generate(archetypeId,index=0,extra={}){
  const resolved=Rules.resolveArchetype(archetypeId,policies.archetypes);
  if(!resolved.valid)throw new Error(`${archetypeId} could not be resolved.`);
  return Core.generateProfile({
    seed:`phase10:${archetypeId}:${index}`,
    archetype:resolved.archetype,
    pack,
    mode:fixture.generationMode,
    mechanicalMode:fixture.mechanicalMode,
    mechanicalOptions:{mode:fixture.mechanicalMode,levelMode:'appropriate'},
    timestamp:fixture.timestamp,
    locks:['/identity/fullName','/sections/mechanics/data/level'],
    ...extra
  });
}
