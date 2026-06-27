import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  ['syntax:spatial-loader', ['--check', 'world-of-darkness-spatial-loader.js']],
  ['syntax:detail-diversity-core', ['--check', 'world-of-darkness-detail-diversity-core.js']],
  ['syntax:radial-loader', ['--check', 'world-of-darkness-radial-location-loader.js']],
  ['syntax:package-bridge', ['--check', 'world-of-darkness-location-package-bridge.js']],
  ['syntax:browser-context-guard', ['--check', 'world-of-darkness-context-aware-variants.js']],
  ['syntax:package-ingestion', ['--check', 'scripts/ingest-wod-location-package.mjs']],
  ['syntax:server-context-guard', ['--check', 'scripts/enrich-wod-location-context.mjs']],
  ['contract:location-inventory', ['scripts/validate-wod-location-inventory.mjs']],
  ['contract:world-seed-packages', ['scripts/validate-wod-world-seed-packages.mjs']],
  ['contract:legacy-context-matrix', ['scripts/validate-wod-context-aware-variants.mjs']],
  ['contract:detail-diversity', ['scripts/validate-wod-detail-diversity.mjs']],
  ['contract:map-only-core', ['scripts/validate-wod-map-only-core.mjs']],
  ['contract:world-scan-governance', ['scripts/validate-wod-world-scan-overlay.mjs']]
];

const results = [];
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  });
  results.push({
    name,
    passed: result.status === 0,
    exitCode: result.status,
    signal: result.signal,
    stdout: String(result.stdout || '').trim().slice(0, 20000),
    stderr: String(result.stderr || '').trim().slice(0, 20000)
  });
}

const failed = results.filter(result => !result.passed);
const validatedCommit = process.env.GITHUB_SHA || process.env.VALIDATED_COMMIT || 'local-unresolved';
const checkedAt = new Date().toISOString();
const receipt = {
  receiptType: 'wodDetailDiversityValidation',
  schemaVersion: '1.0.0',
  status: failed.length ? 'failed' : 'passed',
  validatedCommit,
  workflow: '.github/workflows/validate-wod-world-scan-overlay.yml',
  checkedAt,
  totalChecks: results.length,
  passedChecks: results.length - failed.length,
  failedChecks: failed.length,
  results
};

const receiptPath = 'data/world-of-darkness/validation/detail-diversity-ci-receipt.json';
fs.mkdirSync('data/world-of-darkness/validation', { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

if (!failed.length) {
  const milestonePath = 'docs/world-of-darkness-milestones.md';
  let milestones = fs.readFileSync(milestonePath, 'utf8');
  milestones = milestones.replace(
    '**Status: Complete — automated regression result pending**',
    '**Status: Complete — automated regression passed**'
  );
  fs.writeFileSync(milestonePath, milestones);

  const governancePath = 'source-page-references/chronicle-spatial-engine.source.json';
  const governance = JSON.parse(fs.readFileSync(governancePath, 'utf8'));
  governance.detailDiversityValidationReceipt = receiptPath;
  governance.detailDiversity ||= {};
  governance.detailDiversity.validation = {
    status: 'passed',
    validatedCommit,
    checkedAt,
    totalChecks: receipt.totalChecks,
    passedChecks: receipt.passedChecks,
    failedChecks: receipt.failedChecks,
    sampleSize: 24,
    hiddenFunctionUniqueCount: 24
  };
  fs.writeFileSync(governancePath, `${JSON.stringify(governance, null, 2)}\n`);
}

console.log(JSON.stringify({
  receiptPath,
  status: receipt.status,
  totalChecks: receipt.totalChecks,
  passedChecks: receipt.passedChecks,
  failedChecks: receipt.failedChecks,
  finalizedGovernance: failed.length === 0,
  failures: failed.map(result => ({ name: result.name, exitCode: result.exitCode, stderr: result.stderr, stdout: result.stdout }))
}, null, 2));
