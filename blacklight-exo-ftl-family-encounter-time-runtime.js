(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-family-encounter-time-registry.json';
  const STATUS = Object.freeze({
    RESOLVED:'RESOLVED',
    PARTIAL:'PARTIAL',
    UNRESOLVED:'UNRESOLVED',
    OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',
    CONFLICT:'CONFLICT'
  });
  const MODEL = Object.freeze({
    CONTINUOUS:'CONTINUOUS_PROJECTED_PROGRESS',
    PRECOMMIT:'PRECOMMIT_ENDPOINT',
    PORTAL:'ANCHORED_PORTAL',
    UNRESOLVED:'UNRESOLVED'
  });
  const FAMILY_MODEL = Object.freeze({
    'metric-envelope':MODEL.CONTINUOUS,
    'gravitic-plane':MODEL.CONTINUOUS,
    'slipstream-shear':MODEL.CONTINUOUS,
    'n-manifold':MODEL.CONTINUOUS,
    'inertial-torch':MODEL.CONTINUOUS,
    'q-lattice':MODEL.PRECOMMIT,
    'fold-jump':MODEL.PRECOMMIT,
    'phase-displacement':MODEL.PRECOMMIT,
    'wormhole-gate':MODEL.PORTAL
  });
  let registryPromise = null;

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const vector = value => value && ['x','y','z'].every(axis => finite(value[axis])) ? {x:Number(value.x),y:Number(value.y),z:Number(value.z)} : null;
  const subtract = (a,b) => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const scale = (v,k) => ({x:v.x*k,y:v.y*k,z:v.z*k});
  const magnitude = v => Math.hypot(v.x,v.y,v.z);

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
        if(registry?.registryKey !== 'blacklight.ftl.family-encounter-time') throw new Error('Invalid family encounter-time registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise = null; throw error; });
    }
    return registryPromise;
  }

  function epochSeconds(value){
    if(finite(value)) return Number(value);
    if(typeof value !== 'string' || !value.trim()) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms/1000 : null;
  }

  function epochAt(baseEpoch,deltaSeconds){
    const base = epochSeconds(baseEpoch);
    if(base === null || !finite(deltaSeconds)) return null;
    if(typeof baseEpoch === 'number' || finite(baseEpoch)) return base + Number(deltaSeconds);
    return new Date((base + Number(deltaSeconds))*1000).toISOString();
  }

  function worstStatus(states){
    const order = [STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return (states || []).filter(Boolean).reduce((worst,current) => order.indexOf(current) > order.indexOf(worst) ? current : worst,STATUS.RESOLVED);
  }

  function unresolved(reason,registry,context={},familyId=null,encounterModel=MODEL.UNRESOLVED){
    return deepFreeze({
      schemaVersion:'1.0.0',
      status:STATUS.UNRESOLVED,
      familyId,
      encounterModel,
      routeStartEpoch:context.routeStartEpoch ?? context.epoch ?? null,
      routeLengthM:null,
      projectedProgressMPerS:null,
      progressSemantic:context.progressSemantic || null,
      samples:[],
      warnings:[reason],
      provenance:[REGISTRY_URL],
      canonSafeguards:registry?.canonSafeguards || []
    });
  }

  function normalizeFractions(value){
    const raw = Array.isArray(value) && value.length ? value : [0.05,0.1,0.2,0.35,0.5,0.65,0.8,0.9,0.95];
    return [...new Set(raw.filter(finite).map(Number).filter(x => x > 0 && x < 1))].sort((a,b) => a-b);
  }

  function mapSources(packet){
    return (packet?.sources || []).map(source => ({
      sourceId:source.sourceId,
      massKg:finite(source.massKg) ? Number(source.massKg) : null,
      positionM:source.positionM || null,
      velocityMPerS:source.velocityMPerS || null,
      physicalRadiusM:finite(source.physicalRadiusM) ? Number(source.physicalRadiusM) : null,
      angularMomentumKgM2PerS:source.angularMomentumKgM2PerS || null,
      provenanceStatus:'PROPAGATED_AUTHORITY'
    })).filter(source => source.massKg !== null && source.positionM);
  }

  async function evaluateSample(spec,context,runtimes){
    const {SourceState,Curvature} = runtimes;
    const sourceStatePacket = await SourceState.resolveFTLTimeDependentSourceStates({
      ...(context.sourcePropagation || {}),
      sources:context.sourceStates,
      targetEpoch:spec.encounterEpoch,
      referenceFrame:context.referenceFrame || context.sourceStates[0]?.referenceFrame || null
    });

    if([STATUS.CONFLICT,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.UNRESOLVED].includes(sourceStatePacket.status)){
      return {
        sampleIndex:spec.sampleIndex,
        role:spec.role,
        fraction:spec.fraction,
        encounterEpoch:spec.encounterEpoch,
        fieldPointM:spec.fieldPointM,
        sourceStateStatus:sourceStatePacket.status,
        environmentStatus:sourceStatePacket.status,
        sourceStatePacket,
        environmentPacket:null
      };
    }

    const propagatedSources = mapSources(sourceStatePacket);
    if(!propagatedSources.length){
      return {
        sampleIndex:spec.sampleIndex,
        role:spec.role,
        fraction:spec.fraction,
        encounterEpoch:spec.encounterEpoch,
        fieldPointM:spec.fieldPointM,
        sourceStateStatus:STATUS.UNRESOLVED,
        environmentStatus:STATUS.UNRESOLVED,
        sourceStatePacket,
        environmentPacket:null
      };
    }

    const environmentPacket = await Curvature.resolveFTLCurvatureEnvironment({
      referenceFrame:context.referenceFrame || sourceStatePacket.referenceFrame || null,
      fieldPoint:spec.fieldPointM,
      sources:propagatedSources,
      uncertainty:{
        encounterEpoch:spec.encounterEpoch,
        sourceStateStatus:sourceStatePacket.status,
        covarianceAvailable:sourceStatePacket.sources.every(source => Array.isArray(source.covariance6x6)),
        propagationModels:unique(sourceStatePacket.sources.map(source => source.model)),
        parent:context.uncertainty || null
      }
    });

    return {
      sampleIndex:spec.sampleIndex,
      role:spec.role,
      fraction:spec.fraction,
      encounterEpoch:spec.encounterEpoch,
      fieldPointM:spec.fieldPointM,
      sourceStateStatus:sourceStatePacket.status,
      environmentStatus:environmentPacket?.status || STATUS.UNRESOLVED,
      sourceStatePacket,
      environmentPacket:environmentPacket || null
    };
  }

  async function resolveFTLFamilyEncounterTime(context={}){
    const registry = context.registry || await loadRegistry();
    const SourceState = context.sourceStateRuntime || globalThis.BlacklightExoFTLTimeDependentSourceStateRuntime;
    const Curvature = context.curvatureRuntime || globalThis.BlacklightExoFTLCurvatureEnvironment;
    const familyId = String(context.familyId || '').trim();
    const encounterModel = FAMILY_MODEL[familyId] || MODEL.UNRESOLVED;
    const from = vector(context.from?.positionM || context.from);
    const to = vector(context.to?.positionM || context.to);
    const sourceStates = Array.isArray(context.sourceStates) ? context.sourceStates : [];

    if(encounterModel === MODEL.UNRESOLVED) return unresolved('A recognized explicit transit family id is required. Race, technology basis or vessel identity is not used as a substitute family selector.',registry,context,familyId || null);
    if(!from || !to) return unresolved('Finite SI route reference points from and to are required.',registry,context,familyId,encounterModel);
    if(!sourceStates.length) return unresolved('Authoritative sourceStates with source epoch and velocity evidence are required.',registry,context,familyId,encounterModel);
    if(!SourceState?.resolveFTLTimeDependentSourceStates) return unresolved('Time-dependent source-state runtime is not loaded.',registry,context,familyId,encounterModel);
    if(!Curvature?.resolveFTLCurvatureEnvironment) return unresolved('Curvature environment runtime is not loaded.',registry,context,familyId,encounterModel);

    const routeVector = subtract(to,from);
    const routeLengthM = magnitude(routeVector);
    if(!(routeLengthM > 0)) return unresolved('Route reference points must be distinct.',registry,context,familyId,encounterModel);

    const specs = [];
    let routeStartEpoch = context.routeStartEpoch ?? context.epoch ?? null;
    let projectedProgressMPerS = null;
    let progressSemantic = context.progressSemantic || null;

    if(encounterModel === MODEL.CONTINUOUS){
      if(epochSeconds(routeStartEpoch) === null) return unresolved('Continuous projected-progress evaluation requires a parseable routeStartEpoch.',registry,context,familyId,encounterModel);
      if(!finite(context.projectedProgressMPerS) || Number(context.projectedProgressMPerS) <= 0) return unresolved('Continuous projected-progress evaluation requires positive projectedProgressMPerS.',registry,context,familyId,encounterModel);
      if(!progressSemantic) return unresolved('Continuous projected-progress evaluation requires progressSemantic so the control representation is not confused with local hull velocity.',registry,context,familyId,encounterModel);
      projectedProgressMPerS = Number(context.projectedProgressMPerS);
      const fractions = normalizeFractions(context.fractions);
      fractions.forEach((fraction,index) => {
        const dt = fraction*routeLengthM/projectedProgressMPerS;
        specs.push({sampleIndex:index,role:'PATH_SAMPLE',fraction,encounterEpoch:epochAt(routeStartEpoch,dt),fieldPointM:add(from,scale(routeVector,fraction))});
      });
    } else if(encounterModel === MODEL.PRECOMMIT){
      const commitmentEpoch = context.commitmentEpoch ?? routeStartEpoch;
      const emergenceEpoch = context.emergenceEpoch ?? null;
      if(epochSeconds(commitmentEpoch) === null || epochSeconds(emergenceEpoch) === null) return unresolved('PRECOMMIT_ENDPOINT requires explicit parseable commitmentEpoch and emergenceEpoch. Intermediate encounter epochs are not fabricated.',registry,context,familyId,encounterModel);
      routeStartEpoch = commitmentEpoch;
      specs.push({sampleIndex:0,role:'COMMITMENT',fraction:0,encounterEpoch:commitmentEpoch,fieldPointM:from});
      specs.push({sampleIndex:1,role:'EMERGENCE',fraction:1,encounterEpoch:emergenceEpoch,fieldPointM:to});
    } else if(encounterModel === MODEL.PORTAL){
      const entryEpoch = context.entryEpoch ?? routeStartEpoch;
      const exitEpoch = context.exitEpoch ?? null;
      if(epochSeconds(entryEpoch) === null || epochSeconds(exitEpoch) === null) return unresolved('ANCHORED_PORTAL requires explicit parseable entryEpoch and exitEpoch. The topological connection is not treated as an ordinary-space corridor.',registry,context,familyId,encounterModel);
      routeStartEpoch = entryEpoch;
      specs.push({sampleIndex:0,role:'ENTRY_MOUTH',fraction:0,encounterEpoch:entryEpoch,fieldPointM:from});
      specs.push({sampleIndex:1,role:'EXIT_MOUTH',fraction:1,encounterEpoch:exitEpoch,fieldPointM:to});
    }

    const samples = [];
    for(const spec of specs){
      samples.push(await evaluateSample(spec,{...context,sourceStates},{SourceState,Curvature}));
    }
    const status = worstStatus(samples.flatMap(sample => [sample.sourceStateStatus,sample.environmentStatus]));
    const warnings = unique([
      ...samples.flatMap(sample => sample.sourceStatePacket?.warnings || []),
      ...samples.flatMap(sample => sample.environmentPacket?.validity?.notes || []),
      encounterModel === MODEL.CONTINUOUS && familyId !== 'inertial-torch' ? 'projectedProgressMPerS is a family route/control progress representation for encounter timing; this runtime does not assert local superluminal hull motion.' : null,
      encounterModel === MODEL.PRECOMMIT ? 'Only commitment and emergence physical states are evaluated; no intermediate ordinary-space corridor traversal is asserted.' : null,
      encounterModel === MODEL.PORTAL ? 'Only entry-mouth and exit-mouth physical states are evaluated; no ordinary-space traversal between anchors is asserted.' : null,
      'Weak-field source-state evaluation is not a full retarded relativistic gravitational-field solution; model-domain refusal remains mandatory when approximation assumptions fail.'
    ]);

    return deepFreeze({
      schemaVersion:'1.0.0',
      status,
      familyId,
      encounterModel,
      routeStartEpoch,
      routeLengthM,
      projectedProgressMPerS,
      progressSemantic,
      samples,
      warnings,
      provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-time-dependent-source-state-runtime.js','blacklight-exo-ftl-curvature-environment-runtime.js',...samples.flatMap(sample => sample.sourceStatePacket?.provenance || [])]),
      canonSafeguards:registry.canonSafeguards || []
    });
  }

  globalThis.BlacklightExoFTLFamilyEncounterTimeRuntime = deepFreeze({STATUS,MODEL,FAMILY_MODEL,REGISTRY_URL,loadRegistry,resolveFTLFamilyEncounterTime});
})();
