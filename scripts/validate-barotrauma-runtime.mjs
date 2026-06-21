import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const loaderPath = path.join(root, 'barotrauma-rpg-tools-loader.js');
const loader = fs.readFileSync(loaderPath, 'utf8');
const runtimePaths = [...loader.matchAll(/'([^']*barotrauma-rpg-tools\.part-[^']+\.txt)'/g)].map(match => match[1]);

if (!runtimePaths.length) throw new Error('No Barotrauma runtime fragments were found in the loader.');
if (new Set(runtimePaths).size !== runtimePaths.length) throw new Error('The runtime loader contains duplicate fragment paths.');

const crewIndex = runtimePaths.indexOf('data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-crew-management.txt');
const crewPatchIndex = runtimePaths.indexOf('data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-crew-patch.txt');
const finalIndex = runtimePaths.indexOf('data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt');
if (crewIndex < 0 || crewPatchIndex < 0) throw new Error('Crew management runtime fragments are not registered.');
if (!(crewIndex < crewPatchIndex && crewPatchIndex < finalIndex)) throw new Error('Crew runtime fragments are in the wrong loader order.');

const source = runtimePaths.map(relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing runtime fragment: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}).join('');

new Function(source);

const jsonPaths = [
  'data/barotrauma/tools/catalog/catalog-index.json',
  'data/barotrauma/tools/submarines/submarine-roster.json',
  'data/barotrauma/tools/custom/custom-content-schema.json',
  'data/barotrauma-tools-registry.json'
];
for (const relativePath of jsonPaths) JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

console.log(`Validated ${runtimePaths.length} runtime fragments (${source.length.toLocaleString()} characters) and ${jsonPaths.length} JSON registries.`);
