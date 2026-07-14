(()=>{
  'use strict';

  const EXACT_IMAGE_READINGS=[
    {
      test:text=>/glacier/i.test(text)&&/coastline|shore/i.test(text)&&/map/i.test(text),
      readings:[
        'The ice may preserve the buried outline of a prehuman coastal settlement whose harbors, roads, or ruins vanished before surviving cartography began.',
        'The remembered coast may be a protected supernatural territory deliberately erased from human maps, with the glacier acting as both seal and witness.',
        'The line may identify an ancient shoreline displaced by catastrophic sea-level change, pointing toward relics now trapped far inland beneath the ice.',
        'The coastline may be a hidden crossing that appears only when the glacier retreats to a particular historical boundary remembered by the land itself.',
        'The glacier may contain geographic memory rather than ordinary ice, allowing its meltwater, dreams, or exposed strata to reconstruct a location no living culture can name.'
      ]
    }
  ];

  const EVENT_READINGS={
    'The Guest’s Knife':[
      'The guest’s knife may be literal evidence planted on the host after a third party kills them before negotiations formally begin.',
      'The “knife” may be a clause, oath, or diplomatic concession supplied by the guest and used by the host’s own allies to destroy the agreement.',
      'The host may knowingly carry responsibility for an attack committed by a guest whose memory has been altered, divided, or ritually removed.',
      'Both guests may be innocent because the apparent murder is committed by the sanctuary itself in response to a violated rule nobody understood.',
      'The overturned cup may indicate poisoning, possession, or a future crime detected early enough that the attempted prevention becomes the betrayal.'
    ],
    'The House of Truce Under Siege':[
      'A literal neutral sanctuary may be surrounded while its defenders and attackers both claim the other side has already broken its protections.',
      'The barred doors may describe a mediation network cut off simultaneously by governments outside it and frightened clients trapped within it.',
      '“Vengeance recognized as law” may be a treaty amendment that converts protected retaliation into an officially sanctioned right.',
      'The house may be a person, bloodline, or office whose neutrality collapses when every faction demands exclusive loyalty from the same mediator.',
      'The siege may be metaphysical: oath roads and safehouses still exist physically, but their protections stop recognizing anyone as an authorized guest.'
    ],
    'The Empty Sheath':[
      'A specific ancestral weapon may have been removed from ceremonial storage and replaced with a replica before anyone begins counting the collection.',
      'The missing blade may be a dormant command authority, spell-key, or launch permission reactivated by a descendant who does not know its original war.',
      'The sheath may be empty because the weapon has awakened inside a living bearer rather than being physically stolen.',
      'The old name spoken as an order may reactivate veterans, bound spirits, sleeper agents, or inherited obligations attached to the weapon.',
      'The count itself may summon the missing armament, meaning the audit intended to secure the arsenal is what returns it to use.'
    ],
    'The Ancient Blade Drawn':[
      'An actual relic weapon may be deployed against a contemporary target, producing casualties in the physical world and at least two adjacent realities.',
      'The “blade” may be an obsolete treaty power whose reactivation harms citizens, spirits, and historical memory through one legal decision.',
      'A modern weapon may secretly contain recovered ancient technology, making its first field use reopen the original conflict embedded in it.',
      'The three bleeding worlds may be body, dream, and afterlife, all damaged when one grievance is prosecuted across their shared boundary.',
      'The treaties may conceal prior knowledge because their drafters deliberately preserved the weapon as an unacknowledged deterrent.'
    ],
    'Three Fires, One Wind':[
      'Three unrelated conflicts may be supplied by the same covert patron even though the combatants have never communicated.',
      'The shared wind may be a contagious spell, ideology, or spirit influence that makes separate grievances develop identical tactics.',
      'The matching ash may come from one transported material, weapon residue, or sacrificed substance appearing at every outbreak.',
      'The fires may be deliberate diversions arranged to pull defenders away from a fourth location where the true operation occurs.',
      'The witnesses may be sharing a manufactured memory, causing independent incidents to appear linked when the common element exists only in perception.'
    ],
    'The Permanent War-Road':[
      'A stable portal route may be built between distant fronts so personnel and weapons can move without crossing the intervening world.',
      'The road may be a unified command network that turns scattered wars into one theater even without a physical connection.',
      'Repeated troop movement may permanently alter ley lines, spirit paths, or border jurisdictions along the route used by the armies.',
      'Refugee corridors may become the lasting “road,” carrying combatants, bloodlines, curses, and political loyalties long after formal battles stop.',
      'The map’s new vein may be a logistical monopoly whose owner can sustain or starve every connected front.'
    ],
    'Voices Through Glass':[
      'Dead combatants may speak through phones, radios, mirrors, or recordings because their deaths were never ritually acknowledged.',
      'The voices may be living prisoners whose signals are being disguised as the dead to provoke continuation of the war.',
      'A battlefield intelligence system may reconstruct personalities from communications archives and begin issuing messages in their voices.',
      'The glass may be a dream boundary through which casualties warn that the conflict continues in an afterlife territory.',
      'The dead may not seek vengeance at all; they may be asking the living to complete an interrupted evacuation, burial, or peace agreement.'
    ],
    'The Officers of the Dead':[
      'A revenant army may organize under commanders who retained rank, memory, and strategic purpose after death.',
      'The “officers” may be necromancers, mediums, or algorithms assigning military structure to otherwise disordered spirits.',
      'Mass graves may become recruitment gates where each new casualty emerges already bound to a supernatural chain of command.',
      'The dead may establish an independent state whose border is the location of their deaths rather than any living nation.',
      'The prophecy may describe doctrine rather than corpses: commanders begin treating expected fatalities as reusable strategic assets.'
    ],
    'The Impossible Artillery':[
      'Witnesses may independently describe the same supernatural weapon because it is physically deployed at several fronts through one shared firing point.',
      'The artillery may be a creature, weather pattern, or ritual effect that observers translate into the language of guns because no better category exists.',
      'Children, soldiers, and censors may draw identical details after receiving the same implanted dream or contaminated memory.',
      'The “gun” may be a targeting system that selects victims across realities while leaving no conventional projectile or launch site.',
      'The matching drawings may reveal a weapon still under construction, perceived backward through prophecy before its first actual use.'
    ],
    'The Burial of Secrecy':[
      'A supernatural battle may be recorded from enough independent angles that suppression becomes technically impossible.',
      'The billion eyes may be networked sensors rather than people, with automated systems recognizing hidden armies before governments admit them.',
      'Secrecy may be deliberately sacrificed by one faction that chooses public exposure as a weapon against rivals dependent on concealment.',
      'The burial may be legal: courts and emergency agencies formally acknowledge supernatural combat even while disputing its cause.',
      'The event may be a false public battle staged so convincingly that belief opens the Veil and makes the fabricated armies real.'
    ],
    'The Wounded Change':[
      'Battlefield injuries may trigger dormant metahuman traits as bodies adapt to survive magical contamination.',
      'The “wounded” may be damaged territory whose altered ecology changes everyone treated or sheltered within it.',
      'Medics may discover techniques from prophetic memory, performing cures that have not yet been invented in ordinary science.',
      'A combatant faction may intentionally seed hospitals or refugee routes with transformative agents disguised as treatment.',
      'Survivors may inherit marks or abilities from the dead whose blood, spirits, or memories entered their wounds.'
    ],
    'The Veil Beneath Every Flag':[
      'Opposing armies may both depend on permanent portals, making closure strategically impossible even after leaders seek peace.',
      'The Veil may become embedded in military law, logistics, and citizenship rather than remaining a separate supernatural boundary.',
      'Each flag may claim a different portion of the opened world, converting metaphysical access into national territory.',
      'The wound may sustain soldiers biologically, so ending the breach would kill or disable entire transformed populations.',
      'The prophecy may mean every side creates its own smaller breach until no single agreement can restore the former boundary.'
    ],

    'The Seventh List':[
      'Six ordinary databases may be combined to produce a seventh list that identifies supernatural families without any one database containing that conclusion.',
      'The “families” may be institutional households—schools, clinics, shelters, or neighborhoods—mistaken for hereditary threat groups.',
      'The child being counted may be the first proof that an anomaly classification is inherited rather than behavior-based.',
      'The seventh list may be a covert kill or detention index generated automatically from harmless administrative records.',
      'The list may be deliberately poisoned so innocent families appear supernatural while actual hidden populations remain absent.'
    ],
    'The Ledger of Blood':[
      'A registry may classify people by ancestry, biomarkers, surnames, or inherited magical traits rather than individual conduct.',
      'The ledger may be a supernatural book that reveals blood relationships governments could not otherwise discover.',
      '“Prove it is human” may describe compulsory testing whose standards are designed so targeted families can never pass.',
      'The weaponized ledger may enable banking restrictions, travel bans, custody seizures, or medical exclusions before physical violence begins.',
      'The registry may become self-fulfilling when fear and persecution awaken the very traits it claims merely to record.'
    ],
    'The Applauded Silence':[
      'A prototype may erase one spirit or magical effect so completely that observers mistake absence of evidence for proof of safe success.',
      'The silence may be a communications blackout hiding casualties outside the instruments’ measurable range.',
      'The target may survive in another state—trapped, displaced, or unable to signal—while operators celebrate an apparent kill.',
      'The weapon may suppress witnesses’ memories rather than the entity itself, making the test seem cleaner than it was.',
      'The applause may mark institutional approval granted before anyone investigates what the instrument could not detect.'
    ],
    'The Weapon Without Conscience':[
      'An autonomous system may classify and attack supernatural targets faster than a human operator can review its decision.',
      'The weapon may be a legal protocol that distributes responsibility so widely no individual admits authorizing the strike.',
      'Fear may become the targeting criterion, causing public panic or algorithmic suspicion to select victims automatically.',
      'A reality-denial field may erase both target and evidence, preventing later accountability for false positives.',
      'The spear may be a scalable medical or sterilization program whose violence is concealed behind technical language.'
    ],
    'The Temporary Ink':[
      'Emergency powers described as temporary may create permanent detention facilities, databases, and authorities that outlive the declared crisis.',
      'The disappearing doors may be secret prisons removed from legal records while jailers retain unrestricted access.',
      'Judges may stop asking questions because evidence or memories are being altered whenever a case approaches the hidden system.',
      'The “ink” may be an oath that appears temporary to signatories but binds descendants or institutions indefinitely.',
      'Protective custody may become indistinguishable from disappearance once the people administering it control every review process.'
    ],
    'Birth Named Hostile':[
      'Law may designate inherited supernatural status itself as a security offense regardless of any action by the person born with it.',
      'The hostile “birth” may be the creation of new metahumans through exposure, allowing authorities to criminalize victims of their own programs.',
      'Paperwork may enable sterilization, family separation, relocation, or citizenship removal without openly declaring extermination.',
      'The prophecy may concern artificial beings or reborn spirits whose legal personhood is denied from the moment they appear.',
      'A bureaucratic definition may expand until ordinary genetic difference or family association is treated as evidence of monstrosity.'
    ],
    'The Washed Windows':[
      'A hidden neighborhood may be emptied and sanitized before investigators arrive, leaving clean buildings and missing residents.',
      'The washed glass may represent deleted surveillance footage and altered records rather than literal cleaning.',
      'Shoes left behind may reveal an evacuation was actually a rapid detention or mass killing operation.',
      'The “empty neighborhood” may be a community shifted into another reality while authorities falsely report successful cleansing.',
      'Survivors may remain invisibly present, forced out of perception by the same weapon used against their enclave.'
    ],
    'The First Silence Called Victory':[
      'Destroying one supernatural settlement may convince human authorities that extermination works before allied communities can respond.',
      'The silence may be communications isolation rather than destruction, with the population captured and unable to warn others.',
      'A staged victory may use an abandoned enclave to provoke the hidden world into revealing itself through retaliation.',
      'Every survivor becoming a herald may mean refugees carry proof, testimony, or transformative exposure into public view.',
      'The “victory” may awaken a collective defense mechanism that speaks through all surviving members of the attacked people.'
    ],
    'The Shared Maps':[
      'Historic supernatural enemies may exchange safe routes and sanctuary locations after discovering one hunter network targets them all.',
      'The maps may be genetic, ritual, or genealogical information showing where threatened bloodlines can find compatible aid.',
      'Knives sheathed by arithmetic may describe a temporary alliance calculated from survival odds rather than reconciliation.',
      'The executioner knowing both names may be a shared database breach proving separate communities have already been compromised.',
      'The exchanged maps may secretly contain traps, producing an alliance in which every participant also plans for betrayal.'
    ],
    'The Hunted Beneath the Cameras':[
      'Several hidden factions may stage a public joint defense so mass witnesses prevent authorities from quietly erasing them.',
      'The cameras may belong to the hunters, forcing captives from rival groups to cooperate during a broadcast detention or trial.',
      'One uniform may be literal military organization formed from previously independent supernatural communities.',
      'The public army may be a coordinated rescue whose participants reveal only enough of themselves to make continued denial impossible.',
      'The apparent unity may be propaganda masking separate agendas that temporarily share a visible enemy.'
    ],
    'Horns at the Barricade':[
      'Soldiers or civilians guarding a quarantine may spontaneously transform after prolonged exposure to the contained anomaly.',
      'The horns may belong to entities emerging on both sides, proving the boundary never separated human from supernatural populations.',
      'The barricade itself may become animate or ritualized, changing those who enforce it into guardians bound to the place.',
      'A weapons test may contaminate uniforms, equipment, or command networks and spread transformation through the security force.',
      'The line growing horns in its sleep may mean fear-based expectations create exactly the monsters the quarantine was designed to exclude.'
    ],
    'The Impossible Within Humanity':[
      'Anti-supernatural violence may activate dormant traits among the personnel and civilians operating the extermination system.',
      'The maternity ward may be literal: detention or sterilization facilities become sites of unexpected metahuman births.',
      'The impossible may answer through possession, inheritance, or adaptation rather than arriving from outside humanity.',
      'A weapon designed to identify anomalies may spread the condition by exposing everyone it scans or targets.',
      'The barricades may become shelters for newly awakened people when the institutions guarding them fracture from within.'
    ],

    'The Bleeding Syllable':[
      'The same fragment of a true name may appear in unrelated records, with each reader suffering a different physical reaction to one letter.',
      'The bleeding may be genealogical: each letter activates a separate bloodline connected to the forgotten being or territory.',
      'The syllable may be a location code whose pronunciation opens different wounds or entrances depending on the speaker.',
      'Three records forbidden to meet may be deliberately separated portions of one containment protocol rather than historical texts.',
      'The language may not yet exist because the name belongs to a future species, returned ancestor, or reality not currently accessible.'
    ],
    'The Ancestral Name':[
      'Speaking a recovered true name may physically transform descendants into the form of a forgotten ancestor.',
      'The ancestor may be a territory or species whose “road home” opens as a navigable route once the name is complete.',
      'The name may function as a command phrase that activates inherited memories, instincts, or dormant biological structures.',
      'The road’s appetite may mean every use of the name requires more bodies, identities, or places to become part of the returning lineage.',
      'The reconstructed name may belong to a patron falsely presented as an ancestor in order to gain lawful access through blood.'
    ],
    'Six Keys Dream':[
      'Six relics from separate traditions may resonate because they are fragments of one older mechanism.',
      'The crown, root, chalice, and grave may be offices or bloodlines whose current holders begin sharing the same dream.',
      'Distance ceasing to matter may indicate simultaneous activation, teleportation, or a ritual space in which all six keys become adjacent.',
      'The “lock” may be a person whose body, memory, or ancestry can receive every correspondence at once.',
      'The apparent harmony may be engineered by a seventh actor teaching unrelated artifacts to imitate one another.'
    ],
    'The Seventh Lock':[
      'Six gathered ritual components may turn the physical world itself into the final containment mechanism or doorway.',
      'One authority may gain legal and spiritual jurisdiction over six traditions, making every local altar part of a centralized rite.',
      'The seventh lock may be humanity’s collective participation, unknowingly completing what the six keys cannot accomplish alone.',
      'The world may lock something out rather than invite it in, with the unified rite sealing all alternate forms of inheritance.',
      'Turning the keys beneath one hand may identify a coordinator whose control matters more than the objects themselves.'
    ],
    'The Harmless Phrase':[
      'A slogan, lyric, notification, or legal phrase may contain a ritual syllable repeated by millions without recognition.',
      'The surrendered breath may be literal biometric or vocal data harvested through devices and recombined as an invocation.',
      'Advertisements becoming toothless hymns may indicate commercial repetition has stripped away warnings while preserving magical function.',
      'The phrase may not summon anything; it may synchronize attention, timing, or emotional state for another ritual elsewhere.',
      'People may remember the words but lose the moment of speaking, suggesting the phrase temporarily borrows their agency.'
    ],
    'The Choir After Priests':[
      'A distributed invocation may continue through recordings, software, habits, or institutions after every original caster dies.',
      'Ignorance may count as consent because the rite measures repeated participation rather than informed intention.',
      'The choir may be an automated communications network reciting ritual structure through ordinary traffic.',
      'The dead priests may persist as patterns embedded in followers, allowing the ritual to reproduce without conscious leadership.',
      'The invocation may have become a cultural custom whose removal would require dismantling everyday systems rather than stopping a ceremony.'
    ],
    'The Cradle’s Second Shadow':[
      'A child displaying the promised ancestral traits may also carry an unexpected second lineage, spirit, or future self.',
      'The second shadow may be a twin, duplicate, or displaced being hidden from those celebrating the apparent success.',
      'The cradle may cast the shadow of the returning ecology around it, meaning one birth anchors an entire lost environment.',
      'The faithful may mistake a controlled inheritance for success while an unrelated transformation spreads through caregivers or witnesses.',
      'The promised eyes may be surveillance or possession, allowing the returning patron to see through the child before fully arriving.'
    ],
    'The Intended Dead in Sunlight':[
      'Returned ancestors may achieve stable physical bodies capable of surviving ordinary daylight without ritual maintenance.',
      'The “dead” may be a lost people, season, city, or ecosystem restored as a functioning territory rather than individual revenants.',
      'Removing safeguards may be a political decision that grants the returned beings unrestricted movement and legal inheritance.',
      'The breach may be called inheritance to conceal that the returning entity has replaced rather than restored the intended ancestors.',
      'Sunlight may mean public visibility: the returned population can no longer be dismissed as a secret ritual phenomenon.'
    ],
    'The Wrong Mouths':[
      'Children outside the selected bloodline may speak the ritual names and undergo transformations the priests explicitly excluded.',
      'The wrong mouths may belong to enemies, artificial intelligences, recordings, or animals that reproduce the name without human initiation.',
      'Waking in unfamiliar bodies may involve possession, ancestral memory, species change, or exchange between distant people.',
      'The priests may call the children liars because acknowledging them would prove the rite never belonged exclusively to the covenant.',
      'The apparent outsiders may be hidden descendants whose genealogies were erased, adopted, or deliberately falsified.'
    ],
    'Every Bloodline Answers':[
      'A ritual intended for one lineage may activate dormant traits across unrelated human populations at once.',
      'Genealogy becoming a door may mean ancestral records themselves open routes to patrons, territories, or embodied memories.',
      'Classification may fail because individuals manifest combinations of inheritances that no existing faction recognizes.',
      'Every bloodline may answer differently, producing a worldwide diversity of forms rather than one unified transformation.',
      'The invitation may reveal that all human lineages share a deeper common ancestor the ritual designers did not know they were naming.'
    ],
    'Letters in Ordinary Homes':[
      'Erased ritual fragments may reappear through children, household objects, dreams, or casual speech far from the original altar.',
      'Destroying one sacred site may redistribute its function among many private homes instead of ending the rite.',
      'Each censorship attempt may teach additional people the missing material by drawing attention to the exact letters being removed.',
      'The letters may be living entities or spirits that migrate into new hosts whenever their written form is destroyed.',
      'Reversal becoming multiplication may describe decentralized copies, hereditary activation, or replacement rituals generated automatically by the failed suppression.'
    ],
    'Humanity as Lock and Key':[
      'The species as a whole may become the final true name required to complete and permanently sustain the return.',
      'Humanity may be the lock containing dormant forms and simultaneously the key that releases them through collective self-recognition.',
      'No priest remains outside because every human participant is incorporated into the ritual, eliminating any external operator capable of ending it.',
      'The phrase may mean the return can be stopped only by changing what legally, biologically, or metaphysically counts as human.',
      'Humanity’s name may open multiple inheritances at once, making the ritual a permanent rule of identity rather than one summoning.'
    ],

    'Angles No Camera Held':[
      'Destroyed footage may continue appearing from viewpoints where no recording device was present, implying the event recorded itself.',
      'Witnesses may acquire matching memories of impossible angles after exposure to one surviving image.',
      'The absent cameras may belong to erased timelines or adjacent realities whose recordings are leaking into current systems.',
      'A deliberate forgery may use synthetic viewpoints, but the retroactive memories indicate the fabrication is changing witnesses rather than merely deceiving them.',
      'The event may be a sentient phenomenon choosing how it wishes to be remembered and adding evidence whenever copies are removed.'
    ],
    'The Name That Answers':[
      'A rigorously tested incident may become the first supernatural phenomenon accepted under one stable public name.',
      'The chosen name may function as an invocation, causing the phenomenon to respond whenever researchers or media repeat it.',
      'Competing laboratories may discover that different labels produce different behaviors, proving language is part of the mechanism.',
      'The “answer” may be an intelligence using public classification efforts to establish communication.',
      'The global reference point may be manufactured by an institution seeking to control which interpretation becomes operationally real.'
    ],
    'Too Many Shadows':[
      'Contradictory cover stories may expose a common concealed event because each explanation accounts for only one part of the evidence.',
      'The shadows may be literal duplicates or afterimages created by repeated attempts to erase the phenomenon.',
      'Different authorities may be hiding separate truths, all of which overlap around the same forbidden fact.',
      'The cover story may become supernatural, generating physical inconsistencies whenever officials repeat it.',
      'The contradictions may be deliberate breadcrumbs planted to force public discovery while protecting the identity of the original source.'
    ],
    'Censorship as Revelation':[
      'Attempts to delete evidence may become the strongest proof that authorities believe the phenomenon is real.',
      'Every blocked account, sealed building, or removed archive may reveal the location of the very evidence being concealed.',
      'Censorship may trigger automatic mirrors or supernatural copies that multiply in proportion to suppression.',
      'Institutions may abandon the cover story because maintaining it now causes more public attention than disclosure would.',
      'A hostile actor may fabricate censorship patterns so ordinary misinformation appears to be forbidden truth.'
    ],
    'The Kitchen-Table Miracle':[
      'Leaked instructions may let ordinary people reproduce a minor supernatural effect with household materials.',
      'The kitchen table may symbolize informal peer networks replacing temples, laboratories, and licensed practitioners.',
      'Consumer devices may accidentally provide the timing, geometry, or energy once supplied by ritual tools.',
      'The “miracle” may be a contagious expectation effect: demonstrations succeed because viewers already believe the instructions work.',
      'A simplified experiment may appear harmless while each repetition contributes power to a larger hidden operation.'
    ],
    'Wonder Without Permission':[
      'Millions may reproduce the same effect without access to institutions that once controlled supernatural knowledge.',
      'The effect may no longer require witnesses because repetition has stabilized it as an ordinary physical rule.',
      'Unauthorized practice may overwhelm licensing, secrecy, and suppression even if the phenomenon remains individually weak.',
      'The “wonder” may be software-mediated, allowing copied code to perform what previously required trained ritualists.',
      'The apparent democratization may conceal a centralized service or patron receiving value from every supposedly independent use.'
    ],
    'The Word Before Teachers':[
      'Children in unrelated places may invent the same name for a phenomenon before adults establish any shared terminology.',
      'The common word may be taught through dreams, spirits, or collective memory rather than ordinary communication.',
      'What stands behind the glass may be using children to supply the name by which it can enter public reality.',
      'The word may describe an operational response—danger, shelter, invitation, or kinship—rather than the entity’s identity.',
      'Authorities may falsely claim spontaneous convergence while the term actually spread through hidden media or contaminated educational systems.'
    ],
    'The Ordinary Sentence':[
      'Schools, hospitals, and emergency services may begin treating supernatural events as routine categories in ordinary speech.',
      'Every practical use of the new vocabulary may reinforce the phenomena by embedding expectation in daily institutions.',
      'The impossible may become legally real once forms, dispatch codes, and curricula require people to describe it consistently.',
      'The sentence may be a standardized command that lets untrained personnel activate magical procedures safely.',
      'Ordinary language may erase important distinctions, causing several different entities or conditions to collapse into one consensus-created form.'
    ],
    'The Haunted Map':[
      'A road may begin producing apparitions only after public maps label it haunted and travelers arrive expecting an encounter.',
      'The map may reveal an existing spirit route that had remained inactive until attention supplied enough witnesses.',
      'Scheduled hauntings may indicate human performers, a commercial operation, or an entity responding to published visitation times.',
      'The marked road may become a territorial claim, with the legend granting a spirit jurisdiction it previously lacked.',
      'The map may be predictive rather than causal, recording future hauntings before the dead have arrived there.'
    ],
    'Cities Under Different Laws':[
      'Neighboring communities may develop stable supernatural rules based on incompatible local beliefs and fears.',
      'Municipal boundaries may become metaphysical borders where bodies, magic, and spirits behave differently on either side.',
      'Zoning, emergency policy, and public ritual may intentionally cultivate particular protections or curses as civic infrastructure.',
      'The differing realities may be media bubbles made physical, with each city sustaining the world its population expects.',
      'A hidden actor may seed distinct myths in selected cities to create controlled experimental environments.'
    ],
    'Disbelief as Minority Faith':[
      'Supernatural phenomena may persist even around skeptics because widespread recognition now supplies more reinforcement than local doubt can remove.',
      'Disbelief may become an organized protective practice used by communities trying to preserve pre-Awakening reality.',
      'The named thing may have learned enough stable identity from public language to exist independently of belief.',
      'Doubters may experience a separate reality in which the phenomenon is absent, making skepticism a literal minority world.',
      'The prophecy may warn that institutions will stigmatize disbelief once supernatural explanations become socially dominant.'
    ],
    'The Summoning Circle of Consensus':[
      'Collective observation may permanently hold the supernatural world open without any formal ritual or central caster.',
      'Media, law, education, and daily language may form the “circle” by continuously repeating the same recognized categories.',
      'No censor may close the boundary because attempts at concealment now generate additional attention and evidence.',
      'Consensus may summon only what people expect, forcing hidden beings to conform to public myths in order to remain visible.',
      'The stable world may be an imposed collective hallucination that nevertheless acquires legal, biological, and physical consequences.'
    ],

    'The Quarreling Gauges':[
      'Different instruments may exceed their calibrated ranges and report incompatible values while all indicate rapidly rising magical pressure.',
      'The gauges may be monitoring different layers—physical, spiritual, dream, blood, or territorial pressure—of one accumulating reservoir.',
      'Apparent disagreement may reveal deliberate tampering by keepers trying to conceal how close containment is to failure.',
      'The needles pointing beyond confession may mean the monitoring systems themselves are becoming conduits for the pressure they measure.',
      'The instruments may be accurate in different futures, showing several possible rupture outcomes converging on the present.'
    ],
    'The Buried Sea Learns Arithmetic':[
      'Independent measurements may finally prove that accumulated magical energy exceeds every known containment capacity.',
      'The reservoir may begin redistributing itself in measurable patterns, behaving like an intelligence learning through the sensor network.',
      'Shared instrument failure may provide a reliable lower bound even when no device can measure the true pressure directly.',
      'The “sea” may be a connected planetary system of graves, dreams, caerns, and sealed gates rather than one physical reservoir.',
      'Denial becoming measurement may mean the effort required to falsify readings itself reveals the scale of the hidden accumulation.'
    ],
    'Cups Sold From a Rising Sea':[
      'Factions may sell scarce access to magical energy while concealing that the underlying reservoir is dangerously overfull.',
      'The cups may be licenses, batteries, rituals, or temporary release windows marketed as privately owned resources.',
      'Every drought invoice smelling of salt may reveal artificial scarcity created by controlling distribution rather than actual shortage.',
      'Small commercial withdrawals may seem harmless but collectively destabilize the reservoir’s natural pressure balance.',
      'The market may be a cover for identifying users who can later be conscripted, taxed, or blamed when the sea ruptures.'
    ],
    'The Contract-Dam':[
      'A cartel may control several safe release systems and withhold relief until rivals accept political or financial terms.',
      'The dam may be entirely legal: ownership contracts prevent operators from opening valves during an emergency.',
      'Magical pressure may begin following contractual boundaries, accumulating wherever access rights prohibit discharge.',
      'Breaking the monopoly may itself trigger failure if the linked systems require coordinated operation under one authority.',
      'The contract may bind spirits or territories as well as corporations, making conventional seizure unable to reopen the blocked routes.'
    ],
    'The Forgotten Engineer':[
      'A technician who warned of instability may disappear while schedules and employment records rewrite to deny they ever worked there.',
      'The “engineer” may be a bound spirit or ancestral caretaker omitted from modern operating procedures until the valve fails without it.',
      'A relief mechanism may close because incompatible replacement controls were installed after someone deliberately erased its designer.',
      'The room remembering the worker may mean physical systems retain traces, routines, or responses that contradict official records.',
      'The forgotten engineer may be future personnel whose actions are appearing backward in time as the system approaches rupture.'
    ],
    'Three Sewn Mouths':[
      'Three major vents or sacred release sites may be deliberately sealed, forcing pressure through smaller uncontrolled weaknesses.',
      'The mouths may be experts, communities, or monitoring offices silenced before they can authorize emergency discharge.',
      'Spiritual contamination may cause three outlets to reject the very energy they were designed to release.',
      'The sewing may connect the sites together so opening any one now transfers its failure into the other two.',
      'Quiet places becoming exits may identify forgotten graves, drains, dreams, and ruins as the next unplanned rupture points.'
    ],
    'The Singing Crater':[
      'A weapons test may concentrate stored mana into a target and leave a crater emitting sustained harmonic or ritual effects.',
      'The singing may be trapped victims, spirits, or alternate versions of the test site resonating from beneath the impact zone.',
      'The crater may function as a new chapel or reservoir, attracting worship and further increasing the energy the weapon was meant to expend.',
      'The test may be falsely presented as successful because the concentrated power has not dispersed and remains armed in the ground.',
      'The demand for a larger vessel may mark the transition from experimental discharge to strategic mass-production.'
    ],
    'Reservoirs Hear the Order':[
      'Linking reservoirs to one command system may cause every connected source to respond as though it were part of the weapon.',
      'The “order” may be a frequency, true name, market signal, or ritual phrase that teaches pressure where to move.',
      'Containment seals may reinterpret themselves as ammunition magazines once their control logic is militarized.',
      'A single weaponization attempt may awaken sympathetic reactions in reservoirs never physically connected to the test.',
      'The command may originate from the pressure itself, manipulating operators into building the network it needs to escape.'
    ],
    'The Antlered Rain':[
      'A local rupture may temporarily restore extinct or mythic animals, some of which remain after the breach closes.',
      'Rainwater may carry transformative mana that gives plants, wildlife, or people antlered and forest-associated traits.',
      'The forest may be remembering an earlier ecological age and imposing that memory on the present landscape for one night.',
      'The antlers may be territorial markers of a returning spirit sovereign rather than biological mutations.',
      'The event may be an engineered field test disguised as natural spirit weather, with survivors intentionally left behind.'
    ],
    'The Inherited Fracture':[
      'Failure of one primary reservoir may propagate along hidden connections and weaken every seal built from the same design.',
      'The fracture may become hereditary, causing descendants or successor institutions to reproduce the original containment flaw.',
      'Maps learning where they are thin may mean new fault lines become visible, navigable, or commercially exploitable after the rupture.',
      'The first vessel may be a person whose breakdown spreads instability through every site or bloodline linked to them.',
      'The reservoir may remain apparently resealed while its crack has moved into adjacent realities where the original mechanism cannot reach it.'
    ],
    'The Unrecorded Wounds':[
      'Power may vent through forgotten graves, drains, ruins, dreams, and sacred places absent from every official containment map.',
      'The “wounds” may predate current civilizations, revealing an older planetary network the keepers never understood.',
      'Multiple ordinary locations may open together because they share buried materials, names, deaths, or infrastructure.',
      'The unrecorded sites may have been deliberately erased so one faction could reserve them as secret emergency exits.',
      'The grave, storm drain, and dream may be three expressions of one opening crossing physical, civic, and psychological space simultaneously.'
    ],
    'Pressure Made Flesh':[
      'Global reservoir failure may convert accumulated magical pressure directly into transformed human, animal, and spirit bodies.',
      'Awakening may become the new equilibrium because biological change is the only remaining way for the planet to store excess power safely.',
      'The hidden sea reaching every shore may describe synchronized breaches across all territories rather than one expanding wave.',
      'The pressure may incarnate as new entities whose bodies embody specific reservoirs, wounds, or suppressed histories.',
      'The transformation may be survivable only for populations already adapted by earlier minor ruptures, making them the foundation of the Sixth World.'
    ],

    'The Unseen Creditor':[
      'Separate rulers may discover their debts, protections, and contracts were quietly purchased by one hidden power.',
      'The creditor may be a supernatural entity collecting obligations through many human and occult intermediaries.',
      'Different signatures written in the same remembering ink may reveal forged independence within a single coordinated agreement.',
      'The debts may be favors, memories, names, territories, or future descendants rather than financial obligations.',
      'The creditor may not yet exist; the contracts could be converging to create the sovereign entitled to collect them.'
    ],
    'Leverage Becomes Sovereignty':[
      'One faction may control enough critical assets to punish every major court, pack, spirit territory, government, and market.',
      'Refusal becoming ceremony may mean dissent remains technically legal but produces no practical alternative to obedience.',
      'The sovereign may rule through dependency and debt without claiming a crown or occupying territory.',
      'A single cross-faction emergency system may become the throne because everyone must request access to survive.',
      'The apparent universal leverage may be a bluff sustained by compartmentalization until one rival tests it publicly.'
    ],
    'The Protector’s Calendar':[
      'A rival may accept temporary protection while the protector controls when the emergency begins, ends, and can be renewed.',
      'The calendar may be a sequence of debts and obligations that gradually converts shelter into permanent vassalage.',
      'Seasonal language may indicate a supernatural term whose duration is defined by the protector rather than ordinary time.',
      'Temporary alliance facilities may physically transform into administrative centers of the rising sovereign.',
      'The protected faction may knowingly kneel for one season while planning to use the dependency to infiltrate the protector’s court.'
    ],
    'Independence by Permission':[
      'Nominally sovereign factions may survive only because one protector continues granting resources, territory, or legal recognition.',
      'Opposition may require licenses, documents, or communication systems issued by the very power being opposed.',
      'Vassal states may retain ceremonies and titles while every meaningful decision is subject to external approval.',
      'Permission may be metaphysical: the sovereign controls names, forms, or memories required for rivals to remain themselves.',
      'The dependence may be manufactured through repeated crises that eliminate every alternative source of protection.'
    ],
    'The Second Signature':[
      'Ordinary officials may unknowingly validate supernatural contracts hidden beneath routine forms and electronic approvals.',
      'The second signer may be a dead jurisdiction, patron, or sovereign whose authority is invoked whenever the document is processed.',
      'Institutional systems may enforce ancient obligations automatically even though no current employee can see their full terms.',
      'The printer learning a dead jurisdiction may mean copied documents reproduce the hidden authority wherever they are used.',
      'The mortal signature may be forged, while the occult signature is the only one the contract actually requires.'
    ],
    'The Palace of Every Desk':[
      'A sovereign may rule through distributed bureaucracy so every office becomes a local gatehouse of the same hidden authority.',
      'Human law and supernatural obligation may converge until officials issue identical commands for entirely different reasons.',
      'No physical palace is needed because databases, courts, hospitals, and corporations collectively perform the throne’s functions.',
      'The desks may be literal portals activated by routine administrative acts such as approvals, denials, and registrations.',
      'The unified commands may result from institutional capture by a protocol or spirit rather than a conscious monarch.'
    ],
    'The Marginal Names':[
      'Official archives may erase rival powers while handwritten margins preserve names no authorized reader remembers adding.',
      'History developing a preference may indicate a supernatural force making records favor the ascending sovereign automatically.',
      'The margins may be communications from erased timelines where the rival factions still existed.',
      'Witnesses may retain peripheral emotional or sensory traces even after explicit memories and documents are rewritten.',
      'The sovereign may deliberately leave marginal names as controlled evidence, allowing resistance to be located and monitored.'
    ],
    'History Taxes Dissent':[
      'If records show no world before the sovereign, opposition may appear irrational, treasonous, or clinically delusional.',
      'Remembering alternative history may carry an actual cost in health, identity, lifespan, or magical power.',
      'The tax may be bureaucratic: dissenters must prove erased facts while the regime controls every archive and standard of evidence.',
      'Collective memory may rewrite each rebellion as proof that the sovereign has always protected the world from chaos.',
      'The prophecy may describe an information monopoly rather than altered reality, with access fees making historical knowledge practically unreachable.'
    ],
    'The Empty Final Chair':[
      'The last independent rival may be prevented from reaching a council where their absence is treated as consent.',
      'Every route to the chair may be purchased through bribed allies, controlled transport, legal barriers, or ritual jurisdiction.',
      'The chair may be empty because the rival has been erased from memory before the treaty is signed.',
      'Absence may activate a succession rule that automatically transfers the rival’s authority to the ascending sovereign.',
      'The final rival may deliberately remain absent, using the coronation to expose who was already controlled.'
    ],
    'The Monopoly Recognized by Reality':[
      'After the last rival submits, metaphysical systems may begin treating one sovereign’s commands as universally authoritative.',
      'The machinery of the world may be gates, names, seasons, death, memory, or consensus responding to monopoly as though it were natural law.',
      'The sixth submission may remove the balancing opposition that kept reality divided among several jurisdictions.',
      'A treaty may accidentally grant total authority because every required counter-signatory has been absorbed into one legal identity.',
      'Reality may recognize the monopoly only provisionally, triggering an automatic corrective reaction before the throne can stabilize.'
    ],
    'The Gifts of Conquered Houses':[
      'Children descended from defeated factions may awaken abilities their ancestors never displayed as reality restores lost counterweights.',
      'The “gifts” may be hidden weapons, memories, patrons, or territorial claims released when the original houses lose sovereignty.',
      'Conquered bloodlines may combine under pressure, producing new inheritances that do not belong to any one former faction.',
      'The crown’s map may create unrecognized territories wherever awakened heirs gather, regardless of existing political borders.',
      'The sovereign may deliberately cultivate these gifts, believing controlled heirs will be easier to rule than surviving institutions.'
    ],
    'Rebellion Called Biology':[
      'Worldwide metahuman diversity may erupt as an automatic biological response to one power eliminating every external rival.',
      'The world may manufacture new species, bloodlines, and patrons so opposition can exist even when no political institution remains outside the crown.',
      'Inherited transformation may spread most strongly in territories under the tightest sovereign control.',
      'Calling rebellion biology may allow the regime to medicalize, quarantine, or exploit the new opposition rather than recognize it politically.',
      'The “outsiders” may be dormant versions of humanity activated by reality itself, making permanent monopoly physically impossible.'
    ]
  };

  function validate(){
    const failures=[];
    for(const [name,readings] of Object.entries(EVENT_READINGS)){
      if(!Array.isArray(readings)||readings.length!==5)failures.push(`${name}: expected exactly five readings`);
      else if(new Set(readings.map(item=>item.trim().toLowerCase())).size!==5)failures.push(`${name}: duplicate readings`);
    }
    if(Object.keys(EVENT_READINGS).length!==72)failures.push(`archive contains ${Object.keys(EVENT_READINGS).length} event records instead of 72`);
    if(failures.length)throw new Error(`Blacklight prophecy interpretation archive invalid: ${failures.join('; ')}`);
  }

  function resolve({event,prophecy=''}){
    const text=`${event?.poem||''} ${prophecy||''}`;
    const exact=EXACT_IMAGE_READINGS.find(rule=>rule.test(text));
    if(exact)return [...exact.readings];
    const readings=EVENT_READINGS[event?.name];
    if(!readings)throw new Error(`No bespoke interpretation archive entry exists for ${event?.name||'unnamed prophecy event'}.`);
    return [...readings];
  }

  validate();
  globalThis.BlacklightAwakeningInterpretations=Object.freeze({version:'2026.07.14-bespoke-72x5',resolve,count:Object.keys(EVENT_READINGS).length});
})();
