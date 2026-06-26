import {
  read,fixture,groupSchema,groupData,Foundation
} from './npc-phase-13-validation-fixture.mjs';

const errorDiagnostics=items=>(items||[]).filter(item=>item.severity==='error');

export function assertStaticContracts(fail){
  if(groupSchema.$schema!=='https://json-schema.org/draft/2020-12/schema'||groupSchema.title!=='Universal NPC Group'||groupSchema.properties?.groupType?.const!=='npcGroup')fail('NPC group schema root contract is invalid.');
  if(groupSchema.properties?.members?.minItems!==2||groupSchema.properties?.members?.maxItems!==50)fail('NPC group schema member bounds are invalid.');
  if(!groupData.valid)fail(`Group template data is invalid: ${groupData.diagnostics.map(item=>item.code).join(', ')}.`);
  if(groupData.templates.length!==fixture.templateIds.length)fail(`Loaded ${groupData.templates.length} templates; expected ${fixture.templateIds.length}.`);
  const kinds=groupData.templates.map(template=>template.groupKind).sort();
  if(JSON.stringify(kinds)!==JSON.stringify([...fixture.expectedGroupKinds].sort()))fail('Group kind catalogue does not match the Phase 13 matrix.');
  for(const id of fixture.templateIds)if(!groupData.templateIndex[id])fail(`Group template ${id} is missing.`);
  const foundation=read('npc-group-generator-foundation.js'),core=read('npc-group-generator-core.js');
  for(const name of['allocateRoles','sharedContext','buildRelationships','validateGroup'])if(!foundation.includes(name))fail(`Group foundation is missing ${name}.`);
  for(const name of['generateMember','assignReporting','generateGroup'])if(!core.includes(name))fail(`Group core is missing ${name}.`);
}

export function assertGroup(result,template,fail,label,expectedSize=null){
  if(!result?.group||!result.valid)fail(`${label}: group generation failed.`);
  const errors=errorDiagnostics(result?.diagnostics);
  if(errors.length)fail(`${label}: error diagnostics ${errors.map(item=>item.code).join(', ')}.`);
  const group=result?.group;if(!group)return;
  if(group.groupType!=='npcGroup'||group.schemaVersion!=='1.0.0'||group.template?.id!==template.id||group.shared?.groupKind!==template.groupKind)fail(`${label}: group type, schema, or template reference is incorrect.`);
  const[minimum,maximum]=template.sizeRange;
  if(group.members.length<minimum||group.members.length>maximum)fail(`${label}: member count ${group.members.length} is outside ${minimum}-${maximum}.`);
  if(expectedSize!==null&&group.members.length!==expectedSize)fail(`${label}: generated ${group.members.length} members; expected ${expectedSize}.`);
  const memberIds=new Set(group.members.map(member=>member.memberId)),profileIds=new Set(group.members.map(member=>member.profileId)),names=new Set(group.members.map(member=>member.profile?.identity?.fullName));
  if(memberIds.size!==group.members.length||profileIds.size!==group.members.length||names.size!==group.members.length)fail(`${label}: member IDs, profile IDs, or names are not unique.`);
  if(!memberIds.has(group.leadership?.leaderMemberId))fail(`${label}: leader member does not exist.`);
  if(group.leadership?.secondMemberId&&!memberIds.has(group.leadership.secondMemberId))fail(`${label}: second member does not exist.`);
  const leader=group.members.find(member=>member.memberId===group.leadership.leaderMemberId);
  if(leader?.roleId!==template.leaderRoleId||leader?.reportsToMemberId!==null)fail(`${label}: leader role or reporting state is incorrect.`);
  for(const role of template.roles){
    const members=group.members.filter(member=>member.roleId===role.id);
    if(members.length<role.minimum||members.length>role.maximum)fail(`${label}: role ${role.id} count ${members.length} is outside ${role.minimum}-${role.maximum}.`);
    if(role.surnamePolicy==='shared'&&group.shared.sharedSurname)for(const member of members)if(member.profile?.identity?.familyName!==group.shared.sharedSurname)fail(`${label}: ${member.memberId} does not use the shared surname.`);
  }
  const relationshipIds=new Set(group.relationships.map(edge=>edge.relationshipId));
  if(relationshipIds.size!==group.relationships.length)fail(`${label}: relationship IDs are not unique.`);
  if(group.relationships.length<Math.max(0,(group.members.length-1)*2))fail(`${label}: group does not contain enough reciprocal reporting relationships.`);
  for(const member of group.members){
    if(member.profileId!==member.profile?.profileId)fail(`${label}: ${member.memberId} profile ID mismatch.`);
    if(member.organizationId!==group.shared.organization.id||member.locationId!==group.shared.location.id)fail(`${label}: ${member.memberId} shared references are incorrect.`);
    if(member.memberId!==group.leadership.leaderMemberId&&!memberIds.has(member.reportsToMemberId))fail(`${label}: ${member.memberId} reports to a missing member.`);
    if(member.profile?.identity?.currentLocation!==group.shared.location.name)fail(`${label}: ${member.memberId} does not use the shared location.`);
    const membership=member.profile?.sections?.extensions?.groupMembership?.data;
    if(membership?.groupId!==group.groupId||membership?.memberId!==member.memberId||membership?.roleId!==member.roleId||membership?.organizationId!==group.shared.organization.id||membership?.locationId!==group.shared.location.id||membership?.reportsToMemberId!==member.reportsToMemberId)fail(`${label}: ${member.memberId} groupMembership extension is incomplete.`);
    if(!member.profile?.provenance?.sourceEntryIds?.includes(group.groupId)||!member.profile?.provenance?.sourceEntryIds?.includes(member.roleId))fail(`${label}: ${member.memberId} profile provenance is incomplete.`);
    for(const id of member.relationshipIds)if(!relationshipIds.has(id))fail(`${label}: ${member.memberId} references missing relationship ${id}.`);
  }
  for(const edge of group.relationships){
    if(!memberIds.has(edge.fromMemberId)||!memberIds.has(edge.toMemberId)||edge.fromMemberId===edge.toMemberId)fail(`${label}: ${edge.relationshipId} has invalid endpoints.`);
    const reciprocal=group.relationships.some(other=>other.fromMemberId===edge.toMemberId&&other.toMemberId===edge.fromMemberId&&other.type===edge.reciprocalType&&other.reciprocalType===edge.type);
    if(!reciprocal)fail(`${label}: ${edge.relationshipId} has no reciprocal edge.`);
  }
  if(group.provenance?.memberProfileIds?.length!==group.members.length||!group.provenance?.sourceTemplateIds?.includes(template.id))fail(`${label}: group provenance is incomplete.`);
  const validation=Foundation.validateGroup(group,template);
  if(!validation.valid)fail(`${label}: foundation revalidation failed with ${validation.diagnostics.map(item=>item.code).join(', ')}.`);
}
