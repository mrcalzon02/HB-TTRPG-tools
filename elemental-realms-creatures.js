(() => {
  const categories = [
    { id: 'primordial-swamp', name: 'Primordial Swamps and Guardians' },
    { id: 'water-plane', name: 'Plane of Water' },
    { id: 'fire-plane', name: 'Plane of Fire' },
    { id: 'earth-plane', name: 'Plane of Earth' },
    { id: 'ethereal-astral', name: 'Ethereal and Astral Bogs' },
    { id: 'air-plane', name: 'Plane of Air' },
    { id: 'para-elemental', name: 'Para-Elemental Quagmire' },
    { id: 'unconventional-planes', name: 'Unconventional Planes' },
    { id: 'contextual-fauna', name: 'Contextual Fauna and Prey' }
  ];

  const ecology = {
    title: 'The Amphibious Multitudes of the Planes',
    summary: 'The amphibious beasts of the many planes are as numerous and varied as their diets. Some graze on astral reeds, mineral moss, fungal blooms, or elemental algae; others prey upon insects, arachnoids, shell-creatures, fish, lesser elementals, and one another. Every frog, toad, newt, salamander, mudpuppy, or stranger amphibious form belongs to a much larger food web rather than existing as an isolated encounter.',
    foodWeb: 'The swamps and swamp-adjacent reaches support deep, rich ecosystems of bugs, insects, arachnoids, crustacean-like scavengers, burrowing worms, venomous mites, luminous flies, ash beetles, reed moths, marsh spiders, mud scorpions, spirit gnats, and planar parasites. Their size and magical adaptation vary with the plane. Tiny swarms feed hatchlings; fist-sized beetles sustain common predators; giant insects and arachnoids become prey, rivals, mounts, hazards, or apex hunters in their own right.',
    designRule: 'Creature statistics should therefore include diet, prey relationships, predators, habitat pressures, and ecological role. Future bestiary passes should expand the invertebrate and arachnoid fauna alongside the amphibians so that each planar swamp functions as an ecosystem.'
  };

  const creatures = [
    {
      id: 'cinder-frog',
      name: 'Cinder Frog',
      category: 'fire-plane',
      confidence: 'high',
      sourceStatus: 'user-established addition',
      lore: 'Cinder frogs inhabit ash marshes, cooling lava shelves, ember bogs, and smoke-choked reed beds. Their skin resembles cracked charcoal, with dull orange light pulsing beneath the fissures whenever they breathe. They feed on ash beetles, ember moths, coal grubs, and lesser fire vermin.',
      ecology: { diet: 'Carnivorous insectivore', prey: ['ash beetles','ember moths','coal grubs','small fire vermin'], predators: ['smoke toads','fire drakes','salamander hunters'], role: 'Mesopredator and insect-population regulator' },
      statBlock: {
        sizeType: 'Small Magical Beast (Fire)', hitDice: '3d10+6 (22 hp)', initiative: '+3', speed: '30 ft., climb 20 ft.', armorClass: '16 (+1 size, +3 Dex, +2 natural), touch 14, flat-footed 13', baseAttackGrapple: '+3/-1', attack: 'Bite +7 melee (1d6 plus 1 fire)', fullAttack: 'Bite +7 melee (1d6 plus 1 fire)', spaceReach: '5 ft./5 ft.', specialAttacks: ['Cinder Spit','Searing Tongue'], specialQualities: ['Darkvision 60 ft.','Fire subtype','Low-light vision','Smoke sight'], saves: 'Fort +5, Ref +6, Will +2', abilities: 'Str 10, Dex 17, Con 14, Int 2, Wis 13, Cha 8', skills: 'Climb +11, Hide +11, Jump +10, Listen +5, Spot +5', feats: 'Alertness, Weapon Finesse', environment: 'Elemental Plane of Fire, ash marshes, volcanic wetlands', organization: 'Solitary, pair, or crackle (3-8)', challengeRating: '2', treasure: 'None', alignment: 'Always neutral', advancement: '4-6 HD (Small); 7-9 HD (Medium)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'Cinder Spit (Ex)', text: 'Once every 1d4 rounds, a cinder frog spits a burning pellet as a ranged touch attack with a 20-foot range. A hit deals 1d6 fire damage and the target must succeed on a DC 13 Reflex save or catch fire for 1d4 rounds. The save DC is Constitution-based.' },
        { name: 'Searing Tongue (Ex)', text: 'A cinder frog can make its bite attack against a creature up to 10 feet away without entering that creature’s space. This attack is treated as a tongue lash and cannot be used for attacks of opportunity.' },
        { name: 'Smoke Sight (Ex)', text: 'Smoke, ash, and nonmagical airborne cinders do not provide concealment against a cinder frog.' }
      ]
    },
    {
      id: 'magnetic-frog-beast',
      name: 'Magnetic Frog-Beast',
      category: 'earth-plane',
      confidence: 'high',
      sourceStatus: 'user-established addition',
      lore: 'Magnetic frog-beasts wallow in iron-rich bogs, lodestone caverns, metallic seep pools, and marshes fed by mineral springs. Their broad bodies accumulate iron sand and scraps of ore until they resemble crouched heaps of black mud and rusted metal. They consume cave insects, ore mites, iron-shelled beetles, and mineral deposits.',
      ecology: { diet: 'Omnivorous mineral feeder and predator', prey: ['ore mites','iron beetles','cave crickets','small burrowing vermin'], predators: ['xorn','earth salamanders','great burrowing arachnoids'], role: 'Mineral recycler and ambush predator' },
      statBlock: {
        sizeType: 'Large Magical Beast (Earth)', hitDice: '8d10+32 (76 hp)', initiative: '+1', speed: '30 ft., burrow 10 ft., swim 20 ft.', armorClass: '20 (-1 size, +1 Dex, +10 natural), touch 10, flat-footed 19', baseAttackGrapple: '+8/+18', attack: 'Bite +13 melee (2d6+6)', fullAttack: 'Bite +13 melee (2d6+6) and 2 slams +11 melee (1d6+3)', spaceReach: '10 ft./10 ft.', specialAttacks: ['Magnetic Pull','Metal Snare','Tongue Lash'], specialQualities: ['Darkvision 60 ft.','Damage reduction 5/adamantine','Lodestone hide','Low-light vision','Tremorsense 30 ft.'], saves: 'Fort +10, Ref +7, Will +5', abilities: 'Str 23, Dex 13, Con 18, Int 4, Wis 16, Cha 9', skills: 'Hide +0*, Listen +8, Spot +8, Swim +14', feats: 'Alertness, Improved Bull Rush, Multiattack', environment: 'Elemental Plane of Earth, iron bogs, mineral marshes', organization: 'Solitary or polarity (2-4)', challengeRating: '7', treasure: 'Incidental metal objects embedded in hide', alignment: 'Usually neutral', advancement: '9-12 HD (Large); 13-18 HD (Huge)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'Magnetic Pull (Su)', text: 'As a standard action every 1d4 rounds, the frog-beast projects a magnetic surge in a 30-foot cone. Creatures carrying or wearing at least 10 pounds of metal must succeed on a DC 18 Reflex save or be pulled 10 feet toward the frog-beast and knocked prone. The save DC is Constitution-based.' },
        { name: 'Metal Snare (Su)', text: 'A creature wearing metal armor or carrying a metal shield that is hit by the frog-beast’s tongue lash is treated as grappled by magnetic force. Escaping requires a DC 24 grapple check or a DC 22 Strength check. Nonmetallic creatures and gear are unaffected.' },
        { name: 'Tongue Lash (Ex)', text: 'The magnetic frog-beast may make a bite-equivalent tongue attack against a target up to 20 feet away.' },
        { name: 'Lodestone Hide (Ex)', text: 'Metallic projectiles and unattended metal objects striking or touching the beast cling to its hide. Retrieving an attached object requires a DC 18 Strength check.' },
        { name: 'Camouflage', text: 'In iron mud, ore scree, or metallic refuse, a magnetic frog-beast gains a +8 racial bonus on Hide checks.' }
      ]
    },
    {
      id: 'snode',
      name: 'Snode (Snake-Toad)',
      category: 'primordial-swamp',
      confidence: 'high',
      sourceStatus: 'user-established addition',
      lore: 'A snode is a broad, heavy toad with an extraordinarily long, flexible neck. It crouches beneath mud, duckweed, and black water with only the neck and head exposed. Travelers often mistake that narrow silhouette for a snake until the hidden body surges from the muck. Snodes feed on marsh insects, spiders, crustaceans, fish, snakes, frogs, and anything small enough to swallow.',
      ecology: { diet: 'Opportunistic ambush carnivore', prey: ['marsh insects','giant flies','spiders','mud crabs','fish','snakes','small amphibians'], predators: ['giant crocodilians','bog hydras','large swamp birds'], role: 'Ambush predator linking aquatic and terrestrial food webs' },
      statBlock: {
        sizeType: 'Medium Animal', hitDice: '4d8+12 (30 hp)', initiative: '+2', speed: '20 ft., swim 30 ft.', armorClass: '16 (+2 Dex, +4 natural), touch 12, flat-footed 14', baseAttackGrapple: '+3/+6', attack: 'Bite +6 melee (1d8+4)', fullAttack: 'Bite +6 melee (1d8+4)', spaceReach: '5 ft./10 ft.', specialAttacks: ['False Serpent','Neck Lunge','Improved grab','Swallow whole'], specialQualities: ['Amphibious','Low-light vision','Mud concealment'], saves: 'Fort +7, Ref +6, Will +3', abilities: 'Str 17, Dex 15, Con 16, Int 1, Wis 14, Cha 6', skills: 'Hide +10*, Listen +5, Spot +5, Swim +11', feats: 'Alertness, Stealthy', environment: 'Warm or temperate marshes, mudflats, planar swamps', organization: 'Solitary, pair, or knot (3-6)', challengeRating: '3', treasure: 'None', alignment: 'Always neutral', advancement: '5-7 HD (Medium); 8-12 HD (Large)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'False Serpent (Ex)', text: 'Before the snode reveals its body, observers must succeed on a DC 18 Spot check to recognize it as a toad rather than a snake. A snode attacking from concealment gains a +2 bonus on its first attack roll.' },
        { name: 'Neck Lunge (Ex)', text: 'A snode has a natural reach of 10 feet with its bite despite being Medium. It may strike from mud or shallow water without exposing its body.' },
        { name: 'Improved Grab (Ex)', text: 'To use this ability, the snode must hit a Small or smaller creature with its bite. It can then attempt to start a grapple as a free action without provoking an attack of opportunity.' },
        { name: 'Swallow Whole (Ex)', text: 'A snode can swallow a grabbed Tiny or smaller creature with a successful grapple check. The swallowed creature takes 1d6+3 bludgeoning damage and 1d4 acid damage each round. The gizzard has AC 13 and 8 hit points.' },
        { name: 'Mud Concealment (Ex)', text: 'While at least half submerged in mud, silt, duckweed, or murky water, a snode gains concealment. Its racial bonus on Hide checks increases to +12 in such terrain.' }
      ]
    },
    {
      id: 'ethereal-swamp-toad',
      name: 'Ethereal Swamp Toad',
      category: 'ethereal-astral',
      confidence: 'high',
      sourceStatus: 'source-detailed conversion',
      lore: 'A ghostly astral amphibian with translucent skin, a blue-green-violet inner glow, and a croak that resonates through the mists. It grazes on astral plants and sometimes takes in other ethereal insects while helping stabilize the shifting bogs.',
      ecology: { diet: 'Primarily herbivorous', prey: ['astral reeds','luminous moss','ethereal insects'], predators: ['carnivorous spectral toads','astral hunters'], role: 'Keystone grazer and planar stabilizer' },
      statBlock: {
        sizeType: 'Small Magical Beast (Extraplanar, Incorporeal)', hitDice: '4d10+4 (26 hp)', initiative: '+4', speed: '20 ft., fly 30 ft. (perfect)', armorClass: '17 (+1 size, +4 Dex, +2 deflection), touch 17, flat-footed 13', baseAttackGrapple: '+4/—', attack: 'Incorporeal touch +9 melee (1d4 Wisdom damage)', fullAttack: 'Incorporeal touch +9 melee (1d4 Wisdom damage)', spaceReach: '5 ft./5 ft.', specialAttacks: ['Resonant Croak'], specialQualities: ['Bioluminescence','Incorporeal traits','Planar passage','Symbiotic stabilization'], saves: 'Fort +5, Ref +8, Will +5', abilities: 'Str —, Dex 19, Con 12, Int 5, Wis 16, Cha 15', skills: 'Hide +15, Listen +9, Spot +9', feats: 'Alertness, Iron Will', environment: 'Astral Plane and ethereal bogs', organization: 'Solitary, pair, or chorus (3-12)', challengeRating: '4', treasure: 'None', alignment: 'Usually neutral', advancement: '5-8 HD (Small); 9-12 HD (Medium)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'Resonant Croak (Su)', text: 'Once every 1d4 rounds, the toad emits a 30-foot-radius croak. Extraplanar creatures must succeed on a DC 14 Will save or become fascinated for 1 round. Creatures currently ethereal or astral instead gain a +1 morale bonus on saves for 1 round.' },
        { name: 'Planar Passage (Su)', text: 'Three times per day, the toad may shift between the Material, Ethereal, and Astral Planes as though using ethereal jaunt or plane shift, affecting only itself.' },
        { name: 'Symbiotic Stabilization (Su)', text: 'Within 30 feet of the toad, natural planar turbulence, drifting gravity, and unstable ethereal terrain are treated as one category less severe.' }
      ]
    },
    {
      id: 'carnivorous-spectral-toad',
      name: 'Carnivorous Spectral Toad',
      category: 'ethereal-astral',
      confidence: 'high',
      sourceStatus: 'source-detailed conversion',
      lore: 'A predatory spectral toad of the Astral Plane, identified by a radiant underbelly that glows in crimson or deep purple. It waits in silence before striking astral insects, ethereal fish, and smaller astral creatures.',
      ecology: { diet: 'Carnivorous ambush predator', prey: ['astral insects','ethereal fish','small astral creatures','ethereal swamp toads'], predators: ['greater astral hunters'], role: 'Population control and apex mesopredator' },
      statBlock: {
        sizeType: 'Medium Magical Beast (Extraplanar, Incorporeal)', hitDice: '7d10+14 (52 hp)', initiative: '+6', speed: '20 ft., fly 40 ft. (perfect)', armorClass: '19 (+2 Dex, +4 deflection, +3 natural), touch 16, flat-footed 17', baseAttackGrapple: '+7/—', attack: 'Incorporeal bite +11 melee (1d8 plus 1d6 cold)', fullAttack: 'Incorporeal bite +11 melee (1d8 plus 1d6 cold)', spaceReach: '5 ft./10 ft.', specialAttacks: ['Silent strike','Spectral tongue','Poison radiance'], specialQualities: ['Camouflage glow','Incorporeal traits','Low-light vision','Planar stalker'], saves: 'Fort +7, Ref +7, Will +6', abilities: 'Str —, Dex 15, Con 14, Int 6, Wis 17, Cha 18', skills: 'Hide +16, Listen +10, Move Silently +12, Spot +10', feats: 'Alertness, Improved Initiative, Iron Will', environment: 'Astral bogs and ethereal marshes', organization: 'Solitary or hunting pair', challengeRating: '6', treasure: 'None', alignment: 'Usually neutral', advancement: '8-12 HD (Medium); 13-18 HD (Large)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'Silent Strike (Ex)', text: 'A carnivorous spectral toad that attacks an unaware target deals an extra 2d6 damage.' },
        { name: 'Spectral Tongue (Su)', text: 'The toad may make its bite attack against a target up to 20 feet away. On a hit, it may attempt to pull the target 10 feet toward itself with an opposed grapple check using Charisma in place of Strength.' },
        { name: 'Poison Radiance (Su)', text: 'A living creature struck by the toad’s bite must succeed on a DC 17 Fortitude save or take 1d4 Dexterity damage. One minute later it must save again or take another 1d4 Dexterity damage.' },
        { name: 'Camouflage Glow (Su)', text: 'The toad can alter the color and pattern of its bioluminescence, gaining a +8 racial bonus on Hide checks in luminous astral terrain.' }
      ]
    },
    {
      id: 'mudpuppy',
      name: 'Para-Elemental Mudpuppy',
      category: 'para-elemental',
      confidence: 'high',
      sourceStatus: 'source-detailed conversion',
      lore: 'Mudpuppies embody earth and water in equal measure. Their bodies are fluid enough to squeeze through flooded cracks yet firm enough to burrow through clay. They feed on quagmire insects, mineral worms, soft-bodied vermin, and decaying organic matter.',
      ecology: { diet: 'Omnivorous scavenger and insectivore', prey: ['quagmire insects','mineral worms','soft-bodied vermin','carrion'], predators: ['smoke toads','bog elementals','giant marsh arachnoids'], role: 'Detritivore, burrower, and soil-aerating scavenger' },
      statBlock: {
        sizeType: 'Small Elemental (Earth, Water, Extraplanar)', hitDice: '2d8+4 (13 hp)', initiative: '+1', speed: '20 ft., burrow 20 ft., swim 30 ft.', armorClass: '15 (+1 size, +1 Dex, +3 natural), touch 12, flat-footed 14', baseAttackGrapple: '+1/-3', attack: 'Bite +3 melee (1d4)', fullAttack: 'Bite +3 melee (1d4)', spaceReach: '5 ft./5 ft.', specialAttacks: ['Mire spray'], specialQualities: ['Amphibious','Earth glide through mud','Elemental traits','Mud form'], saves: 'Fort +5, Ref +4, Will +1', abilities: 'Str 10, Dex 13, Con 15, Int 3, Wis 12, Cha 7', skills: 'Escape Artist +8, Hide +9, Swim +10', feats: 'Stealthy', environment: 'Para-Elemental Quagmire', organization: 'Solitary, pair, or litter (3-10)', challengeRating: '1', treasure: 'None', alignment: 'Usually neutral', advancement: '3-5 HD (Small); 6-8 HD (Medium)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'Mire Spray (Ex)', text: 'Once every 1d4 rounds, a mudpuppy sprays adhesive sludge in a 10-foot cone. Creatures in the area must succeed on a DC 13 Reflex save or become entangled for 1d4 rounds.' },
        { name: 'Mud Form (Ex)', text: 'A mudpuppy can move through openings as though it were two size categories smaller and gains a +8 racial bonus on Escape Artist checks.' },
        { name: 'Earth Glide through Mud (Ex)', text: 'A mudpuppy can glide through mud, clay, and saturated earth as easily as a fish swims through water, leaving no tunnel or sign of passage.' }
      ]
    },
    {
      id: 'smoke-toad',
      name: 'Smoke Toad',
      category: 'para-elemental',
      confidence: 'high',
      sourceStatus: 'source-detailed conversion',
      lore: 'Smoke toads exist where fire and air mingle with wetland muck. Rather than simply destroying, they exchange smoky breath that can conceal, irritate, warn, or alter nearby conditions. They prey upon flying insects, mudpuppies, ash vermin, and smaller amphibians.',
      ecology: { diet: 'Carnivorous aerial and marsh predator', prey: ['flying insects','mudpuppies','ash vermin','small amphibians'], predators: ['greater para-elementals','storm drakes'], role: 'Mobile predator and atmospheric transformer' },
      statBlock: {
        sizeType: 'Medium Elemental (Air, Fire, Extraplanar)', hitDice: '6d8+18 (45 hp)', initiative: '+3', speed: '20 ft., fly 30 ft. (good)', armorClass: '18 (+3 Dex, +5 natural), touch 13, flat-footed 15', baseAttackGrapple: '+4/+7', attack: 'Bite +7 melee (1d8+3 plus smoke)', fullAttack: 'Bite +7 melee (1d8+3 plus smoke)', spaceReach: '5 ft./5 ft.', specialAttacks: ['Smoke exchange','Choking croak'], specialQualities: ['Air mastery','Elemental traits','Fire resistance 20','Smoke form'], saves: 'Fort +5, Ref +8, Will +4', abilities: 'Str 16, Dex 17, Con 16, Int 5, Wis 14, Cha 13', skills: 'Hide +9, Listen +8, Spot +8', feats: 'Alertness, Flyby Attack, Iron Will', environment: 'Para-Elemental Quagmire, smoke marshes', organization: 'Solitary or haze (2-6)', challengeRating: '5', treasure: 'None', alignment: 'Usually neutral', advancement: '7-10 HD (Medium); 11-15 HD (Large)', levelAdjustment: '—'
      },
      abilities: [
        { name: 'Smoke Exchange (Su)', text: 'As a standard action every 1d4 rounds, the toad fills a 20-foot-radius spread with smoke for 3 rounds. The smoke grants concealment and may be shaped to drift up to 10 feet each round. The toad can see through its own smoke.' },
        { name: 'Choking Croak (Su)', text: 'Creatures within 20 feet must succeed on a DC 16 Fortitude save or cough violently, becoming sickened for 1d4 rounds. Creatures that do not breathe are immune.' },
        { name: 'Smoke Form (Su)', text: 'Once per day for up to 6 rounds, the toad becomes gaseous. It retains its fly speed and may pass through narrow openings but cannot attack physically.' }
      ]
    }
  ];

  window.HBElementalRealmsCreatures = {
    schemaVersion: '1.0.0',
    system: 'Hypertext d20 / 3.5-compatible',
    setting: 'Chronicles of the Elemental Realms',
    ecology,
    categories,
    creatures
  };
})();
