(() => {
  const VIEW_ID = 'solanum-umbra';

  function switchToSolanum(button) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active',view.id === VIEW_ID));
    document.querySelectorAll('.nav-button').forEach(nav => nav.classList.toggle('active',nav === button));
  }

  function buildTab() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return null;
    let button = nav.querySelector(`[data-view="${VIEW_ID}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'nav-button';
      button.dataset.view = VIEW_ID;
      button.textContent = 'Solanum Umbra';
      nav.appendChild(button);
      button.addEventListener('click',() => switchToSolanum(button));
    }
    return button;
  }

  function buildWorkspace(button) {
    const main = document.querySelector('main');
    if (!main || document.getElementById(VIEW_ID)) return;
    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.setAttribute('aria-labelledby','solanum-umbra-title');
    section.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Solanum Umbra science-fiction workspace</p>
        <h2 id="solanum-umbra-title">Source Intake and Wiki Staging</h2>
        <p>Solanum Umbra is maintained as its own post-apocalyptic science-fantasy setting rather than being folded into the project’s fantasy corpus. Its 248-page manuscript is registered as the canonical source while the dedicated wiki remains staged for later multi-pass extraction.</p>
      </div>
      <div class="module-grid no-print">
        <article class="module-card">
          <div class="module-meta"><span class="badge status-active">source registered</span><span class="badge">248 pages</span><span class="badge status-planned">binary transfer pending</span></div>
          <h3>Solanum Umbra TTRPG Manuscript</h3>
          <p>The source receipt preserves the original filename, page count, byte count, SHA-256 checksum, intended repository path, and deferred integration status. The raw PDF is not falsely represented as present until a binary-capable transfer is completed.</p>
          <a class="primary-action" href="source-page-references/Solanum-Umbra-TTRPG.source.json" target="_blank" rel="noopener">Open Source Receipt</a>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge status-planned">wiki staged</span><span class="badge">integration deferred</span></div>
          <h3>Dedicated Solanum Umbra Wiki</h3>
          <p>The independent wiki index is established, but no source-derived packs are loaded yet. This prevents a single shallow pass from flattening or misclassifying the manuscript’s extensive science-fiction, horror, technological, magical, and post-apocalyptic material.</p>
          <a class="secondary-action" href="data/solanum-umbra/wiki/wiki-index.json" target="_blank" rel="noopener">Open Wiki Index</a>
        </article>
        <article class="module-card">
          <div class="module-meta"><span class="badge">planned passes</span></div>
          <h3>Later Integration Sequence</h3>
          <p>Future work will separate world history, the Synthesis War, surviving factions, technologies, magic and entropy, wasteland ecology, paranormal bestiary, settlements, characters, equipment, rules, and adventure material before cross-linking the setting’s own tools.</p>
        </article>
      </div>`;
    main.appendChild(section);

    const toolMenu = document.querySelector('#tools .menu-grid');
    if (toolMenu && !document.getElementById('open-solanum-umbra-card')) {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.id = 'open-solanum-umbra-card';
      card.innerHTML = '<h3>Solanum Umbra Workspace</h3><p>Dedicated science-fiction source intake, future wiki, and later campaign-tool workspace.</p><button class="link-button" type="button">Open Solanum Umbra</button>';
      card.querySelector('button').addEventListener('click',() => switchToSolanum(button));
      toolMenu.appendChild(card);
    }
  }

  function install() {
    const button = buildTab();
    if (button) buildWorkspace(button);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
