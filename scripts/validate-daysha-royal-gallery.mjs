#!/usr/bin/env node
/** Prevent unreviewed artwork from being restored to public GitHub Pages. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(readFileSync(join(root,'data/daysha-royal-purchases.json'),'utf8'));
assert.equal(m.archiveStatus,'rights_review_hold','Must retain rights quarantine until explicit authorized review');
assert.equal(m.verification.publishedDerivativeCount,0,'Unapproved gallery publication');
assert.equal(m.sources.length,0,'No unreviewed image source URLs in public manifest');
const dir=join(root,'assets/daysha/royal-purchases');
if(existsSync(dir))assert.equal(readdirSync(dir).filter(n=>/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(n)).length,0,'Unreviewed images restored');
const html=readFileSync(join(root,'royal-purchases.html'),'utf8');
assert(!/<img\b/i.test(html),'Gallery images may not be embedded during rights review');
assert(!/assets\/daysha\/royal-purchases\//.test(html),'Unreviewed artwork asset link');
assert(html.includes('rights review'),'Rights hold banner missing');
console.log('PASS: Daysha artwork remains quarantined; no unverified public images or gallery links.');
