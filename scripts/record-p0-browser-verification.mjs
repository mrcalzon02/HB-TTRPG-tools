import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const mode = process.argv[2];
const fail = message => { throw new Error(message); };

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function receiptDigest(receipt) {
  return crypto.createHash('sha256').update(canonicalJson(receipt), 'utf8').digest('hex');
}

function validateReceiptIdentity(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) fail('Receipt must be a JSON object.');
  if (receipt.schemaVersion !== '1.0.0') fail('Receipt schemaVersion must be 1.0.0.');
  if (receipt.stage !== 'P0' || receipt.stageId !== 'shared-editor-kernel') fail('Receipt does not identify the P0 shared editor kernel.');
  if (receipt.result !== 'passed') fail('Only a passing browser receipt may be recorded.');
  if (!Number.isFinite(Date.parse(receipt.testedAt))) fail('Receipt testedAt is invalid.');
}

function validateLedger(ledger) {
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) fail('Verification ledger must be a JSON object.');
  if (ledger.ledgerVersion !== '1.0.0') fail('Verification ledgerVersion must be 1.0.0.');
  if (!/^[a-f0-9]{40}$/.test(ledger.sourceCommit || '')) fail('Verification ledger sourceCommit must be a full Git SHA.');
  if (!/^\d+$/.test(String(ledger.workflowRunId || ''))) fail('Verification ledger workflowRunId must be numeric.');
  if (!Number.isFinite(Date.parse(ledger.recordedAt))) fail('Verification ledger recordedAt is invalid.');
  validateReceiptIdentity(ledger.receipt);
  const expectedDigest = receiptDigest(ledger.receipt);
  if (ledger.receiptSha256 !== expectedDigest) fail('Verification ledger receipt digest does not match its embedded receipt.');
  return ledger;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(path.resolve(root, filePath), 'utf8'));
}

if (mode === 'record') {
  const [, , , receiptPath, outputPath, sourceCommit, workflowRunId] = process.argv;
  if (!receiptPath || !outputPath || !sourceCommit || !workflowRunId) {
    fail('Usage: node scripts/record-p0-browser-verification.mjs record <receipt> <ledger> <sourceCommit> <workflowRunId>');
  }
  const receipt = await readJson(receiptPath);
  validateReceiptIdentity(receipt);
  const ledger = validateLedger({
    ledgerVersion: '1.0.0',
    sourceCommit,
    workflowRunId: String(workflowRunId),
    recordedAt: new Date().toISOString(),
    receiptSha256: receiptDigest(receipt),
    receipt
  });
  const resolvedOutput = path.resolve(root, outputPath);
  await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
  await fs.writeFile(resolvedOutput, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  console.log(`Recorded passing P0 browser verification ledger: ${outputPath}`);
} else if (mode === 'check') {
  const ledgerPath = process.argv[3];
  if (!ledgerPath) fail('Usage: node scripts/record-p0-browser-verification.mjs check <ledger>');
  validateLedger(await readJson(ledgerPath));
  console.log(`P0 browser verification ledger passed: ${ledgerPath}`);
} else {
  fail('Expected mode "record" or "check".');
}
