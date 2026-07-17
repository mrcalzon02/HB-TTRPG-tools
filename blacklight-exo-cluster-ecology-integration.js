(() => {
  'use strict';

  const grid=document.getElementById('exo-cluster-grid');const summary=document.querySelector('.exo-cluster-summary');
  const cache=globalThis.BlacklightExoEcologyClusterCache;
  if(!grid||!(cache instanceof Map))return;

  function format(values){
    if(!values)return'Open system to resolve ecology';
    const parts=[];
    if(values.living)parts.push(`${values.living} living`);if(values.pseudo)parts.push(`${values.pseudo} pseudo-life`);if(values.chemical)parts.push(`${values.chemical} chemical`);if(values.populated)parts.push(`${values.populated} populated`);if(values.ruined)parts.push(`${values.ruined} ruined`);
    return parts.length?parts.join(' · '):`${values.barren||0} barren; no active ecological signature`;
  }

  function ensureSummary(){
    if(!summary)return null;let item=summary.querySelector('[data-cluster-ecology-summary]');
    if(!item){item=document.createElement('div');item.className='exo-cluster-summary-item';item.dataset.clusterEcologySummary='true';item.innerHTML='<strong>0</strong><span>Systems with ecology signals</span>';summary.append(item);}return item;
  }

  function decorate(){
    let activeSystems=0;
    for(const card of grid.querySelectorAll('.exo-cluster-card')){
      const seed=card.querySelector('.exo-cluster-seed')?.textContent.trim();if(!seed)continue;const values=cache.get(seed);
      if(values&&(values.activeEcology>0||values.populated>0||values.ruined>0))activeSystems+=1;
      let note=card.querySelector('[data-cluster-ecology]');
      if(!note){note=document.createElement('p');note.className='exo-authority-note';note.dataset.clusterEcology='true';const open=card.querySelector('.exo-cluster-open');card.insertBefore(note,open||null);}
      note.textContent=`Ecology: ${format(values)}.`;card.dataset.ecologyState=values?'resolved':'unresolved';
    }
    const item=ensureSummary();if(item)item.querySelector('strong').textContent=String(activeSystems);
  }

  const observer=new MutationObserver(()=>decorate());observer.observe(grid,{childList:true,subtree:true});
  document.addEventListener('blacklight:ecology-system-enriched',()=>queueMicrotask(decorate));decorate();
})();