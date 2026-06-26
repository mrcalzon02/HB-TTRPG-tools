(() => {
  'use strict';
  const F = globalThis.NpcProfileGeneratorFoundation;
  if (!F) throw new Error('NPC foundation must load before household core.');
  const DEFAULT_RULE = Object.freeze({ adultThreshold:18, elderThreshold:70, maxAge:95, parentGapMin:16, parentGapMax:45, siblingSpread:12, partnerSpread:15 });

  function ruleFor(pack, ancestryId) { return pack?.ancestryRules?.[ancestryId] || pack?.defaultAncestryRule || DEFAULT_RULE; }
  function rangesFor(rule) {
    const adult=Number(rule.adultThreshold||18),elder=Math.max(adult+2,Number(rule.elderThreshold||70)),maximum=Math.max(elder,Number(rule.maxAge||95));
    const childEnd=Math.max(0,Math.floor(adult*.55)-1),middleStart=Math.max(adult+1,Math.floor(adult+(elder-adult)*.65));
    return {child:[0,childEnd],adolescent:[childEnd+1,adult-1],adult:[adult,middleStart-1],'middle-aged':[middleStart,elder-1],elderly:[elder,maximum]};
  }
  function stageForAge(age,rule){const ranges=rangesFor(rule),number=Math.max(0,Number(age||0));for(const[stage,[minimum,maximum]]of Object.entries(ranges))if(number>=minimum&&number<=maximum)return stage;return number>ranges.elderly[1]?'elderly':'adult';}
  function table(pack,id,fallback){const entries=F.tableEntries(pack,id);return entries.length?entries:fallback;}
  function choose(pack,id,rng,fallback){const entries=table(pack,id,fallback),weighted=entries.some(entry=>F.isObject(entry)&&'weight'in entry);return weighted?rng.weightedChoice(entries):rng.choice(entries);}
  function uniqueName(pack,rng,reserved){const given=table(pack,'givenNames',['Alex']),family=table(pack,'familyNames',['Vale']);for(let attempt=0;attempt<20;attempt+=1){const name=`${rng.fork('given',attempt).choice(given)} ${rng.fork('family',attempt).choice(family)}`;if(!reserved.has(name)){reserved.add(name);return name;}}const fallback=`Relative ${reserved.size+1}`;reserved.add(fallback);return fallback;}
  function personRecord(relation,age,ancestryId,pack,rng,reserved,extra={}){return{state:'present',name:uniqueName(pack,rng.fork('name'),reserved),relation,age:Math.max(0,Math.round(age)),ageBand:stageForAge(age,ruleFor(pack,ancestryId)),ancestryId,...extra};}
  function parentRecord(relation,profileAge,ancestryId,pack,rng,reserved){
    const rule=ruleFor(pack,ancestryId),minimum=Number(rule.parentGapMin||16),maximum=Number(rule.parentGapMax||45),gap=rng.int(minimum,maximum),expectedAge=profileAge+gap,maxAge=Number(rule.maxAge||95);
    let state=choose(pack,'parentStates',rng.fork('state'),[{value:'living',weight:58},{value:'deceased',weight:27},{value:'unknown',weight:15}]);
    if(expectedAge>maxAge)state='deceased';
    if(state==='unknown')return{state:'unknown',relation};
    const name=uniqueName(pack,rng.fork('name'),reserved);
    if(state==='living')return{state:'living',name,relation,age:expectedAge,ageBand:stageForAge(expectedAge,rule),ancestryId};
    const ageAtDeath=rng.fork('age-at-death').int(gap,Math.max(gap,Math.min(maxAge,expectedAge)));
    return{state:'deceased',name,relation,wouldBeAge:expectedAge,ageAtDeath,ageBandAtDeath:stageForAge(ageAtDeath,rule),ancestryId};
  }
  function generateChildren(profileAge,ancestryId,pack,rng,reserved,minor){const rule=ruleFor(pack,ancestryId),maximumChildAge=profileAge-Number(rule.parentGapMin||16);if(minor||maximumChildAge<0)return[];const possibleMaximum=profileAge>=Number(rule.elderThreshold||70)?5:profileAge>=Number(rule.adultThreshold||18)*2?4:2;const count=rng.weightedChoice([{value:0,weight:30},{value:1,weight:30},{value:2,weight:23},{value:3,weight:11},{value:4,weight:5},{value:5,weight:1}]);const children=[];for(let index=0;index<Math.min(count,possibleMaximum);index+=1){const age=rng.fork('age',index).int(0,Math.max(0,maximumChildAge));children.push(personRecord('child',age,ancestryId,pack,rng.fork('child',index),reserved));}return children;}
  function generateSiblings(profileAge,ancestryId,pack,rng,reserved){const rule=ruleFor(pack,ancestryId),count=Number(choose(pack,'siblingCounts',rng.fork('count'),[{value:0,weight:20},{value:1,weight:35},{value:2,weight:27},{value:3,weight:13},{value:4,weight:5}])||0),siblings=[];for(let index=0;index<count;index+=1){const spread=Number(rule.siblingSpread||12),age=Math.max(0,Math.min(Number(rule.maxAge||95),profileAge+rng.fork('offset',index).int(-spread,spread)));siblings.push(personRecord('sibling',age,ancestryId,pack,rng.fork('sibling',index),reserved));}return siblings;}
  function generatePartner(maritalState,profileAge,ancestryId,pack,rng,reserved,minor){if(minor)return{state:'not-applicable',reason:'Profile is below the ancestry adult threshold.'};if(maritalState==='single')return{state:'none',reason:'No current partner.'};if(maritalState==='widowed')return{state:'none',reason:'Partner is deceased.'};if(maritalState==='separated')return{state:'none',reason:'Partners live separately.'};if(maritalState==='private')return{state:'unknown',reason:'Relationship status is private.'};const rule=ruleFor(pack,ancestryId),spread=Number(rule.partnerSpread||15),age=Math.max(Number(rule.adultThreshold||18),Math.min(Number(rule.maxAge||95),profileAge+rng.int(-spread,spread)));return personRecord(maritalState==='married'?'spouse':'partner',age,ancestryId,pack,rng,reserved,{relationshipState:maritalState});}
  function relationshipRecord(role,pack,rng,reserved,deep=false){const record={state:'present',name:uniqueName(pack,rng.fork('name'),reserved),role,quality:choose(pack,'relationshipQualities',rng.fork('quality'),['reliable in a crisis'])};if(deep)record.tension=choose(pack,'relationshipTensions',rng.fork('tension'),['an old unresolved obligation']);return record;}

  globalThis.NpcProfileHouseholdCore=Object.freeze({DEFAULT_RULE,ruleFor,rangesFor,stageForAge,table,choose,uniqueName,personRecord,parentRecord,generateChildren,generateSiblings,generatePartner,relationshipRecord});
})();
