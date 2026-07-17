(() => {
  'use strict';

  const R=globalThis.BlacklightExoFTLRuntime;
  if(!R)return;
  const {
    P,O,LY_AU,C_KM_S,C_AU_S,TIERS,
    ROUTE_MAP,DOCTRINE_MAP,
    rngFor,pick,integer,number,logNumber,unique,clamp,medianRange,
    secondsToText,distanceText,energyText,powerText,massText,sourceFacts,
    chooseTier,chooseScale,chooseFamily,chooseInfrastructure,chooseEnergy,
    GENERAL_HURDLES,GRAVITY_LIMITS,QN_FACTORS,EDGE_CASES
  }=R;

  function makePerformance(rng,tier,family,scale,infrastructure,route,doctrine,distanceAU){
    let ratedC=logNumber(rng,tier.c[0],tier.c[1])*number(rng,family.speed[0],family.speed[1])*scale.speed*infrastructure.speed*doctrine.speed;
    if(family.key==='inertial-torch')ratedC=Math.min(.995,ratedC);
    const practicalC=Math.max(.0001,ratedC*route.speed*Math.pow(family.gravity,.35));
    const auSecond=practicalC*C_AU_S;
    const transitSeconds=distanceAU/auSecond;
    const spoolSeconds=medianRange(tier.spool)*family.spool*scale.spool*infrastructure.spool*doctrine.spool;
    const cooldownSeconds=medianRange(tier.cooldown)*family.cooldown*(1/doctrine.spool)*route.heat;
    const missionSeconds=spoolSeconds+transitSeconds+cooldownSeconds;
    const cStatus=practicalC<1?{
      mode:'sublight',
      percentOfC:practicalC*100,
      shortfallPercent:(1-practicalC)*100,
      label:`${(practicalC*100).toFixed(4)}% of light speed`
    }:{
      mode:'superluminal',
      multipleC:practicalC,
      percentBeyondC:(practicalC-1)*100,
      label:`${practicalC.toFixed(practicalC<100?3:1)}c · ${((practicalC-1)*100).toLocaleString(undefined,{maximumFractionDigits:1})}% beyond light speed`
    };
    return{
      ratedCleanSpaceC:ratedC,
      practicalRouteC:practicalC,
      cStatus,
      lightTimeCompression:practicalC,
      cleanSpaceAuPerSecond:ratedC*C_AU_S,
      practicalAuPerSecond:auSecond,
      practicalAuPerMinute:auSecond*60,
      practicalAuPerHour:auSecond*3600,
      practicalAuPerDay:auSecond*86400,
      referenceDistanceAU:distanceAU,
      transitSeconds,
      transitText:secondsToText(transitSeconds),
      spoolSeconds,
      spoolText:secondsToText(spoolSeconds),
      cooldownSeconds,
      cooldownText:secondsToText(cooldownSeconds),
      missionSeconds,
      missionText:secondsToText(missionSeconds),
      oneAuText:secondsToText(1/auSecond),
      oneLightYearText:secondsToText(LY_AU/auSecond),
      tenLightYearText:secondsToText(10*LY_AU/auSecond),
      compressionReading:`${(auSecond*3600).toLocaleString(undefined,{maximumFractionDigits:3})} AU/hour · ${practicalC.toLocaleString(undefined,{maximumFractionDigits:3})}× light-time compression`
    };
  }

  function makeRange(rng,tier,family,scale,infrastructure,doctrine,performance){
    const nominal=logNumber(rng,tier.rangeAU[0],tier.rangeAU[1])*family.range*scale.range*infrastructure.range*doctrine.range;
    const reserve=number(rng,.12,.35,3);
    const certified=nominal*(1-reserve);
    return{
      nominalAU:nominal,
      nominalText:distanceText(nominal),
      nominalLy:nominal/LY_AU,
      certifiedAU:certified,
      certifiedText:distanceText(certified),
      reserveFraction:reserve,
      reservePercent:reserve*100,
      timeAtCertifiedRange:secondsToText(certified/(performance.practicalAuPerSecond)),
      routeCountAtReference:Math.max(0,Math.floor(certified/performance.referenceDistanceAU))
    };
  }

  function makeNavigation(rng,tier,family,scale,infrastructure,route,performance,distanceAU){
    const errorPerAU=logNumber(rng,tier.errorKmAU[0],tier.errorKmAU[1])*family.accuracy*scale.accuracy*infrastructure.accuracy*route.error;
    const arrivalError=errorPerAU*Math.sqrt(Math.max(1,distanceAU));
    const exclusionAU=Math.max(.00001,Math.pow(route.gradient,1.18)*number(rng,.00008,.018)*(1/family.gravity));
    const planeTolerance=Math.max(.02,number(rng,.15,18)*(family.key==='gravitic-plane'?.22:1/route.gradient));
    const gradientLimit=Math.max(.000001,number(rng,.00002,.08)*(family.gravity/route.gradient));
    return{
      errorKmPerAU:errorPerAU,
      referenceArrivalErrorKm:arrivalError,
      referenceArrivalErrorText:`±${arrivalError.toLocaleString(undefined,{maximumFractionDigits:2})} km`,
      exclusionAU,
      exclusionText:distanceText(exclusionAU),
      planeToleranceDeg:planeTolerance,
      planeToleranceText:`±${planeTolerance.toFixed(3)}° from the certified departure plane`,
      gradientLimit,
      gradientLimitText:`${gradientLimit.toExponential(3)} g change per 1,000 km across the field solution`,
      solutionRefreshSeconds:Math.max(.01,performance.spoolSeconds/number(rng,80,600)),
      sensorHorizon:pick(rng,['passive gravity tomography','beacon ephemeris fusion','Q-phase interferometry','N-axis parallax array','forward metric lidar','distributed probe and traffic network']),
      destinationVerification:pick(rng,['independent beacon plus astronomical cross-check','two-source phase lock and empty-volume radar confirmation','precomputed ephemeris with last-second mass-map update','gate-authenticated coordinate certificate','autonomous destination probe handshake'])
    };
  }

  function makePower(rng,scale,family,infrastructure,doctrine,route,energy,performance,range){
    const tonnes=logNumber(rng,scale.mass[0],scale.mass[1]);
    const massKg=tonnes*1000;
    const c2=(C_KM_S*1000)**2;
    const speedTerm=1+Math.log10(Math.max(1,performance.ratedCleanSpaceC))**2;
    const rangeTerm=1+Math.log10(Math.max(1,range.nominalAU))/18;
    const coupling=1e-8*family.energy*infrastructure.energy*doctrine.energy*route.heat*speedTerm*rangeTerm;
    const activationJ=massKg*c2*coupling;
    const averagePowerW=activationJ/Math.max(.01,performance.spoolSeconds);
    const fuelKg=activationJ/(energy.specific*energy.efficiency);
    const wasteJ=activationJ*(1-energy.efficiency);
    const storageJ=activationJ*number(rng,1.08,1.32);
    return{
      referenceMassTonnes:tonnes,
      referenceMassText:`${tonnes.toLocaleString(undefined,{maximumFractionDigits:2})} tonnes`,
      activationJ,
      activationText:energyText(activationJ),
      averagePowerW,
      averagePowerText:powerText(averagePowerW),
      storageJ,
      storageText:energyText(storageJ),
      fuelKg,
      fuelText:massText(fuelKg),
      wasteJ,
      wasteText:energyText(wasteJ),
      efficiency:energy.efficiency,
      efficiencyPercent:energy.efficiency*100,
      recharge:energy.recharge,
      fuel:energy.fuel,
      waste:energy.waste,
      energyHurdle:energy.hurdle,
      emergencyReserve:`${number(rng,1.1,2.8,2)} complete activation cycles held outside the main field bank`
    };
  }

  function makeDimensional(rng,family,tier){
    const qIndex=integer(rng,1,Math.max(2,tier.rank+1));
    const nDimensions=family.key==='n-manifold'?integer(rng,5,Math.min(14,6+tier.rank)):family.key==='q-lattice'||family.key==='slipstream-shear'?integer(rng,4,8):4;
    const coherence=number(rng,.00002,.45,6)/Math.max(1,tier.rank);
    return{
      framework:family.dimension,
      qPhaseIndex:qIndex,
      activeDimensions:nDimensions,
      coherenceWindowSeconds:coherence,
      coherenceWindowText:secondsToText(coherence),
      topologyTolerance:`${number(rng,1e-12,1e-6,12).toExponential(3)} normalized manifold error`,
      computationalLoad:`${Math.round((nDimensions**3)*(tier.rank+1)*number(rng,18,280)).toLocaleString()} synchronized solution channels`,
      factors:unique(rng,QN_FACTORS,integer(rng,4,7))
    };
  }

  function makeHierarchy(currentTier,family){
    return TIERS.map(tier=>({
      key:tier.key,
      rank:tier.rank,
      label:tier.label,
      status:tier.rank<currentTier.rank?'mastered precursor':tier.rank===currentTier.rank?'current capability':'future or unavailable',
      cRange:tier.c[1]<1?`${(tier.c[0]*100).toFixed(1)}–${(tier.c[1]*100).toFixed(1)}% c`:`${tier.c[0].toLocaleString()}–${tier.c[1].toLocaleString()}c`,
      range:`${distanceText(tier.rangeAU[0])}–${distanceText(tier.rangeAU[1])}`,
      typicalVessels:tier.vessels.join(', '),
      principalHurdle:tier.hurdle,
      compatible:currentTier.rank===tier.rank||tier.rank>=family.tiers[0]&&tier.rank<=family.tiers[1]
    }));
  }

  function makeName(rng,family,tier,scale,facts){
    const anchor=facts.polity?.split(' ')[0]||facts.systemNames[0]?.split(' ')[0]||pick(rng,['Aster','Cael','Drax','Helio','Lumen','Nex','Prax','Rhea','Talon','Umbra','Vey','Warden']);
    const model=pick(rng,['Drive','Transit Engine','Field System','Translation Array','Manifold Plant','Jump Architecture','Mobility Core']);
    return`${anchor} ${family.label.replace(/Drive|Transit|Translation|Phase|Envelope/,'').trim()} ${model} Mark ${tier.rank+1}${scale.key==='megastructure'?' Gatework':''}`.replace(/\s+/g,' ').trim();
  }

  function makeOperational(rng,family,route,scale,infrastructure,performance,navigation){
    const hurdles=unique(rng,[...family.hurdles,...GENERAL_HURDLES],integer(rng,7,10));
    const gravity=unique(rng,[...GRAVITY_LIMITS,...family.constraints],integer(rng,6,9));
    const edge=unique(rng,[...family.edge,...EDGE_CASES,route.description],integer(rng,8,12));
    const failures=unique(rng,[...family.failures,
      'field-bank overvoltage and uncontrolled discharge',
      'navigation solution accepted with stale ephemeris data',
      'thermal store saturation before safe collapse',
      'drive wake coupling to another nearby transit system',
      'emergence inside an uncertified exclusion volume'
    ],integer(rng,6,9));
    const protocols=[
      `Do not begin spool until the local gravity gradient is below ${navigation.gradientLimitText}.`,
      `Maintain the departure vector within ${navigation.planeToleranceText}.`,
      `Reserve ${performance.cooldownText} after emergence before another certified activation.`,
      `Treat every beacon, Q-address, and destination ephemeris as hostile until independently cross-checked.`,
      `Recalculate the complete hull mass map after docking, cargo transfer, battle damage, or major internal movement.`,
      `Keep all nonparticipating vessels outside the drive interaction envelope during spool and collapse.`,
      `Abort if destination verification cannot guarantee an empty volume larger than ${navigation.exclusionText}.`
    ];
    return{hurdles,gravity,edge,failures,protocols};
  }

  function makeSourceImpact(facts,tier,family,infrastructure){
    const effects=[];
    if(facts.type==='standalone')effects.push('No imported polity or system record constrained this hierarchy.');
    if(facts.technology)effects.push(`Imported technology level "${facts.technology}" established a Tier ${tier.rank} starting point.`);
    if(facts.reach)effects.push(`Imported territorial reach "${facts.reach}" influenced the minimum strategic range.`);
    if(facts.strategicAssets.length)effects.push(`Existing strategic assets (${facts.strategicAssets.join(', ')}) influenced drive-family and infrastructure selection.`);
    if(facts.economy)effects.push(`The ${facts.economy} must support the selected ${infrastructure.label.toLowerCase()} supply chain.`);
    if(facts.condition)effects.push(`Political condition "${facts.condition}" affects maintenance, route trust, and proliferation risk.`);
    if(facts.systemNames.length>1)effects.push(`${facts.systemNames.length} named systems provide an initial network geometry.`);
    if(facts.population)effects.push(`${facts.population.toLocaleString()} represented inhabitants create civilian throughput and evacuation requirements.`);
    effects.push(`${family.label} was selected within its certified Tier ${family.tiers[0]}–${family.tiers[1]} development window.`);
    return effects;
  }

  function generate(seed,options={},source=null){
    const rng=rngFor(seed);
    const facts=sourceFacts(source);
    const tier=chooseTier(rng,options,facts);
    const scale=chooseScale(rng,options,tier);
    const family=chooseFamily(rng,options,tier,scale,facts);
    const infrastructure=chooseInfrastructure(rng,options,family,scale);
    const route=ROUTE_MAP[options.route]||pick(rng,R.routes);
    const doctrine=DOCTRINE_MAP[options.doctrine]||pick(rng,R.doctrines);
    const energy=chooseEnergy(rng,options,family,tier,infrastructure);
    const distanceValue=Math.max(.000001,Number(options.distance)||1);
    const distanceAU=options.distanceUnit==='ly'?distanceValue*LY_AU:distanceValue;
    const performance=makePerformance(rng,tier,family,scale,infrastructure,route,doctrine,distanceAU);
    const range=makeRange(rng,tier,family,scale,infrastructure,doctrine,performance);
    const navigation=makeNavigation(rng,tier,family,scale,infrastructure,route,performance,distanceAU);
    const power=makePower(rng,scale,family,infrastructure,doctrine,route,energy,performance,range);
    const dimensional=makeDimensional(rng,family,tier);
    const operational=makeOperational(rng,family,route,scale,infrastructure,performance,navigation);
    const name=makeName(rng,family,tier,scale,facts);
    const riskScore=clamp(Math.round(
      12+tier.rank*4+route.gradient*4+Math.log10(Math.max(1,performance.practicalRouteC))*3+
      (infrastructure.key==='self-contained'?8:-3)+(scale.key==='fighter'?12:0)+(facts.condition&&/fractured|decline|war|contested/i.test(facts.condition)?14:0)
    ),3,100);
    const riskLabel=riskScore>=82?'Critical':riskScore>=62?'Severe':riskScore>=42?'High':riskScore>=24?'Moderate':'Controlled';
    return{
      name,
      version:1,
      seed,
      generatedAt:new Date().toISOString(),
      source:{
        type:facts.type,
        seed:facts.sourceSeed,
        polity:facts.polity,
        government:facts.governmentModel,
        technology:facts.technology,
        reach:facts.reach,
        economy:facts.economy,
        condition:facts.condition,
        population:facts.population,
        systemNames:[...facts.systemNames]
      },
      identity:{
        name,
        family:family.label,
        familyKey:family.key,
        tier:tier.label,
        tierKey:tier.key,
        tierRank:tier.rank,
        scale:scale.label,
        scaleKey:scale.key,
        infrastructure:infrastructure.label,
        infrastructureKey:infrastructure.key,
        doctrine:doctrine.label,
        routeEnvironment:route.label,
        energySystem:energy.label,
        dimensionalFramework:family.dimension
      },
      performance,
      range,
      navigation,
      power,
      dimensional,
      architecture:{
        transitMethod:family.constraints[0],
        fieldMethod:family.dimension,
        referenceVehicle:scale.label,
        referenceMass:power.referenceMassText,
        infrastructure:infrastructure.description,
        scaleChallenge:scale.challenge,
        energySystem:energy.label,
        fuel:energy.fuel,
        recharge:energy.recharge,
        thermalBurden:energy.waste,
        certifiedTierWindow:`Tier ${family.tiers[0]} through Tier ${family.tiers[1]}`
      },
      operational,
      hierarchy:makeHierarchy(tier,family),
      sourceImpact:makeSourceImpact(facts,tier,family,infrastructure),
      risk:{
        score:riskScore,
        label:riskLabel,
        drivers:[
          `${route.label} environmental penalty`,
          `${family.label} dimensional and field complexity`,
          `${scale.label} integration burden`,
          `${infrastructure.label} dependency model`,
          `${energy.label} energy containment`
        ]
      },
      summary:`${name} is a ${tier.label.toLowerCase()} ${family.label.toLowerCase()} rated at ${performance.cStatus.label}. Its practical reference-route output is ${performance.compressionReading}, with a certified single-transit range of ${range.certifiedText}. The installation uses ${energy.label.toLowerCase()} aboard a ${scale.label.toLowerCase()} and is constrained by ${family.dimension.toLowerCase()}, local gravity-gradient limits, destination verification, thermal recovery, and ${route.label.toLowerCase()} route conditions.`,
      fileName:`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-ftl-hierarchy.json`
    };
  }

  globalThis.BlacklightExoFTL=Object.freeze({
    version:1,
    constants:P.constants,
    tiers:P.tiers,
    families:P.families,
    scales:O.scales,
    infrastructures:O.infrastructures,
    routes:O.routes,
    doctrines:O.doctrines,
    energySystems:O.energySystems,
    sourceFacts,
    generate,
    format:Object.freeze({secondsToText,distanceText,energyText,powerText,massText})
  });
})();