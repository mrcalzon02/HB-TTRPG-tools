(() => {
  'use strict';
  const H=globalThis.NpcProfileHouseholdCore;
  if(!H)throw new Error('Household core must load before household records.');

  function enrich(profile,context){
    const section=profile.sections?.familyHousehold;
    if(section?.state!=='present')return;
    const{pack,depth,ancestryId,rule,rng,reserved,belowAdult,age,lifeStage}=context;
    const data=section.data||(section.data={});
    const status=belowAdult?'not-applicable':H.choose(pack,'maritalStates',rng.fork('status'),[{value:'single',weight:40},{value:'partnered',weight:25},{value:'married',weight:35}]);
    const siblings=H.generateSiblings(age,ancestryId,pack,rng.fork('siblings'),reserved);
    const descendants=H.generateChildren(age,ancestryId,pack,rng.fork('descendants'),reserved,belowAdult);
    const dependentCount=belowAdult?0:rng.fork('dependent-count').weightedChoice([{value:0,weight:70},{value:1,weight:24},{value:2,weight:6}]);
    data.householdType=H.choose(pack,'familyHouseholdTypes',rng.fork('type'),['single-person household']);
    data.lifeStage=lifeStage;
    data.maritalState=status;
    data.siblingCount=siblings.length;
    data.childCount=descendants.length;
    data.dependentCount=dependentCount;
    if(depth==='quick')return;
    data.partner=H.generatePartner(status,age,ancestryId,pack,rng.fork('partner'),reserved,belowAdult);
    data.parents=[H.parentRecord('parent',age,ancestryId,pack,rng.fork('parent',0),reserved),H.parentRecord('parent',age,ancestryId,pack,rng.fork('parent',1),reserved)];
    data.siblings=siblings;
    data.children=descendants;
    data.dependents=[];
    for(let index=0;index<dependentCount;index+=1){
      data.dependents.push({
        state:'present',
        name:H.uniqueName(pack,rng.fork('dependent-name',index),reserved),
        relation:H.choose(pack,'dependentTypes',rng.fork('dependent-role',index),['household dependent'])
      });
    }
    if(belowAdult){
      const gap=Number(rule.parentGapMin||16)+rng.fork('guardian-gap').int(0,Math.max(1,Number(rule.parentGapMax||45)-Number(rule.parentGapMin||16)));
      data.guardian=H.personRecord('guardian',Math.min(Number(rule.maxAge||95),age+gap),ancestryId,pack,rng.fork('guardian'),reserved);
    }
    if(depth==='deep'){
      data.familyObligation=H.choose(pack,'familyObligations',rng.fork('obligation'),['maintains the shared household']);
      data.householdTension=H.choose(pack,'householdTensions',rng.fork('tension'),['unequal household responsibilities']);
      const absent=rng.fork('absent-state').bool(.45);
      data.absentMember=absent?{
        state:'present',
        name:H.uniqueName(pack,rng.fork('absent-name'),reserved),
        reason:H.choose(pack,'absentMemberReasons',rng.fork('absent-reason'),['living elsewhere'])
      }:{state:'none',reason:'No significant absent household member.'};
    }
  }

  globalThis.NpcProfileHouseholdRecords=Object.freeze({enrich});
})();
