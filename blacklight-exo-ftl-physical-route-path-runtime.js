(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-physical-route-path-registry.json';
  const AU_M=149597870700;
  const SOLAR_MASS_KG=1.98847e30;
  const STATUS=Object.freeze({RESOLVED:'RESOLVED',PARTIAL:'PARTIAL',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY'});
  let registryPromise=null;

  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const vector=value=>value&&['x','y','z'].every(axis=>finite(value[axis]))?{x:Number(value.x),y:Number(value.y),z:Number(value.z)}:null;
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const scale=(v,k)=>({x:v.x*k,y:v.y*k,z:v.z*k});
  const magnitude=v=>Math.hypot(v.x,v.y,v.z);
  const interpolate=(a,b,t)=>add(a,scale(subtract(b,a),t));
  const unique=values=>[...new Set((values||[]).filter(Boolean))];

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key=>deepFreeze(value[key]));
    return value;
  }

  async function loadRegistry(){
    if(!registryPromise){
      registryPromise=fetch(REGISTRY_URL,{cache:'no-store'}).then(response=>{
        if(!response.ok)throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${response.status}`);
        return response.json();
      }).then(registry=>{
        if(registry?.registryKey!=='blacklight.ftl.physical-route-path')throw new Error('Invalid physical route path registry identity.');
        return deepFreeze(registry);
      }).catch(error=>{registryPromise=null;throw error;});
    }
    return registryPromise;
  }

  function unresolved(reason,registry,context={}){
    return deepFreeze({
      schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,
      route:{from:context.from||null,to:context.to||null,referenceFrame:context.referenceFrame||'UNRESOLVED',lengthM:null,epoch:context.epoch||null},
      sampling:{strategy:context.strategy||registry?.samplingPolicy?.defaultStrategy||'ENDPOINT_CLUSTERED_COSINE',sampleCount:0,endpointGuardM:finite(context.endpointGuardM)?Number(context.endpointGuardM):0,fractions:[]},
      samples:[],extrema:{maxDimensionlessPotentialDepth:null,maxAccelerationMPerS2:null,maxTidalFrobeniusPerS2:null,maxSingleSourceCurvatureScalePerM2:null,minimumSchwarzschildRadiusRatio:null,worstSampleByMetric:{}},
      uncertainty:context.uncertainty||null,warnings:[reason],
      provenance:[REGISTRY_URL],canonSafeguards:registry?.canonSafeguards||[]
    });
  }

  function systemRecord(authority,identifier){
    if(!authority)return null;
    const exact=authority.getSystem?.(identifier);
    if(exact)return exact;
    const key=String(identifier||'').trim().toUpperCase();
    return authority.getExampleSystems?.().find(item=>String(item.seed||'').toUpperCase()===key||String(item.name||'').toUpperCase()===key)||null;
  }

  function systemPositionM(authority,record){
    const au=authority?.equatorialPosition?.(record?.astrometry);
    if(!au)return null;
    return scale(au,AU_M);
  }

  function buildAuthoritySources(authority,context={}){
    const supplements=context.sourceStateById||{};
    const entries=authority?.getExampleClusterEntries?.()||[];
    return entries.map(entry=>{
      const record=systemRecord(authority,entry.seed)||{};
      const positionM=systemPositionM(authority,record);
      const supplement=supplements[entry.seed]||supplements[entry.name]||{};
      return {
        sourceId:entry.seed,
        massKg:Number(entry.totalMassSolar)*SOLAR_MASS_KG,
        positionM,
        velocityMPerS:vector(supplement.velocityMPerS),
        physicalRadiusM:finite(supplement.physicalRadiusM)?Number(supplement.physicalRadiusM):null,
        angularMomentumKgM2PerS:vector(supplement.angularMomentumKgM2PerS),
        provenanceStatus:'PUBLISHED_FIRST',
        sourceIds:entry.sourceIds||[],
        authorityVersion:authority.version
      };
    }).filter(source=>finite(source.massKg)&&source.massKg>0&&source.positionM);
  }

  function cosineFractions(sampleCount,guardFraction){
    const fractions=[];
    const start=clamp(guardFraction,0,0.49);
    const span=1-2*start;
    for(let index=0;index<sampleCount;index+=1){
      const theta=Math.PI*(index+1)/(sampleCount+1);
      const u=(1-Math.cos(theta))/2;
      fractions.push(start+span*u);
    }
    return fractions;
  }

  function metricValue(sample,key){
    const metrics=sample?.environment?.metrics||{};
    const value=metrics[key];
    return finite(value)?Number(value):null;
  }

  function buildExtrema(samples){
    const specifications=[
      ['maxDimensionlessPotentialDepth','dimensionlessPotentialDepth','max'],
      ['maxAccelerationMPerS2','accelerationMagnitudeMPerS2','max'],
      ['maxTidalFrobeniusPerS2','tidalFrobeniusPerS2','max'],
      ['maxSingleSourceCurvatureScalePerM2','maxSingleSourceCurvatureScalePerM2','max'],
      ['minimumSchwarzschildRadiusRatio','minimumSchwarzschildRadiusRatio','min']
    ];
    const extrema={worstSampleByMetric:{}};
    for(const [output,key,mode] of specifications){
      let selected=null;
      for(const sample of samples){
        const value=metricValue(sample,key);
        if(value===null)continue;
        if(!selected||(mode==='max'?value>selected.value:value<selected.value))selected={value,sample};
      }
      extrema[output]=selected?.value??null;
      extrema.worstSampleByMetric[output]=selected?{sampleIndex:selected.sample.index,fraction:selected.sample.fraction,distanceFromStartM:selected.sample.distanceFromStartM,value:selected.value}:null;
    }
    return extrema;
  }

  function relativeChange(a,b){
    if(!finite(a)||!finite(b))return 0;
    const left=Math.abs(Number(a)),right=Math.abs(Number(b));
    return Math.abs(right-left)/Math.max(left,right,1e-30);
  }

  function accelerationDirectionChange(left,right){
    const a=vector(left?.environment?.metrics?.accelerationMPerS2);
    const b=vector(right?.environment?.metrics?.accelerationMPerS2);
    if(!a||!b)return 0;
    const ma=magnitude(a),mb=magnitude(b);
    if(!(ma>0&&mb>0))return 0;
    const cosine=clamp((a.x*b.x+a.y*b.y+a.z*b.z)/(ma*mb),-1,1);
    return Math.acos(cosine);
  }

  function intervalNeedsRefinement(left,right,tolerance,directionTolerance){
    const keys=['dimensionlessPotentialDepth','accelerationMagnitudeMPerS2','tidalFrobeniusPerS2','maxSingleSourceCurvatureScalePerM2'];
    if(keys.some(key=>relativeChange(metricValue(left,key),metricValue(right,key))>tolerance))return true;
    return accelerationDirectionChange(left,right)>directionTolerance;
  }

  async function evaluateFraction(fraction,index,start,end,lengthM,sources,context,Curvature){
    const fieldPoint=interpolate(start,end,fraction);
    const environment=await Curvature.resolveFTLCurvatureEnvironment({
      fieldPoint,
      sources,
      referenceFrame:context.referenceFrame,
      potentialReferenceM2PerS2:finite(context.potentialReferenceM2PerS2)?Number(context.potentialReferenceM2PerS2):0,
      uncertainty:context.uncertainty||null,
      validityThresholds:context.validityThresholds||undefined,
      epoch:context.epoch||null
    });
    return {index,fraction,distanceFromStartM:fraction*lengthM,fieldPointM:fieldPoint,environment};
  }

  function aggregateStatus(samples){
    const states=samples.map(sample=>sample.environment?.status||STATUS.UNRESOLVED);
    if(states.includes(STATUS.OUTSIDE_MODEL_VALIDITY))return STATUS.OUTSIDE_MODEL_VALIDITY;
    if(states.includes(STATUS.UNRESOLVED))return STATUS.UNRESOLVED;
    if(states.includes(STATUS.PARTIAL))return STATUS.PARTIAL;
    return STATUS.RESOLVED;
  }

  async function resolveFTLPhysicalRoutePath(context={}){
    const registry=context.registry||await loadRegistry();
    const authority=context.authority||globalThis.BlacklightExoAuthority;
    const Curvature=context.curvatureRuntime||globalThis.BlacklightExoFTLCurvatureEnvironmentRuntime;
    if(!authority?.getExampleClusterEntries||!authority?.equatorialPosition)return unresolved('Blacklight EXAMPLE source authority is not loaded.',registry,context);
    if(!Curvature?.resolveFTLCurvatureEnvironment)return unresolved('FTL curvature environment runtime is not loaded.',registry,context);

    const fromRecord=systemRecord(authority,context.from);
    const toRecord=systemRecord(authority,context.to);
    if(!fromRecord||!toRecord)return unresolved('Route endpoints must resolve to published-first EXAMPLE system records.',registry,context);
    const start=systemPositionM(authority,fromRecord),end=systemPositionM(authority,toRecord);
    if(!start||!end)return unresolved('Route endpoint astrometry could not be converted to SI Cartesian coordinates.',registry,context);
    const lengthM=magnitude(subtract(end,start));
    if(!(lengthM>0))return unresolved('Route endpoints collapse to the same physical position.',registry,context);

    const minimumSamples=Number(registry.samplingPolicy?.minimumSampleCount)||9;
    const maximumSamples=Number(registry.samplingPolicy?.maximumSampleCount)||1024;
    const sampleCount=clamp(Math.trunc(Number(context.sampleCount)||Number(registry.samplingPolicy?.defaultSampleCount)||65),minimumSamples,maximumSamples);
    const endpointGuardM=finite(context.endpointGuardM)?Math.max(0,Number(context.endpointGuardM)):0;
    const guardFraction=endpointGuardM/lengthM;
    if(guardFraction>=0.5)return unresolved('Endpoint guard consumes the entire route; no interior physical path remains.',registry,{...context,referenceFrame:'approximate heliocentric J2000 equatorial Cartesian'});
    const strategy=context.strategy||registry.samplingPolicy?.defaultStrategy||'ENDPOINT_CLUSTERED_COSINE';
    const callerFractions=Array.isArray(context.fractions)&&context.fractions.length>0;
    const fractions=callerFractions
      ?unique(context.fractions.map(Number).filter(value=>value>guardFraction&&value<1-guardFraction)).sort((a,b)=>a-b)
      :cosineFractions(sampleCount,guardFraction);
    if(fractions.length<3)return unresolved('At least three interior path fractions are required.',registry,context);

    const sources=Array.isArray(context.sources)&&context.sources.length?context.sources:buildAuthoritySources(authority,context);
    if(!sources.length)return unresolved('No authoritative gravitational sources could be assembled.',registry,context);
    const referenceFrame=context.referenceFrame||'approximate heliocentric J2000 equatorial Cartesian';
    const evaluationContext={...context,referenceFrame};
    let samples=[];
    for(let index=0;index<fractions.length;index+=1){
      samples.push(await evaluateFraction(fractions[index],index,start,end,lengthM,sources,evaluationContext,Curvature));
    }

    const refinement=registry.samplingPolicy?.adaptiveRefinement||{};
    const refinementEnabled=context.adaptiveRefinement!==false&&refinement.status==='PROPOSED';
    const tolerance=finite(context.relativeMetricTolerance)?Number(context.relativeMetricTolerance):Number(refinement.defaultRelativeMetricTolerance)||0.20;
    const directionTolerance=finite(context.directionChangeRad)?Number(context.directionChangeRad):Number(refinement.defaultDirectionChangeRad)||0.08726646259971647;
    const maxDepth=clamp(Math.trunc(Number(context.maximumRefinementDepth)||Number(refinement.maximumRefinementDepth)||5),0,8);
    if(refinementEnabled&&maxDepth>0){
      for(let depth=0;depth<maxDepth;depth+=1){
        const remaining=maximumSamples-samples.length;
        if(remaining<=0)break;
        const additions=[];
        for(let index=0;index<samples.length-1&&additions.length<remaining;index+=1){
          const left=samples[index],right=samples[index+1];
          if(intervalNeedsRefinement(left,right,tolerance,directionTolerance)){
            const mid=(left.fraction+right.fraction)/2;
            additions.push(await evaluateFraction(mid,-1,start,end,lengthM,sources,evaluationContext,Curvature));
          }
        }
        if(!additions.length)break;
        samples=[...samples,...additions].sort((a,b)=>a.fraction-b.fraction);
      }
    }
    samples.forEach((sample,index)=>{sample.index=index;});

    const status=aggregateStatus(samples);
    const warnings=[];
    if(status===STATUS.PARTIAL)warnings.push('At least one route sample is physically calculable but lacks complete source-radius, source-motion, epoch, or uncertainty evidence required for a fully resolved model.');
    if(status===STATUS.UNRESOLVED)warnings.push('At least one route sample is unresolved; route-wide physical certification must not replace that sample with a procedural default.');
    if(status===STATUS.OUTSIDE_MODEL_VALIDITY)warnings.push('At least one sample is outside the weak-field/point-mass/slow-motion model domain; a higher-fidelity model is required before route certification.');
    if(!context.uncertainty)warnings.push('No route covariance/uncertainty packet was supplied; sampled field values may be useful engineering evidence but are not a complete certification packet.');
    if(!context.epoch)warnings.push('No route epoch was supplied; catalog positions are treated as the declared authority snapshot rather than a propagated ephemeris.');
    warnings.push('Route extrema are sampled extrema; adaptive convergence reduces but does not mathematically eliminate the possibility of a sharper unsampled extremum.');

    const sourceProvenance=unique(sources.flatMap(source=>source.sourceIds||[]));
    return deepFreeze({
      schemaVersion:'1.0.0',status,
      route:{
        from:{seed:fromRecord.seed,name:fromRecord.name},to:{seed:toRecord.seed,name:toRecord.name},
        referenceFrame,lengthM,epoch:context.epoch||null,authorityVersion:authority.version
      },
      sampling:{strategy:callerFractions?'CALLER_SUPPLIED':strategy,sampleCount:samples.length,requestedSampleCount:fractions.length,endpointGuardM,fractions:samples.map(sample=>sample.fraction),adaptiveRefinement:refinementEnabled,relativeMetricTolerance:tolerance,directionChangeRad:directionTolerance,maxRefinementDepth:maxDepth},
      samples,
      extrema:buildExtrema(samples),
      uncertainty:context.uncertainty||null,
      warnings,
      provenance:unique([REGISTRY_URL,'BLACKLIGHT_EXO_SOURCE_AUTHORITY.md','blacklight-exo-source-authority.js',`authority-version:${authority.version}`,...sourceProvenance]),
      canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLPhysicalRoutePathRuntime=deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLPhysicalRoutePath});
})();
