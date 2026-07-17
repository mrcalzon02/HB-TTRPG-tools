(() => {
  'use strict';
  const C=globalThis.BlacklightExoFTLCertificationAudit;if(!C)return;
  const {EPS,clamp,finite,num,pct,seconds,distance,mass}=C;
  C.routeAudit=function(result){
    const r=result.routeEnvelope||{},n=result.navigation||{},p=result.performance||{},m=result.mechanism||{};
    const availability=clamp(finite(r.certifiedWindowAvailabilityPercent,0),0,100),origin=Math.max(0,finite(r.originExclusionAU)),arrival=Math.max(0,finite(r.arrivalExclusionAU));
    const wake=Math.max(EPS,finite(r.wakePersistenceSeconds)),wakeClearance=Math.max(0,finite(r.wakeClearanceKm)),formation=Math.max(wakeClearance,finite(r.minimumFormationSpacingKm,wakeClearance));
    const refresh=Math.max(EPS,finite(n.solutionRefreshSeconds,finite(p.spoolSeconds,1))),spool=Math.max(0,finite(p.spoolSeconds)),updates=Math.max(1,Math.ceil(spool/refresh));
    const massTolerancePercent=Math.max(0,finite(r.massMapTolerancePercent)),massToleranceFraction=massTolerancePercent/100;
    const enclosedMassKg=Math.max(0,finite(result.power?.referenceMassTonnes,result.pathLevel?.facilityMassTonnes)*1000),absoluteMassKg=enclosedMassKg*massToleranceFraction;
    const gradient=Math.max(0,finite(r.gradientInterferenceIndex)),availableHours=24*availability/100,availableDays=365.25*availability/100,maxLaneHour=3600/wake;
    const specialWindow=availability<5||gradient>20,routeStatus=specialWindow?'restricted':'conditionally authorized';
    const confidence=clamp(88-(6-finite(result.pathLevel?.rank,0))*4-(100-availability)*.22-Math.min(28,gradient*.7),18,94);
    return{
      status:routeStatus,
      confidencePercent:confidence,
      confidenceText:`${confidence.toFixed(1)}% route-model confidence`,
      liveClearance:'not established by a generated dossier',
      standingFinding:specialWindow?'I would not schedule this as routine traffic. The route requires a rare or high-interference operating window and current authority confirmation.':'The route is suitable for conditional planning, but I still require current sensor and traffic clearance before activation.',
      assumptions:[
        `The selected environment is ${r.routeLabel||result.identity?.routeKey||'unidentified'} and the modeled operating window is ${availability.toFixed(2)}% of route time.`,
        `Departure must occur outside ${r.originExclusionText||distance(origin)}; arrival must clear ${r.arrivalExclusionText||distance(arrival)}.`,
        `The route solution must be refreshed every ${r.routeSolutionRefreshText||seconds(refresh)} and the certified enclosed mass may vary by no more than ${r.massMapToleranceText||pct(massTolerancePercent,6)}.`,
        'This dossier contains no live ephemeris, traffic-control feed, hostile-interference report, or current destination occupancy scan.'
      ],
      calculations:[
        {label:'Modeled route duty cycle',expression:'24 hours × route availability',substitution:`24 h × ${availability.toFixed(2)}%`,resultText:`${num(availableHours,3)} available hours per representative day; ${num(availableDays,2)} day-equivalents per year`,meaning:'This is a planning average. It does not predict which hours are open or guarantee that windows are evenly distributed.'},
        {label:'Departure and arrival clearance ratio',expression:'arrival exclusion radius ÷ origin exclusion radius',substitution:`${distance(arrival)} ÷ ${distance(origin)}`,resultText:`${num(arrival/Math.max(EPS,origin),4)}:1 arrival-to-origin clearance`,meaning:arrival>origin?'Destination clearance is the larger geometric burden; arrival reconnaissance and traffic exclusion dominate.':'Departure and arrival clearances are comparable or departure-dominated.'},
        {label:'Route updates during spool',expression:'ceiling(spool interval ÷ solution refresh interval)',substitution:`${seconds(spool)} ÷ ${seconds(refresh)}`,resultText:`At least ${updates.toLocaleString()} independently accepted route solution${updates===1?'':'s'} during spool`,meaning:updates>1?'The controller must continuously replace an aging solution while the machine charges. A single pre-spool calculation is insufficient.':'One accepted solution can remain current through the modeled spool interval.'},
        {label:'Absolute enclosed-mass allowance',expression:'certified enclosed mass × mass-map tolerance',substitution:`${mass(enclosedMassKg)} × ${pct(massTolerancePercent,6)}`,resultText:`±${mass(absoluteMassKg)} allowed unmodeled mass change`,meaning:'Cargo movement, docking, fuel transfer, battle damage, crew relocation, or artificial-gravity changes beyond this value invalidate the route solution.'},
        {label:'Single-lane wake throughput ceiling',expression:'3,600 seconds ÷ wake persistence',substitution:`3,600 s ÷ ${seconds(wake)}`,resultText:`${num(maxLaneHour,4)} theoretical activations per hour before traffic and recovery margins`,meaning:`The minimum formation spacing is ${num(formation,2)} km and the wake-clearance radius is ${num(wakeClearance,2)} km. Real traffic control must schedule below this ceiling.`},
        {label:'Gradient interference burden',expression:'environmental gradient ÷ family gravity tolerance',substitution:r.gradientLimit?`${num(gradient,5)} index; stated limit ${r.gradientLimit}`:`${num(gradient,5)} normalized index`,resultText:`${num(gradient,5)} route-interference index`,meaning:gradient>20?'The route is dominated by environmental geometry rather than nominal drive capability.':gradient>5?'Environmental correction is a major part of the control solution.':'The route geometry is comparatively mild for this drive family.'}
      ],
      refusalConditions:[
        `I will refuse activation if the vessel or protected volume is inside the ${r.originExclusionText||distance(origin)} origin exclusion radius.`,
        `I will refuse arrival commitment until an empty destination volume outside the ${r.arrivalExclusionText||distance(arrival)} arrival exclusion radius is independently confirmed.`,
        `I will refuse a route solution older than ${r.routeSolutionRefreshText||seconds(refresh)} or one that cannot be refreshed throughout spool.`,
        `I will refuse activation if enclosed mass differs from the certified map by more than ±${mass(absoluteMassKg)} (${r.massMapToleranceText||pct(massTolerancePercent,6)}).`,
        `I will refuse activation while another transit wake remains inside ${r.wakeClearanceText||`${num(wakeClearance,1)} km`} or formation spacing is below ${r.minimumFormationSpacingText||`${num(formation,1)} km`}.`,
        `I will refuse authorization if current gravity, Q-phase, N-axis, beacon, chronology, or destination references cannot reproduce the certified route within the stated control tolerances.`,
        ...(r.interdictionMethods||[]).map(method=>`I will treat evidence of ${method} as an active route-denial condition.`)
      ],
      liveDataRequired:['current mass and ephemeris solution','destination occupancy and debris scan','traffic-control wake ledger','beacon, Q-phase, N-axis, chronology, or manifold reference integrity','current hull and cargo mass map','hostile interference and infrastructure status'],
      sourceValues:{availabilityPercent:availability,originExclusionAU:origin,arrivalExclusionAU:arrival,wakePersistenceSeconds:wake,wakeClearanceKm:wakeClearance,minimumFormationSpacingKm:formation,solutionRefreshSeconds:refresh,massTolerancePercent,gradientInterferenceIndex:gradient,coverageRule:m.coverage?.inclusionRule||null}
    };
  };
})();
