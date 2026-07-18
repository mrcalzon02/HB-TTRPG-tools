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
  const speciesMap=Object.fromEntries(sector.species.map(item=>[item.speciesId,item]));
  const worlds=[];
  for(const [clusterIndex,cluster] of sector.clusters.entries()){
    const controllers=cluster.controllingPolityIds;
    const activeCount=Math.max(controllers.length?3:1,Math.min(7,Math.ceil(cluster.controlledPlanetCount/6)+2));
    for(let index=0;index<activeCount;index+=1){
      const controller=controllers.length?controllers[index%controllers.length]:null,polity=controller?polityMap[controller]:null;
      const status=controllers.length?(index===0?'capital':activeStatuses[(clusterIndex+index*3)%activeStatuses.length]):'frontier';
      const worldId=`world-${cluster.clusterId}-${String(index+1).padStart(2,'0')}`;
      worlds.push({
        worldId,name:`${roots[(clusterIndex*3+index)%roots.length]} ${suffixes[(clusterIndex+index*5)%suffixes.length]}`,
        systemName:`${cluster.name} System ${String.fromCharCode(65+index)}`,clusterId:cluster.clusterId,status,
        controllingPolityId:controller,speciesIds:polity?.speciesIds||[],authorityClass:controller?'controlled-notable-world':'unclaimed-notable-world',
        populationMillions:controller?Number((((hash(worldId)%900000)+1000)/1000).toFixed(3)):0,
        environment:environments[(clusterIndex+index*2)%environments.length],gravityG:Number((.35+(hash(`${worldId}:g`)%190)/100).toFixed(2)),
        biosphere:status==='industrial'||status==='military'?'managed or limited':status==='frontier'?'unknown or absent':'native, engineered, or imported',
        resources:[resources[(clusterIndex+index)%resources.length],resources[(clusterIndex+index+4)%resources.length]],
        installations:controller?[`${polity?.name||controller} administrative authority`,status==='capital'?'sector embassy and fleet command':`${status} infrastructure`]:['automated survey beacons'],
        archiveNote:controller?`A named example world inside ${polity?.name||controller} territory. It is one notable record within a larger controlled-planet total.`:'No recognized permanent sovereign authority.'
      });
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
  if(typeof document==='undefined')return;

  const $=id=>document.getElementById(id),node=(tag,className='',text='')=>{const item=document.createElement(tag);if(className)item.className=className;if(text)item.textContent=String(text);return item;};
  function createSection(){
    if($('exo-sector-worlds-section'))return;
    const section=node('section','bli-section exo-sector-lazy');section.id='exo-sector-worlds-section';section.dataset.renderState='waiting';
    const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow','Controlled planets, dead worlds, and forgotten systems'),node('h2','',`${worlds.length} named notable-world authorities inside the fixed sector.`),node('p','','Waiting to render…'));
    const grid=node('div','exo-sector-card-grid');grid.id='exo-sector-worlds-grid';section.append(head,grid);
    const anchor=$('exo-sector-organizations-section');if(anchor)anchor.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
    const begin=()=>render(section,grid,head.querySelector('p:last-child'));
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();begin();}},{rootMargin:'360px'});observer.observe(section);}else begin();
  }
  function render(section,grid,progress){
    if(section.dataset.renderState!=='waiting')return;section.dataset.renderState='rendering';let index=0;
    const idle=callback=>('requestIdleCallback'in window?requestIdleCallback(callback,{timeout:160}):setTimeout(()=>callback({timeRemaining:()=>8}),16));
    const run=deadline=>{
      const fragment=document.createDocumentFragment();let count=0;
      while(index<worlds.length&&count<8&&(deadline.timeRemaining()>2||count<2)){
        const world=worlds[index++],polity=polityMap[world.controllingPolityId],species=(world.speciesIds||[]).map(id=>speciesMap[id]?.name||id);
        const card=node('article','exo-sector-card');card.dataset.stance=polity?.sectorStance||'';
        card.append(node('small','',`${world.status} · ${world.authorityClass.replaceAll('-',' ')}`),node('h3','',world.name),node('p','',`${world.systemName}. ${world.environment}; ${world.gravityG} g. ${world.archiveNote}`));
        const dl=node('dl');for(const[label,value]of[['Cluster',sector.clusters.find(c=>c.clusterId===world.clusterId)?.name||world.clusterId],['Controller',polity?.name||'none'],['Species',species.join('; ')||'none confirmed'],['Population',world.populationMillions?`${world.populationMillions.toLocaleString()} million`:'none recorded'],['Biosphere',world.biosphere]])dl.append(node('dt','',label),node('dd','',value));card.append(dl);
        const tags=node('div','tags');tags.append(...[...world.resources,...world.installations].map(text=>node('span','',text)));card.append(tags);fragment.append(card);count++;
      }
      grid.append(fragment);progress.textContent=`Rendered ${index} of ${worlds.length} named world records.`;
      if(index<worlds.length)idle(run);else section.dataset.renderState='complete';
    };idle(run);
  }
  createSection();
})();