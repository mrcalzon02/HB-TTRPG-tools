(() => {
  'use strict';
  const HANDOFF_KEY='blacklight-exo-vessel-source-v1';

  function ensureLink() {
    const nav=document.querySelector('.bli-nav');
    if(nav&&![...nav.links].some(link=>link.getAttribute('href')==='blacklight-exo-vessel.html')){
      const link=document.createElement('a');link.href='blacklight-exo-vessel.html';link.textContent='Vessel Engineering';nav.append(link);
    }
  }

  function button(id,label,parent) {
    let item=document.getElementById(id);if(item)return item;
    if(!parent)return null;
    item=document.createElement('button');item.id=id;item.type='button';item.className='bli-action';item.textContent=label;parent.append(item);return item;
  }

  function navigate(type,payload) {
    if(!payload)return;
    try{
      localStorage.setItem(HANDOFF_KEY,JSON.stringify({version:1,type,createdAt:new Date().toISOString(),...payload}));
      location.href=`blacklight-exo-vessel.html?source=${encodeURIComponent(type)}`;
    }catch(error){console.error('Unable to create EXO vessel handoff.',error);}
  }

  ensureLink();

  if(document.body.classList.contains('exo-ftl-body')){
    const item=button('exo-develop-vessel','Develop Vessel Around This Drive',document.querySelector('.exo-ftl-hero .bli-actions'));
    item?.addEventListener('click',()=>navigate('ftl',{ftl:globalThis.BlacklightExoGetActiveFTL?.()}));
  }

  if(document.body.classList.contains('exo-species-body')){
    const item=button('exo-develop-species-vessel','Develop Vessel for This Biology',document.querySelector('.exo-species-hero .bli-actions'));
    item?.addEventListener('click',()=>navigate('biology',{dossier:globalThis.BlacklightExoGetActiveDossier?.()}));
  }

  if(document.body.classList.contains('exo-system-body')){
    const section=document.getElementById('exo-jump-calculator');
    const parent=section?.querySelector('.exo-jump-controls')||section?.querySelector('.bli-section-head');
    const item=button('exo-develop-route-vessel','Develop Vessel for This Route',parent);
    item?.addEventListener('click',()=>{
      try {
        const route=globalThis.BlacklightExoJumpCalculator?.calculate({
          startSeed:document.getElementById('exo-jump-start')?.value,
          endSeed:document.getElementById('exo-jump-end')?.value,
          familyKey:document.getElementById('exo-jump-family')?.value,
          pathLevelKey:document.getElementById('exo-jump-path')?.value
        });
        navigate('route',{route});
      } catch (error) {
        console.error('Unable to calculate vessel route handoff.',error);
      }
    });
  }
})();
