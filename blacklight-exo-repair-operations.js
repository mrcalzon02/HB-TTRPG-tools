(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const d10 = () => Math.floor(Math.random() * 10) + 1;
  const pick = list => list[Math.floor(Math.random() * list.length)];

  const STATIONS = Object.freeze({
    helm: {
      label: "Helm",
      output: "Thrust / attitude command interface",
      labels: {
        guard: "Flight inhibit guard", mode: "Flight-mode rotary", bus: "Thruster manifold selector",
        dial: "Attitude trim knob", slider: "Translation demand slider", lever: "Thrust gate lever",
        confirmA: "Vector confirm", confirmB: "Pilot acknowledge", execute: "Thrust execution relay"
      }
    },
    navigation: {
      label: "Navigation",
      output: "Committed navigation-solution interface",
      labels: {
        guard: "Solution inhibit guard", mode: "Solution-mode rotary", bus: "Reference-source selector",
        dial: "Transfer index knob", slider: "Δv bias slider", lever: "Solution gate lever",
        confirmA: "Vector confirm", confirmB: "Timebase lock", execute: "Solution commit relay"
      }
    },
    gunnery: {
      label: "Gunnery",
      output: "Fire-control / weapon authorization interface",
      labels: {
        guard: "Weapon arm guard", mode: "Fire-control rotary", bus: "Track / weapon feed selector",
        dial: "Range-rate gate knob", slider: "Capacitor demand slider", lever: "Weapon arm lever",
        confirmA: "Track confirm", confirmB: "Weapons acknowledge", execute: "Weapon execution relay"
      }
    },
    engineering: {
      label: "Engineering",
      output: "Plant configuration / distribution interface",
      labels: {
        guard: "Plant safety guard", mode: "Plant-mode rotary", bus: "Distribution-source selector",
        dial: "Load-share trim knob", slider: "Coolant / load command slider", lever: "Bus-tie lever",
        confirmA: "Plant confirm", confirmB: "Casualty acknowledge", execute: "Configuration execution relay"
      }
    },
    science: {
      label: "Science / Scanning",
      output: "Sensor acquisition / emitter interface",
      labels: {
        guard: "Emitter inhibit guard", mode: "Sensor-mode rotary", bus: "Aperture / receiver selector",
        dial: "Receiver-gain knob", slider: "Integration-time slider", lever: "Emitter gate lever",
        confirmA: "Track confirm", confirmB: "Analyst acknowledge", execute: "Acquisition execution relay"
      }
    },
    comms: {
      label: "Comms",
      output: "Carrier / transmitter command interface",
      labels: {
        guard: "Transmit inhibit guard", mode: "Link-mode rotary", bus: "Carrier-path selector",
        dial: "Frequency vernier knob", slider: "Power / beamwidth slider", lever: "Transmit key lever",
        confirmA: "Address confirm", confirmB: "Crypto acknowledge", execute: "Transmit execution relay"
      }
    }
  });

  const NODE_TEMPLATE = Object.freeze([
    { id: "power-in", kind: "power feed", x: 28, y: 246, w: 112, h: 54, fixed: "28 VDC / logic feed" },
    { id: "main-fuse", kind: "protective fuse", x: 168, y: 246, w: 112, h: 54, fixed: "Panel protective fuse" },
    { id: "control-bus", kind: "control backplane", x: 308, y: 246, w: 118, h: 54, fixed: "Control / logic backplane" },
    { id: "guard", kind: "guarded switch", x: 462, y: 55, w: 132, h: 58, key: "guard" },
    { id: "mode", kind: "rotary selector", x: 626, y: 55, w: 132, h: 58, key: "mode" },
    { id: "bus-selector", kind: "source selector", x: 790, y: 55, w: 146, h: 58, key: "bus" },
    { id: "dial", kind: "rotary trim", x: 462, y: 164, w: 132, h: 58, key: "dial" },
    { id: "slider", kind: "linear command", x: 626, y: 164, w: 132, h: 58, key: "slider" },
    { id: "lever", kind: "three-position lever", x: 790, y: 164, w: 146, h: 58, key: "lever" },
    { id: "confirm-a", kind: "momentary confirm", x: 500, y: 286, w: 144, h: 58, key: "confirmA" },
    { id: "confirm-b", kind: "momentary acknowledge", x: 710, y: 286, w: 154, h: 58, key: "confirmB" },
    { id: "auth-key", kind: "key receptacle", x: 430, y: 408, w: 128, h: 58, fixed: "Authorization key receptacle" },
    { id: "auth-lock", kind: "keyed interlock", x: 588, y: 408, w: 128, h: 58, fixed: "SAFE / ARM key lock" },
    { id: "shield-switch", kind: "shield interlock", x: 746, y: 408, w: 128, h: 58, fixed: "Execution shield interlock" },
    { id: "execute-relay", kind: "safety relay", x: 832, y: 496, w: 132, h: 58, key: "execute" },
    { id: "feedback-return", kind: "feedback monitor", x: 286, y: 496, w: 132, h: 58, fixed: "Command-state feedback" },
    { id: "station-output", kind: "downstream interface", x: 612, y: 508, w: 176, h: 58, output: true }
  ]);

  const EDGE_TEMPLATE = Object.freeze([
    ["pwr-a", "power-in", "main-fuse", "power"],
    ["pwr-b", "main-fuse", "control-bus", "power"],
    ["pwr-guard", "control-bus", "guard", "power"],
    ["pwr-mode", "control-bus", "mode", "power"],
    ["pwr-bus", "control-bus", "bus-selector", "power"],
    ["pwr-dial", "control-bus", "dial", "power"],
    ["pwr-slider", "control-bus", "slider", "power"],
    ["pwr-lever", "control-bus", "lever", "power"],
    ["sig-guard-mode", "guard", "mode", "signal"],
    ["sig-mode-bus", "mode", "bus-selector", "signal"],
    ["sig-bus-dial", "bus-selector", "dial", "signal"],
    ["sig-dial-slider", "dial", "slider", "signal"],
    ["sig-slider-lever", "slider", "lever", "signal"],
    ["sig-lever-confirm-a", "lever", "confirm-a", "signal"],
    ["sig-confirm-a-b", "confirm-a", "confirm-b", "signal"],
    ["sig-confirm-auth", "confirm-b", "auth-key", "signal"],
    ["safe-key-lock", "auth-key", "auth-lock", "safety"],
    ["safe-lock-shield", "auth-lock", "shield-switch", "safety"],
    ["safe-shield-relay", "shield-switch", "execute-relay", "safety"],
    ["safe-relay-output", "execute-relay", "station-output", "safety"],
    ["return-output-monitor", "station-output", "feedback-return", "return"],
    ["return-monitor-confirm", "feedback-return", "confirm-b", "return"]
  ]);

  const FAULT_TYPES = Object.freeze([
    {
      id: "blown-fuse", label: "protective fuse open", target: "node", candidates: ["main-fuse"], repairAction: "replace",
      symptom: station => `${station.label} loses the control bus after a transient. Panel feed is present upstream, but downstream control power does not remain established.`,
      expected: target => ["isolate-power", `continuity-test:${target}`, `replace:${target}`, "restore-power", "functional-test"]
    },
    {
      id: "relay-failure", label: "execution relay contact failure", target: "node", candidates: ["execute-relay"], repairAction: "replace",
      symptom: station => `${station.label} accepts the keyed authorization sequence, but the final commanded state does not propagate to the downstream interface.`,
      expected: target => ["isolate-power", `inspect:${target}`, `continuity-test:${target}`, `replace:${target}`, "restore-power", "functional-test"]
    },
    {
      id: "loose-connector", label: "high-resistance connector", target: "node", candidates: ["bus-selector", "confirm-a", "confirm-b", "feedback-return"], repairAction: "reseat",
      symptom: station => `${station.label} indications flicker with vibration and an otherwise valid control state intermittently disappears from the feedback path.`,
      expected: target => ["isolate-power", `inspect:${target}`, `reseat:${target}`, `continuity-test:${target}`, "restore-power", "functional-test"]
    },
    {
      id: "open-conductor", label: "open conductor", target: "edge", candidates: ["sig-guard-mode", "sig-mode-bus", "sig-bus-dial", "sig-dial-slider", "sig-slider-lever", "sig-lever-confirm-a", "sig-confirm-a-b", "return-monitor-confirm"], repairAction: "splice",
      symptom: station => `${station.label} has normal local power, but one command transition disappears between adjacent control stages and never reaches the next device.`,
      expected: target => ["isolate-power", `continuity-test:${target}`, `splice:${target}`, `continuity-test:${target}`, "restore-power", "functional-test"]
    },
    {
      id: "ground-short", label: "branch short to chassis", target: "edge", candidates: ["pwr-guard", "pwr-mode", "pwr-bus", "pwr-dial", "pwr-slider", "pwr-lever"], repairAction: "splice",
      symptom: station => `${station.label} control voltage collapses only when one branch is energized; current limiting or the protective feed reacts without a complete panel blackout.`,
      expected: target => ["isolate-power", `ground-test:${target}`, `splice:${target}`, `ground-test:${target}`, "restore-power", "functional-test"]
    }
  ]);

  const ACTION_LABELS = Object.freeze({
    "isolate-power": "Opened service disconnect",
    "inspect": "Visual inspection",
    "continuity-test": "Continuity test",
    "ground-test": "Insulation / ground test",
    "replace": "Replaced component",
    "splice": "Spliced / replaced conductor",
    "reseat": "Reseated connector",
    "restore-power": "Closed service disconnect",
    "functional-test": "Functional test / DM relay"
  });

  let activeStation = "engineering";
  let state = freshState();

  function freshState() {
    return {
      fault: null,
      selected: null,
      servicePower: "energized",
      sequence: [],
      relay: null,
      instrument: "No test performed",
      trainingOverlay: false,
      safetyViolations: 0,
      log: [],
      clock: 0
    };
  }

  function nodesForStation() {
    const station = STATIONS[activeStation];
    return NODE_TEMPLATE.map(node => ({
      ...node,
      label: node.output ? station.output : node.key ? station.labels[node.key] : node.fixed
    }));
  }

  function edgesForStation() {
    return EDGE_TEMPLATE.map(([id, from, to, kind]) => ({ id, from, to, kind }));
  }

  function targetRecord(id) {
    const node = nodesForStation().find(item => item.id === id);
    if (node) return { id, kind: "component", label: node.label, subtype: node.kind };
    const edge = edgesForStation().find(item => item.id === id);
    if (!edge) return null;
    const nodes = Object.fromEntries(nodesForStation().map(item => [item.id, item]));
    return { id, kind: "wire run", label: `${nodes[edge.from].label} → ${nodes[edge.to].label}`, subtype: `${edge.kind} conductor` };
  }

  function addLog(source, message) {
    state.clock += 1;
    state.log.unshift({ time: state.clock, source, message });
    state.log = state.log.slice(0, 80);
    renderLog();
  }

  const timeString = n => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  function renderTabs() {
    $("repair-station-tabs").innerHTML = Object.entries(STATIONS).map(([key, station]) => `
      <button type="button" class="exo-repair-tab" data-repair-station="${key}" aria-selected="${key === activeStation}">${station.label}</button>`).join("");
  }

  function edgePath(edge, nodeMap) {
    const a = nodeMap[edge.from], b = nodeMap[edge.to];
    const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2;
    const x2 = b.x + b.w / 2, y2 = b.y + b.h / 2;
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
  }

  function renderSchematic() {
    const nodes = nodesForStation();
    const edges = edgesForStation();
    const nodeMap = Object.fromEntries(nodes.map(node => [node.id, node]));
    const faultTarget = state.fault?.targetId;
    const svg = `<svg viewBox="0 0 1000 590" role="img" aria-label="${STATIONS[activeStation].label} service schematic">
      <g class="exo-wire-layer">${edges.map(edge => {
        const selected = state.selected?.id === edge.id ? " selected" : "";
        const fault = state.trainingOverlay && faultTarget === edge.id ? " fault-overlay" : "";
        const title = targetRecord(edge.id).label;
        return `<path class="exo-wire ${edge.kind}${selected}${fault}" data-schematic-target="${edge.id}" d="${edgePath(edge, nodeMap)}"><title>${title}</title></path>`;
      }).join("")}</g>
      <g class="exo-node-layer">${nodes.map(node => {
        const selected = state.selected?.id === node.id ? " selected" : "";
        const fault = state.trainingOverlay && faultTarget === node.id ? " fault-overlay" : "";
        const short = node.label.length > 25 ? `${node.label.slice(0, 24)}…` : node.label;
        return `<g class="exo-device${selected}${fault}" data-schematic-target="${node.id}" transform="translate(${node.x} ${node.y})">
          <rect width="${node.w}" height="${node.h}"></rect>
          <text class="node-title" x="10" y="23">${escapeXml(short)}</text>
          <text class="node-kind" x="10" y="40">${escapeXml(node.kind)}</text>
          <title>${escapeXml(node.label)} · ${escapeXml(node.kind)}</title>
        </g>`;
      }).join("")}</g>
    </svg>`;
    $("repair-schematic").innerHTML = svg;
    $("schematic-title").textContent = `${STATIONS[activeStation].label} internal control panel`;
  }

  function escapeXml(value) {
    return String(value).replace(/[<>&'"]/g, ch => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch]));
  }

  function renderSelection() {
    $("selected-target").textContent = state.selected?.label || "None";
    $("selected-kind").textContent = state.selected ? `${state.selected.kind} · ${state.selected.subtype}` : "—";
    $("instrument-result").textContent = state.instrument;
  }

  function renderFault() {
    const station = STATIONS[activeStation];
    $("repair-status-station").textContent = station.label;
    if (!state.fault) {
      $("repair-status-fault").textContent = "none injected";
      $("fault-severity").textContent = "No fault";
      $("fault-symptom").textContent = "Inject randomized damage to begin a repair attempt.";
      $("repair-attempt-state").textContent = "Awaiting fault";
    } else {
      $("repair-status-fault").textContent = "active service ticket";
      $("fault-severity").textContent = `Severity ${state.fault.severity}`;
      $("fault-symptom").textContent = state.fault.symptom;
      $("repair-attempt-state").textContent = state.fault.repaired ? "Repair applied; verify" : "Fault active";
    }
    $("service-power-state").textContent = state.servicePower.toUpperCase();
  }

  function renderSequence() {
    const host = $("repair-sequence");
    if (!state.sequence.length) {
      host.innerHTML = `<li class="empty">No actions recorded.</li>`;
      return;
    }
    host.innerHTML = state.sequence.map((entry, index) => `<li><b>${index + 1}</b>${entry.label}${entry.targetLabel ? ` · <span class="target">${entry.targetLabel}</span>` : ""}</li>`).join("");
  }

  function renderRelay() {
    const relay = state.relay;
    $("repair-difficulty").textContent = relay ? relay.difficulty : "—";
    $("repair-status-difficulty").textContent = relay ? `Difficulty ${relay.difficulty}` : "pending";
    $("repair-pips").innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${relay && i < relay.difficulty ? "active" : ""}">${i + 1}</i>`).join("");
    if (!relay) {
      $("repair-relay-status").textContent = "Awaiting functional test";
      $("repair-relay-detail").innerHTML = `<div><span>Station</span><strong>${STATIONS[activeStation].label}</strong></div><div><span>Fault</span><strong>Undiagnosed / pending</strong></div><div><span>Sequence quality</span><strong>—</strong></div><div><span>Safety</span><strong>—</strong></div><div><span>Random d10</span><strong>—</strong></div><div><span>Repair state</span><strong>—</strong></div>`;
      $("repair-relay-call").textContent = "The repair console does not determine whether the system is restored. Complete a repair attempt and run the functional test to produce a DM-facing difficulty.";
      return;
    }
    $("repair-relay-status").textContent = `${relay.classification} · suggested difficulty`;
    $("repair-relay-detail").innerHTML = `
      <div><span>Station</span><strong>${relay.station}</strong></div>
      <div><span>Fault</span><strong>${relay.faultLabel} · severity ${relay.severity}</strong></div>
      <div><span>Sequence quality</span><strong>${relay.quality}% · ${relay.classification}</strong></div>
      <div><span>Safety</span><strong>${relay.safetyViolations ? `${relay.safetyViolations} unsafe action(s)` : "procedure-safe"}</strong></div>
      <div><span>Random d10</span><strong>${relay.randomD10} (${relay.randomShift >= 0 ? "+" : ""}${relay.randomShift})</strong></div>
      <div><span>Repair state</span><strong>${relay.repaired ? "correct repair action applied" : "fault not correctly repaired"}</strong></div>`;
    $("repair-relay-call").textContent = `DM REPAIR RELAY: call for the character's normal World of Darkness-derived technical / repair dice pool against Difficulty ${relay.difficulty}. The console reports ${relay.repaired ? "a plausible repair configuration" : "an unresolved or incorrectly treated fault"}, but the DM determines whether the repair succeeds, how long it takes, and whether it remains stable.`;
  }

  function renderLog() {
    const host = $("repair-log");
    host.innerHTML = state.log.length ? state.log.map(item => `<li><time>${timeString(item.time)}</time><strong>${item.source}</strong><span>${item.message}</span></li>`).join("") : `<li><time>00:00</time><strong>System</strong><span>No maintenance events logged.</span></li>`;
  }

  function renderAll() {
    renderTabs();
    renderSchematic();
    renderSelection();
    renderFault();
    renderSequence();
    renderRelay();
    renderLog();
    $("repair-training-overlay").setAttribute("aria-pressed", String(state.trainingOverlay));
  }

  function injectFault() {
    const type = pick(FAULT_TYPES);
    const targetId = pick(type.candidates);
    const severity = 1 + Math.floor(Math.random() * 3);
    state.fault = {
      typeId: type.id,
      label: type.label,
      targetId,
      targetKind: type.target,
      repairAction: type.repairAction,
      severity,
      symptom: type.symptom(STATIONS[activeStation]),
      expected: type.expected(targetId),
      repaired: false
    };
    state.sequence = [];
    state.relay = null;
    state.selected = null;
    state.instrument = "No test performed";
    state.servicePower = "energized";
    state.safetyViolations = 0;
    addLog("Damage", `${STATIONS[activeStation].label} service ticket opened: randomized internal fault injected. Exact location remains hidden.`);
    renderAll();
  }

  function selectTarget(id) {
    state.selected = targetRecord(id);
    state.instrument = "Target selected; choose a diagnostic action.";
    renderSelection();
    renderSchematic();
  }

  function actionToken(action, targetId) {
    if (["isolate-power", "restore-power", "functional-test"].includes(action)) return action;
    return `${action}:${targetId || "none"}`;
  }

  function recordAction(action, target) {
    const targetId = target?.id || null;
    state.sequence.push({ token: actionToken(action, targetId), action, targetId, label: ACTION_LABELS[action], targetLabel: target?.label || "" });
    if (state.sequence.length > 30) state.sequence.shift();
  }

  function diagnosticResult(action, target) {
    if (!state.fault) return "No active fault ticket.";
    if (!target) return "Select a component or wire run first.";
    const hit = target.id === state.fault.targetId;
    const repairedHit = hit && state.fault.repaired;
    if (action === "inspect") {
      if (repairedHit) return "Repair area is seated, secured and shows no remaining visible defect in the simulated service model.";
      if (!hit) return "No visible heat damage, looseness, contamination or displaced hardware.";
      if (state.fault.typeId === "loose-connector") return "Connector shell movement and contact fretting observed; seating is not secure.";
      if (state.fault.typeId === "relay-failure") return "Relay housing shows abnormal heat discoloration; mechanical pickup is suspect.";
      if (state.fault.typeId === "blown-fuse") return "Fuse body / indicator suggests an open protective element; electrical confirmation recommended.";
      return "No conclusive external damage; electrical testing is required.";
    }
    if (action === "continuity-test") {
      if (repairedHit) return target.kind === "wire run" ? "Post-repair continuity nominal across selected conductor." : "Post-repair continuity / contact path within expected range.";
      if (!hit) return target.kind === "wire run" ? "Continuity nominal across selected conductor." : "Continuity / contact path within expected range.";
      if (["blown-fuse", "open-conductor"].includes(state.fault.typeId)) return "OPEN CIRCUIT / no continuity measured.";
      if (state.fault.typeId === "loose-connector") return "Intermittent high resistance; reading changes with connector movement.";
      if (state.fault.typeId === "relay-failure") return "Relay command and switched-contact state disagree; contact path fails continuity under commanded pickup.";
      if (state.fault.typeId === "ground-short") return "Very low branch resistance; continuity alone cannot distinguish load from chassis fault. Perform insulation test.";
    }
    if (action === "ground-test") {
      if (repairedHit) return "Post-repair insulation resistance nominal; no significant leakage to chassis ground.";
      if (hit && state.fault.typeId === "ground-short") return "INSULATION FAILURE: low resistance to chassis ground on selected branch.";
      return "Insulation resistance nominal; no significant leakage to chassis ground.";
    }
    return "Instrument action complete.";
  }

  function runRepairAction(action) {
    if (!state.fault) {
      addLog("Service", "Action ignored: inject a randomized fault before beginning maintenance.");
      return;
    }

    const needsTarget = !["isolate-power", "restore-power", "functional-test"].includes(action);
    const target = needsTarget ? state.selected : null;
    if (needsTarget && !target) {
      state.instrument = "Select a component or wire run before using this action.";
      renderSelection();
      return;
    }

    if (action === "isolate-power") {
      state.servicePower = "isolated";
      recordAction(action, null);
      state.instrument = "Service disconnect OPEN. Control panel de-energized for maintenance.";
      addLog("Technician", "Service disconnect opened; panel placed in maintenance-safe de-energized state.");
    } else if (action === "restore-power") {
      state.servicePower = "energized";
      recordAction(action, null);
      state.instrument = "Service disconnect CLOSED. Panel control power restored.";
      addLog("Technician", "Service disconnect closed; panel re-energized for verification.");
    } else if (["inspect", "continuity-test", "ground-test"].includes(action)) {
      if (["continuity-test", "ground-test"].includes(action) && state.servicePower !== "isolated") {
        state.safetyViolations += 1;
        addLog("Safety", `${ACTION_LABELS[action]} attempted while service power remained energized.`);
      }
      recordAction(action, target);
      state.instrument = diagnosticResult(action, target);
      addLog("Diagnostic", `${ACTION_LABELS[action]} on ${target.label}: ${state.instrument}`);
    } else if (["replace", "splice", "reseat"].includes(action)) {
      if (state.servicePower !== "isolated") {
        state.safetyViolations += 1;
        addLog("Safety", `${ACTION_LABELS[action]} performed while service power remained energized.`);
      }
      recordAction(action, target);
      const correctTarget = target.id === state.fault.targetId;
      const correctMethod = action === state.fault.repairAction;
      if (correctTarget && correctMethod) {
        state.fault.repaired = true;
        state.instrument = `${ACTION_LABELS[action]} applied to suspected fault location. Restoration still requires verification.`;
        addLog("Repair", `Correct repair method applied at ${target.label}; fault marked mechanically addressed pending functional test.`);
      } else {
        state.instrument = `${ACTION_LABELS[action]} completed, but no confirmed fault correction is indicated.`;
        addLog("Repair", `${ACTION_LABELS[action]} applied at ${target.label}; no confirmed correction.`);
      }
    } else if (action === "functional-test") {
      recordAction(action, null);
      if (state.servicePower !== "energized") {
        state.instrument = "Functional test cannot exercise the station while the service disconnect remains open.";
        addLog("Test", "Functional test attempted with service power isolated; no live response available.");
      } else if (state.fault.repaired) {
        state.instrument = "Functional test produces a nominal simulated response path. DM adjudication still required.";
        addLog("Test", "Functional test reached the simulated downstream interface after repair work.");
      } else {
        state.instrument = "Functional test still reproduces the reported symptom / unresolved path.";
        addLog("Test", "Functional test indicates the service fault remains unresolved in the repair model.");
      }
      evaluateRepair();
    }

    renderAll();
  }

  function editDistance(a, b) {
    const m = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) m[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) m[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
      }
    }
    return m[a.length][b.length];
  }

  function repairQuality(actual, expected) {
    if (!actual.length) return 0;
    const max = Math.max(actual.length, expected.length, 1);
    const similarity = clamp(1 - editDistance(actual, expected) / max, 0, 1);
    const aligned = expected.reduce((count, token, index) => count + (actual[index] === token ? 1 : 0), 0) / Math.max(expected.length, 1);
    return clamp(Math.round((similarity * 0.7 + aligned * 0.3) * 100));
  }

  function classifyQuality(q) {
    if (q >= 94) return "manual-correct";
    if (q >= 80) return "serviceable sequence";
    if (q >= 64) return "improvised sequence";
    if (q >= 44) return "poor maintenance practice";
    return "hazardous / incorrect sequence";
  }

  function baseDifficulty(q) {
    if (q >= 94) return 5;
    if (q >= 80) return 6;
    if (q >= 64) return 7;
    if (q >= 44) return 8;
    return 9;
  }

  function evaluateRepair() {
    const fault = state.fault;
    if (!fault) return;
    const actual = state.sequence.map(entry => entry.token);
    const quality = repairQuality(actual, fault.expected);
    const randomD10 = d10();
    const randomShift = randomD10 <= 2 ? -1 : randomD10 >= 9 ? 1 : 0;
    const severityShift = fault.severity === 1 ? 0 : fault.severity === 2 ? 1 : 2;
    const unresolvedShift = fault.repaired ? 0 : 2;
    const safetyShift = Math.min(2, state.safetyViolations);
    const overrunShift = actual.length > fault.expected.length + 4 ? 1 : 0;
    const difficulty = clamp(baseDifficulty(quality) + severityShift + unresolvedShift + safetyShift + overrunShift + randomShift, 2, 10);
    state.relay = {
      station: STATIONS[activeStation].label,
      faultLabel: fault.label,
      severity: fault.severity,
      quality,
      classification: classifyQuality(quality),
      repaired: fault.repaired,
      safetyViolations: state.safetyViolations,
      randomD10,
      randomShift,
      difficulty
    };
    addLog("DM Relay", `${fault.label} repair attempt evaluated at ${quality}% procedural quality; suggested Difficulty ${difficulty}. No repair success resolved.`);
  }

  function clearAttempt() {
    state.sequence = [];
    state.relay = null;
    state.selected = null;
    state.instrument = "No test performed";
    state.servicePower = "energized";
    state.safetyViolations = 0;
    if (state.fault) state.fault.repaired = false;
    addLog("System", "Current repair attempt cleared; fault ticket retained for another attempt.");
    renderAll();
  }

  function reset() {
    state = freshState();
    activeStation = "engineering";
    addLog("System", "Console Repair Bay initialized. Select a station and inject randomized damage.");
    renderAll();
  }

  function changeStation(key) {
    activeStation = key;
    state = freshState();
    addLog("System", `${STATIONS[key].label} service topology loaded; previous fault ticket cleared.`);
    renderAll();
  }

  function bindEvents() {
    $("repair-station-tabs").addEventListener("click", event => {
      const button = event.target.closest("[data-repair-station]");
      if (button) changeStation(button.dataset.repairStation);
    });
    $("repair-schematic").addEventListener("click", event => {
      const target = event.target.closest("[data-schematic-target]");
      if (target) selectTarget(target.dataset.schematicTarget);
    });
    document.querySelector(".exo-repair-actions").addEventListener("click", event => {
      const button = event.target.closest("[data-repair-action]");
      if (button) runRepairAction(button.dataset.repairAction);
    });
    $("repair-new-fault").addEventListener("click", injectFault);
    $("repair-reset").addEventListener("click", reset);
    $("repair-clear-sequence").addEventListener("click", clearAttempt);
    $("repair-log-clear").addEventListener("click", () => { state.log = []; renderLog(); });
    $("repair-fit").addEventListener("click", () => { const host = $("repair-schematic"); host.scrollLeft = 0; host.scrollTop = 0; });
    $("repair-training-overlay").addEventListener("click", () => {
      state.trainingOverlay = !state.trainingOverlay;
      addLog("Training", `Fault-location overlay ${state.trainingOverlay ? "enabled" : "disabled"}.`);
      renderAll();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    reset();
    bindEvents();
  });
})();
