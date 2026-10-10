#!/usr/bin/env node
'use strict';
// Opt-in Binary Cube media cryptanalysis. PUBLIC experimental fixtures; NOT secret encryption.
// Usage: node scripts/cubechat-strengthening-media-campaign.cjs --out-dir dist/strengthened --report dist/strengthened/report.json
const Engine=require('../shadowrun-binary-cube-engine.js');
const Sub=require('../binary-cube-subcube-indexing.js');
const Chain=require('../binary-cube-data-dependent-chaining.js');
const catalog=require('../skills/binary-cube-laboratory/test-packages.json');
const fixtures=[['tiny.jpg','image/jpeg','full-mask-no-filler-capacity'],['tiny.gif','image/gif','repeated-byte-pattern'],['tiny.webp','image/webp','full-mask-no-filler-capacity'],['sample.pdf','application/pdf','repeated-byte-pattern'],['sample.zip','application/zip','repeated-byte-pattern']];
const modes=['baseline','subcube','chaining','chaining-then-subcube','subcube-then-chaining'];
const format='cubechat-experimental-strengthened-transit-v1';
function check(ok,why){if(!ok)throw Error(why)}
function chainSeed(file){return 'public-cubechat-chain-v1:'+file}
function plan(file,n){return Sub.buildSubcubeIndexPlan({sourceBitLength:n,fanOut:3,regionCount:3,mode:'keyed-codeword',distinctRegions:true,seed:'public-cubechat-subcube-v1:'+file})}
function pre(mode,bits,file,p){
 if(mode==='baseline')return bits;
 if(mode==='subcube')return Sub.encodeSubcubeInputs(bits,p).bits;
 if(mode==='chaining')return Chain.encode(bits,{seed:chainSeed(file)}).bits;
 if(mode==='chaining-then-subcube')return Sub.encodeSubcubeInputs(Chain.encode(bits,{seed:chainSeed(file)}).bits,p).bits;
 if(mode==='subcube-then-chaining')return Chain.encode(Sub.encodeSubcubeInputs(bits,p).bits,{seed:chainSeed(file)}).bits;
 throw Error('Unsupported strategy '+mode);
}
function post(mode,bits,file,p){
 if(mode==='baseline')return bits;
 if(mode==='subcube')return Sub.decodeSubcubeInputs(bits,p).bits;
 if(mode==='chaining')return Chain.decode(bits,{seed:chainSeed(file)}).bits;
 if(mode==='chaining-then-subcube')return Chain.decode(Sub.decodeSubcubeInputs(bits,p).bits,{seed:chainSeed(file)}).bits;
 if(mode==='subcube-then-chaining')return Sub.decodeSubcubeInputs(Chain.decode(bits,{seed:chainSeed(file)}).bits,p).bits;
 throw Error('Unsupported strategy '+mode);
}
function flip(s,i){return s.slice(0,i)+(s[i]==='0'?'1':'0')+s.slice(i+1)}
function diff(a,b){check(a.length===b.length,'Ciphertexts length mismatch');let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n}
function entropy(bits){let n=0;for(const c of bits)if(c==='1')n++;const q=n/bits.length;return q===0||q===1?0:-q*Math.log2(q)-(1-q)*Math.log2(1-q)}
function repeats(bits,width){const seen=new Set();let d=0;for(let k=0;k<bits.length;k+=width){const chunk=bits.slice(k,k+width);if(seen.has(chunk))d++;seen.add(chunk)}return d}
function run(saved){
 const keys=new Map(catalog.positiveCases.map(x=>[x.id,x.keyOptions])),cases=[],artifacts={};
 for(const [file,mime,preset] of fixtures){
  const key=Engine.createKey(keys.get(preset)),old=saved[file];
  check(old,'Missing preserved baseline: '+file);Engine.validatePackage(old,key);
  const original=Engine.decryptBinary(old,key);
  check(original.length>0&&original.length%8===0,'Non-byte aligned original '+file);
  const p=plan(file,original.length),positions=[...new Set([0,Math.floor(original.length/4),Math.floor(original.length/2),original.length-1])],variants=[];
  for(const mode of modes){
   const encoded=pre(mode,original,file,p),packet=Engine.encryptBinary(encoded,key);
   Engine.validatePackage(packet,key);
   check(post(mode,Engine.decryptBinary(packet,key),file,p)===original,'Exact recovery failed '+file+' '+mode);
   const differential=positions.map(pos=>{
    const other=Engine.encryptBinary(pre(mode,flip(original,pos),file,p),key),d=diff(packet.ciphertext,other.ciphertext);
    return {sourceBitIndex:pos,changedCiphertextBits:d,changedFraction:d/packet.ciphertext.length};
   });
   const again=Engine.encryptBinary(encoded,key);
   check(again.ciphertext===packet.ciphertext,'Deterministic repeat differed');
   variants.push({mode,roundTrip:true,sourceBits:original.length,encodedBits:encoded.length,ciphertextBits:packet.ciphertext.length,expansion:packet.ciphertext.length/original.length,bitEntropy:entropy(packet.ciphertext),duplicateCubeBlocks:repeats(packet.ciphertext,key.gridSize*key.gridSize),sameMessageSameCiphertext:true,differential});
   if(mode!=='baseline'){
    const envelope={format,schemaVersion:'1.0.0',strategy:mode,mime,originalBitLength:original.length,subcube:mode.includes('subcube')?{fanOut:3,regionCount:3,mode:'keyed-codeword',distinctRegions:true}:null,cubePackage:packet};
    artifacts[file+'.'+mode+'.cube.json']=JSON.stringify(envelope,null,2)+'\n';
   }
  }
  cases.push({file,mime,preset,sourceBytes:original.length/8,sourceBitStringSha256:Engine.sha256Hex(original),variants});
 }
 const summary=modes.map(mode=>{
  const variants=cases.map(c=>c.variants.find(v=>v.mode===mode)),trials=variants.flatMap(v=>v.differential);
  return {mode,fixtures:variants.length,bitFlipTrials:trials.length,meanChangedBits:trials.reduce((a,b)=>a+b.changedCiphertextBits,0)/trials.length,meanChangedFraction:trials.reduce((a,b)=>a+b.changedFraction,0)/trials.length,meanExpansion:variants.reduce((a,b)=>a+b.expansion,0)/variants.length,allExactRecovery:variants.every(v=>v.roundTrip),allRepeatedMessagesIdentical:variants.every(v=>v.sameMessageSameCiphertext)};
 });
 check(cases.length===5&&Object.keys(artifacts).length===20,'Incomplete campaign');
 return {report:{schema:'cubechat-media-cryptanalysis-v1',classification:'RESEARCH ONLY: deterministic public test keys; not cryptographic protection',threatModel:'Known media, publicly reproducible keys, four chosen-plaintext bit flips per file, identical-message repetition and cube block repetition; not blind key recovery or AES-GCM',parameters:{fanOut:3,regionCount:3,subcube:'keyed-codeword',distinctRegions:true,seedPolicy:'public deterministic filename-derived'},summary,cases},artifacts};
}
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),args=process.argv.slice(2),option=n=>{const i=args.indexOf(n);return i<0?null:args[i+1]};
 const folder=path.resolve(__dirname,'../tests/fixtures/cubechat-transit-only'),saved={};
 for(const [file] of fixtures)saved[file]=JSON.parse(fs.readFileSync(path.join(folder,file+'.cube.json'),'utf8'));
 const results=run(saved),out=option('--out-dir'),report=option('--report');
 if(out){fs.mkdirSync(path.resolve(out),{recursive:true});for(const [name,value] of Object.entries(results.artifacts))fs.writeFileSync(path.resolve(out,name),value)}
 if(report){const dest=path.resolve(report);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(results.report,null,2)+'\n')}
 console.log(JSON.stringify({ok:true,summary:results.report.summary,artifacts:Object.keys(results.artifacts).length,out,report},null,2));
}
module.exports={run,fixtures,modes,format};
