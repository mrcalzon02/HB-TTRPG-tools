import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const fail=message=>{throw new Error(message);};
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const storeSource=await read('blacklight-exo-vessel-campaign-store.js');
const uiSource=await read('blacklight-exo-vessel-gameplay-ui.js');
const vesselUiSource=await read('blacklight-exo-vessel-ui.js');
const css=await read('blacklight-exo-vessel-campaign.css');
const schema=JSON.parse(await read('data/schemas/exo-vessel-campaign-archive.schema.json'));

for(const signature of ['indexedDB.open','createObjectStore','vesselInstanceId','manufacturerId','hullFamilyId','validateEnvelope','migrateRecord','blacklight:exo-vessel-activate','Record Campaign Snapshot','Import Vessel JSON','Manufacturer library','Hull-family library'])if(!storeSource.includes(signature))fail(`VESSEL-10 campaign store lacks ${signature}.`);
for(const signature of ['blacklight-exo-vessel-campaign.css','blacklight-exo-vessel-campaign-store.js','loadCampaignLayer'])if(!uiSource.includes(signature))fail(`VESSEL-09 interface does not load VESSEL-10 campaign asset ${signature}.`);
if(!vesselUiSource.includes('blacklight:exo-vessel-activate')||!vesselUiSource.includes("activation:'campaign-archive'"))fail('Base vessel UI does not support exact campaign-archive activation.');
for(const signature of ['exo-vessel-campaign-summary','exo-vessel-campaign-stat-card','exo-vessel-campaign-library-grid','exo-vessel-campaign-row'])if(!css.includes(signature))fail(`VESSEL-10 campaign stylesheet lacks ${signature}.`);
if(schema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-campaign-archive.schema.json'||schema.properties.recordType.const!=='blacklightExoVesselCampaignArchive'||schema.properties.vessel.$ref!=='exo-vessel-record.schema.json')fail('VESSEL-10 campaign archive schema identity is invalid.');
for(const field of ['archiveId','campaignId','vesselHash','vesselInstanceId','manufacturerId','hullFamilyId','sourceRecordVersion','sourceSchemaVersion','vessel'])if(!schema.required.includes(field))fail(`VESSEL-10 campaign archive schema does not require ${field}.`);

const storage=new Map(),events=[];
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelector(){return null;},dispatchEvent(event){events.push(event);return true;}};
const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const V={migrateRecord(record){const copy=structuredClone(record);copy.migratedByVESSEL10=true;return copy;},validateContract(record){return{valid:Boolean(record?.contract?.identifiers?.vesselInstanceId),violations:record?.contract?.identifiers?.vesselInstanceId?[]:['missing vessel identifier']};}};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,structuredClone,setTimeout,clearTimeout,queueMicrotask,document,localStorage,BlacklightExoVessel:V,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}}};context.globalThis=context;vm.createContext(context);vm.runInContext(storeSource,context,{filename:'blacklight-exo-vessel-campaign-store.js'});
const api=context.BlacklightExoVesselCampaignStore;if(!api?.save||!api?.list||!api?.remove||!api?.validateEnvelope||!api?.activate)fail('VESSEL-10 campaign API did not initialize in fallback mode.');
const vessel={version:3,seed:'vessel-10-validation',identity:{name:'Archive Test Vessel',hullFamilyName:'Test Hull'},manufacturer:{name:'Test Manufacturer'},contract:{schemaVersion:'1.0.0',identifiers:{vesselInstanceId:'vessel-archive-test-00000001',manufacturerId:'mfr-archive-test-00000001',hullFamilyId:'hull-archive-test-00000001'}}};
const archive=api.envelope(vessel,'validation checkpoint','campaign-validation');
if(archive.recordType!=='blacklightExoVesselCampaignArchive'||archive.campaignId!=='campaign-validation'||archive.vesselInstanceId!==vessel.contract.identifiers.vesselInstanceId)fail('VESSEL-10 campaign envelope is incomplete.');
const checked=api.validateEnvelope(JSON.parse(JSON.stringify(archive)));if(!checked.vessel.migratedByVESSEL10||checked.vesselHash!==api.hashVessel(checked.vessel))fail('VESSEL-10 campaign import did not migrate and hash the canonical vessel.');
let tamperRejected=false;const tampered=JSON.parse(JSON.stringify(archive));tampered.vessel.identity.name='Tampered Vessel';try{api.validateEnvelope(tampered);}catch(error){tamperRejected=/hash mismatch/i.test(error.message);}if(!tamperRejected)fail('VESSEL-10 campaign archive did not reject tampered vessel content.');
const storageKind=await api.save(archive);if(storageKind!=='localStorage')fail('VESSEL-10 campaign store did not fall back to localStorage without IndexedDB.');
const rows=await api.list();if(rows.length!==1||rows[0].archiveId!==archive.archiveId)fail('VESSEL-10 campaign fallback save/list behavior is inconsistent.');
const activated=api.activate(archive);if(activated.identity.name!==vessel.identity.name||!events.some(event=>event.type==='blacklight:exo-vessel-activate'&&event.detail?.archiveId===archive.archiveId))fail('VESSEL-10 campaign activation did not publish the exact vessel authority.');
await api.remove(archive.archiveId);if((await api.list()).length!==0)fail('VESSEL-10 campaign fallback delete behavior is inconsistent.');

const workflow=await read('.github/workflows/pages.yml');if(!workflow.includes('node scripts/validate-exo-vessel-campaign-store.mjs'))fail('Pages workflow does not gate VESSEL-10 campaign persistence.');
console.log('EXO vessel VESSEL-10 campaign persistence validation passed.');
console.log('Validated archive schema, complete vessel hashing, tamper rejection, migration, localStorage fallback save/list/delete, exact activation events, manufacturer and hull-family indexing, and dynamic campaign UI loading.');
