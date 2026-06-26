(() => {
  'use strict';
  const UI=globalThis.NpcProfileGeneratorUI;
  if(!UI?.NpcGeneratorWorkspace)throw new Error('NPC UI must load before persistence restoration.');
  const prototype=UI.NpcGeneratorWorkspace.prototype;
  const original=prototype.applyPersistedProfile;
  if(typeof original!=='function'||prototype.__persistenceRestoreInstalled)return;

  function assign(control,value){
    if(!control||value===undefined||value===null)return;
    if(control.tagName==='SELECT'){
      if([...control.options].some(option=>option.value===String(value)))control.value=String(value);
      return;
    }
    control.value=String(value);
  }

  prototype.applyPersistedProfile=function(profile,source='load'){
    const applied=original.call(this,profile,source);
    if(!applied)return false;
    assign(this.controls['npc-archetype'],profile.archetype?.id);
    assign(this.controls['npc-depth'],['quick','standard','deep'].includes(profile.generator?.mode)?profile.generator.mode:'standard');
    assign(this.controls['npc-ancestry'],profile.identity?.ancestryId);
    assign(this.controls['npc-age-band'],profile.identity?.ageBand);
    assign(this.controls['npc-age'],profile.identity?.age);
    assign(this.controls['npc-seed'],profile.generator?.seed);
    assign(this.controls['npc-custom-level'],profile.sections?.mechanics?.data?.level);
    const mechanical=profile.generator?.mechanicalMode||'none';
    const exact=profile.generator?.mechanicalOptions?.levelMode==='exact';
    assign(this.controls['npc-level-mode'],mechanical==='none'?'none':mechanical==='open-d20-full'?(exact?'full-custom':'full'):(exact?'custom':'generated'));
    this.updateConditionalControls();
    this.renderProfile();
    this.savePreferences();
    return true;
  };

  function loadCustomPackBootstrap(){
    if(globalThis.NpcProfileGeneratorPackBootstrap||document.querySelector('script[data-npc-pack-bootstrap]'))return;
    const script=document.createElement('script');
    script.src='npc-profile-generator-pack-bootstrap.js';
    script.defer=true;
    script.dataset.npcPackBootstrap='true';
    document.body.appendChild(script);
  }

  Object.defineProperty(prototype,'__persistenceRestoreInstalled',{value:true});
  globalThis.NpcProfileGeneratorPersistenceRestore=Object.freeze({installed:true,loadCustomPackBootstrap});
  loadCustomPackBootstrap();
})();
