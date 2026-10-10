/* Pure, dependency-free consumable-key allocation rules.
 * Authentication and secrecy are NOT provided by this ledger.
 * Browser persistence is delegated to cubechat-key-ledger.js.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CubeChatKeyLedgerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FORMAT='cubechat-key-ledger-v1',MAX=16777216,MAX_RANGES=10000;
function validInt(n){return Number.isSafeInteger(n)&&n>=0}
function initial(profile,direction,fileDigest,capacity){
  if(!/^[a-f0-9]{24}$/.test(profile)||!['AB','BA'].includes(direction)||!/^[a-f0-9]{64}$/.test(fileDigest)||!validInt(capacity)||capacity<1||capacity>MAX)
    throw Error('Invalid CCLK2 material identity');
  return {id:'CCLK2:'+profile+':'+direction+':'+fileDigest,format:FORMAT,profile,direction,fileDigest,capacity,nextOut:0,incomingRanges:[]};
}
function validate(s){
  if(!s||s.format!==FORMAT||!s.id||s.id!==initial(s.profile,s.direction,s.fileDigest,s.capacity).id||
    !validInt(s.nextOut)||s.nextOut>s.capacity||!Array.isArray(s.incomingRanges)||s.incomingRanges.length>MAX_RANGES)
    throw Error('Invalid or rolled-back consumable-key ledger');
  let previous=-1;
  for(const r of s.incomingRanges){
    if(!Array.isArray(r)||r.length!==2||!validInt(r[0])||!validInt(r[1])||r[0]>=r[1]||r[1]>s.capacity||r[0]<=previous)
      throw Error('Invalid recorded incoming key ranges');
    previous=r[1];
  }
  return s;
}
function reserve(s,length){
  validate(s);
  if(!Number.isSafeInteger(length)||length<1||length>4096)throw Error('Invalid consumable-key reservation length');
  if(length>s.capacity-s.nextOut)throw Error('Consumable key exhausted; replace it');
  const start=s.nextOut;
  return {start,state:{...s,nextOut:start+length}};
}
function acceptIncoming(s,start,length){
  validate(s);
  if(!validInt(start)||!Number.isSafeInteger(length)||length<1||length>4096||start>s.capacity-length)
    throw Error('Invalid incoming consumable-key range');
  const end=start+length, ranges=[];
  for(const [a,b] of s.incomingRanges){
    if(start<b&&end>a)throw Error('Reused or overlapping incoming key material rejected');
    ranges.push([a,b]);
  }
  ranges.push([start,end]);ranges.sort((a,b)=>a[0]-b[0]);
  const compact=[];
  for(const pair of ranges){
    const last=compact[compact.length-1];
    if(last&&pair[0]===last[1])last[1]=pair[1];
    else compact.push(pair.slice());
  }
  if(compact.length>MAX_RANGES)throw Error('Key ledger range limit reached; rotate material');
  return {state:{...s,incomingRanges:compact}};
}
return Object.freeze({FORMAT,initial,validate,reserve,acceptIncoming});
});
