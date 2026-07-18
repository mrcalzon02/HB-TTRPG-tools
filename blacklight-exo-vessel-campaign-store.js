(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselCampaignStore)return;
  const V=globalThis.BlacklightExoVessel;
  if(!V?.migrateRecord||!V?.validateContract)return;
  const DB_NAME='blacklight-exo-vessel-campaign';
  const DB_VERSION=1;
  const STORE='vessels';
  const FALLBACK_KEY='blacklight-exo-vessel-campaign-v1';
  const $=id=>document.getElementById(id);
  const clone=value=>structuredClone(value);
  let dbPromise=null,currentVessel=null;

  function hashText(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
  const hashVessel=vessel=>hashText(JSON.stringify(vessel));
  const status=(message,state='ready')=>{const target=$('exo-vessel-campaign-status');if(target){target.textContent=message;target.dataset.state=state;}else console[state==='error'?'error':'log'](`[Blacklight EXO] ${message}`);};
  const node=(tag,className='',text='')=>{const item=document.createElement(tag);if(className)item.className=className;if(text!==''&&text!=null)item.textContent=String(text);return item;};
  const button=(label,handler,className='bli-action')=>{const item=node('button',className,label);item.type='button';item.addEventListener('click',handler);return item;};

  function openDb(){
    if(dbPromise)return dbPromise;
    if(!('indexedDB'in globalThis))return Promise.reject(new Error('IndexedDB is unavailable'));
    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'archiveId'});store.createIndex('updatedAt','updatedAt');store.createIndex('vesselInstanceId','vesselInstanceId');store.createIndex('manufacturerId','manufacturerId');store.createIndex('hullFamilyId','hullFamilyId');}};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
      request.onblocked=()=>reject(new Error('IndexedDB upgrade is blocked by another tab'));
    });
    return dbPromise;
  }
  async function transaction(mode,operation){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let request;try{request=operation(store);}catch(error){reject(error);return;}tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error||request?.error||new Error('Vessel archive transaction failed'));tx.onabort=()=>reject(tx.error||new Error('Vessel archive transaction aborted'));});}
  function fallbackList(){try{const value=JSON.parse(localStorage.getItem(FALLBACK_KEY)||'[]');return Array.isArray(value)?value:[];}catch(_){return[];}}
  function fallbackWrite(rows){localStorage.setItem(FALLBACK_KEY,JSON.stringify(rows.slice(0,40)));}
  async function list(){try{const rows=await transaction('readonly',store=>store.getAll());return(rows||[]).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}catch(_){return fallbackList().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}}
  async function save(archive){try{await transaction('readwrite',store=>store.put(clone(archive)));return'indexedDB';}catch(error){const rows=fallbackList().filter(item=>item.archiveId!==archive.archiveId);rows.unshift(clone(archive));try{fallbackWrite(rows);return'localStorage';}catch(fallbackError){throw new Error(`Vessel archive storage failed: ${error.message}; fallback failed: ${fallbackError.message}`);}}}
  async function remove(archiveId){try{await transaction('readwrite',store=>store.delete(archiveId));}catch(_){fallbackWrite(fallbackList().filter(item=>item.archiveId!==archiveId));}}

  function envelope(vessel,note='',campaignId='default-campaign'){
    const copy=clone(vessel),vesselHash=hashVessel(copy),time=new Date().toISOString(),ids=copy.contract?.identifiers||{};
    return{recordType:'blacklightExoVesselCampaignArchive',schemaVersion:'1.0.0',archiveId:`vessel-${ids.vesselInstanceId||copy.seed||'unknown'}-${Date.now().toString(36)}-${vesselHash}`,campaignId:String(campaignId||'default-campaign'),recordedAt:time,updatedAt:time,note:String(note||''),vesselHash,vesselInstanceId:ids.vesselInstanceId||null,manufacturerId:ids.manufacturerId||null,hullFamilyId:ids.hullFamilyId||null,sourceRecordVersion:Number(copy.version)||1,sourceSchemaVersion:copy.contract?.schemaVersion||null,vessel:copy};
  }
  function validateEnvelope(value){
    const raw=value?.recordType==='blacklightExoVesselCampaignArchive'?value.vessel:value;
    if(!raw||typeof raw!=='object')throw new Error('The selected file does not contain a vessel record.');
    const expected=value?.vesselHash;if(expected&&hashVessel(raw)!==expected)throw new Error(`Vessel archive hash mismatch: expected ${expected}, calculated ${hashVessel(raw)}.`);
    const migrated=V.migrateRecord(raw,{},null),validation=V.validateContract(migrated);
    if(!validation.valid)throw new Error(`Imported vessel failed canonical validation: ${validation.violations.join(' ')}`);
    const vesselHash=hashVessel(migrated),ids=migrated.contract?.identifiers||{};
    return{vessel:migrated,vesselHash,sourceHash:expected||null,note:value?.note||'',campaignId:value?.campaignId||'default-campaign',recordedAt:value?.recordedAt||new Date().toISOString(),vesselInstanceId:ids.vesselInstanceId,manufacturerId:ids.manufacturerId,hullFamilyId:ids.hullFamilyId};
  }
  function download(value,fileName){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  function activate(archive){const checked=validateEnvelope(archive);currentVessel=clone(checked.vessel);document.dispatchEvent(new CustomEvent('blacklight:exo-vessel-activate',{detail:{vessel:clone(currentVessel),archiveId:archive.archiveId,campaignId:archive.campaignId}}));status(`Activated ${currentVessel.identity?.name||currentVessel.seed} from campaign archive ${archive.archiveId}.`,'ready');return currentVessel;}

  function statCard(vessel){
    const model=vessel?.gameplayModel,root=$('exo-vessel-campaign-stat-card');if(!root)return;root.replaceChildren();if(!model){root.append(node('p','','No VESSEL-09 statistics are available.'));return;}
    const header=node('div','exo-vessel-campaign-stat-head');header.append(node('strong','',vessel.identity?.name||vessel.seed),node('span','',`${model.actions.filter(item=>item.available).length} / ${model.actions.length} actions ready`));root.append(header);
    const grid=node('div','exo-vessel-campaign-stat-grid');for(const stat of model.statistics){const item=node('div','exo-vessel-campaign-meter');item.append(node('span','',stat.label),node('strong','',Number(stat.value).toFixed(1)));const bar=node('i');bar.style.setProperty('--value',`${Math.max(0,Math.min(100,Number(stat.value)||0))}%`);item.append(bar);grid.append(item);}root.append(grid);
  }
  function groupCards(rows,key,labelGetter,targetId){const target=$(targetId);if(!target)return;target.replaceChildren();const groups=new Map();for(const archive of rows){const keyValue=archive[key]||'unknown';if(!groups.has(keyValue))groups.set(keyValue,[]);groups.get(keyValue).push(archive);}if(!groups.size){target.append(node('p','','No archived records.'));return;}for(const [id,items]of groups){const article=node('article','exo-vessel-campaign-library-card'),sample=items[0].vessel;article.append(node('small','',`${items.length} archived vessel${items.length===1?'':'s'}`),node('h3','',labelGetter(sample,id)),node('p','',`Latest record ${new Date(items[0].updatedAt).toLocaleString()}. ${items.map(item=>item.vessel?.identity?.name||item.vessel?.seed).slice(0,4).join('; ')}.`));target.append(article);}}
  async function render(){
    const rows=await list(),archiveRoot=$('exo-vessel-campaign-list');if(archiveRoot){archiveRoot.replaceChildren();if(!rows.length)archiveRoot.append(node('p','','No persistent vessel archives recorded. IndexedDB is preferred; localStorage is used only when IndexedDB is unavailable.'));for(const archive of rows){const row=node('div','exo-vessel-campaign-row'),label=node('span','',`${new Date(archive.updatedAt).toLocaleString()} · ${archive.note||archive.vessel?.identity?.name||archive.vessel?.seed||'unnamed vessel'}`),meta=node('code','',`${archive.vessel?.contract?.schemaVersion||'legacy'} · ${archive.vesselHash}`),actions=node('div','exo-vessel-campaign-actions');actions.append(button('Activate',()=>{try{activate(archive);}catch(error){status(`Vessel activation failed: ${error.message}`,'error');}}),button('Export',()=>download(archive,`${archive.archiveId}.json`)),button('Delete',()=>remove(archive.archiveId).then(render).catch(error=>status(`Vessel deletion failed: ${error.message}`,'error'))));row.append(label,meta,actions);archiveRoot.append(row);}}
    groupCards(rows,'manufacturerId',(vessel,id)=>vessel?.manufacturer?.name||vessel?.designation?.originManufacturer||id,'exo-vessel-manufacturer-library');
    groupCards(rows,'hullFamilyId',(vessel,id)=>vessel?.identity?.hullFamilyName||vessel?.identity?.role||id,'exo-vessel-hull-library');
    statCard(currentVessel||globalThis.BlacklightExoGetActiveVessel?.());
    const count=$('exo-vessel-campaign-count');if(count)count.textContent=String(rows.length);
    const manufacturers=$('exo-vessel-campaign-manufacturers');if(manufacturers)manufacturers.textContent=String(new Set(rows.map(item=>item.manufacturerId).filter(Boolean)).size);
    const hulls=$('exo-vessel-campaign-hulls');if(hulls)hulls.textContent=String(new Set(rows.map(item=>item.hullFamilyId).filter(Boolean)).size);
  }
  async function recordCurrent(){const vessel=globalThis.BlacklightExoGetActiveVessel?.()||currentVessel;if(!vessel){status('No active vessel is available to record.','error');return;}const note=$('exo-vessel-campaign-note')?.value.trim()||'',campaignId=$('exo-vessel-campaign-id')?.value.trim()||'default-campaign',archive=envelope(vessel,note,campaignId);try{const storage=await save(archive);if($('exo-vessel-campaign-note'))$('exo-vessel-campaign-note').value='';await render();status(`Vessel archived in ${storage}: ${archive.vesselHash}.`,'ready');}catch(error){status(error.message,'error');}}
  async function importFile(file){const parsed=JSON.parse(await file.text()),checked=validateEnvelope(parsed),archive=envelope(checked.vessel,checked.note||`Imported from ${file.name}`,checked.campaignId);archive.recordedAt=checked.recordedAt;archive.sourceVesselHash=checked.sourceHash;archive.importedFileName=file.name;const storage=await save(archive);await render();activate(archive);status(`Imported, migrated, validated, and activated ${checked.vessel.identity?.name||checked.vessel.seed} in ${storage}.`,'ready');}

  function buildUi(){
    if($('exo-vessel-campaign-section'))return;
    const section=node('section','bli-section exo-vessel-campaign-section');section.id='exo-vessel-campaign-section';
    const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow','Charles // VESSEL-10 campaign persistence and vessel libraries'),node('h2','','Record, migrate, retrieve, and reactivate complete vessel authorities.'),node('p','','Campaign archives retain the entire canonical vessel record, including manufacturer identity, hull family, voxel layout, condition history, combat geometry, weapon envelopes, local damage, VESSEL-09 statistics, action resources, provenance, and unknown extension fields.'));
    const controls=node('div','exo-vessel-campaign-controls');const campaignLabel=node('label');campaignLabel.append(node('span','','Campaign identifier'));const campaignInput=node('input');campaignInput.id='exo-vessel-campaign-id';campaignInput.value='default-campaign';campaignLabel.append(campaignInput);const noteLabel=node('label');noteLabel.append(node('span','','Archive note'));const noteInput=node('input');noteInput.id='exo-vessel-campaign-note';noteInput.placeholder='Optional checkpoint note';noteLabel.append(noteInput);const recordButton=button('Record Campaign Snapshot',recordCurrent,'bli-action primary');recordButton.id='exo-vessel-campaign-record';const importInput=node('input');importInput.id='exo-vessel-campaign-import-file';importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;importInput.addEventListener('change',()=>{const file=importInput.files?.[0];if(file)importFile(file).catch(error=>status(`Vessel import failed: ${error.message}`,'error')).finally(()=>{importInput.value='';});});const importButton=button('Import Vessel JSON',()=>importInput.click());importButton.id='exo-vessel-campaign-import';controls.append(campaignLabel,noteLabel,recordButton,importButton,importInput);head.append(controls,node('p','exo-vessel-campaign-status','Persistent vessel library ready.'));head.lastChild.id='exo-vessel-campaign-status';
    const summary=node('div','exo-vessel-campaign-summary');for(const[id,label]of[['exo-vessel-campaign-count','Archived records'],['exo-vessel-campaign-manufacturers','Manufacturers'],['exo-vessel-campaign-hulls','Hull families']]){const item=node('div');item.append(node('strong','',0),node('span','',label));item.firstChild.id=id;summary.append(item);}
    const stat=node('div','exo-vessel-campaign-stat-card');stat.id='exo-vessel-campaign-stat-card';
    const libraries=node('div','exo-vessel-campaign-library-grid'),manufacturers=node('section'),hulls=node('section');manufacturers.append(node('h3','','Manufacturer library'));const manufacturerRoot=node('div','exo-vessel-campaign-library');manufacturerRoot.id='exo-vessel-manufacturer-library';manufacturers.append(manufacturerRoot);hulls.append(node('h3','','Hull-family library'));const hullRoot=node('div','exo-vessel-campaign-library');hullRoot.id='exo-vessel-hull-library';hulls.append(hullRoot);libraries.append(manufacturers,hulls);
    const listRoot=node('div','exo-vessel-campaign-list');listRoot.id='exo-vessel-campaign-list';section.append(head,summary,stat,libraries,listRoot);
    const anchor=$('exo-vessel-gameplay-section')||$('exo-vessel-damage-section')||document.querySelector('.exo-vessel-overview');if(anchor)anchor.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
  }
  function install(){buildUi();document.addEventListener('blacklight:exo-vessel-generated',event=>{currentVessel=clone(event.detail?.vessel||globalThis.BlacklightExoGetActiveVessel?.());queueMicrotask(()=>{statCard(currentVessel);});});currentVessel=globalThis.BlacklightExoGetActiveVessel?.()||null;render().catch(error=>status(`Vessel archive initialization failed: ${error.message}`,'error'));}

  const api=Object.freeze({version:1,schemaVersion:'1.0.0',list,save,remove,envelope,validateEnvelope,hashVessel,activate,render,recordCurrent,importFile});
  globalThis.BlacklightExoVesselCampaignStore=api;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
