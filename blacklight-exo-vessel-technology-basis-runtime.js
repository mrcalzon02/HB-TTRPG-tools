(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  const previous=globalThis.BlacklightExoVesselManufacturerGenerator;
  const D=globalThis.BlacklightExoVesselTechnologyBasisDefinitions;
  if(!base?.manufacturerVersion||!previous||!D||base.technologyBasisVersion)return;

  const clone=value=>value==null?value:structuredClone(value);
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,finite(value)));
  const dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit=value=>hash(value)/4294967295;
  const slug=(value,fallback='basis')=>(String(value||fallback).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,58)||fallback);
  const unique=values=>[...new Set(values.filter(Boolean))];
  const dossier=source=>source?.dossier||source?.biology||null;

  function sourceText(result,source){
    const d=dossier(source),species=d?.species||{},civilization=d?.civilization||{},system=d?.system||{},profile=result.lifeSupport?.profile||{};
    return [species.name,species.commonName,species.environment,species.bodyPlan,species.chemistry,species.adaptation,species.cognition,species.communication,(species.senses||[]).join(' '),civilization.technology,civilization.government,civilization.economy,civilization.warfare,(civilization.values||[]).join(' '),system.life,system.state,system.economy,profile.sourceSpecies,profile.sourceEnvironment,profile.sourceChemistry,profile.sourceBodyPlan,profile.key].filter(Boolean).join(' ');
  }

  function rawScores(result,source,manufacturer){
    const text=sourceText(result,source),lower=text.toLowerCase(),hasAlien=Boolean(dossier(source)?.species||result.lifeSupport?.profile?.sourceSpecies),scores=Object.fromEntries(Object.keys(D.families).map(key=>[key,0]));
    for(const family of Object.values(D.families))for(const pattern of family.patterns)if(pattern.test(text))scores[family.key]+=10;
    if(!hasAlien)scores[D.humanBasisKey]+=30;
    if(/human|terrestrial|earthlike|oxygen-water|carbon-water/.test(lower))scores.TERRESTRIAL_ELECTROMECHANICAL+=18;
    if(/aquatic|global ocean|oceanic|underwater|liquid habitat/.test(lower))scores.AQUATIC_ELECTROCHEMICAL_HYDRAULIC+=18;
    if(/ammonia|freon|fluorocarbon|halocarbon|cryogenic|cryosphere|methane|hydrocarbon|icebound/.test(lower))scores.CRYOGENIC_AMMONIA_HALOCARBON+=18;
    if(/gas giant|floating|buoyant|cloud layer|aerostat|dense atmosphere|high-pressure gas/.test(lower))scores.GAS_GIANT_FLUIDIC_ELECTROSTATIC+=24;
    if(/biotech|biological technology|symbiotic|grown vessel|living ship|engineered organism|regeneration/.test(lower))scores.BIOLOGICAL_SYMBIOTIC+=20;
    if(/mineral metabolism|silicon-organic|crystal|crystalline|lithic|piezoelectric|geological/.test(lower))scores.MINERAL_PIEZOELECTRIC_PHOTONIC+=20;
    if(/post-material|adaptive matter|field-mediated|metamaterial|self-assembling|machine intelligence/.test(lower))scores.FIELD_MEDIATED_POSTMATERIAL+=22;
    const rank=Math.max(0,Math.min(6,Math.round(finite(result.drive?.pathLevelRank,4))));
    if(rank>=5)scores.FIELD_MEDIATED_POSTMATERIAL+=4+(rank-5)*3;
    const focus=manufacturer?.archetype?.focusKey;
    if(focus==='PRECISION'){scores.MINERAL_PIEZOELECTRIC_PHOTONIC+=4;scores.FIELD_MEDIATED_POSTMATERIAL+=5;}
    if(focus==='MODULAR')scores.TERRESTRIAL_ELECTROMECHANICAL+=3;
    if(focus==='CONTINUITY'){scores.CRYOGENIC_AMMONIA_HALOCARBON+=2;scores.BIOLOGICAL_SYMBIOTIC+=2;}
    if(focus==='FRONTIER'){scores.AQUATIC_ELECTROCHEMICAL_HYDRAULIC+=2;scores.GAS_GIANT_FLUIDIC_ELECTROSTATIC+=2;}
    for(const key of Object.keys(scores))scores[key]+=unit(`${manufacturer?.manufacturerId||result.seed}:technology-basis:${key}`)*.01;
    return{text,scores};
  }

  function chooseBasis(input,result,source,manufacturer){
    const override=String(input.technologyBasisOverride||dom('exo-vessel-technology-basis')||'INHERIT').toUpperCase();
    const {text,scores}=rawScores(result,source,manufacturer);
    if(override!=='INHERIT'){
      if(!D.families[override])throw new Error(`Unknown operative technology basis ${override}.`);
      scores[override]=Math.max(...Object.values(scores))+100;
    }
    const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const primaryKey=ranked[0][1]>0?ranked[0][0]:D.humanBasisKey,secondaryKey=ranked.find(([key])=>key!==primaryKey)?.[0]||D.humanBasisKey;
    const primaryScore=Math.max(.001,ranked.find(([key])=>key===primaryKey)?.[1]||1),secondaryScore=Math.max(0,ranked.find(([key])=>key===secondaryKey)?.[1]||0),rank=Math.max(0,Math.min(6,Math.round(finite(result.drive?.pathLevelRank,4))));
    const hybridizationFraction=clamp((secondaryScore/(primaryScore+secondaryScore||1))*(.34+rank*.035),0,.42);
    return{primaryKey,secondaryKey,hybridizationFraction,text,scores,override};
  }

  function compatibility(primary){
    if(primary.humanCompatibility==='NATIVE')return{humanInteroperability:'DIRECT',adapterPolicy:'Human terrestrial tools, connectors, service chemistry, and safety assumptions are natively applicable.',conversionInterfaces:[]};
    if(primary.humanCompatibility==='ADAPTER_REQUIRED')return{humanInteroperability:'ADAPTER_REQUIRED',adapterPolicy:'Function can be translated, but direct connection risks incorrect carrier, chemistry, pressure, reference potential, contamination, or control semantics.',conversionInterfaces:['energy-carrier converter','control and protocol translator','material and chemistry isolation barrier','mechanical and pressure adapter','service-environment transition lock']};
    return{humanInteroperability:'HOSTILE_WITHOUT_CONVERSION',adapterPolicy:'Direct human connection is unsafe or nonfunctional. A dedicated conversion bay must terminate the native system before presenting terrestrial-compatible energy, data, fluid, atmosphere, access, or structural interfaces.',conversionInterfaces:['fully isolated energy conversion stage','authenticated control-state translator','double boundary and chemistry isolation','pressure and temperature transition plant','remote maintenance or compatible environmental lock']};
  }

  function build(seed,input,result,source,manufacturer){
    const selection=chooseBasis(input,result,source,manufacturer),primary=D.families[selection.primaryKey],secondary=D.families[selection.secondaryKey],d=dossier(source),species=d?.species||{},civilization=d?.civilization||{},compat=compatibility(primary);
    const routeStandards={};
    for(const [key,effect] of Object.entries(D.routeEffects)){
      routeStandards[key]={routeKey:key,endEffect:effect,invariantRouteRequirement:true,carrier:primary.routes[key].carrier,interface:primary.routes[key].interface,tolerance:primary.routes[key].tolerance,secondaryInfluence:selection.hybridizationFraction>.08?secondary.routes[key].carrier:null};
    }
    const focus=manufacturer.archetype.focusKey,useSecondaryControl=selection.hybridizationFraction>.12&&(focus==='PRECISION'||focus==='MODULAR');
    const operativeTheories={...clone(primary.theories),control:useSecondaryControl?secondary.theories.control:primary.theories.control};
    const materials={preferred:unique([...manufacturer.materials,...primary.materials.preferred,...secondary.materials.preferred.slice(0,selection.hybridizationFraction>.18?2:0)]),sealants:unique([...primary.materials.sealants,...secondary.materials.sealants.slice(0,selection.hybridizationFraction>.18?1:0)]),forbidden:unique([...primary.materials.forbidden,...secondary.materials.forbidden])};
    const connectorToken=manufacturer.namingGrammar.designationPrefix;
    const record={
      recordType:'exoVesselTechnologyBasis',schemaVersion:'1.0.0',basisId:`techbasis-${slug(manufacturer.manufacturerId)}-${hash(`${manufacturer.manufacturerId}:${selection.primaryKey}:${selection.secondaryKey}`).toString(16).padStart(8,'0')}`,
      manufacturerId:manufacturer.manufacturerId,speciesId:manufacturer.speciesId,organizationId:manufacturer.organizationId,primaryBasisKey:selection.primaryKey,primaryLabel:primary.label,secondaryBasisKey:selection.secondaryKey,secondaryLabel:secondary.label,hybridizationFraction:selection.hybridizationFraction,
      summary:selection.hybridizationFraction>.08?`${primary.summary} Secondary ${secondary.label.toLowerCase()} methods influence selected control, materials, interfaces, or maintenance practice.`:primary.summary,
      origin:{sourceSpecies:manufacturer.provenance.sourceSpecies,sourceOrganization:manufacturer.provenance.sourceOrganization,sourceEnvironment:species.environment||result.lifeSupport?.profile?.sourceEnvironment||null,sourceChemistry:species.chemistry||result.lifeSupport?.profile?.sourceChemistry||null,sourceBodyPlan:species.bodyPlan||result.lifeSupport?.profile?.sourceBodyPlan||null,civilizationTechnology:civilization.technology||null,inferenceText:selection.text||'No inherited species or civilization dossier was supplied.',explicitOverride:selection.override!=='INHERIT'},
      routeStandards,operativeTheories,materials,
      standards:{connectorFamily:`${connectorToken}-${slug(selection.primaryKey).toUpperCase()} native interface family`,controlReference:operativeTheories.control,energyReference:primary.routes.power.tolerance,boundaryPractice:operativeTheories.sealing,joiningPractice:operativeTheories.joining,maintenanceEnvironment:primary.installation.serviceEnvironment,commissioningEnvironment:primary.installation.commissioningEnvironment,clearanceMultiplier:primary.installation.clearanceMultiplier,orientationSensitivity:primary.installation.orientationSensitivity,pressureCompatibility:primary.installation.pressureCompatibility,immersionCompatibility:primary.installation.immersionCompatibility},
      failureModes:unique([...primary.failureModes,...secondary.failureModes.slice(0,selection.hybridizationFraction>.18?2:0)]),
      interoperability:{...compat,nativeCompatibilityTags:[selection.primaryKey,manufacturer.speciesId,manufacturer.organizationId,manufacturer.baseTechnologyBand],sameEndEffectsDoNotImplyDirectCompatibility:true},
      provenance:{sourceSpeciesSeed:manufacturer.provenance.speciesSeed,sourceOrganizationSeed:manufacturer.provenance.organizationSeed,sourceManufacturerSeed:manufacturer.provenance.manufacturerSeed,generatorId:'blacklight-exo-vessel-technology-basis-generator',generatorVersion:'1.0.0'},
      validation:{valid:true,violations:[]}
    };
    const violations=[];
    if(Object.keys(record.routeStandards).sort().join(',')!==Object.keys(D.routeEffects).sort().join(','))violations.push('Technology basis does not preserve every invariant route semantic.');
    if(!D.families[record.primaryBasisKey]||!D.families[record.secondaryBasisKey])violations.push('Technology basis references an unknown operative family.');
    if(record.hybridizationFraction<0||record.hybridizationFraction>.42)violations.push('Hybridization escaped the permitted range.');
    if(!record.materials.preferred.length||!record.materials.sealants.length)violations.push('Technology basis lacks compatible materials or boundary methods.');
    for(const route of Object.values(record.routeStandards))if(!route.carrier||!route.interface||!route.tolerance||!route.invariantRouteRequirement)violations.push(`${route.routeKey} lacks a complete carrier, interface, tolerance, or invariant marker.`);
    record.validation={valid:!violations.length,violations};
    return record;
  }

  function enrichManufacturer(seed,input,result,source,manufacturer){
    const output=clone(manufacturer),basis=build(seed,input,result,source,output);output.technologyBasis=basis;output.signatureTraits=unique([...output.signatureTraits,basis.primaryLabel,basis.standards.connectorFamily]).slice(0,8);output.doctrine={...output.doctrine,operativeTechnology:`${basis.primaryLabel}; ${Math.round(basis.hybridizationFraction*100)}% secondary ${basis.secondaryLabel.toLowerCase()} influence.`};return output;
  }

  function enhancedCatalog(seed,input,result,source,count=previous.catalogSize){return previous.catalog(seed,input,result,source,count).map(item=>enrichManufacturer(seed,input,result,source,item));}
  function enhancedGenerateManufacturer(seed,input,result,source,index){return enrichManufacturer(seed,input,result,source,previous.generateManufacturer(seed,input,result,source,index));}
  const enhancedGenerator=Object.freeze({...previous,technologyBasisVersion:1,generateManufacturer:enhancedGenerateManufacturer,catalog:enhancedCatalog});

  function apply(seed,input,source,result){
    const records=enhancedCatalog(seed,input,result,source,previous.catalogSize),index=Math.max(0,Math.min(records.length-1,result.manufacturer?.namingGrammar?.manufacturerIndex||0)),manufacturer=records[index];
    result.manufacturer=clone(manufacturer);result.technologyBasis=clone(manufacturer.technologyBasis);
    result.manufacturerCatalog=records.map(item=>({manufacturerId:item.manufacturerId,name:item.name,archetypeKey:item.archetype.key,focusKey:item.archetype.focusKey,internalsBias:item.architecture.internalsBias,evaBias:item.architecture.evaBias,preferredEnvelope:item.architecture.preferredEnvelope,primaryStructuralMaterial:item.architecture.primaryStructuralMaterial,designationPrefix:item.namingGrammar.designationPrefix,technologyBasisKey:item.technologyBasis.primaryBasisKey,technologyBasisLabel:item.technologyBasis.primaryLabel,humanInteroperability:item.technologyBasis.interoperability.humanInteroperability}));
    result.warnings=[...(result.warnings||[]),`${manufacturer.name} uses the ${manufacturer.technologyBasis.primaryLabel}. Utility graphs retain the same end-effect semantics, but their energy, control, coolant, atmosphere, boundary, connector, material, installation, and maintenance methods are species- and society-derived rather than assumed terrestrial.`,`A familiar end effect does not guarantee direct compatibility. Human interoperability is ${manufacturer.technologyBasis.interoperability.humanInteroperability.toLowerCase().replaceAll('_',' ')}.`];
    return result;
  }
  function generate(seed,input={},source=null){const value=String(seed||input.seed||'vessel');return apply(value,input,source,base.generate(value,input,source));}
  function migrateRecord(record,input={},source=null){const value=String(record?.seed||input.seed||'vessel');return apply(value,input,source,base.migrateRecord?base.migrateRecord(record,input,source):record);}

  globalThis.BlacklightExoVesselManufacturerGenerator=enhancedGenerator;
  globalThis.BlacklightExoVessel=Object.freeze({...base,technologyBasisVersion:1,technologyBasisDefinitions:D,technologyBasisGenerator:Object.freeze({version:1,schemaVersion:'1.0.0',build,enrichManufacturer}),generate,migrateRecord});
})();
