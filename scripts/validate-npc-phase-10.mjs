import { runPhase10Validation } from './npc-phase-10-validation-runner.mjs';

const result=runPhase10Validation();
if(!result.valid){
  console.error('NPC Phase 10 validation failed:');
  result.failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}
console.log('NPC Phase 10 validation passed.');
console.log(`Profiles round-tripped: ${result.roundTrips}`);
console.log(`Saved-library cap verified: ${result.savedCount}`);
console.log(`Regenerations verified: ${result.regenerations}`);
console.log(`Export documents verified: ${result.exports}`);
