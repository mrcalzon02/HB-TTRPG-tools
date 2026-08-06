(() => {
  'use strict';

  const DATA = Object.freeze({
  "archiveId": "cafarron-corridor-warhammer-40k-lore",
  "title": "Cafarron Corridor Strategic Archive",
  "setting": "Warhammer 40,000 fan campaign",
  "version": "0.6.0",
  "scopeDate": "2026-08-05",
  "scope": "93 public subreddit posts, plus campaign-author clarifications and exploratory cartographic placeholders.",
  "scopeNote": "This registry incorporates the Emperor Protects Sector-Map Source Index dated 2026-08-05. Named Astra Militarum origin worlds remain visible as Guard-origin survey contacts even when the formal planetary name is inferred. Warp corridors and trade routes are charted only as explicit campaign-author structures or clearly labelled provisional Navis/Munitorum planning lanes.",
  "sourcePolicy": "Lore claims display an exact story permalink or an explicit unresolved-source notice. Pagination endpoints are audit routes, not lore citations.",
  "coordinateSystem": {
    "name": "Cafarron Corridor Navis Survey Grid",
    "units": "relative campaign plotting units",
    "authority": "campaign cartographic layout",
    "note": "Coordinates establish usable three-dimensional relationships rather than official astronomical measurements."
  },
  "kpis": {
    "publicPostsEnumerated": 93,
    "celestialMapRecords": 53,
    "confirmedRecords": 31,
    "mapReadyReferenceRecords": 26,
    "guardOriginRecords": 16,
    "unnamedPlaceholders": 21,
    "aliasDecisions": 10,
    "primaryMapNodes": 25,
    "supportingMapNodes": 1,
    "provisionalMapNodes": 3,
    "unnamedMapNodes": 16,
    "exploratoryMapNodes": 25,
    "guardOriginMapNodes": 11,
    "majorWarpCorridors": 3,
    "tradeSupplyLanes": 3,
    "mappedConnections": 33
  },
  "evidenceTiers": [
    {
      "tier": "Confirmed",
      "meaning": "The source directly identifies the object, origin, or relationship.",
      "use": "May be displayed as established archive lore."
    },
    {
      "tier": "Strong",
      "meaning": "The source strongly implies the conclusion, but does not state every element directly.",
      "use": "Display with an inference notice."
    },
    {
      "tier": "Inferred",
      "meaning": "The conclusion is derived from unit naming, environmental detail, or contextual construction.",
      "use": "Display as provisional and preserve the reasoning."
    },
    {
      "tier": "Candidate",
      "meaning": "A named place or identity may be a celestial object or origin, but object class remains unresolved.",
      "use": "Retain in the archive without upgrading it to confirmed lore."
    },
    {
      "tier": "Unresolved",
      "meaning": "The record is known, but the exact source, identity, or relationship cannot yet be recovered.",
      "use": "Display as an indexed lead, not source-complete lore."
    }
  ],
  "normalizationRules": [
    "Galladin Prime and Galladin’s Throne are treated as one planetary object unless future canon explicitly separates them.",
    "Galladin, Galedin, and local Throne variants are preserved as aliases or dialect spellings rather than plotted as additional worlds.",
    "New Presidio preserves both a planet and a same-named capital city as separate geographic levels.",
    "Kertora Semoises V is a moon, not a fifth planet.",
    "Unit-derived homeworld names remain provisional when the story supplies only a regiment prefix or demonym.",
    "Deployment environments are not converted into homeworld facts.",
    "Composite regiments do not establish one shared planetary origin.",
    "Unnamed bodies remain unnamed; descriptive placeholders are not promoted into canonical proper names.",
    "Reddit pagination endpoints are coverage-audit routes and never evidence links for individual lore claims.",
    "Exploratory map contacts are explicitly non-canon and replacement-ready.",
    "Named Guard-origin worlds remain listed and mapped under an Astra Militarum origin layer; inference about the formal planetary name is displayed rather than used to delist the world.",
    "Narrative association, shared-story context, and regimental origin do not create a warp lane. Route lines require an authorial route structure, a navigation relationship, or an explicitly provisional trade/corridor designation."
  ],
  "threatStates": {
    "ork": {
      "label": "Ork / Orcoid Threat",
      "color": 6203486,
      "css": "#5ea85e",
      "description": "Active Ork war, infestation, or continuing orcoid proliferation."
    },
    "tyranid": {
      "label": "Tyranid / Genestealer Threat",
      "color": 10118100,
      "css": "#9a63d4",
      "description": "Confirmed or suspected Tyranid invasion, Genestealer infestation, or cult infiltration."
    },
    "heretical": {
      "label": "Heretical / Civil Conflict",
      "color": 13191754,
      "css": "#c94a4a",
      "description": "Active or historically immediate heretical revolt, civil conflict, or traitor campaign."
    },
    "standard": {
      "label": "Standard Imperial World",
      "color": 14136159,
      "css": "#d7b35f",
      "description": "Inhabited and charted with no active conflict presently recorded."
    },
    "dead": {
      "label": "Empty / Dead / Terminal World",
      "color": 7827962,
      "css": "#777a7a",
      "description": "Dead, empty, ruined beyond normal habitation, or in terminal planetary decline."
    },
    "unsurveyed": {
      "label": "Unsurveyed / Uninhabited",
      "color": 15790572,
      "css": "#f1f1ec",
      "description": "Unsurveyed, uninhabited, incompletely identified, or retained as an exploratory chart contact."
    },
    "anomalous": {
      "label": "Anomalous / Extradimensional Threat",
      "color": 5481862,
      "css": "#53a5c6",
      "description": "An active danger that does not belong to the conventional Ork, Tyranid, or heretical categories."
    },
    "xenos": {
      "label": "Other Xenos Presence",
      "color": 8976588,
      "css": "#88f0cc",
      "description": "A non-Imperial xenos world, border, or active presence not classified as Ork or Tyranid."
    },
    "unassigned": {
      "label": "Threat State Unassigned",
      "color": 10921638,
      "css": "#a6a6a6",
      "description": "The archive has not assigned a map threat state to this record."
    }
  },
  "records": [
    {
      "id": "celestial-c001",
      "referenceId": "C001",
      "name": "Presteria IV",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Repeatedly identified as a world/planet and Chancellor Ardenal's political base.",
      "relationships": [
        "None stated"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Chancellor Ardenal’s Conclave",
      "analystNotes": "Original setting; no parent system named.",
      "source": {
        "label": "Chancellor Ardenal’s Conclave",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1vfnma7/chancellor_ardenals_conclave/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1vfnma7/chancellor_ardenals_conclave/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "none stated",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-presteria"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-presteria"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c002",
      "referenceId": "C002",
      "name": "Velis Nox",
      "category": "unresolved",
      "objectType": "Unclassified celestial/site",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Unclassified celestial/site",
      "summary": "Named as a purgation site, but the prose excerpt does not establish whether it is a planet, moon, station, or installation.",
      "relationships": [
        "Purgation destination"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Review",
      "keyStory": "Chancellor Ardenal’s Conclave",
      "analystNotes": "Keep as a map candidate until object class is resolved.",
      "source": {
        "label": "Chancellor Ardenal’s Conclave",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1vfnma7/chancellor_ardenals_conclave/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1vfnma7/chancellor_ardenals_conclave/",
        "note": ""
      },
      "tags": [
        "unclassified celestial",
        "site",
        "other",
        "unclassified",
        "purgation destination",
        "review"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c003",
      "referenceId": "C003",
      "name": "Jhasyi’apan",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Explicitly described as a frontier planet/world.",
      "relationships": [
        "Frontier world"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Maximillion Dewinter",
      "analystNotes": "Distinctive apostrophe retained.",
      "source": {
        "label": "Maximillion Dewinter",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1msi8aa/maximillion_dewinter/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1msi8aa/maximillion_dewinter/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "frontier world",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-jhasyiapan"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-jhasyiapan"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Remote frontier world; no active conflict is recorded and modern survey detail is limited.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c004",
      "referenceId": "C004",
      "name": "Elbrin",
      "category": "unresolved",
      "objectType": "Unclassified location",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Unclassified location",
      "summary": "Named location associated with a secondary authentication stack; celestial status is not explicit.",
      "relationships": [
        "Secondary authentication stack location"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Review",
      "keyStory": "Project VIGILANT SHADE Part 4",
      "analystNotes": "May be a world, station, or installation.",
      "source": {
        "label": "Project VIGILANT SHADE Part 4",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ljgl26/project_vigilant_shade_part4/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ljgl26/project_vigilant_shade_part4/",
        "note": ""
      },
      "tags": [
        "unclassified location",
        "other",
        "unclassified",
        "secondary authentication stack location",
        "review"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c005",
      "referenceId": "C005",
      "name": "Kertora Semoises Prime",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Rocky world explicitly orbited by the fifth moon Kertora Semoises V.",
      "relationships": [
        "Primary body of Kertora Semoises V"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "By Ink and Mandate",
      "analystNotes": "Parent system remains unnamed.",
      "source": {
        "label": "By Ink and Mandate",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "primary body of kertora semoises v",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-kertora"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-kertora"
        ],
        "regionIds": []
      },
      "threat": "ork",
      "threatNote": "The system is under direct Ork and grot assault around Kertora Semoises V.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c006",
      "referenceId": "C006",
      "name": "Kertora Semoises V",
      "category": "moon",
      "objectType": "Moon",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Moon",
      "summary": "Explicit fifth moon; a promethium-rich ice ball defended by PDF forces.",
      "relationships": [
        "Fifth moon of Kertora Semoises Prime"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "By Ink and Mandate",
      "analystNotes": "Roman numeral is part of the moon's formal label.",
      "source": {
        "label": "By Ink and Mandate",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "note": ""
      },
      "tags": [
        "moon",
        "moons",
        "moon groups",
        "fifth moon of kertora semoises prime",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-kertora"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-kertora"
        ],
        "regionIds": []
      },
      "threat": "ork",
      "threatNote": "Active Ork and grot attack with Ork raiders engaged in orbit.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c007",
      "referenceId": "C007",
      "name": "Parban",
      "category": "world",
      "objectType": "Planet / agri-world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / agri-world",
      "summary": "Explicit dusty agri-world.",
      "relationships": [
        "None stated"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Project VIGILANT SHADE Part 3",
      "analystNotes": "Agricultural supply-world candidate.",
      "source": {
        "label": "Project VIGILANT SHADE Part 3",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lg965s/project_vigilant_shade_part3/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lg965s/project_vigilant_shade_part3/",
        "note": ""
      },
      "tags": [
        "planet",
        "agri-world",
        "world labels",
        "none stated",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-parban"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-parban"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Prior theatre of heretical warfare; current recovery status is undefined.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c008",
      "referenceId": "C008",
      "name": "Prescia",
      "category": "moon",
      "objectType": "Moon / agricultural moon",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Moon / agricultural moon",
      "summary": "Explicit agricultural moon and place of origin of Commissar Cressus.",
      "relationships": [
        "Orbits Gazeras Prime"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Project VIGILANT SHADE Part 1",
      "analystNotes": "Has additional unnamed agricultural satellites nearby.",
      "source": {
        "label": "Project VIGILANT SHADE Part 1",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "note": ""
      },
      "tags": [
        "moon",
        "agricultural moon",
        "moons",
        "moon groups",
        "orbits gazeras prime",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-gazeras"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-gazeras"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Agricultural moon with no active conflict recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c009",
      "referenceId": "C009",
      "name": "Gazeras Prime",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Explicit planet orbited by Prescia.",
      "relationships": [
        "Primary of Prescia"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Project VIGILANT SHADE Part 1",
      "analystNotes": "System name is not given.",
      "source": {
        "label": "Project VIGILANT SHADE Part 1",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "primary of prescia",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-gazeras"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-gazeras"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c010",
      "referenceId": "C010",
      "name": "Pilcher 7",
      "category": "world",
      "objectType": "Planet / world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / world",
      "summary": "Explicit world in the outer cluster of the CentEven sector.",
      "relationships": [
        "Outer cluster of the CentEven sector"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Flight of Pilcher 7",
      "analystNotes": "Number is written as Arabic 7 in the title and prose.",
      "source": {
        "label": "Flight of Pilcher 7",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1mo2ed1/flight_of_pilcher_7/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1mo2ed1/flight_of_pilcher_7/",
        "note": ""
      },
      "tags": [
        "planet",
        "world",
        "world labels",
        "outer cluster of the centeven sector",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-pilcher"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-pilcher"
        ],
        "regionIds": [
          "region-centeven"
        ]
      },
      "threat": "anomalous",
      "threatNote": "The Gray is consuming the world; this is an anomalous extradimensional crisis rather than a Tyranid or Genestealer event.",
      "mapRegionIds": [
        "region-centeven"
      ]
    },
    {
      "id": "celestial-c011",
      "referenceId": "C011",
      "name": "Panthes 7",
      "category": "world",
      "objectType": "Planet / contested world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / contested world",
      "summary": "Explicit contested world on the edge of T’au space.",
      "relationships": [
        "At the edge of T’au space"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Fealty’s Promise",
      "analystNotes": "Strategic border world.",
      "source": {
        "label": "Fealty’s Promise",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "note": ""
      },
      "tags": [
        "planet",
        "contested world",
        "world labels",
        "at the edge of t’au space",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-panthes"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-panthes"
        ],
        "regionIds": []
      },
      "threat": "xenos",
      "threatNote": "Contested border world at the edge of T’au space.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c012",
      "referenceId": "C012",
      "name": "Sullivan",
      "category": "world",
      "objectType": "Planet / war world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / war world",
      "summary": "Explicit war world and origin of Geravan Thane Tremelus.",
      "relationships": [
        "None stated"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Fealty’s Promise",
      "analystNotes": "Personnel origin, not a confirmed Guard-regiment origin.",
      "source": {
        "label": "Fealty’s Promise",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "note": ""
      },
      "tags": [
        "planet",
        "war world",
        "world labels",
        "none stated",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-sullivan"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-sullivan"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "A war-world culture is confirmed, but no current invasion or rebellion is recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c013",
      "referenceId": "C013",
      "name": "Effesatran",
      "category": "world",
      "objectType": "Planet / shrine world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / shrine world",
      "summary": "Explicitly described as an Eldar shrine world and place of origin.",
      "relationships": [
        "Aeldari/Exodite religious context"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "When the Stars Fell Silent",
      "analystNotes": "Non-Imperial world.",
      "source": {
        "label": "When the Stars Fell Silent",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1juz309/when_the_stars_fell_silent/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1juz309/when_the_stars_fell_silent/",
        "note": ""
      },
      "tags": [
        "planet",
        "shrine world",
        "world labels",
        "aeldari",
        "exodite religious context",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-effesatran"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-effesatran"
        ],
        "regionIds": []
      },
      "threat": "xenos",
      "threatNote": "Aeldari shrine world; no current battle is confirmed.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c014",
      "referenceId": "C014",
      "name": "ReaalSpekcs 7",
      "category": "world",
      "objectType": "Planet / punishment world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / punishment world",
      "summary": "Explicit planet and punishment world containing three dead hives.",
      "relationships": [
        "None stated"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "The Unmaking of Steven",
      "analystNotes": "Unusual capitalization retained from archive spelling.",
      "source": {
        "label": "The Unmaking of Steven",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kvo9dy/the_unmaking_of_steven/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kvo9dy/the_unmaking_of_steven/",
        "note": ""
      },
      "tags": [
        "planet",
        "punishment world",
        "world labels",
        "none stated",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-reaalspekcs"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-reaalspekcs"
        ],
        "regionIds": []
      },
      "threat": "dead",
      "threatNote": "Dead hives and a hostile environment make the world operationally hazardous.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c015",
      "referenceId": "C015",
      "name": "New Presidio",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Explicit planet; its Imperial capital is also called New Presidio.",
      "relationships": [
        "Capital city shares the planetary name"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Scion of the Warp-Born Blood",
      "analystNotes": "Disambiguate planet from same-named capital.",
      "source": {
        "label": "Scion of the Warp-Born Blood",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kyqzh1/scion_of_the_warpborn_blood/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kyqzh1/scion_of_the_warpborn_blood/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "capital city shares the planetary name",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-new-presidio"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-new-presidio"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c016",
      "referenceId": "C016",
      "name": "Valikor Secundus",
      "category": "world",
      "objectType": "Planet / forge world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / forge world",
      "summary": "Explicit forge world/planet under siege.",
      "relationships": [
        "Within/near the Krellan Chain"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "ZEDGE: THE GROT WHO LIVED",
      "analystNotes": "Strategic industrial world.",
      "source": {
        "label": "ZEDGE: THE GROT WHO LIVED",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "note": ""
      },
      "tags": [
        "planet",
        "forge world",
        "world labels",
        "within",
        "near the krellan chain",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-valikor"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-valikor"
        ],
        "regionIds": [
          "region-krellan",
          "region-tau9"
        ]
      },
      "threat": "ork",
      "threatNote": "Devastated by Orks with signs of continuing orcoid proliferation beneath the ruins.",
      "mapRegionIds": [
        "region-krellan",
        "region-tau9"
      ]
    },
    {
      "id": "celestial-c017",
      "referenceId": "C017",
      "name": "Iterum",
      "category": "moon",
      "objectType": "Moon",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Moon",
      "summary": "Explicit moon of Valikor Secundus; subsequently vaporized.",
      "relationships": [
        "Moon of Valikor Secundus"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "ZEDGE: THE GROT WHO LIVED",
      "analystNotes": "Mark destroyed in timeline layer.",
      "source": {
        "label": "ZEDGE: THE GROT WHO LIVED",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "note": ""
      },
      "tags": [
        "moon",
        "moons",
        "moon groups",
        "moon of valikor secundus",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-valikor"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-valikor"
        ],
        "regionIds": [
          "region-krellan",
          "region-tau9"
        ]
      },
      "threat": "dead",
      "threatNote": "The moon was vaporized.",
      "mapRegionIds": [
        "region-krellan",
        "region-tau9"
      ]
    },
    {
      "id": "celestial-c018",
      "referenceId": "C018",
      "name": "Pelzane",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Explicit planet beneath/orbited by Tenelja Station.",
      "relationships": [
        "Orbited by Tenelja Station"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Of Blood and Wires – The Litanies of Tenelja Station",
      "analystNotes": "System name not given.",
      "source": {
        "label": "Of Blood and Wires – The Litanies of Tenelja Station",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kvp2hx/of_blood_and_wires_the_litanies_of_tenelja/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kvp2hx/of_blood_and_wires_the_litanies_of_tenelja/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "orbited by tenelja station",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-pelzane"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-pelzane"
        ],
        "regionIds": []
      },
      "threat": "dead",
      "threatNote": "Terminal planetary decline is the primary recorded danger.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c020",
      "referenceId": "C020",
      "name": "Galladin system",
      "category": "system",
      "objectType": "Star system",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Star system",
      "summary": "The Galladin system is named directly.",
      "relationships": [
        "Contains Galladin Prime / Galladin’s Throne"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "A Harbormaster’s Hope",
      "analystNotes": "Core system for multiple linked stories.",
      "source": {
        "label": "A Harbormaster’s Hope",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "note": ""
      },
      "tags": [
        "star system",
        "systems",
        "contains galladin prime",
        "galladin’s throne",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Galladin’s Throne is facing heretical and civil conflict.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c021",
      "referenceId": "C021",
      "name": "Galladin Prime",
      "category": "world",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet",
      "summary": "Explicit planet in the Galladin system.",
      "relationships": [
        "In the Galladin system"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "A Harbormaster’s Hope",
      "analystNotes": "Likely the same body later called Galladin’s Throne.",
      "source": {
        "label": "A Harbormaster’s Hope",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "note": ""
      },
      "tags": [
        "planet",
        "world labels",
        "in the galladin system",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "The world is facing heretical and civil conflict.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c022",
      "referenceId": "C022",
      "name": "Galladin’s Throne",
      "category": "world",
      "objectType": "Planet / alias",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Map-ready with alias",
      "classification": "Planet / alias",
      "summary": "Later stories use Galladin’s Throne as the entire planet, while an earlier story treats it as a city on Galladin Prime.",
      "relationships": [
        "Likely alias or later name for Galladin Prime"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready with alias",
      "keyStory": "Galladin’s Throne",
      "analystNotes": "Do not plot as a second planet unless future canon explicitly separates them.",
      "source": {
        "label": "Galladin’s Throne",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/",
        "note": ""
      },
      "tags": [
        "planet",
        "alias",
        "world labels",
        "likely alias or later name for galladin prime",
        "map-ready with alias"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "The world is facing heretical and civil conflict.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c023",
      "referenceId": "C023",
      "name": "Segrea",
      "category": "world",
      "objectType": "Planet / medieval world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / medieval world",
      "summary": "Explicit medieval world; wording links it to 'Outer Galladin’s Throne.'",
      "relationships": [
        "Possibly outer Galladin region/system"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Fealty’s Promise",
      "analystNotes": "Parent relationship is suggestive, not fully resolved.",
      "source": {
        "label": "Fealty’s Promise",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "note": ""
      },
      "tags": [
        "planet",
        "medieval world",
        "world labels",
        "possibly outer galladin region",
        "system",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-segrea"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-segrea"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c024",
      "referenceId": "C024",
      "name": "Havenvard system",
      "category": "system",
      "objectType": "Star system",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Star system",
      "summary": "Explicitly named star system in voyage/navigation context.",
      "relationships": [
        "Contains/approaches Mandible Point"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "A Harbormaster’s Hope",
      "analystNotes": "May contain unnamed barren/abandoned bodies.",
      "source": {
        "label": "A Harbormaster’s Hope",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "note": ""
      },
      "tags": [
        "star system",
        "systems",
        "contains",
        "approaches mandible point",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-havenvard"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-havenvard"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "The system is named, but its member worlds and present condition remain incompletely indexed.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c026",
      "referenceId": "C026",
      "name": "Kerodan VII",
      "category": "world",
      "objectType": "Planet / battlefield world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / battlefield world",
      "summary": "Explicit world where a Cadian regiment was ambushed.",
      "relationships": [
        "None stated"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Galladin’s Throne Part 2",
      "analystNotes": "Battle-history location.",
      "source": {
        "label": "Galladin’s Throne Part 2",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fckak4/galladins_throne_part_2/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fckak4/galladins_throne_part_2/",
        "note": ""
      },
      "tags": [
        "planet",
        "battlefield world",
        "world labels",
        "none stated",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-kerodan"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-kerodan"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "A past ambush is recorded, but no present conflict state is established.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c027",
      "referenceId": "C027",
      "name": "Sygsnsei IX",
      "category": "world",
      "objectType": "Planet / schola world",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Map-ready",
      "classification": "Planet / schola world",
      "summary": "Characters explicitly refer to a schola on Sygsnsei IX.",
      "relationships": [
        "Hosts a Schola"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Troubled Dreams",
      "analystNotes": "Celestial class is strongly implied by Roman-numeral world naming.",
      "source": {
        "label": "Troubled Dreams",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lesgng/troubled_dreams/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lesgng/troubled_dreams/",
        "note": ""
      },
      "tags": [
        "planet",
        "schola world",
        "world labels",
        "hosts a schola",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-sygsnsei"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-sygsnsei"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c028",
      "referenceId": "C028",
      "name": "Cyprian IX",
      "category": "world",
      "objectType": "Planet / world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Planet / world",
      "summary": "Narration explicitly situates events 'on Cyprian IX.'",
      "relationships": [
        "Contains Imperial urban/spire sites"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Shadows of the Hive Part 2",
      "analystNotes": "Likely hive or spire world.",
      "source": {
        "label": "Shadows of the Hive Part 2",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18zv851/shadows_of_the_hive_part_2/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18zv851/shadows_of_the_hive_part_2/",
        "note": ""
      },
      "tags": [
        "planet",
        "world",
        "world labels",
        "contains imperial urban",
        "spire sites",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-cyprian"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-cyprian"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c029",
      "referenceId": "C029",
      "name": "Krexis Theta",
      "category": "unresolved",
      "objectType": "Unclassified world/location",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Review",
      "classification": "Unclassified world/location",
      "summary": "Environmental description strongly suggests a planet or moon, but the object class is not stated in the cited passage.",
      "relationships": [
        "Contains an abandoned hive network, magma tunnels, and wastelands"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Review",
      "keyStory": "The King’s Hidden Ball",
      "analystNotes": "Plot as provisional world marker.",
      "source": {
        "label": "The King’s Hidden Ball",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1e0hxm3/the_kings_hidden_ball/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1e0hxm3/the_kings_hidden_ball/",
        "note": ""
      },
      "tags": [
        "unclassified world",
        "location",
        "other",
        "unclassified",
        "contains an abandoned hive network",
        "magma tunnels",
        "and wastelands",
        "review"
      ],
      "mapNodeIds": [
        "node-krexis"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-krexis"
        ],
        "regionIds": [
          "region-tau9"
        ]
      },
      "threat": "unsurveyed",
      "threatNote": "Object class remains unresolved; the site contains an abandoned hive network and extreme terrain.",
      "mapRegionIds": [
        "region-tau9"
      ]
    },
    {
      "id": "celestial-c030",
      "referenceId": "C030",
      "name": "Prescia’s agricultural satellites",
      "category": "moon",
      "objectType": "Moon group",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Moon group",
      "summary": "Additional agricultural satellites are explicitly mentioned but remain unnamed.",
      "relationships": [
        "Other satellites of Gazeras Prime near Prescia"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "Project VIGILANT SHADE Part 1",
      "analystNotes": "Represent as unnamed moon cluster rather than invented individual names.",
      "source": {
        "label": "Project VIGILANT SHADE Part 1",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "note": ""
      },
      "tags": [
        "moon group",
        "moons",
        "other satellites of gazeras prime near prescia",
        "supporting"
      ],
      "mapNodeIds": [
        "node-gazeras"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-gazeras"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Unnamed agricultural satellites with no active conflict recorded.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c033",
      "referenceId": "C033",
      "name": "Caldan",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "The Caldan regiment comes from an agri-world; the formal planet name is inferred from the regiment prefix.",
      "relationships": [
        "Origin of Caldan 34th Armored"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Use 'Caldan homeworld' until formal naming is confirmed.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of caldan 34th armored",
        "review"
      ],
      "mapNodeIds": [
        "node-caldan-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-caldan-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Inferred agri-world origin of the Caldan 34th Armored; formal planetary name unresolved",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c034",
      "referenceId": "C034",
      "name": "Tanvar",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "The Tanvar regiment comes from a frozen world; formal name inferred from regiment prefix.",
      "relationships": [
        "Origin of Tanvar 89th Fusiliers"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Use 'Tanvar homeworld' as provisional label.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of tanvar 89th fusiliers",
        "review"
      ],
      "mapNodeIds": [
        "node-tanvar-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-tanvar-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Inferred frozen-world origin of the Tanvar 89th Fusiliers; formal planetary name unresolved",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c035",
      "referenceId": "C035",
      "name": "Halcyon",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "The Halcyon regiment comes from a forest world; formal name inferred from unit prefix.",
      "relationships": [
        "Origin of Halcyon 51st Light Infantry"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "May conflict with other 40K uses of Halcyon; retain archive context.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of halcyon 51st light infantry",
        "review"
      ],
      "mapNodeIds": [
        "node-halcyon-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-halcyon-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Inferred forest-world origin of the Halcyon 51st Light Infantry; formal planetary name unresolved",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c036",
      "referenceId": "C036",
      "name": "Ersak",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "Origin is implied by the regiment's place-derived naming, but no environmental homeworld description is supplied.",
      "relationships": [
        "Origin of Ersak 17th Drop Troopers"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Lowest-detail member of the composite regiment.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of ersak 17th drop troopers",
        "review"
      ],
      "mapNodeIds": [
        "node-ersak-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-ersak-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Place-derived origin of the Ersak 17th Drop Troopers; homeworld environment remains unrecorded",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c037",
      "referenceId": "C037",
      "name": "Mirradon",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "The Mirradon regiment is tied to a smog- and ash-choked urban world; formal name inferred from unit prefix.",
      "relationships": [
        "Origin of Mirradon 103rd Mechanized"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Industrial/hive-world candidate.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of mirradon 103rd mechanized",
        "review"
      ],
      "mapNodeIds": [
        "node-mirradon-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-mirradon-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Inferred smog- and ash-choked urban origin of the Mirradon 103rd Mechanized",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c038",
      "referenceId": "C038",
      "name": "Brannis",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "The Brannis regiment is tied to a world of discipline and order; formal name inferred from unit prefix.",
      "relationships": [
        "Origin of Brannis 12th Line Infantry"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Government/culture detail, not object classification.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of brannis 12th line infantry",
        "review"
      ],
      "mapNodeIds": [
        "node-brannis-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-brannis-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Inferred disciplined and ordered homeworld of the Brannis 12th Line Infantry",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c039",
      "referenceId": "C039",
      "name": "Draven",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "Origin is implied by the unit name; later desert action is a deployment, not proven homeworld evidence.",
      "relationships": [
        "Origin of Draven 62nd Siege Regiment"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Do not equate the unnamed desert world with Draven.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of draven 62nd siege regiment",
        "review"
      ],
      "mapNodeIds": [
        "node-draven-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-draven-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Place-derived origin of the Draven 62nd Siege Regiment; the desert deployment is not treated as homeworld evidence",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c040",
      "referenceId": "C040",
      "name": "Vandrell",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "Place of origin inferred from the regiment prefix only.",
      "relationships": [
        "Origin of Vandrell 45th Recon"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "No environment supplied.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of vandrell 45th recon",
        "review"
      ],
      "mapNodeIds": [
        "node-vandrell-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-vandrell-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Place-derived origin of the Vandrell 45th Recon; environment remains unrecorded",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c041",
      "referenceId": "C041",
      "name": "Karron",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "Place of origin inferred from the regiment prefix only.",
      "relationships": [
        "Origin of Karron 19th Field Artillery"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "No environment supplied.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of karron 19th field artillery",
        "review"
      ],
      "mapNodeIds": [
        "node-karron-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-karron-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Place-derived origin of the Karron 19th Field Artillery; environment remains unrecorded",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c042",
      "referenceId": "C042",
      "name": "Vektran",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "Place of origin inferred from the regiment prefix only.",
      "relationships": [
        "Origin of Vektran 88th Penal Legion"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Could be penal-world or recruitment jurisdiction; not stated.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of vektran 88th penal legion",
        "review"
      ],
      "mapNodeIds": [
        "node-vektran-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-vektran-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Place-derived origin of the Vektran 88th Penal Legion; may be a penal world or administrative jurisdiction",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c043",
      "referenceId": "C043",
      "name": "Vorlin",
      "category": "unresolved",
      "objectType": "Probable place / composite-regiment label",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Probable place / composite-regiment label",
      "summary": "The Vorlin 22nd is assembled from multiple shattered regiments; Vorlin may be an administrative designation rather than a shared homeworld.",
      "relationships": [
        "Vorlin 22nd composite regiment"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Do not treat as a confirmed homeworld.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "probable place",
        "composite-regiment label",
        "other",
        "unclassified",
        "vorlin 22nd composite regiment",
        "review"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c044",
      "referenceId": "C044",
      "name": "Caraphus",
      "category": "world",
      "objectType": "Probable planet / Guard origin",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Review",
      "classification": "Probable planet / Guard origin",
      "summary": "Place of origin is implied by the detachment name.",
      "relationships": [
        "Origin of the Caraphus Detachment"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Road to Death",
      "analystNotes": "Formal celestial class is not stated.",
      "source": {
        "label": "The Road to Death",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "note": ""
      },
      "tags": [
        "probable planet",
        "guard origin",
        "planet",
        "world labels",
        "origin of the caraphus detachment",
        "review"
      ],
      "mapNodeIds": [
        "node-caraphus"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-caraphus"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Place-derived detachment name suggests an origin, but celestial class remains unconfirmed",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c045",
      "referenceId": "C045",
      "name": "Calvarint",
      "category": "unresolved",
      "objectType": "Probable place / military origin",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Probable place / military origin",
      "summary": "Name appears in a military-origin construction; object class and exact organizational meaning are uncertain.",
      "relationships": [
        "Associated with the 7th Imperial Legion"
      ],
      "originCanonStatus": "Archive-original + unit-derived",
      "mapStatus": "Review",
      "keyStory": "The Veiled Conflict",
      "analystNotes": "May not be an Astra Militarum regiment.",
      "source": {
        "label": "The Veiled Conflict",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18lj5do/the_veiled_conflict/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18lj5do/the_veiled_conflict/",
        "note": ""
      },
      "tags": [
        "probable place",
        "military origin",
        "other",
        "unclassified",
        "associated with the 7th imperial legion",
        "review"
      ],
      "mapNodeIds": [
        "node-calvarint"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-calvarint"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Military-origin name with unresolved celestial class and organizational meaning",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c050",
      "referenceId": "C050",
      "name": "Prasidium",
      "category": "unresolved",
      "objectType": "Unclassified contextual place",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Unclassified contextual place",
      "summary": "Named historical-event location without object classification.",
      "relationships": [
        "Associated with the Betrayal of Prasidium"
      ],
      "originCanonStatus": "Possibly archive-original or obscure canonical",
      "mapStatus": "Review",
      "keyStory": "ZEDGE: THE GROT WHO LIVED",
      "analystNotes": "Needs lore-validation pass.",
      "source": {
        "label": "ZEDGE: THE GROT WHO LIVED",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "note": ""
      },
      "tags": [
        "unclassified contextual place",
        "other",
        "unclassified",
        "associated with the betrayal of prasidium",
        "review"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c051",
      "referenceId": "C051",
      "name": "Scallux",
      "category": "unresolved",
      "objectType": "Unclassified contextual place",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Unclassified contextual place",
      "summary": "Named purge/forge location without object classification.",
      "relationships": [
        "Associated with the Scallux Forge Purge"
      ],
      "originCanonStatus": "Possibly archive-original or obscure canonical",
      "mapStatus": "Review",
      "keyStory": "ZEDGE: THE GROT WHO LIVED",
      "analystNotes": "Could be forge world, installation, or region.",
      "source": {
        "label": "ZEDGE: THE GROT WHO LIVED",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "note": ""
      },
      "tags": [
        "unclassified contextual place",
        "other",
        "unclassified",
        "associated with the scallux forge purge",
        "review"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c052",
      "referenceId": "C052",
      "name": "Prathus",
      "category": "system",
      "objectType": "Probable system/region",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Probable system/region",
      "summary": "The Battlefleet title implies a patrol region, sector, or system named Prathus.",
      "relationships": [
        "Names Battlefleet Prathus"
      ],
      "originCanonStatus": "Archive-original + fleet-derived",
      "mapStatus": "Review",
      "keyStory": "The Road to Death",
      "analystNotes": "Do not assign object class until confirmed.",
      "source": {
        "label": "The Road to Death",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "note": ""
      },
      "tags": [
        "probable system",
        "region",
        "systems",
        "names battlefleet prathus",
        "review"
      ],
      "mapNodeIds": [
        "node-prathus"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-prathus"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Battlefleet title implies a patrol region, sector, or system, but object class remains unresolved",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c053",
      "referenceId": "C053",
      "name": "High Presidio",
      "category": "unresolved",
      "objectType": "Unclassified destination",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Review",
      "classification": "Unclassified destination",
      "summary": "Named as a destination and Schola site, but celestial class is not explicit.",
      "relationships": [
        "Destination/new Schola"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Review",
      "keyStory": "Troubled Dreams",
      "analystNotes": "Could be a world, city, station, or institution.",
      "source": {
        "label": "Troubled Dreams",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lesgng/troubled_dreams/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lesgng/troubled_dreams/",
        "note": ""
      },
      "tags": [
        "unclassified destination",
        "other",
        "unclassified",
        "destination",
        "new schola",
        "review"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c054",
      "referenceId": "C054",
      "name": "A’reef",
      "category": "station",
      "objectType": "Orbital station",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Orbital station",
      "summary": "Explicit high orbital station.",
      "relationships": [
        "High orbital station"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "Scion of the Warp-Born Blood",
      "analystNotes": "Supporting infrastructure, not celestial body.",
      "source": {
        "label": "Scion of the Warp-Born Blood",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kyqzh1/scion_of_the_warpborn_blood/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kyqzh1/scion_of_the_warpborn_blood/",
        "note": ""
      },
      "tags": [
        "orbital station",
        "stations",
        "high orbital station",
        "supporting"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c055",
      "referenceId": "C055",
      "name": "Antegra Station",
      "category": "station",
      "objectType": "Station / outpost",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Station / outpost",
      "summary": "Explicit named station in polar terrain.",
      "relationships": [
        "Located in polar wastes"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "Antegra Station",
      "analystNotes": "Parent world is not named.",
      "source": {
        "label": "Antegra Station",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lr8fmy/antegra_station/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lr8fmy/antegra_station/",
        "note": ""
      },
      "tags": [
        "station",
        "outpost",
        "stations",
        "located in polar wastes",
        "supporting"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c056",
      "referenceId": "C056",
      "name": "Tenelja Station",
      "category": "station",
      "objectType": "Orbital station",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Orbital station",
      "summary": "Explicit station orbiting Pelzane.",
      "relationships": [
        "Orbits Pelzane"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "Of Blood and Wires – The Litanies of Tenelja Station",
      "analystNotes": "Useful orbital map marker.",
      "source": {
        "label": "Of Blood and Wires – The Litanies of Tenelja Station",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kvp2hx/of_blood_and_wires_the_litanies_of_tenelja/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kvp2hx/of_blood_and_wires_the_litanies_of_tenelja/",
        "note": ""
      },
      "tags": [
        "orbital station",
        "stations",
        "orbits pelzane",
        "supporting"
      ],
      "mapNodeIds": [
        "node-pelzane"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-pelzane"
        ],
        "regionIds": []
      },
      "threat": "dead",
      "threatNote": "Station orbits a terminally declining world.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c057",
      "referenceId": "C057",
      "name": "Mandible Point",
      "category": "unresolved",
      "objectType": "Navigation point",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Navigation point",
      "summary": "Explicit named navigation point.",
      "relationships": [
        "Navigation feature associated with Havenvard voyage"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "A Harbormaster’s Hope",
      "analystNotes": "Not necessarily a celestial body.",
      "source": {
        "label": "A Harbormaster’s Hope",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "note": ""
      },
      "tags": [
        "navigation point",
        "other",
        "unclassified",
        "navigation feature associated with havenvard voyage",
        "supporting"
      ],
      "mapNodeIds": [
        "node-mandible"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-mandible"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Named navigation point; object class and habitation status are not established.",
      "mapRegionIds": []
    },
    {
      "id": "celestial-c058",
      "referenceId": "C058",
      "name": "Krellan Chain",
      "category": "region",
      "objectType": "Region / chain",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Region / chain",
      "summary": "Named regional feature scanned near the forge world.",
      "relationships": [
        "Region near Valikor Secundus"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "ZEDGE: THE GROT WHO LIVED",
      "analystNotes": "Map as a regional label.",
      "source": {
        "label": "ZEDGE: THE GROT WHO LIVED",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "note": ""
      },
      "tags": [
        "region",
        "chain",
        "regions",
        "sectors",
        "region near valikor secundus",
        "supporting"
      ],
      "mapNodeIds": [
        "node-valikor"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-valikor"
        ],
        "regionIds": [
          "region-krellan"
        ]
      },
      "threat": "ork",
      "threatNote": "Regional feature associated with the Ork-devastated Valikor theatre.",
      "mapRegionIds": [
        "region-krellan"
      ]
    },
    {
      "id": "celestial-c059",
      "referenceId": "C059",
      "name": "CentEven sector",
      "category": "region",
      "objectType": "Sector",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Sector",
      "summary": "Explicit sector containing Pilcher 7's outer cluster.",
      "relationships": [
        "Contains Pilcher 7 outer cluster"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "Flight of Pilcher 7",
      "analystNotes": "Capitalization retained.",
      "source": {
        "label": "Flight of Pilcher 7",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1mo2ed1/flight_of_pilcher_7/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1mo2ed1/flight_of_pilcher_7/",
        "note": ""
      },
      "tags": [
        "sector",
        "regions",
        "sectors",
        "contains pilcher 7 outer cluster",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-pilcher"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-pilcher"
        ],
        "regionIds": [
          "region-centeven"
        ]
      },
      "threat": "anomalous",
      "threatNote": "Contains the Pilcher 7 outer-cluster Gray crisis.",
      "mapRegionIds": [
        "region-centeven"
      ]
    },
    {
      "id": "celestial-c060",
      "referenceId": "C060",
      "name": "Syndrione Front",
      "category": "region",
      "objectType": "Campaign front / region",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Supporting",
      "classification": "Campaign front / region",
      "summary": "Named front in Guard/military context.",
      "relationships": [
        "Military operational region"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Supporting",
      "keyStory": "The Road to Death",
      "analystNotes": "Map as campaign layer, not fixed celestial object.",
      "source": {
        "label": "The Road to Death",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "note": ""
      },
      "tags": [
        "campaign front",
        "region",
        "regions",
        "sectors",
        "military operational region",
        "supporting"
      ],
      "mapNodeIds": [
        "node-kertora",
        "node-parban"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-kertora",
          "node-parban"
        ],
        "regionIds": [
          "region-syndrione"
        ]
      },
      "threat": "heretical",
      "threatNote": "Military operational region containing heretical-war and Ork-conflict associations.",
      "mapRegionIds": [
        "region-syndrione"
      ]
    },
    {
      "id": "celestial-c061",
      "referenceId": "C061",
      "name": "Subsector Tau-9",
      "category": "region",
      "objectType": "Subsector",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Map-ready",
      "classification": "Subsector",
      "summary": "Explicit named subsector.",
      "relationships": [
        "Contains or contextualizes Krexis Theta operations"
      ],
      "originCanonStatus": "Archive-original",
      "mapStatus": "Map-ready",
      "keyStory": "The King’s Hidden Ball",
      "analystNotes": "Administrative/strategic map layer.",
      "source": {
        "label": "The King’s Hidden Ball",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1e0hxm3/the_kings_hidden_ball/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1e0hxm3/the_kings_hidden_ball/",
        "note": ""
      },
      "tags": [
        "subsector",
        "regions",
        "sectors",
        "contains or contextualizes krexis theta operations",
        "map-ready"
      ],
      "mapNodeIds": [
        "node-valikor",
        "node-krexis"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-valikor",
          "node-krexis"
        ],
        "regionIds": [
          "region-tau9"
        ]
      },
      "threat": "unsurveyed",
      "threatNote": "Administrative region containing incompletely classified operations.",
      "mapRegionIds": [
        "region-tau9"
      ]
    },
    {
      "id": "guard-g003",
      "referenceId": "G003",
      "name": "Kertora Semoises V PDF",
      "category": "imperial-force",
      "objectType": "Planetary Defence Force",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Origin / local defence",
      "classification": "Planetary Defence Force",
      "summary": "The unit is explicitly local PDF defending the moon.",
      "relationships": [
        "Origin candidate: Kertora Semoises V"
      ],
      "originCandidate": "Kertora Semoises V",
      "environment": "Promethium-rich ice moon.",
      "deploymentVsOrigin": "Origin / local defence",
      "keyStory": "By Ink and Mandate",
      "analystNotes": "PDF origin is local by definition in story context.",
      "source": {
        "label": "By Ink and Mandate",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "planetary defence force",
        "kertora semoises v",
        "confirmed"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g004",
      "referenceId": "G004",
      "name": "Caraphus Detachment",
      "category": "imperial-force",
      "objectType": "Imperial military detachment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin implied",
      "classification": "Imperial military detachment",
      "summary": "Origin implied by place-derived detachment name.",
      "relationships": [
        "Origin candidate: Caraphus"
      ],
      "originCandidate": "Caraphus",
      "environment": "No homeworld environment supplied.",
      "deploymentVsOrigin": "Origin implied",
      "keyStory": "The Road to Death",
      "analystNotes": "Celestial class not stated.",
      "source": {
        "label": "The Road to Death",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "imperial military detachment",
        "caraphus",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g005",
      "referenceId": "G005",
      "name": "Calvarint, 7th Imperial Legion",
      "category": "imperial-force",
      "objectType": "Imperial formation; exact branch uncertain",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Origin uncertain",
      "classification": "Imperial formation; exact branch uncertain",
      "summary": "Military-origin construction implies Calvarint is a place or jurisdiction.",
      "relationships": [
        "Origin candidate: Calvarint"
      ],
      "originCandidate": "Calvarint",
      "environment": "No homeworld environment supplied.",
      "deploymentVsOrigin": "Origin uncertain",
      "keyStory": "The Veiled Conflict",
      "analystNotes": "May not be Astra Militarum; preserve uncertainty.",
      "source": {
        "label": "The Veiled Conflict",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18lj5do/the_veiled_conflict/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18lj5do/the_veiled_conflict/",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "imperial formation",
        "exact branch uncertain",
        "calvarint",
        "candidate"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g006",
      "referenceId": "G006",
      "name": "Forty-Third Line",
      "category": "imperial-force",
      "objectType": "Line regiment",
      "provenance": "unresolved",
      "confidence": "Unresolved",
      "status": "Unknown",
      "classification": "Line regiment",
      "summary": "Unit is named, but no origin world is recoverable from the designation.",
      "relationships": [
        "Origin candidate: Unknown"
      ],
      "originCandidate": "Unknown",
      "environment": "None.",
      "deploymentVsOrigin": "Unknown",
      "keyStory": "Galladin’s Throne Part 2",
      "analystNotes": "Retain as unresolved Guard-origin record.",
      "source": {
        "label": "Galladin’s Throne Part 2",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fckak4/galladins_throne_part_2/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fckak4/galladins_throne_part_2/",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "line regiment",
        "unknown",
        "unresolved"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g009",
      "referenceId": "G009",
      "name": "Vorlin 22nd",
      "category": "imperial-force",
      "objectType": "Composite regiment",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Composite; origin ambiguous",
      "classification": "Composite regiment",
      "summary": "Name suggests an origin, but the regiment is explicitly assembled from many destroyed formations.",
      "relationships": [
        "Origin candidate: Vorlin (administrative label?)"
      ],
      "originCandidate": "Vorlin (administrative label?)",
      "environment": "No single shared homeworld can be assumed.",
      "deploymentVsOrigin": "Composite; origin ambiguous",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Do not assign all component troops to Vorlin.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "composite regiment",
        "vorlin (administrative label?)",
        "candidate"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g010",
      "referenceId": "G010",
      "name": "Caldan 34th Armored",
      "category": "imperial-force",
      "objectType": "Armored regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin",
      "classification": "Armored regiment",
      "summary": "Place-derived unit prefix plus explicit agri-world origin.",
      "relationships": [
        "Origin candidate: Caldan homeworld"
      ],
      "originCandidate": "Caldan homeworld",
      "environment": "Agri-world.",
      "deploymentVsOrigin": "Origin",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Formal planet name may differ from demonym/prefix.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "armored regiment",
        "caldan homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g011",
      "referenceId": "G011",
      "name": "Tanvar 89th Fusiliers",
      "category": "imperial-force",
      "objectType": "Fusilier regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin",
      "classification": "Fusilier regiment",
      "summary": "Place-derived unit prefix plus explicit frozen-world origin.",
      "relationships": [
        "Origin candidate: Tanvar homeworld"
      ],
      "originCandidate": "Tanvar homeworld",
      "environment": "Frozen world.",
      "deploymentVsOrigin": "Origin",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Formal planet name may differ from demonym/prefix.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "fusilier regiment",
        "tanvar homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g012",
      "referenceId": "G012",
      "name": "Halcyon 51st Light Infantry",
      "category": "imperial-force",
      "objectType": "Light infantry regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin",
      "classification": "Light infantry regiment",
      "summary": "Place-derived unit prefix plus explicit forest-world origin.",
      "relationships": [
        "Origin candidate: Halcyon homeworld"
      ],
      "originCandidate": "Halcyon homeworld",
      "environment": "Forest world.",
      "deploymentVsOrigin": "Origin",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Formal planet name may differ from unit prefix.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "light infantry regiment",
        "halcyon homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g013",
      "referenceId": "G013",
      "name": "Ersak 17th Drop Troopers",
      "category": "imperial-force",
      "objectType": "Drop-trooper regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin implied",
      "classification": "Drop-trooper regiment",
      "summary": "Place-derived unit prefix only.",
      "relationships": [
        "Origin candidate: Ersak homeworld"
      ],
      "originCandidate": "Ersak homeworld",
      "environment": "No environment supplied.",
      "deploymentVsOrigin": "Origin implied",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Lower-confidence than component regiments with homeworld descriptions.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "drop-trooper regiment",
        "ersak homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g014",
      "referenceId": "G014",
      "name": "Mirradon 103rd Mechanized",
      "category": "imperial-force",
      "objectType": "Mechanized regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin",
      "classification": "Mechanized regiment",
      "summary": "Place-derived unit prefix plus explicit environmental origin.",
      "relationships": [
        "Origin candidate: Mirradon homeworld"
      ],
      "originCandidate": "Mirradon homeworld",
      "environment": "Smog- and ash-choked urban/industrial world.",
      "deploymentVsOrigin": "Origin",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Probable industrial or hive world.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "mechanized regiment",
        "mirradon homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g015",
      "referenceId": "G015",
      "name": "Brannis 12th Line Infantry",
      "category": "imperial-force",
      "objectType": "Line infantry regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin",
      "classification": "Line infantry regiment",
      "summary": "Place-derived unit prefix plus explicit cultural origin.",
      "relationships": [
        "Origin candidate: Brannis homeworld"
      ],
      "originCandidate": "Brannis homeworld",
      "environment": "World characterized by discipline and order.",
      "deploymentVsOrigin": "Origin",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Culture is explicit; celestial class/name remains inferred.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "line infantry regiment",
        "brannis homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g016",
      "referenceId": "G016",
      "name": "Draven 62nd Siege Regiment",
      "category": "imperial-force",
      "objectType": "Siege regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin implied; desert is deployment",
      "classification": "Siege regiment",
      "summary": "Place-derived unit prefix only.",
      "relationships": [
        "Origin candidate: Draven homeworld"
      ],
      "originCandidate": "Draven homeworld",
      "environment": "Later fights on an unnamed desert world, but that is not proven to be its origin.",
      "deploymentVsOrigin": "Origin implied; desert is deployment",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Separate origin from deployment.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "siege regiment",
        "draven homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g017",
      "referenceId": "G017",
      "name": "Vandrell 45th Recon",
      "category": "imperial-force",
      "objectType": "Reconnaissance regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin implied",
      "classification": "Reconnaissance regiment",
      "summary": "Place-derived unit prefix only.",
      "relationships": [
        "Origin candidate: Vandrell homeworld"
      ],
      "originCandidate": "Vandrell homeworld",
      "environment": "No environment supplied.",
      "deploymentVsOrigin": "Origin implied",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Provisional map candidate.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "reconnaissance regiment",
        "vandrell homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g018",
      "referenceId": "G018",
      "name": "Karron 19th Field Artillery",
      "category": "imperial-force",
      "objectType": "Field artillery regiment",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin implied",
      "classification": "Field artillery regiment",
      "summary": "Place-derived unit prefix only.",
      "relationships": [
        "Origin candidate: Karron homeworld"
      ],
      "originCandidate": "Karron homeworld",
      "environment": "No environment supplied.",
      "deploymentVsOrigin": "Origin implied",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Provisional map candidate.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "field artillery regiment",
        "karron homeworld",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g019",
      "referenceId": "G019",
      "name": "Vektran 88th Penal Legion",
      "category": "imperial-force",
      "objectType": "Penal legion",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Origin implied",
      "classification": "Penal legion",
      "summary": "Place-derived unit prefix only.",
      "relationships": [
        "Origin candidate: Vektran homeworld/jurisdiction"
      ],
      "originCandidate": "Vektran homeworld/jurisdiction",
      "environment": "No environment supplied.",
      "deploymentVsOrigin": "Origin implied",
      "keyStory": "The Desk of Despair",
      "analystNotes": "Could name a penal world, recruitment region, or administrative command.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "penal legion",
        "vektran homeworld",
        "jurisdiction",
        "inferred"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "guard-g020",
      "referenceId": "G020",
      "name": "Galladin’s Throne PDF",
      "category": "imperial-force",
      "objectType": "Planetary Defence Force",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Origin / local defence",
      "classification": "Planetary Defence Force",
      "summary": "The PDF is explicitly local to the world.",
      "relationships": [
        "Origin candidate: Galladin’s Throne / Galladin Prime"
      ],
      "originCandidate": "Galladin’s Throne / Galladin Prime",
      "environment": "World-scale defence formation.",
      "deploymentVsOrigin": "Origin / local defence",
      "keyStory": "Galladin’s Throne",
      "analystNotes": "Normalize planet to Galladin Prime / Galladin’s Throne alias record.",
      "source": {
        "label": "Galladin’s Throne",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/",
        "note": ""
      },
      "tags": [
        "imperial guard",
        "planetary defence force",
        "galladin’s throne",
        "galladin prime",
        "confirmed"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u001",
      "referenceId": "U001",
      "name": "Unnamed planet of Janest Von Sontag",
      "category": "unnamed",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Placeholder only",
      "classification": "Planet",
      "summary": "A planet is explicit; proper name absent.",
      "relationships": [
        "Origin of Janest Von Sontag"
      ],
      "environment": "Not supplied.",
      "story": "ZEDGE: THE GROT WHO LIVED",
      "placeholderRule": "Do not invent name",
      "analystNotes": "Person-of-origin record only.",
      "source": {
        "label": "ZEDGE: THE GROT WHO LIVED",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kwc5yb/zedge_the_grot_who_lived/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "origin of janest von sontag",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-unnamed-01"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-01"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Explicit planet with no proper name or recorded threat state",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u002",
      "referenceId": "U002",
      "name": "Unnamed Exodite shrine world",
      "category": "unnamed",
      "objectType": "Planet / shrine world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Placeholder only",
      "classification": "Planet / shrine world",
      "summary": "World is explicit but remains unnamed.",
      "relationships": [
        "Origin of Vassia; orbited by three unnamed moons"
      ],
      "environment": "Exodite shrine world; human-equivalent civilization level; sole natural well is sacred.",
      "story": "When the Stars Fell Silent",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Do not rename from an associated Aeldari figure without evidence.",
      "source": {
        "label": "When the Stars Fell Silent",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1juz309/when_the_stars_fell_silent/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1juz309/when_the_stars_fell_silent/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "shrine world",
        "origin of vassia",
        "orbited by three unnamed moons",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-unnamed-02"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-02"
        ],
        "regionIds": []
      },
      "threat": "xenos",
      "threatNote": "Unnamed Exodite shrine world; no current battle is assigned",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u003",
      "referenceId": "U003",
      "name": "Three unnamed moons of the Exodite shrine world",
      "category": "unnamed",
      "objectType": "Moon group",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Placeholder only",
      "classification": "Moon group",
      "summary": "Three moons are explicit; none are named.",
      "relationships": [
        "Orbit unnamed Exodite shrine world"
      ],
      "environment": "No individual moon details supplied.",
      "story": "When the Stars Fell Silent",
      "placeholderRule": "Group placeholder",
      "analystNotes": "Plot as one grouped satellite marker or three unnamed orbital markers.",
      "source": {
        "label": "When the Stars Fell Silent",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1juz309/when_the_stars_fell_silent/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1juz309/when_the_stars_fell_silent/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "moon group",
        "orbit unnamed exodite shrine world",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-unnamed-03"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-03"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Three unnamed moons with no individual threat classification",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u004",
      "referenceId": "U004",
      "name": "Unnamed crimson world",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Placeholder only",
      "classification": "Planet / world",
      "summary": "World is explicit; proper name absent.",
      "relationships": [
        "Surface observed from high orbit"
      ],
      "environment": "Crimson skies; continent-sized sentient mountain; bioluminescent forests.",
      "story": "The Dieterling Device",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Keep environmental descriptor separate from name.",
      "source": {
        "label": "The Dieterling Device",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1j1wup9/the_dieterling_device/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1j1wup9/the_dieterling_device/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "surface observed from high orbit",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-unnamed-04"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-04"
        ],
        "regionIds": []
      },
      "threat": "anomalous",
      "threatNote": "Sentient mountain and extreme biospheric anomalies",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u005",
      "referenceId": "U005",
      "name": "Unnamed agri-world of the Caldan 34th",
      "category": "unnamed",
      "objectType": "Planet / agri-world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Linked to provisional Caldan map label",
      "classification": "Planet / agri-world",
      "summary": "World type and regiment origin are explicit; formal name is not.",
      "relationships": [
        "Origin of Caldan 34th Armored"
      ],
      "environment": "Agri-world.",
      "story": "The Desk of Despair",
      "placeholderRule": "Link to inferred Caldan entry",
      "analystNotes": "Caldan may be demonym, planet, or recruitment jurisdiction.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "agri-world",
        "origin of caldan 34th armored",
        "strong"
      ],
      "mapNodeIds": [
        "node-caldan-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-caldan-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Explicit agri-world origin; no active conflict recorded",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u006",
      "referenceId": "U006",
      "name": "Unnamed frozen world of the Tanvar 89th",
      "category": "unnamed",
      "objectType": "Planet / frozen world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Linked to provisional Tanvar map label",
      "classification": "Planet / frozen world",
      "summary": "World type and regiment origin are explicit; formal name is not.",
      "relationships": [
        "Origin of Tanvar 89th Fusiliers"
      ],
      "environment": "Frozen world.",
      "story": "The Desk of Despair",
      "placeholderRule": "Link to inferred Tanvar entry",
      "analystNotes": "Tanvar may be demonym or formal world name.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "frozen world",
        "origin of tanvar 89th fusiliers",
        "strong"
      ],
      "mapNodeIds": [
        "node-tanvar-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-tanvar-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Explicit frozen-world origin; no active conflict recorded",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u007",
      "referenceId": "U007",
      "name": "Unnamed forest world of the Halcyon 51st",
      "category": "unnamed",
      "objectType": "Planet / forest world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Linked to provisional Halcyon map label",
      "classification": "Planet / forest world",
      "summary": "World type and regiment origin are explicit; formal name is not.",
      "relationships": [
        "Origin of Halcyon 51st Light Infantry"
      ],
      "environment": "Forest world.",
      "story": "The Desk of Despair",
      "placeholderRule": "Link to inferred Halcyon entry",
      "analystNotes": "Do not assume unrelated canonical Halcyon worlds are identical.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "forest world",
        "origin of halcyon 51st light infantry",
        "strong"
      ],
      "mapNodeIds": [
        "node-halcyon-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-halcyon-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Explicit forest-world origin; no active conflict recorded",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u008",
      "referenceId": "U008",
      "name": "Unnamed smog-and-ash urban world of the Mirradon 103rd",
      "category": "unnamed",
      "objectType": "Planet / urban-industrial world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Linked to provisional Mirradon map label",
      "classification": "Planet / urban-industrial world",
      "summary": "Environment and regiment origin are explicit; formal name is not.",
      "relationships": [
        "Origin of Mirradon 103rd Mechanized"
      ],
      "environment": "Smog- and ash-choked urban world.",
      "story": "The Desk of Despair",
      "placeholderRule": "Link to inferred Mirradon entry",
      "analystNotes": "Probable hive/industrial classification.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "urban-industrial world",
        "origin of mirradon 103rd mechanized",
        "strong"
      ],
      "mapNodeIds": [
        "node-mirradon-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-mirradon-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Explicit smog- and ash-choked origin; no active conflict recorded",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u009",
      "referenceId": "U009",
      "name": "Unnamed ordered world of the Brannis 12th",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Linked to provisional Brannis map label",
      "classification": "Planet / world",
      "summary": "Cultural world detail and regiment origin are explicit; formal name is not.",
      "relationships": [
        "Origin of Brannis 12th Line Infantry"
      ],
      "environment": "World of discipline and order.",
      "story": "The Desk of Despair",
      "placeholderRule": "Link to inferred Brannis entry",
      "analystNotes": "Culture does not establish planet class.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "origin of brannis 12th line infantry",
        "strong"
      ],
      "mapNodeIds": [
        "node-brannis-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-brannis-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Explicit culture of discipline and order; no active conflict recorded",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u010",
      "referenceId": "U010",
      "name": "Unnamed world of the Young One’s nursery",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet / world",
      "summary": "World-scale wilderness is explicit; proper name absent.",
      "relationships": [
        "Nursery world of the Young One"
      ],
      "environment": "Extreme mountain-forest wilderness; apex predator ecology.",
      "story": "The First Judgment",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Keep distinct from character names.",
      "source": {
        "label": "The First Judgment",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fd1m6m/the_first_judgment/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fd1m6m/the_first_judgment/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "nursery world of the young one",
        "strong"
      ],
      "mapNodeIds": [
        "node-unnamed-10"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-10"
        ],
        "regionIds": []
      },
      "threat": "anomalous",
      "threatNote": "Extreme apex-predator ecology and nursery-world conditions",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u011",
      "referenceId": "U011",
      "name": "Unnamed desert world of the Draven 62nd deployment",
      "category": "unnamed",
      "objectType": "Planet / desert world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Deployment world only",
      "classification": "Planet / desert world",
      "summary": "Deployment world is explicit; not proven to be Draven origin.",
      "relationships": [
        "Deployment of Draven 62nd Siege Regiment"
      ],
      "environment": "Desert world.",
      "story": "The Desk of Despair",
      "placeholderRule": "Do not merge with Draven",
      "analystNotes": "Explicit example of deployment/origin separation.",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "desert world",
        "deployment of draven 62nd siege regiment",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-unnamed-11"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-11"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Unnamed desert deployment world; no current conflict classification recovered",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u012",
      "referenceId": "U012",
      "name": "Unnamed world under predation by the Aspect of Death",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet / world",
      "summary": "World is explicit; proper name absent.",
      "relationships": [
        "Predation site"
      ],
      "environment": "Implied inhabited world; specific environment not supplied.",
      "story": "The Road to Death",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Threat context is stronger than celestial detail.",
      "source": {
        "label": "The Road to Death",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18ppm5l/the_road_to_death/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "predation site",
        "strong"
      ],
      "mapNodeIds": [
        "node-unnamed-12"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-12"
        ],
        "regionIds": []
      },
      "threat": "anomalous",
      "threatNote": "Predation by the Aspect of Death",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u013",
      "referenceId": "U013",
      "name": "Unnamed arid world of the Fire Angels chapter",
      "category": "unnamed",
      "objectType": "Planet / arid world",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet / arid world",
      "summary": "World is explicit; proper name absent.",
      "relationships": [
        "Homeworld of the Fire Angels chapter"
      ],
      "environment": "Arid, scarred, and habitable only through colossal terraforming machines.",
      "story": "Fire Angels",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Potential chapter-lore conflict; preserve archive statement only.",
      "source": {
        "label": "Fire Angels",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1k83wk2/fire_angels/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1k83wk2/fire_angels/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "arid world",
        "homeworld of the fire angels chapter",
        "strong"
      ],
      "mapNodeIds": [
        "node-unnamed-13"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-13"
        ],
        "regionIds": []
      },
      "threat": "dead",
      "threatNote": "Arid and scarred world dependent on colossal terraforming machines",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u014",
      "referenceId": "U014",
      "name": "Unnamed barren/abandoned world in or near Havenvard",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet / world",
      "summary": "A bleak abandoned surface is strongly implied; proper name absent.",
      "relationships": [
        "Havenvard voyage context"
      ],
      "environment": "Bleak, abandoned, grey surface; ruins implied.",
      "story": "A Harbormaster’s Hope",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Could be in Havenvard system or adjacent route.",
      "source": {
        "label": "A Harbormaster’s Hope",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "havenvard voyage context",
        "strong"
      ],
      "mapNodeIds": [
        "node-havenvard",
        "node-unnamed-14"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-havenvard",
          "node-unnamed-14"
        ],
        "regionIds": []
      },
      "threat": "dead",
      "threatNote": "Bleak abandoned surface with implied ruins",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u015",
      "referenceId": "U015",
      "name": "Additional unnamed agricultural satellites of Gazeras Prime",
      "category": "unnamed",
      "objectType": "Moon group",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Group placeholder",
      "classification": "Moon group",
      "summary": "Additional agricultural satellites are explicit and unnamed.",
      "relationships": [
        "Orbit Gazeras Prime near Prescia"
      ],
      "environment": "Agricultural satellites.",
      "story": "Project VIGILANT SHADE Part 1",
      "placeholderRule": "Group placeholder",
      "analystNotes": "Same evidence as Celestial Index moon-group record.",
      "source": {
        "label": "Project VIGILANT SHADE Part 1",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lcyc58/project_vigilant_shade_part1/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "moon group",
        "orbit gazeras prime near prescia",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-gazeras"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-gazeras"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Unnamed agricultural satellites; no active conflict recorded",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u016",
      "referenceId": "U016",
      "name": "Unnamed original world of the ship from Imperium’s Agony",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "inferred",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet / world",
      "summary": "Original planet is explicit; proper name absent.",
      "relationships": [
        "Planet from which the abandoned ship departed"
      ],
      "environment": "Not supplied.",
      "story": "Imperium’s Agony",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Distinct from the later evacuation world.",
      "source": {
        "label": "Imperium’s Agony",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18u8n0d/imperiums_agony/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18u8n0d/imperiums_agony/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "planet from which the abandoned ship departed",
        "strong"
      ],
      "mapNodeIds": [
        "node-unnamed-15"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-15"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Original planet is explicit, but condition and name remain unknown",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u017",
      "referenceId": "U017",
      "name": "Unnamed evacuation world from Imperium’s Agony",
      "category": "unnamed",
      "objectType": "Planet / world",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet / world",
      "summary": "Evacuation world is explicit; proper name absent.",
      "relationships": [
        "Destination/source world for the attempted evacuation"
      ],
      "environment": "Inhabited Imperial world under crisis.",
      "story": "Imperium’s Agony",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Do not merge with ship’s original planet.",
      "source": {
        "label": "Imperium’s Agony",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18u8n0d/imperiums_agony/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18u8n0d/imperiums_agony/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "world",
        "destination",
        "source world for the attempted evacuation",
        "strong"
      ],
      "mapNodeIds": [
        "node-unnamed-16"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-unnamed-16"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Inhabited Imperial world under evacuation crisis",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u018",
      "referenceId": "U018",
      "name": "Unnamed planet blasted to lifelessness by rogue psyker",
      "category": "unnamed",
      "objectType": "Planet",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Planet",
      "summary": "Planet and destruction event are explicit; proper name absent.",
      "relationships": [
        "Atrocity site"
      ],
      "environment": "Rendered lifeless.",
      "story": "The Mark of Chaos",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Mark destroyed/dead.",
      "source": {
        "label": "The Mark of Chaos",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18mqt5d/the_mark_of_chaos/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18mqt5d/the_mark_of_chaos/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "atrocity site",
        "strong"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u019",
      "referenceId": "U019",
      "name": "Unnamed Death World under militia duty",
      "category": "unnamed",
      "objectType": "Planet / Death World",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Placeholder only",
      "classification": "Planet / Death World",
      "summary": "Death World class is explicit; proper name absent.",
      "relationships": [
        "Militia duty station"
      ],
      "environment": "Death World; dangerous local wildlife.",
      "story": "The Ballad of Brentonn Marsh",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Duty station, not necessarily origin.",
      "source": {
        "label": "The Ballad of Brentonn Marsh",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18kh7y1/the_ballad_of_brentonn_marsh/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18kh7y1/the_ballad_of_brentonn_marsh/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "death world",
        "militia duty station",
        "confirmed"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u020",
      "referenceId": "U020",
      "name": "Unnamed asteroid-mine world",
      "category": "unnamed",
      "objectType": "Asteroid / planetoid / mine-world",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Placeholder only",
      "classification": "Asteroid / planetoid / mine-world",
      "summary": "Asteroid scale and mining identity are explicit; formal name absent.",
      "relationships": [
        "Setting of Blood in the Deep"
      ],
      "environment": "Massive asteroid honeycombed by mine shafts.",
      "story": "Blood in the Deep",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Could be a planetoid settlement rather than formal world.",
      "source": {
        "label": "Blood in the Deep",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18j3ma1/blood_in_the_deep/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18j3ma1/blood_in_the_deep/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "asteroid",
        "planetoid",
        "mine-world",
        "setting of blood in the deep",
        "strong"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "unnamed-u021",
      "referenceId": "U021",
      "name": "Unnamed green-skied feudal world",
      "category": "unnamed",
      "objectType": "Planet / feudal world",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Placeholder only",
      "classification": "Planet / feudal world",
      "summary": "World and feudal civilization are explicit; proper name absent.",
      "relationships": [
        "Setting of The Jester’s Ball"
      ],
      "environment": "Green skies; lush forests; castles; horse-level transport; no known gunpowder.",
      "story": "The Jester’s Ball",
      "placeholderRule": "Descriptive placeholder",
      "analystNotes": "Distinct from Segrea unless future text links them.",
      "source": {
        "label": "The Jester’s Ball",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/18isebu/the_jesters_ball/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/18isebu/the_jesters_ball/",
        "note": ""
      },
      "tags": [
        "unnamed celestial body",
        "planet",
        "feudal world",
        "setting of the jester’s ball",
        "confirmed"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "alias-001",
      "referenceId": "A001",
      "name": "Galladin Prime → Galladin Prime / Galladin’s Throne",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Primary formal label in early story.",
      "classification": "Galladin Prime / Galladin’s Throne",
      "summary": "Explicitly identified as a planet in the Galladin system.",
      "relationships": [
        "Normalized map object: Galladin Prime / Galladin’s Throne"
      ],
      "observedLabel": "Galladin Prime",
      "normalizedObject": "Galladin Prime / Galladin’s Throne",
      "resolution": "Primary formal label in early story.",
      "story": "A Harbormaster’s Hope",
      "source": {
        "label": "A Harbormaster’s Hope",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/",
        "note": ""
      },
      "tags": [
        "alias",
        "galladin prime",
        "galladin prime",
        "galladin’s throne",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Alias record shares the Galladin conflict state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-002",
      "referenceId": "A002",
      "name": "Galladin’s Throne → Galladin Prime / Galladin’s Throne",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Treat as later planetary name/alias, not a separate world.",
      "classification": "Galladin Prime / Galladin’s Throne",
      "summary": "Later series calls the whole planet Galladin’s Throne; earlier prose calls it a city on Galladin Prime.",
      "relationships": [
        "Normalized map object: Galladin Prime / Galladin’s Throne"
      ],
      "observedLabel": "Galladin’s Throne",
      "normalizedObject": "Galladin Prime / Galladin’s Throne",
      "resolution": "Treat as later planetary name/alias, not a separate world.",
      "story": "Galladin series",
      "source": {
        "label": "Galladin series",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/",
        "note": ""
      },
      "tags": [
        "alias",
        "galladin’s throne",
        "galladin prime",
        "galladin’s throne",
        "strong"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Alias record shares the Galladin conflict state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-003",
      "referenceId": "A003",
      "name": "Galladin → Galladin Prime / Galladin’s Throne, or its capital city",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Context-sensitive shorthand.",
      "classification": "Galladin Prime / Galladin’s Throne, or its capital city",
      "summary": "The name is used both as planetary shorthand and for a capital/locality.",
      "relationships": [
        "Normalized map object: Galladin Prime / Galladin’s Throne, or its capital city"
      ],
      "observedLabel": "Galladin",
      "normalizedObject": "Galladin Prime / Galladin’s Throne, or its capital city",
      "resolution": "Context-sensitive shorthand.",
      "story": "Multiple Galladin stories",
      "source": {
        "label": "Multiple Galladin stories",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fckak4/galladins_throne_part_2/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1fckak4/galladins_throne_part_2/",
        "note": ""
      },
      "tags": [
        "alias",
        "galladin",
        "galladin prime",
        "galladin’s throne",
        "or its capital city",
        "strong"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Alias record shares the Galladin conflict state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-004",
      "referenceId": "A004",
      "name": "Galedin’s Throne → Galladin’s Throne",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "story-grounded",
      "confidence": "Strong",
      "status": "Probable spelling variation/typo.",
      "classification": "Galladin’s Throne",
      "summary": "Near-identical spelling appears in related context; no independent object evidence.",
      "relationships": [
        "Normalized map object: Galladin’s Throne"
      ],
      "observedLabel": "Galedin’s Throne",
      "normalizedObject": "Galladin’s Throne",
      "resolution": "Probable spelling variation/typo.",
      "story": "Galladin-related story",
      "source": {
        "label": "Galladin-related story",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fh35g1/fealtys_promise/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": "Reference sheet URL was a pagination audit route; exact story permalink restored from the archive index."
      },
      "tags": [
        "alias",
        "galedin’s throne",
        "galladin’s throne",
        "strong"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Alias record shares the Galladin conflict state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-005",
      "referenceId": "A005",
      "name": "New Presidio → New Presidio (planet) / New Presidio (capital)",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Preserve two same-named geographic levels.",
      "classification": "New Presidio (planet) / New Presidio (capital)",
      "summary": "The planet and its Imperial capital share the same name.",
      "relationships": [
        "Normalized map object: New Presidio (planet) / New Presidio (capital)"
      ],
      "observedLabel": "New Presidio",
      "normalizedObject": "New Presidio (planet) / New Presidio (capital)",
      "resolution": "Preserve two same-named geographic levels.",
      "story": "Scion of the Warp-Born Blood",
      "source": {
        "label": "Scion of the Warp-Born Blood",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1kyqzh1/scion_of_the_warpborn_blood/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1kyqzh1/scion_of_the_warpborn_blood/",
        "note": ""
      },
      "tags": [
        "alias",
        "new presidio",
        "new presidio (planet)",
        "new presidio (capital)",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-new-presidio"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-new-presidio"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Alias record shares the New Presidio threat state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-006",
      "referenceId": "A006",
      "name": "Caldan → Caldan homeworld (formal name unresolved)",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Provisional demonym-derived map label.",
      "classification": "Caldan homeworld (formal name unresolved)",
      "summary": "The story gives a Caldan regiment and agri-world origin but does not prove the planet's formal name is Caldan.",
      "relationships": [
        "Normalized map object: Caldan homeworld (formal name unresolved)"
      ],
      "observedLabel": "Caldan",
      "normalizedObject": "Caldan homeworld (formal name unresolved)",
      "resolution": "Provisional demonym-derived map label.",
      "story": "The Desk of Despair",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": "Reference sheet URL was a pagination audit route; exact story permalink restored from the archive index."
      },
      "tags": [
        "alias",
        "caldan",
        "caldan homeworld (formal name unresolved)",
        "inferred"
      ],
      "mapNodeIds": [
        "node-caldan-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-caldan-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Alias record shares the Caldan provisional-world threat state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-007",
      "referenceId": "A007",
      "name": "Tanvar → Tanvar homeworld (formal name unresolved)",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Provisional demonym-derived map label.",
      "classification": "Tanvar homeworld (formal name unresolved)",
      "summary": "The story gives a Tanvar regiment and frozen-world origin but not a formal planet name.",
      "relationships": [
        "Normalized map object: Tanvar homeworld (formal name unresolved)"
      ],
      "observedLabel": "Tanvar",
      "normalizedObject": "Tanvar homeworld (formal name unresolved)",
      "resolution": "Provisional demonym-derived map label.",
      "story": "The Desk of Despair",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": "Reference sheet URL was a pagination audit route; exact story permalink restored from the archive index."
      },
      "tags": [
        "alias",
        "tanvar",
        "tanvar homeworld (formal name unresolved)",
        "inferred"
      ],
      "mapNodeIds": [
        "node-tanvar-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-tanvar-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Alias record shares the Tanvar provisional-world threat state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-008",
      "referenceId": "A008",
      "name": "Halcyon → Halcyon homeworld (formal name unresolved)",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "inferred",
      "confidence": "Inferred",
      "status": "Provisional unit-derived map label.",
      "classification": "Halcyon homeworld (formal name unresolved)",
      "summary": "The story gives a Halcyon regiment and forest-world origin but not a formal planet name.",
      "relationships": [
        "Normalized map object: Halcyon homeworld (formal name unresolved)"
      ],
      "observedLabel": "Halcyon",
      "normalizedObject": "Halcyon homeworld (formal name unresolved)",
      "resolution": "Provisional unit-derived map label.",
      "story": "The Desk of Despair",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": "Reference sheet URL was a pagination audit route; exact story permalink restored from the archive index."
      },
      "tags": [
        "alias",
        "halcyon",
        "halcyon homeworld (formal name unresolved)",
        "inferred"
      ],
      "mapNodeIds": [
        "node-halcyon-homeworld"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-halcyon-homeworld"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "Alias record shares the Halcyon provisional-world threat state.",
      "mapRegionIds": []
    },
    {
      "id": "alias-009",
      "referenceId": "A009",
      "name": "Vorlin → Vorlin 22nd administrative/composite identity",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "unresolved",
      "confidence": "Candidate",
      "status": "Do not force a homeworld interpretation.",
      "classification": "Vorlin 22nd administrative/composite identity",
      "summary": "The Vorlin 22nd is a composite of remnants from many differently named regiments.",
      "relationships": [
        "Normalized map object: Vorlin 22nd administrative/composite identity"
      ],
      "observedLabel": "Vorlin",
      "normalizedObject": "Vorlin 22nd administrative/composite identity",
      "resolution": "Do not force a homeworld interpretation.",
      "story": "The Desk of Despair",
      "source": {
        "label": "The Desk of Despair",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1fpj5va/the_desk_of_despair/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": "Reference sheet URL was a pagination audit route; exact story permalink restored from the archive index."
      },
      "tags": [
        "alias",
        "vorlin",
        "vorlin 22nd administrative",
        "composite identity",
        "candidate"
      ],
      "mapNodeIds": [],
      "mapReady": false,
      "map": {
        "nodeIds": [],
        "regionIds": []
      },
      "threat": "unassigned",
      "threatNote": "No plotted threat-state assignment.",
      "mapRegionIds": []
    },
    {
      "id": "alias-010",
      "referenceId": "A010",
      "name": "Kertora Semoises V → Kertora Semoises V",
      "category": "alias",
      "objectType": "Alias-resolution decision",
      "provenance": "story-grounded",
      "confidence": "Confirmed",
      "status": "Moon, not fifth planet.",
      "classification": "Kertora Semoises V",
      "summary": "The story explicitly calls it the fifth moon of Kertora Semoises Prime.",
      "relationships": [
        "Normalized map object: Kertora Semoises V"
      ],
      "observedLabel": "Kertora Semoises V",
      "normalizedObject": "Kertora Semoises V",
      "resolution": "Moon, not fifth planet.",
      "story": "By Ink and Mandate",
      "source": {
        "label": "By Ink and Mandate",
        "url": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "status": "verified"
      },
      "sourceAudit": {
        "referenceSheetUrl": "https://www.reddit.com/r/EmperorProtects/comments/1lga6is/by_ink_and_mandate/",
        "note": ""
      },
      "tags": [
        "alias",
        "kertora semoises v",
        "kertora semoises v",
        "confirmed"
      ],
      "mapNodeIds": [
        "node-kertora"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-kertora"
        ],
        "regionIds": []
      },
      "threat": "ork",
      "threatNote": "Alias record shares the Kertora Semoises conflict state.",
      "mapRegionIds": []
    },
    {
      "id": "author-cafarron",
      "referenceId": "AUTH-001",
      "name": "Cafarron Corridor",
      "category": "region",
      "objectType": "Sector",
      "provenance": "user-established",
      "confidence": "Authoritative",
      "status": "Sector identity",
      "classification": "Campaign sector",
      "summary": "Campaign-author established sector containing the local and original worlds represented by this archive.",
      "relationships": [
        "Contains the campaign’s local/original worlds."
      ],
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "sector",
        "cafarron corridor",
        "campaign author"
      ],
      "mapNodeIds": [],
      "mapReady": true,
      "map": {
        "nodeIds": [],
        "regionIds": [
          "region-cafarron"
        ]
      },
      "threat": "unassigned",
      "threatNote": "Sector-wide threat state is not represented by one color.",
      "mapRegionIds": [
        "region-cafarron"
      ]
    },
    {
      "id": "alias-yeldons-throne",
      "referenceId": "AUTH-002",
      "name": "Yeldon’s Throne / Galladin’s Throne",
      "category": "alias",
      "objectType": "Planetary-cultural name and capital-city name",
      "provenance": "user-established",
      "confidence": "Authoritative clarification",
      "status": "Normalized to Galladin Prime",
      "classification": "Dual-use world and city label",
      "summary": "Local dialect forms identify the planet culturally and its capital city as Yeldon’s Throne or Galladin’s Throne, while Galladin Prime remains the formal planetary label in earlier records.",
      "relationships": [
        "Planetary-cultural alias of Galladin Prime.",
        "Capital city name on Galladin Prime."
      ],
      "originCanonStatus": "Campaign-author clarification",
      "mapStatus": "Map-ready alias",
      "keyStory": "Campaign author clarification",
      "source": {
        "label": "Campaign author clarification",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "galladin",
        "yeldon",
        "dialect",
        "capital city",
        "planet alias"
      ],
      "mapNodeIds": [
        "node-galladin"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-galladin"
        ],
        "regionIds": []
      },
      "threat": "heretical",
      "threatNote": "Shares the Galladin conflict state.",
      "mapRegionIds": []
    },
    {
      "id": "system-core-anchorage-pending",
      "referenceId": "AUTH-003",
      "name": "Imperial Fleet Anchorage System",
      "category": "system",
      "objectType": "Star system; proper name pending",
      "provenance": "user-established",
      "confidence": "Authoritative function; name pending",
      "status": "Core-system addition",
      "classification": "Imperial naval anchorage and moorage system",
      "summary": "One of the two required core systems between Galadin Prime and Pelzane. The Imperial fleet uses it for anchorage and moorage.",
      "relationships": [
        "Optional transit path between Galadin Prime and Pelzane."
      ],
      "imperialPresence": "Imperial fleet anchorage function is established; permanent fleet names remain unspecified.",
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "system",
        "naval anchorage",
        "moorage",
        "core route",
        "name pending"
      ],
      "mapNodeIds": [
        "node-core-anchorage"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-core-anchorage"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper system name remains pending.",
      "mapRegionIds": []
    },
    {
      "id": "system-core-forge-pending",
      "referenceId": "AUTH-004",
      "name": "Core Forge System",
      "category": "system",
      "objectType": "Star system; proper name pending",
      "provenance": "user-established",
      "confidence": "Authoritative function; name pending",
      "status": "Core-system addition",
      "classification": "Forge World system",
      "summary": "One of the two required core systems between Galadin Prime and Pelzane. Its principal settled world is a Forge World.",
      "relationships": [
        "Optional transit path between Galadin Prime and Pelzane."
      ],
      "imperialPresence": "Adeptus Mechanicus forge-world function established; formal system and world names pending.",
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "system",
        "forge world",
        "core route",
        "name pending"
      ],
      "mapNodeIds": [
        "node-core-forge"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-core-forge"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper system name remains pending.",
      "mapRegionIds": []
    },
    {
      "id": "system-thesk-ward",
      "referenceId": "AUTH-005",
      "name": "Thesk Ward",
      "category": "system",
      "objectType": "Frontier system or administrative ward",
      "provenance": "user-established",
      "confidence": "Authoritative name; details pending",
      "status": "Frontier area near Pilcher 7",
      "classification": "Frontier system or ward",
      "summary": "A named frontier reference point near Pilcher 7. Its complete world inventory and Imperial institutions remain to be written.",
      "relationships": [
        "Reference area for Pilcher-frontier production systems."
      ],
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "system",
        "frontier",
        "thesk ward",
        "pilcher vicinity"
      ],
      "mapNodeIds": [
        "node-thesk"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-thesk"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Name and frontier function are established; detailed survey remains pending.",
      "mapRegionIds": []
    },
    {
      "id": "world-pilcher-fringe-production-1",
      "referenceId": "AUTH-PROD-1",
      "name": "Pilcher–Thesk Fringe Production World 1",
      "category": "world",
      "objectType": "Planet; proper name pending",
      "provenance": "user-established",
      "confidence": "Authoritative function; name pending",
      "status": "Fringe production world",
      "classification": "Production world; specialization pending",
      "summary": "One of at least three required production worlds in the Pilcher 7 and Thesk Ward frontier area.",
      "relationships": [
        "Pilcher–Thesk frontier production network."
      ],
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "planet",
        "production world",
        "pilcher",
        "thesk ward",
        "name pending"
      ],
      "mapNodeIds": [
        "node-production-1"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-production-1"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper name and specialization remain pending.",
      "mapRegionIds": []
    },
    {
      "id": "world-pilcher-fringe-production-2",
      "referenceId": "AUTH-PROD-2",
      "name": "Pilcher–Thesk Fringe Production World 2",
      "category": "world",
      "objectType": "Planet; proper name pending",
      "provenance": "user-established",
      "confidence": "Authoritative function; name pending",
      "status": "Fringe production world",
      "classification": "Production world; specialization pending",
      "summary": "One of at least three required production worlds in the Pilcher 7 and Thesk Ward frontier area.",
      "relationships": [
        "Pilcher–Thesk frontier production network."
      ],
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "planet",
        "production world",
        "pilcher",
        "thesk ward",
        "name pending"
      ],
      "mapNodeIds": [
        "node-production-2"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-production-2"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper name and specialization remain pending.",
      "mapRegionIds": []
    },
    {
      "id": "world-pilcher-fringe-production-3",
      "referenceId": "AUTH-PROD-3",
      "name": "Pilcher–Thesk Fringe Production World 3",
      "category": "world",
      "objectType": "Planet; proper name pending",
      "provenance": "user-established",
      "confidence": "Authoritative function; name pending",
      "status": "Fringe production world",
      "classification": "Production world; specialization pending",
      "summary": "One of at least three required production worlds in the Pilcher 7 and Thesk Ward frontier area.",
      "relationships": [
        "Pilcher–Thesk frontier production network."
      ],
      "originCanonStatus": "Campaign-author established",
      "mapStatus": "Map-ready",
      "keyStory": "Campaign author directive",
      "source": {
        "label": "Campaign author directive",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "planet",
        "production world",
        "pilcher",
        "thesk ward",
        "name pending"
      ],
      "mapNodeIds": [
        "node-production-3"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-production-3"
        ],
        "regionIds": []
      },
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper name and specialization remain pending.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-01",
      "referenceId": "EXP-01",
      "name": "Exploratory Contact CF-01",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Segrea. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Segrea."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 1"
      ],
      "mapNodeIds": [
        "node-exploratory-01"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-01"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-02",
      "referenceId": "EXP-02",
      "name": "Exploratory Contact CF-02",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to New Presidio. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to New Presidio."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 2"
      ],
      "mapNodeIds": [
        "node-exploratory-02"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-02"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-03",
      "referenceId": "EXP-03",
      "name": "Exploratory Contact CF-03",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Presteria IV. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Presteria IV."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 3"
      ],
      "mapNodeIds": [
        "node-exploratory-03"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-03"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-04",
      "referenceId": "EXP-04",
      "name": "Exploratory Contact CF-04",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Galladin System. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Galladin System."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 4"
      ],
      "mapNodeIds": [
        "node-exploratory-04"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-04"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-05",
      "referenceId": "EXP-05",
      "name": "Exploratory Contact CF-05",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Imperial Fleet Anchorage System. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Imperial Fleet Anchorage System."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 5"
      ],
      "mapNodeIds": [
        "node-exploratory-05"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-05"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-06",
      "referenceId": "EXP-06",
      "name": "Exploratory Contact CF-06",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Core Forge System. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Core Forge System."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 6"
      ],
      "mapNodeIds": [
        "node-exploratory-06"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-06"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-07",
      "referenceId": "EXP-07",
      "name": "Exploratory Contact CF-07",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Pelzane. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Pelzane."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 7"
      ],
      "mapNodeIds": [
        "node-exploratory-07"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-07"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-08",
      "referenceId": "EXP-08",
      "name": "Exploratory Contact CF-08",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Gazeras System. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Gazeras System."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 8"
      ],
      "mapNodeIds": [
        "node-exploratory-08"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-08"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-09",
      "referenceId": "EXP-09",
      "name": "Exploratory Contact CF-09",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Sygsnsei IX. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Sygsnsei IX."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 9"
      ],
      "mapNodeIds": [
        "node-exploratory-09"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-09"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-10",
      "referenceId": "EXP-10",
      "name": "Exploratory Contact CF-10",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Cyprian IX. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Cyprian IX."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 10"
      ],
      "mapNodeIds": [
        "node-exploratory-10"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-10"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-11",
      "referenceId": "EXP-11",
      "name": "Exploratory Contact CF-11",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Sullivan. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Sullivan."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 11"
      ],
      "mapNodeIds": [
        "node-exploratory-11"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-11"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-12",
      "referenceId": "EXP-12",
      "name": "Exploratory Contact CF-12",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Kerodan VII. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Kerodan VII."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 12"
      ],
      "mapNodeIds": [
        "node-exploratory-12"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-12"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-13",
      "referenceId": "EXP-13",
      "name": "Exploratory Contact CF-13",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to ReaalSpekcs 7. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to ReaalSpekcs 7."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 13"
      ],
      "mapNodeIds": [
        "node-exploratory-13"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-13"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-14",
      "referenceId": "EXP-14",
      "name": "Exploratory Contact CF-14",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Kertora Semoises. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Kertora Semoises."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 14"
      ],
      "mapNodeIds": [
        "node-exploratory-14"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-14"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-15",
      "referenceId": "EXP-15",
      "name": "Exploratory Contact CF-15",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Parban. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Parban."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 15"
      ],
      "mapNodeIds": [
        "node-exploratory-15"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-15"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-16",
      "referenceId": "EXP-16",
      "name": "Exploratory Contact CF-16",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Valikor System. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Valikor System."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 16"
      ],
      "mapNodeIds": [
        "node-exploratory-16"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-16"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-17",
      "referenceId": "EXP-17",
      "name": "Exploratory Contact CF-17",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Panthes 7. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Panthes 7."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 17"
      ],
      "mapNodeIds": [
        "node-exploratory-17"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-17"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-18",
      "referenceId": "EXP-18",
      "name": "Exploratory Contact CF-18",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Jhasyi’apan. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Jhasyi’apan."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 18"
      ],
      "mapNodeIds": [
        "node-exploratory-18"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-18"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-19",
      "referenceId": "EXP-19",
      "name": "Exploratory Contact CF-19",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Havenvard System. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Havenvard System."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 19"
      ],
      "mapNodeIds": [
        "node-exploratory-19"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-19"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-20",
      "referenceId": "EXP-20",
      "name": "Exploratory Contact CF-20",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Thesk Ward. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Thesk Ward."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 20"
      ],
      "mapNodeIds": [
        "node-exploratory-20"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-20"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-21",
      "referenceId": "EXP-21",
      "name": "Exploratory Contact CF-21",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Pilcher–Thesk Production World 1. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Pilcher–Thesk Production World 1."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 21"
      ],
      "mapNodeIds": [
        "node-exploratory-21"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-21"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-22",
      "referenceId": "EXP-22",
      "name": "Exploratory Contact CF-22",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Pilcher–Thesk Production World 2. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Pilcher–Thesk Production World 2."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 22"
      ],
      "mapNodeIds": [
        "node-exploratory-22"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-22"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-23",
      "referenceId": "EXP-23",
      "name": "Exploratory Contact CF-23",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Pilcher 7. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Pilcher 7."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 23"
      ],
      "mapNodeIds": [
        "node-exploratory-23"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-23"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-24",
      "referenceId": "EXP-24",
      "name": "Exploratory Contact CF-24",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Pilcher–Thesk Production World 3. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Pilcher–Thesk Production World 3."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 24"
      ],
      "mapNodeIds": [
        "node-exploratory-24"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-24"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    },
    {
      "id": "exploratory-contact-25",
      "referenceId": "EXP-25",
      "name": "Exploratory Contact CF-25",
      "category": "system",
      "objectType": "Exploratory system contact",
      "provenance": "exploratory-chart",
      "confidence": "Cartographic placeholder",
      "status": "Not canonized; pending later sector revision",
      "classification": "Unsurveyed or uninhabited fringe system",
      "summary": "A diegetic Navis Cartographica exploratory contact connected to Effesatran. It may be renamed, replaced, populated, or removed when the core canon list is updated.",
      "relationships": [
        "Provisional survey connection to Effesatran."
      ],
      "originCanonStatus": "Exploratory non-canon",
      "mapStatus": "Exploratory",
      "keyStory": "Campaign author exploratory-map directive",
      "source": {
        "label": "Exploratory cartographic placeholder authorized for sector expansion",
        "url": "",
        "status": "authorial"
      },
      "sourceAudit": {
        "referenceSheetUrl": "",
        "note": ""
      },
      "tags": [
        "exploratory",
        "fringe system",
        "unsurveyed",
        "uninhabited",
        "contact 25"
      ],
      "mapNodeIds": [
        "node-exploratory-25"
      ],
      "mapReady": true,
      "map": {
        "nodeIds": [
          "node-exploratory-25"
        ],
        "regionIds": []
      },
      "threat": "unsurveyed",
      "threatNote": "Exploratory contact with no canonical identity, population, or threat assignment.",
      "mapRegionIds": []
    }
  ],
  "mapNodes": [
    {
      "id": "node-segrea",
      "name": "Segrea",
      "position": [
        -58,
        -20,
        -5
      ],
      "recordIds": [
        "celestial-c023"
      ],
      "kind": "medieval-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "scale": 0.88,
      "guardOrigin": false
    },
    {
      "id": "node-new-presidio",
      "name": "New Presidio",
      "position": [
        -44,
        -8,
        -1
      ],
      "recordIds": [
        "celestial-c015"
      ],
      "kind": "capital-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "scale": 1.02,
      "guardOrigin": false
    },
    {
      "id": "node-presteria",
      "name": "Presteria IV",
      "position": [
        -44,
        22,
        9
      ],
      "recordIds": [
        "celestial-c001"
      ],
      "kind": "ecclesiastical-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "scale": 0.98,
      "guardOrigin": false
    },
    {
      "id": "node-galladin",
      "name": "Galladin System",
      "position": [
        -25,
        0,
        0
      ],
      "recordIds": [
        "celestial-c020",
        "celestial-c021",
        "celestial-c022",
        "alias-yeldons-throne"
      ],
      "kind": "core-system",
      "layer": "primary",
      "provenance": "story-grounded + authorial clarification",
      "threat": "heretical",
      "threatNote": "Galladin’s Throne is facing heretical and civil conflict.",
      "scale": 1.28,
      "guardOrigin": false
    },
    {
      "id": "node-core-anchorage",
      "name": "Imperial Fleet Anchorage System",
      "position": [
        -13,
        -2,
        4
      ],
      "recordIds": [
        "system-core-anchorage-pending"
      ],
      "kind": "anchorage-system",
      "layer": "primary",
      "provenance": "user-established",
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper system name remains pending.",
      "scale": 1.12,
      "guardOrigin": false
    },
    {
      "id": "node-core-forge",
      "name": "Core Forge System",
      "position": [
        0,
        -5,
        -1
      ],
      "recordIds": [
        "system-core-forge-pending"
      ],
      "kind": "forge-system",
      "layer": "primary",
      "provenance": "user-established",
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper system name remains pending.",
      "scale": 1.12,
      "guardOrigin": false
    },
    {
      "id": "node-pelzane",
      "name": "Pelzane",
      "position": [
        14,
        -9,
        -2
      ],
      "recordIds": [
        "celestial-c018",
        "celestial-c056"
      ],
      "kind": "declining-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "dead",
      "threatNote": "Terminal planetary decline is the primary recorded danger.",
      "scale": 0.98,
      "guardOrigin": false
    },
    {
      "id": "node-gazeras",
      "name": "Gazeras System",
      "position": [
        -7,
        21,
        5
      ],
      "recordIds": [
        "celestial-c009",
        "celestial-c008",
        "celestial-c030",
        "unnamed-u015"
      ],
      "kind": "agricultural-system",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "scale": 1.0,
      "guardOrigin": false
    },
    {
      "id": "node-sygsnsei",
      "name": "Sygsnsei IX",
      "position": [
        -24,
        34,
        14
      ],
      "recordIds": [
        "celestial-c027"
      ],
      "kind": "schola-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "scale": 0.92,
      "guardOrigin": false
    },
    {
      "id": "node-cyprian",
      "name": "Cyprian IX",
      "position": [
        -2,
        38,
        9
      ],
      "recordIds": [
        "celestial-c028"
      ],
      "kind": "urban-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "No active conflict is presently recorded.",
      "scale": 0.94,
      "guardOrigin": false
    },
    {
      "id": "node-sullivan",
      "name": "Sullivan",
      "position": [
        15,
        29,
        11
      ],
      "recordIds": [
        "celestial-c012"
      ],
      "kind": "war-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "War-world culture is confirmed; no current invasion is recorded.",
      "scale": 0.98,
      "guardOrigin": false
    },
    {
      "id": "node-kerodan",
      "name": "Kerodan VII",
      "position": [
        22,
        13,
        -4
      ],
      "recordIds": [
        "celestial-c026"
      ],
      "kind": "battlefield-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "standard",
      "threatNote": "Past ambush recorded; no current conflict state established.",
      "scale": 0.92,
      "guardOrigin": false
    },
    {
      "id": "node-reaalspekcs",
      "name": "ReaalSpekcs 7",
      "position": [
        -15,
        -29,
        -10
      ],
      "recordIds": [
        "celestial-c014"
      ],
      "kind": "punishment-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "dead",
      "threatNote": "Dead hives and a hostile environment make the world operationally hazardous.",
      "scale": 0.94,
      "guardOrigin": false
    },
    {
      "id": "node-kertora",
      "name": "Kertora Semoises",
      "position": [
        30,
        -24,
        -11
      ],
      "recordIds": [
        "celestial-c005",
        "celestial-c006",
        "celestial-c060"
      ],
      "kind": "promethium-system",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "ork",
      "threatNote": "Active Ork and grot assault around Kertora Semoises V.",
      "scale": 1.06,
      "guardOrigin": false
    },
    {
      "id": "node-parban",
      "name": "Parban",
      "position": [
        48,
        -29,
        -7
      ],
      "recordIds": [
        "celestial-c007",
        "celestial-c060"
      ],
      "kind": "agri-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "heretical",
      "threatNote": "Prior theatre of heretical warfare; current recovery status undefined.",
      "scale": 0.94,
      "guardOrigin": false
    },
    {
      "id": "node-valikor",
      "name": "Valikor System",
      "position": [
        40,
        5,
        4
      ],
      "recordIds": [
        "celestial-c016",
        "celestial-c017",
        "celestial-c058",
        "celestial-c061"
      ],
      "kind": "forge-system",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "ork",
      "threatNote": "Devastated by Orks with continuing indications of orcoid proliferation.",
      "scale": 1.16,
      "guardOrigin": false
    },
    {
      "id": "node-krexis",
      "name": "Krexis Theta",
      "position": [
        50,
        13,
        0
      ],
      "recordIds": [
        "celestial-c029",
        "celestial-c061"
      ],
      "kind": "provisional-world",
      "layer": "provisional",
      "provenance": "story-grounded but class unresolved",
      "threat": "unsurveyed",
      "threatNote": "Object class remains unresolved; extreme terrain and abandoned hives recorded.",
      "scale": 0.8,
      "guardOrigin": false
    },
    {
      "id": "node-panthes",
      "name": "Panthes 7",
      "position": [
        52,
        25,
        12
      ],
      "recordIds": [
        "celestial-c011"
      ],
      "kind": "border-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "xenos",
      "threatNote": "Contested world at the edge of T’au space.",
      "scale": 1.0,
      "guardOrigin": false
    },
    {
      "id": "node-jhasyiapan",
      "name": "Jhasyi’apan",
      "position": [
        60,
        -13,
        16
      ],
      "recordIds": [
        "celestial-c003"
      ],
      "kind": "frontier-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "unsurveyed",
      "threatNote": "Remote frontier world with limited modern survey detail.",
      "scale": 0.98,
      "guardOrigin": false
    },
    {
      "id": "node-havenvard",
      "name": "Havenvard System",
      "position": [
        34,
        29,
        0
      ],
      "recordIds": [
        "celestial-c024",
        "unnamed-u014"
      ],
      "kind": "system",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "unsurveyed",
      "threatNote": "Member worlds and present condition remain incompletely indexed.",
      "scale": 0.92,
      "guardOrigin": false
    },
    {
      "id": "node-mandible",
      "name": "Mandible Point",
      "position": [
        44,
        34,
        -4
      ],
      "recordIds": [
        "celestial-c057"
      ],
      "kind": "navigation-point",
      "layer": "supporting",
      "provenance": "story-grounded",
      "threat": "unsurveyed",
      "threatNote": "Navigation point; object class and habitation status are not established.",
      "scale": 0.58,
      "guardOrigin": false
    },
    {
      "id": "node-thesk",
      "name": "Thesk Ward",
      "position": [
        73,
        4,
        8
      ],
      "recordIds": [
        "system-thesk-ward"
      ],
      "kind": "frontier-system",
      "layer": "primary",
      "provenance": "user-established",
      "threat": "unsurveyed",
      "threatNote": "Detailed survey and threat classification remain pending.",
      "scale": 1.0,
      "guardOrigin": false
    },
    {
      "id": "node-production-1",
      "name": "Pilcher–Thesk Production World 1",
      "position": [
        77,
        -4,
        5
      ],
      "recordIds": [
        "world-pilcher-fringe-production-1"
      ],
      "kind": "production-world",
      "layer": "primary",
      "provenance": "user-established",
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper name pending.",
      "scale": 0.86,
      "guardOrigin": false
    },
    {
      "id": "node-production-2",
      "name": "Pilcher–Thesk Production World 2",
      "position": [
        83,
        20,
        9
      ],
      "recordIds": [
        "world-pilcher-fringe-production-2"
      ],
      "kind": "production-world",
      "layer": "primary",
      "provenance": "user-established",
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper name pending.",
      "scale": 0.86,
      "guardOrigin": false
    },
    {
      "id": "node-pilcher",
      "name": "Pilcher 7",
      "position": [
        90,
        8,
        15
      ],
      "recordIds": [
        "celestial-c010",
        "celestial-c059"
      ],
      "kind": "crisis-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "anomalous",
      "threatNote": "The Gray is consuming the world.",
      "scale": 1.15,
      "guardOrigin": false
    },
    {
      "id": "node-production-3",
      "name": "Pilcher–Thesk Production World 3",
      "position": [
        98,
        0,
        17
      ],
      "recordIds": [
        "world-pilcher-fringe-production-3"
      ],
      "kind": "production-world",
      "layer": "primary",
      "provenance": "user-established",
      "threat": "standard",
      "threatNote": "No active conflict assigned; proper name pending.",
      "scale": 0.86,
      "guardOrigin": false
    },
    {
      "id": "node-effesatran",
      "name": "Effesatran",
      "position": [
        77,
        32,
        23
      ],
      "recordIds": [
        "celestial-c013"
      ],
      "kind": "aeldari-shrine-world",
      "layer": "primary",
      "provenance": "story-grounded",
      "threat": "xenos",
      "threatNote": "Aeldari shrine world; no current battle confirmed.",
      "scale": 1.05,
      "guardOrigin": false
    },
    {
      "id": "node-caldan-homeworld",
      "name": "Caldan homeworld",
      "position": [
        -60,
        8,
        -13
      ],
      "recordIds": [
        "celestial-c033",
        "unnamed-u005"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Inferred agri-world origin; formal name unresolved.",
      "scale": 0.76,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-tanvar-homeworld",
      "name": "Tanvar homeworld",
      "position": [
        -53,
        18,
        -18
      ],
      "recordIds": [
        "celestial-c034",
        "unnamed-u006"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Inferred frozen-world origin; formal name unresolved.",
      "scale": 0.76,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-halcyon-homeworld",
      "name": "Halcyon homeworld",
      "position": [
        -47,
        30,
        -10
      ],
      "recordIds": [
        "celestial-c035",
        "unnamed-u007"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Inferred forest-world origin; formal name unresolved.",
      "scale": 0.76,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-ersak-homeworld",
      "name": "Ersak homeworld",
      "position": [
        -34,
        38,
        -17
      ],
      "recordIds": [
        "celestial-c036"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Place-derived origin; environment unrecorded.",
      "scale": 0.72,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-mirradon-homeworld",
      "name": "Mirradon homeworld",
      "position": [
        -18,
        44,
        -11
      ],
      "recordIds": [
        "celestial-c037",
        "unnamed-u008"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Inferred smog-and-ash urban origin.",
      "scale": 0.78,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-brannis-homeworld",
      "name": "Brannis homeworld",
      "position": [
        3,
        48,
        -5
      ],
      "recordIds": [
        "celestial-c038",
        "unnamed-u009"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Inferred disciplined and ordered homeworld.",
      "scale": 0.76,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-draven-homeworld",
      "name": "Draven homeworld",
      "position": [
        25,
        45,
        -12
      ],
      "recordIds": [
        "celestial-c039"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Place-derived origin; desert deployment kept separate.",
      "scale": 0.74,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-vandrell-homeworld",
      "name": "Vandrell homeworld",
      "position": [
        44,
        40,
        -2
      ],
      "recordIds": [
        "celestial-c040"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Place-derived origin; environment unrecorded.",
      "scale": 0.72,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-karron-homeworld",
      "name": "Karron homeworld",
      "position": [
        59,
        36,
        -10
      ],
      "recordIds": [
        "celestial-c041"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Place-derived origin; environment unrecorded.",
      "scale": 0.72,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-vektran-homeworld",
      "name": "Vektran homeworld",
      "position": [
        72,
        40,
        -4
      ],
      "recordIds": [
        "celestial-c042"
      ],
      "kind": "guard-origin",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "standard",
      "threatNote": "Place-derived penal origin or jurisdiction; exact class unresolved.",
      "scale": 0.74,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-caraphus",
      "name": "Caraphus",
      "position": [
        56,
        -39,
        5
      ],
      "recordIds": [
        "celestial-c044"
      ],
      "kind": "guard-origin-candidate",
      "layer": "guard-origin",
      "provenance": "reference-sheet Guard Origins",
      "threat": "unsurveyed",
      "threatNote": "Detachment-derived origin; celestial class unresolved.",
      "scale": 0.72,
      "status": "Astra Militarum origin world; formal name and/or class inferred",
      "guardOrigin": true,
      "labelPriority": "guard-origin"
    },
    {
      "id": "node-calvarint",
      "name": "Calvarint",
      "position": [
        37,
        35,
        19
      ],
      "recordIds": [
        "celestial-c045"
      ],
      "kind": "military-origin-candidate",
      "layer": "provisional",
      "provenance": "story-grounded name; class unresolved",
      "threat": "unsurveyed",
      "threatNote": "Military-origin name; exact object and branch unresolved.",
      "scale": 0.7,
      "guardOrigin": false
    },
    {
      "id": "node-prathus",
      "name": "Prathus",
      "position": [
        13,
        44,
        21
      ],
      "recordIds": [
        "celestial-c052"
      ],
      "kind": "fleet-region-candidate",
      "layer": "provisional",
      "provenance": "story-grounded fleet title; class unresolved",
      "threat": "unsurveyed",
      "threatNote": "Battlefleet title implies a region or system; object class unresolved.",
      "scale": 0.72,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-01",
      "name": "Unnamed planet of Janest Von Sontag",
      "position": [
        -6,
        55,
        20
      ],
      "recordIds": [
        "unnamed-u001"
      ],
      "kind": "unnamed-planet",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "unsurveyed",
      "threatNote": "Explicit planet; proper name and condition absent.",
      "scale": 0.58,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-02",
      "name": "Unnamed Exodite shrine world",
      "position": [
        93,
        38,
        29
      ],
      "recordIds": [
        "unnamed-u002"
      ],
      "kind": "unnamed-xenos-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "xenos",
      "threatNote": "Exodite shrine world; no current battle assigned.",
      "scale": 0.7,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-03",
      "name": "Three unnamed moons of Exodite shrine world",
      "position": [
        98,
        42,
        33
      ],
      "recordIds": [
        "unnamed-u003"
      ],
      "kind": "unnamed-moon-group",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed bodies",
      "threat": "unsurveyed",
      "threatNote": "Three unnamed moons; no individual threat classification.",
      "scale": 0.5,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-04",
      "name": "Unnamed crimson world",
      "position": [
        70,
        -45,
        25
      ],
      "recordIds": [
        "unnamed-u004"
      ],
      "kind": "unnamed-anomalous-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "anomalous",
      "threatNote": "Sentient mountain and extreme biospheric anomalies.",
      "scale": 0.78,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-10",
      "name": "Unnamed nursery world of the Young One",
      "position": [
        83,
        -52,
        -18
      ],
      "recordIds": [
        "unnamed-u010"
      ],
      "kind": "unnamed-death-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "anomalous",
      "threatNote": "Extreme apex-predator ecology.",
      "scale": 0.72,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-11",
      "name": "Unnamed desert deployment world",
      "position": [
        32,
        52,
        -25
      ],
      "recordIds": [
        "unnamed-u011"
      ],
      "kind": "unnamed-deployment-world",
      "layer": "unnamed",
      "provenance": "story-grounded deployment",
      "threat": "standard",
      "threatNote": "Deployment world; no current conflict classification recovered.",
      "scale": 0.58,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-12",
      "name": "Unnamed world under Aspect of Death predation",
      "position": [
        67,
        -36,
        -20
      ],
      "recordIds": [
        "unnamed-u012"
      ],
      "kind": "unnamed-threat-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "anomalous",
      "threatNote": "Predation by the Aspect of Death.",
      "scale": 0.7,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-13",
      "name": "Unnamed arid Fire Angels world",
      "position": [
        -68,
        -38,
        14
      ],
      "recordIds": [
        "unnamed-u013"
      ],
      "kind": "unnamed-arid-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "dead",
      "threatNote": "Arid, scarred, and dependent on colossal terraforming machines.",
      "scale": 0.66,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-14",
      "name": "Unnamed barren Havenvard world",
      "position": [
        40,
        26,
        -9
      ],
      "recordIds": [
        "unnamed-u014"
      ],
      "kind": "unnamed-dead-world",
      "layer": "unnamed",
      "provenance": "story-grounded context",
      "threat": "dead",
      "threatNote": "Bleak abandoned surface with implied ruins.",
      "scale": 0.58,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-15",
      "name": "Unnamed original world from Imperium’s Agony",
      "position": [
        -80,
        -5,
        12
      ],
      "recordIds": [
        "unnamed-u016"
      ],
      "kind": "unnamed-origin-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "unsurveyed",
      "threatNote": "Condition and name remain unknown.",
      "scale": 0.58,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-16",
      "name": "Unnamed evacuation world from Imperium’s Agony",
      "position": [
        -73,
        2,
        18
      ],
      "recordIds": [
        "unnamed-u017"
      ],
      "kind": "unnamed-crisis-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "heretical",
      "threatNote": "Inhabited Imperial world under evacuation crisis.",
      "scale": 0.66,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-05",
      "name": "Unnamed planet blasted lifeless by rogue psyker",
      "position": [
        -76,
        30,
        6
      ],
      "recordIds": [
        "unnamed-u018"
      ],
      "kind": "unnamed-dead-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "dead",
      "threatNote": "Rendered lifeless by rogue psyker.",
      "scale": 0.65,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-06",
      "name": "Unnamed Death World under militia duty",
      "position": [
        105,
        25,
        -2
      ],
      "recordIds": [
        "unnamed-u019"
      ],
      "kind": "unnamed-death-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "anomalous",
      "threatNote": "Death World ecology and dangerous local wildlife.",
      "scale": 0.66,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-07",
      "name": "Unnamed asteroid-mine world",
      "position": [
        95,
        -31,
        -7
      ],
      "recordIds": [
        "unnamed-u020"
      ],
      "kind": "unnamed-mine-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "unsurveyed",
      "threatNote": "Massive mined asteroid; current population and threat state unrecorded.",
      "scale": 0.58,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-08",
      "name": "Unnamed green-skied feudal world",
      "position": [
        -90,
        17,
        -12
      ],
      "recordIds": [
        "unnamed-u021"
      ],
      "kind": "unnamed-feudal-world",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed body",
      "threat": "standard",
      "threatNote": "Feudal civilization with no active conflict recorded.",
      "scale": 0.66,
      "guardOrigin": false
    },
    {
      "id": "node-unnamed-09",
      "name": "Additional Gazeras agricultural satellites",
      "position": [
        -1,
        24,
        8
      ],
      "recordIds": [
        "unnamed-u015"
      ],
      "kind": "unnamed-moon-group",
      "layer": "unnamed",
      "provenance": "story-grounded unnamed bodies",
      "threat": "standard",
      "threatNote": "Agricultural satellites with no active conflict recorded.",
      "scale": 0.48,
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-01",
      "name": "Exploratory Contact CF-01",
      "position": [
        -66,
        -25,
        2
      ],
      "recordIds": [
        "exploratory-contact-01"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-segrea",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-02",
      "name": "Exploratory Contact CF-02",
      "position": [
        -51,
        -2,
        -6
      ],
      "recordIds": [
        "exploratory-contact-02"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-new-presidio",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-03",
      "name": "Exploratory Contact CF-03",
      "position": [
        -39,
        30,
        15
      ],
      "recordIds": [
        "exploratory-contact-03"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-presteria",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-04",
      "name": "Exploratory Contact CF-04",
      "position": [
        -31,
        -8,
        -6
      ],
      "recordIds": [
        "exploratory-contact-04"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-galladin",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-05",
      "name": "Exploratory Contact CF-05",
      "position": [
        -6,
        5,
        9
      ],
      "recordIds": [
        "exploratory-contact-05"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-core-anchorage",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-06",
      "name": "Exploratory Contact CF-06",
      "position": [
        6,
        -12,
        6
      ],
      "recordIds": [
        "exploratory-contact-06"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-core-forge",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-07",
      "name": "Exploratory Contact CF-07",
      "position": [
        9,
        0,
        -9
      ],
      "recordIds": [
        "exploratory-contact-07"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-pelzane",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-08",
      "name": "Exploratory Contact CF-08",
      "position": [
        1,
        17,
        10
      ],
      "recordIds": [
        "exploratory-contact-08"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-gazeras",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-09",
      "name": "Exploratory Contact CF-09",
      "position": [
        -31,
        39,
        22
      ],
      "recordIds": [
        "exploratory-contact-09"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-sygsnsei",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-10",
      "name": "Exploratory Contact CF-10",
      "position": [
        4,
        29,
        4
      ],
      "recordIds": [
        "exploratory-contact-10"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-cyprian",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-11",
      "name": "Exploratory Contact CF-11",
      "position": [
        23,
        35,
        4
      ],
      "recordIds": [
        "exploratory-contact-11"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-sullivan",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-12",
      "name": "Exploratory Contact CF-12",
      "position": [
        16,
        7,
        2
      ],
      "recordIds": [
        "exploratory-contact-12"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-kerodan",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-13",
      "name": "Exploratory Contact CF-13",
      "position": [
        -23,
        -34,
        -3
      ],
      "recordIds": [
        "exploratory-contact-13"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-reaalspekcs",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-14",
      "name": "Exploratory Contact CF-14",
      "position": [
        23,
        -18,
        -16
      ],
      "recordIds": [
        "exploratory-contact-14"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-kertora",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-15",
      "name": "Exploratory Contact CF-15",
      "position": [
        53,
        -21,
        -2
      ],
      "recordIds": [
        "exploratory-contact-15"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-parban",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-16",
      "name": "Exploratory Contact CF-16",
      "position": [
        34,
        -1,
        -2
      ],
      "recordIds": [
        "exploratory-contact-16"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-valikor",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-17",
      "name": "Exploratory Contact CF-17",
      "position": [
        59,
        32,
        17
      ],
      "recordIds": [
        "exploratory-contact-17"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-panthes",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-18",
      "name": "Exploratory Contact CF-18",
      "position": [
        68,
        -17,
        21
      ],
      "recordIds": [
        "exploratory-contact-18"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-jhasyiapan",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-19",
      "name": "Exploratory Contact CF-19",
      "position": [
        29,
        38,
        -7
      ],
      "recordIds": [
        "exploratory-contact-19"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-havenvard",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-20",
      "name": "Exploratory Contact CF-20",
      "position": [
        81,
        0,
        13
      ],
      "recordIds": [
        "exploratory-contact-20"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-thesk",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-21",
      "name": "Exploratory Contact CF-21",
      "position": [
        70,
        2,
        -2
      ],
      "recordIds": [
        "exploratory-contact-21"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-production-1",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-22",
      "name": "Exploratory Contact CF-22",
      "position": [
        89,
        11,
        4
      ],
      "recordIds": [
        "exploratory-contact-22"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-production-2",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-23",
      "name": "Exploratory Contact CF-23",
      "position": [
        98,
        14,
        8
      ],
      "recordIds": [
        "exploratory-contact-23"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-pilcher",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-24",
      "name": "Exploratory Contact CF-24",
      "position": [
        92,
        -6,
        23
      ],
      "recordIds": [
        "exploratory-contact-24"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-production-3",
      "guardOrigin": false
    },
    {
      "id": "node-exploratory-25",
      "name": "Exploratory Contact CF-25",
      "position": [
        84,
        37,
        31
      ],
      "recordIds": [
        "exploratory-contact-25"
      ],
      "kind": "exploratory-system",
      "layer": "exploratory",
      "provenance": "exploratory-chart",
      "threat": "unsurveyed",
      "threatNote": "Unsurveyed or uninhabited chart contact; no canonical identity assigned.",
      "scale": 0.52,
      "exploratory": true,
      "parentNodeId": "node-effesatran",
      "guardOrigin": false
    }
  ],
  "routes": [
    {
      "id": "route-cafarron-primary-spine",
      "name": "Cafarron Corridor Primary Warp Spine",
      "nodeIds": [
        "node-segrea",
        "node-new-presidio",
        "node-galladin",
        "node-core-anchorage",
        "node-core-forge",
        "node-pelzane",
        "node-valikor",
        "node-thesk",
        "node-pilcher"
      ],
      "kind": "major warp corridor",
      "status": "Campaign cartographic backbone; central Anchorage–Forge passage is author-established, remaining continuity is provisional Navis charting",
      "layer": "major-warp",
      "authority": "mixed authorial and provisional",
      "traffic": "fleet, tithe, strategic freight"
    },
    {
      "id": "route-galladin-pelzane-bypass",
      "name": "Galladin–Pelzane Direct Bypass",
      "nodeIds": [
        "node-galladin",
        "node-pelzane"
      ],
      "kind": "major warp bypass",
      "status": "Provisional direct passage retained as an alternative to the Anchorage–Forge route",
      "layer": "major-warp",
      "authority": "provisional",
      "traffic": "priority and emergency traffic"
    },
    {
      "id": "route-northern-arc",
      "name": "Northern Scholastica and Border Warp Arc",
      "nodeIds": [
        "node-galladin",
        "node-presteria",
        "node-sygsnsei",
        "node-cyprian",
        "node-havenvard",
        "node-panthes"
      ],
      "kind": "major warp corridor",
      "status": "Provisional Navis arc connecting the northern indexed worlds; not a story-confirmed sequence",
      "layer": "major-warp",
      "authority": "provisional",
      "traffic": "administratum, scholastica, frontier military"
    },
    {
      "id": "route-gazeras-provisioning",
      "name": "Gazeras Provisioning and War-World Trade Spur",
      "nodeIds": [
        "node-galladin",
        "node-gazeras",
        "node-sullivan",
        "node-panthes"
      ],
      "kind": "trade and supply lane",
      "status": "Provisional Munitorum provisioning lane based on agricultural and war-world functions",
      "layer": "trade",
      "authority": "provisional",
      "traffic": "food tithe, personnel, war materiel"
    },
    {
      "id": "route-southern-supply",
      "name": "Southern Promethium and Agri Supply Spur",
      "nodeIds": [
        "node-pelzane",
        "node-kertora",
        "node-parban",
        "node-jhasyiapan",
        "node-thesk"
      ],
      "kind": "trade and supply lane",
      "status": "Provisional supply corridor connecting promethium, agricultural, and frontier nodes",
      "layer": "trade",
      "authority": "provisional",
      "traffic": "promethium, food tithe, frontier supply"
    },
    {
      "id": "route-pilcher-fringe",
      "name": "Pilcher–Thesk Production Loop",
      "nodeIds": [
        "node-thesk",
        "node-production-1",
        "node-production-2",
        "node-pilcher",
        "node-production-3",
        "node-thesk"
      ],
      "kind": "local freight circuit",
      "status": "Campaign-author required frontier production relationship; exact traffic pattern remains provisional",
      "layer": "trade",
      "authority": "authorial structure",
      "traffic": "local production and evacuation logistics"
    },
    {
      "id": "route-havenvard-mandible",
      "name": "Havenvard–Mandible Navigation Leg",
      "nodeIds": [
        "node-havenvard",
        "node-mandible"
      ],
      "kind": "local navigation leg",
      "status": "Story-grounded navigation association",
      "layer": "local-navigation",
      "authority": "story-grounded",
      "traffic": "navigation approach"
    },
    {
      "id": "route-exodite-moons",
      "name": "Unnamed Exodite Satellite Orbits",
      "nodeIds": [
        "node-unnamed-02",
        "node-unnamed-01",
        "node-unnamed-03"
      ],
      "kind": "local orbital relationship",
      "status": "Story-grounded local relationship; not a warp or trade lane",
      "layer": "local-navigation",
      "authority": "story-grounded",
      "traffic": "orbital relationship"
    },
    {
      "id": "route-node-exploratory-01",
      "name": "Segrea exploratory spur",
      "nodeIds": [
        "node-segrea",
        "node-exploratory-01"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-02",
      "name": "New Presidio exploratory spur",
      "nodeIds": [
        "node-new-presidio",
        "node-exploratory-02"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-03",
      "name": "Presteria IV exploratory spur",
      "nodeIds": [
        "node-presteria",
        "node-exploratory-03"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-04",
      "name": "Galladin System exploratory spur",
      "nodeIds": [
        "node-galladin",
        "node-exploratory-04"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-05",
      "name": "Imperial Fleet Anchorage System exploratory spur",
      "nodeIds": [
        "node-core-anchorage",
        "node-exploratory-05"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-06",
      "name": "Core Forge System exploratory spur",
      "nodeIds": [
        "node-core-forge",
        "node-exploratory-06"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-07",
      "name": "Pelzane exploratory spur",
      "nodeIds": [
        "node-pelzane",
        "node-exploratory-07"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-08",
      "name": "Gazeras System exploratory spur",
      "nodeIds": [
        "node-gazeras",
        "node-exploratory-08"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-09",
      "name": "Sygsnsei IX exploratory spur",
      "nodeIds": [
        "node-sygsnsei",
        "node-exploratory-09"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-10",
      "name": "Cyprian IX exploratory spur",
      "nodeIds": [
        "node-cyprian",
        "node-exploratory-10"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-11",
      "name": "Sullivan exploratory spur",
      "nodeIds": [
        "node-sullivan",
        "node-exploratory-11"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-12",
      "name": "Kerodan VII exploratory spur",
      "nodeIds": [
        "node-kerodan",
        "node-exploratory-12"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-13",
      "name": "ReaalSpekcs 7 exploratory spur",
      "nodeIds": [
        "node-reaalspekcs",
        "node-exploratory-13"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-14",
      "name": "Kertora Semoises exploratory spur",
      "nodeIds": [
        "node-kertora",
        "node-exploratory-14"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-15",
      "name": "Parban exploratory spur",
      "nodeIds": [
        "node-parban",
        "node-exploratory-15"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-16",
      "name": "Valikor System exploratory spur",
      "nodeIds": [
        "node-valikor",
        "node-exploratory-16"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-17",
      "name": "Panthes 7 exploratory spur",
      "nodeIds": [
        "node-panthes",
        "node-exploratory-17"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-18",
      "name": "Jhasyi’apan exploratory spur",
      "nodeIds": [
        "node-jhasyiapan",
        "node-exploratory-18"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-19",
      "name": "Havenvard System exploratory spur",
      "nodeIds": [
        "node-havenvard",
        "node-exploratory-19"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-20",
      "name": "Thesk Ward exploratory spur",
      "nodeIds": [
        "node-thesk",
        "node-exploratory-20"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-21",
      "name": "Pilcher–Thesk Production World 1 exploratory spur",
      "nodeIds": [
        "node-production-1",
        "node-exploratory-21"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-22",
      "name": "Pilcher–Thesk Production World 2 exploratory spur",
      "nodeIds": [
        "node-production-2",
        "node-exploratory-22"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-23",
      "name": "Pilcher 7 exploratory spur",
      "nodeIds": [
        "node-pilcher",
        "node-exploratory-23"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-24",
      "name": "Pilcher–Thesk Production World 3 exploratory spur",
      "nodeIds": [
        "node-production-3",
        "node-exploratory-24"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    },
    {
      "id": "route-node-exploratory-25",
      "name": "Effesatran exploratory spur",
      "nodeIds": [
        "node-effesatran",
        "node-exploratory-25"
      ],
      "kind": "exploratory",
      "status": "non-canon exploratory charting",
      "layer": "exploratory",
      "authority": "non-canon exploratory",
      "traffic": "survey only"
    }
  ],
  "regions": [
    {
      "id": "region-cafarron",
      "name": "Cafarron Corridor",
      "center": [
        15,
        2,
        2
      ],
      "radii": [
        125,
        68,
        56
      ],
      "recordIds": [
        "author-cafarron"
      ],
      "threat": "unassigned",
      "status": "campaign sector",
      "provenance": "user-established"
    },
    {
      "id": "region-centeven",
      "name": "CentEven Sector / Pilcher Outer Cluster",
      "center": [
        88,
        10,
        15
      ],
      "radii": [
        24,
        20,
        22
      ],
      "recordIds": [
        "celestial-c059",
        "celestial-c010"
      ],
      "threat": "anomalous",
      "status": "story-grounded sector context",
      "provenance": "story-grounded"
    },
    {
      "id": "region-krellan",
      "name": "Krellan Chain",
      "center": [
        42,
        5,
        4
      ],
      "radii": [
        18,
        14,
        16
      ],
      "recordIds": [
        "celestial-c058",
        "celestial-c016"
      ],
      "threat": "ork",
      "status": "story-grounded region",
      "provenance": "story-grounded"
    },
    {
      "id": "region-syndrione",
      "name": "Syndrione Front",
      "center": [
        40,
        -25,
        -8
      ],
      "radii": [
        28,
        16,
        18
      ],
      "recordIds": [
        "celestial-c060"
      ],
      "threat": "heretical",
      "status": "military front",
      "provenance": "story-grounded"
    },
    {
      "id": "region-tau9",
      "name": "Subsector Tau-9",
      "center": [
        47,
        11,
        3
      ],
      "radii": [
        22,
        18,
        16
      ],
      "recordIds": [
        "celestial-c061",
        "celestial-c029"
      ],
      "threat": "unsurveyed",
      "status": "administrative subsector",
      "provenance": "story-grounded"
    }
  ],
  "hazards": [
    {
      "id": "hazard-galladin",
      "name": "Galladin Heretical Conflict Zone",
      "center": [
        -25,
        0,
        0
      ],
      "radii": [
        9,
        7,
        9
      ],
      "recordIds": [
        "celestial-c020",
        "celestial-c021",
        "celestial-c022"
      ],
      "threat": "heretical",
      "status": "active civil/heretical conflict",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-kertora",
      "name": "Kertora Ork War Zone",
      "center": [
        30,
        -24,
        -11
      ],
      "radii": [
        9,
        7,
        9
      ],
      "recordIds": [
        "celestial-c005",
        "celestial-c006"
      ],
      "threat": "ork",
      "status": "active Ork and grot assault",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-valikor",
      "name": "Valikor Orcoid Proliferation Zone",
      "center": [
        40,
        5,
        4
      ],
      "radii": [
        10,
        8,
        10
      ],
      "recordIds": [
        "celestial-c016",
        "celestial-c017"
      ],
      "threat": "ork",
      "status": "devastated Ork-contested world",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-parban",
      "name": "Parban Heretical War Scars",
      "center": [
        48,
        -29,
        -7
      ],
      "radii": [
        7,
        5,
        7
      ],
      "recordIds": [
        "celestial-c007"
      ],
      "threat": "heretical",
      "status": "prior heretical warfare",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-pilcher",
      "name": "Pilcher Gray Consumption Zone",
      "center": [
        90,
        8,
        15
      ],
      "radii": [
        11,
        9,
        11
      ],
      "recordIds": [
        "celestial-c010"
      ],
      "threat": "anomalous",
      "status": "active extradimensional consumption crisis",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-panthes",
      "name": "Panthes T’au Border Contest",
      "center": [
        52,
        25,
        12
      ],
      "radii": [
        7,
        6,
        7
      ],
      "recordIds": [
        "celestial-c011"
      ],
      "threat": "xenos",
      "status": "contested border world",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-reaalspekcs",
      "name": "ReaalSpekcs Dead-Hive Hazard",
      "center": [
        -15,
        -29,
        -10
      ],
      "radii": [
        7,
        6,
        7
      ],
      "recordIds": [
        "celestial-c014"
      ],
      "threat": "dead",
      "status": "dead hives and hostile environment",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-pelzane",
      "name": "Pelzane Terminal Decline",
      "center": [
        14,
        -9,
        -2
      ],
      "radii": [
        6,
        5,
        6
      ],
      "recordIds": [
        "celestial-c018"
      ],
      "threat": "dead",
      "status": "terminal planetary decline",
      "provenance": "story-grounded"
    },
    {
      "id": "hazard-crimson",
      "name": "Crimson Sentient-Mountain Anomaly",
      "center": [
        70,
        -45,
        25
      ],
      "radii": [
        7,
        7,
        7
      ],
      "recordIds": [
        "unnamed-u004"
      ],
      "threat": "anomalous",
      "status": "biospheric anomaly",
      "provenance": "story-grounded unnamed body"
    },
    {
      "id": "hazard-young-one",
      "name": "Young One Nursery Predator Zone",
      "center": [
        83,
        -52,
        -18
      ],
      "radii": [
        7,
        7,
        7
      ],
      "recordIds": [
        "unnamed-u010"
      ],
      "threat": "anomalous",
      "status": "extreme predator ecology",
      "provenance": "story-grounded unnamed body"
    },
    {
      "id": "hazard-aspect-death",
      "name": "Aspect of Death Predation Zone",
      "center": [
        67,
        -36,
        -20
      ],
      "radii": [
        7,
        7,
        7
      ],
      "recordIds": [
        "unnamed-u012"
      ],
      "threat": "anomalous",
      "status": "active predation context",
      "provenance": "story-grounded unnamed body"
    }
  ],
  "archiveCoverage": [
    {
      "page": 1,
      "postsEnumerated": 10,
      "afterToken": "t3_1vrbln0",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 2,
      "postsEnumerated": 10,
      "afterToken": "t3_1ugvg2q",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1vrbln0",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 3,
      "postsEnumerated": 10,
      "afterToken": "t3_1qebjcb",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1ugvg2q",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 4,
      "postsEnumerated": 10,
      "afterToken": "t3_1m0t14s",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1qebjcb",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 5,
      "postsEnumerated": 10,
      "afterToken": "t3_1kyqzh1",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1m0t14s",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 6,
      "postsEnumerated": 10,
      "afterToken": "t3_1k2c4gx",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1kyqzh1",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 7,
      "postsEnumerated": 10,
      "afterToken": "t3_1fh35g1",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1k2c4gx",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 8,
      "postsEnumerated": 10,
      "afterToken": "t3_1fqbqpf",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1fh35g1",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 9,
      "postsEnumerated": 10,
      "afterToken": "t3_18mqt5d",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_1fqbqpf",
      "notes": "Coverage-audit route only; not a lore citation."
    },
    {
      "page": 10,
      "postsEnumerated": 3,
      "afterToken": "",
      "auditUrl": "https://www.reddit.com/r/EmperorProtects/new.json?limit=10&after=t3_18mqt5d",
      "notes": "Terminal page; no after token returned."
    }
  ],
  "referenceWorkbook": {
    "title": "Emperor Protects — Sector-Map Source Index",
    "scopeDate": "2026-08-05",
    "sheets": [
      "README",
      "Celestial Index",
      "Guard Origins",
      "Unnamed Bodies",
      "Alias Resolution",
      "Archive Coverage"
    ]
  }
});

  function exportArchive() {
    const payload = JSON.stringify(DATA, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cafarron-corridor-strategic-archive-${DATA.version}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.Warhammer40KLore = Object.freeze({
    data: DATA,
    ready: Promise.resolve(DATA),
    exportArchive
  });
})();
