(() => {
  'use strict';
  const C=globalThis.BlacklightExoFTLCertificationAudit;if(!C)return;
  const {EPS,clamp,finite,num,pct,seconds,probability,policy}=C;
  C.reliabilityAudit=function(result){
    const r=result.reliability||{},e=result.energyBudget||{},m=result.engineeringMaturity||{},standard=policy(result);
    const success=clamp(finite(r.certifiedSuccessProbability,finite(r.certifiedSuccessPercent,0)/100),0,1),successPercent=success*100,failure=Math.max(EPS,finite(r.modeledFailuresPerThousand,(1-success)*1000)/1000);
    const cycleLife=Math.max(1,Math.round(finite(r.cycleLife,1))),overhaul=Math.max(1,Math.round(finite(r.overhaulIntervalCycles,1))),tankage=Math.max(1,Math.round(finite(e.tankageCycles,1)));
    const meanBetween=1/failure,expectedOverhaul=failure*overhaul,expectedLife=failure*cycleLife,drift=Math.max(0,finite(r.calibrationDriftPpmPerCycle)),tolerance=Math.max(EPS,finite(m.fieldSymmetryTolerancePpm));
    const calibrationInterval=drift>0?tolerance/drift:Infinity,driftOverhaul=drift*overhaul,abort=Math.max(0,finite(r.abortDecisionWindowSeconds)),spool=Math.max(EPS,finite(result.performance?.spoolSeconds,1)),singlePoints=Math.max(0,Math.round(finite(r.singlePointFailureCount)));
    const deficit=standard.minimumSuccess-successPercent;
    let status='authorized';
    if(deficit>1||successPercent<95)status='refused';
    else if(deficit>0||singlePoints>2||calibrationInterval<1)status='restricted';
    else if(singlePoints>0||calibrationInterval<overhaul)status='conditionally authorized';
    const confidence=clamp(90-(6-finite(result.pathLevel?.rank,0))*3-Math.min(25,failure*180)-singlePoints*2,20,96);
    const survival=n=>probability(success,n);
    return{
      status,
      policy:{class:standard.label,minimumSuccessPercent:standard.minimumSuccess,minimumSuccessText:`${standard.minimumSuccess.toFixed(3)}% minimum per certified activation`,note:'This is an in-universe Blacklight certification threshold chosen for the installation class. It is a policy requirement, not a physical constant.'},
      confidencePercent:confidence,confidenceText:`${confidence.toFixed(1)}% reliability-model confidence`,
      standingFinding:status==='authorized'?'The modeled activation reliability meets the installation-class threshold without unresolved single-point restrictions.':status==='conditionally authorized'?'The nominal activation reliability is acceptable, but redundancy or calibration conditions prevent unrestricted service.':status==='restricted'?'I would limit this system to controlled routes, reduced occupancy, or test authority until reliability, redundancy, or calibration burden improves.':'I would not authorize ordinary activation at the modeled failure rate.',
      assumptions:[
        `The generated model reports ${successPercent.toFixed(6)}% success per certified activation and ${num(failure*1000,6)} critical failures per thousand activations.`,
        `Repeated-mission survival treats critical activations as independent planning events. Common-mode defects, combat damage, sabotage, and unknown dimensional phenomena are excluded.`,
        `Major overhaul is scheduled every ${overhaul.toLocaleString()} activations within a modeled component life of ${cycleLife.toLocaleString()} activations.`,
        `Field-symmetry tolerance is ${num(tolerance,6)} ppm and generated calibration drift is ${num(drift,6)} ppm per activation.`
      ],
      calculations:[
        {label:'Mean activations between modeled critical failures',expression:'1 ÷ critical failure probability per activation',substitution:`1 ÷ ${num(failure,9)}`,resultText:`${num(meanBetween,2)} activations per modeled critical failure`,meaning:'This is a fleet-planning mean, not a promise that a new machine will survive that many cycles.'},
        {label:'Ten-activation survival',expression:'per-activation success raised to 10',substitution:`${num(success,9)}^10`,resultText:`${pct(survival(10)*100,6)} probability of ten critical-failure-free activations`,meaning:'Repeated use compounds even a small per-activation risk.'},
        {label:'Hundred-activation survival',expression:'per-activation success raised to 100',substitution:`${num(success,9)}^100`,resultText:`${pct(survival(100)*100,6)} probability of one hundred critical-failure-free activations`,meaning:'This is the more useful strategic measure for routine fleet service than a single impressive percentage.'},
        {label:'Carried-endurance survival',expression:'per-activation success raised to carried mission cycles',substitution:`${num(success,9)}^${tankage}`,resultText:`${pct(survival(tankage)*100,6)} probability of exhausting ${tankage} carried mission cycles without a modeled critical failure`,meaning:'Energy endurance and reliability endurance are separate. Carrying fuel for a mission does not guarantee surviving it.'},
        {label:'Expected critical failures before overhaul',expression:'failure probability × overhaul interval',substitution:`${num(failure,9)} × ${overhaul}`,resultText:`${num(expectedOverhaul,6)} expected critical failures per overhaul interval across a large fleet`,meaning:expectedOverhaul>.1?'The overhaul interval is long relative to the modeled failure burden; earlier intervention or stronger redundancy is indicated.':'The modeled critical-failure burden remains low over one overhaul interval.'},
        {label:'Expected critical failures across component life',expression:'failure probability × cycle life',substitution:`${num(failure,9)} × ${cycleLife}`,resultText:`${num(expectedLife,6)} expected critical failures across the nominal component life`,meaning:'A component life can be mechanically long while the complete system remains statistically unsuitable for repeated service.'},
        {label:'Calibration interval implied by drift',expression:'field-symmetry tolerance ÷ drift per activation',substitution:`${num(tolerance,6)} ppm ÷ ${num(drift,6)} ppm/cycle`,resultText:Number.isFinite(calibrationInterval)?`${num(calibrationInterval,4)} activations before nominal tolerance is consumed`:'No finite drift interval established',meaning:calibrationInterval<1?'The model requires continuous or post-activation calibration; periodic overhaul alone cannot preserve alignment.':calibrationInterval<overhaul?'Calibration must occur more frequently than major overhaul.':'The generated overhaul interval occurs before accumulated drift consumes the nominal tolerance.'},
        {label:'Abort authority',expression:'abort decision window ÷ spool interval',substitution:`${seconds(abort)} ÷ ${seconds(spool)}`,resultText:`${pct(abort/spool*100,5)} of spool time available for abort decision`,meaning:abort<.25?'Human reaction is not a credible primary safeguard. Automated detection and independent hard aborts are mandatory.':'Human confirmation may be possible, but automatic protection remains the primary authority.'},
        {label:'Accumulated drift at overhaul',expression:'drift per activation × overhaul interval',substitution:`${num(drift,6)} ppm × ${overhaul}`,resultText:`${num(driftOverhaul,6)} ppm accumulated open-loop drift`,meaning:`This is ${num(driftOverhaul/Math.max(EPS,tolerance),3)} times the stated field-symmetry tolerance if no intermediate calibration occurs.`}
      ],
      refusalConditions:[
        `I will refuse ordinary service if per-activation success falls below the ${standard.minimumSuccess.toFixed(3)}% policy threshold for a ${standard.label}.`,
        'I will refuse certification when failure evidence is correlated across supposedly redundant channels or when common-mode causes are not represented in the model.',
        `I will require automatic abort authority because the current decision window is ${r.abortDecisionWindowText||seconds(abort)}.`,
        singlePoints?`I will not call the machine fully redundant while ${singlePoints} modeled single-point failure${singlePoints===1?' remains':'s remain'}.`:'No modeled single-point failure remains in the certified field chain.',
        calibrationInterval<1?'I will refuse operation without continuous calibration because one activation can consume more than the nominal symmetry tolerance.':`I will refuse operation after ${Math.max(1,Math.floor(calibrationInterval)).toLocaleString()} uncalibrated activation${Math.floor(calibrationInterval)===1?'':'s'} or any event that invalidates the reference state.`,
        'I will refuse to extrapolate this reliability estimate to combat damage, sabotage, uncharted dimensional phenomena, or maintenance conditions outside the certification basis.'
      ],
      sourceValues:{successPercent,failuresPerThousand:failure*1000,cycleLife,overhaulIntervalCycles:overhaul,calibrationDriftPpmPerCycle:drift,fieldSymmetryTolerancePpm:tolerance,abortDecisionWindowSeconds:abort,singlePointFailureCount:singlePoints,tankageCycles:tankage,inspectionBurden:r.inspectionBurden||null,dominantReliabilityLimit:r.dominantReliabilityLimit||null,recoveryClass:r.recoveryClass||null}
    };
  };
})();
