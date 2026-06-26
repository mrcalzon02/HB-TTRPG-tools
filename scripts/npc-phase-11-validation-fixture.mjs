import vm from 'node:vm';
import {
  root,rel,read,json,Rules,Core,Exporter,pack as sourcePack,policies,MemoryStorage,clone,same
} from './npc-phase-10-validation-fixture.mjs';

for(const file of[
  'npc-profile-generator-pack-validator.js',
  'npc-profile-generator-pack-manager.js',
  'npc-profile-generator-pack-storage.js'
])vm.runInThisContext(read(file),{filename:file});

export{root,rel,read,json,Rules,Core,Exporter,MemoryStorage,clone,same};
export const Validator=globalThis.NpcProfileGeneratorPackValidator;
export const Manager=globalThis.NpcProfileGeneratorPackManager;
export const PackStorage=globalThis.NpcProfileGeneratorPackStorage;
export const fixture=json('data/npc-generator/fixtures/phase-11-pack-matrix.json');
export const validPack=json(fixture.validFixture);
export const invalidCases=json(fixture.invalidFixture);
export const ledger=json('data/npc-generator/phase-status.json');
export const basePack=clone(sourcePack);
export const baseArchetypes=clone(policies.archetypes);

function decode(pointer){return String(pointer).slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));}
export function pointerGet(target,pointer){return decode(pointer).reduce((value,key)=>value==null?undefined:value[key],target);}
export function pointerSet(target,pointer,value){
  const parts=decode(pointer);let cursor=target;
  for(let index=0;index<parts.length-1;index+=1){
    const key=parts[index];
    if(cursor[key]===undefined||cursor[key]===null)cursor[key]=/^\d+$/.test(parts[index+1])?[]:{};
    cursor=cursor[key];
  }
  cursor[parts.at(-1)]=clone(value);return target;
}
export function applyMutations(source,mutations){
  const output=clone(source);
  for(const mutation of mutations||[]){
    const value=mutation.copyFrom?pointerGet(output,mutation.copyFrom):mutation.value;
    pointerSet(output,mutation.path,value);
  }
  return output;
}
export function resolveCustom(merged){return Rules.resolveArchetype(fixture.customArchetypeId,merged.archetypes);}
export function generateCustom(merged,seed,depth='deep',extra={}){
  const resolved=resolveCustom(merged);
  if(!resolved.valid)throw new Error(`Custom archetype failed resolution: ${resolved.diagnostics.map(item=>item.code).join(', ')}`);
  return Core.generateProfile({
    seed,
    archetype:resolved.archetype,
    pack:merged.pack,
    mode:depth,
    mechanicalMode:fixture.mechanicalMode,
    mechanicalOptions:{mode:fixture.mechanicalMode,levelMode:'appropriate'},
    timestamp:fixture.timestamp,
    options:{identity:{ancestryId:fixture.customAncestryId,ageBand:'adult'}},
    ...extra
  });
}
