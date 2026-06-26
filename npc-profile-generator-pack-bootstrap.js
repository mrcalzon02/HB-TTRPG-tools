(() => {
  'use strict';
  const MODULES=[
    ['npc-profile-generator-pack-validator.js','NpcProfileGeneratorPackValidator'],
    ['npc-profile-generator-pack-manager.js','NpcProfileGeneratorPackManager'],
    ['npc-profile-generator-pack-storage.js','NpcProfileGeneratorPackStorage'],
    ['npc-profile-generator-pack-ui.js','NpcProfileGeneratorPackUI']
  ];
  const REQUIRED_DATA_FLAGS=['depthDataLoaded','householdDataLoaded','operationDataLoaded','mechanicsDataLoaded'];

  function loadScript(src,globalName){
    if(globalThis[globalName])return Promise.resolve();
    const selector=`script[src="${src}"],script[data-npc-source="${src}"]`;
    const existing=document.querySelector(selector);
    if(existing)return new Promise((resolve,reject)=>{
      if(globalThis[globalName]){resolve();return;}
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}.`)),{once:true});
    });
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.defer=true;
      script.dataset.npcPackSource=src;
      script.addEventListener('load',resolve,{once:true});
      script.addEventListener('error',()=>reject(new Error(`Could not load ${src}.`)),{once:true});
      document.body.appendChild(script);
    });
  }

  async function loadModules(){for(const[source,globalName]of MODULES)await loadScript(source,globalName);}
  function baseDataReady(workspace){return REQUIRED_DATA_FLAGS.every(flag=>workspace?.[flag]===true);}

  function status(message,tone='error'){
    const element=document.getElementById('npc-generator-status');
    if(!element)return;
    element.textContent=message;
    element.dataset.tone=tone;
  }

  async function applyWhenReady(){
    try{await loadModules();}
    catch(error){status(`Custom campaign packs failed to initialize: ${error.message}`);return;}
    let checks=0;
    const timer=window.setInterval(async()=>{
      checks+=1;
      const workspace=globalThis.NpcProfileGeneratorWorkspace;
      if(!workspace){
        if(checks>=600){window.clearInterval(timer);status('Custom campaign packs could not find the NPC workspace.');}
        return;
      }
      if(workspace.customPackBootstrapApplied){window.clearInterval(timer);return;}
      if(!baseDataReady(workspace)){
        if(checks>=600){window.clearInterval(timer);status('Custom campaign packs could not apply because core NPC data did not finish loading.');}
        return;
      }
      workspace.customPackBootstrapApplied=true;
      window.clearInterval(timer);
      try{
        await globalThis.NpcProfileGeneratorPackUI.enrich(workspace);
      }catch(error){
        workspace.customPackBootstrapApplied=false;
        status(`Custom campaign packs failed to apply: ${error.message}`);
      }
    },100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyWhenReady,{once:true});
  else applyWhenReady();

  globalThis.NpcProfileGeneratorPackBootstrap=Object.freeze({MODULES,REQUIRED_DATA_FLAGS,loadModules,baseDataReady,applyWhenReady});
})();
