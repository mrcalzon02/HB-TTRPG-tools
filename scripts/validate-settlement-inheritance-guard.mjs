import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const listeners=[];
const context={
  globalThis:null,
  window:{setTimeout},
  document:{addEventListener:(type,handler)=>listeners.push({type,handler})},
  console
};
context.globalThis=context;
vm.createContext(context);
const source=await fs.readFile(path.join(root,'kaysender-settlement-inheritance-guard.js'),'utf8');
vm.runInContext(source,context,{filename:'kaysender-settlement-inheritance-guard.js'});
const Guard=context.window.KaysenderSettlementInheritanceGuard;
assert.ok(Guard,'Settlement inheritance guard was not exposed.');
assert.equal(listeners.some(item=>item.type==='click'),true,'Settlement inheritance click guard was not installed.');

const cases=[
  ['settled agricultural hub','agricultural island town'],
  ['major regional skyport','minor skyport'],
  ['fortress island garrison','military watchpost'],
  ['guild mining concession','guild extraction camp'],
  ['pirate criminal refuge','pirate-tolerated harbor'],
  ['dragon-tithed community','dragon-tithed hamlet'],
  ['evacuated ruin','evacuated ruin settlement'],
  ['unclassified wilderness','small fortified village']
];
for(const[input,expected]of cases)assert.equal(Guard.mapSettlementType(input),expected,`${input} did not map to ${expected}.`);

function select(values,current='',defaultIndex=0){
  const options=values.map((value,index)=>({value,defaultSelected:index===defaultIndex}));
  return{options,value:current};
}
const legal=select(['small fortified village','minor skyport'],'minor skyport');
assert.equal(Guard.setLegalValue(legal,'minor skyport','small fortified village'),false,'Legal value should remain unchanged.');
assert.equal(legal.value,'minor skyport');
const invalid=select(['small fortified village','minor skyport'],'',0);
assert.equal(Guard.setLegalValue(invalid,'unsupported type','small fortified village'),true,'Unsupported value did not fall back.');
assert.equal(invalid.value,'small fortified village');

console.log('Settlement inheritance guard validation passed.');
console.log(`Verified ${cases.length} Island-to-Settlement type mappings and legal select fallback behavior.`);
