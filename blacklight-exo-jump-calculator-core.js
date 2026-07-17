(() => {
  'use strict';
  if (globalThis.BlacklightExoJumpCalculator) return;
  const ftl = globalThis.BlacklightExoFTL;
  const spatial = globalThis.BlacklightExoClusterSpatial;
  if (!ftl || !spatial) return;

  const AU_KM = Number(ftl.constants?.AU_KM) || 149597870.7;
  const LY_AU = Number(ftl.constants?.LY_AU) || spatial.AU_PER_LY || 63241.07708426628;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function vector(a, b) {
    const x = b.x - a.x;
    const y = b.y - a.y;
    const z = b.z - a.z;
    const length = Math.max(1e-12, Math.hypot(x, y, z));
    return {x, y, z, length, unit:{x:x / length, y:y / length, z:z / length}};
  }

  function pointAlong(origin, direction, distanceAU) {
    return {
      x:origin.x + direction.x * distanceAU,
      y:origin.y + direction.y * distanceAU,
      z:origin.z + direction.z * distanceAU
    };
  }

  function routeAngles(direction) {
    const azimuth = (Math.atan2(direction.y, direction.x) * 180 / Math.PI + 360) % 360;
    const elevation = Math.asin(clamp(direction.z, -1, 1)) * 180 / Math.PI;
    return {azimuthDeg:azimuth, elevationDeg:elevation};
  }

  function scaleFor(familyKey, rank) {
    if (familyKey === 'wormhole-gate') return 'megastructure';
    if (rank <= 2) return 'megastructure';
    if (rank === 3) return 'capital';
    if (rank === 4) return 'frigate';
    if (rank === 5) return familyKey === 'inertial-torch' ? 'shuttle' : 'corvette';
    return familyKey === 'inertial-torch' ? 'shuttle' : 'fighter';
  }

  function infrastructureFor(familyKey, rank) {
    if (familyKey === 'wormhole-gate') return 'fixed-gate';
    if (rank <= 2) return familyKey === 'fold-jump' || familyKey === 'phase-displacement' ? 'paired-gate' : 'corridor';
    return 'self-contained';
  }

  function sourceFor(start, end) {
    return {
      type:'cluster',
      cluster:{
        seed:`${start.seed}:${end.seed}`,
        systems:[
          {name:start.name, population:0, position:start.positionAU},
          {name:end.name, population:0, position:end.positionAU}
        ]
      }
    };
  }

  function generateRating(seed, start, end, familyKey, pathLevelKey, distanceLy) {
    const level = (ftl.pathLevels || []).find(item => item.key === pathLevelKey) || (ftl.pathLevels || [])[0];
    const rank = finite(level?.rank, 0);
    return ftl.generate(seed, {
      family:familyKey,
      pathLevel:pathLevelKey,
      scale:scaleFor(familyKey, rank),
      infrastructure:infrastructureFor(familyKey, rank),
      route:'deep-space',
      doctrine:'balanced',
      energy:'random',
      distance:Math.max(1e-9, distanceLy),
      distanceUnit:'ly'
    }, sourceFor(start, end));
  }

  function confidenceLabel(value) {
    if (value >= 90) return 'high-confidence model solution';
    if (value >= 75) return 'operational planning confidence';
    if (value >= 55) return 'provisional route estimate';
    return 'low-confidence theoretical estimate';
  }

  function geometryEstimate(system, pointAU, clearanceAU, direction, rating, role) {
    const pathRank = finite(rating.pathLevel?.rank, rating.identity?.pathLevelRank);
    const availability = clamp(finite(rating.routeEnvelope?.certifiedWindowAvailabilityPercent, 50), 0, 100);
    const reliability = clamp(finite(rating.reliability?.certifiedSuccessPercent, 50), 0, 100);
    const modelConfidence = clamp(42 + pathRank * 6 + availability * 0.22 + reliability * 0.12, 20, 98);
    const sourceConfidence = clamp(finite(system.positionConfidencePercent, 70), 10, 99);
    const rolePenalty = role === 'exit' ? 6 : 1;
    const certainty = clamp(sourceConfidence * 0.42 + modelConfidence * 0.58 - rolePenalty, 10, 98.5);
    const baseErrorKm = Math.max(1, finite(rating.navigation?.referenceArrivalErrorKm, 1));
    const chartPenaltyKm = clearanceAU * AU_KM * (1 - sourceConfidence / 100) * (role === 'exit' ? 0.025 : 0.012);
    const uncertaintyKm = Math.max(baseErrorKm * (role === 'exit' ? 1 : 0.38), chartPenaltyKm, 1);
    const angularUncertaintyDeg = Math.atan2(uncertaintyKm, Math.max(1, clearanceAU * AU_KM)) * 180 / Math.PI;
    const angles = routeAngles(direction);
    return {
      role,
      systemSeed:system.seed,
      systemName:system.name,
      clearanceAU,
      clearanceKm:clearanceAU * AU_KM,
      pointAU,
      pointLy:{x:pointAU.x / LY_AU, y:pointAU.y / LY_AU, z:pointAU.z / LY_AU},
      azimuthDeg:angles.azimuthDeg,
      elevationDeg:angles.elevationDeg,
      uncertaintyKm,
      angularUncertaintyDeg,
      certaintyPercent:certainty,
      certaintyLabel:confidenceLabel(certainty),
      basis:`${system.positionBasis}; ${role === 'entry' ? 'departure' : 'arrival'} clearance derived from the selected drive family, Path level, system mass, route window, and navigation error model.`
    };
  }

  function calculate(input = {}) {
    const systems = spatial.getSystems();
    const start = systems.find(item => item.seed === input.startSeed);
    const end = systems.find(item => item.seed === input.endSeed);
    if (!start || !end) throw new Error('Select a valid departure and destination system.');
    if (start.seed === end.seed) throw new Error('Departure and destination must be different systems.');

    const familyKey = input.familyKey || 'metric-envelope';
    const pathLevelKey = input.pathLevelKey || 'p4';
    const centerVector = vector(start.positionAU, end.positionAU);
    const centerDistanceAU = centerVector.length;
    const centerDistanceLy = centerDistanceAU / LY_AU;
    const seed = `jump:${start.seed}:${end.seed}:${familyKey}:${pathLevelKey}`;

    const preliminary = generateRating(seed, start, end, familyKey, pathLevelKey, centerDistanceLy);
    const startMassFactor = Math.sqrt(clamp(finite(start.totalMassSolar, 1), 0.03, 24));
    const endMassFactor = Math.sqrt(clamp(finite(end.totalMassSolar, 1), 0.03, 24));
    const entryClearanceAU = Math.max(1e-8, finite(preliminary.routeEnvelope?.originExclusionAU, preliminary.navigation?.exclusionAU) * startMassFactor);
    const exitClearanceAU = Math.max(1e-8, finite(preliminary.routeEnvelope?.arrivalExclusionAU, preliminary.navigation?.exclusionAU) * endMassFactor);
    const effectiveDistanceAU = Math.max(1e-6, centerDistanceAU - entryClearanceAU - exitClearanceAU);
    const effectiveDistanceLy = effectiveDistanceAU / LY_AU;
    const rating = generateRating(seed, start, end, familyKey, pathLevelKey, effectiveDistanceLy);

    const entryPointAU = pointAlong(start.positionAU, centerVector.unit, entryClearanceAU);
    const exitPointAU = pointAlong(end.positionAU, {x:-centerVector.unit.x, y:-centerVector.unit.y, z:-centerVector.unit.z}, exitClearanceAU);
    const entry = geometryEstimate(start, entryPointAU, entryClearanceAU, centerVector.unit, rating, 'entry');
    const exit = geometryEstimate(end, exitPointAU, exitClearanceAU, centerVector.unit, rating, 'exit');

    const certifiedRangeAU = Math.max(1e-12, finite(rating.range?.certifiedAU));
    const withinRange = effectiveDistanceAU <= certifiedRangeAU;
    const minimumLegs = Math.max(1, Math.ceil(effectiveDistanceAU / certifiedRangeAU));
    const missionFuelKg = Math.max(0, finite(rating.energyBudget?.missionFuelKg, rating.power?.fuelKg));
    const reserveFraction = clamp(finite(rating.range?.reserveFraction, 0.25), 0.08, 0.5);
    const reserveFuelKg = missionFuelKg * reserveFraction;
    const recommendedFuelKg = missionFuelKg + reserveFuelKg;
    const tankageCycles = Math.max(1, Math.round(finite(rating.energyBudget?.tankageCycles, 1)));
    const reliabilityPercent = clamp(finite(rating.reliability?.certifiedSuccessPercent, 50), 0, 100);
    const routeAvailabilityPercent = clamp(finite(rating.routeEnvelope?.certifiedWindowAvailabilityPercent, 50), 0, 100);
    const overallCertainty = clamp((entry.certaintyPercent + exit.certaintyPercent) / 2 * 0.55 + reliabilityPercent * 0.25 + routeAvailabilityPercent * 0.2, 5, 98.5);

    return {
      version:1,
      author:'Charles',
      start,
      end,
      familyKey,
      requestedPathLevelKey:pathLevelKey,
      centerDistanceAU,
      centerDistanceLy,
      effectiveDistanceAU,
      effectiveDistanceLy,
      routeVector:centerVector,
      entry,
      exit,
      rating,
      range:{withinCertifiedSingleJump:withinRange, certifiedRangeAU, certifiedRangeLy:certifiedRangeAU / LY_AU, minimumLegs, marginAU:certifiedRangeAU - effectiveDistanceAU},
      timing:{
        spoolSeconds:finite(rating.performance?.spoolSeconds),
        spoolText:rating.performance?.spoolText,
        payloadSeconds:finite(rating.kinematics?.payloadTransitSeconds, rating.performance?.transitSeconds),
        payloadText:rating.kinematics?.payloadTransitText || rating.performance?.transitText,
        cooldownSeconds:finite(rating.performance?.cooldownSeconds),
        cooldownText:rating.performance?.cooldownText,
        completeSeconds:finite(rating.kinematics?.completeMissionSeconds, rating.performance?.missionSeconds),
        completeText:rating.kinematics?.completeMissionText || rating.performance?.missionText,
        crewElapsedText:rating.kinematics?.crewElapsedText || rating.kinematics?.payloadTransitText || rating.performance?.transitText
      },
      energy:{
        missionJ:finite(rating.energyBudget?.missionJ, rating.power?.activationJ),
        missionText:rating.energyBudget?.missionText || rating.power?.activationText,
        peakPowerW:finite(rating.energyBudget?.peakPowerW, rating.power?.averagePowerW),
        peakPowerText:rating.energyBudget?.peakPowerText || rating.power?.averagePowerText,
        thermalDebtJ:finite(rating.energyBudget?.thermalDebtJ, rating.power?.wasteJ),
        thermalDebtText:rating.energyBudget?.thermalDebtText || rating.power?.wasteText,
        rechargeSeconds:finite(rating.energyBudget?.rechargeSeconds),
        rechargeText:rating.energyBudget?.rechargeText || 'not established',
        missionFuelKg,
        reserveFuelKg,
        recommendedFuelKg,
        tankageCycles,
        energyMedium:rating.energyBudget?.energyMedium || rating.power?.fuel || 'unidentified energy medium',
        rechargeArchitecture:rating.energyBudget?.rechargeArchitecture || rating.power?.recharge || 'dedicated recharge plant required'
      },
      certainty:{percent:overallCertainty, label:confidenceLabel(overallCertainty), routeAvailabilityPercent, reliabilityPercent},
      status:withinRange ? 'single-jump estimate inside certified range' : `direct jump exceeds certified range; at least ${minimumLegs} legs and intermediate clearance points are required`,
      corrections:rating.compatibility?.corrections || [],
      warning:'This is an in-universe engineering estimate derived from generated cluster coordinates and the Blacklight FTL model. It is not a claim that faster-than-light travel has been demonstrated.'
    };
  }

  globalThis.BlacklightExoJumpCalculator = Object.freeze({
    version:1,
    families:ftl.families || [],
    pathLevels:ftl.pathLevels || [],
    calculate
  });
})();
