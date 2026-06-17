import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readText = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const readJson = async relativePath => JSON.parse(await readText(relativePath));
const fail = message => { throw new Error(message); };

const schema = await readJson('data/kaysender/editors/p0-browser-verification.schema.json');
const smoke = await readText('kaysender-editor-live-smoke.js');
const runner = await readText('scripts/run-p0-browser-verification.mjs');
const workflow = await readText('.github/workflows/pages.yml');

const requiredReceiptFields = [
  'schemaVersion',
  'stage',
  'stageId',
  'testedAt',
  'browser',
  'result',
  'editorChain',
  'stageResults',
  'profiles'
];
const expectedEditorChain = [
  'floating-island-editor',
  'settlement-editor',
  'airship-editor'
];
const expectedProfileTypes = new Map([
  ['floating-island-editor', 'floating-island-foundation-profile'],
  ['settlement-editor', 'settlement-profile'],
  ['airship-editor', 'airship-profile']
]);

for (const field of requiredReceiptFields) {
  if (!schema.required?.includes(field)) fail(`Browser verification schema does not require '${field}'.`);
}
if (schema.properties?.schemaVersion?.const !== '1.0.0') fail('Browser verification schema version must be 1.0.0.');
if (schema.properties?.stage?.const !== 'P0') fail('Browser verification schema must be limited to P0.');
if (schema.properties?.stageId?.const !== 'shared-editor-kernel') fail('Browser verification schema stageId is incorrect.');
if (schema.properties?.result?.const !== 'passed') fail('Browser verification schema must only accept passed receipts.');

const chainSchema = schema.properties?.editorChain;
const chainConstants = (chainSchema?.prefixItems || []).map(item => item.const);
if (chainConstants.join('|') !== expectedEditorChain.join('|')) fail('Browser verification schema editor chain is incorrect.');
if (chainSchema?.minItems !== 3 || chainSchema?.maxItems !== 3 || chainSchema?.items !== false) {
  fail('Browser verification schema must require exactly the three P0 prototype editors.');
}

for (const marker of [
  "const RECEIPT_SCHEMA_VERSION = '1.0.0'",
  "const RECEIPT_STAGE = 'P0'",
  "const RECEIPT_STAGE_ID = 'shared-editor-kernel'",
  'editorChain: [...EDITOR_CHAIN]',
  'stageResults: results.map',
  "profileReceipt('floating-island-editor'",
  "profileReceipt('settlement-editor'",
  "profileReceipt('airship-editor'",
  'Copy Verification Receipt',
  'Download Verification Receipt',
  'getKaysenderEditorSmokeReceipt'
]) {
  if (!smoke.includes(marker)) fail(`Browser verification harness is missing contract marker '${marker}'.`);
}

for (const marker of [
  "import { chromium } from 'playwright'",
  'chromium.launch({ headless: true })',
  'window.runKaysenderEditorSmokeTest()',
  'window.getKaysenderEditorSmokeReceipt()',
  'p0-browser-verification-failure.png',
  "receipt.result !== 'passed'"
]) {
  if (!runner.includes(marker)) fail(`Automated browser runner is missing '${marker}'.`);
}

for (const marker of [
  'playwright@1.60.0',
  'npx playwright install --with-deps chromium',
  'node scripts/run-p0-browser-verification.mjs artifacts/p0-browser-verification.json',
  'node scripts/validate-p0-browser-verification.mjs artifacts/p0-browser-verification.json',
  'name: p0-browser-verification',
  'path: artifacts/',
  'rm -rf node_modules'
]) {
  if (!workflow.includes(marker)) fail(`Pages workflow is missing P0 browser gate marker '${marker}'.`);
}

function validateInheritanceReference(reference, label) {
  if (!reference || typeof reference !== 'object') fail(`${label} inheritance reference must be an object.`);
  if (!String(reference.relationship || '').trim()) fail(`${label} inheritance reference is missing relationship.`);
  if (!String(reference.profileId || '').trim()) fail(`${label} inheritance reference is missing profileId.`);
  if (!String(reference.profileType || '').trim()) fail(`${label} inheritance reference is missing profileType.`);
  if (!Number.isInteger(reference.revision) || reference.revision < 1) fail(`${label} inheritance reference has an invalid revision.`);
}

function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) fail('Browser verification receipt must be a JSON object.');
  if (receipt.schemaVersion !== '1.0.0') fail('Browser verification receipt has an unsupported schemaVersion.');
  if (receipt.stage !== 'P0' || receipt.stageId !== 'shared-editor-kernel') fail('Browser verification receipt does not identify the P0 shared editor kernel.');
  if (receipt.result !== 'passed') fail('Browser verification receipt is not a passing receipt.');
  if (!Number.isFinite(Date.parse(receipt.testedAt))) fail('Browser verification receipt testedAt is not a valid date-time.');
  if (!String(receipt.browser || '').trim()) fail('Browser verification receipt is missing the browser user agent.');
  if (!Array.isArray(receipt.editorChain) || receipt.editorChain.join('|') !== expectedEditorChain.join('|')) {
    fail('Browser verification receipt editorChain is incorrect.');
  }
  if (!Array.isArray(receipt.stageResults) || receipt.stageResults.length < 4) fail('Browser verification receipt requires at least four passing stage results.');
  for (const [index, result] of receipt.stageResults.entries()) {
    if (!result || typeof result !== 'object') fail(`Browser verification stage result ${index + 1} must be an object.`);
    if (result.ok !== true) fail(`Browser verification stage result '${result.stage || index + 1}' did not pass.`);
    if (!String(result.stage || '').trim() || !String(result.message || '').trim()) fail(`Browser verification stage result ${index + 1} is incomplete.`);
  }

  if (!Array.isArray(receipt.profiles) || receipt.profiles.length !== 3) fail('Browser verification receipt must contain exactly three profile receipts.');
  const profilesByEditor = new Map();
  for (const profile of receipt.profiles) {
    if (!expectedProfileTypes.has(profile?.editorId)) fail(`Browser verification receipt contains unknown editorId '${profile?.editorId}'.`);
    if (profilesByEditor.has(profile.editorId)) fail(`Browser verification receipt duplicates editorId '${profile.editorId}'.`);
    if (profile.profileType !== expectedProfileTypes.get(profile.editorId)) fail(`Profile type '${profile.profileType}' does not match editor '${profile.editorId}'.`);
    if (!/^[a-z0-9][a-z0-9-]*-[a-f0-9]{8,}$/.test(profile.profileId || '')) fail(`Profile '${profile.editorId}' has an invalid stable profileId.`);
    if (!Number.isInteger(profile.revision) || profile.revision < 1) fail(`Profile '${profile.editorId}' has an invalid revision.`);
    if (!Array.isArray(profile.inheritance)) fail(`Profile '${profile.editorId}' inheritance must be an array.`);
    profile.inheritance.forEach((reference, index) => validateInheritanceReference(reference, `${profile.editorId}[${index}]`));
    profilesByEditor.set(profile.editorId, profile);
  }

  const island = profilesByEditor.get('floating-island-editor');
  const settlement = profilesByEditor.get('settlement-editor');
  const airship = profilesByEditor.get('airship-editor');
  if (island.inheritance.length !== 0) fail('The root island verification profile must not inherit another profile.');
  if (!settlement.inheritance.some(reference => reference.profileId === island.profileId)) fail('Settlement verification profile does not inherit the verified island profile.');
  if (!airship.inheritance.some(reference => reference.profileId === island.profileId)) fail('Airship verification profile does not inherit the verified island profile.');
  if (!airship.inheritance.some(reference => reference.profileId === settlement.profileId)) fail('Airship verification profile does not inherit the verified settlement profile.');
}

const receiptPath = process.argv[2];
if (receiptPath) {
  const resolvedPath = path.isAbsolute(receiptPath) ? receiptPath : path.join(root, receiptPath);
  const receipt = JSON.parse(await fs.readFile(resolvedPath, 'utf8'));
  validateReceipt(receipt);
  console.log(`P0 browser verification receipt passed: ${receiptPath}`);
} else {
  console.log('P0 browser verification contract validation passed.');
  console.log('Verified receipt schema, harness field coverage, Chromium runner, Pages workflow wiring, evidence retention, and optional receipt validation rules.');
}
