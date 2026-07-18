(() => {
  'use strict';
  const supervisor=()=>globalThis.BlacklightExoRuntimeSupervisor;
  const SOURCES=[
    'https://raw.githubusercontent.com/christoskaramou/PhasmaProjects/ae71047bd6e80054d64c7e6165c48e8d2a653886/PhasmaSpace/Assets/Scripts/solar/moon_catalog.lua',
    'https://cdn.jsdelivr.net/gh/christoskaramou/PhasmaProjects@ae71047bd6e80054d64c7e6165c48e8d2a653886/PhasmaSpace/Assets/Scripts/solar/moon_catalog.lua'
  ];
  const CACHE_KEY='blacklight-exo-jpl-moon-catalog-2026-06-12';
  const SOURCE_LABEL='JPL Solar System Dynamics satellite mean-elements and physical-parameter snapshot';
  const SOURCE_VERSION='2026-06-12';
  const idle=callback=>('requestIdleCallback'in globalThis?requestIdleCallback(callback,{timeout:1800}):setTimeout(callback,650));

  function parseLuaCatalog(text){
    const catalog={};let parent=null;
    for(const rawLine of String(text||'').split(/\r?\n/)){
      const line=rawLine.trim(),parentMatch=line.match(/^C\.([A-Za-z]+)\s*=\s*\{$/);
      if(parentMatch){parent=parentMatch[1];catalog[parent]=[];continue;}
      if(line==='}'){parent=null;continue;}
      if(!parent||!line.startsWith('{ name = '))continue;
      const record={};
      for(const key of['name','jpl_code','ephemeris','frame','tex']){const match=line.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`));if(match)record[key]=match[1];}
      for(const key of['jpl_id','radius_km','a_km','ecc','arg_peri_deg','mean_anomaly_deg','incl','node_deg','period_d','epoch_jd']){const match=line.match(new RegExp(`${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)`));if(match)record[key]=Number(match[1]);}
      record.estimated_radius=/estimated_radius\s*=\s*true/.test(line);if(record.name)catalog[parent].push(record);
    }
    return catalog;
  }

  async function fetchWithTimeout(source,timeoutMs=8000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error('catalogue request timed out')),timeoutMs);
    try{return await fetch(source,{cache:'force-cache',mode:'cors',signal:controller.signal});}finally{clearTimeout(timer);}
  }
  async function fetchPinnedSource(){
    let lastError=null;
    for(const source of SOURCES){
      try{const response=await fetchWithTimeout(source);if(!response.ok)throw new Error(`HTTP ${response.status}`);const text=await response.text();if(!/Generated from JPL Solar System Dynamics/.test(text)||!/C\.Saturn\s*=/.test(text))throw new Error('unexpected catalogue format');return text;}catch(error){lastError=error;}
    }
    throw new Error(`Pinned moon catalogue could not be loaded: ${lastError?.message||'unknown error'}`);
  }
  async function sourceText(){
    try{const cached=localStorage.getItem(CACHE_KEY);if(cached&&/Generated from JPL Solar System Dynamics/.test(cached))return cached;}catch(_){}
    const text=await fetchPinnedSource();try{localStorage.setItem(CACHE_KEY,text);}catch(_){}return text;
  }
  async function loadCatalogue(){
    supervisor()?.start('satellite-catalogue');
    const fixed=globalThis.BlacklightExoFixedSystems;if(!fixed?.installMoonCatalog)throw new Error('Fixed Solar System registry was not initialized');
    const text=await sourceText(),catalog=parseLuaCatalog(text),total=Object.values(catalog).reduce((sum,rows)=>sum+rows.length,0);
    if(total<400||!catalog.Earth?.length||!catalog.Pluto?.length)throw new Error(`Parsed moon catalogue was incomplete (${total} records)`);
    const summary=fixed.installMoonCatalog(catalog,{source:SOURCE_LABEL,version:SOURCE_VERSION});document.dispatchEvent(new CustomEvent('blacklight:moon-catalog-ready',{detail:summary}));supervisor()?.ready('satellite-catalogue',{records:total});return summary;
  }
  function failCatalogue(error){
    supervisor()?.fail('satellite-catalogue',error);globalThis.BlacklightExoFixedSystems?.markCatalogFailure?.(error);
    const summary=globalThis.BlacklightExoFixedSystems?.getCatalogSummary?.()||{status:'error',error:String(error)};document.dispatchEvent(new CustomEvent('blacklight:moon-catalog-error',{detail:summary}));return summary;
  }
  globalThis.BlacklightExoMoonCatalogReady=new Promise(resolve=>idle(()=>loadCatalogue().then(resolve).catch(error=>resolve(failCatalogue(error)))));
})();