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
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-philosophy-runtime.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const error=Math.abs(a-b)/Math.max(1,Math.abs(b));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(8)}%.`);};

globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel;
if(!vessel)fail('BlacklightExoVessel did not initialize.');
if(vessel.version!==2||vessel.philosophyVersion!==1)fail(`Expected vessel version 2 philosophy version 1; found ${vessel.version}/${vessel.philosophyVersion}.`);
if(vessel.roles.length!==8)fail(`Expected 8 vessel roles; found ${vessel.roles.length}.`);
if(vessel.biologyProfiles.length!==9)fail(`Expected 9 biology profiles; found ${vessel.biologyProfiles.length}.`);
if(vessel.defenses.length!==3)fail(`Expected 3 protection doctrines; found ${vessel.defenses.length}.`);
if(vessel.manufacturerProfiles.length!==4)fail(`Expected 4 manufacturer archetypes; found ${vessel.manufacturerProfiles.length}.`);
for(const key of ['INTERNAL','EVA'])if(!vessel.designPhilosophies[key])fail(`Missing ${key} design philosophy.`);
const families=globalThis.BlacklightExoFTL.families||[];
const levels=globalThis.BlacklightExoFTL.pathLevels||[];
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length} and ${levels.length}.`);

let cases=0;
for(const family of families){
  for(const level of levels){
    const role=vessel.roles[cases%vessel.roles.length];
    const biology=vessel.biologyProfiles[cases%vessel.biologyProfiles.length];
    const defense=vessel.defenses[cases%vessel.defenses.length];
    const archetype=vessel.manufacturerProfiles[cases%vessel.manufacturerProfiles.length];
    const input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:biology.key,defense:defense.key,manufacturerProfile:archetype.key,designEnvelope:'AUTO',crew:8+(cases%73),enduranceDays:30+(cases%11)*45,reserveJumps:1+(cases%5),distanceLy:.25+(cases%13)*1.7,payloadTonnes:''};
    const result=vessel.generate(`validation:${family.key}:${level.key}`,input,null);
    const replay=vessel.generate(`validation:${family.key}:${level.key}`,input,null);
    cases+=1;
    if(result.drive.familyKey!==family.key)fail(`${family.key}/${level.key} lost requested FTL family and resolved ${result.drive.familyKey}.`);
    if(result.drive.pathLevelKey!==level.key)fail(`${family.key}/${level.key} lost requested Path level and resolved ${result.drive.pathLevelKey}.`);
    if(result.identity.roleKey!==role.key)fail(`${family.key}/${level.key} lost requested role.`);
    if(result.lifeSupport.profile.key!==biology.key)fail(`${family.key}/${level.key} lost requested biology profile.`);
    if(result.designation.originArchetypeKey!==archetype.key)fail(`${family.key}/${level.key} lost manufacturer profile ${archetype.key}.`);
    if(!/^(INTERNAL|EVA|HYBRID)$/.test(result.designPhilosophy.classification))fail(`${family.key}/${level.key} has invalid architecture classification.`);
    if(!result.identity.designationCode||!result.designation.coreInterpretation)fail(`${family.key}/${level.key} is missing vessel designation interpretation.`);
    finite(result.hull.totalMassTonnes,`${family.key}/${level.key} total mass`);
    finite(result.hull.baselineMassTonnes,`${family.key}/${level.key} baseline mass`);
    finite(result.hull.totalVolumeM3,`${family.key}/${level.key} total volume`);
    finite(result.hull.lengthM,`${family.key}/${level.key} hull length`);
    finite(result.drive.apparatusMassTonnes,`${family.key}/${level.key} drive mass`);
    finite(result.drive.driveFractionPercent,`${family.key}/${level.key} drive fraction`);
    finite(result.power.continuousPowerW,`${family.key}/${level.key} continuous power`);
    finite(result.power.peakPowerW,`${family.key}/${level.key} peak power`);
    finite(result.fuel.totalFuelSystemTonnes,`${family.key}/${level.key} fuel system`);
    finite(result.thermal.totalThermalTonnes,`${family.key}/${level.key} thermal system`);
    finite(result.lifeSupport.massTonnes,`${family.key}/${level.key} life support`);
    finite(result.protection.shieldMassTonnes,`${family.key}/${level.key} shielding`);
    finite(result.navigation.independentSensorMassTonnes,`${family.key}/${level.key} navigation`);
    finite(result.maintenance.totalMaintenanceTonnes,`${family.key}/${level.key} maintenance`);
    for(const [field,value] of Object.entries(result.designPhilosophy.globalResults))if(typeof value==='number')finite(value,`${family.key}/${level.key} philosophy ${field}`);
    if(result.hull.totalMassTonnes<=0||result.hull.totalVolumeM3<=0)fail(`${family.key}/${level.key} produced a non-positive hull.`);
    if(result.drive.driveFractionPercent<=0||result.drive.driveFractionPercent>100)fail(`${family.key}/${level.key} produced invalid drive share ${result.drive.driveFractionPercent}.`);
    if(!result.hull.massBudget.length||result.hull.massBudget.some(row=>!Number.isFinite(row.massTonnes)||row.massTonnes<0))fail(`${family.key}/${level.key} has an invalid mass ledger.`);
    const ledger=result.hull.massBudget.reduce((total,row)=>total+row.massTonnes,0);
    close(ledger,result.hull.totalMassTonnes,1e-10,`${family.key}/${level.key} mass balance`);
    if(result.designPhilosophy.baselineMassBudget.length!==result.hull.massBudget.length)fail(`${family.key}/${level.key} did not preserve the baseline ledger.`);
    if(result.designPhilosophy.moduleAssignments.length!==result.hull.massBudget.length)fail(`${family.key}/${level.key} module assignment count differs from mass ledger.`);
    if(!result.designPhilosophy.attachmentValidation.valid)fail(`${family.key}/${level.key} generated an invalid hardpoint parent.`);
    for(const module of result.designPhilosophy.moduleAssignments){
      if(!['INTERNAL','EVA'].includes(module.envelope))fail(`${family.key}/${level.key}/${module.key} has invalid envelope ${module.envelope}.`);
      const required=module.envelope==='INTERNAL'?'ATMOSPHERE_MANIFOLD':'VACUUM_EXPOSED';
      if(module.attachment.requiredProperty!==required||!module.attachment.parentProperties.includes(required))fail(`${family.key}/${level.key}/${module.key} violates ${required} attachment routing.`);
      const expected=module.envelope==='INTERNAL'?vessel.designPhilosophies.INTERNAL:vessel.designPhilosophies.EVA;
      close(module.modifiers.massMultiplier,expected.massMultiplier,1e-12,`${family.key}/${level.key}/${module.key} mass modifier`);
      close(module.modifiers.volumeMultiplier,expected.volumeMultiplier,1e-12,`${family.key}/${level.key}/${module.key} volume modifier`);
    }
    const left=structuredClone(result),right=structuredClone(replay);delete left.generatedAt;delete right.generatedAt;
    if(JSON.stringify(left)!==JSON.stringify(right))fail(`${family.key}/${level.key} is not deterministic outside generatedAt.`);
  }
}

const forcedBase={family:'metric-envelope',pathLevel:'p4',role:'explorer',biologyProfile:'human-standard',defense:'hardened',manufacturerProfile:'CORP_LOGISTICS',crew:32,enduranceDays:180,reserveJumps:3,distanceLy:4,payloadTonnes:''};
const forcedInternal=vessel.generate('validation:forced-internal',{...forcedBase,designEnvelope:'INTERNAL'},null);
const forcedEva=vessel.generate('validation:forced-eva',{...forcedBase,designEnvelope:'EVA'},null);
if(forcedInternal.designPhilosophy.classification!=='INTERNAL'||forcedInternal.designPhilosophy.requestedEnvelope!=='INTERNAL')fail('Forced Internals-first core did not resolve as an INTERNAL vessel.');
if(forcedEva.designPhilosophy.classification!=='EVA'||forcedEva.designPhilosophy.requestedEnvelope!=='EVA')fail('Forced EVA-first core did not resolve as an EVA vessel.');
if(!forcedInternal.designPhilosophy.moduleAssignments.some(module=>module.envelope==='INTERNAL'))fail('Internals-first core produced no INTERNAL modules.');
if(!forcedEva.designPhilosophy.moduleAssignments.some(module=>module.envelope==='EVA'))fail('EVA-first core produced no EVA modules.');
if(forcedInternal.hull.totalMassTonnes<=forcedEva.hull.totalMassTonnes)fail('Internals-first hull should be heavier than the same forced EVA-first baseline.');
if(forcedInternal.hull.totalVolumeM3<=forcedEva.hull.totalVolumeM3)fail('Internals-first hull should occupy more volume than the same forced EVA-first baseline.');
if(forcedInternal.designPhilosophy.globalResults.repairTimeMultiplier<=forcedEva.designPhilosophy.globalResults.repairTimeMultiplier)fail('Internals-first repair burden should exceed EVA-first burden.');
if(forcedInternal.designPhilosophy.globalResults.thermalSignatureMultiplier>=forcedEva.designPhilosophy.globalResults.thermalSignatureMultiplier)fail('Internals-first thermal signature should be lower than EVA-first signature.');

const ammoniaSource={type:'biology',dossier:{seed:'alien-source',system:{life:'living'},species:{name:'Kheari Assemblies',environment:'icebound cryosphere',bodyPlan:'segmented crawler',chemistry:'carbon-ammonia biochemistry',adaptation:'temperature-switching biochemistry',size:'2.4 m typical adult span'},civilization:{government:'theocratic archive state',economy:'state-directed heavy industry',warfare:'defensive orbital denial'}}};
const inheritedBiology=vessel.generate('validation:biology',{family:'metric-envelope',pathLevel:'p4',role:'science',biologyProfile:'inherit',defense:'hardened',manufacturerProfile:'inherit',crew:24,enduranceDays:240,reserveJumps:3,distanceLy:4,payloadTonnes:''},ammoniaSource);
if(inheritedBiology.lifeSupport.profile.key!=='ammonia')fail(`Inherited ammonia biology resolved as ${inheritedBiology.lifeSupport.profile.key}.`);
if(!inheritedBiology.source.inheritedBiology)fail('Inherited biology was not recorded in source provenance.');
if(inheritedBiology.designation.originSpecies!=='Kheari Assemblies')fail('Originating species was not preserved in the designation record.');

const sourceDrive=globalThis.BlacklightExoFTL.generate('validation:source-drive',{family:'fold-jump',pathLevel:'p3',scale:'capital',infrastructure:'self-contained',route:'deep-space',doctrine:'balanced',energy:'random',distance:3,distanceUnit:'ly'},null);
const inheritedDrive=vessel.generate('validation:inherited-drive',{family:'inherit',pathLevel:'inherit',role:'explorer',biologyProfile:'human-standard',defense:'hardened',manufacturerProfile:'VOID_NOMAD',crew:30,enduranceDays:180,reserveJumps:2,distanceLy:3,payloadTonnes:''},{type:'ftl',ftl:sourceDrive});
if(inheritedDrive.drive.familyKey!=='fold-jump'||inheritedDrive.drive.pathLevelKey!=='p3')fail('Inherited FTL architecture was not preserved.');
if(!inheritedDrive.source.inheritedDrive)fail('Inherited FTL provenance was not recorded.');
if(Math.abs(inheritedDrive.designPhilosophy.baselineMassBudget.find(row=>row.key==='drive').massTonnes-sourceDrive.constructionAssembly.totalApparatusMassTonnes)>1e-9)fail('Baseline vessel drive mass does not inherit the FTL construction assembly mass.');

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-path-level-controller.js','blacklight-exo-ftl-mechanism-runtime.js','blacklight-exo-ftl-assembly-runtime.js','blacklight-exo-ftl-calculation-runtime.js','blacklight-exo-ftl-certification-runtime.js','blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-philosophy-definitions.js','blacklight-exo-vessel-philosophy-runtime.js','blacklight-exo-vessel-ui.js','blacklight-exo-vessel-philosophy-ui.js'];
let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=prior)fail(`Vessel page loads ${marker} out of order.`);prior=index;}
if(!page.includes('blacklight-exo-vessel-philosophy.css'))fail('Vessel page does not load philosophy presentation.');
for(const id of ['exo-vessel-family','exo-vessel-path','exo-vessel-role','exo-vessel-biology','exo-vessel-defense','exo-vessel-mass-body','exo-vessel-drive-grid','exo-vessel-power-grid','exo-vessel-life-grid','exo-vessel-protection-grid','exo-vessel-maintenance-grid'])if(!page.includes(`id="${id}"`))fail(`Vessel page is missing #${id}.`);
const philosophyUi=await fs.readFile(path.join(root,'blacklight-exo-vessel-philosophy-ui.js'),'utf8');
for(const id of ['exo-vessel-archetype','exo-vessel-envelope','exo-vessel-designation-grid','exo-vessel-philosophy-comparison','exo-vessel-philosophy-body','exo-vessel-germination-grid'])if(!philosophyUi.includes(id))fail(`Vessel philosophy interface is missing ${id}.`);

console.log('EXO vessel engineering validation passed.');
console.log(`Validated ${cases} FTL-family/Path combinations with rotating vessel roles, biology profiles, protection doctrines, and manufacturer archetypes.`);
console.log('Validated Internals-first and EVA-first actuary modifiers, core-envelope routing, designation records, immutable inventory floors, hardpoint-parent rules, inherited alien biology, inherited drive mass, deterministic replay, mass balance, and page loader order.');
