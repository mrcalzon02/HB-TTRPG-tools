(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselDamageDefinitions)return;
  const facings=['FORE','AFT','LEFT','RIGHT','UP','DOWN'];
  const outcomes=['NO_SOLUTION','INTERCEPTED','MISS','NEAR_MISS','IMPACT'];
  const validationModes=['REPAIR','STRICT'];
  const damageBands=['pointDefense','practical','harassment','theoretical'];
  const effectTypes=['PENETRATION','ABLATION','HEATING','FRAGMENTATION','RADIATION','IMPULSE'];
  const defaults={incomingWeaponFamily:'AUTO',damageBand:'practical',impactFacing:'AUTO',salvoCount:1,attackIntensityPercent:65,targetEvasionPercent:35,damageControlPercent:55};
  const semanticCriticality={STRUCTURE:1.15,DRIVE_INTEGRATION:1.2,MAIN_ENGINE:1.18,DRIVE_APPARATUS:1.24,REACTOR:1.28,ENERGY_STORAGE:1.22,PROPELLANT_TANK:1.18,LIFE_SUPPORT:1.2,NAVIGATION:1.16,FIRE_CONTROL:1.14,ELECTRONIC_WARFARE:1.08,SENSOR:.92,MAGAZINE:1.3,WEAPON_SUPPORT:1.06,WEAPON_COOLING:1.05,WEAPON:.94,ACTIVE_PROTECTION:1.02,THERMAL_CONTROL:1.08,COUNTERMEASURE:.9,MAINTENANCE:.82,CARGO:.72,RESERVED_VOLUME:.55};
  const propagationHazards=['REACTOR','ENERGY_STORAGE','PROPELLANT_TANK','MAGAZINE','THERMAL_CONTROL','DRIVE_APPARATUS','MAIN_ENGINE'];
  const repairableFaults=['IMPACT_WITHOUT_PLACEMENT','MISS_WITH_DAMAGE','DESTROYED_MODULE_ACTIVE','SEVERED_ROUTE_ACTIVE','RESIDUAL_MASS_INCREASE','REFERENCE_CONDITION_MUTATED'];
  globalThis.BlacklightExoVesselDamageDefinitions=Object.freeze({
    phase:'VESSEL-08',schemaVersion:'1.0.0',facings,outcomes,validationModes,damageBands,effectTypes,defaults,semanticCriticality,propagationHazards,repairableFaults,
    deferredSystems:{gameplayStatisticsAndActions:'VESSEL-09',campaignPersistence:'VESSEL-10'},
    principles:[
      'VESSEL-08 consumes VESSEL-07 engagement authority and never invents a second weapon-performance model.',
      'The VESSEL-05 condition history remains immutable pre-impact authority; combat produces a separate post-impact state.',
      'Directional fields, distributed hull protection, module placement, utility routes, pressure zones, and architecture determine local consequences.',
      'A resolved impact affects actual placements, modules, routes, zones, crew-support authority, and surviving graphs rather than subtracting from a global hull pool.',
      'Repair mode records deterministic corrections and strict mode rejects the same invalid combat record.'
    ]
  });
})();
