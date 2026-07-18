import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const runtimeSource=fs.readFileSync(new URL('blacklight-exo-ftl-path-level-runtime.js',root),'utf8');
const controllerSource=fs.readFileSync(new URL('blacklight-exo-ftl-path-level-controller.js',root),'utf8');
const C_AU_S=299792.458/149597870.7;
const expectedProfiles={
  'metric-envelope':{target:150,variation:6,min:144,max:156},
  'gravitic-plane':{target:152,variation:6,min:146,max:158},
  'slipstream-shear':{target:160,variation:8,min:152,max:168},
  'q-lattice':{target:164,variation:8,min:156,max:172},
  'n-manifold':{target:169,variation:6,min:163,max:175},
  'fold-jump':{target:156,variation:12,min:144,max:168},
  'phase-displacement':{target:162,variation:10,min:152,max:172},
  'wormhole-gate':{target:194,variation:6,min:188,max:200}
};
const families=Object.keys(expectedProfiles);
const pathTemplate=family=>({label:family,names:Array(7).fill(`${family} stage`),speedC:Array.from({length:7},()=>[1,100000000]),rangeAU:Array.from({length:7},()=>[1,1000]),breakthroughs:Array(7).fill('breakthrough'),utilities:Array(7).fill('utility'),limits:Array(7).fill('limit'),energy:Array(7).fill('test-energy')});
const levels=Array.from({length:7},(_,rank)=>({key:`p${rank}`,rank,label:`Path ${rank}`,facilityMassTonnes:[50,100000],energyMultiplier:[1,1],spoolSeconds:[3,600],cooldownSeconds:[4,900],errorMultiplier:[1,1],windowMultiplier:[1,1],crossingSeconds:[.005,30],minimumEconomicAU:.005,scaleDescription:'test installation',commonUtility:'test utility',commonLimit:'test limit'}));
const pathDefinitions={chemicalBenchmarkKmS:20,levels,paths:Object.fromEntries(families.map(family=>[family,pathTemplate(family)]))};
const secondsText=value=>`${value} seconds`;

const base={
  constants:{C_AU_S,C_KM_S:299792.458,LY_AU:63241.07708426628},
  families:families.map((key,index)=>({key,tiers:[0,8],label:key,index})),
  energySystems:[{key:'test-energy',label:'Test energy'}],
  format:{secondsToText:secondsText,distanceText:value=>`${value} AU`,energyText:value=>`${value} J`,powerText:value=>`${value} W`,massText:value=>`${value} kg`},
  generate(seed,input){return{
    source:{type:'standalone'},identity:{tierRank:8,tierKey:'t8',familyKey:input.family},
    performance:{ratedCleanSpaceC:100000000,practicalRouteC:100000000,referenceDistanceAU:1,spoolSeconds:1,cooldownSeconds:1},
    range:{reserveFraction:.2},navigation:{errorKmPerAU:1,solutionRefreshSeconds:1},
    kinematics:{mode:['wormhole-gate','fold-jump','q-lattice','phase-displacement'].includes(input.family)?'gate-traversal':'continuous'},
    power:{},engineeringMaturity:{integrationComplexity:50},risk:{score:50,label:'High',drivers:[]},
    compatibility:{requested:{},resolved:{},corrections:[],fullyHonored:true},sourceImpact:[],summary:'Generated.'
  }}
};

const context={
  console,Math,Number,Object,Array,Set,Map,String,Date,
  document:{getElementById:()=>({value:'p5'}),querySelector:()=>null,createElement:()=>({append(){},appendChild(){}})},
  BlacklightExoFTL:base,
  BlacklightExoFTLPathDefinitions:pathDefinitions
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(runtimeSource,context,{filename:'blacklight-exo-ftl-path-level-runtime.js'});
context.BlacklightExoFTLPathEngineering={
  scaleEnergy(){},updateRouteAndReliability(){},
  makeChemicalComparison(){return{conclusion:'Validated against chemical propulsion.'};},
  makeHierarchy(){return[];}
};
vm.runInContext(controllerSource,context,{filename:'blacklight-exo-ftl-path-level-controller.js'});

const tolerance=1e-6;
if(context.BlacklightExoFTLPathRuntime.LEVEL5_BALANCE.wormholeMaximumAuPerHour!==200)throw new Error('Path 5 wormhole absolute ceiling must be 200 AU/hour.');
for(const [family,expected] of Object.entries(expectedProfiles)){
  const runtimeProfile=context.BlacklightExoFTLPathRuntime.LEVEL5_PROFILES[family];
  for(const [key,value] of [['targetAuPerHour',expected.target],['variationAuPerHour',expected.variation],['minAuPerHour',expected.min],['maxAuPerHour',expected.max]])if(runtimeProfile[key]!==value)throw new Error(`${family} ${key} is ${runtimeProfile[key]}, expected ${value}.`);
  if(family!=='wormhole-gate'&&(expected.max<150||expected.max>175))throw new Error(`${family} maximum must remain inside the 150–175 AU/hour non-wormhole envelope.`);
  if(expected.variation<6||expected.variation>12)throw new Error(`${family} variation must remain between ±6 and ±12 AU/hour.`);

  const expectedMinC=expected.min/(C_AU_S*3600),expectedMaxC=expected.max/(C_AU_S*3600),range=context.BlacklightExoFTLPathDefinitions.paths[family].speedC[5];
  if(Math.abs(range[0]-expectedMinC)>tolerance||Math.abs(range[1]-expectedMaxC)>tolerance)throw new Error(`${family} Path 5 source range does not match its AU/hour operating band.`);

  for(let index=0;index<40;index+=1){
    const result=context.BlacklightExoFTL.generate(`balance-${family}-${index}`,{family,pathLevel:'p5'}),rate=result.performance.practicalAuPerHour;
    if(rate<expected.min-tolerance||rate>expected.max+tolerance)throw new Error(`${family} generated ${rate} AU/hour outside ${expected.min}–${expected.max}.`);
    if(result.pathLevel.speedFloorAuPerHour!==expected.min||result.pathLevel.speedTargetAuPerHour!==expected.target||result.pathLevel.speedCeilingAuPerHour!==expected.max||result.pathLevel.speedVariationAuPerHour!==expected.variation)throw new Error(`${family} did not expose its complete Path 5 operating band.`);
    const payloadAuPerHour=result.performance.referenceDistanceAU/result.kinematics.payloadTransitSeconds*3600;
    if(payloadAuPerHour>expected.max+tolerance)throw new Error(`${family} hidden payload crossing rate ${payloadAuPerHour} AU/hour exceeds its stated ceiling.`);
    if(family==='wormhole-gate'){
      if(result.pathLevel.rarityClass!=='UNIVERSE_RAREST')throw new Error('Path 5 wormhole rarity classification is missing.');
      if(result.pathLevel.capitalBurdenClass!=='CIVILIZATION_SCALE_MAXIMUM')throw new Error('Path 5 wormhole capital burden is missing.');
      if(result.pathLevel.engineeringDifficultyClass!=='EXTREME_TOPOLOGICAL')throw new Error('Path 5 wormhole engineering difficulty is missing.');
      if(result.pathLevel.facilityMassTonnes<25000000)throw new Error('Path 5 wormhole facility is not civilization-scale.');
    }
  }
}
console.log('EXO FTL Path 5 family-band validation passed.');