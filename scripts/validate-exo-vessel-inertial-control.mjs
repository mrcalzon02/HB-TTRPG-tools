import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const moduleDefinitionsSource=fs.readFileSync(new URL('blacklight-exo-vessel-module-definitions.js',root),'utf8');
const clone=value=>structuredClone(value);
const baseRows=[
  {key:'drive',label:'Drive',massTonnes:150,volumeM3:60,note:'drive'},
  {key:'drive-integration',label:'Drive integration',massTonnes:70,volumeM3:35,note:'integration'},
  {key:'power',label:'Power',massTonnes:100,volumeM3:50,note:'power'},
  {key:'fuel',label:'Fuel',massTonnes:80,volumeM3:40,note:'fuel'},
  {key:'thermal',label:'Thermal',massTonnes:70,volumeM3:45,note:'thermal'},
  {key:'life-support',label:'Life support',massTonnes:80,volumeM3:90,note:'life'},
  {key:'protection-fields',label:'Protection fields',massTonnes:30,volumeM3:20,note:'fields'},
  {key:'navigation',label:'Navigation',massTonnes:30,volumeM3:20,note:'navigation'},
  {key:'structure',label:'Structure',massTonnes:120,volumeM3:90,note:'structure'},
  {key:'conventional-engine',label:'Conventional engine',massTonnes:70,volumeM3:40,note:'engine'},
  {key:'conventional-propellant',label:'Propellant',massTonnes:50,volumeM3:35,note:'propellant'},
  {key:'armor',label:'Armor',massTonnes:60,volumeM3:12,note:'armor'},
  {key:'margin',label:'Margin',massTonnes:90,volumeM3:60,note:'margin'}
];
const base={
  engineeringLedgerVersion:1,
  generate(seed){
    const mass=baseRows.reduce((sum,row)=>sum+row.massTonnes,0),volume=baseRows.reduce((sum,row)=>sum+row.volumeM3,0);
    return{
      seed,identity:{name:'Validation Hull',roleKey:'warship',defenseKey:'naval'},drive:{pathLevelRank:5,integratedDriveMassTonnes:220},
      hull:{totalMassTonnes:mass,totalMassText:`${mass} tonnes`,totalVolumeM3:volume,decks:8,massBudget:clone(baseRows)},
      lifeSupport:{zones:3,profile:{key:'human-standard'}},manufacturer:{name:'Validation Works',speciesId:'species-validation',production:{qualityControl:.84},realizedEngineering:{}},
      propulsion:{rawLongitudinalAccelerationMps2:196.133,structuralAccelerationLimitG:15,crewAccelerationLimitG:2.7,longitudinalAccelerationMps2:26.477955,lateralCombatAccelerationMps2:15.886773},
      armor:{doctrine:'naval',passiveArmorMassTonnes:60,fieldProtectionMassTonnes:30,physicalArealDensityKgM2:900,effectiveArealDensityKgM2:1200,armorToMassPercent:6,relativisticBoundary:'test',layers:[]},
      protection:{fieldFactor:1.2},power:{continuousPowerW:2e9,peakPowerW:8e12,peakPowerText:'8 TW'},thermal:{propulsionWasteHeatW:4e8,weaponWasteHeatW:1e8},
      engineeringLedger:{armor:{},massClosure:{expectedLoadedMassTonnes:mass,actualLoadedMassTonnes:mass,actualVolumeM3:volume,massErrorTonnes:0}},warnings:[]
    };
  }
};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,structuredClone,BlacklightExoVessel:base};context.globalThis=context;vm.createContext(context);vm.runInContext(moduleDefinitionsSource,context,{filename:'blacklight-exo-vessel-module-definitions.js'});
const result=context.BlacklightExoVessel.generate('inertial-validation');
const irc=result.inertialControl;
if(!irc||irc.recordType!=='exoVesselInertialReferenceControl')throw new Error('Missing inertial-reference control authority.');
if(!irc.validation.valid)throw new Error(`Inertial validation failed: ${irc.validation.violations.join(' ')}`);
if(!result.technologyReferences?.inertialControl||result.technologyReferences.inertialControl.referenceId!==irc.referenceId)throw new Error('Separate vessel technology reference is missing or mismatched.');
const requiredRows=['inertial-primary','inertial-secondary','inertial-local','inertial-emergency'];
for(const key of requiredRows)if(!result.hull.massBudget.some(row=>row.key===key))throw new Error(`Missing ${key} mass-ledger row.`);
const mass=result.hull.massBudget.reduce((sum,row)=>sum+Number(row.massTonnes||0),0);
if(Math.abs(mass-result.hull.totalMassTonnes)>Math.max(1,mass)*1e-9)throw new Error('Vessel mass does not close after inertial-control installation.');
if(Math.abs(irc.performance.certifiedInternalResidualAccelerationG-irc.performance.certifiedExternalAccelerationG*irc.performance.residualCouplingFraction)>1e-9)throw new Error('Residual acceleration equation does not reconstruct.');
if(irc.performance.certifiedInternalResidualAccelerationG>irc.performance.uncompensatedCrewLimitG+1e-9)throw new Error('Crew-frame residual exceeds the unprotected biological limit.');
if(irc.performance.certifiedExternalAccelerationG>irc.performance.rawEngineAccelerationG+1e-9||irc.performance.certifiedExternalAccelerationG>irc.performance.structuralAccelerationLimitG+1e-9)throw new Error('Field-supported acceleration exceeds engine or structural authority.');
if(!irc.emergency.automaticManeuverInhibit||!irc.emergency.hardVectorClamp||irc.power.emergencyReserveSeconds<=0)throw new Error('Emergency thrust inhibition, hard vector clamp, or reserve is missing.');
const degradation=Object.values(irc.redundancy.degradedPerformance).map(item=>item.maximumExternalG);
for(let i=1;i<degradation.length;i+=1)if(degradation[i]>degradation[i-1]+1e-9)throw new Error('Inertial fallback tier improves after losing redundancy.');
if(irc.redundancy.primaryChannels<2||irc.redundancy.secondaryChannels<1||irc.redundancy.distributedCompartmentNodes<4)throw new Error('Required redundancy channels are missing.');
for(const key of requiredRows){const type=context.BlacklightExoVesselModuleDefinitions.moduleTypes[key];if(!type)throw new Error(`Module semantic definition ${key} is missing.`);if(type.criticality!=='CRITICAL')throw new Error(`${key} must remain a critical damageable module.`);}
console.log('EXO vessel inertial-reference control validation passed.');