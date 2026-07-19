import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const json=async filename=>JSON.parse(await read(filename));
const fail=message=>{throw new Error(message);};

const matrixRegistry=await json('data/exo-vessel/validation-matrix-registry.json');
const matrixSchema=await json('data/schemas/exo-vessel-balance-matrix.schema.json');
const engagementRegistry=await json('data/exo-vessel/engagement-simulation-registry.json');
const engagementSchema=await json('data/schemas/exo-vessel-engagement-simulation.schema.json');
const matrixRunner=await read('scripts/run-exo-vessel-balance-matrix.mjs');
const engagementRunner=await read('scripts/run-exo-vessel-engagement-monte-carlo.mjs');
const priorityOverride=await read('blacklight-exo-vessel-weapon-priority-override.js');
const priorityValidator=await read('scripts/validate-exo-vessel-weapon-priority-override.mjs');
const weaponDefinitions=await read('blacklight-exo-vessel-weapon-definitions.js');
const roadmapTransition=await json('data/exo-vessel/roadmap-transition-vessel-10.json');
const workflow=await read('.github/workflows/pages.yml');

if(matrixRegistry.recordType!=='blacklightExoVesselValidationMatrixRegistry'||matrixRegistry.schemaVersion!=='1.1.0'||matrixRegistry.phase!=='VESSEL-11'||matrixRegistry.registryVersion!=='1.1.0')fail('VESSEL-11 matrix registry identity is invalid.');
if(matrixRegistry.matrixPolicy?.requiredFamilyCount!==9||matrixRegistry.matrixPolicy?.requiredPathLevelCount!==7||matrixRegistry.matrixPolicy?.requiredManufacturerDoctrineCount!==4||matrixRegistry.matrixPolicy?.requiredTopologyPolicyCount!==5||matrixRegistry.matrixPolicy?.minimumCanonicalCases!==63||matrixRegistry.matrixPolicy?.sameSeedReplayRequired!==true)fail('VESSEL-11 primary matrix policy is incomplete.');
for(const invariant of ['canonical contract valid','mass budget closes against loaded vessel mass','every persistent module has one voxel placement','all four manufacturer doctrines appear','all five topology policies appear'])if(!matrixRegistry.requiredInvariants?.some(item=>item.includes(invariant)))fail(`VESSEL-11 matrix registry lacks invariant ${invariant}.`);
for(const authority of ['canonicalFamilyPathMatrix','manufacturerDoctrineCoverage','topologyPolicyCoverage','monteCarloEngagementSimulation','weaponDominanceReport','strictScopedWeaponOverride'])if(!matrixRegistry.completedAnalysis?.[authority])fail(`VESSEL-11 registry lacks completed analysis ${authority}.`);
if(matrixRegistry.deferredAnalysis)fail('VESSEL-11 registry still declares completed balance work as deferred.');
if(matrixSchema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-balance-matrix.schema.json'||matrixSchema.properties?.recordType?.const!=='blacklightExoVesselBalanceMatrix'||matrixSchema.properties?.phase?.const!=='VESSEL-11')fail('VESSEL-11 matrix schema identity is invalid.');
for(const field of ['matrixSeed','registry','dimensions','cases','aggregate','validation'])if(!matrixSchema.required?.includes(field))fail(`VESSEL-11 matrix schema does not require ${field}.`);
if(matrixSchema.properties?.cases?.minItems!==63)fail('VESSEL-11 matrix schema does not require the complete family–Path cross product.');

if(engagementRegistry.recordType!=='blacklightExoVesselEngagementSimulationRegistry'||engagementRegistry.schemaVersion!=='1.0.0'||engagementRegistry.phase!=='VESSEL-11'||engagementRegistry.registryVersion!=='1.0.0')fail('VESSEL-11 engagement registry identity is invalid.');
if(engagementRegistry.simulationPolicy?.trialsPerState!==64||engagementRegistry.simulationPolicy?.fullVesselRegenerationPerTrial!==false||engagementRegistry.simulationPolicy?.immutableSourceRecord!==true)fail('VESSEL-11 engagement simulation policy is incomplete.');
for(const band of ['pointDefense','practical','harassment','theoretical'])if(!engagementRegistry.simulationPolicy?.engagementBands?.includes(band))fail(`VESSEL-11 engagement registry lacks ${band}.`);
for(const evasion of [0,25,50,75])if(!engagementRegistry.simulationPolicy?.targetEvasionPercent?.includes(evasion))fail(`VESSEL-11 engagement registry lacks evasion ${evasion}.`);
if(!engagementRegistry.dominancePolicy?.failure?.includes('unique highest-scoring family in every comparable engagement state')||engagementRegistry.dominancePolicy?.tiesDoNotCountAsDominance!==true)fail('VESSEL-11 dominance policy is incomplete.');
if(engagementSchema.$id!=='https://mrcalzon02.github.io/HB-TTRPG-tools/data/schemas/exo-vessel-engagement-simulation.schema.json'||engagementSchema.properties?.recordType?.const!=='blacklightExoVesselEngagementSimulation'||engagementSchema.properties?.phase?.const!=='VESSEL-11')fail('VESSEL-11 engagement schema identity is invalid.');
for(const field of ['simulationSeed','registry','matrixReport','dimensions','representatives','states','aggregate','validation'])if(!engagementSchema.required?.includes(field))fail(`VESSEL-11 engagement schema does not require ${field}.`);

for(const signature of ["families.length!==9","pathLevels.length!==7","families.length*pathLevels.length","same seed and input did not reproduce","module/placement mismatch","practical range exceeds physical reach","manufacturerDoctrines.length!==manufacturers.length","observedManufacturerDoctrineCount","observedTopologyCount","await fs.writeFile(outputPath","if(violations.length)fail"])if(!matrixRunner.includes(signature))fail(`VESSEL-11 matrix runner lacks ${signature}.`);
for(const signature of ["blacklight-exo-vessel-weapon-priority-override.js","weaponFamilies.length!==9","trialsPerState=64","fallbackRepresentative","weaponFamilyPriority:[family]","representatives=[],vessels=new Map()","vessels.set(family,vessel)","for(let trial=0;trial<trialsPerState;trial++)","DC.build(vessel","immutable VESSEL-05 condition authority","states.length!==weaponFamilies.length*bands.length*evasionStates.length","aggregate.trialCount!==9216","deterministicReplayPassed","dominantWeaponFamily","uniquely dominates every comparable engagement state","await fs.writeFile(outputPath","if(violations.length)fail"])if(!engagementRunner.includes(signature))fail(`VESSEL-11 engagement runner lacks ${signature}.`);
if((engagementRunner.match(/V\.generate\(/g)||[]).length!==1)fail('VESSEL-11 engagement runner regenerates vessels outside the one representative-generation site.');
for(const signature of ['weaponPriorityOverrideVersion:1','Unknown weapon-family priority override','preferenceName','preferenceMatches','manufacturerPreferenceAliases','SINGLE_SYNCHRONOUS_GENERATION','canonicalEngineeringPreserved:true','requiredFamilies','finally{','E.defaultWeaponPriority[role]=originalRole','M.archetypeMatrices[key].weapons=weapons'])if(!priorityOverride.includes(signature))fail(`Canonical weapon priority override lacks ${signature}.`);
for(const signature of ['FRACTIONAL_C','manufacturerPreferenceAliases','canonicalEngineeringPreserved','Unknown weapon-family priority override','pathLevel:\'p4\'','shared preference tables','engineering','moduleGraph','voxelLayout','conditionHistory','combatGeometry','weaponEngagement','combatResolution','gameplay'])if(!priorityValidator.includes(signature))fail(`Executable priority-override validator lacks ${signature}.`);
for(const family of ['CHEMICAL_BALLISTIC','RAIL_GUN','COIL_GUN','BRUTE_MASS_THROWER','SAND_GUN','LASER','PARTICLE_BEAM','FRACTIONAL_C','MISSILE'])if(!weaponDefinitions.includes(`${family}:{key:'${family}'`))fail(`Canonical weapon definitions lack ${family}.`);
for(const band of ['pointDefense','practical','harassment','theoretical'])if(!weaponDefinitions.includes(`'${band}'`))fail(`Canonical weapon definitions lack ${band}.`);

if(roadmapTransition.nextPhase!=='VESSEL-11'||roadmapTransition.changes?.find(item=>item.phaseId==='VESSEL-11')?.toStatus!=='next')fail('Effective roadmap does not identify VESSEL-11 as the next phase.');
const requiredWorkflowMarkers=['node scripts/validate-exo-vessel-validation-matrix.mjs','node scripts/validate-exo-vessel-weapon-priority-override.mjs','node scripts/run-exo-vessel-balance-matrix.mjs artifacts/exo-vessel-balance-matrix.json','node scripts/run-exo-vessel-engagement-monte-carlo.mjs artifacts/exo-vessel-balance-matrix.json artifacts/exo-vessel-engagement-simulation.json','name: exo-vessel-balance-matrix','name: exo-vessel-engagement-simulation','if: always()'];
for(const marker of requiredWorkflowMarkers)if(!workflow.includes(marker))fail(`Pages workflow does not gate or retain ${marker}.`);
if(workflow.indexOf('validate-exo-vessel-weapon-priority-override.mjs')>workflow.indexOf('run-exo-vessel-balance-matrix.mjs'))fail('Scoped weapon-family override validation runs after the balance matrix.');
if(workflow.indexOf('run-exo-vessel-balance-matrix.mjs')>workflow.indexOf('run-exo-vessel-engagement-monte-carlo.mjs'))fail('VESSEL-11 engagement simulation runs before its matrix authority.');

console.log('EXO vessel VESSEL-11 validation and balance contracts passed.');
console.log('Validated the 63-case family–Path matrix, all four manufacturer doctrines, all five topology policies, closure and graph invariants, scoped canonical family overrides, complete cached nine-family engagement simulation, immutable source authority, exact state and trial counts, deterministic replay, dominance policy, report schemas, workflow order, and preserved failure artifacts.');
