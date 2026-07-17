(() => {
  'use strict';
  if (globalThis.BlacklightExoVessel) return;
  const FTL = globalThis.BlacklightExoFTL;
  const D = globalThis.BlacklightExoVesselDefinitions;
  const B = globalThis.BlacklightExoVesselBiology;
  if (!FTL || !D || !B) return;

  const roleMap = Object.fromEntries(D.roles.map(item => [item.key,item]));
  const defenseMap = Object.fromEntries(D.defenses.map(item => [item.key,item]));
  const pathMap = Object.fromEntries(D.pathEngineering.map(item => [item.rank,item]));
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const finite = (value,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clone = value => value == null ? value : structuredClone(value);
  const sum = rows => rows.reduce((total,row) => total + finite(row.massTonnes),0);
  const round = (value,digits=3) => Number(finite(value).toFixed(digits));
  const fmt = (value,digits=3) => finite(value).toLocaleString(undefined,{maximumFractionDigits:digits});
  function massText(tonnes) {
    const value = Math.max(0,finite(tonnes));
    if (value >= 1e12) return `${fmt(value/1e12,3)} trillion tonnes`;
    if (value >= 1e9) return `${fmt(value/1e9,3)} billion tonnes`;
    if (value >= 1e6) return `${fmt(value/1e6,3)} million tonnes`;
    if (value >= 1e3) return `${fmt(value/1e3,3)} thousand tonnes`;
    if (value >= 1) return `${fmt(value,3)} tonnes`;
    return `${fmt(value*1000,3)} kg`;
  }
  const powerText = watts => FTL.format?.powerText ? FTL.format.powerText(finite(watts)) : `${fmt(watts)} W`;
  const energyText = joules => FTL.format?.energyText ? FTL.format.energyText(finite(joules)) : `${fmt(joules)} J`;
  const secondsText = seconds => FTL.format?.secondsToText ? FTL.format.secondsToText(finite(seconds)) : `${fmt(seconds)} s`;

  function randomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2); globalThis.crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function pathLevel(input, inherited) {
    const key = input.pathLevel && input.pathLevel !== 'inherit' ? input.pathLevel : inherited?.pathLevel?.key || inherited?.identity?.pathLevelKey || 'p4';
    return (FTL.pathLevels || []).find(item => item.key === key) || (FTL.pathLevels || [])[4] || {key:'p4',rank:4,label:'Fleet Operational Standard'};
  }

  function scaleFor(familyKey, rank, roleKey) {
    if (familyKey === 'wormhole-gate') return 'megastructure';
    if (rank <= 2) return 'megastructure';
    if (rank === 3) return 'capital';
    if (rank === 4) return ['warship','colony','tanker'].includes(roleKey) ? 'capital' : 'frigate';
    if (rank === 5) return ['courier','science'].includes(roleKey) ? 'shuttle' : 'corvette';
    return roleKey === 'courier' ? 'fighter' : roleKey === 'warship' ? 'corvette' : 'shuttle';
  }

  function infrastructureFor(familyKey, rank) {
    if (familyKey === 'wormhole-gate') return 'fixed-gate';
    if (rank <= 2) return ['fold-jump','phase-displacement'].includes(familyKey) ? 'paired-gate' : 'corridor';
    return 'self-contained';
  }

  function sourceRecord(source) {
    if (!source) return null;
    if (source.route?.rating) return {rating:source.route.rating,dossier:source.dossier || source.biology || null,route:source.route};
    return {rating:source.ftl || source.rating || null,dossier:source.dossier || source.biology || null,route:source.route || null};
  }

  function generateRating(seed,input,source,level,role) {
    const inherited = sourceRecord(source)?.rating;
    const requestedFamily = input.family && input.family !== 'inherit' ? input.family : inherited?.identity?.familyKey || 'metric-envelope';
    const inheritedLevel = inherited?.pathLevel?.key || inherited?.identity?.pathLevelKey;
    const requestedLevel = input.pathLevel && input.pathLevel !== 'inherit' ? input.pathLevel : inheritedLevel || level.key;
    const distanceLy = Math.max(.000001,finite(input.distanceLy,sourceRecord(source)?.route?.effectiveDistanceLy || inherited?.performance?.referenceDistanceAU / finite(FTL.constants?.LY_AU,63241.077084) || 4));
    if (inherited?.constructionAssembly && requestedFamily === inherited.identity?.familyKey && requestedLevel === inheritedLevel && Math.abs(distanceLy - finite(inherited.performance?.referenceDistanceAU)/finite(FTL.constants?.LY_AU,63241.077084)) < 1e-8) return clone(inherited);
    return FTL.generate(`${seed}:vessel-drive`,{
      family:requestedFamily,
      pathLevel:requestedLevel,
      scale:scaleFor(requestedFamily,level.rank,role.key),
      infrastructure:infrastructureFor(requestedFamily,level.rank),
      route:'deep-space',doctrine:role.key === 'warship' ? 'tactical' : role.key === 'courier' ? 'speed' : 'balanced',
      energy:'random',distance:distanceLy,distanceUnit:'ly'
    },source?.dossier ? {type:'dossier',dossier:source.dossier} : null);
  }

  function lifeSupportModel(profile, crew, enduranceDays, role, tech) {
    const recovery = clamp(profile.recoveryBase + tech.rank * .007,profile.recoveryBase,.9995);
    const size = profile.sizeFactor;
    const gravityStructure = 1 + Math.max(0,profile.gravityG - 1) * .34 + (profile.key === 'low-gravity' ? .16 : 0);
    const zones = Math.max(1,profile.segregatedZones);
    const volumeM3 = crew * profile.habitatM3 * size * role.habitability * (1 + (zones-1)*.08);
    const mediumMassKg = volumeM3 * profile.mediumDensityKgM3 * profile.occupiedMediumFraction * (profile.pressureKPa/101.3);
    const solventReserveKg = crew * profile.waterKgDay * enduranceDays * Math.max(.002,1-recovery) * 1.35 * size;
    const nutritionKg = crew * profile.nutritionKgDay * enduranceDays * profile.dormancyFactor * 1.22 * size;
    const equipmentKg = crew * profile.equipmentKgCrew * size + volumeM3 * profile.infrastructureKgM3 * tech.compactness * gravityStructure;
    const medicalKg = crew * profile.medicalKgCrew * profile.regenerationFactor * (1 + (zones-1)*.18);
    const pressureAndHabitatKg = volumeM3 * 62 * tech.structureFactor * gravityStructure;
    const powerW = crew * profile.lifeSupportW * size + volumeM3 * profile.climateWm3 * (profile.medium === 'liquid' ? 1.25 : 1);
    const massTonnes = (mediumMassKg + solventReserveKg + nutritionKg + equipmentKg + medicalKg + pressureAndHabitatKg)/1000;
    return {
      profile,crew,enduranceDays,recoveryPercent:recovery*100,volumeM3,mediumMassTonnes:mediumMassKg/1000,solventReserveTonnes:solventReserveKg/1000,nutritionTonnes:nutritionKg/1000,equipmentTonnes:equipmentKg/1000,medicalTonnes:medicalKg/1000,pressureAndHabitatTonnes:pressureAndHabitatKg/1000,massTonnes,powerW,
      zones,
      requirements:[
        `${zones} independently isolatable environmental zone${zones===1?'':'s'} at ${fmt(profile.pressureKPa,1)} kPa and ${fmt(profile.temperatureK,1)} K.`,
        `${fmt(volumeM3,1)} m³ net inhabited volume supporting ${fmt(profile.gravityG,2)} g nominal local gravity.`,
        `${fmt(recovery*100,2)}% nominal solvent recovery with ${massText(solventReserveKg/1000)} unrecovered solvent reserve and ${massText(nutritionKg/1000)} nutrition or repair feedstock.`,
        profile.notes,
        profile.confidenceNote
      ]
    };
  }

  function energyKey(rating) {
    return rating.compatibility?.resolved?.energy || ({
      'Fusion pulse banks':'fusion-bank','Antimatter-catalyzed plant':'antimatter','Contained micro-singularity':'singularity','Vacuum-polarization cells':'vacuum-cell','Q-state condensate reservoir':'q-condensate','Direct stellar power and mass tap':'star-fed'
    })[rating.identity?.energySystem] || 'fusion-bank';
  }

  function geometryFromVolume(volumeM3,shape) {
    const ratioH = .72;
    const beam = Math.cbrt(Math.max(1,volumeM3)/(Math.PI/6*shape*ratioH));
    const length = beam*shape, height = beam*ratioH;
    return {lengthM:length,beamM:beam,heightM:height,decks:Math.max(1,Math.round(height/4.2)),surfaceAreaM2:Math.PI*beam*(length+height)*.74};
  }

  function generate(seedValue,input={},source=null) {
    const seed = String(seedValue || input.seed || randomSeed());
    const role = roleMap[input.role] || roleMap.explorer;
    const defense = defenseMap[input.defense] || defenseMap.hardened;
    const inherited = sourceRecord(source)?.rating;
    const level = pathLevel(input,inherited);
    const tech = pathMap[level.rank] || pathMap[4];
    const rating = generateRating(seed,input,source,level,role);
    const resolvedLevel = rating.pathLevel || level;
    const resolvedTech = pathMap[finite(resolvedLevel.rank,level.rank)] || tech;
    const crew = Math.max(1,Math.round(finite(input.crew,40)));
    const enduranceDays = Math.max(1,finite(input.enduranceDays,180));
    const reserveJumps = Math.max(1,Math.round(finite(input.reserveJumps,3)));
    const biology = B.resolve(input,sourceRecord(source)?.dossier ? {dossier:sourceRecord(source).dossier} : null);
    const lifeSupport = lifeSupportModel(biology,crew,enduranceDays,role,resolvedTech);

    const assembly = rating.constructionAssembly || {};
    const apparatusMass = Math.max(.001,finite(assembly.totalApparatusMassTonnes,rating.pathLevel?.facilityMassTonnes || rating.power?.referenceMassTonnes || 1));
    const apparatusVolume = Math.max(.1,finite(assembly.modeledInstalledVolumeM3,apparatusMass/Math.max(.1,finite(assembly.installedDensityTonnesM3,1))));
    const assemblySpares = Math.max(0,finite(assembly.productionEstimate?.recommendedSpareMassTonnes,apparatusMass*.05));
    const integrationFactor = [.46,.39,.31,.24,.18,.14,.10][resolvedLevel.rank] || .18;
    const driveIntegration = apparatusMass*integrationFactor;
    const driveMass = apparatusMass + driveIntegration;
    const driveVolume = apparatusVolume*(1.42-resolvedLevel.rank*.045);

    const missionFuelKg = Math.max(0,finite(rating.energyBudget?.missionFuelKg,rating.power?.fuelKg));
    const reserveFraction = clamp(finite(rating.range?.reserveFraction,.25),.08,.5);
    const carriedFuelTonnes = missionFuelKg/1000*reserveJumps*(1+reserveFraction);
    const eKey = energyKey(rating);
    const containment = D.energyContainment[eKey] || D.energyContainment['fusion-bank'];
    const fuelSupportTonnes = Math.max(carriedFuelTonnes*containment.supportMultiplier,apparatusMass*containment.minDriveFraction);
    const fuelSystemTonnes = carriedFuelTonnes + fuelSupportTonnes;
    const fuelVolumeM3 = Math.max(1,carriedFuelTonnes*1000/containment.densityKgM3)*1.35;

    const missionJ = Math.max(1,finite(rating.energyBudget?.missionJ,rating.power?.activationJ));
    const peakPowerW = Math.max(1,finite(rating.energyBudget?.peakPowerW,rating.power?.averagePowerW));
    const rechargeSeconds = Math.max(1,finite(rating.energyBudget?.rechargeSeconds,missionJ/Math.max(1,finite(rating.power?.averagePowerW))));
    const rechargePowerW = missionJ/rechargeSeconds;
    const thermalJ = Math.max(0,finite(rating.energyBudget?.thermalDebtJ,rating.power?.wasteJ));
    const hotelSensorsW = Math.max(2e5,apparatusMass*1e6*.012*role.sensors/resolvedTech.compactness);
    const shieldStandbyW = Math.max(1e5,peakPowerW*.0008*defense.fieldFactor);
    const maneuverHotelW = Math.max(1e5,apparatusMass*1e6*.006*role.maneuver);
    const continuousPowerW = lifeSupport.powerW + hotelSensorsW + shieldStandbyW + maneuverHotelW + rechargePowerW;
    const generationPlantTonnes = continuousPowerW/resolvedTech.specificContinuousWKg/1000*defense.redundancy;

    const averageWasteW = thermalJ/rechargeSeconds;
    const heatStoreTonnes = thermalJ*.34/resolvedTech.thermalJkg/1000;
    const radiatorTonnes = averageWasteW/1e6*resolvedTech.radiatorKgMW/1000*defense.redundancy;
    const coolantTonnes = Math.max(apparatusMass*.006,(heatStoreTonnes+radiatorTonnes)*.16);
    const thermalTonnes = heatStoreTonnes+radiatorTonnes+coolantTonnes;
    const thermalVolumeM3 = thermalTonnes/1.1;

    const payloadAuto = Math.max(1,driveMass*role.payloadDrive);
    const payloadTonnes = input.payloadTonnes === '' || input.payloadTonnes == null ? payloadAuto : Math.max(0,finite(input.payloadTonnes,payloadAuto));
    const payloadVolumeM3 = payloadTonnes/Math.max(.08,role.cargoDensity);

    const navComponent = (assembly.components || []).find(item => /navigation and sensing/i.test(item.subsystem || ''));
    const navTonnes = Math.max(driveMass*.018*role.sensors*resolvedTech.compactness,finite(navComponent?.massTonnes,0)*.12);
    const maintenanceTonnes = assemblySpares + driveMass*.018*role.maintenance*(1-resolvedTech.automation*.42);
    const provisionalVolume = driveVolume+lifeSupport.volumeM3+fuelVolumeM3+thermalVolumeM3+payloadVolumeM3+generationPlantTonnes/.8+navTonnes/.55;
    const provisionalGeometry = geometryFromVolume(provisionalVolume,role.shape);
    const familyHazard = ({'inertial-torch':1.7,'metric-envelope':1.35,'gravitic-plane':1.05,'slipstream-shear':1.22,'q-lattice':1.15,'n-manifold':1.28,'fold-jump':1.42,'wormhole-gate':.82,'phase-displacement':1.32})[rating.identity?.familyKey] || 1.1;
    const shieldTonnes = provisionalGeometry.surfaceAreaM2*defense.arealKgM2*familyHazard*biology.radiationFactor/1000 + driveMass*.025*defense.fieldFactor;

    const baseRows = [
      {key:'drive',label:'FTL drive apparatus',massTonnes:apparatusMass,volumeM3:apparatusVolume,note:`${assembly.componentClassCount || 'Multiple'} qualified drive component classes.`},
      {key:'drive-integration',label:'Drive cradle, coverage, and service access',massTonnes:driveIntegration,volumeM3:Math.max(0,driveVolume-apparatusVolume),note:'Structural foundations, field coverage, isolation, service galleries, and independent abort routing.'},
      {key:'power',label:'Ship power generation and recharge plant',massTonnes:generationPlantTonnes,volumeM3:generationPlantTonnes/.8,note:`Supports ${powerText(continuousPowerW)} continuous ship and recharge demand; drive peak remains ${powerText(peakPowerW)}.`},
      {key:'fuel',label:'Energy medium, containment, and transfer',massTonnes:fuelSystemTonnes,volumeM3:fuelVolumeM3,note:`${containment.label}; ${reserveJumps} mission cycles plus ${(reserveFraction*100).toFixed(1)}% route reserve.`},
      {key:'thermal',label:'Coolant, heat stores, and radiators',massTonnes:thermalTonnes,volumeM3:thermalVolumeM3,note:`Buffers ${energyText(thermalJ)} thermal debt and rejects approximately ${powerText(averageWasteW)} during recharge.`},
      {key:'life-support',label:'Habitat and biological life support',massTonnes:lifeSupport.massTonnes,volumeM3:lifeSupport.volumeM3,note:`${biology.label}; ${crew} crew for ${fmt(enduranceDays,1)} days.`},
      {key:'shielding',label:'Radiation, debris, and field shielding',massTonnes:shieldTonnes,volumeM3:shieldTonnes/.9,note:`${defense.label}; ${defense.description}`},
      {key:'navigation',label:'Independent navigation, sensors, and clocks',massTonnes:navTonnes,volumeM3:navTonnes/.55,note:`Long-baseline ${rating.navigation?.sensorHorizon || 'transit sensor'} architecture independent of the primary drive controller.`},
      {key:'maintenance',label:'Maintenance shops and carried spares',massTonnes:maintenanceTonnes,volumeM3:maintenanceTonnes/.42,note:`Includes ${massText(assemblySpares)} drive spares plus shipboard repair and calibration stock.`},
      {key:'payload',label:'Mission payload and role equipment',massTonnes:payloadTonnes,volumeM3:payloadVolumeM3,note:role.description}
    ];

    const nonStructure = sum(baseRows);
    const structureRatio = role.structure*resolvedTech.structureFactor;
    const structureTonnes = nonStructure*structureRatio;
    const maneuverTonnes = (nonStructure+structureTonnes)*role.maneuver*(.72+resolvedTech.structureFactor*.28);
    const subtotal = nonStructure+structureTonnes+maneuverTonnes;
    const designMarginTonnes = subtotal*Math.max(defense.margin,resolvedTech.margin);
    const rows = [...baseRows,
      {key:'structure',label:'Primary hull, pressure structure, and compartmentation',massTonnes:structureTonnes,volumeM3:structureTonnes/.75,note:'Load paths are sized around drive foundations, pressure zones, acceleration, landing or docking loads, and damage isolation.'},
      {key:'maneuver',label:'Conventional propulsion and attitude control',massTonnes:maneuverTonnes,volumeM3:maneuverTonnes/.62,note:'Separate non-FTL propulsion, braking, docking, station keeping, and emergency vector control.'},
      {key:'margin',label:'Unallocated design and growth margin',massTonnes:designMarginTonnes,volumeM3:designMarginTonnes/.5,note:'Reserved for integration growth, weapons or mission equipment, later shielding, and unresolved source-biology requirements.'}
    ];
    const totalMassTonnes = sum(rows);
    const totalVolumeM3 = rows.reduce((total,row)=>total+finite(row.volumeM3),0);
    const geometry = geometryFromVolume(totalVolumeM3,role.shape);
    const massError = totalMassTonnes - rows.reduce((total,row)=>total+row.massTonnes,0);
    const driveFractionPercent = driveMass/totalMassTonnes*100;
    const technicians = Math.max(2,Math.ceil((assembly.componentCount || 24)/18 + totalMassTonnes**.18*role.maintenance));
    const maintenanceHoursPerJump = Math.max(4,technicians*2.8*(1-resolvedTech.automation*.55)+apparatusMass**.22*6);
    const mobilityClass = resolvedLevel.rank <= 1 ? 'fixed transit installation serving a separate payload vessel' : resolvedLevel.rank === 2 ? 'station-scale drive carrier or anchored transit tender' : resolvedLevel.rank === 3 ? 'capital-scale mobile prototype' : 'self-contained mobile FTL vessel';
    const status = resolvedLevel.rank <= 2 ? 'installation-dominated design' : driveFractionPercent > 45 ? 'drive-dominated vessel' : driveFractionPercent > 25 ? 'drive-centered vessel' : 'balanced mission vessel';

    return {
      version:1,author:'Charles',seed,generatedAt:new Date().toISOString(),
      identity:{name:`${rating.identity?.name || 'Transit'} ${role.label.replace(/\s*\/.*$/,'')} Hull`,roleKey:role.key,role:role.label,defenseKey:defense.key,defense:defense.label,mobilityClass,status},
      source:{type:source?.type || 'standalone',inheritedDrive:Boolean(sourceRecord(source)?.rating),inheritedBiology:Boolean(sourceRecord(source)?.dossier?.species),route:sourceRecord(source)?.route ? {start:sourceRecord(source).route.start?.name,end:sourceRecord(source).route.end?.name,effectiveDistanceLy:sourceRecord(source).route.effectiveDistanceLy} : null},
      drive:{familyKey:rating.identity?.familyKey,family:rating.identity?.family,pathLevelKey:resolvedLevel.key,pathLevelRank:resolvedLevel.rank,pathLevelLabel:resolvedLevel.label,architecture:rating.identity?.pathArchitecture || rating.identity?.name,apparatusMassTonnes:apparatusMass,integratedDriveMassTonnes:driveMass,driveFractionPercent,apparatusVolumeM3:apparatusVolume,serviceVolumeM3:driveVolume,missionEnergyJ:missionJ,missionEnergyText:energyText(missionJ),peakPowerW,peakPowerText:powerText(peakPowerW),missionTimeSeconds:finite(rating.kinematics?.completeMissionSeconds,rating.performance?.missionSeconds),missionTimeText:rating.kinematics?.completeMissionText || rating.performance?.missionText,certifiedRangeText:rating.range?.certifiedText,energyKey:eKey,energySystem:rating.identity?.energySystem},
      hull:{totalMassTonnes,totalMassText:massText(totalMassTonnes),dryMassTonnes:totalMassTonnes-carriedFuelTonnes,totalVolumeM3,lengthM:geometry.lengthM,beamM:geometry.beamM,heightM:geometry.heightM,decks:geometry.decks,surfaceAreaM2:geometry.surfaceAreaM2,averageDensityTonnesM3:totalMassTonnes/totalVolumeM3,massBalanceErrorTonnes:massError,massBudget:rows.map(row=>({...row,massPercent:row.massTonnes/totalMassTonnes*100,massText:massText(row.massTonnes),volumeText:`${fmt(row.volumeM3,1)} m³`}))},
      lifeSupport,
      power:{continuousPowerW,continuousPowerText:powerText(continuousPowerW),rechargePowerW,rechargePowerText:powerText(rechargePowerW),hotelAndMissionW:continuousPowerW-rechargePowerW,generationPlantTonnes,peakPowerW,peakPowerText:powerText(peakPowerW),missionEnergyJ:missionJ,missionEnergyText:energyText(missionJ)},
      fuel:{energyKey:eKey,energySystem:rating.identity?.energySystem,medium:rating.energyBudget?.energyMedium || rating.power?.fuel,carriedMissionCycles:reserveJumps,missionFuelTonnes:missionFuelKg/1000,routeReservePercent:reserveFraction*100,carriedFuelTonnes,containmentAndTransferTonnes:fuelSupportTonnes,totalFuelSystemTonnes:fuelSystemTonnes,systemDescription:containment.label},
      thermal:{thermalDebtJ:thermalJ,thermalDebtText:energyText(thermalJ),averageRejectionW:averageWasteW,averageRejectionText:powerText(averageWasteW),heatStoreTonnes,radiatorTonnes,coolantTonnes,totalThermalTonnes:thermalTonnes},
      protection:{doctrine:defense.label,shieldMassTonnes:shieldTonnes,arealDensityKgM2:defense.arealKgM2,fieldFactor:defense.fieldFactor,familyHazardFactor:familyHazard,notes:defense.description},
      navigation:{sensorArchitecture:rating.navigation?.sensorHorizon,destinationVerification:rating.navigation?.destinationVerification,arrivalUncertainty:rating.navigation?.referenceArrivalErrorText,solutionRefresh:secondsText(rating.navigation?.solutionRefreshSeconds),independentSensorMassTonnes:navTonnes,baselineM:Math.max(geometry.lengthM*.62,25),clockAndSolutionChannels:rating.dimensional?.computationalLoad},
      maintenance:{technicians,estimatedHoursPerJump:maintenanceHoursPerJump,estimatedHoursPerJumpText:`${fmt(maintenanceHoursPerJump,1)} technician-hours`,driveSpareTonnes:assemblySpares,totalMaintenanceTonnes:maintenanceTonnes,shortestLifeComponent:assembly.maintenance?.shortestLifeComponent || rating.reliability?.dominantReliabilityLimit,inspectionRule:assembly.maintenance?.periodicInspection || rating.reliability?.inspectionBurden,overhaulRule:assembly.maintenance?.overhaul || `Major overhaul every ${rating.reliability?.overhaulIntervalCycles || 'certified'} cycles.`,servicePhilosophy:assembly.maintenance?.stageMaintenancePhilosophy},
      warnings:[
        resolvedLevel.rank <= 2 ? `Path ${resolvedLevel.rank} is not an ordinary shipboard drive. Charles classifies this result as ${mobilityClass}; the payload craft and the transit installation may be separate vehicles.` : null,
        `The drive apparatus is ${fmt(driveFractionPercent,2)}% of loaded vessel mass before distinguishing which field structures can also serve as hull structure.`,
        biology.inferenceReason,
        biology.confidenceNote,
        'Energy-medium mass is not the complete fuel-system mass. Containment, transfer, shielding, coolant, reserve segregation, and recharge machinery are budgeted separately.',
        'The mass and power ledger is an internally consistent fictional engineering model. It is not a real-world spacecraft design or evidence that the selected transit physics is possible.'
      ].filter(Boolean),
      rating
    };
  }

  globalThis.BlacklightExoVessel = Object.freeze({version:1,roles:D.roles,biologyProfiles:D.biology,defenses:D.defenses,generate});
})();
