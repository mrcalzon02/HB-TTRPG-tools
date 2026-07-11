(()=>{
  'use strict';

  const SOURCE_ARTIFACTS={
    Fae:[
      'The fever vision of a moth-crowned envoy who woke speaking in seven seasons at once',
      'A thorn-court oath recited by an antlered guest during a supper no mortal remembered attending',
      'The mirror testimony of a fae midwife who delivered an heir from tomorrow',
      'A changeling’s dream of the Orchard Court, dictated before every noun became a flower',
      'The parley-song of the White Animal, heard by three oathbreakers sleeping beneath the same tree',
      'A prophecy whispered through the teeth of a laughing river-spirit wearing a prince’s face',
      'The moonlit confession of a courtier whose shadow returned from a different century',
      'A briar-script vision spoken by a guest who vanished whenever thanked',
      'The rain-dream of the Uninvited Court, remembered by a child born under no recognized season',
      'A hospitality omen carried by silver moths from a feast held behind a locked human mirror',
      'The sleep-recitation of a horned herald found standing inside an unopened embassy door',
      'A fevered oath received by a mortal translator after drinking from the cup reserved for absent kings'
    ],
    Gaian:[
      'A territorial vision spoken through a dying wolf and remembered by every member of its scattered pack',
      'The root-dream of a city spirit forced through the mouth of an unconscious surveyor',
      'A caern prophecy carried by shapechangers during a shared moon-trance',
      'The antlered testimony of a forest guardian heard by hunters who entered as enemies and woke as witnesses',
      'A river-spirit’s warning translated from the drowning visions of six unrelated children',
      'The wound-song of the land received by a shapeshifter during an involuntary ancestral molt',
      'A prophecy migrating through birds, wolves, and human dreamers along the same poisoned watershed',
      'The fever vision of a city-bound spirit speaking through traffic lights, roots, and sleeping animals',
      'A bone-circle revelation witnessed by shapechangers whose bodies briefly remembered extinct forms',
      'The mountain’s dream carried down through a mad hermit who had forgotten every human language',
      'A spirit storm interpreted from the synchronized nightmares of an entire rural pack',
      'The last warning of a marsh guardian, spoken through reeds growing from a sleeping pilgrim’s hands'
    ],
    Blood:[
      'A blood-memory shared by seven descendants who dreamed themselves seated at the same ruined round table',
      'The grail vision of an exiled oracle whose lineage had been erased from every lawful genealogy',
      'A prophecy inherited through the wound of a knight who died before founding the house that remembers him',
      'The red dream of a cupbearer possessed by the memories of forty-nine disputed kings',
      'A heraldic vision received by an unacknowledged heir beneath the antlers of the White Stag',
      'The ancestral warning of a bloodline seer who spoke only while holding a sword that knew her true name',
      'A scarlet succession dream remembered simultaneously by rivals who denied sharing an ancestor',
      'The midnight revelation of a grail widow visited by the shades of every ruler her house betrayed',
      'A knightly prophecy sung by a mad minstrel whose verses changed with the listener’s lineage',
      'The blood-oracle testimony of a child who recognized strangers as descendants not yet born',
      'A dynasty’s buried memory awakened in a healer after tasting one drop from an ancient reliquary',
      'The final vision of a bastard prophet who saw every crown as a wound inherited by the realm'
    ],
    Dream:[
      'A collective nightmare shared by thousands of sleepers who woke drawing the same impossible room',
      'The recurring vision of a madwoman whose dreams began infecting strangers before they met her',
      'A false awakening recorded from patients who continued speaking after every body had woken',
      'The corridor dream of unrelated children who each recognized the same faceless guide',
      'A prophecy received through synchronized sleep paralysis across three cities',
      'The mirror-dream of a prisoner who escaped only in sleep and returned carrying other people’s memories',
      'A nightmare spoken by a comatose seer through every radio in the hospital at once',
      'The blue-room vision remembered by witnesses who insisted they had never slept',
      'A contagious dream purchased from a madman who could no longer distinguish tomorrow from childhood',
      'The sleep testimony of strangers who woke with identical soil beneath their fingernails',
      'A prophecy dreamed backward by a child who remembered the ending years before the first image',
      'The shared vision of an impossible city entered nightly by people scattered across the world'
    ],
    'Dead Reality':[
      'The ravings of the last occultist of a dead world, recorded while the empty city answered him',
      'A prophecy screamed by a blind survivor beneath a sun that continued shining after life ended',
      'The wall-written visions of a mad hermit who claimed the dead had begun dreaming through him',
      'A black-rain sermon delivered by an unknown lunatic after every named congregation member was dead',
      'The final nightmare of a survivor whose voice continued on the tape after his burial',
      'A dead-world vision scratched into hospital walls by patients who shared one impossible memory',
      'The confession of an occult refugee who arrived alone while speaking in the voices of an extinct city',
      'A warning dictated by a madwoman who believed the ruined sky was reading over her shoulder',
      'The ash prophecy of a tunnel seer who counted more survivors each time another person died',
      'A vision received by the final priest of a world whose gods had begun wearing human corpses',
      'The last testimony of a lunatic cartographer whose map added the reader’s location before being opened',
      'A dead-reality revelation whispered by something inside a survivor who no longer claimed to be human'
    ],
    Charles:[
      'The brass-tablet revelation of a possessed astrologer serving the Keepers of the Ninth Well',
      'A desert prophecy recited by a mad dervish beneath the star said to contain the dead god’s eye',
      'The vision of a tomb-scribe who woke with forty unfamiliar names carved beneath his tongue',
      'A forbidden revelation spoken through the oracle of the House of the Veiled Meridian',
      'The salt-desert dream of a caravan seer who traveled for seven nights without moving',
      'A prophecy dictated by the Sleepless Vizier while the sealed sepulcher breathed beneath him',
      'The revelation of a blind astronomer who heard the dead constellation pronounce the names of kings',
      'A cult vision received by the last lamp-keeper after the buried god began dreaming through the well',
      'The fever sermon of a tomb madman who mistook every living listener for an heir of the dead star',
      'A copper-leaf prophecy transcribed from the ravings of a pilgrim possessed at the Forty Doors',
      'The midnight recitation of a desert oracle whose shadow remained kneeling after she rose',
      'A vision carried from beyond reality by the Mouth of the Drowned Star and spoken through an unwilling scribe'
    ]
  };

  const ACQUISITIONS={
    Fae:[
      'Recovered from a mortal who survived a fae banquet and remembered the prophecy only while asleep.',
      'Carried across the Veil by a changeling whose reflection continued reciting after the body fell silent.',
      'Taken from an oathbound spirit during a parley in which every participant remembered a different season.',
      'Recorded from a fevered courtier who spoke in the voices of several fae guests at once.',
      'Copied from the dream of a human envoy after a night spent beneath an impossible moon.'
    ],
    Gaian:[
      'Received during a shared trance involving spirits, shapechangers, and animals across one wounded territory.',
      'Spoken through a possessed ranger while the surrounding forest altered its migration paths.',
      'Recovered from the ancestral visions of a shapechanger pack after an involuntary collective transformation.',
      'Translated from a river-spirit’s testimony carried through dreams, animal behavior, and root growth.',
      'Remembered by witnesses who slept within the same caern and woke bearing identical spirit marks.'
    ],
    Blood:[
      'Inherited as a shared blood-memory by descendants belonging to rival and supposedly unrelated houses.',
      'Recited by a bloodline oracle during a succession rite that ended with every claimant dreaming the same king.',
      'Recovered from the ancestral vision of an heir whose genealogy had been erased centuries earlier.',
      'Sung by a possessed minstrel whose prophecy changed according to the lineage of each listener.',
      'Remembered through a relic wound that opened simultaneously across several branches of one bloodline.'
    ],
    Dream:[
      'Compiled from the matching visions of sleepers who had no known contact with one another.',
      'Recorded during a contagious nightmare that crossed languages without changing its central images.',
      'Recovered from a seer whose dreams continued through strangers after the seer awoke.',
      'Spoken by patients during synchronized sleep paralysis in locations separated by thousands of miles.',
      'Remembered by witnesses who denied dreaming yet described the same impossible room.'
    ],
    'Dead Reality':[
      'Recovered from the ravings of an occult survivor who crossed from a reality with no remaining living population.',
      'Copied from a dead world where the final witnesses continued prophesying after their recorded deaths.',
      'Carried by a mad refugee whose visions contained streets, spirits, and disasters absent from this reality.',
      'Recorded from an occult lunatic who claimed the dead world itself was using his body as a warning.',
      'Recovered beside a dead-world seer whose last prophecy continued in several unfamiliar voices.'
    ],
    Charles:[
      'Taken from the visions of a possessed astrologer belonging to a forbidden sect of the buried gods.',
      'Copied from a cult oracle who received the revelation during forty nights beneath a sealed desert tomb.',
      'Recovered from the ravings of a pilgrim who returned from the salt wastes speaking for a dead star.',
      'Transcribed from a tomb-seer whose visions were attributed to a god dead before human history.',
      'Carried out of a hidden observatory by a mad scribe who believed the constellations were dictating scripture.'
    ]
  };

  const FORBIDDEN_SOURCE=/CHARLES\s+(?:DIRECTIVE|CONTINUITY|FORENSIC|INTERNAL)|BLACKLIGHT\s+(?:FORECAST|COUNTER-PROPHECY|MODEL)|CONTINUITY\s+(?:ENGINE|MODEL)|PREDICTIVE\s+FAILURE|DEAD\s+BRANCH\s+COMPARISON|machine-authored|human edits rejected|branch set|model output|machine prophecy/i;

  function hash(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function choose(seed,list){return list[hash(seed)%list.length]}
  function field(record,label){
    return [...record.querySelectorAll('.intel-field')].find(node=>node.querySelector('span')?.textContent.trim().toLowerCase()===label.toLowerCase())||null;
  }
  function inferFamily(record){
    if(record.dataset.sourceFamily)return record.dataset.sourceFamily;
    const primary=field(record,'Primary source')?.querySelector('p')?.textContent||'';
    if(/fae|thorn|oath|court|moth/i.test(primary))return 'Fae';
    if(/gaian|spirit|root|river|wolf|caern|shapechanger/i.test(primary))return 'Gaian';
    if(/blood|grail|lineage|stagg?|knight|herald/i.test(primary))return 'Blood';
    if(/dream|sleep|nightmare|mirror|corridor/i.test(primary))return 'Dream';
    if(/dead[- ]?reality|dead world|black rain|survivor|extinct/i.test(primary))return 'Dead Reality';
    if(/dead-god|buried star|ninth well|astrologer|sepulcher|forty doors|Charles continuity/i.test(primary))return 'Charles';
    const selected=document.getElementById('prophecy-source')?.value;
    return SOURCE_ARTIFACTS[selected]?selected:'Dream';
  }
  function cleanProphecyText(text){
    return text
      .replace(/^\s*(?:CHARLES DIRECTIVE FRAGMENT|CHARLES CONTINUITY RECONSTRUCTION|BLACKLIGHT FORECAST ASSEMBLY|CONTINUITY ENGINE OUTPUT|BLACK-LEVEL SYNTHESIS|CHARLES FORENSIC AUGURY|PREDICTIVE FAILURE REPORT|CONTINUITY MODEL DELTA|CHARLES INTERNAL WARNING|BLACKLIGHT COUNTER-PROPHECY|DEAD BRANCH COMPARISON)[^\n]*\n*/i,'')
      .replace(/machine-authored prophecy with human edits rejected/gi,'vision carried from beyond the waking world')
      .replace(/machine-authored/gi,'vision-born')
      .trim();
  }
  function processRecord(record){
    if(record.dataset.supernaturalOriginRevision==='1')return;
    const family=inferFamily(record);
    const id=record.querySelector(':scope > summary span')?.textContent.trim()||`${family}|prophecy`;
    const primary=field(record,'Primary source')?.querySelector('p');
    if(primary&&(FORBIDDEN_SOURCE.test(primary.textContent)||family==='Charles'&&!/astrologer|cult|tomb|star|well|sepulcher|oracle|scribe|pilgrim/i.test(primary.textContent))){
      primary.textContent=choose(`${id}|primary|${family}`,SOURCE_ARTIFACTS[family]);
    }
    const acquisition=field(record,'Acquisition')?.querySelector('p');
    if(acquisition)acquisition.textContent=choose(`${id}|acquisition|${family}`,ACQUISITIONS[family]);

    record.querySelectorAll('.prophecy-major blockquote,.event-fragment blockquote').forEach(node=>{
      node.textContent=cleanProphecyText(node.textContent);
    });
    record.querySelectorAll('.fragment-heading strong').forEach(node=>{
      if(FORBIDDEN_SOURCE.test(node.textContent))node.textContent=choose(`${id}|heading|${family}`,SOURCE_ARTIFACTS[family]);
    });
    record.dataset.supernaturalOriginRevision='1';
  }

  const option=document.querySelector('#prophecy-source option[value="Charles"]');
  if(option)option.textContent='Dead-god cult scripture';

  const output=document.getElementById('prophecy-output');
  if(!output)return;
  let queued=false;
  function process(){output.querySelectorAll('.prophecy-record').forEach(processRecord)}
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;process()}))))));
  }
  new MutationObserver(schedule).observe(output,{childList:true,subtree:true});
  schedule();
})();
