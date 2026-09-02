(() => {
  'use strict';

  const ROOT_ID = 'module-workbench-root';
  const scripts = [
    'semantic-spatial-engine.js',
    'semantic-content-populator.js',
    'module-map-generator.js',
    'vessel-hull-envelope.js',
    'alien-vessel-generator.js',
    'kaysender-airship-generator.js',
    'module-viewer.js',
    'module-map-editor.js',
    'module-map-editor-bridge.js'
  ];

  const archetypes = [
    ['generic', 'Generic / custom'], ['mansion', 'Mansion / noble estate'], ['manor', 'Manor / estate'],
    ['tomb', 'Tomb / crypt / catacomb'], ['sewer', 'Sewers / drainage network'], ['fortress', 'Fortress / castle'],
    ['school', 'School / academy'], ['bunkhouse_compound', 'Bunkhouse compound / barracks'], ['arcane_university', 'Arcane University'],
    ['guildhall', 'Guildhall'], ['temple', 'Temple'], ['warehouse', 'Warehouse'], ['laboratory', 'Laboratory'],
    ['prison', 'Prison'], ['hospital', 'Hospital'], ['mine', 'Mine'], ['industrial_facility', 'Industrial facility'],
    ['hideout', 'Hideout'], ['civic_building', 'Civic building']
  ];

  const axes = [
    ['scale', 'Scale'], ['originCulture', 'Original builder culture'], ['controller', 'Current controller'],
    ['occupancyState', 'Occupation state'], ['biome', 'Biome'], ['weather', 'Weather'], ['ecology', 'Ecology'],
    ['climate', 'Climate'], ['season', 'Season'], ['condition', 'Condition'], ['waterState', 'Water state'],
    ['verticality', 'Verticality'], ['security', 'Security model'], ['defenseDoctrine', 'Defense doctrine'],
    ['magicTech', 'Magic / technology'], ['wealth', 'Wealth'], ['maintenance', 'Maintenance'],
    ['contamination', 'Contamination'], ['traffic', 'Traffic'], ['socialMode', 'Social mode'],
    ['resourceProfile', 'Resource profile'], ['secretDensity', 'Secret density'], ['lighting', 'Lighting'],
    ['narrativeTone', 'Narrative tone']
  ];

  const css = `
#modules .module-workbench{display:grid;gap:18px}
#modules .module-primary-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0}
#modules .module-primary-button{border:1px solid var(--line);border-radius:12px;padding:13px 16px;background:rgba(0,0,0,.18);color:var(--ink);font:inherit;font-weight:800;cursor:pointer}
#modules .module-primary-button:hover,#modules .module-primary-button.active{border-color:var(--accent);background:rgba(200,138,53,.16);color:var(--accent)}
#modules .module-workbench-panel{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.035);box-shadow:var(--shadow);overflow:hidden}
#modules .module-workbench-panel[hidden]{display:none!important}
#modules .module-workbench-head{padding:18px 20px 12px;border-bottom:1px solid var(--line)}
#modules .module-workbench-head h3{margin:0 0 6px;color:var(--ink)}
#modules .module-workbench-head p{margin:0;color:var(--muted);line-height:1.5}
#modules .module-workbench-body{padding:18px 20px}
#modules .dungeon-frame{max-width:1120px;margin:auto;border:1px solid var(--line);border-radius:12px;padding:14px;background:rgba(0,0,0,.12)}
#modules .dungeon-head{display:grid;grid-template-columns:2fr 1fr 1.2fr;gap:10px;border:1px solid var(--line);border-radius:9px;padding:10px;margin-bottom:12px}
#modules .dungeon-main{display:grid;grid-template-columns:minmax(350px,.9fr) minmax(430px,1.1fr);gap:14px}
#modules .dungeon-controls{display:grid;gap:9px;align-content:start}
#modules fieldset.dungeon-group{border:1px solid var(--line);border-radius:9px;padding:10px;display:grid;gap:8px}
#modules fieldset.dungeon-group legend{padding:0 7px;color:var(--accent);font-weight:800}
#modules .dungeon-row{display:grid;grid-template-columns:minmax(130px,.9fr) minmax(160px,1.1fr);gap:10px;align-items:center}
#modules .dungeon-row>span{font-weight:700;text-align:right}
#modules .dungeon-row input,#modules .dungeon-row select,#modules .dungeon-head input,#modules .dungeon-head select{width:100%;min-width:0;background:#10131a;border:1px solid var(--line);color:var(--ink);border-radius:7px;padding:7px 9px}
#modules .dungeon-head label{display:grid;gap:5px;font-weight:700}
#modules .dungeon-action{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin:11px 0}
#modules .dungeon-preview{border:1px solid var(--line);border-radius:9px;padding:10px;min-height:520px;display:flex;flex-direction:column;background:rgba(0,0,0,.14)}
#modules .dungeon-preview h4{text-align:center;margin:0 0 10px}
#modules #smm-preview{flex:1;min-height:390px;display:grid;place-items:center;overflow:auto;background:#fff;border-radius:4px;padding:8px}
#modules #smm-preview svg{display:block;max-width:100%;height:auto}
#modules #smm-preview-meta{margin-top:8px;color:var(--muted);font-size:.82rem;line-height:1.45}
#modules .advanced-grid{display:grid;gap:8px;padding-top:9px}
#modules #module-editor-host>.module-editor-card{margin:0;border:0;border-radius:0;box-shadow:none;background:transparent;padding:0}
#modules #module-editor-host .section-heading{display:none}
#modules #module-viewer-root .module-viewer-layout{grid-template-columns:minmax(420px,1.15fr) minmax(320px,.85fr);gap:14px}
#modules #module-viewer-root .module-map-card,#modules #module-viewer-root .module-detail-card,#modules #module-viewer-root .module-list-card{border-radius:9px;box-shadow:none}
#modules #module-viewer-root .module-map-wrap{border-radius:4px;background:#fff}
#modules #module-spatial-generator-root{display:none!important}
@media(max-width:980px){#modules .dungeon-head,#modules .dungeon-main,#modules #module-viewer-root .module-viewer-layout{grid-template-columns:1fr}}
@media(max-width:620px){#modules .module-primary-nav{grid-template-columns:1fr}#modules .dungeon-row{grid-template-columns:1fr}#modules .dungeon-row>span{text-align:left}#modules .module-workbench-body{padding:12px}}
`;

  function styleOnce() {
    if (document.getElementById('module-workbench-style')) return;
    const style = document.createElement('style');
    style.id = 'module-workbench-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function installThreeToolShell() {
    const modules = document.getElementById('modules');
    if (!modules) return null;
    if (document.getElementById(ROOT_ID)) return modules;
    modules.innerHTML = `
      <div class="hero-card no-print">
        <p class="eyebrow">Module workbench</p>
        <h2 id="modules-title">Modules</h2>
        <p>There are three primary module tools: the editor, the generator, and the viewer. Every format, map type, generator variant, and module record belongs inside one of those three tools rather than competing at the top level.</p>
      </div>
      <div id="${ROOT_ID}" class="module-workbench">
        <nav class="module-primary-nav no-print" aria-label="Module tools">
          <button class="module-primary-button" type="button" data-module-tool="editor">Module Editor</button>
          <button class="module-primary-button active" type="button" data-module-tool="generator" aria-current="page">Dungeon Generator</button>
          <button class="module-primary-button" type="button" data-module-tool="viewer">Module Viewer</button>
        </nav>
        <section class="module-workbench-panel" data-module-panel="editor" hidden>
          <div class="module-workbench-head"><h3>Module Editor</h3><p>Edit existing or generated maps, extract from images or PDFs, paint tiles, inspect topology, and clean module geometry.</p></div>
          <div id="module-editor-host" class="module-workbench-body"><p class="helper-note">Loading editor…</p></div>
        </section>
        <section class="module-workbench-panel" data-module-panel="generator">
          <div class="module-workbench-head"><h3>Dungeon Generator</h3><p>All dungeon, site, vessel, culture, environment, population, and layout variants are options inside this generator.</p></div>
          <div id="module-generator-root" class="module-workbench-body"><p class="helper-note">Loading generator…</p></div>
        </section>
        <section class="module-workbench-panel" data-module-panel="viewer" hidden>
          <div class="module-workbench-head"><h3>Module Viewer</h3><p>Open a module, inspect its map, and select keyed rooms, doors, traps, encounters, and source-backed records.</p></div>
          <div id="module-viewer-root" class="module-workbench-body"><p class="helper-note">Loading viewer…</p></div>
        </section>
        <div id="module-spatial-generator-root" aria-hidden="true"></div>
      </div>`;
    bindPrimaryNavigation(modules);
    return modules;
  }

  function bindPrimaryNavigation(modules) {
    modules.querySelectorAll('[data-module-tool]').forEach(button => {
      button.addEventListener('click', () => activatePanel(button.dataset.moduleTool));
    });
  }

  function activatePanel(name) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.querySelectorAll('[data-module-tool]').forEach(button => {
      const active = button.dataset.moduleTool === name;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-module-panel]').forEach(panel => {
      panel.hidden = panel.dataset.modulePanel !== name;
    });
  }

  function loadScript(src) {
    if ([...document.scripts].some(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src))) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${src} could not be loaded.`));
      document.body.appendChild(script);
    });
  }

  async function ensureRuntime() {
    for (const src of scripts) {
      if (src === 'semantic-spatial-engine.js' && window.HBSemanticSpatialEngine) continue;
      if (src === 'semantic-content-populator.js' && window.HBSemanticContentPopulator) continue;
      if (src === 'module-map-generator.js' && window.generator?.module_map) continue;
      if (src === 'vessel-hull-envelope.js' && window.HBVesselHullEnvelope) continue;
      if (src === 'alien-vessel-generator.js' && window.generator?.alien_vessel) continue;
      if (src === 'kaysender-airship-generator.js' && window.generator?.kaysender_airship) continue;
      if (src === 'module-viewer.js' && window.initModuleViewer) continue;
      if (src === 'module-map-editor.js' && window.initModuleMapEditor) continue;
      await loadScript(src);
    }
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const option = (value, label) => `<option value="${esc(value)}">${esc(label || String(value).replace(/[-_]/g, ' '))}</option>`;
  const autoOptions = axis => `<option value="">Seeded random</option>${(window.generator.module_map.SITE_OPTION_CATALOG[axis] || []).map(value => option(value)).join('')}`;
  const row = (label, body) => `<label class="dungeon-row"><span>${label}</span>${body}</label>`;
  const axisRow = (axis, label) => row(label, `<select data-axis="${axis}">${autoOptions(axis)}</select>`);
  const list = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  const val = (root, id) => root.querySelector(`#${id}`)?.value || '';
  const num = (root, id) => val(root, id) === '' ? undefined : Number(val(root, id));

  function generatorMarkup() {
    const basic = ['originCulture', 'controller', 'occupancyState', 'biome', 'weather', 'ecology'];
    const advanced = ['climate', 'season', 'waterState', 'security', 'defenseDoctrine', 'magicTech', 'wealth', 'maintenance', 'contamination', 'traffic', 'socialMode', 'resourceProfile', 'secretDensity', 'lighting', 'narrativeTone'];
    return `<div class="dungeon-frame">
      <div class="dungeon-head">
        <label>Dungeon Name<input id="smm-name" value="The Unnamed Expedition"></label>
        <label>Dungeon Level<select id="smm-level">${[1,2,3,4,5,6,7,8,9,10,12,15,18,20].map(value => option(value, value)).join('')}</select></label>
        <label>Generator Variant<select id="smm-variant"><option value="site">Dungeon / Site</option><option value="alien">Alien Vessel</option><option value="airship">Kaysender Airship</option></select></label>
      </div>
      <div class="dungeon-action"><button id="smm-random" class="secondary-action" type="button">Random Dungeon</button></div>
      <div class="dungeon-main">
        <div class="dungeon-controls">
          <fieldset class="dungeon-group"><legend>Dungeon</legend>
            ${row('Random Seed', '<input id="smm-seed" value="module-map">')}
            ${row('Dungeon Type', `<select id="smm-archetype">${archetypes.map(([value,label]) => option(value,label)).join('')}</select>`)}
            ${axisRow('scale', 'Dungeon Size')}${axisRow('verticality', 'Levels / Verticality')}${axisRow('condition', 'Condition')}
            ${row('Width Override', '<input id="smm-width" type="number" min="30" max="240" placeholder="profile default">')}
            ${row('Height Override', '<input id="smm-height" type="number" min="30" max="240" placeholder="profile default">')}
          </fieldset>
          <fieldset class="dungeon-group"><legend>Rooms, Passages & Population</legend>
            ${row('Creature Density', '<input id="smm-creature-density" type="number" min="0" max="10" value="4">')}
            ${row('Hazard Intensity', '<input id="smm-hazard-intensity" type="number" min="0" max="10" value="4">')}
            ${row('Treasure Density', '<input id="smm-treasure-density" type="number" min="0" max="10" value="4">')}
            ${row('Social Density', '<input id="smm-social-density" type="number" min="0" max="10" value="4">')}
            ${row('Preferred Creatures', '<input id="smm-creature-preferred" placeholder="fungus, undead, beast">')}
            ${row('Excluded Creatures', '<input id="smm-creature-excluded" placeholder="ooze, dragon">')}
            ${row('Preferred Hazards', '<input id="smm-hazard-preferred" placeholder="spores, structural, cold">')}
            ${row('Excluded Hazards', '<input id="smm-hazard-excluded" placeholder="radiation, lava">')}
          </fieldset>
          <fieldset class="dungeon-group"><legend>Environment, Culture & Rules</legend>
            ${basic.map(axis => axisRow(axis, axes.find(item => item[0] === axis)[1])).join('')}
            ${row('Rules Family', '<select id="smm-rules"><option value="open_d20">Open d20 / Hypertext d20-compatible</option><option value="world_of_darkness">World of Darkness</option><option value="blacklight_continuum">Blacklight Continuum</option><option value="kaysender">Kaysender</option></select>')}
            <details><summary>Additional profile controls</summary><div class="advanced-grid">${advanced.map(axis => axisRow(axis, axes.find(item => item[0] === axis)[1])).join('')}</div></details>
          </fieldset>
          <fieldset class="dungeon-group"><legend>Variant Options</legend><div id="smm-variant-fields" class="advanced-grid"></div></fieldset>
        </div>
        <section class="dungeon-preview"><h4>Preview</h4><div id="smm-preview"><span class="helper-note">Construct a dungeon to preview the layout.</span></div><div id="smm-preview-meta">No module generated yet.</div></section>
      </div>
      <div class="dungeon-action"><button id="smm-generate" class="primary-action" type="button">Construct Dungeon</button><button id="smm-edit-generated" class="secondary-action" type="button" hidden>Edit Generated Map</button><button id="smm-view-generated" class="secondary-action" type="button" hidden>View Generated Module</button></div>
      <details><summary>Generated module data</summary><pre id="smm-output" class="module-source-text"></pre></details>
    </div>`;
  }

  function variantFields(root) {
    const variant = val(root, 'smm-variant');
    const box = root.querySelector('#smm-variant-fields');
    if (variant === 'alien') {
      box.innerHTML = `${row('Vessel Profile', '<select id="smm-vessel-profile"><option value="recon">Recon</option><option value="damaged_recon">Damaged Recon</option></select>')}${row('Faction', '<input id="smm-faction" value="Alpthon">')}${row('Hull Shape', '<select id="smm-hull-shape"><option value="connected-skin">Connected Skin</option><option value="capsule">Capsule</option><option value="oval">Oval</option><option value="rectangle">Rectangle</option></select>')}${row('Damage Severity', '<input id="smm-damage" type="number" min="0" max="1" step="0.05" value="0.2">')}`;
    } else if (variant === 'airship') {
      box.innerHTML = `${row('Vessel Class', '<select id="smm-airship-class"><option>frigate patrol craft</option><option>corvette</option><option>merchant sloop</option><option>galleon cruiser</option><option>dreadnought</option></select>')}${row('Hull Culture', '<select id="smm-airship-culture"><option value="human">Human</option><option value="dwarven">Dwarven</option><option value="elven">Elven</option><option value="gnomish">Gnomish</option><option value="halfling">Halfling</option><option value="pirate">Pirate</option><option value="military">Military</option><option value="ancient">Ancient</option></select>')}${row('Purpose', '<input id="smm-airship-purpose" value="escort and patrol">')}${row('Condition', '<select id="smm-airship-condition"><option>well maintained</option><option selected>worn but serviceable</option><option>battle-scarred</option><option>storm damaged</option><option>patched</option><option>unsafe</option></select>')}`;
    } else {
      box.innerHTML = '<p class="helper-note">Dungeon / Site uses the full profile controls above.</p>';
    }
  }

  function selectedAxes(root) {
    const selected = {};
    root.querySelectorAll('[data-axis]').forEach(select => { if (select.value) selected[select.dataset.axis] = select.value; });
    return selected;
  }

  function siteInput(root) {
    const axis = selectedAxes(root);
    return {
      seed: val(root, 'smm-seed'), locationArchetype: val(root, 'smm-archetype'), siteScale: axis.scale,
      culturalInfluence: axis.originCulture, currentController: axis.controller, occupancyState: axis.occupancyState,
      biome: axis.biome, climate: axis.climate, season: axis.season, weather: axis.weather, ecology: axis.ecology,
      condition: axis.condition, waterState: axis.waterState, verticality: axis.verticality, security: axis.security,
      defenseDoctrine: axis.defenseDoctrine, magicTech: axis.magicTech, wealth: axis.wealth, maintenance: axis.maintenance,
      contamination: axis.contamination, traffic: axis.traffic, socialMode: axis.socialMode, resourceProfile: axis.resourceProfile,
      secretDensity: axis.secretDensity, lighting: axis.lighting, narrativeTone: axis.narrativeTone,
      creatureDensity: num(root, 'smm-creature-density'), hazardIntensity: num(root, 'smm-hazard-intensity'),
      treasureDensity: num(root, 'smm-treasure-density'), socialDensity: num(root, 'smm-social-density'), rulesTarget: val(root, 'smm-rules'),
      width: num(root, 'smm-width'), height: num(root, 'smm-height'),
      sitePreferences: {
        creatureFamilies: { preferred: list(val(root, 'smm-creature-preferred')), exclude: list(val(root, 'smm-creature-excluded')) },
        hazardFamilies: { preferred: list(val(root, 'smm-hazard-preferred')), exclude: list(val(root, 'smm-hazard-excluded')) }
      }
    };
  }

  function drawPreview(root, result) {
    const layout = result.spatialLayout || result;
    const rooms = layout.rooms || [];
    const preview = root.querySelector('#smm-preview');
    if (!rooms.length) {
      preview.innerHTML = '<span class="helper-note">This generator returned no rooms.</span>';
      return '';
    }
    const deck = Math.min(...rooms.map(room => Number(room.deck) || 0));
    const shown = rooms.filter(room => (Number(room.deck) || 0) === deck);
    const maxX = Math.max(...shown.map(room => room.x + room.width), 30);
    const maxY = Math.max(...shown.map(room => room.y + room.height), 30);
    const scale = 7;
    const pad = 8;
    const corridors = (layout.corridors || []).filter(corridor => (Number(corridor.deck) || 0) === deck).map(corridor => {
      const points = corridor.points || corridor.path || [];
      if (!points.length) return '';
      return `<polyline points="${points.map(point => `${pad + point.x * scale},${pad + point.y * scale}`).join(' ')}" fill="none" stroke="black" stroke-width="5" stroke-linecap="square"/>`;
    }).join('');
    const rects = shown.map((room, index) => `<g><rect x="${pad + room.x * scale}" y="${pad + room.y * scale}" width="${room.width * scale}" height="${room.height * scale}" fill="white" stroke="black" stroke-width="3"/><text x="${pad + (room.x + room.width / 2) * scale}" y="${pad + (room.y + room.height / 2) * scale}" text-anchor="middle" dominant-baseline="central" fill="black" font-size="12">${index + 1}</text></g>`).join('');
    const svg = `<svg viewBox="0 0 ${pad * 2 + maxX * scale} ${pad * 2 + maxY * scale}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${corridors}${rects}</svg>`;
    preview.innerHTML = svg;
    root.querySelector('#smm-preview-meta').textContent = `${result.displayName} · level ${result.level} · ${result.generator || layout.engine || 'module generator'} · seed ${result.seed || layout.seed} · deck ${deck + 1}/${result.deckCount || layout.deckCount || 1} · ${rooms.length} rooms total`;
    return svg;
  }

  function editorStateFromResult(result) {
    const layout = result.spatialLayout || result;
    const rooms = layout.rooms || [];
    const bounds = layout.bounds || {};
    const width = Math.max(1, Math.min(240, Number(bounds.width) || Math.max(39, ...rooms.map(room => room.x + room.width + 2))));
    const height = Math.max(1, Math.min(240, Number(bounds.height) || Math.max(39, ...rooms.map(room => room.y + room.height + 2))));
    const state = { schemaVersion:'0.1.0', tool:'module-map-editor', width, height, tileSize:1, title:result.displayName, cells:Array.from({length:height}, () => Array.from({length:width}, () => ({type:'void',label:''}))) };
    const set = (x, y, type, label = '', meta = {}) => { if (state.cells[y]?.[x]) state.cells[y][x] = { type, label, meta }; };
    rooms.filter(room => (Number(room.deck) || 0) === 0).forEach((room, index) => {
      for (let y = room.y; y < room.y + room.height; y += 1) for (let x = room.x; x < room.x + room.width; x += 1) {
        const wall = x === room.x || y === room.y || x === room.x + room.width - 1 || y === room.y + room.height - 1;
        set(x, y, wall ? 'wall' : 'floor');
      }
      const cx = Math.max(room.x + 1, Math.min(room.x + room.width - 2, room.x + Math.floor(room.width / 2)));
      const cy = Math.max(room.y + 1, Math.min(room.y + room.height - 2, room.y + Math.floor(room.height / 2)));
      set(cx, cy, 'label', String(index + 1), { id: room.nodeId || room.id, role: room.role, title: room.label });
    });
    (layout.corridors || []).filter(corridor => (Number(corridor.deck) || 0) === 0).forEach(corridor => (corridor.points || []).forEach(point => set(point.x, point.y, 'floor')));
    (layout.doors || []).filter(door => (Number(door.deck) || 0) === 0).forEach(door => set(door.x, door.y, 'door', '', { id: door.id, roomId: door.roomId }));
    (layout.connectors || []).filter(connector => (Number(connector.deck) || 0) === 0).forEach(connector => set(connector.x, connector.y, 'stairs', '', { id: connector.id }));
    return state;
  }

  function memoryModuleFromResult(result, state) {
    const layout = result.spatialLayout || result;
    const rooms = layout.rooms || [];
    const doors = layout.doors || [];
    const id = `generated-${String(result.seed || layout.seed || Date.now()).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}`;
    return {
      schemaVersion:'0.1.0', id, path:`memory:${id}`, title:result.displayName || 'Generated Module',
      subtitle:`Level ${result.level || 1} generated module`, system:result.generator || layout.engine || 'Procedural module',
      source:{notes:'Generated in-browser by the authoritative Modules Dungeon Generator.'},
      map:{image:'', width:state.width, height:state.height, grid:`${state.width} x ${state.height}`},
      hotspots:[],
      rooms:rooms.map((room, index) => ({ id:room.nodeId || room.id, number:index + 1, title:room.label || room.role || `Room ${index + 1}`, summary:room.role || '', tags:room.tags || [], deck:room.deck })),
      doors:doors.map((door, index) => ({ id:door.id || `door-${index + 1}`, label:`Door ${index + 1}`, kind:'generated', roomId:door.roomId, deck:door.deck })),
      mapEditorState:state,
      generatedResult:result
    };
  }

  function sendToViewer(result, svg, state) {
    const module = memoryModuleFromResult(result, state);
    document.dispatchEvent(new CustomEvent('module-map-editor-new-module', { detail:{ module, svg, state, title:module.title } }));
    activatePanel('viewer');
  }

  function sendToEditor(state) {
    window.initModuleMapEditor?.();
    mountEditor();
    const importBox = document.querySelector('#mme-import');
    const importButton = document.querySelector('#mme-import-json');
    if (importBox && importButton) {
      importBox.value = JSON.stringify(state);
      importButton.click();
      activatePanel('editor');
    }
  }

  function generate(root) {
    const variant = val(root, 'smm-variant');
    let result;
    if (variant === 'alien') {
      result = window.generator.alien_vessel.generate({ seed:val(root,'smm-seed'), profile:val(root,'smm-vessel-profile'), faction:val(root,'smm-faction'), hullShape:val(root,'smm-hull-shape'), damageSeverity:num(root,'smm-damage'), width:num(root,'smm-width'), height:num(root,'smm-height') });
    } else if (variant === 'airship') {
      result = window.generator.kaysender_airship.generate({ seed:val(root,'smm-seed'), name:val(root,'smm-name'), vesselClass:val(root,'smm-airship-class'), hullCulture:val(root,'smm-airship-culture'), purpose:val(root,'smm-airship-purpose'), condition:val(root,'smm-airship-condition'), width:num(root,'smm-width'), height:num(root,'smm-height') });
    } else {
      result = window.generator.module_map.generate(siteInput(root));
    }
    result.displayName = val(root, 'smm-name');
    result.level = Number(val(root, 'smm-level') || 1);
    const svg = drawPreview(root, result);
    const state = editorStateFromResult(result);
    root._lastGenerated = { result, svg, state };
    const rooms = result.spatialLayout?.rooms || [];
    root.querySelector('#smm-output').textContent = JSON.stringify({ name:result.displayName, level:result.level, generator:result.generator, seed:result.seed, deckCount:result.deckCount, rooms:rooms.map(room => ({id:room.nodeId || room.id,label:room.label,role:room.role,deck:room.deck,x:room.x,y:room.y,width:room.width,height:room.height,tags:room.tags})), content:result.content || null, compatibility:result.compatibility || null, validation:result.validation }, null, 2);
    root.querySelector('#smm-edit-generated').hidden = false;
    root.querySelector('#smm-view-generated').hidden = false;
    document.dispatchEvent(new CustomEvent('module-map-generator-output', { detail:result }));
  }

  function randomize(root) {
    root.querySelector('#smm-seed').value = String(Math.floor(Math.random() * 2147483647));
    const type = root.querySelector('#smm-archetype');
    type.selectedIndex = 1 + Math.floor(Math.random() * Math.max(1, type.options.length - 1));
    root.querySelectorAll('[data-axis]').forEach(select => { if (Math.random() < 0.55) select.selectedIndex = Math.floor(Math.random() * select.options.length); });
    generate(root);
  }

  function mountEditor() {
    const editor = document.getElementById('module-map-editor-root');
    const host = document.getElementById('module-editor-host');
    if (!editor || !host) return false;
    host.innerHTML = '';
    host.appendChild(editor);
    return true;
  }

  async function mountRuntime() {
    const root = document.getElementById('module-generator-root');
    if (!root) return;
    root.innerHTML = generatorMarkup();
    variantFields(root);
    root.querySelector('#smm-variant').addEventListener('change', () => variantFields(root));
    root.querySelector('#smm-generate').addEventListener('click', () => generate(root));
    root.querySelector('#smm-random').addEventListener('click', () => randomize(root));
    root.querySelector('#smm-edit-generated').addEventListener('click', () => { const generated = root._lastGenerated; if (generated) sendToEditor(generated.state); });
    root.querySelector('#smm-view-generated').addEventListener('click', () => { const generated = root._lastGenerated; if (generated) sendToViewer(generated.result, generated.svg, generated.state); });
    window.initModuleViewer?.();
    window.initModuleMapEditor?.();
    if (!mountEditor()) setTimeout(() => { window.initModuleMapEditor?.(); mountEditor(); }, 80);
  }

  styleOnce();
  installThreeToolShell();
  ensureRuntime().then(mountRuntime).catch(error => {
    console.error('Modules workbench failed to initialize.', error);
    const generator = document.getElementById('module-generator-root');
    if (generator) generator.innerHTML = `<p class="helper-note">The three-tool Modules shell loaded, but the generator runtime failed to initialize: ${esc(error.message)}</p>`;
  });
})();
