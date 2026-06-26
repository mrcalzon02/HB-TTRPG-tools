(() => {
  'use strict';
  const UI=globalThis.NpcProfileGeneratorUI;
  const Storage=globalThis.NpcProfileGeneratorStorage;
  const Exporter=globalThis.NpcProfileGeneratorExport;
  if(!UI?.NpcGeneratorWorkspace||!Storage||!Exporter)throw new Error('NPC UI, storage, and export modules must load before persistence UI.');
  const prototype=UI.NpcGeneratorWorkspace.prototype;
  if(prototype.__persistenceUiInstalled)return;

  const originalRenderShell=prototype.renderShell;
  const originalGenerationConfig=prototype.generationConfig;
  const originalGenerate=prototype.generate;

  function button(id,label,className='secondary-action'){
    const element=document.createElement('button');element.type='button';element.id=id;element.className=className;element.textContent=label;return element;
  }
  function problemText(errors){return(errors||[]).map(item=>item.message||item.code).join(' ')||'Unknown persistence error.';}

  prototype.renderShell=function(){
    originalRenderShell.call(this);
    const controls=this.root.querySelector('.npc-generator-controls');
    const actions=document.createElement('section');
    actions.className='npc-persistence-actions';
    actions.setAttribute('aria-labelledby','npc-persistence-title');
    actions.innerHTML='<h3 id="npc-persistence-title">Saved Profiles and Exports</h3>';
    const saveRow=document.createElement('div');saveRow.className='npc-control-row';
    saveRow.append(button('npc-save-profile','Save Profile','primary-action'),button('npc-manage-profiles','Load / Manage'));
    const cloneRow=document.createElement('div');cloneRow.className='npc-control-row';
    cloneRow.append(button('npc-clone-profile','Clone Profile'),button('npc-import-profile','Import JSON'));
    const exportRow=document.createElement('div');exportRow.className='npc-control-row';
    exportRow.append(button('npc-export-text','Export Text'),button('npc-export-markdown','Export Markdown'));
    const copyRow=document.createElement('div');copyRow.className='npc-control-row';
    copyRow.append(button('npc-copy-markdown','Copy Markdown'),button('npc-copy-text','Copy Text'));
    const input=document.createElement('input');input.type='file';input.id='npc-import-file';input.accept='.json,application/json';input.hidden=true;
    actions.append(saveRow,cloneRow,exportRow,copyRow,input);
    controls?.appendChild(actions);

    const dialog=document.createElement('dialog');dialog.id='npc-profile-manager';dialog.className='npc-profile-manager';
    dialog.innerHTML='<form method="dialog" class="npc-manager-header"><div><p class="eyebrow">Local profile library</p><h2>Saved NPC Profiles</h2></div><button value="close" class="secondary-action">Close</button></form><div id="npc-saved-profile-list" class="npc-saved-profile-list"></div>';
    this.root.appendChild(dialog);
    ['npc-save-profile','npc-manage-profiles','npc-clone-profile','npc-import-profile','npc-import-file','npc-export-text','npc-export-markdown','npc-copy-markdown','npc-copy-text','npc-profile-manager','npc-saved-profile-list'].forEach(id=>{this.controls[id]=this.root.querySelector(`#${id}`);});
    this.bindPersistenceEvents();
  };

  prototype.bindPersistenceEvents=function(){
    this.controls['npc-save-profile']?.addEventListener('click',()=>this.saveCurrentProfile());
    this.controls['npc-manage-profiles']?.addEventListener('click',()=>this.openProfileManager());
    this.controls['npc-clone-profile']?.addEventListener('click',()=>this.cloneCurrentProfile());
    this.controls['npc-import-profile']?.addEventListener('click',()=>this.controls['npc-import-file']?.click());
    this.controls['npc-import-file']?.addEventListener('change',event=>this.importProfileFile(event.target.files?.[0]));
    this.controls['npc-export-text']?.addEventListener('click',()=>this.downloadReadable('text'));
    this.controls['npc-export-markdown']?.addEventListener('click',()=>this.downloadReadable('markdown'));
    this.controls['npc-copy-text']?.addEventListener('click',()=>this.copyReadable('text'));
    this.controls['npc-copy-markdown']?.addEventListener('click',()=>this.copyReadable('markdown'));
  };

  prototype.generationConfig=function(){
    const config=originalGenerationConfig.call(this);
    if(this.pendingPersistenceRevision&&this.currentProfile){
      config.profileId=this.currentProfile.profileId;
      config.revision=this.currentProfile.revision+1;
      config.provenance=Storage.clone(this.currentProfile.provenance);
    }
    return config;
  };
  prototype.generate=function(reason){
    this.pendingPersistenceRevision=reason==='manual'&&Boolean(this.profileLoadedFromPersistence);
    const result=originalGenerate.call(this,reason);
    if(reason==='manual')this.profileLoadedFromPersistence=false;
    this.pendingPersistenceRevision=false;
    return result;
  };

  prototype.exportProfile=function(){
    if(!this.currentProfile)return;
    try{Exporter.download(Exporter.canonicalJson(this.currentProfile),Exporter.filename(this.currentProfile,'json'),'application/json');}
    catch(error){this.setStatus(`Export failed: ${error.message}`,'error');}
  };
  prototype.downloadReadable=function(format){
    if(!this.currentProfile)return;
    const markdown=format==='markdown';
    const content=markdown?Exporter.markdown(this.currentProfile):Exporter.readableText(this.currentProfile);
    Exporter.download(content,Exporter.filename(this.currentProfile,markdown?'md':'txt'),markdown?'text/markdown':'text/plain');
  };
  prototype.copyReadable=async function(format){
    if(!this.currentProfile)return;
    try{await Exporter.copy(format==='markdown'?Exporter.markdown(this.currentProfile):Exporter.readableText(this.currentProfile));this.setStatus(`${format==='markdown'?'Markdown':'Text'} copied to clipboard.`,'success');}
    catch(error){this.setStatus(`Copy failed: ${error.message}`,'error');}
  };
  prototype.saveCurrentProfile=function(){
    if(!this.currentProfile){this.setStatus('Generate or import a profile before saving.','error');return;}
    const result=Storage.saveProfile(globalThis.localStorage,this.currentProfile);
    this.setStatus(result.ok?`${this.currentProfile.identity.fullName} saved locally.`:`Save failed: ${problemText(result.errors)}`,result.ok?'success':'error');
  };
  prototype.cloneCurrentProfile=function(){
    if(!this.currentProfile){this.setStatus('Generate or import a profile before cloning.','error');return;}
    const result=Storage.cloneProfile(this.currentProfile);
    if(!result.profile){this.setStatus(`Clone failed: ${problemText(result.errors)}`,'error');return;}
    result.profile.identity.fullName=`${result.profile.identity.fullName} — Copy`;
    this.applyPersistedProfile(result.profile,'clone');
  };
  prototype.importProfileFile=async function(file){
    if(!file)return;
    try{
      const parsed=Storage.parseImport(await file.text());
      if(!parsed.profile){this.setStatus(`Import rejected: ${problemText(parsed.errors)}`,'error');return;}
      this.applyPersistedProfile(parsed.profile,'import');
    }catch(error){this.setStatus(`Import failed: ${error.message}`,'error');}
    finally{if(this.controls['npc-import-file'])this.controls['npc-import-file'].value='';}
  };
  prototype.applyPersistedProfile=function(profile,source='load'){
    const validation=Storage.validateProfile(profile);
    if(!validation.valid){this.setStatus(`Profile rejected: ${problemText(validation.errors)}`,'error');return false;}
    this.currentProfile=Storage.clone(profile);
    this.currentResult={profile:this.currentProfile,diagnostics:Storage.clone(profile.diagnostics||[]),valid:true};
    this.locks=new Set(profile.locks||[]);
    this.rerollCounters={...(profile.generator?.rerollCounters||{})};
    const values={
      'npc-archetype':profile.archetype?.id,
      'npc-depth':['quick','standard','deep'].includes(profile.generator?.mode)?profile.generator.mode:'standard',
      'npc-ancestry':profile.identity?.ancestryId,
      'npc-age-band':profile.identity?.ageBand,
      'npc-age':profile.identity?.age,
      'npc-seed':profile.generator?.seed,
      'npc-custom-level':profile.sections?.mechanics?.data?.level
    };
    const mechanical=profile.generator?.mechanicalMode||'none';
    const exact=profile.generator?.mechanicalOptions?.levelMode==='exact';
    values['npc-level-mode']=mechanical==='none'?'none':mechanical==='open-d20-full'?(exact?'full-custom':'full'):(exact?'custom':'generated');
    for(const[id,value]of Object.entries(values)){const control=this.controls[id];if(!control||value===undefined||value===null)continue;if(control.tagName==='SELECT'&&![...control.options].some(option=>option.value===String(value)))continue;control.value=String(value);}
    this.profileLoadedFromPersistence=true;
    this.updateConditionalControls();this.renderProfile();this.savePreferences();
    this.setStatus(`${profile.identity.fullName} ${source==='import'?'imported':source==='clone'?'cloned':'loaded'}.`,'success');
    return true;
  };
  prototype.openProfileManager=function(){
    this.renderSavedProfiles();const dialog=this.controls['npc-profile-manager'];
    if(dialog?.showModal)dialog.showModal();else dialog?.setAttribute('open','');
  };
  prototype.renderSavedProfiles=function(){
    const target=this.controls['npc-saved-profile-list'];if(!target)return;
    target.innerHTML='';const result=Storage.listProfiles(globalThis.localStorage);
    if(!result.records.length){target.innerHTML='<p class="module-empty">No NPC profiles are saved in this browser.</p>';return;}
    result.records.forEach(record=>{
      const row=document.createElement('article');row.className='npc-saved-profile-row';
      const info=document.createElement('div');const title=document.createElement('h3');title.textContent=record.label;const meta=document.createElement('p');meta.textContent=`${record.profile.archetype?.label||record.profile.archetype?.id} · Revision ${record.profile.revision} · ${new Date(record.updatedAt).toLocaleString()}`;info.append(title,meta);
      const actions=document.createElement('div');actions.className='npc-saved-profile-actions';
      const load=button('','Load','primary-action');load.addEventListener('click',()=>{const loaded=Storage.loadProfile(globalThis.localStorage,record.recordId);if(loaded.profile){this.applyPersistedProfile(loaded.profile,'load');this.controls['npc-profile-manager']?.close?.();}else this.setStatus(`Load failed: ${problemText(loaded.errors)}`,'error');});
      const remove=button('','Delete','danger-action');remove.addEventListener('click',()=>{const deleted=Storage.deleteProfile(globalThis.localStorage,record.recordId);this.setStatus(deleted.ok?'Saved profile deleted.':`Delete failed: ${problemText(deleted.errors)}`,deleted.ok?'success':'error');this.renderSavedProfiles();});
      actions.append(load,remove);row.append(info,actions);target.appendChild(row);
    });
  };

  Object.defineProperty(prototype,'__persistenceUiInstalled',{value:true});
  globalThis.NpcProfileGeneratorPersistenceUI=Object.freeze({installed:true});
})();
