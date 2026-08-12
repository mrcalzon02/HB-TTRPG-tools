(() => {
  "use strict";

  if (window.EXO_OBSERVER_MODE) return;

  const OPERATION_INTERVAL_MS = 25000;
  const CURSOR_TRAVEL_MS = 5200;
  const GESTURE_TRAVEL_MS = 3600;
  const STATION_SWITCH_MS = 5200;
  const POINTER_ID = 7719;
  const STATIONS = ["helm","navigation","gunnery","engineering","science","comms"];
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const randomBetween = (min,max) => min + Math.random() * (max-min);
  const randomInt = (min,max) => Math.floor(randomBetween(min,max+1));
  const now = () => performance.now();

  let active = false;
  let runToken = 0;
  let operationsRemaining = 0;
  let activeStation = null;
  let lastControlCode = "";
  let cursorPoint = { x: Math.max(48,window.innerWidth*.78), y: Math.max(48,window.innerHeight*.34) };
  let currentFocus = null;
  let toggleButton = null;

  function selectedStation() {
    return document.querySelector('#station-tabs [data-station][aria-selected="true"]')?.dataset.station || "helm";
  }

  function tokenAlive(token) {
    return active && token === runToken;
  }

  function sleep(ms,token) {
    return new Promise(resolve => {
      const id = window.setTimeout(() => resolve(tokenAlive(token)),Math.max(0,ms));
      if (!tokenAlive(token)) {
        clearTimeout(id);
        resolve(false);
      }
    });
  }

  function cursorTargetAt(x,y,fallback) {
    return document.elementFromPoint(clamp(x,1,window.innerWidth-2),clamp(y,1,window.innerHeight-2)) || fallback || document.body;
  }

  function pointerEvent(type,target,x,y,buttons=0,button=0) {
    const event = new PointerEvent(type,{
      bubbles:true,
      cancelable:true,
      composed:true,
      pointerId:POINTER_ID,
      pointerType:"mouse",
      isPrimary:true,
      clientX:x,
      clientY:y,
      screenX:x,
      screenY:y,
      buttons,
      button
    });
    target.dispatchEvent(event);
  }

  function mouseClick(target,x,y) {
    target.dispatchEvent(new MouseEvent("click",{
      bubbles:true,
      cancelable:true,
      composed:true,
      clientX:x,
      clientY:y,
      screenX:x,
      screenY:y,
      button:0,
      buttons:0
    }));
  }

  function pointFor(element,xBias=.5,yBias=.5) {
    const r = element.getBoundingClientRect();
    return {
      x: clamp(r.left + r.width*xBias,8,window.innerWidth-8),
      y: clamp(r.top + r.height*yBias,8,window.innerHeight-8)
    };
  }

  async function moveCursorTo(element,duration,token,pointOverride=null) {
    if (!tokenAlive(token) || !element?.isConnected) return false;
    const end = pointOverride || pointFor(element,.5,.5);
    const start = { ...cursorPoint };
    const started = now();
    const easing = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    return await new Promise(resolve => {
      const frame = () => {
        if (!tokenAlive(token) || !element?.isConnected) { resolve(false); return; }
        const t = clamp((now()-started)/Math.max(120,duration),0,1);
        const e = easing(t);
        const x = start.x + (end.x-start.x)*e;
        const y = start.y + (end.y-start.y)*e;
        cursorPoint = {x,y};
        pointerEvent("pointermove",cursorTargetAt(x,y,element),x,y,0,-1);
        if (t < 1) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function clearFocus() {
    if (currentFocus?.isConnected) currentFocus.removeAttribute("data-observer-focus");
    currentFocus = null;
    document.querySelectorAll("[data-observer-tab-focus]").forEach(node=>node.removeAttribute("data-observer-tab-focus"));
  }

  function focusCamera(element) {
    if (!element?.isConnected) return;
    clearFocus();
    const host = element.closest?.(".exo-device-block") || element;
    currentFocus = host;
    host.setAttribute("data-observer-focus","true");
    const panel = document.getElementById("station-panel");
    if (panel && panel.contains(host)) {
      const pr = panel.getBoundingClientRect();
      const tr = host.getBoundingClientRect();
      const x = clamp(((tr.left+tr.width/2-pr.left)/Math.max(1,pr.width))*100,9,91);
      const y = clamp(((tr.top+tr.height/2-pr.top)/Math.max(1,pr.height))*100,8,92);
      panel.style.setProperty("--exo-observer-origin-x",`${x.toFixed(1)}%`);
      panel.style.setProperty("--exo-observer-origin-y",`${y.toFixed(1)}%`);
    }
    const r = host.getBoundingClientRect();
    const desired = window.scrollY + r.top + r.height/2 - window.innerHeight*.54;
    window.scrollTo({top:Math.max(0,desired),behavior:"smooth"});
  }

  async function tapElement(element,token) {
    if (!tokenAlive(token) || !element?.isConnected || element.disabled) return false;
    const p = pointFor(element,.5,.5);
    const moved = await moveCursorTo(element,Math.max(1000,CURSOR_TRAVEL_MS*.52),token,p);
    if (!moved || !tokenAlive(token)) return false;
    pointerEvent("pointerdown",element,p.x,p.y,1,0);
    await sleep(260,token);
    if (!tokenAlive(token)) return false;
    pointerEvent("pointerup",element,p.x,p.y,0,0);
    mouseClick(element,p.x,p.y);
    return true;
  }

  function chooseStation() {
    const current = selectedStation();
    const choices = STATIONS.filter(station=>station!==current && document.querySelector(`#station-tabs [data-station="${station}"]`));
    return choices[Math.floor(Math.random()*choices.length)] || current;
  }

  async function switchStation(token) {
    const station = chooseStation();
    const tab = document.querySelector(`#station-tabs [data-station="${station}"]`);
    if (!tab || !tokenAlive(token)) return false;
    clearFocus();
    tab.setAttribute("data-observer-tab-focus","true");
    const r = tab.getBoundingClientRect();
    const desired = window.scrollY + r.top - window.innerHeight*.22;
    window.scrollTo({top:Math.max(0,desired),behavior:"smooth"});
    await moveCursorTo(tab,STATION_SWITCH_MS,token,pointFor(tab,.5,.55));
    if (!tokenAlive(token)) return false;
    const ok = await tapElement(tab,token);
    tab.removeAttribute("data-observer-tab-focus");
    if (!ok) return false;
    await sleep(1150,token);
    activeStation = selectedStation();
    operationsRemaining = randomInt(2,3);
    lastControlCode = "";
    return true;
  }

  function candidateControls() {
    const panel = document.getElementById("station-panel");
    if (!panel) return [];
    return [...panel.querySelectorAll(".exo-device-block")].filter(host => {
      if (!host.isConnected || host.classList.contains("exo-lockout-device")) return false;
      if (host.closest(".exo-procedure-setup")) return false;
      const code = host.dataset.controlCode || "";
      if (code && code === lastControlCode) return false;
      const gesture = host.querySelector('[data-control-gesture]:not([aria-disabled="true"])');
      const range = host.querySelector('input[data-proc-range]:not(:disabled),input[data-proc-slider]:not(:disabled)');
      const button = host.querySelector('.exo-hardware-actions button:not(:disabled),button[data-proc-input][data-control-id]:not(:disabled)');
      return Boolean(gesture || range || button);
    });
  }

  function chooseControl() {
    let candidates = candidateControls();
    if (!candidates.length) {
      lastControlCode = "";
      candidates = candidateControls();
    }
    if (!candidates.length) return null;
    const weighted = [];
    candidates.forEach(host => {
      const gesture = host.querySelector('[data-control-gesture]:not([aria-disabled="true"])');
      weighted.push(host);
      if (gesture) weighted.push(host,host);
    });
    return weighted[Math.floor(Math.random()*weighted.length)];
  }

  function patchPointerCapture(element) {
    const hadOwn = Object.prototype.hasOwnProperty.call(element,"setPointerCapture");
    const original = element.setPointerCapture;
    try { Object.defineProperty(element,"setPointerCapture",{configurable:true,writable:true,value:()=>{}}); }
    catch (_) { try { element.setPointerCapture=()=>{}; } catch (_) {} }
    return () => {
      try {
        if (hadOwn) Object.defineProperty(element,"setPointerCapture",{configurable:true,writable:true,value:original});
        else delete element.setPointerCapture;
      } catch (_) {}
    };
  }

  function gestureVector(gesture) {
    const kind = gesture.dataset.controlGesture || "";
    const angle = Number(gesture.dataset.dialAngle);
    const count = Math.max(2,Number(gesture.dataset.dialCount)||3);
    if (["selector","rotary","wheel"].includes(kind)) {
      if (Number.isFinite(angle)) {
        const current = clamp(Math.round((angle+62)/124*(count-1)),0,count-1);
        const choices = Array.from({length:count},(_,i)=>i).filter(i=>i!==current);
        const target = choices[Math.floor(Math.random()*choices.length)] ?? ((current+1)%count);
        const targetAngle = -62 + 124*(target/(count-1));
        return {dx:clamp((targetAngle-angle)/.9,-118,118),dy:randomBetween(-5,5)};
      }
      return {dx:(Math.random()<.5?-1:1)*randomBetween(46,92),dy:randomBetween(-5,5)};
    }
    if (kind === "thumbwheel") return {dx:randomBetween(-4,4),dy:(Math.random()<.5?-1:1)*randomBetween(54,96)};
    if (kind === "dual-slider") return {dx:randomBetween(-4,4),dy:(Math.random()<.5?-1:1)*randomBetween(58,96)};
    if (kind === "yoke") {
      const horizontal = Math.random()<.5;
      return horizontal ? {dx:(Math.random()<.5?-1:1)*randomBetween(30,54),dy:randomBetween(-10,10)} : {dx:randomBetween(-10,10),dy:(Math.random()<.5?-1:1)*randomBetween(30,50)};
    }
    if (["lever","knife-switch","toggle","guard"].includes(kind)) return {dx:randomBetween(-8,8),dy:(Math.random()<.5?-1:1)*randomBetween(38,68)};
    return {dx:(Math.random()<.5?-1:1)*randomBetween(34,64),dy:(Math.random()<.5?-1:1)*randomBetween(24,48)};
  }

  async function performGesture(gesture,token) {
    if (!gesture?.isConnected || !tokenAlive(token)) return false;
    const start = pointFor(gesture,.5,.48);
    const vector = gestureVector(gesture);
    const end = {
      x:clamp(start.x+vector.dx,8,window.innerWidth-8),
      y:clamp(start.y+vector.dy,8,window.innerHeight-8)
    };
    const moved = await moveCursorTo(gesture,CURSOR_TRAVEL_MS,token,start);
    if (!moved || !tokenAlive(token)) return false;
    const restoreCapture = patchPointerCapture(gesture);
    try {
      pointerEvent("pointerdown",gesture,start.x,start.y,1,0);
      const started = now();
      await new Promise(resolve => {
        const frame = () => {
          if (!tokenAlive(token) || !gesture.isConnected) { resolve(); return; }
          const t = clamp((now()-started)/GESTURE_TRAVEL_MS,0,1);
          const e = t*t*(3-2*t);
          const x = start.x+(end.x-start.x)*e;
          const y = start.y+(end.y-start.y)*e;
          cursorPoint={x,y};
          pointerEvent("pointermove",gesture,x,y,1,-1);
          if (t<1) requestAnimationFrame(frame); else resolve();
        };
        requestAnimationFrame(frame);
      });
      if (!tokenAlive(token)) return false;
      pointerEvent("pointerup",gesture,end.x,end.y,0,0);
      cursorPoint=end;
      return true;
    } finally {
      restoreCapture();
    }
  }

  async function performRange(input,token) {
    if (!input?.isConnected || input.disabled || !tokenAlive(token)) return false;
    const min = Number(input.min || 0),max = Number(input.max || 100),step = Math.max(Number(input.step || 1),.000001);
    const current = Number(input.value);
    let target = current;
    for (let i=0;i<8 && target===current;i++) {
      const raw = randomBetween(min,max);
      target = clamp(Math.round((raw-min)/step)*step+min,min,max);
    }
    if (target===current) target = current>=max ? Math.max(min,current-step) : Math.min(max,current+step);
    const rect = input.getBoundingClientRect();
    const startFrac = (current-min)/Math.max(step,max-min);
    const endFrac = (target-min)/Math.max(step,max-min);
    const start = {x:clamp(rect.left+rect.width*clamp(startFrac,0,1),8,window.innerWidth-8),y:clamp(rect.top+rect.height*.5,8,window.innerHeight-8)};
    const end = {x:clamp(rect.left+rect.width*clamp(endFrac,0,1),8,window.innerWidth-8),y:start.y};
    await moveCursorTo(input,CURSOR_TRAVEL_MS,token,start);
    if (!tokenAlive(token)) return false;
    pointerEvent("pointerdown",input,start.x,start.y,1,0);
    const started=now();
    await new Promise(resolve=>{
      const frame=()=>{
        if(!tokenAlive(token)||!input.isConnected){resolve();return;}
        const t=clamp((now()-started)/GESTURE_TRAVEL_MS,0,1),e=t*t*(3-2*t);
        const value=current+(target-current)*e;
        input.value=String(clamp(Math.round((value-min)/step)*step+min,min,max));
        input.dispatchEvent(new Event("input",{bubbles:true}));
        const x=start.x+(end.x-start.x)*e;
        cursorPoint={x,y:start.y};
        pointerEvent("pointermove",input,x,start.y,1,-1);
        if(t<1)requestAnimationFrame(frame);else resolve();
      };
      requestAnimationFrame(frame);
    });
    if(!tokenAlive(token))return false;
    input.value=String(target);
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
    pointerEvent("pointerup",input,end.x,end.y,0,0);
    cursorPoint=end;
    return true;
  }

  async function performButton(host,token) {
    const buttons=[...host.querySelectorAll('.exo-hardware-actions button:not(:disabled),button[data-proc-input][data-control-id]:not(:disabled)')]
      .filter(button=>!button.closest(".exo-lockout-device"));
    if(!buttons.length)return false;
    const inactive=buttons.filter(button=>button.getAttribute("aria-pressed")!=="true");
    const pool=inactive.length?inactive:buttons;
    const button=pool[Math.floor(Math.random()*pool.length)];
    return await tapElement(button,token);
  }

  async function performControl(host,token) {
    if (!host?.isConnected || !tokenAlive(token)) return false;
    focusCamera(host);
    await sleep(1550,token);
    if (!tokenAlive(token)) return false;
    const gesture = host.querySelector('[data-control-gesture]:not([aria-disabled="true"])');
    const range = host.querySelector('input[data-proc-range]:not(:disabled),input[data-proc-slider]:not(:disabled)');
    let ok=false;
    if (gesture && (Math.random()<.78 || !range)) ok=await performGesture(gesture,token);
    else if (range) ok=await performRange(range,token);
    else ok=await performButton(host,token);
    if (ok) lastControlCode=host.dataset.controlCode||host.querySelector("[data-control-id]")?.dataset.controlId||"";
    return ok;
  }

  function updateToggle() {
    if (!toggleButton) return;
    toggleButton.setAttribute("aria-pressed",active?"true":"false");
    toggleButton.dataset.active=active?"true":"false";
    toggleButton.setAttribute("aria-label",active?"Disable observer mode":"Enable observer mode");
    toggleButton.title=active?"Observer mode active — press any key to stop":"Observer mode — autonomous crew demonstration";
  }

  function stop(reason="manual") {
    if (!active) return;
    active=false;
    runToken++;
    clearFocus();
    const panel=document.getElementById("station-panel");
    panel?.style.removeProperty("--exo-observer-origin-x");
    panel?.style.removeProperty("--exo-observer-origin-y");
    document.body.classList.remove("exo-observer-mode");
    updateToggle();
    window.dispatchEvent(new CustomEvent("exo:observer-mode",{detail:{active:false,reason}}));
  }

  async function run(token) {
    activeStation=selectedStation();
    operationsRemaining=randomInt(2,3);
    await sleep(1800,token);
    while(tokenAlive(token)) {
      if (operationsRemaining<=0 || activeStation!==selectedStation()) {
        const switched=await switchStation(token);
        if(!switched&&tokenAlive(token))await sleep(2000,token);
        continue;
      }
      const cycleStart=now();
      const host=chooseControl();
      if(host) {
        await performControl(host,token);
        if(tokenAlive(token))operationsRemaining--;
      }
      const elapsed=now()-cycleStart;
      const jitter=randomBetween(-1800,1800);
      await sleep(Math.max(1800,OPERATION_INTERVAL_MS+jitter-elapsed),token);
    }
  }

  function start() {
    if (active) return;
    active=true;
    const token=++runToken;
    document.body.classList.add("exo-observer-mode");
    updateToggle();
    window.dispatchEvent(new CustomEvent("exo:observer-mode",{detail:{active:true}}));
    run(token);
  }

  function toggle() {
    if(active)stop("toggle"); else start();
  }

  function bind() {
    toggleButton=document.getElementById("crew-observer-toggle");
    if(!toggleButton)return;
    toggleButton.addEventListener("click",toggle);
    document.addEventListener("keydown",event=>{
      if(active&&!event.isComposing)stop(`key:${event.key}`);
    },true);
    window.addEventListener("blur",()=>{ if(active) clearFocus(); });
    updateToggle();
  }

  window.EXO_OBSERVER_MODE=Object.freeze({
    start,
    stop,
    toggle,
    get active(){return active;},
    get station(){return selectedStation();}
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();