(() => {
  'use strict';
  const Random=globalThis.NpcProfileRandom;
  if(!Random)throw new Error('NPC random module must load before group foundation.');
  const VERSION='0.1.0';
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const diagnostic=(code,severity,message,path='/')=>({code,severity,message,path});
  const slug=value=>String(value||'').normalize('NFKD').replace(/[’']/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'unknown';
  const token=(seed,...parts)=>Random.hash32(Random.deriveSeed(seed,...parts)).toString(36).padStart(8,'0');
  const groupId=(seed,templateId)=>`npc-group-${token(seed,'group',templateId)}`;
  const memberId=(seed,index,roleId)=>`member-${token(seed,'member',index,roleId)}`;
  const relationshipId=(seed,index,direction)=>`relationship-${token(seed,'relationship',index,direction)}`;

  function chooseTable(pack,id,rng,fallback){
    const entries=pack?.tables?.[id];
    return Array.isArray(entries)&&entries.length?rng.choice(entries):fallback;
  }
  function chooseMany(pack,id,rng,count,fallback=[]){
    const entries=pack?.tables?.[id];
    const source=Array.isArray(entries)&&entries.length?entries:fallback;
    return rng.shuffle(source).slice(0,Math.max(0,Math.min(Number(count)||0,source.length)));
  }
  function targetSize(template,requested,rng,diagnostics){
    const[minimum,maximum]=template.sizeRange;
    const numeric=Number(requested);
    if(Number.isFinite(numeric)){
      const rounded=Math.round(numeric),clamped=Math.max(minimum,Math.min(maximum,rounded));
      if(clamped!==rounded)diagnostics.push(diagnostic('GROUP_SIZE_CLAMPED','info',`Requested group size ${rounded} was clamped to ${clamped}.`,'/generator/size'));
      return clamped;
    }
    return rng.int(minimum,maximum);
  }
  function allocateRoles(template,size,rng,diagnostics){
    const counts=new Map(template.roles.map(role=>[role.id,Number(role.minimum||0)]));
    let total=[...counts.values()].reduce((sum,value)=>sum+value,0);
    while(total<size){
      const available=template.roles.filter(role=>(counts.get(role.id)||0)<Number(role.maximum||0));
      if(!available.length){diagnostics.push(diagnostic('GROUP_ROLE_CAPACITY_EXHAUSTED','error',`Template ${template.id} cannot allocate ${size} members.`,'/members'));break;}
      const role=rng.choice(available);counts.set(role.id,(counts.get(role.id)||0)+1);total+=1;
    }
    const slots=[];
    for(const role of template.roles){
      const count=counts.get(role.id)||0;
      for(let index=0;index<count;index+=1)slots.push({slotIndex:slots.length,roleIndex:index,role:clone(role)});
    }
    return slots;
  }
  function sharedContext(template,pack,seed,mode='standard',options={}){
    const rng=Random.create(Random.deriveSeed(seed,'shared',template.id)),policy=template.sharedSurnamePolicy;
    const surname=policy==='required'||policy==='role-based'||(policy==='optional'&&rng.fork('surname-use').bool(.45))
      ?chooseTable(pack,'familyNames',rng.fork('surname'),'Vale'):null;
    const baseName=chooseTable(pack,template.tables.name,rng.fork('name'),template.label);
    const useSurname=Boolean(surname)&&['household','noble-household'].includes(template.groupKind);
    const groupName=useSurname?`${surname} ${baseName}`:baseName;
    const locationName=options.locationName||chooseTable(pack,template.tables.location,rng.fork('location'),'an unspecified shared location');
    const organizationId=`org-${token(seed,template.id,'organization')}`;
    const locationId=`location-${token(seed,template.id,'location')}`;
    const resourceCount=mode==='quick'?1:mode==='deep'?3:2;
    const factionTie=options.factionTie||chooseTable(pack,'groupFactions',rng.fork('faction'),'independent');
    return{
      groupName,groupKind:template.groupKind,
      organization:{id:organizationId,name:groupName,kind:template.organizationKind,factionTie},
      location:{id:locationId,name:locationName,kind:template.locationKind,region:options.region||null},
      objective:options.objective||chooseTable(pack,template.tables.objective,rng.fork('objective'),'maintain the group through its immediate obligations'),
      problem:options.problem||chooseTable(pack,template.tables.problem,rng.fork('problem'),'the group faces an unresolved internal strain'),
      sharedSurname:surname,factionTie,
      resources:chooseMany(pack,template.tables.resources,rng.fork('resources'),resourceCount,['shared supplies']),
      notes:[]
    };
  }
  function leaderForRole(members,roleId,fallback){return members.find(member=>member.roleId===roleId)||fallback;}
  function addRelationshipPair(relationships,members,seed,index,from,to,type,reciprocalType,quality,notes=[]){
    const firstId=relationshipId(seed,index,'forward'),secondId=relationshipId(seed,index,'reverse');
    const first={relationshipId:firstId,fromMemberId:from.memberId,toMemberId:to.memberId,type,reciprocalType,quality,notes:clone(notes)};
    const second={relationshipId:secondId,fromMemberId:to.memberId,toMemberId:from.memberId,type:reciprocalType,reciprocalType:type,quality,notes:clone(notes)};
    relationships.push(first,second);
    for(const member of[from,to])member.relationshipIds.push(firstId,secondId);
  }
  function buildRelationships(template,members,pack,seed){
    const relationships=[],paired=new Set(),leader=leaderForRole(members,template.leaderRoleId,members[0]);let pairIndex=0;
    const qualityRng=Random.create(Random.deriveSeed(seed,'relationships',template.id));
    const pairKey=(left,right)=>[left.memberId,right.memberId].sort().join('::');
    for(const member of members){
      if(member.memberId===leader.memberId)continue;
      const role=member._role,requested=role.reportsToRoleId?leaderForRole(members,role.reportsToRoleId,leader):leader;
      const reporter=requested?.memberId===member.memberId?leader:requested||leader,key=pairKey(member,reporter);
      if(paired.has(key))continue;
      paired.add(key);
      const quality=chooseTable(pack,'relationshipQualities',qualityRng.fork('quality',pairIndex),'professionally reliable');
      addRelationshipPair(relationships,members,seed,pairIndex++,member,reporter,role.relationshipToLeader||'member',role.reciprocalFromLeader||'leader',quality);
    }
    const byRole=new Map();
    for(const member of members){if(!byRole.has(member.roleId))byRole.set(member.roleId,[]);byRole.get(member.roleId).push(member);}
    for(const roleMembers of byRole.values()){
      for(let index=1;index<roleMembers.length;index+=1){
        const left=roleMembers[index-1],right=roleMembers[index],key=pairKey(left,right);
        if(paired.has(key))continue;
        paired.add(key);
        const quality=chooseTable(pack,'relationshipQualities',qualityRng.fork('quality',pairIndex),'professionally reliable');
        addRelationshipPair(relationships,members,seed,pairIndex++,left,right,template.peerRelationship.type,template.peerRelationship.reciprocalType,quality);
      }
    }
    return relationships;
  }
  function stripInternalMember(member){const output=clone(member);delete output._role;return output;}

  function validateGroup(group,template){
    const diagnostics=[],members=group?.members||[],relationships=group?.relationships||[];
    const memberIds=new Set(members.map(member=>member.memberId)),profileIds=new Set(members.map(member=>member.profileId)),relationshipIds=new Set(relationships.map(edge=>edge.relationshipId));
    if(memberIds.size!==members.length)diagnostics.push(diagnostic('GROUP_MEMBER_ID_DUPLICATE','error','Group member IDs must be unique.','/members'));
    if(profileIds.size!==members.length)diagnostics.push(diagnostic('GROUP_PROFILE_ID_DUPLICATE','error','Group member profile IDs must be unique.','/members'));
    if(!memberIds.has(group?.leadership?.leaderMemberId))diagnostics.push(diagnostic('GROUP_LEADER_MEMBER_MISSING','error','Leadership references a missing leader member.','/leadership/leaderMemberId'));
    if(group?.leadership?.secondMemberId&&!memberIds.has(group.leadership.secondMemberId))diagnostics.push(diagnostic('GROUP_SECOND_MEMBER_MISSING','error','Leadership references a missing second member.','/leadership/secondMemberId'));
    for(const[index,member]of members.entries()){
      const path=`/members/${index}`;
      if(member.profileId!==member.profile?.profileId)diagnostics.push(diagnostic('GROUP_MEMBER_PROFILE_MISMATCH','error',`${member.memberId} profile ID does not match its embedded profile.`,`${path}/profileId`));
      if(member.organizationId!==group.shared.organization.id)diagnostics.push(diagnostic('GROUP_ORGANIZATION_REFERENCE','error',`${member.memberId} does not reference the shared organization.`,`${path}/organizationId`));
      if(member.locationId!==group.shared.location.id)diagnostics.push(diagnostic('GROUP_LOCATION_REFERENCE','error',`${member.memberId} does not reference the shared location.`,`${path}/locationId`));
      if(member.reportsToMemberId&&!memberIds.has(member.reportsToMemberId))diagnostics.push(diagnostic('GROUP_REPORTING_REFERENCE','error',`${member.memberId} reports to a missing member.`,`${path}/reportsToMemberId`));
      if(member.reportsToMemberId===member.memberId)diagnostics.push(diagnostic('GROUP_SELF_REPORTING','error',`${member.memberId} cannot report to itself.`,`${path}/reportsToMemberId`));
      for(const id of member.relationshipIds||[])if(!relationshipIds.has(id))diagnostics.push(diagnostic('GROUP_MEMBER_RELATIONSHIP_REFERENCE','error',`${member.memberId} references missing relationship ${id}.`,`${path}/relationshipIds`));
      const role=template.roles.find(entry=>entry.id===member.roleId);
      if(role?.surnamePolicy==='shared'&&group.shared.sharedSurname&&member.profile?.identity?.familyName!==group.shared.sharedSurname)diagnostics.push(diagnostic('GROUP_SHARED_SURNAME','error',`${member.memberId} does not use the required shared surname.`,`${path}/profile/identity/familyName`));
    }
    if(relationshipIds.size!==relationships.length)diagnostics.push(diagnostic('GROUP_RELATIONSHIP_ID_DUPLICATE','error','Relationship IDs must be unique.','/relationships'));
    for(const[index,edge]of relationships.entries()){
      if(!memberIds.has(edge.fromMemberId)||!memberIds.has(edge.toMemberId))diagnostics.push(diagnostic('GROUP_RELATIONSHIP_MEMBER_REFERENCE','error',`${edge.relationshipId} references a missing member.`,`/relationships/${index}`));
      if(edge.fromMemberId===edge.toMemberId)diagnostics.push(diagnostic('GROUP_SELF_RELATIONSHIP','error',`${edge.relationshipId} cannot connect a member to itself.`,`/relationships/${index}`));
      const reciprocal=relationships.some(other=>other.fromMemberId===edge.toMemberId&&other.toMemberId===edge.fromMemberId&&other.type===edge.reciprocalType&&other.reciprocalType===edge.type);
      if(!reciprocal)diagnostics.push(diagnostic('GROUP_RECIPROCAL_RELATIONSHIP_MISSING','error',`${edge.relationshipId} has no reciprocal edge.`,`/relationships/${index}`));
    }
    for(const role of template.roles){
      const count=members.filter(member=>member.roleId===role.id).length;
      if(count<role.minimum||count>role.maximum)diagnostics.push(diagnostic('GROUP_ROLE_COUNT','error',`${role.id} count ${count} is outside ${role.minimum}-${role.maximum}.`,'/members'));
    }
    return{valid:!diagnostics.some(item=>item.severity==='error'),diagnostics};
  }

  globalThis.NpcGroupGeneratorFoundation=Object.freeze({VERSION,clone,diagnostic,slug,token,groupId,memberId,relationshipId,chooseTable,chooseMany,targetSize,allocateRoles,sharedContext,leaderForRole,addRelationshipPair,buildRelationships,stripInternalMember,validateGroup});
})();
