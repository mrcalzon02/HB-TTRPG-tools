(() => {
  "use strict";

  if (window.EXO_OBSERVER_MODE) return;

  const POINTER_ID = 7719;
  const STATIONS = ["helm","navigation","gunnery","engineering","science","comms"];
  const CURSOR_TRAVEL_MS = 1500;
  const CONTROL_DWELL_MS = 420;
  const ACTION_SETTLE_MS = 620;
  const PROCEDURE_SETTLE_MS = 1150;
  const STATION_SETTLE_MS = 1250;
  const RETRY_SETTLE_MS = 950;
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const ease = t => t*t*(3-2*t);
  const now = () => performance.now();

  let active = false;
  let runToken = 0;
  let toggleButton = null;
  let observerFrame = null;
  let observerKey = null;
  let cursorPoint = {x:48,y:48};
  let currentFocus = null;
  let sourceModelPromise = null;
  let previousScrollBehavior = "";

  function tokenAlive(token){ return active && token === runToken; }
  function selectedStation(){ return document.querySelector('#station-tabs [data-station][aria-selected="true"]')?.dataset.station || "helm"; }
  function selectedProcedureId(){ return document.querySelector('#station-panel [data-procedure-select]')?.value || null; }
  function procedureAttemptActive(){ return Boolean(document.querySelector("#station-panel [data-procedure-abort]:not(:disabled)")); }

  function sleep(ms,token){
    return new Promise(resolve => {
      if(!tokenAlive(token)){ resolve(false); return; }
      const id=setTimeout(()=>resolve(tokenAlive(token)),Math.max(0,ms));
      if(!tokenAlive(token)){clearTimeout(id);resolve(false);}
    });
  }

  async function waitFor(resolver,timeout,token,interval=80){
    const started=now();
    while(tokenAlive(token) && now()-started<timeout){
      const value=resolver();
      if(value) return value;
      if(!(await sleep(interval,token))) return null;
    }
    return null;
  }

  function pointerEvent(type,target,x,y,buttons=0,button=0){
    if(!target) return;
    target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,composed:true,pointerId:POINTER_ID,pointerType:"mouse",isPrimary:true,clientX:x,clientY:y,screenX:x,screenY:y,buttons,button}));
  }

  function setCursorPoint(x,y){
    cursorPoint={x,y};
    if(observerKey) observerKey.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-18%,-9%)`;
  }

  function pointFor(element,xBias=.5,yBias=.5){
    const r=element.getBoundingClientRect();
    return {x:r.left+r.width*xBias,y:r.top+r.height*yBias};
  }

  function documentPointFor(element,xBias=.5,yBias=.5){
    const p=pointFor(element,xBias,yBias);
    return {x:p.x+window.scrollX,y:p.y+window.scrollY};
  }

  function maxScrollY(){ return Math.max(0,document.documentElement.scrollHeight-window.innerHeight); }

  function clearFocus(){
    if(currentFocus?.isConnected) currentFocus.removeAttribute("data-observer-focus");
    currentFocus=null;
    document.querySelectorAll("[data-observer-tab-focus]").forEach(node=>node.removeAttribute("data-observer-tab-focus"));
  }

  function focusElement(element){
    clearFocus();
    if(!element?.isConnected) return;
    const host=element.closest?.(".exo-device-block,.exo-procedure-setup,.exo-station-tab") || element;
    currentFocus=host;
    host.setAttribute("data-observer-focus","true");
  }

  async function moveCursorTo(element,duration,token,xBias=.5,yBias=.5){
    if(!tokenAlive(token)||!element?.isConnected) return false;
    focusElement(element);
    const targetDoc=documentPointFor(element,xBias,yBias);
    const startCursor={...cursorPoint};
    const startScroll=window.scrollY;
    const desiredScroll=clamp(targetDoc.y-window.innerHeight*.52,0,maxScrollY());
    const started=now();
    const travel=Math.max(420,duration||CURSOR_TRAVEL_MS);
    const bend=(targetDoc.x-(startCursor.x+window.scrollX))>=0?1:-1;
    return await new Promise(resolve=>{
      const frame=()=>{
        if(!tokenAlive(token)||!element?.isConnected){resolve(false);return;}
        const t=clamp((now()-started)/travel,0,1),e=ease(t);
        const scrollY=startScroll+(desiredScroll-startScroll)*e;
        window.scrollTo(window.scrollX,scrollY);
        const targetX=targetDoc.x-window.scrollX;
        const targetY=targetDoc.y-scrollY;
        const arc=Math.sin(Math.PI*e);
        const x=startCursor.x+(targetX-startCursor.x)*e+bend*arc*22;
        const y=startCursor.y+(targetY-startCursor.y)*e-arc*14;
        setCursorPoint(x,y);
        pointerEvent("pointermove",document.elementFromPoint(clamp(x,1,window.innerWidth-2),clamp(y,1,window.innerHeight-2))||element,x,y,0,-1);
        if(t<1) requestAnimationFrame(frame); else {setCursorPoint(targetX,targetY);resolve(true);}
      };
      requestAnimationFrame(frame);
    });
  }

  async function tapElement(element,token,{dwell=CONTROL_DWELL_MS}={}){
    if(!tokenAlive(token)||!element?.isConnected||element.disabled) return false;
    if(!(await moveCursorTo(element,CURSOR_TRAVEL_MS,token))) return false;
    if(!(await sleep(dwell,token))) return false;
    const p=pointFor(element,.5,.5);
    setCursorPoint(p.x,p.y);
    element.setAttribute("data-observer-press","true");
    pointerEvent("pointerdown",element,p.x,p.y,1,0);
    await sleep(150,token);
    if(!tokenAlive(token)) return false;
    pointerEvent("pointerup",element,p.x,p.y,0,0);
    element.click();
    setTimeout(()=>element?.removeAttribute?.("data-observer-press"),180);
    return true;
  }

  async function selectValue(select,value,token){
    if(!select?.isConnected||!tokenAlive(token)) return false;
    if(!(await moveCursorTo(select,CURSOR_TRAVEL_MS,token))) return false;
    if(!(await sleep(CONTROL_DWELL_MS,token))) return false;
    select.setAttribute("data-observer-press","true");
    select.focus({preventScroll:true});
    await sleep(180,token);
    if(!tokenAlive(token)) return false;
    select.value=value;
    select.dispatchEvent(new Event("input",{bubbles:true}));
    select.dispatchEvent(new Event("change",{bubbles:true}));
    setTimeout(()=>select?.removeAttribute?.("data-observer-press"),180);
    return true;
  }

  function patchPointerCapture(element){
    const hadOwn=Object.prototype.hasOwnProperty.call(element,"setPointerCapture"),original=element.setPointerCapture;
    try{Object.defineProperty(element,"setPointerCapture",{configurable:true,writable:true,value:()=>{}});}catch(_){try{element.setPointerCapture=()=>{};}catch(__){}}
    return ()=>{try{if(hadOwn)Object.defineProperty(element,"setPointerCapture",{configurable:true,writable:true,value:original});else delete element.setPointerCapture;}catch(_){}};
  }

  function numericReadout(host){
    const text=host?.querySelector("[data-range-readout]")?.textContent||"";
    const match=text.replace(/−/g,"-").match(/[+-]?\d+(?:\.\d+)?/);
    return match?Number(match[0]):NaN;
  }

  function gesturePlan(gesture,token,model){
    const tokens=(gesture.dataset.gestureTokens||"").split("|"),idx=tokens.indexOf(token),count=tokens.length;
    if(idx<0) return null;
    const kind=gesture.dataset.controlGesture||"",controlId=gesture.dataset.controlId||model.actions.get(token)?.controlId,range=model.ranges.get(controlId);
    if(range){
      const target=Number.isFinite(range.targets[idx])?range.targets[idx]:range.min+(range.max-range.min)*(idx/Math.max(1,count-1));
      let current=NaN;
      if(["selector","rotary","wheel"].includes(kind)){
        const angle=Number(gesture.dataset.dialAngle);
        if(Number.isFinite(angle)) current=range.min+clamp((angle+62)/124,0,1)*(range.max-range.min);
      }
      if(!Number.isFinite(current)) current=numericReadout(gesture.closest(".exo-device-block"));
      if(!Number.isFinite(current)) current=(range.min+range.max)/2;
      const fraction=(target-current)/Math.max(.0001,range.max-range.min);
      if((range.axis||(["thumbwheel","dual-slider"].includes(kind)?"y":"x"))==="y") return {dx:0,dy:-fraction*120};
      return {dx:fraction*150,dy:0};
    }
    if(kind==="yoke"){
      const vectors=[[-38,0],[0,-36],[38,0],[0,36]];
      const v=vectors[idx]||vectors[0];return {dx:v[0],dy:v[1]};
    }
    if(["selector","rotary","wheel"].includes(kind)){
      const current=Number(gesture.dataset.dialAngle)||0,target=-62+124*(idx/Math.max(1,count-1));
      return {dx:(target-current)/.9,dy:0};
    }
    if(kind==="thumbwheel") return {dx:0,dy:idx===0?54:-54};
    if(kind==="lever") return {dx:idx===1?24:0,dy:count===3?(idx===2?-50:idx===0?50:0):(idx===count-1?-50:50)};
    if(kind==="knife-switch") return {dx:idx===1?22:0,dy:count===3?(idx===0?-50:idx===2?50:0):(idx===0?-50:50)};
    if(kind==="toggle"||kind==="guard") return {dx:0,dy:idx===0?-50:50};
    if(kind==="dual-slider") return {dx:0,dy:idx===count-1?-64:idx===0?64:0};
    return null;
  }

  async function performGestureForToken(gesture,procedureToken,model,token){
    if(!gesture?.isConnected||!tokenAlive(token)) return false;
    const plan=gesturePlan(gesture,procedureToken,model);if(!plan)return false;
    if(!(await moveCursorTo(gesture,CURSOR_TRAVEL_MS,token))) return false;
    if(!(await sleep(CONTROL_DWELL_MS,token))) return false;
    const start=pointFor(gesture,.5,.5),end={x:clamp(start.x+plan.dx,10,window.innerWidth-10),y:clamp(start.y+plan.dy,10,window.innerHeight-10)};
    const restore=patchPointerCapture(gesture);
    try{
      pointerEvent("pointerdown",gesture,start.x,start.y,1,0);
      const started=now(),duration=720;
      await new Promise(resolve=>{
        const frame=()=>{
          if(!tokenAlive(token)||!gesture.isConnected){resolve();return;}
          const t=clamp((now()-started)/duration,0,1),e=ease(t),x=start.x+(end.x-start.x)*e,y=start.y+(end.y-start.y)*e;
          setCursorPoint(x,y);pointerEvent("pointermove",gesture,x,y,1,-1);
          if(t<1)requestAnimationFrame(frame);else resolve();
        };requestAnimationFrame(frame);
      });
      if(!tokenAlive(token)) return false;
      pointerEvent("pointerup",gesture,end.x,end.y,0,0);setCursorPoint(end.x,end.y);return true;
    }finally{restore();}
  }

  function parseStrings(source){return [...String(source||"").matchAll(/"([^"]+)"/g)].map(match=>match[1]);}

  async function loadSourceModel(){
    if(sourceModelPromise) return sourceModelPromise;
    sourceModelPromise=(async()=>{
      const response=await fetch(new URL("blacklight-exo-crew-operations.js",document.baseURI),{cache:"no-store"});
      if(!response.ok) throw new Error(`Observer could not load procedure source (${response.status})`);
      const text=await response.text(),procedures=new Map(),actions=new Map(),ranges=new Map();
      const authMatch=text.match(/const AUTH_TAIL=Object\.freeze\(\[([^\]]+)\]\)/),authTail=parseStrings(authMatch?.[1]||"");
      for(const line of text.split(/\r?\n/)){
        if(line.includes("sequence:withAuthorization(")){
          const id=line.match(/\{id:"([^"]+)"/),args=line.match(/sequence:withAuthorization\(([^)]*)\)/);
          if(id&&args) procedures.set(id[1],[...parseStrings(args[1]),...authTail]);
        }
        if(line.includes('control("')&&line.includes('action("')){
          const controlMatch=line.match(/control\("([^"]+)","([^"]+)"/);
          if(controlMatch){
            const found=[...line.matchAll(/action\("([^"]+)","([^"]*)"(?:,"([^"]*)")?\)/g)];
            found.forEach((match,index)=>actions.set(match[1],{controlId:controlMatch[1],kind:controlMatch[2],index,count:found.length,label:match[2],state:match[3]||match[2]}));
          }
        }
      }
      const rangeRe=/"([^"]+)":Object\.freeze\(\{min:([-\d.]+),max:([-\d.]+),step:([-\d.]+),([^}]*?)targets:\[([^\]]*)\]\}\)/g;
      for(const match of text.matchAll(rangeRe)){
        const axis=(match[5].match(/axis:"([xy])"/)||[])[1]||null;
        ranges.set(match[1],{min:Number(match[2]),max:Number(match[3]),step:Number(match[4]),axis,targets:match[6].split(",").map(Number)});
      }
      return {procedures,actions,ranges,authTail};
    })().catch(error=>{sourceModelPromise=null;throw error;});
    return sourceModelPromise;
  }

  function hostForToken(procedureToken,model){
    const direct=document.querySelector(`#station-panel [data-proc-input="${CSS.escape(procedureToken)}"]`);
    if(direct) return direct.closest(".exo-device-block")||direct;
    const meta=model.actions.get(procedureToken);
    if(meta){const byId=document.querySelector(`#station-panel [data-control-id="${CSS.escape(meta.controlId)}"]`);if(byId)return byId.closest(".exo-device-block")||byId;}
    const gesture=[...document.querySelectorAll("#station-panel [data-control-gesture]")].find(node=>(node.dataset.gestureTokens||"").split("|").includes(procedureToken));
    return gesture?.closest(".exo-device-block")||gesture||null;
  }

  function tokenAlreadySatisfied(procedureToken,model){
    const host=hostForToken(procedureToken,model);
    if(!host||host.classList.contains("exo-lockout-device")) return false;
    return host.dataset.controlActivity && host.dataset.controlActivity!=="live";
  }

  async function performToken(procedureToken,model,token){
    if(!tokenAlive(token)) return false;
    if(!model.authTail.includes(procedureToken)&&tokenAlreadySatisfied(procedureToken,model)) return true;
    const direct=()=>document.querySelector(`#station-panel [data-proc-input="${CSS.escape(procedureToken)}"]:not(:disabled)`);
    const meta=model.actions.get(procedureToken);
    const gesture=()=>[...document.querySelectorAll("#station-panel [data-control-gesture]:not([aria-disabled=\"true\"])" )].find(node=>(node.dataset.gestureTokens||"").split("|").includes(procedureToken));
    const g=gesture();
    if(g && meta) return performGestureForToken(g,procedureToken,model,token);
    const button=direct();
    if(button) return tapElement(button,token);
    const late=await waitFor(()=>direct()||gesture(),1800,token);
    if(!late) return false;
    if(late.matches?.("[data-control-gesture]")) return performGestureForToken(late,procedureToken,model,token);
    return tapElement(late,token);
  }

  function autonavRequirement(procedureId){return window.EXO_HELM_AUTONAV_SUITE?.procedureRequirements?.[procedureId]||null;}

  async function prepareHelmAutonav(procedureId,token){
    const api=window.EXO_HELM_AUTONAV_SUITE,req=autonavRequirement(procedureId);if(!api||!req)return true;
    const choose=async(selector,value)=>{const control=await waitFor(()=>document.querySelector(selector),1200,token);if(!control)return false;if(value&&control.value!==value)return selectValue(control,value,token);if(value){await moveCursorTo(control,CURSOR_TRAVEL_MS,token);await sleep(260,token);}return true;};
    if(req.encounter && !(await choose("#station-panel [data-autonav-encounter]",req.encounter))) return false;
    if(req.pattern && !(await choose("#station-panel [data-autonav-evasive]",req.pattern))) return false;
    let state=api.getState?.()||{};
    const clickAction=async(name)=>{const button=await waitFor(()=>document.querySelector(`#station-panel [data-autonav-action="${name}"]:not(:disabled)`),1600,token);return button?tapElement(button,token):false;};
    if(req.package&&!state.queued){if(!(await clickAction("queue")))return false;await sleep(ACTION_SETTLE_MS,token);state=api.getState?.()||state;}
    if(req.simulate&&!state.simulated){if(!(await clickAction("simulate")))return false;await sleep(ACTION_SETTLE_MS,token);state=api.getState?.()||state;}
    if(req.evasive&&!state.evasiveLoaded){if(!(await clickAction("load-evasive")))return false;await sleep(ACTION_SETTLE_MS,token);state=api.getState?.()||state;}
    if(req.sync&&!state.synced){if(!(await clickAction("sync")))return false;await sleep(ACTION_SETTLE_MS,token);}
    return true;
  }

  function variedProcedurePlan(station,count){
    const select=document.querySelector("#station-panel [data-procedure-select]");if(!select)return[];
    let options=[...select.options].map(option=>({id:option.value,difficulty:Number(option.dataset.recommendedDifficulty)||0}));
    if(station==="helm")options=options.filter(item=>{const req=autonavRequirement(item.id);return !(req?.simulate&&!req?.package);});
    const groups=new Map();options.forEach(item=>{if(!groups.has(item.difficulty))groups.set(item.difficulty,[]);groups.get(item.difficulty).push(item);});
    const levels=[...groups.keys()].sort((a,b)=>a-b);if(!levels.length)return[];
    const wanted=count>=3&&levels.length>=3?[levels[0],levels[Math.floor((levels.length-1)/2)],levels.at(-1)]:levels.length>=2?[levels[0],levels.at(-1)]:[levels[0]];
    const chosen=[];for(const level of wanted){const pool=groups.get(level).filter(item=>!chosen.some(x=>x.id===item.id));if(pool.length)chosen.push(pool[Math.floor(Math.random()*pool.length)]);}
    for(const item of options.sort(()=>Math.random()-.5)){if(chosen.length>=count)break;if(!chosen.some(x=>x.id===item.id))chosen.push(item);}
    return chosen.slice(0,count);
  }

  async function chooseProcedure(procedureId,token){
    const select=await waitFor(()=>document.querySelector("#station-panel [data-procedure-select]"),2000,token);if(!select)return false;
    return selectValue(select,procedureId,token);
  }

  async function beginProcedure(token){
    const button=await waitFor(()=>document.querySelector("#station-panel [data-procedure-begin]"),1800,token);if(!button)return false;
    if(!(await tapElement(button,token,{dwell:520})))return false;
    return Boolean(await waitFor(()=>procedureAttemptActive(),2400,token));
  }

  async function runProcedure(plan,model,token,station){
    if(!tokenAlive(token)||selectedStation()!==station)return false;
    if(!(await chooseProcedure(plan.id,token)))return false;
    if(!(await sleep(700,token)))return false;
    if(!(await beginProcedure(token)))return false;
    if(!(await sleep(850,token)))return false;
    const sequence=model.procedures.get(plan.id);if(!sequence?.length)return false;
    for(const procedureToken of sequence){
      if(!tokenAlive(token)||selectedStation()!==station||!procedureAttemptActive())return false;
      if(station==="helm"&&(procedureToken==="helm-vector-confirm"||procedureToken==="helm-pilot-ack")){
        if(!(await prepareHelmAutonav(plan.id,token)))return false;
      }
      if(!(await performToken(procedureToken,model,token)))return false;
      if(!(await sleep(ACTION_SETTLE_MS,token)))return false;
    }
    const completed=await waitFor(()=>!procedureAttemptActive(),4200,token);
    if(!completed||!tokenAlive(token)||selectedStation()!==station)return false;
    if(!(await sleep(PROCEDURE_SETTLE_MS,token)))return false;
    return true;
  }

  async function switchStation(station,token){
    const tab=await waitFor(()=>document.querySelector(`#station-tabs [data-station="${station}"]`),1600,token);if(!tab)return false;
    clearFocus();tab.setAttribute("data-observer-tab-focus","true");
    if(!(await tapElement(tab,token,{dwell:480})))return false;
    await sleep(STATION_SETTLE_MS,token);
    window.EXO_STATION_KEY_CURSOR?.sync?.();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    refreshKeyVisual();
    return selectedStation()===station;
  }

  async function clearExistingAttempt(token){
    const abort=document.querySelector("#station-panel [data-procedure-abort]:not(:disabled)");
    if(abort){await tapElement(abort,token);await waitFor(()=>!procedureAttemptActive(),1800,token);await sleep(700,token);}
  }

  async function recoverProcedureAttempt(station,token){
    if(!tokenAlive(token))return false;
    const abort=document.querySelector("#station-panel [data-procedure-abort]:not(:disabled)");
    if(abort){
      await tapElement(abort,token,{dwell:360});
      await waitFor(()=>!procedureAttemptActive(),2200,token);
    }
    if(!tokenAlive(token))return false;
    if(selectedStation()!==station){
      if(!(await switchStation(station,token)))return false;
    }
    await sleep(RETRY_SETTLE_MS,token);
    return tokenAlive(token)&&selectedStation()===station&&!procedureAttemptActive();
  }

  function extractCursorUrl(){
    const raw=getComputedStyle(document.documentElement).getPropertyValue("--exo-station-key-cursor").trim();
    const match=raw.match(/url\(([^)]+)\)/);return match?match[1].trim():null;
  }

  function refreshKeyVisual(){
    if(!observerKey)return;
    const url=extractCursorUrl();if(url)observerKey.style.backgroundImage=`url(${url})`;
    observerKey.dataset.station=selectedStation();
  }

  function mountObserverLayer(){
    observerFrame=document.createElement("div");observerFrame.className="exo-observer-viewport";observerFrame.setAttribute("aria-hidden","true");observerFrame.innerHTML='<span class="exo-observer-label top">Observer mode</span><span class="exo-observer-label bottom">Click to cancel</span>';
    observerKey=document.createElement("div");observerKey.className="exo-observer-key";observerKey.setAttribute("aria-hidden","true");
    document.body.append(observerFrame,observerKey);
    const origin=toggleButton?.getBoundingClientRect();setCursorPoint(origin?origin.left+origin.width/2:window.innerWidth*.78,origin?origin.top+origin.height/2:window.innerHeight*.28);
    window.EXO_STATION_KEY_CURSOR?.sync?.();requestAnimationFrame(()=>requestAnimationFrame(refreshKeyVisual));
  }

  function unmountObserverLayer(){observerFrame?.remove();observerKey?.remove();observerFrame=null;observerKey=null;}

  function updateToggle(){
    if(!toggleButton)return;toggleButton.setAttribute("aria-pressed",active?"true":"false");toggleButton.dataset.active=active?"true":"false";toggleButton.setAttribute("aria-label",active?"Disable observer mode":"Enable observer mode");toggleButton.title=active?"Observer mode active — click anywhere to cancel":"Observer mode — autonomous crew demonstration";
  }

  function stop(reason="manual"){
    if(!active)return;active=false;runToken++;clearFocus();document.body.classList.remove("exo-observer-mode");document.documentElement.style.scrollBehavior=previousScrollBehavior;unmountObserverLayer();updateToggle();window.dispatchEvent(new CustomEvent("exo:observer-mode",{detail:{active:false,reason}}));
  }

  async function run(token){
    let model;
    try{model=await loadSourceModel();}catch(error){console.error(error);stop("procedure-source-error");return;}
    await clearExistingAttempt(token);
    let stationIndex=Math.max(0,STATIONS.indexOf(selectedStation()));
    while(tokenAlive(token)){
      const station=selectedStation(),count=Math.random()<.5?2:3,plan=variedProcedurePlan(station,count);
      for(const procedure of plan){
        if(!tokenAlive(token))return;
        let completed=false;
        while(tokenAlive(token)&&!completed){
          completed=await runProcedure(procedure,model,token,station);
          if(!completed&&tokenAlive(token)){
            const recovered=await recoverProcedureAttempt(station,token);
            if(!recovered&&tokenAlive(token))await sleep(RETRY_SETTLE_MS,token);
          }
        }
        if(!completed)return;
      }
      if(!tokenAlive(token))return;
      stationIndex=(stationIndex+1)%STATIONS.length;
      while(tokenAlive(token)&&selectedStation()!==STATIONS[stationIndex]){
        if(!(await switchStation(STATIONS[stationIndex],token)))await sleep(1200,token);
      }
    }
  }

  function start(){
    if(active)return;active=true;const token=++runToken;previousScrollBehavior=document.documentElement.style.scrollBehavior;document.documentElement.style.scrollBehavior="auto";document.body.classList.add("exo-observer-mode");mountObserverLayer();updateToggle();window.dispatchEvent(new CustomEvent("exo:observer-mode",{detail:{active:true}}));run(token);
  }

  function toggle(){if(active)stop("toggle");else start();}

  function bind(){
    toggleButton=document.getElementById("crew-observer-toggle");if(!toggleButton)return;
    toggleButton.addEventListener("click",toggle);
    document.addEventListener("click",event=>{if(active&&event.isTrusted){event.preventDefault();event.stopImmediatePropagation();stop("click");}},true);
    document.addEventListener("keydown",event=>{if(active&&!event.isComposing)stop(`key:${event.key}`);},true);
    updateToggle();
  }

  window.EXO_OBSERVER_MODE=Object.freeze({start,stop,toggle,get active(){return active;},get station(){return selectedStation();}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();