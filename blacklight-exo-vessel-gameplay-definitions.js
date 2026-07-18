(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselGameplayDefinitions)return;
  const validationModes=['REPAIR','STRICT'];
  const resolutionModes=['SIMPLIFIED','DETAILED'];
  const statDefinitions=[
    {key:'MOBILITY',label:'Mobility',domain:'navigation',description:'Combat acceleration, maneuver reserve, propulsion survival, and coherent control authority.'},
    {key:'NAVIGATION',label:'Navigation',domain:'navigation',description:'Navigation channels, data integrity, solution authority, and surviving control graphs.'},
    {key:'SENSORS',label:'Sensors',domain:'sensor-targeting',description:'Surviving apertures, sensor channels, processing, track confidence, and information freshness.'},
    {key:'TARGETING',label:'Targeting',domain:'sensor-targeting',description:'Fire-control channels, geometry quality, solution confidence, and track freshness.'},
    {key:'OFFENSE',label:'Offense',domain:'offensive',description:'Operational weapon families, engagement quality, ammunition, support, power, and cooling.'},
    {key:'DEFENSE',label:'Defense',domain:'defensive',description:'Directional protection, countermeasures, point defense, reaction capacity, and surviving structure.'},
    {key:'ENGINEERING',label:'Engineering',domain:'engineering-damage-control',description:'Power, cooling, data, access, maintenance capability, and operational machinery.'},
    {key:'DAMAGE_CONTROL',label:'Damage Control',domain:'engineering-damage-control',description:'Crew availability, atmosphere, access, life support, isolation, and repair capacity.'},
    {key:'ENDURANCE',label:'Endurance',domain:'operations',description:'Fuel, coolant, life support, sustained combat time, mission reserves, and maintenance burden.'},
    {key:'COMMAND',label:'Command',domain:'operations',description:'Crew coordination, data integrity, readiness, communication, and automation support.'}
  ];
  const tempos={
    REACTION:{key:'REACTION',label:'Reaction',seconds:1,rounds:0,description:'Immediate response before the next tactical exchange.'},
    TACTICAL:{key:'TACTICAL',label:'Tactical action',seconds:6,rounds:1,description:'One standard vessel-combat round.'},
    OPERATIONAL:{key:'OPERATIONAL',label:'Operational action',seconds:60,rounds:10,description:'A sustained minute-scale maneuver or systems task.'},
    DAMAGE_CONTROL:{key:'DAMAGE_CONTROL',label:'Damage-control interval',seconds:300,rounds:50,description:'A five-minute isolated repair, reroute, or containment task.'},
    WATCH:{key:'WATCH',label:'Engineering watch',seconds:1800,rounds:300,description:'A thirty-minute navigation, overhaul, or transit preparation interval.'}
  };
  const actionCategories=['NAVIGATION','SENSOR_TARGETING','OFFENSIVE','DEFENSIVE','ENGINEERING_DAMAGE_CONTROL'];
  const actionTemplates=[
    {key:'NAV_PLOT_VECTOR',category:'NAVIGATION',label:'Plot Combat Vector',statKey:'NAVIGATION',tempoKey:'TACTICAL',difficulty:45,costs:{command:1},requirements:['coherent','navigation'],description:'Convert the current track and propulsion authority into a declared vector or intercept plan.'},
    {key:'NAV_EVASIVE_BURN',category:'NAVIGATION',label:'Evasive Burn',statKey:'MOBILITY',tempoKey:'TACTICAL',difficulty:55,costs:{reaction:1,power:5,combatDeltaV:1},requirements:['coherent','propulsion'],description:'Spend maneuver reserve to enlarge the target solution and alter the vessel approach geometry.'},
    {key:'NAV_EMERGENCY_BRAKE',category:'NAVIGATION',label:'Emergency Brake',statKey:'MOBILITY',tempoKey:'OPERATIONAL',difficulty:65,costs:{command:1,power:8,thermal:8,combatDeltaV:2},requirements:['coherent','propulsion'],description:'Trade reserve, heat, and structural margin for a rapid reduction in relative velocity.'},
    {key:'NAV_FTL_SOLUTION',category:'NAVIGATION',label:'Prepare Transit Solution',statKey:'NAVIGATION',tempoKey:'WATCH',difficulty:60,costs:{command:2,power:10},requirements:['coherent','navigation','drive'],description:'Prepare, verify, and certify a transit solution using the installed FTL apparatus.'},
    {key:'SENSOR_PASSIVE_TRACK',category:'SENSOR_TARGETING',label:'Refine Passive Track',statKey:'SENSORS',tempoKey:'TACTICAL',difficulty:45,costs:{},requirements:['coherent','sensors'],description:'Accumulate low-signature observations and reduce track uncertainty without active emissions.'},
    {key:'SENSOR_ACTIVE_SWEEP',category:'SENSOR_TARGETING',label:'Active Sensor Sweep',statKey:'SENSORS',tempoKey:'TACTICAL',difficulty:40,costs:{power:7,thermal:3},requirements:['coherent','sensors'],description:'Increase track confidence through active emissions while accepting a signature consequence.'},
    {key:'TARGET_CORRELATE',category:'SENSOR_TARGETING',label:'Correlate Competing Tracks',statKey:'TARGETING',tempoKey:'OPERATIONAL',difficulty:55,costs:{command:1,power:3},requirements:['coherent','sensors','data'],description:'Resolve disagreement, deception, and stale observations into one preferred target hypothesis.'},
    {key:'TARGET_LOCK',category:'SENSOR_TARGETING',label:'Establish Fire-Control Lock',statKey:'TARGETING',tempoKey:'TACTICAL',difficulty:60,costs:{command:1,power:5},requirements:['coherent','fireControl'],description:'Commit a surviving fire-control channel to one target and one engagement geometry.'},
    {key:'OFFENSE_SINGLE_FIRE',category:'OFFENSIVE',label:'Fire Weapon Family',statKey:'OFFENSE',tempoKey:'TACTICAL',difficulty:50,costs:{ammunition:1,power:5,thermal:4},requirements:['coherent','weapons','fireControl'],description:'Execute one installed weapon-family engagement through its VESSEL-07 practical envelope.'},
    {key:'OFFENSE_SALVO',category:'OFFENSIVE',label:'Coordinated Salvo',statKey:'OFFENSE',tempoKey:'TACTICAL',difficulty:65,costs:{command:1,ammunition:2,power:10,thermal:8},requirements:['coherent','weapons','fireControl'],description:'Coordinate multiple ready mounts or rounds into one synchronized offensive action.'},
    {key:'OFFENSE_PRECISION_STRIKE',category:'OFFENSIVE',label:'Precision Strike',statKey:'TARGETING',tempoKey:'OPERATIONAL',difficulty:70,costs:{command:2,ammunition:1,power:7,thermal:5},requirements:['coherent','weapons','fireControl'],description:'Trade tempo and command attention for a higher-information attack against a selected local objective.'},
    {key:'DEFENSE_POINT_DEFENSE',category:'DEFENSIVE',label:'Point-Defense Intercept',statKey:'DEFENSE',tempoKey:'REACTION',difficulty:55,costs:{reaction:1,ammunition:1,power:5,thermal:3},requirements:['coherent','pointDefense'],description:'Allocate surviving point-defense or hard-kill channels against an immediate incoming threat.'},
    {key:'DEFENSE_COUNTERMEASURE',category:'DEFENSIVE',label:'Deploy Countermeasure',statKey:'DEFENSE',tempoKey:'REACTION',difficulty:45,costs:{reaction:1,ammunition:1},requirements:['coherent','countermeasures'],description:'Deploy decoys, jamming, interceptors, or species-specific active-defense machinery.'},
    {key:'DEFENSE_BRACE',category:'DEFENSIVE',label:'Brace for Impact',statKey:'DAMAGE_CONTROL',tempoKey:'REACTION',difficulty:40,costs:{reaction:1,command:1},requirements:['coherent','crew'],description:'Isolate zones, secure crew, and pre-position damage-control response before impact.'},
    {key:'DEFENSE_FIELD_REINFORCE',category:'DEFENSIVE',label:'Reinforce Directional Fields',statKey:'DEFENSE',tempoKey:'TACTICAL',difficulty:60,costs:{power:12,thermal:10},requirements:['coherent','protection'],description:'Bias available active protection toward one threatened facing at a power and thermal cost.'},
    {key:'ENGINEERING_REDIRECT_POWER',category:'ENGINEERING_DAMAGE_CONTROL',label:'Redirect Power',statKey:'ENGINEERING',tempoKey:'TACTICAL',difficulty:50,costs:{command:1},requirements:['coherent','power','data'],description:'Reroute surviving power capacity toward propulsion, sensors, protection, or weapons.'},
    {key:'ENGINEERING_THERMAL_PURGE',category:'ENGINEERING_DAMAGE_CONTROL',label:'Thermal Purge',statKey:'ENGINEERING',tempoKey:'OPERATIONAL',difficulty:55,costs:{power:4},requirements:['coherent','cooling'],description:'Recover thermal headroom by changing radiator posture, venting expendable coolant, or cycling heat stores.'},
    {key:'DAMAGE_CONTROL_REROUTE',category:'ENGINEERING_DAMAGE_CONTROL',label:'Reroute Severed Utility',statKey:'DAMAGE_CONTROL',tempoKey:'DAMAGE_CONTROL',difficulty:60,costs:{damageControlTeam:1,parts:1},requirements:['coherent','damage','access'],description:'Reconnect or bypass one severed utility route through surviving access and service paths.'},
    {key:'DAMAGE_CONTROL_SEAL_ZONE',category:'ENGINEERING_DAMAGE_CONTROL',label:'Seal Compromised Zone',statKey:'DAMAGE_CONTROL',tempoKey:'TACTICAL',difficulty:55,costs:{damageControlTeam:1},requirements:['coherent','zones','crew'],description:'Isolate a damaged pressure zone and preserve atmosphere, contamination, and crew-support authority.'},
    {key:'DAMAGE_CONTROL_REPAIR_MODULE',category:'ENGINEERING_DAMAGE_CONTROL',label:'Stabilize Damaged Module',statKey:'DAMAGE_CONTROL',tempoKey:'DAMAGE_CONTROL',difficulty:65,costs:{damageControlTeam:1,parts:1,power:3},requirements:['coherent','damage','access'],description:'Stop propagation, restore graph participation, or prepare a damaged module for later repair.'}
  ];
  const repairableFaults=['STAT_OUT_OF_RANGE','MISSING_SOURCE_LINK','UNAVAILABLE_ACTION_READY','RESOURCE_OVER_CAPACITY','SIMPLIFIED_DETAILED_DIVERGENCE'];
  const defaults={validationMode:'REPAIR',resolutionMode:'SIMPLIFIED',difficultyPercent:50,oppositionPercent:50,crewCoordinationPercent:65};
  globalThis.BlacklightExoVesselGameplayDefinitions=Object.freeze({
    phase:'VESSEL-09',schemaVersion:'1.0.0',validationModes,resolutionModes,statDefinitions,tempos,actionCategories,actionTemplates,repairableFaults,defaults,
    principles:[
      'Every normalized value retains weighted source links to prior engineering, graph, condition, track, weapon, and combat authority.',
      'Simplified and detailed resolution use the same deterministic percentile roll and success probability; detail changes explanation and consequences, not odds.',
      'Action availability follows surviving hardware, resources, crew support, and coherent graph state rather than narrative permission alone.',
      'VESSEL-09 derives an operable RPG layer without mutating VESSEL-05 condition history, VESSEL-07 weapon envelopes, or VESSEL-08 post-impact authority.',
      'Campaign persistence and the final diegetic interface remain deferred to VESSEL-10.'
    ]
  });
})();
