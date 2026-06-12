(() => {
  const ROLES = {
    damage:{label:'Damage',weight:1.0,verbs:['burns','shatters','pierces','corrodes','freezes','crushes','ravages','scours']},
    control:{label:'Control',weight:1.2,verbs:['restrains','slows','displaces','silences','confuses','repels','immobilizes','isolates']},
    defense:{label:'Defense',weight:1.0,verbs:['wards','absorbs','deflects','conceals','fortifies','resists','negates','intercepts']},
    healing:{label:'Healing',weight:1.15,verbs:['restores','stabilizes','mends','revitalizes','purifies','regenerates','sustains','revives']},
    utility:{label:'Utility',weight:.85,verbs:['reveals','transports','transforms','communicates','detects','creates','repairs','records']},
    summoning:{label:'Summoning',weight:1.25,verbs:['summons','conjures','calls','binds','manifests','assembles','projects','awakens']},
    debuff:{label:'Debuff',weight:1.1,verbs:['weakens','curses','blinds','deafens','marks','drains','disorients','exposes']},
    buff:{label:'Buff',weight:1.0,verbs:['empowers','hastens','sharpens','strengthens','inspires','protects','guides','enhances']},
    movement:{label:'Movement',weight:1.0,verbs:['teleports','launches','pulls','pushes','phases','levitates','accelerates','repositions']},
    divination:{label:'Divination',weight:.9,verbs:['foretells','locates','interprets','unmasks','surveys','remembers','discerns','traces']}
  };

  const SHAPES = {
    self:{label:'Self',multiplier:.75,targetText:'the caster'},
    single:{label:'Single Target',multiplier:1,targetText:'one creature or object'},
    ray:{label:'Ray',multiplier:1.05,targetText:'one target reached by a spell attack'},
    line:{label:'Line',multiplier:1.2,targetText:'creatures in a line'},
    cone:{label:'Cone',multiplier:1.25,targetText:'creatures in a cone'},
    sphere:{label:'Sphere',multiplier:1.3,targetText:'creatures in a spherical area'},
    cylinder:{label:'Cylinder',multiplier:1.35,targetText:'creatures in a cylinder'},
    wall:{label:'Wall',multiplier:1.4,targetText:'creatures crossing or adjacent to a wall'},
    aura:{label:'Aura',multiplier:1.45,targetText:'creatures within an aura around the caster'},
    chain:{label:'Chained Targets',multiplier:1.3,targetText:'one target and additional nearby targets'}
  };

  const DAMAGE_TYPES=['acid','cold','fire','force','lightning','necrotic','poison','psychic','radiant','thunder','bludgeoning','piercing','slashing'];
  const SAVES=['None','Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma','Spell Attack'];
  const CONDITIONS=['None','blinded','charmed','deafened','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious','slowed','silenced','marked','disarmed','disoriented'];
  const COMPONENT_BURDENS={
    light:{label:'Light',cost:0,text:'ordinary verbal and somatic components'},
    standard:{label:'Standard',cost:.1,text:'verbal, somatic, and common material components'},
    costly:{label:'Costly',cost:-.15,text:'a consumed or expensive material component'},
    rare:{label:'Rare / Quest Component',cost:-.3,text:'a rare, dangerous, or story-significant component'},
    absurd:{label:'Absurdly Overcomplicated',cost:-.45,text:'multiple registered components, witnesses, diagrams, and ceremonial apparatus'}
  };

  function diceForLevel(level,role,shape,concentration){
    const base=level===0?1:Math.max(2,level+1);
    const die=role==='healing'?8:role==='damage'?6:8;
    const areaPenalty=['line','cone','sphere','cylinder','wall','aura','chain'].includes(shape)?1:0;
    const concentrationBonus=concentration?1:0;
    const count=Math.max(1,base-areaPenalty+concentrationBonus);
    return `${count}d${die}`;
  }

  function defaultDuration(role,concentration){
    if(['damage','healing','movement'].includes(role)) return 'Instantaneous';
    if(concentration) return 'Concentration, up to 1 minute';
    if(role==='utility'||role==='divination') return '10 minutes';
    return '1 minute';
  }

  function balanceSpell(spec){
    let score=spec.level===0?1:spec.level*2+2;
    score*=ROLES[spec.role]?.weight||1;
    score*=SHAPES[spec.shape]?.multiplier||1;
    if(spec.condition&&spec.condition!=='None') score+=spec.level<3?2:1;
    if(spec.save==='None'&&spec.role!=='utility'&&spec.role!=='divination') score+=2;
    if(spec.concentration) score-=1.5;
    if(spec.ritual) score-=.75;
    score+=(COMPONENT_BURDENS[spec.componentBurden]?.cost||0)*3;
    if(spec.rangeFeet>=120) score+=1;
    if(spec.rangeFeet>=300) score+=1;
    const expected=spec.level===0?2:spec.level*2+2;
    const ratio=score/expected;
    const band=ratio<.75?'Underpowered':ratio>1.3?'Overpowered':ratio>1.12?'Strong':ratio<.9?'Weak':'Reasonable';
    const warnings=[];
    if(spec.save==='None'&&spec.condition&&spec.condition!=='None') warnings.push('Automatic conditions are unusually strong.');
    if(spec.ritual&&['damage','control','debuff'].includes(spec.role)) warnings.push('Offensive rituals may be difficult to use meaningfully.');
    if(spec.shape==='aura'&&!spec.concentration&&spec.duration!=='Instantaneous') warnings.push('Persistent non-concentration auras can exceed normal power budgets.');
    if(spec.condition==='stunned'&&spec.level<4) warnings.push('Stunned is severe for a low-level spell.');
    if(spec.condition==='paralyzed'&&spec.level<5) warnings.push('Paralyzed is severe for a low-level spell.');
    if(spec.condition==='unconscious'&&spec.level<6) warnings.push('Unconscious is severe for a low-level spell.');
    return {score:Number(score.toFixed(2)),expected,ratio:Number(ratio.toFixed(2)),band,warnings};
  }

  function buildMechanics(options){
    const role=options.role==='random'?Object.keys(ROLES)[Math.floor(Math.random()*Object.keys(ROLES).length)]:options.role;
    const shape=options.shape==='random'?Object.keys(SHAPES)[Math.floor(Math.random()*Object.keys(SHAPES).length)]:options.shape;
    const damageType=options.damageType==='random'?DAMAGE_TYPES[Math.floor(Math.random()*DAMAGE_TYPES.length)]:options.damageType;
    const save=options.save==='random'?SAVES[Math.floor(Math.random()*SAVES.length)]:options.save;
    const condition=options.condition==='random'?CONDITIONS[Math.floor(Math.random()*CONDITIONS.length)]:options.condition;
    const concentration=options.concentration==='auto'?!['damage','healing','movement'].includes(role):options.concentration==='yes';
    const ritual=options.ritual==='auto'?['utility','divination'].includes(role)&&Math.random()<.5:options.ritual==='yes';
    const rangeFeet=shape==='self'||shape==='aura'?0:Number(options.rangeFeet||60);
    const duration=defaultDuration(role,concentration);
    const dice=diceForLevel(options.level,role,shape,concentration);
    const componentBurden=options.componentBurden||'standard';
    const target=SHAPES[shape].targetText;
    const saveText=save==='None'?'No saving throw.':save==='Spell Attack'?'Make a ranged or melee spell attack as appropriate.':`A ${save} saving throw resists the primary effect.`;
    const conditionText=condition==='None'?'No additional condition.':`On a failed save or successful attack, the target is ${condition} until the end of its next turn or for the listed duration.`;
    const roleVerb=ROLES[role].verbs[Math.floor(Math.random()*ROLES[role].verbs.length)];
    const rulesText=`The spell ${roleVerb} ${target}. It deals or restores ${dice} ${damageType} magnitude, or produces an equivalent ${ROLES[role].label.toLowerCase()} effect. ${saveText} ${conditionText}`;
    const spec={...options,role,shape,damageType,save,condition,concentration,ritual,rangeFeet,duration,dice,componentBurden,target,rulesText};
    return {...spec,balance:balanceSpell(spec)};
  }

  window.HBSpellMechanics={ROLES,SHAPES,DAMAGE_TYPES,SAVES,CONDITIONS,COMPONENT_BURDENS,buildMechanics,balanceSpell};
})();
