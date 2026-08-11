(() => {
  "use strict";

  if (window.EXO_HELM_AUTONAV_SUITE) return;

  const ENCOUNTERS = Object.freeze([
    Object.freeze({id:"intercept",label:"INTERCEPT APPROACH",closure:"MODERATE",bias:"PORT 14°",risk:"LOW",confidence:72,description:"Predictive closure package for controlled acquisition of a moving contact while retaining lateral escape authority.",probs:[46,18,21,9,6],recommended:["weave-1","thrust-feint"]}),
    Object.freeze({id:"offset-pass",label:"OFFSET PASS",closure:"HIGH",bias:"STARBOARD 9°",risk:"MODERATE",confidence:66,description:"High-closure crossing package that deliberately carries the vessel past the target's principal intercept axis.",probs:[34,12,31,15,8],recommended:["break-right","retro-snap"]}),
    Object.freeze({id:"flanking",label:"FLANKING VECTOR",closure:"MODERATE",bias:"PORT 31°",risk:"MODERATE",confidence:63,description:"Lateral displacement package intended to migrate the ship toward a hostile contact's weaker engagement aspect.",probs:[29,38,12,11,10],recommended:["spiral-climb","thrust-feint"]}),
    Object.freeze({id:"stern-chase",label:"STERN CHASE",closure:"HIGH",bias:"CENTERLINE",risk:"ELEVATED",confidence:78,description:"Sustained pursuit package emphasizing velocity matching, closure management and repeated future-position estimation.",probs:[57,9,11,14,9],recommended:["weave-1","random-jitter"]}),
    Object.freeze({id:"close-approach",label:"CLOSE APPROACH / DOCK",closure:"LOW",bias:"CENTERLINE",risk:"LOW",confidence:88,description:"Tight proximity package with conservative relative velocity limits and broad collision-avoidance margins.",probs:[51,10,10,25,4],recommended:["retro-snap","break-left"]}),
    Object.freeze({id:"collision-avoid",label:"COLLISION AVOIDANCE",closure:"VARIABLE",bias:"CLEAR VECTOR",risk:"CRITICAL",confidence:91,description:"Immediate hazard-rejection package that weights rapid divergence over mission geometry or formation discipline.",probs:[9,29,28,12,22],recommended:["break-left","break-right"]}),
    Object.freeze({id:"standoff",label:"HOLD-OFF / STANDOFF",closure:"ZERO",bias:"RANGE BAND",risk:"LOW",confidence:84,description:"Range-control package that maintains a selected engagement shell while minimizing unnecessary closure.",probs:[24,14,14,42,6],recommended:["random-jitter","decoy-offset"]}),
    Object.freeze({id:"break-contact",label:"BREAK CONTACT",closure:"NEGATIVE",bias:"EGRESS",risk:"ELEVATED",confidence:69,description:"Withdrawal package prioritizing separation rate, pursuit denial and access to multiple escape branches.",probs:[8,17,19,13,43],recommended:["spiral-climb","thrust-feint"]})
  ]);

  const EVASIVE = Object.freeze([
    Object.freeze({id:"weave-1",label:"WEAVE-1",use:"LOCK-ON FIRE",description:"Alternating lateral displacement with bounded timing jitter to spoil stable lead prediction."}),
    Object.freeze({id:"break-left",label:"BREAK-TURN L",use:"PURSUIT CLOSURE",description:"High-authority port break intended to force a pursuing solution through a rapid angular-rate change."}),
    Object.freeze({id:"break-right",label:"BREAK-TURN R",use:"PURSUIT CLOSURE",description:"High-authority starboard break intended to force a pursuing solution through a rapid angular-rate change."}),
    Object.freeze({id:"spiral-climb",label:"SPIRAL CLIMB",use:"BALLISTIC INTERCEPT",description:"Coupled pitch and yaw escape package that continuously migrates the predicted intercept plane."}),
    Object.freeze({id:"random-jitter",label:"RANDOM JITTER",use:"TRACKING DEGRADATION",description:"Low-amplitude stochastic RCS impulses that increase short-horizon uncertainty without committing to a large vector change."}),
    Object.freeze({id:"thrust-feint",label:"THRUST FEINT",use:"PREDICTION DENIAL",description:"Brief apparent acceleration commitment followed by an alternate branch once hostile prediction updates."}),
    Object.freeze({id:"decoy-offset",label:"DECOY OFFSET",use:"SENSOR CONFUSION",description:"Maneuver package coordinated with decoy geometry to pull hostile tracking away from the true acceleration vector."}),
    Object.freeze({id:"retro-snap",label:"RETRO BRAKE SNAP",use:"OVERSHOOT CONTROL",description:"Abrupt controlled deceleration intended to force a high-closure pursuer or projectile solution through the ship's forward plane."})
  ]);

  // The existing Helm procedures remain the authoritative operation catalog. This
  // table changes what HEL-CFM-07 requires before its canonical confirmation or
  // acknowledgement input is permitted to reach the procedure recorder.
  const PROCEDURE_AUTONAV = Object.freeze({
    "planned-burn":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"intercept"}),
    "attitude-slew":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"offset-pass"}),
    "docking-trim":Object.freeze({encounter:"close-approach"}),
    "evasive":Object.freeze({package:true,simulate:true,evasive:true,sync:true,pilot:true,encounter:"collision-avoid",pattern:"weave-1"}),
    "rcs-trim-check":Object.freeze({package:true,sync:true,pilot:true,encounter:"standoff",pattern:"random-jitter"}),
    "retrograde-braking":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"break-contact"}),
    "proximity-hold":Object.freeze({package:true,sync:true,pilot:true,encounter:"close-approach",pattern:"retro-snap"}),
    "main-drive-ramp":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"intercept"}),
    "rcs-countertranslation":Object.freeze({simulate:true,evasive:true,sync:true,pilot:true,encounter:"offset-pass",pattern:"break-left"}),
    "docking-departure":Object.freeze({package:true,sync:true,pilot:true,encounter:"break-contact",pattern:"retro-snap"}),
    "attitude-desaturation":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"standoff"}),
    "braking-turn":Object.freeze({package:true,simulate:true,evasive:true,sync:true,vector:true,pilot:true,encounter:"offset-pass",pattern:"break-right"}),
    "collision-dodge":Object.freeze({package:true,simulate:true,evasive:true,sync:true,vector:true,pilot:true,encounter:"collision-avoid",pattern:"break-left"}),
    "formation-reposition":Object.freeze({package:true,sync:true,vector:true,encounter:"close-approach"}),
    "silent-rcs-drift":Object.freeze({evasive:true,sync:true,pilot:true,encounter:"standoff",pattern:"random-jitter"}),
    "capture-alignment":Object.freeze({package:true,sync:true,vector:true,encounter:"close-approach"}),
    "wounded-drive-burn":Object.freeze({package:true,simulate:true,evasive:true,sync:true,vector:true,pilot:true,encounter:"break-contact",pattern:"thrust-feint"}),
    "pursuit-vector-change":Object.freeze({package:true,simulate:true,sync:true,vector:true,encounter:"stern-chase"}),
    "emergency-main-cutoff":Object.freeze({evasive:true,sync:true,pilot:true,encounter:"break-contact",pattern:"retro-snap"})
  });

  const state = {
    encounter:"intercept",
    evasive:"weave-1",
    simulated:null,
    queued:false,
    synced:false,
    evasiveLoaded:false,
    simulationRun:0,
    attemptProcedure:null,
    status:"STANDBY"
  };

  let observer = null;
  let renderQueued = false;

  const encounterById = id => ENCOUNTERS.find(item => item.id === id) || ENCOUNTERS[0];
  const evasiveById = id => EVASIVE.find(item => item.id === id) || EVASIVE[0];
  const selectedProcedureId = () => document.querySelector("#station-panel [data-procedure-select]")?.value || null;
  const requirementFor = id => PROCEDURE_AUTONAV[id] || Object.freeze({});
  const activeAttempt = () => Boolean(document.querySelector("#station-panel [data-procedure-abort]:not(:disabled)"));

  function normalize(values) {
    const safe = values.map(value => Math.max(1,value));
    const sum = safe.reduce((total,value) => total + value,0);
    const raw = safe.map(value => value / sum * 100);
    const rounded = raw.map(value => Math.floor(value));
    let remainder = 100 - rounded.reduce((total,value) => total + value,0);
    const fractions = raw.map((value,index) => ({index,fraction:value-Math.floor(value)})).sort((a,b) => b.fraction-a.fraction);
    for(let i=0;remainder>0;i++,remainder--) rounded[fractions[i%fractions.length].index]++;
    return rounded;
  }

  function simulateProbabilities(base) {
    const run=++state.simulationRun;
    const jittered=base.map((value,index)=>Math.max(2,value+Math.sin(run*1.73+index*2.31)*5.5+Math.cos(run*.81+index)*2.5));
    return normalize(jittered);
  }

  function resetWorkflow(procedureId,{applyDefaults=true}={}) {
    const req=requirementFor(procedureId);
    state.attemptProcedure=procedureId;
    if(applyDefaults){
      if(req.encounter) state.encounter=req.encounter;
      if(req.pattern) state.evasive=req.pattern;
    }
    state.simulated=null;
    state.queued=false;
    state.synced=false;
    state.evasiveLoaded=false;
    state.status=(req.package||req.simulate||req.evasive||req.sync)?"AUTONAV REQUIRED":"STANDBY";
  }

  function gateState(req=requirementFor(selectedProcedureId())) {
    const checks={
      package:!req.package||state.queued,
      simulation:!req.simulate||Boolean(state.simulated),
      evasive:!req.evasive||state.evasiveLoaded,
      sync:!req.sync||state.synced
    };
    return {...checks,ready:Object.values(checks).every(Boolean)};
  }

  function preSyncReady(req=requirementFor(selectedProcedureId())) {
    return (!req.package||state.queued)&&(!req.simulate||Boolean(state.simulated))&&(!req.evasive||state.evasiveLoaded);
  }

  function dispatchRecorder(controlId,label,value,required=true,satisfied=true) {
    if(!activeAttempt()) return;
    document.dispatchEvent(new CustomEvent("exo:auxiliary-input",{detail:{station:"helm",controlId,label,value,required:Boolean(required),satisfied:Boolean(satisfied)}}));
  }

  function play(scene="button-light",seed="autonav") {
    window.EXO_CONTROL_AUDIO?.play?.(scene,{seed:`helm:${seed}`,intensity:.72});
  }

  function conePath(angle,spread,length=92,cx=120,cy=190) {
    const radA=(angle-spread)*Math.PI/180,radB=(angle+spread)*Math.PI/180;
    const ax=cx+Math.sin(radA)*length,ay=cy-Math.cos(radA)*length,bx=cx+Math.sin(radB)*length,by=cy-Math.cos(radB)*length;
    const mid=angle*Math.PI/180,mx=cx+Math.sin(mid)*length*1.08,my=cy-Math.cos(mid)*length*1.08;
    return `M${cx} ${cy} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)} A${length} ${length} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${cx} ${cy}Z`;
  }

  function coneDisplay(probabilities) {
    const cones=[
      {label:"PRIMARY TRACK",angle:0,spread:14,length:102,cls:"primary"},
      {label:"PORT BREAK",angle:-42,spread:15,length:92,cls:"port"},
      {label:"STARBOARD BREAK",angle:42,spread:15,length:92,cls:"starboard"},
      {label:"BRAKE / HOLD",angle:180,spread:18,length:62,cls:"brake"},
      {label:"HARD EVASIVE",angle:82,spread:19,length:78,cls:"hard"}
    ];
    return `<div class="exo-autonav-cone-stage" aria-label="Probabilistic maneuvering cones"><svg viewBox="0 0 240 220" role="img" aria-label="Predicted maneuver branch probability visualization"><defs><radialGradient id="autonavHalo"><stop offset="0" stop-color="#84b8cf" stop-opacity=".24"/><stop offset="1" stop-color="#84b8cf" stop-opacity="0"/></radialGradient></defs><g class="autonav-grid"><circle cx="120" cy="190" r="30"/><circle cx="120" cy="190" r="60"/><circle cx="120" cy="190" r="90"/><path d="M20 190 H220 M120 10 V215 M56 126 L184 254 M184 126 L56 254"/></g><circle class="autonav-confidence-halo" cx="120" cy="190" r="42" fill="url(#autonavHalo)"/>${cones.map((cone,index)=>`<path class="autonav-cone ${cone.cls}" d="${conePath(cone.angle,cone.spread,cone.length)}" style="--prob:${probabilities[index]/100}"/>`).join("")}<g class="autonav-ownship"><path d="M120 176 L128 196 L120 192 L112 196Z"/><path d="M120 178 V205"/></g><g class="autonav-sweep"><path d="M120 190 L120 42"/></g></svg><div class="exo-autonav-probability-grid">${cones.map((cone,index)=>`<div><span class="swatch ${cone.cls}"></span><b>${cone.label}</b><strong>${probabilities[index]}%</strong></div>`).join("")}</div></div>`;
  }

  const packageButtons=selected=>ENCOUNTERS.map(item=>`<button type="button" class="exo-autonav-package${item.id===selected?" selected":""}" data-autonav-encounter="${item.id}" aria-pressed="${item.id===selected}"><b>${item.label}</b><small>${item.closure} CLOSURE · ${item.bias}</small></button>`).join("");
  const evasiveButtons=(selected,recommended)=>EVASIVE.map(item=>`<button type="button" class="exo-autonav-evasive${item.id===selected?" selected":""}${recommended.includes(item.id)?" recommended":""}" data-autonav-evasive="${item.id}" aria-pressed="${item.id===selected}"><b>${item.label}</b><small>${item.use}${recommended.includes(item.id)?" · REC":""}</small></button>`).join("");

  function gateMarkup(req,gates) {
    const rows=[["PACKAGE",req.package,gates.package],["SIMULATION",req.simulate,gates.simulation],["EVASIVE",req.evasive,gates.evasive],["HELM SYNC",req.sync,gates.sync]];
    return `<div class="exo-autonav-gates">${rows.map(([label,required,complete])=>`<div class="exo-autonav-gate${!required?" na":complete?" complete":""}"><span>${label}</span><b>${!required?"N/A":complete?"COMPLETE":"REQUIRED"}</b></div>`).join("")}</div>`;
  }

  function suiteMarkup(block) {
    const procedureId=selectedProcedureId();
    if(state.attemptProcedure!==procedureId&&!activeAttempt()) resetWorkflow(procedureId,{applyDefaults:false});
    const req=requirementFor(procedureId),gates=gateState(req),encounter=encounterById(state.encounter),evasive=evasiveById(state.evasive),probabilities=state.simulated||encounter.probs;
    const recommendation=encounter.recommended.map(id=>evasiveById(id).label).join(" / "),attempt=activeAttempt(),oldStrip=block.querySelector(".exo-control-state-strip")?.outerHTML||"";
    const queueDisabled=!attempt||!req.package,simulateDisabled=!attempt||!req.simulate||!state.queued,evasiveLoadDisabled=!attempt||!req.evasive,syncDisabled=!attempt||!req.sync||!preSyncReady(req),vectorDisabled=!attempt||!req.vector||!gates.ready,pilotDisabled=!attempt||!req.pilot||!gates.ready;
    const gateStatus=!attempt?"STANDBY":gates.ready?"ENGINE GATE READY":state.status;
    return `<span class="exo-device-label"><b class="exo-device-code">HEL-CFM-07</b><span> · AUTO NAVIGATION PACKAGE SUITE</span></span>${oldStrip}<div class="exo-autonav-suite" data-autonav-suite data-enabled="${attempt}"><header class="exo-autonav-head"><div><small>ENCOUNTER MANEUVER PACKAGING · PROBABILISTIC VECTOR CONES · EVASIVE PATTERN LIBRARY</small><strong>${encounter.label}</strong></div><span class="exo-autonav-status" data-state="${gateStatus.toLowerCase().replace(/\s+/g,"-")}">${gateStatus}</span></header><div class="exo-autonav-grid"><section class="exo-autonav-column packages"><header><span>PACKAGE BANK A</span><b>ENCOUNTER MANEUVERS</b></header><div class="exo-autonav-scrollbank">${packageButtons(encounter.id)}</div><div class="exo-autonav-metadata"><div><span>CLOSURE</span><b>${encounter.closure}</b></div><div><span>VECTOR BIAS</span><b>${encounter.bias}</b></div><div><span>RISK</span><b>${encounter.risk}</b></div><div><span>CONFIDENCE</span><b>${encounter.confidence}%</b></div></div></section><section class="exo-autonav-center"><header><span>HEL-NAV-PREDICTOR</span><b>PROBABILISTIC MANEUVER CONES</b></header>${coneDisplay(probabilities)}<p class="exo-autonav-description">${encounter.description}</p>${gateMarkup(req,gates)}</section><section class="exo-autonav-column evasive"><header><span>PACKAGE BANK B</span><b>EVASIVE PATTERNS</b></header><div class="exo-autonav-scrollbank">${evasiveButtons(evasive.id,encounter.recommended)}</div><div class="exo-autonav-recommendation"><span>RECOMMENDED COUNTERPACKAGE</span><b>${recommendation}</b><small>SELECTED · ${evasive.label}: ${evasive.description}</small></div></section></div><footer class="exo-autonav-actions"><button type="button" data-autonav-action="queue" ${queueDisabled?"disabled":""}>QUEUE PACKAGE</button><button type="button" data-autonav-action="sync" ${syncDisabled?"disabled":""}>SYNC TO HELM</button><button type="button" data-autonav-action="load-evasive" ${evasiveLoadDisabled?"disabled":""}>LOAD EVASIVE</button><button type="button" data-autonav-action="simulate" ${simulateDisabled?"disabled":""}>SIMULATE</button><button type="button" class="primary" data-autonav-final="vector" data-proc-input="helm-vector-confirm" data-control-id="flight-confirms" data-control-state="VECTOR CONFIRMED" data-proc-label="HEL-CFM-07 · AUTO NAVIGATION PACKAGE SUITE: COMMIT NAV PLAN — ${encounter.label}" ${vectorDisabled?"disabled":""}>COMMIT NAV PLAN</button><button type="button" data-autonav-final="pilot" data-proc-input="helm-pilot-ack" data-control-id="flight-confirms" data-control-state="ACKNOWLEDGED" data-proc-label="HEL-CFM-07 · AUTO NAVIGATION PACKAGE SUITE: PILOT ACK — ${evasive.label}" ${pilotDisabled?"disabled":""}>PILOT ACK</button></footer></div>`;
  }

  function upgrade(block) {
    if(!block||block.dataset.autonavUpgraded==="true") return;
    block.dataset.autonavUpgraded="true";
    block.classList.add("hardware-autonav-suite","physical-autonav-suite");
    block.innerHTML=suiteMarkup(block);
  }

  function findAndUpgrade() {
    renderQueued=false;
    document.querySelectorAll('#station-panel .exo-device-block[data-control-code="HEL-CFM-07"]').forEach(upgrade);
    upgradeManualReferences();
  }

  function queueUpgrade() {
    if(renderQueued) return;
    renderQueued=true;
    requestAnimationFrame(findAndUpgrade);
  }

  function rerenderCurrentBlock() {
    const block=document.querySelector('#station-panel .exo-device-block[data-control-code="HEL-CFM-07"]');
    if(!block) return;
    block.dataset.autonavUpgraded="true";
    block.classList.add("hardware-autonav-suite","physical-autonav-suite");
    block.innerHTML=suiteMarkup(block);
  }

  function upgradeManualReferences() {
    document.querySelectorAll("#station-panel .exo-manual-step-copy").forEach(node=>{
      if(!node.textContent.includes("HEL-CFM-07")) return;
      node.querySelectorAll("span").forEach(span=>{
        span.textContent=span.textContent.replace(/FLIGHT CONFIRMATION/gi,"AUTO NAVIGATION PACKAGE SUITE").replace(/VECTOR CONFIRM/gi,"COMMIT NAV PLAN").replace(/PILOT ACK/gi,"PILOT ACKNOWLEDGE");
      });
    });
  }

  function handleBegin() {
    const id=selectedProcedureId();
    resetWorkflow(id,{applyDefaults:true});
  }

  function selectEncounter(id) {
    const req=requirementFor(selectedProcedureId()),encounter=encounterById(id);
    state.encounter=encounter.id;
    state.simulated=null;state.queued=false;state.synced=false;
    state.status=req.package?"PACKAGE SELECTED":"PACKAGE BROWSE";
    if(!encounter.recommended.includes(state.evasive)) {state.evasive=encounter.recommended[0];state.evasiveLoaded=false;}
    dispatchRecorder("autonav-encounter-package",`HEL-CFM-07.A · ENCOUNTER PACKAGE: ${encounter.label}`,encounter.id,req.package,true);
    play("selector-set",`encounter:${encounter.id}`);
  }

  function selectEvasive(id) {
    const req=requirementFor(selectedProcedureId()),pattern=evasiveById(id);
    state.evasive=pattern.id;state.evasiveLoaded=false;state.synced=false;state.status=req.evasive?"EVASIVE SELECTED":"EVASIVE BROWSE";
    dispatchRecorder("autonav-evasive-package",`HEL-CFM-07.B · EVASIVE PACKAGE: ${pattern.label}`,pattern.id,req.evasive,true);
    play("selector-set",`evasive:${pattern.id}`);
  }

  function handleAction(action) {
    const req=requirementFor(selectedProcedureId()),encounter=encounterById(state.encounter),pattern=evasiveById(state.evasive);
    if(action==="queue"){
      state.queued=true;state.simulated=null;state.synced=false;state.status="PACKAGE QUEUED";
      dispatchRecorder("autonav-queue",`HEL-CFM-07.C · PACKAGE QUEUE: ${encounter.label}`,encounter.id,req.package,true);play("button-heavy","queue");
    }else if(action==="simulate"){
      if(!state.queued) return;
      state.simulated=simulateProbabilities(encounter.probs);state.synced=false;state.status=`SIMULATION ${state.simulationRun} COMPLETE`;
      dispatchRecorder("autonav-simulation",`HEL-CFM-07.D · MANEUVER CONE SIMULATION: ${state.simulated.join("/")}%`,state.simulated.join(","),req.simulate,true);play("electrical-confirm",`simulate:${state.simulationRun}`);
    }else if(action==="load-evasive"){
      state.evasiveLoaded=true;state.synced=false;state.status="EVASIVE LOADED";
      dispatchRecorder("autonav-evasive-load",`HEL-CFM-07.E · EVASIVE LOAD: ${pattern.label}`,pattern.id,req.evasive,true);play("toggle-flick","load-evasive");
    }else if(action==="sync"){
      if(!preSyncReady(req)) return;
      state.synced=true;state.status="HELM SYNCHRONIZED";
      dispatchRecorder("autonav-sync",`HEL-CFM-07.F · HELM SYNC: ${encounter.label}${req.evasive?` / ${pattern.label}`:""}`,`${encounter.id}:${pattern.id}`,req.sync,true);play("electrical-confirm","sync");
      document.dispatchEvent(new CustomEvent("exo:helm-autonav-sync",{detail:{procedure:selectedProcedureId(),encounter:encounter.id,evasive:pattern.id,probabilities:state.simulated||encounter.probs}}));
    }
  }

  function handleClick(event) {
    const begin=event.target.closest?.("#station-panel [data-procedure-begin]");
    if(begin){handleBegin();return;}

    const encounterButton=event.target.closest?.("[data-autonav-encounter]");
    if(encounterButton){event.preventDefault();event.stopPropagation();selectEncounter(encounterButton.dataset.autonavEncounter);queueUpgrade();return;}

    const evasiveButton=event.target.closest?.("[data-autonav-evasive]");
    if(evasiveButton){event.preventDefault();event.stopPropagation();selectEvasive(evasiveButton.dataset.autonavEvasive);queueUpgrade();return;}

    const actionButton=event.target.closest?.("[data-autonav-action]");
    if(actionButton){event.preventDefault();event.stopPropagation();handleAction(actionButton.dataset.autonavAction);queueUpgrade();return;}

    const finalButton=event.target.closest?.("[data-autonav-final]");
    if(finalButton){
      const req=requirementFor(selectedProcedureId()),gates=gateState(req),kind=finalButton.dataset.autonavFinal,allowed=activeAttempt()&&gates.ready&&((kind==="vector"&&req.vector)||(kind==="pilot"&&req.pilot));
      if(!allowed){event.preventDefault();event.stopImmediatePropagation();state.status="ENGINE GATE HOLD";rerenderCurrentBlock();play("button-heavy","gate-hold");return;}
      state.status=kind==="vector"?"NAV PLAN COMMITTED":"PILOT ACKNOWLEDGED";
      play("button-heavy",kind==="vector"?"commit-nav":"pilot-ack");
      // Do not rerender here. The authoritative procedure recorder receives the
      // canonical HEL-CFM-07 endpoint on the same click and performs its normal
      // station render immediately afterward.
    }
  }

  function handleChange(event) {
    const select=event.target.closest?.("#station-panel [data-procedure-select]");
    if(!select) return;
    resetWorkflow(select.value,{applyDefaults:true});
    queueUpgrade();
  }

  function install() {
    const panel=document.getElementById("station-panel");
    if(!panel) return;
    observer=new MutationObserver(queueUpgrade);
    observer.observe(panel,{childList:true,subtree:true});
    document.addEventListener("click",handleClick,true);
    document.addEventListener("change",handleChange,true);
    queueUpgrade();
  }

  window.EXO_HELM_AUTONAV_SUITE=Object.freeze({
    encounters:ENCOUNTERS,
    evasivePatterns:EVASIVE,
    procedureRequirements:PROCEDURE_AUTONAV,
    getState:()=>({...state,simulated:state.simulated?[...state.simulated]:null,gates:gateState()}),
    refresh:queueUpgrade
  });

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
