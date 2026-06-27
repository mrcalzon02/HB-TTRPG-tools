import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const base = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const expansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));

const expected = {
  prototypes: 10,
  baseContexts: 21,
  addedContexts: 21,
  effectiveContexts: 42,
  effectiveTotal: 420,
  statuses: {
    MUNDANE: 24,
    TANGENTIAL: 12,
    ACTIVE_UNREGISTERED: 4,
    INVENTORIED: 2
  }
};

if (!Array.isArray(base.prototypes) || base.prototypes.length !== expected.prototypes) {
  throw new Error(`Expected ${expected.prototypes} location archetypes, found ${base.prototypes?.length ?? 0}.`);
}
if (!Array.isArray(base.contextVariants) || base.contextVariants.length !== expected.baseContexts) {
  throw new Error(`Expected ${expected.baseContexts} base context variants, found ${base.contextVariants?.length ?? 0}.`);
}
if (!Array.isArray(expansion.contextVariants) || expansion.contextVariants.length !== expected.addedContexts) {
  throw new Error(`Expected ${expected.addedContexts} additive context variants, found ${expansion.contextVariants?.length ?? 0}.`);
}
if (!Array.isArray(expansion.prototypeAffinity) || expansion.prototypeAffinity.length !== expected.prototypes) {
  throw new Error(`Expected ${expected.prototypes} prototype-affinity records, found ${expansion.prototypeAffinity?.length ?? 0}.`);
}

const contexts = [...base.contextVariants, ...expansion.contextVariants];
if (contexts.length !== expected.effectiveContexts) {
  throw new Error(`Expected ${expected.effectiveContexts} effective contexts, found ${contexts.length}.`);
}
const total = base.prototypes.length * contexts.length;
if (total !== expected.effectiveTotal || config.contextAwareGeneration?.effectiveLocationVariants !== expected.effectiveTotal) {
  throw new Error(`Expected ${expected.effectiveTotal} effective location variants, found ${total} with configured value ${config.contextAwareGeneration?.effectiveLocationVariants}.`);
}

const ids = new Set();
const statusCounts = {};
for (const context of contexts) {
  for (const field of ['id', 'title', 'inventoryStatus', 'effect', 'mechanicalSeed']) {
    if (!context[field]) throw new Error(`A context variant is missing ${field}.`);
  }
  if (ids.has(context.id)) throw new Error(`Duplicate context id: ${context.id}.`);
  ids.add(context.id);
  statusCounts[context.inventoryStatus] = (statusCounts[context.inventoryStatus] || 0) + 1;
}

for (const [status, count] of Object.entries(expected.statuses)) {
  if (statusCounts[status] !== count) {
    throw new Error(`Expected ${count} ${status} contexts per archetype, found ${statusCounts[status] ?? 0}.`);
  }
}

for (const context of expansion.contextVariants) {
  if (!Array.isArray(context.gameLines) || !context.gameLines.length) throw new Error(`Expansion context ${context.id} lacks gameLines.`);
  if (!Array.isArray(context.categoryHooks) || !Array.isArray(context.featureHooks)) throw new Error(`Expansion context ${context.id} lacks real-world hook arrays.`);
  if (!context.tagHooks || typeof context.tagHooks !== 'object' || Array.isArray(context.tagHooks)) throw new Error(`Expansion context ${context.id} lacks tagHooks.`);
}

const supportedLines = ['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
for (const line of supportedLines) {
  if (!expansion.settingFrames?.[line]) throw new Error(`Missing setting frame for ${line}.`);
}

const mundaneOrTangential = statusCounts.MUNDANE + statusCounts.TANGENTIAL;
const mundaneOrTangentialPercent = Number(((mundaneOrTangential / contexts.length) * 100).toFixed(2));
const inventoriedPercent = Number(((statusCounts.INVENTORIED / contexts.length) * 100).toFixed(2));
if (mundaneOrTangentialPercent !== 85.71) throw new Error(`Mundane/tangential share changed: ${mundaneOrTangentialPercent}%.`);
if (inventoriedPercent !== 4.76) throw new Error(`Inventoried share changed: ${inventoriedPercent}%.`);

const requiredPrototypeFields = ['mundaneBase', 'kindredLayer', 'umbralLayer', 'awakenedVector'];
for (const prototype of base.prototypes) {
  for (const field of requiredPrototypeFields) {
    if (!prototype[field]) throw new Error(`Prototype ${prototype.sourcePrototype} is missing ${field}.`);
  }
}

console.log(JSON.stringify({
  locationArchetypes: base.prototypes.length,
  baseContexts: base.contextVariants.length,
  addedContexts: expansion.contextVariants.length,
  contextsPerArchetype: contexts.length,
  effectiveLocationVariants: total,
  statusCountsPerArchetype: statusCounts,
  mundaneOrTangentialPercent,
  notInventoriedPercent: Number((((contexts.length - statusCounts.INVENTORIED) / contexts.length) * 100).toFixed(2)),
  inventoriedPercent,
  supportedGameLines: supportedLines
}, null, 2));
