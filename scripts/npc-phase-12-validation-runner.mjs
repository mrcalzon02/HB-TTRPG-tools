import {
  fixture,data,Adapter,clone,same,generateRecord,generateUniversal,legacyCard,ledger
} from './npc-phase-12-validation-fixture.mjs';
import {
  assertStaticContracts,assertRecord,assertUniversal,assertImported
} from './npc-phase-12-validation-assertions.mjs';

export function runPhase12Validation(){
  const failures=[];
  const fail=message=>failures.push(message);
  assertStaticContracts(fail);

  let recordsGenerated=0;
  let profilesConverted=0;
  let deterministicPairs=0;
  let controlCases=0;
  let importCases=0;

  for(const band of data.populationBands){
    for(let index=0;index<fixture.seedsPerPopulationBand;index+=1){
      const requested={populationBandId:band.id,classPool:'appropriate',powerTierId:'appropriate',ageBand:'appropriate',ancestryName:'random',count:1};
      const seed=`phase12:band:${band.id}:${index}`;
      const record=generateRecord(seed,requested);
      recordsGenerated+=1;
      const label=`band ${band.id} seed ${index}`;
      assertRecord(record,requested,fail,label);

      const repeat=generateRecord(seed,requested);
      if(!same(record,repeat))fail(`${label}: normalized record is not deterministic.`);
      else deterministicPairs+=1;

      const depth=fixture.depths[index%fixture.depths.length];
      const converted=generateUniversal(clone(record),depth);
      profilesConverted+=1;
      assertUniversal(converted,converted.record,fail,`${label} ${depth}`);
      const repeatConverted=generateUniversal(clone(repeat),depth);
      if(!same(converted.profile,repeatConverted.profile)||!same(converted.record,repeatConverted.record))fail(`${label}: canonical profile conversion is not deterministic.`);
      else deterministicPairs+=1;

      if(index===0&&band.id!=='random-population'&&importCases<12){
        const imported=Adapter.importLegacyCard(legacyCard(record),data,{seed:`phase12:import:${band.id}`,timestamp:fixture.timestamp});
        assertImported(imported,record,fail,`${label} import`);
        importCases+=1;
      }
    }
  }

  const controlBand='airship-command';
  for(const classPool of fixture.classPools){
    const requested={populationBandId:controlBand,classPool,powerTierId:'appropriate',ageBand:'appropriate',ancestryName:'random',count:1};
    const record=generateRecord(`phase12:class-pool:${classPool}`,requested);
    assertRecord(record,requested,fail,`class pool ${classPool}`);
    controlCases+=1;
  }
  for(const powerTierId of fixture.powerTiers){
    const requested={populationBandId:controlBand,classPool:'all',powerTierId,ageBand:'adult',ancestryName:'Hume',count:1};
    const record=generateRecord(`phase12:tier:${powerTierId}`,requested);
    assertRecord(record,requested,fail,`power tier ${powerTierId}`);
    controlCases+=1;
  }
  for(const ageBand of fixture.ageBands){
    const requested={populationBandId:'refugees-displaced',classPool:'npc',powerTierId:'ordinary',ageBand,ancestryName:'Dwager',count:1};
    const record=generateRecord(`phase12:age:${ageBand}`,requested);
    assertRecord(record,requested,fail,`age ${ageBand}`);
    controlCases+=1;
  }
  for(const ancestryName of fixture.ancestryChoices){
    const requested={populationBandId:'artisans-craftspeople',classPool:'appropriate',powerTierId:'skilled',ageBand:'adult',ancestryName,count:1};
    const record=generateRecord(`phase12:ancestry:${ancestryName}`,requested);
    assertRecord(record,requested,fail,`ancestry ${ancestryName}`);
    controlCases+=1;
  }

  for(const count of fixture.batchCounts){
    const requested={populationBandId:'random-population',classPool:'all',powerTierId:'any',ageBand:'appropriate',ancestryName:'random',count};
    const batch=Adapter.generateBatch(data,requested,{seed:`phase12:batch:${count}`,timestamp:fixture.timestamp});
    const repeat=Adapter.generateBatch(data,requested,{seed:`phase12:batch:${count}`,timestamp:fixture.timestamp});
    if(batch.length!==count||!same(batch,repeat))fail(`batch ${count}: count or determinism failed.`);
    batch.forEach((record,index)=>{
      assertRecord(record,requested,fail,`batch ${count} record ${index}`);
      if(record.options.batchIndex!==index||record.options.batchCount!==count)fail(`batch ${count} record ${index}: batch receipt is incorrect.`);
    });
    deterministicPairs+=1;
    controlCases+=1;
  }

  const low=Adapter.normalizeOptions({count:-20});
  const high=Adapter.normalizeOptions({count:99});
  if(low.count!==1||high.count!==12)fail('Legacy batch count clamping changed.');
  else controlCases+=2;

  const randomRequested={populationBandId:'random-population',classPool:'appropriate',powerTierId:'appropriate',ageBand:'appropriate',ancestryName:'random',count:1};
  for(let index=0;index<50;index+=1){
    const record=generateRecord(`phase12:sentinel:${index}`,randomRequested);
    if(record.population.bandId==='random-population')fail(`sentinel ${index}: random-population escaped.`);
  }

  if(recordsGenerated!==fixture.expectedCounts.populationBands*fixture.seedsPerPopulationBand)fail(`Generated ${recordsGenerated} band records; expected ${fixture.expectedCounts.populationBands*fixture.seedsPerPopulationBand}.`);
  if(profilesConverted!==recordsGenerated)fail(`Converted ${profilesConverted} profiles for ${recordsGenerated} records.`);
  if(data.populationBands.filter(entry=>entry.crewRoles.length).length!==fixture.expectedCounts.bandsWithCrewRoles)fail('Crew-role band count changed.');
  if(ledger.activeBranch!=='main')fail('Phase ledger must retain main as the only active branch.');
  if(ledger.activePhaseId!=='phase-12-kaysender-adapter')fail('Phase 12 must be active.');
  if(ledger.lastCompletedPhaseId!=='phase-11-custom-data-packs')fail('Phase 11 must be the last completed phase.');

  return{valid:failures.length===0,failures,recordsGenerated,profilesConverted,deterministicPairs,controlCases,importCases};
}
