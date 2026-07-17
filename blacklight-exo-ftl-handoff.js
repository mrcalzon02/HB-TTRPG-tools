(() => {
  'use strict';
  const HANDOFF_KEY='blacklight-exo-ftl-source-v1';

  function ensureLink(){
    const nav=document.querySelector('.bli-nav');
    if(nav&&![...nav.links].some(link=>link.getAttribute('href')==='blacklight-exo-ftl.html')){
      const link=document.createElement('a');
      link.href='blacklight-exo-ftl.html';
      link.textContent='FTL Hierarchy';
      nav.append(link);
    }
  }

  function ensureButton(id,label,parentSelector){
    let button=document.getElementById(id);
    if(button)return button;
    const parent=document.querySelector(parentSelector);
    if(!parent)return null;
    button=document.createElement('button');
    button.id=id;
    button.type='button';
    button.className='bli-action';
    button.textContent=label;
    parent.append(button);
    return button;
  }

  function navigate(type,payload){
    if(!payload)return;
    try{
      localStorage.setItem(HANDOFF_KEY,JSON.stringify({version:1,type,createdAt:new Date().toISOString(),...payload}));
      location.href=`blacklight-exo-ftl.html?source=${encodeURIComponent(type)}`;
    }catch(error){
      console.error('Unable to create FTL hierarchy handoff.',error);
    }
  }

  function clusterFromPage(){
    const systems=[...document.querySelectorAll('.exo-cluster-card')].map(card=>{
      const metrics={};
      for(const row of card.querySelectorAll('.exo-cluster-metrics div')){
        const label=row.querySelector('dt')?.textContent.trim(),value=row.querySelector('dd')?.textContent.trim();
        if(label)metrics[label]=value;
      }
      return{
        seed:card.querySelector('.exo-cluster-seed')?.textContent.trim()||null,
        name:card.querySelector('h3')?.textContent.trim()||'Unknown system',
        star:card.querySelector('.exo-cluster-primary')?.textContent.trim()||'Unknown primary',
        populated:card.classList.contains('is-populated'),
        population:Number(card.dataset.population)||0,
        authorityMode:card.dataset.authorityMode||'generated',
        publishedReference:card.dataset.realNeighborhood==='true',
        distanceLy:Number(card.dataset.distanceLy)||null,
        stellarMassSolar:Number(card.dataset.stellarMass)||null,
        systemMassSolar:Number(card.dataset.systemMass)||null,
        planetCount:Number(metrics.Planets||metrics['Confirmed planets'])||0,
        hzPlanetCount:Number(metrics['HZ planets'])||0,
        hzBodyCount:Number(metrics['HZ bodies'])||0,
        habitableWorlds:Number(metrics['Habitable worlds'])||0
      };
    });
    return{seed:document.getElementById('exo-cluster-seed')?.value.trim()||null,systems};
  }

  function loadVesselHandoff(){
    if(document.querySelector('script[src="blacklight-exo-vessel-handoff.js"]'))return;
    const script=document.createElement('script');
    script.src='blacklight-exo-vessel-handoff.js';
    script.defer=true;
    document.head.append(script);
  }

  ensureLink();

  if(document.body.classList.contains('exo-government-body')){
    ensureButton('exo-develop-ftl','Develop FTL Technology Hierarchy','.exo-government-hero .bli-actions');
  }
  if(document.body.classList.contains('exo-species-body')){
    ensureButton('exo-develop-dossier-ftl','Develop FTL Technology Hierarchy','.exo-species-hero .bli-actions');
  }
  if(document.body.classList.contains('exo-system-body')){
    ensureButton('exo-develop-system-ftl','Develop Current System FTL','.exo-system-actions');
    ensureButton('exo-develop-cluster-ftl','Develop Cluster FTL Hierarchy','.exo-cluster-controls');
  }

  document.getElementById('exo-develop-ftl')?.addEventListener('click',()=>navigate('government',{government:globalThis.BlacklightExoGetActiveGovernment?.()}));
  document.getElementById('exo-develop-dossier-ftl')?.addEventListener('click',()=>navigate('dossier',{dossier:globalThis.BlacklightExoGetActiveDossier?.()}));
  document.getElementById('exo-develop-system-ftl')?.addEventListener('click',()=>navigate('system',{system:globalThis.BlacklightExoActiveSystem||null}));
  document.getElementById('exo-develop-cluster-ftl')?.addEventListener('click',()=>navigate('cluster',{cluster:clusterFromPage()}));
  loadVesselHandoff();
})();
