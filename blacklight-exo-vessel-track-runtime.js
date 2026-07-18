(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,D=globalThis.BlacklightExoVesselTrackDefinitions,C=globalThis.BlacklightExoVesselTrackCore;
  if(!base?.conditionContractVersion||!D||!C||base.trackGeometryVersion)return;
  const clone=C.clone,dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  function validationMode(input){const mode=String(input.trackValidationMode||dom('exo-vessel-track-mode')||'REPAIR').toUpperCase();if(!D.validationModes.includes(mode))throw new Error(`Unknown track validation mode ${mode}.`);return mode;}
  function generatedLayer(layer){return layer.key==='combatEnvelope'?{...layer,status:'generated',version:'1.0.0',source:'VESSEL-06 sensor tracks and combat geometry',notes:'Light-lag, observation age, track uncertainty, target maneuver authority, sensor agreement, deception probability, and weapon-independent fire-control solutions are generated. Weapon-family performance and engagement envelopes remain VESSEL-07.'}:layer;}
  function build(result,input){
    const mode=validationMode(input),scenario=C.scenario(input),authority={...result,sensorLedger:result.sensors||result.engineeringLedger?.sensors,propulsionLedger:result.propulsion||result.engineeringLedger?.propulsion},observer=C.observer(authority),seed=`${result.contract.seeds.equipmentSeed}:track:${result.contract.seeds.historySeed}`,sensorSources=C.sources(authority,observer,seed),track=C.buildTrack(authority,observer,scenario,seed);
    const record={recordType:'exoVesselCombatGeometry',schemaVersion:'1.0.0',phase:'VESSEL-06',vesselInstanceId:result.contract.identifiers.vesselInstanceId,trackSeed:seed,validationMode:mode,referenceAuthority:{engineeringLedger:'VESSEL-02_SENSOR_AND_PROPULSION_REFERENCE',moduleGraph:'VESSEL-03_SENSOR_DEPENDENCY_REFERENCE',conditionHistory:'VESSEL-05_SURVIVING_GRAPH_AUTHORITY'},scenario,observer,sensorSources,tracks:[track],observerCombatAuthority:{lateralCombatAccelerationMps2:observer.lateralCombatAccelerationMps2,combatReserveDeltaVMps:observer.combatReserveDeltaVMps,sustainedCombatDurationSeconds:observer.sustainedCombatDurationSeconds,source:'VESSEL-02 propulsion constrained by VESSEL-05 surviving propulsion and fuel state'},repairLog:[],deferredSystems:clone(D.deferredSystems),validation:{valid:true,violations:[],warnings:[],trackCount:0,sourceCount:0,repairCount:0}};
    C.injectFault(record,input.trackFault);let validation=C.validate(record,result);if(!validation.valid&&mode==='REPAIR'){const preRepairViolations=[...validation.violations];C.repair(record,result);validation=C.validate(record,result);validation.preRepairViolations=preRepairViolations;}else if(!validation.valid)throw new Error(`Sensor track geometry rejected: ${validation.violations.join('; ')}`);record.validation=validation;return record;
  }
  function apply(input,result){
    if(result?.combatGeometry?.phase==='VESSEL-06'&&result?.contract?.provenance?.trackGeometryVersion==='1.0.0')return result;
    const record=build(result,input);result.combatGeometry=record;result.trackModel=record;
    result.contract.derivedLayers=result.contract.derivedLayers.map(generatedLayer);
    result.contract.provenance={...result.contract.provenance,generatorVersion:'3.6.0',trackGeometryVersion:'1.0.0',combatGeometryRegistry:'data/exo-vessel/combat-geometry-registry.json'};
    result.contract.extensions={...result.contract.extensions,combatGeometrySchema:'data/schemas/exo-vessel-combat-geometry.schema.json'};
    if(result.sensors)result.sensors.trackModelStatus=`VESSEL-06 generated ${record.tracks.length} target track with ${record.sensorSources.length} surviving sensor sources; weapon-family engagement remains deferred to VESSEL-07.`;
    const track=record.tracks[0];result.warnings=[...(result.warnings||[]),`VESSEL-06 observes the modeled target at ${(track.rangeM/1000).toLocaleString(undefined,{maximumFractionDigits:2})} km with ${track.oneWayLightLagSeconds.toLocaleString(undefined,{maximumFractionDigits:3})} seconds of one-way light delay and a ${track.maneuverEnvelope.uncertaintyRadiusM.toLocaleString(undefined,{maximumFractionDigits:2})} m predicted uncertainty radius.`,`Track status is ${track.status}; fire-control state is ${track.fireControlSolution.status}. These are information and geometry findings, not weapon hit probabilities or engagement ranges.`];
    return result;
  }
  function generate(seed,input={},source=null){return apply(input,base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return apply(input,base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,trackGeometryVersion:1,trackGeometrySchemaVersion:'1.0.0',trackDefinitions:D,generate,migrateRecord});
})();