import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const files = [
  'blacklight-exo-ftl-physics-definitions.js',
  'blacklight-exo-ftl-operational-definitions.js',
  'blacklight-exo-ftl-runtime.js',
  'blacklight-exo-ftl-core.js',
  'blacklight-exo-ftl-engineering-extension.js',
  'blacklight-exo-ftl-path-level-core.js',
  'blacklight-exo-ftl-path-level-paths-physical.js',
  'blacklight-exo-ftl-path-level-paths-dimensional.js',
  'blacklight-exo-ftl-path-level-paths-discrete.js',
  'blacklight-exo-ftl-path-level-runtime.js',
  'blacklight-exo-ftl-path-level-engineering.js',
  'blacklight-exo-ftl-path-level-controller.js',
  'blacklight-exo-jump-calculator-core.js'
];

const fail = message => { throw new Error(message); };
const finite = (value, label) => {
  if (!Number.isFinite(Number(value))) fail(`${label} is not finite: ${value}`);
  return Number(value);
};

globalThis.document = {
  getElementById:() => null,
  querySelector:() => null
};

const AU_PER_LY = 63241.07708426628;
const systems = [
  {
    seed:'VALIDATION:PUBLISHED:A', name:'Published A', star:'G2V', publishedReference:true,
    positionAU:{x:0,y:0,z:0}, positionLy:{x:0,y:0,z:0}, distanceLy:0,
    totalMassSolar:1, stellarMassSolar:1, positionConfidencePercent:98,
    positionBasis:'published validation astrometry'
  },
  {
    seed:'VALIDATION:PUBLISHED:B', name:'Published B', star:'K2V', publishedReference:true,
    positionAU:{x:AU_PER_LY*5.4,y:AU_PER_LY*1.1,z:AU_PER_LY*-.7},
    positionLy:{x:5.4,y:1.1,z:-.7}, distanceLy:Math.hypot(5.4,1.1,.7),
    totalMassSolar:.82, stellarMassSolar:.82, positionConfidencePercent:96,
    positionBasis:'published validation astrometry'
  },
  {
    seed:'VALIDATION:PROCEDURAL:C', name:'Procedural C', star:'M4V', publishedReference:false,
    positionAU:{x:AU_PER_LY*-3.2,y:AU_PER_LY*4.7,z:AU_PER_LY*2.3},
    positionLy:{x:-3.2,y:4.7,z:2.3}, distanceLy:Math.hypot(3.2,4.7,2.3),
    totalMassSolar:.18, stellarMassSolar:.18, positionConfidencePercent:76,
    positionBasis:'deterministic procedural validation coordinate'
  }
];

globalThis.BlacklightExoClusterSpatial = Object.freeze({
  version:1,
  AU_PER_LY,
  getSystems:() => structuredClone(systems),
  getSystem:identifier => structuredClone(systems.find(item => item.seed === identifier || item.name === identifier) || null)
});

for (const filename of files) {
  const source = await fs.readFile(path.join(root, filename), 'utf8');
  new vm.Script(source, {filename}).runInThisContext();
}

const calculator = globalThis.BlacklightExoJumpCalculator;
if (!calculator) fail('BlacklightExoJumpCalculator did not initialize.');
if (calculator.families.length !== 9) fail(`Expected 9 FTL families, found ${calculator.families.length}.`);
if (calculator.pathLevels.length !== 7) fail(`Expected 7 Path levels, found ${calculator.pathLevels.length}.`);

let cases = 0;
for (const family of calculator.families) {
  for (const level of calculator.pathLevels) {
    const input = {
      startSeed:cases % 2 ? systems[0].seed : systems[2].seed,
      endSeed:systems[1].seed,
      familyKey:family.key,
      pathLevelKey:level.key
    };
    const result = calculator.calculate(input);
    const replay = calculator.calculate(input);
    cases += 1;

    if (result.familyKey !== family.key) fail(`${family.key}/${level.key} lost the requested family key.`);
    if (result.requestedPathLevelKey !== level.key) fail(`${family.key}/${level.key} lost the requested Path level.`);
    finite(result.centerDistanceLy, `${family.key}/${level.key} center distance`);
    finite(result.effectiveDistanceLy, `${family.key}/${level.key} effective distance`);
    finite(result.timing.completeSeconds, `${family.key}/${level.key} complete time`);
    finite(result.energy.missionJ, `${family.key}/${level.key} mission energy`);
    finite(result.energy.missionFuelKg, `${family.key}/${level.key} mission fuel`);
    finite(result.energy.recommendedFuelKg, `${family.key}/${level.key} recommended fuel`);
    finite(result.entry.clearanceAU, `${family.key}/${level.key} entry clearance`);
    finite(result.exit.clearanceAU, `${family.key}/${level.key} exit clearance`);
    finite(result.entry.certaintyPercent, `${family.key}/${level.key} entry certainty`);
    finite(result.exit.certaintyPercent, `${family.key}/${level.key} exit certainty`);
    if (!result.timing.completeText || !result.energy.energyMedium || !result.status) fail(`${family.key}/${level.key} is missing display records.`);
    if (result.entry.systemSeed !== input.startSeed || result.exit.systemSeed !== input.endSeed) fail(`${family.key}/${level.key} reversed the route endpoints.`);
    if (JSON.stringify(result) !== JSON.stringify(replay)) fail(`${family.key}/${level.key} is not deterministic.`);
  }
}

let sameEndpointRejected = false;
try {
  calculator.calculate({startSeed:systems[0].seed,endSeed:systems[0].seed,familyKey:'metric-envelope',pathLevelKey:'p4'});
} catch (error) {
  sameEndpointRejected = /different systems/i.test(error.message);
}
if (!sameEndpointRejected) fail('Same-system route was not rejected.');

const bootstrap = await fs.readFile(path.join(root, 'blacklight-exo-system-bootstrap.js'), 'utf8');
const order = [
  'blacklight-exo-cluster.js',
  'blacklight-exo-ftl-physics-definitions.js',
  'blacklight-exo-ftl-path-level-controller.js',
  'blacklight-exo-cluster-spatial.js',
  'blacklight-exo-jump-calculator-core.js',
  'blacklight-exo-jump-calculator-ui.js'
];
let previous = -1;
for (const marker of order) {
  const position = bootstrap.indexOf(marker);
  if (position < 0) fail(`System bootstrap does not load ${marker}.`);
  if (position <= previous) fail(`System bootstrap loads ${marker} out of order.`);
  previous = position;
}
if (!bootstrap.includes("loadStyle('blacklight-exo-jump-calculator.css')")) fail('System bootstrap does not load the jump calculator stylesheet.');

console.log('EXO cluster jump calculator validation passed.');
console.log(`Validated ${cases} canonical combinations: ${calculator.families.length} FTL families × ${calculator.pathLevels.length} Path levels.`);
console.log('Validated published/procedural endpoints, deterministic replay, finite timing-energy-fuel-geometry records, endpoint direction, same-system rejection, and bootstrap load order.');
