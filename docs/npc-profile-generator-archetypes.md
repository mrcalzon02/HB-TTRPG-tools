# Universal NPC Profile Generator — Initial Archetype Catalogue

## Purpose

This catalogue defines the first organized hierarchy for the Universal NPC Profile Generator. Archetypes are not cosmetic occupation labels. Each archetype establishes expected profile sections, specialized operational information, likely level and wealth ranges, and the fields that may be absent, substituted, required, or prohibited.

The catalogue is intentionally broader than the first release. Entries are marked by implementation wave so the data model can anticipate later coverage without requiring every archetype in the first runtime.

## Implementation Waves

- **Wave A — first vertical slice:** civilian, laborer, craft worker, merchant, banker, beggar, city guard, soldier, thief, bandit, noble.
- **Wave B — first expansion:** household service, agriculture, hospitality, scholarship, healing, clergy, government, law enforcement, military specialists, criminal specialists, refugees, travelers.
- **Wave C — deep specialization:** courts, diplomacy, supernatural professions, maritime and airship roles, prisoners, expedition roles, institutions, and custom archetypes.

# Archetype Families

## 1. Civilian and Household

### General civilian — Wave A

A broad fallback for residents whose exact occupation is unimportant or deliberately unresolved.

Expected emphasis:

- household and residence;
- local reputation;
- daily need;
- community ties;
- simple employment or unemployment state;
- modest possessions;
- low or context-appropriate combat readiness.

### Child or dependent — Wave B

Includes children, wards, dependents, pages, students, street children, and young household helpers.

Special rules:

- age-plausible family roles;
- guardian or household relationship;
- schooling, apprenticeship, or daily supervision;
- no adult spouse or children except explicitly supernatural or exceptional settings;
- mechanical profile optional and normally noncombatant.

### Student — Wave B

A person in formal or informal education.

Special sections:

- school, tutor, academy, temple, guild, or master;
- subject of study;
- academic standing;
- fees or sponsorship;
- rival, mentor, and current examination or project.

### Apprentice — Wave B

A learner attached to a master, guild, shop, unit, ship, or religious institution.

Special sections:

- master or supervisor;
- apprenticeship stage;
- assigned duties;
- tools permitted;
- pay or room-and-board arrangement;
- expected qualification;
- grievance or ambition.

### Laborer — Wave A

Includes porters, dock hands, warehouse workers, road crews, construction hands, sanitation workers, haulers, loaders, and general laborers.

Special sections:

- employer, hiring point, foreman, or day-labor status;
- work site;
- tools;
- wage stability;
- physical condition;
- labor organization or informal crew;
- current injury, shortage, dispute, or dangerous assignment.

### Domestic servant — Wave B

Includes cooks, cleaners, attendants, valets, maids, household workers, and estate servants.

Special sections:

- employing household;
- rank in household service;
- access privileges;
- private knowledge;
- sleeping arrangement;
- loyalty, resentment, or dependence.

### Retired worker or pensioner — Wave B

A former worker, official, soldier, sailor, craft worker, or professional no longer in regular employment.

Special sections:

- former career;
- pension or support;
- retained skills;
- injuries or limitations;
- adult dependents or caregivers;
- community memory;
- unfinished obligation.

### Refugee or displaced person — Wave B

A person separated from their former home by war, disaster, persecution, debt, eviction, or political change.

Special sections:

- origin;
- displacement cause;
- former occupation;
- current legal status;
- missing family;
- temporary shelter;
- aid source;
- resettlement goal;
- immediate scarcity.

## 2. Agricultural and Resource Work

### Farmer — Wave B

Special sections:

- land tenure;
- crop or product;
- household labor;
- seasonal pressure;
- tools, animals, and storage;
- landlord, cooperative, or village obligation;
- weather, pest, tax, or debt problem.

### Herder — Wave B

Special sections:

- herd type and size;
- grazing access;
- migration or daily route;
- assistants and animals;
- predator or disease pressure;
- ownership arrangement.

### Fisher — Wave B

Special sections:

- boat, shore, river, lake, or sea method;
- catch type;
- crew;
- ownership;
- market buyer;
- weather and seasonal risk;
- lost gear, debt, quota, or territorial dispute.

### Miner, quarry worker, or salvager — Wave B

Special sections:

- extraction site;
- employer or claim;
- resource type;
- tools and hazards;
- crew;
- transport arrangement;
- injury, collapse, contamination, ownership, or theft problem.

## 3. Skilled Trades and Commercial Work

### Craft worker or artisan — Wave A

Includes smiths, carpenters, masons, weavers, potters, leatherworkers, glassworkers, instrument makers, shipwrights, and other trained makers.

Required or likely sections:

- trade;
- skill standing;
- tools;
- master, journeyman, apprentice, or owner status;
- workshop state;
- guild or licensing state;
- customers or contracts;
- materials pressure;
- current commission;
- signature work, flaw, or professional rivalry.

A workshop may be `None` for an itinerant, unemployed, displaced, or home-based craft worker.

### Shopkeeper — Wave B

Special sections:

- shop type;
- ownership or tenancy;
- inventory character;
- suppliers;
- staff;
- customers;
- opening conditions;
- security;
- debts, shortages, protection payments, or licensing problems.

### Merchant or trader — Wave A

Special sections:

- goods or services;
- route or market area;
- ownership structure;
- suppliers;
- clients;
- transport;
- capital level;
- partners or agents;
- current deal;
- legal, scarcity, or competition pressure.

A merchant may be itinerant and therefore have no permanent shop.

### Broker, factor, or commercial agent — Wave B

Special sections:

- represented principal;
- market specialty;
- commission terms;
- records and contracts;
- client network;
- conflicts of interest;
- current negotiation.

### Banker, moneylender, or financier — Wave A

Special sections:

- institution, partnership, employer, or independent practice;
- position;
- accessible capital;
- clients;
- outstanding loans;
- collateral;
- security;
- political protection;
- financial rivals;
- liquidity, fraud, default, or reputation risk.

A banker without an institution must receive an explicit independent, informal, criminal, traveling, or recently displaced finance model.

### Innkeeper or tavern keeper — Wave B

Special sections:

- establishment;
- ownership or management role;
- staff;
- clientele;
- rooms, food, drink, entertainment, or stabling services;
- suppliers;
- regulars;
- local rumors;
- licensing, debt, protection, or sanitation pressure.

### Healer, physician, or apothecary — Wave B

Special sections:

- practice type;
- training;
- clinic, temple, shop, traveling practice, or battlefield role;
- patients;
- medicines and tools;
- legal standing;
- current case;
- ethical conflict, shortage, disease, or payment problem.

### Scribe, scholar, teacher, or accountant — Wave B

Special sections:

- institution or client base;
- field of knowledge;
- literacy and languages;
- documents, records, students, or research;
- patron;
- current work;
- disputed fact, missing document, censorship, debt, or professional rivalry.

### Entertainer or performer — Wave B

Special sections:

- performance type;
- venue or travel circuit;
- troupe or solo status;
- audience;
- reputation;
- signature act;
- patron or manager;
- current booking;
- rivalry, scandal, censorship, or debt.

## 4. Civic Administration and Law

### Government clerk or civil servant — Wave B

Special sections:

- office;
- jurisdiction;
- rank;
- supervisor;
- records or authority handled;
- public access;
- current backlog;
- corruption pressure, political interference, or procedural conflict.

### Inspector, tax officer, or customs officer — Wave B

Special sections:

- legal authority;
- inspection area;
- records;
- team or escort;
- current target;
- bribery exposure;
- evidence, quota, or political pressure.

### Magistrate, judge, or adjudicator — Wave B

Special sections:

- jurisdiction;
- appointment source;
- court or hearing place;
- staff;
- legal philosophy;
- current case;
- conflict of interest, threat, or corruption pressure.

### City guard or gate guard — Wave A

Special sections:

- station, gate, post, or barracks;
- jurisdiction;
- rank;
- shift;
- commander;
- patrol area;
- equipment issue;
- current order;
- local relationships;
- fatigue, corruption, understaffing, or divided loyalty.

### Watchman, constable, or patrol officer — Wave B

Special sections:

- watch district;
- patrol route;
- shift;
- partner or squad;
- arrest authority;
- current investigation or recurring problem;
- reputation with residents;
- evidence, corruption, or political pressure.

### Investigator or detective — Wave B

Special sections:

- employer and jurisdiction;
- methods;
- contacts;
- current case;
- evidence;
- suspect or target;
- personal theory;
- blind spot;
- deadline or interference.

### Bailiff, jailer, or prison officer — Wave B

Special sections:

- court, jail, prison, or escort duty;
- superior;
- prisoners or cases handled;
- access and keys;
- routine;
- bribery, escape, mistreatment, or staffing risk.

## 5. Military and Security

### Militia member — Wave B

Special sections:

- civilian occupation;
- militia unit;
- muster obligation;
- training level;
- issued or personal equipment;
- local commander;
- current emergency or readiness problem.

### Professional soldier — Wave A

Special sections:

- military organization;
- unit;
- rank;
- specialty;
- commander;
- duty station;
- current orders;
- service length;
- pay status;
- equipment issue;
- morale;
- injury, discipline, supply, loyalty, or deployment problem.

### Military specialist — Wave B

Includes scouts, sappers, artillery crews, engineers, medics, marines, archers, cavalry, messengers, and quartermaster personnel.

Special sections extend the soldier profile with specialist tools, qualifications, and mission responsibilities.

### Military officer — Wave B

Special sections:

- commission source;
- command;
- staff role;
- reporting chain;
- operational objective;
- resources controlled;
- political obligations;
- subordinates;
- current decision;
- command, morale, logistics, or loyalty crisis.

### Veteran — Wave B

Special sections:

- former unit;
- campaigns;
- discharge state;
- pension or compensation;
- retained equipment;
- injuries;
- reputation;
- former comrades;
- unresolved wartime obligation.

### Deserter — Wave B

Special sections:

- former unit;
- desertion cause;
- current disguise or hiding place;
- pursuers;
- retained equipment;
- allies;
- guilt, grievance, fear, or intent.

### Mercenary or bodyguard — Wave B

Special sections:

- employer or contract;
- company or independent status;
- rate and payment status;
- assignment;
- rules of engagement;
- equipment;
- loyalty threshold;
- competing offer or contract problem.

### Bounty hunter — Wave B

Special sections:

- target;
- warrant or private contract;
- jurisdiction;
- methods;
- contacts;
- reward;
- deadline;
- rival hunter;
- moral or evidentiary complication.

## 6. Criminal and Outlaw

### Thief, pickpocket, or burglar — Wave A

Special sections:

- method;
- preferred targets;
- operating territory;
- fence or buyer;
- safehouse;
- tools;
- current score;
- known associates;
- heat level;
- debt, blackmail, rival, or law pressure.

A normal place of business is not assumed. A front business may be generated only as an explicit cover.

### Fence — Wave B

Special sections:

- front business or meeting method;
- goods accepted;
- suppliers;
- buyers;
- storage;
- protection;
- pricing method;
- current dangerous item;
- law, gang, or reputation pressure.

### Forger or fraudster — Wave B

Special sections:

- document or fraud specialty;
- clients;
- tools;
- access to seals, records, or identities;
- cover role;
- current commission;
- exposure risk.

### Smuggler or illicit courier — Wave B

Special sections:

- contraband or cargo;
- route;
- transport;
- contacts;
- safehouses;
- corrupt official;
- current shipment;
- inspection, theft, betrayal, or deadline risk.

### Thug, gang member, or enforcer — Wave B

Special sections:

- gang or employer;
- territory;
- superior;
- intimidation method;
- current collection or target;
- reputation;
- loyalty and fear;
- rival or law pressure.

### Crime broker or organized-crime officer — Wave B

Special sections:

- organization;
- rank;
- rackets or responsibilities;
- clients and subordinates;
- legitimate fronts;
- protection network;
- current operation;
- internal rivalry, evidence, or financial pressure.

### Bandit or highway robber — Wave A

Special sections:

- gang;
- leader;
- camp or mobile shelter;
- territory;
- preferred ambush site;
- targets;
- weapons;
- loot distribution;
- current target;
- scarcity, betrayal, pursuit, or leadership problem.

A normal commercial workplace is prohibited unless the profile explicitly generates a cover or former occupation.

### Raider — Wave B

Extends the bandit profile with larger targets, raiding objectives, transport, captives, supply needs, and retreat routes.

### Pirate or privateer — Wave C

Special sections:

- vessel;
- crew role;
- captain;
- legal status;
- hunting area;
- preferred prizes;
- port contacts;
- current target;
- ship condition, mutiny, pursuit, or legitimacy problem.

### Prisoner, captive, debtor, or indentured person — Wave C

Special sections:

- confinement or obligation type;
- authority or owner;
- sentence, debt, contract, or ransom;
- work assignment;
- restrictions;
- allies;
- escape opportunity;
- innocence, guilt, coercion, or legal complication.

Normal unrestricted employment is prohibited.

## 7. Elite, Political, and Courtly

### Noble — Wave A

Special sections:

- title;
- house;
- rank;
- succession position;
- estate or claim;
- income source;
- household;
- retainers;
- obligations;
- political allies and rivals;
- reputation;
- current marriage, inheritance, debt, scandal, or legitimacy problem.

A noble lacking a recognized house, title, or estate relationship must receive an explicit dispossessed, illegitimate, exiled, foreign, newly elevated, or fraudulent explanation.

### Courtier — Wave B

Special sections:

- court;
- patron;
- office or informal function;
- access level;
- faction;
- rivals;
- current influence campaign;
- scandal, favor, debt, or loyalty problem.

### Steward, chamberlain, or estate manager — Wave B

Special sections:

- household or estate served;
- authority;
- staff;
- accounts and resources;
- current project;
- conflict with heir, servants, creditors, tenants, or owner.

### Household knight or retainer — Wave B

Special sections:

- patron;
- oath or contract;
- household role;
- equipment and mount when applicable;
- status among retainers;
- current protective or political duty.

### Heir or diplomatic hostage — Wave C

Special sections:

- succession or treaty significance;
- guardians;
- restrictions;
- education;
- political factions;
- security;
- personal wishes;
- escape, marriage, legitimacy, or manipulation problem.

### Diplomat, ambassador, or envoy — Wave C

Special sections:

- represented authority;
- mission;
- credentials;
- delegation;
- negotiation position;
- protected status;
- intelligence value;
- current treaty, hostage, trade, or crisis problem.

## 8. Religious and Supernatural

### Temple servant or shrine keeper — Wave B

Special sections:

- institution or shrine;
- duties;
- rank;
- patron deity, faith, philosophy, or spirit;
- offerings and visitors;
- sacred access;
- current maintenance, doctrinal, theft, or community problem.

### Priest, cleric, missionary, or chaplain — Wave B

Special sections:

- faith;
- institution;
- rank;
- congregation or assigned population;
- doctrine;
- rites;
- resources;
- current pastoral, political, doctrinal, or supernatural problem.

### Cult member or secret devotee — Wave C

Special sections:

- public identity;
- hidden belief;
- cell or leader;
- initiation level;
- obligation;
- secret gathering place;
- current mission;
- doubt, exposure, sacrifice, or faction pressure.

### Hedge mage, court mage, or magical practitioner — Wave C

Special sections:

- magical tradition;
- training;
- license or legal state;
- patron or clientele;
- workspace;
- focus, tools, or components;
- specialty;
- current research or service;
- accident, taboo, debt, rival, or contamination problem.

### Magical researcher, enchanter, or ritual specialist — Wave C

Extends the practitioner profile with institution, laboratory, project, assistants, funding, materials, safety, and research provenance.

## 9. Mobile, Maritime, and Expedition

### Traveler or pilgrim — Wave B

Special sections:

- origin and destination;
- reason for travel;
- route;
- companions;
- transport;
- supplies;
- documents;
- delay, danger, debt, or lost-person problem.

### Guide — Wave B

Special sections:

- territory;
- expertise;
- clients;
- route knowledge;
- equipment;
- local contacts;
- current expedition;
- hidden hazard, divided loyalty, or false map problem.

### Explorer or surveyor — Wave B

Special sections:

- sponsor;
- objective;
- team;
- route;
- maps and instruments;
- findings;
- current obstacle;
- ownership, secrecy, danger, or funding dispute.

### Sailor or crew member — Wave C

Special sections:

- vessel;
- crew role;
- captain;
- watch or shift;
- port ties;
- pay;
- equipment;
- current voyage;
- maintenance, discipline, morale, cargo, or weather problem.

### Navigator, pilot, or captain — Wave C

Special sections:

- vessel or route responsibility;
- credentials;
- crew;
- charts;
- destination;
- cargo or passengers;
- legal authority;
- current operational decision;
- route, supply, weather, mutiny, or ownership problem.

### Courier or messenger — Wave B

Special sections:

- employer or sender;
- destination;
- message or parcel classification;
- route;
- deadline;
- transport;
- pursuer, interception, loss, or divided-loyalty problem.

### Adventurer, treasure hunter, or salvager — Wave C

Special sections:

- party or solo status;
- specialty;
- sponsor;
- current objective;
- equipment;
- discoveries;
- rivals;
- debt, curse, evidence, ownership, or survival problem.

## 10. Custom Archetype — Wave C

A custom archetype allows a campaign pack or user to define:

- parent archetype;
- label and description;
- required sections;
- prohibited sections;
- substitutions;
- weighted absence rules;
- specialized fields;
- level, wealth, equipment, and relationship assumptions;
- validation rules;
- readable-output templates.

Custom archetypes must extend the shared contract. They may not bypass schema validation or overwrite protected core IDs.

# First-Release Archetype IDs

The first implementation should reserve these stable IDs:

```text
civilian-general
civilian-laborer
commercial-craft-worker
commercial-merchant
commercial-banker
marginalized-beggar
authority-city-guard
military-soldier
criminal-thief
criminal-bandit
elite-noble
```

# Archetype Inheritance Principles

- Subtypes inherit field policies from their parent family.
- A subtype may strengthen an optional field into a required field.
- A subtype may substitute a generic section with a specialized section.
- A subtype may prohibit a parent field when it is structurally inappropriate.
- A subtype may change weighted absence probabilities.
- A subtype may add validation rules and readable-output labels.
- A subtype may not remove canonical metadata, provenance, locks, or diagnostics.
- Every specialized field must have a stable ID and a documented output location.

# Catalogue Exit Condition

This initial catalogue is sufficient for Phase 0 when every Wave A archetype has a clear operational identity and the later families have enough definition to prevent the schema from being designed only around the first eleven types.
