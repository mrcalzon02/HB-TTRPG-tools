(() => {
  "use strict";

  const PANEL_SELECTOR = ".station-science .physical-analysis-confirm-buttons";
  const SOURCE_IDS = ["A", "B", "C", "D", "E"];
  const DESTINATION_ORDER = ["E", "B", "A", "D", "C"];
  const COLORS = Object.freeze({
    A: "#e85b5d",
    B: "#5ecb74",
    C: "#5378db",
    D: "#e0c857",
    E: "#c55bcb"
  });

  const ROUTING_PATTERNS = Object.freeze({
    "passive-track": { A:"A", B:"B", C:"C", D:"D", E:"E" },
    "active-range": { A:"E", B:"B", C:"A", D:"D", E:"C" },
    "spectral-classify": { A:"C", B:"A", C:"E", D:"B", E:"D" },
    "target-designate": { A:"A", B:"D", C:"C", D:"E", E:"B" },
    "wideband-survey": { A:"B", B:"E", C:"C", D:"A", E:"D" },
    "high-gain-followup": { A:"C", B:"B", C:"E", D:"D", E:"A" },
    "optical-verification": { A:"E", B:"A", C:"C", D:"B", E:"D" },
    "emitter-standby-check": { A:"A", B:"C", C:"B", D:"D", E:"E" },
    "side-array-parallax": { A:"D", B:"B", C:"A", D:"E", E:"C" },
    "aux-optical-snapshot": { A:"E", B:"C", C:"A", D:"D", E:"B" },
    "spectral-baseline": { A:"C", B:"B", C:"A", D:"D", E:"E" },
    "active-pulse-recovery": { A:"A", B:"E", C:"C", D:"B", E:"D" },
    "emcon-passive-search": { A:"B", B:"A", C:"C", D:"E", E:"D" },
    "transient-capture": { A:"E", B:"B", C:"D", D:"A", E:"C" },
    "drive-plume-analysis": { A:"C", B:"D", C:"A", D:"B", E:"E" },
    "debris-field-map": { A:"D", B:"C", C:"E", D:"A", E:"B" },
    "optical-parallax-fix": { A:"E", B:"D", C:"B", D:"A", E:"C" },
    "thermal-wake-discrimination": { A:"C", B:"E", C:"A", D:"D", E:"B" },
    "active-ping-ladder": { A:"D", B:"A", C:"E", D:"B", E:"C" },
    "unknown-emission-characterize": { A:"E", B:"C", C:"D", D:"B", E:"A" }
  });

  const identityRouting = () => ({ A:"A", B:"B", C:"C", D:"D", E:"E" });
  const routing = identityRouting();
  const ropes = new Map();
  let mountedPanel = null;
  let svg = null;
  let drag = null;
  let selectedSource = null;
  let raf = 0;
  let lastTime = 0;
  let remountQueued = false;
  let lastAuxSignature = "";

  const selectedProcedureId = () => document.querySelector("#station-panel [data-procedure-select]")?.value || "passive-track";
  const procedureActive = () => Boolean(document.querySelector("#station-panel [data-procedure-abort]:not(:disabled)"));
  const requirement = () => ROUTING_PATTERNS[selectedProcedureId()] || ROUTING_PATTERNS["passive-track"];
  const isCorrect = () => SOURCE_IDS.every(source => routing[source] === requirement()[source]);
  const routeString = value => SOURCE_IDS.map(source => `${source}→${value[source] || "—"}`).join(" · ");

  function emitRoutingState(force = false) {
    if (!procedureActive()) return;
    const required = requirement();
    const satisfied = isCorrect();
    const signature = `${selectedProcedureId()}|${routeString(routing)}|${satisfied}`;
    if (!force && signature === lastAuxSignature) return;
    lastAuxSignature = signature;
    document.dispatchEvent(new CustomEvent("exo:auxiliary-input", {
      detail: {
        station: "science",
        controlId: "SCI-ACF-07-ROUTING",
        label: `SCI-ACF-07 ROUTING: ${routeString(routing)}`,
        value: routeString(routing),
        required: true,
        satisfied,
        target: routeString(required)
      }
    }));
  }

  function setStatus(message, tone = "normal") {
    const panel = mountedPanel;
    if (!panel) return;
    const status = panel.querySelector("[data-tape-router-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function refreshStatus() {
    if (!mountedPanel) return;
    const target = requirement();
    const targetNode = mountedPanel.querySelector("[data-tape-router-target]");
    const currentNode = mountedPanel.querySelector("[data-tape-router-current]");
    if (targetNode) targetNode.textContent = routeString(target);
    if (currentNode) currentNode.textContent = routeString(routing);
    const ok = isCorrect();
    mountedPanel.dataset.routingCorrect = ok ? "true" : "false";
    setStatus(ok ? "ROUTING COHERENT · ANALYSIS PATH MATCHED" : "ROUTING MISMATCH · PATCH LEADS TO REQUIRED DESTINATIONS", ok ? "good" : "warn");
    SOURCE_IDS.forEach(source => {
      const sourceSocket = mountedPanel.querySelector(`[data-tape-source="${source}"]`);
      if (sourceSocket) sourceSocket.dataset.connected = routing[source] ? "true" : "false";
    });
    DESTINATION_ORDER.forEach(destination => {
      const targetSocket = mountedPanel.querySelector(`[data-tape-destination="${destination}"]`);
      if (!targetSocket) return;
      const occupant = SOURCE_IDS.find(source => routing[source] === destination) || "";
      targetSocket.dataset.occupied = occupant ? "true" : "false";
      targetSocket.dataset.source = occupant;
      targetSocket.setAttribute("aria-label", occupant ? `Destination ${destination}, connected from ${occupant}` : `Destination ${destination}, open`);
    });
  }

  function pointForSocket(element) {
    if (!svg || !element) return { x:0, y:0 };
    const s = svg.getBoundingClientRect();
    const r = element.getBoundingClientRect();
    const socketX = element.hasAttribute("data-tape-source") ? r.right : element.hasAttribute("data-tape-destination") ? r.left : r.left + r.width / 2;
    const x = socketX - s.left;
    const y = r.top + r.height / 2 - s.top;
    return { x, y };
  }

  function pointerPoint(event) {
    const r = svg.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(r.width, event.clientX - r.left)),
      y: Math.max(0, Math.min(r.height, event.clientY - r.top))
    };
  }

  function makeNodes(a, b, count = 11) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const sag = Math.sin(Math.PI * t) * 26;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t + sag;
      nodes.push({ x, y, px:x, py:y });
    }
    return nodes;
  }

  function ropePath(nodes) {
    if (!nodes.length) return "";
    if (nodes.length === 1) return `M${nodes[0].x.toFixed(1)} ${nodes[0].y.toFixed(1)}`;
    let d = `M${nodes[0].x.toFixed(1)} ${nodes[0].y.toFixed(1)}`;
    for (let i = 1; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      d += ` Q${a.x.toFixed(1)} ${a.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const last = nodes[nodes.length - 1];
    d += ` T${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    return d;
  }

  function terminalSegmentPath(nodes) {
    if (nodes.length < 3) return ropePath(nodes);
    return ropePath(nodes.slice(-3));
  }

  function destinationFor(source) {
    return mountedPanel?.querySelector(`[data-tape-destination="${routing[source]}"]`) || null;
  }

  function anchorFor(source) {
    return mountedPanel?.querySelector(`[data-tape-source="${source}"]`) || null;
  }

  function ensureRope(source) {
    const anchor = anchorFor(source);
    if (!anchor || !svg) return null;
    const start = pointForSocket(anchor);
    const destination = destinationFor(source);
    const end = drag?.source === source ? drag.point : destination ? pointForSocket(destination) : { x:start.x + 72, y:start.y + 18 };
    let rope = ropes.get(source);
    if (!rope || rope.nodes.length !== 11) {
      const base = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const stripe = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const plug = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const plugBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const plugStripe = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      base.classList.add("exo-tape-wire");
      stripe.classList.add("exo-tape-wire-terminal");
      plug.classList.add("exo-tape-plug");
      plugBody.classList.add("plug-body");
      plugStripe.classList.add("plug-stripe");
      plugBody.setAttribute("x", "-8"); plugBody.setAttribute("y", "-5"); plugBody.setAttribute("width", "16"); plugBody.setAttribute("height", "10"); plugBody.setAttribute("rx", "2");
      plugStripe.setAttribute("x", "-7"); plugStripe.setAttribute("y", "-2"); plugStripe.setAttribute("width", "14"); plugStripe.setAttribute("height", "4"); plugStripe.setAttribute("rx", "1");
      plug.append(plugBody, plugStripe);
      svg.append(base, stripe, plug);
      rope = { source, nodes:makeNodes(start,end), base, stripe, plug, length:0 };
      ropes.set(source, rope);
    }
    rope.base.style.setProperty("--wire-color", COLORS[source]);
    rope.plug.style.setProperty("--wire-color", COLORS[source]);
    return rope;
  }

  function resetRopesToCurrentAnchors() {
    ropes.clear();
    if (svg) svg.innerHTML = "";
    SOURCE_IDS.forEach(ensureRope);
  }

  function integrateRope(rope, dt) {
    const source = rope.source;
    const start = pointForSocket(anchorFor(source));
    const destination = destinationFor(source);
    const end = drag?.source === source ? drag.point : destination ? pointForSocket(destination) : { x:start.x + 70, y:start.y + 24 };
    const nodes = rope.nodes;
    if (!nodes.length) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const gravity = reduced ? 0 : 520;
    const damping = reduced ? 0 : 0.986;
    const step = Math.min(0.032, Math.max(0.008, dt));

    nodes[0].x = start.x; nodes[0].y = start.y; nodes[0].px = start.x; nodes[0].py = start.y;
    const last = nodes[nodes.length - 1];
    last.x = end.x; last.y = end.y; last.px = end.x; last.py = end.y;

    for (let i = 1; i < nodes.length - 1; i++) {
      const node = nodes[i];
      const vx = (node.x - node.px) * damping;
      const vy = (node.y - node.py) * damping;
      node.px = node.x;
      node.py = node.y;
      node.x += vx;
      node.y += vy + gravity * step * step;
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const straight = Math.hypot(dx,dy);
    const cableLength = Math.max(straight * 1.08, straight + 36);
    const segment = cableLength / (nodes.length - 1);
    for (let iter = 0; iter < 5; iter++) {
      nodes[0].x = start.x; nodes[0].y = start.y;
      last.x = end.x; last.y = end.y;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i+1];
        const vx = b.x - a.x, vy = b.y - a.y;
        const dist = Math.max(0.001, Math.hypot(vx,vy));
        const correction = (dist - segment) / dist;
        const cx = vx * correction * 0.5;
        const cy = vy * correction * 0.5;
        if (i !== 0) { a.x += cx; a.y += cy; }
        if (i + 1 !== nodes.length - 1) { b.x -= cx; b.y -= cy; }
      }
    }

    const path = ropePath(nodes);
    rope.base.setAttribute("d", path);
    const destinationId = routing[source];
    if (destinationId && destination) {
      rope.stripe.setAttribute("d", terminalSegmentPath(nodes));
      rope.stripe.style.setProperty("--terminal-color", COLORS[destinationId]);
      rope.stripe.style.opacity = "1";
    } else {
      rope.stripe.style.opacity = "0";
    }
    const endpoint = nodes[nodes.length - 1];
    const prev = nodes[nodes.length - 2];
    const angle = Math.atan2(endpoint.y-prev.y, endpoint.x-prev.x) * 180 / Math.PI;
    rope.plug.setAttribute("transform", `translate(${endpoint.x.toFixed(1)} ${endpoint.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    rope.plug.querySelector(".plug-stripe").style.fill = destinationId ? COLORS[destinationId] : "#aeb8bb";
    rope.plug.dataset.connected = destinationId ? "true" : "false";
  }

  function animate(time) {
    raf = requestAnimationFrame(animate);
    if (!mountedPanel?.isConnected || !svg?.isConnected) return;
    const dt = lastTime ? (time-lastTime)/1000 : 0.016;
    lastTime = time;
    SOURCE_IDS.forEach(source => {
      const rope = ensureRope(source);
      if (rope) integrateRope(rope,dt);
    });
  }

  function connect(source, destination) {
    if (!SOURCE_IDS.includes(source) || !SOURCE_IDS.includes(destination)) return;
    const other = SOURCE_IDS.find(s => s !== source && routing[s] === destination);
    if (other) routing[other] = null;
    routing[source] = destination;
    selectedSource = null;
    refreshStatus();
    emitRoutingState(true);
  }

  function disconnect(source, emit = true) {
    if (!SOURCE_IDS.includes(source)) return;
    routing[source] = null;
    selectedSource = source;
    refreshStatus();
    if (emit) emitRoutingState(true);
  }

  function nearestDestination(point, maxDistance = 34) {
    if (!mountedPanel) return null;
    let best = null;
    let bestDistance = maxDistance;
    for (const id of DESTINATION_ORDER) {
      const element = mountedPanel.querySelector(`[data-tape-destination="${id}"]`);
      if (!element) continue;
      const p = pointForSocket(element);
      const d = Math.hypot(point.x-p.x,point.y-p.y);
      if (d < bestDistance) { best = id; bestDistance = d; }
    }
    return best;
  }

  function handlePointerDown(event) {
    const socket = event.target.closest?.("[data-tape-source]");
    if (!socket || !mountedPanel?.contains(socket) || socket.disabled) return;
    const source = socket.dataset.tapeSource;
    const point = pointerPoint(event);
    disconnect(source, false);
    drag = { source, pointerId:event.pointerId, point };
    socket.setPointerCapture?.(event.pointerId);
    mountedPanel.dataset.dragging = source;
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.point = pointerPoint(event);
    const destination = nearestDestination(drag.point,42);
    mountedPanel?.querySelectorAll("[data-tape-destination]").forEach(el => {
      el.dataset.hover = el.dataset.tapeDestination === destination ? "true" : "false";
    });
    event.preventDefault();
  }

  function finishDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const source = drag.source;
    const destination = cancelled ? null : nearestDestination(drag.point,48);
    drag = null;
    if (mountedPanel) {
      delete mountedPanel.dataset.dragging;
      mountedPanel.querySelectorAll("[data-tape-destination]").forEach(el => delete el.dataset.hover);
    }
    if (destination) connect(source,destination); else disconnect(source);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleClick(event) {
    const sourceSocket = event.target.closest?.("[data-tape-source]");
    if (sourceSocket && mountedPanel?.contains(sourceSocket)) {
      const source = sourceSocket.dataset.tapeSource;
      if (selectedSource === source) selectedSource = null;
      else selectedSource = source;
      mountedPanel.querySelectorAll("[data-tape-source]").forEach(el => el.dataset.selected = el.dataset.tapeSource === selectedSource ? "true" : "false");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const destinationSocket = event.target.closest?.("[data-tape-destination]");
    if (destinationSocket && mountedPanel?.contains(destinationSocket) && selectedSource) {
      connect(selectedSource,destinationSocket.dataset.tapeDestination);
      mountedPanel.querySelectorAll("[data-tape-source]").forEach(el => delete el.dataset.selected);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function createSocket(kind,id,index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `exo-tape-socket ${kind}`;
    button.dataset[kind === "source" ? "tapeSource" : "tapeDestination"] = id;
    button.dataset.socketIndex = String(index);
    button.style.setProperty("--socket-color", COLORS[id]);
    button.innerHTML = `<b>${id}</b><span>${kind === "source" ? "SEND" : "RETURN"}</span><i aria-hidden="true"></i>`;
    button.setAttribute("aria-label", `${kind === "source" ? "Source" : "Destination"} ${id}`);
    return button;
  }

  function mount() {
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!panel || panel === mountedPanel && panel.querySelector("[data-tape-router-stage]")) return;
    mountedPanel = panel || null;
    if (!panel) return;

    const actions = panel.querySelector(".exo-hardware-actions");
    if (!actions) return;
    const originalButtons = [...actions.querySelectorAll(":scope > button")];
    originalButtons.forEach(button => {
      button.classList.add("exo-tape-router-confirm");
      button.hidden = false;
    });

    actions.querySelector("[data-tape-router-stage]")?.remove();
    const stage = document.createElement("section");
    stage.className = "exo-tape-router-stage";
    stage.dataset.tapeRouterStage = "true";
    stage.innerHTML = `
      <header class="exo-tape-router-head">
        <b>LTO 20-ZIPPY-ZAP TAPE-TORNADO</b>
        <span>PHYSICAL PATCH / ANALYSIS ROUTING</span>
      </header>
      <div class="exo-tape-router-layout">
        <div class="exo-tape-rack left" data-tape-left></div>
        <div class="exo-tape-patchfield">
          <div class="exo-tape-patchfield-grid" aria-hidden="true"></div>
          <svg class="exo-tape-wire-layer" data-tape-wire-layer aria-label="Physical patch cables"></svg>
          <div class="exo-tape-route-meta">
            <span>REQUIRED <b data-tape-router-target></b></span>
            <span>CURRENT <b data-tape-router-current></b></span>
          </div>
        </div>
        <div class="exo-tape-rack right" data-tape-right></div>
      </div>
      <div class="exo-tape-router-status" data-tape-router-status aria-live="polite"></div>`;

    const left = stage.querySelector("[data-tape-left]");
    const right = stage.querySelector("[data-tape-right]");
    SOURCE_IDS.forEach((id,index) => left.append(createSocket("source",id,index)));
    DESTINATION_ORDER.forEach((id,index) => right.append(createSocket("destination",id,index)));

    actions.prepend(stage);
    svg = stage.querySelector("[data-tape-wire-layer]");
    resetRopesToCurrentAnchors();
    refreshStatus();

    stage.addEventListener("pointerdown",handlePointerDown);
    stage.addEventListener("pointermove",handlePointerMove);
    stage.addEventListener("pointerup",event => finishDrag(event,false));
    stage.addEventListener("pointercancel",event => finishDrag(event,true));
    stage.addEventListener("click",handleClick);
    requestAnimationFrame(() => {
      resetRopesToCurrentAnchors();
      refreshStatus();
      emitRoutingState();
    });
  }

  function handleGlobalClick(event) {
    if (event.target.closest?.("#crew-scenario-reset")) {
      Object.assign(routing,identityRouting());
      lastAuxSignature = "";
      requestAnimationFrame(() => { mount(); refreshStatus(); });
      return;
    }
    if (event.target.closest?.("#station-tabs [data-station], #station-panel [data-procedure-begin], #station-panel [data-procedure-abort]")) {
      lastAuxSignature = "";
      queueRemount();
    }
  }

  function handleGlobalChange(event) {
    if (!event.target.closest?.("#station-panel [data-procedure-select]")) return;
    lastAuxSignature = "";
    queueRemount();
  }

  function queueRemount() {
    if (remountQueued) return;
    remountQueued = true;
    requestAnimationFrame(() => {
      remountQueued = false;
      mount();
      refreshStatus();
      emitRoutingState();
    });
  }

  function observeStationPanel() {
    const panel = document.getElementById("station-panel");
    if (!panel) return;
    const observer = new MutationObserver(() => queueRemount());
    observer.observe(panel,{childList:true,subtree:true});
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click",handleGlobalClick,false);
    document.addEventListener("change",handleGlobalChange,false);
    observeStationPanel();
    queueRemount();
    raf = requestAnimationFrame(animate);
    addEventListener("beforeunload",() => cancelAnimationFrame(raf),{once:true});
  });
})();