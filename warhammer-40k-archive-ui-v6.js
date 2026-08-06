(() => {
  'use strict';

  const ENTRY_STYLE = 'warhammer-40k-entry-pages.css?v=3';
  const CATEGORIES = Object.freeze({
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

  function create(data, actions = {}) {
    let category = 'all';
    let query = '';
    let priorFocus = null;
    const mapNodes = actions.mapNodes || data.mapNodes;
    const routes = actions.routes || data.routes;
    const recordById = new Map(data.records.map(record => [record.id, record]));
    const nodeById = new Map(mapNodes.map(node => [node.id, node]));

    installStyle();

    function installStyle() {
      const href = new URL(ENTRY_STYLE, document.baseURI).href;
      if ([...document.styleSheets].some(sheet => sheet.href === href)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = ENTRY_STYLE;
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

    function addDef(list, label, value) {
      if (empty(value) || (Array.isArray(value) && !value.length)) return;
      list.append(el('dt', '', label), el('dd', '', Array.isArray(value) ? value.join(' · ') : String(value)));
    }

    function empty(value) {
      if (value === undefined || value === null) return true;
      if (Array.isArray(value)) return value.length === 0;
      return ['', 'none stated', 'none recorded', 'not specified', 'unassigned'].includes(String(value).trim().toLowerCase());
    }

    function sentence(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      return /[.!?]$/.test(text) ? text : `${text}.`;
    }

    function sealText(value) {
      if (Array.isArray(value)) return value.map(sealText);
      return String(value || '')
        .replace(/inferred|implied/gi, 'entered by Munitorum writ')
        .replace(/suspected/gi, 'marked for Ordo scrutiny')
        .replace(/probable|likely/gi, 'designated')
        .replace(/provisional/gi, 'temporary Navis charter')
        .replace(/non-canon(?:ical)?/gi, 'unratified')
        .replace(/candidate/gi, 'holding designation')
        .replace(/unresolved|unknown|uncertain/gi, 'held under restricted seal')
        .replace(/not established|not proven/gi, 'not entered under the present seal')
        .replace(/not explicit/gi, 'held beyond this access tier')
        .replace(/formal name|proper name/gi, 'Munitorum designation')
        .replace(/source/gi, 'chronicle')
        .replace(/story/gi, 'chronicle')
        .replace(/campaign author/gi, 'Sector Chronicler')
        .replace(/map/gi, 'survey')
        .replace(/review/gi, 'archive seal')
        .replace(/confidence|evidence/gi, 'seal authority')
        .replace(/provenance/gi, 'record lineage')
        .replace(/story-grounded/gi, 'chronicle-sealed')
        .replace(/user-established/gi, 'entered by sector writ')
        .replace(/reference-sheet/gi, 'Administratum ledger')
        .replace(/map-ready/gi, 'entered in the Navis register')
        .replace(/remains pending/gi, 'is retained under temporary seal')
        .replace(/unrecorded/gi, 'sealed from this access tier')
        .replace(/not recovered/gi, 'not attached under the present seal')
        .replace(/pending/gi, 'under temporary seal')
        .replace(/remains unknown|remain unknown/gi, 'is held under restricted seal')
        .replace(/incompletely indexed/gi, 'held under restricted index')
        .replace(/remains unnamed/gi, 'is entered without a public designation')
        .replace(/no current battle confirmed/gi, 'no active battle seal is entered')
        .replace(/current recovery status undefined/gi, 'recovery writ remains sealed')
        .replace(/environment unrecorded|no environment supplied/gi, 'environmental register sealed')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    function systemName(value) {
      return String(value || '').replace(/\s+homeworld$/i, ' System').replace(/^Caraphus$/i, 'Caraphus System');
    }

    function nameOf(record) {
      if (/\bhomeworld$/i.test(record.name || '')) return systemName(record.name);
      if (record.name === 'Caraphus' && record.category !== 'imperial-force') return 'Caraphus System';
      return record.name;
    }

    function classOf(record) {
      if (record.category !== 'imperial-force' && record.mapNodeIds?.some(id => nodeById.get(id)?.layer === 'guard-origin')) {
        return 'Astra Militarum origin system';
      }
      const raw = record.objectType || record.classification || 'Administratum subject';
      if (/unclassified/i.test(raw)) return 'Restricted Administratum classification';
      return sealText(raw);
    }

    function standingOf(record) {
      if (record.category === 'imperial-force') return 'Departmento Munitorum formation docket';
      if (record.category === 'exploratory' || /exploratory/i.test(record.objectType || '')) return 'Explorator contact under temporary Navis seal';
      if (record.mapNodeIds?.some(id => nodeById.get(id)?.layer === 'guard-origin')) return 'Astra Militarum origin system under tithe writ';
      if (exactChronicle(record.source)) return 'Chronicle-attached Administratum docket';
      if (record.source?.status === 'authorial') return 'Sector writ entered by the Chronicler';
      return 'Archivum docket under restricted seal';
    }

    function exactChronicle(source) {
      return source?.status === 'verified' && /^https:\/\/www\.reddit\.com\/r\/EmperorProtects\/comments\//i.test(source.url || '');
    }

    function conditionOf(record) {
      if (!empty(record.environment)) return sentence(sealText(record.environment));
      if (!empty(record.threatNote)) return sentence(sealText(record.threatNote));
      const relation = (record.relationships || []).find(item => !empty(item));
      if (relation) return sentence(sealText(relation));
      return 'No further condition roll is displayed under the present access seal.';
    }

    function brief(record) {
      const name = nameOf(record);
      if (record.category === 'imperial-force') {
        const origin = empty(record.originCandidate) ? '' : ` Its registered origin is ${systemName(record.originCandidate)}.`;
        return `${name} is entered as ${classOf(record)}.${origin} ${conditionOf(record)}`;
      }
      if (record.category === 'exploratory' || /exploratory/i.test(record.objectType || '')) {
        return `${name} is an Explorator contact retained under temporary Navis designation. ${conditionOf(record)}`;
      }
      if (record.category === 'unresolved') {
        return `${name} is retained under restricted Administratum classification. ${conditionOf(record)}`;
      }
      return `${name} is entered as ${classOf(record)}. ${conditionOf(record)}`;
    }

    function threatBadge(record) {
      if (!record.threat || ['mixed', 'unassigned'].includes(record.threat)) return null;
      const threat = data.threatStates[record.threat] || data.threatStates.unsurveyed;
      const item = badge(threat.label, 'wh-threat-badge');
      item.style.setProperty('--badge-color', threat.css);
      return item;
    }

    function chronicle(record, full = false) {
      const box = el('section', full ? 'wh-entry-source' : 'wh-source');
      box.append(el(full ? 'h3' : 'h4', '', full ? 'Attached Chronicle Seal' : 'Attached Chronicle'));
      if (exactChronicle(record.source)) {
        const link = el('a', '', `Consult “${record.source.label || record.keyStory || nameOf(record)}”`);
        link.href = record.source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        box.append(link);
        if (full) box.append(el('p', 'wh-entry-copy', 'The attached chronicle is entered beneath this docket’s reference seal.'));
      } else if (record.source?.status === 'authorial') {
        box.append(el('p', 'wh-small', record.source.label || 'Sector writ entered by the Chronicler.'));
      } else {
        box.append(el('p', 'wh-pending', 'No chronicle attachment is available under the present access seal.'));
      }
      return box;
    }

    function searchable(record) {
      return [record.referenceId, nameOf(record), record.name, record.shortName, ...(record.aliases || []), record.category,
        record.objectType, record.classification, record.summary, ...(record.relationships || []), record.keyStory,
        record.analystNotes, record.originCandidate, record.environment, record.deploymentVsOrigin,
        record.normalizedObject, record.threat, record.threatNote, ...(record.tags || [])]
        .filter(Boolean).join(' ').toLowerCase();
    }

    function visibleRecords() {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      return data.records.filter(record => {
        if (category !== 'all' && record.category !== category) return false;
        const text = searchable(record);
        return terms.every(term => text.includes(term));
      });
    }

    function linkedNodes(record) {
      return (record.mapNodeIds || []).map(id => nodeById.get(id)).filter(Boolean);
    }

    function linkedRoutes(record) {
      const ids = new Set(record.mapNodeIds || []);
      return routes.filter(route => route.nodeIds?.some(id => ids.has(id)));
    }

    function associated(record) {
      const found = new Map();
      const ids = new Set(record.mapNodeIds || []);
      const names = new Set([record.name, nameOf(record), record.originCandidate, record.normalizedObject, ...(record.aliases || [])]
        .filter(Boolean).map(value => systemName(value).toLowerCase()));
      for (const item of data.records) {
        if (item.id === record.id) continue;
        const sameNode = (item.mapNodeIds || []).some(id => ids.has(id));
        const itemNames = [item.name, nameOf(item), item.originCandidate, item.normalizedObject, ...(item.aliases || [])]
          .filter(Boolean).map(value => systemName(value).toLowerCase());
        if (sameNode || itemNames.some(value => names.has(value))) found.set(item.id, item);
      }
      return [...found.values()].slice(0, 24);
    }

    function recordCard(record) {
      const card = el('article', 'wh-record');
      const meta = el('div', 'wh-meta');
      meta.append(badge(record.referenceId || 'ARCHIVUM'), badge(CATEGORIES[record.category] || 'Restricted Docket'));
      const threat = threatBadge(record);
      if (threat) meta.append(threat);
      card.append(meta, el('h3', '', nameOf(record)), el('p', '', brief(record)));
      const facts = el('dl', 'wh-definition');
      addDef(facts, 'Imperial designation', classOf(record));
      addDef(facts, 'Archive standing', standingOf(record));
      addDef(facts, 'Known aliases', sealText(record.aliases || []));
      addDef(facts, 'Registered associations', sealText(record.relationships || []));
      addDef(facts, 'Origin system', systemName(record.originCandidate));
      addDef(facts, 'Munitorum ruling', sealText(record.deploymentVsOrigin));
      addDef(facts, 'Strategic notation', sealText(record.threatNote));
      card.append(facts, chronicle(record));
      const actionsRow = el('div', 'wh-entry-card-actions');
      const open = button('Unseal Full Dossier', 'wh-button primary');
      open.addEventListener('click', () => openEntry(record.id));
      actionsRow.append(open);
      if (record.mapNodeIds?.length) {
        const locate = button('Mark on Navis Survey');
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
      grid.replaceChildren(...(records.length ? records.map(recordCard) : [el('div', 'wh-empty', 'No docket answers the present query seal.')]));
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
      Object.entries(CATEGORIES).forEach(([key, text]) => {
        const item = button(text, 'wh-filter');
        item.dataset.category = key;
        item.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
        filters.append(item);
      });
      const status = el('div', 'wh-status');
      status.id = 'wh-record-status';
      status.setAttribute('role', 'status');
      controls.append(row, filters, status);
      const grid = el('div', 'wh-record-grid');
      grid.id = 'wh-record-grid';
      panel.append(controls, grid);
      input.addEventListener('input', () => { query = input.value.trim(); renderArchive(); });
      filters.addEventListener('click', event => {
        const item = event.target.closest('[data-category]');
        if (!item) return;
        category = item.dataset.category || 'all';
        filters.querySelectorAll('[data-category]').forEach(control => control.setAttribute('aria-pressed', control === item ? 'true' : 'false'));
        renderArchive();
      });
      return panel;
    }

    function threatLegend() {
      const box = el('section', 'wh-legend');
      box.append(el('h4', '', 'Strategic Threat Seals'));
      Object.entries(data.threatStates).forEach(([key, threat]) => {
        if (key === 'unassigned') return;
        const row = el('div', 'wh-legend-item');
        const swatch = el('span', 'wh-swatch');
        swatch.style.background = threat.css;
        row.append(swatch, el('span', '', `${threat.label} — ${sealText(threat.description)}`));
        box.append(row);
      });
      return box;
    }

    function renderMapDetails(node, records) {
      const aside = document.getElementById('wh-map-details');
      const select = document.getElementById('wh-node-select');
      if (!aside) return;
      if (select) select.value = node.id;
      aside.replaceChildren(el('p', 'wh-kicker', 'Navis Cartographica Auspex Lock'), el('h3', '', node.name));
      const meta = el('div', 'wh-meta');
      meta.append(badge(node.layer === 'guard-origin' ? 'Astra Militarum Origin System' : sealText(node.kind)), badge(data.threatStates[node.threat]?.label || 'No Threat Seal'));
      aside.append(meta);
      const facts = el('dl', 'wh-definition');
      addDef(facts, 'Survey coordinate', node.position.join(' / '));
      addDef(facts, 'Cartographica order', node.layer === 'exploratory' ? 'Unratified Explorator Contact' : 'Entered Contact');
      addDef(facts, 'Strategic notation', sealText(node.threatNote));
      addDef(facts, 'Attached dockets', records.length);
      aside.append(facts);
      records.forEach(record => {
        const linked = el('section', 'wh-linked');
        linked.append(el('h4', '', nameOf(record)), el('p', '', brief(record)));
        const open = button('Unseal Full Dossier', 'wh-button primary');
        open.addEventListener('click', () => openEntry(record.id));
        linked.append(chronicle(record), open);
        aside.append(linked);
      });
      aside.append(threatLegend());
    }

    function sealsPanel() {
      const panel = el('section');
      panel.dataset.panel = 'seals';
      panel.hidden = true;
      const intro = el('article', 'wh-panelbox');
      intro.append(el('p', 'wh-kicker', 'Adeptus Administratum · Archivum Veritatis'), el('h2', '', 'Archive Seals and Cartographic Ordinances'), el('p', '', 'These ordinances govern the names, routes, military origins, and chronicle attachments entered into the Cafarron Corridor cogitator.'));
      const grid = el('div', 'wh-docket-grid');
      const orders = el('article', 'wh-docket-card');
      orders.append(el('h3', '', 'Standing Ordinances'));
      const list = document.createElement('ol');
      [
        'Galladin, Galedin, Galladin’s Throne, and Yeldon’s Throne remain bound to one system and its local dialects.',
        'New Presidio the world and New Presidio the capital city remain separate levels of the same docket.',
        'Kertora Semoises V is entered as the fifth moon of Kertora Semoises Prime.',
        'A regiment’s deployment theatre shall not replace its registered origin system.',
        'Caldan, Tanvar, Halcyon, Ersak, Mirradon, Brannis, Draven, Vandrell, Karron, Vektran, and Caraphus are Astra Militarum origin systems.',
        'Explorator contacts retain temporary numbers until the Sector Chronicler issues permanent designations.',
        'Warp and trade lines require a Navis, Munitorum, Mechanicus, or sector command charter.'
      ].forEach(order => list.append(el('li', '', order)));
      orders.append(list);
      grid.append(orders);
      const chronicles = el('article', 'wh-docket-card');
      chronicles.append(el('h3', '', 'Attached Chronicle Index'));
      const index = el('div', 'wh-chronicle-index');
      data.records.filter(record => exactChronicle(record.source)).forEach(record => {
        const link = el('a', '', `${record.referenceId || 'ARCHIVUM'} · ${nameOf(record)} · ${record.source.label || record.keyStory}`);
        link.href = record.source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        index.append(link);
      });
      chronicles.append(index);
      grid.append(chronicles);
      const census = el('article', 'wh-docket-card');
      census.append(el('h3', '', 'Cogitator Census'));
      const facts = el('dl', 'wh-dl');
      addDef(facts, 'Sealed dockets', data.records.length);
      addDef(facts, 'Charted contacts', mapNodes.length);
      addDef(facts, 'Astra Militarum origin systems', mapNodes.filter(node => node.layer === 'guard-origin').length);
      addDef(facts, 'Primary corridors', routes.filter(route => route.layer === 'major-warp').length);
      addDef(facts, 'Munitorum trade lanes', routes.filter(route => route.layer === 'trade').length);
      addDef(facts, 'Register date', data.scopeDate);
      census.append(facts);
      grid.append(census);
      panel.append(intro, grid);
      return panel;
    }

    function section(title, text, className = 'wh-entry-section') {
      const box = el('section', className);
      box.append(el('h2', '', title), el('p', 'wh-entry-copy', text));
      return box;
    }

    function routeSection(items) {
      const box = el('section', 'wh-entry-section');
      box.append(el('h2', '', 'Sanctioned Warp and Freight Connections'));
      if (!items.length) {
        box.append(el('p', 'wh-entry-copy', 'No sanctioned corridor touches this docket in the present Navis register.'));
        return box;
      }
      const grid = el('div', 'wh-entry-route-grid');
      items.forEach(route => {
        const card = el('article', 'wh-entry-route');
        card.append(el('h3', '', route.name));
        const facts = el('dl', 'wh-entry-ledger compact');
        addDef(facts, 'Route order', sealText(route.kind));
        addDef(facts, 'Issuing authority', sealText(route.authority));
        addDef(facts, 'Licensed traffic', sealText(route.traffic));
        addDef(facts, 'Present standing', sealText(route.status));
        card.append(facts);
        grid.append(card);
      });
      box.append(grid);
      return box;
    }

    function associationSection(items) {
      const box = el('section', 'wh-entry-section');
      box.append(el('h2', '', 'Cross-Indexed Dockets'));
      if (!items.length) {
        box.append(el('p', 'wh-entry-copy', 'No cross-indexed docket is entered under the present seal.'));
        return box;
      }
      const grid = el('div', 'wh-entry-association-grid');
      items.forEach(record => {
        const card = el('article', 'wh-entry-association');
        card.append(el('p', 'wh-kicker', record.referenceId || 'ARCHIVUM'), el('h3', '', nameOf(record)), el('p', '', brief(record)));
        const open = button('Unseal Linked Dossier');
        open.addEventListener('click', () => openEntry(record.id, true));
        card.append(open);
        grid.append(card);
      });
      box.append(grid);
      return box;
    }

    function fullEntry(record) {
      const nodes = linkedNodes(record);
      const connections = linkedRoutes(record);
      const related = associated(record);
      const threat = data.threatStates[record.threat];
      const name = nameOf(record);
      const article = el('article', 'wh-entry-article');
      const masthead = el('header', 'wh-entry-masthead');
      const seal = el('div', 'wh-entry-seal', 'I');
      seal.setAttribute('aria-hidden', 'true');
      const heading = el('div', 'wh-entry-heading');
      heading.append(el('p', 'wh-kicker', 'Adeptus Administratum · Cafarron Corridor Restricted Dossier'), el('h1', '', name), el('p', 'wh-entry-subtitle', `${record.referenceId || record.id} · ${classOf(record)} · ${standingOf(record)}`));
      const status = el('div', 'wh-entry-status');
      status.append(badge(CATEGORIES[record.category] || 'Restricted Docket'));
      const threatMark = threatBadge(record);
      if (threatMark) status.append(threatMark);
      masthead.append(seal, heading, status);
      article.append(masthead);
      const abstract = el('section', 'wh-entry-abstract');
      abstract.append(el('p', 'wh-entry-ordinal', '+++ ADMINISTRATUM ABSTRACT +++'), el('p', 'wh-entry-lead', brief(record)));
      article.append(abstract);
      const columns = el('div', 'wh-entry-columns');
      const main = el('div', 'wh-entry-main');
      const sidebar = el('aside', 'wh-entry-sidebar');
      const chronicleText = record.keyStory ? `The chronicle register binds this docket to “${record.keyStory}”.` : 'No chronicle title is displayed under this access seal.';
      const relationText = (record.relationships || []).filter(item => !empty(item)).length ? ` Registered associations: ${sealText(record.relationships).join('; ')}.` : '';
      const militaryText = record.category === 'imperial-force'
        ? `${empty(record.originCandidate) ? 'No separate origin system is displayed.' : `Registered origin: ${systemName(record.originCandidate)}.`} ${empty(record.deploymentVsOrigin) ? '' : sentence(sealText(record.deploymentVsOrigin))}`
        : related.some(item => item.category === 'imperial-force') ? 'Astra Militarum formation dockets are cross-indexed below.' : 'No Astra Militarum formation is entered against this docket.';
      const coordinateText = nodes.length ? `Navis contact: ${nodes.map(node => `${node.name} at ${node.position.join(' / ')}`).join('; ')}.` : 'No point coordinate is displayed under the present Navis seal.';
      const threatText = threat ? `${threat.label}. ${sealText(threat.description)} ${sentence(sealText(record.threatNote || 'No further strategic notation is entered'))}` : 'No strategic threat seal is displayed.';
      main.append(
        section('Imperial Classification', `${name} is entered as ${classOf(record)}. ${standingOf(record)}.`),
        section('Chronicle Register', `${chronicleText}${relationText}`),
        section('World and System Condition', conditionOf(record)),
        section('Military Obligations', militaryText),
        section('Navis Cartographica Position', coordinateText),
        section('Strategic Threat Seal', threatText),
        routeSection(connections),
        associationSection(related),
        section('Archivist’s Closing Notation', 'The docket stands under the seals displayed above. Further restricted material remains in the custody of the responsible lexmechanic.', 'wh-entry-section wh-entry-closing')
      );
      const factsBox = el('section', 'wh-entry-section wh-entry-facts');
      factsBox.append(el('h2', '', 'Administratum Classification Ledger'));
      const facts = el('dl', 'wh-entry-ledger');
      addDef(facts, 'Archive reference', record.referenceId || record.id);
      addDef(facts, 'Imperial designation', name);
      addDef(facts, 'Classification', classOf(record));
      addDef(facts, 'Archive standing', standingOf(record));
      addDef(facts, 'Aliases', sealText(record.aliases || []));
      addDef(facts, 'Origin system', systemName(record.originCandidate));
      addDef(facts, 'Survey contact', nodes.map(node => node.name));
      addDef(facts, 'Survey coordinate', nodes.map(node => node.position.join(' / ')));
      addDef(facts, 'Threat seal', threat?.label);
      factsBox.append(facts);
      sidebar.append(factsBox, chronicle(record, true));
      if (record.mapNodeIds?.length) {
        const locateBox = el('section', 'wh-entry-section wh-entry-locate');
        locateBox.append(el('h2', '', 'Navis Survey Access'));
        const locate = button('Mark This Dossier on the Navis Survey', 'wh-button primary');
        locate.addEventListener('click', () => { closeEntry(); actions.locate?.(record.mapNodeIds[0]); });
        locateBox.append(locate);
        sidebar.append(locateBox);
      }
      const addenda = el('section', 'wh-entry-section wh-entry-unresolved');
      addenda.append(el('h2', '', 'Sealed Addenda'), el('p', 'wh-entry-copy', 'Further local rolls remain beyond the present access seal. Their absence from this display does not diminish the authority of the docket.'));
      sidebar.append(addenda);
      columns.append(main, sidebar);
      article.append(columns);
      const footer = el('footer', 'wh-entry-footer');
      footer.append(el('p', '', `Cafarron Corridor Strategic Archive · register ${data.version} · docket date ${data.scopeDate}`), el('p', '', '+++ THOUGHT FOR THE DAY: A RECORD PROPERLY SEALED IS A DUTY PROPERLY DISCHARGED +++'));
      article.append(footer);
      return article;
    }

    function entryHost() {
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
      const top = button('Return to Dossier Header');
      top.addEventListener('click', () => host.scrollTo({ top: 0, behavior: 'smooth' }));
      command.append(close, title, top);
      const content = el('div', 'wh-entry-page-content');
      content.id = 'wh-entry-page-content';
      host.append(command, content);
      host.addEventListener('click', event => { if (event.target.closest('[data-entry-close]')) closeEntry(); });
      document.body.append(host);
      return host;
    }

    function openEntry(id, preserveFocus = false) {
      const record = recordById.get(id);
      if (!record) return;
      if (!preserveFocus) priorFocus = document.activeElement;
      const host = entryHost();
      host.querySelector('#wh-entry-page-content').replaceChildren(fullEntry(record));
      host.hidden = false;
      host.scrollTop = 0;
      document.body.classList.add('wh-entry-open');
      host.querySelector('[data-entry-close]')?.focus({ preventScroll: true });
    }

    function closeEntry() {
      const host = document.getElementById('wh-entry-page');
      if (!host || host.hidden) return;
      host.hidden = true;
      host.querySelector('#wh-entry-page-content')?.replaceChildren();
      document.body.classList.remove('wh-entry-open');
      if (priorFocus && document.contains(priorFocus)) priorFocus.focus({ preventScroll: true });
      priorFocus = null;
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('wh-entry-page')?.hidden) closeEntry();
    });

    return Object.freeze({ el, button, addDef, archivePanel, sealsPanel, threatLegend, renderMapDetails, renderArchive, openEntry, diegeticText: sealText });
  }

  window.CafarronArchiveUIV6 = Object.freeze({ create });
})();
