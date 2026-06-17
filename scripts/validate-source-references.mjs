import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root,'source-page-references','source-manifest.json'),'utf8'));
if (manifest.schemaVersion !== '1.0.0') throw new Error('Unexpected source manifest schema.');
if (!Array.isArray(manifest.documents) || manifest.documents.length !== 2) throw new Error('Expected exactly two newly retained source documents.');

const expected = new Map([
  ['chronicles-elemental-realms-swamps-toads-frogs-salamanders',{ pages:21, bytes:333084, sha256:'3fe1b910779a2b799305b52fb7005f72e18392d62198824708f1e6a48e434f0f' }],
  ['solanum-umbra-ttrpg',{ pages:248, bytes:1325003, sha256:'2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff' }]
]);

for (const document of manifest.documents) {
  const contract = expected.get(document.id);
  if (!contract) throw new Error(`Unexpected source document '${document.id}'.`);
  if (document.pages !== contract.pages || document.bytes !== contract.bytes || document.sha256 !== contract.sha256) throw new Error(`${document.id}: manifest metadata mismatch.`);
  if (!document.destination?.endsWith('.pdf') || !Array.isArray(document.parts) || !document.parts.length) throw new Error(`${document.id}: incomplete source storage record.`);
  const chunks = [];
  for (const part of document.parts) chunks.push(await fs.readFile(path.join(root,part),'utf8'));
  const bytes = Buffer.from(chunks.join('').replace(/\s+/g,''),'base64');
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== contract.bytes || digest !== contract.sha256) throw new Error(`${document.id}: retained source bytes failed verification.`);
  if (!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error(`${document.id}: decoded source is not a PDF.`);
}

const solanumIndex = JSON.parse(await fs.readFile(path.join(root,'data','solanum-umbra','wiki','wiki-index.json'),'utf8'));
if (solanumIndex.setting !== 'Solanum Umbra') throw new Error('Solanum Umbra wiki index has the wrong setting identity.');
if (solanumIndex.status !== 'source-ingested-integration-deferred') throw new Error('Solanum Umbra must remain explicitly staged rather than prematurely integrated.');
if (!Array.isArray(solanumIndex.packs) || solanumIndex.packs.length !== 0) throw new Error('Solanum Umbra wiki packs must remain empty during source intake.');
if (!solanumIndex.sourceDocuments?.includes('source-page-references/Solanum-Umbra-TTRPG.pdf')) throw new Error('Solanum Umbra wiki index does not reference its retained source PDF.');

console.log('Source reference validation passed.');
console.log(`Verified ${manifest.documents.length} exact PDF source bundles.`);
console.log(`Verified ${manifest.documents.reduce((sum,item) => sum + item.pages,0)} source pages and ${manifest.documents.reduce((sum,item) => sum + item.bytes,0)} source bytes.`);
console.log('Solanum Umbra remains staged for later multi-pass wiki integration.');
