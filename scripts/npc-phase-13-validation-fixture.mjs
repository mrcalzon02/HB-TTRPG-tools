import vm from 'node:vm';
import {
  root,rel,read,json,Rules,Core,Exporter,clone,same,basePack,baseArchetypes
} from './npc-phase-11-validation-fixture.mjs';

for(const file of[
  'npc-profile-generator-group-data.js',
  'npc-group-generator-foundation.js',
  'npc-group-generator-core.js'
])vm.runInThisContext(read(file),{filename:file});

export{root,rel,read,json,Rules,Core,Exporter,clone,same,basePack,baseArchetypes};
export const GroupData=globalThis.NpcProfileGeneratorGroupData;
export const Foundation=globalThis.NpcGroupGeneratorFoundation;
export const GroupCore=globalThis.NpcGroupGeneratorCore;
export const fixture=json('data/npc-generator/fixtures/phase-13-group-matrix.json');
export const groupSchema=json(fixture.schema);
export const templateDocument=json(fixture.templates);
export const tableDocument=json(fixture.tables);
export const ledger=json('data/npc-generator/phase-status.json');
export const groupData=GroupData.normalize(templateDocument,tableDocument);
export const groupPack=GroupData.extendPack(basePack,groupData);

export function generateGroup(templateId,seed,extra={}){
  return GroupCore.generateGroup({
    templateId,seed,groupData,pack:groupPack,archetypes:baseArchetypes,
    timestamp:fixture.timestamp,mode:'standard',mechanicalMode:'none',
    ...extra
  });
}
export function setPath(target,path,value){
  const parts=String(path).split('.');let cursor=target;
  for(let index=0;index<parts.length-1;index+=1){const key=/^\d+$/.test(parts[index])?Number(parts[index]):parts[index];cursor=cursor[key];}
  const last=/^\d+$/.test(parts.at(-1))?Number(parts.at(-1)):parts.at(-1);cursor[last]=clone(value);return target;
}
