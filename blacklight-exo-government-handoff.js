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
  document.getElementById('exo-develop-government')?.addEventListener('click',()=>navigate('dossier',{dossier:globalThis.BlacklightExoGetActiveDossier?.()}));
  document.getElementById('exo-develop-system-government')?.addEventListener('click',()=>navigate('system',{system:globalThis.BlacklightExoActiveSystem||null}));
  document.getElementById('exo-develop-cluster-government')?.addEventListener('click',()=>navigate('cluster',{cluster:{seed:globalThis.BlacklightExoGetClusterSeed?.()||null,systems:globalThis.BlacklightExoGetClusterSystems?.()||[]}}));
})();