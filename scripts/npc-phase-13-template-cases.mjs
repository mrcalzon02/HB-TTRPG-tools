import {
  fixture,GroupData,templateDocument,tableDocument,ledger,clone,setPath
} from './npc-phase-13-validation-fixture.mjs';
import { assertStaticContracts } from './npc-phase-13-validation-assertions.mjs';

export function runTemplateCases(){
  const failures=[];
  const fail=message=>failures.push(message);
  assertStaticContracts(fail);
  let invalidCases=0;

  for(const testCase of fixture.invalidTemplateCases){
    const mutated=clone(templateDocument);
    const targetId=testCase.id==='minimum-overflow'?'squad':'household';
    const template=mutated.templates.find(entry=>entry.id===targetId);
    setPath(template,testCase.mutation,testCase.value);
    const result=GroupData.normalize(mutated,tableDocument);
    const codes=new Set(result.diagnostics.map(item=>item.code));
    invalidCases+=1;
    if(result.valid)fail(`${testCase.id}: malformed template document was accepted.`);
    if(!codes.has(testCase.expectedCode))fail(`${testCase.id}: expected ${testCase.expectedCode}; received ${[...codes].join(', ')}.`);
  }

  if(invalidCases!==fixture.invalidTemplateCases.length)fail('Not every malformed template case was executed.');
  if(ledger.activeBranch!=='main')fail('Phase ledger must retain main as the only active branch.');
  if(ledger.activePhaseId!=='phase-13-roster-group-generation')fail('Phase 13 must be active.');
  if(ledger.lastCompletedPhaseId!=='phase-12-kaysender-adapter')fail('Phase 12 must be the last completed phase.');
  return{failures,invalidCases};
}
