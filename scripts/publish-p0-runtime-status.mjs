import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const receiptPath = path.resolve(root, process.argv[2] || 'artifacts/p0-browser-verification.json');
const outputPath = path.resolve(root, process.argv[3] || 'p0-runtime-status.json');

function fail(message) {
  throw new Error(message);
}

function requiredEnvironment(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) fail(`Missing required GitHub Actions environment value ${name}.`);
  return value;
}

const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
if (receipt?.schemaVersion !== '1.0.0') fail('P0 browser receipt schemaVersion must be 1.0.0.');
if (receipt?.stage !== 'P0' || receipt?.stageId !== 'shared-editor-kernel') {
  fail('P0 browser receipt does not identify the shared editor kernel stage.');
}
if (receipt?.result !== 'passed') fail('Only a passing P0 browser receipt may be published.');
if (!Number.isFinite(Date.parse(receipt.testedAt))) fail('P0 browser receipt testedAt is invalid.');

const repository = requiredEnvironment('GITHUB_REPOSITORY');
const commitSha = requiredEnvironment('GITHUB_SHA');
const runId = requiredEnvironment('GITHUB_RUN_ID');
const runAttempt = Number(requiredEnvironment('GITHUB_RUN_ATTEMPT'));
const serverUrl = requiredEnvironment('GITHUB_SERVER_URL').replace(/\/$/, '');

if (repository !== 'mrcalzon02/HB-TTRPG-tools') fail(`Unexpected repository ${repository}.`);
if (!/^[a-f0-9]{40}$/i.test(commitSha)) fail(`Invalid GITHUB_SHA ${commitSha}.`);
if (!/^\d+$/.test(runId)) fail(`Invalid GITHUB_RUN_ID ${runId}.`);
if (!Number.isInteger(runAttempt) || runAttempt < 1) fail(`Invalid GITHUB_RUN_ATTEMPT ${runAttempt}.`);

const status = {
  schemaVersion: '1.0.0',
  stage: 'P0',
  stageId: 'shared-editor-kernel',
  result: 'passed',
  repository,
  branch: String(process.env.GITHUB_REF_NAME || 'main'),
  commitSha: commitSha.toLowerCase(),
  workflow: String(process.env.GITHUB_WORKFLOW || 'Deploy static site to GitHub Pages'),
  workflowRunId: runId,
  workflowRunAttempt: runAttempt,
  workflowRunUrl: `${serverUrl}/${repository}/actions/runs/${runId}`,
  publishedAt: new Date().toISOString(),
  browserReceipt: receipt
};

if (status.branch !== 'main') fail(`P0 runtime status may only be published from main, received ${status.branch}.`);

await fs.writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
console.log(`Published P0 runtime status for ${status.commitSha} to ${path.relative(root, outputPath)}.`);
console.log(`Workflow run: ${status.workflowRunUrl}`);
