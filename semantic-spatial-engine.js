(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HBSemanticSpatialEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const DEFAULTS = Object.freeze({
    gridWidth: 72,
    gridHeight: 56,
    margin: 2,
    roomGap: 2,
    maxPlacementAttempts: 220,
    minRoomWidth: 5,
    maxRoomWidth: 11,
    minRoomHeight: 5,
    maxRoomHeight: 10,
    extraEdgeChance: 0.18,
    pruneDeadEnds: true
  });

  function hashSeed(value) {
    const text = String(value == null ? 'hb-spatial-default' : value);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 0x9e3779b9;
  }

  function createRng(seed) {
    let state = hashSeed(seed);
    const next = function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = (min, max) => Math.floor(next() * (max - min + 1)) + min;
    next.pick = list => list[next.int(0, list.length - 1)];
    next.shuffle = list => {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = next.int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    return next;
  }

  function roleId(role, index) {
    if (typeof role === 'string') return `${role.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index + 1}`;
    return role.id || `${String(role.role || 'room').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index + 1}`;
  }

  function normalizeRoles(spec) {
    const source = Array.isArray(spec.roles) && spec.roles.length ? spec.roles : ['entry', 'objective'];
    const roles = [];
    source.forEach((item, index) => {
      const raw = typeof item === 'string' ? { role: item } : { ...item };
      const count = Math.max(1, Number(raw.count) || 1);
      for (let n = 0; n < count; n += 1) {
        roles.push({
          id: count === 1 && raw.id ? raw.id : roleId({ ...raw, id: count === 1 ? raw.id : null }, roles.length),
          role: raw.role || raw.type || 'room',
          label: raw.label || raw.role || raw.type || 'Room',
          deck: Number.isInteger(raw.deck) ? raw.deck : null,
          width: raw.width,
          height: raw.height,
          minWidth: raw.minWidth,
          maxWidth: raw.maxWidth,
          minHeight: raw.minHeight,
          maxHeight: raw.maxHeight,
          protected: raw.protected !== false,
          tags: Array.isArray(raw.tags) ? raw.tags.slice() : [],
          pressureZone: raw.pressureZone || null,
          metadata: raw.metadata ? { ...raw.metadata } : {}
        });
      }
    });
    return roles;
  }

  function normalizeConstraint(raw, index) {
    if (Array.isArray(raw)) return { a: raw[0], b: raw[1], required: true, id: `constraint-${index + 1}` };
    return { required: raw.required !== false, id: raw.id || `constraint-${index + 1}`, ...raw };
  }

  function matches(node, selector) {
    if (!selector) return false;
    if (node.id === selector || node.role === selector) return true;
    return node.tags && node.tags.includes(selector);
  }

  function findNode(nodes, selector, used) {
    return nodes.find(node => !used.has(node.id) && matches(node, selector)) || nodes.find(node => matches(node, selector));
  }

  function addEdge(edges, a, b, kind, required, metadata) {
    if (!a || !b || a === b) return;
    const key = [a, b].sort().join('|');
    if (edges.some(edge => [edge.a, edge.b].sort().join('|') === key)) return;
    edges.push({ id: `edge-${edges.length + 1}`, a, b, kind: kind || 'access', required: required !== false, metadata: metadata || {} });
  }

  function buildSemanticGraph(spec, rng) {
    const nodes = normalizeRoles(spec);
    const edges = [];
    const constraints = (spec.adjacency || spec.constraints || []).map(normalizeConstraint);
    const used = new Set();

    constraints.forEach(constraint => {
      const a = findNode(nodes, constraint.a || constraint.from, used);
      if (a) used.add(a.id);
      const b = findNode(nodes, constraint.b || constraint.to, used);
      if (b) used.add(b.id);
      addEdge(edges, a && a.id, b && b.id, constraint.kind || 'semantic', constraint.required, { constraintId: constraint.id });
      used.clear();
    });

    if (nodes.length > 1) {
      const connected = new Set([nodes[0].id]);
      while (connected.size < nodes.length) {
        const fromCandidates = nodes.filter(node => connected.has(node.id));
        const toCandidates = nodes.filter(node => !connected.has(node.id));
        const from = rng.pick(fromCandidates);
        const preferred = toCandidates.filter(node => node.deck == null || from.deck == null || node.deck === from.deck);
        const to = rng.pick(preferred.length ? preferred : toCandidates);
        addEdge(edges, from.id, to.id, 'backbone', true);
        connected.add(to.id);
      }
    }

    const extraChance = Number.isFinite(spec.extraEdgeChance) ? spec.extraEdgeChance : DEFAULTS.extraEdgeChance;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i], b = nodes[j];
        if (a.deck != null && b.deck != null && a.deck !== b.deck) continue;
        if (rng() < extraChance) addEdge(edges, a.id, b.id, 'redundant', false);
      }
    }
    return { nodes, edges };
  }

  function assignDecks(graph, spec, rng) {
    const deckCount = Math.max(1, Number(spec.decks) || 1);
    const nodes = graph.nodes;
    nodes.forEach((node, index) => {
      if (node.deck == null) node.deck = deckCount === 1 ? 0 : Math.min(deckCount - 1, Math.floor(index * deckCount / Math.max(1, nodes.length)));
    });
    if (deckCount > 1) {
      const byDeck = Array.from({ length: deckCount }, (_, deck) => nodes.filter(node => node.deck === deck));
      for (let deck = 0; deck < deckCount - 1; deck += 1) {
        if (!byDeck[deck].length || !byDeck[deck + 1].length) continue;
        const a = rng.pick(byDeck[deck]);
        const b = rng.pick(byDeck[deck + 1]);
        addEdge(graph.edges, a.id, b.id, 'interdeck', true, { connectorRequired: true, fromDeck: deck, toDeck: deck + 1 });
      }
    }
    return deckCount;
  }

  function rectsOverlap(a, b, gap) {
    return !(a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x || a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y);
  }

  function roomDimensions(node, opts, rng) {
    const minW = Number(node.minWidth) || opts.minRoomWidth;
    const maxW = Number(node.maxWidth) || opts.maxRoomWidth;
    const minH = Number(node.minHeight) || opts.minRoomHeight;
    const maxH = Number(node.maxHeight) || opts.maxRoomHeight;
    return {
      width: Math.max(3, Number(node.width) || rng.int(minW, Math.max(minW, maxW))),
      height: Math.max(3, Number(node.height) || rng.int(minH, Math.max(minH, maxH)))
    };
  }

  function placeRooms(graph, spec, rng, deckCount) {
    const opts = { ...DEFAULTS, ...(spec.layout || {}) };
    const rooms = [];
    for (let deck = 0; deck < deckCount; deck += 1) {
      const deckNodes = graph.nodes.filter(node => node.deck === deck);
      for (let n = 0; n < deckNodes.length; n += 1) {
        const node = deckNodes[n];
        const dim = roomDimensions(node, opts, rng);
        let placed = null;
        for (let attempt = 0; attempt < opts.maxPlacementAttempts; attempt += 1) {
          const x = rng.int(opts.margin, Math.max(opts.margin, opts.gridWidth - dim.width - opts.margin));
          const y = rng.int(opts.margin, Math.max(opts.margin, opts.gridHeight - dim.height - opts.margin));
          const candidate = { id: node.id, nodeId: node.id, role: node.role, label: node.label, deck, x, y, width: dim.width, height: dim.height, protected: node.protected, tags: node.tags, pressureZone: node.pressureZone, metadata: node.metadata };
          if (!rooms.some(room => room.deck === deck && rectsOverlap(candidate, room, opts.roomGap))) { placed = candidate; break; }
        }
        if (!placed) {
          const stride = opts.maxRoomWidth + opts.roomGap + 2;
          const cols = Math.max(1, Math.floor((opts.gridWidth - opts.margin * 2) / stride));
          const slot = n;
          const x = opts.margin + (slot % cols) * stride;
          const y = opts.margin + Math.floor(slot / cols) * (opts.maxRoomHeight + opts.roomGap + 2);
          placed = { id: node.id, nodeId: node.id, role: node.role, label: node.label, deck, x, y, width: dim.width, height: dim.height, protected: node.protected, tags: node.tags, pressureZone: node.pressureZone, metadata: node.metadata, fallbackPlacement: true };
          if (x + dim.width >= opts.gridWidth || y + dim.height >= opts.gridHeight || rooms.some(room => room.deck === deck && rectsOverlap(placed, room, opts.roomGap))) {
            throw new Error(`Unable to place semantic room ${node.id} on deck ${deck} within ${opts.gridWidth}x${opts.gridHeight}.`);
          }
        }
        rooms.push(placed);
      }
    }
    return { rooms, opts };
  }

  function center(room) {
    return { x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) };
  }

  function boundaryDoor(room, toward) {
    const c = center(room);
    const dx = toward.x - c.x, dy = toward.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? room.x + room.width - 1 : room.x, y: Math.max(room.y + 1, Math.min(room.y + room.height - 2, toward.y)) };
    return { x: Math.max(room.x + 1, Math.min(room.x + room.width - 2, toward.x)), y: dy >= 0 ? room.y + room.height - 1 : room.y };
  }

  function manhattanPath(start, end, rng) {
    const points = [{ x: start.x, y: start.y }];
    let x = start.x, y = start.y;
    const horizontalFirst = rng() < 0.5;
    const walkX = () => { while (x !== end.x) { x += x < end.x ? 1 : -1; points.push({ x, y }); } };
    const walkY = () => { while (y !== end.y) { y += y < end.y ? 1 : -1; points.push({ x, y }); } };
    if (horizontalFirst) { walkX(); walkY(); } else { walkY(); walkX(); }
    return points;
  }

  function routeEdges(graph, rooms, rng) {
    const roomById = new Map(rooms.map(room => [room.nodeId, room]));
    const corridors = [], doors = [], connectors = [];
    graph.edges.forEach(edge => {
      const a = roomById.get(edge.a), b = roomById.get(edge.b);
      if (!a || !b) return;
      if (a.deck !== b.deck) {
        const ca = center(a), cb = center(b);
        const x = Math.round((ca.x + cb.x) / 2), y = Math.round((ca.y + cb.y) / 2);
        const connectorId = `connector-${connectors.length + 1}`;
        connectors.push({ id: `${connectorId}-a`, pairId: connectorId, kind: edge.metadata.connectorKind || 'lift-shaft', nodeId: a.nodeId, deck: a.deck, x, y, connectsDeck: b.deck });
        connectors.push({ id: `${connectorId}-b`, pairId: connectorId, kind: edge.metadata.connectorKind || 'lift-shaft', nodeId: b.nodeId, deck: b.deck, x, y, connectsDeck: a.deck });
        edge.connectorPairId = connectorId;
        return;
      }
      const da = boundaryDoor(a, center(b));
      const db = boundaryDoor(b, center(a));
      const corridor = { id: `corridor-${corridors.length + 1}`, edgeId: edge.id, deck: a.deck, a: a.nodeId, b: b.nodeId, points: manhattanPath(da, db, rng), required: edge.required !== false, protected: edge.required !== false };
      corridors.push(corridor);
      doors.push({ id: `door-${doors.length + 1}`, edgeId: edge.id, roomId: a.nodeId, deck: a.deck, x: da.x, y: da.y, corridorId: corridor.id });
      doors.push({ id: `door-${doors.length + 1}`, edgeId: edge.id, roomId: b.nodeId, deck: b.deck, x: db.x, y: db.y, corridorId: corridor.id });
    });
    return { corridors, doors, connectors };
  }

  function adjacency(layout) {
    const map = new Map(layout.rooms.map(room => [room.nodeId, new Set()]));
    layout.edges.forEach(edge => {
      if (!map.has(edge.a) || !map.has(edge.b)) return;
      map.get(edge.a).add(edge.b); map.get(edge.b).add(edge.a);
    });
    return map;
  }

  function pruneDeadEnds(layout, enabled) {
    if (!enabled) return layout;
    const protectedNodes = new Set(layout.rooms.filter(room => room.protected).map(room => room.nodeId));
    let changed = true;
    while (changed) {
      changed = false;
      const map = adjacency(layout);
      for (const room of layout.rooms) {
        if (protectedNodes.has(room.nodeId) || (map.get(room.nodeId)?.size || 0) !== 1) continue;
        const neighbor = [...map.get(room.nodeId)][0];
        const edge = layout.edges.find(item => (item.a === room.nodeId && item.b === neighbor) || (item.b === room.nodeId && item.a === neighbor));
        if (!edge || edge.required !== false) continue;
        layout.edges = layout.edges.filter(item => item.id !== edge.id);
        layout.corridors = layout.corridors.filter(item => item.edgeId !== edge.id);
        layout.doors = layout.doors.filter(item => item.edgeId !== edge.id);
        changed = true;
        break;
      }
    }
    return layout;
  }

  function validate(layout) {
    const errors = [], warnings = [];
    for (let i = 0; i < layout.rooms.length; i += 1) {
      const a = layout.rooms[i];
      for (let j = i + 1; j < layout.rooms.length; j += 1) {
        const b = layout.rooms[j];
        if (a.deck === b.deck && rectsOverlap(a, b, 0)) errors.push(`Room overlap: ${a.nodeId} intersects ${b.nodeId} on deck ${a.deck}.`);
      }
    }
    const map = adjacency(layout);
    if (layout.rooms.length) {
      const start = layout.rooms[0].nodeId, seen = new Set([start]), queue = [start];
      while (queue.length) {
        const current = queue.shift();
        for (const next of map.get(current) || []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
      layout.rooms.forEach(room => { if (!seen.has(room.nodeId)) errors.push(`Unreachable room: ${room.nodeId}.`); });
    }
    layout.corridors.forEach(corridor => {
      const corridorDoors = layout.doors.filter(door => door.corridorId === corridor.id);
      if (corridorDoors.length !== 2) errors.push(`Corridor ${corridor.id} has ${corridorDoors.length} doors; expected 2.`);
      if (!corridor.points.length) errors.push(`Corridor ${corridor.id} has no routed points.`);
    });
    const connectorGroups = new Map();
    layout.connectors.forEach(connector => {
      if (!connectorGroups.has(connector.pairId)) connectorGroups.set(connector.pairId, []);
      connectorGroups.get(connector.pairId).push(connector);
    });
    connectorGroups.forEach((items, pairId) => {
      if (items.length !== 2) errors.push(`Interdeck connector ${pairId} is not paired.`);
      else if (items[0].x !== items[1].x || items[0].y !== items[1].y) errors.push(`Interdeck connector ${pairId} does not share a vertical coordinate.`);
    });
    layout.rooms.forEach(room => {
      if (!Number.isInteger(room.deck) || room.deck < 0 || room.deck >= layout.deckCount) errors.push(`Room ${room.nodeId} has invalid deck ${room.deck}.`);
    });
    return { ok: errors.length === 0, errors, warnings };
  }

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
    return value;
  }

  function fingerprint(layout) {
    return JSON.stringify(stable({ seed: layout.seed, nodes: layout.nodes, edges: layout.edges, rooms: layout.rooms, corridors: layout.corridors, doors: layout.doors, connectors: layout.connectors }));
  }

  function generate(spec) {
    const normalized = { ...(spec || {}) };
    const seed = normalized.seed == null ? 'hb-spatial-default' : normalized.seed;
    const rng = createRng(seed);
    const graph = buildSemanticGraph(normalized, rng);
    const deckCount = assignDecks(graph, normalized, rng);
    const placed = placeRooms(graph, normalized, rng, deckCount);
    const routed = routeEdges(graph, placed.rooms, rng);
    const layout = {
      schemaVersion: '1.0.0', engine: 'hb-semantic-spatial-engine', engineVersion: VERSION, seed: String(seed),
      deckCount, bounds: { width: placed.opts.gridWidth, height: placed.opts.gridHeight },
      nodes: graph.nodes, edges: graph.edges, rooms: placed.rooms, corridors: routed.corridors, doors: routed.doors, connectors: routed.connectors
    };
    pruneDeadEnds(layout, normalized.pruneDeadEnds !== false && placed.opts.pruneDeadEnds !== false);
    layout.validation = validate(layout);
    if (normalized.strict !== false && !layout.validation.ok) throw new Error(`Spatial generation failed validation: ${layout.validation.errors.join(' | ')}`);
    return layout;
  }

  return Object.freeze({ VERSION, createRng, buildSemanticGraph, generate, validate, fingerprint, rectsOverlap });
});
