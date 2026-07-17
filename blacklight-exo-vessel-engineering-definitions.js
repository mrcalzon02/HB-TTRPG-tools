(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselEngineeringDefinitions)return;

  const propulsionByRank=[
    {rank:0,key:'PULSED_FISSION_THERMAL',label:'Pulsed fission-thermal maneuver drive',propellant:'water, hydrogen, or compatible reaction mass',exhaustVelocityMps:25000,efficiency:.34,specificPowerWKg:2e5,maxEngineAccelerationG:.08,heatFraction:.56,propellantDensityKgM3:620,baseStrategicDeltaVMps:6000},
    {rank:1,key:'FUSION_THERMAL',label:'Fusion-thermal maneuver drive',propellant:'light-element fusion reaction mass',exhaustVelocityMps:80000,efficiency:.42,specificPowerWKg:8e5,maxEngineAccelerationG:.18,heatFraction:.49,propellantDensityKgM3:700,baseStrategicDeltaVMps:18000},
    {rank:2,key:'FUSION_PLASMA',label:'Fusion-plasma maneuver drive',propellant:'magnetically accelerated fusion plasma',exhaustVelocityMps:250000,efficiency:.51,specificPowerWKg:4e6,maxEngineAccelerationG:.55,heatFraction:.42,propellantDensityKgM3:860,baseStrategicDeltaVMps:50000},
    {rank:3,key:'ADVANCED_FUSION_TORCH',label:'Advanced fusion torch',propellant:'high-temperature fusion reaction mass',exhaustVelocityMps:900000,efficiency:.61,specificPowerWKg:2e7,maxEngineAccelerationG:1.6,heatFraction:.35,propellantDensityKgM3:1050,baseStrategicDeltaVMps:140000},
    {rank:4,key:'ANEUTRONIC_FUSION_TORCH',label:'Aneutronic fusion torch',propellant:'dense aneutronic fusion reaction mass',exhaustVelocityMps:3000000,efficiency:.70,specificPowerWKg:1e8,maxEngineAccelerationG:4.5,heatFraction:.29,propellantDensityKgM3:1350,baseStrategicDeltaVMps:400000},
    {rank:5,key:'ANTIMATTER_CATALYZED_PLASMA',label:'Antimatter-catalyzed plasma torch',propellant:'catalyzed high-energy plasma reaction mass',exhaustVelocityMps:12000000,efficiency:.79,specificPowerWKg:6e8,maxEngineAccelerationG:13,heatFraction:.23,propellantDensityKgM3:1850,baseStrategicDeltaVMps:1400000},
    {rank:6,key:'FIELD_COUPLED_RELATIVISTIC_TORCH',label:'Field-coupled relativistic torch',propellant:'field-conditioned relativistic reaction mass',exhaustVelocityMps:45000000,efficiency:.88,specificPowerWKg:4e9,maxEngineAccelerationG:32,heatFraction:.18,propellantDensityKgM3:2600,baseStrategicDeltaVMps:5000000}
  ];

  const roleMobility={
    courier:{strategicMultiplier:1.28,combatReserveFraction:.24,accelerationMultiplier:1.35,vectoringFraction:.68,crewLimitMultiplier:1.12},
    explorer:{strategicMultiplier:1.16,combatReserveFraction:.18,accelerationMultiplier:.82,vectoringFraction:.56,crewLimitMultiplier:.92},
    merchant:{strategicMultiplier:.88,combatReserveFraction:.09,accelerationMultiplier:.48,vectoringFraction:.42,crewLimitMultiplier:.78},
    passenger:{strategicMultiplier:.92,combatReserveFraction:.12,accelerationMultiplier:.46,vectoringFraction:.44,crewLimitMultiplier:.62},
    colony:{strategicMultiplier:.74,combatReserveFraction:.06,accelerationMultiplier:.30,vectoringFraction:.34,crewLimitMultiplier:.52},
    science:{strategicMultiplier:1.02,combatReserveFraction:.14,accelerationMultiplier:.62,vectoringFraction:.50,crewLimitMultiplier:.82},
    warship:{strategicMultiplier:1.12,combatReserveFraction:.36,accelerationMultiplier:1.62,vectoringFraction:.76,crewLimitMultiplier:1.28},
    tanker:{strategicMultiplier:.78,combatReserveFraction:.07,accelerationMultiplier:.36,vectoringFraction:.38,crewLimitMultiplier:.68}
  };

  const combatFits={
    UNARMED:{key:'UNARMED',label:'Unarmed utility fit',payloadShare:0,marginShare:0,countermeasureFraction:0,maxWeaponFamilies:0,fireControlShare:.05,ewShare:.08},
    CIVILIAN:{key:'CIVILIAN',label:'Civilian defensive fit',payloadShare:0,marginShare:.08,countermeasureFraction:.64,maxWeaponFamilies:1,fireControlShare:.08,ewShare:.12},
    DEFENSIVE:{key:'DEFENSIVE',label:'Deep-range defensive fit',payloadShare:.03,marginShare:.26,countermeasureFraction:.44,maxWeaponFamilies:2,fireControlShare:.13,ewShare:.14},
    SECURITY:{key:'SECURITY',label:'Armed security fit',payloadShare:.14,marginShare:.48,countermeasureFraction:.28,maxWeaponFamilies:3,fireControlShare:.18,ewShare:.14},
    NAVAL:{key:'NAVAL',label:'Naval combat fit',payloadShare:.58,marginShare:.74,countermeasureFraction:.20,maxWeaponFamilies:4,fireControlShare:.24,ewShare:.13}
  };

  const roleCombatFit={courier:'SECURITY',explorer:'DEFENSIVE',merchant:'CIVILIAN',passenger:'CIVILIAN',colony:'DEFENSIVE',science:'DEFENSIVE',warship:'NAVAL',tanker:'CIVILIAN'};

  const weaponFamilies={
    CHEMICAL_BALLISTIC:{key:'CHEMICAL_BALLISTIC',label:'Chemical ballistic weapons',aliases:['chemical ballistics'],minimumRank:0,mountFraction:.28,supportFraction:.14,magazineFraction:.48,coolingFraction:.10,powerFactor:.03,dutyCycle:.28,heatFraction:.20,unitRoundMassTonnes:.008,preferredTargets:['missiles','debris','boarding craft','nearby lightly protected targets']},
    RAIL_GUN:{key:'RAIL_GUN',label:'Rail guns',aliases:['rail guns'],minimumRank:0,mountFraction:.30,supportFraction:.24,magazineFraction:.22,coolingFraction:.24,powerFactor:.54,dutyCycle:.13,heatFraction:.58,unitRoundMassTonnes:.12,preferredTargets:['large ships','stations','predictable trajectories']},
    COIL_GUN:{key:'COIL_GUN',label:'Coil guns',aliases:['coil guns'],minimumRank:1,mountFraction:.28,supportFraction:.26,magazineFraction:.22,coolingFraction:.24,powerFactor:.48,dutyCycle:.18,heatFraction:.50,unitRoundMassTonnes:.09,preferredTargets:['ships','missiles','course-correcting kinetic rounds']},
    BRUTE_MASS_THROWER:{key:'BRUTE_MASS_THROWER',label:'Brute mass throwers',aliases:['brute mass throwers'],minimumRank:0,mountFraction:.36,supportFraction:.20,magazineFraction:.34,coolingFraction:.10,powerFactor:.34,dutyCycle:.03,heatFraction:.36,unitRoundMassTonnes:8,preferredTargets:['stations','moons','disabled ships','fixed infrastructure']},
    SAND_GUN:{key:'SAND_GUN',label:'Sand and particulate guns',aliases:['sand guns'],minimumRank:0,mountFraction:.22,supportFraction:.18,magazineFraction:.50,coolingFraction:.10,powerFactor:.08,dutyCycle:.24,heatFraction:.22,unitRoundMassTonnes:.018,preferredTargets:['missiles','radiators','sensors','exposed modules']},
    LASER:{key:'LASER',label:'Laser batteries',aliases:['lasers'],minimumRank:0,mountFraction:.24,supportFraction:.32,magazineFraction:.02,coolingFraction:.42,powerFactor:.82,dutyCycle:.32,heatFraction:.68,unitRoundMassTonnes:0,preferredTargets:['missiles','sensors','radiators','nearby ships']},
    PARTICLE_BEAM:{key:'PARTICLE_BEAM',label:'Particle and C-beam arrays',aliases:['particle beams','c-beams'],minimumRank:3,mountFraction:.28,supportFraction:.34,magazineFraction:.02,coolingFraction:.36,powerFactor:1.0,dutyCycle:.20,heatFraction:.72,unitRoundMassTonnes:0,preferredTargets:['electronics','sensors','radiators','exposed modules']},
    FRACTIONAL_C:{key:'FRACTIONAL_C',label:'Fractional-c kinetic installation',aliases:['fractional-c kinetics'],minimumRank:5,mountFraction:.42,supportFraction:.28,magazineFraction:.16,coolingFraction:.14,powerFactor:1.35,dutyCycle:.01,heatFraction:.62,unitRoundMassTonnes:.04,preferredTargets:['fixed targets','constrained ships','strategic infrastructure']},
    MISSILE:{key:'MISSILE',label:'Guided missile batteries',aliases:['missiles'],minimumRank:0,mountFraction:.18,supportFraction:.18,magazineFraction:.56,coolingFraction:.08,powerFactor:.12,dutyCycle:.12,heatFraction:.18,unitRoundMassTonnes:1.8,preferredTargets:['ships','stations','missiles','distributed targets']}
  };

  const defaultWeaponPriority={
    courier:['MISSILE','LASER','COIL_GUN','CHEMICAL_BALLISTIC'],
    explorer:['MISSILE','LASER','SAND_GUN','COIL_GUN'],
    merchant:['LASER','CHEMICAL_BALLISTIC','MISSILE','SAND_GUN'],
    passenger:['LASER','MISSILE','CHEMICAL_BALLISTIC','SAND_GUN'],
    colony:['MISSILE','LASER','SAND_GUN','COIL_GUN'],
    science:['LASER','MISSILE','PARTICLE_BEAM','SAND_GUN'],
    warship:['MISSILE','COIL_GUN','RAIL_GUN','LASER','SAND_GUN','PARTICLE_BEAM','FRACTIONAL_C'],
    tanker:['LASER','MISSILE','CHEMICAL_BALLISTIC','SAND_GUN']
  };

  const countermeasureTypes={
    INTERCEPTOR:{key:'INTERCEPTOR',label:'Hard-kill interceptor missiles',massFraction:.44,launcherFraction:.18,unitMassTonnes:.42,powerWPerTonne:1.8e5,functions:['hard-kill interception','illumination and track confirmation','escort of offensive missile salvos']},
    DECOY:{key:'DECOY',label:'Decoy and signature-emulation packages',massFraction:.18,launcherFraction:.12,unitMassTonnes:.09,powerWPerTonne:2.4e5,functions:['sensor spoofing','false-target generation','remote signature projection']},
    ELECTRONIC:{key:'ELECTRONIC',label:'Electronic attack and remote jamming units',massFraction:.22,launcherFraction:.28,unitMassTonnes:.16,powerWPerTonne:1.6e6,functions:['remote jamming','sensor deception','counter-countermeasure support']},
    PARTICULATE:{key:'PARTICULATE',label:'Chaff, dust, plasma, and fragment screens',massFraction:.16,launcherFraction:.15,unitMassTonnes:.12,powerWPerTonne:8e4,functions:['particulate screening','laser attenuation','sacrificial collision','corridor denial']}
  };

  const armorLayerFractions={
    civilian:{debris:.34,structural:.22,radiation:.28,thermal:.10,citadel:.06},
    hardened:{debris:.24,structural:.28,radiation:.25,thermal:.12,citadel:.11},
    naval:{debris:.17,structural:.35,radiation:.16,thermal:.14,citadel:.18}
  };

  const sensorByRank=[
    {rank:0,apertureKgM2:110,channelMassTonnes:4.8,stabilizationMicrorad:42,processingFactor:1},
    {rank:1,apertureKgM2:82,channelMassTonnes:3.4,stabilizationMicrorad:24,processingFactor:2.2},
    {rank:2,apertureKgM2:56,channelMassTonnes:2.2,stabilizationMicrorad:12,processingFactor:5},
    {rank:3,apertureKgM2:36,channelMassTonnes:1.35,stabilizationMicrorad:5.5,processingFactor:12},
    {rank:4,apertureKgM2:22,channelMassTonnes:.82,stabilizationMicrorad:2.2,processingFactor:30},
    {rank:5,apertureKgM2:12,channelMassTonnes:.42,stabilizationMicrorad:.8,processingFactor:80},
    {rank:6,apertureKgM2:6,channelMassTonnes:.20,stabilizationMicrorad:.25,processingFactor:220}
  ];

  globalThis.BlacklightExoVesselEngineeringDefinitions=Object.freeze({
    schemaVersion:'1.0.0',
    propulsionByRank,
    roleMobility,
    combatFits,
    roleCombatFit,
    weaponFamilies,
    defaultWeaponPriority,
    countermeasureTypes,
    armorLayerFractions,
    sensorByRank
  });
})();
