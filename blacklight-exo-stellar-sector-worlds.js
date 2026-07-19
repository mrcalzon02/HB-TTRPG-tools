(() => {
  'use strict';
  const authority=globalThis.BlacklightExoStellarSectorData;
  if(!authority?.sector||authority.sector.worlds)return;
  const sector=authority.sector;
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  const roots=['Aegis','Bastion','Cairn','Dawn','Eidolon','Fallow','Garrison','Haven','Ithaca','Junction','Keystone','Lantern','Meridian','Nadir','Orchard','Pilgrim','Quarry','Reliquary','Sanctum','Tithe','Umber','Vigil','Wayfarer','Xenope','Yarrow','Zenith'];
  const suffixes=['Prime','Secundus','III','Reach','Station','Crown','Refuge','Foundry','Archive','March','Deep','Rest'];
  const environments=['temperate continental','oceanic archipelago','high-gravity super-Earth','tidally locked terminator belt','cryogenic methane world','ammonia ocean moon','arid mineral world','dense forest biosphere','subsurface-ocean moon','artificial habitat complex','vacuum industrial planetoid'];
  const resources=['Q-condensate precursors','heavy metals','water and volatiles','biological feedstock','rare isotopes','shipbuilding mass','fusion fuels','archaeological data','industrial ceramics','pharmaceutical ecologies'];
  const activeStatuses=['capital','inhabited','industrial','agricultural','military','scientific','commercial','frontier','contested'];
  const ruinStatuses=['ruined','dead','forgotten','quarantined','abandoned'];
  const polityMap=Object.fromEntries(sector.polities.map(item=>[item.polityId,item]));
  const worlds=[];
  for(const [clusterIndex,cluster] of sector.clusters.entries()){
    const controllers=cluster.controllingPolityIds;
    const activeCount=Math.max(controllers.length?3:1,Math.min(7,Math.ceil(cluster.controlledPlanetCount/6)+2));
    for(let index=0;index<activeCount;index+=1){
      const controller=controllers.length?controllers[index%controllers.length]:null,polity=controller?polityMap[controller]:null;
      const status=controllers.length?(index===0?'capital':activeStatuses[(clusterIndex+index*3)%activeStatuses.length]):'frontier';
      const worldId=`world-${cluster.clusterId}-${String(index+1).padStart(2,'0')}`;
      worlds.push({worldId,name:`${roots[(clusterIndex*3+index)%roots.length]} ${suffixes[(clusterIndex+index*5)%suffixes.length]}`,systemName:`${cluster.name} System ${String.fromCharCode(65+index)}`,clusterId:cluster.clusterId,status,controllingPolityId:controller,speciesIds:polity?.speciesIds||[],authorityClass:controller?'controlled-notable-world':'unclaimed-notable-world',populationMillions:controller?Number((((hash(worldId)%900000)+1000)/1000).toFixed(3)):0,environment:environments[(clusterIndex+index*2)%environments.length],gravityG:Number((.35+(hash(`${worldId}:g`)%190)/100).toFixed(2)),biosphere:status==='industrial'||status==='military'?'managed or limited':status==='frontier'?'unknown or absent':'native, engineered, or imported',resources:[resources[(clusterIndex+index)%resources.length],resources[(clusterIndex+index+4)%resources.length]],installations:controller?[`${polity?.name||controller} administrative authority`,status==='capital'?'sector embassy and fleet command':`${status} infrastructure`]:['automated survey beacons'],archiveNote:controller?`A named example world inside ${polity?.name||controller} territory. It is one notable record within a larger controlled-planet total.`:'No recognized permanent sovereign authority.'});
    }
    const ruinCount=Math.max(cluster.ruinWorldCount?1:0,Math.min(3,cluster.ruinWorldCount));
    for(let index=0;index<ruinCount;index+=1){
      const worldId=`ruin-${cluster.clusterId}-${String(index+1).padStart(2,'0')}`,status=ruinStatuses[(clusterIndex+index)%ruinStatuses.length];
      worlds.push({worldId,name:`${roots[(clusterIndex*7+index+9)%roots.length]} ${suffixes[(clusterIndex*2+index+6)%suffixes.length]}`,systemName:`${cluster.name} Lost System ${index+1}`,clusterId:cluster.clusterId,status,controllingPolityId:null,speciesIds:[],authorityClass:'dead-or-forgotten-world',populationMillions:0,environment:environments[(clusterIndex+index+5)%environments.length],gravityG:Number((.25+(hash(`${worldId}:g`)%240)/100).toFixed(2)),biosphere:status==='dead'?'extinguished':status==='quarantined'?'hazardous or contaminated':'fragmentary or unknown',resources:[resources[(clusterIndex+index+7)%resources.length]],installations:[status==='forgotten'?'unverified buried structures':'derelict cities and failed infrastructure'],archiveNote:`A fixed dead-world record associated with ${cluster.name}. Cause and ownership remain ${status==='quarantined'?'restricted':'unresolved'}.`});
    }
  }
  sector.worlds=worlds;
  sector.summary.notableWorldCount=worlds.length;
  sector.summary.controlledNotableWorldCount=worlds.filter(item=>item.controllingPolityId).length;
  sector.summary.deadOrForgottenWorldCount=worlds.filter(item=>item.authorityClass==='dead-or-forgotten-world').length;
  for(const cluster of sector.clusters)cluster.notableWorldIds=worlds.filter(item=>item.clusterId===cluster.clusterId).map(item=>item.worldId);
  for(const polity of sector.polities)polity.notableControlledWorldIds=worlds.filter(item=>item.controllingPolityId===polity.polityId).map(item=>item.worldId);
})();
