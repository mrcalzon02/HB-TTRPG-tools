import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const files=[
  'blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-operational-definitions.js','blacklight-exo-ftl-runtime.js','blacklight-exo-ftl-core.js','blacklight-exo-ftl-engineering-extension.js',
  'blacklight-exo-ftl-path-level-core.js','blacklight-exo-ftl-path-level-paths-physical.js','blacklight-exo-ftl-path-level-paths-dimensional.js','blacklight-exo-ftl-path-level-paths-discrete.js','blacklight-exo-ftl-path-level-runtime.js','blacklight-exo-ftl-path-level-engineering.js','blacklight-exo-ftl-path-level-controller.js',
  'blacklight-exo-ftl-mechanism-core.js','blacklight-exo-ftl-mechanism-path-inertial-torch.js','blacklight-exo-ftl-mechanism-path-metric-envelope.js','blacklight-exo-ftl-mechanism-path-gravitic-plane.js','blacklight-exo-ftl-mechanism-path-slipstream-shear.js','blacklight-exo-ftl-mechanism-path-q-lattice.js','blacklight-exo-ftl-mechanism-path-n-manifold.js','blacklight-exo-ftl-mechanism-runtime.js',
  'blacklight-exo-ftl-assembly-core.js','blacklight-exo-ftl-assembly-runtime.js','blacklight-exo-ftl-calculation-core.js','blacklight-exo-ftl-calculation-performance.js','blacklight-exo-ftl-calculation-energy.js','blacklight-exo-ftl-calculation-runtime.js','blacklight-exo-ftl-certification-core.js','blacklight-exo-ftl-certification-route.js','blacklight-exo-ftl-certification-reliability.js','blacklight-exo-ftl-certification-runtime.js',
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-manufacturer-definitions.js','blacklight-exo-vessel-manufacturer-runtime.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-contracts.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const error=Math.abs(Number(a)-Number(b))/Math.max(1,Math.abs(Number(b)));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(9)}%.`);};
const clone=value=>structuredClone(value);
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key),clear:()=>storage.clear()};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel;
const generator=globalThis.BlacklightExoVesselManufacturerGenerator;
const definitions=globalThis.BlacklightExoVesselManufacturerDefinitions;
if(!vessel||!generator||!definitions)fail('Manufacturer generator runtime did not initialize.');
if(vessel.version!==3||vessel.manufacturerVersion!==1||vessel.philosophyVersion!==1||vessel.contractVersion!==1)fail(`Unexpected vessel/manufacturer/philosophy/contract versions ${vessel.version}/${vessel.manufacturerVersion}/${vessel.philosophyVersion}/${vessel.contractVersion}.`);
if(generator.version!==1||generator.schemaVersion!=='1.0.0'||generator.catalogSize!==4)fail('Manufacturer generator must expose version 1, schema 1.0.0, and four houses per catalog.');
if(definitions.focusProfiles.length!==4)fail(`Expected four manufacturer focus profiles; found ${definitions.focusProfiles.length}.`);
for(const key of ['VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'])if(!definitions.archetypeMatrices[key])fail(`Missing ${key} manufacturer matrix.`);

const schema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-manufacturer.schema.json'),'utf8'));
if(schema.$schema!=='https://json-schema.org/draft/2020-12/schema'||schema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-manufacturer.schema.json')fail('Manufacturer schema identity is incorrect.');
for(const required of ['recordType','schemaVersion','manufacturerId','name','speciesId','organizationId','baseTechnologyBand','archetype','architecture','production','technologyVariantWeights','topologyWeights','materials','repairDoctrine','weaponPreferences','namingGrammar','visualGrammar','doctrine','signatureTraits','preferredRoles','provenance','validation'])if(!schema.required.includes(required))fail(`Manufacturer schema does not require ${required}.`);

const source={type:'biology',dossier:{
  version:3,seed:'kheari-civilization-source',generatedAt:'2026-07-17T00:00:00.000Z',
  system:{name:'Kheari Deep',state:'Settled inhabited system',stateKey:'settled',development:78,life:'living',economy:'state-directed heavy industry',traffic:'heavy scheduled traffic'},
  species:{name:'Kheari Assemblies',commonName:'Kheari',environment:'icebound high-pressure cryosphere',bodyPlan:'segmented crawler',chemistry:'carbon-ammonia biochemistry',senses:['thermal imaging','electromagnetic field sensing'],cognition:'distributed consensus cognition',communication:'electromagnetic pulse language',reproduction:'manufactured gestation',lifespan:'160 local years',size:'2.4 m typical adult span',adaptation:'temperature-switching biochemistry',extinct:false},
  civilization:{status:'active',government:'theocratic archive state',economy:'state-directed heavy industry',technology:'Advanced interstellar',reach:'Local star cluster',values:['continuity of memory','collective survival','precision and proof'],law:'central decree and licensed exceptions',warfare:'defensive orbital denial'}
}};
const common={family:'metric-envelope',pathLevel:'p4',role:'science',biologyProfile:'inherit',defense:'hardened',manufacturerProfile:'VAULT_KEEPER',designEnvelope:'AUTO',crew:36,enduranceDays:240,reserveJumps:3,distanceLy:4,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};
const houses=Array.from({length:4},(_,manufacturerIndex)=>vessel.generate(`fleet-vessel-${manufacturerIndex}`,{...common,manufacturerIndex},source));
const manufacturers=houses.map(item=>item.manufacturer);
if(new Set(manufacturers.map(item=>item.manufacturerId)).size!==4)fail('The four-house catalog does not contain four unique manufacturer IDs.');
if(new Set(manufacturers.map(item=>item.name)).size!==4)fail('The four-house catalog does not contain four unique manufacturer names.');
if(new Set(manufacturers.map(item=>item.archetype.focusKey)).size!==4)fail('The four-house catalog does not cover four distinct production focuses.');
if(new Set(manufacturers.map(item=>item.speciesId)).size!==1||new Set(manufacturers.map(item=>item.organizationId)).size!==1)fail('Related manufacturers do not retain one species and organization identity.');
if(new Set(manufacturers.map(item=>item.archetype.key)).size!==1||manufacturers[0].archetype.key!=='VAULT_KEEPER')fail('Related houses do not retain the same selected cultural architecture ancestry.');

for(const [index,manufacturer] of manufacturers.entries()){
  if(!manufacturer.validation.valid)fail(`Manufacturer house ${index} failed validation: ${manufacturer.validation.violations.join('; ')}`);
  if(manufacturer.recordType!=='exoVesselManufacturer'||manufacturer.schemaVersion!=='1.0.0')fail(`Manufacturer house ${index} has an invalid record envelope.`);
  if(manufacturer.baseTechnologyBand!=='P4')fail(`Manufacturer house ${index} technology band is ${manufacturer.baseTechnologyBand}, expected P4.`);
  if(!/^mfr-[a-z0-9][a-z0-9-]{5,95}$/.test(manufacturer.manufacturerId))fail(`Invalid manufacturer ID ${manufacturer.manufacturerId}.`);
  if(!/^species-[a-z0-9][a-z0-9-]{5,95}$/.test(manufacturer.speciesId))fail(`Invalid species ID ${manufacturer.speciesId}.`);
  if(!/^org-[a-z0-9][a-z0-9-]{5,95}$/.test(manufacturer.organizationId))fail(`Invalid organization ID ${manufacturer.organizationId}.`);
  close(manufacturer.architecture.internalsBias+manufacturer.architecture.evaBias,1,1e-12,`manufacturer ${index} architecture weights`);
  close(Object.values(manufacturer.topologyWeights).reduce((sum,value)=>sum+finite(value,`manufacturer ${index} topology weight`),0),1,1e-12,`manufacturer ${index} topology weights`);
  close(Object.values(manufacturer.technologyVariantWeights).reduce((sum,value)=>sum+finite(value,`manufacturer ${index} technology weight`),0),1,1e-12,`manufacturer ${index} technology weights`);
  for(const [label,table] of [['topology',manufacturer.topologyWeights],['technology',manufacturer.technologyVariantWeights]])for(const [key,value] of Object.entries(table))if(value<=0||value>1)fail(`Manufacturer ${index} ${label} ${key} escaped 0-1.`);
  for(const key of ['standardization','modularity','automation','qualityControl']){const value=finite(manufacturer.production[key],`manufacturer ${index} ${key}`);if(value<0||value>1)fail(`Manufacturer ${index} ${key} escaped 0-1.`);}
  if(manufacturer.materials.length<1||manufacturer.signatureTraits.length<3||manufacturer.weaponPreferences.length<1)fail(`Manufacturer house ${index} lacks material, recognition, or integration doctrine.`);
  if(!manufacturer.namingGrammar.designationPrefix||!manufacturer.namingGrammar.classPattern||!manufacturer.namingGrammar.serialPattern)fail(`Manufacturer house ${index} lacks naming grammar.`);
  for(const key of ['silhouette','symmetry','surface','moduleRhythm','sensorPlacement','radiatorPlacement'])if(!manufacturer.visualGrammar[key])fail(`Manufacturer house ${index} lacks visual grammar ${key}.`);
  const result=houses[index];
  if(result.contract.identifiers.manufacturerId!==manufacturer.manufacturerId||result.contract.identifiers.speciesId!==manufacturer.speciesId||result.contract.identifiers.organizationId!==manufacturer.organizationId)fail(`Manufacturer house ${index} does not match canonical contract identifiers.`);
  if(result.designation.originManufacturerId!==manufacturer.manufacturerId||result.designation.originManufacturer!==manufacturer.name)fail(`Manufacturer house ${index} does not match designation provenance.`);
  if(result.designPhilosophy.profile.manufacturerId!==manufacturer.manufacturerId||result.designPhilosophy.profile.manufacturerName!==manufacturer.name)fail(`Manufacturer house ${index} was not authoritative in architecture generation.`);
  if(!manufacturer.realizedArchitecture||manufacturer.realizedArchitecture.classification!==result.designPhilosophy.classification)fail(`Manufacturer house ${index} lacks realized architecture.`);
  if(result.contract.technology.subsystemVariants.some(item=>!item.explicitOverride&&!item.source.includes(manufacturer.name)))fail(`Manufacturer house ${index} did not control subsystem technology selection.`);
}

const architectureFingerprints=new Set(houses.map(item=>JSON.stringify({modules:item.designPhilosophy.moduleAssignments.map(module=>[module.key,module.envelope]),mass:Number(item.hull.totalMassTonnes.toPrecision(12)),volume:Number(item.hull.totalVolumeM3.toPrecision(12)),maintainability:Number(item.designPhilosophy.globalResults.maintainabilityRating.toPrecision(10))})));
if(architectureFingerprints.size<2)fail('Distinct manufacturer houses did not produce materially different vessel engineering or architecture outcomes.');
const topologyFingerprints=new Set(manufacturers.map(item=>JSON.stringify(item.topologyWeights)));
const technologyFingerprints=new Set(manufacturers.map(item=>JSON.stringify(item.technologyVariantWeights)));
const visualFingerprints=new Set(manufacturers.map(item=>JSON.stringify(item.visualGrammar)));
if(topologyFingerprints.size!==4||technologyFingerprints.size!==4||visualFingerprints.size!==4)fail('Manufacturer houses are not mechanically and visually distinct.');

const fleetA=vessel.generate('fleet-instance-a',{...common,manufacturerIndex:2,role:'science'},source);
const fleetB=vessel.generate('fleet-instance-b',{...common,manufacturerIndex:2,role:'tanker'},source);
for(const field of ['manufacturerId','name','speciesId','organizationId','baseTechnologyBand','repairDoctrine'])if(JSON.stringify(fleetA.manufacturer[field])!==JSON.stringify(fleetB.manufacturer[field]))fail(`Manufacturer fleet persistence failed for ${field}.`);
for(const field of ['archetype','architecture','production','technologyVariantWeights','topologyWeights','materials','namingGrammar','visualGrammar','doctrine','signatureTraits'])if(JSON.stringify(fleetA.manufacturer[field])!==JSON.stringify(fleetB.manufacturer[field]))fail(`Manufacturer fleet persistence failed for ${field}.`);
if(fleetA.identity.hullFamilyName===fleetB.identity.hullFamilyName&&fleetA.identity.roleKey!==fleetB.identity.roleKey)fail('Different vessel roles did not retain distinct hull-family identity.');

storage.clear();
if(!generator.save(manufacturers[0]))fail('Manufacturer library refused a valid record.');
const library=generator.list();
if(library.length!==1||library[0].manufacturerId!==manufacturers[0].manufacturerId)fail('Manufacturer library did not persist and recover the selected record.');

const families=globalThis.BlacklightExoFTL.families||[];
const levels=globalThis.BlacklightExoFTL.pathLevels||[];
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length}/${levels.length}.`);
const archetypeKeys=['VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'];
let cases=0;
for(const family of families){
  for(const level of levels){
    for(let manufacturerIndex=0;manufacturerIndex<4;manufacturerIndex+=1){
      const role=vessel.roles[(cases+manufacturerIndex)%vessel.roles.length];
      const input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:'inherit',defense:vessel.defenses[cases%vessel.defenses.length].key,manufacturerProfile:archetypeKeys[manufacturerIndex],manufacturerIndex,designEnvelope:'AUTO',crew:12+(cases%79),enduranceDays:45+(cases%10)*45,reserveJumps:1+(cases%4),distanceLy:.25+(cases%13)*1.6,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};
      const seed=`manufacturer-matrix:${family.key}:${level.key}:${manufacturerIndex}`;
      const result=vessel.generate(seed,input,source),replay=vessel.generate(seed,input,source);cases+=1;
      const manufacturer=result.manufacturer;
      if(!manufacturer?.validation?.valid)fail(`${family.key}/${level.key}/house-${manufacturerIndex} manufacturer invalid.`);
      if(!result.contract?.validation?.valid)fail(`${family.key}/${level.key}/house-${manufacturerIndex} contract invalid: ${result.contract?.validation?.violations?.join('; ')}`);
      if(manufacturer.archetype.key!==archetypeKeys[manufacturerIndex])fail(`${family.key}/${level.key}/house-${manufacturerIndex} lost requested ancestry.`);
      if(manufacturer.archetype.focusKey!==definitions.focusProfiles[manufacturerIndex].key)fail(`${family.key}/${level.key}/house-${manufacturerIndex} lost focus identity.`);
      if(manufacturer.baseTechnologyBand!==`P${level.rank}`)fail(`${family.key}/${level.key}/house-${manufacturerIndex} manufacturer band ${manufacturer.baseTechnologyBand} does not match P${level.rank}.`);
      if(result.contract.technology.principalBand!==`P${level.rank}`)fail(`${family.key}/${level.key}/house-${manufacturerIndex} contract technology mismatch.`);
      if(result.contract.identifiers.manufacturerId!==manufacturer.manufacturerId||result.identity.manufacturerId!==manufacturer.manufacturerId)fail(`${family.key}/${level.key}/house-${manufacturerIndex} identity mismatch.`);
      if(result.manufacturerCatalog.length!==4||new Set(result.manufacturerCatalog.map(item=>item.manufacturerId)).size!==4)fail(`${family.key}/${level.key}/house-${manufacturerIndex} catalog incomplete.`);
      close(result.hull.massBudget.reduce((sum,row)=>sum+row.massTonnes,0),result.hull.totalMassTonnes,1e-10,`${family.key}/${level.key}/house-${manufacturerIndex} mass closure`);
      if(!result.designPhilosophy.attachmentValidation.valid)fail(`${family.key}/${level.key}/house-${manufacturerIndex} invalid module attachment.`);
      for(const item of result.contract.technology.subsystemVariants){if(Math.abs(item.offset)>.300000001)fail(`${family.key}/${level.key}/${item.subsystemKey} exceeds technology band.`);if(!item.explicitOverride&&!item.source.includes(manufacturer.name))fail(`${family.key}/${level.key}/${item.subsystemKey} lost manufacturer source.`);}
      const left=clone(result),right=clone(replay);delete left.generatedAt;delete right.generatedAt;delete left.contract.createdAt;delete right.contract.createdAt;delete left.contract.updatedAt;delete right.contract.updatedAt;
      if(JSON.stringify(left)!==JSON.stringify(right))fail(`${family.key}/${level.key}/house-${manufacturerIndex} is not deterministic outside timestamps.`);
    }
  }
}

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-manufacturer-definitions.js','blacklight-exo-vessel-manufacturer-runtime.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-ui.js','blacklight-exo-vessel-philosophy-ui.js','blacklight-exo-vessel-manufacturer-ui.js','blacklight-exo-vessel-contract-ui.js'];
let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=prior)fail(`Vessel page loads ${marker} out of order.`);prior=index;}
const ui=await fs.readFile(path.join(root,'blacklight-exo-vessel-manufacturer-ui.js'),'utf8');
for(const marker of ['exo-vessel-manufacturer-index','exo-vessel-save-manufacturer','exo-vessel-export-manufacturer','exo-vessel-manufacturer-section','exo-vessel-manufacturer-grid','exo-vessel-manufacturer-comparison','exo-vessel-manufacturer-technology-body'])if(!ui.includes(marker))fail(`Manufacturer UI lacks ${marker}.`);

console.log('EXO vessel VESSEL-01 manufacturer validation passed.');
console.log(`Validated ${cases} family/Path/manufacturer cases, four culturally related but distinct houses, fleet-stable manufacturer identity, schema coverage, local persistence, authoritative architecture and technology routing, deterministic replay, and page loader order.`);
