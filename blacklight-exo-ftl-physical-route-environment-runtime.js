(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-physical-route-environment-bridge.json';
  const STATUS=Object.freeze({READY:'READY',NOT_SUPPLIED:'NOT_SUPPLIED',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY'});
  let registryPromise=null;

  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const unique=items=>[...new Set((items||[]).filter(Boolean))];
  const sq=value=>Number(value)*Number(value);

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key=>deepFreeze(value[key]));
    return value;
  }

  async function loadRegistry(){
    if(!registryPromise){
      registryPromise=fetch(REGISTRY_URL,{cache:'no-store'})
        .then(response=>{if(!response.ok)throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${response.status}`);return response.json();})
        .then(registry=>{
          if(registry?.registryKey!=='blacklight.ftl.physical-route-environment-bridge')throw new Error('Invalid physical route environment bridge registry identity.');
          return deepFreeze(registry);
        })
        .catch(error=>{registryPromise=null;throw error;});
    }
    return registryPromise;
  }

  function unresolved(status,reason,registry,physicalEnvironment=null,provenance=[]){
    return deepFreeze({
      schemaVersion:'1.0.0',status,sourceMode:physicalEnvironment?'PHYSICAL_SI':'NONE',
      normalizationProfile:registry?.normalizationProfile||null,
      physicalEnvironment,
      environmentPacket:null,
      uncertaintyPacket:null,
      warnings:[reason],
      provenance:unique([registry?.registryKey,...provenance])
    });
  }

  function requireUncertainty(uncertainty={}){
    const keys=['massFractional1Sigma','ephemerisFractional1Sigma','modelFractional1Sigma','clockFractional1Sigma','sensorFractional1Sigma','registrationFractional1Sigma','commonCauseFractional1Sigma'];
    const missing=keys.filter(key=>!finite(uncertainty[key])||Number(uncertainty[key])<0);
    return {keys,missing};
  }

  function buildUncertaintyPacket(uncertainty,provenance){
    return {
      ephemerisCovariance:sq(uncertainty.ephemerisFractional1Sigma),
      massModelCovariance:sq(uncertainty.massFractional1Sigma),
      clockCovariance:sq(uncertainty.clockFractional1Sigma),
      sensorCovariance:sq(uncertainty.sensorFractional1Sigma),
      registrationCovariance:sq(uncertainty.registrationFractional1Sigma),
      modelCovariance:sq(uncertainty.modelFractional1Sigma),
      commonCauseCovariance:sq(uncertainty.commonCauseFractional1Sigma),
      provenance:unique([...provenance,'DERIVED squared fractional 1-sigma terms used as diagonal covariance proxies'])
    };
  }

  async function resolveFTLPhysicalRouteEnvironment(context={}){
    const registry=context.registry||await loadRegistry();
    const physicalContext=context.physicalEnvironmentContext;
    if(!physicalContext){
      return deepFreeze({
        schemaVersion:'1.0.0',status:STATUS.NOT_SUPPLIED,sourceMode:'NONE',
        normalizationProfile:registry.normalizationProfile,
        physicalEnvironment:null,environmentPacket:null,uncertaintyPacket:null,
        warnings:['No physicalEnvironmentContext supplied; caller may use an explicitly PROPOSED route archetype fallback.'],
        provenance:[registry.registryKey]
      });
    }

    const Curvature=globalThis.BlacklightExoFTLCurvatureEnvironmentRuntime;
    if(!Curvature?.resolveFTLCurvatureEnvironment){
      return unresolved(STATUS.UNRESOLVED,'Physical environment was supplied but the curvature-environment runtime is not loaded; fallback is prohibited.',registry,null,context.provenance);
    }

    const physicalEnvironment=await Curvature.resolveFTLCurvatureEnvironment(physicalContext);
    const physicalProvenance=unique([
      registry.registryKey,
      ...(Array.isArray(context.provenance)?context.provenance:[]),
      ...(Array.isArray(physicalEnvironment?.provenance)?physicalEnvironment.provenance.map(item=>typeof item==='string'?item:JSON.stringify(item)):[])
    ]);

    if(physicalEnvironment?.status==='OUTSIDE_MODEL_VALIDITY'){
      return unresolved(STATUS.OUTSIDE_MODEL_VALIDITY,'Supplied physical environment is outside the validity of the active gravity/curvature model; route certification is blocked.',registry,physicalEnvironment,physicalProvenance);
    }
    if(physicalEnvironment?.status!=='RESOLVED'){
      return unresolved(STATUS.UNRESOLVED,`Supplied physical environment resolved as ${physicalEnvironment?.status||'UNRESOLVED'}; route certification requires a fully valid physical packet.`,registry,physicalEnvironment,physicalProvenance);
    }

    const metrics=physicalEnvironment.metrics||{};
    const refs=registry.normalizationProfile?.referenceScales||{};
    const requiredMetrics=[
      ['dimensionlessPotentialDepth','dimensionlessPotentialDepth'],
      ['accelerationMagnitudeMPerS2','accelerationMPerS2'],
      ['tidalFrobeniusPerS2','tidalFrobeniusPerS2'],
      ['maxSingleSourceCurvatureScalePerM2','curvatureScalePerM2']
    ];
    for(const [metric,reference] of requiredMetrics){
      if(!finite(metrics[metric])||!finite(refs[reference])||Number(refs[reference])<=0){
        return unresolved(STATUS.UNRESOLVED,`Physical normalization is missing ${metric} or positive reference scale ${reference}.`,registry,physicalEnvironment,physicalProvenance);
      }
    }

    const uncertainty=physicalEnvironment.uncertainty||physicalContext.uncertainty||{};
    const contract=requireUncertainty(uncertainty);
    if(contract.missing.length){
      return unresolved(STATUS.UNRESOLVED,`Physical environment lacks bounded uncertainty required for certification: ${contract.missing.join(', ')}. Missing uncertainty is not zero.`,registry,physicalEnvironment,physicalProvenance);
    }

    const massModelSigma=Math.sqrt(
      sq(uncertainty.massFractional1Sigma)+
      sq(uncertainty.ephemerisFractional1Sigma)+
      sq(uncertainty.modelFractional1Sigma)
    );
    const hiddenMassProbability=finite(uncertainty.hiddenMassProbability)?Math.max(0,Math.min(1,Number(uncertainty.hiddenMassProbability))):null;
    const familyBoundaryHazard=finite(context.familyBoundaryHazard)?Math.max(0,Number(context.familyBoundaryHazard)):0;

    const environmentPacket={
      epoch:context.epoch||physicalContext.epoch||'PHYSICAL_SI_ENVIRONMENT',
      potentialMagnitude:Math.abs(Number(metrics.dimensionlessPotentialDepth))/Number(refs.dimensionlessPotentialDepth),
      accelerationMagnitude:Math.abs(Number(metrics.accelerationMagnitudeMPerS2))/Number(refs.accelerationMPerS2),
      tidalTensorNorm:Math.abs(Number(metrics.tidalFrobeniusPerS2))/Number(refs.tidalFrobeniusPerS2),
      curvatureNorm:Math.abs(Number(metrics.maxSingleSourceCurvatureScalePerM2))/Number(refs.curvatureScalePerM2),
      massModelUncertainty:massModelSigma/Number(refs.massModelFractional1Sigma),
      hiddenMassProbability,
      familyBoundaryHazard,
      provenance:unique([
        registry.registryKey,
        `${registry.normalizationProfile.profileId}@${registry.normalizationProfile.profileVersion}`,
        'PHYSICAL_SI inputs normalized before fictional family response'
      ])
    };

    const uncertaintyPacket=buildUncertaintyPacket(uncertainty,environmentPacket.provenance);
    const warnings=[
      'Physical gravity/curvature values are real-physics environmental inputs; family response remains fictional/derived.',
      'Normalization reference scales are PROPOSED engineering calibration, not constants of nature.',
      'maxSingleSourceCurvatureScalePerM2 is a Schwarzschild-reference diagnostic, not an exact multi-body curvature invariant.'
    ];
    if(hiddenMassProbability===null)warnings.push('hiddenMassProbability is unresolved; it is not converted to zero.');

    return deepFreeze({
      schemaVersion:'1.0.0',status:STATUS.READY,sourceMode:'PHYSICAL_SI',
      normalizationProfile:registry.normalizationProfile,
      physicalEnvironment,
      environmentPacket,
      uncertaintyPacket,
      warnings,
      provenance:physicalProvenance
    });
  }

  globalThis.BlacklightExoFTLPhysicalRouteEnvironmentRuntime=deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLPhysicalRouteEnvironment});
})();
