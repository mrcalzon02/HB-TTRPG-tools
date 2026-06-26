import {
  Rules,Core,Storage,fixture,policies,ledger,pack,MemoryStorage,clone,same,generate
} from './npc-phase-10-validation-fixture.mjs';
import {
  assertStaticContracts,assertPreserved,verifyExports,verifyInvalidImports
} from './npc-phase-10-validation-assertions.mjs';

export function runPhase10Validation(){
  const failures=[];
  const fail=message=>failures.push(message);
  assertStaticContracts(fail);

  const library=new MemoryStorage();
  const generatedProfiles=[];
  let roundTrips=0;
  let regenerations=0;
  let exports=0;
  let saveIndex=0;

  for(const archetypeId of fixture.archetypeIds){
    const resolved=Rules.resolveArchetype(archetypeId,policies.archetypes);
    if(!resolved.valid){fail(`${archetypeId}: archetype resolution failed.`);continue;}

    for(let index=0;index<fixture.seedsPerArchetype;index+=1){
      const result=generate(archetypeId,index);
      const label=`${archetypeId} ${index}`;
      if(!result.valid||!result.profile){
        fail(`${label}: generation failed with ${result.diagnostics.map(item=>item.code).join(', ')}.`);
        continue;
      }
      const nonInfo=result.diagnostics.filter(item=>item.severity!=='info');
      if(nonInfo.length)fail(`${label}: diagnostics ${nonInfo.map(item=>item.code).join(', ')}.`);
      const profile=result.profile;
      generatedProfiles.push(profile);

      const shape=Storage.validateProfile(profile);
      if(!shape.valid)fail(`${label}: persistence shape validation failed: ${shape.errors.map(item=>item.code).join(', ')}.`);

      exports+=verifyExports(profile,fail,label);
      const canonical=globalThis.NpcProfileGeneratorExport.canonicalJson(profile);
      const imported=Storage.parseImport(canonical);
      if(!imported.profile||!same(imported.profile,profile))fail(`${label}: direct import round trip changed the profile.`);
      else roundTrips+=1;

      const record=Storage.createRecord(profile,{savedAt:new Date(Date.parse(fixture.timestamp)+saveIndex*1000).toISOString()});
      if(!record.record){
        fail(`${label}: saved-record creation failed.`);
      }else{
        const wrapped=Storage.parseImport(JSON.stringify(record.record));
        if(!wrapped.profile||!same(wrapped.profile,profile))fail(`${label}: wrapped-record import changed the profile.`);
        else roundTrips+=1;
      }

      const save=Storage.saveProfile(library,profile,{
        maxRecords:fixture.storageMaxRecords,
        savedAt:new Date(Date.parse(fixture.timestamp)+saveIndex*1000).toISOString()
      });
      saveIndex+=1;
      if(!save.ok)fail(`${label}: local save failed: ${save.errors.map(item=>item.code).join(', ')}.`);
      const loaded=Storage.loadProfile(library,profile.profileId);
      if(!loaded.profile||!same(loaded.profile,profile))fail(`${label}: saved-profile load changed the profile.`);
      else roundTrips+=1;

      const cloned=Storage.cloneProfile(profile,{
        timestamp:new Date(Date.parse(fixture.timestamp)+100000+saveIndex*1000).toISOString(),
        salt:label
      });
      if(!cloned.profile){
        fail(`${label}: cloning failed.`);
      }else{
        const cloneValidation=Storage.validateProfile(cloned.profile);
        if(!cloneValidation.valid)fail(`${label}: clone is invalid: ${cloneValidation.errors.map(item=>item.code).join(', ')}.`);
        if(cloned.profile.profileId===profile.profileId)fail(`${label}: clone retained the original profile ID.`);
        if(cloned.profile.generator.seed!==profile.generator.seed)fail(`${label}: clone lost its generator seed.`);
        if(!same(cloned.profile.locks,profile.locks))fail(`${label}: clone lost locks.`);
        if(!same(cloned.profile.provenance.sourcePackIds,profile.provenance.sourcePackIds))fail(`${label}: clone lost source-pack provenance.`);
        if(!cloned.profile.provenance.notes.some(note=>note.includes(profile.profileId)))fail(`${label}: clone provenance note is missing.`);
      }

      const nextTimestamp=new Date(Date.parse(fixture.timestamp)+200000+saveIndex*1000).toISOString();
      const regeneration=Storage.regenerationConfig(profile,resolved.archetype,pack,nextTimestamp);
      if(!regeneration.config){
        fail(`${label}: regeneration config failed.`);
      }else{
        const regenerated=Core.generateProfile(regeneration.config);
        if(!regenerated.valid||!regenerated.profile)fail(`${label}: regeneration failed with ${regenerated.diagnostics.map(item=>item.code).join(', ')}.`);
        else{
          assertPreserved(profile,regenerated.profile,fail,label);
          if(regenerated.profile.revision!==profile.revision+1)fail(`${label}: regeneration did not increment revision.`);
          if(regenerated.profile.createdAt!==profile.createdAt)fail(`${label}: regeneration changed createdAt.`);
          if(regenerated.profile.updatedAt!==nextTimestamp)fail(`${label}: regeneration did not use the requested update time.`);
          regenerations+=1;
        }
      }
    }
  }

  const records=Storage.listProfiles(library);
  if(records.records.length!==fixture.storageMaxRecords)fail(`Saved-library cap is ${records.records.length}; expected ${fixture.storageMaxRecords}.`);
  const savedCount=records.records.length;
  if(savedCount){
    const removedId=records.records[0].recordId;
    const deleted=Storage.deleteProfile(library,removedId,{timestamp:'2026-06-26T13:00:00.000Z'});
    if(!deleted.ok)fail('Saved-profile deletion failed.');
    if(Storage.loadProfile(library,removedId).profile)fail('Deleted profile remained loadable.');
  }

  const corrupted=new MemoryStorage();
  corrupted.setItem(Storage.STORAGE_KEY,'{broken');
  const corruptedRead=Storage.readCollection(corrupted);
  if(!corruptedRead.errors.length||corruptedRead.collection.records.length)fail('Corrupted local storage did not recover to an empty collection with diagnostics.');

  if(generatedProfiles.length)verifyInvalidImports(generatedProfiles[0],fail);
  const expectedProfiles=fixture.archetypeIds.length*fixture.seedsPerArchetype;
  if(generatedProfiles.length!==expectedProfiles)fail(`Generated ${generatedProfiles.length} profiles; expected ${expectedProfiles}.`);
  if(roundTrips!==expectedProfiles*3)fail(`Completed ${roundTrips} round trips; expected ${expectedProfiles*3}.`);
  if(regenerations!==expectedProfiles)fail(`Completed ${regenerations} regenerations; expected ${expectedProfiles}.`);
  if(exports!==expectedProfiles*fixture.exportFormats.length)fail(`Verified ${exports} exports; expected ${expectedProfiles*fixture.exportFormats.length}.`);
  if(ledger.activeBranch!=='main')fail('Phase ledger must retain main as the only active branch.');
  if(ledger.activePhaseId!=='phase-10-storage-import-export-printing')fail('Phase 10 must be active.');
  if(ledger.lastCompletedPhaseId!=='phase-9-mechanical-profile-generation')fail('Phase 9 must be the last completed phase.');

  return{valid:failures.length===0,failures,roundTrips,savedCount,regenerations,exports};
}
