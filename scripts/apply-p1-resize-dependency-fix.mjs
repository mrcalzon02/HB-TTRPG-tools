import fs from 'node:fs/promises';

const file = 'kaysender-surface-grid-resize.js';
let source = await fs.readFile(file, 'utf8');

const replacements = [
  [
    "const waterDependencies = (item.waterSourceIds || []).map(id => waterById.get(id)).filter(Boolean);",
    "const waterDependencies = (item.waterSourceIds || []).map(id => waterById.get(id)).filter(entry => entry && cellIds.has(entry.mapCellId));"
  ],
  [
    "const landingDependencies = (item.landingZoneIds || []).map(id => landingById.get(id)).filter(Boolean);",
    "const landingDependencies = (item.landingZoneIds || []).map(id => landingById.get(id)).filter(entry => entry && cellIds.has(entry.mapCellId));"
  ]
];

for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`Expected resize dependency expression was not found: ${before}`);
  source = source.split(before).join(after);
}

await fs.writeFile(file, source, 'utf8');
console.log('Applied removed-cell filtering to dependent water and landing references.');
