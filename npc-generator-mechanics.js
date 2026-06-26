(() => {
  'use strict';
  const Random=globalThis.NpcProfileRandom;
  const F=globalThis.NpcProfileGeneratorFoundation;
  const Assembly=globalThis.NpcProfileGeneratorAssembly;
  if(!Random||!F||!Assembly)throw new Error('NPC random, foundation, and assembly modules must load before mechanics.');
  const VERSION='0.1.0';
  const MODES=new Set(['none','open-d20-light','open-d20-full']);

  function normalizeMode(value){
    if(value==='narrative-only'||value==='narrative'||value==='off')return'none';
    if(value==='generated'||value==='light')return'open-d20-light';
    if(value==='full')return'open-d20-full';
    return MODES.has(value)?value:'none';
  }
  function modifier(score){return Math.floor((Number(score)-10)/2);}
  function tierForLevel(level){if(level<=1)return'novice';if(level<=5)return'trained';if(level<=10)return'veteran';return'elite';}
  function thresholdValue(entries,level,fallback){for(const entry of entries||[])if(level<=Number(entry.maximum))return entry.value;return entries?.at(-1)?.value||fallback;}
  function progression(level,type){if(type==='full')return level;if(type==='three-quarter')return Math.floor(level*.75);return Math.floor(level*.5);}
  function levelRange(profile,pack){
    const guidance=pack.mechanicalLevelGuidance?.[profile.archetype.id];
    const defaults=pack.archetypeDefaults?.[profile.archetype.id]||{};
    const minimum=Number(guidance?.[0]??defaults.levelMin??0);
    const maximum=Math.max(minimum,Number(guidance?.[1]??defaults.levelMax??20));
    return[minimum,maximum];
  }
  function chooseLevel(profile,pack,rng,options,diagnostics){
    const[minimum,maximum]=levelRange(profile,pack);
    const mode=options?.levelMode||'appropriate';
    if(mode==='exact'){
      const requested=Number(options.level);
      const finite=Number.isFinite(requested)?Math.round(requested):minimum;
      const level=Math.max(minimum,Math.min(maximum,finite));
      if(level!==finite)diagnostics.push(F.diagnostic('MECHANICS_LEVEL_CLAMPED','info',`Requested level ${finite} was clamped to ${level}.`,'/sections/mechanics/data/level',{minimum,maximum}));
      return level;
    }
    if(mode==='range'){
      const low=Math.max(minimum,Number.isFinite(Number(options.minimum))?Math.round(Number(options.minimum)):minimum);
      const high=Math.min(maximum,Number.isFinite(Number(options.maximum))?Math.round(Number(options.maximum)):maximum);
      return rng.int(Math.min(low,high),Math.max(low,high));
    }
    return rng.int(minimum,maximum);
  }
  function assignAbilities(core,mechanicalPackage,level,rng){
    const order=[...(core.abilityOrder||[])];
    const scores=[...(core.scoreArrays?.[tierForLevel(level)]||[14,13,12,11,10,8])];
    const primary=[...(mechanicalPackage.primaryAbilities||[])].filter(id=>order.includes(id));
    const remaining=order.filter(id=>!primary.includes(id));
    const assignment=[...primary,...rng.shuffle(remaining)];
    const values={};
    assignment.forEach((id,index)=>{values[id]=scores[index]??10;});
    return values;
  }
  function saveValues(core,mechanicalPackage,level,mods){
    const values={};
    for(const save of ['fortitude','reflex','will']){
      const ability=core.saveAbilities?.[save];
      const base=(mechanicalPackage.goodSaves||[]).includes(save)?2+Math.floor(level/2):Math.floor(level/3);
      values[save]=base+Number(mods[ability]||0);
    }
    return values;
  }
  function skillValues(core,mechanicalPackage,level,mods){
    const values={};
    for(const skill of mechanicalPackage.skills||[]){
      const ability=core.skillAbilities?.[skill]||mechanicalPackage.primaryAbilities?.[0]||'wisdom';
      values[skill]=level+3+Number(mods[ability]||0);
    }
    return values;
  }
  function hitPoints(level,hitDie,constitutionModifier){
    if(level<=0)return Math.max(1,Math.floor(hitDie/2)+constitutionModifier);
    const later=Math.max(1,Math.ceil(hitDie*.6)+constitutionModifier);
    return Math.max(1,hitDie+constitutionModifier+Math.max(0,level-1)*later);
  }
  function build(profile,pack,mode,rng,options,diagnostics){
    const core=pack.mechanicsCore;
    const mechanicalPackage=pack.mechanicalPackages?.[profile.archetype.id];
    if(!core||!mechanicalPackage){
      diagnostics.push(F.diagnostic('MECHANICS_PACKAGE_MISSING','error',`Mechanical data is unavailable for ${profile.archetype.id}.`,'/sections/mechanics',{archetypeId:profile.archetype.id}));
      return null;
    }
    const level=chooseLevel(profile,pack,rng.fork('level'),options,diagnostics);
    const scores=assignAbilities(core,mechanicalPackage,level,rng.fork('abilities'));
    const mods=Object.fromEntries(Object.entries(scores).map(([id,score])=>[id,modifier(score)]));
    const combatId=rng.fork('combat-option').choice(mechanicalPackage.combatOptions||['unarmed']);
    const protectionId=rng.fork('protection').choice(mechanicalPackage.protectionOptions||['none']);
    const combat=core.weaponProfiles?.[combatId]||core.weaponProfiles?.unarmed||{label:'Unarmed strike',damage:'1d3',damageAbility:'strength',range:'melee',traits:[]};
    const protection=core.armorProfiles?.[protectionId]||core.armorProfiles?.none||{label:'No armor',armorBonus:0,maxDex:99,speedPenalty:0};
    const attackAbility=combat.damageAbility||mechanicalPackage.primaryAbilities?.[0]||'strength';
    const attackBonus=progression(level,mechanicalPackage.attackProgression)+Number(mods[attackAbility]||0);
    const dexContribution=Math.min(Number(mods.dexterity||0),Number(protection.maxDex??99));
    const defense=10+Number(protection.armorBonus||0)+dexContribution+Math.floor(level/3);
    const saves=saveValues(core,mechanicalPackage,level,mods);
    const skills=skillValues(core,mechanicalPackage,level,mods);
    const mainAttack={id:combatId,label:combat.label,attackBonus,damage:combat.damage,damageModifier:Number(mods[attackAbility]||0),range:combat.range,traits:[...(combat.traits||[])]};
    const data={
      systemId:core.systemId||'open-d20-compatible',
      mechanicalMode:mode,
      level,
      classLabel:mechanicalPackage.classLabel,
      role:mechanicalPackage.role,
      combatReadiness:thresholdValue(core.readinessByLevel,level,'untrained'),
      primaryAbilities:[...(mechanicalPackage.primaryAbilities||[])],
      hitPoints:hitPoints(level,Number(mechanicalPackage.hitDie||6),Number(mods.constitution||0)),
      defense,
      attackBonus,
      mainAttack,
      notableSkills:Object.entries(skills).map(([skill,bonus])=>({skill,bonus})),
      protection:{id:protectionId,label:protection.label,armorBonus:Number(protection.armorBonus||0)},
      equipment:[...(mechanicalPackage.equipment||[])],
      levelSelection:{mode:options?.levelMode||'appropriate',minimum:levelRange(profile,pack)[0],maximum:levelRange(profile,pack)[1]}
    };
    if(mode==='open-d20-full')Object.assign(data,{
      hitDie:Number(mechanicalPackage.hitDie||6),
      attackProgression:mechanicalPackage.attackProgression,
      abilityScores:scores,
      abilityModifiers:mods,
      savingThrows:saves,
      initiative:Number(mods.dexterity||0),
      speed:Math.max(5,Number(core.defaultSpeed||30)-Number(protection.speedPenalty||0)),
      skillBonuses:skills,
      attacks:[mainAttack],
      challengeBand:thresholdValue(core.challengeBands,level,'local')
    });
    return data;
  }
  function enrich(result,config={}){
    if(!result?.profile||!config.pack?.mechanicsCore||!config.pack?.mechanicalPackages)return result;
    const profile=result.profile;
    const mode=normalizeMode(config.mechanicalMode??config.mechanicalOptions?.mode??profile.generator?.mechanicalMode??profile.archetype?.mechanicalMode??'none');
    const counters=config.rerollCounters||profile.generator?.rerollCounters||{};
    if(mode==='none')profile.sections.mechanics={state:'none',reason:'Narrative-only mechanical mode selected.'};
    else{
      const rng=Random.create(Random.deriveSeed(profile.generator.seed,'mechanics',VERSION,profile.archetype.id,`reroll:${Number(counters.mechanics||0)}`));
      const data=build(profile,config.pack,mode,rng,config.mechanicalOptions||{},result.diagnostics);
      profile.sections.mechanics=data?{state:'present',data}:{state:'unknown',reason:'Mechanical package could not be resolved.'};
    }
    profile.generator.mechanicalMode=mode;
    profile.generator.mechanicalOptions=F.clone(config.mechanicalOptions||{});
    Assembly.applyLocks(profile,config.previousProfile,config.locks||[],result.diagnostics);
    profile.diagnostics=F.clone(result.diagnostics);
    result.receipt=F.clone(profile.generator);
    result.valid=!result.diagnostics.some(item=>item.severity==='error');
    return result;
  }

  globalThis.NpcProfileGeneratorMechanics=Object.freeze({VERSION,MODES,normalizeMode,modifier,tierForLevel,progression,levelRange,chooseLevel,assignAbilities,saveValues,skillValues,hitPoints,build,enrich});
})();
