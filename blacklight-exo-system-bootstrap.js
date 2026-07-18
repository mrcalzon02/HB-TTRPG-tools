(() => {
  'use strict';
  const loaded=new Map();
  const load=src=>{
    if(loaded.has(src))return loaded.get(src);
    const existing=document.querySelector(`script[src="${src}"]`);
    if(existing?.dataset.loaded==='true')return Promise.resolve();
    const promise=new Promise((resolve,reject)=>{
      const script=existing||document.createElement('script');
      if(!existing){script.src=src;script.async=false;document.head.append(script);}
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve();},{once:true});
      script.addEventListener('error',()=>reject(new Error(`Unable to load ${src}`)),{once:true});
    });
    loaded.set(src,promise);return promise;
  };
  const loadStyle=href=>new Promise((resolve,reject)=>{
    const existing=document.querySelector(`link[href="${href}"]`);
    if(existing){resolve();return;}
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=()=>reject(new Error(`Unable to load ${href}`));document.head.append(link);
  });
  const idle=callback=>('requestIdleCallback'in window?requestIdleCallback(callback,{timeout:500}):setTimeout(callback,80));
  const status=(message,state='')=>{const target=document.getElementById('exo-cluster-status');if(target){target.textContent=message;target.dataset.state=state;}};
  const disable=(disabled)=>{for(const id of['exo-generate-system','exo-force-populated-hz','exo-generate-cluster','exo-random-cluster']){const item=document.getElementById(id);if(item)item.disabled=disabled;}};
  let clusterReady=false,routeReady=false;

  async function loadCore(){
    status('Loading the lightweight system renderer…','working');disable(true);
    await Promise.all([loadStyle('blacklight-exo-orbital-layout.css'),loadStyle('blacklight-exo-campaign-facilities.css')]);
    await load('blacklight-exo-orbital-layout.js');
    await load('blacklight-exo-sol-campaign-data.js');
    await load('blacklight-exo-system-incremental.js');
    await load('blacklight-exo-solar-system-v6.js');
    await load('blacklight-exo-speed-controls.js');
    document.getElementById('exo-generate-system')?.removeAttribute('disabled');
    status('System renderer ready. Cluster generation, the full satellite catalogue, imagery, ecology, and route mathematics load independently.','ready');
  }

  async function loadEcologyAndImagery(){
    try{
      await load('blacklight-exo-ecology-core.js');
      await load('blacklight-exo-imagery-definitions.js');
      await load('blacklight-exo-imagery-runtime.js');
      await load('blacklight-exo-imagery-terrestrial.js');
      await load('blacklight-exo-imagery-exotic.js');
      await load('blacklight-exo-imagery.js');
      await load('blacklight-exo-solar-ecology-integration.js');
    }catch(error){console.warn('[Blacklight EXO] Optional imagery/ecology layer unavailable:',error);}
  }

  async function loadCluster(){
    if(clusterReady)return;
    const controls=['exo-generate-cluster','exo-random-cluster','exo-force-populated-hz'].map(id=>document.getElementById(id)).filter(Boolean);
    controls.forEach(button=>button.disabled=true);
    status('Loading cluster generation on demand…','working');
    try{
      await load('blacklight-exo-ecology-core.js');
      const nativeRaf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>String(callback).includes('generateCluster(false)')?-1:nativeRaf(callback);
      try{await load('blacklight-exo-cluster.js');}finally{window.requestAnimationFrame=nativeRaf;}
      await load('blacklight-exo-cluster-ecology-integration.js');
      clusterReady=true;
      status('Cluster controller ready. Cluster generation remains explicitly user-triggered.','ready');
    }finally{controls.forEach(button=>button.disabled=false);}
  }

  async function loadRoutes(){
    if(routeReady)return;
    const button=document.getElementById('exo-load-route-tools');if(button)button.disabled=true;
    status('Loading FTL and route-calculation mathematics…','working');
    const scripts=[
      'blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-operational-definitions.js','blacklight-exo-ftl-runtime.js','blacklight-exo-ftl-core.js',
      'blacklight-exo-ftl-engineering-extension.js','blacklight-exo-ftl-path-level-core.js','blacklight-exo-ftl-path-level-paths-physical.js',
      'blacklight-exo-ftl-path-level-paths-dimensional.js','blacklight-exo-ftl-path-level-paths-discrete.js','blacklight-exo-ftl-path-level-runtime.js',
      'blacklight-exo-ftl-path-level-engineering.js','blacklight-exo-ftl-path-level-controller.js','blacklight-exo-cluster-spatial.js',
      'blacklight-exo-jump-calculator-core.js','blacklight-exo-jump-calculator-ui.js'
    ];
    try{
      await loadStyle('blacklight-exo-jump-calculator.css');
      for(const script of scripts)await load(script);
      routeReady=true;if(button)button.textContent='Route and Jump Tools Loaded';
      status('Route and jump-calculation tools ready.','ready');
    }catch(error){console.error('[Blacklight EXO] Route tool loading failed:',error);status(`Route tools failed without stopping the system renderer: ${error.message}`,'error');if(button)button.disabled=false;}
  }

  function installLazyControls(){
    const actions=document.querySelector('.exo-system-actions');
    if(actions&&!document.getElementById('exo-open-stellar-sector')){
      const link=document.createElement('a');link.id='exo-open-stellar-sector';link.className='bli-action';link.href='blacklight-exo-stellar-sector.html';link.textContent='Open Stellar Sector Archive';actions.append(link);
    }
    const clusterButtons=['exo-generate-cluster','exo-random-cluster','exo-force-populated-hz'].map(id=>document.getElementById(id)).filter(Boolean);
    for(const button of clusterButtons)button.addEventListener('click',event=>{
      if(clusterReady)return;
      event.preventDefault();event.stopImmediatePropagation();
      loadCluster().then(()=>button.click()).catch(error=>status(`Cluster layer failed without stopping system inspection: ${error.message}`,'error'));
    },{capture:true});
    const host=document.querySelector('.exo-cluster-controls');
    if(host&&!document.getElementById('exo-load-route-tools')){
      const button=document.createElement('button');button.id='exo-load-route-tools';button.type='button';button.className='bli-action';button.textContent='Load Route and Jump Tools';button.addEventListener('click',loadRoutes);host.append(button);
    }
  }

  function monitorCatalogue(){
    Promise.resolve(globalThis.BlacklightExoMoonCatalogReady).then(summary=>{
      if(summary?.status==='ready'){
        status(`System renderer ready. ${summary.moons} published satellite records are cached; full Sol rendering remains opt-in.`,'ready');
        const active=globalThis.BlacklightExoGetActiveSystem?.();
        if(active&&globalThis.BlacklightExoFixedSystems?.has?.(active.seed))document.getElementById('exo-generate-system')?.click();
      }
      else if(summary?.status==='error')status('System renderer ready with the bundled major-moon fallback. The remote satellite catalogue failed independently.','error');
    }).catch(error=>console.warn('[Blacklight EXO] Moon catalogue monitor failed:',error));
  }

  async function optionalHandoffs(){
    try{await load('blacklight-exo-government-handoff.js');await load('blacklight-exo-ftl-handoff.js');}catch(error){console.warn('[Blacklight EXO] Optional handoff layer unavailable:',error);}
  }

  async function start(){
    try{
      await loadCore();
      installLazyControls();
      monitorCatalogue();
      idle(loadEcologyAndImagery);
      idle(optionalHandoffs);
    }catch(error){
      console.error('[Blacklight EXO] Core system bootstrap failed:',error);
      const empty=document.getElementById('exo-orbit-empty');if(empty)empty.textContent=`The lightweight system renderer could not initialize: ${error.message}`;
      status(`Core system rendering failed: ${error.message}`,'error');
    }finally{document.getElementById('exo-generate-system')?.removeAttribute('disabled');}
  }
  start();
})();