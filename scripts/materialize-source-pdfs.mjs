import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const manifestPath = path.join(root,'source-page-references','source-manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath,'utf8'));

for (const document of manifest.documents) {
  const encodedParts = [];
  for (const part of document.parts) encodedParts.push(await fs.readFile(path.join(root,part),'utf8'));
  const bytes = Buffer.from(encodedParts.join('').replace(/\s+/g,''),'base64');
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== document.bytes) throw new Error(`${document.id}: expected ${document.bytes} bytes, decoded ${bytes.length}.`);
  if (digest !== document.sha256) throw new Error(`${document.id}: SHA-256 mismatch (${digest}).`);
  const destination = path.join(root,document.destination);
  await fs.mkdir(path.dirname(destination),{ recursive:true });
  await fs.writeFile(destination,bytes);
  console.log(`Materialized ${document.destination} (${bytes.length} bytes; ${digest}).`);
}
