(() => {
  'use strict';

  const G = 6.67430e-11;
  const AU_M = 149597870700;
  const EARTH_MASS = 5.9722e24;
  const EARTH_RADIUS_M = 6371000;
  const MOON_MASS = 7.35e22;
  const MOON_RADIUS_M = 1737400;
  const MOON_DISTANCE_M = 384400000;
  const SUN_MASS = 1.9884e30;
  const SUN_RADIUS_M = 695700000;
  const MAX_BODIES = 12;
  const TRAIL_POINTS = 420;
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

  let root = null;
  let sceneState = null;
  let state = null;
  let baseline = null;
  let running = false;
  let raf = 0;
  let frame = 0;
  let initialDiagnostics = null;
  const scriptPromises = new Map();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const vec = (x=0,y=0,z=0) => ({x,y,z});
  const cloneBody = b => ({...b, position:{...b.position}, velocity:{...b.velocity}, trail:[]});

  function loadScript(src) {
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(s => s.src === src);
      if (existing && ((src === THREE_URL && window.THREE) || (src === ORBIT_URL && window.THREE?.OrbitControls))) return resolve();
      const script = existing || document.createElement('script');
      script.addEventListener('load', () => resolve(), {once:true});
      script.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), {once:true});
      if (!existing) { script.src = src; script.async = false; script.crossOrigin = 'anonymous'; document.head.appendChild(script); }
    });
    scriptPromises.set(src, promise);
    return promise;
  }

  async function ensureThree() {
    if (!window.THREE) await loadScript(THREE_URL);
    if (!window.THREE?.OrbitControls) await loadScript(ORBIT_URL);
    if (!window.THREE?.OrbitControls) throw new Error('Three.js OrbitControls did not initialize.');
    return window.THREE;
  }

  function orbitalPair(primaryMass, secondaryMass, separationM) {
    const omega = Math.sqrt(G * (primaryMass + secondaryMass) / Math.pow(separationM, 3));
    const r1 = separationM * secondaryMass / (primaryMass + secondaryMass);
    const r2 = separationM * primaryMass / (primaryMass + secondaryMass);
    return {r1, r2, v1:omega*r1, v2:omega*r2};
  }

  function earthMoonPreset() {
    const orbit = orbitalPair(EARTH_MASS, MOON_MASS, MOON_DISTANCE_M);
    return [
      {name:'Earth',shape:'sphere',massKg:EARTH_MASS,radiusM:EARTH_RADIUS_M,position:vec(-orbit.r1,0,0),velocity:vec(0,-orbit.v1,0)},
      {name:'Moon',shape:'sphere',massKg:MOON_MASS,radiusM:MOON_RADIUS_M,position:vec(orbit.r2,0,0),velocity:vec(0,orbit.v2,0)}
    ];
  }

  function sunEarthPreset() {
    const orbit = orbitalPair(SUN_MASS, EARTH_MASS, AU_M);
    return [
      {name:'Sun',shape:'sphere',massKg:SUN_MASS,radiusM:SUN_RADIUS_M,position:vec(-orbit.r1,0,0),velocity:vec(0,-orbit.v1,0)},
      {name:'Earth',shape:'sphere',massKg:EARTH_MASS,radiusM:EARTH_RADIUS_M,position:vec(orbit.r2,0,0),velocity:vec(0,orbit.v2,0)}
    ];
  }

  function equalBinaryPreset() {
    const separation = 120000000;
    const orbit = orbitalPair(EARTH_MASS, EARTH_MASS, separation);
    return [
      {name:'A',shape:'icosahedron',massKg:EARTH_MASS,radiusM:5000000,position:vec(-orbit.r1,0,0),velocity:vec(0,-orbit.v1,0)},
      {name:'B',shape:'cube',massKg:EARTH_MASS,radiusM:5000000,position:vec(orbit.r2,0,0),velocity:vec(0,orbit.v2,0)}
    ];
  }

  function threeBodyPreset() {
    const m = EARTH_MASS;
    const r = 90000000;
    const speed = Math.sqrt(G*m/r) * 0.72;
    return [
      {name:'One',shape:'sphere',massKg:m,radiusM:4500000,position:vec(-r,0,0),velocity:vec(0,-speed,0)},
      {name:'Two',shape:'tetrahedron',massKg:m,radiusM:4500000,position:vec(r,0,0),velocity:vec(0,-speed,0)},
      {name:'Three',shape:'torus',massKg:m,radiusM:4500000,position:vec(0,r*1.25,0),velocity:vec(speed*1.35,speed*0.9,0)}
    ];
  }

  function presetBodies(id) {
    if (id === 'sun-earth') return sunEarthPreset();
    if (id === 'equal-binary') return equalBinaryPreset();
    if (id === 'three-body') return threeBodyPreset();
    return earthMoonPreset();
  }

  function blankBody(index) {
    return {name:`Body ${index+1}`,shape:['sphere','cube','tetrahedron','octahedron','icosahedron','torus'][index%6],massKg:EARTH_MASS,radiusM:3000000,position:vec((index-(MAX_BODIES-1)/2)*70000000,0,0),velocity:vec(0,0,0)};
  }

  function normalizeBodies(bodies) { return bodies.map((b,i) => cloneBody({...blankBody(i),...b})); }

  function accelerations(bodies) {
    const acc = bodies.map(() => vec());
    for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++) {
      const a=bodies[i], b=bodies[j];
      const dx=b.position.x-a.position.x, dy=b.position.y-a.position.y, dz=b.position.z-a.position.z;
      const r2=dx*dx+dy*dy+dz*dz;
      const r=Math.sqrt(r2);
      if (!(r>0)) continue;
      const invR3=1/(r2*r);
      const ai=G*b.massKg*invR3, aj=G*a.massKg*invR3;
      acc[i].x+=dx*ai; acc[i].y+=dy*ai; acc[i].z+=dz*ai;
      acc[j].x-=dx*aj; acc[j].y-=dy*aj; acc[j].z-=dz*aj;
    }
    return acc;
  }

  function findCollision(bodies) {
    for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++) {
      const a=bodies[i],b=bodies[j];
      const d=Math.hypot(b.position.x-a.position.x,b.position.y-a.position.y,b.position.z-a.position.z);
      if (d <= a.radiusM + b.radiusM) return {i,j,d};
    }
    return null;
  }

  function stepSimulation(dt) {
    const a0=accelerations(state.bodies);
    for(let i=0;i<state.bodies.length;i++){
      const b=state.bodies[i],a=a0[i];
      b.position.x+=b.velocity.x*dt+0.5*a.x*dt*dt;
      b.position.y+=b.velocity.y*dt+0.5*a.y*dt*dt;
      b.position.z+=b.velocity.z*dt+0.5*a.z*dt*dt;
    }
    const hit=findCollision(state.bodies);
    if(hit){running=false;setStatus(`Collision boundary reached: ${state.bodies[hit.i].name} ↔ ${state.bodies[hit.j].name}. The foundation solver halts rather than inventing a merge or impact model.`,'warning');updateRunButton();return false;}
    const a1=accelerations(state.bodies);
    for(let i=0;i<state.bodies.length;i++){
      const b=state.bodies[i];
      b.velocity.x+=0.5*(a0[i].x+a1[i].x)*dt;
      b.velocity.y+=0.5*(a0[i].y+a1[i].y)*dt;
      b.velocity.z+=0.5*(a0[i].z+a1[i].z)*dt;
    }
    state.timeS+=dt;
    return true;
  }

  function diagnostics(bodies) {
    let kinetic=0,potential=0,totalMass=0;
    const p=vec(), com=vec(), L=vec();
    let minSep=Infinity;
    for(const b of bodies){
      const v2=b.velocity.x*b.velocity.x+b.velocity.y*b.velocity.y+b.velocity.z*b.velocity.z;
      kinetic+=0.5*b.massKg*v2; totalMass+=b.massKg;
      p.x+=b.massKg*b.velocity.x;p.y+=b.massKg*b.velocity.y;p.z+=b.massKg*b.velocity.z;
      com.x+=b.massKg*b.position.x;com.y+=b.massKg*b.position.y;com.z+=b.massKg*b.position.z;
      L.x+=b.massKg*(b.position.y*b.velocity.z-b.position.z*b.velocity.y);
      L.y+=b.massKg*(b.position.z*b.velocity.x-b.position.x*b.velocity.z);
      L.z+=b.massKg*(b.position.x*b.velocity.y-b.position.y*b.velocity.x);
    }
    if(totalMass){com.x/=totalMass;com.y/=totalMass;com.z/=totalMass;}
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],r=Math.hypot(b.position.x-a.position.x,b.position.y-a.position.y,b.position.z-a.position.z);
      if(r>0) potential-=G*a.massKg*b.massKg/r;
      minSep=Math.min(minSep,r);
    }
    return {kinetic,potential,totalEnergy:kinetic+potential,momentum:Math.hypot(p.x,p.y,p.z),angularMomentum:Math.hypot(L.x,L.y,L.z),com,minSep};
  }

  function relativeDrift(value, initial) {
    const scale=Math.max(Math.abs(initial),1e-30);return (value-initial)/scale;
  }

  function formatScientific(v,d=3){return Number.isFinite(v)?v.toExponential(d):'—';}
  function formatTime(s){if(s<3600)return `${s.toFixed(1)} s`;if(s<86400)return `${(s/3600).toFixed(2)} h`;if(s<31557600)return `${(s/86400).toFixed(2)} d`;return `${(s/31557600).toFixed(3)} y`;}
  function formatDistance(m){if(!Number.isFinite(m))return '—';if(m>=AU_M*.01)return `${(m/AU_M).toFixed(5)} AU`;if(m>=1e6)return `${(m/1000).toLocaleString(undefined,{maximumFractionDigits:1})} km`;return `${m.toExponential(3)} m`;}

  function systemExtentM(){
    let max=1;
    for(const b of state.bodies) max=Math.max(max,Math.abs(b.position.x),Math.abs(b.position.y),Math.abs(b.position.z));
    return max*1.25;
  }

  function scenePosition(position, extent){return new sceneState.THREE.Vector3(position.x/extent*5,position.y/extent*5,position.z/extent*5);}

  function geometryFor(shape) {
    const T=sceneState.THREE;
    if(shape==='cube')return new T.BoxGeometry(1,1,1);
    if(shape==='tetrahedron')return new T.TetrahedronGeometry(.72,0);
    if(shape==='octahedron')return new T.OctahedronGeometry(.72,0);
    if(shape==='icosahedron')return new T.IcosahedronGeometry(.72,1);
    if(shape==='torus')return new T.TorusGeometry(.56,.22,12,28);
    return new T.SphereGeometry(.62,28,18);
  }

  function bodyColor(index){return [0x6fc9ff,0xf3c36a,0x9ee493,0xd4a5ff,0xff8fa3,0x86e7d4,0xffd6a5,0xa0c4ff,0xfdffb6,0xcaffbf,0xbdb2ff,0xffadad][index%12];}

  function clearGroup(group){while(group.children.length){const o=group.children.pop();o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material.dispose?.();}}}

  function rebuildBodiesVisual(){
    const {THREE,bodyGroup,trailGroup}=sceneState;clearGroup(bodyGroup);clearGroup(trailGroup);sceneState.bodyMeshes=[];sceneState.trailLines=[];
    state.bodies.forEach((b,i)=>{
      const mesh=new THREE.Mesh(geometryFor(b.shape),new THREE.MeshStandardMaterial({color:bodyColor(i),roughness:.48,metalness:.16,emissive:bodyColor(i),emissiveIntensity:.08}));
      bodyGroup.add(mesh);sceneState.bodyMeshes.push(mesh);
      const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:bodyColor(i),transparent:true,opacity:.5}));trailGroup.add(line);sceneState.trailLines.push(line);
    });
  }

  function updateTrails(extent){
    if(!document.getElementById('gravity-trails')?.checked){sceneState.trailLines.forEach(l=>l.visible=false);return;}
    state.bodies.forEach((b,i)=>{
      const p=scenePosition(b.position,extent);b.trail.push({x:b.position.x,y:b.position.y,z:b.position.z});if(b.trail.length>TRAIL_POINTS)b.trail.shift();
      const pts=b.trail.map(v=>scenePosition(v,extent));const line=sceneState.trailLines[i];line.visible=true;line.geometry.dispose();line.geometry=new sceneState.THREE.BufferGeometry().setFromPoints(pts);
    });
  }

  function accelerationAtPoint(point,bodies){
    const out=vec();for(const b of bodies){const dx=b.position.x-point.x,dy=b.position.y-point.y,dz=b.position.z-point.z;const r2=dx*dx+dy*dy+dz*dz;const r=Math.sqrt(r2);if(r<=Math.max(b.radiusM,.0001))continue;const f=G*b.massKg/(r2*r);out.x+=dx*f;out.y+=dy*f;out.z+=dz*f;}return out;
  }

  function rebuildFieldVectors(extent){
    const enabled=document.getElementById('gravity-field-vectors')?.checked;if(!enabled){sceneState.fieldGroup.visible=false;return;}sceneState.fieldGroup.visible=true;clearGroup(sceneState.fieldGroup);
    const T=sceneState.THREE,n=9,span=extent*.9;
    for(let yi=0;yi<n;yi++)for(let xi=0;xi<n;xi++){
      const point={x:(xi/(n-1)*2-1)*span,y:(yi/(n-1)*2-1)*span,z:0};
      const a=accelerationAtPoint(point,state.bodies);const mag=Math.hypot(a.x,a.y,a.z);if(!(mag>0))continue;
      const dir=new T.Vector3(a.x,a.y,a.z).normalize();const origin=scenePosition(point,extent);const length=clamp(.08+Math.log10(1+mag*1e8)*.06,.08,.42);
      const arrow=new T.ArrowHelper(dir,origin,length,0x76d7ff,.07,.035);sceneState.fieldGroup.add(arrow);
    }
  }

  function updateVisuals(forceField=false){
    if(!sceneState||!state)return;const extent=systemExtentM();const displayScale=finite(document.getElementById('gravity-display-radius')?.value,8);
    state.bodies.forEach((b,i)=>{const mesh=sceneState.bodyMeshes[i];if(!mesh)return;mesh.position.copy(scenePosition(b.position,extent));const scale=clamp((b.radiusM/extent*5)*displayScale,.045,.82);mesh.scale.setScalar(scale);mesh.rotation.x+=.003*(i+1);mesh.rotation.y+=.0025;});
    if(running||forceField)updateTrails(extent);if(forceField||frame%12===0)rebuildFieldVectors(extent);renderMetrics();
  }

  function renderMetrics(){
    const d=diagnostics(state.bodies);const e0=initialDiagnostics?.totalEnergy??d.totalEnergy,p0=initialDiagnostics?.momentum??d.momentum,l0=initialDiagnostics?.angularMomentum??d.angularMomentum;
    const values={
      'gravity-time':formatTime(state.timeS),
      'gravity-energy-drift':`${(relativeDrift(d.totalEnergy,e0)*100).toExponential(2)}%`,
      'gravity-momentum':formatScientific(d.momentum-p0,2),
      'gravity-angular-drift':`${(relativeDrift(d.angularMomentum,l0)*100).toExponential(2)}%`,
      'gravity-min-separation':formatDistance(d.minSep)
    };
    for(const [id,value] of Object.entries(values)){const n=document.getElementById(id);if(n)n.textContent=value;}
  }

  async function initScene(){
    const THREE=await ensureThree(),host=document.getElementById('gravity-viewport');const scene=new THREE.Scene();scene.background=new THREE.Color(0x02060a);const camera=new THREE.PerspectiveCamera(48,1,.01,200);camera.position.set(6,4.5,7);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;host.replaceChildren(renderer.domElement);const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=1.2;controls.maxDistance=50;const bodyGroup=new THREE.Group(),trailGroup=new THREE.Group(),fieldGroup=new THREE.Group();scene.add(bodyGroup,trailGroup,fieldGroup);scene.add(new THREE.AmbientLight(0x9ec9e0,.65));const light=new THREE.DirectionalLight(0xffffff,.9);light.position.set(4,7,5);scene.add(light);const grid=new THREE.GridHelper(10,20,0x284655,0x172832);grid.rotation.x=Math.PI/2;scene.add(grid);
    sceneState={THREE,host,scene,camera,renderer,controls,bodyGroup,trailGroup,fieldGroup,bodyMeshes:[],trailLines:[]};
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(330,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};if(window.ResizeObserver)new ResizeObserver(resize).observe(host);else window.addEventListener('resize',resize);resize();rebuildBodiesVisual();updateVisuals(true);animate();
  }

  function animate(){
    raf=requestAnimationFrame(animate);frame++;if(running&&state){const dt=Math.max(.001,finite(document.getElementById('gravity-timestep')?.value,60));const steps=clamp(Math.round(finite(document.getElementById('gravity-steps-frame')?.value,1)),1,64);for(let i=0;i<steps;i++){if(!stepSimulation(dt))break;}updateVisuals();}
    sceneState?.controls?.update();sceneState?.renderer?.render(sceneState.scene,sceneState.camera);
  }

  function setStatus(message,kind=''){const n=document.getElementById('gravity-status');if(n){n.textContent=message;n.dataset.kind=kind;}}
  function updateRunButton(){const b=document.getElementById('gravity-run');if(b)b.textContent=running?'Pause':'Run';}

  function bodyEditorHtml(body,index){
    const km=v=>(v/1000).toPrecision(8).replace(/\.0+$/,'');const shapes=['sphere','cube','tetrahedron','octahedron','icosahedron','torus'];
    return `<section class="gravity-object" data-body-index="${index}"><div class="gravity-object-head"><strong>${body.name}</strong><span>#${index+1}</span></div><div class="gravity-object-grid"><label>Name<input data-k="name" value="${body.name}"></label><label>Shape<select data-k="shape">${shapes.map(s=>`<option value="${s}"${s===body.shape?' selected':''}>${s}</option>`).join('')}</select></label><label>Mass kg<input data-k="massKg" type="number" step="any" value="${body.massKg}"></label><label>Physical radius km<input data-k="radiusKm" type="number" step="any" value="${body.radiusM/1000}"></label><label>X km<input data-k="xKm" type="number" step="any" value="${km(body.position.x)}"></label><label>Y km<input data-k="yKm" type="number" step="any" value="${km(body.position.y)}"></label><label>Z km<input data-k="zKm" type="number" step="any" value="${km(body.position.z)}"></label><label>Vx km/s<input data-k="vxKms" type="number" step="any" value="${body.velocity.x/1000}"></label><label>Vy km/s<input data-k="vyKms" type="number" step="any" value="${body.velocity.y/1000}"></label><label>Vz km/s<input data-k="vzKms" type="number" step="any" value="${body.velocity.z/1000}"></label></div></section>`;
  }

  function renderObjectEditors(){const list=document.getElementById('gravity-object-list');if(list)list.innerHTML=state.bodies.map(bodyEditorHtml).join('');}

  function applyEditors(){
    const cards=[...document.querySelectorAll('[data-body-index]')];const bodies=cards.map((card,i)=>{
      const get=k=>card.querySelector(`[data-k="${k}"]`)?.value;return {name:String(get('name')||`Body ${i+1}`),shape:String(get('shape')||'sphere'),massKg:Math.max(1e-12,finite(get('massKg'),EARTH_MASS)),radiusM:Math.max(0,finite(get('radiusKm'),1000)*1000),position:vec(finite(get('xKm'))*1000,finite(get('yKm'))*1000,finite(get('zKm'))*1000),velocity:vec(finite(get('vxKms'))*1000,finite(get('vyKms'))*1000,finite(get('vzKms'))*1000)};});
    state={bodies:normalizeBodies(bodies),timeS:0};baseline=state.bodies.map(cloneBody);initialDiagnostics=diagnostics(state.bodies);running=false;updateRunButton();rebuildBodiesVisual();updateVisuals(true);setStatus('Object parameters applied. Newtonian integration reset to t = 0.');
  }

  function setBodyCount(count){count=clamp(Math.round(count),1,MAX_BODIES);const current=state.bodies.map(cloneBody);while(current.length<count)current.push(blankBody(current.length));current.length=count;state={bodies:normalizeBodies(current),timeS:0};baseline=state.bodies.map(cloneBody);initialDiagnostics=diagnostics(state.bodies);renderObjectEditors();rebuildBodiesVisual();updateVisuals(true);}

  function loadPreset(id){state={bodies:normalizeBodies(presetBodies(id)),timeS:0};baseline=state.bodies.map(cloneBody);initialDiagnostics=diagnostics(state.bodies);running=false;updateRunButton();document.getElementById('gravity-body-count').value=state.bodies.length;renderObjectEditors();if(sceneState){rebuildBodiesVisual();updateVisuals(true);}setStatus('Preset loaded from physical-data defaults. Shape selection affects rendering only in the foundation solver.');}

  function reset(){state={bodies:baseline.map(cloneBody),timeS:0};initialDiagnostics=diagnostics(state.bodies);running=false;updateRunButton();renderObjectEditors();rebuildBodiesVisual();updateVisuals(true);setStatus('Simulation reset to the last applied initial state.');}

  function buildUi(host){
    host.innerHTML=`<section class="gravity-lab"><header class="gravity-header"><p class="gravity-eyebrow">Scientific Tools · Gravitation</p><h1>Gravitational Simulation Laboratory</h1><p>Page-native Newtonian N-body laboratory using SI units internally, velocity-Verlet integration, explicit collision boundaries, 1–12 massive bodies, 3D primitive renderings, trails, normalized gravitational-field vectors, and conservation diagnostics. Extended-shape gravity and relativistic/non-Euclidean spacetime are deliberately not faked by visual effects; those remain separate future solvers.</p></header><div class="gravity-layout"><aside class="gravity-controls"><section class="gravity-card"><h2>Simulation</h2><label>Physical preset<select id="gravity-preset"><option value="earth-moon">Earth–Moon barycentric pair</option><option value="sun-earth">Sun–Earth barycentric pair</option><option value="equal-binary">Equal-mass binary benchmark</option><option value="three-body">Three-body free evolution benchmark</option></select></label><label>Body count 1–12<input id="gravity-body-count" type="number" min="1" max="12" value="2"></label><label>Integrator timestep (s)<input id="gravity-timestep" type="number" min="0.001" step="any" value="60"></label><label>Integration steps / rendered frame<input id="gravity-steps-frame" type="number" min="1" max="64" value="8"></label><label>Display radius multiplier<input id="gravity-display-radius" type="range" min="1" max="80" step="1" value="12"></label><label class="gravity-check"><input id="gravity-trails" type="checkbox" checked> Show trajectory trails</label><label class="gravity-check"><input id="gravity-field-vectors" type="checkbox" checked> Show normalized Newtonian field vectors</label><div class="gravity-actions"><button id="gravity-run" class="primary">Run</button><button id="gravity-step">Single step</button><button id="gravity-reset">Reset</button><button id="gravity-apply">Apply object parameters</button></div><div id="gravity-status" class="gravity-status">Ready.</div></section><section class="gravity-card"><h3>Objects</h3><p class="gravity-source-note">Mass, physical radius, position, and velocity affect the solver. Primitive shape currently affects only 3D rendering; the point-mass gravity model does not pretend cubes or tori have solved extended-body fields.</p><div id="gravity-object-list" class="gravity-object-list"></div></section></aside><main class="gravity-workspace"><section class="gravity-metrics"><div class="gravity-metric"><span>Simulated time</span><strong id="gravity-time">0 s</strong></div><div class="gravity-metric"><span>Total-energy drift</span><strong id="gravity-energy-drift">0%</strong></div><div class="gravity-metric"><span>Momentum change kg·m/s</span><strong id="gravity-momentum">0</strong></div><div class="gravity-metric"><span>Angular-momentum drift</span><strong id="gravity-angular-drift">0%</strong></div><div class="gravity-metric"><span>Minimum separation</span><strong id="gravity-min-separation">—</strong></div></section><div id="gravity-viewport" class="gravity-viewport" aria-label="Three-dimensional gravitational simulation viewport"></div><section class="gravity-card"><h3>Current physical model</h3><p><strong>Implemented:</strong> Newtonian pairwise gravity, SI-unit state, velocity-Verlet time integration, barycentric presets, finite physical radii used as collision boundaries, and explicit conservation-error reporting.</p><p><strong>Not silently approximated:</strong> general relativity, frame dragging, gravitational radiation, curved-spacetime geodesics, non-Euclidean manifolds, tidal deformation, rigid-body rotation, and shape-dependent extended mass fields. Those require separate mathematical solvers and validity diagnostics rather than a cosmetic “space warp” effect.</p><p class="gravity-source-note">Foundation constants/presets: G = 6.67430×10⁻¹¹ m³·kg⁻¹·s⁻² (2022 CODATA recommended value); Earth mass 5.9722×10²⁴ kg and mean radius 6371 km; Sun mass 1.9884×10³⁰ kg and mean radius 695,700 km; mean Earth–Moon distance 384,400 km. Preset values are reference initial conditions, not ephemerides for a specific date.</p></section><section class="gravity-boundary"><strong>Scientific boundary:</strong> the curved-looking motion in the 3D viewport is the trajectory of bodies under Newtonian force, not a rendered metric tensor or a proof of spacetime curvature. Shape primitives are presently visualization geometry. The planned extended-body solver will integrate mass elements over actual Euclidean solids; relativistic and non-Euclidean experiments will live behind separately labeled model layers with their own equations, assumptions, and validity checks.</section></main></div></section>`;
  }

  async function mountPage(host=document.getElementById('gravitational-simulation-root')){
    root=host;if(!root)throw new Error('Gravity laboratory page root is missing.');buildUi(root);loadPreset('earth-moon');
    document.getElementById('gravity-preset').addEventListener('change',e=>loadPreset(e.target.value));
    document.getElementById('gravity-body-count').addEventListener('change',e=>setBodyCount(finite(e.target.value,2)));
    document.getElementById('gravity-run').addEventListener('click',()=>{running=!running;updateRunButton();setStatus(running?'Simulation running.':'Simulation paused.');});
    document.getElementById('gravity-step').addEventListener('click',()=>{running=false;updateRunButton();stepSimulation(Math.max(.001,finite(document.getElementById('gravity-timestep').value,60)));updateVisuals(true);});
    document.getElementById('gravity-reset').addEventListener('click',reset);document.getElementById('gravity-apply').addEventListener('click',applyEditors);
    document.getElementById('gravity-field-vectors').addEventListener('change',()=>updateVisuals(true));document.getElementById('gravity-display-radius').addEventListener('input',()=>updateVisuals(false));
    await initScene();return root;
  }

  window.GravitationalSimulationLab=Object.freeze({mountPage,constants:Object.freeze({G,AU_M,EARTH_MASS,EARTH_RADIUS_M,MOON_MASS,MOON_RADIUS_M,MOON_DISTANCE_M,SUN_MASS,SUN_RADIUS_M,MAX_BODIES}),diagnostics});
})();
