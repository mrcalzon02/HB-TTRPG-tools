(() => {
  'use strict';
  const URLS=Object.freeze({templates:'data/npc-generator/groups/group-templates.json',tables:'data/npc-generator/groups/group-tables.json'});
  const cache=new Map();
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const diagnostic=(code,severity,message,path='/')=>({code,severity,message,path});
  const indexBy=(entries,key='id')=>Object.fromEntries((entries||[]).map(entry=>[entry[key],entry]));

  function validateTemplate(template,tables,diagnostics,index){
    const path=`/templates/${index}`;
    if(!template?.id||!template?.label||!template?.groupKind)diagnostics.push(diagnostic('GROUP_TEMPLATE_SHAPE','error','Group template is missing id, label, or groupKind.',path));
    const range=template?.sizeRange;
    if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<2||range[1]<range[0]||range[1]>50)diagnostics.push(diagnostic('GROUP_TEMPLATE_SIZE_RANGE','error',`${template?.id||'Template'} has an invalid size range.`,`${path}/sizeRange`));
    const roles=Array.isArray(template?.roles)?template.roles:[],roleIds=new Set();
    for(const[roleIndex,role]of roles.entries()){
      const rolePath=`${path}/roles/${roleIndex}`;
      if(!role?.id||roleIds.has(role.id))diagnostics.push(diagnostic('GROUP_ROLE_ID','error',`Role ${role?.id||roleIndex} is missing or duplicated.`,`${rolePath}/id`));
      roleIds.add(role?.id);
      if(!Array.isArray(role?.archetypeIds)||!role.archetypeIds.length)diagnostics.push(diagnostic('GROUP_ROLE_ARCHETYPES','error',`Role ${role?.id||roleIndex} has no archetype choices.`,`${rolePath}/archetypeIds`));
      if(!Number.isInteger(role?.minimum)||!Number.isInteger(role?.maximum)||role.minimum<0||role.maximum<role.minimum)diagnostics.push(diagnostic('GROUP_ROLE_RANGE','error',`Role ${role?.id||roleIndex} has an invalid count range.`,rolePath));
      if(!['shared','independent'].includes(role?.surnamePolicy))diagnostics.push(diagnostic('GROUP_ROLE_SURNAME_POLICY','error',`Role ${role?.id||roleIndex} has an invalid surname policy.`,`${rolePath}/surnamePolicy`));
    }
    if(!roleIds.has(template?.leaderRoleId))diagnostics.push(diagnostic('GROUP_LEADER_ROLE_MISSING','error',`${template?.id||'Template'} leader role is missing.`,`${path}/leaderRoleId`));
    if(template?.secondRoleId&&!roleIds.has(template.secondRoleId))diagnostics.push(diagnostic('GROUP_SECOND_ROLE_MISSING','error',`${template.id} second role is missing.`,`${path}/secondRoleId`));
    for(const[roleIndex,role]of roles.entries())if(role.reportsToRoleId&&!roleIds.has(role.reportsToRoleId))diagnostics.push(diagnostic('GROUP_REPORTING_ROLE_MISSING','error',`${role.id} reports to missing role ${role.reportsToRoleId}.`,`${path}/roles/${roleIndex}/reportsToRoleId`));
    const minimum=roles.reduce((sum,role)=>sum+Number(role.minimum||0),0),maximum=roles.reduce((sum,role)=>sum+Number(role.maximum||0),0);
    if(range&&minimum>range[1])diagnostics.push(diagnostic('GROUP_TEMPLATE_MINIMUM_OVERFLOW','error',`${template.id} required roles exceed maximum group size.`,path));
    if(range&&maximum<range[0])diagnostics.push(diagnostic('GROUP_TEMPLATE_MAXIMUM_UNDERFLOW','error',`${template.id} role capacity cannot reach minimum group size.`,path));
    for(const[key,tableId]of Object.entries(template?.tables||{}))if(!Array.isArray(tables?.[tableId])||!tables[tableId].length)diagnostics.push(diagnostic('GROUP_TABLE_REFERENCE','error',`${template.id}.${key} references missing or empty table ${tableId}.`,`${path}/tables/${key}`));
    if(!['required','optional','none','role-based'].includes(template?.sharedSurnamePolicy))diagnostics.push(diagnostic('GROUP_SURNAME_POLICY','error',`${template?.id||'Template'} has an invalid shared surname policy.`,`${path}/sharedSurnamePolicy`));
  }

  function normalize(templateDocument,tableDocument){
    const templates=clone(templateDocument?.templates||[]),tables=clone(tableDocument?.tables||{}),diagnostics=[];
    const ids=new Set(),kinds=new Set();
    templates.forEach((template,index)=>{
      if(ids.has(template.id))diagnostics.push(diagnostic('GROUP_TEMPLATE_DUPLICATE','error',`Duplicate template ${template.id}.`,`/templates/${index}/id`));
      if(kinds.has(template.groupKind))diagnostics.push(diagnostic('GROUP_KIND_DUPLICATE','error',`Duplicate group kind ${template.groupKind}.`,`/templates/${index}/groupKind`));
      ids.add(template.id);kinds.add(template.groupKind);validateTemplate(template,tables,diagnostics,index);
    });
    return{
      dataType:'npcGroupData',schemaVersion:'1.0.0',packId:templateDocument?.packId||tableDocument?.packId||'generic-fantasy-core',
      version:templateDocument?.version||tableDocument?.version||'0.1.0',templates,templateIndex:indexBy(templates),kindIndex:indexBy(templates,'groupKind'),tables,
      diagnostics,valid:!diagnostics.some(item=>item.severity==='error')
    };
  }
  async function fetchJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`${url} returned ${response.status}.`);
    return response.json();
  }
  async function load(urls=URLS){
    const key=JSON.stringify(urls);
    if(cache.has(key))return cache.get(key);
    const promise=Promise.all([fetchJson(urls.templates),fetchJson(urls.tables)]).then(parts=>normalize(parts[0],parts[1]));
    cache.set(key,promise);
    try{return await promise;}catch(error){cache.delete(key);throw error;}
  }
  function extendPack(basePack,data){
    const pack=clone(basePack||{});pack.tables=pack.tables||{};
    for(const[id,entries]of Object.entries(data?.tables||{}))pack.tables[id]=clone(entries);
    pack.groupTemplates=clone(data?.templates||[]);pack.groupTemplateIndex=clone(data?.templateIndex||{});pack.groupDataVersion=data?.version||'0.1.0';
    return pack;
  }

  globalThis.NpcProfileGeneratorGroupData=Object.freeze({URLS,clone,diagnostic,indexBy,validateTemplate,normalize,fetchJson,load,extendPack,clearCache:()=>cache.clear()});
})();
