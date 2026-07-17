(() => {
  'use strict';
  if (globalThis.BlacklightExoVesselDefinitions) return;

  const roles = [
    {key:'courier',label:'Courier / dispatch vessel',description:'Prioritizes transit response, navigation authority, and a small protected payload.',crew:0.72,payloadDrive:0.08,structure:0.42,maneuver:0.18,shield:0.82,sensors:1.18,maintenance:0.88,habitability:0.82,shape:7.2,cargoDensity:0.42},
    {key:'explorer',label:'Exploration vessel',description:'Carries long-duration science, survey, repair, and independent navigation capability.',crew:1.0,payloadDrive:0.20,structure:0.52,maneuver:0.22,shield:1.12,sensors:1.62,maintenance:1.25,habitability:1.34,shape:5.6,cargoDensity:0.34},
    {key:'merchant',label:'Merchant freighter',description:'Maximizes useful cargo while preserving commercial maintenance and schedule margins.',crew:0.82,payloadDrive:0.72,structure:0.46,maneuver:0.16,shield:0.82,sensors:0.82,maintenance:1.0,habitability:1.0,shape:4.8,cargoDensity:0.58},
    {key:'passenger',label:'Passenger transport',description:'Adds pressure-zone redundancy, evacuation capacity, comfort volume, and conservative reserves.',crew:1.18,payloadDrive:0.48,structure:0.50,maneuver:0.17,shield:1.28,sensors:0.94,maintenance:1.08,habitability:1.62,shape:4.4,cargoDensity:0.32},
    {key:'colony',label:'Colony transport',description:'Carries population, fabrication stock, ecological reserves, and large independent survival systems.',crew:1.42,payloadDrive:1.18,structure:0.61,maneuver:0.18,shield:1.32,sensors:1.06,maintenance:1.28,habitability:1.78,shape:4.0,cargoDensity:0.38},
    {key:'science',label:'Scientific research vessel',description:'Emphasizes laboratories, clean power, sensor baselines, quarantine, and configurable mission bays.',crew:1.02,payloadDrive:0.32,structure:0.52,maneuver:0.18,shield:1.0,sensors:1.86,maintenance:1.20,habitability:1.30,shape:5.1,cargoDensity:0.30},
    {key:'warship',label:'Naval combat vessel',description:'Adds armor, defensive fields, redundant command, damage control, combat maneuver, and weapon margin.',crew:1.12,payloadDrive:0.34,structure:0.74,maneuver:0.31,shield:2.18,sensors:1.72,maintenance:1.42,habitability:0.92,shape:6.3,cargoDensity:0.46},
    {key:'tanker',label:'Fuel and coolant tanker',description:'Carries protected energy media, coolant, transfer machinery, and replenishment reserves for other vessels.',crew:0.76,payloadDrive:1.62,structure:0.51,maneuver:0.15,shield:0.94,sensors:0.78,maintenance:1.12,habitability:0.90,shape:5.3,cargoDensity:0.66}
  ];

  const biology = [
    {key:'human-standard',label:'Oxygen-water terrestrial',medium:'gas',pressureKPa:101.3,temperatureK:294,gravityG:1,mediumDensityKgM3:1.2,occupiedMediumFraction:1,habitatM3:34,lifeSupportW:720,climateWm3:18,waterKgDay:3.2,nutritionKgDay:1.05,recoveryBase:.94,equipmentKgCrew:480,infrastructureKgM3:34,medicalKgCrew:145,bodyScale:1,segregatedZones:1,notes:'Breathable oxygen-nitrogen analogue, liquid-water loop, ordinary terrestrial pressure and gravity.'},
    {key:'aquatic',label:'Aquatic pressure habitat',medium:'liquid',pressureKPa:220,temperatureK:286,gravityG:.82,mediumDensityKgM3:1000,occupiedMediumFraction:.58,habitatM3:58,lifeSupportW:1680,climateWm3:34,waterKgDay:7.5,nutritionKgDay:1.35,recoveryBase:.985,equipmentKgCrew:960,infrastructureKgM3:62,medicalKgCrew:260,bodyScale:1.15,segregatedZones:1,notes:'Large recirculating liquid habitat with dissolved-gas control, pressure management, and high structural fluid mass.'},
    {key:'ammonia',label:'Cryogenic ammonia biosphere',medium:'liquid',pressureKPa:165,temperatureK:182,gravityG:.72,mediumDensityKgM3:680,occupiedMediumFraction:.46,habitatM3:52,lifeSupportW:1920,climateWm3:48,waterKgDay:5.8,nutritionKgDay:1.2,recoveryBase:.982,equipmentKgCrew:1180,infrastructureKgM3:76,medicalKgCrew:300,bodyScale:1.05,segregatedZones:1,notes:'Cryogenic ammonia solvent loop requiring deep thermal isolation and chemically separated machinery.'},
    {key:'hydrocarbon',label:'Cryogenic hydrocarbon biosphere',medium:'liquid',pressureKPa:185,temperatureK:104,gravityG:.48,mediumDensityKgM3:540,occupiedMediumFraction:.44,habitatM3:60,lifeSupportW:2140,climateWm3:54,waterKgDay:4.8,nutritionKgDay:1.1,recoveryBase:.984,equipmentKgCrew:1260,infrastructureKgM3:82,medicalKgCrew:320,bodyScale:1.08,segregatedZones:1,notes:'Methane or hydrocarbon solvent habitat with cryogenic seals, nonaqueous bioprocessing, and isolated heat rejection.'},
    {key:'high-gravity',label:'High-gravity terrestrial',medium:'gas',pressureKPa:132,temperatureK:302,gravityG:1.82,mediumDensityKgM3:1.55,occupiedMediumFraction:1,habitatM3:30,lifeSupportW:890,climateWm3:22,waterKgDay:3.8,nutritionKgDay:1.35,recoveryBase:.95,equipmentKgCrew:610,infrastructureKgM3:52,medicalKgCrew:210,bodyScale:1.08,segregatedZones:1,notes:'Dense atmosphere and reinforced decks arranged around sustained high local gravity.'},
    {key:'low-gravity',label:'Low-gravity / spin-dependent',medium:'gas',pressureKPa:82,temperatureK:289,gravityG:.28,mediumDensityKgM3:.95,occupiedMediumFraction:1,habitatM3:46,lifeSupportW:780,climateWm3:17,waterKgDay:3,nutritionKgDay:.95,recoveryBase:.95,equipmentKgCrew:540,infrastructureKgM3:42,medicalKgCrew:190,bodyScale:.92,segregatedZones:1,notes:'Requires low-gravity accommodation or rotating habitat sections rather than ordinary fixed decks.'},
    {key:'toxic-atmosphere',label:'Reactive / toxic atmosphere',medium:'gas',pressureKPa:145,temperatureK:318,gravityG:1.08,mediumDensityKgM3:1.75,occupiedMediumFraction:1,habitatM3:40,lifeSupportW:1240,climateWm3:29,waterKgDay:3.6,nutritionKgDay:1.18,recoveryBase:.96,equipmentKgCrew:830,infrastructureKgM3:58,medicalKgCrew:245,bodyScale:1.04,segregatedZones:1,notes:'Corrosive or toxic breathing medium requiring compatible seals, scrubbers, suit locks, and segregated human-safe machinery spaces.'},
    {key:'multispecies',label:'Multi-species segregated habitat',medium:'mixed',pressureKPa:110,temperatureK:292,gravityG:.86,mediumDensityKgM3:1.25,occupiedMediumFraction:1,habitatM3:72,lifeSupportW:1850,climateWm3:32,waterKgDay:5.2,nutritionKgDay:1.7,recoveryBase:.965,equipmentKgCrew:1280,infrastructureKgM3:70,medicalKgCrew:360,bodyScale:1.18,segregatedZones:4,notes:'Multiple independently isolated pressure, chemistry, thermal, and microbiological zones connected through transfer locks.'},
    {key:'synthetic',label:'Synthetic / mineral metabolism',medium:'inert',pressureKPa:18,temperatureK:306,gravityG:.35,mediumDensityKgM3:.22,occupiedMediumFraction:1,habitatM3:18,lifeSupportW:520,climateWm3:12,waterKgDay:.18,nutritionKgDay:2.4,recoveryBase:.995,equipmentKgCrew:390,infrastructureKgM3:30,medicalKgCrew:420,bodyScale:.88,segregatedZones:1,notes:'Low-pressure service environment emphasizing electrical power, repair feedstock, contamination control, and component cooling.'}
  ];

  const defenses = [
    {key:'civilian',label:'Civilian certified',arealKgM2:85,fieldFactor:.72,redundancy:1,margin:.10,description:'Commercial radiation, debris, and transit-field protection with limited battle damage allowance.'},
    {key:'hardened',label:'Deep-range hardened',arealKgM2:165,fieldFactor:1.12,redundancy:1.35,margin:.13,description:'Independent exploration and frontier service with storm sheltering, duplicated pressure zones, and stronger field isolation.'},
    {key:'naval',label:'Naval combat standard',arealKgM2:340,fieldFactor:1.85,redundancy:1.72,margin:.16,description:'Layered armor, defensive fields, compartmentation, damage control, and combat-tolerant routing.'}
  ];

  const pathEngineering = [
    {rank:0,specificContinuousWKg:4e4,thermalJkg:2.2e6,radiatorKgMW:5200,structureFactor:1.00,compactness:1.00,automation:.08,margin:.24},
    {rank:1,specificContinuousWKg:1.6e5,thermalJkg:4e6,radiatorKgMW:2800,structureFactor:.88,compactness:.82,automation:.16,margin:.21},
    {rank:2,specificContinuousWKg:8e5,thermalJkg:1.1e7,radiatorKgMW:1250,structureFactor:.72,compactness:.64,automation:.30,margin:.18},
    {rank:3,specificContinuousWKg:4e6,thermalJkg:3.4e7,radiatorKgMW:560,structureFactor:.56,compactness:.48,automation:.46,margin:.15},
    {rank:4,specificContinuousWKg:2e7,thermalJkg:9e7,radiatorKgMW:220,structureFactor:.42,compactness:.34,automation:.64,margin:.12},
    {rank:5,specificContinuousWKg:1.2e8,thermalJkg:2.8e8,radiatorKgMW:78,structureFactor:.30,compactness:.23,automation:.82,margin:.10},
    {rank:6,specificContinuousWKg:9e8,thermalJkg:1.2e9,radiatorKgMW:22,structureFactor:.21,compactness:.15,automation:.94,margin:.08}
  ];

  const energyContainment = {
    'fusion-bank':{label:'fusion pulse fuel and reaction-mass plant',supportMultiplier:1.25,minDriveFraction:.018,densityKgM3:180},
    antimatter:{label:'antimatter isolation and annihilation-feed system',supportMultiplier:6.5,minDriveFraction:.045,densityKgM3:65},
    singularity:{label:'micro-singularity containment, feedstock, and Hawking conversion plant',supportMultiplier:11,minDriveFraction:.07,densityKgM3:1200},
    'vacuum-cell':{label:'vacuum-polarization cell magazine and conditioning plant',supportMultiplier:2.8,minDriveFraction:.032,densityKgM3:420},
    'q-condensate':{label:'Q-state condensate containment and phase-conditioned transfer plant',supportMultiplier:7.8,minDriveFraction:.055,densityKgM3:260},
    'star-fed':{label:'stellar tap conditioning and emergency local reserve',supportMultiplier:.55,minDriveFraction:.012,densityKgM3:500}
  };

  globalThis.BlacklightExoVesselDefinitions = Object.freeze({roles,biology,defenses,pathEngineering,energyContainment});
})();
