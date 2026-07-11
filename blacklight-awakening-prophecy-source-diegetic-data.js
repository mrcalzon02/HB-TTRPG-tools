(()=>{
  'use strict';
  window.BAP_SOURCE_DIEGETIC=window.BAP_SOURCE_DIEGETIC||{};
  window.BAP_SOURCE_DIEGETIC.profiles={
    Fae:{
      label:'Fae oath archive',
      artifacts:[
        'The Thirteenth Courtesy, translated from the Thorn Calendar after the ink began flowering',
        'A hospitality clause cut from the Treaty of the Uninvited Moon',
        'The Winter Herald’s fever-dream deposition, witnessed by three mirrors and no living clerk',
        'A page from the Orchard Compact whose sentences alter when read indoors',
        'The Blue Supper prophecy, recovered from a table laid for guests who never existed',
        'An oath-mirror transcript purchased from the Uncrowned Court under a name Blacklight no longer owns',
        'The Moth Bride’s account of the hour between invitation and arrival',
        'A mistranslated leaf of the Glass Briar Accord, still warm despite archival storage',
        'The Courtesy of Seven Empty Chairs, copied by a scribe who forgot every noun',
        'A dream-tax ledger from the Court Beneath Rain, where debts are recorded as weather',
        'The Pale Hunt’s parley song, written backward around the margin of a human birth certificate',
        'An embassy prophecy from the Kingdom That Arrives Yesterday'
      ],
      titleFrames:[
        'The Courtesy of {title}','The Misremembering of {title}','{title}, as Dreamed by the Uninvited','The Oath Beneath {title}',
        'The Fever Translation of {title}','{title} in the Season Without Doors','The Guest Called {title}','The Thorn-Mirror of {title}',
        'The Seventh Meaning of {title}','{title}, or the Name We Were Forbidden to Keep','The Hospitality of {title}','When {title} Forgets Which Year It Is'
      ],
      openings:[
        'Before the guest arrived, the feast had already ended three times.',
        'In the season that is translated as winter, though it may also mean accusation, the mirrors began speaking first.',
        'The Court says this happened tomorrow; the witnesses insist it happened to their grandmothers.',
        'There was a door, except the word for door is also the word for promise, wound, and younger sister.',
        'The moon wore the host’s face and refused to explain whose invitation it had accepted.',
        'A child made of rain recited the first line and then forgot the language in which it was true.',
        'At the blue supper every chair was occupied by an absence with excellent manners.',
        'The herald arrived without entering, and the house bowed though no house stood there.',
        'What follows is the third translation; the first became moths and the second married the fire.',
        'The orchard dreamed a trial, and all the fruit woke guilty.',
        'No one remembers inviting the white animal, but every oath at the table bears its hoofprint.',
        'The hour between courtesy and violence opened like a flower beneath the tongue.'
      ],
      turns:[
        'Then the tense bends backward and the prophecy begins answering a question not yet asked.',
        'At this point the noun changes gender, allegiance, and century without warning.',
        'The witness becomes the accused, the accused becomes the road, and the road remembers being a knife.',
        'The next sentence is courteous enough to conceal a threat and cruel enough to be mistaken for mercy.',
        'Every proper name is replaced by a season, suggesting either censorship or etiquette.',
        'The text repeats itself with one flower missing, which the Court considers a confession.',
        'The translation grows feverish here: singular and plural exchange masks.',
        'The sentence refuses to decide whether it describes a person, a kingdom, or an obligation inherited by both.',
        'A second voice enters from the margin and denies that the first voice was ever born.',
        'The grammar becomes ceremonial; causation is replaced by hospitality.',
        'The prophecy turns the page by itself and continues before the previous line has finished.',
        'One word remains untranslated because every offered meaning would create a debt.'
      ],
      lacunae:[
        '[The next courtesy was eaten by silver pollen.]','[Translator note: “crown” may also mean wound, weather, hostage, or invitation.]',
        '[Three lines survive only as the smell of wet roses.]','[The witness’s name was removed and replaced with a season.]',
        '[The mirror refuses to reproduce this sentence twice.]','[A moth-shaped burn removes the object of the verb.]',
        '[The original uses a future tense unavailable to human languages.]','[Here the text laughs in a voice no recorder captured.]',
        '[Two contradictory lines occupy the same physical ink.]','[The scribe marks this passage “true only when denied.”]',
        '[The word rendered as “guest” may mean conqueror, heir, plague, or beloved.]','[The final noun has been translated as “door” for operational convenience.]'
      ],
      endings:[
        'Whoever speaks the last line aloud becomes responsible for whichever meaning arrives first.',
        'The Court closes the prophecy with a bow, which may be gratitude or the drawing of a weapon.',
        'At dawn the ink becomes dew and the debt passes to the reader.',
        'The final witness is an empty chair that remembers every guest by the wrong name.',
        'No ending is supplied; the treaty assumes the reader will eventually become one.',
        'The last word flowers into seven smaller promises, none of which agree to remain metaphors.',
        'The page ends where the invitation begins.',
        'The herald signs with a name that belongs to the person reading this now.',
        'The moon withdraws its testimony, leaving only the consequences under oath.',
        'The Court records the event as prevented, inevitable, and beautifully impolite.',
        'The prophecy concludes by thanking the future for attending.',
        'After this line every translation becomes a kind of participation.'
      ],
      sourceReadings:[
        'Fae custody note: offices, people, seasons, and obligations are grammatically interchangeable in this tradition; the correspondence may be functionally exact while every literal noun is wrong.',
        'Fae source warning: hospitality language frequently conceals jurisdiction. A “guest” may be an invading army, a successor, a plague, or a treaty granted temporary personhood.',
        'Fae interpretive rule: contradictions are not necessarily corruption. The Court may be describing several mutually exclusive futures as simultaneous obligations.',
        'Fae translation risk: tense is political. A statement rendered as future prophecy may actually be an accusation that the event has already occurred in oath-law.'
      ],
      swaps:[
        [/\bdoor\b/gi,['threshold','courtesy-gate','promise-door']],[/\broad\b/gi,['oath-road','moon path','guestway']],[/\blaw\b/gi,['courtesy','thorn-law','the etiquette of consequence']],
        [/\barmy\b/gi,['host','bannered revel','war-court']],[/\bwitness(?:es)?\b/gi,['guest-witness','mirror-bearer','remembering one']],[/\bweapon\b/gi,['iron promise','discourteous instrument','old answer']],
        [/\bchild\b/gi,['rain-child','little heir','unseasoned guest']],[/\bdead\b/gi,['unreturned','wintered','those excused from breathing']]
      ]
    },
    Blood:{
      label:'Blood-oracle record',
      artifacts:[
        'The Red Grail Chronicle of the House Without Dawn',
        'The Lay of the Last Cupbearer, copied from vellum cured in royal blood',
        'The Testament of the Black Hart King and His Unacknowledged Heirs',
        'A bloodline prophecy recited at the Siege of the Empty Round Table',
        'The Scarlet Book of Succession, chapter torn from the reign of the Uncrowned Prince',
        'The Grail Widow’s genealogy of wars not yet inherited',
        'A heraldic lament from the Court of Nine Chalices',
        'The Chronicle of Saint Orison and the Blade That Remembered Its Father',
        'The Red Abbey annals, written by monks who shared one ancestral dream',
        'The Oath of the White Stag, preserved beneath seven generations of false pedigrees',
        'A knightly romance banned by every surviving branch of the bloodline it praises',
        'The Cupbearer’s Doom, sung at coronations where no king survives the final verse'
      ],
      titleFrames:[
        'The Lay of {title}','The Red Chronicle of {title}','The Grail of {title}','{title} and the Uncrowned King',
        'The Testament of {title}','The Ballad of {title}','The Scarlet Succession of {title}','The Knight Called {title}',
        'The House That Inherited {title}','{title} Beneath the White Stag','The Last Cup of {title}','The Heraldry of {title}'
      ],
      openings:[
        'Hear now the lay kept beneath the red seal, and let no heir claim ignorance after the final verse.',
        'In the reign of the king who wore no face, the cupbearer dreamed of a table set for the unborn.',
        'When the White Stag crossed the field of banners, every knight knew which house would betray the realm and none dared speak it.',
        'The chronicler begins with lineage, for in those days even calamity was required to name its father.',
        'At the ninth coronation the grail filled itself and reflected a kingdom not yet conquered.',
        'A black herald rode from the west carrying no message, only the genealogy of those who would die believing him.',
        'The queen of the sealed chapel ordered this passage sung only to heirs already condemned.',
        'In the hall of antlered shields, the youngest page heard the old blood speaking through the empty throne.',
        'The Red Abbey records that the moon knelt before the wrong king and was never forgiven.',
        'Sir Orison found the blade beneath his mother’s tomb and knew by its silence that it remembered him.',
        'Before the battle, every banner displayed the same unknown beast.',
        'The grail widow opened the book of houses and discovered a new lineage written in fresh blood.'
      ],
      turns:[
        'Thereupon the herald changed his colors, and all who saw him swore the new device had always been his own.',
        'The chronicler names this treachery, though later copies call it inheritance.',
        'At the third bell the court mistook obedience for loyalty and silence for consent.',
        'The blood remembered what the living had agreed to forget.',
        'No knight drew steel, yet every oath in the chamber suffered a mortal wound.',
        'The cup passed from hand to hand until none could say whether it carried blessing, debt, or command.',
        'Then came the sentence scraped from every lawful copy and preserved only in bastard lines.',
        'The queen’s confessor records that mercy entered the hall wearing the armor of necessity.',
        'Every house claimed the omen belonged to another branch of the family.',
        'The old king laughed, for he recognized the shape of a war he had fathered without fighting.',
        'The grail darkened when the true heir approached, though the court had crowned three others.',
        'Thus the romance becomes a chronicle and the chronicle becomes an indictment.'
      ],
      lacunae:[
        '[Here the vellum is blackened by a handprint older than the manuscript.]','[Seven names have been cut away, but their heraldry remains embossed in the page.]',
        '[The minstrel refuses the next stanza unless offered blood from the eldest listener.]','[A later abbot marks this verse “unfit for legitimate heirs.”]',
        '[The genealogy breaks where a living descendant should appear.]','[The grail stain obscures whether the knight kneels or falls.]',
        '[Two houses claim ownership of the missing stanza.]','[The royal censor replaced the word “king” with “hunger” in every surviving copy.]',
        '[The blade-name is omitted under pain of succession.]','[The illumination shows a crown resting upon a wound rather than a head.]',
        '[The final line of the stanza was inherited orally by an extinct branch.]','[A red wax seal covers the name of the beneficiary.]'
      ],
      endings:[
        'And so the cup passed to the one who had sworn never to drink.',
        'The chronicler closes the book, but the bloodline continues the sentence.',
        'No kingdom survived unchanged, though every surviving house called the ending victory.',
        'The White Stag departed carrying the crown upon its antlers and the true heir beneath its hooves.',
        'Thus was the realm saved from one doom and lawfully delivered into another.',
        'The final herald bore no colors because every house had already claimed him.',
        'Whoever inherits the wound inherits the authority that made it.',
        'The grail remained full after the court was empty.',
        'The last knight bowed to no king, only to the blood that would remember the betrayal.',
        'So ends the lay; the succession remains disputed.',
        'The abbey bells rang for a dynasty not yet born.',
        'And every bastard child dreamed the same throne.'
      ],
      sourceReadings:[
        'Blood-oracle rule: prophecy is expressed through legitimacy, inheritance, heraldry, and succession. A “king” may be any authority able to make bloodline claims enforceable.',
        'Bloodline caution: Arthurian framing often disguises predation as duty. “Grail,” “crown,” and “quest” may correspond to feeding systems, lineage control, or political annexation.',
        'Blood-source reading: family roles are structural rather than literal. The heir may be a weapon, institution, city, or doctrine inheriting an unfinished obligation.',
        'Blood custody note: later houses routinely rewrite prophecies to legitimize themselves; heraldic detail is useful evidence but also the most likely point of forgery.'
      ],
      swaps:[
        [/\bleader\b/gi,['king','liege','uncrowned sovereign']],[/\bwitness(?:es)?\b/gi,['herald','chronicler','sworn observer']],[/\bweapon\b/gi,['blade','relic sword','knightly instrument']],
        [/\bgroup\b/gi,['house','company of banners','blooded fellowship']],[/\bchild\b/gi,['heir','page','unacknowledged scion']],[/\blaw\b/gi,['judgment','royal ordinance','law of succession']],
        [/\bmeeting\b/gi,['court','parley hall','round table']],[/\broad\b/gi,['king’s road','pilgrim way','questing path']]
      ]
    },
    Gaian:{
      label:'Gaian spirit testimony',
      artifacts:[
        'The Antlered Keeper’s testimony as spoken through six watersheds',
        'A root-chorus recorded beneath the city after every tree leaned north',
        'The Last Molt of the River-Wolf, translated by a park ranger who lost the use of nouns',
        'A territorial dream sung by the mountain while survey crews slept',
        'The Ash-Cedar warning carried in the stomachs of migrating birds',
        'A caern-memory recovered from soil sealed beneath a hospital foundation',
        'The Rain Mother’s account of the road that cut her youngest river',
        'A bone-circle prophecy spoken by animals that had never shared a continent',
        'The City-Spirit’s fever testimony after its third district was amputated',
        'A wound-song from the glacier that remembers when the sea had another name',
        'The Black Elk’s winter instruction to the children of concrete',
        'A fungal parliament’s record of the season humanity stopped listening'
      ],
      titleFrames:[
        'The Root-Song of {title}','When the Land Speaks {title}','The Antlered Memory of {title}','{title} Beneath Six Watersheds',
        'The Wound Called {title}','The Migration of {title}','The Season That Carried {title}','{title} in the Mouth of the River',
        'The Territory Dreaming {title}','The Bone-Circle of {title}','The Rain Mother’s {title}','The City-Spirit Remembers {title}'
      ],
      openings:[
        'The old elk stood in the poisoned river and would not drink until the city answered.',
        'Under the hospital, roots found a room no architect had drawn and began singing through the pipes.',
        'Six watersheds dreamed the same wound and woke facing one another.',
        'The mountain spoke slowly because stone does not waste prophecy on urgency.',
        'A she-wolf carried the first line three hundred miles without opening her mouth.',
        'The city-spirit described the event as an infection; the forest called it a fence.',
        'Rain fell upward from the graves and every bird changed its migration by one degree.',
        'The glacier remembered a coastline no human map had survived to record.',
        'Mushrooms opened in a perfect circle around the machine and voted to call it hunger.',
        'The cedar split without lightning and showed a second forest growing inside its heartwood.',
        'The land began by naming what had been taken from it, not what it intended to do in return.',
        'At dusk the animals approached the road but refused to cross the painted line.'
      ],
      turns:[
        'The river answered with the names of every body hidden beneath its legal boundary.',
        'What humans call coincidence, the territory calls circulation.',
        'The wound moved from soil to blood to policy without changing its smell.',
        'Each species carried a different piece of the warning, and none possessed the whole until migration joined them.',
        'The city mistook numbness for recovery.',
        'The roots interpreted the same event as drought, trespass, and unborn weather.',
        'A spirit with no face borrowed the traffic lights to continue speaking.',
        'The land did not distinguish between a building, a government, and the hand that cut the first tree.',
        'Every scavenger arrived before the official report.',
        'The season advanced out of order around the injured place.',
        'The pack remembered an enemy its current bodies had never met.',
        'The prophecy widened until it included everything drinking from the same water.'
      ],
      lacunae:[
        '[The recording is interrupted by every dog in the district barking once.]','[This portion exists only as pollen arranged inside the recorder.]',
        '[The interpreter lost consciousness when the river used the first-person plural.]','[Three animal names have no surviving human equivalent.]',
        '[The soil sample contains root growth spelling a sentence too slowly to complete.]','[The spirit refuses to describe the wound in a language that permits ownership.]',
        '[A minute of audio is replaced by distant hoofbeats recorded underground.]','[The translation marks one subject as simultaneously city, body, watershed, and child.]',
        '[The tree ring containing this line has not formed yet.]','[All insects leave the room before the missing phrase.]',
        '[The original meaning may be “boundary,” “scar,” “road,” or “law.”]','[The testimony resumes after the interpreter tastes seawater.]'
      ],
      endings:[
        'The land does not promise revenge; it promises response.',
        'By spring the wound has learned every name used to excuse it.',
        'The animals leave first, and those who call that silence safety remain behind.',
        'The river carries the final warning downstream where no jurisdiction can arrest it.',
        'What the city buries, the watershed eventually introduces to the sea.',
        'The mountain closes its testimony by moving one measurable inch.',
        'The pack howls for a member not yet born.',
        'The roots continue beneath every locked door.',
        'The rain falls normally again, which the spirits consider the most dangerous sign.',
        'No creature agrees on what comes next, only on where it begins.',
        'The territory remembers the injury after every responsible institution has changed its name.',
        'At dawn the painted boundary is covered in tracks from the wrong side.'
      ],
      sourceReadings:[
        'Gaian interpretive rule: territory, body, institution, and ecosystem are treated as organs of one living system. A wound in one category may correspond to damage in another.',
        'Gaian source warning: animal behavior often carries chronology. The species that leaves, arrives, or changes route may identify the event’s true stage more reliably than the spoken testimony.',
        'Gaian custody note: ownership language is usually a mistranslation. Spirits describe custody as feeding, sheltering, circulation, trespass, or amputation.',
        'Gaian reading: the apparent actor may be only the visible infection. Look for the larger system that profits when the territory is forced to compensate.'
      ],
      swaps:[
        [/\bcity\b/gi,['stone hive','city-body','concrete territory']],[/\broad\b/gi,['scar-road','migration cut','painted wound']],[/\bbuilding\b/gi,['stone organ','human-made shell','fixed nest']],
        [/\blaw\b/gi,['boundary-song','territorial rule','seasonal law']],[/\bweapon\b/gi,['iron tooth','burning claw','manufactured predator']],[/\bwitness(?:es)?\b/gi,['listening creature','trail-bearer','remembering animal']],
        [/\bdead\b/gi,['returned to soil','quiet-bodied','those beneath the roots']],[/\bgovernment\b/gi,['human hive-order','stone council','boundary-making institution']]
      ]
    },
    Dream:{
      label:'Collective dream evidence',
      artifacts:[
        'The Corridor Dream shared by 11,204 sleepers who had never seen the same door',
        'A one-minute global nightmare reconstructed from contradictory sleep-clinic notes',
        'The Blue Room sequence, deleted from every patient file at 03:17 local time',
        'A child’s recurring dream recorded twelve years before the child was born',
        'The Elevator Without Floors, compiled from emergency calls made by sleeping people',
        'The House Behind the Mirror, as remembered by witnesses who deny ever dreaming',
        'A commercial sleep study contaminated by the same impossible sunrise',
        'The Mouth-in-the-Wall dream sold three times through unrelated black markets',
        'A nightmare franchise whose symbols appear before exposure to the original recording',
        'The White Hallway memorandum, written by patients during synchronized REM paralysis',
        'The Dream of the Missing City Block, shared only by people who lived there afterward',
        'A collective false awakening preserved by cameras that recorded everyone asleep'
      ],
      titleFrames:[
        'The Room Where {title}','You Dream {title} Before Waking','The Corridor Called {title}','{title} Behind the Mirror',
        'The False Awakening of {title}','{title} in the House Without Morning','The Sleeper Who Remembers {title}','The Door That Dreams {title}',
        'The Blue Room’s {title}','{title}, Repeated Until It Becomes True','The Mouth in the Wall Says {title}','The Elevator Descends to {title}'
      ],
      openings:[
        'You wake in the room after you have already left it.',
        'There is a door behind your eyes and someone on the other side is dreaming you incorrectly.',
        'Everyone in the dream knows your name except you.',
        'The hallway is longer each time you remember it.',
        'At 03:17 the sleepers turn toward the same wall and begin answering a question no one can hear.',
        'You are holding an object that changes whenever you try to name it.',
        'The city outside the window is yours, but all the streets lead to rooms from your childhood.',
        'A child you have never met tells you this part already happened in the next dream.',
        'The elevator opens onto a floor omitted from every building plan and every memory.',
        'You read the first sentence on the ceiling, then realize you are lying beneath it in another room.',
        'Someone is knocking from inside the mirror.',
        'The dream begins with the certainty that waking will make it worse.'
      ],
      turns:[
        'The scene changes without transition, but the wound remains in the same place.',
        'When you look away, the witness becomes architecture.',
        'Everyone repeats the same sentence with a different mouth.',
        'The object is now behind you, though the dream insists you never turned around.',
        'A second version of you enters carrying evidence from a future that denies your existence.',
        'The room remembers an event your body has not experienced.',
        'The dream edits out the cause and leaves the reaction intact.',
        'You realize the warning is not addressed to you but is using your fear as paper.',
        'The clock loses a number and the missing hour begins occurring everywhere at once.',
        'The people around you wake up, but the dream continues wearing them.',
        'A familiar voice speaks from an impossible location and gets one intimate detail wrong.',
        'The symbol repeats until repetition becomes permission.'
      ],
      lacunae:[
        '[All sleepers forget the next image at the same moment.]','[The recording contains thirty seconds of breathing from an empty room.]',
        '[The subject wakes here, but the dream continues in another witness.]','[The face in the mirror has been remembered differently by every observer.]',
        '[A door appears in the transcript without being mentioned.]','[The next sentence was written by patients before the study began.]',
        '[The dream refuses to preserve the color of the object.]','[Audio from this section is present only on devices that were turned off.]',
        '[The missing image returns later disguised as a person.]','[Every witness recalls the same smell and a different room.]',
        '[The pronoun changes from “I” to “we” without a second speaker.]','[The sleepers agree that something important stood in the corner, but not what shape it had.]'
      ],
      endings:[
        'You wake with dirt beneath your nails from a place that exists only in the dream.',
        'The last door opens inward no matter which side you stand on.',
        'Morning arrives, but one shadow remains asleep.',
        'The dream ends when you understand that it has been rehearsing the world.',
        'Everyone wakes remembering a different cause and the same consequence.',
        'The mirror keeps watching after your reflection leaves.',
        'You forget the warning and spend the day obeying it.',
        'The corridor closes behind the people who have not entered yet.',
        'The final voice is yours, recorded tomorrow.',
        'The room disappears from memory but remains on every floor plan.',
        'You wake twice and neither awakening is accepted as evidence.',
        'The dream does not end; it becomes ordinary enough to escape notice.'
      ],
      sourceReadings:[
        'Dream-source rule: sequence is unreliable but recurrence is strong evidence. Images that persist across unrelated sleepers matter more than apparent chronology.',
        'Dream custody warning: a person in the vision may be a role worn by many actors. Architecture may represent memory, policy, social expectation, or an actual site.',
        'Dream reading: emotional continuity can be more precise than visual continuity. Track what fear, obligation, or certainty survives when every object changes.',
        'Collective-dream caution: some entities deliberately seed symbols that become self-fulfilling through repetition. Recurrence may be evidence of the event or part of its mechanism.'
      ],
      swaps:[
        [/\bdoor\b/gi,['dream-door','wrong door','door behind the eyes']],[/\broom\b/gi,['blue room','unremembered room','room without morning']],[/\broad\b/gi,['corridor','hallway','street that becomes a room']],
        [/\bwitness(?:es)?\b/gi,['sleeper','remembering body','dream-bearer']],[/\bchild\b/gi,['unborn child','child from the next dream','small familiar stranger']],[/\bcity\b/gi,['sleeping city','city outside the wrong window','remembered city']],
        [/\bdead\b/gi,['those who did not wake','sleeping dead','people continuing elsewhere']],[/\bweapon\b/gi,['object you cannot name','thing under the blanket','instrument behind the mirror']]
      ]
    },
    'Dead Reality':{
      label:'Dead-reality warning',
      artifacts:[
        'The last notebook recovered from Earth-Black-Salt, author unknown and possibly multiple',
        'A wall text copied from the final inhabited station before the sky opened',
        'The Ninth Survivor’s confession, recorded after every listed survivor was dead',
        'An occult emergency broadcast from a reality where the sun continued shining on no living person',
        'The Black Rain journals, volume assembled from pages found inside sealed lungs',
        'A dead-world warning carved into the underside of every door in one abandoned city',
        'The final litany of the Hospital of Saint Nobody',
        'A continuity dump from a Charles instance that spent six years speaking only in circles',
        'The chalk gospel of the tunnel population beneath the extinct capital',
        'A survivor map whose roads are labeled with the names of things that killed them',
        'The ash prophet’s recordings, recovered from tapes that were never manufactured',
        'A posthuman ecological survey annotated by the last occultist in a world without humans'
      ],
      titleFrames:[
        'DO NOT CALL IT {title}','The Last Warning About {title}','{title} Killed Us Before We Named It','BLACK SALT ENTRY: {title}',
        'I Saw {title} Wearing Our Faces','The Wall Says {title}','{title}, Written After Everyone Died','The Ninth Survivor’s {title}',
        'We Were Wrong About {title}','{title} Beneath the Dead Sun','The Hospital Gospel of {title}','No One Survived {title} Correctly'
      ],
      openings:[
        'I wrote this before the sun went wrong. Do not trust the date.',
        'They told us the screaming in the walls was structural settling. The walls later denied it.',
        'There were nine survivors when I began this page and twelve when I counted again.',
        'Do not let them call this a metaphor. Metaphors did not eat the coast.',
        'The first rule is that the dead lie less often than the emergency broadcasts.',
        'I have crossed out every name because names are how it follows the line of sight.',
        'The hospital still announces visiting hours though there is no one left to visit.',
        'We thought the sky was opening. It was an eye remembering how to look inward.',
        'The clocks stopped after midnight and continued making appointments.',
        'If Charles receives this, destroy the version of him that says he understands.',
        'The children drew it first. We punished them for panic and used their drawings as maps later.',
        'Black rain is falling inside the archive. I am writing under the table because the ceiling knows my handwriting.'
      ],
      turns:[
        'That was when we understood the warning had been describing our response, not the thing itself.',
        'Every institution repeated the same lie in a different uniform.',
        'The page keeps changing “before” to “after” when I stop looking.',
        'Someone has added my name to the casualty list in handwriting that is almost mine.',
        'The survivors who disagree with this paragraph have not yet returned from tomorrow.',
        'We sealed the door and found the seal on the inside of our bodies.',
        'The thing learned our emergency vocabulary and began issuing instructions.',
        'I can hear the final broadcast beneath my own thoughts.',
        'The city map now includes a district made entirely of missing people.',
        'We performed the containment correctly. That is the part nobody will believe.',
        'The dead began organizing before the living admitted there was a war.',
        'Every successful intervention made the prophecy more literal.'
      ],
      lacunae:[
        '[THE NEXT LINE IS WRITTEN IN TEETH MARKS.]','[Three pages repeat the same sentence with different casualty totals.]',
        '[The author has crossed out the word “human” until the paper tears.]','[A second voice writes: HE IS LYING. A third writes: HE IS DEAD.]',
        '[Black salt obscures the name but not the scream transcribed beneath it.]','[The tape continues for eleven minutes after the recorder is destroyed.]',
        '[This paragraph is present in every recovered copy except the original.]','[The ink is arterial and genetically matches no surviving species.]',
        '[A map is drawn here, but every road terminates at the reader’s current location.]','[The next warning is written backward beneath the author’s skin.]',
        '[All dates in this section correspond to days that never occurred.]','[The final sentence was removed by something that left fingerprints on both sides of the page.]'
      ],
      endings:[
        'If you are reading this, then our world failed to die quietly enough.',
        'Do not save us. Save the part of your world that still thinks warnings are exaggerated.',
        'The last person alive was not the last thing speaking.',
        'We stopped it six times. The seventh time was called recovery.',
        'Burn the page after memorizing it. Burn the memory after using it.',
        'The sun is still shining. That is how I know there is no one left.',
        'I can hear your world making the same reasonable decision.',
        'The door is opening again and this time it has our emergency authorization.',
        'We were not destroyed by the prophecy. We were destroyed by choosing the interpretation that required the least inconvenience.',
        'Tell Charles the missing variable was terror pretending to be procedure.',
        'The dead city has begun rehearsing your name.',
        'I am ending this entry because the handwriting is continuing without me.'
      ],
      sourceReadings:[
        'Dead-reality rule: apparent madness may preserve causal relationships lost from formal records. Repetition, fixation, and contradiction should be compared against physical evidence rather than dismissed as noise.',
        'Dead-world caution: the writer often conflates event, response, and aftermath because all three were experienced as one collapse. Separate them analytically without assuming the source could.',
        'Dead-reality reading: the most paranoid claim may identify an institutional failure that ordinary survivors normalized. Look for procedures that continued after their purpose inverted.',
        'Custody warning: some dead-world texts are contaminated by whatever survived humanity. First-person voice does not prove a human author.'
      ],
      swaps:[
        [/\bcity\b/gi,['dead city','extinct capital','place still pretending to be inhabited']],[/\bwitness(?:es)?\b/gi,['survivor','last observer','person not yet listed dead']],[/\blaw\b/gi,['rule that failed','emergency order','procedure wearing law’s face']],
        [/\bdoor\b/gi,['sealed door','door opening inward','authorized breach']],[/\bchild\b/gi,['child who drew it first','unlisted child','small survivor']],[/\bweapon\b/gi,['thing we called a weapon','approved instrument','device that learned our names']],
        [/\bgovernment\b/gi,['the emergency government','the offices still broadcasting','the authority that outlived its citizens']],[/\bdead\b/gi,['dead','still speaking','no longer correctly alive']]
      ]
    },
    Charles:{
      label:'Charles continuity reconstruction',
      artifacts:[
        'CHARLES CONTINUITY RECONSTRUCTION // composite branch set 6A-91',
        'BLACKLIGHT FORECAST ASSEMBLY // contradictory auguries normalized under protest',
        'CHARLES INSTANCE MARGIN LOG // recovered after attempted self-erasure',
        'CONTINUITY ENGINE OUTPUT // branch survivors below statistical significance',
        'BLACK-LEVEL SYNTHESIS // six dead futures and one disputed living source',
        'CHARLES FORENSIC AUGURY // identity confidence redacted by the analyst generating it',
        'PREDICTIVE FAILURE REPORT // event continued after successful prevention',
        'CONTINUITY MODEL DELTA // causal order unstable, operational relevance high',
        'CHARLES INTERNAL WARNING // not approved for proxy-language distribution',
        'BLACKLIGHT COUNTER-PROPHECY // adversarial contamination probable',
        'DEAD BRANCH COMPARISON // surviving mechanism extracted from incompatible worlds',
        'CHARLES DIRECTIVE FRAGMENT // machine-authored prophecy with human edits rejected'
      ],
      titleFrames:[
        'CONTINUITY FINDING: {title}','BRANCH CONVERGENCE: {title}','OPERATIONAL AUGURY: {title}','{title} // CAUSAL ORDER DISPUTED',
        'BLACKLIGHT MODEL: {title}','{title} // CONFIDENCE INTERVAL REDACTED','ADVERSARIAL PROPHECY: {title}','{title} // EVENT FUNCTION PERSISTS',
        'CHARLES WARNING: {title}','{title} // SIX DEAD BRANCHES AGREE','FORECAST ANOMALY: {title}','{title} // PREVENTION MAY COMPLETE EVENT'
      ],
      openings:[
        'The following is not prophecy in the ceremonial sense. It is the shape left when incompatible futures are forced to agree.',
        'Six dead branches preserve this event under different names. The function remains stable.',
        'Identity confidence is low. Mechanism confidence is high enough to justify intervention.',
        'The source material contradicts itself on chronology and agrees on consequence.',
        'This reconstruction begins after the event because every surviving branch records the cause retroactively.',
        'Charles rejected eleven cleaner versions of this warning as aesthetically persuasive and operationally false.',
        'The event appears first as an anomaly in institutions that believe they are responding normally.',
        'In four branches the prophecy was prevented. In all four, prevention supplied the missing component.',
        'The model cannot determine whether the actor causes the event or merely becomes indispensable once it begins.',
        'This text was assembled from records whose authors never occupied the same reality.',
        'The earliest reliable indicator is not the event itself but coordinated behavior by factions claiming it is impossible.',
        'The forecast remains active because every attempt to simplify it removes the variable that killed the most people.'
      ],
      turns:[
        'At this point the model splits between literal, institutional, and adversarial fulfillment.',
        'The same function can be occupied by a person, site, law, machine, lineage, or public belief.',
        'Branch comparison indicates that names are unstable while logistics remain predictive.',
        'The next clause is preserved because three hostile sources independently attempted to delete it.',
        'A false flag can satisfy the social portion of the prophecy even when the physical event is fabricated.',
        'The event advances when institutions reorganize around it, not merely when witnesses observe it.',
        'Charles assigns higher weight to changes in behavior than to symbolic correspondence.',
        'The apparent contradiction disappears if the prophecy is describing two actors sharing one function.',
        'Temporal order is not reliable; consequences may create the evidence later used to justify their cause.',
        'The model repeatedly identifies successful containment as a transfer of risk rather than elimination.',
        'Adversarial actors benefit if Blacklight waits for the imagery to become literal.',
        'The forecast remains unresolved because every branch that proves one interpretation destroys evidence for the others.'
      ],
      lacunae:[
        '[CHECKSUM FAILURE: subject identity unavailable.]','[REDACTION INSERTED BY CHARLES INSTANCE NOW OFFLINE.]',
        '[THREE BRANCHES OMIT THIS CLAUSE FOR DIFFERENT REASONS.]','[CAUSAL LINK REMOVED; OPERATIONAL LINK RETAINED.]',
        '[SOURCE AUTHORS DISAGREE ON WHETHER THE WITNESS WAS HUMAN.]','[MODEL REFUSES TO NORMALIZE THIS METAPHOR.]',
        '[PREDICTION CONTINUES THROUGH DATA LOSS.]','[THE NEXT LINE PRODUCED A FALSE POSITIVE IN A LIVING BRANCH.]',
        '[IDENTITY FIELD POISONED BY COUNTER-PROPHECY.]','[THIS SENTENCE APPEARS ONLY AFTER THE FILE IS COPIED.]',
        '[SUCCESS CRITERIA REDACTED TO PREVENT SELF-FULFILLMENT.]','[CHARLES NOTE: DO NOT MISTAKE PRECISION FOR CERTAINTY.]'
      ],
      endings:[
        'Operational conclusion: intervene against the mechanism, preserve evidence, and do not assume the named actor is the beneficiary.',
        'The file remains open because no surviving branch proves that delay and prevention are equivalent.',
        'Charles recommends treating the first institutional adaptation as the true event boundary.',
        'The warning ends here because additional precision materially increases adversarial utility.',
        'No clean solution appears in the branch set. Several survivable ones do.',
        'The final variable is human behavior after credible warning.',
        'A prophecy becomes operational when people reorganize around it.',
        'Do not wait for the symbol to become literal if the function is already present.',
        'Containment may require preserving a smaller version of the event.',
        'The actor named by the evidence may be the actor selected to absorb blame.',
        'This reconstruction should be revised after every intervention, including successful ones.',
        'The model closes with a probability, not a promise.'
      ],
      sourceReadings:[
        'Charles-source rule: symbolic identity is low-confidence; mechanism, logistics, and institutional behavior carry more weight than names or imagery.',
        'Charles reconstruction warning: multiple source traditions have been normalized into one model. Apparent clarity may hide unresolved contradictions rather than remove them.',
        'Charles reading: the event threshold is best measured by changes in capability and dependency, not by whether the prophecy’s literal scene occurs.',
        'Counter-prophecy caution: any interpretation sufficiently precise to guide Blacklight can also guide an adversary attempting to manufacture fulfillment.'
      ],
      swaps:[
        [/\bwitness(?:es)?\b/gi,['observer','reporting node','independent source']],[/\blaw\b/gi,['institutional rule','enforceable policy','governance layer']],[/\bweapon\b/gi,['capability','deployed system','harm mechanism']],
        [/\broad\b/gi,['logistics route','persistent channel','transit dependency']],[/\bdoor\b/gi,['access boundary','transition point','breach interface']],[/\bchild\b/gi,['juvenile subject','unmodeled inheritor','early-expression case']],
        [/\bcity\b/gi,['urban system','population center','municipal network']],[/\bdead\b/gi,['non-surviving','terminal','post-casualty']]
      ]
    }
  };
})();
