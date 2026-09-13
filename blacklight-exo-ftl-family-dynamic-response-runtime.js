(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/exo-vessel/ftl-family-dynamic-response-registry.json'));
  } else {
    root.BlacklightExoFTLFamilyDynamicResponseRuntime = factory(root.BLACKLIGHT_FTL_FAMILY_DYNAMIC_RESPONSE_REGISTRY || null);
  }
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const STATUS = Object.freeze({PASS:'PASS', CONDITIONAL:'CONDITIONAL', BLOCK:'BLOCK', UNRESOLVED:'UNRESOLVED', CONFLICT:'CONFLICT', SIMULATION_ONLY:'SIMULATION_ONLY'});
  const STAGES = Object.freeze(['sensor','solver','decision','command','actuate','exit','clear','margin']);
  const unique = (xs) => Array.from(new Set((xs || []).filter((x) => x !== null && x !== undefined && x !== '')));
  const finiteNN = (x) => Number.isFinite(Number(x)) && Number(x) >= 0;
  const finitePositive = (x) => Number.isFinite(Number(x)) && Number(x) > 0;

  function canonicalFamily(value) {
    if (!value) return null;
    const key = String(value).trim().toLowerCase();
    return registry?.familyMap?.[key] || null;
  }

  function profileFor(family) {
    const canonical = canonicalFamily(family);
    return canonical ? (registry?.familyProfiles?.[canonical] || null) : null;
  }

  function evidenceFor(context, key) {
    const source = context.familyEvidence || context.responseEvidence || {};
    return source[key] !== undefined ? source[key] : context[key];
  }

  function explicit(stage, context, provenance) {
    const map = context.explicitStageUpperSeconds || {};
    if (!finiteNN(map[stage])) return null;
    return {model:'explicitFamilyResponse', upperTimeSeconds:Number(map[stage]), provenance:unique([...(provenance||[]), 'explicitStageUpperSeconds.'+stage])};
  }

  function networkCommand(context, provenance) {
    const current = evidenceFor(context,'currentPathDelaySeconds');
    const certified = evidenceFor(context,'certifiedPathDelaySeconds');
    if (current === undefined && certified === undefined) return null;
    return {
      model:'networkPath',
      currentPathDelaySeconds: current,
      certifiedPathDelaySeconds: certified,
      provenance:unique([...(provenance||[]),'familyEvidence.commandPath'])
    };
  }

  function energyModel(context, prefix, provenance) {
    const e = evidenceFor(context,prefix+'RequiredEnergyJ');
    const p = evidenceFor(context,prefix+'AvailableNetPowerW');
    if (e === undefined && p === undefined) return null;
    return {model:'energyLimitedRamp', requiredEnergyJ:e, availableNetPowerW:p, provenance:unique([...(provenance||[]),'familyEvidence.'+prefix+'Energy'])};
  }

  function slewModel(context, prefix, provenance) {
    const dq = evidenceFor(context,prefix+'RequiredStateChange');
    const rate = evidenceFor(context,prefix+'AvailableSlewRatePerSecond');
    if (dq === undefined && rate === undefined) return null;
    return {model:'slewLimited', requiredStateChange:dq, availableSlewRatePerSecond:rate, provenance:unique([...(provenance||[]),'familyEvidence.'+prefix+'Slew'])};
  }

  function translationModel(context, provenance) {
    const mass = evidenceFor(context,'massKg');
    const dv = evidenceFor(context,'requiredDeltaVMps');
    const force = evidenceFor(context,'availableForceN');
    if (mass === undefined && dv === undefined && force === undefined) return null;
    return {model:'forceLimitedTranslation', massKg:mass, requiredDeltaVMps:dv, availableForceN:force, provenance:unique([...(provenance||[]),'familyEvidence.translationImpulse'])};
  }

  function rotationModel(context, provenance) {
    const inertia = evidenceFor(context,'momentOfInertiaKgM2');
    const dw = evidenceFor(context,'requiredDeltaOmegaRadS');
    const torque = evidenceFor(context,'availableTorqueNm');
    if (inertia === undefined && dw === undefined && torque === undefined) return null;
    return {model:'torqueLimitedRotation', momentOfInertiaKgM2:inertia, requiredDeltaOmegaRadS:dw, availableTorqueNm:torque, provenance:unique([...(provenance||[]),'familyEvidence.rotationImpulse'])};
  }

  function pushModel(stageModels, stage, model) {
    if (!model) return;
    if (!stageModels[stage]) stageModels[stage] = [];
    stageModels[stage].push(model);
  }

  function buildFamilyModels(family, context, profile, provenance) {
    const stageModels = {};
    for (const stage of STAGES) pushModel(stageModels, stage, explicit(stage,context,provenance));
    pushModel(stageModels,'command',networkCommand(context,provenance));

    if (family === 'inertial-torch') {
      pushModel(stageModels,'actuate',slewModel(context,'thrustVector',provenance));
      pushModel(stageModels,'actuate',rotationModel(context,provenance));
      pushModel(stageModels,'exit',translationModel(context,provenance));
    } else if (family === 'metric-compression') {
      pushModel(stageModels,'actuate',slewModel(context,'fieldSector',provenance));
      pushModel(stageModels,'exit',energyModel(context,'fieldUnwind',provenance));
    } else if (family === 'gravitational-plane') {
      pushModel(stageModels,'actuate',slewModel(context,'couplingVector',provenance));
      pushModel(stageModels,'exit',energyModel(context,'planeRelease',provenance));
    } else if (family === 'slipstream-shear') {
      pushModel(stageModels,'actuate',slewModel(context,'adhesion',provenance));
      pushModel(stageModels,'exit',energyModel(context,'detachment',provenance));
    } else if (family === 'q-lattice') {
      pushModel(stageModels,'actuate',slewModel(context,'transitionHalt',provenance));
      pushModel(stageModels,'exit',energyModel(context,'transitionIsolation',provenance));
    } else if (family === 'n-manifold') {
      pushModel(stageModels,'actuate',slewModel(context,'embedding',provenance));
      pushModel(stageModels,'exit',energyModel(context,'embeddingUnwind',provenance));
    } else if (family === 'fold-jump') {
      pushModel(stageModels,'actuate',slewModel(context,'closure',provenance));
      pushModel(stageModels,'exit',energyModel(context,'foldAbort',provenance));
    } else if (family === 'phase-displacement') {
      pushModel(stageModels,'actuate',slewModel(context,'displacement',provenance));
      pushModel(stageModels,'exit',energyModel(context,'reconciliation',provenance));
    } else if (family === 'wormhole-gate') {
      pushModel(stageModels,'actuate',slewModel(context,'aperture',provenance));
      pushModel(stageModels,'exit',energyModel(context,'gateClosure',provenance));
    }

    for (const stage of Object.keys(stageModels)) {
      if (!stageModels[stage].length) delete stageModels[stage];
      else if (stageModels[stage].length === 1) stageModels[stage] = stageModels[stage][0];
    }
    return stageModels;
  }

  function validateFamilyEvidence(family, context, stageModels) {
    const unresolved = [];
    const required = new Set(context.requiredFamilyResponseEvidence || []);
    const suppliedPrefixes = {
      'inertial-torch':['translationImpulse','thrustVectorSlew'],
      'metric-compression':['fieldUnwindEnergy','fieldSectorSlew'],
      'gravitational-plane':['planeReleaseEnergy','couplingVectorSlew'],
      'slipstream-shear':['detachmentEnergy','adhesionSlew'],
      'q-lattice':['transitionHaltSlew','transitionIsolationEnergy'],
      'n-manifold':['embeddingSlew','embeddingUnwindEnergy'],
      'fold-jump':['closureSlew','foldAbortEnergy'],
      'phase-displacement':['displacementSlew','reconciliationEnergy'],
      'wormhole-gate':['apertureSlew','gateClosureEnergy']
    };
    for (const key of required) {
      if (!(suppliedPrefixes[family] || []).includes(key) && key !== 'commandPath' && !STAGES.includes(key)) unresolved.push('UNKNOWN_REQUIRED_EVIDENCE:'+key);
    }
    for (const key of required) {
      if (STAGES.includes(key)) {
        if (!stageModels[key]) unresolved.push('REQUIRED_STAGE_MODEL_MISSING:'+key);
      } else if (key === 'commandPath') {
        if (!stageModels.command) unresolved.push('REQUIRED_COMMAND_PATH_EVIDENCE_MISSING');
      } else if ((suppliedPrefixes[family] || []).includes(key)) {
        const flat = JSON.stringify(stageModels);
        const token = key.replace(/Energy$/,'').replace(/Slew$/,'');
        if (!flat.toLowerCase().includes(token.toLowerCase())) unresolved.push('REQUIRED_FAMILY_EVIDENCE_MISSING:'+key);
      }
    }
    return unresolved;
  }

  function resolveFTLFamilyDynamicResponse(context) {
    context = context || {};
    const requestedFamily = context.family || context.request?.family || context.routeSafetyPacket?.family || null;
    const family = canonicalFamily(requestedFamily);
    if (!requestedFamily) return {schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,family:null,horizonMode:null,responseConcept:null,technologyBasis:context.technologyBasis||null,stageModels:{},selectedEvidence:{},familyProfile:null,unresolvedRequirements:['FAMILY_REQUIRED'],warnings:['Transit family is required; species or machinery style will not be used to infer one.'],simulationOnly:context.simulationOnly===true,provenance:unique(['blacklight.ftl.family-dynamic-response@1.0.0',...(context.provenance||[])]),dynamicEscapeContext:{family:null,stageModels:{},requiredStages:context.requiredStages||[],simulationOnly:context.simulationOnly===true,provenance:unique(context.provenance||[])}};
    if (!family) return {schemaVersion:'1.0.0',status:STATUS.CONFLICT,family:null,horizonMode:null,responseConcept:null,technologyBasis:context.technologyBasis||null,stageModels:{},selectedEvidence:{},familyProfile:null,unresolvedRequirements:['UNKNOWN_FAMILY:'+requestedFamily],warnings:['Family alias is not present in the authoritative family map.'],simulationOnly:context.simulationOnly===true,provenance:unique(['blacklight.ftl.family-dynamic-response@1.0.0',...(context.provenance||[])]),dynamicEscapeContext:{family:null,stageModels:{},requiredStages:context.requiredStages||[],simulationOnly:context.simulationOnly===true,provenance:unique(context.provenance||[])}};

    const profile = profileFor(family);
    if (!profile) return {schemaVersion:'1.0.0',status:STATUS.CONFLICT,family,horizonMode:null,responseConcept:null,technologyBasis:context.technologyBasis||null,stageModels:{},selectedEvidence:{},familyProfile:null,unresolvedRequirements:['FAMILY_PROFILE_MISSING:'+family],warnings:['Canonical family has no family-response profile.'],simulationOnly:context.simulationOnly===true,provenance:unique(['blacklight.ftl.family-dynamic-response@1.0.0',...(context.provenance||[])]),dynamicEscapeContext:{family,stageModels:{},requiredStages:context.requiredStages||[],simulationOnly:context.simulationOnly===true,provenance:unique(context.provenance||[])}};

    const provenance = unique(['blacklight.ftl.family-dynamic-response@1.0.0',...(context.provenance||[])]);
    const stageModels = buildFamilyModels(family,context,profile,provenance);
    const unresolvedRequirements = validateFamilyEvidence(family,context,stageModels);
    let status = unresolvedRequirements.length ? STATUS.UNRESOLVED : STATUS.PASS;
    if (context.simulationOnly === true && status === STATUS.PASS) status = STATUS.SIMULATION_ONLY;

    const warnings = unique([
      unresolvedRequirements.length ? 'Required family-response evidence is unresolved.' : null,
      'Family response supplies machinery-specific stage models only; the generic dynamic escape envelope remains responsible for combining them with certified baseline timing and reserve horizons.',
      profile.horizonMode !== 'CONTINUOUS_PROJECTED_PROGRESS' ? 'This family does not receive a fabricated continuous projected hull velocity for abort timing.' : null,
      context.technologyBasis === 'arnock' ? "Ar'nock realization remains solid-state electromechanical modular; piezoelectric machinery evidence is not family-state sensing without explicit authority." : null,
      context.technologyBasis === 'zwlei-murrek' ? "Mur'rek source term gravitic slipstream does not select gravitational-plane or slipstream-shear family identity." : null
    ]);

    const dynamicEscapeContext = {
      family,
      technologyBasis:context.technologyBasis||null,
      installationId:context.installationId||null,
      installationSafetyTiming:context.installationSafetyTiming||context.timingPacket||null,
      stageModels,
      requiredStages:context.requiredStages||STAGES,
      protectedEnergyJ:context.protectedEnergyJ,
      emergencyLoadW:context.emergencyLoadW,
      protectedGenerationW:context.protectedGenerationW,
      requireEnergyReserve:context.requireEnergyReserve===true,
      thermalCapacitanceJK:context.thermalCapacitanceJK,
      temperatureLimitK:context.temperatureLimitK,
      temperatureInitialK:context.temperatureInitialK,
      heatGenerationW:context.heatGenerationW,
      heatRejectionW:context.heatRejectionW,
      requireThermalReserve:context.requireThermalReserve===true,
      advisoryReserveSeconds:context.advisoryReserveSeconds,
      operatingEnvelopePacket:context.operatingEnvelopePacket||null,
      maintenanceEvidencePacket:context.maintenanceEvidencePacket||null,
      simulationOnly:context.simulationOnly===true,
      provenance
    };

    return {
      schemaVersion:'1.0.0',
      status,
      family,
      horizonMode:profile.horizonMode,
      responseConcept:profile.responseConcept,
      technologyBasis:context.technologyBasis||null,
      stageModels,
      selectedEvidence:context.familyEvidence||context.responseEvidence||{},
      familyProfile:profile,
      unresolvedRequirements,
      warnings,
      simulationOnly:context.simulationOnly===true,
      provenance,
      dynamicEscapeContext
    };
  }

  return {STATUS,STAGES,canonicalFamily,profileFor,resolveFTLFamilyDynamicResponse,registry:registry||null};
}));