(() => {
  "use strict";

  if (window.EXO_GUIDED_MUNITIONS_TERMINAL) return;

  const TERMINAL_VERSION = "GMP-7C";
  const CHANNELS = Object.freeze([
    Object.freeze({
      id: "targeting",
      group: "PROGRAMMING PACKAGES",
      label: "TARGETING CRITERIA PACKAGE",
      code: "TGT",
      options: Object.freeze([
        Object.freeze({name:"PRECISION TRACK",desc:"Maintains the assigned fire-control track and continuously refines the commanded aimpoint against measured target motion."}),
        Object.freeze({name:"EMISSION HOME",desc:"Weights detected active emissions as the primary homing reference when the target is radiating strongly enough to support an emitter solution."}),
        Object.freeze({name:"COOPERATIVE DESIGNATION",desc:"Accepts correlated target updates from shipboard, remote, or formation sensors and blends them into the munition track solution."}),
        Object.freeze({name:"COUNTER-MANEUVER",desc:"Biases the guidance solution toward predicted evasive vector changes rather than a simple present-position intercept."}),
        Object.freeze({name:"SUBSYSTEM SELECT",desc:"Uses the designated subsystem aimpoint supplied by fire control instead of treating the hostile hull as one undifferentiated target."}),
        Object.freeze({name:"AREA INTERDICTION",desc:"Treats an assigned engagement volume as the targeting criterion and prioritizes valid hostile tracks entering that volume."})
      ])
    }),
    Object.freeze({
      id: "approach",
      group: "PROGRAMMING PACKAGES",
      label: "MUNITION APPROACH BEHAVIOR",
      code: "APR",
      options: Object.freeze([
        Object.freeze({name:"DIRECT INTERCEPT",desc:"Builds the shortest practical intercept geometry and keeps the munition committed to a direct closing solution."}),
        Object.freeze({name:"PLANE-OFFSET ARC",desc:"Approaches from an offset plane before bending back onto the final intercept, complicating a single-axis defensive response."}),
        Object.freeze({name:"LOW-SIGNATURE COAST",desc:"Uses a restrained midcourse profile with reduced active correction before waking fully for terminal acquisition."}),
        Object.freeze({name:"DOGLEG OFFSET",desc:"Introduces a deliberate lateral displacement during midcourse and then reacquires the programmed terminal corridor."}),
        Object.freeze({name:"SPIRAL WEAVE",desc:"Maintains a controlled weaving approach intended to prevent the closing vector from remaining geometrically simple."}),
        Object.freeze({name:"DELAYED WAKE",desc:"Coasts through most of the approach with terminal systems held back, then performs a late acquisition and correction sequence."}),
        Object.freeze({name:"COOPERATIVE PINCER",desc:"Offsets its approach to complement other programmed rounds so multiple munitions can arrive from separated vectors."})
      ])
    }),
    Object.freeze({
      id: "terminal",
      group: "PROGRAMMING PACKAGES",
      label: "TERMINAL ATTACK BEHAVIOR",
      code: "TRM",
      options: Object.freeze([
        Object.freeze({name:"CENTER-MASS STRIKE",desc:"Drives the final solution toward the target body center and prioritizes a stable terminal intercept over specialized aimpoint behavior."}),
        Object.freeze({name:"PROXIMITY BURST",desc:"Commands terminal fuzing behavior around the programmed closest-approach envelope rather than requiring direct hull contact."}),
        Object.freeze({name:"PENETRATE / DELAY",desc:"Maintains a contact intercept and requests delayed terminal effect after the munition has crossed the first structural boundary."}),
        Object.freeze({name:"SUBSYSTEM SPEAR",desc:"Preserves the fire-control subsystem aimpoint through the terminal phase and resists recentering on the broader hull return."}),
        Object.freeze({name:"FLY-BY FRAGMENT",desc:"Shapes the final pass to cross the target envelope while presenting the selected fragmentation effect across the closing path."}),
        Object.freeze({name:"COUNTER-EVASION WEAVE",desc:"Reserves maneuver authority for the final phase and continues active correction against late target vector changes."}),
        Object.freeze({name:"REACQUIRE LOOP",desc:"Allows one terminal reacquisition attempt if the primary lock collapses before the committed attack gate is crossed."})
      ])
    }),
    Object.freeze({
      id: "warhead",
      group: "PHYSICAL MUNITION EQUIPMENT",
      label: "WARHEAD / EFFECT SECTION",
      code: "WRH",
      options: Object.freeze([
        Object.freeze({name:"INERT KINETIC",desc:"Dense inert impact package intended to deliver the munition's retained momentum without a secondary energetic effect."}),
        Object.freeze({name:"FRAGMENTATION",desc:"Directional fragmenting effect package intended for vulnerable exterior systems, light craft, or proximity engagements."}),
        Object.freeze({name:"SHAPED PLASMA",desc:"Fictional focused energetic effect package for concentrated damage at the programmed terminal aimpoint."}),
        Object.freeze({name:"DISRUPTOR PULSE",desc:"Fictional electromagnetic disruption package intended to attack exposed electronics and power-distribution resilience."}),
        Object.freeze({name:"BREACH PENETRATOR",desc:"Hardened penetration-oriented effect section paired with terminal logic that favors direct structural contact."}),
        Object.freeze({name:"SENSOR / MARKER",desc:"Non-destructive instrumentation payload used for tracking, tagging, telemetry collection, or exercise engagements."})
      ])
    }),
    Object.freeze({
      id: "body",
      group: "PHYSICAL MUNITION EQUIPMENT",
      label: "BODY / BUS ASSEMBLY",
      code: "BDY",
      options: Object.freeze([
        Object.freeze({name:"LIGHT INTERCEPTOR",desc:"Compact high-agility bus with limited payload volume and strong emphasis on defensive-intercept responsiveness."}),
        Object.freeze({name:"STANDARD STRIKE",desc:"General-purpose guided munition body balancing payload, maneuver package, sensors, and endurance."}),
        Object.freeze({name:"HEAVY PENETRATOR",desc:"Reinforced strike body intended to carry a larger hardened effect section at the cost of agility and packaging flexibility."}),
        Object.freeze({name:"LONG-ENDURANCE BUS",desc:"Expanded bus volume allocated to guidance endurance, power reserve, and sustained midcourse operation."}),
        Object.freeze({name:"LOW-OBSERVABLE SHROUD",desc:"Body package emphasizing reduced signature and restrained external geometry during the coast portion of the engagement."}),
        Object.freeze({name:"MULTI-STAGE CARRIER",desc:"Large carrier body arranged around a separable terminal vehicle or secondary guided payload section."})
      ])
    }),
    Object.freeze({
      id: "propulsion",
      group: "PHYSICAL MUNITION EQUIPMENT",
      label: "PROPULSION PACKAGE",
      code: "PRP",
      options: Object.freeze([
        Object.freeze({name:"SPRINT MOTOR",desc:"Short-duration high-acceleration propulsion package for rapid closing engagements and defensive intercept work."}),
        Object.freeze({name:"SUSTAINER DRIVE",desc:"Longer-duration propulsion package emphasizing continuing acceleration and greater midcourse correction authority."}),
        Object.freeze({name:"DUAL-PULSE DRIVE",desc:"Separates major propulsion events into an initial departure phase and a later reserved acceleration phase."}),
        Object.freeze({name:"VECTOR THRUSTER PACK",desc:"Maneuver-heavy propulsion arrangement emphasizing lateral correction and terminal agility over simple straight-line acceleration."}),
        Object.freeze({name:"SILENT COAST STAGE",desc:"Propulsion package designed around a pronounced unpowered coast interval before a later terminal drive event."}),
        Object.freeze({name:"INTERCEPTOR DRIVE",desc:"Compact high-response propulsion package optimized for repeated course correction against agile or incoming targets."})
      ])
    }),
    Object.freeze({
      id: "power",
      group: "PHYSICAL MUNITION EQUIPMENT",
      label: "POWER PLANT / RESERVE",
      code: "PWR",
      options: Object.freeze([
        Object.freeze({name:"THERMAL BATTERY",desc:"Rugged single-sortie electrical reserve intended to remain inert until the munition is prepared for launch."}),
        Object.freeze({name:"CAPACITOR BANK",desc:"High-discharge electrical reserve emphasizing brief heavy sensor, actuator, or terminal-system demand."}),
        Object.freeze({name:"MICROTURBINE GENERATOR",desc:"Compact fictional onboard generator package selected when longer electrical endurance matters more than minimum complexity."}),
        Object.freeze({name:"FUEL-CELL STACK",desc:"Steady-output endurance package for guidance sets expected to remain active over a prolonged engagement timeline."}),
        Object.freeze({name:"ISOTOPE RESERVE",desc:"Low-output long-duration reserve intended for dormant storage, watchkeeping, or extended autonomous operation."}),
        Object.freeze({name:"HYBRID DUAL-SOURCE",desc:"Combines an endurance source with a separate high-discharge reserve so cruise and terminal electrical loads are handled differently."})
      ])
    })
  ]);

  const channelById = Object.freeze(Object.fromEntries(CHANNELS.map(channel => [channel.id, channel])));
  const selection = Object.fromEntries(CHANNELS.map(channel => [channel.id, Math.floor(channel.options.length / 2)]));
  let focusedChannel = "targeting";
  let observer = null;
  let syncQueued = false;
  let programmingSerial = 1;

  const esc = value => String(value ?? "").replace(/[&<>\"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
  const selectedOption = id => {
    const channel = channelById[id];
    if (!channel) return null;
    const index = ((selection[id] % channel.options.length) + channel.options.length) % channel.options.length;
    return channel.options[index];
  };
  const optionAt = (channel, index) => channel.options[((index % channel.options.length) + channel.options.length) % channel.options.length];

  function reelMarkup(channel) {
    const index = selection[channel.id];
    const previous = optionAt(channel, index - 1);
    const current = optionAt(channel, index);
    const next = optionAt(channel, index + 1);
    return `<section class="exo-munition-reel" data-munition-channel="${channel.id}" data-focused="${focusedChannel === channel.id}">
      <header><span>${channel.code}</span><b>${esc(channel.label)}</b></header>
      <div class="exo-munition-reel-machine">
        <button type="button" class="exo-munition-step step-up" data-munition-step="-1" data-munition-channel="${channel.id}" aria-label="Previous ${esc(channel.label)}">▲</button>
        <div class="exo-munition-index-window" tabindex="0" role="listbox" aria-label="${esc(channel.label)} rolling index" aria-activedescendant="munition-${channel.id}-selected">
          <span class="previous" aria-hidden="true">${esc(previous.name)}</span>
          <strong id="munition-${channel.id}-selected" role="option" aria-selected="true">${esc(current.name)}</strong>
          <span class="next" aria-hidden="true">${esc(next.name)}</span>
          <i class="index-line top"></i><i class="index-line bottom"></i>
        </div>
        <button type="button" class="exo-munition-step step-down" data-munition-step="1" data-munition-channel="${channel.id}" aria-label="Next ${esc(channel.label)}">▼</button>
      </div>
    </section>`;
  }

  function readbackMarkup() {
    const channel = channelById[focusedChannel] || CHANNELS[0];
    const option = selectedOption(channel.id);
    const program = ["targeting","approach","terminal"].map(id => selectedOption(id)?.name).join(" / ");
    const hardware = ["warhead","body","propulsion","power"].map(id => selectedOption(id)?.name).join(" / ");
    return `<div class="exo-munition-readback">
      <div class="exo-munition-focus-detail"><span>INDEX DETAIL · ${channel.code}</span><strong>${esc(option?.name || "UNSET")}</strong><p>${esc(option?.desc || "No package description available.")}</p></div>
      <div class="exo-munition-program-summary"><span><small>GUIDANCE PROGRAM</small><b>${esc(program)}</b></span><span><small>PHYSICAL ROUND</small><b>${esc(hardware)}</b></span></div>
    </div>`;
  }

  function terminalMarkup(active) {
    const software = CHANNELS.filter(channel => channel.group === "PROGRAMMING PACKAGES").map(reelMarkup).join("");
    const hardware = CHANNELS.filter(channel => channel.group === "PHYSICAL MUNITION EQUIPMENT").map(reelMarkup).join("");
    return `<span class="exo-device-label exo-munition-terminal-label"><b class="exo-device-code">GUN-FCF-07</b><span> · GUIDED MUNITIONS PROGRAMMING TERMINAL</span></span>
      <div class="exo-munition-terminal-head"><div><small>PROGRAM MEMORY</small><b>${TERMINAL_VERSION} / SLOT ${String(programmingSerial).padStart(2,"0")}</b></div><div><small>ROUND STATE</small><b>${active ? "PROGRAMMING ENABLED" : "LOCAL SETUP"}</b></div><div><small>INTERFACE</small><b>ROLLING INDEX</b></div></div>
      <div class="exo-munition-terminal-grid">
        <section class="exo-munition-bank software-bank"><header><span>01</span><strong>PROGRAMMING PACKAGES</strong><small>GUIDANCE / ATTACK LOGIC</small></header>${software}</section>
        <section class="exo-munition-bank hardware-bank"><header><span>02</span><strong>PHYSICAL MUNITION EQUIPMENT</strong><small>ROUND ASSEMBLY SELECTION</small></header>${hardware}</section>
      </div>
      ${readbackMarkup()}
      <div class="exo-munition-terminal-actions">
        <button type="button" class="munition-validate" data-proc-input="gun-track-confirm" data-control-id="gun-confirms" data-control-state="TRACK CONFIRMED" data-proc-label="GUN-FCF-07 Guided Munitions Programming Terminal: PROGRAM PACKAGE VALIDATED" ${active ? "" : "disabled"}><span>VALIDATE PACKAGE</span><small>CHECK GUIDANCE / TARGET LOGIC</small></button>
        <button type="button" class="munition-load" data-proc-input="gun-weapons-ack" data-control-id="gun-confirms" data-control-state="ACKNOWLEDGED" data-proc-label="GUN-FCF-07 Guided Munitions Programming Terminal: PROGRAM LOADED TO ROUND" ${active ? "" : "disabled"}><span>LOAD / ACK ROUND</span><small>COMMIT PROGRAM TO SELECTED MUNITION</small></button>
      </div>`;
  }

  function locateTerminalBlock() {
    if (!document.querySelector("#station-tabs [data-station='gunnery'][aria-selected='true']")) return null;
    return document.querySelector("#station-panel .station-gunnery .exo-device-block[data-control-code='GUN-FCF-07']");
  }

  function renderInto(block) {
    if (!block) return;
    const originalButtons = [...block.querySelectorAll("[data-proc-input]")];
    const active = originalButtons.length ? originalButtons.some(button => !button.disabled) : block.dataset.controlActivity === "live";
    block.classList.add("exo-guided-munition-terminal","hardware-munition-terminal");
    block.dataset.munitionTerminal = TERMINAL_VERSION;
    block.innerHTML = terminalMarkup(active);
  }

  function syncTerminal() {
    syncQueued = false;
    const block = locateTerminalBlock();
    if (!block) return;
    if (block.dataset.munitionTerminal === TERMINAL_VERSION) return;
    renderInto(block);
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(syncTerminal);
  }

  function playIndexSound(channelId) {
    try {
      window.EXO_CONTROL_AUDIO?.play?.("thumbwheel-notch", {station:"gunnery", seed:`munition:${channelId}:${selection[channelId]}`, intensity:.82});
    } catch (_) {
      // Mechanical audio is enhancement-only; the terminal remains functional.
    }
  }

  function stepChannel(channelId, delta) {
    const channel = channelById[channelId];
    if (!channel) return;
    selection[channelId] = ((selection[channelId] + delta) % channel.options.length + channel.options.length) % channel.options.length;
    focusedChannel = channelId;
    programmingSerial = programmingSerial >= 99 ? 1 : programmingSerial + 1;
    playIndexSound(channelId);
    const block = locateTerminalBlock();
    if (block) renderInto(block);
  }

  function install() {
    const panel = document.getElementById("station-panel");
    if (!panel || observer) return;
    observer = new MutationObserver(queueSync);
    observer.observe(panel, {childList:true, subtree:true});

    document.addEventListener("click", event => {
      const step = event.target.closest?.("[data-munition-step]");
      if (!step) return;
      event.preventDefault();
      event.stopPropagation();
      stepChannel(step.dataset.munitionChannel, Number(step.dataset.munitionStep) || 0);
    }, true);

    document.addEventListener("wheel", event => {
      const reel = event.target.closest?.("[data-munition-channel]");
      if (!reel || !locateTerminalBlock()) return;
      event.preventDefault();
      event.stopPropagation();
      stepChannel(reel.dataset.munitionChannel, event.deltaY > 0 ? 1 : -1);
    }, {capture:true, passive:false});

    document.addEventListener("focusin", event => {
      const reel = event.target.closest?.("[data-munition-channel]");
      if (!reel) return;
      focusedChannel = reel.dataset.munitionChannel;
      const block = locateTerminalBlock();
      if (block) renderInto(block);
    });

    document.addEventListener("keydown", event => {
      const reel = event.target.closest?.("[data-munition-channel]");
      if (!reel || !["ArrowUp","ArrowDown","PageUp","PageDown"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
      stepChannel(reel.dataset.munitionChannel, delta);
    }, true);

    queueSync();
  }

  window.EXO_GUIDED_MUNITIONS_TERMINAL = Object.freeze({
    channels: CHANNELS,
    sync: queueSync,
    selection: () => Object.freeze(Object.fromEntries(CHANNELS.map(channel => [channel.id, selectedOption(channel.id)?.name])))
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, {once:true});
  else install();
})();
