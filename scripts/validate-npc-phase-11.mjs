import { runPhase11Validation } from './npc-phase-11-validation-runner.mjs';

const result=runPhase11Validation();
if(!result.valid){
  console.error('NPC Phase 11 validation failed:');
  result.failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}
console.log('NPC Phase 11 validation passed.');
console.log(`Custom profiles generated: ${result.profilesGenerated}`);
console.log(`Deterministic Deep repeats: ${result.deterministicRepeats}`);
console.log(`Invalid packs rejected: ${result.invalidCases}`);
console.log(`Storage checks passed: ${result.storageChecks}`);
