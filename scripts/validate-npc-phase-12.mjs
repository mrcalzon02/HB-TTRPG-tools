import { runPhase12Validation } from './npc-phase-12-validation-runner.mjs';

const result=runPhase12Validation();
if(!result.valid){
  console.error('NPC Phase 12 validation failed:');
  result.failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}
console.log('NPC Phase 12 validation passed.');
console.log(`Legacy records generated: ${result.recordsGenerated}`);
console.log(`Universal profiles converted: ${result.profilesConverted}`);
console.log(`Deterministic pairs verified: ${result.deterministicPairs}`);
console.log(`Control cases verified: ${result.controlCases}`);
console.log(`Legacy imports verified: ${result.importCases}`);
