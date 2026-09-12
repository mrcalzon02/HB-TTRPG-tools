(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-adaptive-spatiotemporal-refinement-registry.json';
  const STATUS = Object.freeze({
    RESOLVED:'RESOLVED', PARTIAL:'PARTIAL', UNRESOLVED:'UNRESOLVED',
    OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY', CONFLICT:'CONFLICT'
  });
  let registryPromise = null;

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const vector = value => value && ['x','y','z'].every(axis => finite(value[axis])) ? {x:Number(value.x),y:Number(value.y),z:Number(value.z)} : null;
  const subtract = (a,b) => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const magnitude = v => Math.hypot(v.x,v.y,v.z);
  const intervalKey = (left,right) => `${Number(left).toPrecision(16)}:${Number(right).toPrecision(16)}`;

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
        if(registry?.registryKey !== 'blacklight.ftl.adaptive-spatiotemporal-refinement') throw new Error('Invalid adaptive spatiotemporal refinement registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise = null; throw error; });
    }
    return registryPromise;
  }

  function worstStatus(states){
    const order = [STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return (states || []).filter(Boolean).reduce((worst,current) => order.indexOf(current) > order.indexOf(worst) ? current : worst,STATUS.RESOLVED);
  }

  function relativeChange(a,b){
    if(!finite(a) || !finite(b)) return null;
    const left = Math.abs(Number(a));
    const right = Math.abs(Number(b));
    return Math.abs(right-left)/Math.max(left,right,1e-30);
  }

  function angleBetween(a,b){
    const left = vector(a), right = vector(b);
    if(!left || !right) return null;
    const ml = magnitude(left), mr = magnitude(right);
    if(!(ml > 0 && mr > 0)) return null;
    const cosine = clamp((left.x*right.x+left.y*right.y+left.z*right.z)/(ml*mr),-1,1);
    return Math.acos(cosine);
  }

  function covariancePositionTrace(source){
    const covariance = source?.covariance6x6;
    if(!Array.isArray(covariance) || covariance.length !== 6) return null;
    const diagonal = [0,1,2].map(i => Array.isArray(covariance[i]) && finite(covariance[i][i]) ? Number(covariance[i][i]) : null);
    return diagonal.every(value => value !== null) ? diagonal.reduce((sum,value) => sum+value,0) : null;
  }

  function maximumCovarianceChange(left,right){
    const leftSources = new Map((left?.sourceStatePacket?.sources || []).map(source => [String(source.sourceId),source]));
    let maximum = null;
    for(const source of right?.sourceStatePacket?.sources || []){
      const prior = leftSources.get(String(source.sourceId));
      if(!prior) continue;
      const change = relativeChange(covariancePositionTrace(prior),covariancePositionTrace(source));
      if(change !== null) maximum = maximum === null ? change : Math.max(maximum,change);
    }
    return maximum;
  }

  function maximumSourceMotionRatio(left,right){
    const leftSources = new Map((left?.sourceStatePacket?.sources || []).map(source => [String(source.sourceId),source]));
    const leftField = vector(left?.fieldPointM), rightField = vector(right?.fieldPointM);
    if(!leftField || !rightField) return null;
    let maximum = null;
    for(const source of right?.sourceStatePacket?.sources || []){
      const prior = leftSources.get(String(source.sourceId));
      const p1 = vector(prior?.positionM), p2 = vector(source?.positionM);
      if(!p1 || !p2) continue;
      const motion = magnitude(subtract(p2,p1));
      const r1 = magnitude(subtract(leftField,p1));
      const r2 = magnitude(subtract(rightField,p2));
      const ratio = motion/Math.max(Math.min(r1,r2),1e-30);
      maximum = maximum === null ? ratio : Math.max(maximum,ratio);
    }
    return maximum;
  }

  function physicalMetricReasons(left,right,tolerances){
    const reasons = [];
    const lm = left?.environmentPacket?.metrics || {};
    const rm = right?.environmentPacket?.metrics || {};
    const metricKeys = [
      ['dimensionlessPotentialDepth','potential-depth'],
      ['accelerationMagnitudeMPerS2','acceleration-magnitude'],
      ['tidalFrobeniusPerS2','tidal-frobenius'],
      ['maxSingleSourceCurvatureScalePerM2','curvature-scale']
    ];
    for(const [key,label] of metricKeys){
      const change = relativeChange(lm[key],rm[key]);
      if(change !== null && change > tolerances.relativePhysicalMetricChange) reasons.push(`${label}:${change}`);
    }

    const leftEigen = Array.isArray(lm.principalTidalEigenvaluesPerS2) ? lm.principalTidalEigenvaluesPerS2 : [];
    const rightEigen = Array.isArray(rm.principalTidalEigenvaluesPerS2) ? rm.principalTidalEigenvaluesPerS2 : [];
    for(let index=0;index<Math.min(leftEigen.length,rightEigen.length);index+=1){
      const change = relativeChange(leftEigen[index],rightEigen[index]);
      if(change !== null && change > tolerances.relativePrincipalTidalEigenvalueChange) reasons.push(`tidal-eigenvalue-${index}:${change}`);
    }

    const direction = angleBetween(lm.accelerationMPerS2,rm.accelerationMPerS2);
    if(direction !== null && direction > tolerances.accelerationDirectionChangeRad) reasons.push(`acceleration-direction:${direction}`);

    const covariance = maximumCovarianceChange(left,right);
    if(covariance !== null && covariance > tolerances.relativeCovarianceTraceChange) reasons.push(`covariance-trace:${covariance}`);

    const sourceMotion = maximumSourceMotionRatio(left,right);
    if(sourceMotion !== null && sourceMotion > tolerances.sourceMotionToRangeRatio) reasons.push(`source-motion-range:${sourceMotion}`);

    const encounterSpan = Math.max(0,Number(right.fraction)-Number(left.fraction));
    if(encounterSpan > tolerances.maximumEncounterSpanFraction) reasons.push(`encounter-span-fraction:${encounterSpan}`);
    return reasons;
  }

  async function resolveEigenbranchPacket(Eigen,samples,context,tolerances,provenance=[]){
    return Eigen.resolveFTLTidalEigenbranchTracking({
      familyId:context.familyId,
      encounterModel:'CONTINUOUS_PROJECTED_PROGRESS',
      samples,
      degeneracyRelativeGap:tolerances.tidalEigenvalueDegeneracyRelativeGap,
      maximumBranchRotationRad:tolerances.tidalEigenbranchRotationRad,
      provenance
    });
  }

  function topologyReasonMap(packet,tolerances){
    const map = new Map();
    if(!packet?.transitions?.length) return map;
    for(const transition of packet.transitions){
      const leftSample = packet.samples?.[transition.leftSampleIndex];
      const rightSample = packet.samples?.[transition.rightSampleIndex];
      if(!leftSample || !rightSample) continue;
      const reasons = [];
      if(transition.status === 'UNRESOLVED') reasons.push('tidal-eigensystem-unresolved');
      if(transition.degeneracyBoundary) reasons.push('tidal-degeneracy-boundary');
      if(finite(transition.maximumResolvedBranchRotationRad) && Number(transition.maximumResolvedBranchRotationRad) > tolerances.tidalEigenbranchRotationRad){
        reasons.push(`tidal-eigenbranch-rotation:${Number(transition.maximumResolvedBranchRotationRad)}`);
      }
      if(finite(transition.degenerateSubspaceRotationRad) && Number(transition.degenerateSubspaceRotationRad) > tolerances.tidalEigenbranchRotationRad){
        reasons.push(`tidal-degenerate-subspace-rotation:${Number(transition.degenerateSubspaceRotationRad)}`);
      }
      if(transition.refinementRequested && !reasons.length) reasons.push('tidal-topology-refinement-request');
      if(reasons.length) map.set(intervalKey(leftSample.fraction,rightSample.fraction),reasons);
    }
    return map;
  }

  function intervalReasons(left,right,tolerances,topologyMap){
    return unique([
      ...physicalMetricReasons(left,right,tolerances),
      ...(topologyMap.get(intervalKey(left.fraction,right.fraction)) || [])
    ]);
  }

  function unresolved(reason,registry,context={}){
    return deepFreeze({
      schemaVersion:'1.1.0',status:STATUS.UNRESOLVED,familyId:context.familyId || null,encounterModel:'UNRESOLVED',
      sampling:{adaptive:false,convergenceEstablished:false,unresolvedIntervalCount:0,initialSampleCount:0,finalSampleCount:0,maximumSampleCount:Number(registry?.defaultTolerances?.maximumSampleCount)||1024,maximumDepth:Number(registry?.defaultTolerances?.maximumDepth)||6,tolerances:registry?.defaultTolerances || {}},
      samples:[],refinementEvents:[],eigenbranchTracking:null,warnings:[reason],provenance:[REGISTRY_URL],canonSafeguards:registry?.canonSafeguards || []
    });
  }

  async function resolveFTLAdaptiveSpatiotemporalRefinement(context={}){
    const registry = context.registry || await loadRegistry();
    const Encounter = context.encounterRuntime || globalThis.BlacklightExoFTLFamilyEncounterTimeRuntime;
    if(!Encounter?.resolveFTLFamilyEncounterTime) return unresolved('Family encounter-time runtime is not loaded.',registry,context);

    const base = await Encounter.resolveFTLFamilyEncounterTime(context);
    const defaults = registry.defaultTolerances || {};
    const requested = context.tolerances || {};
    const tolerances = {
      relativePhysicalMetricChange: finite(requested.relativePhysicalMetricChange) ? Number(requested.relativePhysicalMetricChange) : Number(defaults.relativePhysicalMetricChange)||0.20,
      relativePrincipalTidalEigenvalueChange: finite(requested.relativePrincipalTidalEigenvalueChange) ? Number(requested.relativePrincipalTidalEigenvalueChange) : Number(defaults.relativePrincipalTidalEigenvalueChange)||0.20,
      accelerationDirectionChangeRad: finite(requested.accelerationDirectionChangeRad) ? Number(requested.accelerationDirectionChangeRad) : Number(defaults.accelerationDirectionChangeRad)||0.08726646259971647,
      tidalEigenbranchRotationRad: finite(requested.tidalEigenbranchRotationRad) ? Number(requested.tidalEigenbranchRotationRad) : Number(defaults.tidalEigenbranchRotationRad)||0.08726646259971647,
      tidalEigenvalueDegeneracyRelativeGap: finite(requested.tidalEigenvalueDegeneracyRelativeGap) ? Number(requested.tidalEigenvalueDegeneracyRelativeGap) : Number(defaults.tidalEigenvalueDegeneracyRelativeGap)||0.02,
      relativeCovarianceTraceChange: finite(requested.relativeCovarianceTraceChange) ? Number(requested.relativeCovarianceTraceChange) : Number(defaults.relativeCovarianceTraceChange)||0.20,
      sourceMotionToRangeRatio: finite(requested.sourceMotionToRangeRatio) ? Number(requested.sourceMotionToRangeRatio) : Number(defaults.sourceMotionToRangeRatio)||0.02,
      maximumEncounterSpanFraction: finite(requested.maximumEncounterSpanFraction) ? Number(requested.maximumEncounterSpanFraction) : Number(defaults.maximumEncounterSpanFraction)||0.05
    };
    const maximumDepth = clamp(Math.trunc(Number(context.maximumDepth ?? defaults.maximumDepth ?? 6)),0,12);
    const maximumSampleCount = clamp(Math.trunc(Number(context.maximumSampleCount ?? defaults.maximumSampleCount ?? 1024)),2,4096);
    let samples = [...(base.samples || [])].sort((a,b) => Number(a.fraction)-Number(b.fraction));
    const initialSampleCount = samples.length;
    const refinementEvents = [];
    const warnings = [...(base.warnings || [])];

    if(base.encounterModel !== 'CONTINUOUS_PROJECTED_PROGRESS'){
      warnings.push('Adaptive corridor refinement was not applied because this family uses explicit endpoint/mouth encounter semantics rather than a continuously sampled ordinary-space corridor.');
      return deepFreeze({
        schemaVersion:'1.1.0',status:base.status,familyId:base.familyId,encounterModel:base.encounterModel,
        sampling:{adaptive:false,convergenceEstablished:true,unresolvedIntervalCount:0,initialSampleCount,finalSampleCount:samples.length,maximumSampleCount,maximumDepth,tolerances},
        samples,refinementEvents,eigenbranchTracking:null,warnings:unique(warnings),provenance:unique([REGISTRY_URL,...(base.provenance || [])]),canonSafeguards:registry.canonSafeguards || []
      });
    }

    const Eigen = context.eigenbranchRuntime || globalThis.BlacklightExoFTLTidalEigenbranchTrackingRuntime;
    if(!Eigen?.resolveFTLTidalEigenbranchTracking) return unresolved('Tidal eigenbranch tracking runtime is not loaded; topology-aware adaptive refinement cannot establish convergence.',registry,context);

    let ceilingReached = false;
    let lastEigenPacket = null;
    for(let depth=0;depth<maximumDepth;depth+=1){
      lastEigenPacket = await resolveEigenbranchPacket(Eigen,samples,context,tolerances,[REGISTRY_URL,...(base.provenance || [])]);
      const topologyMap = topologyReasonMap(lastEigenPacket,tolerances);
      const additions = [];
      const knownFractions = new Set(samples.map(sample => Number(sample.fraction).toPrecision(16)));
      for(let index=0;index<samples.length-1;index+=1){
        const left = samples[index], right = samples[index+1];
        const reasons = intervalReasons(left,right,tolerances,topologyMap);
        if(!reasons.length) continue;
        if(samples.length + additions.length >= maximumSampleCount){ ceilingReached = true; break; }
        const midFraction = (Number(left.fraction)+Number(right.fraction))/2;
        const key = midFraction.toPrecision(16);
        if(knownFractions.has(key)) continue;
        const midpointPacket = await Encounter.resolveFTLFamilyEncounterTime({...context,fractions:[midFraction]});
        const midpoint = midpointPacket.samples?.[0] || null;
        if(!midpoint){
          warnings.push(`Refinement midpoint at fraction ${midFraction} could not be resolved by the encounter-time authority.`);
          continue;
        }
        additions.push(midpoint);
        knownFractions.add(key);
        refinementEvents.push({depth,leftFraction:Number(left.fraction),rightFraction:Number(right.fraction),midFraction,reasons});
      }
      if(!additions.length) break;
      samples = [...samples,...additions].sort((a,b) => Number(a.fraction)-Number(b.fraction));
      if(ceilingReached) break;
    }

    samples = samples.map((sample,index) => ({...sample,sampleIndex:index}));
    lastEigenPacket = await resolveEigenbranchPacket(Eigen,samples,context,tolerances,[REGISTRY_URL,...(base.provenance || [])]);
    const finalTopologyMap = topologyReasonMap(lastEigenPacket,tolerances);
    const pending = [];
    for(let index=0;index<samples.length-1;index+=1){
      const reasons = intervalReasons(samples[index],samples[index+1],tolerances,finalTopologyMap);
      if(reasons.length) pending.push({leftFraction:Number(samples[index].fraction),rightFraction:Number(samples[index+1].fraction),reasons});
    }
    const convergenceEstablished = pending.length === 0;
    if(ceilingReached) warnings.push('Adaptive refinement reached the declared maximum sample count before all requesting intervals were subdivided; numerical convergence is not established.');
    if(!convergenceEstablished && !ceilingReached) warnings.push('Adaptive refinement ended with one or more intervals still requesting subdivision; the depth/resource envelope did not establish numerical convergence.');
    if(refinementEvents.length && samples.length >= maximumSampleCount) warnings.push('Sample ceiling is an engineering resource bound, not evidence of route smoothness or safety.');
    warnings.push('Adaptive refinement improves numerical evidence density but does not prove that no sharper unsampled extremum exists.');
    warnings.push('Stable broad degeneracy is preserved as a physical subspace state; only degeneracy boundaries, unresolved eigensystems, or excessive resolved/subspace rotation force additional subdivision.');

    const status = worstStatus([
      base.status,
      lastEigenPacket?.status,
      ...samples.flatMap(sample => [sample.sourceStateStatus,sample.environmentStatus]),
      convergenceEstablished ? STATUS.RESOLVED : STATUS.PARTIAL
    ]);

    return deepFreeze({
      schemaVersion:'1.1.0',status,familyId:base.familyId,encounterModel:base.encounterModel,
      sampling:{adaptive:true,convergenceEstablished,unresolvedIntervalCount:pending.length,initialSampleCount,finalSampleCount:samples.length,maximumSampleCount,maximumDepth,tolerances},
      samples,refinementEvents,eigenbranchTracking:lastEigenPacket,warnings:unique(warnings),
      provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-family-encounter-time-runtime.js','blacklight-exo-ftl-tidal-eigenbranch-tracking-runtime.js',...(base.provenance || [])]),
      canonSafeguards:registry.canonSafeguards || []
    });
  }

  globalThis.BlacklightExoFTLAdaptiveSpatiotemporalRefinementRuntime = deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLAdaptiveSpatiotemporalRefinement});
})();
