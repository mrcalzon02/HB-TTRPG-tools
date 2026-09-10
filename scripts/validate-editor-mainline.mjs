import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  'scripts/validate-editor-provenance-integration.mjs',
  'scripts/validate-editor-generational-roundtrip.mjs',
  'scripts/validate-record-library-ui-runtime.mjs'
];

for (const relativePath of checks) {
  console.log(`\n=== ${relativePath} ===`);
  const result = spawnSync(process.execPath, [path.join(root, relativePath)], {
    cwd: root,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(`Could not run ${relativePath}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${relativePath} failed with exit code ${result.status ?? 'unknown'}.`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nEditor integration validation sequence passed.');
