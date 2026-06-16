(() => {
  const unique = values => [...new Set(values.filter(Boolean))];
  const combine = (starts, middles, ends, limit = 180) => {
    const output = [];
    for (const start of starts) {
      for (const middle of middles) {
        for (const end of ends) {
          output.push(`${start} ${middle} ${end}`.replace(/\s+/g, ' ').trim());
          if (output.length >= limit) return unique(output);
        }
      }
    }
    return unique(output);
  };
  const pick = values => values[Math.floor(Math.random() * values.length)];

  const THEME_SPECS = {
    arcane: {
      label: 'Arcane',
      roots: ['Aegis', 'Lattice', 'Sigil', 'Prism', 'Convergence', 'Cipher', 'Vector', 'Formula', 'Mandala', 'Theorem'],
      tones: ['Violet', 'Azure', 'Silver', 'Crystalline', 'Rotating', 'Recursive', 'Astral', 'Runic'],
      subjects: ['ward', 'matrix', 'equation', 'glyph', 'prism', 'conduit', 'sequence', 'geometry', 'pattern'],
      places: ['academy archive', 'imperial observatory', 'sealed laboratory', 'dueling college', 'planar institute', 'royal athenaeum', 'lost thesis vault', 'wizard senate'],
      descriptors: ['force', 'light', 'electricity', 'sonic']
    },
    divine: {
      label: 'Divine',
      roots: ['Benediction', 'Judgment', 'Sanctuary', 'Litany', 'Covenant', 'Radiance', 'Mercy', 'Revelation', 'Vigil', 'Canon'],
      tones: ['Golden', 'Choir-Borne', 'Consecrated', 'Haloed', 'Dawnlit', 'Sacred', 'Anointed', 'Luminous'],
      subjects: ['blessing', 'edict', 'prayer', 'seal', 'hymn', 'miracle', 'covenant', 'relic-light', 'holy fire'],
      places: ['saintly shrine', 'battlefield chapel', 'pilgrim road', 'sun temple', 'monastic archive', 'cathedral crypt', 'oracle cloister', 'knightly reliquary'],
      descriptors: ['radiant', 'healing', 'light', 'sonic']
    },
    necromancy: {
      label: 'Necromantic',
      roots: ['Grave', 'Ossuary', 'Dirge', 'Sepulcher', 'Pall', 'Requiem', 'Marrow', 'Epitaph', 'Mausoleum', 'Wake'],
      tones: ['Ashen', 'Corpse-Lit', 'Funerary', 'Grave-Cold', 'Bone-Wreathed', 'Mournful', 'Black-Veiled', 'Pale'],
      subjects: ['curse', 'dirge', 'binding', 'pall', 'epitaph', 'shroud', 'grave-light', 'bone seal', 'death current'],
      places: ['tomb-king court', 'plague crypt', 'mortuary academy', 'forgotten ossuary', 'necropolis archive', 'royal catacomb', 'graveyard chapel', 'sealed mausoleum'],
      descriptors: ['necrotic', 'cold', 'poison', 'psychic']
    },
    elemental: {
      label: 'Elemental',
      roots: ['Pyre', 'Torrent', 'Tempest', 'Quake', 'Rime', 'Storm', 'Ember', 'Deluge', 'Zephyr', 'Magma'],
      tones: ['Blazing', 'Thunderous', 'Glacial', 'Tidal', 'Volcanic', 'Storm-Crowned', 'Crackling', 'Searing'],
      subjects: ['eruption', 'wave', 'blast', 'surge', 'torrent', 'mantle', 'vortex', 'pressure front', 'elemental crown'],
      places: ['primordial forge', 'storm giant hall', 'volcanic monastery', 'deep sea shrine', 'icebound observatory', 'desert glass temple', 'sky citadel', 'earthspeaker cavern'],
      descriptors: ['acid', 'cold', 'fire', 'lightning', 'thunder']
    },
    fey: {
      label: 'Fey',
      roots: ['Glamour', 'Thorn', 'Moonveil', 'Revel', 'Briar', 'Midsummer', 'Dewdrop', 'Foxglove', 'Masque', 'Twilight'],
      tones: ['Silver-Pollen', 'Moonlit', 'Laughing', 'Petal-Strewn', 'Briar-Crowned', 'Velvet', 'Dancing', 'Mischievous'],
      subjects: ['glamour', 'invitation', 'revel', 'bargain', 'dance', 'whisper', 'maze', 'moonbeam', 'thorn oath'],
      places: ['archfey court', 'moonlit crossing', 'dryad grove', 'midsummer revel', 'glass orchard', 'fox-spirit market', 'twilight pavilion', 'enchanted hedge maze'],
      descriptors: ['psychic', 'poison', 'light', 'force']
    },
    infernal: {
      label: 'Infernal',
      roots: ['Brand', 'Contract', 'Cinder', 'Chain', 'Edict', 'Damnation', 'Clause', 'Tribunal', 'Furnace', 'Levy'],
      tones: ['Molten', 'Sulfurous', 'Brass-Sealed', 'Chain-Bound', 'Red-Legal', 'Furnace-Bright', 'Ash-Signed', 'Barbed'],
      subjects: ['contract', 'brand', 'clause', 'chain', 'penalty', 'levy', 'injunction', 'writ', 'damnation seal'],
      places: ['infernal court', 'prison archive', 'devil registry', 'furnace tribunal', 'contract vault', 'brass embassy', 'damnation chancery', 'warden foundry'],
      descriptors: ['fire', 'necrotic', 'poison', 'psychic']
    },
    celestial: {
      label: 'Celestial',
      roots: ['Starfall', 'Mercy', 'Dawn', 'Seraphic', 'Halo', 'Ascension', 'Comet', 'Virtue', 'Firmament', 'Grace'],
      tones: ['Starlit', 'Feathered', 'Harmonic', 'Dawn-Bright', 'Radiant', 'Seraph-Winged', 'Opaline', 'Heavenly'],
      subjects: ['descent', 'corona', 'grace', 'guidance', 'mercy', 'banishment', 'star path', 'radiant shield', 'angelic chorus'],
      places: ['upper-plane observatory', 'oracle sanctuary', 'seraphic choir hall', 'knightly basilica', 'starlight monastery', 'celestial embassy', 'dawn chapel', 'firmament gate'],
      descriptors: ['radiant', 'fire', 'light', 'thunder']
    },
    shadow: {
      label: 'Shadow',
      roots: ['Umbral', 'Eclipse', 'Nightglass', 'Shade', 'Gloam', 'Black Veil', 'Silhouette', 'Dusk', 'Nocturne', 'Afterimage'],
      tones: ['Ink-Black', 'Lightless', 'Cold-Grey', 'Moonless', 'Folded', 'Silent', 'Velvet-Dark', 'Eclipsed'],
      subjects: ['veil', 'duplicate', 'silence', 'blindness', 'step', 'afterimage', 'gloom field', 'shadow key', 'night corridor'],
      places: ['shadow court', 'thief-mage cellar', 'eclipse observatory', 'lightless archive', 'midnight theater', 'gloam monastery', 'dusk market', 'nightglass laboratory'],
      descriptors: ['cold', 'necrotic', 'psychic', 'force']
    },
    psionic: {
      label: 'Psionic',
      roots: ['Mindspike', 'Resonance', 'Ego', 'Thoughtform', 'Synapse', 'Will', 'Cognition', 'Dream', 'Impulse', 'Mnemonic'],
      tones: ['Silent', 'Violet', 'Crystal-Mental', 'Pressure-Wave', 'Telepathic', 'Focused', 'Lucid', 'Resonant'],
      subjects: ['projection', 'command', 'link', 'suppression', 'rewrite', 'impulse', 'thoughtform', 'memory lattice', 'psychic echo'],
      places: ['psionic order', 'alien memory vault', 'mind-palace academy', 'telepathic war college', 'dream archive', 'silent monastery', 'cognition laboratory', 'resonance chamber'],
      descriptors: ['psychic', 'force', 'thunder', 'lightning']
    },
    nature: {
      label: 'Nature',
      roots: ['Root', 'Bloom', 'Fang', 'Verdure', 'Wildheart', 'Season', 'Thicket', 'Canopy', 'Spore', 'River'],
      tones: ['Leaf-Crowned', 'Earth-Breathing', 'Green', 'Root-Woven', 'Seasonal', 'Beast-Marked', 'Rain-Washed', 'Sun-Dappled'],
      subjects: ['growth', 'awakening', 'entanglement', 'renewal', 'beast call', 'weather turn', 'root path', 'seed oath', 'wild mantle'],
      places: ['elder grove', 'druidic circle', 'ancient forest shrine', 'beast-speaker lodge', 'seasonal stone ring', 'river sanctuary', 'rootbound archive', 'wild orchard'],
      descriptors: ['acid', 'cold', 'lightning', 'poison', 'bludgeoning']
    }
  };

  for (const theme of Object.values(THEME_SPECS)) {
    theme.names = combine(theme.tones, theme.roots, ['Ward', 'Invocation', 'Burst', 'Veil', 'Edict', 'Step', 'Seal', 'Touch', 'Mantle', 'Ray'], 180);
    theme.visuals = combine(
      ['The spell manifests as', 'The caster is surrounded by', 'The target is marked by', 'The air fills with', 'Reality briefly reveals'],
      theme.tones.map(value => value.toLowerCase()),
      theme.subjects.map(value => `${value} imagery that remains sharply visible for the full resolution of the spell.`),
      180
    );
    theme.descriptions = combine(
      ['The working gathers around', 'The released magic moves through', 'The spell shapes', 'The effect concentrates upon', 'The completed formula directs'],
      theme.subjects,
      ['with disciplined force and a clearly defined magical purpose.', 'into a stable pattern that responds to the chosen target.', 'through the area in a controlled and readable progression.', 'without obscuring the spell’s practical effect or limits.', 'in a form recognizable to trained practitioners of the tradition.'],
      180
    );
    theme.origins = combine(
      ['Developed within', 'Recovered from', 'First recorded at', 'Adapted from', 'Smuggled out of'],
      theme.places,
      ['during a failed experiment.', 'after a dynastic war.', 'by an anonymous master.', 'under a forbidden charter.', 'following a planar disaster.', 'for use in a lost campaign.', 'during a century of magical reform.'],
      180
    );
  }

  const CLASS_SPECS = {
    wizard: { label: 'Wizard', schools: ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'], approaches: ['formulaic', 'diagrammatic', 'scholarly', 'carefully indexed', 'proof-driven', 'ritualized', 'notation-heavy', 'theoretical'], tools: ['spellbook marginalia', 'chalk geometry', 'measured syllables', 'annotated runes', 'calibrated gestures', 'astral tables', 'mnemonic proofs', 'library citations'] },
    sorcerer: { label: 'Sorcerer', schools: ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'], approaches: ['instinctive', 'bloodline-driven', 'emotional', 'improvised', 'visceral', 'resonant', 'spontaneous', 'temperamental'], tools: ['breath control', 'ancestral memory', 'emotional release', 'pulse rhythm', 'body heat', 'eye contact', 'heartbeats', 'raw will'] },
    cleric: { label: 'Cleric', schools: ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Necromancy', 'Transmutation'], approaches: ['prayerful', 'doctrinal', 'liturgical', 'devotional', 'ceremonial', 'pastoral', 'reliquary-focused', 'oath-bound'], tools: ['responsive prayer', 'holy scripture', 'relic contact', 'anointed gesture', 'choral cadence', 'incense measure', 'saintly invocation', 'temple seal'] },
    druid: { label: 'Druid', schools: ['Abjuration', 'Conjuration', 'Divination', 'Evocation', 'Necromancy', 'Transmutation'], approaches: ['organic', 'seasonal', 'ecological', 'totemic', 'weather-bound', 'rooted', 'instinctive', 'ancestral'], tools: ['seed patterns', 'animal calls', 'leaf gestures', 'stone circles', 'weather signs', 'river rhythm', 'bone charms', 'spore dust'] },
    bard: { label: 'Bard', schools: ['Conjuration', 'Divination', 'Enchantment', 'Illusion', 'Transmutation'], approaches: ['rhythmic', 'performative', 'lyrical', 'dramatic', 'improvised', 'audience-aware', 'harmonic', 'story-driven'], tools: ['metered verse', 'instrumental phrase', 'spoken refrain', 'dance step', 'dramatic pause', 'choral answer', 'stage gesture', 'memorized epic'] },
    warlock: { label: 'Warlock', schools: ['Conjuration', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy'], approaches: ['contractual', 'dangerous', 'patron-mediated', 'secretive', 'transactional', 'borrowed', 'ritually indebted', 'forbidden'], tools: ['pact clause', 'patron sigil', 'blood price', 'whispered title', 'borrowed name', 'debt token', 'forbidden seal', 'contract fragment'] },
    paladin: { label: 'Paladin', schools: ['Abjuration', 'Conjuration', 'Divination', 'Evocation'], approaches: ['solemn', 'martial', 'oath-driven', 'disciplined', 'protective', 'judicial', 'honor-bound', 'ceremonial'], tools: ['sword salute', 'shield sign', 'oath recitation', 'battle prayer', 'vow token', 'standard gesture', 'judicial command', 'mercy clause'] },
    ranger: { label: 'Ranger', schools: ['Abjuration', 'Conjuration', 'Divination', 'Transmutation'], approaches: ['practical', 'field-tested', 'quiet', 'directional', 'survival-focused', 'improvised', 'tracking-based', 'terrain-aware'], tools: ['trail signs', 'arrow marks', 'animal spoor', 'breath timing', 'camouflage gesture', 'field charm', 'map notation', 'hunter whistle'] },
    artificer: { label: 'Artificer', schools: ['Abjuration', 'Conjuration', 'Divination', 'Evocation', 'Transmutation'], approaches: ['engineered', 'component-driven', 'calibrated', 'mechanical', 'modular', 'prototype-based', 'schematic', 'instrumented'], tools: ['etched plates', 'precision lenses', 'copper coils', 'alchemical valves', 'gear arrays', 'measuring rods', 'rune batteries', 'clockwork relays'] },
    psion: { label: 'Psion', schools: ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Transmutation'], approaches: ['precise', 'mentally disciplined', 'silent', 'conceptual', 'resonant', 'meditative', 'mnemonic', 'will-driven'], tools: ['visualized geometry', 'breath counting', 'memory palaces', 'silent mantras', 'thought partitions', 'emotional locks', 'focus crystals', 'cognitive anchors'] }
  };

  for (const classSpec of Object.values(CLASS_SPECS)) {
    classSpec.wording = combine(
      ['The caster employs', 'The spell depends on', 'Its tradition favors', 'The technique combines', 'Practitioners rely upon'],
      classSpec.approaches,
      classSpec.tools.map(value => `${value} to control the spell from invocation through final resolution.`),
      180
    );
  }

  const GLOBAL = {
    castingTimes: ['1 swift action', '1 standard action', '1 full-round action', '1 round', '10 minutes', '1 hour'],
    components: combine(
      ['Material focus:', 'Required component:', 'The spell consumes', 'The caster presents', 'The working employs'],
      ['a marked coin', 'a glass prism', 'a pinch of ash', 'a carved seed', 'a drop of lamp oil', 'a silver thread', 'a bone token', 'a brass key', 'a written sigil'],
      ['held in the left hand.', 'placed at the target point.', 'destroyed on completion.', 'returned unharmed.', 'inscribed with the caster’s name.', 'wrapped in red cord.', 'cooled in moonlight.', 'warmed by breath.'],
      180
    ),
    practicalUses: [
      'In play, the spell is best used to shape positioning before committing the party’s most limited resources.',
      'The spell rewards careful target selection because its strongest result depends on controlling line of effect and the chosen area.',
      'Its primary value is reliability: the spell states exactly what it affects, how resistance applies, and when the effect ends.',
      'The effect is deliberately readable at the table, allowing the caster and the GM to resolve damage, saves, movement, and duration without inventing missing rules.',
      'The spell can serve as a signature technique, a researched formula, a divine grant, a recovered scroll, or a specialized item effect without changing its core mechanics.'
    ],
    origins: [
      'The surviving formula is written as a practical field spell rather than a theoretical exercise.',
      'Later copies preserve the original limitations because removing them made the effect unstable during early trials.',
      'The spell became popular after adventuring companies proved that its clearly defined range and resolution were more valuable than spectacular but unreliable alternatives.',
      'Most traditions teach the spell only after students can identify its target, resistance, and scaling clauses from memory.',
      'The spell’s modern form is the result of repeated battlefield revision, with unnecessary flourishes removed and its useful consequences made explicit.'
    ]
  };

  const counts = {};
  const record = (path, value) => {
    if (Array.isArray(value)) counts[path] = value.length;
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) record(path ? `${path}.${key}` : key, child);
    }
  };
  record('themes', THEME_SPECS);
  record('classes', CLASS_SPECS);
  record('global', GLOBAL);

  window.HBSpellVocabulary = {
    THEMES: THEME_SPECS,
    CLASSES: CLASS_SPECS,
    GLOBAL,
    counts,
    pick
  };
})();
