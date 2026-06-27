(() => {
  'use strict';

  const OVERPASS_HOSTS = new Set(['overpass-api.de', 'overpass.kumi.systems']);
  const CACHE_MIGRATION_KEY = 'hb-wod-named-location-cache-migrated-v1';
  const LEGACY_SCAN_CACHE_KEY = 'hb-wod-inventory-scans-v2';
  const featureLabelsByName = new Map();
  const originalFetch = window.fetch.bind(window);
  let lastScanMeta = null;
  let engineObserver = null;

  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const humanize = value => String(value || '')
    .replace(/[_:]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

  function isOverpassUrl(input) {
    try {
      const raw = input instanceof Request ? input.url : String(input);
      return OVERPASS_HOSTS.has(new URL(raw, window.location.href).hostname);
    } catch (_) {
      return false;
    }
  }

  function parseBody(body) {
    if (body instanceof URLSearchParams) return new URLSearchParams(body);
    if (typeof body === 'string') return new URLSearchParams(body);
    return null;
  }

  function serverLimitForBbox(bbox) {
    const values = String(bbox).split(',').map(Number);
    if (values.length !== 4 || values.some(value => !Number.isFinite(value))) return 700;
    const [south, west, north, east] = values;
    const area = Math.abs((north - south) * (east - west));
    if (area <= 0.0005) return 1200;
    if (area <= 0.002) return 900;
    return 600;
  }

  function rewriteNamedLocationQuery(query) {
    const text = String(query || '');
    if (!text.includes('nwr["name"]["amenity"]')) return null;
    const bboxMatch = text.match(/nwr\["name"\]\["amenity"\]\(([^)]+)\)/);
    if (!bboxMatch) return null;
    const bbox = bboxMatch[1];
    const limit = serverLimitForBbox(bbox);
    return {
      query: `[out:json][timeout:25];nwr["name"](${bbox});out center tags qt ${limit};`,
      limit
    };
  }

  function featureLabel(tags = {}) {
    const amenity = tags.amenity;
    const tourism = tags.tourism;
    const leisure = tags.leisure;
    const natural = tags.natural;
    const highway = tags.highway;
    const railway = tags.railway;
    const place = tags.place;
    const building = tags.building;
    const manMade = tags.man_made;

    if (amenity) {
      const groups = {
        school: 'School / Education', college: 'College / Education', university: 'University / Education', kindergarten: 'Childcare / Education',
        community_centre: 'Community Centre', social_centre: 'Social Centre', social_facility: 'Social Facility',
        theatre: 'Theatre / Performing Arts', arts_centre: 'Arts Centre', cinema: 'Cinema', music_venue: 'Music Venue',
        place_of_worship: 'Religious Site', grave_yard: 'Cemetery / Burial Ground',
        townhall: 'Town Hall / Government', courthouse: 'Courthouse / Government', police: 'Police Facility', fire_station: 'Fire Station',
        hospital: 'Hospital / Healthcare', clinic: 'Clinic / Healthcare', doctors: 'Medical Practice', pharmacy: 'Pharmacy',
        library: 'Library', marketplace: 'Marketplace', parking: 'Parking Facility', fuel: 'Fuel Station',
        bus_station: 'Bus Station', ferry_terminal: 'Ferry Terminal', shelter: 'Public Shelter'
      };
      return groups[amenity] || `Amenity · ${humanize(amenity)}`;
    }
    if (tags.shop) return `Shop / Retail · ${humanize(tags.shop)}`;
    if (tourism) {
      const groups = {
        hotel: 'Hotel / Lodging', motel: 'Motel / Lodging', hostel: 'Hostel / Lodging', guest_house: 'Guest House / Lodging',
        museum: 'Museum', gallery: 'Gallery', attraction: 'Visitor Attraction', artwork: 'Public Artwork', viewpoint: 'Viewpoint', information: 'Visitor Information'
      };
      return groups[tourism] || `Tourism · ${humanize(tourism)}`;
    }
    if (tags.historic) return `Historic Site · ${humanize(tags.historic)}`;
    if (leisure) {
      const groups = {
        park: 'Park / Green Space', garden: 'Garden', nature_reserve: 'Nature Reserve',
        stadium: 'Stadium', sports_centre: 'Sports Centre', pitch: 'Sports Field', playground: 'Playground', marina: 'Marina'
      };
      return groups[leisure] || `Leisure Site · ${humanize(leisure)}`;
    }
    if (natural) return `Natural Feature · ${humanize(natural)}`;
    if (tags.waterway) return `Water Feature · ${humanize(tags.waterway)}`;
    if (highway) {
      if (['path', 'footway', 'cycleway', 'bridleway', 'track', 'steps'].includes(highway)) return `Trail / Path · ${humanize(highway)}`;
      if (highway === 'bus_stop') return 'Transit Stop';
      return `Named Road · ${humanize(highway)}`;
    }
    if (railway || tags.public_transport) return `Rail / Transit · ${humanize(railway || tags.public_transport)}`;
    if (place) return `Named Place · ${humanize(place)}`;
    if (tags.boundary) return `Named Boundary · ${humanize(tags.boundary)}`;
    if (tags.aeroway) return `Aviation Feature · ${humanize(tags.aeroway)}`;
    if (tags.office) return `Office · ${humanize(tags.office)}`;
    if (tags.craft) return `Craft / Workshop · ${humanize(tags.craft)}`;
    if (tags.landuse) return `Named Land Area · ${humanize(tags.landuse)}`;
    if (tags.power) return `Utility / Power · ${humanize(tags.power)}`;
    if (manMade) return `Infrastructure · ${humanize(manMade)}`;
    if (tags.military) return `Military Site · ${humanize(tags.military)}`;
    if (building && building !== 'yes') return `Named Building · ${humanize(building)}`;
    if (building) return 'Named Building';
    return 'Named Map Feature';
  }

  function transformPayload(payload, limit) {
    if (!payload || !Array.isArray(payload.elements)) return payload;
    const seen = new Set();
    const elements = [];

    for (const element of payload.elements) {
      const tags = element?.tags || {};
      const name = String(tags.name || '').trim();
      if (!name) continue;
      const identity = `${element.type}/${element.id}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      const label = featureLabel(tags);
      const key = normalize(name);
      if (!featureLabelsByName.has(key)) featureLabelsByName.set(key, new Set());
      featureLabelsByName.get(key).add(label);
      element.tags = { ...tags, wod_named_feature_label: label };
      elements.push(element);
    }

    lastScanMeta = {
      received: elements.length,
      limit,
      capped: elements.length >= limit
    };
    return { ...payload, elements };
  }

  window.fetch = async function namedLocationFetch(input, init = {}) {
    if (!isOverpassUrl(input)) return originalFetch(input, init);

    const params = parseBody(init.body);
    const rewritten = params ? rewriteNamedLocationQuery(params.get('data')) : null;
    if (!rewritten) return originalFetch(input, init);

    params.set('data', rewritten.query);
    const response = await originalFetch(input, { ...init, body: params });
    return new Proxy(response, {
      get(target, property) {
        if (property === 'json') {
          return async () => transformPayload(await target.json(), rewritten.limit);
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  };

  function replaceText(selector, expected, replacement) {
    const element = document.querySelector(selector);
    if (!element) return;
    if (!expected || element.textContent.trim() === expected || element.textContent.includes(expected)) {
      element.textContent = replacement;
    }
  }

  function patchStaticInterface(engine) {
    const headerParagraph = engine.querySelector('.wod-inventory-header p:last-child');
    if (headerParagraph) {
      headerParagraph.textContent = 'The city is mostly ordinary. Every named map location can receive a deterministic 210-variant context, while only a small minority are formally inventoried by supernatural factions.';
    }
    replaceText('#wod-display-matrix h3', 'No Business Selected', 'No Named Location Selected');
    const emptyText = document.querySelector('#wod-display-matrix .wod-inventory-card p');
    if (emptyText?.textContent.includes('select a business')) {
      emptyText.textContent = 'Scan the visible area and select any named location to inspect its mundane, tangential, unregistered, or inventoried status.';
    }
    const manual = [...engine.querySelectorAll('summary')].find(summary => summary.textContent.includes('Manual business capture'));
    if (manual) manual.textContent = 'Manual named-location capture';
    const rightTitle = engine.querySelector('.wod-inventory-right h3');
    if (rightTitle) rightTitle.textContent = 'Named Locations in Current Map View';
    const rightNote = engine.querySelector('.wod-inventory-right .wod-note');
    if (rightNote) rightNote.textContent = 'Every OpenStreetMap node, way, or relation with a name is eligible, including businesses, buildings, roads, parks, schools, landmarks, natural features, trails, transit sites, and public facilities. Formally inventoried supernatural sites remain intentionally rare.';
    const scanButton = document.getElementById('wod-scan-visible-businesses');
    if (scanButton) scanButton.textContent = 'Scan Named Locations';
    const search = document.getElementById('wod-visible-business-search');
    if (search) search.placeholder = 'Filter visible named locations…';
  }

  function patchStatus() {
    const status = document.getElementById('wod-visible-business-status');
    if (!status) return;
    let text = status.textContent;
    text = text
      .replace('Scanning visible businesses…', 'Scanning every named map feature in the visible area…')
      .replace('Business scan failed:', 'Named-location scan failed:')
      .replace('No business scan has started.', 'No named-location scan has started.')
      .replace('Browser location loaded. No business scan has started.', 'Browser location loaded. No named-location scan has started.');
    if (lastScanMeta?.capped && /^Found \d+ locations:/.test(text) && !text.includes('response cap')) {
      text += ` The Overpass response cap was reached at ${lastScanMeta.limit} named features; zoom closer and scan again for denser coverage.`;
    }
    if (status.textContent !== text) status.textContent = text;
  }

  function decorateCards() {
    document.querySelectorAll('.wod-inventory-business').forEach(card => {
      if (card.querySelector('[data-wod-named-feature-label]')) return;
      const name = card.querySelector('h4')?.textContent.trim();
      const labels = featureLabelsByName.get(normalize(name));
      if (!labels?.size) return;
      const pillRow = card.querySelector('.wod-inventory-pills');
      if (!pillRow) return;
      const pill = document.createElement('span');
      pill.className = 'wod-inventory-pill';
      pill.dataset.wodNamedFeatureLabel = 'true';
      pill.textContent = [...labels].slice(0, 2).join(' / ');
      pillRow.prepend(pill);
    });
  }

  function patchDynamicInterface() {
    const engine = document.getElementById('wod-spatial-engine');
    if (!engine) return false;
    patchStaticInterface(engine);
    patchStatus();
    decorateCards();
    return true;
  }

  function installInterfaceObserver() {
    let attempts = 0;
    const seek = () => {
      attempts += 1;
      if (!patchDynamicInterface()) {
        if (attempts < 150) window.setTimeout(seek, 100);
        return;
      }
      const engine = document.getElementById('wod-spatial-engine');
      engineObserver?.disconnect();
      engineObserver = new MutationObserver(() => patchDynamicInterface());
      engineObserver.observe(engine, { childList: true, subtree: true, characterData: true });
    };
    seek();
  }

  try {
    if (!localStorage.getItem(CACHE_MIGRATION_KEY)) {
      localStorage.removeItem(LEGACY_SCAN_CACHE_KEY);
      localStorage.setItem(CACHE_MIGRATION_KEY, new Date().toISOString());
    }
  } catch (_) {
    // Storage migration is optional.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installInterfaceObserver);
  else installInterfaceObserver();
})();
