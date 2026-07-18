(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const authority=globalThis.BlacklightExoAuthority;
  const generateButton=$('exo-generate-system'),seedInput=$('exo-seed-input'),clusterSeedInput=$('exo-cluster-seed'),clusterCount=$('exo-cluster-count'),generateClusterButton=$('exo-generate-cluster'),randomClusterButton=$('exo-random-cluster'),forcePopulatedButton=$('exo-force-populated-hz'),clusterGrid=$('exo-cluster-grid'),clusterStatus=$('exo-cluster-status'),populationSummary=$('exo-summary-population'),hzBodiesSummary=$('exo-summary-hz-bodies'),clusterSystemsSummary=$('exo-cluster-summary-systems'),clusterPopulatedSummary=$('exo-cluster-summary-populated'),clusterHabitableSummary=$('exo-cluster-summary-habitable');
  if(!generateButton||!seedInput||!clusterGrid)return;

  let clusterSystems=[],selectedClusterSeed='',buildingCluster=false,forcingPopulatedSystem=false;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));

  function createRandomSeed(){
    if(globalThis.crypto?.getRandomValues){const values=new Uint32Array(2);globalThis.crypto.getRandomValues(values);return`${values[0].toString(36)}-${values[1].toString(36)}`;}
    return`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function systemRecord(seed){
    const current=globalThis.BlacklightExoGetActiveSystem?.();
    if(current?.seed===seed)return current;
    return globalThis.BlacklightExoResolveSystem?.(seed)||null;
  }

  function civilizationIsPopulated(value){return Boolean(value&&!/^No\b|unknown|none detected/i.test(String(value)));}
  function bodiesFor(system){return(system?.planets||[]).flatMap(planet=>[planet,...(planet.moons||[])]);}

  function metadataFromSystemRecord(system,{inspectHabitablePopulation=false}={}){
    if(!system)return null;
    const inner=finite(system.star?.hzInner),outer=finite(system.star?.hzOuter),planets=system.planets||[],hzPlanets=planets.filter(planet=>finite(planet.distance,-1)>=inner&&finite(planet.distance,-1)<=outer),allBodies=bodiesFor(system),populatedBodies=allBodies.filter(body=>civilizationIsPopulated(body.civilization));
    const populatedHzBody=inspectHabitablePopulation?hzPlanets.flatMap(planet=>[planet,...(planet.moons||[])]).find(body=>civilizationIsPopulated(body.civilization)):null;
    return{
      seed:system.seed,
      name:system.name,
      star:`${system.star?.class||'Unknown'} · ${system.star?.label||system.star?.name||'Unknown primary'}`,
      planetCount:planets.length,
      populated:populatedBodies.length>0,
      hzPlanetCount:hzPlanets.length,
      hzBodyCount:hzPlanets.reduce((total,planet)=>total+1+(planet.moons?.length||0),0),
      populatedHzPlanet:populatedHzBody?{name:populatedHzBody.name,civilization:populatedHzBody.civilization}:null,
      habitableWorlds:allBodies.filter(body=>finite(body.habitability)>=65).length,
      renderedBodyCount:allBodies.length,
      deferredMoonCount:finite(system.deferredMoonCount),
      sourceMode:system.sourceMode||'procedural'
    };
  }

  function readCurrentSystemMetadata(options={}){
    const seed=seedInput.value.trim(),published=authority?.getSystem(seed);
    if(published)return{seed,name:published.name,star:published.star,planetCount:published.confirmedPlanetCount,populated:published.populated,hzPlanetCount:published.confirmedHzPlanetCount,hzBodyCount:published.confirmedHzBodyCount,habitableWorlds:published.knownLifeWorlds,publishedReference:true};
    return metadataFromSystemRecord(systemRecord(seed),options)||{seed,name:'Unknown system',star:'Unknown primary',planetCount:0,populated:false,hzPlanetCount:0,hzBodyCount:0,habitableWorlds:0};
  }

  function updateCurrentSummary(metadata=readCurrentSystemMetadata()){
    setText(populationSummary,metadata.populated?'Populated':'Unpopulated');populationSummary?.classList.toggle('is-populated',metadata.populated);populationSummary?.classList.toggle('is-unpopulated',!metadata.populated);setText(hzBodiesSummary,metadata.hzBodyCount);
  }
  function setClusterStatus(message,state=''){setText(clusterStatus,message);if(clusterStatus)clusterStatus.dataset.state=state;}
  function updateClusterTotals(){setText(clusterSystemsSummary,clusterSystems.length);setText(clusterPopulatedSummary,clusterSystems.filter(system=>system.populated).length);setText(clusterHabitableSummary,clusterSystems.filter(system=>system.hzBodyCount>0).length);}

  function loadClusterSystem(entry,scroll=true){selectedClusterSeed=entry.seed;seedInput.value=entry.seed;generateButton.click();renderClusterCards();if(scroll)$('exo-control-title')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function renderClusterCards(){const fragment=document.createDocumentFragment();for(const entry of clusterSystems)fragment.append(createClusterCard(entry));clusterGrid.replaceChildren(fragment);updateClusterTotals();}

  function metric(label,value){const wrapper=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);wrapper.append(dt,dd);return wrapper;}
  function formatSolarMass(value){const number=Number(value)||0;return number>=10?number.toFixed(3):number>=1?number.toFixed(5):number.toFixed(6);}
  function formatEarthMass(value){const number=Number(value)||0;if(!number)return'0 confirmed';return number>=1000?Math.round(number).toLocaleString():number>=10?number.toFixed(2):number.toFixed(3);}

  function createClusterCard(entry){
    const card=document.createElement('article');card.className='exo-cluster-card';card.classList.toggle('is-selected',entry.seed===selectedClusterSeed);card.classList.toggle('is-populated',entry.populated);card.dataset.authorityMode=entry.authorityMode||'generated';
    if(entry.publishedReference){card.dataset.realNeighborhood='true';card.dataset.catalogName=entry.name;card.dataset.stellarMass=String(entry.stellarMassSolar);card.dataset.planetaryMass=String(entry.orbitingMassSolar);card.dataset.systemMass=String(entry.totalMassSolar);card.dataset.distanceLy=String(entry.distanceLy);}
    const heading=document.createElement('div');heading.className='exo-cluster-card-heading';const title=document.createElement('h3');title.textContent=entry.name;const status=document.createElement('span');status.className=`exo-population-badge ${entry.populated?'populated':'unpopulated'}`;status.textContent=entry.populated?'Known populated':'No confirmed population';heading.append(title,status);
    const primary=document.createElement('p');primary.className='exo-cluster-primary';primary.textContent=entry.star;
    const metrics=document.createElement('dl');metrics.className='exo-cluster-metrics';
    const metricRows=entry.publishedReference?[
      ['Distance',entry.distanceLy?`${entry.distanceLy.toFixed(3)} ly`:'Origin'],['Stellar/system mass',`${formatSolarMass(entry.stellarMassSolar)} M☉`],['Confirmed planets',entry.confirmedPlanetCount],['Confirmed orbiting mass',`${formatEarthMass(entry.orbitingMassEarth)} M⊕`]
    ]:[['Planets',entry.planetCount],['HZ planets',entry.hzPlanetCount],['HZ bodies',entry.hzBodyCount],['Habitable worlds',entry.habitableWorlds]];
    for(const [label,value]of metricRows)metrics.append(metric(label,value));
    card.append(heading,primary,metrics);
    if(entry.publishedReference){const note=document.createElement('p');note.className='exo-authority-note';const candidateText=entry.candidates?.length?` ${entry.candidates.length} candidate/disputed record${entry.candidates.length===1?'':'s'} remain excluded from confirmed totals.`:'';note.textContent=`Published-first authority. RNG may supplement only unknown fields and must remain labeled hypothetical.${candidateText}`;card.append(note);}
    else if(entry.deferredMoonCount){const note=document.createElement('p');note.className='exo-authority-note';note.textContent=`Lightweight summary contains ${entry.renderedBodyCount} immediately rendered bodies while ${entry.deferredMoonCount} satellite records remain attached to the system archive.`;card.append(note);}
    const seed=document.createElement('code');seed.className='exo-cluster-seed';seed.textContent=entry.seed;const open=document.createElement('button');open.type='button';open.className='bli-action exo-cluster-open';open.textContent=entry.publishedReference?(entry.detailProvider==='published-sol'?'Open Published Solar System':entry.confirmedPlanetCount?'Open Published System Record':'Open Published Star + RNG Supplement'):(entry.hzBodyCount>0?'Expand Habitable-Zone System':'Open System');open.setAttribute('aria-pressed',String(entry.seed===selectedClusterSeed));open.addEventListener('click',()=>loadClusterSystem(entry));card.addEventListener('dblclick',()=>loadClusterSystem(entry));card.append(seed,open);return card;
  }

  function exampleSystems(){if(!authority)throw new Error('Blacklight EXO source authority did not load before the cluster controller.');return authority.getExampleClusterEntries();}

  async function generateCluster(randomize=false){
    if(buildingCluster||forcingPopulatedSystem)return;buildingCluster=true;generateClusterButton&&(generateClusterButton.disabled=true);randomClusterButton&&(randomClusterButton.disabled=true);
    try{
      if(randomize||!clusterSeedInput.value.trim())clusterSeedInput.value=createRandomSeed();const baseSeed=clusterSeedInput.value.trim();
      if(authority?.isExampleSeed(baseSeed)){
        if(clusterCount)clusterCount.value=String(authority.getExampleClusterEntries().length);clusterSystems=exampleSystems();selectedClusterSeed=clusterSystems[0].seed;setClusterStatus(`Loading published-first nearby-star authority v${authority.version}…`,'working');renderClusterCards();loadClusterSystem(clusterSystems[0],false);updateCurrentSummary(clusterSystems[0]);setClusterStatus(`EXAMPLE authority v${authority.version}: published astrometry, stellar properties, confirmed planets, and measured masses take precedence. RNG is restricted to labeled unknown supplements.`,'ready');return;
      }
      const count=Math.max(2,Math.min(20,Number(clusterCount?.value||8))),systems=[];setClusterStatus(`Generating ${count} system records without rendering ${count} complete orbital displays…`,'working');
      for(let index=0;index<count;index+=1){const childSeed=`${baseSeed}:system:${index+1}`,record=globalThis.BlacklightExoResolveSystem?.(childSeed),metadata=metadataFromSystemRecord(record)||{seed:childSeed,name:'Unresolved system',star:'Unknown primary',planetCount:0,populated:false,hzPlanetCount:0,hzBodyCount:0,habitableWorlds:0};metadata.clusterIndex=index+1;systems.push(metadata);setClusterStatus(`Charting system ${index+1} of ${count}: ${metadata.name}`,'working');if((index+1)%4===0)await nextFrame();}
      clusterSystems=systems;selectedClusterSeed=systems[0]?.seed||'';renderClusterCards();if(systems[0]){loadClusterSystem(systems[0],false);updateCurrentSummary(systems[0]);}setClusterStatus(`${count} systems charted from lightweight records. Select a system to render its complete orbital workspace below.`,'ready');
    }catch(error){console.error('[Blacklight EXO] Cluster generation failed:',error);setClusterStatus(`Cluster generation failed: ${error.message}`,'error');}
    finally{buildingCluster=false;generateClusterButton&&(generateClusterButton.disabled=false);randomClusterButton&&(randomClusterButton.disabled=false);}
  }

  async function forcePopulatedHabitableSystem(){
    if(forcingPopulatedSystem||buildingCluster)return;forcingPopulatedSystem=true;const originalText=forcePopulatedButton?.textContent;if(forcePopulatedButton){forcePopulatedButton.disabled=true;forcePopulatedButton.textContent='Creating Populated HZ System…';}
    try{
      const currentPublished=authority?.getSystem(seedInput.value.trim()),baseSeed=currentPublished?createRandomSeed():seedInput.value.trim()||createRandomSeed();let found=null;
      for(let attempt=1;attempt<=1200;attempt+=1){const candidateSeed=`${baseSeed}:populated-hz:${attempt}`,record=globalThis.BlacklightExoResolveSystem?.(candidateSeed),metadata=metadataFromSystemRecord(record,{inspectHabitablePopulation:true});if(metadata?.populatedHzPlanet){metadata.forced=true;found=metadata;break;}if(forcePopulatedButton)forcePopulatedButton.textContent=`Searching Habitable Records… ${attempt}`;if(attempt%80===0)await nextFrame();}
      if(!found){setClusterStatus('No populated habitable-zone planet was found within the safety limit. Try another seed.','error');return;}
      selectedClusterSeed=found.seed;const existingIndex=clusterSystems.findIndex(item=>item.seed===found.seed);if(existingIndex>=0)clusterSystems[existingIndex]=found;else clusterSystems.unshift(found);seedInput.value=found.seed;generateButton.click();renderClusterCards();updateCurrentSummary(found);setClusterStatus(`${found.name} created with ${found.populatedHzPlanet.name} populated inside the habitable zone (${found.populatedHzPlanet.civilization}). Only the successful result was fully rendered.`,'ready');
    }finally{forcingPopulatedSystem=false;if(forcePopulatedButton){forcePopulatedButton.disabled=false;forcePopulatedButton.textContent=originalText;}}
  }

  function setText(target,value){if(target&&target.textContent!==String(value))target.textContent=String(value);}
  generateButton.addEventListener('click',()=>{if(buildingCluster||forcingPopulatedSystem)return;queueMicrotask(()=>{const metadata=readCurrentSystemMetadata();selectedClusterSeed=metadata.seed;updateCurrentSummary(metadata);renderClusterCards();});});
  generateClusterButton?.addEventListener('click',()=>generateCluster(false));randomClusterButton?.addEventListener('click',()=>generateCluster(true));forcePopulatedButton?.addEventListener('click',forcePopulatedHabitableSystem);clusterSeedInput?.addEventListener('keydown',event=>{if(event.key==='Enter')generateCluster(false);});
  updateCurrentSummary(readCurrentSystemMetadata());clusterSeedInput.value=authority?.presetSeed||'EXAMPLE';if(clusterCount)clusterCount.value=String(authority?.getExampleClusterEntries().length||20);
  globalThis.BlacklightExoClusterController=Object.freeze({version:2,metadataFromSystemRecord,generateCluster,forcePopulatedHabitableSystem});
  if(!globalThis.BlacklightExoDeferClusterAutostart)requestAnimationFrame(()=>generateCluster(false));else setClusterStatus('Cluster controller loaded. Choose Generate Solar Cluster when you want the additional records.','ready');
})();