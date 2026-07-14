(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function waitForCluster(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const canvas = $('exo-cluster-volume-canvas-v2');
    const shell = canvas?.closest('.exo-cluster-map-shell');
    const grid = $('exo-cluster-grid');
    const routes = $('exo-cluster-volume-routes');
    const gravity = $('exo-cluster-volume-gravity');
    if (!model || !canvas || !shell || !grid || !routes || !gravity) {
      if (attempt < 360) requestAnimationFrame(() => waitForCluster(attempt + 1));
      return;
    }
    initialize({model, canvas, shell, grid, routes, gravity});
  }

  function initialize({model, canvas, shell, grid, routes, gravity}) {
    if ($('exo-cluster-lensing-plane-overlay')) return;

    let mode = 'routes';
    let scene = null;
    let renderQueued = false;
    let rebuildQueued = false;

    shell.classList.add('exo-cluster-field-clarified');
    const overlay = document.createElement('canvas');
    overlay.id = 'exo-cluster-lensing-plane-overlay';
    overlay.className = 'exo-cluster-lensing-plane-overlay';
    overlay.setAttribute('aria-label', 'Three-dimensional mass-pair gravitational lensing axes');
    overlay.setAttribute('aria-hidden', 'true');
    canvas.insertAdjacentElement('afterend', overlay);
    const context = overlay.getContext('2d');

    const key = document.createElement('p');
    key.id = 'exo-cluster-field-key';
    key.className = 'exo-cluster-field-key';
    key.textContent = 'Route mode: neutral dashed links are navigation topology. Gravity mode: cyan axes are mass-pair lensing connections; violet points are merged selectable nodes.';
    overlay.insertAdjacentElement('afterend', key);

    clarifyExistingCanvas(canvas, () => mode);

    routes.addEventListener('click', () => {
      mode = 'routes';
      overlay.setAttribute('aria-hidden', 'true');
      key.dataset.mode = 'routes';
      scheduleRender();
    });
    gravity.addEventListener('click', () => {
      mode = 'gravity';
      overlay.setAttribute('aria-hidden', 'false');
      key.dataset.mode = 'gravity';
      scheduleRebuild();
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      overlay.width = Math.round(width * ratio);
      overlay.height = Math.round(height * ratio);
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      alignOverlay();
      scheduleRender();
    };

    function alignOverlay() {
      overlay.style.left = `${canvas.offsetLeft}px`;
      overlay.style.top = `${canvas.offsetTop}px`;
    }

    new ResizeObserver(resize).observe(canvas);
    new MutationObserver(scheduleRebuild).observe(grid, {childList:true});
    $('exo-cluster-seed')?.addEventListener('change', scheduleRebuild);
    $('exo-seed-input')?.addEventListener('change', scheduleRender);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    ['exo-cluster-camera-yaw','exo-cluster-camera-pitch','exo-cluster-camera-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));
    $('exo-cluster-camera-reset')?.addEventListener('click', scheduleRender);
    window.addEventListener('resize', alignOverlay);

    function scheduleRebuild() {
      if (rebuildQueued) return;
      rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        rebuildQueued = false;
        rebuild();
      }));
    }

    function rebuild() {
      const entries = [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        const fullMass = Number(card.dataset.systemMass);
        const stellarMass = Number(card.dataset.stellarMass);
        return {
          seed: card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name: card.dataset.catalogName || card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass: Number.isFinite(fullMass) && fullMass > 0
            ? fullMass
            : Number.isFinite(stellarMass) && stellarMass > 0
              ? stellarMass
              : model.stellarMass(star),
          populated: card.classList.contains('is-populated')
        };
      });
      scene = entries.length
        ? model.buildScene(entries, $('exo-cluster-seed')?.value.trim() || 'cluster', {mergeRadiusAu:1000})
        : null;
      scheduleRender();
    }

    function scheduleRender() {
      if (renderQueued) return;
      renderQueued = true;
      requestAnimationFrame(render);
    }

    function render() {
      renderQueued = false;
      alignOverlay();
      context.clearRect(0, 0, overlay.width, overlay.height);
      if (mode !== 'gravity' || !scene) return;

      const connections = [];
      for (const node of scene.lensingNodes || []) {
        for (const connection of node.connections || []) {
          if (!connection.fromPosition || !connection.toPosition) continue;
          connections.push({node, connection});
        }
      }

      connections.sort((left, right) => {
        const leftDepth = rotate(left.node.position).z;
        const rightDepth = rotate(right.node.position).z;
        return leftDepth - rightDepth;
      });

      for (const {node, connection} of connections) {
        const from = project(connection.fromPosition);
        const balance = project(node.position);
        const to = project(connection.toPosition);
        const strength = Math.max(0.2, Number(node.strength) || 0.2);
        const anomaly = node.anomaly || connection.kind === 'anomaly';
        const outerWidth = (2.8 + Math.min(5.5, Math.sqrt(strength) * 2.2)) * deviceScale();
        const innerWidth = (0.75 + Math.min(1.8, Math.sqrt(strength) * 0.5)) * deviceScale();
        const outer = anomaly ? 'rgba(255,127,168,.075)' : 'rgba(77,190,226,.075)';
        const inner = anomaly ? 'rgba(255,151,185,.58)' : 'rgba(111,211,238,.54)';

        drawSegment(from, balance, outer, outerWidth);
        drawSegment(balance, to, outer, outerWidth);
        drawSegment(from, balance, inner, innerWidth);
        drawSegment(balance, to, inner, innerWidth);

        context.beginPath();
        context.arc(balance.x, balance.y, (1.6 + Math.min(2.8, strength * 0.45)) * deviceScale(), 0, Math.PI * 2);
        context.fillStyle = anomaly ? 'rgba(255,151,185,.82)' : 'rgba(119,218,242,.78)';
        context.fill();
      }

      context.save();
      context.font = `800 ${11 * deviceScale()}px system-ui`;
      context.fillStyle = 'rgba(157,225,242,.92)';
      context.shadowColor = '#020202';
      context.shadowBlur = 5;
      context.fillText('CYAN: MASS-PAIR LENSING AXES', 18 * deviceScale(), 27 * deviceScale());
      context.restore();
    }

    function project(point) {
      const rotated = rotate(point);
      const perspective = 1 / Math.max(0.58, 1 + rotated.z / Math.max(1, scene.maxRadius) * 0.24);
      const zoom = Number($('exo-cluster-camera-zoom')?.value || 100) / 100;
      const scale = Math.min(overlay.width, overlay.height) * 0.42 * zoom / Math.max(1, scene.maxRadius);
      return {
        x: overlay.width / 2 + rotated.x * scale * perspective,
        y: overlay.height / 2 + rotated.y * scale * perspective,
        depth: rotated.z
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

    function drawSegment(from, to, color, width) {
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = 'round';
      context.stroke();
    }

    resize();
    rebuild();
  }

  function clarifyExistingCanvas(canvas, mode) {
    const context = canvas.getContext('2d');
    if (!context || context.__blacklightFieldClarified) return;
    context.__blacklightFieldClarified = true;

    const stroke = context.stroke.bind(context);
    context.stroke = function(...args) {
      const style = normalize(this.strokeStyle);
      if (mode() === 'routes' && style === 'rgba(126,179,207,0.52)') {
        const original = this.strokeStyle;
        this.strokeStyle = 'rgba(194,184,166,.50)';
        stroke(...args);
        this.strokeStyle = original;
        return;
      }
      stroke(...args);
    };

    const fill = context.fill.bind(context);
    context.fill = function(...args) {
      const style = normalize(this.fillStyle);
      if (style === '#8aa0ad') {
        const original = this.fillStyle;
        this.fillStyle = '#a7a39b';
        fill(...args);
        this.fillStyle = original;
        return;
      }
      fill(...args);
    };

    const fillText = context.fillText.bind(context);
    context.fillText = function(...args) {
      const style = normalize(this.fillStyle);
      if (mode() === 'routes' && style === '#a9d8ec') {
        const original = this.fillStyle;
        this.fillStyle = '#d5cbbb';
        fillText(...args);
        this.fillStyle = original;
        return;
      }
      fillText(...args);
    };
  }

  function normalize(value) {
    return String(value).toLowerCase().replace(/\s+/g, '');
  }

  function deviceScale() {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  waitForCluster();
})();
