(() => {
  'use strict';
  const H=globalThis.NpcProfileHouseholdCore;
  if(!H)throw new Error('Household core must load before relationship records.');

  function enrich(profile,context){
    const{pack,depth,rng,reserved}=context;
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
