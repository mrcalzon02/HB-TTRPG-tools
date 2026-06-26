(() => {
  'use strict';
  const URLS=Object.freeze({
    core:'data/npc-generator/mechanics/open-d20-core.json',
    manifest:'data/npc-generator/mechanics/archetype-packages.json',
    civilian:'data/npc-generator/mechanics/civilian-commercial-packages.json',
    authority:'data/npc-generator/mechanics/authority-military-packages.json',
    street:'data/npc-generator/mechanics/street-elite-packages.json'
  });

  function loadJson(url){
    return fetch(url,{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error(`${url} returned ${response.status}.`);
      return response.json();
    });
  }

  function merge(pack,parts){
    const[core,manifest,...components]=parts;
    pack.mechanicsCore=core;
    pack.mechanicalPackageManifest=manifest;
    pack.mechanicalPackages={};
    pack.mechanicalLevelGuidance={};
    for(const component of components){
      for(const[id,value]of Object.entries(component.packages||{}))pack.mechanicalPackages[id]=value;
      for(const[id,value]of Object.entries(component.levelGuidance||{}))pack.mechanicalLevelGuidance[id]=value;
    }
    return pack;
  }

  async function enrich(workspace){
    if(!workspace?.pack||workspace.mechanicsDataLoaded)return workspace;
    workspace.setStatus?.('Loading optional open-d20 mechanical data…');
    const parts=await Promise.all(Object.values(URLS).map(loadJson));
    merge(workspace.pack,parts);
    workspace.mechanicsDataLoaded=true;
    workspace.generate?.('mechanics-data-loaded');
    return workspace;
  }

  globalThis.NpcProfileGeneratorMechanicsData=Object.freeze({URLS,merge,enrich});
})();
