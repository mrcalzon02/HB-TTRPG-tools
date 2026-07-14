(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function waitForDependencies(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const grid = $('exo-cluster-grid');
    const baseCanvas = $('exo-cluster-volume-canvas-v2');
    const routes = $('exo-cluster-volume-routes');
    const nodes = $('exo-cluster-volume-gravity');
    if (!model || !grid || !baseCanvas || !routes || !nodes) {
      if (attempt < 420) requestAnimationFrame(() => waitForDependencies(attempt + 1));
      return;
    }
    initialize({model, grid, baseCanvas, routes, nodes});
  }

  function initialize({model, grid, baseCanvas, routes, nodes}) {
    if ($('exo-cluster-volume-gradient')) return;

    const shell = baseCanvas.closest('.exo-cluster-map-shell');
    const modeGroup = routes.closest('.exo-cluster-volume-mode');
    const status = $('exo-cluster-volume-status');
    const clusterSeed = $('exo-cluster-seed');
    const systemSeed = $('exo-seed-input');
    if (!shell || !modeGroup) return;

    const gradientButton = document.createElement('button');
    gradientButton.id = 'exo-cluster-volume-gradient';
    gradientButton.className = 'bli-action';
    gradientButton.type = 'button';
    gradientButton.setAttribute('aria-pressed', 'false');
    gradientButton.textContent = 'Gravity Gradient Bands';
    gradientButton.title = 'Display continuous gravitational-field strength bands derived from the same stellar, substellar, nebular, and anomaly sources used by the cluster gravity model.';
    modeGroup.append(gradientButton);

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-cluster-gravity-band-canvas';
    canvas.className = 'exo-cluster-gravity-band-canvas';
    canvas.tabIndex = 0;
    canvas.hidden = true;
    canvas.setAttribute('aria-label', 'Rigid three-dimensional cluster gravity-gradient heat map');
    baseCanvas.insertAdjacentElement('afterend', canvas);
    const context = canvas.getContext('2d');

    const readout = document.createElement('p');
    readout.id = 'exo-cluster-gradient-readout';
    readout.className = 'exo-cluster-gradient-readout';
    readout.hidden = true;
    readout.textContent = 'Gravity bands are calculated from authority-controlled masses and fixed cluster coordinates. Derived lensing nodes are not treated as additional mass.';
    canvas.insertAdjacentElement('afterend', readout);

    const state = {
      active:false,
      scene:null,
      sources:[],
      panX:0,
      panY:0,
      drag:null,
      moved:false,
      hitTargets:[],
      rebuildQueued:false,
      renderQueued:false
    };

    gradientButton.addEventListener('click', activateGradient);
    routes.addEventListener('click', deactivateGradient);
    nodes.addEventListener('click', deactivateGradient);

    canvas.addEventListener('pointerdown', beginDrag);
    canvas.addEventListener('pointermove', continueDrag);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('click', activateTarget);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const zoom = $('exo-cluster-camera-zoom');
      const current = Number(zoom?.value || 100);
      const next = model.clamp(current * (event.deltaY > 0 ? 0.92 : 1.08), 40, 300);
      if (zoom) {
        zoom.value = String(Math.round(next));
        zoom.dispatchEvent(new Event('input', {bubbles:true}));
      }
      scheduleRender();
    }, {passive:false});

    ['exo-cluster-camera-yaw','exo-cluster-camera-pitch','exo-cluster-camera-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));
    $('exo-cluster-camera-reset')?.addEventListener('click', () => {
      state.panX = 0;
      state.panY = 0;
      scheduleRender();
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(520, baseCanvas.clientWidth || shell.clientWidth - 30);
      const height = Math.max(420, baseCanvas.clientHeight || Math.min(680, width * 0.58));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scheduleRender();
    };
    new ResizeObserver(resize).observe(baseCanvas);
    resize();

    const scheduleRebuild = () => {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuild();
      }));
    };
    new MutationObserver(scheduleRebuild).observe(grid, {childList:true});
    clusterSeed?.addEventListener('change', scheduleRebuild);
    systemSeed?.addEventListener('change', scheduleRender);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);

    function activateGradient() {
      state.active = true;
      routes.classList.remove('is-active');
      nodes.classList.remove('is-active');
      routes.setAttribute('aria-pressed', 'false');
      nodes.setAttribute('aria-pressed', 'false');
      gradientButton.classList.add('is-active');
      gradientButton.setAttribute('aria-pressed', 'true');
      baseCanvas.hidden = true;
      canvas.hidden = false;
      readout.hidden = false;
      const axes = $('exo-cluster-lensing-plane-overlay');
      if (axes) axes.hidden = true;
      if (status) status.textContent = 'Gravity-gradient bands: continuous field intensity from published-first system masses and generated non-stellar masses. Click a system to open it.';
      scheduleRebuild();
    }

    function deactivateGradient() {
      if (!state.active) return;
      state.active = false;
      gradientButton.classList.remove('is-active');
      gradientButton.setAttribute('aria-pressed', 'false');
      baseCanvas.hidden = false;
      canvas.hidden = true;
      readout.hidden = true;
      const axes = $('exo-cluster-lensing-plane-overlay');
      if (axes) axes.hidden = false;
    }

    function rebuild() {
      const entries = [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        const fullMass = Number(card.dataset.systemMass);
        const stellarMass = Number(card.dataset.stellarMass);
        return {
          seed:card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name:card.dataset.catalogName || card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass:Number.isFinite(fullMass) && fullMass > 0
            ? fullMass
            : Number.isFinite(stellarMass) && stellarMass > 0
              ? stellarMass
              : model.stellarMass(star),
          populated:card.classList.contains('is-populated'),
          open:card.querySelector('.exo-cluster-open')
        };
      });
      state.scene = entries.length
        ? model.buildScene(entries, clusterSeed?.value.trim() || 'cluster', {mergeRadiusAu:1000})
        : null;
      if (state.scene) {
        const openBySeed = new Map(entries.map(entry => [entry.seed, entry.open]));
        for (const entry of state.scene.entries) entry.open = openBySeed.get(entry.seed);
        state.sources = gravitySources(state.scene);
      } else {
        state.sources = [];
      }
      scheduleRender();
    }

    function gravitySources(scene) {
      const scale = Math.max(1, scene.maxRadius);
      const sources = [
        ...scene.entries.map(entry => source(entry.position, entry.mass * 1.25, scale * 0.018, 'system', entry.name)),
        ...(scene.protostars || []).map(item => source(item.position, item.mass * 0.92, scale * 0.014, 'protostar', item.name)),
        ...(scene.darkMasses || []).map(item => source(item.position, item.mass * 1.08, scale * 0.012, 'dark-mass', item.name)),
        ...(scene.nebulae || []).map(item => source(
          item.position,
          Math.sqrt(Math.max(0.001, item.mass)) * (0.3 + item.density * 0.55),
          Math.max(item.radius?.x || 0, item.radius?.y || 0, item.radius?.z || 0, scale * 0.03),
          'nebula',
          item.name
        ))
      ];
      const anomaly = (scene.lensingNodes || []).find(node => node.anomaly);
      if (anomaly) sources.push(source(anomaly.position, Math.max(0.1, anomaly.strength) * 0.42, scale * 0.016, 'anomaly', anomaly.name));
      return sources;
    }

    function source(position, weight, softening, category, name) {
      return {position, weight:Math.max(1e-8, weight), softening:Math.max(1, softening), category, name};
    }

    function scheduleRender() {
      if (!state.active || state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(render);
    }

    function render() {
      state.renderQueued = false;
      if (!state.active || !context) return;
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#020202';
      context.fillRect(0, 0, width, height);
      drawStarfield(width, height);
      state.hitTargets = [];
      if (!state.scene) return;
      drawHeatMap(width, height);
      drawNebulae(width, height);
      drawMasses(width, height);
      drawSystems(width, height);
      drawAxes(width, height);
      drawLegend(width, height);
    }

    function drawHeatMap(width, height) {
      const ratio = width / Math.max(1, height);
      const sampleHeight = 54;
      const sampleWidth = Math.max(72, Math.round(sampleHeight * ratio));
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleWidth;
      offscreen.height = sampleHeight;
      const off = offscreen.getContext('2d');
      const image = off.createImageData(sampleWidth, sampleHeight);
      const logs = new Float64Array(sampleWidth * sampleHeight);
      const depthSlices = [-0.42, 0, 0.42];
      let cursor = 0;
      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          let combined = 0;
          for (const depth of depthSlices) {
            const point = worldFromSample(x, y, sampleWidth, sampleHeight, depth);
            combined += gravityMagnitude(point);
          }
          logs[cursor] = Math.log10(1 + combined / depthSlices.length);
          cursor += 1;
        }
      }
      const sorted = [...logs].sort((a, b) => a - b);
      const low = sorted[Math.floor(sorted.length * 0.08)] || 0;
      const high = sorted[Math.floor(sorted.length * 0.965)] || low + 1;
      for (let index = 0; index < logs.length; index += 1) {
        const normalized = model.clamp((logs[index] - low) / Math.max(1e-9, high - low), 0, 1);
        const band = Math.floor(normalized * 11) / 10;
        const [red, green, blue] = bandColor(band);
        const offset = index * 4;
        image.data[offset] = red;
        image.data[offset + 1] = green;
        image.data[offset + 2] = blue;
        image.data[offset + 3] = Math.round((0.12 + band * 0.64) * 255);
      }
      off.putImageData(image, 0, 0);
      context.save();
      context.imageSmoothingEnabled = true;
      context.globalCompositeOperation = 'screen';
      context.drawImage(offscreen, 0, 0, width, height);
      context.restore();
    }

    function worldFromSample(x, y, sampleWidth, sampleHeight, depth) {
      const zoom = Number($('exo-cluster-camera-zoom')?.value || 100) / 100;
      const extent = state.scene.maxRadius * 1.18 / Math.max(0.35, zoom);
      const pixelScaleX = canvas.width / sampleWidth;
      const pixelScaleY = canvas.height / sampleHeight;
      const screenX = ((x + 0.5) * pixelScaleX - canvas.width / 2 - state.panX * deviceScale()) / (canvas.width / 2);
      const screenY = ((y + 0.5) * pixelScaleY - canvas.height / 2 - state.panY * deviceScale()) / (canvas.height / 2);
      return inverseRotate({x:screenX * extent, y:screenY * extent, z:depth * state.scene.maxRadius});
    }

    function gravityMagnitude(point) {
      let gx = 0;
      let gy = 0;
      let gz = 0;
      for (const item of state.sources) {
        const dx = item.position.x - point.x;
        const dy = item.position.y - point.y;
        const dz = item.position.z - point.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz + item.softening * item.softening;
        const distance = Math.sqrt(distanceSquared);
        const scalar = item.weight / (distanceSquared * Math.max(1, distance));
        gx += dx * scalar;
        gy += dy * scalar;
        gz += dz * scalar;
      }
      return Math.hypot(gx, gy, gz) * state.scene.maxRadius * state.scene.maxRadius;
    }

    function bandColor(value) {
      const stops = [
        [0.00, 12, 24, 52],
        [0.18, 20, 72, 118],
        [0.36, 35, 142, 176],
        [0.54, 103, 202, 176],
        [0.70, 226, 211, 94],
        [0.84, 238, 137, 62],
        [1.00, 255, 235, 199]
      ];
      for (let index = 1; index < stops.length; index += 1) {
        if (value <= stops[index][0]) {
          const left = stops[index - 1];
          const right = stops[index];
          const t = (value - left[0]) / Math.max(1e-9, right[0] - left[0]);
          return [
            Math.round(left[1] + (right[1] - left[1]) * t),
            Math.round(left[2] + (right[2] - left[2]) * t),
            Math.round(left[3] + (right[3] - left[3]) * t)
          ];
        }
      }
      return stops.at(-1).slice(1);
    }

    function drawStarfield(width, height) {
      const rng = model.randomFor(`${clusterSeed?.value || 'cluster'}:gravity-band-stars`);
      context.fillStyle = 'rgba(255,255,255,.58)';
      for (let index = 0; index < 150; index += 1) {
        context.globalAlpha = 0.1 + rng() * 0.34;
        context.beginPath();
        context.arc(rng() * width, rng() * height, 0.3 + rng(), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function drawNebulae(width, height) {
      for (const item of state.scene.nebulae || []) {
        const projected = project(item.position, width, height);
        const edge = project({x:item.position.x + (item.radius?.x || state.scene.maxRadius * 0.05), y:item.position.y, z:item.position.z}, width, height);
        const radius = Math.max(16, Math.hypot(edge.x - projected.x, edge.y - projected.y));
        const gradient = context.createRadialGradient(projected.x, projected.y, 0, projected.x, projected.y, radius);
        gradient.addColorStop(0, `hsla(${item.hue || 205},70%,66%,.16)`);
        gradient.addColorStop(1, `hsla(${item.hue || 205},60%,35%,0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function drawMasses(width, height) {
      for (const object of [...(state.scene.protostars || []), ...(state.scene.darkMasses || [])]) {
        const projected = project(object.position, width, height);
        const color = object.category === 'protostar' ? '#ff9d5d' : '#a7a39b';
        const radius = (object.category === 'protostar' ? 4.8 : 3.2) * projected.perspective * deviceScale();
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 8;
        context.fill();
        context.shadowBlur = 0;
      }
    }

    function drawSystems(width, height) {
      const selected = systemSeed?.value.trim();
      const objects = state.scene.entries
        .map(object => ({object, projected:project(object.position, width, height)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);
      for (const {object, projected} of objects) {
        const radius = (object.populated ? 6 : 4.8) * projected.perspective * deviceScale();
        const isSelected = object.seed === selected;
        context.beginPath();
        context.arc(projected.x, projected.y, isSelected ? radius * 2.6 : radius * 1.9, 0, Math.PI * 2);
        context.strokeStyle = isSelected ? '#fff1c7' : object.populated ? 'rgba(114,214,154,.72)' : 'rgba(217,168,79,.62)';
        context.lineWidth = isSelected ? 2.2 * deviceScale() : 1.1 * deviceScale();
        context.stroke();
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = object.populated ? '#72d69a' : '#d9a84f';
        context.shadowColor = context.fillStyle;
        context.shadowBlur = 8;
        context.fill();
        context.shadowBlur = 0;
        outlinedText(object.name, projected.x + radius + 7, projected.y - radius - 3, '#f0e8dc', 11.5 * deviceScale());
        state.hitTargets.push({object, x:projected.x, y:projected.y, radius:radius * 1.9, depth:projected.depth});
      }
    }

    function drawLegend(width, height) {
      const ratio = deviceScale();
      const x = 18 * ratio;
      const y = 22 * ratio;
      outlinedText('GRAVITY GRADIENT BANDS', x, y, '#d9eef3', 11 * ratio, true);
      const colors = ['#0c1834','#144876','#238eb0','#67cab0','#e2d35e','#ee893e','#ffebc7'];
      const cell = 22 * ratio;
      colors.forEach((color, index) => {
        context.fillStyle = color;
        context.globalAlpha = 0.82;
        context.fillRect(x + index * cell, y + 10 * ratio, cell, 8 * ratio);
      });
      context.globalAlpha = 1;
      outlinedText('weaker', x, y + 33 * ratio, '#aab8bd', 9 * ratio);
      outlinedText('stronger', x + colors.length * cell - 38 * ratio, y + 33 * ratio, '#f0d6b9', 9 * ratio);
      outlinedText('Discrete bands show field magnitude across three camera-depth slices', 18 * ratio, height - 18 * ratio, '#9ec8d3', 10 * ratio);
    }

    function drawAxes(width, height) {
      const origin = {x:52 * deviceScale(), y:height - 48 * deviceScale()};
      for (const [label, color, vector] of [
        ['X','#d9a84f',{x:30,y:0,z:0}],
        ['Y','#72d69a',{x:0,y:30,z:0}],
        ['Z','#b885ff',{x:0,y:0,z:30}]
      ]) {
        const rotated = rotate(vector);
        const end = {x:origin.x + rotated.x * deviceScale(), y:origin.y + rotated.y * deviceScale()};
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = 1.3 * deviceScale();
        context.moveTo(origin.x, origin.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        outlinedText(label, end.x + 4, end.y + 4, color, 9 * deviceScale(), true);
      }
    }

    function project(point, width, height) {
      const rotated = rotate(point);
      const perspective = 1 / Math.max(0.46, 1 + rotated.z / Math.max(1, state.scene.maxRadius) * 0.25);
      const zoom = Number($('exo-cluster-camera-zoom')?.value || 100) / 100;
      const scale = Math.min(width, height) * 0.42 * zoom / Math.max(1, state.scene.maxRadius);
      return {
        x:width / 2 + state.panX * deviceScale() + rotated.x * scale * perspective,
        y:height / 2 + state.panY * deviceScale() + rotated.y * scale * perspective,
        depth:rotated.z,
        perspective
      };
    }

    function rotate(point) {
      const yaw = Number($('exo-cluster-camera-yaw')?.value || -24) * Math.PI / 180;
      const pitch = Number($('exo-cluster-camera-pitch')?.value || 52) * Math.PI / 180;
      const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
      const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
      return {
        x:x1,
        y:point.y * Math.cos(pitch) - z1 * Math.sin(pitch),
        z:point.y * Math.sin(pitch) + z1 * Math.cos(pitch)
      };
    }

    function inverseRotate(point) {
      const yaw = Number($('exo-cluster-camera-yaw')?.value || -24) * Math.PI / 180;
      const pitch = Number($('exo-cluster-camera-pitch')?.value || 52) * Math.PI / 180;
      const y = point.y * Math.cos(pitch) + point.z * Math.sin(pitch);
      const z1 = -point.y * Math.sin(pitch) + point.z * Math.cos(pitch);
      return {
        x:point.x * Math.cos(yaw) + z1 * Math.sin(yaw),
        y,
        z:-point.x * Math.sin(yaw) + z1 * Math.cos(yaw)
      };
    }

    function beginDrag(event) {
      state.drag = {
        pointerId:event.pointerId,
        x:event.clientX,
        y:event.clientY,
        yaw:Number($('exo-cluster-camera-yaw')?.value || -24),
        pitch:Number($('exo-cluster-camera-pitch')?.value || 52),
        panX:state.panX,
        panY:state.panY,
        pan:event.shiftKey || event.button === 1
      };
      state.moved = false;
      canvas.setPointerCapture(event.pointerId);
    }

    function continueDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.drag.x;
      const dy = event.clientY - state.drag.y;
      if (Math.hypot(dx, dy) > 3) state.moved = true;
      if (state.drag.pan) {
        state.panX = state.drag.panX + dx;
        state.panY = state.drag.panY + dy;
      } else {
        const yaw = $('exo-cluster-camera-yaw');
        const pitch = $('exo-cluster-camera-pitch');
        if (yaw) yaw.value = String(Math.round(normalizeDegrees(state.drag.yaw + dx * 0.42)));
        if (pitch) pitch.value = String(Math.round(model.clamp(state.drag.pitch - dy * 0.3, 5, 88)));
      }
      scheduleRender();
    }

    function endDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      canvas.releasePointerCapture?.(event.pointerId);
      state.drag = null;
    }

    function activateTarget(event) {
      if (state.moved) {
        state.moved = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;
      const target = [...state.hitTargets]
        .sort((a, b) => b.depth - a.depth)
        .find(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 8);
      target?.object?.open?.click();
    }

    function outlinedText(text, x, y, color, size, bold = false) {
      context.font = `${bold ? 800 : 650} ${size}px system-ui`;
      context.lineWidth = Math.max(2, size * 0.23);
      context.strokeStyle = 'rgba(0,0,0,.88)';
      context.strokeText(text, x, y);
      context.fillStyle = color;
      context.fillText(text, x, y);
    }

    function normalizeDegrees(value) {
      let result = value % 360;
      if (result > 180) result -= 360;
      if (result < -180) result += 360;
      return result;
    }

    function deviceScale() {
      return Math.min(2, window.devicePixelRatio || 1);
    }

    rebuild();
  }

  waitForDependencies();
})();
