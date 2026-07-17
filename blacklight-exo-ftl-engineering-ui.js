(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function section(id, eyebrow, title, anchorId, after = true){
    let grid=$(id);
    if(grid)return grid;
    const anchor=$(anchorId)?.closest('.bli-section');
    if(!anchor)return null;
    const wrapper=document.createElement('section');
    wrapper.className='bli-section exo-ftl-engineering-section';
    const head=document.createElement('div');head.className='bli-section-head';
    const small=document.createElement('p');small.className='bli-eyebrow';small.textContent=eyebrow;
    const heading=document.createElement('h2');heading.textContent=title;
    grid=document.createElement('div');grid.id=id;grid.className='exo-ftl-grid';
    head.append(small,heading);wrapper.append(head,grid);
    if(after)anchor.after(wrapper);else anchor.before(wrapper);
    return grid;
  }

  function ensureSections(){
    const kinematics=section('exo-ftl-kinematics','Mission kinematics and chronometry','Separate continuous velocity, standardized compression, discrete crossing time, crew time, and complete mission response.','exo-ftl-performance');
    const energy=section('exo-ftl-energy-budget','Mission energy and endurance','Account for activation, sustained transit or physical acceleration, field collapse, mission fuel, recharge, and thermal recovery.','exo-ftl-power');
    const route=section('exo-ftl-route-envelope','Route geometry and interference envelope','Translate gravity wells, barycentric planes, mass shadows, wake persistence, and Q/N disturbances into an operational launch window.','exo-ftl-navigation');
    const reliability=section('exo-ftl-reliability','Reliability, maintenance, and manufacturing','Model certification reliability, field-cycle life, calibration drift, abort timing, single-point failures, tolerances, and supply-chain burden.','exo-ftl-route-envelope');
    const compatibility=section('exo-ftl-compatibility','Resolved architecture compatibility','Document which requested controls were honored and which were corrected because the combination could not physically coexist.','exo-ftl-source-impact',false);
    return{kinematics,energy,route,reliability,compatibility};
  }

  function card(label,title,text,state=''){
    const article=document.createElement('article');article.className='exo-ftl-card';
    if(state)article.dataset.engineeringState=state;
    const small=document.createElement('small'),heading=document.createElement('h3'),paragraph=document.createElement('p');
    small.textContent=label;heading.textContent=title;paragraph.textContent=text;
    article.append(small,heading,paragraph);return article;
  }

  function renderCards(container,rows){
    if(!container)return;
    container.replaceChildren(...rows.map(row=>card(...row)));
  }

  function number(value,digits=3){
    const n=Number(value)||0;
    if(Math.abs(n)>=1e9||Math.abs(n)>0&&Math.abs(n)<1e-5)return n.toExponential(3);
    return n.toLocaleString(undefined,{maximumFractionDigits:digits});
  }

  function relation(value){
    if(!value)return'not established';
    if(value.mode==='sublight')return`${number(value.percentOfC,6)}% of c · ${number(value.percentBelowC,6)}% below light speed`;
    return`${number(value.multipleC,4)}c · ${number(value.percentBeyondC,2)}% beyond light speed`;
  }

  function appendData(label,value){
    const data=$('exo-ftl-rating-data');if(!data)return;
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.dataset.ftlEngineering='true';dd.dataset.ftlEngineering='true';
    dt.textContent=label;dd.textContent=value;data.append(dt,dd);
  }

  function updateRatingSummary(rating){
    const summary=$('exo-ftl-rating-summary');
    if(summary)summary.textContent=`Standardized route rating: ${rating.performance.compressionReading}. Payload crossing: ${rating.kinematics.payloadTransitText}. Complete mission response: ${rating.kinematics.completeMissionText} (${rating.kinematics.missionRelation.label}).`;
    document.querySelectorAll('[data-ftl-engineering="true"]').forEach(node=>node.remove());
    appendData('AU per second',number(rating.performance.practicalAuPerSecond,8));
    appendData('Transit model',rating.kinematics.mode.replaceAll('-',' '));
    appendData('Payload crossing',rating.kinematics.payloadTransitText);
    appendData('Mission-effective speed',rating.kinematics.missionRelation.label);
    appendData('Route-window availability',rating.routeEnvelope.certifiedWindowText);
  }

  function render(rating){
    if(!rating?.kinematics||!rating.energyBudget||!rating.routeEnvelope)return;
    const ui=ensureSections();
    updateRatingSummary(rating);

    renderCards(ui.kinematics,[
      ['Standardized drive rating',rating.performance.cStatus.label,`${relation(rating.performance.standardizedRatingRelation)}. This is the hierarchy’s route-equivalent compression rating, not automatically the time a payload spends crossing a fold or gate.`],
      ['AU and conventional velocity',`${number(rating.performance.practicalAuPerSecond,9)} AU/s`,`${number(rating.performance.practicalAuPerMinute,6)} AU/min; ${number(rating.performance.practicalAuPerHour,4)} AU/h; ${number(rating.performance.practicalAuPerDay,3)} AU/day; ${number(rating.performance.practicalAuPerYear,3)} AU/year; ${number(rating.performance.practicalKmPerSecond,2)} km/s.`],
      ['Payload transit model',rating.kinematics.mode.replaceAll('-',' '),`${rating.kinematics.ratingBasis}. Standardized continuous-equivalent time: ${rating.kinematics.standardizedEquivalentText}; modeled payload crossing: ${rating.kinematics.payloadTransitText}.`],
      ['Payload apparent compression',rating.kinematics.payloadRelation.label,relation(rating.kinematics.payloadRelation)],
      ['Complete mission response',rating.kinematics.completeMissionText,`Includes ${rating.performance.spoolText} spool, ${rating.kinematics.payloadTransitText} payload transit, and ${rating.performance.cooldownText} controlled recovery. Mission-effective rate: ${relation(rating.kinematics.missionRelation)}.`],
      ['Crew and clock behavior',rating.kinematics.crewElapsedText,`${rating.kinematics.chronometricModel}. Estimated route-induced clock disagreement: ${rating.kinematics.estimatedClockDriftText}.${rating.kinematics.gamma?` Cruise gamma ${rating.kinematics.gamma.toFixed(6)}.`:''}`],
      ['Causality class',rating.kinematics.causalityClass,`Reference light time for the selected distance is ${rating.kinematics.referenceLightTimeText}.`]
    ]);

    renderCards(ui.energy,[
      ['Field formation',rating.energyBudget.activationText,`Peak delivery ${rating.energyBudget.peakPowerText}. This establishes the field, throat, translation state, or acceleration solution.`],
      ['Transit or acceleration energy',rating.energyBudget.transitText,`Sustained or equivalent power ${rating.energyBudget.sustainedPowerText}. Physical kinetic requirement: ${rating.energyBudget.kineticText}.`],
      ['Controlled collapse and recovery',rating.energyBudget.collapseText,'Energy reserved for field shutdown, throat stabilization, emergence control, braking, or state reconciliation.'],
      ['Complete reference mission',rating.energyBudget.missionText,rating.energyBudget.accountingNote],
      ['Mission fuel requirement',rating.energyBudget.missionFuelText,`${rating.energyBudget.fuelPerAUText} per AU and ${rating.energyBudget.fuelPerLYText} per light-year at the selected reference route and mass.`],
      ['Carried activation endurance',`${rating.energyBudget.tankageCycles} modeled missions`,`${rating.energyBudget.carriedFuelText} of energy medium before external replenishment, excluding safety segregation and tank mass.`],
      ['Recharge interval',rating.energyBudget.rechargeText,rating.energyBudget.rechargeArchitecture],
      ['Thermal debt',rating.energyBudget.thermalDebtText,`${number(rating.energyBudget.thermalDebtGWh,3)} GWh-equivalent waste requiring storage, radiation, conversion, or disposal.`]
    ]);

    renderCards(ui.route,[
      ['Dominant route environment',rating.routeEnvelope.routeLabel,rating.routeEnvelope.dominantEnvironment],
      ['Certified reference plane',rating.routeEnvelope.referencePlane,`Angular tolerance ${rating.navigation.planeToleranceText}.`],
      ['Origin exclusion volume',rating.routeEnvelope.originExclusionText,'Spool or transition is prohibited inside this modeled radius unless the architecture is specifically recertified for the local mass geometry.'],
      ['Arrival exclusion volume',rating.routeEnvelope.arrivalExclusionText,`Destination sensors must clear this volume; ordinary emergence uncertainty remains ${rating.navigation.referenceArrivalErrorText}.`],
      ['Gradient interference index',number(rating.routeEnvelope.gradientInterferenceIndex,4),`${rating.navigation.gradientLimitText}. Route geometry must be refreshed every ${rating.routeEnvelope.routeSolutionRefreshText}.`],
      ['Operating-window availability',rating.routeEnvelope.certifiedWindowText,'Binary motion, magnetospheres, moving masses, Q-phase turbulence, and traffic wakes can close an otherwise valid route.'],
      ['Drive wake and traffic separation',rating.routeEnvelope.wakePersistenceText,`Wake clearance ${rating.routeEnvelope.wakeClearanceText}; minimum independently solved formation spacing ${rating.routeEnvelope.minimumFormationSpacingText}.`],
      ['Enclosed-mass tolerance',rating.routeEnvelope.massMapToleranceText,'Cargo movement, docking, battle damage, fuel transfer, or artificial gravity changes beyond this tolerance invalidate the certified solution.'],
      ['Strategic interdiction vectors','Route denial without destroying the drive',rating.routeEnvelope.interdictionMethods.join(' · ')]
    ]);

    renderCards(ui.reliability,[
      ['Certified activation reliability',`${rating.reliability.certifiedSuccessPercent.toFixed(6)}%`,`${rating.reliability.modeledFailuresPerThousand.toFixed(5)} modeled critical failures per thousand certified activations. ${rating.reliability.certificationBasis}`],
      ['Field-cycle life',`${rating.reliability.cycleLife.toLocaleString()} cycles`,`Major overhaul every ${rating.reliability.overhaulIntervalCycles.toLocaleString()} activations. ${rating.reliability.inspectionBurden}.`],
      ['Calibration drift',`${rating.reliability.calibrationDriftPpmPerCycle.toFixed(6)} ppm/cycle`,`Abort decision window ${rating.reliability.abortDecisionWindowText}.`],
      ['Redundancy and recovery',`${rating.reliability.singlePointFailureCount} modeled single-point failures`,`${rating.reliability.redundancy}. ${rating.reliability.recoveryClass}.`],
      ['Engineering maturity',rating.engineeringMaturity.maturityLabel,`${rating.engineeringMaturity.integrationComplexity}/100 integration complexity; certification authority: ${rating.engineeringMaturity.certificationAuthority}.`],
      ['Manufacturing tolerances',`${rating.engineeringMaturity.fieldSymmetryTolerancePpm.toExponential(3)} ppm field symmetry`,`Timing jitter ${rating.engineeringMaturity.timingJitterSeconds.toExponential(3)} s; coil or emitter alignment ${rating.engineeringMaturity.coilOrEmitterAlignmentMicrons.toExponential(3)} μm.`],
      ['Required breakthroughs','Prerequisite engineering program',rating.engineeringMaturity.prerequisites.join(' · ')],
      ['Supply-chain dependencies','Industrial support chain',rating.engineeringMaturity.supplyChain.join(' · ')],
      ['Unresolved research','Limits outside ordinary certification',rating.engineeringMaturity.unresolvedResearch.join(' · ')]
    ]);

    const compatibilityRows=rating.compatibility.fullyHonored
      ?[['Compatibility result','Requested architecture accepted','Every explicit control remained inside the certified tier, scale, family, infrastructure, and energy compatibility envelope.','ok']]
      :rating.compatibility.corrections.map((text,index)=>['Compatibility correction',`Correction ${index+1}`,text,'warning']);
    compatibilityRows.push(['Resolved architecture',`${rating.identity.tierKey} · ${rating.identity.familyKey} · ${rating.identity.scaleKey}`,`${rating.identity.infrastructureKey}; ${rating.compatibility.resolved.energy}; route ${rating.compatibility.resolved.route}; doctrine ${rating.compatibility.resolved.doctrine}.`,'resolved']);
    renderCards(ui.compatibility,compatibilityRows);
  }

  document.addEventListener('blacklight:exo-ftl-generated',event=>render(event.detail?.rating));
  queueMicrotask(()=>render(globalThis.BlacklightExoGetActiveFTL?.()));
})();