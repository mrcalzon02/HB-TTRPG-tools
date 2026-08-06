(() => {
  'use strict';

  const ENTRY_STYLE_PATH = 'warhammer-40k-entry-pages.css?v=2';

  const CATEGORY_LABELS = Object.freeze({
    all: 'All Sealed Dockets',
    world: 'Worlds and Moons',
    system: 'Stellar Systems',
    station: 'Stations and Installations',
    region: 'Sector Regions',
    place: 'Named Sites',
    'imperial-force': 'Astra Militarum Formations',
    unnamed: 'Unnumbered Celestial Bodies',
    alias: 'Designation Concordance',
    unresolved: 'Restricted Addenda',
    exploratory: 'Explorator Contacts'
  });

  const META_REPLACEMENTS = Object.freeze([
    [/formal name and\/or class inferred/gi, 'registered under its Munitorum designation'],
    [/formal name inferred/gi, 'registered under its Munitorum designation'],
    [/formal name unresolved/gi, 'registered under its Munitorum designation'],
    [/proper (?:system )?name remains pending/gi, 'temporary Cartographica designation retained'],
    [/proper name pending/gi, 'temporary Cartographica designation retained'],
    [/not canonized/gi, 'unratified by the sector archive'],
    [/non-canon(?:ical)?/gi, 'unratified'],
    [/story-grounded/gi, 'chronicle-sealed'],
    [/user-established/gi, 'entered by sector writ'],
    [/reference-sheet/gi, 'Administratum ledger'],
    [/map-ready/gi, 'entered in the Navis register'],
    [/source-incomplete/gi, 'without an attached chronicle seal'],
    [/provisional/gi, 'temporary Navis charter'],
    [/inferred/gi, 'entered by Munitorum writ'],
    [/inference/gi, 'Munitorum determination'],
    [/implied/gi, 'entered by Munitorum writ'],
    [/suspected/gi, 'marked for Ordo scrutiny'],
    [/probable/gi, 'designated'],
    [/candidate/gi, 'holding designation'],
    [/unresolved/gi, 'sealed'],
    [/unclassified/gi, 'restricted classification'],
    [/unknown/gi, 'not entered in the accessible register'],
    [/review/gi, 'under archive seal'],
    [/analyst/gi, 'lexmechanic'],
    [/evidence/gi, 'archive seal'],
    [/confidence/gi, 'seal authority'],
    [/provenance/gi, 'record lineage'],
    [/source/gi, 'chronicle'],
    [/not established/gi, 'not entered under the present seal'],
    [/remains incompletely indexed/gi, 'is held under restricted index'],
    [/remains pending/gi, 'is retained under temporary seal']
  ]);

  function create(data, actions = {}) {
    let category = 'all';
    let query = '';
    let previousFocus = null;

    ensureEntryStyles();

    const recordById = new Map(data.records.map(record => [record.id, record]));
    const nodeById = new Map((actions.mapNodes || data.mapNodes).map(node => [node.id, node]));
    const activeRoutes = actions.routes || data.routes;

    function ensureEntryStyles() {
      const resolved = new URL(ENTRY_STYLE_PATH, document.baseURI).href;
      if ([...document.styleSheets].some(sheet => sheet.href === resolved)) return;
      if (document.querySelector('link[data-cafarron-entry-style="true"]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = ENTRY_STYLE_PATH;
      link.dataset.cafarronEntryStyle = 'true';
      document.head.appendChild(link);
    }

    function el(tag, className = '', text = '') {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== '') node.textContent = text;
      return node;
    }

    function button(text, className = 'wh-button') {
      const node = el('button', className, text);
      node.type = 'button';
      return node;
    }

    function badge(text, className = '') {
      return el('span', `wh-badge ${className}`.trim(), text);
    }

    function addDef(dl, label, value) {
      if (isEmpty(value) || (Array.isArray(value) && !value.length)) return;
      dl.append(
        el('dt', '', label),
        el('dd', '', Array.isArray(value) ? value.join(' · ') : String(value))
      );
    }

    function isEmpty(value) {
      if (value === undefined || value === null) return true;
      if (Array.isArray(value)) return value.length === 0;
      const text = String(value).trim().toLowerCase();
      return !text || ['none stated', 'none recorded', 'not specified', 'unassigned'].includes(text);
    }

    function sentence(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      return /[.!?]$/.test(text) ? text : `${text}.`;
    }

    function diegeticText(value) {
      if (Array.isArray(value)) return value.map(diegeticText);
      let text = String(value || '').trim();
      for (const [pattern, replacement] of META_REPLACEMENTS) text = text.replace(pattern, replacement);
      return text
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;:])/g, '$1')
        .trim();
    }

    function systemName(value) {
      return String(value || '')
        .replace(/\s+homeworld$/i, ' System')
        .replace(/^Caraphus$/i, 'Caraphus System');
    }

    function displayName(record) {
      if (!record) return 'Sealed Docket';
      if (/\bhomeworld$/i.test(record.name || '')) return systemName(record.name);
      if (record.name === 'Caraphus' && record.category !== 'imperial-force') return 'Caraphus System';
      return record.name;
    }

    function displayOrigin(value) {
      return systemName(diegeticText(value));
    }

    function exactChronicle(source) {
      return source?.status === 'verified' &&
        /^https:\/\/www\.reddit\.com\/r\/EmperorProtects\/comments\//i.test(source.url || '');
    }

    function isGuardSystemRecord(record) {
      return /homeworld$/i.test(record.name || '') ||
        record.mapNodeIds?.some(id => nodeById.get(id)?.layer === 'guard-origin');
    }

    function displayClass(record) {
      if (isGuardSystemRecord(record) && record.category !== 'imperial-force') return 'Astra Militarum origin system';
      if (record.category === 'imperial-force') return diegeticText(record.objectType || record.classification || 'Imperial formation');
      return diegeticText(record.objectType || record.classification || 'Administratum subject');
    }

    function archiveStanding(record) {
      if (record.category === 'exploratory' || /exploratory/i.test(record.objectType || '')) return 'Explorator contact under temporary Navis seal';
      if (record.category === 'imperial-force') return 'Departmento Munitorum formation docket';
      if (isGuardSystemRecord(record)) return 'Astra Militarum origin system under tithe writ';
      if (exactChronicle(record.source)) return 'Chronicle-attached Administratum docket';
      if (record.source?.status === 'authorial') return 'Sector writ entered by the Chronicler';
      return 'Archivum record under restricted access seal';
    }

    function threatBadge(record) {
      if (!record.threat || ['mixed', 'unassigned'].includes(record.threat)) return null;
      const threat = data.threatStates[record.threat] || data.threatStates.unsurveyed;
      const item = badge(threat.label, 'wh-threat-badge');
      item.style.setProperty('--badge-color', threat.css);
      return item;
    }

    function chronicleSection(record, full = false) {
      const box = el('section', full ? 'wh-entry-source' : 'wh-source');
      box.append(el(full ? 'h3' : 'h4', '', full ? 'Attached Chronicle Seal' : 'Attached Chronicle'));
      const source = record.source || {};
      if (exactChronicle(source)) {
        const link = el('a', '', source.label ? `Consult “${source.label}”` : 'Consult Attached Chronicle');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        box.append(link);
        if (full) box.append(el('p', 'wh-entry-copy', 'The attached chronicle is entered under the docket’s reference seal and may be consulted by authorized personnel.'));
      } else if (source.status === 'authorial') {
        box.append(el('p', 'wh-small', source.label || 'Sector writ entered by the Chronicler.'));
        if (full) box.append(el('p', 'wh-entry-copy', 'This designation stands by direct sector writ and carries the authority of the campaign chronicle.'));
      } else {
        box.append(el('p', 'wh-pending', 'No chronicle attachment is available under the present access seal.'));
        if (full) box.append(el('p', 'wh-entry-copy', 'The docket remains valid within the strategic register. Its attached chronicle is sealed, missing from this cogitator, or awaiting transcription by the Archivum.'));
      }
      if (record.keyStory && record.keyStory !== source.label) {
        box.append(el('p', 'wh-small', `Chronicle register: ${diegeticText(record.keyStory)}`));
      }
      return box;
    }

    function searchable(record) {
      return [
        record.referenceId, displayName(record), record.name, record.shortName,
        ...(record.aliases || []), record.category, record.objectType, record.classification,
        record.summary, ...(record.relationships || []), record.keyStory,
        record.analystNotes, record.originCandidate, record.environment,
        record.deploymentVsOrigin, record.normalizedObject, record.threat,
        record.threatNote, ...(record.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function visibleRecords() {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      return data.records.filter(record => {
        if (category !== 'all' && record.category !== category) return false;
        if (!terms.length) return true;
        const text = searchable(record);
        return terms.every(term => text.includes(term));
      });
    }

    function linkedNodes(record) {
      return (record.mapNodeIds || []).map(id => nodeById.get(id)).filter(Boolean);
    }

    function linkedRoutes(record) {
      const nodeIds = new Set(record.mapNodeIds || []);
      return nodeIds.size
        ? activeRoutes.filter(route => route.nodeIds?.some(id => nodeIds.has(id)))
        : [];
    }

    function associatedRecords(record) {
      const associated = new Map();
      const nodeIds = new Set(record.mapNodeIds || []);
      const names = new Set([
        displayName(record), record.name, record.originCandidate,
        record.normalizedObject, ...(record.aliases || [])
      ].filter(Boolean).map(value => systemName(value).toLowerCase()));

      for (const candidate of data.records) {
        if (candidate.id === record.id) continue;
        const sharesNode = (candidate.mapNodeIds || []).some(id => nodeIds.has(id));
        const candidateNames = [
          displayName(candidate), candidate.name, candidate.originCandidate,
          candidate.normalizedObject, ...(candidate.aliases || [])
        ].filter(Boolean).map(value => systemName(value).toLowerCase());
        if (sharesNode || candidateNames.some(name => names.has(name))) associated.set(candidate.id, candidate);
      }
      return [...associated.values()].slice(0, 24);
    }

    function recordCard(record) {
      const card = el('article', 'wh-record');
      const meta = el('div', 'wh-meta');
      meta.append(
        badge(record.referenceId || 'ARCHIVUM'),
        badge(CATEGORY_LABELS[record.category] || 'Restricted Docket')
      );
      const threat = threatBadge(record);
      if (threat) meta.append(threat);
      card.append(
        meta,
        el('h3', '', displayName(record)),
        el('p', '', diegeticText(record.summary || 'No summary has been entered under this seal.'))
      );

      const dl = el('dl', 'wh-definition');
      addDef(dl, 'Imperial designation', displayClass(record));
      addDef(dl, 'Archive standing', archiveStanding(record));
      addDef(dl, 'Known aliases', diegeticText(record.aliases || []));
      addDef(dl, 'Registered associations', diegeticText(record.relationships || []));
      addDef(dl, 'Origin system', displayOrigin(record.originCandidate));
      addDef(dl, 'World condition', diegeticText(record.environment));
      addDef(dl, 'Munitorum ruling', diegeticText(record.deploymentVsOrigin));
      addDef(dl, 'Threat notation', diegeticText(record.threatNote));
      card.append(dl, chronicleSection(record));

      const actionsRow = el('div', 'wh-entry-card-actions');
      const open = button('Unseal Full Dossier', 'wh-button primary');
      open.addEventListener('click', () => openEntry(record.id));
      actionsRow.append(open);
      if (record.mapNodeIds?.length) {
        const locate = button('Mark on Navis Survey', 'wh-button');
        locate.addEventListener('click', () => actions.locate?.(record.mapNodeIds[0]));
        actionsRow.append(locate);
      }
      card.append(actionsRow);
      return card;
    }

    function renderArchive() {
      const grid = document.getElementById('wh-record-grid');
      const status = document.getElementById('wh-record-status');
      if (!grid) return;
      const records = visibleRecords();
      grid.replaceChildren(...(records.length
        ? records.map(recordCard)
        : [el('div', 'wh-empty', 'No docket answers the present query seal.')]
      ));
      if (status) status.textContent = `${records.length} of ${data.records.length} sealed dockets answer the present query.`;
    }

    function archivePanel() {
      const panel = el('section');
      panel.dataset.panel = 'archive';
      const controls = el('section', 'wh-controls');
      const row = el('div', 'wh-searchrow');
      const label = el('label', '', 'Query the sealed Administratum index');
      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = 'Designation, system, regiment, threat seal, chronicle…';
      label.append(input);
      const exportButton = button('Issue Data-Slate Copy');
      exportButton.addEventListener('click', () => actions.exportArchive?.());
      row.append(label, exportButton);

      const filters = el('div', 'wh-filters');
      for (const [key, text] of Object.entries(CATEGORY_LABELS)) {
        const item = button(text, 'wh-filter');
        item.dataset.category = key;
        item.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
        filters.append(item);
      }
      const status = el('div', 'wh-status');
      status.id = 'wh-record-status';
      status.setAttribute('role', 'status');
      controls.append(row, filters, status);

      const grid = el('div', 'wh-record-grid');
      grid.id = 'wh-record-grid';
      panel.append(controls, grid);

      input.addEventListener('input', () => {
        query = input.value.trim();
        renderArchive();
      });
      filters.addEventListener('click', event => {
        const item = event.target.closest('[data-category]');
        if (!item) return;
        category = item.dataset.category || 'all';
        filters.querySelectorAll('[data-category]').forEach(candidate => {
          candidate.setAttribute('aria-pressed', candidate === item ? 'true' : 'false');
        });
        renderArchive();
      });
      return panel;
    }

    function threatLegend() {
      const box = el('section', 'wh-legend');
      box.append(el('h4', '', 'Strategic Threat Seals'));
      for (const threat of Object.values(data.threatStates)) {
        if (threat.label === 'Threat State Unassigned') continue;
        const row = el('div', 'wh-legend-item');
        const swatch = el('span', 'wh-swatch');
        swatch.style.background = threat.css;
        row.append(swatch, el('span', '', `${threat.label} — ${diegeticText(threat.description)}`));
        box.append(row);
      }
      return box;
    }

    function renderMapDetails(node, records) {
      const aside = document.getElementById('wh-map-details');
      const select = document.getElementById('wh-node-select');
      if (!aside) return;
      if (select) select.value = node.id;
      aside.replaceChildren(
        el('p', 'wh-kicker', 'Navis Cartographica Auspex Lock'),
        el('h3', '', node.name)
      );
      const meta = el('div', 'wh-meta');
      meta.append(
        badge(node.layer === 'guard-origin' ? 'Astra Militarum Origin System' : diegeticText(node.kind)),
        badge(data.threatStates[node.threat]?.label || 'No Threat Seal')
      );
      aside.append(meta);
      const dl = el('dl', 'wh-definition');
      addDef(dl, 'Survey coordinate', node.position.join(' / '));
      addDef(dl, 'Cartographica order', node.layer === 'exploratory' ? 'Unratified Explorator Contact' : 'Entered Contact');
      addDef(dl, 'Strategic notation', diegeticText(node.threatNote));
      addDef(dl, 'Attached dockets', records.length);
      aside.append(dl);

      for (const record of records) {
        const linked = el('section', 'wh-linked');
        linked.append(
          el('h4', '', displayName(record)),
          el('p', '', diegeticText(record.summary || 'No summary entered.'))
        );
        const open = button('Unseal Full Dossier', 'wh-button primary');
        open.addEventListener('click', () => openEntry(record.id));
        linked.append(chronicleSection(record), open);
        aside.append(linked);
      }
      aside.append(threatLegend());
    }

    function sealsPanel() {
      const panel = el('section');
      panel.dataset.panel = 'seals';
      panel.hidden = true;

      const intro = el('article', 'wh-panelbox');
      intro.append(
        el('p', 'wh-kicker', 'Adeptus Administratum · Archivum Veritatis'),
        el('h2', '', 'Archive Seals and Cartographic Ordinances'),
        el('p', '', 'These ordinances govern the names, routes, military origins, and chronicle attachments entered into the Cafarron Corridor cogitator.')
      );

      const grid = el('div', 'wh-docket-grid');
      const orders = el('article', 'wh-docket-card');
      orders.append(el('h3', '', 'Standing Ordinances'));
      const list = document.createElement('ol');
      [
        'Galladin, Galedin, Galladin’s Throne, and Yeldon’s Throne remain bound to one system and its local dialects.',
        'New Presidio the world and New Presidio the capital city remain separate levels of the same docket.',
        'Kertora Semoises V is entered as the fifth moon of Kertora Semoises Prime.',
        'A regiment’s deployment theatre shall not replace its registered origin system.',
        'Caldan, Tanvar, Halcyon, Ersak, Mirradon, Brannis, Draven, Vandrell, Karron, Vektran, and Caraphus are entered as Astra Militarum origin systems.',
        'Explorator contacts retain temporary contact numbers until the Sector Chronicler issues permanent designations.',
        'Warp and trade lines require a Navis, Munitorum, Mechanicus, or sector command charter.'
      ].forEach(order => list.append(el('li', '', order)));
      orders.append(list);
      grid.append(orders);

      const attached = el('article', 'wh-docket-card');
      attached.append(el('h3', '', 'Attached Chronicle Index'));
      const chronicleRecords = data.records.filter(record => exactChronicle(record.source));
      const chronicleList = el('div', 'wh-chronicle-index');
      for (const record of chronicleRecords) {
        const link = el('a', '', `${record.referenceId || 'ARCHIVUM'} · ${displayName(record)} · ${record.source.label || record.keyStory}`);
        link.href = record.source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        chronicleList.append(link);
      }
      attached.append(chronicleList);
      grid.append(attached);

      const census = el('article', 'wh-docket-card');
      census.append(el('h3', '', 'Cogitator Census'));
      const dl = el('dl', 'wh-dl');
      addDef(dl, 'Sealed dockets', data.records.length);
      addDef(dl, 'Plotted contacts', (actions.mapNodes || data.mapNodes).length);
      addDef(dl, 'Astra Militarum origin systems', (actions.mapNodes || data.mapNodes).filter(node => node.layer === 'guard-origin').length);
      addDef(dl, 'Sanctioned major corridors', activeRoutes.filter(route => route.layer === 'major-warp').length);
      addDef(dl, 'Munitorum trade lanes', activeRoutes.filter(route => route.layer === 'trade').length);
      addDef(dl, 'Register date', data.scopeDate);
      census.append(dl);
      grid.append(census);

      panel.append(intro, grid);
      return panel;
    }

    function routeSection(routes) {
      const box = el('section', 'wh-entry-section');
      box.append(el('h2', '', 'Sanctioned Warp and Freight Connections'));
      if (!routes.length) {
        box.append(el('p', 'wh-entry-copy', 'No sanctioned corridor touches this docket in the present Navis register. Local passages may exist beyond the authority of this cogitator.'));
        return box;
      }
      const grid = el('div', 'wh-entry-route-grid');
      for (const route of routes) {
        const card = el('article', 'wh-entry-route');
        card.append(el('h3', '', route.name));
        const dl = el('dl', 'wh-entry-ledger compact');
        addDef(dl, 'Route order', diegeticText(route.kind));
        addDef(dl, 'Issuing authority', diegeticText(route.authority));
        addDef(dl, 'Licensed traffic', diegeticText(route.traffic));
        addDef(dl, 'Present standing', diegeticText(route.status));
        card.append(dl);
        grid.append(card);
      }
      box.append(grid);
      return box;
    }

    function associationSection(records) {
      const box = el('section', 'wh-entry-section');
      box.append(el('h2', '', 'Cross-Indexed Dockets'));
      if (!records.length) {
        box.append(el('p', 'wh-entry-copy', 'No cross-indexed docket is entered under the present seal.'));
        return box;
      }
      const grid = el('div', 'wh-entry-association-grid');
      for (const related of records) {
        const card = el('article', 'wh-entry-association');
        card.append(
          el('p', 'wh-kicker', related.referenceId || 'ARCHIVUM'),
          el('h3', '', displayName(related)),
          el('p', '', diegeticText(related.summary || 'No summary entered.'))
        );
        const open = button('Unseal Linked Dossier', 'wh-button');
        open.addEventListener('click', () => openEntry(related.id, { preserveFocus: true }));
        card.append(open);
        grid.append(card);
      }
      box.append(grid);
      return box;
    }

    function fullEntry(record) {
      const nodes = linkedNodes(record);
      const routes = linkedRoutes(record);
      const associates = associatedRecords(record);
      const name = displayName(record);

      const article = el('article', 'wh-entry-article');
      const masthead = el('header', 'wh-entry-masthead');
      const seal = el('div', 'wh-entry-seal', 'I');
      seal.setAttribute('aria-hidden', 'true');
      const heading = el('div', 'wh-entry-heading');
      heading.append(
        el('p', 'wh-kicker', 'Adeptus Administratum · Cafarron Corridor Restricted Dossier'),
        el('h1', '', name),
        el('p', 'wh-entry-subtitle', `${record.referenceId || record.id} · ${displayClass(record)} · ${archiveStanding(record)}`)
      );
      const status = el('div', 'wh-entry-status');
      status.append(badge(CATEGORY_LABELS[record.category] || 'Restricted Docket'));
      const threat = threatBadge(record);
      if (threat) status.append(threat);
      masthead.append(seal, heading, status);
      article.append(masthead);

      const abstract = el('section', 'wh-entry-abstract');
      abstract.append(
        el('p', 'wh-entry-ordinal', '+++ ADMINISTRATUM ABSTRACT +++'),
        el('p', 'wh-entry-lead', sentence(diegeticText(record.summary || 'No abstract has been entered under this seal.')))
      );
      article.append(abstract);

      const columns = el('div', 'wh-entry-columns');
      const main = el('div', 'wh-entry-main');
      const sidebar = el('aside', 'wh-entry-sidebar');

      const chronicle = sentence(diegeticText(record.keyStory
        ? `The chronicle register binds this docket to “${record.keyStory}”`
        : 'No chronicle title is displayed under the present access seal'));
      const relations = (record.relationships || []).filter(value => !isEmpty(value));
      const relationCopy = relations.length
        ? `Registered associations: ${diegeticText(relations).join('; ')}.`
        : 'No further associations are entered under the present seal.';
      const environment = !isEmpty(record.environment)
        ? `World-condition register: ${sentence(diegeticText(record.environment))}`
        : 'No additional world-condition notation is displayed by this cogitator.';
      const origin = !isEmpty(record.originCandidate)
        ? `Munitorum origin system: ${displayOrigin(record.originCandidate)}.`
        : 'No separate origin system is entered for this subject.';
      const deployment = !isEmpty(record.deploymentVsOrigin)
        ? `Munitorum ruling: ${sentence(diegeticText(record.deploymentVsOrigin))}`
        : '';
      const military = record.category === 'imperial-force'
        ? `${origin} ${deployment} The formation remains bound to its registered regimental title, specialization, and deployment history.`
        : associatedRecords(record).some(item => item.category === 'imperial-force')
          ? `Astra Militarum formation dockets are cross-indexed to this location and listed below.`
          : 'No Astra Militarum formation is entered against this docket.';
      const coordinateCopy = nodes.length
        ? `Navis contact${nodes.length === 1 ? '' : 's'}: ${nodes.map(node => `${node.name} at ${node.position.join(' / ')}`).join('; ')}.`
        : 'No point coordinate is displayed under the present Navis access seal.';
      const threatState = data.threatStates[record.threat];
      const threatCopy = threatState
        ? `${threatState.label}. ${diegeticText(threatState.description)} ${sentence(diegeticText(record.threatNote || 'No additional strategic notation entered'))}`
        : 'No strategic threat seal is displayed for this docket.';

      main.append(
        textSection('Imperial Classification', `${name} is entered as ${displayClass(record)}. ${archiveStanding(record)}.`),
        textSection('Chronicle Register', `${chronicle} ${relationCopy}`),
        textSection('World and System Condition', environment),
        textSection('Military Obligations', military),
        textSection('Navis Cartographica Position', coordinateCopy),
        textSection('Strategic Threat Seal', threatCopy),
        routeSection(routes),
        associationSection(associates),
        textSection('Archivist’s Closing Notation', sentence(diegeticText(record.analystNotes || 'No further notation entered by the responsible lexmechanic')), 'wh-entry-section wh-entry-closing')
      );

      const facts = el('section', 'wh-entry-section wh-entry-facts');
      facts.append(el('h2', '', 'Administratum Classification Ledger'));
      const dl = el('dl', 'wh-entry-ledger');
      addDef(dl, 'Archive reference', record.referenceId || record.id);
      addDef(dl, 'Imperial designation', name);
      addDef(dl, 'Classification', displayClass(record));
      addDef(dl, 'Archive standing', archiveStanding(record));
      addDef(dl, 'Aliases', diegeticText(record.aliases || []));
      addDef(dl, 'Origin system', displayOrigin(record.originCandidate));
      addDef(dl, 'Survey contact', nodes.map(node => node.name));
      addDef(dl, 'Survey coordinate', nodes.map(node => node.position.join(' / ')));
      addDef(dl, 'Threat seal', threatState?.label);
      facts.append(dl);
      sidebar.append(facts, chronicleSection(record, true));

      if (record.mapNodeIds?.length) {
        const locateBox = el('section', 'wh-entry-section wh-entry-locate');
        locateBox.append(el('h2', '', 'Navis Survey Access'));
        const locate = button('Mark This Dossier on the Navis Survey', 'wh-button primary');
        locate.addEventListener('click', () => {
          closeEntry();
          actions.locate?.(record.mapNodeIds[0]);
        });
        locateBox.append(locate);
        sidebar.append(locateBox);
      }

      const addenda = el('section', 'wh-entry-section wh-entry-unresolved');
      addenda.append(
        el('h2', '', 'Sealed Addenda'),
        el('p', 'wh-entry-copy', 'Further names, classifications, population rolls, or local histories may remain beyond the present access seal. Their absence from this display does not diminish the authority of the docket entries shown above.')
      );
      sidebar.append(addenda);

      columns.append(main, sidebar);
      article.append(columns);
      const footer = el('footer', 'wh-entry-footer');
      footer.append(
        el('p', '', `Cafarron Corridor Strategic Archive · register ${data.version} · docket date ${data.scopeDate}`),
        el('p', '', '+++ THOUGHT FOR THE DAY: A RECORD PROPERLY SEALED IS A DUTY PROPERLY DISCHARGED +++')
      );
      article.append(footer);
      return article;
    }

    function textSection(title, text, className = 'wh-entry-section') {
      const box = el('section', className);
      box.append(el('h2', '', title), el('p', 'wh-entry-copy', text));
      return box;
    }

    function ensureEntryHost() {
      let host = document.getElementById('wh-entry-page');
      if (host) return host;
      host = el('section', 'wh-entry-page');
      host.id = 'wh-entry-page';
      host.hidden = true;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      host.setAttribute('aria-label', 'Restricted Cafarron Corridor dossier');
      const command = el('header', 'wh-entry-command');
      const close = button('Reseal Dossier and Return', 'wh-button primary');
      close.dataset.entryClose = 'true';
      const title = el('span', 'wh-entry-command-title', 'Administratum Restricted Dossier');
      const top = button('Return to Dossier Header', 'wh-button');
      top.addEventListener('click', () => host.scrollTo({ top: 0, behavior: 'smooth' }));
      command.append(close, title, top);
      const content = el('div', 'wh-entry-page-content');
      content.id = 'wh-entry-page-content';
      host.append(command, content);
      host.addEventListener('click', event => {
        if (event.target.closest('[data-entry-close]')) closeEntry();
      });
      document.body.append(host);
      return host;
    }

    function openEntry(recordId, options = {}) {
      const record = recordById.get(recordId);
      if (!record) return;
      if (!options.preserveFocus) previousFocus = document.activeElement;
      const host = ensureEntryHost();
      host.querySelector('#wh-entry-page-content').replaceChildren(fullEntry(record));
      host.hidden = false;
      document.body.classList.add('wh-entry-open');
      host.scrollTop = 0;
      host.querySelector('[data-entry-close]')?.focus({ preventScroll: true });
    }

    function closeEntry() {
      const host = document.getElementById('wh-entry-page');
      if (!host || host.hidden) return;
      host.hidden = true;
      host.querySelector('#wh-entry-page-content')?.replaceChildren();
      document.body.classList.remove('wh-entry-open');
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('wh-entry-page')?.hidden) closeEntry();
    });

    return Object.freeze({
      el,
      button,
      addDef,
      archivePanel,
      sealsPanel,
      threatLegend,
      renderMapDetails,
      renderArchive,
      openEntry,
      displayName,
      displayOrigin,
      diegeticText
    });
  }

  window.CafarronArchiveUIV5 = Object.freeze({ create });
})();
