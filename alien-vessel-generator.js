(function (root, factory) {
  const engine = root && root.HBSemanticSpatialEngine ? root.HBSemanticSpatialEngine : (typeof require === 'function' ? require('./semantic-spatial-engine.js') : null);
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.generator = root.generator || {};
    root.generator.alien_vessel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  'use strict';
  if (!engine) throw new Error('alien-vessel-generator requires HBSemanticSpatialEngine.');

  const PROFILES = Object.freeze({
    recon: {
      roles: [
        { id:'bridge', role:'command', label:'Bridge / Command', deck:0, pressureZone:'COMMAND', tags:['critical','fore'] },
        { id:'sensor-suite', role:'sensors', label:'Sensor / Recon Suite', deck:0, pressureZone:'COMMAND', tags:['critical'] },
        { id:'bio-printer', role:'bio-printer-lab', label:'Bio-Printer Laboratory', deck:0, pressureZone:'SERVICE', tags:['science','mission'] },
        { id:'habitation', role:'habitation', label:'Crew Dormitory', deck:1, pressureZone:'HABITAT', tags:['crew'] },
        { id:'recreation', role:'recreation', label:'Recreation Compartment', deck:1, pressureZone:'HABITAT', tags:['crew'] },
        { id:'grow-lab', role:'grow-lab', label:'Grow Laboratory', deck:1, pressureZone:'SERVICE', tags:['life-support','science'] },
        { id:'cargo', role:'cargo', label:'Cargo / Stores', deck:1, pressureZone:'CARGO', tags:['logistics'] },
        { id:'engineering', role:'engineering', label:'Engineering / Reactor', deck:2, pressureZone:'MACHINERY', tags:['critical','aft'] },
        { id:'mechanical', role:'mechanical', label:'Mechanical Systems', deck:2, pressureZone:'MACHINERY', tags:['service'] },
        { id:'atmosphere', role:'atmosphere', label:'Atmosphere & Water Systems', deck:2, pressureZone:'MACHINERY', tags:['life-support','critical'] }
      ],
      adjacency: [
        ['command','sensors'], ['command','bio-printer-lab'], ['habitation','recreation'], ['habitation','grow-lab'], ['grow-lab','cargo'], ['engineering','mechanical'], ['engineering','atmosphere']
      ]
    },
    damaged_recon: {
      inherits: 'recon',
      addRoles: [
        { id:'damage-control', role:'damage-control', label:'Damage Control Station', deck:1, pressureZone:'SERVICE', tags:['emergency','critical'] },
        { id:'sealed-breach', role:'sealed-breach', label:'Sealed Breach Compartment', deck:2, pressureZone:'STRUCTURE', tags:['damaged'], protected:true }
      ],
      addAdjacency: [['damage-control','engineering'], ['damage-control','sealed-breach']]
    }
  });

  function profile(name) {
    const key = name && PROFILES[name] ? name : 'recon';
    const raw = PROFILES[key];
    if (!raw.inherits) return { roles: raw.roles.map(x => ({...x})), adjacency: raw.adjacency.map(x => x.slice()) };
    const base = profile(raw.inherits);
    return { roles: base.roles.concat((raw.addRoles || []).map(x => ({...x}))), adjacency: base.adjacency.concat((raw.addAdjacency || []).map(x => x.slice())) };
  }

  function damageState(layout, severity, seed) {
    const level = Math.max(0, Math.min(1, Number(severity) || 0));
    if (!level) return [];
    const rng = engine.createRng(`${seed}:damage`), candidates = layout.rooms.filter(room => !room.tags.includes('critical') || rng() > 0.65);
    return candidates.filter(() => rng() < level * 0.55).map(room => ({ roomId: room.nodeId, deck: room.deck, state: rng() < level ? 'compromised' : 'degraded', effect: rng.pick(['power-isolated','atmosphere-loss','blocked-access','structural-damage','contamination']) }));
  }

  function generate(input) {
    const options = { ...(input || {}) };
    const selected = profile(options.profile || 'recon');
    const roles = selected.roles.concat(Array.isArray(options.additionalRoles) ? options.additionalRoles : []);
    const adjacency = selected.adjacency.concat(Array.isArray(options.adjacency) ? options.adjacency : []);
    const deckCount = Math.max(1, Number(options.decks) || (Math.max(...roles.map(role => Number.isInteger(role.deck) ? role.deck : 0)) + 1));
    const layout = engine.generate({
      seed: options.seed || `alien-vessel:${options.profile || 'recon'}`,
      decks: deckCount,
      roles, adjacency,
      layout: { gridWidth: options.width || 84, gridHeight: options.height || 60, minRoomWidth:6, maxRoomWidth:13, minRoomHeight:5, maxRoomHeight:11, ...(options.layout || {}) },
      extraEdgeChance: Number.isFinite(options.extraEdgeChance) ? options.extraEdgeChance : 0.12,
      pruneDeadEnds: options.pruneDeadEnds !== false,
      strict: options.strict
    });
    return {
      schemaVersion:'1.0.0', generator:'generator.alien_vessel', vesselType: options.vesselType || 'short-range reconnaissance vessel',
      faction: options.faction || 'Alpthon', profile: options.profile || 'recon', seed: layout.seed, deckCount: layout.deckCount,
      semanticSummary: layout.rooms.map(room => ({ id:room.nodeId, role:room.role, label:room.label, deck:room.deck, pressureZone:room.pressureZone, tags:room.tags })),
      damage: damageState(layout, options.damageSeverity == null && options.profile === 'damaged_recon' ? 0.65 : options.damageSeverity, layout.seed),
      spatialLayout: layout, validation: layout.validation
    };
  }

  return Object.freeze({ PROFILES, profile, generate });
});
