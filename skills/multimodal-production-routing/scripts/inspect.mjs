#!/usr/bin/env node
/** Read-only, bounded offline media metadata probe. Never executes or renders the file. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const MAX_FILES = 16;
const MAX_BYTES = 32 * 1024 * 1024;
const fail = reason => { throw new Error(reason); };
const requireBytes = (buffer, offset, length) => {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset + length > buffer.length) fail('truncated or invalid media structure');
};
function dimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1048576 || height > 1048576) fail('invalid media dimensions');
  return { width, height };
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const octet of buffer) {
    crc ^= octet;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(bytes) {
  requireBytes(bytes, 0, 33);
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  if (!bytes.subarray(0,8).equals(signature) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii',12,16) !== 'IHDR') fail('invalid PNG signature/IHDR');
  if (crc32(bytes.subarray(12,29)) !== bytes.readUInt32BE(29)) fail('invalid PNG IHDR CRC');
  const d = dimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
  return { format:'png', mediaType:'image', ...d, bitDepth:bytes[24], colorType:bytes[25], animated: bytes.includes(Buffer.from('acTL'), 33) };
}
function gif(bytes) {
  requireBytes(bytes, 0, 13);
  const magic = bytes.toString('ascii',0,6);
  if (magic !== 'GIF87a' && magic !== 'GIF89a') fail('invalid GIF header');
  const d = dimensions(bytes.readUInt16LE(6), bytes.readUInt16LE(8));
  let cursor = 13, frames = 0, durationCentiseconds = 0, pendingDelay = 0, ended = false;
  if (bytes[10] & 0x80) cursor += 3 * (1 << ((bytes[10] & 7) + 1));
  const blocks = () => {
    while (true) {
      requireBytes(bytes,cursor,1);
      const size = bytes[cursor++];
      if (size === 0) return;
      requireBytes(bytes,cursor,size);
      cursor += size;
    }
  };
  while (cursor < bytes.length) {
    const marker = bytes[cursor++];
    if (marker === 0x3b) { ended = true; break; }
    if (marker === 0x21) {
      requireBytes(bytes,cursor,1);
      const label = bytes[cursor++];
      if (label === 0xf9) {
        requireBytes(bytes,cursor,6);
        if (bytes[cursor] !== 4 || bytes[cursor+5] !== 0) fail('invalid GIF graphics control block');
        pendingDelay = bytes.readUInt16LE(cursor+2);
        cursor += 6;
      } else blocks();
    } else if (marker === 0x2c) {
      requireBytes(bytes,cursor,9);
      const packed = bytes[cursor+8];
      const w = bytes.readUInt16LE(cursor+4), h = bytes.readUInt16LE(cursor+6);
      dimensions(w,h);
      cursor += 9;
      if (packed & 0x80) cursor += 3 * (1 << ((packed & 7) + 1));
      requireBytes(bytes,cursor,1); // LZW minimum code size
      cursor++;
      blocks();
      frames++;
      if (frames > 10000) fail('GIF frame limit exceeded');
      durationCentiseconds += pendingDelay;
      pendingDelay = 0;
    } else fail('unknown GIF block marker');
  }
  if (!ended || frames < 1) fail('incomplete GIF image');
  return { format:'gif', mediaType:'image', ...d, frames, animated:frames > 1, durationMs:durationCentiseconds * 10 };
}
function webp(bytes) {
  requireBytes(bytes,0,20);
  if (bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 > bytes.length) fail('invalid WebP RIFF container');
  let cursor = 12, meta = null, frames = 0;
  const end = bytes.readUInt32LE(4) + 8;
  while (cursor + 8 <= end) {
    const kind = bytes.toString('ascii',cursor,cursor+4), size = bytes.readUInt32LE(cursor+4), at = cursor+8;
    requireBytes(bytes,at,size);
    if (at+size > end) fail('invalid WebP chunk length');
    if (kind === 'VP8X' && size >= 10) meta = { ...dimensions(1+bytes[at+4]+(bytes[at+5]<<8)+(bytes[at+6]<<16),1+bytes[at+7]+(bytes[at+8]<<8)+(bytes[at+9]<<16)), animated:!!(bytes[at]&0x02) };
    else if (kind === 'VP8 ' && size >= 10 && !meta && bytes[at+3]===0x9d && bytes[at+4]===1 && bytes[at+5]===0x2a) meta = { ...dimensions(bytes.readUInt16LE(at+6)&0x3fff,bytes.readUInt16LE(at+8)&0x3fff),animated:false };
    else if (kind === 'VP8L' && size >= 5 && !meta && bytes[at]===0x2f) meta = { ...dimensions(1+bytes[at+1]+((bytes[at+2]&0x3f)<<8),1+(bytes[at+2]>>6)+(bytes[at+3]<<2)+((bytes[at+4]&15)<<10)),animated:false };
    if (kind==='ANMF') frames++;
    cursor = at + size + (size & 1);
  }
  if (!meta) fail('WebP has no supported dimensions header');
  return { format:'webp',mediaType:'image',...meta,...(meta.animated ? {frames} : {}) };
}
function jpeg(bytes) {
  requireBytes(bytes,0,4);
  if (bytes[0]!==0xff || bytes[1]!==0xd8) fail('invalid JPEG SOI');
  let cursor=2;
  while(cursor < bytes.length) {
    while (cursor < bytes.length && bytes[cursor] === 0xff) cursor++;
    requireBytes(bytes,cursor,1);
    const marker = bytes[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker===0x01 || (marker>=0xd0 && marker<=0xd8)) continue;
    requireBytes(bytes,cursor,2);
    const size=bytes.readUInt16BE(cursor);
    if (size<2) fail('invalid JPEG segment');
    requireBytes(bytes,cursor,size);
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      if (size<7) fail('truncated JPEG dimensions');
      return {format:'jpeg',mediaType:'image',...dimensions(bytes.readUInt16BE(cursor+3),bytes.readUInt16BE(cursor+5)),bitDepth:bytes[cursor+2]};
    }
    cursor+=size;
  }
  fail('JPEG dimensions marker not found');
}
function wav(bytes) {
  requireBytes(bytes,0,12);
  if (bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WAVE' || bytes.readUInt32LE(4)+8>bytes.length) fail('invalid WAV RIFF container');
  let cursor=12, fmt=null, dataBytes=null;
  const end=bytes.readUInt32LE(4)+8;
  while(cursor+8<=end) {
    const kind=bytes.toString('ascii',cursor,cursor+4),size=bytes.readUInt32LE(cursor+4),at=cursor+8;
    requireBytes(bytes,at,size);
    if(at+size>end) fail('invalid WAV chunk length');
    if(kind==='fmt ' && size>=16) fmt={coding:bytes.readUInt16LE(at),channels:bytes.readUInt16LE(at+2),sampleRate:bytes.readUInt32LE(at+4),byteRate:bytes.readUInt32LE(at+8),blockAlign:bytes.readUInt16LE(at+12),bitDepth:bytes.readUInt16LE(at+14)};
    if(kind==='data') dataBytes=size;
    cursor=at+size+(size&1);
  }
  if (!fmt || dataBytes===null || fmt.channels<1 || fmt.channels>64 || fmt.sampleRate<1 || fmt.byteRate<1 || fmt.blockAlign<1) fail('incomplete WAV PCM/float metadata');
  return { format:'wav',mediaType:'audio',channels:fmt.channels,sampleRate:fmt.sampleRate,bitDepth:fmt.bitDepth,coding:fmt.coding,dataBytes,durationMs:Math.round(dataBytes*1000/fmt.byteRate) };
}
function inspect(bytes) {
  if (bytes.length>=8 && bytes[0]===137 && bytes.toString('ascii',1,4)==='PNG') return png(bytes);
  const mark=bytes.toString('ascii',0,4);
  if (mark==='GIF8') return gif(bytes);
  if (mark==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return webp(bytes);
  if (mark==='RIFF' && bytes.toString('ascii',8,12)==='WAVE') return wav(bytes);
  if (bytes[0]===0xff && bytes[1]===0xd8) return jpeg(bytes);
  fail('unsupported media format');
}
function main(args) {
  const terms=[...args];
  let root=process.cwd();
  if (terms[0]==='--root') {if (!terms[1]) fail('missing --root directory'); root=terms[1];terms.splice(0,2);}
  if (!terms.length || terms.length>MAX_FILES || terms.some(x=>x.startsWith('--'))) fail('usage: inspect.mjs [--root DIRECTORY] relative-file [relative-file ...] (1-16 files)');
  const realRoot=fs.realpathSync(root);
  const result=[];
  for (const name of terms) {
    if (path.isAbsolute(name) || name.includes('\0')) fail('file paths must be relative to the selected root');
    const resolved=path.resolve(realRoot,name);
    if (fs.lstatSync(resolved).isSymbolicLink()) fail('symlink asset rejected');
    const real=fs.realpathSync(resolved);
    if (!real.startsWith(realRoot+path.sep) || !fs.statSync(real).isFile()) fail('asset escapes the selected root or is not a file');
    const {size}=fs.statSync(real);
    if (size<1 || size>MAX_BYTES) fail('asset outside bounded 1-byte to 32-MiB size range');
    const bytes=fs.readFileSync(real);
    result.push({ file:path.relative(realRoot,real).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...inspect(bytes) });
  }
  return {format:'hb-media-inspection/1',readOnly:true,assetExecutionPerformed:false,visualProofProvided:false,gameRuntimeAcceptanceVerified:false,results:result};
}
try {process.stdout.write(JSON.stringify(main(process.argv.slice(2)),null,2)+'\n');}
catch(error){process.stderr.write(`[media-inspect] ${error.message}\n`);process.exitCode=1;}
