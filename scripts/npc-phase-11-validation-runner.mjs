import {
  Validator,Manager,PackStorage,fixture,validPack,invalidCases,ledger,
  basePack,baseArchetypes,MemoryStorage,clone,same,applyMutations,generateCustom
} from './npc-phase-11-validation-fixture.mjs';
import {
  assertStaticContracts,assertMergedPack,assertCustomProfile
} from './npc-phase-11-validation-assertions.mjs';

const describe=items=>(items||[]).map(item=>`${item.code}@${item.path||'/'}${item.tableId?`[${item.tableId}]`:''}`).join(', ');

function supportPack(){
  return{
    packType:'npcCustomPack',schemaVersion:'1.0.0',packId:'frostmarch-support',version:'1.0.0',
    title:'Frostmarch Support',description:'Adds names while depending on the Frostmarch campaign pack.',
    compatibility:{generatorMinVersion:'0.1.0',generatorMaxMajor:0,profileSchemaVersion:'1.0.0',basePackId:'generic-fantasy-core'},
    dependencies:[{packId:'frostmarch-campaign',minimumVersion:'1.0.0',optional:false}],
    names:{givenNames:['Ylva']}
  };
}

export function runPhase11Validation(){
  const failures=[];
  const fail=message=>failures.push(message);
  assertStaticContracts(fail);
  const basePackSnapshot=clone(basePack);
  const baseArchetypeSnapshot=clone(baseArchetypes);

  const validValidation=Validator.validateCustomPack(validPack,{basePack,baseArchetypes});
  if(!validValidation.valid)fail(`Valid fixture failed validation: ${describe(validValidation.diagnostics)}.`);
  const merged=Manager.applyCustomPack(basePack,baseArchetypes,validPack);
  if(!merged.valid)fail(`Valid fixture failed merge: ${describe(merged.diagnostics)}.`);
  if(!same(basePack,basePackSnapshot))fail('Applying a valid pack mutated the base pack.');
  if(!same(baseArchetypes,baseArchetypeSnapshot))fail('Applying a valid pack mutated base archetypes.');
  if(merged.valid)assertMergedPack(merged,validPack,fail);

  let profilesGenerated=0;
  let deterministicRepeats=0;
  if(merged.valid){
    for(const depth of fixture.depths){
      for(let index=0;index<fixture.seedsPerDepth;index+=1){
        const seed=`phase11:${depth}:${index}`;
        const result=generateCustom(merged,seed,depth);
        profilesGenerated+=1;
        const label=`${depth} ${index}`;
        if(!result.valid||!result.profile){
          fail(`${label}: custom generation failed with ${describe(result.diagnostics)}.`);
          continue;
        }
        const nonInfo=result.diagnostics.filter(item=>item.severity!=='info');
        if(nonInfo.length)fail(`${label}: diagnostics ${describe(nonInfo)}.`);
        assertCustomProfile(result.profile,depth,validPack,fail,label);
        if(depth==='deep'){
          const repeat=generateCustom(merged,seed,depth);
          deterministicRepeats+=1;
          if(!same(result.profile,repeat.profile))fail(`${label}: custom generation is not deterministic.`);
        }
      }
    }
  }

  let invalidCount=0;
  for(const testCase of invalidCases.cases||[]){
    const candidate=applyMutations(validPack,testCase.mutations);
    const validation=Validator.validateCustomPack(candidate,{basePack,baseArchetypes});
    invalidCount+=1;
    if(validation.valid)fail(`${testCase.id}: invalid pack was accepted.`);
    const codes=new Set(validation.diagnostics.map(item=>item.code));
    for(const expected of testCase.expectedCodes||[]){
      if(!codes.has(expected))fail(`${testCase.id}: expected ${expected}; received ${describe(validation.diagnostics)}.`);
    }
    const transaction=Manager.applyCustomPack(basePack,baseArchetypes,candidate);
    if(transaction.valid)fail(`${testCase.id}: transactional merge accepted invalid data.`);
    if(!same(transaction.pack,basePackSnapshot)||!same(transaction.archetypes,baseArchetypeSnapshot))fail(`${testCase.id}: rejected pack changed the base runtime.`);
  }

  const storage=new MemoryStorage();
  let storageChecks=0;
  const parsed=PackStorage.parsePack(JSON.stringify(validPack));
  if(!parsed.pack||!same(parsed.pack,validPack))fail('Valid pack JSON did not parse unchanged.');else storageChecks+=1;

  const installed=PackStorage.installPack(storage,basePack,baseArchetypes,validPack,{timestamp:'2026-06-26T13:00:00.000Z'});
  if(!installed.ok||!installed.valid)fail(`Valid pack installation failed: ${describe(installed.diagnostics)}.`);else storageChecks+=1;
  const listed=PackStorage.listPacks(storage);
  if(listed.packs.length!==1||listed.packs[0].packId!==validPack.packId)fail('Installed pack did not survive storage round trip.');else storageChecks+=1;

  const support=supportPack();
  const installedSupport=PackStorage.installPack(storage,basePack,baseArchetypes,support,{timestamp:'2026-06-26T13:01:00.000Z'});
  if(!installedSupport.ok)fail(`Dependent support pack failed installation: ${describe(installedSupport.diagnostics)}.`);else storageChecks+=1;
  const blocked=PackStorage.removePack(storage,validPack.packId);
  if(blocked.ok||!blocked.diagnostics.some(item=>item.code==='CUSTOM_PACK_DEPENDENTS'))fail('Required pack removal was not blocked by its dependent.');else storageChecks+=1;
  const removeSupport=PackStorage.removePack(storage,support.packId,{timestamp:'2026-06-26T13:02:00.000Z'});
  const removeBase=PackStorage.removePack(storage,validPack.packId,{timestamp:'2026-06-26T13:03:00.000Z'});
  if(!removeSupport.ok||!removeBase.ok||PackStorage.listPacks(storage).packs.length)fail('Dependency-ordered pack removal failed.');else storageChecks+=1;

  const corrupted=new MemoryStorage();
  corrupted.setItem(PackStorage.STORAGE_KEY,'{broken');
  const recovered=PackStorage.readCollection(corrupted);
  if(!recovered.diagnostics.length||recovered.collection.records.length)fail('Corrupted custom-pack storage did not recover safely.');else storageChecks+=1;

  const invalidInstall=PackStorage.installPack(storage,basePack,baseArchetypes,applyMutations(validPack,invalidCases.cases[0].mutations));
  if(invalidInstall.ok||PackStorage.listPacks(storage).packs.length)fail('Rejected pack changed installed-pack storage.');else storageChecks+=1;
  const malformed=PackStorage.parsePack('{');
  const oversize=PackStorage.parsePack('x'.repeat(PackStorage.MAX_PACK_BYTES+1));
  if(malformed.pack||!malformed.diagnostics.some(item=>item.code==='CUSTOM_PACK_JSON_INVALID'))fail('Malformed pack JSON was not rejected.');else storageChecks+=1;
  if(oversize.pack||!oversize.diagnostics.some(item=>item.code==='CUSTOM_PACK_TOO_LARGE'))fail('Oversized custom pack was not rejected.');else storageChecks+=1;

  const expectedProfiles=fixture.depths.length*fixture.seedsPerDepth;
  if(profilesGenerated!==expectedProfiles)fail(`Generated ${profilesGenerated} custom profiles; expected ${expectedProfiles}.`);
  if(deterministicRepeats!==fixture.seedsPerDepth)fail(`Completed ${deterministicRepeats} deterministic repeats; expected ${fixture.seedsPerDepth}.`);
  if(invalidCount!==(invalidCases.cases||[]).length)fail('Not every invalid custom-pack case was executed.');
  if(ledger.activeBranch!=='main')fail('Phase ledger must retain main as the only active branch.');
  if(ledger.activePhaseId!=='phase-11-custom-data-packs')fail('Phase 11 must be active.');
  if(ledger.lastCompletedPhaseId!=='phase-10-storage-import-export-printing')fail('Phase 10 must be the last completed phase.');

  return{valid:failures.length===0,failures,profilesGenerated,deterministicRepeats,invalidCases:invalidCount,storageChecks};
}
