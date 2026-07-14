(() => {
  'use strict';

  const MERGE_RADIUS_AU = 1000;

  function waitForAuthority(attempt = 0) {
    const authority = globalThis.BlacklightExoAuthority;
    const model = globalThis.BlacklightExoLensingModel;
    if (!authority || !model?.systemMassCalibrated) {
      if (attempt < 480) requestAnimationFrame(() => waitForAuthority(attempt + 1));
      return;
    }
    install(authority, model);
  }

  function install(authority, base) {
    if (base.sourceAuthorityVersion === authority.version) return;
    const originalBuildScene = base.buildScene;

    function buildScene(entries, clusterSeed, options = {}) {
      if (!authority.isExampleSeed(clusterSeed)) return originalBuildScene(entries, clusterSeed, options);

      const records = authority.getExampleClusterEntries();
      const mapped = entries.slice(0, records.length).map((entry, index) => {
        const record = records[index];
        return {
          ...entry,
          index,
          seed:record.seed,
          name:record.name,
          star:record.star,
          stellarMass:record.stellarMassSolar,
          planetaryMass:record.orbitingMassSolar,
          mass:record.totalMassSolar,
          populated:record.populated,
          sourceAuthority:true,
          authorityVersion:authority.version,
          catalogDistanceLy:record.distanceLy,
          catalogRaDeg:record.raDeg,
          catalogDecDeg:record.decDeg
        };
      });

      const scene = originalBuildScene(mapped, authority.presetSeed, options);
      applyAuthorityGeometry(scene, authority, base, Number(options.mergeRadiusAu) || MERGE_RADIUS_AU);
      scene.sourceAuthority = true;
      scene.sourceAuthorityVersion = authority.version;
      scene.astrometryFrame = 'Approximate heliocentric J2000 equatorial Cartesian';
      scene.astrometrySources = ['CNS5','10 pc sample','SIMBAD'];
      scene.supplementPolicy = authority.rules;
      return scene;
    }

    globalThis.BlacklightExoLensingModel = Object.freeze({
      ...base,
      buildScene,
      sourceAuthorityVersion:authority.version,
      sourceAuthorityCalibrated:true,
      EXAMPLE_NEIGHBORHOOD:authority.getExampleClusterEntries()
    });
  }

  function applyAuthorityGeometry(scene, authority, model, mergeRadiusAu) {
    const records = authority.getExampleSystems();
    const oldMax = Math.max(1, scene.maxRadius || 1);

    scene.entries.forEach((entry, index) => {
      const record = records[index];
      if (!record) return;
      entry.index = index;
      entry.seed = record.seed;
      entry.position = authority.equatorialPosition(record.astrometry);
      entry.name = record.name;
      entry.star = record.star;
      entry.stellarMass = record.stellarMassSolar;
      entry.planetaryMass = record.confirmedOrbitingMassEarth / 332946.0487;
      entry.mass = entry.stellarMass + entry.planetaryMass;
      entry.sourceAuthority = true;
    });

    const newMax = Math.max(1, ...scene.entries.map(entry => magnitude(entry.position)));
    const scale = newMax / oldMax;
    for (const collection of [scene.protostars, scene.darkMasses, scene.nebulae]) {
      for (const item of collection || []) item.position = scalePoint(item.position, scale);
    }
    for (const nebula of scene.nebulae || []) {
      if (!nebula.radius) continue;
      nebula.radius = {
        x:nebula.radius.x * scale,
        y:nebula.radius.y * scale,
        z:nebula.radius.z * scale
      };
    }

    scene.maxRadius = newMax;
    scene.clusterDiameterAu = maximumPairDistance(scene.entries.map(entry => entry.position));
    scene.edges = connectedNearestGraph(scene.entries, model.distance3 || distance3);
    scene.lensingNodes = rebuildLensingNodes(scene, model, scale, mergeRadiusAu);
  }

  function rebuildLensingNodes(scene, model, scale, mergeRadiusAu) {
    const sources = sourceIndex(scene, model);
    const pairs = new Map();

    for (const node of scene.lensingNodes || []) {
      for (const connection of node.connections || []) {
        const a = resolveSource(
          connection.fromId, connection.fromName, connection.fromPosition,
          connection.fromMass, connection.fromWeight, sources, scale
        );
        const b = resolveSource(
          connection.toId, connection.toName, connection.toPosition,
          connection.toMass, connection.toWeight, sources, scale
        );
        if (!a || !b || a.id === b.id) continue;
        const key = [a.id,b.id].sort().join('::');
        if (!pairs.has(key)) pairs.set(key, {a,b,anomaly:false,reasons:new Set()});
        const pair = pairs.get(key);
        pair.anomaly ||= Boolean(node.anomaly) || connection.kind === 'anomaly';
        for (const reason of connection.reasons || ['mass influence']) pair.reasons.add(reason);
      }
    }

    const raw = [...pairs.values()].map((pair,index) => {
      const weightA = balanceWeight(pair.a);
      const weightB = balanceWeight(pair.b);
      const fraction = boundedFraction(weightA,weightB);
      const distanceAu = distance3(pair.a.position,pair.b.position);
      return {
        id:`authority-derived-${index + 1}`,
        anomaly:pair.anomaly,
        position:interpolate(pair.a.position,pair.b.position,fraction),
        rawStrength:pairInfluence(pair.a,pair.b,scene.maxRadius),
        connections:[{
          kind:pair.anomaly ? 'anomaly' : 'derived',
          fromId:pair.a.id,
          fromName:pair.a.name,
          fromCategory:pair.a.category,
          fromMass:pair.a.mass,
          fromPosition:{...pair.a.position},
          fromWeight:weightA,
          toId:pair.b.id,
          toName:pair.b.name,
          toCategory:pair.b.category,
          toMass:pair.b.mass,
          toPosition:{...pair.b.position},
          toWeight:weightB,
          distanceAu,
          balanceFractionFromA:fraction,
          midpointOffsetAu:Math.abs(fraction-.5) * distanceAu,
          dominantSource:weightA >= weightB ? pair.a.name : pair.b.name,
          reasons:[...pair.reasons,'published-first EXAMPLE authority geometry']
        }]
      };
    });

    return mergeNearby(raw,mergeRadiusAu);
  }

  function sourceIndex(scene, model) {
    const map = new Map();
    const add = source => map.set(source.id,source);
    for (const entry of scene.entries || []) add({
      id:`system:${entry.seed}`, category:'system', name:entry.name,
      mass:entry.mass, effectiveMass:entry.mass,
      sizeFactor:model.volumeFactor?.(entry.star || '') || 1,
      position:entry.position
    });
    for (const item of scene.protostars || []) add({
      id:item.id, category:item.category, name:item.name, mass:item.mass,
      effectiveMass:item.mass * .88, sizeFactor:1.08, position:item.position
    });
    for (const item of scene.darkMasses || []) add({
      id:item.id, category:item.category, name:item.name, mass:item.mass,
      effectiveMass:item.mass, sizeFactor:1, position:item.position
    });
    for (const item of scene.nebulae || []) add({
      id:item.id, category:item.category, name:item.name, mass:item.mass,
      effectiveMass:Math.sqrt(item.mass) * (.35 + item.density * .65),
      sizeFactor:1.3, position:item.position
    });
    return map;
  }

  function resolveSource(id,name,storedPosition,mass,storedWeight,sources,scale) {
    if (id && sources.has(id)) return sources.get(id);
    if (!storedPosition) return null;
    return {
      id:id || `unresolved:${name}`,
      category:id?.startsWith('anomaly') ? 'anomaly-source' : 'unresolved',
      name:name || 'Unresolved curvature source',
      mass:Math.max(.00001,Number(mass) || .00001),
      effectiveMass:Math.max(.00001,Number(storedWeight) || Number(mass) || .00001),
      sizeFactor:1,
      position:scalePoint(storedPosition,scale)
    };
  }

  function connectedNearestGraph(entries,distanceFunction) {
    const edges = new Map();
    const keyFor = (a,b) => [a.index,b.index].sort((x,y) => x-y).join(':');
    for (const entry of entries) {
      let nearest = null;
      for (const candidate of entries) {
        if (candidate === entry) continue;
        const distance = distanceFunction(entry.position,candidate.position);
        if (!nearest || distance < nearest.distance) nearest = {candidate,distance};
      }
      entry.nearest = nearest;
      if (nearest) edges.set(keyFor(entry,nearest.candidate), {
        key:keyFor(entry,nearest.candidate), from:entry, to:nearest.candidate,
        distance:nearest.distance, bridge:false
      });
    }

    while (components(entries,[...edges.values()]).length > 1) {
      const groups = components(entries,[...edges.values()]);
      let bridge = null;
      for (let left=0; left<groups.length; left+=1) {
        for (let right=left+1; right<groups.length; right+=1) {
          for (const from of groups[left]) for (const to of groups[right]) {
            const distance = distanceFunction(from.position,to.position);
            if (!bridge || distance < bridge.distance) bridge = {from,to,distance};
          }
        }
      }
      if (!bridge) break;
      edges.set(keyFor(bridge.from,bridge.to), {...bridge,key:keyFor(bridge.from,bridge.to),bridge:true});
    }
    return [...edges.values()];
  }

  function components(entries,edges) {
    const parent = new Map(entries.map(entry => [entry.index,entry.index]));
    const find = value => {
      if (parent.get(value) !== value) parent.set(value,find(parent.get(value)));
      return parent.get(value);
    };
    for (const edge of edges) {
      const a = find(edge.from.index);
      const b = find(edge.to.index);
      if (a !== b) parent.set(b,a);
    }
    const groups = new Map();
    for (const entry of entries) {
      const root = find(entry.index);
      if (!groups.has(root)) groups.set(root,[]);
      groups.get(root).push(entry);
    }
    return [...groups.values()];
  }

  function mergeNearby(nodes,radius) {
    if (!nodes.length) return [];
    const parent = nodes.map((_,index) => index);
    const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
    const union = (a,b) => {
      const left = find(a);
      const right = find(b);
      if (left !== right) parent[right] = left;
    };
    for (let left=0; left<nodes.length; left+=1) {
      for (let right=left+1; right<nodes.length; right+=1) {
        if (distance3(nodes[left].position,nodes[right].position) <= radius) union(left,right);
      }
    }
    const groups = new Map();
    nodes.forEach((node,index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root,[]);
      groups.get(root).push(node);
    });
    const merged = [...groups.values()].map(group => {
      const total = group.reduce((sum,node) => sum + node.rawStrength,0) || 1;
      const position = group.reduce((point,node) => ({
        x:point.x + node.position.x * node.rawStrength / total,
        y:point.y + node.position.y * node.rawStrength / total,
        z:point.z + node.position.z * node.rawStrength / total
      }), {x:0,y:0,z:0});
      return {
        id:`authority-aggregate-${hashString(group.map(node => node.id).sort().join('|')).toString(36)}`,
        position,
        rawStrength:group.reduce((sum,node) => sum + node.rawStrength,0),
        anomaly:group.some(node => node.anomaly),
        mergedPointCount:group.length,
        connections:group.flatMap(node => node.connections),
        placementMethod:'published-first authority bounded midpoint'
      };
    });
    const maximum = Math.max(...merged.map(node => node.rawStrength),1e-9);
    merged.sort((a,b) => b.rawStrength-a.rawStrength);
    merged.forEach((node,index) => {
      const normalized = Math.sqrt(node.rawStrength / maximum);
      node.strength = .25 + normalized * 2.75;
      node.displayRadius = 3.5 + Math.log2(node.connections.length + 1) * 1.7 + normalized * 4.2;
      node.name = node.anomaly
        ? (node.connections.length > 1 ? 'Anomalous Aggregate Lensing Node' : 'Anomaly Gravitational Point')
        : `Aggregate Lensing Node ${String(index+1).padStart(2,'0')}`;
    });
    return merged;
  }

  function balanceWeight(source) {
    return Math.pow(Math.max(1e-9,source.effectiveMass || source.mass || 1),.56) *
      Math.pow(Math.max(.2,source.sizeFactor || 1),.44);
  }
  function boundedFraction(a,b) { return clamp(.5 + .22 * Math.tanh(Math.log(b/a) / 1.8),.28,.72); }
  function pairInfluence(a,b,maxRadius) {
    const normalized = distance3(a.position,b.position) / Math.max(1,maxRadius);
    return Math.sqrt(balanceWeight(a) * balanceWeight(b)) / Math.pow(.035 + normalized,1.18);
  }
  function interpolate(a,b,t) { return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}; }
  function distance3(a,b) { return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z); }
  function magnitude(point) { return Math.hypot(point.x,point.y,point.z); }
  function scalePoint(point,scale) { return {x:point.x*scale,y:point.y*scale,z:point.z*scale}; }
  function maximumPairDistance(points) {
    let maximum = 0;
    for (let a=0; a<points.length; a+=1) for (let b=a+1; b<points.length; b+=1) {
      maximum = Math.max(maximum,distance3(points[a],points[b]));
    }
    return maximum;
  }
  function clamp(value,min,max) { return Math.min(max,Math.max(min,value)); }
  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash,16777619);
    }
    return hash >>> 0;
  }

  waitForAuthority();
})();