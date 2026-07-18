(() => {
  'use strict';
  const base=globalThis.BlacklightExoFixedSystems;
  if(!base||globalThis.BlacklightExoIncrementalSystems)return;
  const MAJOR=new Set(['Moon','Phobos','Deimos','Io','Europa','Ganymede','Callisto','Mimas','Enceladus','Tethys','Dione','Rhea','Titan','Iapetus','Miranda','Ariel','Umbriel','Titania','Oberon','Proteus','Triton','Nereid','Charon','Namaka','Hiʻiaka','Dysnomia']);
  let detailMode='summary';
  function summarize(system){
    if(!system||system.sourceMode!=='published-fixed'||detailMode==='full')return system;
    const deferred={},visible=[];
    for(const parent of system.planets||[]){
      const all=parent.moons||[],keep=all.filter((moon,index)=>MAJOR.has(moon.name)||Number(moon.radiusKm)>=500||index<2),kept=new Set(keep.map(moon=>moon.id));
      deferred[parent.name]=all.filter(moon=>!kept.has(moon.id));
      parent.moons=keep;parent.renderedMoonCount=keep.length;parent.deferredMoonCount=deferred[parent.name].length;
      visible.push(...keep);
    }
    system.deferredMoonCatalog=deferred;
    system.renderedMoonCount=visible.length;
    system.deferredMoonCount=Object.values(deferred).reduce((sum,rows)=>sum+rows.length,0);
    system.catalogue={...(system.catalogue||{}),renderMode:'summary',renderedMoonCount:system.renderedMoonCount,deferredMoonCount:system.deferredMoonCount};
    system.features=[...(system.features||[]),`${system.renderedMoonCount} major or representative satellites are rendered immediately; ${system.deferredMoonCount} additional catalogued satellites remain attached under deferredMoonCatalog until full-detail rendering is explicitly requested.`];
    return system;
  }
  const wrapped=Object.freeze({
    version:`${base.version}-incremental`,
    has:seed=>base.has(seed),
    resolve:seed=>summarize(base.resolve(seed)),
    installMoonCatalog:(catalog,metadata)=>base.installMoonCatalog(catalog,metadata),
    markCatalogFailure:error=>base.markCatalogFailure(error),
    getCatalogSummary:()=>base.getCatalogSummary(),
    setDetailMode(mode){detailMode=mode==='full'?'full':'summary';updateControl();return detailMode;},
    getDetailMode:()=>detailMode
  });
  globalThis.BlacklightExoFixedSystems=wrapped;
  globalThis.BlacklightExoIncrementalSystems=Object.freeze({version:1,setDetailMode:wrapped.setDetailMode,getDetailMode:wrapped.getDetailMode});

  function updateControl(){
    const button=document.getElementById('exo-full-satellite-detail');if(!button)return;
    const full=detailMode==='full';button.setAttribute('aria-pressed',String(full));
    button.textContent=full?'Use Summary Satellite Rendering':'Load Full Satellite Detail';
    button.title=full?'Return to the lightweight representative satellite display.':'Render every catalogued satellite. This is intentionally opt-in because the full Sol record is large.';
  }
  function ensureControl(){
    if(document.getElementById('exo-full-satellite-detail'))return;
    const actions=document.querySelector('.exo-system-actions');if(!actions)return;
    const button=document.createElement('button');button.id='exo-full-satellite-detail';button.type='button';button.className='bli-action';actions.append(button);updateControl();
    button.addEventListener('click',()=>{
      wrapped.setDetailMode(detailMode==='full'?'summary':'full');
      const seed=document.getElementById('exo-seed-input');
      if(detailMode==='full'&&seed&&base.has(seed.value)){const speed=document.getElementById('exo-speed-select');if(speed)speed.value='0';}
      document.getElementById('exo-generate-system')?.click();
    });
  }
  ensureControl();
})();