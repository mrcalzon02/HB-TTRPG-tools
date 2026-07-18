(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselWeaponDefinitions)return;
  const C=299792458;
  const bands=['pointDefense','practical','harassment','theoretical'];
  const validationModes=['REPAIR','STRICT'];
  const defaults={targetActiveDefensePercent:45,targetPointDefenseChannels:4,targetCountermeasureQualityPercent:55};
  const families={
    CHEMICAL_BALLISTIC:{key:'CHEMICAL_BALLISTIC',label:'Chemical ballistic weapons',mode:'KINETIC_UNGUIDED',minimumTechnologyRank:0,powerDependence:.12,baseVelocityMps:1800,rankMultiplier:1.18,baseDispersionMicrorad:24,maxFlightSeconds:900,pointDefenseMaxSeconds:5,baseCadenceSeconds:.55,guidanceFraction:0,referenceMountTonnes:4},
    RAIL_GUN:{key:'RAIL_GUN',label:'Rail guns',mode:'KINETIC_UNGUIDED',minimumTechnologyRank:0,powerDependence:.78,baseVelocityMps:12000,rankMultiplier:1.46,baseDispersionMicrorad:9,maxFlightSeconds:4800,pointDefenseMaxSeconds:3.5,baseCadenceSeconds:12,guidanceFraction:0,referenceMountTonnes:18},
    COIL_GUN:{key:'COIL_GUN',label:'Coil guns',mode:'KINETIC_GUIDED',minimumTechnologyRank:1,powerDependence:.72,baseVelocityMps:8500,rankMultiplier:1.40,baseDispersionMicrorad:11,maxFlightSeconds:3600,pointDefenseMaxSeconds:4,baseCadenceSeconds:6,guidanceFraction:.22,referenceMountTonnes:14},
    BRUTE_MASS_THROWER:{key:'BRUTE_MASS_THROWER',label:'Brute mass throwers',mode:'KINETIC_UNGUIDED',minimumTechnologyRank:0,powerDependence:.62,baseVelocityMps:2200,rankMultiplier:1.27,baseDispersionMicrorad:18,maxFlightSeconds:10800,pointDefenseMaxSeconds:0,baseCadenceSeconds:180,guidanceFraction:0,referenceMountTonnes:160},
    SAND_GUN:{key:'SAND_GUN',label:'Sand and particulate guns',mode:'PARTICULATE_CLOUD',minimumTechnologyRank:0,powerDependence:.38,baseVelocityMps:6500,rankMultiplier:1.31,baseDispersionMicrorad:145,maxFlightSeconds:900,pointDefenseMaxSeconds:7,baseCadenceSeconds:1.2,guidanceFraction:0,referenceMountTonnes:6},
    LASER:{key:'LASER',label:'Laser batteries',mode:'DIRECTED_ENERGY',minimumTechnologyRank:0,powerDependence:1,beamVelocityFraction:1,baseDivergenceMicrorad:13,baseDwellSeconds:2.4,maxDwellSeconds:14,referenceFluenceJm2:1.8e8,pointDefenseMaxSeconds:2.5,referenceMountTonnes:8},
    PARTICLE_BEAM:{key:'PARTICLE_BEAM',label:'Particle and C-beam arrays',mode:'DIRECTED_ENERGY',minimumTechnologyRank:3,powerDependence:1,beamVelocityFraction:.18,rankVelocityGain:.075,baseDivergenceMicrorad:19,baseDwellSeconds:1.8,maxDwellSeconds:10,referenceFluenceJm2:3.2e8,pointDefenseMaxSeconds:3,referenceMountTonnes:14},
    FRACTIONAL_C:{key:'FRACTIONAL_C',label:'Fractional-c kinetic installation',mode:'KINETIC_UNGUIDED',minimumTechnologyRank:5,powerDependence:1,baseVelocityFraction:.024,rankVelocityGain:.034,baseDispersionMicrorad:3.2,maxFlightSeconds:86400,pointDefenseMaxSeconds:0,baseCadenceSeconds:900,guidanceFraction:0,referenceMountTonnes:240},
    MISSILE:{key:'MISSILE',label:'Guided missile batteries',mode:'GUIDED_MISSILE',minimumTechnologyRank:0,powerDependence:.36,baseAccelerationMps2:22,accelerationRankMultiplier:1.62,baseDeltaVMps:6500,deltaVRankMultiplier:1.82,maxFlightSeconds:21600,seekerUpdateSeconds:2.8,guidanceFraction:.64,pointDefenseMaxSeconds:18,referenceMountTonnes:5}
  };
  const interceptor={key:'COUNTERMEASURE_MISSILE',label:'Hard-kill countermeasure missiles',mode:'GUIDED_INTERCEPTOR',minimumTechnologyRank:0,powerDependence:.42,baseAccelerationMps2:65,accelerationRankMultiplier:1.55,baseDeltaVMps:4200,deltaVRankMultiplier:1.72,maxFlightSeconds:2400,seekerUpdateSeconds:.55,guidanceFraction:.78,pointDefenseMaxSeconds:45,referenceMountTonnes:2};
  const technologySubsystems={
    common:['weapon-mounts','weapon-support','power','fire-control','sensors'],
    ammunition:['weapon-magazines'],
    thermal:['weapon-cooling','thermal'],
    countermeasure:['countermeasures','power','fire-control','sensors']
  };
  const basisModifiers={
    TERRESTRIAL_ELECTROMECHANICAL:{kinetic:1,beam:1,missile:1,thermal:1,guidance:1},
    AQUATIC_ELECTROCHEMICAL_HYDRAULIC:{kinetic:.97,beam:.93,missile:1.08,thermal:1.08,guidance:1.05},
    CRYOGENIC_AMMONIA_HALOCARBON:{kinetic:1.09,beam:1.05,missile:.98,thermal:1.13,guidance:1.06},
    GAS_GIANT_FLUIDIC_ELECTROSTATIC:{kinetic:.94,beam:.98,missile:1.12,thermal:1.06,guidance:1.09},
    BIOLOGICAL_SYMBIOTIC:{kinetic:.91,beam:.89,missile:1.15,thermal:1.03,guidance:1.13},
    MINERAL_PIEZOELECTRIC_PHOTONIC:{kinetic:1.08,beam:1.15,missile:.93,thermal:1.07,guidance:1.09},
    FIELD_MEDIATED_POSTMATERIAL:{kinetic:1.09,beam:1.17,missile:1.09,thermal:1.13,guidance:1.16}
  };
  const bandThresholds={pointDefense:72,practical:50,harassment:22,theoretical:0};
  const deferredSystems={localDamageResolution:'VESSEL-08',gameplayActions:'VESSEL-09'};
  const repairableFaults=['NEGATIVE_PRACTICAL_RANGE','BAND_ORDER_INVERSION','MISSING_HARDPOINT_LINK','OFFLINE_WEAPON_READY','ZERO_AMMUNITION_READY','TECHNOLOGY_AUTHORITY_MISMATCH','PREMATURE_IMPACT_RESOLUTION'];
  globalThis.BlacklightExoVesselWeaponDefinitions=Object.freeze({schemaVersion:'1.1.0',phase:'VESSEL-07',speedOfLightMps:C,bands,validationModes,defaults,families,interceptor,technologySubsystems,basisModifiers,bandThresholds,deferredSystems,repairableFaults});
})();