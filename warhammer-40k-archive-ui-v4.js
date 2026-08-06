(() => {
  'use strict';

  const ENTRY_STYLE_PATH = 'warhammer-40k-entry-pages.css?v=1';
  const LABELS = Object.freeze({
    all: 'All Dockets',
    world: 'Worlds & Moons',
    system: 'Systems',
    station: 'Stations',
    region: 'Sectors & Regions',
    place: 'Named Sites',
    'imperial-force': 'Guard & Imperial Forces',
    unnamed: 'Unnamed Bodies',
    alias: 'Alias Control',
    unresolved: 'Review Candidates',
    exploratory: 'Exploratory Contacts'
  });

  const EMPTY_VALUES = new Set([
    '', 'none stated', 'none recorded', 'no environment supplied.',
    'no plotted threat-state assignment.', 'not specified', 'unassigned'
  ]);

  function create(data, actions = {}) {
    let category = 'all';
    let query = '';
    let previousFocus = null;

    ensureEntryStyles();

    const recordById = new Map(data.records.map(record => [record.id, record]));
    const nodeById = new Map(data.mapNodes.map(node => [node.id, node]));

    function ensureEntryStyles() {
      const resolved = new URL(ENTRY_STYLE_PATH, document.baseURI).href;
      if ([...document.styleSheets].some(sheet => sheet.href === resolved)) return;
      const existing = document.querySelector('link[data-cafarron-entry-style="true"]');
      if (existing) return;
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
      return EMPTY_VALUES.has(String(value).trim().toLowerCase());
    }

    function sentence(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      return /[.!?]$/.test(text) ? text : `${text}.`;
    }

    function indefinite(value) {
      const text = String(value || '').trim();
      if (!text) return 'an unclassified object';
      return `${/^[aeiou]/i.test(text) ? 'an' : 'a'} ${text.toLowerCase()}`;
    }

    function exactSource(source) {
      return source?.status === 'verified' &&
        /^https:\/\/www\.reddit\.com\/r\/EmperorProtects\/comments\//i.test(source.url || '');
    }

    function sourceSection(record, full = false) {
      const box = el('section', full ? 'wh-entry-source' : 'wh-source');
      box.append(el(full ? 'h3' : 'h4', '', full ? 'Evidence and Source Seal' : 'Archive provenance'));
      const source = record.source || {};
      if (exactSource(source)) {
        const link = el('a', '', source.label || 'Open exact story source');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        box.append(link);
        if (full) {
          box.append(el('p', 'wh-entry-copy', 'This permalink is the exact narrative source presently attached to the docket. The archive treats it as evidence for the facts stated here, not as permission to infer details absent from the text.'));
        }
      } else if (source.status === 'authorial') {
        box.append(el('p', 'wh-small', source.label || 'Campaign-author directive'));
        if (full) {
          box.append(el('p', 'wh-entry-copy', 'This entry is sustained by a direct campaign-author determination. It is marked separately from story-grounded evidence so later revisions can preserve the distinction.'));
        }
      } else {
        box.append(el('p', 'wh-pending', 'Exact story permalink not recovered. This record remains source-incomplete.'));
        if (full) {
          box.append(el('p', 'wh-entry-copy', 'No substitute corpus link, subreddit listing, or pagination route is accepted as evidence. The docket remains open until the exact supporting story or an authorial determination is recovered.'));
        }
      }
      if (record.keyStory && record.keyStory !== source.label) {
        box.append(el('p', 'wh-small', `Indexed story title: ${record.keyStory}`));
      }
      return box;
    }

    function threatBadge(record) {
      if (!record.threat || ['mixed', 'unassigned'].includes(record.threat)) return null;
      const threat = data.threatStates[record.threat] || data.threatStates.unsurveyed;
      const item = badge(threat.label, 'wh-threat-badge');
      item.style.setProperty('--badge-color', threat.css);
      return item;
    }

    function searchable(record) {
      return [
        record.referenceId, record.name, record.shortName, ...(record.aliases || []),
        record.category, record.objectType, record.provenance, record.confidence,
        record.status, record.classification, record.summary, ...(record.relationships || []),
        record.originCanonStatus, record.mapStatus, record.keyStory, record.analystNotes,
        record.originCandidate, record.environment, record.deploymentVsOrigin,
        record.normalizedObject, record.threat, record.threatNote, ...(record.tags || [])
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
      if (!nodeIds.size) return [];
      return data.routes.filter(route => route.nodeIds?.some(id => nodeIds.has(id)));
    }

    function associatedRecords(record) {
      const associated = new Map();
      const nodeIds = new Set(record.mapNodeIds || []);
      const normalizedNames = new Set([
        record.originCandidate,
        record.normalizedObject,
        ...(record.aliases || [])
      ].filter(Boolean).map(value => String(value).trim().toLowerCase()));

      for (const candidate of data.records) {
        if (candidate.id === record.id) continue;
        const sharesNode = (candidate.mapNodeIds || []).some(id => nodeIds.has(id));
        const candidateNames = [
          candidate.name,
          candidate.originCandidate,
          candidate.normalizedObject,
          ...(candidate.aliases || [])
        ].filter(Boolean).map(value => String(value).trim().toLowerCase());
        const sharesNamedRelation = candidateNames.some(name => normalizedNames.has(name)) ||
          (candidate.originCandidate && String(candidate.originCandidate).trim().toLowerCase() === String(record.name).trim().toLowerCase()) ||
          (record.originCandidate && String(record.originCandidate).trim().toLowerCase() === String(candidate.name).trim().toLowerCase());
        if (sharesNode || sharesNamedRelation) associated.set(candidate.id, candidate);
      }
      return [...associated.values()].slice(0, 24);
    }

    function subjectKind(record) {
      if (record.category === 'imperial-force') return 'Astra Militarum or Imperial formation';
      if (record.category === 'system') return 'stellar system';
      if (record.category === 'region') return 'charted region';
      if (record.category === 'station') return 'station or installation';
      if (record.category === 'place') return 'named site';
      if (record.category === 'exploratory') return 'exploratory chart contact';
      if (/moon|satellite/i.test(record.objectType || record.classification || '')) return 'lunar or satellite body';
      if (/planet|world/i.test(record.objectType || record.classification || '')) return 'planetary body';
      if (record.category === 'unnamed') return 'unnamed celestial body';
      return 'archival subject';
    }

    function classificationCopy(record) {
      const kind = subjectKind(record);
      const object = record.objectType || record.classification || kind;
      const standing = record.status || 'unresolved';
      const evidence = record.confidence || 'unrated';
      const provenance = record.provenance || 'unspecified';
      return `${record.name} is held in the Cafarron Corridor registry as ${indefinite(object)}. ` +
        `Its present Administratum standing is “${standing},” with evidence graded ${evidence} and provenance recorded as ${provenance}. ` +
        `These seals govern what may be repeated as established fact and what must remain provisional.`;
    }

    function historyCopy(record) {
      const summary = sentence(record.summary || 'No narrative abstract has yet been recovered');
      const story = record.keyStory
        ? `The principal indexed narrative is “${record.keyStory}.”`
        : 'No principal narrative title has yet been assigned.';
      const relations = (record.relationships || []).filter(value => !isEmpty(value));
      const relationCopy = relations.length
        ? `The docket directly records the following associations: ${relations.join('; ')}.`
        : 'No additional relationship has been entered without documentary support.';
      return `${summary} ${story} ${relationCopy}`;
    }

    function environmentCopy(record) {
      if (!isEmpty(record.environment)) {
        return `The surviving environmental notation reads: ${sentence(record.environment)} ` +
          'No broader climate, biosphere, population, or infrastructure claim is made unless separately supported elsewhere in the docket.';
      }
      if (record.category === 'imperial-force') {
        return 'The archive does not possess a complete environmental description for this formation’s place of origin. ' +
          'Regimental specialization alone is not treated as proof of a homeworld climate, industry, or culture.';
      }
      if (['world', 'system', 'station', 'place', 'unnamed', 'unresolved'].includes(record.category)) {
        return 'No complete environmental survey is presently attached to this entry. ' +
          'The absence of a climate, biosphere, population, or industrial classification is preserved as an evidentiary gap rather than filled through speculation.';
      }
      return 'Environmental information is not applicable or has not yet been recovered for this subject.';
    }

    function militaryCopy(record) {
      if (record.category === 'imperial-force') {
        const formation = record.objectType || record.classification || 'Imperial formation';
        const origin = isEmpty(record.originCandidate)
          ? 'No secure homeworld or origin candidate is assigned.'
          : `The current origin candidate is ${record.originCandidate}.`;
        const distinction = isEmpty(record.deploymentVsOrigin)
          ? 'The archive has not yet separated origin evidence from deployment evidence.'
          : `The origin/deployment ruling is recorded as: ${record.deploymentVsOrigin}.`;
        return `This docket concerns ${indefinite(formation)}. ${origin} ${distinction} ` +
          'Munitorum titles, unit prefixes, and battlefield deployments are not automatically converted into planetary facts.';
      }
      const guardAssociates = associatedRecords(record).filter(item => item.category === 'imperial-force');
      if (guardAssociates.length) {
        return `${guardAssociates.length} Imperial formation docket${guardAssociates.length === 1 ? '' : 's'} presently cross-reference this location: ` +
          `${guardAssociates.map(item => item.name).join(', ')}. ` +
          'The cross-reference indicates an origin, deployment, or naming relationship only to the extent stated in each formation’s own evidence record.';
      }
      return 'No specific Astra Militarum formation or Imperial military establishment is securely attached to this entry in the current registry.';
    }

    function cartographicCopy(record, nodes, routes) {
      if (!nodes.length) {
        return 'This subject has no authoritative point coordinate in the present Navis survey. ' +
          'It remains searchable in the archive, but the cartographic office has withheld a plotted location rather than inventing one.';
      }
      const coordinates = nodes.map(node => `${node.name}: ${node.position.join(' / ')}`).join('; ');
      const routeCopy = routes.length
        ? `${routes.length} charted connection${routes.length === 1 ? '' : 's'} touch the linked node${nodes.length === 1 ? '' : 's'}.`
        : 'No major warp, trade, local-navigation, or exploratory route is presently attached.';
      return `The entry is represented by ${nodes.length} plotted contact${nodes.length === 1 ? '' : 's'} on the ${data.coordinateSystem.name}: ${coordinates}. ` +
        `${routeCopy} Coordinates are relative campaign plotting units, not official astronomical measurements.`;
    }

    function threatCopy(record, nodes) {
      const threatKey = record.threat && record.threat !== 'unassigned'
        ? record.threat
        : nodes.find(node => node.threat && node.threat !== 'unassigned')?.threat;
      const threat = threatKey ? data.threatStates[threatKey] : null;
      if (!threat) {
        return 'No threat-state seal has been assigned. This absence does not certify safety; it records only that the archive lacks sufficient classification.';
      }
      const note = !isEmpty(record.threatNote)
        ? sentence(record.threatNote)
        : sentence(nodes.find(node => !isEmpty(node.threatNote))?.threatNote || 'No additional threat notation is available');
      return `The current strategic seal is ${threat.label}. ${threat.description} ${note}`;
    }

    function evidenceCopy(record) {
      const source = record.source || {};
      if (exactSource(source)) {
        return `The entry is anchored to the exact story permalink for “${source.label || record.keyStory || record.name}.” ` +
          `Its ${record.confidence || 'unrated'} evidence grade still limits the strength of any inference beyond the words preserved in that source.`;
      }
      if (source.status === 'authorial') {
        return 'The entry is established through direct campaign-author instruction rather than a recovered story permalink. ' +
          'The distinction is retained so later narrative sources can be attached without obscuring provenance.';
      }
      return 'The exact supporting story has not yet been recovered. The entry remains useful as an index lead, but no generic corpus page or feed listing is accepted as a substitute citation.';
    }

    function archivistCopy(record) {
      if (!isEmpty(record.analystNotes)) {
        return `Archivist’s notation: ${sentence(record.analystNotes)} ` +
          'This note is interpretive control text and must not be mistaken for an independent narrative source.';
      }
      return 'No additional analyst notation has been entered. The dossier therefore ends at the boundary of the facts and classifications displayed above.';
    }

    function unresolvedMatters(record, nodes) {
      const items = [];
      if (!exactSource(record.source) && record.source?.status !== 'authorial') {
        items.push('Recover the exact story permalink or obtain a campaign-author determination.');
      }
      if (!nodes.length && !record.mapRegionIds?.length) {
        items.push('Determine whether the subject is eligible for a plotted coordinate or regional volume.');
      }
      if (!['Confirmed', 'Strong'].includes(record.confidence)) {
        items.push(`Resolve the present ${record.confidence || 'unrated'} evidence grade before promoting inferred details to canon.`);
      }
      if (/unclassified|unresolved|candidate/i.test(`${record.objectType || ''} ${record.classification || ''} ${record.status || ''}`)) {
        items.push('Resolve the object class, identity, or formal designation.');
      }
      if (isEmpty(record.environment) && ['world', 'system', 'station', 'place', 'unnamed', 'unresolved'].includes(record.category)) {
        items.push('Recover environmental, population, or infrastructure information from a direct source.');
      }
      if (!record.threat || record.threat === 'unassigned') {
        items.push('Assign a threat-state seal only after evidence is available.');
      }
      return items.length ? items : ['No unresolved archival action is presently mandated beyond routine source review.'];
    }

    function section(title, paragraphs = [], className = 'wh-entry-section') {
      const box = el('section', className);
      box.append(el('h2', '', title));
      paragraphs.filter(Boolean).forEach(text => box.append(el('p', 'wh-entry-copy', text)));
      return box;
    }

    function factTable(record, nodes) {
      const box = el('section', 'wh-entry-section wh-entry-facts');
      box.append(el('h2', '', 'Administratum Classification Ledger'));
      const dl = el('dl', 'wh-entry-ledger');
      addDef(dl, 'Archive reference', record.referenceId || record.id);
      addDef(dl, 'Designation', record.name);
      addDef(dl, 'Object or formation class', record.objectType || record.classification);
      addDef(dl, 'Archive category', LABELS[record.category] || record.category);
      addDef(dl, 'Evidence grade', record.confidence);
      addDef(dl, 'Provenance', record.provenance);
      addDef(dl, 'Archive standing', record.status);
      addDef(dl, 'Canon / origin ruling', record.originCanonStatus);
      addDef(dl, 'Map treatment', record.mapStatus);
      addDef(dl, 'Aliases', record.aliases);
      addDef(dl, 'Origin candidate', record.originCandidate);
      addDef(dl, 'Origin / deployment ruling', record.deploymentVsOrigin);
      addDef(dl, 'Survey node', nodes.map(node => node.name));
      addDef(dl, 'Survey coordinate', nodes.map(node => node.position.join(' / ')));
      addDef(dl, 'Threat seal', data.threatStates[record.threat]?.label || record.threat);
      box.append(dl);
      return box;
    }

    function routeSection(routes) {
      const box = el('section', 'wh-entry-section');
      box.append(el('h2', '', 'Warp, Trade, and Navigation Record'));
      if (!routes.length) {
        box.append(el('p', 'wh-entry-copy', 'No charted major warp corridor, trade route, local navigation leg, or exploratory spur presently touches this entry. Lack of a line is not proof of isolation; it means only that no connection is authorized in the current chart.'));
        return box;
      }
      const grid = el('div', 'wh-entry-route-grid');
      for (const route of routes) {
        const card = el('article', 'wh-entry-route');
        card.append(el('h3', '', route.name));
        const dl = el('dl', 'wh-entry-ledger compact');
        addDef(dl, 'Route class', route.kind);
        addDef(dl, 'Authority', route.authority);
        addDef(dl, 'Traffic', route.traffic);
        addDef(dl, 'Chart status', route.status);
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
        box.append(el('p', 'wh-entry-copy', 'No directly linked docket has been recovered under the current map-node, alias, or origin relationship rules.'));
        return box;
      }
      const grid = el('div', 'wh-entry-association-grid');
      for (const related of records) {
        const card = el('article', 'wh-entry-association');
        card.append(
          el('p', 'wh-kicker', related.referenceId || related.category),
          el('h3', '', related.name),
          el('p', '', related.summary || 'No summary recorded.')
        );
        const open = button('Open Cross-Indexed Dossier', 'wh-button');
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

      const article = el('article', 'wh-entry-article');
      const masthead = el('header', 'wh-entry-masthead');
      const seal = el('div', 'wh-entry-seal', 'I');
      seal.setAttribute('aria-hidden', 'true');
      const heading = el('div', 'wh-entry-heading');
      heading.append(
        el('p', 'wh-kicker', 'Adeptus Administratum · Cafarron Corridor Restricted Dossier'),
        el('h1', '', record.name),
        el('p', 'wh-entry-subtitle', `${record.referenceId || record.id} · ${record.objectType || record.classification || subjectKind(record)} · ${record.confidence || 'Unrated'} evidence`)
      );
      const status = el('div', 'wh-entry-status');
      status.append(
        badge(record.provenance || 'Unspecified'),
        badge(record.status || 'Unresolved'),
        badge(LABELS[record.category] || record.category)
      );
      const threatItem = threatBadge(record);
      if (threatItem) status.append(threatItem);
      masthead.append(seal, heading, status);
      article.append(masthead);

      const abstract = el('section', 'wh-entry-abstract');
      abstract.append(
        el('p', 'wh-entry-ordinal', '+++ ARCHIVAL ABSTRACT +++'),
        el('p', 'wh-entry-lead', `${sentence(record.summary || 'No concise abstract has yet been recovered')} ${evidenceCopy(record)}`)
      );
      article.append(abstract);

      const columns = el('div', 'wh-entry-columns');
      const main = el('div', 'wh-entry-main');
      const sidebar = el('aside', 'wh-entry-sidebar');

      main.append(
        section('Classification and Standing', [classificationCopy(record)]),
        section('Recorded Narrative History', [historyCopy(record)]),
        section('Physical and Environmental Record', [environmentCopy(record)]),
        section('Military and Strategic Assessment', [militaryCopy(record)]),
        section('Cartographic Record', [cartographicCopy(record, nodes, routes)]),
        section('Threat Assessment', [threatCopy(record, nodes)]),
        routeSection(routes),
        associationSection(associates),
        section('Archivist’s Closing Notation', [archivistCopy(record)], 'wh-entry-section wh-entry-closing')
      );

      sidebar.append(factTable(record, nodes));
      const unresolved = el('section', 'wh-entry-section wh-entry-unresolved');
      unresolved.append(el('h2', '', 'Unresolved Addenda'));
      const list = document.createElement('ol');
      unresolvedMatters(record, nodes).forEach(item => list.append(el('li', '', item)));
      unresolved.append(list);
      sidebar.append(unresolved, sourceSection(record, true));

      if (record.mapNodeIds?.length) {
        const locateBox = el('section', 'wh-entry-section wh-entry-locate');
        locateBox.append(el('h2', '', 'Navis Survey Access'));
        const locate = button('Locate This Entry in the Three-Dimensional Survey', 'wh-button primary');
        locate.addEventListener('click', () => {
          closeEntry();
          actions.locate?.(record.mapNodeIds[0]);
        });
        locateBox.append(locate);
        sidebar.append(locateBox);
      } else if (record.mapRegionIds?.length) {
        sidebar.append(section('Navis Survey Access', ['This subject is represented as a regional volume rather than a selectable point contact.']));
      }

      columns.append(main, sidebar);
      article.append(columns);

      const footer = el('footer', 'wh-entry-footer');
      footer.append(
        el('p', '', `Registry ${data.version} · source-sheet date ${data.scopeDate} · ${data.sourcePolicy}`),
        el('p', '', '+++ THOUGHT FOR THE DAY: A BLANK SPACE IN THE RECORD IS NOT LICENSE TO INVENT +++')
      );
      article.append(footer);
      return article;
    }

    function ensureEntryHost() {
      let host = document.getElementById('wh-entry-page');
      if (host) return host;
      host = el('section', 'wh-entry-page');
      host.id = 'wh-entry-page';
      host.hidden = true;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      host.setAttribute('aria-label', 'Full Cafarron Corridor archive entry');
      const command = el('header', 'wh-entry-command');
      const returnButton = button('Return to Previous Archive View', 'wh-button primary');
      returnButton.dataset.entryClose = 'true';
      const title = el('span', 'wh-entry-command-title', 'Administratum Full Dossier');
      const top = button('Return to Dossier Top', 'wh-button');
      top.addEventListener('click', () => host.scrollTo({ top: 0, behavior: 'smooth' }));
      command.append(returnButton, title, top);
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
      const content = host.querySelector('#wh-entry-page-content');
      content.replaceChildren(fullEntry(record));
      host.hidden = false;
      document.body.classList.add('wh-entry-open');
      host.scrollTop = 0;
      const close = host.querySelector('[data-entry-close]');
      close?.focus({ preventScroll: true });
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

    function recordCard(record) {
      const card = el('article', 'wh-record');
      const meta = el('div', 'wh-meta');
      meta.append(
        badge(record.referenceId || 'ARCHIVE'),
        badge(LABELS[record.category] || record.category),
        badge(record.confidence || 'Unrated'),
        badge(record.provenance || 'Unspecified')
      );
      const threat = threatBadge(record);
      if (threat) meta.append(threat);
      card.append(meta, el('h3', '', record.name), el('p', '', record.summary || 'No summary recorded.'));
      const dl = el('dl', 'wh-definition');
      addDef(dl, 'Object class', record.objectType);
      addDef(dl, 'Archive status', record.status);
      addDef(dl, 'Map handling', record.mapStatus);
      addDef(dl, 'Canon / origin', record.originCanonStatus);
      addDef(dl, 'Aliases', record.aliases);
      addDef(dl, 'Relationships', record.relationships);
      addDef(dl, 'Origin candidate', record.originCandidate);
      addDef(dl, 'Environment', record.environment);
      addDef(dl, 'Deployment / origin', record.deploymentVsOrigin);
      addDef(dl, 'Threat notation', record.threatNote);
      addDef(dl, 'Analyst note', record.analystNotes);
      card.append(dl, sourceSection(record));

      const actionsRow = el('div', 'wh-entry-card-actions');
      const open = button('Open Full Diegetic Wiki Entry', 'wh-button primary');
      open.addEventListener('click', () => openEntry(record.id));
      actionsRow.append(open);
      if (record.mapNodeIds?.length) {
        const locate = button('Locate in Three-Dimensional Survey', 'wh-button');
        locate.addEventListener('click', () => actions.locate?.(record.mapNodeIds[0]));
        actionsRow.append(locate);
      } else if (record.mapRegionIds?.length) {
        actionsRow.append(el('p', 'wh-small', 'Represented as a regional volume rather than a system node.'));
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
        : [el('div', 'wh-empty', 'No docket matches the current seals and search terms.')]));
      if (status) {
        status.textContent = `${records.length} of ${data.records.length} indexed dockets · every listed docket opens as a full-page entry · source sheet ${data.scopeDate} · registry ${data.version}`;
      }
    }

    function archivePanel() {
      const panel = el('section');
      panel.dataset.panel = 'archive';
      const controls = el('section', 'wh-controls');
      const row = el('div', 'wh-searchrow');
      const label = el('label', '', 'Search the strategic archive');
      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = 'Worlds, systems, regiments, aliases, threats, stories, evidence…';
      label.append(input);
      const exportButton = button('Export Archive JSON');
      exportButton.addEventListener('click', () => actions.exportArchive?.());
      row.append(label, exportButton);
      const filters = el('div', 'wh-filters');
      for (const [key, text] of Object.entries(LABELS)) {
        const item = button(text, 'wh-filter');
        item.dataset.category = key;
        item.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
        filters.append(item);
      }
      const note = el('p', 'wh-note', 'Each indexed world, moon, system, Guard formation, site, and unresolved chart contact now opens as a complete Administratum dossier. Unknown facts remain explicitly unknown rather than being replaced with decorative invention.');
      const status = el('div', 'wh-status');
      status.id = 'wh-record-status';
      status.setAttribute('role', 'status');
      controls.append(row, filters, note, status);
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
      box.append(el('h4', '', 'Primary threat-state seals'));
      for (const threat of Object.values(data.threatStates)) {
        const row = el('div', 'wh-legend-item');
        const swatch = el('span', 'wh-swatch');
        swatch.style.background = threat.css;
        row.append(swatch, el('span', '', `${threat.label} — ${threat.description}`));
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
        el('p', 'wh-kicker', 'Navis Cartographica selection'),
        el('h3', '', node.name)
      );
      const meta = el('div', 'wh-meta');
      meta.append(badge(node.layer), badge(node.kind), badge(node.threat));
      aside.append(meta);
      const dl = el('dl', 'wh-definition');
      addDef(dl, 'Survey coordinate', node.position.join(' / '));
      addDef(dl, 'Map layer', node.layer);
      addDef(dl, 'Threat state', data.threatStates[node.threat]?.label || node.threat);
      addDef(dl, 'Threat note', node.threatNote);
      addDef(dl, 'Linked dockets', records.length);
      aside.append(dl);
      for (const record of records) {
        const linked = el('section', 'wh-linked');
        linked.append(el('h4', '', record.name), el('p', '', record.summary || 'No summary recorded.'));
        const details = el('dl', 'wh-definition');
        addDef(details, 'Reference', record.referenceId);
        addDef(details, 'Type', record.objectType);
        addDef(details, 'Evidence', record.confidence);
        addDef(details, 'Status', record.status);
        addDef(details, 'Relationships', record.relationships);
        addDef(details, 'Analyst note', record.analystNotes);
        const open = button('Open Full Diegetic Wiki Entry', 'wh-button primary');
        open.addEventListener('click', () => openEntry(record.id));
        linked.append(details, sourceSection(record), open);
        aside.append(linked);
      }
      aside.append(threatLegend());
    }

    function docketPanel() {
      const panel = el('section');
      panel.dataset.panel = 'sources';
      panel.hidden = true;
      const intro = el('article', 'wh-panelbox');
      intro.append(
        el('p', 'wh-kicker', 'Administratum evidence control'),
        el('h2', '', 'Source and Normalization Docket'),
        el('p', '', 'The spreadsheet reference sheet is the governing sector index. Exact post permalinks support lore claims. Reddit pagination endpoints below are coverage-audit routes only, never citations for an individual world.')
      );
      const grid = el('div', 'wh-docket-grid');
      const summary = el('article', 'wh-docket-card');
      summary.append(el('h3', '', 'Reference-sheet census'));
      const dl = el('dl', 'wh-dl');
      for (const [key, value] of Object.entries(data.kpis)) addDef(dl, key.replace(/([A-Z])/g, ' $1'), value);
      addDef(dl, 'Scope date', data.scopeDate);
      addDef(dl, 'Coordinate authority', data.coordinateSystem.authority);
      addDef(dl, 'Full-page dossier coverage', `${data.records.length} indexed entries`);
      summary.append(dl);
      grid.append(summary);

      const tiers = el('article', 'wh-docket-card');
      tiers.append(el('h3', '', 'Evidence tiers'));
      for (const tier of data.evidenceTiers) {
        const item = el('section', 'wh-linked');
        item.append(el('h4', '', tier.tier), el('p', '', `${tier.use}: ${tier.meaning}`));
        tiers.append(item);
      }
      grid.append(tiers);

      const rules = el('article', 'wh-docket-card');
      rules.append(el('h3', '', 'Normalization orders'));
      const list = document.createElement('ol');
      data.normalizationRules.forEach(rule => list.append(el('li', '', rule)));
      rules.append(list);
      grid.append(rules);

      const coverage = el('article', 'wh-docket-card');
      coverage.append(el('h3', '', 'Public-feed coverage audit'));
      const table = document.createElement('table');
      const head = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Page', 'Posts', 'After token', 'Audit route', 'Notes'].forEach(text => headRow.append(el('th', '', text)));
      head.append(headRow);
      const body = document.createElement('tbody');
      for (const page of data.archiveCoverage) {
        const row = document.createElement('tr');
        row.append(el('td', '', page.page), el('td', '', page.postsEnumerated), el('td', '', page.afterToken || '—'));
        const cell = document.createElement('td');
        const link = el('a', '', 'Open pagination audit');
        link.href = page.auditUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        cell.append(link);
        row.append(cell, el('td', '', page.notes || ''));
        body.append(row);
      }
      table.append(head, body);
      coverage.append(table, el('p', 'wh-pending', 'Coverage routes enumerate the public feed. They are not evidence links for specific lore entries.'));
      grid.append(coverage);
      panel.append(intro, grid);
      return panel;
    }

    return Object.freeze({
      el,
      button,
      addDef,
      archivePanel,
      docketPanel,
      threatLegend,
      renderMapDetails,
      renderArchive,
      openEntry,
      closeEntry
    });
  }

  window.CafarronArchiveUI = Object.freeze({ create });
})();