(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-time-dependent-source-state-registry.json';
  const STATUS = Object.freeze({RESOLVED:'RESOLVED',PARTIAL:'PARTIAL',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',CONFLICT:'CONFLICT'});
  let registryPromise = null;

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const vector = value => value && ['x','y','z'].every(axis => finite(value[axis])) ? {x:Number(value.x),y:Number(value.y),z:Number(value.z)} : null;
  const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const scale = (v,k) => ({x:v.x*k,y:v.y*k,z:v.z*k});
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];

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
        if(registry?.registryKey !== 'blacklight.ftl.time-dependent-source-state') throw new Error('Invalid time-dependent source-state registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise = null; throw error; });
    }
    return registryPromise;
  }

  function epochSeconds(value){
    if(finite(value)) return Number(value);
    if(typeof value !== 'string' || !value.trim()) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms / 1000 : null;
  }

  function matrix6(value){
    if(!Array.isArray(value) || value.length !== 6) return null;
    const out = [];
    for(const row of value){
      if(!Array.isArray(row) || row.length !== 6 || !row.every(finite)) return null;
      out.push(row.map(Number));
    }
    return out;
  }

  function symmetric6(value, tolerance = 1e-10){
    const m = matrix6(value);
    if(!m) return false;
    for(let i=0;i<6;i+=1){
      if(m[i][i] < 0) return false;
      for(let j=i+1;j<6;j+=1){
        const scale = Math.max(1,Math.abs(m[i][j]),Math.abs(m[j][i]));
        if(Math.abs(m[i][j]-m[j][i]) > tolerance*scale) return false;
      }
    }
    return true;
  }

  const zeros6 = () => Array.from({length:6},() => Array(6).fill(0));

  function identityTransition(dt){
    const f = zeros6();
    for(let i=0;i<3;i+=1){
      f[i][i] = 1;
      f[i][i+3] = dt;
      f[i+3][i+3] = 1;
    }
    return f;
  }

  function transpose(a){
    return a[0].map((_,i) => a.map(row => row[i]));
  }

  function multiply(a,b){
    return a.map(row => b[0].map((_,j) => row.reduce((sum,value,k) => sum + value*b[k][j],0)));
  }

  function addMatrices(a,b){
    return a.map((row,i) => row.map((value,j) => value + b[i][j]));
  }

  function whiteAccelerationQ(durationS, q){
    const t = Math.max(0,Number(durationS));
    const qv = Number(q);
    if(!(t >= 0) || !(qv >= 0)) return null;
    const out = zeros6();
    const pp = qv*t*t*t/3;
    const pv = qv*t*t/2;
    const vv = qv*t;
    for(let axis=0;axis<3;axis+=1){
      out[axis][axis] = pp;
      out[axis][axis+3] = pv;
      out[axis+3][axis] = pv;
      out[axis+3][axis+3] = vv;
    }
    return out;
  }

  function propagateCovariance(covariance,dt,context,warnings){
    if(covariance == null){
      warnings.push('No 6x6 source covariance was supplied; propagated uncertainty remains incomplete rather than zero.');
      return {covariance6x6:null,processNoise6x6:null,status:STATUS.PARTIAL};
    }
    if(!symmetric6(covariance)){
      warnings.push('Source covariance is not a valid symmetric 6x6 covariance with nonnegative diagonal; it was not silently repaired.');
      return {covariance6x6:null,processNoise6x6:null,status:STATUS.CONFLICT};
    }
    const f = identityTransition(dt);
    let q = matrix6(context.processNoise6x6);
    if(q && !symmetric6(q)){
      warnings.push('Caller-supplied process-noise covariance is invalid; propagation is conflicted.');
      return {covariance6x6:null,processNoise6x6:null,status:STATUS.CONFLICT};
    }
    if(!q && finite(context.whiteAccelerationPSD)){
      if(dt < 0){
        warnings.push('White-acceleration process noise was requested for backward propagation. A reverse-time stochastic model is not assumed; provide an explicit processNoise6x6 instead.');
        return {covariance6x6:null,processNoise6x6:null,status:STATUS.OUTSIDE_MODEL_VALIDITY};
      }
      q = whiteAccelerationQ(dt,Number(context.whiteAccelerationPSD));
    }
    if(!q){
      q = zeros6();
      warnings.push('No process-noise model was supplied. Covariance was transported deterministically; unmodeled dynamical uncertainty may therefore be understated.');
    }
    const propagated = addMatrices(multiply(multiply(f,covariance),transpose(f)),q);
    return {covariance6x6:propagated,processNoise6x6:q,status:STATUS.RESOLVED};
  }

  function kinematicRemainder(model,dt,context,warnings){
    const duration = Math.abs(dt);
    const positionToleranceM = finite(context.positionToleranceM) ? Number(context.positionToleranceM) : null;
    const velocityToleranceMPerS = finite(context.velocityToleranceMPerS) ? Number(context.velocityToleranceMPerS) : null;
    if(model === 'LINEAR_KINEMATIC'){
      const bound = finite(context.neglectedAccelerationBoundMPerS2) ? Math.max(0,Number(context.neglectedAccelerationBoundMPerS2)) : null;
      if(bound === null){
        warnings.push('No neglected-acceleration bound was supplied for linear propagation; the propagated state is numerically usable but model validity remains PARTIAL.');
        return {status:STATUS.PARTIAL,neglectedAccelerationBoundMPerS2:null,positionRemainderBoundM:null,velocityRemainderBoundMPerS:null,positionToleranceM,velocityToleranceMPerS};
      }
      const positionRemainderBoundM = 0.5*bound*duration*duration;
      const velocityRemainderBoundMPerS = bound*duration;
      const outside = (positionToleranceM !== null && positionRemainderBoundM > positionToleranceM) || (velocityToleranceMPerS !== null && velocityRemainderBoundMPerS > velocityToleranceMPerS);
      if(outside) warnings.push('Linear propagation remainder exceeds the caller-declared tolerance; a higher-fidelity dynamical model is required.');
      return {status:outside?STATUS.OUTSIDE_MODEL_VALIDITY:STATUS.RESOLVED,neglectedAccelerationBoundMPerS2:bound,positionRemainderBoundM,velocityRemainderBoundMPerS,positionToleranceM,velocityToleranceMPerS};
    }
    const jerkBound = finite(context.neglectedJerkBoundMPerS3) ? Math.max(0,Number(context.neglectedJerkBoundMPerS3)) : null;
    if(jerkBound === null){
      warnings.push('No neglected-jerk bound was supplied for constant-acceleration propagation; model validity remains PARTIAL.');
      return {status:STATUS.PARTIAL,neglectedJerkBoundMPerS3:null,positionRemainderBoundM:null,velocityRemainderBoundMPerS:null,positionToleranceM,velocityToleranceMPerS};
    }
    const positionRemainderBoundM = jerkBound*duration*duration*duration/6;
    const velocityRemainderBoundMPerS = jerkBound*duration*duration/2;
    const outside = (positionToleranceM !== null && positionRemainderBoundM > positionToleranceM) || (velocityToleranceMPerS !== null && velocityRemainderBoundMPerS > velocityToleranceMPerS);
    if(outside) warnings.push('Constant-acceleration Taylor remainder exceeds the caller-declared tolerance; a higher-fidelity dynamical model is required.');
    return {status:outside?STATUS.OUTSIDE_MODEL_VALIDITY:STATUS.RESOLVED,neglectedJerkBoundMPerS3:jerkBound,positionRemainderBoundM,velocityRemainderBoundMPerS,positionToleranceM,velocityToleranceMPerS};
  }

  function worstStatus(states){
    const order = [STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return states.reduce((worst,current) => order.indexOf(current) > order.indexOf(worst) ? current : worst,STATUS.RESOLVED);
  }

  function propagateSource(source,targetEpoch,context={}){
    const warnings = [];
    const sourceId = String(source?.sourceId || source?.id || source?.name || 'UNRESOLVED');
    const position = vector(source?.positionM);
    const velocity = vector(source?.velocityMPerS);
    const sourceEpoch = source?.sourceEpoch ?? source?.epoch ?? null;
    const sourceEpochS = epochSeconds(sourceEpoch);
    const targetEpochS = epochSeconds(targetEpoch);
    const provenance = unique([...(source?.provenance || []),...(source?.sourceIds || []),source?.authorityVersion ? `authority-version:${source.authorityVersion}` : null]);
    if(!position || !velocity || sourceEpochS === null || targetEpochS === null){
      if(!position) warnings.push('Authoritative source position is missing.');
      if(!velocity) warnings.push('Authoritative source velocity is missing; zero velocity is not assumed.');
      if(sourceEpochS === null) warnings.push('Source epoch is missing or unparsable.');
      if(targetEpochS === null) warnings.push('Target route epoch is missing or unparsable.');
      return {sourceId,status:STATUS.UNRESOLVED,sourceEpoch,targetEpoch,deltaTimeS:null,model:'UNRESOLVED',massKg:finite(source?.massKg)?Number(source.massKg):null,positionM:null,velocityMPerS:null,accelerationMPerS2:null,covariance6x6:null,processNoise6x6:null,errorBounds:null,warnings,provenance};
    }

    const dt = targetEpochS-sourceEpochS;
    const acceleration = vector(source?.accelerationMPerS2);
    const model = context.model || source?.propagationModel || (acceleration ? 'CONSTANT_ACCELERATION' : 'LINEAR_KINEMATIC');
    if(!['LINEAR_KINEMATIC','CONSTANT_ACCELERATION'].includes(model)){
      warnings.push(`Unsupported propagation model ${model}.`);
      return {sourceId,status:STATUS.UNRESOLVED,sourceEpoch,targetEpoch,deltaTimeS:dt,model:'UNRESOLVED',massKg:finite(source?.massKg)?Number(source.massKg):null,positionM:null,velocityMPerS:null,accelerationMPerS2:acceleration,covariance6x6:null,processNoise6x6:null,errorBounds:null,warnings,provenance};
    }
    if(model === 'CONSTANT_ACCELERATION' && !acceleration){
      warnings.push('Constant-acceleration propagation requires an explicitly supplied acceleration vector; acceleration is not inferred from mass alone.');
      return {sourceId,status:STATUS.UNRESOLVED,sourceEpoch,targetEpoch,deltaTimeS:dt,model,massKg:finite(source?.massKg)?Number(source.massKg):null,positionM:null,velocityMPerS:null,accelerationMPerS2:null,covariance6x6:null,processNoise6x6:null,errorBounds:null,warnings,provenance};
    }

    let positionM;
    let velocityMPerS;
    if(model === 'CONSTANT_ACCELERATION'){
      positionM = add(add(position,scale(velocity,dt)),scale(acceleration,0.5*dt*dt));
      velocityMPerS = add(velocity,scale(acceleration,dt));
    } else {
      positionM = add(position,scale(velocity,dt));
      velocityMPerS = velocity;
    }

    const covariance = propagateCovariance(matrix6(source?.covariance6x6),dt,{...context,...source?.uncertaintyModel},warnings);
    const remainder = kinematicRemainder(model,dt,{...context,...source?.validityBounds},warnings);
    const status = worstStatus([covariance.status,remainder.status]);
    return {
      sourceId,status,sourceEpoch,targetEpoch,deltaTimeS:dt,model,
      massKg:finite(source?.massKg)?Number(source.massKg):null,
      positionM,velocityMPerS,accelerationMPerS2:model==='CONSTANT_ACCELERATION'?acceleration:null,
      covariance6x6:covariance.covariance6x6,processNoise6x6:covariance.processNoise6x6,errorBounds:remainder,
      physicalRadiusM:finite(source?.physicalRadiusM)?Number(source.physicalRadiusM):null,
      angularMomentumKgM2PerS:vector(source?.angularMomentumKgM2PerS),
      warnings,provenance
    };
  }

  async function resolveFTLTimeDependentSourceStates(context={}){
    const registry = context.registry || await loadRegistry();
    const sources = Array.isArray(context.sources) ? context.sources : [];
    const targetEpoch = context.targetEpoch ?? context.epoch ?? null;
    if(!sources.length){
      return deepFreeze({schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,targetEpoch,referenceFrame:context.referenceFrame||null,propagationModel:'UNRESOLVED',sources:[],warnings:['No authoritative gravitational source states were supplied.'],provenance:[REGISTRY_URL],canonSafeguards:registry.canonSafeguards||[]});
    }
    if(epochSeconds(targetEpoch) === null){
      return deepFreeze({schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,targetEpoch,referenceFrame:context.referenceFrame||null,propagationModel:'UNRESOLVED',sources:[],warnings:['A parseable target route epoch is required.'],provenance:[REGISTRY_URL],canonSafeguards:registry.canonSafeguards||[]});
    }
    const propagated = sources.map(source => propagateSource(source,targetEpoch,context));
    const status = worstStatus(propagated.map(source => source.status));
    const models = unique(propagated.map(source => source.model).filter(model => model !== 'UNRESOLVED'));
    const warnings = unique(propagated.flatMap(source => source.warnings));
    if(status === STATUS.PARTIAL) warnings.push('At least one source is numerically propagated but lacks complete uncertainty or approximation-validity evidence for resolved route certification.');
    if(status === STATUS.OUTSIDE_MODEL_VALIDITY) warnings.push('At least one source exceeds the declared kinematic approximation domain; route certification must require a higher-fidelity ephemeris for that source.');
    return deepFreeze({
      schemaVersion:'1.0.0',status,targetEpoch,referenceFrame:context.referenceFrame||sources[0]?.referenceFrame||null,
      propagationModel:models.length===1?models[0]:(models.length>1?'MIXED':'UNRESOLVED'),
      sources:propagated,
      warnings:unique(warnings),
      provenance:unique([REGISTRY_URL,...propagated.flatMap(source => source.provenance)]),
      canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLTimeDependentSourceStateRuntime = deepFreeze({
    REGISTRY_URL,STATUS,loadRegistry,epochSeconds,propagateSource,resolveFTLTimeDependentSourceStates
  });
})();
