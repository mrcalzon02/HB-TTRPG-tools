/* CubeChat experimental CCLK2 browser ledger.
 * IndexedDB transactions serialize reservations across tabs on the SAME origin.
 * Re-importing a known key resumes its cursor instead of resetting to zero.
 * No protection against cleared/restored/rolled-back browser storage, other
 * origins/devices, OS-level rollback, or intentionally duplicated sender keys.
 * For production usage use a platform-owned, rollback-resistant secret vault.
 */
(function(root){'use strict';
const Core=root.CubeChatKeyLedgerCore;
const DB_NAME='cubechat-consumable-key-ledger-v1',STORE='files';
let cached=null;
function requireSupport(){
 if(!Core||!root.indexedDB||!root.crypto?.subtle||!root.isSecureContext)
   throw Error('Consumable-key ledger needs IndexedDB and secure HTTPS/localhost with Web Crypto');
}
function open(){
 requireSupport();
 if(cached)return cached;
 cached=new Promise((resolve,reject)=>{
   const request=indexedDB.open(DB_NAME,1);
   request.onupgradeneeded=()=>{
     const db=request.result;
     if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
   };
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db)};
   request.onerror=()=>reject(request.error||Error('Unable to open key ledger'));
   request.onblocked=()=>reject(Error('Key ledger database upgrade blocked by another browser tab'));
 }).catch(error=>{cached=null;throw error});
 return cached;
}
function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')}
async function identity(key){
 requireSupport();
 if(!key||!(key.bytes instanceof Uint8Array)||!key.profile||!key.direction)
   throw Error('Import a parsed CCLK2 key file before enrollment');
 const fingerprint=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',key.bytes)));
 return Core.initial(key.profile,key.direction,fingerprint,key.bytes.length);
}
async function transaction(id,mutate){
 const db=await open();
 return new Promise((resolve,reject)=>{
   let transaction,answer,reason;
   try{transaction=db.transaction(STORE,'readwrite',{durability:'strict'})}
   catch(e){return reject(Error('Strict transactional key storage is unsupported: '+e.message))}
   const store=transaction.objectStore(STORE);
   const request=store.get(id);
   request.onsuccess=()=>{
     try{
       const result=mutate(request.result);
       if(result.state)store.put(result.state);
       answer=result.value;
     }catch(e){reason=e;transaction.abort()}
   };
   transaction.oncomplete=()=>resolve(answer);
   transaction.onabort=()=>reject(reason||transaction.error||Error('Key ledger transaction aborted; no material was allocated'));
   transaction.onerror=()=>{ /* rejection occurs at onabort */ };
 });
}
async function enroll(key,confirmUnused){
 const base=await identity(key);
 const result=await transaction(base.id,existing=>{
   if(!existing){
     if(confirmUnused!==true)throw Error('New key fingerprint: explicitly attest that this material has never been consumed before enabling it');
     return {state:base,value:{newFile:true,outboundNext:0}};
   }
   Core.validate(existing);
   if(existing.id!==base.id||existing.capacity!==base.capacity)
     throw Error('Imported CCLK2 file does not match the durable ledger record');
   return {value:{newFile:false,outboundNext:existing.nextOut}};
 });
 key.ledgerId=base.id;
 return {...result,fingerprint:base.fileDigest};
}
function enrolledId(key){
 if(!key?.ledgerId)throw Error('Consumable key not enrolled into durable browser ledger');
 return key.ledgerId;
}
async function reserve(key,length){
 const id=enrolledId(key);
 return transaction(id,record=>{
   if(!record)throw Error('Key ledger missing; refusing to reset key position');
   const r=Core.reserve(record,length);
   return {state:r.state,value:r.start};
 });
}
async function markIncoming(key,start,length){
 const id=enrolledId(key);
 return transaction(id,record=>{
   if(!record)throw Error('Incoming key ledger missing; refusing material reuse');
   return {...Core.acceptIncoming(record,start,length),value:true};
 });
}
root.CubeChatKeyLedger=Object.freeze({enroll,reserve,markIncoming});
})(typeof window!=='undefined'?window:globalThis);
