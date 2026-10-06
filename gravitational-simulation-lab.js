(() => {
  'use strict';

  const G = 6.67430e-11;
  const C = 299792458;
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
  const DEFAULT_QUADRATURE_RESOLUTION = 4;
  const MAX_QUADRATURE_RESOLUTION = 6;
  const DEFAULT_FAR_FIELD_FACTOR = 8;
  const TORUS_MAJOR_RATIO = 0.62;
  const TORUS_MINOR_RATIO = 0.38;
  const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
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
  const quadratureCache = new WeakMap();
  let geometryDiagnosticsCache = null;
  let lastCollisionAudit = null;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const vec = (x=0,y=0,z=0) => ({x,y,z});
  const cloneBody = b => ({...b, position:{...b.position}, velocity:{...b.velocity}, dimensionsM:{...b.dimensionsM}, rotationDeg:{...b.rotationDeg}, trail:[]});
  const vectorMagnitude = v => Math.hypot(v.x, v.y, v.z);
  const vectorDifferenceMagnitude = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

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

  function dimensionsFromRadius(radiusM) {
    const diameter = Math.max(0, radiusM) * 2;
    return {x:diameter,y:diameter,z:diameter};
  }

  function makeBody(name, shape, massKg, radiusM, position, velocity, extra={}) {
    return {name,shape,massKg,massMode:'mass',dimensionsM:dimensionsFromRadius(radiusM),rotationDeg:vec(),position,velocity,...extra};
  }

  function earthMoonPreset() {
    const orbit = orbitalPair(EARTH_MASS, MOON_MASS, MOON_DISTANCE_M);
    return [
      makeBody('Earth','sphere',EARTH_MASS,EARTH_RADIUS_M,vec(-orbit.r1,0,0),vec(0,-orbit.v1,0)),
      makeBody('Moon','sphere',MOON_MASS,MOON_RADIUS_M,vec(orbit.r2,0,0),vec(0,orbit.v2,0))
    ];
  }

  function sunEarthPreset() {
    const orbit = orbitalPair(SUN_MASS, EARTH_MASS, AU_M);
    return [
      makeBody('Sun','sphere',SUN_MASS,SUN_RADIUS_M,vec(-orbit.r1,0,0),vec(0,-orbit.v1,0)),
      makeBody('Earth','sphere',EARTH_MASS,EARTH_RADIUS_M,vec(orbit.r2,0,0),vec(0,orbit.v2,0))
    ];
  }

  function equalBinaryPreset() {
    const separation = 120000000;
    const orbit = orbitalPair(EARTH_MASS, EARTH_MASS, separation);
    return [
      makeBody('A','icosahedron',EARTH_MASS,5000000,vec(-orbit.r1,0,0),vec(0,-orbit.v1,0),{rotationDeg:vec(12,18,8)}),
      makeBody('B','cube',EARTH_MASS,5000000,vec(orbit.r2,0,0),vec(0,orbit.v2,0),{rotationDeg:vec(0,28,15)})
    ];
  }

  function threeBodyPreset() {
    const m = EARTH_MASS;
    const r = 90000000;
    const speed = Math.sqrt(G*m/r) * 0.72;
    return [
      makeBody('One','sphere',m,4500000,vec(-r,0,0),vec(0,-speed,0)),
      makeBody('Two','tetrahedron',m,4500000,vec(r,0,0),vec(0,-speed,0),{rotationDeg:vec(18,12,0)}),
      makeBody('Three','torus',m,4500000,vec(0,r*1.25,0),vec(speed*1.35,speed*0.9,0),{rotationDeg:vec(62,0,15)})
    ];
  }

  function effectiveRotatingAccelerationX(x,m1,m2,x1,x2,omega) {
    const d1=x-x1,d2=x-x2;
    return -G*m1*d1/Math.pow(Math.abs(d1),3)-G*m2*d2/Math.pow(Math.abs(d2),3)+omega*omega*x;
  }

  function collinearLagrangeX(m1,m2,separationM,id) {
    const orbit=orbitalPair(m1,m2,separationM),x1=-orbit.r1,x2=orbit.r2,omega=Math.sqrt(G*(m1+m2)/Math.pow(separationM,3));
    const eps=separationM*1e-7;
    let lo,hi;
    if(id==='L1'){lo=x1+eps;hi=x2-eps;}
    else if(id==='L2'){lo=x2+eps;hi=x2+2*separationM;}
    else if(id==='L3'){lo=x1-2*separationM;hi=x1-eps;}
    else throw new Error('Collinear Lagrange point must be L1, L2, or L3.');
    let flo=effectiveRotatingAccelerationX(lo,m1,m2,x1,x2,omega),fhi=effectiveRotatingAccelerationX(hi,m1,m2,x1,x2,omega);
    if(!(flo*fhi<0)) throw new Error(`Could not bracket ${id} equilibrium.`);
    for(let iteration=0;iteration<120;iteration++){
      const mid=(lo+hi)/2,fmid=effectiveRotatingAccelerationX(mid,m1,m2,x1,x2,omega);
      if(Math.abs(fmid)<1e-16||Math.abs(hi-lo)<Math.max(1e-6,separationM*1e-13))return mid;
      if(flo*fmid<=0){hi=mid;fhi=fmid;}else{lo=mid;flo=fmid;}
    }
    return (lo+hi)/2;
  }

  function restrictedThreeBodyState(primaryMass,secondaryMass,separationM,id='L4') {
    const orbit=orbitalPair(primaryMass,secondaryMass,separationM),omega=Math.sqrt(G*(primaryMass+secondaryMass)/Math.pow(separationM,3));
    const x1=-orbit.r1,x2=orbit.r2;
    let x,y=0;
    if(id==='L4'||id==='L5'){
      x=(x1+x2)/2;
      y=(id==='L4'?1:-1)*Math.sqrt(3)*separationM/2;
    }else x=collinearLagrangeX(primaryMass,secondaryMass,separationM,id);
    return Object.freeze({
      id,omega,x1,x2,separationM,
      position:Object.freeze(vec(x,y,0)),
      velocity:Object.freeze(vec(-omega*y,omega*x,0))
    });
  }

  function earthMoonRestrictedPreset(id) {
    const orbit=orbitalPair(EARTH_MASS,MOON_MASS,MOON_DISTANCE_M),test=restrictedThreeBodyState(EARTH_MASS,MOON_MASS,MOON_DISTANCE_M,id);
    return [
      makeBody('Earth','sphere',EARTH_MASS,EARTH_RADIUS_M,vec(-orbit.r1,0,0),vec(0,-orbit.v1,0)),
      makeBody('Moon','sphere',MOON_MASS,MOON_RADIUS_M,vec(orbit.r2,0,0),vec(0,orbit.v2,0)),
      makeBody(`Test particle · ${id}`,'sphere',1,1,vec(test.position.x,test.position.y,0),vec(test.velocity.x,test.velocity.y,0),{experimentRole:'test-particle'})
    ];
  }

  function hierarchicalTriplePreset() {
    const outerDistance=AU_M,innerSeparation=20000000,innerMass=EARTH_MASS;
    const outer=orbitalPair(SUN_MASS,innerMass*2,outerDistance),outerOmega=Math.sqrt(G*(SUN_MASS+innerMass*2)/Math.pow(outerDistance,3));
    const innerOmega=Math.sqrt(G*(innerMass*2)/Math.pow(innerSeparation,3)),half=innerSeparation/2;
    const binaryX=outer.r2,sunX=-outer.r1,outerVy=outerOmega*binaryX,sunVy=outerOmega*sunX;
    return [
      makeBody('Primary star','sphere',SUN_MASS,SUN_RADIUS_M,vec(sunX,0,0),vec(0,sunVy,0)),
      makeBody('Inner A','sphere',innerMass,EARTH_RADIUS_M,vec(binaryX,-half,0),vec(innerOmega*half,outerVy,0)),
      makeBody('Inner B','sphere',innerMass,EARTH_RADIUS_M,vec(binaryX,half,0),vec(-innerOmega*half,outerVy,0))
    ];
  }

  const PRESET_INFO=Object.freeze({
    'earth-moon':'Idealized circular two-body reference using mean masses/radii/distance; not a date-specific ephemeris.',
    'sun-earth':'Idealized circular two-body reference at 1 AU; not a date-specific ephemeris.',
    'equal-binary':'Pedagogical equal-mass shaped binary for comparing point and extended-geometry forces.',
    'three-body':'Pedagogical non-equilibrium three-body free-evolution benchmark.',
    'earth-moon-l1':'Idealized circular restricted three-body Earth–Moon L1 state. The 1 kg tracer makes its back-reaction physically negligible.',
    'earth-moon-l4':'Idealized circular restricted three-body Earth–Moon L4 equilateral state. Use the co-rotating view to inspect stationarity.',
    'earth-moon-l5':'Idealized circular restricted three-body Earth–Moon L5 equilateral state. Use the co-rotating view to inspect stationarity.',
    'hierarchical-triple':'Idealized hierarchical triple: a two-Earth-mass inner binary whose barycenter begins on a circular 1 AU orbit around a solar-mass primary.',
    'compact-precession':'Weak-field Schwarzschild/1PN demonstration: a 1 kg tracer orbits a 10-solar-mass compact source with a = 250 Rs and e = 0.3. The source sphere is only an event-horizon display/collision proxy; the external field is treated as a monopole.'
  });

  function compactPrecessionPreset() {
    const centralMass=10*SUN_MASS,rs=schwarzschildRadius(centralMass),semiMajor=250*rs,eccentricity=.3,periapsis=semiMajor*(1-eccentricity),mu=G*centralMass;
    const periapsisSpeed=Math.sqrt(mu*(1+eccentricity)/(semiMajor*(1-eccentricity)));
    return [
      makeBody('10 M☉ Schwarzschild source · horizon proxy','sphere',centralMass,rs,vec(0,0,0),vec()),
      makeBody('1 kg test particle','sphere',1,1,vec(periapsis,0,0),vec(0,periapsisSpeed,0),{experimentRole:'test-particle'})
    ];
  }

  function presetBodies(id) {
    if (id === 'sun-earth') return sunEarthPreset();
    if (id === 'equal-binary') return equalBinaryPreset();
    if (id === 'three-body') return threeBodyPreset();
    if (id === 'earth-moon-l1') return earthMoonRestrictedPreset('L1');
    if (id === 'earth-moon-l4') return earthMoonRestrictedPreset('L4');
    if (id === 'earth-moon-l5') return earthMoonRestrictedPreset('L5');
    if (id === 'hierarchical-triple') return hierarchicalTriplePreset();
    if (id === 'compact-precession') return compactPrecessionPreset();
    return earthMoonPreset();
  }

  function blankBody(index) {
    const shapes=['sphere','cube','tetrahedron','octahedron','icosahedron','disk','torus'];
    return makeBody(`Body ${index+1}`,shapes[index%shapes.length],EARTH_MASS,3000000,vec((index-(MAX_BODIES-1)/2)*70000000,0,0),vec());
  }

  function canonicalVertices(shape) {
    if (shape === 'tetrahedron') return [vec(1,1,1),vec(1,-1,-1),vec(-1,1,-1),vec(-1,-1,1)];
    if (shape === 'icosahedron') {
      const a=1/GOLDEN_RATIO;
      return [
        vec(0,a,1),vec(0,a,-1),vec(0,-a,1),vec(0,-a,-1),
        vec(a,1,0),vec(a,-1,0),vec(-a,1,0),vec(-a,-1,0),
        vec(1,0,a),vec(1,0,-a),vec(-1,0,a),vec(-1,0,-a)
      ];
    }
    return [];
  }

  function convexHullFaces(vertices) {
    const faces=[],eps=1e-9;
    for(let i=0;i<vertices.length-2;i++) for(let j=i+1;j<vertices.length-1;j++) for(let k=j+1;k<vertices.length;k++){
      const a=vertices[i],b=vertices[j],c=vertices[k];
      const ab=vec(b.x-a.x,b.y-a.y,b.z-a.z),ac=vec(c.x-a.x,c.y-a.y,c.z-a.z);
      let n=vec(ab.y*ac.z-ab.z*ac.y,ab.z*ac.x-ab.x*ac.z,ab.x*ac.y-ab.y*ac.x);
      const len=vectorMagnitude(n); if(len<eps) continue;
      n=vec(n.x/len,n.y/len,n.z/len);
      let d=n.x*a.x+n.y*a.y+n.z*a.z;
      let positive=false,negative=false;
      for(let q=0;q<vertices.length;q++){
        if(q===i||q===j||q===k) continue;
        const side=n.x*vertices[q].x+n.y*vertices[q].y+n.z*vertices[q].z-d;
        if(side>eps)positive=true;if(side<-eps)negative=true;if(positive&&negative)break;
      }
      if(positive&&negative) continue;
      if(d<0){n=vec(-n.x,-n.y,-n.z);d=-d;}
      if(vertices.some((v,q)=>q!==i&&q!==j&&q!==k&&Math.abs(n.x*v.x+n.y*v.y+n.z*v.z-d)<eps)) continue;
      faces.push({indices:[i,j,k],normal:n,d});
    }
    return faces;
  }

  const TETRA_FACES = convexHullFaces(canonicalVertices('tetrahedron'));
  const ICOSA_FACES = convexHullFaces(canonicalVertices('icosahedron'));

  function pointInsideConvex(point, faces) {
    return faces.every(face => face.normal.x*point.x+face.normal.y*point.y+face.normal.z*point.z <= face.d + 1e-9);
  }

  function bodyHalfExtents(body) {
    const d=body.dimensionsM||dimensionsFromRadius(body.radiusM||1);
    return {x:Math.max(1e-12,d.x/2),y:Math.max(1e-12,d.y/2),z:Math.max(1e-12,d.z/2)};
  }

  function bodyVolumeM3(body) {
    const h=bodyHalfExtents(body);
    if(body.shape==='cube') return 8*h.x*h.y*h.z;
    if(body.shape==='tetrahedron') return (8/3)*h.x*h.y*h.z;
    if(body.shape==='octahedron') return (4/3)*h.x*h.y*h.z;
    if(body.shape==='icosahedron'){
      const normalizedVolume=((10/3)*(3+Math.sqrt(5)))/Math.pow(GOLDEN_RATIO,3);
      return normalizedVolume*h.x*h.y*h.z;
    }
    if(body.shape==='disk') return 2*Math.PI*h.x*h.y*h.z;
    if(body.shape==='torus') return 2*Math.PI*Math.PI*TORUS_MAJOR_RATIO*TORUS_MINOR_RATIO*h.x*h.y*h.z;
    return (4/3)*Math.PI*h.x*h.y*h.z;
  }

  function bodyBoundingRadiusM(body) {
    const h=bodyHalfExtents(body);
    if(body.shape==='sphere') return Math.max(h.x,h.y,h.z);
    if(body.shape==='disk'||body.shape==='torus') return Math.hypot(Math.max(h.x,h.y),h.z);
    return Math.hypot(h.x,h.y,h.z);
  }

  function normalizeBody(body,index=0) {
    const fallback=blankBody(index);
    const normalized={...fallback,...body,dimensionsM:{...(body.dimensionsM||fallback.dimensionsM)},rotationDeg:{...(body.rotationDeg||vec())},position:{...(body.position||fallback.position)},velocity:{...(body.velocity||fallback.velocity)}};
    normalized.dimensionsM.x=Math.max(1e-9,finite(normalized.dimensionsM.x,fallback.dimensionsM.x));
    normalized.dimensionsM.y=Math.max(1e-9,finite(normalized.dimensionsM.y,fallback.dimensionsM.y));
    normalized.dimensionsM.z=Math.max(1e-9,finite(normalized.dimensionsM.z,fallback.dimensionsM.z));
    normalized.massMode=normalized.massMode==='density'?'density':'mass';
    const volume=bodyVolumeM3(normalized);
    if(normalized.massMode==='density'){
      normalized.densityKgM3=Math.max(1e-18,finite(normalized.densityKgM3,finite(normalized.massKg,EARTH_MASS)/volume));
      normalized.massKg=normalized.densityKgM3*volume;
    }else{
      normalized.massKg=Math.max(1e-18,finite(normalized.massKg,EARTH_MASS));
      normalized.densityKgM3=normalized.massKg/volume;
    }
    normalized.radiusM=bodyBoundingRadiusM(normalized);
    normalized.trail=[];
    return normalized;
  }

  function normalizeBodies(bodies) { return bodies.map((b,i)=>normalizeBody(b,i)); }

  function rotateLocalPoint(point, rotationDeg) {
    const rx=finite(rotationDeg?.x)*Math.PI/180,ry=finite(rotationDeg?.y)*Math.PI/180,rz=finite(rotationDeg?.z)*Math.PI/180;
    let x=point.x,y=point.y,z=point.z;
    let c=Math.cos(rx),s=Math.sin(rx); [y,z]=[y*c-z*s,y*s+z*c];
    c=Math.cos(ry);s=Math.sin(ry); [x,z]=[x*c+z*s,-x*s+z*c];
    c=Math.cos(rz);s=Math.sin(rz); [x,y]=[x*c-y*s,x*s+y*c];
    return vec(x,y,z);
  }

  function normalizedPointInside(shape,p) {
    if(shape==='cube') return true;
    if(shape==='tetrahedron') return pointInsideConvex(p,TETRA_FACES);
    if(shape==='octahedron') return Math.abs(p.x)+Math.abs(p.y)+Math.abs(p.z)<=1+1e-12;
    if(shape==='icosahedron') return pointInsideConvex(p,ICOSA_FACES);
    if(shape==='disk') return p.x*p.x+p.y*p.y<=1+1e-12 && Math.abs(p.z)<=1;
    if(shape==='torus') {
      const radial=Math.hypot(p.x,p.y),tube=(radial-TORUS_MAJOR_RATIO)/TORUS_MINOR_RATIO;
      return tube*tube+p.z*p.z<=1+1e-12;
    }
    return p.x*p.x+p.y*p.y+p.z*p.z<=1+1e-12;
  }

  function buildMassSamples(body,resolution=DEFAULT_QUADRATURE_RESOLUTION) {
    const n=clamp(Math.round(resolution),2,MAX_QUADRATURE_RESOLUTION);
    const cacheKey=`${body.shape}|${n}|${body.dimensionsM.x}|${body.dimensionsM.y}|${body.dimensionsM.z}|${body.rotationDeg.x}|${body.rotationDeg.y}|${body.rotationDeg.z}|${body.massKg}`;
    const cached=quadratureCache.get(body);if(cached?.key===cacheKey)return cached.samples;
    const h=bodyHalfExtents(body),samples=[];
    for(let iz=0;iz<n;iz++)for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){
      const p=vec((ix+.5)/n*2-1,(iy+.5)/n*2-1,(iz+.5)/n*2-1);
      if(!normalizedPointInside(body.shape,p))continue;
      const local=rotateLocalPoint(vec(p.x*h.x,p.y*h.y,p.z*h.z),body.rotationDeg);samples.push(local);
    }
    if(!samples.length)samples.push(vec());
    const sampleMassKg=body.massKg/samples.length;
    const frozen=samples.map(p=>Object.freeze({x:p.x,y:p.y,z:p.z,massKg:sampleMassKg}));
    quadratureCache.set(body,{key:cacheKey,samples:frozen});return frozen;
  }

  function isAnalyticSphere(body) {
    if(body.shape!=='sphere')return false;
    const h=bodyHalfExtents(body),scale=Math.max(h.x,h.y,h.z);
    return Math.max(Math.abs(h.x-h.y),Math.abs(h.y-h.z),Math.abs(h.z-h.x))<=scale*1e-10;
  }

  function pointMassForce(a,b) {
    const dx=b.position.x-a.position.x,dy=b.position.y-a.position.y,dz=b.position.z-a.position.z;
    const r2=dx*dx+dy*dy+dz*dz,r=Math.sqrt(r2);
    if(!(r>0))return {force:vec(),distanceM:r,mode:'coincident'};
    const factor=G*a.massKg*b.massKg/(r2*r);
    return {force:vec(dx*factor,dy*factor,dz*factor),distanceM:r,mode:'point'};
  }

  function schwarzschildRadius(massKg) {
    return 2*G*massKg/(C*C);
  }

  function orbitalElementsAround(central,target) {
    const rx=target.position.x-central.position.x,ry=target.position.y-central.position.y,rz=target.position.z-central.position.z;
    const vx=target.velocity.x-central.velocity.x,vy=target.velocity.y-central.velocity.y,vz=target.velocity.z-central.velocity.z;
    const r=Math.hypot(rx,ry,rz),v2=vx*vx+vy*vy+vz*vz,mu=G*central.massKg;
    if(!(r>0)||!(mu>0))return {bound:false,rM:r,semiMajorM:NaN,eccentricity:NaN,specificEnergy:NaN,specificAngularMomentum:NaN};
    const hx=ry*vz-rz*vy,hy=rz*vx-rx*vz,hz=rx*vy-ry*vx,h2=hx*hx+hy*hy+hz*hz;
    const energy=v2/2-mu/r,bound=energy<0,semiMajor=bound?-mu/(2*energy):Infinity;
    const eccentricity=Math.sqrt(Math.max(0,1+2*energy*h2/(mu*mu)));
    return {bound,rM:r,semiMajorM:semiMajor,eccentricity,specificEnergy:energy,specificAngularMomentum:Math.sqrt(h2),speedMps:Math.sqrt(v2)};
  }

  function schwarzschildDiagnostics(central,target) {
    const elements=orbitalElementsAround(central,target),rs=schwarzschildRadius(central.massKg),r=elements.rM;
    const massRatio=target.massKg/central.massKg,speedFraction=elements.speedMps/C,compactness=rs/r;
    const staticClockRate=r>rs?Math.sqrt(1-rs/r):0;
    let periapsisAdvanceRad=NaN;
    if(elements.bound&&elements.eccentricity<1&&Number.isFinite(elements.semiMajorM)){
      periapsisAdvanceRad=6*Math.PI*G*central.massKg/(elements.semiMajorM*(1-elements.eccentricity*elements.eccentricity)*C*C);
    }
    const valid=massRatio<=1e-3&&speedFraction<0.3&&r>10*rs;
    const reasons=[];
    if(massRatio>1e-3)reasons.push('target/central mass ratio exceeds the test-particle regime');
    if(speedFraction>=0.3)reasons.push('relative speed is at or above 0.3c');
    if(!(r>10*rs))reasons.push('radius is too close to the Schwarzschild scale for this weak-field 1PN layer');
    return {valid,reasons,schwarzschildRadiusM:rs,radiusM:r,rOverRs:r/rs,compactness,speedFraction,massRatio,staticClockRate,periapsisAdvanceRad,elements};
  }

  function schwarzschild1PNCorrection(central,target) {
    const diagnostics=schwarzschildDiagnostics(central,target);
    if(!diagnostics.valid)return {acceleration:vec(),diagnostics};
    const rx=target.position.x-central.position.x,ry=target.position.y-central.position.y,rz=target.position.z-central.position.z,r=Math.hypot(rx,ry,rz);
    const vx=target.velocity.x-central.velocity.x,vy=target.velocity.y-central.velocity.y,vz=target.velocity.z-central.velocity.z;
    const v2=vx*vx+vy*vy+vz*vz,mu=G*central.massKg,nx=rx/r,ny=ry/r,nz=rz/r,ndotv=nx*vx+ny*vy+nz*vz;
    const scale=mu/(r*r*C*C),radial=4*mu/r-v2;
    return {acceleration:vec(scale*(radial*nx+4*ndotv*vx),scale*(radial*ny+4*ndotv*vy),scale*(radial*nz+4*ndotv*vz)),diagnostics};
  }

  function relativityDiagnosticsForState(bodies,options={}) {
    const config=solverOptions(options);
    if(config.relativityMode!=='schwarzschild-1pn'||bodies.length<2)return null;
    const targetIndex=clamp(config.relativityTargetIndex,1,bodies.length-1);
    return {...schwarzschildDiagnostics(bodies[0],bodies[targetIndex]),targetIndex};
  }

  function yukawaPotentialMultiplier(distanceM,alpha,lambdaM) {
    const r=Math.max(0,finite(distanceM,0)),lambda=Math.max(1e-30,finite(lambdaM,1));
    return 1+finite(alpha,0)*Math.exp(-r/lambda);
  }

  function yukawaForceMultiplier(distanceM,alpha,lambdaM) {
    const r=Math.max(0,finite(distanceM,0)),lambda=Math.max(1e-30,finite(lambdaM,1)),x=r/lambda;
    return 1+finite(alpha,0)*Math.exp(-x)*(1+x);
  }

  function hypothesisOptions(overrides={}) {
    const hasDocument=typeof document!=='undefined';
    const mode=overrides.hypothesisMode||(hasDocument?document.getElementById('gravity-hypothesis')?.value:null)||'off';
    const alpha=finite(overrides.hypothesisAlpha,hasDocument?document.getElementById('gravity-yukawa-alpha')?.value:.01);
    const lambdaM=Math.max(1e-9,finite(overrides.hypothesisLambdaM,hasDocument?finite(document.getElementById('gravity-yukawa-lambda-km')?.value,100000)*1000:1e8));
    return {hypothesisMode:mode==='yukawa'?'yukawa':'off',hypothesisAlpha:alpha,hypothesisLambdaM:lambdaM};
  }

  function hypothesisPairMultipliers(distanceM,options={}) {
    const config=hypothesisOptions(options);
    if(config.hypothesisMode!=='yukawa')return {potential:1,force:1,...config};
    return {
      potential:yukawaPotentialMultiplier(distanceM,config.hypothesisAlpha,config.hypothesisLambdaM),
      force:yukawaForceMultiplier(distanceM,config.hypothesisAlpha,config.hypothesisLambdaM),
      ...config
    };
  }

  function applyHypothesisToForce(force,distanceM,options={}) {
    const h=hypothesisPairMultipliers(distanceM,options);
    return {force:vec(force.x*h.force,force.y*h.force,force.z*h.force),hypothesis:h};
  }

  function hypothesisDiagnosticForState(bodies,options={}) {
    const h=hypothesisOptions(options);
    if(h.hypothesisMode==='off'||bodies.length<2)return {active:false,...h};
    let nearest=Infinity,pair=null;
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const r=Math.hypot(bodies[j].position.x-bodies[i].position.x,bodies[j].position.y-bodies[i].position.y,bodies[j].position.z-bodies[i].position.z);
      if(r<nearest){nearest=r;pair=[i,j];}
    }
    const m=hypothesisPairMultipliers(nearest,h);
    return {active:true,...h,nearestDistanceM:nearest,nearestPair:pair,forceMultiplier:m.force,potentialMultiplier:m.potential};
  }

  function syncHypothesisControls() {
    if(typeof document==='undefined')return;
    const active=document.getElementById('gravity-hypothesis')?.value==='yukawa';
    for(const id of ['gravity-yukawa-alpha','gravity-yukawa-lambda-km']){const node=document.getElementById(id);if(node)node.disabled=!active;}
    if(active){
      const relativity=document.getElementById('gravity-relativity');
      if(relativity&&relativity.value!=='off')relativity.value='off';
    }
  }

  function solverOptions(overrides={}) {
    const hasDocument=typeof document!=='undefined';
    const model=overrides.model||(hasDocument?document.getElementById('gravity-model')?.value:null)||'point';
    const resolution=clamp(Math.round(finite(overrides.resolution,hasDocument?document.getElementById('gravity-quadrature')?.value:DEFAULT_QUADRATURE_RESOLUTION)),2,MAX_QUADRATURE_RESOLUTION);
    const farFieldFactor=Math.max(0,finite(overrides.farFieldFactor,hasDocument?document.getElementById('gravity-far-field')?.value:DEFAULT_FAR_FIELD_FACTOR));
    const relativityMode=overrides.relativityMode||(hasDocument?document.getElementById('gravity-relativity')?.value:null)||'off';
    const relativityTargetIndex=Math.max(1,Math.round(finite(overrides.relativityTargetIndex,hasDocument?finite(document.getElementById('gravity-relativity-target')?.value,2)-1:1)));
    const hypothesis=hypothesisOptions(overrides);
    const normalizedRelativity=hypothesis.hypothesisMode==='off'&&relativityMode==='schwarzschild-1pn'?'schwarzschild-1pn':'off';
    return {model:model==='extended'?'extended':'point',resolution,farFieldFactor,relativityMode:normalizedRelativity,relativityTargetIndex,...hypothesis};
  }

  function pairForce(a,b,options={}) {
    const config=solverOptions(options),point=pointMassForce(a,b);
    if(config.model!=='extended'||!(point.distanceM>0)){
      const modified=applyHypothesisToForce(point.force,point.distanceM,config);
      return {...point,force:modified.force,hypothesis:modified.hypothesis};
    }
    const separation=point.distanceM,combinedRadius=a.radiusM+b.radiusM;
    if(isAnalyticSphere(a)&&isAnalyticSphere(b)&&separation>=combinedRadius){
      const modified=applyHypothesisToForce(point.force,separation,config);
      return {...point,force:modified.force,mode:'analytic-sphere',hypothesis:modified.hypothesis};
    }
    if(config.farFieldFactor>0&&separation>=config.farFieldFactor*combinedRadius){
      const modified=applyHypothesisToForce(point.force,separation,config);
      return {...point,force:modified.force,mode:'far-field-point-limit',hypothesis:modified.hypothesis};
    }
    const sa=buildMassSamples(a,config.resolution),sb=buildMassSamples(b,config.resolution),force=vec();let interactions=0;
    for(const pa of sa)for(const pb of sb){
      const dx=(b.position.x+pb.x)-(a.position.x+pa.x),dy=(b.position.y+pb.y)-(a.position.y+pa.y),dz=(b.position.z+pb.z)-(a.position.z+pa.z);
      const r2=dx*dx+dy*dy+dz*dz,r=Math.sqrt(r2);if(!(r>0))continue;
      const f=G*pa.massKg*pb.massKg/(r2*r);force.x+=dx*f;force.y+=dy*f;force.z+=dz*f;interactions++;
    }
    const modified=applyHypothesisToForce(force,separation,config);
    return {force:modified.force,distanceM:separation,mode:'extended-quadrature',interactions,hypothesis:modified.hypothesis};
  }

  function pairPotential(a,b,options={}) {
    const config=solverOptions(options),separation=Math.hypot(b.position.x-a.position.x,b.position.y-a.position.y,b.position.z-a.position.z);
    if(!(separation>0))return 0;
    const combinedRadius=a.radiusM+b.radiusM;
    if(config.model!=='extended'||(isAnalyticSphere(a)&&isAnalyticSphere(b)&&separation>=combinedRadius)||(config.farFieldFactor>0&&separation>=config.farFieldFactor*combinedRadius)){
      return -G*a.massKg*b.massKg/separation*hypothesisPairMultipliers(separation,config).potential;
    }
    const sa=buildMassSamples(a,config.resolution),sb=buildMassSamples(b,config.resolution);let potential=0;
    for(const pa of sa)for(const pb of sb){
      const r=Math.hypot((b.position.x+pb.x)-(a.position.x+pa.x),(b.position.y+pb.y)-(a.position.y+pa.y),(b.position.z+pb.z)-(a.position.z+pa.z));
      if(r>0)potential-=G*pa.massKg*pb.massKg/r;
    }
    return potential*hypothesisPairMultipliers(separation,config).potential;
  }

  function accelerations(bodies,options={}) {
    const config=solverOptions(options),acc=bodies.map(()=>vec());
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],pair=pairForce(a,b,config);
      acc[i].x+=pair.force.x/a.massKg;acc[i].y+=pair.force.y/a.massKg;acc[i].z+=pair.force.z/a.massKg;
      acc[j].x-=pair.force.x/b.massKg;acc[j].y-=pair.force.y/b.massKg;acc[j].z-=pair.force.z/b.massKg;
    }
    if(config.relativityMode==='schwarzschild-1pn'&&bodies.length>=2){
      const targetIndex=clamp(config.relativityTargetIndex,1,bodies.length-1),correction=schwarzschild1PNCorrection(bodies[0],bodies[targetIndex]);
      if(correction.diagnostics.valid){
        acc[targetIndex].x+=correction.acceleration.x;acc[targetIndex].y+=correction.acceleration.y;acc[targetIndex].z+=correction.acceleration.z;
      }
    }
    return acc;
  }

  function momentumVectorForBodies(bodies) {
    const p=vec();
    for(const b of bodies){p.x+=b.massKg*b.velocity.x;p.y+=b.massKg*b.velocity.y;p.z+=b.massKg*b.velocity.z;}
    return p;
  }

  function kineticEnergyForBodies(bodies) {
    let total=0;
    for(const b of bodies)total+=0.5*b.massKg*(b.velocity.x*b.velocity.x+b.velocity.y*b.velocity.y+b.velocity.z*b.velocity.z);
    return total;
  }

  function mergeCollisionBodies(a,b) {
    const totalMass=a.massKg+b.massKg,totalVolume=bodyVolumeM3(a)+bodyVolumeM3(b);
    const beforeMomentum=momentumVectorForBodies([a,b]),beforeKinetic=kineticEnergyForBodies([a,b]);
    const position=vec((a.position.x*a.massKg+b.position.x*b.massKg)/totalMass,(a.position.y*a.massKg+b.position.y*b.massKg)/totalMass,(a.position.z*a.massKg+b.position.z*b.massKg)/totalMass);
    const velocity=vec(beforeMomentum.x/totalMass,beforeMomentum.y/totalMass,beforeMomentum.z/totalMass);
    const equivalentRadius=Math.cbrt(3*totalVolume/(4*Math.PI));
    const merged=normalizeBody({name:`${a.name} + ${b.name}`,shape:'sphere',massMode:'mass',massKg:totalMass,dimensionsM:dimensionsFromRadius(equivalentRadius),rotationDeg:vec(),position,velocity},0);
    const afterMomentum=momentumVectorForBodies([merged]),afterKinetic=kineticEnergyForBodies([merged]);
    return {body:merged,audit:Object.freeze({
      model:'perfectly-inelastic-spherical-remnant',
      beforeMassKg:totalMass,afterMassKg:merged.massKg,massRelativeError:(merged.massKg-totalMass)/totalMass,
      momentumResidual:Math.hypot(afterMomentum.x-beforeMomentum.x,afterMomentum.y-beforeMomentum.y,afterMomentum.z-beforeMomentum.z),
      kineticBeforeJ:beforeKinetic,kineticAfterJ:afterKinetic,kineticDeltaJ:afterKinetic-beforeKinetic,
      volumeBeforeM3:totalVolume,volumeAfterM3:bodyVolumeM3(merged)
    })};
  }

  function elasticSphereCollisionResult(a,b) {
    if(!isAnalyticSphere(a)||!isAnalyticSphere(b))return {valid:false,reason:'Elastic hard-sphere response requires two homogeneous spherical bodies.'};
    const dx=b.position.x-a.position.x,dy=b.position.y-a.position.y,dz=b.position.z-a.position.z,dist=Math.hypot(dx,dy,dz);
    if(!(dist>0))return {valid:false,reason:'Coincident sphere centers do not define a collision normal.'};
    const n=vec(dx/dist,dy/dist,dz/dist),beforeMomentum=momentumVectorForBodies([a,b]),beforeKinetic=kineticEnergyForBodies([a,b]);
    const rv=vec(b.velocity.x-a.velocity.x,b.velocity.y-a.velocity.y,b.velocity.z-a.velocity.z),normalSpeed=rv.x*n.x+rv.y*n.y+rv.z*n.z;
    const aa=cloneBody(a),bb=cloneBody(b);
    if(normalSpeed<0){
      const impulse=-2*normalSpeed/(1/a.massKg+1/b.massKg);
      aa.velocity.x-=impulse*n.x/a.massKg;aa.velocity.y-=impulse*n.y/a.massKg;aa.velocity.z-=impulse*n.z/a.massKg;
      bb.velocity.x+=impulse*n.x/b.massKg;bb.velocity.y+=impulse*n.y/b.massKg;bb.velocity.z+=impulse*n.z/b.massKg;
    }
    const overlap=Math.max(0,a.radiusM+b.radiusM-dist)+Math.max(a.radiusM+b.radiusM,1)*1e-10,totalMass=a.massKg+b.massKg;
    aa.position.x-=n.x*overlap*b.massKg/totalMass;aa.position.y-=n.y*overlap*b.massKg/totalMass;aa.position.z-=n.z*overlap*b.massKg/totalMass;
    bb.position.x+=n.x*overlap*a.massKg/totalMass;bb.position.y+=n.y*overlap*a.massKg/totalMass;bb.position.z+=n.z*overlap*a.massKg/totalMass;
    const afterMomentum=momentumVectorForBodies([aa,bb]),afterKinetic=kineticEnergyForBodies([aa,bb]);
    return {valid:true,a:aa,b:bb,audit:Object.freeze({
      model:'frictionless-elastic-hard-sphere',
      momentumResidual:Math.hypot(afterMomentum.x-beforeMomentum.x,afterMomentum.y-beforeMomentum.y,afterMomentum.z-beforeMomentum.z),
      kineticRelativeError:(afterKinetic-beforeKinetic)/Math.max(Math.abs(beforeKinetic),1e-30),
      depenetrationM:overlap,normalClosingSpeedMps:normalSpeed
    })};
  }

  function collisionMode(){return typeof document!=='undefined'?(document.getElementById('gravity-collision-model')?.value||'halt'):'halt';}

  function renderCollisionAudit() {
    const node=typeof document!=='undefined'?document.getElementById('gravity-collision-audit'):null;if(!node)return;
    if(!lastCollisionAudit){node.textContent='No collision has been resolved in this run.';node.dataset.kind='';return;}
    if(lastCollisionAudit.model==='perfectly-inelastic-spherical-remnant'){
      node.textContent=`Last collision: inelastic spherical-remnant merge · mass error ${lastCollisionAudit.massRelativeError.toExponential(2)} · momentum residual ${formatScientific(lastCollisionAudit.momentumResidual,2)} kg·m/s · ΔKE ${formatScientific(lastCollisionAudit.kineticDeltaJ,2)} J. Angular momentum is not transferred into remnant spin in this approximation.`;
    }else{
      node.textContent=`Last collision: elastic hard-sphere response · momentum residual ${formatScientific(lastCollisionAudit.momentumResidual,2)} kg·m/s · kinetic-energy relative error ${lastCollisionAudit.kineticRelativeError.toExponential(2)} · depenetration ${formatDistance(lastCollisionAudit.depenetrationM)}.`;
    }
  }

  function resolveCollision(hit) {
    const mode=collisionMode(),a=state.bodies[hit.i],b=state.bodies[hit.j];
    if(mode==='halt')return {halt:true};
    if(mode==='merge'){
      const result=mergeCollisionBodies(a,b),next=state.bodies.filter((_,index)=>index!==hit.i&&index!==hit.j);
      next.splice(Math.min(hit.i,hit.j),0,result.body);state.bodies=next;lastCollisionAudit=result.audit;return {resolved:true,rebuild:true};
    }
    if(mode==='elastic'){
      const result=elasticSphereCollisionResult(a,b);
      if(!result.valid){setStatus(result.reason+' Simulation halted rather than applying an invalid rigid-body approximation.','warning');return {halt:true};}
      state.bodies[hit.i]=result.a;state.bodies[hit.j]=result.b;lastCollisionAudit=result.audit;return {resolved:true,rebuild:false};
    }
    return {halt:true};
  }

  function findCollision(bodies) {
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],d=Math.hypot(b.position.x-a.position.x,b.position.y-a.position.y,b.position.z-a.position.z);
      if(d<=a.radiusM+b.radiusM)return {i,j,d};
    }
    return null;
  }

  function stepSimulation(dt) {
    const config=solverOptions(),a0=accelerations(state.bodies,config);
    for(let i=0;i<state.bodies.length;i++){
      const b=state.bodies[i],a=a0[i];
      b.velocity.x+=0.5*a.x*dt;b.velocity.y+=0.5*a.y*dt;b.velocity.z+=0.5*a.z*dt;
      b.position.x+=b.velocity.x*dt;b.position.y+=b.velocity.y*dt;b.position.z+=b.velocity.z*dt;
    }
    let rebuilt=false;
    for(let pass=0;pass<MAX_BODIES;pass++){
      const hit=findCollision(state.bodies);if(!hit)break;
      const resolution=resolveCollision(hit);
      if(resolution.halt){
        running=false;setStatus(`Collision boundary reached: ${state.bodies[hit.i]?.name||'body'} ↔ ${state.bodies[hit.j]?.name||'body'}. Collision mode is Halt, or the selected response is invalid for these shapes.`,'warning');
        updateRunButton();renderCollisionAudit();return false;
      }
      rebuilt=rebuilt||resolution.rebuild;
    }
    const a1=accelerations(state.bodies,config);
    for(let i=0;i<state.bodies.length;i++){const b=state.bodies[i],a=a1[i];b.velocity.x+=0.5*a.x*dt;b.velocity.y+=0.5*a.y*dt;b.velocity.z+=0.5*a.z*dt;}
    state.timeS+=dt;
    if(rebuilt&&sceneState){const count=document.getElementById('gravity-body-count');if(count)count.value=state.bodies.length;renderObjectEditors();rebuildBodiesVisual();clearTrails();}
    renderCollisionAudit();return true;
  }

  function fieldAccelerationFromBody(body,point,options={}) {
    const config=solverOptions(options),dx=body.position.x-point.x,dy=body.position.y-point.y,dz=body.position.z-point.z,r=Math.hypot(dx,dy,dz);
    let out;
    if(config.model!=='extended'){
      if(!(r>0))out=vec();
      else {const factor=G*body.massKg/(r*r*r);out=vec(dx*factor,dy*factor,dz*factor);}
    }else if(isAnalyticSphere(body)){
      const radius=bodyHalfExtents(body).x;
      if(!(r>0))out=vec();
      else {const factor=r>=radius?G*body.massKg/(r*r*r):G*body.massKg/(radius*radius*radius);out=vec(dx*factor,dy*factor,dz*factor);}
    }else{
      const samples=buildMassSamples(body,config.resolution),sum=vec(),h=bodyHalfExtents(body),softening=Math.min(h.x,h.y,h.z)/config.resolution*.28;
      for(const s of samples){
        const sx=body.position.x+s.x-point.x,sy=body.position.y+s.y-point.y,sz=body.position.z+s.z-point.z;
        const r2=sx*sx+sy*sy+sz*sz+softening*softening,rr=Math.sqrt(r2),factor=G*s.massKg/(r2*rr);sum.x+=sx*factor;sum.y+=sy*factor;sum.z+=sz*factor;
      }
      out=sum;
    }
    return applyHypothesisToForce(out,r,config).force;
  }

  function potentialFromBody(body,point,options={}) {
    const config=solverOptions(options),dx=body.position.x-point.x,dy=body.position.y-point.y,dz=body.position.z-point.z,r=Math.hypot(dx,dy,dz);
    if(config.model!=='extended'){
      return r>0?-G*body.massKg/r*hypothesisPairMultipliers(r,config).potential:Number.NEGATIVE_INFINITY;
    }
    if(isAnalyticSphere(body)){
      const radius=bodyHalfExtents(body).x;
      if(r>=radius)return -G*body.massKg/r*hypothesisPairMultipliers(r,config).potential;
      const established=-G*body.massKg*(3*radius*radius-r*r)/(2*radius*radius*radius);
      return established*hypothesisPairMultipliers(r,config).potential;
    }
    const samples=buildMassSamples(body,config.resolution),h=bodyHalfExtents(body),softening=Math.min(h.x,h.y,h.z)/config.resolution*.28;
    let potential=0;
    for(const s of samples){
      const sx=body.position.x+s.x-point.x,sy=body.position.y+s.y-point.y,sz=body.position.z+s.z-point.z;
      potential-=G*s.massKg/Math.sqrt(sx*sx+sy*sy+sz*sz+softening*softening);
    }
    return potential*hypothesisPairMultipliers(r,config).potential;
  }

  function potentialAtPoint(point,bodies,options={}) {
    let potential=0;
    for(const body of bodies){const value=potentialFromBody(body,point,options);if(!Number.isFinite(value))return value;potential+=value;}
    return potential;
  }

  function tidalTensorFromBody(body,point,options={}) {
    const config=solverOptions(options),dx=body.position.x-point.x,dy=body.position.y-point.y,dz=body.position.z-point.z,r2=dx*dx+dy*dy+dz*dz,r=Math.sqrt(r2);
    if(config.model==='extended'&&isAnalyticSphere(body)){
      const radius=bodyHalfExtents(body).x;
      if(r<radius){
        const k=-G*body.massKg/(radius*radius*radius);
        return [k,0,0,k,0,k];
      }
    }
    const accumulate=(tensor,mass,x,y,z,softening=0)=>{
      const q2=x*x+y*y+z*z+softening*softening;if(!(q2>0))return;
      const q=Math.sqrt(q2),inv3=1/(q2*q),inv5=inv3/q2,f=G*mass;
      tensor[0]+=f*(3*x*x*inv5-inv3);
      tensor[1]+=f*(3*x*y*inv5);
      tensor[2]+=f*(3*x*z*inv5);
      tensor[3]+=f*(3*y*y*inv5-inv3);
      tensor[4]+=f*(3*y*z*inv5);
      tensor[5]+=f*(3*z*z*inv5-inv3);
    };
    if(config.model!=='extended'||isAnalyticSphere(body)){
      const tensor=[0,0,0,0,0,0];accumulate(tensor,body.massKg,dx,dy,dz);return tensor;
    }
    const tensor=[0,0,0,0,0,0],samples=buildMassSamples(body,config.resolution),h=bodyHalfExtents(body),softening=Math.min(h.x,h.y,h.z)/config.resolution*.28;
    for(const s of samples)accumulate(tensor,s.massKg,body.position.x+s.x-point.x,body.position.y+s.y-point.y,body.position.z+s.z-point.z,softening);
    return tensor;
  }

  function tidalTensorAtPoint(point,bodies,options={}) {
    const total=[0,0,0,0,0,0];
    for(const body of bodies){const t=tidalTensorFromBody(body,point,options);for(let i=0;i<6;i++)total[i]+=t[i];}
    return total;
  }

  function tidalFrobeniusNorm(tensor) {
    return Math.sqrt(tensor[0]*tensor[0]+tensor[3]*tensor[3]+tensor[5]*tensor[5]+2*(tensor[1]*tensor[1]+tensor[2]*tensor[2]+tensor[4]*tensor[4]));
  }

  function drawScalarMap(canvas,sampler,{kind='potential',resolution=32}={}) {
    if(!canvas)return;
    const width=Math.max(320,Math.round(canvas.clientWidth||640)),height=Math.max(260,Math.round(canvas.clientHeight||340));
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const n=clamp(Math.round(resolution),12,64),values=[],transformed=[];let rawMin=Infinity,rawMax=-Infinity,tMin=Infinity,tMax=-Infinity;
    for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){
      const raw=sampler(ix/(n-1)*2-1,iy/(n-1)*2-1),safe=Number.isFinite(raw)?raw:NaN;
      const tv=Number.isFinite(safe)?Math.log10(Math.max(Math.abs(safe),1e-300)):NaN;
      values.push(safe);transformed.push(tv);
      if(Number.isFinite(safe)){rawMin=Math.min(rawMin,safe);rawMax=Math.max(rawMax,safe);tMin=Math.min(tMin,tv);tMax=Math.max(tMax,tv);}
    }
    const cellW=width/n,cellH=height/n,range=Math.max(tMax-tMin,1e-12);
    for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){
      const tv=transformed[iy*n+ix],u=Number.isFinite(tv)?clamp((tv-tMin)/range,0,1):1;
      const hue=kind==='potential'?220+105*u:210-190*u;
      ctx.fillStyle=`hsl(${hue} 78% ${24+42*u}%)`;ctx.fillRect(ix*cellW,iy*cellH,Math.ceil(cellW)+1,Math.ceil(cellH)+1);
    }
    ctx.fillStyle='rgba(3,8,12,.78)';ctx.fillRect(8,8,Math.min(width-16,430),48);
    ctx.fillStyle='#e8f3f8';ctx.font='12px ui-monospace,monospace';
    const units=kind==='potential'?'m²/s²':'s⁻²';
    ctx.fillText(`${kind==='potential'?'Potential Φ':'Tidal tensor ‖T‖F'} · log-magnitude display`,16,27);
    ctx.fillStyle='#a9bac6';ctx.fillText(`physical range: ${formatScientific(rawMin,2)} → ${formatScientific(rawMax,2)} ${units}`,16,46);
  }

  function renderFieldMaps() {
    if(!state)return;
    const span=systemExtentM()*.9,z=finite(document.getElementById('gravity-field-z-km')?.value,0)*1000,resolution=clamp(Math.round(finite(document.getElementById('gravity-map-resolution')?.value,32)),12,64),config=solverOptions();
    const worldPoint=(nx,ny)=>viewToWorld({x:nx*span,y:ny*span,z});
    drawScalarMap(document.getElementById('gravity-potential-map'),(x,y)=>potentialAtPoint(worldPoint(x,y),state.bodies,config),{kind:'potential',resolution});
    drawScalarMap(document.getElementById('gravity-tidal-map'),(x,y)=>tidalFrobeniusNorm(tidalTensorAtPoint(worldPoint(x,y),state.bodies,config)),{kind:'tidal',resolution:Math.min(resolution,48)});
  }

  function accelerationAtPoint(point,bodies,options={}) {
    const out=vec(),config=solverOptions(options);
    for(const body of bodies){const a=fieldAccelerationFromBody(body,point,config);out.x+=a.x;out.y+=a.y;out.z+=a.z;}return out;
  }

  function diagnostics(bodies,options={}) {
    const config=solverOptions(options);let kinetic=0,potential=0,totalMass=0;const p=vec(),com=vec(),L=vec();let minSep=Infinity;
    for(const b of bodies){
      const v2=b.velocity.x*b.velocity.x+b.velocity.y*b.velocity.y+b.velocity.z*b.velocity.z;kinetic+=0.5*b.massKg*v2;totalMass+=b.massKg;
      p.x+=b.massKg*b.velocity.x;p.y+=b.massKg*b.velocity.y;p.z+=b.massKg*b.velocity.z;com.x+=b.massKg*b.position.x;com.y+=b.massKg*b.position.y;com.z+=b.massKg*b.position.z;
      L.x+=b.massKg*(b.position.y*b.velocity.z-b.position.z*b.velocity.y);L.y+=b.massKg*(b.position.z*b.velocity.x-b.position.x*b.velocity.z);L.z+=b.massKg*(b.position.x*b.velocity.y-b.position.y*b.velocity.x);
    }
    if(totalMass){com.x/=totalMass;com.y/=totalMass;com.z/=totalMass;}
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){potential+=pairPotential(bodies[i],bodies[j],config);minSep=Math.min(minSep,Math.hypot(bodies[j].position.x-bodies[i].position.x,bodies[j].position.y-bodies[i].position.y,bodies[j].position.z-bodies[i].position.z));}
    return {kinetic,potential,totalEnergy:kinetic+potential,momentum:Math.hypot(p.x,p.y,p.z),angularMomentum:Math.hypot(L.x,L.y,L.z),com,minSep};
  }

  function geometryDiagnostics(bodies,options={}) {
    const config=solverOptions({...options,model:'extended',farFieldFactor:0});let farFieldDelta=0,currentPairDelta=0,convergence=0,representative=null;
    for(const body of bodies){
      const direction=vec(.91,.34,.23),norm=vectorMagnitude(direction),distance=Math.max(body.radiusM*20,1);
      const point=vec(body.position.x+direction.x/norm*distance,body.position.y+direction.y/norm*distance,body.position.z+direction.z/norm*distance);
      const extended=fieldAccelerationFromBody(body,point,config),pointModel=fieldAccelerationFromBody(body,point,{model:'point'});
      farFieldDelta=Math.max(farFieldDelta,vectorDifferenceMagnitude(extended,pointModel)/Math.max(vectorMagnitude(pointModel),1e-30));
      if(!representative&&!isAnalyticSphere(body))representative={body,point:vec(body.position.x+direction.x/norm*body.radiusM*3,body.position.y+direction.y/norm*body.radiusM*3,body.position.z+direction.z/norm*body.radiusM*3)};
    }
    let closestPair=null,closestRatio=Infinity;
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const point=pointMassForce(bodies[i],bodies[j]),ratio=point.distanceM/Math.max(bodies[i].radiusM+bodies[j].radiusM,1e-30);
      if(ratio<closestRatio){closestRatio=ratio;closestPair=[bodies[i],bodies[j],point.force];}
    }
    if(closestPair){
      const extended=pairForce(closestPair[0],closestPair[1],config).force,point=closestPair[2];
      currentPairDelta=vectorDifferenceMagnitude(extended,point)/Math.max(vectorMagnitude(point),1e-30);
    }
    if(representative){
      const low=fieldAccelerationFromBody(representative.body,representative.point,{...config,resolution:config.resolution});
      const high=fieldAccelerationFromBody(representative.body,representative.point,{...config,resolution:Math.min(MAX_QUADRATURE_RESOLUTION,config.resolution+1)});
      convergence=vectorDifferenceMagnitude(low,high)/Math.max(vectorMagnitude(high),1e-30);
    }
    return {farFieldDelta,currentPairDelta,convergence,resolution:config.resolution};
  }

  function constantCurvatureK(model,radiusM) {
    const radius=Math.max(1e-12,finite(radiusM,1));
    if(model==='spherical')return 1/(radius*radius);
    if(model==='hyperbolic')return -1/(radius*radius);
    return 0;
  }

  function curvatureS(model,radiusM,geodesicRadiusM) {
    const R=Math.max(1e-12,finite(radiusM,1)),r=Math.max(0,finite(geodesicRadiusM,0)),x=r/R;
    if(model==='spherical')return R*Math.sin(Math.min(x,Math.PI));
    if(model==='hyperbolic')return R*Math.sinh(Math.min(x,20));
    return r;
  }

  function geodesicCircleMetrics(model,radiusM,geodesicRadiusM) {
    const R=Math.max(1e-12,finite(radiusM,1)),r=Math.max(0,finite(geodesicRadiusM,0));
    const maxSphere=Math.PI*R;
    const bounded=model==='spherical'?Math.min(r,maxSphere):r;
    const S=curvatureS(model,R,bounded);
    const circumference=2*Math.PI*S;
    let area;
    if(model==='spherical')area=2*Math.PI*R*R*(1-Math.cos(bounded/R));
    else if(model==='hyperbolic')area=2*Math.PI*R*R*(Math.cosh(Math.min(bounded/R,20))-1);
    else area=Math.PI*bounded*bounded;
    return {
      model,curvatureRadiusM:R,geodesicRadiusM:bounded,
      gaussianCurvature:constantCurvatureK(model,R),
      circumferenceM:circumference,
      areaM2:area,
      circumferenceRatio:bounded>0?circumference/(2*Math.PI*bounded):1,
      areaRatio:bounded>0?area/(Math.PI*bounded*bounded):1,
      jacobiRatio:bounded>0?S/bounded:1,
      sphereRadiusClamped:model==='spherical'&&r>maxSphere
    };
  }

  function equilateralGeodesicTriangle(model,radiusM,sideM) {
    const R=Math.max(1e-12,finite(radiusM,1)),raw=Math.max(0,finite(sideM,0));
    if(raw===0)return {model,sideM:0,angleRad:Math.PI/3,angleSumRad:Math.PI,excessRad:0};
    if(model==='euclidean')return {model,sideM:raw,angleRad:Math.PI/3,angleSumRad:Math.PI,excessRad:0};
    if(model==='spherical'){
      const side=Math.min(raw,Math.PI*R*.999999),x=side/R,c=Math.cos(x),s=Math.sin(x);
      const cosAngle=clamp((c-c*c)/Math.max(s*s,1e-30),-1,1),angle=Math.acos(cosAngle);
      return {model,sideM:side,angleRad:angle,angleSumRad:3*angle,excessRad:3*angle-Math.PI,sideClamped:raw!==side};
    }
    const x=Math.min(raw/R,20),ch=Math.cosh(x),sh=Math.sinh(x);
    const cosAngle=clamp((ch*ch-ch)/Math.max(sh*sh,1e-30),-1,1),angle=Math.acos(cosAngle);
    return {model,sideM:raw,angleRad:angle,angleSumRad:3*angle,excessRad:3*angle-Math.PI};
  }

  function intrinsicGeometryDiagnostics(model='euclidean',radiusM=1,probeRadiusM=1,triangleSideM=1) {
    const normalized=['euclidean','spherical','hyperbolic'].includes(model)?model:'euclidean';
    const circle=geodesicCircleMetrics(normalized,radiusM,probeRadiusM);
    const triangle=equilateralGeodesicTriangle(normalized,radiusM,triangleSideM);
    const metricFunction=normalized==='spherical'?'R sin(r/R)':normalized==='hyperbolic'?'R sinh(r/R)':'r';
    return Object.freeze({
      model:normalized,
      coordinateSystem:'geodesic polar coordinates (r, θ)',
      dimensionality:'2D intrinsic constant-curvature manifold',
      lineElement:`ds² = dr² + [${metricFunction}]² dθ²`,
      gaussianCurvature:circle.gaussianCurvature,
      curvatureRadiusM:circle.curvatureRadiusM,
      circle,
      triangle,
      embeddingRequired:false,
      physicalGravityCoupling:false,
      boundary:'This is intrinsic mathematical geometry. It does not alter the Newtonian or 1PN gravitational solver and is not an embedding-space model of gravity.'
    });
  }

  function renderIntrinsicGeometryLab() {
    if(typeof document==='undefined')return;
    const model=document.getElementById('gravity-geometry-model')?.value||'euclidean';
    const R=Math.max(1e-9,finite(document.getElementById('gravity-curvature-radius-km')?.value,1000)*1000);
    const probe=Math.max(0,finite(document.getElementById('gravity-geometry-probe-km')?.value,500)*1000);
    const side=Math.max(0,finite(document.getElementById('gravity-geometry-triangle-km')?.value,500)*1000);
    const d=intrinsicGeometryDiagnostics(model,R,probe,side);
    const values={
      'gravity-geometry-k':formatScientific(d.gaussianCurvature,3)+' m⁻²',
      'gravity-geometry-circ-ratio':d.circle.circumferenceRatio.toFixed(8),
      'gravity-geometry-area-ratio':d.circle.areaRatio.toFixed(8),
      'gravity-geometry-jacobi-ratio':d.circle.jacobiRatio.toFixed(8),
      'gravity-geometry-angle-sum':(d.triangle.angleSumRad*180/Math.PI).toFixed(8)+'°',
      'gravity-geometry-excess':(d.triangle.excessRad*180/Math.PI).toFixed(8)+'°'
    };
    for(const [id,value] of Object.entries(values)){const node=document.getElementById(id);if(node)node.textContent=value;}
    const metric=document.getElementById('gravity-geometry-metric');if(metric)metric.textContent=d.lineElement;
    const status=document.getElementById('gravity-geometry-status');
    if(status)status.textContent=`${d.dimensionality}. ${d.boundary}${d.circle.sphereRadiusClamped?' Spherical probe radius was clamped to πR.':''}${d.triangle.sideClamped?' Spherical triangle side was clamped below πR.':''}`;
    const canvas=document.getElementById('gravity-geometry-chart');if(!canvas)return;
    const width=Math.max(320,Math.round(canvas.clientWidth||700)),height=Math.max(260,Math.round(canvas.clientHeight||340)),dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#03070b';ctx.fillRect(0,0,width,height);
    const pad={l:55,r:18,t:28,b:42},plotW=width-pad.l-pad.r,plotH=height-pad.t-pad.b,maxX=model==='spherical'?Math.PI*.95:3;
    const samples=120,rows=[];
    for(let i=1;i<=samples;i++){
      const x=maxX*i/samples,m=geodesicCircleMetrics(model,R,x*R);
      rows.push({x,c:m.circumferenceRatio,a:m.areaRatio});
    }
    let maxY=1.05;for(const row of rows)maxY=Math.max(maxY,row.c,row.a);maxY=Math.min(maxY,12);
    ctx.strokeStyle='rgba(126,184,215,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,height-pad.b);ctx.lineTo(width-pad.r,height-pad.b);ctx.stroke();
    const draw=(key,stroke)=>{
      ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.beginPath();
      rows.forEach((row,i)=>{const x=pad.l+row.x/maxX*plotW,y=height-pad.b-clamp(row[key]/maxY,0,1)*plotH;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
    };
    draw('c','#72d5ff');draw('a','#f3c36a');
    ctx.fillStyle='#dceaf1';ctx.font='12px ui-monospace,monospace';ctx.fillText('r / R',width/2-20,height-12);
    ctx.save();ctx.translate(14,height/2+35);ctx.rotate(-Math.PI/2);ctx.fillText('ratio to Euclidean',0,0);ctx.restore();
    ctx.fillStyle='#72d5ff';ctx.fillText('C / 2πr',pad.l+8,pad.t+14);ctx.fillStyle='#f3c36a';ctx.fillText('A / πr²',pad.l+95,pad.t+14);
    ctx.fillStyle='#9fb0bc';ctx.fillText(`selected: ${model} · K=${formatScientific(d.gaussianCurvature,2)} m⁻²`,pad.l+8,height-pad.b+20);
  }

  function relativeDrift(value, initial) {
    const scale=Math.max(Math.abs(initial),1e-30);return (value-initial)/scale;
  }

  function formatScientific(v,d=3){return Number.isFinite(v)?v.toExponential(d):'—';}
  function formatTime(s){if(s<3600)return `${s.toFixed(1)} s`;if(s<86400)return `${(s/3600).toFixed(2)} h`;if(s<31557600)return `${(s/86400).toFixed(2)} d`;return `${(s/31557600).toFixed(3)} y`;}
  function formatDistance(m){if(!Number.isFinite(m))return '—';if(m>=AU_M*.01)return `${(m/AU_M).toFixed(5)} AU`;if(m>=1e6)return `${(m/1000).toLocaleString(undefined,{maximumFractionDigits:1})} km`;return `${m.toExponential(3)} m`;}

  function centerOfMass(bodies=state?.bodies||[]) {
    let mass=0,x=0,y=0,z=0;
    for(const b of bodies){mass+=b.massKg;x+=b.massKg*b.position.x;y+=b.massKg*b.position.y;z+=b.massKg*b.position.z;}
    return mass>0?vec(x/mass,y/mass,z/mass):vec();
  }

  function primaryReference() {
    if(!state?.bodies?.length)return {origin:vec(),angle:0};
    const primaries=state.bodies.length>=2?state.bodies.slice(0,2):state.bodies;
    const origin=centerOfMass(primaries);
    const angle=primaries.length>=2?Math.atan2(primaries[1].position.y-primaries[0].position.y,primaries[1].position.x-primaries[0].position.x):0;
    return {origin,angle};
  }

  function viewFrameMode(){return typeof document!=='undefined'?(document.getElementById('gravity-view-frame')?.value||'inertial'):'inertial';}

  function worldToView(position) {
    const mode=viewFrameMode();
    if(mode==='inertial')return vec(position.x,position.y,position.z);
    const ref=mode==='corotating'?primaryReference():{origin:centerOfMass(),angle:0};
    const x=position.x-ref.origin.x,y=position.y-ref.origin.y,z=position.z-ref.origin.z;
    if(mode!=='corotating')return vec(x,y,z);
    const c=Math.cos(ref.angle),s=Math.sin(ref.angle);
    return vec(x*c+y*s,-x*s+y*c,z);
  }

  function worldVectorToView(vector) {
    if(viewFrameMode()!=='corotating')return vec(vector.x,vector.y,vector.z);
    const angle=primaryReference().angle,c=Math.cos(angle),s=Math.sin(angle);
    return vec(vector.x*c+vector.y*s,-vector.x*s+vector.y*c,vector.z);
  }

  function viewToWorld(position) {
    const mode=viewFrameMode();
    if(mode==='inertial')return vec(position.x,position.y,position.z);
    const ref=mode==='corotating'?primaryReference():{origin:centerOfMass(),angle:0};
    if(mode!=='corotating')return vec(position.x+ref.origin.x,position.y+ref.origin.y,position.z+ref.origin.z);
    const c=Math.cos(ref.angle),s=Math.sin(ref.angle);
    return vec(position.x*c-position.y*s+ref.origin.x,position.x*s+position.y*c+ref.origin.y,position.z+ref.origin.z);
  }

  function systemExtentM(){
    let max=1;
    for(const b of state.bodies){const p=worldToView(b.position);max=Math.max(max,Math.abs(p.x),Math.abs(p.y),Math.abs(p.z));}
    return max*1.25;
  }

  function sceneCoordinate(position,extent){return new sceneState.THREE.Vector3(position.x/extent*5,position.y/extent*5,position.z/extent*5);}
  function scenePosition(position,extent){return sceneCoordinate(worldToView(position),extent);}
  function clearTrails(){for(const b of state?.bodies||[])b.trail=[];}

  function geometryFor(shape) {
    const T=sceneState.THREE;
    if(shape==='cube')return new T.BoxGeometry(2,2,2);
    if(shape==='tetrahedron')return new T.TetrahedronGeometry(1,0);
    if(shape==='octahedron')return new T.OctahedronGeometry(1,0);
    if(shape==='icosahedron')return new T.IcosahedronGeometry(1,0);
    if(shape==='disk')return new T.CylinderGeometry(1,1,2,36,1,false);
    if(shape==='torus')return new T.TorusGeometry(TORUS_MAJOR_RATIO,TORUS_MINOR_RATIO,18,42);
    return new T.SphereGeometry(1,32,22);
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
      const p=worldToView(b.position);b.trail.push(p);if(b.trail.length>TRAIL_POINTS)b.trail.shift();
      const pts=b.trail.map(v=>sceneCoordinate(v,extent));const line=sceneState.trailLines[i];line.visible=true;line.geometry.dispose();line.geometry=new sceneState.THREE.BufferGeometry().setFromPoints(pts);
    });
  }

  function rebuildFieldVectors(extent){
    const enabled=document.getElementById('gravity-field-vectors')?.checked;if(!enabled){sceneState.fieldGroup.visible=false;return;}sceneState.fieldGroup.visible=true;clearGroup(sceneState.fieldGroup);
    const T=sceneState.THREE,n=9,span=extent*.9;
    for(let yi=0;yi<n;yi++)for(let xi=0;xi<n;xi++){
      const viewPoint={x:(xi/(n-1)*2-1)*span,y:(yi/(n-1)*2-1)*span,z:0},point=viewToWorld(viewPoint);
      const worldAcceleration=accelerationAtPoint(point,state.bodies,solverOptions()),a=worldVectorToView(worldAcceleration),mag=Math.hypot(a.x,a.y,a.z);if(!(mag>0))continue;
      const dir=new T.Vector3(a.x,a.y,a.z).normalize();const origin=sceneCoordinate(viewPoint,extent);const length=clamp(.08+Math.log10(1+mag*1e8)*.06,.08,.42);
      const arrow=new T.ArrowHelper(dir,origin,length,0x76d7ff,.07,.035);sceneState.fieldGroup.add(arrow);
    }
  }

  function updateVisuals(forceField=false){
    if(!sceneState||!state)return;
    const extent=systemExtentM(),displayScale=finite(document.getElementById('gravity-display-radius')?.value,8);
    state.bodies.forEach((b,i)=>{
      const mesh=sceneState.bodyMeshes[i];if(!mesh)return;
      mesh.position.copy(scenePosition(b.position,extent));
      const h=bodyHalfExtents(b),factor=5/extent*displayScale;
      if(b.shape==='torus')mesh.scale.set(clamp(h.x*factor,.035,.95),clamp(h.y*factor,.035,.95),clamp(h.z/TORUS_MINOR_RATIO*factor,.035,.95));
      else mesh.scale.set(clamp(h.x*factor,.035,.95),clamp(h.y*factor,.035,.95),clamp(h.z*factor,.035,.95));
      mesh.rotation.set(finite(b.rotationDeg.x)*Math.PI/180,finite(b.rotationDeg.y)*Math.PI/180,finite(b.rotationDeg.z)*Math.PI/180);
    });
    if(running||forceField)updateTrails(extent);
    if(forceField||frame%12===0)rebuildFieldVectors(extent);
    if(forceField||frame%30===0||!geometryDiagnosticsCache)geometryDiagnosticsCache=geometryDiagnostics(state.bodies,solverOptions());
    if(forceField||frame%60===0)renderFieldMaps();
    if(forceField||frame%120===0)renderIntrinsicGeometryLab();
    renderMetrics();
  }

  function renderMetrics(){
    const config=solverOptions(),d=diagnostics(state.bodies,config);
    const e0=initialDiagnostics?.totalEnergy??d.totalEnergy,p0=initialDiagnostics?.momentum??d.momentum,l0=initialDiagnostics?.angularMomentum??d.angularMomentum;
    const g=geometryDiagnosticsCache||{farFieldDelta:0,currentPairDelta:0,convergence:0};
    const values={
      'gravity-time':formatTime(state.timeS),
      'gravity-energy-drift':`${(relativeDrift(d.totalEnergy,e0)*100).toExponential(2)}%`,
      'gravity-momentum':formatScientific(d.momentum-p0,2),
      'gravity-angular-drift':`${(relativeDrift(d.angularMomentum,l0)*100).toExponential(2)}%`,
      'gravity-min-separation':formatDistance(d.minSep),
      'gravity-shape-delta':`${(g.currentPairDelta*100).toExponential(2)}%`,
      'gravity-convergence':`${(g.convergence*100).toExponential(2)}%`,
      'gravity-far-field-delta':`${(g.farFieldDelta*100).toExponential(2)}%`
    };
    const rel=relativityDiagnosticsForState(state.bodies,config);
    values['gravity-rs']=rel?formatDistance(rel.schwarzschildRadiusM):'—';
    values['gravity-r-over-rs']=rel?formatScientific(rel.rOverRs,3):'—';
    values['gravity-clock-rate']=rel?rel.staticClockRate.toFixed(9):'—';
    values['gravity-precession']=rel&&Number.isFinite(rel.periapsisAdvanceRad)?`${(rel.periapsisAdvanceRad*180/Math.PI).toFixed(6)}°`:'—';
    for(const [id,value] of Object.entries(values)){const n=document.getElementById(id);if(n)n.textContent=value;}
    const relStatus=document.getElementById('gravity-relativity-status');
    if(relStatus){
      if(!rel)relStatus.textContent='Relativity layer off.';
      else if(rel.valid)relStatus.textContent=`1PN test-particle correction active on body ${rel.targetIndex+1}. Weak-field indicators: Rs/r=${rel.compactness.toExponential(3)}, v/c=${rel.speedFraction.toExponential(3)}, mass ratio=${rel.massRatio.toExponential(3)}. Newtonian energy-drift readout is not a conserved 1PN energy integral.`;
      else relStatus.textContent=`1PN correction withheld: ${rel.reasons.join('; ')}.`;
    }
    const hd=hypothesisDiagnosticForState(state.bodies,config),hMetric=document.getElementById('gravity-hypothesis-force'),hStatus=document.getElementById('gravity-hypothesis-status');
    if(hMetric)hMetric.textContent=hd.active?hd.forceMultiplier.toFixed(9):'1.000000000';
    if(hStatus){
      if(!hd.active)hStatus.textContent='Hypothesis layer off. No speculative force modifies the established baseline.';
      else hStatus.textContent=`HYPOTHESIS ACTIVE · Yukawa center-separation sensitivity: α=${hd.hypothesisAlpha}, λ=${formatDistance(hd.hypothesisLambdaM)}. Nearest pair multiplier=${hd.forceMultiplier.toFixed(9)} at ${formatDistance(hd.nearestDistanceM)}. This is a phenomenological sensitivity parameterization, not an empirical prediction; for extended shapes the Yukawa factor is applied to the established integrated force at center separation rather than re-integrating a Yukawa kernel over each volume element.`;
    }
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
    const km=v=>(v/1000).toPrecision(8).replace(/\.0+$/,'');
    const shapes=['sphere','cube','tetrahedron','octahedron','icosahedron','disk','torus'];
    const d=body.dimensionsM||dimensionsFromRadius(body.radiusM);
    return `<section class="gravity-object" data-body-index="${index}"><div class="gravity-object-head"><strong>${body.name}</strong><span>#${index+1}</span></div><div class="gravity-object-grid">
      <label>Name<input data-k="name" value="${body.name}"></label>
      <label>Shape<select data-k="shape">${shapes.map(s=>`<option value="${s}"${s===body.shape?' selected':''}>${s==='cube'?'cube / rectangular prism':s}</option>`).join('')}</select></label>
      <label>Mass basis<select data-k="massMode"><option value="mass"${body.massMode!=='density'?' selected':''}>Mass authoritative</option><option value="density"${body.massMode==='density'?' selected':''}>Density authoritative</option></select></label>
      <label>Mass kg<input data-k="massKg" type="number" step="any" value="${body.massKg}"></label>
      <label>Density kg/m³<input data-k="densityKgM3" type="number" step="any" value="${body.densityKgM3}"></label>
      <label>Size X km<input data-k="sizeXKm" type="number" step="any" value="${d.x/1000}"></label>
      <label>Size Y km<input data-k="sizeYKm" type="number" step="any" value="${d.y/1000}"></label>
      <label>Size Z km<input data-k="sizeZKm" type="number" step="any" value="${d.z/1000}"></label>
      <label>Rotation X°<input data-k="rotX" type="number" step="any" value="${finite(body.rotationDeg?.x)}"></label>
      <label>Rotation Y°<input data-k="rotY" type="number" step="any" value="${finite(body.rotationDeg?.y)}"></label>
      <label>Rotation Z°<input data-k="rotZ" type="number" step="any" value="${finite(body.rotationDeg?.z)}"></label>
      <label>X km<input data-k="xKm" type="number" step="any" value="${km(body.position.x)}"></label>
      <label>Y km<input data-k="yKm" type="number" step="any" value="${km(body.position.y)}"></label>
      <label>Z km<input data-k="zKm" type="number" step="any" value="${km(body.position.z)}"></label>
      <label>Vx km/s<input data-k="vxKms" type="number" step="any" value="${body.velocity.x/1000}"></label>
      <label>Vy km/s<input data-k="vyKms" type="number" step="any" value="${body.velocity.y/1000}"></label>
      <label>Vz km/s<input data-k="vzKms" type="number" step="any" value="${body.velocity.z/1000}"></label>
    </div></section>`;
  }

  function renderObjectEditors(){const list=document.getElementById('gravity-object-list');if(list)list.innerHTML=state.bodies.map(bodyEditorHtml).join('');}

  function applyEditors(){
    const cards=[...document.querySelectorAll('[data-body-index]')];
    const bodies=cards.map((card,i)=>{
      const get=k=>card.querySelector(`[data-k="${k}"]`)?.value;
      return {
        name:String(get('name')||`Body ${i+1}`),
        shape:String(get('shape')||'sphere'),
        massMode:get('massMode')==='density'?'density':'mass',
        massKg:Math.max(1e-18,finite(get('massKg'),EARTH_MASS)),
        densityKgM3:Math.max(1e-18,finite(get('densityKgM3'),1)),
        dimensionsM:{x:Math.max(1e-9,finite(get('sizeXKm'),1)*1000),y:Math.max(1e-9,finite(get('sizeYKm'),1)*1000),z:Math.max(1e-9,finite(get('sizeZKm'),1)*1000)},
        rotationDeg:vec(finite(get('rotX')),finite(get('rotY')),finite(get('rotZ'))),
        position:vec(finite(get('xKm'))*1000,finite(get('yKm'))*1000,finite(get('zKm'))*1000),
        velocity:vec(finite(get('vxKms'))*1000,finite(get('vyKms'))*1000,finite(get('vzKms'))*1000)
      };
    });
    state={bodies:normalizeBodies(bodies),timeS:0};
    baseline=state.bodies.map(cloneBody);
    initialDiagnostics=diagnostics(state.bodies,solverOptions());
    geometryDiagnosticsCache=null;
    lastCollisionAudit=null;
    running=false;
    updateRunButton();
    renderCollisionAudit();
    renderObjectEditors();
    rebuildBodiesVisual();
    updateVisuals(true);
    const config=solverOptions();
    const warning=config.model==='extended'&&config.resolution>=5&&state.bodies.length>=5?' High-resolution close-encounter quadrature can become computationally expensive; the far-field point-limit threshold reduces the usual cost.':'';
    setStatus(`Object geometry applied. ${config.model==='extended'?'Extended-body quadrature is active.':'Point-mass gravity is active.'}${warning}`);
  }

  function setBodyCount(count){
    count=clamp(Math.round(count),1,MAX_BODIES);
    const current=state.bodies.map(cloneBody);
    while(current.length<count)current.push(blankBody(current.length));
    current.length=count;
    state={bodies:normalizeBodies(current),timeS:0};
    baseline=state.bodies.map(cloneBody);
    initialDiagnostics=diagnostics(state.bodies,solverOptions());
    geometryDiagnosticsCache=null;
    renderObjectEditors();
    rebuildBodiesVisual();
    updateVisuals(true);
  }

  function loadPreset(id){
    state={bodies:normalizeBodies(presetBodies(id)),timeS:0};
    baseline=state.bodies.map(cloneBody);
    initialDiagnostics=diagnostics(state.bodies,solverOptions());
    geometryDiagnosticsCache=null;
    lastCollisionAudit=null;
    running=false;
    updateRunButton();
    renderCollisionAudit();
    const count=document.getElementById('gravity-body-count');if(count)count.value=state.bodies.length;
    const note=document.getElementById('gravity-preset-note');if(note)note.textContent=PRESET_INFO[id]||PRESET_INFO['earth-moon'];
    const frameSelect=document.getElementById('gravity-view-frame');if(frameSelect)frameSelect.value=id.startsWith('earth-moon-l')?'corotating':'inertial';
    const relativity=document.getElementById('gravity-relativity'),relTarget=document.getElementById('gravity-relativity-target'),timestep=document.getElementById('gravity-timestep');
    if(relativity)relativity.value=id==='compact-precession'?'schwarzschild-1pn':'off';
    if(relTarget)relTarget.value='2';
    const hypothesis=document.getElementById('gravity-hypothesis');if(hypothesis)hypothesis.value='off';syncHypothesisControls();
    if(id==='compact-precession'&&timestep)timestep.value='0.002';
    clearTrails();
    renderObjectEditors();
    if(sceneState){rebuildBodiesVisual();updateVisuals(true);}
    setStatus('Preset loaded. The preset note identifies whether the initial condition is idealized or reference-data based; none of these presets are date-specific ephemerides.');
  }

  function reset(){
    state={bodies:baseline.map(cloneBody),timeS:0};
    initialDiagnostics=diagnostics(state.bodies,solverOptions());
    geometryDiagnosticsCache=null;
    lastCollisionAudit=null;
    running=false;
    updateRunButton();
    renderCollisionAudit();
    renderObjectEditors();
    rebuildBodiesVisual();
    updateVisuals(true);
    setStatus('Simulation reset to the last applied initial state.');
  }

  function buildUi(host){
    host.innerHTML=`<section class="gravity-lab"><header class="gravity-header"><p class="gravity-eyebrow">Scientific Tools · Gravitation</p><h1>Gravitational Simulation Laboratory</h1><p>Newtonian N-body laboratory with a point-mass baseline and an explicitly selectable extended-body solver. Uniform spheres use the analytic shell-theorem solution; boxes, tetrahedra, octahedra, icosahedra, disks, and tori use deterministic equal-volume quadrature with symmetric pair forces, far-field convergence diagnostics, and SI-unit state.</p></header><div class="gravity-layout"><aside class="gravity-controls">
      <section class="gravity-card"><h2>Simulation</h2>
        <label>Physical preset<select id="gravity-preset"><option value="earth-moon">Earth–Moon circular pair</option><option value="sun-earth">Sun–Earth circular pair</option><option value="equal-binary">Equal-mass shaped binary benchmark</option><option value="three-body">Three-body free evolution benchmark</option><option value="earth-moon-l1">Earth–Moon CR3BP · L1</option><option value="earth-moon-l4">Earth–Moon CR3BP · L4</option><option value="earth-moon-l5">Earth–Moon CR3BP · L5</option><option value="hierarchical-triple">Hierarchical triple benchmark</option><option value="compact-precession">Compact-source 1PN precession demo</option></select></label>
        <div id="gravity-preset-note" class="gravity-source-note"></div>
        <label>Display reference frame<select id="gravity-view-frame"><option value="inertial">Inertial coordinates</option><option value="barycentric">System center-of-mass frame</option><option value="corotating">Co-rotating with bodies 1–2</option></select></label>
        <label>Gravity interaction model<select id="gravity-model"><option value="extended" selected>Extended Geometry · analytic sphere + quadrature solids</option><option value="point">Point Mass · center-of-mass baseline</option></select></label>
        <label>Relativity layer<select id="gravity-relativity"><option value="off" selected>Off · Newtonian dynamics only</option><option value="schwarzschild-1pn">Schwarzschild 1PN test-particle correction</option></select></label>
        <label>Relativistic target body number<input id="gravity-relativity-target" type="number" min="2" max="12" value="2"></label>
        <div id="gravity-relativity-status" class="gravity-source-note">Relativity layer off.</div>
        <label>Optional hypothesis layer<select id="gravity-hypothesis"><option value="off" selected>Off · established models only</option><option value="yukawa">Yukawa fifth-force sensitivity · phenomenological</option></select></label>
        <label>Yukawa strength α<input id="gravity-yukawa-alpha" type="number" step="any" value="0.01" disabled></label>
        <label>Yukawa range λ (km)<input id="gravity-yukawa-lambda-km" type="number" min="0.000001" step="any" value="100000" disabled></label>
        <div id="gravity-hypothesis-status" class="gravity-source-note">Hypothesis layer off. No speculative force modifies the established baseline.</div>
        <label>Quadrature cells / axis<input id="gravity-quadrature" type="number" min="2" max="${MAX_QUADRATURE_RESOLUTION}" value="${DEFAULT_QUADRATURE_RESOLUTION}"></label>
        <label>Far-field point-limit threshold (combined bounding radii; 0 = never)<input id="gravity-far-field" type="number" min="0" step=".5" value="${DEFAULT_FAR_FIELD_FACTOR}"></label>
        <label>Collision handling<select id="gravity-collision-model"><option value="halt" selected>Halt at collision boundary</option><option value="merge">Perfectly inelastic merge · spherical remnant</option><option value="elastic">Frictionless elastic hard spheres · spheres only</option></select></label>
        <label>Body count 1–12<input id="gravity-body-count" type="number" min="1" max="12" value="2"></label>
        <label>Integrator timestep (s)<input id="gravity-timestep" type="number" min="0.001" step="any" value="60"></label>
        <label>Integration steps / rendered frame<input id="gravity-steps-frame" type="number" min="1" max="64" value="8"></label>
        <label>Display size multiplier<input id="gravity-display-radius" type="range" min="1" max="80" step="1" value="12"></label>
        <label>Field diagnostic slice Z (km, display-frame coordinates)<input id="gravity-field-z-km" type="number" step="any" value="0"></label>
        <label>Field-map resolution<input id="gravity-map-resolution" type="number" min="12" max="64" value="32"></label>
        <label class="gravity-check"><input id="gravity-trails" type="checkbox" checked> Show trajectory trails</label>
        <label class="gravity-check"><input id="gravity-field-vectors" type="checkbox" checked> Show gravitational-field vectors</label>
        <div class="gravity-actions"><button id="gravity-run" class="primary">Run</button><button id="gravity-step">Single step</button><button id="gravity-reset">Reset</button><button id="gravity-apply">Apply object parameters</button></div><div id="gravity-status" class="gravity-status">Ready.</div><div id="gravity-collision-audit" class="gravity-status">No collision has been resolved in this run.</div>
      </section>
      <section class="gravity-card"><h3>Objects & Euclidean mass geometry</h3><p class="gravity-source-note">Mass or density can be authoritative. Size X/Y/Z controls the physical mass distribution and collision bounding volume independently from the display multiplier. Static Euler orientation affects non-spherical gravity; rotational dynamics are not yet modeled.</p><div id="gravity-object-list" class="gravity-object-list"></div></section>
    </aside><main class="gravity-workspace">
      <section class="gravity-metrics">
        <div class="gravity-metric"><span>Simulated time</span><strong id="gravity-time">0 s</strong></div>
        <div class="gravity-metric"><span>Total-energy drift</span><strong id="gravity-energy-drift">0%</strong></div>
        <div class="gravity-metric"><span>Momentum change kg·m/s</span><strong id="gravity-momentum">0</strong></div>
        <div class="gravity-metric"><span>Angular-momentum drift</span><strong id="gravity-angular-drift">0%</strong></div>
        <div class="gravity-metric"><span>Minimum separation</span><strong id="gravity-min-separation">—</strong></div>
        <div class="gravity-metric"><span>Current shape-force Δ vs point</span><strong id="gravity-shape-delta">0%</strong></div>
        <div class="gravity-metric"><span>Quadrature convergence Δ</span><strong id="gravity-convergence">0%</strong></div>
        <div class="gravity-metric"><span>20R far-field Δ vs point</span><strong id="gravity-far-field-delta">0%</strong></div>
        <div class="gravity-metric"><span>Schwarzschild radius</span><strong id="gravity-rs">—</strong></div>
        <div class="gravity-metric"><span>Target radius / Rs</span><strong id="gravity-r-over-rs">—</strong></div>
        <div class="gravity-metric"><span>Static clock dτ/dt</span><strong id="gravity-clock-rate">—</strong></div>
        <div class="gravity-metric"><span>1PN Δperiapsis / orbit</span><strong id="gravity-precession">—</strong></div>
        <div class="gravity-metric"><span>Hypothesis force multiplier</span><strong id="gravity-hypothesis-force">1.000000</strong></div>
      </section>
      <div id="gravity-viewport" class="gravity-viewport" aria-label="Three-dimensional gravitational simulation viewport"></div>
      <section class="gravity-field-grid">
        <article class="gravity-card"><h3>Newtonian potential slice</h3><p class="gravity-source-note">Scalar potential Φ on the selected display-frame plane. Color is logarithmic in |Φ|; the readout preserves physical m²/s² values.</p><canvas id="gravity-potential-map" class="gravity-scalar-map"></canvas></article>
        <article class="gravity-card"><h3>Tidal tensor slice</h3><p class="gravity-source-note">Frobenius norm of the Newtonian tidal tensor ∂gᵢ/∂xⱼ in s⁻². This is differential acceleration structure, not spacetime curvature.</p><canvas id="gravity-tidal-map" class="gravity-scalar-map"></canvas></article>
      </section>
      <section class="gravity-card"><h3>Intrinsic Geometry Laboratory · GRAV-07</h3>
        <p class="gravity-source-note">This workbench is deliberately decoupled from physical gravity. It evaluates the intrinsic metric of ideal 2D constant-curvature spaces without pretending a Euclidean 3D embedding is the geometry itself.</p>
        <div class="gravity-geometry-controls">
          <label>Intrinsic geometry<select id="gravity-geometry-model"><option value="euclidean">Euclidean · K = 0</option><option value="spherical">Spherical · K = +1/R²</option><option value="hyperbolic">Hyperbolic · K = −1/R²</option></select></label>
          <label>Curvature radius R (km)<input id="gravity-curvature-radius-km" type="number" min="0.000001" step="any" value="1000"></label>
          <label>Geodesic-circle radius r (km)<input id="gravity-geometry-probe-km" type="number" min="0" step="any" value="500"></label>
          <label>Equilateral geodesic side (km)<input id="gravity-geometry-triangle-km" type="number" min="0" step="any" value="500"></label>
        </div>
        <div class="gravity-geometry-metrics">
          <div class="gravity-metric"><span>Gaussian curvature K</span><strong id="gravity-geometry-k">0 m⁻²</strong></div>
          <div class="gravity-metric"><span>Circumference ratio C/(2πr)</span><strong id="gravity-geometry-circ-ratio">1</strong></div>
          <div class="gravity-metric"><span>Disk-area ratio A/(πr²)</span><strong id="gravity-geometry-area-ratio">1</strong></div>
          <div class="gravity-metric"><span>Geodesic deviation J/r</span><strong id="gravity-geometry-jacobi-ratio">1</strong></div>
          <div class="gravity-metric"><span>Equilateral angle sum</span><strong id="gravity-geometry-angle-sum">180°</strong></div>
          <div class="gravity-metric"><span>Angle excess / defect</span><strong id="gravity-geometry-excess">0°</strong></div>
        </div>
        <p><strong>Intrinsic metric:</strong> <code id="gravity-geometry-metric">ds² = dr² + r² dθ²</code></p>
        <canvas id="gravity-geometry-chart" class="gravity-scalar-map"></canvas>
        <div id="gravity-geometry-status" class="gravity-status"></div>
      </section>
      <section class="gravity-card"><h3>GRAV-02/04 physical model</h3>
        <p><strong>Analytic baseline:</strong> a homogeneous spherical body uses g = GM/r² outside and g = GMr/R³ inside. Two separated homogeneous spheres therefore retain the exact point-mass mutual force by the shell theorem.</p>
        <p><strong>Extended solids:</strong> rectangular prisms, tetrahedra, octahedra, icosahedra, finite elliptical disks, ellipsoids, and tori are represented by deterministic equal-volume cell-center mass quadrature. Near-body pair forces sum every participating mass-element pair once and apply equal/opposite forces to the two centers of mass. This preserves linear momentum even when shape corrections are active.</p>
        <p><strong>Numerical diagnostics:</strong> the laboratory reports the current extended-force difference from the point model, a representative resolution-to-resolution field difference, and a standardized 20-bounding-radius far-field difference. Field samples inside discretized non-spherical bodies use cell-scale regularization because a point mass at a quadrature-cell center is not the continuous cell volume.</p>
        <p><strong>Field diagnostics:</strong> Φ is evaluated analytically for homogeneous spheres and by the same volume quadrature for other solids. The tidal map sums the symmetric Newtonian acceleration-gradient tensor from the same mass model. Outside point masses the tensor trace approaches zero; inside a homogeneous sphere the analytic tensor is isotropically compressive.</p>
        <p><strong>Collision models:</strong> Halt preserves the pre-contact model boundary. Perfectly inelastic merge conserves total mass, volume, and linear momentum while replacing the pair with an equivalent-volume spherical remnant; lost orbital angular momentum is not converted into spin. Elastic response is available only for two homogeneous spheres and uses a frictionless hard-sphere impulse plus center-of-mass-preserving depenetration.</p>
        <p><strong>Relativistic layer:</strong> the optional Schwarzschild 1PN mode adds the standard weak-field test-particle correction to one selected body's Newtonian acceleration around body 1. It is automatically withheld when the target/central mass ratio exceeds 10⁻³, speed reaches 0.3c, or radius falls within 10 Schwarzschild radii. Diagnostics include Rs = 2GM/c², static Schwarzschild clock rate √(1−Rs/r), and the first-order periapsis advance 6πGM/[a(1−e²)c²]. This is not a full Einstein-field-equation or exact geodesic solver.</p>
        <p><strong>Hypothesis isolation:</strong> Yukawa sensitivity uses V = VNewton[1 + α exp(−r/λ)] and force multiplier 1 + α exp(−r/λ)(1+r/λ). It is off by default, visibly labeled HYPOTHESIS when enabled, and mutually exclusive with the 1PN layer in the interactive UI. The intrinsic GRAV-07 geometry workbench never modifies dynamics. No fictional Blacklight gravity layer is exposed until it has an implemented equation and observable behavior.</p>
        <div class="gravity-layer-register"><strong>Layer register:</strong> <span>Established: Newtonian point/extended mass</span><span>Approximation: Schwarzschild 1PN test particle</span><span>Mathematics-only: constant-curvature intrinsic geometry</span><span>Hypothesis: Yukawa sensitivity, opt-in</span></div>
        <p class="gravity-source-note">Reference constants/presets: G = 6.67430×10⁻¹¹ m³·kg⁻¹·s⁻² (2022 CODATA recommended value); Earth mass 5.9722×10²⁴ kg and mean radius 6371 km; Sun mass 1.9884×10³⁰ kg and mean radius 695,700 km; mean Earth–Moon distance 384,400 km. Preset values are reference initial conditions, not date-specific ephemerides.</p>
      </section>
      <section class="gravity-boundary"><strong>Scientific boundary:</strong> GRAV-02/03 remains Newtonian. Shape-dependent forces here are Euclidean volume integrations, not spacetime curvature. L1/L4/L5 presets use idealized circular restricted-three-body initial conditions with a 1 kg tracer; the tracer is not literally massless, but its back-reaction is negligible at the displayed scale. Co-rotating and barycentric modes transform only the visualization, never the solver state. Collision detection is presently a conservative bounding-volume stop, not exact mesh contact. Rigid-body spin and tidal deformation remain incomplete. The optional 1PN layer is a weak-field Schwarzschild test-particle approximation only; exact Schwarzschild geodesics, comparable-mass post-Newtonian dynamics, Kerr/frame dragging, and gravitational radiation remain separate future solvers. The GRAV-07 constant-curvature workbench is an intrinsic mathematics layer only and is not coupled to gravitational dynamics.</section>
    </main></div></section>`;
  }

  async function mountPage(host=document.getElementById('gravitational-simulation-root')){
    root=host;if(!root)throw new Error('Gravity laboratory page root is missing.');
    buildUi(root);
    loadPreset('earth-moon');
    document.getElementById('gravity-preset').addEventListener('change',e=>loadPreset(e.target.value));
    document.getElementById('gravity-body-count').addEventListener('change',e=>setBodyCount(finite(e.target.value,2)));
    document.getElementById('gravity-run').addEventListener('click',()=>{running=!running;updateRunButton();setStatus(running?'Simulation running.':'Simulation paused.');});
    document.getElementById('gravity-step').addEventListener('click',()=>{running=false;updateRunButton();stepSimulation(Math.max(.001,finite(document.getElementById('gravity-timestep').value,60)));updateVisuals(true);});
    document.getElementById('gravity-reset').addEventListener('click',reset);
    document.getElementById('gravity-apply').addEventListener('click',applyEditors);
    for(const id of ['gravity-field-vectors','gravity-model','gravity-quadrature','gravity-far-field','gravity-relativity-target']) document.getElementById(id)?.addEventListener('change',()=>{geometryDiagnosticsCache=null;initialDiagnostics=diagnostics(state.bodies,solverOptions());updateVisuals(true);});
    document.getElementById('gravity-relativity')?.addEventListener('change',event=>{if(event.currentTarget.value!=='off'){const h=document.getElementById('gravity-hypothesis');if(h)h.value='off';syncHypothesisControls();}geometryDiagnosticsCache=null;initialDiagnostics=diagnostics(state.bodies,solverOptions());updateVisuals(true);});
    document.getElementById('gravity-hypothesis')?.addEventListener('change',()=>{syncHypothesisControls();geometryDiagnosticsCache=null;initialDiagnostics=diagnostics(state.bodies,solverOptions());updateVisuals(true);});
    for(const id of ['gravity-yukawa-alpha','gravity-yukawa-lambda-km']) document.getElementById(id)?.addEventListener('input',()=>{geometryDiagnosticsCache=null;initialDiagnostics=diagnostics(state.bodies,solverOptions());updateVisuals(true);});
    document.getElementById('gravity-view-frame')?.addEventListener('change',()=>{clearTrails();updateVisuals(true);});
    for(const id of ['gravity-field-z-km','gravity-map-resolution']) document.getElementById(id)?.addEventListener('change',()=>renderFieldMaps());
    for(const id of ['gravity-geometry-model','gravity-curvature-radius-km','gravity-geometry-probe-km','gravity-geometry-triangle-km']) document.getElementById(id)?.addEventListener('input',()=>renderIntrinsicGeometryLab());
    document.getElementById('gravity-display-radius').addEventListener('input',()=>updateVisuals(false));
    await initScene();
    return root;
  }

  const api=Object.freeze({
    mountPage,
    constants:Object.freeze({G,C,AU_M,EARTH_MASS,EARTH_RADIUS_M,MOON_MASS,MOON_RADIUS_M,MOON_DISTANCE_M,SUN_MASS,SUN_RADIUS_M,MAX_BODIES,DEFAULT_QUADRATURE_RESOLUTION,MAX_QUADRATURE_RESOLUTION,DEFAULT_FAR_FIELD_FACTOR}),
    bodyVolumeM3,bodyBoundingRadiusM,normalizeBody,buildMassSamples,fieldAccelerationFromBody,potentialFromBody,potentialAtPoint,tidalTensorFromBody,tidalTensorAtPoint,tidalFrobeniusNorm,pointMassForce,pairForce,accelerations,diagnostics,geometryDiagnostics,mergeCollisionBodies,elasticSphereCollisionResult,schwarzschildRadius,orbitalElementsAround,schwarzschildDiagnostics,schwarzschild1PNCorrection,yukawaPotentialMultiplier,yukawaForceMultiplier,hypothesisPairMultipliers,hypothesisDiagnosticForState,constantCurvatureK,curvatureS,geodesicCircleMetrics,equilateralGeodesicTriangle,intrinsicGeometryDiagnostics,restrictedThreeBodyState,collinearLagrangeX,effectiveRotatingAccelerationX
  });
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.GravitationalSimulationLab=api;
})();