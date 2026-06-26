import { read,json,fixture,basePack,baseArchetypes,Exporter } from './npc-phase-11-validation-fixture.mjs';

export const same=(left,right)=>Exporter.stable(left)===Exporter.stable(right);
const has=value=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);

export function assertStaticContracts(fail){
  const customSchema=json('data/schemas/npc-custom-pack.schema.json');
  if(customSchema.properties?.packType?.const!=='npcCustomPack')fail('Custom-pack schema does not require npcCustomPack.');
  for(const field of['names','ancestries','tables','tableExtensions','archetypes','operationModules','mechanicalPackages','levelGuidance'])if(!customSchema.properties?.[field])fail(`Custom-pack schema is missing ${field}.`);
  if(!customSchema.$defs?.tableId?.pattern?.includes('A-Z'))fail('Custom-pack schema table IDs do not permit existing camelCase table names.');

  const migration=read('scripts/migrate-npc-custom-pack-phase-11.mjs');
  const profileSchema=json('data/schemas/npc-profile.schema.json');
  const hasCustomPackReceipt=Boolean(profileSchema.$defs?.generatorReceipt?.properties?.customPackIds);
  if(!hasCustomPackReceipt&&!migration.includes('customPackIds'))fail('Profile schema and migration are both missing generator customPackIds.');
  const archetypeSchema=json('data/schemas/npc-archetype.schema.json');
  const permitsCustom=archetypeSchema.properties?.implementationWave?.enum?.includes('custom');
  if(!permitsCustom&&!migration.includes("wave.includes('custom')"))fail('Archetype schema and migration do not permit custom implementation wave.');

  const entry=read('npc-profile-generator-entry.js');
  const restore=read('npc-profile-generator-persistence-restore.js');
  const bootstrap=read('npc-profile-generator-pack-bootstrap.js');
  const scripts=['npc-profile-generator-pack-validator.js','npc-profile-generator-pack-manager.js','npc-profile-generator-pack-storage.js','npc-profile-generator-pack-ui.js'];
  const direct=scripts.every(script=>entry.includes(script))&&entry.includes('NpcProfileGeneratorPackUI.enrich(workspace)');
  const bootstrapped=restore.includes('npc-profile-generator-pack-bootstrap.js')&&scripts.every(script=>bootstrap.includes(script))&&bootstrap.includes('NpcProfileGeneratorPackUI.enrich(workspace)');
  if(!direct&&!bootstrapped)fail('NPC workspace does not load and apply the custom-pack runtime.');

  const ui=read('npc-profile-generator-pack-ui.js');
  for(const id of fixture.requiredUiControls)if(!ui.includes(id))fail(`Custom-pack UI control ${id} is missing.`);
  const css=read('npc-profile-generator-pack.css');
  if(!css.includes('.npc-pack-manager')||!css.includes('@media print'))fail('Custom-pack manager styles or print exclusion are missing.');
}

export function assertMergedPack(merged,validPack,fail){
  if(same(merged.pack,basePack))fail('Valid custom pack produced no merged runtime changes.');
  if(merged.archetypes.length!==baseArchetypes.length+validPack.archetypes.length)fail('Custom archetype count was not merged.');
  for(const[name,entries]of Object.entries(validPack.names||{}))for(const entry of entries)if(!merged.pack.tables?.[name]?.includes(entry))fail(`Name extension ${name}:${entry} is missing.`);
  for(const id of Object.keys(validPack.tables||{}))if(!same(merged.pack.tables?.[id],validPack.tables[id]))fail(`New table ${id} is missing or changed.`);
  for(const[id,entries]of Object.entries(validPack.tableExtensions||{}))for(const entry of entries)if(!merged.pack.tables?.[id]?.includes(entry))fail(`Table extension ${id}:${entry} is missing.`);
  for(const ancestry of validPack.ancestries||[]){
    if(!merged.pack.tables?.ancestries?.includes(ancestry.id))fail(`Custom ancestry ${ancestry.id} is missing from selection table.`);
    if(!same(merged.pack.ancestryRules?.[ancestry.id]?.adultThreshold,ancestry.householdRule.adultThreshold))fail(`Custom ancestry ${ancestry.id} rule is missing.`);
  }
  for(const archetype of validPack.archetypes||[])if(!merged.archetypes.some(item=>item.id===archetype.id))fail(`Custom archetype ${archetype.id} is missing.`);
  for(const id of Object.keys(validPack.operationModules||{}))if(!merged.pack.operationModules?.[id])fail(`Custom operation module ${id} is missing.`);
  for(const id of Object.keys(validPack.mechanicalPackages||{}))if(!merged.pack.mechanicalPackages?.[id])fail(`Custom mechanical package ${id} is missing.`);
  if(!merged.pack.activeCustomPackIds?.includes(validPack.packId))fail('Active custom-pack IDs do not include the applied pack.');
}

export function assertCustomProfile(profile,depth,validPack,fail,label){
  if(profile.identity?.ancestryId!==fixture.customAncestryId)fail(`${label}: custom ancestry was not preserved.`);
  if(!profile.generator?.customPackIds?.includes(validPack.packId))fail(`${label}: generation receipt is missing custom pack ID.`);
  if(!profile.provenance?.sourcePackIds?.includes(basePack.packId)||!profile.provenance?.sourcePackIds?.includes(validPack.packId))fail(`${label}: provenance is missing base or custom pack.`);
  const extension=profile.sections?.extensions?.winterPatrol;
  if(extension?.state!=='present')fail(`${label}: winterPatrol extension is absent.`);
  for(const field of['station','duty','patrolArea'])if(!has(extension?.data?.[field]))fail(`${label}: winterPatrol.${field} is missing.`);
  if(depth==='quick'){
    if(extension?.operationModule)fail(`${label}: Quick profile contains operation enrichment marker.`);
    for(const field of[...fixture.expectedStandardOperationFields,...fixture.expectedDeepOperationFields])if(field in(extension?.data||{}))fail(`${label}: Quick profile contains ${field}.`);
  }else{
    for(const field of fixture.expectedStandardOperationFields)if(!has(extension?.data?.[field]))fail(`${label}: Standard operation field ${field} is missing.`);
    if(depth==='standard')for(const field of fixture.expectedDeepOperationFields)if(field in(extension?.data||{}))fail(`${label}: Deep field ${field} appears in Standard mode.`);
    if(depth==='deep')for(const field of fixture.expectedDeepOperationFields)if(!has(extension?.data?.[field]))fail(`${label}: Deep operation field ${field} is missing.`);
  }
  const mechanics=profile.sections?.mechanics?.data;
  if(mechanics?.classLabel!=='Ranger'||mechanics?.role!=='frontier patrol specialist')fail(`${label}: custom mechanical package identity is incorrect.`);
  if(!Number.isInteger(mechanics?.level)||mechanics.level<1||mechanics.level>8)fail(`${label}: custom mechanical level is outside 1-8.`);
}
