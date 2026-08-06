(() => {
  'use strict';

  const ARCHIVE_VERSION = '0.1.0';
  const DATA = Object.freeze({
    archiveId: 'cafarron-corridor-warhammer-40k-lore',
    title: 'Cafarron Corridor Lore Archive',
    setting: 'Warhammer 40,000 fan campaign',
    version: ARCHIVE_VERSION,
    scopeNote: 'Searchable campaign-lore archive. Coordinates, formal transit lanes, trade-house routes, and the future three-dimensional map are intentionally not assigned in this phase.',
    provenanceRules: {
      'user-established': 'Directly established or corrected by the campaign author.',
      'story-grounded': 'Explicitly stated in a story from r/EmperorProtects.',
      'inferred': 'Strongly implied by the corpus but not explicitly classified.',
      'unresolved': 'Named in the corpus but not yet sufficiently defined for the authoritative map.'
    },
    records: [
      {
        id: 'sector-cafarron-corridor',
        name: 'Cafarron Corridor',
        category: 'sector',
        objectType: 'Sector corridor',
        provenance: 'user-established',
        confidence: 'authoritative',
        status: 'Active campaign region',
        summary: 'The sector of space in which the local Emperor Protects stories and campaign locations occur.',
        relationships: ['Contains the local systems and worlds indexed in this archive.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Campaign author clarification', url: '' }],
        tags: ['sector', 'corridor', 'campaign region']
      },
      {
        id: 'system-galadin',
        name: 'Galadin System',
        aliases: ['Galladin System'],
        category: 'system',
        objectType: 'Star system',
        provenance: 'user-established',
        confidence: 'authoritative',
        status: 'Core local system',
        summary: 'System containing Galadin Prime. Galladin is retained as a local dialect spelling rather than treated as a separate system.',
        relationships: ['Contains Galadin Prime.', 'Contains the city and cultural designation Galladin’s Throne / Yeldon’s Throne.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [
          { label: "A Harbormaster's Hope", url: 'https://www.reddit.com/r/EmperorProtects/new.json?after=t3_1ggo856&limit=10&raw_json=1' },
          { label: 'Campaign author clarification', url: '' }
        ],
        tags: ['galadin', 'galladin', 'core system']
      },
      {
        id: 'world-galadin-prime',
        name: 'Galadin Prime',
        aliases: ['Galladin Prime'],
        category: 'world',
        objectType: 'Planet',
        provenance: 'user-established',
        confidence: 'authoritative',
        status: 'Active strategic world',
        classification: 'Ocean-and-ice world; major shipping and pilgrimage location',
        summary: 'The primary world of the Galadin System. Local speech produces the Galadin/Galladin spelling difference.',
        relationships: ['Capital city: Galladin’s Throne / Yeldon’s Throne.', 'Near a significant warp-trade route and comparatively stable corridor.'],
        conflict: 'No current planetary conflict has been confirmed in the archive.',
        imperialPresence: 'Port, shipping, civic, and pilgrimage functions are story-grounded; exact stationed units remain unspecified.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [
          { label: "A Harbormaster's Hope", url: 'https://www.reddit.com/r/EmperorProtects/new.json?after=t3_1ggo856&limit=10&raw_json=1' },
          { label: 'The Hunger of Gareth Thorne', url: 'https://www.reddit.com/r/EmperorProtects/comments/1fq24wk/the_hunger_of_gareth_thorne/' },
          { label: 'Campaign author clarification', url: '' }
        ],
        tags: ['planet', 'trade', 'pilgrimage', 'galadin', 'galladin']
      },
      {
        id: 'place-yeldons-throne',
        name: 'Yeldon’s Throne',
        aliases: ['Galladin’s Throne'],
        category: 'place',
        objectType: 'Planetary cultural name and capital city',
        provenance: 'user-established',
        confidence: 'authoritative',
        status: 'Dual-use local designation',
        summary: 'The same name is used culturally for the planet and literally for the capital city on Galadin Prime. The apparent discrepancy is a local dialect difference.',
        relationships: ['Located on Galadin Prime.', 'Culturally used as a name for the world as well as the city.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [
          { label: 'The Hunger of Gareth Thorne', url: 'https://www.reddit.com/r/EmperorProtects/comments/1fq24wk/the_hunger_of_gareth_thorne/' },
          { label: "A Harbormaster's Hope", url: 'https://www.reddit.com/r/EmperorProtects/new.json?after=t3_1ggo856&limit=10&raw_json=1' },
          { label: 'Campaign author clarification', url: '' }
        ],
        tags: ['city', 'capital', 'dialect', 'yeldon', 'galladin throne']
      },
      {
        id: 'world-presteria-iv',
        name: 'Presteria IV',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Active; current condition unspecified',
        classification: 'Imperial ecclesiastical world by demonstrated function',
        summary: 'Origin world associated with Grand Reverend Grellholm and the conclave delegation sent to Terra.',
        imperialPresence: 'Ecclesiastical institutions are confirmed; exact stationed military units are not yet specified.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: "Chancellor Ardenal's Conclave", url: 'https://www.reddit.com/r/EmperorProtects/comments/1vfnma7/chancellor_ardenals_conclave/' }],
        tags: ['planet', 'ecclesiarchy', 'conclave']
      },
      {
        id: 'system-kertora-semoises',
        name: 'Kertora Semoises System',
        category: 'system',
        objectType: 'Inferred star system',
        provenance: 'inferred',
        confidence: 'medium',
        status: 'Campaign-linked system',
        summary: 'Provisional system grouping for Kertora Semoises Prime and its promethium moon Kertora Semoises V.',
        relationships: ['Contains Kertora Semoises Prime.', 'Kertora Semoises V orbits the primary world.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'In Fur and Brass, We Endure', url: 'https://www.reddit.com/r/EmperorProtects/comments/1qebjcb/in_fur_and_brass_we_endure/' }],
        tags: ['system', 'promethium', 'syndrione front']
      },
      {
        id: 'world-kertora-semoises-prime',
        name: 'Kertora Semoises Prime',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Active; current condition unspecified',
        classification: 'Rocky world',
        summary: 'Primary world orbited by the promethium moon Kertora Semoises V.',
        relationships: ['Parent body of Kertora Semoises V.', 'Campaign-linked to the Syndrione Front.'],
        conflict: 'Conflict-adjacent; the exact current planetary campaign state remains unspecified.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'In Fur and Brass, We Endure', url: 'https://www.reddit.com/r/EmperorProtects/comments/1qebjcb/in_fur_and_brass_we_endure/' }],
        tags: ['planet', 'rocky world', 'syndrione front']
      },
      {
        id: 'moon-kertora-semoises-v',
        name: 'Kertora Semoises V',
        category: 'world',
        objectType: 'Moon',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Campaign world; current condition unspecified',
        classification: 'Promethium moon',
        summary: 'Promethium-producing moon orbiting Kertora Semoises Prime.',
        relationships: ['Orbits Kertora Semoises Prime.', 'Campaign-linked to the Syndrione Front.'],
        conflict: 'Conflict-adjacent.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'In Fur and Brass, We Endure', url: 'https://www.reddit.com/r/EmperorProtects/comments/1qebjcb/in_fur_and_brass_we_endure/' }],
        tags: ['moon', 'promethium', 'fuel', 'syndrione front']
      },
      {
        id: 'world-parban',
        name: 'Parban',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Prior combat theatre; current condition unspecified',
        classification: 'Dusty agri-world; synth-corn producer',
        summary: 'Agricultural world referenced by veterans when comparing the fighting on the Syndrione Front.',
        conflict: 'A prior theatre of combat; current recovery status has not been defined.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'In Fur and Brass, We Endure', url: 'https://www.reddit.com/r/EmperorProtects/comments/1qebjcb/in_fur_and_brass_we_endure/' }],
        tags: ['planet', 'agri-world', 'synth-corn', 'prior conflict']
      },
      {
        id: 'world-jhasyiapan',
        name: 'Jhasyi’apan',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Ruined or rediscovered frontier world',
        classification: 'Terraformed pre-Imperial frontier world',
        summary: 'Remote settlement world on the fuzzy edge of charted space.',
        relationships: ['Located toward the galactic north or frontier edge in the story description.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'On the Fuzzy Edge', url: 'https://www.reddit.com/r/EmperorProtects/comments/1q9z2ff/on_the_fuzzy_edge/' }],
        tags: ['planet', 'frontier', 'pre-imperial', 'terraformed']
      },
      {
        id: 'world-pilcher-7',
        name: 'Pilcher 7',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Under threat and evacuation pressure',
        classification: 'Frontier world',
        summary: 'An outer-cluster frontier world facing the crisis described in Flight of Pilcher 7.',
        conflict: 'Active Gray threat and evacuation crisis.',
        relationships: ['An older story reference places it in the outermost cluster of the CentEven Sector; this regional label remains unresolved against the author-established Cafarron Corridor framework.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Flight of Pilcher 7', url: 'https://www.reddit.com/r/EmperorProtects/comments/1mo2ed1/flight_of_pilcher_7/' }],
        tags: ['planet', 'frontier', 'evacuation', 'gray threat', 'conflict']
      },
      {
        id: 'system-gazeras',
        name: 'Gazeras System',
        category: 'system',
        objectType: 'Inferred star system',
        provenance: 'inferred',
        confidence: 'medium',
        status: 'Active system',
        summary: 'Provisional system grouping for Gazeras Prime and its agricultural moon Prescia.',
        relationships: ['Contains Gazeras Prime.', 'Prescia orbits Gazeras Prime.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Commissar, Reluctant Academic, Professional', url: 'https://www.reddit.com/r/EmperorProtects/comments/1ovtfru/commissar_reluctant_academic_professional/' }],
        tags: ['system', 'agriculture', 'prescia']
      },
      {
        id: 'world-gazeras-prime',
        name: 'Gazeras Prime',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Active; current condition unspecified',
        classification: 'Primary world; subtype not yet stated',
        summary: 'Primary body orbited by the agricultural moon Prescia.',
        relationships: ['Parent body of Prescia.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Commissar, Reluctant Academic, Professional', url: 'https://www.reddit.com/r/EmperorProtects/comments/1ovtfru/commissar_reluctant_academic_professional/' }],
        tags: ['planet', 'primary world', 'prescia']
      },
      {
        id: 'moon-prescia',
        name: 'Prescia',
        category: 'world',
        objectType: 'Moon',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Active',
        classification: 'Agricultural moon',
        summary: 'Agricultural moon orbiting Gazeras Prime, with Schola-associated history in the source story.',
        relationships: ['Orbits Gazeras Prime.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Commissar, Reluctant Academic, Professional', url: 'https://www.reddit.com/r/EmperorProtects/comments/1ovtfru/commissar_reluctant_academic_professional/' }],
        tags: ['moon', 'agriculture', 'schola']
      },
      {
        id: 'world-sullivan',
        name: 'Sullivan',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Militarized; exact current condition unspecified',
        classification: 'War world',
        summary: 'Geravan’s homeworld and upbringing environment.',
        imperialPresence: 'A war-world culture is confirmed; exact formations and stationed units remain unspecified.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Sultry Temptations', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['planet', 'war world', 'geravan']
      },
      {
        id: 'world-reaalspekcs-7',
        name: 'ReaalSpekcs 7',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Ruined and hazardous',
        classification: 'Rocky world with thin atmosphere and dead hives',
        summary: 'A convoy operating zone marked by dead hive structures and a hostile environment.',
        conflict: 'No active belligerent is confirmed; the world remains a physical and operational hazard.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Samuel Addarbass — Part 1', url: 'https://www.reddit.com/r/EmperorProtects/comments/1ljxwaf/samuel_addarbass_part1/' }],
        tags: ['planet', 'dead hives', 'thin atmosphere', 'hazard']
      },
      {
        id: 'world-effesatran',
        name: 'Effesatran',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Remote and strategically sensitive',
        classification: 'Aeldari Shrine World; fertile; Webway-linked',
        summary: 'An Aeldari shrine world at the edge of charted space containing a Webway Gate.',
        relationships: ['Located at the edge of charted space.', 'Contains a Webway Gate.'],
        conflict: 'No current battle is confirmed; approach is strategically sensitive.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Zarata Karanas', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['planet', 'aeldari', 'shrine world', 'webway', 'sensitive']
      },
      {
        id: 'system-valikor',
        name: 'Valikor System',
        category: 'system',
        objectType: 'Inferred star system',
        provenance: 'inferred',
        confidence: 'medium',
        status: 'Devastated industrial system',
        summary: 'Provisional grouping for Valikor Secundus and its destroyed moon Iterum.',
        relationships: ['Contains Valikor Secundus.', 'Iterum was a moon of Valikor and was vaporized.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Zedge, the Grot Who Lived', url: 'https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/' }],
        tags: ['system', 'forge', 'destroyed moon']
      },
      {
        id: 'world-valikor-secundus',
        name: 'Valikor Secundus',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Devastated',
        classification: 'Forge-industrial hive world',
        summary: 'Its hive-forges were described as vital to the Krellan Chain.',
        relationships: ['Associated with the Krellan Chain.', 'Located in or operationally associated with Subsector Tau-9.', 'Parent world of Iterum.'],
        conflict: 'Devastated in the conflict described in Zedge, the Grot Who Lived.',
        imperialPresence: 'Operation Silent Venom and Subsector Tau-9 are confirmed operational references; exact permanent units remain unspecified.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Zedge, the Grot Who Lived', url: 'https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/' }],
        tags: ['planet', 'hive-forge', 'krellan chain', 'tau-9', 'devastated']
      },
      {
        id: 'moon-iterum',
        name: 'Iterum',
        category: 'world',
        objectType: 'Moon',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Destroyed',
        classification: 'Former moon of Valikor',
        summary: 'Valikor’s moon, vaporized during the events surrounding Valikor Secundus.',
        relationships: ['Formerly orbited Valikor Secundus.'],
        conflict: 'Destroyed.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Zedge, the Grot Who Lived', url: 'https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/' }],
        tags: ['moon', 'destroyed', 'valikor']
      },
      {
        id: 'world-pelzane',
        name: 'Pelzane',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Dying world',
        classification: 'Dying planetary environment',
        summary: 'The world orbited by Tenelja Station.',
        relationships: ['Tenelja Station is in orbit.'],
        conflict: 'No belligerent conflict is confirmed; planetary decline is the central hazard.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Of Blood and Wires: The Litanies of Tenelja Station', url: 'https://www.reddit.com/r/EmperorProtects/comments/1kvp2hx/of_blood_and_wires_the_litanies_of_tenelja_station/' }],
        tags: ['planet', 'dying world', 'tenelja station']
      },
      {
        id: 'world-new-presidio',
        name: 'New Presidio',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Active; current condition unspecified',
        classification: 'Imperial capital world with polar wastes',
        summary: 'Planetary capital world containing Antegra Station in its high polar wastes.',
        relationships: ['Antegra Station is located in the polar wastes.'],
        imperialPresence: 'Antegra Station is confirmed; its full garrison and command structure remain unspecified.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Antegra Station', url: 'https://www.reddit.com/r/EmperorProtects/comments/1lr8fmy/antegra_station/' }],
        tags: ['planet', 'capital world', 'antegra station', 'polar wastes']
      },
      {
        id: 'world-segrea',
        name: 'Segrea',
        category: 'world',
        objectType: 'Planet',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Current condition unspecified',
        classification: 'Medieval world',
        summary: 'Explicitly described as the medieval world of Segrea.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Older Emperor Protects story corpus', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['planet', 'medieval world']
      },
      {
        id: 'region-syndrione-front',
        name: 'Syndrione Front',
        category: 'region',
        objectType: 'Campaign front or conflict region',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Campaign region',
        summary: 'A named front connected to the fighting involving Kertora Semoises and compared with prior combat on Parban.',
        relationships: ['Campaign-linked to Kertora Semoises V.', 'Parban is referenced as a prior theatre in the same military context.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'In Fur and Brass, We Endure', url: 'https://www.reddit.com/r/EmperorProtects/comments/1qebjcb/in_fur_and_brass_we_endure/' }],
        tags: ['front', 'campaign region', 'conflict']
      },
      {
        id: 'region-krellan-chain',
        name: 'Krellan Chain',
        category: 'region',
        objectType: 'Regional industrial chain',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Industrial network under strain',
        summary: 'A linked regional industrial network whose lifeblood included the hive-forges of Valikor Secundus.',
        relationships: ['Valikor Secundus is a major industrial anchor.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Zedge, the Grot Who Lived', url: 'https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/' }],
        tags: ['industrial network', 'valikor', 'forge']
      },
      {
        id: 'region-subsector-tau-9',
        name: 'Subsector Tau-9',
        category: 'region',
        objectType: 'Subsector or operational designation',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Operational region',
        summary: 'Named operational subsector in the Valikor and Operation Silent Venom context.',
        relationships: ['Operationally associated with Valikor Secundus.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Zedge, the Grot Who Lived', url: 'https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/' }],
        tags: ['subsector', 'tau-9', 'operation silent venom']
      },
      {
        id: 'system-havenvard',
        name: 'Havenvard System',
        category: 'system',
        objectType: 'Star system',
        provenance: 'story-grounded',
        confidence: 'high',
        status: 'Known system; member worlds not yet indexed',
        summary: 'The system is directly named in the corpus, but no named planetary member has yet been attached to it in this archive.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Older Emperor Protects story corpus', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['system', 'unassigned worlds']
      },
      {
        id: 'reference-velis-nox',
        name: 'Velis Nox',
        category: 'unresolved',
        objectType: 'Unresolved named location',
        provenance: 'unresolved',
        confidence: 'low',
        status: 'Not map-ready',
        summary: 'The Purgation of Velis Nox is named, but the text does not establish whether Velis Nox is a planet, moon, system, city, or campaign zone.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: "Chancellor Ardenal's Conclave", url: 'https://www.reddit.com/r/EmperorProtects/comments/1vfnma7/chancellor_ardenals_conclave/' }],
        tags: ['unresolved', 'purgation', 'location']
      },
      {
        id: 'reference-cholswan',
        name: "Chöl’swanö'atro'to",
        category: 'unresolved',
        objectType: 'Unresolved destination',
        provenance: 'unresolved',
        confidence: 'low',
        status: 'Not map-ready',
        summary: 'Named as a destination or location without a confirmed celestial-body classification.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Older Emperor Protects story corpus', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['unresolved', 'destination']
      },
      {
        id: 'reference-cascordian',
        name: 'Cascordian',
        category: 'unresolved',
        objectType: 'Unresolved adjectival origin',
        provenance: 'unresolved',
        confidence: 'low',
        status: 'Not map-ready',
        summary: 'Cascordian factories are referenced, but the adjective may identify a world, system, people, industrial tradition, or polity.',
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Older Emperor Protects story corpus', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['unresolved', 'factories', 'origin']
      },
      {
        id: 'unit-caldan-34th',
        name: 'Caldan 34th',
        category: 'imperial-force',
        objectType: 'Imperial Guard regiment',
        provenance: 'story-grounded',
        confidence: 'high for regiment; low for homeworld name',
        status: 'Regimental-origin reference',
        summary: 'The regiment is stated to hail from an agri-world. Treating that world as being named Caldan remains provisional.',
        relationships: ['Possible but unconfirmed homeworld: Caldan.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Imperial Guard regiment sequence', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['imperial guard', 'regiment', 'agri-world', 'provisional homeworld']
      },
      {
        id: 'unit-mirradon-103rd',
        name: 'Mirradon 103rd',
        category: 'imperial-force',
        objectType: 'Imperial Guard regiment',
        provenance: 'story-grounded',
        confidence: 'high for regiment; medium for homeworld name',
        status: 'Regimental-origin reference',
        summary: 'The regiment comes from a smog-and-ash world. Mirradon as the formal planetary name remains provisional.',
        relationships: ['Possible but unconfirmed homeworld: Mirradon.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Imperial Guard regiment sequence', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['imperial guard', 'regiment', 'smog', 'ash world']
      },
      {
        id: 'unit-brannis-12th',
        name: 'Brannis 12th',
        category: 'imperial-force',
        objectType: 'Imperial Guard regiment',
        provenance: 'story-grounded',
        confidence: 'high for regiment; medium for homeworld name',
        status: 'Regimental-origin reference',
        summary: 'The regiment comes from a world of discipline and order. Brannis as the formal planetary name remains provisional.',
        relationships: ['Possible but unconfirmed homeworld: Brannis.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Imperial Guard regiment sequence', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['imperial guard', 'regiment', 'discipline', 'order']
      },
      {
        id: 'unit-draven-62nd',
        name: 'Draven 62nd',
        category: 'imperial-force',
        objectType: 'Imperial Guard regiment',
        provenance: 'story-grounded',
        confidence: 'high for regiment; low for homeworld name',
        status: 'Regimental reference',
        summary: 'The regiment is named in the corpus, but no explicit homeworld statement accompanies the located passage.',
        relationships: ['Do not map a Draven world without further confirmation.'],
        map: { x: null, y: null, z: null, ready: false },
        sources: [{ label: 'Imperial Guard regiment sequence', url: 'https://www.reddit.com/r/EmperorProtects/new/?limit=100' }],
        tags: ['imperial guard', 'regiment', 'unresolved homeworld']
      }
    ]
  });

  const CATEGORY_LABELS = Object.freeze({
    all: 'All Records',
    world: 'Worlds & Moons',
    system: 'Systems',
    region: 'Regions',
    place: 'Named Places',
    'imperial-force': 'Imperial Forces',
    unresolved: 'Unresolved'
  });

  const state = { initialized: false, activeCategory: 'all', query: '' };

  function ensureStyles() {
    if (document.getElementById('warhammer-40k-wiki-styles')) return;
    const style = document.createElement('style');
    style.id = 'warhammer-40k-wiki-styles';
    style.textContent = `
      #warhammer-40k .warhammer-lore-shell { display: grid; gap: 1rem; }
      #warhammer-40k .warhammer-lore-notice { border: 1px solid rgba(196, 156, 72, .55); border-left: .35rem solid #b99242; padding: 1rem; background: linear-gradient(135deg, rgba(185,146,66,.12), rgba(19,23,28,.04)); border-radius: .75rem; }
      #warhammer-40k .warhammer-lore-controls { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--panel-border, #48515c); border-radius: .75rem; background: var(--panel-background, rgba(20,24,30,.7)); }
      #warhammer-40k .warhammer-lore-search-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: .75rem; align-items: end; }
      #warhammer-40k .warhammer-lore-search-row label { display: grid; gap: .35rem; font-weight: 700; }
      #warhammer-40k .warhammer-lore-search-row input { width: 100%; }
      #warhammer-40k .warhammer-filter-row { display: flex; flex-wrap: wrap; gap: .5rem; }
      #warhammer-40k .warhammer-filter-row button[aria-pressed="true"] { outline: 2px solid #c9a34c; outline-offset: 2px; }
      #warhammer-40k .warhammer-lore-summary { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
      #warhammer-40k .warhammer-record-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1rem; }
      #warhammer-40k .warhammer-record { display: grid; align-content: start; gap: .7rem; padding: 1rem; border: 1px solid var(--panel-border, #48515c); border-radius: .85rem; background: var(--panel-background, rgba(20,24,30,.72)); }
      #warhammer-40k .warhammer-record h3 { margin: 0; }
      #warhammer-40k .warhammer-record-meta { display: flex; flex-wrap: wrap; gap: .4rem; }
      #warhammer-40k .warhammer-record-definition { display: grid; grid-template-columns: minmax(7rem, .45fr) minmax(0, 1fr); gap: .4rem .75rem; margin: 0; }
      #warhammer-40k .warhammer-record-definition dt { font-weight: 800; color: #d1ae5c; }
      #warhammer-40k .warhammer-record-definition dd { margin: 0; }
      #warhammer-40k .warhammer-source-list { margin: 0; padding-left: 1.2rem; }
      #warhammer-40k .warhammer-source-list a { overflow-wrap: anywhere; }
      #warhammer-40k .warhammer-map-contract { border-style: dashed; }
      #warhammer-40k .warhammer-empty { padding: 2rem; text-align: center; border: 1px dashed var(--panel-border, #48515c); border-radius: .75rem; }
      @media (max-width: 700px) {
        #warhammer-40k .warhammer-lore-search-row { grid-template-columns: 1fr; }
        #warhammer-40k .warhammer-record-definition { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function makeBadge(text, className = '') {
    const span = document.createElement('span');
    span.className = `badge ${className}`.trim();
    span.textContent = text;
    return span;
  }

  function appendDefinition(list, label, value) {
    if (!value || (Array.isArray(value) && !value.length)) return;
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = Array.isArray(value) ? value.join(' ') : String(value);
    list.append(dt, dd);
  }

  function searchText(record) {
    return [
      record.name,
      ...(record.aliases || []),
      record.category,
      record.objectType,
      record.provenance,
      record.status,
      record.classification,
      record.summary,
      record.conflict,
      record.imperialPresence,
      ...(record.relationships || []),
      ...(record.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function visibleRecords() {
    const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    return DATA.records.filter(record => {
      if (state.activeCategory !== 'all' && record.category !== state.activeCategory) return false;
      if (!terms.length) return true;
      const text = searchText(record);
      return terms.every(term => text.includes(term));
    });
  }

  function recordCard(record) {
    const article = document.createElement('article');
    article.className = 'warhammer-record';
    article.dataset.recordId = record.id;
    article.dataset.category = record.category;

    const meta = document.createElement('div');
    meta.className = 'warhammer-record-meta';
    meta.append(
      makeBadge(CATEGORY_LABELS[record.category] || record.category, `section-${record.category}`),
      makeBadge(record.provenance, `status-${record.provenance}`),
      makeBadge(record.confidence || 'unspecified')
    );

    const title = document.createElement('h3');
    title.textContent = record.name;

    const summary = document.createElement('p');
    summary.textContent = record.summary;

    const details = document.createElement('dl');
    details.className = 'warhammer-record-definition';
    appendDefinition(details, 'Aliases', record.aliases);
    appendDefinition(details, 'Type', record.objectType);
    appendDefinition(details, 'Status', record.status);
    appendDefinition(details, 'Classification', record.classification);
    appendDefinition(details, 'Relationships', record.relationships);
    appendDefinition(details, 'Current conflict', record.conflict);
    appendDefinition(details, 'Imperial presence', record.imperialPresence);
    appendDefinition(details, 'Map state', record.map?.ready ? 'Coordinate-ready' : 'Coordinates not yet assigned');

    article.append(meta, title, summary, details);

    if (record.sources?.length) {
      const sourceHeading = document.createElement('strong');
      sourceHeading.textContent = 'Sources';
      const sourceList = document.createElement('ul');
      sourceList.className = 'warhammer-source-list';
      record.sources.forEach(source => {
        const item = document.createElement('li');
        if (source.url) {
          const link = document.createElement('a');
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = source.label;
          item.appendChild(link);
        } else {
          item.textContent = source.label;
        }
        sourceList.appendChild(item);
      });
      article.append(sourceHeading, sourceList);
    }

    return article;
  }

  function render() {
    const grid = document.getElementById('warhammer-lore-records');
    const summary = document.getElementById('warhammer-lore-result-summary');
    if (!grid) return;
    const records = visibleRecords();
    grid.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'warhammer-empty';
      empty.textContent = 'No lore records match the current search and category filter.';
      grid.appendChild(empty);
    } else {
      records.forEach(record => grid.appendChild(recordCard(record)));
    }
    if (summary) {
      summary.textContent = `${records.length} of ${DATA.records.length} records shown · archive version ${DATA.version}`;
    }
  }

  function exportArchive() {
    const payload = JSON.stringify(DATA, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cafarron-corridor-lore-${DATA.version}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function buildInterface(root) {
    root.replaceChildren();
    const shell = document.createElement('div');
    shell.className = 'warhammer-lore-shell';

    const notice = document.createElement('section');
    notice.className = 'warhammer-lore-notice';
    const noticeTitle = document.createElement('h3');
    noticeTitle.textContent = 'Archive scope and authority';
    const noticeCopy = document.createElement('p');
    noticeCopy.textContent = DATA.scopeNote;
    const disclaimer = document.createElement('p');
    disclaimer.textContent = 'Unofficial, non-commercial fan campaign material. Warhammer 40,000 and associated names remain the property of their respective rights holders.';
    notice.append(noticeTitle, noticeCopy, disclaimer);

    const controls = document.createElement('section');
    controls.className = 'warhammer-lore-controls';
    const searchRow = document.createElement('div');
    searchRow.className = 'warhammer-lore-search-row';
    const label = document.createElement('label');
    label.htmlFor = 'warhammer-lore-search';
    label.textContent = 'Search Cafarron Corridor lore';
    const input = document.createElement('input');
    input.id = 'warhammer-lore-search';
    input.className = 'tool-input';
    input.type = 'search';
    input.placeholder = 'Search worlds, systems, conflicts, regiments, aliases, and story sources…';
    label.appendChild(input);
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'link-button';
    exportButton.textContent = 'Download Wiki JSON';
    searchRow.append(label, exportButton);

    const filters = document.createElement('div');
    filters.className = 'warhammer-filter-row';
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Lore categories');
    Object.entries(CATEGORY_LABELS).forEach(([category, labelText]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'layout-button';
      button.dataset.warhammerCategory = category;
      button.setAttribute('aria-pressed', category === 'all' ? 'true' : 'false');
      button.textContent = labelText;
      filters.appendChild(button);
    });

    const resultSummary = document.createElement('div');
    resultSummary.id = 'warhammer-lore-result-summary';
    resultSummary.className = 'registry-status warhammer-lore-summary';
    resultSummary.setAttribute('role', 'status');
    resultSummary.setAttribute('aria-live', 'polite');

    controls.append(searchRow, filters, resultSummary);

    const mapContract = document.createElement('section');
    mapContract.className = 'warhammer-record warhammer-map-contract';
    const mapTitle = document.createElement('h3');
    mapTitle.textContent = 'Future three-dimensional sector map contract';
    const mapCopy = document.createElement('p');
    mapCopy.textContent = 'Every archive record already exposes nullable X, Y, and Z fields and a map-ready state. Coordinates, transit lanes, trade-house freight routes, hazard volumes, and anchorage nodes will be added only after the lore records are reviewed and approved.';
    mapContract.append(mapTitle, mapCopy);

    const grid = document.createElement('div');
    grid.id = 'warhammer-lore-records';
    grid.className = 'warhammer-record-grid';

    shell.append(notice, controls, mapContract, grid);
    root.appendChild(shell);

    input.addEventListener('input', () => {
      state.query = input.value.trim();
      render();
    });
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-warhammer-category]');
      if (!button) return;
      state.activeCategory = button.dataset.warhammerCategory || 'all';
      filters.querySelectorAll('[data-warhammer-category]').forEach(candidate => {
        candidate.setAttribute('aria-pressed', candidate === button ? 'true' : 'false');
      });
      render();
    });
    exportButton.addEventListener('click', exportArchive);
    render();
  }

  function initialize() {
    const root = document.getElementById('warhammer-lore-root');
    if (!root) return;
    ensureStyles();
    if (!state.initialized) {
      state.initialized = true;
      buildInterface(root);
    } else {
      render();
    }
  }

  window.Warhammer40KLore = Object.freeze({ initialize, data: DATA, exportArchive });
})();
