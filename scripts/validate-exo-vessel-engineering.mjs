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
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-manufacturer-definitions.js','blacklight-exo-vessel-manufacturer-runtime.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-engineering-definitions.js','blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-armor-distribution.js','blacklight-exo-vessel-contracts.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const left=finite(a,`${label} left`),right=finite(b,`${label} right`),error=Math.abs(left-right)/Math.max(1,Math.abs(right));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(9)}%.`);};
const clone=value=>structuredClone(value);
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel,definitions=globalThis.BlacklightExoVesselEngineeringDefinitions;
if(!vessel||!definitions)fail('VESSEL-02 engineering runtime did not initialize.');
if(vessel.version!==3||vessel.engineeringLedgerVersion!==1||vessel.distributedArmorVersion!==1||vessel.contractVersion!==1||vessel.manufacturerVersion!==1||vessel.philosophyVersion!==1)fail(`Unexpected vessel stack ${vessel.version}/${vessel.engineeringLedgerVersion}/${vessel.distributedArmorVersion}/${vessel.contractVersion}/${vessel.manufacturerVersion}/${vessel.philosophyVersion}.`);
if(definitions.propulsionByRank.length!==7||Object.keys(definitions.weaponFamilies).length!==9||Object.keys(definitions.countermeasureTypes).length!==4||Object.keys(definitions.combatFits).length!==5)fail('Engineering definitions are incomplete.');

const registry=JSON.parse(await fs.readFile(path.join(root,'data/exo-vessel/engineering-registry.json'),'utf8'));
const schema=JSON.parse(await fs.readFile(path.join(root,'data/schemas/exo-vessel-engineering-ledger.schema.json'),'utf8'));
if(registry.registryVersion!=='1.0.0'||registry.phase!=='VESSEL-02')fail('Engineering registry identity is incorrect.');
if(schema.$schema!=='https://json-schema.org/draft/2020-12/schema')fail('Engineering schema is not draft 2020-12.');
for(const key of ['model','standaloneArmorModules','equivalentOuterHullThicknessMm','allocations','facings','fieldFacings','distributionRule'])if(!schema.$defs.armor.required.includes(key))fail(`Engineering armor schema does not require ${key}.`);

const source={type:'biology',dossier:{version:3,seed:'vesper-engineering-culture',generatedAt:'2026-07-17T00:00:00.000Z',system:{name:'Vesper Array',state:'Dense interstellar hub system',stateKey:'hub',development:91,life:'living',economy:'interstellar transit-service economy',traffic:'continuous interstellar traffic'},species:{name:'Vesper Assemblies',commonName:'Vesper',environment:'high-gravity artificial habitat network',bodyPlan:'distributed colonial organism',chemistry:'engineered synthetic biochemistry',senses:['broad-spectrum vision','electromagnetic field sensing'],cognition:'machine-mediated collective memory',communication:'shared augmented-reality glyphs',reproduction:'manufactured gestation',lifespan:'220 local years',size:'2.1 m typical adult span',adaptation:'radiation-repair enzymes',extinct:false},civilization:{status:'active',government:'bureaucratic republic',economy:'interstellar transit-service economy',technology:'Advanced interstellar',reach:'Distributed interstellar network',values:['precision and proof','collective survival','commercial reputation'],law:'algorithmic regulation',warfare:'professional expeditionary fleets'}}};
const baseInput={family:'metric-envelope',pathLevel:'p4',role:'explorer',biologyProfile:'inherit',defense:'hardened',manufacturerProfile:'CORP_LOGISTICS',manufacturerIndex:1,designEnvelope:'AUTO',combatFit:'DEFENSIVE',crew:42,enduranceDays:220,reserveJumps:3,distanceLy:4,payloadTonnes:'',conditionTemplate:'OPERATIONAL'};
const row=(result,key)=>result.hull.massBudget.find(item=>item.key===key);
const directionKeys=['FORE','AFT','LEFT','RIGHT','UP','DOWN','CITADEL','STRUCTURAL'];

function checkResult(result,label){
  const ledger=result.engineeringLedger,a=ledger?.armor,p=ledger?.propulsion,s=ledger?.sensors,w=ledger?.weapons;
  if(!ledger||!ledger.validation.valid)fail(`${label} lacks a valid engineering ledger.`);
  if(!result.contract?.validation?.valid)fail(`${label} contract invalid: ${result.contract?.validation?.violations?.join('; ')}`);
  if(result.contract.provenance.generatorVersion!=='3.2.0')fail(`${label} contract provenance does not identify VESSEL-02.`);
  const mass=result.hull.massBudget.reduce((total,item)=>total+finite(item.massTonnes,`${label}/${item.key} mass`),0),volume=result.hull.massBudget.reduce((total,item)=>total+finite(item.volumeM3,`${label}/${item.key} volume`),0);
  close(mass,result.hull.totalMassTonnes,1e-10,`${label} loaded mass closure`);close(volume,result.hull.totalVolumeM3,1e-10,`${label} loaded volume closure`);
  close(ledger.massClosure.actualLoadedMassTonnes,ledger.massClosure.sourceMassTonnes+ledger.massClosure.addedMassTonnes,1e-10,`${label} source plus reaction mass`);
  close(ledger.addedReactionMassTonnes,row(result,'conventional-propellant')?.massTonnes,1e-10,`${label} reaction mass row`);
  if(row(result,'maneuver')||row(result,'shielding')||row(result,'armor'))fail(`${label} retained an obsolete broad or standalone armor row.`);
  for(const key of ['conventional-engine','conventional-propellant','protection-fields','navigation','sensors','fire-control','electronic-warfare','payload','margin'])if(!row(result,key))fail(`${label} lacks expanded mass row ${key}.`);

  const reconstructed=p.technology.exhaustVelocityMps*Math.log(p.wetMassTonnes/p.dryBeforePropellantTonnes);close(reconstructed,p.strategicDeltaVMps,1e-10,`${label} rocket equation`);close(p.strategicDeltaVMps,p.cruiseDeltaVMps+p.combatReserveDeltaVMps,1e-10,`${label} separated delta-v`);close(p.sustainedCombatDurationSeconds,Math.min(p.propellantLimitedSeconds,p.thermalLimitedSeconds),1e-10,`${label} sustained maneuver limit`);

  if(a.model!=='DISTRIBUTED_HULL_AND_SYSTEM_HARDENING'||a.standaloneArmorModules!==false)fail(`${label} uses the obsolete armor-module model.`);
  close(a.equationMassTonnes,a.protectedSurfaceAreaM2*a.physicalArealDensityKgM2*a.coverageFraction/1000,1e-10,`${label} armor equation`);
  close(a.passiveArmorMassTonnes,a.layers.reduce((total,item)=>total+item.massTonnes,0),1e-10,`${label} protective-function mass`);
  close(a.passiveArmorMassTonnes,Object.values(a.allocations).reduce((total,item)=>total+item.massTonnes,0),1e-10,`${label} distributed allocation mass`);
  close(a.passiveArmorMassTonnes,result.hull.massBudget.reduce((total,item)=>total+finite(item.distributedHardeningTonnes),0),1e-10,`${label} distributed row hardening`);
  close(a.totalProtectionMassTonnes,a.passiveArmorMassTonnes+a.fieldProtectionMassTonnes,1e-10,`${label} passive and active protection`);
  close(a.fieldProtectionMassTonnes,row(result,'protection-fields').massTonnes,1e-10,`${label} active protection row`);
  for(const mapName of ['facings','fieldFacings']){const map=a[mapName];if(directionKeys.some(key=>!map[key]))fail(`${label} ${mapName} lacks a required direction.`);close(Object.values(map).reduce((total,item)=>total+item.weight,0),1,1e-12,`${label} ${mapName} weights`);close(Object.values(map).reduce((total,item)=>total+item.massTonnes,0),mapName==='facings'?a.passiveArmorMassTonnes:a.fieldProtectionMassTonnes,1e-10,`${label} ${mapName} mass`);}
  if(a.equivalentOuterHullThicknessMm<0||a.externalSystemDurabilityMultiplier<1)fail(`${label} has invalid hull thickness or external-system hardening.`);

  close(s.totalMassTonnes,Object.values(s.masses).reduce((x,y)=>x+y,0),1e-10,`${label} sensor mass split`);close(Object.values(s.shares).reduce((x,y)=>x+y,0),1,1e-12,`${label} sensor share split`);
  close(w.totalCombatAllocationTonnes,w.offensiveMassTonnes+w.countermeasureMassTonnes,1e-10,`${label} combat allocation`);close(w.offensiveMassTonnes,w.totals.mountMassTonnes+w.totals.supportMassTonnes+w.totals.magazineMassTonnes+w.totals.coolingMassTonnes,1e-10,`${label} weapon support categories`);
  if(result.contract.technology.subsystemVariants.length!==result.hull.massBudget.length)fail(`${label} technology ledger does not cover every expanded mass row.`);
  if(!result.manufacturer?.realizedEngineering)fail(`${label} lacks manufacturer engineering realization.`);
}

const reference=vessel.generate('engineering-reference',baseInput,source);checkResult(reference,'reference vessel');
const replay=vessel.generate('engineering-reference',baseInput,source);const left=clone(reference),right=clone(replay);delete left.generatedAt;delete right.generatedAt;delete left.contract.createdAt;delete right.contract.createdAt;delete left.contract.updatedAt;delete right.contract.updatedAt;if(JSON.stringify(left)!==JSON.stringify(right))fail('Reference engineering generation is not deterministic outside timestamps.');
const unarmed=vessel.generate('engineering-unarmed',{...baseInput,combatFit:'UNARMED'},source);checkResult(unarmed,'unarmed vessel');if(unarmed.weapons.totalCombatAllocationTonnes||unarmed.weapons.installations.length)fail('UNARMED combat fit retained combat allocation.');
let rejected=false;try{vessel.generate('engineering-invalid',{...baseInput,combatFit:'BATTLESHIP'},source);}catch{rejected=true;}if(!rejected)fail('Invalid combat fit was silently accepted.');
const civilian=vessel.generate('engineering-comparison',{...baseInput,role:'warship',defense:'civilian',combatFit:'CIVILIAN'},source),naval=vessel.generate('engineering-comparison',{...baseInput,role:'warship',defense:'naval',combatFit:'NAVAL'},source);checkResult(civilian,'civilian comparison vessel');checkResult(naval,'naval comparison vessel');if(naval.hull.totalMassTonnes<=civilian.hull.totalMassTonnes||naval.armor.equivalentOuterHullThicknessMm<=civilian.armor.equivalentOuterHullThicknessMm)fail('Naval doctrine did not produce a heavier, thicker-armored vessel.');

const families=globalThis.BlacklightExoFTL.families||[],levels=globalThis.BlacklightExoFTL.pathLevels||[],archetypes=['VAULT_KEEPER','VOID_NOMAD','CORP_LOGISTICS','APEX_WARLORD'],fits=['UNARMED','CIVILIAN','DEFENSIVE','SECURITY','NAVAL'];let cases=0;
for(const family of families)for(const level of levels)for(let manufacturerIndex=0;manufacturerIndex<4;manufacturerIndex+=1){const role=vessel.roles[(cases+manufacturerIndex)%vessel.roles.length],fit=fits[(cases+manufacturerIndex)%fits.length],input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:'inherit',defense:vessel.defenses[cases%vessel.defenses.length].key,manufacturerProfile:archetypes[manufacturerIndex],manufacturerIndex,designEnvelope:'AUTO',combatFit:fit,crew:10+(cases%83),enduranceDays:30+(cases%12)*45,reserveJumps:1+(cases%4),distanceLy:.25+(cases%14)*1.25,payloadTonnes:'',conditionTemplate:'OPERATIONAL'},seed=`engineering-matrix:${family.key}:${level.key}:${manufacturerIndex}`,result=vessel.generate(seed,input,source),again=vessel.generate(seed,input,source);cases+=1;checkResult(result,`${family.key}/${level.key}/house-${manufacturerIndex}`);const a=clone(result),b=clone(again);delete a.generatedAt;delete b.generatedAt;delete a.contract.createdAt;delete b.contract.createdAt;delete a.contract.updatedAt;delete b.contract.updatedAt;if(JSON.stringify(a)!==JSON.stringify(b))fail(`${family.key}/${level.key}/house-${manufacturerIndex} is not deterministic outside timestamps.`);}

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');const order=['blacklight-exo-vessel-engineering-runtime.js','blacklight-exo-vessel-armor-distribution.js','blacklight-exo-vessel-contracts.js','blacklight-exo-vessel-engineering-ui.js','blacklight-exo-vessel-armor-ui.js'];let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0||index<=prior)fail(`Vessel page does not load ${marker} in order.`);prior=index;}
const armorUi=await fs.readFile(path.join(root,'blacklight-exo-vessel-armor-ui.js'),'utf8');for(const marker of ['exo-vessel-directional-protection-body','Equivalent outer-hull thickness','No standalone armor modules'])if(!armorUi.includes(marker))fail(`Distributed armor UI lacks ${marker}.`);
console.log('EXO vessel VESSEL-02 engineering validation passed.');
console.log(`Validated ${cases} family/Path/manufacturer cases, distributed hardening mass closure, heavier naval construction, equivalent hull thickness, external-system reinforcement, eight physical directions, eight active-field directions, propulsion, sensors, weapons, deterministic replay, and loader order.`);
