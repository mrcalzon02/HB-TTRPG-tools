(() => {
  'use strict';
  const H=globalThis.NpcProfileHouseholdCore;
  if(!H)throw new Error('Household core must load before relationship records.');

  function enrich(profile,context){
    const{pack,depth,rng,reserved,belowAdult}=context;
    const family=profile.sections?.familyHousehold;
    if(family?.state==='present'){
      const data=family.data||(family.data={});
      const count=belowAdult?0:rng.fork('dependent-count').weightedChoice([{value:0,weight:70},{value:1,weight:24},{value:2,weight:6}]);
      data.dependentCount=count;
      if(depth!=='quick'){
        data.dependents=[];
        for(let index=0;index<count;index+=1){
          data.dependents.push({
            state:'present',
            name:H.uniqueName(pack,rng.fork('dependent-name',index),reserved),
            relation:H.choose(pack,'dependentTypes',rng.fork('dependent-role',index),['household dependent'])
          });
        }
      }
      if(depth==='deep'){
        const absent=rng.fork('absent-state').bool(.45);
        data.absentMember=absent?{
          state:'present',
          name:H.uniqueName(pack,rng.fork('absent-name'),reserved),
          reason:H.choose(pack,'absentMemberReasons',rng.fork('absent-reason'),['living elsewhere'])
        }:{state:'none',reason:'No significant absent household member.'};
      }
    }

    const section=profile.sections?.affiliationsRelationships;
    if(section?.state!=='present')return;
    const data=section.data||(section.data={});
    data.relationshipCount=depth==='quick'?1:depth==='standard'?2:4;
    data.trustedContact=H.relationshipRecord('trusted contact',pack,rng.fork('trusted'),reserved,depth==='deep');
    if(depth!=='quick')data.strainedRelationship=H.relationshipRecord('strained relationship',pack,rng.fork('strained'),reserved,true);
    if(depth==='deep'){
      data.mentorOrPatron=H.relationshipRecord(H.choose(pack,'relationshipRoles',rng.fork('mentor-role'),['mentor']),pack,rng.fork('mentor'),reserved,true);
      data.rival=H.relationshipRecord('rival',pack,rng.fork('rival'),reserved,true);
      data.relationshipSecret=H.choose(pack,'relationshipSecrets',rng.fork('secret'),['two contacts share confidential information']);
    }
  }

  globalThis.NpcProfileRelationshipRecords=Object.freeze({enrich});
})();
