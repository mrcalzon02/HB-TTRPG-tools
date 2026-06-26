(() => {
  'use strict';
  const Validator=globalThis.NpcProfileGeneratorPackValidator;
  const Manager=globalThis.NpcProfileGeneratorPackManager;
  if(!Validator||!Manager)throw new Error('Custom pack validator and manager must load before pack storage.');
  const STORAGE_KEY='hb-ttrpg-universal-npc-custom-packs-v1';
  const STORAGE_VERSION='1.0.0';
  const MAX_PACK_BYTES=2*1024*1024;
  const MAX_PACKS=25;
  const clone=Validator.clone;
  const issue=Validator.diagnostic;

  function emptyCollection(timestamp=new Date().toISOString()){
    return{storageType:'npcCustomPackCollection',schemaVersion:STORAGE_VERSION,updatedAt:timestamp,records:[]};
  }
  function readCollection(storage,key=STORAGE_KEY){
    try{
      const raw=storage?.getItem?.(key);
      if(!raw)return{collection:emptyCollection(),diagnostics:[]};
      const parsed=JSON.parse(raw);
      if(parsed?.storageType!=='npcCustomPackCollection'||Validator.major(parsed.schemaVersion)!==1||!Array.isArray(parsed.records))return{collection:emptyCollection(),diagnostics:[issue('CUSTOM_PACK_STORAGE_INVALID','error','Stored custom-pack collection is invalid.')]};
      return{collection:parsed,diagnostics:[]};
    }catch(error){return{collection:emptyCollection(),diagnostics:[issue('CUSTOM_PACK_STORAGE_READ_FAILED','error',error.message)]};}
  }
  function writeCollection(storage,collection,key=STORAGE_KEY){
    try{storage?.setItem?.(key,JSON.stringify(collection));return{ok:true,diagnostics:[]};}
    catch(error){return{ok:false,diagnostics:[issue('CUSTOM_PACK_STORAGE_WRITE_FAILED','error',error.message)]};}
  }
  function listPacks(storage,options={}){
    const read=readCollection(storage,options.key);
    return{packs:read.collection.records.map(record=>clone(record.pack)),records:clone(read.collection.records),diagnostics:read.diagnostics};
  }
  function savePack(storage,customPack,options={}){
    const read=readCollection(storage,options.key);const collection=read.collection;
    const timestamp=options.timestamp||new Date().toISOString();
    const record={recordType:'npcCustomPackRecord',recordId:customPack.packId,installedAt:timestamp,updatedAt:timestamp,pack:clone(customPack)};
    const existing=collection.records.findIndex(item=>item.recordId===record.recordId);
    if(existing>=0){record.installedAt=collection.records[existing].installedAt;collection.records.splice(existing,1,record);}else collection.records.push(record);
    collection.records=collection.records.slice(-Number(options.maxPacks||MAX_PACKS));collection.updatedAt=timestamp;
    const written=writeCollection(storage,collection,options.key);
    return{...written,collection,record,diagnostics:[...read.diagnostics,...written.diagnostics]};
  }
  function dependentPacks(records,packId){return(records||[]).filter(record=>(record.pack.dependencies||[]).some(dependency=>dependency.packId===packId&&!dependency.optional));}
  function removePack(storage,packId,options={}){
    const read=readCollection(storage,options.key);const dependents=dependentPacks(read.collection.records,packId);
    if(dependents.length)return{ok:false,collection:read.collection,diagnostics:[...read.diagnostics,issue('CUSTOM_PACK_DEPENDENTS','error',`${packId} is required by ${dependents.map(item=>item.recordId).join(', ')}.`)]};
    const before=read.collection.records.length;
    read.collection.records=read.collection.records.filter(record=>record.recordId!==packId);
    read.collection.updatedAt=options.timestamp||new Date().toISOString();
    const written=writeCollection(storage,read.collection,options.key);
    return{ok:written.ok&&read.collection.records.length<before,collection:read.collection,diagnostics:[...read.diagnostics,...written.diagnostics]};
  }
  function parsePack(text){
    if(typeof text!=='string')return{pack:null,diagnostics:[issue('CUSTOM_PACK_TEXT_REQUIRED','error','Custom pack import must be text.')]};
    if(new TextEncoder().encode(text).length>MAX_PACK_BYTES)return{pack:null,diagnostics:[issue('CUSTOM_PACK_TOO_LARGE','error',`Custom pack exceeds ${MAX_PACK_BYTES} bytes.`)]};
    try{return{pack:JSON.parse(text),diagnostics:[]};}
    catch(error){return{pack:null,diagnostics:[issue('CUSTOM_PACK_JSON_INVALID','error',error.message)]};}
  }
  function candidatePackList(installed,input,maxPacks=MAX_PACKS){
    const candidates=(installed||[]).map(clone);
    const existing=candidates.findIndex(pack=>pack.packId===input.packId);
    if(existing>=0)candidates.splice(existing,1,clone(input));
    else candidates.push(clone(input));
    return candidates.slice(-Number(maxPacks||MAX_PACKS));
  }
  function installPack(storage,basePack,baseArchetypes,input,options={}){
    if(!input||typeof input!=='object'||Array.isArray(input))return{ok:false,valid:false,pack:clone(basePack),archetypes:clone(baseArchetypes||[]),appliedPacks:[],diagnostics:[issue('CUSTOM_PACK_NOT_OBJECT','error','Custom pack must be a JSON object.')]};
    const installed=listPacks(storage,options);
    const candidates=candidatePackList(installed.packs,input,options.maxPacks);
    const rebuilt=Manager.rebuild(basePack,baseArchetypes,candidates,options);
    if(!rebuilt.valid)return{ok:false,...rebuilt,diagnostics:[...installed.diagnostics,...rebuilt.diagnostics]};
    const saved=savePack(storage,input,options);
    return{ok:saved.ok&&rebuilt.valid,...rebuilt,savedRecord:saved.record,diagnostics:[...installed.diagnostics,...rebuilt.diagnostics,...saved.diagnostics]};
  }

  globalThis.NpcProfileGeneratorPackStorage=Object.freeze({STORAGE_KEY,STORAGE_VERSION,MAX_PACK_BYTES,MAX_PACKS,clone,emptyCollection,readCollection,writeCollection,listPacks,savePack,dependentPacks,removePack,parsePack,candidatePackList,installPack});
})();
