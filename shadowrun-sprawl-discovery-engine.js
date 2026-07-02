(() => {
  'use strict';

  const VERSION = '1.0.0';
  const EARTH_METERS_PER_DEGREE = 111320;

  const FOCUS_PROFILES = {
    balanced: 'Balanced Sprawl Mix',
    corporate: 'Corporate Facility Web',
    street: 'Street-Level Contacts and Heat',
    matrix: 'Matrix and Signal Infrastructure',
    magic: 'Awakened and Astral Pressure',
    security: 'Security Response and Surveillance',
    smuggling: 'Contraband Routes and Drop Sites'
  };

  const THREAT_PROFILES = {
    low: 'Low Heat',
    standard: 'Standard Heat',
    high: 'High Heat',
    prime: 'Prime Runner Heat'
  };

  const ARCHETYPES = [
    {
      id: 'all-night-soy-mart',
      name: 'All-Night Soy Mart',
      category: 'Commerce',
      weight: { balanced: 4, street: 5, smuggling: 3 },
      publicFacade: 'A cheap late-night convenience stop with cameras, tired staff, and constant foot traffic.',
      shadowUse: 'Dead drops, meetups, handoff distractions, and low-grade surveillance pivots.',
      accessVector: 'Approach through ordinary customers or staff shift changes.',
      securityBase: 'Panic button, visible cameras, and a contract patrol response window.',
      matrixBase: 'Commodity point-of-sale network with careless vendor maintenance.',
      magicalBase: 'Low astral background unless violence recently marked the site.'
    },
    {
      id: 'transit-transfer-node',
      name: 'Transit Transfer Node',
      category: 'Transit',
      weight: { balanced: 4, street: 4, security: 3, smuggling: 3 },
      publicFacade: 'A bus, rail, or shuttle transfer point with commuters, buskers, and loitering security.',
      shadowUse: 'Tail breaks, courier swaps, crowd cover, and surveillance triangulation.',
      accessVector: 'Blend with commuters and time movement to vehicle arrivals.',
      securityBase: 'Municipal cameras, roaming guards, and automated fare enforcement.',
      matrixBase: 'Public transit telemetry with schedule and camera metadata.',
      magicalBase: 'Emotional residue from crowds, fatigue, and repeated near-misses.'
    },
    {
      id: 'corporate-research-annex',
      name: 'Corporate Research Annex',
      category: 'Corporate',
      weight: { balanced: 2, corporate: 6, security: 4, matrix: 3 },
      publicFacade: 'A leased office or laboratory annex with badge access and polished reception.',
      shadowUse: 'Extraction target, paydata cache, experimental prototype, or deniable subsidiary office.',
      accessVector: 'Badge cloning, vendor cover, maintenance corridor, or appointment spoofing.',
      securityBase: 'Layered badges, receptionist screening, contract guards, and internal cameras.',
      matrixBase: 'Segmented office host with research file stores and alerting scripts.',
      magicalBase: 'Warded meeting rooms if awakened research or executive assets are involved.'
    },
    {
      id: 'logistics-warehouse',
      name: 'Logistics Warehouse',
      category: 'Industrial',
      weight: { balanced: 3, corporate: 4, smuggling: 5, security: 3 },
      publicFacade: 'A warehouse, loading dock, or courier depot moving pallets on tight schedules.',
      shadowUse: 'Contraband storage, stolen goods routing, vehicle swap, or team staging.',
      accessVector: 'Uniforms, delivery paperwork, loading traffic, or night-shift pressure.',
      securityBase: 'Perimeter cameras, dock supervisors, locks, and an alarm company.',
      matrixBase: 'Inventory scanners, route manifests, and automated dock scheduling.',
      magicalBase: 'Generally thin astral presence except where smuggled talismans or reagents pass through.'
    },
    {
      id: 'street-doc-clinic',
      name: 'Street Doc Clinic',
      category: 'Medical',
      weight: { balanced: 3, street: 5, smuggling: 2, magic: 2 },
      publicFacade: 'A private clinic, back-room practice, or cash-only urgent care office.',
      shadowUse: 'Cyberware work, patch jobs, organ-legger rumors, or discreet medical records.',
      accessVector: 'Approach through patients, medtech suppliers, or fixer introductions.',
      securityBase: 'Locked treatment rooms, staff discretion, and a few loyal toughs nearby.',
      matrixBase: 'Medical records terminal with uneven patching and privacy shortcuts.',
      magicalBase: 'Pain, fear, and recovery leave a readable astral wake.'
    },
    {
      id: 'drone-garage',
      name: 'Drone Garage',
      category: 'Rigger',
      weight: { balanced: 3, matrix: 4, security: 3, smuggling: 4 },
      publicFacade: 'A repair bay, hobby shop, or delivery-drone service with parts bins and charging racks.',
      shadowUse: 'Rigger meetup, disposable drone cache, or black-market modification bench.',
      accessVector: 'Bring a broken machine, order parts, or spoof a pickup authorization.',
      securityBase: 'Motion detectors, roll-up doors, and a local operator who watches the feeds.',
      matrixBase: 'Device swarm with weak links, firmware mismatch, and remote-control trails.',
      magicalBase: 'Minimal astral signature but strong machine-pattern repetition.'
    },
    {
      id: 'matrix-relay-rooftop',
      name: 'Rooftop Matrix Relay',
      category: 'Matrix',
      weight: { balanced: 2, matrix: 6, security: 3 },
      publicFacade: 'A rooftop access point supporting telecom, surveillance, or building automation equipment.',
      shadowUse: 'Signal intercept, host pivot, overwatch nest, or uplink for a remote decker.',
      accessVector: 'Service elevator, maintenance badge, adjacent roof, or climbing route.',
      securityBase: 'Roof alarms, access logs, cameras, and environmental sensors.',
      matrixBase: 'High-value routing hardware with device noise and admin backdoors.',
      magicalBase: 'Hard-edged urban resonance with little living emotional cover.'
    },
    {
      id: 'talismonger-kiosk',
      name: 'Talismonger Kiosk',
      category: 'Awakened',
      weight: { balanced: 2, magic: 6, street: 2, smuggling: 2 },
      publicFacade: 'A botanica, occult shop, market stall, or back-room reagent trader.',
      shadowUse: 'Reagent purchase, spirit gossip, ward advice, or magical contraband exchange.',
      accessVector: 'Bring a question, a rare component, or a favor owed by an awakened contact.',
      securityBase: 'Mundane locks plus social screening and a few watched regulars.',
      matrixBase: 'Light commercial devices with deliberately sparse records.',
      magicalBase: 'Noticeable astral texture, minor wards, and emotional residue from bargains.'
    },
    {
      id: 'barrens-shelter',
      name: 'Barrens Shelter',
      category: 'Community',
      weight: { balanced: 3, street: 6, magic: 2 },
      publicFacade: 'A shelter, mutual-aid kitchen, clinic line, or squatter support space.',
      shadowUse: 'Witness network, safe overnight pause, moral pressure point, or recruitment ground.',
      accessVector: 'Respect local rules, help with supplies, and avoid drawing corporate attention.',
      securityBase: 'Community watchers, improvised barriers, and quick rumor propagation.',
      matrixBase: 'Patchwork mesh nodes and borrowed devices.',
      magicalBase: 'Strong emotional imprint that can shelter or expose awakened activity.'
    },
    {
      id: 'private-security-office',
      name: 'Private Security Office',
      category: 'Security',
      weight: { balanced: 2, corporate: 4, security: 6 },
      publicFacade: 'A local security contractor office with patrol cars, lockers, and dispatch terminals.',
      shadowUse: 'Response intel, uniform access, patrol schedule theft, or heat escalation source.',
      accessVector: 'Impersonate a client, intercept patrol paperwork, or exploit after-hours fatigue.',
      securityBase: 'Armed staff, evidence lockers, panic protocols, and quick backup.',
      matrixBase: 'Dispatch host, patrol logs, bodycam archives, and client alarm data.',
      magicalBase: 'Possible watcher spirit support for high-value clients.'
    },
    {
      id: 'coffin-hotel',
      name: 'Coffin Hotel',
      category: 'Lodging',
      weight: { balanced: 3, street: 4, smuggling: 3, matrix: 2 },
      publicFacade: 'A dense short-stay sleep pod or micro-room building with anonymous renters.',
      shadowUse: 'Burner safehouse, surveillance hide, temporary stash, or missing-person lead.',
      accessVector: 'Pay cash, bribe the desk, spoof a reservation, or climb service stairs.',
      securityBase: 'Cheap locks, hallway cameras, and an owner who sells silence selectively.',
      matrixBase: 'Guest network, door logs, and insecure room-control devices.',
      magicalBase: 'Layered dreams, fear, and exhaustion make astral reads noisy.'
    },
    {
      id: 'syndicate-counting-room',
      name: 'Syndicate Counting Room',
      category: 'Criminal',
      weight: { balanced: 2, street: 4, smuggling: 5, security: 3 },
      publicFacade: 'A restaurant back office, social club, pawn desk, or cash business with unusual traffic.',
      shadowUse: 'Debt ledger, protection-money route, laundering node, or underworld negotiation site.',
      accessVector: 'Use a contact, pose as a debtor, or follow the cash courier.',
      securityBase: 'Armed lookouts, loyalty checks, and a short fuse for unknown visitors.',
      matrixBase: 'Air-gapped books, burner commlinks, and selective camera blindness.',
      magicalBase: 'Oath residue, fear, and greed can make astral impressions sharp.'
    },
    {
      id: 'public-works-substation',
      name: 'Public Works Substation',
      category: 'Infrastructure',
      weight: { balanced: 3, security: 4, matrix: 4, corporate: 2 },
      publicFacade: 'A utility substation, pump house, traffic-control cabinet, or municipal works yard.',
      shadowUse: 'Power cut, grid tap, escape route support, or evidence of civic corruption.',
      accessVector: 'Municipal cover, maintenance timing, or a quiet breach away from streetlights.',
      securityBase: 'Locks, cameras, hazard signage, and remote alarm monitoring.',
      matrixBase: 'Industrial-control devices with dangerous physical consequences.',
      magicalBase: 'Machine rhythm and public dependency create a rigid astral pattern.'
    },
    {
      id: 'night-market-row',
      name: 'Night Market Row',
      category: 'Market',
      weight: { balanced: 4, street: 5, smuggling: 5, magic: 2 },
      publicFacade: 'A cluster of food carts, repair stalls, pop-up vendors, and unofficial services.',
      shadowUse: 'Black-market shopping, rumor exchange, counterfeit goods, or social camouflage.',
      accessVector: 'Enter as a buyer, tip a vendor, or follow a repeated supply route.',
      securityBase: 'Vendor lookouts, gang tax collectors, and fast crowd movement.',
      matrixBase: 'Many personal devices, cheap payment systems, and local mesh chatter.',
      magicalBase: 'Small charms, desperate bargains, and emotional noise.'
    },
    {
      id: 'executive-parking-stack',
      name: 'Executive Parking Stack',
      category: 'Corporate',
      weight: { balanced: 2, corporate: 5, security: 5, smuggling: 2 },
      publicFacade: 'A controlled parking garage serving offices, condos, or private medical suites.',
      shadowUse: 'Vehicle swap, executive tail, extraction intercept, or weapon cache.',
      accessVector: 'License-plate spoofing, valet cover, elevator timing, or maintenance access.',
      securityBase: 'Gate arms, cameras, guards, license readers, and private elevators.',
      matrixBase: 'Vehicle logs, building access correlation, and surveillance archives.',
      magicalBase: 'Generally muted unless executive wards or spirit escorts pass through.'
    },
    {
      id: 'community-mesh-hub',
      name: 'Community Mesh Hub',
      category: 'Matrix',
      weight: { balanced: 3, matrix: 5, street: 4 },
      publicFacade: 'A neighborhood network room, maker space, apartment basement, or informal tech hub.',
      shadowUse: 'Data haven, comms dead zone, witness archive, or local grid resistance node.',
      accessVector: 'Offer repairs, barter information, or earn trust through community work.',
      securityBase: 'Social gatekeeping, locks, cheap sensors, and fast warning messages.',
      matrixBase: 'Layered mesh services with hidden admin channels and community logs.',
      magicalBase: 'Human attention and shared purpose keep the astral tone warmer than nearby concrete.'
    },
    {
      id: 'astral-dead-zone',
      name: 'Astral Dead Zone',
      category: 'Awakened',
      weight: { balanced: 2, magic: 6, security: 2 },
      publicFacade: 'A neglected underpass, vacant lot, sealed room, or concrete service gap.',
      shadowUse: 'Awakened threat clue, ritual residue, spirit avoidance route, or magical ambush site.',
      accessVector: 'Physical approach is easy; understanding the astral risk is the real gate.',
      securityBase: 'Little formal security, but people avoid lingering.',
      matrixBase: 'Poor signal quality and intermittent sensor blind spots.',
      magicalBase: 'Flat, cold, or distorted astral conditions that resist casual reading.'
    },
    {
      id: 'smuggler-service-bay',
      name: 'Smuggler Service Bay',
      category: 'Smuggling',
      weight: { balanced: 2, smuggling: 6, street: 3, matrix: 2 },
      publicFacade: 'A vehicle service bay, body shop, or storage unit with irregular hours.',
      shadowUse: 'Concealed compartments, vehicle plates, courier exchange, or quiet disposal.',
      accessVector: 'Arrive with a vehicle problem, a password, or a shipment code.',
      securityBase: 'Lookouts, reinforced doors, dogs or drones, and a back exit.',
      matrixBase: 'Sparse records, burner devices, and deliberately broken cameras.',
      magicalBase: 'Stress, fear, and greed linger around repeated illegal transfers.'
    }
  ];

  const SECURITY_MODIFIERS = {
    low: ['slow response', 'routine locks', 'visible deterrence', 'unmotivated patrol'],
    standard: ['contract patrol', 'camera coverage', 'alarm monitoring', 'staff challenge procedure'],
    high: ['armed response', 'layered cameras', 'badge checks', 'remote operator support'],
    prime: ['rapid tactical response', 'hardened access', 'drone overwatch', 'active counter-intrusion']
  };

  const CLUES = [
    'A delivery schedule repeats too cleanly for ordinary logistics.',
    'A camera points away from the most valuable door.',
    'A local regular knows which questions not to answer.',
    'A maintenance access panel shows fresh tool marks.',
    'A noise complaint masks a recurring meet window.',
    'A burner device appears on the local network only during shift change.',
    'A contractor badge number shows up in two unrelated places.',
    'A small gang tag has been painted over by someone with better resources.',
    'A spirit or sensor keeps reacting to the same corner.',
    'A cash-only side business has precise appointment spacing.'
  ];

  const COMPLICATIONS = [
    'The site is useful, but another crew is already watching it.',
    'A civilian witness will be harmed if the team treats the place as disposable.',
    'The obvious route is a decoy built to measure runner tradecraft.',
    'The local power broker wants a favor before sharing access.',
    'A corporate audit, gang collection, or police sweep starts during the window.',
    'The site has a second owner whose interests conflict with the public operator.',
    'A magical, Matrix, or social alarm points at the wrong suspect first.',
    'The location solves one problem while increasing heat somewhere else.'
  ];

  const LEGWORK = [
    'Ask a nearby vendor who pays for quiet.',
    'Check trash, deliveries, and repeated service vehicles.',
    'Trace devices visible from the street before stepping inside.',
    'Compare public hours against actual lights and foot traffic.',
    'Watch the site for one full shift change.',
    'Pull property, lease, or shell-company connections.',
    'Read astral residue from the public sidewalk.',
    'Follow the first courier who avoids the main entrance.',
    'Buy something small and listen to staff routines.',
    'Cross-reference camera angles with escape routes.'
  ];

  const PREFIXES = [
    'Neon', 'Rainier', 'Orchid', 'Chrome', 'Redline', 'Ninth', 'Cobalt', 'Vector', 'Mercer', 'Auburn',
    'Sable', 'Signal', 'Foundry', 'Greyline', 'Kestrel', 'Metro', 'Jade', 'Blacktop', 'Lowlight', 'Cascade'
  ];

  const CONNECTION_REASONS = [
    'shared camera line',
    'courier route overlap',
    'common fixer contact',
    'same shell-company lease',
    'matching gang tax marker',
    'signal bleed between devices',
    'same patrol response contract',
    'astral resonance echo'
  ];

  function hash32(input, seed = 0x811c9dc5) {
    let hash = seed >>> 0;
    const text = String(input);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  function createRng(seedText) {
    let state = hash32(seedText, 0x9e3779b9) || 0x6d2b79f5;
    return function random() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(number, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, number));
  }

  function safeText(value, fallback) {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function normalizeProfile(value, profiles, fallback) {
    const key = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return Object.prototype.hasOwnProperty.call(profiles, key) ? key : fallback;
  }

  function coerceInput(input = {}) {
    const origin = input.origin || {};
    const lat = Number(input.lat ?? origin.lat);
    const lng = Number(input.lng ?? origin.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Sprawl discovery requires numeric latitude and longitude.');
    }
    const count = Math.round(clamp(Number(input.count ?? 8), 1, 18));
    const radiusMeters = Math.round(clamp(Number(input.radiusMeters ?? input.radius ?? 900), 120, 5000));
    const focus = normalizeProfile(input.focus, FOCUS_PROFILES, 'balanced');
    const threat = normalizeProfile(input.threat, THREAT_PROFILES, 'standard');
    const label = safeText(input.label ?? origin.label, 'Unlabeled sprawl origin');
    const seed = safeText(input.seed, label);
    return { seed, label, lat, lng, count, radiusMeters, focus, threat };
  }

  function weightedArchetypePool(focus) {
    const pool = [];
    for (const archetype of ARCHETYPES) {
      const weight = archetype.weight[focus] || archetype.weight.balanced || 1;
      for (let index = 0; index < weight; index += 1) pool.push(archetype);
    }
    return pool;
  }

  function pick(list, rng) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function takeArchetype(uniquePool, weightedPool, rng) {
    if (uniquePool.length) {
      const index = Math.floor(rng() * uniquePool.length) % uniquePool.length;
      return uniquePool.splice(index, 1)[0];
    }
    return pick(weightedPool, rng);
  }

  function offsetCoordinate(lat, lng, distanceMeters, bearingRadians) {
    const north = Math.cos(bearingRadians) * distanceMeters;
    const east = Math.sin(bearingRadians) * distanceMeters;
    const nextLat = lat + north / EARTH_METERS_PER_DEGREE;
    const longitudeScale = EARTH_METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180);
    const nextLng = lng + east / (Math.abs(longitudeScale) < 1 ? EARTH_METERS_PER_DEGREE : longitudeScale);
    return {
      lat: Number(nextLat.toFixed(6)),
      lng: Number(nextLng.toFixed(6))
    };
  }

  function distanceMeters(origin, site) {
    const radians = value => value * Math.PI / 180;
    const dLat = radians(site.lat - origin.lat);
    const dLng = radians(site.lng - origin.lng);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(radians(origin.lat)) * Math.cos(radians(site.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function mapsUrl(lat, lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  function streetViewUrl(lat, lng) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  }

  function siteName(archetype, index, rng) {
    const prefix = pick(PREFIXES, rng);
    return `${prefix} ${archetype.name} ${index + 1}`;
  }

  function buildSite(input, archetype, index, rng) {
    const bearing = rng() * Math.PI * 2;
    const minimumDistance = Math.min(80, input.radiusMeters * 0.3);
    const distance = minimumDistance + Math.sqrt(rng()) * (input.radiusMeters - minimumDistance);
    const coordinates = offsetCoordinate(input.lat, input.lng, distance, bearing);
    const siteSeed = `${input.seed}|${input.label}|${input.focus}|${input.threat}|${index}|${archetype.id}`;
    const siteKey = `srsite-${hash32(siteSeed, 0x51f15e).toString(16).padStart(8, '0')}`;
    const securityModifier = pick(SECURITY_MODIFIERS[input.threat], rng);
    const clue = pick(CLUES, rng);
    const secondClue = pick(CLUES.filter(item => item !== clue), rng);
    const complication = pick(COMPLICATIONS, rng);
    const firstLegwork = pick(LEGWORK, rng);
    const secondLegwork = pick(LEGWORK.filter(item => item !== firstLegwork), rng);
    const name = siteName(archetype, index, rng);
    return {
      siteKey,
      name,
      archetypeId: archetype.id,
      category: archetype.category,
      coordinates,
      distanceMeters: Math.round(distanceMeters({ lat: input.lat, lng: input.lng }, coordinates)),
      publicFacade: archetype.publicFacade,
      shadowUse: archetype.shadowUse,
      accessVector: archetype.accessVector,
      security: `${archetype.securityBase} Current pressure: ${securityModifier}.`,
      matrix: archetype.matrixBase,
      magical: archetype.magicalBase,
      clues: [clue, secondClue],
      complication,
      legwork: [firstLegwork, secondLegwork],
      mapsUrl: mapsUrl(coordinates.lat, coordinates.lng),
      streetViewUrl: streetViewUrl(coordinates.lat, coordinates.lng),
      tags: [archetype.category.toLowerCase(), input.focus, input.threat]
    };
  }

  function attachRelatedSites(sites, rng) {
    for (const site of sites) {
      const nearest = sites
        .filter(candidate => candidate.siteKey !== site.siteKey)
        .map(candidate => ({
          candidate,
          distance: distanceMeters(site.coordinates, candidate.coordinates)
        }))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 2);
      site.relatedSites = nearest.map(({ candidate }) => ({
        siteKey: candidate.siteKey,
        name: candidate.name,
        reason: pick(CONNECTION_REASONS, rng)
      }));
    }
  }

  function summarize(sites) {
    const byCategory = {};
    for (const site of sites) byCategory[site.category] = (byCategory[site.category] || 0) + 1;
    return {
      siteCount: sites.length,
      categories: byCategory,
      nearestSiteKey: sites.slice().sort((left, right) => left.distanceMeters - right.distanceMeters)[0]?.siteKey || null
    };
  }

  function generateSprawlDiscovery(input = {}) {
    const prepared = coerceInput(input);
    const rng = createRng(JSON.stringify(prepared));
    const uniquePool = ARCHETYPES.slice();
    const weightedPool = weightedArchetypePool(prepared.focus);
    const sites = [];
    for (let index = 0; index < prepared.count; index += 1) {
      const archetype = takeArchetype(uniquePool, weightedPool, rng);
      sites.push(buildSite(prepared, archetype, index, rng));
    }
    attachRelatedSites(sites, rng);
    const packageKey = `srdisc-${hash32(`${prepared.seed}|${prepared.label}|${prepared.lat}|${prepared.lng}|${prepared.radiusMeters}|${prepared.focus}|${prepared.threat}`, 0x5a17e11a).toString(16).padStart(8, '0')}`;
    return {
      schemaVersion: VERSION,
      packageKey,
      module: 'shadowrun-sprawl-street-view-discovery',
      seed: prepared.seed,
      origin: {
        label: prepared.label,
        lat: Number(prepared.lat.toFixed(6)),
        lng: Number(prepared.lng.toFixed(6))
      },
      radiusMeters: prepared.radiusMeters,
      focus: prepared.focus,
      focusLabel: FOCUS_PROFILES[prepared.focus],
      threat: prepared.threat,
      threatLabel: THREAT_PROFILES[prepared.threat],
      transparency: {
        generationModel: 'deterministic local coordinates plus Shadowrun-ready site archetypes',
        externalDataRequired: false,
        apiKeysRequired: false,
        mapLinks: 'Google Maps and Street View links are outbound convenience links only.'
      },
      summary: summarize(sites),
      sites
    };
  }

  function buildGeoJson(discoveryPackage) {
    const pkg = discoveryPackage || {};
    return {
      type: 'FeatureCollection',
      name: pkg.packageKey || 'shadowrun-sprawl-discovery',
      features: (pkg.sites || []).map(site => ({
        type: 'Feature',
        properties: {
          siteKey: site.siteKey,
          name: site.name,
          category: site.category,
          distanceMeters: site.distanceMeters,
          shadowUse: site.shadowUse,
          complication: site.complication,
          mapsUrl: site.mapsUrl,
          streetViewUrl: site.streetViewUrl
        },
        geometry: {
          type: 'Point',
          coordinates: [site.coordinates.lng, site.coordinates.lat]
        }
      }))
    };
  }

  function xml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
    }[character]));
  }

  function buildKml(discoveryPackage) {
    const sites = discoveryPackage?.sites || [];
    const placemarks = sites.map(site => (
      `<Placemark><name>${xml(site.name)}</name><description>${xml(`${site.category} | ${site.shadowUse} | ${site.complication}`)}</description><Point><coordinates>${site.coordinates.lng},${site.coordinates.lat},0</coordinates></Point></Placemark>`
    )).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(discoveryPackage?.packageKey || 'Shadowrun Sprawl Discovery')}</name>${placemarks}</Document></kml>`;
  }

  function parseCoordinates(text) {
    const value = String(text || '');
    const patterns = [
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|query|viewpoint)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
      /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
    ];
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    }
    return null;
  }

  function validateDiscoveryPackage(discoveryPackage) {
    const failures = [];
    if (!discoveryPackage || discoveryPackage.schemaVersion !== VERSION) failures.push('schemaVersion mismatch');
    if (!/^srdisc-[0-9a-f]{8}$/.test(discoveryPackage?.packageKey || '')) failures.push('invalid packageKey');
    if (!Number.isFinite(discoveryPackage?.origin?.lat) || !Number.isFinite(discoveryPackage?.origin?.lng)) failures.push('invalid origin');
    if (!Array.isArray(discoveryPackage?.sites) || discoveryPackage.sites.length < 1) failures.push('missing sites');
    const keys = new Set();
    for (const site of discoveryPackage?.sites || []) {
      if (!/^srsite-[0-9a-f]{8}$/.test(site.siteKey || '')) failures.push(`invalid site key ${site.siteKey || 'missing'}`);
      if (keys.has(site.siteKey)) failures.push(`duplicate site key ${site.siteKey}`);
      keys.add(site.siteKey);
      if (!Number.isFinite(site.coordinates?.lat) || !Number.isFinite(site.coordinates?.lng)) failures.push(`invalid coordinates for ${site.siteKey}`);
      if (!site.mapsUrl?.includes('google.com/maps')) failures.push(`missing maps link for ${site.siteKey}`);
      if (!site.streetViewUrl?.includes('map_action=pano')) failures.push(`missing street view link for ${site.siteKey}`);
      if (!Array.isArray(site.relatedSites) || site.relatedSites.length < Math.min(2, (discoveryPackage.sites || []).length - 1)) {
        failures.push(`missing related sites for ${site.siteKey}`);
      }
    }
    return { valid: failures.length === 0, failures };
  }

  const api = Object.freeze({
    version: VERSION,
    focusProfiles: FOCUS_PROFILES,
    threatProfiles: THREAT_PROFILES,
    archetypes: ARCHETYPES,
    generateSprawlDiscovery,
    buildGeoJson,
    buildKml,
    parseCoordinates,
    validateDiscoveryPackage,
    mapsUrl,
    streetViewUrl
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ShadowrunSprawlDiscoveryEngine = api;
})();
