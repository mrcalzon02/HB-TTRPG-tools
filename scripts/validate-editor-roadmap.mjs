import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function numericOrder(order) {
  const match = /^P(\d+)$/.exec(order || '');
  if (!match) fail(`Invalid production order '${order}'. Expected P0, P1, P2, and so on.`);
  return Number(match[1]);
}

async function main() {
  const roadmap = await readJson('data/kaysender/editors/editor-roadmap.json');
  const registry = await readJson('data/kaysender-tools-registry.json');
  const stages = roadmap.productionOrder || [];
  const registryIds = new Set((registry.modules || []).map(module => module.id));

  if (!stages.length) fail('Editor roadmap contains no production stages.');
  if (roadmap.policy?.activeBranch !== 'main') fail('Editor roadmap must preserve main as the only active branch.');
  if (roadmap.policy?.parallelMainLineEditors !== 1) fail('Editor roadmap must allow exactly one active main-line editor.');

  const ids = new Set();
  const orders = new Set();
  const stageById = new Map();

  for (const stage of stages) {
    if (!stage.id || !stage.title || !stage.order) fail('Every production stage requires id, title, and order.');
    if (ids.has(stage.id)) fail(`Duplicate editor stage id '${stage.id}'.`);
    if (orders.has(stage.order)) fail(`Duplicate production order '${stage.order}'.`);
    ids.add(stage.id);
    orders.add(stage.order);
    stageById.set(stage.id, stage);

    if (!Array.isArray(stage.dependsOn)) fail(`Stage '${stage.id}' is missing dependsOn.`);
    if (!Array.isArray(stage.requiredInputs) || !stage.requiredInputs.length) fail(`Stage '${stage.id}' has no required inputs.`);
    if (!Array.isArray(stage.requiredOutputs) || !stage.requiredOutputs.length) fail(`Stage '${stage.id}' has no required outputs.`);
    if (!Array.isArray(stage.exitCriteria) || !stage.exitCriteria.length) fail(`Stage '${stage.id}' has no exit criteria.`);

    for (const moduleId of stage.moduleIds || []) {
      if (!registryIds.has(moduleId)) fail(`Stage '${stage.id}' references unknown registry module '${moduleId}'.`);
    }
  }

  const sorted = [...stages].sort((a, b) => numericOrder(a.order) - numericOrder(b.order));
  sorted.forEach((stage, index) => {
    if (numericOrder(stage.order) !== index) fail(`Production order must be contiguous. Expected P${index}, found ${stage.order}.`);
    for (const dependencyId of stage.dependsOn) {
      const dependency = stageById.get(dependencyId);
      if (!dependency) fail(`Stage '${stage.id}' depends on unknown stage '${dependencyId}'.`);
      if (numericOrder(dependency.order) >= numericOrder(stage.order)) {
        fail(`Stage '${stage.id}' depends on '${dependencyId}', but that dependency is not earlier in the production order.`);
      }
    }
  });

  const activeNext = stages.filter(stage => stage.status === 'required-next');
  if (activeNext.length !== 1) fail(`Expected exactly one required-next stage; found ${activeNext.length}.`);
  if (activeNext[0].order !== 'P0') fail(`The required-next stage must currently be P0; found ${activeNext[0].order}.`);

  const coveredModules = new Set(stages.flatMap(stage => stage.moduleIds || []));
  const expectedMainLineModules = [
    'floating-island-generator',
    'population-generator',
    'settlement-generator',
    'city-district-generator',
    'crafting-gadget-creator',
    'airship-core-builder',
    'npc-crew-generator',
    'airship-vessel-generator',
    'sky-ecology-generator',
    'world-map-route-generator',
    'shop-market-generator',
    'supply-water-planner',
    'faction-guild-generator',
    'organization-operations-tracker',
    'black-market-piracy-generator',
    'draconic-tithe-generator',
    'encounter-generator',
    'job-board-generator'
  ];

  for (const moduleId of expectedMainLineModules) {
    if (!coveredModules.has(moduleId)) fail(`Main-line module '${moduleId}' is absent from the production roadmap.`);
  }

  console.log('Editor roadmap validation passed.');
  console.log(`Production stages: ${stages.length}`);
  console.log(`Required next stage: ${activeNext[0].order} — ${activeNext[0].title}`);
  console.log(`Covered main-line modules: ${coveredModules.size}`);
}

main().catch(error => {
  console.error(`Editor roadmap validation failed: ${error.message}`);
  process.exitCode = 1;
});
