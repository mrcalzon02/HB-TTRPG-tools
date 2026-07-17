(() => {
  'use strict';
  const HANDOFF_KEY='blacklight-exo-government-source-v1';
  function navigate(type,payload){
    if(!payload)return;
    try{
      localStorage.setItem(HANDOFF_KEY,JSON.stringify({version:1,type,createdAt:new Date().toISOString(),...payload}));
      location.href=`blacklight-exo-stellar-government.html?source=${encodeURIComponent(type)}`;
    }catch(error){
      console.error('Unable to create stellar-government handoff.',error);
    }
  }
  function clusterFromPage(){
    const supplied=globalThis.BlacklightExoGetClusterSystems?.();
    const systems=Array.isArray(supplied)&&supplied.length?supplied:[...document.querySelectorAll('.exo-cluster-card')].map(card=>{
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
    return{seed:globalThis.BlacklightExoGetClusterSeed?.()||document.getElementById('exo-cluster-seed')?.value.trim()||null,systems};
  }
  document.getElementById('exo-develop-government')?.addEventListener('click',()=>navigate('dossier',{dossier:globalThis.BlacklightExoGetActiveDossier?.()}));
  document.getElementById('exo-develop-system-government')?.addEventListener('click',()=>navigate('system',{system:globalThis.BlacklightExoActiveSystem||null}));
  document.getElementById('exo-develop-cluster-government')?.addEventListener('click',()=>navigate('cluster',{cluster:clusterFromPage()}));
})();