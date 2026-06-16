(() => {
  const ROLES = {
    damage: { label: 'Damage', weight: 1.0 },
    control: { label: 'Control', weight: 1.15 },
    defense: { label: 'Defense', weight: 1.0 },
    healing: { label: 'Healing', weight: 1.05 },
    utility: { label: 'Utility', weight: 0.85 },
    summoning: { label: 'Summoning', weight: 1.2 },
    debuff: { label: 'Debuff', weight: 1.1 },
    buff: { label: 'Buff', weight: 1.0 },
    movement: { label: 'Movement', weight: 1.0 },
    divination: { label: 'Divination', weight: 0.9 }
  };

  const SHAPES = {
    self: { label: 'Self', multiplier: 0.75, targetText: 'the caster' },
    touch: { label: 'Touch', multiplier: 0.9, targetText: 'one creature or object touched' },
    single: { label: 'Single Target', multiplier: 1.0, targetText: 'one creature or object' },
    ray: { label: 'Ray', multiplier: 1.05, targetText: 'one target struck by a ranged touch attack' },
    line: { label: 'Line', multiplier: 1.2, targetText: 'creatures and objects in a line' },
    cone: { label: 'Cone', multiplier: 1.25, targetText: 'creatures and objects in a cone' },
    sphere: { label: 'Burst / Sphere', multiplier: 1.3, targetText: 'creatures and objects in a spherical burst or spread' },
    cylinder: { label: 'Cylinder', multiplier: 1.35, targetText: 'creatures and objects in a cylinder' },
    wall: { label: 'Wall', multiplier: 1.4, targetText: 'creatures crossing, touching, or beginning their turn adjacent to a wall' },
    aura: { label: 'Aura', multiplier: 1.45, targetText: 'creatures within an aura around the caster' },
    chain: { label: 'Chained Targets', multiplier: 1.3, targetText: 'one primary target and additional nearby targets' }
  };

  const DAMAGE_TYPES = ['acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder', 'bludgeoning', 'piercing', 'slashing'];
  const SAVES = ['Auto', 'None', 'Fortitude negates', 'Fortitude partial', 'Reflex half', 'Reflex negates', 'Will negates', 'Will disbelief', 'Ranged touch attack', 'Melee touch attack'];
  const CONDITIONS = ['None', 'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'immobilized', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'weakened', 'slowed', 'silenced', 'marked', 'disarmed', 'disoriented'];
  const RANGE_PROFILES = {
    auto: { label: 'Auto' },
    self: { label: 'Self', text: 'Self' },
    touch: { label: 'Touch', text: 'Touch' },
    close: { label: 'Close', text: 'Close (25 ft. + 5 ft./2 caster levels)' },
    medium: { label: 'Medium', text: 'Medium (100 ft. + 10 ft./caster level)' },
    long: { label: 'Long', text: 'Long (400 ft. + 40 ft./caster level)' },
    fixed30: { label: '30 feet', text: '30 feet' },
    fixed60: { label: '60 feet', text: '60 feet' },
    fixed120: { label: '120 feet', text: '120 feet' }
  };
  const COMPONENT_BURDENS = {
    light: { label: 'Light', components: 'V, S', text: 'ordinary verbal and somatic components' },
    standard: { label: 'Standard', components: 'V, S, M', text: 'verbal, somatic, and a common material component' },
    focus: { label: 'Focus / Divine Focus', components: 'V, S, F/DF', text: 'verbal, somatic, and a reusable focus or divine focus' },
    costly: { label: 'Costly', components: 'V, S, M', text: 'a consumed or expensive material component' },
    rare: { label: 'Rare / Quest Component', components: 'V, S, M, F', text: 'a rare, dangerous, or story-significant component and a dedicated focus' }
  };

  const randomKey = object => {
    const keys = Object.keys(object);
    return keys[Math.floor(Math.random() * keys.length)];
  };
  const randomItem = values => values[Math.floor(Math.random() * values.length)];
  const isAreaShape = shape => ['line', 'cone', 'sphere', 'cylinder', 'wall', 'aura', 'chain'].includes(shape);
  const ordinalLevel = level => level === 0 ? 'cantrip' : `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} level`;

  function defaultSave(role, shape) {
    if (shape === 'ray') return 'Ranged touch attack';
    if (shape === 'touch' && ['damage', 'debuff'].includes(role)) return 'Melee touch attack';
    if (['healing', 'buff', 'defense', 'utility', 'movement', 'divination', 'summoning'].includes(role)) return 'None';
    if (role === 'damage') return isAreaShape(shape) ? 'Reflex half' : 'Fortitude partial';
    if (role === 'control') return randomItem(['Reflex negates', 'Will negates', 'Fortitude negates']);
    return randomItem(['Fortitude negates', 'Will negates']);
  }

  function rangeFor(shape, requested) {
    if (shape === 'self' || shape === 'aura') return 'Self';
    if (shape === 'touch') return 'Touch';
    if (requested && requested !== 'auto' && RANGE_PROFILES[requested]) return RANGE_PROFILES[requested].text;
    if (shape === 'ray' || shape === 'single' || shape === 'chain') return RANGE_PROFILES.medium.text;
    if (shape === 'line' || shape === 'cone') return RANGE_PROFILES.fixed60.text;
    if (shape === 'wall' || shape === 'sphere' || shape === 'cylinder') return RANGE_PROFILES.medium.text;
    return RANGE_PROFILES.close.text;
  }

  function castingTimeFor(level, role, ritual) {
    if (ritual) return level >= 6 ? '1 hour' : '10 minutes';
    if (role === 'defense' && level <= 3) return randomItem(['1 immediate action', '1 swift action', '1 standard action']);
    if (role === 'summoning' && level >= 5) return randomItem(['1 full-round action', '1 round']);
    return '1 standard action';
  }

  function durationFor(level, role, concentration) {
    if (role === 'damage' || role === 'healing') return 'Instantaneous';
    if (role === 'movement') return level >= 5 ? 'Instantaneous or 1 round, as described' : 'Instantaneous';
    if (concentration) return `Concentration, up to ${Math.max(1, level)} round${level === 1 ? '' : 's'} per caster level`;
    if (role === 'summoning') return '1 round per caster level';
    if (['control', 'debuff'].includes(role)) return level <= 2 ? '1 round per caster level' : '1 minute per caster level';
    if (['buff', 'defense'].includes(role)) return level <= 2 ? '1 minute per caster level' : '10 minutes per caster level';
    if (['utility', 'divination'].includes(role)) return level <= 2 ? '10 minutes per caster level' : '1 hour per caster level';
    return '1 minute per caster level';
  }

  function damageProfile(level, shape, type) {
    if (level === 0) {
      return {
        primary: `1d3 ${type} damage`,
        progression: 'The damage is fixed and does not increase with caster level.',
        dice: '1d3',
        cap: '1d3'
      };
    }
    const area = isAreaShape(shape);
    const die = area ? 6 : 8;
    const capCount = level <= 1 ? 5 : level <= 3 ? 10 : level <= 5 ? 15 : level <= 8 ? 20 : 25;
    const rate = area && level <= 2 ? 'one die per two caster levels (minimum 1 die)' : 'one die per caster level';
    const minimumCasterLevel = Math.max(1, level * 2 - 1);
    const minimumDice = area && level <= 2 ? Math.max(1, Math.floor(minimumCasterLevel / 2)) : Math.min(minimumCasterLevel, capCount);
    return {
      primary: `${rate}, dealing ${type} damage with d${die}s, to a maximum of ${capCount}d${die}`,
      progression: `At minimum caster level ${minimumCasterLevel}, the spell deals ${minimumDice}d${die}. It gains dice with caster level until reaching ${capCount}d${die}.`,
      dice: `${rate}; d${die}s`,
      cap: `${capCount}d${die}`
    };
  }

  function healingProfile(level) {
    if (level === 0) return { primary: 'restores 1 hit point or stabilizes a dying creature', progression: 'The healing is fixed and does not increase with caster level.', dice: '1 hit point', cap: '1 hit point' };
    const dice = Math.max(1, Math.ceil(level / 2));
    const cap = level <= 3 ? 10 : level <= 6 ? 15 : 20;
    return {
      primary: `restores ${dice}d8 hit points + 1 point per caster level (maximum +${cap})`,
      progression: `The flat bonus rises with caster level to +${cap}. For every two spell levels above ${ordinalLevel(level)}, increase the healing by 1d8 if the spell is researched as a higher-level variant.`,
      dice: `${dice}d8 + caster level`,
      cap: `${dice}d8 + ${cap}`
    };
  }

  function chooseCondition(role, requested) {
    if (requested !== 'random') return requested;
    const harmful = CONDITIONS.filter(value => value !== 'None');
    if (['control', 'debuff'].includes(role)) return randomItem(harmful);
    if (role === 'damage' && Math.random() < 0.3) {
      return randomItem(harmful.filter(value => !['petrified', 'paralyzed', 'unconscious'].includes(value)));
    }
    return 'None';
  }

  function conditionClause(condition, save, duration) {
    if (!condition || condition === 'None') return 'The spell imposes no additional condition.';
    const attackResolution = save.includes('attack') ? 'On a successful attack' : save === 'None' ? 'When the spell resolves' : 'On a failed saving throw';
    return `${attackResolution}, the affected creature is ${condition} for ${duration === 'Instantaneous' ? '1 round' : duration}. A creature may attempt a new saving throw at the end of each of its turns when the condition would otherwise last longer than 1 round.`;
  }

  function buildRoleEffect(spec) {
    const target = SHAPES[spec.shape].targetText;
    const saveSentence = spec.save === 'None' ? 'No saving throw applies.' : spec.save.includes('attack') ? `${spec.save} resolves the primary effect.` : `${spec.save}.`;
    const conditionSentence = conditionClause(spec.condition, spec.save, spec.duration);

    if (spec.role === 'damage') {
      return {
        summary: `The spell releases a concentrated ${spec.damageType} effect against ${target}.`,
        rulesText: `${target[0].toUpperCase()}${target.slice(1)} take ${spec.magnitude.primary}. ${saveSentence} ${conditionSentence}`,
        scaling: spec.magnitude.progression
      };
    }
    if (spec.role === 'healing') {
      return {
        summary: `The spell channels restorative magic into ${target}.`,
        rulesText: `${target[0].toUpperCase()}${target.slice(1)} ${spec.magnitude.primary}. This healing cannot raise a creature above its normal maximum hit points. ${conditionSentence}`,
        scaling: spec.magnitude.progression
      };
    }
    if (spec.role === 'control') {
      const distance = 5 + Math.max(0, spec.level - 1) * 5;
      return {
        summary: `The spell controls space, movement, or action around ${target}.`,
        rulesText: `${saveSentence} On a failed save, choose one: move the target up to ${distance} feet, prevent it from leaving its space, or impose the listed condition. Forced movement does not provoke attacks of opportunity. ${conditionSentence}`,
        scaling: `The movement distance increases by 5 feet at caster levels ${Math.max(3, spec.level * 2 + 1)}, ${Math.max(7, spec.level * 2 + 5)}, and ${Math.max(11, spec.level * 2 + 9)}.`
      };
    }
    if (spec.role === 'defense') {
      const bonus = 1 + Math.ceil(spec.level / 3);
      const resistance = 5 * Math.max(1, Math.ceil(spec.level / 2));
      return {
        summary: `The spell establishes a protective field around ${target}.`,
        rulesText: `${target[0].toUpperCase()}${target.slice(1)} gain a +${bonus} resistance or deflection bonus against the chosen threat and energy resistance ${resistance} against ${spec.damageType}. The same casting does not stack with itself.`,
        scaling: `At caster levels ${Math.max(5, spec.level * 2 + 1)} and ${Math.max(9, spec.level * 2 + 5)}, increase the resistance by 5. The protective bonus increases by +1 only when the spell is researched at least two spell levels higher.`
      };
    }
    if (spec.role === 'buff') {
      const bonus = 1 + Math.ceil(spec.level / 3);
      return {
        summary: `The spell improves the capabilities of ${target}.`,
        rulesText: `${target[0].toUpperCase()}${target.slice(1)} gain a +${bonus} enhancement or morale bonus to one defined attack roll, saving throw, ability-based check, movement mode, or combat statistic chosen when the spell is created. The bonus type must be fixed in the final spell.`,
        scaling: `The spell may affect one additional target for every four caster levels above the minimum caster level, provided all targets remain within 30 feet of one another.`
      };
    }
    if (spec.role === 'debuff') {
      const penalty = 1 + Math.ceil(spec.level / 3);
      return {
        summary: `The spell weakens ${target} and exposes a specific vulnerability.`,
        rulesText: `${saveSentence} On a failed save, the target takes a -${penalty} penalty to one defined category of attacks, saves, Armor Class, movement, or checks and suffers the listed condition. ${conditionSentence}`,
        scaling: `At caster levels ${Math.max(7, spec.level * 2 + 3)} and ${Math.max(13, spec.level * 2 + 9)}, increase the penalty by 1, to a maximum total penalty of -${penalty + 2}.`
      };
    }
    if (spec.role === 'movement') {
      const distance = spec.level === 0 ? 10 : 20 + spec.level * 10;
      return {
        summary: `The spell repositions ${target} through magical propulsion, passage, or instantaneous translation.`,
        rulesText: `${target[0].toUpperCase()}${target.slice(1)} move up to ${distance} feet without crossing the intervening distance, or gain a climb, swim, or fly speed equal to their land speed for the listed duration. Unwilling targets receive ${spec.save === 'None' ? 'a Will saving throw to negate' : spec.save}.`,
        scaling: `The movement distance increases by 10 feet for every two caster levels above the minimum caster level. At spell level 5 or higher, the spell may carry one additional willing creature per three caster levels.`
      };
    }
    if (spec.role === 'summoning') {
      const maxCr = Math.max(1, spec.level - 1);
      return {
        summary: `The spell calls or constructs a temporary creature, object, or mobile magical force.`,
        rulesText: `The caster summons one creature or construct with a challenge rating no higher than ${maxCr}, or an equivalent unattended object, into an open space within range. It acts on the caster’s turn, follows simple spoken instructions, and disappears when the duration ends or when reduced to 0 hit points.`,
        scaling: `For every two caster levels above the minimum caster level, add one lesser creature whose challenge rating is at least 2 lower, or improve the primary summon’s effective challenge rating by 1, never exceeding the spell level.`
      };
    }
    if (spec.role === 'divination') {
      const bonus = 5 + spec.level * 2;
      return {
        summary: `The spell reveals concealed information concerning ${target}.`,
        rulesText: `The caster detects the chosen category of creature, object, aura, route, memory, or event within range and gains a +${bonus} insight bonus on one related Knowledge, Search, Sense Motive, Spellcraft, Spot, or Survival check. The spell does not automatically defeat effects of a higher spell level.`,
        scaling: `The detection radius or effective range increases by one range category at caster levels ${Math.max(5, spec.level * 2 + 1)} and ${Math.max(11, spec.level * 2 + 7)}.`
      };
    }
    return {
      summary: `The spell produces a practical magical change affecting ${target}.`,
      rulesText: `The caster creates, repairs, transforms, records, opens, closes, illuminates, conceals, or communicates through ${target}. A permanent or economically valuable result requires a costly component and GM approval. ${saveSentence}`,
      scaling: `The amount of material, number of targets, or duration increases at caster levels ${Math.max(5, spec.level * 2 + 1)}, ${Math.max(9, spec.level * 2 + 5)}, and ${Math.max(13, spec.level * 2 + 9)}.`
    };
  }

  function balanceSpell(spec) {
    const expected = spec.level === 0 ? 1 : spec.level * 2 + 2;
    let score = expected * (ROLES[spec.role]?.weight || 1) * (SHAPES[spec.shape]?.multiplier || 1);
    if (spec.condition !== 'None') score += spec.level < 3 ? 2 : 1;
    if (spec.save === 'None' && ['damage', 'control', 'debuff'].includes(spec.role)) score += 2;
    if (spec.ritual) score -= 1;
    if (spec.concentration) score -= 1;
    if (spec.rangeKey === 'long') score += 1;
    const ratio = score / expected;
    const band = ratio < 0.78 ? 'Underpowered' : ratio > 1.35 ? 'Overpowered' : ratio > 1.15 ? 'Strong' : ratio < 0.9 ? 'Weak' : 'Reasonable';
    const warnings = [];
    if (spec.save === 'None' && spec.condition !== 'None') warnings.push('An automatic condition should normally be limited to willing targets or a very short duration.');
    if (spec.condition === 'stunned' && spec.level < 4) warnings.push('Stunned is severe below 4th spell level.');
    if (spec.condition === 'paralyzed' && spec.level < 5) warnings.push('Paralyzed is severe below 5th spell level.');
    if (spec.condition === 'petrified' && spec.level < 6) warnings.push('Petrification is severe below 6th spell level.');
    if (spec.shape === 'aura' && !spec.concentration && spec.duration !== 'Instantaneous') warnings.push('A persistent non-concentration aura can exceed a normal power budget.');
    if (spec.role === 'summoning' && spec.level === 0) warnings.push('A cantrip summon should be harmless, noncombatant, or unable to attack.');
    return { score: Number(score.toFixed(2)), expected, ratio: Number(ratio.toFixed(2)), band, warnings };
  }

  function buildMechanics(options) {
    const role = options.role === 'random' ? randomKey(ROLES) : options.role;
    const shape = options.shape === 'random' ? randomKey(SHAPES) : options.shape;
    const damageType = options.damageType === 'random' ? randomItem(DAMAGE_TYPES) : options.damageType;
    const save = !options.save || options.save === 'Auto' || options.save === 'random' ? defaultSave(role, shape) : options.save;
    const condition = chooseCondition(role, options.condition);
    const concentration = options.concentration === 'auto' ? ['control', 'buff', 'debuff'].includes(role) && Math.random() < 0.45 : options.concentration === 'yes';
    const ritual = options.ritual === 'auto' ? ['utility', 'divination', 'summoning'].includes(role) && Math.random() < 0.25 : options.ritual === 'yes';
    const rangeKey = options.rangeKey || 'auto';
    const range = rangeFor(shape, rangeKey);
    const duration = durationFor(options.level, role, concentration);
    const magnitude = role === 'healing'
      ? healingProfile(options.level)
      : role === 'damage'
        ? damageProfile(options.level, shape, damageType)
        : { primary: 'Effect-based; see the mechanical effect below', progression: 'The spell scales through duration, targets, area, bonuses, penalties, or effect strength rather than direct damage dice.', dice: 'Effect-based', cap: 'Role-based' };
    const componentBurden = options.componentBurden || 'standard';
    const castingTime = castingTimeFor(options.level, role, ritual);
    const spellResistance = ['healing', 'buff', 'defense'].includes(role) ? 'Yes (harmless)' : ['summoning', 'utility', 'divination'].includes(role) ? 'No' : 'Yes';
    const spec = {
      ...options,
      role,
      shape,
      damageType,
      save,
      condition,
      concentration,
      ritual,
      rangeKey,
      range,
      duration,
      magnitude,
      componentBurden,
      castingTime,
      target: SHAPES[shape].targetText,
      spellResistance
    };
    const effect = buildRoleEffect(spec);
    return { ...spec, ...effect, balance: balanceSpell(spec) };
  }

  window.HBSpellMechanics = {
    ROLES,
    SHAPES,
    DAMAGE_TYPES,
    SAVES,
    CONDITIONS,
    RANGE_PROFILES,
    COMPONENT_BURDENS,
    buildMechanics,
    balanceSpell
  };
})();
