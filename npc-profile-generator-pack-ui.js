(() => {
  'use strict';
  const Manager=globalThis.NpcProfileGeneratorPackManager;
  const PackStorage=globalThis.NpcProfileGeneratorPackStorage;
  const Renderer=globalThis.NpcProfileGeneratorRenderer;
  if(!Manager||!PackStorage)throw new Error('Custom pack manager and storage must load before pack UI.');

  function ensureStyles(){
    if(document.querySelector('link[data-npc-pack-style]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='npc-profile-generator-pack.css';link.dataset.npcPackStyle='true';document.head.appendChild(link);
  }
  function button(label,className='secondary-action'){
    const element=document.createElement('button');element.type='button';element.className=className;element.textContent=label;return element;
  }
  function problemText(diagnostics){return(diagnostics||[]).filter(item=>item.severity==='error').map(item=>item.message||item.code).join(' ')||'Unknown custom-pack error.';}
  function createOption(value,label){const option=document.createElement('option');option.value=value;option.textContent=label;return option;}

  function customArchetypeIds(packs){return(packs||[]).flatMap(pack=>(pack.archetypes||[]).map(archetype=>archetype.id));}
  function refreshControls(workspace,packs){
    const archetypes=workspace.data?.policies?.archetypes||[];
    const records=new Map(archetypes.map(record=>[record.id,record]));
    const archetypeSelect=workspace.controls?.['npc-archetype'];
    if(archetypeSelect){
      const selected=archetypeSelect.value;
      archetypeSelect.innerHTML='';
      const ids=[...(workspace.baseFirstReleaseIds||[]),...customArchetypeIds(packs)];
      for(const id of [...new Set(ids)]){const record=records.get(id);if(record)archetypeSelect.appendChild(createOption(id,record.label||Renderer?.labelFor?.(id)||id));}
      archetypeSelect.value=records.has(selected)&&ids.includes(selected)?selected:archetypeSelect.options[0]?.value||'';
    }
    const ancestrySelect=workspace.controls?.['npc-ancestry'];
    if(ancestrySelect){
      const selected=ancestrySelect.value;ancestrySelect.innerHTML='';ancestrySelect.appendChild(createOption('','Random ancestry'));
      for(const id of workspace.pack.tables?.ancestries||[]){const custom=workspace.pack.customAncestries?.[id];ancestrySelect.appendChild(createOption(id,custom?.label||Renderer?.labelFor?.(id)||id));}
      if([...ancestrySelect.options].some(option=>option.value===selected))ancestrySelect.value=selected;
    }
    workspace.updateConditionalControls?.();
  }

  function applyRuntime(workspace,result,packs,reason){
    if(!result.valid){workspace.setStatus?.(`Custom packs were not applied: ${problemText(result.diagnostics)}`,'error');return false;}
    workspace.pack=result.pack;
    workspace.data.policies.archetypes=result.archetypes;
    workspace.installedCustomPacks=packs;
    refreshControls(workspace,packs);
    workspace.generate?.(reason||'custom-packs-rebuilt');
    return true;
  }

  function rebuildInstalled(workspace,reason='custom-packs-rebuilt'){
    const listed=PackStorage.listPacks(globalThis.localStorage);
    const result=Manager.rebuild(workspace.customPackBasePack,workspace.customPackBaseArchetypes,listed.packs);
    return{ok:applyRuntime(workspace,result,listed.packs,reason),result,listed};
  }

  function renderManager(workspace){
    const target=workspace.controls?.['npc-pack-list'];if(!target)return;
    const listed=PackStorage.listPacks(globalThis.localStorage);target.innerHTML='';
    if(!listed.records.length){target.innerHTML='<p class="module-empty">No custom campaign packs are installed in this browser.</p>';return;}
    for(const record of listed.records){
      const pack=record.pack;const row=document.createElement('article');row.className='npc-pack-row';
      const info=document.createElement('div');const title=document.createElement('h3');title.textContent=pack.title;
      const meta=document.createElement('p');meta.textContent=`${pack.packId} · Version ${pack.version}`;
      const description=document.createElement('p');description.textContent=pack.description;
      const summary=document.createElement('div');summary.className='npc-pack-summary';
      const counts=[['ancestries',(pack.ancestries||[]).length],['archetypes',(pack.archetypes||[]).length],['tables',Object.keys(pack.tables||{}).length],['operations',Object.keys(pack.operationModules||{}).length],['mechanics',Object.keys(pack.mechanicalPackages||{}).length]];
      counts.forEach(([name,count])=>{const chip=document.createElement('span');chip.className='chip';chip.textContent=`${count} ${name}`;summary.appendChild(chip);});
      info.append(title,meta,description,summary);
      const actions=document.createElement('div');actions.className='npc-pack-row-actions';
      const remove=button('Remove','danger-action');remove.addEventListener('click',()=>{
        const result=PackStorage.removePack(globalThis.localStorage,pack.packId);
        if(!result.ok){workspace.setStatus?.(`Pack removal failed: ${problemText(result.diagnostics)}`,'error');return;}
        const rebuilt=rebuildInstalled(workspace,'custom-pack-removed');
        workspace.setStatus?.(rebuilt.ok?`${pack.title} removed.`:`Pack rebuild failed: ${problemText(rebuilt.result.diagnostics)}`,rebuilt.ok?'success':'error');
        renderManager(workspace);
      });
      actions.appendChild(remove);row.append(info,actions);target.appendChild(row);
    }
  }

  async function importFile(workspace,file){
    if(!file)return;
    try{
      const parsed=PackStorage.parsePack(await file.text());
      if(!parsed.pack){workspace.setStatus?.(`Pack import rejected: ${problemText(parsed.diagnostics)}`,'error');return;}
      const result=PackStorage.installPack(globalThis.localStorage,workspace.customPackBasePack,workspace.customPackBaseArchetypes,parsed.pack);
      if(!result.ok){workspace.setStatus?.(`Pack import rejected: ${problemText(result.diagnostics)}`,'error');return;}
      const packs=PackStorage.listPacks(globalThis.localStorage).packs;
      applyRuntime(workspace,result,packs,'custom-pack-installed');
      workspace.setStatus?.(`${parsed.pack.title} installed and applied.`,'success');
      renderManager(workspace);
    }catch(error){workspace.setStatus?.(`Pack import failed: ${error.message}`,'error');}
    finally{if(workspace.controls?.['npc-pack-file'])workspace.controls['npc-pack-file'].value='';}
  }

  function installControls(workspace){
    if(workspace.packUiInstalled)return;
    const controls=workspace.root.querySelector('.npc-generator-controls');if(!controls)return;
    const section=document.createElement('section');section.className='npc-pack-actions';section.setAttribute('aria-labelledby','npc-pack-title');
    section.innerHTML='<h3 id="npc-pack-title">Custom Campaign Packs</h3><p>Install validated JSON packs that add campaign names, ancestries, archetypes, tables, operations, and mechanics without changing core scripts.</p>';
    const row=document.createElement('div');row.className='npc-control-row';const importButton=button('Import Pack','primary-action');importButton.id='npc-import-pack';const manageButton=button('Manage Packs');manageButton.id='npc-manage-packs';row.append(importButton,manageButton);
    const input=document.createElement('input');input.type='file';input.id='npc-pack-file';input.accept='.json,application/json';input.hidden=true;section.append(row,input);controls.appendChild(section);
    const dialog=document.createElement('dialog');dialog.id='npc-pack-manager';dialog.className='npc-pack-manager';dialog.innerHTML='<form method="dialog" class="npc-manager-header"><div><p class="eyebrow">Campaign extensions</p><h2>Installed Custom Packs</h2></div><button value="close" class="secondary-action">Close</button></form><div id="npc-pack-list" class="npc-pack-list"></div>';workspace.root.appendChild(dialog);
    ['npc-import-pack','npc-manage-packs','npc-pack-file','npc-pack-manager','npc-pack-list'].forEach(id=>{workspace.controls[id]=workspace.root.querySelector(`#${id}`);});
    importButton.addEventListener('click',()=>input.click());input.addEventListener('change',event=>importFile(workspace,event.target.files?.[0]));manageButton.addEventListener('click',()=>{renderManager(workspace);dialog.showModal?dialog.showModal():dialog.setAttribute('open','');});
    workspace.packUiInstalled=true;
  }

  async function enrich(workspace){
    if(!workspace?.pack)return workspace;
    ensureStyles();
    if(!workspace.customPackBasePack){
      workspace.customPackBasePack=Manager.normalizedBasePack(workspace.pack);
      workspace.customPackBaseArchetypes=Manager.clone(workspace.data?.policies?.archetypes||[]);
      workspace.baseFirstReleaseIds=[...(workspace.data?.policies?.firstReleaseIds||[])];
    }
    installControls(workspace);
    const rebuilt=rebuildInstalled(workspace,'custom-packs-loaded');
    if(!rebuilt.ok)workspace.setStatus?.(`Stored custom packs could not be applied: ${problemText(rebuilt.result.diagnostics)}`,'error');
    return workspace;
  }

  globalThis.NpcProfileGeneratorPackUI=Object.freeze({ensureStyles,customArchetypeIds,refreshControls,applyRuntime,rebuildInstalled,renderManager,importFile,installControls,enrich});
})();
