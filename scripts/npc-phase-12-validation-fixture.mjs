import crypto from 'node:crypto';
import vm from 'node:vm';
import {
  root,rel,read,json,Rules,Core,Exporter,clone,same,basePack,baseArchetypes
} from './npc-phase-11-validation-fixture.mjs';

for(const file of[
  'npc-profile-generator-kaysender-data.js',
  'npc-profile-generator-kaysender-adapter.js'
])vm.runInThisContext(read(file),{filename:file});

export{root,rel,read,json,Rules,Core,Exporter,clone,same,basePack,baseArchetypes};
export const Data=globalThis.NpcProfileGeneratorKaysenderData;
export const Adapter=globalThis.NpcProfileGeneratorKaysenderAdapter;
export const fixture=json('data/npc-generator/fixtures/phase-12-kaysender-matrix.json');
export const inventory=json(fixture.capabilityInventory);
export const compatibility=json(fixture.compatibilityPack);
export const legacySchema=json(fixture.legacySchema);
export const manifest=json(fixture.manifest);
export const bandParts=fixture.bandPacks.map(json);
export const ledger=json('data/npc-generator/phase-status.json');
export const data=Data.normalizeSources(compatibility,manifest,bandParts);
export const extendedPack=Data.extendPack(basePack,data);

export function gitBlobSha(path){
  const content=Buffer.from(read(path),'utf8');
  return crypto.createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}
export function generateRecord(seed,options={},extra={}){
  return Adapter.generateRecord(data,options,{seed,timestamp:fixture.timestamp,...extra});
}
export function generateUniversal(record,depth='standard',extra={}){
  return Adapter.toUniversalProfile(record,data,{pack:extendedPack,archetypes:baseArchetypes,mode:depth,...extra});
}
export function legacyCard(record){
  return{name:record.identity.fullName,occupation:record.occupation,extraClass:record.presentation.extraClass,rows:record.legacyRows.map(row=>[row.label,row.value])};
}
