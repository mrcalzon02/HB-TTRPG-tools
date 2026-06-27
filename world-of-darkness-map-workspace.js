(() => {
  'use strict';

  const MAP_ENGINES = new Set(['location', 'urban']);
  const LINE_TITLES = {
    unified: 'Unified World of Darkness',
    vampire: 'Vampire: The Masquerade',
    werewolf: 'Werewolf: The Apocalypse',
    breeds: 'Werewolf Changing Breeds',
    hunter: 'Hunter: The Reckoning',
    changeling: 'Changeling',
    mage: 'Mage: The Awakening'
  };

  const PRESSURES = [
    ['Quiet Observation', 'A hidden watcher records the group without acting.', 'Identify the observer before the next scene.'],
    ['Municipal Intervention', 'Permits, inspections, closures, or code enforcement threaten the arrangement.', 'A mundane deadline advances whenever attention rises.'],
    ['Faction Challenge', 'A rival faction makes a deniable territorial claim.', 'The first overt power use changes local influence.'],
    ['Human Witness', 'A civilian has noticed the pattern and is collecting evidence.', 'The witness can become an asset, liability, or dependent.'],
    ['Corporate Acquisition', 'A shell company is buying, demolishing, or securitizing the site.', 'Trace ownership to reveal the supernatural beneficiary.'],
    ['Spiritual Disturbance', 'The Gauntlet, Dreaming, Shadow, resonance, or occult geometry destabilizes.', 'Add one environmental manifestation per unresolved scene.'],
    ['Internal Betrayal', 'Someone inside the controlling group trades access for protection.', 'A trusted relationship begins compromised.']
  ];

  const URBAN_PROTOTYPES = [
    ['Back Alley', 'Transit', 'Grease traps and electronic waste choke a narrow service corridor.', 'Nosferatu dead-drop behind humming AC units.', 'Weaver choke point swarming with Pattern Spiders.', 'Technocratic tracking vector spoofing local network identifiers.', 'A disputed intelligence corridor.'],
    ['24-Hour Laundromat', 'Commercial', 'Flickering fluorescent lights wash rusted machines in detergent haze.', 'Anarch feeding ground and unmapped meeting blind spot.', 'Apathy spirits cling to broken machines.', 'Coincidental sanctum hidden in one machine rhythm.', 'A neutral exchange point taxed by local predators.'],
    ['Subway Station', 'Transit', 'Brake dust, emergency lights, and rail screams fill concrete platforms.', 'Patrolled domain border marked with ultraviolet wards.', 'Rat-Spirit warren beneath the platforms.', 'Subsurface anomaly-monitoring outpost.', 'Control determines movement between three territories.'],
    ['Condemned Tenement', 'Abandoned', 'Boarded windows and exposed rebar conceal unsafe rooms.', 'Hollow haven for desperate neonates.', 'Bane infestation fed by historic suffering.', 'Inverted geometry and corrupt occult residue.', 'Demolition threatens every hidden claimant.'],
    ['Rooftop Parking Deck', 'Industrial', 'Rain and gasoline haze hang over an exposed skyline.', 'Harpy vantage point and temporary neutral ground.', 'Wind-spirit glade anchor above the smog.', 'Etherite observation node.', 'Prestige site claimed through guaranteed privacy.'],
    ['Corner Deli', 'Commercial', 'Cheap groceries, hot grease, neon signs, and bulletproof glass.', 'Owner pays a blood tithe for protection.', 'Gluttony and anxiety spirits fight near the grill.', 'Folk charms hide in lottery-ticket arrangements.', 'A neighborhood information exchange.'],
    ['Botanical Greenhouse', 'Green Space', 'Humid glass preserves tropical plants, insects, and failing irrigation.', 'Gangrel sanctuary using roots as an intelligence network.', 'Rare Wyld pocket with a thin Gauntlet.', 'Living-pattern node disguised as botany.', 'Donors, officials, and supernatural custodians feud.'],
    ['Salvage Yard', 'Industrial', 'Crushed vehicles and leaking oil form canyons of scrap.', 'Brujah staging ground hidden by machinery noise.', 'Weaver-Wyrm warzone among toxic machine spirits.', 'Symbolic forge for modern artifacts.', 'Workers, criminals, buyers, and occultists compete.'],
    ['Steam Vault', 'Subterranean', 'Old copper valves blast white vapor into the night.', 'Sewer escape hatch bypassing street pursuit.', 'Volatile steam-elemental nest.', 'Thermal alchemical matrix.', 'Valve control grants routes, heat, and evidence disposal.'],
    ['Historic Churchyard', 'Green Space', 'Slate tombstones stand behind iron gates and ancient oaks.', 'Hecata vault anchoring necromantic transactions.', 'Silent verge pressed close to the Shadowlands.', 'High-faith node resisting dark sorcery.', 'Clergy, developers, preservationists, and the dead struggle.']
  ];

  let generation = null;
  let selectedIndex = -1;
  let revision = 0;
  let installed = false;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function variantFor(seed) {
    const number = hash(seed) % 70;
    return [number, Math.floor(number / 7), number % 7];
  }

  function currentInput() {
    return {
      engine: document.getElementById('wod-engine')?.value || 'location',
      line: document.getElementById('wod-line')?.value || 'unified',
      seed: document.getElementById('wod-seed')?.value.trim() || 'Unnamed urban domain',
      lat: Number(document.getElementById('wod-lat')?.value),
      lon: Number(document.getElementById('wod-lon')?.value)
    };
  }

  function lineTitle(line) {
    return LINE_TITLES[line] || line;
  }

  function adaptLine(line, prototype) {
    if (line === 'vampire') return prototype[3];
    if (line === 'werewolf' || line === 'breeds') return prototype[4];
    if (line === 'mage') return prototype[5];
    if (line === 'changeling') return 'A Dreaming reflection, oath pressure, and hidden trod attach themselves to this mundane site.';
    if (line === 'hunter') return 'The observable evidence is incomplete; every supernatural explanation may be a clue, a cover story, or deliberate misinformation.';
    return [prototype[3], prototype[4], prototype[5]].join(' | ');
  }

  function injectStyles() {
    if (document.getElementById('wod-map-workspace-style')) return;
    const style = document.createElement('style');
    style.id = 'wod-map-workspace-style';
    style.textContent = `
      .wod-map-workspace{margin-top:18px;border-top:1px solid var(--line);padding-top:18px}
      .wod-map-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
      .wod-map-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.8fr);gap:14px;align-items:start}
      .wod-map-panel,.wod-map-details{border:1px solid var(--line);border-radius:16px;background:rgba(0,0,0,.18);overflow:hidden}
      .wod-map-frame{position:relative;min-height:520px;background:#111;overflow:hidden}
      .wod-map-frame iframe{width:100%;height:520px;border:0;display:block;pointer-events:none;filter:saturate(.72) contrast(1.05) brightness(.82)}
      .wod-map-markers{position:absolute;inset:0;pointer-events:none}
      .wod-map-marker{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;border:2px solid #fff;background:#7b1d28;color:#fff;font-weight:900;box-shadow:0 2px 12px #000;pointer-events:auto;cursor:pointer}
      .wod-map-marker:hover,.wod-map-marker.active{background:var(--accent);color:#111;z-index:3;scale:1.12}
      .wod-map-label{position:absolute;left:12px;bottom:12px;max-width:72%;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.84);color:#fff;font-size:.78rem;pointer-events:none}
      .wod-map-site-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;padding:10px}
      .wod-map-site-button{border:1px solid var(--line);border-radius:11px;padding:9px;text-align:left;background:rgba(255,255,255,.025);color:var(--ink)}
      .wod-map-site-button.active,.wod-map-site-button:hover{border-color:var(--accent);background:rgba(200,138,53,.1)}
      .wod-map-site-button small{display:block;color:var(--muted);margin-top:3px}
      .wod-map-details{padding:16px;position:sticky;top:12px}
      .wod-map-details h3{margin-top:0}
      .wod-map-detail-grid{display:grid;gap:9px}
      .wod-map-detail{border-left:3px solid var(--accent);padding:8px;background:rgba(255,255,255,.025)}
      .wod-map-detail strong{display:block;color:var(--ink);margin-bottom:3px}
      .wod-map-coordinate{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--accent)}
      .wod-map-empty{color:var(--muted);padding:18px}
      .wod-map-external{display:inline-flex;margin-top:12px;text-decoration:none}
      .wod-map-note{color:var(--muted);font-size:.82rem;margin:8px 12px 0}
      @media(max-width:900px){.wod-map-layout{grid-template-columns:1fr}.wod-map-details{position:static}.wod-map-frame,.wod-map-frame iframe{height:440px;min-height:440px}}
    `;
    document.head.appendChild(style);
  }

  function buildWorkspace() {
    const box = document.querySelector('#world-of-darkness .wod-box');
    const actions = box?.querySelector('.prototype-actions');
    if (!box || !actions) return false;
    if (document.getElementById('wod-map-workspace')) return true;

    injectStyles();
    const section = document.createElement('section');
    section.id = 'wod-map-workspace';
    section.className = 'wod-map-workspace';
    section.setAttribute('aria-labelledby', 'wod-map-title');
    section.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Interactive urban overlay</p>
        <h3 id="wod-map-title">Google Maps Mystification Window</h3>
        <p>Generate supernatural sites over a real-world map. Clicking a numbered marker or its location card automatically opens the complete mundane, supernatural, political, and mechanical record.</p>
      </div>
      <div class="wod-map-toolbar">
        <button id="wod-map-generate" class="primary-action">Generate Five Locations</button>
        <button id="wod-map-add" class="secondary-action" disabled>Add Generated Location</button>
        <button id="wod-map-reroll" class="secondary-action" disabled>Regenerate Selected</button>
        <button id="wod-map-center" class="secondary-action">Center on Base Location</button>
        <button id="wod-map-position" class="secondary-action">Use Browser Location</button>
      </div>
      <div class="wod-map-layout">
        <div class="wod-map-panel">
          <div class="wod-map-frame">
            <iframe id="wod-map-frame" title="Google Maps view of the generated World of Darkness urban overlay" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
            <div id="wod-map-markers" class="wod-map-markers" aria-label="Generated clickable supernatural locations"></div>
            <div id="wod-map-label" class="wod-map-label">Generate an overlay to place clickable locations on the map.</div>
          </div>
          <p class="wod-map-note">The embedded map remains fixed at the base location so the generated marker overlay stays aligned. The selected-location panel opens a fully interactive Google Maps page for panning, Street View, and nearby-place research.</p>
          <div id="wod-map-site-list" class="wod-map-site-list"></div>
        </div>
        <aside id="wod-map-details" class="wod-map-details" aria-live="polite">
          <div class="wod-map-empty">Generate an Urban Mystification or Unified Location overlay, then click a numbered marker.</div>
        </aside>
      </div>`;

    actions.insertAdjacentElement('afterend', section);
    document.getElementById('wod-map-generate').addEventListener('click', generateOverlay);
    document.getElementById('wod-map-add').addEventListener('click', addSite);
    document.getElementById('wod-map-reroll').addEventListener('click', regenerateSelected);
    document.getElementById('wod-map-center').addEventListener('click', centerMap);
    document.getElementById('wod-map-position').addEventListener('click', useBrowserLocation);
    document.getElementById('wod-engine').addEventListener('change', updateVisibility);
    centerMap();
    updateVisibility();
    return true;
  }

  function updateVisibility() {
    const workspace = document.getElementById('wod-map-workspace');
    const mapMode = MAP_ENGINES.has(currentInput().engine);
    if (workspace) workspace.hidden = !mapMode;
    const originalGenerate = document.getElementById('wod-go');
    if (originalGenerate && mapMode) {
      originalGenerate.textContent = currentInput().engine === 'urban'
        ? 'Generate Urban Mystification Overlay'
        : 'Generate Location Overlay';
    }
  }

  function interceptOriginalControls(event) {
    const control = event.target.closest?.('button,a');
    if (!control || !MAP_ENGINES.has(currentInput().engine)) return;
    if (!['wod-go', 'wod-copy', 'wod-geo', 'wod-kml'].includes(control.id)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (control.id === 'wod-go') generateOverlay();
    if (control.id === 'wod-copy') copyJson();
    if (control.id === 'wod-geo') exportGeoJson();
    if (control.id === 'wod-kml') exportKml();
  }

  function createSite(input, index, siteRevision = 0) {
    const variant = variantFor(`${input.seed}|${input.line}|${input.engine}|${index}|${siteRevision}`);
    const prototype = URBAN_PROTOTYPES[variant[1]];
    const pressure = PRESSURES[variant[2]];
    const radius = 0.0025 + (hash(`${input.seed}|${index}|${siteRevision}|radius`) % 1000) / 1000 * 0.0075;
    const angle = (hash(`${input.seed}|${index}|${siteRevision}|angle`) % 360) * Math.PI / 180;
    const latitude = input.lat + Math.sin(angle) * radius;
    const longitudeScale = Math.max(Math.cos(input.lat * Math.PI / 180), 0.25);
    const longitude = input.lon + Math.cos(angle) * radius / longitudeScale;

    return {
      id: `wod-site-${hash(`${input.seed}|${index}|${siteRevision}`)}`,
      name: `${prototype[0]} ${index + 1}`,
      category: prototype[1],
      coordinates: [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))],
      mundane: prototype[2],
      kindredLayer: prototype[3],
      umbralLayer: prototype[4],
      awakenedLayer: prototype[5],
      selectedLayer: adaptLine(input.line, prototype),
      politics: prototype[6],
      pressure: pressure[0],
      effect: pressure[1],
      mechanic: pressure[2],
      variant: variant[0] + 1,
      sourcePrototype: variant[1] + 1,
      pressureVariant: variant[2] + 1,
      revision: siteRevision
    };
  }

  function generateOverlay() {
    const input = currentInput();
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) {
      setResult('A valid latitude and longitude are required before an overlay can be generated.');
      return;
    }

    revision = 0;
    generation = {
      engine: input.engine === 'urban' ? 'Urban Mystification Engine' : 'Unified Location and Political Overlay',
      engineId: input.engine,
      seed: input.seed,
      line: input.line,
      lineTitle: lineTitle(input.line),
      center: { lat: input.lat, lon: input.lon },
      sites: Array.from({ length: 5 }, (_, index) => createSite(input, index, revision))
    };
    selectedIndex = 0;
    syncGeoJson();
    renderOverlay();
    enableControls();
  }

  function syncGeoJson() {
    if (!generation?.sites) return;
    generation.geojson = {
      type: 'FeatureCollection',
      features: generation.sites.map(site => ({
        type: 'Feature',
        properties: { ...site, coordinates: undefined },
        geometry: { type: 'Point', coordinates: site.coordinates }
      }))
    };
  }

  function enableControls() {
    ['wod-copy', 'wod-geo', 'wod-kml', 'wod-map-add'].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.disabled = false;
    });
    document.getElementById('wod-map-reroll').disabled = selectedIndex < 0;
  }

  function googleEmbedUrl(lat, lon, zoom = 15) {
    return `https://www.google.com/maps?q=${Number(lat)},${Number(lon)}&z=${zoom}&output=embed`;
  }

  function googleOpenUrl(site) {
    return `https://www.google.com/maps/search/?api=1&query=${site.coordinates[1]},${site.coordinates[0]}`;
  }

  function centerMap() {
    const input = currentInput();
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) return;
    const frame = document.getElementById('wod-map-frame');
    if (frame) frame.src = googleEmbedUrl(input.lat, input.lon);
    const label = document.getElementById('wod-map-label');
    if (label) label.textContent = `${input.seed} · ${input.lat.toFixed(5)}, ${input.lon.toFixed(5)}`;
  }

  function markerPosition(site) {
    const center = generation.center;
    const maxLat = Math.max(0.006, ...generation.sites.map(item => Math.abs(item.coordinates[1] - center.lat)));
    const maxLon = Math.max(0.006, ...generation.sites.map(item => Math.abs(item.coordinates[0] - center.lon)));
    return {
      left: Math.max(8, Math.min(92, 50 + ((site.coordinates[0] - center.lon) / maxLon) * 38)),
      top: Math.max(8, Math.min(92, 50 - ((site.coordinates[1] - center.lat) / maxLat) * 38))
    };
  }

  function renderOverlay() {
    if (!generation?.sites) return;
    centerMap();
    const markers = document.getElementById('wod-map-markers');
    const list = document.getElementById('wod-map-site-list');
    markers.innerHTML = '';
    list.innerHTML = '';

    generation.sites.forEach((site, index) => {
      const position = markerPosition(site);
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `wod-map-marker ${index === selectedIndex ? 'active' : ''}`;
      marker.style.left = `${position.left}%`;
      marker.style.top = `${position.top}%`;
      marker.textContent = String(index + 1);
      marker.title = `${site.name}: ${site.category}`;
      marker.setAttribute('aria-label', `Select ${site.name}`);
      marker.addEventListener('click', () => selectSite(index));
      markers.appendChild(marker);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `wod-map-site-button ${index === selectedIndex ? 'active' : ''}`;
      card.innerHTML = `<strong>${index + 1}. ${escapeHtml(site.name)}</strong><small>${escapeHtml(site.category)} · ${escapeHtml(site.pressure)}</small>`;
      card.addEventListener('click', () => selectSite(index));
      list.appendChild(card);
    });

    renderSelected();
    setResult(`<strong>${escapeHtml(generation.engine)}</strong> generated ${generation.sites.length} clickable locations for ${escapeHtml(generation.lineTitle)}. Select any marker to display its full record automatically.`);
  }

  function selectSite(index) {
    if (!generation?.sites?.[index]) return;
    selectedIndex = index;
    document.querySelectorAll('.wod-map-marker').forEach((marker, markerIndex) => marker.classList.toggle('active', markerIndex === index));
    document.querySelectorAll('.wod-map-site-button').forEach((button, buttonIndex) => button.classList.toggle('active', buttonIndex === index));
    document.getElementById('wod-map-reroll').disabled = false;
    renderSelected();
  }

  function detail(label, value) {
    return `<div class="wod-map-detail"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
  }

  function renderSelected() {
    const target = document.getElementById('wod-map-details');
    const site = generation?.sites?.[selectedIndex];
    if (!target || !site) return;

    target.innerHTML = `
      <p class="eyebrow">Selected generated location ${selectedIndex + 1}</p>
      <h3>${escapeHtml(site.name)}</h3>
      <p class="wod-map-coordinate">${site.coordinates[1].toFixed(6)}, ${site.coordinates[0].toFixed(6)}</p>
      <div class="wod-map-detail-grid">
        ${detail('Mundane footprint', `${site.category}: ${site.mundane}`)}
        ${detail(`${generation.lineTitle} layer`, site.selectedLayer)}
        ${detail('Kindred layer', site.kindredLayer)}
        ${detail('Umbral layer', site.umbralLayer)}
        ${detail('Awakened vector', site.awakenedLayer)}
        ${detail('Domain politics', site.politics)}
        ${detail(site.pressure, site.effect)}
        ${detail('Mechanical seed', site.mechanic)}
        ${detail('Deterministic variant', `${site.variant} of 70 · prototype ${site.sourcePrototype} · pressure ${site.pressureVariant}`)}
      </div>
      <a class="primary-action wod-map-external" target="_blank" rel="noopener" href="${googleOpenUrl(site)}">Open Selected Location in Google Maps</a>`;
  }

  function addSite() {
    if (!generation?.sites) return generateOverlay();
    revision += 1;
    const input = currentInput();
    generation.sites.push(createSite(input, generation.sites.length, revision));
    selectedIndex = generation.sites.length - 1;
    syncGeoJson();
    renderOverlay();
    enableControls();
  }

  function regenerateSelected() {
    if (!generation?.sites?.[selectedIndex]) return;
    revision += 1;
    generation.sites[selectedIndex] = createSite(currentInput(), selectedIndex, revision);
    syncGeoJson();
    renderOverlay();
    enableControls();
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) return setResult('This browser does not expose geolocation.');
    setResult('Requesting the browser location…');
    navigator.geolocation.getCurrentPosition(position => {
      document.getElementById('wod-lat').value = position.coords.latitude.toFixed(6);
      document.getElementById('wod-lon').value = position.coords.longitude.toFixed(6);
      if (!document.getElementById('wod-seed').value.trim()) document.getElementById('wod-seed').value = 'Browser location';
      centerMap();
      setResult('Browser coordinates loaded. Generate an overlay to populate the map.');
    }, error => setResult(`Browser location was not available: ${escapeHtml(error.message || 'permission denied')}.`), {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    });
  }

  function setResult(message) {
    const target = document.getElementById('wod-result');
    if (target) target.innerHTML = `<div class="wod-result">${message}</div>`;
  }

  function copyJson() {
    if (generation) navigator.clipboard?.writeText(JSON.stringify(generation, null, 2));
  }

  function download(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportGeoJson() {
    if (generation?.geojson) download('world-of-darkness-overlay.geojson', 'application/geo+json', JSON.stringify(generation.geojson, null, 2));
  }

  function exportKml() {
    if (!generation?.sites) return;
    const placemarks = generation.sites.map(site => `<Placemark><name>${escapeHtml(site.name)}</name><description>${escapeHtml(`${site.selectedLayer} | ${site.politics} | ${site.pressure}: ${site.effect}`)}</description><Point><coordinates>${site.coordinates[0]},${site.coordinates[1]},0</coordinates></Point></Placemark>`).join('');
    download('world-of-darkness-overlay.kml', 'application/vnd.google-earth.kml+xml', `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`);
  }

  function install() {
    if (!installed) {
      installed = true;
      document.addEventListener('click', interceptOriginalControls, true);
    }
    if (buildWorkspace()) return;
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (buildWorkspace() || attempts > 80) window.clearInterval(retry);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
