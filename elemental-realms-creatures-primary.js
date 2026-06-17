(() => {
  const wiki = window.HBElementalRealmsWiki;
  if (!wiki) throw new Error('Elemental Realms creature core must load first.');
  wiki.addEntries([
    {
      id:'serpentarii-sagescale', name:'Serpentarii Sagescale', aliases:['Serpentarii Sirenscale'], category:'water-plane', provenance:'manuscript-creature', confidence:'high', sourcePages:[5,6],
      sourceBasis:'Detailed aquatic species with appearance, coral collecting, mimicry, deceptive song, vanity, and territorial behavior.',
      summary:'A vain, intelligent serpentine coral collector whose entrancing song can guide, deceive, or trap planar travelers.',
      size:'Large', type:'Magical beast', subtypes:['Aquatic'], alignment:'Usually chaotic neutral', initiative:'+4', senses:'Darkvision 60 ft., low-light vision', languages:'Aquan, Common, one planar language',
      ac:'19 (-1 size, +4 Dex, +6 natural)', touch:'13', flatFooted:'15', hp:'60', hitDice:'8d10+16', saves:'Fort +8, Ref +10, Will +5', speed:'20 ft., swim 60 ft.', bab:'+8', grapple:'+15', space:'10 ft.', reach:'10 ft.',
      abilities:'Str 17, Dex 19, Con 15, Int 14, Wis 13, Cha 20', skills:['Bluff +16','Hide +11','Knowledge (the planes) +13','Perform (song) +18','Swim +16'], feats:['Ability Focus (deceptive allure)','Alertness','Dodge'],
      attacks:['Bite +10 melee (1d8+3)','Tail slap +10 melee (1d8+4)'], specialAttacks:['Deceptive Allure (Su): creatures within 60 ft. that hear the sagescale must succeed on a DC 21 Will save or move toward it for 1d4 rounds.','Coral Snare (Ex): hidden coral loops entangle a creature that fails a DC 18 Reflex save.'], specialQualities:['Amphibious','Coral Mimicry: +12 racial bonus on Hide checks among reefs, stone, or aquatic plants.','Keen perception'],
      environment:'Coral swamps and underwater caves of the Plane of Water', organization:'Solitary or commune (2-6)', treasure:'Double coral, gems, and art objects', advancement:'9-14 HD (Large)', cr:'5',
      combat:'It begins concealed, uses song to separate curious intruders, and attacks only after trespass or insult.', diet:'Reef fish, soft-bodied invertebrates, mineral algae, and ceremonial delicacies obtained through trade.', ecology:'Its artistic coral gardens provide shelter for smaller fish, luminous mollusks, and cleaning crustaceans.', conversionNotes:'Direct mechanical conversion of all named manuscript abilities.'
    },
    {
      id:'abyssal-eel', name:'Abyssal Eel', aliases:['Abyssal Eels'], category:'water-plane', provenance:'manuscript-creature', confidence:'high', sourcePages:[7,8],
      sourceBasis:'Detailed intelligent titan with pressure immunity, hydrokinesis, sonic roar, swallowing, tribute demands, and recorded elder size.',
      summary:'An intelligent ruler of trenches and abyssal swamps that commands currents and swallows enormous prey whole.',
      size:'Gargantuan', type:'Magical beast', subtypes:['Aquatic','Water'], alignment:'Usually chaotic neutral', initiative:'+2', senses:'Darkvision 240 ft., blindsense 120 ft.', languages:'Aquan; understands Draconic and Common',
      ac:'29 (-4 size, +2 Dex, +21 natural)', touch:'8', flatFooted:'27', hp:'310', hitDice:'23d10+184', saves:'Fort +21, Ref +15, Will +12', speed:'Swim 100 ft.', bab:'+23', grapple:'+43', space:'20 ft.', reach:'20 ft.',
      abilities:'Str 38, Dex 15, Con 27, Int 12, Wis 17, Cha 19', skills:['Intimidate +30','Knowledge (the planes) +18','Listen +25','Spot +25','Swim +34'], feats:['Awesome Blow','Cleave','Great Cleave','Improved Bull Rush','Iron Will','Power Attack','Snatch','Weapon Focus (bite)'],
      attacks:['Bite +32 melee (4d8+14)'], specialAttacks:['Hydrokinetic Maelstrom (Su): 60-ft.-radius current; DC 29 Strength or Swim check or be dragged 40 ft. and take 4d6 bludgeoning damage.','Sonic Roar (Su): 120-ft. cone; DC 25 Fortitude or stunned 1 round and deafened 2d6 rounds.','Improved grab','Swallow whole (4d8+14 bludgeoning plus 3d6 acid)'], specialQualities:['Amphibious','Pressure immunity','Damage reduction 10/magic','Spell resistance 27','Water mastery'],
      environment:'Abyssal depths, submerged ruins, and swamps of the Plane of Water', organization:'Solitary or elder with 2-5 attendants', treasure:'Triple goods and relics', advancement:'24-35 HD (Gargantuan)', cr:'16',
      combat:'It tears formations apart with currents, stuns survivors with its roar, and swallows the most dangerous isolated target.', diet:'Aquatic giants, enormous fish, planar whales, amphibious beasts, and tribute livestock.', ecology:'Its territory suppresses overpopulation among other abyssal predators but becomes catastrophically unstable if the eel dies.', conversionNotes:'Scaled to the manuscript’s recorded forty-foot elder specimen.'
    },
    {
      id:'great-tolmunde-flame-toad', name:'Great Tolmunde Flame Toad', category:'fire-plane', provenance:'manuscript-creature', confidence:'high', sourcePages:[9,10,11],
      sourceBasis:'Detailed lava-dwelling toad with flame breath, heat resistance, corpse preservation, territoriality, guidance, and tribute behavior.',
      summary:'A lava-swimming guardian that breathes fire and preserves a corpse in its mouth to sustain long submersion.',
      size:'Large', type:'Magical beast', subtypes:['Fire'], alignment:'Usually neutral', initiative:'+1', senses:'Darkvision 60 ft., tremorsense 30 ft., scent', languages:'Understands Ignan',
      ac:'22 (-1 size, +1 Dex, +12 natural)', touch:'10', flatFooted:'21', hp:'114', hitDice:'12d10+48', saves:'Fort +12, Ref +9, Will +7', speed:'30 ft., swim 40 ft. through lava', bab:'+12', grapple:'+22', space:'10 ft.', reach:'10 ft.; tongue 15 ft.',
      abilities:'Str 23, Dex 13, Con 19, Int 6, Wis 16, Cha 12', skills:['Jump +16','Listen +11','Spot +11','Swim +16'], feats:['Ability Focus (flame breath)','Great Fortitude','Iron Will','Power Attack','Weapon Focus (bite)'],
      attacks:['Bite +18 melee (2d8+9)','Tongue +13 ranged touch (grapple)'], specialAttacks:['Flame Breath (Su): 30-ft. cone, 8d6 fire, Reflex DC 22 half; usable every 1d4 rounds.','Tongue Snatch','Improved grab','Swallow whole'], specialQualities:['Corpse Preservation: a stored corpse grants fast healing 3 while submerged in lava.','Fire subtype','Lava swimmer','Scent','Territorial guide'],
      environment:'Volcano walls, lava lakes, and molten swamps', organization:'Solitary, pair, or bask (3-5)', treasure:'Tribute hoard', advancement:'13-20 HD (Large to Huge)', cr:'8',
      combat:'It opens with flame breath, seizes one target by tongue, and withdraws into lava if badly injured.', diet:'Carrion, fire beetles, lava crustaceans, mineral slurries, and preserved trespassers.', ecology:'Its abandoned wallows become cooler nurseries for cinder frogs, ember mites, and ash-shelled insects.', conversionNotes:'Direct mechanical conversion of every named manuscript adaptation.'
    },
    {
      id:'golem-frog', name:'Golem Frog', category:'earth-plane', provenance:'manuscript-creature', confidence:'high', sourcePages:[12,13],
      sourceBasis:'Detailed enchanted-stone guardian with geokinesis, camouflage, territorial behavior, tributes, and petrification.',
      summary:'An eight-foot enchanted stone frog that protects mineral deposits, underground waters, and earthen swamp balance.',
      size:'Large', type:'Construct', subtypes:['Earth'], alignment:'Usually neutral', initiative:'-1', senses:'Darkvision 60 ft., low-light vision, tremorsense 60 ft.', languages:'Terran; understands Common',
      ac:'24 (-1 size, -1 Dex, +16 natural)', touch:'8', flatFooted:'24', hp:'96', hitDice:'12d10+30', saves:'Fort +4, Ref +3, Will +6', speed:'20 ft., burrow 20 ft.', bab:'+9', grapple:'+20', space:'10 ft.', reach:'10 ft.',
      abilities:'Str 25, Dex 8, Con —, Int 8, Wis 15, Cha 10', skills:['Hide +4 (+16 among stone)','Listen +9','Spot +9'], feats:['Ability Focus (petrifying croak)','Cleave','Improved Bull Rush','Iron Will','Power Attack'],
      attacks:['Bite +15 melee (2d8+7)','2 slams +10 melee (1d8+3)'], specialAttacks:['Petrifying Croak (Su): 30-ft. cone; Fortitude DC 18 or slowed, then a second failed save next round causes petrification.','Geokinetic Barrier','Quake Leap'], specialQualities:['Construct traits','Damage reduction 10/adamantine','Stone camouflage','Earth glide'],
      environment:'Caverns, subterranean forests, mineral deposits, and underground springs', organization:'Solitary, pair, or watch (3-6)', treasure:'Guarded minerals and tribute', advancement:'13-20 HD (Large)', cr:'7',
      combat:'It hides as stone, seals exits with geokinesis, and petrifies the first concentrated wave of attackers.', diet:'It absorbs trace minerals and elemental energy rather than eating conventionally.', ecology:'Its tunnels redirect groundwater and create protected breeding pools for stone toads and cavern insects.', conversionNotes:'Direct conversion of the manuscript guardian profile.'
    },
    {
      id:'stone-toad', name:'Stone Toad', category:'earth-plane', provenance:'manuscript-creature', confidence:'high', sourcePages:[12,14,15,16],
      sourceBasis:'Extensive natural-history entry covering appearance, diet, camouflage, toxin, burrowing, vibration, reproduction, culture, and conservation.',
      summary:'A long-lived subterranean toad with stone-textured skin, a mild toxin, and a resonant earth-croak.',
      size:'Medium', type:'Magical beast', subtypes:['Earth'], alignment:'Usually neutral', initiative:'+0', senses:'Darkvision 90 ft., tremorsense 30 ft.', languages:'None',
      ac:'17 (+7 natural)', touch:'10', flatFooted:'17', hp:'30', hitDice:'4d10+8', saves:'Fort +6, Ref +4, Will +3', speed:'20 ft., burrow 20 ft., swim 20 ft.', bab:'+4', grapple:'+7', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 16, Dex 11, Con 15, Int 3, Wis 14, Cha 9', skills:['Hide +8 (+16 among rock)','Listen +7','Swim +8'], feats:['Great Fortitude','Skill Focus (Hide)'],
      attacks:['Bite +7 melee (1d8+4 plus toxin)'], specialAttacks:['Mild Skin Toxin (Ex): contact or bite; Fortitude DC 14 or sickened for 1d6 minutes.','Resonant Croak (Ex): creatures within 30 ft. must save Will DC 13 or become shaken 1 round.'], specialQualities:['Amphibious','Stone camouflage','Tremorsense','Burrower'],
      environment:'Subterranean caverns, rocky pools, and underground streams', organization:'Solitary or colony (2-10)', treasure:'None', advancement:'5-8 HD (Medium to Large)', cr:'2',
      combat:'It warns with low vibrations, bites persistent threats, and burrows away from superior foes.', diet:'Insects, small rodents, subterranean plants, cave worms, and mineral-rich fungi.', ecology:'Its eggs feed cave scavengers, while its burrows aerate wet stone and connect isolated underground pools.', conversionNotes:'Direct conversion from the manuscript’s unusually detailed biological profile.'
    },
    {
      id:'terracore-behemoth', name:'Terracore Behemoth', aliases:['Terracore Salamander'], category:'earth-plane', provenance:'manuscript-creature', confidence:'high', sourcePages:[13,14],
      sourceBasis:'Detailed colossal earthen salamander with armor, shell, quicksand manipulation, crystal breath, roar, intelligence, archaic Draconic, and tribute behavior.',
      summary:'A thirty-foot stone-plated salamander warden that hunts by vibration and reshapes crystal-laden mudscapes.',
      size:'Gargantuan', type:'Magical beast', subtypes:['Earth'], alignment:'Usually neutral', initiative:'-2', senses:'Darkvision 120 ft., tremorsense 120 ft., scent', languages:'Broken archaic Draconic, Terran',
      ac:'31 (-4 size, -2 Dex, +27 natural)', touch:'4', flatFooted:'31', hp:'276', hitDice:'24d10+144', saves:'Fort +20, Ref +12, Will +13', speed:'30 ft., burrow 20 ft., swim 20 ft. through mud', bab:'+24', grapple:'+48', space:'20 ft.', reach:'15 ft.; tongue 30 ft.',
      abilities:'Str 39, Dex 7, Con 23, Int 8, Wis 16, Cha 15', skills:['Hide -5 (+11 in rock)','Listen +22','Spot +22','Survival +19'], feats:['Awesome Blow','Cleave','Great Cleave','Improved Bull Rush','Iron Will','Power Attack','Snatch','Weapon Focus (bite)','Weapon Focus (tongue)'],
      attacks:['Bite +32 melee (4d8+14)','Tongue +27 ranged touch (improved grab)'], specialAttacks:['Crystal Eruption Breath (Su): 60-ft. cone, 12d6 piercing, Reflex DC 28 half.','Earthen Roar (Su): Will DC 24 or frightened 1d4 rounds.','Quicksand Mastery','Improved grab','Swallow whole'], specialQualities:['Damage reduction 15/adamantine','Earth glide','Impenetrable Shell: total defense grants DR 30/— but speed becomes 0.','Spell resistance 26','Stone camouflage'],
      environment:'Crystal-laden earthen marshes', organization:'Solitary or pack (2-4)', treasure:'Double gems and minerals', advancement:'25-36 HD (Gargantuan)', cr:'15',
      combat:'It turns stable footing into quicksand, roars to break formations, then uses crystal breath and its long tongue.', diet:'Crystal beetles, giant cave worms, mineral plants, stone toads, metal deposits, and large prey swallowed with mud.', ecology:'Its digestion spreads crystal seeds and rare minerals across the marsh, while its dens become refuges after migration.', conversionNotes:'Scaled directly to the manuscript’s recorded twenty-foot height and thirty-foot length.'
    },
    {
      id:'ethereal-swamp-toad', name:'Ethereal Swamp Toad', aliases:['Ghost Toad'], category:'ethereal-astral', provenance:'manuscript-creature', confidence:'high', sourcePages:[17,18],
      sourceBasis:'Extensive Astral natural-history profile describing translucent appearance, herbivory, glow, calming hum, long life, auspicious guidance, and keystone ecology.',
      summary:'A centuries-lived translucent toad whose calming glow guides Astral travelers and stabilizes ethereal bogs.',
      size:'Small', type:'Magical beast', subtypes:['Extraplanar'], alignment:'Usually neutral good', initiative:'+1', senses:'Darkvision 60 ft., low-light vision', languages:'Understands telepathy',
      ac:'15 (+1 size, +1 Dex, +3 deflection)', touch:'15', flatFooted:'14', hp:'14', hitDice:'3d10-3', saves:'Fort +2, Ref +4, Will +4', speed:'20 ft., fly 20 ft. (perfect) on the Astral Plane', bab:'+3', grapple:'-2', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 8, Dex 13, Con 9, Int 4, Wis 17, Cha 15', skills:['Hide +9','Listen +8','Spot +8'], feats:['Iron Will','Skill Focus (Listen)'],
      attacks:['Ethereal tongue +5 ranged touch (1d3 force)'], specialAttacks:['Calming Hum (Su): 30-ft. emanation; Will DC 13 or affected as calm emotions for 1 round.','Guiding Glow'], specialQualities:['Astral adaptation','Bioluminescence','Ethereal step','Keystone symbiosis'],
      environment:'Astral and ethereal bogs', organization:'Solitary, pair, or constellation (3-9)', treasure:'None', advancement:'4-6 HD (Small)', cr:'1',
      combat:'It avoids combat, calming aggression and leading threatened creatures toward safe crossings.', diet:'Ethereal algae, luminous mosses, astral fungi, and intangible plant matter.', ecology:'A keystone grazer whose movements distribute luminous spores and maintain open channels through ethereal vegetation.', conversionNotes:'Direct conversion from the manuscript’s biological and cultural notes.'
    },
    {
      id:'carnivorous-spectral-toad', name:'Carnivorous Spectral Toad', category:'ethereal-astral', provenance:'manuscript-creature', confidence:'high', sourcePages:[19,20],
      sourceBasis:'Extensive predatory profile with fangs, sticky tongue, ominous glow, silent stalking, croak lure, camouflage, hidden lairs, alchemical value, and ecological role.',
      summary:'A translucent Astral ambush predator whose crimson or purple glow lures prey into reach.',
      size:'Medium', type:'Magical beast', subtypes:['Extraplanar','Incorporeal'], alignment:'Usually neutral evil', initiative:'+4', senses:'Darkvision 120 ft., lifesense 60 ft.', languages:'None',
      ac:'19 (+4 Dex, +5 deflection)', touch:'19', flatFooted:'15', hp:'52', hitDice:'8d10+8', saves:'Fort +7, Ref +10, Will +5', speed:'30 ft., fly 50 ft. (perfect)', bab:'+8', grapple:'—', space:'5 ft.', reach:'5 ft.; tongue 20 ft.',
      abilities:'Str —, Dex 19, Con 12, Int 5, Wis 16, Cha 20', skills:['Hide +16','Listen +12','Move Silently +15','Spot +12'], feats:['Ability Focus (predatory glow)','Improved Initiative','Weapon Finesse'],
      attacks:['Spectral bite +12 melee touch (2d6 plus 1d4 Wisdom damage)','Tongue +12 ranged touch (restrains)'], specialAttacks:['Predatory Glow (Su): Will DC 21 or fascinated and drawn 10 ft. closer each round.','Astral Croak (Su): Will DC 19 or shaken 1d6 rounds.','Spectral tongue'], specialQualities:['Incorporeal traits','Luminous camouflage','Silent stalker','Turn resistance +2'],
      environment:'Hidden lairs among ethereal flora', organization:'Solitary or hunting pair', treasure:'Standard astral alchemical remains', advancement:'9-14 HD (Medium)', cr:'5',
      combat:'It matches ambient light, lures prey with its glow, restrains with its tongue, and drains resolve through its bite.', diet:'Astral insects, ephemeral ethereal fish, smaller astral beasts, and disoriented travelers.', ecology:'It prevents explosive growth among Astral insects and fish, and its abandoned lairs shelter herbivorous ghost toads.', conversionNotes:'Direct conversion from the complete source ecology.'
    },
    {
      id:'para-elemental-mudpuppy', name:'Para-Elemental Mudpuppy', category:'para-elemental', provenance:'manuscript-creature', confidence:'medium', sourcePages:[21],
      sourceBasis:'Explicit earth-and-water convergence creature with chameleon-like blending and effortless movement through shifting terrain.',
      summary:'A flexible amphibian of mud and water that changes texture and color with the terrain.',
      size:'Medium', type:'Magical beast', subtypes:['Earth','Water'], alignment:'Usually neutral', initiative:'+2', senses:'Darkvision 60 ft., tremorsense 30 ft.', languages:'None',
      ac:'18 (+2 Dex, +6 natural)', touch:'12', flatFooted:'16', hp:'39', hitDice:'6d10+6', saves:'Fort +6, Ref +7, Will +4', speed:'30 ft., swim 30 ft., burrow 20 ft.', bab:'+6', grapple:'+9', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 16, Dex 15, Con 13, Int 4, Wis 15, Cha 9', skills:['Hide +14','Move Silently +10','Swim +11'], feats:['Dodge','Stealthy','Track'],
      attacks:['Bite +9 melee (1d8+4)'], specialAttacks:['Mud Ambush: +2d6 damage against a flat-footed target.','Suction grapple'], specialQualities:['Amphibious','Earth-water adaptation','Morphic camouflage'],
      environment:'Para-Elemental Quagmire', organization:'Solitary, pair, or litter (3-8)', treasure:'None', advancement:'7-10 HD (Medium to Large)', cr:'3',
      combat:'It disappears into shifting mud and attacks only after prey loses stable footing.', diet:'Mud crabs, giant insect larvae, worms, algae, carrion, and small smoke toads.', ecology:'Its tunnels mix oxygen into quagmire mud and expose buried nutrients to reed beds.', conversionNotes:'Moderate-confidence conversion from concise source description.'
    },
    {
      id:'smoke-toad', name:'Smoke Toad', category:'para-elemental', provenance:'manuscript-creature', confidence:'medium', sourcePages:[21],
      sourceBasis:'Explicit fire-and-air convergence creature whose smoky breath represents transformation rather than simple destruction.',
      summary:'A paradoxical toad that exhales potent smoke and moves through fire-swept air.',
      size:'Medium', type:'Magical beast', subtypes:['Air','Fire'], alignment:'Usually neutral', initiative:'+3', senses:'Darkvision 60 ft., blindsense 30 ft.', languages:'None',
      ac:'19 (+3 Dex, +6 natural)', touch:'13', flatFooted:'16', hp:'45', hitDice:'6d10+12', saves:'Fort +7, Ref +8, Will +4', speed:'30 ft., fly 30 ft. (poor)', bab:'+6', grapple:'+8', space:'5 ft.', reach:'5 ft.',
      abilities:'Str 14, Dex 17, Con 15, Int 5, Wis 14, Cha 13', skills:['Hide +10 in smoke','Listen +8','Spot +8'], feats:['Ability Focus (smoke breath)','Dodge','Mobility'],
      attacks:['Bite +8 melee (1d8+2 plus 1d6 fire)'], specialAttacks:['Transformative Smoke (Su): 30-ft. cone; Fortitude DC 17 or nauseated 1 round and affected by one local transformation chosen by the GM.','Smoke cloud'], specialQualities:['Air-fire adaptation','Concealment in smoke','Fire resistance 20','Smoke breathing'],
      environment:'Para-Elemental Quagmire', organization:'Solitary or haze (2-6)', treasure:'None', advancement:'7-10 HD (Medium)', cr:'4',
      combat:'It fills the area with smoke and attacks from concealment while the ground changes beneath its prey.', diet:'Ash moths, ember gnats, smoke beetles, charred reeds, and mineral vapor.', ecology:'Its breath germinates some fire-adapted spores and controls insect blooms after elemental eruptions.', conversionNotes:'Moderate-confidence conversion from concise source description.'
    }
  ]);
})();
