(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-tidal-uncertainty-propagation-registry.json';
  const STATUS = Object.freeze({RESOLVED:'RESOLVED',PARTIAL:'PARTIAL',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',CONFLICT:'CONFLICT'});
  let registryPromise = null;

  const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
  const mag = v => Math.hypot(v.x,v.y,v.z);
  const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const scale = (v,k) => ({x:v.x*k,y:v.y*k,z:v.z*k});
  const vector = value => value && ['x','y','z'].every(k => finite(value[k])) ? {x:Number(value.x),y:Number(value.y),z:Number(value.z)} : null;

  function deepFreeze(value){
    if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(k => deepFreeze(value[k]));
    return value;
  }

  async function loadRegistry(){
    if(!registryPromise){
      registryPromise = fetch(REGISTRY_URL,{cache:'no-store'}).then(r => {
        if(!r.ok) throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${r.status}`);
        return r.json();
      }).then(registry => {
        if(registry?.registryKey !== 'blacklight.ftl.tidal-uncertainty-propagation') throw new Error('Invalid FTL tidal uncertainty registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise=null; throw error; });
    }
    return registryPromise;
  }

  const zeros = n => Array.from({length:n},()=>Array(n).fill(0));
  const transpose = a => a[0].map((_,i)=>a.map(row=>row[i]));
  const multiply = (a,b) => a.map(row=>b[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*b[k][j],0)));
  const matVec = (a,v) => a.map(row=>row.reduce((sum,x,i)=>sum+x*v[i],0));
  const quad = (v,a) => { const av=matVec(a,v); return v.reduce((sum,x,i)=>sum+x*av[i],0); };

  function validCov6(m){
    if(!Array.isArray(m) || m.length!==6 || m.some(row=>!Array.isArray(row)||row.length!==6||row.some(v=>!finite(v)))) return false;
    for(let i=0;i<6;i+=1){
      if(Number(m[i][i])<0) return false;
      for(let j=i+1;j<6;j+=1){
        const s=Math.max(1,Math.abs(Number(m[i][j])),Math.abs(Number(m[j][i])));
        if(Math.abs(Number(m[i][j])-Number(m[j][i]))>1e-10*s) return false;
      }
    }
    return true;
  }

  function positionCovariance3(cov6){
    if(!validCov6(cov6)) return null;
    return [0,1,2].map(i=>[0,1,2].map(j=>Number(cov6[i][j])));
  }

  function tensorForPointMass(sourcePosition,fieldPoint,massKg){
    const G=6.67430e-11;
    const d=sub(fieldPoint,sourcePosition);
    const r=mag(d);
    if(!(r>0) || !finite(massKg) || !(Number(massKg)>0)) return null;
    const n=scale(d,1/r);
    const k=G*Number(massKg)/(r*r*r);
    const v=[n.x,n.y,n.z];
    return [0,1,2].map(i=>[0,1,2].map(j=>k*(3*v[i]*v[j]-(i===j?1:0))));
  }

  function tensor6(matrix){
    return [matrix[0][0],matrix[1][1],matrix[2][2],matrix[0][1],matrix[0][2],matrix[1][2]];
  }

  function addCovariance(target,term){
    for(let i=0;i<target.length;i+=1) for(let j=0;j<target.length;j+=1) target[i][j]+=term[i][j];
  }

  function finiteDifferenceJacobian(source,fieldPoint,controls,warnings){
    const p=vector(source.positionM);
    const covariance=positionCovariance3(source.covariance6x6);
    if(!p || !covariance || !finite(source.massKg)) return null;
    const sigma=[0,1,2].map(i=>Math.sqrt(Math.max(0,covariance[i][i])));
    const j=Array.from({length:6},()=>Array(3).fill(0));
    for(let axis=0;axis<3;axis+=1){
      let h=Math.max(controls.minimumFiniteDifferenceM,controls.finiteDifferenceScaleSigma*Math.max(sigma[axis],controls.minimumFiniteDifferenceM));
      h=Math.min(h,controls.maximumFiniteDifferenceM);
      const plus={...p},minus={...p};
      const key=['x','y','z'][axis]; plus[key]+=h; minus[key]-=h;
      const tp=tensorForPointMass(plus,fieldPoint,source.massKg);
      const tm=tensorForPointMass(minus,fieldPoint,source.massKg);
      if(!tp || !tm){ warnings.push(`Unable to finite-difference source ${source.sourceId || 'UNRESOLVED'} on axis ${key}.`); return null; }
      const vp=tensor6(tp),vm=tensor6(tm);
      for(let row=0;row<6;row+=1) j[row][axis]=(vp[row]-vm[row])/(2*h);
    }
    return {jacobian6x3:j,positionCovariance3x3:covariance};
  }

  function tensorCovarianceForSample(sample,controls){
    const warnings=[];
    const fieldPoint=vector(sample.fieldPointM);
    const sources=sample?.sourceStatePacket?.sources || [];
    if(!fieldPoint || !sources.length) return {status:STATUS.UNRESOLVED,covariance6x6:null,warnings:['Field point or propagated source-state packet is missing.']};
    const out=zeros(6);
    let used=0,partial=false;
    for(const source of sources){
      if(!source.covariance6x6){ partial=true; warnings.push(`Source ${source.sourceId || 'UNRESOLVED'} has no propagated covariance; tidal uncertainty is incomplete rather than zero.`); continue; }
      const item=finiteDifferenceJacobian(source,fieldPoint,controls,warnings);
      if(!item){ partial=true; continue; }
      const contribution=multiply(multiply(item.jacobian6x3,item.positionCovariance3x3),transpose(item.jacobian6x3));
      addCovariance(out,contribution); used+=1;
    }
    if(!used) return {status:STATUS.UNRESOLVED,covariance6x6:null,warnings};
    return {status:partial?STATUS.PARTIAL:STATUS.RESOLVED,covariance6x6:out,warnings};
  }

  function branchSensitivity(e){
    return [e.x*e.x,e.y*e.y,e.z*e.z,2*e.x*e.y,2*e.x*e.z,2*e.y*e.z];
  }

  function couplingSensitivity(ej,ek){
    return [
      ej.x*ek.x,ej.y*ek.y,ej.z*ek.z,
      ej.x*ek.y+ej.y*ek.x,
      ej.x*ek.z+ej.z*ek.x,
      ej.y*ek.z+ej.z*ek.y
    ];
  }

  function covarianceBetween(a,b,cov){
    const cb=matVec(cov,b);
    return a.reduce((sum,x,i)=>sum+x*cb[i],0);
  }

  function eigenUncertainty(sampleTrack,tensorCov,controls){
    const branches=sampleTrack?.eigenbranches || [];
    if(branches.length!==3 || !tensorCov) return [];
    return branches.map((branch,k)=>{
      const e=branch.eigenvector;
      const a=branchSensitivity(e);
      const eigenVar=Math.max(0,quad(a,tensorCov));
      let orientationVar=0;
      let orientationStatus='LINEARIZED';
      if(branch.degenerate){
        orientationStatus='DEGENERATE_SUBSPACE';
        return {branchId:branch.branchId,eigenvaluePerS2:branch.eigenvaluePerS2,eigenvalueSigmaPerS2:Math.sqrt(eigenVar),orientationSigmaRad:null,orientationStatus,degenerate:true,sensitivity:a};
      }
      for(let j=0;j<3;j+=1){
        if(j===k) continue;
        const other=branches[j];
        const gap=branch.eigenvaluePerS2-other.eigenvaluePerS2;
        const scaleRef=Math.max(Math.abs(branch.eigenvaluePerS2),Math.abs(other.eigenvaluePerS2),1e-30);
        if(Math.abs(gap)/scaleRef < controls.degeneracyRelativeGap){ orientationStatus='DEGENERATE_SUBSPACE'; orientationVar=NaN; break; }
        const b=couplingSensitivity(other.eigenvector,e);
        orientationVar += Math.max(0,quad(b,tensorCov))/(gap*gap);
      }
      const sigma=Number.isFinite(orientationVar)?Math.sqrt(Math.max(0,orientationVar)):null;
      if(sigma!==null && sigma>controls.maximumLinearizedOrientationSigmaRad) orientationStatus='OUTSIDE_LINEAR_MODEL';
      return {branchId:branch.branchId,eigenvaluePerS2:branch.eigenvaluePerS2,eigenvalueSigmaPerS2:Math.sqrt(eigenVar),orientationSigmaRad:sigma,orientationStatus,degenerate:false,sensitivity:a};
    });
  }

  function gapSigma(leftBranches,i,j,tensorCov){
    if(!tensorCov || !leftBranches?.[i] || !leftBranches?.[j]) return null;
    const ai=leftBranches[i].sensitivity,aj=leftBranches[j].sensitivity;
    if(!ai || !aj) return null;
    const variance=Math.max(0,quad(ai,tensorCov)+quad(aj,tensorCov)-2*covarianceBetween(ai,aj,tensorCov));
    return Math.sqrt(variance);
  }

  function boundaryEstimate(left,right,pair){
    const [i,j]=pair;
    const lb=left.eigenbranches,rb=right.eigenbranches;
    if(lb.length!==3 || rb.length!==3) return {status:'UNRESOLVED'};
    const gl=lb[i].eigenvaluePerS2-lb[j].eigenvaluePerS2;
    const gr=rb[i].eigenvaluePerS2-rb[j].eigenvaluePerS2;
    const sl=gapSigma(lb,i,j,left.tensorCovariance6x6);
    const sr=gapSigma(rb,i,j,right.tensorCovariance6x6);
    const df=right.fraction-left.fraction;
    const dg=gr-gl;
    const crossing=(gl===0)||(gr===0)||(gl*gr<0);
    if(!crossing) return {status:'NO_CROSSING',gl,gr,sl,sr,boundaryFraction:null,boundaryFractionSigma:null,notes:[]};
    if(!(Math.abs(dg)>0) || !(Math.abs(df)>0)) return {status:'BOUNDARY_UNCERTAIN',gl,gr,sl,sr,boundaryFraction:null,boundaryFractionSigma:null,notes:['The eigenvalue gap does not provide a resolvable local slope for boundary localization.']};
    const f=left.fraction-df*gl/dg;
    const sigmaGap=sl!==null&&sr!==null?Math.sqrt(sl*sl+sr*sr)/2:null;
    const slope=Math.abs(dg/df);
    const sf=sigmaGap!==null&&slope>0?sigmaGap/slope:null;
    return {status:sf===null?'BOUNDARY_UNCERTAIN':'BOUNDARY_ESTIMATED',gl,gr,sl,sr,boundaryFraction:f,boundaryFractionSigma:sf,notes:['Boundary uncertainty uses first-order gap uncertainty divided by the finite-difference gap slope; it is not a proof of an exact crossing distribution.']};
  }

  function worstStatus(states){
    const order=[STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return (states||[]).reduce((w,s)=>order.indexOf(s)>order.indexOf(w)?s:w,STATUS.RESOLVED);
  }

  async function resolveFTLTidalUncertaintyPropagation(context={}){
    const registry=context.registry || await loadRegistry();
    const Eigen=context.eigenbranchRuntime || globalThis.BlacklightExoFTLTidalEigenbranchTrackingRuntime;
    const samples=Array.isArray(context.samples)?context.samples:[];
    if(!samples.length) return deepFreeze({schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,familyId:context.familyId||null,encounterModel:context.encounterModel||null,controls:{},samples:[],boundaryIntervals:[],warnings:['No encounter samples were supplied.'],provenance:[REGISTRY_URL],canonSafeguards:registry.canonSafeguards||[]});
    if(!Eigen?.resolveFTLTidalEigenbranchTracking) return deepFreeze({schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,familyId:context.familyId||null,encounterModel:context.encounterModel||null,controls:{},samples:[],boundaryIntervals:[],warnings:['Tidal eigenbranch tracking runtime is not loaded.'],provenance:[REGISTRY_URL],canonSafeguards:registry.canonSafeguards||[]});

    const defaults=registry.defaultControls||{};
    const controls={
      finiteDifferenceScaleSigma:finite(context.finiteDifferenceScaleSigma)?Number(context.finiteDifferenceScaleSigma):Number(defaults.finiteDifferenceScaleSigma)||1,
      minimumFiniteDifferenceM:finite(context.minimumFiniteDifferenceM)?Number(context.minimumFiniteDifferenceM):Number(defaults.minimumFiniteDifferenceM)||1,
      maximumFiniteDifferenceM:finite(context.maximumFiniteDifferenceM)?Number(context.maximumFiniteDifferenceM):Number(defaults.maximumFiniteDifferenceM)||1e9,
      degeneracyRelativeGap:finite(context.degeneracyRelativeGap)?Number(context.degeneracyRelativeGap):Number(defaults.degeneracyRelativeGap)||0.02,
      maximumLinearizedOrientationSigmaRad:finite(context.maximumLinearizedOrientationSigmaRad)?Number(context.maximumLinearizedOrientationSigmaRad):Number(defaults.maximumLinearizedOrientationSigmaRad)||0.17453292519943295
    };

    const tracking=context.eigenbranchTracking || await Eigen.resolveFTLTidalEigenbranchTracking({samples,familyId:context.familyId,encounterModel:context.encounterModel,degeneracyRelativeGap:controls.degeneracyRelativeGap});
    const byIndex=new Map((tracking.samples||[]).map(s=>[s.sampleIndex,s]));
    const out=[]; const warnings=[];
    const sorted=[...samples].sort((a,b)=>Number(a.fraction??a.sampleIndex??0)-Number(b.fraction??b.sampleIndex??0));
    for(let index=0;index<sorted.length;index+=1){
      const source=sorted[index];
      const tensor=tensorCovarianceForSample(source,controls);
      const tracked=byIndex.get(index);
      const eigenbranches=eigenUncertainty(tracked,tensor.covariance6x6,controls);
      let status=tensor.status;
      if(eigenbranches.some(b=>b.orientationStatus==='OUTSIDE_LINEAR_MODEL')) status=worstStatus([status,STATUS.PARTIAL]);
      if(eigenbranches.some(b=>b.orientationStatus==='DEGENERATE_SUBSPACE')) status=worstStatus([status,STATUS.PARTIAL]);
      warnings.push(...tensor.warnings);
      out.push({sampleIndex:index,fraction:Number(source.fraction??index),encounterEpoch:source.encounterEpoch||null,status,tensorCovariance6x6:tensor.covariance6x6,eigenbranches,warnings:unique(tensor.warnings)});
    }

    const boundaryIntervals=[];
    for(let k=0;k<out.length-1;k+=1){
      for(const pair of [[0,1],[0,2],[1,2]]){
        const b=boundaryEstimate(out[k],out[k+1],pair);
        boundaryIntervals.push({leftSampleIndex:k,rightSampleIndex:k+1,branchPair:`T${pair[0]+1}-T${pair[1]+1}`,status:b.status,gapAtLeftPerS2:b.gl??null,gapAtRightPerS2:b.gr??null,gapSigmaLeftPerS2:b.sl??null,gapSigmaRightPerS2:b.sr??null,boundaryFraction:b.boundaryFraction??null,boundaryFractionSigma:b.boundaryFractionSigma??null,notes:b.notes||[]});
      }
    }

    warnings.push('Tensor covariance uses first-order propagation of propagated source-position covariance through the weak-field point-mass tidal model. Cross-source covariance is not invented; if correlated astrometric errors exist, this packet remains incomplete unless a joint covariance authority supplies them.');
    warnings.push('Eigenvalue uncertainty uses first-order symmetric-matrix perturbation. Eigenvector orientation uncertainty is not reported through a degenerate eigenspace because individual axes are not physically unique there.');
    warnings.push('Degeneracy-boundary location uncertainty is a local linear estimate from eigenvalue-gap uncertainty and finite-difference gap slope; it is not an exact posterior distribution.');
    warnings.push('Ordinary gravitational uncertainty cannot establish an exotic FTL shear fork, family-boundary state, or civilization-specific transit doctrine.');

    const status=worstStatus(out.map(s=>s.status));
    return deepFreeze({schemaVersion:'1.0.0',status,familyId:context.familyId||null,encounterModel:context.encounterModel||null,controls,samples:out,boundaryIntervals,warnings:unique(warnings),provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-tidal-eigenbranch-tracking-runtime.js','blacklight-exo-ftl-time-dependent-source-state-runtime.js',...(context.provenance||[])]),canonSafeguards:registry.canonSafeguards||[]});
  }

  globalThis.BlacklightExoFTLTidalUncertaintyPropagationRuntime=deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLTidalUncertaintyPropagation});
})();
