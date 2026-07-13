(() => {
  'use strict';

  const DEFAULT_MERGE_RADIUS_AU = 1000;

  function buildScene(systemEntries, clusterSeed = 'cluster', options = {}) {
    const entries = systemEntries.map((entry, index) => ({
      ...entry,
      category: 'system',
      index,
      mass: Number(entry.mass) || stellarMass(entry.star || ''),
      position: null,
      nearest: null
    }));

    const positionData = positionEntries(entries, clusterSeed);
    const edges = connectedNearestGraph(entries);
    const assets = buildMassAssets(entries, clusterSeed, positionData.maxRadius);
    const lensingNodes = deriveLensingNodes({
      entries,
      edges,
      assets,
      clusterSeed,
      maxRadius: positionData.maxRadius,
      mergeRadiusAu: options.mergeRadiusAu || DEFAULT_MERGE_RADIUS_AU
    });

    return {
      entries,
      edges,
      ...assets,
      lensingNodes,
      maxRadius: positionData.maxRadius,
      clusterDiameterAu: positionData.clusterDiameterAu,
      mergeRadiusAu: options.mergeRadiusAu || DEFAULT_MERGE_RADIUS_AU
    };
  }

  function positionEntries(entries, clusterSeed) {
    const count = entries.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    let maximum = 1;

    entries.forEach((entry, index) => {
      const rng = randomFor(`${clusterSeed}:${entry.seed}:rigid-cluster-position-v3`);
      const shellFraction = Math.pow((index + 0.72) / Math.max(1, count), 0.58);
      const radius = 90000 + shellFraction * 360000 + (rng() - 0.5) * 44000;
      const zUnit = 1 - 2 * ((index + 0.5) / Math.max(1, count));
      const transverse = Math.sqrt(Math.max(0.035, 1 - zUnit * zUnit));
      const angle = index * goldenAngle + (rng() - 0.5) * 0.55;
      entry.position = {
        x: Math.cos(angle) * transverse * radius,
        y: Math.sin(angle) * transverse * radius,
        z: (zUnit + (rng() - 0.5) * 0.25) * radius
      };
      maximum = Math.max(maximum, magnitude(entry.position));
    });

    return {
      maxRadius: maximum,
      clusterDiameterAu: maximumPairDistance(entries.map(entry => entry.position))
    };
  }

  function connectedNearestGraph(entries) {
    const edges = new Map();
    const edgeKey = (a, b) => [a.index, b.index].sort((x, y) => x - y).join(':');

    for (const entry of entries) {
      let nearest = null;
      for (const candidate of entries) {
        if (candidate === entry) continue;
        const distance = distance3(entry.position, candidate.position);
        if (!nearest || distance < nearest.distance) nearest = {candidate, distance};
      }
      entry.nearest = nearest;
      if (nearest) {
        const key = edgeKey(entry, nearest.candidate);
        if (!edges.has(key)) {
          edges.set(key, {
            key,
            from: entry,
            to: nearest.candidate,
            distance: nearest.distance,
            bridge: false
          });
        }
      }
    }

    while (components(entries, [...edges.values()]).length > 1) {
      const groups = components(entries, [...edges.values()]);
      let bridge = null;
      for (let left = 0; left < groups.length; left += 1) {
        for (let right = left + 1; right < groups.length; right += 1) {
          for (const from of groups[left]) {
            for (const to of groups[right]) {
              const distance = distance3(from.position, to.position);
              if (!bridge || distance < bridge.distance) bridge = {from, to, distance};
            }
          }
        }
      }
      if (!bridge) break;
      const key = edgeKey(bridge.from, bridge.to);
      edges.set(key, {...bridge, key, bridge: true});
    }

    return [...edges.values()];
  }

  function components(entries, edges) {
    const parent = new Map(entries.map(entry => [entry.index, entry.index]));
    const find = index => {
      let current = index;
      while (parent.get(current) !== current) current = parent.get(current);
      let walker = index;
      while (parent.get(walker) !== walker) {
        const next = parent.get(walker);
        parent.set(walker, current);
        walker = next;
      }
      return current;
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent.set(rootB, rootA);
    };
    edges.forEach(edge => union(edge.from.index, edge.to.index));
    const groups = new Map();
    entries.forEach(entry => {
      const root = find(entry.index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(entry);
    });
    return [...groups.values()];
  }

  function buildMassAssets(entries, clusterSeed, maxRadius) {
    const rng = randomFor(`${clusterSeed}:cluster-mass-assets-v3`);
    const nebulaCount = clamp(Math.round(entries.length / 5) + 1, 2, 5);
    const nebulae = [];
    const protostars = [];
    const darkMasses = [];

    for (let index = 0; index < nebulaCount; index += 1) {
      const position = randomPosition(rng, maxRadius * (0.36 + rng() * 0.42));
      nebulae.push({
        id: `nebula-${index + 1}`,
        category: 'nebula',
        name: `Nebular Mass Field ${index + 1}`,
        position,
        radius: {
          x: maxRadius * (0.11 + rng() * 0.13),
          y: maxRadius * (0.07 + rng() * 0.12),
          z: maxRadius * (0.08 + rng() * 0.14)
        },
        mass: 35 + rng() * 280,
        density: 0.25 + rng() * 0.75,
        hue: 190 + rng() * 90
      });
    }

    const protostarCount = clamp(Math.ceil(entries.length / 6), 1, 4);
    for (let index = 0; index < protostarCount; index += 1) {
      const host = nebulae[index % nebulae.length];
      const offset = randomUnitVector(rng);
      const offsetLength = Math.min(host.radius.x, host.radius.y) * (0.18 + rng() * 0.48);
      protostars.push({
        id: `protostar-${index + 1}`,
        category: 'protostar',
        name: `Protostar ${String.fromCharCode(65 + index)}`,
        position: {
          x: host.position.x + offset.x * offsetLength,
          y: host.position.y + offset.y * offsetLength,
          z: host.position.z + offset.z * offsetLength
        },
        mass: 0.15 + rng() * 2.1,
        stage: pick(rng, ['Class 0 collapse', 'Class I envelope', 'Accretion-disk dominant'])
      });
    }

    const darkTypes = [
      ['Brown dwarf', 0.015, 0.075],
      ['Rogue planetary aggregate', 0.0004, 0.012],
      ['Cometary mass cloud', 0.0001, 0.004],
      ['Compact dark remnant', 0.45, 1.35]
    ];
    const darkCount = clamp(Math.ceil(entries.length / 3), 3, 8);
    for (let index = 0; index < darkCount; index += 1) {
      const [type, minMass, maxMass] = pick(rng, darkTypes);
      darkMasses.push({
        id: `dark-mass-${index + 1}`,
        category: 'dark-mass',
        name: `${type} ${index + 1}`,
        type,
        position: randomPosition(rng, maxRadius * (0.42 + rng() * 0.52)),
        mass: minMass + rng() * (maxMass - minMass)
      });
    }

    return {nebulae, protostars, darkMasses};
  }

  function deriveLensingNodes({entries, edges, assets, clusterSeed, maxRadius, mergeRadiusAu}) {
    const sources = createMassSources(entries, assets);
    const pairs = new Map();
    const keyFor = (a, b) => [a.id, b.id].sort().join('::');
    const addPair = (a, b, reason) => {
      if (!a || !b || a === b) return;
      const key = keyFor(a, b);
      if (!pairs.has(key)) pairs.set(key, {a, b, reasons: new Set()});
      pairs.get(key).reasons.add(reason);
    };

    for (const edge of edges) {
      const a = sources.find(source => source.id === `system:${edge.from.seed}`);
      const b = sources.find(source => source.id === `system:${edge.to.seed}`);
      addPair(a, b, edge.bridge ? 'topology bridge' : 'nearest-neighbor route');
    }

    for (const source of sources) {
      const candidates = sources
        .filter(candidate => candidate !== source)
        .map(candidate => ({
          candidate,
          score: pairInfluence(source, candidate, maxRadius)
        }))
        .sort((left, right) => right.score - left.score);
      const partnerCount = source.category === 'system' ? 3 : 2;
      candidates.slice(0, partnerCount).forEach(({candidate}) => {
        addPair(source, candidate, 'mass influence');
      });
    }

    const rawNodes = [...pairs.values()].map((pair, index) => {
      const distanceAu = distance3(pair.a.position, pair.b.position);
      const sqrtA = Math.sqrt(Math.max(1e-8, pair.a.effectiveMass));
      const sqrtB = Math.sqrt(Math.max(1e-8, pair.b.effectiveMass));
      const fractionFromA = sqrtA / (sqrtA + sqrtB);
      const position = interpolate(pair.a.position, pair.b.position, fractionFromA);
      const rawStrength = pairInfluence(pair.a, pair.b, maxRadius);
      return {
        id: `derived-${index + 1}`,
        anomaly: false,
        position,
        rawStrength,
        connections: [{
          kind: 'derived',
          fromId: pair.a.id,
          fromName: pair.a.name,
          fromCategory: pair.a.category,
          fromMass: pair.a.mass,
          toId: pair.b.id,
          toName: pair.b.name,
          toCategory: pair.b.category,
          toMass: pair.b.mass,
          distanceAu,
          balanceFractionFromA: fractionFromA,
          reasons: [...pair.reasons]
        }]
      };
    });

    const rng = randomFor(`${clusterSeed}:cluster-lensing-anomaly-v2`);
    const barycenter = weightedBarycenter(sources);
    const direction = randomUnitVector(rng);
    const anomalyDistance = maxRadius * (0.12 + rng() * 0.5);
    const medianStrength = median(rawNodes.map(node => node.rawStrength)) || 1;
    rawNodes.push({
      id: 'anomaly-1',
      anomaly: true,
      position: {
        x: barycenter.x + direction.x * anomalyDistance,
        y: barycenter.y + direction.y * anomalyDistance,
        z: barycenter.z + direction.z * anomalyDistance
      },
      rawStrength: medianStrength * (0.6 + rng() * 0.75),
      connections: [{
        kind: 'anomaly',
        fromId: null,
        fromName: 'Unresolved curvature source',
        toId: null,
        toName: 'No corresponding generated mass pair',
        distanceAu: null,
        reasons: ['anomalous gravitational point']
      }]
    });

    return mergeNearbyNodes(rawNodes, mergeRadiusAu);
  }

  function createMassSources(entries, assets) {
    const systems = entries.map(entry => ({
      id: `system:${entry.seed}`,
      category: 'system',
      name: entry.name,
      mass: entry.mass,
      effectiveMass: Math.max(0.0001, entry.mass),
      position: entry.position,
      source: entry
    }));
    const protostars = assets.protostars.map(item => ({
      id: item.id,
      category: item.category,
      name: item.name,
      mass: item.mass,
      effectiveMass: Math.max(0.0001, item.mass * 0.88),
      position: item.position,
      source: item
    }));
    const darkMasses = assets.darkMasses.map(item => ({
      id: item.id,
      category: item.category,
      name: item.name,
      mass: item.mass,
      effectiveMass: Math.max(0.00001, item.mass),
      position: item.position,
      source: item
    }));
    const nebulae = assets.nebulae.map(item => ({
      id: item.id,
      category: item.category,
      name: item.name,
      mass: item.mass,
      effectiveMass: Math.max(0.001, Math.sqrt(item.mass) * (0.35 + item.density * 0.65)),
      position: item.position,
      source: item
    }));
    return [...systems, ...protostars, ...darkMasses, ...nebulae];
  }

  function pairInfluence(a, b, maxRadius) {
    const distance = Math.max(1, distance3(a.position, b.position));
    const normalizedDistance = distance / Math.max(1, maxRadius);
    const combinedMass = Math.sqrt(
      Math.max(1e-10, a.effectiveMass) * Math.max(1e-10, b.effectiveMass)
    );
    return combinedMass / Math.pow(0.035 + normalizedDistance, 1.18);
  }

  function mergeNearbyNodes(nodes, mergeRadiusAu) {
    const parent = nodes.map((_, index) => index);
    const find = index => {
      if (parent[index] !== index) parent[index] = find(parent[index]);
      return parent[index];
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    };

    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        if (distance3(nodes[left].position, nodes[right].position) <= mergeRadiusAu) {
          union(left, right);
        }
      }
    }

    const groups = new Map();
    nodes.forEach((node, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(node);
    });

    const merged = [...groups.values()].map(group => {
      const totalWeight = group.reduce((sum, node) => sum + Math.max(1e-9, node.rawStrength), 0);
      const position = group.reduce((point, node) => ({
        x: point.x + node.position.x * node.rawStrength / totalWeight,
        y: point.y + node.position.y * node.rawStrength / totalWeight,
        z: point.z + node.position.z * node.rawStrength / totalWeight
      }), {x: 0, y: 0, z: 0});
      return {
        id: `aggregate-${hashString(group.map(node => node.id).sort().join('|')).toString(36)}`,
        position,
        rawStrength: group.reduce((sum, node) => sum + node.rawStrength, 0),
        anomaly: group.some(node => node.anomaly),
        mergedPointCount: group.length,
        connections: group.flatMap(node => node.connections)
      };
    });

    const maximum = Math.max(1e-9, ...merged.map(node => node.rawStrength));
    merged.sort((a, b) => b.rawStrength - a.rawStrength);
    merged.forEach((node, index) => {
      const normalized = Math.sqrt(node.rawStrength / maximum);
      node.strength = 0.25 + normalized * 2.75;
      node.displayRadius = 3.5 + Math.log2(node.connections.length + 1) * 1.7 + normalized * 4.2;
      node.name = node.anomaly
        ? (node.connections.length > 1 ? 'Anomalous Aggregate Lensing Node' : 'Anomaly Gravitational Point')
        : `Aggregate Lensing Node ${String(index + 1).padStart(2, '0')}`;
    });
    return merged;
  }

  function stellarMass(text) {
    const classification = text.match(/\b(WD|SG|[MKGFAB])\b/i)?.[1]?.toUpperCase();
    return ({M: 0.32, K: 0.7, G: 1, F: 1.3, A: 2.05, B: 5.2, WD: 0.72, SG: 1.65})[classification] || 1;
  }

  function weightedBarycenter(sources) {
    const total = sources.reduce((sum, source) => sum + Math.max(0.00001, source.effectiveMass || source.mass || 1), 0) || 1;
    return sources.reduce((center, source) => {
      const weight = Math.max(0.00001, source.effectiveMass || source.mass || 1) / total;
      return {
        x: center.x + source.position.x * weight,
        y: center.y + source.position.y * weight,
        z: center.z + source.position.z * weight
      };
    }, {x: 0, y: 0, z: 0});
  }

  function interpolate(a, b, amount) {
    return {
      x: a.x + (b.x - a.x) * amount,
      y: a.y + (b.y - a.y) * amount,
      z: a.z + (b.z - a.z) * amount
    };
  }

  function maximumPairDistance(points) {
    let maximum = 0;
    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        maximum = Math.max(maximum, distance3(points[left], points[right]));
      }
    }
    return maximum;
  }

  function randomPosition(rng, radius) {
    const direction = randomUnitVector(rng);
    const radial = radius * Math.pow(rng(), 1 / 3);
    return {x: direction.x * radial, y: direction.y * radial, z: direction.z * radial};
  }

  function randomUnitVector(rng) {
    const z = rng() * 2 - 1;
    const angle = rng() * Math.PI * 2;
    const transverse = Math.sqrt(Math.max(0, 1 - z * z));
    return {x: Math.cos(angle) * transverse, y: Math.sin(angle) * transverse, z};
  }

  function distance3(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  function magnitude(point) {
    return Math.hypot(point.x, point.y, point.z);
  }

  function median(values) {
    if (!values.length) return 0;
    const ordered = [...values].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomFor(value) {
    let seed = hashString(value);
    return () => {
      seed += 0x6D2B79F5;
      let result = seed;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(rng, values) {
    return values[Math.floor(rng() * values.length)];
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  globalThis.BlacklightExoLensingModel = Object.freeze({
    buildScene,
    stellarMass,
    distance3,
    randomFor,
    clamp,
    DEFAULT_MERGE_RADIUS_AU
  });
})();
