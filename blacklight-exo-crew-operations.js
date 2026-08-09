(() => {
  "use strict";

  const HUMAN_PROFILE = Object.freeze({
    id: "human-standard",
    name: "Human Standard",
    rulesBasis: "World of Darkness-derived d10",
    purpose: "role-play visualization placeholder",
    assumptions: {
      commandModel: "distributed watchstations",
      powerCarrier: "electrical bus",
      sensorModel: "passive + active electromagnetic",
      commsModel: "radio + laser datalink",
      maneuverModel: "RCS + conventional main drive",
      weaponModel: "human fire-control authorization"
    }
  });

  const BASE_POWER = Object.freeze({ helm: 16, navigation: 14, gunnery: 17, engineering: 23, science: 17, comms: 13 });
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
  const round = (value, digits = 0) => Number(value.toFixed(digits));
  const el = (id) => document.getElementById(id);
  const d10 = () => Math.floor(Math.random() * 10) + 1;

  const STATIONS = Object.freeze({
    helm: {
      label: "Helm",
      description: "Human-derived flight-control station. The display is immersive role-play state; the procedure attempt produces a suggested d10 difficulty for the DM.",
      display: "maneuver",
      labels: { guard: "Flight interlock", mode: "Maneuver mode", bus: "Thrust bus", dial: "Vector trim", lever: "Thrust gate", confirmA: "Flight confirm", confirmB: "Pilot acknowledge", execute: "EXECUTE BURN" },
      readouts: state => [["Heading", `${round(state.heading)}°`], ["Velocity", `${round(state.velocity, 1)} km/s`], ["Throttle", `${round(state.throttle)}%`], ["Drive", `${round(state.driveHealth)}%`]],
      procedures: [
        { id: "course-burn", name: "Execute course burn", cue: "Release the flight interlock, establish the commanded maneuver mode and thrust bus, trim the vector, confirm the command, set the thrust gate, then execute.", sequence: ["guard-open","mode-2","bus-primary","dial-right","dial-right","confirm-a","lever-forward","confirm-a","execute"] },
        { id: "evasive-burn", name: "Evasive maneuver", cue: "Release the interlock, move to evasive authority, shift the thrust feed, acknowledge the maneuver, cross-trim the vector, gate thrust, double-confirm, then execute.", sequence: ["guard-open","mode-3","bus-aux","confirm-b","dial-right","dial-left","lever-forward","confirm-b","confirm-b","execute"] },
        { id: "docking-correction", name: "Docking correction", cue: "Release the interlock, select precision maneuvering, establish the primary feed, trim down twice, confirm, center the gate, trim back once, confirm, then execute.", sequence: ["guard-open","mode-1","bus-primary","dial-left","dial-left","confirm-a","lever-center","dial-right","confirm-a","execute"] }
      ]
    },
    navigation: {
      label: "Navigation",
      description: "Human-derived astrogation station. Procedure order matters; the console does not decide whether the character succeeds.",
      display: "plot",
      labels: { guard: "Solution guard", mode: "Ephemeris mode", bus: "Reference source", dial: "Solution index", lever: "Commit gate", confirmA: "Vector confirm", confirmB: "Reference lock", execute: "COMMIT SOLUTION" },
      readouts: state => [["Solution", `${round(state.nav)}%`], ["Destination", state.navDestination], ["Δv plan", `${round(state.navBurnDeltaV, 2)} km/s`], ["Committed", state.courseCommitted ? "yes" : "no"]],
      procedures: [
        { id: "transfer-solve", name: "Compute transfer solution", cue: "Open the solution guard, choose the transfer ephemeris, lock a reference source, advance the solution index repeatedly, confirm, open the commit gate, confirm again, then commit.", sequence: ["guard-open","mode-1","bus-primary","dial-right","dial-right","dial-right","confirm-a","lever-forward","confirm-a","execute"] },
        { id: "course-commit", name: "Commit course to Helm", cue: "Open the guard, choose helm-transfer mode, keep the primary reference, verify both vector and reference, open the commit gate, reconfirm the vector, then commit.", sequence: ["guard-open","mode-2","bus-primary","confirm-a","confirm-b","lever-forward","confirm-a","execute"] },
        { id: "emergency-egress", name: "Emergency egress solution", cue: "Open the guard, enter emergency ephemeris, move to the auxiliary reference, back the solution index once, lock the reference, open the commit gate, double-lock, then commit.", sequence: ["guard-open","mode-3","bus-aux","dial-left","confirm-b","lever-forward","confirm-b","confirm-b","execute"] }
      ]
    },
    gunnery: {
      label: "Gunnery",
      description: "Human fire-control station. Arming and firing are represented as procedural inputs; actual hit or damage resolution remains entirely with the DM and player roll.",
      display: "target",
      labels: { guard: "Weapon interlock", mode: "Fire-control mode", bus: "Weapon feed", dial: "Range gate", lever: "Arm lever", confirmA: "Track confirm", confirmB: "Weapons acknowledge", execute: "FIRE / RELAY" },
      readouts: state => [["Weapon group", state.weaponGroup], ["Capacitors", `${round(state.capacitors)}%`], ["Track", `${round(state.track)}%`], ["Mode", state.weaponMode]],
      procedures: [
        { id: "fire-solution", name: "Build firing solution", cue: "Release the weapon interlock, establish tracking mode and primary feed, walk the range gate forward twice, confirm the track, hold the arm lever centered, acknowledge weapons, then relay.", sequence: ["guard-open","mode-1","bus-primary","dial-right","dial-right","confirm-a","lever-center","confirm-b","execute"] },
        { id: "arm-engage", name: "Arm and engage target", cue: "Release the interlock, select engagement mode and primary feed, double-acknowledge weapons, pull the arm lever forward, advance the range gate, confirm the track, then fire.", sequence: ["guard-open","mode-2","bus-primary","confirm-b","confirm-b","lever-forward","dial-right","confirm-a","execute"] },
        { id: "point-defense", name: "Point-defense burst", cue: "Release the interlock, enter defensive mode, move to auxiliary feed, back then advance the range gate, confirm track, pull the arm lever, double-confirm track, then fire.", sequence: ["guard-open","mode-3","bus-aux","dial-left","dial-right","confirm-a","lever-forward","confirm-a","confirm-a","execute"] }
      ]
    },
    engineering: {
      label: "Engineering",
      description: "Human plant and distribution station. The power diagram is role-play context; complex procedures generate difficulty rather than automatically repairing or damaging the ship.",
      display: "systems",
      labels: { guard: "Plant interlock", mode: "Plant mode", bus: "Distribution bus", dial: "Load trim", lever: "Bus tie lever", confirmA: "Plant confirm", confirmB: "Engineering acknowledge", execute: "APPLY CONFIGURATION" },
      readouts: state => [["Reactor", `${round(state.reactor)}%`], ["Thermal", `${round(state.thermal)}%`], ["Cooling", `${round(state.coolingHealth)}%`], ["Fault", state.engineeringFault || "none"]],
      procedures: [
        { id: "rebalance", name: "Rebalance power distribution", cue: "Release the plant interlock, select distribution mode and primary bus, trim load up then down, confirm plant state, center the bus tie, acknowledge engineering, then apply.", sequence: ["guard-open","mode-1","bus-primary","dial-right","dial-left","confirm-a","lever-center","confirm-b","execute"] },
        { id: "coolant-isolation", name: "Isolate coolant fault", cue: "Release the plant interlock, enter casualty mode, move to auxiliary distribution, acknowledge the fault, back load trim twice, pull the bus tie aft, double-confirm plant state, then apply.", sequence: ["guard-open","mode-2","bus-aux","confirm-b","dial-left","dial-left","lever-aft","confirm-a","confirm-a","execute"] },
        { id: "scram", name: "Emergency reactor SCRAM", cue: "Release the interlock, enter emergency plant mode, isolate distribution, double-acknowledge the casualty, pull the bus tie aft, acknowledge again, then apply the SCRAM configuration.", sequence: ["guard-open","mode-3","bus-isolate","confirm-b","confirm-b","lever-aft","confirm-b","execute"] }
      ]
    },
    science: {
      label: "Science / Scanning",
      description: "Human sensor-analysis station. The sensor picture is atmospheric visualization; procedure quality becomes a DM-facing difficulty suggestion.",
      display: "sensor",
      labels: { guard: "Sensor guard", mode: "Scan mode", bus: "Aperture feed", dial: "Gain trim", lever: "Emitter gate", confirmA: "Track confirm", confirmB: "Analyst acknowledge", execute: "ACQUIRE / RELAY" },
      readouts: state => [["Track", `${round(state.track)}%`], ["Class", state.targetClass], ["Range", state.contact.present ? `${Math.round(state.targetRange).toLocaleString()} km` : "no contact"], ["Emissions", `${round(state.emissions)}%`]],
      procedures: [
        { id: "active-scan", name: "Active contact scan", cue: "Release the sensor guard, select active acquisition, keep the primary aperture feed, advance gain twice, confirm the track, open the emitter gate, reconfirm, then acquire.", sequence: ["guard-open","mode-2","bus-primary","dial-right","dial-right","confirm-a","lever-forward","confirm-a","execute"] },
        { id: "spectral-survey", name: "Deep spectral survey", cue: "Release the guard, enter survey mode, use the auxiliary aperture feed, back gain once then advance twice, acknowledge analysis, center the emitter gate, confirm track, then acquire.", sequence: ["guard-open","mode-1","bus-aux","dial-left","dial-right","dial-right","confirm-b","lever-center","confirm-a","execute"] },
        { id: "classify-anomaly", name: "Classify anomaly", cue: "Release the guard, select anomaly mode and primary feed, confirm the track, advance then back gain, acknowledge analysis, center the emitter gate, confirm once more, then acquire.", sequence: ["guard-open","mode-3","bus-primary","confirm-a","dial-right","dial-left","confirm-b","lever-center","confirm-a","execute"] }
      ]
    },
    comms: {
      label: "Comms",
      description: "Human communications and authentication station. The console supplies a difficulty setting; message success, interception, and narrative consequences remain DM adjudication.",
      display: "link",
      labels: { guard: "Crypto guard", mode: "Link mode", bus: "Carrier path", dial: "Frequency trim", lever: "Transmit gate", confirmA: "Address confirm", confirmB: "Crypto acknowledge", execute: "TRANSMIT / RELAY" },
      readouts: state => [["Link", `${round(state.comms)}%`], ["Channel", state.commsChannel], ["Encryption", state.commsEncryption ? "enabled" : "open"], ["IFF", state.targetIFF]],
      procedures: [
        { id: "authenticate-hail", name: "Authenticate and hail", cue: "Release the crypto guard, select hail mode and primary carrier, advance frequency trim, confirm the address twice, open the transmit gate, acknowledge crypto, then transmit.", sequence: ["guard-open","mode-1","bus-primary","dial-right","confirm-a","confirm-a","lever-forward","confirm-b","execute"] },
        { id: "encrypted-burst", name: "Encrypted tightbeam burst", cue: "Release the guard, select secure-burst mode, shift to auxiliary carrier, acknowledge crypto, advance frequency twice, open the transmit gate, acknowledge crypto again, confirm the address, then transmit.", sequence: ["guard-open","mode-2","bus-aux","confirm-b","dial-right","dial-right","lever-forward","confirm-b","confirm-a","execute"] },
        { id: "distress", name: "Emergency distress broadcast", cue: "Release the guard, enter emergency link mode, isolate the carrier path, double-acknowledge crypto bypass, open the transmit gate, acknowledge once more, then transmit.", sequence: ["guard-open","mode-3","bus-isolate","confirm-b","confirm-b","lever-forward","confirm-b","execute"] }
      ]
    }
  });

  const initialControlState = () => ({ guard: "closed", mode: "1", bus: "primary", dial: 0, lever: "center" });
  const initialState = () => ({
    profile: HUMAN_PROFILE,
    simTime: 0,
    velocity: 12.4,
    heading: 37,
    throttle: 22,
    reactor: 68,
    thermal: 31,
    hull: 100,
    track: 42,
    comms: 88,
    nav: 74,
    weapons: 61,
    driveHealth: 100,
    sensorHealth: 100,
    commsHealth: 100,
    weaponHealth: 100,
    coolingHealth: 100,
    targetRange: 42000,
    targetBearing: 74,
    targetClosure: -1.7,
    targetClass: "unresolved",
    targetIFF: "unknown",
    emissions: 18,
    firingSolution: 0,
    courseCommitted: false,
    navDestination: "Rendezvous Alpha",
    navBurnDeltaV: 2.1,
    commsChannel: "Fleet tactical",
    commsEncryption: true,
    weaponGroup: "Coil battery A",
    weaponMode: "safe",
    capacitors: 54,
    engineeringFault: null,
    power: { ...BASE_POWER },
    stationOnline: { helm: true, navigation: true, gunnery: true, engineering: true, science: true, comms: true },
    contact: { present: false, friendly: false, x: 76, y: 31 },
    selectedProcedure: { helm: "course-burn", navigation: "transfer-solve", gunnery: "fire-solution", engineering: "rebalance", science: "active-scan", comms: "authenticate-hail" },
    procedure: null,
    relay: null,
    log: []
  });

  let state = initialState();
  let activeStation = "helm";
  let timer = null;

  const powerTotal = () => Object.values(state.power).reduce((a, b) => a + b, 0);
  const powerFactor = station => clamp((state.power[station] / BASE_POWER[station]) * 100);
  const engineeringQuality = () => (state.driveHealth + state.coolingHealth + state.hull) / 3;

  function stationContext(station) {
    const values = {
      helm: () => Math.min(powerFactor("helm"), state.nav, state.driveHealth),
      navigation: () => state.track * .45 + state.comms * .35 + powerFactor("navigation") * .20,
      gunnery: () => Math.min(state.track, powerFactor("gunnery"), state.weaponHealth, 100 - Math.max(0, state.thermal - 55)),
      engineering: () => Math.min(powerFactor("engineering"), engineeringQuality()),
      science: () => Math.min(powerFactor("science"), state.sensorHealth, 100 - Math.max(0, state.thermal - 70)),
      comms: () => Math.min(powerFactor("comms"), state.commsHealth)
    };
    return clamp(values[station]?.() ?? 60);
  }

  function coordinationScore() {
    const total = Object.keys(STATIONS).reduce((sum, station) => sum + stationContext(station), 0) / Object.keys(STATIONS).length;
    return clamp(total - Math.max(0, powerTotal() - 100) * 1.5);
  }

  function addLog(station, message) {
    state.log.unshift({ time: state.simTime, station, message });
    state.log = state.log.slice(0, 100);
    renderLog();
  }

  function timeString(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function selectedProcedure(station = activeStation) {
    const def = STATIONS[station];
    return def.procedures.find(item => item.id === state.selectedProcedure[station]) || def.procedures[0];
  }

  function renderTopState() {
    const fields = {
      velocity: `${round(state.velocity, 1)} km/s`, reactor: `${round(state.reactor)}%`, thermal: `${round(state.thermal)}%`, hull: `${round(state.hull)}%`,
      track: `${round(state.track)}%`, comms: `${round(state.comms)}%`, nav: `${round(state.nav)}%`, weapons: `${round(state.weapons)}%`
    };
    Object.entries(fields).forEach(([key, value]) => {
      const target = el(`state-${key}`);
      if (target) target.textContent = value;
      const meter = el(`meter-${key}`);
      if (meter) meter.style.width = `${clamp(key === "velocity" ? state.velocity * 4 : state[key])}%`;
    });
    el("crew-profile-name").textContent = state.profile.name;
    el("crew-summary-rules").textContent = "WoD-derived d10";
    el("crew-summary-resolution").textContent = "DM adjudicated";
    el("crew-summary-difficulty").textContent = state.relay ? `Difficulty ${state.relay.difficulty}` : "pending";
  }

  function renderPowerControls() {
    const host = el("power-controls");
    host.innerHTML = Object.keys(state.power).map(key => `
      <div class="exo-power-control">
        <label><span>${STATIONS[key].label}</span><b>${state.power[key]}</b></label>
        <input data-power="${key}" type="range" min="4" max="30" value="${state.power[key]}" aria-label="${STATIONS[key].label} visual power allocation">
      </div>`).join("");
    const total = powerTotal();
    const badge = el("power-total");
    badge.textContent = `${total} / 100 visual points allocated`;
    badge.dataset.over = total > 100 ? "true" : "false";
  }

  function renderTabs() {
    el("station-tabs").innerHTML = Object.entries(STATIONS).map(([key, def]) => `
      <button class="exo-station-tab" type="button" role="tab" data-station="${key}" aria-selected="${activeStation === key}">
        ${def.label}<span class="tab-state">human console</span>
      </button>`).join("");
  }

  function tacticalDisplay(kind) {
    const hasContact = state.contact.present;
    const contactStyle = `left:${state.contact.x}%;top:${state.contact.y}%;opacity:${hasContact ? 1 : 0}`;
    return `<div class="exo-tactical-display" aria-label="${kind} role-play visualization">
      <div class="exo-tactical-ring"></div>
      <div class="exo-ownship" title="Own ship"></div>
      <div class="exo-contact ${state.contact.friendly ? "friend" : ""}" style="${contactStyle}" title="${state.targetClass}"></div>
      <span class="exo-display-caption">VISUAL ONLY // ${kind} // ${hasContact ? `${round(state.targetBearing)}° · ${Math.round(state.targetRange).toLocaleString()} km` : "no remote track"}</span>
    </div>`;
  }

  function inputHistory() {
    const session = state.procedure;
    if (!session || session.station !== activeStation || !session.active) return `<span class="exo-procedure-empty">No active attempt. Select an action and begin the procedure.</span>`;
    if (!session.inputs.length) return `<span class="exo-procedure-empty">Procedure armed. No controls manipulated yet.</span>`;
    return session.inputs.map((item, index) => `<span class="exo-input-token"><b>${index + 1}</b>${item.label}</span>`).join("");
  }

  function procedureControls(def) {
    const proc = selectedProcedure();
    const session = state.procedure;
    const active = Boolean(session && session.active && session.station === activeStation && session.operationId === proc.id);
    const controls = active ? session.controls : initialControlState();
    const disabled = active ? "" : "disabled";
    const options = def.procedures.map(item => `<option value="${item.id}" ${item.id === proc.id ? "selected" : ""}>${item.name}</option>`).join("");
    return `
      <div class="exo-procedure-console">
        <div class="exo-procedure-setup">
          <div>
            <span class="exo-kicker">Attempted ship action</span>
            <select data-procedure-select aria-label="Select ${def.label} procedure">${options}</select>
          </div>
          <div class="exo-procedure-actions">
            <button type="button" class="exo-control-button primary" data-procedure-begin>${active ? "Restart procedure" : "Begin procedure"}</button>
            <button type="button" class="exo-control-button" data-procedure-abort ${active ? "" : "disabled"}>Abort / clear inputs</button>
          </div>
        </div>
        <div class="exo-procedure-cue"><strong>Operator cue strip</strong><span>${proc.cue}</span><small>The exact switch order and repeated input count are intentionally not displayed.</small></div>
        <div class="exo-physical-controls" data-active="${active}">
          <div class="exo-device-block">
            <span class="exo-device-label">${def.labels.guard}</span><strong>${controls.guard.toUpperCase()}</strong>
            <div class="exo-control-row"><button type="button" data-proc-input="guard-open" data-proc-label="Guard OPEN" ${disabled}>Open</button><button type="button" data-proc-input="guard-close" data-proc-label="Guard CLOSE" ${disabled}>Close</button></div>
          </div>
          <div class="exo-device-block">
            <span class="exo-device-label">${def.labels.mode}</span><strong>MODE ${controls.mode}</strong>
            <div class="exo-control-row"><button type="button" data-proc-input="mode-1" data-proc-label="Mode 1" ${disabled}>1</button><button type="button" data-proc-input="mode-2" data-proc-label="Mode 2" ${disabled}>2</button><button type="button" data-proc-input="mode-3" data-proc-label="Mode 3" ${disabled}>3</button></div>
          </div>
          <div class="exo-device-block">
            <span class="exo-device-label">${def.labels.bus}</span><strong>${controls.bus.toUpperCase()}</strong>
            <div class="exo-control-row"><button type="button" data-proc-input="bus-primary" data-proc-label="Bus PRIMARY" ${disabled}>Primary</button><button type="button" data-proc-input="bus-aux" data-proc-label="Bus AUX" ${disabled}>Aux</button><button type="button" data-proc-input="bus-isolate" data-proc-label="Bus ISOLATE" ${disabled}>Isolate</button></div>
          </div>
          <div class="exo-device-block exo-dial-block">
            <span class="exo-device-label">${def.labels.dial}</span><strong>${controls.dial >= 0 ? "+" : ""}${controls.dial}</strong>
            <div class="exo-control-row"><button type="button" data-proc-input="dial-left" data-proc-label="Dial ◀" ${disabled}>◀ Twist</button><button type="button" data-proc-input="dial-right" data-proc-label="Dial ▶" ${disabled}>Twist ▶</button></div>
          </div>
          <div class="exo-device-block">
            <span class="exo-device-label">${def.labels.lever}</span><strong>${controls.lever.toUpperCase()}</strong>
            <div class="exo-lever-row"><button type="button" data-proc-input="lever-forward" data-proc-label="Lever FORWARD" ${disabled}>Forward</button><button type="button" data-proc-input="lever-center" data-proc-label="Lever CENTER" ${disabled}>Center</button><button type="button" data-proc-input="lever-aft" data-proc-label="Lever AFT" ${disabled}>Aft</button></div>
          </div>
          <div class="exo-device-block exo-confirm-block">
            <span class="exo-device-label">Confirmations</span><strong>REPEAT AS REQUIRED</strong>
            <div class="exo-control-row"><button type="button" data-proc-input="confirm-a" data-proc-label="${def.labels.confirmA}" ${disabled}>${def.labels.confirmA}</button><button type="button" data-proc-input="confirm-b" data-proc-label="${def.labels.confirmB}" ${disabled}>${def.labels.confirmB}</button></div>
          </div>
          <div class="exo-device-block exo-execute-block">
            <span class="exo-device-label">Final control</span><strong>COMMITS CURRENT INPUTS</strong>
            <button type="button" class="exo-execute-button" data-proc-input="execute" data-proc-label="${def.labels.execute}" ${disabled}>${def.labels.execute}</button>
          </div>
        </div>
        <div class="exo-sequence-recorder"><span class="exo-kicker">Input recorder</span><div class="exo-sequence-strip">${inputHistory()}</div></div>
      </div>`;
  }

  function renderStation() {
    const def = STATIONS[activeStation];
    el("station-panel").innerHTML = `
      <div class="exo-station-head">
        <div class="exo-station-title"><span class="exo-kicker">${state.profile.name} procedural watchstation</span><h2>${def.label}</h2><p>${def.description}</p></div>
        <div class="exo-station-readout">${def.readouts(state).map(([label, value]) => `<div class="exo-readout-chip"><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>
      </div>
      <div class="exo-station-body">
        <div class="exo-control-bank exo-procedure-bank">${procedureControls(def)}</div>
        ${tacticalDisplay(def.display)}
      </div>`;
  }

  function renderDependencies() {
    const descriptions = {
      helm: "Visual maneuver context: Helm power, Navigation picture, drive condition.",
      navigation: "Visual astrogation context: Science picture, Comms link, Navigation power.",
      gunnery: "Visual fire-control context: track picture, weapon power, hardware and thermal state.",
      engineering: "Visual plant context: Engineering power, drive/cooling/hull condition.",
      science: "Visual sensor context: Science power, sensor condition and thermal state.",
      comms: "Visual link context: Comms power and communications hardware."
    };
    el("dependency-grid").innerHTML = Object.entries(STATIONS).map(([key, def]) => {
      const value = stationContext(key);
      const cls = value < 45 ? "bad" : value < 72 ? "warn" : "";
      return `<div class="exo-dependency"><strong>${def.label}</strong><span>${descriptions[key]}</span><b class="${cls}">${round(value)}%</b></div>`;
    }).join("");
    el("coordination-score").textContent = `${round(coordinationScore())}% visual`;
  }

  function renderLog() {
    const host = el("operations-log");
    host.innerHTML = state.log.length ? state.log.map(item => `<li><time>${timeString(item.time)}</time><strong>${item.station}</strong><span>${item.message}</span></li>`).join("") : `<li><time>00:00</time><strong>System</strong><span>No events logged.</span></li>`;
  }

  function renderRelay() {
    const relay = state.relay;
    const difficulty = relay?.difficulty ?? 0;
    el("dm-relay-difficulty").textContent = relay ? difficulty : "—";
    el("dm-relay-pips").innerHTML = Array.from({ length: 10 }, (_, index) => `<i class="${relay && index < difficulty ? "active" : ""}" title="Pip ${index + 1}">${index + 1}</i>`).join("");
    if (!relay) {
      el("dm-relay-status").textContent = "Awaiting executed procedure";
      el("dm-relay-detail").innerHTML = `<div><span>Station</span><strong>—</strong></div><div><span>Action</span><strong>—</strong></div><div><span>Procedure</span><strong>—</strong></div><div><span>Random d10</span><strong>—</strong></div><div><span>Visual context</span><strong>—</strong></div><div><span>Inputs</span><strong>—</strong></div>`;
      el("dm-relay-sequence").textContent = "No procedure has been committed.";
      el("dm-relay-call").textContent = "The console does not roll for the character and does not determine success or failure.";
      return;
    }
    el("dm-relay-status").textContent = `${relay.classification} · suggested difficulty`;
    el("dm-relay-detail").innerHTML = `
      <div><span>Station</span><strong>${relay.station}</strong></div>
      <div><span>Action</span><strong>${relay.operation}</strong></div>
      <div><span>Procedure</span><strong>${relay.quality}% · ${relay.classification}</strong></div>
      <div><span>Random d10</span><strong>${relay.randomD10} (${relay.randomShift >= 0 ? "+" : ""}${relay.randomShift})</strong></div>
      <div><span>Visual context</span><strong>${relay.context}% (${relay.contextShift >= 0 ? "+" : ""}${relay.contextShift})</strong></div>
      <div><span>Inputs</span><strong>${relay.inputCount} / ${relay.expectedCount} expected</strong></div>`;
    el("dm-relay-sequence").textContent = relay.sequenceLabels.join(" → ");
    el("dm-relay-call").textContent = `DM RELAY: call for the character's normal World of Darkness-derived d10 pool against Difficulty ${relay.difficulty}. The DM remains authoritative for pool construction, success thresholds, specialties, consequences, and edition/house-rule interpretation.`;
  }

  function renderAll(options = {}) {
    renderTopState();
    if (!options.skipPower) renderPowerControls();
    renderTabs();
    renderStation();
    renderDependencies();
    renderLog();
    renderRelay();
  }

  function editDistance(a, b) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[a.length][b.length];
  }

  function procedureQuality(actual, expected) {
    if (!actual.length) return 0;
    const maxLength = Math.max(actual.length, expected.length, 1);
    const similarity = clamp(1 - editDistance(actual, expected) / maxLength, 0, 1);
    const aligned = expected.reduce((count, token, index) => count + (actual[index] === token ? 1 : 0), 0) / Math.max(expected.length, 1);
    return clamp(Math.round((similarity * .72 + aligned * .28) * 100));
  }

  function classifyQuality(quality) {
    if (quality >= 95) return "by-the-book";
    if (quality >= 82) return "minor deviation";
    if (quality >= 65) return "workable sequence";
    if (quality >= 45) return "poor sequence";
    return "incorrect / hazardous sequence";
  }

  function baseDifficultyForQuality(quality) {
    if (quality >= 95) return 5;
    if (quality >= 82) return 6;
    if (quality >= 65) return 7;
    if (quality >= 45) return 8;
    return 9;
  }

  function beginProcedure() {
    const proc = selectedProcedure();
    state.procedure = {
      active: true,
      station: activeStation,
      operationId: proc.id,
      controls: initialControlState(),
      inputs: [],
      startedAt: state.simTime
    };
    addLog(STATIONS[activeStation].label, `Procedure started: ${proc.name}.`);
    renderStation();
  }

  function abortProcedure() {
    if (!state.procedure?.active) return;
    const station = STATIONS[state.procedure.station].label;
    state.procedure = null;
    addLog(station, "Procedure aborted; recorded inputs cleared before execution.");
    renderStation();
  }

  function applyControlToken(token) {
    const session = state.procedure;
    if (!session?.active || session.station !== activeStation) return;
    if (token === "guard-open") session.controls.guard = "open";
    else if (token === "guard-close") session.controls.guard = "closed";
    else if (token.startsWith("mode-")) session.controls.mode = token.slice(-1);
    else if (token.startsWith("bus-")) session.controls.bus = token.slice(4);
    else if (token === "dial-left") session.controls.dial -= 1;
    else if (token === "dial-right") session.controls.dial += 1;
    else if (token.startsWith("lever-")) session.controls.lever = token.slice(6);
  }

  function recordProcedureInput(token, label) {
    const session = state.procedure;
    if (!session?.active || session.station !== activeStation) {
      addLog(STATIONS[activeStation].label, "Control ignored: begin a procedure before manipulating the station.");
      return;
    }
    applyControlToken(token);
    session.inputs.push({ token, label });
    if (session.inputs.length > 28) session.inputs.shift();
    if (token === "execute") {
      evaluateProcedure();
      return;
    }
    renderStation();
  }

  function evaluateProcedure() {
    const session = state.procedure;
    if (!session?.active) return;
    const stationKey = session.station;
    const def = STATIONS[stationKey];
    const proc = def.procedures.find(item => item.id === session.operationId) || def.procedures[0];
    const actual = session.inputs.map(item => item.token);
    const quality = procedureQuality(actual, proc.sequence);
    const classification = classifyQuality(quality);
    const context = round(stationContext(stationKey));
    const contextShift = context >= 82 ? -1 : context >= 58 ? 0 : context >= 38 ? 1 : 2;
    const randomD10 = d10();
    const randomShift = randomD10 <= 2 ? -1 : randomD10 >= 9 ? 1 : 0;
    const overrunShift = actual.length > proc.sequence.length + 3 ? 1 : 0;
    const difficulty = clamp(baseDifficultyForQuality(quality) + contextShift + randomShift + overrunShift, 2, 10);

    state.relay = {
      station: def.label,
      operation: proc.name,
      quality,
      classification,
      context,
      contextShift,
      randomD10,
      randomShift,
      overrunShift,
      difficulty,
      inputCount: actual.length,
      expectedCount: proc.sequence.length,
      sequenceLabels: session.inputs.map(item => item.label)
    };
    session.active = false;
    addLog(def.label, `${proc.name} committed to DM relay: procedure ${quality}% (${classification}), suggested Difficulty ${difficulty}. No success resolved.`);
    renderAll({ skipPower: true });
  }

  function handleStationClick(event) {
    const begin = event.target.closest("[data-procedure-begin]");
    if (begin) { beginProcedure(); return; }
    const abort = event.target.closest("[data-procedure-abort]");
    if (abort) { abortProcedure(); return; }
    const input = event.target.closest("[data-proc-input]");
    if (input) recordProcedureInput(input.dataset.procInput, input.dataset.procLabel || input.textContent.trim());
  }

  function handlePowerInput(event) {
    const input = event.target.closest("[data-power]");
    if (!input) return;
    state.power[input.dataset.power] = Number(input.value);
    input.previousElementSibling.querySelector("b").textContent = input.value;
    const total = powerTotal();
    el("power-total").textContent = `${total} / 100 visual points allocated`;
    el("power-total").dataset.over = total > 100 ? "true" : "false";
    renderDependencies();
  }

  function commitPower(event) {
    const input = event.target.closest("[data-power]");
    if (!input) return;
    addLog("Engineering", `${STATIONS[input.dataset.power].label} visual power allocation set to ${input.value} points.`);
  }

  function reset() {
    state = initialState();
    activeStation = "helm";
    addLog("System", "Human procedural bridge placeholder initialized. Console outputs suggested WoD-derived d10 difficulties only; DM retains resolution authority.");
    renderAll();
  }

  function injectContact() {
    state.contact.present = true;
    state.contact.friendly = false;
    state.targetRange = 38000 + Math.random() * 22000;
    state.targetBearing = Math.round(Math.random() * 359);
    state.targetClosure = -0.8 - Math.random() * 2.5;
    state.track = clamp(22 + Math.random() * 18);
    state.targetClass = "unresolved";
    state.targetIFF = "unknown";
    addLog("Science", `ROLE-PLAY CONTACT: bearing ${state.targetBearing}°, range ${Math.round(state.targetRange).toLocaleString()} km. Await crew procedure and DM adjudication.`);
    renderAll();
  }

  function injectFault() {
    const faults = [
      ["primary coolant loop oscillation", "coolingHealth", 18], ["drive power-conditioning fault", "driveHealth", 16], ["sensor mast timing fault", "sensorHealth", 20],
      ["fire-control bus dropout", "weaponHealth", 19], ["high-gain comms amplifier fault", "commsHealth", 22]
    ];
    const [name, key, loss] = faults[Math.floor(Math.random() * faults.length)];
    state.engineeringFault = name;
    state[key] = clamp(state[key] - loss);
    state.thermal = clamp(state.thermal + 8);
    addLog("Engineering", `ROLE-PLAY FAULT: ${name}. Visual ${key} reduced by ${loss} points; no game outcome resolved.`);
    renderAll();
  }

  function combatDrill() {
    state.contact.present = true;
    state.contact.friendly = false;
    state.targetRange = 26000;
    state.targetBearing = 52;
    state.targetClosure = -3.1;
    state.track = 48;
    state.weaponMode = "tracking";
    state.nav = clamp(state.nav - 8);
    state.reactor = 82;
    state.thermal = clamp(state.thermal + 11);
    addLog("System", "ROLE-PLAY COMBAT DRILL loaded. Coordinate station procedures; every executed action produces a DM-facing difficulty rather than an automatic result.");
    renderAll();
  }

  function tick() {
    state.simTime += 1;
    if (!state.contact.present) return;
    state.targetRange = Math.max(50, state.targetRange + state.targetClosure * 2);
    state.targetBearing = (state.targetBearing + .025) % 360;
    state.contact.x = clamp(50 + Math.cos(state.targetBearing * Math.PI / 180) * 34, 8, 92);
    state.contact.y = clamp(50 + Math.sin(state.targetBearing * Math.PI / 180) * 34, 8, 92);
    if (state.simTime % 4 === 0) renderStation();
  }

  function bindEvents() {
    el("station-tabs").addEventListener("click", event => {
      const button = event.target.closest("[data-station]");
      if (!button) return;
      activeStation = button.dataset.station;
      renderTabs();
      renderStation();
    });
    el("station-panel").addEventListener("click", handleStationClick);
    el("station-panel").addEventListener("change", event => {
      const select = event.target.closest("[data-procedure-select]");
      if (!select) return;
      state.selectedProcedure[activeStation] = select.value;
      if (state.procedure?.active && state.procedure.station === activeStation) state.procedure = null;
      renderStation();
    });
    el("power-controls").addEventListener("input", handlePowerInput);
    el("power-controls").addEventListener("change", commitPower);
    el("crew-scenario-reset").addEventListener("click", reset);
    el("crew-scenario-contact").addEventListener("click", injectContact);
    el("crew-scenario-damage").addEventListener("click", injectFault);
    el("crew-scenario-battle").addEventListener("click", combatDrill);
    el("log-clear").addEventListener("click", () => { state.log = []; renderLog(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    reset();
    bindEvents();
    timer = window.setInterval(tick, 1000);
    window.addEventListener("beforeunload", () => window.clearInterval(timer), { once: true });
  });
})();
