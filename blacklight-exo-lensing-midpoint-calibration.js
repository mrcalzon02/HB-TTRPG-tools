(() => {
  'use strict';

  const MIN_BALANCE_FRACTION = 0.28;
  const MAX_BALANCE_FRACTION = 0.72;

  function waitForModel(attempt = 0) {
    const base = globalThis.BlacklightExoLensingModel;
    if (!base || !base.volumeCalibrated) {
      if (attempt < 240) requestAnimationFrame(() => waitForModel(attempt + 1));
      return;
    }
    if (base.midpointCalibrated) return;

    const originalBuildScene = base.buildScene;

    function buildScene(entries, clusterSeed, options = {}) {
      const scene = originalBuildScene(entries, clusterSeed, options);
      const mergeRadiusAu = Number(options.mergeRadiusAu) || scene.mergeRadiusAu || base.DEFAULT_MERGE_RADIUS_AU || 1000;
      const sources = createSourceIndex(scene, base);
      const pairs = collectPairs(scene.lensingNodes, sources);
      const rawNodes = [...pairs.values()].map((pair, index) =>
        buildPairNode(pair.a, pair.b, pair.reasons, scene.maxRadius, `derived-midpoint-${index + 1}`, false)
      );

      if (scene.lensingNodes.some(node => node.anomaly)) {
        rawNodes.push(buildAnomalyNode(sources, clusterSeed || 'cluster', scene.maxRadius));
      }

      scene.lensingNodes = mergeNearbyNodes(rawNodes, mergeRadiusAu);
      scene.lensingPlacement = 'bounded mass-and-volume weighted midpoint';
      scene.lensingBalanceRange = [MIN_BALANCE_FRACTION, MAX_BALANCE_FRACTION];
      return scene;
    }

    globalThis.BlacklightExoLensingModel = Object.freeze({
      ...base,
      buildScene,
      midpointCalibrated: true,
      MIN_BALANCE_FRACTION,
      MAX_BALANCE_FRACTION
    });
  }

  function createSourceIndex(scene, model) {
    const byId = new Map();
    const byName = new Map();
    const add = source => {
      byId.set(source.id, source);
      byName.set(source.name, source);
    };

    for (const entry of scene.entries || []) {
      const volumeFactor = model.volumeFactor?.(entry.star || '') || 1;
      add({
        id: `system:${entry.seed}`,
        category: 'system',
        name: entry.name,
        mass: Math.max(0.0001, Number(entry.mass) || 1),
        effectiveMass: Math.max(0.0001, Number(entry.mass) || 1),
        sizeFactor: volumeFactor,
        position: {...entry.position},
        source: entry
      });
    }

    for (const item of scene.protostars || []) {
      add({
        id: item.id,
        category: item.category,
        name: item.name,
        mass: Math.max(0.0001, Number(item.mass) || 0.0001),
        effectiveMass: Math.max(0.0001, (Number(item.mass) || 0.0001) * 0.88),
        sizeFactor: 1.08,
        position: {...item.position},
        source: item
      });
    }

    for (const item of scene.darkMasses || []) {
      const typeSize = item.type === 'Cometary mass cloud' ? 1.35
        : item.type === 'Rogue planetary aggregate' ? 1.12
          : item.type === 'Brown dwarf' ? 0.92
            : 0.72;
      add({
        id: item.id,
        category: item.category,
        name: item.name,
        mass: Math.max(0.00001, Number(item.mass) || 0.00001),
        effectiveMass: Math.max(0.00001, Number(item.mass) || 0.00001),
        sizeFactor: typeSize,
        position: {...item.position},
        source: item
      });
    }

    for (const item of scene.nebulae || []) {
      const normalizedVolume = Math.max(1e-9,
        (item.radius?.x || 1) * (item.radius?.y || 1) * (item.radius?.z || 1) /
        Math.max(1, scene.maxRadius ** 3)
      );
      add({
        id: item.id,
        category: item.category,
        name: item.name,
        mass: Math.max(0.001, Number(item.mass) || 0.001),
        effectiveMass: Math.max(0.001,
          Math.sqrt(Math.max(0.001, Number(item.mass) || 0.001)) *
          (0.35 + (Number(item.density) || 0.25) * 0.65)
        ),
        sizeFactor: 1 + Math.log1p(normalizedVolume * 120) * 0.5,
        position: {...item.position},
        source: item
      });
    }

    return {byId, byName, list: [...byId.values()]};
  }

  function collectPairs(nodes, sources) {
    const pairs = new Map();
    for (const node of nodes || []) {
      for (const connection of node.connections || []) {
        if (connection.kind === 'anomaly' || !connection.fromId || !connection.toId) continue;
        const a = sources.byId.get(connection.fromId) || sources.byName.get(connection.fromName);
        const b = sources.byId.get(connection.toId) || sources.byName.get(connection.toName);
        if (!a || !b || a === b) continue;
        const key = [a.id, b.id].sort().join('::');
        if (!pairs.has(key)) pairs.set(key, {a, b, reasons: new Set()});
        for (const reason of connection.reasons || ['mass influence']) pairs.get(key).reasons.add(reason);
      }
    }
    return pairs;
  }

  function buildPairNode(a, b, reasons, maxRadius, id, anomaly) {
    const distanceAu = distance3(a.position, b.position);
    const weightA = balanceWeight(a);
    const weightB = balanceWeight(b);
    const fractionFromA = boundedMidpointFraction(weightA, weightB);
    const position = interpolate(a.position, b.position, fractionFromA);
    const rawStrength = pairInfluence(a, b, maxRadius);
    const dominant = weightA >= weightB ? a : b;
    const midpointOffsetAu = Math.abs(fractionFromA - 0.5) * distanceAu;
    const placementReason = `bounded midpoint ${Math.round(fractionFromA * 100)}% from ${a.name} toward ${b.name}; shifted ${formatAu(midpointOffsetAu)} toward ${dominant.name}`;

    return {
      id,
      anomaly,
      position,
      rawStrength,
      connections: [{
        kind: 'derived',
        fromId: a.id,
        fromName: a.name,
        fromCategory: a.category,
        fromMass: a.mass,
        fromPosition: {...a.position},
        fromWeight: weightA,
        toId: b.id,
        toName: b.name,
        toCategory: b.category,
        toMass: b.mass,
        toPosition: {...b.position},
        toWeight: weightB,
        distanceAu,
        balanceFractionFromA: fractionFromA,
        midpointOffsetAu,
        dominantSource: dominant.name,
        reasons: [...reasons, placementReason]
      }]
    };
  }

  function buildAnomalyNode(sources, clusterSeed, maxRadius) {
    const rng = randomFor(`${clusterSeed}:cluster-lensing-anomaly-midpoint-v3`);
    const center = weightedBarycenter(sources.list);
    const direction = randomUnitVector(rng);
    const anomalySource = {
      id: 'anomaly-source-1',
      category: 'anomaly-source',
      name: 'Unresolved curvature source',
      mass: median(sources.list.map(source => source.mass)) * (0.55 + rng() * 0.95),
      effectiveMass: median(sources.list.map(source => source.effectiveMass)) * (0.7 + rng() * 0.9),
      sizeFactor: 0.9 + rng() * 0.8,
      position: {
        x: center.x + direction.x * maxRadius * (0.18 + rng() * 0.48),
        y: center.y + direction.y * maxRadius * (0.18 + rng() * 0.48),
        z: center.z + direction.z * maxRadius * (0.18 + rng() * 0.48)
      }
    };
    const partner = [...sources.list]
      .map(source => ({source, score: pairInfluence(anomalySource, source, maxRadius)}))
      .sort((left, right) => right.score - left.score)[0]?.source;

    if (!partner) {
      return {
        id: 'anomaly-midpoint-1',
        anomaly: true,
        position: anomalySource.position,
        rawStrength: 1,
        connections: []
      };
    }

    return buildPairNode(
      anomalySource,
      partner,
      new Set(['anomalous gravitational source', 'strongest local mass relationship']),
      maxRadius,
      'anomaly-midpoint-1',
      true
    );
  }

  function boundedMidpointFraction(weightA, weightB) {
    const ratio = Math.log(Math.max(1e-9, weightB) / Math.max(1e-9, weightA));
    const shift = 0.22 * Math.tanh(ratio / 1.8);
    return clamp(0.5 + shift, MIN_BALANCE_FRACTION, MAX_BALANCE_FRACTION);
  }

  function balanceWeight(source) {
    return Math.pow(Math.max(1e-9, source.effectiveMass || source.mass || 1), 0.56) *
      Math.pow(Math.max(0.2, source.sizeFactor || 1), 0.44);
  }

  function pairInfluence(a, b, maxRadius) {
    const distance = Math.max(1, distance3(a.position, b.position));
    const normalizedDistance = distance / Math.max(1, maxRadius);
    const combinedWeight = Math.sqrt(balanceWeight(a) * balanceWeight(b));
    return combinedWeight / Math.pow(0.035 + normalizedDistance, 1.18);
  }

  function mergeNearbyNodes(nodes, mergeRadiusAu) {
    if (!nodes.length) return [];
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
        if (distance3(nodes[left].position, nodes[right].position) <= mergeRadiusAu) union(left, right);
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
        id: `aggregate-midpoint-${hashString(group.map(node => node.id).sort().join('|')).toString(36)}`,
        position,
        rawStrength: group.reduce((sum, node) => sum + node.rawStrength, 0),
        anomaly: group.some(node => node.anomaly),
        mergedPointCount: group.length,
        connections: group.flatMap(node => node.connections),
        placementMethod: 'bounded mass-and-volume weighted midpoint'
      };
    });

    const maximum = Math.max(1e-9, ...merged.map(node => node.rawStrength));
    merged.sort((left, right) => right.rawStrength - left.rawStrength);
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

  function weightedBarycenter(sources) {
    const total = sources.reduce((sum, source) => sum + balanceWeight(source), 0) || 1;
    return sources.reduce((center, source) => {
      const weight = balanceWeight(source) / total;
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

  function distance3(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  function randomUnitVector(rng) {
    const z = rng() * 2 - 1;
    const angle = rng() * Math.PI * 2;
    const transverse = Math.sqrt(Math.max(0, 1 - z * z));
    return {x: Math.cos(angle) * transverse, y: Math.sin(angle) * transverse, z};
  }

  function median(values) {
    if (!values.length) return 1;
    const ordered = [...values].filter(Number.isFinite).sort((a, b) => a - b);
    if (!ordered.length) return 1;
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  }

  function formatAu(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
    if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
    return `${value.toFixed(2)} AU`;
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

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  waitForModel();
})();
