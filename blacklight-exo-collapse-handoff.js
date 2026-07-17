(() => {
  'use strict';

  const KEY='blacklight-exo-collapse-context-v1';

  function readCard(container,index){
    const card=container?.querySelectorAll('.exo-dossier-card')?.[index];
    if(!card)return null;
    return{label:card.querySelector('small')?.textContent.trim()||'',title:card.querySelector('h3')?.textContent.trim()||'',text:card.querySelector('p')?.textContent.trim()||''};
  }

  function collapseRecord(worldName){
    const grid=document.getElementById('exo-collapse-grid');
    const event=readCard(grid,0),aftermath=readCard(grid,1),hazard=readCard(grid,2);
    if(!event||!/Extinction event/i.test(event.label))return null;
    return{
      version:1,
      worldName,
      systemSeed:document.getElementById('exo-species-seed')?.value.trim()||null,
      cause:event.title,
      mechanism:event.text,
      aftermath:aftermath?.text||'',
      hazard:hazard?.title||hazard?.text||'',
      capturedAt:new Date().toISOString()
    };
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-develop-ecology] button');if(!button)return;
    const card=button.closest('.exo-dossier-card');const worldName=card?.querySelector('h3')?.textContent.trim()||'';
    const record=collapseRecord(worldName);
    if(record)sessionStorage.setItem(KEY,JSON.stringify(record));else sessionStorage.removeItem(KEY);
  },true);
})();