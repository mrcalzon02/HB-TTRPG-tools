(() => {
  'use strict';
  const V=globalThis.BlacklightExoVessel,D=globalThis.BlacklightExoVesselGameplayDefinitions,C=globalThis.BlacklightExoVesselGameplayCore;
  if(!V?.gameplayVersion||!D||!C||document.getElementById('exo-vessel-gameplay-section'))return;
  const $=id=>document.getElementById(id),node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==''&&text!=null)element.textContent=String(text);return element;};
  const fmt=(value,digits=2)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:digits});
  let active=null,lastResolution=null;
  function labelControl(title,id,type='select'){const label=node('label');label.append(node('span','',title));const control=document.createElement(type);control.id=id;label.append(control);return{label,control};}
  function addControls(){
    const grid=document.querySelector('.exo-vessel-control-grid');if(!grid||$('exo-vessel-gameplay-mode'))return;
    const mode=labelControl('RPG validation','exo-vessel-gameplay-mode');mode.control.add(new Option('Repair deterministically','REPAIR'));mode.control.add(new Option('Reject invalid gameplay record','STRICT'));
    const resolution=labelControl('RPG resolution view','exo-vessel-gameplay-resolution');resolution.control.add(new Option('Simplified percentile','SIMPLIFIED'));resolution.control.add(new Option('Detailed percentile','DETAILED'));
    const difficulty=labelControl('Default action difficulty','exo-vessel-gameplay-difficulty','input');difficulty.control.type='number';difficulty.control.min='0';difficulty.control.max='100';difficulty.control.step='1';difficulty.control.value=D.defaults.difficultyPercent;
    for(const item of[mode,resolution,difficulty]){grid.append(item.label);item.control.addEventListener('change',()=>$('exo-vessel-generate')?.click());}
  }
  function card(label,title,body,state=''){const article=node('article','exo-vessel-card');if(state)article.dataset.state=state;article.append(node('small','',label),node('h3','',title),node('p','',body));return article;}
  function table(headers,bodyId){const wrap=node('div','exo-vessel-table-wrap'),table=node('table','exo-vessel-table'),head=node('thead'),row=node('tr');for(const text of headers)row.append(node('th','',text));head.append(row);const body=node('tbody');body.id=bodyId;table.append(head,body);wrap.append(table);return wrap;}
  function build(){
    const section=node('section','bli-section');section.id='exo-vessel-gameplay-section';const head=node('div','bli-section-head');head.append(node('p','bli-eyebrow','Charles // VESSEL-09 RPG statistics and action economy'),node('h2','','Operate the vessel from one traceable stat and action authority.'),node('p','','Ten normalized statistics retain their physical source paths. Navigation, sensor and targeting, offensive, defensive, engineering, and damage-control actions all use the same deterministic percentile odds in simplified and detailed play.'));
    const actions=node('div','bli-actions'),exportButton=node('button','bli-action','Export RPG Model');exportButton.type='button';exportButton.id='exo-vessel-export-gameplay';actions.append(exportButton);head.append(actions);
    const statGrid=node('div','exo-vessel-grid');statGrid.id='exo-vessel-gameplay-stat-grid';const resourceGrid=node('div','exo-vessel-grid');resourceGrid.id='exo-vessel-gameplay-resource-grid';
    const actionTable=table(['Category','Action','Stat','Availability','Time','Chance','Resource cost'],'exo-vessel-gameplay-action-body');
    const resolver=node('div','exo-vessel-control-grid');resolver.id='exo-vessel-gameplay-resolver';const action=labelControl('Action','exo-vessel-gameplay-action');const difficulty=labelControl('Difficulty','exo-vessel-gameplay-resolve-difficulty','input');difficulty.control.type='number';difficulty.control.min='0';difficulty.control.max='100';difficulty.control.value='50';const opposition=labelControl('Opposition','exo-vessel-gameplay-opposition','input');opposition.control.type='number';opposition.control.min='0';opposition.control.max='100';opposition.control.value='50';const sequence=labelControl('Resolution sequence','exo-vessel-gameplay-sequence','input');sequence.control.type='number';sequence.control.min='1';sequence.control.step='1';sequence.control.value='1';const resolveButton=node('button','bli-action primary','Resolve Selected Action');resolveButton.type='button';resolveButton.id='exo-vessel-gameplay-resolve';resolver.append(action.label,difficulty.label,opposition.label,sequence.label,resolveButton);
    const result=node('pre','exo-vessel-code-block','No action resolved.');result.id='exo-vessel-gameplay-result';section.append(head,statGrid,resourceGrid,actionTable,resolver,result);
    const anchor=$('exo-vessel-damage-section')||$('exo-vessel-weapon-section')||$('exo-vessel-track-section')||document.querySelector('.exo-vessel-overview');if(anchor)anchor.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
    exportButton.addEventListener('click',exportGameplay);resolveButton.addEventListener('click',resolveSelected);
  }
  function loadVessel10Layers(){
    const styles=['blacklight-exo-vessel-campaign.css','blacklight-exo-vessel-diegetic-controls.css','blacklight-exo-vessel-campaign-damage-editor.css','blacklight-exo-vessel-campaign-voxel-viewer.css'];
    const scripts=['blacklight-exo-vessel-campaign-store.js','blacklight-exo-vessel-diegetic-controls.js','blacklight-exo-vessel-diegetic-sync.js','blacklight-exo-vessel-campaign-damage-editor.js','blacklight-exo-vessel-campaign-voxel-viewer.js','blacklight-exo-vessel-campaign-voxel-route-overlay.js'];
    for(const href of styles)if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);}
    let chain=Promise.resolve();
    for(const src of scripts)chain=chain.then(()=>new Promise((resolve,reject)=>{const existing=document.querySelector(`script[src="${src}"]`);if(existing){if(existing.dataset.exoLoaded==='true'||existing.readyState==='complete')resolve();else{existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Unable to load ${src}.`)),{once:true});}return;}const script=document.createElement('script');script.src=src;script.async=false;script.addEventListener('load',()=>{script.dataset.exoLoaded='true';resolve();},{once:true});script.addEventListener('error',()=>reject(new Error(`Unable to load ${src}.`)),{once:true});document.head.append(script);}));
    chain.then(()=>document.dispatchEvent(new CustomEvent('blacklight:exo-vessel-v10-ready',{detail:{styles:[...styles],scripts:[...scripts]}}))).catch(error=>{console.error('[Blacklight EXO] VESSEL-10 layer load failed.',error);globalThis.BlacklightExoRuntimeSupervisor?.fail?.('vessel-10-interface',error);});
    return chain;
  }
  function replaceCards(id,rows){$(id)?.replaceChildren(...rows.map(row=>card(...row)));}
  function row(body,values){const tr=node('tr');for(const value of values)tr.append(node('td','',value));body?.append(tr);}
  function costs(action){return action.resourceCosts.length?action.resourceCosts.map(item=>`${item.resourceKey} ${fmt(item.amount)}`).join(' · '):'none';}
  function render(vessel){
    const model=vessel?.gameplayModel;if(!model)return;active=vessel;
    replaceCards('exo-vessel-gameplay-stat-grid',model.statistics.map(stat=>[stat.domain.replaceAll('-',' '),`${stat.label} ${fmt(stat.value,1)}`,`${stat.band}. ${stat.sourceLinks.slice(0,3).map(item=>item.path).join('; ')}.`,stat.available?'ok':'warning']));
    replaceCards('exo-vessel-gameplay-resource-grid',model.resources.pools.map(pool=>['Resource',pool.label,`${fmt(pool.current)} / ${fmt(pool.maximum)} ${pool.unit}; refresh ${fmt(pool.refreshPerTacticalRound)} per tactical round.`,pool.current>0?'ok':'warning']));
    const body=$('exo-vessel-gameplay-action-body');body?.replaceChildren();for(const action of model.actions)row(body,[action.category.replaceAll('_',' '),action.label,action.statKey,action.available?'READY':`UNAVAILABLE: ${action.availabilityReasons.join(', ')}`,`${fmt(action.durationSeconds)} s`,`${fmt(action.successProbabilityPercent,1)}%`,costs(action)]);
    const select=$('exo-vessel-gameplay-action');select?.replaceChildren();for(const action of model.actions){const option=new Option(`${action.category.replaceAll('_',' ')} · ${action.label}`,action.actionId);option.disabled=!action.available;select?.add(option);}const first=model.actions.find(item=>item.available);if(first&&select)select.value=first.actionId;
    $('exo-vessel-gameplay-result').textContent=lastResolution?JSON.stringify(lastResolution,null,2):`Shared percentile authority ready. ${model.actions.filter(item=>item.available).length} of ${model.actions.length} actions are currently available.`;
  }
  function resolveSelected(){if(!active?.gameplayModel)return;const actionId=$('exo-vessel-gameplay-action')?.value;if(!actionId)return;const mode=$('exo-vessel-gameplay-resolution')?.value||'SIMPLIFIED';lastResolution=C.resolveAction(active.gameplayModel,actionId,{mode,difficultyPercent:Number($('exo-vessel-gameplay-resolve-difficulty')?.value||50),oppositionPercent:Number($('exo-vessel-gameplay-opposition')?.value||50),sequence:Number($('exo-vessel-gameplay-sequence')?.value||1)});$('exo-vessel-gameplay-result').textContent=JSON.stringify(lastResolution,null,2);}
  function exportGameplay(){const record=active?.gameplayModel;if(!record)return;const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${active.seed}-gameplay-model.json`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  addControls();build();document.addEventListener('blacklight:exo-vessel-generated',event=>render(event.detail?.vessel));queueMicrotask(()=>{render(globalThis.BlacklightExoGetActiveVessel?.());loadVessel10Layers();});
})();
