import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(desktopDirectory, '..', '..');
const vendorDirectory = path.join(desktopDirectory, 'app', 'vendor');

const sharedAssets = [
  'styles.css',
  'shadowrun-binary-cube-engine.js',
  'binary-cube-large-grid-ui.js',
  'shadowrun-binary-cube-auth.js',
  'shadowrun-binary-cube-encryption.js',
  'shadowrun-binary-cube-editor.js',
  'shadowrun-binary-cube-auth-ui.js',
  'shadowrun-binary-cube-secure-export.js',
  'binary-cube-visualizer.css',
  'binary-cube-visualizer-renderer.js',
  'shadowrun-binary-cube-visualizer.js'
];

await mkdir(vendorDirectory, { recursive: true });

for (const filename of sharedAssets) {
  await copyFile(
    path.join(repositoryRoot, filename),
    path.join(vendorDirectory, filename)
  );
}

console.log(`Prepared ${sharedAssets.length} shared Binary Cube assets in ${vendorDirectory}.`);
