(()=>{
  'use strict';

  const CORE_URL='blacklight-awakening-prophecy-generator.js?v=20260714-provenance-core';
  const normalizeEventName=name=>name==='Gifts of Conquered Houses'?'The Gifts of Conquered Houses':name;
  const REPLACEMENT=`  function interpretations(record,stage,event,kind,seed){
    const archive=globalThis.BlacklightAwakeningInterpretations;
    if(!archive||typeof archive.resolve!=='function')throw new Error('The bespoke prophecy interpretation archive is unavailable.');
    const archiveEvent=event.name==='Gifts of Conquered Houses'?{...event,name:'The Gifts of Conquered Houses'}:event;
    const readings=archive.resolve({record,stage,event:archiveEvent,kind,seed,prophecy:event.composedProphecy||event.poem||''});
    if(!Array.isArray(readings)||readings.length!==5||new Set(readings).size!==5)throw new Error(\`Invalid bespoke interpretations for \${event.name}.\`);
    return readings;
  }`;

  const PROVENANCE_HELPERS=`
  const PROVENANCE_BANK={
    Fae:{
      witnesses:['Lady Ysabet Vale, the Half-Mad Seer of Midsummer','Edrin Pell, mortal attaché to the Orchard Court','The changeling called Nine-Windows','Sir Caul of the Unfinished Invitation','Mara Vey, interpreter of the Blue Supper','The oathbound radio operator known as Finch'],
      roles:['human seer held under fae hospitality','mortal court attaché whose service record exists in three incompatible seasons','changeling courier returned without a legally continuous identity','fae herald speaking through a borrowed human name','survivor of an oath-feast whose testimony changes with moon phase','field operator receiving transmissions from across a sealed threshold'],
      media:['a hand-bound diary whose ink becomes dew at sunrise','a shortwave radio log transmitted on a frequency assigned to no mortal service','a phonograph cylinder recorded during an empty diplomatic reception','a bundle of invitation cards written on pressed moth wings','a mirrored deposition visible only when read backward','a wax-sealed guest ledger that adds names after each reading'],
      origins:['the Blue Supper beneath the municipal conservatory','the Orchard Court embassy that occupied a building for one night','a moonlit parley site outside mapped jurisdiction','the seasonless guest wing of an abandoned hotel','a thorn gate recovered beneath a children’s hospital','a roadside radio station broadcasting from the wrong side of the Veil'],
      custody:['surrendered as payment for terminating an inherited invitation','removed from a banquet table after every guest vanished between photographs','delivered by a fae courier who denied having arrived','recorded during a controlled parley and seized when the transmitter began answering itself','recovered from a changeling safehouse after the mirrors requested asylum','obtained through an oath exchange whose final clause remains classified']
    },
    Blood:{
      witnesses:['Dame Elowen Marr, Grail Widow of House Veyr','Tomas Rook, the Last Cupbearer','Alaric Sen, unacknowledged heir of the Black Hart line','Sister Maude Ferren, keeper of the Empty Round Table','Joren Vale, minstrel of the Nine Chalices','Dr. Selene Arcos, forensic genealogist and unwilling oracle'],
      roles:['blood-oracle whose visions are inherited by unrelated descendants','disgraced cupbearer carrying the memory of a dead court','unregistered heir identified by a relic wound','genealogical archivist serving three mutually hostile houses','possessed court musician whose verses alter by listener lineage','mortal specialist exposed to a blood-memory cascade'],
      media:['a red leather succession diary written in several generations of the same hand','a battlefield chaplain’s reel-to-reel confession','a silver cup engraved from the inside with a complete testimony','a family Bible whose genealogy continues onto blank pages','a scar-tissue rubbing taken from a relic wound','a minstrel’s score annotated in blood that is not genetically consistent'],
      origins:['the sealed chapel of House Veyr','the Empty Round Table beneath the old courthouse','a ruined estate outside the recognized blood territories','the infirmary of the Ninth Succession Conclave','the crypt archive of the White Stag line','a neutral genealogy laboratory dismantled after one night'],
      custody:['inherited by three rival houses and surrendered only after all three dreamed the same funeral','removed from a reliquary during a disputed succession audit','dictated during surgery by a patient whose ancestral memories remained conscious','purchased from an estate sale conducted under a false family name','confiscated after a court recital caused every heir present to develop the same wound','copied during a bloodline mediation before the original document rejected its owner']
    },
    Gaian:{
      witnesses:['Asha Grey-River, antlered pack speaker','Daniel Rusk, ranger assigned to the poisoned watershed','Old Tomaq, the Half-Mad Seer of Six Rivers','The city spirit calling itself Mercy Under Concrete','Nell Harrow, survivor of the extinct-form caern','Dr. Imani Vale, ecological thaumaturgist'],
      roles:['shapechanger interpreter for a wounded territory','mortal ranger possessed during a migration failure','hermit whose speech is synchronized with regional animal behavior','urban spirit communicating through municipal infrastructure','caern survivor bearing memories of extinct bodies','field scientist translating spirit testimony into ecological records'],
      media:['a ranger diary packed with root impressions instead of handwriting','a wildlife-band radio log answered by voices beneath the river','a bark-scroll grown around a human rib','a hospital maintenance report rewritten by roots overnight','a collection of children’s drawings made during one shared fever','a migration map whose ink moves with living animals'],
      origins:['the poisoned watershed below Saint Orison Hospital','the antlered pack’s caern beneath the ring road','a marsh sanctuary erased from municipal maps','the glacier cave known as the Second Lung','the abandoned ranger station at Six Rivers','a city-spirit chamber discovered inside a storm-drain junction'],
      custody:['recorded during a shared trance involving animals across six jurisdictions','recovered from a ranger station after every local species migrated in one direction','translated from root growth that repeated the same warning through concrete floors','provided by a pack elder in exchange for removal of industrial waste from a sacred site','collected from sleeping children who woke with identical mud beneath their nails','removed from a caern after the territory itself expelled all witnesses']
    },
    Dream:{
      witnesses:['Nadia Kells, index patient of the Blue Room','Jonah Pike, sleep technician who never entered REM','The unborn child catalogued as Patient Eleven','Professor Mireya Sol, oneiric epidemiologist','The sleeper identified only as Apartment 4C','A collective witness consisting of 11,204 unrelated dreamers'],
      roles:['contagious-dream index patient','sleep-lab technician whose recordings continue after waking','prenatal witness appearing in dreams before birth','researcher mapping cross-linguistic nightmare transmission','missing civilian preserved only in other people’s sleep','distributed witness with no single legal identity'],
      media:['a sleep-study audio log containing a second room microphone no one installed','a bedside diary written each morning before the dreamer woke','a corrupted hospital EEG printout that forms legible sentences','a packet of anonymous letters describing the same impossible hallway','a voicemail archive recorded by sleeping callers','a child’s crayon map of a city block that disappeared from waking memory'],
      origins:['the Blue Room sleep clinic','the commercial dream trial designated SOMNUS-8','an apartment building removed from every street directory','eleven hospitals reporting synchronized sleep paralysis','the Corridor Dream shared across four continents','a neonatal ward whose cameras recorded sleepers facing the same wall'],
      custody:['compiled from matching testimony by sleepers with no known contact','extracted from a sleep server after the deleted files began restoring themselves','provided by a patient who denied dreaming while accurately describing every other witness','recovered from voicemail systems that received calls from sleeping phones','assembled from sealed medical records altered by the same unknown editor','recorded during a mass false awakening and secured before the witnesses forgot one another']
    },
    'Dead Reality':{
      witnesses:['Ivo Senn, last occultist of Earth-Black-Salt','The Ninth Survivor, who consistently counts twelve','Dr. Mara Quell, final physician of Saint Nobody Hospital','The blind cartographer beneath the living sun','A woman whose thoughts identified themselves as food','The extinct city of Orison speaking through one starving refugee'],
      roles:['cross-reality refugee and self-proclaimed final occultist','survivor whose identity count changes between interviews','physician recorded after her documented death','cartographer mapping districts that never existed here','human witness undergoing progressive memory predation','nonhuman civic intelligence using a survivor as a mouth'],
      media:['a grease-stained diary recovered with half its pages still screaming','a scrap of paper torn from a dead dimension and written after its author’s death','an emergency radio log from a city with no corresponding frequency plan','a hospital chart continuing beyond the extinction date','an ash-map drawn on the inside of a sealed body bag','a tunnel wall section removed because the writing migrated toward the exit'],
      origins:['Earth-Black-Salt, population recorded as zero','Saint Nobody Hospital beneath a sun that opens inward','the dead coastal city designated Reality Null-17','a refugee tunnel connecting to no surviving world','the ash district of an extinct capital','a dimensional breach found behind a sealed casualty wall'],
      custody:['carried through a breach by a starving refugee whose footprints arrived first','cut from a tunnel wall after the dead world began revising the message','recorded from an emergency channel broadcasting several years after local extinction','removed from the hands of a corpse that continued writing during transport','recovered beside a seer whose final words persisted in unfamiliar voices','obtained during a six-minute aperture into a reality with no detectable living population']
    },
    Cult:{
      witnesses:['Vizier Samir al-Khet, Sleepless Keeper of the Ninth Well','Ilyra Morn, unwilling scribe of the Veiled Meridian','Brother Cael, pilgrim returned from the salt waste','The Mouth of the Drowned Star','Astronomer Hessa Venn, blind recorder of the dead constellation','Lamp-Keeper Oran, final custodian of the Forty Doors'],
      roles:['possessed astrologer of a prohibited dead-god sect','scribe compelled to record dictation from a sealed tomb','pilgrim carrying a voice older than human burial practice','ritual office speaking through successive human vessels','blind astronomer interpreting a constellation absent from modern sky surveys','custodian of a sanctuary destroyed before his birth'],
      media:['a saffron-and-ash diary stitched with copper wire','a field radio log recorded beneath forty metres of sealed stone','a brass tablet covered in annotations made by different centuries','a pilgrim’s scrap-book filled with maps of a buried observatory','a copper-leaf scripture that warms when read aloud','an astronomical plate showing a dead star casting a shadow'],
      origins:['the sealed observatory beneath the western salt waste','the Ninth Well sanctuary','the House of the Veiled Meridian','a caravanserai abandoned before the current road existed','the tomb complex of the Forty Doors','a desert excavation whose workers all remembered a different god'],
      custody:['smuggled from a hidden observatory by an unwilling scribe','taken from a possessed astrologer during a forty-night vigil','recovered from a pilgrim who returned speaking in several extinct liturgical dialects','removed from a sealed tomb after the locks opened inward','acquired during a raid on a sect that had officially vanished generations earlier','copied from a brass tablet before the original resumed dictating new verses']
    }
  };

  const ARCHIVE_OPERATIONS=['OPERATION LANTERN MOTH','OPERATION QUIET GRAIL','OPERATION ROOTGLASS','OPERATION BLUE SLEEP','OPERATION BLACK SALT','OPERATION NINTH LAMP','OPERATION EMPTY CHAIR','OPERATION WRONG SUN'];
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function shuffleDeterministic(seed,list){const random=rng(seed);const copy=[...list];for(let index=copy.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}
  function anchorFirst(list,value){if(!value)return list;return [value,...list.filter(item=>item!==value)];}
  function archiveDate(seed,minYear,maxYear){const random=rng(seed);const year=minYear+Math.floor(random()*(maxYear-minYear+1));const month=Math.floor(random()*12);const day=1+Math.floor(random()*28);return \`\${day} \${MONTHS[month]} \${year}\`;}
  function sourceDate(source,seed){const ordinary=archiveDate(\`\${seed}|ordinary\`,1710,2025);const frames={
    Fae:[\`Witness date: \${ordinary}; oath-law date recorded as “the winter after next.”\`,\`First mortal transcription: \${ordinary}; the source insists the statement was made tomorrow.\`],
    Blood:[\`Oldest verifiable copy: \${ordinary}; internal lineage references place the vision three generations earlier.\`,\`Recorded during the succession sitting of \${ordinary}; portions appear in older family hands.\`],
    Gaian:[\`First coordinated field observation: \${ordinary}; animal indicators began eleven days earlier.\`,\`Territorial transmission logged \${ordinary}; tree-ring evidence suggests prior recurrences.\`],
    Dream:[\`First synchronized recording: \${ordinary}, 03:17 local time across all reporting sites.\`,\`Index awakening: \${ordinary}; some witnesses remember the dream from childhood.\`],
    'Dead Reality':[\`Local inscription date: \${archiveDate(\`\${seed}|dead\`,1998,2064)}; archive intake chronology cannot reconcile it with the extinction record.\`,\`Recovered timestamp: \${archiveDate(\`\${seed}|dead-two\`,2001,2059)} from a world whose civic calendar ended earlier.\`],
    Cult:[\`Material dating estimate: \${ordinary}; the cult colophon assigns it to the forty-ninth year of a dead king.\`,\`Modern transcription completed \${ordinary}; tablet weathering indicates a substantially older original.\`]
  };return pick(rng(\`\${seed}|date-frame\`),frames[source]);}
  function subjectLine(record){const frames={
    Fae:\`A courtly warning concerning \${record.trigger.name}, encoded as hospitality, seasonal jurisdiction, and inherited obligation.\`,
    Blood:\`A dynastic prophecy concerning \${record.trigger.name}, framed through succession, legitimacy, wounds, and inherited command.\`,
    Gaian:\`A territorial warning concerning \${record.trigger.name}, expressed through ecosystem behavior, spirit injury, and bodily transformation.\`,
    Dream:\`A recurring consensus dream concerning \${record.trigger.name}, reconstructed from shared architecture, repetition, and synchronized waking evidence.\`,
    'Dead Reality':\`A survivor account alleging that \${record.trigger.name} destroyed or transformed another reality before this record crossed into ours.\`,
    Cult:\`A dead-god revelation concerning \${record.trigger.name}, preserved as ritual scripture, astronomical omen, and jurisdictional parable.\`
  };return frames[record.source];}
  function buildProvenance(record,random){
    const bank=PROVENANCE_BANK[record.source];
    const sourceName=pick(random,bank.witnesses);
    const sourceRole=pick(random,bank.roles);
    const medium=pick(random,bank.media);
    const origin=pick(random,bank.origins);
    const custody=pick(random,bank.custody);
    const artifact=pick(random,SOURCES[record.source].artifacts);
    const operation=pick(random,ARCHIVE_OPERATIONS);
    const intakeDate=archiveDate(\`\${record.seed}|\${record.triggerIndex}|intake\`,2006,2026);
    return {
      recordTitle:\`\${artifact} // \${sourceName}\`,
      sourceName,
      sourceRole,
      sourceFamily:SOURCES[record.source].label,
      recordedDate:sourceDate(record.source,\`\${record.seed}|\${record.triggerIndex}|recorded\`),
      origin,
      medium,
      howObtained:\`\${custody} Entered Blacklight custody under \${operation} on \${intakeDate}.\`,
      subject:subjectLine(record),
      custodyNote:\`Custody chain \${record.id}-P remains \${record.posture.toLowerCase()} confidence; attribution and suspected actor are maintained as separate judgments.\`
    };
  }
  function buildDistinctPlans(seed,indices){
    const selectedSource=selectedValue('prophecy-source');
    const selectedFaction=selectedValue('prophecy-faction');
    const sources=anchorFirst(shuffleDeterministic(\`\${seed}|six-source-plan\`,Object.keys(SOURCES)),selectedSource);
    const factions=anchorFirst(shuffleDeterministic(\`\${seed}|six-faction-plan\`,FACTIONS),selectedFaction);
    return indices.map((_,position)=>({source:sources[position],faction:factions[position]}));
  }
`;

  const RENDER_REPLACEMENT=`  function renderRecord(record,open){const provenance=record.provenance;return \`<details class="prophecy-record" \${open?'open':''}><summary><span>\${esc(record.id)}</span><strong>\${esc(record.trigger.name)}</strong><em>\${esc(provenance.medium)} · \${esc(provenance.sourceName)} · \${esc(provenance.recordedDate)}</em></summary><article class="prophecy-card"><div class="intel-grid"><div class="intel-field"><span>Recovered record</span><p>\${esc(provenance.recordTitle)}</p></div><div class="intel-field"><span>Attributed author / witness</span><p>\${esc(provenance.sourceName)} — \${esc(provenance.sourceRole)}</p></div><div class="intel-field"><span>Creation / transmission date</span><p>\${esc(provenance.recordedDate)}</p></div><div class="intel-field"><span>Point of origin</span><p>\${esc(provenance.origin)}</p></div><div class="intel-field"><span>Physical or transmitted medium</span><p>\${esc(provenance.medium)}</p></div><div class="intel-field"><span>How Blacklight obtained it</span><p>\${esc(provenance.howObtained)}</p></div><div class="intel-field"><span>Prophecy subject</span><p>\${esc(provenance.subject)}</p></div><div class="intel-field"><span>Recovered source family</span><p>\${esc(provenance.sourceFamily)}</p></div><div class="intel-field"><span>Suspected advancing faction</span><p>\${esc(record.faction)}</p></div><div class="intel-field"><span>Interpretive posture</span><p>\${esc(record.posture)}</p></div><div class="intel-field"><span>Custody assessment</span><p>\${esc(provenance.custodyNote)}</p></div></div><div class="prophecy-major"><span>Major overarching prophecy</span><blockquote>\${esc(record.overarching)}</blockquote></div><div class="stage-sequence">\${record.stages.map(stage=>\`<section class="stage-pair"><header><span>STAGE \${stage.number} OF 6</span><h3>\${esc(stage.title)}</h3></header><div class="stage-pair-grid">\${eventPanel('Minor',stage.minor)}\${eventPanel('Major',stage.major)}</div></section>\`).join('')}</div></article></details>\`;}`;

  const TEXT_REPLACEMENT=`  function textRecord(record){const provenance=record.provenance;const lines=[\`BLACKLIGHT RECOVERED PROPHECY \${record.id}\`,\`Awakening trigger: \${record.trigger.name}\`,\`Recovered record: \${provenance.recordTitle}\`,\`Attributed author / witness: \${provenance.sourceName} — \${provenance.sourceRole}\`,\`Creation / transmission date: \${provenance.recordedDate}\`,\`Point of origin: \${provenance.origin}\`,\`Medium: \${provenance.medium}\`,\`How Blacklight obtained it: \${provenance.howObtained}\`,\`Prophecy subject: \${provenance.subject}\`,\`Recovered source family: \${provenance.sourceFamily}\`,\`Suspected advancing faction: \${record.faction}\`,\`Interpretive posture: \${record.posture}\`,\`Custody assessment: \${provenance.custodyNote}\`,'','MAJOR OVERARCHING PROPHECY',record.overarching];record.stages.forEach(stage=>{lines.push('',\`STAGE \${stage.number} OF 6 — \${stage.title}\`);for(const [kind,event] of [['MINOR',stage.minor],['MAJOR',stage.major]]){lines.push(\`\${kind} EVENT — \${event.title}\`,'Event Trigger',event.prophecy,'Event Correspondence',event.correspondence,\`\${kind} INTERPRETATIONS\`,...event.interpretations.map((item,index)=>\`\${index+1}. \${item}\`));}});return lines.join('\\n');}`;

  function fail(error){
    console.error('[Blacklight Prophecy Archive]',error);
    const status=document.getElementById('prophecy-status');
    const output=document.getElementById('prophecy-output');
    if(status)status.textContent='The prophecy generator could not initialize its event-specific interpretation or provenance archive.';
    if(output)output.innerHTML='<div class="empty-prophecy"><strong>ARCHIVE ERROR:</strong> Prophecy interpretation or provenance validation failed. No generic fallback was permitted.</div>';
  }

  function verifyCoreCoverage(source,archive){
    const eventNames=[...source.matchAll(/(?:minor|major):\{name:'([^']+)'/g)].map(match=>match[1]);
    if(eventNames.length!==72)throw new Error(`Expected 72 prophecy events in the core; located ${eventNames.length}.`);
    const unique=new Set(eventNames);
    if(unique.size!==72)throw new Error(`The prophecy core contains only ${unique.size} unique event names.`);
    for(const name of eventNames){
      const readings=archive.resolve({event:{name:normalizeEventName(name),poem:''},prophecy:''});
      if(!Array.isArray(readings)||readings.length!==5||new Set(readings).size!==5)throw new Error(`Bespoke coverage failed for ${name}.`);
    }
  }

  function replaceFunction(source,name,nextMarker,replacement){
    const start=source.indexOf(`  function ${name}(`);
    const end=source.indexOf(nextMarker,start);
    if(start<0||end<0)throw new Error(`The ${name} function boundary could not be located.`);
    return source.slice(0,start)+replacement+source.slice(end);
  }

  async function start(){
    try{
      const archive=globalThis.BlacklightAwakeningInterpretations;
      if(!archive||archive.count!==72)throw new Error(`Expected 72 bespoke event records; received ${archive?.count||0}.`);
      const response=await fetch(CORE_URL,{cache:'no-store'});
      if(!response.ok)throw new Error(`Unable to retrieve prophecy core (${response.status}).`);
      let source=await response.text();
      verifyCoreCoverage(source,archive);

      source=replaceFunction(source,'interpretations','\n\n  function buildRecord',REPLACEMENT);
      const buildMarker='  function buildRecord(triggerIndex,seed){';
      if(!source.includes(buildMarker))throw new Error('The prophecy record builder could not be located.');
      source=source.replace(buildMarker,`${PROVENANCE_HELPERS}\n  function buildRecord(triggerIndex,seed,override={}){`);

      const selectionNeedle="    const random=rng(`${seed}|record|${triggerIndex}`);const trigger=TRIGGERS[triggerIndex];const source=selectedValue('prophecy-source')||pick(random,Object.keys(SOURCES));const faction=selectedValue('prophecy-faction')||pick(random,FACTIONS);const posture=selectedValue('prophecy-clarity')||pick(random,['Veiled','Balanced','Direct']);";
      const selectionReplacement="    const random=rng(`${seed}|record|${triggerIndex}`);const trigger=TRIGGERS[triggerIndex];const source=override.source||selectedValue('prophecy-source')||pick(random,Object.keys(SOURCES));const faction=override.faction||selectedValue('prophecy-faction')||pick(random,FACTIONS);const posture=selectedValue('prophecy-clarity')||pick(random,['Veiled','Balanced','Direct']);";
      if(!source.includes(selectionNeedle))throw new Error('The source and faction selection block could not be located.');
      source=source.replace(selectionNeedle,selectionReplacement);

      const provenanceNeedle='    record.primarySource=pick(random,SOURCES[source].artifacts);record.acquisition=pick(random,SOURCES[source].acquisitions);';
      const provenanceReplacement='    record.provenance=buildProvenance(record,random);record.primarySource=record.provenance.recordTitle;record.acquisition=record.provenance.howObtained;';
      if(!source.includes(provenanceNeedle))throw new Error('The primary source assignment block could not be located.');
      source=source.replace(provenanceNeedle,provenanceReplacement);

      const minorNeedle="minor.interpretations=interpretations(record,stage,stage.minor,'Minor',";
      const majorNeedle="major.interpretations=interpretations(record,stage,stage.major,'Major',";
      if(!source.includes(minorNeedle)||!source.includes(majorNeedle))throw new Error('The prophecy event interpretation calls could not be located.');
      source=source.replace(minorNeedle,"minor.interpretations=interpretations(record,stage,{...stage.minor,composedProphecy:minor.prophecy},'Minor',");
      source=source.replace(majorNeedle,"major.interpretations=interpretations(record,stage,{...stage.major,composedProphecy:major.prophecy},'Major',");

      source=replaceFunction(source,'renderRecord','\n  function textRecord',RENDER_REPLACEMENT);
      source=replaceFunction(source,'textRecord','\n\n  let currentText',TEXT_REPLACEMENT);

      const recordsNeedle='const records=indices.map(index=>buildRecord(index,seed));';
      const recordsReplacement='const plans=all?buildDistinctPlans(seed,indices):indices.map(()=>({}));const records=indices.map((index,position)=>buildRecord(index,seed,plans[position]));';
      if(!source.includes(recordsNeedle))throw new Error('The record generation loop could not be located.');
      source=source.replace(recordsNeedle,recordsReplacement);
      source=source.replace("all?`Mounted all six trigger prophecies from key ${seed}.`:`Mounted ${records[0].id} from ${records[0].primarySource}.`","all?`Mounted six trigger prophecies from six independent source families and six distinct suspected actors under key ${seed}.`:`Mounted ${records[0].id} from ${records[0].provenance.sourceName}.`");

      if(/Literal reading:|Symbolic reading:|Temporal reading:|Counterintelligence reading:/.test(source))throw new Error('Generic interpretation templates remain in the executable prophecy source.');
      Function(`${source}\n//# sourceURL=blacklight-awakening-prophecy-generator-runtime.js`)();
    }catch(error){fail(error);}
  }

  start();
})();
