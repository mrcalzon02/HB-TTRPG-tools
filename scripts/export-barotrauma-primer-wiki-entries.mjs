import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceFiles = [
  'data/barotrauma/wiki/canonical/crewmans-primer-01.md',
  'data/barotrauma/wiki/canonical/crewmans-primer-02.md',
  'data/barotrauma/wiki/canonical/crewmans-primer-03.md',
  'data/barotrauma/wiki/canonical/crewmans-primer-04.md',
  'data/barotrauma/wiki/plain/crewmans-primer-05.md',
  'data/barotrauma/wiki/plain/crewmans-primer-06.md',
  'data/barotrauma/wiki/plain/crewmans-primer-07.md',
  'data/barotrauma/wiki/plain/crewmans-primer-08.md',
  'data/barotrauma/wiki/plain/crewmans-primer-09.md',
  'data/barotrauma/wiki/plain/crewmans-primer-10a.md',
  'data/barotrauma/wiki/plain/crewmans-primer-10b.md',
  'data/barotrauma/wiki/plain/crewmans-primer-11.md',
  'data/barotrauma/wiki/plain/crewmans-primer-12.md',
  'data/barotrauma/wiki/plain/crewmans-primer-13.md',
  'data/barotrauma/wiki/plain/crewmans-primer-14.md',
  'data/barotrauma/wiki/plain/crewmans-primer-15.md',
  'data/barotrauma/wiki/plain/crewmans-primer-16.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17b.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17c.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17d.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17e.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17f.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17g.md',
  'data/barotrauma/wiki/plain/crewmans-primer-17h.md',
  'data/barotrauma/wiki/plain/crewmans-primer-18.md',
  'data/barotrauma/wiki/plain/crewmans-primer-19.md',
  'data/barotrauma/wiki/plain/crewmans-primer-20a.md',
  'data/barotrauma/wiki/plain/crewmans-primer-20b.md',
  'data/barotrauma/wiki/plain/crewmans-primer-20.md',
  'data/barotrauma/wiki/plain/crewmans-primer-21.md',
  'data/barotrauma/wiki/plain/crewmans-primer-22.md',
  'data/barotrauma/wiki/plain/crewmans-primer-23.md',
  'data/barotrauma/wiki/plain/crewmans-primer-24.md',
  'data/barotrauma/wiki/plain/crewmans-primer-25.md'
];

const entries = [];

for (const relativePath of sourceFiles) {
  const documentText = await fs.readFile(path.join(root, relativePath), 'utf8');
  const normalized = documentText.replace(/\r\n?/g, '\n');
  const headings = [...normalized.matchAll(/^##\s+(.+?)\s*$/gm)];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const title = heading[1].trim();
    const content = normalized
      .slice(heading.index, nextHeading?.index ?? normalized.length)
      .trim()
      .concat('\n');

    entries.push({ title, content });
  }
}

if (entries.length !== 198) {
  throw new Error(`Expected 198 titled sections; found ${entries.length}.`);
}
if (entries[0].title !== 'FOREWORD' || entries.at(-1).title !== 'FINAL CAUTION') {
  throw new Error(`Entry order is wrong: ${entries[0].title} through ${entries.at(-1).title}.`);
}

const outputDirectory = path.join(root, 'data/barotrauma/wiki/entries');
await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });

await Promise.all(entries.map((entry, index) => {
  const filename = `${String(index + 1).padStart(3, '0')}.md`;
  return fs.writeFile(path.join(outputDirectory, filename), entry.content, 'utf8');
}));

console.log(`Exported ${entries.length} individual Crewman's Primer wiki entries.`);
