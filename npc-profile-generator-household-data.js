(() => {
  'use strict';
  const URLS=Object.freeze({
    rules:'data/npc-generator/tables/ancestry-household-rules.json',
    status:'data/npc-generator/tables/household-status-tables.json',
    obligations:'data/npc-generator/tables/household-obligation-tables.json',
    relationships:'data/npc-generator/tables/relationship-network-tables.json'
  });

  function loadJson(url){
    return fetch(url,{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error(`${url} returned ${response.status}.`);
      return response.json();
    });
  }

  function merge(pack,parts){
    const[rules,...tables]=parts;
    pack.ancestryRules={};
    for(const entry of rules.entries||[])pack.ancestryRules[entry.id]=entry;
    pack.defaultAncestryRule=rules.defaultRule||null;
    for(const component of tables){
      for(const[id,entries]of Object.entries(component.tables||{}))pack.tables[id]=entries;
    }
    return pack;
  }

  async function enrich(workspace){
    if(!workspace?.pack||workspace.householdDataLoaded)return workspace;
    workspace.setStatus?.('Loading household and relationship data…');
    const parts=await Promise.all(Object.values(URLS).map(loadJson));
    merge(workspace.pack,parts);
    workspace.householdDataLoaded=true;
    workspace.generate?.('household-data-loaded');
    return workspace;
  }

  globalThis.NpcProfileGeneratorHouseholdData=Object.freeze({URLS,merge,enrich});
})();
