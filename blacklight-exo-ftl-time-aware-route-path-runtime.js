(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-time-aware-route-path-registry.json';
  const STATUS = Object.freeze({
    RESOLVED:'RESOLVED',
    PARTIAL:'PARTIAL',
    UNRESOLVED:'UNRESOLVED',
    OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',
    CONFLICT:'CONFLICT'
  });
  let registryPromise = null;

  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

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
        if(registry?.registryKey !== 'blacklight.ftl.time-aware-route-path') throw new Error('Invalid time-aware route-path registry identity.');
        return deepFreeze(registry);
      }).catch(error => { registryPromise = null; throw error; });
    }
    return registryPromise;
  }

  function terminal(status, reason, registry, context = {}, sourceStatePacket = null){
    return deepFreeze({
      schemaVersion:'1.0.0',
      status,
      routeEpoch:context.routeEpoch ?? context.epoch ?? null,
      encounterModel:context.encounterModel || 'ROUTE_EPOCH_SNAPSHOT',
      sourceStatePacket,
      pathPacket:null,
      warnings:[reason],
      provenance:unique([REGISTRY_URL,...(sourceStatePacket?.provenance || [])]),
      canonSafeguards:registry?.canonSafeguards || []
    });
  }

  function mapPropagatedSources(packet){
    return (packet?.sources || []).map(source => ({
      sourceId:source.sourceId,
      massKg:finite(source.massKg) ? Number(source.massKg) : null,
      positionM:source.positionM || null,
      velocityMPerS:source.velocityMPerS || null,
      physicalRadiusM:finite(source.physicalRadiusM) ? Number(source.physicalRadiusM) : null,
      angularMomentumKgM2PerS:source.angularMomentumKgM2PerS || null,
      covariance6x6:source.covariance6x6 || null,
      propagationStatus:source.status,
      propagationModel:source.model,
      sourceEpoch:source.sourceEpoch,
      targetEpoch:source.targetEpoch,
      provenanceStatus:'PROPAGATED_AUTHORITY',
      sourceIds:source.provenance || []
    })).filter(source => source.massKg !== null && source.positionM);
  }

  function worstStatus(...states){
    const order = [STATUS.RESOLVED,STATUS.PARTIAL,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT];
    return states.filter(Boolean).reduce((worst,current) => order.indexOf(current) > order.indexOf(worst) ? current : worst,STATUS.RESOLVED);
  }

  async function resolveFTLTimeAwareRoutePath(context = {}){
    const registry = context.registry || await loadRegistry();
    const SourceState = context.sourceStateRuntime || globalThis.BlacklightExoFTLTimeDependentSourceStateRuntime;
    const PathRuntime = context.pathRuntime || globalThis.BlacklightExoFTLPhysicalRoutePathRuntime;
    const routeEpoch = context.routeEpoch ?? context.epoch ?? null;
    const sourceStates = Array.isArray(context.sourceStates) ? context.sourceStates : [];

    if(!routeEpoch) return terminal(STATUS.UNRESOLVED,'A routeEpoch is required for time-aware route evaluation.',registry,context);
    if(!sourceStates.length) return terminal(STATUS.UNRESOLVED,'Authoritative sourceStates with source epochs and velocities are required. Missing source motion is not interpreted as zero.',registry,context);
    if(!SourceState?.resolveFTLTimeDependentSourceStates) return terminal(STATUS.UNRESOLVED,'Time-dependent source-state runtime is not loaded.',registry,context);
    if(!PathRuntime?.resolveFTLPhysicalRoutePath) return terminal(STATUS.UNRESOLVED,'Physical route-path runtime is not loaded.',registry,context);

    const sourceStatePacket = await SourceState.resolveFTLTimeDependentSourceStates({
      ...(context.sourcePropagation || {}),
      sources:sourceStates,
      targetEpoch:routeEpoch,
      referenceFrame:context.referenceFrame || sourceStates[0]?.referenceFrame || null
    });

    if(sourceStatePacket.status === STATUS.CONFLICT){
      return terminal(STATUS.CONFLICT,'Source-state propagation contains conflicting evidence and cannot be converted into route geometry.',registry,context,sourceStatePacket);
    }
    if(sourceStatePacket.status === STATUS.OUTSIDE_MODEL_VALIDITY){
      return terminal(STATUS.OUTSIDE_MODEL_VALIDITY,'At least one gravitational source is outside the declared propagation-model validity domain; higher-fidelity dynamics are required before route sampling.',registry,context,sourceStatePacket);
    }
    if(sourceStatePacket.status === STATUS.UNRESOLVED){
      return terminal(STATUS.UNRESOLVED,'At least one required source state cannot be propagated to the route epoch.',registry,context,sourceStatePacket);
    }

    const propagatedSources = mapPropagatedSources(sourceStatePacket);
    if(!propagatedSources.length){
      return terminal(STATUS.UNRESOLVED,'No propagated source retained both mass and position evidence.',registry,context,sourceStatePacket);
    }

    const pathPacket = await PathRuntime.resolveFTLPhysicalRoutePath({
      ...context,
      epoch:routeEpoch,
      sources:propagatedSources,
      uncertainty:context.uncertainty || {
        sourceStateStatus:sourceStatePacket.status,
        covarianceAvailable:sourceStatePacket.sources.every(source => Array.isArray(source.covariance6x6)),
        propagationModels:unique(sourceStatePacket.sources.map(source => source.model))
      }
    });

    const status = worstStatus(sourceStatePacket.status,pathPacket?.status || STATUS.UNRESOLVED);
    const warnings = unique([
      ...(sourceStatePacket.warnings || []),
      ...(pathPacket?.warnings || []),
      sourceStatePacket.status === STATUS.PARTIAL ? 'Route geometry uses propagated source positions, but incomplete covariance or approximation-validity evidence keeps the time-aware result PARTIAL.' : null,
      'This runtime is a route-epoch snapshot integration. It does not yet evaluate continuously moving sources at a distinct encounter epoch t(s) for every sample.'
    ]);

    return deepFreeze({
      schemaVersion:'1.0.0',
      status,
      routeEpoch,
      encounterModel:'ROUTE_EPOCH_SNAPSHOT',
      sourceStatePacket,
      pathPacket,
      warnings,
      provenance:unique([REGISTRY_URL,'blacklight-exo-ftl-time-dependent-source-state-runtime.js','blacklight-exo-ftl-physical-route-path-runtime.js',...(sourceStatePacket.provenance || []),...(pathPacket?.provenance || [])]),
      canonSafeguards:registry.canonSafeguards || []
    });
  }

  globalThis.BlacklightExoFTLTimeAwareRoutePathRuntime = deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLTimeAwareRoutePath});
})();
