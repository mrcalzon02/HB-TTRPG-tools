(function (root, factory) {
  const engine = root && root.HBSemanticSpatialEngine ? root.HBSemanticSpatialEngine : (typeof require === 'function' ? require('./semantic-spatial-engine.js') : null);
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HBSemanticContentPopulator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  'use strict';
  if (!engine) throw new Error('semantic-content-populator requires HBSemanticSpatialEngine.');

  const VERSION = '1.0.0';
  const COMPATIBILITY_TARGETS = Object.freeze({
    open_d20: Object.freeze({ id:'open_d20', family:'open d20 / Hypertext d20-compatible', provenance:'Open d20-compatible presentation; setting-specific rules are not silently imported.' }),
    world_of_darkness: Object.freeze({ id:'world_of_darkness', family:'World of Darkness', provenance:'World of Darkness-targeted content; mechanics remain identified as World of Darkness.' }),
    blacklight_continuum: Object.freeze({ id:'blacklight_continuum', family:'Blacklight Continuum', provenance:'Blacklight Continuum-native content; mechanics remain identified as Blacklight Continuum.' }),
    kaysender: Object.freeze({ id:'kaysender', family:'Kaysender', provenance:'Kaysender-native content with open d20 / Hypertext d20-compatible presentation where rules-facing text is required.' })
  });
  const TARGET_ALIASES = Object.freeze({
    'open d20':'open_d20', d20:'open_d20', hypertext:'open_d20', 'hypertext d20':'open_d20', open_d20:'open_d20',
    wod:'world_of_darkness', 'world of darkness':'world_of_darkness', world_of_darkness:'world_of_darkness',
    blacklight:'blacklight_continuum', 'blacklight continuum':'blacklight_continuum', blacklight_continuum:'blacklight_continuum',
    kaysender:'kaysender'
  });

  function compatibilityTarget(value) {
    const key = TARGET_ALIASES[String(value || 'open_d20').trim().toLowerCase()] || 'open_d20';
    return COMPATIBILITY_TARGETS[key];
  }

  function graphDepths(layout) {
    const links = new Map((layout.rooms || []).map(room => [room.nodeId, []]));
    (layout.edges || []).forEach(edge => {
      if (links.has(edge.a) && links.has(edge.b)) { links.get(edge.a).push(edge.b); links.get(edge.b).push(edge.a); }
    });
    const start = (layout.rooms || []).find(room => (room.tags || []).includes('entrance')) ||
      (layout.rooms || []).find(room => /entry|entrance|gate|dock|access/i.test(room.role || '')) || (layout.rooms || [])[0];
    const depths = new Map();
    if (!start) return depths;
    depths.set(start.nodeId, 0);
    const queue = [start.nodeId];
    while (queue.length) {
      const current = queue.shift(), depth = depths.get(current);
      for (const next of links.get(current) || []) if (!depths.has(next)) { depths.set(next, depth + 1); queue.push(next); }
    }
    return depths;
  }

  function zoneOf(room, depth) {
    const tags = room.tags || [];
    if (tags.includes('restricted') || tags.includes('security') || tags.includes('inner')) return 'restricted';
    if (tags.includes('private') || tags.includes('staff')) return 'private';
    if (tags.includes('service') || tags.includes('infrastructure')) return 'service';
    if (tags.includes('public') || tags.includes('social') || depth <= 1) return 'public';
    return depth >= 4 ? 'restricted' : 'controlled';
  }

  function pushUnique(target, value) { if (value && !target.includes(value)) target.push(value); }
  function includesAny(text, fragments) { return fragments.some(fragment => text.includes(fragment)); }
  function choose(rng, list) { return list.length ? list[Math.floor(rng() * list.length)] : null; }

  function populateRoom(room, context, rng) {
    const role = String(room.role || '').toLowerCase();
    const tags = (room.tags || []).map(String);
    const depth = context.depths.get(room.nodeId) || 0;
    const zone = zoneOf(room, depth);
    const danger = Math.max(0, Math.min(10, Number(context.options.dangerLevel) || 4));
    const damage = String(context.options.damageState || 'intact').toLowerCase();
    const adventure = String(context.options.adventurePurpose || 'exploration').toLowerCase();
    const faction = String(context.options.faction || 'local occupants');
    const content = {
      roomId: room.nodeId, role: room.role, deck: room.deck, depth, zone,
      occupants: [], socialEncounters: [], traps: [], hazards: [], security: [], treasure: [], evidence: [], objectives: [], narrativeDiscoveries: [], lockedRestrictedAreas: [], secretAccess: [], encounterPressure: 0
    };

    if (tags.includes('social') || includesAny(role, ['hall','commons','mess','ward','classroom','chapel','market','recreation'])) {
      pushUnique(content.socialEncounters, `${faction} personnel, petitioners, or bystanders with location-relevant motives`);
    }
    if (tags.includes('security') || tags.includes('defense') || includesAny(role, ['guard','gate','armory','brig','vault','command','checkpoint'])) {
      pushUnique(content.security, choose(rng, ['controlled access and posted watch','credential or key-controlled access','layered observation and response point']));
      content.encounterPressure += 2;
    }
    if (tags.includes('hazard') || includesAny(role, ['sewer','cistern','mine','reactor','machine','laboratory','industrial','ritual'])) {
      pushUnique(content.hazards, choose(rng, ['unstable environment or machinery','contamination, fumes, runoff, or dangerous residue','terrain or infrastructure failure risk']));
      content.encounterPressure += 1;
    }
    if (tags.includes('treasure') || includesAny(role, ['vault','treasury','archive','stores','armory','study','crypt','sanctum','cargo'])) {
      pushUnique(content.treasure, choose(rng, ['secured valuables or rare materials','specialized equipment or trade goods','valuable records, components, or heirlooms']));
    }
    if (tags.includes('evidence') || includesAny(role, ['office','archive','study','laboratory','command','records','cell','interrogation'])) {
      pushUnique(content.evidence, choose(rng, ['documents or records that clarify recent events','physical evidence tied to the site purpose','logs, testimony, or traces connecting actors to the location']));
    }
    if (tags.includes('objective') || includesAny(role, ['sanctum','command','core','vault','objective','warden','ritual'])) {
      pushUnique(content.objectives, `${adventure} objective anchored to this room's semantic function`);
    }
    if (tags.includes('secret') || (zone === 'restricted' && rng() < 0.32)) pushUnique(content.secretAccess, 'concealed service route, bypass, or hidden connection');
    if (zone === 'restricted') {
      pushUnique(content.lockedRestrictedAreas, 'restricted threshold keyed to local authority, ownership, or security practice');
      content.encounterPressure += 2;
    }
    if (danger >= 6 && rng() < danger / 11) {
      pushUnique(content.occupants, choose(rng, [`hostile or defensive ${faction} presence`,'opportunistic intruders or dangerous inhabitants','site-specific opposition using the room as intended or repurposed']));
      content.encounterPressure += 2;
    } else if (rng() < 0.3) pushUnique(content.occupants, `${faction} presence appropriate to ${room.label || room.role}`);
    if ((tags.includes('trap') || (zone === 'restricted' && danger >= 5)) && rng() < 0.7) pushUnique(content.traps, 'site-appropriate alarm, denial device, or physical trap');
    if (damage !== 'intact' && damage !== 'pristine') {
      pushUnique(content.hazards, `${damage} damage affecting access, visibility, utilities, or structural safety`);
      content.encounterPressure += 1;
    }
    if (depth >= 3 && rng() < 0.55) pushUnique(content.narrativeDiscoveries, 'deeper-context discovery revealing ownership, history, failure, or hidden purpose');
    content.encounterPressure += Math.min(3, Math.floor(depth / 2));
    return content;
  }

  function populate(layout, options) {
    const settings = { ...(options || {}) };
    const target = compatibilityTarget(settings.rulesTarget || settings.compatibilityTarget || settings.system);
    const seed = `${layout.seed || 'spatial'}:content:${settings.seed || 'default'}:${target.id}`;
    const rng = engine.createRng(seed);
    const context = { options: settings, depths: graphDepths(layout) };
    const rooms = (layout.rooms || []).map(room => populateRoom(room, context, rng));
    return {
      schemaVersion:'1.0.0', generator:'hb-semantic-content-populator', version:VERSION, seed,
      compatibility:{ ...target, mechanicalDetailsAreSettingScoped:true },
      provenance:{ topologyEngine:layout.engine || 'hb-semantic-spatial-engine', topologySeed:layout.seed, contentLayer:'semantic-content-populator', locationArchetype:settings.locationArchetype || null, faction:settings.faction || null, adventurePurpose:settings.adventurePurpose || null },
      rooms
    };
  }

  return Object.freeze({ VERSION, COMPATIBILITY_TARGETS, compatibilityTarget, graphDepths, populate });
});
