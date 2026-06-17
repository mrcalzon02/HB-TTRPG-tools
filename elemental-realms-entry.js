(() => {
  const VIEW_ID = 'elemental-realms';
  const PACKS = [
    'elemental-realms-creature-core.js',
    'elemental-realms-creatures-primary.js',
    'elemental-realms-creatures-secondary.js',
    'elemental-realms-creatures-expansions.js',
    'elemental-realms-creatures-leeches.js',
    'elemental-realms-creatures-leech-hosts.js',
    'elemental-realms-creatures-context.js'
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const list = values => Array.isArray(values) && values.length ? `<ul>${values.map(value => `<li>${esc(value)}</li>`).join('')}</ul>` : '<p>None.</p>';

  function loadStyle() {
    if (document.querySelector('link[data-elemental-realms-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'elemental-realms-wiki.css';
    link.dataset.elementalRealmsStyle = 'true';
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve,reject) => {
      const existing = document.querySelector(`script[data-elemental-pack="${src}"]`);
      if (existing?.dataset.loaded === 'true') return resolve();
      if (existing) {
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.elementalPack = src;
      script.addEventListener('load',() => { script.dataset.loaded = 'true'; resolve(); },{once:true});
      script.addEventListener('error',() => reject(new Error(`Failed to load ${src}`)),{once:true});
      document.body.appendChild(script);
    });
  }

  function switchView(button) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active',view.id === VIEW_ID));
    document.querySelectorAll('.nav-button').forEach(nav => nav.classList.toggle('active',nav === button));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function buildTab() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return null;
    let button = nav.querySelector(`[data-view="${VIEW_ID}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'nav-button';
      button.dataset.view = VIEW_ID;
      button.textContent = 'Elemental Realms';
      nav.appendChild(button);
      button.addEventListener('click',() => switchView(button));
    }
    return button;
  }

  function provenanceBadge(entry) {
    const map = {
      'manuscript-creature':['Manuscript creature','provenance-source'],
      'manuscript-adjacent-conversion':['Manuscript-adjacent','provenance-adjacent'],
      'index-derived-conversion':['Index-derived','provenance-adjacent'],
      'new-canon-expansion':['New canon expansion','provenance-expansion']
    };
    const [label,cls] = map[entry.provenance] || [entry.provenance,'provenance-adjacent'];
    return `<span class="badge ${cls}">${esc(label)}</span>`;
  }

  function linkedNames(ids) {
    const entries = window.HBElementalRealmsWiki?.entries || [];
    return (ids || []).map(id => entries.find(entry => entry.id === id)?.name || id).join(', ');
  }

  function leechClassification(entry) {
    if (entry.catalogClass !== 'leech') return '';
    return `<section class="elemental-creature-section elemental-leech-note">
      <h4>Leech Catalogue Classification</h4>
      <div class="elemental-stat-grid">
        <div><strong>Feeding Mode</strong>${esc(entry.feedingMode)}</div>
        <div><strong>Planar Affinity</strong>${esc(entry.planeAffinity)}</div>
        <div><strong>Morphology</strong>${esc(entry.morphology)}</div>
      </div>
      <p><strong>Primary sustenance:</strong> ${esc(entry.sustenance)}</p>
      <p><strong>Cataloguing dispute:</strong> ${esc(entry.catalogNotes)}</p>
    </section>`;
  }

  function hostEcology(entry) {
    if (entry.hostClass !== 'leech-host') return '';
    return `<section class="elemental-creature-section elemental-leech-note">
      <h4>Host, Prey, and Feeding-Ground Ecology</h4>
      <div class="elemental-stat-grid">
        <div><strong>Ecological Niche</strong>${esc(entry.ecologicalNiche)}</div>
        <div><strong>Associated Leeches</strong>${esc(linkedNames(entry.associatedLeeches))}</div>
        <div><strong>Feeding Grounds</strong>${esc(entry.feedingGrounds)}</div>
      </div>
      <p><strong>Breeding:</strong> ${esc(entry.breeding)}</p>
      <p><strong>Seasonal or migratory cycle:</strong> ${esc(entry.seasonalCycle)}</p>
      <p><strong>Predator pressure:</strong> ${esc(entry.predatorPressure)}</p>
      <p><strong>Leech relationship:</strong> ${esc(entry.leechRelations)}</p>
    </section>`;
  }

  function creatureCard(entry,categoryName) {
    const pages = entry.sourcePages?.length ? `Source pages: ${entry.sourcePages.join(', ')}` : 'Added after manuscript intake';
    return `<details class="elemental-creature-card" data-name="${esc(entry.name.toLowerCase())}" data-category="${esc(entry.category)}" data-provenance="${esc(entry.provenance)}">
      <summary>
        <div class="elemental-creature-meta">${provenanceBadge(entry)}<span class="badge confidence-${esc(entry.confidence)}">${esc(entry.confidence)} confidence</span><span class="badge">CR ${esc(entry.cr)}</span>${entry.catalogClass === 'leech' ? `<span class="badge">${esc(entry.feedingMode)} leech</span>` : ''}${entry.hostClass === 'leech-host' ? '<span class="badge">Leech host ecology</span>' : ''}</div>
        <h3>${esc(entry.name)}</h3>
        <p>${esc(entry.summary)}</p>
      </summary>
      <div class="elemental-creature-body">
        <div class="elemental-source-note"><strong>${esc(categoryName)}</strong><br>${esc(pages)}<br>${esc(entry.sourceBasis)}</div>
        ${leechClassification(entry)}
        ${hostEcology(entry)}
        <div><strong>${esc(entry.size)} ${esc(entry.type)}${entry.subtypes?.length ? ` (${entry.subtypes.map(esc).join(', ')})` : ''}</strong><br><span class="elemental-statline">${esc(entry.alignment)}</span></div>
        <div class="elemental-stat-grid">
          <div><strong>Initiative</strong>${esc(entry.initiative)}</div><div><strong>Senses</strong>${esc(entry.senses)}</div><div><strong>Languages</strong>${esc(entry.languages)}</div>
          <div><strong>Armor Class</strong>${esc(entry.ac)}</div><div><strong>Touch</strong>${esc(entry.touch)}</div><div><strong>Flat-Footed</strong>${esc(entry.flatFooted)}</div>
          <div><strong>Hit Points</strong>${esc(entry.hp)}</div><div><strong>Hit Dice</strong>${esc(entry.hitDice)}</div><div><strong>Saves</strong>${esc(entry.saves)}</div>
          <div><strong>Speed</strong>${esc(entry.speed)}</div><div><strong>BAB / Grapple</strong>${esc(entry.bab)} / ${esc(entry.grapple)}</div><div><strong>Space / Reach</strong>${esc(entry.space)} / ${esc(entry.reach)}</div>
          <div><strong>Abilities</strong>${esc(entry.abilities)}</div><div><strong>Environment</strong>${esc(entry.environment)}</div><div><strong>Organization</strong>${esc(entry.organization)}</div>
          <div><strong>Treasure</strong>${esc(entry.treasure)}</div><div><strong>Advancement</strong>${esc(entry.advancement)}</div><div><strong>Challenge Rating</strong>${esc(entry.cr)}</div>
        </div>
        <section class="elemental-creature-section"><h4>Attacks</h4>${list(entry.attacks)}</section>
        <section class="elemental-creature-section"><h4>Special Attacks</h4>${list(entry.specialAttacks)}</section>
        <section class="elemental-creature-section"><h4>Special Qualities</h4>${list(entry.specialQualities)}</section>
        <section class="elemental-creature-section"><h4>Skills and Feats</h4><p><strong>Skills:</strong> ${esc((entry.skills||[]).join('; ') || 'None')}</p><p><strong>Feats:</strong> ${esc((entry.feats||[]).join('; ') || 'None')}</p></section>
        <section class="elemental-creature-section"><h4>Combat</h4><p>${esc(entry.combat)}</p></section>
        <section class="elemental-creature-section"><h4>Diet</h4><p>${esc(entry.diet)}</p></section>
        <section class="elemental-creature-section"><h4>Ecology</h4><p>${esc(entry.ecology)}</p></section>
        ${entry.conversionNotes ? `<section class="elemental-creature-section"><h4>Conversion Notes</h4><p>${esc(entry.conversionNotes)}</p></section>` : ''}
      </div>
    </details>`;
  }

  function buildWorkspace(button) {
    const wiki = window.HBElementalRealmsWiki;
    const main = document.querySelector('main');
    if (!wiki || !main || document.getElementById(VIEW_ID)) return;
    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.setAttribute('aria-labelledby','elemental-realms-title');
    const sourceCount = wiki.entries.filter(entry => entry.provenance === 'manuscript-creature').length;
    const expansionCount = wiki.entries.filter(entry => entry.provenance === 'new-canon-expansion').length;
    const leechCount = wiki.entries.filter(entry => entry.catalogClass === 'leech').length;
    const hostCount = wiki.entries.filter(entry => entry.hostClass === 'leech-host').length;
    section.innerHTML = `<div class="elemental-wiki-shell">
      <div class="hero-card no-print">
        <p class="eyebrow">Chronicles of the Elemental Realms</p>
        <h2 id="elemental-realms-title">Planar Swamp Wiki and Hypertext d20 Creature References</h2>
        <p>A dedicated setting wiki for elemental swamps, amphibious beasts, guardians, spirits, arthropods, predators, prey, parasites, symbiotes, hosts, breeding grounds, and migration systems. Source lore and derived mechanics remain visibly separated.</p>
        <div class="elemental-wiki-summary"><span class="badge status-active">${wiki.entries.length} creature references</span><span class="badge">${sourceCount} detailed manuscript creatures</span><span class="badge">${expansionCount} new canon expansions</span><span class="badge">${leechCount} leech catalogue entries</span><span class="badge">${hostCount} host and prey ecologies</span><span class="badge">${wiki.categories.length} categories</span></div>
      </div>
      <article class="elemental-ecology"><h3>${esc(wiki.ecologyOverview.title)}</h3>${wiki.ecologyOverview.body.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</article>
      ${wiki.leechTreatise ? `<article class="elemental-ecology elemental-leech-treatise"><h3>${esc(wiki.leechTreatise.title)}</h3>${wiki.leechTreatise.body.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</article>` : ''}
      ${wiki.hostEcologyOverview ? `<article class="elemental-ecology"><h3>${esc(wiki.hostEcologyOverview.title)}</h3>${wiki.hostEcologyOverview.body.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</article>` : ''}
      <div class="elemental-wiki-toolbar no-print">
        <label>Search creatures<input id="elemental-search" type="search" placeholder="frog, leech, symbiote, host, breeding ground…"></label>
        <label>Wiki category<select id="elemental-category"><option value="all">All categories</option>${wiki.categories.map(category => `<option value="${esc(category.id)}">${esc(category.name)}</option>`).join('')}</select></label>
        <label>Provenance<select id="elemental-provenance"><option value="all">All provenance</option><option value="manuscript-creature">Manuscript creatures</option><option value="manuscript-adjacent-conversion">Manuscript-adjacent conversions</option><option value="index-derived-conversion">Index-derived conversions</option><option value="new-canon-expansion">New canon expansions</option></select></label>
      </div>
      <p id="elemental-result-count" class="no-print"></p>
      <div id="elemental-entry-grid" class="elemental-entry-grid"></div>
    </div>`;
    main.appendChild(section);

    const grid = section.querySelector('#elemental-entry-grid');
    const search = section.querySelector('#elemental-search');
    const category = section.querySelector('#elemental-category');
    const provenance = section.querySelector('#elemental-provenance');
    const count = section.querySelector('#elemental-result-count');
    const categoryNames = Object.fromEntries(wiki.categories.map(item => [item.id,item.name]));

    function render() {
      const query = search.value.trim().toLowerCase();
      const filtered = wiki.entries.filter(entry => {
        const haystack = [entry.name,entry.summary,entry.category,entry.diet,entry.ecology,entry.feedingMode,entry.planeAffinity,entry.sustenance,entry.catalogNotes,entry.ecologicalNiche,entry.feedingGrounds,entry.breeding,entry.seasonalCycle,entry.predatorPressure,entry.leechRelations,linkedNames(entry.associatedLeeches),...(entry.aliases||[])].filter(Boolean).join(' ').toLowerCase();
        return (!query || haystack.includes(query)) && (category.value === 'all' || entry.category === category.value) && (provenance.value === 'all' || entry.provenance === provenance.value);
      }).sort((a,b) => (categoryNames[a.category]||'').localeCompare(categoryNames[b.category]||'') || a.name.localeCompare(b.name));
      count.textContent = `${filtered.length} of ${wiki.entries.length} creature references shown.`;
      grid.innerHTML = filtered.length ? filtered.map(entry => creatureCard(entry,categoryNames[entry.category] || entry.category)).join('') : '<p class="elemental-no-results">No creature references match those filters.</p>';
    }
    search.addEventListener('input',render);
    category.addEventListener('change',render);
    provenance.addEventListener('change',render);
    render();

    const toolMenu = document.querySelector('#tools .menu-grid');
    if (toolMenu && !document.getElementById('open-elemental-realms-card')) {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.id = 'open-elemental-realms-card';
      card.innerHTML = `<h3>Elemental Realms Wiki</h3><p>${wiki.entries.length} Hypertext d20 creature references across planar swamps, including ${leechCount} leeches and ${hostCount} host or prey ecologies.</p><button class="link-button" type="button">Open Elemental Realms</button>`;
      card.querySelector('button').addEventListener('click',() => switchView(button));
      toolMenu.appendChild(card);
    }
  }

  async function install() {
    loadStyle();
    try {
      for (const pack of PACKS) await loadScript(pack);
      const button = buildTab();
      if (button) buildWorkspace(button);
    } catch (error) {
      console.error('Elemental Realms wiki failed to initialize.',error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
