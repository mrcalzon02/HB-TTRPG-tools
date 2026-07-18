(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselCommandDeck)return;
  const $=id=>document.getElementById(id),frame=$('exo-command-frame'),note=$('exo-command-note');
  const assets={
    styles:['blacklight-exo-vessel-campaign.css','blacklight-exo-vessel-diegetic-controls.css','blacklight-exo-vessel-campaign-damage-editor.css','blacklight-exo-vessel-campaign-voxel-viewer.css'],
    scripts:[
      ['BlacklightExoVesselCampaignStore','blacklight-exo-vessel-campaign-store.js'],
      ['BlacklightExoVesselDiegeticControls','blacklight-exo-vessel-diegetic-controls.js'],
      ['BlacklightExoVesselCampaignDamageEditor','blacklight-exo-vessel-campaign-damage-editor.js'],
      ['BlacklightExoVesselDiegeticSync','blacklight-exo-vessel-diegetic-sync.js'],
      ['BlacklightExoVesselCampaignVoxelViewer','blacklight-exo-vessel-campaign-voxel-viewer.js'],
      ['BlacklightExoVesselCampaignVoxelRouteOverlay','blacklight-exo-vessel-campaign-voxel-route-overlay.js']
    ]
  };
  let report=null,attaching=false;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${ms} ms`)),ms))]);
  function badge(id,state,text){const target=$(id);if(!target)return;target.dataset.state=state;target.textContent=text;}
  function message(text,state='working'){if(note){note.textContent=text;note.dataset.state=state;}}
  function injectStyle(doc,href){if(doc.querySelector(`link[href="${href}"]`))return;const link=doc.createElement('link');link.rel='stylesheet';link.href=href;doc.head.append(link);}
  function injectScript(win,doc,globalName,src){if(win[globalName])return Promise.resolve({src,cached:true});const existing=doc.querySelector(`script[src="${src}"]`);if(existing?.dataset.commandDeckLoaded==='true')return Promise.resolve({src,cached:true});return new Promise((resolve,reject)=>{const script=existing||doc.createElement('script');const ready=()=>{script.dataset.commandDeckLoaded='true';resolve({src,cached:false});};const fail=()=>reject(new Error(`Unable to attach ${src}`));script.addEventListener('load',ready,{once:true});script.addEventListener('error',fail,{once:true});if(!existing){script.src=src;script.async=false;doc.head.append(script);}else if(win[globalName])ready();});}
  async function waitFor(win,predicate,label,limit=25000){const started=Date.now();while(Date.now()-started<limit){const value=predicate();if(value)return value;await sleep(120);}throw new Error(`${label} did not become ready within ${limit} ms`);}
  async function attach(){
    if(attaching)return;attaching=true;const startedAt=new Date().toISOString(),checks=[],failures=[];
    try{
      const win=frame.contentWindow,doc=frame.contentDocument;if(!win||!doc)throw new Error('The vessel frame is not same-origin or did not initialize.');
      badge('exo-command-page','working','vessel page loading');message('Waiting for the canonical vessel generator and VESSEL-09 runtime…');
      await waitFor(win,()=>win.BlacklightExoVessel?.gameplayVersion&&doc.getElementById('exo-vessel-generate'),'canonical vessel generator');
      badge('exo-command-page','ready','vessel page ready');badge('exo-command-gameplay','ready','VESSEL-09 ready');checks.push('canonical-vessel','VESSEL-09');
      for(const href of assets.styles)injectStyle(doc,href);
      message('Attaching persistent campaign storage, instrument controls, reversible damage editing, and the voxel viewer…');
      for(const[globalName,src]of assets.scripts){await injectScript(win,doc,globalName,src);await waitFor(win,()=>win[globalName],globalName,12000);checks.push(globalName);}
      const evidence=await waitFor(win,()=>{const vessel=win.BlacklightExoGetActiveVessel?.(),campaign=doc.getElementById('exo-vessel-campaign-section'),editor=doc.getElementById('exo-vessel-campaign-damage-editor'),viewer=doc.getElementById('exo-vessel-campaign-voxel-viewer'),canvas=doc.getElementById('exo-vessel-campaign-voxel-canvas'),selector=doc.querySelector('.exo-diegetic-selector'),number=doc.querySelector('.exo-diegetic-number');if(vessel?.gameplayModel?.phase==='VESSEL-09'&&campaign&&editor&&viewer&&canvas&&selector&&number)return{vessel,campaign,editor,viewer,canvas,selector,number};return null;},'complete VESSEL-10 interface',25000);
      win.BlacklightExoVesselDiegeticControls?.enhanceAll?.(doc);win.BlacklightExoVesselCampaignVoxelViewer?.render?.(evidence.vessel);win.BlacklightExoVesselCampaignVoxelRouteOverlay?.apply?.(evidence.vessel);
      badge('exo-command-campaign','ready','campaign ready');badge('exo-command-instruments','ready','instruments ready');badge('exo-command-editor','ready','editor ready');badge('exo-command-voxel','ready','voxel ready');message('VESSEL-10 Command Deck ready. The embedded generator retains its canonical authorities while campaign storage, reversible state editing, and placement inspection operate as separate layers.','ready');
      report={recordType:'blacklightExoVesselCommandDeckReport',schemaVersion:'1.0.0',testedAt:new Date().toISOString(),startedAt,page:location.href,frame:frame.src,checks,failures,vessel:{seed:evidence.vessel.seed,name:evidence.vessel.identity?.name,contractValid:evidence.vessel.contract?.validation?.valid,gameplayPhase:evidence.vessel.gameplayModel?.phase,statistics:evidence.vessel.gameplayModel?.statistics?.length,actions:evidence.vessel.gameplayModel?.actions?.length},layers:{campaign:win.BlacklightExoVesselCampaignStore?.version,instruments:win.BlacklightExoVesselDiegeticControls?.version,editor:win.BlacklightExoVesselCampaignDamageEditor?.version,voxel:win.BlacklightExoVesselCampaignVoxelViewer?.version,routeOverlay:win.BlacklightExoVesselCampaignVoxelRouteOverlay?.version},dom:{campaignSection:Boolean(evidence.campaign),editorSection:Boolean(evidence.editor),voxelSection:Boolean(evidence.viewer),selectorPanels:doc.querySelectorAll('.exo-diegetic-selector').length,numberPanels:doc.querySelectorAll('.exo-diegetic-number').length,voxelPlacements:doc.querySelectorAll('#exo-vessel-campaign-voxel-canvas [data-module-id]').length},passed:true};
    }catch(error){failures.push(error.message);for(const id of['exo-command-page','exo-command-gameplay','exo-command-campaign','exo-command-instruments','exo-command-editor','exo-command-voxel'])if(!$(id)?.dataset.state||$(id).dataset.state!=='ready')badge(id,'error','attachment failed');message(`Command Deck attachment failed: ${error.message}`,'error');report={recordType:'blacklightExoVesselCommandDeckReport',schemaVersion:'1.0.0',testedAt:new Date().toISOString(),startedAt,page:location.href,frame:frame?.src,checks,failures,passed:false};}finally{attaching=false;}
  }
  function showDiagnostics(){const panel=$('exo-command-log'),body=$('exo-command-log-body');if(body)body.textContent=JSON.stringify(report||{status:'not-run'},null,2);if(panel)panel.hidden=false;}
  frame?.addEventListener('load',()=>attach());$('exo-command-reload')?.addEventListener('click',()=>{report=null;frame.src=`blacklight-exo-vessel.html?commandDeck=VESSEL-10&reload=${Date.now()}`;});$('exo-command-diagnostics')?.addEventListener('click',showDiagnostics);$('exo-command-log-close')?.addEventListener('click',()=>{$('exo-command-log').hidden=true;});
  const api=Object.freeze({version:1,attach,report:()=>structuredClone(report)});globalThis.BlacklightExoVesselCommandDeck=api;
})();
