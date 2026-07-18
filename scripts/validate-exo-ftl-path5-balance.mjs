import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const runtimeSource=fs.readFileSync(new URL('blacklight-exo-ftl-path-level-runtime.js',root),'utf8');
const controllerSource=fs.readFileSync(new URL('blacklight-exo-ftl-path-level-controller.js',root),'utf8');
const C_AU_S=299792.458/149597870.7;
const families=['metric-envelope','gravitic-plane','slipstream-shear','q-lattice','n-manifold','fold-jump','wormhole-gate','phase-displacement'];
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
    kinematics:{mode:input.family==='wormhole-gate'?'gate-traversal':'continuous'},
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

const nonCap=4280265.90675/3,wormCap=4280265.90675/2,tolerance=1e-6;
for(const family of families){
  const result=context.BlacklightExoFTL.generate(`balance-${family}`,{family,pathLevel:'p5'});
  const expected=family==='wormhole-gate'?wormCap:nonCap;
  if(result.performance.practicalAuPerHour>expected+tolerance)throw new Error(`${family} exceeded its Path 5 AU/hour ceiling: ${result.performance.practicalAuPerHour} > ${expected}`);
  if(result.pathLevel.speedCeilingAuPerHour!==expected)throw new Error(`${family} did not expose the exact Path 5 ceiling.`);
  if(family!=='wormhole-gate'&&result.pathLevel.speedRangeC[1]>context.BlacklightExoFTLPathRuntime.LEVEL5_BALANCE.nonWormholeCapC+tolerance)throw new Error(`${family} source range exceeds the non-wormhole ceiling.`);
  if(family==='wormhole-gate'){
    if(result.pathLevel.rarityClass!=='UNIVERSE_RAREST')throw new Error('Path 5 wormhole rarity classification is missing.');
    if(result.pathLevel.capitalBurdenClass!=='CIVILIZATION_SCALE_MAXIMUM')throw new Error('Path 5 wormhole capital burden is missing.');
    if(result.pathLevel.engineeringDifficultyClass!=='EXTREME_TOPOLOGICAL')throw new Error('Path 5 wormhole engineering difficulty is missing.');
    if(result.pathLevel.facilityMassTonnes<25000000)throw new Error('Path 5 wormhole facility is not civilization-scale.');
  }
}
console.log('EXO FTL Path 5 balance validation passed.');