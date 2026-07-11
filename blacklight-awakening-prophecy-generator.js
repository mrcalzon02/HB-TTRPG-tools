(()=>{
  'use strict';

  const triggers=[
    {name:'The War That Tears the Veil',category:'Conflict',theme:'war, violated sanctuary, dead witnesses, open roads between worlds',over:[
      'When hidden banners rise beneath a sky that remembers blood, six wounds shall open where the dead are counted but not mourned. At the final wound, the world behind the world shall no longer wait to be invited.',
      'The first kingdom will strike in secret, the second will answer in daylight, and the third blow will kill those standing in neighboring realities. When every truce becomes a weapon, the Veil will join the war.',
      'Beware the battle whose victors cannot agree which world they saved. Its refugees will carry new blood, its graves will speak, and its roads will remain open after the armies are gone.'
    ],stages:[
      ['The First Broken Truce','A protected negotiation ends in an unexplained death blamed on a rival power.','Two major supernatural powers formally abandon neutral-ground protections.','The cup is overturned before either guest has drunk; the host dies carrying the guest’s knife.','When the sanctuary door is barred from both sides, vengeance shall be recognized as law.'],
      ['The Arming of Old Names','Ceremonial relics and ancestral weapons disappear from sealed collections.','A faction deploys a weapon that harms bodies, souls, and adjacent realities together.','The sleeping blades are counted and one sheath is empty; an old name is spoken as an order.','When the oldest weapon is used for a modern grievance, three worlds shall bleed from one wound.'],
      ['The Multiplication of Fronts','Unrelated local conflicts begin using identical symbols, tactics, or summoned auxiliaries.','The war spreads across three regions or dimensions under linked command.','Three fires begin without shared tinder, yet every flame bends toward the same unseen wind.','When distant battlefields answer one command, the road between them shall become permanent.'],
      ['The Dead Refuse the Boundary','Battlefield dead appear in dreams, reflections, radio traffic, or borrowed memories.','Mass death creates a stable crossing that remains open without ritual maintenance.','The unburied speak through glass and wire, asking why the living have not finished their war.','When the dead march under officers of their own, the grave shall cease to be a border.'],
      ['The Consensus of War','Human witnesses independently describe impossible weapons and entities with matching detail.','A public battle makes supernatural warfare globally undeniable.','Strangers name the same impossible artillery though none were taught its shape.','When a billion eyes witness the hidden armies, disbelief shall be demobilized before dawn.'],
      ['The Veil Enlists','Magic strengthens in contested zones and metahuman traits appear among refugees or medics.','The boundary remains permanently open because every belligerent depends upon it.','The wounded change before they heal, and the battlefield begins choosing who may survive it.','When both armies require the open wound to continue, the wound shall become the law of the world.']
    ]},
    {name:'The Human Counterstrike',category:'Conflict',theme:'mortal fear, registries, lawful violence, machines trained to hate miracles',over:[
      'When the blind forge a spear from stolen sight, they shall name every shadow enemy and every difference contagion. The first strike will be praised because its victims were hidden; the last will teach the world what was hiding.',
      'A ledger of monsters shall become a ledger of neighbors. Machines without fear will carry the judgment of frightened men, and the hunted will answer with a sunrise no censor can conceal.',
      'Humanity will build the gate while believing it builds a wall. Every prison will become a school of resistance, every purge a revelation, and disbelief will die before the final launch order.'
    ],stages:[
      ['The Catalog of the Hidden','A mortal agency merges unrelated anomaly records into a single threat index.','A transnational registry identifies entire bloodlines, communities, and supernatural territories.','The clerk joins six harmless lists and discovers that the seventh contains families.','When the hidden are numbered by blood instead of deed, the ledger shall become a weapon.'],
      ['The Weapon Without Doubt','A prototype successfully suppresses one minor entity or magical effect.','A scalable anti-supernatural weapon is approved for autonomous field deployment.','The first silence is called proof, though no one asks what screamed beyond the instruments.','When the weapon chooses faster than conscience can object, fear shall inherit command.'],
      ['The Legal Cleansing','Emergency powers remove due process from anomaly investigations and secret detention.','Several governments authorize coordinated detention, sterilization, or extermination policy.','The exception is written in temporary ink, yet every jailer receives a permanent key.','When law names birth itself a hostile act, the cleansing shall no longer require monsters.'],
      ['The First Successful Purge','A hidden enclave disappears and the operation is privately celebrated as clean.','A supernatural population center is destroyed before it can warn its allies.','The empty neighborhood is praised because no witness remains to contradict the report.','When the first silence is called victory, every hidden nation shall prepare to answer in daylight.'],
      ['The Answer in Daylight','Rival supernatural factions begin sharing intelligence against human hunters.','The hidden world forms a united defense and deliberately abandons secrecy.','Ancient enemies exchange maps because the same executioner has learned both their names.','When the hunted stand together beneath the cameras, the secret world shall become a public army.'],
      ['The Wall Becomes the Gate','Fear produces spontaneous magical effects and transformations among civilians and soldiers.','Counterstrike and retaliation make magic an accepted fact and awaken metahumanity during extermination.','Those guarding the wall awaken on both sides of it and no uniform can explain the change.','When humanity fires upon the impossible, the impossible shall answer from inside humanity.']
    ]},
    {name:'The Rite of Returning Names',category:'Ritual',theme:'names, blood inheritance, stolen mouths, ritual correspondences, old peoples returning through modern systems',over:[
      'When the forgotten are named by mouths that never knew them, the lost age shall hear itself remembered and turn toward home. Six names will form the invitation; the seventh will be humanity, spoken without consent.',
      'The crown, root, chalice, road, grave, and star shall surrender the syllables they were sworn to hide. Those who call only their ancestors will awaken every inheritance.',
      'A ritual built for one people shall find the whole world listening. At the sixth returning, every dormant shape of humanity will answer, and no priest will possess enough names to send them back.'
    ],stages:[
      ['The Recovery of the First Name','A forbidden true-name fragment appears in an unrelated archive or shared dream.','The initiating faction reconstructs a complete ancestral name whose use causes repeatable change.','A syllable without language is found in three records that were never allowed to meet.','When the forgotten name changes flesh on command, the first ancestor shall know the road home.'],
      ['The Gathering of Correspondences','Relics and sacred sites from separate traditions begin resonating together.','Six required relics, sites, bloodlines, or offices fall under one ritual authority.','The crown answers the root, the chalice answers the grave, and distance ceases to keep them apart.','When six separated keys turn beneath one hand, the world itself shall become the seventh lock.'],
      ['The Choir Without Knowledge','People repeat ritual phrases through entertainment, prayer, software, or commerce without knowing it.','A global population becomes an active ritual component without informed consent.','Millions speak the harmless phrase and surrender a breath they do not remember giving.','When the choir can continue after every priest is dead, ignorance shall complete the invocation.'],
      ['The Return of the Intended','Chosen descendants manifest controlled traits or one lost spirit ecology briefly reappears.','The targeted ancestors, patron, people, or territory return in stable form.','The first child bears the promised eyes and the faithful declare the old blood restored.','When the intended dead walk securely beneath the sun, the keepers shall remove the safeguards.'],
      ['The Answer of Every Bloodline','Unrelated families display transformations excluded from the ritual design.','Dormant metahuman patterns activate across multiple human populations.','Children outside the covenant speak the returning names and wake in unfamiliar bodies.','When every bloodline answers an invitation meant for one, goblinization shall outrun classification.'],
      ['The Name That Cannot Be Withdrawn','Attempts to reverse the rite awaken additional spirits, forms, or replacement sites.','Humanity itself becomes the final name and the return becomes a permanent law of reality.','Each erased letter reappears in another mouth, and each broken altar moves into an ordinary home.','When the species is spoken as one true name, no priest shall remain outside the ritual to end it.']
    ]},
    {name:'The Consensus Recognition Cascade',category:'Ignorance',theme:'witnesses, cameras, shared language, rumor becoming law, belief hardening into physics',over:[
      'When a billion witnesses agree upon the impossible, the impossible will no longer require permission. Six proofs shall pass from hand to hand; on the seventh morning every mirror will show the world people expect to see.',
      'The secret will not be revealed by wisdom but by repetition. A child, camera, corpse, machine, crowd, and lie shall confirm the same forbidden fact until belief begins commanding reality.',
      'Beware the evidence that survives every explanation. Every denial will sharpen it, every erasure multiply it, and strangers shall reproduce the miracle at home.'
    ],stages:[
      ['The Unignorable Incident','A supernatural event is clearly recorded by unrelated witnesses or involves a public figure.','One incident survives professional forensic review and becomes a global reference point.','The image remains when every copy is destroyed, and strangers remember angles no camera held.','When the impossible survives the laboratories of its enemies, the world shall give it a name.'],
      ['The Failure of Explanations','Official explanations contradict observable details and censorship creates more copies.','Scientific, religious, and governmental authorities publicly reject the same cover story.','Every denial answers a different question, yet all point toward the same forbidden truth.','When censorship itself is accepted as evidence, concealment shall become revelation.'],
      ['The Reproducible Wonder','Ordinary people repeat a minor effect using leaked instructions or consumer devices.','A supernatural effect becomes reproducible by millions under ordinary conditions.','The miracle leaves the temple and appears on kitchen tables beneath untrained hands.','When strangers can repeat the wonder without permission, belief shall no longer require witnesses.'],
      ['The Shared Vocabulary','Unrelated cultures adopt common names and emergency terms for supernatural phenomena.','A global practical language for magic and metahumanity enters ordinary use.','Children in distant cities invent the same word for what stands behind the glass.','When the impossible is taught in schools and dispatched by emergency services, consensus shall begin reinforcing it.'],
      ['The Expectation Effect','Legends and local fears begin shaping anomalies around places associated with them.','Communities generate stable magical rules simply by expecting them.','The haunted road becomes haunted only after the map marks it so, yet the dead arrive on schedule.','When expectation writes local law, neighboring cities shall inhabit different realities beneath one sky.'],
      ['Belief Becomes Permission','Spirits and metahuman traits appear first where public expectation is strongest.','Collective recognition permanently rewrites the consensus boundary.','The named thing no longer weakens when doubted, for enough mouths have taught it how to remain.','When observation sustains the hidden world, no censor shall possess enough darkness to close it again.']
    ]},
    {name:'The Mana Reservoir Rupture',category:'Accumulation of Power',theme:'pressure, hidden seas, sealed valves, hoarded dawn, relief becoming market leverage',over:[
      'The world has swallowed every delayed dawn and called the silence safety. Beneath six locks the unused morning grows teeth; when one keeper sells the key and another refuses the valve, the Sixth World shall arrive through every wound at once.',
      'Count not the years gained but the power denied release. Every sealed caern, dream, grave, gate, and blood-debt fills the same hidden sea until the smallest cracked vessel becomes an ocean.',
      'What Charles diverted was not destroyed, and what the factions hoarded was never owned. When six reservoirs answer beneath the skin of the world, every sleeping form shall rise with the pressure.'
    ],stages:[
      ['The Rising Measure','Instruments disagree as magical pressure exceeds their scales and vents recharge too quickly.','Independent measurements confirm planetary accumulation beyond existing containment capacity.','The gauges quarrel because none were built to number the weight beneath them.','When every instrument fails in the same direction, denial shall become a measurement of its own.'],
      ['The Market of Scarcity','Factions trade access to vents, sacred sites, and dream channels while creating artificial shortages.','A cartel or sovereign controls several of the safest relief systems.','The keepers sell cups from a rising sea and call the shortage proof of ownership.','When relief is withheld for leverage, pressure shall learn the shape of the market.'],
      ['The Silencing of Valves','One relief site fails suspiciously and technicians disappear after reporting incompatible controls.','Three major release systems are sabotaged, captured, or deliberately closed.','The first valve closes without command and the engineer’s name is removed from the schedule.','When three mouths of the buried sea are sewn shut, every weaker wound shall begin to speak.'],
      ['The Weaponization Attempt','A faction tests a device that concentrates stored mana toward a target.','Accumulated pressure is transferred into a weapon or ascension engine linking reservoirs together.','A cup of the hidden sea is poured upon an enemy and the victors demand a larger vessel.','When pressure is taught to march as a weapon, every reservoir shall hear the order.'],
      ['The First Rupture','A local breach causes temporary goblinization, spirit weather, or awakened wildlife.','A primary reservoir fails and cannot be resealed by its original mechanism.','For one night the forest remembers beasts not born for this age, and some do not leave at dawn.','When the first great vessel breaks, every connected seal shall inherit its fracture.'],
      ['The World Finds Every Wound','Unknown fault lines, graves, dreams, and sacred places begin venting together.','The linked reservoir network ruptures globally and Awakening becomes the new equilibrium.','Power rises through places no keeper recorded, choosing wounds older than every map.','When the hidden sea reaches every shore, transformation shall become the only remaining release valve.']
    ]},
    {name:'The Sovereign Ascension',category:'Accumulation of Power',theme:'crowns, contracts, memory, monopoly, reality manufacturing opposition',over:[
      'When one crown gathers every road, every name, and every hunger, the world will remember that no single hand was meant to close around it. Six rivals shall submit, and reality shall awaken a thousand heirs rather than accept one eternal sovereign.',
      'The victor will mistake silence for consent. Contracts will become borders, worship weather, memory taxation; at the sixth submission the throne shall touch the machinery of the world.',
      'Beware the power that wins without revealing the war. It shall own the gate, archive, city, dream, grave, and witness until Awakening becomes reality’s act of rebellion.'
    ],stages:[
      ['The Acquisition of Leverage','One faction quietly acquires unrelated supernatural assets, contracts, relics, and territories.','It controls a decisive asset in every major supernatural sphere.','Six owners discover that the same unseen creditor holds all their debts.','When one hand can punish court, pack, spirit, state, and market alike, leverage shall become sovereignty.'],
      ['The Reduction of Rivals','Independent powers accept protection, debt, merger, or temporary dependency.','Several sovereign factions accept vassalage and few credible counter-powers remain.','The proud kneel only for a season, yet the season’s calendar belongs to their protector.','When rivals survive only by permission, independence shall become ceremonial.'],
      ['The Capture of Institutions','Governments and corporations unknowingly enforce supernatural contracts and hidden authority.','State, corporate, and occult institutions fall under durable common control.','The mortal clerk stamps an ancient oath without seeing the second signature.','When human law and hidden obligation issue the same command, the throne shall no longer require a palace.'],
      ['The Ownership of Memory','Records rewrite themselves and witnesses remember the ascending power as older than it is.','Collective history presents one sovereign order as inevitable and opposition becomes difficult to imagine.','The archive loses every rival name except in margins no reader remembers writing.','When history can describe no world before the crown, rebellion shall appear to be madness.'],
      ['The Sixth Submission','The final independent rival is isolated or offered impossible terms while coronation is prepared.','The last necessary counter-power kneels, vanishes, or is formally absorbed.','The final chair remains empty at the council because every road to it has been purchased.','When the sixth rival submits, reality shall recognize a monopoly no treaty can balance.'],
      ['Reality Creates Opposition','Dormant bloodlines and spirits awaken where the sovereign’s control is strongest.','Metahumanity and supernatural diversity erupt worldwide as automatic counterweights.','Children of conquered houses awaken bearing gifts their ancestors never possessed.','When nothing remains outside the crown, the world shall manufacture outsiders from every sleeping bloodline.']
    ]}
  ];

  const factionMethods={
    'a high fae court':['oath geometry','seasonal hostage law','beauty used as jurisdiction','true-name etiquette'],
    'a blood-sovereign coalition':['feeding compacts','inheritance ledgers','blood memory','dynastic emergency treaties'],
    'a Gaian spirit confederacy':['sacred ecology','predator omens','root testimony','weather shaped like judgment'],
    'a corrupted shapechanger alliance':['pack vengeance','contagious territory','ritual hunts','borrowed animal law'],
    'a multinational hunter directorate':['target registries','legal exceptions','sterile command language','weapons built from fear'],
    'an elder cult network':['sacramental recursion','buried architecture','prayer as software','obedience to a sleeping patron'],
    'a dream-market cartel':['sleep debt','counterfeit prophecy','dream laundering','nightmare arbitrage'],
    'a mortal occult corporation':['asset capture','compliance language','patent rituals','infrastructure as altar'],
    'a state intelligence compact':['redacted sovereignty','classification rituals','parallel command structures','plausible deniability'],
    'a disputed Blacklight splinter operation':['continuity theft','false Charles signatures','stolen safehouses','counterfeit containment doctrine']
  };
  const sourceLens={
    Fae:{label:'Fae oath archive',voice:'law disguised as beauty; every repeated image may be an obligation, insult, or unpaid debt',tone:['silver grammar','thorn-script','courtly omission','seasonal witness']},
    Gaian:{label:'Gaian spirit testimony',voice:'ecology speaking through wounds; locations may be organs, rivers may be witnesses, and beasts may be offices',tone:['root-song','antlered silence','weather memory','soil verdict']},
    Blood:{label:'Blood-oracle record',voice:'inheritance mistaking itself for prophecy; a person, house, disease, or dynasty may share one symbol',tone:['chalice shadow','lineage ash','red genealogy','ancestral hunger']},
    Dream:{label:'Collective dream evidence',voice:'mass unconscious metaphor; chronology may be emotional rather than temporal',tone:['sleep-static','mirrored childhood','borrowed nightmare','one-minute eternity']},
    'Dead Reality':{label:'Dead-reality warning',voice:'a survivorless world describing failure after the fact; it may know consequences better than causes',tone:['post-human weather','empty school bells','radiant extinction','grave-clean sunlight']},
    Charles:{label:'Charles continuity reconstruction',voice:'machine-assisted synthesis from contradictory futures; precision may be operational, not prophetic',tone:['black-card margin','continuity echo','burned forecast','machine confession']}
  };
  const acquisitions=[
    'Charles acquired the source through a theft conducted while its custodians believed the archive remained sealed.',
    'The source was purchased under a contract whose payment has been redacted from the mounted copy.',
    'Blacklight intercepted the record during an unrelated operation and retained it without notifying the original owner.',
    'The record was recovered from a dead or inaccessible reality and has no surviving claimant.',
    'Charles reconstructed the custody copy from damaged fragments held by mutually hostile factions.'
  ];
  const lacunae=['[six glyphs excised by heat]','[name lost to oath-redaction]','[margin eaten by saltwater]','[line repeats in a dead child’s handwriting]','[audio dropout: 11.4 seconds]','[translator note: metaphor may be literal]','[the witness refuses this stanza]','[black wax obscures the object]'];
  const vessels=['a cracked mirror','a crown of static','a hospital window at midnight','a treaty folded into a wound','a road seen only by animals','a drowned switchboard','a ledger with breathing pages','a school bell under soil','a knife that remembers permission','a river wearing a human name'];
  const motions=['turns without hands','learns the names of its jailers','refuses to cast a human shadow','answers before the question is spoken','blooms in the wrong century','counts backward from the last survivor','sings through locked machinery','kneels only to stand behind the throne','bleeds into the public record','opens like a mouth in clean daylight'];
  const omens=['three witnesses disagree and are all correct','the dead use administrative language','children draw the missing seal before seeing it','a machine develops ritual hesitation','every map loses one ordinary road','the accused faction arrives too early to be innocent','a harmless phrase becomes difficult to forget','the moon is mentioned where no sky is visible'];

  const $=id=>document.getElementById(id);
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function hash(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let x=hash(seed)||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
  function pick(r,list){return list[Math.floor(r()*list.length)]}
  function makeSeed(){return 'BAP-'+Date.now().toString(36).toUpperCase()+'-'+Math.floor(Math.random()*1679616).toString(36).padStart(4,'0').toUpperCase()}

  function fragmentText(kind,rec,stage,base,event){
    const r=rng(`${rec.seed}|${rec.index}|${stage.number}|${kind}|fragment`);
    const source=sourceLens[rec.source];
    const method=pick(r,factionMethods[rec.faction]);
    const imageA=pick(r,vessels), imageB=pick(r,vessels), motion=pick(r,motions), omen=pick(r,omens), gap=pick(r,lacunae), tone=pick(r,source.tone);
    const title=kind==='minor'?'Minor omen fragment':'Major threshold fragment';
    const hinge=kind==='minor'?'not yet a door, but the hinge remembers the hand that will use it':'not a warning bell, but the bell tower already falling in reverse';
    return `${title} // ${source.label} // ${tone}\n\n${base}\n\nBeneath that line the recovered copy becomes more elaborate: ${imageA} ${motion}, and ${imageB} is drawn beside it with the ink scraped away. The scribe, or the machine pretending to be one, writes that this is ${hinge}. Then the text breaks: ${gap}.\n\nA later hand adds: “Look for the place where ${event.toLowerCase()}.” It is unclear whether the place is a room, a bloodline, a law, a server, a grave, a court, or a person made to carry the shape of all six. The source speaks in ${rec.trigger.theme}; it may be describing the mechanism honestly while lying about the actor.\n\nIf ${rec.faction} is present, the image of ${method} should be treated as probable contamination. The omen says ${omen}; the threshold says the same thing with witnesses removed. What remains missing is the name after the sixth mark, the hour after the first refusal, and the hand that benefits when Charles believes the fragment too quickly.`;
  }

  function expandedOverarching(rec,base){
    const r=rng(`${rec.seed}|${rec.index}|overarching`);
    const a=pick(r,vessels), b=pick(r,vessels), c=pick(r,lacunae), source=sourceLens[rec.source];
    return `${base}\n\nThe longer custody copy continues in a second register, less certain and more ceremonial: ${a} is placed where a calendar should be, and ${b} is named as both witness and wound. The augury refuses to distinguish rescue from provocation. It says the Awakening arrives when delay becomes architecture, when architecture becomes appetite, and when appetite learns to speak through institutions.\n\n${c}. Charles flags this missing portion as materially important because the fragment changes tense immediately afterward: what was “will come” becomes “has already been paid for.” Source tone: ${source.voice}. Suspected actor contamination: ${pick(r,factionMethods[rec.faction])}.`;
  }

  function interpretation(kind,rec,stage,frag){
    const r=rng(`${rec.seed}|${rec.index}|${stage.number}|${kind}|interp`);
    const first=frag.prophecy.split(/[.!?\n]/).find(Boolean)||frag.prophecy;
    const method=pick(r,factionMethods[rec.faction]);
    const source=sourceLens[rec.source];
    const weight=kind==='minor'?'a pre-fulfillment omen with symbolic leakage':'a material completion threshold with operational consequence';
    return [
      `Charles reading: this is ${weight}. The line “${first.trim()}” now has room for several referents, but the strongest operational match is still “${frag.event}.”`,
      `Source-family reading: because this came through ${source.label}, the fragment’s imagery should be read through ${source.voice}. A literal reading is possible, but probably incomplete.`,
      `Faction/counterintelligence reading: ${rec.faction} may be using ${method} to make this stage appear more advanced, less advanced, or assigned to the wrong culprit. The prophecy may be bait as much as warning.`,
      `Missing-section reading: the lacunae matter. If the erased object is a person, this is a recruitment prophecy; if it is a place, it is a site warning; if it is a law, it is already embedded in an institution.`,
      `Field-use reading: do not close the file on language alone. Attach the image to evidence: witnesses, contracts, wounds, recordings, dreams, altered records, impossible logistics, or factions changing behavior around ${stage.title}.`
    ];
  }

  function build(index,seed){
    const r=rng(`${seed}|${index}`), t=triggers[index];
    const factionSel=$('prophecy-faction').value, sourceSel=$('prophecy-source').value, claritySel=$('prophecy-clarity').value;
    const faction=factionSel==='random'?pick(r,Object.keys(factionMethods)):factionSel;
    const source=sourceSel==='random'?pick(r,Object.keys(sourceLens)):sourceSel;
    const clarity=claritySel==='random'?pick(r,['Veiled','Balanced','Direct']):claritySel;
    const rec={index,seed,trigger:t,faction,source,clarity,acquisition:pick(r,acquisitions),id:`BAP-${index+1}-${hash(seed+'|'+index).toString(16).toUpperCase().padStart(8,'0')}`};
    rec.over=expandedOverarching(rec,pick(r,t.over));
    rec.stages=t.stages.map((s,i)=>{
      const stage={number:i+1,title:s[0]};
      stage.minor={event:s[1],prophecy:fragmentText('minor',rec,stage,s[3],s[1])};
      stage.major={event:s[2],prophecy:fragmentText('major',rec,stage,s[4],s[2])};
      stage.minor.readings=interpretation('minor',rec,stage,stage.minor);
      stage.major.readings=interpretation('major',rec,stage,stage.major);
      return stage;
    });
    return rec;
  }

  function panel(type,st,frag){
    const minor=type==='minor';
    return `<article class="event-fragment ${minor?'minor-fragment':'major-fragment'}"><div class="fragment-heading"><span>${minor?'MINOR OMEN':'MAJOR THRESHOLD'}</span><strong>${minor?'Event trigger':'Completion condition'}</strong></div><blockquote>${esc(frag.prophecy)}</blockquote><div class="event-correspondence"><span>Event correspondence</span><p>${esc(frag.event)}</p></div><details class="interpretation-drawer"><summary>Open ${frag.readings.length} interpretations</summary><ol>${frag.readings.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details></article>`;
  }
  function render(rec,open){
    return `<details class="prophecy-record" ${open?'open':''}><summary><span>${esc(rec.id)}</span><strong>${esc(rec.trigger.name)}</strong><em>Suspected actor: ${esc(rec.faction)}</em></summary><article class="prophecy-card"><div class="intel-grid"><div class="intel-field"><span>Primary source</span><p>${esc(sourceLens[rec.source].label)}</p></div><div class="intel-field"><span>Acquisition</span><p>${esc(rec.acquisition)}</p></div><div class="intel-field"><span>Suspected advancing faction</span><p>${esc(rec.faction)}</p></div><div class="intel-field"><span>Charles analysis posture</span><p>${esc(rec.clarity)}</p></div></div><div class="prophecy-major"><span>Major overarching prophecy</span><blockquote>${esc(rec.over)}</blockquote></div><div class="stage-sequence">${rec.stages.map(st=>`<section class="stage-pair"><header><span>STAGE ${st.number} OF 6</span><h3>${esc(st.title)}</h3></header><div class="stage-pair-grid">${panel('minor',st,st.minor)}${panel('major',st,st.major)}</div></section>`).join('')}</div></article></details>`;
  }
  function textRecord(rec){
    const out=[`BLACKLIGHT RECOVERED PROPHECY ${rec.id}`,`Awakening trigger: ${rec.trigger.name}`,`Suspected advancing faction: ${rec.faction}`,`Primary source: ${sourceLens[rec.source].label}`,`Acquisition: ${rec.acquisition}`,'',`MAJOR OVERARCHING PROPHECY`,rec.over];
    rec.stages.forEach(st=>{out.push('',`STAGE ${st.number} OF 6 — ${st.title}`,'MINOR OMEN PROPHECY',st.minor.prophecy,`Minor event: ${st.minor.event}`,'Minor interpretations:',...st.minor.readings.map((x,i)=>`${i+1}. ${x}`),'MAJOR THRESHOLD PROPHECY',st.major.prophecy,`Major event: ${st.major.event}`,'Major interpretations:',...st.major.readings.map((x,i)=>`${i+1}. ${x}`))});
    return out.join('\n');
  }

  let current='';
  function generate(all){
    const seed=$('prophecy-seed').value.trim()||makeSeed(); $('prophecy-seed').value=seed;
    const chosen=$('prophecy-trigger').value;
    const records=all?triggers.map((_,i)=>build(i,seed)):[build(chosen==='random'?Math.floor(rng(seed+'|select')()*triggers.length):Number(chosen),seed)];
    $('prophecy-output').innerHTML=records.map((x,i)=>render(x,i===0)).join('');
    current=records.map(textRecord).join('\n\n============================================================\n\n');
    $('prophecy-copy').disabled=false;
    $('prophecy-status').textContent=all?`Mounted all six long-form recovered auguries from key ${seed}.`:`Mounted ${records[0].id} with long-form damaged augury fragments.`;
    $('prophecy-output').scrollIntoView({behavior:'smooth',block:'start'});
  }
  $('prophecy-generate').addEventListener('click',()=>generate(false));
  $('prophecy-generate-six').addEventListener('click',()=>generate(true));
  $('prophecy-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(current);$('prophecy-status').textContent='Long-form ordered prophecy copied.'}catch(e){$('prophecy-status').textContent='Clipboard blocked. Select the mounted file manually.'}});
})();