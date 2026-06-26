import { fixture,groupData,same,generateGroup } from './npc-phase-13-validation-fixture.mjs';
import { assertGroup } from './npc-phase-13-validation-assertions.mjs';

export function runGroupCases(){
  const failures=[];const fail=message=>failures.push(message);
  let groupsGenerated=0,membersGenerated=0,relationshipsGenerated=0,deterministicPairs=0,boundaryGroups=0;
  const namesByTemplate=new Map(),roleSignatures=new Set();

  for(const templateId of fixture.templateIds){
    const template=groupData.templateIndex[templateId];
    const signature=template.roles.map(role=>role.id).sort().join('|');
    if(roleSignatures.has(signature))fail(`${templateId}: role structure duplicates another template.`);
    roleSignatures.add(signature);namesByTemplate.set(templateId,new Set());

    for(let index=0;index<fixture.seedsPerTemplate;index+=1){
      const depth=fixture.depths[index%fixture.depths.length],seed=`phase13:${templateId}:${index}`;
      const result=generateGroup(templateId,seed,{mode:depth});groupsGenerated+=1;
      if(result.group){membersGenerated+=result.group.members.length;relationshipsGenerated+=result.group.relationships.length;namesByTemplate.get(templateId).add(result.group.shared.groupName);}
      assertGroup(result,template,fail,`${templateId} seed ${index} ${depth}`);
      const repeat=generateGroup(templateId,seed,{mode:depth});
      if(!same(result.group,repeat.group))fail(`${templateId} seed ${index}: group generation is not deterministic.`);else deterministicPairs+=1;
    }

    for(const size of template.sizeRange){
      const seed=`phase13:${templateId}:boundary:${size}`,result=generateGroup(templateId,seed,{mode:'deep',size});
      boundaryGroups+=1;groupsGenerated+=1;
      if(result.group){membersGenerated+=result.group.members.length;relationshipsGenerated+=result.group.relationships.length;}
      assertGroup(result,template,fail,`${templateId} boundary ${size}`,size);
      const repeat=generateGroup(templateId,seed,{mode:'deep',size});
      if(!same(result.group,repeat.group))fail(`${templateId} boundary ${size}: group generation is not deterministic.`);else deterministicPairs+=1;
    }
  }

  for(const[templateId,names]of namesByTemplate)if(names.size<2)fail(`${templateId}: generated group names lack diversity.`);
  const expectedGroups=fixture.templateIds.length*(fixture.seedsPerTemplate+2);
  if(groupsGenerated!==expectedGroups)fail(`Generated ${groupsGenerated} groups; expected ${expectedGroups}.`);
  if(boundaryGroups!==fixture.templateIds.length*2)fail(`Generated ${boundaryGroups} boundary groups; expected ${fixture.templateIds.length*2}.`);
  if(deterministicPairs!==groupsGenerated)fail(`Verified ${deterministicPairs} deterministic pairs for ${groupsGenerated} groups.`);
  if(membersGenerated<=groupsGenerated*2)fail('Group generation did not produce meaningful multi-member rosters.');
  if(relationshipsGenerated<Math.max(0,(membersGenerated-groupsGenerated)*2))fail('Group generation did not produce enough reciprocal relationships.');
  return{failures,groupsGenerated,membersGenerated,relationshipsGenerated,deterministicPairs,boundaryGroups};
}
