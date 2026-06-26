(() => {
  'use strict';
  const MODULES=[
    ['npc-profile-generator-group-data.js','NpcProfileGeneratorGroupData'],
    ['npc-group-generator-foundation.js','NpcGroupGeneratorFoundation'],
    ['npc-group-generator-core.js','NpcGroupGeneratorCore'],
    ['npc-profile-generator-group-ui.js','NpcProfileGeneratorGroupUI']
  ];
  const REQUIRED_DATA_FLAGS=['depthDataLoaded','householdDataLoaded','operationDataLoaded','mechanicsDataLoaded'];

  function loadScript(src,globalName){
    if(globalThis[globalName])return Promise.resolve();
    const selector=`script[src="${src}"],script[data-npc-source="${src}"],script[data-npc-group-source="${src}"]`;
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
      script.dataset.npcGroupSource=src;
      script.addEventListener('load',resolve,{once:true});
      script.addEventListener('error',()=>reject(new Error(`Could not load ${src}.`)),{once:true});
      document.body.appendChild(script);
    });
  }

  async function loadModules(){for(const[source,globalName]of MODULES)await loadScript(source,globalName);}
  function workspaceReady(workspace){
    return Boolean(workspace)&&REQUIRED_DATA_FLAGS.every(flag=>workspace[flag]===true)&&workspace.customPackBootstrapApplied===true;
  }
  function status(message,tone='error'){
    const element=document.getElementById('npc-generator-status');
    if(!element)return;
    element.textContent=message;
    element.dataset.tone=tone;
  }

  async function applyWhenReady(){
    try{await loadModules();}
    catch(error){status(`Group and roster tools failed to initialize: ${error.message}`);return;}
    let checks=0;
    const timer=window.setInterval(async()=>{
      checks+=1;
      const workspace=globalThis.NpcProfileGeneratorWorkspace;
      if(workspace?.groupBootstrapApplied){window.clearInterval(timer);return;}
      if(!workspaceReady(workspace)){
        if(checks>=600){window.clearInterval(timer);status('Group and roster tools could not apply because the NPC workspace or campaign packs did not finish loading.');}
        return;
      }
      workspace.groupBootstrapApplied=true;
      window.clearInterval(timer);
      try{
        await globalThis.NpcProfileGeneratorGroupUI.enrich(workspace);
      }catch(error){
        workspace.groupBootstrapApplied=false;
        status(`Group and roster tools failed to apply: ${error.message}`);
      }
    },100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyWhenReady,{once:true});
  else applyWhenReady();

  globalThis.NpcProfileGeneratorGroupBootstrap=Object.freeze({MODULES,REQUIRED_DATA_FLAGS,loadModules,workspaceReady,applyWhenReady});
})();
