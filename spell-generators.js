(() => {
  const spellTools = {
    'normal-spell-generator': {
      label: 'Launch Spell Generator',
      render: renderNormalSpellGenerator
    },
    'eccentric-spell-generator': {
      label: 'Launch Eccentric Generator',
      render: renderEccentricSpellGenerator
    }
  };

  const schools = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
  const classes = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer/Wizard'];
  const descriptors = ['acid', 'air', 'cold', 'darkness', 'earth', 'electricity', 'fear', 'fire', 'force', 'good', 'healing', 'light', 'mind-affecting', 'shadow', 'sonic', 'water'];
  const ranges = ['Personal', 'Touch', 'Close (25 ft. + 5 ft./2 levels)', 'Medium (100 ft. + 10 ft./level)', 'Long (400 ft. + 40 ft./level)'];
  const durations = ['Instantaneous', '1 round/level', '1 minute/level', '10 minutes/level', '1 hour/level', 'Concentration, up to 1 round/level'];
  const targets = ['one creature', 'one willing creature', 'one object', 'one creature per two caster levels', 'a 10-ft.-radius burst', 'a 20-ft.-radius spread', 'a 30-ft. cone', 'a 60-ft. line'];

  const effectsBySchool = {
    Abjuration: [
      'grant a +2 resistance bonus on saving throws',
      'absorb 5 points of energy damage per caster level',
      'suppress one hostile magical effect for 1 round per caster level',
      'grant damage reduction 5/magic',
      'ward the target against forced movement and teleportation'
    ],
    Conjuration: [
      'summon a useful creature for 1 round per caster level',
      'create a temporary bridge, platform, or shelter',
      'teleport the target a short distance',
      'fill the area with grasping terrain',
      'call a cloud that obscures sight and movement'
    ],
    Divination: [
      'reveal magical auras and recent spell use',
      'grant a +10 insight bonus on one knowledge check',
      'show the direction of a named creature or object',
      'warn the caster of immediate danger',
      'expose invisible and concealed creatures'
    ],
    Enchantment: [
      'impose a -2 penalty on attacks and saving throws',
      'compel the target to pause and listen',
      'grant allies a +2 morale bonus',
      'frighten hostile creatures for 1d4 rounds',
      'calm creatures in the area'
    ],
    Evocation: [
      'deal 1d6 damage per caster level, maximum 10d6',
      'create a wall of elemental energy',
      'push creatures 5 ft. per three caster levels',
      'produce a burst of blinding light',
      'create a force barrier with 10 hit points per caster level'
    ],
    Illusion: [
      'create a convincing visual and auditory image',
      'grant concealment to creatures in the area',
      'disguise the target\'s appearance',
      'create illusory duplicates',
      'mask the sounds and signs of movement'
    ],
    Necromancy: [
      'deal 1d6 negative energy damage per two caster levels',
      'inflict one temporary negative level',
      'grant temporary hit points equal to twice caster level',
      'weaken the target\'s Strength by 1d4',
      'animate a recently destroyed unattended object with eerie motion'
    ],
    Transmutation: [
      'grant a +4 enhancement bonus to one ability score',
      'increase or reduce the target\'s size by one category',
      'grant a climb, swim, or fly speed',
      'harden one object and increase its hardness',
      'alter terrain into difficult or stable ground'
    ]
  };

  const normalNamePrefixes = {
    acid: 'Caustic', air: 'Gale', cold: 'Frost', darkness: 'Umbral', earth: 'Stone', electricity: 'Storm', fear: 'Dread', fire: 'Ember', force: 'Force', good: 'Radiant', healing: 'Restorative', light: 'Luminous', 'mind-affecting': 'Mesmeric', shadow: 'Shadow', sonic: 'Resonant', water: 'Tidal'
  };

  const normalNameNouns = {
    Abjuration: ['Ward', 'Aegis', 'Bulwark', 'Seal'],
    Conjuration: ['Passage', 'Calling', 'Bridge', 'Gate'],
    Divination: ['Insight', 'Revelation', 'Eye', 'Omen'],
    Enchantment: ['Command', 'Accord', 'Whisper', 'Courage'],
    Evocation: ['Burst', 'Lance', 'Wall', 'Surge'],
    Illusion: ['Veil', 'Phantom', 'Mask', 'Mirage'],
    Necromancy: ['Pall', 'Grasp', 'Vigor', 'Withering'],
    Transmutation: ['Form', 'Stride', 'Transformation', 'Tempering']
  };

  const eccentricPools = {
    creators: ['Professor Wobblewick', 'Saint Noodle the Inconvenient', 'Madam Crumpet', 'Archmage Kevin', 'The Very Tired Oracle', 'Baron von Sneeze', 'Auntie Hexadecimal', 'Gorb the Adequate'],
    titles: ['Marmalade Catastrophe', 'Baffling Sock Exchange', 'Emergency Turnip Protocol', 'Magnificent Pigeon Audit', 'Unlicensed Hat Rebellion', 'Spoonful of Consequences', 'Accordion of Mild Regret', 'Suspicious Teapot'],
    subjects: ['left shoes', 'angry geese', 'ceremonial soup', 'dramatic eyebrows', 'tiny furniture', 'accusatory turnips', 'invisible accordions', 'bureaucratic pigeons'],
    actions: ['trade places unexpectedly', 'begin offering legal advice', 'sing the caster\'s private doubts', 'march toward the nearest mayor', 'become aggressively fashionable', 'float six inches above the floor', 'demand a formal apology', 'rearrange themselves by emotional importance'],
    components: ['a bent teaspoon', 'three apologetic raisins', 'a sock with no known partner', 'the signature of a pigeon', 'a thimble of lukewarm gravy', 'one dramatically snapped breadstick', 'a button stolen from your own coat', 'a receipt for something impossible'],
    sideEffects: ['the caster smells faintly of cinnamon', 'all witnesses remember a different hat', 'a tiny bell rings whenever anyone lies', 'the nearest spoon becomes judgmental', 'the effect insists on being introduced properly', 'rain falls upward for three seconds', 'one nearby chicken gains confidence', 'the target develops an inconvenient theme song'],
    origins: ['invented during a catering emergency', 'discovered in the margin of a tax code', 'created to win an argument with a goose', 'reverse-engineered from a cursed stage play', 'the accidental result of competent magic performed badly'],
    uses: ['comic relief', 'strange treasure', 'wizard signature spell', 'social complication', 'harmless magical hazard', 'plot-critical absurdity']
  };

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function numberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function injectStyles() {
    if (document.getElementById('spell-generator-style')) return;
    const style = document.createElement('style');
    style.id = 'spell-generator-style';
    style.textContent = `
      .spell-generator-note { margin: 0 0 12px; color: var(--muted); }
      .spell-generator-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
      .spell-generator-grid label { display: grid; gap: 6px; }
      .spell-generator-grid select { background: #10131a; border: 1px solid var(--line); color: var(--ink); border-radius: 12px; padding: 10px 12px; width: 100%; }
      @media (max-width: 900px) { .spell-generator-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      const moduleId = card.dataset.moduleId;
      const tool = spellTools[moduleId];
      if (!tool || card.dataset.spellReady === 'true') return;
      const button = document.createElement('button');
      button.className = 'secondary-action alpha-launch';
      button.type = 'button';
      button.textContent = tool.label;
      button.addEventListener('click', () => openTool(moduleId, card.querySelector('h3')?.textContent || 'Spell Generator'));
      card.appendChild(button);
      card.dataset.spellReady = 'true';
    });
  }

  function openTool(moduleId, title) {
    const dashboard = document.getElementById('kaysender');
    const status = document.getElementById('kaysender-status');
    const target = dashboard || document.querySelector('main');
    if (!target) return;

    let panel = document.getElementById('kaysender-alpha-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-alpha-panel';
      panel.className = 'alpha-tool-panel no-print';
      if (status) status.insertAdjacentElement('afterend', panel);
      else target.prepend(panel);
    }

    panel.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'section-heading';
    header.innerHTML = `<p class="eyebrow">Alpha generator</p><h2>${title}</h2>`;
    panel.appendChild(header);
    spellTools[moduleId].render(panel);
    switchKaysenderView();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function renderNormalSpellGenerator(panel) {
    const note = document.createElement('p');
    note.className = 'spell-generator-note';
    note.textContent = 'Produces mechanically structured spell drafts with level, class lists, school, components, targeting, saving throws, resistance, duration, scaling, and a balance warning.';

    const grid = document.createElement('div');
    grid.className = 'spell-generator-grid';
    grid.innerHTML = `
      <label>Spell level<select id="normal-spell-level"><option value="random">Random</option>${Array.from({ length: 10 }, (_, level) => `<option value="${level}">${level}</option>`).join('')}</select></label>
      <label>Primary class<select id="normal-spell-class"><option value="random">Random</option>${classes.map(name => `<option value="${name}">${name}</option>`).join('')}</select></label>
      <label>School<select id="normal-spell-school"><option value="random">Random</option>${schools.map(name => `<option value="${name}">${name}</option>`).join('')}</select></label>
    `;

    const button = makeButton('Generate Functional Spell');
    const output = makeOutput();
    panel.append(note, grid, button, output);

    button.addEventListener('click', () => {
      const requestedLevel = document.getElementById('normal-spell-level')?.value || 'random';
      const level = requestedLevel === 'random' ? numberBetween(0, 9) : Number(requestedLevel);
      const requestedClass = document.getElementById('normal-spell-class')?.value || 'random';
      const primaryClass = requestedClass === 'random' ? choice(classes) : requestedClass;
      const requestedSchool = document.getElementById('normal-spell-school')?.value || 'random';
      const school = requestedSchool === 'random' ? choice(schools) : requestedSchool;
      const descriptor = choice(descriptors);
      const effect = scaleEffect(choice(effectsBySchool[school]), level);
      const range = level === 0 ? choice(ranges.slice(0, 3)) : choice(ranges);
      const duration = level === 0 ? choice(['Instantaneous', '1 round', 'Concentration, up to 1 round']) : choice(durations);
      const name = `${normalNamePrefixes[descriptor]} ${choice(normalNameNouns[school])}`;

      renderOutput(output, name, [
        ['School', `${school} [${descriptor}]`],
        ['Classes', buildClassLevels(primaryClass, level)],
        ['Components', level === 0 ? 'V, S' : choice(['V, S', 'V, S, M', 'V, S, DF', 'S, M'])],
        ['Casting time', level >= 7 ? choice(['1 standard action', '1 full round', '10 minutes']) : choice(['1 standard action', '1 swift action', '1 round'])],
        ['Range', range],
        ['Target / Area', choice(targets)],
        ['Duration', duration],
        ['Saving throw', savingThrowFor(school)],
        ['Spell resistance', ['Conjuration', 'Divination'].includes(school) ? choice(['No', 'Yes (harmless)']) : 'Yes'],
        ['Effect', effect],
        ['Balance note', balanceNote(level, school)]
      ]);
    });
  }

  function renderEccentricSpellGenerator(panel) {
    const note = document.createElement('p');
    note.className = 'spell-generator-note';
    note.textContent = 'Prioritizes ridiculous names, memorable manifestations, odd components, creator personality, styling, and side effects. Mechanical detail is optional and deliberately secondary.';

    const grid = document.createElement('div');
    grid.className = 'spell-generator-grid';
    grid.innerHTML = `
      <label>Oddity<select id="eccentric-oddity"><option>Mildly peculiar</option><option selected>Distinctly eccentric</option><option>Utter nonsense</option></select></label>
      <label>Presentation<select id="eccentric-style"><option>Wizardly pomp</option><option>Domestic magic</option><option>Bureaucratic ritual</option><option>Unhelpful prophecy</option><option>Goblin scholarship</option></select></label>
      <label>Mechanical detail<select id="eccentric-mechanics"><option>Flavor only</option><option selected>Loose suggestion</option><option>Table-ready odd effect</option></select></label>
    `;

    const button = makeButton('Generate Eccentric Spell');
    const output = makeOutput();
    panel.append(note, grid, button, output);

    button.addEventListener('click', () => {
      const oddity = document.getElementById('eccentric-oddity')?.value || 'Distinctly eccentric';
      const style = document.getElementById('eccentric-style')?.value || 'Wizardly pomp';
      const mechanicsMode = document.getElementById('eccentric-mechanics')?.value || 'Loose suggestion';
      const creator = choice(eccentricPools.creators);
      const subject = choice(eccentricPools.subjects);
      const title = `${creator}'s ${choice(eccentricPools.titles)}`;

      renderOutput(output, title, [
        ['Oddity', oddity],
        ['Style', style],
        ['Attributed creator', creator],
        ['Required nonsense', choice(eccentricPools.components)],
        ['Manifestation', `For a dramatically appropriate amount of time, ${subject} ${choice(eccentricPools.actions)}.`],
        ['Mechanical posture', eccentricMechanics(mechanicsMode, oddity, subject)],
        ['Unnecessary side effect', choice(eccentricPools.sideEffects)],
        ['Rumored origin', choice(eccentricPools.origins)],
        ['GM use', choice(eccentricPools.uses)]
      ]);
    });
  }

  function buildClassLevels(primaryClass, level) {
    const levelMap = new Map([[primaryClass, level]]);
    const alternatives = classes.filter(name => name !== primaryClass);
    const additionalCount = level === 0 ? 1 : numberBetween(1, 3);

    for (let index = 0; index < additionalCount; index += 1) {
      const className = choice(alternatives);
      if (levelMap.has(className)) continue;
      let classLevel = level;
      if (['Paladin', 'Ranger'].includes(className)) classLevel = Math.min(4, Math.max(1, level - 1));
      if (className === 'Bard') classLevel = Math.min(6, Math.max(0, level));
      levelMap.set(className, classLevel);
    }

    return Array.from(levelMap.entries()).map(([name, classLevel]) => `${name} ${classLevel}`).join(', ');
  }

  function scaleEffect(effect, level) {
    if (level === 0) {
      return effect
        .replace(/1d6 damage per caster level, maximum 10d6/g, '1d3 damage')
        .replace(/5 points of energy damage per caster level/g, '3 points of energy damage')
        .replace(/one temporary negative level/g, 'a -1 penalty on one roll')
        .replace(/\+4/g, '+1')
        .replace(/\+2/g, '+1');
    }
    if (level <= 2) {
      return effect
        .replace(/maximum 10d6/g, 'maximum 5d6')
        .replace(/damage reduction 5\/magic/g, 'damage reduction 2/magic')
        .replace(/one temporary negative level/g, 'a -1 penalty on attacks and saves');
    }
    if (level >= 7) return `${effect}; at caster level 15th or higher, double either its normal area or number of targets`;
    return effect;
  }

  function savingThrowFor(school) {
    if (school === 'Divination') return 'None';
    if (school === 'Abjuration') return choice(['Will negates (harmless)', 'Fortitude negates (object)', 'None']);
    return choice(['Reflex half', 'Fortitude negates', 'Will negates', 'Will partial']);
  }

  function balanceNote(level, school) {
    if (level === 0) return 'Cantrip scale: narrow utility, brief duration, or trivial damage only.';
    if (level <= 3) return `Low-level ${school.toLowerCase()} draft. Keep damage, bonuses, and action denial modest and allow a save when hostile.`;
    if (level <= 6) return 'Mid-level draft. Compare area, duration, action economy, and repeatability against spells of the same level.';
    return 'High-level draft. Verify that broad scope, no-save control, permanent outcomes, or encounter-ending power are justified by the slot level.';
  }

  function eccentricMechanics(mode, oddity, subject) {
    if (mode === 'Flavor only') return 'No fixed mechanics. Use as description, rumor, magical graffiti, or an NPC signature.';
    if (mode === 'Table-ready odd effect') {
      const dc = oddity === 'Utter nonsense' ? 18 : oddity === 'Distinctly eccentric' ? 15 : 12;
      return `Creatures directly affected may attempt a DC ${dc} Will save to remain sensible. On failure, the odd behavior lasts 1d4 rounds and should inconvenience or redirect rather than cause serious harm.`;
    }
    return `Suggested effect: ${subject} create a minor social, sensory, or positioning complication for 1d4 rounds. Use a save only when a player character strongly resists.`;
  }

  function makeButton(text) {
    const button = document.createElement('button');
    button.className = 'primary-action';
    button.type = 'button';
    button.textContent = text;
    return button;
  }

  function makeOutput() {
    const output = document.createElement('div');
    output.className = 'alpha-output';
    return output;
  }

  function renderOutput(container, title, rows) {
    container.innerHTML = '';
    const card = document.createElement('article');
    card.className = 'alpha-result-card';
    const heading = document.createElement('h4');
    heading.textContent = title;
    card.appendChild(heading);
    rows.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'alpha-kv';
      const label = document.createElement('strong');
      const text = document.createElement('span');
      label.textContent = key;
      text.textContent = value;
      row.append(label, text);
      card.appendChild(row);
    });
    container.appendChild(card);
  }

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();