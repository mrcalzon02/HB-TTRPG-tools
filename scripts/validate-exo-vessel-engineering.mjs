import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const files=[
  'blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-operational-definitions.js','blacklight-exo-ftl-runtime.js','blacklight-exo-ftl-core.js','blacklight-exo-ftl-engineering-extension.js',
  'blacklight-exo-ftl-path-level-core.js','blacklight-exo-ftl-path-level-paths-physical.js','blacklight-exo-ftl-path-level-paths-dimensional.js','blacklight-exo-ftl-path-level-paths-discrete.js','blacklight-exo-ftl-path-level-runtime.js','blacklight-exo-ftl-path-level-engineering.js','blacklight-exo-ftl-path-level-controller.js',
  'blacklight-exo-ftl-mechanism-core.js','blacklight-exo-ftl-mechanism-path-inertial-torch.js','blacklight-exo-ftl-mechanism-path-metric-envelope.js','blacklight-exo-ftl-mechanism-path-gravitic-plane.js','blacklight-exo-ftl-mechanism-path-slipstream-shear.js','blacklight-exo-ftl-mechanism-path-q-lattice.js','blacklight-exo-ftl-mechanism-path-n-manifold.js','blacklight-exo-ftl-mechanism-path-fold-jump.js','blacklight-exo-ftl-mechanism-path-wormhole-gate.js','blacklight-exo-ftl-mechanism-path-phase-displacement.js','blacklight-exo-ftl-mechanism-runtime.js',
  'blacklight-exo-ftl-assembly-core.js','blacklight-exo-ftl-assembly-runtime.js','blacklight-exo-ftl-calculation-core.js','blacklight-exo-ftl-calculation-performance.js','blacklight-exo-ftl-calculation-energy.js','blacklight-exo-ftl-calculation-runtime.js','blacklight-exo-ftl-certification-core.js','blacklight-exo-ftl-certification-route.js','blacklight-exo-ftl-certification-reliability.js','blacklight-exo-ftl-certification-runtime.js',
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-manufacturer-definitions.js','blacklight-exo-vessel-manufacturer-runtime.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-engineering-definitions.js','blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-contracts.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const left=finite(a,`${label} left`),right=finite(b,`${label} right`),error=Math.abs(left-right)/Math.max(1,Math.abs(right));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(9)}%.`);};
const clone=value=>structuredClone(value);
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key),clear:()=>storage.clear()};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel;
const definitions=globalThis.BlacklightExoVesselEngineeringDefinitions;
if(!vessel||!definitions)fail('VESSEL-02 engineering runtime did not initialize.');
if(vessel.version!==3||vessel.engineeringLedgerVersion!==1||vessel.contractVersion!==1||vessel.manufacturerVersion!==1||vessel.philosophyVersion!==1)fail(`Unexpected vessel stack ${vessel.version}/${vessel.engineeringLedgerVersion}/${vessel.contractVersion}/${vessel.manufacturerVersion}/${vessel.philosophyVersion}.`);
if(definitions.schemaVersion!=='1.0.0'||definitions.propulsionByRank.length!==7)fail('Engineering definitions must expose schema 1.0.0 and seven propulsion bands.');
if(Object.keys(definitions.weaponFamilies).length!==9||Object.keys(definitions.countermeasureTypes).length!==4||Object.keys(definitions.combatFits).length!==5)fail('Engineering family, countermeasure, or combat-fit definitions are incomplete.');

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/engineering-registry.json'),'utf8'));
const schema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-engineering-ledger.schema.json'),'utf8'));
const manufacturerSchema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-manufacturer.schema.json'),'utf8'));
if(registry.registryVersion!=='1.0.0'||registry.phase!=='VESSEL-02'||registry.schema!=='data/schemas/exo-vessel-engineering-ledger.schema.json')fail('Engineering registry identity is incorrect.');
if(registry.technologyBands.length!==7||registry.weaponFamilies.length!==9||registry.countermeasureTypes.length!==4)fail('Engineering registry definition counts are incomplete.');
if(schema.$schema!=='https://json-schema.org/draft/2020-12/schema'||schema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-engineering-ledger.schema.json')fail('Engineering schema identity is incorrect.');
for(const key of ['recordType','schemaVersion','phase','technologyBand','manufacturerId','sourceMassTonnes','sourceVolumeM3','addedReactionMassTonnes','propulsion','armor','sensors','weapons','countermeasures','massClosure','deferredSystems','validation'])if(!schema.required.includes(key))fail(`Engineering schema does not require ${key}.`);
if(!manufacturerSchema.properties.realizedEngineering)fail('Manufacturer schema does not permit VESSEL-02 realization records.');

const source={type:'biology',dossier:{
  version:3,seed:'vesper-engineering-culture',generatedAt:'2026-07-17T00:00:00.000Z',
  system:{name:'Vesper Array',state:'Dense interstellar hub system',stateKey:'hub',development:91,life:'living',economy:'interstellar transit-service economy',traffic:'continuous interstellar traffic'},
  species:{name:'Vesper Assemblies',commonName:'Vesper',environment:'high-gravity artificial habitat network',bodyPlan:'distributed colonial organism',chemistry:'engineered synthetic biochemistry',senses:['broad-spectrum vision','electromagnetic field sensing'],cognition:'machine-mediated collective memory',communication:'shared augmented-reality glyphs',reproduction:'manufactured gestation',lifespan:'220 local years',size:'2.1 m typical adult span',adaptation:'radiation-repair enzymes',extinct:false},
  civilization:{status:'active',government:'bureaucratic republic',economy:'interstellar transit-service economy',technology:'Advanced interstellar',reach:'Distributed interstellar network',values:['precision and proof','collective survival','commercial reputation'],law:'algorithmic regulation',warfare:'professional expeditionary fleets'}
}};
const baseInput={family:'metric-envelope',pathLevel:'p4',role:'explorer',biologyProfile:'inherit',defense:'hardened',manufacturerProfile:'CORP_LOGISTICS',manufacturerIndex:1,designEnvelope:'AUTO',combatFit:'DEFENSIVE',crew:42,enduranceDays:220,reserveJumps:3,distanceLy:4,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};

function row(result,key){return result.hull.massBudget.find(item=>item.key===key);}
function checkResult(result,label){
  const ledger=result.engineeringLedger;
  if(!ledger||ledger.recordType!=='exoVesselEngineeringLedger'||ledger.schemaVersion!=='1.0.0'||ledger.phase!=='VESSEL-02')fail(`${label} lacks the canonical engineering ledger.`);
  if(!ledger.validation.valid)fail(`${label} engineering invalid: ${ledger.validation.violations.join('; ')}`);
  if(!result.contract?.validation?.valid)fail(`${label} contract invalid: ${result.contract?.validation?.violations?.join('; ')}`);
  if(result.contract.provenance.generatorVersion!=='3.2.0'||result.contract.provenance.engineeringLedgerVersion!=='1.0.0')fail(`${label} contract provenance does not identify VESSEL-02.`);
  if(result.contract.extensions.engineeringLedgerSchema!=='data/schemas/exo-vessel-engineering-ledger.schema.json')fail(`${label} contract does not expose the engineering schema.`);
  for(const key of ['engineeringBaseline','architectureAdjustedMassLedger','powerAndThermalLedger','armorAndProtectionLedger','sensorAndNavigationLedger','maneuverAndDeltaVLedger','weaponInventory','countermeasureInventory'])if(result.contract.derivedLayers.find(layer=>layer.key===key)?.status!=='generated')fail(`${label} did not generate derived layer ${key}.`);
  for(const key of ['moduleGraph','voxelLayout','damageTopology','combatEnvelope','gameplayStatBlock','actionSet'])if(result.contract.derivedLayers.find(layer=>layer.key===key)?.status!=='planned')fail(`${label} prematurely generated ${key}.`);

  const mass=result.hull.massBudget.reduce((total,item)=>total+finite(item.massTonnes,`${label}/${item.key} mass`),0),volume=result.hull.massBudget.reduce((total,item)=>total+finite(item.volumeM3,`${label}/${item.key} volume`),0);
  close(mass,result.hull.totalMassTonnes,1e-10,`${label} loaded mass closure`);
  close(volume,result.hull.totalVolumeM3,1e-10,`${label} loaded volume closure`);
  close(ledger.massClosure.actualLoadedMassTonnes,ledger.massClosure.sourceMassTonnes+ledger.massClosure.addedMassTonnes,1e-10,`${label} source plus reaction mass`);
  close(ledger.addedReactionMassTonnes,row(result,'conventional-propellant')?.massTonnes,1e-10,`${label} reaction-mass row`);
  if(row(result,'maneuver')||row(result,'shielding'))fail(`${label} retained obsolete broad maneuver or shielding rows.`);
  for(const key of ['conventional-engine','conventional-propellant','armor','protection-fields','navigation','sensors','fire-control','electronic-warfare','payload','margin'])if(!row(result,key))fail(`${label} lacks expanded mass row ${key}.`);

  const p=ledger.propulsion,reconstructed=p.technology.exhaustVelocityMps*Math.log(p.wetMassTonnes/p.dryBeforePropellantTonnes);
  close(reconstructed,p.strategicDeltaVMps,1e-10,`${label} rocket equation`);
  close(p.strategicDeltaVMps,p.cruiseDeltaVMps+p.combatReserveDeltaVMps,1e-10,`${label} separated delta-v`);
  close(p.propellantMassTonnes,p.cruisePropellantTonnes+p.combatPropellantTonnes,1e-10,`${label} propellant segregation`);
  if(p.combatReserveDeltaVMps>p.strategicDeltaVMps||p.lateralCombatAccelerationMps2>p.longitudinalAccelerationMps2||p.longitudinalAccelerationMps2>p.rawLongitudinalAccelerationMps2+1e-12)fail(`${label} violates maneuver limits.`);
  if(p.longitudinalAccelerationMps2>p.structuralAccelerationLimitG*9.80665+1e-9||p.longitudinalAccelerationMps2>p.crewAccelerationLimitG*9.80665+1e-9)fail(`${label} exceeds structural or biological acceleration limit.`);
  close(p.sustainedCombatDurationSeconds,Math.min(p.propellantLimitedSeconds,p.thermalLimitedSeconds),1e-10,`${label} sustained maneuver limit`);
  if(result.hull.dryMassTonnes<0)fail(`${label} produced negative dry mass.`);

  const a=ledger.armor;
  close(a.equationMassTonnes,a.protectedSurfaceAreaM2*a.physicalArealDensityKgM2*a.coverageFraction/1000,1e-10,`${label} armor equation`);
  close(a.passiveArmorMassTonnes,a.layers.reduce((total,item)=>total+item.massTonnes,0),1e-10,`${label} armor-layer mass`);
  close(a.totalProtectionMassTonnes,a.passiveArmorMassTonnes+a.fieldProtectionMassTonnes,1e-10,`${label} passive and active protection`);
  close(a.totalProtectionMassTonnes,row(result,'armor').massTonnes+row(result,'protection-fields').massTonnes,1e-10,`${label} protection mass rows`);
  close(Object.values(a.facings).reduce((x,y)=>x+y,0),1,1e-12,`${label} armor facing distribution`);
  if(a.coverageFraction<=0||a.coverageFraction>1||a.armorToMassPercent<0||a.protectionToMassPercent<a.armorToMassPercent)fail(`${label} has invalid armor ratios.`);

  const s=ledger.sensors;
  close(s.totalMassTonnes,Object.values(s.masses).reduce((x,y)=>x+y,0),1e-10,`${label} sensor mass split`);
  close(Object.values(s.shares).reduce((x,y)=>x+y,0),1,1e-12,`${label} sensor share split`);
  close(s.totalMassTonnes,row(result,'navigation').massTonnes+row(result,'sensors').massTonnes+row(result,'fire-control').massTonnes+row(result,'electronic-warfare').massTonnes,1e-10,`${label} sensor mass rows`);
  if(s.sensorChannels<1||s.navigationChannels<1||s.electronicWarfareChannels<1||s.baselineM<=0||s.apertureAreaM2<0)fail(`${label} has invalid sensor capacity.`);
  if(!s.trackModelStatus.includes('VESSEL-06'))fail(`${label} did not defer track geometry to VESSEL-06.`);

  const w=ledger.weapons;
  close(w.totalCombatAllocationTonnes,w.offensiveMassTonnes+w.countermeasureMassTonnes,1e-10,`${label} combat allocation`);
  close(w.offensiveMassTonnes,w.totals.mountMassTonnes+w.totals.supportMassTonnes+w.totals.magazineMassTonnes+w.totals.coolingMassTonnes,1e-10,`${label} weapon support categories`);
  close(w.countermeasureMassTonnes,w.countermeasures.inventory.reduce((total,item)=>total+item.allocationMassTonnes,0),1e-10,`${label} countermeasure inventory mass`);
  if(w.totalCombatAllocationTonnes>0){
    for(const key of ['weapon-mounts','weapon-support','weapon-magazines','weapon-cooling','countermeasures'])if(!row(result,key))fail(`${label} lacks armed mass row ${key}.`);
    close(w.totals.mountMassTonnes,row(result,'weapon-mounts').massTonnes,1e-10,`${label} mount row`);
    close(w.totals.supportMassTonnes,row(result,'weapon-support').massTonnes,1e-10,`${label} support row`);
    close(w.totals.magazineMassTonnes,row(result,'weapon-magazines').massTonnes,1e-10,`${label} magazine row`);
    close(w.totals.coolingMassTonnes,row(result,'weapon-cooling').massTonnes,1e-10,`${label} cooling row`);
    close(w.countermeasureMassTonnes,row(result,'countermeasures').massTonnes,1e-10,`${label} countermeasure row`);
  }
  for(const installation of w.installations){
    close(installation.allocationMassTonnes,installation.mountMassTonnes+installation.supportMassTonnes+installation.magazineMassTonnes+installation.coolingMassTonnes,1e-10,`${label}/${installation.weaponFamily} installation mass`);
    if(installation.engagementEnvelope||installation.projectileVelocityMps||installation.guidance||installation.lethalFootprintM)fail(`${label}/${installation.weaponFamily} prematurely includes VESSEL-07 performance data.`);
    if(!installation.integrationStatus.includes('VESSEL-07'))fail(`${label}/${installation.weaponFamily} does not identify its deferred engagement phase.`);
  }
  if(!w.countermeasures.engagementStatus.includes('VESSEL-07')||!w.countermeasures.engagementStatus.includes('VESSEL-08'))fail(`${label} countermeasure resolution was not deferred correctly.`);
  if(result.contract.technology.subsystemVariants.length!==result.hull.massBudget.length)fail(`${label} technology ledger does not cover every expanded mass row.`);
  for(const item of result.contract.technology.subsystemVariants){if(Math.abs(item.offset)>.300000001)fail(`${label}/${item.subsystemKey} exceeds the technology band.`);}
  if(!result.manufacturer?.realizedEngineering||result.manufacturer.realizedEngineering.technologyBand!==ledger.technologyBand)fail(`${label} did not write the engineering realization to its manufacturer record.`);
}

const reference=vessel.generate('engineering-reference',baseInput,source);
checkResult(reference,'reference vessel');
const replay=vessel.generate('engineering-reference',baseInput,source);
const left=clone(reference),right=clone(replay);delete left.generatedAt;delete right.generatedAt;delete left.contract.createdAt;delete right.contract.createdAt;delete left.contract.updatedAt;delete right.contract.updatedAt;
if(JSON.stringify(left)!==JSON.stringify(right))fail('Reference engineering generation is not deterministic outside timestamps.');

const unarmed=vessel.generate('engineering-unarmed',{...baseInput,combatFit:'UNARMED'},source);
checkResult(unarmed,'unarmed vessel');
if(unarmed.weapons.totalCombatAllocationTonnes!==0||unarmed.weapons.installations.length!==0||unarmed.countermeasures.totalMassTonnes!==0)fail('UNARMED combat fit retained combat allocation.');
for(const key of ['weapon-mounts','weapon-support','weapon-magazines','weapon-cooling','countermeasures'])if(row(unarmed,key))fail(`UNARMED combat fit retained ${key}.`);
let rejected=false;try{vessel.generate('engineering-invalid',{...baseInput,combatFit:'BATTLESHIP'},source);}catch{rejected=true;}if(!rejected)fail('Invalid combat fit was silently accepted.');

const civilian=vessel.generate('engineering-comparison',{...baseInput,role:'warship',defense:'civilian',combatFit:'CIVILIAN'},source);
const naval=vessel.generate('engineering-comparison',{...baseInput,role:'warship',defense:'naval',combatFit:'NAVAL'},source);
checkResult(civilian,'civilian comparison vessel');checkResult(naval,'naval comparison vessel');
if(naval.armor.protectionToMassPercent<=civilian.armor.protectionToMassPercent)fail('Naval protection doctrine did not increase protection-to-mass ratio.');
if(naval.weapons.totalCombatAllocationTonnes/naval.engineeringLedger.sourceMassTonnes<=civilian.weapons.totalCombatAllocationTonnes/civilian.engineeringLedger.sourceMassTonnes)fail('Naval combat fit did not increase combat allocation ratio.');

const families=globalThis.BlacklightExoFTL.families||[],levels=globalThis.BlacklightExoFTL.pathLevels||[],archetypes=['VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'],fits=['UNARMED','CIVILIAN','DEFENSIVE','SECURITY','NAVAL'];
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length}/${levels.length}.`);
let cases=0;
for(const family of families)for(const level of levels)for(let manufacturerIndex=0;manufacturerIndex<4;manufacturerIndex+=1){
  const role=vessel.roles[(cases+manufacturerIndex)%vessel.roles.length],fit=fits[(cases+manufacturerIndex)%fits.length],input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:'inherit',defense:vessel.defenses[cases%vessel.defenses.length].key,manufacturerProfile:archetypes[manufacturerIndex],manufacturerIndex,designEnvelope:'AUTO',combatFit:fit,crew:10+(cases%83),enduranceDays:30+(cases%12)*45,reserveJumps:1+(cases%4),distanceLy:.25+(cases%14)*1.25,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};
  const seed=`engineering-matrix:${family.key}:${level.key}:${manufacturerIndex}`,result=vessel.generate(seed,input,source),again=vessel.generate(seed,input,source);cases+=1;
  checkResult(result,`${family.key}/${level.key}/house-${manufacturerIndex}`);
  if(result.engineeringLedger.technologyBand!==`P${level.rank}`||result.propulsion.technologyBand!==`P${level.rank}`||result.sensors.technologyBand!==`P${level.rank}`)fail(`${family.key}/${level.key}/house-${manufacturerIndex} lost principal engineering band.`);
  if(level.rank<5&&result.weapons.installations.some(item=>item.weaponFamily==='FRACTIONAL_C'))fail(`${family.key}/${level.key}/house-${manufacturerIndex} installed fractional-c kinetics below P5.`);
  if(result.weapons.installations.length>result.weapons.combatFit.maxWeaponFamilies)fail(`${family.key}/${level.key}/house-${manufacturerIndex} exceeds combat-fit family count.`);
  const a=clone(result),b=clone(again);delete a.generatedAt;delete b.generatedAt;delete a.contract.createdAt;delete b.contract.createdAt;delete a.contract.updatedAt;delete b.contract.updatedAt;if(JSON.stringify(a)!==JSON.stringify(b))fail(`${family.key}/${level.key}/house-${manufacturerIndex} is not deterministic outside timestamps.`);
}

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-engineering-definitions.js','blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-ui.js','blacklight-exo-vessel-philosophy-ui.js','blacklight-exo-vessel-manufacturer-ui.js','blacklight-exo-vessel-engineering-ui.js','blacklight-exo-vessel-contract-ui.js'];
let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=prior)fail(`Vessel page loads ${marker} out of order.`);prior=index;}
const ui=await fs.readFile(path.join(root,'blacklight-exo-vessel-engineering-ui.js'),'utf8');
for(const marker of ['exo-vessel-combat-fit','exo-vessel-engineering-section','exo-vessel-engineering-grid','exo-vessel-armor-section','exo-vessel-armor-body','exo-vessel-combat-section','exo-vessel-weapon-body','exo-vessel-countermeasure-grid'])if(!ui.includes(marker))fail(`Engineering UI lacks ${marker}.`);

console.log('EXO vessel VESSEL-02 engineering validation passed.');
console.log(`Validated ${cases} family/Path/manufacturer cases, five combat fits, seven conventional propulsion bands, rocket-equation closure, strategic and combat delta-v separation, acceleration limits, armor-area closure, sensor and fire-control ledgers, complete weapon support, countermeasure inventory, deterministic replay, and page loader order.`);
