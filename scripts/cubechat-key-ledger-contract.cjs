#!/usr/bin/env node
'use strict';
// Pure state-machine tests. Browser IndexedDB durability still requires device testing.
const assert=require('node:assert/strict');
const Ledger=require('../cubechat-key-ledger-core.js');
const id='0123456789abcdef01234567';
const digest='a'.repeat(64);
let ab=Ledger.initial(id,'AB',digest,500),ba=Ledger.initial(id,'BA','b'.repeat(64),500);
assert.notEqual(ab.id,ba.id,'Direction separation');
assert.equal(ab.nextOut,0);
for(const [length,start] of [[10,0],[31,10],[45,41]]){
 const result=Ledger.reserve(ab,length);assert.equal(result.start,start);
 ab=result.state;assert.equal(ab.nextOut,start+length);
}
const persisted=JSON.parse(JSON.stringify(ab));
assert.equal(Ledger.reserve(persisted,1).start,86,'Reimport must resume stored cursor');
ba=Ledger.acceptIncoming(ba,30,10).state;
ba=Ledger.acceptIncoming(ba,0,10).state;
ba=Ledger.acceptIncoming(ba,10,20).state;
assert.deepEqual(ba.incomingRanges,[[0,40]],'Contiguous received segments compact');
assert.throws(()=>Ledger.acceptIncoming(ba,39,2),/overlapping/);
assert.throws(()=>Ledger.acceptIncoming(ba,1,1),/overlapping/);
assert.throws(()=>Ledger.acceptIncoming(ba,0,10),/overlapping/);
assert.throws(()=>Ledger.reserve(ab,4097),/length/);
assert.throws(()=>Ledger.reserve({...ab,nextOut:498},3),/exhausted/);
assert.throws(()=>Ledger.validate({...ab,nextOut:-1}),/Invalid/);
assert.throws(()=>Ledger.validate({...ab,id:'wrong'}),/Invalid/);
assert.throws(()=>Ledger.validate({...ba,incomingRanges:[[5,10],[8,12]]}),/Invalid/);
const old=JSON.parse(JSON.stringify(ba));
const fresh=Ledger.acceptIncoming(ba,100,6).state;
assert.deepEqual(old.incomingRanges,[[0,40]],'Mutation isolation');
assert.deepEqual(fresh.incomingRanges,[[0,40],[100,106]]);
console.log('PASS: directional scope, monotonic reservations, JSON restart, overlap rejection, range compaction, exhaustion and malformed-state rejection');
