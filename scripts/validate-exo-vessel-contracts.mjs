import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const legacyFiles=[
  'blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-operational-definitions.js','blacklight-exo-ftl-runtime.js','blacklight-exo-ftl-core.js','blacklight-exo-ftl-engineering-extension.js',
  'blacklight-exo-ftl-path-level-core.js','blacklight-exo-ftl-path-level-paths-physical.js','blacklight-exo-ftl-path-level-paths-dimensional.js','blacklight-exo-ftl-path-level-paths-discrete.js','blacklight-exo-ftl-path-level-runtime.js','blacklight-exo-ftl-path-level-engineering.js','blacklight-exo-ftl-path-level-controller.js',
  'blacklight-exo-ftl-mechanism-core.js','blacklight-exo-ftl-mechanism-path-inertial-torch.js','blacklight-exo-ftl-mechanism-path-metric-envelope.js','blacklight-exo-ftl-mechanism-path-gravitic-plane.js','blacklight-exo-ftl-mechanism-path-slipstream-shear.js','blacklight-exo-ftl-mechanism-path-q-lattice.js','blacklight-exo-ftl-mechanism-path-n-manifold.js','blacklight-exo-ftl-mechanism-path-fold-jump.js','blacklight-exo-ftl-mechanism-path-wormhole-gate.js','blacklight-exo-ftl-mechanism-path-phase-displacement.js','blacklight-exo-ftl-mechanism-runtime.js',
  'blacklight-exo-ftl-assembly-core.js','blacklight-exo-ftl-assembly-runtime.js','blacklight-exo-ftl-calculation-core.js','blacklight-exo-ftl-calculation-performance.js','blacklight-exo-ftl-calculation-energy.js','blacklight-exo-ftl-calculation-runtime.js','blacklight-exo-ftl-certification-core.js','blacklight-exo-ftl-certification-route.js','blacklight-exo-ftl-certification-reliability.js','blacklight-exo-ftl-certification-runtime.js',
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-philosophy-runtime.js'
];
const fail=message=>{throw new Error(message);};
const clone=value=>structuredClone(value);
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const error=Math.abs(Number(a)-Number(b))/Math.max(1,Math.abs(Number(b)));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(9)}%.`);};
const load=async filename=>new vm.Script(await fs.readFile(path.join(root,filename),'utf8'),{filename}).runInThisContext();

globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of legacyFiles)await load(filename);
const legacyVessel=globalThis.BlacklightExoVessel;
if(!legacyVessel||legacyVessel.version!==2)fail('Version-2 vessel runtime did not initialize before contract wrapping.');

const baselineInput={family:'metric-envelope',pathLevel:'p4',role:'explorer',biologyProfile:'human-standard',defense:'hardened',manufacturerProfile:'CORP_LOGISTICS',designEnvelope:'AUTO',crew:32,enduranceDays:180,reserveJumps:3,distanceLy:4,payloadTonnes:''};
const legacyRecord=legacyVessel.generate('validation:legacy-preservation',baselineInput,null);
await load('blacklight-exo-vessel-contracts.js');

const vessel=globalThis.BlacklightExoVessel,contracts=globalThis.BlacklightExoVesselContracts;
if(!vessel||!contracts)fail('VESSEL-00 contract runtime did not initialize.');
if(vessel.version!==3||vessel.contractVersion!==1||vessel.schemaVersion!=='1.0.0')fail(`Expected vessel 3 / contract 1 / schema 1.0.0; found ${vessel.version}/${vessel.contractVersion}/${vessel.schemaVersion}.`);

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/vessel-contract-registry.json'),'utf8'));
const migrations=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/migrations.json'),'utf8'));
if(registry.registryVersion!=='1.0.0'||registry.activeSchemaVersion!=='1.0.0')fail('Contract registry is not active at schema 1.0.0.');
if(migrations.canonicalSchemaVersion!=='1.0.0'||migrations.policy.destructiveMigrationAllowed)fail('Migration registry does not enforce append-only schema 1.0.0.');
const expectedBands=['T-1','P0','P1','P2','P3','P4','P5','P6'];
if(JSON.stringify(registry.technologyBands.map(item=>item.key))!==JSON.stringify(expectedBands))fail('Technology registry does not expose T-1 and P0-P6 in order.');
const expectedVariants={LEGACY:-.3,STANDARD:0,REFINED:.12,ADVANCED:.22,PROTOTYPE:.3};
for(const item of registry.withinBandVariants)close(item.offset,expectedVariants[item.key],1e-12,`${item.key} offset`);
if(registry.seedHierarchy.length!==9||registry.conditionAxes.length!==15||Object.keys(registry.conditionTemplates).length!==13)fail('Registry seed, condition-axis, or condition-template counts are incomplete.');
if(registry.migrationPolicy.strategy!=='append-only-envelope'||registry.migrationPolicy.unknownFieldPolicy!=='preserve')fail('Registry migration policy may lose legacy fields.');

for(const [key,filename] of Object.entries(registry.schemas)){
  const schema=JSON.parse(await fs.readFile(path.join(root,filename),'utf8'));
  if(schema.$schema!=='https://json-schema.org/draft/2020-12/schema')fail(`${key} schema is not draft 2020-12.`);
  if(!schema.$id||!schema.title||schema.type!=='object')fail(`${key} schema lacks identity, title, or object type.`);
}
const recordSchema=JSON.parse(await fs.readFile(path.join(root,registry.schemas.record),'utf8'));
for(const field of ['version','author','seed','generatedAt','identity','hull','drive','lifeSupport','power','fuel','thermal','protection','navigation','maintenance','warnings','contract'])if(!recordSchema.required.includes(field))fail(`Record schema does not require ${field}.`);
if(recordSchema.additionalProperties!==true)fail('Record schema must preserve existing and unknown vessel fields.');

function stripContract(record){
  const copy=clone(record);delete copy.contract;delete copy.condition;copy.version=2;
  if(copy.identity)for(const key of ['speciesId','organizationId','manufacturerId','hullFamilyId','vesselInstanceId','technologyBand'])delete copy.identity[key];
  if(Array.isArray(copy.warnings))copy.warnings=copy.warnings.slice(0,-2);
  return copy;
}
const migrated=vessel.migrateRecord(legacyRecord,baselineInput,null);
if(!migrated.contract.validation.valid)fail(`Migrated vessel invalid: ${migrated.contract.validation.violations.join('; ')}`);
if(JSON.stringify(legacyRecord)!==JSON.stringify(stripContract(migrated)))fail('Append-only migration changed or removed version-2 vessel data.');
if(JSON.stringify(migrated)!==JSON.stringify(vessel.migrateRecord(migrated,baselineInput,null)))fail('Canonical migration is not idempotent.');

const families=globalThis.BlacklightExoFTL.families||[],levels=globalThis.BlacklightExoFTL.pathLevels||[],templates=Object.keys(registry.conditionTemplates);
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length}/${levels.length}.`);
let cases=0;
for(const family of families)for(const level of levels){
  const role=vessel.roles[cases%vessel.roles.length],biology=vessel.biologyProfiles[cases%vessel.biologyProfiles.length],defense=vessel.defenses[cases%vessel.defenses.length],manufacturer=vessel.manufacturerProfiles[cases%vessel.manufacturerProfiles.length],conditionTemplate=templates[cases%templates.length];
  const input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:biology.key,defense:defense.key,manufacturerProfile:manufacturer.key,designEnvelope:'AUTO',conditionTemplate,crew:10+(cases%61),enduranceDays:45+(cases%9)*60,reserveJumps:1+(cases%4),distanceLy:.5+(cases%12)*1.4,payloadTonnes:''};
  const seed=`validation:contract:${family.key}:${level.key}`,result=vessel.generate(seed,input,null),replay=vessel.generate(seed,input,null);cases+=1;
  if(result.version!==3||result.contract.schemaVersion!=='1.0.0'||result.contract.recordType!=='exoVessel')fail(`${family.key}/${level.key} did not produce a canonical vessel.`);
  if(!result.contract.validation.valid)fail(`${family.key}/${level.key}: ${result.contract.validation.violations.join('; ')}`);
  if(result.contract.technology.principalBand!==`P${level.rank}`||result.contract.technology.principalRank!==level.rank)fail(`${family.key}/${level.key} lost principal technology band.`);
  if(result.identity.technologyBand!==`P${level.rank}`)fail(`${family.key}/${level.key} identity does not expose technology band.`);
  if(result.contract.technology.subsystemVariants.length!==result.hull.massBudget.length)fail(`${family.key}/${level.key} technology ledger does not cover every mass subsystem.`);
  const seen=new Set();
  for(const item of result.contract.technology.subsystemVariants){
    if(seen.has(item.subsystemKey))fail(`${family.key}/${level.key} duplicates ${item.subsystemKey}.`);seen.add(item.subsystemKey);
    finite(item.offset,`${family.key}/${level.key}/${item.subsystemKey} offset`);
    if(Math.abs(item.offset)>.300000001)fail(`${family.key}/${level.key}/${item.subsystemKey} exceeds allowed variation.`);
    if(item.principalBand!==`P${level.rank}`)fail(`${family.key}/${level.key}/${item.subsystemKey} changed principal band.`);
    if(item.heritageBand==='T-1'&&!(level.rank===0&&item.variant==='LEGACY'))fail(`${family.key}/${level.key}/${item.subsystemKey} used invalid T-1 heritage.`);
  }
  if(result.contract.condition.template!==conditionTemplate)fail(`${family.key}/${level.key} lost condition template.`);
  for(const axis of registry.conditionAxes){const value=finite(result.contract.condition.axes[axis.key],`${family.key}/${level.key}/${axis.key}`);if(value<0||value>100)fail(`${axis.key} escaped 0-100.`);}
  if(conditionTemplate==='DESTROYED'&&result.contract.condition.coherentVesselGraph!==false)fail('DESTROYED record retained a coherent graph.');
  for(const key of registry.seedHierarchy)if(!result.contract.seeds[key])fail(`${family.key}/${level.key} lacks ${key}.`);
  for(const value of Object.values(result.contract.identifiers))if(!/^(species|org|mfr|hull|vessel)-[a-z0-9][a-z0-9-]{5,95}$/.test(value))fail(`${family.key}/${level.key} has invalid identifier ${value}.`);
  if(result.contract.derivedLayers.length!==registry.derivedLayers.length)fail(`${family.key}/${level.key} derived-layer ledger is incomplete.`);
  close(result.hull.massBudget.reduce((sum,row)=>sum+row.massTonnes,0),result.hull.totalMassTonnes,1e-10,`${family.key}/${level.key} mass closure`);
  const left=clone(result),right=clone(replay);delete left.generatedAt;delete right.generatedAt;delete left.contract.createdAt;delete right.contract.createdAt;delete left.contract.updatedAt;delete right.contract.updatedAt;
  if(JSON.stringify(left)!==JSON.stringify(right))fail(`${family.key}/${level.key} is not deterministic outside timestamps.`);
}

const p0=vessel.generate('validation:p0-legacy',{...baselineInput,pathLevel:'p0',subsystemVariants:{maneuver:'LEGACY',drive:'LEGACY'}},null);
if(p0.contract.technology.subsystemVariants.find(item=>item.subsystemKey==='maneuver').heritageBand!=='T-1')fail('P0 legacy maneuver was not labeled T-1 heritage.');
if(p0.contract.technology.subsystemVariants.find(item=>item.subsystemKey==='drive').heritageBand!=='P0')fail('P0 FTL drive was incorrectly downgraded to T-1.');
const destroyed=vessel.generate('validation:destroyed',{...baselineInput,conditionTemplate:'DESTROYED'},null);
if(destroyed.contract.condition.axes.destructionPercent!==100||destroyed.contract.condition.coherentVesselGraph!==false)fail('DESTROYED condition invariant failed.');
for(const attempt of [
  ()=>vessel.generate('bad-variant',{...baselineInput,subsystemVariants:{maneuver:'P9'}},null),
  ()=>vessel.generate('bad-condition',{...baselineInput,conditionOverrides:{structuralDamagePercent:101}},null),
  ()=>vessel.generate('bad-band',{...baselineInput,principalTechnologyBand:'T-1'},null)
]){let rejected=false;try{attempt();}catch{rejected=true;}if(!rejected)fail('An invalid contract input was silently accepted.');}

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-ui.js','blacklight-exo-vessel-philosophy-ui.js','blacklight-exo-vessel-contract-ui.js'];
let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=prior)fail(`Vessel page loads ${marker} out of order.`);prior=index;}
const contractUi=await fs.readFile(path.join(root,'blacklight-exo-vessel-contract-ui.js'),'utf8');
for(const marker of ['exo-vessel-condition','exo-vessel-contract-section','exo-vessel-contract-grid','exo-vessel-technology-body'])if(!contractUi.includes(marker))fail(`Contract UI lacks ${marker}.`);

console.log('EXO vessel VESSEL-00 contract validation passed.');
console.log(`Validated ${cases} FTL-family/Path combinations, ${templates.length} lifecycle templates, ${registry.technologyBands.length} technology bands, ${registry.withinBandVariants.length} bounded variants, append-only migration, deterministic identifiers, seed lineage, mass closure, and loader order.`);
