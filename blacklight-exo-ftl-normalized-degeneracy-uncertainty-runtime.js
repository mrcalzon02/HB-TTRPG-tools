(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-normalized-degeneracy-uncertainty-registry.json';
  const STATUS = Object.freeze({RESOLVED:'RESOLVED',PARTIAL:'PARTIAL',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',CONFLICT:'CONFLICT'});
  const PAIRS = Object.freeze([[0,1],[0,2],[1,2]]);
  let registryPromise = null;

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const clamp = (value,lo,hi) => Math.max(lo,Math.min(hi,value));
  const matVec = (a,v) => a.map(row => row.reduce((sum,x,i) => sum + Number(x)*Number(v[i]),0));
  const quad = (v,a) => {
    const av = matVec(a,v);
    return v.reduce((sum,x,i) => sum + Number(x)*Number(av[i]),0);
  };

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
        if(registry?.registryKey !== 'blacklight.ftl.normalized-degeneracy-uncertainty') throw new Error('Invalid normalized degeneracy uncertainty registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise=null; throw error; });
    }
    return registryPromise;
  }

  function validCov6(matrix){
    return Array.isArray(matrix) && matrix.length===6 && matrix.every(row => Array.isArray(row) && row.length===6 && row.every(finite));
  }

  function tensor6FromSample(sample){
    const tensor = sample?.environmentPacket?.metrics?.tidalTensorPerS2 || sample?.metrics?.tidalTensorPerS2 || sample?.tidalTensorPerS2 || null;
    if(!Array.isArray(tensor) || tensor.length!==3 || tensor.some(row => !Array.isArray(row) || row.length!==3 || row.some(v => !finite(v)))) return null;
    return [Number(tensor[0][0]),Number(tensor[1][1]),Number(tensor[2][2]),Number(tensor[0][1]),Number(tensor[0][2]),Number(tensor[1][2])];
  }

  function frobeniusFromTensor6(t){
    return Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]+2*(t[3]*t[3]+t[4]*t[4]+t[5]*t[5]));
  }

  function frobeniusSensitivity(t,norm,minimumScale){
    if(!(norm>minimumScale)) return [0,0,0,0,0,0];
    return [t[0]/norm,t[1]/norm,t[2]/norm,2*t[3]/norm,2*t[4]/norm,2*t[5]/norm];
  }

  function subtractVectors(a,b){ return a.map((value,index) => Number(value)-Number(b[index])); }
  function scaleVector(v,k){ return v.map(value => Number(value)*Number(k)); }
  function addVectors(a,b){ return a.map((value,index) => Number(value)+Number(b[index])); }

  function gapSigma(branchA,branchB,covariance){
    if(!validCov6(covariance) || !Array.isArray(branchA?.sensitivity) || !Array.isArray(branchB?.sensitivity)) return null;
    const gradient = subtractVectors(branchA.sensitivity,branchB.sensitivity);
    return Math.sqrt(Math.max(0,quad(gradient,covariance)));
  }

  function activeScale(branchA,branchB,tensor6,controls){
    const li = Number(branchA.eigenvaluePerS2);
    const lj = Number(branchB.eigenvaluePerS2);
    const norm = frobeniusFromTensor6(tensor6);
    const epsilon = controls.minimumScalePerS2;
    const candidates = [
      {id:'ABS_LAMBDA_I',value:Math.abs(li),gradient:scaleVector(branchA.sensitivity,Math.sign(li)||1)},
      {id:'ABS_LAMBDA_J',value:Math.abs(lj),gradient:scaleVector(branchB.sensitivity,Math.sign(lj)||1)},
      {id:'TIDAL_FROBENIUS',value:norm,gradient:frobeniusSensitivity(tensor6,norm,epsilon)},
      {id:'EPSILON_FLOOR',value:epsilon,gradient:[0,0,0,0,0,0]}
    ];
    const maximum = Math.max(...candidates.map(item => item.value));
    const tolerance = controls.activeScaleTieRelativeTolerance*Math.max(maximum,epsilon);
    const active = candidates.filter(item => Math.abs(item.value-maximum)<=tolerance);
    return {maximum,active};
  }

  function pairResult(branches,pair,tensor6,covariance,controls){
    const [i,j] = pair;
    const a = branches?.[i], b = branches?.[j];
    if(!a || !b || !finite(a.eigenvaluePerS2) || !finite(b.eigenvaluePerS2) || !Array.isArray(a.sensitivity) || !Array.isArray(b.sensitivity) || !tensor6 || !validCov6(covariance)){
      return {pair,status:'UNRESOLVED',gapPerS2:null,gapSigmaPerS2:null,normalizationScalePerS2:null,normalizationSource:null,gamma:null,gammaSigma:null,h:null,degenerateByThreshold:null,sensitivity:null};
    }

    const gap = Number(a.eigenvaluePerS2)-Number(b.eigenvaluePerS2);
    const sigmaGap = gapSigma(a,b,covariance);
    const scaleInfo = activeScale(a,b,tensor6,controls);
    const normalizationScale = scaleInfo.maximum;
    const gamma = Math.abs(gap)/normalizationScale;
    const h = gamma-controls.degeneracyRelativeGap;
    const base = {pair,gapPerS2:gap,gapSigmaPerS2:sigmaGap,normalizationScalePerS2:normalizationScale,normalizationSource:scaleInfo.active.length===1?scaleInfo.active[0].id:'AMBIGUOUS_MAX',gamma,gammaSigma:null,h,degenerateByThreshold:gamma<controls.degeneracyRelativeGap,sensitivity:null};

    if(scaleInfo.active.length!==1) return {...base,status:'NONSMOOTH_SCALE'};
    if(sigmaGap===null || gap===0 || Math.abs(gap)<=controls.gapCuspSigmaMultiplier*sigmaGap) return {...base,status:'NONSMOOTH_GAP'};

    const qGap = scaleVector(subtractVectors(a.sensitivity,b.sensitivity),Math.sign(gap));
    const qScale = scaleInfo.active[0].gradient;
    const qGamma = addVectors(scaleVector(qGap,1/normalizationScale),scaleVector(qScale,-Math.abs(gap)/(normalizationScale*normalizationScale)));
    const sigmaGamma = Math.sqrt(Math.max(0,quad(qGamma,covariance)));
    const status = sigmaGamma>controls.maximumLinearizedGammaSigma ? 'OUTSIDE_LINEAR_MODEL' : 'LINEARIZED';
    return {...base,status,gammaSigma:sigmaGamma,sensitivity:qGamma};
  }

  function pairKey(pair){ return `${pair[0]}-${pair[1]}`; }

  function boundaryEstimate(left,right,pair,threshold){
    const lp = left.pairMap.get(pairKey(pair));
    const rp = right.pairMap.get(pairKey(pair));
    const notes=[];
    if(!lp || !rp || !finite(lp.h) || !finite(rp.h)) return {leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,pair,status:'BOUNDARY_UNCERTAIN',leftH:lp?.h??null,rightH:rp?.h??null,boundaryFraction:null,boundaryFractionSigmaUpperBound:null,notes:['Normalized degeneracy evidence is missing at one or both interval endpoints.']};
    const crossing = lp.h===0 || rp.h===0 || lp.h*rp.h<0;
    if(!crossing) return {leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,pair,status:'NO_CROSSING',leftH:lp.h,rightH:rp.h,boundaryFraction:null,boundaryFractionSigmaUpperBound:null,notes};
    if(lp.status!=='LINEARIZED' || rp.status!=='LINEARIZED') return {leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,pair,status:'NONSMOOTH_ENDPOINT',leftH:lp.h,rightH:rp.h,boundaryFraction:null,boundaryFractionSigmaUpperBound:null,notes:['The operational gamma boundary is bracketed, but at least one endpoint lacks a valid local linearization.']};

    const df = right.fraction-left.fraction;
    const dh = rp.h-lp.h;
    if(!(Math.abs(df)>0) || !(Math.abs(dh)>0)) return {leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,pair,status:'BOUNDARY_UNCERTAIN',leftH:lp.h,rightH:rp.h,boundaryFraction:null,boundaryFractionSigmaUpperBound:null,notes:['The local normalized-gap slope is unresolved or zero.']};
    const fraction = left.fraction-df*lp.h/dh;
    const w = clamp((fraction-left.fraction)/df,0,1);
    const sigmaHUpper = (1-w)*lp.gammaSigma+w*rp.gammaSigma;
    const slope = Math.abs(dh/df);
    const sigmaFractionUpper = slope>0 ? sigmaHUpper/slope : null;
    notes.push(`Boundary is gamma=${threshold}; uncertainty uses a conservative linear endpoint bound because cross-sample covariance is not available.`);
    return {leftSampleIndex:left.sampleIndex,rightSampleIndex:right.sampleIndex,pair,status:sigmaFractionUpper===null?'BOUNDARY_UNCERTAIN':'BOUNDARY_ESTIMATED',leftH:lp.h,rightH:rp.h,boundaryFraction:fraction,boundaryFractionSigmaUpperBound:sigmaFractionUpper,notes};
  }

  function worstStatus(states){
    const order=[STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return (states||[]).reduce((worst,current) => order.indexOf(current)>order.indexOf(worst)?current:worst,STATUS.RESOLVED);
  }

  async function resolveFTLNormalizedDegeneracyUncertainty(context={}){
    const registry = context.registry || await loadRegistry();
    const defaults = registry.defaultControls || {};
    const controls = {
      degeneracyRelativeGap: finite(context.degeneracyRelativeGap)?Number(context.degeneracyRelativeGap):Number(defaults.degeneracyRelativeGap)||0.02,
      minimumScalePerS2: finite(context.minimumScalePerS2)?Number(context.minimumScalePerS2):Number(defaults.minimumScalePerS2)||1e-30,
      activeScaleTieRelativeTolerance: finite(context.activeScaleTieRelativeTolerance)?Number(context.activeScaleTieRelativeTolerance):Number(defaults.activeScaleTieRelativeTolerance)||0.001,
      gapCuspSigmaMultiplier: finite(context.gapCuspSigmaMultiplier)?Number(context.gapCuspSigmaMultiplier):Number(defaults.gapCuspSigmaMultiplier)||1,
      maximumLinearizedGammaSigma: finite(context.maximumLinearizedGammaSigma)?Number(context.maximumLinearizedGammaSigma):Number(defaults.maximumLinearizedGammaSigma)||0.25
    };
    const samples = Array.isArray(context.samples)?[...context.samples].sort((a,b)=>Number(a.fraction??a.sampleIndex??0)-Number(b.fraction??b.sampleIndex??0)):[];
    if(!samples.length) return deepFreeze({schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,familyId:context.familyId||null,encounterModel:context.encounterModel||null,controls,samples:[],boundaryIntervals:[],warnings:['No encounter samples were supplied.'],provenance:[REGISTRY_URL],canonSafeguards:registry.canonSafeguards||[]});

    let uncertainty = context.tidalUncertaintyPacket || null;
    if(!uncertainty){
      const runtime = context.tidalUncertaintyRuntime || globalThis.BlacklightExoFTLTidalUncertaintyPropagationRuntime;
      if(runtime?.resolveFTLTidalUncertaintyPropagation){
        uncertainty = await runtime.resolveFTLTidalUncertaintyPropagation({samples,familyId:context.familyId,encounterModel:context.encounterModel,degeneracyRelativeGap:controls.degeneracyRelativeGap});
      }
    }
    if(!uncertainty) return deepFreeze({schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,familyId:context.familyId||null,encounterModel:context.encounterModel||null,controls,samples:[],boundaryIntervals:[],warnings:['Tidal uncertainty packet/runtime is unavailable. Missing covariance is not treated as zero.'],provenance:[REGISTRY_URL],canonSafeguards:registry.canonSafeguards||[]});

    const uncertaintyByIndex = new Map((uncertainty.samples||[]).map(item => [Number(item.sampleIndex),item]));
    const out=[]; const warnings=[];
    for(let index=0;index<samples.length;index+=1){
      const source=samples[index];
      const u=uncertaintyByIndex.get(index);
      const tensor6=tensor6FromSample(source);
      const covariance=u?.tensorCovariance6x6 || null;
      const branches=u?.eigenbranches || [];
      const pairs=PAIRS.map(pair => pairResult(branches,pair,tensor6,covariance,controls));
      let status=STATUS.RESOLVED;
      if(!u || !tensor6 || !validCov6(covariance) || pairs.every(item=>item.status==='UNRESOLVED')) status=STATUS.UNRESOLVED;
      else if(pairs.some(item=>item.status!=='LINEARIZED')) status=STATUS.PARTIAL;
      if(u?.status===STATUS.OUTSIDE_MODEL_VALIDITY || u?.status===STATUS.CONFLICT) status=worstStatus([status,u.status]);
      const localWarnings=[];
      if(pairs.some(item=>item.status==='NONSMOOTH_SCALE')) localWarnings.push('At least one gamma normalization uses a non-smooth max-function tie; no unique first-order scale derivative exists.');
      if(pairs.some(item=>item.status==='NONSMOOTH_GAP')) localWarnings.push('At least one eigenvalue gap lies at/within its uncertainty cusp; |lambda_i-lambda_j| has no trustworthy unique local sign derivative there.');
      if(pairs.some(item=>item.status==='OUTSIDE_LINEAR_MODEL')) localWarnings.push('At least one normalized-gap uncertainty exceeds the configured linearized model envelope.');
      warnings.push(...localWarnings,...(u?.warnings||[]));
      out.push({sampleIndex:index,fraction:Number(source.fraction??index),encounterEpoch:source.encounterEpoch??null,status,pairs,warnings:unique(localWarnings)});
    }

    const enriched=out.map(item => ({...item,pairMap:new Map(item.pairs.map(pair=>[pairKey(pair.pair),pair]))}));
    const boundaryIntervals=[];
    for(let k=0;k<enriched.length-1;k+=1){
      for(const pair of PAIRS) boundaryIntervals.push(boundaryEstimate(enriched[k],enriched[k+1],pair,controls.degeneracyRelativeGap));
    }
    const cleanSamples=out;
    let status=worstStatus(cleanSamples.map(item=>item.status));
    if(boundaryIntervals.some(item=>['BOUNDARY_UNCERTAIN','NONSMOOTH_ENDPOINT'].includes(item.status))) status=worstStatus([status,STATUS.PARTIAL]);

    return deepFreeze({
      schemaVersion:'1.0.0',
      status,
      familyId:context.familyId||uncertainty.familyId||null,
      encounterModel:context.encounterModel||uncertainty.encounterModel||null,
      controls,
      samples:cleanSamples,
      boundaryIntervals,
      warnings:unique([
        ...warnings,
        'gamma_min is an operational eigenbranch-identity threshold, not a physical constant and not a fictional FTL hazard probability.',
        'Boundary fraction uncertainty is an upper-bound linear construction because cross-sample covariance is not yet represented.'
      ]),
      provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-tidal-uncertainty-propagation-runtime.js','blacklight-exo-ftl-tidal-eigenbranch-tracking-runtime.js',...(uncertainty.provenance||[])]),
      canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLNormalizedDegeneracyUncertaintyRuntime = deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLNormalizedDegeneracyUncertainty});
})();
