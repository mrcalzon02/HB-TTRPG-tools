(() => {
  'use strict';
  const URLS=Object.freeze([
    'data/npc-generator/operations/civilian-commercial.json',
    'data/npc-generator/operations/authority-military.json',
    'data/npc-generator/operations/criminal-marginalized.json',
    'data/npc-generator/operations/elite.json'
  ]);

  function loadJson(url){
    return fetch(url,{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error(`${url} returned ${response.status}.`);
      return response.json();
    });
  }

  function merge(pack,components){
    pack.operationModules=pack.operationModules||{};
    for(const component of components){
      for(const[id,module]of Object.entries(component.modules||{}))pack.operationModules[id]=module;
      for(const[id,entries]of Object.entries(component.tables||{}))pack.tables[id]=entries;
    }
    return pack;
  }

  async function enrich(workspace){
    if(!workspace?.pack||workspace.operationDataLoaded)return workspace;
    workspace.setStatus?.('Loading archetype-specific operation data…');
    const components=await Promise.all(URLS.map(loadJson));
    merge(workspace.pack,components);
    workspace.operationDataLoaded=true;
    workspace.generate?.('operation-data-loaded');
    return workspace;
  }

  globalThis.NpcProfileGeneratorOperationData=Object.freeze({URLS,merge,enrich});
})();
