#!/usr/bin/env node
'use strict';
/**
 * Binary Cube Laboratory file-type acceptance fixtures.
 * Uses the canonical engine and already published deterministic key presets.
 * Experimental reversible scrambling only: NOT confidentiality, authentication,
 * message transport, or a demonstration of production file encryption.
 * Run: node scripts/cubechat-file-type-roundtrip.cjs [--report path.json]
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Engine=require('../shadowrun-binary-cube-engine.js');
const catalog=require('../skills/binary-cube-laboratory/test-packages.json');
const presets=new Map(catalog.positiveCases.map(v=>[v.id,v.keyOptions]));
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function bits(buffer){let result='';for(const byte of buffer)result+=byte.toString(2).padStart(8,'0');return result}
function unbits(value){
  assert.equal(value.length%8,0,'Recovered file is not byte-aligned');
  const result=Buffer.alloc(value.length/8);
  for(let i=0;i<result.length;i++)result[i]=parseInt(value.slice(i*8,i*8+8),2);
  return result;
}
function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1)}
  return (c^0xffffffff)>>>0;
}
function makeWav(){
  const pcm=Buffer.alloc(128);
  for(let i=0;i<64;i++)pcm.writeInt16LE(Math.round(12000*Math.sin(i*Math.PI/8)),i*2);
  const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+pcm.length,4);
  header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);
  header.writeUInt16LE(1,22);header.writeUInt32LE(8000,24);header.writeUInt32LE(16000,28);
  header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  return Buffer.concat([header,pcm]);
}
function makePdf(){
  let s='%PDF-1.4\n';const offsets=[0];
  for(const body of [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream'
  ]){offsets.push(Buffer.byteLength(s));s+=offsets.length-1+' 0 obj\n'+body+'\nendobj\n'}
  const start=Buffer.byteLength(s);
  s+='xref\n0 5\n0000000000 65535 f \n';
  for(let i=1;i<=4;i++)s+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  s+='trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
  return Buffer.from(s,'ascii');
}
function makeZip(){
  const name=Buffer.from('inside.txt'),data=Buffer.from('CubeChat archive test\n'),crc=crc32(data);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);
  local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);
  central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);
  central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);
  central.writeUInt16LE(name.length,28);
  const dirOffset=local.length+name.length+data.length;
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);
  end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(dirOffset,16);
  return Buffer.concat([local,name,data,central,name,end]);
}
const samples=[
  ['tiny.png','image/png','repeated-byte-pattern',
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGMUzVrJwMDAxMDAwMDAAAANdgEsOvM1CQAAAABJRU5ErkJggg==','base64')],
  ['tiny.jpg','image/jpeg','full-mask-no-filler-capacity',
    Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDl6KKK+pPlD//Z','base64')],
  ['tiny.gif','image/gif','repeated-byte-pattern',Buffer.from('R0lGODdhAgACAIEAABVqqQAAAAAAAAAAACwAAAAAAgACAAAIBgABCAQQEAA7','base64')],
  ['tiny.webp','image/webp','full-mask-no-filler-capacity',Buffer.from('UklGRjgAAABXRUJQVlA4ICwAAADQAQCdASoCAAIAAgA0JaACdLoB+AADsAD+73bX/kpr/G3LV/8wSN1X74AAAA==','base64')],
  ['sample.pdf','application/pdf','repeated-byte-pattern',makePdf()],
  ['sample.wav','audio/wav','full-mask-no-filler-capacity',makeWav()],
  ['sample.zip','application/zip','repeated-byte-pattern',makeZip()],
  ['unicode.txt','text/plain; charset=utf-8','rotation-extremes',Buffer.from('Offline pairing: café / 東京 / 👋\n','utf8')],
  ['contacts.json','application/json','repeated-byte-pattern',Buffer.from(JSON.stringify({version:1,profiles:['A','B'],online:false})+'\n')],
  ['full-byte-range.bin','application/octet-stream','full-mask-no-filler-capacity',Buffer.from(Array.from({length:256},(_,i)=>i))],
  ['zero-rich.bin','application/octet-stream','repeated-byte-pattern',Buffer.from(Array.from({length:777},(_,i)=>i%3===0?0:(i%5===0?255:i%256)))]
];
const expectedHeaders={
 'tiny.png':'89504e470d0a1a0a','tiny.jpg':'ffd8ff','tiny.gif':'47494638',
 'tiny.webp':'52494646','sample.pdf':'255044462d','sample.wav':'52494646','sample.zip':'504b0304'
};
const report={schema:'cubechat-file-roundtrip-evidence-v1',classification:'EXPERIMENTAL NOT SECURE ENCRYPTION',cases:[]};
for(const [filename,mime,preset,data] of samples){
  assert.ok(data.length>0);
  if(expectedHeaders[filename])assert.ok(data.toString('hex').startsWith(expectedHeaders[filename]),filename+' signature');
  const key=Engine.createKey(presets.get(preset));
  const encoded=Engine.encryptBinary(bits(data),key);
  Engine.validatePackage(encoded,key);
  const recovered=unbits(Engine.decryptBinary(encoded,key));
  assert.deepEqual(recovered,data,filename+' exact recovery');
  const wrongKey=Engine.createKey({...presets.get(preset),seed:presets.get(preset).seed+'-wrong'});
  assert.throws(()=>Engine.decryptBinary(encoded,wrongKey),/different key/i,filename+' wrong-key');
  const modified={...encoded,ciphertext:(encoded.ciphertext[0]==='1'?'0':'1')+encoded.ciphertext.slice(1)};
  assert.throws(()=>Engine.validatePackage(modified,key),/checksum validation failed/i,filename+' tamper');
  report.cases.push({filename,mime,preset,sourceBytes:data.length,sourceSha256:digest(data),
    recoveredSha256:digest(recovered),ciphertextBits:encoded.ciphertext.length,
    blocks:encoded.blockCount,keyId:encoded.keyId,exact:true,wrongKeyRejected:true,bitFlipRejected:true});
}
assert.throws(()=>Engine.encryptBinary('',Engine.createKey(presets.get('baseline-canonical-4'))),
  /.+/,'empty-input limitation must remain explicit');
report.emptyFile={supported:false,reason:'Canonical bitstream engine rejects empty input; future container must frame empty files explicitly.'};
report.passed=report.cases.length;
if(process.argv[2]==='--report'){
  const target=path.resolve(process.argv[3]||'dist/cubechat-file-test-results.json');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
