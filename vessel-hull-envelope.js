(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HBVesselHullEnvelope = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const TIGHTNESS_PRESETS = Object.freeze({
    'skin-tight': 1,
    tight: 2,
    close: 3,
    standard: 4,
    loose: 7,
    'very-loose': 10
  });
  const SHAPE_ALIASES = Object.freeze({
    skin: 'connected-skin', connected: 'connected-skin', organic: 'connected-skin', 'connected-skin': 'connected-skin',
    oval: 'oval', ellipse: 'oval', elliptical: 'oval',
    capsule: 'capsule', pill: 'capsule',
    rectangle: 'rectangle', rectangular: 'rectangle', box: 'rectangle',
    square: 'square', cube: 'square', cubic: 'square',
    circle: 'circle', circular: 'circle', cylinder: 'circle', cylindrical: 'circle'
  });

  function cellKey(x, y) { return `${x},${y}`; }
  function parseKey(value) { const [x, y] = value.split(',').map(Number); return { x, y }; }
  function normalizeShape(value) { return SHAPE_ALIASES[String(value || 'connected-skin').toLowerCase()] || 'connected-skin'; }
  function normalizeTightness(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 0 && value <= 1) return { selector: value, clearance: Math.max(1, Math.round(1 + (1 - value) * 9)) };
      return { selector: value, clearance: Math.max(1, Math.min(24, Math.round(value))) };
    }
    const selector = String(value || 'standard').toLowerCase();
    return { selector, clearance: TIGHTNESS_PRESETS[selector] || TIGHTNESS_PRESETS.standard };
  }

  function collectOccupied(layout) {
    const all = new Set();
    const byDeck = Array.from({ length: Math.max(1, Number(layout.deckCount) || 1) }, () => new Set());
    function add(deck, x, y) {
      const d = Math.max(0, Math.min(byDeck.length - 1, Number(deck) || 0));
      const key = cellKey(Math.round(x), Math.round(y));
      all.add(key); byDeck[d].add(key);
    }
    (layout.rooms || []).forEach(room => {
      for (let y = room.y; y < room.y + room.height; y += 1) for (let x = room.x; x < room.x + room.width; x += 1) add(room.deck, x, y);
    });
    (layout.corridors || []).forEach(corridor => (corridor.points || []).forEach(point => add(corridor.deck, point.x, point.y)));
    (layout.connectors || []).forEach(connector => add(connector.deck, connector.x, connector.y));
    return { all, byDeck };
  }

  function boundsOf(set) {
    if (!set.size) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1, centerX: 0, centerY: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    set.forEach(key => { const { x, y } = parseKey(key); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
  }

  function fillRect(minX, minY, maxX, maxY) {
    const out = new Set();
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += 1) for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += 1) out.add(cellKey(x, y));
    return out;
  }

  function dilate(set, radius) {
    const out = new Set();
    const r = Math.max(0, Math.round(radius));
    set.forEach(key => {
      const { x, y } = parseKey(key);
      for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) if (dx * dx + dy * dy <= r * r) out.add(cellKey(x + dx, y + dy));
    });
    return out;
  }

  function fillHoles(set) {
    if (!set.size) return set;
    const b = boundsOf(set), minX = b.minX - 1, minY = b.minY - 1, maxX = b.maxX + 1, maxY = b.maxY + 1;
    const outside = new Set(), queue = [cellKey(minX, minY)]; outside.add(queue[0]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (queue.length) {
      const current = parseKey(queue.shift());
      for (const [dx, dy] of dirs) {
        const x = current.x + dx, y = current.y + dy, key = cellKey(x, y);
        if (x < minX || x > maxX || y < minY || y > maxY || set.has(key) || outside.has(key)) continue;
        outside.add(key); queue.push(key);
      }
    }
    const out = new Set(set);
    for (let y = minY + 1; y <= maxY - 1; y += 1) for (let x = minX + 1; x <= maxX - 1; x += 1) {
      const key = cellKey(x, y); if (!outside.has(key)) out.add(key);
    }
    return out;
  }

  function makeEllipse(occupied, clearance, circular) {
    const b = boundsOf(occupied), cx = b.centerX, cy = b.centerY;
    let a = circular ? Math.max(b.width, b.height) / 2 + clearance : b.width / 2 + clearance;
    let d = circular ? a : b.height / 2 + clearance;
    let scale = 1;
    occupied.forEach(key => {
      const { x, y } = parseKey(key);
      const nx = (x - cx) / Math.max(1, a), ny = (y - cy) / Math.max(1, d);
      scale = Math.max(scale, Math.sqrt(nx * nx + ny * ny));
    });
    a *= scale; d *= scale;
    const out = new Set(), minX = Math.floor(cx - a), maxX = Math.ceil(cx + a), minY = Math.floor(cy - d), maxY = Math.ceil(cy + d);
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) if (((x - cx) * (x - cx)) / (a * a) + ((y - cy) * (y - cy)) / (d * d) <= 1.000001) out.add(cellKey(x, y));
    occupied.forEach(key => out.add(key));
    return fillHoles(out);
  }

  function makeCapsule(occupied, clearance) {
    const b = boundsOf(occupied), out = new Set(), horizontal = b.width >= b.height;
    const cx = b.centerX, cy = b.centerY;
    const radius = (horizontal ? b.height : b.width) / 2 + clearance;
    const segMin = horizontal ? b.minX : b.minY, segMax = horizontal ? b.maxX : b.maxY;
    const minX = Math.floor(horizontal ? segMin - radius : cx - radius), maxX = Math.ceil(horizontal ? segMax + radius : cx + radius);
    const minY = Math.floor(horizontal ? cy - radius : segMin - radius), maxY = Math.ceil(horizontal ? cy + radius : segMax + radius);
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
      let dx = 0, dy = 0;
      if (horizontal) { dx = x < segMin ? segMin - x : x > segMax ? x - segMax : 0; dy = y - cy; }
      else { dx = x - cx; dy = y < segMin ? segMin - y : y > segMax ? y - segMax : 0; }
      if (dx * dx + dy * dy <= radius * radius) out.add(cellKey(x, y));
    }
    occupied.forEach(key => out.add(key));
    return fillHoles(out);
  }

  function componentsOf(set) {
    const remaining = new Set(set), components = [], dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (remaining.size) {
      const first = remaining.values().next().value, component = new Set([first]), queue = [first]; remaining.delete(first);
      while (queue.length) {
        const { x, y } = parseKey(queue.shift());
        for (const [dx, dy] of dirs) { const next = cellKey(x + dx, y + dy); if (remaining.has(next)) { remaining.delete(next); component.add(next); queue.push(next); } }
      }
      components.push(component);
    }
    return components;
  }

  function nearestCell(component, target) {
    let best = null, bestDistance = Infinity;
    component.forEach(key => { const point = parseKey(key), distance = Math.abs(point.x - target.x) + Math.abs(point.y - target.y); if (distance < bestDistance) { best = point; bestDistance = distance; } });
    return best;
  }

  function connectSeed(set) {
    const out = new Set(set);
    while (true) {
      const components = componentsOf(out);
      if (components.length <= 1) return out;
      const base = components[0], baseBounds = boundsOf(base);
      let targetIndex = 1, targetDistance = Infinity;
      for (let i = 1; i < components.length; i += 1) {
        const b = boundsOf(components[i]), distance = Math.abs(baseBounds.centerX - b.centerX) + Math.abs(baseBounds.centerY - b.centerY);
        if (distance < targetDistance) { targetDistance = distance; targetIndex = i; }
      }
      const target = components[targetIndex], targetBounds = boundsOf(target);
      const start = nearestCell(base, { x: targetBounds.centerX, y: targetBounds.centerY });
      const end = nearestCell(target, start);
      let x = start.x, y = start.y; out.add(cellKey(x, y));
      while (x !== end.x) { x += x < end.x ? 1 : -1; out.add(cellKey(x, y)); }
      while (y !== end.y) { y += y < end.y ? 1 : -1; out.add(cellKey(x, y)); }
    }
  }

  function makeFootprint(occupied, shape, clearance) {
    const b = boundsOf(occupied);
    if (shape === 'rectangle') return fillRect(b.minX - clearance, b.minY - clearance, b.maxX + clearance, b.maxY + clearance);
    if (shape === 'square') {
      const half = Math.ceil(Math.max(b.width, b.height) / 2 + clearance), cx = Math.round(b.centerX), cy = Math.round(b.centerY);
      return fillRect(cx - half, cy - half, cx + half, cy + half);
    }
    if (shape === 'circle') return makeEllipse(occupied, clearance, true);
    if (shape === 'oval') return makeEllipse(occupied, clearance, false);
    if (shape === 'capsule') return makeCapsule(occupied, clearance);
    return fillHoles(dilate(connectSeed(occupied), clearance));
  }

  function shellOf(set) {
    const shell = new Set(), dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    set.forEach(key => {
      const { x, y } = parseKey(key);
      if (dirs.some(([dx, dy]) => !set.has(cellKey(x + dx, y + dy)))) shell.add(key);
    });
    return shell;
  }

  function isConnected(set) {
    if (!set.size) return true;
    const first = set.values().next().value, seen = new Set([first]), queue = [first], dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (queue.length) {
      const { x, y } = parseKey(queue.shift());
      for (const [dx, dy] of dirs) { const next = cellKey(x + dx, y + dy); if (set.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); } }
    }
    return seen.size === set.size;
  }

  function validate(occupied, footprint, shell, deckCount) {
    const errors = [], warnings = [];
    occupied.forEach(key => { if (!footprint.has(key)) errors.push(`Hull does not contain occupied cell ${key}.`); });
    if (!isConnected(footprint)) errors.push('Hull footprint is not a single connected skin volume.');
    if (!shell.size) errors.push('Hull shell is empty.');
    if (deckCount < 1) errors.push('Hull requires at least one deck.');
    return { ok: errors.length === 0, errors, warnings };
  }

  function sortedCells(set) { return [...set].map(parseKey).sort((a, b) => a.y - b.y || a.x - b.x); }

  function wrap(layout, options) {
    const settings = options || {}, shape = normalizeShape(settings.shape || settings.hullShape), tightness = normalizeTightness(settings.tightness == null ? settings.hullTightness : settings.tightness);
    const occupied = collectOccupied(layout), footprint = makeFootprint(occupied.all, shape, tightness.clearance), shell = shellOf(footprint);
    const deckCount = Math.max(1, Number(layout.deckCount) || occupied.byDeck.length || 1), footprintCells = sortedCells(footprint), shellCells = sortedCells(shell);
    const result = {
      schemaVersion: '1.0.0', generator: 'hb-vessel-hull-envelope', version: VERSION,
      shape, requestedShape: settings.shape || settings.hullShape || 'connected-skin', tightness: tightness.selector, clearance: tightness.clearance,
      deckCount, footprintMode: 'shared-connected-vertical-skin', bounds: boundsOf(footprint), footprintCells, shellCells,
      crossSections: Array.from({ length: deckCount }, (_, deck) => ({ deck, footprintRef: 'footprintCells', shellRef: 'shellCells', occupiedCellCount: occupied.byDeck[deck]?.size || 0 })),
      surface: { sideShellCellCount: shell.size * deckCount, capCellCount: footprint.size * (deckCount > 1 ? 2 : 1), connectedAcrossDecks: true }
    };
    result.validation = validate(occupied.all, footprint, shell, deckCount);
    return result;
  }

  return Object.freeze({ VERSION, TIGHTNESS_PRESETS, SHAPE_ALIASES, normalizeShape, normalizeTightness, collectOccupied, wrap });
});
