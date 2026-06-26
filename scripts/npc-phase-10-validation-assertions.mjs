import { Exporter,Storage,fixture,read,json } from './npc-phase-10-validation-fixture.mjs';

export const same=(left,right)=>Exporter.stable(left)===Exporter.stable(right);

export function pointerGet(target,pointer){
  if(pointer===''||pointer==='/')return target;
  return String(pointer).slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~')).reduce((value,key)=>value==null?undefined:value[key],target);
}

export function assertStaticContracts(fail){
  const schema=json('data/schemas/npc-profile.schema.json');
  const generator=schema.$defs?.generatorReceipt?.properties||{};
  for(const field of['householdGeneratorVersion','operationGeneratorVersion','mechanicalMode','mechanicalOptions'])if(!generator[field])fail(`Schema generator receipt is missing ${field}.`);
  if(!schema.$defs?.sectionEnvelope?.properties?.operationModule)fail('Schema section envelope is missing operationModule metadata.');
  const extensionPattern=schema.$defs?.profileSections?.properties?.extensions?.propertyNames?.pattern||'';
  if(!extensionPattern.includes('A-Z'))fail('Schema extension IDs do not permit camelCase operation identifiers.');
  const diagnostic=schema.$defs?.diagnostic?.properties||{};
  for(const field of['tableId','pointer','archetypeId','targetKind','minimum','maximum','cycle'])if(!diagnostic[field])fail(`Schema diagnostic contract is missing ${field}.`);

  const entry=read('npc-profile-generator-entry.js');
  for(const script of['npc-profile-generator-storage.js','npc-profile-generator-export.js','npc-profile-generator-persistence-ui.js','npc-profile-generator-persistence-restore.js'])if(!entry.includes(script))fail(`NPC entrypoint does not load ${script}.`);
  const ui=read('npc-profile-generator-persistence-ui.js');
  for(const id of fixture.requiredUiControls)if(!ui.includes(id))fail(`Persistence interface control ${id} is missing.`);
  const css=read('npc-profile-generator-persistence.css');
  if(!css.includes('.npc-profile-manager')||!css.includes('@media print'))fail('Persistence manager styles or print exclusion are missing.');
}

export function assertPreserved(original,regenerated,fail,label){
  for(const pointer of fixture.preservedPaths){
    if(!same(pointerGet(original,pointer),pointerGet(regenerated,pointer)))fail(`${label}: regeneration changed ${pointer}.`);
  }
}

export function verifyExports(profile,fail,label){
  let count=0;
  const jsonText=Exporter.canonicalJson(profile);
  const jsonAgain=Exporter.canonicalJson(profile);
  if(jsonText!==jsonAgain)fail(`${label}: canonical JSON is not stable.`);
  const parsed=Storage.parseImport(jsonText);
  if(!parsed.profile||!same(parsed.profile,profile))fail(`${label}: canonical JSON round trip changed the profile.`);
  else count+=1;

  const text=Exporter.readableText(profile);
  for(const token of[profile.identity.fullName,profile.profileId,profile.generator.seed,'GENERATION RECEIPT'])if(!text.includes(token))fail(`${label}: readable text is missing ${token}.`);
  if(!text.endsWith('\n'))fail(`${label}: readable text lacks a terminal newline.`);
  count+=1;

  const markdown=Exporter.markdown(profile);
  for(const token of[`# ${profile.identity.fullName}`,profile.profileId,profile.generator.seed,'## Generation Receipt'])if(!markdown.includes(token))fail(`${label}: Markdown is missing ${token}.`);
  if(!markdown.endsWith('\n'))fail(`${label}: Markdown lacks a terminal newline.`);
  count+=1;
  return count;
}

export function verifyInvalidImports(profile,fail){
  const malformed=Storage.parseImport('{');
  if(malformed.profile||!malformed.errors.some(item=>item.code==='IMPORT_JSON_INVALID'))fail('Malformed JSON was not rejected.');

  const future={...Storage.clone(profile),schemaVersion:'2.0.0'};
  const futureResult=Storage.parseImport(JSON.stringify(future));
  if(futureResult.profile||!futureResult.errors.some(item=>item.code==='IMPORT_SCHEMA_UNSUPPORTED'))fail('Future profile schema was not rejected.');

  const missing=Storage.clone(profile);delete missing.sections;
  const missingResult=Storage.parseImport(JSON.stringify(missing));
  if(missingResult.profile||!missingResult.errors.some(item=>item.code==='IMPORT_SECTIONS'))fail('Profile without sections was not rejected.');

  const oversize=Storage.parseImport('x'.repeat(Storage.MAX_IMPORT_BYTES+1));
  if(oversize.profile||!oversize.errors.some(item=>item.code==='IMPORT_TOO_LARGE'))fail('Oversized import was not rejected before parsing.');

  const wrapped={recordType:'npcSavedProfile',storageSchemaVersion:'2.0.0',profile};
  const wrappedResult=Storage.parseImport(JSON.stringify(wrapped));
  if(wrappedResult.profile||!wrappedResult.errors.some(item=>item.code==='IMPORT_STORAGE_SCHEMA_UNSUPPORTED'))fail('Future saved-record wrapper was not rejected.');
}
