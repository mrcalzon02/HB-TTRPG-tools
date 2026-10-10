'use strict';
// Portable store-mode ZIP packager; works with Node 20+ on Windows/macOS/Linux.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'dist');
const FILES=[
'cubechat-server.cjs','cubechat-forum.cjs','cubechat-forum.html','cubechat-host.html',
'cubechat-network.html','cubechat-provision.html','cubechat-key-handoff.html',
'cubechat-large-keys.html','cubechat-large-key-adapter.js','cubechat.html',
'shadowrun-binary-cube-engine.js','docs/cubechat-lan-development.md',
'docs/cubechat-release-candidate.md'
];
let crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function u16(b,v,o){b.writeUInt16LE(v,o)}function u32(b,v,o){b.writeUInt32LE(v>>>0,o)}
const entries=[],local=[],central=[];let offset=0;
for(const file of FILES){
 const absolute=path.join(ROOT,file);if(!fs.existsSync(absolute))throw Error('Missing source file: '+file);
 const data=fs.readFileSync(absolute),name=Buffer.from(file.replaceAll('\\','/'),'utf8'),crc=crc32(data);
 if(data.length>0xffffffff||name.length>65535)throw Error('ZIP entry too large');
 const hdr=Buffer.alloc(30);u32(hdr,0x04034b50,0);u16(hdr,20,4);u16(hdr,0x0800,6);u32(hdr,crc,14);u32(hdr,data.length,18);u32(hdr,data.length,22);u16(hdr,name.length,26);
 local.push(hdr,name,data);
 const dir=Buffer.alloc(46);u32(dir,0x02014b50,0);u16(dir,20,4);u16(dir,20,6);u16(dir,0x0800,8);u32(dir,crc,16);u32(dir,data.length,20);u32(dir,data.length,24);u16(dir,name.length,28);u32(dir,offset,42);
 central.push(dir,name);offset+=hdr.length+name.length+data.length;
 entries.push(file+'  sha256:'+crypto.createHash('sha256').update(data).digest('hex'));
}
const dir=Buffer.concat(central),end=Buffer.alloc(22);u32(end,0x06054b50,0);u16(end,FILES.length,8);u16(end,FILES.length,10);u32(end,dir.length,12);u32(end,offset,16);
fs.mkdirSync(OUT,{recursive:true});const target=path.join(OUT,'cubechat-v0.1.0-alpha.1-portable.zip'),zip=Buffer.concat([...local,dir,end]);fs.writeFileSync(target,zip);
const digest=crypto.createHash('sha256').update(zip).digest('hex');
fs.writeFileSync(path.join(OUT,'SHA256SUMS.txt'),digest+'  '+path.basename(target)+'\n');
fs.writeFileSync(path.join(OUT,'FILE-MANIFEST.txt'),entries.join('\n')+'\n');
console.log('Created '+target+' ('+zip.length+' bytes), sha256 '+digest);
