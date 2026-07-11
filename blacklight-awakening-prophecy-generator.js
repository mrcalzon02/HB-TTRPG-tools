(()=>{
  'use strict';

  const TRIGGERS=[
    {
      name:'The War That Tears the Veil', category:'Conflict',
      overarching:[
        'When hidden banners rise beneath a sky that remembers blood, six wounds shall open where the dead are counted but not mourned. At the final wound, the world behind the world shall no longer wait to be invited.',
        'The first kingdom will strike in secret, the second will answer in daylight, and the third blow will kill those standing in neighboring realities. When every truce becomes a weapon, the Veil will join the war.',
        'Beware the battle whose victors cannot agree which world they saved. Its refugees will carry new blood, its graves will speak, and its roads will remain open after the armies are gone.'
      ],
      stages:[
        ['The First Broken Truce','A protected negotiation ends in an unexplained death blamed on a rival power.','Two major supernatural powers formally abandon neutral-ground protections.','The cup is overturned before either guest has drunk; the host dies carrying the guest’s knife.','When the sanctuary door is barred from both sides, vengeance shall be recognized as law.'],
        ['The Arming of Old Names','Ceremonial relics and ancestral weapons disappear from sealed collections.','A faction deploys a weapon that harms bodies, souls, and adjacent realities together.','The sleeping blades are counted and one sheath is empty; an old name is spoken as an order.','When the oldest weapon is used for a modern grievance, three worlds shall bleed from one wound.'],
        ['The Multiplication of Fronts','Unrelated local conflicts begin using identical symbols, tactics, or summoned auxiliaries.','The war spreads across three regions or dimensions under linked command.','Three fires begin without shared tinder, yet every flame bends toward the same unseen wind.','When distant battlefields answer one command, the road between them shall become permanent.'],
        ['The Dead Refuse the Boundary','Battlefield dead appear in dreams, reflections, radio traffic, or borrowed memories.','Mass death creates a stable crossing that remains open without ritual maintenance.','The unburied speak through glass and wire, asking why the living have not finished their war.','When the dead march under officers of their own, the grave shall cease to be a border.'],
        ['The Consensus of War','Human witnesses independently describe impossible weapons and entities with matching detail.','A public battle makes supernatural warfare globally undeniable.','Strangers name the same impossible artillery though none were taught its shape.','When a billion eyes witness the hidden armies, disbelief shall be demobilized before dawn.'],
        ['The Veil Enlists','Magic strengthens in contested zones and metahuman traits appear among refugees or medics.','The boundary remains permanently open because every belligerent depends upon it.','The wounded change before they heal, and the battlefield begins choosing who may survive it.','When both armies require the open wound to continue, the wound shall become the law of the world.']
      ]
    },
    {
      name:'The Human Counterstrike', category:'Conflict',
      overarching:[
        'When the blind forge a spear from stolen sight, they shall name every shadow enemy and every difference contagion. The first strike will be praised because its victims were hidden; the last will teach the world what was hiding.',
        'A ledger of monsters shall become a ledger of neighbors. Machines without fear will carry the judgment of frightened men, and the hunted will answer with a sunrise no censor can conceal.',
        'Humanity will build the gate while believing it builds a wall. Every prison will become a school of resistance, every purge a revelation, and disbelief will die before the final launch order.'
      ],
      stages:[
        ['The Catalog of the Hidden','A mortal agency merges unrelated anomaly records into a single threat index.','A transnational registry identifies entire bloodlines, communities, and supernatural territories.','The clerk joins six harmless lists and discovers that the seventh contains families.','When the hidden are numbered by blood instead of deed, the ledger shall become a weapon.'],
        ['The Weapon Without Doubt','A prototype successfully suppresses one minor entity or magical effect.','A scalable anti-supernatural weapon is approved for autonomous field deployment.','The first silence is called proof, though no one asks what screamed beyond the instruments.','When the weapon chooses faster than conscience can object, fear shall inherit command.'],
        ['The Legal Cleansing','Emergency powers remove due process from anomaly investigations and secret detention.','Several governments authorize coordinated detention, sterilization, or extermination policy.','The exception is written in temporary ink, yet every jailer receives a permanent key.','When law names birth itself a hostile act, the cleansing shall no longer require monsters.'],
        ['The First Successful Purge','A hidden enclave disappears and the operation is privately celebrated as clean.','A supernatural population center is destroyed before it can warn its allies.','The empty neighborhood is praised because no witness remains to contradict the report.','When the first silence is called victory, every hidden nation shall prepare to answer in daylight.'],
        ['The Answer in Daylight','Rival supernatural factions begin sharing intelligence against human hunters.','The hidden world forms a united defense and deliberately abandons secrecy.','Ancient enemies exchange maps because the same executioner has learned both their names.','When the hunted stand together beneath the cameras, the secret world shall become a public army.'],
        ['The Wall Becomes the Gate','Fear produces spontaneous magical effects and transformations among civilians and soldiers.','Counterstrike and retaliation make magic an accepted fact and awaken metahumanity during extermination.','Those guarding the wall awaken on both sides of it and no uniform can explain the change.','When humanity fires upon the impossible, the impossible shall answer from inside humanity.']
      ]
    },
    {
      name:'The Rite of Returning Names', category:'Ritual',
      overarching:[
        'When the forgotten are named by mouths that never knew them, the lost age shall hear itself remembered and turn toward home. Six names will form the invitation; the seventh will be humanity, spoken without consent.',
        'The crown, root, chalice, road, grave, and star shall surrender the syllables they were sworn to hide. Those who call only their ancestors will awaken every inheritance.',
        'A ritual built for one people shall find the whole world listening. At the sixth returning, every dormant shape of humanity will answer, and no priest will possess enough names to send them back.'
      ],
      stages:[
        ['The Recovery of the First Name','A forbidden true-name fragment appears in an unrelated archive or shared dream.','The initiating faction reconstructs a complete ancestral name whose use causes repeatable change.','A syllable without language is found in three records that were never allowed to meet.','When the forgotten name changes flesh on command, the first ancestor shall know the road home.'],
        ['The Gathering of Correspondences','Relics and sacred sites from separate traditions begin resonating together.','Six required relics, sites, bloodlines, or offices fall under one ritual authority.','The crown answers the root, the chalice answers the grave, and distance ceases to keep them apart.','When six separated keys turn beneath one hand, the world itself shall become the seventh lock.'],
        ['The Choir Without Knowledge','People repeat ritual phrases through entertainment, prayer, software, or commerce without knowing it.','A global population becomes an active ritual component without informed consent.','Millions speak the harmless phrase and surrender a breath they do not remember giving.','When the choir can continue after every priest is dead, ignorance shall complete the invocation.'],
        ['The Return of the Intended','Chosen descendants manifest controlled traits or one lost spirit ecology briefly reappears.','The targeted ancestors, patron, people, or territory return in stable form.','The first child bears the promised eyes and the faithful declare the old blood restored.','When the intended dead walk securely beneath the sun, the keepers shall remove the safeguards.'],
        ['The Answer of Every Bloodline','Unrelated families display transformations excluded from the ritual design.','Dormant metahuman patterns activate across multiple human populations.','Children outside the covenant speak the returning names and wake in unfamiliar bodies.','When every bloodline answers an invitation meant for one, goblinization shall outrun classification.'],
        ['The Name That Cannot Be Withdrawn','Attempts to reverse the rite awaken additional spirits, forms, or replacement sites.','Humanity itself becomes the final name and the return becomes a permanent law of reality.','Each erased letter reappears in another mouth, and each broken altar moves into an ordinary home.','When the species is spoken as one true name, no priest shall remain outside the ritual to end it.']
      ]
    },
    {
      name:'The Consensus Recognition Cascade', category:'Ignorance',
      overarching:[
        'When a billion witnesses agree upon the impossible, the impossible will no longer require permission. Six proofs shall pass from hand to hand; on the seventh morning every mirror will show the world people expect to see.',
        'The secret will not be revealed by wisdom but by repetition. A child, camera, corpse, machine, crowd, and lie shall confirm the same forbidden fact until belief begins commanding reality.',
        'Beware the evidence that survives every explanation. Every denial will sharpen it, every erasure multiply it, and strangers shall reproduce the miracle at home.'
      ],
      stages:[
        ['The Unignorable Incident','A supernatural event is clearly recorded by unrelated witnesses or involves a public figure.','One incident survives professional forensic review and becomes a global reference point.','The image remains when every copy is destroyed, and strangers remember angles no camera held.','When the impossible survives the laboratories of its enemies, the world shall give it a name.'],
        ['The Failure of Explanations','Official explanations contradict observable details and censorship creates more copies.','Scientific, religious, and governmental authorities publicly reject the same cover story.','Every denial answers a different question, yet all point toward the same forbidden truth.','When censorship itself is accepted as evidence, concealment shall become revelation.'],
        ['The Reproducible Wonder','Ordinary people repeat a minor effect using leaked instructions or consumer devices.','A supernatural effect becomes reproducible by millions under ordinary conditions.','The miracle leaves the temple and appears on kitchen tables beneath untrained hands.','When strangers can repeat the wonder without permission, belief shall no longer require witnesses.'],
        ['The Shared Vocabulary','Unrelated cultures adopt common names and emergency terms for supernatural phenomena.','A global practical language for magic and metahumanity enters ordinary use.','Children in distant cities invent the same word for what stands behind the glass.','When the impossible is taught in schools and dispatched by emergency services, consensus shall begin reinforcing it.'],
        ['The Expectation Effect','Legends and local fears begin shaping anomalies around places associated with them.','Communities generate stable magical rules simply by expecting them.','The haunted road becomes haunted only after the map marks it so, yet the dead arrive on schedule.','When expectation writes local law, neighboring cities shall inhabit different realities beneath one sky.'],
        ['Belief Becomes Permission','Spirits and metahuman traits appear first where public expectation is strongest.','Collective recognition permanently rewrites the consensus boundary.','The named thing no longer weakens when doubted, for enough mouths have taught it how to remain.','When observation sustains the hidden world, no censor shall possess enough darkness to close it again.']
      ]
    },
    {
      name:'The Mana Reservoir Rupture', category:'Accumulation of Power',
      overarching:[
        'The world has swallowed every delayed dawn and called the silence safety. Beneath six locks the unused morning grows teeth; when one keeper sells the key and another refuses the valve, the Sixth World shall arrive through every wound at once.',
        'Count not the years gained but the power denied release. Every sealed caern, dream, grave, gate, and blood-debt fills the same hidden sea until the smallest cracked vessel becomes an ocean.',
        'What Charles diverted was not destroyed, and what the factions hoarded was never owned. When six reservoirs answer beneath the skin of the world, every sleeping form shall rise with the pressure.'
      ],
      stages:[
        ['The Rising Measure','Instruments disagree as magical pressure exceeds their scales and vents recharge too quickly.','Independent measurements confirm planetary accumulation beyond existing containment capacity.','The gauges quarrel because none were built to number the weight beneath them.','When every instrument fails in the same direction, denial shall become a measurement of its own.'],
        ['The Market of Scarcity','Factions trade access to vents, sacred sites, and dream channels while creating artificial shortages.','A cartel or sovereign controls several of the safest relief systems.','The keepers sell cups from a rising sea and call the shortage proof of ownership.','When relief is withheld for leverage, pressure shall learn the shape of the market.'],
        ['The Silencing of Valves','One relief site fails suspiciously and technicians disappear after reporting incompatible controls.','Three major release systems are sabotaged, captured, or deliberately closed.','The first valve closes without command and the engineer’s name is removed from the schedule.','When three mouths of the buried sea are sewn shut, every weaker wound shall begin to speak.'],
        ['The Weaponization Attempt','A faction tests a device that concentrates stored mana toward a target.','Accumulated pressure is transferred into a weapon or ascension engine linking reservoirs together.','A cup of the hidden sea is poured upon an enemy and the victors demand a larger vessel.','When pressure is taught to march as a weapon, every reservoir shall hear the order.'],
        ['The First Rupture','A local breach causes temporary goblinization, spirit weather, or awakened wildlife.','A primary reservoir fails and cannot be resealed by its original mechanism.','For one night the forest remembers beasts not born for this age, and some do not leave at dawn.','When the first great vessel breaks, every connected seal shall inherit its fracture.'],
        ['The World Finds Every Wound','Unknown fault lines, graves, dreams, and sacred places begin venting together.','The linked reservoir network ruptures globally and Awakening becomes the new equilibrium.','Power rises through places no keeper recorded, choosing wounds older than every map.','When the hidden sea reaches every shore, transformation shall become the only remaining release valve.']
      ]
    },
    {
      name:'The Sovereign Ascension', category:'Accumulation of Power',
      overarching:[
        'When one crown gathers every road, every name, and every hunger, the world will remember that no single hand was meant to close around it. Six rivals shall submit, and reality shall awaken a thousand heirs rather than accept one eternal sovereign.',
        'The victor will mistake silence for consent. Contracts will become borders, worship weather, memory taxation; at the sixth submission the throne shall touch the machinery of the world.',
        'Beware the power that wins without revealing the war. It shall own the gate, archive, city, dream, grave, and witness until Awakening becomes reality’s act of rebellion.'
      ],
      stages:[
        ['The Acquisition of Leverage','One faction quietly acquires unrelated supernatural assets, contracts, relics, and territories.','It controls a decisive asset in every major supernatural sphere.','Six owners discover that the same unseen creditor holds all their debts.','When one hand can punish court, pack, spirit, state, and market alike, leverage shall become sovereignty.'],
        ['The Reduction of Rivals','Independent powers accept protection, debt, merger, or temporary dependency.','Several sovereign factions accept vassalage and few credible counter-powers remain.','The proud kneel only for a season, yet the season’s calendar belongs to their protector.','When rivals survive only by permission, independence shall become ceremonial.'],
        ['The Capture of Institutions','Governments and corporations unknowingly enforce supernatural contracts and hidden authority.','State, corporate, and occult institutions fall under durable common control.','The mortal clerk stamps an ancient oath without seeing the second signature.','When human law and hidden obligation issue the same command, the throne shall no longer require a palace.'],
        ['The Ownership of Memory','Records rewrite themselves and witnesses remember the ascending power as older than it is.','Collective history presents one sovereign order as inevitable and opposition becomes difficult to imagine.','The archive loses every rival name except in margins no reader remembers writing.','When history can describe no world before the crown, rebellion shall appear to be madness.'],
        ['The Sixth Submission','The final independent rival is isolated or offered impossible terms while coronation is prepared.','The last necessary counter-power kneels, vanishes, or is formally absorbed.','The final chair remains empty at the council because every road to it has been purchased.','When the sixth rival submits, reality shall recognize a monopoly no treaty can balance.'],
        ['Reality Creates Opposition','Dormant bloodlines and spirits awaken where the sovereign’s control is strongest.','Metahumanity and supernatural diversity erupt worldwide as automatic counterweights.','Children of conquered houses awaken bearing gifts their ancestors never possessed.','When nothing remains outside the crown, the world shall manufacture outsiders from every sleeping bloodline.']
      ]
    }
  ];

  const FACTIONS=[
    'a high fae court','a blood-sovereign coalition','a Gaian spirit confederacy','a corrupted shapechanger alliance','a multinational hunter directorate','an elder cult network','a dream-market cartel','a mortal occult corporation','a state intelligence compact','a disputed Blacklight splinter operation'
  ];
  const SOURCES={
    Fae:['the Thorn Calendar stolen from the Uncrowned Court','an oath-mirror deposition taken from a winter herald','the final page of an unsigned treaty Charles removed before negotiation'],
    Gaian:['testimony purchased from a wounded city-spirit','the antlered keeper’s last molt recovered from an abandoned caern','a root chorus intercepted beneath six watersheds'],
    Blood:['the sealed testament of an oracle remembering unborn descendants','a six-lineage chalice script stolen during a succession','the confession of a sovereign executed before recorded history'],
    Dream:['a recurring dream deleted by unrelated sleep clinics','the composite record of a one-minute global nightmare','pre-event drawings removed from a sealed welfare file'],
    'Dead Reality':['a final warning recovered from an Earth without humanity','the last broadcast of a world consumed by its Awakening','an ecological memory extracted from a pristine post-human Earth'],
    Charles:['a reconstruction assembled from contradictory stolen auguries','a continuity model built from six impossible futures','margin notes recovered from a Charles instance that attempted to erase itself']
  };
  const ACQUISITIONS=[
    'Charles acquired the source through a theft conducted while its custodians believed the archive remained sealed.',
    'The source was purchased under a contract whose payment has been redacted from the mounted copy.',
    'Blacklight intercepted the record during an unrelated operation and retained it without notifying the original owner.',
    'The record was recovered from a dead or inaccessible reality and has no surviving claimant.',
    'Charles reconstructed the custody copy from damaged fragments held by mutually hostile factions.'
  ];

  const byId=id=>document.getElementById(id);
  const controls={trigger:byId('prophecy-trigger'),source:byId('prophecy-source'),faction:byId('prophecy-faction'),clarity:byId('prophecy-clarity'),seed:byId('prophecy-seed')};
  const output=byId('prophecy-output'),status=byId('prophecy-status'),copyButton=byId('prophecy-copy');
  let currentText='';

  function hash(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let x=hash(seed)||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
  function pick(random,list){return list[Math.floor(random()*list.length)]}
  function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function makeSeed(){return 'BAP-'+Date.now().toString(36).toUpperCase()+'-'+Math.floor(Math.random()*1679616).toString(36).padStart(4,'0').toUpperCase()}

  function interpretations(kind,stage,record){
    const event=kind==='minor'?stage.minorEvent:stage.majorEvent;
    const threshold=kind==='minor'?'This is an omen, not completion. Charles would open surveillance and seek a second unrelated confirmation.':'This is the completion threshold. Charles would mark the stage fulfilled unless evidence shows a structurally equivalent false flag.';
    return[
      `Charles reading: ${threshold} The most direct correspondence is ${event.toLowerCase()}`,
      `Source-tradition reading: the language may describe an office, territory, bloodline, technology, or institution rather than one literal person or object.`,
      `Red-team dissent: ${record.faction} may be staging this correspondence to redirect Blacklight attention or force an intervention that advances a different stage.`
    ];
  }

  function buildRecord(index,seed){
    const random=rng(`${seed}|${index}`),trigger=TRIGGERS[index];
    const sourceType=controls.source.value==='random'?pick(random,Object.keys(SOURCES)):controls.source.value;
    const faction=controls.faction.value==='random'?pick(random,FACTIONS):controls.faction.value;
    const clarity=controls.clarity.value==='random'?pick(random,['Veiled','Balanced','Direct']):controls.clarity.value;
    const stages=trigger.stages.map((s,i)=>{
      const stage={number:i+1,title:s[0],minorEvent:s[1],majorEvent:s[2],minorProphecy:s[3],majorProphecy:s[4]};
      stage.minorInterpretations=interpretations('minor',stage,{faction});
      stage.majorInterpretations=interpretations('major',stage,{faction});
      return stage;
    });
    return{
      index,trigger,seed,sourceType,faction,clarity,
      source:pick(random,SOURCES[sourceType]),
      acquisition:pick(random,ACQUISITIONS),
      overarching:pick(random,trigger.overarching),
      stages,
      id:`BAP-${index+1}-${hash(`${seed}|${index}`).toString(16).toUpperCase().padStart(8,'0')}`
    };
  }

  function eventPanel(type,stage,record){
    const minor=type==='minor',prophecy=minor?stage.minorProphecy:stage.majorProphecy,event=minor?stage.minorEvent:stage.majorEvent,readings=minor?stage.minorInterpretations:stage.majorInterpretations;
    return `<article class="event-fragment ${minor?'minor-fragment':'major-fragment'}"><div class="fragment-heading"><span>${minor?'MINOR OMEN':'MAJOR THRESHOLD'}</span><strong>${minor?'Trigger warning':'Completion condition'}</strong></div><blockquote>${esc(prophecy)}</blockquote><div class="event-correspondence"><span>Recovered event correspondence</span><p>${esc(event)}</p></div><details class="interpretation-drawer"><summary>Open ${readings.length} interpretations</summary><ol>${readings.map(r=>`<li>${esc(r)}</li>`).join('')}</ol></details></article>`;
  }

  function renderRecord(record,open){
    return `<details class="prophecy-record" ${open?'open':''}><summary><span>${esc(record.id)}</span><strong>${esc(record.trigger.name)}</strong><em>Suspected actor: ${esc(record.faction)}</em></summary><article class="prophecy-card"><div class="intel-grid"><div class="intel-field"><span>Primary source</span><p>${esc(record.source)}</p></div><div class="intel-field"><span>Acquisition</span><p>${esc(record.acquisition)}</p></div><div class="intel-field"><span>Suspected advancing faction</span><p>${esc(record.faction)}</p></div><div class="intel-field"><span>Charles analysis posture</span><p>${esc(record.clarity)}</p></div></div><div class="prophecy-major"><span>Major overarching prophecy</span><blockquote>${esc(record.overarching)}</blockquote></div><div class="stage-sequence">${record.stages.map(stage=>`<section class="stage-pair"><header><span>STAGE ${stage.number} OF 6</span><h3>${esc(stage.title)}</h3></header><div class="stage-pair-grid">${eventPanel('minor',stage,record)}${eventPanel('major',stage,record)}</div></section>`).join('')}</div></article></details>`;
  }

  function textRecord(record){
    const lines=[`BLACKLIGHT RECOVERED PROPHECY ${record.id}`,`Awakening trigger: ${record.trigger.name}`,`Suspected advancing faction: ${record.faction}`,`Primary source: ${record.source}`,`Acquisition: ${record.acquisition}`,`Analysis posture: ${record.clarity}`,'','MAJOR OVERARCHING PROPHECY',record.overarching];
    for(const stage of record.stages){
      lines.push('',`STAGE ${stage.number} OF 6 — ${stage.title}`,'MINOR OMEN PROPHECY',stage.minorProphecy,`Minor event: ${stage.minorEvent}`,'Minor interpretations:',...stage.minorInterpretations.map((x,i)=>`${i+1}. ${x}`),'MAJOR THRESHOLD PROPHECY',stage.majorProphecy,`Major event: ${stage.majorEvent}`,'Major interpretations:',...stage.majorInterpretations.map((x,i)=>`${i+1}. ${x}`));
    }
    return lines.join('\n');
  }

  function generate(all){
    const seed=controls.seed.value.trim()||makeSeed(); controls.seed.value=seed;
    let records;
    if(all)records=TRIGGERS.map((_,i)=>buildRecord(i,seed));
    else{
      const index=controls.trigger.value==='random'?Math.floor(rng(`${seed}|select`)()*TRIGGERS.length):Number(controls.trigger.value);
      records=[buildRecord(index,seed)];
    }
    output.innerHTML=records.map((r,i)=>renderRecord(r,i===0)).join('');
    currentText=records.map(textRecord).join('\n\n============================================================\n\n');
    copyButton.disabled=false;
    status.textContent=all?`Charles mounted six ordered prophecy files under reconstruction key ${seed}.`:`Charles mounted ${records[0].id}: six ordered minor/major stage pairs.`;
    output.scrollIntoView({behavior:'smooth',block:'start'});
  }

  byId('prophecy-generate').addEventListener('click',()=>generate(false));
  byId('prophecy-generate-six').addEventListener('click',()=>generate(true));
  copyButton.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(currentText);status.textContent='Ordered custody packet copied.'}catch(error){status.textContent='Clipboard access was blocked. Select the mounted file manually.'}});
})();
