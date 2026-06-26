(() => {
  'use strict';
  const GroupData=globalThis.NpcProfileGeneratorGroupData;
  const GroupCore=globalThis.NpcGroupGeneratorCore;
  if(!GroupData||!GroupCore)throw new Error('NPC group data and core modules must load before group UI.');

  function ensureStyles(){
    if(document.querySelector('link[data-npc-group-style]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='npc-profile-generator-group.css';link.dataset.npcGroupStyle='true';document.head.appendChild(link);
  }
  function randomSeed(){
    if(globalThis.crypto?.getRandomValues){const values=new Uint32Array(2);globalThis.crypto.getRandomValues(values);return`group-${values[0].toString(16)}-${values[1].toString(16)}`;}
    return`group-${Date.now().toString(36)}`;
  }
  function option(value,label){const item=document.createElement('option');item.value=value;item.textContent=label;return item;}
  function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
  function fact(label,value){const box=node('div','npc-group-fact');box.append(node('strong','',label),document.createTextNode(value??'none'));return box;}

  function installShell(workspace){
    if(workspace.groupUiInstalled)return;
    const section=document.createElement('section');section.className='npc-group-workspace';section.setAttribute('aria-labelledby','npc-group-title');
    section.innerHTML=`
      <div class="npc-group-heading">
        <div><p class="eyebrow">Shared people and organizations</p><h2 id="npc-group-title">Group &amp; Roster Generator</h2><p>Generate coherent households, businesses, patrols, squads, gangs, bandit groups, noble households, guild teams, crews, and traveling parties with shared roles, locations, leadership, and relationships.</p></div>
      </div>
      <div class="npc-group-controls no-print" aria-label="Group generator controls">
        <label>Group template<select id="npc-group-template" class="tool-input"></select></label>
        <label>Exact size<input id="npc-group-size" class="tool-input" type="number" min="2" max="50" placeholder="Random within template" /></label>
        <label>Group depth<select id="npc-group-depth" class="tool-input"><option value="quick">Quick</option><option value="standard" selected>Standard</option><option value="deep">Deep</option></select></label>
        <label>Group seed<input id="npc-group-seed" class="tool-input" type="text" /></label>
        <div class="npc-group-action-row"><button id="npc-group-random-seed" type="button" class="secondary-action">New group seed</button><button id="npc-group-generate" type="button" class="primary-action">Generate group</button></div>
      </div>
      <div id="npc-group-diagnostics" class="npc-diagnostics npc-diagnostics-clear" role="status" aria-live="polite">No group diagnostics.</div>
      <div id="npc-group-output" class="npc-group-output"><div class="npc-group-empty">Choose a template and generate a coherent roster.</div></div>`;
    workspace.root.appendChild(section);
    ['npc-group-template','npc-group-size','npc-group-depth','npc-group-seed','npc-group-random-seed','npc-group-generate','npc-group-diagnostics','npc-group-output'].forEach(id=>{workspace.controls[id]=section.querySelector(`#${id}`);});
    workspace.controls['npc-group-template'].addEventListener('change',()=>syncTemplate(workspace));
    workspace.controls['npc-group-random-seed'].addEventListener('click',()=>{workspace.controls['npc-group-seed'].value=randomSeed();generate(workspace,'new-seed');});
    workspace.controls['npc-group-generate'].addEventListener('click',()=>generate(workspace,'manual'));
    workspace.groupUiInstalled=true;
  }
  function populate(workspace){
    const select=workspace.controls['npc-group-template'];select.innerHTML='';
    for(const template of workspace.groupData.templates)select.appendChild(option(template.id,`${template.label} (${template.sizeRange[0]}–${template.sizeRange[1]})`));
    const profileSeed=workspace.controls['npc-seed']?.value?.trim();
    if(!workspace.controls['npc-group-seed'].value)workspace.controls['npc-group-seed'].value=profileSeed?`${profileSeed}:group`:randomSeed();
    if(workspace.controls['npc-depth']?.value)workspace.controls['npc-group-depth'].value=workspace.controls['npc-depth'].value;
    syncTemplate(workspace);
  }
  function syncTemplate(workspace){
    const template=workspace.groupData?.templateIndex?.[workspace.controls['npc-group-template'].value];
    const size=workspace.controls['npc-group-size'];if(!template||!size)return;
    size.min=String(template.sizeRange[0]);size.max=String(template.sizeRange[1]);size.placeholder=`Random ${template.sizeRange[0]}–${template.sizeRange[1]}`;
    if(size.value!==''&&(Number(size.value)<template.sizeRange[0]||Number(size.value)>template.sizeRange[1]))size.value='';
  }
  function timestampFor(workspace,key){
    workspace.groupTimestamps=workspace.groupTimestamps||new Map();
    if(!workspace.groupTimestamps.has(key))workspace.groupTimestamps.set(key,new Date().toISOString());
    return workspace.groupTimestamps.get(key);
  }
  function refreshPack(workspace){
    workspace.pack=GroupData.extendPack(workspace.pack,workspace.groupData);
    return workspace.pack;
  }
  function renderDiagnostics(workspace,result){
    const target=workspace.controls['npc-group-diagnostics'];target.innerHTML='';
    const diagnostics=result?.diagnostics||[];
    if(!diagnostics.length){target.className='npc-diagnostics npc-diagnostics-clear';target.textContent='No group diagnostics.';return;}
    target.className=`npc-diagnostics ${diagnostics.some(item=>item.severity==='error')?'npc-diagnostics-error':'npc-diagnostics-warning'}`;
    const list=document.createElement('ul');diagnostics.forEach(item=>{const row=document.createElement('li');row.textContent=`${item.code}: ${item.message}`;list.appendChild(row);});target.appendChild(list);
  }
  function memberCard(member,nameIndex){
    const profile=member.profile,card=node('article','npc-group-member');
    card.append(node('h4','',profile.identity.fullName));
    const archetype=profile.archetype?.label||profile.archetype?.id||'Unknown archetype';
    card.append(node('p','',`${member.roleLabel} · ${archetype}`));
    const reportsTo=member.reportsToMemberId?nameIndex.get(member.reportsToMemberId)||member.reportsToMemberId:'No superior in this group';
    card.append(node('p','',`Reports to: ${reportsTo}`));
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Member details';details.appendChild(summary);
    const list=document.createElement('dl');
    const rows=[['Age',`${profile.identity.ageBand}${profile.identity.age!==null&&profile.identity.age!==undefined?` (${profile.identity.age})`:''}`],['Ancestry',profile.identity.ancestryId],['Profile ID',profile.profileId],['Rank',String(member.leadershipRank)],['Organization',profile.sections?.affiliationsRelationships?.data?.organizationName||'none']];
    rows.forEach(([label,value])=>{list.append(node('dt','',label),node('dd','',value));});details.appendChild(list);card.appendChild(details);return card;
  }
  function renderGroup(workspace,group){
    const target=workspace.controls['npc-group-output'];target.innerHTML='';
    if(!group){target.append(node('div','npc-group-empty','No group was generated.'));return;}
    const hero=node('article','npc-group-hero');hero.append(node('p','eyebrow',group.template.label),node('h3','',group.shared.groupName),node('p','',group.shared.objective));
    const facts=node('div','npc-group-facts');facts.append(fact('Location',group.shared.location.name),fact('Organization',group.shared.organization.name),fact('Current problem',group.shared.problem));hero.appendChild(facts);
    const chips=node('div','chip-list');group.shared.resources.forEach(resource=>chips.append(node('span','chip',resource)));hero.appendChild(chips);target.appendChild(hero);

    const names=new Map(group.members.map(member=>[member.memberId,member.profile.identity.fullName]));
    const leadership=node('section','npc-group-section');leadership.append(node('p','eyebrow','Leadership'),node('h3','',names.get(group.leadership.leaderMemberId)||'Unknown leader'));
    leadership.append(node('p','',`Command style: ${group.leadership.commandStyle}`));
    if(group.leadership.secondMemberId)leadership.append(node('p','',`Second: ${names.get(group.leadership.secondMemberId)||group.leadership.secondMemberId}`));target.appendChild(leadership);

    const rosterSection=node('section','npc-group-section');rosterSection.append(node('p','eyebrow',`${group.members.length} members`),node('h3','','Roster'));
    const roster=node('div','npc-group-roster');group.members.forEach(member=>roster.appendChild(memberCard(member,names)));rosterSection.appendChild(roster);target.appendChild(rosterSection);

    const relationSection=node('section','npc-group-section'),logical=group.relationships.filter(edge=>edge.fromMemberId<edge.toMemberId);relationSection.append(node('p','eyebrow',`${logical.length} reciprocal links`),node('h3','','Relationships'));
    const relationList=node('div','npc-group-relationships');logical.forEach(edge=>relationList.append(node('div','npc-group-relationship',`${names.get(edge.fromMemberId)} — ${edge.type} / ${edge.reciprocalType} — ${names.get(edge.toMemberId)} (${edge.quality})`)));relationSection.appendChild(relationList);target.appendChild(relationSection);
  }
  function generate(workspace,reason='manual'){
    const templateId=workspace.controls['npc-group-template'].value,seed=workspace.controls['npc-group-seed'].value.trim()||randomSeed(),depth=workspace.controls['npc-group-depth'].value,sizeValue=workspace.controls['npc-group-size'].value;
    workspace.controls['npc-group-seed'].value=seed;
    const key=[templateId,seed,depth,sizeValue].join('|');
    refreshPack(workspace);
    const result=GroupCore.generateGroup({templateId,seed,groupData:workspace.groupData,pack:workspace.pack,archetypes:workspace.data?.policies?.archetypes||[],mode:depth,size:sizeValue===''?undefined:Number(sizeValue),mechanicalMode:'none',timestamp:timestampFor(workspace,key)});
    workspace.currentGroupResult=result;workspace.currentGroup=result.group;renderDiagnostics(workspace,result);renderGroup(workspace,result.group);
    workspace.setStatus?.(result.valid?`${result.group.shared.groupName} generated with ${result.group.members.length} members.`:`Group generation failed during ${reason}.`,result.valid?'success':'error');
    return result;
  }
  async function enrich(workspace){
    if(!workspace||workspace.groupUiInstalled)return workspace;
    ensureStyles();workspace.setStatus?.('Loading group and roster data…');
    const data=await GroupData.load();
    if(!data.valid)throw new Error(`Group data is invalid: ${data.diagnostics.map(item=>item.code).join(', ')}.`);
    workspace.groupData=data;refreshPack(workspace);installShell(workspace);populate(workspace);generate(workspace,'initial');return workspace;
  }

  globalThis.NpcProfileGeneratorGroupUI=Object.freeze({ensureStyles,randomSeed,option,node,fact,installShell,populate,syncTemplate,timestampFor,refreshPack,renderDiagnostics,memberCard,renderGroup,generate,enrich});
})();
