(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,prior=globalThis.BlacklightExoVesselContracts,D=globalThis.BlacklightExoVesselTrackDefinitions;
  if(!base?.trackGeometryVersion||!prior||!D||base.trackContractVersion)return;
  function phaseVersionAtLeast(value,major,minor){const parts=String(value||'0.0.0').split('.').map(Number);return parts[0]>major||(parts[0]===major&&parts[1]>=minor);}
  function validate(record){
    const inherited=prior.validate(record),violations=[...(inherited.violations||[])],geometry=record?.combatGeometry;
    if(geometry){
      if(!geometry.validation?.valid)violations.push(...(geometry.validation?.violations||['VESSEL-06 combat geometry validation failed.']));
      if(geometry.vesselInstanceId!==record.contract?.identifiers?.vesselInstanceId)violations.push('Combat geometry vessel identifier does not match the canonical contract.');
      if(geometry.observer?.coherentVesselGraph!==record.conditionHistory?.coherentVesselGraph)violations.push('Combat observer coherence disagrees with condition history.');
      const activeIds=new Set((record.moduleGraph?.modules||[]).filter(module=>module.state?.graphParticipation==='ACTIVE'&&module.state?.operational).map(module=>module.moduleId));for(const source of geometry.sensorSources||[])if(!activeIds.has(source.sourceId))violations.push(`${source.sourceId} is not an active surviving sensor source.`);
      for(const track of geometry.tracks||[]){const expected=track.rangeM/D.speedOfLightMps;if(Math.abs(track.oneWayLightLagSeconds-expected)>Math.max(1e-12,expected)*1e-10)violations.push(`${track.trackId} light lag does not close against range.`);if(track.conflicting&&(track.hypotheses||[]).length<2)violations.push(`${track.trackId} marks a conflict without multiple hypotheses.`);if(track.fireControlSolution?.status==='FIRE_CONTROL_READY'&&!geometry.observer?.fireControlChannels)violations.push(`${track.trackId} is fire-control ready without surviving channels.`);}
      if(!geometry.observer?.coherentVesselGraph&&(geometry.tracks||[]).some(track=>track.status!=='NO_TRACK'||track.fireControlSolution?.status!=='UNAVAILABLE'))violations.push('Destroyed or incoherent observer retained active target tracking.');
      if(geometry.observerCombatAuthority?.lateralCombatAccelerationMps2>(record.propulsion?.lateralCombatAccelerationMps2||0)+1e-9)violations.push('VESSEL-06 observer acceleration exceeds its engineering authority.');
      if(geometry.observerCombatAuthority?.combatReserveDeltaVMps>(record.propulsion?.combatReserveDeltaVMps||0)+1e-9)violations.push('VESSEL-06 observer combat delta-v exceeds its engineering authority.');
      if(record.contract?.derivedLayers?.find(layer=>layer.key==='combatEnvelope')?.status!=='generated')violations.push('Canonical contract did not mark combatEnvelope as generated for VESSEL-06 geometry.');
      if(!phaseVersionAtLeast(record.contract?.provenance?.generatorVersion,3,6)||record.contract?.provenance?.trackGeometryVersion!=='1.0.0')violations.push('Canonical provenance does not preserve VESSEL-06 authority.');
      if(record.contract?.extensions?.combatGeometrySchema!=='data/schemas/exo-vessel-combat-geometry.schema.json')violations.push('Canonical contract does not expose the combat-geometry schema.');
      const forbidden=JSON.stringify(geometry);for(const marker of ['engagementEnvelope','hitProbability','damageRoll','impactVoxel','projectileVelocityMps','beamDivergence'])if(forbidden.includes(marker))violations.push(`VESSEL-06 prematurely includes deferred field ${marker}.`);
    }
    return{valid:!violations.length,violations};
  }
  const contracts=Object.freeze({...prior,combatGeometryRegistryPath:'data/exo-vessel/combat-geometry-registry.json',schemas:Object.freeze({...prior.schemas,combatGeometry:'data/schemas/exo-vessel-combat-geometry.schema.json'}),validate});
  function finalize(result){if(result?.contract)result.contract.validation=validate(result);return result;}
  function generate(seed,input={},source=null){return finalize(base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return finalize(base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVesselContracts=contracts;
  globalThis.BlacklightExoVessel=Object.freeze({...base,trackContractVersion:1,contracts,validateContract:validate,generate,migrateRecord});
})();
