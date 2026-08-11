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

  const selection = Object.fromEntries(Object.entries(OPTIONS).map(([id, list]) => [id, Math.floor(list.length / 2)]));
  let serial = 1;
  let observer = null;
  let queued = false;

  const esc = value => String(value ?? "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const current = id => OPTIONS[id][selection[id]];

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

  function markup() {
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

  function locate() {
    const selected = document.querySelector("#station-tabs [data-station='gunnery'][aria-selected='true']");
    if (!selected) return null;
    return document.querySelector("#station-panel .station-gunnery .exo-device-block[data-control-code='GUN-FCF-07']");
  }

  function render() {
    queued = false;
    const block = locate();
    if (!block) return;
    if (block.dataset.fcf07Program === String(serial)) return;
    block.dataset.fcf07Program = String(serial);
    block.classList.add("exo-fcf07-program");
    block.innerHTML = markup();
  }

  function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  document.addEventListener("change", event => {
    const select = event.target.closest("[data-fcf07-select]");
    if (!select) return;
    const id = select.dataset.fcf07Select;
    if (!OPTIONS[id]) return;
    selection[id] = Math.max(0, Math.min(OPTIONS[id].length - 1, Number(select.value) || 0));
    serial = serial >= 99 ? 1 : serial + 1;
    try { window.EXO_CONTROL_AUDIO?.play?.("thumbwheel-notch", {station:"gunnery", seed:`fcf07:${id}:${selection[id]}`, intensity:.78}); } catch (_) {}
    const block = locate();
    if (block) {
      block.dataset.fcf07Program = "";
      render();
    }
  });

  function start() {
    observer = new MutationObserver(queueRender);
    observer.observe(document.getElementById("station-panel") || document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["aria-selected"]});
    queueRender();
  }

  window.EXO_GUN_FCF07 = Object.freeze({selection, current: id => current(id), refresh: queueRender});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
