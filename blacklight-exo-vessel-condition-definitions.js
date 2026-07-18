(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselConditionDefinitions)return;

  const installationStates=['INSTALLED','INCOMPLETE','MISSING','REMOVED','DESTROYED'];
  const serviceStates=['OPERATIONAL','DEGRADED','OFFLINE','ISOLATED','MOTHBALLED','ABANDONED','WRECKAGE'];
  const dispositions=['NONE','MISSING_CONSTRUCTION','TEARDOWN','SALVAGE','DAMAGE','DESTRUCTION'];
  const graphParticipation=['ACTIVE','PHYSICAL_ONLY','NONE'];
  const eventTypes=[
    'CONSTRUCTION_SHORTFALL','COMMISSIONING_PROGRESS','SERVICE_WEAR','MAINTENANCE_DEBT','MOTHBALL','REACTIVATION','DECOMMISSION','TEARDOWN_REMOVAL','ABANDONMENT','SALVAGE_REMOVAL','STRUCTURAL_DAMAGE','SYSTEM_DAMAGE','ATMOSPHERE_LOSS','CONTAMINATION','DATA_CORRUPTION','FUEL_DEPLETION','COOLANT_LOSS','DESTRUCTION','SECONDARY_PROPAGATION'
  ];
  const structuralSemantics=['STRUCTURE','DRIVE_INTEGRATION','MAIN_ENGINE','DRIVE_APPARATUS','REACTOR','ENERGY_STORAGE','PROPELLANT_TANK'];
  const systemSemantics=['REACTOR','DRIVE_APPARATUS','MAIN_ENGINE','LIFE_SUPPORT','THERMAL_CONTROL','NAVIGATION','SENSOR','FIRE_CONTROL','ELECTRONIC_WARFARE','WEAPON','WEAPON_SUPPORT','WEAPON_COOLING','COUNTERMEASURE'];
  const salvagePriority=['COUNTERMEASURE','WEAPON','SENSOR','ELECTRONIC_WARFARE','THERMAL_CONTROL','PROPELLANT_TANK','ENERGY_STORAGE','WEAPON_SUPPORT','WEAPON_COOLING','CARGO','MAINTENANCE'];
  const teardownPriority=['COUNTERMEASURE','WEAPON','SENSOR','THERMAL_CONTROL','PROPELLANT_TANK','CARGO','MAINTENANCE','WEAPON_SUPPORT','WEAPON_COOLING'];
  const constructionPriority=['RESERVED_VOLUME','CARGO','COUNTERMEASURE','WEAPON','SENSOR','THERMAL_CONTROL','MAINTENANCE','WEAPON_SUPPORT','WEAPON_COOLING','LIFE_SUPPORT','NAVIGATION','REACTOR','DRIVE_APPARATUS','MAIN_ENGINE','STRUCTURE'];
  const capacityGroups={
    power:['REACTOR','ENERGY_STORAGE'],
    cooling:['THERMAL_CONTROL','WEAPON_COOLING'],
    lifeSupport:['LIFE_SUPPORT','HABITAT','MEDICAL'],
    propulsion:['MAIN_ENGINE','DRIVE_APPARATUS','DRIVE_INTEGRATION'],
    sensors:['SENSOR','NAVIGATION','FIRE_CONTROL','ELECTRONIC_WARFARE'],
    weapons:['WEAPON','WEAPON_SUPPORT'],
    cargo:['CARGO','RESERVED_VOLUME']
  };
  const faultTypes=['DESTROYED_WITH_COHERENT_GRAPH','REMOVED_MODULE_STILL_PARTICIPATING','SALVAGE_EXCEEDS_MASS','MISSING_EVENT_TARGET','OPERATIONAL_WITH_ZERO_CONSTRUCTION','BROKEN_SURVIVING_LOAD_PATH'];

  globalThis.BlacklightExoVesselConditionDefinitions=Object.freeze({
    schemaVersion:'1.0.0',historyVersion:1,phase:'VESSEL-05',installationStates,serviceStates,dispositions,graphParticipation,eventTypes,structuralSemantics,systemSemantics,salvagePriority,teardownPriority,constructionPriority,capacityGroups,faultTypes,
    deferredSystems:{trackAndCombatGeometry:'VESSEL-06',weaponEngagementEnvelopes:'VESSEL-07',localHitResolution:'VESSEL-08'},
    principles:[
      'Missing, incomplete, removed, salvaged, damaged, and destroyed are independent physical histories.',
      'The intact module graph and voxel layout remain immutable design authority; condition produces surviving effective graphs.',
      'A wreck below one hundred percent destruction retains a coherent largest structural component.',
      'One hundred percent destruction removes coherent vessel topology while permitting debris and salvage records.',
      'Secondary propagation is a deterministic lifecycle consequence, not VESSEL-08 combat hit resolution.'
    ]
  });
})();