(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselDiegeticSync)return;

  const $=id=>document.getElementById(id);
  const node=(tag,className='',text='')=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==''&&text!=null)element.textContent=String(text);return element;};
  const CORE_CONTROL_IDS=new Set(['exo-vessel-seed','exo-vessel-family','exo-vessel-path','exo-vessel-role','exo-vessel-biology','exo-vessel-defense','exo-vessel-crew','exo-vessel-endurance','exo-vessel-reserve','exo-vessel-distance','exo-vessel-payload']);

  function installControlTriage(){
    const primary=document.querySelector('.exo-vessel-controls .exo-vessel-control-grid');
    if(!primary||$('exo-vessel-advanced-controls'))return;
    primary.classList.add('exo-vessel-primary-controls');

    const details=node('details','exo-vessel-advanced-controls');details.id='exo-vessel-advanced-controls';
    const summary=node('summary','','Advanced simulation & validation');
    const intro=node('p','exo-vessel-advanced-intro','Target models, validation modes, combat assumptions, spatial tuning and RPG test controls remain available here without competing with the vessel mission definition.');
    const advanced=node('div','exo-vessel-advanced-control-grid');advanced.id='exo-vessel-advanced-control-grid';
    details.append(summary,intro,advanced);
    primary.insertAdjacentElement('afterend',details);

    const route=label=>{
      if(!label?.matches?.('label'))return;
      const control=label.querySelector('select,input,textarea');
      if(control?.id&&!CORE_CONTROL_IDS.has(control.id))advanced.append(label);
    };
    for(const label of [...primary.children])route(label);

    const observer=new MutationObserver(records=>{
      for(const record of records)for(const added of record.addedNodes)if(added.nodeType===1)route(added);
    });
    observer.observe(primary,{childList:true});
  }

  function routeContextActions(){
    const routes=[
      ['exo-vessel-save-manufacturer','exo-vessel-manufacturer-section'],
      ['exo-vessel-export-manufacturer','exo-vessel-manufacturer-section'],
      ['exo-vessel-export-module-graph','exo-vessel-module-graph-section'],
      ['exo-vessel-export-voxel-layout','exo-vessel-voxel-section']
    ];
    for(const [buttonId,sectionId] of routes){
      const button=$(buttonId),section=$(sectionId);if(!button||!section||section.contains(button))continue;
      const head=section.querySelector(':scope > .bli-section-head');if(!head)continue;
      let actions=head.querySelector(':scope > .bli-actions');
      if(!actions){actions=node('div','bli-actions exo-vessel-context-actions');head.append(actions);}
      actions.append(button);
    }
    const viewer=$('exo-vessel-open-3d-hero');if(viewer)viewer.textContent='Open 3D Viewer';
  }

  function installContextActionRouting(){
    routeContextActions();
    const hero=document.querySelector('.exo-vessel-hero .bli-actions');
    const shell=document.querySelector('.exo-vessel-shell');
    if(hero)new MutationObserver(routeContextActions).observe(hero,{childList:true});
    if(shell)new MutationObserver(routeContextActions).observe(shell,{childList:true,subtree:true});
  }

  function installEquipmentLink(){
    const nav=document.querySelector('.bli-topbar .bli-nav');if(!nav)return;
    const href='blacklight-equipment-catalog.html';
    if(nav.querySelector(`a[href="${href}"]`))return;
    const link=node('a','','Equipment');link.href=href;
    const archive=nav.querySelector('a[href="blacklight-systems-black.html"]');
    nav.insertBefore(link,archive);
  }

  const refresh=()=>queueMicrotask(()=>{
    const editor=$('exo-vessel-campaign-damage-editor');
    if(editor)globalThis.BlacklightExoVesselDiegeticControls?.refreshAll(editor);
  });

  installControlTriage();
  installContextActionRouting();
  installEquipmentLink();
  document.addEventListener('change',event=>{if(event.target?.closest?.('#exo-vessel-campaign-damage-editor'))refresh();});
  document.addEventListener('blacklight:exo-vessel-activate',refresh);
  document.addEventListener('blacklight:exo-vessel-generated',()=>{routeContextActions();refresh();});
  document.addEventListener('blacklight:exo-vessel-v10-ready',refresh);
  globalThis.BlacklightExoVesselDiegeticSync=Object.freeze({version:3,refresh});
})();