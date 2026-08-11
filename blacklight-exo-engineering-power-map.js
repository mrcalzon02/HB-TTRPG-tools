(() => {
  "use strict";

  if (window.EXO_ENGINEERING_POWER_MAP) return;

  const BREAKERS = Object.freeze([
    Object.freeze({id:"breaker-reactor",name:"CALDER",load:"REACTOR",bus:"A",side:"left",y:352}),
    Object.freeze({id:"breaker-coolant",name:"VOSS",load:"COOLANT",bus:"A",side:"left",y:402}),
    Object.freeze({id:"breaker-field",name:"ASTER",load:"FIELD",bus:"A",side:"left",y:452}),
    Object.freeze({id:"breaker-sensor",name:"VESPER",load:"SENSOR",bus:"A",side:"left",y:502}),
    Object.freeze({id:"breaker-rectifier",name:"MORROW",load:"RECTIFIER",bus:"B",side:"right",y:352}),
    Object.freeze({id:"breaker-grid",name:"LARKEN",load:"GRID",bus:"B",side:"right",y:402}),
    Object.freeze({id:"breaker-inverter",name:"HALDEN",load:"INVERTER",bus:"B",side:"right",y:452}),
    Object.freeze({id:"breaker-lighting",name:"ORISON",load:"LIGHTING",bus:"B",side:"right",y:502})
  ]);

  const FEEDS = Object.freeze([
    Object.freeze({id:"rectifier-a",letter:"A",x:42,anchorX:113,anchorY:121,path:"M42 28 V70 H82 Q96 70 113 121",inner:"M113 121 Q126 139 151 160"}),
    Object.freeze({id:"rectifier-b",letter:"B",x:105,anchorX:134,anchorY:108,path:"M105 28 V62 H119 Q129 63 134 108",inner:"M134 108 Q140 136 151 160"}),
    Object.freeze({id:"rectifier-c",letter:"C",x:215,anchorX:168,anchorY:108,path:"M215 28 V62 H184 Q173 63 168 108",inner:"M168 108 Q163 136 151 160"}),
    Object.freeze({id:"rectifier-d",letter:"D",x:278,anchorX:189,anchorY:121,path:"M278 28 V70 H220 Q204 70 189 121",inner:"M189 121 Q177 139 151 160"})
  ]);

  let observer = null;
  let queued = false;

  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const esc = value => String(value ?? "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));

  function engineeringActive() {
    return Boolean(document.querySelector('#station-tabs [data-station="engineering"][aria-selected="true"]'));
  }

  function selectedState(id,fallback="UNKNOWN") {
    const node = document.querySelector(`#station-panel [data-control-id="${id}"][data-control-state][aria-pressed="true"]`);
    return node?.dataset.controlState || fallback;
  }

  function dialFraction(id) {
    const node = document.querySelector(`#station-panel [data-control-id="${id}"][data-dial-angle]`);
    const angle = Number(node?.dataset.dialAngle);
    return Number.isFinite(angle) ? clamp((angle + 62) / 124,0,1) : .5;
  }

  function dialVolts(id) {
    return Math.round((400 + dialFraction(id) * 80) / 5) * 5;
  }

  function coolantPercent() {
    return Math.round(dialFraction("coolant-valve") * 100 / 5) * 5;
  }

  function readState() {
    const feed = Object.fromEntries(FEEDS.map(item => [item.letter.toLowerCase(),{
      fraction:dialFraction(item.id),
      volts:dialVolts(item.id)
    }]));
    const breakers = Object.fromEntries(BREAKERS.map(item => [item.id,selectedState(item.id,"OFF")]));
    return {
      feed,
      busA:{fraction:dialFraction("voltage-a"),volts:dialVolts("voltage-a")},
      busB:{fraction:dialFraction("voltage-b"),volts:dialVolts("voltage-b")},
      transfer:selectedState("bus-transfer","ISOLATED"),
      pump:selectedState("pump-select","A"),
      coolant:coolantPercent(),
      breakers
    };
  }

  function signature(state) {
    return JSON.stringify({
      f:Object.values(state.feed).map(v=>v.volts),
      a:state.busA.volts,
      b:state.busB.volts,
      t:state.transfer,
      p:state.pump,
      c:state.coolant,
      br:state.breakers
    });
  }

  function feedStyle(letter,feed) {
    const f = feed.fraction;
    const width = (1.15 + f * 3.25).toFixed(2);
    const alpha = (.30 + f * .70).toFixed(2);
    const speed = (1.75 - f * 1.12).toFixed(2);
    const glow = (2 + f * 8).toFixed(1);
    return `--f${letter}-width:${width};--f${letter}-alpha:${alpha};--f${letter}-speed:${speed}s;--f${letter}-glow:${glow}px`;
  }

  function breakerMarkup(item,state) {
    const cssState = state === "ON" ? "on" : state === "TRIPPED" ? "tripped" : "off";
    const x1 = item.side === "left" ? 87 : 215;
    const x2 = item.side === "left" ? 22 : 280;
    const ledX = item.side === "left" ? 51 : 251;
    const labelX = item.side === "left" ? 58 : 244;
    const anchor = item.side === "left" ? "start" : "end";
    const arrowX = item.side === "left" ? 22 : 280;
    const arrowPath = item.side === "left"
      ? `M${arrowX} ${item.y} l7 -4 v8 z`
      : `M${arrowX} ${item.y} l-7 -4 v8 z`;
    return `<g class="exo-eng-breaker state-${cssState}" data-breaker="${item.id}">
      <path class="exo-eng-branch-base" d="M${x1} ${item.y} H${x2}"/>
      <path class="exo-eng-branch-live" d="M${x1} ${item.y} H${x2}"/>
      <circle class="exo-eng-breaker-led" cx="${ledX}" cy="${item.y}" r="4.5"/>
      <circle class="exo-eng-breaker-ring" cx="${ledX}" cy="${item.y}" r="7.5"/>
      <text class="exo-eng-breaker-name" x="${labelX}" y="${item.y-5}" text-anchor="${anchor}">${item.name}</text>
      <text class="exo-eng-breaker-load" x="${labelX}" y="${item.y+8}" text-anchor="${anchor}">${item.load} · ${state}</text>
      <path class="exo-eng-load-arrow" d="${arrowPath}"/>
    </g>`;
  }

  function feedMarkup(item,state) {
    const key = item.letter.toLowerCase();
    const volts = state.feed[key].volts;
    return `<g class="exo-eng-feed feed-${key}" data-feed="${item.letter}">
      <path class="exo-eng-feed-conduit" d="${item.path}"/>
      <path class="exo-eng-feed-plasma" d="${item.path}"/>
      <path class="exo-eng-core-filament" d="${item.inner}"/>
      <circle class="exo-eng-port" cx="${item.anchorX}" cy="${item.anchorY}" r="5.5"/>
      <text class="exo-eng-feed-label" x="${item.x}" y="18" text-anchor="middle">FEED ${item.letter}</text>
      <text class="exo-eng-feed-value" x="${item.x}" y="31" text-anchor="middle">${volts} V</text>
    </g>`;
  }

  function transferMarkup(state) {
    const mode = state.transfer.toLowerCase();
    const primary = state.transfer === "PRIMARY";
    const auxiliary = state.transfer === "AUXILIARY";
    const isolated = state.transfer === "ISOLATED";
    return `<g class="exo-eng-transfer transfer-${mode}">
      <path class="exo-eng-transfer-base" d="M87 299 H128 M174 299 H215"/>
      <path class="exo-eng-transfer-bridge" d="M128 299 H174"/>
      <circle cx="128" cy="299" r="4"/><circle cx="174" cy="299" r="4"/>
      <path class="exo-eng-transfer-blade" d="${isolated?"M132 299 L167 284":primary?"M132 299 H170":"M132 299 Q151 311 170 299"}"/>
      <text x="151" y="286" text-anchor="middle">${isolated?"ISOLATED":primary?"PRIMARY TIE":"AUXILIARY TIE"}</text>
      ${auxiliary?'<path class="exo-eng-transfer-flow" d="M215 299 H174"/>':'<path class="exo-eng-transfer-flow" d="M87 299 H128"/>'}
    </g>`;
  }

  function markup(state) {
    const fa = state.feed.a, fb = state.feed.b, fc = state.feed.c, fd = state.feed.d;
    const average = (fa.fraction + fb.fraction + fc.fraction + fd.fraction) / 4;
    const spread = Math.max(fa.volts,fb.volts,fc.volts,fd.volts) - Math.min(fa.volts,fb.volts,fc.volts,fd.volts);
    const balance = spread <= 5 ? "BALANCED" : spread <= 15 ? "TRIM" : "IMBALANCED";
    const busAAlpha = (.28 + state.busA.fraction * .72).toFixed(2);
    const busBAlpha = (.28 + state.busB.fraction * .72).toFixed(2);
    const coreRate = (3.1 - average * 1.95).toFixed(2);
    const coreGlow = (12 + average * 30).toFixed(1);
    const styles = [
      feedStyle("a",fa),feedStyle("b",fb),feedStyle("c",fc),feedStyle("d",fd),
      `--bus-a-alpha:${busAAlpha};--bus-b-alpha:${busBAlpha};--core-rate:${coreRate}s;--core-glow:${coreGlow}px`
    ].join(";");
    return `<div class="exo-eng-power-map" data-eng-power-map style="${styles}" data-transfer="${esc(state.transfer)}">
      <header class="exo-eng-map-header"><span>ENG-MIM-02 · PRIMARY / AUX BUS MIMIC & PLANT DISTRIBUTION</span><b>RECTIFIER ${balance}</b></header>
      <div class="exo-eng-map-stage">
        <svg class="exo-eng-map-svg" viewBox="0 0 302 552" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live engineering power distribution schematic">
          <defs>
            <radialGradient id="exoEngGlass" cx="42%" cy="35%" r="66%"><stop offset="0" stop-color="#f9e5a5" stop-opacity=".20"/><stop offset=".28" stop-color="#b37524" stop-opacity=".17"/><stop offset=".68" stop-color="#17221c" stop-opacity=".78"/><stop offset="1" stop-color="#050a08" stop-opacity=".96"/></radialGradient>
            <radialGradient id="exoEngCore" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#fff0b7"/><stop offset=".18" stop-color="#f2b84e" stop-opacity=".94"/><stop offset=".48" stop-color="#d17526" stop-opacity=".47"/><stop offset="1" stop-color="#7c381c" stop-opacity="0"/></radialGradient>
            <filter id="exoEngBlur"><feGaussianBlur stdDeviation="2.5"/></filter>
            <filter id="exoEngGlow"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>

          <g class="exo-eng-top-labels"><text x="151" y="12" text-anchor="middle">RECTIFIER INPUT MANIFOLD · 400–480 V</text></g>
          ${FEEDS.map(item=>feedMarkup(item,state)).join("")}

          <g class="exo-eng-moderator">
            <path class="exo-eng-moderator-arm" d="M18 160 H96"/>
            <path class="exo-eng-moderator-pulse" d="M18 160 H96"/>
            <circle cx="96" cy="160" r="5.5"/>
            <text x="20" y="149">MASTER MODERATOR</text>
            <text x="20" y="174">NEUTRAL / FIELD REFERENCE</text>
          </g>

          <g class="exo-eng-rectifier" transform="translate(151 160)">
            <circle class="exo-eng-glass-bulb" r="55" fill="url(#exoEngGlass)"/>
            <circle class="exo-eng-glass-rim" r="50"/>
            <circle class="exo-eng-plasma-haze" r="39" fill="url(#exoEngCore)" filter="url(#exoEngBlur)"/>
            <circle class="exo-eng-plasma-core" r="29" fill="url(#exoEngCore)"/>
            <path class="exo-eng-plasma-orbit orbit-a" d="M-34 -8 C-16 -35 20 -35 37 -4 C17 15 -12 22 -34 -8Z"/>
            <path class="exo-eng-plasma-orbit orbit-b" d="M-26 24 C-6 5 17 4 35 24 C10 37 -9 39 -26 24Z"/>
            <path class="exo-eng-plasma-orbit orbit-c" d="M-7 -38 C13 -20 15 11 0 38 C-18 15 -21 -16 -7 -38Z"/>
            <circle class="exo-eng-neutral-kernel" r="7"/>
          </g>
          <text class="exo-eng-core-title" x="151" y="232" text-anchor="middle">MASTER PLASMA RECTIFIER</text>
          <text class="exo-eng-core-subtitle" x="151" y="244" text-anchor="middle">4 INPUT / 4 OUTPUT · MODERATOR NEUTRAL</text>

          <g class="exo-eng-output-arms">
            <path class="exo-eng-output-arm bus-a" d="M113 199 Q104 232 87 270"/>
            <path class="exo-eng-output-arm bus-a" d="M135 212 Q126 238 119 270"/>
            <path class="exo-eng-output-arm bus-b" d="M168 212 Q177 238 183 270"/>
            <path class="exo-eng-output-arm bus-b" d="M189 199 Q199 232 215 270"/>
            <path class="exo-eng-output-flow bus-a" d="M113 199 Q104 232 87 270"/>
            <path class="exo-eng-output-flow bus-a" d="M135 212 Q126 238 119 270"/>
            <path class="exo-eng-output-flow bus-b" d="M168 212 Q177 238 183 270"/>
            <path class="exo-eng-output-flow bus-b" d="M189 199 Q199 232 215 270"/>
          </g>

          <g class="exo-eng-buses">
            <path class="exo-eng-bus-base bus-a" d="M28 299 H128 M87 299 V530"/>
            <path class="exo-eng-bus-live bus-a" d="M28 299 H128 M87 299 V530"/>
            <path class="exo-eng-bus-base bus-b" d="M174 299 H274 M215 299 V530"/>
            <path class="exo-eng-bus-live bus-b" d="M174 299 H274 M215 299 V530"/>
            <text class="exo-eng-bus-label" x="31" y="288">BUS A · ${state.busA.volts} V</text>
            <text class="exo-eng-bus-label" x="271" y="288" text-anchor="end">BUS B · ${state.busB.volts} V</text>
          </g>
          ${transferMarkup(state)}

          <g class="exo-eng-breaker-header"><text x="151" y="329" text-anchor="middle">PROTECTED DISTRIBUTION BRANCHES</text></g>
          ${BREAKERS.map(item=>breakerMarkup(item,state.breakers[item.id])).join("")}

          <g class="exo-eng-output-footer">
            <path d="M87 530 V545 M215 530 V545"/>
            <path d="M81 541 L87 549 L93 541Z M209 541 L215 549 L221 541Z"/>
            <text x="151" y="547" text-anchor="middle">PLANT LOADS / SUBSYSTEM DISTRIBUTION</text>
          </g>
        </svg>
      </div>
      <footer class="exo-eng-map-footer">
        <span><small>RECTIFIER</small><b>A ${fa.volts} · B ${fb.volts} · C ${fc.volts} · D ${fd.volts} V</b></span>
        <span><small>BUS TRANSFER</small><b>${esc(state.transfer)}</b></span>
        <span><small>COOLANT</small><b>${state.coolant}% · PUMP ${esc(state.pump)}</b></span>
      </footer>
    </div>`;
  }

  function render() {
    queued = false;
    if (!engineeringActive()) return;
    const display = document.querySelector("#station-panel .display-systems");
    if (!display) return;
    const state = readState();
    const sig = signature(state);
    if (display.dataset.engPowerMapSignature === sig && display.querySelector("[data-eng-power-map]")) return;
    display.dataset.engPowerMapSignature = sig;
    display.classList.add("exo-eng-specialized");
    display.innerHTML = markup(state);
  }

  function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function start() {
    const panel = document.getElementById("station-panel");
    if (!panel) return;
    observer = new MutationObserver(queueRender);
    observer.observe(panel,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["aria-pressed","data-dial-angle"]
    });
    document.addEventListener("click",event=>{
      if (event.target.closest?.('#station-tabs [data-station="engineering"], #station-panel [data-control-id]')) queueRender();
    },true);
    document.addEventListener("change",event=>{
      if (event.target.closest?.("#station-panel")) queueRender();
    },true);
    queueRender();
  }

  window.EXO_ENGINEERING_POWER_MAP = Object.freeze({refresh:queueRender,read:readState});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
