(() => {
  'use strict';
  const UI=globalThis.NpcProfileGeneratorUI;
  if(!UI?.NpcGeneratorWorkspace)throw new Error('NPC interface must load before mechanics UI enhancement.');
  const prototype=UI.NpcGeneratorWorkspace.prototype;
  if(prototype.__mechanicsUiInstalled)return;

  const originalRenderShell=prototype.renderShell;
  const originalGenerationConfig=prototype.generationConfig;

  prototype.renderShell=function(){
    originalRenderShell.call(this);
    const select=this.controls['npc-level-mode'];
    if(!select)return;
    select.innerHTML='';
    [
      ['none','Narrative only'],
      ['generated','Open d20 light'],
      ['full','Open d20 full'],
      ['custom','Open d20 light — custom level'],
      ['full-custom','Open d20 full — custom level']
    ].forEach(([value,label])=>{
      const option=document.createElement('option');
      option.value=value;
      option.textContent=label;
      if(value==='generated')option.selected=true;
      select.appendChild(option);
    });
  };

  prototype.updateConditionalControls=function(){
    if(!this.data)return;
    const value=this.controls['npc-level-mode']?.value||'generated';
    this.controls['npc-custom-level-group'].hidden=!['custom','full-custom'].includes(value);
    this.renderArchetypeSummary(this.selectedArchetype());
  };

  prototype.generationConfig=function(){
    const config=originalGenerationConfig.call(this);
    const value=this.controls['npc-level-mode']?.value||'generated';
    const full=value==='full'||value==='full-custom';
    const custom=value==='custom'||value==='full-custom';
    config.mechanicalMode=value==='none'?'none':full?'open-d20-full':'open-d20-light';
    config.mechanicalOptions={
      mode:config.mechanicalMode,
      levelMode:custom?'exact':'appropriate',
      ...(custom?{level:Number(this.controls['npc-custom-level']?.value||0)}:{})
    };
    return config;
  };

  prototype.applyInterfaceOverrides=function(result){return result;};
  Object.defineProperty(prototype,'__mechanicsUiInstalled',{value:true,configurable:false});

  globalThis.NpcProfileGeneratorMechanicsUI=Object.freeze({installed:true});
})();
