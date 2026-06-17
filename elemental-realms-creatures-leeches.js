(() => {
  const wiki = window.HBElementalRealmsWiki;
  if (!wiki) throw new Error('Elemental Realms creature core must load first.');
  wiki.addEntries([
    {
      id:'bloodreed-leech', name:'Bloodreed Leech', aliases:['Marsh Bloodsucker','Red-Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'True leech-form annelid analogue', feedingMode:'Parasitic', planeAffinity:'Primordial Swamp', sustenance:'Blood, lymph, dissolved vitality, and trace elemental salts taken from living hosts.',
      catalogNotes:'Accepted by both strict-bodied catalogists and relation-based catalogists; disagreements concern whether its short feeding cycle makes it a temporary parasite or merely a predatory grazer.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A fist-long crimson leech that hangs beneath reeds and drops onto warm-blooded prey.',
      size:'Small', type:'Vermin', subtypes:['Aquatic'], alignment:'Always neutral', initiative:'+2', senses:'Darkvision 60 ft., scent, tremorsense 20 ft. in water', languages:'None',
      ac:'15 (+1 size, +2 Dex, +2 natural)', touch:'13', flatFooted:'13', hp:'11', hitDice:'2d8+2', saves:'Fort +4, Ref +2, Will +0', speed:'10 ft., swim 30 ft., climb 10 ft.', bab:'+1', grapple:'-2 (+6 while attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 8, Dex 15, Con 13, Int —, Wis 11, Cha 2', skills:['Hide +10 in reeds','Swim +10'], feats:[],
      attacks:['Bite +4 melee (1d4-1 plus attach)'], specialAttacks:['Attach (Ex): on a bite hit the leech latches on; an attached leech loses its Dexterity bonus to AC but gains a +8 racial bonus on grapple checks.','Blood Drain (Ex): an attached leech deals 1 point of Constitution damage at the end of each of its turns.'], specialQualities:['Amphibious','Vermin traits','Reed camouflage'],
      environment:'Warm reed beds, floodplains, livestock wallows, and primordial marsh channels', organization:'Solitary, knot (2-8), or drop (10-40)', treasure:'None', advancement:'3-4 HD (Small)', cr:'1',
      combat:'It waits above animal trails, drops onto exposed flesh, and remains attached until sated or burned away.', diet:'Its primary food is blood and lymph, though it also absorbs elemental salts dissolved in a host’s fluids.', ecology:'Bloodreed leeches thin sickly herds and feed fish, frogs, and marsh birds after dropping from a host. Heavy infestations can devastate isolated settlements.'
    },
    {
      id:'mire-mender-leech', name:'Mire-Mender Leech', aliases:['Chirurgeon Leech','Green Stitcher'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'True leech-form annelid analogue', feedingMode:'Symbiotic', planeAffinity:'Primordial Swamp', sustenance:'Necrotic tissue, wound exudate, infectious organisms, and a small quantity of host blood.',
      catalogNotes:'Strict parasitologists reject it as a leech because healthy hosts often benefit from attachment; broad catalogists include it because another creature remains its principal food source.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A moss-green medicinal leech that cleans wounds, consumes rot, and seals damaged tissue with alchemical mucus.',
      size:'Tiny', type:'Magical beast', subtypes:['Aquatic'], alignment:'Usually neutral', initiative:'+3', senses:'Darkvision 60 ft., scent', languages:'None',
      ac:'17 (+2 size, +3 Dex, +2 natural)', touch:'15', flatFooted:'14', hp:'7', hitDice:'1d10+2', saves:'Fort +4, Ref +5, Will +1', speed:'10 ft., swim 30 ft., climb 10 ft.', bab:'+1', grapple:'-8 (+4 while willingly attached)', space:'2-1/2 ft.', reach:'0 ft.',
      abilities:'Str 3, Dex 17, Con 14, Int 2, Wis 13, Cha 6', skills:['Heal +8','Hide +15','Swim +11'], feats:['Skill Focus (Heal)'],
      attacks:['Bite +6 melee (1 nonlethal plus attach)'], specialAttacks:['Attach (Ex)','Irritant Spit (Ex): 10 ft.; Fortitude DC 12 or sickened for 1 round.'], specialQualities:['Amphibious','Mire Medicine (Ex): a willing creature bearing one mire-mender gains a +2 circumstance bonus on saves against disease and on checks to stabilize; after 8 hours the host heals 1 additional hit point.','Symbiotic Detachment: it releases immediately when the host is fully treated or commands it to detach.'],
      environment:'Medicinal pools, druidic fens, battlefield drainage ditches, and herb-rich bogs', organization:'Solitary, satchel (2-12), or colony (20-100)', treasure:'None', advancement:'2-3 HD (Tiny)', cr:'1/2',
      combat:'It avoids violence, spits an irritant when threatened, and attempts to hide beneath water plants.', diet:'It eats dead tissue, pus, invasive larvae, and a measured amount of blood from injured hosts.', ecology:'Mire-menders prevent epidemics and are deliberately cultivated by swamp healers. Unattended colonies may still weaken starving or unconscious hosts.'
    },
    {
      id:'tideglass-leech', name:'Tideglass Leech', aliases:['Current Cleaner','Glassback Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Flattened translucent molluscoid with paired suction discs', feedingMode:'Symbiotic', planeAffinity:'Plane of Water', sustenance:'Skin parasites, excess salt, decaying scales, and suspended organic matter gathered from a host’s wake.',
      catalogNotes:'Its body is not annelid, but its continuous host attachment and host-derived diet make it a classic example in the relational school of leech topology.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A translucent disc-backed cleaner that rides whales, water elementals, and giant amphibians through endless currents.',
      size:'Medium', type:'Magical beast', subtypes:['Aquatic','Water'], alignment:'Usually neutral', initiative:'+1', senses:'Darkvision 60 ft., blindsense 30 ft. in water', languages:'Understands Aquan',
      ac:'18 (+1 Dex, +7 natural)', touch:'11', flatFooted:'17', hp:'26', hitDice:'4d10+4', saves:'Fort +5, Ref +5, Will +3', speed:'5 ft., swim 50 ft.', bab:'+4', grapple:'+8 (+12 attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 18, Dex 13, Con 13, Int 4, Wis 15, Cha 8', skills:['Heal +7','Listen +8','Swim +16'], feats:['Alertness','Endurance'],
      attacks:['Rasp +8 melee (1d6+4)'], specialAttacks:['Osmotic Pull (Su): 15-ft. cone underwater; Fortitude DC 13 or moved 10 ft. toward the leech.','Attach (Ex)'], specialQualities:['Amphibious','Water subtype','Cleaner Bond (Ex): a willing Large or larger aquatic host gains a +2 bonus on saves against disease and skin-contact poison while one tideglass leech remains attached.'],
      environment:'Endless seas, coral swamps, kelp forests, and rivers crossing the Plane of Water', organization:'Solitary, pair, or clinic (3-12)', treasure:'Pearls and polished debris caught beneath its shell', advancement:'5-8 HD (Medium to Large)', cr:'2',
      combat:'It uses osmotic pull to dislodge attackers, then escapes into strong currents rather than fight.', diet:'Its food comes chiefly from the living surface and wake of a host: parasites, damaged tissue, salt crusts, and drifting scraps.', ecology:'Tideglass leeches maintain the health of immense aquatic creatures and carry spores and eggs between distant water-plane wetlands.'
    },
    {
      id:'stoneblood-burrower', name:'Stoneblood Burrower', aliases:['Ore Leech','Vein Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Segmented mineral worm with a drilling sucker', feedingMode:'Parasitic', planeAffinity:'Plane of Earth', sustenance:'Mineral-rich blood, elemental slurry, bone salts, and metallic deposits drawn through living tissue.',
      catalogNotes:'Earth catalogists often classify it as a burrowing worm, while swamp catalogists emphasize its permanent attachment and host-dependent feeding cycle.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A stone-plated parasite that drills into earth creatures and slowly replaces living tissue with brittle mineral deposits.',
      size:'Small', type:'Aberration', subtypes:['Earth'], alignment:'Usually neutral', initiative:'-1', senses:'Darkvision 60 ft., tremorsense 60 ft.', languages:'None',
      ac:'19 (+1 size, -1 Dex, +9 natural)', touch:'10', flatFooted:'19', hp:'27', hitDice:'5d8+5', saves:'Fort +2, Ref +0, Will +6', speed:'10 ft., burrow 20 ft.', bab:'+3', grapple:'+1 (+9 attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 14, Dex 8, Con 13, Int 2, Wis 15, Cha 4', skills:['Hide +10 among stone','Listen +7'], feats:['Ability Focus (calcifying drain)','Iron Will'],
      attacks:['Drill-mouth +5 melee (1d6+3 plus attach)'], specialAttacks:['Attach (Ex)','Calcifying Drain (Su): an attached burrower deals 1d3 Constitution damage every other round; a creature damaged twice must succeed on a DC 15 Fortitude save or take a -2 penalty to Dexterity for 1 hour.'], specialQualities:['Damage reduction 5/bludgeoning','Earth glide through mud and unworked stone at half speed','Mineral camouflage'],
      environment:'Ore marshes, clay caverns, mineral springs, and earth-elemental wallows', organization:'Solitary, seam (2-6), or infestation (7-20)', treasure:'Mineral nodules in its gut', advancement:'6-9 HD (Small to Medium)', cr:'2',
      combat:'It erupts from mineral mud, attaches to a leg or joint, and drills deeper when struck.', diet:'It survives on mineral-bearing bodily fluids and living elemental slurry rather than ordinary flesh.', ecology:'Stoneblood infestations weaken earth creatures but leave behind concentrated ore nodules sought by miners and magnetic frog beasts.'
    },
    {
      id:'breathwick-leech', name:'Breathwick Leech', aliases:['Lung Kite','Gale Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Ribbon-bodied aerial filter feeder with adhesive mouth petals', feedingMode:'Facultative', planeAffinity:'Plane of Air', sustenance:'Exhaled moisture, breath heat, airborne spores, and trace life force drawn from respiration.',
      catalogNotes:'Whether it is parasite or cleaner depends upon density: one clears spores from the lungs, while a flock can suffocate the same host.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A pale flying ribbon that fastens over mouths, spiracles, or gills and feeds from every exhalation.',
      size:'Tiny', type:'Magical beast', subtypes:['Air'], alignment:'Usually neutral', initiative:'+5', senses:'Darkvision 60 ft., blindsense 30 ft.', languages:'None',
      ac:'19 (+2 size, +5 Dex, +2 natural)', touch:'17', flatFooted:'14', hp:'13', hitDice:'3d10-3', saves:'Fort +2, Ref +8, Will +2', speed:'5 ft., fly 60 ft. (good)', bab:'+3', grapple:'-7 (+5 attached)', space:'2-1/2 ft.', reach:'0 ft.',
      abilities:'Str 2, Dex 21, Con 8, Int 3, Wis 13, Cha 7', skills:['Hide +17 in cloud or mist','Listen +7','Spot +7'], feats:['Improved Initiative','Weapon Finesse'],
      attacks:['Mouth petals +10 melee touch (attach)'], specialAttacks:['Attach (Ex)','Breath Drain (Su): an unwilling attached host must succeed on a DC 13 Fortitude save each round or become fatigued; a fatigued host that fails becomes exhausted.'], specialQualities:['Air subtype','Feather fall','Spore Filter (Ex): a willing host gains +2 on saves against inhaled poison and airborne disease while one breathwick is attached.'],
      environment:'Cloud bogs, hanging reed islands, storm marshes, and mist-choked air caverns', organization:'Solitary, ribbon (2-6), or veil (7-30)', treasure:'None', advancement:'4-6 HD (Tiny to Small)', cr:'2',
      combat:'It circles a target’s head, attaches to the airway, and rides the host’s panic-driven movement.', diet:'It feeds on exhaled vapor and life-bearing breath, supplementing this with spores and mist organisms.', ecology:'Small numbers clean the lungs of giant birds and air amphibians; large veils become lethal respiratory parasites.'
    },
    {
      id:'memory-leech', name:'Memory Leech', aliases:['Mnemosucker','Silver Thought-Worm'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Incorporeal ribbon-worm visible as a silver crease in the air', feedingMode:'Parasitic', planeAffinity:'Ethereal and Astral Bogs', sustenance:'Recent memories, emotional impressions, learned routes, and the psychic energy used to consolidate experience.',
      catalogNotes:'Anatomical catalogists reject it entirely, yet relational catalogists cite it as proof that leechhood describes the topology of sustained feeding rather than flesh.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'An incorporeal parasite that clings to a creature’s shadow and drinks the memory of where it has been.',
      size:'Tiny', type:'Aberration', subtypes:['Extraplanar','Incorporeal'], alignment:'Usually neutral evil', initiative:'+6', senses:'Darkvision 60 ft., lifesense 60 ft.', languages:'Understands Common and telepathy 30 ft.',
      ac:'18 (+2 size, +2 Dex, +4 deflection)', touch:'18', flatFooted:'16', hp:'32', hitDice:'5d8+10', saves:'Fort +3, Ref +3, Will +7', speed:'Fly 40 ft. (perfect)', bab:'+3', grapple:'—', space:'2-1/2 ft.', reach:'0 ft.',
      abilities:'Str —, Dex 15, Con 14, Int 9, Wis 16, Cha 18', skills:['Hide +18','Listen +11','Move Silently +10','Spot +11'], feats:['Ability Focus (memory sip)','Improved Initiative'],
      attacks:['Incorporeal touch +7 melee (1d4 Wisdom)'], specialAttacks:['Memory Sip (Su): a creature damaged by the touch must succeed on a DC 18 Will save or lose access to one trained skill chosen at random for 1 hour.','Shadow Attach (Su): after a successful touch it may occupy the target’s square and gains concealment from creatures other than the host.'], specialQualities:['Incorporeal traits','Spell resistance 15','Unbodied parasite'],
      environment:'Ethereal reed beds, astral mudflats, dream crossings, and forgotten roads', organization:'Solitary or recollection (2-5)', treasure:'Memory pearls formed after feeding', advancement:'6-10 HD (Tiny)', cr:'4',
      combat:'It attacks isolated minds, hides within a shadow, and drinks navigational and practical memories before fleeing.', diet:'Its primary food is recently formed memory and the psychic energy of recollection.', ecology:'Memory leeches erase migratory routes, scatter animal herds, and create dangerous blank regions where even native spirits become lost.'
    },
    {
      id:'brine-sump-leech', name:'Brine-Sump Leech', aliases:['Salt Drainer','Bitter Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Broad gelatinous slug with a ringed ventral sucker', feedingMode:'Facultative', planeAffinity:'Para-Elemental Quagmire', sustenance:'Excess salt, poisons, bile, dissolved metals, and bodily fluids drawn from living hosts.',
      catalogNotes:'Healers call it a symbiote when used to purge toxins; marshers call it a parasite when it continues feeding after the poison is gone.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A heavy gray sucker that draws salt and poison from a host, frequently continuing until the victim collapses from dehydration.',
      size:'Medium', type:'Ooze', subtypes:['Aquatic','Earth','Water'], alignment:'Always neutral', initiative:'-3', senses:'Blindsight 60 ft.', languages:'None',
      ac:'7 (-3 Dex)', touch:'7', flatFooted:'7', hp:'39', hitDice:'6d10+6', saves:'Fort +3, Ref -1, Will -1', speed:'15 ft., swim 20 ft.', bab:'+4', grapple:'+9 (+13 attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 20, Dex 4, Con 13, Int —, Wis 5, Cha 1', skills:['Swim +13'], feats:[],
      attacks:['Slam +9 melee (1d6+7 plus attach)'], specialAttacks:['Attach (Ex)','Desiccating Drain (Ex): an attached leech deals 1d4 nonlethal damage and 1 point of Constitution damage each round.','Toxin Purge (Ex): a willing attached host may immediately attempt a new save against one poison with a +4 circumstance bonus; success also deals 1 point of Constitution damage as the leech drains the contaminated fluids.'], specialQualities:['Ooze traits','Amphibious','Acid resistance 10','Salt sense 60 ft.'],
      environment:'Salt marshes, acid bogs, mudflats, and para-elemental sumps', organization:'Solitary, pair, or basin (3-8)', treasure:'None', advancement:'7-12 HD (Medium to Large)', cr:'3',
      combat:'It engulfs a limb, anchors its sucker, and drains fluid until forcibly removed.', diet:'It consumes dissolved salt, toxins, bile, and water from living bodies.', ecology:'Brine-sumps can save poisoned beasts and travelers, but uncontrolled populations leave entire wetlands littered with desiccated carcasses.'
    },
    {
      id:'ember-vein-leech', name:'Ember Vein Leech', aliases:['Heat Vampire','Red Vein Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'True leech-form with glassy heat-conductive organs', feedingMode:'Parasitic', planeAffinity:'Plane of Fire', sustenance:'Thermal energy and hot blood drawn from living creatures, with ambient flame sustaining digestion and movement.',
      catalogNotes:'Its success in fire swamps supports the author’s argument that abundant ambient heat frees a heat-drainer from spending stolen warmth on basic metabolism.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A glowing red parasite that drinks heat from a host while the surrounding fire keeps its own organs active.',
      size:'Small', type:'Magical beast', subtypes:['Fire'], alignment:'Usually neutral', initiative:'+3', senses:'Darkvision 60 ft., heat sense 60 ft.', languages:'None',
      ac:'17 (+1 size, +3 Dex, +3 natural)', touch:'14', flatFooted:'14', hp:'22', hitDice:'4d10', saves:'Fort +4, Ref +7, Will +2', speed:'20 ft., climb 20 ft., swim 20 ft. through lava', bab:'+4', grapple:'+1 (+9 attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 9, Dex 17, Con 10, Int 3, Wis 13, Cha 7', skills:['Climb +11','Hide +12','Swim +7'], feats:['Ability Focus (heat drain)','Weapon Finesse'],
      attacks:['Bite +8 melee (1d4-1 plus attach)'], specialAttacks:['Attach (Ex)','Heat Drain (Su): an attached leech deals 1d6 cold damage and gains 5 temporary hit points each round. A fire-subtype host instead takes 1d6 damage that bypasses fire immunity.'], specialQualities:['Fire immunity','Cold vulnerability','Ambient Metabolism: in severe heat or hotter conditions it need not feed to breathe, move, or digest, and gains fast healing 1.'],
      environment:'Lava marshes, furnace reeds, cinder pools, and the hides of fire giants and flame toads', organization:'Solitary, vein (2-5), or fever (6-20)', treasure:'Heat glass nodules', advancement:'5-7 HD (Small to Medium)', cr:'2',
      combat:'It leaps from heated stones, attaches near a major vessel, and drains warmth until its body shines white.', diet:'Its primary sustenance is heat taken from living hosts; ambient fire powers the rest of its bodily functions.', ecology:'Ember-veins are exceptionally numerous because hot environments subsidize locomotion, digestion, and reproduction, allowing nearly all stolen heat to become growth or offspring.'
    },
    {
      id:'cinder-suture-leech', name:'Cinder-Suture Leech', aliases:['Cautery Leech','Ash Stitcher'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Short ash-coated annelid with a heated sealing disc', feedingMode:'Symbiotic', planeAffinity:'Plane of Fire', sustenance:'Damaged tissue, clotted blood, wound heat, and infectious organisms consumed while sealing injuries.',
      catalogNotes:'Its healing benefit infuriates catalogists who equate leeches exclusively with harmful parasitism, though it unquestionably lives by feeding from wounds.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A gray medicinal fire leech that eats damaged flesh and cauterizes the clean wound behind it.',
      size:'Tiny', type:'Magical beast', subtypes:['Fire'], alignment:'Usually neutral', initiative:'+2', senses:'Darkvision 60 ft., scent', languages:'None',
      ac:'16 (+2 size, +2 Dex, +2 natural)', touch:'14', flatFooted:'14', hp:'9', hitDice:'2d10-2', saves:'Fort +2, Ref +5, Will +2', speed:'15 ft., climb 15 ft.', bab:'+2', grapple:'-7 (+5 willingly attached)', space:'2-1/2 ft.', reach:'0 ft.',
      abilities:'Str 4, Dex 15, Con 9, Int 3, Wis 15, Cha 8', skills:['Heal +9','Hide +14'], feats:['Skill Focus (Heal)'],
      attacks:['Bite +6 melee (1 plus 1 fire)'], specialAttacks:['Ash Sting (Ex): Fortitude DC 11 or take a -1 penalty on attacks for 1 round.'], specialQualities:['Fire immunity','Cauterizing Symbiosis (Su): a willing wounded host bearing one cinder-suture gains fast healing 1 for up to 5 rounds per day; each round also deals 1 nonlethal damage to the host.','Disease Eater: +4 on Heal checks to treat infected wounds.'],
      environment:'Fire-salamander nurseries, volcanic field hospitals, and ash-rich wetlands', organization:'Solitary, kit (2-10), or hospice (11-50)', treasure:'None', advancement:'3-4 HD (Tiny)', cr:'1',
      combat:'It flees unless cornered, then delivers a painful ash sting and hides beneath warm debris.', diet:'It feeds on damaged tissue, wound heat, clots, and infection while leaving healthy flesh largely untouched.', ecology:'Cinder-sutures are kept by salamanders and fire-swamp healers, and wild colonies gather wherever large creatures shed blood onto hot ash.'
    },
    {
      id:'furnace-maw-leech', name:'Furnace-Maw Leech', aliases:['Boiler Sucker','Great Fire Leech'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Six-limbed amphibious predator with a circular clamp-mouth rather than annelid anatomy', feedingMode:'Parasitic', planeAffinity:'Plane of Fire', sustenance:'Body heat, elemental flame, blood, and softened flesh taken during prolonged attachment.',
      catalogNotes:'The strict school calls it a predator or aberrant amphibian; the general catalogue includes it because attachment feeding supplies nearly all of its sustenance.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A wagon-sized heat predator whose ringed jaws clamp around prey and turn the victim into a living furnace tap.',
      size:'Large', type:'Magical beast', subtypes:['Fire'], alignment:'Usually neutral evil', initiative:'+1', senses:'Darkvision 60 ft., heat sense 120 ft.', languages:'None',
      ac:'22 (-1 size, +1 Dex, +12 natural)', touch:'10', flatFooted:'21', hp:'76', hitDice:'9d10+27', saves:'Fort +9, Ref +7, Will +5', speed:'30 ft., climb 20 ft., swim 30 ft. through lava', bab:'+9', grapple:'+20 (+24 attached)', space:'10 ft.', reach:'10 ft.',
      abilities:'Str 25, Dex 13, Con 17, Int 5, Wis 15, Cha 6', skills:['Climb +15','Hide +5 in lava crust','Listen +9','Spot +9'], feats:['Improved Bull Rush','Iron Will','Power Attack','Weapon Focus (bite)'],
      attacks:['Clamp-mouth +16 melee (2d8+10 plus attach)'], specialAttacks:['Improved Grab','Furnace Tap (Su): an attached furnace-maw deals 2d6 cold damage plus 1d4 Constitution damage each round and gains fast healing 5.','Thermal Vent (Su): after draining at least 10 points of damage, it may release a 20-ft. cone of flame for 6d6 fire damage, Reflex DC 17 half.'], specialQualities:['Fire immunity','Cold vulnerability','Damage reduction 5/piercing','Ambient Metabolism'],
      environment:'Deep lava bogs, slag deltas, furnace canals, and fire-giant stockyards', organization:'Solitary or pair', treasure:'Incidental metal fused into its hide', advancement:'10-15 HD (Large to Huge)', cr:'6',
      combat:'It bull-rushes prey into lava or mud, clamps on, drains heat, and vents the stolen energy at rescuers.', diet:'It feeds almost entirely by prolonged attachment, taking heat first and flesh only after the host weakens.', ecology:'Furnace-maws occupy the apex parasitic niche of fire swamps and keep giant fire herbivores from exhausting reed and fungus beds.'
    },
    {
      id:'ashen-brood-leech-swarm', name:'Ashen Brood Leech Swarm', aliases:['Soot Suckers','Gray Fever'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Minute annelid-like larvae carried in ash clouds', feedingMode:'Parasitic', planeAffinity:'Plane of Fire', sustenance:'Surface heat, blood mist, shed skin, and elemental residue taken from many hosts at once.',
      catalogNotes:'Some catalogists consider the individual larva a scavenger, but the swarm behaves as a continuous host-attaching feeder and is catalogued as one ecological creature.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A crawling cloud of soot-colored larvae that coats bodies and drinks heat through every pore.',
      size:'Diminutive', type:'Vermin', subtypes:['Fire','Swarm'], alignment:'Always neutral', initiative:'+4', senses:'Darkvision 60 ft., heat sense 60 ft.', languages:'None',
      ac:'18 (+4 size, +4 Dex)', touch:'18', flatFooted:'14', hp:'31', hitDice:'7d8', saves:'Fort +5, Ref +6, Will +2', speed:'20 ft., climb 20 ft., fly 20 ft. (poor) in ash', bab:'+5', grapple:'—', space:'10 ft.', reach:'0 ft.',
      abilities:'Str 1, Dex 19, Con 10, Int —, Wis 10, Cha 2', skills:[], feats:[],
      attacks:['Swarm 2d6 plus heat loss'], specialAttacks:['Distraction (Fortitude DC 13)','Heat Loss (Su): creatures damaged by the swarm take 1d4 cold damage and must save Fortitude DC 13 or become fatigued.'], specialQualities:['Fire immunity','Cold vulnerability','Swarm traits','Vermin traits','Ambient Metabolism'],
      environment:'Ash storms, cinder reed beds, burned wetlands, and volcanic nesting grounds', organization:'Swarm or fever (2-6 swarms)', treasure:'None', advancement:'—', cr:'4',
      combat:'The swarm pours into armor, hair, feathers, and gills, draining shallow heat while obscuring vision.', diet:'Each larva consumes tiny amounts of heat and tissue; the swarm survives because ambient fire powers movement between hosts.', ecology:'Ashen broods reproduce explosively after battles or migrations, explaining much of the extraordinary diversity and abundance of fire-plane leech forms.'
    },
    {
      id:'pyroclast-lamprey', name:'Pyroclast Lamprey', aliases:['Lava Lamprey','Flame-Eater Eel'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Jawless eel-like elemental vertebrate with a circular adhesive mouth', feedingMode:'Parasitic', planeAffinity:'Plane of Fire', sustenance:'Elemental flame, molten blood, and the animating heat of fire-subtype creatures.',
      catalogNotes:'Aquatic taxonomists insist it is a lamprey, not a leech; the general catalogue answers that the distinction is anatomical rather than ecological.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A black-glass lamprey that swims through lava and latches onto fire elementals to siphon their animating flame.',
      size:'Medium', type:'Magical beast', subtypes:['Fire'], alignment:'Usually neutral', initiative:'+2', senses:'Darkvision 60 ft., heat sense 90 ft.', languages:'None',
      ac:'19 (+2 Dex, +7 natural)', touch:'12', flatFooted:'17', hp:'37', hitDice:'5d10+10', saves:'Fort +6, Ref +6, Will +2', speed:'10 ft., swim 60 ft. through lava', bab:'+5', grapple:'+8 (+12 attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 16, Dex 15, Con 15, Int 3, Wis 12, Cha 5', skills:['Hide +8 in lava','Listen +6','Swim +15'], feats:['Endurance','Weapon Focus (bite)'],
      attacks:['Bite +9 melee (1d8+4 plus attach)'], specialAttacks:['Attach (Ex)','Flame Siphon (Su): an attached lamprey deals 1d6 damage per round; against a fire-subtype creature this damage ignores fire immunity and suppresses one extraordinary or supernatural fire attack chosen by the GM for 1 round.'], specialQualities:['Fire immunity','Cold vulnerability','Lava swimmer','Ambient Metabolism'],
      environment:'Lava channels, fire deltas, molten cisterns, and the bodies of immense fire elementals', organization:'Solitary, school (2-8), or run (9-30)', treasure:'Obsidian teeth', advancement:'6-9 HD (Medium to Large)', cr:'3',
      combat:'It erupts from lava, latches onto a fire-bearing creature, and twists violently when removal is attempted.', diet:'It feeds on living flame and molten bodily fluids, using ambient lava to sustain all nonfeeding activity.', ecology:'Pyroclast lampreys transfer elemental fire between hosts and waterways, and their abandoned egg tunnels aerate cooling lava mud.'
    },
    {
      id:'hearthshare-leech', name:'Hearthshare Leech', aliases:['Thermal Familiar','Warmback'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Broad plated leech with paired heat-storage bladders', feedingMode:'Symbiotic', planeAffinity:'Plane of Fire', sustenance:'Excess host heat and flame secretions, most of which are stored and later returned during cold stress.',
      catalogNotes:'The creature is a direct challenge to the claim that all leech relationships are exploitative: it feeds from a host, but the host receives thermal regulation and emergency warmth.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A copper-plated symbiote that drinks dangerous excess heat and returns it when its host enters cold or water.',
      size:'Small', type:'Outsider', subtypes:['Extraplanar','Fire'], alignment:'Usually neutral good', initiative:'+1', senses:'Darkvision 60 ft., heat sense 30 ft.', languages:'Understands Ignan',
      ac:'18 (+1 size, +1 Dex, +6 natural)', touch:'12', flatFooted:'17', hp:'24', hitDice:'4d8+6', saves:'Fort +5, Ref +5, Will +6', speed:'20 ft., climb 20 ft.', bab:'+4', grapple:'+1 (+9 willingly attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 9, Dex 13, Con 14, Int 6, Wis 15, Cha 13', skills:['Climb +9','Heal +8','Listen +8','Sense Motive +8','Spot +8'], feats:['Iron Will','Stealthy'],
      attacks:['Bite +4 melee (1d3-1 plus 1 fire)'], specialAttacks:['Stored Heat (Su): once per hour it may release a 10-ft. burst dealing 2d6 fire damage, Reflex DC 14 half.'], specialQualities:['Fire immunity','Cold vulnerability','Thermal Partnership (Su): a willing host gains fire resistance 10 and cold resistance 5; whenever either resistance prevents damage, the hearthshare gains 1 stored-heat point, maximum 10.','Heat Return: as an immediate action spend 5 stored-heat points to grant the host 10 temporary hit points for 1 minute.'],
      environment:'Fire settlements, salamander caravans, lava marshes, and volcanic crossings into cold planes', organization:'Solitary, bonded pair, or nursery (3-12)', treasure:'Coppery shell plates', advancement:'5-7 HD (Small)', cr:'2',
      combat:'It protects its bonded host, releasing stored heat at enemies and refusing to detach during cold exposure.', diet:'It lives on excess heat produced by another creature and stores a portion rather than consuming all of it.', ecology:'Hearthshares make long-distance fire-plane migration possible and are a prized example of mutualistic leechhood.'
    },
    {
      id:'slag-bloom-leech', name:'Slag-Bloom Leech', aliases:['Molten Gardener','Bloom Sucker'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Flower-shaped radial sucker attached to a rootlike crawling body', feedingMode:'Facultative', planeAffinity:'Plane of Fire', sustenance:'Host flame, charred tissue, mineral sweat, and molten contaminants removed from wounds and vents.',
      catalogNotes:'Botanical catalogists call it a mobile fungus, while relational catalogists place it among leeches because it survives only by sustained feeding from living fire creatures.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A flower-mouthed leech that blooms across the backs of flame toads, eating slag and sometimes healthy elemental fire.',
      size:'Small', type:'Plant', subtypes:['Fire'], alignment:'Always neutral', initiative:'+0', senses:'Low-light vision, tremorsense 20 ft. while attached', languages:'None',
      ac:'18 (+1 size, +7 natural)', touch:'11', flatFooted:'18', hp:'26', hitDice:'4d8+8', saves:'Fort +6, Ref +1, Will +2', speed:'10 ft., climb 10 ft.', bab:'+3', grapple:'+1 (+9 attached)', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 13, Dex 10, Con 15, Int —, Wis 13, Cha 6', skills:['Hide +8 among slag and scales'], feats:[],
      attacks:['Radial bite +5 melee (1d6+1 plus attach)'], specialAttacks:['Attach (Ex)','Flame Graze (Su): an attached slag-bloom deals 1d4 damage each round; a fire-subtype host may choose to take no damage for up to 3 rounds while the leech consumes only harmful slag.'], specialQualities:['Fire immunity','Plant traits','Slag Cleaning (Ex): a willing fire-subtype host gains +2 on saves against disease and effects that reduce fire resistance.','Ambient Metabolism'],
      environment:'Slag wetlands, flame-toad rookeries, salamander foundries, and volcanic mangroves', organization:'Solitary, bouquet (2-6), or garden (7-20)', treasure:'Heat-resistant seed nodules', advancement:'5-8 HD (Small to Medium)', cr:'2',
      combat:'It clamps down and converts stored slag into a spray of burning grit when disturbed.', diet:'It eats slag, char, damaged elemental tissue, and—when starving—the healthy flame of its host.', ecology:'Managed blooms clean large fire amphibians; neglected colonies cross from symbiosis into parasitism as soon as ambient nutrients decline.'
    },
    {
      id:'dream-leech', name:'Dream Leech', aliases:['Night Drinker','Velvet Sleeper'], category:'leech-ecologies', provenance:'new-canon-expansion', confidence:'high',
      catalogClass:'leech', morphology:'Soft-bodied oneiric parasite that manifests as a dark velvet slug on the sleeping spirit', feedingMode:'Facultative', planeAffinity:'Unconventional Planes', sustenance:'Dream imagery, fear, restorative psychic cycles, and emotional residue taken from sleeping creatures.',
      catalogNotes:'Beneficial specimens consume nightmares; predatory specimens consume all dreams, proving that parasite and symbiote can be behavioral states of the same species.',
      sourceBasis:'Added as new canon for the planar swamp leech catalogue.', summary:'A dream-swamp feeder that may cure nightmares or leave a victim hollow-eyed and unable to recover through sleep.',
      size:'Tiny', type:'Aberration', subtypes:['Extraplanar'], alignment:'Usually neutral', initiative:'+3', senses:'Darkvision 60 ft., detect sleeping creatures 120 ft.', languages:'Telepathy 30 ft. with sleeping creatures',
      ac:'17 (+2 size, +3 Dex, +2 natural)', touch:'15', flatFooted:'14', hp:'18', hitDice:'4d8', saves:'Fort +1, Ref +4, Will +6', speed:'20 ft., climb 20 ft.', bab:'+3', grapple:'-7 (+5 attached to a sleeper)', space:'2-1/2 ft.', reach:'0 ft.',
      abilities:'Str 3, Dex 17, Con 10, Int 8, Wis 15, Cha 14', skills:['Hide +15','Listen +8','Move Silently +11','Sense Motive +8'], feats:['Stealthy','Weapon Finesse'],
      attacks:['Dream bite +8 melee touch (1d3 Wisdom)'], specialAttacks:['Sleep Attach (Su): it may attach to a sleeping creature without waking it unless the victim succeeds on a DC 16 Will save.','Dream Drain (Su): after 1 hour attached, choose nightmare feeding or total feeding. Nightmare feeding grants the host a new save against a fear or nightmare effect; total feeding prevents natural healing and spell recovery from that rest.'], specialQualities:['Dream step','Spell resistance 14','Oneiric body'],
      environment:'Dream bogs, nightmare fens, sleeping forests, and planar crossings formed by mass slumber', organization:'Solitary, pillow (2-4), or hush (5-12)', treasure:'Condensed dream pearls', advancement:'5-8 HD (Tiny to Small)', cr:'3',
      combat:'It avoids waking foes, slips into dreams, and attacks only when a host or dream pearl is threatened.', diet:'Its food is the dreaming activity of another creature, ranging from harmful nightmares to the entire restorative dream cycle.', ecology:'Dream leeches are deliberately kept in some hospices and hunted as soul parasites in others; the same colony may shift roles with hunger and handling.'
    }
  ]);
})();
