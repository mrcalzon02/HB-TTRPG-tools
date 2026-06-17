import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const manifestPath = path.join(root,'source-page-references','source-manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath,'utf8'));

if (manifest.schemaVersion !== '1.6.0') throw new Error('Unexpected source manifest schema.');
if (manifest.storage !== 'canonical-source-receipts-with-verified-src-binaries') throw new Error('Unexpected source storage policy.');
if (manifest.binaryTransferStatus !== 'registered-binaries-present-and-identity-verified') throw new Error('Registered binary status is incorrect.');
if (!Array.isArray(manifest.documents) || manifest.documents.length !== 3) throw new Error('Expected exactly three assigned source documents.');
if (manifest.unassignedInventory?.path !== 'source-page-references/unassigned-src-inventory.json' || manifest.unassignedInventory?.count !== 12) throw new Error('Unassigned source inventory pointer or count is incorrect.');

const expected = new Map([
  ['chronicles-elemental-realms-swamps-toads-frogs-salamanders',{pages:21,bytes:333084,sha256:'3fe1b910779a2b799305b52fb7005f72e18392d62198824708f1e6a48e434f0f',receipt:'source-page-references/Chronicles-of-Elemental-Realms-Swamps-Toads-Frogs-and-Salamanders.source.json',receiptSchema:'1.3.0',binaryPath:'SRC/Chronicles of Elemental Realms_ Swamps, Toads, Frogs, and Salamanders.pdf',wikiDestination:'data/elemental-realms/wiki/wiki-index.json',integrationStatus:'dedicated-wiki-creature-reference-pass-3-complete'}],
  ['solanum-umbra-ttrpg',{pages:248,bytes:1325003,sha256:'2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff',receipt:'source-page-references/Solanum-Umbra-TTRPG.source.json',receiptSchema:'1.4.0',binaryPath:'SRC/Solanum-Umbra-TTRPG.pdf',wikiDestination:'data/solanum-umbra/wiki/wiki-index.json',integrationStatus:'native-foundation-import-active'}],
  ['mad-martikens-menagerie-of-magical-services',{pages:14,bytes:212449,sha256:'3ce56fc43563b00a8a9cd34e828f4e2e0c0e2e7a0a66c4767f80d155d293e8dc',receipt:'source-page-references/Mad-Martikens-Menagerie-of-Magical-Services.source.json',receiptSchema:'1.1.0',binaryPath:'SRC/Mad Martiken’s Menagerie of Magical Services.pdf',wikiDestination:'data/kaysender/wiki/wiki-index.json',integrationStatus:'kaysender-locations-of-note-complete'}]
]);

for (const document of manifest.documents) {
  const contract = expected.get(document.id);
  if (!contract) throw new Error(`Unexpected assigned source '${document.id}'.`);
  if (document.pages !== contract.pages || document.bytes !== contract.bytes || document.sha256 !== contract.sha256) throw new Error(`${document.id}: manifest identity mismatch.`);
  if (document.receipt !== contract.receipt || document.binaryPath !== contract.binaryPath || document.binaryPresentInGit !== true) throw new Error(`${document.id}: path or binary state mismatch.`);
  if (document.wikiDestination !== contract.wikiDestination || document.integrationStatus !== contract.integrationStatus) throw new Error(`${document.id}: assignment or import state mismatch.`);

  const binary = await fs.readFile(path.join(root,document.binaryPath));
  if (binary.byteLength !== contract.bytes) throw new Error(`${document.id}: repository binary byte count mismatch.`);
  const digest = createHash('sha256').update(binary).digest('hex');
  if (digest !== contract.sha256) throw new Error(`${document.id}: repository binary digest mismatch.`);

  const receipt = JSON.parse(await fs.readFile(path.join(root,document.receipt),'utf8'));
  if (receipt.schemaVersion !== contract.receiptSchema || receipt.sourceId !== document.id) throw new Error(`${document.id}: receipt identity mismatch.`);
  if (receipt.pages !== contract.pages || receipt.bytes !== contract.bytes || receipt.sha256 !== contract.sha256) throw new Error(`${document.id}: receipt metadata mismatch.`);
  if (receipt.sourceStatus !== 'verified-repository-binary' || receipt.binaryGitStatus !== 'present-and-identity-verified') throw new Error(`${document.id}: receipt binary verification state is incorrect.`);
  if (receipt.repositoryPath !== contract.binaryPath || receipt.wikiDestination !== contract.wikiDestination || receipt.integrationStatus !== contract.integrationStatus) throw new Error(`${document.id}: receipt path or assignment mismatch.`);

  if (document.id === 'chronicles-elemental-realms-swamps-toads-frogs-salamanders') {
    if (receipt.integratedScope?.creatureReferences !== 74 || receipt.integratedScope?.leechCatalogueEntries !== 15 || receipt.integratedScope?.leechHostAndPreyEcologies !== 14) throw new Error('Elemental Realms receipt scope is incomplete.');
    if (receipt.integratedScope?.sourceDerivedAndNewCanonSeparated !== true) throw new Error('Elemental Realms provenance separation is missing.');
  }

  if (document.id === 'solanum-umbra-ttrpg') {
    if (receipt.mechanicsPolicy !== 'preserve-native-system-no-external-conversion') throw new Error('Solanum native mechanics policy is incorrect.');
    if (receipt.integratedScope?.nativeWikiEntries !== 36 || receipt.integratedScope?.nativePacks !== 8 || receipt.integratedScope?.externalRulesConversion !== false) throw new Error('Solanum import scope is incomplete.');
    if (receipt.integratedScope?.careerTalentFamilies !== 5 || receipt.integratedScope?.entityGeneratorTables !== 7 || receipt.integratedScope?.namedForceRoles !== 36) throw new Error('Solanum imported system counts are incorrect.');
    if (receipt.integratedScope?.cyberneticTechnologyLevels !== 5 || receipt.integratedScope?.cyberneticBodyParts !== 8 || receipt.integratedScope?.bioticEnhancements !== 12 || receipt.integratedScope?.degradationOutcomes !== 21) throw new Error('Solanum cybernetics scope is incomplete.');
    if (receipt.integratedScope?.professionAdvancementTracks !== 2 || receipt.integratedScope?.generalEquipmentEntries !== 7) throw new Error('Solanum advancement or equipment scope is incomplete.');
    if (!Array.isArray(receipt.recordedSourceGaps) || receipt.recordedSourceGaps.length < 7) throw new Error('Solanum source gaps are not documented.');
  }

  if (document.id === 'mad-martikens-menagerie-of-magical-services') {
    if (receipt.integratedEntryId !== 'mad-martikens-menagerie-of-magical-services' || receipt.integratedScope?.category !== 'Locations of Note') throw new Error('Mad Martiken assignment is incorrect.');
    if (receipt.integratedScope?.sourceMutationTables !== 6 || receipt.integratedScope?.expandedRulesTables !== 6 || receipt.integratedScope?.sourceCaseStudies !== 2) throw new Error('Mad Martiken integration scope is incomplete.');
  }
}

const inventory = JSON.parse(await fs.readFile(path.join(root,manifest.unassignedInventory.path),'utf8'));
if (inventory.schemaVersion !== '1.0.0' || inventory.status !== manifest.unassignedInventory.status) throw new Error('Unassigned inventory identity or status mismatch.');
if (!Array.isArray(inventory.files) || inventory.files.length !== manifest.unassignedInventory.count) throw new Error('Unassigned inventory file count mismatch.');
if (new Set(inventory.files).size !== inventory.files.length) throw new Error('Unassigned inventory contains duplicate paths.');
for (const file of inventory.files) {
  if (!file.startsWith('SRC/')) throw new Error(`Unassigned path is outside SRC: ${file}`);
  const stat = await fs.stat(path.join(root,file));
  if (!stat.isFile() || stat.size <= 0) throw new Error(`Unassigned source is missing or empty: ${file}`);
}

const elementalIndex = JSON.parse(await fs.readFile(path.join(root,'data','elemental-realms','wiki','wiki-index.json'),'utf8'));
if (elementalIndex.setting !== 'Chronicles of the Elemental Realms' || elementalIndex.status !== 'creature-reference-pass-3-complete') throw new Error('Elemental Realms wiki state is incorrect.');

const solanumIndex = JSON.parse(await fs.readFile(path.join(root,'data','solanum-umbra','wiki','wiki-index.json'),'utf8'));
if (solanumIndex.setting !== 'Solanum Umbra' || solanumIndex.schemaVersion !== '0.5.0' || solanumIndex.status !== 'native-foundation-import-active') throw new Error('Solanum wiki state is incorrect.');
if (solanumIndex.mechanicsPolicy?.conversion !== 'none' || solanumIndex.packs?.length !== 8) throw new Error('Solanum pack count or native mechanics policy is incorrect.');

const kaysenderIndex = JSON.parse(await fs.readFile(path.join(root,'data','kaysender','wiki','wiki-index.json'),'utf8'));
if (kaysenderIndex.setting !== 'Kaysender' || !kaysenderIndex.packs?.includes('data/kaysender/wiki/locations-of-note-mad-martikens-menagerie.json')) throw new Error('Kaysender source assignment is incorrect.');

console.log('Source reference validation passed.');
console.log(`Verified ${manifest.documents.length} assigned source binaries and ${inventory.files.length} unassigned source files.`);
console.log(`Verified ${manifest.documents.reduce((sum,item) => sum + item.pages,0)} assigned source pages and ${manifest.documents.reduce((sum,item) => sum + item.bytes,0)} assigned PDF bytes.`);
console.log('Solanum Umbra remains native-system-only; unassigned sources remain isolated until their settings are reviewed.');
