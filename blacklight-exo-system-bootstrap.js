(() => {
  'use strict';
  const loaded=new Map();
  const styles=new Map();
  const buttonIds=['exo-generate-system','exo-force-populated-hz','exo-generate-cluster','exo-random-cluster'];
  let clusterReady=false,clusterLoading=null,routeReady=false,imageryReady=false,supervisor=null;

  const status=(message,state='')=>{const target=document.getElementById('exo-cluster-status');if(target){target.textContent=message;target.dataset.state=state;}};
  const setDisabled=(ids,disabled)=>ids.forEach(id=>{const item=document.getElementById(id);if(item)item.disabled=disabled;});
  const idle=callback=>('requestIdleCallback' in window?requestIdleCallback(callback,{timeout:900}):setTimeout(callback,180));
  const phase=name=>supervisor?.start(name);
  const ready=(name,details={})=>supervisor?.ready(name,details);
  const fail=(name,error,details={})=>supervisor?.fail(name,error,details);

  function load(src){
    if(loaded.has(src))return loaded.get(src);
    phase(`script:${src}`);
    const promise=new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[src="${src}"]`);
      if(existing?.dataset.blacklightLoaded==='true'){ready(`script:${src}`,{cached:true});resolve();return;}
      const script=existing||document.createElement('script');
      const complete=()=>{script.dataset.blacklightLoaded='true';ready(`script:${src}`);resolve();};
      if(existing&&existing.readyState==='complete'){complete();return;}
      script.addEventListener('load',complete,{once:true});
      script.addEventListener('error',()=>{const error=new Error(`Unable to load ${src}`);fail(`script:${src}`,error);reject(error);},{once:true});
      if(!existing){script.src=src;script.async=false;document.head.append(script);}
    });
    loaded.set(src,promise);return promise;
  }

  function loadStyle(href){
    if(styles.has(href))return styles.get(href);
    const promise=new Promise((resolve,reject)=>{
      const existing=document.querySelector(`link[href="${href}"]`);
      if(existing){resolve();return;}
      const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=()=>reject(new Error(`Unable to load ${href}`));document.head.append(link);
    });
    styles.set(href,promise);return promise;
  }

  async function loadCore(){
    phase('solar-core');status('Loading the lightweight system renderer…','working');setDisabled(buttonIds,true);
    try{
      await Promise.all([loadStyle('blacklight-exo-orbital-layout.css'),loadStyle('blacklight-exo-campaign-facilities.css')]);
      await load('blacklight-exo-orbital-layout.js');
      await load('blacklight-exo-sol-campaign-data.js');
      await load('blacklight-exo-system-incremental.js');
      await load('blacklight-exo-solar-system-v6.js');
      await load('blacklight-exo-speed-controls.js');
      setDisabled(['exo-generate-system'],false);
      ready('solar-core',{mode:'lightweight'});
      status('System renderer ready. Cluster generation, the full satellite display, imagery, ecology, and route mathematics remain separate opt-in layers.','ready');
    }catch(error){fail('solar-core',error);throw error;}
  }

  async function loadEcologyAndImagery(){
    if(imageryReady)return;
    phase('imagery-ecology');const button=document.getElementById('exo-load-imagery-ecology');if(button)button.disabled=true;
    status('Loading imagery and ecology on demand…','working');
    try{
      for(const script of['blacklight-exo-ecology-core.js','blacklight-exo-imagery-definitions.js','blacklight-exo-imagery-runtime.js','blacklight-exo-imagery-terrestrial.js','blacklight-exo-imagery-exotic.js','blacklight-exo-imagery.js','blacklight-exo-solar-ecology-integration.js'])await load(script);
      imageryReady=true;if(button)button.textContent='Imagery and Ecology Loaded';ready('imagery-ecology');
      status('Imagery and ecology are available. Core system inspection remained usable during loading.','ready');
      const active=globalThis.BlacklightExoGetActiveSystem?.();if(active)globalThis.BlacklightExoSelectObject?.('star');
    }catch(error){fail('imagery-ecology',error);console.warn('[Blacklight EXO] Optional imagery/ecology layer unavailable:',error);status(`Imagery and ecology failed without stopping system inspection: ${error.message}`,'error');if(button)button.disabled=false;}
  }

  async function loadCluster(){
    if(clusterReady)return;if(clusterLoading)return clusterLoading;
    phase('cluster-layer');const controls=['exo-generate-cluster','exo-random-cluster','exo-force-populated-hz'];setDisabled(controls,true);
    status('Loading cluster generation on demand…','working');globalThis.BlacklightExoDeferClusterAutostart=true;
    clusterLoading=(async()=>{
      try{
        await load('blacklight-exo-cluster.js');
        if(globalThis.BlacklightExoEcologyClusterCache instanceof Map)await load('blacklight-exo-cluster-ecology-integration.js');
        clusterReady=true;ready('cluster-layer');
        status('Cluster controller ready. Child-system summaries are generated from records without repeatedly rendering complete orbital displays.','ready');
      }catch(error){fail('cluster-layer',error);throw error;}
      finally{setDisabled(controls,false);clusterLoading=null;}
    })();
    return clusterLoading;
  }

  async function loadRoutes(){
    if(routeReady)return;phase('route-tools');
    const button=document.getElementById('exo-load-route-tools');if(button)button.disabled=true;
    status('Loading FTL and route-calculation mathematics…','working');
    const scripts=['blacklight-exo-ftl-physics-definitions.js','blacklight-exo-ftl-operational-definitions.js','blacklight-exo-ftl-runtime.js','blacklight-exo-ftl-core.js','blacklight-exo-ftl-engineering-extension.js','blacklight-exo-ftl-path-level-core.js','blacklight-exo-ftl-path-level-paths-physical.js','blacklight-exo-ftl-path-level-paths-dimensional.js','blacklight-exo-ftl-path-level-paths-discrete.js','blacklight-exo-ftl-path-level-runtime.js','blacklight-exo-ftl-path-level-engineering.js','blacklight-exo-ftl-path-level-controller.js','blacklight-exo-cluster-spatial.js','blacklight-exo-jump-calculator-core.js','blacklight-exo-jump-calculator-ui.js'];
    try{
      await loadStyle('blacklight-exo-jump-calculator.css');for(const script of scripts)await load(script);
      routeReady=true;ready('route-tools');if(button)button.textContent='Route and Jump Tools Loaded';status('Route and jump-calculation tools ready.','ready');
    }catch(error){fail('route-tools',error);console.error('[Blacklight EXO] Route tool loading failed:',error);status(`Route tools failed without stopping the system renderer: ${error.message}`,'error');if(button)button.disabled=false;}
  }

  function addActionButton(id,text,handler){const actions=document.querySelector('.exo-system-actions');if(!actions||document.getElementById(id))return;const button=document.createElement('button');button.id=id;button.type='button';button.className='bli-action';button.textContent=text;button.addEventListener('click',handler);actions.append(button);}
  function installLazyControls(){
    const actions=document.querySelector('.exo-system-actions');
    if(actions&&!document.getElementById('exo-open-stellar-sector')){const link=document.createElement('a');link.id='exo-open-stellar-sector';link.className='bli-action';link.href='blacklight-exo-stellar-sector.html';link.textContent='Open Stellar Sector Generator';actions.append(link);}
    addActionButton('exo-load-imagery-ecology','Load Imagery and Ecology',loadEcologyAndImagery);
    const clusterButtons=['exo-generate-cluster','exo-random-cluster','exo-force-populated-hz'].map(id=>document.getElementById(id)).filter(Boolean);
    for(const button of clusterButtons)button.addEventListener('click',event=>{if(clusterReady)return;event.preventDefault();event.stopImmediatePropagation();loadCluster().then(()=>button.click()).catch(error=>status(`Cluster layer failed without stopping system inspection: ${error.message}`,'error'));},{capture:true});
    setDisabled(clusterButtons.map(button=>button.id),false);
    const host=document.querySelector('.exo-cluster-controls');if(host&&!document.getElementById('exo-load-route-tools')){const button=document.createElement('button');button.id='exo-load-route-tools';button.type='button';button.className='bli-action';button.textContent='Load Route and Jump Tools';button.addEventListener('click',loadRoutes);host.append(button);}
  }

  function monitorCatalogue(){
    phase('satellite-catalogue-monitor');
    Promise.resolve(globalThis.BlacklightExoMoonCatalogReady).then(summary=>{
      if(summary?.status==='ready'){
        ready('satellite-catalogue-monitor',{records:summary.moons});status(`System renderer ready. ${summary.moons} published satellite records are cached; full Sol rendering remains opt-in.`,'ready');
        const active=globalThis.BlacklightExoGetActiveSystem?.();if(active&&globalThis.BlacklightExoFixedSystems?.has?.(active.seed))document.getElementById('exo-generate-system')?.click();
      }else{ready('satellite-catalogue-monitor',{fallback:true});if(summary?.status==='error')status('System renderer ready with the bundled major-moon fallback. The remote satellite catalogue failed independently.','error');}
    }).catch(error=>{fail('satellite-catalogue-monitor',error);console.warn('[Blacklight EXO] Moon catalogue monitor failed:',error);});
  }

  async function optionalHandoffs(){
    phase('handoff-layer');
    try{await load('blacklight-exo-government-handoff.js');await load('blacklight-exo-ftl-handoff.js');ready('handoff-layer');}catch(error){fail('handoff-layer',error);console.warn('[Blacklight EXO] Optional handoff layer unavailable:',error);}
  }

  async function start(){
    try{
      await load('blacklight-exo-runtime-supervisor.js');supervisor=globalThis.BlacklightExoRuntimeSupervisor;phase('solar-bootstrap');
      await loadCore();installLazyControls();monitorCatalogue();idle(optionalHandoffs);ready('solar-bootstrap');
    }catch(error){
      fail('solar-bootstrap',error);console.error('[Blacklight EXO] Core system bootstrap failed:',error);
      const empty=document.getElementById('exo-orbit-empty');if(empty)empty.textContent=`The lightweight system renderer could not initialize: ${error.message}`;status(`Core system rendering failed: ${error.message}`,'error');
    }finally{setDisabled(['exo-generate-system'],false);}
  }
  start();
})();