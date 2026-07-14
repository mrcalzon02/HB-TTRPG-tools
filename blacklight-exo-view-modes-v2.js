(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

  function wait(attempt = 0) {
    const stage = document.querySelector('.exo-orbit-stage');
    const sourceSvg = $('exo-orbit-svg');
    const oldCanvas = $('exo-orbit-canvas-3d');
    const oldControls = $('exo-spatial-controls');
    if (!stage || !sourceSvg || !oldCanvas || !oldControls || !globalThis.BlacklightExoGetActiveSystem) {
      if (attempt < 480) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }
    initialize({stage,sourceSvg,oldCanvas,oldControls});
  }

  function initialize({stage,sourceSvg,oldCanvas,oldControls}) {
    if ($('exo-exclusive-view-controls')) return;
    oldControls.hidden = true;
    oldCanvas.hidden = true;
    oldCanvas.width = 1;
    oldCanvas.height = 1;
    oldCanvas.style.pointerEvents = 'none';

    const state = {
      view:'flat', yaw:-24, pitch:58, zoom:1, selectedId:'star',
      system:null, hitTargets:[], canvas:null, context:null, flatOverlay:null,
      width:1, height:1, lastFrame:0
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
      panel.setAttribute('aria-label','Projection view and overlay controls');
      panel.innerHTML = `
        <div class="exo-view-control-heading">
          <div><span>Projection display</span><strong>Choose one viewing plane</strong></div>
          <output id="exo-exclusive-view-readout">Flat orbital projection</output>
        </div>
        <div class="exo-view-switch" role="group" aria-label="Projection view">
          <button id="exo-view-flat" class="bli-action is-active" type="button" aria-pressed="true">Flat Projection</button>
          <button id="exo-view-3d" class="bli-action" type="button" aria-pressed="false">3D Projection</button>
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
          <label><span>Spatial zoom</span><input id="exo-exclusive-zoom" type="range" min="35" max="800" value="100"></label>
        </div>
        <p class="exo-orbit-architecture-note">Published orbital elements are used whenever present. Moon distances and body sizes are visually enlarged so the complete catalogue remains selectable.</p>`;
      document.querySelector('.exo-orbital-panel')?.insertBefore(panel,stage);
    }

    function createCanvas() {
      const canvas = document.createElement('canvas');
      canvas.id = 'exo-exclusive-canvas-3d';
      canvas.className = 'exo-exclusive-canvas-3d';
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label','Selectable three-dimensional orbital projection of the complete active system model');
      stage.append(canvas);
      state.canvas = canvas;
      state.context = canvas.getContext('2d');
      new ResizeObserver(resize).observe(stage);
      resize();
    }

    function createFlatOverlay() {
      const overlay = document.createElementNS(SVG_NS,'svg');
      overlay.id = 'exo-flat-spatial-overlays';
      overlay.setAttribute('viewBox','0 0 1000 1000');
      overlay.setAttribute('aria-label','Flat-projection spatial overlays');
      overlay.setAttribute('pointer-events','none');
      stage.append(overlay);
      state.flatOverlay = overlay;
    }

    function bind() {
      $('exo-view-flat')?.addEventListener('click',() => setView('flat'));
      $('exo-view-3d')?.addEventListener('click',() => setView('3d'));
      $('exo-exclusive-yaw')?.addEventListener('input',event => {state.yaw=Number(event.target.value);});
      $('exo-exclusive-pitch')?.addEventListener('input',event => {state.pitch=Number(event.target.value);});
      $('exo-exclusive-zoom')?.addEventListener('input',event => {state.zoom=Number(event.target.value)/100;});
      $('exo-orbital-table-body')?.addEventListener('click',() => queueMicrotask(readSelection));
      document.addEventListener('blacklight:system-rendered',rebuild);
      state.canvas.addEventListener('click',event => {
        if (state.view !== '3d') return;
        const rect = state.canvas.getBoundingClientRect();
        const x=(event.clientX-rect.left)*state.canvas.width/rect.width;
        const y=(event.clientY-rect.top)*state.canvas.height/rect.height;
        const target=[...state.hitTargets].sort((a,b)=>a.depth-b.depth)
          .find(item=>Math.hypot(item.x-x,item.y-y)<=item.radius+7);
        if (target?.id === 'star') document.querySelector('.exo-star-target')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        else rowFor(target?.id)?.querySelector('button')?.click();
      });
    }

    function rebuild() {
      state.system = globalThis.BlacklightExoGetActiveSystem?.() || null;
      readSelection();
    }

    function readSelection() {
      const selected=$('exo-orbital-table-body')?.querySelector('tr[aria-selected="true"]');
      state.selectedId=selected?.dataset.objectId||'star';
    }

    function setView(view) {
      state.view=view==='3d'?'3d':'flat';
      applyView();
    }

    function applyView() {
      const flat=state.view==='flat';
      stage.classList.toggle('exo-exclusive-flat',flat);
      stage.classList.toggle('exo-exclusive-3d',!flat);
      sourceSvg.setAttribute('aria-hidden',String(!flat));
      state.canvas.setAttribute('aria-hidden',String(flat));
      state.flatOverlay.setAttribute('aria-hidden',String(!flat));
      $('exo-view-flat')?.classList.toggle('is-active',flat);
      $('exo-view-3d')?.classList.toggle('is-active',!flat);
      $('exo-view-flat')?.setAttribute('aria-pressed',String(flat));
      $('exo-view-3d')?.setAttribute('aria-pressed',String(!flat));
      const camera=$('exo-camera-controls'); if(camera) camera.hidden=flat;
      const output=$('exo-exclusive-view-readout'); if(output) output.textContent=flat?'Flat orbital projection':'Three-dimensional orbital projection';
    }

    function resize() {
      const ratio=Math.min(1.25,window.devicePixelRatio||1);
      const width=Math.max(480,stage.clientWidth);
      const height=Math.max(420,stage.clientHeight);
      state.width=Math.round(width*ratio);
      state.height=Math.round(height*ratio);
      state.canvas.width=state.width;
      state.canvas.height=state.height;
      state.canvas.style.width=`${width}px`;
      state.canvas.style.height=`${height}px`;
    }

    function render(timestamp) {
      if (timestamp-state.lastFrame>=33) {
        state.lastFrame=timestamp;
        if(state.view==='3d') draw();
      }
      requestAnimationFrame(render);
    }

    function draw() {
      const context=state.context, system=state.system;
      if(!context||!system) return;
      const width=state.canvas.width,height=state.canvas.height;
      context.clearRect(0,0,width,height);
      context.fillStyle='#020202';context.fillRect(0,0,width,height);
      drawStarfield(context,width,height,system.seed);
      const outer=Math.max(1,...system.planets.map(body=>Number(body.distance)||0));
      const scale=Math.min(width,height)*.42/outer*state.zoom;
      const epoch=Number.parseFloat(($('exo-epoch')?.textContent||'').replace(/[^\d.-]/g,''))||0;
      if($('exo-overlay-habitable')?.checked!==false) drawHabitable(context,system,width,height,scale);
      const bodies=[];
      for(const body of system.planets){
        const elements=elementsFor(body);
        drawOrbit(context,body.distance,elements,width,height,scale,body.kind==='dwarf-planet');
        const anomaly=elements.phase+epoch/Math.max(.01,Number(body.periodDays)||1)*Math.PI*2;
        const model=orbitPoint(Number(body.distance)||0,elements,anomaly);
        const projected=project(model,width,height,scale);
        const parent={body,model,projected};
        bodies.push({...projected,id:body.id,name:body.name,color:body.color||'#8eb397',size:bodySize(body,projected.perspective),kind:body.kind});
        const moonRange=distanceRange(body.moons);
        for(const moon of body.moons){
          const moonElements=elementsFor(moon);
          const visualRadius=moonVisualAu(moon,moonRange,outer);
          const moonAnomaly=moonElements.phase+epoch/Math.max(.01,Number(moon.periodDays)||1)*Math.PI*2;
          const relative=orbitPoint(visualRadius,moonElements,moonAnomaly);
          const moonModel={x:model.x+relative.x,y:model.y+relative.y,z:model.z+relative.z};
          const moonProjected=project(moonModel,width,height,scale);
          if(moon.id===state.selectedId) drawMoonOrbit(context,parent,visualRadius,moonElements,width,height,scale);
          bodies.push({...moonProjected,id:moon.id,name:moon.name,color:moon.color||'#a7adb2',size:Math.max(1.4,2.8*moonProjected.perspective),kind:'moon'});
        }
      }
      bodies.sort((a,b)=>a.z-b.z);
      state.hitTargets=[];
      for(const body of bodies){
        context.beginPath();context.arc(body.x,body.y,body.size,0,Math.PI*2);
        context.fillStyle=body.color;context.shadowColor=body.color;context.shadowBlur=body.kind==='moon'?2:8;context.fill();context.shadowBlur=0;
        if(body.id===state.selectedId){context.beginPath();context.arc(body.x,body.y,body.size+5,0,Math.PI*2);context.strokeStyle='#f0bd58';context.lineWidth=2;context.stroke();}
        if(body.kind!=='moon'||body.id===state.selectedId){context.fillStyle='rgba(244,239,229,.9)';context.font=`${Math.max(10,12*body.perspective)}px system-ui`;context.fillText(body.name,body.x+body.size+5,body.y-4);}
        state.hitTargets.push({id:body.id,x:body.x,y:body.y,radius:Math.max(3,body.size),depth:body.z});
      }
      drawStar(context,width,height,scale);
    }

    function elementsFor(object) {
      const published=String(object.provenance||'').startsWith('published');
      if(published) return {
        eccentricity:number(object.eccentricity,0), inclination:number(object.inclination,0)*Math.PI/180,
        ascendingNode:number(object.ascendingNode,0)*Math.PI/180,
        periapsis:number(object.argumentOfPeriapsis,0)*Math.PI/180,
        phase:number(object.phase,0), verticalWarp:0
      };
      const rng=randomFor(`${state.system?.seed}:${object.id}:orbital-elements`);
      return {eccentricity:rng()*.2,inclination:rng()*.2,ascendingNode:rng()*Math.PI*2,periapsis:rng()*Math.PI*2,phase:number(object.phase,rng()*Math.PI*2),verticalWarp:(rng()-.5)*.02};
    }

    function orbitPoint(radius,elements,angle) {
      const e=clamp(Math.abs(elements.eccentricity||0),0,.85);
      const r=radius*(1-e*e)/Math.max(.15,1+e*Math.cos(angle));
      let x=r*Math.cos(angle+elements.periapsis), y=r*Math.sin(angle+elements.periapsis);
      const ci=Math.cos(elements.inclination),si=Math.sin(elements.inclination);
      const y1=y*ci,z1=y*si;
      const cn=Math.cos(elements.ascendingNode),sn=Math.sin(elements.ascendingNode);
      return {x:x*cn-y1*sn,y:x*sn+y1*cn,z:z1+(elements.verticalWarp||0)*r*Math.sin(angle*3)};
    }

    function project(point,width,height,scale) {
      const yaw=state.yaw*Math.PI/180,pitch=state.pitch*Math.PI/180;
      const x1=point.x*Math.cos(yaw)-point.z*Math.sin(yaw);
      const z1=point.x*Math.sin(yaw)+point.z*Math.cos(yaw);
      const y2=point.y*Math.cos(pitch)-z1*Math.sin(pitch);
      const z2=point.y*Math.sin(pitch)+z1*Math.cos(pitch);
      const perspective=clamp(1+z2/(Math.max(1,Math.abs(z2))+80),.55,1.5);
      return {x:width/2+x1*scale*perspective,y:height/2+y2*scale*perspective,z:z2,perspective};
    }

    function drawOrbit(context,radius,elements,width,height,scale,dwarf) {
      const points=[];
      for(let step=0;step<96;step++) points.push(project(orbitPoint(radius,elements,step/96*Math.PI*2),width,height,scale));
      path(context,points,dwarf?'rgba(162,188,207,.32)':'rgba(217,168,79,.25)',dwarf?[5,5]:[]);
    }

    function drawMoonOrbit(context,parent,radius,elements,width,height,scale) {
      const points=[];
      for(let step=0;step<48;step++){
        const rel=orbitPoint(radius,elements,step/48*Math.PI*2);
        points.push(project({x:parent.model.x+rel.x,y:parent.model.y+rel.y,z:parent.model.z+rel.z},width,height,scale));
      }
      path(context,points,'rgba(199,210,220,.42)',[3,4]);
    }

    function path(context,points,stroke,dash=[]) {
      if(!points.length)return;context.beginPath();context.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)context.lineTo(points[i].x,points[i].y);context.closePath();context.strokeStyle=stroke;context.lineWidth=1;context.setLineDash(dash);context.stroke();context.setLineDash([]);
    }

    function drawHabitable(context,system,width,height,scale) {
      for(const radius of [system.star.hzInner,system.star.hzOuter]){
        const points=[];const elements={eccentricity:0,inclination:0,ascendingNode:0,periapsis:0,verticalWarp:0};
        for(let step=0;step<80;step++)points.push(project(orbitPoint(radius,elements,step/80*Math.PI*2),width,height,scale));
        path(context,points,'rgba(82,194,123,.38)',[4,5]);
      }
    }

    function drawStar(context,width,height,scale) {
      const star=project({x:0,y:0,z:0},width,height,scale);
      const gradient=context.createRadialGradient(star.x,star.y,1,star.x,star.y,36);
      gradient.addColorStop(0,'#fff8d9');gradient.addColorStop(.28,'#ffd36b');gradient.addColorStop(1,'rgba(217,168,79,0)');
      context.fillStyle=gradient;context.beginPath();context.arc(star.x,star.y,36,0,Math.PI*2);context.fill();
      context.fillStyle='#ffd36b';context.beginPath();context.arc(star.x,star.y,10,0,Math.PI*2);context.fill();
      state.hitTargets.push({id:'star',x:star.x,y:star.y,radius:14,depth:star.z});
    }

    function drawStarfield(context,width,height,seed) {
      const rng=randomFor(`${seed}:3d-starfield`);context.fillStyle='rgba(220,235,245,.6)';
      for(let index=0;index<90;index++){const x=rng()*width,y=rng()*height,r=.25+rng()*1.1;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();}
    }

    function bodySize(body,perspective) {
      if(body.kind==='dwarf-planet') return Math.max(3.5,5*perspective);
      if(/Gas giant/.test(body.type)) return Math.max(6,11*perspective);
      if(/Ice giant/.test(body.type)) return Math.max(5,8*perspective);
      return Math.max(4,6*perspective);
    }

    function distanceRange(moons) {
      const values=moons.map(moon=>Number(moon.orbitalDistanceKm)).filter(value=>value>0);
      return {min:Math.min(...values,1),max:Math.max(...values,1)};
    }

    function moonVisualAu(moon,range,outer) {
      const distance=Number(moon.orbitalDistanceKm);
      const t=distance>0&&range.max>range.min?(Math.log(distance)-Math.log(range.min))/(Math.log(range.max)-Math.log(range.min)):.5;
      return outer*(.012+t*.045);
    }

    function rowFor(id){return $('exo-orbital-table-body')?.querySelector(`tr[data-object-id="${escapeSelector(id)}"]`)||null;}
    function escapeSelector(value){return globalThis.CSS?.escape?CSS.escape(value):String(value).replace(/["\\]/g,'\\$&');}
    function number(value,fallback){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
    function randomFor(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return()=>{state+=0x6D2B79F5;let x=state;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296;};}
  }

  wait();
})();
