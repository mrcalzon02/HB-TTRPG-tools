import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cli=fileURLToPath(new URL('../scripts/inspect.mjs',import.meta.url));
const fixtures=()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hb-media-probe-'));
  const put=(file,content)=>fs.writeFileSync(path.join(root,file),content);
  const run=(...args)=>spawnSync(process.execPath,[cli,'--root',root,...args],{encoding:'utf8'});
  return {root,put,run,done:()=>fs.rmSync(root,{recursive:true,force:true})};
};
const gif=Buffer.from('R0lGODlhAQABAIAAAP///////yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==','base64');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/ZeQAAAAASUVORK5CYII=','base64');
function wav() {
  const size=1600, b=Buffer.alloc(12+24+8+size);
  b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(size,40);
  return b;
}
function webp() {
  const b=Buffer.alloc(30);b.write('RIFF',0);b.writeUInt32LE(22,4);b.write('WEBPVP8X',8);b.writeUInt32LE(10,16);
  b[24]=39;b[27]=19;return b;
}
function jpeg() {
  return Buffer.from([0xff,0xd8,0xff,0xc0,0,0x0b,8,0,20,0,40,3,1,0x11,0,0xff,0xd9]);
}
test('reads PNG, GIF, WebP, JPEG and WAV metadata without promising visual acceptance',()=>{
  const f=fixtures();try{
    for(const [name,buf] of [['s.png',png],['a.gif',gif],['t.webp',webp()],['p.jpg',jpeg()],['v.wav',wav()]])f.put(name,buf);
    const r=f.run('s.png','a.gif','t.webp','p.jpg','v.wav');
    assert.equal(r.status,0,r.stderr);
    const x=JSON.parse(r.stdout);
    assert.equal(x.format,'hb-media-inspection/1');assert.equal(x.readOnly,true);
    assert.equal(x.visualProofProvided,false);assert.equal(x.gameRuntimeAcceptanceVerified,false);
    assert.deepEqual(x.results.map(z=>z.format),['png','gif','webp','jpeg','wav']);
    assert.deepEqual(x.results.map(z=>z.width),[1,1,40,20,undefined]);
    assert.deepEqual(x.results.map(z=>z.height),[1,1,20,40,undefined]);
    assert.equal(x.results[4].mediaType,'audio');assert.equal(x.results[4].durationMs,100);assert.equal(x.results[4].sampleRate,8000);
    for(const row of x.results){assert.match(row.sha256,/^[a-f0-9]{64}$/);assert.doesNotMatch(row.file,/\/tmp\/|\\/);}
  }finally{f.done();}
});
test('refuses malformed and truncated asset structures, including corrupted PNG IHDR CRC',()=>{
  const f=fixtures();try{
    f.put('broken.png',Buffer.from(png));const broken=fs.readFileSync(path.join(f.root,'broken.png'));broken[22]^=1;f.put('broken.png',broken);
    f.put('unknown.bin',Buffer.from('garbage'));
    f.put('bad.gif',gif.subarray(0,13));
    assert.notEqual(f.run('broken.png').status,0);
    assert.notEqual(f.run('unknown.bin').status,0);
    assert.notEqual(f.run('bad.gif').status,0);
  }finally{f.done();}
});
test('cannot open absolute, parent-traversing, symlink, directory or oversized assets',()=>{
  const f=fixtures();try{
    f.put('s.png',png);f.put('big.png',Buffer.alloc(32*1024*1024+1));
    assert.notEqual(f.run('/etc/passwd').status,0);
    assert.notEqual(f.run('../outside.png').status,0);
    assert.notEqual(f.run('.').status,0);
    assert.notEqual(f.run('big.png').status,0);
    fs.symlinkSync('s.png',path.join(f.root,'shortcut.png'));
    assert.notEqual(f.run('shortcut.png').status,0);
    assert.notEqual(f.run(...Array(17).fill('s.png')).status,0);
  }finally{f.done();}
});
test('bad WAV, bad WebP and bad JPEG headers are rejected',()=>{
  const f=fixtures();try{
    for (const [n,b] of [['a.wav',wav().subarray(0,50)],['b.webp',webp().subarray(0,26)],['c.jpg',Buffer.from([255,216,255,217])]]) f.put(n,b);
    assert.notEqual(f.run('a.wav').status,0);assert.notEqual(f.run('b.webp').status,0);assert.notEqual(f.run('c.jpg').status,0);
  }finally{f.done();}
});
