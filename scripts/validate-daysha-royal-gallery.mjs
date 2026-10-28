#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(readFileSync(join(root,'data/daysha-royal-purchases.json'),'utf8'));
assert.equal(m.archiveStatus,'approved_generated_subset');
assert.equal(m.rightsPolicy.legacySourceCount,178);
assert.equal(m.sources.length,13);
assert.equal(m.verification.publishedDerivativeCount,m.sources.length);
assert.equal(m.rightsPolicy.legacyItemsStillWithheld,166);
const dir=join(root,'assets/daysha/royal-purchases');
const allowed=new Set();
const ids=new Set();
for(const s of m.sources){
  assert(!ids.has(s.id),'Duplicate source ID'); ids.add(s.id);
  assert.equal(s.referenceMedia,false,'Reference image forbidden');
  assert.equal(s.provenance.includes('conversation'),true,'Only provenance-marked originals allowed');
  assert.match(s.image,/^assets\/daysha\/royal-purchases\/[a-z0-9-]+\.(?:webp|avif)$/);
  const name=basename(s.image); assert(!allowed.has(name),'Duplicated output'); allowed.add(name);
  assert.match(s.gitBlobSha,/^[a-f0-9]{40}$/);
  const p=join(root,s.image);
  assert(existsSync(p),'Missing approved GitHub image: '+s.image);
  const buffer=readFileSync(p);
  if(name.endsWith('.webp')) {
    assert.equal(buffer.subarray(0,4).toString('ascii'),'RIFF','Invalid WebP header: '+name);
    assert.equal(buffer.subarray(8,12).toString('ascii'),'WEBP','Invalid WebP content: '+name);
  } else {
    assert.equal(buffer.subarray(4,8).toString('ascii'),'ftyp','Invalid AVIF header: '+name);
    assert.match(buffer.subarray(8,16).toString('ascii'),/avif|avis/,'Invalid AVIF brand: '+name);
  }
  const actual=createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');
  assert.equal(actual,s.gitBlobSha,'Unexpected, substituted or modified image: '+name);
}
assert.equal(allowed.size,13);
assert.deepEqual(readdirSync(dir).filter(n=>/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(n)).sort(),[...allowed].sort(),'Extra unreviewed image was added');
for(const g of m.garments) assert(ids.has(g.primarySourceId),'Dangling garment image');
for(const seq of m.sceneSequences) for(const id of seq.sourceIds) assert(ids.has(id),'Dangling episode image');
assert.equal(m.accounting.verifiedReceiptCount,0,'Do not invent purchases');
const html=readFileSync(join(root,'royal-purchases.html'),'utf8');
assert(html.includes('data/daysha-royal-purchases.json'),'Gallery must read curated manifest');
console.log('PASS: 13 allowlisted original images, exact Git blob hashes, no third-party references, valid scenes and zero fabricated invoices.');
