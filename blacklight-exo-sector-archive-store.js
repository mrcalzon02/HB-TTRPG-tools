(() => {
  'use strict';
  if(globalThis.BlacklightExoSectorArchiveStore)return;
  const DB_NAME='blacklight-exo-sector-archives';
  const DB_VERSION=1;
  const STORE='snapshots';
  const FALLBACK_KEY='blacklight-exo-sector-snapshots-v3';
  const LEGACY_KEY='blacklight-exo-sector-snapshots-v2';
  const D=globalThis.BlacklightExoStellarSectorData;
  const $=id=>document.getElementById(id);
  let dbPromise=null,currentSector=null;

  const hashText=text=>{let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');};
  const hashSector=sector=>hashText(JSON.stringify(sector));
  const status=(message,state='ready')=>{const node=$('exo-sector-status');if(node){node.textContent=message;node.dataset.state=state;}};
  const clone=value=>structuredClone(value);

  function openDb(){
    if(dbPromise)return dbPromise;
    if(!('indexedDB'in globalThis))return Promise.reject(new Error('IndexedDB is unavailable'));
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'snapshotId'});store.createIndex('recordedAt','recordedAt');store.createIndex('archiveHash','archiveHash');}};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
      request.onblocked=()=>reject(new Error('IndexedDB upgrade is blocked by another tab'));
    });
    return dbPromise;
  }
  async function transaction(mode,operation){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let value;try{value=operation(store);}catch(error){reject(error);return;}tx.oncomplete=()=>resolve(value?.result);tx.onerror=()=>reject(tx.error||value?.error||new Error('Archive transaction failed'));tx.onabort=()=>reject(tx.error||new Error('Archive transaction aborted'));});}
  function fallbackList(){try{return JSON.parse(localStorage.getItem(FALLBACK_KEY)||'[]');}catch(_){return[];}}
  function fallbackWrite(rows){localStorage.setItem(FALLBACK_KEY,JSON.stringify(rows.slice(0,12)));}
  async function list(){try{const rows=await transaction('readonly',store=>store.getAll());return(rows||[]).sort((a,b)=>String(b.recordedAt).localeCompare(String(a.recordedAt)));}catch(_){return fallbackList().sort((a,b)=>String(b.recordedAt).localeCompare(String(a.recordedAt)));}}
  async function save(snapshot){try{await transaction('readwrite',store=>store.put(clone(snapshot)));return'indexedDB';}catch(error){const rows=fallbackList().filter(item=>item.snapshotId!==snapshot.snapshotId);rows.unshift(clone(snapshot));try{fallbackWrite(rows);return'localStorage';}catch(fallbackError){throw new Error(`Archive storage failed: ${error.message}; fallback failed: ${fallbackError.message}`);}}}
  async function remove(snapshotId){try{await transaction('readwrite',store=>store.delete(snapshotId));}catch(_){fallbackWrite(fallbackList().filter(item=>item.snapshotId!==snapshotId));}}
  async function migrateLegacy(){let rows=[];try{rows=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]');}catch(_){}if(!rows.length)return;for(const row of rows){if(row?.sector&&row?.snapshotId)await save({...row,storageMigration:'localStorage-v2'});}try{localStorage.removeItem(LEGACY_KEY);}catch(_){}}

  function envelope(sector,note=''){const archiveHash=hashSector(sector);return{snapshotId:`sector-${Date.now().toString(36)}-${archiveHash}`,recordType:'blacklightExoStellarSectorArchive',schemaVersion:'1.0.0',recordedAt:new Date().toISOString(),note,archiveHash,sector:clone(sector)};}
  function validateEnvelope(value){const sector=value?.recordType==='blacklightExoStellarSectorArchive'?value.sector:value;if(!sector||sector.recordType!=='blacklightExoStellarSector')throw new Error('The selected file is not a Blacklight EXO stellar-sector record.');const validation=D?.validate?.(sector)||{valid:true,violations:[]};if(!validation.valid)throw new Error(validation.violations.join(' '));const actual=hashSector(sector),expected=value?.archiveHash;if(expected&&expected!==actual)throw new Error(`Archive hash mismatch: expected ${expected}, calculated ${actual}.`);return{sector:clone(sector),archiveHash:actual,note:value?.note||'',recordedAt:value?.recordedAt||new Date().toISOString()};}
  function download(value,fileName){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}

  function waitForSector(timeoutMs=15000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{document.removeEventListener('blacklight:exo-sector-generated',handler);reject(new Error('Sector replay timed out.'));},timeoutMs);const handler=event=>{clearTimeout(timer);resolve(event.detail?.sector||globalThis.BlacklightExoGetActiveSector?.());};document.addEventListener('blacklight:exo-sector-generated',handler,{once:true});});}
  async function replay(snapshot){const source=snapshot.sector,seed=source.seed,parameters=source.generationParameters||{};const pending=waitForSector();if(source.recordStatus==='fixed-deterministic-example'||seed===D?.exampleSeed){$('exo-sector-load-example')?.click();}else{$('exo-sector-seed').value=seed;$('exo-sector-cluster-count').value=String(parameters.clusterCount||source.clusters?.length||32);$('exo-sector-species-count').value=String(parameters.speciesCount||source.species?.length||24);$('exo-sector-generate')?.click();}const generated=await pending,actual=hashSector(generated);if(actual!==snapshot.archiveHash)throw new Error(`Deterministic replay mismatch: archive ${snapshot.archiveHash}, generated ${actual}.`);status(`Archive replay verified: ${source.name} · ${actual}.`,'ready');return generated;}

  function button(label,handler){const item=document.createElement('button');item.type='button';item.className='bli-action';item.textContent=label;item.addEventListener('click',handler);return item;}
  async function render(){const root=$('exo-sector-snapshot-list');if(!root)return;const rows=await list();root.replaceChildren();if(!rows.length){const empty=document.createElement('p');empty.textContent='No durable campaign archives recorded. IndexedDB is preferred; localStorage is used only when IndexedDB is unavailable.';root.append(empty);return;}for(const snapshot of rows){const row=document.createElement('div');row.className='exo-sector-snapshot';const label=document.createElement('span');label.textContent=`${new Date(snapshot.recordedAt).toLocaleString()} · ${snapshot.note||snapshot.sector?.name||'unnamed archive'}`;const meta=document.createElement('code');meta.textContent=`${snapshot.sector?.schemaVersion||'unknown'} · ${snapshot.archiveHash}`;const actions=document.createElement('div');actions.className='exo-sector-snapshot-actions';actions.append(button('Replay',()=>replay(snapshot).catch(error=>status(`Archive replay failed: ${error.message}`,'error'))),button('Export',()=>download(snapshot,`${snapshot.snapshotId}.json`)),button('Delete',()=>remove(snapshot.snapshotId).then(render).catch(error=>status(`Archive deletion failed: ${error.message}`,'error'))));row.append(label,meta,actions);root.append(row);}}

  async function recordCurrent(event){event?.preventDefault();event?.stopImmediatePropagation();const sector=globalThis.BlacklightExoGetActiveSector?.()||currentSector;if(!sector){status('No active sector is available to record.','error');return;}const note=$('exo-sector-note')?.value.trim()||'',snapshot=envelope(sector,note);try{const storage=await save(snapshot);if($('exo-sector-note'))$('exo-sector-note').value='';await render();status(`Sector archive recorded in ${storage}: ${snapshot.archiveHash}.`,'ready');}catch(error){status(error.message,'error');}}
  async function importFile(file){const parsed=JSON.parse(await file.text()),validated=validateEnvelope(parsed),snapshot={snapshotId:`import-${Date.now().toString(36)}-${validated.archiveHash}`,recordType:'blacklightExoStellarSectorArchive',schemaVersion:'1.0.0',recordedAt:validated.recordedAt,note:validated.note||`Imported from ${file.name}`,archiveHash:validated.archiveHash,sector:validated.sector,importedFileName:file.name};const storage=await save(snapshot);await render();status(`Imported and verified ${validated.sector.name} into ${storage}. Use Replay to reconstruct it through the generator.`,'ready');}
  function install(){
    const saveButton=$('exo-sector-save');if(saveButton){saveButton.textContent='Record Durable Archive';saveButton.addEventListener('click',recordCurrent,true);}
    const actions=document.querySelector('.exo-sector-hero .bli-actions')||document.querySelector('.bli-actions');
    if(actions&&!$('exo-sector-import')){const input=document.createElement('input');input.id='exo-sector-import-file';input.type='file';input.accept='.json,application/json';input.hidden=true;input.addEventListener('change',()=>{const file=input.files?.[0];if(file)importFile(file).catch(error=>status(`Archive import failed: ${error.message}`,'error')).finally(()=>{input.value='';});});const importButton=button('Import Sector Archive',()=>input.click());importButton.id='exo-sector-import';actions.append(importButton,input);}
    document.addEventListener('blacklight:exo-sector-generated',event=>{currentSector=clone(event.detail?.sector||globalThis.BlacklightExoGetActiveSector?.());queueMicrotask(render);});
    currentSector=globalThis.BlacklightExoGetActiveSector?.()||null;migrateLegacy().then(render).catch(error=>status(`Archive migration failed: ${error.message}`,'error'));
  }

  const api=Object.freeze({version:1,list,save,remove,replay,validateEnvelope,hashSector,envelope,render});
  globalThis.BlacklightExoSectorArchiveStore=api;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();