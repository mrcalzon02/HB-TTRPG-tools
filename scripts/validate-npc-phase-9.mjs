import { runPhase9Validation } from './npc-phase-9-validation-runner.mjs';

const result = runPhase9Validation();
if (!result.valid) {
  console.error('NPC Phase 9 validation failed:');
  result.failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 9 validation passed.');
console.log(`Mechanical packages verified: ${result.packageCount}`);
console.log(`Profiles generated: ${result.generated}`);
console.log(`Deterministic Full repeats: ${result.deterministicRepeats}`);
console.log(`Mechanics reroll changes observed: ${result.rerollChanges}`);
