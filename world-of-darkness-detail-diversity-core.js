((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WODDetailDiversityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const STATUS_ORDER = ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'];
  const STATUS_PROFILES = Object.freeze({
    standard: Object.freeze([12, 6, 2, 1]),
    unified: Object.freeze([5, 8, 5, 3])
  });
  const CATALOG_LINES = Object.freeze(['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);
  const CATALOG_LABELS = Object.freeze({
    vampire: 'Vampire: The Masquerade',
    werewolf: 'Werewolf: The Apocalypse',
    breeds: 'Changing Breeds',
    hunter: 'Hunter',
    changeling: 'Changeling: The Dreaming',
    mage: 'Mage'
  });
  const LEGACY_THEME_DENOMINATOR = 32;
  const THEME_DISTRICT_MULTIPLIER = 4;
  const THEME_DYNAMICS = Object.freeze([
    { id: 'quiet-consolidation', label: 'Quiet Consolidation', description: 'Access and influence are accumulating through small agreements that have not yet become an openly declared claim.' },
    { id: 'fractured-succession', label: 'Fractured Succession', description: 'A missing, destroyed, disgraced, or withdrawn custodian has left several successors working from incompatible assumptions.' },
    { id: 'boundary-dispute', label: 'Boundary Dispute', description: 'Competing interests recognize the same route or resource but disagree about where responsibility and trespass begin.' },
    { id: 'redevelopment-pressure', label: 'Redevelopment Pressure', description: 'Construction, rezoning, ownership changes, and displacement are forcing the supernatural arrangement to adapt faster than its participants prefer.' },
    { id: 'evidence-leak', label: 'Evidence Leak', description: 'Records, witnesses, recordings, or repeated incidents are allowing outsiders to reconstruct pieces of the hidden pattern.' },
    { id: 'seasonal-realignment', label: 'Seasonal Realignment', description: 'Weather, tourism, school schedules, migration, or recurring public events temporarily reorder access and supernatural opportunity.' },
    { id: 'emergency-disruption', label: 'Emergency Disruption', description: 'A recent crisis has broken normal routines and exposed routes, obligations, and vulnerabilities that were previously concealed.' },
    { id: 'false-stability', label: 'False Stability', description: 'The district appears settled because every participant is postponing a confrontation that none of them is currently prepared to win.' },
    { id: 'resource-scarcity', label: 'Resource Scarcity', description: 'A dwindling supply of safe access, shelter, witnesses, essence, blood, glamour, information, or trusted intermediaries is increasing local risk.' },
    { id: 'internal-schism', label: 'Internal Schism', description: 'The dominant supernatural population agrees that the area matters but is divided over methods, leadership, and acceptable collateral damage.' },
    { id: 'unwanted-attention', label: 'Unwanted Attention', description: 'A rival faction, mortal institution, investigator, or opportunistic outsider has begun asking questions the existing arrangement cannot comfortably answer.' },
    { id: 'dormant-reactivation', label: 'Dormant Reactivation', description: 'An older route, oath, resonance, haunting, claim, or spiritual pattern is returning after years of apparent inactivity.' },
    { id: 'reciprocal-dependence', label: 'Reciprocal Dependence', description: 'Hostile or distrustful parties still rely on the same people and infrastructure, making a clean territorial separation impossible.' },
    { id: 'contaminated-custody', label: 'Contaminated Custody', description: 'The current custodians retain practical control, but the systems they inherited have been altered by an outside supernatural pressure.' },
    { id: 'political-audit', label: 'Political Audit', description: 'A higher authority is reviewing the area, forcing local actors to conceal improvisation, unauthorized bargains, and missing resources.' },
    { id: 'predatory-escalation', label: 'Predatory Escalation', description: 'One local actor is pushing beyond established limits and testing how much exploitation the surrounding supernatural community will tolerate.' }
  ]);
  const THEME_COMPONENTS = Object.freeze({
    unified: {
      actors: [
        { id: 'cross-sphere-brokers', label: 'Cross-Sphere Brokers', faction: 'mixed supernatural intermediaries', description: 'Intermediaries translate favors, warnings, and limited access between supernatural populations that do not share a common cosmology.' },
        { id: 'unclaimed-supernatural-traffic', label: 'Unclaimed Supernatural Traffic', faction: 'unaffiliated supernatural traffic', description: 'Several supernatural populations pass through the district without accepting formal responsibility for what their movement leaves behind.' },
        { id: 'mortal-intermediary-network', label: 'Mortal Intermediary Network', faction: 'mortal intermediaries', description: 'Workers, residents, contractors, and officials unknowingly mediate between supernatural interests through ordinary routines.' },
        { id: 'kindred-spirit-friction', label: 'Kindred–Spirit Friction', faction: 'Kindred and local spirits', description: 'Vampiric access patterns repeatedly disturb spiritual territories whose inhabitants interpret the same human activity very differently.' },
        { id: 'awakened-evidence-exchange', label: 'Awakened Evidence Exchange', faction: 'Awakened and occult investigators', description: 'Mystical researchers and practical investigators circulate partial evidence while withholding the interpretations that would reveal their own agendas.' },
        { id: 'hunter-occult-feedback', label: 'Hunter–Occult Feedback', faction: 'hunters and supernatural counter-observers', description: 'Observation and counter-surveillance have become mutually reinforcing, causing each side to mistake the other’s precautions for escalation.' },
        { id: 'dreaming-memory-convergence', label: 'Dreaming–Memory Convergence', faction: 'Kithain, dreamers, and memory-bound entities', description: 'Dreaming reflections, public memory, and older supernatural residues overlap without belonging to a single faction.' },
        { id: 'dead-living-administration', label: 'Dead–Living Administration', faction: 'the Restless Dead and living institutions', description: 'Administrative routines continue to reproduce obligations and exclusions created by people who are no longer among the living.' },
        { id: 'fera-urban-adaptation', label: 'Fera Urban Adaptation Front', faction: 'Changing Breeds and urban kin', description: 'Hidden shapeshifter populations are adapting ecological instincts and inherited duties to infrastructure built without them in mind.' },
        { id: 'competing-custodial-claims', label: 'Competing Custodial Claims', faction: 'multiple supernatural custodians', description: 'Several groups believe they are protecting the area, but their definitions of protection are mutually incompatible.' },
        { id: 'supernatural-refugee-population', label: 'Supernatural Refugee Population', faction: 'displaced supernatural residents', description: 'Displaced beings and their allies are using the district as temporary shelter while established powers debate whether they are guests, liabilities, or invaders.' },
        { id: 'misidentified-presence', label: 'Misidentified Supernatural Presence', faction: 'uncertain or misclassified entities', description: 'The evidence is real, but local factions keep assigning it to the wrong supernatural population and responding to threats that are not actually present.' }
      ],
      structures: [
        { id: 'civic-overlap-grid', label: 'Civic Overlap Grid', description: 'Permits, utilities, public safety, property records, and service access carry several unrelated supernatural uses at once.' },
        { id: 'night-transit-confluence', label: 'Night Transit Confluence', description: 'Late transport, shift changes, delivery routes, and pedestrian movement connect otherwise separate supernatural territories.' },
        { id: 'institutional-threshold', label: 'Institutional Threshold', description: 'Hospitals, schools, courts, shelters, and administrative offices form a threshold where incompatible supernatural rules meet.' },
        { id: 'commercial-exchange-web', label: 'Commercial Exchange Web', description: 'Ordinary purchasing, storage, credit, staffing, and security arrangements conceal exchanges of supernatural value.' },
        { id: 'memory-and-records-catchment', label: 'Memory and Records Catchment', description: 'Archives, stories, deaths, witness accounts, and digital traces accumulate into a shared but contested supernatural memory.' },
        { id: 'service-access-lattice', label: 'Service Access Lattice', description: 'Loading areas, maintenance corridors, contractors, and employee-only routes allow supernatural movement without obvious territorial markers.' },
        { id: 'boundary-exchange', label: 'Boundary Exchange', description: 'The neighborhood sits where multiple supernatural jurisdictions exchange warnings, refugees, contraband, or responsibility.' },
        { id: 'ecological-infrastructure-knot', label: 'Ecological Infrastructure Knot', description: 'Water, waste, vegetation, traffic, and built systems create a shared pressure point for spirits, shapeshifters, and human institutions.' },
        { id: 'emergency-response-mesh', label: 'Emergency Response Mesh', description: 'Dispatch, medical response, shelters, and crisis procedures repeatedly bring supernatural incidents into the same mortal systems.' },
        { id: 'cultural-resonance-district', label: 'Cultural Resonance District', description: 'Performance, worship, public art, nightlife, and repeated community rituals attract several kinds of supernatural attention.' },
        { id: 'unofficial-neutral-circuit', label: 'Unofficial Neutral Circuit', description: 'No treaty names the locations as neutral, yet several groups avoid open conflict there because too many systems would be exposed.' },
        { id: 'hidden-supply-chain', label: 'Hidden Supply Chain', description: 'Food, medicine, blood, ritual materials, documents, shelter, and specialized labor move through one concealed logistical network.' }
      ]
    },
    vampire: {
      actors: [
        { id: 'anarch-couriers', label: 'Anarch Couriers', faction: 'Anarch networks', description: 'Independent Kindred exchange warnings, favors, and temporary access without allowing the arrangement to become a formal barony.' },
        { id: 'camarilla-stewards', label: 'Camarilla Stewards', faction: 'Camarilla administration', description: 'Recognized officials and mortal proxies are converting informal influence into quiet administrative control.' },
        { id: 'nosferatu-brokers', label: 'Nosferatu Brokers', faction: 'Nosferatu information networks', description: 'Hidden observers treat maintenance access, discarded data, and overlooked workers as a distributed intelligence service.' },
        { id: 'ventrue-asset-managers', label: 'Ventrue Asset Managers', faction: 'Ventrue interests', description: 'Ownership, credit, insurance, employment, and private security are being coordinated as instruments of domain control.' },
        { id: 'hecata-obligation-keepers', label: 'Hecata Obligation Keepers', faction: 'Hecata', description: 'Deaths, estates, old debts, funeral commerce, and contact with the dead are being managed as one obligation network.' },
        { id: 'thin-blood-survival-network', label: 'Thin-Blood Survival Network', faction: 'thin-blooded Kindred', description: 'Marginalized vampires share improvised shelter, feeding warnings, alchemical resources, and information outside established courts.' },
        { id: 'toreador-cultural-patrons', label: 'Toreador Cultural Patrons', faction: 'Toreador interests', description: 'Venues, artists, social organizers, and public taste are being cultivated to shape both feeding access and prestige.' },
        { id: 'tremere-field-researchers', label: 'Tremere Field Researchers', faction: 'Tremere investigators', description: 'Occult observations, blood samples, witnesses, and controlled access are being assembled into a guarded research program.' },
        { id: 'banu-haqim-auditors', label: 'Banu Haqim Auditors', faction: 'Banu Haqim interests', description: 'Debts, violations, disappearances, and predatory excess are being quietly documented for a judgment not yet announced.' },
        { id: 'ministry-recruiters', label: 'Ministry Recruiters', faction: 'Ministry networks', description: 'Temptation, confession, social vulnerability, and selective protection are being used to build a loyal mortal and Kindred following.' },
        { id: 'gangrel-wayfarers', label: 'Gangrel Wayfarers', faction: 'Gangrel and unaffiliated travelers', description: 'Mobile Kindred rely on temporary shelter, peripheral feeding, and routes that established courts rarely monitor closely.' },
        { id: 'lasombra-institutional-agents', label: 'Lasombra Institutional Agents', faction: 'Lasombra interests', description: 'Ambitious intermediaries are exploiting hierarchy, crisis, and institutional weakness to acquire leverage without obvious ownership.' }
      ],
      structures: [
        { id: 'feeding-lattice', label: 'Feeding Lattice', description: 'Mortal schedules and repeated movement create several feeding opportunities whose safety depends on timing rather than ownership.' },
        { id: 'service-corridor', label: 'Service Corridor', description: 'Employees, deliveries, maintenance access, and after-hours routines provide discreet Kindred movement between public locations.' },
        { id: 'hospitality-circuit', label: 'Hospitality Circuit', description: 'Bars, restaurants, hotels, venues, and ride services form a circulating nocturnal social population.' },
        { id: 'property-ledger', label: 'Property Ledger', description: 'Leases, shell companies, lenders, contractors, and security arrangements reveal a domain maintained through paperwork.' },
        { id: 'transit-vein', label: 'Transit Vein', description: 'Late transit and transfer points move prey, witnesses, retainers, and Kindred through several territories.' },
        { id: 'emergency-access-chain', label: 'Emergency Access Chain', description: 'Hospitals, responders, shelters, and crisis procedures provide both feeding opportunities and dangerous documentation.' },
        { id: 'witness-suppression-field', label: 'Witness Suppression Field', description: 'Social pressure, surveillance gaps, favors, and selective intimidation repeatedly prevent incidents from becoming coherent testimony.' },
        { id: 'retainer-supply-web', label: 'Retainer Supply Web', description: 'Mortal servants and allies move messages, blood, documents, vehicles, and temporary shelter between Kindred interests.' },
        { id: 'neutral-ground-circuit', label: 'Neutral-Ground Circuit', description: 'Several locations remain unofficial meeting ground because open predation there would endanger every local domain.' },
        { id: 'elysium-approach', label: 'Elysium Approach', description: 'The area is shaped by the security, etiquette, feeding restrictions, and social traffic surrounding a protected Kindred gathering place.' },
        { id: 'blood-logistics-route', label: 'Blood Logistics Route', description: 'Medical supply, private donors, criminal diversion, and controlled feeding are linked through one concealed logistical system.' },
        { id: 'domain-boundary-mesh', label: 'Domain Boundary Mesh', description: 'No single street marks the border; permissions change according to hour, clientele, event, and which mortal intermediary is present.' }
      ]
    },
    werewolf: {
      actors: [
        { id: 'sept-patrols', label: 'Sept Patrols', faction: 'Garou sept patrols', description: 'Pack patrols treat the district as part of a wider duty whose boundaries are understood differently by neighboring septs.' },
        { id: 'displaced-spirits', label: 'Displaced Spirits', faction: 'displaced local spirits', description: 'Spirits uprooted from altered land and demolished places are establishing unstable relationships with new hosts and locations.' },
        { id: 'weaver-functionaries', label: 'Weaver Functionaries', faction: 'Weaver-aligned spirits', description: 'Pattern-bound spirits are tightening schedules, surveillance, infrastructure, and procedural control.' },
        { id: 'wyrm-contractors', label: 'Wyrm-Tainted Contractors', faction: 'Wyrm-tainted interests', description: 'Exploitation, concealed waste, despair, addiction, and predatory business practices are reinforcing one another spiritually.' },
        { id: 'wyld-remnants', label: 'Wyld Remnants', faction: 'Wyld spirits', description: 'Unmanaged growth, mutation, improvisation, and stubborn local life resist the district’s increasing rigidity.' },
        { id: 'urban-totem-servitors', label: 'Urban Totem Servitors', faction: 'city and neighborhood spirits', description: 'Spirits attached to traffic, commerce, communication, and public identity are negotiating new forms of patronage.' },
        { id: 'kinfolk-support-network', label: 'Kinfolk Support Network', faction: 'Kinfolk and mortal allies', description: 'Families, workers, and trusted institutions quietly provide information, shelter, supplies, and continuity for Garou activity.' },
        { id: 'rival-packs', label: 'Rival Packs', faction: 'competing Garou packs', description: 'Several packs claim responsibility for the same threat while distrusting one another’s priorities and methods.' },
        { id: 'caern-refugees', label: 'Caern Refugees', faction: 'spirits and Garou displaced from a damaged caern', description: 'The survivors of a damaged sacred place are trying to preserve duties and relationships outside their original territory.' },
        { id: 'ancestor-spirit-court', label: 'Ancestor-Spirit Court', faction: 'ancestor and memory spirits', description: 'Inherited obligations and older judgments continue to influence packs that no longer agree on their meaning.' },
        { id: 'fomori-influence', label: 'Fomori Influence', faction: 'fomori and concealed Wyrm agents', description: 'Human exploitation and spiritual corruption are producing agents whose behavior appears mundane until several incidents are compared.' },
        { id: 'unclaimed-spirit-court', label: 'Unclaimed Spirit Court', faction: 'independent local spirits', description: 'Minor spirits have assembled their own hierarchy because no sept has provided stable protection or negotiation.' }
      ],
      structures: [
        { id: 'spirit-crossing', label: 'Spirit Crossing', description: 'Repeated human movement and environmental conditions create a recognizable route across the Gauntlet.' },
        { id: 'patrol-boundary', label: 'Patrol Boundary', description: 'Pack responsibilities overlap here without a mutually accepted territorial marker.' },
        { id: 'watershed-chain', label: 'Watershed Chain', description: 'Drainage, shoreline, groundwater, vegetation, and contamination connect the district to a larger spiritual ecology.' },
        { id: 'utility-web', label: 'Utility Web', description: 'Power, communications, water, waste, and maintenance systems support a dense population of pattern-bound spirits.' },
        { id: 'totem-route', label: 'Totem Route', description: 'Shrines, habits, favored businesses, and recurring community actions sustain a totem’s influence across ordinary locations.' },
        { id: 'blight-front', label: 'Blight Front', description: 'Spiritual corruption is advancing through exploitation, neglect, pollution, and repeated human despair.' },
        { id: 'caern-catchment', label: 'Caern Catchment', description: 'The district receives spiritual traffic and obligations from a sacred place without being part of the caern itself.' },
        { id: 'kinfolk-supply-trail', label: 'Kinfolk Supply Trail', description: 'Trusted households and businesses move supplies, warnings, wounded allies, and practical support between packs.' },
        { id: 'umbra-market', label: 'Umbra Market', description: 'Minor spirits exchange information, service, chiminage, and access through reflections of ordinary commerce.' },
        { id: 'weaver-choke-point', label: 'Weaver Choke Point', description: 'Barriers, schedules, sensors, and infrastructure compress spiritual movement into a narrow predictable route.' },
        { id: 'wyld-refuge', label: 'Wyld Refuge', description: 'Unplanned growth and unstable spirit activity survive in spaces the built environment has not fully controlled.' },
        { id: 'contamination-drain', label: 'Contamination Drain', description: 'Emotional and environmental corruption from a wider area accumulates here because ordinary systems carry it downhill.' }
      ]
    },
    breeds: {
      actors: [
        { id: 'corax-information-flights', label: 'Corax Information Flights', faction: 'Corax', description: 'Messages, sightings, discarded secrets, and high vantage points are being assembled into an avian intelligence route.' },
        { id: 'ratkin-warrens', label: 'Ratkin Warrens', faction: 'Ratkin', description: 'Hidden populations exploit waste systems, abandoned infrastructure, overcrowding, and the blind spots of human property management.' },
        { id: 'bastet-watchers', label: 'Bastet Watchers', faction: 'Bastet', description: 'Solitary observers are tracking intrusions, secrets, and changes in territory without sharing a single chain of command.' },
        { id: 'gurahl-custodians', label: 'Gurahl Custodians', faction: 'Gurahl', description: 'Healers and protectors regard the district as a wounded organism whose recovery requires patience and guarded access.' },
        { id: 'ananasi-web', label: 'Ananasi Web', faction: 'Ananasi', description: 'Information, obligation, architecture, and carefully placed human relationships form a controlled predatory web.' },
        { id: 'nuwisha-trickster-route', label: 'Nuwisha Trickster Route', faction: 'Nuwisha', description: 'Contradictions and social embarrassment are being used to expose territorial arrogance and hidden supernatural assumptions.' },
        { id: 'mokolé-memory-keepers', label: 'Mokolé Memory Keepers', faction: 'Mokolé', description: 'Ancient memory and environmental change are being compared through descendants, dreams, and places that preserve long continuity.' },
        { id: 'rokea-shore-watch', label: 'Rokea Shore Watch', faction: 'Rokea and coastal kin', description: 'Shore access, marine activity, drainage, and human development are being judged from a perspective that does not accept terrestrial ownership.' },
        { id: 'fera-kin-network', label: 'Fera Kin Network', faction: 'Changing Breed kin', description: 'Ordinary families and workers maintain species-specific shelter, warning, food, and movement networks.' },
        { id: 'mixed-fera-compact', label: 'Mixed Fera Compact', faction: 'multiple Changing Breeds', description: 'Several breeds maintain a difficult practical agreement because none can protect the area alone.' },
        { id: 'displaced-fera', label: 'Displaced Fera', faction: 'displaced Changing Breeds', description: 'Redevelopment and ecological loss have forced hidden populations into unfamiliar urban niches.' },
        { id: 'predator-prey-arbitrators', label: 'Predator–Prey Arbitrators', faction: 'local shapeshifter custodians', description: 'Supernatural predators are trying to correct an imbalance without agreeing on whether humans are the cause, the resource, or part of the threatened ecology.' }
      ],
      structures: [
        { id: 'migration-corridor', label: 'Migration Corridor', description: 'Seasonal movement, food access, hidden shelter, and kin contacts create a route used by more than one species.' },
        { id: 'nesting-and-denning-web', label: 'Nesting and Denning Web', description: 'Rooftops, basements, green spaces, waterways, and overlooked structures provide species-specific refuge.' },
        { id: 'old-compact-boundary', label: 'Old Compact Boundary', description: 'A surviving agreement still shapes who may hunt, shelter, observe, or intervene.' },
        { id: 'urban-niche-mosaic', label: 'Urban Niche Mosaic', description: 'Different breeds interpret the same infrastructure as shelter, hunting ground, information source, or trap.' },
        { id: 'kinfolk-support-chain', label: 'Kinfolk Support Chain', description: 'Families and trusted businesses maintain warnings, supplies, introductions, and emergency movement.' },
        { id: 'ecological-displacement-front', label: 'Ecological Displacement Front', description: 'Habitat loss is compressing several hidden populations into the same limited territory.' },
        { id: 'predator-prey-catchment', label: 'Predator–Prey Catchment', description: 'Changes in animals, waste, food, and human traffic are disrupting inherited territorial expectations.' },
        { id: 'rooftop-and-service-route', label: 'Rooftop and Service Route', description: 'Elevated access, alleys, loading areas, and maintenance spaces support movement outside normal pedestrian patterns.' },
        { id: 'water-and-drainage-path', label: 'Water and Drainage Path', description: 'Shoreline, culverts, runoff, and underground water connect urban territory to a wider ecological system.' },
        { id: 'memory-territory', label: 'Memory Territory', description: 'Inherited stories, species memory, and long-observed environmental change make the area important beyond its current appearance.' },
        { id: 'scavenger-economy', label: 'Scavenger Economy', description: 'Waste, surplus, abandoned property, and discarded information sustain hidden communities.' },
        { id: 'human-wildlife-conflict-zone', label: 'Human–Wildlife Conflict Zone', description: 'Control measures, public fear, development, and ecological pressure are escalating encounters between humans and hidden predators.' }
      ]
    },
    hunter: {
      actors: [
        { id: 'independent-cells', label: 'Independent Cells', faction: 'independent hunters', description: 'Small groups are collecting pieces of the same threat picture without trusting one another enough to share everything.' },
        { id: 'union-compact', label: 'Union Compact', faction: 'working-class hunter networks', description: 'Workers use occupational access, mutual protection, and practical knowledge to identify threats institutions ignore.' },
        { id: 'network-zero-observers', label: 'Network Zero Observers', faction: 'media-oriented hunters', description: 'Recordings, online communities, and distributed witnesses are being used to preserve evidence before it disappears.' },
        { id: 'long-night-witnesses', label: 'Long Night Witnesses', faction: 'faith-driven hunters', description: 'Religious conviction and survivor testimony are organizing a response that treats the threat as both spiritual and immediate.' },
        { id: 'loyalist-infiltrators', label: 'Loyalist Infiltrators', faction: 'institutional loyalists', description: 'Insiders are using their legitimate positions to investigate corruption while risking exposure by their own organizations.' },
        { id: 'null-mysteriis-researchers', label: 'Null Mysteriis Researchers', faction: 'occult researchers', description: 'Investigators are trying to produce repeatable evidence without allowing fear or doctrine to decide the conclusion first.' },
        { id: 'survivor-mutual-aid', label: 'Survivor Mutual-Aid', faction: 'survivors and civilian allies', description: 'People harmed by supernatural events maintain shelter, warning, transportation, and recovery networks.' },
        { id: 'compromised-responders', label: 'Compromised Responders', faction: 'infiltrated emergency institutions', description: 'Some responders are delaying, redirecting, or erasing useful evidence while others struggle to understand why.' },
        { id: 'federal-task-force', label: 'Federal Task Force', faction: 'government investigators', description: 'Separate cases are being cross-referenced through restricted databases, jurisdictional favors, and quiet field interviews.' },
        { id: 'community-defense-watch', label: 'Community Defense Watch', faction: 'local civilian defenders', description: 'Residents and workers are protecting vulnerable people through observation, accompaniment, and rapid information sharing.' },
        { id: 'private-security-investigators', label: 'Private Security Investigators', faction: 'commercial investigators', description: 'Security professionals are noticing patterns across clients while deciding whether disclosure is more dangerous than silence.' },
        { id: 'predatory-vigilantes', label: 'Predatory Vigilantes', faction: 'reckless or compromised hunters', description: 'A violent faction is treating suspicion as proof and creating new victims faster than it identifies real supernatural threats.' }
      ],
      structures: [
        { id: 'evidence-corridor', label: 'Evidence Corridor', description: 'Camera coverage, reports, witness movement, and public records create a reconstructable pattern across several locations.' },
        { id: 'surveillance-lattice', label: 'Surveillance Lattice', description: 'Cameras, license plates, dispatch logs, access records, and digital traces are being quietly correlated.' },
        { id: 'witness-protection-web', label: 'Witness Protection Web', description: 'Trusted homes, workplaces, vehicles, and institutions move vulnerable witnesses through ordinary routines.' },
        { id: 'institutional-blind-spot', label: 'Institutional Blind Spot', description: 'Jurisdiction, liability, workload, and fragmented data repeatedly prevent authorities from seeing the whole pattern.' },
        { id: 'false-positive-zone', label: 'False-Positive Zone', description: 'Mundane hardship and genuine supernatural evidence overlap, making careless conclusions unusually dangerous.' },
        { id: 'response-delay-chain', label: 'Response Delay Chain', description: 'Calls, reports, medical records, and investigations are repeatedly delayed or redirected at different stages.' },
        { id: 'safehouse-circuit', label: 'Safehouse Circuit', description: 'Temporary shelter and trusted intermediaries allow hunters and witnesses to move without using one permanent base.' },
        { id: 'occupational-access-network', label: 'Occupational Access Network', description: 'Workers use legitimate access to buildings, records, vehicles, and restricted spaces that outsiders could not inspect.' },
        { id: 'case-linkage-grid', label: 'Case-Linkage Grid', description: 'Incidents dismissed in isolation become significant when dates, victims, locations, and methods are compared.' },
        { id: 'counter-surveillance-route', label: 'Counter-Surveillance Route', description: 'Hunters and supernatural observers are both testing whether the other side is following predictable movement.' },
        { id: 'civilian-warning-chain', label: 'Civilian Warning Chain', description: 'Workers and residents circulate coded warnings through otherwise ordinary communication and service relationships.' },
        { id: 'containment-perimeter', label: 'Containment Perimeter', description: 'A loose ring of observation and intervention surrounds a threat no group feels prepared to confront directly.' }
      ]
    },
    changeling: {
      actors: [
        { id: 'freehold-envoys', label: 'Freehold Envoys', faction: 'Kithain freehold representatives', description: 'Recognized envoys are maintaining influence through ceremony, hospitality, favors, and carefully limited access.' },
        { id: 'motley-couriers', label: 'Motley Couriers', faction: 'Kithain motleys', description: 'Small groups move messages, dreams, warnings, and minor treasures along routes too informal for noble administration.' },
        { id: 'dreamer-network', label: 'Dreamer Network', faction: 'dreamers and creative mortals', description: 'Artists, children, performers, and imaginative workers sustain Glamour without understanding the full supernatural ecology around them.' },
        { id: 'chimera-migration', label: 'Chimera Migration', faction: 'local chimerae', description: 'Imagined beings are following repeated emotional and social routes between places where human attention changes sharply.' },
        { id: 'oathbound-households', label: 'Oathbound Households', faction: 'oath-bound fae and mortal families', description: 'Old promises survive through family habits, hospitality rules, names, and recurring acts of care.' },
        { id: 'autumn-institutions', label: 'Autumn Institutions', faction: 'Banality-producing institutions', description: 'Standardization, exhaustion, surveillance, and emotional flattening are weakening the district’s Dreaming reflection.' },
        { id: 'thallain-predators', label: 'Thallain Predators', faction: 'hostile fae', description: 'Fear, humiliation, despair, and exhausted imagination are being deliberately cultivated and harvested.' },
        { id: 'sidhe-patrons', label: 'Sidhe Patrons', faction: 'Sidhe nobility', description: 'Prestige, performance, patronage, and obligation are being organized into a courtly influence network.' },
        { id: 'commoner-mutual-aid', label: 'Commoner Mutual-Aid', faction: 'Kithain commoners', description: 'Practical support and shared creative space matter more than noble title in maintaining the local Dreaming.' },
        { id: 'trod-custodians', label: 'Trod Custodians', faction: 'trod keepers and travelers', description: 'Travelers and guardians are preserving a path whose entrances shift with emotion, story, weather, and ritual.' },
        { id: 'forgotten-child-dreamers', label: 'Forgotten Child Dreamers', faction: 'young dreamers and protective chimerae', description: 'Neglected imagination is generating unstable but powerful Dreaming activity around schools, homes, parks, and social services.' },
        { id: 'unclaimed-glamour-seekers', label: 'Unclaimed Glamour Seekers', faction: 'competing fae and enchanted mortals', description: 'Several groups are drawing from the same emotional and creative population without accepting a common authority.' }
      ],
      structures: [
        { id: 'freehold-catchment', label: 'Freehold Catchment', description: 'Stories, performances, community rituals, and emotional investment feed a nearby freehold.' },
        { id: 'chimera-route', label: 'Chimera Route', description: 'Repeated human paths create a reliable movement corridor for imagined beings.' },
        { id: 'forgotten-promise-district', label: 'Forgotten Promise District', description: 'Old promises remain embedded in place names, habits, ceremonies, and family memory.' },
        { id: 'creative-resistance-block', label: 'Creative Resistance Block', description: 'Small acts of invention, play, performance, and mutual encouragement resist the surrounding Banality.' },
        { id: 'banality-pressure-field', label: 'Banality Pressure Field', description: 'Bureaucracy, displacement, exhaustion, and enforced sameness are flattening emotional and imaginative life.' },
        { id: 'trod-approach', label: 'Trod Approach', description: 'Several ordinary locations form the shifting approach to a path through the Dreaming.' },
        { id: 'glamour-exchange-circuit', label: 'Glamour Exchange Circuit', description: 'Venues, schools, parks, workshops, and social gatherings circulate emotional energy and creative attention.' },
        { id: 'oath-and-hospitality-web', label: 'Oath and Hospitality Web', description: 'Invitations, gifts, shelter, and remembered courtesies carry supernatural obligations.' },
        { id: 'memory-garden', label: 'Memory Garden', description: 'Community stories and personal recollections sustain a Dreaming landscape that no longer matches the physical district.' },
        { id: 'nightmare-harvest-route', label: 'Nightmare Harvest Route', description: 'Fear and humiliation recur along a social route used by predatory fae.' },
        { id: 'enchanted-mortal-network', label: 'Enchanted Mortal Network', description: 'Mortal allies preserve access, stories, materials, and safe social space for Kithain activity.' },
        { id: 'seasonal-court-boundary', label: 'Seasonal Court Boundary', description: 'The influence of seasonal courts changes according to event, mood, weather, and local custom rather than a fixed street line.' }
      ]
    },
    mage: {
      actors: [
        { id: 'mysterium-surveyors', label: 'Mysterium Surveyors', faction: 'Mysterium', description: 'Researchers are cataloguing resonances, records, artifacts, and recurring anomalies while disputing their proper classification.' },
        { id: 'free-council-technomancers', label: 'Free Council Technomancers', faction: 'Free Council', description: 'Community technology, improvised networks, and collaborative practice are producing repeatable magical effects.' },
        { id: 'guardian-screens', label: 'Guardian Screens', faction: 'Guardians of the Veil', description: 'Contradictory explanations and selective leaks are steering investigators away from a larger Mystery.' },
        { id: 'silver-ladder-influence', label: 'Silver Ladder Influence', faction: 'Silver Ladder', description: 'Awakened organizers are cultivating institutions and leaders they believe can elevate the surrounding community.' },
        { id: 'adamantine-arrow-sentries', label: 'Adamantine Arrow Sentries', faction: 'Adamantine Arrow', description: 'Defenders are treating the district as an approach route to a threat, Mystery, or protected Awakened asset.' },
        { id: 'seer-administrators', label: 'Seer Administrators', faction: 'Seers of the Throne', description: 'Credentials, contracts, permissions, hierarchy, and institutional dependency are reinforcing occult control.' },
        { id: 'apostate-cabal', label: 'Apostate Cabal', faction: 'independent Awakened', description: 'Mages outside recognized orders are maintaining a practical arrangement without accepting Consilium oversight.' },
        { id: 'legacy-mentors', label: 'Legacy Mentors', faction: 'Awakened lineage mentors', description: 'Teachers and initiates are using the district as a living curriculum whose lessons are hidden in repeated conditions.' },
        { id: 'abyssal-contamination', label: 'Abyssal Contamination', faction: 'Abyssal influence', description: 'Contradiction, absence, and impossible evidence are spreading through otherwise ordinary systems.' },
        { id: 'spirit-medium-network', label: 'Spirit-Medium Network', faction: 'Thyrsus and local mediums', description: 'Awakened intermediaries are negotiating with spirits attached to human routines and built infrastructure.' },
        { id: 'sleepwalker-support', label: 'Sleepwalker Support Network', faction: 'Sleepwalkers and trusted mortals', description: 'Mortal allies provide access, continuity, evidence handling, and practical cover for Awakened work.' },
        { id: 'competing-cabals', label: 'Competing Cabals', faction: 'rival Awakened cabals', description: 'Several cabals agree that the district contains a Mystery but disagree about ownership, method, and acceptable risk.' }
      ],
      structures: [
        { id: 'symbol-grid', label: 'Symbol Grid', description: 'Addresses, architecture, schedules, and institutional names align into a disputed occult correspondence.' },
        { id: 'signal-field', label: 'Signal Field', description: 'Communication systems and repeated information flows produce an observable magical resonance.' },
        { id: 'administrative-web', label: 'Administrative Web', description: 'Credentials, forms, permissions, contracts, and records are acting as occult instruments of access and exclusion.' },
        { id: 'research-corridor', label: 'Research Corridor', description: 'Archives, collections, laboratories, specialists, and overlooked records form an active landscape of inquiry.' },
        { id: 'screening-zone', label: 'Screening Zone', description: 'False explanations, controlled evidence, and social misdirection prevent casual observers from approaching the central Mystery.' },
        { id: 'resonance-field', label: 'Resonance Field', description: 'A persistent emotional, symbolic, elemental, or conceptual resonance affects several ordinary locations.' },
        { id: 'ley-intersection', label: 'Ley Intersection', description: 'Movement, architecture, geology, and repeated ritual have created a contested crossing of occult correspondences.' },
        { id: 'mystery-catchment', label: 'Mystery Catchment', description: 'Separate anomalies become meaningful only when treated as expressions of one larger Mystery.' },
        { id: 'sanctum-support-web', label: 'Sanctum Support Web', description: 'Trusted businesses, residences, utilities, and mortal allies sustain a hidden Awakened base.' },
        { id: 'astral-reflection-district', label: 'Astral Reflection District', description: 'Ideas and collective expectations are producing a strong symbolic reflection accessible through Awakened practice.' },
        { id: 'spirit-negotiation-route', label: 'Spirit Negotiation Route', description: 'Several spirits attached to human systems must be approached in a particular practical sequence.' },
        { id: 'abyssal-fault-line', label: 'Abyssal Fault Line', description: 'Contradictory evidence and impossible absences mark a route along which reality is becoming less reliable.' }
      ]
    }
  });
  const FALLBACK_PROTOTYPES = {
    restaurant: [6, 2, 5], bar: [6, 2, 5], night_club: [6, 5, 2],
    book_store: [6, 4, 2], library: [4, 6, 10], hospital: [4, 5, 9], pharmacy: [6, 4, 2],
    cemetery: [10, 7, 4], park: [7, 10, 5], store: [6, 2, 8], lodging: [4, 5, 6],
    church: [10, 7, 4], transit_station: [3, 1, 9], government: [4, 5, 1], office: [4, 5, 1],
    industrial: [8, 9, 5], natural_feature: [7, 10, 9], road: [1, 3, 9], education: [4, 7, 6],
    historic: [10, 4, 7], fitness: [5, 7, 6], sports: [5, 7, 2], other: [4, 6, 1]
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const capitalize = value => {
    const text = String(value || '');
    return text ? text[0].toUpperCase() + text.slice(1) : text;
  };
  const humanize = value => String(value || '').replace(/[_:]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

  function hash32(input) {
    let hash = 2166136261;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function gcd(left, right) {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function strideFor(seed, length) {
    if (length <= 1) return 1;
    let stride = (seed % (length - 1)) + 1;
    while (gcd(stride, length) !== 1) stride = stride % length + 1;
    return stride;
  }

  function neighborhoodKey(location, cellDegrees = 0.015) {
    const lat = Number(location?.lat || 0);
    const lng = Number(location?.lng || 0);
    return `${Math.floor(lat / cellDegrees)}:${Math.floor(lng / cellDegrees)}`;
  }

  function themeScopeKey(location) {
    const entryKey = String(location?.entryKey || '');
    const prefix = entryKey.includes('|') ? entryKey.split('|', 1)[0] : '';
    return /^wodworld-[0-9a-f]{8}$/.test(prefix) ? prefix : 'baseline-world';
  }

  function regionalThemeVariantCount(line = 'unified', legacyCount = 0) {
    const components = THEME_COMPONENTS[line] || THEME_COMPONENTS.unified;
    return components.actors.length * components.structures.length * THEME_DYNAMICS.length + Number(legacyCount || 0);
  }

  function statusProfile(line = 'unified') {
    return line === 'unified' ? STATUS_PROFILES.unified : STATUS_PROFILES.standard;
  }

  function inventoryStatusFromSeed(seed, line = 'unified') {
    const counts = statusProfile(line);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const slot = Number(seed >>> 0) % total;
    let cursor = 0;
    for (let index = 0; index < STATUS_ORDER.length; index += 1) {
      cursor += counts[index];
      if (slot < cursor) return STATUS_ORDER[index];
    }
    return 'MUNDANE';
  }

  function allContexts(baseLocations, contextExpansion) {
    return [
      ...(baseLocations?.contextVariants || []),
      ...(contextExpansion?.contextVariants || [])
    ];
  }

  function applicabilityScore(app, location, line) {
    if (!app) return 0;
    let score = 0;
    const category = normalize(location.category).replaceAll(' ', '_');
    const featureText = `${normalize(location.featureLabel)} ${Object.entries(location.sourceTags || {}).map(([key, value]) => `${normalize(key)} ${normalize(value)}`).join(' ')}`;
    const categories = (app.categories || app.categoryHooks || []).map(value => normalize(value).replaceAll(' ', '_'));
    if (categories.includes(category)) score += 12;
    else if (categories.includes('all')) score += 3;
    const gameLines = app.gameLines || [];
    if (gameLines.includes(line)) score += 10;
    else if (gameLines.includes('all')) score += 4;
    for (const hook of app.featureHooks || []) if (featureText.includes(normalize(hook))) score += 4;
    for (const [key, allowed] of Object.entries(app.tagHooks || {})) {
      const actual = location.sourceTags?.[key];
      if (actual == null) continue;
      const values = Array.isArray(allowed) ? allowed.map(normalize) : [normalize(allowed)];
      if (values.includes('*') || values.includes(normalize(actual))) score += 8;
    }
    return score;
  }

  function createSession(data) {
    const pools = data?.pools || {};
    const cellDegrees = Number(data?.neighborhoodCellDegrees || 0.015);
    const used = new Map();

    function usageSet(location, line, field) {
      const key = `${neighborhoodKey(location, cellDegrees)}|${line}|${field}`;
      if (!used.has(key)) used.set(key, new Set());
      return used.get(key);
    }

    function pick(field, list, location, line, salt = '', options = {}) {
      const values = Array.isArray(list) ? list : [];
      if (!values.length) return null;
      const region = neighborhoodKey(location, cellDegrees);
      if (options.sharedRegional) return values[hash32(`${region}|${line}|${field}`) % values.length];
      const set = usageSet(location, line, field);
      const startSeed = hash32(`${location.entryKey || location.osmId}|${line}|${field}|${salt}`);
      const start = startSeed % values.length;
      const stride = strideFor(hash32(`${field}|${salt}|stride`), values.length);
      let index = start;
      for (let attempt = 0; attempt < values.length; attempt += 1) {
        const fingerprint = typeof values[index] === 'object' ? values[index].id || JSON.stringify(values[index]) : String(values[index]);
        if (!set.has(fingerprint)) {
          set.add(fingerprint);
          return values[index];
        }
        index = (index + stride) % values.length;
      }
      return values[(start + Math.floor(set.size / values.length)) % values.length];
    }

    function pickScored(field, candidates, location, line, salt, scoreFn) {
      if (!candidates.length) return null;
      const ranked = candidates.map(candidate => ({
        candidate,
        score: scoreFn(candidate) + hash32(`${location.entryKey}|${line}|${field}|${candidate.id || candidate.sourcePrototype || candidate.title}`) / 0xffffffff
      })).sort((left, right) => right.score - left.score);
      const bestScore = ranked[0].score;
      const shortlist = ranked.filter(item => item.score >= bestScore - 4).map(item => item.candidate);
      return pick(field, shortlist, location, line, salt);
    }

    function themeFor(location, line) {
      const components = THEME_COMPONENTS[line] || THEME_COMPONENTS.unified;
      const legacyThemes = pools.regionalThemes?.[line] || pools.regionalThemes?.unified || [];
      const region = neighborhoodKey(location, cellDegrees);
      const district = neighborhoodKey(location, cellDegrees * THEME_DISTRICT_MULTIPLIER);
      const scope = themeScopeKey(location);
      const legacyRoll = hash32(`${scope}|${region}|${line}|regional-theme-legacy-v3`);
      if (legacyThemes.length && legacyRoll % LEGACY_THEME_DENOMINATOR === 0) {
        const legacy = clone(legacyThemes[hash32(`${scope}|${region}|${line}|legacy-theme-index-v3`) % legacyThemes.length]);
        return {
          ...legacy,
          familyId: legacy.id,
          districtKey: district,
          neighborhoodKey: region,
          themeVersion: '3.0.0',
          themeSource: 'legacy-rare',
          variationCount: regionalThemeVariantCount(line, legacyThemes.length),
          legacyFrequencyDenominator: LEGACY_THEME_DENOMINATOR
        };
      }
      const actor = components.actors[hash32(`${scope}|${district}|${line}|regional-theme-actor-v3`) % components.actors.length];
      const structure = components.structures[hash32(`${scope}|${region}|${line}|regional-theme-structure-v3`) % components.structures.length];
      const dynamic = THEME_DYNAMICS[hash32(`${scope}|${region}|${line}|regional-theme-dynamic-v3`) % THEME_DYNAMICS.length];
      return {
        id: `${actor.id}--${structure.id}--${dynamic.id}`,
        label: `${actor.label} ${structure.label}: ${dynamic.label}`,
        faction: actor.faction,
        description: `${actor.description} ${structure.description} ${dynamic.description}`,
        familyId: actor.id,
        familyLabel: actor.label,
        structureId: structure.id,
        structureLabel: structure.label,
        dynamicId: dynamic.id,
        dynamicLabel: dynamic.label,
        districtKey: district,
        neighborhoodKey: region,
        themeVersion: '3.0.0',
        themeSource: 'compositional',
        variationCount: regionalThemeVariantCount(line, legacyThemes.length),
        legacyFrequencyDenominator: LEGACY_THEME_DENOMINATOR
      };
    }

    function chooseContext(location, line, status, baseLocations, contextExpansion, usageLine = line) {
      const candidates = allContexts(baseLocations, contextExpansion).filter(context => context.inventoryStatus === status);
      return pickScored('context', candidates, location, usageLine, `${line}|${status}`, context => applicabilityScore({
        gameLines: context.gameLines,
        categories: context.categoryHooks,
        featureHooks: context.featureHooks,
        tagHooks: context.tagHooks
      }, location, line));
    }

    function choosePrototype(location, line, baseLocations, contextExpansion, usageLine = line) {
      const prototypes = baseLocations?.prototypes || [];
      const affinities = contextExpansion?.prototypeAffinity || [];
      const fallback = FALLBACK_PROTOTYPES[location.category] || FALLBACK_PROTOTYPES.other;
      return pickScored('prototype', prototypes, location, usageLine, `${line}|${location.category}`, prototype => {
        const affinity = affinities.find(item => item.sourcePrototype === prototype.sourcePrototype);
        let score = applicabilityScore(affinity, location, line);
        const fallbackIndex = fallback.indexOf(prototype.sourcePrototype);
        if (fallbackIndex >= 0) score += 9 - fallbackIndex * 2;
        return score;
      });
    }

    function interpolate(text, location) {
      return String(text || '')
        .replaceAll('{category}', normalize(location.categoryLabel || humanize(location.category) || 'named location'))
        .replaceAll('{feature}', normalize(location.featureLabel || 'named map feature'));
    }

    function catalogFor(location, line, status) {
      if (line !== 'unified') return line;
      return pick('unified-catalog-line', CATALOG_LINES, location, line, status) || CATALOG_LINES[0];
    }

    function generate(input) {
      const location = input.location;
      const line = input.line || 'unified';
      const status = input.inventoryStatus || inventoryStatusFromSeed(input.seed || 0, line);
      const catalogLine = catalogFor(location, line, status);
      const catalogLabel = CATALOG_LABELS[catalogLine] || humanize(catalogLine);
      const theme = themeFor(location, line);
      const context = chooseContext(location, catalogLine, status, input.baseLocations, input.contextExpansion, line) || {
        id: 'unclassified-context', title: 'Unclassified Context', effect: 'No stable context was selected.', mechanicalSeed: 'Treat the first interpretation as provisional.', inventoryStatus: status
      };
      const prototype = choosePrototype(location, catalogLine, input.baseLocations, input.contextExpansion, line) || input.baseLocations?.prototypes?.[0] || { sourcePrototype: 1 };
      const contexts = allContexts(input.baseLocations, input.contextExpansion);
      const prototypeIndex = Math.max(0, (input.baseLocations?.prototypes || []).findIndex(item => item.sourcePrototype === prototype.sourcePrototype));
      const contextIndex = Math.max(0, contexts.findIndex(item => item.id === context.id));
      const variant = prototypeIndex * Math.max(1, contexts.length) + contextIndex + 1;

      const facade = interpolate(pick('facade-opener', pools.publicFacadeOpeners, location, line, status), location);
      const facadeDetail = pick('facade-detail', pools.facadeDetails, location, line, status);
      const pressure = pick('operational-pressure', pools.operationalPressures, location, line, status);
      const statusManifestation = pick(`status-${status}`, pools.statusManifestations?.[status], location, line, context.id);
      const catalogManifestations = pools.lineManifestations?.[catalogLine] || [];
      const unifiedManifestations = line === 'unified' ? pools.lineManifestations?.unified || [] : [];
      const manifestationPool = line === 'unified' ? [...catalogManifestations, ...unifiedManifestations] : catalogManifestations;
      const lineManifestation = pick(`catalog-manifestation-${catalogLine}`, manifestationPool, location, line, context.id);
      const complication = pick('mechanical-complication', pools.mechanicalComplications, location, line, context.id);
      const pressureLink = ` The location-specific expression is currently entangled with this mundane operational pressure: ${pressure}`;
      const catalogPrefix = line === 'unified' ? `${catalogLabel} catalog expression: ` : '';

      let hiddenFunction;
      if (status === 'MUNDANE') hiddenFunction = `No confirmed supernatural function. ${statusManifestation} The wider ${theme.label} may shape local speculation, but no evidence assigns this location an occult role.${pressureLink}`;
      else if (status === 'TANGENTIAL') hiddenFunction = `${catalogPrefix}${statusManifestation} Regional theme: ${theme.label} — ${theme.description} ${lineManifestation} The trace does not establish ownership or permanent occupation.${pressureLink}`;
      else if (status === 'ACTIVE_UNREGISTERED') hiddenFunction = `${catalogPrefix}${statusManifestation} Regional theme: ${theme.label} — ${theme.description} ${lineManifestation}${pressureLink}`;
      else hiddenFunction = `${catalogPrefix}${statusManifestation} Regional theme: ${theme.label} — ${theme.description} ${lineManifestation}${pressureLink}`;

      const supernatural = status !== 'MUNDANE';
      const alignments = pools.characterAlignments?.[catalogLine] || pools.characterAlignments?.unified || [];
      const alignment = pick(`character-alignment-${catalogLine}`, alignments, location, line, theme.id);
      const tenure = pick('character-tenure', pools.tenures, location, line, theme.id);
      const aesthetic = pick('character-aesthetic', pools.aestheticProfiles, location, line, alignment);
      const tell = pick('character-tell', pools.behavioralTells, location, line, alignment);
      const temporalObject = pick('temporal-object', pools.temporalObjects, location, line, alignment);
      const anchorBehavior = pick('anchor-behavior', pools.anchorBehaviors, location, line, temporalObject);
      const trauma = pick('trauma', pools.traumaEvents, location, line, alignment);
      const secret = pick('secret-operation', pools.secretOperations, location, line, theme.id);
      const vulnerability = pick('vulnerability', pools.vulnerabilities, location, line, alignment);
      const sensoryCondition = pick('sensory-condition', pools.sensoryConditions, location, line, status);
      const sensoryConsequence = pick('sensory-consequence', pools.sensoryConsequences, location, line, sensoryCondition);
      const mediaSource = pick('media-source', pools.mediaSources, location, line, status);
      const mediaEvent = pick('media-event', pools.mediaEvents, location, line, mediaSource);
      const mediaInstruction = pick('media-instruction', pools.mediaInstructions, location, line, mediaEvent);
      const rumorSource = pick('rumor-source', pools.rumorSources, location, line, status);
      const rumorClaim = pick('rumor-claim', pools.rumorClaims, location, line, rumorSource);
      const rumorConsequence = pick('rumor-consequence', pools.rumorConsequences, location, line, rumorClaim);

      const publicFacade = `${location.name} ${facade}. ${facadeDetail} ${pressure}`;
      const contextEffect = `${line === 'unified' ? `${catalogLabel} lens: ` : ''}${context.effect} ${statusManifestation}`;
      const mechanicalSeed = `${context.mechanicalSeed} ${complication}`;
      const embeddedCharacter = supernatural ? `${line === 'unified' ? `${catalogLabel} — ` : ''}${alignment}; ${tenure} — ${aesthetic}. ${tell}` : 'No supernatural custodian is assigned.';
      const temporalAnchor = supernatural ? `${capitalize(temporalObject)}. ${anchorBehavior}` : 'No occult temporal anchor is recorded.';
      const traumaticCatalyst = supernatural ? `They ${trauma}.` : 'No supernatural catalyst is documented.';
      const operationalSecret = supernatural ? `They are ${secret}.` : 'No active supernatural plot is confirmed.';
      const characterVulnerability = supernatural ? `They ${vulnerability}.` : 'Ordinary commercial, civic, operational, and structural vulnerabilities only.';
      const sensoryAnchor = `${capitalize(sensoryCondition)}. ${sensoryConsequence}`;
      const mediaFeed = `“${capitalize(mediaSource)}: ${capitalize(mediaEvent)}. ${mediaInstruction}”`;
      const rumor = `${capitalize(rumorSource)} say ${rumorClaim}. ${rumorConsequence}`;
      const regionalTheme = { ...clone(theme), catalogLine, catalogLabel };

      return {
        status,
        catalogLine,
        catalogLabel,
        context,
        prototype,
        variant,
        effectiveVariantCount: Math.max(1, (input.baseLocations?.prototypes || []).length) * Math.max(1, contexts.length),
        regionalTheme,
        publicFacade,
        hiddenFunction,
        contextTitle: context.title,
        contextEffect,
        mechanicalSeed,
        embeddedCharacter,
        temporalAnchor,
        traumaticCatalyst,
        operationalSecret,
        vulnerability: characterVulnerability,
        sensoryAnchor,
        mediaFeed,
        rumor,
        diversitySignature: hash32([catalogLine, theme.id, facade, facadeDetail, pressure, statusManifestation, lineManifestation, alignment, tenure, aesthetic, tell, temporalObject, trauma, secret, vulnerability, sensoryCondition, sensoryConsequence, mediaSource, mediaEvent, mediaInstruction, rumorSource, rumorClaim, rumorConsequence].join('|')).toString(16).padStart(8, '0')
      };
    }

    return Object.freeze({ generate, pick, themeFor, neighborhoodKey: location => neighborhoodKey(location, cellDegrees), used });
  }

  return Object.freeze({
    hash32,
    inventoryStatusFromSeed,
    statusProfile,
    regionalThemeVariantCount,
    neighborhoodKey,
    createSession,
    catalogLines: CATALOG_LINES,
    catalogLabels: CATALOG_LABELS,
    statusProfiles: STATUS_PROFILES,
    regionalThemeComponents: THEME_COMPONENTS,
    regionalThemeDynamics: THEME_DYNAMICS,
    legacyThemeFrequencyDenominator: LEGACY_THEME_DENOMINATOR,
    themeDistrictMultiplier: THEME_DISTRICT_MULTIPLIER
  });
});
