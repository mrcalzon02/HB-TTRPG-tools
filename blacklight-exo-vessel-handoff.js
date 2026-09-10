(() => {
  'use strict';
  const HANDOFF_KEY='blacklight-exo-vessel-source-v1';

  function ensureLink() {
    const href='blacklight-exo-vessel.html';
    if(document.querySelector(`a[href="${href}"]`))return;
    const nav=document.querySelector('.bli-system-nav')||document.querySelector('.bli-nav');
    if(!nav)return;
    const link=document.createElement('a');link.href=href;link.textContent='Vessel Engineering';nav.append(link);
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
    const parent=document.querySelector('.exo-ftl-actions')||document.querySelector('.exo-ftl-hero .bli-actions');
    const item=button('exo-develop-vessel','Develop Vessel Around This Drive',parent);
    item?.addEventListener('click',()=>navigate('ftl',{ftl:globalThis.BlacklightExoGetActiveFTL?.()}));
  }

  if(document.body.classList.contains('exo-species-body')){
    const parent=document.querySelector('.exo-species-actions')||document.querySelector('.exo-species-hero .bli-actions');
    const item=button('exo-develop-species-vessel','Develop Vessel for This Biology',parent);
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
