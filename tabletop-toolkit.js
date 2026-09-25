(() => {
  'use strict';

  const VERSION = '1.2.0';
  const STORAGE_KEY = 'hb-ttrpg-tabletop-toolkit-v1';
  const HISTORY_LIMIT = 60;
  const state = loadState();
  let uidCounter = 0;
  let dragContext = null;
  let timerInterval = null;
  let diceTrayAnimationFrame = 0;
  let diceTrayRun = 0;
  let diceTrayBodies = [];
  let diceTrayReveal = 0;
  let diceTrayResizeObserver = null;
  const diceGeometryCache = Object.create(null);

  function freshState() {
    return {
      diceHistory: [],
      initiative: { round: 1, index: 0, entries: [] },
      roster: [],
      counters: [],
      clocks: [],
      random: { tableText: '', bagText: '', bagRemaining: [] },
      deck: { remaining: [], discard: [] },
      timer: { totalSec: 300, remainingSec: 300, running: false, endAt: null },
      notes: ''
    };
  }

  function loadState() {
    const fallback = freshState();
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const merged = Object.assign(fallback, parsed);
      merged.initiative = Object.assign({ round: 1, index: 0, entries: [] }, parsed.initiative || {});
      merged.random = Object.assign({ tableText: '', bagText: '', bagRemaining: [] }, parsed.random || {});
      merged.deck = Object.assign({ remaining: [], discard: [] }, parsed.deck || {});
      merged.timer = Object.assign({ totalSec: 300, remainingSec: 300, running: false, endAt: null }, parsed.timer || {});
      merged.timer.running = false;
      merged.timer.endAt = null;
      merged.roster = Array.isArray(parsed.roster) ? parsed.roster : [];
      merged.counters = Array.isArray(parsed.counters) ? parsed.counters : [];
      merged.clocks = Array.isArray(parsed.clocks) ? parsed.clocks : [];
      merged.diceHistory = Array.isArray(parsed.diceHistory) ? parsed.diceHistory.slice(0, HISTORY_LIMIT) : [];
      merged.initiative.entries = Array.isArray(merged.initiative.entries) ? merged.initiative.entries : [];
      merged.random.bagRemaining = Array.isArray(merged.random.bagRemaining) ? merged.random.bagRemaining : [];
      merged.deck.remaining = Array.isArray(merged.deck.remaining) ? merged.deck.remaining : [];
      merged.deck.discard = Array.isArray(merged.deck.discard) ? merged.deck.discard : [];
      return merged;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      setStatus('Browser storage is unavailable. The tools still work for this tab, but state cannot be autosaved.');
    }
  }

  function uid(prefix) {
    uidCounter += 1;
    return String(prefix || 'item') + '-' + Date.now().toString(36) + '-' + uidCounter.toString(36);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function randomInt(max) {
    const bounded = Math.max(1, Math.floor(max));
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      const limit = Math.floor(0x100000000 / bounded) * bounded;
      const buffer = new Uint32Array(1);
      do globalThis.crypto.getRandomValues(buffer); while (buffer[0] >= limit);
      return buffer[0] % bounded;
    }
    return Math.floor(Math.random() * bounded);
  }

  function setStatus(message) {
    const target = document.getElementById('ttk-status');
    if (target) target.textContent = message;
  }

  function parseDiceToken(rawToken) {
    let token = rawToken;
    let sign = 1;
    if (token[0] === '+') token = token.slice(1);
    else if (token[0] === '-') {
      sign = -1;
      token = token.slice(1);
    }

    if (/^\d+(?:\.\d+)?$/.test(token)) {
      return { type: 'constant', sign: sign, value: Number(token), raw: rawToken };
    }

    const fate = token.match(/^(\d*)d[fF]$/);
    if (fate) {
      const count = clampNumber(fate[1] || 1, 1, 200, 1);
      return { type: 'fate', sign: sign, count: count, raw: rawToken };
    }

    const match = token.match(/^(\d*)d(\d+)(?:(kh|kl)(\d+))?(!)?$/i);
    if (!match) throw new Error('Unsupported dice term: ' + rawToken);

    const count = clampNumber(match[1] || 1, 1, 200, 1);
    const sides = clampNumber(match[2], 2, 100000, 20);
    const keepMode = match[3] ? match[3].toLowerCase() : null;
    const keepCount = keepMode ? clampNumber(match[4], 1, count, count) : count;
    const explode = Boolean(match[5]);

    return {
      type: 'dice',
      sign: sign,
      count: count,
      sides: sides,
      keepMode: keepMode,
      keepCount: keepCount,
      explode: explode,
      raw: rawToken
    };
  }

  function rollExpression(expression) {
    const normalized = String(expression || '').replace(/\s+/g, '');
    if (!normalized) throw new Error('Enter a dice expression first.');
    const rawTerms = normalized.match(/[+-]?[^+-]+/g);
    if (!rawTerms || rawTerms.join('') !== normalized) throw new Error('Dice expression could not be parsed.');

    let total = 0;
    const details = rawTerms.map(function(rawToken) {
      const term = parseDiceToken(rawToken);

      if (term.type === 'constant') {
        total += term.sign * term.value;
        return { raw: rawToken, subtotal: term.sign * term.value, rolls: [], kept: [] };
      }

      if (term.type === 'fate') {
        const rolls = [];
        for (let i = 0; i < term.count; i += 1) rolls.push(randomInt(3) - 1);
        const subtotal = term.sign * rolls.reduce(function(sum, value) { return sum + value; }, 0);
        total += subtotal;
        return { raw: rawToken, subtotal: subtotal, rolls: rolls, kept: rolls.slice(), fate: true, sides: 6 };
      }

      const rolls = [];
      let safety = 0;
      for (let i = 0; i < term.count; i += 1) {
        let roll = randomInt(term.sides) + 1;
        rolls.push(roll);
        if (term.explode) {
          while (roll === term.sides && safety < 500) {
            safety += 1;
            roll = randomInt(term.sides) + 1;
            rolls.push(roll);
          }
        }
      }

      let kept = rolls.slice();
      if (term.keepMode) {
        const sorted = rolls.slice().sort(function(a, b) { return a - b; });
        kept = term.keepMode === 'kh'
          ? sorted.slice(Math.max(0, sorted.length - term.keepCount))
          : sorted.slice(0, term.keepCount);
      }

      const subtotal = term.sign * kept.reduce(function(sum, value) { return sum + value; }, 0);
      total += subtotal;
      return { raw: rawToken, subtotal: subtotal, rolls: rolls, kept: kept, explode: term.explode, keepMode: term.keepMode, sides: term.sides };
    });

    return { expression: normalized, total: total, details: details, rolledAt: new Date().toISOString() };
  }

  function detailText(result) {
    return result.details.map(function(detail) {
      if (!detail.rolls.length) return detail.raw;
      const kept = detail.kept.join(', ');
      const all = detail.rolls.join(', ');
      if (kept === all) return detail.raw + ' [' + all + ']';
      return detail.raw + ' [' + all + '] kept [' + kept + ']';
    }).join('  ');
  }


  function length3(vector) {
    return Math.hypot(vector[0], vector[1], vector[2]);
  }

  function normalize3(vector) {
    const length = length3(vector) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function fitGeometry(geometry) {
    let maxRadius = 0;
    geometry.vertices.forEach(function(vertex) {
      maxRadius = Math.max(maxRadius, length3(vertex));
    });
    maxRadius = maxRadius || 1;
    return {
      vertices: geometry.vertices.map(function(vertex) {
        return [vertex[0] / maxRadius, vertex[1] / maxRadius, vertex[2] / maxRadius];
      }),
      faces: geometry.faces.map(function(face) { return face.slice(); })
    };
  }

  function makeCoinGeometry() {
    const vertices = [];
    const faces = [];
    const segments = 16;
    const halfHeight = 0.18;
    for (let layer = 0; layer < 2; layer += 1) {
      const y = layer === 0 ? halfHeight : -halfHeight;
      for (let i = 0; i < segments; i += 1) {
        const angle = Math.PI * 2 * i / segments;
        vertices.push([Math.cos(angle), y, Math.sin(angle)]);
      }
    }
    faces.push(Array.from({ length: segments }, function(_, i) { return i; }));
    faces.push(Array.from({ length: segments }, function(_, i) { return segments + (segments - 1 - i); }));
    for (let i = 0; i < segments; i += 1) {
      const next = (i + 1) % segments;
      faces.push([i, next, segments + next, segments + i]);
    }
    return fitGeometry({ vertices: vertices, faces: faces });
  }

  function makeTetraGeometry() {
    return fitGeometry({
      vertices: [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],
      faces: [[0,1,2],[0,3,1],[0,2,3],[1,3,2]]
    });
  }

  function makeCubeGeometry() {
    return fitGeometry({
      vertices: [
        [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
        [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]
      ],
      faces: [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[4,0,3,7]]
    });
  }

  function makeOctaGeometry() {
    return fitGeometry({
      vertices: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],
      faces: [[2,0,4],[2,4,1],[2,1,5],[2,5,0],[3,4,0],[3,1,4],[3,5,1],[3,0,5]]
    });
  }

  function makeD10Geometry() {
    const vertices = [[0,1.08,0],[0,-1.08,0]];
    const faces = [];
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.PI * 2 * i / 10;
      vertices.push([Math.cos(angle), i % 2 === 0 ? 0.16 : -0.16, Math.sin(angle)]);
    }
    for (let i = 0; i < 5; i += 1) {
      const even = 2 + i * 2;
      const odd = 2 + ((i * 2 + 1) % 10);
      const nextEven = 2 + ((i * 2 + 2) % 10);
      const nextOdd = 2 + ((i * 2 + 3) % 10);
      faces.push([0, even, odd, nextEven]);
      faces.push([1, nextOdd, nextEven, odd]);
    }
    return fitGeometry({ vertices: vertices, faces: faces });
  }

  function makeIcosaGeometry() {
    const phi = (1 + Math.sqrt(5)) / 2;
    return fitGeometry({
      vertices: [
        [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
        [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
        [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]
      ],
      faces: [
        [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
        [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
        [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
        [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
      ]
    });
  }

  function makeDodecaGeometry() {
    const ico = makeIcosaGeometry();
    const dualVertices = ico.faces.map(function(face) {
      const center = face.reduce(function(sum, index) {
        const vertex = ico.vertices[index];
        return [sum[0] + vertex[0], sum[1] + vertex[1], sum[2] + vertex[2]];
      }, [0,0,0]).map(function(value) { return value / face.length; });
      return normalize3(center);
    });

    const dualFaces = ico.vertices.map(function(axis, vertexIndex) {
      const adjacent = [];
      ico.faces.forEach(function(face, faceIndex) {
        if (face.indexOf(vertexIndex) !== -1) adjacent.push(faceIndex);
      });
      const normalAxis = normalize3(axis);
      let reference = cross3(normalAxis, [0,1,0]);
      if (length3(reference) < 0.1) reference = cross3(normalAxis, [1,0,0]);
      reference = normalize3(reference);
      const tangent = normalize3(cross3(normalAxis, reference));
      adjacent.sort(function(a, b) {
        const va = dualVertices[a];
        const vb = dualVertices[b];
        const angleA = Math.atan2(dot3(va, tangent), dot3(va, reference));
        const angleB = Math.atan2(dot3(vb, tangent), dot3(vb, reference));
        return angleA - angleB;
      });
      return adjacent;
    });

    return fitGeometry({ vertices: dualVertices, faces: dualFaces });
  }

  function makeD100Geometry() {
    const vertices = [[0,1,0],[0,-1,0]];
    const faces = [];
    const segments = 10;
    const rings = 5;
    for (let ring = 0; ring < rings; ring += 1) {
      const latitude = Math.PI * (ring + 1) / (rings + 1);
      const radius = Math.sin(latitude);
      const y = Math.cos(latitude);
      const offset = ring % 2 ? Math.PI / segments : 0;
      for (let i = 0; i < segments; i += 1) {
        const angle = Math.PI * 2 * i / segments + offset;
        vertices.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
      }
    }
    for (let i = 0; i < segments; i += 1) {
      faces.push([0, 2 + i, 2 + ((i + 1) % segments)]);
    }
    for (let ring = 0; ring < rings - 1; ring += 1) {
      const aStart = 2 + ring * segments;
      const bStart = aStart + segments;
      for (let i = 0; i < segments; i += 1) {
        const next = (i + 1) % segments;
        faces.push([aStart + i, bStart + i, bStart + next]);
        faces.push([aStart + i, bStart + next, aStart + next]);
      }
    }
    const lastStart = 2 + (rings - 1) * segments;
    for (let i = 0; i < segments; i += 1) {
      faces.push([1, lastStart + ((i + 1) % segments), lastStart + i]);
    }
    return fitGeometry({ vertices: vertices, faces: faces });
  }

  function makeGenericGeometry(sides) {
    if (sides <= 2) return makeCoinGeometry();
    if (sides >= 30) return makeD100Geometry();
    const segments = Math.max(3, Math.min(15, Math.round(sides / 2)));
    const vertices = [[0,1,0],[0,-1,0]];
    const faces = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = Math.PI * 2 * i / segments;
      vertices.push([Math.cos(angle), 0, Math.sin(angle)]);
    }
    for (let i = 0; i < segments; i += 1) {
      const next = (i + 1) % segments;
      faces.push([0,2 + i,2 + next]);
      faces.push([1,2 + next,2 + i]);
    }
    return fitGeometry({ vertices: vertices, faces: faces });
  }

  function geometryForDie(sides, fate) {
    const key = fate ? 'fate' : String(sides);
    if (diceGeometryCache[key]) return diceGeometryCache[key];
    let geometry;
    if (fate || sides === 6) geometry = makeCubeGeometry();
    else if (sides === 4) geometry = makeTetraGeometry();
    else if (sides === 8) geometry = makeOctaGeometry();
    else if (sides === 10) geometry = makeD10Geometry();
    else if (sides === 12) geometry = makeDodecaGeometry();
    else if (sides === 20) geometry = makeIcosaGeometry();
    else if (sides === 100) geometry = makeD100Geometry();
    else geometry = makeGenericGeometry(sides);
    diceGeometryCache[key] = geometry;
    return geometry;
  }

  function rotateVertex(vertex, rx, ry, rz) {
    let x = vertex[0];
    let y = vertex[1];
    let z = vertex[2];
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const x1 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x1;
    z = z2;
    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);
    return [x * cosZ - y * sinZ, x * sinZ + y * cosZ, z];
  }

  const DICE_CAMERA_TILT = 0.72;
  const DICE_CAMERA_DISTANCE = 10.8;

  function projectDicePoint(point, width, height) {
    const cosTilt = Math.cos(DICE_CAMERA_TILT);
    const sinTilt = Math.sin(DICE_CAMERA_TILT);
    const viewY = point.y * cosTilt + point.z * sinTilt;
    const viewZ = -point.y * sinTilt + point.z * cosTilt + DICE_CAMERA_DISTANCE;
    const safeDepth = Math.max(1.5, viewZ);
    const focal = Math.min(width, height) * 1.62;
    return {
      x: width * 0.5 + point.x * focal / safeDepth,
      y: height * 0.56 - viewY * focal / safeDepth,
      depth: safeDepth,
      scale: focal / safeDepth
    };
  }

  function dieColorFor(die) {
    if (die.fate) return [220,220,210];
    const palette = {
      2: [186,151,91],
      4: [207,102,76],
      6: [211,177,88],
      8: [77,158,171],
      10: [133,112,194],
      12: [76,151,105],
      20: [190,82,123],
      100: [102,137,184]
    };
    return palette[die.sides] || [177,139,91];
  }

  function collectVisualDice(result) {
    const dice = [];
    (result.details || []).forEach(function(detail) {
      if (!detail.rolls || !detail.rolls.length) return;
      let fate = Boolean(detail.fate);
      let sides = Number(detail.sides || 0);
      if (!sides || fate) {
        try {
          const parsed = parseDiceToken(detail.raw);
          if (parsed.type === 'fate') {
            fate = true;
            sides = 6;
          } else if (parsed.type === 'dice') {
            sides = parsed.sides;
          }
        } catch (_) {
          sides = sides || 6;
        }
      }
      sides = sides || 6;

      const keptCounts = Object.create(null);
      (detail.kept || []).forEach(function(value) {
        const key = String(value);
        keptCounts[key] = (keptCounts[key] || 0) + 1;
      });

      detail.rolls.forEach(function(value) {
        const key = String(value);
        const kept = Boolean(keptCounts[key]);
        if (kept) keptCounts[key] -= 1;
        dice.push({
          sides: sides,
          value: value,
          display: fate ? (value > 0 ? '+' : value < 0 ? '−' : '0') : String(value),
          fate: fate,
          kept: kept
        });
      });
    });
    return dice;
  }

  function buildDiceBodies(dice) {
    const count = dice.length;
    const columns = Math.max(1, Math.ceil(Math.sqrt(count * 1.55)));
    const rows = Math.max(1, Math.ceil(count / columns));
    const spacingX = Math.min(1.65, 9.2 / Math.max(1, columns));
    const spacingZ = Math.min(1.28, 5.2 / Math.max(1, rows));
    const size = Math.max(0.2, Math.min(0.82, Math.min(spacingX, spacingZ) * 0.52));

    return dice.map(function(die, index) {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, count - row * columns);
      const column = index % columns;
      const targetX = (column - (rowCount - 1) / 2) * spacingX;
      const targetZ = (row - (rows - 1) / 2) * spacingZ;
      const seed = Number(die.value) || index + 1;
      const sourceSide = index % 2 === 0 ? -1 : 1;
      const startX = sourceSide * (3.5 + Math.random() * 1.15) + (Math.random() - 0.5) * 0.55;
      const startZ = -2.78 + Math.random() * 0.55;
      const startY = size * 0.95 + 0.35 + Math.random() * 0.45;
      return {
        die: die,
        geometry: geometryForDie(die.sides, die.fate),
        size: size,
        radius: size * 0.94,
        x: startX,
        y: startY,
        z: startZ,
        vx: (targetX - startX) * (1.55 + Math.random() * 0.35) + (Math.random() - 0.5) * 1.1,
        vy: 6.2 + Math.random() * 2.4,
        vz: (targetZ - startZ) * (1.55 + Math.random() * 0.4) + 2.1 + Math.random() * 1.25,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        avx: (Math.random() - 0.5) * 34,
        avy: (Math.random() - 0.5) * 34,
        avz: (Math.random() - 0.5) * 34,
        targetX: targetX,
        targetZ: targetZ,
        bounces: 0,
        finalRx: ((seed * 37 + index * 11) % 360) * Math.PI / 180,
        finalRy: ((seed * 71 + index * 17) % 360) * Math.PI / 180,
        finalRz: ((seed * 19 + index * 29) % 360) * Math.PI / 180
      };
    });
  }

  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function resolveDiceBodyCollisions(bodies) {
    if (bodies.length > 24) return;
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        if (Math.abs(a.y - b.y) > (a.radius + b.radius) * 0.85) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const minDistance = (a.radius + b.radius) * 0.78;
        const distance = Math.hypot(dx, dz);
        if (!distance || distance >= minDistance) continue;
        const nx = dx / distance;
        const nz = dz / distance;
        const overlap = (minDistance - distance) * 0.5;
        a.x -= nx * overlap;
        a.z -= nz * overlap;
        b.x += nx * overlap;
        b.z += nz * overlap;
        const relative = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (relative < 0) {
          const impulse = -relative * 0.52;
          a.vx -= nx * impulse;
          a.vz -= nz * impulse;
          b.vx += nx * impulse;
          b.vz += nz * impulse;
          a.avx += nz * 2.4;
          a.avz -= nx * 2.4;
          b.avx -= nz * 2.4;
          b.avz += nx * 2.4;
        }
      }
    }
  }

  function stepDiceBodies(bodies, delta, elapsed) {
    bodies.forEach(function(body) {
      body.vy -= 12.4 * delta;
      body.vx *= Math.pow(0.993, delta * 60);
      body.vz *= Math.pow(0.993, delta * 60);
      body.x += body.vx * delta;
      body.y += body.vy * delta;
      body.z += body.vz * delta;
      body.rx += body.avx * delta;
      body.ry += body.avy * delta;
      body.rz += body.avz * delta;

      if (Math.abs(body.x) > 5.05) {
        body.x = Math.sign(body.x) * 5.05;
        body.vx *= -0.56;
        body.avz += body.vx * 0.85;
      }
      if (Math.abs(body.z) > 2.9) {
        body.z = Math.sign(body.z) * 2.9;
        body.vz *= -0.56;
        body.avx -= body.vz * 0.85;
      }

      if (body.y <= body.radius) {
        body.y = body.radius;
        if (Math.abs(body.vy) > 0.7 && body.bounces < 5) {
          body.vy = Math.abs(body.vy) * (0.46 - Math.min(0.16, body.bounces * 0.035));
          body.bounces += 1;
          body.avx += (Math.random() - 0.5) * 5;
          body.avz += (Math.random() - 0.5) * 5;
        } else {
          body.vy = 0;
        }
        body.vx *= 0.88;
        body.vz *= 0.88;
        body.avx *= 0.9;
        body.avy *= 0.9;
        body.avz *= 0.9;
      }

      if (elapsed > 2.05) {
        body.vx += (body.targetX - body.x) * 4.5 * delta;
        body.vz += (body.targetZ - body.z) * 4.5 * delta;
        body.avx *= Math.pow(0.9, delta * 60);
        body.avy *= Math.pow(0.9, delta * 60);
        body.avz *= Math.pow(0.9, delta * 60);
      }

      if (elapsed > 2.6) {
        const settle = Math.min(1, delta * 6.2);
        body.x += (body.targetX - body.x) * settle;
        body.z += (body.targetZ - body.z) * settle;
        body.y += (body.radius - body.y) * settle;
        body.rx += normalizeAngle(body.finalRx - body.rx) * settle;
        body.ry += normalizeAngle(body.finalRy - body.ry) * settle;
        body.rz += normalizeAngle(body.finalRz - body.rz) * settle;
      }
    });
    if (elapsed < 2.25) resolveDiceBodyCollisions(bodies);
  }

  function drawDiceTray(bodies, reveal) {
    const canvas = document.getElementById('ttk-dice-tray');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
    const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const floorCorners = [
      {x:-5.7,y:0,z:-3.2},{x:5.7,y:0,z:-3.2},
      {x:5.7,y:0,z:3.2},{x:-5.7,y:0,z:3.2}
    ].map(function(point) { return projectDicePoint(point, width, height); });
    ctx.beginPath();
    ctx.moveTo(floorCorners[0].x, floorCorners[0].y);
    for (let i = 1; i < floorCorners.length; i += 1) ctx.lineTo(floorCorners[i].x, floorCorners[i].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(7,9,14,.44)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,189,123,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    for (let x = -4; x <= 4; x += 2) {
      const a = projectDicePoint({x:x,y:0,z:-3.2}, width, height);
      const b = projectDicePoint({x:x,y:0,z:3.2}, width, height);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    for (let z = -2; z <= 2; z += 1) {
      const a = projectDicePoint({x:-5.7,y:0,z:z}, width, height);
      const b = projectDicePoint({x:5.7,y:0,z:z}, width, height);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }

    bodies.forEach(function(body) {
      const shadow = projectDicePoint({x:body.x,y:0.015,z:body.z}, width, height);
      const shadowRadius = Math.max(3, body.size * shadow.scale * 0.85);
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, shadowRadius, shadowRadius * 0.34, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fill();
    });

    const faceQueue = [];
    bodies.forEach(function(body, bodyIndex) {
      const transformed = body.geometry.vertices.map(function(vertex) {
        const rotated = rotateVertex(vertex, body.rx, body.ry, body.rz);
        return {
          x: body.x + rotated[0] * body.size,
          y: body.y + rotated[1] * body.size,
          z: body.z + rotated[2] * body.size
        };
      });
      body.geometry.faces.forEach(function(face) {
        const worldPoints = face.map(function(index) { return transformed[index]; });
        if (worldPoints.length < 3) return;
        const faceCenter = worldPoints.reduce(function(sum, point) {
          return [sum[0] + point.x, sum[1] + point.y, sum[2] + point.z];
        }, [0,0,0]).map(function(value) { return value / worldPoints.length; });
        const ab = [
          worldPoints[1].x - worldPoints[0].x,
          worldPoints[1].y - worldPoints[0].y,
          worldPoints[1].z - worldPoints[0].z
        ];
        const ac = [
          worldPoints[2].x - worldPoints[0].x,
          worldPoints[2].y - worldPoints[0].y,
          worldPoints[2].z - worldPoints[0].z
        ];
        let normal = normalize3(cross3(ab, ac));
        const outward = [faceCenter[0] - body.x, faceCenter[1] - body.y, faceCenter[2] - body.z];
        if (dot3(normal, outward) < 0) normal = [-normal[0], -normal[1], -normal[2]];
        const camera = [
          0,
          DICE_CAMERA_DISTANCE * Math.sin(DICE_CAMERA_TILT),
          -DICE_CAMERA_DISTANCE * Math.cos(DICE_CAMERA_TILT)
        ];
        const toCamera = normalize3([
          camera[0] - faceCenter[0],
          camera[1] - faceCenter[1],
          camera[2] - faceCenter[2]
        ]);
        if (dot3(normal, toCamera) <= 0.015) return;
        const screenPoints = worldPoints.map(function(point) { return projectDicePoint(point, width, height); });
        const averageDepth = screenPoints.reduce(function(sum, point) { return sum + point.depth; }, 0) / screenPoints.length;
        const brightness = 0.43 + Math.max(0, dot3(normal, normalize3([-0.45,0.9,-0.2]))) * 0.52;
        faceQueue.push({
          body: body,
          bodyIndex: bodyIndex,
          points: screenPoints,
          depth: averageDepth,
          brightness: brightness
        });
      });
    });
    faceQueue.sort(function(a, b) { return b.depth - a.depth; });

    faceQueue.forEach(function(face) {
      const color = dieColorFor(face.body.die);
      const keptAlpha = face.body.die.kept ? 0.92 : (reveal > 0.7 ? 0.36 : 0.72);
      const r = Math.min(255, Math.round(color[0] * face.brightness));
      const g = Math.min(255, Math.round(color[1] * face.brightness));
      const b = Math.min(255, Math.round(color[2] * face.brightness));
      ctx.beginPath();
      ctx.moveTo(face.points[0].x, face.points[0].y);
      for (let i = 1; i < face.points.length; i += 1) ctx.lineTo(face.points[i].x, face.points[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + keptAlpha + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,244,218,' + (face.body.die.kept ? 0.42 : 0.18) + ')';
      ctx.lineWidth = 0.85;
      ctx.stroke();
    });

    if (reveal > 0.08) {
      const labelAlpha = Math.min(1, (reveal - 0.08) / 0.72);
      bodies.forEach(function(body) {
        const center = projectDicePoint({x:body.x,y:body.y + body.size * 0.16,z:body.z}, width, height);
        const radius = Math.max(9, Math.min(27, body.size * center.scale * 0.48));
        const color = dieColorFor(body.die);
        ctx.save();
        ctx.globalAlpha = labelAlpha * (body.die.kept ? 1 : 0.62);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,10,15,.87)';
        ctx.fill();
        ctx.lineWidth = body.die.kept ? 2 : 1;
        ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',.95)';
        ctx.stroke();
        ctx.fillStyle = '#fff5df';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 ' + Math.max(10, Math.floor(radius * 1.04)) + 'px system-ui, sans-serif';
        ctx.fillText(body.die.display, center.x, center.y - (bodies.length <= 28 ? 2 : 0));
        if (bodies.length <= 28) {
          ctx.fillStyle = 'rgba(255,245,223,.66)';
          ctx.font = '700 ' + Math.max(7, Math.floor(radius * 0.4)) + 'px system-ui, sans-serif';
          ctx.fillText(body.die.fate ? 'dF' : 'd' + body.die.sides, center.x, center.y + radius * 0.55);
        }
        ctx.restore();
      });
    }
  }

  function clearDiceTray() {
    diceTrayRun += 1;
    if (diceTrayAnimationFrame) cancelAnimationFrame(diceTrayAnimationFrame);
    diceTrayAnimationFrame = 0;
    diceTrayBodies = [];
    diceTrayReveal = 0;
    const canvas = document.getElementById('ttk-dice-tray');
    const hint = document.getElementById('ttk-dice-stage-hint');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.setAttribute('aria-label', '3D dice tray. Roll dice to animate them.');
    }
    if (hint) {
      hint.hidden = false;
      hint.textContent = '3D dice tray';
    }
  }

  function initializeDiceTray() {
    const stage = document.getElementById('ttk-dice-stage');
    if (!stage) return;
    if (diceTrayResizeObserver) diceTrayResizeObserver.disconnect();
    if (typeof ResizeObserver === 'function') {
      diceTrayResizeObserver = new ResizeObserver(function() {
        if (diceTrayBodies.length) drawDiceTray(diceTrayBodies, diceTrayReveal);
      });
      diceTrayResizeObserver.observe(stage);
    }
  }

  function setDiceReadout(result) {
    const total = document.getElementById('ttk-dice-total');
    const detail = document.getElementById('ttk-dice-detail');
    if (total) total.textContent = String(result.total);
    if (detail) detail.textContent = detailText(result);
  }

  function setDiceRollingReadout(result) {
    const total = document.getElementById('ttk-dice-total');
    const detail = document.getElementById('ttk-dice-detail');
    const diceCount = collectVisualDice(result).length;
    if (total) total.textContent = '…';
    if (detail) detail.textContent = diceCount ? ('Rolling ' + diceCount + (diceCount === 1 ? ' die…' : ' dice…')) : 'Resolving expression…';
  }

  function renderDiceTray(result, instant, onSettled) {
    const canvas = document.getElementById('ttk-dice-tray');
    const hint = document.getElementById('ttk-dice-stage-hint');
    if (!canvas) return;
    const dice = collectVisualDice(result);
    diceTrayRun += 1;
    const runId = diceTrayRun;
    if (diceTrayAnimationFrame) cancelAnimationFrame(diceTrayAnimationFrame);
    diceTrayAnimationFrame = 0;

    if (!dice.length) {
      diceTrayBodies = [];
      diceTrayReveal = 0;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.setAttribute('aria-label', 'No physical dice in this expression.');
      if (hint) {
        hint.hidden = false;
        hint.textContent = 'No physical dice in this expression';
      }
      if (typeof onSettled === 'function') onSettled();
      return;
    }

    if (hint) hint.hidden = true;
    canvas.setAttribute(
      'aria-label',
      dice.length + ' three-dimensional dice: ' + dice.map(function(die) { return (die.fate ? 'dF' : 'd' + die.sides) + ' result ' + die.display; }).join(', ')
    );
    diceTrayBodies = buildDiceBodies(dice);
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant || reducedMotion) {
      diceTrayBodies.forEach(function(body) {
        body.x = body.targetX;
        body.z = body.targetZ;
        body.y = body.radius;
        body.rx = body.finalRx;
        body.ry = body.finalRy;
        body.rz = body.finalRz;
      });
      diceTrayReveal = 1;
      drawDiceTray(diceTrayBodies, diceTrayReveal);
      if (typeof onSettled === 'function') onSettled();
      return;
    }

    drawDiceTray(diceTrayBodies, 0);
    let previous = performance.now();
    const started = previous;
    function frame(now) {
      if (runId !== diceTrayRun) return;
      const delta = Math.min(0.034, Math.max(0.001, (now - previous) / 1000));
      const elapsed = (now - started) / 1000;
      previous = now;
      stepDiceBodies(diceTrayBodies, delta, elapsed);
      diceTrayReveal = Math.max(0, Math.min(1, (elapsed - 2.42) / 0.72));
      drawDiceTray(diceTrayBodies, diceTrayReveal);
      if (elapsed < 3.35) {
        diceTrayAnimationFrame = requestAnimationFrame(frame);
      } else {
        diceTrayBodies.forEach(function(body) {
          body.x = body.targetX;
          body.z = body.targetZ;
          body.y = body.radius;
          body.rx = body.finalRx;
          body.ry = body.finalRy;
          body.rz = body.finalRz;
        });
        diceTrayReveal = 1;
        drawDiceTray(diceTrayBodies, diceTrayReveal);
        diceTrayAnimationFrame = 0;
        if (typeof onSettled === 'function') onSettled();
      }
    }
    diceTrayAnimationFrame = requestAnimationFrame(frame);
  }

  function performRoll(expression, label) {
    try {
      const result = rollExpression(expression);
      result.id = uid('roll');
      result.label = label || '';
      state.diceHistory.unshift(result);
      state.diceHistory = state.diceHistory.slice(0, HISTORY_LIMIT);
      saveState();
      setDiceRollingReadout(result);
      setStatus('Rolling ' + result.expression + '…');
      renderDiceTray(result, false, function() {
        if (!state.diceHistory[0] || state.diceHistory[0].id !== result.id) return;
        setDiceReadout(result);
        renderDiceHistory();
        setStatus('Rolled ' + result.expression + ' → ' + result.total + '.');
      });
      return result;
    } catch (error) {
      setStatus(error.message);
      return null;
    }
  }

  function renderDiceHistory() {
    const target = document.getElementById('ttk-dice-history');
    if (!target) return;
    if (!state.diceHistory.length) {
      target.innerHTML = '<li class="ttk-empty">No rolls yet.</li>';
      return;
    }
    target.innerHTML = state.diceHistory.map(function(item) {
      return '<li><div><strong>' + esc(item.label || item.expression) + '</strong><span>' + esc(item.expression) + '</span></div><b>' + esc(item.total) + '</b><small>' + esc(detailText(item)) + '</small></li>';
    }).join('');
  }

  function addInitiativeEntry() {
    const name = document.getElementById('ttk-init-name');
    const initiative = document.getElementById('ttk-init-value');
    if (!name || !name.value.trim()) return setStatus('Give the combatant a name first.');
    state.initiative.entries.push({
      id: uid('combatant'),
      name: name.value.trim(),
      initiative: clampNumber(initiative && initiative.value, -999, 999, 0),
      hp: 10,
      maxHp: 10,
      defense: '',
      conditions: ''
    });
    name.value = '';
    if (initiative) initiative.value = '';
    sortInitiative();
  }

  function sortInitiative() {
    const currentId = state.initiative.entries[state.initiative.index] && state.initiative.entries[state.initiative.index].id;
    state.initiative.entries.sort(function(a, b) {
      return Number(b.initiative || 0) - Number(a.initiative || 0) || String(a.name || '').localeCompare(String(b.name || ''));
    });
    state.initiative.index = Math.max(0, state.initiative.entries.findIndex(function(entry) { return entry.id === currentId; }));
    if (state.initiative.index < 0) state.initiative.index = 0;
    saveState();
    renderInitiative();
  }

  function nextTurn() {
    if (!state.initiative.entries.length) return setStatus('Add combatants before advancing the turn.');
    state.initiative.index += 1;
    if (state.initiative.index >= state.initiative.entries.length) {
      state.initiative.index = 0;
      state.initiative.round += 1;
    }
    saveState();
    renderInitiative();
  }

  function resetCombat() {
    state.initiative.round = 1;
    state.initiative.index = 0;
    saveState();
    renderInitiative();
  }

  function renderInitiative() {
    const target = document.getElementById('ttk-initiative-list');
    const round = document.getElementById('ttk-round');
    if (round) round.textContent = String(state.initiative.round);
    if (!target) return;
    if (!state.initiative.entries.length) {
      target.innerHTML = '<div class="ttk-empty">No combatants yet.</div>';
      return;
    }
    target.innerHTML = state.initiative.entries.map(function(entry, index) {
      const active = index === state.initiative.index;
      return '<article class="ttk-combatant' + (active ? ' is-active' : '') + '" draggable="true" data-kind="initiative" data-id="' + esc(entry.id) + '">' +
        '<div class="ttk-drag" title="Drag to reorder" aria-hidden="true">⋮⋮</div>' +
        '<div class="ttk-combatant-main"><input class="ttk-inline-name" data-init-field="name" value="' + esc(entry.name) + '" aria-label="Combatant name">' +
        '<label>Init<input type="number" data-init-field="initiative" value="' + esc(entry.initiative) + '"></label>' +
        '<label>HP<input type="number" data-init-field="hp" value="' + esc(entry.hp) + '"></label>' +
        '<span>/</span><input class="ttk-mini-number" type="number" data-init-field="maxHp" value="' + esc(entry.maxHp) + '" aria-label="Maximum HP">' +
        '<label>Def<input data-init-field="defense" value="' + esc(entry.defense) + '"></label></div>' +
        '<div class="ttk-condition-row"><input data-init-field="conditions" value="' + esc(entry.conditions) + '" placeholder="Conditions, concentration, status…"></div>' +
        '<div class="ttk-row-actions"><button type="button" data-init-hp="-1">−1 HP</button><button type="button" data-init-hp="1">+1 HP</button><button type="button" data-move="-1">↑</button><button type="button" data-move="1">↓</button><button type="button" data-remove-init>Remove</button></div>' +
        '</article>';
    }).join('');
  }

  function addRosterCard() {
    state.roster.push({
      id: uid('character'),
      name: 'New Character',
      role: '',
      system: '',
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      defense: '',
      speed: '',
      resourceName: 'Resource',
      resource: 0,
      resourceMax: 0,
      notes: ''
    });
    saveState();
    renderRoster();
  }

  function renderRoster() {
    const target = document.getElementById('ttk-roster');
    if (!target) return;
    if (!state.roster.length) {
      target.innerHTML = '<div class="ttk-empty">Add a character card. Cards can be dragged into marching order, spotlight order, watch order, or whatever other trouble the party invents.</div>';
      return;
    }
    target.innerHTML = state.roster.map(function(character) {
      return '<article class="ttk-character-card" draggable="true" data-kind="roster" data-id="' + esc(character.id) + '">' +
        '<header><span class="ttk-drag" title="Drag to reorder" aria-hidden="true">⋮⋮</span><input data-roster-field="name" value="' + esc(character.name) + '" aria-label="Character name"><button type="button" data-remove-roster>×</button></header>' +
        '<div class="ttk-card-grid"><label>Role<input data-roster-field="role" value="' + esc(character.role) + '"></label><label>System<input data-roster-field="system" value="' + esc(character.system) + '"></label>' +
        '<label>HP<input type="number" data-roster-field="hp" value="' + esc(character.hp) + '"></label><label>Max HP<input type="number" data-roster-field="maxHp" value="' + esc(character.maxHp) + '"></label>' +
        '<label>Temp<input type="number" data-roster-field="tempHp" value="' + esc(character.tempHp) + '"></label><label>Defense<input data-roster-field="defense" value="' + esc(character.defense) + '"></label>' +
        '<label>Speed<input data-roster-field="speed" value="' + esc(character.speed) + '"></label><label>Resource Name<input data-roster-field="resourceName" value="' + esc(character.resourceName) + '"></label>' +
        '<label>Resource<input type="number" data-roster-field="resource" value="' + esc(character.resource) + '"></label><label>Resource Max<input type="number" data-roster-field="resourceMax" value="' + esc(character.resourceMax) + '"></label></div>' +
        '<label class="ttk-wide">Quick Notes<textarea rows="2" data-roster-field="notes">' + esc(character.notes) + '</textarea></label>' +
        '<div class="ttk-row-actions"><button type="button" data-roster-hp="-1">−1 HP</button><button type="button" data-roster-hp="1">+1 HP</button><button type="button" data-roster-resource="-1">− Resource</button><button type="button" data-roster-resource="1">+ Resource</button><button type="button" data-move="-1">↑</button><button type="button" data-move="1">↓</button></div>' +
        '</article>';
    }).join('');
  }

  function addCounter() {
    const name = document.getElementById('ttk-counter-name');
    const max = document.getElementById('ttk-counter-max');
    const step = document.getElementById('ttk-counter-step');
    const counterName = name && name.value.trim() ? name.value.trim() : 'Counter';
    const maximum = clampNumber(max && max.value, 0, 999999, 10);
    state.counters.push({ id: uid('counter'), name: counterName, value: 0, max: maximum, step: clampNumber(step && step.value, 1, 999999, 1) });
    if (name) name.value = '';
    saveState();
    renderTrackers();
  }

  function addClock() {
    const name = document.getElementById('ttk-clock-name');
    const segments = document.getElementById('ttk-clock-segments');
    state.clocks.push({
      id: uid('clock'),
      name: name && name.value.trim() ? name.value.trim() : 'Clock',
      segments: clampNumber(segments && segments.value, 2, 12, 6),
      filled: 0
    });
    if (name) name.value = '';
    saveState();
    renderTrackers();
  }

  function renderTrackers() {
    const counters = document.getElementById('ttk-counters');
    const clocks = document.getElementById('ttk-clocks');
    if (counters) {
      counters.innerHTML = state.counters.length ? state.counters.map(function(counter) {
        return '<article class="ttk-counter" data-id="' + esc(counter.id) + '"><input data-counter-field="name" value="' + esc(counter.name) + '" aria-label="Counter name"><div><button type="button" data-counter-delta="' + esc(-Number(counter.step || 1)) + '">−</button><strong>' + esc(counter.value) + (Number(counter.max) > 0 ? ' / ' + esc(counter.max) : '') + '</strong><button type="button" data-counter-delta="' + esc(Number(counter.step || 1)) + '">+</button><button type="button" data-remove-counter>×</button></div></article>';
      }).join('') : '<div class="ttk-empty">No counters yet.</div>';
    }
    if (clocks) {
      clocks.innerHTML = state.clocks.length ? state.clocks.map(function(clock) {
        const segmentButtons = Array.from({ length: Number(clock.segments) || 6 }, function(_, index) {
          return '<button type="button" class="' + (index < Number(clock.filled || 0) ? 'is-filled' : '') + '" data-clock-fill="' + (index + 1) + '" aria-label="Set clock to ' + (index + 1) + ' of ' + clock.segments + '">' + (index + 1) + '</button>';
        }).join('');
        return '<article class="ttk-clock" data-id="' + esc(clock.id) + '"><header><input data-clock-field="name" value="' + esc(clock.name) + '" aria-label="Clock name"><span>' + esc(clock.filled) + '/' + esc(clock.segments) + '</span><button type="button" data-remove-clock>×</button></header><div class="ttk-clock-segments">' + segmentButtons + '</div></article>';
      }).join('') : '<div class="ttk-empty">No clocks yet.</div>';
    }
  }

  function parseWeightedTable(text) {
    return String(text || '').split(/\r?\n/).map(function(line) { return line.trim(); }).filter(Boolean).map(function(line) {
      const match = line.match(/^(\d+(?:\.\d+)?)\s*\|\s*(.+)$/);
      if (match) return { weight: Math.max(0, Number(match[1])), value: match[2].trim() };
      return { weight: 1, value: line };
    }).filter(function(item) { return item.value && item.weight > 0; });
  }

  function drawWeighted() {
    const entries = parseWeightedTable(state.random.tableText);
    if (!entries.length) return setStatus('Add at least one random-table entry.');
    const totalWeight = entries.reduce(function(sum, item) { return sum + item.weight; }, 0);
    let cursor = (randomInt(1000000) / 1000000) * totalWeight;
    let chosen = entries[entries.length - 1];
    for (const item of entries) {
      cursor -= item.weight;
      if (cursor < 0) {
        chosen = item;
        break;
      }
    }
    const output = document.getElementById('ttk-random-result');
    if (output) output.textContent = chosen.value;
    setStatus('Random table selected: ' + chosen.value);
  }

  function bagItems() {
    return String(state.random.bagText || '').split(/\r?\n/).map(function(item) { return item.trim(); }).filter(Boolean);
  }

  function resetBag() {
    state.random.bagRemaining = bagItems();
    saveState();
    renderBagStatus();
    setStatus('Token bag reset with ' + state.random.bagRemaining.length + ' entries.');
  }

  function drawBag() {
    if (!state.random.bagRemaining.length) state.random.bagRemaining = bagItems();
    if (!state.random.bagRemaining.length) return setStatus('Add entries to the token bag first.');
    const index = randomInt(state.random.bagRemaining.length);
    const chosen = state.random.bagRemaining.splice(index, 1)[0];
    saveState();
    const output = document.getElementById('ttk-bag-result');
    if (output) output.textContent = chosen;
    renderBagStatus();
    setStatus('Drew "' + chosen + '" without replacement.');
  }

  function renderBagStatus() {
    const status = document.getElementById('ttk-bag-status');
    if (status) status.textContent = state.random.bagRemaining.length + ' token(s) remain in the current bag.';
  }

  function makeDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const cards = [];
    suits.forEach(function(suit) {
      ranks.forEach(function(rank) {
        cards.push(rank + suit);
      });
    });
    return cards;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function resetDeck(report) {
    state.deck.remaining = shuffle(makeDeck());
    state.deck.discard = [];
    saveState();
    renderDeck();
    if (report !== false) setStatus('Standard 52-card deck shuffled.');
  }

  function drawCard() {
    if (!state.deck.remaining.length) resetDeck(false);
    const card = state.deck.remaining.pop();
    if (card) state.deck.discard.unshift(card);
    saveState();
    renderDeck();
    setStatus(card ? 'Drew ' + card + '.' : 'The deck is empty.');
  }

  function renderDeck() {
    const top = document.getElementById('ttk-card-drawn');
    const count = document.getElementById('ttk-card-count');
    const discard = document.getElementById('ttk-card-discard');
    if (top) top.textContent = state.deck.discard[0] || '—';
    if (count) count.textContent = String(state.deck.remaining.length);
    if (discard) discard.textContent = state.deck.discard.slice(0, 12).join('  ') || 'No cards drawn.';
  }

  function formatTimer(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function updateTimerDisplay() {
    const display = document.getElementById('ttk-timer-display');
    if (display) display.textContent = formatTimer(state.timer.remainingSec);
  }

  function timerTick() {
    if (!state.timer.running || !state.timer.endAt) return;
    const remaining = Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
    state.timer.remainingSec = remaining;
    updateTimerDisplay();
    if (remaining <= 0) {
      state.timer.running = false;
      state.timer.endAt = null;
      stopTimerLoop();
      saveState();
      setStatus('Turn timer expired.');
    }
  }

  function startTimer() {
    if (!state.timer.running) {
      if (state.timer.remainingSec <= 0) state.timer.remainingSec = state.timer.totalSec;
      state.timer.endAt = Date.now() + (state.timer.remainingSec * 1000);
      state.timer.running = true;
      startTimerLoop();
      saveState();
      setStatus('Turn timer started.');
    }
  }

  function pauseTimer() {
    timerTick();
    state.timer.running = false;
    state.timer.endAt = null;
    stopTimerLoop();
    saveState();
    setStatus('Turn timer paused.');
  }

  function resetTimer() {
    state.timer.running = false;
    state.timer.endAt = null;
    state.timer.remainingSec = state.timer.totalSec;
    stopTimerLoop();
    saveState();
    updateTimerDisplay();
    setStatus('Turn timer reset.');
  }

  function startTimerLoop() {
    stopTimerLoop();
    timerInterval = setInterval(timerTick, 250);
  }

  function stopTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function moveItem(list, id, direction) {
    const index = list.findIndex(function(item) { return item.id === id; });
    if (index < 0) return;
    const target = Math.min(list.length - 1, Math.max(0, index + direction));
    if (target === index) return;
    const moved = list.splice(index, 1)[0];
    list.splice(target, 0, moved);
  }

  function moveBefore(list, sourceId, targetId) {
    const sourceIndex = list.findIndex(function(item) { return item.id === sourceId; });
    const targetIndex = list.findIndex(function(item) { return item.id === targetId; });
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const moved = list.splice(sourceIndex, 1)[0];
    const adjustedTarget = list.findIndex(function(item) { return item.id === targetId; });
    list.splice(adjustedTarget, 0, moved);
  }

  function bindDrag(containerId, listName, render) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('dragstart', function(event) {
      const card = event.target.closest('[draggable="true"][data-id]');
      if (!card) return;
      dragContext = { listName: listName, id: card.dataset.id };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.dataset.id);
      }
      card.classList.add('is-dragging');
    });
    container.addEventListener('dragend', function(event) {
      const card = event.target.closest('[draggable="true"][data-id]');
      if (card) card.classList.remove('is-dragging');
      dragContext = null;
    });
    container.addEventListener('dragover', function(event) {
      if (!dragContext || dragContext.listName !== listName) return;
      const target = event.target.closest('[draggable="true"][data-id]');
      if (!target || target.dataset.id === dragContext.id) return;
      event.preventDefault();
    });
    container.addEventListener('drop', function(event) {
      if (!dragContext || dragContext.listName !== listName) return;
      const target = event.target.closest('[draggable="true"][data-id]');
      if (!target || target.dataset.id === dragContext.id) return;
      event.preventDefault();
      const list = listName === 'initiative' ? state.initiative.entries : state.roster;
      moveBefore(list, dragContext.id, target.dataset.id);
      if (listName === 'initiative') state.initiative.index = 0;
      saveState();
      render();
      dragContext = null;
    });
  }

  function activateTab(tabName) {
    document.querySelectorAll('#tabletop-toolkit-mount [data-tool-tab]').forEach(function(button) {
      const active = button.dataset.toolTab === tabName;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#tabletop-toolkit-mount [data-tool-panel]').forEach(function(panel) {
      panel.hidden = panel.dataset.toolPanel !== tabName;
    });
  }

  function bindStaticEvents() {
    const root = document.getElementById('tabletop-toolkit-mount');
    if (!root) return;

    root.addEventListener('click', function(event) {
      const tab = event.target.closest('[data-tool-tab]');
      if (tab) return activateTab(tab.dataset.toolTab);

      const quick = event.target.closest('[data-quick-roll]');
      if (quick) return performRoll(quick.dataset.quickRoll, quick.textContent.trim());

      if (event.target.closest('#ttk-roll')) {
        const expression = document.getElementById('ttk-dice-expression');
        const label = document.getElementById('ttk-dice-label');
        return performRoll(expression && expression.value, label && label.value.trim());
      }
      if (event.target.closest('#ttk-clear-rolls')) {
        state.diceHistory = [];
        saveState();
        renderDiceHistory();
        clearDiceTray();
        const total = document.getElementById('ttk-dice-total');
        const detail = document.getElementById('ttk-dice-detail');
        if (total) total.textContent = '—';
        if (detail) detail.textContent = 'Roll something unreasonable.';
        return setStatus('Dice history cleared.');
      }

      if (event.target.closest('#ttk-add-init')) return addInitiativeEntry();
      if (event.target.closest('#ttk-sort-init')) return sortInitiative();
      if (event.target.closest('#ttk-next-turn')) return nextTurn();
      if (event.target.closest('#ttk-reset-combat')) return resetCombat();

      const initCard = event.target.closest('.ttk-combatant[data-id]');
      if (initCard) {
        const entry = state.initiative.entries.find(function(item) { return item.id === initCard.dataset.id; });
        if (!entry) return;
        const hpButton = event.target.closest('[data-init-hp]');
        if (hpButton) {
          entry.hp = Number(entry.hp || 0) + Number(hpButton.dataset.initHp || 0);
          saveState();
          return renderInitiative();
        }
        const move = event.target.closest('[data-move]');
        if (move) {
          moveItem(state.initiative.entries, entry.id, Number(move.dataset.move));
          state.initiative.index = Math.max(0, state.initiative.entries.findIndex(function(item) { return item.id === entry.id; }));
          saveState();
          return renderInitiative();
        }
        if (event.target.closest('[data-remove-init]')) {
          const index = state.initiative.entries.findIndex(function(item) { return item.id === entry.id; });
          state.initiative.entries.splice(index, 1);
          state.initiative.index = Math.min(state.initiative.index, Math.max(0, state.initiative.entries.length - 1));
          saveState();
          return renderInitiative();
        }
      }

      if (event.target.closest('#ttk-add-roster')) return addRosterCard();
      const rosterCard = event.target.closest('.ttk-character-card[data-id]');
      if (rosterCard) {
        const character = state.roster.find(function(item) { return item.id === rosterCard.dataset.id; });
        if (!character) return;
        const hpButton = event.target.closest('[data-roster-hp]');
        if (hpButton) {
          character.hp = Number(character.hp || 0) + Number(hpButton.dataset.rosterHp || 0);
          saveState();
          return renderRoster();
        }
        const resourceButton = event.target.closest('[data-roster-resource]');
        if (resourceButton) {
          character.resource = Number(character.resource || 0) + Number(resourceButton.dataset.rosterResource || 0);
          saveState();
          return renderRoster();
        }
        const move = event.target.closest('[data-move]');
        if (move) {
          moveItem(state.roster, character.id, Number(move.dataset.move));
          saveState();
          return renderRoster();
        }
        if (event.target.closest('[data-remove-roster]')) {
          state.roster = state.roster.filter(function(item) { return item.id !== character.id; });
          saveState();
          return renderRoster();
        }
      }

      if (event.target.closest('#ttk-add-counter')) return addCounter();
      const counter = event.target.closest('.ttk-counter[data-id]');
      if (counter) {
        const item = state.counters.find(function(entry) { return entry.id === counter.dataset.id; });
        if (!item) return;
        const delta = event.target.closest('[data-counter-delta]');
        if (delta) {
          item.value = Number(item.value || 0) + Number(delta.dataset.counterDelta || 0);
          if (Number(item.max) > 0) item.value = Math.min(Number(item.max), item.value);
          saveState();
          return renderTrackers();
        }
        if (event.target.closest('[data-remove-counter]')) {
          state.counters = state.counters.filter(function(entry) { return entry.id !== item.id; });
          saveState();
          return renderTrackers();
        }
      }

      if (event.target.closest('#ttk-add-clock')) return addClock();
      const clock = event.target.closest('.ttk-clock[data-id]');
      if (clock) {
        const item = state.clocks.find(function(entry) { return entry.id === clock.dataset.id; });
        if (!item) return;
        const fill = event.target.closest('[data-clock-fill]');
        if (fill) {
          item.filled = Number(fill.dataset.clockFill) === Number(item.filled) ? Math.max(0, Number(item.filled) - 1) : Number(fill.dataset.clockFill);
          saveState();
          return renderTrackers();
        }
        if (event.target.closest('[data-remove-clock]')) {
          state.clocks = state.clocks.filter(function(entry) { return entry.id !== item.id; });
          saveState();
          return renderTrackers();
        }
      }

      if (event.target.closest('#ttk-random-draw')) return drawWeighted();
      if (event.target.closest('#ttk-bag-reset')) return resetBag();
      if (event.target.closest('#ttk-bag-draw')) return drawBag();
      if (event.target.closest('#ttk-deck-draw')) return drawCard();
      if (event.target.closest('#ttk-deck-reset')) return resetDeck(true);
      if (event.target.closest('#ttk-timer-start')) return startTimer();
      if (event.target.closest('#ttk-timer-pause')) return pauseTimer();
      if (event.target.closest('#ttk-timer-reset')) return resetTimer();
      if (event.target.closest('#ttk-export-toolkit')) return exportToolkitJson();
      if (event.target.closest('#ttk-reset-all')) {
        if (confirm('Reset the entire tabletop session console and its local autosave?')) resetAll();
        return;
      }
      if (event.target.closest('#ttk-pool-roll')) return rollSuccessPool();
      if (event.target.closest('#ttk-prob-calc')) return calculateProbability();
      if (event.target.closest('#ttk-grid-calc')) return calculateGridDistance();
      if (event.target.closest('#ttk-split-calc')) return calculateSplit();
    });

    root.addEventListener('input', function(event) {
      const initCard = event.target.closest('.ttk-combatant[data-id]');
      if (initCard && event.target.dataset.initField) {
        const entry = state.initiative.entries.find(function(item) { return item.id === initCard.dataset.id; });
        if (entry) {
          const field = event.target.dataset.initField;
          entry[field] = event.target.type === 'number' ? Number(event.target.value || 0) : event.target.value;
          saveState();
        }
        return;
      }

      const rosterCard = event.target.closest('.ttk-character-card[data-id]');
      if (rosterCard && event.target.dataset.rosterField) {
        const character = state.roster.find(function(item) { return item.id === rosterCard.dataset.id; });
        if (character) {
          const field = event.target.dataset.rosterField;
          character[field] = event.target.type === 'number' ? Number(event.target.value || 0) : event.target.value;
          saveState();
        }
        return;
      }

      const counter = event.target.closest('.ttk-counter[data-id]');
      if (counter && event.target.dataset.counterField) {
        const item = state.counters.find(function(entry) { return entry.id === counter.dataset.id; });
        if (item) {
          item[event.target.dataset.counterField] = event.target.value;
          saveState();
        }
        return;
      }

      const clock = event.target.closest('.ttk-clock[data-id]');
      if (clock && event.target.dataset.clockField) {
        const item = state.clocks.find(function(entry) { return entry.id === clock.dataset.id; });
        if (item) {
          item[event.target.dataset.clockField] = event.target.value;
          saveState();
        }
        return;
      }

      if (event.target.id === 'ttk-random-table') {
        state.random.tableText = event.target.value;
        saveState();
      } else if (event.target.id === 'ttk-bag-text') {
        state.random.bagText = event.target.value;
        saveState();
      } else if (event.target.id === 'ttk-notes') {
        state.notes = event.target.value;
        saveState();
      } else if (event.target.id === 'ttk-timer-minutes' || event.target.id === 'ttk-timer-seconds') {
        const minutes = clampNumber(document.getElementById('ttk-timer-minutes').value, 0, 999, 0);
        const seconds = clampNumber(document.getElementById('ttk-timer-seconds').value, 0, 59, 0);
        state.timer.totalSec = (minutes * 60) + seconds;
        if (!state.timer.running) state.timer.remainingSec = state.timer.totalSec;
        saveState();
        updateTimerDisplay();
      }
    });

    root.addEventListener('change', function(event) {
      if (event.target.id === 'ttk-import-toolkit') {
        importToolkitJson(event.target.files && event.target.files[0]);
        event.target.value = '';
      }
    });

    const diceInput = document.getElementById('ttk-dice-expression');
    if (diceInput) diceInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        performRoll(diceInput.value, document.getElementById('ttk-dice-label').value.trim());
      }
    });

    bindDrag('ttk-initiative-list', 'initiative', renderInitiative);
    bindDrag('ttk-roster', 'roster', renderRoster);
  }

  function exportToolkitJson() {
    const payload = {
      schema: 'hb-ttrpg-tabletop-toolkit',
      schemaVersion: VERSION,
      exportedAt: new Date().toISOString(),
      state: getState()
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tabletop-session-toolkit.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Tabletop console exported as JSON.');
  }

  function importToolkitJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const incoming = parsed && parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
        if (!incoming || typeof incoming !== 'object') throw new Error('The selected JSON does not contain toolkit state.');
        const replacement = freshState();
        Object.assign(replacement, incoming);
        replacement.initiative = Object.assign(freshState().initiative, incoming.initiative || {});
        replacement.random = Object.assign(freshState().random, incoming.random || {});
        replacement.deck = Object.assign(freshState().deck, incoming.deck || {});
        replacement.timer = Object.assign(freshState().timer, incoming.timer || {});
        replacement.timer.running = false;
        replacement.timer.endAt = null;
        replacement.roster = Array.isArray(incoming.roster) ? incoming.roster : [];
        replacement.counters = Array.isArray(incoming.counters) ? incoming.counters : [];
        replacement.clocks = Array.isArray(incoming.clocks) ? incoming.clocks : [];
        replacement.diceHistory = Array.isArray(incoming.diceHistory) ? incoming.diceHistory.slice(0, HISTORY_LIMIT) : [];
        Object.keys(state).forEach(function(key) { delete state[key]; });
        Object.assign(state, replacement);
        stopTimerLoop();
        saveState();
        renderAll();
        setStatus('Toolkit JSON imported and saved locally.');
      } catch (error) {
        setStatus('Import failed: ' + error.message);
      }
    };
    reader.onerror = function() { setStatus('Import failed: the selected file could not be read.'); };
    reader.readAsText(file);
  }

  function rollSuccessPool() {
    const count = clampNumber(document.getElementById('ttk-pool-count').value, 1, 500, 6);
    const sides = clampNumber(document.getElementById('ttk-pool-sides').value, 2, 100000, 10);
    const target = clampNumber(document.getElementById('ttk-pool-target').value, 1, sides, Math.ceil(sides * 0.7));
    const explode = Boolean(document.getElementById('ttk-pool-explode').checked);
    const rolls = [];
    let successes = 0;
    let queue = count;
    let safety = 0;
    while (queue > 0 && safety < 2000) {
      safety += 1;
      queue -= 1;
      const roll = randomInt(sides) + 1;
      rolls.push(roll);
      if (roll >= target) successes += 1;
      if (explode && roll === sides) queue += 1;
    }
    const output = document.getElementById('ttk-pool-result');
    if (output) output.textContent = successes + ' success' + (successes === 1 ? '' : 'es') + ' · [' + rolls.join(', ') + ']';
    setStatus('Dice pool rolled ' + successes + ' success' + (successes === 1 ? '' : 'es') + '.');
  }

  function calculateProbability() {
    const sides = clampNumber(document.getElementById('ttk-prob-sides').value, 2, 100000, 20);
    const target = clampNumber(document.getElementById('ttk-prob-target').value, -999999, 999999, 15);
    const modifier = clampNumber(document.getElementById('ttk-prob-mod').value, -999999, 999999, 0);
    const mode = document.getElementById('ttk-prob-mode').value;
    const minimumFace = Math.ceil(target - modifier);
    let single = 0;
    if (minimumFace <= 1) single = 1;
    else if (minimumFace > sides) single = 0;
    else single = (sides - minimumFace + 1) / sides;
    let probability = single;
    if (mode === 'advantage') probability = 1 - Math.pow(1 - single, 2);
    if (mode === 'disadvantage') probability = Math.pow(single, 2);
    const output = document.getElementById('ttk-prob-result');
    if (output) output.textContent = (probability * 100).toFixed(2) + '% chance · ' + Math.round(probability * sides * 100) / 100 + ' effective successful faces on one die before mode adjustment';
    setStatus('Probability calculated.');
  }

  function calculateGridDistance() {
    const dx = Math.abs(clampNumber(document.getElementById('ttk-grid-x').value, 0, 100000, 0));
    const dy = Math.abs(clampNumber(document.getElementById('ttk-grid-y').value, 0, 100000, 0));
    const unit = clampNumber(document.getElementById('ttk-grid-unit').value, 0.0001, 1000000, 5);
    const rule = document.getElementById('ttk-grid-rule').value;
    const diagonal = Math.min(dx, dy);
    const straight = Math.max(dx, dy) - diagonal;
    let squares;
    if (rule === 'euclidean') squares = Math.sqrt((dx * dx) + (dy * dy));
    else if (rule === 'alternating') squares = straight + diagonal + Math.floor(diagonal / 2);
    else squares = Math.max(dx, dy);
    const distance = squares * unit;
    const output = document.getElementById('ttk-grid-result');
    if (output) output.textContent = (Number.isInteger(squares) ? squares : squares.toFixed(2)) + ' grid units · ' + (Number.isInteger(distance) ? distance : distance.toFixed(2)) + ' distance units';
    setStatus('Grid distance calculated.');
  }

  function calculateSplit() {
    const total = Math.floor(clampNumber(document.getElementById('ttk-split-total').value, 0, Number.MAX_SAFE_INTEGER, 0));
    const members = Math.floor(clampNumber(document.getElementById('ttk-split-members').value, 1, 100000, 1));
    const each = Math.floor(total / members);
    const remainder = total - (each * members);
    const output = document.getElementById('ttk-split-result');
    if (output) output.textContent = each.toLocaleString() + ' each · ' + remainder.toLocaleString() + ' remainder';
    setStatus('Share split calculated.');
  }

  function renderAll() {
    renderDiceHistory();
    renderInitiative();
    renderRoster();
    renderTrackers();
    renderBagStatus();
    if (!state.deck.remaining.length && !state.deck.discard.length) resetDeck(false);
    else renderDeck();
    document.getElementById('ttk-random-table').value = state.random.tableText || '';
    document.getElementById('ttk-bag-text').value = state.random.bagText || '';
    document.getElementById('ttk-notes').value = state.notes || '';
    const timerMinutes = Math.floor(Number(state.timer.totalSec || 0) / 60);
    const timerSeconds = Number(state.timer.totalSec || 0) % 60;
    document.getElementById('ttk-timer-minutes').value = timerMinutes;
    document.getElementById('ttk-timer-seconds').value = timerSeconds;
    updateTimerDisplay();
  }

  function mount() {
    const mountNode = document.getElementById('tabletop-toolkit-mount');
    if (!mountNode || mountNode.dataset.built === 'true') return;
    mountNode.dataset.built = 'true';
    mountNode.innerHTML = [
      '<section class="ttk-shell" aria-labelledby="ttk-title">',
        '<header class="ttk-header">',
          '<div><p class="eyebrow">Live table console · local autosave</p><h2 id="ttk-title">Tabletop Session Toolkit</h2><p>System-neutral session machinery for dice, combat, party resources, clocks, randomizers, cards, timing, and notes. Everything stays in this browser.</p></div>',
          '<div class="ttk-header-actions"><span class="ttk-version">v' + VERSION + '</span><button type="button" id="ttk-export-toolkit">Export JSON</button><label class="ttk-file-action" for="ttk-import-toolkit">Import JSON</label><input id="ttk-import-toolkit" type="file" accept="application/json" hidden><button type="button" id="ttk-reset-all">Reset Console</button></div>',
        '</header>',
        '<nav class="ttk-tabs" role="tablist" aria-label="Tabletop utility categories">',
          '<button type="button" class="active" role="tab" aria-selected="true" data-tool-tab="dice">Dice</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="combat">Combat</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="party">Party</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="trackers">Trackers</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="random">Random</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="cards">Cards</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="math">Math</button>',
          '<button type="button" role="tab" aria-selected="false" data-tool-tab="session">Session</button>',
        '</nav>',
        '<p id="ttk-status" class="ttk-status" role="status" aria-live="polite">Toolkit ready. State autosaves locally after changes.</p>',

        '<section class="ttk-panel" data-tool-panel="dice">',
          '<div class="ttk-section-head"><div><p class="eyebrow">RNG and roll history</p><h3>Advanced Dice Roller</h3></div><button type="button" id="ttk-clear-rolls">Clear History</button></div>',
          '<div class="ttk-dice-layout"><div class="ttk-dice-controls">',
            '<label>Expression<input id="ttk-dice-expression" value="1d20" inputmode="text" placeholder="2d20kh1+5"></label>',
            '<label>Optional Label<input id="ttk-dice-label" placeholder="Perception, dragon fire, initiative…"></label>',
            '<button type="button" class="ttk-primary" id="ttk-roll">Roll</button>',
            '<div class="ttk-quick-rolls" aria-label="Quick dice"><button type="button" data-quick-roll="1d4">d4</button><button type="button" data-quick-roll="1d6">d6</button><button type="button" data-quick-roll="1d8">d8</button><button type="button" data-quick-roll="1d10">d10</button><button type="button" data-quick-roll="1d12">d12</button><button type="button" data-quick-roll="1d20">d20</button><button type="button" data-quick-roll="1d100">d100</button><button type="button" data-quick-roll="2d20kh1">Advantage</button><button type="button" data-quick-roll="2d20kl1">Disadvantage</button><button type="button" data-quick-roll="4dF">4dF</button></div>',
            '<p class="ttk-help">Supports additive dice, constants, keep-high/keep-low, exploding dice, and Fate/Fudge dice: <code>2d6+3</code>, <code>4d6kh3</code>, <code>2d10!</code>, <code>4dF</code>.</p>',
          '</div><div class="ttk-roll-result"><div class="ttk-dice-stage" id="ttk-dice-stage"><canvas id="ttk-dice-tray" role="img" aria-label="3D dice tray. Roll dice to animate them."></canvas><span class="ttk-dice-stage-hint" id="ttk-dice-stage-hint">3D dice tray</span></div><div class="ttk-roll-readout"><span>Total</span><strong id="ttk-dice-total">—</strong><p id="ttk-dice-detail">Roll something unreasonable.</p></div></div></div>',
          '<ol id="ttk-dice-history" class="ttk-history"></ol>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="combat" hidden>',
          '<div class="ttk-section-head"><div><p class="eyebrow">Turn order and live conditions</p><h3>Initiative & Combat Tracker</h3></div><div class="ttk-round-box">Round <strong id="ttk-round">1</strong></div></div>',
          '<div class="ttk-add-row"><input id="ttk-init-name" placeholder="Combatant name"><input id="ttk-init-value" type="number" placeholder="Initiative"><button type="button" class="ttk-primary" id="ttk-add-init">Add</button><button type="button" id="ttk-sort-init">Sort High → Low</button><button type="button" id="ttk-next-turn">Next Turn</button><button type="button" id="ttk-reset-combat">Reset Round</button></div>',
          '<p class="ttk-help">Drag combatants to reorder them manually, or use ↑/↓. HP, defense, and conditions remain editable in place.</p>',
          '<div id="ttk-initiative-list" class="ttk-initiative-list"></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="party" hidden>',
          '<div class="ttk-section-head"><div><p class="eyebrow">Drag-and-drop table records</p><h3>Party / Crew Character Cards</h3></div><button type="button" class="ttk-primary" id="ttk-add-roster">Add Character Card</button></div>',
          '<p class="ttk-help">These are fast table trackers rather than replacements for the full sheet below. Drag them into marching order, watch order, spotlight order, vehicle stations, or any other useful arrangement.</p>',
          '<div id="ttk-roster" class="ttk-roster"></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="trackers" hidden>',
          '<div class="ttk-tracker-columns"><section><div class="ttk-section-head"><div><p class="eyebrow">Ammo · supplies · reputation · spell slots</p><h3>Counters</h3></div></div><div class="ttk-add-row"><input id="ttk-counter-name" placeholder="Counter name"><input id="ttk-counter-max" type="number" min="0" value="10" aria-label="Maximum"><input id="ttk-counter-step" type="number" min="1" value="1" aria-label="Step"><button type="button" id="ttk-add-counter">Add</button></div><div id="ttk-counters" class="ttk-counter-list"></div></section>',
          '<section><div class="ttk-section-head"><div><p class="eyebrow">Threat · progress · rituals · alarms</p><h3>Segment Clocks</h3></div></div><div class="ttk-add-row"><input id="ttk-clock-name" placeholder="Clock name"><select id="ttk-clock-segments" aria-label="Clock segments"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select><button type="button" id="ttk-add-clock">Add</button></div><div id="ttk-clocks" class="ttk-clock-list"></div></section></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="random" hidden>',
          '<div class="ttk-random-grid"><section><p class="eyebrow">Weighted or unweighted</p><h3>Random Table Roller</h3><p class="ttk-help">One result per line. Optional weights use <code>weight | result</code>.</p><textarea id="ttk-random-table" rows="9" placeholder="1 | Quiet corridor&#10;3 | Suspicious noise&#10;1 | Extremely ill-advised door"></textarea><button type="button" class="ttk-primary" id="ttk-random-draw">Roll Table</button><output id="ttk-random-result" class="ttk-output">—</output></section>',
          '<section><p class="eyebrow">Without replacement</p><h3>Token / Chit Bag</h3><p class="ttk-help">Useful for wandering monsters, weather, initiative chits, rumor pools, loot, or randomized scene beats.</p><textarea id="ttk-bag-text" rows="9" placeholder="Goblin patrol&#10;Cold rain&#10;Merchant caravan&#10;Nothing. Suspiciously nothing."></textarea><div class="ttk-row-actions"><button type="button" id="ttk-bag-reset">Reset Bag</button><button type="button" class="ttk-primary" id="ttk-bag-draw">Draw Token</button></div><output id="ttk-bag-result" class="ttk-output">—</output><p id="ttk-bag-status" class="ttk-help"></p></section></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="cards" hidden>',
          '<div class="ttk-card-deck"><div><p class="eyebrow">Standard 52-card deck</p><h3>Card Draw</h3><p>Useful for games with card initiative, encounter pacing, fortune, or ordinary card mechanics.</p><div class="ttk-row-actions"><button type="button" class="ttk-primary" id="ttk-deck-draw">Draw Card</button><button type="button" id="ttk-deck-reset">Shuffle / Reset</button></div></div><div class="ttk-playing-card" id="ttk-card-drawn">—</div><div class="ttk-deck-meta"><span>Cards remaining</span><strong id="ttk-card-count">52</strong><span>Recent discard</span><p id="ttk-card-discard">No cards drawn.</p></div></div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="math" hidden>',
          '<div class="ttk-math-grid">' +
            '<section><p class="eyebrow">Pool systems</p><h3>Success-Pool Roller</h3><div class="ttk-math-fields"><label>Dice<input id="ttk-pool-count" type="number" min="1" max="500" value="6"></label><label>Sides<input id="ttk-pool-sides" type="number" min="2" value="10"></label><label>Success On<input id="ttk-pool-target" type="number" min="1" value="7"></label></div><label class="ttk-check"><input id="ttk-pool-explode" type="checkbox"> Explode maximum results</label><button type="button" class="ttk-primary" id="ttk-pool-roll">Roll Pool</button><output id="ttk-pool-result" class="ttk-output">—</output></section>' +
            '<section><p class="eyebrow">Single-roll target math</p><h3>Target Probability</h3><div class="ttk-math-fields"><label>Die Sides<input id="ttk-prob-sides" type="number" min="2" value="20"></label><label>Target<input id="ttk-prob-target" type="number" value="15"></label><label>Modifier<input id="ttk-prob-mod" type="number" value="5"></label></div><label>Mode<select id="ttk-prob-mode"><option value="normal">Normal</option><option value="advantage">Advantage / keep high</option><option value="disadvantage">Disadvantage / keep low</option></select></label><button type="button" id="ttk-prob-calc">Calculate</button><output id="ttk-prob-result" class="ttk-output">—</output></section>' +
            '<section><p class="eyebrow">Maps and movement</p><h3>Grid Distance</h3><div class="ttk-math-fields"><label>X Squares<input id="ttk-grid-x" type="number" min="0" value="3"></label><label>Y Squares<input id="ttk-grid-y" type="number" min="0" value="4"></label><label>Units / Square<input id="ttk-grid-unit" type="number" min="0.0001" value="5"></label></div><label>Diagonal Rule<select id="ttk-grid-rule"><option value="chebyshev">Every diagonal = 1 square</option><option value="alternating">Alternating 1 / 2 squares</option><option value="euclidean">Euclidean / true distance</option></select></label><button type="button" id="ttk-grid-calc">Calculate</button><output id="ttk-grid-result" class="ttk-output">—</output></section>' +
            '<section><p class="eyebrow">Treasure · XP · supplies</p><h3>Share Splitter</h3><div class="ttk-math-fields"><label>Total<input id="ttk-split-total" type="number" min="0" value="1000"></label><label>Members<input id="ttk-split-members" type="number" min="1" value="4"></label></div><button type="button" id="ttk-split-calc">Split Evenly</button><output id="ttk-split-result" class="ttk-output">—</output></section>' +
          '</div>',
        '</section>',

        '<section class="ttk-panel" data-tool-panel="session" hidden>',
          '<div class="ttk-session-grid"><section><p class="eyebrow">Pacing aid</p><h3>Turn / Scene Timer</h3><div class="ttk-timer-setup"><label>Minutes<input id="ttk-timer-minutes" type="number" min="0" max="999" value="5"></label><label>Seconds<input id="ttk-timer-seconds" type="number" min="0" max="59" value="0"></label></div><div id="ttk-timer-display" class="ttk-timer-display">05:00</div><div class="ttk-row-actions"><button type="button" class="ttk-primary" id="ttk-timer-start">Start</button><button type="button" id="ttk-timer-pause">Pause</button><button type="button" id="ttk-timer-reset">Reset</button></div></section>',
          '<section><p class="eyebrow">Autosaved scratchpad</p><h3>Session Notes</h3><textarea id="ttk-notes" rows="12" placeholder="NPC names, clues, damage to the furniture, increasingly implausible promises made to local nobility…"></textarea><p class="ttk-help">Saved locally with the rest of the tabletop console.</p></section></div>',
        '</section>',
      '</section>'
    ].join('');

    bindStaticEvents();
    renderAll();
    activateTab('dice');
    initializeDiceTray();
    if (state.diceHistory[0]) {
      setDiceReadout(state.diceHistory[0]);
      renderDiceTray(state.diceHistory[0], true);
    }
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function resetAll() {
    const replacement = freshState();
    Object.keys(state).forEach(function(key) { delete state[key]; });
    Object.assign(state, replacement);
    saveState();
    stopTimerLoop();
    renderAll();
    activateTab('dice');
    clearDiceTray();
  }

  window.HBTabletopToolkit = Object.freeze({
    version: VERSION,
    mount: mount,
    rollExpression: rollExpression,
    getState: getState,
    resetAll: resetAll,
    exportJson: exportToolkitJson
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();