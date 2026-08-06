(() => {
  'use strict';

  const ARCHIVE_VERSION = '0.3.0';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const externalScripts = new Map();

  const SOURCE_OVERRIDES = Object.freeze({
    'system-galadin': [
      { label: "A Harbormaster's Hope", url: 'https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/', status: 'verified' },
      { label: 'Campaign author clarification', url: '', status: 'authorial' }
    ],
    'world-galadin-prime': [
      { label: "A Harbormaster's Hope", url: 'https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/', status: 'verified' },
      { label: 'The Hunger of Gareth Thorne', url: 'https://www.reddit.com/r/EmperorProtects/comments/1fq24wk/the_hunger_of_gareth_thorne/', status: 'verified' },
      { label: 'Campaign author clarification', url: '', status: 'authorial' }
    ],
    'place-yeldons-throne': [
      { label: "A Harbormaster's Hope", url: 'https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/', status: 'verified' },
      { label: 'The Hunger of Gareth Thorne', url: 'https://www.reddit.com/r/EmperorProtects/comments/1fq24wk/the_hunger_of_gareth_thorne/', status: 'verified' },
      { label: 'Campaign author clarification', url: '', status: 'authorial' }
    ],
    'world-sullivan': [
      { label: 'Sultry Temptations', url: 'https://www.reddit.com/r/EmperorProtects/comments/1m370da/sultry_temptations/', status: 'verified' }
    ],
    'world-effesatran': [
      { label: 'Zarata Karanas', url: 'https://www.reddit.com/r/EmperorProtects/comments/1m346yt/zarata_karanas/', status: 'verified' }
    ],
    'reference-cascordian': [
      { label: 'A Questing Demon', url: 'https://www.reddit.com/r/EmperorProtects/comments/1pdooqe/a_questing_demon/', status: 'verified' }
    ]
  });

  const AUTHORIAL_RECORDS = Object.freeze([
    {
      id: 'system-thesk-ward',
      name: 'Thesk Ward',
      category: 'system',
      objectType: 'Frontier system or administrative ward',
      provenance: 'user-established',
      confidence: 'authoritative name; details pending',
      status: 'Frontier area near Pilcher 7',
      classification: 'Frontier system or ward',
      summary: 'A named frontier area used as a reference point near Pilcher 7. Its complete world inventory and Imperial institutions remain to be written.',
      map: { x: null, y: null, z: null, ready: false },
      sources: [{ label: 'Campaign author directive', url: '', status: 'authorial' }],
      tags: ['system', 'frontier', 'thesk ward', 'pilcher vicinity']
    },
    {
      id: 'system-core-anchorage-pending',
      name: 'Imperial Fleet Anchorage System',
      category: 'system',
      objectType: 'Star system; proper name pending',
      provenance: 'user-established',
      confidence: 'authoritative function; name pending',
      status: 'Core-system addition',
      classification: 'Imperial naval anchorage and moorage system',
      summary: 'One of the two required core systems between Galadin Prime and Pelzane. The Imperial fleet uses it for anchorage and moorage.',
      imperialPresence: 'Imperial fleet anchorage function is author-established. Permanent fleet names and formations remain unspecified.',
      map: { x: null, y: null, z: null, ready: false },
      sources: [{ label: 'Campaign author directive', url: '', status: 'authorial' }],
      tags: ['system', 'naval anchorage', 'moorage', 'core route', 'name pending']
    },
    {
      id: 'system-core-forge-pending',
      name: 'Core Forge System',
      category: 'system',
      objectType: 'Star system; proper name pending',
      provenance: 'user-established',
      confidence: 'authoritative function; name pending',
      status: 'Core-system addition',
      classification: 'Forge World system',
      summary: 'One of the two required core systems between Galadin Prime and Pelzane. Its principal settled world is a Forge World.',
      map: { x: null, y: null, z: null, ready: false },
      sources: [{ label: 'Campaign author directive', url: '', status: 'authorial' }],
      tags: ['system', 'forge world', 'core route', 'name pending']
    },
    ...[1, 2, 3].map(index => ({
      id: `world-pilcher-fringe-production-${index}`,
      name: `Pilcher–Thesk Fringe Production World ${index}`,
      category: 'world',
      objectType: 'Planet; proper name pending',
      provenance: 'user-established',
      confidence: 'authoritative function; name pending',
      status: 'Fringe production world',
      classification: 'Production world; exact industrial specialization pending',
      summary: 'One of at least three required production worlds in the Pilcher 7 and Thesk Ward frontier area.',
      map: { x: null, y: null, z: null, ready: false },
      sources: [{ label: 'Campaign author directive', url: '', status: 'authorial' }],
      tags: ['planet', 'production world', 'pilcher', 'thesk ward', 'name pending']
    }))
  ]);

  const MAP_NODES = Object.freeze([
    { id: 'node-segrea', name: 'Segrea', position: [-46, -28, -8], recordIds: ['world-segrea'], kind: 'world-system', status: 'charted', provenance: 'campaign-layout', scale: 0.9 },
    { id: 'node-new-presidio', name: 'New Presidio', position: [-34, -10, -2], recordIds: ['world-new-presidio'], kind: 'capital-system', status: 'charted', provenance: 'campaign-layout', scale: 1.05 },
    { id: 'node-presteria', name: 'Presteria IV', position: [-35, 18, 8], recordIds: ['world-presteria-iv'], kind: 'ecclesiastical-system', status: 'charted', provenance: 'campaign-layout', scale: 1.0 },
    { id: 'node-galadin', name: 'Galadin System', position: [-20, 0, 0], recordIds: ['system-galadin', 'world-galadin-prime', 'place-yeldons-throne'], kind: 'core-system', status: 'charted', provenance: 'user-established', scale: 1.25 },
    { id: 'node-core-anchorage', name: 'Imperial Fleet Anchorage System', position: [-10, -2, 3], recordIds: ['system-core-anchorage-pending'], kind: 'anchorage-system', status: 'name pending', provenance: 'user-established', scale: 1.15 },
    { id: 'node-core-forge', name: 'Core Forge System', position: [0, -4, -1], recordIds: ['system-core-forge-pending'], kind: 'forge-system', status: 'name pending', provenance: 'user-established', scale: 1.15 },
    { id: 'node-pelzane', name: 'Pelzane', position: [11, -8, -2], recordIds: ['world-pelzane'], kind: 'hazard-system', status: 'dying world', provenance: 'campaign-layout', scale: 1.0 },
    { id: 'node-gazeras', name: 'Gazeras System', position: [-7, 20, 5], recordIds: ['system-gazeras', 'world-gazeras-prime', 'moon-prescia'], kind: 'agricultural-system', status: 'charted', provenance: 'campaign-layout', scale: 1.0 },
    { id: 'node-sullivan', name: 'Sullivan', position: [12, 25, 10], recordIds: ['world-sullivan'], kind: 'war-system', status: 'militarized', provenance: 'campaign-layout', scale: 1.0 },
    { id: 'node-reaalspekcs', name: 'ReaalSpekcs 7', position: [-13, -27, -9], recordIds: ['world-reaalspekcs-7'], kind: 'hazard-system', status: 'hazardous', provenance: 'campaign-layout', scale: 0.95 },
    { id: 'node-kertora', name: 'Kertora Semoises System', position: [28, -22, -10], recordIds: ['system-kertora-semoises', 'world-kertora-semoises-prime', 'moon-kertora-semoises-v', 'region-syndrione-front'], kind: 'extractive-system', status: 'conflict-adjacent', provenance: 'campaign-layout', scale: 1.05 },
    { id: 'node-parban', name: 'Parban', position: [44, -28, -7], recordIds: ['world-parban'], kind: 'agricultural-system', status: 'prior combat theatre', provenance: 'campaign-layout', scale: 0.95 },
    { id: 'node-valikor', name: 'Valikor System', position: [38, 4, 4], recordIds: ['system-valikor', 'world-valikor-secundus', 'moon-iterum', 'region-krellan-chain', 'region-subsector-tau-9'], kind: 'forge-system', status: 'devastated', provenance: 'campaign-layout', scale: 1.15 },
    { id: 'node-jhasyiapan', name: 'Jhasyi’apan', position: [58, -12, 15], recordIds: ['world-jhasyiapan'], kind: 'frontier-system', status: 'frontier', provenance: 'campaign-layout', scale: 1.0 },
    { id: 'node-havenvard', name: 'Havenvard System', position: [55, 22, 0], recordIds: ['system-havenvard'], kind: 'system', status: 'member worlds pending', provenance: 'campaign-layout', scale: 0.9 },
    { id: 'node-thesk-ward', name: 'Thesk Ward', position: [67, 4, 8], recordIds: ['system-thesk-ward'], kind: 'frontier-system', status: 'details pending', provenance: 'user-established', scale: 1.0 },
    { id: 'node-production-1', name: 'Pilcher–Thesk Production World 1', position: [71, -3, 5], recordIds: ['world-pilcher-fringe-production-1'], kind: 'production-system', status: 'name pending', provenance: 'user-established', scale: 0.9 },
    { id: 'node-production-2', name: 'Pilcher–Thesk Production World 2', position: [78, 18, 9], recordIds: ['world-pilcher-fringe-production-2'], kind: 'production-system', status: 'name pending', provenance: 'user-established', scale: 0.9 },
    { id: 'node-pilcher', name: 'Pilcher 7', position: [83, 8, 14], recordIds: ['world-pilcher-7'], kind: 'frontier-system', status: 'active crisis', provenance: 'campaign-layout', scale: 1.15 },
    { id: 'node-production-3', name: 'Pilcher–Thesk Production World 3', position: [91, 0, 16], recordIds: ['world-pilcher-fringe-production-3'], kind: 'production-system', status: 'name pending', provenance: 'user-established', scale: 0.9 },
    { id: 'node-effesatran', name: 'Effesatran', position: [73, 30, 22], recordIds: ['world-effesatran'], kind: 'sensitive-system', status: 'sensitive approach', provenance: 'campaign-layout', scale: 1.1 }
  ]);

  const MAP_ROUTES = Object.freeze([
    { id: 'route-core-direct', name: 'Galadin–Pelzane Direct Passage', nodeIds: ['node-galadin', 'node-pelzane'], kind: 'direct passage', status: 'provisional charting', provenance: 'campaign-layout' },
    { id: 'route-core-optional', name: 'Optional Anchorage–Forge Passage', nodeIds: ['node-galadin', 'node-core-anchorage', 'node-core-forge', 'node-pelzane'], kind: 'optional transit', status: 'author-required', provenance: 'user-established' },
    { id: 'route-central-east', name: 'Central–Eastern Survey Connection', nodeIds: ['node-pelzane', 'node-valikor', 'node-thesk-ward', 'node-pilcher'], kind: 'survey connection', status: 'provisional', provenance: 'campaign-layout' },
    { id: 'route-pilcher-fringe', name: 'Pilcher–Thesk Production Loop', nodeIds: ['node-thesk-ward', 'node-production-1', 'node-production-2', 'node-pilcher', 'node-production-3', 'node-thesk-ward'], kind: 'local freight loop', status: 'provisional', provenance: 'user-established' },
    { id: 'route-syndrione', name: 'Syndrione Campaign Association', nodeIds: ['node-kertora', 'node-parban', 'node-jhasyiapan'], kind: 'campaign association', status: 'not a confirmed trade lane', provenance: 'inferred' },
    { id: 'route-northern', name: 'Northern Survey Connection', nodeIds: ['node-presteria', 'node-galadin', 'node-gazeras', 'node-sullivan', 'node-havenvard'], kind: 'survey connection', status: 'provisional', provenance: 'campaign-layout' },
    { id: 'route-southwest', name: 'Southwestern Survey Connection', nodeIds: ['node-segrea', 'node-new-presidio', 'node-galadin'], kind: 'survey connection', status: 'provisional', provenance: 'campaign-layout' }
  ]);

  const MAP_HAZARDS = Object.freeze([
    { id: 'hazard-pilcher', name: 'Pilcher Evacuation Crisis', center: [83, 8, 14], radii: [9, 7, 9], recordIds: ['world-pilcher-7'], status: 'active', provenance: 'story-grounded' },
    { id: 'hazard-valikor', name: 'Valikor Devastation Zone', center: [38, 4, 4], radii: [8, 6, 8], recordIds: ['world-valikor-secundus', 'moon-iterum'], status: 'devastated', provenance: 'story-grounded' },
    { id: 'hazard-effesatran', name: 'Effesatran Sensitive Approach', center: [73, 30, 22], radii: [7, 7, 8], recordIds: ['world-effesatran'], status: 'restricted approach', provenance: 'story-grounded' },
    { id: 'hazard-reaalspekcs', name: 'ReaalSpekcs Dead-Hive Hazard', center: [-13, -27, -9], radii: [6, 5, 6], recordIds: ['world-reaalspekcs-7'], status: 'hazardous', provenance: 'story-grounded' },
    { id: 'hazard-pelzane', name: 'Pelzane Planetary Decline', center: [11, -8, -2], radii: [5, 5, 5], recordIds: ['world-pelzane'], status: 'deteriorating', provenance: 'story-grounded' },
    { id: 'hazard-syndrione', name: 'Syndrione Front', center: [34, -23, -9], radii: [15, 8, 8], recordIds: ['region-syndrione-front', 'world-kertora-semoises-prime', 'moon-kertora-semoises-v', 'world-parban'], status: 'campaign front', provenance: 'story-grounded' }
  ]);

  const CATEGORY_LABELS = Object.freeze({
    all: 'All Records',
    world: 'Worlds & Moons',
    system: 'Systems',
    region: 'Regions',
    place: 'Named Places',
    'imperial-force': 'Imperial Forces',
    unresolved: 'Unresolved'
  });

  const state = {
    initialized: false,
    data: null,
    activeTab: 'archive',
    activeCategory: 'all',
    query: '',
    mapController: null,
    mapPromise: null
  };

  function isGenericListingSource(source) {
    const url = String(source?.url || '').toLowerCase();
    const label = String(source?.label || '').toLowerCase();
    return url.includes('/r/emperorprotects/new') ||
      url.includes('new.json') ||
      label.includes('older emperor protects story corpus') ||
      label.includes('imperial guard regiment sequence');
  }

  function cleanSources(record) {
    if (SOURCE_OVERRIDES[record.id]) return SOURCE_OVERRIDES[record.id].map(source => ({ ...source }));
    const cleaned = [];
    for (const source of record.sources || []) {
      if (isGenericListingSource(source)) {
        if (!cleaned.some(item => item.status === 'unresolved')) {
          cleaned.push({
            label: 'Direct story permalink not yet recovered',
            url: '',
            status: 'unresolved',
            note: 'This record is retained as an indexed lead, not as source-complete lore.'
          });
        }
        continue;
      }
      cleaned.push({ ...source, status: source.status || (source.url ? 'verified' : 'authorial') });
    }
    return cleaned;
  }

  function composeData(source) {
    if (!source?.records) throw new Error('The Cafarron Corridor archive dataset is unavailable.');
    const records = source.records.map(record => ({ ...record, sources: cleanSources(record) }));
    const ids = new Set(records.map(record => record.id));
    for (const record of AUTHORIAL_RECORDS) {
      if (!ids.has(record.id)) records.push({ ...record, sources: cleanSources(record) });
    }
    return Object.freeze({
      ...source,
      version: ARCHIVE_VERSION,
      scopeNote: 'Searchable campaign-lore archive and Navis Cartographica sector survey. Coordinates are relative campaign plotting coordinates, not official astronomical measurements. Generic subreddit listing pages are never presented as source citations.',
      coordinateSystem: {
        name: 'Cafarron Corridor Navis Survey Grid',
        units: 'relative campaign plotting units',
        authority: 'campaign cartographic layout',
        note: 'Coordinates establish usable three-dimensional relationships and may be revised when additional stories define exact placement.'
      },
      records: Object.freeze(records),
      mapNodes: MAP_NODES,
      routes: MAP_ROUTES,
      hazards: MAP_HAZARDS
    });
  }

  function ensureStyles() {
    if (document.getElementById('warhammer-40k-workspace-styles')) return;
    const style = document.createElement('style');
    style.id = 'warhammer-40k-workspace-styles';
    style.textContent = `
      body.warhammer-archive-active {
        --wh-ink: #e8dcc0;
        --wh-muted: #aaa08a;
        --wh-brass: #b49142;
        --wh-brass-bright: #dcc27b;
        --wh-red: #8f2d2d;
        --wh-line: rgba(198, 171, 104, .42);
        --wh-panel: rgba(15, 18, 17, .96);
        background: radial-gradient(circle at 50% -20%, rgba(114, 87, 39, .24), transparent 44rem), #070909;
        color: var(--wh-ink);
      }
      body.warhammer-archive-active > .site-header,
      body.warhammer-archive-active > .site-footer { display: none !important; }
      body.warhammer-archive-active main { max-width: none; margin: 0; padding: 0; }
      body.warhammer-archive-active #warhammer-40k { min-height: 100vh; padding: 0; }
      #warhammer-40k .wh-workspace { min-height: 100vh; color: var(--wh-ink); font-family: Georgia, 'Times New Roman', serif; background: repeating-linear-gradient(0deg, rgba(216,185,105,.025) 0 1px, transparent 1px 4px), linear-gradient(rgba(8,10,10,.9), rgba(5,7,7,.98)); }
      #warhammer-40k .wh-command-header { position: sticky; top: 0; z-index: 40; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 1rem; padding: .8rem clamp(.75rem,2vw,2rem); border-bottom: 1px solid var(--wh-line); background: linear-gradient(180deg, rgba(31,33,29,.99), rgba(10,13,12,.99)); box-shadow: 0 .7rem 1.8rem rgba(0,0,0,.48); }
      #warhammer-40k .wh-command-title { display: flex; align-items: center; gap: .9rem; min-width: 0; }
      #warhammer-40k .wh-sigil { display: grid; place-items: center; width: 3rem; height: 3rem; flex: 0 0 auto; border: 1px solid var(--wh-brass); clip-path: polygon(50% 0,88% 20%,100% 65%,72% 100%,28% 100%,0 65%,12% 20%); background: radial-gradient(circle, rgba(215,187,115,.22), rgba(143,45,45,.2)); color: var(--wh-brass-bright); font: 900 1.1rem/1 ui-monospace, monospace; }
      #warhammer-40k .wh-command-title p, #warhammer-40k .wh-command-title h1 { margin: 0; }
      #warhammer-40k .wh-command-title p { color: var(--wh-brass-bright); font: 700 .7rem/1.2 ui-monospace, monospace; letter-spacing: .17em; text-transform: uppercase; }
      #warhammer-40k .wh-command-title h1 { margin-top: .15rem; font-size: clamp(1.05rem,2.3vw,1.65rem); letter-spacing: .055em; text-transform: uppercase; }
      #warhammer-40k .wh-command-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
      #warhammer-40k .wh-button, #warhammer-40k .wh-tab, #warhammer-40k .wh-filter { appearance: none; min-height: 2.7rem; border: 1px solid var(--wh-line); border-radius: .16rem; padding: .58rem .82rem; background: linear-gradient(180deg,#292a24,#121513); color: var(--wh-ink); font: 800 .76rem/1.2 ui-monospace, monospace; letter-spacing: .055em; text-transform: uppercase; cursor: pointer; text-decoration: none; }
      #warhammer-40k .wh-button:hover, #warhammer-40k .wh-tab:hover, #warhammer-40k .wh-filter:hover { border-color: var(--wh-brass-bright); }
      #warhammer-40k .wh-button:focus-visible, #warhammer-40k .wh-tab:focus-visible, #warhammer-40k .wh-filter:focus-visible, #warhammer-40k input:focus-visible, #warhammer-40k select:focus-visible { outline: 2px solid var(--wh-brass-bright); outline-offset: 2px; }
      #warhammer-40k .wh-button.primary { background: linear-gradient(180deg,#7c3430,#3d1515); border-color: rgba(220,194,123,.72); }
      #warhammer-40k .wh-tab[aria-selected='true'], #warhammer-40k .wh-filter[aria-pressed='true'] { background: linear-gradient(180deg,#80672f,#392f19); border-color: var(--wh-brass-bright); color: #fff5d6; }
      #warhammer-40k .wh-tabbar { display: flex; flex-wrap: wrap; gap: .55rem; padding: .75rem clamp(.75rem,2vw,2rem); border-bottom: 1px solid var(--wh-line); background: rgba(14,17,16,.95); }
      #warhammer-40k .wh-shell { width: min(100%, 112rem); margin: 0 auto; padding: clamp(.8rem,2vw,1.6rem); }
      #warhammer-40k .wh-panel[hidden] { display: none !important; }
      #warhammer-40k .wh-hero { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(17rem,.55fr); gap: 1rem; margin-bottom: 1rem; }
      #warhammer-40k .wh-hero-copy, #warhammer-40k .wh-docket, #warhammer-40k .wh-controls, #warhammer-40k .wh-record, #warhammer-40k .wh-map-details, #warhammer-40k .wh-map-card { border: 1px solid var(--wh-line); background: var(--wh-panel); box-shadow: inset 0 0 0 1px rgba(255,255,255,.025); }
      #warhammer-40k .wh-hero-copy, #warhammer-40k .wh-docket { padding: 1rem; }
      #warhammer-40k .wh-kicker { margin: 0 0 .4rem; color: var(--wh-brass-bright); font: 800 .72rem/1.3 ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
      #warhammer-40k .wh-hero h2 { margin: 0 0 .55rem; font-size: clamp(1.55rem,3vw,2.6rem); text-transform: uppercase; letter-spacing: .04em; }
      #warhammer-40k .wh-hero p { max-width: 75ch; }
      #warhammer-40k .wh-docket dl { display: grid; grid-template-columns: auto 1fr; gap: .35rem .7rem; margin: 0; }
      #warhammer-40k .wh-docket dt { color: var(--wh-brass-bright); font-weight: 800; }
      #warhammer-40k .wh-docket dd { margin: 0; }
      #warhammer-40k .wh-controls { display: grid; gap: .8rem; padding: .9rem; margin-bottom: 1rem; }
      #warhammer-40k .wh-search-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: .7rem; align-items: end; }
      #warhammer-40k label { display: grid; gap: .35rem; font-weight: 800; }
      #warhammer-40k input[type='search'], #warhammer-40k select { width: 100%; min-height: 2.8rem; border: 1px solid var(--wh-line); border-radius: .14rem; padding: .65rem .75rem; background: #090c0c; color: var(--wh-ink); font-size: 1rem; }
      #warhammer-40k .wh-filter-row, #warhammer-40k .wh-toolbar, #warhammer-40k .wh-layer-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
      #warhammer-40k .wh-status { color: var(--wh-muted); font: 700 .78rem/1.45 ui-monospace, monospace; }
      #warhammer-40k .wh-record-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,23rem),1fr)); gap: .9rem; }
      #warhammer-40k .wh-record { display: grid; align-content: start; gap: .65rem; padding: .95rem; }
      #warhammer-40k .wh-record h3 { margin: 0; font-size: 1.2rem; }
      #warhammer-40k .wh-meta { display: flex; flex-wrap: wrap; gap: .35rem; }
      #warhammer-40k .wh-badge { display: inline-flex; align-items: center; min-height: 1.75rem; padding: .2rem .48rem; border: 1px solid var(--wh-line); color: var(--wh-brass-bright); background: rgba(180,145,66,.08); font: 800 .68rem/1 ui-monospace, monospace; letter-spacing: .04em; text-transform: uppercase; }
      #warhammer-40k .wh-badge.warning { color: #f0ae8e; border-color: rgba(200,82,67,.65); background: rgba(143,45,45,.14); }
      #warhammer-40k .wh-definition { display: grid; grid-template-columns: minmax(7.5rem,.42fr) minmax(0,1fr); gap: .35rem .65rem; margin: 0; }
      #warhammer-40k .wh-definition dt { color: var(--wh-brass-bright); font-weight: 800; }
      #warhammer-40k .wh-definition dd { margin: 0; }
      #warhammer-40k .wh-source-list { margin: 0; padding-left: 1.2rem; }
      #warhammer-40k .wh-source-pending { color: #f0ae8e; font-style: italic; }
      #warhammer-40k a { color: #e2c77e; }
      #warhammer-40k .wh-map-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(19rem,25rem); gap: 1rem; align-items: start; }
      #warhammer-40k .wh-map-card { min-width: 0; overflow: hidden; }
      #warhammer-40k .wh-map-toolbar { display: grid; gap: .7rem; padding: .8rem; border-bottom: 1px solid var(--wh-line); background: rgba(17,20,18,.96); }
      #warhammer-40k .wh-layer-row label { display: inline-flex; flex-direction: row; align-items: center; gap: .4rem; min-height: 2.3rem; font: 800 .75rem/1.2 ui-monospace, monospace; letter-spacing: .04em; text-transform: uppercase; }
      #warhammer-40k .wh-layer-row input { width: 1.1rem; height: 1.1rem; accent-color: var(--wh-brass); }
      #warhammer-40k .wh-map-stage { position: relative; min-height: 38rem; background: radial-gradient(circle at center,rgba(51,62,56,.25),transparent 62%),#030505; touch-action: none; }
      #warhammer-40k .wh-map-stage canvas { display: block; width: 100%; height: 100%; }
      #warhammer-40k .wh-map-labels { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
      #warhammer-40k .wh-map-label { position: absolute; z-index: 4; max-width: 12rem; transform: translate(-50%,-50%); border: 1px solid rgba(220,194,123,.52); border-radius: .12rem; padding: .28rem .42rem; background: rgba(6,8,8,.86); color: #f0e3bf; font: 700 .68rem/1.2 ui-monospace, monospace; text-align: center; pointer-events: auto; cursor: pointer; }
      #warhammer-40k .wh-map-label[aria-current='true'] { color: #fff; border-color: #e1bd61; box-shadow: 0 0 .8rem rgba(225,189,97,.35); }
      #warhammer-40k .wh-map-loading { position: absolute; inset: 0; display: grid; place-items: center; padding: 2rem; color: var(--wh-brass-bright); font: 800 .8rem/1.5 ui-monospace, monospace; letter-spacing: .08em; text-align: center; text-transform: uppercase; background: rgba(3,5,5,.88); }
      #warhammer-40k .wh-map-details { position: sticky; top: 5.7rem; display: grid; gap: .8rem; padding: 1rem; max-height: calc(100vh - 7rem); overflow: auto; }
      #warhammer-40k .wh-map-details h3, #warhammer-40k .wh-map-details h4 { margin: 0; }
      #warhammer-40k .wh-linked-record { padding-top: .75rem; border-top: 1px solid var(--wh-line); }
      #warhammer-40k .wh-map-legend { display: grid; gap: .35rem; padding-top: .75rem; border-top: 1px solid var(--wh-line); }
      #warhammer-40k .wh-legend-item { display: grid; grid-template-columns: 1rem 1fr; gap: .5rem; align-items: center; color: var(--wh-muted); font-size: .88rem; }
      #warhammer-40k .wh-swatch { width: .8rem; height: .8rem; border-radius: 50%; border: 1px solid rgba(255,255,255,.35); }
      #warhammer-40k .wh-empty { padding: 2rem; border: 1px dashed var(--wh-line); text-align: center; }
      @media (max-width: 900px) {
        #warhammer-40k .wh-command-header { grid-template-columns: 1fr; }
        #warhammer-40k .wh-command-actions { justify-content: flex-start; }
        #warhammer-40k .wh-hero, #warhammer-40k .wh-map-grid { grid-template-columns: 1fr; }
        #warhammer-40k .wh-map-details { position: static; max-height: none; }
      }
      @media (max-width: 650px) {
        #warhammer-40k .wh-search-row { grid-template-columns: 1fr; }
        #warhammer-40k .wh-definition { grid-template-columns: 1fr; }
        #warhammer-40k .wh-map-stage { min-height: 30rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeButton(text, className = 'wh-button') {
    const button = makeElement('button', className, text);
    button.type = 'button';
    return button;
  }

  function makeBadge(text, warning = false) {
    return makeElement('span', `wh-badge${warning ? ' warning' : ''}`, text);
  }

  function appendDefinition(list, label, value) {
    if (!value || (Array.isArray(value) && !value.length)) return;
    list.append(makeElement('dt', '', label), makeElement('dd', '', Array.isArray(value) ? value.join(' ') : String(value)));
  }

  function searchText(record) {
    return [record.name, ...(record.aliases || []), record.category, record.objectType, record.provenance, record.status, record.classification, record.summary, record.conflict, record.imperialPresence, ...(record.relationships || []), ...(record.tags || []), ...(record.sources || []).map(source => source.label)].filter(Boolean).join(' ').toLowerCase();
  }

  function visibleRecords() {
    const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    return state.data.records.filter(record => {
      if (state.activeCategory !== 'all' && record.category !== state.activeCategory) return false;
      if (!terms.length) return true;
      const text = searchText(record);
      return terms.every(term => text.includes(term));
    });
  }

  function buildSourceList(record) {
    if (!record.sources?.length) return null;
    const wrap = document.createDocumentFragment();
    wrap.append(makeElement('strong', '', 'Sources'));
    const list = makeElement('ul', 'wh-source-list');
    for (const source of record.sources) {
      const item = document.createElement('li');
      if (source.url && source.status === 'verified') {
        const link = makeElement('a', '', source.label);
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        item.append(link);
      } else if (source.status === 'unresolved') {
        item.className = 'wh-source-pending';
        item.textContent = source.label;
      } else {
        item.textContent = source.label;
      }
      list.append(item);
    }
    wrap.append(list);
    return wrap;
  }

  function recordCard(record) {
    const article = makeElement('article', 'wh-record');
    article.dataset.recordId = record.id;
    const meta = makeElement('div', 'wh-meta');
    meta.append(
      makeBadge(CATEGORY_LABELS[record.category] || record.category),
      makeBadge(record.provenance || 'unspecified'),
      makeBadge(record.confidence || 'unspecified'),
      ...(record.sources?.some(source => source.status === 'unresolved') ? [makeBadge('source pending', true)] : [])
    );
    const details = makeElement('dl', 'wh-definition');
    appendDefinition(details, 'Aliases', record.aliases);
    appendDefinition(details, 'Type', record.objectType);
    appendDefinition(details, 'Status', record.status);
    appendDefinition(details, 'Classification', record.classification);
    appendDefinition(details, 'Relationships', record.relationships);
    appendDefinition(details, 'Current conflict', record.conflict);
    appendDefinition(details, 'Imperial presence', record.imperialPresence);
    article.append(meta, makeElement('h3', '', record.name), makeElement('p', '', record.summary), details);
    const sources = buildSourceList(record);
    if (sources) article.append(sources);
    return article;
  }

  function renderArchive() {
    const grid = document.getElementById('wh-record-grid');
    const summary = document.getElementById('wh-record-summary');
    if (!grid) return;
    const records = visibleRecords();
    grid.replaceChildren();
    if (!records.length) grid.append(makeElement('div', 'wh-empty', 'No archive records match the current query and category filter.'));
    else records.forEach(record => grid.append(recordCard(record)));
    if (summary) {
      const pending = records.filter(record => record.sources?.some(source => source.status === 'unresolved')).length;
      summary.textContent = `${records.length} of ${state.data.records.length} records shown · ${pending} displayed record${pending === 1 ? '' : 's'} awaiting direct story permalinks · archive ${state.data.version}`;
    }
  }

  function exportArchive() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cafarron-corridor-archive-${state.data.version}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function buildArchivePanel() {
    const panel = makeElement('section', 'wh-panel');
    panel.id = 'wh-archive-panel';
    panel.dataset.workspacePanel = 'archive';

    const controls = makeElement('section', 'wh-controls');
    const searchRow = makeElement('div', 'wh-search-row');
    const label = makeElement('label', '', 'Search the Cafarron Corridor archive');
    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'wh-archive-search';
    input.placeholder = 'Search worlds, systems, conflicts, regiments, aliases, and exact source stories…';
    label.append(input);
    const exportButton = makeButton('Export Archive JSON');
    exportButton.addEventListener('click', exportArchive);
    searchRow.append(label, exportButton);

    const filters = makeElement('div', 'wh-filter-row');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Archive categories');
    for (const [category, labelText] of Object.entries(CATEGORY_LABELS)) {
      const button = makeButton(labelText, 'wh-filter');
      button.dataset.category = category;
      button.setAttribute('aria-pressed', category === 'all' ? 'true' : 'false');
      filters.append(button);
    }
    const summary = makeElement('div', 'wh-status');
    summary.id = 'wh-record-summary';
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    controls.append(searchRow, filters, summary);

    const grid = makeElement('div', 'wh-record-grid');
    grid.id = 'wh-record-grid';
    panel.append(controls, grid);

    input.addEventListener('input', () => {
      state.query = input.value.trim();
      renderArchive();
    });
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.activeCategory = button.dataset.category || 'all';
      filters.querySelectorAll('[data-category]').forEach(candidate => candidate.setAttribute('aria-pressed', candidate === button ? 'true' : 'false'));
      renderArchive();
    });
    return panel;
  }

  function buildMapDetailsShell() {
    const details = makeElement('aside', 'wh-map-details');
    details.id = 'wh-map-details';
    details.setAttribute('aria-live', 'polite');
    details.append(
      makeElement('p', 'wh-kicker', 'Navis Cartographica selection'),
      makeElement('h3', '', 'Select a system node'),
      makeElement('p', '', 'Click a plotted node or choose one from the system register to open its linked archival records.'),
      buildLegend()
    );
    return details;
  }

  function buildLegend() {
    const legend = makeElement('section', 'wh-map-legend');
    legend.append(makeElement('h4', '', 'Survey legend'));
    const items = [
      ['#d7b35f', 'Core or capital system'],
      ['#cb6a45', 'Forge or extractive system'],
      ['#78a6d2', 'Fleet anchorage or naval feature'],
      ['#83a66f', 'Agricultural or production world'],
      ['#b64b4b', 'War or active conflict world'],
      ['#8d78c5', 'Frontier or sensitive system'],
      ['#8d8d88', 'Hazardous or degraded world']
    ];
    for (const [color, label] of items) {
      const item = makeElement('div', 'wh-legend-item');
      const swatch = makeElement('span', 'wh-swatch');
      swatch.style.background = color;
      item.append(swatch, makeElement('span', '', label));
      legend.append(item);
    }
    legend.append(makeElement('p', 'wh-status', 'Solid and dashed lines are survey plotting connections. Only the optional Galadin–anchorage–Forge–Pelzane path is author-established as a required route structure.'));
    return legend;
  }

  function buildMapPanel() {
    const panel = makeElement('section', 'wh-panel');
    panel.id = 'wh-map-panel';
    panel.dataset.workspacePanel = 'map';
    panel.hidden = true;

    const grid = makeElement('div', 'wh-map-grid');
    const card = makeElement('section', 'wh-map-card');
    const toolbar = makeElement('div', 'wh-map-toolbar');
    const selectionRow = makeElement('div', 'wh-search-row');
    const selectLabel = makeElement('label', '', 'System register');
    const select = document.createElement('select');
    select.id = 'wh-map-node-select';
    select.append(new Option('Select a plotted system or world…', ''));
    MAP_NODES.forEach(node => select.append(new Option(node.name, node.id)));
    selectLabel.append(select);
    const focusButton = makeButton('Focus Selection');
    focusButton.id = 'wh-map-focus';
    focusButton.disabled = true;
    selectionRow.append(selectLabel, focusButton);

    const toolRow = makeElement('div', 'wh-toolbar');
    const reset = makeButton('Reset Survey View');
    reset.id = 'wh-map-reset';
    const top = makeButton('Top Projection');
    top.id = 'wh-map-top';
    toolRow.append(reset, top);

    const layers = makeElement('div', 'wh-layer-row');
    const layerSpecs = [
      ['wh-layer-labels', 'Labels', true],
      ['wh-layer-routes', 'Survey connections', true],
      ['wh-layer-hazards', 'Hazard volumes', true]
    ];
    layerSpecs.forEach(([id, text, checked]) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = checked;
      label.append(input, document.createTextNode(text));
      layers.append(label);
    });
    const status = makeElement('div', 'wh-status', 'Loading three-dimensional survey engine…');
    status.id = 'wh-map-status';
    status.setAttribute('role', 'status');
    toolbar.append(selectionRow, toolRow, layers, status);

    const stage = makeElement('div', 'wh-map-stage');
    stage.id = 'wh-map-stage';
    stage.setAttribute('aria-label', 'Interactive three-dimensional map of the Cafarron Corridor. Drag to orbit, right-drag to pan, scroll to zoom, and click system nodes for details.');
    const labels = makeElement('div', 'wh-map-labels');
    labels.id = 'wh-map-labels';
    const loading = makeElement('div', 'wh-map-loading', 'Awaiting Navis survey cogitator…');
    loading.id = 'wh-map-loading';
    stage.append(labels, loading);
    card.append(toolbar, stage);
    grid.append(card, buildMapDetailsShell());
    panel.append(grid);
    return panel;
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('[data-workspace-tab]').forEach(button => {
      const active = button.dataset.workspaceTab === tab;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-workspace-panel]').forEach(panel => {
      panel.hidden = panel.dataset.workspacePanel !== tab;
    });
    if (tab === 'map') initializeMap();
  }

  function buildWorkspace(view) {
    view.replaceChildren();
    view.setAttribute('aria-labelledby', 'wh-workspace-title');
    const workspace = makeElement('div', 'wh-workspace');

    const header = makeElement('header', 'wh-command-header');
    const titleWrap = makeElement('div', 'wh-command-title');
    titleWrap.append(makeElement('div', 'wh-sigil', 'I'), (() => {
      const copy = document.createElement('div');
      copy.append(makeElement('p', '', 'Administratum archive · Navis Cartographica annex'), makeElement('h1', '', 'Cafarron Corridor Strategic Archive'));
      return copy;
    })());
    const actions = makeElement('div', 'wh-command-actions');
    const back = makeButton('Return to Foundry Archive', 'wh-button primary');
    back.addEventListener('click', () => window.HBTTRPGApp?.activateView?.('tools'));
    const source = makeElement('a', 'wh-button', 'Open Emperor Protects Stories');
    source.href = 'https://www.reddit.com/r/EmperorProtects/';
    source.target = '_blank';
    source.rel = 'noopener';
    actions.append(back, source);
    header.append(titleWrap, actions);

    const tabbar = makeElement('nav', 'wh-tabbar');
    tabbar.setAttribute('role', 'tablist');
    tabbar.setAttribute('aria-label', 'Cafarron Corridor archive sections');
    const archiveTab = makeButton('Archive Index', 'wh-tab');
    archiveTab.dataset.workspaceTab = 'archive';
    archiveTab.setAttribute('role', 'tab');
    archiveTab.setAttribute('aria-selected', 'true');
    const mapTab = makeButton('Three-Dimensional Sector Survey', 'wh-tab');
    mapTab.dataset.workspaceTab = 'map';
    mapTab.setAttribute('role', 'tab');
    mapTab.setAttribute('aria-selected', 'false');
    mapTab.tabIndex = -1;
    tabbar.append(archiveTab, mapTab);

    const shell = makeElement('main', 'wh-shell');
    const hero = makeElement('section', 'wh-hero');
    const heroCopy = makeElement('article', 'wh-hero-copy');
    heroCopy.append(
      makeElement('p', 'wh-kicker', 'Restricted campaign reference · unofficial fan archive'),
      makeElement('h2', '', 'Cafarron Corridor'),
      makeElement('p', '', 'Search the story-grounded archive, inspect author-established corrections, and enter the Navis survey annex to orbit, pan, zoom, and select every plotted system node. The three-dimensional coordinates are a campaign cartographic framework rather than a claim of official astronomical measurements.')
    );
    const docket = makeElement('aside', 'wh-docket');
    const dl = document.createElement('dl');
    appendDefinition(dl, 'Archive version', state.data.version);
    appendDefinition(dl, 'Indexed records', state.data.records.length);
    appendDefinition(dl, 'Plotted nodes', state.data.mapNodes.length);
    appendDefinition(dl, 'Hazard volumes', state.data.hazards.length);
    appendDefinition(dl, 'Source rule', 'Exact story permalink or explicitly unresolved');
    docket.append(makeElement('p', 'wh-kicker', 'Archive docket'), dl);
    hero.append(heroCopy, docket);

    shell.append(hero, buildArchivePanel(), buildMapPanel());
    workspace.append(header, tabbar, shell);
    view.append(workspace);

    tabbar.addEventListener('click', event => {
      const button = event.target.closest('[data-workspace-tab]');
      if (button) setActiveTab(button.dataset.workspaceTab);
    });
    renderArchive();
  }

  function loadExternalScript(src) {
    if (externalScripts.has(src)) return externalScripts.get(src);
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing?.dataset.whLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      const complete = () => { script.dataset.whLoaded = 'true'; resolve(); };
      const fail = () => reject(new Error(`${src} could not be loaded.`));
      script.addEventListener('load', complete, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.crossOrigin = 'anonymous';
        document.head.append(script);
      }
    });
    externalScripts.set(src, promise);
    promise.catch(() => externalScripts.delete(src));
    return promise;
  }

  async function loadThree() {
    if (window.THREE?.OrbitControls) return;
    await loadExternalScript(THREE_URL);
    await loadExternalScript(ORBIT_URL);
    if (!window.THREE?.OrbitControls) throw new Error('The three-dimensional survey controls did not initialize.');
  }

  function nodeColor(kind) {
    if (kind.includes('forge') || kind.includes('extractive')) return 0xcb6a45;
    if (kind.includes('anchorage')) return 0x78a6d2;
    if (kind.includes('agricultural') || kind.includes('production')) return 0x83a66f;
    if (kind.includes('war')) return 0xb64b4b;
    if (kind.includes('frontier') || kind.includes('sensitive')) return 0x8d78c5;
    if (kind.includes('hazard')) return 0x8d8d88;
    return 0xd7b35f;
  }

  function nodeRecordSummary(node) {
    return node.recordIds.map(id => state.data.records.find(record => record.id === id)).filter(Boolean);
  }

  function renderMapDetails(node) {
    const panel = document.getElementById('wh-map-details');
    if (!panel) return;
    const records = nodeRecordSummary(node);
    panel.replaceChildren();
    panel.append(
      makeElement('p', 'wh-kicker', 'Selected survey node'),
      makeElement('h3', '', node.name),
      makeElement('div', 'wh-meta')
    );
    const meta = panel.querySelector('.wh-meta');
    meta.append(makeBadge(node.kind), makeBadge(node.status), makeBadge(node.provenance));
    const coordinates = makeElement('dl', 'wh-definition');
    appendDefinition(coordinates, 'Survey X', node.position[0]);
    appendDefinition(coordinates, 'Survey Y', node.position[1]);
    appendDefinition(coordinates, 'Survey Z', node.position[2]);
    appendDefinition(coordinates, 'Linked records', records.length);
    panel.append(coordinates);

    for (const record of records) {
      const section = makeElement('section', 'wh-linked-record');
      section.append(makeElement('h4', '', record.name), makeElement('p', '', record.summary));
      const details = makeElement('dl', 'wh-definition');
      appendDefinition(details, 'Type', record.objectType);
      appendDefinition(details, 'Status', record.status);
      appendDefinition(details, 'Classification', record.classification);
      appendDefinition(details, 'Conflict', record.conflict);
      appendDefinition(details, 'Imperial presence', record.imperialPresence);
      section.append(details);
      const sources = buildSourceList(record);
      if (sources) section.append(sources);
      panel.append(section);
    }
    panel.append(buildLegend());
  }

  function createSectorScene() {
    const THREE = window.THREE;
    const stage = document.getElementById('wh-map-stage');
    const labelsLayer = document.getElementById('wh-map-labels');
    const status = document.getElementById('wh-map-status');
    const loading = document.getElementById('wh-map-loading');
    if (!stage || !labelsLayer || !status) throw new Error('The sector survey mount is missing.');

    loading?.remove();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030505);
    scene.fog = new THREE.FogExp2(0x030505, 0.0024);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 900);
    const defaultTarget = new THREE.Vector3(22, 0, 2);
    const defaultPosition = new THREE.Vector3(32, 58, 132);
    camera.position.copy(defaultPosition);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    stage.insertBefore(renderer.domElement, labelsLayer);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(defaultTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 18;
    controls.maxDistance = 260;
    controls.update();

    scene.add(new THREE.AmbientLight(0xb9aa83, 0.65));
    const keyLight = new THREE.DirectionalLight(0xffe1a0, 1.1);
    keyLight.position.set(-40, 70, 90);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x657e9e, 0.7);
    rimLight.position.set(100, -20, -60);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(180, 18, 0x5e5136, 0x292d29);
    grid.position.y = -34;
    scene.add(grid);

    const starGeometry = new THREE.BufferGeometry();
    const stars = [];
    let seed = 90210;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let index = 0; index < 1200; index += 1) {
      stars.push((random() - .5) * 340, (random() - .5) * 220, (random() - .5) * 340);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xb8b4a7, size: 0.34, transparent: true, opacity: 0.65, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    const routeGroup = new THREE.Group();
    const hazardGroup = new THREE.Group();
    const nodeGroup = new THREE.Group();
    scene.add(routeGroup, hazardGroup, nodeGroup);
    const nodeById = new Map(state.data.mapNodes.map(node => [node.id, node]));

    for (const route of state.data.routes) {
      const points = route.nodeIds.map(id => nodeById.get(id)).filter(Boolean).map(node => new THREE.Vector3(...node.position));
      if (points.length < 2) continue;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const dashed = route.status === 'provisional' || route.status === 'provisional charting' || route.status === 'not a confirmed trade lane';
      const material = dashed
        ? new THREE.LineDashedMaterial({ color: route.provenance === 'user-established' ? 0xc4a55b : 0x667c76, dashSize: 2.2, gapSize: 1.25, transparent: true, opacity: 0.74 })
        : new THREE.LineBasicMaterial({ color: route.provenance === 'user-established' ? 0xd7b35f : 0x7d8f88, transparent: true, opacity: 0.82 });
      const line = new THREE.Line(geometry, material);
      if (dashed) line.computeLineDistances();
      line.userData.route = route;
      routeGroup.add(line);
    }

    for (const hazard of state.data.hazards) {
      const geometry = new THREE.SphereGeometry(1, 24, 16);
      const material = new THREE.MeshBasicMaterial({ color: hazard.status === 'active' ? 0xa84137 : 0x8b6d42, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...hazard.center);
      mesh.scale.set(...hazard.radii);
      mesh.userData.hazard = hazard;
      hazardGroup.add(mesh);
    }

    const selectableMeshes = [];
    const meshByNodeId = new Map();
    const labelByNodeId = new Map();
    for (const node of state.data.mapNodes) {
      const color = nodeColor(node.kind);
      const geometry = new THREE.SphereGeometry(1.55 * node.scale, 28, 20);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.42, roughness: 0.38, metalness: 0.28 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...node.position);
      mesh.userData.node = node;
      nodeGroup.add(mesh);
      selectableMeshes.push(mesh);
      meshByNodeId.set(node.id, mesh);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.3 * node.scale, 0.08, 10, 44),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
      );
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);

      const label = makeButton(node.name, 'wh-map-label');
      label.dataset.nodeId = node.id;
      label.addEventListener('click', event => {
        event.stopPropagation();
        selectNode(node.id, true);
      });
      labelsLayer.append(label);
      labelByNodeId.set(node.id, label);
    }

    let selectedId = '';
    function selectNode(nodeId, focus = false) {
      const node = nodeById.get(nodeId);
      if (!node) return;
      selectedId = nodeId;
      meshByNodeId.forEach((mesh, id) => {
        const active = id === nodeId;
        mesh.scale.setScalar(active ? 1.45 : 1);
        mesh.material.emissiveIntensity = active ? 1.05 : 0.42;
      });
      labelByNodeId.forEach((label, id) => label.setAttribute('aria-current', id === nodeId ? 'true' : 'false'));
      const select = document.getElementById('wh-map-node-select');
      if (select) select.value = nodeId;
      const focusButton = document.getElementById('wh-map-focus');
      if (focusButton) focusButton.disabled = false;
      renderMapDetails(node);
      if (focus) focusNode(node);
    }

    function focusNode(node) {
      const target = new THREE.Vector3(...node.position);
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.max(26, Math.min(offset.length(), 70));
      if (offset.lengthSq() < 0.01) offset.set(1, .8, 1);
      offset.normalize().multiplyScalar(distance);
      controls.target.copy(target);
      camera.position.copy(target).add(offset);
      camera.up.set(0, 1, 0);
      controls.update();
    }

    function resetView() {
      camera.up.set(0, 1, 0);
      camera.position.copy(defaultPosition);
      controls.target.copy(defaultTarget);
      controls.update();
    }

    function topView() {
      camera.up.set(0, 0, -1);
      camera.position.set(defaultTarget.x, 145, defaultTarget.z);
      controls.target.copy(defaultTarget);
      controls.update();
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;
    renderer.domElement.addEventListener('pointerdown', event => {
      pointerDown = { x: event.clientX, y: event.clientY };
    });
    renderer.domElement.addEventListener('pointerup', event => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectableMeshes, false)[0];
      if (hit?.object?.userData?.node) selectNode(hit.object.userData.node.id, false);
    });

    const select = document.getElementById('wh-map-node-select');
    select?.addEventListener('change', () => {
      if (select.value) selectNode(select.value, false);
    });
    document.getElementById('wh-map-focus')?.addEventListener('click', () => {
      if (selectedId) focusNode(nodeById.get(selectedId));
    });
    document.getElementById('wh-map-reset')?.addEventListener('click', resetView);
    document.getElementById('wh-map-top')?.addEventListener('click', topView);
    document.getElementById('wh-layer-routes')?.addEventListener('change', event => { routeGroup.visible = event.target.checked; });
    document.getElementById('wh-layer-hazards')?.addEventListener('change', event => { hazardGroup.visible = event.target.checked; });
    document.getElementById('wh-layer-labels')?.addEventListener('change', event => { labelsLayer.hidden = !event.target.checked; });

    function resize() {
      const width = Math.max(stage.clientWidth, 320);
      const height = Math.max(stage.clientHeight, 420);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    const projected = new THREE.Vector3();
    let frame = 0;
    function animate() {
      frame = requestAnimationFrame(animate);
      controls.update();
      const rect = renderer.domElement.getBoundingClientRect();
      for (const node of state.data.mapNodes) {
        const label = labelByNodeId.get(node.id);
        if (!label) continue;
        projected.set(...node.position).project(camera);
        const visible = projected.z > -1 && projected.z < 1;
        label.hidden = !visible;
        if (visible) {
          label.style.left = `${(projected.x * .5 + .5) * rect.width}px`;
          label.style.top = `${(-projected.y * .5 + .5) * rect.height}px`;
        }
      }
      renderer.render(scene, camera);
    }
    animate();
    status.textContent = `${state.data.mapNodes.length} selectable system nodes · drag to orbit · right-drag to pan · wheel or pinch to zoom`;
    selectNode('node-galadin', false);

    return {
      selectNode,
      dispose() {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
        labelsLayer.replaceChildren();
        renderer.domElement.remove();
      }
    };
  }

  async function initializeMap() {
    if (state.mapController) return state.mapController;
    if (state.mapPromise) return state.mapPromise;
    const status = document.getElementById('wh-map-status');
    state.mapPromise = (async () => {
      try {
        if (status) status.textContent = 'Loading three-dimensional Navis survey engine…';
        await loadThree();
        state.mapController = createSectorScene();
        return state.mapController;
      } catch (error) {
        const loading = document.getElementById('wh-map-loading');
        if (loading) loading.textContent = `Three-dimensional survey unavailable: ${error.message}`;
        if (status) status.textContent = `Survey engine failed to load: ${error.message}`;
        throw error;
      } finally {
        state.mapPromise = null;
      }
    })();
    return state.mapPromise;
  }

  function setDiegeticState(active) {
    document.body.classList.toggle('warhammer-archive-active', active);
  }

  function initialize() {
    const view = document.getElementById('warhammer-40k');
    const source = window.Warhammer40KLore?.data;
    if (!view || !source) throw new Error('The Warhammer lore view or archive dataset is unavailable.');
    ensureStyles();
    if (!state.data) state.data = composeData(source);
    if (!state.initialized) {
      state.initialized = true;
      buildWorkspace(view);
      document.addEventListener('hb:view-activated', event => {
        setDiegeticState(event.detail?.viewId === 'warhammer-40k');
      });
    }
    setDiegeticState(true);
    setActiveTab(state.activeTab);
  }

  window.Warhammer40KWorkspace = Object.freeze({
    initialize,
    exportArchive,
    get data() { return state.data; }
  });
})();
