(() => {
  'use strict';

  const STAR_CLASSES = ['G2 V', 'K1 V', 'F8 V', 'K7 V', 'A9 V', 'G8 IV', 'M3 V', 'F5 V'];
  const STAR_DESCRIPTIONS = [
    'stable yellow main-sequence primary',
    'orange main-sequence primary',
    'white-yellow main-sequence primary',
    'cool orange dwarf primary',
    'white main-sequence primary',
    'yellow subgiant primary',
    'red dwarf primary',
    'hot yellow-white main-sequence primary'
  ];
  const BIOSPHERES = [
    'Terran-compatible biosphere with controlled invasive strains',
    'sparse native biosphere maintained beneath Imperial cultivation',
    'aggressive native biosphere under standing quarantine writs',
    'industrialized biosphere with extensive atmospheric remediation',
    'limited microbial biosphere and imported macrofauna',
    'high-biodiversity biosphere partitioned by fortress preserves'
  ];
  const ORBITS = [
    'compact inner worlds with a broad outer gas-giant chain',
    'widely spaced terrestrial worlds followed by two debris belts',
    'dense inner system, one dominant gas giant, and a remote cometary halo',
    'paired habitable-zone worlds with an inclined outer planetary family',
    'single inner terrestrial cluster and a heavy outer ice-giant procession',
    'eccentric planetary arrangement stabilized by a massive fourth-orbit giant'
  ];
  const ATMOSPHERES = [
    ['Nitrogen', 73.2, 'Oxygen', 24.1, 'Argon and trace gases', 2.7],
    ['Nitrogen', 77.5, 'Oxygen', 20.8, 'Carbon dioxide and trace gases', 1.7],
    ['Nitrogen', 68.6, 'Oxygen', 27.2, 'Industrial trace compounds', 4.2],
    ['Nitrogen', 80.1, 'Oxygen', 18.4, 'Argon and noble gases', 1.5],
    ['Oxygen', 22.7, 'Nitrogen', 70.4, 'Sulphur and mineral aerosols', 6.9],
    ['Nitrogen', 74.8, 'Oxygen', 21.3, 'Water vapour and trace gases', 3.9]
  ];
  const TITHES = ['Solutio Tertius', 'Solutio Secundus', 'Exactis Particular', 'Exactis Median', 'Decuma Particular', 'Aptus Non'];
  const FOUNDING_LABELS = ['First Compliance', 'Imperial Founding', 'Charter Ratification', 'Colonial Writ', 'Reclamation Writ', 'Munitorum Settlement Order'];
  const SURVEY_AUTHORITIES = [
    'Navis Cartographica Surveyor-Clade Heliograph IX',
    'Adeptus Mechanicus Explorator Census',
    'Battlefleet Prathus Navigation Office',
    'Cafarron Corridor Chart House',
    'Departmento Munitorum Route Census',
    'Administratum Stellar Register'
  ];

  function hash(text) {
    let value = 2166136261;
    for (const char of String(text || '')) {
      value ^= char.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function rng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(random, values) {
    return values[Math.floor(random() * values.length) % values.length];
  }

  function integer(random, minimum, maximum) {
    return Math.floor(random() * (maximum - minimum + 1)) + minimum;
  }

  function decimal(random, minimum, maximum, places = 1) {
    return (minimum + random() * (maximum - minimum)).toFixed(places);
  }

  function dateStamp(random, minimumMillennium = 31, maximumMillennium = 41) {
    return `${String(integer(random, 1, 999)).padStart(3, '0')}.M${integer(random, minimumMillennium, maximumMillennium)}`;
  }

  function population(random, node) {
    if (node.threat === 'dead') return '0 registered permanent inhabitants';
    if (node.layer === 'exploratory') return 'No census writ issued';
    if (/forge|industrial/i.test(node.kind || '')) return `${decimal(random, 42, 390, 1)} billion registered souls`;
    if (/agri|agricultural/i.test(node.kind || '')) return `${decimal(random, 1.8, 18.5, 1)} billion registered souls`;
    if (/war|fortress|battle/i.test(node.kind || '')) return `${decimal(random, 4.2, 61, 1)} billion registered souls`;
    if (/system/i.test(node.kind || '') || /System$/i.test(node.name || '')) return `${decimal(random, 8, 240, 1)} billion registered souls across the system`;
    return `${decimal(random, 0.4, 96, 1)} billion registered souls`;
  }

  function atmosphere(random, node) {
    if (node.threat === 'dead') return 'Trace atmosphere beneath terminal pressure thresholds';
    if (/station|point|anchorage/i.test(node.kind || '')) return 'Not applicable to void installation; internal atmosphere maintained at Terran naval standard';
    const assay = pick(random, ATMOSPHERES);
    return `${assay[0]} ${assay[1].toFixed(1)}% · ${assay[2]} ${assay[3].toFixed(1)}% · ${assay[4]} ${assay[5].toFixed(1)}%`;
  }

  function worldScale(random, node) {
    if (/moon|satellite/i.test(node.kind || '')) return decimal(random, 0.18, 0.82, 2);
    if (/station|point|anchorage/i.test(node.kind || '')) return 'Void installation';
    return decimal(random, 0.62, 1.48, 2);
  }

  function gravity(random, node) {
    const scale = worldScale(random, node);
    return scale === 'Void installation' ? 'Rotational and gravitic plating standard: 1.00 Terra' : `${decimal(random, 0.58, 1.62, 2)} Terra`;
  }

  function climate(random, node) {
    if (node.threat === 'dead') return `${integer(random, -92, -18)}°C mean surface register`;
    if (/forge|industrial/i.test(node.kind || '')) return `${integer(random, 18, 61)}°C mean habitable-zone register; industrial heat islands excluded`;
    return `${integer(random, -18, 38)}°C mean habitable-zone register`;
  }

  function sealText(value) {
    return String(value || '')
      .replace(/inferred|implied/gi, 'entered under Munitorum writ')
      .replace(/suspected/gi, 'marked for Ordo scrutiny')
      .replace(/probable|likely/gi, 'designated')
      .replace(/provisional/gi, 'held under temporary Navis charter')
      .replace(/candidate/gi, 'holding designation')
      .replace(/unresolved|unknown|uncertain/gi, 'held under restricted seal')
      .replace(/pending/gi, 'under temporary seal')
      .replace(/not established|not proven/gi, 'not entered under the present seal')
      .replace(/not explicit/gi, 'held beyond this access tier')
      .replace(/formal name|proper name/gi, 'Munitorum designation')
      .replace(/source/gi, 'chronicle')
      .replace(/story/gi, 'chronicle')
      .replace(/confidence|evidence/gi, 'seal authority')
      .replace(/provenance/gi, 'record lineage')
      .replace(/story-grounded/gi, 'chronicle-sealed')
      .replace(/user-established/gi, 'entered by sector writ')
      .replace(/map-ready/gi, 'entered in the Navis register')
      .replace(/not recovered/gi, 'not attached under the present seal')
      .replace(/unrecorded/gi, 'sealed from this access tier')
      .replace(/incompletely indexed/gi, 'held under restricted index')
      .replace(/no current battle confirmed/gi, 'no active battle seal is entered')
      .replace(/current recovery status undefined/gi, 'recovery writ remains sealed')
      .replace(/environment unrecorded|no environment supplied/gi, 'environmental register sealed')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function classification(node, records) {
    const record = records.find(item => item.objectType || item.classification);
    const raw = record?.objectType || record?.classification || node.kind || 'Navis chart contact';
    if (/unclassified|candidate|unresolved/i.test(raw)) return 'Restricted Cartographica designation';
    return sealText(raw);
  }

  function profile(node, records = []) {
    const seed = hash(`${node.id}|${node.name}|${records.map(record => record.id).join('|')}`);
    const random = rng(seed);
    const starIndex = integer(random, 0, STAR_CLASSES.length - 1);
    const planetCount = integer(random, 3, 13);
    const gasGiants = integer(random, 1, Math.max(1, Math.min(5, planetCount - 1)));
    const habitableBodies = node.threat === 'dead' ? 0 : integer(random, 1, Math.min(4, planetCount));
    const moonCount = integer(random, Math.max(1, gasGiants * 2), Math.max(8, gasGiants * 11));
    const belts = integer(random, 0, 3);
    const primaryRecord = records[0] || {};
    const isVoidFeature = /station|point|anchorage/i.test(node.kind || '');
    const radius = worldScale(random, node);
    const atmosphereValue = atmosphere(random, node);
    const facts = [
      { group: 'Stellar Assay', label: 'Primary stellar class', value: `${STAR_CLASSES[starIndex]} · ${STAR_DESCRIPTIONS[starIndex]}` },
      { group: 'Stellar Assay', label: 'Primary stellar age', value: `${decimal(random, 1.7, 9.8, 2)} billion standard years` },
      { group: 'Stellar Assay', label: 'System planetary bodies', value: `${planetCount} registered planets · ${gasGiants} gas or ice giants · ${moonCount} registered moons` },
      { group: 'Stellar Assay', label: 'Habitable-zone bodies', value: `${habitableBodies} body${habitableBodies === 1 ? '' : 'ies'} under habitation or biosphere writ` },
      { group: 'Stellar Assay', label: 'Debris architecture', value: belts ? `${belts} charted asteroid or debris belt${belts === 1 ? '' : 's'}` : 'No major debris belt under current chart seal' },
      { group: 'Stellar Assay', label: 'Orbital arrangement', value: pick(random, ORBITS) },
      { group: 'Stellar Assay', label: 'Ecliptic inclination', value: `${decimal(random, 0.4, 18.8, 1)} degrees from the registered Navis plane` },
      { group: 'Stellar Assay', label: 'Heliopause radius', value: `${integer(random, 74, 212)} standard astronomical units` },
      { group: 'Physical Assay', label: 'Atmospheric assay', value: atmosphereValue },
      { group: 'Physical Assay', label: 'Surface gravity', value: gravity(random, node) },
      { group: 'Physical Assay', label: 'World radius', value: radius === 'Void installation' ? radius : `${radius} Terra radii` },
      { group: 'Physical Assay', label: 'Mean thermal register', value: climate(random, node) },
      { group: 'Physical Assay', label: 'Hydrosphere coverage', value: node.threat === 'dead' ? `${integer(random, 0, 9)}%` : `${integer(random, 8, 79)}%` },
      { group: 'Physical Assay', label: 'Local day', value: isVoidFeature ? `${integer(random, 20, 32)}-hour station cycle` : `${decimal(random, 17, 39, 1)} standard hours` },
      { group: 'Physical Assay', label: 'Local year', value: `${decimal(random, 0.31, 4.8, 2)} Terran years` },
      { group: 'Physical Assay', label: 'Magnetosphere', value: `${decimal(random, 0.35, 2.8, 2)} Terra field strength at reference altitude` },
      { group: 'Census and Writ', label: 'Average population register', value: population(random, node) },
      { group: 'Census and Writ', label: pick(random, FOUNDING_LABELS), value: dateStamp(random, 30, 39) },
      { group: 'Census and Writ', label: 'First sanctioned survey', value: `${dateStamp(random, 31, 40)} · ${pick(random, SURVEY_AUTHORITIES)}` },
      { group: 'Census and Writ', label: 'Latest survey renewal', value: `${dateStamp(random, 40, 42)} · seal renewed under Cafarron Corridor authority` },
      { group: 'Census and Writ', label: 'Tithe grade', value: pick(random, TITHES) },
      { group: 'Census and Writ', label: 'Biosphere register', value: node.threat === 'dead' ? 'Ecological tithe suspended under terminal-world writ' : pick(random, BIOSPHERES) },
      { group: 'Census and Writ', label: 'Orbital infrastructure', value: `${integer(random, 1, 18)} major stations · ${integer(random, 0, 7)} sanctioned dockyards · ${integer(random, 4, 96)} registered orbital platforms` },
      { group: 'Navigation', label: 'Astropathic delay', value: `${decimal(random, 0.7, 19.8, 1)} standard hours to Galladin relay under calm conditions` },
      { group: 'Navigation', label: 'Warp translation margin', value: `${decimal(random, 0.8, 7.2, 1)} million kilometres from the inner-system exclusion line` },
      { group: 'Navigation', label: 'Mandeville approach', value: `${integer(random, 2, 11)} sanctioned ingress vectors · ${integer(random, 1, 6)} convoy holding spheres` },
      { group: 'Navigation', label: 'Beacon authority', value: pick(random, ['Navis Cartographica', 'Battlefleet Prathus', 'Adeptus Mechanicus', 'Departmento Munitorum', 'Adeptus Administratum']) },
      { group: 'Strategic Register', label: 'Strategic threat seal', value: sealText(node.threatNote || dataThreatFallback(node)) },
      { group: 'Strategic Register', label: 'Registered classification', value: classification(node, records) },
      { group: 'Strategic Register', label: 'Principal chronicle notation', value: sealText(primaryRecord.keyStory || 'No public chronicle leaf attached under this access seal') }
    ];

    const environment = records.map(record => record.environment).find(Boolean);
    if (environment) facts.push({ group: 'Strategic Register', label: 'Environmental writ', value: sealText(environment) });
    const relationships = records.flatMap(record => record.relationships || []).filter(Boolean).slice(0, 3);
    if (relationships.length) facts.push({ group: 'Strategic Register', label: 'Registered associations', value: sealText(relationships.join(' · ')) });

    return Object.freeze({
      id: node.id,
      name: node.name,
      classification: classification(node, records),
      threat: node.threat,
      seed,
      facts: Object.freeze(facts.map(fact => Object.freeze({ ...fact })))
    });
  }

  function dataThreatFallback(node) {
    if (node.threat === 'standard') return 'No active war seal entered';
    if (node.threat === 'dead') return 'Terminal-world restrictions in force';
    if (node.threat === 'unsurveyed') return 'Explorator access seal in force';
    return 'Strategic seal attached to the Navis contact';
  }

  function factSet(profileValue, cycle = 0, count = 7) {
    const random = rng(profileValue.seed ^ Math.imul(cycle + 1, 0x9E3779B1));
    const pool = [...profileValue.facts];
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }
    const required = ['Atmospheric assay', 'Average population register', 'First sanctioned survey'];
    const founding = profileValue.facts.find(item => FOUNDING_LABELS.includes(item.label));
    const selected = [];
    if (founding) selected.push(founding);
    for (const label of required) {
      const fact = profileValue.facts.find(item => item.label === label);
      if (fact) selected.push(fact);
    }
    for (const fact of pool) {
      if (selected.includes(fact)) continue;
      selected.push(fact);
      if (selected.length >= count) break;
    }
    return selected.slice(0, count);
  }

  window.CafarronSurveyAssayV8 = Object.freeze({ profile, factSet, hash });
})();
