(() => {
  'use strict';
  const Random=globalThis.NpcProfileRandom;
  const Rules=globalThis.NpcProfileRules;
  const Core=globalThis.NpcProfileGeneratorCore;
  const F=globalThis.NpcGroupGeneratorFoundation;
  if(!Random||!Rules||!Core||!F)throw new Error('NPC random, rules, core, and group foundation modules must load first.');
  const VERSION='0.1.0';
  const GENERATOR_ID='universal-npc-group-generator';

  function ensureSection(profile,id){
    profile.sections=profile.sections||{};
    if(!profile.sections[id]||profile.sections[id].state!=='present')profile.sections[id]={state:'present',data:{}};
    profile.sections[id].data=profile.sections[id].data||{};
    return profile.sections[id].data;
  }
  function applySharedSurname(profile,surname){
    if(!surname)return;
    const given=profile.identity?.givenName||String(profile.identity?.fullName||'Unknown').split(/\s+/)[0]||'Unknown';
    profile.identity.givenName=given;profile.identity.familyName=surname;profile.identity.fullName=`${given} ${surname}`;
  }
  function applyGroupContext(profile,memberId,role,shared,groupId,reportsToMemberId=null){
    profile.identity.currentLocation=shared.location.name;
    if(!profile.identity.homeland)profile.identity.homeland=shared.location.region||shared.location.name;
    Object.assign(ensureSection(profile,'socialEconomic'),{groupRoleId:role.id,groupRole:role.label,organizationId:shared.organization.id,organizationName:shared.organization.name});
    Object.assign(ensureSection(profile,'affiliationsRelationships'),{groupId,organizationId:shared.organization.id,organizationName:shared.organization.name,factionTie:shared.factionTie});
    Object.assign(ensureSection(profile,'motivations'),{groupObjective:shared.objective});
    Object.assign(ensureSection(profile,'secretsProblemsHooks'),{groupProblem:shared.problem});
    if(['household','noble-household'].includes(shared.groupKind))Object.assign(ensureSection(profile,'residence'),{sharedLocationId:shared.location.id,sharedLocationName:shared.location.name,sharedResidence:true});
    else if(profile.sections?.workContext?.state==='present')Object.assign(profile.sections.workContext.data,{sharedLocationId:shared.location.id,sharedLocationName:shared.location.name,organizationId:shared.organization.id,organizationName:shared.organization.name});
    profile.sections.extensions=profile.sections.extensions||{};
    profile.sections.extensions.groupMembership={state:'present',data:{groupId,memberId,roleId:role.id,roleLabel:role.label,organizationId:shared.organization.id,locationId:shared.location.id,reportsToMemberId}};
    profile.provenance.sourceEntryIds=[...new Set([...(profile.provenance.sourceEntryIds||[]),groupId,role.id])];
    profile.provenance.notes=[...(profile.provenance.notes||[]),`Generated as ${role.label} in group ${groupId}.`];
  }
  function updateReportingExtension(member){
    const data=member.profile?.sections?.extensions?.groupMembership?.data;
    if(data)data.reportsToMemberId=member.reportsToMemberId;
  }

  function generateMember(slot,context){
    const{seed,pack,archetypes,mode,timestamp,shared,groupId,usedNames,diagnostics,mechanicalMode,mechanicalOptions}=context;
    const role=slot.role,roleRng=Random.create(Random.deriveSeed(seed,'role',slot.slotIndex,role.id));
    const archetypeId=roleRng.fork('archetype').choice(role.archetypeIds),resolved=Rules.resolveArchetype(archetypeId,archetypes);
    if(!resolved.valid){
      diagnostics.push(F.diagnostic('GROUP_MEMBER_ARCHETYPE','error',`Role ${role.id} could not resolve archetype ${archetypeId}.`,`/members/${slot.slotIndex}`));
      return null;
    }
    const ageBand=role.ageBands?.length?roleRng.fork('age-band').choice(role.ageBands):undefined;
    let result=null,profile=null;
    for(let attempt=0;attempt<12;attempt+=1){
      const memberSeed=Random.deriveSeed(seed,'member-profile',slot.slotIndex,role.id,attempt);
      result=Core.generateProfile({
        seed:memberSeed,archetype:resolved.archetype,pack,mode,timestamp,
        mechanicalMode:mechanicalMode||'none',mechanicalOptions:mechanicalOptions||{mode:mechanicalMode||'none'},
        options:{identity:{...(ageBand?{ageBand}:{}),...(context.ancestryId?{ancestryId:context.ancestryId}:{})}}
      });
      if(!result.profile)continue;
      profile=result.profile;
      if(role.surnamePolicy==='shared')applySharedSurname(profile,shared.sharedSurname);
      if(!usedNames.has(profile.identity.fullName)){usedNames.add(profile.identity.fullName);break;}
      profile=null;
    }
    if(!profile){diagnostics.push(F.diagnostic('GROUP_MEMBER_NAME_EXHAUSTED','error',`Could not generate a unique name for ${role.id}.`,`/members/${slot.slotIndex}/profile/identity/fullName`));return null;}
    for(const issue of result.diagnostics||[])if(issue.severity==='error')diagnostics.push(F.diagnostic('GROUP_MEMBER_PROFILE_ERROR','error',`${role.id}: ${issue.message}`,`/members/${slot.slotIndex}${issue.path||''}`));
    const id=F.memberId(seed,slot.slotIndex,role.id);
    applyGroupContext(profile,id,role,shared,groupId,null);
    return{
      memberId:id,profileId:profile.profileId,roleId:role.id,roleLabel:role.label,leadershipRank:Number(role.leadershipRank||0),
      reportsToMemberId:null,organizationId:shared.organization.id,locationId:shared.location.id,relationshipIds:[],profile,_role:F.clone(role)
    };
  }

  function assignReporting(template,members){
    const leader=members.find(member=>member.roleId===template.leaderRoleId)||members[0];
    for(const member of members){
      if(member.memberId===leader.memberId){member.reportsToMemberId=null;updateReportingExtension(member);continue;}
      const requestedRole=member._role.reportsToRoleId;
      let target=requestedRole?members.find(candidate=>candidate.roleId===requestedRole):leader;
      if(!target||target.memberId===member.memberId)target=leader;
      member.reportsToMemberId=target.memberId;updateReportingExtension(member);
    }
    return leader;
  }
  function sourcePackIds(pack,members){
    const ids=new Set([pack.packId,...(pack.activeCustomPackIds||[])]);
    for(const member of members)for(const id of member.profile?.provenance?.sourcePackIds||[])ids.add(id);
    return[...ids].filter(Boolean);
  }

  function generateGroup(config={}){
    const diagnostics=[],data=config.groupData,pack=config.pack||{},archetypes=config.archetypes||[];
    if(!data?.valid){
      diagnostics.push(...(data?.diagnostics||[]));
      diagnostics.push(F.diagnostic('GROUP_DATA_INVALID','error','Validated group template data is required.','/generator'));
      return{group:null,diagnostics,valid:false};
    }
    const seed=Random.normalizeSeed(config.seed||'group-default-seed'),root=Random.create(Random.deriveSeed(seed,GENERATOR_ID,VERSION));
    const template=config.templateId?data.templateIndex[config.templateId]:root.fork('template').choice(data.templates);
    if(!template){diagnostics.push(F.diagnostic('GROUP_TEMPLATE_MISSING','error',`Group template ${config.templateId||'random'} is unavailable.`,'/template'));return{group:null,diagnostics,valid:false};}
    const mode=['quick','standard','deep'].includes(config.mode)?config.mode:'standard';
    const size=F.targetSize(template,config.size,root.fork('size'),diagnostics),slots=F.allocateRoles(template,size,root.fork('roles'),diagnostics);
    const shared=F.sharedContext(template,pack,seed,mode,config.shared||{}),id=config.groupId||F.groupId(seed,template.id),timestamp=config.timestamp||'1970-01-01T00:00:00.000Z';
    const usedNames=new Set(),members=[];
    for(const slot of slots){
      const member=generateMember(slot,{seed,pack,archetypes,mode,timestamp,shared,groupId:id,usedNames,diagnostics,mechanicalMode:config.mechanicalMode,mechanicalOptions:config.mechanicalOptions,ancestryId:config.ancestryId});
      if(member)members.push(member);
    }
    if(members.length!==slots.length){diagnostics.push(F.diagnostic('GROUP_MEMBER_GENERATION_INCOMPLETE','error',`Generated ${members.length} of ${slots.length} planned members.`,'/members'));return{group:null,diagnostics,valid:false};}
    const leader=assignReporting(template,members),second=template.secondRoleId?members.find(member=>member.roleId===template.secondRoleId)||null:null;
    const relationships=F.buildRelationships(template,members,pack,seed);
    const commandStyle=F.chooseTable(pack,'commandStyles',root.fork('command-style'),'calm and consultative');
    const cleanMembers=members.map(F.stripInternalMember);
    const group={
      groupType:'npcGroup',schemaVersion:'1.0.0',groupId:id,revision:Number(config.revision||config.previousGroup?.revision||1),
      createdAt:config.previousGroup?.createdAt||timestamp,updatedAt:timestamp,
      generator:{generatorId:GENERATOR_ID,generatorVersion:VERSION,packId:pack.packId||data.packId,packVersion:pack.version||data.version,seed,mode,templateId:template.id,rerollCounters:F.clone(config.rerollCounters||{})},
      template:{id:template.id,label:template.label,groupKind:template.groupKind},shared,
      leadership:{leaderMemberId:leader.memberId,leaderRoleId:template.leaderRoleId,commandStyle,secondMemberId:second?.memberId||null},
      members:cleanMembers,relationships,diagnostics:[],
      provenance:{sourcePackIds:sourcePackIds(pack,cleanMembers),sourceTemplateIds:[template.id],memberProfileIds:cleanMembers.map(member=>member.profileId),notes:[`Generated from ${template.label} template.`]}
    };
    const validation=F.validateGroup(group,template);diagnostics.push(...validation.diagnostics);group.diagnostics=F.clone(diagnostics);
    return{group,diagnostics,valid:!diagnostics.some(item=>item.severity==='error'),template:F.clone(template)};
  }

  globalThis.NpcGroupGeneratorCore=Object.freeze({VERSION,GENERATOR_ID,ensureSection,applySharedSurname,applyGroupContext,updateReportingExtension,generateMember,assignReporting,sourcePackIds,generateGroup});
})();
