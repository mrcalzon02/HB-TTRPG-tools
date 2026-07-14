(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_FALLOFF_AU = 0.5;
  const MAX_FALLOFF_AU = 2.5;

  function waitForDependencies(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const stage = document.querySelector('.exo-orbit-stage');
    const currentToggle = $('exo-overlay-limits');
    const table = $('exo-orbital-table-body');
    const grid = $('exo-cluster-grid');
    const transformReference = $('exo-system-spatial-overlay-3d-v2') || $('exo-topology-lensing-canvas');
    const flatReference = $('exo-system-spatial-overlay-v2') || $('exo-flat-spatial-overlays');
    if (!model || !stage || !currentToggle || !table || !grid || !transformReference || !flatReference) {
      if (attempt < 480) requestAnimationFrame(() => waitForDependencies(attempt + 1));
      return;
    }
    initialize({model, stage, currentToggle, table, grid, transformReference, flatReference});
  }

  function initialize({model, stage, currentToggle, table, grid, transformReference, flatReference}) {
    if ($('exo-dz-volume-shell-canvas')) return;

    currentToggle.checked = false;
    currentToggle.dispatchEvent(new Event('change', {bubbles:true}));
    const toggle = currentToggle.cloneNode(true);
    toggle.checked = false;
    currentToggle.replaceWith(toggle);

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-dz-volume-shell-canvas';
    canvas.setAttribute('aria-label', 'Spherical Dalton–Zirconf gravitational-density falloff volume');
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    const context = canvas.getContext('2d');

    const flat = document.createElementNS(SVG_NS, 'svg');
    flat.id = 'exo-dz-volume-flat';
    flat.setAttribute('viewBox', '0 0 1000 1000');
    flat.setAttribute('aria-label', 'Orbital-plane cross-section of the Dalton–Zirconf falloff volume');
    flat.setAttribute('aria-hidden', 'true');
    stage.append(flat);

    const state = {
      enabled:false,
      scene:null,
      selected:null,
      outermostAu:1,
      radiusAu:1,
      baseWidthAu:MAX_FALLOFF_AU,
      fields:[],
      rebuildQueued:false,
      renderQueued:false
    };

    toggle.addEventListener('change', event => {
      state.enabled = event.target.checked;
      updateVisibility();
      renderFlat();
      scheduleRender();
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      syncTransforms();
      scheduleRender();
    };
    new ResizeObserver(resize).observe(stage);

    const scheduleRebuild = () => {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuild();
      }));
    };
    new MutationObserver(scheduleRebuild).observe(table, {childList:true});
    new MutationObserver(scheduleRebuild).observe(grid, {childList:true});
    $('exo-seed-input')?.addEventListener('change', scheduleRebuild);
    $('exo-cluster-seed')?.addEventListener('change', scheduleRebuild);
    $('exo-generate-system')?.addEventListener('click', scheduleRebuild);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    ['exo-exclusive-yaw','exo-exclusive-pitch','exo-exclusive-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));
    stage.addEventListener('pointermove', syncTransforms, true);
    stage.addEventListener('wheel', syncTransforms, true);
    $('exo-system-camera-reset')?.addEventListener('click', () => requestAnimationFrame(() => {
      syncTransforms();
      scheduleRender();
    }));

    function rebuild() {
      const entries = [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        const fullMass = Number(card.dataset.systemMass);
        const stellarMass = Number(card.dataset.stellarMass);
        return {
          seed:card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name:card.dataset.catalogName || card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass:Number.isFinite(fullMass) && fullMass > 0 ? fullMass :
            Number.isFinite(stellarMass) && stellarMass > 0 ? stellarMass : model.stellarMass(star),
          populated:card.classList.contains('is-populated')
        };
      });
      state.scene = entries.length
        ? model.buildScene(entries, $('exo-cluster-seed')?.value.trim() || 'cluster', {mergeRadiusAu:1000})
        : null;
      const seed = $('exo-seed-input')?.value.trim();
      state.selected = state.scene?.entries.find(entry => entry.seed === seed) || state.scene?.entries[0] || null;
      state.outermostAu = readOutermostAu(table);
      calculateBoundary();
      updateReadout();
      renderFlat();
      updateVisibility();
      scheduleRender();
    }

    function calculateBoundary() {
      const selectedMass = state.selected?.mass || 1;
      const orbitBound = state.outermostAu * (10 + Math.sqrt(Math.max(0.08, selectedMass)) * 6);
      const neighborBound = state.selected?.nearest?.distance ? state.selected.nearest.distance * 0.46 : Infinity;
      state.radiusAu = Math.min(orbitBound, neighborBound);
      const fields = [];
      if (state.scene && state.selected) {
        for (const edge of state.scene.edges || []) {
          if (edge.from !== state.selected && edge.to !== state.selected) continue;
          const other = edge.from === state.selected ? edge.to : edge.from;
          fields.push({
            direction:unit(subtract(other.position, state.selected.position)),
            strength:connectionStrength(state.selected, other, edge.distance, state.scene.maxRadius)
          });
        }
        const nearestDistance = state.selected.nearest?.distance || state.scene.maxRadius * 0.3;
        const nearbyRadius = Math.max(1000, nearestDistance * 0.75);
        for (const node of state.scene.lensingNodes || []) {
          const offset = subtract(node.position, state.selected.position);
          const distance = magnitude(offset);
          if (distance <= nearbyRadius) {
            fields.push({direction:unit(offset), strength:Math.max(0.4, Number(node.strength) || 0.4)});
          }
        }
      }
      state.fields = fields;
      const stacked = fields.reduce((sum, field) => sum + field.strength, 0);
      const compression = 1 - Math.exp(-stacked / 4.2);
      state.baseWidthAu = model.clamp(
        MAX_FALLOFF_AU - (MAX_FALLOFF_AU - MIN_FALLOFF_AU) * compression,
        MIN_FALLOFF_AU,
        MAX_FALLOFF_AU
      );
    }

    function directionalWidth(direction, index) {
      let field = 0;
      for (const source of state.fields) {
        const alignment = Math.max(0, dot(direction, source.direction));
        field += source.strength * Math.pow(alignment, 6);
      }
      const compression = field / (1 + field);
      const irregularity = (hashUnit(`${$('exo-seed-input')?.value || 'system'}:dz-shell:${index}`) - 0.5) * 0.12;
      return model.clamp(
        state.baseWidthAu - (state.baseWidthAu - MIN_FALLOFF_AU) * compression * 0.82 + irregularity,
        MIN_FALLOFF_AU,
        MAX_FALLOFF_AU
      );
    }

    function renderFlat() {
      flat.replaceChildren();
      if (!state.enabled) return;
      const defs = document.createElementNS(SVG_NS, 'defs');
      const gradient = document.createElementNS(SVG_NS, 'radialGradient');
      gradient.id = 'exo-dz-shell-flat-gradient';
      [['0%','0'],['72%','0'],['82%','.035'],['89%','.18'],['94%','.31'],['98%','.10'],['100%','0']]
        .forEach(([offset, opacity]) => {
          const stop = document.createElementNS(SVG_NS, 'stop');
          stop.setAttribute('offset', offset);
          stop.setAttribute('stop-color', '#7fd5e8');
          stop.setAttribute('stop-opacity', opacity);
          gradient.append(stop);
        });
      defs.append(gradient);
      flat.append(defs);
      const disc = document.createElementNS(SVG_NS, 'circle');
      disc.setAttribute('cx','500');
      disc.setAttribute('cy','500');
      disc.setAttribute('r','468');
      disc.setAttribute('fill','url(#exo-dz-shell-flat-gradient)');
      flat.append(disc);

      const segments = 180;
      for (let index = 0; index < segments; index += 1) {
        const angle = index / segments * Math.PI * 2;
        const next = (index + 1) / segments * Math.PI * 2;
        const direction = {x:Math.cos(angle), y:Math.sin(angle), z:0};
        const width = directionalWidth(direction, index);
        const thickness = 8 + width / MAX_FALLOFF_AU * 23;
        const arc = document.createElementNS(SVG_NS, 'path');
        arc.setAttribute('d', arcPath(500, 500, 443, angle, next));
        arc.setAttribute('fill','none');
        arc.setAttribute('stroke','rgba(135,218,236,.24)');
        arc.setAttribute('stroke-width', thickness.toFixed(2));
        flat.append(arc);
      }
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x','500');
      label.setAttribute('y','968');
      label.setAttribute('text-anchor','middle');
      label.setAttribute('class','exo-dz-volume-label');
      label.textContent = `Dalton–Zirconf spherical density transition · ${formatAu(state.radiusAu)} · ±${state.baseWidthAu.toFixed(2)} AU average falloff`;
      flat.append(label);
    }

    function renderThree() {
      state.renderQueued = false;
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      syncTransforms();
      if (!state.enabled || !stage.classList.contains('exo-exclusive-3d')) return;

      const width = canvas.width;
      const height = canvas.height;
      const ratio = deviceScale();
      const zoom = Number($('exo-exclusive-zoom')?.value || 100) / 100;
      const radius = Math.min(width, height) * model.clamp(0.40 * Math.sqrt(zoom), 0.34, 0.47);
      const center = {x:width / 2, y:height / 2};

      const glow = context.createRadialGradient(center.x, center.y, radius * 0.68, center.x, center.y, radius * 1.12);
      glow.addColorStop(0,'rgba(74,170,201,0)');
      glow.addColorStop(.62,'rgba(74,170,201,0)');
      glow.addColorStop(.78,'rgba(91,194,220,.025)');
      glow.addColorStop(.90,'rgba(123,216,236,.10)');
      glow.addColorStop(.97,'rgba(104,201,224,.035)');
      glow.addColorStop(1,'rgba(74,170,201,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(center.x, center.y, radius * 1.12, 0, Math.PI * 2);
      context.fill();

      const camera = cameraState();
      const segments = 240;
      const layers = 11;
      for (let index = 0; index < segments; index += 1) {
        const angle = index / segments * Math.PI * 2;
        const end = (index + 1.5) / segments * Math.PI * 2;
        const screenDirection = {x:Math.cos(angle), y:Math.sin(angle), z:0};
        const worldDirection = inverseRotate(screenDirection, camera.yaw, camera.pitch);
        const widthAu = directionalWidth(worldDirection, index);
        const thickness = radius * (0.025 + widthAu / MAX_FALLOFF_AU * 0.105);
        const distortion = (hashUnit(`${index}:${$('exo-seed-input')?.value || 'system'}:radius`) - .5) * radius * .012;
        for (let layer = 0; layer < layers; layer += 1) {
          const t = layer / (layers - 1);
          const offset = (t - .5) * thickness;
          const alpha = Math.pow(Math.sin(Math.PI * t), 1.35) * 0.055;
          context.beginPath();
          context.arc(center.x, center.y, radius + distortion + offset, angle, end);
          context.strokeStyle = `rgba(119,211,233,${alpha.toFixed(3)})`;
          context.lineWidth = Math.max(1, 1.15 * ratio);
          context.lineCap = 'round';
          context.stroke();
        }
      }

      context.save();
      context.font = `800 ${12 * ratio}px system-ui`;
      context.lineWidth = 4 * ratio;
      context.strokeStyle = 'rgba(0,0,0,.9)';
      context.fillStyle = 'rgba(164,226,240,.96)';
      const text = `Dalton–Zirconf spherical density field · ${formatAu(state.radiusAu)} · ±${state.baseWidthAu.toFixed(2)} AU average transition`;
      context.strokeText(text, 18 * ratio, height - 22 * ratio);
      context.fillText(text, 18 * ratio, height - 22 * ratio);
      context.restore();
    }

    function updateVisibility() {
      const three = stage.classList.contains('exo-exclusive-3d');
      canvas.setAttribute('aria-hidden', String(!state.enabled || !three));
      flat.setAttribute('aria-hidden', String(!state.enabled || three));
      canvas.style.display = state.enabled && three ? 'block' : 'none';
      flat.style.display = state.enabled && !three ? 'block' : 'none';
      syncTransforms();
      renderFlat();
      scheduleRender();
    }

    function updateReadout() {
      let output = $('exo-dz-falloff-readout');
      if (!output) {
        output = document.createElement('span');
        output.id = 'exo-dz-falloff-readout';
        output.className = 'exo-dz-falloff-readout';
        toggle.closest('fieldset')?.append(output);
      }
      output.textContent = `${formatAu(state.radiusAu)} radius · spherical ±${state.baseWidthAu.toFixed(2)} AU density falloff`;
      output.title = 'A complete spherical transition volume. Stacked external fields compress local thickness toward ±0.5 AU; isolated directions widen toward ±2.5 AU.';
    }

    function syncTransforms() {
      canvas.style.transform = transformReference.style.transform || '';
      canvas.style.translate = transformReference.style.translate || '';
      flat.style.transform = flatReference.style.transform || '';
      flat.style.translate = flatReference.style.translate || '';
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(renderThree);
    }

    resize();
    rebuild();
  }

  function readOutermostAu(table) {
    const values = [];
    for (const row of table.querySelectorAll('tr')) {
      const orbit = row.cells?.[0]?.textContent.trim() || '';
      const distance = row.cells?.[3]?.textContent.trim() || '';
      if (/^\d+$/.test(orbit) && / AU$/.test(distance)) values.push(Number.parseFloat(distance) || 0);
    }
    return Math.max(1, ...values);
  }

  function cameraState() {
    return {
      yaw:Number($('exo-exclusive-yaw')?.value || -24) * Math.PI / 180,
      pitch:Number($('exo-exclusive-pitch')?.value || 58) * Math.PI / 180
    };
  }

  function inverseRotate(point, yaw, pitch) {
    const y = point.y * Math.cos(pitch) + point.z * Math.sin(pitch);
    const z1 = -point.y * Math.sin(pitch) + point.z * Math.cos(pitch);
    return {
      x:point.x * Math.cos(yaw) + z1 * Math.sin(yaw),
      y,
      z:-point.x * Math.sin(yaw) + z1 * Math.cos(yaw)
    };
  }

  function arcPath(cx, cy, radius, start, end) {
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  function connectionStrength(a, b, distance, maxRadius) {
    const massTerm = Math.sqrt(Math.max(0.001, a.mass * b.mass));
    const distanceTerm = 1 / Math.pow(0.08 + distance / Math.max(1, maxRadius), 0.8);
    return 0.45 + Math.min(3.5, massTerm * distanceTerm);
  }

  function subtract(a, b) { return {x:a.x-b.x, y:a.y-b.y, z:a.z-b.z}; }
  function magnitude(point) { return Math.hypot(point.x, point.y, point.z); }
  function unit(point) { const length = magnitude(point) || 1; return {x:point.x/length,y:point.y/length,z:point.z/length}; }
  function dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
  function hashUnit(value) {
    let hash = 2166136261;
    for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0) / 4294967295;
  }
  function formatAu(value) {
    if (!Number.isFinite(value)) return 'unknown';
    if (value >= 1000000) return `${(value/1000000).toFixed(2)}M AU`;
    if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
    return `${value.toFixed(2)} AU`;
  }
  function deviceScale() { return Math.min(2, window.devicePixelRatio || 1); }

  waitForDependencies();
})();
