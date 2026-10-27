#!/usr/bin/env node
/**
 * Daysha royal-purchases archive integrity check.
 *
 * Offline and deterministic: no network, browser runtime or Google credentials.
 * Keeps source artworks, display derivatives, physical gowns, episodes, and paid
 * purchases separate. Runs in GitHub Actions on changes to this archive.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const archive=JSON.parse(readFileSync(join(root,'data/daysha-royal-purchases.json'),'utf8'));
const galleryRoot=join(root,'assets/daysha/royal-purchases');
const assertUnique=(items,label)=>assert.equal(new Set(items).size,items.length,`Repeated ${label}`);
const allPaths=new Set();
const ids=new Set();
const filenames=new Set();
const garmentIds=new Set(archive.garments.map(g=>g.id));
const sourceIds=new Set(archive.sources.map(s=>s.id));

assert(Array.isArray(archive.sources) && archive.sources.length>=178,'Source archive unexpectedly shrank');
assert(Array.isArray(archive.garments) && archive.garments.length>=25,'Gown registry unexpectedly shrank');
assertUnique(archive.sources.map(s=>s.id),'source IDs');
assertUnique(archive.garments.map(g=>g.id),'garment IDs');
assert(Array.isArray(archive.sceneSequences),'Scene sequence ledger missing');
assertUnique(archive.sceneSequences.map(s=>s.id),'scene IDs');
assert(archive.costBenchmarks.benchmarksAreNotReceipts===true,'Estimates misrepresented as receipts');
assert(archive.recordPolicy.sceneRule,'Scene-to-invoice policy missing');

for(const g of archive.garments){
  assert(sourceIds.has(g.primarySourceId)||g.collection==='display',`Missing gown primary artwork: ${g.id}`);
  if(g.recordStatus==='display_only_unpaid'){
    assert.equal(g.cost?.paidGold??null,null,`An unselected display was charged: ${g.id}`);
  }else if(g.recordStatus==='purchased_verified'){
    assert(Number.isFinite(g.cost?.paidGold)&&g.cost.paidGold>=0,`Verified purchase missing actual paid amount: ${g.id}`);
    assert(g.purchaseDate || g.inWorldDate,`Verified purchase missing purchase date: ${g.id}`);
  }else{
    assert.equal(g.cost?.paidGold??null,null,`Unverified garment has claimed payment: ${g.id}`);
  }
}

for(const s of archive.sources){
  assert.equal(s.publicationStatus,'hosted_verified',`Image not published: ${s.fileName}`);
  assert(!ids.has(s.id)); ids.add(s.id);
  if(s.wardrobeId)assert(garmentIds.has(s.wardrobeId),`Invalid garment link: ${s.fileName}`);
  assert(typeof s.publishedImageUrl==='string','Missing public image path');
  assert(/^assets\/daysha\/royal-purchases\/[a-zA-Z0-9._-]+\.webp$/.test(s.publishedImageUrl),`Unsafe or non-WebP display path: ${s.publishedImageUrl}`);
  assert(!allPaths.has(s.publishedImageUrl),`Two separate source images overwrite the same derivative: ${s.publishedImageUrl}`);
  allPaths.add(s.publishedImageUrl);
  const pathname=join(root,s.publishedImageUrl);
  assert(existsSync(pathname),`Published gallery asset missing from Git: ${s.publishedImageUrl}`);
  assert(statSync(pathname).size>=1000,`Too-small/corrupt gallery asset: ${s.publishedImageUrl}`);
  const data=readFileSync(pathname);
  assert.equal(data.toString('ascii',0,4),'RIFF',`Invalid WebP container: ${s.publishedImageUrl}`);
  assert.equal(data.toString('ascii',8,12),'WEBP',`Invalid WebP signature: ${s.publishedImageUrl}`);
}
for(const pathname of readdirSync(galleryRoot).filter(x=>x.endsWith('.webp'))){
  assert(allPaths.has('assets/daysha/royal-purchases/'+pathname),`Unindexed public artwork: ${pathname}`);
}

for(const sc of archive.sceneSequences){
  assert(sc.sourceIds.length>0,`Empty episode: ${sc.id}`);
  assertUnique(sc.sourceIds,`episode source references in ${sc.id}`);
  assert.equal(sc.billingPolicy,'scene_only_no_new_purchase',`Episode accidentally billable: ${sc.id}`);
  for(const sid of sc.sourceIds){
    assert(sourceIds.has(sid),`Missing episode artwork ${sid} (${sc.id})`);
    const source=archive.sources.find(s=>s.id===sid);
    assert(source.sceneSequenceIds?.includes(sc.id),`Episode back-reference missing: ${sc.id} -> ${source.fileName}`);
  }
}

assert.equal(archive.verification.publishedDerivativeCount,archive.sources.length,'Gallery total stale');
assert.equal(archive.verification.unpublishedSourceFiles,0,'Published image count stale');
assert.equal(archive.verification.sceneSequenceCount,archive.sceneSequences.length,'Episode count stale');

const html=readFileSync(join(root,'royal-purchases.html'),'utf8');
const stories=readFileSync(join(root,'stories.html'),'utf8');
assert(stories.includes('royal-purchases.html'),'Stories does not link to the royal archive');
for(const id of ['garment-list','scene-sequence-list','source-list','scene-query','source-query','dress-query']){
  assert(html.includes('id="'+id+'"'),`Required gallery control missing: ${id}`);
}
assert(html.includes('renderScenes();renderSources();'),'Episode and source renderer not wired');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert(scripts.length>0,'Royal Purchases JavaScript missing');
for(const [i,script] of scripts.entries())new vm.Script(script,{filename:`royal-purchases-inline-${i}.js`});

console.log(`PASS Daysha royal archive: ${archive.sources.length} hosted images, ${archive.garments.length} design/display entries, ${archive.sceneSequences.length} scene sequences, no duplicate charges.`);
