(() => {
  'use strict';
  const STORAGE_KEY='hb-ttrpg-universal-npc-profiles-v1';
  const STORAGE_SCHEMA_VERSION='1.0.0';
  const PROFILE_SCHEMA_MAJOR=1;
  const MAX_IMPORT_BYTES=2*1024*1024;
  const MAX_RECORDS=100;
  const CANONICAL_SECTIONS=['appearance','mechanics','socialEconomic','residence','workContext','familyHousehold','personality','motivations','background','affiliationsRelationships','possessionsResources','secretsProblemsHooks'];
  const STATES=new Set(['present','none','unknown','not-applicable']);
  const MODES=new Set(['quick','standard','deep','manual','imported']);

  const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const issue=(code,message,path='/')=>({code,message,path});
  const major=value=>Number(String(value||'').split('.')[0]);
  const now=()=>new Date().toISOString();
  function hash(value){let result=7;for(const character of String(value))result=(result*31+character.charCodeAt(0))%2147483647;return(result||1).toString(16).padStart(8,'0');}

  function validateProfile(profile){
    const errors=[];
    if(!object(profile))return{valid:false,errors:[issue('IMPORT_PROFILE_NOT_OBJECT','Imported profile must be an object.')]};
    if(profile.profileType!=='npcProfile')errors.push(issue('IMPORT_PROFILE_TYPE','profileType must be npcProfile.','/profileType'));
    if(major(profile.schemaVersion)!==PROFILE_SCHEMA_MAJOR)errors.push(issue('IMPORT_SCHEMA_UNSUPPORTED',`Profile schema ${profile.schemaVersion||'missing'} is unsupported.`,'/schemaVersion'));
    if(!/^npc-[a-z0-9][a-z0-9-]{7,63}$/.test(profile.profileId||''))errors.push(issue('IMPORT_PROFILE_ID','Profile ID is invalid.','/profileId'));
    if(!Number.isInteger(profile.revision)||profile.revision<1)errors.push(issue('IMPORT_REVISION','Revision must be a positive integer.','/revision'));
    if(!object(profile.generator)||!profile.generator.seed||!MODES.has(profile.generator.mode))errors.push(issue('IMPORT_GENERATOR','Generator receipt is incomplete.','/generator'));
    if(!object(profile.archetype)||!profile.archetype.id)errors.push(issue('IMPORT_ARCHETYPE','Archetype reference is incomplete.','/archetype'));
    if(!object(profile.identity)||!profile.identity.fullName||!profile.identity.ancestryId)errors.push(issue('IMPORT_IDENTITY','Identity is incomplete.','/identity'));
    if(!object(profile.sections))errors.push(issue('IMPORT_SECTIONS','Sections must be an object.','/sections'));
    for(const id of CANONICAL_SECTIONS){
      const section=profile.sections?.[id];
      if(!object(section)||!STATES.has(section.state))errors.push(issue('IMPORT_SECTION_STATE',`${id} has an invalid section envelope.`,`/sections/${id}`));
      else if(section.state==='present'&&!object(section.data))errors.push(issue('IMPORT_SECTION_DATA',`${id} is present without data.`,`/sections/${id}/data`));
    }
    if(!Array.isArray(profile.locks)||profile.locks.some(pointer=>typeof pointer!=='string'||!pointer.startsWith('/')))errors.push(issue('IMPORT_LOCKS','Locks must be JSON-pointer strings.','/locks'));
    if(!Array.isArray(profile.diagnostics))errors.push(issue('IMPORT_DIAGNOSTICS','Diagnostics must be an array.','/diagnostics'));
    if(!object(profile.provenance)||!Array.isArray(profile.provenance.sourcePackIds))errors.push(issue('IMPORT_PROVENANCE','Provenance is incomplete.','/provenance'));
    return{valid:errors.length===0,errors};
  }

  function emptyCollection(timestamp=now()){
    return{storageType:'npcProfileCollection',schemaVersion:STORAGE_SCHEMA_VERSION,updatedAt:timestamp,records:[]};
  }
  function validateCollection(collection){
    if(!object(collection)||collection.storageType!=='npcProfileCollection')return{valid:false,errors:[issue('STORAGE_COLLECTION_INVALID','Saved-profile collection is invalid.')]};
    if(major(collection.schemaVersion)!==1)return{valid:false,errors:[issue('STORAGE_SCHEMA_UNSUPPORTED',`Storage schema ${collection.schemaVersion} is unsupported.`)]};
    if(!Array.isArray(collection.records))return{valid:false,errors:[issue('STORAGE_RECORDS_INVALID','Saved-profile records must be an array.')]};
    return{valid:true,errors:[]};
  }
  function readCollection(storage,key=STORAGE_KEY){
    try{
      const raw=storage?.getItem?.(key);
      if(!raw)return{collection:emptyCollection(),errors:[]};
      const collection=JSON.parse(raw);
      const validation=validateCollection(collection);
      return validation.valid?{collection,errors:[]}:{collection:emptyCollection(),errors:validation.errors};
    }catch(error){return{collection:emptyCollection(),errors:[issue('STORAGE_READ_FAILED',error.message)]};}
  }
  function writeCollection(storage,collection,key=STORAGE_KEY){
    const validation=validateCollection(collection);
    if(!validation.valid)return{ok:false,errors:validation.errors};
    try{storage?.setItem?.(key,JSON.stringify(collection));return{ok:true,errors:[]};}
    catch(error){return{ok:false,errors:[issue('STORAGE_WRITE_FAILED',error.message)]};}
  }
  function createRecord(profile,options={}){
    const validation=validateProfile(profile);
    if(!validation.valid)return{record:null,errors:validation.errors};
    const timestamp=options.savedAt||now();
    return{record:{recordType:'npcSavedProfile',storageSchemaVersion:STORAGE_SCHEMA_VERSION,recordId:profile.profileId,label:options.label||profile.identity.fullName,savedAt:timestamp,updatedAt:timestamp,profile:clone(profile)},errors:[]};
  }
  function saveProfile(storage,profile,options={}){
    const created=createRecord(profile,options);if(!created.record)return{ok:false,errors:created.errors};
    const read=readCollection(storage,options.key);const collection=read.collection;
    const existing=collection.records.findIndex(record=>record.recordId===created.record.recordId);
    if(existing>=0){created.record.savedAt=collection.records[existing].savedAt;collection.records.splice(existing,1,created.record);}else collection.records.unshift(created.record);
    collection.records.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    collection.records=collection.records.slice(0,Number(options.maxRecords||MAX_RECORDS));
    collection.updatedAt=created.record.updatedAt;
    const written=writeCollection(storage,collection,options.key);
    return{...written,record:created.record,collection,errors:[...read.errors,...written.errors]};
  }
  function listProfiles(storage,options={}){const result=readCollection(storage,options.key);return{records:result.collection.records.map(clone),errors:result.errors};}
  function loadProfile(storage,recordId,options={}){
    const result=readCollection(storage,options.key);const record=result.collection.records.find(item=>item.recordId===recordId);
    if(!record)return{profile:null,record:null,errors:[...result.errors,issue('STORAGE_PROFILE_NOT_FOUND',`Saved profile ${recordId} was not found.`)]};
    const validation=validateProfile(record.profile);return validation.valid?{profile:clone(record.profile),record:clone(record),errors:result.errors}:{profile:null,record:clone(record),errors:[...result.errors,...validation.errors]};
  }
  function deleteProfile(storage,recordId,options={}){
    const result=readCollection(storage,options.key);const before=result.collection.records.length;
    result.collection.records=result.collection.records.filter(item=>item.recordId!==recordId);result.collection.updatedAt=options.timestamp||now();
    const written=writeCollection(storage,result.collection,options.key);
    return{ok:written.ok&&result.collection.records.length<before,collection:result.collection,errors:[...result.errors,...written.errors]};
  }
  function cloneProfile(profile,options={}){
    const validation=validateProfile(profile);if(!validation.valid)return{profile:null,errors:validation.errors};
    const timestamp=options.timestamp||now();const output=clone(profile);
    output.profileId=options.profileId||`npc-clone-${hash(`${profile.profileId}:${timestamp}:${options.salt||''}`)}`;
    output.revision=1;output.createdAt=timestamp;output.updatedAt=timestamp;
    output.provenance=output.provenance||{};output.provenance.createdBy='user';output.provenance.notes=[...(output.provenance.notes||[]),`Cloned from ${profile.profileId}.`];
    return{profile:output,errors:[]};
  }
  function parseImport(text){
    if(typeof text!=='string')return{profile:null,errors:[issue('IMPORT_TEXT_REQUIRED','Import content must be text.')]};
    if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)return{profile:null,errors:[issue('IMPORT_TOO_LARGE',`Import exceeds ${MAX_IMPORT_BYTES} bytes.`)]};
    let parsed;try{parsed=JSON.parse(text);}catch(error){return{profile:null,errors:[issue('IMPORT_JSON_INVALID',error.message)]};}
    const profile=parsed?.recordType==='npcSavedProfile'?parsed.profile:parsed;
    const validation=validateProfile(profile);return validation.valid?{profile:clone(profile),errors:[]}:{profile:null,errors:validation.errors};
  }
  function regenerationConfig(profile,archetype,pack,timestamp=now()){
    const validation=validateProfile(profile);if(!validation.valid)return{config:null,errors:validation.errors};
    return{config:{seed:profile.generator.seed,archetype,pack,mode:profile.generator.mode,mechanicalMode:profile.generator.mechanicalMode||'none',mechanicalOptions:clone(profile.generator.mechanicalOptions||{}),rerollCounters:clone(profile.generator.rerollCounters||{}),locks:clone(profile.locks||[]),previousProfile:clone(profile),profileId:profile.profileId,revision:profile.revision+1,timestamp,options:{identity:{ancestryId:profile.identity.ancestryId,ageBand:profile.identity.ageBand,age:profile.identity.age}}},errors:[]};
  }

  globalThis.NpcProfileGeneratorStorage=Object.freeze({STORAGE_KEY,STORAGE_SCHEMA_VERSION,PROFILE_SCHEMA_MAJOR,MAX_IMPORT_BYTES,MAX_RECORDS,CANONICAL_SECTIONS,clone,validateProfile,emptyCollection,validateCollection,readCollection,writeCollection,createRecord,saveProfile,listProfiles,loadProfile,deleteProfile,cloneProfile,parseImport,regenerationConfig});
})();
