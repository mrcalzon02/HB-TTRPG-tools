(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const MIN_ZOOM = 10;
  const MAX_ZOOM = 50000;
  const Layout = globalThis.BlacklightExoOrbitalLayout;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function wait(attempt = 0) {
    const stage = document.querySelector('.exo-orbit-stage');
    const sourceSvg = $('exo-orbit-svg');
    const oldCanvas = $('exo-orbit-canvas-3d');
    const oldControls = $('exo-spatial-controls');
    if (!stage || !sourceSvg || !oldCanvas || !oldControls || !Layout || !globalThis.BlacklightExoGetActiveSystem) {
      if (attempt < 480) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }
    initialize({stage, sourceSvg, oldCanvas, oldControls});
  }

  function initialize({stage, sourceSvg, oldCanvas, oldControls}) {
    if ($('exo-exclusive-view-controls')) return;
    oldControls.hidden = true;
    oldCanvas.hidden = true;
    oldCanvas.width = 1;
    oldCanvas.height = 1;
    oldCanvas.style.pointerEvents = 'none';

    const state = {
      view:'flat',
      targetYaw:-24, displayYaw:-24,
      targetPitch:58, displayPitch:58,
      targetZoom:1, displayZoom:1,
      selectedId:'star', system:null, layout:null,
      canvas:null, context:null, flatOverlay:null,
      width:1, height:1, hitTargets:[], screenPositions:new Map(),
      previousTimestamp:performance.now(), lastDraw:0
    };

    createControls();
    createCanvas();
    createFlatOverlay();
    bind();
    rebuild();
    applyView();
    requestAnimationFrame(render);

    function createControls() {
      const panel = document.createElement('section');
      panel.id = 'exo-exclusive-view-controls';
      panel.className = 'exo-exclusive-view-controls';
      panel.setAttribute('aria-label', 'Projection view and overlay controls');
      panel.innerHTML = `
        <div class="exo-view-control-heading">
          <div><span>Projection display</span><strong>Choose one viewing plane</strong></div>
          <output id="exo-exclusive-view-readout">Flat orbital projection</output>
        </div>
        <div class="exo-view-switch" role="group" aria-label="Projection view">
          <button id="exo-view-flat" class="bli-action is-active" type="button" aria-pressed="true">Flat Projection</button>
          <button id="exo-view-3d" class="bli-action" type="button" aria-pressed="false">3D Projection</button>
          <button id="exo-system-camera-reset" class="bli-action" type="button">Reset Viewport</button>
        </div>
        <fieldset class="exo-overlay-controls">
          <legend>Display overlays</legend>
          <label><input id="exo-overlay-habitable" type="checkbox" checked> Habitable zone</label>
          <label><input id="exo-overlay-lensing" type="checkbox"> Gravitational lensing nodes</label>
          <label><input id="exo-overlay-limits" type="checkbox"> Dalton–Zirconf outer limit</label>
        </fieldset>
        <div id="exo-camera-controls" class="exo-camera-controls" hidden>
          <label><span>Camera yaw</span><input id="exo-exclusive-yaw" type="range" min="-180" max="180" value="-24"></label>
          <label><span>Camera pitch</span><input id="exo-exclusive-pitch" type="range" min="10" max="88" value="58"></label>
          <label><span>Spatial zoom</span><input id="exo-exclusive-zoom" type="range" min="${MIN_ZOOM}" max="${MAX_ZOOM}" step="1" value="100"></label>
        </div>
        <p class="exo-orbit-architecture-note">Planetary corridors and parent-specific satellite envelopes are shared by Flat and 3D views. Physical source distances remain unchanged.</p>`;
      document.querySelector('.exo-orbital-panel')?.insertBefore(panel, stage);
    }

    function createCanvas() {
      const canvas = document.createElement('canvas');
      canvas.id = 'exo-exclusive-canvas-3d';
      canvas.className = 'exo-exclusive-canvas-3d';
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', 'Selectable three-dimensional orbital projection using shared planetary corridors');
      stage.append(canvas);
      state.canvas = canvas;
      state.context = canvas.getContext('2d');
      new ResizeObserver(resize).observe(stage);
      resize();
    }

    function createFlatOverlay() {
      const overlay = document.createElementNS(SVG, 'svg');
      overlay.id = 'exo-flat-spatial-overlays';
      overlay.setAttribute('viewBox', '0 0 1000 1000');
      overlay.setAttribute('aria-label', 'Flat-projection spatial overlays');
      overlay.setAttribute('pointer-events', 'none');
      stage.append(overlay);
      state.flatOverlay = overlay;
    }

    function bind() {
      $('exo-view-flat')?.addEventListener('click', () => setView('flat'));
      $('exo-view-3d')?.addEventListener('click', () => setView('3d'));
      $('exo-system-camera-reset')?.addEventListener('click', resetCamera);
      $('exo-exclusive-yaw')?.addEventListener('input', event => { state.targetYaw = finite(event.target.value, -24); });
      $('exo-exclusive-pitch')?.addEventListener('input', event => { state.targetPitch = finite(event.target.value, 58); });
      $('exo-exclusive-zoom')?.addEventListener('input', event => {
        state.targetZoom = clamp(finite(event.target.value, 100) / 100, MIN_ZOOM / 100, MAX_ZOOM / 100);
        rebuildLayout();
      });
      $('exo-orbital-table-body')?.addEventListener('click', () => queueMicrotask(readSelection));
      document.addEventListener('blacklight:system-rendered', rebuild);
      document.addEventListener('blacklight:object-selected', event => {
        state.selectedId = event.detail?.id || 'star';
        rebuildLayout();
      });
      document.addEventListener('blacklight:orbital-layout-changed', () => rebuildLayout());
      state.canvas.addEventListener('click', event => {
        if (state.view !== '3d') return;
        const rect = state.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * state.canvas.width / Math.max(1, rect.width);
        const y = (event.clientY - rect.top) * state.canvas.height / Math.max(1, rect.height);
        const target = [...state.hitTargets]
          .filter(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 8)
          .sort((left, right) => left.distance - right.distance || right.depth - left.depth)[0];
        if (target) globalThis.BlacklightExoSelectObject?.(target.id);
      });
    }

    function rebuild() {
      state.system = globalThis.BlacklightExoGetActiveSystem?.() || null;
      state.screenPositions.clear();
      readSelection();
      rebuildLayout();
    }

    function rebuildLayout() {
      if (!state.system) return;
      state.layout = Layout.compute(state.system, {
        zoomPercent:state.targetZoom * 100,
        focusedId:state.selectedId
      });
    }

    function readSelection() {
      const selected = $('exo-orbital-table-body')?.querySelector('tr[aria-selected="true"]');
      state.selectedId = selected?.dataset.objectId || 'star';
      rebuildLayout();
    }

    function setView(view) {
      state.view = view === '3d' ? '3d' : 'flat';
      applyView();
    }

    function applyView() {
      const flat = state.view === 'flat';
      stage.classList.toggle('exo-exclusive-flat', flat);
      stage.classList.toggle('exo-exclusive-3d', !flat);
      sourceSvg.setAttribute('aria-hidden', String(!flat));
      state.canvas.setAttribute('aria-hidden', String(flat));
      state.flatOverlay.setAttribute('aria-hidden', String(!flat));
      $('exo-view-flat')?.classList.toggle('is-active', flat);
      $('exo-view-3d')?.classList.toggle('is-active', !flat);
      $('exo-view-flat')?.setAttribute('aria-pressed', String(flat));
      $('exo-view-3d')?.setAttribute('aria-pressed', String(!flat));
      if ($('exo-camera-controls')) $('exo-camera-controls').hidden = flat;
      if ($('exo-exclusive-view-readout')) $('exo-exclusive-view-readout').textContent = flat ? 'Flat orbital projection' : 'Three-dimensional orbital projection';
    }

    function resetCamera() {
      state.targetYaw = -24;
      state.targetPitch = 58;
      state.targetZoom = 1;
      if ($('exo-exclusive-yaw')) $('exo-exclusive-yaw').value = '-24';
      if ($('exo-exclusive-pitch')) $('exo-exclusive-pitch').value = '58';
      if ($('exo-exclusive-zoom')) $('exo-exclusive-zoom').value = '100';
      rebuildLayout();
    }

    function resize() {
      const ratio = Math.min(1.25, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      state.width = Math.round(width * ratio);
      state.height = Math.round(height * ratio);
      state.canvas.width = state.width;
      state.canvas.height = state.height;
      state.canvas.style.width = `${width}px`;
      state.canvas.style.height = `${height}px`;
    }

    function render(timestamp) {
      const elapsed = Math.min(.1, Math.max(0, (timestamp - state.previousTimestamp) / 1000));
      state.previousTimestamp = timestamp;
      const alpha = 1 - Math.exp(-elapsed * 10);
      state.displayYaw = tweenAngle(state.displayYaw, state.targetYaw, alpha);
      state.displayPitch += (state.targetPitch - state.displayPitch) * alpha;
      state.displayZoom += (state.targetZoom - state.displayZoom) * alpha;
      globalThis.BlacklightExoCameraState = {yaw:state.displayYaw * Math.PI / 180,pitch:state.displayPitch * Math.PI / 180,zoom:state.displayZoom};
      if (state.view === '3d' && timestamp - state.lastDraw >= 33) {
        state.lastDraw = timestamp;
        draw(elapsed);
      }
      requestAnimationFrame(render);
    }

    function draw(elapsed) {
      const context = state.context;
      if (!context || !state.system || !state.layout) return;
      const width = state.canvas.width, height = state.canvas.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#020202';
      context.fillRect(0, 0, width, height);
      drawStarfield(context, width, height, state.system.seed);

      const scale = Math.min(width, height) / 1000 * state.displayZoom;
      const epoch = finite(globalThis.BlacklightExoGetProjectionEpochDays?.() ?? globalThis.BlacklightExoProjectionEpochDays, 0);
      if ($('exo-overlay-habitable')?.checked !== false) drawHabitable(context, width, height, scale);

      const bodies = [];
      for (const body of state.system.planets || []) {
        const bodyRadius = state.layout.bodyRadii.get(body.id) || 100;
        const elements = elementsFor(body);
        drawOrbit(context, bodyRadius, elements, width, height, scale, body.kind === 'dwarf-planet');
        const anomaly = elements.phase + epoch / Math.max(.01, finite(body.periodDays, 1)) * TAU;
        const model = orbitPoint(bodyRadius, elements, anomaly);
        const projected = tweenScreen(body.id, project(model, width, height, scale), elapsed);
        bodies.push({...projected,id:body.id,name:body.name,color:body.color||'#8eb397',size:bodySize(body,projected.perspective),kind:body.kind,label:true});

        const parentLayout = state.layout.bodyLayouts.get(body.id);
        if (parentLayout?.dense && !parentLayout.parentFocused) drawSatelliteBand(context, model, parentLayout.satelliteEnvelope, width, height, scale);
        for (const moon of body.moons || []) {
          const moonLayout = state.layout.moonLayouts.get(moon.id);
          if (!moonLayout) continue;
          const moonElements = elementsFor(moon);
          const moonAnomaly = moonElements.phase + epoch / Math.max(.01, finite(moon.periodDays, 1)) * TAU;
          const relative = orbitPoint(moonLayout.displayRadius, moonElements, moonAnomaly);
          const moonModel = {x:model.x+relative.x,y:model.y+relative.y,z:model.z+relative.z};
          const moonProjected = tweenScreen(moon.id, project(moonModel, width, height, scale), elapsed);
          if (moonLayout.orbitVisible) drawMoonOrbit(context, model, moonLayout.displayRadius, moonElements, width, height, scale, moon.id === state.selectedId);
          bodies.push({...moonProjected,id:moon.id,name:moon.name,color:moon.color||'#a7adb2',size:Math.max(1.15,2.5*moonProjected.perspective),kind:'moon',label:moonLayout.labelVisible,opacity:moonLayout.pointOpacity});
        }
      }

      bodies.sort((left, right) => left.z - right.z);
      state.hitTargets = [];
      for (const body of bodies) {
        if (body.x < -30 || body.y < -30 || body.x > width + 30 || body.y > height + 30) continue;
        context.globalAlpha = body.opacity ?? 1;
        context.beginPath();
        context.arc(body.x, body.y, body.size, 0, TAU);
        context.fillStyle = body.color;
        context.shadowColor = body.color;
        context.shadowBlur = body.kind === 'moon' ? 1 : 3;
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
        if (body.id === state.selectedId) {
          context.beginPath();context.arc(body.x,body.y,body.size+5,0,TAU);context.strokeStyle='#f0bd58';context.lineWidth=2;context.stroke();
        }
        if (body.label || body.id === state.selectedId) {
          context.fillStyle='rgba(244,239,229,.92)';context.font=`${Math.max(9,11*body.perspective)}px system-ui`;context.fillText(body.name,body.x+body.size+4,body.y-3);
        }
        state.hitTargets.push({id:body.id,x:body.x,y:body.y,radius:Math.max(4,body.size),depth:body.z,distance:Math.hypot(body.x-width/2,body.y-height/2)});
      }
      drawStar(context,width,height,scale);
    }

    function drawHabitable(context,width,height,scale) {
      const inner = state.layout.mapDistance(state.system.star.hzInner);
      const outer = state.layout.mapDistance(state.system.star.hzOuter);
      for (const radius of [inner, outer]) drawOrbit(context,radius,{eccentricity:0,inclination:0,ascendingNode:0,periapsis:0,phase:0},width,height,scale,false,'rgba(82,194,123,.34)',[4,5]);
    }

    function drawSatelliteBand(context,parentModel,radius,width,height,scale) {
      const points=[];
      for(let step=0;step<64;step+=1){const angle=step/64*TAU,relative={x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,z:0};points.push(project({x:parentModel.x+relative.x,y:parentModel.y+relative.y,z:parentModel.z},width,height,scale));}
      path(context,points,'rgba(117,183,207,.14)',[2,5],2);
    }

    function drawOrbit(context,radius,elements,width,height,scale,dwarf=false,stroke=null,dash=null) {
      const points=[];
      for(let step=0;step<96;step+=1)points.push(project(orbitPoint(radius,elements,step/96*TAU),width,height,scale));
      path(context,points,stroke||(dwarf?'rgba(162,188,207,.28)':'rgba(217,168,79,.23)'),dash||(dwarf?[5,5]:[]),1);
    }

    function drawMoonOrbit(context,parentModel,radius,elements,width,height,scale,selected) {
      const points=[];
      for(let step=0;step<48;step+=1){const relative=orbitPoint(radius,elements,step/48*TAU);points.push(project({x:parentModel.x+relative.x,y:parentModel.y+relative.y,z:parentModel.z+relative.z},width,height,scale));}
      path(context,points,selected?'rgba(239,190,88,.7)':'rgba(199,210,220,.28)',selected?[]:[3,4],selected?1.4:.7);
    }

    function path(context,points,stroke,dash=[],lineWidth=1) {
      if (!points.length) return;
      context.beginPath();context.moveTo(points[0].x,points[0].y);for(let index=1;index<points.length;index+=1)context.lineTo(points[index].x,points[index].y);context.closePath();context.strokeStyle=stroke;context.lineWidth=lineWidth;context.setLineDash(dash);context.stroke();context.setLineDash([]);
    }

    function elementsFor(object) {
      const published=String(object.provenance||'').startsWith('published');
      if(published)return{eccentricity:finite(object.eccentricity),inclination:finite(object.inclination)*Math.PI/180,ascendingNode:finite(object.ascendingNode)*Math.PI/180,periapsis:finite(object.argumentOfPeriapsis)*Math.PI/180,phase:finite(object.phase),verticalWarp:0};
      const rng=randomFor(`${state.system?.seed}:${object.id}:orbital-elements`);
      return{eccentricity:finite(object.eccentricity,rng()*.18),inclination:finite(object.inclination,rng()*10)*Math.PI/180,ascendingNode:finite(object.ascendingNode,rng()*360)*Math.PI/180,periapsis:finite(object.argumentOfPeriapsis,rng()*360)*Math.PI/180,phase:finite(object.phase,rng()*TAU),verticalWarp:(rng()-.5)*.015};
    }

    function orbitPoint(radius,elements,angle) {
      const eccentricity=clamp(Math.abs(elements.eccentricity||0),0,.85);
      const orbitalRadius=radius*(1-eccentricity*eccentricity)/Math.max(.15,1+eccentricity*Math.cos(angle));
      let x=orbitalRadius*Math.cos(angle+elements.periapsis),y=orbitalRadius*Math.sin(angle+elements.periapsis);
      const ci=Math.cos(elements.inclination),si=Math.sin(elements.inclination),y1=y*ci,z1=y*si,cn=Math.cos(elements.ascendingNode),sn=Math.sin(elements.ascendingNode);
      return{x:x*cn-y1*sn,y:x*sn+y1*cn,z:z1+(elements.verticalWarp||0)*orbitalRadius*Math.sin(angle*3)};
    }

    function project(point,width,height,scale) {
      const yaw=state.displayYaw*Math.PI/180,pitch=state.displayPitch*Math.PI/180;
      const x1=point.x*Math.cos(yaw)-point.z*Math.sin(yaw),z1=point.x*Math.sin(yaw)+point.z*Math.cos(yaw),y2=point.y*Math.cos(pitch)-z1*Math.sin(pitch),z2=point.y*Math.sin(pitch)+z1*Math.cos(pitch);
      const perspective=clamp(1+z2/(Math.max(1,Math.abs(z2))+120),.62,1.42);
      return{x:width/2+x1*scale*perspective,y:height/2+y2*scale*perspective,z:z2,perspective};
    }

    function tweenScreen(id,target,elapsed) {
      const previous=state.screenPositions.get(id);
      if(!previous){state.screenPositions.set(id,{...target});return target;}
      const alpha=1-Math.exp(-elapsed*13),current={x:previous.x+(target.x-previous.x)*alpha,y:previous.y+(target.y-previous.y)*alpha,z:previous.z+(target.z-previous.z)*alpha,perspective:previous.perspective+(target.perspective-previous.perspective)*alpha};
      state.screenPositions.set(id,current);return current;
    }

    function drawStar(context,width,height,scale) {
      const star=project({x:0,y:0,z:0},width,height,scale),gradient=context.createRadialGradient(star.x,star.y,1,star.x,star.y,14);
      gradient.addColorStop(0,'#fff8d9');gradient.addColorStop(.32,'#ffd36b');gradient.addColorStop(1,'rgba(217,168,79,0)');context.fillStyle=gradient;context.beginPath();context.arc(star.x,star.y,14,0,TAU);context.fill();context.fillStyle='#ffd36b';context.beginPath();context.arc(star.x,star.y,4.2,0,TAU);context.fill();state.hitTargets.push({id:'star',x:star.x,y:star.y,radius:9,depth:star.z,distance:0});
    }

    function drawStarfield(context,width,height,seed) {const rng=randomFor(`${seed}:3d-starfield`);context.fillStyle='rgba(220,235,245,.58)';for(let index=0;index<90;index+=1){context.beginPath();context.arc(rng()*width,rng()*height,.25+rng()*1.05,0,TAU);context.fill();}}
    function bodySize(body,perspective){if(body.kind==='dwarf-planet')return Math.max(3.2,4.6*perspective);if(/Gas giant/.test(body.type))return Math.max(5.5,10*perspective);if(/Ice giant/.test(body.type))return Math.max(4.5,7.2*perspective);return Math.max(3.8,5.5*perspective);}
    function randomFor(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return()=>{state+=0x6D2B79F5;let x=state;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296;};}
    function tweenAngle(current,target,alpha){let delta=(target-current)%360;if(delta>180)delta-=360;if(delta<-180)delta+=360;return current+delta*alpha;}
  }

  wait();
})();
