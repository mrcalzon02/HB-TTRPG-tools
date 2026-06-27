import fs from 'node:fs';

const path = 'data/world-of-darkness/locations_core_v2.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = {
  prototypes: 10,
  contexts: 21,
  total: 210,
  statuses: {
    MUNDANE: 12,
    TANGENTIAL: 6,
    ACTIVE_UNREGISTERED: 2,
    INVENTORIED: 1
  }
};

if (!Array.isArray(data.prototypes) || data.prototypes.length !== expected.prototypes) {
  throw new Error(`Expected ${expected.prototypes} location archetypes, found ${data.prototypes?.length ?? 0}.`);
}

if (!Array.isArray(data.contextVariants) || data.contextVariants.length !== expected.contexts) {
  throw new Error(`Expected ${expected.contexts} context variants, found ${data.contextVariants?.length ?? 0}.`);
}

const total = data.prototypes.length * data.contextVariants.length;
if (total !== expected.total || data.entryCount !== expected.total) {
  throw new Error(`Expected ${expected.total} expanded location variants, found ${total} with entryCount ${data.entryCount}.`);
}

const statusCounts = data.contextVariants.reduce((counts, context) => {
  counts[context.inventoryStatus] = (counts[context.inventoryStatus] || 0) + 1;
  return counts;
}, {});

for (const [status, count] of Object.entries(expected.statuses)) {
  if (statusCounts[status] !== count) {
    throw new Error(`Expected ${count} ${status} contexts per archetype, found ${statusCounts[status] ?? 0}.`);
  }
}

const mundaneOrTangential = statusCounts.MUNDANE + statusCounts.TANGENTIAL;
const mundaneOrTangentialPercent = Number(((mundaneOrTangential / expected.contexts) * 100).toFixed(2));
const inventoriedPercent = Number(((statusCounts.INVENTORIED / expected.contexts) * 100).toFixed(2));

if (mundaneOrTangentialPercent < 80) {
  throw new Error(`Mundane/tangential share fell below 80%: ${mundaneOrTangentialPercent}%.`);
}

if (inventoriedPercent > 5) {
  throw new Error(`Inventoried share rose above 5%: ${inventoriedPercent}%.`);
}

const requiredPrototypeFields = ['mundaneBase', 'kindredLayer', 'umbralLayer', 'awakenedVector'];
for (const prototype of data.prototypes) {
  for (const field of requiredPrototypeFields) {
    if (!prototype[field]) throw new Error(`Prototype ${prototype.sourcePrototype} is missing ${field}.`);
  }
}

for (const context of data.contextVariants) {
  for (const field of ['id', 'title', 'inventoryStatus', 'effect', 'mechanicalSeed']) {
    if (!context[field]) throw new Error(`A context variant is missing ${field}.`);
  }
}

console.log(JSON.stringify({
  locationArchetypes: data.prototypes.length,
  contextsPerArchetype: data.contextVariants.length,
  expandedVariants: total,
  statusCountsPerArchetype: statusCounts,
  mundaneOrTangentialPercent,
  notInventoriedPercent: Number((((expected.contexts - statusCounts.INVENTORIED) / expected.contexts) * 100).toFixed(2)),
  inventoriedPercent
}, null, 2));
