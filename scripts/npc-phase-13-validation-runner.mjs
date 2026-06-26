import { runGroupCases } from './npc-phase-13-group-cases.mjs';
import { runTemplateCases } from './npc-phase-13-template-cases.mjs';

export function runPhase13Validation(){
  const groups=runGroupCases();
  const templates=runTemplateCases();
  const failures=[...groups.failures,...templates.failures];
  return{
    valid:failures.length===0,
    failures,
    groupsGenerated:groups.groupsGenerated,
    membersGenerated:groups.membersGenerated,
    relationshipsGenerated:groups.relationshipsGenerated,
    deterministicPairs:groups.deterministicPairs,
    boundaryGroups:groups.boundaryGroups,
    invalidCases:templates.invalidCases
  };
}
