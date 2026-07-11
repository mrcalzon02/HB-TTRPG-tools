(() => {
'use strict';
const ROOT='high-fantasy-potions-root', STORE='hb-ttrpg-high-fantasy-potions-v1';
const state={current:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=s=>s.trim().split('\n').map(line=>line.split('|'));
const rarities=[
{id:'common',label:'Common',rank:1,price:[35,90],dc:10,color:'#90a955'},
{id:'uncommon',label:'Uncommon',rank:2,price:[100,320],dc:13,color:'#4ca66b'},
{id:'rare',label:'Rare',rank:3,price:[350,1200],dc:16,color:'#4b7bd1'},
{id:'very-rare',label:'Very Rare',rank:4,price:[1300,5200],dc:19,color:'#8a55c7'},
{id:'legendary',label:'Legendary',rank:5,price:[6000,25000],dc:23,color:'#d49a32'}];
const families=rows(`
healing|Healing & Recovery
enhancement|Physical Enhancement
defense|Defense & Resistance
movement|Movement & Exploration
perception|Perception & Knowledge
transformation|Transformation
utility|Utility & Problem Solving
combat|Combat & Heroics
social|Social & Presence
strange|Strange, Forbidden & Wild`).map(([id,label])=>({id,label}));
const effects=[
['healing','Restorative Draught',1,r=>`Restores ${r+1}d4 + ${r*2} hit points or equivalent vitality.`,'Instant','One action','Drink the full dose or administer carefully to an unconscious creature.'],
['healing','Tonic of Purging',1,r=>`Grants a new resistance attempt with a +${r+1} bonus against poison, disease, or lingering corruption.`,r=>`${10*r} minutes`,'1 minute','One full dose; repeated use before a rest risks nausea.'],
['healing','Elixir of Renewed Breath',2,r=>`Ends one ordinary exhaustion level or restores ${r*2} hours of safe exertion.`,r=>`${r} hours`,'1 round','Drink slowly; ineffective when mixed into alcohol.'],
['healing','Blood-Knitting Cordial',2,r=>`Stabilizes mortal wounds and restores ${r}d6 vitality over ten minutes.`,'10 minutes','Immediate','Half may be poured into a wound; the rest must be swallowed.'],
['healing','Panacea of Clear Humors',4,r=>`Suppresses or removes one severe disease, curse-like affliction, petrifying influence, or magical contamination.`,'Permanent if successful','10 minutes','Requires a quiet recovery period and a full dose.'],
['enhancement','Giant-Sinew Philter',1,r=>`Grants +${Math.min(5,r+1)} to feats of strength, lifting, breaking, and forced movement.`,r=>`${10*r} minutes`,'1 round','Drink before exertion; armor feels unusually light.'],
['enhancement','Catstep Distillate',1,r=>`Improves agility, balance, and reflex checks by +${r+1}.`,r=>`${10*r} minutes`,'Immediate','Sip beneath the tongue.'],
['enhancement','Owlmind Suspension',2,r=>`Improves concentration, memory, and learned skill checks by +${r}.`,r=>`${r} hours`,'1 minute','Best taken with water; causes intense focus.'],
['enhancement','Lionheart Vintage',2,r=>`Grants advantage or +${r+1} against fear and coercion.`,r=>`${30*r} minutes`,'Immediate','One ceremonial swallow.'],
['enhancement','Archmage Lucidity',4,r=>`Heightens spell control, granting +${r-1} to one spellcasting test or reducing one concentration mishap.`,r=>`${10*r} minutes`,'1 round','Must be consumed before casting.'],
['defense','Ironskin Decoction',1,r=>`Grants ${r+1} points of damage reduction against mundane physical harm.`,r=>`${10*r} minutes`,'1 round','Drink; skin briefly takes on a metallic sheen.'],
['defense','Emberward Syrup',1,r=>`Grants resistance ${r*5} against fire and extreme heat.`,r=>`${30*r} minutes`,'Immediate','Coats the throat with cooling resin.'],
['defense','Frostward Cordial',1,r=>`Grants resistance ${r*5} against cold and exposure.`,r=>`${30*r} minutes`,'Immediate','Swallow while holding the bottle with both hands.'],
['defense','Stormglass Tonic',2,r=>`Grants resistance ${r*5} against lightning, thunder, and electrical magic.`,r=>`${20*r} minutes`,'1 round','Hair rises as the dose takes effect.'],
['defense','Aegis of the Saint',4,r=>`Provides a +${r} ward against hostile spells and supernatural influence.`,r=>`${10*r} minutes`,'Immediate','Drink while naming a vow, patron, or principle.'],
['movement','Fleetfoot Essence',1,r=>`Increases ground speed by ${5*(r+1)} feet or one equivalent tactical increment.`,r=>`${10*r} minutes`,'Immediate','A single swallow; legs feel almost weightless.'],
['movement','Spiderclimb Resin',2,r=>`Allows movement across walls and ceilings at ${r>=4?'full':'half'} speed.`,r=>`${10*r} minutes`,'1 round','Rub one drop on each palm, then drink the remainder.'],
['movement','Merfolk Breath',2,r=>`Allows underwater breathing and comfortable pressure tolerance.`,r=>`${r} hours`,'1 minute','Drink before submersion; gills may briefly appear.'],
['movement','Cloudstep Elixir',3,r=>`Grants levitation or controlled flight for ${r*5} minutes.`,r=>`${r*5} minutes`,'Immediate','Use outdoors or with sufficient clearance.'],
['movement','Wayfarer Fold',5,r=>`Opens one short-range step through space to a visible or intimately known location.`,'One use within 10 minutes','1 action','Break the seal while naming the destination.'],
['perception','Night-Eye Phial',1,r=>`Grants darkvision or extends it by ${30*r} feet.`,r=>`${r} hours`,'1 minute','One drop in each eye or drink diluted.'],
['perception','Truth-Taster Drops',2,r=>`Improves insight and detection of deliberate lies by +${r+1}.`,r=>`${10*r} minutes`,'Immediate','Hold on the tongue while listening.'],
['perception','Seer Murmur',3,r=>`Reveals magical auras, invisible disturbances, and concealed enchantments nearby.`,r=>`${10*r} minutes`,'1 round','Drink in silence; whispered impressions follow.'],
['perception','Mnemonic Wine',2,r=>`Allows perfect recall of the next ${r} hours and advantage on one knowledge inquiry.`,r=>`${r} hours`,'1 minute','Sip while focusing on a question.'],
['perception','Oracle Last Tear',5,r=>`Offers one symbolic but truthful vision concerning a named person, place, danger, or decision.`,'One vision','10 minutes','Drink during darkness, smoke, or ritual quiet.'],
['transformation','Beastshape Infusion',2,r=>`Grants one animal adaptation such as claws, gills, scent, fur, or climbing limbs.`,r=>`${10*r} minutes`,'1 round','Choose the adaptation before drinking.'],
['transformation','Draught of Diminution',2,r=>`Reduces the drinker by one size category; carried gear changes with them.`,r=>`${10*r} minutes`,'1 round','Drink while crouched.'],
['transformation','Draught of Enlargement',2,r=>`Increases the drinker by one size category; carried gear changes with them.`,r=>`${10*r} minutes`,'1 round','Drink in an open area.'],
['transformation','Face-Thief Tincture',3,r=>`Alters apparent ancestry, face, voice, and build within the drinker general body plan.`,r=>`${r} hours`,'1 minute','Visualize the desired guise.'],
['transformation','Dragonblood Serum',5,r=>`Grants draconic scales, presence, and one breath weapon use dealing ${r+3}d6 damage.`,r=>`${10*r} minutes`,'1 round','Extremely hot; requires a full dose.'],
['utility','Universal Solvent',1,r=>`Dissolves ordinary glue, tar, resin, wax, and one magical adhesive of comparable rarity.`,'Immediate','Immediate','Apply externally; do not drink unless clearly labeled.'],
['utility','Tonguesmith Cordial',2,r=>`Allows understanding and basic speech of ${Math.max(1,r-1)} unfamiliar languages.`,r=>`${r} hours`,'1 minute','Drink while hearing or seeing the target language.'],
['utility','Lockwhisper Oil',2,r=>`Reveals a lock condition and grants +${r+2} to one bypass attempt.`,'One lock','Immediate','Apply one drop to the keyway.'],
['utility','Featherload Syrup',1,r=>`Reduces effective carried weight by ${20*r}% without changing impact mass.`,r=>`${r} hours`,'1 minute','Sprinkle over packs or drink to affect worn gear.'],
['utility','Architect Dream',4,r=>`Reveals structural weaknesses, hidden chambers, false walls, and recent construction in a building-scale area.`,r=>`${10*r} minutes`,'1 minute','Drink while touching a wall, floor, or foundation.'],
['combat','Berserker Red',1,r=>`Grants +${r+1} melee damage and ${r*4} temporary vitality, but discourages retreat.`,r=>`${5*r} rounds`,'Immediate','Drink as a combat action.'],
['combat','Deadeye Bitters',2,r=>`Grants +${r+1} to ranged attacks and ignores one ordinary range or cover penalty.`,r=>`${5*r} rounds`,'Immediate','One measured capful.'],
['combat','Quickblood Ampoule',2,r=>`Grants +${r} initiative and one additional minor action during the first round.`,r=>`${r} rounds`,'Immediate','Snap the neck and swallow before engagement.'],
['combat','Ghostblade Oil',3,r=>`Lets one treated weapon strike spirits, incorporeal beings, and magical barriers.`,r=>`${10*r} minutes`,'1 action','One bottle treats one large or two small weapons.'],
['combat','Hero Impossible Hour',5,r=>`Grants advantage on attacks, saves, and heroic checks, plus ${r*5} temporary vitality.`,'1 minute','Immediate','Afterward, gain one exhaustion-like penalty.'],
['social','Silver-Tongue Liqueur',1,r=>`Grants +${r+1} to diplomacy, bargaining, performance, and public speaking.`,r=>`${10*r} minutes`,'1 minute','Sip, do not gulp.'],
['social','Mask of Innocence',2,r=>`Softens suspicious first impressions and grants advantage on one attempt to appear harmless.`,r=>`${10*r} minutes`,'Immediate','Drink before entering the scene.'],
['social','Commanding Vintage',3,r=>`Your voice carries supernatural authority; allies gain +${r} morale while enemies resist hesitation.`,r=>`${5*r} rounds`,'Immediate','Drink, then speak a clear command or rallying phrase.'],
['social','Courtier Mirror',2,r=>`Reveals the strongest immediate desire or anxiety in one visible conversation partner.`,r=>`${r} minutes`,'1 round','Taste while maintaining eye contact.'],
['social','Sovereign Presence',5,r=>`Creates an aura of majesty able to sway a crowd, halt lesser violence, or secure a formal audience.`,r=>`${10*r} minutes`,'1 minute','Serve in a ceremonial cup.'],
['strange','Bottled Second Shadow',2,r=>`Creates a shadow duplicate that scouts within ${30*r} feet and reports in gestures.`,r=>`${10*r} minutes`,'1 round','Pour onto the drinker shadow at dusk or in torchlight.'],
['strange','Grave-Sleep Distillate',2,r=>`Induces deathlike sleep and suppresses breath, pulse, hunger, and aging.`,r=>`${r} hours`,'1 minute','A prepared antidote or timed awakening is advised.'],
['strange','Memory-Eater Milk',3,r=>`Suppresses the last ${r*10} minutes of memory or one named ordinary memory.`,r=>`${r} days`,'10 minutes','Voluntary use is safest; dosage is sensitive.'],
['strange','Wild Magic Cordial',2,r=>`Produces one beneficial rarity-equivalent effect and one unpredictable cosmetic or situational anomaly.`,'Variable','Immediate','Shake exactly once; more shaking increases instability.'],
['strange','Philosopher False Dawn',5,r=>`For one hour, treats one impossible magical material as temporarily present for crafting or ritual work.`,'1 hour','10 minutes','Consumed by the primary crafter while naming the missing substance.']
].map(([family,name,min,effect,duration,onset,use])=>({family,name,min,effect,duration,onset,use}));
const colors=rows(`
ruby red|#a9162d
garnet|#6d1729
sunset orange|#df6d24
amber|#d69a22
molten gold|#e1b947
lemon yellow|#e4d65c
verdant green|#4a9e56
emerald|#15875d
sea-glass teal|#3fa7a0
turquoise|#2ba9b5
sky blue|#4c9ed9
sapphire|#2f5bb6
midnight blue|#222c73
violet|#7544a9
amethyst|#9560c5
royal purple|#5b2d86
rose pink|#d6638d
pearl white|#e6e2d4
moon-silver|#bfc7d5
smoke gray|#6d7078
ink black|#17171d
copper|#a55f34
milk opal|#dcd7c9
iridescent|#79a7a2`);
const list=s=>s.split('|');
const clarity=list('crystal clear|slightly cloudy|milky and opaque|shot through with luminous veins|full of slow-moving motes|divided into two stubborn layers|swirling while untouched|sparkling like powdered glass|thick with suspended petals|dark at the center and bright at the edges');
const glow=list('does not glow|glows faintly in darkness|brightens near magic|pulses with the holder heartbeat|casts moving runes on nearby surfaces|shines only when uncorked|dims whenever someone lies nearby|flares briefly when shaken');
const viscosity=list('thin as spring water|smooth as wine|syrupy|oily|gelatinous|effervescent|silken and heavy|grainy until warmed|foamy at the top');
const temperature=list('cool regardless of the room|warm as fresh bread|room temperature|cold enough to fog the glass|hot but never boiling|alternates between warm and cold|matches the drinker skin temperature');
const particles=list('no sediment|gold leaf flakes|silver bubbles|tiny seed-like pearls|ground crystal dust|black iron filings that never settle|pressed flower fragments|miniature sparks|a single eye-shaped bead|a spiral of ash|glittering scales|threads of colored smoke');
const tastes=list('wild honey|black cherry|tart apple|pear nectar|blood orange|lemon peel|mint|anise|cinnamon|clove|ginger|pepper|salted caramel|smoked plum|dark chocolate|mushroom broth|pine resin|fresh rain|iron|chalk|licorice root|lavender|rosewater|toasted grain|sea salt|juniper|vanilla|burnt sugar|ripe fig|cold tea');
const accents=list('with a sharp mineral edge|with an unexpectedly floral middle|followed by medicinal bitterness|with a flash of pepper heat|with a cooling herbal note|with a savory undertone|with a faint metallic bite|with a smoky aftertaste|with a clean citrus lift|with sweetness that arrives late|with no flavor after the first sip|with a taste that changes each swallow');
const finishes=list('The finish is dry and clean.|The aftertaste lingers for an hour.|The tongue tingles pleasantly.|The mouth goes briefly numb.|The drinker burps harmless sparks.|The final note resembles cold iron.|The sweetness vanishes when the bottle is empty.|The throat feels wrapped in warm wool.|A second unrelated flavor appears minutes later.');
const aromas=list('crushed mint|old parchment|ozone before a storm|woodsmoke|fresh bread|wet stone|pine needles|rose petals|salt air|hot copper|wintergreen|burnt sugar|cedar chests|mushroom cellars|incense|lemon oil|spiced wine|dust after rain|beeswax|alchemical spirits|violets|charred herbs|cold fireplace ash|an unfamiliar childhood kitchen');
const mouthfeel=list('watery|velvety|silky|oily|fizzy|powdery|thick and medicinal|numbing|warming|cooling|slightly gritty|weightless on the tongue');
const shapes=list('round-bottom apothecary flask|tall hexagonal vial|squat square bottle|spiral-neck phial|flat travel flask|teardrop ampoule|long-necked wine bottle|faceted crystal decanter|thumb-sized sample tube|wide-bellied jar|double-chamber bottle|serpentine glass flask|miniature amphora|heart-shaped bottle|skull-shaped novelty bottle|plain military issue vial');
const materials=list('clear glass|green bottle glass|blue glass|smoked glass|quartz crystal|polished ceramic|glazed clay|thin silver|hammered copper|carved bone|translucent horn|volcanic glass|enchanted ice|resin-sealed wood');
const sizes=list('one-ounce single dose|two-ounce standard dose|three-ounce generous dose|four-ounce travel bottle|six-ounce multi-dose bottle|palm-sized ampoule|belt-friendly narrow vial');
const seals=list('waxed cork|ground-glass stopper|screw-threaded silver cap|leather-wrapped cork|lead guild seal|living vine knot|wire cage and cork|ceramic plug under wax|snap-neck glass|rune-locked stopper|bone peg with silk cord|alchemical clasp');
const labels=list('neat parchment label|faded handwritten tag|embossed guild seal|numbered military label|painted heraldic device|cloth brewing marks|silver instruction plate|no label|label in an obsolete dialect|false commercial label|tiny illustrated usage diagram|prayer wrapped around the neck');
const conditions=list('factory-clean|lightly shelf-worn|scratched but sound|dusty from storage|chipped around the base|repaired with wire|stained by leakage|wrapped in protective straw|nested in a fitted case|cold and sweating|sealed inside an evidence bag|bearing scorch marks');
const ageBands=[
{id:'fresh',label:'Freshly Brewed',min:1,max:30,pot:[98,105],value:1,note:'Fresh, bright, and close to the maker intended profile.'},
{id:'recent',label:'Recent Batch',min:31,max:365,pot:[94,102],value:1,note:'Settled and integrated without meaningful deterioration.'},
{id:'mature',label:'Cellared / Mature',min:366,max:3650,pot:[88,108],value:1.15,note:'Age softened harsh notes; collectors may prize it.'},
{id:'old',label:'Old Stock',min:3651,max:18250,pot:[70,96],value:.9,note:'Usable, but sediment and potency drift require inspection.'},
{id:'ancient',label:'Ancient / Rediscovered',min:18251,max:182500,pot:[35,120],value:1.4,note:'Time transformed the batch; it may be weakened, concentrated, or uniquely altered.'}];
const traditions=rows(`
guild apothecary|regulated city guild with stamped measures and batch ledgers
village witch|local hedge practitioner using inherited seasonal recipes
temple infirmary|religious healing house using prayer and ritual purity
royal alchemist|court laboratory with expensive reagents and political oversight
elven herbalist|patient botanical tradition guided by seasons and lunar timing
dwarven distiller|mineral-heavy tradition using pressure vessels and furnace heat
gnomish experimentalist|instrumented workshop known for clever closures and risky improvements
orcish war-brewer|durable field tradition favoring bitter taste and fast onset
halfling cordial-maker|culinary school hiding powerful effects inside excellent drink
dragon-cult chemist|secretive tradition using ash, scale dust, and dangerous symbols
fey vintner|seasonal otherworldly producer whose labels are unusually literal
necromantic anatomist|forbidden medical tradition preserving life by studying death
adventuring quartermaster|practical field supplier valuing portability and reliability
monastic brewer|disciplined lineage using repetition, fasting, and fermentation
underworld poisoner|black-market compounder whose medicines and toxins share bottles
arcane university|academic operation with citations and graduate-student labor`);
const origins=list('the river city of Veyrun|a mountain monastery above the snow line|the royal infirmary|a hidden fey crossing|a caravan apothecary|a plague-year emergency workshop|an abandoned wizard tower|a dwarven deep foundry|a coastal temple district|an orcish frontier fortress|a university demonstration lab|a battlefield surgeon chest|a noble family cellar|a smuggler river cache|a dragon-haunted ruin|a sealed tomb market|the estate sale of a famous adventurer|a remote harvest festival');
const ingredients=list('moonwort|sungrass pollen|powdered pearl|troll-blood resin|phoenix ash|mandrake root|silverleaf|giant bee honey|sapphire dust|red dragon pepper|ghost orchid|grave moss|unicorn-thorn filings|basalt salt|merfolk kelp|cloudberry|umber mushroom|wyvern bile crystal|blink-dog whisker|saint thyme|hag apple|star-anise|ironwood bark|crushed amber|manticore milk|violet fire petals|winter lotus|dream poppy|cockatrice eggshell|angelica root|quicksilver fern|stormglass sand|chimera marrow salt|spider silk tincture|sunstone powder|frost lichen');
const carriers=list('distilled spring water|rice spirit|dark wine|honey syrup|clarified butter oil|rosewater|brine|goat milk|alchemical ethanol|tea concentrate|mushroom broth|pear brandy|molasses|liquid silver suspension|dawn dew');
const catalysts=list('a spoken true name|three drops of brewer blood|a silver stirring rod|moonlight through blue glass|a controlled lightning spark|the first bell after midnight|dragonbone charcoal|a prayer repeated nine times|a lodestone|a phoenix-feather quill|a tuning fork|a miniature hourglass|a circle of salt|a sealed breath|a single deliberate lie');
const methods=list('cold infusion over seven hours|triple distillation|low simmer in silver|pressure fermentation|sun-steeping followed by night cooling|mortar grinding and emulsification|ritual condensation|flash heating and bottling|crystal filtration|aging in miniature oak|successive dilution and recombination|centrifugal alchemical separation');
const qualities=[
{label:'Rough field batch',factor:.7,pot:-8,note:'Functional but harsh and uneven.'},
{label:'Serviceable commercial batch',factor:1,pot:0,note:'Ordinary professional reliability.'},
{label:'Fine artisan batch',factor:1.25,pot:4,note:'Cleaner taste and steadier effect.'},
{label:'Masterwork reserve',factor:1.65,pot:8,note:'Exceptional ingredients and process control.'},
{label:'Suspiciously perfect batch',factor:1.1,pot:2,note:'Flawless enough to invite questions about illusion or fraud.'}];
const quirks=list('Hair changes color until sunrise.|Nearby candles lean toward the bottle.|The potion repeats the last word spoken near it.|The empty bottle refills with harmless colored water at dawn.|The drinker briefly smells like rain.|Tiny illusory fish swim through the liquid.|The label rewrites itself in the reader native language.|The cork whispers the maker initials when removed.|The drinker leaves luminous footprints for one minute.|The potion works only if toasted aloud.|The bottle cannot be intentionally broken.|A spectral butterfly escapes when opened.|The liquid shows tomorrow weather.|The drinker voice gains a musical echo.|The potion tastes different to every ancestry.|The bottle warms near the condition it opposes.|A face-like bubble appears before the first dose.|The liquid always settles pointing north.|The bottle rolls uphill if unattended.|The color changes with the holder mood.');
const sideEffects=list('No meaningful side effect.|Mild nausea for 1d4 rounds.|Intense thirst for one hour.|Hands tremble for ten minutes.|Sleep is impossible for four hours.|The drinker speaks too loudly for one hour.|A harmless geometric rash appears.|Vulnerability to the opposite element for ten minutes.|The user pupils glow visibly.|Vivid dreams during the next rest.|Ordinary food loses taste until the next meal.|The user sneezes glittering sparks.|Temporary aversion to iron.|The user shadow moves a heartbeat late.|Unusual honesty for ten minutes.|The effect ends with one fatigue level.');
const clues=list('The wax seal uses the wrong guild color.|The sediment moves but should remain fixed.|The label predates the named brewer career.|The bottle is modern but sold as ancient.|The liquid stains the cork unlike authentic stock.|A genuine batch fluoresces under moonlight.|The ingredient list cannot produce this color.|The maker rune is mirrored.|The price is suspiciously low.|The batch number was scraped and rewritten.|A genuine bottle has a bubble trapped in its base.|The aroma is correct but the aftertaste is not.');
const namesA=list('Amber|Azure|Crimson|Emerald|Gilded|Moonlit|Silver|Starlit|Velvet|Witch|Saint|Dragon|Phoenix|Midnight|Sunfire|Thorn|Cloud|Iron|Rose|Ghost');
const namesB=list('Mercy|Stride|Sight|Ward|Breath|Resolve|Whisper|Fury|Grace|Memory|Vigor|Veil|Claw|Promise|Lantern|Heart|Dream|Crown|Shadow|Spark');
const namesC=list('Draught|Elixir|Cordial|Tonic|Philter|Infusion|Serum|Vintage|Essence|Distillate|Bitters|Syrup|Suspension|Ampoule|Oil');
function hashSeed(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=hashSeed(seed);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,a)=>a[Math.floor(r()*a.length)],int=(r,a,b)=>Math.floor(r()*(b-a+1))+a;
function randomRarity(r){const n=r()*100;return n<40?rarities[0]:n<70?rarities[1]:n<88?rarities[2]:n<97?rarities[3]:rarities[4];}
function ageText(d){return d<60?`${d} days`:d<730?`${Math.max(2,Math.round(d/30))} months`:`${d/365<10?(d/365).toFixed(1):Math.round(d/365)} years`;}
function generateOne(cfg,i){
 const r=rng(`${cfg.seed}::${i}`), rarity=cfg.rarity==='random'?randomRarity(r):rarities.find(x=>x.id===cfg.rarity)||rarities[1];
 const family=cfg.family==='random'?pick(r,families).id:cfg.family;
 const pool=effects.filter(x=>x.family===family&&x.min<=rarity.rank), effect=pick(r,pool.length?pool:effects.filter(x=>x.min<=rarity.rank));
 const age=cfg.age==='random'?pick(r,ageBands):ageBands.find(x=>x.id===cfg.age)||ageBands[1], days=int(r,age.min,age.max);
 const q=pick(r,qualities), potency=Math.max(20,Math.min(135,int(r,age.pot[0],age.pot[1])+q.pot)), color=pick(r,colors), maker=pick(r,traditions);
 const bottle={shape:pick(r,shapes),material:pick(r,materials),size:pick(r,sizes),seal:pick(r,seals),label:pick(r,labels),condition:pick(r,conditions)};
 const price=Math.max(5,Math.round(int(r,...rarity.price)*q.factor*age.value*(potency/100))), counterfeit=r()<.12, unstable=rarity.rank>=4?r()<.24:r()<.12;
 const tone=cfg.tone==='random'?pick(r,list('arcane|divine|alchemical|fey|draconic|primal|necromantic|wild')):cfg.tone;
 const ing=[pick(r,ingredients),pick(r,ingredients),pick(r,ingredients)].filter((x,j,a)=>a.indexOf(x)===j);
 return {id:`hf-potion-${hashSeed(`${cfg.seed}-${i}`).toString(36)}`,seed:`${cfg.seed}::${i}`,name:`${pick(r,namesA)} ${pick(r,namesB)} ${pick(r,namesC)}`,
 rarity,family:families.find(x=>x.id===effect.family)?.label||effect.family,
 effect:{name:effect.name,mechanics:effect.effect(rarity.rank),duration:typeof effect.duration==='function'?effect.duration(rarity.rank):effect.duration,onset:effect.onset,administration:effect.use},
 appearance:{colorName:color[0],colorHex:color[1],clarity:pick(r,clarity),glow:pick(r,glow),viscosity:pick(r,viscosity),temperature:pick(r,temperature),particles:pick(r,particles)},
 sensory:{taste:`${pick(r,tastes)} ${pick(r,accents)}`,finish:pick(r,finishes),aroma:pick(r,aromas),mouthfeel:pick(r,mouthfeel)},
 bottle,age:{band:age.label,days,display:ageText(days),potency,condition:age.note},
 manufacture:{tradition:maker[0],traditionDescription:maker[1],origin:pick(r,origins),tone,quality:q.label,qualityNote:q.note,batchMark:`${String.fromCharCode(65+int(r,0,25))}${int(r,10,99)}-${int(r,100,999)}`},
 recipe:{carrier:pick(r,carriers),ingredients:ing,catalyst:pick(r,catalysts),method:pick(r,methods)},
 market:{priceGp:price,appraisalDC:rarity.dc+(counterfeit?3:0),authenticity:counterfeit?'Possible counterfeit or relabeled batch':'No immediate sign of fraud',counterfeitClue:pick(r,clues)},
 risks:{unstable,sideEffect:unstable?pick(r,sideEffects.slice(1)):pick(r,sideEffects.slice(0,5)),quirk:pick(r,quirks),compatibility:'One active potion effect at a time is safest; combining magical draughts can create unpredictable interactions.'},
 doses:/multi-dose/.test(bottle.size)?int(r,2,4):1};
}
function saved(){try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v:[];}catch{return[];}}
function store(v){try{localStorage.setItem(STORE,JSON.stringify(v.slice(0,48)));}catch{}}
const options=a=>a.map(x=>`<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('');
function mount(){
 const root=document.getElementById(ROOT);if(!root||root.dataset.mounted==='true')return;root.dataset.mounted='true';
 root.innerHTML=`<section class="hf-potion-module">
 <header class="hf-potion-heading"><div><p class="eyebrow">Generic d20-compatible high fantasy</p><h2>High Fantasy Potion Generator</h2><p>Build complete magical draughts for treasure hoards, apothecaries, noble cellars, battlefield kits, ancient ruins, and suspicious black-market shelves.</p></div><button class="secondary-action" type="button" data-open-kaysender-potions>Open Kaysender Potion Generator</button></header>
 <form id="hf-potion-form" class="hf-potion-controls"><div class="hf-potion-control-grid">
 <label><span>Effect family</span><select class="tool-input" name="family"><option value="random">Random family</option>${options(families)}</select></label>
 <label><span>Rarity</span><select class="tool-input" name="rarity"><option value="random">Random rarity</option>${options(rarities)}</select></label>
 <label><span>Magical tradition</span><select class="tool-input" name="tone"><option value="random">Random tradition</option>${list('arcane|divine|alchemical|fey|draconic|primal|necromantic|wild').map(x=>`<option value="${x}">${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label>
 <label><span>Age</span><select class="tool-input" name="age"><option value="random">Random age</option>${options(ageBands)}</select></label>
 <label><span>Assortment size</span><select class="tool-input" name="count"><option value="1">One potion</option><option value="3">Three-potion shelf</option><option value="6">Six-potion merchant assortment</option><option value="12">Twelve-potion treasure cache</option></select></label>
 <label class="hf-potion-seed"><span>Reproducible seed</span><input class="tool-input" name="seed" value="high-fantasy-${Date.now().toString(36)}"><button class="secondary-action" type="button" id="hf-potion-new-seed">New Seed</button></label>
 </div><div class="hf-potion-actions"><button class="primary-action" type="submit">Generate Potions</button><button class="secondary-action" type="button" id="hf-potion-copy">Copy Assortment</button><button class="secondary-action" type="button" id="hf-potion-export">Export JSON</button><button class="secondary-action" type="button" id="hf-potion-save">Save Assortment</button></div>
 <p class="helper-note">Generic high-fantasy results use immediately playable d20-compatible guidance. Adjust price and bonuses to match the campaign economy.</p></form>
 <div id="hf-potion-status" class="potion-status" role="status" aria-live="polite"></div><div id="hf-potion-output" class="hf-potion-results"></div>
 <section class="hf-potion-saved-section"><div class="section-heading"><p class="eyebrow">Browser-local collection</p><h3>Saved Potion Assortments</h3><p>Saved results remain in this browser only.</p></div><div id="hf-potion-saved"></div></section></section>`;
 const form=document.getElementById('hf-potion-form');
 form.addEventListener('submit',e=>{e.preventDefault();generate();});
 document.getElementById('hf-potion-new-seed').addEventListener('click',()=>{form.elements.seed.value=`high-fantasy-${Date.now().toString(36)}-${Math.floor(Math.random()*1e6).toString(36)}`;});
 document.getElementById('hf-potion-copy').addEventListener('click',copyAll);
 document.getElementById('hf-potion-export').addEventListener('click',exportAll);
 document.getElementById('hf-potion-save').addEventListener('click',saveAll);
 root.querySelector('[data-open-kaysender-potions]').addEventListener('click',()=>document.querySelector('[data-generator-tab="potion-formulary"]')?.click());
 renderSaved();generate();
}
function config(){const f=document.getElementById('hf-potion-form'),v=Object.fromEntries(new FormData(f).entries());if(!v.seed.trim()){v.seed=`high-fantasy-${Date.now().toString(36)}`;f.elements.seed.value=v.seed;}v.count=Math.max(1,Math.min(12,Number(v.count)||1));return v;}
function card(p,i){return `<article class="hf-potion-card" style="--potion-liquid:${esc(p.appearance.colorHex)}"><header class="hf-potion-card-header"><div class="hf-potion-bottle" aria-hidden="true"><span class="hf-potion-cork"></span><span class="hf-potion-glass"><span class="hf-potion-liquid"></span></span></div><div><p class="eyebrow">${esc(p.manufacture.tradition)} · batch ${esc(p.manufacture.batchMark)}</p><h3>${esc(p.name)}</h3><p><strong>${esc(p.effect.name)}:</strong> ${esc(p.effect.mechanics)}</p></div><div class="hf-potion-price"><strong>${p.market.priceGp.toLocaleString()}</strong><span>gp</span></div></header>
 <div class="module-meta"><span class="badge" style="border-color:${esc(p.rarity.color)}">${esc(p.rarity.label)}</span><span class="badge">${esc(p.family)}</span><span class="badge">${esc(p.age.band)}</span><span class="badge">${p.doses} dose${p.doses===1?'':'s'}</span><span class="badge">${p.age.potency}% potency</span></div>
 <div class="hf-potion-summary"><div><span>Onset</span><strong>${esc(p.effect.onset)}</strong></div><div><span>Duration</span><strong>${esc(p.effect.duration)}</strong></div><div><span>Age</span><strong>${esc(p.age.display)}</strong></div><div><span>Appraisal</span><strong>DC ${p.market.appraisalDC}</strong></div></div>
 <div class="hf-potion-detail-grid">
 <section><h4>Liquid appearance</h4><p><strong>Color:</strong> ${esc(p.appearance.colorName)}.</p><p>${esc(p.appearance.clarity)}; ${esc(p.appearance.glow)}.</p><p>${esc(p.appearance.viscosity)}, ${esc(p.appearance.temperature)}, with ${esc(p.appearance.particles)}.</p></section>
 <section><h4>Taste and aroma</h4><p><strong>Taste:</strong> ${esc(p.sensory.taste)}.</p><p><strong>Finish:</strong> ${esc(p.sensory.finish)}</p><p><strong>Aroma:</strong> ${esc(p.sensory.aroma)}. Mouthfeel: ${esc(p.sensory.mouthfeel)}.</p></section>
 <section><h4>Bottle and labeling</h4><p>${esc(p.bottle.size)} ${esc(p.bottle.shape)} made from ${esc(p.bottle.material)}.</p><p><strong>Seal:</strong> ${esc(p.bottle.seal)}. <strong>Label:</strong> ${esc(p.bottle.label)}.</p><p><strong>Condition:</strong> ${esc(p.bottle.condition)}.</p></section>
 <section><h4>Age and batch</h4><p>${esc(p.age.condition)}</p><p><strong>Present potency:</strong> ${p.age.potency}%.</p><p><strong>Quality:</strong> ${esc(p.manufacture.quality)}. ${esc(p.manufacture.qualityNote)}</p></section>
 <section><h4>Maker and provenance</h4><p>${esc(p.manufacture.traditionDescription)}.</p><p><strong>Origin:</strong> ${esc(p.manufacture.origin)}.</p><p><strong>Tradition:</strong> ${esc(p.manufacture.tone)} magic.</p></section>
 <section><h4>Formula and ingredients</h4><p><strong>Carrier:</strong> ${esc(p.recipe.carrier)}.</p><p><strong>Ingredients:</strong> ${p.recipe.ingredients.map(esc).join(', ')}.</p><p><strong>Catalyst:</strong> ${esc(p.recipe.catalyst)}. <strong>Method:</strong> ${esc(p.recipe.method)}.</p></section>
 <section><h4>Use and handling</h4><p>${esc(p.effect.administration)}</p><p><strong>Interaction:</strong> ${esc(p.risks.compatibility)}</p><p><strong>Assorted quirk:</strong> ${esc(p.risks.quirk)}</p></section>
 <section><h4>Risk and authenticity</h4><p><strong>Side effect:</strong> ${esc(p.risks.sideEffect)}</p><p><strong>Authenticity:</strong> ${esc(p.market.authenticity)}.</p><p><strong>Inspection clue:</strong> ${esc(p.market.counterfeitClue)}</p></section>
 </div><footer class="hf-potion-card-footer"><button class="secondary-action" type="button" data-copy-potion="${i}">Copy Potion</button><code>${esc(p.id)}</code></footer></article>`;}
function render(){const out=document.getElementById('hf-potion-output');out.innerHTML=state.current.map(card).join('');out.querySelectorAll('[data-copy-potion]').forEach(b=>b.addEventListener('click',()=>copyOne(state.current[Number(b.dataset.copyPotion)])));}
function generate(){try{const c=config();state.current=Array.from({length:c.count},(_,i)=>generateOne(c,i));render();status(`${state.current.length} potion${state.current.length===1?'':'s'} generated from seed ${c.seed}.`);}catch(e){status(e.message||String(e),true);}}
function text(p){return `${p.name}\n${p.rarity.label} ${p.family} potion — ${p.market.priceGp} gp\nEffect: ${p.effect.mechanics}\nOnset / duration: ${p.effect.onset} / ${p.effect.duration}\nAppearance: ${p.appearance.colorName}; ${p.appearance.clarity}; ${p.appearance.glow}; ${p.appearance.viscosity}; ${p.appearance.particles}\nTaste: ${p.sensory.taste}. ${p.sensory.finish}\nAroma: ${p.sensory.aroma}; mouthfeel ${p.sensory.mouthfeel}\nBottle: ${p.bottle.size} ${p.bottle.shape}, ${p.bottle.material}, ${p.bottle.seal}, ${p.bottle.label}, ${p.bottle.condition}\nAge: ${p.age.display}; ${p.age.band}; ${p.age.potency}% potency\nMaker: ${p.manufacture.tradition}, ${p.manufacture.origin}; ${p.manufacture.quality}; batch ${p.manufacture.batchMark}\nIngredients: ${p.recipe.carrier}; ${p.recipe.ingredients.join(', ')}; catalyst ${p.recipe.catalyst}; ${p.recipe.method}\nAdministration: ${p.effect.administration}\nSide effect: ${p.risks.sideEffect}\nQuirk: ${p.risks.quirk}\nAuthenticity: ${p.market.authenticity}; clue: ${p.market.counterfeitClue}`;}
async function copyOne(p){if(!p)return;try{await navigator.clipboard.writeText(text(p));status(`${p.name} copied.`);}catch{status('Clipboard access failed.',true);}}
async function copyAll(){if(!state.current.length)return;try{await navigator.clipboard.writeText(state.current.map(text).join('\n\n---\n\n'));status('Potion assortment copied.');}catch{status('Clipboard access failed.',true);}}
function exportAll(){if(!state.current.length)return;const u=URL.createObjectURL(new Blob([JSON.stringify({generatedAt:new Date().toISOString(),potions:state.current},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=`high-fantasy-potions-${Date.now().toString(36)}.json`;a.click();URL.revokeObjectURL(u);status('Potion assortment exported.');}
function saveAll(){if(!state.current.length)return;const v=saved();v.unshift({id:`assortment-${Date.now().toString(36)}`,savedAt:new Date().toISOString(),potions:state.current});store(v);renderSaved();status('Potion assortment saved in this browser.');}
function renderSaved(){const t=document.getElementById('hf-potion-saved');if(!t)return;const v=saved();if(!v.length){t.innerHTML='<div class="module-empty">No saved high-fantasy potion assortments.</div>';return;}t.innerHTML=`<div class="hf-potion-shelf">${v.map((e,i)=>`<article><div><h4>${e.potions.length} potion${e.potions.length===1?'':'s'}</h4><p>${e.potions.map(x=>esc(x.name)).join(' · ')}</p><small>${new Date(e.savedAt).toLocaleString()}</small></div><div class="hf-potion-shelf-actions"><button class="secondary-action" type="button" data-load-saved="${i}">Load</button><button class="danger-action" type="button" data-delete-saved="${i}">Delete</button></div></article>`).join('')}</div>`;t.querySelectorAll('[data-load-saved]').forEach(b=>b.addEventListener('click',()=>{state.current=v[Number(b.dataset.loadSaved)]?.potions||[];render();document.getElementById('hf-potion-output')?.scrollIntoView({behavior:'smooth',block:'start'});status('Saved assortment loaded.');}));t.querySelectorAll('[data-delete-saved]').forEach(b=>b.addEventListener('click',()=>{v.splice(Number(b.dataset.deleteSaved),1);store(v);renderSaved();status('Saved assortment deleted.');}));}
function status(m,e=false){const s=document.getElementById('hf-potion-status');if(s){s.textContent=m;s.classList.toggle('is-error',e);}}
window.HBHighFantasyPotionGenerator=Object.freeze({mount,generate});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();