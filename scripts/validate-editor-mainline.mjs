import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkTimeoutMs = 30_000;
const checks = [
  'scripts/validate-editor-provenance-integration.mjs',
  'scripts/validate-editor-generational-roundtrip.mjs',
  'scripts/validate-record-library-ui-runtime.mjs'
];

for (const relativePath of checks) {
  console.log(`\n=== ${relativePath} ===`);
  const result = spawnSync(process.execPath, [path.join(root, relativePath)], {
    cwd: root,
    stdio: 'inherit',
    timeout: checkTimeoutMs,
    killSignal: 'SIGTERM'
  });

  if (result.error) {
    const timedOut = result.error.code === 'ETIMEDOUT';
    console.error(
      timedOut
        ? `${relativePath} exceeded ${checkTimeoutMs / 1000}s and was terminated.`
        : `Could not run ${relativePath}: ${result.error.message}`
    );
    process.exit(1);
  }
  if (result.signal) {
    console.error(`${relativePath} was terminated by signal ${result.signal}.`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${relativePath} failed with exit code ${result.status ?? 'unknown'}.`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nEditor integration validation sequence passed.');
