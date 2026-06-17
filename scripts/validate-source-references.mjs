import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root,'source-page-references','source-manifest.json'),'utf8'));
if (manifest.schemaVersion !== '1.3.0') throw new Error('Unexpected source manifest schema.');
if (manifest.storage !== 'canonical-source-receipts') throw new Error('Source manifest must use canonical receipt storage during text-only repository intake.');
if (manifest.binaryTransferStatus !== 'pending-binary-capable-repository-transfer') throw new Error('Binary transfer status must remain explicit.');
if (!Array.isArray(manifest.documents) || manifest.documents.length !== 2) throw new Error('Expected exactly two registered source documents.');

const expected = new Map([
  ['chronicles-elemental-realms-swamps-toads-frogs-salamanders',{ pages:21, bytes:333084, sha256:'3fe1b910779a2b799305b52fb7005f72e18392d62198824708f1e6a48e434f0f', receipt:'source-page-references/Chronicles-of-Elemental-Realms-Swamps-Toads-Frogs-and-Salamanders.source.json', receiptSchema:'1.2.0', wikiDestination:'data/elemental-realms/wiki/wiki-index.json', integrationStatus:'dedicated-wiki-creature-reference-pass-3-complete' }],
  ['solanum-umbra-ttrpg',{ pages:248, bytes:1325003, sha256:'2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff', receipt:'source-page-references/Solanum-Umbra-TTRPG.source.json', receiptSchema:'1.0.0', wikiDestination:'data/solanum-umbra/wiki/wiki-index.json', integrationStatus:'dedicated-wiki-staged-multi-pass-integration-deferred' }]
]);

for (const document of manifest.documents) {
  const contract = expected.get(document.id);
  if (!contract) throw new Error(`Unexpected source document '${document.id}'.`);
  if (document.pages !== contract.pages || document.bytes !== contract.bytes || document.sha256 !== contract.sha256) throw new Error(`${document.id}: manifest metadata mismatch.`);
  if (document.receipt !== contract.receipt || !document.intendedBinaryPath?.endsWith('.pdf')) throw new Error(`${document.id}: incomplete source receipt or intended binary path.`);
  if (document.binaryPresentInGit !== false) throw new Error(`${document.id}: binary presence must not be overstated.`);
  if (document.wikiDestination !== contract.wikiDestination || document.integrationStatus !== contract.integrationStatus) throw new Error(`${document.id}: wiki destination or integration status mismatch.`);
  const receipt = JSON.parse(await fs.readFile(path.join(root,document.receipt),'utf8'));
  if (receipt.schemaVersion !== contract.receiptSchema || receipt.sourceId !== document.id) throw new Error(`${document.id}: receipt identity mismatch.`);
  if (receipt.pages !== contract.pages || receipt.bytes !== contract.bytes || receipt.sha256 !== contract.sha256) throw new Error(`${document.id}: receipt metadata mismatch.`);
  if (receipt.sourceStatus !== 'registered-from-conversation-upload') throw new Error(`${document.id}: unexpected source status.`);
  if (receipt.binaryGitStatus !== 'not-written-binary-connector-unavailable') throw new Error(`${document.id}: binary Git limitation is not recorded honestly.`);
  if (receipt.intendedRepositoryPath !== document.intendedBinaryPath || receipt.wikiDestination !== contract.wikiDestination || receipt.integrationStatus !== contract.integrationStatus) throw new Error(`${document.id}: receipt destination or status mismatch.`);
  if (document.id === 'chronicles-elemental-realms-swamps-toads-frogs-salamanders') {
    if (receipt.integratedScope?.creatureReferences !== 74 || receipt.integratedScope?.categories !== 12) throw new Error('Elemental Realms receipt does not record the current registry scope.');
    if (receipt.integratedScope?.leechCatalogueEntries !== 15 || receipt.integratedScope?.leechHostAndPreyEcologies !== 14) throw new Error('Elemental Realms receipt does not record the leech ecology scope.');
    if (receipt.integratedScope?.sourceDerivedAndNewCanonSeparated !== true) throw new Error('Elemental Realms receipt must preserve provenance separation.');
  }
}

const elementalIndex = JSON.parse(await fs.readFile(path.join(root,'data','elemental-realms','wiki','wiki-index.json'),'utf8'));
if (elementalIndex.setting !== 'Chronicles of the Elemental Realms') throw new Error('Elemental Realms wiki index has the wrong setting identity.');
if (elementalIndex.status !== 'creature-reference-pass-3-complete') throw new Error('Elemental Realms third creature-reference pass is not marked complete.');
if (!elementalIndex.sourceDocuments?.includes('source-page-references/Chronicles-of-Elemental-Realms-Swamps-Toads-Frogs-and-Salamanders.source.json')) throw new Error('Elemental Realms wiki index does not reference its source receipt.');

const solanumIndex = JSON.parse(await fs.readFile(path.join(root,'data','solanum-umbra','wiki','wiki-index.json'),'utf8'));
if (solanumIndex.setting !== 'Solanum Umbra') throw new Error('Solanum Umbra wiki index has the wrong setting identity.');
if (solanumIndex.status !== 'source-ingested-integration-deferred') throw new Error('Solanum Umbra must remain explicitly staged rather than prematurely integrated.');
if (!Array.isArray(solanumIndex.packs) || solanumIndex.packs.length !== 0) throw new Error('Solanum Umbra wiki packs must remain empty during source intake.');
if (!solanumIndex.sourceDocuments?.includes('source-page-references/Solanum-Umbra-TTRPG.source.json')) throw new Error('Solanum Umbra wiki index does not reference its source receipt.');

console.log('Source reference validation passed.');
console.log(`Verified ${manifest.documents.length} canonical source receipts.`);
console.log(`Registered ${manifest.documents.reduce((sum,item) => sum + item.pages,0)} source pages and ${manifest.documents.reduce((sum,item) => sum + item.bytes,0)} original PDF bytes.`);
console.log('Elemental Realms is assigned to its dedicated pass-three ecology wiki; Solanum Umbra remains staged separately.');
console.log('Raw PDF Git transfer remains pending and is not represented as complete.');
