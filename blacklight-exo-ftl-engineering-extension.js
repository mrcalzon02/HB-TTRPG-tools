(() => {
  'use strict';

  const base = globalThis.BlacklightExoFTL;
  if (!base || base.engineeringExtensionVersion) return;

  const {C_AU_S, C_KM_S, LY_AU, AU_KM} = base.constants;
  const tierMap = Object.fromEntries(base.tiers.map(item => [item.key, item]));
  const familyMap = Object.fromEntries(base.families.map(item => [item.key, item]));
  const scaleMap = Object.fromEntries(base.scales.map(item => [item.key, item]));
  const infrastructureMap = Object.fromEntries(base.infrastructures.map(item => [item.key, item]));
  const energyMap = Object.fromEntries(base.energySystems.map(item => [item.key, item]));
  const routeMap = Object.fromEntries(base.routes.map(item => [item.key, item]));
  const doctrineMap = Object.fromEntries(base.doctrines.map(item => [item.key, item]));

  const FIGHTER_FAMILIES = new Set(['metric-envelope','slipstream-shear','q-lattice','n-manifold','phase-displacement']);
  const TRANSIT_MODES = Object.freeze({
    'inertial-torch':'continuous-relativistic',
    'metric-envelope':'continuous-metric',
    'gravitic-plane':'continuous-geodesic',
    'slipstream-shear':'continuous-hyperspatial',
    'q-lattice':'discrete-translation',
    'n-manifold':'continuous-manifold',
    'fold-jump':'discrete-fold',
    'wormhole-gate':'gate-traversal',
    'phase-displacement':'discrete-state-displacement'
  });

  const ROUTE_ENVELOPES = Object.freeze({
    'deep-space':{exclusion:[.000002,.00008],availability:[96,100],plane:'unrestricted inertial reference plane',mass:'No dominant local mass; distant stellar and galactic gradients remain in the solution.'},
    'planetary-well':{exclusion:[.00015,.025],availability:[45,92],plane:'local orbital or barycentric departure plane',mass:'Planetary mass, moons, stations, and artificial-gravity sources dominate the near-field solution.'},
    'gas-giant':{exclusion:[.003,.14],availability:[18,68],plane:'gas-giant equatorial and moon-system plane',mass:'The giant planet, major moons, magnetosphere, and plasma torus form a moving interference complex.'},
    'binary':{exclusion:[.06,8],availability:[4,38],plane:'time-dependent binary barycentric plane',mass:'Multiple moving stellar masses continuously rotate the permitted departure and arrival geometry.'},
    'compact-object':{exclusion:[.4,180],availability:[.5,12],plane:'compact-object accretion and spin reference plane',mass:'Extreme curvature, frame dragging, radiation, and lensing dominate well outside the visible object.'},
    'nebula':{exclusion:[.00001,.003],availability:[42,88],plane:'sensor-defined route plane rather than a gravity-defined plane',mass:'Distributed matter is mild gravitationally but severe for charge, plasma, scattering, and forward sensing.'},
    'uncharted':{exclusion:[.001,.9],availability:[12,62],plane:'provisional plane reconstructed from incomplete mass data',mass:'The principal threat is missing mass: rogue bodies, dark companions, debris concentrations, or artificial structures.'},
    'q-disturbed':{exclusion:[.002,4],availability:[2,44],plane:'Q-phase or N-axis coherence plane',mass:'Normal-space gravity and higher-dimensional defects jointly define a route that may change without visible motion.'}
  });

  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  function rngFor(seed){let state=hash(seed)||1;return()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};}
  const number=(rng,min,max,digits=6)=>Number((min+(max-min)*rng()).toFixed(digits));
  const integer=(rng,min,max)=>Math.floor(min+rng()*(max-min+1));
  const pick=(rng,list)=>list[Math.floor(rng()*list.length)]||list[0];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const logNumber=(rng,min,max)=>10**(Math.log10(min)+(Math.log10(max)-Math.log10(min))*rng());

  function correctMassText(kg){
    const value=Number(kg)||0;
    if(value>=1e15)return`${(value/1e15).toFixed(3)} trillion tonnes`;
    if(value>=1e12)return`${(value/1e12).toFixed(3)} billion tonnes`;
    if(value>=1e9)return`${(value/1e9).toFixed(3)} million tonnes`;
    if(value>=1e6)return`${(value/1e6).toFixed(3)} thousand tonnes`;
    if(value>=1000)return`${(value/1000).toFixed(3)} tonnes`;
    return`${value.toFixed(3)} kg`;
  }

  function cRelation(value){
    const c=Math.max(0,Number(value)||0);
    if(c<1)return{mode:'sublight',label:`${(c*100).toLocaleString(undefined,{maximumFractionDigits:6})}% of c`,percentOfC:c*100,percentBelowC:(1-c)*100,multipleC:c};
    return{mode:'superluminal',label:`${c.toLocaleString(undefined,{maximumFractionDigits:c<100?4:2})}c`,multipleC:c,percentBeyondC:(c-1)*100};
  }

  function secondsText(seconds){return base.format.secondsToText(Math.max(0,seconds));}
  function energyText(joules){return base.format.energyText(Math.max(0,joules));}
  function powerText(watts){return base.format.powerText(Math.max(0,watts));}

  function chooseCompatibleInfrastructure(family,scale){
    const preferred=scale?.key==='megastructure'?['fixed-gate','paired-gate','corridor','beacon-assisted','self-contained']:['self-contained','beacon-assisted','corridor','paired-gate','fixed-gate'];
    return preferred.find(key=>family.infrastructures.includes(key))||family.infrastructures[0];
  }

  function chooseCompatibleEnergy(family,tier){
    const candidates=base.energySystems.filter(item=>item.minTier<=tier.rank&&family.energySystems.includes(item.key));
    return candidates.sort((a,b)=>b.minTier-a.minTier)[0]?.key||family.energySystems[0];
  }

  function normalizeOptions(input){
    const requested=clone(input);
    const options={...requested};
    const corrections=[];
    let family=options.family&&options.family!=='random'?familyMap[options.family]:null;
    let tier=options.tier&&options.tier!=='random'?tierMap[options.tier]:null;
    let scale=options.scale&&options.scale!=='random'?scaleMap[options.scale]:null;

    if(options.energy==='star-fed'){
      if(options.family!=='wormhole-gate')corrections.push('Direct stellar power requires an anchored gate architecture; the drive family was changed to Anchored Wormhole or Gate Transit.');
      if(options.scale!=='megastructure')corrections.push('Direct stellar power cannot be carried by a mobile hull; installation scale was changed to Gatework or megastructure.');
      if(options.infrastructure!=='fixed-gate')corrections.push('Direct stellar power requires fixed stellar gateworks; infrastructure dependency was corrected.');
      options.family='wormhole-gate';options.scale='megastructure';options.infrastructure='fixed-gate';
      family=familyMap[options.family];scale=scaleMap[options.scale];
      if(!tier||tier.rank<2){options.tier='t2';tier=tierMap.t2;corrections.push('The technology tier was raised to Tier 2, the minimum gate-capable maturity.');}
    }

    if(options.family==='wormhole-gate'){
      family=familyMap['wormhole-gate'];
      if(options.scale!=='megastructure'){
        options.scale='megastructure';scale=scaleMap.megastructure;
        corrections.push('A wormhole or gate is fixed transit infrastructure rather than a shipboard drive; installation scale was changed to Gatework or megastructure.');
      }
      if(options.infrastructure==='self-contained'||options.infrastructure==='beacon-assisted'){
        options.infrastructure='fixed-gate';
        corrections.push('The selected infrastructure could not maintain a traversable gate throat; fixed stellar gateworks were substituted.');
      }
    }

    if(options.scale==='fighter'){
      scale=scaleMap.fighter;
      if(!tier||tier.rank<scale.minTier){options.tier=`t${scale.minTier}`;tier=tierMap[options.tier];corrections.push('Fighter-scale FTL requires Tier 7 miniaturization; the tier was raised accordingly.');}
      if(family&&!FIGHTER_FAMILIES.has(family.key)){
        options.family='metric-envelope';family=familyMap[options.family];
        corrections.push('The selected drive family cannot be miniaturized into a fighter installation; a compact metric envelope was substituted.');
      }
    }

    family=options.family&&options.family!=='random'?familyMap[options.family]:family;
    tier=options.tier&&options.tier!=='random'?tierMap[options.tier]:tier;
    scale=options.scale&&options.scale!=='random'?scaleMap[options.scale]:scale;

    if(family&&tier&&(tier.rank<family.tiers[0]||tier.rank>family.tiers[1])){
      const correctedRank=clamp(tier.rank,family.tiers[0],family.tiers[1]);
      options.tier=`t${correctedRank}`;tier=tierMap[options.tier];
      corrections.push(`${family.label} is certified only from Tier ${family.tiers[0]} through Tier ${family.tiers[1]}; the tier was clamped to Tier ${correctedRank}.`);
    }

    if(family&&scale&&scale.minTier>family.tiers[1]&&scale.key!=='fighter'){
      const candidates=base.scales.filter(item=>item.minTier<=family.tiers[1]&&item.key!=='megastructure');
      const replacement=candidates.at(-1)||scaleMap.probe;
      options.scale=replacement.key;scale=replacement;
      corrections.push(`${family.label} cannot be integrated at the selected installation scale within its development window; scale was changed to ${replacement.label}.`);
    }

    if(scale&&tier&&scale.minTier>tier.rank){
      const raised=Math.min(8,scale.minTier);
      options.tier=`t${raised}`;tier=tierMap[options.tier];
      corrections.push(`${scale.label} requires at least Tier ${raised}; the technology tier was raised.`);
      if(family&&(tier.rank<family.tiers[0]||tier.rank>family.tiers[1])){
        const candidates=base.families.filter(item=>tier.rank>=item.tiers[0]&&tier.rank<=item.tiers[1]&&(scale.key!=='fighter'||FIGHTER_FAMILIES.has(item.key)));
        const replacement=candidates[0];
        if(replacement){options.family=replacement.key;family=replacement;corrections.push(`The prior family was incompatible with the required tier and scale; ${replacement.label} was substituted.`);}
      }
    }

    family=options.family&&options.family!=='random'?familyMap[options.family]:family;
    tier=options.tier&&options.tier!=='random'?tierMap[options.tier]:tier;
    scale=options.scale&&options.scale!=='random'?scaleMap[options.scale]:scale;

    if(family&&options.infrastructure&&options.infrastructure!=='random'&&!family.infrastructures.includes(options.infrastructure)){
      const replacement=chooseCompatibleInfrastructure(family,scale);
      corrections.push(`${family.label} cannot use ${infrastructureMap[options.infrastructure]?.label||options.infrastructure}; ${infrastructureMap[replacement]?.label||replacement} was substituted.`);
      options.infrastructure=replacement;
    }

    if(family&&tier&&options.energy&&options.energy!=='random'){
      const energy=energyMap[options.energy];
      if(!energy||energy.minTier>tier.rank||!family.energySystems.includes(energy.key)){
        const replacement=chooseCompatibleEnergy(family,tier);
        corrections.push(`${energy?.label||options.energy} is not compatible with the resolved family and tier; ${energyMap[replacement]?.label||replacement} was substituted.`);
        options.energy=replacement;
      }
    }

    return{requested,options,corrections};
  }

  function makeKinematics(rng,result){
    const familyKey=result.identity.familyKey;
    const mode=TRANSIT_MODES[familyKey]||'continuous-field';
    const distanceAU=result.performance.referenceDistanceAU;
    const lightSeconds=distanceAU/C_AU_S;
    const standardizedSeconds=result.performance.transitSeconds;
    let payloadSeconds=standardizedSeconds;
    if(mode.startsWith('discrete')){
      const ranges={
        'discrete-translation':[.002,.45],
        'discrete-fold':[.01,1.8],
        'discrete-state-displacement':[.0002,.08]
      };
      const [min,max]=ranges[mode];
      payloadSeconds=logNumber(rng,min,max)*(1+Math.log10(Math.max(1,distanceAU))/18);
    }else if(mode==='gate-traversal'){
      payloadSeconds=logNumber(rng,.08,45)*(1+Math.log10(Math.max(1,distanceAU))/32);
    }
    const missionSeconds=result.performance.spoolSeconds+payloadSeconds+result.performance.cooldownSeconds;
    const payloadC=lightSeconds/Math.max(1e-12,payloadSeconds);
    const missionC=lightSeconds/Math.max(1e-12,missionSeconds);
    let gamma=null,crewSeconds=payloadSeconds,chronometricModel='local field time approximately follows external transit time';
    if(familyKey==='inertial-torch'&&result.performance.practicalRouteC<1){
      gamma=1/Math.sqrt(1-result.performance.practicalRouteC**2);
      crewSeconds=payloadSeconds/gamma;
      chronometricModel='cruise-segment relativistic proper-time estimate; acceleration and braking phases are not included';
    }else if(mode.startsWith('discrete')||mode==='gate-traversal'){
      crewSeconds=payloadSeconds*number(rng,.88,1.12);
      chronometricModel='payload crossing interval plus independently modeled spool and recovery; no continuous cruise velocity is assumed';
    }else if(/hyperspatial|manifold/.test(mode)){
      crewSeconds=payloadSeconds*number(rng,.72,1.08);
      chronometricModel='local hull time is derived from field-path duration and may not exactly match destination coordinate time';
    }
    const clockDrift=Math.max(1e-9,payloadSeconds*number(rng,1e-10,Math.max(1e-8,result.identity.tierRank*2e-6)));
    return{
      mode,
      ratingBasis:mode.startsWith('continuous')?'continuous route-equivalent velocity':'standardized route-compression rating; payload crossing is modeled separately',
      referenceDistanceAU:distanceAU,
      referenceLightTimeSeconds:lightSeconds,
      referenceLightTimeText:secondsText(lightSeconds),
      standardizedEquivalentSeconds:standardizedSeconds,
      standardizedEquivalentText:secondsText(standardizedSeconds),
      payloadTransitSeconds:payloadSeconds,
      payloadTransitText:secondsText(payloadSeconds),
      payloadEffectiveC:payloadC,
      payloadRelation:cRelation(payloadC),
      completeMissionSeconds:missionSeconds,
      completeMissionText:secondsText(missionSeconds),
      missionEffectiveC:missionC,
      missionRelation:cRelation(missionC),
      crewElapsedSeconds:crewSeconds,
      crewElapsedText:secondsText(crewSeconds),
      gamma,
      chronometricModel,
      estimatedClockDriftSeconds:clockDrift,
      estimatedClockDriftText:secondsText(clockDrift),
      causalityClass:familyKey==='inertial-torch'?'ordinary causal trajectory':familyKey==='metric-envelope'||familyKey==='gravitic-plane'?'continuous engineered metric':mode==='gate-traversal'?'multiply connected topology':mode.startsWith('discrete')?'nonlocal state or topology transition':'higher-dimensional continuous route'
    };
  }

  function makeEnergyBudget(rng,result,kinematics){
    const energy=base.energySystems.find(item=>item.label===result.identity.energySystem)||base.energySystems[0];
    const familyKey=result.identity.familyKey;
    const activationJ=result.power.activationJ;
    const spool=result.performance.spoolSeconds;
    const distanceAU=result.performance.referenceDistanceAU;
    const mode=kinematics.mode;
    const maintenanceFactors={
      'inertial-torch':.9,'metric-envelope':.22,'gravitic-plane':.14,'slipstream-shear':.19,
      'q-lattice':.035,'n-manifold':.18,'fold-jump':.018,'wormhole-gate':.012,'phase-displacement':.025
    };
    let transitJ=activationJ*(maintenanceFactors[familyKey]||.15)*Math.min(5000,Math.max(.01,kinematics.payloadTransitSeconds/Math.max(.01,spool)))*(1+Math.log10(Math.max(1,distanceAU))/10);
    let kineticJ=0;
    if(familyKey==='inertial-torch'&&kinematics.gamma){
      const massKg=result.power.referenceMassTonnes*1000;
      kineticJ=(kinematics.gamma-1)*massKg*(C_KM_S*1000)**2*2;
      transitJ=Math.max(transitJ,kineticJ);
    }
    const collapseJ=activationJ*number(rng,.07,.24);
    const missionJ=activationJ+transitJ+collapseJ;
    const fuelKg=missionJ/(energy.specific*energy.efficiency);
    const thermalJ=missionJ*(1-energy.efficiency);
    const peakPower=activationJ/Math.max(.001,spool*number(rng,.08,.22));
    const sustainedPower=transitJ/Math.max(.001,kinematics.payloadTransitSeconds);
    const rechargePower=Math.max(result.power.averagePowerW*.18,result.power.averagePowerW*number(rng,.22,.85));
    const rechargeSeconds=missionJ/rechargePower;
    const tankageCycles=integer(rng,2,result.identity.scaleKey==='megastructure'?180:24);
    return{
      activationJ,
      activationText:energyText(activationJ),
      transitJ,
      transitText:energyText(transitJ),
      kineticJ,
      kineticText:kineticJ?energyText(kineticJ):'not applicable to the selected non-inertial architecture',
      collapseJ,
      collapseText:energyText(collapseJ),
      missionJ,
      missionText:energyText(missionJ),
      peakPowerW:peakPower,
      peakPowerText:powerText(peakPower),
      sustainedPowerW:sustainedPower,
      sustainedPowerText:powerText(sustainedPower),
      missionFuelKg:fuelKg,
      missionFuelText:correctMassText(fuelKg),
      fuelPerAUkg:fuelKg/Math.max(1e-12,distanceAU),
      fuelPerAUText:correctMassText(fuelKg/Math.max(1e-12,distanceAU)),
      fuelPerLYkg:fuelKg/Math.max(1e-12,distanceAU)*LY_AU,
      fuelPerLYText:correctMassText(fuelKg/Math.max(1e-12,distanceAU)*LY_AU),
      thermalDebtJ:thermalJ,
      thermalDebtText:energyText(thermalJ),
      thermalDebtGWh:thermalJ/3.6e12,
      rechargeSeconds,
      rechargeText:secondsText(rechargeSeconds),
      tankageCycles,
      carriedFuelText:correctMassText(fuelKg*tankageCycles),
      energyMedium:energy.fuel,
      rechargeArchitecture:energy.recharge,
      accountingNote:'Mission energy includes field formation, distance-dependent sustainment or physical acceleration, and controlled collapse. It is separate from hotel load, conventional propulsion, life support, weapons, and post-arrival maneuvering.'
    };
  }

  function makeRouteEnvelope(rng,result){
    const routeKey=base.routes.find(item=>item.label===result.identity.routeEnvironment)?.key||'deep-space';
    const route=routeMap[routeKey];
    const family=familyMap[result.identity.familyKey];
    const profile=ROUTE_ENVELOPES[routeKey]||ROUTE_ENVELOPES['deep-space'];
    const baseline=logNumber(rng,profile.exclusion[0],profile.exclusion[1]);
    const origin=Math.max(result.navigation.exclusionAU,baseline/Math.max(.08,family.gravity));
    const arrival=origin*number(rng,.82,1.75);
    const availability=number(rng,profile.availability[0],profile.availability[1],2);
    const wakeSeconds=result.performance.cooldownSeconds*number(rng,.35,2.8);
    const wakeKm=Math.max(result.navigation.referenceArrivalErrorKm*4,origin*AU_KM*number(rng,.015,.12));
    const formationKm=Math.max(wakeKm*1.2,result.navigation.referenceArrivalErrorKm*8);
    const massTolerance=number(rng,.0002,Math.max(.0003,1.8/(result.identity.tierRank+1)),6);
    const interdiction=[
      routeKey==='binary'?'altering or concealing the barycentric mass solution during the launch window':'introducing an uncharted mass shadow into the certified route',
      /q|n-|slipstream|phase/.test(result.identity.familyKey)?'spoofing the Q-phase, N-axis, or destination-epoch reference':'corrupting beacon ephemerides or destination clearance data',
      result.identity.infrastructureKey==='corridor'||/gate/.test(result.identity.infrastructureKey)?'damaging, capturing, or deliberately detuning route infrastructure':'forcing the vessel to activate inside a prohibited gravity-gradient volume'
    ];
    return{
      routeKey,
      routeLabel:route.label,
      dominantEnvironment:profile.mass,
      referencePlane:profile.plane,
      originExclusionAU:origin,
      originExclusionText:base.format.distanceText(origin),
      arrivalExclusionAU:arrival,
      arrivalExclusionText:base.format.distanceText(arrival),
      planeToleranceDeg:result.navigation.planeToleranceDeg,
      gradientLimit:result.navigation.gradientLimit,
      gradientInterferenceIndex:route.gradient/Math.max(.05,family.gravity),
      certifiedWindowAvailabilityPercent:availability,
      certifiedWindowText:`${availability.toFixed(2)}% of modeled route time`,
      wakePersistenceSeconds:wakeSeconds,
      wakePersistenceText:secondsText(wakeSeconds),
      wakeClearanceKm:wakeKm,
      wakeClearanceText:`${wakeKm.toLocaleString(undefined,{maximumFractionDigits:1})} km`,
      minimumFormationSpacingKm:formationKm,
      minimumFormationSpacingText:`${formationKm.toLocaleString(undefined,{maximumFractionDigits:1})} km`,
      massMapTolerancePercent:massTolerance,
      massMapToleranceText:`±${massTolerance.toFixed(6)}% of certified enclosed mass`,
      routeSolutionRefreshText:secondsText(result.navigation.solutionRefreshSeconds),
      interdictionMethods:interdiction
    };
  }

  function makeReliability(rng,result,kinematics,routeEnvelope){
    const tierFailure=[.8,1.7,14,5.5,1.8,1.1,1.5,2.4,4.2][result.identity.tierRank]||3;
    const route=routeMap[routeEnvelope.routeKey];
    const doctrine=doctrineMap[base.doctrines.find(item=>item.label===result.identity.doctrine)?.key||'balanced']||doctrineMap.balanced;
    let failuresPerThousand=tierFailure*Math.sqrt(route.gradient)*(result.identity.infrastructureKey==='self-contained'?1.28:.82)*(doctrine.key==='speed'||doctrine.key==='tactical'?1.42:doctrine.key==='precision'?.72:1);
    failuresPerThousand=clamp(failuresPerThousand,.002,180);
    const success=1-failuresPerThousand/1000;
    const cycleLife=Math.round(logNumber(rng,40,Math.max(60,250000/(result.identity.tierRank+1)))/(1+route.gradient*.08));
    const overhaul=Math.max(4,Math.round(cycleLife*number(rng,.12,.34)));
    const drift=number(rng,.002,Math.max(.003,12/(result.identity.tierRank+1)),6);
    const abortWindow=Math.max(.0001,result.performance.spoolSeconds*number(rng,.015,.22));
    const singlePoints=integer(rng,result.identity.scaleKey==='fighter'?2:0,result.identity.scaleKey==='megastructure'?9:5);
    return{
      certifiedSuccessProbability:success,
      certifiedSuccessPercent:success*100,
      modeledFailuresPerThousand:failuresPerThousand,
      cycleLife,
      overhaulIntervalCycles:overhaul,
      calibrationDriftPpmPerCycle:drift,
      abortDecisionWindowSeconds:abortWindow,
      abortDecisionWindowText:secondsText(abortWindow),
      singlePointFailureCount:singlePoints,
      redundancy:singlePoints===0?'no modeled single-point failure in the certified field chain':singlePoints<=2?'limited duplicated field and navigation chains':'multiple irreducible or infrastructure-level single points remain',
      inspectionBurden:`${number(rng,.4,18,2)} technician-hours per activation plus ${number(rng,8,900,1)} hours at each major overhaul`,
      certificationBasis:'Generated engineering certification estimate under the selected route, doctrine, maintenance, and infrastructure assumptions; deliberate combat damage and unknown dimensional phenomena are excluded.',
      dominantReliabilityLimit:pick(rng,[result.operational.failures[0],result.operational.failures[1],routeEnvelope.interdictionMethods[0],result.power.energyHurdle]),
      recoveryClass:kinematics.mode==='gate-traversal'?'network recovery depends on an intact opposite mouth and traffic-control authority':kinematics.mode.startsWith('discrete')?'a failed translation may leave no continuous track for rescue':'a disabled craft may remain detectable along the projected route but can emerge with a hazardous residual vector'
    };
  }

  function makeEngineeringMaturity(rng,result){
    const tier=result.identity.tierRank;
    const family=familyMap[result.identity.familyKey];
    const labels=['experimental precursor','laboratory-qualified','prototype flight article','limited operational system','fleet-certified architecture','mature strategic system','advanced deep-range system','compact high-complexity architecture','post-material or civilization-defining infrastructure'];
    const complexity=clamp(Math.round(22+tier*8+(1-family.gravity)*18+(result.identity.infrastructureKey==='self-contained'?8:0)+(result.identity.scaleKey==='fighter'?16:0)),1,100);
    return{
      maturityLabel:labels[tier],
      integrationComplexity:complexity,
      fieldSymmetryTolerancePpm:number(rng,.00001,Math.max(.00002,22/(tier+1)),6),
      timingJitterSeconds:logNumber(rng,1e-18,Math.max(1e-16,1e-7/(tier+1))),
      coilOrEmitterAlignmentMicrons:logNumber(rng,.0001,Math.max(.001,120/(tier+1))),
      prerequisites:[result.hierarchy[tier].principalHurdle,...result.operational.hurdles.slice(0,3),result.power.energyHurdle],
      supplyChain:[result.architecture.fuel,result.architecture.recharge,result.identity.infrastructure,result.navigation.sensorHorizon],
      unresolvedResearch:[...result.operational.edge.slice(0,2),...result.dimensional.factors.slice(0,2)],
      certificationAuthority:pick(rng,['interstellar transit standards directorate','fleet propulsion certification office','gate and corridor safety authority','independent dimensional metrology institute','polity-level strategic mobility commission'])
    };
  }

  function generate(seed,input={},source=null){
    const normalized=normalizeOptions(input);
    const result=base.generate(seed,normalized.options,source);
    const rng=rngFor(`${seed}:ftl-engineering-extension:v2`);
    result.version=2;
    result.power.fuelText=correctMassText(result.power.fuelKg);
    const kinematics=makeKinematics(rng,result);
    const energyBudget=makeEnergyBudget(rng,result,kinematics);
    const routeEnvelope=makeRouteEnvelope(rng,result);
    const reliability=makeReliability(rng,result,kinematics,routeEnvelope);
    const maturity=makeEngineeringMaturity(rng,result);
    const resolved={tier:result.identity.tierKey,family:result.identity.familyKey,scale:result.identity.scaleKey,infrastructure:result.identity.infrastructureKey,route:routeEnvelope.routeKey,doctrine:base.doctrines.find(item=>item.label===result.identity.doctrine)?.key||null,energy:base.energySystems.find(item=>item.label===result.identity.energySystem)?.key||null};
    for(const key of['tier','family','scale','infrastructure','route','doctrine','energy']){
      if(normalized.requested[key]&&normalized.requested[key]!=='random'&&normalized.requested[key]!==resolved[key]&&!normalized.corrections.some(text=>text.toLowerCase().includes(key))){
        normalized.corrections.push(`Requested ${key} "${normalized.requested[key]}" resolved as "${resolved[key]}" because the original combination was outside the certified compatibility envelope.`);
      }
    }
    result.compatibility={requested:normalized.requested,normalized:normalized.options,resolved,corrections:normalized.corrections,fullyHonored:normalized.corrections.length===0};
    result.kinematics=kinematics;
    result.energyBudget=energyBudget;
    result.routeEnvelope=routeEnvelope;
    result.reliability=reliability;
    result.engineeringMaturity=maturity;
    result.performance.practicalKmPerSecond=result.performance.practicalRouteC*C_KM_S;
    result.performance.practicalAuPerYear=result.performance.practicalAuPerDay*365.25;
    result.performance.standardizedRatingRelation=cRelation(result.performance.practicalRouteC);
    result.summary+=` The transit model is ${kinematics.mode.replaceAll('-',' ')}, producing a payload crossing of ${kinematics.payloadTransitText} and a complete mission-cycle effective rate of ${kinematics.missionRelation.label}. Reference-route mission energy is ${energyBudget.missionText}, with ${energyBudget.missionFuelText} of energy medium and a certified operating window available ${routeEnvelope.certifiedWindowText}.`;
    return result;
  }

  globalThis.BlacklightExoFTL=Object.freeze({
    ...base,
    version:2,
    engineeringExtensionVersion:2,
    generate,
    format:Object.freeze({...base.format,massText:correctMassText}),
    transitModes:TRANSIT_MODES
  });
})();