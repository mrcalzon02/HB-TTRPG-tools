(() => {
  'use strict';

  const base=globalThis.BlacklightExoFTL;
  const D=globalThis.BlacklightExoFTLMechanismDefinitions;
  if(!base||!D||base.mechanismDepthVersion)return;

  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  function rngFor(seed){let state=hash(seed)||1;return()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};}
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const number=(rng,min,max)=>min+(max-min)*rng();
  const clone=value=>JSON.parse(JSON.stringify(value));

  function interpolate(axis,rank,rng){
    const nominal=clamp(rank/6+number(rng,-.035,.035),0,1);
    if(axis.scale==='log'&&axis.p0>0&&axis.p6>0){
      return 10**(Math.log10(axis.p0)+(Math.log10(axis.p6)-Math.log10(axis.p0))*nominal);
    }
    return axis.p0+(axis.p6-axis.p0)*nominal;
  }

  function formatValue(value,unit){
    const abs=Math.abs(value);
    let text;
    if(abs===0)text='0';
    else if(abs>=1e12||abs<1e-6)text=value.toExponential(4);
    else if(abs>=1e6)text=value.toLocaleString(undefined,{maximumFractionDigits:1});
    else if(abs>=1000)text=value.toLocaleString(undefined,{maximumFractionDigits:2});
    else if(abs>=1)text=value.toLocaleString(undefined,{maximumFractionDigits:5});
    else text=value.toPrecision(5);
    return `${text} ${unit}`.trim();
  }

  function estimateCoverage(result,doctrine,level){
    const payloadTonnes=Math.max(.001,Number(result.power?.referenceMassTonnes)||1);
    const massKg=payloadTonnes*1000;
    const effectiveDensity=320;
    const sphereRadius=Math.cbrt((3*(massKg/effectiveDensity))/(4*Math.PI));
    const hullLength=Math.max(2,sphereRadius*(4.5+level.rank*.18));
    const hullBeam=Math.max(1,sphereRadius*2.15);
    const margin=.04+level.rank*.035;
    const envelopeLength=hullLength*(1+margin*2);
    const envelopeDiameter=hullBeam*(1+margin*2);
    const volume=Math.PI*(envelopeDiameter/2)**2*envelopeLength;
    const apparatusTonnes=Math.max(payloadTonnes,Number(result.pathLevel?.facilityMassTonnes)||payloadTonnes);
    const ratio=apparatusTonnes/payloadTonnes;
    const type=doctrine.coverage.type;
    let extent;
    if(type==='structural-thrust-and-shield')extent=`${hullLength.toFixed(1)} m thrust load path with a projected shield cone at least ${(hullLength*(8-level.rank*.6)).toFixed(1)} m ahead of the bow`;
    else if(type==='spatial-aperture-and-throat')extent=`clear aperture approximately ${envelopeDiameter.toFixed(1)} m across, with no hull contact at the curvature rim`;
    else if(type==='distributed-gravity-tensor')extent=`flattened controlled tensor approximately ${envelopeLength.toFixed(1)} m long, ${envelopeDiameter.toFixed(1)} m wide, and ${(envelopeDiameter*(.35+level.rank*.04)).toFixed(1)} m thick`;
    else if(type==='phase-skin-boundary')extent=`phase skin following the complete ${hullLength.toFixed(1)} m hull with ${(margin*hullBeam).toFixed(2)} m minimum stand-off`;
    else extent=`closed controlled volume approximately ${envelopeLength.toFixed(1)} m long by ${envelopeDiameter.toFixed(1)} m across`;
    return{
      type,
      payloadMassTonnes:payloadTonnes,
      payloadMassText:base.format.massText(payloadTonnes*1000),
      estimatedHullLengthM:hullLength,
      estimatedHullBeamM:hullBeam,
      controlledLengthM:envelopeLength,
      controlledDiameterM:envelopeDiameter,
      controlledVolumeM3:volume,
      coverageMarginPercent:margin*100,
      apparatusToPayloadRatio:ratio,
      extent,
      stageCapability:level.coverage,
      containmentMethod:level.containment
    };
  }

  function buildBenchmarks(doctrine,rank,seed){
    const currentRng=rngFor(`${seed}:mechanism-benchmarks:${rank}`);
    const current=doctrine.benchmarks.map(axis=>{
      const value=interpolate(axis,rank,currentRng);
      return{...axis,value,valueText:formatValue(value,axis.unit)};
    });
    const progression=D.levels.map(level=>{
      const rng=rngFor(`${seed}:mechanism-progression:${level.rank}`);
      return{
        key:level.key,
        rank:level.rank,
        label:level.label,
        values:doctrine.benchmarks.map(axis=>{
          const value=interpolate(axis,level.rank,rng);
          return{key:axis.key,label:axis.label,unit:axis.unit,value,valueText:formatValue(value,axis.unit),direction:axis.direction};
        })
      };
    });
    return{current,progression};
  }

  function generatedConditions(result){
    const conditions=[];
    if(result.routeEnvelope){
      conditions.push(`Begin initiation outside the modeled origin exclusion radius of ${result.routeEnvelope.originExclusionText}.`);
      conditions.push(`The route is available during approximately ${result.routeEnvelope.certifiedWindowText}.`);
      conditions.push(`Keep other traffic beyond the generated wake clearance of ${result.routeEnvelope.wakeClearanceText}.`);
      conditions.push(`Recalculate if enclosed mass changes beyond ${result.routeEnvelope.massMapToleranceText}.`);
    }
    if(result.navigation){
      conditions.push(`Maintain the certified departure geometry within ${result.navigation.planeToleranceText}.`);
      conditions.push(`Verify a destination clearance volume of at least ${result.navigation.exclusionText}.`);
      conditions.push(`Refresh the navigation solution every ${base.format.secondsToText(result.navigation.solutionRefreshSeconds)} or faster.`);
    }
    if(result.dimensional){
      conditions.push(`Hold Q-phase index ${result.dimensional.qPhaseIndex} across ${result.dimensional.activeDimensions} active dimensions for the ${result.dimensional.coherenceWindowText} coherence window.`);
    }
    return conditions;
  }

  function buildMechanism(result,doctrine,seed){
    const rank=clamp(Number(result.pathLevel?.rank)||0,0,6);
    const level=D.levels[rank];
    const benchmarks=buildBenchmarks(doctrine,rank,seed);
    const coverage=estimateCoverage(result,doctrine,level);
    const currentEnergy=result.identity.energySystem;
    const functionalStatement=`${currentEnergy} supplies the ${doctrine.primeMover.name.toLowerCase()}. ${doctrine.primeMover.transduction} The immediate engineered output is ${doctrine.primeMover.output}. The vessel-wide application method is: ${doctrine.coverage.method}`;
    const refinement=[
      `${level.label} control standard: ${level.control}.`,
      `${level.label} coverage standard: ${level.coverage}.`,
      `${level.label} containment standard: ${level.containment}.`,
      level.refinement,
      `Current apparatus-to-payload mass ratio is approximately ${coverage.apparatusToPayloadRatio.toLocaleString(undefined,{maximumFractionDigits:3})}:1.`,
      `Current charge and recovery cycle is ${result.performance.spoolText} spool plus ${result.performance.cooldownText} controlled recovery.`,
      `Current path energy burden is ${result.energyBudget?.pathEnergyMultiplier?.toFixed(3)||'1.000'}× the underlying mature architecture model.`
    ];
    return{
      doctrineLabel:doctrine.label,
      principle:doctrine.principle,
      poweredAction:doctrine.poweredAction,
      functionalStatement,
      motivators:[...doctrine.motivators],
      primeMover:{...clone(doctrine.primeMover),currentEnergySystem:currentEnergy,currentFuel:result.architecture?.fuel,currentPowerCycle:result.energyBudget?.missionText,currentPeakPower:result.energyBudget?.peakPowerText},
      machineChain:clone(doctrine.machineChain),
      coverage:{...clone(doctrine.coverage),...coverage},
      operationalCycle:{initiation:clone(doctrine.initiation),transit:clone(doctrine.transit),termination:clone(doctrine.termination)},
      environment:{requirements:clone(doctrine.environmentalRequirements),generatedConditions:generatedConditions(result),effects:clone(doctrine.environmentalEffects)},
      mechanicalConstraints:clone(doctrine.mechanicalConstraints),
      controlVariables:clone(doctrine.controlVariables),
      benchmarks:benchmarks.current,
      benchmarkProgression:benchmarks.progression,
      refinement:{levelKey:level.key,rank:level.rank,label:level.label,control:level.control,coverage:level.coverage,containment:level.containment,unchangedBaseMethod:doctrine.principle,currentRefinements:refinement},
      signatures:[
        `${result.energyBudget?.peakPowerText||result.power?.averagePowerText} peak or spool power signature`,
        `${result.routeEnvelope?.wakePersistenceText||result.performance.cooldownText} modeled wake or environmental recovery time`,
        ...doctrine.environmentalEffects.slice(0,3)
      ]
    };
  }

  function generate(seed,input={},source=null){
    const result=base.generate(seed,input,source);
    const doctrine=D.paths[result.identity.familyKey];
    if(!doctrine)return result;
    result.version=4;
    result.mechanism=buildMechanism(result,doctrine,`${seed}:mechanism:v1`);
    result.summary+=` Mechanically, ${result.mechanism.functionalStatement} The current ${result.mechanism.refinement.label.toLowerCase()} implementation refines control, coverage, containment, energy use, and reliability without changing that base operating method.`;
    result.sourceImpact.push(`${doctrine.label} defines the physical device, ship-coverage method, initiation conditions, and environmental effects for this drive family.`);
    return result;
  }

  globalThis.BlacklightExoFTL=Object.freeze({...base,version:4,mechanismDepthVersion:1,mechanismDefinitions:D.paths,generate});
})();
