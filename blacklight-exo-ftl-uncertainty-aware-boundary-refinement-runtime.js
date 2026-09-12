(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-uncertainty-aware-boundary-refinement-registry.json';
  const STATUS = Object.freeze({RESOLVED:'RESOLVED',PARTIAL:'PARTIAL',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',CONFLICT:'CONFLICT'});
  let registryPromise = null;

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const clamp = (value,lo,hi) => Math.max(lo,Math.min(hi,value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const intervalKey = (a,b) => `${Number(a).toPrecision(16)}:${Number(b).toPrecision(16)}`;

  function deepFreeze(value){
    if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key => deepFreeze(value[key]));
    return value;
  }

  async function loadRegistry(){
    if(!registryPromise){
      registryPromise = fetch(REGISTRY_URL,{cache:'no-store'}).then(response => {
        if(!response.ok) throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${response.status}`);
        return response.json();
      }).then(registry => {
        if(registry?.registryKey !== 'blacklight.ftl.uncertainty-aware-boundary-refinement') throw new Error('Invalid uncertainty-aware boundary refinement registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise=null; throw error; });
    }
    return registryPromise;
  }

  function worstStatus(states){
    const order=[STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return (states||[]).filter(Boolean).reduce((worst,current)=>order.indexOf(current)>order.indexOf(worst)?current:worst,STATUS.RESOLVED);
  }

  function unresolved(reason,registry,context={}){
    return deepFreeze({
      schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,familyId:context.familyId||null,encounterModel:'UNRESOLVED',
      controls:registry?.defaultControls||{},sampling:{adaptive:false,convergenceEstablished:false,initialSampleCount:0,finalSampleCount:0,maximumDepth:0,maximumSampleCount:0},
      samples:[],refinementEvents:[],normalizedDegeneracyUncertainty:null,operationalBoundaries:[],earliestPlausibleBoundary:null,intervention:null,
      warnings:[reason],provenance:[REGISTRY_URL],canonSafeguards:registry?.canonSafeguards||[]
    });
  }

  function boundaryReasons(packet,controls){
    const map=new Map();
    for(const item of packet?.boundaryIntervals||[]){
      const left=packet.samples?.[item.leftSampleIndex];
      const right=packet.samples?.[item.rightSampleIndex];
      if(!left || !right) continue;
      const reasons=[];
      const span=Math.max(0,Number(right.fraction)-Number(left.fraction));
      if(item.status==='BOUNDARY_UNCERTAIN') reasons.push('normalized-boundary-uncertain');
      if(item.status==='NONSMOOTH_ENDPOINT') reasons.push('normalized-boundary-nonsmooth-endpoint');
      if(item.status==='BOUNDARY_ESTIMATED' && finite(item.boundaryFractionSigmaUpperBound)){
        const sigma=Number(item.boundaryFractionSigmaUpperBound);
        if(sigma>controls.maximumBoundarySigmaFraction) reasons.push(`normalized-boundary-sigma:${sigma}`);
        if(span>0 && sigma/span>controls.maximumBoundarySigmaToIntervalRatio) reasons.push(`normalized-boundary-sigma-span-ratio:${sigma/span}`);
      }
      if(reasons.length){
        const key=intervalKey(left.fraction,right.fraction);
        map.set(key,unique([...(map.get(key)||[]),...reasons]));
      }
    }
    return map;
  }

  function operationalBoundaryRecords(packet,controls){
    const records=[];
    for(const item of packet?.boundaryIntervals||[]){
      if(item.status!=='BOUNDARY_ESTIMATED' || !finite(item.boundaryFraction)) continue;
      const nominal=clamp(Number(item.boundaryFraction),0,1);
      const sigma=finite(item.boundaryFractionSigmaUpperBound)?Math.max(0,Number(item.boundaryFractionSigmaUpperBound)):null;
      const earliest=sigma===null?null:clamp(nominal-controls.sigmaMultiplier*sigma,0,1);
      const latest=sigma===null?null:clamp(nominal+controls.sigmaMultiplier*sigma,0,1);
      records.push({
        pair:item.pair,leftSampleIndex:item.leftSampleIndex,rightSampleIndex:item.rightSampleIndex,status:item.status,
        nominalBoundaryFraction:nominal,boundaryFractionSigmaUpperBound:sigma,earliestPlausibleFraction:earliest,latestPlausibleFraction:latest,
        uncertaintyConstruction:'CONSERVATIVE_LINEAR_UPPER_BOUND'
      });
    }
    return records.sort((a,b)=>(a.earliestPlausibleFraction??a.nominalBoundaryFraction)-(b.earliestPlausibleFraction??b.nominalBoundaryFraction));
  }

  function interventionModel(context,base,boundary,controls){
    if(!boundary) return null;
    if(base.encounterModel!=='CONTINUOUS_PROJECTED_PROGRESS'){
      return {
        mode:'PRECOMMIT_OR_ENDPOINT',status:'NOT_APPLICABLE_TO_CONTINUOUS_DISTANCE',currentFraction:finite(context.currentFraction)?Number(context.currentFraction):0,
        earliestPlausibleBoundaryFraction:boundary.earliestPlausibleFraction,distanceToEarliestPlausibleBoundaryM:null,interventionDistanceM:null,distanceMarginM:null,
        interventionTimeS:null,timeMarginS:null,reachable:null,
        notes:['Endpoint/precommit families require their family timing-margin authority; no local FTL corridor velocity is fabricated here.']
      };
    }
    const currentFraction=clamp(finite(context.currentFraction)?Number(context.currentFraction):0,0,1);
    const routeLength=finite(context.routeLengthM)?Math.max(0,Number(context.routeLengthM)):null;
    const progress=finite(context.projectedProgressMPerS)?Math.max(0,Number(context.projectedProgressMPerS)):null;
    const components=context.interventionComponentsS||{};
    const componentKeys=['sensor','solver','decision','command','actuate','exit','clear','margin'];
    const componentValues=componentKeys.map(key=>finite(components[key])?Math.max(0,Number(components[key])):null);
    const interventionTime=finite(context.interventionTimeS)?Math.max(0,Number(context.interventionTimeS)):(componentValues.every(v=>v!==null)?componentValues.reduce((a,b)=>a+b,0):null);
    const earliest=boundary.earliestPlausibleFraction;
    const distance=routeLength!==null && earliest!==null?Math.max(0,(earliest-currentFraction)*routeLength):null;
    const interventionDistance=progress!==null && interventionTime!==null?progress*interventionTime:null;
    const distanceMargin=distance!==null && interventionDistance!==null?distance-interventionDistance:null;
    const timeToBoundary=distance!==null && progress>0?distance/progress:null;
    const timeMargin=timeToBoundary!==null && interventionTime!==null?timeToBoundary-interventionTime:null;
    const reachable=distanceMargin===null?null:distanceMargin>0;
    return {
      mode:'CONTINUOUS_PROJECTED_PROGRESS',status:reachable===null?'UNRESOLVED':(reachable?'REACHABLE':'UNREACHABLE'),currentFraction,
      earliestPlausibleBoundaryFraction:earliest,distanceToEarliestPlausibleBoundaryM:distance,interventionDistanceM:interventionDistance,distanceMarginM:distanceMargin,
      interventionTimeS:interventionTime,timeMarginS:timeMargin,reachable,
      notes:[
        `Earliest plausible boundary uses nominal minus ${controls.sigmaMultiplier} times the conservative boundary-fraction uncertainty upper bound.`,
        'Projected progress is a family/controller route-progress representation and is not automatically local hull velocity.'
      ]
    };
  }

  async function resolveFTLUncertaintyAwareBoundaryRefinement(context={}){
    const registry=context.registry||await loadRegistry();
    const defaults=registry.defaultControls||{};
    const controls={
      maximumBoundarySigmaFraction:finite(context.maximumBoundarySigmaFraction)?Math.max(0,Number(context.maximumBoundarySigmaFraction)):Number(defaults.maximumBoundarySigmaFraction)||0.0025,
      maximumBoundarySigmaToIntervalRatio:finite(context.maximumBoundarySigmaToIntervalRatio)?Math.max(0,Number(context.maximumBoundarySigmaToIntervalRatio)):Number(defaults.maximumBoundarySigmaToIntervalRatio)||0.25,
      sigmaMultiplier:finite(context.sigmaMultiplier)?Math.max(0,Number(context.sigmaMultiplier)):Number(defaults.sigmaMultiplier)||2
    };
    const maximumDepth=clamp(Math.trunc(Number(context.maximumBoundaryRefinementDepth??defaults.maximumBoundaryRefinementDepth??4)),0,10);
    const maximumSampleCount=clamp(Math.trunc(Number(context.maximumSampleCount??defaults.maximumSampleCount??1536)),2,4096);
    const Adaptive=context.adaptiveRuntime||globalThis.BlacklightExoFTLAdaptiveSpatiotemporalRefinementRuntime;
    const Encounter=context.encounterRuntime||globalThis.BlacklightExoFTLFamilyEncounterTimeRuntime;
    const Normalized=context.normalizedDegeneracyRuntime||globalThis.BlacklightExoFTLNormalizedDegeneracyUncertaintyRuntime;
    if(!Adaptive?.resolveFTLAdaptiveSpatiotemporalRefinement) return unresolved('Adaptive spatiotemporal refinement runtime is not loaded.',registry,context);
    if(!Normalized?.resolveFTLNormalizedDegeneracyUncertainty) return unresolved('Normalized degeneracy uncertainty runtime is not loaded.',registry,context);

    const base=await Adaptive.resolveFTLAdaptiveSpatiotemporalRefinement(context);
    let samples=[...(base.samples||[])].sort((a,b)=>Number(a.fraction)-Number(b.fraction));
    const initialSampleCount=samples.length;
    const warnings=[...(base.warnings||[])];
    const refinementEvents=[];

    if(base.encounterModel!=='CONTINUOUS_PROJECTED_PROGRESS'){
      const packet=await Normalized.resolveFTLNormalizedDegeneracyUncertainty({...context,samples,familyId:base.familyId,encounterModel:base.encounterModel});
      return deepFreeze({
        schemaVersion:'1.0.0',status:worstStatus([base.status,packet.status]),familyId:base.familyId,encounterModel:base.encounterModel,controls,
        sampling:{adaptive:false,convergenceEstablished:true,initialSampleCount,finalSampleCount:samples.length,maximumDepth,maximumSampleCount},samples,refinementEvents,
        normalizedDegeneracyUncertainty:packet,operationalBoundaries:operationalBoundaryRecords(packet,controls),earliestPlausibleBoundary:null,
        intervention:null,warnings:unique([...warnings,'Uncertainty-aware intermediate boundary refinement is not applied to PRECOMMIT_ENDPOINT or ANCHORED_PORTAL families.']),
        provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-adaptive-spatiotemporal-refinement-runtime.js','blacklight-exo-ftl-normalized-degeneracy-uncertainty-runtime.js',...(base.provenance||[])]),canonSafeguards:registry.canonSafeguards||[]
      });
    }
    if(!Encounter?.resolveFTLFamilyEncounterTime) return unresolved('Family encounter-time runtime is required to insert uncertainty-driven midpoint samples.',registry,context);

    let packet=null;
    let ceilingReached=false;
    for(let depth=0;depth<maximumDepth;depth+=1){
      samples=samples.map((sample,index)=>({...sample,sampleIndex:index}));
      packet=await Normalized.resolveFTLNormalizedDegeneracyUncertainty({...context,samples,familyId:base.familyId,encounterModel:base.encounterModel});
      const reasonMap=boundaryReasons(packet,controls);
      const additions=[];
      const known=new Set(samples.map(sample=>Number(sample.fraction).toPrecision(16)));
      for(let index=0;index<samples.length-1;index+=1){
        const left=samples[index],right=samples[index+1];
        const reasons=reasonMap.get(intervalKey(left.fraction,right.fraction))||[];
        if(!reasons.length) continue;
        if(samples.length+additions.length>=maximumSampleCount){ceilingReached=true;break;}
        const mid=(Number(left.fraction)+Number(right.fraction))/2;
        const key=mid.toPrecision(16);
        if(known.has(key)) continue;
        const midpointPacket=await Encounter.resolveFTLFamilyEncounterTime({...context,fractions:[mid]});
        const midpoint=midpointPacket.samples?.[0]||null;
        if(!midpoint){warnings.push(`Uncertainty-driven midpoint at fraction ${mid} could not be resolved.`);continue;}
        additions.push(midpoint);known.add(key);
        refinementEvents.push({depth,leftFraction:Number(left.fraction),rightFraction:Number(right.fraction),midFraction:mid,reasons});
      }
      if(!additions.length) break;
      samples=[...samples,...additions].sort((a,b)=>Number(a.fraction)-Number(b.fraction));
      if(ceilingReached) break;
    }

    samples=samples.map((sample,index)=>({...sample,sampleIndex:index}));
    packet=await Normalized.resolveFTLNormalizedDegeneracyUncertainty({...context,samples,familyId:base.familyId,encounterModel:base.encounterModel});
    const pending=boundaryReasons(packet,controls);
    const convergenceEstablished=pending.size===0;
    if(ceilingReached) warnings.push('Uncertainty-aware boundary refinement reached the sample ceiling before all localization requests were satisfied.');
    if(!convergenceEstablished) warnings.push('At least one operational degeneracy boundary remains too uncertain or non-smooth for the configured localization controls.');
    warnings.push('Boundary localization confidence is ordinary-physics/navigation evidence; it is not an FTL hazard probability.');

    const operationalBoundaries=operationalBoundaryRecords(packet,controls);
    const currentFraction=clamp(finite(context.currentFraction)?Number(context.currentFraction):0,0,1);
    const candidates=operationalBoundaries.filter(item=>item.earliestPlausibleFraction!==null && item.earliestPlausibleFraction>=currentFraction);
    const earliestPlausibleBoundary=candidates.length?candidates[0]:null;
    const intervention=interventionModel(context,base,earliestPlausibleBoundary,controls);
    const status=worstStatus([base.status,packet.status,convergenceEstablished?STATUS.RESOLVED:STATUS.PARTIAL,intervention?.status==='UNREACHABLE'?STATUS.PARTIAL:null]);

    return deepFreeze({
      schemaVersion:'1.0.0',status,familyId:base.familyId,encounterModel:base.encounterModel,controls,
      sampling:{adaptive:true,convergenceEstablished,initialSampleCount,finalSampleCount:samples.length,maximumDepth,maximumSampleCount},samples,refinementEvents,
      normalizedDegeneracyUncertainty:packet,operationalBoundaries,earliestPlausibleBoundary,intervention,warnings:unique(warnings),
      provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-adaptive-spatiotemporal-refinement-runtime.js','blacklight-exo-ftl-normalized-degeneracy-uncertainty-runtime.js','blacklight-exo-ftl-family-encounter-time-runtime.js',...(base.provenance||[])]),
      canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLUncertaintyAwareBoundaryRefinementRuntime=deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLUncertaintyAwareBoundaryRefinement});
})();