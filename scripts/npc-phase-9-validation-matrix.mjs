import {
  Rules,Foundation,fixture,policies,ledger,pack,packageCount,
  mechanicsData,withoutMechanics,generate
} from './npc-phase-9-validation-fixture.mjs';
import {
  same,validatePackageReferences,validateLight,validateFull,compareLightAndFull
} from './npc-phase-9-validation-assertions.mjs';

export function executePhase9Matrix(){
  const failures=[];
  const fail=message=>failures.push(message);
  const packageIds=validatePackageReferences(fail);
  if(packageCount!==fixture.archetypeIds.length)fail(`Package count ${packageCount} does not match ${fixture.archetypeIds.length}.`);
  if(!same(packageIds,[...fixture.archetypeIds].sort()))fail(`Package coverage mismatch: ${packageIds.join(', ')}.`);
  let generated=0,deterministicRepeats=0,rerollChanges=0;

  for(const archetypeId of fixture.archetypeIds){
    const resolved=Rules.resolveArchetype(archetypeId,policies.archetypes);
    if(!resolved.valid){fail(`${archetypeId}: archetype resolution failed.`);continue;}
    const pkg=pack.mechanicalPackages[archetypeId];

    for(let index=0;index<fixture.seedsPerArchetype;index+=1){
      const seed=`phase9:${archetypeId}:${index}`;
      const profiles={};
      for(const mode of fixture.modes){
        const result=generate(resolved.archetype,seed,mode);
        generated+=1;
        const id=`${archetypeId} ${mode} ${index}`;
        if(!result.valid||!result.profile){fail(`${id}: generation failed with ${result.diagnostics.map(item=>item.code).join(', ')}.`);continue;}
        const nonInfo=result.diagnostics.filter(item=>item.severity!=='info');
        if(nonInfo.length)fail(`${id}: diagnostics ${nonInfo.map(item=>item.code).join(', ')}.`);
        profiles[mode]=result.profile;
        if(result.profile.generator.mechanicalMode!==mode)fail(`${id}: receipt mode is incorrect.`);

        if(mode==='none'){
          if(result.profile.sections.mechanics?.state!=='none')fail(`${id}: narrative mechanics state is not none.`);
          if(!Rules.validateProfileAgainstArchetype(result.profile,resolved.archetype).valid)fail(`${id}: narrative-only validation failed.`);
          continue;
        }

        const data=mechanicsData(result.profile);
        if(result.profile.sections.mechanics?.state!=='present'||!data){fail(`${id}: mechanics section is absent.`);continue;}
        if(data.mechanicalMode!==mode)fail(`${id}: section mode ${data.mechanicalMode} does not match ${mode}.`);
        validateLight(data,pkg,id,fail);
        if(mode==='open-d20-light'){
          for(const field of fixture.fullOnlyFields)if(field in data)fail(`${id}: Full-only field ${field} appears in Light mode.`);
        }else{
          validateFull(data,pkg,id,fail);
        }
      }

      const light=mechanicsData(profiles['open-d20-light']);
      const full=mechanicsData(profiles['open-d20-full']);
      if(light&&full)compareLightAndFull(light,full,`${archetypeId} ${index}`,fail);
      if(profiles['open-d20-full']){
        const repeat=generate(resolved.archetype,seed,'open-d20-full');
        deterministicRepeats+=1;
        if(!same(profiles['open-d20-full'],repeat.profile))fail(`${archetypeId} ${index}: Full mechanics are not deterministic.`);
      }
    }

    const range=pack.mechanicalLevelGuidance[archetypeId];
    const exact=generate(resolved.archetype,`phase9:exact:${archetypeId}`,'open-d20-full',{levelMode:'exact',level:range[1]+10});
    if(mechanicsData(exact.profile)?.level!==range[1])fail(`${archetypeId}: exact level did not clamp to ${range[1]}.`);
    if(!exact.diagnostics.some(item=>item.code==='MECHANICS_LEVEL_CLAMPED'&&item.severity==='info'))fail(`${archetypeId}: clamp diagnostic is missing.`);

    const seed=`phase9:reroll:${archetypeId}`;
    const original=generate(resolved.archetype,seed,'open-d20-full');
    let changed=false;
    for(let counter=1;counter<=6&&!changed;counter+=1){
      const rerolled=generate(resolved.archetype,seed,'open-d20-full',{}, {
        previousProfile:original.profile,
        locks:['/sections/mechanics/data/level'],
        rerollCounters:{mechanics:counter}
      });
      if(rerolled.profile.sections.mechanics.data.level!==original.profile.sections.mechanics.data.level)fail(`${archetypeId}: locked level was not preserved.`);
      if(!same(withoutMechanics(rerolled.profile),withoutMechanics(original.profile)))fail(`${archetypeId}: mechanics reroll changed unrelated sections.`);
      changed=!same(rerolled.profile.sections.mechanics,original.profile.sections.mechanics);
    }
    if(changed)rerollChanges+=1;else fail(`${archetypeId}: mechanics reroll produced no change after six counters.`);
  }

  const expected=fixture.archetypeIds.length*fixture.seedsPerArchetype*fixture.modes.length;
  if(generated!==expected)fail(`Generated ${generated} profiles; expected ${expected}.`);
  if(ledger.activeBranch!=='main')fail('Phase ledger must retain main as the only active branch.');
  if(ledger.activePhaseId!=='phase-9-mechanical-profile-generation')fail('Phase 9 must be active.');
  if(ledger.lastCompletedPhaseId!=='phase-8-archetype-specific-modules')fail('Phase 8 must be the last completed phase.');

  return{valid:failures.length===0,failures,packageCount:packageIds.length,generated,deterministicRepeats,rerollChanges};
}
