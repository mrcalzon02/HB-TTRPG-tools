(() => {
  "use strict";

  if (window.EXO_STATION_KEY_CURSOR) return;

  const CURSOR_SIZE = 72;
  const STATION_KEY_PERSPECTIVE = Object.freeze({
    helm: Object.freeze({ rotation: -34, roll: -5, skewX: -7, scaleX: .98, scaleY: .88, offsetX: 2, offsetY: 5, hotspotX: 14, hotspotY: 7, bitting: [2,5,1,4,2,6] }),
    navigation: Object.freeze({ rotation: -31, roll: -8, skewX: -3, scaleX: .93, scaleY: .91, offsetX: 4, offsetY: 4, hotspotX: 14, hotspotY: 7, bitting: [5,1,4,6,2,3] }),
    gunnery: Object.freeze({ rotation: -37, roll: -2, skewX: -10, scaleX: 1.01, scaleY: .84, offsetX: 1, offsetY: 7, hotspotX: 13, hotspotY: 7, bitting: [6,3,5,1,4,2] }),
    engineering: Object.freeze({ rotation: -29, roll: -10, skewX: -5, scaleX: .96, scaleY: .94, offsetX: 5, offsetY: 3, hotspotX: 15, hotspotY: 7, bitting: [3,6,2,5,1,4] }),
    science: Object.freeze({ rotation: -35, roll: 1, skewX: -8, scaleX: .91, scaleY: .87, offsetX: 3, offsetY: 6, hotspotX: 13, hotspotY: 8, bitting: [1,4,6,2,5,3] }),
    comms: Object.freeze({ rotation: -32, roll: -6, skewX: -2, scaleX: .95, scaleY: .90, offsetX: 4, offsetY: 5, hotspotX: 14, hotspotY: 7, bitting: [4,2,6,3,5,1] })
  });

  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const CURSOR_CHARM_MOTION = Object.fromEntries(Object.keys(STATION_KEY_PERSPECTIVE).map(station => [station, {
    angle: (Math.random()-.5)*1.4,
    velocity: 0,
    phase: Math.random()*Math.PI*2,
    last: 0
  }]));

  let currentStation = null;
  let overlay = null;
  let observer = null;
  let syncQueued = false;
  let moveQueued = false;
  let charmAnimationFrame = 0;
  let pointerX = -200;
  let pointerY = -200;
  let pointerVisible = false;
  let pointerDown = false;
  let lastPointerType = "mouse";

  function perspectiveFor(station) {
    return STATION_KEY_PERSPECTIVE[station] || STATION_KEY_PERSPECTIVE.helm;
  }

  function rotatePoint(x,y,cx,cy,degrees) {
    const radians = degrees*Math.PI/180;
    const dx = x-cx;
    const dy = y-cy;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {x:cx+dx*cos-dy*sin,y:cy+dx*sin+dy*cos};
  }

  function keyCharmGeometry(profile,rotation) {
    const cx = 60;
    const top = 22;
    const h = Number(profile?.height) || 42;
    const pivotY = top+h/2;
    const anchor = rotatePoint(cx,top+h-5,cx,pivotY,rotation);
    const hinge = {x:anchor.x+7.5,y:anchor.y+14.5};
    const mid = {x:anchor.x+2.5,y:anchor.y+7.4};
    return {anchor,mid,hinge};
  }

  function panelCharmGeometry(profile,rotation) {
    const cx = 60;
    const top = 22;
    const h = Number(profile?.height) || 42;
    const anchor = rotatePoint(cx,top+h-5,cx,top+h/2,rotation);
    const hinge = {x:60,y:76};
    const mid = {x:(anchor.x+hinge.x)/2+2.4,y:(anchor.y+hinge.y)/2+1.8};
    return {anchor,mid,hinge};
  }

  function capPath(profile, cx, top) {
    const w = Number(profile.width) || 30;
    const h = Number(profile.height) || 42;
    const radius = Number(profile.radius) || 4;
    const x = cx - w / 2;
    const y = top;
    const b = x + w;
    switch (profile.shape) {
      case "chamfer": return `M${x+4} ${y} H${b-4} L${b} ${y+4} V${y+h-4} L${b-4} ${y+h} H${x+4} L${x} ${y+h-4} V${y+4}Z`;
      case "hex": return `M${x+5} ${y} H${b-5} L${b} ${y+8} V${y+h-8} L${b-5} ${y+h} H${x+5} L${x} ${y+h-8} V${y+8}Z`;
      case "taper": return `M${x+3} ${y} H${b-3} L${b} ${y+h-8} L${b-4} ${y+h} H${x+4} L${x} ${y+h-8}Z`;
      case "notch": return `M${x} ${y} H${b} V${y+12} L${b-4} ${y+16} L${b} ${y+20} V${y+h} H${x} V${y+20} L${x+4} ${y+16} L${x} ${y+12}Z`;
      case "shield": return `M${x+3} ${y} H${b-3} L${b} ${y+5} V${y+h-14} Q${cx} ${y+h} ${cx} ${y+h} Q${x} ${y+h-14} ${x} ${y+h-14} V${y+5}Z`;
      case "dogtag": return `M${x+4} ${y} H${b-4} Q${b} ${y} ${b} ${y+4} V${y+h-4} Q${b} ${y+h} ${b-4} ${y+h} H${x+4} Q${x} ${y+h} ${x} ${y+h-4} V${y+4} Q${x} ${y} ${x+4} ${y}Z`;
      case "waist": return `M${x} ${y} H${b} L${b-3} ${y+12} L${b} ${y+24} V${y+h} H${x} V${y+24} L${x+3} ${y+12}Z`;
      default: return `M${x+radius} ${y} H${b-radius} Q${b} ${y} ${b} ${y+radius} V${y+h-radius} Q${b} ${y+h} ${b-radius} ${y+h} H${x+radius} Q${x} ${y+h} ${x} ${y+h-radius} V${y+radius} Q${x} ${y} ${x+radius} ${y}Z`;
    }
  }

  function keyCapMarkup(profile, rotation) {
    const cx = 60;
    const top = 22;
    const w = Number(profile.width) || 30;
    const h = Number(profile.height) || 42;
    const inner = { ...profile, width: Math.max(10, w - 5), height: Math.max(12, h - 6), radius: Math.max(1, (Number(profile.radius) || 4) - 1) };
    return `<g transform="rotate(${rotation} ${cx} ${top+h/2})"><path d="${capPath(profile,cx,top)}" fill="${profile.edge || '#3f4648'}"/><path d="${capPath(inner,cx,top+3)}" fill="${profile.face || '#777'}" stroke="${profile.highlight || '#aaa'}" stroke-width="1.5"/><path d="M${cx-4} ${top+9} H${cx+4} M${cx-4} ${top+14} H${cx+3}" stroke="${profile.highlight || '#aaa'}" stroke-width="1.4" opacity=".72"/><circle cx="${cx}" cy="${top+h-5}" r="3.4" fill="${profile.edge || '#3f4648'}" stroke="${profile.highlight || '#aaa'}" stroke-width="1.3"/></g>`;
  }

  function bladeMarkup(perspective) {
    const cx = 60;
    const shoulderY = 25;
    const tipY = -34;
    const half = 5.4;
    const left = [];
    const right = [];
    const step = (shoulderY - tipY - 16) / Math.max(1, perspective.bitting.length - 1);
    perspective.bitting.forEach((depth,index) => {
      const y = tipY + 11 + index * step;
      const inset = 1.1 + depth * .48;
      left.push(`${(cx-half+inset).toFixed(2)},${y.toFixed(2)}`);
      right.unshift(`${(cx+half-inset*.58).toFixed(2)},${(y+2.8).toFixed(2)}`);
    });
    const path = `M${cx-2.2},${tipY} L${cx-half},${tipY+8} L${left.join(" L")} L${cx-half},${shoulderY-5} L${cx-8.8},${shoulderY} L${cx+8.8},${shoulderY-5} L${right.join(" L")} L${cx+half},${tipY+8} L${cx+2.2},${tipY} Z`;
    return `<g transform="rotate(${perspective.rotation} 60 47)"><path d="${path}" fill="url(#bladeMetal)" stroke="#242729" stroke-width="1.25"/><path d="M55.7 ${tipY+12} L55.7 ${shoulderY-7} M59.2 ${tipY+6} L59.2 ${shoulderY-4}" stroke="#f1eee3" stroke-width=".8" opacity=".62"/><path d="M63.5 ${tipY+10} L63.5 ${shoulderY-7}" stroke="#555b5d" stroke-width="1" opacity=".8"/></g>`;
  }

  function charmSymbolMarkup(charm) {
    const fill = charm?.fill || "#8d7548";
    const accent = charm?.accent || "#e2cf8b";
    const stroke = "#28231d";
    const shape = String(charm?.shape || "tag").toLowerCase();
    const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"`;
    if (shape === "star") return `<path ${common} d="M0 1 L5 12 L17 13 L8 21 L11 34 L0 27 L-11 34 L-8 21 L-17 13 L-5 12Z"/>`;
    if (shape === "heart") return `<path ${common} d="M0 36 L-14 20 Q-21 11 -14 5 Q-6 -2 0 7 Q6 -2 14 5 Q21 11 14 20Z"/>`;
    if (shape === "moon") return `<path ${common} d="M8 1 Q-7 7 -7 20 Q-7 32 8 38 Q-1 29 2 19 Q4 10 8 1Z"/>`;
    if (shape === "lightning") return `<path ${common} d="M4 1 L-12 20 H-2 L-7 38 L14 15 H4Z"/>`;
    if (shape === "gear") return `<g ${common}><path d="M-4 2 H4 L6 8 L12 5 L17 11 L13 16 L19 19 L17 27 L11 27 L10 34 H2 L0 29 L-6 33 L-12 27 L-9 22 L-16 19 L-14 11 L-8 12Z"/><circle cx="1" cy="19" r="7" fill="none"/></g>`;
    if (shape === "anchor") return `<g ${common}><circle cx="0" cy="5" r="4"/><path d="M0 9 V31 M-10 14 H10 M-16 24 Q-12 34 0 35 Q12 34 16 24 M-16 24 L-11 20 M16 24 L11 20" fill="none" stroke-width="3"/></g>`;
    if (shape === "rocket") return `<g ${common}><path d="M0 1 Q10 10 8 24 L4 31 H-4 L-8 24 Q-10 10 0 1Z"/><circle cx="0" cy="15" r="4" fill="none"/><path d="M-5 29 L-10 38 L-2 34 M5 29 L10 38 L2 34"/></g>`;
    if (shape === "skull") return `<g ${common}><path d="M-13 13 Q-13 2 0 1 Q13 2 13 13 Q13 23 7 27 L7 34 H-7 V27 Q-13 23 -13 13Z"/><circle cx="-5" cy="14" r="3.5" fill="${stroke}"/><circle cx="5" cy="14" r="3.5" fill="${stroke}"/></g>`;
    if (shape === "dice") return `<g ${common}><rect x="-15" y="3" width="25" height="25" rx="4"/><circle cx="-8" cy="10" r="2" fill="${accent}" stroke="none"/><circle cx="3" cy="21" r="2" fill="${accent}" stroke="none"/></g>`;
    if (shape === "planet") return `<g ${common}><circle cx="0" cy="19" r="11"/><ellipse cx="0" cy="19" rx="22" ry="7" transform="rotate(-14 0 19)" fill="none"/></g>`;
    if (shape === "mushroom") return `<g ${common}><path d="M-17 16 Q-10 1 0 1 Q10 1 17 16Z"/><path d="M-5 16 H5 L8 35 H-8Z"/></g>`;
    if (shape === "wrench") return `<path ${common} d="M-12 2 Q-4 0 0 6 L-5 11 L0 16 L5 11 L17 27 Q20 31 16 35 Q12 38 8 34 L-5 18 Q-12 20 -16 14 Q-20 7 -12 2Z"/>`;
    const letters = shape.replace(/[^a-z0-9]/g,"").slice(0,2).toUpperCase() || "K";
    return `<g ${common}><path d="M-12 3 H12 L15 8 V34 H-15 V8Z"/><circle cx="0" cy="8" r="3" fill="none"/><text x="0" y="25" text-anchor="middle" fill="${accent}" stroke="none" font-size="11" font-family="ui-monospace,monospace" font-weight="900">${letters}</text></g>`;
  }

  function charmMarkup(station,charm,profile,rotation) {
    const {anchor,mid,hinge} = keyCharmGeometry(profile,rotation);
    const hx = hinge.x.toFixed(2);
    const hy = hinge.y.toFixed(2);
    return `<g data-cursor-key-chain="${station}"><path d="M${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)} Q${mid.x.toFixed(2)} ${mid.y.toFixed(2)} ${hx} ${hy}" fill="none" stroke="#8c7a55" stroke-width="1.8" stroke-linecap="round"/><circle cx="${mid.x.toFixed(2)}" cy="${mid.y.toFixed(2)}" r="1.45" fill="#ad965f"/><circle cx="${hx}" cy="${hy}" r="2.3" fill="none" stroke="#ad965f" stroke-width="1.45"/></g><g data-cursor-key-charm="${station}" data-charm-hinge-x="${hx}" data-charm-hinge-y="${hy}" transform="rotate(0 ${hx} ${hy})"><circle cx="${hx}" cy="${hy}" r="1.25" fill="#ad965f"/><g transform="translate(${hx} ${(hinge.y+2.2).toFixed(2)}) scale(.72)">${charmSymbolMarkup(charm)}</g></g>`;
  }

  function cursorSvg(station) {
    const loadout = window.EXO_KEY_LOADOUT?.[station];
    if (!loadout?.cap || !loadout?.charm) return null;
    const perspective = perspectiveFor(station);
    const outer = `translate(${perspective.offsetX} ${perspective.offsetY}) rotate(${perspective.roll} 60 48) skewX(${perspective.skewX}) scale(${perspective.scaleX} ${perspective.scaleY})`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="-8 -42 145 178" overflow="visible" aria-hidden="true"><defs><linearGradient id="bladeMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#41484b"/><stop offset=".23" stop-color="#d7d9d4"/><stop offset=".48" stop-color="#7d8586"/><stop offset=".72" stop-color="#ece8dc"/><stop offset="1" stop-color="#474d4f"/></linearGradient><filter id="shadow" x="-45%" y="-45%" width="190%" height="190%"><feDropShadow dx="1" dy="4" stdDeviation="2.5" flood-color="#000" flood-opacity=".84"/></filter></defs><g filter="url(#shadow)" transform="${outer}">${bladeMarkup(perspective)}${keyCapMarkup(loadout.cap,perspective.rotation)}${charmMarkup(station,loadout.charm,loadout.cap,perspective.rotation)}</g></svg>`;
  }

  function stationFromDom() {
    const selected = document.querySelector("#station-tabs [data-station][aria-selected='true']");
    if (selected?.dataset.station) return selected.dataset.station;
    const controls = document.querySelector("#station-panel .exo-physical-controls");
    const stationClass = controls ? [...controls.classList].find(name => name.startsWith("station-")) : null;
    return stationClass ? stationClass.slice("station-".length) : null;
  }

  function upgradePanelCharm(station) {
    const loadout = window.EXO_KEY_LOADOUT?.[station];
    const body = document.querySelector(`#station-panel [data-key-charm="${station}"]`);
    if (!loadout?.cap || !body || body.dataset.physicsUpgraded === "true") return;
    const svg = body.closest("svg");
    const cap = svg?.querySelector("[data-key-cap]");
    if (!svg || !cap) return;
    const rotation = Number(cap.dataset.keyBaseRotation);
    const geometry = panelCharmGeometry(loadout.cap,Number.isFinite(rotation)?rotation:-34);
    const symbol = [...body.children].find(child => child.tagName?.toLowerCase() === "g");
    if (!symbol) return;
    const symbolMarkup = symbol.innerHTML;
    const namespace = "http://www.w3.org/2000/svg";
    const chain = document.createElementNS(namespace,"g");
    chain.dataset.panelKeyChain = station;
    chain.innerHTML = `<path d="M${geometry.anchor.x.toFixed(2)} ${geometry.anchor.y.toFixed(2)} Q${geometry.mid.x.toFixed(2)} ${geometry.mid.y.toFixed(2)} 60 76" fill="none" stroke="#8c7a55" stroke-width="1.8" stroke-linecap="round"/><circle cx="${geometry.mid.x.toFixed(2)}" cy="${geometry.mid.y.toFixed(2)}" r="1.45" fill="#ad965f"/><circle cx="60" cy="76" r="2.4" fill="none" stroke="#ad965f" stroke-width="1.45"/>`;
    body.parentNode?.insertBefore(chain,body);
    body.innerHTML = `<circle cx="60" cy="76" r="1.25" fill="#ad965f"/><g transform="translate(60 78.2) scale(.72)">${symbolMarkup}</g>`;
    body.dataset.physicsUpgraded = "true";
    body.dataset.charmHingeX = "60";
    body.dataset.charmHingeY = "76";
    body.setAttribute("transform","rotate(0 60 76)");
  }

  function ensureOverlay() {
    if (overlay?.isConnected) return overlay;
    overlay = document.createElement("div");
    overlay.className = "exo-station-key-cursor-overlay";
    overlay.dataset.visible = "false";
    overlay.dataset.down = "false";
    overlay.setAttribute("aria-hidden","true");
    document.body.appendChild(overlay);
    document.body.classList.add("exo-key-cursor-ready");
    return overlay;
  }

  function syncCursor() {
    syncQueued = false;
    const station = stationFromDom();
    if (!station) return;
    upgradePanelCharm(station);
    const node = ensureOverlay();
    if (station !== currentStation || !node.firstElementChild) {
      const svg = cursorSvg(station);
      if (!svg) return;
      currentStation = station;
      node.innerHTML = svg;
      node.dataset.station = station;
      document.body.dataset.exoKeyCursorStation = station;
    }
    queueMove();
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(syncCursor);
  }

  function animateCharm(now) {
    const motion = CURSOR_CHARM_MOTION[currentStation];
    const node = overlay?.querySelector?.("[data-cursor-key-charm]");
    if (motion && node) {
      const dt = motion.last ? Math.min(.035,(now-motion.last)/1000) : .016;
      motion.last = now;
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduced) {
        motion.angle = 0;
        motion.velocity = 0;
      } else {
        const ambient = Math.sin(now/1800+motion.phase)*.42 + Math.sin(now/640+motion.phase*1.8)*.16;
        const acceleration = (ambient-motion.angle)*8.2-motion.velocity*4.7;
        motion.velocity += acceleration*dt;
        motion.angle = clamp(motion.angle+motion.velocity*dt,-15,15);
      }
      const hx = Number(node.dataset.charmHingeX) || 60;
      const hy = Number(node.dataset.charmHingeY) || 76;
      node.setAttribute("transform",`rotate(${motion.angle.toFixed(2)} ${hx.toFixed(2)} ${hy.toFixed(2)})`);
    }
    charmAnimationFrame = requestAnimationFrame(animateCharm);
  }

  function renderPointer() {
    moveQueued = false;
    if (!overlay) return;
    const perspective = perspectiveFor(currentStation);
    overlay.dataset.visible = pointerVisible && lastPointerType !== "touch" ? "true" : "false";
    overlay.dataset.down = pointerDown ? "true" : "false";
    overlay.style.transform = `translate3d(${(pointerX-perspective.hotspotX).toFixed(1)}px,${(pointerY-perspective.hotspotY).toFixed(1)}px,0)`;
  }

  function queueMove() {
    if (moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(renderPointer);
  }

  function isTextTarget(target) {
    return Boolean(target?.closest?.('input[type="text"],input[type="search"],textarea,[contenteditable="true"]'));
  }

  function handlePointerMove(event) {
    lastPointerType = event.pointerType || "mouse";
    const nextX = event.clientX;
    const nextY = event.clientY;
    if (currentStation && pointerX > -100 && pointerY > -100 && lastPointerType !== "touch") {
      const motion = CURSOR_CHARM_MOTION[currentStation];
      if (motion) {
        const dx = nextX-pointerX;
        const dy = nextY-pointerY;
        motion.velocity = clamp(motion.velocity+dx*.18-dy*.055,-48,48);
      }
    }
    pointerX = nextX;
    pointerY = nextY;
    pointerVisible = !isTextTarget(event.target) && lastPointerType !== "touch";
    queueMove();
  }

  function install() {
    const tabs = document.getElementById("station-tabs");
    const panel = document.getElementById("station-panel");
    if (!tabs || !panel || !window.EXO_KEY_LOADOUT || !document.body) return;
    ensureOverlay();
    observer = new MutationObserver(queueSync);
    observer.observe(tabs,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-selected"]});
    observer.observe(panel,{childList:true,subtree:true});
    document.addEventListener("pointermove",handlePointerMove,{passive:true,capture:true});
    document.addEventListener("pointerdown",event=>{lastPointerType=event.pointerType||"mouse";pointerDown=true;const motion=CURSOR_CHARM_MOTION[currentStation];if(motion)motion.velocity=clamp(motion.velocity+2.4,-48,48);handlePointerMove(event);},{passive:true,capture:true});
    document.addEventListener("pointerup",()=>{pointerDown=false;queueMove();},{passive:true,capture:true});
    document.addEventListener("pointercancel",()=>{pointerDown=false;pointerVisible=false;queueMove();},{passive:true,capture:true});
    document.addEventListener("pointerout",event=>{if(event.relatedTarget===null){pointerVisible=false;queueMove();}},{passive:true,capture:true});
    document.addEventListener("pointerover",handlePointerMove,{passive:true,capture:true});
    document.addEventListener("click",event=>{if(event.target.closest?.("#station-tabs [data-station],#crew-scenario-reset"))queueSync();},true);
    window.addEventListener("blur",()=>{pointerVisible=false;queueMove();},{passive:true});
    queueSync();
    if (!charmAnimationFrame) charmAnimationFrame = requestAnimationFrame(animateCharm);
    window.addEventListener("beforeunload",()=>{cancelAnimationFrame(charmAnimationFrame);charmAnimationFrame=0;},{once:true});
  }

  window.EXO_STATION_KEY_CURSOR = Object.freeze({
    perspectives: STATION_KEY_PERSPECTIVE,
    sync: queueSync,
    get station(){return currentStation;},
    get overlay(){return overlay;}
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();