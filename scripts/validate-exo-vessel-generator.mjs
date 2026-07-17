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
  'blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js'
];
const fail=message=>{throw new Error(message);};
const finite=(value,label)=>{if(!Number.isFinite(Number(value)))fail(`${label} is not finite: ${value}`);return Number(value);};
const close=(a,b,tolerance,label)=>{const error=Math.abs(a-b)/Math.max(1,Math.abs(b));if(error>tolerance)fail(`${label} differs by ${(error*100).toFixed(8)}%.`);};

globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
for(const filename of files){const source=await fs.readFile(path.join(root,filename),'utf8');new vm.Script(source,{filename}).runInThisContext();}

const vessel=globalThis.BlacklightExoVessel;
if(!vessel)fail('BlacklightExoVessel did not initialize.');
if(vessel.roles.length!==8)fail(`Expected 8 vessel roles; found ${vessel.roles.length}.`);
if(vessel.biologyProfiles.length!==9)fail(`Expected 9 biology profiles; found ${vessel.biologyProfiles.length}.`);
if(vessel.defenses.length!==3)fail(`Expected 3 protection doctrines; found ${vessel.defenses.length}.`);
const families=globalThis.BlacklightExoFTL.families||[];
const levels=globalThis.BlacklightExoFTL.pathLevels||[];
if(families.length!==9||levels.length!==7)fail(`Expected 9 FTL families and 7 Path levels; found ${families.length} and ${levels.length}.`);

let cases=0;
for(const family of families){
  for(const level of levels){
    const role=vessel.roles[cases%vessel.roles.length];
    const biology=vessel.biologyProfiles[cases%vessel.biologyProfiles.length];
    const defense=vessel.defenses[cases%vessel.defenses.length];
    const input={family:family.key,pathLevel:level.key,role:role.key,biologyProfile:biology.key,defense:defense.key,crew:8+(cases%73),enduranceDays:30+(cases%11)*45,reserveJumps:1+(cases%5),distanceLy:.25+(cases%13)*1.7,payloadTonnes:''};
    const result=vessel.generate(`validation:${family.key}:${level.key}`,input,null);
    const replay=vessel.generate(`validation:${family.key}:${level.key}`,input,null);
    cases+=1;
    if(result.drive.familyKey!==family.key)fail(`${family.key}/${level.key} lost requested FTL family and resolved ${result.drive.familyKey}.`);
    if(result.drive.pathLevelKey!==level.key)fail(`${family.key}/${level.key} lost requested Path level and resolved ${result.drive.pathLevelKey}.`);
    if(result.identity.roleKey!==role.key)fail(`${family.key}/${level.key} lost requested role.`);
    if(result.lifeSupport.profile.key!==biology.key)fail(`${family.key}/${level.key} lost requested biology profile.`);
    finite(result.hull.totalMassTonnes,`${family.key}/${level.key} total mass`);
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
    if(result.hull.totalMassTonnes<=0||result.hull.totalVolumeM3<=0)fail(`${family.key}/${level.key} produced a non-positive hull.`);
    if(result.drive.driveFractionPercent<=0||result.drive.driveFractionPercent>100)fail(`${family.key}/${level.key} produced invalid drive share ${result.drive.driveFractionPercent}.`);
    if(!result.hull.massBudget.length||result.hull.massBudget.some(row=>!Number.isFinite(row.massTonnes)||row.massTonnes<0))fail(`${family.key}/${level.key} has an invalid mass ledger.`);
    const ledger=result.hull.massBudget.reduce((total,row)=>total+row.massTonnes,0);
    close(ledger,result.hull.totalMassTonnes,1e-10,`${family.key}/${level.key} mass balance`);
    const left=structuredClone(result),right=structuredClone(replay);delete left.generatedAt;delete right.generatedAt;
    if(JSON.stringify(left)!==JSON.stringify(right))fail(`${family.key}/${level.key} is not deterministic outside generatedAt.`);
  }
}

const ammoniaSource={type:'biology',dossier:{seed:'alien-source',system:{life:'living'},species:{name:'Kheari Assemblies',environment:'icebound cryosphere',bodyPlan:'segmented crawler',chemistry:'carbon-ammonia biochemistry',adaptation:'temperature-switching biochemistry',size:'2.4 m typical adult span'}}};
const inheritedBiology=vessel.generate('validation:biology',{family:'metric-envelope',pathLevel:'p4',role:'science',biologyProfile:'inherit',defense:'hardened',crew:24,enduranceDays:240,reserveJumps:3,distanceLy:4,payloadTonnes:''},ammoniaSource);
if(inheritedBiology.lifeSupport.profile.key!=='ammonia')fail(`Inherited ammonia biology resolved as ${inheritedBiology.lifeSupport.profile.key}.`);
if(!inheritedBiology.source.inheritedBiology)fail('Inherited biology was not recorded in source provenance.');

const sourceDrive=globalThis.BlacklightExoFTL.generate('validation:source-drive',{family:'fold-jump',pathLevel:'p3',scale:'capital',infrastructure:'self-contained',route:'deep-space',doctrine:'balanced',energy:'random',distance:3,distanceUnit:'ly'},null);
const inheritedDrive=vessel.generate('validation:inherited-drive',{family:'inherit',pathLevel:'inherit',role:'explorer',biologyProfile:'human-standard',defense:'hardened',crew:30,enduranceDays:180,reserveJumps:2,distanceLy:3,payloadTonnes:''},{type:'ftl',ftl:sourceDrive});
if(inheritedDrive.drive.familyKey!=='fold-jump'||inheritedDrive.drive.pathLevelKey!=='p3')fail('Inherited FTL architecture was not preserved.');
if(!inheritedDrive.source.inheritedDrive)fail('Inherited FTL provenance was not recorded.');
if(Math.abs(inheritedDrive.drive.apparatusMassTonnes-sourceDrive.constructionAssembly.totalApparatusMassTonnes)>1e-9)fail('Vessel drive mass does not inherit the FTL construction assembly mass.');

const page=await fs.readFile(path.join(root,'blacklight-exo-vessel.html'),'utf8');
const order=['blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-path-level-controller.js','blacklight-exo-ftl-mechanism-runtime.js','blacklight-exo-ftl-assembly-runtime.js','blacklight-exo-ftl-calculation-runtime.js','blacklight-exo-ftl-certification-runtime.js','blacklight-exo-vessel-definitions.js','blacklight-exo-vessel-biology.js','blacklight-exo-vessel-core.js','blacklight-exo-vessel-ui.js'];
let prior=-1;for(const marker of order){const index=page.indexOf(marker);if(index<0)fail(`Vessel page does not load ${marker}.`);if(index<=prior)fail(`Vessel page loads ${marker} out of order.`);prior=index;}
for(const id of ['exo-vessel-family','exo-vessel-path','exo-vessel-role','exo-vessel-biology','exo-vessel-defense','exo-vessel-mass-body','exo-vessel-drive-grid','exo-vessel-power-grid','exo-vessel-life-grid','exo-vessel-protection-grid','exo-vessel-maintenance-grid'])if(!page.includes(`id="${id}"`))fail(`Vessel page is missing #${id}.`);

console.log('EXO vessel engineering validation passed.');
console.log(`Validated ${cases} FTL-family/Path combinations with rotating vessel roles, biology profiles, and protection doctrines.`);
console.log('Validated inherited alien biology, inherited construction-assembly drive mass, deterministic replay, mass balance, finite hull-power-fuel-thermal-navigation-maintenance outputs, and page loader order.');
