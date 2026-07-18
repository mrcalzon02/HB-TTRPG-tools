(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  const D=globalThis.BlacklightExoVesselTechnologyBasisDefinitions;
  if(!base?.moduleGraphVersion||!base?.technologyBasisVersion||!D||base.moduleMethodologyVersion)return;
  const clone=value=>value==null?value:structuredClone(value);
  const unique=values=>[...new Set(values.filter(Boolean))];
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const slug=(value,fallback='method')=>(String(value||fallback).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,58)||fallback);

  function principalTheory(module,basis){
    const type=module.semanticType,theories=basis.operativeTheories;
    if(type==='LIFE_SUPPORT')return theories.atmosphereRegulation;
    if(type==='THERMAL_CONTROL'||type==='WEAPON_COOLING')return theories.thermalManagement;
    if(type==='SENSOR')return theories.sensing;
    if(['NAVIGATION','FIRE_CONTROL','ELECTRONIC_WARFARE'].includes(type))return theories.control;
    if(['STRUCTURE','DRIVE_INTEGRATION'].includes(type))return theories.joining;
    if(type==='REACTOR')return theories.energyGeneration;
    if(type==='ENERGY_STORAGE')return theories.energyDistribution;
    if(type==='MAINTENANCE')return `${theories.control}; service through ${basis.standards.maintenanceEnvironment}`;
    return theories.actuation;
  }

  function routeKeys(module){
    const keys=['structural'];
    for(const key of ['power','cooling','data','atmosphere','access'])if(module.requirements?.[key])keys.push(key);
    return unique(keys);
  }

  function operativeMethodology(module,basis){
    const interfaces=routeKeys(module).map(key=>({routeKey:key,endEffect:basis.routeStandards[key].endEffect,endEffectInvariant:true,carrier:basis.routeStandards[key].carrier,interface:basis.routeStandards[key].interface,tolerance:basis.routeStandards[key].tolerance,secondaryInfluence:basis.routeStandards[key].secondaryInfluence}));
    const pressureBoundary=module.envelope==='INTERNAL'||module.requirements?.atmosphere;
    const hazardFailureModes=(module.hazards||[]).map(item=>`hazard interaction: ${item.toLowerCase().replaceAll('_',' ')}`);
    return{
      recordType:'exoVesselModuleMethodology',schemaVersion:'1.0.0',methodologyId:`method-${slug(module.moduleId)}-${hash(`${module.moduleId}:${basis.basisId}`).toString(16).padStart(8,'0')}`,
      basisId:basis.basisId,primaryBasisKey:basis.primaryBasisKey,secondaryBasisKey:basis.secondaryBasisKey,hybridizationFraction:basis.hybridizationFraction,
      endEffect:D.subsystemEndEffects[module.semanticType]||`Produce the ${module.semanticType.replaceAll('_',' ').toLowerCase()} end effect.`,operativeTheory:principalTheory(module,basis),controlMethod:basis.operativeTheories.control,actuationMethod:basis.operativeTheories.actuation,thermalMethod:basis.operativeTheories.thermalManagement,atmosphereMethod:basis.operativeTheories.atmosphereRegulation,
      routeInterfaces:interfaces,
      installation:{serviceEnvironment:basis.standards.maintenanceEnvironment,commissioningEnvironment:basis.standards.commissioningEnvironment,connectorFamily:basis.standards.connectorFamily,orientationSensitivity:basis.standards.orientationSensitivity,pressureCompatibility:basis.standards.pressureCompatibility,immersionCompatibility:basis.standards.immersionCompatibility,serviceClearanceMultiplier:basis.standards.clearanceMultiplier,boundaryMethod:pressureBoundary?basis.operativeTheories.sealing:'No inhabited-medium boundary required beyond local equipment containment.',joiningMethod:basis.operativeTheories.joining,insulationOrIsolationMethod:basis.operativeTheories.insulation},
      materials:{preferred:basis.materials.preferred.slice(0,6),sealants:pressureBoundary?basis.materials.sealants.slice(0,4):[],forbidden:basis.materials.forbidden.slice(0,6)},
      failureModes:unique([...basis.failureModes,...hazardFailureModes]).slice(0,12),
      interoperability:{humanInteroperability:basis.interoperability.humanInteroperability,adapterPolicy:basis.interoperability.adapterPolicy,conversionInterfaces:clone(basis.interoperability.conversionInterfaces),sameEndEffectDoesNotImplyDirectCompatibility:true},
      layoutAssumptions:{methodologySpecificMassVolumeRecalculationStatus:'DERIVED_REQUIREMENTS_ONLY',note:'Existing VESSEL-02 mass and VESSEL-04 volume remain the current closed reference. This record supplies methodology-specific orientation, clearance, chemistry, carrier, boundary, and service constraints for later methodology-aware packing and balance passes.'},
      provenance:{sourceTechnologyBasisId:basis.basisId,sourceModuleId:module.moduleId,generatorId:'blacklight-exo-vessel-module-methodology-generator',generatorVersion:'1.0.0'}
    };
  }

  function edgeRoute(graphName){return({structural:'structural',power:'power',cooling:'cooling',data:'data',atmosphere:'atmosphere',access:'access',magazineFeed:'access',sensorDependency:'data'})[graphName]||null;}
  function apply(seed,input,source,result){
    if(result.moduleGraph?.modules?.length&&result.moduleGraph.modules.every(module=>module.extensions?.operativeMethodology?.schemaVersion==='1.0.0'))return result;
    const basis=result.technologyBasis||result.manufacturer?.technologyBasis;if(!basis?.validation?.valid)throw new Error('VESSEL technology basis must be valid before module methodology can be applied.');
    if(!result.moduleGraph?.modules?.length)throw new Error('VESSEL module methodology requires a generated semantic module graph.');
    let routeInterfaceCount=0;
    for(const module of result.moduleGraph.modules){const methodology=operativeMethodology(module,basis);module.extensions={...(module.extensions||{}),operativeMethodology:methodology};routeInterfaceCount+=methodology.routeInterfaces.length;}
    for(const [graphName,graph] of Object.entries(result.moduleGraph.graphs||{})){
      const routeKey=edgeRoute(graphName);if(!routeKey)continue;const standard=basis.routeStandards[routeKey];
      for(const edge of graph.edges||[])edge.implementation={technologyBasisId:basis.basisId,routeKey,endEffect:standard.endEffect,carrier:standard.carrier,interface:standard.interface,tolerance:standard.tolerance,endEffectInvariant:true};
    }
    for(const zone of result.moduleGraph.pressureZones||[])zone.boundaryMethodology={technologyBasisId:basis.basisId,sealingMethod:basis.operativeTheories.sealing,atmosphereRegulation:basis.operativeTheories.atmosphereRegulation,compatibleMaterials:basis.materials.preferred.slice(0,4),sealants:basis.materials.sealants.slice(0,3),serviceEnvironment:basis.standards.maintenanceEnvironment};
    const moduleApplication={schemaVersion:'1.0.0',moduleCount:result.moduleGraph.modules.length,routeInterfaceCount,pressureZoneCount:result.moduleGraph.pressureZones.length,methodologySpecificMassVolumeRecalculationStatus:'DEFERRED_CLOSED_REFERENCE_RETAINED',distinctEndEffects:unique(result.moduleGraph.modules.map(module=>module.extensions.operativeMethodology.endEffect)).length,distinctOperativeTheories:unique(result.moduleGraph.modules.map(module=>module.extensions.operativeMethodology.operativeTheory)).length};
    result.technologyBasis={...result.technologyBasis,moduleApplication};if(result.manufacturer?.technologyBasis)result.manufacturer.technologyBasis=clone(result.technologyBasis);
    result.modules=result.moduleGraph.modules;
    if(result.contract){result.contract.provenance={...result.contract.provenance,technologyBasisVersion:'1.0.0',moduleMethodologyVersion:'1.0.0'};result.contract.extensions={...result.contract.extensions,technologyBasisSchema:'data/schemas/exo-vessel-technology-basis.schema.json'};}
    result.warnings=[...(result.warnings||[]),`Species-derived operative methodology was applied to ${moduleApplication.moduleCount} modules and ${moduleApplication.routeInterfaceCount} invariant route interfaces. The power graph still delivers usable energy, the atmosphere graph still regulates the inhabited medium, and the remaining graphs retain their end effects, but their carriers, connectors, tolerances, actuation, control, boundaries, materials, and service environments now follow ${basis.primaryLabel}.`,`Methodology-specific mass and packed-volume multipliers are recorded as requirements but have not been allowed to silently break the existing closed VESSEL-02 and VESSEL-04 reference ledgers.`];
    return result;
  }
  function generate(seed,input={},source=null){const value=String(seed||input.seed||'vessel');return apply(value,input,source,base.generate(value,input,source));}
  function migrateRecord(record,input={},source=null){const value=String(record?.seed||input.seed||'vessel'),migrated=base.migrateRecord?base.migrateRecord(record,input,source):record;return apply(value,input,source,migrated);}
  globalThis.BlacklightExoVessel=Object.freeze({...base,moduleMethodologyVersion:1,moduleMethodologySchemaVersion:'1.0.0',generate,migrateRecord});
})();
