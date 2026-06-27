((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODSystemSiteCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const SUPERNATURAL_STATUSES = Object.freeze(['TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED']);
  const entry = (id, label, text, categories = [], featureHooks = [], statuses = SUPERNATURAL_STATUSES) => Object.freeze({
    id, label, text, categories: Object.freeze(categories), featureHooks: Object.freeze(featureHooks), statuses: Object.freeze(statuses)
  });
  const line = fields => Object.freeze(Object.fromEntries(Object.entries(fields).map(([key, values]) => [key, Object.freeze(values)])));

  const lines = Object.freeze({
    unified: line({
      siteTypes: [
        entry('cross-sphere-civic-junction', 'Cross-Sphere Civic Junction', 'A mortal civic system is simultaneously important to several supernatural populations for incompatible reasons.', ['government', 'office', 'transit_station']),
        entry('mixed-neutral-market', 'Mixed Neutral Market', 'Trade, information, temporary shelter, and favors cross faction boundaries under an informal prohibition against open violence.', ['store', 'restaurant', 'bar', 'park']),
        entry('supernatural-refuge-node', 'Supernatural Refuge Node', 'Displaced supernatural residents use the site as temporary shelter while established factions debate responsibility.', ['lodging', 'church', 'hospital', 'education']),
        entry('occult-emergency-relay', 'Occult Emergency Relay', 'Responders from different supernatural communities use the location to pass warnings and redirect endangered people.', ['hospital', 'government', 'transit_station']),
        entry('dead-letter-archive', 'Dead-Letter Archive', 'Records, memories, ghost testimony, occult correspondence, and abandoned investigations accumulate here without one accepted interpretation.', ['library', 'office', 'historic', 'government']),
        entry('disputed-ward-intersection', 'Disputed Ward Intersection', 'Several protective systems overlap, causing one faction’s ward to obstruct or expose another faction’s activity.', ['road', 'historic', 'church', 'government']),
        entry('multi-cosmology-contamination-site', 'Multi-Cosmology Contamination Site', 'One supernatural problem is producing symptoms that different game lines classify in contradictory ways.', ['industrial', 'natural_feature', 'hospital', 'other']),
        entry('cross-faction-supply-node', 'Cross-Faction Supply Node', 'Blood, medicine, ritual materials, documents, food, shelter, and specialized labor move through the same concealed supply chain.', ['store', 'restaurant', 'hospital', 'industrial']),
        entry('occult-evidence-sink', 'Occult Evidence Sink', 'Reports and physical evidence from unrelated incidents are routinely stored, discarded, or misclassified at this location.', ['government', 'hospital', 'office', 'industrial']),
        entry('ritual-commons', 'Ritual Commons', 'Different supernatural groups use the same public or semi-public space at separate times for rites that unintentionally affect one another.', ['park', 'church', 'sports', 'education']),
        entry('boundary-refuge-corridor', 'Boundary Refuge Corridor', 'The site lies between recognized territories and is useful precisely because no single authority can safely claim it.', ['road', 'transit_station', 'lodging', 'park']),
        entry('supernatural-intermediary-house', 'Supernatural Intermediary House', 'Mortal and supernatural brokers translate etiquette, obligations, and practical access between factions that cannot meet directly.', ['restaurant', 'bar', 'office', 'lodging'])
      ],
      hiddenFunctions: [
        entry('translate-incompatible-obligations', 'Obligation Translation', 'The site converts favors and warnings from one supernatural society into terms another society can act upon.'),
        entry('separate-use-schedule', 'Separated Use Schedule', 'A concealed timetable prevents incompatible supernatural users from occupying the site simultaneously.'),
        entry('shared-cover-story', 'Shared Cover Story', 'Several factions maintain the same mundane explanation because exposing it would compromise all of them.'),
        entry('cross-sphere-quarantine', 'Cross-Sphere Quarantine', 'The location contains a threat no single supernatural faction understands well enough to manage alone.'),
        entry('neutral-message-routing', 'Neutral Message Routing', 'Messages are passed through trusted workers, objects, and routines that do not belong to any supernatural court.'),
        entry('refugee-triage', 'Refugee Triage', 'New arrivals are evaluated, concealed, and redirected before local factions decide whether to shelter or expel them.'),
        entry('mutual-evidence-suppression', 'Mutual Evidence Suppression', 'Different supernatural groups erase different parts of the same incident, leaving a deliberately incoherent record.'),
        entry('overlapping-ward-maintenance', 'Overlapping Ward Maintenance', 'Separate protective systems are quietly adjusted to prevent destructive interference.'),
        entry('shared-mortal-asset-protection', 'Shared Mortal Asset Protection', 'Several factions independently protect the same mortal institution or person for unrelated strategic reasons.'),
        entry('conflict-delay-mechanism', 'Conflict Delay Mechanism', 'The site exists to postpone a confrontation until parties can move vulnerable dependents and evidence elsewhere.')
      ],
      infrastructures: [
        entry('layered-access-keys', 'Layered Access Keys', 'Different doors, schedules, passwords, symbols, and social permissions grant access to different supernatural users.'),
        entry('multi-spectrum-warding', 'Multi-Spectrum Warding', 'Physical security, occult wards, spirit bargains, social taboos, and surveillance overlap without one unified design.'),
        entry('distributed-dead-drops', 'Distributed Dead Drops', 'Messages and supplies move through several mundane containers so no participant knows the entire route.'),
        entry('cross-faction-safe-rooms', 'Cross-Faction Safe Rooms', 'Separate concealed rooms are maintained for occupants whose supernatural natures cannot safely share one refuge.'),
        entry('evidence-fragmentation-system', 'Evidence Fragmentation System', 'Records are intentionally divided across mortal and supernatural custodians to prevent any one seizure from revealing the whole operation.'),
        entry('neutral-transport-chain', 'Neutral Transport Chain', 'Vehicles, transit passes, delivery schedules, and trusted drivers move people without exposing factional ownership.'),
        entry('ritual-time-share', 'Ritual Time-Share', 'The same physical area is reconfigured for different supernatural practices according to a carefully maintained calendar.'),
        entry('interference-monitoring-array', 'Interference Monitoring Array', 'Observers track when blood sorcery, spirit activity, Glamour, ghosts, and Awakened effects begin interfering with one another.'),
        entry('mixed-medical-cache', 'Mixed Medical Cache', 'The site stores mortal medicine alongside blood, talens, alchemical preparations, and emergency occult countermeasures.'),
        entry('jurisdiction-map-room', 'Jurisdiction Map Room', 'A concealed archive tracks contradictory territorial claims, safe routes, and temporary exceptions.')
      ],
      systemSecrets: [
        entry('secret-mutual-defense-pact', 'Undeclared Mutual-Defense Pact', 'Nominal enemies have agreed to protect the location because its destruction would endanger all their dependents.'),
        entry('hidden-third-party-beneficiary', 'Hidden Third-Party Beneficiary', 'A faction absent from local negotiations receives the greatest benefit from the site’s continued operation.'),
        entry('false-neutrality', 'False Neutrality', 'The neutral arrangement is quietly tilted toward one supernatural population through staffing, timing, or information control.'),
        entry('shared-catastrophic-liability', 'Shared Catastrophic Liability', 'Every faction has contributed to a concealed failure whose exposure would trigger retaliation across several societies.'),
        entry('misclassified-central-threat', 'Misclassified Central Threat', 'The force everyone is managing has been assigned to the wrong supernatural cosmology.'),
        entry('refugee-identity-substitution', 'Refugee Identity Substitution', 'Protected supernatural refugees are being hidden inside records belonging to dead, missing, or fabricated mortals.'),
        entry('forbidden-cross-training', 'Forbidden Cross-Training', 'Practitioners are exchanging methods across supernatural traditions despite political prohibitions.'),
        entry('evidence-broker-monopoly', 'Evidence Broker Monopoly', 'One intermediary controls which faction learns about each incident and profits from keeping interpretations divided.'),
        entry('sacrificial-mortal-buffer', 'Sacrificial Mortal Buffer', 'The arrangement protects supernatural users by allowing ordinary workers and residents to absorb institutional consequences.'),
        entry('planned-neutrality-collapse', 'Planned Neutrality Collapse', 'One participant is preparing to destroy the shared arrangement after extracting dependents, records, and resources.'),
        entry('cross-sphere-hostage', 'Cross-Sphere Hostage', 'A person, spirit, ghost, dream-being, or artifact important to several factions is concealed here.'),
        entry('world-seed-anomaly', 'World-Seed Anomaly', 'The site behaves differently from comparable locations because this chronicle’s world seed contains a rare overlapping condition.')
      ],
      custodians: [
        entry('mortal-intermediary-board', 'Mortal Intermediary Board', 'A group of ordinary professionals unknowingly preserves rules negotiated by supernatural patrons.'),
        entry('cross-faction-fixer', 'Cross-Faction Fixer', 'A broker survives by understanding enough etiquette to keep incompatible factions from meeting directly.'),
        entry('rotating-supernatural-stewards', 'Rotating Supernatural Stewards', 'Custody changes by night, season, emergency, or ritual schedule.'),
        entry('displaced-community-elder', 'Displaced Community Elder', 'A respected refugee maintains order without formal recognition from local supernatural authorities.'),
        entry('compromised-public-official', 'Compromised Public Official', 'An official manages access and records while believing they serve only one hidden interest.'),
        entry('neutral-medical-provider', 'Neutral Medical Provider', 'A clinician treats supernatural injuries under strict rules against recruitment and retaliation.'),
        entry('memory-keeper', 'Memory Keeper', 'A custodian preserves incidents and obligations that every faction would prefer to remember differently.'),
        entry('ward-technician', 'Ward Technician', 'A specialist maintains incompatible protective systems and conceals how often they nearly fail.'),
        entry('mortal-service-coordinator', 'Mortal Service Coordinator', 'A worker routes deliveries, access, and staff in ways that sustain the hidden arrangement.'),
        entry('unrecognized-entity-custodian', 'Unrecognized Entity Custodian', 'A supernatural being outside local classifications maintains the site more effectively than recognized factions do.')
      ],
      evidencePatterns: [
        entry('contradictory-supernatural-readings', 'Contradictory Readings', 'Different supernatural senses detect genuine but mutually incompatible signatures.'),
        entry('staggered-incident-times', 'Staggered Incident Times', 'Different categories of anomaly occur on separate schedules that share the same mundane trigger.'),
        entry('multi-agency-record-gaps', 'Multi-Agency Record Gaps', 'Several institutions each hold one missing part of the same incident sequence.'),
        entry('mixed-residue', 'Mixed Residue', 'Blood, spiritual, emotional, ghostly, and magical traces overlap without blending cleanly.'),
        entry('shared-witness-network', 'Shared Witness Network', 'The same workers repeatedly appear near incidents attributed to different supernatural causes.'),
        entry('rotating-security-failures', 'Rotating Security Failures', 'Cameras, alarms, memories, and spiritual observation fail in different combinations.'),
        entry('incompatible-map-annotations', 'Incompatible Map Annotations', 'Separate faction maps mark the site with different warnings and boundaries.'),
        entry('repeated-neutral-symbol', 'Repeated Neutral Symbol', 'A practical symbol appears in unrelated supernatural records as a warning not to escalate.'),
        entry('cross-contaminated-testimony', 'Cross-Contaminated Testimony', 'Witnesses combine details from several real incidents into one impossible story.'),
        entry('layered-erasure', 'Layered Erasure', 'Multiple cover-ups leave distinct gaps whose overlap proves several actors were present.')
      ],
      conflicts: [
        entry('cosmology-jurisdiction-dispute', 'Cosmology Jurisdiction Dispute', 'Each faction insists the central threat falls under its authority and rejects the others’ proposed remedy.'),
        entry('refugee-burden-conflict', 'Refugee Burden Conflict', 'Local powers disagree over who must shelter displaced supernatural people and who may recruit them.'),
        entry('ward-interference-conflict', 'Ward Interference Conflict', 'Protective measures from different traditions are damaging one another.'),
        entry('shared-mortal-asset-conflict', 'Shared Mortal Asset Conflict', 'Several factions depend on the same mortal institution and cannot agree how much influence is acceptable.'),
        entry('evidence-ownership-conflict', 'Evidence Ownership Conflict', 'Hunters, mages, vampires, spirits, and ghosts all want control of the same records or witnesses.'),
        entry('neutrality-enforcement-conflict', 'Neutrality Enforcement Conflict', 'No faction agrees who has authority to punish violations of the site’s informal rules.'),
        entry('resource-allocation-conflict', 'Resource Allocation Conflict', 'Blood, Glamour, essence, medicine, shelter, and attention cannot all be distributed without favoring one group.'),
        entry('cover-story-conflict', 'Cover-Story Conflict', 'One faction’s preferred explanation would expose another faction’s activity.'),
        entry('custodian-legitimacy-conflict', 'Custodian Legitimacy Conflict', 'The person keeping the site functional lacks recognition from every major supernatural authority.'),
        entry('evacuation-priority-conflict', 'Evacuation Priority Conflict', 'A crisis forces the custodians to decide which dependents, artifacts, and witnesses leave first.')
      ],
      consequences: [
        entry('multi-faction-retaliation', 'Multi-Faction Retaliation', 'Failure causes several supernatural groups to blame one another and mobilize simultaneously.'),
        entry('evidence-cascade', 'Evidence Cascade', 'Fragmented records suddenly align, exposing multiple supernatural operations at once.'),
        entry('refugee-dispersal', 'Refugee Dispersal', 'Protected residents scatter into surrounding neighborhoods and carry conflicts with them.'),
        entry('ward-collapse-chain', 'Ward Collapse Chain', 'One failing protection destabilizes every overlapping supernatural safeguard.'),
        entry('mortal-institutional-crisis', 'Mortal Institutional Crisis', 'The mundane institution supporting the site suffers scandal, closure, investigation, or loss of public trust.'),
        entry('territorial-reclassification', 'Territorial Reclassification', 'Several factions redraw their maps and begin treating nearby ordinary locations as contested ground.'),
        entry('cross-sphere-contamination', 'Cross-Sphere Contamination', 'A supernatural effect begins producing symptoms normally associated with another game line.'),
        entry('neutrality-war', 'Neutrality War', 'The collapse of informal rules turns the site into the first battlefield of a wider conflict.'),
        entry('custodian-abandonment', 'Custodian Abandonment', 'The only people who understood the arrangement withdraw, leaving incompatible users to improvise.'),
        entry('world-seed-divergence', 'World-Seed Divergence', 'The location becomes a major point where this chronicle diverges from other generated worlds.')
      ]
    }),

    vampire: line({
      siteTypes: [
        entry('feeding-permission-node', 'Feeding Permission Node', 'A controlled location where access to particular mortal populations is granted, traded, or revoked.', ['restaurant', 'bar', 'night_club', 'transit_station']),
        entry('haven-annex', 'Haven Annex', 'A secondary refuge provides daylight shelter, emergency supplies, or a fallback exit without serving as the owner’s primary haven.', ['lodging', 'office', 'industrial', 'historic']),
        entry('blood-logistics-depot', 'Blood Logistics Depot', 'Stored, diverted, purchased, or donated blood moves through the site under a mundane medical or commercial cover.', ['hospital', 'pharmacy', 'industrial', 'store']),
        entry('elysium-satellite', 'Elysium Satellite', 'The location supports arrivals, private conversations, security screening, or overflow functions for a protected Kindred gathering.', ['bar', 'restaurant', 'historic', 'lodging']),
        entry('retainer-administration-office', 'Retainer Administration Office', 'Mortal servants coordinate property, schedules, legal records, and crisis response for one or more Kindred.', ['office', 'government', 'store']),
        entry('domain-checkpoint', 'Domain Checkpoint', 'The site quietly verifies who enters, feeds within, or crosses a recognized Kindred territory.', ['road', 'transit_station', 'bar', 'store']),
        entry('prestation-ledger-house', 'Prestation Ledger House', 'Boons, favors, witnesses, and repayment conditions are recorded or arbitrated here.', ['office', 'library', 'historic']),
        entry('ghoul-clinic', 'Ghoul Clinic', 'A medical front monitors blood-bound retainers, treats unusual symptoms, and conceals long-term servitude.', ['hospital', 'pharmacy', 'office']),
        entry('masquerade-cleanup-site', 'Masquerade Cleanup Site', 'Evidence, witnesses, damaged property, and digital traces are processed after supernatural incidents.', ['industrial', 'government', 'office', 'hospital']),
        entry('thin-blood-alchemy-lab', 'Thin-Blood Alchemy Lab', 'Improvised equipment and scavenged ingredients support experimental blood alchemy outside court approval.', ['industrial', 'pharmacy', 'lodging', 'other']),
        entry('sheriff-staging-point', 'Sheriff Staging Point', 'Enforcers assemble, exchange intelligence, and prepare interventions without using an official court site.', ['industrial', 'office', 'transit_station']),
        entry('necromantic-obligation-house', 'Necromantic Obligation House', 'Deaths, estates, ghosts, and inherited debts are administered as one Hecata obligation network.', ['cemetery', 'historic', 'church', 'office'])
      ],
      hiddenFunctions: [
        entry('schedule-safe-feeding', 'Safe Feeding Scheduling', 'Retainers and workers steer selected mortals through predictable windows while separating competing predators.'),
        entry('verify-domain-passage', 'Domain Passage Verification', 'Arrival patterns, introductions, and mortal records are used to determine whether a visitor has permission to cross the area.'),
        entry('maintain-day-shelter', 'Day-Shelter Maintenance', 'A concealed refuge is ventilated, secured, supplied, and kept absent from public occupancy records.'),
        entry('launder-blood-supply', 'Blood-Supply Laundering', 'Medical, criminal, and private-donor sources are mixed so no single route reveals the true consumer.'),
        entry('erase-masquerade-evidence', 'Masquerade Evidence Erasure', 'Witness memories, recordings, physical damage, and institutional reports are altered through several mortal intermediaries.'),
        entry('broker-prestation', 'Prestation Brokerage', 'The site matches debtors, creditors, witnesses, and negotiators without requiring formal court attendance.'),
        entry('condition-retainers', 'Retainer Conditioning', 'Blood bonds, rewards, surveillance, and controlled access keep mortal servants loyal and dependent.'),
        entry('monitor-rival-domain', 'Rival Domain Monitoring', 'Staff and cameras track feeding patterns, unfamiliar vehicles, and changes in mortal routine across a disputed border.'),
        entry('test-thin-blood-formulas', 'Thin-Blood Formula Testing', 'Small controlled exposures determine how alchemical preparations interact with local resonance and blood quality.'),
        entry('manage-ghostly-debts', 'Ghostly Debt Management', 'The dead are questioned, compelled, placated, or exchanged as witnesses in Kindred political disputes.')
      ],
      infrastructures: [
        entry('light-sealed-refuge', 'Light-Sealed Refuge', 'Blackout construction, redundant locks, remote cameras, and concealed ventilation protect daytime occupants.'),
        entry('blood-cold-chain', 'Blood Cold Chain', 'Refrigeration, coded inventory, insulated transport, and falsified medical records preserve blood supplies.'),
        entry('retainer-communication-tree', 'Retainer Communication Tree', 'Mortal staff route warnings and instructions without any one servant understanding the whole domain.'),
        entry('witness-memory-protocol', 'Witness Memory Protocol', 'Selected ghouls, clinicians, and officials manage stories, medication, intimidation, and documentation after incidents.'),
        entry('feeding-permission-ledger', 'Feeding Permission Ledger', 'A concealed system records hunting rights, restricted populations, breaches, and favors owed.'),
        entry('underground-exit-chain', 'Underground Exit Chain', 'Basements, service corridors, tunnels, vehicles, and neighboring properties provide several escape routes.'),
        entry('social-screening-room', 'Social Screening Room', 'Retainers evaluate guests for status, weapons, blood sorcery, surveillance, and political intent.'),
        entry('ghoul-medical-station', 'Ghoul Medical Station', 'Equipment and records track blood dependence, healing, aging, and signs of divided loyalty.'),
        entry('necromantic-record-vault', 'Necromantic Record Vault', 'Estate files, death certificates, fetters, genealogies, and spirit testimony are stored together.'),
        entry('digital-masquerade-toolkit', 'Digital Masquerade Toolkit', 'Account access, footage manipulation, identity records, and automated rumor management support cover-ups.')
      ],
      systemSecrets: [
        entry('unauthorized-embrace', 'Unauthorized Embrace', 'A newly created vampire is being hidden from the court until responsibility can be shifted or negotiated.'),
        entry('forbidden-feeding-population', 'Forbidden Feeding Population', 'The custodian quietly permits predation on a population protected by local custom or decree.'),
        entry('secret-blood-bond', 'Secret Blood Bond', 'A politically important mortal or Kindred is bound to a patron no one suspects.'),
        entry('court-spy-network', 'Court Spy Network', 'Staff report conversations and arrivals to a rival court official.'),
        entry('diablerie-residue', 'Diablerie Residue', 'Evidence of a destroyed vampire remains concealed in blood, memory, or ghost testimony.'),
        entry('elder-in-torpor', 'Elder in Torpor', 'A dormant elder is hidden on or beneath the property while factions unknowingly compete over the surrounding domain.'),
        entry('ghoul-trafficking-route', 'Ghoul Trafficking Route', 'Blood-bound servants are being transferred between patrons under false employment or medical records.'),
        entry('thin-blood-protection-racket', 'Thin-Blood Protection Racket', 'Marginalized vampires receive shelter and supplies in exchange for dangerous work and political silence.'),
        entry('fabricated-domain-claim', 'Fabricated Domain Claim', 'The recorded territorial owner lacks the power or history claimed in court documents.'),
        entry('breached-masquerade-archive', 'Breached Masquerade Archive', 'The custodian possesses unaltered evidence from incidents officially declared resolved.'),
        entry('hecata-double-obligation', 'Hecata Double Obligation', 'The same death or estate has been promised to two incompatible necromantic claimants.'),
        entry('sheriff-private-agenda', 'Sheriff’s Private Agenda', 'Enforcement operations are being redirected to remove political enemies rather than genuine threats.')
      ],
      custodians: [
        entry('ghoul-property-manager', 'Ghoul Property Manager', 'A long-serving mortal manages leases, repairs, staff, and daylight emergencies for an absent patron.'),
        entry('anarch-route-warden', 'Anarch Route Warden', 'A mobile Kindred maintains warnings and safe passage without claiming formal territorial authority.'),
        entry('camarilla-deputy', 'Camarilla Deputy', 'A recognized subordinate administers the site while protecting a superior from direct responsibility.'),
        entry('thin-blood-alchemist', 'Thin-Blood Alchemist', 'An unrecognized practitioner keeps the operation useful enough that local powers tolerate their presence.'),
        entry('nosferatu-information-broker', 'Nosferatu Information Broker', 'A hidden observer trades surveillance and access records for protection and feeding opportunities.'),
        entry('hecata-estate-agent', 'Hecata Estate Agent', 'A specialist manages property, death records, heirs, ghosts, and inherited supernatural obligations.'),
        entry('toreador-host', 'Toreador Host', 'A social organizer shapes the clientele, atmosphere, and reputational value of the site.'),
        entry('banu-haqim-auditor', 'Banu Haqim Auditor', 'A quiet investigator tracks violations, debts, and predatory excess for a judgment not yet announced.'),
        entry('retainer-clinic-director', 'Retainer Clinic Director', 'A mortal clinician conceals the health effects of blood bonds and unexplained recovery.'),
        entry('unclaimed-neonate-collective', 'Unclaimed Neonate Collective', 'Several young vampires share custody because none can safely acknowledge sole ownership.')
      ],
      evidencePatterns: [
        entry('night-only-access', 'Night-Only Access Pattern', 'The most secure rooms and trusted staff become available only after sunset.'),
        entry('blood-inventory-discrepancies', 'Blood Inventory Discrepancies', 'Medical or storage records contain recurring losses that do not match spoilage or authorized use.'),
        entry('repeated-memory-gaps', 'Repeated Memory Gaps', 'Witnesses lose the same narrow portions of time while retaining surrounding details.'),
        entry('ageless-employee-record', 'Ageless Employee Record', 'Different names and documents appear across decades while photographs show the same face.'),
        entry('selective-camera-blindness', 'Selective Camera Blindness', 'Cameras fail or are redirected only during arrivals by certain individuals.'),
        entry('unusual-night-traffic', 'Unusual Night Traffic', 'Vehicles and visitors follow patterns unrelated to ordinary business demand.'),
        entry('blood-bond-symptoms', 'Blood-Bond Symptoms', 'Staff display coordinated loyalty, jealousy, withdrawal, and unusual recovery from injury.'),
        entry('court-symbol-concealment', 'Concealed Court Symbols', 'Etiquette marks and domain warnings are hidden inside ordinary signage or décor.'),
        entry('ghost-witness-overlap', 'Ghost-Witness Overlap', 'The dead and living remember the same visitor under different names.'),
        entry('sunrise-evacuation-routine', 'Sunrise Evacuation Routine', 'A precise pre-dawn sequence clears specific rooms and redirects security patrols.')
      ],
      conflicts: [
        entry('feeding-rights-dispute', 'Feeding Rights Dispute', 'Two coteries hold incompatible permission claims over the same mortal population.'),
        entry('masquerade-versus-profit', 'Masquerade Versus Profit', 'The mortal business becomes more profitable when operated in ways that increase exposure.'),
        entry('retainer-loyalty-split', 'Retainer Loyalty Split', 'Key mortal staff are bound, bribed, or emotionally loyal to different patrons.'),
        entry('court-recognition-dispute', 'Court Recognition Dispute', 'The practical custodian lacks formal standing while an absentee claimant holds official recognition.'),
        entry('thin-blood-exploitation', 'Thin-Blood Exploitation', 'Marginalized vampires are doing dangerous work in exchange for conditional shelter.'),
        entry('ghost-versus-kindred-claim', 'Ghost–Kindred Claim Conflict', 'The dead reject a Kindred property claim based on mortal ownership and court decree.'),
        entry('sheriff-overreach', 'Sheriff Overreach', 'Enforcement is escalating beyond the violation and threatening uninvolved dependents.'),
        entry('elder-awakening-risk', 'Elder Awakening Risk', 'Political conflict is disturbing a dormant vampire whose return would reorder every local claim.'),
        entry('blood-supply-contamination', 'Blood-Supply Contamination', 'The available blood carries disease, occult residue, emotional resonance, or deliberate sabotage.'),
        entry('boon-ledger-fraud', 'Boon Ledger Fraud', 'Records of prestation have been altered to manufacture obligations or erase repayment.')
      ],
      consequences: [
        entry('masquerade-breach', 'Masquerade Breach', 'Mortal evidence becomes coherent enough to attract organized investigation.'),
        entry('domain-war', 'Domain War', 'Feeding and access disputes escalate into direct Kindred violence and mortal retaliation.'),
        entry('retainer-collapse', 'Retainer Network Collapse', 'Blood-bound staff abandon posts, turn on patrons, or expose records during withdrawal.'),
        entry('elder-awakening', 'Elder Awakening', 'A dormant elder awakens hungry, disoriented, and politically obsolete.'),
        entry('blood-shortage', 'Blood Shortage', 'Disrupted logistics push predators toward riskier feeding and protected populations.'),
        entry('court-sanction', 'Court Sanction', 'The site and its custodians are formally censured, seized, or marked for destruction.'),
        entry('ghostly-retaliation', 'Ghostly Retaliation', 'Abused dead interfere with havens, feeding, retainers, and court testimony.'),
        entry('thin-blood-dispersal', 'Thin-Blood Dispersal', 'Displaced thin-bloods spread improvised operations into surrounding neighborhoods.'),
        entry('prestation-crisis', 'Prestation Crisis', 'Disputed debts cause alliances and protection arrangements to fail simultaneously.'),
        entry('mortal-front-collapse', 'Mortal Front Collapse', 'The business, charity, clinic, or property company providing cover closes under scrutiny.')
      ]
    }),

    werewolf: line({
      siteTypes: [
        entry('caern-catchment-site', 'Caern Catchment Site', 'The location receives spiritual traffic, duties, and consequences from a nearby caern without being part of its heart.', ['park', 'natural_feature', 'church', 'historic']),
        entry('moon-bridge-approach', 'Moon Bridge Approach', 'A sequence of physical and spiritual conditions prepares travelers for passage along a moon bridge.', ['road', 'park', 'natural_feature', 'transit_station']),
        entry('urban-spirit-court', 'Urban Spirit Court', 'Local spirits negotiate territory, offerings, and grievances through reflections of the site’s mundane purpose.', ['government', 'store', 'transit_station', 'industrial']),
        entry('bane-nest', 'Bane Nest', 'Exploitation, pollution, fear, or repetitive harm has created a stable refuge for hostile spirits.', ['industrial', 'hospital', 'road', 'other']),
        entry('kinfolk-cache', 'Kinfolk Cache', 'Trusted mortals store supplies, messages, weapons, medicine, and emergency shelter for Garou use.', ['store', 'lodging', 'office', 'restaurant']),
        entry('rite-ground', 'Rite Ground', 'The site supports a recurring Garou rite whose spiritual meaning depends on the real-world environment.', ['park', 'church', 'historic', 'sports']),
        entry('fetish-workshop', 'Fetish Workshop', 'Tools, materials, spirits, and ritual preparation are assembled under a plausible craft or maintenance cover.', ['industrial', 'store', 'office']),
        entry('pack-patrol-marker', 'Pack Patrol Marker', 'The location anchors a patrol route and records warnings, scents, spirit signs, and recent intrusions.', ['road', 'transit_station', 'park']),
        entry('healing-glade-fragment', 'Healing Glade Fragment', 'A small pocket supports recovery and spiritual cleansing without possessing the strength of a true caern.', ['park', 'natural_feature', 'hospital']),
        entry('umbral-choke-point', 'Umbral Choke Point', 'The local Gauntlet and spirit traffic compress movement into a narrow, predictable crossing.', ['transit_station', 'industrial', 'road']),
        entry('totem-shrine-network', 'Totem Shrine Network', 'Repeated offerings and community actions sustain a totem across several ordinary locations.', ['church', 'park', 'restaurant', 'education']),
        entry('contamination-breach', 'Contamination Breach', 'Environmental and emotional corruption is passing from mundane systems into the Umbra.', ['industrial', 'natural_feature', 'hospital', 'road'])
      ],
      hiddenFunctions: [
        entry('route-spirit-traffic', 'Spirit Traffic Routing', 'Offerings and barriers redirect spirits away from vulnerable areas and toward negotiated crossings.'),
        entry('maintain-pack-boundary', 'Pack Boundary Maintenance', 'Scent, symbols, witnesses, and spirit agreements establish a patrol boundary without a public territorial claim.'),
        entry('cleanse-contamination', 'Contamination Cleansing', 'The site slowly filters spiritual corruption through rites tied to maintenance, water, growth, or community care.'),
        entry('store-fetish-materials', 'Fetish Material Storage', 'Rare materials and prepared vessels are hidden among ordinary tools and supplies.'),
        entry('support-kinfolk-evacuation', 'Kinfolk Evacuation Support', 'Vehicles, shelter, documents, and medical supplies are prepared for rapid movement of endangered kin.'),
        entry('monitor-gauntlet', 'Gauntlet Monitoring', 'Observers track where the barrier between worlds thins, hardens, or carries hostile influence.'),
        entry('negotiate-spirit-chiminage', 'Chiminage Negotiation', 'The custodian coordinates offerings and services owed to local spirits.'),
        entry('hide-wounded-garou', 'Wounded Garou Refuge', 'The site conceals injured shapeshifters while managing witnesses, blood, and property damage.'),
        entry('map-wyrm-influence', 'Wyrm Influence Mapping', 'Incidents, pollution, despair, and predatory behavior are compared to identify a spreading source.'),
        entry('train-urban-pack', 'Urban Pack Training', 'Garou practice movement, restraint, observation, and spirit negotiation within the built environment.')
      ],
      infrastructures: [
        entry('spirit-marker-chain', 'Spirit Marker Chain', 'Offerings, scents, graffiti, planted objects, and spirit signs mark a route visible to trained observers.'),
        entry('kinfolk-supply-cache', 'Kinfolk Supply Cache', 'Medicine, clothing, tools, cash, documents, and emergency communications are hidden in ordinary storage.'),
        entry('gauntlet-observation-stations', 'Gauntlet Observation Stations', 'Several mundane vantage points record changes in spirit pressure and local resonance.'),
        entry('ritual-cleansing-system', 'Ritual Cleansing System', 'Water, fire, smoke, sound, soil, and community labor are combined into a repeatable cleansing practice.'),
        entry('fetish-preparation-bench', 'Fetish Preparation Bench', 'Craft tools and ritual space allow vessels to be repaired, prepared, and introduced to spirits.'),
        entry('pack-warning-network', 'Pack Warning Network', 'Kinfolk, spirits, animals, and trusted workers circulate alerts through ordinary routines.'),
        entry('umbral-escape-route', 'Umbral Escape Route', 'A sequence of crossings and safe reflections provides retreat when physical routes are blocked.'),
        entry('totem-offering-stations', 'Totem Offering Stations', 'Small offerings across several sites maintain a wider relationship with a patron spirit.'),
        entry('contamination-sampling-kit', 'Contamination Sampling Kit', 'Environmental samples, spirit testimony, and incident logs are compared for signs of Wyrm influence.'),
        entry('moon-phase-access-calendar', 'Moon-Phase Access Calendar', 'Rites and crossings are scheduled according to lunar phase, weather, and local spirit behavior.')
      ],
      systemSecrets: [
        entry('failed-cleansing-rite', 'Failed Cleansing Rite', 'A previous rite drove corruption deeper rather than removing it.'),
        entry('hidden-wyrm-taint', 'Hidden Wyrm Taint', 'A respected custodian or kinfolk supporter is concealing spiritual corruption.'),
        entry('pack-betrayal', 'Pack Betrayal', 'One pack member is redirecting patrols and warnings for a rival or hostile spirit.'),
        entry('weakening-totem', 'Weakening Totem', 'The patron spirit’s apparent demands conceal declining power and fear of abandonment.'),
        entry('kinfolk-exploitation', 'Kinfolk Exploitation', 'The pack’s practical support network depends on coercion and unpaid mortal sacrifice.'),
        entry('forbidden-spirit-pact', 'Forbidden Spirit Pact', 'The custodians negotiated with a dangerous spirit to solve an urgent problem.'),
        entry('stolen-caern-essence', 'Stolen Caern Essence', 'Power diverted from a sacred place is sustaining the site.'),
        entry('illegal-fetish', 'Forbidden Fetish', 'A powerful object contains a spirit bound without proper consent or rite.'),
        entry('black-spiral-infiltration', 'Black Spiral Infiltration', 'A hostile infiltrator is using legitimate environmental concerns to guide the pack toward corruption.'),
        entry('unacknowledged-cub', 'Unacknowledged Cub', 'A young shapeshifter is hidden here because recognition would trigger political or familial conflict.'),
        entry('territorial-lie', 'Territorial Lie', 'The pack’s claim is based on a fabricated history or deliberately misread spirit agreement.'),
        entry('spirit-hostage', 'Spirit Hostage', 'A local spirit is being confined and used to force cooperation from its court.')
      ],
      custodians: [
        entry('kinfolk-quartermaster', 'Kinfolk Quartermaster', 'A mortal ally maintains supplies, routes, records, and emergency plans for a pack.'),
        entry('theurge-spirit-keeper', 'Theurge Spirit Keeper', 'A ritual specialist negotiates with spirits and conceals how unstable the agreements have become.'),
        entry('pack-scout', 'Pack Scout', 'A mobile observer tracks physical and Umbral changes without claiming leadership.'),
        entry('rite-master', 'Rite Master', 'A respected ritualist preserves the site’s practice and decides who may participate.'),
        entry('urban-galliard', 'Urban Galliard', 'A storyteller maintains memory, warnings, and community relationships that keep the site socially protected.'),
        entry('spirit-court-envoy', 'Spirit-Court Envoy', 'A minor spirit or spirit-touched mortal translates demands between the pack and local spirit hierarchy.'),
        entry('wounded-pack-alpha', 'Wounded Pack Alpha', 'A weakened leader retains practical custody while rivals question their ability to protect the site.'),
        entry('environmental-organizer', 'Environmental Organizer', 'A mortal activist unknowingly performs much of the work needed to preserve the site’s spiritual health.'),
        entry('caern-refugee', 'Caern Refugee', 'A displaced Garou maintains inherited duties outside the sacred place where they originated.'),
        entry('independent-spirit-medium', 'Independent Spirit Medium', 'A non-Garou intermediary manages local spirits because the packs cannot agree on representation.')
      ],
      evidencePatterns: [
        entry('animal-behavior-shift', 'Animal Behavior Shift', 'Animals avoid, guard, or repeatedly visit the site in patterns unrelated to food or shelter.'),
        entry('gauntlet-pressure-cycle', 'Gauntlet Pressure Cycle', 'Spiritual sensitivity changes according to machinery, crowds, weather, or maintenance activity.'),
        entry('unexplained-environmental-recovery', 'Unexplained Environmental Recovery', 'Pollution or plant damage improves faster than mundane remediation explains.'),
        entry('territorial-scent-markers', 'Territorial Scent Markers', 'Chemical, animal, and ritual traces recur along a route invisible to ordinary visitors.'),
        entry('spirit-reflection-mismatch', 'Spirit Reflection Mismatch', 'The Umbral reflection preserves an older or more damaged version of the physical site.'),
        entry('lunar-incident-pattern', 'Lunar Incident Pattern', 'Incidents cluster around lunar phases but do not repeat identically.'),
        entry('kinfolk-repeat-visits', 'Kinfolk Repeat Visits', 'The same families and workers appear across unrelated practical tasks.'),
        entry('pollution-resonance', 'Pollution Resonance', 'Emotional hostility and environmental contamination rise together.'),
        entry('ritual-object-displacement', 'Ritual Object Displacement', 'Small objects return to meaningful positions after removal.'),
        entry('spirit-testimony-consensus', 'Spirit Testimony Consensus', 'Unrelated spirits repeat the same warning using different symbolic language.')
      ],
      conflicts: [
        entry('pack-jurisdiction-dispute', 'Pack Jurisdiction Dispute', 'Neighboring packs disagree over patrol duty, authority, and responsibility for collateral damage.'),
        entry('spirit-versus-human-need', 'Spirit–Human Need Conflict', 'The remedy demanded by local spirits would seriously harm ordinary residents or workers.'),
        entry('weaver-wyld-balance', 'Weaver–Wyld Balance Conflict', 'Reducing rigid control may release instability the pack is not prepared to manage.'),
        entry('kinfolk-autonomy', 'Kinfolk Autonomy Conflict', 'Mortal allies reject the sacrifices and secrecy expected by the pack.'),
        entry('cleansing-versus-containment', 'Cleansing Versus Containment', 'One faction wants to purge the site while another fears the corruption will spread if disturbed.'),
        entry('totem-demand-dispute', 'Totem Demand Dispute', 'Pack members interpret the patron spirit’s demands in incompatible ways.'),
        entry('caern-resource-allocation', 'Caern Resource Allocation', 'The site consumes attention and spiritual power needed elsewhere.'),
        entry('fomori-identification', 'Fomori Identification Conflict', 'Evidence points toward a human host, but the pack cannot agree whether the person is corrupted, controlled, or innocent.'),
        entry('rite-ownership', 'Rite Ownership Conflict', 'A necessary rite belongs to a tradition or elder unwilling to authorize its use.'),
        entry('urban-collateral-risk', 'Urban Collateral Risk', 'Direct action would expose the pack and endanger a dense mortal population.')
      ],
      consequences: [
        entry('spirit-court-hostility', 'Spirit-Court Hostility', 'Local spirits withdraw cooperation or actively obstruct Garou movement.'),
        entry('contamination-spread', 'Contamination Spread', 'Corruption enters connected water, waste, traffic, or emotional systems.'),
        entry('pack-fracture', 'Pack Fracture', 'Responsibility for failure divides the pack and weakens every patrol route.'),
        entry('kinfolk-exposure', 'Kinfolk Exposure', 'Mortal allies become visible to enemies, authorities, and rival supernatural groups.'),
        entry('gauntlet-hardening', 'Gauntlet Hardening', 'Crossing becomes more difficult and traps spirits on the wrong side.'),
        entry('gauntlet-collapse', 'Gauntlet Collapse', 'The barrier thins dangerously and allows uncontrolled spiritual movement.'),
        entry('totem-withdrawal', 'Totem Withdrawal', 'The patron spirit removes protection until a costly obligation is fulfilled.'),
        entry('caern-damage', 'Caern Damage', 'The nearby sacred place loses power or becomes politically compromised.'),
        entry('fomori-emergence', 'Fomori Emergence', 'Hidden corruption produces active hosts among workers or residents.'),
        entry('mortal-environmental-disaster', 'Mortal Environmental Disaster', 'The spiritual failure manifests as contamination, infrastructure damage, illness, or displacement.')
      ]
    }),

    breeds: line({
      siteTypes: [
        entry('fera-migration-waystation', 'Fera Migration Waystation', 'A hidden stop supports seasonal movement, shelter, food, information, and kin contacts.', ['road', 'transit_station', 'park', 'lodging']),
        entry('corax-information-cache', 'Corax Information Cache', 'Messages, stolen records, shiny tokens, and witness observations are hidden along an aerial route.', ['historic', 'office', 'industrial', 'other']),
        entry('ratkin-warren-node', 'Ratkin Warren Node', 'Waste systems, abandoned spaces, and service routes sustain a concealed Ratkin population.', ['industrial', 'transit_station', 'road', 'other']),
        entry('bastet-watchpost', 'Bastet Watchpost', 'A solitary observer monitors secrets, intrusions, and changes in territory from a carefully chosen vantage.', ['lodging', 'historic', 'park', 'office']),
        entry('gurahl-healing-refuge', 'Gurahl Healing Refuge', 'A protected site supports recovery, spiritual restoration, and long-term guardianship.', ['hospital', 'park', 'natural_feature', 'church']),
        entry('ananasi-web-node', 'Ananasi Web Node', 'Architecture, information, and human relationships form a controlled web of observation and obligation.', ['office', 'industrial', 'lodging', 'store']),
        entry('rokea-shore-access', 'Rokea Shore Access', 'Water access and human infrastructure provide a difficult transition between marine and terrestrial territory.', ['natural_feature', 'industrial', 'transit_station', 'park']),
        entry('mokolé-memory-site', 'Mokolé Memory Site', 'Environmental continuity, dreams, and inherited memory preserve knowledge of older conditions.', ['historic', 'natural_feature', 'park', 'church']),
        entry('nuwisha-trickster-ground', 'Nuwisha Trickster Ground', 'Contradictions, pride, and social performance make the site useful for exposing hidden assumptions.', ['bar', 'restaurant', 'government', 'education']),
        entry('mixed-fera-compact-post', 'Mixed Fera Compact Post', 'Several Changing Breeds maintain a practical agreement because no one species can protect the area alone.', ['park', 'store', 'restaurant', 'historic']),
        entry('kin-refuge-house', 'Kin Refuge House', 'Mortal relatives and species-kin provide temporary shelter, identity, and practical support.', ['lodging', 'restaurant', 'church', 'education']),
        entry('species-conflict-boundary', 'Species Conflict Boundary', 'The site marks where incompatible ecological instincts and inherited territorial rules collide.', ['natural_feature', 'road', 'park', 'industrial'])
      ],
      hiddenFunctions: [
        entry('coordinate-migration', 'Migration Coordination', 'The site synchronizes movement with weather, food, human traffic, and danger reports.'),
        entry('exchange-species-intelligence', 'Species Intelligence Exchange', 'Information is translated between breeds whose senses, priorities, and customs differ.'),
        entry('hide-kin-identities', 'Kin Identity Protection', 'Records, employment, housing, and family stories conceal vulnerable kin from enemies and institutions.'),
        entry('maintain-den-network', 'Den Network Maintenance', 'Several small refuges are supplied and rotated to prevent discovery.'),
        entry('monitor-ecological-imbalance', 'Ecological Imbalance Monitoring', 'Animal populations, waste, food, water, and human behavior are compared for signs of supernatural disruption.'),
        entry('arbitrate-hunting-rights', 'Hunting-Rights Arbitration', 'The custodian negotiates which species may hunt, observe, shelter, or intervene.'),
        entry('preserve-species-memory', 'Species Memory Preservation', 'Dreams, oral histories, physical marks, and environmental records preserve knowledge across generations.'),
        entry('route-water-access', 'Water Access Routing', 'Safe transitions between water, shore, drainage, and urban infrastructure are maintained.'),
        entry('manage-scavenger-economy', 'Scavenger Economy Management', 'Waste, discarded goods, abandoned property, and surplus food support hidden populations.'),
        entry('conceal-species-specific-rites', 'Species-Specific Rite Concealment', 'Ordinary activity is arranged to hide rites outsiders would misunderstand or condemn.')
      ],
      infrastructures: [
        entry('distributed-den-cache', 'Distributed Den Cache', 'Food, clothing, tools, documents, and ritual materials are spread across several species-appropriate shelters.'),
        entry('aerial-message-route', 'Aerial Message Route', 'High points, reflective markers, and hidden containers support Corax communication.'),
        entry('waste-tunnel-network', 'Waste-Tunnel Network', 'Service tunnels, dumpsters, drains, and abandoned spaces provide Ratkin movement and refuge.'),
        entry('solitary-vantage-chain', 'Solitary Vantage Chain', 'Secure observation points allow Bastet watchers to track territory without creating a fixed headquarters.'),
        entry('healing-earth-chamber', 'Healing Earth Chamber', 'Soil, water, herbs, quiet, and ritual protection support Gurahl healing.'),
        entry('architectural-web', 'Architectural Web', 'Sight lines, access control, digital links, and human relationships form an Ananasi monitoring structure.'),
        entry('shore-transition-cache', 'Shore Transition Cache', 'Clothing, tools, maps, and safe water access support Rokea movement on land.'),
        entry('memory-marker-sequence', 'Memory Marker Sequence', 'Physical and environmental markers trigger inherited memories and dreams.'),
        entry('kin-document-library', 'Kin Document Library', 'Identity papers, family histories, medical records, and safe contacts protect kin networks.'),
        entry('multi-species-warning-system', 'Multi-Species Warning System', 'Scents, calls, marks, messages, and mortal intermediaries communicate threats across breeds.')
      ],
      systemSecrets: [
        entry('broken-fera-compact', 'Broken Fera Compact', 'One breed has secretly violated an agreement that still prevents open conflict.'),
        entry('hidden-species-presence', 'Hidden Species Presence', 'A Changing Breed believed absent from the region maintains a small concealed population.'),
        entry('kin-lineage-concealment', 'Kin Lineage Concealment', 'A protected mortal family carries ancestry important to several breeds.'),
        entry('predation-coverup', 'Predation Cover-Up', 'The custodians concealed a killing because admitting it would trigger interspecies retaliation.'),
        entry('stolen-species-rite', 'Stolen Species Rite', 'A rite or sacred practice has been copied and used outside its originating breed.'),
        entry('ananasi-manipulation', 'Ananasi Manipulation', 'A wider conflict is being shaped through carefully controlled information and relationships.'),
        entry('corax-secret-sale', 'Corax Secret Sale', 'A critical warning was sold to more than one side with different omissions.'),
        entry('ratkin-population-surge', 'Ratkin Population Surge', 'A rapidly growing hidden population is consuming resources and drawing hostile attention.'),
        entry('rokea-terrestrial-violation', 'Rokea Terrestrial Violation', 'A land-based operation has violated an agreement with marine shapeshifters.'),
        entry('mokolé-memory-suppression', 'Mokolé Memory Suppression', 'A remembered event is being deliberately prevented from entering collective memory.'),
        entry('gurahl-protected-patient', 'Gurahl Protected Patient', 'A dangerous or politically important patient is being healed despite demands for execution.'),
        entry('nuwisha-engineered-crisis', 'Nuwisha-Engineered Crisis', 'A trickster deliberately created the current conflict to expose corruption or arrogance.')
      ],
      custodians: [
        entry('fera-route-keeper', 'Fera Route Keeper', 'A traveler maintains migration contacts and safe stops across species boundaries.'),
        entry('corax-message-broker', 'Corax Message Broker', 'An information trader manages warnings, secrets, and aerial caches.'),
        entry('ratkin-warren-mother', 'Ratkin Warren Keeper', 'A hidden leader protects a crowded population and its scavenger economy.'),
        entry('bastet-solitary-warden', 'Bastet Solitary Warden', 'A single watcher maintains the site through secrecy and selective intervention.'),
        entry('gurahl-healer', 'Gurahl Healer', 'A patient custodian prioritizes recovery and long-term ecological health.'),
        entry('ananasi-web-spinner', 'Ananasi Web Spinner', 'A calculating coordinator maintains relationships and surveillance structures.'),
        entry('rokea-shore-guide', 'Rokea Shore Guide', 'A rare intermediary helps marine shapeshifters navigate human coastal infrastructure.'),
        entry('mokolé-memory-keeper', 'Mokolé Memory Keeper', 'A custodian preserves dreams and records that span environmental eras.'),
        entry('nuwisha-provocateur', 'Nuwisha Provocateur', 'A trickster protects the site by making predators and authorities reveal themselves.'),
        entry('mixed-fera-council', 'Mixed Fera Council', 'Representatives from several breeds share unstable collective custody.')
      ],
      evidencePatterns: [
        entry('species-specific-tracks', 'Species-Specific Track Pattern', 'Tracks and access signs suggest animals behaving with coordinated human intelligence.'),
        entry('unusual-animal-migration', 'Unusual Migration Pattern', 'Animals and hidden visitors move through the site outside expected seasonal routes.'),
        entry('scavenger-resource-disappearance', 'Scavenger Resource Disappearance', 'Waste and abandoned goods vanish in organized patterns.'),
        entry('high-vantage-disturbance', 'High-Vantage Disturbance', 'Rooftops and towers show repeated small disturbances without ordinary access.'),
        entry('rapid-healing-traces', 'Rapid Healing Traces', 'Blood and injury evidence indicates recovery beyond normal biology.'),
        entry('web-like-information-overlap', 'Web-Like Information Overlap', 'Unrelated people repeat details they should not all know.'),
        entry('shore-entry-anomalies', 'Shore Entry Anomalies', 'Water access shows signs of heavy use without matching boats or swimmers.'),
        entry('ancestral-dream-repetition', 'Ancestral Dream Repetition', 'Different people report the same ancient environmental imagery.'),
        entry('kin-family-recurrence', 'Kin Family Recurrence', 'The same family names appear around hidden incidents across generations.'),
        entry('multi-species-warning-marks', 'Multi-Species Warning Marks', 'Different symbolic systems repeat the same warning around the site.')
      ],
      conflicts: [
        entry('species-hunting-rights', 'Species Hunting-Rights Conflict', 'Different breeds claim incompatible rights over prey, territory, and intervention.'),
        entry('kin-custody-dispute', 'Kin Custody Dispute', 'Several groups claim authority to protect or recruit the same mortal family.'),
        entry('migration-versus-development', 'Migration Versus Development', 'Construction threatens a route whose importance is invisible to human planners.'),
        entry('solitary-versus-collective-rule', 'Solitary Versus Collective Rule', 'A solitary custodian rejects oversight from a multi-species council.'),
        entry('predator-prey-balance', 'Predator–Prey Balance Conflict', 'Correcting one species imbalance would harm another hidden population.'),
        entry('secret-ownership', 'Secret Ownership Conflict', 'Information or memory considered communal is being treated as private property.'),
        entry('water-land-jurisdiction', 'Water–Land Jurisdiction Conflict', 'Marine and terrestrial shapeshifters disagree where responsibility begins.'),
        entry('scavenger-public-health', 'Scavenger–Public Health Conflict', 'The hidden population depends on systems mortals are trying to clean up or close.'),
        entry('healing-versus-justice', 'Healing Versus Justice', 'A healer protects someone other factions want punished.'),
        entry('trickster-collateral-damage', 'Trickster Collateral Damage', 'A revelatory prank is endangering kin and ordinary residents.')
      ],
      consequences: [
        entry('migration-route-collapse', 'Migration Route Collapse', 'Displaced supernatural populations enter unfamiliar territories and trigger new conflicts.'),
        entry('interspecies-retaliation', 'Interspecies Retaliation', 'A hidden violation produces reprisals across several breeds.'),
        entry('kin-exposure', 'Kin Exposure', 'Protected family networks become visible to enemies and institutions.'),
        entry('ecological-cascade', 'Ecological Cascade', 'Changes in one hidden population destabilize animals, waste, food, and human activity.'),
        entry('warren-dispersal', 'Warren Dispersal', 'A concealed community scatters through infrastructure and nearby properties.'),
        entry('memory-loss', 'Species Memory Loss', 'Knowledge needed to understand an old threat becomes inaccessible.'),
        entry('shore-conflict', 'Shore Conflict', 'Marine and land-based supernatural populations begin treating access points as hostile territory.'),
        entry('compact-dissolution', 'Compact Dissolution', 'An old agreement fails and every protected route must be renegotiated.'),
        entry('human-wildlife-panic', 'Human–Wildlife Panic', 'Mortal authorities respond aggressively to unexplained animal incidents.'),
        entry('predator-emergence', 'Hidden Predator Emergence', 'A concealed supernatural predator begins hunting openly enough to alter local behavior.')
      ]
    }),

    hunter: line({
      siteTypes: [
        entry('hunter-safehouse', 'Hunter Safehouse', 'A concealed refuge supports rest, debriefing, treatment, and emergency disappearance.', ['lodging', 'church', 'office', 'other']),
        entry('evidence-analysis-lab', 'Evidence Analysis Lab', 'Physical, digital, medical, and testimonial evidence is compared outside compromised institutions.', ['office', 'library', 'hospital', 'industrial']),
        entry('observation-post', 'Observation Post', 'The site provides repeatable surveillance of a suspected supernatural route or target.', ['lodging', 'office', 'historic', 'road']),
        entry('witness-shelter', 'Witness Shelter', 'Survivors and witnesses are hidden inside ordinary housing, services, or employment.', ['lodging', 'church', 'hospital', 'education']),
        entry('armory-cache', 'Armory Cache', 'Weapons, protective equipment, restraints, and specialized countermeasures are stored under a mundane cover.', ['industrial', 'store', 'office']),
        entry('hunter-dead-drop', 'Hunter Dead Drop', 'Cells exchange evidence and warnings without exposing identities or permanent bases.', ['road', 'transit_station', 'park', 'store']),
        entry('false-positive-trap', 'False-Positive Trap', 'The site repeatedly produces suspicious evidence that can lure hunters into harming innocents.', ['hospital', 'lodging', 'bar', 'other']),
        entry('compromised-agency-node', 'Compromised Agency Node', 'A legitimate institution contains both useful investigators and concealed supernatural influence.', ['government', 'hospital', 'office']),
        entry('containment-site', 'Containment Site', 'A person, object, or entity is being held while hunters debate whether containment is possible or ethical.', ['industrial', 'hospital', 'government', 'historic']),
        entry('survivor-recovery-clinic', 'Survivor Recovery Clinic', 'Trauma care, practical aid, and security are offered to people harmed by supernatural events.', ['hospital', 'church', 'office']),
        entry('bait-operation-site', 'Bait Operation Site', 'The location is arranged to attract or expose a supernatural predator under controlled observation.', ['bar', 'restaurant', 'lodging', 'park']),
        entry('counter-surveillance-hub', 'Counter-Surveillance Hub', 'Hunters detect whether targets, authorities, or rival cells are monitoring their movement.', ['office', 'transit_station', 'store', 'road'])
      ],
      hiddenFunctions: [
        entry('correlate-cases', 'Case Correlation', 'Separate incidents are compared by victim, date, method, location, and institutional response.'),
        entry('protect-witnesses', 'Witness Protection', 'Housing, transport, communication, and identity support keep survivors beyond a predator’s reach.'),
        entry('test-countermeasures', 'Countermeasure Testing', 'Protective tools and tactics are evaluated against controlled evidence before field use.'),
        entry('screen-cell-members', 'Cell Screening', 'New allies are evaluated for coercion, supernatural influence, recklessness, and divided loyalty.'),
        entry('preserve-unaltered-evidence', 'Unaltered Evidence Preservation', 'Original records and samples are kept outside institutions likely to erase or misclassify them.'),
        entry('map-supernatural-routines', 'Routine Mapping', 'Repeated target movement is reconstructed without assuming one supernatural explanation too early.'),
        entry('coordinate-extractions', 'Extraction Coordination', 'Drivers, safehouses, medical support, and distraction teams move endangered people quickly.'),
        entry('identify-compromised-authorities', 'Compromised Authority Identification', 'Response patterns reveal which officials redirect, delay, or destroy useful evidence.'),
        entry('contain-dangerous-artifact', 'Artifact Containment', 'A dangerous object is isolated while the cell researches its origin and effects.'),
        entry('deprogram-survivors', 'Survivor Deprogramming', 'The site helps people recover from blood bonds, supernatural coercion, cult control, or altered memory.')
      ],
      infrastructures: [
        entry('air-gapped-evidence-vault', 'Air-Gapped Evidence Vault', 'Original files, samples, and recordings are stored without network exposure.'),
        entry('safehouse-rotation-system', 'Safehouse Rotation System', 'Shelter locations and routes change according to threat level and surveillance reports.'),
        entry('counter-surveillance-suite', 'Counter-Surveillance Suite', 'Cameras, radio monitoring, route checks, and digital tools detect pursuit and infiltration.'),
        entry('medical-decontamination-room', 'Medical Decontamination Room', 'The site treats injuries, unknown biological exposure, and supernatural contamination.'),
        entry('witness-identity-kit', 'Witness Identity Kit', 'Documents, clothing, phones, funds, and employment contacts support emergency relocation.'),
        entry('specialized-restraint-system', 'Specialized Restraint System', 'Layered physical and improvised occult restraints hold dangerous captives temporarily.'),
        entry('distributed-armory', 'Distributed Armory', 'Equipment is divided among several caches so one raid cannot disarm the cell.'),
        entry('case-linkage-wall', 'Case-Linkage Wall', 'Maps, photographs, timelines, and records expose patterns hidden by institutional separation.'),
        entry('burn-notice-protocol', 'Burn-Notice Protocol', 'Codes and emergency procedures tell allies when a site, identity, or communication channel is compromised.'),
        entry('anonymous-tip-routing', 'Anonymous Tip Routing', 'Reports pass through several intermediaries to protect witnesses and investigators.')
      ],
      systemSecrets: [
        entry('compromised-cell-member', 'Compromised Cell Member', 'A trusted hunter is blood-bound, possessed, blackmailed, or otherwise controlled.'),
        entry('fabricated-case-link', 'Fabricated Case Link', 'Someone has connected unrelated incidents to manipulate the cell toward a chosen target.'),
        entry('protected-supernatural-informant', 'Protected Supernatural Informant', 'The site shelters a supernatural source whose cooperation would divide the cell.'),
        entry('civilian-casualty-coverup', 'Civilian Casualty Cover-Up', 'A previous operation harmed innocents and the surviving hunters concealed responsibility.'),
        entry('illegal-agency-access', 'Illegal Agency Access', 'A hunter is abusing official systems and putting uninvolved colleagues at risk.'),
        entry('bait-is-a-real-person', 'Living Bait', 'The apparent operation depends on exposing a person who does not understand the danger.'),
        entry('artifact-dependence', 'Artifact Dependence', 'The cell relies on a supernatural object it cannot safely control.'),
        entry('predatory-vigilante-faction', 'Predatory Vigilante Faction', 'A violent subgroup is using the investigation to justify attacks on vulnerable people.'),
        entry('witness-memory-edit', 'Witness Memory Editing', 'The hunters altered a witness’s memory or testimony to preserve an operation.'),
        entry('false-safehouse', 'False Safehouse', 'The refuge is known to the enemy and being used to map the wider support network.'),
        entry('handler-double-agency', 'Handler Double Agency', 'The person supplying intelligence serves another institution or supernatural patron.'),
        entry('contained-entity-is-innocent', 'Wrongful Containment', 'The entity held here is dangerous only because of what the hunters have done to it.')
      ],
      custodians: [
        entry('cell-quartermaster', 'Cell Quartermaster', 'A practical organizer manages equipment, funds, routes, and emergency logistics.'),
        entry('survivor-advocate', 'Survivor Advocate', 'A trauma-informed custodian prioritizes witness safety over operational speed.'),
        entry('agency-insider', 'Agency Insider', 'A legitimate official quietly preserves evidence and access from within a compromised institution.'),
        entry('occult-researcher', 'Occult Researcher', 'A specialist compares traditions and evidence without assuming every threat follows one mythology.'),
        entry('field-medic', 'Field Medic', 'A clinician treats injuries and exposure while protecting patient identities.'),
        entry('counter-surveillance-specialist', 'Counter-Surveillance Specialist', 'A technical observer monitors pursuit, digital compromise, and physical infiltration.'),
        entry('community-watch-organizer', 'Community Watch Organizer', 'A local resident turns ordinary relationships into warnings and protection.'),
        entry('retired-investigator', 'Retired Investigator', 'An experienced custodian maintains old cases and contacts outside official oversight.'),
        entry('faith-driven-warden', 'Faith-Driven Warden', 'A religious protector combines practical security with a strict moral interpretation of the threat.'),
        entry('supernatural-informant', 'Supernatural Informant', 'A nonhuman source helps maintain the site while concealing its own agenda.')
      ],
      evidencePatterns: [
        entry('cross-case-victim-pattern', 'Cross-Case Victim Pattern', 'Victims share routines, services, or vulnerabilities overlooked by separate investigations.'),
        entry('repeated-response-delay', 'Repeated Response Delay', 'Emergency and investigative systems fail at the same stages across different incidents.'),
        entry('camera-and-memory-disagreement', 'Camera–Memory Disagreement', 'Recordings and witness memories contradict one another in repeatable ways.'),
        entry('medical-impossibility', 'Medical Impossibility', 'Injuries, blood loss, healing, or toxicology cannot be reconciled with ordinary causes.'),
        entry('identity-record-discontinuity', 'Identity Record Discontinuity', 'A suspect’s records change names and dates while preserving behavior and associates.'),
        entry('institutional-erasure', 'Institutional Erasure', 'Reports disappear or are recoded after reaching a particular office or supervisor.'),
        entry('predator-route-pattern', 'Predator Route Pattern', 'Disappearances follow transit, nightlife, work, or service routes rather than random geography.'),
        entry('survivor-story-overlap', 'Survivor Story Overlap', 'People who never met repeat the same sensory and behavioral details.'),
        entry('artifact-proximity-effect', 'Artifact Proximity Effect', 'Symptoms and incidents cluster around the movement of one object.'),
        entry('counter-surveillance-reaction', 'Counter-Surveillance Reaction', 'The suspected target changes behavior immediately after the hunters alter observation methods.')
      ],
      conflicts: [
        entry('evidence-versus-action', 'Evidence Versus Action', 'Some hunters demand immediate intervention while others insist the case is not yet proven.'),
        entry('witness-safety-versus-operation', 'Witness Safety Versus Operation', 'Protecting survivors conflicts with preserving surveillance and access.'),
        entry('supernatural-informant-trust', 'Informant Trust Conflict', 'The cell depends on a supernatural source it cannot fully verify.'),
        entry('agency-jurisdiction', 'Agency Jurisdiction Conflict', 'Officials and independent hunters compete over evidence and authority.'),
        entry('containment-ethics', 'Containment Ethics Conflict', 'The cell disagrees whether holding the entity is necessary, cruel, or strategically foolish.'),
        entry('civilian-collateral-risk', 'Civilian Collateral Risk', 'The easiest operation would endanger workers, residents, or bystanders.'),
        entry('vigilante-escalation', 'Vigilante Escalation', 'An aggressive faction is turning suspicion into public violence.'),
        entry('resource-priority', 'Resource Priority Conflict', 'The cell cannot protect every witness, investigate every site, and maintain every safehouse.'),
        entry('burned-identity', 'Burned Identity Conflict', 'One member’s compromised identity threatens the entire support network.'),
        entry('truth-versus-recovery', 'Truth Versus Recovery', 'Investigators want testimony from a survivor who needs distance from the case.')
      ],
      consequences: [
        entry('cell-exposure', 'Cell Exposure', 'Targets and authorities identify members, vehicles, safehouses, and support contacts.'),
        entry('witness-retaliation', 'Witness Retaliation', 'A protected survivor is attacked, coerced, or publicly discredited.'),
        entry('false-positive-casualties', 'False-Positive Casualties', 'Innocent people are harmed and community trust collapses.'),
        entry('evidence-destruction', 'Evidence Destruction', 'Original records and samples are lost, leaving only contested copies.'),
        entry('contained-threat-release', 'Contained Threat Release', 'The captive or artifact escapes with knowledge of the hunters’ methods.'),
        entry('agency-crackdown', 'Agency Crackdown', 'Law enforcement treats the cell as criminals or extremists.'),
        entry('supernatural-counterhunt', 'Supernatural Counter-Hunt', 'The investigated faction begins identifying and targeting hunters systematically.'),
        entry('support-network-collapse', 'Support Network Collapse', 'Safehouses, medics, drivers, and civilian allies withdraw after a breach.'),
        entry('case-fragmentation', 'Case Fragmentation', 'Distrust divides evidence among cells that can no longer coordinate.'),
        entry('public-panic', 'Public Panic', 'Partial evidence spreads without context and produces dangerous rumor and vigilantism.')
      ]
    }),

    changeling: line({
      siteTypes: [
        entry('freehold-annex', 'Freehold Annex', 'A secondary location supports hospitality, storage, meetings, or refuge for a nearby freehold.', ['historic', 'church', 'restaurant', 'lodging']),
        entry('trod-gate', 'Trod Gate', 'A shifting entrance connects the mundane world to a path through the Dreaming.', ['park', 'road', 'historic', 'transit_station']),
        entry('glamour-well', 'Glamour Well', 'Repeated creativity, emotion, wonder, or performance generates a recoverable source of Glamour.', ['education', 'park', 'bar', 'restaurant']),
        entry('chimera-nest', 'Chimera Nest', 'Imagined beings gather, reproduce, hide, or hunt around a stable pattern of mortal attention.', ['park', 'education', 'historic', 'other']),
        entry('oath-house', 'Oath House', 'Promises, hospitality, gifts, and inherited obligations acquire supernatural force here.', ['lodging', 'church', 'historic', 'restaurant']),
        entry('revel-ground', 'Revel Ground', 'Celebration and performance temporarily strengthen the Dreaming and alter social roles.', ['bar', 'restaurant', 'park', 'sports']),
        entry('banality-sink', 'Banality Sink', 'Exhaustion, standardization, surveillance, and emotional suppression drain Glamour from the surrounding area.', ['office', 'government', 'industrial', 'education']),
        entry('nightmare-market', 'Nightmare Market', 'Fear, humiliation, secrets, and dangerous dreams are traded or harvested.', ['bar', 'night_club', 'store', 'road']),
        entry('dreamer-sanctuary', 'Dreamer Sanctuary', 'Creative mortals receive protection and practical support from pressures that would extinguish their imagination.', ['education', 'church', 'lodging', 'park']),
        entry('memory-garden', 'Memory Garden', 'Stories and personal recollections sustain a Dreaming landscape that no longer matches the physical site.', ['park', 'historic', 'cemetery', 'church']),
        entry('seasonal-court-post', 'Seasonal Court Post', 'The location supports diplomacy, celebration, or enforcement associated with a seasonal court.', ['historic', 'restaurant', 'park', 'government']),
        entry('enchanted-workshop', 'Enchanted Workshop', 'Craft, performance, food, repair, or design provides cover for shaping chimerical materials.', ['industrial', 'store', 'education', 'restaurant'])
      ],
      hiddenFunctions: [
        entry('route-trod-travel', 'Trod Travel Routing', 'The site regulates when and how travelers approach a Dreaming path.'),
        entry('cultivate-glamour', 'Glamour Cultivation', 'Events and relationships are arranged to encourage genuine creativity without exhausting the dreamers.'),
        entry('shelter-chimerae', 'Chimera Shelter', 'The site provides stable attention and symbolic structure for vulnerable chimerae.'),
        entry('enforce-oaths', 'Oath Enforcement', 'Hospitality, gifts, names, and remembered promises are used to bind behavior.'),
        entry('protect-dreamers', 'Dreamer Protection', 'Mortal creatives are shielded from exploitation, burnout, and hostile fae attention.'),
        entry('filter-banality', 'Banality Filtration', 'Ritualized play, story, color, and community action reduce emotional flattening.'),
        entry('harvest-nightmares', 'Nightmare Harvesting', 'Fear and humiliation are collected, redirected, or weaponized.'),
        entry('preserve-memory-landscape', 'Memory-Landscape Preservation', 'Stories and recurring acts keep a vanished place alive in the Dreaming.'),
        entry('mediate-court-access', 'Court Access Mediation', 'Visitors are screened and introduced according to seasonal etiquette.'),
        entry('shape-chimerical-material', 'Chimerical Material Shaping', 'Ordinary craft conceals work on objects that exist fully only in the Dreaming.')
      ],
      infrastructures: [
        entry('trod-marker-sequence', 'Trod Marker Sequence', 'Art, signs, sounds, weather, and emotional cues identify the correct approach to a shifting path.'),
        entry('glamour-gathering-calendar', 'Glamour Gathering Calendar', 'Events are scheduled to cultivate inspiration without draining the same dreamers repeatedly.'),
        entry('oath-record-archive', 'Oath Record Archive', 'Stories, gifts, names, and symbolic objects preserve supernatural promises.'),
        entry('chimera-feeding-stations', 'Chimera Feeding Stations', 'Attention, stories, play, and crafted symbols sustain local chimerae.'),
        entry('banality-buffer-room', 'Banality Buffer Room', 'A protected space uses sensory richness and trusted company to help Kithain recover.'),
        entry('enchanted-tool-cache', 'Enchanted Tool Cache', 'Craft tools and chimerical materials are hidden among mundane supplies.'),
        entry('dreamer-support-network', 'Dreamer Support Network', 'Housing, meals, venues, commissions, and community care keep creative mortals stable.'),
        entry('seasonal-court-signage', 'Seasonal Court Signage', 'Subtle colors, decorations, and social arrangements indicate changing court influence.'),
        entry('memory-story-circuit', 'Memory Story Circuit', 'Repeated storytelling across several sites maintains a shared Dreaming landscape.'),
        entry('nightmare-containment-stage', 'Nightmare Containment Stage', 'Performance and ritual give dangerous fears a controlled symbolic form.')
      ],
      systemSecrets: [
        entry('stolen-freehold-title', 'Stolen Freehold Title', 'The recognized custodian’s claim rests on an oath or deed taken from another fae.'),
        entry('false-trod-destination', 'False Trod Destination', 'The path no longer reaches the place its users believe it does.'),
        entry('exhausted-dreamer', 'Exhausted Dreamer', 'The site’s Glamour depends on a mortal creator being quietly consumed by the demand.'),
        entry('hostile-chimera-bond', 'Hostile Chimera Bond', 'A beloved local chimera is bound to a predatory or manipulative patron.'),
        entry('broken-oath-foundation', 'Broken Oath Foundation', 'The site’s safety depends on a promise already violated but not yet acknowledged.'),
        entry('thallain-infiltration', 'Thallain Infiltration', 'A hostile fae influence is using legitimate community conflict to harvest fear.'),
        entry('banality-profiteer', 'Banality Profiteer', 'A custodian benefits from the emotional exhaustion the site publicly claims to resist.'),
        entry('seasonal-court-spy', 'Seasonal Court Spy', 'A court representative reports private revels and negotiations to a rival.'),
        entry('memory-replacement', 'Memory Replacement', 'A comforting local story was created to conceal a more dangerous Dreaming history.'),
        entry('enchanted-mortal-consent', 'Enchanted Mortal Consent Violation', 'A mortal ally was drawn into supernatural obligations without informed consent.'),
        entry('nightmare-is-protective', 'Protective Nightmare', 'The terrifying entity contained here is preventing something worse from entering.'),
        entry('freehold-glamour-debt', 'Freehold Glamour Debt', 'The site owes more Glamour or service to a patron than its custodians can safely provide.')
      ],
      custodians: [
        entry('freehold-steward', 'Freehold Steward', 'A practical court official manages hospitality, resources, and access.'),
        entry('motley-route-keeper', 'Motley Route Keeper', 'A small-group organizer maintains trod markers and warnings outside noble control.'),
        entry('dreamer-patron', 'Dreamer Patron', 'A fae or enchanted mortal supports creators while trying not to exploit them.'),
        entry('chimera-herder', 'Chimera Herder', 'A specialist manages imagined beings whose needs and instincts differ sharply.'),
        entry('oath-recorder', 'Oath Recorder', 'A custodian remembers exact promises, gifts, names, and hospitality obligations.'),
        entry('commoner-organizer', 'Commoner Organizer', 'A practical Kithain maintains mutual aid and resists aristocratic control.'),
        entry('seasonal-envoy', 'Seasonal Envoy', 'A court representative balances diplomacy with hidden instructions.'),
        entry('enchanted-craftsperson', 'Enchanted Craftsperson', 'A mortal or fae artisan maintains chimerical tools through ordinary work.'),
        entry('memory-gardener', 'Memory Gardener', 'A storyteller curates which local memories remain alive in the Dreaming.'),
        entry('nightmare-warden', 'Nightmare Warden', 'A damaged but disciplined custodian contains dangerous fear and hostile chimerae.')
      ],
      evidencePatterns: [
        entry('shared-imaginary-detail', 'Shared Imaginary Detail', 'People who never met describe the same impossible color, creature, or place.'),
        entry('emotional-weather', 'Emotional Weather', 'Mood and sensory conditions change sharply according to events and attention.'),
        entry('childhood-map-consistency', 'Childhood Map Consistency', 'Children draw matching routes and landmarks absent from physical maps.'),
        entry('creative-output-convergence', 'Creative Output Convergence', 'Unrelated artists repeat symbols, characters, and stories associated with the site.'),
        entry('oath-consequence-pattern', 'Oath Consequence Pattern', 'People who break specific promises suffer symbolically appropriate misfortune.'),
        entry('seasonal-personality-shift', 'Seasonal Personality Shift', 'Staff and regulars adopt different social roles as seasons or local festivals change.'),
        entry('banality-recovery-gradient', 'Banality Recovery Gradient', 'Creativity and emotional range improve measurably closer to a protected room or event.'),
        entry('chimera-interaction-traces', 'Chimera Interaction Traces', 'Objects and spaces react to beings most mortals cannot perceive.'),
        entry('memory-disagreement', 'Memory Disagreement', 'Long-term residents remember incompatible versions of the same local history.'),
        entry('trod-time-displacement', 'Trod Time Displacement', 'Travelers lose or gain time after following a particular sequence through the site.')
      ],
      conflicts: [
        entry('court-versus-commoner-control', 'Court Versus Commoner Control', 'Noble authority conflicts with the people doing the practical work of sustaining the site.'),
        entry('glamour-versus-dreamer-health', 'Glamour Versus Dreamer Health', 'The site thrives by demanding more creative energy than its mortal contributors can safely give.'),
        entry('trod-access-dispute', 'Trod Access Dispute', 'Factions disagree who may travel, charge passage, or close the path.'),
        entry('oath-interpretation', 'Oath Interpretation Conflict', 'Parties agree on the promise’s words but not its supernatural meaning.'),
        entry('chimera-danger', 'Chimera Danger Conflict', 'A beloved imagined being is becoming dangerous to mortals or fae.'),
        entry('banality-accommodation', 'Banality Accommodation Conflict', 'Practical survival requires cooperating with institutions that weaken the Dreaming.'),
        entry('seasonal-court-rivalry', 'Seasonal Court Rivalry', 'Court influence changes faster than local obligations can be renegotiated.'),
        entry('memory-truth-versus-comfort', 'Memory Truth Versus Comfort', 'Restoring the real Dreaming history would destroy a protective community story.'),
        entry('nightmare-use-ethics', 'Nightmare Use Ethics', 'The custodians disagree whether fear may be weaponized for protection.'),
        entry('enchanted-mortal-autonomy', 'Enchanted Mortal Autonomy', 'Mortal allies reject decisions made about their lives by fae patrons.')
      ],
      consequences: [
        entry('freehold-starvation', 'Freehold Starvation', 'A nearby freehold loses Glamour and becomes politically vulnerable.'),
        entry('trod-collapse', 'Trod Collapse', 'Travelers are stranded, redirected, or lost in the Dreaming.'),
        entry('dreamer-burnout', 'Dreamer Burnout', 'Creative mortals withdraw, break down, or become vulnerable to exploitation.'),
        entry('chimera-outbreak', 'Chimera Outbreak', 'Uncontrolled imagined beings spread into surrounding locations.'),
        entry('oath-backlash', 'Oath Backlash', 'Broken promises produce curses, social collapse, or inherited consequences.'),
        entry('banality-expansion', 'Banality Expansion', 'Emotional flattening spreads through nearby institutions and relationships.'),
        entry('nightmare-harvest', 'Nightmare Harvest', 'Hostile fae gain a stable source of fear and humiliation.'),
        entry('seasonal-court-seizure', 'Seasonal Court Seizure', 'A rival court claims the site and rewrites its obligations.'),
        entry('memory-erasure', 'Memory Erasure', 'A community loses stories needed to sustain identity and Dreaming geography.'),
        entry('mortal-disillusionment', 'Mortal Disillusionment', 'Enchanted allies reject the supernatural community and expose or abandon it.')
      ]
    }),

    mage: line({
      siteTypes: [
        entry('sanctum-annex', 'Sanctum Annex', 'A secondary secure location supports research, ritual preparation, or emergency refuge.', ['lodging', 'office', 'historic', 'industrial']),
        entry('hallow', 'Hallow', 'The location produces or concentrates Mana through a stable supernatural condition.', ['church', 'park', 'historic', 'natural_feature']),
        entry('ley-nexus', 'Ley Nexus', 'Several lines of occult correspondence intersect through geography, infrastructure, and repeated human activity.', ['road', 'transit_station', 'historic', 'government']),
        entry('mystery-site', 'Mystery Site', 'A repeatable anomaly resists complete explanation and attracts competing Awakened interpretations.', ['other', 'historic', 'industrial', 'natural_feature']),
        entry('yantra-workshop', 'Yantra Workshop', 'Ordinary craft and records conceal the preparation of symbolic tools for spellwork.', ['industrial', 'store', 'office', 'education']),
        entry('artifact-vault', 'Artifact Vault', 'A dangerous or valuable magical object is stored behind mundane and occult security.', ['library', 'historic', 'government', 'office']),
        entry('spirit-embassy', 'Spirit Embassy', 'Awakened intermediaries negotiate with spirits attached to human systems and local places.', ['government', 'church', 'park', 'office']),
        entry('astral-locus', 'Astral Locus', 'Collective ideas and expectations make the site unusually accessible or significant in the Astral Realms.', ['library', 'education', 'government', 'historic']),
        entry('paradox-scar', 'Paradox Scar', 'A past magical failure has left reality locally inconsistent or hostile to further spellwork.', ['industrial', 'hospital', 'historic', 'other']),
        entry('seer-pylon-site', 'Seer Pylon Site', 'Institutional authority and occult hierarchy reinforce one another through a concealed Seer operation.', ['government', 'office', 'hospital', 'education']),
        entry('ritual-observatory', 'Ritual Observatory', 'The site measures celestial, symbolic, emotional, or infrastructural patterns for planned workings.', ['historic', 'education', 'industrial', 'natural_feature']),
        entry('sleepwalker-safehouse', 'Sleepwalker Safehouse', 'Trusted mortals provide continuity, records, and practical cover for Awakened activity.', ['lodging', 'restaurant', 'office', 'store'])
      ],
      hiddenFunctions: [
        entry('harvest-mana', 'Mana Harvesting', 'The site collects and regulates Mana produced by a recurring condition.'),
        entry('map-occult-correspondence', 'Occult Correspondence Mapping', 'Addresses, names, schedules, architecture, and events are compared as magical symbols.'),
        entry('screen-mystery-access', 'Mystery Access Screening', 'False explanations and controlled evidence prevent unprepared investigators from approaching the central anomaly.'),
        entry('prepare-yantras', 'Yantra Preparation', 'Objects, diagrams, performances, and records are prepared for specific spell practices.'),
        entry('contain-artifact', 'Artifact Containment', 'Layered wards and procedures limit an object’s influence while allowing controlled study.'),
        entry('negotiate-spirit-terms', 'Spirit-Term Negotiation', 'Awakened intermediaries exchange service, offerings, and access with local spirits.'),
        entry('route-astral-entry', 'Astral Entry Routing', 'Mental, symbolic, and environmental conditions guide travelers toward a specific Astral region.'),
        entry('monitor-paradox', 'Paradox Monitoring', 'Observers track reality stress and identify conditions likely to trigger backlash.'),
        entry('reinforce-seer-control', 'Seer Control Reinforcement', 'Mortal procedures and magical influence make hierarchy feel inevitable and self-enforcing.'),
        entry('support-sleepwalkers', 'Sleepwalker Support', 'Trusted mortals preserve evidence, identities, property, and routines that mages neglect.')
      ],
      infrastructures: [
        entry('warded-research-room', 'Warded Research Room', 'Physical security and layered spells protect records, experiments, and observers.'),
        entry('mana-collection-array', 'Mana Collection Array', 'Objects, schedules, symbols, and environmental conditions channel Mana into stable storage.'),
        entry('correspondence-map-table', 'Correspondence Map Table', 'Maps and records link people, places, concepts, and repeated events as occult relationships.'),
        entry('artifact-containment-case', 'Artifact Containment Case', 'Material, symbolic, and procedural barriers isolate a magical object.'),
        entry('spirit-offering-stations', 'Spirit Offering Stations', 'Specific services and offerings maintain agreements with spirits tied to the site.'),
        entry('astral-symbol-sequence', 'Astral Symbol Sequence', 'Images, texts, sounds, and mental exercises prepare travelers for a controlled Astral destination.'),
        entry('paradox-instrumentation', 'Paradox Instrumentation', 'Sensors, journals, controlled spellwork, and witness reports track reality instability.'),
        entry('seer-administrative-pipeline', 'Seer Administrative Pipeline', 'Credentials, forms, approvals, and institutional dependencies reinforce occult hierarchy.'),
        entry('sleepwalker-continuity-office', 'Sleepwalker Continuity Office', 'Trusted mortals maintain legal, financial, and operational continuity around Awakened work.'),
        entry('ritual-observation-platform', 'Ritual Observation Platform', 'A controlled vantage supports measurement of celestial, symbolic, and environmental conditions.')
      ],
      systemSecrets: [
        entry('false-hallow', 'False Hallow', 'The apparent Mana source is being supplied by an artifact, captive entity, or hidden sacrifice.'),
        entry('seer-infiltration', 'Seer Infiltration', 'A trusted researcher or Sleepwalker reports discoveries to the Seers of the Throne.'),
        entry('abyssal-contamination', 'Abyssal Contamination', 'The Mystery contains contradiction or absence that is spreading through attempts to understand it.'),
        entry('stolen-grimoire', 'Stolen Grimoire', 'The site’s research depends on a text taken from another cabal or supernatural society.'),
        entry('artifact-awakening', 'Artifact Awakening', 'The contained object is developing agency, memory, or a new purpose.'),
        entry('spirit-pact-breach', 'Spirit-Pact Breach', 'The custodians have not fulfilled the services promised to local spirits.'),
        entry('astral-identity-loss', 'Astral Identity Loss', 'A traveler returned with altered memories or a foreign symbolic identity.'),
        entry('paradox-coverup', 'Paradox Cover-Up', 'A past magical disaster was blamed on a mundane accident and never fully repaired.'),
        entry('sleepwalker-exploitation', 'Sleepwalker Exploitation', 'Trusted mortals bear legal and practical risks while mages claim the rewards.'),
        entry('legacy-initiation-site', 'Secret Legacy Initiation Site', 'The location is used to test candidates for a magical lineage without Consilium approval.'),
        entry('mystery-is-engineered', 'Engineered Mystery', 'The anomaly was created to attract researchers and profile their methods.'),
        entry('consilium-record-fraud', 'Consilium Record Fraud', 'Official records of ownership, discovery, or magical responsibility have been altered.')
      ],
      custodians: [
        entry('mysterium-curator', 'Mysterium Curator', 'A scholar preserves artifacts and records while controlling access to dangerous interpretations.'),
        entry('free-council-technician', 'Free Council Technician', 'A collaborative practitioner maintains magical systems built from community technology.'),
        entry('guardian-screen-keeper', 'Guardian Screen Keeper', 'A specialist manages false explanations and selective leaks around a Mystery.'),
        entry('silver-ladder-organizer', 'Silver Ladder Organizer', 'An Awakened leader cultivates institutions and people believed capable of broader transformation.'),
        entry('adamantine-sentry', 'Adamantine Sentry', 'A defender treats the site as an approach route to a larger protected asset.'),
        entry('seer-administrator', 'Seer Administrator', 'A hierarchy-minded mage aligns mortal procedure with occult control.'),
        entry('apostate-researcher', 'Apostate Researcher', 'An independent mage maintains the site outside recognized order or Consilium authority.'),
        entry('sleepwalker-operations-manager', 'Sleepwalker Operations Manager', 'A trusted mortal preserves finances, property, records, and daily continuity.'),
        entry('spirit-medium', 'Spirit Medium', 'A Thyrsus or allied practitioner translates between human and spirit expectations.'),
        entry('legacy-mentor', 'Legacy Mentor', 'A teacher uses the site as a living curriculum for a guarded magical lineage.')
      ],
      evidencePatterns: [
        entry('symbolic-coincidence-cluster', 'Symbolic Coincidence Cluster', 'Names, numbers, architecture, and events align too consistently to remain accidental.'),
        entry('mana-flux-cycle', 'Mana Flux Cycle', 'Magical energy rises and falls according to a repeatable mundane schedule.'),
        entry('paradox-symptom-repeat', 'Paradox Symptom Repeat', 'Contradictory records, sensory errors, and impossible absences recur after spellwork.'),
        entry('artifact-proximity-change', 'Artifact Proximity Change', 'Objects, memories, and behavior alter in relation to one contained item.'),
        entry('spirit-behavior-consensus', 'Spirit Behavior Consensus', 'Unrelated spirits react to the same person, room, or procedure.'),
        entry('astral-dream-overlap', 'Astral Dream Overlap', 'Different sleepers report the same symbolic landscape and inhabitants.'),
        entry('institutional-obedience-spike', 'Institutional Obedience Spike', 'People become unusually compliant around specific procedures or authorities.'),
        entry('sleepwalker-record-continuity', 'Sleepwalker Record Continuity', 'Mortal-maintained records reveal a magical operation spanning several changing mage identities.'),
        entry('yantra-effect-correlation', 'Yantra–Effect Correlation', 'Specific mundane objects and performances predict the form of later anomalies.'),
        entry('mystery-observer-effect', 'Mystery Observer Effect', 'The anomaly changes according to the investigator’s magical assumptions.')
      ],
      conflicts: [
        entry('mystery-ownership', 'Mystery Ownership Conflict', 'Cabals and orders disagree who may investigate, publish, or exploit the anomaly.'),
        entry('hallow-access', 'Hallow Access Conflict', 'Mana rights and maintenance obligations are disputed.'),
        entry('artifact-study-versus-destruction', 'Artifact Study Versus Destruction', 'Researchers want access while defenders consider the object too dangerous to preserve.'),
        entry('spirit-pact-terms', 'Spirit-Pact Terms Conflict', 'Human and spirit parties interpret obligations differently.'),
        entry('guardian-secrecy-versus-research', 'Secrecy Versus Research', 'Protective deception obstructs work needed to understand the threat.'),
        entry('sleepwalker-autonomy', 'Sleepwalker Autonomy Conflict', 'Mortal allies reject risks and decisions imposed by Awakened patrons.'),
        entry('seer-institutional-control', 'Institutional Control Conflict', 'Removing occult influence may destabilize services people genuinely need.'),
        entry('paradox-risk-tolerance', 'Paradox Risk Conflict', 'The cabal disagrees how much reality stress is acceptable.'),
        entry('legacy-recruitment', 'Legacy Recruitment Conflict', 'A lineage’s initiation practices conflict with cabal and Consilium obligations.'),
        entry('publication-versus-containment', 'Publication Versus Containment', 'Sharing the discovery could protect others or attract dangerous attention.')
      ],
      consequences: [
        entry('paradox-backlash', 'Paradox Backlash', 'Reality responds with injury, contradiction, exposure, or a persistent anomaly.'),
        entry('hallow-collapse', 'Hallow Collapse', 'The Mana source becomes inaccessible, contaminated, or violently unstable.'),
        entry('artifact-release', 'Artifact Release', 'The contained object escapes control or activates its full function.'),
        entry('abyssal-spread', 'Abyssal Spread', 'Contradiction and unreality infect connected systems and investigations.'),
        entry('spirit-hostility', 'Spirit Hostility', 'Local spirits withdraw agreements and retaliate through mundane systems.'),
        entry('seer-seizure', 'Seer Seizure', 'Institutional and magical agents take control of the site and its records.'),
        entry('astral-intrusion', 'Astral Intrusion', 'A symbolic entity or concept gains influence over waking behavior.'),
        entry('consilium-sanction', 'Consilium Sanction', 'The custodians lose status, resources, or legal magical protection.'),
        entry('sleepwalker-exposure', 'Sleepwalker Exposure', 'Trusted mortals become targets for enemies and authorities.'),
        entry('mystery-migration', 'Mystery Migration', 'The anomaly relocates into surrounding people, records, or infrastructure.')
      ]
    })
  });

  const fields = Object.freeze(['siteTypes', 'hiddenFunctions', 'infrastructures', 'systemSecrets', 'custodians', 'evidencePatterns', 'conflicts', 'consequences']);
  const counts = Object.freeze(Object.fromEntries(Object.entries(lines).map(([lineId, catalog]) => [
    lineId,
    Object.freeze(Object.fromEntries(fields.map(field => [field, catalog[field].length])))
  ])));

  return Object.freeze({
    schemaVersion: '1.0.0',
    module: 'world-of-darkness-system-site-catalog',
    fields,
    lines,
    counts,
    supernaturalStatuses: SUPERNATURAL_STATUSES
  });
});
