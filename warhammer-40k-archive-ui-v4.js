(() => {
  'use strict';

  const LABELS = Object.freeze({
    all:'All Dockets',world:'Worlds & Moons',system:'Systems',station:'Stations',
    region:'Sectors & Regions',place:'Named Sites','imperial-force':'Guard & Imperial Forces',
    unnamed:'Unnamed Bodies',alias:'Alias Control',unresolved:'Review Candidates',
    exploratory:'Exploratory Contacts'
  });

  function create(data, actions = {}) {
    let category = 'all';
    let query = '';

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
    function badge(text, className = '') { return el('span', `wh-badge ${className}`.trim(), text); }
    function addDef(dl, label, value) {
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return;
      dl.append(el('dt', '', label), el('dd', '', Array.isArray(value) ? value.join(' · ') : String(value)));
    }
    function exactSource(source) {
      return source?.status === 'verified' && /^https:\/\/www\.reddit\.com\/r\/EmperorProtects\/comments\//i.test(source.url || '');
    }
    function sourceSection(record) {
      const box = el('section', 'wh-source');
      box.append(el('h4', '', 'Archive provenance'));
      const source = record.source || {};
      if (exactSource(source)) {
        const link = el('a', '', source.label || 'Open exact story source');
        link.href = source.url; link.target = '_blank'; link.rel = 'noopener';
        box.append(link);
      } else if (source.status === 'authorial') {
        box.append(el('p', 'wh-small', source.label || 'Campaign-author directive'));
      } else {
        box.append(el('p', 'wh-pending', 'Exact story permalink not recovered. This record remains source-incomplete.'));
      }
      if (record.keyStory && record.keyStory !== source.label) box.append(el('p', 'wh-small', `Indexed story title: ${record.keyStory}`));
      return box;
    }
    function threatBadge(record) {
      if (!record.threat || ['mixed','unassigned'].includes(record.threat)) return null;
      const threat = data.threatStates[record.threat] || data.threatStates.unsurveyed;
      const item = badge(threat.label, 'wh-threat-badge');
      item.style.setProperty('--badge-color', threat.css);
      return item;
    }
    function searchable(record) {
      return [
        record.referenceId,record.name,record.shortName,...(record.aliases||[]),record.category,
        record.objectType,record.provenance,record.confidence,record.status,record.classification,
        record.summary,...(record.relationships||[]),record.originCanonStatus,record.mapStatus,
        record.keyStory,record.analystNotes,record.originCandidate,record.environment,
        record.deploymentVsOrigin,record.normalizedObject,record.threat,record.threatNote,...(record.tags||[])
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
      addDef(dl,'Object class',record.objectType);
      addDef(dl,'Archive status',record.status);
      addDef(dl,'Map handling',record.mapStatus);
      addDef(dl,'Canon / origin',record.originCanonStatus);
      addDef(dl,'Aliases',record.aliases);
      addDef(dl,'Relationships',record.relationships);
      addDef(dl,'Origin candidate',record.originCandidate);
      addDef(dl,'Environment',record.environment);
      addDef(dl,'Deployment / origin',record.deploymentVsOrigin);
      addDef(dl,'Threat notation',record.threatNote);
      addDef(dl,'Analyst note',record.analystNotes);
      card.append(dl, sourceSection(record));
      if (record.mapNodeIds?.length) {
        const locate = button('Locate in Three-Dimensional Survey','wh-button primary');
        locate.addEventListener('click', () => actions.locate?.(record.mapNodeIds[0]));
        card.append(locate);
      } else if (record.mapRegionIds?.length) {
        card.append(el('p','wh-small','Represented as a regional volume rather than a system node.'));
      }
      return card;
    }
    function renderArchive() {
      const grid = document.getElementById('wh-record-grid');
      const status = document.getElementById('wh-record-status');
      if (!grid) return;
      const records = visibleRecords();
      grid.replaceChildren(...(records.length ? records.map(recordCard) : [el('div','wh-empty','No docket matches the current seals and search terms.')]));
      if (status) status.textContent = `${records.length} of ${data.records.length} indexed dockets · source sheet ${data.scopeDate} · registry ${data.version}`;
    }
    function archivePanel() {
      const panel = el('section'); panel.dataset.panel = 'archive';
      const controls = el('section','wh-controls');
      const row = el('div','wh-searchrow');
      const label = el('label','','Search the strategic archive');
      const input = document.createElement('input');
      input.type='search'; input.placeholder='Worlds, systems, regiments, aliases, threats, stories, evidence…';
      label.append(input);
      const exportButton = button('Export Archive JSON');
      exportButton.addEventListener('click', () => actions.exportArchive?.());
      row.append(label, exportButton);
      const filters = el('div','wh-filters');
      for (const [key,text] of Object.entries(LABELS)) {
        const item = button(text,'wh-filter');
        item.dataset.category=key;
        item.setAttribute('aria-pressed',key==='all'?'true':'false');
        filters.append(item);
      }
      const status = el('div','wh-status'); status.id='wh-record-status'; status.setAttribute('role','status');
      controls.append(row,filters,status);
      const grid = el('div','wh-record-grid'); grid.id='wh-record-grid';
      panel.append(controls,grid);
      input.addEventListener('input',()=>{query=input.value.trim();renderArchive();});
      filters.addEventListener('click',event=>{
        const item=event.target.closest('[data-category]'); if(!item)return;
        category=item.dataset.category||'all';
        filters.querySelectorAll('[data-category]').forEach(candidate=>candidate.setAttribute('aria-pressed',candidate===item?'true':'false'));
        renderArchive();
      });
      return panel;
    }
    function threatLegend() {
      const box=el('section','wh-legend'); box.append(el('h4','','Primary threat-state seals'));
      for(const threat of Object.values(data.threatStates)){
        const row=el('div','wh-legend-item'); const swatch=el('span','wh-swatch');
        swatch.style.background=threat.css;
        row.append(swatch,el('span','',`${threat.label} — ${threat.description}`)); box.append(row);
      }
      return box;
    }
    function renderMapDetails(node,records) {
      const aside=document.getElementById('wh-map-details');
      const select=document.getElementById('wh-node-select');
      if(!aside)return;
      if(select)select.value=node.id;
      aside.replaceChildren(el('p','wh-kicker','Navis Cartographica selection'),el('h3','',node.name));
      const meta=el('div','wh-meta'); meta.append(badge(node.layer),badge(node.kind),badge(node.threat)); aside.append(meta);
      const dl=el('dl','wh-definition');
      addDef(dl,'Survey coordinate',node.position.join(' / '));
      addDef(dl,'Map layer',node.layer);
      addDef(dl,'Threat state',data.threatStates[node.threat]?.label||node.threat);
      addDef(dl,'Threat note',node.threatNote);
      addDef(dl,'Linked dockets',records.length);
      aside.append(dl);
      for(const record of records){
        const section=el('section','wh-linked');
        section.append(el('h4','',record.name),el('p','',record.summary||'No summary recorded.'));
        const details=el('dl','wh-definition');
        addDef(details,'Reference',record.referenceId);
        addDef(details,'Type',record.objectType);
        addDef(details,'Evidence',record.confidence);
        addDef(details,'Status',record.status);
        addDef(details,'Relationships',record.relationships);
        addDef(details,'Analyst note',record.analystNotes);
        section.append(details,sourceSection(record)); aside.append(section);
      }
      aside.append(threatLegend());
    }
    function docketPanel() {
      const panel=el('section'); panel.dataset.panel='sources'; panel.hidden=true;
      const intro=el('article','wh-panelbox');
      intro.append(
        el('p','wh-kicker','Administratum evidence control'),
        el('h2','','Source and Normalization Docket'),
        el('p','','The spreadsheet reference sheet is the governing sector index. Exact post permalinks support lore claims. Reddit pagination endpoints below are coverage-audit routes only, never citations for an individual world.')
      );
      const grid=el('div','wh-docket-grid');
      const summary=el('article','wh-docket-card'); summary.append(el('h3','','Reference-sheet census'));
      const dl=el('dl','wh-dl');
      for(const [key,value] of Object.entries(data.kpis))addDef(dl,key.replace(/([A-Z])/g,' $1'),value);
      addDef(dl,'Scope date',data.scopeDate); addDef(dl,'Coordinate authority',data.coordinateSystem.authority);
      summary.append(dl); grid.append(summary);
      const tiers=el('article','wh-docket-card'); tiers.append(el('h3','','Evidence tiers'));
      for(const tier of data.evidenceTiers){
        const item=el('section','wh-linked');
        item.append(el('h4','',tier.tier),el('p','',`${tier.use}: ${tier.meaning}`)); tiers.append(item);
      }
      grid.append(tiers);
      const rules=el('article','wh-docket-card'); rules.append(el('h3','','Normalization orders'));
      const list=document.createElement('ol'); data.normalizationRules.forEach(rule=>list.append(el('li','',rule)));
      rules.append(list); grid.append(rules);
      const coverage=el('article','wh-docket-card'); coverage.append(el('h3','','Public-feed coverage audit'));
      const table=document.createElement('table'),head=document.createElement('thead'),headRow=document.createElement('tr');
      ['Page','Posts','After token','Audit route','Notes'].forEach(text=>headRow.append(el('th','',text))); head.append(headRow);
      const body=document.createElement('tbody');
      for(const page of data.archiveCoverage){
        const row=document.createElement('tr');
        row.append(el('td','',page.page),el('td','',page.postsEnumerated),el('td','',page.afterToken||'—'));
        const cell=document.createElement('td'),link=el('a','','Open pagination audit');
        link.href=page.auditUrl; link.target='_blank'; link.rel='noopener'; cell.append(link);
        row.append(cell,el('td','',page.notes||'')); body.append(row);
      }
      table.append(head,body);
      coverage.append(table,el('p','wh-pending','Coverage routes enumerate the public feed. They are not evidence links for specific lore entries.'));
      grid.append(coverage); panel.append(intro,grid); return panel;
    }

    return Object.freeze({el,button,addDef,archivePanel,docketPanel,threatLegend,renderMapDetails,renderArchive});
  }

  window.CafarronArchiveUI=Object.freeze({create});
})();
