import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const matrixPath=path.resolve(root,process.argv[2]||'artifacts/exo-vessel-balance-matrix.json');
const engagementPath=path.resolve(root,process.argv[3]||'artifacts/exo-vessel-engagement-simulation.json');
const fail=message=>{throw new Error(message);};
const readJson=async filename=>JSON.parse(await fs.readFile(filename,'utf8'));
const hasNull=value=>value===null||(Array.isArray(value)?value.some(hasNull):value&&typeof value==='object'?Object.values(value).some(hasNull):false);
const unique=values=>[...new Set(values)];

const matrix=await readJson(matrixPath),engagement=await readJson(engagementPath);
const matrixSchema=await readJson(path.join(root,'data/schemas/exo-vessel-balance-matrix.schema.json'));
const engagementSchema=await readJson(path.join(root,'data/schemas/exo-vessel-engagement-simulation.schema.json'));
if(matrix.recordType!=='blacklightExoVesselBalanceMatrix'||matrix.schemaVersion!=='1.0.0'||matrix.phase!=='VESSEL-11'||matrix.registry!=='data/exo-vessel/validation-matrix-registry.json')fail('Emitted VESSEL-11 matrix identity is invalid.');
if(matrixSchema.properties?.recordType?.const!==matrix.recordType||matrixSchema.properties?.phase?.const!==matrix.phase)fail('Emitted matrix diverges from its schema identity.');
if(matrix.validation?.valid!==true||matrix.validation?.violations?.length)fail(`Emitted matrix is invalid: ${(matrix.validation?.violations||[]).join('; ')}`);
if(matrix.cases?.length<63||matrix.aggregate?.caseCount!==matrix.cases.length||matrix.aggregate?.validCaseCount!==matrix.cases.length||matrix.aggregate?.invalidCaseCount!==0)fail('Emitted matrix case totals do not close.');
if(matrix.cases.some(item=>item.valid!==true||item.violations?.length))fail('Emitted matrix contains an invalid case.');
if(unique(matrix.cases.map(item=>item.inputs?.family)).length!==9||unique(matrix.cases.map(item=>item.inputs?.pathLevel)).length!==7)fail('Emitted matrix does not cover nine FTL families and seven Path levels.');
if(Object.keys(matrix.aggregate?.topologyCounts||{}).length!==5||matrix.validation?.observedTopologyCount!==5)fail('Emitted matrix does not cover all five topology policies.');
if(matrix.validation?.deterministicReplayCases!==9)fail('Emitted matrix lacks one deterministic replay per FTL family.');
for(const item of matrix.cases){if(item.counts?.modules!==item.counts?.placements)fail(`${item.caseId} module and placement totals diverge.`);if(Math.abs(Number(item.closure?.massLedgerErrorTonnes)||0)>Math.max(1,Number(item.identity?.totalMassTonnes)||0)*1e-9)fail(`${item.caseId} mass ledger does not close.`);if(Object.values(item.statistics||{}).some(value=>!Number.isFinite(value)||value<0||value>100))fail(`${item.caseId} contains an invalid normalized statistic.`);}
if(hasNull(matrix))fail('Emitted matrix contains null values; a non-finite report value was serialized.');

if(engagement.recordType!=='blacklightExoVesselEngagementSimulation'||engagement.schemaVersion!=='1.0.0'||engagement.phase!=='VESSEL-11'||engagement.registry!=='data/exo-vessel/engagement-simulation-registry.json')fail('Emitted VESSEL-11 engagement report identity is invalid.');
if(engagementSchema.properties?.recordType?.const!==engagement.recordType||engagementSchema.properties?.phase?.const!==engagement.phase)fail('Emitted engagement report diverges from its schema identity.');
if(engagement.validation?.valid!==true||engagement.validation?.violations?.length)fail(`Emitted engagement report is invalid: ${(engagement.validation?.violations||[]).join('; ')}`);
if(engagement.representatives?.length!==9||unique(engagement.representatives.map(item=>item.weaponFamily)).length!==9)fail('Emitted engagement report lacks nine unique weapon-family representatives.');
if(engagement.states?.length!==144||engagement.aggregate?.stateCount!==144||engagement.validation?.stateCount!==144)fail('Emitted engagement state total is not 144.');
if(engagement.aggregate?.trialCount!==9216||engagement.validation?.trialCount!==9216)fail('Emitted engagement trial total is not 9,216.');
if(engagement.validation?.deterministicReplayPassed!==true)fail('Emitted engagement report failed deterministic replay.');
if(engagement.validation?.dominantWeaponFamily!==null)fail(`${engagement.validation.dominantWeaponFamily} dominates every comparable state.`);
for(const state of engagement.states){if(state.trials!==64)fail(`${state.stateId} does not contain 64 trials.`);const total=Object.values(state.outcomes||{}).reduce((sum,value)=>sum+Number(value||0),0);if(total!==64)fail(`${state.stateId} outcome counts total ${total}, not 64.`);for(const key of ['meanImpactProbabilityPercent','observedImpactRatePercent','meanRetainedEnergyPercent','meanReadinessLossPercent'])if(!Number.isFinite(state[key])||state[key]<0||state[key]>100)fail(`${state.stateId}/${key} is invalid.`);if(!Number.isFinite(state.balanceScore)||state.balanceScore<0)fail(`${state.stateId} balance score is invalid.`);}
const outcomeTotal=Object.values(engagement.aggregate?.outcomeTotals||{}).reduce((sum,value)=>sum+Number(value||0),0);if(outcomeTotal!==9216)fail(`Aggregate engagement outcomes total ${outcomeTotal}, not 9,216.`);
if(hasNull(engagement))fail('Emitted engagement report contains null values; a non-finite report value was serialized.');
const matrixFile=await fs.stat(matrixPath),engagementFile=await fs.stat(engagementPath);if(matrixFile.size<10000||engagementFile.size<10000)fail('VESSEL-11 reports are unexpectedly small and likely incomplete.');

console.log('Emitted VESSEL-11 balance reports passed validation.');
console.log(`Matrix ${matrix.cases.length} cases / ${Object.keys(matrix.aggregate.topologyCounts).length} topologies; engagement ${engagement.states.length} states / ${engagement.aggregate.trialCount} trials / ${engagement.aggregate.comparableStateCount} comparable states; no universal weapon-family winner.`);
