(() => {
  'use strict';
  if (globalThis.BlacklightExoStellarSectorStrategicMap) return;

  const SVG = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const REQUIRED_STATIC_IDS = [
    'exo-sector-map',
    'exo-sector-map-territories',
    'exo-sector-map-corridors',
    'exo-sector-map-formations',
    'exo-sector-map-legend'
  ];
  const VIEWBOX = { width: 1000, height: 680, cx: 500, cy: 340 };
  const camera = { yaw: -0.62, pitch: 0.38, zoom: 1 };
  let sector = null;
  let clusterNodes = new Map();
  let drag = null;
  let suppressClick = false;

  const svg = (tag, attrs = {}) => {
    const item = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
    return item;
  };

  function colorIndex(value) {
    let state = 2166136261;
    for (const char of String(value)) {
      state ^= char.charCodeAt(0);
      state = Math.imul(state, 16777619);
    }
    return (state >>> 0) % 12;
  }

  function ensureControls() {
    const controls = document.querySelector('.exo-sector-map-layer-controls');
    if (controls && !$('exo-sector-map-jump-lanes')) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      const span = document.createElement('span');
      input.id = 'exo-sector-map-jump-lanes';
      input.type = 'checkbox';
      input.checked = true;
      span.textContent = 'Jump lanes';
      label.append(input, span);
      controls.prepend(label);
    }
    const corridorLabel = $('exo-sector-map-corridors')?.closest('label')?.querySelector('span');
    if (corridorLabel) corridorLabel.textContent = 'Connection vectors';
    if (controls && !$('exo-sector-map-reset')) {
      const reset = document.createElement('button');
      reset.id = 'exo-sector-map-reset';
      reset.type = 'button';
      reset.className = 'bli-action exo-sector-map-reset';
      reset.textContent = 'Reset 3D view';
      controls.append(reset);
      const hint = document.createElement('span');
      hint.className = 'exo-sector-map-camera-hint';
      hint.textContent = 'Drag to orbit · wheel to zoom';
      controls.append(hint);
    }

    const legend = $('exo-sector-map-legend');
    if (legend && !legend.querySelector('[data-legend="jump-lane"]')) {
      const item = document.createElement('span');
      item.dataset.legend = 'jump-lane';
      item.append(document.createElement('i'), document.createTextNode('Jump lane'));
      legend.prepend(item);
    }
    const corridorLegend = legend?.querySelector('[data-legend="corridor"]');
    if (corridorLegend) {
      corridorLegend.lastChild.textContent = 'Connection vector';
      corridorLegend.dataset.legend = 'vector';
    }
  }

  function collectClusterNodes() {
    const root = $('exo-sector-map');
    const found = new Map();
    for (const circle of root?.querySelectorAll('.exo-sector-cluster-node') || []) {
      const clusterId = circle.dataset.clusterId;
      if (!clusterId) continue;
      const group = circle.closest('g');
      if (!group) continue;
      found.set(clusterId, {
        group,
        circle,
        label: group.querySelector('.exo-sector-map-label')
      });
    }
    if (found.size) clusterNodes = found;
  }

  function bounds(record) {
    const clusters = record?.clusters || [];
    if (!clusters.length) {
      return { center: { x: 0, y: 0, z: 0 }, span: 1 };
    }
    const xs = clusters.map(item => Number(item.coordinatesLy?.x) || 0);
    const ys = clusters.map(item => Number(item.coordinatesLy?.y) || 0);
    const zs = clusters.map(item => Number(item.coordinatesLy?.z) || 0);
    const min = { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) };
    const max = { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) };
    return {
      center: {
        x: (min.x + max.x) / 2,
        y: (min.y + max.y) / 2,
        z: (min.z + max.z) / 2
      },
      span: Math.max(1, max.x - min.x, max.y - min.y, max.z - min.z)
    };
  }

  function projector(record) {
    const frame = bounds(record);
    const baseScale = 470 / frame.span;
    const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
    return point => {
      const x = (Number(point?.x) || 0) - frame.center.x;
      const y = (Number(point?.y) || 0) - frame.center.y;
      const z = (Number(point?.z) || 0) - frame.center.z;
      const yawX = x * cy - z * sy;
      const yawZ = x * sy + z * cy;
      const pitchY = y * cp - yawZ * sp;
      const pitchZ = y * sp + yawZ * cp;
      const depthPx = pitchZ * baseScale;
      const perspective = Math.max(0.48, Math.min(1.7, 880 / (880 + depthPx * 0.72)));
      const scale = baseScale * camera.zoom * perspective;
      return {
        x: VIEWBOX.cx + yawX * scale,
        y: VIEWBOX.cy - pitchY * scale,
        depth: pitchZ,
        perspective
      };
    };
  }

  function distance3d(a, b) {
    const dx = (Number(a.coordinatesLy?.x) || 0) - (Number(b.coordinatesLy?.x) || 0);
    const dy = (Number(a.coordinatesLy?.y) || 0) - (Number(b.coordinatesLy?.y) || 0);
    const dz = (Number(a.coordinatesLy?.z) || 0) - (Number(b.coordinatesLy?.z) || 0);
    return Math.hypot(dx, dy, dz);
  }

  function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function jumpEdges(record) {
    const clusters = record?.clusters || [];
    if (clusters.length < 2) return [];
    const byId = new Map(clusters.map(item => [item.clusterId, item]));
    const edges = new Map();
    const add = (a, b, source = 'navigation-topology') => {
      if (!a || !b || a === b || !byId.has(a) || !byId.has(b)) return;
      const key = pairKey(a, b);
      if (!edges.has(key)) {
        edges.set(key, {
          fromClusterId: a,
          toClusterId: b,
          distanceLy: distance3d(byId.get(a), byId.get(b)),
          source
        });
      }
    };

    const visited = new Set([clusters[0].clusterId]);
    while (visited.size < clusters.length) {
      let best = null;
      for (const fromId of visited) {
        const from = byId.get(fromId);
        for (const to of clusters) {
          if (visited.has(to.clusterId)) continue;
          const d = distance3d(from, to);
          if (!best || d < best.distanceLy) best = { fromClusterId: fromId, toClusterId: to.clusterId, distanceLy: d };
        }
      }
      if (!best) break;
      add(best.fromClusterId, best.toClusterId, 'minimum-navigation-spine');
      visited.add(best.toClusterId);
    }

    for (const cluster of clusters) {
      const nearest = clusters
        .filter(other => other.clusterId !== cluster.clusterId)
        .map(other => ({ id: other.clusterId, distance: distance3d(cluster, other) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2);
      for (const neighbor of nearest) add(cluster.clusterId, neighbor.id, 'local-jump-lane');
    }

    for (const corridor of record?.strategicCorridors || []) {
      add(corridor.fromClusterId, corridor.toClusterId, 'strategic-corridor');
    }
    return [...edges.values()];
  }

  function cross(origin, a, b) {
    return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  }

  function convexHull(points) {
    const unique = [...new Map(points.map(point => [`${point.x.toFixed(3)}:${point.y.toFixed(3)}`, point])).values()]
      .sort((a, b) => a.x - b.x || a.y - b.y);
    if (unique.length <= 2) return unique;
    const lower = [];
    for (const point of unique) {
      while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
      lower.push(point);
    }
    const upper = [];
    for (const point of [...unique].reverse()) {
      while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
      upper.push(point);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  }

  function paddedHull(points, padding = 18) {
    const hull = convexHull(points);
    if (!hull.length) return [];
    const center = {
      x: hull.reduce((sum, point) => sum + point.x, 0) / hull.length,
      y: hull.reduce((sum, point) => sum + point.y, 0) / hull.length
    };
    if (hull.length === 1) {
      const point = hull[0];
      return Array.from({ length: 12 }, (_, index) => {
        const angle = Math.PI * 2 * index / 12;
        return { x: point.x + Math.cos(angle) * padding, y: point.y + Math.sin(angle) * padding };
      });
    }
    if (hull.length === 2) {
      const [a, b] = hull;
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length * padding, ny = dx / length * padding;
      return [
        { x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny },
        { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny }
      ];
    }
    return hull.map(point => {
      const dx = point.x - center.x, dy = point.y - center.y, length = Math.max(1, Math.hypot(dx, dy));
      return { x: point.x + dx / length * padding, y: point.y + dy / length * padding };
    });
  }

  const pointsText = points => points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');

  function definitions() {
    const defs = svg('defs');
    const arrow = svg('marker', {
      id: 'exo-sector-vector-arrow', markerWidth: 9, markerHeight: 9,
      refX: 8, refY: 4.5, orient: 'auto', markerUnits: 'strokeWidth'
    });
    arrow.append(svg('path', { d: 'M 0 0 L 9 4.5 L 0 9 z', class: 'exo-sector-vector-arrow' }));
    defs.append(arrow);
    return defs;
  }

  function axisLayer(project, frame) {
    const group = svg('g', { class: 'exo-sector-3d-axes', 'data-render-layer': 'axes' });
    const length = frame.span * 0.42;
    const center = frame.center;
    const axes = [
      ['x', { x: center.x - length, y: center.y, z: center.z }, { x: center.x + length, y: center.y, z: center.z }, 'X'],
      ['y', { x: center.x, y: center.y - length, z: center.z }, { x: center.x, y: center.y + length, z: center.z }, 'Y'],
      ['z', { x: center.x, y: center.y, z: center.z - length }, { x: center.x, y: center.y, z: center.z + length }, 'Z']
    ];
    for (const [axis, from3d, to3d, labelText] of axes) {
      const from = project(from3d), to = project(to3d);
      group.append(svg('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: `exo-sector-3d-axis axis-${axis}` }));
      const label = svg('text', { x: to.x + 5, y: to.y - 5, class: 'exo-sector-3d-axis-label' });
      label.textContent = labelText;
      group.append(label);
    }
    return group;
  }

  function territoryLayer(record, projected) {
    const group = svg('g', { 'data-render-layer': 'territories', class: 'exo-sector-strategic-territories' });
    for (const region of record.territorialRegions || []) {
      const points = [...new Set([
        ...(region.coreClusterIds || []),
        ...(region.frontierClusterIds || []),
        ...(region.contestedClusterIds || [])
      ])].map(id => projected.get(id)).filter(Boolean);
      const hull = paddedHull(points);
      if (!hull.length) continue;
      group.append(svg('polygon', {
        points: pointsText(hull), class: 'exo-sector-territory',
        'data-region-id': region.regionId, 'data-polity-id': region.polityId,
        'data-color-index': colorIndex(region.polityId),
        'aria-label': `${region.name}; ${region.regionState}; sovereignty ${region.sovereigntyConfidencePercent} percent`
      }));
      const capital = projected.get(region.capitalClusterId);
      if (capital) group.append(svg('circle', {
        cx: capital.x, cy: capital.y, r: 11 * capital.perspective,
        class: 'exo-sector-capital-marker', 'data-color-index': colorIndex(region.polityId),
        'aria-label': `${region.name} capital cluster`
      }));
      for (const clusterId of region.contestedClusterIds || []) {
        const point = projected.get(clusterId);
        if (point) group.append(svg('circle', {
          cx: point.x, cy: point.y, r: 14 * point.perspective,
          class: 'exo-sector-contested-marker', 'data-region-id': region.regionId
        }));
      }
    }
    return group;
  }

  function jumpLaneLayer(record, projected) {
    const group = svg('g', { 'data-render-layer': 'jump-lanes', class: 'exo-sector-jump-lanes' });
    const frame = bounds(record);
    for (const edge of jumpEdges(record)) {
      const from = projected.get(edge.fromClusterId), to = projected.get(edge.toClusterId);
      if (!from || !to) continue;
      const line = svg('line', {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        class: 'exo-sector-jump-lane',
        'data-from-cluster-id': edge.fromClusterId,
        'data-to-cluster-id': edge.toClusterId,
        'data-source': edge.source,
        'aria-label': `Jump lane ${edge.fromClusterId} to ${edge.toClusterId}; ${edge.distanceLy.toFixed(2)} light years`
      });
      const depth = (from.depth + to.depth) / 2;
      line.style.opacity = String(Math.max(0.16, Math.min(0.58, 0.4 - depth / frame.span * 0.18)));
      group.append(line);
    }
    return group;
  }

  function corridorLayer(record, projected) {
    const group = svg('g', { 'data-render-layer': 'corridors', class: 'exo-sector-strategic-corridors' });
    for (const corridor of record.strategicCorridors || []) {
      const from = projected.get(corridor.fromClusterId), to = projected.get(corridor.toClusterId);
      if (!from || !to) continue;
      group.append(svg('path', {
        d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
        class: `exo-sector-strategic-corridor ${corridor.controlState === 'contested' ? 'contested' : 'controlled'}`,
        'data-corridor-id': corridor.corridorId,
        'data-color-index': colorIndex(corridor.polityId),
        'marker-end': 'url(#exo-sector-vector-arrow)',
        'aria-label': `${corridor.purpose}; ${corridor.distanceLy} light years; ${corridor.controlState}`
      }));
    }
    return group;
  }

  function deploymentCluster(record, formation, projected) {
    const deployment = (record.fleetDeployments || []).find(item => item.formationId === formation.formationId);
    const clusterId = deployment?.deployedClusterId || (formation.assignedClusterIds || []).find(id => projected.has(id));
    return { deployment, clusterId };
  }

  function formationLayer(record, projected) {
    const group = svg('g', { 'data-render-layer': 'formations', class: 'exo-sector-strategic-formations' });
    const offsets = new Map();
    for (const formation of record.militaryFormations || []) {
      const { deployment, clusterId } = deploymentCluster(record, formation, projected);
      if (!clusterId || !projected.has(clusterId)) continue;
      const base = projected.get(clusterId), index = offsets.get(clusterId) || 0;
      offsets.set(clusterId, index + 1);
      const angle = Math.PI * 2 * (index % 8) / 8;
      const radius = (20 + Math.floor(index / 8) * 9) * base.perspective;
      const x = base.x + Math.cos(angle) * radius, y = base.y + Math.sin(angle) * radius;
      const size = 5.5 * base.perspective;
      const marker = svg('polygon', {
        points: pointsText([{ x, y: y - size }, { x: x + size, y: y + size }, { x: x - size, y: y + size }]),
        class: 'exo-sector-formation-marker', 'data-formation-id': formation.formationId,
        'data-deployment-id': deployment?.deploymentId || '', 'data-color-index': colorIndex(formation.polityId),
        tabindex: 0, role: 'img',
        'aria-label': deployment
          ? `${formation.name}; ${deployment.posture}; ${deployment.primaryObjective}; ${deployment.supplyState} supply`
          : `${formation.name}; ${formation.formationType}; ${formation.mission}; ${formation.readiness}`
      });
      group.append(marker);
    }
    return group;
  }

  function clusterLayer(record, projected) {
    const layer = svg('g', { 'data-render-layer': 'clusters', class: 'exo-sector-3d-clusters' });
    const ordered = [...record.clusters].sort((a, b) => projected.get(b.clusterId).depth - projected.get(a.clusterId).depth);
    for (const cluster of ordered) {
      const item = clusterNodes.get(cluster.clusterId);
      const point = projected.get(cluster.clusterId);
      if (!item || !point) continue;
      const { group, circle, label } = item;
      group.dataset.clusterDepth = String(point.depth);
      circle.setAttribute('cx', point.x.toFixed(2));
      circle.setAttribute('cy', point.y.toFixed(2));
      const baseRadius = cluster.clusterId === record.solarReference?.clusterId ? 9 : 7;
      circle.setAttribute('r', (baseRadius * Math.max(0.72, Math.min(1.42, point.perspective))).toFixed(2));
      circle.style.opacity = String(Math.max(0.55, Math.min(1, 0.82 + (point.perspective - 1) * 0.35)));
      if (label) {
        label.setAttribute('x', (point.x + 10 * point.perspective).toFixed(2));
        label.setAttribute('y', (point.y - 9 * point.perspective).toFixed(2));
        label.style.opacity = String(Math.max(0.5, Math.min(1, point.perspective)));
      }
      layer.append(group);
    }
    return layer;
  }

  function draw() {
    if (!sector) return;
    const root = $('exo-sector-map');
    if (!root) return;
    collectClusterNodes();
    const project = projector(sector);
    const projected = new Map((sector.clusters || []).map(cluster => [cluster.clusterId, project(cluster.coordinatesLy)]));
    const frame = bounds(sector);
    const layers = [definitions(), axisLayer(project, frame)];
    if ($('exo-sector-map-territories')?.checked !== false) layers.push(territoryLayer(sector, projected));
    if ($('exo-sector-map-jump-lanes')?.checked !== false) layers.push(jumpLaneLayer(sector, projected));
    if ($('exo-sector-map-corridors')?.checked !== false) layers.push(corridorLayer(sector, projected));
    if ($('exo-sector-map-formations')?.checked !== false) layers.push(formationLayer(sector, projected));
    layers.push(clusterLayer(sector, projected));
    root.replaceChildren(...layers);
    root.dataset.viewer = 'unified-3d';
    root.dataset.yaw = camera.yaw.toFixed(3);
    root.dataset.pitch = camera.pitch.toFixed(3);
    root.dataset.zoom = camera.zoom.toFixed(3);
    root.setAttribute('aria-label', 'Interactive 3D stellar-sector viewer with cluster positions, jump lanes, connection vectors, territorial envelopes, and deployed formations. Drag to orbit and use the mouse wheel to zoom.');
    const legend = $('exo-sector-map-legend');
    if (legend) {
      legend.dataset.ready = 'true';
      legend.setAttribute('aria-label', `${jumpEdges(sector).length} jump lanes, ${sector.territorialRegions?.length || 0} territorial regions, ${sector.strategicCorridors?.length || 0} connection vectors, and ${sector.fleetDeployments?.length || sector.militaryFormations?.length || 0} current fleet deployments.`);
    }
  }

  function render(record = sector) {
    if (!record) return;
    sector = structuredClone(record);
    collectClusterNodes();
    draw();
  }

  function resetView() {
    camera.yaw = -0.62;
    camera.pitch = 0.38;
    camera.zoom = 1;
    draw();
  }

  function installInteraction() {
    const root = $('exo-sector-map');
    if (!root || root.dataset.interaction3d === 'true') return;
    root.dataset.interaction3d = 'true';
    root.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch, moved: false };
      root.setPointerCapture?.(event.pointerId);
    });
    root.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      camera.yaw = drag.yaw + dx * 0.007;
      camera.pitch = Math.max(-1.36, Math.min(1.36, drag.pitch + dy * 0.006));
      draw();
    });
    const endDrag = event => {
      if (!drag || drag.id !== event.pointerId) return;
      suppressClick = drag.moved;
      drag = null;
      root.releasePointerCapture?.(event.pointerId);
    };
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);
    root.addEventListener('click', event => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    root.addEventListener('wheel', event => {
      event.preventDefault();
      camera.zoom = Math.max(0.55, Math.min(2.6, camera.zoom * Math.exp(-event.deltaY * 0.0012)));
      draw();
    }, { passive: false });
    root.addEventListener('dblclick', event => {
      if (event.target?.closest?.('.exo-sector-cluster-node')) return;
      resetView();
    });
  }

  function install() {
    const missing = REQUIRED_STATIC_IDS.filter(id => !$(id));
    if (missing.length) {
      const error = new Error(`Static strategic sector viewer layout is incomplete: ${missing.join(', ')}`);
      console.error('[Blacklight EXO]', error);
      globalThis.BlacklightExoRuntimeSupervisor?.fail?.('stellar-sector-strategic-map-static-layout', error);
      return;
    }
    ensureControls();
    installInteraction();
    for (const id of ['exo-sector-map-jump-lanes', 'exo-sector-map-territories', 'exo-sector-map-corridors', 'exo-sector-map-formations']) {
      $(id)?.addEventListener('change', draw);
    }
    $('exo-sector-map-reset')?.addEventListener('click', resetView);
    document.addEventListener('blacklight:exo-sector-generated', event => {
      queueMicrotask(() => render(event.detail?.sector || globalThis.BlacklightExoGetActiveSector?.()));
    });
    queueMicrotask(() => render(globalThis.BlacklightExoGetActiveSector?.()));
  }

  const api = Object.freeze({
    version: 3,
    layout: 'UNIFIED_3D',
    requiredStaticIds: [...REQUIRED_STATIC_IDS],
    colorIndex,
    convexHull,
    paddedHull,
    jumpEdges,
    render,
    resetView,
    getCamera: () => ({ ...camera })
  });
  globalThis.BlacklightExoStellarSectorStrategicMap = api;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
