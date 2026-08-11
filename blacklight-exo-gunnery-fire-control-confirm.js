(() => {
  "use strict";

  if (window.EXO_GUN_FCF07) return;

  const OPTIONS = Object.freeze({
    targeting: Object.freeze(["PRECISION TRACK","EMISSION HOME","COOPERATIVE DESIGNATION","COUNTER-MANEUVER","SUBSYSTEM SELECT","AREA INTERDICTION"]),
    approach: Object.freeze(["DIRECT INTERCEPT","PLANE-OFFSET ARC","LOW-SIGNATURE COAST","DOGLEG OFFSET","SPIRAL WEAVE","DELAYED WAKE","COOPERATIVE PINCER"]),
    terminal: Object.freeze(["CENTER-MASS STRIKE","PROXIMITY BURST","PENETRATE / DELAY","SUBSYSTEM SPEAR","FLY-BY FRAGMENT","COUNTER-EVASION WEAVE","REACQUIRE LOOP"]),
    warhead: Object.freeze(["INERT KINETIC","FRAGMENTATION","SHAPED PLASMA","DISRUPTOR PULSE","BREACH PENETRATOR","SENSOR / MARKER"]),
    body: Object.freeze(["LIGHT INTERCEPTOR","STANDARD STRIKE","HEAVY PENETRATOR","LONG-ENDURANCE BUS","LOW-OBSERVABLE SHROUD","MULTI-STAGE CARRIER"]),
    propulsion: Object.freeze(["SPRINT MOTOR","SUSTAINER DRIVE","DUAL-PULSE DRIVE","VECTOR THRUSTER PACK","SILENT COAST STAGE","INTERCEPTOR DRIVE"]),
    power: Object.freeze(["THERMAL BATTERY","CAPACITOR BANK","MICROTURBINE GENERATOR","FUEL-CELL STACK","ISOTOPE RESERVE","HYBRID DUAL-SOURCE"])
  });

  const LABELS = Object.freeze({
    targeting:"TARGET",
    approach:"APPROACH",
    terminal:"TERMINAL",
    warhead:"WARHEAD",
    body:"BODY / BUS",
    propulsion:"PROPULSION",
    power:"POWER"
  });

  const COIL_MUNITIONS = Object.freeze([
    "INERT KINETIC",
    "BREACH PENETRATOR",
    "FRAGMENTATION",
    "SHAPED PLASMA",
    "DISRUPTOR PULSE",
    "SENSOR / MARKER"
  ]);

  const FIRE_CONTROL_TOPOLOGIES = Object.freeze([
    Object.freeze({id:"vector",label:"VECTOR LEAD",short:"VECTOR",feedback:"STANDARD LEAD RETICLE",tradeoff:"QUICK LOCK · TURN-SENSITIVE",lock:"FAST"}),
    Object.freeze({id:"prediction",label:"PATTERN PREDICTION",short:"PREDICT",feedback:"PROBABILITY HEAT ZONE",tradeoff:"COMPUTE DELAY · BETTER EVASION MODEL",lock:"DELAYED"}),
    Object.freeze({id:"cooperative",label:"COOPERATIVE",short:"CO-OP",feedback:"RELAY-FRAMED TARGET",tradeoff:"RELAY DEPENDENT · JAM VULNERABLE",lock:"RELAY"}),
    Object.freeze({id:"bracket",label:"BRACKET SPREAD",short:"BRACKET",feedback:"SPREAD PATTERN",tradeoff:"HIGH AMMUNITION CONSUMPTION",lock:"SALVO"})
  ]);

  const BRACKET_PATTERNS = Object.freeze(["CROSS","RING","SEQUENTIAL"]);

  const selection = Object.fromEntries(Object.entries(OPTIONS).map(([id, list]) => [id, Math.floor(list.length / 2)]));
  const armament = {munition:0,topology:0,bracket:0,guard:"GUARD CLOSED",serial:1};
  let serial = 1;
  let observer = null;
  let queued = false;

  const esc = value => String(value ?? "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const wrap = (value,length) => (value % length + length) % length;
  const current = id => OPTIONS[id][selection[id]];
  const currentMunition = () => COIL_MUNITIONS[armament.munition];
  const currentTopology = () => FIRE_CONTROL_TOPOLOGIES[armament.topology];
  const currentBracket = () => BRACKET_PATTERNS[armament.bracket];

  function activeProcedure() {
    const begin = document.querySelector("#station-panel [data-procedure-begin]");
    return Boolean(begin && /restart procedure/i.test(begin.textContent || ""));
  }

  function optionMarkup(id) {
    return OPTIONS[id].map((value, index) => `<option value="${index}" ${index === selection[id] ? "selected" : ""}>${esc(value)}</option>`).join("");
  }

  function summary() {
    return `${current("targeting")} · ${current("terminal")} · ${current("warhead")}`;
  }

  function fcfMarkup() {
    const armed = activeProcedure();
    const fields = Object.keys(OPTIONS).map(id => `<label class="exo-fcf07-field"><span>${LABELS[id]}</span><select data-fcf07-select="${id}" aria-label="${LABELS[id]}">${optionMarkup(id)}</select></label>`).join("");
    return `<span class="exo-device-label"><b class="exo-device-code">GUN-FCF-07</b><span> · FIRE CONTROL CONFIRM</span></span>
      <div class="exo-fcf07-head"><span>MUNITION PROGRAM / SLOT ${String(serial).padStart(2,"0")}</span><b>${armed ? "PROCEDURE LIVE" : "LOCAL SETUP"}</b></div>
      <div class="exo-fcf07-grid">${fields}</div>
      <div class="exo-fcf07-summary" title="${esc(summary())}"><small>PROGRAM</small><b>${esc(summary())}</b></div>
      <div class="exo-fcf07-actions">
        <button type="button" data-proc-input="gun-track-confirm" data-control-id="gun-confirms" data-control-state="TRACK CONFIRMED" data-proc-label="GUN-FCF-07 · FIRE CONTROL CONFIRM: MUNITION PROGRAM VALIDATED">VALIDATE</button>
        <button type="button" data-proc-input="gun-weapons-ack" data-control-id="gun-confirms" data-control-state="ACKNOWLEDGED" data-proc-label="GUN-FCF-07 · FIRE CONTROL CONFIRM: MUNITION PROGRAM LOADED / ACKNOWLEDGED">LOAD / ACK</button>
      </div>`;
  }

  function guardStateFromBlock(block) {
    if (!block) return armament.guard;
    const open = block.querySelector('[data-control-state="GUARD OPEN"][aria-pressed="true"]');
    const closed = block.querySelector('[data-control-state="GUARD CLOSED"][aria-pressed="true"]');
    if (open) return "GUARD OPEN";
    if (closed) return "GUARD CLOSED";
    return armament.guard;
  }

  function munitionDrumMarkup() {
    const previous = COIL_MUNITIONS[wrap(armament.munition-1,COIL_MUNITIONS.length)];
    const next = COIL_MUNITIONS[wrap(armament.munition+1,COIL_MUNITIONS.length)];
    return `<div class="exo-mgd01-wheel" aria-label="Coil gun munition selector thumbwheel">
      <button type="button" data-mgd-munition-step="-1" aria-label="Previous munition">▲</button>
      <div class="exo-mgd01-drum"><span>${esc(previous)}</span><b>${esc(currentMunition())}</b><span>${esc(next)}</span></div>
      <button type="button" data-mgd-munition-step="1" aria-label="Next munition">▼</button>
      <small>MUNITION</small>
    </div>`;
  }

  function topologyMarkup() {
    return `<div class="exo-mgd01-topology" role="group" aria-label="Fire control topology">${FIRE_CONTROL_TOPOLOGIES.map((item,index) => `<button type="button" data-mgd-topology="${index}" aria-pressed="${index===armament.topology}"><b>${item.short}</b><span>${item.label}</span></button>`).join("")}</div>`;
  }

  function bracketMarkup() {
    const enabled = currentTopology().id === "bracket";
    return `<div class="exo-mgd01-bracket" data-enabled="${enabled}"><small>BRACKET</small>${BRACKET_PATTERNS.map((pattern,index) => `<button type="button" data-mgd-bracket="${index}" aria-pressed="${index===armament.bracket}" ${enabled?"":"disabled"}>${pattern}</button>`).join("")}</div>`;
  }

  function armamentMarkup() {
    const topology = currentTopology();
    const open = armament.guard === "GUARD OPEN";
    return `<span class="exo-device-label"><b class="exo-device-code">GUN-MGD-01</b><span> · COIL GUN MASTER ARMAMENT</span></span>
      <div class="exo-mgd01-body">
        <div class="exo-mgd01-status"><b>${esc(currentMunition())}</b><span>${topology.feedback} · ${topology.tradeoff}</span></div>
        <div class="exo-mgd01-guard"><small>MASTER GUARD</small><button type="button" aria-pressed="${open}" data-proc-input="gun-safe-open" data-control-id="weapon-safe" data-control-state="GUARD OPEN" data-proc-label="GUN-MGD-01 · COIL GUN MASTER ARMAMENT: LIFT ARM GUARD">LIFT</button><button type="button" aria-pressed="${!open}" data-proc-input="gun-safe-close" data-control-id="weapon-safe" data-control-state="GUARD CLOSED" data-proc-label="GUN-MGD-01 · COIL GUN MASTER ARMAMENT: SAFE / CLOSE">SAFE</button></div>
        ${munitionDrumMarkup()}
        ${topologyMarkup()}
        ${bracketMarkup()}
      </div>`;
  }

  function rangeTelemetry(display) {
    const text = display?.querySelector(".exo-display-caption")?.textContent || "";
    const range = text.match(/([\d,]+)\s*km/i)?.[1] || "42,000";
    const bearing = text.match(/(\d+(?:\.\d+)?)°/)?.[1] || "074";
    return {range,bearing};
  }

  function bracketSvg(pattern) {
    if (pattern === "RING") return `<g class="exo-gun-bracket-pattern"><circle cx="78" cy="23" r="8"/><circle cx="78" cy="23" r="4.7"/><path d="M78 12v4 M78 30v4 M67 23h4 M85 23h4"/></g>`;
    if (pattern === "SEQUENTIAL") return `<g class="exo-gun-bracket-pattern sequential"><circle cx="70" cy="30" r="2.2"/><circle cx="74" cy="26.5" r="2.2"/><circle cx="78" cy="23" r="2.2"/><circle cx="82" cy="19.5" r="2.2"/><circle cx="86" cy="16" r="2.2"/><path d="M68 32 L88 14"/></g>`;
    return `<g class="exo-gun-bracket-pattern"><path d="M66 23h24 M78 11v24"/><circle cx="69" cy="23" r="2.3"/><circle cx="87" cy="23" r="2.3"/><circle cx="78" cy="14" r="2.3"/><circle cx="78" cy="32" r="2.3"/></g>`;
  }

  function topologySvg(topology) {
    if (topology.id === "prediction") return `<g class="exo-gun-prediction-zone"><rect x="78" y="8" width="18" height="15" rx="2"/><ellipse cx="87" cy="15.5" rx="6" ry="4"/><ellipse cx="84" cy="18" rx="3.5" ry="2.5"/></g><g class="exo-gun-lead-reticle"><circle cx="88" cy="15" r="4.2"/><path d="M88 8v4 M88 18v4 M81 15h4 M91 15h4"/></g>`;
    if (topology.id === "cooperative") return `<g class="exo-gun-cooperative"><rect x="71" y="15" width="14" height="16"/><path d="M71 18h4 M71 18v4 M85 18h-4 M85 18v4 M71 28h4 M71 28v-4 M85 28h-4 M85 28v-4"/><circle cx="64" cy="11" r="2.3"/><path d="M65.5 12.5 L74 19"/></g><g class="exo-gun-lead-reticle"><circle cx="87" cy="14" r="3.8"/><path d="M87 7v4 M87 17v4 M80 14h4 M90 14h4"/></g>`;
    if (topology.id === "bracket") return bracketSvg(currentBracket());
    return `<g class="exo-gun-lead-reticle"><circle cx="88" cy="14" r="4.4"/><circle cx="88" cy="14" r="1.2"/><path d="M88 6v5 M88 17v5 M80 14h5 M91 14h5"/></g>`;
  }

  function fireControlMarkup(display) {
    const topology = currentTopology();
    const telemetry = rangeTelemetry(display);
    const lockDelay = topology.id === "prediction" ? "SOLVE +2.8 S" : topology.id === "cooperative" ? "RLY-03 LINK" : topology.id === "bracket" ? "4-RND SALVO" : "LOCK READY";
    return `<div class="exo-gun-solution-overlay" data-gun-topology="${topology.id}" data-bracket-pattern="${currentBracket().toLowerCase()}">
      <svg class="exo-gun-solution-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="exo-gun-range-vector" d="M50 58 L78 23"/>
        <path class="exo-gun-lead-vector" d="M78 23 L88 14"/>
        <g class="exo-gun-synthetic-target" transform="translate(78 23) rotate(-28)"><path d="M-5 0 L1 -1.8 L5 0 L1 1.8 Z"/><path d="M-1 -3 L1 0 L-1 3"/></g>
        ${topologySvg(topology)}
      </svg>
      <div class="exo-gun-hud exo-gun-hud-left"><small>COIL FIRE CONTROL</small><b>${topology.label}</b><span>${topology.feedback}</span></div>
      <div class="exo-gun-hud exo-gun-hud-right"><small>TARGET / LEAD</small><b>BRG ${telemetry.bearing}° · RNG ${telemetry.range} KM</b><span>LEAD +06.4° · TOF 8.4 S</span></div>
      <div class="exo-gun-target-tag"><b>SYNTH TARGET T-17</b><span>${topology.id==="cooperative"?"RLY-03 DESIGNATION":"TRACK 0.94"}</span></div>
      <div class="exo-gun-solution-status"><b>${esc(currentMunition())}</b><span>${lockDelay}</span><em>${topology.tradeoff}</em>${topology.id==="bracket"?`<strong>${currentBracket()} PATTERN · AMMO ×4</strong>`:""}</div>
    </div>`;
  }

  function locateFcf() {
    const selected = document.querySelector("#station-tabs [data-station='gunnery'][aria-selected='true']");
    if (!selected) return null;
    return document.querySelector("#station-panel .station-gunnery .exo-device-block[data-control-code='GUN-FCF-07']");
  }

  function locateMgd() {
    const selected = document.querySelector("#station-tabs [data-station='gunnery'][aria-selected='true']");
    if (!selected) return null;
    return document.querySelector("#station-panel .station-gunnery .exo-device-block[data-control-code='GUN-MGD-01']");
  }

  function locateFireControlDisplay() {
    const selected = document.querySelector("#station-tabs [data-station='gunnery'][aria-selected='true']");
    if (!selected) return null;
    return document.querySelector("#station-panel .display-target");
  }

  function renderFcf() {
    const block = locateFcf();
    if (!block) return;
    if (block.dataset.fcf07Program === String(serial)) return;
    block.dataset.fcf07Program = String(serial);
    block.classList.add("exo-fcf07-program");
    block.innerHTML = fcfMarkup();
  }

  function renderArmament() {
    const block = locateMgd();
    if (!block) return;
    if (!block.classList.contains("exo-mgd01-armament")) armament.guard = guardStateFromBlock(block);
    if (block.dataset.mgd01Serial === String(armament.serial)) return;
    block.dataset.mgd01Serial = String(armament.serial);
    block.classList.add("exo-mgd01-armament");
    block.innerHTML = armamentMarkup();
  }

  function renderFireControl() {
    const display = locateFireControlDisplay();
    if (!display) return;
    const existing = display.querySelector(".exo-gun-solution-overlay");
    if (existing?.dataset.serial === String(armament.serial)) return;
    existing?.remove();
    display.insertAdjacentHTML("beforeend",fireControlMarkup(display));
    const overlay = display.querySelector(".exo-gun-solution-overlay");
    if (overlay) overlay.dataset.serial = String(armament.serial);
  }

  function render() {
    queued = false;
    renderFcf();
    renderArmament();
    renderFireControl();
  }

  function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function bumpArmament() {
    armament.serial = armament.serial >= 9999 ? 1 : armament.serial + 1;
    queueRender();
  }

  function playDetent(seed,intensity=.78) {
    try { window.EXO_CONTROL_AUDIO?.play?.("thumbwheel-notch", {station:"gunnery",seed,intensity}); } catch (_) {}
  }

  document.addEventListener("change", event => {
    const select = event.target.closest("[data-fcf07-select]");
    if (!select) return;
    const id = select.dataset.fcf07Select;
    if (!OPTIONS[id]) return;
    selection[id] = Math.max(0, Math.min(OPTIONS[id].length - 1, Number(select.value) || 0));
    serial = serial >= 99 ? 1 : serial + 1;
    playDetent(`fcf07:${id}:${selection[id]}`);
    queueRender();
  });

  document.addEventListener("click", event => {
    const munition = event.target.closest("[data-mgd-munition-step]");
    if (munition) {
      armament.munition = wrap(armament.munition + Number(munition.dataset.mgdMunitionStep || 0),COIL_MUNITIONS.length);
      playDetent(`mgd01:munition:${armament.munition}`,.88);
      bumpArmament();
      return;
    }
    const topology = event.target.closest("[data-mgd-topology]");
    if (topology) {
      armament.topology = Math.max(0,Math.min(FIRE_CONTROL_TOPOLOGIES.length-1,Number(topology.dataset.mgdTopology)||0));
      playDetent(`mgd01:topology:${armament.topology}`,.82);
      bumpArmament();
      return;
    }
    const bracket = event.target.closest("[data-mgd-bracket]");
    if (bracket && currentTopology().id === "bracket") {
      armament.bracket = Math.max(0,Math.min(BRACKET_PATTERNS.length-1,Number(bracket.dataset.mgdBracket)||0));
      playDetent(`mgd01:bracket:${armament.bracket}`,.8);
      bumpArmament();
      return;
    }
    const guard = event.target.closest(".exo-mgd01-armament [data-control-state]");
    if (guard?.dataset.controlId === "weapon-safe") {
      armament.guard = guard.dataset.controlState || armament.guard;
      armament.serial = armament.serial >= 9999 ? 1 : armament.serial + 1;
      queueRender();
    }
  });

  function start() {
    observer = new MutationObserver(queueRender);
    observer.observe(document.getElementById("station-panel") || document.body, {childList:true,subtree:true,attributes:true,attributeFilter:["aria-selected"]});
    queueRender();
  }

  window.EXO_GUN_FCF07 = Object.freeze({
    selection,
    armament,
    current:id=>current(id),
    currentMunition,
    currentTopology,
    currentBracket,
    refresh:queueRender
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();