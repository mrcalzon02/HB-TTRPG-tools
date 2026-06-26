import {
  read,fixture,inventory,compatibility,legacySchema,data,Adapter,gitBlobSha
} from './npc-phase-12-validation-fixture.mjs';

const has=value=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const errors=diagnostics=>(diagnostics||[]).filter(item=>item.severity==='error');

export function assertStaticContracts(fail){
  if(gitBlobSha(fixture.legacyRuntime)!==fixture.legacyRuntimeSha)fail('Legacy Kaysender runtime SHA changed.');
  if(inventory.legacyRuntime.sha!==fixture.legacyRuntimeSha||!inventory.legacyRuntime.preservationRequired)fail('Capability inventory does not preserve the legacy runtime SHA.');
  if(legacySchema.$schema!=='https://json-schema.org/draft/2020-12/schema'||legacySchema.properties?.recordType?.const!=='kaysenderNpcAlpha')fail('Kaysender alpha schema root contract is invalid.');
  if(legacySchema.properties?.legacyRows?.minItems!==17||legacySchema.properties?.legacyRows?.maxItems!==17)fail('Kaysender alpha schema does not require exactly seventeen legacy rows.');
  if(compatibility.legacyRuntime?.sha!==fixture.legacyRuntimeSha||compatibility.legacyRuntime?.preserved!==true)fail('Compatibility pack does not preserve the legacy runtime.');
  if(Object.keys(compatibility.populationBandArchetypes||{}).length!==fixture.expectedCounts.populationBands)fail('Compatibility pack does not map all population bands.');
  if(Object.keys(compatibility.ancestryIds||{}).length!==fixture.expectedCounts.ancestries)fail('Compatibility pack does not map all ancestries.');
  if(data.populationBands.length!==fixture.expectedCounts.populationBands)fail(`Normalized ${data.populationBands.length} population bands; expected ${fixture.expectedCounts.populationBands}.`);
  if(data.selectableBands.length!==fixture.expectedCounts.selectablePopulationBands)fail('Random population sentinel filtering is incorrect.');
  if(data.classes.length!==fixture.expectedCounts.classes||data.classPools.pc.length!==fixture.expectedCounts.playerClasses||data.classPools.npc.length!==fixture.expectedCounts.npcClasses||data.classPools.custom.length!==fixture.expectedCounts.customClasses)fail('Normalized class-pool counts are incorrect.');
  if(data.ancestries.length!==fixture.expectedCounts.ancestries||data.powerTiers.length!==fixture.expectedCounts.powerTiers)fail('Normalized ancestry or power-tier counts are incorrect.');
  if(new Set(data.populationBands.map(entry=>entry.id)).size!==data.populationBands.length)fail('Population-band IDs are not unique.');
  if(new Set(data.classes.map(entry=>entry.id)).size!==data.classes.length)fail('Kaysender class IDs are not unique.');
  if(new Set(data.ancestries.map(entry=>entry.id)).size!==data.ancestries.length)fail('Kaysender ancestry IDs are not unique.');
  for(const band of data.populationBands){
    if(!compatibility.populationBandArchetypes?.[band.id])fail(`Population band ${band.id} has no universal archetype mapping.`);
    if(!band.sourcePath||!band.occupations.length||!band.ageBands.length)fail(`Population band ${band.id} is incomplete after normalization.`);
    for(const preferred of band.preferredClasses)if(!data.classIndex[preferred.name])fail(`${band.id} references unknown class ${preferred.name}.`);
  }
  const adapterSource=read('npc-profile-generator-kaysender-adapter.js');
  for(const functionName of['generateRecord','generateBatch','toUniversalProfile','importLegacyCard'])if(!adapterSource.includes(functionName))fail(`Kaysender adapter is missing ${functionName}.`);
}

export function assertRecord(record,requested,fail,label){
  if(record.recordType!=='kaysenderNpcAlpha'||record.schemaVersion!=='1.0.0')fail(`${label}: normalized record type or schema version is incorrect.`);
  if(!/^kaysender-npc-[a-z0-9][a-z0-9-]{7,63}$/.test(record.recordId||''))fail(`${label}: record ID is invalid.`);
  if(record.adapter?.legacyRuntimeSha!==fixture.legacyRuntimeSha||record.adapter?.adapterId!==Adapter.ADAPTER_ID)fail(`${label}: adapter provenance is incorrect.`);
  if(record.population?.bandId==='random-population')fail(`${label}: random-population sentinel escaped into output.`);
  const band=data.bandIndex[record.population?.bandId];
  if(!band)fail(`${label}: output population band is unknown.`);
  if(requested.populationBandId!=='random-population'&&data.bandIndex[requested.populationBandId]&&record.population.bandId!==requested.populationBandId)fail(`${label}: explicit population band was not preserved.`);
  if(requested.ancestryName!=='random'&&data.ancestryIndex[requested.ancestryName]&&record.identity?.ancestryName!==requested.ancestryName)fail(`${label}: explicit ancestry was not preserved.`);
  if(requested.ageBand!=='appropriate'&&record.identity?.ageBand!==requested.ageBand)fail(`${label}: explicit age band was not preserved.`);
  if(requested.ageBand==='appropriate'&&!band?.ageBands.includes(record.identity?.ageBand))fail(`${label}: population-appropriate age is outside the selected band.`);
  if(['npc','pc','custom'].includes(requested.classPool)&&record.classProfile?.pool!==requested.classPool)fail(`${label}: explicit class pool was not preserved.`);
  if(requested.classPool==='appropriate'&&!band?.preferredClasses.some(entry=>entry.name===record.classProfile?.name))fail(`${label}: population-appropriate class is not in the preferred class mix.`);
  const tier=data.powerTierIndex[requested.powerTierId],range=tier?.id==='appropriate'||!tier?band?.levelRange:{min:tier.min,max:tier.max};
  if(!Number.isInteger(record.classProfile?.level)||record.classProfile.level<range.min||record.classProfile.level>range.max)fail(`${label}: level is outside the requested range.`);
  for(const field of['fullName','givenName','familyName','ancestryName','ageBand'])if(!has(record.identity?.[field]))fail(`${label}: identity.${field} is empty.`);
  for(const field of['homeRegion','occupation','factionTie'])if(!has(record[field]))fail(`${label}: ${field} is empty.`);
  for(const field of['disposition','need','fear','loyalty','secret','currentProblem'])if(!has(record.characterization?.[field]))fail(`${label}: characterization.${field} is empty.`);
  if(record.legacyRows?.length!==fixture.expectedCounts.legacyRows)fail(`${label}: legacy row count is not seventeen.`);
  const labels=(record.legacyRows||[]).map(row=>row.label);
  if(JSON.stringify(labels)!==JSON.stringify(fixture.legacyRowLabels))fail(`${label}: legacy row order changed.`);
  if((record.legacyRows||[]).some(row=>String(row.value).includes('undefined')))fail(`${label}: legacy rows contain undefined text.`);
  const fallback=compatibility.fallbacks.unassignedCrewRole;
  if(band?.crewRoles.length===0&&(record.crew?.assigned||record.crew?.shipRole!==fallback))fail(`${label}: shore-based crew fallback changed.`);
  if(band?.crewRoles.length>0&&(!record.crew?.assigned||!band.crewRoles.includes(record.crew.shipRole)))fail(`${label}: assigned crew role is invalid.`);
  const scanClean=String(record.population?.combatReadiness).includes('noncombatant');
  if(record.presentation?.scanClean!==scanClean||record.presentation?.extraClass!==(scanClean?'scan-clean':''))fail(`${label}: scan-clean presentation state is incorrect.`);
  if(record.classProfile?.pool==='custom'&&!record.classProfile.statStub.includes('conversion-pending'))fail(`${label}: custom class lost conversion-pending language.`);
  if(record.classProfile?.pool!=='custom'&&(!record.classProfile.statStub.includes('Hit Die')||!record.classProfile.statStub.includes('base attack progression')))fail(`${label}: standard class stat stub is incomplete.`);
  if(!record.provenance?.sourcePaths.includes(compatibility.sources.manifest)||!record.provenance?.sourcePaths.includes(band?.sourcePath)||record.provenance?.legacyRuntimePreserved!==true)fail(`${label}: record source provenance is incomplete.`);
}

export function assertUniversal(converted,record,fail,label){
  if(!converted?.profile||!converted.valid)fail(`${label}: universal conversion failed.`);
  if(errors(converted?.diagnostics).length)fail(`${label}: universal conversion returned error diagnostics ${errors(converted.diagnostics).map(item=>item.code).join(', ')}.`);
  const profile=converted?.profile;if(!profile)return;
  if(profile.identity?.fullName!==record.identity.fullName||profile.identity?.ancestryId!==record.identity.ancestryId||profile.identity?.ageBand!==record.identity.ageBand)fail(`${label}: universal identity does not match the Kaysender record.`);
  if(profile.identity?.homeland!==record.homeRegion||profile.identity?.currentLocation!==record.homeRegion)fail(`${label}: home region was not preserved.`);
  const social=profile.sections?.socialEconomic?.data;
  if(social?.populationBandId!==record.population.bandId||social?.occupation!==record.occupation||social?.combatReadiness!==record.population.combatReadiness)fail(`${label}: population or occupation data was not preserved.`);
  const mechanics=profile.sections?.mechanics?.data;
  if(mechanics?.classLabel!==record.classProfile.name||mechanics?.level!==record.classProfile.level||mechanics?.statStub!==record.classProfile.statStub)fail(`${label}: Kaysender mechanical profile was not preserved.`);
  for(const id of fixture.requiredUniversalExtensions)if(profile.sections?.extensions?.[id]?.state!=='present')fail(`${label}: universal extension ${id} is missing.`);
  if(profile.sections?.extensions?.kaysenderCrewRole?.data?.shipRole!==record.crew.shipRole)fail(`${label}: crew role extension changed.`);
  if(profile.sections?.personality?.data?.disposition!==record.characterization.disposition)fail(`${label}: disposition was not preserved.`);
  if(profile.sections?.motivations?.data?.immediateNeed!==record.characterization.need||profile.sections?.motivations?.data?.fear!==record.characterization.fear)fail(`${label}: motivations were not preserved.`);
  if(profile.sections?.affiliationsRelationships?.data?.factionTie!==record.factionTie)fail(`${label}: faction tie was not preserved.`);
  if(profile.sections?.secretsProblemsHooks?.data?.secret!==record.characterization.secret||profile.sections?.secretsProblemsHooks?.data?.currentProblem!==record.characterization.currentProblem)fail(`${label}: secret or problem was not preserved.`);
  if(!profile.generator?.customPackIds?.includes(compatibility.packId)||!profile.provenance?.sourcePackIds?.includes(compatibility.packId))fail(`${label}: compatibility-pack provenance is missing.`);
  for(const sourceId of[record.population.bandId,record.identity.ancestryId,data.classIndex[record.classProfile.name]?.id])if(sourceId&&!profile.provenance?.sourceEntryIds?.includes(sourceId))fail(`${label}: source entry ${sourceId} is missing from provenance.`);
  if(record.universalProfileId!==profile.profileId)fail(`${label}: normalized record was not linked to its universal profile.`);
}

export function assertImported(imported,source,fail,label){
  if(imported.identity?.fullName!==source.identity.fullName||imported.occupation!==source.occupation||imported.population?.label!==source.population.label)fail(`${label}: imported legacy card identity, occupation, or band changed.`);
  if(JSON.stringify(imported.legacyRows)!==JSON.stringify(source.legacyRows))fail(`${label}: imported legacy rows changed.`);
  if(imported.classProfile?.classLabel!==source.classProfile.classLabel||imported.crew?.shipRole!==source.crew.shipRole||imported.presentation?.extraClass!==source.presentation.extraClass)fail(`${label}: imported class, crew role, or presentation state changed.`);
}
