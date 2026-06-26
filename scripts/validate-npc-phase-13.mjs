import { runPhase13Validation } from './npc-phase-13-validation-runner.mjs';

const result=runPhase13Validation();
if(!result.valid){
  console.error('NPC Phase 13 validation failed:');
  result.failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}
console.log('NPC Phase 13 validation passed.');
console.log(`Groups generated: ${result.groupsGenerated}`);
console.log(`Members generated: ${result.membersGenerated}`);
console.log(`Relationships generated: ${result.relationshipsGenerated}`);
console.log(`Deterministic pairs verified: ${result.deterministicPairs}`);
console.log(`Boundary groups verified: ${result.boundaryGroups}`);
console.log(`Invalid templates rejected: ${result.invalidCases}`);
